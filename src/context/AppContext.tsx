import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  auth,
  subscribeFirebaseAuth,
  resolveAuthenticatedUserProfile,
  signOutFirebase,
  fetchAllProductionMasterData,
  fetchProductionTransactionalData,
  publishSimulationScenarioInFirestore,
  syncRecordToFirestore,
  deleteRecordFromFirestore,
  getFirestoreCollectionDocs,
  writeScenarioVersionToFirestore,
  syncOfficialUserToFirestore,
  disableOfficialUserInFirestore,
  isUserDisabledRecord,
  seedOfficialUsersToFirestore,
  isDemoUserRecord,
  purgeDemoUsersFromFirestore,
  saveRolePermissionPolicyToFirestore,
  seedDefaultRolePermissionsToFirestore,
  fetchLessonMaterialsFromFirestore,
  saveLessonMaterialToFirestore,
  deleteLessonMaterialFromFirestore,
  fetchSiteAdminConfigFromFirestore,
  saveSiteAdminConfigToFirestore,
  uploadAuthorizedTrainingFile,
  validateStorageFile,
} from '../lib/firebase';
import {
  DEFAULT_SITE_ADMIN_CONFIG,
  SITE_ADMIN_CONFIG_DOC_ID,
  normalizeSiteAdminConfig,
  resolveEffectiveCoursePricing,
  resolveMaterialApprovalStatus,
} from '../lib/siteAdminConfig';
import {
  findCourseMatch,
  findLearningPathMatch,
  findOjtMatch,
  getLearningPathCanonicalKey,
  fileToBase64,
  formatFileSizeLabel,
  inferMaterialTypeFromFile,
  sortLessonMaterialsAsc,
  FIRESTORE_INLINE_MAX_BYTES,
  FIREBASE_STORAGE_MAX_BYTES,
  VIDEO_STORAGE_MAX_BYTES,
} from '../lib/lessonMaterials';
import { uploadFileWithProgress } from '../lib/r2ClientUpload';
import {
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  canAccessTab,
  normalizeRolePermissionsMap,
  roleHasPermission,
  sanitizeRolePermissionsList,
} from '../lib/rbac';
import {
  generateDatasetSnapshotForScenario,
  evaluateDeterministicSimulation,
} from '../lib/simulatorEngine';
import {
  User,
  UserRole,
  PermissionKey,
  RolePermissionsMap,
  ProficiencyLevel,
  CompetencyDomain,
  Competency,
  Course,
  CourseEnrollment,
  QuizAttempt,
  OJTAssignment,
  AssignmentSubmission,
  LearningPath,
  AssessmentRecord,
  IndividualDevelopmentPlan,
  Certificate,
  SuccessionCandidate,
  AuditLogEntry,
  CompetencyAssessmentDoc,
  IndividualDevelopmentPlanDoc,
  DevelopmentActivityDoc,
  CompetencyReassessmentDoc,
  CareerReadinessReviewDoc,
  IdpReviewLogDoc,
  TalentConfigDoc,
  LmsNotificationItem,
  FirebaseUserProfileDoc,
  HotelSimulationProfileDoc,
  SimulationScenarioDoc,
  SimulationFinancialRecordDoc,
  SimulationOperationalRecordDoc,
  SimulationBusinessChallengeDoc,
  SimulationTaskDoc,
  SimulationReferenceAnalysisDoc,
  SimulationDecisionOptionDoc,
  SimulationRoleplayPromptDoc,
  SimulationEvaluationRubricDoc,
  SimulationCompetencyMappingDoc,
  SimulationSessionDoc,
  HotelSimulationDatasetSnapshot,
  SimulationEvaluationDoc,
  SimulationAssignmentDoc,
  SimulationAuditLogDoc,
  SimulationScenarioStatus,
  ScenarioVersionDoc,
  ScenarioImportJobDoc,
  ScenarioCompetencyMappingDoc,
  LessonMaterialDoc,
  LessonMaterialType,
  LessonMaterialStorageMode,
  CourseComboPackage,
  MaterialApprovalStatus,
  SiteAdminConfigDoc,
} from '../types';
import { DEFAULT_TALENT_CONFIG } from '../lib/talentEngine';
import {
  INITIAL_USERS,
  COMPETENCY_DOMAINS,
  COMPETENCIES,
  COURSES,
  OJT_ASSIGNMENTS,
  LEARNING_PATHS,
  INITIAL_ASSESSMENT_RECORDS,
  INITIAL_IDPS,
  INITIAL_CERTIFICATES,
  SUCCESSION_CANDIDATES,
} from '../data/initialData';
import { COURSE_SYLLABI_BY_CODE } from '../data/courseSyllabi';
import { build2027DatasetRows } from '../data/dataset2027';
import { translations, Language } from '../i18n/translations';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface SystemRuntimeConfig {
  appMode: 'demo' | 'production';
  demoModeEnabled: boolean;
  databaseDriver: 'postgresql' | 'local_json';
  storageDriver: 'cloudflare_r2' | 'local_upload';
  sandboxPaymentsEnabled: boolean;
}

export interface UserEntitlementSummary {
  id: string;
  scope: string;
  resourceId: string;
  status: string;
  validFrom: string;
  validUntil: string | null;
  sourceOrderId: string;
  productId: string;
  seatsTotal?: number;
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.vi;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;

  // Data collections
  users: User[];
  domains: CompetencyDomain[];
  competencies: Competency[];
  courses: Course[];
  enrollments: CourseEnrollment[];
  quizAttempts: QuizAttempt[];
  ojtAssignments: OJTAssignment[];
  submissions: AssignmentSubmission[];
  learningPaths: LearningPath[];
  assessments: AssessmentRecord[];
  idps: IndividualDevelopmentPlan[];
  certificates: Certificate[];
  successionCandidates: SuccessionCandidate[];
  auditLogs: AuditLogEntry[];

  // Actions
  enrollCourse: (courseId: string) => Promise<void>;
  updateCourseProgress: (courseId: string, moduleId: string) => Promise<void>;
  submitQuizAttempt: (
    courseId: string | undefined,
    quizTitle: string,
    score: number,
    total: number,
    passed: boolean,
    answers: Record<string, any>
  ) => Promise<void>;
  submitAssignment: (assignmentId: string, notes: string, fileName?: string, aiResult?: any) => Promise<void>;
  gradeAssignment: (
    submissionId: string,
    score: number,
    feedback: string,
    status: 'approved' | 'revision_requested'
  ) => Promise<void>;
  saveCompetency: (comp: Competency) => Promise<void>;
  deleteCompetency: (id: string) => Promise<void>;
  saveAssessment: (record: AssessmentRecord) => Promise<AssessmentRecord>;
  generateIDPFromGap: (
    learnerId: string,
    targetPosition?: string,
    approvedBy?: string,
    assessmentId?: string
  ) => Promise<IndividualDevelopmentPlan | void>;
  updateIDPItem: (
    learnerId: string,
    itemId: string,
    status: 'Not Started' | 'In Progress' | 'Completed',
    evidenceNotes?: string,
    mentorNotes?: string
  ) => Promise<void>;
  saveIDPPlan: (plan: IndividualDevelopmentPlan) => Promise<void>;
  createAssessmentCycle: (learnerId: string, cycleName: string) => AssessmentRecord;
  issueCertificate: (userId: string, level: 1 | 2 | 3 | 4 | 5) => Promise<Certificate | null>;
  addUser: (userData: Partial<User>) => Promise<User | null>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<User | null>;
  disableUser: (userId: string) => Promise<boolean>;
  updateUserCareerPath: (pathId: string) => Promise<void>;
  // Billing, Entitlements & Direct Course / Combo Checkout Flow
  pendingCheckoutCourse: Course | null;
  pendingCheckoutLessonId: string | null;
  pendingCheckoutCombo: CourseComboPackage | null;
  startCourseCheckout: (course: Course, lessonId?: string | null) => void;
  startComboCheckout: (combo: CourseComboPackage) => void;
  clearCourseCheckout: () => void;
  userEntitlements: UserEntitlementSummary[];
  hasAllAccess: boolean;
  refreshEntitlements: () => Promise<void>;
  hasCourseAccess: (courseOrId: Course | string) => boolean;
  completeCourseUnlock: (course: Course, lessonId?: string | null) => Promise<void>;
  completeComboUnlock: (combo: CourseComboPackage) => Promise<void>;
  // Admin Website Control Center (Pricing, Combos, Announcements, Ads, Material Approvals, General Settings)
  siteAdminConfig: SiteAdminConfigDoc;
  saveSiteAdminConfig: (
    next: SiteAdminConfigDoc | ((prev: SiteAdminConfigDoc) => SiteAdminConfigDoc),
    successToast?: string
  ) => Promise<boolean>;
  getEffectiveCoursePricing: (course: Course) => {
    priceVnd: number;
    originalPriceVnd?: number;
    isFree: boolean;
    published: boolean;
  };
  getMaterialApprovalStatus: (material: LessonMaterialDoc) => MaterialApprovalStatus;
  reviewLessonMaterial: (
    materialId: string,
    status: MaterialApprovalStatus,
    reviewNotes?: string
  ) => Promise<boolean>;
  selectedCourseForPlayer: Course | null;
  setSelectedCourseForPlayer: (c: Course | null) => void;
  selectedLessonIdForPlayer: string | null;
  setSelectedLessonIdForPlayer: (lessonId: string | null) => void;
  selectedCertificateForView: Certificate | null;
  setSelectedCertificateForView: (cert: Certificate | null) => void;
  activeQuizTopic: string | null;
  setActiveQuizTopic: (topic: string | null) => void;
  notifications: Array<{ id: string; title: string; time: string; read: boolean }>;
  markAllNotificationsRead: () => void;

  // Competency Gap Engine & IDP Module
  talentConfig: TalentConfigDoc;
  competencyAssessments: CompetencyAssessmentDoc[];
  talentIdps: IndividualDevelopmentPlanDoc[];
  developmentActivities: DevelopmentActivityDoc[];
  competencyReassessments: CompetencyReassessmentDoc[];
  careerReadinessReviews: CareerReadinessReviewDoc[];
  idpReviewLogs: IdpReviewLogDoc[];
  talentNotifications: LmsNotificationItem[];
  selectedTalentEmployeeId: string;
  setSelectedTalentEmployeeId: (id: string) => void;
  selectedTalentTargetPosition: string;
  setSelectedTalentTargetPosition: (pos: string) => void;
  refreshTalentData: () => Promise<void>;
  updateTalentConfig: (updates: Partial<TalentConfigDoc>) => Promise<boolean>;
  saveTalentAssessment: (payload: any) => Promise<CompetencyAssessmentDoc | null>;
  transitionTalentAssessment: (
    id: string,
    targetStatus: 'draft' | 'submitted' | 'approved' | 'rejected',
    rejectionReason?: string
  ) => Promise<CompetencyAssessmentDoc | null>;
  createTalentActivity: (payload: any) => Promise<DevelopmentActivityDoc | null>;
  updateTalentActivity: (id: string, payload: any) => Promise<DevelopmentActivityDoc | null>;
  createTalentIdp: (payload: any) => Promise<{ idp?: IndividualDevelopmentPlanDoc; duplicateId?: string; error?: string }>;
  transitionTalentIdp: (id: string, targetStatus: string, comment?: string) => Promise<IndividualDevelopmentPlanDoc | null>;
  updateTalentIdpObjective: (idpId: string, objId: string, payload: any) => Promise<IndividualDevelopmentPlanDoc | null>;
  submitTalentReassessment: (payload: any) => Promise<{ reassessment?: CompetencyReassessmentDoc; newAssessment?: CompetencyAssessmentDoc } | null>;
  submitCareerReadinessReview: (payload: any) => Promise<CareerReadinessReviewDoc | null>;

  // Full-Stack Academy Server Auth + Firebase Cloud Auth, Production Mode & Simulator
  serverAuthUser: User | null;
  loginWithServerAccount: (email: string, password: string) => Promise<{ ok: boolean; user?: User; error?: string }>;
  registerWithServerAccount: (payload: {
    name: string;
    email: string;
    password: string;
    position?: string;
    department?: string;
    property?: string;
    requestedRole?: UserRole;
  }) => Promise<{ ok: boolean; user?: User; error?: string }>;
  changeServerPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  requestServerPasswordReset: (
    email: string
  ) => Promise<{ ok: boolean; message?: string; devPreviewCode?: string; error?: string }>;
  confirmServerPasswordReset: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  firebaseUser: FirebaseUser | null;
  firebaseProfile: FirebaseUserProfileDoc | null;
  officialAuthUser: User | null;
  isPreviewingRole: boolean;
  useOfficialAccountIdentity: () => void;
  signOutOfficialAccount: () => Promise<void>;
  authModalTab: 'login' | 'register' | 'reset' | null;
  openAuthModal: (tab?: 'login' | 'register' | 'reset') => void;
  closeAuthModal: () => void;
  syncAllExperienceRolesToFirestore: (overwrite?: boolean) => Promise<{
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    failedCount: number;
    adminSyncedCount: number;
  }>;
  purgeDemoUsersInFirestore: () => Promise<{
    deletedProfiles: number;
    deletedAdmins: number;
    failedCount: number;
  }>;
  dataSourceMode: 'demo' | 'firestore';
  setDataSourceMode: (mode: 'demo' | 'firestore') => void;
  systemConfig: SystemRuntimeConfig;
  getAuthHeaders: () => Record<string, string>;
  productionCounts: Record<string, number>;
  refreshFromFirestore: (forceMode?: 'demo' | 'firestore') => Promise<void>;
  simulatorData: {
    hotelSimulationProfiles: HotelSimulationProfileDoc[];
    simulationScenarios: SimulationScenarioDoc[];
    simulationFinancialData: SimulationFinancialRecordDoc[];
    simulationOperationalData: SimulationOperationalRecordDoc[];
    simulationBusinessChallenges: SimulationBusinessChallengeDoc[];
    simulationTasks: SimulationTaskDoc[];
    simulationReferenceAnalysis: SimulationReferenceAnalysisDoc[];
    simulationDecisionOptions: SimulationDecisionOptionDoc[];
    simulationRoleplayPrompts: SimulationRoleplayPromptDoc[];
    simulationEvaluationRubrics: SimulationEvaluationRubricDoc[];
    simulationCompetencyMappings: SimulationCompetencyMappingDoc[];
    simulationSessions: SimulationSessionDoc[];
  };
  simulatorWorkspace: {
    datasets: Record<string, HotelSimulationDatasetSnapshot>;
    evaluations: SimulationEvaluationDoc[];
    assignments: SimulationAssignmentDoc[];
    auditLogs: SimulationAuditLogDoc[];
  };
  selectedSimulatorScenarioId: string;
  setSelectedSimulatorScenarioId: (id: string) => void;
  activeSimulatorSessionId: string | null;
  setActiveSimulatorSessionId: (id: string | null) => void;
  refreshSimulatorData: () => Promise<void>;
  refreshSimulatorWorkspace: () => Promise<void>;
  scenarioVersions: ScenarioVersionDoc[];
  scenarioImportJobs: ScenarioImportJobDoc[];
  scenarioCompetencyMappings: ScenarioCompetencyMappingDoc[];
  refreshScenarioGovernance: () => Promise<void>;
  transitionScenarioStatus: (
    scenarioId: string,
    status: SimulationScenarioStatus,
    note?: string
  ) => Promise<boolean>;
  toggleScenarioPublish: (scenarioId: string, status: SimulationScenarioStatus, note?: string) => Promise<boolean>;
  saveSimulationSession: (payload: Partial<SimulationSessionDoc> & { scenarioId: string }) => Promise<SimulationSessionDoc | null>;
  evaluateSimulationSession: (
    sessionId: string,
    payload: {
      analysisWorkspace?: any;
      decisionWorkspace?: any;
      executiveReport?: any;
      conversation?: any[];
      language?: 'vi' | 'en';
    }
  ) => Promise<{ session: SimulationSessionDoc; evaluation: SimulationEvaluationDoc; aiFallbackUsed?: boolean } | null>;
  reviewSimulationEvaluation: (
    evaluationId: string,
    payload: {
      adjustedTotalScore?: number;
      criterionAdjustments?: Record<string, number>;
      adjustmentReason: string;
      assessorComments?: string;
    }
  ) => Promise<SimulationEvaluationDoc | null>;
  assignSimulatorScenario: (payload: {
    scenarioId: string;
    learnerId: string;
    dueDate: string;
    mandatory?: boolean;
    note?: string;
  }) => Promise<SimulationAssignmentDoc | null>;
  upsertSimulatorScenario: (payload: any, existingId?: string) => Promise<SimulationScenarioDoc | null>;
  upsertHotelProfile: (payload: any) => Promise<HotelSimulationProfileDoc | null>;
  launchSimulationWorkspace: (scenarioId: string, subTab?: string, sessionId?: string | null) => void;

  // Dynamic RBAC Role Permissions Control
  rolePermissions: RolePermissionsMap;
  rolePermissionMeta: Partial<Record<UserRole, { updatedAt: string; updatedByName?: string }>>;
  hasPermission: (permission: PermissionKey) => boolean;
  canAccessRoute: (tabId: string) => boolean;
  saveRolePermissionPolicy: (role: UserRole, permissions: PermissionKey[]) => Promise<boolean>;
  saveAllRolePermissions: (updatedMap: RolePermissionsMap) => Promise<boolean>;
  resetRolePermissions: (role?: UserRole) => Promise<boolean>;

