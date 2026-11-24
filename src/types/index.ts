export type UserRole =
  | 'super_admin'
  | 'lnd_manager'
  | 'financial_controller'
  | 'learner'
  | 'general_manager';

export type ProficiencyLevel = 1 | 2 | 3 | 4;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  requestedRole?: UserRole;
  position: string;
  department: string;
  property: string;
  avatar: string;
  supervisorId?: string;
  currentLevel: ProficiencyLevel;
  targetLevel: ProficiencyLevel;
  careerPathId?: string;
  joinedDate: string;
  status?: 'active' | 'disabled';
  disabledAt?: string;
  disabledBy?: string;
}

export interface CompetencyDomain {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  iconName: string;
  color: string;
}

export interface Competency {
  id: string;
  code: string;
  domainId: string;
  nameVi: string;
  nameEn: string;
  definitionVi: string;
  definitionEn: string;
  expectedLevelByPosition: Record<string, ProficiencyLevel>;
  assessmentCriteria: {
    level1: string;
    level2: string;
    level3: string;
    level4: string;
  };
  assessmentCriteriaEn?: {
    level1: string;
    level2: string;
    level3: string;
    level4: string;
  };
  evidenceRequirements: string[];
  evidenceRequirementsEn?: string[];
  associatedCourseIds: string[];
}

export interface CompetencyScore {
  competencyId: string;
  targetLevel: ProficiencyLevel;
  currentLevel: ProficiencyLevel;
  assessedBy: 'self' | 'supervisor' | 'exam' | 'ojt';
  assessmentDate: string;
  notes?: string;
}

export interface AssessmentRecord {
  id: string;
  learnerId: string;
  supervisorId: string;
  cycle: string;
  status: 'pending_self' | 'pending_supervisor' | 'completed' | 'approved';
  date: string;
  learnerReflection?: string;
  supervisorComments?: string;
  scores: Record<string, {
    selfLevel: ProficiencyLevel;
    supervisorLevel: ProficiencyLevel;
    gap: number;
    selfNotes?: string;
    supervisorNotes: string;
    supervisorNotesEn?: string;
    evidenceText?: string;
  }>;
  overallGapAverage: number;
  domainAverages?: Record<string, {
    targetAvg: number;
    selfAvg: number;
    supervisorAvg: number;
    gapAvg: number;
  }>;
  approvedDate?: string;
}

export interface IDPItem {
  id: string;
  competencyId: string;
  priority: 'High' | 'Medium' | 'Low';
  targetDate: string;
  recommendedCourseIds: string[];
  practicalActivity: string;
  practicalActivityEn?: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  mentorNotes?: string;
  mentorNotesEn?: string;
  evidenceNotes?: string;
  completedDate?: string;
}

export interface IndividualDevelopmentPlan {
  id: string;
  learnerId: string;
  createdDate: string;
  targetPosition: string;
  targetCompletionDate: string;
  status: 'Draft' | 'Active' | 'Under Review' | 'Completed';
  items: IDPItem[];
  approvedBy?: string;
  approvedDate?: string;
  overallGoal?: string;
  overallGoalEn?: string;
}

export interface CourseModule {
  id: string;
  titleVi: string;
  titleEn: string;
  durationMinutes: number;
  type: 'video' | 'reading' | 'excel_template' | 'case_study' | 'quiz';
  contentUrl?: string;
  notes?: string;
}

export interface CourseMaterial {
  id: string;
  title: string;
  titleEn?: string;
  type: 'excel' | 'pdf' | 'template' | 'checklist' | 'slide';
  fileSize: string;
  downloadUrl?: string;
  descriptionVi?: string;
  descriptionEn?: string;
}

export type LessonMaterialType =
  | 'pdf'
  | 'excel'
  | 'slide'
  | 'docx'
  | 'video'
  | 'checklist'
  | 'link'
  | 'other';

export type LessonMaterialStorageMode =
  | 'firestore_inline'
  | 'firebase_storage'
  | 'external_link';

