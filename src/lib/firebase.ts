import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  writeBatch,
  setDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { ok: true, message: 'Connected to Firestore' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return { ok: false, message: msg };
  }
}

// Run startup connection verification as required
testFirestoreConnection();

export async function signInWithFirebaseGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export function subscribeFirebaseAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getFirestoreCollectionDocs(
  collectionName: string
): Promise<{ ids: Set<string>; docs: Record<string, any>[] }> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    const ids = new Set<string>();
    const docs: Record<string, any>[] = [];
    snap.forEach((d) => {
      ids.add(d.id);
      docs.push({ id: d.id, ...d.data() });
    });
    return { ids, docs };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

export async function fetchImportLogsFromFirestore(maxLogs = 25): Promise<any[]> {
  try {
    const q = query(collection(db, 'importLogs'), orderBy('startedAt', 'desc'), limit(maxLogs));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'importLogs');
  }
}

export async function writeImportLogToFirestore(logData: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, 'importLogs', logData.id), logData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `importLogs/${logData.id}`);
  }
}

export interface ChunkWriteOutcome {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  succeededIds: string[];
  failedRecords: Array<{ collection: string; id: string; reason: string }>;
}

/**
 * Writes validated documents to Firestore in safe 350-op WriteBatch chunks (under 500 Firestore limit)
 * respecting duplicate handling ('skip' | 'update' | 'reject').
 */
export async function commitCollectionToFirestore(
  collectionName: string,
  records: Record<string, any>[],
  existingIds: Set<string>,
  duplicateStrategy: 'skip' | 'update' | 'reject',
  onProgress?: (written: number, total: number) => void
): Promise<ChunkWriteOutcome> {
  const outcome: ChunkWriteOutcome = {
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    succeededIds: [],
    failedRecords: [],
  };

  const toWrite: Array<{ record: Record<string, any>; mode: 'create' | 'update' }> = [];

  for (const record of records) {
    const docId = String(record.id);
    const exists = existingIds.has(docId);
    if (exists) {
      if (duplicateStrategy === 'skip') {
        outcome.skippedCount++;
        continue;
      }
      if (duplicateStrategy === 'reject') {
        outcome.failedCount++;
        outcome.failedRecords.push({
          collection: collectionName,
          id: docId,
          reason: `Duplicate ID "${docId}" rejected per duplicate policy (reject).`,
        });
        continue;
      }
      toWrite.push({ record, mode: 'update' });
    } else {
      toWrite.push({ record, mode: 'create' });
    }
  }

  const CHUNK_SIZE = 350;
  let processed = 0;

  for (let i = 0; i < toWrite.length; i += CHUNK_SIZE) {
    const chunk = toWrite.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const ref = doc(db, collectionName, String(item.record.id));
      batch.set(ref, item.record, { merge: item.mode === 'update' });
    }

    try {
      await batch.commit();
      for (const item of chunk) {
        if (item.mode === 'update') outcome.updatedCount++;
        else outcome.createdCount++;
        outcome.succeededIds.push(String(item.record.id));
        existingIds.add(String(item.record.id));
      }
    } catch (batchErr: any) {
      // Recovery strategy: fall back to per-record commit within failed chunk to isolate failing rows
      for (const item of chunk) {
        try {
          await setDoc(doc(db, collectionName, String(item.record.id)), item.record, {
            merge: item.mode === 'update',
          });
          if (item.mode === 'update') outcome.updatedCount++;
          else outcome.createdCount++;
          outcome.succeededIds.push(String(item.record.id));
          existingIds.add(String(item.record.id));
        } catch (rowErr: any) {
          outcome.failedCount++;
          const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
          outcome.failedRecords.push({
            collection: collectionName,
            id: String(item.record.id),
            reason: msg,
          });
        }
      }
      // If entire chunk failed with permission error, record details cleanly without losing audit
      if (outcome.succeededIds.length === 0 && outcome.failedRecords.length === chunk.length) {
        console.error(`Batch error in ${collectionName}:`, batchErr);
      }
    }

    processed += chunk.length;
    onProgress?.(processed, toWrite.length);
  }

  return outcome;
}

export const firebaseConfigSummary = {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
  authDomain: firebaseConfig.authDomain,
};
