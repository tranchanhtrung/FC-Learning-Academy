import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { auth, db, firebaseConfigSummary, handleFirestoreError, OperationType } from './firebase';
import { sortLessonMaterialsAsc } from './lessonMaterials';
import {
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_META,
  SYSTEM_ROLES,
  sanitizeRolePermissionsList,
} from './rbac';
import type {
  LessonMaterialDoc,
  PermissionKey,
  RolePermissionPolicyDoc,
  SiteAdminConfigDoc,
  UserRole,
} from '../types';
import { SITE_ADMIN_CONFIG_DOC_ID, normalizeSiteAdminConfig } from './siteAdminConfig';

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

/**
 * Recursively removes undefined values from plain objects so Firebase SDK never throws
 * "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        out[k] = sanitizeForFirestore(v);
      }
    }
    return out as T;
  }
  return value;
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

export async function getScopedCollectionDocs(
  collectionName: string,
  uid: string,
  isAdmin: boolean,
  ownerField = 'employeeUid'
): Promise<Record<string, any>[]> {
  try {
    const ref = collection(db, collectionName);
    const q = isAdmin ? ref : query(ref, where(ownerField, '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    await setDoc(doc(db, 'importLogs', logData.id), sanitizeForFirestore(logData));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `importLogs/${logData.id}`);
  }
}

export async function writeScenarioImportJobToFirestore(jobData: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, 'scenarioImportJobs', jobData.id), sanitizeForFirestore(jobData), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `scenarioImportJobs/${jobData.id}`);
  }
}

export async function writeScenarioImportErrorToFirestore(errData: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, 'scenarioImportErrors', errData.id), sanitizeForFirestore(errData));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `scenarioImportErrors/${errData.id}`);
  }
}

export async function fetchScenarioImportErrorsFromFirestore(jobId: string): Promise<Record<string, any>[]> {
  try {
    const q = query(collection(db, 'scenarioImportErrors'), where('jobId', '==', jobId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `scenarioImportErrors?jobId=${jobId}`);
  }
}

export async function writeScenarioVersionToFirestore(versionData: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, 'scenarioVersions', versionData.id), sanitizeForFirestore(versionData));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `scenarioVersions/${versionData.id}`);
  }
}

export async function saveScenarioCompetencyMappingToFirestore(mappingData: Record<string, any>): Promise<void> {
  try {
    await setDoc(
      doc(db, 'scenarioCompetencyMappings', mappingData.id),
      sanitizeForFirestore(mappingData),
      { merge: true }
    );
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
    await updateDoc(ref, sanitizeForFirestore(patch));
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
    await setDoc(doc(db, collectionName, docId), sanitizeForFirestore(payload), { merge });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

export async function deleteRecordFromFirestore(
  collectionName: string,
  docId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${docId}`);
  }
}

export async function listAdminRegistryEntries(): Promise<
  Array<{ uid: string; email: string; role: string; grantedAt: string }>
> {
  try {
    const snap = await getDocs(collection(db, 'admins'));
    return snap.docs.map((d) => ({
      uid: d.id,
      email: String(d.data()?.email || ''),
      role: String(d.data()?.role || 'lnd_manager'),
      grantedAt: String(d.data()?.grantedAt || ''),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admins');
  }
}

export const DISABLED_USER_MARKER = '__DISABLED__';

export function isUserDisabledRecord(
  record?: { status?: string; careerPathId?: string } | null
): boolean {
  return Boolean(
    record && (record.status === 'disabled' || record.careerPathId === DISABLED_USER_MARKER)
  );
}

export function buildFirestoreUserProfilePayload(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  requestedRole?: string;
  position?: string;
  department?: string;
  property?: string;
  avatar?: string;
  supervisorId?: string;
  currentLevel?: number;
  targetLevel?: number;
  careerPathId?: string;
  joinedDate?: string;
  status?: 'active' | 'disabled';
  disabledAt?: string;
  disabledBy?: string;
}): Record<string, any> {
  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    uid: user.id,
    employeeId: user.id.startsWith('user_') ? user.id : `emp_${user.id.slice(0, 12)}`,
    name: (user.name || 'Academy Member').trim().slice(0, 150),
    email: (user.email || '').trim().slice(0, 200),
    role: user.role,
    position: (user.position || 'Hospitality Finance Professional').trim().slice(0, 150),
    department: (user.department || 'Finance & Accounting').trim().slice(0, 150),
    property: (user.property || 'FC Learning Academy').trim().slice(0, 200),
    currentLevel: Math.min(4, Math.max(1, Number(user.currentLevel) || 2)),
    targetLevel: Math.min(4, Math.max(1, Number(user.targetLevel) || 4)),
    joinedDate: (user.joinedDate || now.split('T')[0]).slice(0, 64),
    updatedAt: now,
  };
  if (user.requestedRole) payload.requestedRole = user.requestedRole;
  if (user.avatar) payload.avatar = user.avatar.slice(0, 1000);
  if (user.supervisorId && /^[a-zA-Z0-9_\-]+$/.test(user.supervisorId)) {
    payload.supervisorId = user.supervisorId;
  }
  if (user.careerPathId) payload.careerPathId = user.careerPathId.slice(0, 128);
  if (user.status) payload.status = user.status;
  if (user.disabledAt) payload.disabledAt = user.disabledAt.slice(0, 64);
  if (user.disabledBy) payload.disabledBy = user.disabledBy.slice(0, 150);
  return sanitizeForFirestore(payload);
}

/**
 * Soft-disables a user profile in Firestore without hard-deleting historical audit/learning data.
 * Falls back cleanly to the strict legacy schema marker if live firestore.rules haven't been redeployed yet.
 */