  // Per-Lesson Learning Materials (Firestore / Demo)
  lessonMaterials: LessonMaterialDoc[];
  refreshLessonMaterials: () => Promise<void>;
  uploadLessonMaterial: (params: {
    courseId: string;
    lessonId: string;
    titleVi: string;
    titleEn: string;
    descriptionVi?: string;
    descriptionEn?: string;
    materialType?: LessonMaterialType;
    isRequired?: boolean;
    file?: File | null;
    externalUrl?: string;
    preferredStorage?: 'auto' | LessonMaterialStorageMode;
    forceFirestore?: boolean;
    onProgress?: (percent: number) => void;
  }) => Promise<LessonMaterialDoc | null>;
  deleteLessonMaterial: (materialId: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  const [currentUser, setCurrentUserState] = useState<User>(() => {
    const savedId = localStorage.getItem('fc_active_user_id');
    const found = INITIAL_USERS.find((u) => u.id === savedId);
    return found || INITIAL_USERS.find((u) => u.id === 'user_learner1') || INITIAL_USERS[0];
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('fc_language') as Language) || 'vi';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCourseForPlayer, setSelectedCourseForPlayer] = useState<Course | null>(null);
  const [selectedLessonIdForPlayer, setSelectedLessonIdForPlayer] = useState<string | null>(null);
  const [pendingCheckoutCourse, setPendingCheckoutCourse] = useState<Course | null>(null);
  const [pendingCheckoutLessonId, setPendingCheckoutLessonId] = useState<string | null>(null);
  const [pendingCheckoutCombo, setPendingCheckoutCombo] = useState<CourseComboPackage | null>(null);
  const [siteAdminConfig, setSiteAdminConfig] = useState<SiteAdminConfigDoc>(() =>
    normalizeSiteAdminConfig(DEFAULT_SITE_ADMIN_CONFIG)
  );
  const [userEntitlements, setUserEntitlements] = useState<UserEntitlementSummary[]>([]);
  const [hasAllAccess, setHasAllAccess] = useState<boolean>(false);
  const [selectedCertificateForView, setSelectedCertificateForView] = useState<Certificate | null>(null);
  const [activeQuizTopic, setActiveQuizTopic] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `toast_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast]
  );

  const hasManualRoleSwitchRef = useRef(false);

  const setCurrentUser = useCallback((user: User) => {
    hasManualRoleSwitchRef.current = true;
    setCurrentUserState(user);
    localStorage.setItem('fc_active_user_id', user.id);
  }, []);

  // Data collections (bootstrapped from /api/bootstrap & optionally Firestore Live)
  const [domains, setDomains] = useState<CompetencyDomain[]>(COMPETENCY_DOMAINS);
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>(LEARNING_PATHS);
  const [ojtAssignments, setOjtAssignments] = useState<OJTAssignment[]>(OJT_ASSIGNMENTS);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>(COMPETENCIES);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(INITIAL_ASSESSMENT_RECORDS);
  const [idps, setIdps] = useState<IndividualDevelopmentPlan[]>(INITIAL_IDPS);
  const [certificates, setCertificates] = useState<Certificate[]>(INITIAL_CERTIFICATES);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsMap>(() =>
    normalizeRolePermissionsMap(DEFAULT_ROLE_PERMISSIONS)
  );
  const [rolePermissionMeta, setRolePermissionMeta] = useState<
    Partial<Record<UserRole, { updatedAt: string; updatedByName?: string }>>
  >({});
  const [lessonMaterials, setLessonMaterials] = useState<LessonMaterialDoc[]>([]);

  // Full-Stack Server Auth & Firebase Cloud Auth State
  const [serverAuthUser, setServerAuthUser] = useState<User | null>(null);
  const [serverAuthToken, setServerAuthToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('fc_server_auth_token');
    } catch {
      return null;
    }
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [firebaseProfile, setFirebaseProfile] = useState<FirebaseUserProfileDoc | null>(null);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'reset' | null>(null);
  const openAuthModal = useCallback((tab: 'login' | 'register' | 'reset' = 'login') => {
    setAuthModalTab(tab);
  }, []);
  const closeAuthModal = useCallback(() => {
    setAuthModalTab(null);
  }, []);
  const [dataSourceMode, setDataSourceModeState] = useState<'demo' | 'firestore'>(() => {
    try {
      return localStorage.getItem('fc_data_source_mode') === 'firestore' ? 'firestore' : 'demo';
    } catch {
      return 'demo';
    }
  });
  const setDataSourceMode = useCallback((mode: 'demo' | 'firestore') => {
    try {
      localStorage.setItem('fc_data_source_mode', mode);
    } catch {
      // ignore storage errors
    }
    if (mode === 'firestore') {
      hasManualRoleSwitchRef.current = false;
    }
    setDataSourceModeState(mode);
  }, []);
  const [productionCounts, setProductionCounts] = useState<Record<string, number>>({});
  const [systemConfig, setSystemConfig] = useState<SystemRuntimeConfig>({
    appMode: 'production',
    demoModeEnabled: false,
    databaseDriver: 'local_json',
    storageDriver: 'local_upload',
    sandboxPaymentsEnabled: false,
  });
  const systemConfigRef = useRef<SystemRuntimeConfig>(systemConfig);

  useEffect(() => {
    fetch('/api/system/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => {
        if (!cfg) return;
        const resolved: SystemRuntimeConfig = {
          appMode: cfg.appMode === 'production' ? 'production' : 'demo',
          demoModeEnabled: Boolean(cfg.demoModeEnabled),
          databaseDriver: cfg.databaseDriver === 'postgresql' ? 'postgresql' : 'local_json',
          storageDriver: cfg.storageDriver === 'cloudflare_r2' ? 'cloudflare_r2' : 'local_upload',
          sandboxPaymentsEnabled: Boolean(cfg.sandboxPaymentsEnabled),
        };
        systemConfigRef.current = resolved;
        setSystemConfig(resolved);
        // Immediately strip synthetic initial demo state when server confirms Production mode
        if (!resolved.demoModeEnabled) {
          setUsers((prev) => prev.filter((u) => !isDemoUserRecord(u)));
          setAssessments((prev) => prev.filter((a) => !isDemoUserRecord({ id: a.learnerId })));
          setIdps((prev) => prev.filter((p) => !isDemoUserRecord({ id: p.learnerId })));
          setCertificates((prev) => prev.filter((c) => !isDemoUserRecord({ id: c.userId })));
        }
      })
      .catch(() => {
        // Keep fail-closed production defaults if config endpoint is temporarily unreachable
      });
  }, []);

  const mapProfileDocToUser = useCallback((docItem: Record<string, any>): User => {
    const uid = String(docItem.uid || docItem.id || docItem.employeeId || '');
    const seedMatch = INITIAL_USERS.find((u) => u.id === uid || u.id === docItem.id);
    const resolvedName = String(docItem.name || seedMatch?.name || 'Academy Member');
    const resolvedAvatar =
      String(docItem.avatar || '') ||
      seedMatch?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}&background=0A192F&color=D4AF37`;
    return {
      id: uid,
      name: resolvedName,
      email: String(docItem.email || seedMatch?.email || ''),
      role: (docItem.role || seedMatch?.role || 'learner') as User['role'],
      requestedRole: docItem.requestedRole as User['role'] | undefined,
      position: String(docItem.position || seedMatch?.position || 'Hospitality Finance Professional'),
      department: String(docItem.department || seedMatch?.department || 'Finance & Accounting'),
      property: String(docItem.property || seedMatch?.property || 'FC Learning Academy'),
      avatar: resolvedAvatar,
      supervisorId: docItem.supervisorId || seedMatch?.supervisorId,
      currentLevel: (Math.min(4, Math.max(1, Number(docItem.currentLevel || seedMatch?.currentLevel || 2))) as ProficiencyLevel),
      targetLevel: (Math.min(4, Math.max(1, Number(docItem.targetLevel || seedMatch?.targetLevel || 4))) as ProficiencyLevel),
      careerPathId: docItem.careerPathId || seedMatch?.careerPathId,
      joinedDate: String(docItem.joinedDate || seedMatch?.joinedDate || new Date().toISOString().split('T')[0]),
      status: isUserDisabledRecord(docItem) ? 'disabled' : 'active',
      disabledAt: docItem.disabledAt,
      disabledBy: docItem.disabledBy,
    };
  }, []);

  const officialAuthUser: User | null = useMemo(() => {
    if (firebaseUser?.emailVerified && firebaseProfile) {
      return mapProfileDocToUser(firebaseProfile);
    }
    if (serverAuthUser) {
      return serverAuthUser;
    }
    return null;
  }, [firebaseUser?.emailVerified, firebaseProfile, mapProfileDocToUser, serverAuthUser]);

  // Restore server auth session on mount via HTTP-only cookie / Bearer token
  useEffect(() => {
    let active = true;
    const headers: Record<string, string> = {};
    if (serverAuthToken) {
      headers.Authorization = `Bearer ${serverAuthToken}`;
    }
    fetch('/api/auth/me', { credentials: 'same-origin', headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.authenticated && data.user) {
          setServerAuthUser(data.user);
          setUsers((prev) =>
            prev.some((u) => u.id === data.user.id) ? prev : [...prev, data.user]
          );
          if (!hasManualRoleSwitchRef.current) {
            setCurrentUserState(data.user);
            try {
              localStorage.setItem('fc_active_user_id', data.user.id);
            } catch {
              // ignore
            }
          }
        } else {
          setServerAuthUser(null);
          if (serverAuthToken) {
            setServerAuthToken(null);
            try {
              sessionStorage.removeItem('fc_server_auth_token');
            } catch {
              // ignore
            }
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [serverAuthToken]);

  const loginWithServerAccount = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.user) {
          return { ok: false, error: data.error || 'Đăng nhập thất bại.' };
        }
        hasManualRoleSwitchRef.current = false;
        setServerAuthUser(data.user);
        if (data.token) {
          setServerAuthToken(data.token);
          try {
            sessionStorage.setItem('fc_server_auth_token', data.token);
          } catch {
            // ignore
          }
        }
        setUsers((prev) =>
          prev.some((u) => u.id === data.user.id) ? prev : [...prev, data.user]
        );
        setCurrentUserState(data.user);
        try {
          localStorage.setItem('fc_active_user_id', data.user.id);
        } catch {
          // ignore
        }
        showToast(
          language === 'vi'
            ? `Đăng nhập thành công: ${data.user.name}`
            : `Signed in as ${data.user.name}`,
          'success'
        );
        return { ok: true, user: data.user as User };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Không thể kết nối máy chủ.' };
      }
    },
    [language, showToast]
  );

  const registerWithServerAccount = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      position?: string;
      department?: string;
      property?: string;
      requestedRole?: UserRole;
    }) => {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.user) {
          return { ok: false, error: data.error || 'Đăng ký tài khoản thất bại.' };
        }
        hasManualRoleSwitchRef.current = false;
        setServerAuthUser(data.user);
        if (data.token) {
          setServerAuthToken(data.token);
          try {
            sessionStorage.setItem('fc_server_auth_token', data.token);
          } catch {
            // ignore
          }
        }
        setUsers((prev) =>
          prev.some((u) => u.id === data.user.id) ? prev : [...prev, data.user]
        );
        setCurrentUserState(data.user);
        try {
          localStorage.setItem('fc_active_user_id', data.user.id);
        } catch {
          // ignore
        }
        showToast(
          language === 'vi'
            ? `Chào mừng ${data.user.name}! Tài khoản đã được tạo và đăng nhập.`
            : `Welcome ${data.user.name}! Account created and signed in.`,
          'success'
        );
        return { ok: true, user: data.user as User };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Không thể kết nối máy chủ.' };
      }
    },
    [language, showToast]
  );

  const changeServerPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (serverAuthToken) headers.Authorization = `Bearer ${serverAuthToken}`;
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          credentials: 'same-origin',
          headers,
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data.error || 'Đổi mật khẩu thất bại.' };
        }
        if (data.token) {
          setServerAuthToken(data.token);
          try {
            sessionStorage.setItem('fc_server_auth_token', data.token);
          } catch {
            // ignore
          }
        }
        showToast(
          language === 'vi' ? 'Đã đổi mật khẩu thành công!' : 'Password changed successfully!',
          'success'
        );
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Không thể kết nối máy chủ.' };
      }
    },
    [language, serverAuthToken, showToast]
  );

  const requestServerPasswordReset = useCallback(async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'Không thể tạo mã khôi phục.' };
      return { ok: true, message: data.message, devPreviewCode: data.devPreviewCode };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Không thể kết nối máy chủ.' };
    }
  }, []);

  const confirmServerPasswordReset = useCallback(
    async (email: string, code: string, newPassword: string) => {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code, newPassword }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data.error || 'Đặt lại mật khẩu thất bại.' };
        showToast(
          language === 'vi'
            ? 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.'
            : 'Password reset successful! You can sign in now.',
          'success'
        );
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Không thể kết nối máy chủ.' };
      }
    },
    [language, showToast]
  );

  const useOfficialAccountIdentity = useCallback(() => {
    if (!officialAuthUser) return;
    hasManualRoleSwitchRef.current = false;
    setCurrentUserState(officialAuthUser);
    localStorage.setItem('fc_active_user_id', officialAuthUser.id);
    showToast(
      language === 'vi'
        ? `Đang sử dụng tài khoản chính thức: ${officialAuthUser.name}`
        : `Active as official account: ${officialAuthUser.name}`,
      'success'
    );
  }, [officialAuthUser, language, showToast]);

  // Simulator Collections
  const [simulatorData, setSimulatorData] = useState<{
    hotelSimulationProfiles: HotelSimulationProfileDoc[];
    simulationScenarios: SimulationScenarioDoc[];
    simulationFinancialData: SimulationFinancialRecordDoc[];
    simulationOperationalData: SimulationOperationalRecordDoc[];
    simulationBusinessChallenges: SimulationBusinessChallengeDoc[];
    simulationTasks: SimulationTaskDoc[];
    simulationReferenceAnalysis: SimulationReferenceAnalysisDoc[];
    simulationDecisionOptions: SimulationDecisionOptionDoc[];
    simulationRoleplayPrompts: SimulationRoleplayPromptDoc[];
    simulationEvaluationRubrics: SimulationEvaluationRubricDoc[];
    simulationCompetencyMappings: SimulationCompetencyMappingDoc[];
    simulationSessions: SimulationSessionDoc[];
  }>({
    hotelSimulationProfiles: [],
    simulationScenarios: [],
    simulationFinancialData: [],
    simulationOperationalData: [],
    simulationBusinessChallenges: [],
    simulationTasks: [],
    simulationReferenceAnalysis: [],
    simulationDecisionOptions: [],
    simulationRoleplayPrompts: [],
    simulationEvaluationRubrics: [],
    simulationCompetencyMappings: [],
    simulationSessions: [],
  });
  const [simulatorWorkspace, setSimulatorWorkspace] = useState<{
    datasets: Record<string, HotelSimulationDatasetSnapshot>;
    evaluations: SimulationEvaluationDoc[];
    assignments: SimulationAssignmentDoc[];
    auditLogs: SimulationAuditLogDoc[];
  }>({
    datasets: {},
    evaluations: [],
    assignments: [],
    auditLogs: [],
  });
  const [selectedSimulatorScenarioId, setSelectedSimulatorScenarioId] = useState<string>('sim_scn_01');
  const [activeSimulatorSessionId, setActiveSimulatorSessionId] = useState<string | null>(null);
  const [scenarioVersions, setScenarioVersions] = useState<ScenarioVersionDoc[]>([]);
  const [scenarioImportJobs, setScenarioImportJobs] = useState<ScenarioImportJobDoc[]>([]);
  const [scenarioCompetencyMappings, setScenarioCompetencyMappings] = useState<ScenarioCompetencyMappingDoc[]>([]);

  // Competency Gap Engine & IDP state
  const [talentConfig, setTalentConfig] = useState<TalentConfigDoc>(DEFAULT_TALENT_CONFIG);
  const [competencyAssessments, setCompetencyAssessments] = useState<CompetencyAssessmentDoc[]>([]);
  const [talentIdps, setTalentIdps] = useState<IndividualDevelopmentPlanDoc[]>([]);
  const [developmentActivities, setDevelopmentActivities] = useState<DevelopmentActivityDoc[]>([]);
  const [competencyReassessments, setCompetencyReassessments] = useState<CompetencyReassessmentDoc[]>([]);
  const [careerReadinessReviews, setCareerReadinessReviews] = useState<CareerReadinessReviewDoc[]>([]);
  const [idpReviewLogs, setIdpReviewLogs] = useState<IdpReviewLogDoc[]>([]);
  const [talentNotifications, setTalentNotifications] = useState<LmsNotificationItem[]>([]);
  const [selectedTalentEmployeeId, setSelectedTalentEmployeeId] = useState<string>('user_learner1');
  const [selectedTalentTargetPosition, setSelectedTalentTargetPosition] = useState<string>('Assistant Financial Controller');

  const [notifications, setNotifications] = useState([
    {
      id: 'notif_1',
      title: 'Đánh giá năng lực Q1/2026 đã được Giám Đốc Tài Chính David Tran phê duyệt.',
      titleEn: 'Q1/2026 Competency Evaluation approved by Financial Controller David Tran.',
      time: '10 phút trước',
      timeEn: '10 mins ago',
      read: false,
    },
    {
      id: 'notif_2',
      title: 'Kế hoạch phát triển cá nhân (IDP) mới đã được tạo dựa trên khoảng trống năng lực.',
      titleEn: 'New Individual Development Plan (IDP) generated from competency gap analysis.',
      time: '2 giờ trước',
      timeEn: '2 hours ago',
      read: false,
    },
    {
      id: 'notif_3',
      title: 'Kịch bản khủng hoảng mới có sẵn trên FC Business Partner Simulator với GM.',
      titleEn: 'New crisis simulation scenario available in the FC Business Partner Simulator.',
      time: '1 ngày trước',
      timeEn: '1 day ago',
      read: true,
    },
  ]);

  useEffect(() => {
    localStorage.setItem('fc_active_user_id', currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('fc_language', language);
  }, [language]);

  const refreshAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.auditLogs)) {
          setAuditLogs(data.auditLogs);
        }
      }
    } catch {
      // ignore network error
    }
  }, []);

  // Load persisted LMS data on mount (skip in Production Firestore Live mode once verified)
  useEffect(() => {
    const savedMode = (() => {
      try {
        return localStorage.getItem('fc_data_source_mode');
      } catch {
        return 'demo';
      }
    })();
    if (savedMode === 'firestore' && auth.currentUser?.emailVerified) return;

    fetch('/api/bootstrap')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (dataSourceMode === 'firestore' && auth.currentUser?.emailVerified) return;
        if (Array.isArray(data.users)) {
          const activeRawUsers = data.users.filter((u: User) => !isUserDisabledRecord(u));
          const cleanUsers = systemConfigRef.current.demoModeEnabled
            ? activeRawUsers
            : activeRawUsers.filter((u: User) => !isDemoUserRecord(u));
          if (cleanUsers.length > 0 || !systemConfigRef.current.demoModeEnabled) {
            setUsers(cleanUsers);
            if (cleanUsers.length > 0) {
              setCurrentUserState((prev) => cleanUsers.find((u: User) => u.id === prev.id) || prev);
            }
          }
        }
        if (Array.isArray(data.competencies) && data.competencies.length > 0) {
          setCompetencies(data.competencies);
        }
        if (Array.isArray(data.enrollments)) setEnrollments(data.enrollments);
        if (Array.isArray(data.quizAttempts)) setQuizAttempts(data.quizAttempts);
        if (Array.isArray(data.submissions)) setSubmissions(data.submissions);
        if (Array.isArray(data.assessments)) {
          if (data.assessments.length > 0 || !systemConfigRef.current.demoModeEnabled) {
            setAssessments(data.assessments);
          }
        }
        if (Array.isArray(data.idps)) {
          if (data.idps.length > 0 || !systemConfigRef.current.demoModeEnabled) {
            setIdps(data.idps);
          }
        }
        if (Array.isArray(data.certificates)) setCertificates(data.certificates);
        if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
        if (data.rolePermissions) {
          setRolePermissions(normalizeRolePermissionsMap(data.rolePermissions));
        }
        if (Array.isArray(data.lessonMaterials)) {
          setLessonMaterials(sortLessonMaterialsAsc(data.lessonMaterials));
        }
        if (data.siteAdminConfig) {
          setSiteAdminConfig(normalizeSiteAdminConfig(data.siteAdminConfig));
        }
      })
      .catch((err) => console.warn('Bootstrap fallback to local initial data:', err));
  }, [dataSourceMode]);

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      'x-user-id': currentUser.id,
      'x-user-role': currentUser.role,
      ...(serverAuthToken ? { Authorization: `Bearer ${serverAuthToken}` } : {}),
    }),
    [currentUser.id, currentUser.role, serverAuthToken]
  );

  const refreshFromFirestore = useCallback(
    async (forceMode?: 'demo' | 'firestore') => {
      const fb = auth.currentUser;
      if (!fb || !fb.emailVerified) return;

      const activeMode = forceMode ?? dataSourceMode;

      try {
        const profile = await resolveAuthenticatedUserProfile(fb);
        if (profile && isUserDisabledRecord(profile)) {
          await signOutFirebase().catch(() => {});
          setFirebaseProfile(null);
          showToast(
            language === 'vi'
              ? 'Tài khoản của bạn đã bị vô hiệu hóa bởi quản trị viên.'
              : 'Your account has been disabled by an administrator.',
            'error'
          );
          return;
        }
        if (profile) {
          setFirebaseProfile(profile);
        }
        // Firestore Rules authorize admin operations strictly by Firebase Auth token/admins doc
        const isAdminOrLnd = Boolean(
          profile?.isAdmin || profile?.role === 'super_admin' || profile?.role === 'lnd_manager'
        );

        const [{ masterCollections, counts }, txData] = await Promise.all([
          fetchAllProductionMasterData(isAdminOrLnd),
          fetchProductionTransactionalData(fb.uid, isAdminOrLnd),
        ]);

        // Never auto-seed synthetic demo accounts into Official Firestore!
        // Always exclude soft-disabled accounts and legacy demo documents when Production mode is active.
        const activeProfiles = txData.userProfiles.filter((p: any) => !isUserDisabledRecord(p));
        const syncedUserProfiles = systemConfigRef.current.demoModeEnabled
          ? activeProfiles
          : activeProfiles.filter(
              (p: any) =>
                !isDemoUserRecord({
                  id: p.id,
                  uid: p.uid,
                  employeeId: p.employeeId,
                  email: p.email,
                })
            );

        let syncedRolePermissions = txData.rolePermissions || [];
        if (activeMode === 'firestore' && isAdminOrLnd) {
          const existingPolicyIds = new Set(
            syncedRolePermissions.map((rp: any) => String(rp.role || rp.id || ''))
          );
          const missingPolicies = SYSTEM_ROLES.filter((r) => !existingPolicyIds.has(r));
          if (missingPolicies.length > 0) {
            try {
              await seedDefaultRolePermissionsToFirestore(existingPolicyIds, {
                uid: fb.uid,
                name: profile?.name || fb.email || 'Admin',
              });
              const refreshedPolicies = await getFirestoreCollectionDocs('rolePermissions');
              syncedRolePermissions = refreshedPolicies.docs as any[];
            } catch (seedPolicyErr) {
              console.warn('Auto-seed rolePermissions note:', seedPolicyErr);
            }
          }
        }

        if (syncedRolePermissions.length > 0) {
          setRolePermissions(normalizeRolePermissionsMap(syncedRolePermissions));
          const metaMap: Partial<Record<UserRole, { updatedAt: string; updatedByName?: string }>> = {};
          for (const docItem of syncedRolePermissions) {
            const r = (docItem.role || docItem.id) as UserRole;
            if (SYSTEM_ROLES.includes(r)) {
              metaMap[r] = {
                updatedAt: docItem.updatedAt || '',
                updatedByName: docItem.updatedByName,
              };
            }
          }
          setRolePermissionMeta(metaMap);
        }

        setProductionCounts({
          ...counts,
          enrollments: txData.enrollments.length,
          quizAttempts: txData.quizAttempts.length,
          practicalSubmissions: txData.practicalSubmissions.length,
          simulationSessions: txData.simulationSessions.length,
          simulationEvaluations: txData.simulationEvaluations.length,
          individualDevelopmentPlans: txData.individualDevelopmentPlans.length,
          userProfiles: syncedUserProfiles.length,
          rolePermissions: syncedRolePermissions.length,
          lessonMaterials: (txData.lessonMaterials || []).length,
        });

        const hasProdAcademy =
          (counts.competencyDomains || 0) > 0 || (counts.competencies || 0) > 0 || (counts.courses || 0) > 0;
        const hasProdSim = (counts.simulationScenarios || 0) > 0;

        if (activeMode === 'firestore') {
          const officialUser = profile ? mapProfileDocToUser(profile) : null;
          if (syncedUserProfiles.length > 0 || officialUser) {
            const firestoreUsers = syncedUserProfiles.map((p) => mapProfileDocToUser(p));
            const byId = new Map<string, User>();
            if (officialUser) {
              byId.set(officialUser.id, officialUser);
            }
            for (const u of firestoreUsers) {
              if (!byId.has(u.id)) {
                byId.set(u.id, u);
              }
            }
            const mergedUsers = Array.from(byId.values());
            setUsers(mergedUsers);

            if (officialUser) {
              setCurrentUserState((prev) => {
                if (isAdminOrLnd && hasManualRoleSwitchRef.current) {
                  return mergedUsers.find((u) => u.id === prev.id) || officialUser;
                }
                localStorage.setItem('fc_active_user_id', officialUser.id);
                return officialUser;
              });
            }
          }
          if (hasProdAcademy) {
            const DOMAIN_KEY_MAP: Record<string, string[]> = {
              dom_1: ['dom_1', 'DOM-FAR', 'D1-FAR', 'FAR'],
              dom_2: ['dom_2', 'DOM-FCA', 'D2-FCA', 'FCA'],
              dom_3: ['dom_3', 'DOM-FPM', 'D3-FPM', 'FPM'],
              dom_4: ['dom_4', 'DOM-BPA', 'D4-BPA', 'BPA'],
              dom_5: ['dom_5', 'DOM-LPM', 'D5-LPM', 'LPM'],
              dom_6: ['dom_6', 'DOM-SBP', 'D6-SBP', 'SBP'],
            };
            const findMatchingDomain = <T extends { id?: string; code?: string }>(
              fallbackDomId: string,
              list: T[]
            ): T | undefined => {
              const aliases = new Set(
                (DOMAIN_KEY_MAP[fallbackDomId] || [fallbackDomId]).map((x) => x.toUpperCase())
              );
              return list.find(
                (d) =>
                  aliases.has((d.id || '').toUpperCase()) ||
                  (d.code ? aliases.has(d.code.toUpperCase()) : false)
              );
            };

            let activeDomains: CompetencyDomain[] = COMPETENCY_DOMAINS;
            if (masterCollections.competencyDomains?.length > 0) {
              activeDomains = masterCollections.competencyDomains.map((d: any) => {
                const fallbackDom = COMPETENCY_DOMAINS.find((fd) => fd.id === d.id || fd.code === d.code);
                return {
                  id: d.id,
                  code: d.code,
                  nameEn: d.nameEn,
                  nameVi: d.nameVi,
                  descriptionEn: d.descriptionEn || fallbackDom?.descriptionEn || '',
                  descriptionVi: d.descriptionVi || fallbackDom?.descriptionVi || '',
                  iconName: fallbackDom?.iconName || 'BookOpen',
                  color: fallbackDom?.color || 'blue',
                };
              });
              setDomains(activeDomains);
            }
            if (masterCollections.competencies?.length > 0) {
              setCompetencies(
                masterCollections.competencies.map((c: any) => {
                  const fallbackComp = COMPETENCIES.find((fc) => fc.id === c.id || fc.code === c.code);
                  const tgt = (Math.min(4, Math.max(1, Number(c.targetLevel) || 3))) as ProficiencyLevel;
                  return {
                    id: c.id,
                    code: c.code,
                    domainId: c.domainId,
                    nameEn: c.nameEn,
                    nameVi: c.nameVi,
                    definitionEn: c.definitionEn || fallbackComp?.definitionEn || '',
                    definitionVi: c.definitionVi || fallbackComp?.definitionVi || '',
                    expectedLevelByPosition: fallbackComp?.expectedLevelByPosition || {
                      Accountant: 1,
                      'Senior Accountant': 2,
                      'Assistant Financial Controller': 3,
                      'Financial Controller': tgt,
                      'Strategic Finance Business Partner': 4,
                    },
                    assessmentCriteria: fallbackComp?.assessmentCriteria || {
                      level1: 'Foundation proficiency',
                      level2: 'Operational proficiency',
                      level3: 'Advanced proficiency',
                      level4: 'Strategic FC partner',
                    },
                    assessmentCriteriaEn: fallbackComp?.assessmentCriteriaEn,
                    evidenceRequirements: fallbackComp?.evidenceRequirements || ['Practical OJT Deliverable'],
                    evidenceRequirementsEn: fallbackComp?.evidenceRequirementsEn,
                    associatedCourseIds:
                      fallbackComp?.associatedCourseIds ||
                      (c.code === 'LPM-05' ? ['course_502'] : []),
                  };
                })
              );
            }
            if (masterCollections.courses?.length > 0) {
              const catalogSeeds2027 = build2027DatasetRows().Course_Catalog;
              const fsDomainDocs = masterCollections.competencyDomains || [];
              const fsCompDocs = masterCollections.competencies || [];
              const fsDomainIds = new Set(fsDomainDocs.map((d: any) => String(d.id)));
              const fsCompIds = new Set(fsCompDocs.map((cp: any) => String(cp.id)));
              const repairWrites: Array<{ id: string; payload: Record<string, any> }> = [];

              const mappedCourses: Course[] = masterCollections.courses.map((c: any) => {
                const fallbackCourse = COURSES.find((fc) => fc.id === c.id || fc.code === c.code);
                const seed2027 = catalogSeeds2027.find((r) => r.code === c.code || r.id === c.id);
                const matchedDomain = fallbackCourse
                  ? findMatchingDomain(fallbackCourse.domainId, activeDomains)
                  : activeDomains.find((d) => d.id === c.domainId);
                const resolvedDomainId =
                  matchedDomain?.id || fallbackCourse?.domainId || c.domainId;

                const canonicalTitleEn = fallbackCourse?.titleEn || c.titleEn;
                const canonicalTitleVi = fallbackCourse?.titleVi || c.titleVi;
                const canonicalDuration = Number(
                  fallbackCourse?.durationHours || c.durationHours || 4
                );
                const canonicalPassing = Number(
                  fallbackCourse?.passingScore || c.passingScore || 80
                );
                const canonicalDifficulty =
                  fallbackCourse?.difficulty ||
                  (Number(c.targetLevel) === 1
                    ? 'Foundation'
                    : Number(c.targetLevel) === 2
                    ? 'Operational'
                    : Number(c.targetLevel) === 3
                    ? 'Advanced'
                    : 'Strategic');

                if (fallbackCourse && isAdminOrLnd && auth.currentUser?.emailVerified) {
                  const fsMatchedDom = findMatchingDomain(fallbackCourse.domainId, fsDomainDocs);
                  const targetFsDomainId =
                    fsMatchedDom?.id && fsDomainIds.has(String(fsMatchedDom.id))
                      ? String(fsMatchedDom.id)
                      : fsDomainIds.has(String(c.domainId))
                      ? String(c.domainId)
                      : '';
                  const seedCompId = seed2027?.competency_id || '';
                  const fallbackComp = fsCompDocs.find(
                    (cp: any) => cp.domainId === targetFsDomainId
                  );
                  const targetFsCompId = fsCompIds.has(seedCompId)
                    ? seedCompId
                    : fsCompIds.has(String(c.competencyId))
                    ? String(c.competencyId)
                    : fallbackComp?.id || '';

                  const needsRepair =
                    c.titleVi !== canonicalTitleVi ||
                    c.titleEn !== canonicalTitleEn ||
                    Number(c.durationHours) !== canonicalDuration ||
                    (targetFsDomainId && c.domainId !== targetFsDomainId) ||
                    (targetFsCompId && c.competencyId !== targetFsCompId);

                  if (needsRepair && targetFsDomainId && targetFsCompId) {
                    const qW = Number(c.assessmentWeightQuiz);
                    const pW = Number(c.assessmentWeightPractical);
                    const weightsValid =
                      Number.isFinite(qW) &&
                      Number.isFinite(pW) &&
                      qW + pW >= 99.9 &&
                      qW + pW <= 100.1;
                    repairWrites.push({
                      id: String(c.id),
                      payload: {
                        id: String(c.id),
                        code: String(c.code || fallbackCourse.code).slice(0, 32),
                        domainId: targetFsDomainId,
                        competencyId: targetFsCompId,
                        titleEn: canonicalTitleEn.slice(0, 250),
                        titleVi: canonicalTitleVi.slice(0, 250),
                        descriptionEn: (
                          seed2027?.description_en ||
                          fallbackCourse.syllabus?.overviewEn ||
                          c.descriptionEn ||
                          canonicalTitleEn
                        ).slice(0, 2000),
                        descriptionVi: (
                          seed2027?.description_vi ||
                          fallbackCourse.syllabus?.overviewVi ||
                          c.descriptionVi ||
                          canonicalTitleVi
                        ).slice(0, 2000),
                        targetLevel: Math.min(
                          4,
                          Math.max(1, Number(seed2027?.target_level || c.targetLevel) || 2)
                        ),
                        durationHours: canonicalDuration,
                        passingScore: canonicalPassing,
                        assessmentWeightQuiz: weightsValid ? qW : 40,
                        assessmentWeightPractical: weightsValid ? pW : 60,
                        deliveryMode: String(
                          c.deliveryMode || seed2027?.delivery_mode || 'Blended + Case Study'
                        ).slice(0, 100),
                        importedAt: String(c.importedAt || new Date().toISOString()).slice(0, 64),
                        importBatchId: String(c.importBatchId || 'curriculum_sync').slice(0, 128),
                      },
                    });
                  }
                }

                return {
                  id: c.id,
                  code: c.code,
                  titleEn: canonicalTitleEn,
                  titleVi: canonicalTitleVi,
                  category: fallbackCourse?.category || matchedDomain?.nameEn || 'Hospitality Finance',
                  domainId: resolvedDomainId,
                  difficulty: canonicalDifficulty,
                  durationHours: canonicalDuration,
                  instructorName: fallbackCourse?.instructorName || 'FC Academy Faculty',
                  instructorTitle: fallbackCourse?.instructorTitle || 'Hospitality Financial Controller',
                  prerequisites: fallbackCourse?.prerequisites || [],
                  prerequisitesEn: fallbackCourse?.prerequisitesEn,
                  learningObjectivesEn:
                    fallbackCourse?.learningObjectivesEn || [c.descriptionEn || canonicalTitleEn],
                  learningObjectivesVi:
                    fallbackCourse?.learningObjectivesVi || [c.descriptionVi || canonicalTitleVi],
                  modules: fallbackCourse?.modules || [],
                  passingScore: canonicalPassing,
                  thumbnail: fallbackCourse?.thumbnail || '',
                  isMandatoryForFC:
                    fallbackCourse?.isMandatoryForFC ?? Number(c.targetLevel) >= 3,
                  materials: fallbackCourse?.materials,
                  caseStudy: fallbackCourse?.caseStudy,
                  practicalAssignmentId: fallbackCourse?.practicalAssignmentId,
                  practicalAssignmentTitle: fallbackCourse?.practicalAssignmentTitle,
                  practicalAssignmentTitleEn: fallbackCourse?.practicalAssignmentTitleEn,
                  quizQuestionIds: fallbackCourse?.quizQuestionIds,
                  syllabus: fallbackCourse?.syllabus || COURSE_SYLLABI_BY_CODE[c.code],
                };
              });
              mappedCourses.sort((a, b) =>
                (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })
              );
              setCourses(mappedCourses);
              setSelectedCourseForPlayer((prev) =>
                prev
                  ? mappedCourses.find((mc) => mc.id === prev.id || mc.code === prev.code) || prev
                  : null
              );

              if (repairWrites.length > 0) {
                void Promise.all(
                  repairWrites.map((item) =>
                    syncRecordToFirestore('courses', item.id, item.payload, false).catch(() => undefined)
                  )
                );
              }
            }
            if (masterCollections.practicalAssignments?.length > 0) {
              const mappedOjts: OJTAssignment[] = masterCollections.practicalAssignments.map((p: any) => {
                const fbOjt =
                  findOjtMatch(OJT_ASSIGNMENTS, p.id) ||
                  findOjtMatch(OJT_ASSIGNMENTS, p.code);
                const matchedDomain = fbOjt
                  ? findMatchingDomain(fbOjt.domainId, activeDomains)
                  : findMatchingDomain(p.domainId, activeDomains);
                const delivList: string[] = p.deliverables
                  ? typeof p.deliverables === 'string'
                    ? p.deliverables.split(';').map((s: string) => s.trim()).filter(Boolean)
                    : Array.isArray(p.deliverables)
                    ? p.deliverables
                    : []
                  : [];
                return {
                  id: p.id,
                  code: fbOjt?.code || p.code || p.id,
                  titleEn: fbOjt?.titleEn || p.titleEn || '',
                  titleVi: fbOjt?.titleVi || p.titleVi || '',
                  domainId: matchedDomain?.id || fbOjt?.domainId || p.domainId || 'dom_2',
                  propertyContext: fbOjt?.propertyContext || 'Hotel Finance Operation',
                  propertyContextEn: fbOjt?.propertyContextEn || 'Hotel Finance Operation',
                  descriptionEn: fbOjt?.descriptionEn || p.scenarioEn || '',
                  descriptionVi: fbOjt?.descriptionVi || p.scenarioVi || '',
                  deliverablesEn: fbOjt?.deliverablesEn?.length ? fbOjt.deliverablesEn : delivList,
                  deliverablesVi: fbOjt?.deliverablesVi?.length ? fbOjt.deliverablesVi : delivList,
                  templateFileName: fbOjt?.templateFileName,
                  evaluationRubric: fbOjt?.evaluationRubric || [
                    {
                      criterionVi: 'Độ chính xác USALI & khuyến nghị',
                      criterionEn: 'USALI Accuracy & Recommendations',
                      maxPoints: Number(p.maxScore || 100),
                    },
                  ],
                };
              });

              for (const canonicalOjt of OJT_ASSIGNMENTS) {
                const alreadyExists = mappedOjts.some(
                  (mo) =>
                    Boolean(findOjtMatch([mo], canonicalOjt.id)) ||
                    Boolean(findOjtMatch([mo], canonicalOjt.code))
                );
                if (!alreadyExists) {
                  const matchedDomain = findMatchingDomain(canonicalOjt.domainId, activeDomains);
                  mappedOjts.push({
                    ...canonicalOjt,
                    domainId: matchedDomain?.id || canonicalOjt.domainId,
                  });
                }
              }
              setOjtAssignments(mappedOjts);
            }

            const fsCareerPaths = masterCollections.careerPaths || [];
            if (fsCareerPaths.length > 0) {
              const canonicalKeysUsed = new Set<string>();
              const pathSeed2027 = build2027DatasetRows().Career_Paths;
              const pathRepairWrites: Array<{ id: string; payload: Record<string, any> }> = [];

              const anchoredPaths: LearningPath[] = LEARNING_PATHS.map((canonicalPath) => {
                const fsMatch = fsCareerPaths.find(
                  (p: any) =>
                    getLearningPathCanonicalKey(p.id) === canonicalPath.id ||
                    getLearningPathCanonicalKey(p.code) === canonicalPath.id
                );
                if (fsMatch) {
                  canonicalKeysUsed.add(String(fsMatch.id));
                }
                const resolvedDomainIds = (canonicalPath.domainIds || []).map(
                  (did) => findMatchingDomain(did, activeDomains)?.id || did
                );
                return {
                  ...canonicalPath,
                  id: fsMatch?.id || canonicalPath.id,
                  domainIds: resolvedDomainIds,
                  stages: canonicalPath.stages.map((st) => ({
                    ...st,
                    domainIds: (st.domainIds || []).map(
                      (did) => findMatchingDomain(did, activeDomains)?.id || did
                    ),
                  })),
                };
              });

              const customPaths: LearningPath[] = fsCareerPaths
                .filter((p: any) => !canonicalKeysUsed.has(String(p.id)))
                .map((p: any, idx: number) => {
                  const reqCourses = Array.isArray(p.requiredCourseIds) ? p.requiredCourseIds : [];
                  return {
                    id: p.id,
                    code: p.code || `CP-${idx + 1}`,
                    titleEn: p.nameEn || p.titleEn || `${p.fromRole} → ${p.toRole}`,
                    titleVi: p.nameVi || p.titleVi || `${p.fromRole} → ${p.toRole}`,
                    fromRole: p.fromRole,
                    toRole: p.toRole,
                    targetRole: p.toRole || 'Financial Controller',
                    targetLevel: (Math.min(4, Math.max(1, Number(p.targetLevel) || 3))) as ProficiencyLevel,
                    durationMonths: Number(p.durationMonths || 12),
                    minAssessmentScore: Number(p.minAssessmentScore || 80),
                    requiredCompetencyCodes: Array.isArray(p.requiredCompetencyIds)
                      ? p.requiredCompetencyIds
                      : [],
                    descriptionEn: `${p.fromRole} → ${p.toRole} (${p.durationMonths || 12} months)`,
                    descriptionVi: `${p.fromRole} → ${p.toRole} (${p.durationMonths || 12} tháng)`,
                    totalHours: Math.max(8, reqCourses.length * 16),
                    stages: [
                      {
                        stageNumber: 1,
                        titleEn: p.nameEn || 'Core Track',
                        titleVi: p.nameVi || 'Lộ Trình Cốt Lõi',
                        requiredCourses: reqCourses,
                        requiredOjtAssignments: Array.isArray(p.requiredPracticalIds)
                          ? p.requiredPracticalIds
                          : [],
                        readinessCriteriaEn: `Minimum Assessment Score: ${p.minAssessmentScore || 80}%`,
                        readinessCriteriaVi: `Điểm đánh giá tối thiểu: ${p.minAssessmentScore || 80}%`,
                      },
                    ],
                  };
                });

              setLearningPaths([...anchoredPaths, ...customPaths]);

              if (isAdminOrLnd && auth.currentUser?.emailVerified) {
                const splitCsv = (val: string) =>
                  val
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);

                for (const seed of pathSeed2027) {
                  const existing = fsCareerPaths.find(
                    (p: any) =>
                      p.id === seed.id ||
                      getLearningPathCanonicalKey(p.id) === getLearningPathCanonicalKey(seed.id)
                  );
                  const expectedCourses = splitCsv(seed.required_course_ids);
                  const expectedComps = splitCsv(seed.required_competency_ids);
                  const expectedPracticals = splitCsv(seed.required_practical_ids);
                  const existingCourses = Array.isArray(existing?.requiredCourseIds)
                    ? existing.requiredCourseIds
                    : [];
                  const needsPathSync =
                    !existing ||
                    existing.nameVi !== seed.name_vi ||
                    existing.nameEn !== seed.name_en ||
                    existing.code !== seed.code ||
                    Number(existing.durationMonths) !== Number(seed.duration_months) ||
                    existingCourses.join(',') !== expectedCourses.join(',');

                  if (needsPathSync) {
                    const targetId = existing?.id || seed.id;
                    pathRepairWrites.push({
                      id: targetId,
                      payload: {
                        id: targetId,
                        code: String(seed.code).slice(0, 64),
                        nameEn: String(seed.name_en).slice(0, 200),
                        nameVi: String(seed.name_vi).slice(0, 200),
                        fromRole: String(seed.from_role).slice(0, 150),
                        toRole: String(seed.to_role).slice(0, 150),
                        targetLevel: Math.min(4, Math.max(1, Number(seed.target_level) || 2)),
                        durationMonths: Math.max(1, Number(seed.duration_months) || 12),
                        requiredCourseIds: expectedCourses.slice(0, 30),
                        requiredCompetencyIds: expectedComps.slice(0, 40),
                        requiredPracticalIds: expectedPracticals.slice(0, 20),
                        minAssessmentScore: Math.min(
                          100,
                          Math.max(0, Number(seed.min_assessment_score) || 80)
                        ),
                        importedAt: String(existing?.importedAt || new Date().toISOString()).slice(0, 64),
                        importBatchId: String(existing?.importBatchId || 'curriculum_sync').slice(0, 128),
                      },
                    });
                  }
                }

                if (pathRepairWrites.length > 0) {
                  void Promise.all(
                    pathRepairWrites.map((item) =>
                      syncRecordToFirestore('careerPaths', item.id, item.payload, false).catch(
                        () => undefined
                      )
                    )
                  );
                }
              }
            } else {
              setLearningPaths(LEARNING_PATHS);
            }
          }

          // Bind Academy transactional collections directly from Firestore
          setEnrollments(txData.enrollments as CourseEnrollment[]);
          setQuizAttempts(txData.quizAttempts as QuizAttempt[]);
          setSubmissions(txData.practicalSubmissions as AssignmentSubmission[]);

          // Bind Simulator master & transactional collections
          const hotelProfiles = masterCollections.hotelSimulationProfiles as HotelSimulationProfileDoc[];
          const scenarios = masterCollections.simulationScenarios as SimulationScenarioDoc[];
          const financialRows = masterCollections.simulationFinancialData as SimulationFinancialRecordDoc[];
          const operationalRows = masterCollections.simulationOperationalData as SimulationOperationalRecordDoc[];

          setSimulatorData({
            hotelSimulationProfiles: hotelProfiles,
            simulationScenarios: scenarios,
            simulationFinancialData: financialRows,
            simulationOperationalData: operationalRows,
            simulationBusinessChallenges: masterCollections.simulationBusinessChallenges as SimulationBusinessChallengeDoc[],
            simulationTasks: masterCollections.simulationTasks as SimulationTaskDoc[],
            simulationReferenceAnalysis: masterCollections.simulationReferenceAnalysis as SimulationReferenceAnalysisDoc[],
            simulationDecisionOptions: masterCollections.simulationDecisionOptions as SimulationDecisionOptionDoc[],
            simulationRoleplayPrompts: masterCollections.simulationRoleplayPrompts as SimulationRoleplayPromptDoc[],
            simulationEvaluationRubrics: masterCollections.simulationEvaluationRubrics as SimulationEvaluationRubricDoc[],
            simulationCompetencyMappings: masterCollections.simulationCompetencyMappings as SimulationCompetencyMappingDoc[],
            simulationSessions: txData.simulationSessions as SimulationSessionDoc[],
          });

          // Hydrate versioned USALI dataset snapshots from Firestore + compute on-the-fly for newly imported scenarios
          const datasetsMap: Record<string, HotelSimulationDatasetSnapshot> = {};
          txData.simulationDatasets.forEach((ds: any) => {
            if (ds.id === SITE_ADMIN_CONFIG_DOC_ID) return;
            const key = ds.scenarioId || ds.id;
            if (key) datasetsMap[key] = ds as HotelSimulationDatasetSnapshot;
          });
          scenarios.forEach((scn) => {
            if (!datasetsMap[scn.id]) {
              const matchedHotel = hotelProfiles.find((h) => h.id === scn.hotelId);
              const scnFin = financialRows.filter((f) => f.scenarioId === scn.id);
              const scnOps = operationalRows.filter((o) => o.scenarioId === scn.id);
              datasetsMap[scn.id] = generateDatasetSnapshotForScenario(scn, matchedHotel, undefined, scnFin, scnOps);
            }
          });

          setSimulatorWorkspace({
            datasets: datasetsMap,
            evaluations: txData.simulationEvaluations as SimulationEvaluationDoc[],
            assignments: txData.simulationAssignments as SimulationAssignmentDoc[],
            auditLogs: txData.simulationAuditLogs as SimulationAuditLogDoc[],
          });

          setScenarioVersions(txData.scenarioVersions as ScenarioVersionDoc[]);
          setScenarioImportJobs(txData.scenarioImportJobs as ScenarioImportJobDoc[]);
          setScenarioCompetencyMappings(txData.scenarioCompetencyMappings as ScenarioCompetencyMappingDoc[]);

          // Bind Competency Gap Engine & IDP collections directly from Firestore
          if (txData.talentConfig) {
            setTalentConfig(txData.talentConfig as TalentConfigDoc);
          }
          setCompetencyAssessments(txData.competencyAssessments as CompetencyAssessmentDoc[]);
          setDevelopmentActivities(txData.developmentActivities as DevelopmentActivityDoc[]);
          setTalentIdps(txData.individualDevelopmentPlans as IndividualDevelopmentPlanDoc[]);
          setIdpReviewLogs(txData.idpReviewLogs as IdpReviewLogDoc[]);
          setCompetencyReassessments(txData.competencyReassessments as CompetencyReassessmentDoc[]);
          setCareerReadinessReviews(txData.careerReadinessReviews as CareerReadinessReviewDoc[]);
          setLessonMaterials(sortLessonMaterialsAsc(txData.lessonMaterials || []));

          // Hydrate Admin Site Config from Firestore (and mirror into Express server for dynamic server-side checkout pricing)
          try {
            const fsSiteCfg = await fetchSiteAdminConfigFromFirestore();
            if (fsSiteCfg) {
              setSiteAdminConfig(fsSiteCfg);
              fetch('/api/admin/site-config', {
                method: 'PUT',
                credentials: 'same-origin',
                headers: authHeaders(),
                body: JSON.stringify({ siteAdminConfig: fsSiteCfg }),
              }).catch(() => {});
            }
          } catch {
            // keep default/server site config
          }
        } else if (hasProdSim) {
          setProductionCounts((prev) => ({ ...prev }));
        }
      } catch (err) {
        console.warn('Firestore refresh note:', err instanceof Error ? err.message : String(err));
      }
    },
    [dataSourceMode, mapProfileDocToUser]
  );

  const signOutOfficialAccount = useCallback(async () => {
    hasManualRoleSwitchRef.current = false;
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: serverAuthToken ? { Authorization: `Bearer ${serverAuthToken}` } : {},
      });
    } catch {
      // ignore network error during logout
    }
    setServerAuthUser(null);
    setServerAuthToken(null);
    try {
      sessionStorage.removeItem('fc_server_auth_token');
    } catch {
      // ignore
    }
    if (auth.currentUser) {
      await signOutFirebase().catch(() => {});
    }
    setFirebaseProfile(null);
    setDataSourceMode('demo');
    const defaultDemoUser =
      users.find((u) => u.id === 'user_learner1') || INITIAL_USERS[0];
    setCurrentUserState(defaultDemoUser);
    try {
      localStorage.setItem('fc_active_user_id', defaultDemoUser.id);
    } catch {
      // ignore
    }
    showToast(
      language === 'vi'
        ? 'Đã đăng xuất tài khoản thành công.'
        : 'Signed out successfully.',
      'info'
    );
  }, [language, serverAuthToken, setDataSourceMode, showToast, users]);

  const syncAllExperienceRolesToFirestore = useCallback(
    async (overwrite = false) => {
      if (!auth.currentUser?.emailVerified) {
        throw new Error(
          language === 'vi'
            ? 'Cần đăng nhập tài khoản Firebase Admin đã xác minh email.'
            : 'Verified Firebase Admin login is required.'
        );
      }
      const res = await seedOfficialUsersToFirestore(INITIAL_USERS, { overwrite });
      await refreshFromFirestore(dataSourceMode);
      showToast(
        language === 'vi'
          ? `Đã khai báo vai trò trải nghiệm lên Firestore: ${res.createdCount} mới, ${res.updatedCount} cập nhật, ${res.skippedCount} giữ nguyên.`
          : `Declared experience roles in Firestore: ${res.createdCount} created, ${res.updatedCount} updated, ${res.skippedCount} existing.`,
        res.failedCount > 0 ? 'error' : 'success'
      );
      return res;
    },
    [dataSourceMode, language, refreshFromFirestore, showToast]
  );

  const purgeDemoUsersInFirestore = useCallback(async () => {
    if (!auth.currentUser?.emailVerified) {
      throw new Error(
        language === 'vi'
          ? 'Cần đăng nhập tài khoản Firebase Admin đã xác minh email.'
          : 'Verified Firebase Admin login is required.'
      );
    }
    const res = await purgeDemoUsersFromFirestore();
    await refreshFromFirestore('firestore');
    showToast(
      language === 'vi'
        ? `Đã xóa vĩnh viễn ${res.deletedProfiles} hồ sơ mẫu và ${res.deletedAdmins} quyền admin mẫu trên Firestore.`
        : `Permanently deleted ${res.deletedProfiles} demo profiles and ${res.deletedAdmins} demo admin records from Firestore.`,
      res.failedCount > 0 ? 'error' : 'success'
    );
    return res;
  }, [language, refreshFromFirestore, showToast]);

  const refreshTalentData = useCallback(async () => {
    if (dataSourceMode === 'firestore' && auth.currentUser?.emailVerified) {
      await refreshFromFirestore('firestore');
      return;
    }
    try {
      const res = await fetch('/api/talent/bootstrap', {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.talentConfig) setTalentConfig(data.talentConfig);
      if (Array.isArray(data.competencyAssessments)) setCompetencyAssessments(data.competencyAssessments);
      if (Array.isArray(data.talentIdps)) setTalentIdps(data.talentIdps);
      if (Array.isArray(data.developmentActivities)) setDevelopmentActivities(data.developmentActivities);
      if (Array.isArray(data.competencyReassessments)) setCompetencyReassessments(data.competencyReassessments);
      if (Array.isArray(data.careerReadinessReviews)) setCareerReadinessReviews(data.careerReadinessReviews);
      if (Array.isArray(data.idpReviewLogs)) setIdpReviewLogs(data.idpReviewLogs);
      if (Array.isArray(data.talentNotifications)) setTalentNotifications(data.talentNotifications);
    } catch {
      // ignore network error on bootstrap
    }
  }, [currentUser.id, currentUser.role, dataSourceMode, refreshFromFirestore]);

  useEffect(() => {
    if (dataSourceMode !== 'firestore' || !auth.currentUser?.emailVerified) {
      refreshTalentData();
    }
    if (currentUser.role === 'learner') {
      setSelectedTalentEmployeeId(currentUser.id);
    }
  }, [refreshTalentData, currentUser.id, currentUser.role, dataSourceMode]);

  const refreshSimulatorWorkspace = useCallback(async () => {
    if (dataSourceMode === 'firestore' && auth.currentUser?.emailVerified) {
      await refreshFromFirestore('firestore');
      return;
    }
    try {
      const res = await fetch('/api/simulator/workspace', {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setSimulatorWorkspace({
        datasets: data.datasets || {},
        evaluations: Array.isArray(data.evaluations) ? data.evaluations : [],
        assignments: Array.isArray(data.assignments) ? data.assignments : [],
        auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs : [],
      });
    } catch {
      // ignore offline
    }
  }, [currentUser.id, currentUser.role, dataSourceMode, refreshFromFirestore]);

  const refreshSimulatorData = useCallback(async () => {
    if (dataSourceMode === 'firestore' && auth.currentUser?.emailVerified) {
      await refreshFromFirestore('firestore');
      return;
    }
    try {
      const res = await fetch('/api/simulator/data', {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatorData({
          hotelSimulationProfiles: data.hotelSimulationProfiles || [],
          simulationScenarios: data.simulationScenarios || [],
          simulationFinancialData: data.simulationFinancialData || [],
          simulationOperationalData: data.simulationOperationalData || [],
          simulationBusinessChallenges: data.simulationBusinessChallenges || [],
          simulationTasks: data.simulationTasks || [],
          simulationReferenceAnalysis: data.simulationReferenceAnalysis || [],
          simulationDecisionOptions: data.simulationDecisionOptions || [],
          simulationRoleplayPrompts: data.simulationRoleplayPrompts || [],
          simulationEvaluationRubrics: data.simulationEvaluationRubrics || [],
          simulationCompetencyMappings: data.simulationCompetencyMappings || [],
          simulationSessions: data.simulationSessions || [],
        });
      }
    } catch {
      // ignore network error
    }
  }, [currentUser.id, currentUser.role, dataSourceMode, refreshFromFirestore]);

  useEffect(() => {
    if (dataSourceMode !== 'firestore' || !auth.currentUser?.emailVerified) {
      refreshSimulatorData();
    }
  }, [refreshSimulatorData, dataSourceMode]);

  const refreshScenarioGovernance = useCallback(async () => {
    if (dataSourceMode === 'firestore' && auth.currentUser?.emailVerified) {
      await refreshFromFirestore('firestore');
      return;
    }
    const isSupOrAdmin = ['super_admin', 'lnd_manager', 'financial_controller', 'general_manager'].includes(
      currentUser.role
    );
    if (!isSupOrAdmin) {
      setScenarioVersions([]);
      setScenarioImportJobs([]);
      setScenarioCompetencyMappings([]);
      return;
    }
    try {
      const headers = { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role };
      const verRes = await fetch('/api/simulator/versions', { headers });
      if (verRes.ok) {
        const d = await verRes.json();
        setScenarioVersions(Array.isArray(d.versions) ? d.versions : []);
      }
      if (['super_admin', 'lnd_manager'].includes(currentUser.role)) {
        const [jobsRes, mapRes] = await Promise.all([
          fetch('/api/simulator/import-jobs', { headers }),
          fetch('/api/simulator/competency-mappings', { headers }),
        ]);
        if (jobsRes.ok) {
          const jd = await jobsRes.json();
          setScenarioImportJobs(Array.isArray(jd.jobs) ? jd.jobs : []);
        }
        if (mapRes.ok) {
          const md = await mapRes.json();
          setScenarioCompetencyMappings(Array.isArray(md.mappings) ? md.mappings : []);
        }
      }
    } catch {
      // ignore offline
    }
  }, [currentUser.id, currentUser.role, dataSourceMode, refreshFromFirestore]);

  useEffect(() => {
    if (dataSourceMode !== 'firestore' || !auth.currentUser?.emailVerified) {
      refreshScenarioGovernance();
    }
  }, [refreshScenarioGovernance, dataSourceMode]);

  useEffect(() => {
    const unsub = subscribeFirebaseAuth(async (user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified) {
        const profile = await resolveAuthenticatedUserProfile(user);
        if (profile && isUserDisabledRecord(profile)) {
          await signOutFirebase().catch(() => {});
          setFirebaseProfile(null);
          showToast(
            language === 'vi'
              ? 'Tài khoản của bạn đã bị vô hiệu hóa bởi quản trị viên.'
              : 'Your account has been disabled by an administrator.',
            'error'
          );
          return;
        }
        setFirebaseProfile(profile);
        if (!systemConfigRef.current.demoModeEnabled && dataSourceMode !== 'firestore') {
          setDataSourceMode('firestore');
        }
        // Bridge verified Firebase account to a signed Academy Server session so /api/billing & /api/users work seamlessly
        try {
          const idToken = await user.getIdToken();
          const exRes = await fetch('/api/auth/firebase-exchange', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              name: profile?.name || user.displayName || undefined,
              role: profile?.role,
              position: profile?.position,
              property: profile?.property,
            }),
          });
          if (exRes.ok) {
            const exData = await exRes.json().catch(() => ({}));
            if (exData.token) {
              setServerAuthToken(exData.token);
              try {
                sessionStorage.setItem('fc_server_auth_token', exData.token);
              } catch {
                // ignore storage failure
              }
            }
          }
        } catch {
          // non-blocking bridge
        }
        await refreshFromFirestore();
      } else {
        setFirebaseProfile(null);
      }
    });
    return () => unsub();
  }, [language, refreshFromFirestore, showToast]);

  const prevDataSourceModeRef = useRef<'demo' | 'firestore'>(dataSourceMode);

  useEffect(() => {
    document.documentElement.lang = language === 'vi' ? 'vi' : 'en';
  }, [language]);

  useEffect(() => {
    const prevMode = prevDataSourceModeRef.current;
    prevDataSourceModeRef.current = dataSourceMode;

    // Only reset demo catalog/users when explicitly switching BACK from firestore -> demo.
    // Switching persona inside demo mode must NOT wipe runtime-created users/competencies
    // or double-fire simulator/talent/governance refreshes (which have their own effects).
    if (dataSourceMode === 'demo' && prevMode !== 'demo') {
      setUsers(INITIAL_USERS);
      setCurrentUserState((prev) =>
        INITIAL_USERS.find((u) => u.id === prev.id) ||
        INITIAL_USERS.find((u) => u.id === 'user_learner1') ||
        INITIAL_USERS[0]
      );
      setDomains(COMPETENCY_DOMAINS);
      setCourses(COURSES);
      setLearningPaths(LEARNING_PATHS);
      setOjtAssignments(OJT_ASSIGNMENTS);
      setCompetencies(COMPETENCIES);
      refreshSimulatorData();
      refreshSimulatorWorkspace();
      refreshTalentData();
      refreshScenarioGovernance();
    } else if (dataSourceMode === 'firestore' && prevMode !== 'firestore' && auth.currentUser?.emailVerified) {
      refreshFromFirestore('firestore');
    }
  }, [
    dataSourceMode,
    refreshFromFirestore,
    refreshSimulatorData,
    refreshSimulatorWorkspace,
    refreshTalentData,
    refreshScenarioGovernance,
  ]);

  const isLiveFirestoreMode = useCallback(
    (): boolean => dataSourceMode === 'firestore' && Boolean(auth.currentUser?.emailVerified),
    [dataSourceMode]
  );

  const transitionScenarioStatus = async (
    scenarioId: string,
    status: SimulationScenarioStatus,
    note?: string
  ): Promise<boolean> => {
    try {
      const liveMode = isLiveFirestoreMode();
      let updatedScenarioPatch: Partial<SimulationScenarioDoc> = {};

      if (!liveMode) {
        const res = await fetch(`/api/simulator/scenarios/${encodeURIComponent(scenarioId)}/status`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ status, note }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          showToast(d.error || 'Failed to update scenario status.', 'error');
          return false;
        }
        const d = await res.json();
        updatedScenarioPatch = d.scenario || {};
      } else {
        // Live Firestore Mode: validate directly in client and commit atomically
        const scn = simulatorData.simulationScenarios.find((s) => s.id === scenarioId);
        if (!scn) {
          showToast('Scenario not found in Firestore workspace.', 'error');
          return false;
        }
        const now = new Date().toISOString();
        await publishSimulationScenarioInFirestore(scenarioId, status, currentUser.name);

        const verId = `scnver_${scenarioId}_v${Number(scn.versionNumber || 1)}_${Date.now()}`;
        const verDoc: ScenarioVersionDoc = {
          id: verId,
          scenarioId,
          scenarioCode: scn.scenarioCode || scenarioId,
          versionNumber: Number(scn.versionNumber || 1),
          datasetVersion: scn.datasetVersion || '2026.v1',
          status,
          isActive: status === 'Published',
          changeSummary: note || `Lifecycle transition to ${status} in Production Firestore`,
          createdBy: currentUser.name,
          createdAt: now,
        };
        await writeScenarioVersionToFirestore(verDoc);

        const logId = `simaud_${Date.now()}`;
        await syncRecordToFirestore(
          'simulationAuditLogs',
          logId,
          {
            id: logId,
            action: `SCENARIO_STATUS_${status.toUpperCase()}`,
            actorId: auth.currentUser!.uid,
            actorName: currentUser.name,
            actorRole: currentUser.role,
            scenarioId,
            detail: note || `Changed ${scn.scenarioCode || scenarioId} status to ${status}`,
            timestamp: now,
          },
          true
        );

        // Best-effort local mirror if backend has it
        fetch(`/api/simulator/scenarios/${encodeURIComponent(scenarioId)}/status`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ status, note }),
        }).catch(() => {});
      }

      if (!liveMode && auth.currentUser?.emailVerified) {
        await publishSimulationScenarioInFirestore(scenarioId, status, currentUser.name);
      }

      setSimulatorData((prev) => ({
        ...prev,
        simulationScenarios: prev.simulationScenarios.map((s) =>
          s.id === scenarioId
            ? {
                ...s,
                ...updatedScenarioPatch,
                status,
                isActive: status === 'Published',
              }
            : s
        ),
      }));
      if (liveMode) {
        await refreshFromFirestore('firestore');
      } else {
        refreshScenarioGovernance();
        refreshSimulatorWorkspace();
      }
      showToast(
        language === 'vi'
          ? `Đã chuyển trạng thái kịch bản sang ${status}.`
          : `Scenario status set to ${status}.`,
        'success'
      );
      return true;
    } catch (err: any) {
      showToast(err?.message || 'Error updating scenario status.', 'error');
      return false;
    }
  };

  const toggleScenarioPublish = transitionScenarioStatus;

  const buildFirestoreSessionPayload = (doc: SimulationSessionDoc, employeeUid: string): Record<string, any> => ({
    id: doc.id,
    scenarioId: doc.scenarioId,
    scenarioTitle: doc.scenarioTitle || doc.scenarioId,
    hotelSimulationId: doc.hotelSimulationId,
    employeeId: doc.employeeId || currentUser.id,
    employeeUid,
    language: doc.language,
    difficulty: doc.difficulty,
    currentStep: doc.currentStep,
    datasetVersion: doc.datasetVersion,
    versionNumber: doc.versionNumber,
    datasetSnapshot: doc.datasetSnapshot,
    analysisNotes: doc.analysisNotes,
    analysisWorkspace: doc.analysisWorkspace,
    decisionWorkspace: doc.decisionWorkspace,
    executiveReport: doc.executiveReport,
    roleplayConfig: doc.roleplayConfig,
    selectedOptionIds: Array.isArray(doc.selectedOptionIds) ? doc.selectedOptionIds : [],
    learnerAnalysis: typeof doc.learnerAnalysis === 'string' ? doc.learnerAnalysis : '',
    conversation: Array.isArray(doc.conversation) ? doc.conversation : [],
    evaluation: doc.evaluation,
    evaluationId: doc.evaluationId,
    finalScore: doc.finalScore,
    competencyResults: doc.competencyResults,
    feedbackSummary: doc.feedbackSummary,
    evidenceUrl: doc.evidenceUrl,
    status: doc.status === 'completed' ? 'completed' : 'in_progress',
    startedAt: doc.startedAt || new Date().toISOString(),
    submittedAt: doc.submittedAt,
    completedAt: doc.completedAt,
    updatedAt: new Date().toISOString(),
  });

  const saveSimulationSession = async (
    payload: Partial<SimulationSessionDoc> & { scenarioId: string }
  ): Promise<SimulationSessionDoc | null> => {
    try {
      const liveMode = isLiveFirestoreMode();
      let saved: SimulationSessionDoc | null = null;

      if (!liveMode) {
        const res = await fetch('/api/simulator/sessions', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Failed to save simulation session.', 'error');
          return null;
        }
        saved = data.session;
      } else {
        const scenario = simulatorData.simulationScenarios.find((s) => s.id === payload.scenarioId);
        const now = new Date().toISOString();
        const existing = payload.id
          ? simulatorData.simulationSessions.find((s) => s.id === payload.id)
          : undefined;
        const sessionId = existing?.id || payload.id || `simsess_${Date.now()}`;
        saved = {
          ...(existing || {}),
          ...payload,
          id: sessionId,
          scenarioId: payload.scenarioId,
          scenarioTitle:
            payload.scenarioTitle || existing?.scenarioTitle || scenario?.titleEn || payload.scenarioId,
          hotelSimulationId: payload.hotelSimulationId || existing?.hotelSimulationId || scenario?.hotelId,
          employeeId: existing?.employeeId || payload.employeeId || currentUser.id,
          employeeUid: auth.currentUser!.uid,
          selectedOptionIds:
            payload.selectedOptionIds ||
            payload.decisionWorkspace?.selectedOptionIds ||
            existing?.selectedOptionIds ||
            [],
          learnerAnalysis:
            payload.learnerAnalysis ??
            payload.analysisWorkspace?.significantVariances ??
            existing?.learnerAnalysis ??
            '',
          conversation: payload.conversation || existing?.conversation || [],
          status: payload.status === 'completed' ? 'completed' : 'in_progress',
          startedAt: existing?.startedAt || payload.startedAt || now,
          updatedAt: now,
        } as SimulationSessionDoc;

        await syncRecordToFirestore(
          'simulationSessions',
          saved.id,
          buildFirestoreSessionPayload(saved, auth.currentUser!.uid),
          true
        );
      }

      if (!liveMode && auth.currentUser?.emailVerified && saved?.id) {
        await syncRecordToFirestore(
          'simulationSessions',
          saved.id,
          buildFirestoreSessionPayload(saved, auth.currentUser.uid),
          true
        ).catch(() => {});
      }

      if (saved) {
        setSimulatorData((prev) => ({
          ...prev,
          simulationSessions: [
            saved!,
            ...prev.simulationSessions.filter((s) => s.id !== saved!.id),
          ],
        }));
      }
      return saved;
    } catch (err: any) {
      showToast(err?.message || 'Failed to save simulation session.', 'error');
      return null;
    }
  };

  const evaluateSimulationSession = async (
    sessionId: string,
    payload: {
      analysisWorkspace?: any;
      decisionWorkspace?: any;
      executiveReport?: any;
      conversation?: any[];
      language?: 'vi' | 'en';
    }
  ) => {
    try {
      const liveMode = isLiveFirestoreMode();
      let savedSession: SimulationSessionDoc | null = null;
      let evalDoc: SimulationEvaluationDoc | null = null;
      let aiFallbackUsed = false;

      // Try server AI+deterministic evaluator first
      try {
        const res = await fetch(`/api/simulator/sessions/${encodeURIComponent(sessionId)}/evaluate`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          savedSession = data.session;
          evalDoc = data.evaluation;
          aiFallbackUsed = Boolean(data.aiFallbackUsed);
        } else if (!liveMode) {
          showToast(data.error || 'Failed to evaluate simulation session.', 'error');
          return null;
        }
      } catch (fetchErr) {
        if (!liveMode) throw fetchErr;
      }

      // In Live Firestore Mode, fallback deterministically for Firestore-only scenarios/sessions
      if (liveMode && (!savedSession || !evalDoc)) {
        const sess = simulatorData.simulationSessions.find((s) => s.id === sessionId);
        if (!sess) {
          showToast('Simulation session not found in Firestore.', 'error');
          return null;
        }
        const scenario = simulatorData.simulationScenarios.find((s) => s.id === sess.scenarioId);
        if (!scenario) {
          showToast('Scenario definition missing in Firestore.', 'error');
          return null;
        }
        const hotel = simulatorData.hotelSimulationProfiles.find((h) => h.id === scenario.hotelId);
        const scnFin = simulatorData.simulationFinancialData.filter((f) => f.scenarioId === scenario.id);
        const scnOps = simulatorData.simulationOperationalData.filter((o) => o.scenarioId === scenario.id);
        const snapshot =
          simulatorWorkspace.datasets[scenario.id] ||
          generateDatasetSnapshotForScenario(scenario, hotel, undefined, scnFin, scnOps);
        const decisionOptions = simulatorData.simulationDecisionOptions.filter((o) => o.scenarioId === scenario.id);
        const rubrics = simulatorData.simulationEvaluationRubrics.filter((r) => r.scenarioId === scenario.id);

        const evalOut = evaluateDeterministicSimulation({
          scenario,
          datasetSnapshot: snapshot,
          analysisWorkspace: payload.analysisWorkspace || sess.analysisWorkspace,
          decisionWorkspace: payload.decisionWorkspace || sess.decisionWorkspace,
          executiveReport: payload.executiveReport || sess.executiveReport,
          decisionOptions,
          rubrics,
          conversation: payload.conversation || sess.conversation || [],
          courses,
          ojtAssignments,
          competencies,
          language: payload.language || language,
        });

        const now = new Date().toISOString();
        const evalId = `simeval_${Date.now()}`;
        evalDoc = {
          id: evalId,
          sessionId,
          scenarioId: scenario.id,
          learnerId: sess.employeeId || currentUser.id,
          learnerUid: auth.currentUser!.uid,
          totalScore: evalOut.totalScore,
          scoringCriteria: evalOut.scoringCriteria,
          strengths: evalOut.strengths,
          improvementAreas: evalOut.improvementAreas,
          missedOpportunities: evalOut.missedOpportunities,
          calculationErrors: evalOut.calculationErrors,
          recommendations: evalOut.recommendations,
          recommendedCompetencies: evalOut.recommendedCompetencies,
          recommendedCourseIds: evalOut.recommendedCourseIds,
          recommendedPracticalIds: evalOut.recommendedPracticalIds,
          suggestedIdpObjectives: evalOut.suggestedIdpObjectives,
          advisoryDisclaimer:
            language === 'vi'
              ? 'Kết quả đánh giá tự động phục vụ cố vấn học tập; cấp quản lý/L&D có quyền thẩm định cuối cùng.'
              : 'Deterministic simulation score advisory; subject to human assessor confirmation.',
          assessorType: 'deterministic_plus_ai',
          createdAt: now,
        };

        savedSession = {
          ...sess,
          analysisWorkspace: payload.analysisWorkspace || sess.analysisWorkspace,
          decisionWorkspace: payload.decisionWorkspace || sess.decisionWorkspace,
          executiveReport: payload.executiveReport || sess.executiveReport,
          conversation: payload.conversation || sess.conversation || [],
          evaluationId: evalId,
          finalScore: evalOut.totalScore,
          feedbackSummary: evalOut.recommendations.join(' '),
          status: 'completed',
          submittedAt: now,
          completedAt: now,
          updatedAt: now,
        };
        aiFallbackUsed = true;
      }

      if (!savedSession || !evalDoc) return null;

      if (auth.currentUser?.emailVerified) {
        await syncRecordToFirestore(
          'simulationSessions',
          savedSession.id,
          buildFirestoreSessionPayload(savedSession, auth.currentUser.uid),
          true
        );
        await syncRecordToFirestore(
          'simulationEvaluations',
          evalDoc.id,
          { ...evalDoc, learnerUid: auth.currentUser.uid },
          true
        );
      }

      await Promise.all([refreshSimulatorData(), refreshSimulatorWorkspace()]);
      showToast(
        language === 'vi'
          ? `Đã chấm điểm phiên mô phỏng: ${evalDoc.totalScore}/100.`
          : `Simulation evaluated: ${evalDoc.totalScore}/100.`,
        'success'
      );
      return {
        session: savedSession,
        evaluation: evalDoc,
        aiFallbackUsed,
      };
    } catch (err: any) {
      showToast(err?.message || 'Simulation evaluation failed.', 'error');
      return null;
    }
  };

  const reviewSimulationEvaluation = async (
    evaluationId: string,
    payload: {
      adjustedTotalScore?: number;
      criterionAdjustments?: Record<string, number>;
      adjustmentReason: string;
      assessorComments?: string;
    }
  ): Promise<SimulationEvaluationDoc | null> => {
    try {
      const liveMode = isLiveFirestoreMode();
      let updatedEval: SimulationEvaluationDoc | null = null;

      try {
        const res = await fetch(`/api/simulator/evaluations/${encodeURIComponent(evaluationId)}/review`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          updatedEval = data.evaluation;
        } else if (!liveMode) {
          showToast(data.error || 'Assessor review denied.', 'error');
          return null;
        }
      } catch (err) {
        if (!liveMode) throw err;
      }

      if (liveMode && !updatedEval) {
        const existing = simulatorWorkspace.evaluations.find((e) => e.id === evaluationId);
        if (!existing) {
          showToast('Evaluation record not found in Firestore.', 'error');
          return null;
        }
        const adjustedCriteria = existing.scoringCriteria.map((c) => {
          const override = payload.criterionAdjustments?.[c.criterionCode];
          return override !== undefined ? { ...c, score: Number(override) } : c;
        });
        const nextTotal =
          payload.adjustedTotalScore !== undefined
            ? Number(payload.adjustedTotalScore)
            : adjustedCriteria.reduce((acc, c) => acc + (c.score * c.weightPercent) / 100, 0);

        updatedEval = {
          ...existing,
          scoringCriteria: adjustedCriteria,
          adjustedTotalScore: Math.round(nextTotal),
          assessorType: 'human_reviewed',
          assessorComments: payload.assessorComments,
          adjustmentReason: payload.adjustmentReason,
          reviewerId: auth.currentUser?.uid || currentUser.id,
          reviewerName: currentUser.name,
          reviewedAt: new Date().toISOString(),
        };
      }

      if (!updatedEval) return null;

      if (auth.currentUser?.emailVerified) {
        await syncRecordToFirestore('simulationEvaluations', updatedEval.id, updatedEval, true);
      }
      await Promise.all([refreshSimulatorData(), refreshSimulatorWorkspace()]);
      showToast(
        language === 'vi'
          ? 'Đã lưu điều chỉnh điểm và nhận xét của Người đánh giá.'
          : 'Human assessor score adjustment saved.',
        'success'
      );
      return updatedEval;
    } catch (err: any) {
      showToast(err?.message || 'Failed to save assessor review.', 'error');
      return null;
    }
  };

  const assignSimulatorScenario = async (payload: {
    scenarioId: string;
    learnerId: string;
    dueDate: string;
    mandatory?: boolean;
    note?: string;
  }): Promise<SimulationAssignmentDoc | null> => {
    try {
      const liveMode = isLiveFirestoreMode();
      let assignment: SimulationAssignmentDoc | null = null;

      if (!liveMode) {
        const res = await fetch('/api/simulator/assignments', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Failed to assign simulation.', 'error');
          return null;
        }
        assignment = data.assignment;
      } else {
        const createdAssignment: SimulationAssignmentDoc = {
          id: `simasn_${Date.now()}`,
          scenarioId: payload.scenarioId,
          learnerId: payload.learnerId,
          dueDate: payload.dueDate,
          mandatory: Boolean(payload.mandatory),
          note: payload.note || '',
          assignedById: auth.currentUser!.uid,
          assignedByName: currentUser.name,
          assignedAt: new Date().toISOString(),
          status: 'assigned',
        };
        assignment = createdAssignment;
        await syncRecordToFirestore('simulationAssignments', createdAssignment.id, createdAssignment, true);
      }

      if (!liveMode && auth.currentUser?.emailVerified && assignment?.id) {
        syncRecordToFirestore('simulationAssignments', assignment.id, assignment, true).catch(() => {});
      }
      await refreshSimulatorWorkspace();
      showToast(
        language === 'vi' ? 'Đã giao kịch bản mô phỏng cho học viên.' : 'Simulation scenario assigned to learner.',
        'success'
      );
      return assignment;
    } catch (err: any) {
      showToast(err?.message || 'Failed to assign scenario.', 'error');
      return null;
    }
  };

  const upsertSimulatorScenario = async (
    payload: any,
    existingId?: string
  ): Promise<SimulationScenarioDoc | null> => {
    try {
      const liveMode = isLiveFirestoreMode();
      let scenarioDoc: SimulationScenarioDoc | null = null;
      let datasetDoc: HotelSimulationDatasetSnapshot | null = null;

      try {
        const url = existingId
          ? `/api/simulator/scenarios/${encodeURIComponent(existingId)}`
          : '/api/simulator/scenarios';
        const res = await fetch(url, {
          method: existingId ? 'PUT' : 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          scenarioDoc = data.scenario;
          datasetDoc = data.dataset || null;
        } else if (!liveMode) {
          showToast(data.error || 'Failed to save scenario.', 'error');
          return null;
        }
      } catch (err) {
        if (!liveMode) throw err;
      }

      if (liveMode && !scenarioDoc) {
        const now = new Date().toISOString();
        const existing = existingId
          ? simulatorData.simulationScenarios.find((s) => s.id === existingId)
          : undefined;
        const nextId = existing?.id || payload.id || `sim_scn_${Date.now()}`;
        const nextVer = (Number(existing?.versionNumber || 0) || 0) + 1;
        scenarioDoc = {
          ...(existing || {}),
          id: nextId,
          scenarioCode: payload.scenarioCode || existing?.scenarioCode || nextId.toUpperCase(),
          hotelId: payload.hotelId || existing?.hotelId || simulatorData.hotelSimulationProfiles[0]?.id || 'hotel_01',
          titleEn: payload.titleEn || existing?.titleEn || 'Untitled Scenario',
          titleVi: payload.titleVi || existing?.titleVi || payload.titleEn || 'Kịch bản mới',
          summaryEn: payload.summaryEn || existing?.summaryEn || '',
          summaryVi: payload.summaryVi || existing?.summaryVi || '',
          category: payload.category || existing?.category || 'Financial Control',
          difficultyLevel: Number(payload.difficultyLevel || existing?.difficultyLevel || 2) as 1 | 2 | 3 | 4,
          targetRole: payload.targetRole || existing?.targetRole || 'Financial Controller',
          periodLabel: payload.periodLabel || existing?.periodLabel || '2026-Q1',
          competencyIds: payload.competencyIds || existing?.competencyIds || [],
          status: payload.status || existing?.status || 'Draft',
          isActive: (payload.status || existing?.status || 'Draft') === 'Published',
          datasetVersion: payload.datasetVersion || existing?.datasetVersion || `2026.v${nextVer}`,
          versionNumber: nextVer,
          importedAt: existing?.importedAt || now,
          importBatchId: existing?.importBatchId || `manual_${Date.now()}`,
          updatedAt: now,
        } as SimulationScenarioDoc;
        const hotel = simulatorData.hotelSimulationProfiles.find((h) => h.id === scenarioDoc!.hotelId);
        datasetDoc = generateDatasetSnapshotForScenario(scenarioDoc, hotel);
      }

      if (!scenarioDoc) return null;

      if (auth.currentUser?.emailVerified) {
        await syncRecordToFirestore('simulationScenarios', scenarioDoc.id, scenarioDoc, true);
        if (datasetDoc) {
          await syncRecordToFirestore(
            'simulationDatasets',
            datasetDoc.datasetId || scenarioDoc.id,
            { ...datasetDoc, scenarioId: scenarioDoc.id },
            true
          ).catch(() => {});
        }
        await writeScenarioVersionToFirestore({
          id: `scnver_${scenarioDoc.id}_v${Number(scenarioDoc.versionNumber || 1)}_${Date.now()}`,
          scenarioId: scenarioDoc.id,
          scenarioCode: scenarioDoc.scenarioCode,
          versionNumber: Number(scenarioDoc.versionNumber || 1),
          datasetVersion: scenarioDoc.datasetVersion || '2026.v1',
          status: scenarioDoc.status,
          isActive: scenarioDoc.status === 'Published',
          changeSummary: existingId ? 'Updated scenario metadata & USALI dataset' : 'Created simulation scenario',
          createdBy: currentUser.name,
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      }

      await Promise.all([refreshSimulatorData(), refreshSimulatorWorkspace()]);
      showToast(
        language === 'vi' ? 'Đã lưu kịch bản mô phỏng & bộ dữ liệu USALI.' : 'Scenario & USALI dataset saved.',
        'success'
      );
      return scenarioDoc;
    } catch (err: any) {
      showToast(err?.message || 'Failed to save scenario.', 'error');
      return null;
    }
  };

  const upsertHotelProfile = async (payload: any): Promise<HotelSimulationProfileDoc | null> => {
    try {
      const liveMode = isLiveFirestoreMode();
      let profileDoc: HotelSimulationProfileDoc | null = null;

      if (!liveMode) {
        const res = await fetch('/api/simulator/hotel-profiles', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Failed to save hotel profile.', 'error');
          return null;
        }
        profileDoc = data.profile;
      } else {
        const now = new Date().toISOString();
        const id = payload.id || `hotel_${Date.now()}`;
        profileDoc = {
          id,
          hotelCode: payload.hotelCode || id.toUpperCase(),
          hotelName: payload.hotelName || 'New Simulation Hotel',
          brandTier: payload.brandTier || '5-Star Luxury Resort',
          city: payload.city || 'Ho Chi Minh City',
          roomsAvailable: Number(payload.roomsAvailable || Number(payload.totalKeys || 250) * 30),
          totalKeys: Number(payload.totalKeys || 250),
          fcPositionLevel: payload.fcPositionLevel || 'Financial Controller',
          currency: payload.currency || 'USD',
          importedAt: payload.importedAt || now,
          importBatchId: payload.importBatchId || `manual_${Date.now()}`,
        } as HotelSimulationProfileDoc;
        await syncRecordToFirestore('hotelSimulationProfiles', profileDoc.id, profileDoc, true);
      }

      if (!liveMode && auth.currentUser?.emailVerified && profileDoc?.id) {
        syncRecordToFirestore('hotelSimulationProfiles', profileDoc.id, profileDoc, true).catch(() => {});
      }
      await refreshSimulatorData();
      showToast(
        language === 'vi' ? 'Đã lưu hồ sơ khách sạn mô phỏng.' : 'Hotel simulation profile saved.',
        'success'
      );
      return profileDoc;
    } catch (err: any) {
      showToast(err?.message || 'Failed to save hotel profile.', 'error');
      return null;
    }
  };

  const launchSimulationWorkspace = useCallback(
    (scenarioId: string, subTab = 'simWorkspace', sessionId: string | null = null) => {
      setSelectedSimulatorScenarioId(scenarioId);
      setActiveSimulatorSessionId(sessionId);
      setActiveTab(subTab);
    },
    []
  );

  const enrollCourse = async (courseId: string) => {
    const existing = enrollments.find((e) => e.userId === currentUser.id && e.courseId === courseId);
    if (existing) return;

    const optimistic: CourseEnrollment = {
      id: `enr_${Date.now()}`,
      userId: currentUser.id,
      courseId,
      progressPercent: 0,
      completedModules: [],
      status: 'in_progress',
      enrolledDate: new Date().toISOString().split('T')[0],
    };
    setEnrollments((prev) => [optimistic, ...prev]);

    let finalEnrollment = optimistic;
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ userId: currentUser.id, courseId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enrollment) {
          finalEnrollment = data.enrollment;
          setEnrollments((prev) => [
            data.enrollment,
            ...prev.filter((e) => !(e.userId === currentUser.id && e.courseId === courseId)),
          ]);
        }
      }
    } catch (e) {
      console.warn('Enrollment local fallback:', e);
    }

    if (auth.currentUser?.emailVerified) {
      try {
        await syncRecordToFirestore('enrollments', finalEnrollment.id, {
          ...finalEnrollment,
          employeeUid: auth.currentUser.uid,
          updatedAt: new Date().toISOString(),
        });
      } catch (fsErr: any) {
        if (isLiveFirestoreMode()) {
          showToast(fsErr?.message || 'Failed to sync enrollment to Firestore.', 'error');
        }
      }
    }
  };

  const updateCourseProgress = async (courseId: string, moduleId: string) => {
    let computedEnrollment: CourseEnrollment | null = null;
    setEnrollments((prev) => {
      const exists = prev.some((e) => e.userId === currentUser.id && e.courseId === courseId);
      const list = exists
        ? prev
        : [
            {
              id: `enr_${Date.now()}`,
              userId: currentUser.id,
              courseId,
              progressPercent: 0,
              completedModules: [],
              status: 'in_progress' as const,
              enrolledDate: new Date().toISOString().split('T')[0],
            },
            ...prev,
          ];
      return list.map((enr) => {
        if (enr.userId === currentUser.id && enr.courseId === courseId) {
          const completed = enr.completedModules.includes(moduleId)
            ? enr.completedModules
            : [...enr.completedModules, moduleId];
          const course = courses.find((c) => c.id === courseId) || COURSES.find((c) => c.id === courseId);
          const totalModules = Math.max(1, course?.modules?.length || 1);
          const percent = Math.min(100, Math.round((completed.length / totalModules) * 100));
          computedEnrollment = {
            ...enr,
            completedModules: completed,
            progressPercent: percent,
            status: percent === 100 ? 'completed' : 'in_progress',
            completedDate: percent === 100 ? new Date().toISOString().split('T')[0] : enr.completedDate,
          };
          return computedEnrollment;
        }
        return enr;
      });
    });

    try {
      const res = await fetch('/api/enrollments/progress', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ userId: currentUser.id, courseId, moduleId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enrollment) {
          computedEnrollment = data.enrollment;
          setEnrollments((prev) =>
            prev.map((e) => (e.userId === currentUser.id && e.courseId === courseId ? data.enrollment : e))
          );
        }
      }
    } catch (e) {
      console.warn('Progress saved locally:', e);
    }

    if (auth.currentUser?.emailVerified && computedEnrollment) {
      try {
        await syncRecordToFirestore('enrollments', (computedEnrollment as CourseEnrollment).id, {
          ...(computedEnrollment as CourseEnrollment),
          employeeUid: auth.currentUser.uid,
          updatedAt: new Date().toISOString(),
        });
      } catch (fsErr: any) {
        if (isLiveFirestoreMode()) {
          showToast(fsErr?.message || 'Failed to save course progress to Firestore.', 'error');
        }
      }
    }
  };

  const submitQuizAttempt = async (
    courseId: string | undefined,
    quizTitle: string,
    score: number,
    total: number,
    passed: boolean,
    answers: Record<string, any>
  ) => {
    const newAttempt: QuizAttempt = {
      id: `qa_${Date.now()}`,
      userId: currentUser.id,
      courseId,
      quizTitle,
      score,
      totalQuestions: total,
      passed,
      date: new Date().toISOString().split('T')[0],
      answers,
    };
    setQuizAttempts((prev) => [newAttempt, ...prev]);

    let updatedEnrForCourse: CourseEnrollment | null = null;
    if (courseId) {
      setEnrollments((prev) =>
        prev.map((e) => {
          if (e.userId === currentUser.id && e.courseId === courseId) {
            updatedEnrForCourse = { ...e, quizScore: Math.max(e.quizScore || 0, score) };
            return updatedEnrForCourse;
          }
          return e;
        })
      );
    }

    let persistedAttempt = newAttempt;
    try {
      const res = await fetch('/api/quizzes/attempt', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: currentUser.id,
          courseId,
          quizTitle,
          score,
          totalQuestions: total,
          passed,
          answers,
        }),
      });
      if (res.ok) {
        const qData = await res.json();
        if (qData.attempt?.id) persistedAttempt = qData.attempt;
      }
    } catch (e) {
      console.warn('Quiz attempt saved locally:', e);
    }

    if (auth.currentUser?.emailVerified) {
      try {
        await syncRecordToFirestore('quizAttempts', persistedAttempt.id, {
          ...persistedAttempt,
          employeeUid: auth.currentUser.uid,
        });
        if (updatedEnrForCourse) {
          await syncRecordToFirestore('enrollments', (updatedEnrForCourse as CourseEnrollment).id, {
            ...(updatedEnrForCourse as CourseEnrollment),
            employeeUid: auth.currentUser.uid,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (fsErr: any) {
        if (isLiveFirestoreMode()) {
          showToast(fsErr?.message || 'Failed to sync quiz attempt to Firestore.', 'error');
        }
      }
    }
  };

  const submitAssignment = async (
    assignmentId: string,
    notes: string,
    fileName?: string,
    aiResult?: any
  ) => {
    const newSub: AssignmentSubmission = {
      id: `sub_${Date.now()}`,
      assignmentId,
      userId: currentUser.id,
      submittedDate: new Date().toISOString().split('T')[0],
      status: aiResult?.passed ? 'approved' : 'submitted',
      submissionNotes: notes,
      fileName: fileName || 'FC_OJT_Deliverable_Workbook.xlsx',
      fileSize: '3.1 MB',
      score: aiResult?.score,
      feedback: aiResult?.feedback,
      reviewedBy: aiResult ? 'AI Preliminary Evaluator (Gemini 4 Hydrogen)' : undefined,
      reviewedDate: aiResult ? new Date().toISOString().split('T')[0] : undefined,
      aiGraded: !!aiResult,
    };
    setSubmissions((prev) => [newSub, ...prev]);

    let finalSub = newSub;
    try {
      const res = await fetch('/api/ojt/submit', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          assignmentId,
          userId: currentUser.id,
          notes,
          fileName,
          aiResult,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.submission) {
          finalSub = data.submission;
          setSubmissions((prev) => [data.submission, ...prev.filter((s) => s.id !== newSub.id)]);
        }
        refreshAuditLogs();
      }
    } catch (e) {
      console.warn('OJT submission persisted locally:', e);
    }

    if (auth.currentUser?.emailVerified) {
      try {
        await syncRecordToFirestore('practicalSubmissions', finalSub.id, {
          ...finalSub,
          employeeUid: auth.currentUser.uid,
        });
      } catch (fsErr: any) {
        if (isLiveFirestoreMode()) {
          showToast(fsErr?.message || 'Failed to sync assignment submission to Firestore.', 'error');
        }
      }
    }
  };

  const gradeAssignment = async (
    submissionId: string,
    score: number,
    feedback: string,
    status: 'approved' | 'revision_requested'
  ) => {
    let gradedSub: (AssignmentSubmission & { employeeUid?: string }) | null = null;
    const reviewedDate = new Date().toISOString().split('T')[0];

    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id === submissionId) {
          gradedSub = {
            ...s,
            score,
            feedback,
            status,
            reviewedBy: currentUser.name,
            reviewedDate,
          };
          return gradedSub;
        }
        return s;
      })
    );

    try {
      const res = await fetch('/api/ojt/grade', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          submissionId,
          score,
          feedback,
          status,
          reviewedBy: currentUser.name,
        }),
      });
      if (res.ok) {
        refreshAuditLogs();
      }
    } catch (e) {
      console.warn('OJT grade persisted locally:', e);
    }

    if (auth.currentUser?.emailVerified && gradedSub) {
      try {
        await syncRecordToFirestore('practicalSubmissions', submissionId, {
          ...(gradedSub as AssignmentSubmission & { employeeUid?: string }),
          employeeUid: (gradedSub as any).employeeUid || auth.currentUser.uid,
        });
      } catch (fsErr: any) {
        if (isLiveFirestoreMode()) {
          showToast(fsErr?.message || 'Failed to save OJT grading to Firestore.', 'error');
        }
      }
    }
  };

  const saveCompetency = async (comp: Competency) => {
    setCompetencies((prev) => {
      const idx = prev.findIndex((c) => c.id === comp.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = comp;
        return updated;
      }
      return [...prev, comp];
    });

    try {
      await fetch('/api/competencies', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(comp),
      });
      refreshAuditLogs();
    } catch (e) {
      console.warn('Competency saved locally:', e);
    }

    if (auth.currentUser?.emailVerified && isLiveFirestoreMode()) {
      try {
        const now = new Date().toISOString();
        const targetLvl = Number(
          comp.expectedLevelByPosition?.['Financial Controller'] || 3
        );
        await syncRecordToFirestore('competencies', comp.id, {
          id: comp.id,
          code: comp.code,
          domainId: comp.domainId,
          nameEn: comp.nameEn,
          nameVi: comp.nameVi,
          definitionEn: comp.definitionEn || '',
          definitionVi: comp.definitionVi || '',
          targetLevel: Math.min(4, Math.max(1, targetLvl)),
          importedAt: now,
          importBatchId: `ui_edit_${Date.now()}`,
        });
      } catch (fsErr: any) {
        showToast(fsErr?.message || 'Failed to save competency to Firestore.', 'error');
      }
    }
  };

  const deleteCompetency = async (id: string) => {
    setCompetencies((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`/api/competencies/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      refreshAuditLogs();
    } catch (e) {
      console.warn('Competency deleted locally:', e);
    }

    if (auth.currentUser?.emailVerified && isLiveFirestoreMode()) {
      try {
        await deleteRecordFromFirestore('competencies', id);
      } catch (fsErr: any) {
        showToast(fsErr?.message || 'Failed to delete competency from Firestore.', 'error');
      }
    }
  };

  const saveAssessment = async (record: AssessmentRecord): Promise<AssessmentRecord> => {
    const updatedRecord = {
      ...record,
      id: record.id || `asmt_${Date.now()}`,
      date: record.date || new Date().toISOString().split('T')[0],
    };

    setAssessments((prev) => {
      const idx = prev.findIndex((a) => a.id === updatedRecord.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = updatedRecord;
        return updated;
      }
      return [updatedRecord, ...prev];
    });

    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(updatedRecord),
      });
      if (res.ok) {
        const data = await res.json();
        refreshAuditLogs();
        if (data.record) {
          setAssessments((prev) => prev.map((a) => (a.id === data.record.id ? data.record : a)));
          return data.record;
        }
      }
    } catch (e) {
      console.warn('Persisted locally:', e);
    }

    return updatedRecord;
  };

  const saveIDPPlan = async (plan: IndividualDevelopmentPlan): Promise<void> => {
    setIdps((prev) => {
      const idx = prev.findIndex((i) => i.learnerId === plan.learnerId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = plan;
        return updated;
      }
      return [plan, ...prev];
    });

    try {
      await fetch('/api/idps', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(plan),
      });
    } catch (e) {
      console.warn('IDP saved in local state', e);
    }
  };

  const generateIDPFromGap = async (
    learnerId: string,
    targetPosition?: string,
    approvedBy?: string,
    assessmentId?: string
  ): Promise<IndividualDevelopmentPlan | void> => {
    try {
      const res = await fetch('/api/idps/generate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          learnerId,
          assessmentId,
          targetPosition: targetPosition || 'Assistant Financial Controller (AFC)',
          approvedBy: approvedBy || currentUser.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.idp) {
          setIdps((prev) => [data.idp, ...prev.filter((i) => i.learnerId !== learnerId)]);
          refreshAuditLogs();
          return data.idp;
        }
      }
    } catch (e) {
      console.warn('Generating IDP locally due to network fallback', e);
    }

    const record = assessmentId
      ? assessments.find((a) => a.id === assessmentId)
      : assessments.find((a) => a.learnerId === learnerId);
    if (!record) return;

    const items = Object.entries(record.scores)
      .filter(([_, s]) => s.gap > 0)
      .map(([code, s], idx) => {
        const comp = competencies.find((c) => c.code === code);
        return {
          id: `idp_gen_${idx}_${Date.now()}`,
          competencyId: code,
          priority: (s.gap >= 2 ? 'High' : 'Medium') as 'High' | 'Medium' | 'Low',
          targetDate: new Date(Date.now() + (idx + 1) * 30 * 86400000).toISOString().split('T')[0],
          recommendedCourseIds: comp?.associatedCourseIds || ['course_01'],
          practicalActivity: `Hoàn thành bài tập OJT và tham gia 1 buổi coaching chuyên sâu về ${comp?.nameVi || code}.`,
          practicalActivityEn: `Complete targeted OJT deliverable and 1 executive coaching session on ${comp?.nameEn || code}.`,
          status: 'Not Started' as const,
          mentorNotes: `Tự động tạo từ khoảng trống năng lực (Gap = ${s.gap}).`,
          mentorNotesEn: `Auto-generated from competency gap (Gap = ${s.gap}).`,
        };
      });

    const newIDP: IndividualDevelopmentPlan = {
      id: `idp_${Date.now()}`,
      learnerId,
      createdDate: new Date().toISOString().split('T')[0],
      targetPosition: targetPosition || 'Assistant Financial Controller (AFC)',
      targetCompletionDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      status: 'Active',
      items,
      approvedBy: approvedBy || currentUser.name,
      approvedDate: new Date().toISOString().split('T')[0],
      overallGoal: `Kế hoạch hành động thu hẹp ${items.length} khoảng trống năng lực để bổ nhiệm ${targetPosition || 'AFC'}.`,
      overallGoalEn: `Action plan to close ${items.length} competency gaps for ${targetPosition || 'AFC'} readiness.`,
    };

    await saveIDPPlan(newIDP);
    return newIDP;
  };

  const updateIDPItem = async (
    learnerId: string,
    itemId: string,
    status: 'Not Started' | 'In Progress' | 'Completed',
    evidenceNotes?: string,
    mentorNotes?: string
  ): Promise<void> => {
    const existing = idps.find((i) => i.learnerId === learnerId);
    if (!existing) return;

    const updatedItems = existing.items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          status,
          evidenceNotes: evidenceNotes !== undefined ? evidenceNotes : item.evidenceNotes,
          mentorNotes: mentorNotes !== undefined ? mentorNotes : item.mentorNotes,
          completedDate: status === 'Completed' ? new Date().toISOString().split('T')[0] : item.completedDate,
        };
      }
      return item;
    });

    const allCompleted = updatedItems.length > 0 && updatedItems.every((i) => i.status === 'Completed');

    const updatedPlan: IndividualDevelopmentPlan = {
      ...existing,
      items: updatedItems,
      status: allCompleted ? 'Completed' : 'Active',
    };

    await saveIDPPlan(updatedPlan);
  };

  const createAssessmentCycle = (learnerId: string, cycleName: string): AssessmentRecord => {
    const learner = users.find((u) => u.id === learnerId) || currentUser;
    const initialScores: Record<string, any> = {};

    competencies.forEach((comp) => {
      const targetLvl = learner.targetLevel || 4;
      initialScores[comp.code] = {
        selfLevel: 2,
        supervisorLevel: 2,
        gap: Math.max(0, targetLvl - 2),
        selfNotes: '',
        supervisorNotes: '',
      };
    });

    const newRecord: AssessmentRecord = {
      id: `asmt_${Date.now()}`,
      learnerId,
      supervisorId: currentUser.role === 'learner' ? learner.supervisorId || 'user_fc1' : currentUser.id,
      cycle: cycleName,
      status: 'pending_self',
      date: new Date().toISOString().split('T')[0],
      scores: initialScores,
      overallGapAverage: Math.max(0, (learner.targetLevel || 4) - 2),
      learnerReflection: '',
      supervisorComments: '',
    };

    saveAssessment(newRecord);
    return newRecord;
  };

  const issueCertificate = async (userId: string, level: 1 | 2 | 3 | 4 | 5): Promise<Certificate | null> => {
    try {
      const res = await fetch('/api/certificates/issue', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ userId, level }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Cannot issue certificate', 'error');
        return null;
      }
      if (data.certificate) {
        setCertificates((prev) => [
          data.certificate,
          ...prev.filter((c) => c.id !== data.certificate.id),
        ]);
        setSelectedCertificateForView(data.certificate);
        refreshAuditLogs();
        return data.certificate;
      }
    } catch (e: any) {
      showToast(e.message || 'Certificate issuance failed', 'error');
    }
    return null;
  };

  const addUser = async (userData: Partial<User>): Promise<User | null> => {
    if (isLiveFirestoreMode()) {
      const name = String(userData.name || '').trim();
      const email = String(userData.email || '').trim();
      if (!name || !email) {
        showToast(language === 'vi' ? 'Vui lòng nhập họ tên và email.' : 'Name and email are required.', 'error');
        return null;
      }
      const newUser: User = {
        id: `user_${Date.now()}`,
        name,
        email,
        role: (userData.role || 'learner') as User['role'],
        position: String(userData.position || 'Senior Accountant').trim(),
        department: String(userData.department || 'Finance & Accounting').trim(),
        property: String(userData.property || 'Grand Horizon Saigon Hotel & Residences').trim(),
        avatar:
          userData.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0A192F&color=D4AF37`,
        currentLevel: Math.max(1, Math.min(4, Number(userData.currentLevel) || 2)) as ProficiencyLevel,
        targetLevel: Math.max(1, Math.min(4, Number(userData.targetLevel) || 4)) as ProficiencyLevel,
        joinedDate: new Date().toISOString().split('T')[0],
        careerPathId: userData.careerPathId || 'path_accountant_to_senior',
        supervisorId: userData.supervisorId || 'user_fc1',
      };
      try {
        await syncOfficialUserToFirestore(newUser, true);
        setUsers((prev) => [...prev, newUser]);
        setProductionCounts((prev) => ({
          ...prev,
          userProfiles: (prev.userProfiles || 0) + 1,
        }));
        fetch('/api/users', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(userData),
        }).catch(() => {});
        return newUser;
      } catch (fsErr: any) {
        showToast(fsErr?.message || 'Failed to create official user in Firestore.', 'error');
        return null;
      }
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create user', 'error');
        return null;
      }
      if (data.user) {
        setUsers((prev) => [...prev, data.user]);
        refreshAuditLogs();
        return data.user;
      }
    } catch (e: any) {
      showToast(e.message || 'Network error creating user', 'error');
    }
    return null;
  };

  const updateUser = async (userId: string, updates: Partial<User>): Promise<User | null> => {
    if (isLiveFirestoreMode()) {
      const existing = users.find((u) => u.id === userId) || (currentUser.id === userId ? currentUser : null);
      if (!existing) {
        showToast('User not found in official directory.', 'error');
        return null;
      }
      const merged: User = {
        ...existing,
        ...updates,
        id: userId,
      };
      try {
        await syncOfficialUserToFirestore(merged, Boolean(firebaseProfile?.isAdmin));
        setUsers((prev) => prev.map((u) => (u.id === userId ? merged : u)));
        if (currentUser.id === userId) {
          setCurrentUserState(merged);
        }
        if (firebaseProfile && firebaseUser?.uid === userId) {
          setFirebaseProfile((prev) =>
            prev
              ? {
                  ...prev,
                  name: merged.name,
                  email: merged.email,
                  role: merged.role,
                  position: merged.position,
                  department: merged.department,
                  property: merged.property,
                  currentLevel: merged.currentLevel,
                  targetLevel: merged.targetLevel,
                  careerPathId: merged.careerPathId,
                  updatedAt: new Date().toISOString(),
                }
              : null
          );
        }
        fetch(`/api/users/${encodeURIComponent(userId)}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(updates),
        }).catch(() => {});
        return merged;
      } catch (fsErr: any) {
        showToast(fsErr?.message || 'Failed to update official user in Firestore.', 'error');
        return null;
      }
    }

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update user', 'error');
        return null;
      }
      if (data.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? data.user : u)));
        if (currentUser.id === userId) {
          setCurrentUserState(data.user);
        }
        refreshAuditLogs();
        return data.user;
      }
    } catch (e: any) {
      showToast(e.message || 'Network error updating user', 'error');
    }
    return null;
  };

  const disableUser = async (userId: string): Promise<boolean> => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      showToast(language === 'vi' ? 'Không tìm thấy tài khoản người dùng.' : 'User not found.', 'error');
      return false;
    }
    if (userId === currentUser.id || userId === officialAuthUser?.id) {
      showToast(
        language === 'vi'
          ? 'Không thể vô hiệu hóa tài khoản đang đăng nhập.'
          : 'Cannot disable the currently signed-in account.',
        'error'
      );
      return false;
    }
    if ((target.email || '').toLowerCase() === 'tranchanhtrung@gmail.com') {
      showToast(
        language === 'vi'
          ? 'Không thể vô hiệu hóa tài khoản Chủ sở hữu hệ thống.'
          : 'Cannot disable the system owner account.',
        'error'
      );
      return false;
    }

    if (isLiveFirestoreMode()) {
      try {
        await disableOfficialUserInFirestore(target, currentUser.name);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setProductionCounts((prev) => ({
          ...prev,
          userProfiles: Math.max(0, (prev.userProfiles || 1) - 1),
        }));
        fetch(`/api/users/${encodeURIComponent(userId)}/disable`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: authHeaders(),
        }).catch(() => {});
        showToast(
          language === 'vi'
            ? `Đã chuyển tài khoản ${target.name} sang trạng thái vô hiệu hóa (Disabled) và ẩn khỏi danh sách.`
            : `Disabled account ${target.name} and hidden from directory.`,
          'success'
        );
        return true;
      } catch (fsErr: any) {
        showToast(
          fsErr?.message ||
            (language === 'vi'
              ? 'Không thể vô hiệu hóa tài khoản trên Firestore.'
              : 'Failed to disable user in Firestore.'),
          'error'
        );
        return false;
      }
    }

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/disable`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Failed to disable user', 'error');
        return false;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      refreshAuditLogs();
      showToast(
        language === 'vi'
          ? `Đã chuyển tài khoản ${target.name} sang trạng thái vô hiệu hóa (Disabled) và ẩn khỏi danh sách.`
          : `Disabled account ${target.name} and hidden from directory.`,
        'success'
      );
      return true;
    } catch (e: any) {
      showToast(e.message || 'Network error disabling user', 'error');
      return false;
    }
  };

  const refreshEntitlements = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/entitlements', {
        credentials: 'same-origin',
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.entitlements)) {
        setUserEntitlements(data.entitlements);
      }
      setHasAllAccess(Boolean(data.hasAllAccess));
    } catch {
      // ignore offline
    }
  }, [authHeaders]);

  useEffect(() => {
    refreshEntitlements();
  }, [refreshEntitlements, currentUser.id, serverAuthToken]);

  const hasCourseAccess = useCallback(
    (courseOrId: Course | string): boolean => {
      const targetCourse =
        typeof courseOrId === 'string'
          ? courses.find((c) => c.id === courseOrId || c.code === courseOrId) ||
            COURSES.find((c) => c.id === courseOrId || c.code === courseOrId)
          : courseOrId;
      const targetId = typeof courseOrId === 'string' ? courseOrId : courseOrId.id;
      const targetCode = targetCourse?.code;

      const enrolled = enrollments.some((e) => {
        if (e.userId !== currentUser.id) return false;
        if (e.courseId === targetId) return true;
        if (targetCode && e.courseId === targetCode) return true;
        const matched = findCourseMatch(courses, e.courseId, COURSES);
        return Boolean(matched && (matched.id === targetId || (targetCode && matched.code === targetCode)));
      });
      if (enrolled) return true;
      if (hasAllAccess) return true;

      return userEntitlements.some((ent) => {
        if (ent.status !== 'active') return false;
        if (ent.validUntil && new Date(ent.validUntil).getTime() < Date.now()) return false;
        if (ent.scope === 'all_access') return true;
        if (ent.scope === 'course') {
          if (ent.resourceId === '*' || ent.resourceId === targetId) return true;
          if (targetCode && ent.resourceId === targetCode) return true;
        }
        return false;
      });
    },
    [courses, currentUser.id, enrollments, hasAllAccess, userEntitlements]
  );

  const startCourseCheckout = useCallback(
    (course: Course, lessonId: string | null = null) => {
      if (!officialAuthUser && !systemConfig.demoModeEnabled) {
        showToast(
          language === 'vi'
            ? 'Vui lòng đăng nhập tài khoản trước khi thanh toán ghi danh khóa học.'
            : 'Please sign in before purchasing and enrolling in a course.',
          'info'
        );
        openAuthModal('login');
        return;
      }
      setPendingCheckoutCombo(null);
      setPendingCheckoutCourse(course);
      setPendingCheckoutLessonId(lessonId);
      setActiveTab('pricing');
    },
    [language, officialAuthUser, openAuthModal, showToast, systemConfig.demoModeEnabled]
  );

  const startComboCheckout = useCallback(
    (combo: CourseComboPackage) => {
      if (!officialAuthUser && !systemConfig.demoModeEnabled) {
        showToast(
          language === 'vi'
            ? 'Vui lòng đăng nhập tài khoản trước khi mua gói Combo khóa học.'
            : 'Please sign in before purchasing a course bundle.',
          'info'
        );
        openAuthModal('login');
        return;
      }
      setPendingCheckoutCourse(null);
      setPendingCheckoutLessonId(null);
      setPendingCheckoutCombo(combo);
      setActiveTab('pricing');
    },
    [language, officialAuthUser, openAuthModal, showToast, systemConfig.demoModeEnabled]
  );

  const clearCourseCheckout = useCallback(() => {
    setPendingCheckoutCourse(null);
    setPendingCheckoutLessonId(null);
    setPendingCheckoutCombo(null);
  }, []);

  const completeCourseUnlock = useCallback(
    async (course: Course, lessonId: string | null = null) => {
      await enrollCourse(course.id);
      await refreshEntitlements();
      setPendingCheckoutCourse(null);
      setPendingCheckoutLessonId(null);
      setPendingCheckoutCombo(null);
      setActiveTab('courses');
      setSelectedLessonIdForPlayer(lessonId || null);
      setSelectedCourseForPlayer(course);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enrollCourse, refreshEntitlements]
  );

  const completeComboUnlock = useCallback(
    async (combo: CourseComboPackage) => {
      for (const cid of combo.courseIds) {
        await enrollCourse(cid);
      }
      await refreshEntitlements();
      setPendingCheckoutCourse(null);
      setPendingCheckoutLessonId(null);
      setPendingCheckoutCombo(null);
      setActiveTab('courses');
      const firstCourse = courses.find((c) => c.id === combo.courseIds[0] || c.code === combo.courseIds[0]);
      if (firstCourse) {
        setSelectedLessonIdForPlayer(null);
        setSelectedCourseForPlayer(firstCourse);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [courses, enrollCourse, refreshEntitlements]
  );

  const saveSiteAdminConfig = useCallback(
    async (
      nextOrUpdater: SiteAdminConfigDoc | ((prev: SiteAdminConfigDoc) => SiteAdminConfigDoc),
      successToast?: string
    ): Promise<boolean> => {
      const computed = normalizeSiteAdminConfig({
        ...(typeof nextOrUpdater === 'function' ? nextOrUpdater(siteAdminConfig) : nextOrUpdater),
        updatedBy: currentUser.name,
        updatedAt: new Date().toISOString(),
      });
      setSiteAdminConfig(computed);

      let persisted = false;
      if (isLiveFirestoreMode() && auth.currentUser?.emailVerified) {
        try {
          await saveSiteAdminConfigToFirestore(computed);
          persisted = true;
        } catch (err: any) {
          showToast(
            err?.message ||
              (language === 'vi'
                ? 'Không thể lưu cấu hình lên Firestore (kiểm tra quyền Admin).'
                : 'Failed to save configuration to Firestore.'),
            'error'
          );
          return false;
        }
      }

      try {
        const res = await fetch('/api/admin/site-config', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: authHeaders(),
          body: JSON.stringify({ siteAdminConfig: computed }),
        });
        if (res.ok) {
          persisted = true;
          refreshAuditLogs();
        } else if (!persisted) {
          const d = await res.json().catch(() => ({}));
          showToast(d.error || 'Failed to save site configuration.', 'error');
          return false;
        }
      } catch (err: any) {
        if (!persisted) {
          showToast(err?.message || 'Network error saving site configuration.', 'error');
          return false;
        }
      }

      if (successToast) {
        showToast(successToast, 'success');
      }
      return true;
    },
    [authHeaders, currentUser.name, isLiveFirestoreMode, language, refreshAuditLogs, showToast, siteAdminConfig]
  );

  const getEffectiveCoursePricing = useCallback(
    (course: Course) => resolveEffectiveCoursePricing(course, siteAdminConfig.coursePrices),
    [siteAdminConfig.coursePrices]
  );

  const getMaterialApprovalStatus = useCallback(
    (material: LessonMaterialDoc): MaterialApprovalStatus =>
      resolveMaterialApprovalStatus(material, siteAdminConfig.materialApprovals),
    [siteAdminConfig.materialApprovals]
  );

  const reviewLessonMaterial = useCallback(
    async (
      materialId: string,
      status: MaterialApprovalStatus,
      reviewNotes?: string
    ): Promise<boolean> => {
      return saveSiteAdminConfig(
        (prev) => ({
          ...prev,
          materialApprovals: {
            ...prev.materialApprovals,
            [materialId]: {
              materialId,
              status,
              reviewedBy: currentUser.name,
              reviewedAt: new Date().toISOString(),
              reviewNotes: reviewNotes?.trim() || undefined,
            },
          },
        }),
        language === 'vi'
          ? status === 'approved'
            ? 'Đã phê duyệt & công khai tài liệu cho học viên!'
            : status === 'rejected'
            ? 'Đã từ chối tài liệu và lưu lý do.'
            : 'Đã chuyển tài liệu về trạng thái chờ duyệt.'
          : status === 'approved'
          ? 'Material approved and published to learners!'
          : status === 'rejected'
          ? 'Material rejected.'
          : 'Material moved back to pending review.'
      );
    },
    [currentUser.name, language, saveSiteAdminConfig]
  );

  const updateUserCareerPath = async (pathId: string) => {
    setCurrentUserState((prev) => ({ ...prev, careerPathId: pathId }));
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, careerPathId: pathId } : u)));
    await updateUser(currentUser.id, { careerPathId: pathId });
  };

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setTalentNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch('/api/talent/notifications/read', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // ignore
    }
  };

  const pickAllowedFields = (obj: Record<string, any>, allowed: string[]) => {
    const out: Record<string, any> = {};
    for (const k of allowed) {
      if (obj[k] !== undefined) out[k] = obj[k];
    }
    return out;
  };

  const syncTalentAssessmentDoc = async (docItem: any) => {
    if (!auth.currentUser?.emailVerified || !docItem?.id) return;
    const payload = pickAllowedFields(
      { ...docItem, employeeUid: docItem.employeeUid || auth.currentUser.uid },
      [
        'id', 'version', 'supersedesId', 'employeeId', 'employeeUid', 'employeeName',
        'property', 'department', 'currentPosition', 'targetPosition', 'assessmentPeriod',
        'assessorId', 'assessorUid', 'assessorName', 'assessorType', 'status',
        'submittedAt', 'approvedById', 'approvedByName', 'approvedAt', 'rejectionReason',
        'overallComments', 'results', 'createdAt', 'updatedAt',
      ]
    );
    await syncRecordToFirestore('competencyAssessments', docItem.id, payload, true);
  };

  const syncTalentActivityDoc = async (docItem: any) => {
    if (!auth.currentUser?.emailVerified || !docItem?.id) return;
    const payload = pickAllowedFields(
      { ...docItem, employeeUid: docItem.employeeUid || auth.currentUser.uid },
      [
        'id', 'idpId', 'objectiveId', 'employeeId', 'employeeUid', 'competencyId',
        'competencyCode', 'domainId', 'category', 'ratioCategory', 'titleEn', 'titleVi',
        'descriptionEn', 'descriptionVi', 'sourceType', 'sourceRecordId', 'sourceCode',
        'targetLevel', 'estimatedHours', 'dueDate', 'status', 'validationStatus',
        'evidenceRequired', 'evidenceNotes', 'evidenceFileName', 'evidenceUrl',
        'validatedById', 'validatedByName', 'validatedAt', 'validatorFeedback',
        'assignedById', 'assignedByName', 'createdAt', 'updatedAt',
      ]
    );
    await syncRecordToFirestore('developmentActivities', docItem.id, payload, true);
  };

  const syncTalentIdpDoc = async (docItem: any) => {
    if (!auth.currentUser?.emailVerified || !docItem?.id) return;
    const payload = pickAllowedFields(
      { ...docItem, employeeUid: docItem.employeeUid || auth.currentUser.uid },
      [
        'id', 'version', 'employeeId', 'employeeUid', 'employeeName', 'property',
        'department', 'currentPosition', 'targetPosition', 'sourceAssessmentId',
        'sourceAssessmentPeriod', 'managerId', 'managerUid', 'managerName', 'status',
        'periodStart', 'periodEnd', 'overallGoalEn', 'overallGoalVi', 'ratioTarget',
        'objectives', 'submittedAt', 'managerReviewedBy', 'managerReviewedAt',
        'lndApprovedBy', 'lndApprovedAt', 'activatedAt', 'completedAt', 'closedAt',
        'rejectionNotes', 'createdBy', 'createdAt', 'updatedAt',
      ]
    );
    await syncRecordToFirestore('individualDevelopmentPlans', docItem.id, payload, true);
  };

  const updateTalentConfig = async (updates: Partial<TalentConfigDoc>): Promise<boolean> => {
    try {
      const res = await fetch('/api/talent/config', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save configuration', 'error');
        return false;
      }
      if (data.talentConfig) {
        setTalentConfig(data.talentConfig);
        if (auth.currentUser?.emailVerified) {
          const cfgPayload = pickAllowedFields(
            { ...data.talentConfig, id: data.talentConfig.id || 'default' },
            [
              'id', 'weightMode', 'competencyOverrides', 'customPositionTargets',
              'ratio702010', 'readinessThresholds', 'updatedBy', 'updatedAt',
            ]
          );
          await syncRecordToFirestore('talentConfig', cfgPayload.id, cfgPayload, true);
        }
      }
      refreshAuditLogs();
      showToast(language === 'vi' ? 'Đã lưu cấu hình Competency & IDP Engine.' : 'Talent configuration updated.', 'success');
      return true;
    } catch (e: any) {
      showToast(e.message || 'Network error', 'error');
      return false;
    }
  };

  const saveTalentAssessment = async (payload: any): Promise<CompetencyAssessmentDoc | null> => {
    try {
      const res = await fetch('/api/talent/assessments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save competency assessment', 'error');
        return null;
      }
      if (data.assessment) {
        await syncTalentAssessmentDoc(data.assessment);
      }
      await refreshTalentData();
      refreshAuditLogs();
      return data.assessment;
    } catch (e: any) {
      showToast(e.message || 'Failed to save assessment', 'error');
      return null;
    }
  };

  const transitionTalentAssessment = async (
    id: string,
    targetStatus: 'draft' | 'submitted' | 'approved' | 'rejected',
    rejectionReason?: string
  ): Promise<CompetencyAssessmentDoc | null> => {
    try {
      const res = await fetch(`/api/talent/assessments/${encodeURIComponent(id)}/transition`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ targetStatus, rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to transition assessment', 'error');
        return null;
      }
      if (data.assessment) {
        await syncTalentAssessmentDoc(data.assessment);
      }
      await refreshTalentData();
      refreshAuditLogs();
      return data.assessment;
    } catch (e: any) {
      showToast(e.message || 'Failed to update assessment status', 'error');
      return null;
    }
  };

  const createTalentActivity = async (payload: any): Promise<DevelopmentActivityDoc | null> => {
    try {
      const res = await fetch('/api/talent/activities', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create development activity', 'error');
        return null;
      }
      if (data.activity) {
        await syncTalentActivityDoc(data.activity);
      }
      await refreshTalentData();
      refreshAuditLogs();
      return data.activity;
    } catch (e: any) {
      showToast(e.message || 'Failed to create activity', 'error');
      return null;
    }
  };

  const updateTalentActivity = async (id: string, payload: any): Promise<DevelopmentActivityDoc | null> => {
    try {
      const res = await fetch(`/api/talent/activities/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update activity', 'error');
        return null;
      }
      if (data.activity) {
        await syncTalentActivityDoc(data.activity);
      }
      await refreshTalentData();
      return data.activity;
    } catch (e: any) {
      showToast(e.message || 'Failed to update activity', 'error');
      return null;
    }
  };

  const createTalentIdp = async (
    payload: any
  ): Promise<{ idp?: IndividualDevelopmentPlanDoc; duplicateId?: string; error?: string }> => {
    try {
      const res = await fetch('/api/talent/idps', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 409 && data.code === 'DUPLICATE_IDP_CONFIRM_REQUIRED') {
        return { duplicateId: data.existingIdpId, error: data.error };
      }
      if (!res.ok) {
        showToast(data.error || 'Failed to create IDP', 'error');
        return { error: data.error };
      }
      if (data.idp) {
        // Ensure referenced sourceAssessment doc exists in Firestore before IDP creation (Rules FK check)
        const srcAsmt = competencyAssessments.find((a) => a.id === data.idp.sourceAssessmentId);
        if (srcAsmt) {
          await syncTalentAssessmentDoc(srcAsmt).catch(() => {});
        }
        await syncTalentIdpDoc(data.idp);
        if (data.reviewLog?.id && auth.currentUser?.emailVerified) {
          await syncRecordToFirestore(
            'idpReviewLogs',
            data.reviewLog.id,
            pickAllowedFields(
              { ...data.reviewLog, employeeUid: data.reviewLog.employeeUid || auth.currentUser.uid },
              ['id', 'idpId', 'employeeId', 'employeeUid', 'action', 'fromStatus', 'toStatus', 'actorId', 'actorName', 'actorRole', 'comment', 'timestamp']
            ),
            true
          ).catch(() => {});
        }
      }
      await refreshTalentData();
      refreshAuditLogs();
      return { idp: data.idp };
    } catch (e: any) {
      showToast(e.message || 'Failed to create IDP', 'error');
      return { error: e.message };
    }
  };

  const transitionTalentIdp = async (
    id: string,
    targetStatus: string,
    comment?: string
  ): Promise<IndividualDevelopmentPlanDoc | null> => {
    try {
      const res = await fetch(`/api/talent/idps/${encodeURIComponent(id)}/transition`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ targetStatus, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'IDP workflow transition denied', 'error');
        return null;
      }
      if (data.idp) {
        await syncTalentIdpDoc(data.idp);
      }
      if (data.reviewLog?.id && auth.currentUser?.emailVerified) {
        await syncRecordToFirestore(
          'idpReviewLogs',
          data.reviewLog.id,
          pickAllowedFields(
            { ...data.reviewLog, employeeUid: data.reviewLog.employeeUid || auth.currentUser.uid },
            ['id', 'idpId', 'employeeId', 'employeeUid', 'action', 'fromStatus', 'toStatus', 'actorId', 'actorName', 'actorRole', 'comment', 'timestamp']
          ),
          true
        ).catch(() => {});
      }
      await refreshTalentData();
      refreshAuditLogs();
      return data.idp;
    } catch (e: any) {
      showToast(e.message || 'IDP transition failed', 'error');
      return null;
    }
  };

  const updateTalentIdpObjective = async (
    idpId: string,
    objId: string,
    payload: any
  ): Promise<IndividualDevelopmentPlanDoc | null> => {
    try {
      const res = await fetch(
        `/api/talent/idps/${encodeURIComponent(idpId)}/objectives/${encodeURIComponent(objId)}`,
        {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Objective update blocked', 'error');
        return null;
      }
      if (data.idp) {
        await syncTalentIdpDoc(data.idp);
      }
      await refreshTalentData();
      return data.idp;
    } catch (e: any) {
      showToast(e.message || 'Objective update failed', 'error');
      return null;
    }
  };

  const submitTalentReassessment = async (payload: any) => {
    try {
      const res = await fetch('/api/talent/reassessments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Reassessment failed', 'error');
        return null;
      }
      if (auth.currentUser?.emailVerified) {
        if (data.newAssessment) {
          await syncTalentAssessmentDoc(data.newAssessment);
        }
        if (data.reassessment?.id) {
          await syncRecordToFirestore(
            'competencyReassessments',
            data.reassessment.id,
            pickAllowedFields(
              { ...data.reassessment, employeeUid: data.reassessment.employeeUid || auth.currentUser.uid },
              [
                'id', 'employeeId', 'employeeUid', 'employeeName', 'idpId', 'baselineAssessmentId',
                'newApprovedAssessmentId', 'targetPosition', 'reassessmentDate', 'assessorId',
                'assessorName', 'assessorRole', 'beforeAchievementPct', 'afterAchievementPct',
                'netImprovementPct', 'gapsClosedCount', 'remainingGapsCount', 'items',
                'summaryFeedback', 'createdAt',
              ]
            ),
            true
          );
        }
      }
      await refreshTalentData();
      refreshAuditLogs();
      return { reassessment: data.reassessment, newAssessment: data.newAssessment };
    } catch (e: any) {
      showToast(e.message || 'Reassessment error', 'error');
      return null;
    }
  };

  const submitCareerReadinessReview = async (payload: any): Promise<CareerReadinessReviewDoc | null> => {
    try {
      const res = await fetch('/api/talent/readiness', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Readiness review blocked', 'error');
        return null;
      }
      if (auth.currentUser?.emailVerified && data.review?.id) {
        await syncRecordToFirestore(
          'careerReadinessReviews',
          data.review.id,
          pickAllowedFields(
            { ...data.review, employeeUid: data.review.employeeUid || auth.currentUser.uid },
            [
              'id', 'employeeId', 'employeeUid', 'employeeName', 'property', 'department',
              'currentPosition', 'targetPosition', 'sourceAssessmentId', 'sourceIdpId',
              'computedStatus', 'finalStatus', 'achievementPct', 'weightedAchievementPct',
              'idpCompletionPct', 'criticalAchievementPct', 'criticalBlockers',
              'recommendedNextSteps', 'reviewerId', 'reviewerName', 'reviewerRole',
              'reviewNotes', 'reviewedAt',
            ]
          ),
          true
        );
      }
      await refreshTalentData();
      refreshAuditLogs();
      return data.review;
    } catch (e: any) {
      showToast(e.message || 'Readiness review failed', 'error');
      return null;
    }
  };

  const hasPermission = useCallback(
    (permission: PermissionKey): boolean => {
      return roleHasPermission(currentUser.role, permission, rolePermissions);
    },
    [currentUser.role, rolePermissions]
  );

  const canAccessRoute = useCallback(
    (tabId: string): boolean => {
      return canAccessTab(currentUser.role, tabId, rolePermissions);
    },
    [currentUser.role, rolePermissions]
  );

  const saveRolePermissionPolicy = useCallback(
    async (role: UserRole, permissions: PermissionKey[]): Promise<boolean> => {
      const sanitized = sanitizeRolePermissionsList(role, permissions);
      try {
        if (isLiveFirestoreMode() && auth.currentUser?.emailVerified) {
          const savedDoc = await saveRolePermissionPolicyToFirestore(role, sanitized, {
            uid: auth.currentUser.uid,
            name: officialAuthUser?.name || currentUser.name,
          });
          setRolePermissions((prev) => ({ ...prev, [role]: savedDoc.permissions }));
          setRolePermissionMeta((prev) => ({
            ...prev,
            [role]: { updatedAt: savedDoc.updatedAt, updatedByName: savedDoc.updatedByName },
          }));
        } else {
          const res = await fetch(`/api/rbac/permissions/${role}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ permissions: sanitized }),
          });
          const data = await res.json();
          if (!res.ok) {
            showToast(data.error || 'Failed to update role permissions', 'error');
            return false;
          }
          setRolePermissions(normalizeRolePermissionsMap(data.rolePermissions));
          setRolePermissionMeta((prev) => ({
            ...prev,
            [role]: { updatedAt: new Date().toISOString(), updatedByName: currentUser.name },
          }));
          refreshAuditLogs();
        }
        return true;
      } catch (err: any) {
        showToast(err?.message || 'Unable to save role permissions', 'error');
        return false;
      }
    },
    [authHeaders, currentUser.name, isLiveFirestoreMode, officialAuthUser?.name, refreshAuditLogs, showToast]
  );

  const saveAllRolePermissions = useCallback(
    async (updatedMap: RolePermissionsMap): Promise<boolean> => {
      try {
        const normalized = normalizeRolePermissionsMap(updatedMap);
        if (isLiveFirestoreMode() && auth.currentUser?.emailVerified) {
          const updatedMeta: Partial<Record<UserRole, { updatedAt: string; updatedByName?: string }>> = {};
          for (const role of SYSTEM_ROLES) {
            const savedDoc = await saveRolePermissionPolicyToFirestore(role, normalized[role], {
              uid: auth.currentUser.uid,
              name: officialAuthUser?.name || currentUser.name,
            });
            updatedMeta[role] = { updatedAt: savedDoc.updatedAt, updatedByName: savedDoc.updatedByName };
          }
          setRolePermissions(normalized);
          setRolePermissionMeta((prev) => ({ ...prev, ...updatedMeta }));
          setProductionCounts((prev) => ({ ...prev, rolePermissions: SYSTEM_ROLES.length }));
        } else {
          for (const role of SYSTEM_ROLES) {
            const res = await fetch(`/api/rbac/permissions/${role}`, {
              method: 'PUT',
              headers: authHeaders(),
              body: JSON.stringify({ permissions: normalized[role] }),
            });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              showToast(errData.error || 'Failed to persist role permissions', 'error');
              return false;
            }
          }
          setRolePermissions(normalized);
          const nowIso = new Date().toISOString();
          setRolePermissionMeta((prev) => {
            const next = { ...prev };
            SYSTEM_ROLES.forEach((r) => {
              next[r] = { updatedAt: nowIso, updatedByName: currentUser.name };
            });
            return next;
          });
          refreshAuditLogs();
        }
        return true;
      } catch (err: any) {
        showToast(err?.message || 'Error saving role permissions matrix', 'error');
        return false;
      }
    },
    [authHeaders, currentUser.name, isLiveFirestoreMode, officialAuthUser?.name, refreshAuditLogs, showToast]
  );

  const resetRolePermissions = useCallback(
    async (role?: UserRole): Promise<boolean> => {
      try {
        if (isLiveFirestoreMode() && auth.currentUser?.emailVerified) {
          const rolesToReset = role ? [role] : SYSTEM_ROLES;
          for (const r of rolesToReset) {
            const savedDoc = await saveRolePermissionPolicyToFirestore(r, DEFAULT_ROLE_PERMISSIONS[r], {
              uid: auth.currentUser.uid,
              name: officialAuthUser?.name || currentUser.name,
            });
            setRolePermissions((prev) => ({ ...prev, [r]: savedDoc.permissions }));
            setRolePermissionMeta((prev) => ({
              ...prev,
              [r]: { updatedAt: savedDoc.updatedAt, updatedByName: savedDoc.updatedByName },
            }));
          }
        } else {
          const res = await fetch('/api/rbac/reset', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ role }),
          });
          const data = await res.json();
          if (!res.ok) {
            showToast(data.error || 'Failed to reset role permissions', 'error');
            return false;
          }
          setRolePermissions(normalizeRolePermissionsMap(data.rolePermissions));
          refreshAuditLogs();
        }
        return true;
      } catch (err: any) {
        showToast(err?.message || 'Failed to reset role permissions', 'error');
        return false;
      }
    },
    [authHeaders, currentUser.name, isLiveFirestoreMode, officialAuthUser?.name, refreshAuditLogs, showToast]
  );

  const refreshLessonMaterials = useCallback(async () => {
    try {
      if (isLiveFirestoreMode() && auth.currentUser?.emailVerified) {
        const docs = await fetchLessonMaterialsFromFirestore();
        setLessonMaterials(docs);
        return;
      }
      const res = await fetch('/api/lesson-materials');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.lessonMaterials)) {
          setLessonMaterials(sortLessonMaterialsAsc(data.lessonMaterials));
        }
      }
    } catch (err) {
      console.warn('Refresh lesson materials note:', err);
    }
  }, [isLiveFirestoreMode]);

  const uploadLessonMaterial = useCallback(
    async (params: {
      courseId: string;
      lessonId: string;
      titleVi: string;
      titleEn: string;
      descriptionVi?: string;
      descriptionEn?: string;
      materialType?: LessonMaterialType;
      isRequired?: boolean;
      file?: File | null;
      externalUrl?: string;
      preferredStorage?: 'auto' | LessonMaterialStorageMode;
      forceFirestore?: boolean;
      onProgress?: (percent: number) => void;
    }): Promise<LessonMaterialDoc | null> => {
      try {
        const courseObj = findCourseMatch(courses, params.courseId, COURSES);
        if (!courseObj) {
          showToast(language === 'vi' ? 'Không tìm thấy khóa học.' : 'Course not found.', 'error');
          return null;
        }
        const fallbackCourse = COURSES.find(
          (fc) => fc.id === courseObj.id || fc.code === courseObj.code
        );
        const effectiveModules =
          courseObj.modules && courseObj.modules.length > 0
            ? courseObj.modules
            : fallbackCourse?.modules || [];
        let lessonIdx = effectiveModules.findIndex((m) => m.id === params.lessonId);
        if (lessonIdx < 0 && fallbackCourse?.modules?.length) {
          const fbIdx = fallbackCourse.modules.findIndex((m) => m.id === params.lessonId);
          if (fbIdx >= 0 && effectiveModules[fbIdx]) {
            lessonIdx = fbIdx;
          }
        }
        const lessonObj = lessonIdx >= 0 ? effectiveModules[lessonIdx] : undefined;
        if (!lessonObj) {
          showToast(language === 'vi' ? 'Không tìm thấy bài học.' : 'Lesson not found.', 'error');
          return null;
        }

        const useFirestore =
          Boolean(auth.currentUser?.emailVerified) &&
          (Boolean(params.forceFirestore) || isLiveFirestoreMode());

        const trimmedUrl = params.externalUrl?.trim() || '';
        if (!params.file && !trimmedUrl) {
          showToast(
            language === 'vi'
              ? 'Vui lòng chọn tệp tải lên hoặc nhập đường dẫn URL.'
              : 'Please select a file or enter a resource URL.',
            'error'
          );
          return null;
        }

        const now = new Date().toISOString();
        const docId = `lmat_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const titleVi =
          params.titleVi.trim() ||
          params.file?.name ||
          (language === 'vi' ? 'Học liệu bài học' : 'Lesson Material');
        const titleEn = params.titleEn.trim() || titleVi;

        let resolvedType: LessonMaterialType =
          params.materialType || (params.file ? inferMaterialTypeFromFile(params.file) : 'link');
        let storageMode: LessonMaterialStorageMode = 'external_link';
        let fileName: string | undefined;
        let mimeType: string | undefined;
        let fileSizeBytes: number | undefined;
        let fileSizeLabel = 'External URL';
        let inlineBase64: string | undefined;
        let downloadUrl: string | undefined;
        let storagePath: string | undefined;
        let externalUrl: string | undefined;

        if (params.file) {
          const fileCheck = validateStorageFile(params.file);
          if (!fileCheck.valid) {
            showToast(fileCheck.error || 'Invalid file.', 'error');
            return null;
          }
          fileName = params.file.name.slice(0, 255);
          mimeType = (params.file.type || 'application/octet-stream').slice(0, 150);
          fileSizeBytes = params.file.size;
          fileSizeLabel = formatFileSizeLabel(params.file.size).slice(0, 40);

          const pref = params.preferredStorage || 'auto';
          const canInline = params.file.size <= FIRESTORE_INLINE_MAX_BYTES;

          if (pref === 'firestore_inline' || (pref === 'auto' && canInline)) {
            if (!canInline) {
              showToast(
                language === 'vi'
                  ? `Tệp (${fileSizeLabel}) vượt ngưỡng lưu trực tiếp 650KB của Firestore. Vui lòng chọn chế độ Firebase Storage (tối đa 10MB).`
                  : `File (${fileSizeLabel}) exceeds Firestore 650KB inline limit. Please use Firebase Storage mode (up to 10MB).`,
                'error'
              );
              return null;
            }
            const b64 = await fileToBase64(params.file);
            if (b64.length > 920000) {
              showToast(
                language === 'vi'
                  ? 'Dung lượng mã hóa vượt giới hạn 1MB của Firestore.'
                  : 'Encoded file exceeds Firestore 1MB safety cap.',
                'error'
              );
              return null;
            }
            storageMode = 'firestore_inline';
            inlineBase64 = b64;
          } else {
            const isVideoFile =
              resolvedType === 'video' ||
              params.file.type.startsWith('video/') ||
              /\.(mp4|webm)$/i.test(params.file.name);
            const maxAllowed = isVideoFile ? VIDEO_STORAGE_MAX_BYTES : FIREBASE_STORAGE_MAX_BYTES;
            if (params.file.size > maxAllowed) {
              const limitMb = Math.round(maxAllowed / (1024 * 1024));
              showToast(
                language === 'vi'
                  ? `Tệp vượt giới hạn ${limitMb}MB.`
                  : `File exceeds ${limitMb}MB limit.`,
                'error'
              );
              return null;
            }
            // Prefer unified Cloudflare R2 / Direct Storage (/api/storage/*) with real-time % progress
            try {
              const uploaded = await uploadFileWithProgress({
                file: params.file,
                category: isVideoFile ? 'course_videos' : 'course_materials',
                recordId: courseObj.id,
                authHeaders: authHeaders(),
                onProgress: params.onProgress,
              });
              storageMode = 'firebase_storage';
              downloadUrl = uploaded.downloadApiUrl;
              storagePath = uploaded.objectKey;
            } catch (r2Err: any) {
              // Fallback to Firebase Storage (if verified Firebase) or Firestore inline (if <= 650KB)
              if (useFirestore && params.file.size <= 10 * 1024 * 1024) {
                try {
                  const uploaded = await uploadAuthorizedTrainingFile({
                    file: params.file,
                    category: 'course_materials',
                    recordId: courseObj.id,
                    filePrefix: lessonObj.id,
                  });
                  storageMode = 'firebase_storage';
                  downloadUrl = uploaded.downloadUrl;
                  storagePath = uploaded.fullPath;
                } catch (storageErr: any) {
                  if (canInline) {
                    const b64 = await fileToBase64(params.file);
                    if (b64.length <= 920000) {
                      storageMode = 'firestore_inline';
                      inlineBase64 = b64;
                    } else {
                      throw storageErr;
                    }
                  } else {
                    throw r2Err;
                  }
                }
              } else if (canInline) {
                storageMode = 'firestore_inline';
                inlineBase64 = await fileToBase64(params.file);
              } else {
                throw r2Err;
              }
            }
          }
        } else if (trimmedUrl) {
          storageMode = 'external_link';
          externalUrl = trimmedUrl.slice(0, 2000);
          downloadUrl = trimmedUrl.slice(0, 2000);
          if (!params.materialType) resolvedType = 'link';
        }

        const record: LessonMaterialDoc = {
          id: docId,
          courseId: courseObj.id,
          courseCode: courseObj.code.slice(0, 32),
          lessonId: lessonObj.id,
          lessonOrder: lessonIdx + 1,
          lessonTitleVi: (lessonObj.titleVi || `Bài ${lessonIdx + 1}`).slice(0, 300),
          lessonTitleEn: (lessonObj.titleEn || `Lesson ${lessonIdx + 1}`).slice(0, 300),
          titleVi: titleVi.slice(0, 300),
          titleEn: titleEn.slice(0, 300),
          descriptionVi: params.descriptionVi?.trim() ? params.descriptionVi.trim().slice(0, 2000) : undefined,
          descriptionEn: params.descriptionEn?.trim() ? params.descriptionEn.trim().slice(0, 2000) : undefined,
          materialType: resolvedType,
          storageMode,
          fileName,
          mimeType,
          fileSizeBytes,
          fileSizeLabel,
          inlineBase64,
          downloadUrl: downloadUrl ? downloadUrl.slice(0, 2000) : undefined,
          storagePath: storagePath ? storagePath.slice(0, 500) : undefined,
          externalUrl: externalUrl ? externalUrl.slice(0, 2000) : undefined,
          isRequired: Boolean(params.isRequired),
          uploadedByUid: useFirestore && auth.currentUser ? auth.currentUser.uid : currentUser.id,
          uploadedByName: ((useFirestore ? officialAuthUser?.name : currentUser.name) || currentUser.name || 'Administrator').slice(0, 150),
          uploadedByEmail: ((useFirestore ? auth.currentUser?.email || currentUser.email : currentUser.email) || undefined)?.slice(0, 200),
          uploadedByRole: String(currentUser.role).slice(0, 64),
          createdAt: now,
          updatedAt: now,
        };

        const initialApprovalStatus: MaterialApprovalStatus =
          siteAdminConfig.general.requireMaterialApproval && currentUser.role !== 'super_admin'
            ? 'pending'
            : 'approved';

        const markInitialApproval = async (savedMat: LessonMaterialDoc) => {
          if (initialApprovalStatus === 'pending') {
            await saveSiteAdminConfig((prev) => ({
              ...prev,
              materialApprovals: {
                ...prev.materialApprovals,
                [savedMat.id]: {
                  materialId: savedMat.id,
                  status: 'pending',
                },
              },
            }));
          }
        };

        if (useFirestore) {
          const saved = await saveLessonMaterialToFirestore(record);
          await markInitialApproval(saved);
          setLessonMaterials((prev) =>
            sortLessonMaterialsAsc([saved, ...prev.filter((m) => m.id !== saved.id)])
          );
          setProductionCounts((prev) => ({
            ...prev,
            lessonMaterials: (prev.lessonMaterials || 0) + 1,
          }));
          showToast(
            language === 'vi'
              ? initialApprovalStatus === 'pending'
                ? `Đã tải học liệu "${saved.titleVi}" lên hàng đợi Chờ Admin Duyệt!`
                : `Đã lưu học liệu "${saved.titleVi}" cho Bài ${saved.lessonOrder} (${saved.courseCode}) lên Firestore!`
              : `Saved "${saved.titleEn}" to Lesson ${saved.lessonOrder} (${saved.courseCode}) in Firestore!`,
            'success'
          );
          return saved;
        } else {
          const res = await fetch('/api/lesson-materials', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(record),
          });
          const data = await res.json();
          if (!res.ok) {
            showToast(data.error || 'Failed to save lesson material', 'error');
            return null;
          }
          const saved: LessonMaterialDoc = data.material;
          await markInitialApproval(saved);
          setLessonMaterials((prev) =>
            sortLessonMaterialsAsc([saved, ...prev.filter((m) => m.id !== saved.id)])
          );
          refreshAuditLogs();
          showToast(
            language === 'vi'
              ? initialApprovalStatus === 'pending'
                ? `Đã tải học liệu "${saved.titleVi}" lên hàng đợi Chờ Admin Duyệt!`
                : `Đã lưu học liệu "${saved.titleVi}" cho Bài ${saved.lessonOrder} (${saved.courseCode}).`
              : `Saved "${saved.titleEn}" to Lesson ${saved.lessonOrder} (${saved.courseCode}).`,
            'success'
          );
          return saved;
        }
      } catch (err: any) {
        showToast(err?.message || 'Failed to upload lesson learning material.', 'error');
        return null;
      }
    },
    [
      authHeaders,
      courses,
      currentUser.email,
      currentUser.id,
      currentUser.name,
      currentUser.role,
      isLiveFirestoreMode,
      language,
      officialAuthUser?.name,
      refreshAuditLogs,
      saveSiteAdminConfig,
      showToast,
      siteAdminConfig.general.requireMaterialApproval,
    ]
  );

  const deleteLessonMaterial = useCallback(
    async (materialId: string): Promise<boolean> => {
      try {
        const targetMat = lessonMaterials.find((m) => m.id === materialId);
        if (targetMat?.storagePath && (targetMat.downloadUrl || '').startsWith('/api/storage/file')) {
          fetch(`/api/storage/object?key=${encodeURIComponent(targetMat.storagePath)}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: authHeaders(),
          }).catch(() => {});
        }
        const useFirestore = isLiveFirestoreMode() && Boolean(auth.currentUser?.emailVerified);
        if (useFirestore) {
          await deleteLessonMaterialFromFirestore(materialId);
          setLessonMaterials((prev) => prev.filter((m) => m.id !== materialId));
          setProductionCounts((prev) => ({
            ...prev,
            lessonMaterials: Math.max(0, (prev.lessonMaterials || 1) - 1),
          }));
        } else {
          const res = await fetch(`/api/lesson-materials/${materialId}`, {
            method: 'DELETE',
            headers: authHeaders(),
          });
          if (!res.ok) {
            if (res.status === 404 && auth.currentUser?.emailVerified) {
              await deleteLessonMaterialFromFirestore(materialId);
              setLessonMaterials((prev) => prev.filter((m) => m.id !== materialId));
              setProductionCounts((prev) => ({
                ...prev,
                lessonMaterials: Math.max(0, (prev.lessonMaterials || 1) - 1),
              }));
            } else {
              const errData = await res.json().catch(() => ({}));
              showToast(errData.error || 'Failed to delete lesson material', 'error');
              return false;
            }
          } else {
            setLessonMaterials((prev) => prev.filter((m) => m.id !== materialId));
            refreshAuditLogs();
          }
        }
        showToast(
          language === 'vi' ? 'Đã xóa học liệu bài học.' : 'Removed lesson material.',
          'info'
        );
        return true;
      } catch (err: any) {
        showToast(err?.message || 'Failed to delete lesson material.', 'error');
        return false;
      }
    },
    [authHeaders, isLiveFirestoreMode, language, refreshAuditLogs, showToast]
  );

  const t = translations[language];

  const mergedNotifications = useMemo(() => {
    const nowMs = Date.now();
    const activeBroadcasts = (siteAdminConfig.announcements || [])
      .filter((a) => {
        if (!a.isActive || !a.showInBell) return false;
        if (a.startsAt && new Date(a.startsAt).getTime() > nowMs) return false;
        if (a.expiresAt && new Date(a.expiresAt).getTime() < nowMs) return false;
        if (a.targetRoles.includes('all')) return true;
        return a.targetRoles.includes(currentUser.role);
      })
      .map((a) => ({
        id: `ann_${a.id}`,
        title: `${language === 'vi' ? a.titleVi : a.titleEn || a.titleVi}: ${
          language === 'vi' ? a.messageVi : a.messageEn || a.messageVi
        }`,
        time: new Date(a.updatedAt || a.createdAt).toLocaleDateString('vi-VN'),
        read: false,
      }));

    return [
      ...activeBroadcasts,
      ...talentNotifications.map((n) => ({
        id: n.id,
        title: `${n.title}: ${n.message}`,
        time: n.time,
        read: n.read,
      })),
      ...notifications.map((n) => ({
        id: n.id,
        title: language === 'vi' ? n.title : n.titleEn || n.title,
        time: language === 'vi' ? n.time : n.timeEn || n.time,
        read: n.read,
      })),
    ];
  }, [siteAdminConfig.announcements, currentUser.role, talentNotifications, notifications, language]);

  const effectiveSuccessionCandidates = useMemo<SuccessionCandidate[]>(() => {
    if (systemConfig.demoModeEnabled && dataSourceMode === 'demo') {
      return SUCCESSION_CANDIDATES;
    }
    // Derive succession bench dynamically from real non-demo users & readiness reviews
    const realLearners = users.filter((u) => !isDemoUserRecord(u) && u.role === 'learner');
    return realLearners
      .map((u): SuccessionCandidate => {
        const latestReview = careerReadinessReviews.find((r) => r.employeeId === u.id);
        const pct = latestReview
          ? Math.round(latestReview.achievementPct)
          : Math.min(100, Math.round((u.currentLevel / Math.max(1, u.targetLevel)) * 100));
        const statusStr = String(latestReview?.finalStatus || '');
        const readiness: SuccessionCandidate['readiness'] =
          statusStr === 'Ready for Promotion' || statusStr === 'Ready for Review' || pct >= 90
            ? 'Ready Now'
            : statusStr === 'Approaching Readiness' || pct >= 70
            ? 'Ready in 1-2 Years'
            : 'Developing';
        const supervisor = u.supervisorId ? users.find((m) => m.id === u.supervisorId) : undefined;
        const userCerts = certificates.filter((c) => c.userId === u.id);
        const highestCertLevel = userCerts.reduce((max, c) => Math.max(max, Number(c.level) || 0), 0);
        return {
          userId: u.id,
          currentRole: u.position || 'Accountant',
          targetRole: latestReview?.targetPosition || 'Financial Controller',
          readiness,
          competencyScorePercent: pct,
          completedOJTCount: submissions.filter((s) => s.userId === u.id && s.status === 'approved').length,
          certLevel: highestCertLevel,
          mentorName: latestReview?.reviewerName || supervisor?.name || 'FC Mentor',
        };
      })
      .sort((a, b) => b.competencyScorePercent - a.competencyScorePercent);
  }, [careerReadinessReviews, certificates, dataSourceMode, submissions, systemConfig.demoModeEnabled, users]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        language,
        setLanguage,
        t,
        activeTab,
        setActiveTab,
        toasts,
        showToast,
        dismissToast,
        users,
        domains,
        competencies,
        courses,
        enrollments,
        quizAttempts,
        ojtAssignments,
        submissions,
        learningPaths,
        assessments,
        idps,
        certificates,
        successionCandidates: effectiveSuccessionCandidates,
        auditLogs,
        enrollCourse,
        updateCourseProgress,
        submitQuizAttempt,
        submitAssignment,
        gradeAssignment,
        saveCompetency,
        deleteCompetency,
        saveAssessment,
        generateIDPFromGap,
        updateIDPItem,
        saveIDPPlan,
        createAssessmentCycle,
        issueCertificate,
        addUser,
        updateUser,
        disableUser,
        updateUserCareerPath,
        pendingCheckoutCourse,
        pendingCheckoutLessonId,
        pendingCheckoutCombo,
        startCourseCheckout,
        startComboCheckout,
        clearCourseCheckout,
        userEntitlements,
        hasAllAccess,
        refreshEntitlements,
        hasCourseAccess,
        completeCourseUnlock,
        completeComboUnlock,
        siteAdminConfig,
        saveSiteAdminConfig,
        getEffectiveCoursePricing,
        getMaterialApprovalStatus,
        reviewLessonMaterial,
        selectedCourseForPlayer,
        setSelectedCourseForPlayer,
        selectedLessonIdForPlayer,
        setSelectedLessonIdForPlayer,
        selectedCertificateForView,
        setSelectedCertificateForView,
        activeQuizTopic,
        setActiveQuizTopic,
        notifications: mergedNotifications,
        markAllNotificationsRead,
        talentConfig,
        competencyAssessments,
        talentIdps,
        developmentActivities,
        competencyReassessments,
        careerReadinessReviews,
        idpReviewLogs,
        talentNotifications,
        selectedTalentEmployeeId,
        setSelectedTalentEmployeeId,
        selectedTalentTargetPosition,
        setSelectedTalentTargetPosition,
        refreshTalentData,
        updateTalentConfig,
        saveTalentAssessment,
        transitionTalentAssessment,
        createTalentActivity,
        updateTalentActivity,
        createTalentIdp,
        transitionTalentIdp,
        updateTalentIdpObjective,
        submitTalentReassessment,
        submitCareerReadinessReview,
        serverAuthUser,
        loginWithServerAccount,
        registerWithServerAccount,
        changeServerPassword,
        requestServerPasswordReset,
        confirmServerPasswordReset,
        firebaseUser,
        firebaseProfile,
        officialAuthUser,
        isPreviewingRole: Boolean(
          officialAuthUser && currentUser.id !== officialAuthUser.id
        ),
        useOfficialAccountIdentity,
        signOutOfficialAccount,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        syncAllExperienceRolesToFirestore,
        purgeDemoUsersInFirestore,
        dataSourceMode,
        setDataSourceMode,
        systemConfig,
        getAuthHeaders: authHeaders,
        productionCounts,
        refreshFromFirestore,
        simulatorData,
        simulatorWorkspace,
        selectedSimulatorScenarioId,
        setSelectedSimulatorScenarioId,
        activeSimulatorSessionId,
        setActiveSimulatorSessionId,
        refreshSimulatorData,
        refreshSimulatorWorkspace,
        scenarioVersions,
        scenarioImportJobs,
        scenarioCompetencyMappings,
        refreshScenarioGovernance,
        transitionScenarioStatus,
        toggleScenarioPublish,
        saveSimulationSession,
        evaluateSimulationSession,
        reviewSimulationEvaluation,
        assignSimulatorScenario,
        upsertSimulatorScenario,
        upsertHotelProfile,
        launchSimulationWorkspace,
        rolePermissions,
        rolePermissionMeta,
        hasPermission,
        canAccessRoute,
        saveRolePermissionPolicy,
        saveAllRolePermissions,
        resetRolePermissions,
        lessonMaterials,
        refreshLessonMaterials,
        uploadLessonMaterial,
        deleteLessonMaterial,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
