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
  position: string;
  department: string;
  property: string;
  avatar: string;
  supervisorId?: string;
  currentLevel: ProficiencyLevel;
  targetLevel: ProficiencyLevel;
  careerPathId?: string;
  joinedDate: string;
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
  evidenceRequirements: string[];
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
  status: 'Not Started' | 'In Progress' | 'Completed';
  mentorNotes?: string;
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
  type: 'excel' | 'pdf' | 'template' | 'checklist' | 'slide';
  fileSize: string;
  downloadUrl?: string;
  descriptionVi?: string;
  descriptionEn?: string;
}

export interface CourseCaseStudy {
  id: string;
  titleVi: string;
  titleEn: string;
  propertyContext: string;
  scenarioVi: string;
  scenarioEn: string;
  keyChallengeVi: string;
  keyChallengeEn: string;
  suggestedSolutionVi: string;
  suggestedSolutionEn: string;
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
  quizQuestionIds?: string[];
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
  descriptionVi: string;
  descriptionEn: string;
  totalHours: number;
  stages: {
    stageNumber: number;
    titleVi: string;
    titleEn: string;
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