export async function disableOfficialUserInFirestore(
  user: Parameters<typeof buildFirestoreUserProfilePayload>[0],
  actorName: string
): Promise<void> {
  const now = new Date().toISOString();
  const fullPayload = buildFirestoreUserProfilePayload({
    ...user,
    status: 'disabled',
    disabledAt: now,
    disabledBy: actorName,
  });

  try {
    await setDoc(doc(db, 'userProfiles', user.id), fullPayload);
  } catch (err: any) {
    const msg = String(err?.code || err?.message || '').toLowerCase();
    if (msg.includes('permission-denied') || msg.includes('missing or insufficient permissions')) {
      // Fallback compatible with legacy deployed firestore.rules hasOnly() before rules redeploy
      const compatPayload = buildFirestoreUserProfilePayload({
        ...user,
        careerPathId: DISABLED_USER_MARKER,
        status: undefined,
        disabledAt: undefined,
        disabledBy: undefined,
      });
      try {
        await setDoc(doc(db, 'userProfiles', user.id), compatPayload);
      } catch (compatErr) {
        handleFirestoreError(compatErr, OperationType.WRITE, `userProfiles/${user.id}`);
      }
    } else {
      handleFirestoreError(err, OperationType.WRITE, `userProfiles/${user.id}`);
    }
  }

  // Best-effort revoke from /admins registry if this user held admin privileges
  try {
    await deleteDoc(doc(db, 'admins', user.id));
  } catch {
    // non-owner admins may not have delete permission on /admins
  }
}

