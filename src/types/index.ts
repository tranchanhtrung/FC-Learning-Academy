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

