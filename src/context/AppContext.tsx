import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  auth,
  subscribeFirebaseAuth,
  resolveAuthenticatedUserProfile,
  fetchAllProductionMasterData,
  publishSimulationScenarioInFirestore,
  syncRecordToFirestore,
  getFirestoreCollectionDocs,
} from '../lib/firebase';
import {
  User,
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
import { translations, Language } from '../i18n/translations';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
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
  updateUserCareerPath: (pathId: string) => Promise<void>;
  selectedCourseForPlayer: Course | null;
  setSelectedCourseForPlayer: (c: Course | null) => void;
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

  // Firebase Live Auth, Production Mode & FC Business Partner Simulator
  firebaseUser: FirebaseUser | null;
  firebaseProfile: FirebaseUserProfileDoc | null;
  dataSourceMode: 'demo' | 'firestore';
  setDataSourceMode: (mode: 'demo' | 'firestore') => void;
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

  const setCurrentUser = useCallback((user: User) => {
    setCurrentUserState(user);
    localStorage.setItem('fc_active_user_id', user.id);
  }, []);

  // Data collections (bootstrapped from /api/bootstrap & optionally Firestore Live)
  const [domains, setDomains] = useState<CompetencyDomain[]>(COMPETENCY_DOMAINS);
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>(LEARNING_PATHS);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>(COMPETENCIES);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(INITIAL_ASSESSMENT_RECORDS);
  const [idps, setIdps] = useState<IndividualDevelopmentPlan[]>(INITIAL_IDPS);
  const [certificates, setCertificates] = useState<Certificate[]>(INITIAL_CERTIFICATES);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Firebase Auth & Production Firestore State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [firebaseProfile, setFirebaseProfile] = useState<FirebaseUserProfileDoc | null>(null);
  const [dataSourceMode, setDataSourceMode] = useState<'demo' | 'firestore'>('demo');
  const [productionCounts, setProductionCounts] = useState<Record<string, number>>({});

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

  // Load persisted LMS data on mount
  useEffect(() => {
    fetch('/api/bootstrap')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users);
          setCurrentUserState((prev) => data.users.find((u: User) => u.id === prev.id) || prev);
        }
        if (Array.isArray(data.competencies) && data.competencies.length > 0) {
          setCompetencies(data.competencies);
        }
        if (Array.isArray(data.enrollments)) setEnrollments(data.enrollments);
        if (Array.isArray(data.quizAttempts)) setQuizAttempts(data.quizAttempts);
        if (Array.isArray(data.submissions)) setSubmissions(data.submissions);
        if (Array.isArray(data.assessments) && data.assessments.length > 0) {
          setAssessments(data.assessments);
        }
        if (Array.isArray(data.idps) && data.idps.length > 0) {
          setIdps(data.idps);
        }
        if (Array.isArray(data.certificates)) setCertificates(data.certificates);
        if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
      })
      .catch((err) => console.warn('Bootstrap fallback to local initial data:', err));
  }, []);

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      'x-user-id': currentUser.id,
      'x-user-role': currentUser.role,
    }),
    [currentUser.id, currentUser.role]
  );

  const refreshTalentData = useCallback(async () => {
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
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    refreshTalentData();
    if (currentUser.role === 'learner') {
      setSelectedTalentEmployeeId(currentUser.id);
    }
  }, [refreshTalentData, currentUser.id, currentUser.role]);

  const refreshSimulatorWorkspace = useCallback(async () => {
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
  }, [currentUser.id, currentUser.role]);

  const refreshSimulatorData = useCallback(async () => {
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
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    refreshSimulatorData();
  }, [refreshSimulatorData]);

  const refreshScenarioGovernance = useCallback(async () => {
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
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    refreshScenarioGovernance();
  }, [refreshScenarioGovernance]);

  const refreshFromFirestore = useCallback(async (forceMode?: 'demo' | 'firestore') => {
    const fb = auth.currentUser;
    if (!fb || !fb.emailVerified) return;

    const activeMode = forceMode ?? dataSourceMode;

    try {
      const profile = await resolveAuthenticatedUserProfile(fb);
      if (profile) {
        setFirebaseProfile(profile);
      }
      const isAdminOrLnd = Boolean(
        profile?.isAdmin ||
          profile?.role === 'super_admin' ||
          profile?.role === 'lnd_manager' ||
          currentUser.role === 'super_admin' ||
          currentUser.role === 'lnd_manager'
      );

      const { masterCollections, counts } = await fetchAllProductionMasterData(isAdminOrLnd);
      setProductionCounts(counts);

      const hasProdAcademy =
        (counts.competencyDomains || 0) > 0 || (counts.competencies || 0) > 0 || (counts.courses || 0) > 0;
      const hasProdSim = (counts.simulationScenarios || 0) > 0;

      if (activeMode === 'firestore' || hasProdAcademy || hasProdSim) {
        if (hasProdAcademy && activeMode === 'firestore') {
          if (masterCollections.competencyDomains?.length > 0) {
            setDomains(
              masterCollections.competencyDomains.map((d: any) => {
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
              })
            );
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
                  associatedCourseIds: fallbackComp?.associatedCourseIds || [],
                };
              })
            );
          }
          if (masterCollections.courses?.length > 0) {
            setCourses(
              masterCollections.courses.map((c: any) => {
                const fallbackCourse = COURSES.find((fc) => fc.id === c.id || fc.code === c.code);
                const domainObj = COMPETENCY_DOMAINS.find((d) => d.id === c.domainId);
                return {
                  id: c.id,
                  code: c.code,
                  titleEn: c.titleEn,
                  titleVi: c.titleVi,
                  category: fallbackCourse?.category || domainObj?.nameEn || 'Hospitality Finance',
                  domainId: c.domainId,
                  difficulty:
                    Number(c.targetLevel) === 1
                      ? 'Foundation'
                      : Number(c.targetLevel) === 2
                      ? 'Operational'
                      : Number(c.targetLevel) === 3
                      ? 'Advanced'
                      : 'Strategic',
                  durationHours: Number(c.durationHours || fallbackCourse?.durationHours || 4),
                  instructorName: fallbackCourse?.instructorName || 'FC Academy Faculty',
                  instructorTitle: fallbackCourse?.instructorTitle || 'Hospitality Financial Controller',
                  prerequisites: fallbackCourse?.prerequisites || [],
                  prerequisitesEn: fallbackCourse?.prerequisitesEn,
                  learningObjectivesEn: fallbackCourse?.learningObjectivesEn || [c.descriptionEn || c.titleEn],
                  learningObjectivesVi: fallbackCourse?.learningObjectivesVi || [c.descriptionVi || c.titleVi],
                  modules: fallbackCourse?.modules || [],
                  passingScore: Number(c.passingScore || fallbackCourse?.passingScore || 80),
                  thumbnail: fallbackCourse?.thumbnail || '/assets/courses/usali.jpg',
                  isMandatoryForFC: Number(c.targetLevel) >= 3,
                  materials: fallbackCourse?.materials,
                  caseStudy: fallbackCourse?.caseStudy,
                  practicalAssignmentId: fallbackCourse?.practicalAssignmentId,
                  practicalAssignmentTitle: fallbackCourse?.practicalAssignmentTitle,
                  practicalAssignmentTitleEn: fallbackCourse?.practicalAssignmentTitleEn,
                  quizQuestionIds: fallbackCourse?.quizQuestionIds,
                  syllabus: fallbackCourse?.syllabus || COURSE_SYLLABI_BY_CODE[c.code],
                };
              })
            );
          }
          if (masterCollections.careerPaths?.length > 0) {
            setLearningPaths(
              masterCollections.careerPaths.map((p: any, idx: number) => {
                const fallbackPath = LEARNING_PATHS.find((lp) => lp.id === p.id || lp.code === p.code);
                const reqCourses = Array.isArray(p.requiredCourseIds) ? p.requiredCourseIds : [];
                return {
                  id: p.id,
                  code: p.code || `CP-${idx + 1}`,
                  titleEn: p.nameEn || p.titleEn || `${p.fromRole} → ${p.toRole}`,
                  titleVi: p.nameVi || p.titleVi || `${p.fromRole} → ${p.toRole}`,
                  targetRole: p.toRole || fallbackPath?.targetRole || 'Financial Controller',
                  descriptionEn: `${p.fromRole} → ${p.toRole} (${p.durationMonths || 6} months)`,
                  descriptionVi: `${p.fromRole} → ${p.toRole} (${p.durationMonths || 6} tháng)`,
                  totalHours: fallbackPath?.totalHours || Math.max(8, reqCourses.length * 4),
                  stages: fallbackPath?.stages || [
                    {
                      stageNumber: 1,
                      titleEn: p.nameEn || 'Core Track',
                      titleVi: p.nameVi || 'Lộ Trình Cốt Lõi',
                      requiredCourses: reqCourses,
                      requiredOjtAssignments: Array.isArray(p.requiredPracticalIds) ? p.requiredPracticalIds : [],
                      readinessCriteriaEn: `Minimum Assessment Score: ${p.minAssessmentScore || 80}%`,
                      readinessCriteriaVi: `Điểm đánh giá tối thiểu: ${p.minAssessmentScore || 80}%`,
                    },
                  ],
                };
              })
            );
          }
        }

        if (hasProdSim) {
          let sessionsDocs: SimulationSessionDoc[] = [];
          try {
            const sessSnap = await getFirestoreCollectionDocs('simulationSessions');
            sessionsDocs = sessSnap.docs as SimulationSessionDoc[];
          } catch {
            sessionsDocs = [];
          }
          setSimulatorData({
            hotelSimulationProfiles: masterCollections.hotelSimulationProfiles as HotelSimulationProfileDoc[],
            simulationScenarios: masterCollections.simulationScenarios as SimulationScenarioDoc[],
            simulationFinancialData: masterCollections.simulationFinancialData as SimulationFinancialRecordDoc[],
            simulationOperationalData: masterCollections.simulationOperationalData as SimulationOperationalRecordDoc[],
            simulationBusinessChallenges: masterCollections.simulationBusinessChallenges as SimulationBusinessChallengeDoc[],
            simulationTasks: masterCollections.simulationTasks as SimulationTaskDoc[],
            simulationReferenceAnalysis: masterCollections.simulationReferenceAnalysis as SimulationReferenceAnalysisDoc[],
            simulationDecisionOptions: masterCollections.simulationDecisionOptions as SimulationDecisionOptionDoc[],
            simulationRoleplayPrompts: masterCollections.simulationRoleplayPrompts as SimulationRoleplayPromptDoc[],
            simulationEvaluationRubrics: masterCollections.simulationEvaluationRubrics as SimulationEvaluationRubricDoc[],
            simulationCompetencyMappings: masterCollections.simulationCompetencyMappings as SimulationCompetencyMappingDoc[],
            simulationSessions: sessionsDocs,
          });
        }
      }
    } catch (err) {
      console.warn('Firestore refresh note:', err instanceof Error ? err.message : String(err));
    }
  }, [currentUser.role, dataSourceMode]);

  useEffect(() => {
    const unsub = subscribeFirebaseAuth(async (user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified) {
        const profile = await resolveAuthenticatedUserProfile(user);
        setFirebaseProfile(profile);
        await refreshFromFirestore();
      } else {
        setFirebaseProfile(null);
      }
    });
    return () => unsub();
  }, [refreshFromFirestore]);

  useEffect(() => {
    refreshSimulatorWorkspace();
  }, [refreshSimulatorWorkspace]);

  useEffect(() => {
    if (dataSourceMode === 'demo') {
      setDomains(COMPETENCY_DOMAINS);
      setCourses(COURSES);
      setLearningPaths(LEARNING_PATHS);
      setCompetencies(COMPETENCIES);
      refreshSimulatorData();
      refreshSimulatorWorkspace();
    } else {
      refreshFromFirestore();
      refreshSimulatorWorkspace();
    }
  }, [dataSourceMode, refreshFromFirestore, refreshSimulatorData, refreshSimulatorWorkspace]);

  const transitionScenarioStatus = async (
    scenarioId: string,
    status: SimulationScenarioStatus,
    note?: string
  ): Promise<boolean> => {
    try {
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
      if (auth.currentUser?.emailVerified) {
        await publishSimulationScenarioInFirestore(scenarioId, status, currentUser.name).catch(() => {});
      }
      setSimulatorData((prev) => ({
        ...prev,
        simulationScenarios: prev.simulationScenarios.map((s) =>
          s.id === scenarioId
            ? {
                ...s,
                ...(d.scenario || {}),
                status,
                isActive: status === 'Published',
              }
            : s
        ),
      }));
      refreshScenarioGovernance();
      refreshSimulatorWorkspace();
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

  const saveSimulationSession = async (
    payload: Partial<SimulationSessionDoc> & { scenarioId: string }
  ): Promise<SimulationSessionDoc | null> => {
    try {
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
      const saved: SimulationSessionDoc = data.session;
      if (auth.currentUser?.emailVerified && saved?.id) {
        await syncRecordToFirestore(
          'simulationSessions',
          saved.id,
          {
            ...saved,
            employeeUid: auth.currentUser.uid,
          },
          true
        ).catch(() => {});
      }
      setSimulatorData((prev) => ({
        ...prev,
        simulationSessions: [
          saved,
          ...prev.simulationSessions.filter((s) => s.id !== saved.id),
        ],
      }));
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
      const res = await fetch(`/api/simulator/sessions/${encodeURIComponent(sessionId)}/evaluate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to evaluate simulation session.', 'error');
        return null;
      }
      const savedSession: SimulationSessionDoc = data.session;
      const evalDoc: SimulationEvaluationDoc = data.evaluation;

      if (auth.currentUser?.emailVerified) {
        if (savedSession?.id) {
          syncRecordToFirestore(
            'simulationSessions',
            savedSession.id,
            { ...savedSession, employeeUid: auth.currentUser.uid },
            true
          ).catch(() => {});
        }
        if (evalDoc?.id) {
          syncRecordToFirestore(
            'simulationEvaluations',
            evalDoc.id,
            { ...evalDoc, learnerUid: auth.currentUser.uid },
            true
          ).catch(() => {});
        }
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
        aiFallbackUsed: Boolean(data.aiFallbackUsed),
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
      const res = await fetch(`/api/simulator/evaluations/${encodeURIComponent(evaluationId)}/review`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Assessor review denied.', 'error');
        return null;
      }
      if (auth.currentUser?.emailVerified && data.evaluation?.id) {
        syncRecordToFirestore('simulationEvaluations', data.evaluation.id, data.evaluation, true).catch(() => {});
      }
      await Promise.all([refreshSimulatorData(), refreshSimulatorWorkspace()]);
      showToast(
        language === 'vi'
          ? 'Đã lưu điều chỉnh điểm và nhận xét của Người đánh giá.'
          : 'Human assessor score adjustment saved.',
        'success'
      );
      return data.evaluation;
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
      if (auth.currentUser?.emailVerified && data.assignment?.id) {
        syncRecordToFirestore('simulationAssignments', data.assignment.id, data.assignment, true).catch(() => {});
      }
      await refreshSimulatorWorkspace();
      showToast(
        language === 'vi' ? 'Đã giao kịch bản mô phỏng cho học viên.' : 'Simulation scenario assigned to learner.',
        'success'
      );
      return data.assignment;
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
      const url = existingId
        ? `/api/simulator/scenarios/${encodeURIComponent(existingId)}`
        : '/api/simulator/scenarios';
      const res = await fetch(url, {
        method: existingId ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save scenario.', 'error');
        return null;
      }
      if (auth.currentUser?.emailVerified && data.scenario?.id) {
        syncRecordToFirestore('simulationScenarios', data.scenario.id, data.scenario, true).catch(() => {});
      }
      await Promise.all([refreshSimulatorData(), refreshSimulatorWorkspace()]);
      showToast(
        language === 'vi' ? 'Đã lưu kịch bản mô phỏng & bộ dữ liệu USALI.' : 'Scenario & USALI dataset saved.',
        'success'
      );
      return data.scenario;
    } catch (err: any) {
      showToast(err?.message || 'Failed to save scenario.', 'error');
      return null;
    }
  };

  const upsertHotelProfile = async (payload: any): Promise<HotelSimulationProfileDoc | null> => {
    try {
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
      if (auth.currentUser?.emailVerified && data.profile?.id) {
        syncRecordToFirestore('hotelSimulationProfiles', data.profile.id, data.profile, true).catch(() => {});
      }
      await refreshSimulatorData();
      showToast(
        language === 'vi' ? 'Đã lưu hồ sơ khách sạn mô phỏng.' : 'Hotel simulation profile saved.',
        'success'
      );
      return data.profile;
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

    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ userId: currentUser.id, courseId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enrollment) {
          setEnrollments((prev) => [
            data.enrollment,
            ...prev.filter((e) => !(e.userId === currentUser.id && e.courseId === courseId)),
          ]);
          if (auth.currentUser?.emailVerified) {
            syncRecordToFirestore('enrollments', data.enrollment.id, {
              ...data.enrollment,
              employeeUid: auth.currentUser.uid,
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('Enrollment persisted locally:', e);
    }
  };

  const updateCourseProgress = async (courseId: string, moduleId: string) => {
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
          const course = COURSES.find((c) => c.id === courseId);
          const totalModules = course?.modules.length || 1;
          const percent = Math.min(100, Math.round((completed.length / totalModules) * 100));
          return {
            ...enr,
            completedModules: completed,
            progressPercent: percent,
            status: percent === 100 ? 'completed' : 'in_progress',
            completedDate: percent === 100 ? new Date().toISOString().split('T')[0] : enr.completedDate,
          };
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
          setEnrollments((prev) =>
            prev.map((e) => (e.userId === currentUser.id && e.courseId === courseId ? data.enrollment : e))
          );
        }
      }
    } catch (e) {
      console.warn('Progress saved locally:', e);
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

    if (courseId) {
      setEnrollments((prev) =>
        prev.map((e) =>
          e.userId === currentUser.id && e.courseId === courseId
            ? { ...e, quizScore: Math.max(e.quizScore || 0, score) }
            : e
        )
      );
    }

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
      if (res.ok && auth.currentUser?.emailVerified) {
        const qData = await res.json();
        if (qData.attempt?.id) {
          syncRecordToFirestore('quizAttempts', qData.attempt.id, {
            ...qData.attempt,
            employeeUid: auth.currentUser.uid,
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Quiz attempt saved locally:', e);
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
          setSubmissions((prev) => [data.submission, ...prev.filter((s) => s.id !== newSub.id)]);
          if (auth.currentUser?.emailVerified) {
            syncRecordToFirestore('practicalSubmissions', data.submission.id, {
              ...data.submission,
              employeeUid: auth.currentUser.uid,
            }).catch(() => {});
          }
        }
        refreshAuditLogs();
      }
    } catch (e) {
      console.warn('OJT submission persisted locally:', e);
    }
  };

  const gradeAssignment = async (
    submissionId: string,
    score: number,
    feedback: string,
    status: 'approved' | 'revision_requested'
  ) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              score,
              feedback,
              status,
              reviewedBy: currentUser.name,
              reviewedDate: new Date().toISOString().split('T')[0],
            }
          : s
      )
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
      if (data.talentConfig) setTalentConfig(data.talentConfig);
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
      await refreshTalentData();
      refreshAuditLogs();
      return data.review;
    } catch (e: any) {
      showToast(e.message || 'Readiness review failed', 'error');
      return null;
    }
  };

  const t = translations[language];

  const mergedNotifications = [
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
        ojtAssignments: OJT_ASSIGNMENTS,
        submissions,
        learningPaths,
        assessments,
        idps,
        certificates,
        successionCandidates: SUCCESSION_CANDIDATES,
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
        updateUserCareerPath,
        selectedCourseForPlayer,
        setSelectedCourseForPlayer,
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
        firebaseUser,
        firebaseProfile,
        dataSourceMode,
        setDataSourceMode,
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