export async function syncOfficialUserToFirestore(
  user: Parameters<typeof buildFirestoreUserProfilePayload>[0],
  syncAdminRegistry = false
): Promise<void> {
  const payload = buildFirestoreUserProfilePayload(user);
  try {
    // Full document write guarantees strict alignment with firestore.rules hasOnly()
    await setDoc(doc(db, 'userProfiles', user.id), payload);
    if (syncAdminRegistry && (user.role === 'super_admin' || user.role === 'lnd_manager') && user.email) {
      try {
        await setDoc(doc(db, 'admins', user.id), {
          uid: user.id,
          email: user.email.trim().slice(0, 200),
          role: user.role,
          grantedAt: new Date().toISOString(),
        });
      } catch {
        // Admin registry update is best-effort for non-owner admins
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `userProfiles/${user.id}`);
  }
}

export async function seedOfficialUsersToFirestore(
  experienceUsers: Array<Parameters<typeof buildFirestoreUserProfilePayload>[0]>,
  options: { overwrite?: boolean; existingIds?: Set<string> } = {}
): Promise<{
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  adminSyncedCount: number;
}> {
  let existingIds = options.existingIds;
  if (!existingIds) {
    const existingSnap = await getFirestoreCollectionDocs('userProfiles');
    existingIds = existingSnap.ids;
  }

  const strategy: DuplicateStrategy = options.overwrite ? 'update' : 'skip';
  const records = experienceUsers.map((u) => buildFirestoreUserProfilePayload(u));
  const outcome = await commitCollectionToFirestore('userProfiles', records, existingIds, strategy);

  let adminSyncedCount = 0;
  for (const u of experienceUsers) {
    if ((u.role === 'super_admin' || u.role === 'lnd_manager') && u.email) {
      try {
        await setDoc(doc(db, 'admins', u.id), {
          uid: u.id,
          email: u.email.trim().slice(0, 200),
          role: u.role,
          grantedAt: new Date().toISOString(),
        });
        adminSyncedCount++;
      } catch {
        // non-blocking
      }
    }
  }

  return {
    createdCount: outcome.createdCount,
    updatedCount: outcome.updatedCount,
    skippedCount: outcome.skippedCount,
    failedCount: outcome.failedCount,
    adminSyncedCount,
  };
}

const DEMO_USER_ID_SET = new Set([
  'user_admin',
  'user_lnd',
  'user_fc1',
  'user_fc2',
  'user_gm',
  'user_learner1',
  'user_learner2',
  'user_learner3',
  'user_learner4',
  'user_learner5',
  'user_learner6',
  'user_learner7',
  'user_learner8',
  'user_learner9',
  'user_learner10',
]);

export function isDemoUserRecord(record: {
  id?: string;
  uid?: string;
  employeeId?: string;
  email?: string;
}): boolean {
  const id = String(record.id || '').trim();
  const uid = String(record.uid || '').trim();
  const empId = String(record.employeeId || '').trim();
  const email = String(record.email || '').trim().toLowerCase();
  return (
    DEMO_USER_ID_SET.has(id) ||
    DEMO_USER_ID_SET.has(uid) ||
    DEMO_USER_ID_SET.has(empId) ||
    email.endsWith('@fclearning.com')
  );
}

/**
 * Permanently deletes all synthetic demo user profiles and demo admin entries
 * from Firestore (`userProfiles` & `admins`), keeping real user accounts intact.
 */
export async function purgeDemoUsersFromFirestore(): Promise<{
  deletedProfiles: number;
  deletedAdmins: number;
  failedCount: number;
}> {
  let deletedProfiles = 0;
  let deletedAdmins = 0;
  let failedCount = 0;

  try {
    const profileSnap = await getDocs(collection(db, 'userProfiles'));
    for (const docSnap of profileSnap.docs) {
      const data = docSnap.data() as Record<string, any>;
      if (isDemoUserRecord({ id: docSnap.id, uid: data.uid, employeeId: data.employeeId, email: data.email })) {
        try {
          await deleteDoc(doc(db, 'userProfiles', docSnap.id));
          deletedProfiles++;
        } catch {
          failedCount++;
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'userProfiles');
  }

  try {
    const adminSnap = await getDocs(collection(db, 'admins'));
    for (const docSnap of adminSnap.docs) {
      const data = docSnap.data() as Record<string, any>;
      if (isDemoUserRecord({ id: docSnap.id, uid: data.uid, email: data.email })) {
        try {
          await deleteDoc(doc(db, 'admins', docSnap.id));
          deletedAdmins++;
        } catch {
          failedCount++;
        }
      }
    }
  } catch {
    // non-owner admins may not have delete permission on `admins` collection
  }

  return { deletedProfiles, deletedAdmins, failedCount };
}

export async function fetchRolePermissionsFromFirestore(): Promise<RolePermissionPolicyDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'rolePermissions'));
    return snap.docs.map((d) => ({ id: d.id as UserRole, ...(d.data() as any) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'rolePermissions');
  }
}

export async function saveRolePermissionPolicyToFirestore(
  role: UserRole,
  permissions: PermissionKey[],
  actor?: { uid?: string; name?: string }
): Promise<RolePermissionPolicyDoc> {
  const sanitizedPermissions = sanitizeRolePermissionsList(role, permissions);
  const payload: RolePermissionPolicyDoc = sanitizeForFirestore({
    id: role,
    role,
    permissions: sanitizedPermissions,
    descriptionEn: ROLE_META[role]?.scopeSummaryEn || '',
    descriptionVi: ROLE_META[role]?.scopeSummaryVi || '',
    updatedByUid: (actor?.uid || auth.currentUser?.uid || 'system').slice(0, 128),
    updatedByName: (actor?.name || auth.currentUser?.email || 'Administrator').slice(0, 150),
    updatedAt: new Date().toISOString(),
  });
  try {
    await setDoc(doc(db, 'rolePermissions', role), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `rolePermissions/${role}`);
  }
}

export async function seedDefaultRolePermissionsToFirestore(
  existingRoleIds?: Set<string>,
  actor?: { uid?: string; name?: string }
): Promise<number> {
  let synced = 0;
  for (const role of SYSTEM_ROLES) {
    if (existingRoleIds && existingRoleIds.has(role)) continue;
    await saveRolePermissionPolicyToFirestore(role, DEFAULT_ROLE_PERMISSIONS[role], actor);
    synced++;
  }
  return synced;
}

export async function fetchLessonMaterialsFromFirestore(): Promise<LessonMaterialDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'lessonMaterials'));
    return sortLessonMaterialsAsc(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as LessonMaterialDoc)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'lessonMaterials');
  }
}

