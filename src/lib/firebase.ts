import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
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
    return { ok: true, message: `Connected to Firestore (${firebaseConfig.projectId})` };
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

export const firebaseConfigSummary = {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket,
};

// Re-export modular Firebase services for backward compatibility with existing imports
export {
  signInWithFirebaseGoogle,
  signInWithEmail,
  registerWithEmail,
  sendPasswordReset,
  resendVerificationEmail,
  signOutFirebase,
  subscribeFirebaseAuth,
  resolveAuthenticatedUserProfile,
  grantAdminRegistryEntry,
} from './firebaseAuth';
export type { RegisterMetadata } from './firebaseAuth';

export {
  sanitizeForFirestore,
  getFirestoreCollectionDocs,
  getScopedCollectionDocs,
  fetchImportLogsFromFirestore,
  writeImportLogToFirestore,
  writeScenarioImportJobToFirestore,
  writeScenarioImportErrorToFirestore,
  fetchScenarioImportErrorsFromFirestore,
  writeScenarioVersionToFirestore,
  saveScenarioCompetencyMappingToFirestore,
  commitCollectionToFirestore,
  fetchPublishedSimulationScenarios,
  fetchAllSimulationScenarios,
  fetchAllProductionMasterData,
  fetchProductionTransactionalData,
  publishSimulationScenarioInFirestore,
  syncRecordToFirestore,
  deleteRecordFromFirestore,
  listAdminRegistryEntries,
  buildFirestoreUserProfilePayload,
  syncOfficialUserToFirestore,
  seedOfficialUsersToFirestore,
  isDemoUserRecord,
  purgeDemoUsersFromFirestore,
  fetchRolePermissionsFromFirestore,
  saveRolePermissionPolicyToFirestore,
  seedDefaultRolePermissionsToFirestore,
  fetchLessonMaterialsFromFirestore,
  saveLessonMaterialToFirestore,
  deleteLessonMaterialFromFirestore,
  testFirestoreReadWrite,
} from './firestore';
export type { ChunkWriteOutcome, DuplicateStrategy, ProductionTransactionalData } from './firestore';

export {
  uploadAuthorizedTrainingFile,
  validateStorageFile,
} from './firebaseStorage';
export type { StorageUploadCategory, StorageUploadResult } from './firebaseStorage';
