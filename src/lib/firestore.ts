import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export type DuplicateStrategy = 'skip' | 'update' | 'insert_new' | 'reject';
export type SimulationScenarioLifecycleStatus = 'Draft' | 'Validated' | 'Published' | 'Archived';

export interface ChunkWriteOutcome {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  succeededIds: string[];
  failedRecords: Array<{ collection: string; id: string; reason: string; record?: Record<string, any> }>;
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

export async function writeScenarioImportJobToFirestore(jobData: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, 'scenarioImportJobs', jobData.id), jobData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `scenarioImportJobs/${jobData.id}`);
  }
}

export async function writeScenarioImportErrorToFirestore(errData: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, 'scenarioImportErrors', errData.id), errData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `scenarioImportErrors/${errData.id}`);
  }
}

export async function writeScenarioVersionToFirestore(versionData: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, 'scenarioVersions', versionData.id), versionData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `scenarioVersions/${versionData.id}`);
  }
}

export async function saveScenarioCompetencyMappingToFirestore(mappingData: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, 'scenarioCompetencyMappings', mappingData.id), mappingData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `scenarioCompetencyMappings/${mappingData.id}`);
  }
}

export async function fetchPublishedSimulationScenarios(): Promise<Record<string, any>[]> {
  try {
    const q = query(collection(db, 'simulationScenarios'), where('status', '==', 'Published'));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((d: any) => d.isActive !== false);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'simulationScenarios');
  }
}

export async function fetchAllSimulationScenarios(): Promise<Record<string, any>[]> {
  try {
    const snap = await getDocs(collection(db, 'simulationScenarios'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'simulationScenarios');
  }
}

export async function publishSimulationScenarioInFirestore(
  scenarioId: string,
  status: SimulationScenarioLifecycleStatus,
  actorName: string
): Promise<void> {
  const ref = doc(db, 'simulationScenarios', scenarioId);
  const now = new Date().toISOString();
  const patch: Record<string, any> = {
    status,
    isActive: status === 'Published',
    updatedAt: now,
  };
  if (status === 'Published') {
    patch.publishedBy = actorName;
    patch.publishedAt = now;
  } else if (status === 'Validated') {
    patch.validatedBy = actorName;
    patch.validatedAt = now;
  } else if (status === 'Archived') {
    patch.archivedBy = actorName;
    patch.archivedAt = now;
  } else if (status === 'Draft') {
    patch.unpublishedBy = actorName;
    patch.unpublishedAt = now;
  }
  try {
    await updateDoc(ref, patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `simulationScenarios/${scenarioId}`);
  }
}

export async function syncRecordToFirestore(
  collectionName: string,
  docId: string,
  payload: Record<string, any>,
  merge = true
): Promise<void> {
  try {
    await setDoc(doc(db, collectionName, docId), payload, { merge });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

export async function fetchAllProductionMasterData(isAdminOrLnd: boolean): Promise<{
  masterCollections: Record<string, Record<string, any>[]>;
  counts: Record<string, number>;
}> {
  const academyCollections = [
    'competencyDomains',
    'proficiencyLevels',
    'competencies',
    'competencyRubrics',
    'courses',
    'questionBank',
    'practicalAssignments',
    'annualTrainingMatrix',
    'careerPaths',
  ];
  const simCollections = [
    'hotelSimulationProfiles',
    'simulationFinancialData',
    'simulationOperationalData',
    'simulationBusinessChallenges',
    'simulationTasks',
    'simulationReferenceAnalysis',
    'simulationDecisionOptions',
    'simulationRoleplayPrompts',
    'simulationEvaluationRubrics',
    'simulationCompetencyMappings',
  ];

  const masterCollections: Record<string, Record<string, any>[]> = {};
  const counts: Record<string, number> = {};

  for (const col of academyCollections) {
    try {
      const res = await getFirestoreCollectionDocs(col);
      masterCollections[col] = res.docs;
      counts[col] = res.docs.length;
    } catch {
      masterCollections[col] = [];
      counts[col] = 0;
    }
  }

  try {
    const scenarios = isAdminOrLnd
      ? await fetchAllSimulationScenarios()
      : await fetchPublishedSimulationScenarios();
    masterCollections.simulationScenarios = scenarios;
    counts.simulationScenarios = scenarios.length;
  } catch {
    masterCollections.simulationScenarios = [];
    counts.simulationScenarios = 0;
  }

  for (const col of simCollections) {
    try {
      const res = await getFirestoreCollectionDocs(col);
      masterCollections[col] = res.docs;
      counts[col] = res.docs.length;
    } catch {
      masterCollections[col] = [];
      counts[col] = 0;
    }
  }

  return { masterCollections, counts };
}

/**
 * Writes validated documents to Firestore in safe 350-op WriteBatch chunks (under 500 limit)
 * with retry on transient network faults and per-record isolation on failure.
 */
export async function commitCollectionToFirestore(
  collectionName: string,
  records: Record<string, any>[],
  existingIds: Set<string>,
  duplicateStrategy: DuplicateStrategy,
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
      if (duplicateStrategy === 'skip' || duplicateStrategy === 'insert_new') {
        outcome.skippedCount++;
        continue;
      }
      if (duplicateStrategy === 'reject') {
        outcome.failedCount++;
        outcome.failedRecords.push({
          collection: collectionName,
          id: docId,
          reason: `Duplicate ID "${docId}" rejected per duplicate policy (reject).`,
          record,
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
    let committed = false;
    let lastErr: unknown = null;

    // Retry transient network errors up to 2 times before isolating rows
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const batch = writeBatch(db);
        for (const item of chunk) {
          const ref = doc(db, collectionName, String(item.record.id));
          // Full overwrite removes any stale legacy fields that would violate Firestore hasOnly() rules
          batch.set(ref, item.record);
        }
        await batch.commit();
        for (const item of chunk) {
          if (item.mode === 'update') outcome.updatedCount++;
          else outcome.createdCount++;
          outcome.succeededIds.push(String(item.record.id));
          existingIds.add(String(item.record.id));
        }
        committed = true;
        break;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('permission')) break;
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      }
    }

    if (!committed) {
      for (const item of chunk) {
        try {
          await setDoc(doc(db, collectionName, String(item.record.id)), item.record);
          if (item.mode === 'update') outcome.updatedCount++;
          else outcome.createdCount++;
          outcome.succeededIds.push(String(item.record.id));
          existingIds.add(String(item.record.id));
        } catch (rowErr: any) {
          outcome.failedCount++;
          const rawMsg = rowErr instanceof Error ? rowErr.message : String(rowErr);
          const isPerm = rawMsg.toLowerCase().includes('permission');
          const reason = isPerm
            ? `${rawMsg} — Verify signed-in account has Admin access (/admins/{uid} or tranchanhtrung@gmail.com), parent foreign-key records exist in Firestore, and record satisfies Firestore rules.`
            : rawMsg;
          outcome.failedRecords.push({
            collection: collectionName,
            id: String(item.record.id),
            reason,
            record: item.record,
          });
        }
      }
      if (outcome.succeededIds.length === 0 && outcome.failedRecords.length === chunk.length) {
        console.error(`Batch error in ${collectionName}:`, lastErr);
      }
    }

    processed += chunk.length;
    onProgress?.(processed, toWrite.length);
  }

  return outcome;
}