export async function saveLessonMaterialToFirestore(
  material: LessonMaterialDoc
): Promise<LessonMaterialDoc> {
  const payload = sanitizeForFirestore(material);
  try {
    await setDoc(doc(db, 'lessonMaterials', material.id), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `lessonMaterials/${material.id}`);
  }
}

export async function deleteLessonMaterialFromFirestore(materialId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'lessonMaterials', materialId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `lessonMaterials/${materialId}`);
  }
}

export async function testFirestoreReadWrite(isAdmin: boolean): Promise<{
  readOk: boolean;
  writeOk: boolean;
  message: string;
  checkedAt: string;
  counts: Record<string, number>;
}> {
  const checkedAt = new Date().toISOString();
  let readOk = false;
  let writeOk = false;
  const notes: string[] = [];

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    readOk = true;
  } catch (err: any) {
    notes.push(`Read failed: ${err?.message || String(err)}`);
  }

  if (auth.currentUser?.emailVerified) {
    if (isAdmin) {
      try {
        await setDoc(
          doc(db, 'test', 'connection'),
          sanitizeForFirestore({
            status: 'ok',
            projectId: firebaseConfigSummary.projectId,
            databaseId: firebaseConfigSummary.databaseId,
            checkedAt,
            checkedByUid: auth.currentUser.uid,
            checkedByEmail: auth.currentUser.email || '',
          }),
          { merge: true }
        );
        const verifySnap = await getDocFromServer(doc(db, 'test', 'connection'));
        if (verifySnap.exists()) {
          writeOk = true;
          readOk = true;
        }
      } catch (err: any) {
        notes.push(`Write failed: ${err?.message || String(err)}`);
      }
    } else {
      try {
        const uid = auth.currentUser.uid;
        const profSnap = await getDoc(doc(db, 'userProfiles', uid));
        if (profSnap.exists()) {
          await updateDoc(doc(db, 'userProfiles', uid), { updatedAt: checkedAt });
          writeOk = true;
        }
      } catch (err: any) {
        notes.push(`Profile write failed: ${err?.message || String(err)}`);
      }
    }
  } else {
    notes.push('Verified Firebase sign-in required for write check.');
  }

  const probeCols = [
    'competencyDomains',
    'competencies',
    'courses',
    'simulationScenarios',
    'simulationSessions',
    'enrollments',
    'individualDevelopmentPlans',
  ];
  const counts: Record<string, number> = {};
  if (auth.currentUser?.emailVerified) {
    await Promise.all(
      probeCols.map(async (col) => {
        try {
          if (col === 'simulationScenarios' && !isAdmin) {
            const list = await fetchPublishedSimulationScenarios();
            counts[col] = list.length;
          } else if ((col === 'simulationSessions' || col === 'enrollments' || col === 'individualDevelopmentPlans') && !isAdmin) {
            const list = await getScopedCollectionDocs(col, auth.currentUser!.uid, false, 'employeeUid');
            counts[col] = list.length;
          } else {
            const res = await getFirestoreCollectionDocs(col);
            counts[col] = res.docs.length;
          }
        } catch {
          counts[col] = 0;
        }
      })
    );
  }

  const message =
    readOk && writeOk
      ? `Read & Write verified on ${firebaseConfigSummary.projectId} (${firebaseConfigSummary.databaseId})`
      : readOk
      ? `Read OK${notes.length ? ` • ${notes.join(' | ')}` : ''}`
      : notes.join(' | ') || 'Firestore check failed';

  return { readOk, writeOk, message, checkedAt, counts };
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
  // simulationReferenceAnalysis is Admin-only per firestore.rules
  const simCollections = [
    'hotelSimulationProfiles',
    'simulationFinancialData',
    'simulationOperationalData',
    'simulationBusinessChallenges',
    'simulationTasks',
    ...(isAdminOrLnd ? ['simulationReferenceAnalysis'] : []),
    'simulationDecisionOptions',
    'simulationRoleplayPrompts',
    'simulationEvaluationRubrics',
    'simulationCompetencyMappings',
  ];

  const masterCollections: Record<string, Record<string, any>[]> = {
    simulationReferenceAnalysis: [],
  };
  const counts: Record<string, number> = {
    simulationReferenceAnalysis: 0,
  };

  await Promise.all(
    academyCollections.map(async (col) => {
      try {
        const res = await getFirestoreCollectionDocs(col);
        masterCollections[col] = res.docs;
        counts[col] = res.docs.length;
      } catch {
        masterCollections[col] = [];
        counts[col] = 0;
      }
    })
  );

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

  await Promise.all(
    simCollections.map(async (col) => {
      try {
        const res = await getFirestoreCollectionDocs(col);
        masterCollections[col] = res.docs;
        counts[col] = res.docs.length;
      } catch {
        masterCollections[col] = [];
        counts[col] = 0;
      }
    })
  );

  return { masterCollections, counts };
}