export interface LessonMaterialDoc {
  id: string;
  courseId: string;
  courseCode: string;
  lessonId: string;
  lessonOrder: number;
  lessonTitleVi: string;
  lessonTitleEn: string;
  titleVi: string;
  titleEn: string;
  descriptionVi?: string;
  descriptionEn?: string;
  materialType: LessonMaterialType;
  storageMode: LessonMaterialStorageMode;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  fileSizeLabel: string;
  inlineBase64?: string;
  downloadUrl?: string;
  storagePath?: string;
  externalUrl?: string;
  isRequired: boolean;
  uploadedByUid: string;
  uploadedByName: string;
  uploadedByEmail?: string;
  uploadedByRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseCaseStudy {
  id: string;
  titleVi: string;
  titleEn: string;
  propertyContext: string;
  propertyContextEn?: string;
  scenarioVi: string;
  scenarioEn: string;
  keyChallengeVi: string;
  keyChallengeEn: string;
  suggestedSolutionVi: string;
  suggestedSolutionEn: string;
}

export interface CourseSyllabusSession {
  sessionNumber: number;
  titleVi: string;
  titleEn: string;
  durationHours: number;
  format: 'Video Masterclass' | 'Live Workshop' | 'Excel Lab' | 'Case Simulation' | 'Capstone & Exam';
  learningOutcomesVi: string[];
  learningOutcomesEn: string[];
  topicsVi: string[];
  topicsEn: string[];
  keyStandardsAndFormulas: string[];
  practicalLabVi: string;
  practicalLabEn: string;
  deliverablesVi: string[];
  deliverablesEn: string[];
}

export interface CourseAssessmentWeighting {
  quizWeight: number;
  caseStudyWeight: number;
  practicalOjtWeight: number;
  passingScore: number;
}

export interface CourseSyllabus {
  courseCode: string;
  overviewVi: string;
  overviewEn: string;
  targetAudienceVi: string;
  targetAudienceEn: string;
  careerTrackStageVi: string;
  careerTrackStageEn: string;
  competencyCodes: string[];
  deliveryFormatVi: string;
  deliveryFormatEn: string;
  totalContactHours: number;
  totalSelfStudyHours: number;
  assessmentBreakdown: CourseAssessmentWeighting;
  preWorkVi: string;
  preWorkEn: string;
  referencesAndStandards: string[];
  capstoneDeliverableVi: string;
  capstoneDeliverableEn: string;
  sessions: CourseSyllabusSession[];
}

export interface Course {
  id: string;
  code: string;
  titleVi: string;
  titleEn: string;
  category: string;
  domainId: string;
  difficulty: 'Foundation' | 'Operational' | 'Advanced' | 'Strategic';
  durationHours: number;
  instructorName: string;
  instructorTitle: string;
  prerequisites: string[];
  prerequisitesEn?: string[];
  learningObjectivesVi: string[];
  learningObjectivesEn: string[];
  modules: CourseModule[];
  passingScore: number;
  thumbnail: string;
  isMandatoryForFC: boolean;
  materials?: CourseMaterial[];
  caseStudy?: CourseCaseStudy;
  practicalAssignmentId?: string;
  practicalAssignmentTitle?: string;
  practicalAssignmentTitleEn?: string;
  quizQuestionIds?: string[];
  syllabus?: CourseSyllabus;
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  progressPercent: number;
  completedModules: string[];
  status: 'not_started' | 'in_progress' | 'completed';
  enrolledDate: string;
  completedDate?: string;
  quizScore?: number;
}

export interface QuizQuestion {
  id: string;
  courseId?: string;
  domainId: string;
  competencyCode: string;
  questionVi: string;
  questionEn: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'numerical';
  optionsVi: string[];
  optionsEn: string[];
  correctAnswer: string | string[];
  correctAnswerEn?: string | string[];
  explanationVi: string;
  explanationEn: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  courseId?: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  date: string;
  answers: Record<string, string | string[]>;
}

export interface OJTAssignment {
  id: string;
  code: string;
  titleVi: string;
  titleEn: string;
  domainId: string;
  propertyContext: string;
  propertyContextEn?: string;
  descriptionVi: string;
  descriptionEn: string;
  deliverablesVi: string[];
  deliverablesEn: string[];
  templateFileName?: string;
  evaluationRubric: {
    criterionVi: string;
    criterionEn: string;
    maxPoints: number;
  }[];
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  submittedDate: string;
  status: 'submitted' | 'under_review' | 'approved' | 'revision_requested';
  submissionNotes: string;
  fileName?: string;
  fileSize?: string;
  score?: number;
  feedback?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  aiGraded?: boolean;
}

export interface LearningPath {
  id: string;
  code: string;
  titleVi: string;
  titleEn: string;
  targetRole: string;
  fromRole?: string;
  toRole?: string;
  domainIds?: string[];
  targetLevel?: ProficiencyLevel;
  durationMonths?: number;
  minAssessmentScore?: number;
  requiredCompetencyCodes?: string[];
  descriptionVi: string;
  descriptionEn: string;
  totalHours: number;
  stages: {
    stageNumber: number;
    titleVi: string;
    titleEn: string;
    domainIds?: string[];
    requiredCompetencyCodes?: string[];
    requiredCourses: string[];
    requiredOjtAssignments: string[];
    readinessCriteriaVi: string;
    readinessCriteriaEn: string;
  }[];
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  userId: string;
  level: 1 | 2 | 3 | 4 | 5;
  titleVi: string;
  titleEn: string;
  issueDate: string;
  expiryDate?: string;
  status: 'Active' | 'Expired' | 'Revoked';
  verificationCode: string;
  authorizedSigner: string;
  authorizedSignerTitle: string;
}

export interface SuccessionCandidate {
  userId: string;
  currentRole: string;
  targetRole: string;
  readiness: 'Ready Now' | 'Ready in 1-2 Years' | 'Ready in 3+ Years' | 'Developing';
  competencyScorePercent: number;
  completedOJTCount: number;
  certLevel: number;
  mentorName: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
  details: string;
}

// ============================================================================
// COMPETENCY GAP ENGINE & INDIVIDUAL DEVELOPMENT PLAN (IDP) MODULE TYPES
// ============================================================================

export type AssessorType =
  | 'self'
  | 'supervisor'
  | 'financial_controller'
  | 'hr_lnd'
  | 'final_validated';

export type CompetencyAssessmentStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected';

export interface CompetencyResultEntry {
  competencyId: string;
  competencyCode: string;
  domainId: string;
  currentLevel: ProficiencyLevel | null; // null = unassessed
  targetLevel: ProficiencyLevel;
  gap: number;
  selfLevel?: ProficiencyLevel | null;
  supervisorLevel?: ProficiencyLevel | null;
  assessorNotes?: string;
  evidenceText?: string;
}

export interface CompetencyAssessmentDoc {
  id: string;
  version: number;
  supersedesId?: string;
  employeeId: string;
  employeeUid?: string;
  employeeName: string;
  property: string;
  department: string;
  currentPosition: string;
  targetPosition: string;
  assessmentPeriod: string; // e.g., "2026-Q2"
  assessorId: string;
  assessorUid?: string;
  assessorName: string;
  assessorType: AssessorType;
  status: CompetencyAssessmentStatus;
  submittedAt?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  overallComments?: string;
  results: Record<string, CompetencyResultEntry>; // keyed by competencyCode
  createdAt: string;
  updatedAt: string;
}

export type DevelopmentCategory =
  | 'A_Formal_Learning'
  | 'B_On_The_Job'
  | 'C_Practical_Assignment'
  | 'D_Coaching_Mentoring'
  | 'E_Self_Learning';

export type ActivityType702010 = '70_experiential' | '20_social' | '10_formal';

export type DevelopmentActivityStatus =
  | 'planned'
  | 'in_progress'
  | 'evidence_submitted'
  | 'completed'
  | 'cancelled';

export type ActivityValidationStatus =
  | 'not_required'
  | 'pending_validation'
  | 'approved'
  | 'revision_requested';

export interface DevelopmentActivityDoc {
  id: string;
  idpId?: string;
  objectiveId?: string;
  employeeId: string;
  employeeUid?: string;
  competencyId: string;
  competencyCode: string;
  domainId: string;
  category: DevelopmentCategory;
  ratioCategory: ActivityType702010;
  titleEn: string;
  titleVi: string;
  descriptionEn: string;
  descriptionVi: string;
  sourceType: 'course' | 'practical_assignment' | 'ojt' | 'coaching' | 'rubric_self_study' | 'custom_lnd';
  sourceRecordId?: string;
  sourceCode?: string;
  targetLevel: ProficiencyLevel;
  estimatedHours: number;
  dueDate: string;
  status: DevelopmentActivityStatus;
  validationStatus: ActivityValidationStatus;
  evidenceRequired: boolean;
  evidenceNotes?: string;
  evidenceFileName?: string;
  evidenceUrl?: string;
  validatedById?: string;
  validatedByName?: string;
  validatedAt?: string;
  validatorFeedback?: string;
  assignedById: string;
  assignedByName: string;
  createdAt: string;
  updatedAt: string;
}

export type IdpWorkflowStatus =
  | 'draft'
  | 'submitted'
  | 'manager_review'
  | 'lnd_approved'
  | 'active'
  | 'in_progress'
  | 'completed'
  | 'reassessment'
  | 'closed';

export interface DevelopmentObjective {
  id: string;
  competencyId: string;
  competencyCode: string;
  domainId: string;
  baselineLevel: ProficiencyLevel;
  targetLevel: ProficiencyLevel;
  gap: number;
  isCritical: boolean;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  titleEn: string;
  titleVi: string;
  category: DevelopmentCategory;
  ratioCategory: ActivityType702010;
  linkedCourseId?: string;
  linkedCourseCode?: string;
  linkedPracticalId?: string;
  linkedPracticalCode?: string;
  activityIds: string[];
  targetDate: string;
  successMeasure: string;
  status: 'not_started' | 'in_progress' | 'pending_validation' | 'completed';
  progressPercent: number;
  evidenceNotes?: string;
  evidenceFileName?: string;
  supervisorValidationStatus: ActivityValidationStatus;
  supervisorValidatedBy?: string;
  supervisorValidatedAt?: string;
  completedAt?: string;
}

export interface IndividualDevelopmentPlanDoc {
  id: string;
  version: number;
  employeeId: string;
  employeeUid?: string;
  employeeName: string;
  property: string;
  department: string;
  currentPosition: string;
  targetPosition: string;
  sourceAssessmentId: string;
  sourceAssessmentPeriod: string;
  managerId: string;
  managerUid?: string;
  managerName: string;
  status: IdpWorkflowStatus;
  periodStart: string;
  periodEnd: string;
  overallGoalEn: string;
  overallGoalVi: string;
  ratioTarget: {
    experiential70: number;
    social20: number;
    formal10: number;
  };
  objectives: DevelopmentObjective[];
  submittedAt?: string;
  managerReviewedBy?: string;
  managerReviewedAt?: string;
  lndApprovedBy?: string;
  lndApprovedAt?: string;
  activatedAt?: string;
  completedAt?: string;
  closedAt?: string;
  rejectionNotes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdpReviewLogDoc {
  id: string;
  idpId: string;
  employeeId: string;
  action:
    | 'CREATED'
    | 'UPDATED'
    | 'SUBMITTED'
    | 'MANAGER_APPROVED'
    | 'LND_APPROVED'
    | 'ACTIVATED'
    | 'RETURNED_FOR_REVISION'
    | 'PROGRESS_UPDATED'
    | 'EVIDENCE_VALIDATED'
    | 'COMPLETED'
    | 'REASSESSMENT_TRIGGERED'
    | 'CLOSED';
  fromStatus?: string;
  toStatus: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  comment: string;
  timestamp: string;
}

export interface ReassessmentItemComparison {
  competencyCode: string;
  competencyNameEn: string;
  competencyNameVi: string;
  domainId: string;
  beforeLevel: number;
  afterLevel: number;
  targetLevel: number;
  delta: number;
  remainingGap: number;
  evidenceRef?: string;
}

export interface CompetencyReassessmentDoc {
  id: string;
  employeeId: string;
  employeeUid?: string;
  employeeName: string;
  idpId: string;
  baselineAssessmentId: string;
  newApprovedAssessmentId?: string;
  targetPosition: string;
  reassessmentDate: string;
  assessorId: string;
  assessorName: string;
  assessorRole: UserRole;
  beforeAchievementPct: number;
  afterAchievementPct: number;
  netImprovementPct: number;
  gapsClosedCount: number;
  remainingGapsCount: number;
  items: ReassessmentItemComparison[];
  summaryFeedback: string;
  createdAt: string;
}

export type CareerReadinessStatus =
  | 'Not Ready'
  | 'Developing'
  | 'Nearly Ready'
  | 'Ready for Review';

export interface CareerReadinessReviewDoc {
  id: string;
  employeeId: string;
  employeeUid?: string;
  employeeName: string;
  property: string;
  department: string;
  currentPosition: string;
  targetPosition: string;
  sourceAssessmentId: string;
  sourceIdpId?: string;
  computedStatus: CareerReadinessStatus;
  finalStatus: CareerReadinessStatus;
  achievementPct: number;
  weightedAchievementPct: number;
  idpCompletionPct: number;
  criticalAchievementPct: number;
  criticalBlockers: string[];
  recommendedNextSteps: string[];
  reviewerId: string;
  reviewerName: string;
  reviewerRole: UserRole;
  reviewNotes: string;
  reviewedAt: string;
}

export interface CompetencyConfigOverride {
  competencyCode: string;
  weightPercent: number;
  isCritical: boolean;
  positionTargets?: Record<string, ProficiencyLevel>;
}

export interface TalentConfigDoc {
  id: string;
  weightMode: 'default_equal' | 'custom_weighted';
  competencyOverrides: Record<string, CompetencyConfigOverride>;
  customPositionTargets: Record<string, Record<string, ProficiencyLevel>>;
  ratio702010: {
    experiential: number;
    social: number;
    formal: number;
  };
  readinessThresholds: {
    readyForReviewMinAchievement: number; // e.g., 90
    readyForReviewMinIdp: number; // e.g., 80
    readyForReviewMinCritical: number; // e.g., 85
    nearlyReadyMinAchievement: number; // e.g., 75
    nearlyReadyMinIdp: number; // e.g., 60
    developingMinAchievement: number; // e.g., 50
    requireAllCriticalAtTarget: boolean; // default true
  };
  updatedBy: string;
  updatedAt: string;
}

export interface LmsNotificationItem {
  id: string;
  recipientId: string; // 'all' or userId
  type: 'idp_submitted' | 'idp_approved' | 'idp_feedback' | 'due_soon' | 'reassessment' | 'readiness' | 'activity_validated';
  title: string;
  message: string;
  relatedId?: string;
  time: string;
  read: boolean;
}

// ============================================================================
// FIREBASE AUTH PROFILE & FC BUSINESS PARTNER SIMULATOR TYPES
// ============================================================================

export interface FirebaseUserProfileDoc {
  uid: string;
  employeeId: string;
  email: string;
  name: string;
  role: UserRole;
  requestedRole?: UserRole;
  position?: string;
  department?: string;
  property?: string;
  avatar?: string;
  supervisorId?: string;
  supervisorUid?: string;
  currentLevel?: ProficiencyLevel;
  targetLevel?: ProficiencyLevel;
  careerPathId?: string;
  joinedDate?: string;
  status?: 'active' | 'disabled';
  disabledAt?: string;
  disabledBy?: string;
  isAdmin?: boolean;
  emailVerified?: boolean;
  updatedAt: string;
}

export interface HotelSimulationProfileDoc {
  id: string;
  hotelCode: string;
  hotelName: string;
  brandTier: string;
  city: string;
  roomsAvailable: number;
  totalKeys: number;
  fcPositionLevel: string;
  currency: string;
  importedAt?: string;
  importBatchId?: string;
}

export type SimulatorScenarioCategory =
  | 'GOP & Hotel Financial Performance'
  | 'Revenue Forecasting & Budgeting'
  | 'Cost Control & Profitability'
  | 'Departmental Performance'
  | 'GM Business Advisory'
  | 'Executive Meeting & Strategic Finance';

export type SimulatorDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type SimulatorPersona =
  | 'General Manager'
  | 'Director of Operations'
  | 'Director of Sales & Marketing'
  | 'Executive Chef / F&B Director'
  | 'Corporate Finance Reviewer';

export type CoachMode =
  | 'guided_learning'
  | 'challenge_mode'
  | 'executive_mode'
  | 'reflection_mode';

export type SimulationScenarioKind = 'standard' | 'rolling_forecast' | 'capex';

export type SimulationScenarioStatus = 'Draft' | 'Validated' | 'Published' | 'Archived';

export interface SimulationScenarioDoc {
  id: string;
  scenarioCode: string;
  hotelId: string;
  titleEn: string;
  titleVi: string;
  summaryEn: string;
  summaryVi: string;
  category?: SimulatorScenarioCategory;
  difficultyLabel?: SimulatorDifficulty;
  difficultyLevel: ProficiencyLevel;
  targetRole: string;
  recommendedPositionIds?: string[];
  competencyIds?: string[];
  periodLabel: string;
  estimatedDurationMinutes?: number;
  learningObjectivesEn?: string[];
  learningObjectivesVi?: string[];
  requiredKnowledgeEn?: string[];
  requiredKnowledgeVi?: string[];
  expectedOutputsEn?: string[];
  expectedOutputsVi?: string[];
  usaliReferenceLabel?: string;
  scenarioKind?: SimulationScenarioKind;
  defaultPersona?: SimulatorPersona;
  languageOptions?: Array<'vi' | 'en'>;
  datasetVersion?: string;
  versionNumber?: number;
  isActive?: boolean;
  status: SimulationScenarioStatus;
  validatedBy?: string;
  validatedAt?: string;
  publishedBy?: string;
  publishedAt?: string;
  unpublishedBy?: string;
  unpublishedAt?: string;
  archivedBy?: string;
  archivedAt?: string;
  sourceImportJobId?: string;
  importedAt?: string;
  importBatchId?: string;
  updatedAt?: string;
}

export interface SimulationFinancialRecordDoc {
  id: string;
  scenarioId: string;
  hotelProfileId?: string;
  periodLabel: string;
  version?: string; // Actual | Budget | Forecast | Last Year
  departmentCode: string;
  departmentName: string;
  unit?: string;
  metricType?: string; // Revenue | Expense | Profit | Margin | Statistical
  departmentalRevenue: number;
  departmentalExpenses: number;
  departmentalProfit: number;
  totalOperatingRevenue: number;
  totalDepartmentalExpenses: number;
  totalUndistributedExpenses: number;
  gop: number;
  gopMarginPct: number;
  roomsRevenue: number;
  budgetGop?: number;
  varianceAmount?: number;
  variancePct?: number;
  varianceClassification?: 'Favorable' | 'Unfavorable' | 'Neutral';
  importedAt?: string;
  importBatchId?: string;
}

export interface SimulationOperationalRecordDoc {
  id: string;
  scenarioId: string;
  hotelProfileId?: string;
  periodLabel: string;
  version?: string;
  roomsAvailable: number;
  roomsSold: number;
  roomsRevenue: number;
  occupancyPct: number;
  adr: number;
  revpar: number;
  fbCovers?: number;
  laborHours?: number;
  overtimeHours?: number;
  gssScore?: number;
  importedAt?: string;
  importBatchId?: string;
}

export interface SimulationBusinessChallengeDoc {
  id: string;
  scenarioId: string;
  challengeCode: string;
  titleEn: string;
  titleVi: string;
  descriptionEn: string;
  descriptionVi: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  impactArea: string;
  importedAt?: string;
  importBatchId?: string;
}

export interface SimulationTaskDoc {
  id: string;
  scenarioId: string;
  taskId?: string;
  taskOrder: number;
  titleEn: string;
  titleVi: string;
  instructionsEn: string;
  instructionsVi: string;
  deliverableType: string;
  maxPoints: number;
  importedAt?: string;
  importBatchId?: string;
}

export interface SimulationReferenceAnalysisDoc {
  id: string;
  scenarioId: string;
  topic: string;
  rootCauseEn: string;
  rootCauseVi: string;
  benchmarkFormula: string;
  recommendedActionEn: string;
  recommendedActionVi: string;
  importedAt?: string;
  importBatchId?: string;
}

export interface SimulationDecisionOptionDoc {
  id: string;
  scenarioId: string;
  optionCode: string;
  titleEn: string;
  titleVi: string;
  financialImpactEstimate: number;
  gopImpactPct: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  isOptimal: boolean;
  rationaleEn: string;
  rationaleVi: string;
  importedAt?: string;
  importBatchId?: string;
}

export interface SimulationRoleplayPromptDoc {
  id: string;
  scenarioId: string;
  roleplayId?: string;
  turnOrder: number;
  speakerRole: string;
  promptEn: string;
  promptVi: string;
  expectedFocusPoints: string;
  importedAt?: string;
  importBatchId?: string;
}

export interface SimulationEvaluationRubricDoc {
  id: string;
  scenarioId: string;
  criterionCode: string;
  criterionNameEn: string;
  criterionNameVi: string;
  weightPercent: number;
  maxScore: number;
  passingScore: number;
  importedAt?: string;
  importBatchId?: string;
}

export interface SimulationCompetencyMappingDoc {
  id: string;
  scenarioId: string;
  competencyId: string;
  workbookCompetencyId?: string;
  competencyCode?: string;
  competencyNameEn?: string;
  domainId?: string;
  targetProficiencyLevel: ProficiencyLevel;
  weightPercent: number;
  isPrimary: boolean;
  importedAt?: string;
  importBatchId?: string;
}

export type SimulatorImportStrategy = 'skip' | 'update' | 'insert_new' | 'reject';

export type SimulatorValidationBadge =
  | 'VALID'
  | 'WARNING'
  | 'INVALID'
  | 'DUPLICATE'
  | 'MISSING REFERENCE'
  | 'READY TO IMPORT';

export interface SimulatorFinancialCheckResult {
  id: string;
  scenarioId: string;
  sheet: string;
  row: number;
  periodLabel: string;
  version: string;
  departmentCode: string;
  formulaName: string;
  formulaExpression: string;
  reportedValue: number;
  expectedValue: number;
  difference: number;
  tolerance: number;
  passed: boolean;
  severity: 'error' | 'warning';
  varianceClassification?: 'Favorable' | 'Unfavorable' | 'Neutral';
  message: string;
}

export interface SimulatorScenarioPreviewSummary {
  scenarioId: string;
  scenarioCode: string;
  hotelId: string;
  hotelName: string;
  titleEn: string;
  titleVi: string;
  summaryEn: string;
  summaryVi: string;
  difficultyLevel: ProficiencyLevel;
  targetRole: string;
  periodLabel: string;
  status: SimulationScenarioStatus;
  badge: SimulatorValidationBadge;
  isDuplicate: boolean;
  errorCount: number;
  warningCount: number;
  rubricWeightSum: number;
  decisionOptionsCount: number;
  childCounts: {
    financialRows: number;
    operationalRows: number;
    challenges: number;
    tasks: number;
    referenceAnalyses: number;
    decisionOptions: number;
    roleplayPrompts: number;
    rubrics: number;
    competencyMappings: number;
  };
  financialChecks: SimulatorFinancialCheckResult[];
  sampleFinancialRows: SimulationFinancialRecordDoc[];
  sampleOperationalRows: SimulationOperationalRecordDoc[];
  tasks: SimulationTaskDoc[];
  challenges: SimulationBusinessChallengeDoc[];
  decisionOptions: SimulationDecisionOptionDoc[];
  roleplayPrompts: SimulationRoleplayPromptDoc[];
  rubrics: SimulationEvaluationRubricDoc[];
  competencyMappings: SimulationCompetencyMappingDoc[];
  referenceAnalyses: SimulationReferenceAnalysisDoc[];
}

export interface ScenarioImportJobDoc {
  id: string;
  fileName: string;
  fileSizeBytes?: number;
  uploadedByUid?: string;
  uploadedByEmail?: string;
  uploadedByName?: string;
  uploadedByRole?: string;
  performedById?: string;
  performedByName?: string;
  performedByEmail?: string;
  importMode?: SimulatorImportStrategy;
  strategy?: SimulatorImportStrategy;
  targetDestination?: 'firestore' | 'firebase_admin' | 'firebase_client' | 'demo_local';
  mode?: string;
  status:
    | 'validating'
    | 'validated'
    | 'importing'
    | 'paused'
    | 'interrupted'
    | 'completed'
    | 'completed_with_errors'
    | 'partial_failure'
    | 'failed';
  toleranceUsed?: number;
  totalSheetsDetected?: number;
  totalRowsDetected?: number;
  totalRows?: number;
  totalScenariosDetected?: number;
  validCount?: number;
  validRows?: number;
  invalidCount?: number;
  warningCount: number;
  errorCount?: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  totalChunks?: number;
  completedChunks?: number;
  checkpointSpecIdx?: number;
  checkpointBatchIdx?: number;
  lastProcessedCollection?: string;
  scenarioIdsAffected?: string[];
  canResume?: boolean;
  summaryStats?: {
    financialChecksRun: number;
    financialChecksPassed: number;
    unmappedCompetenciesCount: number;
  };
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
}

export interface ScenarioImportErrorDoc {
  id: string;
  jobId: string;
  sheetName: string;
  collectionName?: string;
  rowNumber: number;
  recordId: string;
  scenarioId?: string;
  field?: string;
  fieldName?: string;
  errorCode?: string;
  severity: 'error' | 'warning';
  message: string;
  rawRowSnapshot?: string;
  createdAt: string;
}

export interface ScenarioVersionDoc {
  id: string;
  scenarioId: string;
  scenarioCode: string;
  versionNumber: number;
  datasetVersion: string;
  status: SimulationScenarioStatus;
  isActive?: boolean;
  changeSummary: string;
  sourceImportJobId?: string;
  importJobId?: string;
  createdBy?: string;
  createdAt?: string;
  changedById?: string;
  changedByName?: string;
  changedByRole?: string;
  changedAt?: string;
  snapshotSummary?: {
    hotelId: string;
    titleEn: string;
    titleVi: string;
    difficultyLevel?: ProficiencyLevel;
    financialRows?: number;
    financialRowCount?: number;
    operationalRows?: number;
    tasksCount?: number;
    decisionOptionsCount?: number;
    roleplayTurnsCount?: number;
    rubricsCount?: number;
    competencyIds: string[];
    totalRevenueActual?: number;
    gopActual?: number;
    budgetGop?: number;
    gopMarginPctActual?: number;
  };
}

export interface ScenarioCompetencyMappingDoc {
  id: string; // sanitized workbookCompetencyId
  workbookCompetencyId: string;
  lmsCompetencyId: string;
  lmsCompetencyCode?: string;
  lmsCompetencyName?: string;
  targetCompetencyId?: string;
  targetCompetencyCode?: string;
  targetCompetencyNameEn?: string;
  targetCompetencyNameVi?: string;
  domainId?: string;
  verifiedBy?: string;
  verifiedById?: string;
  verifiedByName?: string;
  verifiedAt: string;
  notes?: string;
}

// Versioned Hotel Data Engine Snapshot (Actual, Budget, Forecast, Last Year)
export type FinancialStatementVersionKey = 'actual' | 'budget' | 'forecast' | 'lastYear';

export interface HotelStatementColumns {
  // A. Rooms Division
  availableRooms: number;
  occupiedRooms: number;
  occupancyPct: number;
  adr: number;
  revpar: number;
  roomsRevenue: number;
  complimentaryRooms: number;
  houseUseRooms: number;
  cancelledRooms: number;
  otaSharePct: number;
  directSharePct: number;
  corporateSharePct: number;
  distributionCost: number;
  roomsPayroll: number;
  roomsOtherExpenses: number;
  roomsExpenses: number;
  roomsProfit: number;
  // B. Food & Beverage
  restaurantRevenue: number;
  barRevenue: number;
  banquetRevenue: number;
  fbRevenue: number;
  foodRevenue: number;
  beverageRevenue: number;
  foodCost: number;
  beverageCost: number;
  foodCostPct: number;
  beverageCostPct: number;
  fbPayroll: number;
  fbOtherOpEx: number;
  fbExpenses: number;
  fbProfit: number;
  // C. Other Operating Departments
  spaRevenue: number;
  recreationRevenue: number;
  otherDeptRevenue: number;
  otherOperatingRevenue: number;
  otherDeptDirectExpenses: number;
  otherDeptProfit: number;
  // D. Undistributed Operating Expenses
  adminAndGeneral: number;
  salesAndMarketing: number;
  propertyOperationsMaintenance: number;
  utilities: number;
  totalUndistributedExpenses: number;
  // E. Hotel Profitability
  totalOperatingRevenue: number;
  totalDepartmentalExpenses: number;
  totalDepartmentalProfit: number;
  gop: number;
  gopMarginPct: number;
  managementFees: number;
  nonOperatingItems: number;
  ebitda: number;
  totalLaborCost: number;
  laborCostPct: number;
}

export interface CapexAssumptions {
  equipmentNameEn: string;
  equipmentNameVi: string;
  initialInvestment: number;
  usefulLifeYears: number;
  annualMaintenanceCost: number;
  annualEnergySavings: number;
  annualLaborSavings: number;
  annualIncrementalRevenue: number;
  discountRatePct: number;
  financingNoteEn: string;
  financingNoteVi: string;
}

export interface RollingForecastMonthInput {
  monthLabel: string;
  availableRooms: number;
  budgetOccupancyPct: number;
  budgetAdr: number;
  bookingPacePct: number;
  cancellationRatePct: number;
  groupRoomsBooked: number;
  suggestedBaseOccPct: number;
  suggestedBaseAdr: number;
  suggestedUpsideOccPct: number;
  suggestedUpsideAdr: number;
  suggestedDownsideOccPct: number;
  suggestedDownsideAdr: number;
  fbCapturePerOccupiedRoom: number;
  variableCostRatio: number;
  fixedOperatingExpenses: number;
}

export interface HotelSimulationDatasetSnapshot {
  datasetId: string;
  scenarioId: string;
  hotelSimulationId: string;
  hotelName: string;
  hotelType: string;
  numberOfRooms: number;
  numberOfOutlets: number;
  marketSegment: string;
  currency: string;
  reportingPeriod: string;
  reportingBasis: string;
  usaliLicenseReference?: string;
  budgetAssumptions: string;
  operationalAssumptions: string;
  datasetVersion: string;
  generatedAt: string;
  periods: Record<FinancialStatementVersionKey, HotelStatementColumns>;
  monthlySeries?: Array<{
    monthLabel: string;
    actualRev: number;
    budgetRev: number;
    actualGop: number;
    budgetGop: number;
    gopMarginPct: number;
  }>;
  capexAssumptions?: CapexAssumptions;
  rollingForecastInputs?: RollingForecastMonthInput[];
}

export interface CalculationAuditItem {
  metricKey: string;
  labelEn: string;
  labelVi: string;
  formula: string;
  denominatorDefinition: string;
  actualValue: number | null;
  budgetValue: number | null;
  variance: number | null;
  variancePct: number | null;
  unit: 'currency' | 'percent' | 'rooms' | 'years' | 'ratio';
  accountNature: 'revenue' | 'profit' | 'expense' | 'kpi_higher_better' | 'kpi_lower_better';
  classification: 'Favorable' | 'Unfavorable' | 'Neutral' | 'N/A';
  explanationEn: string;
  explanationVi: string;
}

export interface LearnerAnalysisWorkspace {
  significantVariances: string;
  rootCauseDepartments: string[];
  symptomsVsRootCauses: string;
  quantifiedFinancialImpact: string;
  risksAndOpportunities: string;
  alternativeSolutions: string;
  submittedOccPct?: string;
  submittedAdr?: string;
  submittedGopMarginPct?: string;
  submittedFoodCostPct?: string;
  rollingForecastUserScenarios?: Array<{
    monthLabel: string;
    baseOccPct: number;
    baseAdr: number;
    upsideOccPct: number;
    upsideAdr: number;
    downsideOccPct: number;
    downsideAdr: number;
  }>;
  capexUserInputs?: {
    paybackYears?: string;
    roiPct?: string;
    npv?: string;
    irrPct?: string;
  };
}

export interface LearnerDecisionWorkspace {
  selectedOptionIds: string[];
  recommendedAction: string;
  rationale: string;
  estimatedFinancialImpact: string;
  implementationTiming: string;
  responsibleDepartments: string;
  risksAndMitigation: string;
  followupKpis: string;
}

export interface LearnerExecutiveReport {
  language: 'vi' | 'en';
  executiveSummary: string;
  keyFinancialFindings: string;
  rootCauseAnalysis: string;
  recommendedActions: string;
  financialImpact: string;
  riskAssessment: string;
  implementationPlan: string;
  requiredManagementDecision: string;
}

export interface SimulationRoleplayConfig {
  persona: SimulatorPersona;
  difficulty: SimulatorDifficulty;
  maxQuestions: number;
  language: 'vi' | 'en';
  challengeIntensity: 'Supportive' | 'Balanced' | 'Rigorous';
  timeLimitMinutes: number;
  coachMode: CoachMode;
}

export interface SimulationEvaluationCriterionScore {
  criterionCode: string;
  criterionNameEn: string;
  criterionNameVi: string;
  weightPercent: number;
  score: number;
  behavioralLevel: ProficiencyLevel;
  behavioralAnchor: string;
  evidence: string;
  feedback: string;
}

export interface SimulationEvaluationDoc {
  id: string;
  sessionId: string;
  scenarioId: string;
  learnerId: string;
  learnerUid?: string;
  scoringCriteria: SimulationEvaluationCriterionScore[];
  totalScore: number;
  adjustedTotalScore?: number;
  adjustmentReason?: string;
  assessorType: 'deterministic_plus_ai' | 'human_reviewed';
  strengths: string[];
  improvementAreas: string[];
  missedOpportunities: string[];
  calculationErrors: string[];
  recommendations: string[];
  recommendedCompetencies: Array<{
    competencyId: string;
    competencyCode: string;
    suggestedLevel: ProficiencyLevel;
    rationale: string;
    requiresHumanApproval: true;
  }>;
  recommendedCourseIds: string[];
  recommendedPracticalIds: string[];
  suggestedIdpObjectives: Array<{
    competencyCode: string;
    titleEn: string;
    titleVi: string;
    linkedCourseId?: string;
    linkedPracticalId?: string;
  }>;
  advisoryDisclaimer: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewedAt?: string;
  assessorComments?: string;
  createdAt: string;
}

export interface SimulationAssignmentDoc {
  id: string;
  scenarioId: string;
  learnerId: string;
  assignedById: string;
  assignedByName: string;
  dueDate: string;
  mandatory: boolean;
  note?: string;
  status: 'assigned' | 'in_progress' | 'completed';
  assignedAt: string;
}

export interface SimulationAuditLogDoc {
  id: string;
  sessionId?: string;
  scenarioId?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface SimulationSessionDoc {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  hotelSimulationId?: string;
  employeeId: string;
  employeeUid: string;
  language?: 'vi' | 'en';
  difficulty?: SimulatorDifficulty;
  currentStep?: number;
  datasetVersion?: string;
  versionNumber?: number;
  datasetSnapshot?: HotelSimulationDatasetSnapshot;
  analysisNotes?: string;
  analysisWorkspace?: LearnerAnalysisWorkspace;
  decisionWorkspace?: LearnerDecisionWorkspace;
  executiveReport?: LearnerExecutiveReport;
  roleplayConfig?: SimulationRoleplayConfig;
  selectedOptionIds: string[];
  learnerAnalysis: string;
  conversation: Array<{ role: 'gm' | 'user' | 'coach'; persona?: string; text: string; timestamp?: string }>;
  evaluation?: Record<string, any>;
  evaluationId?: string;
  finalScore?: number;
  competencyResults?: Array<{ competencyCode: string; suggestedLevel: ProficiencyLevel }>;
  feedbackSummary?: string;
  evidenceUrl?: string;
  status: 'in_progress' | 'completed';
  startedAt: string;
  submittedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export type PermissionCategory = 'modules' | 'governance' | 'workflows';

export type PermissionKey =
  | 'view_dashboard'
  | 'view_my_learning'
  | 'view_learning_paths'
  | 'view_courses'
  | 'view_competency_framework'
  | 'view_assessments'
  | 'view_talent_suite'
  | 'view_ojt_projects'
  | 'view_ai_assistant'
  | 'view_simulator'
  | 'view_certifications'
  | 'view_reports'
  | 'view_administration'
  | 'manage_users_rbac'
  | 'configure_role_permissions'
  | 'access_data_import_center'
  | 'access_sim_import_center'
  | 'manage_sim_admin'
  | 'manage_competency_framework'
  | 'manage_lesson_materials'
  | 'switch_dashboard_perspective'
  | 'view_all_learners_data'
  | 'assess_team_members'
  | 'manage_team_idp'
  | 'grade_ojt_submissions'
  | 'issue_certificates'
  | 'preview_draft_scenarios';

export interface PermissionDefinition {
  key: PermissionKey;
  category: PermissionCategory;
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  riskTier: 'standard' | 'elevated' | 'critical';
  lockedForSuperAdmin?: boolean;
}

export type RolePermissionsMap = Record<UserRole, PermissionKey[]>;

export interface RolePermissionPolicyDoc {
  id: UserRole;
  role: UserRole;
  permissions: PermissionKey[];
  descriptionEn?: string;
  descriptionVi?: string;
  updatedByUid?: string;
  updatedByName?: string;
  updatedAt: string;
}

// ============================================================================
// ADMIN WEBSITE CONTROL CENTER (PRICING, COMBOS, ANNOUNCEMENTS, ADS, APPROVALS)
// ============================================================================

export interface CoursePriceOverride {
  courseId: string;
  priceVnd: number;
  originalPriceVnd?: number;
  isFree?: boolean;
  published?: boolean;
  updatedAt: string;
}

export interface CourseComboPackage {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  badgeVi?: string;
  badgeEn?: string;
  courseIds: string[];
  priceVnd: number;
  durationDays: number | null; // null = lifetime
  isActive: boolean;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteAnnouncement {
  id: string;
  titleVi: string;
  titleEn: string;
  messageVi: string;
  messageEn: string;
  severity: 'info' | 'success' | 'warning' | 'urgent';
  targetRoles: ('all' | UserRole)[];
  showTopBar: boolean;
  showInBell: boolean;
  ctaLabelVi?: string;
  ctaLabelEn?: string;
  ctaTargetTab?: string;
  ctaUrl?: string;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteAdBanner {
  id: string;
  titleVi: string;
  titleEn: string;
  subtitleVi: string;
  subtitleEn: string;
  badgeText?: string;
  imageUrl?: string;
  theme: 'navy_gold' | 'emerald' | 'royal_blue' | 'crimson';
  placement: 'dashboard_banner' | 'courses_banner' | 'popup_modal';
  ctaLabelVi: string;
  ctaLabelEn: string;
  ctaActionType: 'tab' | 'combo' | 'course' | 'external_url';
  ctaTarget: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export type MaterialApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface MaterialApprovalRecord {
  materialId: string;
  status: MaterialApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface SiteGeneralSettings {
  siteName: string;
  taglineVi: string;
  taglineEn: string;
  supportEmail: string;
  supportHotline: string;
  maintenanceMode: boolean;
  maintenanceMessageVi: string;
  requireMaterialApproval: boolean;
  allowSelfRegistration: boolean;
  vietQrBankBin: string;
  vietQrAccountNo: string;
  vietQrAccountName: string;
}

export interface SiteAdminConfigDoc {
  id: string;
  coursePrices: Record<string, CoursePriceOverride>;
  combos: CourseComboPackage[];
  announcements: SiteAnnouncement[];
  ads: SiteAdBanner[];
  materialApprovals: Record<string, MaterialApprovalRecord>;
  general: SiteGeneralSettings;
  updatedBy?: string;
  updatedAt: string;
}