export interface ProductionTransactionalData {
  enrollments: Record<string, any>[];
  quizAttempts: Record<string, any>[];
  practicalSubmissions: Record<string, any>[];
  simulationSessions: Record<string, any>[];
  simulationDatasets: Record<string, any>[];
  simulationEvaluations: Record<string, any>[];
  simulationAssignments: Record<string, any>[];
  simulationAuditLogs: Record<string, any>[];
  scenarioVersions: Record<string, any>[];
  scenarioImportJobs: Record<string, any>[];
  scenarioCompetencyMappings: Record<string, any>[];
  talentConfig: Record<string, any> | null;
  competencyAssessments: Record<string, any>[];
  developmentActivities: Record<string, any>[];
  individualDevelopmentPlans: Record<string, any>[];
  idpReviewLogs: Record<string, any>[];
  competencyReassessments: Record<string, any>[];
  careerReadinessReviews: Record<string, any>[];
  userProfiles: Record<string, any>[];
  rolePermissions: RolePermissionPolicyDoc[];
  lessonMaterials: LessonMaterialDoc[];
}

export async function fetchProductionTransactionalData(
  uid: string,
  isAdminOrLnd: boolean
): Promise<ProductionTransactionalData> {
  const safeScoped = async (col: string, ownerField = 'employeeUid'): Promise<Record<string, any>[]> => {
    try {
      return await getScopedCollectionDocs(col, uid, isAdminOrLnd, ownerField);
    } catch {
      return [];
    }
  };
  const safeList = async (col: string): Promise<Record<string, any>[]> => {
    try {
      const res = await getFirestoreCollectionDocs(col);
      return res.docs;
    } catch {
      return [];
    }
  };
  const safeGetOne = async (col: string, docId: string): Promise<Record<string, any> | null> => {
    try {
      const snap = await getDoc(doc(db, col, docId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch {
      return null;
    }
  };

  const [
    enrollments,
    quizAttempts,
    practicalSubmissions,
    simulationSessions,
    simulationDatasets,
    simulationEvaluations,
    simulationAssignments,
    simulationAuditLogs,
    scenarioVersions,
    scenarioImportJobs,
    scenarioCompetencyMappings,
    talentConfigList,
    competencyAssessments,
    developmentActivities,
    individualDevelopmentPlans,
    idpReviewLogs,
    competencyReassessments,
    careerReadinessReviews,
    userProfiles,
    rolePermissions,
    lessonMaterials,
  ] = await Promise.all([
    safeScoped('enrollments', 'employeeUid'),
    safeScoped('quizAttempts', 'employeeUid'),
    safeScoped('practicalSubmissions', 'employeeUid'),
    safeScoped('simulationSessions', 'employeeUid'),
    safeList('simulationDatasets'),
    safeScoped('simulationEvaluations', 'learnerUid'),
    safeScoped('simulationAssignments', 'learnerId'),
    isAdminOrLnd ? safeList('simulationAuditLogs') : Promise.resolve([]),
    isAdminOrLnd ? safeList('scenarioVersions') : Promise.resolve([]),
    isAdminOrLnd ? safeList('scenarioImportJobs') : Promise.resolve([]),
    safeList('scenarioCompetencyMappings'),
    isAdminOrLnd ? safeList('talentConfig') : safeGetOne('talentConfig', 'default').then((d) => (d ? [d] : [])),
    safeScoped('competencyAssessments', 'employeeUid'),
    safeScoped('developmentActivities', 'employeeUid'),
    safeScoped('individualDevelopmentPlans', 'employeeUid'),
    safeScoped('idpReviewLogs', 'employeeUid'),
    safeScoped('competencyReassessments', 'employeeUid'),
    safeScoped('careerReadinessReviews', 'employeeUid'),
    isAdminOrLnd ? safeList('userProfiles') : safeGetOne('userProfiles', uid).then((d) => (d ? [d] : [])),
    safeList('rolePermissions'),
    safeList('lessonMaterials'),
  ]);

  return {
    enrollments,
    quizAttempts,
    practicalSubmissions,
    simulationSessions,
    simulationDatasets,
    simulationEvaluations,
    simulationAssignments,
    simulationAuditLogs,
    scenarioVersions,
    scenarioImportJobs,
    scenarioCompetencyMappings,
    talentConfig: talentConfigList[0] || null,
    competencyAssessments,
    developmentActivities,
    individualDevelopmentPlans,
    idpReviewLogs,
    competencyReassessments,
    careerReadinessReviews,
    userProfiles,
    rolePermissions: rolePermissions as RolePermissionPolicyDoc[],
    lessonMaterials: sortLessonMaterialsAsc(lessonMaterials as LessonMaterialDoc[]),
  };
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

  const toWrite: Array<{ docId: string; record: Record<string, any>; mode: 'create' | 'update' }> = [];

  for (const rawRecord of records) {
    const record = sanitizeForFirestore(rawRecord);
    const docId = String(record.id || record.uid || '').trim();
    if (!docId || docId === 'undefined' || docId === 'null') {
      outcome.failedCount++;
      outcome.failedRecords.push({
        collection: collectionName,
        id: docId || '(missing)',
        reason: `Missing valid document id/uid for collection "${collectionName}".`,
        record,
      });
      continue;
    }
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
      toWrite.push({ docId, record, mode: 'update' });
    } else {
      toWrite.push({ docId, record, mode: 'create' });
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
          const ref = doc(db, collectionName, item.docId);
          // Full overwrite removes any stale legacy fields that would violate Firestore hasOnly() rules
          batch.set(ref, item.record);
        }
        await batch.commit();
        for (const item of chunk) {
          if (item.mode === 'update') outcome.updatedCount++;
          else outcome.createdCount++;
          outcome.succeededIds.push(item.docId);
          existingIds.add(item.docId);
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
          await setDoc(doc(db, collectionName, item.docId), item.record);
          if (item.mode === 'update') outcome.updatedCount++;
          else outcome.createdCount++;
          outcome.succeededIds.push(item.docId);
          existingIds.add(item.docId);
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

export async function fetchSiteAdminConfigFromFirestore(): Promise<SiteAdminConfigDoc | null> {
  // Primary path: /siteSettings/site_settings_global
  try {
    const snap = await getDoc(doc(db, 'siteSettings', SITE_ADMIN_CONFIG_DOC_ID));
    if (snap.exists()) {
      return normalizeSiteAdminConfig(snap.data() as Partial<SiteAdminConfigDoc>);
    }
  } catch {
    // Fallback below if siteSettings rule not deployed yet
  }
  // Fallback path compatible with existing deployed firestore.rules
  try {
    const fallbackSnap = await getDoc(doc(db, 'simulationDatasets', SITE_ADMIN_CONFIG_DOC_ID));
    if (fallbackSnap.exists()) {
      return normalizeSiteAdminConfig(fallbackSnap.data() as Partial<SiteAdminConfigDoc>);
    }
  } catch {
    // ignore unauthenticated read
  }
  return null;
}

export async function saveSiteAdminConfigToFirestore(
  config: SiteAdminConfigDoc
): Promise<SiteAdminConfigDoc> {
  const payload = sanitizeForFirestore({
    ...normalizeSiteAdminConfig(config),
    id: SITE_ADMIN_CONFIG_DOC_ID,
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(doc(db, 'siteSettings', SITE_ADMIN_CONFIG_DOC_ID), payload);
    return payload;
  } catch (err: any) {
    const msg = String(err?.code || err?.message || '').toLowerCase();
    if (msg.includes('permission-denied') || msg.includes('missing or insufficient permissions')) {
      try {
        await setDoc(doc(db, 'simulationDatasets', SITE_ADMIN_CONFIG_DOC_ID), payload);
        return payload;
      } catch (fbErr) {
        handleFirestoreError(fbErr, OperationType.WRITE, `simulationDatasets/${SITE_ADMIN_CONFIG_DOC_ID}`);
      }
    }
    handleFirestoreError(err, OperationType.WRITE, `siteSettings/${SITE_ADMIN_CONFIG_DOC_ID}`);
  }
}
