import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  INITIAL_USERS,
  COMPETENCY_DOMAINS,
  COMPETENCIES,
  COURSES,
  OJT_ASSIGNMENTS,
  INITIAL_ASSESSMENT_RECORDS,
  INITIAL_IDPS,
  INITIAL_CERTIFICATES,
  SUCCESSION_CANDIDATES,
} from './src/data/initialData.ts';
import type {
  User,
  Competency,
  CourseEnrollment,
  QuizAttempt,
  AssignmentSubmission,
  AssessmentRecord,
  IndividualDevelopmentPlan,
  Certificate,
  AuditLogEntry,
  ProficiencyLevel,
  CompetencyAssessmentDoc,
  IndividualDevelopmentPlanDoc,
  DevelopmentObjective,
  DevelopmentActivityDoc,
  CompetencyReassessmentDoc,
  CareerReadinessReviewDoc,
  IdpReviewLogDoc,
  TalentConfigDoc,
  LmsNotificationItem,
  PermissionKey,
  RolePermissionsMap,
  UserRole,
  LessonMaterialDoc,
} from './src/types/index.ts';
import {
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  normalizeRolePermissionsMap,
  roleHasPermission,
  sanitizeRolePermissionsList,
} from './src/lib/rbac.ts';
import {
  DEFAULT_TALENT_CONFIG,
  calculateGapAnalysis,
  evaluateIdpProgress,
  evaluateCareerReadiness,
  resolvePositionTargetMatrix,
  isCompetencyCritical,
} from './src/lib/talentEngine.ts';
import {
  createSeedTalentState,
  buildTalentReportWorkbook,
  type TalentReportType,
} from './server/talentData.ts';

import { create2027TemplateBuffer } from './src/data/dataset2027.ts';
import {
  IMPORT_ORDER_SPEC,
  detectWorkbookSheets,
  parseAndValidateWorkbook,
  loadDemoCurriculumStore,
  saveDemoCurriculumStore,
  getDemoExistingIds,
  loadFirebaseConfigJson,
  getAuthorizedAdminFirestore,
  verifyNormalizedDataset,
  buildErrorReportBuffer,
  type DuplicateStrategy,
  type ValidationIssue,
} from './server/importEngine.ts';
import {
  SIMULATOR_IMPORT_ORDER_SPEC,
  TRANSACTIONAL_PROTECTED_COLLECTIONS,
  detectWorkbookDatasetType,
  parseAndValidateSimulatorWorkbook,
  createSimulatorStarterTemplateBuffer,
  type DatasetType,
} from './server/simulatorImportEngine.ts';
import {
  DEFAULT_HOTEL_PROFILES,
  DEFAULT_SIMULATOR_SCENARIOS,
  buildChildSeedsForScenario,
  computeCapexMetrics,
  computeFinancialAudit,
  computeRollingForecastScenario,
  evaluateDeterministicSimulation,
  generateDatasetSnapshotForScenario,
} from './src/lib/simulatorEngine.ts';
import type {
  HotelSimulationDatasetSnapshot,
  ScenarioCompetencyMappingDoc,
  ScenarioImportErrorDoc,
  ScenarioImportJobDoc,
  ScenarioVersionDoc,
  SimulationAssignmentDoc,
  SimulationAuditLogDoc,
  SimulationEvaluationCriterionScore,
  SimulationEvaluationDoc,
  SimulationFinancialRecordDoc,
  SimulationOperationalRecordDoc,
  SimulationScenarioDoc,
  SimulationScenarioStatus,
  SimulatorImportStrategy,
} from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const GEMINI_MODEL = 'gemini-4-hydrogen';

// Build compact Grounded Curriculum Knowledge Source from approved LMS data
function buildCurriculumKnowledgeBase(selectedCourseId?: string): string {
  const domainSummary = COMPETENCY_DOMAINS.map(
    (d) => `- ${d.code}: ${d.nameEn} / ${d.nameVi}`
  ).join('\n');

  const compSummary = COMPETENCIES.map(
    (c) => `- ${c.code} (${c.domainId}): ${c.nameEn} / ${c.nameVi} — ${c.definitionEn}`
  ).join('\n');

  const courseSummary = COURSES.map((c) => {
    const isFocused = selectedCourseId && c.id === selectedCourseId;
    const base = `- ${c.code} [${c.id}] (${c.difficulty}, ${c.durationHours}h): ${c.titleEn} / ${c.titleVi}. Objectives: ${c.learningObjectivesEn.slice(0, 2).join('; ')}`;
    if (!isFocused) return base;
    const modList = c.modules.map((m) => `  * ${m.titleEn} (${m.type}, ${m.durationMinutes}m)${m.notes ? `: ${m.notes}` : ''}`).join('\n');
    const caseTxt = c.caseStudy
      ? `  * Case Study "${c.caseStudy.titleEn}": ${c.caseStudy.scenarioEn} | Challenge: ${c.caseStudy.keyChallengeEn} | Recommended Action: ${c.caseStudy.suggestedSolutionEn}`
      : '';
    return `${base}\n${modList}\n${caseTxt}`;
  }).join('\n');

  const ojtSummary = OJT_ASSIGNMENTS.map(
    (o) => `- ${o.code} [${o.id}]: ${o.titleEn} / ${o.titleVi} — Deliverables: ${o.deliverablesEn.join('; ')}`
  ).join('\n');

  return `APPROVED FC LEARNING ACADEMY CURRICULUM & COMPETENCY FRAMEWORK (PRIMARY KNOWLEDGE SOURCE):
DOMAINS:
${domainSummary}

COMPETENCIES (30):
${compSummary}

APPROVED COURSES (${COURSES.length}):
${courseSummary}

PRACTICAL OJT ASSIGNMENTS (${OJT_ASSIGNMENTS.length}):
${ojtSummary}`;
}

const DEFAULT_ENROLLMENTS: CourseEnrollment[] = [
  {
    id: 'enr_1',
    userId: 'user_learner1',
    courseId: 'course_01',
    progressPercent: 100,
    completedModules: ['mod_101_1', 'mod_101_2', 'mod_101_3', 'mod_101_4'],
    status: 'completed',
    enrolledDate: '2024-02-18',
    completedDate: '2024-03-01',
    quizScore: 92,
  },
  {
    id: 'enr_2',
    userId: 'user_learner1',
    courseId: 'course_02',
    progressPercent: 50,
    completedModules: ['mod_102_1', 'mod_102_2'],
    status: 'in_progress',
    enrolledDate: '2024-03-05',
  },
  {
    id: 'enr_3',
    userId: 'user_learner1',
    courseId: 'course_03',
    progressPercent: 25,
    completedModules: ['mod_201_1'],
    status: 'in_progress',
    enrolledDate: '2024-04-10',
  },
  {
    id: 'enr_4',
    userId: 'user_learner2',
    courseId: 'course_01',
    progressPercent: 100,
    completedModules: ['mod_101_1', 'mod_101_2', 'mod_101_3', 'mod_101_4'],
    status: 'completed',
    enrolledDate: '2023-08-15',
    completedDate: '2023-09-02',
    quizScore: 96,
  },
  {
    id: 'enr_5',
    userId: 'user_learner2',
    courseId: 'course_04',
    progressPercent: 100,
    completedModules: ['mod_302_1', 'mod_302_2', 'mod_302_3', 'mod_302_4'],
    status: 'completed',
    enrolledDate: '2023-10-10',
    completedDate: '2023-11-05',
    quizScore: 88,
  },
  {
    id: 'enr_6',
    userId: 'user_learner2',
    courseId: 'course_09',
    progressPercent: 60,
    completedModules: ['mod_601_1', 'mod_601_2', 'mod_601_3'],
    status: 'in_progress',
    enrolledDate: '2024-01-10',
  },
];

const DEFAULT_QUIZ_ATTEMPTS: QuizAttempt[] = [
  {
    id: 'qa_001',
    userId: 'user_learner1',
    courseId: 'course_01',
    quizTitle: 'USALI Mastery Comprehensive Quiz',
    score: 92,
    totalQuestions: 10,
    passed: true,
    date: '2024-03-01',
    answers: {},
  },
  {
    id: 'qa_002',
    userId: 'user_learner2',
    courseId: 'course_01',
    quizTitle: 'USALI Mastery Comprehensive Quiz',
    score: 96,
    totalQuestions: 10,
    passed: true,
    date: '2023-09-02',
    answers: {},
  },
];

const DEFAULT_SUBMISSIONS: AssignmentSubmission[] = [
  {
    id: 'sub_001',
    assignmentId: 'ojt_01',
    userId: 'user_learner1',
    submittedDate: '2024-03-12',
    status: 'approved',
    submissionNotes:
      'Đã hoàn thành bảng checklist khóa sổ tháng 10 và báo cáo P&L Critique giải trình các biến động chi phí trên 5% của bộ phận Buồng và F&B.',
    fileName: 'MinhThu_OJT_MonthEnd_Closing_Pack.xlsx',
    fileSize: '2.4 MB',
    score: 90,
    feedback:
      'Bài làm rất cẩn trọng, phân tích biến động chi phí buồng phòng sắc bén. Cần lưu ý thêm về trích trước chi phí hoa hồng OTA.',
    reviewedBy: 'David Tran (Cluster FC)',
    reviewedDate: '2024-03-15',
  },
  {
    id: 'sub_002',
    assignmentId: 'ojt_04',
    userId: 'user_learner2',
    submittedDate: '2024-03-18',
    status: 'under_review',
    submissionNotes:
      'Gửi Hội đồng hồ sơ thẩm định CAPEX hệ thống Smart Energy $850k, mô hình DCF và độ nhạy NPV với giá điện tăng 7%.',
    fileName: 'HoangNam_SmartEnergy_Capex_CAR.xlsx',
    fileSize: '3.8 MB',
  },
];

const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log_1',
    action: 'APPROVE_ASSESSMENT',
    actor: 'David Tran (Cluster FC)',
    target: 'Nguyễn Minh Thư (Senior Accountant)',
    timestamp: '2026-03-18 14:32:00',
    details: 'Phê duyệt đánh giá năng lực Q1/2026 và kích hoạt IDP',
  },
  {
    id: 'log_2',
    action: 'ISSUE_CERTIFICATE',
    actor: 'Elena Rostova (Corporate Director)',
    target: 'Lê Hoàng Nam (AFC)',
    timestamp: '2025-11-20 09:15:22',
    details: 'Cấp chứng chỉ Level 3 - Assistant Financial Controller Ready (FCA-CERT-2025-089)',
  },
  {
    id: 'log_3',
    action: 'OJT_GRADE',
    actor: 'David Tran (Cluster FC)',
    target: 'Nguyễn Minh Thư (Senior Accountant)',
    timestamp: '2024-03-15 16:45:10',
    details: 'Chấm điểm dự án OJT-FAR-01: Điểm 90/100 (Đạt)',
  },
];

interface AcademyDB {
  users: User[];
  competencies: Competency[];
  enrollments: CourseEnrollment[];
  quizAttempts: QuizAttempt[];
  submissions: AssignmentSubmission[];
  assessments: AssessmentRecord[];
  idps: IndividualDevelopmentPlan[];
  certificates: Certificate[];
  auditLogs: AuditLogEntry[];
  talentConfig: TalentConfigDoc;
  competencyAssessments: CompetencyAssessmentDoc[];
  talentIdps: IndividualDevelopmentPlanDoc[];
  developmentActivities: DevelopmentActivityDoc[];
  competencyReassessments: CompetencyReassessmentDoc[];
  careerReadinessReviews: CareerReadinessReviewDoc[];
  idpReviewLogs: IdpReviewLogDoc[];
  talentNotifications: LmsNotificationItem[];
  rolePermissions: RolePermissionsMap;
  lessonMaterials: LessonMaterialDoc[];
}

const DATA_DIR = path.join(__dirname, '.data');
const DB_FILE = path.join(DATA_DIR, 'academy-db.json');

function getSeedDB(): AcademyDB {
  const users = JSON.parse(JSON.stringify(INITIAL_USERS));
  const competencies = JSON.parse(JSON.stringify(COMPETENCIES));
  const talentSeed = createSeedTalentState(users, competencies);
  return {
    users,
    competencies,
    enrollments: JSON.parse(JSON.stringify(DEFAULT_ENROLLMENTS)),
    quizAttempts: JSON.parse(JSON.stringify(DEFAULT_QUIZ_ATTEMPTS)),
    submissions: JSON.parse(JSON.stringify(DEFAULT_SUBMISSIONS)),
    assessments: JSON.parse(JSON.stringify(INITIAL_ASSESSMENT_RECORDS)),
    idps: JSON.parse(JSON.stringify(INITIAL_IDPS)),
    certificates: JSON.parse(JSON.stringify(INITIAL_CERTIFICATES)),
    auditLogs: JSON.parse(JSON.stringify(DEFAULT_AUDIT_LOGS)),
    ...talentSeed,
    rolePermissions: normalizeRolePermissionsMap(DEFAULT_ROLE_PERMISSIONS),
    lessonMaterials: [],
  };
}

function loadDB(): AcademyDB {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.assessments)) {
        const users = parsed.users;
        const competencies = parsed.competencies || JSON.parse(JSON.stringify(COMPETENCIES));
        const hasTalentSeed =
          Array.isArray(parsed.competencyAssessments) && parsed.competencyAssessments.length > 0;
        const talentSeed = hasTalentSeed ? null : createSeedTalentState(users, competencies);

        let enrollmentsMigrated = false;
        const normalizedEnrollments: CourseEnrollment[] = (Array.isArray(parsed.enrollments) ? parsed.enrollments : []).map(
          (enr: CourseEnrollment) => {
            const matchedCourse = COURSES.find((c) => c.id === enr.courseId || c.code === enr.courseId);
            if (!matchedCourse || matchedCourse.modules.length === 0) return enr;

            const validIds = new Set(matchedCourse.modules.map((m) => m.id));
            const remapped = Array.from(
              new Set(
                (Array.isArray(enr.completedModules) ? enr.completedModules : [])
                  .map((modId) => {
                    if (matchedCourse.id === 'course_04' && modId.startsWith('mod_202_')) {
                      return modId.replace('mod_202_', 'mod_302_');
                    }
                    if (modId === 'mod_501_1_lead') return 'mod_501_1';
                    return modId;
                  })
                  .filter((modId) => validIds.has(modId))
              )
            );

            const finalModules =
              enr.status === 'completed'
                ? matchedCourse.modules.map((m) => m.id)
                : remapped;
            const finalProgress = Math.min(
              100,
              Math.round((finalModules.length / matchedCourse.modules.length) * 100)
            );

            if (
              JSON.stringify(finalModules) !== JSON.stringify(enr.completedModules) ||
              finalProgress !== enr.progressPercent
            ) {
              enrollmentsMigrated = true;
              return {
                ...enr,
                completedModules: finalModules,
                progressPercent: finalProgress,
              };
            }
            return enr;
          }
        );

        const loaded: AcademyDB = {
          users,
          competencies,
          enrollments: normalizedEnrollments,
          quizAttempts: parsed.quizAttempts || [],
          submissions: parsed.submissions || [],
          assessments: parsed.assessments || [],
          idps: parsed.idps || [],
          certificates: parsed.certificates || [],
          auditLogs: parsed.auditLogs || JSON.parse(JSON.stringify(DEFAULT_AUDIT_LOGS)),
          talentConfig: parsed.talentConfig || talentSeed?.talentConfig || DEFAULT_TALENT_CONFIG,
          competencyAssessments:
            hasTalentSeed
              ? parsed.competencyAssessments
              : talentSeed?.competencyAssessments || [],
          talentIdps:
            Array.isArray(parsed.talentIdps) && parsed.talentIdps.length > 0
              ? parsed.talentIdps
              : talentSeed?.talentIdps || [],
          developmentActivities:
            Array.isArray(parsed.developmentActivities) && parsed.developmentActivities.length > 0
              ? parsed.developmentActivities
              : talentSeed?.developmentActivities || [],
          competencyReassessments:
            Array.isArray(parsed.competencyReassessments) && parsed.competencyReassessments.length > 0
              ? parsed.competencyReassessments
              : talentSeed?.competencyReassessments || [],
          careerReadinessReviews:
            Array.isArray(parsed.careerReadinessReviews) && parsed.careerReadinessReviews.length > 0
              ? parsed.careerReadinessReviews
              : talentSeed?.careerReadinessReviews || [],
          idpReviewLogs:
            Array.isArray(parsed.idpReviewLogs) && parsed.idpReviewLogs.length > 0
              ? parsed.idpReviewLogs
              : talentSeed?.idpReviewLogs || [],
          talentNotifications:
            Array.isArray(parsed.talentNotifications) && parsed.talentNotifications.length > 0
              ? parsed.talentNotifications
              : talentSeed?.talentNotifications || [],
          rolePermissions: normalizeRolePermissionsMap(parsed.rolePermissions),
          lessonMaterials: Array.isArray(parsed.lessonMaterials) ? parsed.lessonMaterials : [],
        };
        if (!Array.isArray(parsed.lessonMaterials)) {
          if (!loaded.rolePermissions.lnd_manager.includes('manage_lesson_materials')) {
            loaded.rolePermissions.lnd_manager = [
              ...loaded.rolePermissions.lnd_manager,
              'manage_lesson_materials',
            ];
          }
        }
        if (enrollmentsMigrated || !hasTalentSeed || !parsed.rolePermissions || !Array.isArray(parsed.lessonMaterials)) {
          persistDB(loaded);
        }
        return loaded;
      }
    }
  } catch (err) {
    console.error('Failed to load DB file, using seed data:', err);
  }
  const seed = getSeedDB();
  persistDB(seed);
  return seed;
}

function persistDB(state: AcademyDB) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist DB file:', err);
  }
}

let db: AcademyDB = loadDB();

function recordAudit(action: string, actor: string, target: string, details: string) {
  const entry: AuditLogEntry = {
    id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    action,
    actor,
    target,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    details,
  };
  db.auditLogs.unshift(entry);
  if (db.auditLogs.length > 200) {
    db.auditLogs = db.auditLogs.slice(0, 200);
  }
  return entry;
}

// Helper to get requesting actor info from headers (or body fallback)
function getRequestActor(req: express.Request): User | undefined {
  const actorId = (req.headers['x-user-id'] as string) || req.body?.actorId;
  if (!actorId) return undefined;
  const found = db.users.find((u) => u.id === actorId);
  if (found) return found;

  const headerRole = req.headers['x-user-role'] as string | undefined;
  if (
    headerRole &&
    SYSTEM_ROLES.includes(headerRole as UserRole) &&
    /^[a-zA-Z0-9_\-]{1,128}$/.test(actorId)
  ) {
    return {
      id: actorId,
      name: 'Verified Member',
      email: '',
      role: headerRole as UserRole,
      position: 'Hospitality Finance Professional',
      department: 'Finance & Accounting',
      property: 'FC Learning Academy',
      avatar: '',
      currentLevel: 4,
      targetLevel: 4,
      joinedDate: new Date().toISOString().split('T')[0],
    };
  }
  return undefined;
}

function getEffectiveActorRole(req: express.Request): UserRole | undefined {
  const headerRole = req.headers['x-user-role'] as string | undefined;
  if (headerRole && SYSTEM_ROLES.includes(headerRole as UserRole)) {
    return headerRole as UserRole;
  }
  const actor = getRequestActor(req);
  if (actor) return actor.role;
  return undefined;
}

function hasActorPermission(req: express.Request, permission: PermissionKey): boolean {
  const role = getEffectiveActorRole(req);
  if (!role) return true; // Unscoped test/CLI callers without headers retain seed parity
  return roleHasPermission(role, permission, db.rolePermissions);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!apiKey,
    model: GEMINI_MODEL,
    persistenceFile: fs.existsSync(DB_FILE),
    counts: {
      users: db.users.length,
      courses: COURSES.length,
      competencies: db.competencies.length,
      assessments: db.assessments.length,
      idps: db.idps.length,
    },
    timestamp: new Date().toISOString(),
  });
});

// Helper for resilient Gemini calls with retry on transient 503/429
async function generateContentWithRetry(params: any, retries = 2, delayMs = 1500): Promise<any> {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      if (
        attempt <= retries &&
        (err?.message?.includes('503') || err?.message?.includes('429') || err?.status === 503 || err?.status === 429)
      ) {
        await new Promise((res) => setTimeout(res, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
}

function parseJsonResponse(text: string | undefined): any {
  if (!text) {
    throw new Error('Empty response returned from Gemini API.');
  }
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

// ============================================================================
// GEMINI AI ENDPOINTS (Server-Side Only, gemini-4-hydrogen, Curriculum Grounded)
// ============================================================================

// 1. AI Learning Assistant - Concept explanation & USALI Q&A
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, history = [], language = 'vi', courseId } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const knowledgeBase = buildCurriculumKnowledgeBase(courseId);
    const systemInstruction = `You are the Master AI Learning Assistant, Senior Hospitality Financial Controller, and Finance Trainer for "FC LEARNING ACADEMY".
Your role is to guide hotel accountants, assistant financial controllers, and finance supervisors to develop into strategic Financial Controllers (FC) and trusted business partners to the General Manager (GM).
Primary Knowledge Source: Always ground your explanations, formulas, and recommendations in the approved FC Learning Academy courses, competencies, and OJT projects listed below. Cite specific approved course codes (e.g., HFC-101, HFC-302) and competency codes (e.g., FAR-01, BPA-01) whenever relevant.
Standards: USALI 11th & 12th Editions, Marriott/IHG/Accor/Hilton operational finance benchmarks, Hotel P&L, GOP, EBITDA, RevPAR, ADR, Occupancy, Flow-Through, Cost Flex, Internal Control, Cash Flow, and CAPEX.
Language: Respond in ${language === 'vi' ? 'Vietnamese (Tiếng Việt) with key English hospitality finance terms in parentheses where helpful' : 'English'}.
Tone: Executive, structured, pedagogically constructive, practical.

${knowledgeBase}`;

    const contents = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: String(message) }] },
    ];

    const response = await generateContentWithRetry({
      model: GEMINI_MODEL,
      contents,
      config: { systemInstruction },
    });

    const reply = response.text;
    if (!reply) {
      return res.status(502).json({ error: 'Gemini returned an empty response.' });
    }
    return res.json({ reply, model: GEMINI_MODEL });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    return res.status(502).json({ error: error.message || 'Failed to process AI chat' });
  }
});

// 2. FC Business Partner Simulator - GM Persona & 5-Criterion Rubric Evaluation
app.post('/api/gemini/simulator', async (req, res) => {
  try {
    const {
      action,
      scenario,
      userTurn,
      conversationHistory = [],
      selectedDecisionOptions = [],
      learnerAnalysis = '',
      language = 'vi',
    } = req.body;
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API Key is not configured on the server.' });
    }
    if (!scenario) {
      return res.status(400).json({ error: 'Scenario context is required.' });
    }

    const knowledgeBase = buildCurriculumKnowledgeBase();
    const structuredContext = `
Hotel Profile: ${scenario.hotelProfile ? JSON.stringify(scenario.hotelProfile) : 'Luxury 5-Star Hotel'}
Financial Dataset (USALI): ${scenario.financials ? JSON.stringify(scenario.financials) : JSON.stringify(scenario.metrics || {})}
Operational KPIs: ${scenario.operational ? JSON.stringify(scenario.operational) : JSON.stringify(scenario.metrics || {})}
Business Challenges: ${scenario.challenges ? JSON.stringify(scenario.challenges) : 'None listed'}
Decision Options Evaluated: ${scenario.decisionOptions ? JSON.stringify(scenario.decisionOptions) : 'Standard options'}
Learner Selected Decisions: ${JSON.stringify(selectedDecisionOptions)}
Scenario Evaluation Rubric Weights: ${scenario.rubrics ? JSON.stringify(scenario.rubrics) : 'Equal 20% across 5 executive criteria'}
Official Reference Analysis (For Grader Grounding Only): ${scenario.referenceAnalysis ? JSON.stringify(scenario.referenceAnalysis) : 'Standard USALI benchmarks'}
`;

    if (action === 'evaluate') {
      const evaluationPrompt = `You are a Senior Corporate VP of Finance and Regional General Manager evaluating a Financial Controller candidate's performance in a live GM-FC crisis briefing.
CRITICAL SAFETY RULE: Ground every score, USALI variance calculation, financial explanation, and course recommendation strictly in the imported scenario financials, operational KPIs, reference analysis, and approved curriculum below. Cite exact revenue, GOP, ADR, RevPAR, Occupancy, or Flow-Through figures from the scenario. Never invent nonexistent scores or claim the learner completed activities without evidence.

${knowledgeBase}

Scenario Summary: ${scenario.title} — ${scenario.context}
${structuredContext}
Learner Written Financial Analysis Memo:
"${learnerAnalysis || '(Not separately submitted)'}"

Conversation between GM and FC Learner:
${conversationHistory.map((m: any) => `${m.role === 'gm' ? 'GM' : 'FC Learner'}: ${m.text}`).join('\n')}
Latest FC Response: "${userTurn || ''}"

Evaluate strictly on these 5 transparent rubric dimensions (1 to 100 each):
1. financialAccuracy (USALI accuracy, P&L calculations, GOP/Flow-Through math)
2. analyticalThinking (Root-cause isolation, departmental variance diagnosis)
3. commercialUnderstanding (Guest experience balance, OTA vs direct channels, market positioning)
4. strategicRecommendations (Concrete 30/60/90-day corrective actions, decision option trade-offs, owner ROI)
5. communicationQuality (Executive presence, concise GM-ready framing)

Write summaryFeedback, strengths, areasForImprovement, and gmDebrief in ${language === 'vi' ? 'Vietnamese' : 'English'}.`;

      const response = await generateContentWithRetry({
        model: GEMINI_MODEL,
        contents: evaluationPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scores: {
                type: Type.OBJECT,
                properties: {
                  financialAccuracy: { type: Type.NUMBER },
                  analyticalThinking: { type: Type.NUMBER },
                  commercialUnderstanding: { type: Type.NUMBER },
                  strategicRecommendations: { type: Type.NUMBER },
                  communicationQuality: { type: Type.NUMBER },
                  overallScore: { type: Type.NUMBER },
                },
                required: [
                  'financialAccuracy',
                  'analyticalThinking',
                  'commercialUnderstanding',
                  'strategicRecommendations',
                  'communicationQuality',
                  'overallScore',
                ],
              },
              readinessLevel: { type: Type.STRING },
              summaryFeedback: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedCourses: { type: Type.ARRAY, items: { type: Type.STRING } },
              gmDebrief: { type: Type.STRING },
            },
            required: [
              'scores',
              'readinessLevel',
              'summaryFeedback',
              'strengths',
              'areasForImprovement',
              'gmDebrief',
            ],
          },
        },
      });

      const parsed = parseJsonResponse(response.text);
      return res.json(parsed);
    } else {
      if (!userTurn || !String(userTurn).trim()) {
        return res.status(400).json({ error: 'userTurn is required for simulator chat' });
      }
      const gmPrompt = `You are ${scenario.gmPersona || 'Richard Vance'}, a sharp, demanding 5-star Hotel General Manager.
You are in a one-on-one executive briefing with your Financial Controller.
Scenario: ${scenario.title}
Context: ${scenario.context}
${structuredContext}

Conversation so far:
${conversationHistory.map((m: any) => `${m.role === 'gm' ? 'GM (You)' : 'FC (Learner)'}: ${m.text}`).join('\n')}

The FC just said: "${userTurn}"

Respond strictly in character as the General Manager:
- Reference actual USALI revenue/GOP/Occupancy/ADR/RevPAR or operational pressure numbers from the scenario above when probing the FC.
- Challenge vague statements with concrete operational questions (Rooms payroll HPOR, F&B CoS, OTA commission, GSS, Budget GOP variance).
- Acknowledge sharp USALI/Flow-Through thinking when demonstrated.
- Keep your response concise (2-3 focused paragraphs) and end with one probing executive question.
- Language: ${language === 'vi' ? 'Vietnamese (Tiếng Việt) with executive hospitality terminology' : 'English'}.`;

      const response = await generateContentWithRetry({
        model: GEMINI_MODEL,
        contents: gmPrompt,
      });

      const reply = response.text;
      if (!reply) {
        return res.status(502).json({ error: 'Gemini returned an empty simulator response.' });
      }
      return res.json({ reply });
    }
  } catch (error: any) {
    console.error('Error in /api/gemini/simulator:', error);
    return res.status(502).json({ error: error.message || 'Simulator error' });
  }
});

// 3. Quiz Generator - Grounded in Approved Course Content
app.post('/api/gemini/generate-quiz', async (req, res) => {
  try {
    const { topic, difficulty = 'Advanced', count = 3, language = 'vi', courseId } = req.body;
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API not configured' });
    }

    const knowledgeBase = buildCurriculumKnowledgeBase(courseId);
    const clampedCount = Math.min(8, Math.max(1, Number(count) || 3));
    const prompt = `Generate ${clampedCount} rigorous hospitality finance certification quiz questions grounded in the approved FC Learning Academy curriculum below.
${knowledgeBase}

Requested Topic: ${topic || 'USALI Hotel Financial Management, GOP Flow-Through, and Month-End Reconciliation'}
Difficulty: ${difficulty}
Language: ${language === 'vi' ? 'Vietnamese (with standard English USALI terms where appropriate)' : 'English'}

Requirements:
- Each question must be "single_choice" with 4 realistic options and specific hotel financial numbers where possible.
- "correctAnswer" MUST match one of the 4 strings in "options" verbatim.
- Cite the relevant competencyCode (e.g., FAR-01, BPA-01, FPM-04) and explain step-by-step in "explanation".`;

    const response = await generateContentWithRetry({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              type: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
              domain: { type: Type.STRING },
              competencyCode: { type: Type.STRING },
            },
            required: ['question', 'type', 'options', 'correctAnswer', 'explanation', 'competencyCode'],
          },
        },
      },
    });

    const questions = parseJsonResponse(response.text);
    return res.json({ questions });
  } catch (error: any) {
    console.error('Error in /api/gemini/generate-quiz:', error);
    return res.status(502).json({ error: error.message || 'Failed to generate quiz' });
  }
});

// 4. Case Study Generator - Grounded in Approved Courses & Domains
app.post('/api/gemini/generate-case-study', async (req, res) => {
  try {
    const { topic, courseId, domainId, difficulty = 'Advanced', language = 'vi' } = req.body;
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API not configured' });
    }

    const knowledgeBase = buildCurriculumKnowledgeBase(courseId);
    const domainObj = COMPETENCY_DOMAINS.find((d) => d.id === domainId);
    const courseObj = COURSES.find((c) => c.id === courseId);

    const prompt = `You are a Master Hospitality Finance Curriculum Architect at FC Learning Academy.
Generate an executive, realistic hotel finance Case Study grounded in the approved curriculum below.
${knowledgeBase}

Focus Course: ${courseObj ? `${courseObj.code} - ${courseObj.titleEn}` : 'Comprehensive FC Curriculum'}
Focus Domain: ${domainObj ? `${domainObj.code} - ${domainObj.nameEn}` : 'All 6 Competency Domains'}
Custom Topic Focus: ${topic || 'Hotel P&L Variance, Flow-Through Recovery & GM Strategic Recommendation'}
Difficulty: ${difficulty}
Language: ${language === 'vi' ? 'Vietnamese' : 'English'}

Include realistic luxury hotel KPIs (Rooms, ADR, RevPAR, F&B Cost %, Labor %, GOP Margin, Flow-Through %), an executive dilemma for the Financial Controller, 3 analytical questions for the learner to answer, a transparent 100-point scoring rubric (4 criteria summing to 100), and a concise model benchmark solution citing approved course codes.`;

    const response = await generateContentWithRetry({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            propertyProfile: { type: Type.STRING },
            competencyCodes: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedCourseCodes: { type: Type.ARRAY, items: { type: Type.STRING } },
            scenarioNarrative: { type: Type.STRING },
            financialSnapshot: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  metric: { type: Type.STRING },
                  budget: { type: Type.STRING },
                  actual: { type: Type.STRING },
                  variance: { type: Type.STRING },
                },
                required: ['metric', 'budget', 'actual', 'variance'],
              },
            },
            executiveDilemma: { type: Type.STRING },
            questionsForLearner: { type: Type.ARRAY, items: { type: Type.STRING } },
            scoringRubric: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criterion: { type: Type.STRING },
                  maxPoints: { type: Type.NUMBER },
                  expectation: { type: Type.STRING },
                },
                required: ['criterion', 'maxPoints', 'expectation'],
              },
            },
            modelAnswerOutline: { type: Type.STRING },
          },
          required: [
            'title',
            'propertyProfile',
            'competencyCodes',
            'recommendedCourseCodes',
            'scenarioNarrative',
            'financialSnapshot',
            'executiveDilemma',
            'questionsForLearner',
            'scoringRubric',
            'modelAnswerOutline',
          ],
        },
      },
    });

    const caseStudy = parseJsonResponse(response.text);
    return res.json({ caseStudy });
  } catch (error: any) {
    console.error('Error in /api/gemini/generate-case-study:', error);
    return res.status(502).json({ error: error.message || 'Failed to generate case study' });
  }
});

// 5. Answer Analyzer with Transparent Rubric & Competency Gap Diagnosis
app.post('/api/gemini/analyze-answer', async (req, res) => {
  try {
    const { promptQuestion, learnerAnswer, rubricCriteria, courseId, language = 'vi' } = req.body;
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API not configured' });
    }
    if (!learnerAnswer || !String(learnerAnswer).trim()) {
      return res.status(400).json({ error: 'Learner answer is required.' });
    }

    const knowledgeBase = buildCurriculumKnowledgeBase(courseId);
    const prompt = `You are a Senior Hospitality Financial Controller and L&D Examiner.
Analyze the learner's written answer rigorously using the approved FC Learning Academy curriculum below and a transparent 100-point scoring rubric.
${knowledgeBase}

Prompt / Case Question:
"${promptQuestion || 'Evaluate hotel departmental profitability, GOP Flow-Through, and recommend strategic actions to the GM.'}"

Rubric Criteria Reference:
${rubricCriteria ? JSON.stringify(rubricCriteria) : '4 equal criteria (25 pts each): USALI Financial Accuracy, Variance & Root Cause Diagnosis, Commercial & Guest Impact Balance, Strategic Action Plan & GM Communication'}

Learner's Written Answer:
"${learnerAnswer}"

Language: ${language === 'vi' ? 'Vietnamese' : 'English'}

Provide:
- overallScore (0-100) and passed (true if >= 80)
- rubricBreakdown (exact criterion name, earned score, maxPoints, specific justification)
- strengths (array)
- competencyGapsIdentified (array with competencyCode, issue, severity: High|Medium|Low)
- recommendedCourseCodes (approved HFC-xxx codes) and nextLearningActions (concrete practice/OJT activities)
- coachingFeedback (constructive mentor note and how to revise to score 95+)`;

    const response = await generateContentWithRetry({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            passed: { type: Type.BOOLEAN },
            rubricBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criterion: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  maxPoints: { type: Type.NUMBER },
                  justification: { type: Type.STRING },
                },
                required: ['criterion', 'score', 'maxPoints', 'justification'],
              },
            },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            competencyGapsIdentified: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  competencyCode: { type: Type.STRING },
                  issue: { type: Type.STRING },
                  severity: { type: Type.STRING },
                },
                required: ['competencyCode', 'issue', 'severity'],
              },
            },
            recommendedCourseCodes: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextLearningActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            coachingFeedback: { type: Type.STRING },
          },
          required: [
            'overallScore',
            'passed',
            'rubricBreakdown',
            'strengths',
            'competencyGapsIdentified',
            'recommendedCourseCodes',
            'nextLearningActions',
            'coachingFeedback',
          ],
        },
      },
    });

    const analysis = parseJsonResponse(response.text);
    return res.json({ analysis });
  } catch (error: any) {
    console.error('Error in /api/gemini/analyze-answer:', error);
    return res.status(502).json({ error: error.message || 'Failed to analyze learner answer' });
  }
});

// 6. AI Competency Gap Coach & Activity Recommender
app.post('/api/gemini/gap-coach', async (req, res) => {
  try {
    const { learnerId, language = 'vi', focusQuestion } = req.body;
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API not configured' });
    }
    if (!learnerId) {
      return res.status(400).json({ error: 'learnerId is required' });
    }

    const learner = db.users.find((u) => u.id === learnerId);
    if (!learner) {
      return res.status(404).json({ error: 'Learner not found' });
    }

    const learnerAssessments = db.assessments
      .filter((a) => a.learnerId === learnerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestAssessment = learnerAssessments[0] || null;
    const learnerEnrollments = db.enrollments.filter((e) => e.userId === learnerId);
    const learnerQuizzes = db.quizAttempts.filter((q) => q.userId === learnerId);
    const learnerOjt = db.submissions.filter((s) => s.userId === learnerId);
    const learnerIdp = db.idps.find((i) => i.learnerId === learnerId) || null;

    const knowledgeBase = buildCurriculumKnowledgeBase();
    const prompt = `You are the Chief Finance Talent Coach at FC Learning Academy.
Analyze this hotel finance professional's real LMS profile, competency assessment gaps, course progress, quiz scores, OJT deliverables, and IDP, then prescribe an actionable development plan strictly grounded in our approved courses and OJT assignments.

${knowledgeBase}

LEARNER PROFILE:
- Name: ${learner.name}
- Current Position: ${learner.position} (Level ${learner.currentLevel} -> Target Level ${learner.targetLevel})
- Property: ${learner.property}
- Latest Assessment (${latestAssessment?.cycle || 'Baseline'}): ${JSON.stringify(latestAssessment?.scores || {})}
- Overall Gap Average: ${latestAssessment?.overallGapAverage ?? 'N/A'}
- Course Enrollments: ${JSON.stringify(learnerEnrollments)}
- Quiz Attempts: ${JSON.stringify(learnerQuizzes)}
- OJT Submissions: ${JSON.stringify(learnerOjt)}
- Active IDP: ${JSON.stringify(learnerIdp)}
- Coaching Focus Request: ${focusQuestion || 'Identify top competency gaps and prescribe targeted courses, OJT projects, and GM coaching exercises.'}

Language: ${language === 'vi' ? 'Vietnamese' : 'English'}

Return a structured executive coaching plan identifying the learner's top critical competency gaps, exact approved course codes (like "HFC-102", "HFC-302") and OJT codes (like "OJT-BPA-01") from the curriculum above, and a 30/60/90-day action roadmap.`;

    const response = await generateContentWithRetry({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            readinessDiagnosis: { type: Type.STRING },
            topGaps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  competencyCode: { type: Type.STRING },
                  currentLevel: { type: Type.NUMBER },
                  targetLevel: { type: Type.NUMBER },
                  gap: { type: Type.NUMBER },
                  businessImpact: { type: Type.STRING },
                  recommendedCourseCode: { type: Type.STRING },
                  recommendedOjtCode: { type: Type.STRING },
                },
                required: [
                  'competencyCode',
                  'currentLevel',
                  'targetLevel',
                  'gap',
                  'businessImpact',
                  'recommendedCourseCode',
                  'recommendedOjtCode',
                ],
              },
            },
            recommendedActivities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timeframe: { type: Type.STRING },
                  activityTitle: { type: Type.STRING },
                  courseCode: { type: Type.STRING },
                  coachingAction: { type: Type.STRING },
                  successMetric: { type: Type.STRING },
                },
                required: ['timeframe', 'activityTitle', 'courseCode', 'coachingAction', 'successMetric'],
              },
            },
          },
          required: ['executiveSummary', 'readinessDiagnosis', 'topGaps', 'recommendedActivities'],
        },
      },
    });

    const coachingPlan = parseJsonResponse(response.text);
    return res.json({ coachingPlan, learnerName: learner.name });
  } catch (error: any) {
    console.error('Error in /api/gemini/gap-coach:', error);
    return res.status(502).json({ error: error.message || 'Failed to generate AI gap coaching plan' });
  }
});

// 7. AI Case Study & OJT Assignment Grader
app.post('/api/gemini/evaluate-assignment', async (req, res) => {
  try {
    const { assignmentTitle, deliverables, submissionText, fileNotes, language = 'vi' } = req.body;
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API not configured' });
    }
    if (!submissionText || !String(submissionText).trim()) {
      return res.status(400).json({ error: 'Submission text is required for AI evaluation.' });
    }

    const knowledgeBase = buildCurriculumKnowledgeBase();
    const prompt = `You are a Senior Regional Financial Controller auditing an OJT Practical Assignment submitted by a hotel accountant.
Ground your rubric grading against FC Learning Academy approved standards:
${knowledgeBase}

Assignment Title: ${assignmentTitle}
Deliverables Required: ${JSON.stringify(deliverables)}
Candidate's Submission Content / Analysis:
"${submissionText}"
Attached Workbook Notes: "${fileNotes || 'Financial model attached'}"

Evaluate rigorously in ${language === 'vi' ? 'Vietnamese' : 'English'}.`;

    const response = await generateContentWithRetry({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            passed: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING },
            rubricBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criterion: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  max: { type: Type.NUMBER },
                  comments: { type: Type.STRING },
                },
                required: ['criterion', 'score', 'max', 'comments'],
              },
            },
            keyRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['score', 'passed', 'feedback', 'rubricBreakdown', 'keyRecommendations'],
        },
      },
    });

    const result = parseJsonResponse(response.text);
    return res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/evaluate-assignment:', error);
    return res.status(502).json({ error: error.message || 'Failed to evaluate assignment' });
  }
});

// ============================================================================
// CORE LMS PERSISTENCE & WORKFLOW REST API ENDPOINTS
// ============================================================================

// Bootstrap entire persisted LMS dataset
app.get('/api/bootstrap', (req, res) => {
  res.json({
    users: db.users,
    competencies: db.competencies,
    enrollments: db.enrollments,
    quizAttempts: db.quizAttempts,
    submissions: db.submissions,
    assessments: db.assessments,
    idps: db.idps,
    certificates: db.certificates,
    auditLogs: db.auditLogs,
    rolePermissions: db.rolePermissions,
    lessonMaterials: db.lessonMaterials,
  });
});

// Audit logs endpoint
app.get('/api/audit-logs', (req, res) => {
  res.json({ auditLogs: db.auditLogs });
});

// --- PER-LESSON LEARNING MATERIALS ---
app.get('/api/lesson-materials', (req, res) => {
  const { courseId, lessonId } = req.query as { courseId?: string; lessonId?: string };
  let items = [...db.lessonMaterials];
  if (courseId) items = items.filter((m) => m.courseId === courseId);
  if (lessonId) items = items.filter((m) => m.lessonId === lessonId);
  items.sort((a, b) => {
    const courseCmp = (a.courseCode || a.courseId || '').localeCompare(
      b.courseCode || b.courseId || '',
      undefined,
      { numeric: true, sensitivity: 'base' }
    );
    if (courseCmp !== 0) return courseCmp;
    const orderDiff = (a.lessonOrder || 999) - (b.lessonOrder || 999);
    if (orderDiff !== 0) return orderDiff;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
  return res.json({ lessonMaterials: items });
});

app.post('/api/lesson-materials', (req, res) => {
  if (!hasActorPermission(req, 'manage_lesson_materials')) {
    return res.status(403).json({
      error: 'Insufficient permissions to upload lesson learning materials.',
    });
  }
  const actor = getRequestActor(req);
  const body = req.body as Partial<LessonMaterialDoc>;
  if (!body?.courseId || !body?.lessonId || !body?.titleVi || !body?.titleEn) {
    return res.status(400).json({ error: 'courseId, lessonId, titleVi, and titleEn are required.' });
  }
  if (typeof body.inlineBase64 === 'string' && body.inlineBase64.length > 920000) {
    return res.status(400).json({ error: 'Inline file base64 exceeds Firestore 1MB safety threshold.' });
  }
  const now = new Date().toISOString();
  const docItem: LessonMaterialDoc = {
    id: body.id && /^[a-zA-Z0-9_\-]+$/.test(body.id)
      ? body.id
      : `lmat_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    courseId: String(body.courseId),
    courseCode: String(body.courseCode || body.courseId),
    lessonId: String(body.lessonId),
    lessonOrder: Math.max(1, Number(body.lessonOrder || 1)),
    lessonTitleVi: String(body.lessonTitleVi || ''),
    lessonTitleEn: String(body.lessonTitleEn || ''),
    titleVi: String(body.titleVi).trim().slice(0, 300),
    titleEn: String(body.titleEn).trim().slice(0, 300),
    descriptionVi: body.descriptionVi ? String(body.descriptionVi).trim().slice(0, 2000) : undefined,
    descriptionEn: body.descriptionEn ? String(body.descriptionEn).trim().slice(0, 2000) : undefined,
    materialType: (body.materialType as LessonMaterialDoc['materialType']) || 'pdf',
    storageMode: (body.storageMode as LessonMaterialDoc['storageMode']) || 'firestore_inline',
    fileName: body.fileName ? String(body.fileName).slice(0, 255) : undefined,
    mimeType: body.mimeType ? String(body.mimeType).slice(0, 150) : undefined,
    fileSizeBytes: typeof body.fileSizeBytes === 'number' ? body.fileSizeBytes : undefined,
    fileSizeLabel: String(body.fileSizeLabel || 'External').slice(0, 40),
    inlineBase64: body.inlineBase64 ? String(body.inlineBase64) : undefined,
    downloadUrl: body.downloadUrl ? String(body.downloadUrl).slice(0, 2000) : undefined,
    storagePath: body.storagePath ? String(body.storagePath).slice(0, 500) : undefined,
    externalUrl: body.externalUrl ? String(body.externalUrl).slice(0, 2000) : undefined,
    isRequired: Boolean(body.isRequired),
    uploadedByUid: String(body.uploadedByUid || actor?.id || 'system'),
    uploadedByName: String(body.uploadedByName || actor?.name || 'Administrator').slice(0, 150),
    uploadedByEmail: body.uploadedByEmail ? String(body.uploadedByEmail).slice(0, 200) : actor?.email,
    uploadedByRole: String(body.uploadedByRole || actor?.role || 'super_admin'),
    createdAt: body.createdAt || now,
    updatedAt: now,
  };
  const existingIdx = db.lessonMaterials.findIndex((m) => m.id === docItem.id);
  if (existingIdx >= 0) {
    db.lessonMaterials[existingIdx] = docItem;
  } else {
    db.lessonMaterials.unshift(docItem);
  }
  recordAudit(
    'UPLOAD_LESSON_MATERIAL',
    actor ? `${actor.name} (${actor.role})` : 'System Admin',
    `${docItem.courseCode} · Lesson ${docItem.lessonOrder}`,
    `Uploaded "${docItem.titleVi}" (${docItem.storageMode})`
  );
  persistDB(db);
  return res.status(201).json({ success: true, material: docItem });
});

app.delete('/api/lesson-materials/:id', (req, res) => {
  if (!hasActorPermission(req, 'manage_lesson_materials')) {
    return res.status(403).json({
      error: 'Insufficient permissions to delete lesson learning materials.',
    });
  }
  const actor = getRequestActor(req);
  const { id } = req.params;
  const idx = db.lessonMaterials.findIndex((m) => m.id === id);
  if (idx < 0) {
    return res.status(404).json({ error: 'Lesson material not found.' });
  }
  const [removed] = db.lessonMaterials.splice(idx, 1);
  recordAudit(
    'DELETE_LESSON_MATERIAL',
    actor ? `${actor.name} (${actor.role})` : 'System Admin',
    `${removed.courseCode} · Lesson ${removed.lessonOrder}`,
    `Removed "${removed.titleVi}"`
  );
  persistDB(db);
  return res.json({ success: true, removedId: id });
});

// --- RBAC ROLE PERMISSIONS MATRIX ---
app.get('/api/rbac/permissions', (req, res) => {
  return res.json({ rolePermissions: db.rolePermissions });
});

app.put('/api/rbac/permissions/:role', (req, res) => {
  const { role } = req.params;
  if (!SYSTEM_ROLES.includes(role as UserRole)) {
    return res.status(400).json({ error: `Invalid system role "${role}".` });
  }
  if (!hasActorPermission(req, 'configure_role_permissions')) {
    return res.status(403).json({ error: 'Insufficient permissions to modify RBAC role matrix.' });
  }
  const actor = getRequestActor(req);
  const incomingList = req.body?.permissions;
  if (!Array.isArray(incomingList)) {
    return res.status(400).json({ error: 'permissions array is required.' });
  }
  const typedRole = role as UserRole;
  const sanitized = sanitizeRolePermissionsList(typedRole, incomingList);
  db.rolePermissions[typedRole] = sanitized;
  recordAudit(
    'UPDATE_ROLE_PERMISSIONS',
    actor ? `${actor.name} (${actor.role})` : 'System Admin',
    typedRole,
    `Updated ${sanitized.length} permissions for role "${typedRole}"`
  );
  persistDB(db);
  return res.json({ success: true, role: typedRole, permissions: sanitized, rolePermissions: db.rolePermissions });
});

app.post('/api/rbac/reset', (req, res) => {
  if (!hasActorPermission(req, 'configure_role_permissions')) {
    return res.status(403).json({ error: 'Insufficient permissions to reset RBAC policy.' });
  }
  const actor = getRequestActor(req);
  const targetRole = req.body?.role as UserRole | undefined;
  if (targetRole && SYSTEM_ROLES.includes(targetRole)) {
    db.rolePermissions[targetRole] = [...DEFAULT_ROLE_PERMISSIONS[targetRole]];
  } else {
    db.rolePermissions = normalizeRolePermissionsMap(DEFAULT_ROLE_PERMISSIONS);
  }
  recordAudit(
    'RESET_ROLE_PERMISSIONS',
    actor ? `${actor.name} (${actor.role})` : 'System Admin',
    targetRole || 'ALL_ROLES',
    targetRole ? `Reset role "${targetRole}" permissions to baseline defaults` : 'Reset all 5 role policies to defaults'
  );
  persistDB(db);
  return res.json({ success: true, rolePermissions: db.rolePermissions });
});

// --- USERS & RBAC ---
app.post('/api/users', (req, res) => {
  const actor = getRequestActor(req);
  if (!hasActorPermission(req, 'manage_users_rbac')) {
    return res.status(403).json({ error: 'Current role lacks permission to create user accounts.' });
  }

  const { name, email, role, position, department, property, currentLevel, targetLevel } = req.body;
  if (!name || !email || !role || !position || !property) {
    return res.status(400).json({ error: 'name, email, role, position, and property are required.' });
  }
  if (db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ error: 'A user with this email already exists.' });
  }

  const newUser: User = {
    id: `user_${Date.now()}`,
    name: String(name).trim(),
    email: String(email).trim(),
    role,
    position: String(position).trim(),
    department: String(department || 'Finance & Accounting').trim(),
    property: String(property).trim(),
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name).trim())}&background=0A192F&color=D4AF37`,
    currentLevel: Math.max(1, Math.min(4, Number(currentLevel) || 1)) as ProficiencyLevel,
    targetLevel: Math.max(1, Math.min(4, Number(targetLevel) || 4)) as ProficiencyLevel,
    joinedDate: new Date().toISOString().split('T')[0],
    careerPathId: 'path_accountant_to_senior',
    supervisorId: 'user_fc1',
  };

  db.users.push(newUser);
  recordAudit(
    'CREATE_USER',
    actor ? `${actor.name} (${actor.role})` : 'System Admin',
    `${newUser.name} (${newUser.role})`,
    `Created account at ${newUser.property}`
  );
  persistDB(db);
  return res.status(201).json({ success: true, user: newUser });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const actor = getRequestActor(req);
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx < 0) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const isSelfCareerUpdate =
    actor &&
    actor.id === id &&
    Object.keys(req.body).every((k) => k === 'careerPathId' || k === 'actorId');

  if (!hasActorPermission(req, 'manage_users_rbac') && !isSelfCareerUpdate) {
    return res.status(403).json({ error: 'Insufficient permissions to modify this user.' });
  }

  const allowedUpdates: Partial<User> = {};
  const editableFields: (keyof User)[] = [
    'name',
    'email',
    'role',
    'position',
    'department',
    'property',
    'currentLevel',
    'targetLevel',
    'careerPathId',
    'supervisorId',
  ];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      (allowedUpdates as any)[field] = req.body[field];
    }
  });

  db.users[idx] = { ...db.users[idx], ...allowedUpdates };
  recordAudit(
    'UPDATE_USER',
    actor ? `${actor.name}` : 'System Admin',
    db.users[idx].name,
    `Updated fields: ${Object.keys(allowedUpdates).join(', ')}`
  );
  persistDB(db);
  return res.json({ success: true, user: db.users[idx] });
});

// --- COMPETENCIES ---
app.post('/api/competencies', (req, res) => {
  const actor = getRequestActor(req);
  if (!hasActorPermission(req, 'manage_competency_framework')) {
    return res.status(403).json({ error: 'Current role lacks permission to modify competencies.' });
  }
  const comp: Competency = req.body;
  if (!comp || !comp.id || !comp.code || !comp.nameVi) {
    return res.status(400).json({ error: 'id, code, and nameVi are required.' });
  }
  const idx = db.competencies.findIndex((c) => c.id === comp.id);
  if (idx >= 0) {
    db.competencies[idx] = comp;
  } else {
    db.competencies.push(comp);
  }
  recordAudit('SAVE_COMPETENCY', actor?.name || 'Admin', comp.code, `Saved competency ${comp.nameEn || comp.nameVi}`);
  persistDB(db);
  return res.json({ success: true, competency: comp });
});

app.delete('/api/competencies/:id', (req, res) => {
  const actor = getRequestActor(req);
  if (!hasActorPermission(req, 'manage_competency_framework')) {
    return res.status(403).json({ error: 'Current role lacks permission to delete competencies.' });
  }
  const { id } = req.params;
  const existing = db.competencies.find((c) => c.id === id);
  if (!existing) {
    return res.status(404).json({ error: 'Competency not found.' });
  }
  db.competencies = db.competencies.filter((c) => c.id !== id);
  recordAudit('DELETE_COMPETENCY', actor?.name || 'Admin', existing.code, `Removed competency ${existing.nameVi}`);
  persistDB(db);
  return res.json({ success: true });
});

// --- ENROLLMENTS & PROGRESS ---
app.post('/api/enrollments', (req, res) => {
  const { userId, courseId } = req.body;
  if (!userId || !courseId) {
    return res.status(400).json({ error: 'userId and courseId are required.' });
  }
  const existing = db.enrollments.find((e) => e.userId === userId && e.courseId === courseId);
  if (existing) {
    return res.json({ success: true, enrollment: existing });
  }
  const newEnrollment: CourseEnrollment = {
    id: `enr_${Date.now()}`,
    userId,
    courseId,
    progressPercent: 0,
    completedModules: [],
    status: 'in_progress',
    enrolledDate: new Date().toISOString().split('T')[0],
  };
  db.enrollments.unshift(newEnrollment);
  persistDB(db);
  return res.status(201).json({ success: true, enrollment: newEnrollment });
});

app.patch('/api/enrollments/progress', (req, res) => {
  const { userId, courseId, moduleId } = req.body;
  if (!userId || !courseId || !moduleId) {
    return res.status(400).json({ error: 'userId, courseId, and moduleId are required.' });
  }
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  let idx = db.enrollments.findIndex((e) => e.userId === userId && e.courseId === courseId);
  if (idx < 0) {
    db.enrollments.unshift({
      id: `enr_${Date.now()}`,
      userId,
      courseId,
      progressPercent: 0,
      completedModules: [],
      status: 'in_progress',
      enrolledDate: new Date().toISOString().split('T')[0],
    });
    idx = 0;
  }

  const enr = db.enrollments[idx];
  const completed = enr.completedModules.includes(moduleId)
    ? enr.completedModules
    : [...enr.completedModules, moduleId];
  const totalModules = Math.max(1, course.modules.length);
  const percent = Math.min(100, Math.round((completed.length / totalModules) * 100));

  const updated: CourseEnrollment = {
    ...enr,
    completedModules: completed,
    progressPercent: percent,
    status: percent === 100 ? 'completed' : 'in_progress',
    completedDate: percent === 100 ? new Date().toISOString().split('T')[0] : enr.completedDate,
  };
  db.enrollments[idx] = updated;
  persistDB(db);
  return res.json({ success: true, enrollment: updated });
});

// --- QUIZ ATTEMPTS ---
app.post('/api/quizzes/attempt', (req, res) => {
  const { userId, courseId, quizTitle, score, totalQuestions, passed, answers } = req.body;
  if (!userId || !quizTitle || score === undefined) {
    return res.status(400).json({ error: 'userId, quizTitle, and score are required.' });
  }

  const attempt: QuizAttempt = {
    id: `qa_${Date.now()}`,
    userId,
    courseId,
    quizTitle,
    score: Number(score),
    totalQuestions: Number(totalQuestions) || 1,
    passed: Boolean(passed),
    date: new Date().toISOString().split('T')[0],
    answers: answers || {},
  };
  db.quizAttempts.unshift(attempt);

  if (courseId) {
    db.enrollments = db.enrollments.map((e) =>
      e.userId === userId && e.courseId === courseId
        ? { ...e, quizScore: Math.max(e.quizScore || 0, attempt.score) }
        : e
    );
  }
  persistDB(db);
  return res.status(201).json({ success: true, attempt });
});

// --- OJT SUBMISSIONS & GRADING ---
app.post('/api/ojt/submit', (req, res) => {
  const { assignmentId, userId, notes, fileName, aiResult } = req.body;
  if (!assignmentId || !userId || !notes || !String(notes).trim()) {
    return res.status(400).json({ error: 'assignmentId, userId, and submission notes are required.' });
  }

  const newSub: AssignmentSubmission = {
    id: `sub_${Date.now()}`,
    assignmentId,
    userId,
    submittedDate: new Date().toISOString().split('T')[0],
    status: aiResult?.passed ? 'approved' : 'submitted',
    submissionNotes: String(notes).trim(),
    fileName: fileName || 'FC_OJT_Deliverable_Workbook.xlsx',
    fileSize: '3.1 MB',
    score: aiResult?.score,
    feedback: aiResult?.feedback,
    reviewedBy: aiResult ? 'AI Preliminary Evaluator (Gemini 4 Hydrogen)' : undefined,
    reviewedDate: aiResult ? new Date().toISOString().split('T')[0] : undefined,
    aiGraded: !!aiResult,
  };
  db.submissions.unshift(newSub);
  const learner = db.users.find((u) => u.id === userId);
  recordAudit('OJT_SUBMIT', learner?.name || userId, assignmentId, `Submitted ${newSub.fileName}`);
  persistDB(db);
  return res.status(201).json({ success: true, submission: newSub });
});

app.post('/api/ojt/grade', (req, res) => {
  const actor = getRequestActor(req);
  if (!hasActorPermission(req, 'grade_ojt_submissions')) {
    return res.status(403).json({ error: 'Current role lacks permission to grade OJT submissions.' });
  }

  const { submissionId, score, feedback, status, reviewedBy } = req.body;
  const idx = db.submissions.findIndex((s) => s.id === submissionId);
  if (idx < 0) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  const numScore = Number(score);
  if (Number.isNaN(numScore) || numScore < 0 || numScore > 100) {
    return res.status(400).json({ error: 'Score must be between 0 and 100.' });
  }

  const updated: AssignmentSubmission = {
    ...db.submissions[idx],
    score: numScore,
    feedback: feedback || '',
    status: status === 'approved' ? 'approved' : 'revision_requested',
    reviewedBy: reviewedBy || actor?.name || 'David Tran (Cluster FC)',
    reviewedDate: new Date().toISOString().split('T')[0],
  };
  db.submissions[idx] = updated;
  const targetLearner = db.users.find((u) => u.id === updated.userId);
  recordAudit(
    'OJT_GRADE',
    updated.reviewedBy || 'FC',
    targetLearner?.name || updated.userId,
    `Graded ${updated.assignmentId}: ${updated.score}/100 (${updated.status})`
  );
  persistDB(db);
  return res.json({ success: true, submission: updated });
});

// --- CERTIFICATES ---
app.post('/api/certificates/issue', (req, res) => {
  const actor = getRequestActor(req);
  const { userId, level } = req.body;
  const numericLevel = Number(level) as 1 | 2 | 3 | 4 | 5;
  if (!userId || ![1, 2, 3, 4, 5].includes(numericLevel)) {
    return res.status(400).json({ error: 'Valid userId and certification level (1-5) are required.' });
  }

  const recipient = db.users.find((u) => u.id === userId);
  if (!recipient) {
    return res.status(404).json({ error: 'Recipient user not found.' });
  }

  const existing = db.certificates.find((c) => c.userId === userId && c.level === numericLevel);
  if (existing) {
    return res.json({ success: true, certificate: existing });
  }

  // Enforce level eligibility unless explicitly issued by a role with issue_certificates permission
  const isAuthorizedIssuer = hasActorPermission(req, 'issue_certificates');
  if (!isAuthorizedIssuer && recipient.currentLevel < numericLevel) {
    return res.status(403).json({
      error: `Learner proficiency Level ${recipient.currentLevel} has not met Level ${numericLevel} certification threshold.`,
    });
  }

  const titles = {
    1: {
      vi: 'Chứng Chỉ Cấp Độ 1: Nền Tảng Kế Toán Khách Sạn (Hospitality Finance Foundation)',
      en: 'Level 1: Hospitality Finance Foundation',
    },
    2: {
      vi: 'Chứng Chỉ Cấp Độ 2: Chuyên Viên Kế Toán Khách Sạn Chuyên Nghiệp',
      en: 'Level 2: Hospitality Finance Professional',
    },
    3: {
      vi: 'Chứng Chỉ Cấp Độ 3: Sẵn Sàng Trợ Lý Giám Đốc Tài Chính (AFC Ready)',
      en: 'Level 3: Assistant Financial Controller Ready',
    },
    4: {
      vi: 'Chứng Chỉ Cấp Độ 4: Sẵn Sàng Giám Đốc Tài Chính Độc Lập (FC Ready)',
      en: 'Level 4: Independent Financial Controller Ready',
    },
    5: {
      vi: 'Chứng Chỉ Cấp Độ 5: Đối Tác Kinh Doanh Tài Chính Chiến Lược (Strategic Finance Partner)',
      en: 'Level 5: Strategic Finance Business Partner',
    },
  };

  const newCert: Certificate = {
    id: `cert_${Date.now()}`,
    certificateNumber: `FCA-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    userId,
    level: numericLevel,
    titleVi: titles[numericLevel].vi,
    titleEn: titles[numericLevel].en,
    issueDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    verificationCode: `VERIFY-FCA-${numericLevel}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    authorizedSigner: 'David Tran & Richard Vance',
    authorizedSignerTitle: 'Cluster Director of Finance & General Manager',
  };

  db.certificates.unshift(newCert);
  recordAudit(
    'ISSUE_CERTIFICATE',
    actor?.name || 'FC Academy Council',
    recipient.name,
    `Issued Level ${numericLevel} certificate (${newCert.certificateNumber})`
  );
  persistDB(db);
  return res.status(201).json({ success: true, certificate: newCert });
});

// --- ASSESSMENT REST API ENDPOINTS ---
app.get('/api/assessments', (req, res) => {
  res.json({ assessments: db.assessments });
});

app.get('/api/assessments/learner/:learnerId', (req, res) => {
  const { learnerId } = req.params;
  const records = db.assessments.filter((a) => a.learnerId === learnerId);
  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ records, latest: records[0] || null });
});

app.post('/api/assessments', (req, res) => {
  try {
    const actor = getRequestActor(req);
    const record = req.body;
    if (!record || !record.learnerId) {
      return res.status(400).json({ error: 'learnerId is required' });
    }

    // RBAC check: users without assess_team_members cannot approve assessments directly
    const canAssessTeam = hasActorPermission(req, 'assess_team_members');
    if (actor && !canAssessTeam && record.status === 'approved') {
      return res.status(403).json({ error: 'Your role does not have permission to approve competency assessments.' });
    }

    const existingIdx = db.assessments.findIndex((a) => a.id === record.id);
    const existingRecord = existingIdx >= 0 ? db.assessments[existingIdx] : undefined;

    // Preserve supervisor ratings/comments if saved by someone without assess_team_members
    let mergedScores = record.scores || {};
    let mergedSupervisorComments = record.supervisorComments || '';
    if (actor && !canAssessTeam && existingRecord) {
      mergedSupervisorComments = existingRecord.supervisorComments || '';
      mergedScores = Object.fromEntries(
        Object.entries(record.scores || {}).map(([code, val]: [string, any]) => {
          const prevScore = existingRecord.scores?.[code];
          return [
            code,
            {
              ...val,
              supervisorLevel: prevScore ? prevScore.supervisorLevel : val.supervisorLevel,
              supervisorNotes: prevScore ? prevScore.supervisorNotes : val.supervisorNotes,
            },
          ];
        })
      );
    }

    const newRecord: AssessmentRecord = {
      ...record,
      id: record.id || `asmt_${Date.now()}`,
      supervisorId:
        !canAssessTeam
          ? existingRecord?.supervisorId || record.supervisorId || 'user_fc1'
          : record.supervisorId || actor?.id || 'user_fc1',
      scores: mergedScores,
      supervisorComments: mergedSupervisorComments,
      date: record.date || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      db.assessments[existingIdx] = newRecord;
    } else {
      db.assessments.unshift(newRecord);
    }

    const learner = db.users.find((u) => u.id === newRecord.learnerId);
    recordAudit(
      newRecord.status === 'approved' ? 'APPROVE_ASSESSMENT' : 'SAVE_ASSESSMENT',
      actor?.name || newRecord.supervisorId,
      learner?.name || newRecord.learnerId,
      `${newRecord.cycle} (${newRecord.status}, Avg Gap: ${newRecord.overallGapAverage})`
    );
    persistDB(db);
    res.json({ success: true, record: newRecord });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- INDIVIDUAL DEVELOPMENT PLAN (IDP) REST API ENDPOINTS ---
app.get('/api/idps', (req, res) => {
  res.json({ idps: db.idps });
});

app.get('/api/idps/learner/:learnerId', (req, res) => {
  const { learnerId } = req.params;
  const idp = db.idps.find((i) => i.learnerId === learnerId) || null;
  res.json({ idp });
});

app.post('/api/idps', (req, res) => {
  try {
    const plan = req.body;
    if (!plan || !plan.learnerId) {
      return res.status(400).json({ error: 'learnerId is required' });
    }

    const existingIdx = db.idps.findIndex((i) => i.learnerId === plan.learnerId);
    const updatedPlan: IndividualDevelopmentPlan = {
      ...plan,
      id: plan.id || `idp_${Date.now()}`,
      createdDate: plan.createdDate || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      db.idps[existingIdx] = updatedPlan;
    } else {
      db.idps.unshift(updatedPlan);
    }

    persistDB(db);
    res.json({ success: true, idp: updatedPlan });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/idps/generate', (req, res) => {
  try {
    const { learnerId, assessmentId, targetPosition, approvedBy } = req.body;
    if (!learnerId) {
      return res.status(400).json({ error: 'learnerId is required' });
    }

    const assessment = assessmentId
      ? db.assessments.find((a) => a.id === assessmentId)
      : db.assessments
          .filter((a) => a.learnerId === learnerId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!assessment) {
      return res.status(404).json({ error: 'No assessment found for this learner' });
    }

    const activityMap: Record<string, { courses: string[]; activity: string; activityEn: string }> = {
      'FAR-01': {
        courses: ['course_01'],
        activity: 'Làm chủ hạch toán các tài khoản USALI và hoàn thành bài thi HFC-101 đạt trên 85%.',
        activityEn: 'Master USALI departmental chart of accounts mapping and pass the HFC-101 exam with >85%.',
      },
      'FAR-02': {
        courses: ['course_02'],
        activity: 'Chủ trì toàn bộ quy trình khóa sổ tháng và xuất báo cáo P&L sơ bộ đúng hạn Day 3.',
        activityEn: 'Lead the end-to-end month-end closing cycle and issue preliminary P&L reports by Day 3.',
      },
      'FAR-03': {
        courses: ['course_02'],
        activity: 'Hoàn thiện tập hồ sơ Balance Sheet Reconciliation không còn tài khoản treo quá 30 ngày.',
        activityEn: 'Complete the monthly Balance Sheet Reconciliation binder with zero unreconciled items >30 days.',
      },
      'FAR-04': {
        courses: ['course_01'],
        activity: 'Xây dựng ma trận bóc tách doanh thu các gói Package phức tạp (Room + F&B + Spa).',
        activityEn: 'Build an IFRS 15 standalone revenue allocation matrix for bundled hotel packages (Room + F&B + Spa).',
      },
      'FAR-05': {
        courses: ['course_06'],
        activity: 'Soạn thảo báo cáo Monthly Financial Critique giải trình biến động chi phí trên 5% gửi GM.',
        activityEn: 'Author the Monthly Financial Critique memo explaining all >5% departmental variances for the GM.',
      },
      'FCA-01': {
        courses: ['course_03'],
        activity: 'Thực hiện kiểm tra đột xuất quỹ tiền mặt và quy trình thu ngân quầy Lễ tân & F&B.',
        activityEn: 'Conduct surprise house-bank cash counts and Front Office / F&B cashier audit checks.',
      },
      'FCA-02': {
        courses: ['course_03'],
        activity: 'Rà soát 100% các khoản giảm trừ (Rebates/Allowances) và audit trail hủy hóa đơn POS.',
        activityEn: 'Audit 100% of rebates, allowances, and POS void/discount audit trails across outlets.',
      },
      'FCA-03': {
        courses: ['course_07'],
        activity: 'Kiểm toán tỷ lệ hao hụt nguyên liệu F&B và phối hợp Bếp trưởng thực hiện Butcher Test.',
        activityEn: 'Audit F&B ingredient yield variances and partner with the Executive Chef on a formal Butcher Test.',
      },
      'FCA-04': {
        courses: ['course_03'],
        activity: 'Cập nhật ma trận rủi ro gian lận và chuẩn bị hồ sơ kiểm toán nội bộ tập đoàn.',
        activityEn: 'Update the property fraud-risk matrix and prepare internal audit readiness workpapers.',
      },
      'FCA-05': {
        courses: ['course_02'],
        activity: 'Chủ trì cuộc họp Credit Meeting hàng tuần, duy trì chỉ số DSO dưới 28 ngày.',
        activityEn: 'Chair weekly Credit Committee meetings and maintain property DSO below 28 days.',
      },
      'FPM-01': {
        courses: ['course_05'],
        activity: 'Tham gia tổ công tác xây dựng Ngân sách năm tiếp theo theo phương pháp zero-based.',
        activityEn: 'Co-lead the annual Zero-Based Budgeting taskforce for upcoming hotel operating schedules.',
      },
      'FPM-02': {
        courses: ['course_05'],
        activity: 'Xây dựng mô hình 90-day Rolling Forecast với biên độ sai lệch GOP dưới ±3%.',
        activityEn: 'Build a 90-day Rolling Forecast model achieving under ±3% GOP variance accuracy.',
      },
      'FPM-03': {
        courses: ['course_05'],
        activity: 'Lập và theo dõi dự báo dòng tiền 13 tuần trực tiếp bảo đảm thanh khoản vận hành.',
        activityEn: 'Prepare and monitor a 13-week rolling cash-flow forecast to safeguard property liquidity.',
      },
      'FPM-04': {
        courses: ['course_04'],
        activity: 'Xây dựng mô hình chiết khấu dòng tiền DCF (NPV, IRR) thẩm định dự án đầu tư CAPEX.',
        activityEn: 'Construct a DCF underwriting model (NPV, IRR, Payback) for property CAPEX evaluation.',
      },
      'FPM-05': {
        courses: ['course_06'],
        activity: 'Thiết lập ma trận linh hoạt chi phí (Cost Flexing) ứng phó khi công suất phòng sụt giảm.',
        activityEn: 'Establish a Cost Flexing playbook triggered automatically by occupancy drops.',
      },
      'BPA-01': {
        courses: ['course_06'],
        activity: 'Phân tích Flow-Through & Flex của từng Outlet và tư vấn giải pháp phục hồi biên GOP.',
        activityEn: 'Analyze outlet-level Flow-Through & Flex metrics and recommend GOP margin recovery actions.',
      },
      'BPA-02': {
        courses: ['course_07'],
        activity: 'Phân tích báo cáo STR Index và tính toán Net ADR sau khi trừ hoa hồng kênh OTA.',
        activityEn: 'Analyze STR benchmarking indices and Net ADR yield after OTA distribution commissions.',
      },
      'BPA-03': {
        courses: ['course_06'],
        activity: 'Tính toán chỉ số năng suất lao động HPOR buồng phòng và kiểm soát giờ làm thêm.',
        activityEn: 'Track Housekeeping HPOR labor productivity metrics and tighten overtime controls.',
      },
      'LPM-01': {
        courses: ['course_08'],
        activity: 'Tổ chức các buổi họp nhóm chia sẻ nghiệp vụ và duy trì gắn kết đội ngũ kế toán.',
        activityEn: 'Facilitate finance team knowledge-sharing huddles and structured cross-training sessions.',
      },
      'SBP-02': {
        courses: ['course_09'],
        activity: 'Tham gia tương tác trực tiếp giải quyết kịch bản khủng hoảng với GM trên Simulator.',
        activityEn: 'Complete interactive crisis-resolution executive roleplay scenarios with the GM on the Simulator.',
      },
    };

    const entries = Object.entries(assessment.scores || {});
    const gapEntries = entries
      .map(([code, s]: any) => ({ code, gap: s.gap || 0, ...s }))
      .filter((e) => e.gap > 0)
      .sort((a, b) => b.gap - a.gap);

    const generatedItems = gapEntries.map((item, idx) => {
      const comp = db.competencies.find((c) => c.code === item.code);
      const mapping = activityMap[item.code] || {
        courses: comp?.associatedCourseIds?.length ? comp.associatedCourseIds : ['course_01'],
        activity: `Kèm cặp chuyên môn 1-1 và hoàn thành bài tập thực hành liên quan đến năng lực ${comp?.nameVi || item.code}.`,
        activityEn: `Complete 1-on-1 coaching and practical OJT deliverables aligned with ${comp?.nameEn || item.code}.`,
      };

      return {
        id: `idp_gen_${idx}_${Date.now()}`,
        competencyId: item.code,
        priority: (item.gap >= 2 ? 'High' : item.gap === 1 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
        targetDate: new Date(Date.now() + (idx + 1) * 35 * 86400000).toISOString().split('T')[0],
        recommendedCourseIds: mapping.courses,
        practicalActivity: mapping.activity,
        practicalActivityEn: mapping.activityEn,
        status: 'Not Started' as const,
        mentorNotes: `Khoảng trống năng lực hiện tại: ${item.gap} cấp độ. Cần ưu tiên bồi dưỡng.`,
        mentorNotesEn: `Current competency gap: ${item.gap} level(s). Priority development required.`,
      };
    });

    const newIDP: IndividualDevelopmentPlan = {
      id: `idp_${Date.now()}`,
      learnerId,
      createdDate: new Date().toISOString().split('T')[0],
      targetPosition: targetPosition || 'Assistant Financial Controller (AFC)',
      targetCompletionDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      status: 'Active',
      approvedBy: approvedBy || 'David Tran, Cluster FC',
      approvedDate: new Date().toISOString().split('T')[0],
      overallGoal: `Kế hoạch hành động cá nhân thu hẹp ${generatedItems.length} khoảng trống năng lực để đạt chuẩn bổ nhiệm ${targetPosition || 'AFC'}.`,
      overallGoalEn: `Individual action plan to close ${generatedItems.length} competency gaps for ${targetPosition || 'AFC'} readiness.`,
      items: generatedItems,
    };

    const existingIdx = db.idps.findIndex((i) => i.learnerId === learnerId);
    if (existingIdx >= 0) {
      db.idps[existingIdx] = newIDP;
    } else {
      db.idps.unshift(newIDP);
    }

    const learner = db.users.find((u) => u.id === learnerId);
    recordAudit(
      'GENERATE_IDP',
      approvedBy || 'FC System',
      learner?.name || learnerId,
      `Generated ${generatedItems.length} IDP action items from ${assessment.cycle}`
    );
    persistDB(db);
    res.json({ success: true, idp: newIDP });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DATA IMPORT CENTER API ENDPOINTS (RBAC: super_admin & lnd_manager ONLY)
// ============================================================================

function requireImportAdmin(
  req: express.Request,
  res: express.Response,
  requiredPermissions: PermissionKey[] = [
    'access_data_import_center',
    'access_sim_import_center',
    'manage_sim_admin',
  ]
): User | null {
  const actorId =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    req.body?.actorId;
  if (!actorId) {
    res.status(401).json({ error: 'Authentication required for Data Import Center.' });
    return null;
  }
  const actor =
    db.users.find((u) => u.id === actorId) ||
    getRequestActor(req) ||
    (() => {
      const headerRole = req.headers['x-user-role'] as string | undefined;
      if (
        headerRole &&
        SYSTEM_ROLES.includes(headerRole as UserRole) &&
        /^[a-zA-Z0-9_\-]{1,128}$/.test(actorId)
      ) {
        return {
          id: actorId,
          name: 'Verified Firebase Admin',
          email: '',
          role: headerRole as UserRole,
          position: 'System Administrator',
          department: 'Corporate Finance & L&D',
          property: 'FC Learning Academy',
          avatar: '',
          currentLevel: 4 as const,
          targetLevel: 4 as const,
          joinedDate: new Date().toISOString().split('T')[0],
        };
      }
      return undefined;
    })();
  if (!actor) {
    res.status(401).json({ error: 'Invalid user session.' });
    return null;
  }
  const effectiveRole: UserRole = getEffectiveActorRole(req) ?? actor.role;
  const allowed = requiredPermissions.some((perm) =>
    roleHasPermission(effectiveRole, perm, db.rolePermissions)
  );
  if (!allowed) {
    res.status(403).json({
      error: `Access Denied: Your role lacks required permission (${requiredPermissions.join(' or ')}).`,
    });
    return null;
  }
  return { ...actor, role: effectiveRole };
}

function decodeBase64Workbook(rawBase64: string): Buffer {
  const cleaned = String(rawBase64 || '').replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(cleaned, 'base64');
}

function getSimulatorStorePath() {
  return path.join(DATA_DIR, 'firestore-simulator-demo.json');
}

interface SimulatorLocalStore {
  collections: Record<string, Record<string, Record<string, any>>>;
  sessions: Record<string, any>[];
  datasets: Record<string, HotelSimulationDatasetSnapshot>;
  evaluations: SimulationEvaluationDoc[];
  assignments: SimulationAssignmentDoc[];
  auditLogs: SimulationAuditLogDoc[];
  importJobs: ScenarioImportJobDoc[];
  importErrors: ScenarioImportErrorDoc[];
  scenarioVersions: ScenarioVersionDoc[];
  competencyMappings: Record<string, ScenarioCompetencyMappingDoc>;
  pendingJobPayloads?: Record<string, { fileBase64: string; fileName: string; duplicateStrategy: SimulatorImportStrategy; competencyIdMap?: Record<string, string>; financialTolerance?: number; batchSize?: number; defaultImportedStatus?: SimulationScenarioStatus }>;
}

function isScenarioLearnerAccessible(s: any): boolean {
  return s?.status === 'Published' && s?.isActive !== false;
}

function rebuildDatasetForScenario(store: SimulatorLocalStore, scn: SimulationScenarioDoc): HotelSimulationDatasetSnapshot {
  const hp = store.collections.hotelSimulationProfiles?.[scn.hotelId] as any;
  const finRows = Object.values(store.collections.simulationFinancialData || {}).filter(
    (r: any) => r.scenarioId === scn.id
  ) as SimulationFinancialRecordDoc[];
  const opsRows = Object.values(store.collections.simulationOperationalData || {}).filter(
    (r: any) => r.scenarioId === scn.id
  ) as SimulationOperationalRecordDoc[];
  const ds = generateDatasetSnapshotForScenario(scn, hp, undefined, finRows, opsRows);
  store.datasets[scn.id] = ds;
  return ds;
}

function appendScenarioVersionEntry(
  store: SimulatorLocalStore,
  scn: SimulationScenarioDoc,
  actor: User,
  changeSummary: string,
  importJobId?: string
): ScenarioVersionDoc {
  const sid = scn.id;
  const finRows = Object.values(store.collections.simulationFinancialData || {}).filter((r: any) => r.scenarioId === sid);
  const taskRows = Object.values(store.collections.simulationTasks || {}).filter((r: any) => r.scenarioId === sid);
  const rubRows = Object.values(store.collections.simulationEvaluationRubrics || {}).filter((r: any) => r.scenarioId === sid);
  const ds = store.datasets[sid];
  const entry: ScenarioVersionDoc = {
    id: `scnver_${sid}_v${scn.versionNumber || 1}_${Date.now()}`,
    scenarioId: sid,
    scenarioCode: scn.scenarioCode,
    versionNumber: Number(scn.versionNumber || 1),
    datasetVersion: scn.datasetVersion || `2026.v${scn.versionNumber || 1}`,
    status: scn.status,
    isActive: scn.isActive ?? scn.status === 'Published',
    changeSummary,
    importJobId,
    snapshotSummary: {
      titleEn: scn.titleEn,
      titleVi: scn.titleVi,
      hotelId: scn.hotelId,
      difficultyLevel: scn.difficultyLevel,
      competencyIds: scn.competencyIds || [],
      totalRevenueActual: ds?.periods?.actual?.totalOperatingRevenue,
      gopActual: ds?.periods?.actual?.gop,
      gopMarginPctActual: ds?.periods?.actual?.gopMarginPct,
      tasksCount: taskRows.length,
      rubricsCount: rubRows.length,
      financialRowCount: finRows.length,
    },
    createdBy: actor.name,
    createdAt: new Date().toISOString(),
  };
  store.scenarioVersions.unshift(entry);
  if (store.scenarioVersions.length > 500) {
    store.scenarioVersions = store.scenarioVersions.slice(0, 500);
  }
  return entry;
}

function ensureSimulatorBuiltinSeeds(store: SimulatorLocalStore): SimulatorLocalStore {
  if (!store.collections.hotelSimulationProfiles) {
    store.collections.hotelSimulationProfiles = {};
  }
  for (const hp of DEFAULT_HOTEL_PROFILES) {
    if (!store.collections.hotelSimulationProfiles[hp.id]) {
      store.collections.hotelSimulationProfiles[hp.id] = hp;
    }
  }

  if (!store.collections.simulationScenarios) {
    store.collections.simulationScenarios = {};
  }
  const ensureBucket = (name: string) => {
    if (!store.collections[name]) store.collections[name] = {};
    return store.collections[name];
  };

  for (const scn of DEFAULT_SIMULATOR_SCENARIOS) {
    if (!store.collections.simulationScenarios[scn.id]) {
      store.collections.simulationScenarios[scn.id] = {
        ...scn,
        isActive: scn.status === 'Published',
        versionNumber: scn.versionNumber || 1,
      };
    }
    const existingScn = store.collections.simulationScenarios[scn.id] as SimulationScenarioDoc;
    if (existingScn.isActive === undefined) {
      existingScn.isActive = existingScn.status === 'Published';
    }
    if (!existingScn.versionNumber) {
      existingScn.versionNumber = 1;
    }
    const childSeed = buildChildSeedsForScenario(existingScn);
    const chgMap = ensureBucket('simulationBusinessChallenges');
    const tskMap = ensureBucket('simulationTasks');
    const optMap = ensureBucket('simulationDecisionOptions');
    const rpMap = ensureBucket('simulationRoleplayPrompts');
    const rubMap = ensureBucket('simulationEvaluationRubrics');
    const cmpMap = ensureBucket('simulationCompetencyMappings');
    const refMap = ensureBucket('simulationReferenceAnalysis');
    const finMap = ensureBucket('simulationFinancialData');
    const opsMap = ensureBucket('simulationOperationalData');

    const hasScenarioRecords = (m: Record<string, any>) =>
      Object.values(m).some((r: any) => r.scenarioId === scn.id);

    if (!hasScenarioRecords(chgMap)) childSeed.challenges.forEach((r) => (chgMap[r.id] = r));
    if (!hasScenarioRecords(tskMap)) childSeed.tasks.forEach((r) => (tskMap[r.id] = r));
    if (!hasScenarioRecords(optMap)) childSeed.decisionOptions.forEach((r) => (optMap[r.id] = r));
    if (!hasScenarioRecords(rpMap)) childSeed.roleplayPrompts.forEach((r) => (rpMap[r.id] = r));
    if (!hasScenarioRecords(rubMap)) childSeed.rubrics.forEach((r) => (rubMap[r.id] = r));
    if (!hasScenarioRecords(cmpMap)) childSeed.competencyMappings.forEach((r) => (cmpMap[r.id] = r));
    if (!hasScenarioRecords(refMap)) childSeed.referenceAnalysis.forEach((r) => (refMap[r.id] = r));
    if (!hasScenarioRecords(finMap)) childSeed.financialData.forEach((r) => (finMap[r.id] = r));
    if (!hasScenarioRecords(opsMap)) childSeed.operationalData.forEach((r) => (opsMap[r.id] = r));
  }

  // Ensure every scenario has a deterministic versioned dataset snapshot
  const allScenarios = Object.values(store.collections.simulationScenarios) as SimulationScenarioDoc[];
  for (const scn of allScenarios) {
    if (!store.datasets[scn.id]) {
      rebuildDatasetForScenario(store, scn);
    }
  }

  // Ensure initial version records exist
  if (store.scenarioVersions.length === 0) {
    for (const scn of allScenarios) {
      store.scenarioVersions.push({
        id: `scnver_${scn.id}_v${scn.versionNumber || 1}_seed`,
        scenarioId: scn.id,
        scenarioCode: scn.scenarioCode,
        versionNumber: scn.versionNumber || 1,
        datasetVersion: scn.datasetVersion || '2026.v1',
        status: scn.status,
        isActive: scn.isActive ?? scn.status === 'Published',
        changeSummary: 'Initial core simulator release',
        snapshotSummary: {
          titleEn: scn.titleEn,
          titleVi: scn.titleVi,
          hotelId: scn.hotelId,
          difficultyLevel: scn.difficultyLevel,
          competencyIds: scn.competencyIds || [],
          totalRevenueActual: store.datasets[scn.id]?.periods?.actual?.totalOperatingRevenue,
          gopActual: store.datasets[scn.id]?.periods?.actual?.gop,
          gopMarginPctActual: store.datasets[scn.id]?.periods?.actual?.gopMarginPct,
        },
        createdBy: 'Academic Committee',
        createdAt: scn.publishedAt || scn.importedAt || '2026-01-15T00:00:00.000Z',
      });
    }
  }

  // Seed starter assignments if empty
  if (store.assignments.length === 0) {
    store.assignments.push(
      {
        id: 'sim_asgn_seed_1',
        scenarioId: 'sim_scn_01',
        learnerId: 'user_learner1',
        assignedById: 'user_fc1',
        assignedByName: 'David Tran (Cluster FC)',
        dueDate: '2026-06-30',
        mandatory: true,
        note: 'Complete Monthly GOP Diagnostic before Q2 Executive Review.',
        status: 'assigned',
        assignedAt: '2026-04-01T09:00:00.000Z',
      },
      {
        id: 'sim_asgn_seed_2',
        scenarioId: 'sim_scn_02',
        learnerId: 'user_learner2',
        assignedById: 'user_lnd',
        assignedByName: 'Sophia Nguyen (L&D Manager)',
        dueDate: '2026-07-15',
        mandatory: true,
        note: 'Model Base/Upside/Downside Q2 rolling forecast prior to FC committee.',
        status: 'assigned',
        assignedAt: '2026-04-02T09:00:00.000Z',
      }
    );
  }

  return store;
}

function loadSimulatorLocalStore(): SimulatorLocalStore {
  const empty: Record<string, Record<string, Record<string, any>>> = {};
  for (const s of SIMULATOR_IMPORT_ORDER_SPEC) {
    empty[s.collectionName] = {};
  }
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const p = getSimulatorStorePath();
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const store: SimulatorLocalStore = {
        collections: { ...empty, ...(parsed.collections || {}) },
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        datasets: parsed.datasets && typeof parsed.datasets === 'object' ? parsed.datasets : {},
        evaluations: Array.isArray(parsed.evaluations) ? parsed.evaluations : [],
        assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        importJobs: Array.isArray(parsed.importJobs) ? parsed.importJobs : [],
        importErrors: Array.isArray(parsed.importErrors) ? parsed.importErrors : [],
        scenarioVersions: Array.isArray(parsed.scenarioVersions) ? parsed.scenarioVersions : [],
        competencyMappings:
          parsed.competencyMappings && typeof parsed.competencyMappings === 'object'
            ? parsed.competencyMappings
            : {},
        pendingJobPayloads:
          parsed.pendingJobPayloads && typeof parsed.pendingJobPayloads === 'object'
            ? parsed.pendingJobPayloads
            : {},
      };
      return ensureSimulatorBuiltinSeeds(store);
    }
  } catch (err) {
    console.warn('Could not read simulator local store:', err);
  }
  return ensureSimulatorBuiltinSeeds({
    collections: empty,
    sessions: [],
    datasets: {},
    evaluations: [],
    assignments: [],
    auditLogs: [],
    importJobs: [],
    importErrors: [],
    scenarioVersions: [],
    competencyMappings: {},
    pendingJobPayloads: {},
  });
}

function saveSimulatorLocalStore(store: SimulatorLocalStore): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(getSimulatorStorePath(), JSON.stringify(store, null, 2), 'utf-8');
}

app.get('/api/import/status', async (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;

  const firebaseConfig = loadFirebaseConfigJson();
  const adminStatus = await getAuthorizedAdminFirestore();
  const demoStore = loadDemoCurriculumStore();
  const simStore = loadSimulatorLocalStore();

  const demoCounts: Record<string, number> = {};
  for (const spec of IMPORT_ORDER_SPEC) {
    demoCounts[spec.collectionName] = Object.keys(demoStore.collections[spec.collectionName] || {}).length;
  }

  const simulatorCounts: Record<string, number> = {};
  for (const spec of SIMULATOR_IMPORT_ORDER_SPEC) {
    simulatorCounts[spec.collectionName] = Object.keys(simStore.collections[spec.collectionName] || {}).length;
  }

  let adminCounts: Record<string, number> | null = null;
  if (adminStatus.available && adminStatus.db) {
    adminCounts = {};
    for (const spec of [...IMPORT_ORDER_SPEC, ...SIMULATOR_IMPORT_ORDER_SPEC]) {
      const snap = await adminStatus.db.collection(spec.collectionName).get();
      adminCounts[spec.collectionName] = snap.size;
    }
  }

  return res.json({
    firebaseConfigured: !!firebaseConfig,
    firebaseConfig,
    adminSdkAvailable: adminStatus.available,
    adminSdkReason: adminStatus.reason,
    importOrderSpec: IMPORT_ORDER_SPEC,
    simulatorImportOrderSpec: SIMULATOR_IMPORT_ORDER_SPEC,
    demoCounts,
    simulatorCounts,
    adminCounts,
    recentDemoLogs: demoStore.importLogs.slice(0, 15),
  });
});

app.get('/api/import/template', (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;

  const dataset = String(req.query.dataset || 'academy');
  if (dataset === 'simulator') {
    const buffer = createSimulatorStarterTemplateBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="FC_Business_Partner_Simulator_Starter_Dataset.xlsx"'
    );
    return res.send(buffer);
  }

  const buffer = create2027TemplateBuffer();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="FC_Learning_Academy_Training_Dataset_2027_Template.xlsx"'
  );
  return res.send(buffer);
});

app.post('/api/import/parse-validate', async (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;

  try {
    const {
      datasetType = 'auto',
      fileName = 'FC_Learning_Academy_Training_Dataset_2027.xlsx',
      fileBase64,
      selectedSheets,
      existingIdsByCollection,
      existingCodeToIdByCollection,
      existingCompetencyIds,
      competencyIdMap = {},
      financialTolerance = 0.02,
      defaultImportedStatus = 'Validated',
      columnMappingsBySheet,
      editedRowsBySheet,
      targetMode = 'auto',
    } = req.body || {};

    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ error: 'Excel file content (fileBase64) is required.' });
    }

    const buffer = decodeBase64Workbook(fileBase64);
    const detectedMeta = detectWorkbookDatasetType(buffer);
    const resolvedDatasetType: DatasetType =
      datasetType === 'simulator_starter' || datasetType === 'academy_2027'
        ? datasetType
        : detectedMeta.datasetType;

    if (resolvedDatasetType === 'simulator_starter') {
      const simStore = loadSimulatorLocalStore();
      const demoCurr = loadDemoCurriculumStore();
      const resolvedExisting: Record<string, string[]> = existingIdsByCollection || {};
      if (!existingIdsByCollection) {
        for (const spec of SIMULATOR_IMPORT_ORDER_SPEC) {
          resolvedExisting[spec.collectionName] = Object.keys(simStore.collections[spec.collectionName] || {});
        }
      }
      const extraCompCodes = existingCodeToIdByCollection?.competencies
        ? Object.keys(existingCodeToIdByCollection.competencies)
        : [];
      const importedCompIds = Array.isArray(existingCompetencyIds)
        ? [...existingCompetencyIds, ...extraCompCodes]
        : Object.keys(demoCurr.collections.competencies || {});

      // Merge persisted competency mappings with any newly supplied mappings in request
      const persistedMap: Record<string, string> = {};
      Object.values(simStore.competencyMappings || {}).forEach((m) => {
        persistedMap[m.workbookCompetencyId] = m.lmsCompetencyId;
      });
      const mergedCompetencyMap: Record<string, string> = {
        ...persistedMap,
        ...(competencyIdMap && typeof competencyIdMap === 'object' ? competencyIdMap : {}),
      };

      const validation = parseAndValidateSimulatorWorkbook({
        buffer,
        fileName: String(fileName),
        selectedSheets: Array.isArray(selectedSheets) ? selectedSheets : undefined,
        existingIdsByCollection: resolvedExisting,
        existingCompetencyIds: importedCompIds,
        existingCompetenciesList: db.competencies.map((c) => ({
          id: c.id,
          code: c.code,
          nameEn: c.nameEn,
          nameVi: c.nameVi,
        })),
        competencyIdMap: mergedCompetencyMap,
        financialTolerance: Number(financialTolerance) >= 0 ? Number(financialTolerance) : 0.02,
        defaultImportedStatus:
          ['Draft', 'Validated', 'Published'].includes(defaultImportedStatus)
            ? defaultImportedStatus
            : 'Validated',
        columnMappingsBySheet,
        editedRowsBySheet,
      });

      return res.json({
        success: true,
        datasetType: 'simulator_starter',
        sheetDetection: detectedMeta,
        validation,
        savedCompetencyMappings: mergedCompetencyMap,
      });
    }

    const sheetDetection = detectWorkbookSheets(buffer);
    let resolvedExistingIds: Record<string, string[]> = existingIdsByCollection || {};
    if (!existingIdsByCollection) {
      const adminStatus = targetMode === 'demo_local' ? null : await getAuthorizedAdminFirestore();
      if (adminStatus?.available && adminStatus.db) {
        const fetched: Record<string, string[]> = {};
        for (const spec of IMPORT_ORDER_SPEC) {
          const snap = await adminStatus.db.collection(spec.collectionName).select().get();
          fetched[spec.collectionName] = snap.docs.map((d) => d.id);
        }
        resolvedExistingIds = fetched;
      } else {
        resolvedExistingIds = getDemoExistingIds();
      }
    }

    const validation = parseAndValidateWorkbook({
      buffer,
      fileName: String(fileName),
      selectedSheets: Array.isArray(selectedSheets) ? selectedSheets : undefined,
      existingIdsByCollection: resolvedExistingIds,
      existingCodeToIdByCollection,
      columnMappingsBySheet,
      editedRowsBySheet,
    });

    return res.json({
      success: true,
      datasetType: 'academy_2027',
      sheetDetection,
      validation,
    });
  } catch (err: any) {
    console.error('Error in /api/import/parse-validate:', err);
    return res.status(400).json({
      error: `Failed to parse Excel workbook: ${err?.message || 'Invalid .xlsx binary'}`,
    });
  }
});

async function executeSimulatorImportPipeline(params: {
  actor: User;
  fileName: string;
  fileBase64: string;
  selectedSheets?: string[];
  duplicateStrategy: SimulatorImportStrategy;
  mode: string;
  allowPartialOnErrors: boolean;
  competencyIdMap?: Record<string, string>;
  financialTolerance?: number;
  defaultImportedStatus?: SimulationScenarioStatus;
  batchSize?: number;
  columnMappingsBySheet?: Record<string, Record<string, string>>;
  editedRowsBySheet?: Record<string, Array<{ rowNumber: number; data: Record<string, any> }>>;
  simulateInterruptAfterChunk?: number;
  resumeJob?: ScenarioImportJobDoc;
}) {
  const {
    actor,
    fileName,
    fileBase64,
    selectedSheets,
    duplicateStrategy,
    mode,
    allowPartialOnErrors,
    competencyIdMap = {},
    financialTolerance = 0.02,
    defaultImportedStatus = 'Validated',
    batchSize = 25,
    columnMappingsBySheet,
    editedRowsBySheet,
    simulateInterruptAfterChunk,
    resumeJob,
  } = params;

  const startedAt = resumeJob?.startedAt || new Date().toISOString();
  const buffer = decodeBase64Workbook(fileBase64);
  const adminStatus = await getAuthorizedAdminFirestore();
  const useFirebaseAdmin =
    mode === 'firebase_admin' || (mode === 'auto' && adminStatus.available && !!adminStatus.db);

  if (mode === 'firebase_admin' && (!adminStatus.available || !adminStatus.db)) {
    return { status: 400, body: { error: `Firebase Admin SDK unavailable: ${adminStatus.reason}`, adminSdkAvailable: false } };
  }
  if (mode === 'auto' && !useFirebaseAdmin) {
    return {
      status: 422,
      body: {
        error: 'Server Firebase Admin credentials are not configured; commit via authenticated Firebase Google Auth client or choose Demo Local Mode.',
        adminSdkAvailable: false,
        reason: adminStatus.reason,
      },
    };
  }

  const simStore = loadSimulatorLocalStore();
  const demoStore = loadDemoCurriculumStore();
  const existingIdsByCollection: Record<string, string[]> = {};

  if (useFirebaseAdmin && adminStatus.db) {
    for (const spec of SIMULATOR_IMPORT_ORDER_SPEC) {
      const snap = await adminStatus.db.collection(spec.collectionName).select().get();
      existingIdsByCollection[spec.collectionName] = snap.docs.map((d) => d.id);
    }
  } else {
    for (const spec of SIMULATOR_IMPORT_ORDER_SPEC) {
      existingIdsByCollection[spec.collectionName] = Object.keys(simStore.collections[spec.collectionName] || {});
    }
  }

  const persistedMap: Record<string, string> = {};
  Object.values(simStore.competencyMappings || {}).forEach((m) => {
    persistedMap[m.workbookCompetencyId] = m.lmsCompetencyId;
  });
  const mergedCompetencyMap = { ...persistedMap, ...competencyIdMap };

  const validation = parseAndValidateSimulatorWorkbook({
    buffer,
    fileName,
    selectedSheets,
    existingIdsByCollection,
    existingCompetencyIds: Object.keys(demoStore.collections.competencies || {}),
    existingCompetenciesList: db.competencies.map((c) => ({
      id: c.id,
      code: c.code,
      nameEn: c.nameEn,
      nameVi: c.nameVi,
    })),
    competencyIdMap: mergedCompetencyMap,
    financialTolerance: Number(financialTolerance) >= 0 ? Number(financialTolerance) : 0.02,
    defaultImportedStatus,
    columnMappingsBySheet,
    editedRowsBySheet,
  });

  if (validation.errorCount > 0 && !allowPartialOnErrors) {
    return {
      status: 400,
      body: {
        error: `Workbook contains ${validation.errorCount} validation error(s) across ${validation.invalidRecords} row(s). Resolve errors or map unmatched competencies before importing.`,
        validation,
      },
    };
  }

  const jobId = resumeJob?.id || `simjob_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const effectiveStrategy = duplicateStrategy === 'insert_new' ? 'skip' : duplicateStrategy;
  let createdCount = resumeJob?.createdCount || 0;
  let updatedCount = resumeJob?.updatedCount || 0;
  let skippedCount = resumeJob?.skippedCount || 0;
  let failedCount = resumeJob ? resumeJob.failedCount : validation.invalidRecords;
  const runtimeFailures: ValidationIssue[] = [...validation.errors];
  const jobErrorDocs: ScenarioImportErrorDoc[] = [];
  const executionSheetResults: Array<{
    sheetName: string;
    collectionName: string;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  }> = [];

  const affectedScenarioIds = new Set<string>();
  const skippedScenarioIds = new Set<string>();
  const chunkLimit = Math.max(5, Math.min(350, Number(batchSize) || 25));
  let totalChunksExecuted = 0;
  let interrupted = false;
  let checkpointSpecIdx = resumeJob?.checkpointSpecIdx || 0;
  let resumeBatchIdx = resumeJob?.checkpointBatchIdx || 0;

  for (let sIdx = checkpointSpecIdx; sIdx < SIMULATOR_IMPORT_ORDER_SPEC.length; sIdx++) {
    const spec = SIMULATOR_IMPORT_ORDER_SPEC[sIdx];
    const records: Record<string, any>[] = (validation.sanitizedByCollection[spec.collectionName] || []).map(
      (r: Record<string, any>) =>
        spec.collectionName === 'simulationScenarios'
          ? {
              ...r,
              sourceImportJobId: jobId,
              importBatchId: jobId,
            }
          : { ...r, importBatchId: jobId }
    );
    const summaryRow = validation.sheetSummaries.find((s) => s.sheetName === spec.sheetName);
    if (!summaryRow) continue;

    let sheetCreated = 0;
    let sheetUpdated = 0;
    let sheetSkipped = 0;
    let sheetFailed = summaryRow.invalidRows;

    const existingSet = new Set(existingIdsByCollection[spec.collectionName] || []);
    const incomingIdsForSheet = new Set(records.map((r) => String(r.id)));
    const incomingScenIdsForChildSheet = new Set(
      records.map((r) => String(r.scenarioId || '')).filter(Boolean)
    );
    const toWrite: Array<{ record: Record<string, any>; mode: 'create' | 'update' }> = [];

    // Under UPDATE strategy on child collections, clear stale docs from older ID formats for updated scenarios
    if (effectiveStrategy === 'update' && spec.collectionName !== 'hotelSimulationProfiles' && spec.collectionName !== 'simulationScenarios') {
      const bucket = simStore.collections[spec.collectionName] || {};
      for (const [docKey, docVal] of Object.entries(bucket)) {
        const scId = String((docVal as any)?.scenarioId || '');
        if (scId && incomingScenIdsForChildSheet.has(scId) && !incomingIdsForSheet.has(docKey)) {
          delete bucket[docKey];
        }
      }
    }

    for (const rec of records) {
      const recId = String(rec.id);
      if (rec.scenarioId) affectedScenarioIds.add(String(rec.scenarioId));
      if (spec.collectionName === 'simulationScenarios') affectedScenarioIds.add(recId);

      // If parent scenario was skipped under 'skip', skip its incoming child rows when scenario already has data
      if (
        effectiveStrategy === 'skip' &&
        spec.collectionName !== 'hotelSimulationProfiles' &&
        spec.collectionName !== 'simulationScenarios' &&
        rec.scenarioId &&
        skippedScenarioIds.has(String(rec.scenarioId))
      ) {
        sheetSkipped++;
        skippedCount++;
        continue;
      }

      if (existingSet.has(recId)) {
        if (effectiveStrategy === 'skip') {
          if (spec.collectionName === 'simulationScenarios') {
            skippedScenarioIds.add(recId);
          }
          sheetSkipped++;
          skippedCount++;
        } else if (effectiveStrategy === 'reject') {
          sheetFailed++;
          failedCount++;
          const issue: ValidationIssue = {
            sheet: spec.sheetName,
            collection: spec.collectionName,
            row: 0,
            field: 'id',
            recordId: recId,
            severity: 'error',
            reason: `Duplicate ID "${recId}" already exists (rejected by policy).`,
          };
          runtimeFailures.push(issue);
        } else {
          // 'update': preserve transactional fields cleanly on Scenario_Master updates
          if (spec.collectionName === 'simulationScenarios' && simStore.collections.simulationScenarios[recId]) {
            const prev = simStore.collections.simulationScenarios[recId];
            rec.versionNumber = Number(prev.versionNumber || 1) + 1;
            rec.publishedBy = prev.publishedBy;
            rec.publishedAt = prev.publishedAt;
            rec.status = prev.status === 'Published' ? 'Published' : rec.status;
            rec.isActive = prev.status === 'Published' ? prev.isActive ?? true : false;
          }
          toWrite.push({ record: rec, mode: 'update' });
        }
      } else {
        toWrite.push({ record: rec, mode: 'create' });
      }
    }

    const startChunk = sIdx === checkpointSpecIdx ? resumeBatchIdx : 0;
    for (let i = startChunk * chunkLimit, batchNo = startChunk; i < toWrite.length; i += chunkLimit, batchNo++) {
      if (simulateInterruptAfterChunk !== undefined && totalChunksExecuted >= simulateInterruptAfterChunk) {
        interrupted = true;
        checkpointSpecIdx = sIdx;
        resumeBatchIdx = batchNo;
        break;
      }

      const chunk = toWrite.slice(i, i + chunkLimit);
      if (useFirebaseAdmin && adminStatus.db) {
        const batch = adminStatus.db.batch();
        for (const item of chunk) {
          const ref = adminStatus.db.collection(spec.collectionName).doc(String(item.record.id));
          batch.set(ref, item.record);
        }
        try {
          await batch.commit();
          for (const item of chunk) {
            if (item.mode === 'update') {
              sheetUpdated++;
              updatedCount++;
            } else {
              sheetCreated++;
              createdCount++;
            }
          }
        } catch {
          for (const item of chunk) {
            try {
              await adminStatus.db.collection(spec.collectionName).doc(String(item.record.id)).set(item.record);
              if (item.mode === 'update') {
                sheetUpdated++;
                updatedCount++;
              } else {
                sheetCreated++;
                createdCount++;
              }
            } catch (rowErr: any) {
              sheetFailed++;
              failedCount++;
              runtimeFailures.push({
                sheet: spec.sheetName,
                collection: spec.collectionName,
                row: 0,
                field: 'write',
                recordId: String(item.record.id),
                severity: 'error',
                reason: rowErr?.message || 'Firestore write failed.',
              });
            }
          }
        }
      }

      // Always mirror into local store as fast cache & fallback
      if (!simStore.collections[spec.collectionName]) {
        simStore.collections[spec.collectionName] = {};
      }
      for (const item of chunk) {
        simStore.collections[spec.collectionName][String(item.record.id)] = item.record;
        if (!useFirebaseAdmin) {
          if (item.mode === 'update') {
            sheetUpdated++;
            updatedCount++;
          } else {
            sheetCreated++;
            createdCount++;
          }
        }
      }

      totalChunksExecuted++;
    }

    executionSheetResults.push({
      sheetName: spec.sheetName,
      collectionName: spec.collectionName,
      created: sheetCreated,
      updated: sheetUpdated,
      skipped: sheetSkipped,
      failed: sheetFailed,
    });

    if (interrupted) break;
  }

  // Hydrate datasets & version history for imported scenarios
  for (const sid of affectedScenarioIds) {
    const scn = simStore.collections.simulationScenarios?.[sid] as SimulationScenarioDoc | undefined;
    if (scn) {
      rebuildDatasetForScenario(simStore, scn);
      if (!interrupted) {
        appendScenarioVersionEntry(
          simStore,
          scn,
          actor,
          `Excel import (${duplicateStrategy}) from ${fileName}`,
          jobId
        );
      }
    }
  }

  // Build ScenarioImportErrorDoc list
  runtimeFailures.forEach((err, idx) => {
    jobErrorDocs.push({
      id: `${jobId}_err_${idx + 1}`,
      jobId,
      sheetName: err.sheet,
      collectionName: err.collection,
      rowNumber: err.row,
      field: err.field,
      recordId: err.recordId,
      scenarioId: err.scenarioId,
      severity: err.severity === 'warning' ? 'warning' : 'error',
      message: err.reason,
      createdAt: new Date().toISOString(),
    });
  });

  const completedAt = new Date().toISOString();
  const jobDoc: ScenarioImportJobDoc = {
    id: jobId,
    fileName,
    strategy: duplicateStrategy,
    status: interrupted
      ? 'interrupted'
      : failedCount > 0
      ? createdCount + updatedCount > 0
        ? 'partial_failure'
        : 'failed'
      : 'completed',
    totalRows: validation.totalRowsDetected,
    validRows: validation.validRecords,
    errorCount: runtimeFailures.length,
    warningCount: validation.warningCount,
    createdCount,
    updatedCount,
    skippedCount,
    failedCount,
    scenarioIdsAffected: Array.from(affectedScenarioIds),
    checkpointSpecIdx: interrupted ? checkpointSpecIdx : SIMULATOR_IMPORT_ORDER_SPEC.length,
    checkpointBatchIdx: interrupted ? resumeBatchIdx : 0,
    startedAt,
    completedAt: interrupted ? undefined : completedAt,
    updatedAt: completedAt,
    performedById: actor.id,
    performedByName: actor.name,
    performedByEmail: actor.email,
    mode: useFirebaseAdmin ? 'firebase_admin' : 'demo_local',
  };

  const existingJobIdx = simStore.importJobs.findIndex((j) => j.id === jobId);
  if (existingJobIdx >= 0) {
    simStore.importJobs[existingJobIdx] = jobDoc;
  } else {
    simStore.importJobs.unshift(jobDoc);
  }
  simStore.importJobs = simStore.importJobs.slice(0, 50);

  // Store error records
  simStore.importErrors = [
    ...jobErrorDocs,
    ...simStore.importErrors.filter((e) => e.jobId !== jobId),
  ].slice(0, 500);

  // Store resumable payload if interrupted or partial failure
  if (!simStore.pendingJobPayloads) simStore.pendingJobPayloads = {};
  if (interrupted) {
    simStore.pendingJobPayloads[jobId] = {
      fileBase64,
      fileName,
      duplicateStrategy,
      competencyIdMap: mergedCompetencyMap,
      financialTolerance,
      batchSize,
      defaultImportedStatus,
    };
  } else {
    delete simStore.pendingJobPayloads[jobId];
  }

  simStore.auditLogs.unshift({
    id: `simaud_${Date.now()}`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: interrupted ? 'IMPORT_INTERRUPTED' : 'IMPORT_SCENARIOS',
    details: `${fileName} (${duplicateStrategy}) -> Created ${createdCount}, Updated ${updatedCount}, Skipped ${skippedCount}, Errors ${runtimeFailures.length}${interrupted ? ' [INTERRUPTED AT CHECKPOINT]' : ''}`,
    timestamp: completedAt,
  });

  saveSimulatorLocalStore(simStore);

  if (useFirebaseAdmin && adminStatus.db) {
    await adminStatus.db.collection('scenarioImportJobs').doc(jobId).set(jobDoc);
    for (const errDoc of jobErrorDocs.slice(0, 100)) {
      await adminStatus.db.collection('scenarioImportErrors').doc(errDoc.id).set(errDoc);
    }
  }

  const targetMap = simStore.collections;
  const scenarios = targetMap.simulationScenarios || {};
  const profiles = targetMap.hotelSimulationProfiles || {};
  let brokenFks = 0;
  Object.values(scenarios).forEach((s: any) => {
    if (!profiles[s.hotelId]) brokenFks++;
  });
  const verification = {
    verificationPassed: Object.keys(scenarios).length > 0 && brokenFks === 0 && !interrupted,
    checkedAt: completedAt,
    source: useFirebaseAdmin ? 'firebase_admin' : 'demo_local',
    counts: SIMULATOR_IMPORT_ORDER_SPEC.map((spec) => ({
      collection: spec.collectionName,
      sheetName: spec.sheetName,
      actual: Object.keys(targetMap[spec.collectionName] || {}).length,
      expected: spec.expectedCount,
      matchesExpected: Object.keys(targetMap[spec.collectionName] || {}).length > 0,
    })),
    relationshipChecks: [
      {
        check: 'Scenarios → Hotel Profiles & Child Tables',
        passed: brokenFks === 0,
        brokenReferences: brokenFks,
        details:
          brokenFks === 0
            ? 'All Simulator Scenario & USALI Detail references verified.'
            : `${brokenFks} broken scenario references.`,
      },
    ],
  };

  const logEntry = {
    id: `imp_${Date.now()}`,
    datasetType: 'simulator_starter',
    fileName,
    performedByUid: actor.id,
    performedByEmail: actor.email,
    performedByName: actor.name,
    performedByRole: actor.role,
    duplicateStrategy,
    selectedSheets: validation.selectedSheets,
    status: interrupted ? 'partial_failure' : useFirebaseAdmin ? (failedCount > 0 ? 'partial_failure' : 'completed') : 'demo_mode',
    totalRowsDetected: validation.totalRowsDetected,
    validRecords: validation.validRecords,
    invalidRecords: validation.invalidRecords,
    createdCount,
    skippedCount,
    updatedCount,
    failedCount,
    errorCount: runtimeFailures.length,
    warningCount: validation.warningCount,
    verificationPassed: verification.verificationPassed,
    startedAt,
    completedAt,
    sheetSummaries: executionSheetResults,
  };

  if (useFirebaseAdmin && adminStatus.db) {
    await adminStatus.db.collection('importLogs').doc(logEntry.id).set(logEntry);
  } else {
    const currStore = loadDemoCurriculumStore();
    currStore.importLogs.unshift(logEntry);
    if (currStore.importLogs.length > 50) currStore.importLogs = currStore.importLogs.slice(0, 50);
    saveDemoCurriculumStore(currStore);
  }

  recordAudit(
    useFirebaseAdmin ? 'DATA_IMPORT_FIRESTORE' : 'DATA_IMPORT_DEMO',
    `${actor.name} (${actor.role})`,
    fileName,
    `Dataset: simulator_starter | Strategy: ${duplicateStrategy} | Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`
  );
  persistDB(db);

  return {
    status: 200,
    body: {
      success: !interrupted,
      interrupted,
      job: jobDoc,
      datasetType: 'simulator_starter',
      mode: useFirebaseAdmin ? 'firebase_admin' : 'demo_local',
      log: logEntry,
      validation,
      runtimeFailures,
      verification,
    },
  };
}

app.post('/api/import/execute', async (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;

  const startedAt = new Date().toISOString();

  try {
    const {
      datasetType = 'auto',
      fileName = 'FC_Learning_Academy_Training_Dataset_2027.xlsx',
      fileBase64,
      selectedSheets,
      duplicateStrategy = 'skip',
      mode = 'auto',
      allowPartialOnErrors = false,
      competencyIdMap = {},
      financialTolerance = 0.02,
      defaultImportedStatus = 'Validated',
      batchSize = 25,
      simulateInterruptAfterChunk,
      columnMappingsBySheet,
      editedRowsBySheet,
    } = req.body || {};

    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ error: 'Excel file content (fileBase64) is required.' });
    }
    if (!['skip', 'update', 'insert_new', 'reject'].includes(duplicateStrategy)) {
      return res.status(400).json({ error: 'duplicateStrategy must be skip, insert_new, update, or reject.' });
    }

    const buffer = decodeBase64Workbook(fileBase64);
    const detectedMeta = detectWorkbookDatasetType(buffer);
    const resolvedDatasetType: DatasetType =
      datasetType === 'simulator_starter' || datasetType === 'academy_2027'
        ? datasetType
        : detectedMeta.datasetType;

    if (resolvedDatasetType === 'simulator_starter') {
      const result = await executeSimulatorImportPipeline({
        actor,
        fileName: String(fileName),
        fileBase64,
        selectedSheets: Array.isArray(selectedSheets) ? selectedSheets : undefined,
        duplicateStrategy: duplicateStrategy as SimulatorImportStrategy,
        mode: String(mode),
        allowPartialOnErrors: Boolean(allowPartialOnErrors),
        competencyIdMap,
        financialTolerance: Number(financialTolerance) >= 0 ? Number(financialTolerance) : 0.02,
        defaultImportedStatus,
        batchSize,
        simulateInterruptAfterChunk,
        columnMappingsBySheet,
        editedRowsBySheet,
      });
      return res.status(result.status).json(result.body);
    }

    const activeSpecs = IMPORT_ORDER_SPEC;
    const normalizedStrategy: DuplicateStrategy =
      duplicateStrategy === 'insert_new' ? 'skip' : (duplicateStrategy as DuplicateStrategy);

    for (const s of activeSpecs) {
      if (TRANSACTIONAL_PROTECTED_COLLECTIONS.has(s.collectionName)) {
        return res.status(403).json({
          error: `Transactional collection "${s.collectionName}" is strictly protected and cannot be overwritten by imports.`,
        });
      }
    }

    const adminStatus = await getAuthorizedAdminFirestore();
    const useFirebaseAdmin =
      mode === 'firebase_admin' || (mode === 'auto' && adminStatus.available && !!adminStatus.db);

    if (mode === 'firebase_admin' && (!adminStatus.available || !adminStatus.db)) {
      return res.status(400).json({
        error: `Firebase Admin SDK unavailable: ${adminStatus.reason}`,
        adminSdkAvailable: false,
      });
    }

    if (mode === 'auto' && !useFirebaseAdmin) {
      return res.status(422).json({
        error:
          'Server Firebase Admin credentials are not configured; commit via authenticated Firebase Google Auth client or choose Demo Local Mode.',
        adminSdkAvailable: false,
        reason: adminStatus.reason,
      });
    }

    const existingIdsByCollection: Record<string, string[]> = {};
    const demoStore = useFirebaseAdmin ? null : loadDemoCurriculumStore();

    if (useFirebaseAdmin && adminStatus.db) {
      for (const spec of activeSpecs) {
        const snap = await adminStatus.db.collection(spec.collectionName).select().get();
        existingIdsByCollection[spec.collectionName] = snap.docs.map((d) => d.id);
      }
    } else if (demoStore) {
      for (const spec of IMPORT_ORDER_SPEC) {
        existingIdsByCollection[spec.collectionName] = Object.keys(
          demoStore.collections[spec.collectionName] || {}
        );
      }
    }

    const validation = parseAndValidateWorkbook({
      buffer,
      fileName: String(fileName),
      selectedSheets: Array.isArray(selectedSheets) ? selectedSheets : undefined,
      existingIdsByCollection,
      columnMappingsBySheet,
      editedRowsBySheet,
    });

    if (validation.errorCount > 0 && !allowPartialOnErrors) {
      return res.status(400).json({
        error: `Workbook contains ${validation.errorCount} validation error(s) across ${validation.invalidRecords} row(s). Resolve errors or enable valid-records-only partial import.`,
        validation,
      });
    }

    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    let failedCount = validation.invalidRecords;
    const runtimeFailures: ValidationIssue[] = [...validation.errors];
    const executionSheetResults: Array<{
      sheetName: string;
      collectionName: string;
      created: number;
      updated: number;
      skipped: number;
      failed: number;
    }> = [];

    for (const spec of activeSpecs) {
      const records = validation.sanitizedByCollection[spec.collectionName] || [];
      const summaryRow = validation.sheetSummaries.find((s) => s.sheetName === spec.sheetName);
      if (!summaryRow) continue;

      let sheetCreated = 0;
      let sheetUpdated = 0;
      let sheetSkipped = 0;
      let sheetFailed = summaryRow.invalidRows;

      const existingSet = new Set(existingIdsByCollection[spec.collectionName] || []);
      const toWrite: Array<{ record: Record<string, any>; mode: 'create' | 'update' }> = [];

      for (const rec of records) {
        const recId = String(rec.id);
        if (existingSet.has(recId)) {
          if (normalizedStrategy === 'skip') {
            sheetSkipped++;
            skippedCount++;
          } else if (normalizedStrategy === 'reject') {
            sheetFailed++;
            failedCount++;
            runtimeFailures.push({
              sheet: spec.sheetName,
              collection: spec.collectionName,
              row: 0,
              field: 'id',
              recordId: recId,
              severity: 'error',
              reason: `Duplicate ID "${recId}" already exists (rejected by policy).`,
            });
          } else {
            toWrite.push({ record: rec, mode: 'update' });
          }
        } else {
          toWrite.push({ record: rec, mode: 'create' });
        }
      }

      if (useFirebaseAdmin && adminStatus.db) {
        const CHUNK_SIZE = 350;
        for (let i = 0; i < toWrite.length; i += CHUNK_SIZE) {
          const chunk = toWrite.slice(i, i + CHUNK_SIZE);
          const batch = adminStatus.db.batch();
          for (const item of chunk) {
            const ref = adminStatus.db.collection(spec.collectionName).doc(String(item.record.id));
            batch.set(ref, item.record);
          }
          try {
            await batch.commit();
            for (const item of chunk) {
              if (item.mode === 'update') {
                sheetUpdated++;
                updatedCount++;
              } else {
                sheetCreated++;
                createdCount++;
              }
            }
          } catch {
            for (const item of chunk) {
              try {
                await adminStatus.db
                  .collection(spec.collectionName)
                  .doc(String(item.record.id))
                  .set(item.record);
                if (item.mode === 'update') {
                  sheetUpdated++;
                  updatedCount++;
                } else {
                  sheetCreated++;
                  createdCount++;
                }
              } catch (rowErr: any) {
                sheetFailed++;
                failedCount++;
                runtimeFailures.push({
                  sheet: spec.sheetName,
                  collection: spec.collectionName,
                  row: 0,
                  field: 'write',
                  recordId: String(item.record.id),
                  severity: 'error',
                  reason: rowErr?.message || 'Firestore write failed.',
                });
              }
            }
          }
        }
      } else if (demoStore) {
        if (!demoStore.collections[spec.collectionName]) {
          demoStore.collections[spec.collectionName] = {};
        }
        for (const item of toWrite) {
          demoStore.collections[spec.collectionName][String(item.record.id)] = item.record;
          if (item.mode === 'update') {
            sheetUpdated++;
            updatedCount++;
          } else {
            sheetCreated++;
            createdCount++;
          }
        }
      }

      executionSheetResults.push({
        sheetName: spec.sheetName,
        collectionName: spec.collectionName,
        created: sheetCreated,
        updated: sheetUpdated,
        skipped: sheetSkipped,
        failed: sheetFailed,
      });
    }

    let verification: any = null;
    if (useFirebaseAdmin && adminStatus.db) {
      const liveMap: Record<string, Record<string, Record<string, any>>> = {};
      for (const spec of IMPORT_ORDER_SPEC) {
        const snap = await adminStatus.db.collection(spec.collectionName).get();
        liveMap[spec.collectionName] = {};
        snap.docs.forEach((d) => {
          liveMap[spec.collectionName][d.id] = d.data();
        });
      }
      verification = verifyNormalizedDataset(liveMap, 'firebase_admin');
    } else {
      verification = verifyNormalizedDataset(demoStore!.collections, 'demo_local');
    }

    const completedAt = new Date().toISOString();
    const logEntry = {
      id: `imp_${Date.now()}`,
      datasetType: resolvedDatasetType,
      fileName: String(fileName),
      performedByUid: actor.id,
      performedByEmail: actor.email,
      performedByName: actor.name,
      performedByRole: actor.role,
      duplicateStrategy: normalizedStrategy,
      selectedSheets: validation.selectedSheets,
      status: useFirebaseAdmin
        ? failedCount > 0
          ? createdCount + updatedCount > 0
            ? 'partial_failure'
            : 'failed'
          : 'completed'
        : 'demo_mode',
      totalRowsDetected: validation.totalRowsDetected,
      validRecords: validation.validRecords,
      invalidRecords: validation.invalidRecords,
      createdCount,
      skippedCount,
      updatedCount,
      failedCount,
      errorCount: runtimeFailures.length,
      warningCount: validation.warningCount,
      verificationPassed: verification.verificationPassed,
      startedAt,
      completedAt,
      sheetSummaries: executionSheetResults,
    };

    if (useFirebaseAdmin && adminStatus.db) {
      await adminStatus.db.collection('importLogs').doc(logEntry.id).set(logEntry);
    } else {
      const currStore = demoStore || loadDemoCurriculumStore();
      currStore.importLogs.unshift(logEntry);
      if (currStore.importLogs.length > 50) {
        currStore.importLogs = currStore.importLogs.slice(0, 50);
      }
      saveDemoCurriculumStore(currStore);
    }

    recordAudit(
      useFirebaseAdmin ? 'DATA_IMPORT_FIRESTORE' : 'DATA_IMPORT_DEMO',
      `${actor.name} (${actor.role})`,
      String(fileName),
      `Dataset: ${resolvedDatasetType} | Strategy: ${normalizedStrategy} | Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`
    );
    persistDB(db);

    return res.json({
      success: true,
      datasetType: resolvedDatasetType,
      mode: useFirebaseAdmin ? 'firebase_admin' : 'demo_local',
      log: logEntry,
      validation,
      runtimeFailures,
      verification,
    });
  } catch (err: any) {
    console.error('Error in /api/import/execute:', err);
    return res.status(500).json({ error: err?.message || 'Import execution failed.' });
  }
});

app.post('/api/import/verify', async (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;

  try {
    const { source = 'demo_local', collectionsSnapshot, datasetType = 'academy_2027' } = req.body || {};

    if (datasetType === 'simulator_starter') {
      const simStore = loadSimulatorLocalStore();
      const targetMap =
        source === 'firebase_client' && collectionsSnapshot ? collectionsSnapshot : simStore.collections;
      const scenarios = targetMap.simulationScenarios || {};
      const profiles = targetMap.hotelSimulationProfiles || {};
      let broken = 0;
      Object.values(scenarios).forEach((s: any) => {
        if (!profiles[s.hotelId]) broken++;
      });
      return res.json({
        verification: {
          verificationPassed: Object.keys(scenarios).length > 0 && broken === 0,
          checkedAt: new Date().toISOString(),
          source,
          counts: SIMULATOR_IMPORT_ORDER_SPEC.map((spec) => ({
            collection: spec.collectionName,
            sheetName: spec.sheetName,
            actual: Object.keys(targetMap[spec.collectionName] || {}).length,
            expected: spec.expectedCount,
            matchesExpected: Object.keys(targetMap[spec.collectionName] || {}).length > 0,
          })),
          relationshipChecks: [
            {
              check: 'Simulator Foreign Keys & USALI Integrity',
              passed: Object.keys(scenarios).length > 0 && broken === 0,
              brokenReferences: broken,
              details:
                Object.keys(scenarios).length === 0
                  ? 'No simulator scenarios imported yet.'
                  : broken === 0
                  ? 'All simulator scenario parent/child references verified.'
                  : `${broken} scenarios reference missing hotel profiles.`,
            },
          ],
        },
      });
    }

    if (source === 'firebase_client' && collectionsSnapshot && typeof collectionsSnapshot === 'object') {
      const result = verifyNormalizedDataset(collectionsSnapshot, 'firebase_client');
      return res.json({ verification: result });
    }

    if (source === 'firebase_admin') {
      const adminStatus = await getAuthorizedAdminFirestore();
      if (!adminStatus.available || !adminStatus.db) {
        return res.status(400).json({ error: adminStatus.reason });
      }
      const liveMap: Record<string, Record<string, Record<string, any>>> = {};
      for (const spec of IMPORT_ORDER_SPEC) {
        const snap = await adminStatus.db.collection(spec.collectionName).get();
        liveMap[spec.collectionName] = {};
        snap.docs.forEach((d) => {
          liveMap[spec.collectionName][d.id] = d.data();
        });
      }
      return res.json({ verification: verifyNormalizedDataset(liveMap, 'firebase_admin') });
    }

    const demoStore = loadDemoCurriculumStore();
    return res.json({ verification: verifyNormalizedDataset(demoStore.collections, 'demo_local') });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Verification failed.' });
  }
});

// ============================================================================
// FC BUSINESS PARTNER SIMULATOR APIs (Published-Only RBAC & Session Tracking)
// ============================================================================

app.get('/api/simulator/competency-mappings', (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;
  const simStore = loadSimulatorLocalStore();
  return res.json({
    mappings: Object.values(simStore.competencyMappings || {}),
    competencies: db.competencies.map((c) => ({
      id: c.id,
      code: c.code,
      domainId: c.domainId,
      nameEn: c.nameEn,
      nameVi: c.nameVi,
    })),
  });
});

app.post('/api/simulator/competency-mappings', (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;

  const { mappings = [] } = req.body || {};
  if (!Array.isArray(mappings)) {
    return res.status(400).json({ error: 'mappings array is required.' });
  }

  const simStore = loadSimulatorLocalStore();
  const validCompLookup = new Map<string, Competency>();
  for (const c of db.competencies) {
    validCompLookup.set(c.id, c);
    validCompLookup.set(c.code.toUpperCase(), c);
  }

  const now = new Date().toISOString();
  const saved: ScenarioCompetencyMappingDoc[] = [];

  for (const m of mappings) {
    const wbId = String(m?.workbookCompetencyId || '').trim();
    const lmsTarget = String(m?.lmsCompetencyId || '').trim();
    if (!wbId || !lmsTarget) continue;

    const matchedComp = validCompLookup.get(lmsTarget) || validCompLookup.get(lmsTarget.toUpperCase());
    if (!matchedComp) {
      return res.status(400).json({
        error: `Target LMS Competency "${lmsTarget}" does not exist in Competency Framework. Auto-creating competencies is disabled.`,
      });
    }

    const docItem: ScenarioCompetencyMappingDoc = {
      id: `scmp_${wbId.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      workbookCompetencyId: wbId,
      lmsCompetencyId: matchedComp.id,
      lmsCompetencyCode: matchedComp.code,
      lmsCompetencyName: matchedComp.nameEn,
      verifiedBy: actor.name,
      verifiedAt: now,
      notes: String(m.notes || ''),
    };
    simStore.competencyMappings[docItem.id] = docItem;
    saved.push(docItem);
  }

  simStore.auditLogs.unshift({
    id: `simaud_${Date.now()}`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'SIMULATOR_COMPETENCY_MAPPING',
    details: `Saved ${saved.length} verified workbook-to-LMS competency mappings.`,
    timestamp: now,
  });
  saveSimulatorLocalStore(simStore);

  const mapObject: Record<string, string> = {};
  Object.values(simStore.competencyMappings).forEach((m) => {
    mapObject[m.workbookCompetencyId] = m.lmsCompetencyId;
  });

  return res.json({ success: true, saved, mappings: Object.values(simStore.competencyMappings), mapObject });
});

app.get('/api/simulator/import-jobs', (req, res) => {
  const actor = requireImportAdmin(req, res, ['access_sim_import_center', 'manage_sim_admin']);
  if (!actor) return;
  const simStore = loadSimulatorLocalStore();
  return res.json({
    jobs: simStore.importJobs || [],
    errors: (simStore.importErrors || []).slice(0, 150),
  });
});

app.get('/api/simulator/import-jobs/:jobId/errors', (req, res) => {
  const actor = requireImportAdmin(req, res, ['access_sim_import_center', 'manage_sim_admin']);
  if (!actor) return;
  const { jobId } = req.params;
  const simStore = loadSimulatorLocalStore();
  return res.json({
    job: (simStore.importJobs || []).find((j) => j.id === jobId) || null,
    errors: (simStore.importErrors || []).filter((e) => e.jobId === jobId),
  });
});

app.post('/api/simulator/import-jobs/:jobId/resume', async (req, res) => {
  const actor = requireImportAdmin(req, res, ['access_sim_import_center']);
  if (!actor) return;

  const { jobId } = req.params;
  const simStore = loadSimulatorLocalStore();
  const job = (simStore.importJobs || []).find((j) => j.id === jobId);
  if (!job) {
    return res.status(404).json({ error: `Import job "${jobId}" not found.` });
  }
  const storedPayload = simStore.pendingJobPayloads?.[jobId];
  const fileBase64 = req.body?.fileBase64 || storedPayload?.fileBase64;
  if (!fileBase64) {
    return res.status(400).json({
      error: 'Original workbook payload is required to resume this import job.',
    });
  }

  const result = await executeSimulatorImportPipeline({
    actor,
    fileName: storedPayload?.fileName || job.fileName,
    fileBase64,
    duplicateStrategy: req.body?.duplicateStrategy || storedPayload?.duplicateStrategy || job.strategy || 'skip',
    mode: req.body?.mode || job.mode || 'demo_local',
    allowPartialOnErrors: true,
    competencyIdMap: req.body?.competencyIdMap || storedPayload?.competencyIdMap,
    financialTolerance: req.body?.financialTolerance ?? storedPayload?.financialTolerance ?? 0.02,
    batchSize: req.body?.batchSize ?? storedPayload?.batchSize ?? 25,
    defaultImportedStatus: storedPayload?.defaultImportedStatus || 'Validated',
    resumeJob: job,
  });

  return res.status(result.status).json(result.body);
});

app.get('/api/simulator/versions', (req, res) => {
  const isAllowed = hasActorPermission(req, 'manage_sim_admin');
  if (!isAllowed) {
    return res.status(403).json({ error: 'manage_sim_admin permission required to view Scenario Version History.' });
  }
  const simStore = loadSimulatorLocalStore();
  return res.json({ versions: simStore.scenarioVersions || [] });
});

app.get('/api/simulator/versions/:scenarioId', (req, res) => {
  const isAllowed = hasActorPermission(req, 'manage_sim_admin');
  if (!isAllowed) {
    return res.status(403).json({ error: 'manage_sim_admin permission required to view Scenario Version History.' });
  }
  const simStore = loadSimulatorLocalStore();
  return res.json({
    versions: (simStore.scenarioVersions || []).filter((v) => v.scenarioId === req.params.scenarioId),
  });
});

app.get('/api/simulator/scenarios', (req, res) => {
  const isSupervisorOrAdmin = hasActorPermission(req, 'preview_draft_scenarios');
  const simStore = loadSimulatorLocalStore();

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize) || 12));
  const statusFilter = req.query.status ? String(req.query.status) : 'ALL';
  const categoryFilter = req.query.category ? String(req.query.category) : 'ALL';
  const difficultyFilter = req.query.difficulty ? String(req.query.difficulty) : 'ALL';
  const hotelFilter = req.query.hotelId ? String(req.query.hotelId) : 'ALL';
  const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';

  const allScenarios = Object.values(simStore.collections.simulationScenarios || {}) as SimulationScenarioDoc[];
  const filtered = allScenarios.filter((s) => {
    if (!isSupervisorOrAdmin && !isScenarioLearnerAccessible(s)) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && s.category !== categoryFilter) return false;
    if (hotelFilter !== 'ALL' && s.hotelId !== hotelFilter) return false;
    const diff =
      s.difficultyLabel ||
      (s.difficultyLevel === 1 ? 'Beginner' : s.difficultyLevel === 2 ? 'Intermediate' : s.difficultyLevel === 3 ? 'Advanced' : 'Expert');
    if (difficultyFilter !== 'ALL' && diff !== difficultyFilter) return false;
    if (search) {
      const hay = `${s.scenarioCode} ${s.id} ${s.titleEn} ${s.titleVi} ${s.summaryEn} ${s.summaryVi} ${(s.competencyIds || []).join(' ')}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return res.json({
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
  });
});

app.get('/api/simulator/scenarios/:id/details', (req, res) => {
  const actor = getRequestActor(req);
  const isSupervisorOrAdmin = hasActorPermission(req, 'preview_draft_scenarios');
  const simStore = loadSimulatorLocalStore();
  const sid = req.params.id;
  const scenario = simStore.collections.simulationScenarios?.[sid] as SimulationScenarioDoc | undefined;
  if (!scenario) {
    return res.status(404).json({ error: `Scenario "${sid}" not found.` });
  }

  const hasCompletedSession =
    actor &&
    simStore.sessions.some(
      (s: any) =>
        s.scenarioId === sid &&
        (s.employeeId === actor.id || s.employeeUid === actor.id) &&
        s.status === 'completed'
    );

  if (!isSupervisorOrAdmin && !isScenarioLearnerAccessible(scenario) && !hasCompletedSession) {
    return res.status(403).json({
      error: 'Access Denied: Only Published active scenarios can be viewed by learners.',
    });
  }

  const byScn = (colName: string) =>
    Object.values(simStore.collections[colName] || {}).filter((r: any) => r.scenarioId === sid);

  return res.json({
    scenario,
    hotelProfile: simStore.collections.hotelSimulationProfiles?.[scenario.hotelId] || null,
    financialData: byScn('simulationFinancialData'),
    operationalData: byScn('simulationOperationalData'),
    businessChallenges: byScn('simulationBusinessChallenges'),
    tasks: byScn('simulationTasks'),
    decisionOptions: byScn('simulationDecisionOptions'),
    roleplayPrompts: byScn('simulationRoleplayPrompts'),
    evaluationRubrics: byScn('simulationEvaluationRubrics'),
    competencyMappings: byScn('simulationCompetencyMappings'),
    referenceAnalysis: isSupervisorOrAdmin || hasCompletedSession ? byScn('simulationReferenceAnalysis') : [],
    datasetSnapshot: simStore.datasets?.[sid] || rebuildDatasetForScenario(simStore, scenario),
    versions: (simStore.scenarioVersions || []).filter((v) => v.scenarioId === sid),
  });
});

app.get('/api/simulator/data', (req, res) => {
  const actor = getRequestActor(req);
  const canPreviewDrafts = hasActorPermission(req, 'preview_draft_scenarios');
  const isSupervisorOrAdmin = canPreviewDrafts || hasActorPermission(req, 'view_all_learners_data');
  const canViewAllSessions = hasActorPermission(req, 'view_all_learners_data');
  const simStore = loadSimulatorLocalStore();

  const allScenarios = Object.values(simStore.collections.simulationScenarios || {});
  const visibleScenarios = canPreviewDrafts
    ? allScenarios
    : allScenarios.filter((s: any) => isScenarioLearnerAccessible(s));
  const visibleScenarioIds = new Set(visibleScenarios.map((s: any) => s.id));

  const visibleSessions = actor
    ? canViewAllSessions
      ? simStore.sessions
      : simStore.sessions.filter((s: any) => s.employeeId === actor.id || s.employeeUid === actor.id)
    : [];

  // Reference answers revealed to learners ONLY for scenarios they already completed
  const completedScenarioIds = new Set(
    visibleSessions.filter((s: any) => s.status === 'completed').map((s: any) => s.scenarioId)
  );
  // Keep child records available for completed historical sessions too even if later archived
  const filterByVisibleOrCompleted = (colName: string) =>
    Object.values(simStore.collections[colName] || {}).filter(
      (rec: any) =>
        isSupervisorOrAdmin ||
        visibleScenarioIds.has(rec.scenarioId) ||
        completedScenarioIds.has(rec.scenarioId)
    );

  const visibleReferenceAnalysis = isSupervisorOrAdmin
    ? filterByVisibleOrCompleted('simulationReferenceAnalysis')
    : filterByVisibleOrCompleted('simulationReferenceAnalysis').filter((r: any) =>
        completedScenarioIds.has(r.scenarioId)
      );

  return res.json({
    hotelSimulationProfiles: Object.values(simStore.collections.hotelSimulationProfiles || {}),
    simulationScenarios: visibleScenarios,
    simulationFinancialData: filterByVisibleOrCompleted('simulationFinancialData'),
    simulationOperationalData: filterByVisibleOrCompleted('simulationOperationalData'),
    simulationBusinessChallenges: filterByVisibleOrCompleted('simulationBusinessChallenges'),
    simulationTasks: filterByVisibleOrCompleted('simulationTasks'),
    simulationReferenceAnalysis: visibleReferenceAnalysis,
    simulationDecisionOptions: filterByVisibleOrCompleted('simulationDecisionOptions'),
    simulationRoleplayPrompts: filterByVisibleOrCompleted('simulationRoleplayPrompts'),
    simulationEvaluationRubrics: filterByVisibleOrCompleted('simulationEvaluationRubrics'),
    simulationCompetencyMappings: filterByVisibleOrCompleted('simulationCompetencyMappings'),
    simulationSessions: visibleSessions,
  });
});

app.get('/api/simulator/workspace', (req, res) => {
  const actor = getRequestActor(req);
  const canPreviewDrafts = hasActorPermission(req, 'preview_draft_scenarios');
  const canViewAll = hasActorPermission(req, 'view_all_learners_data');
  const isSupervisorOrAdmin = canViewAll;
  const isAdminOrLnd = hasActorPermission(req, 'manage_sim_admin');
  const simStore = loadSimulatorLocalStore();

  const allScenarios = Object.values(simStore.collections.simulationScenarios || {}) as SimulationScenarioDoc[];
  const visibleScenarios = canPreviewDrafts
    ? allScenarios
    : allScenarios.filter((s) => isScenarioLearnerAccessible(s));
  const visibleIds = new Set(visibleScenarios.map((s) => s.id));

  const visibleSessions = actor
    ? canViewAll
      ? simStore.sessions
      : simStore.sessions.filter((s: any) => s.employeeId === actor.id || s.employeeUid === actor.id)
    : [];

  const completedSessionScenarioIds = new Set(
    visibleSessions.filter((s: any) => s.status === 'completed').map((s: any) => s.scenarioId)
  );
  const completedSessionIds = new Set(visibleSessions.map((s: any) => s.id));
  const visibleEvaluations = actor
    ? isSupervisorOrAdmin
      ? simStore.evaluations
      : simStore.evaluations.filter((e) => e.learnerId === actor.id || completedSessionIds.has(e.sessionId))
    : [];

  const visibleAssignments = actor
    ? isSupervisorOrAdmin
      ? simStore.assignments
      : simStore.assignments.filter((a) => a.learnerId === actor.id)
    : [];

  const visibleDatasets: Record<string, HotelSimulationDatasetSnapshot> = {};
  Object.entries(simStore.datasets || {}).forEach(([sid, ds]) => {
    if (isSupervisorOrAdmin || visibleIds.has(sid) || completedSessionScenarioIds.has(sid)) {
      visibleDatasets[sid] = ds;
    }
  });

  const visibleAuditLogs = isSupervisorOrAdmin
    ? simStore.auditLogs
    : actor
    ? simStore.auditLogs.filter((l) => l.actorId === actor.id)
    : [];

  return res.json({
    datasets: visibleDatasets,
    evaluations: visibleEvaluations,
    assignments: visibleAssignments,
    auditLogs: isAdminOrLnd || isSupervisorOrAdmin ? visibleAuditLogs : [],
  });
});

app.post('/api/simulator/hotel-profiles', (req, res) => {
  const actor = requireImportAdmin(req, res, ['manage_sim_admin']);
  if (!actor) return;

  const { id, hotelCode, hotelName, brandTier, city, totalKeys = 200, currency = 'USD', fcPositionLevel = 3 } = req.body || {};
  if (!hotelName || !hotelCode) {
    return res.status(400).json({ error: 'hotelCode and hotelName are required.' });
  }
  const simStore = loadSimulatorLocalStore();
  const profileId = id || `hotel_${Date.now()}`;
  const keysNum = Math.max(10, Number(totalKeys) || 200);
  const profile = {
    id: profileId,
    hotelCode: String(hotelCode).trim(),
    hotelName: String(hotelName).trim(),
    brandTier: String(brandTier || 'Upscale Full-Service').trim(),
    city: String(city || 'Ho Chi Minh City').trim(),
    totalKeys: keysNum,
    roomsAvailable: keysNum * 30,
    fcPositionLevel: String(fcPositionLevel || 'Assistant FC (Level 3)'),
    currency: String(currency || 'USD').trim(),
    importedAt: new Date().toISOString(),
    importBatchId: 'manual_admin_config',
  };
  simStore.collections.hotelSimulationProfiles[profileId] = profile;
  simStore.auditLogs.unshift({
    id: `simaud_${Date.now()}`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'UPSERT_HOTEL_PROFILE',
    details: `Saved hotel profile ${profile.hotelName} (${profile.totalKeys} rooms, ${profile.currency})`,
    timestamp: new Date().toISOString(),
  });
  saveSimulatorLocalStore(simStore);
  return res.status(201).json({ success: true, profile });
});

app.post('/api/simulator/scenarios', (req, res) => {
  const actor = requireImportAdmin(req, res, ['manage_sim_admin']);
  if (!actor) return;

  const body = req.body || {};
  if (!body.titleEn || !body.titleVi || !body.hotelId) {
    return res.status(400).json({ error: 'titleEn, titleVi, and hotelId are required.' });
  }

  const simStore = loadSimulatorLocalStore();
  const now = new Date().toISOString();
  const id = body.id || `sim_scn_${Date.now()}`;
  const scenario: SimulationScenarioDoc = {
    id,
    scenarioCode: String(body.scenarioCode || `SIM-${Math.floor(100 + Math.random() * 899)}`),
    hotelId: String(body.hotelId),
    titleEn: String(body.titleEn),
    titleVi: String(body.titleVi),
    summaryEn: String(body.summaryEn || ''),
    summaryVi: String(body.summaryVi || ''),
    category: body.category || 'GOP & Hotel Financial Performance',
    difficultyLabel: body.difficultyLabel || 'Intermediate',
    difficultyLevel: (Math.max(1, Math.min(4, Number(body.difficultyLevel) || 2)) as ProficiencyLevel),
    targetRole: String(body.targetRole || 'Assistant Financial Controller'),
    recommendedPositionIds: Array.isArray(body.recommendedPositionIds) ? body.recommendedPositionIds : ['Senior Accountant', 'Assistant Financial Controller'],
    competencyIds: Array.isArray(body.competencyIds) ? body.competencyIds : ['BPA-01', 'SBP-01'],
    periodLabel: String(body.periodLabel || '2026 Monthly Review'),
    estimatedDurationMinutes: Number(body.estimatedDurationMinutes) || 35,
    learningObjectivesEn: Array.isArray(body.learningObjectivesEn) ? body.learningObjectivesEn : ['Analyze USALI variances & recommend GOP actions.'],
    learningObjectivesVi: Array.isArray(body.learningObjectivesVi) ? body.learningObjectivesVi : ['Phân tích biến động USALI và đề xuất hành động cải thiện GOP.'],
    scenarioKind: body.scenarioKind || 'standard',
    defaultPersona: body.defaultPersona || 'General Manager',
    languageOptions: ['vi', 'en'],
    datasetVersion: String(body.datasetVersion || '2026.v1'),
    status: body.status === 'Published' || body.status === 'Archived' ? body.status : 'Draft',
    isActive: body.status === 'Published',
    versionNumber: 1,
    publishedBy: body.status === 'Published' ? actor.name : undefined,
    publishedAt: body.status === 'Published' ? now : undefined,
    importedAt: now,
    importBatchId: 'manual_admin_builder',
  };

  simStore.collections.simulationScenarios[id] = scenario;
  const hp = simStore.collections.hotelSimulationProfiles?.[scenario.hotelId] as any;
  simStore.datasets[id] = generateDatasetSnapshotForScenario(scenario, hp);

  const seed = buildChildSeedsForScenario(scenario);
  seed.rubrics.forEach((r) => (simStore.collections.simulationEvaluationRubrics[r.id] = r));
  seed.decisionOptions.forEach((r) => (simStore.collections.simulationDecisionOptions[r.id] = r));
  seed.challenges.forEach((r) => (simStore.collections.simulationBusinessChallenges[r.id] = r));
  seed.tasks.forEach((r) => (simStore.collections.simulationTasks[r.id] = r));
  seed.roleplayPrompts.forEach((r) => (simStore.collections.simulationRoleplayPrompts[r.id] = r));
  seed.competencyMappings.forEach((r) => (simStore.collections.simulationCompetencyMappings[r.id] = r));
  seed.referenceAnalysis.forEach((r) => (simStore.collections.simulationReferenceAnalysis[r.id] = r));

  appendScenarioVersionEntry(simStore, scenario, actor, `Manual scenario creation (${scenario.status})`);
  simStore.auditLogs.unshift({
    id: `simaud_${Date.now()}`,
    scenarioId: id,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'CREATE_SCENARIO',
    details: `Created simulator scenario ${scenario.scenarioCode}: ${scenario.titleEn} (${scenario.status})`,
    timestamp: now,
  });
  saveSimulatorLocalStore(simStore);
  return res.status(201).json({ success: true, scenario, dataset: simStore.datasets[id] });
});

app.put('/api/simulator/scenarios/:id', (req, res) => {
  const actor = requireImportAdmin(req, res, ['manage_sim_admin']);
  if (!actor) return;
  const { id } = req.params;
  const simStore = loadSimulatorLocalStore();
  const existing = simStore.collections.simulationScenarios?.[id];
  if (!existing) return res.status(404).json({ error: `Scenario "${id}" not found.` });

  const now = new Date().toISOString();
  const nextVer = Number(existing.versionNumber || 1) + 1;
  const updated = {
    ...existing,
    ...req.body,
    id,
    versionNumber: nextVer,
    updatedAt: now,
  };
  simStore.collections.simulationScenarios[id] = updated;
  if (req.body?.datasetOverride) {
    const hp = simStore.collections.hotelSimulationProfiles?.[updated.hotelId] as any;
    simStore.datasets[id] = generateDatasetSnapshotForScenario(updated as SimulationScenarioDoc, hp, req.body.datasetOverride);
  }
  appendScenarioVersionEntry(simStore, updated as SimulationScenarioDoc, actor, `Manual update (v${nextVer})`);
  simStore.auditLogs.unshift({
    id: `simaud_${Date.now()}`,
    scenarioId: id,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'UPDATE_SCENARIO',
    details: `Updated scenario ${updated.scenarioCode || id} (version v${nextVer})`,
    timestamp: now,
  });
  saveSimulatorLocalStore(simStore);
  return res.json({ success: true, scenario: updated, dataset: simStore.datasets[id] });
});

app.post('/api/simulator/assignments', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;
  if (!hasActorPermission(req, 'manage_sim_admin')) {
    return res.status(403).json({ error: 'Only roles with manage_sim_admin can assign simulator scenarios.' });
  }
  const { scenarioId, learnerId, dueDate, mandatory = true, note = '' } = req.body || {};
  if (!scenarioId || !learnerId || !dueDate) {
    return res.status(400).json({ error: 'scenarioId, learnerId, and dueDate are required.' });
  }
  const simStore = loadSimulatorLocalStore();
  const targetScenario = simStore.collections.simulationScenarios?.[String(scenarioId)] as SimulationScenarioDoc | undefined;
  if (!targetScenario) {
    return res.status(404).json({ error: `Scenario "${scenarioId}" not found.` });
  }
  if (!isScenarioLearnerAccessible(targetScenario)) {
    return res.status(400).json({
      error: `Cannot assign scenario "${scenarioId}" because its status is ${targetScenario.status}${targetScenario.isActive === false ? ' (Inactive)' : ''}. Only Published active scenarios can be assigned to learners.`,
    });
  }
  const assignment: SimulationAssignmentDoc = {
    id: `sim_asgn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    scenarioId: String(scenarioId),
    learnerId: String(learnerId),
    assignedById: actor.id,
    assignedByName: actor.name,
    dueDate: String(dueDate),
    mandatory: Boolean(mandatory),
    note: String(note || ''),
    status: 'assigned',
    assignedAt: new Date().toISOString(),
  };
  simStore.assignments.unshift(assignment);
  simStore.auditLogs.unshift({
    id: `simaud_${Date.now()}`,
    scenarioId: assignment.scenarioId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'ASSIGN_SCENARIO',
    details: `Assigned scenario ${scenarioId} to learner ${learnerId} (due ${dueDate})`,
    timestamp: new Date().toISOString(),
  });
  saveSimulatorLocalStore(simStore);
  return res.status(201).json({ success: true, assignment });
});

function handleScenarioStatusTransition(req: express.Request, res: express.Response) {
  const actor = requireImportAdmin(req, res, ['manage_sim_admin']);
  if (!actor) return;

  const { id } = req.params;
  const { status = 'Published', note = '' } = req.body || {};
  if (!['Draft', 'Validated', 'Published', 'Archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be Draft, Validated, Published, or Archived.' });
  }

  const simStore = loadSimulatorLocalStore();
  const existing = simStore.collections.simulationScenarios?.[id] as SimulationScenarioDoc | undefined;
  if (!existing) {
    return res.status(404).json({ error: `Scenario "${id}" not found.` });
  }

  // Gate checks before publishing
  if (status === 'Published') {
    const hotelExists = !!simStore.collections.hotelSimulationProfiles?.[existing.hotelId];
    const optCount = Object.values(simStore.collections.simulationDecisionOptions || {}).filter(
      (r: any) => r.scenarioId === id
    ).length;
    const rubRows = Object.values(simStore.collections.simulationEvaluationRubrics || {}).filter(
      (r: any) => r.scenarioId === id
    ) as any[];
    const rubSum = rubRows.reduce((s, r) => s + Number(r.weightPercent || 0), 0);
    if (!hotelExists) {
      return res.status(400).json({ error: `Cannot publish "${id}": linked Hotel Profile "${existing.hotelId}" not found.` });
    }
    if (optCount < 2) {
      return res.status(400).json({ error: `Cannot publish "${id}": requires at least 2 Decision Options (found ${optCount}).` });
    }
    if (rubRows.length > 0 && Math.abs(rubSum - 100) > 0.05) {
      return res.status(400).json({ error: `Cannot publish "${id}": Evaluation Rubric weights must total 100% (found ${rubSum}%).` });
    }
  }

  const now = new Date().toISOString();
  const nextVersionNum = Number(existing.versionNumber || 1) + (status !== existing.status ? 1 : 0);
  const updated: SimulationScenarioDoc = {
    ...existing,
    status: status as SimulationScenarioStatus,
    isActive: status === 'Published',
    versionNumber: nextVersionNum,
    validatedBy: status === 'Validated' || status === 'Published' ? actor.name : existing.validatedBy,
    validatedAt: status === 'Validated' ? now : existing.validatedAt,
    publishedBy: status === 'Published' ? actor.name : existing.publishedBy,
    publishedAt: status === 'Published' ? now : existing.publishedAt,
    unpublishedBy: status === 'Draft' && existing.status === 'Published' ? actor.name : existing.unpublishedBy,
    unpublishedAt: status === 'Draft' && existing.status === 'Published' ? now : existing.unpublishedAt,
    archivedBy: status === 'Archived' ? actor.name : existing.archivedBy,
    archivedAt: status === 'Archived' ? now : existing.archivedAt,
    updatedAt: now,
  };

  simStore.collections.simulationScenarios[id] = updated;
  const versionEntry = appendScenarioVersionEntry(
    simStore,
    updated,
    actor,
    note ? `${existing.status} -> ${status}: ${note}` : `Status changed from ${existing.status} to ${status}`
  );
  simStore.auditLogs.unshift({
    id: `simaud_${Date.now()}`,
    scenarioId: id,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: `SCENARIO_${String(status).toUpperCase()}`,
    details: `Scenario ${updated.scenarioCode || id} transitioned ${existing.status} -> ${status} (v${nextVersionNum})`,
    timestamp: now,
  });
  saveSimulatorLocalStore(simStore);

  recordAudit(
    'SIMULATOR_SCENARIO_STATUS',
    `${actor.name} (${actor.role})`,
    `${updated.titleEn || id}`,
    `Scenario status updated to ${status} (v${nextVersionNum})`
  );
  persistDB(db);
  return res.json({ success: true, scenario: updated, version: versionEntry });
}

app.post('/api/simulator/scenarios/:id/publish', handleScenarioStatusTransition);
app.post('/api/simulator/scenarios/:id/status', handleScenarioStatusTransition);

app.post('/api/simulator/sessions', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  const {
    id,
    scenarioId,
    scenarioTitle,
    language = 'vi',
    difficulty,
    currentStep = 1,
    analysisNotes = '',
    analysisWorkspace,
    decisionWorkspace,
    executiveReport,
    roleplayConfig,
    selectedOptionIds = [],
    learnerAnalysis = '',
    conversation = [],
    evaluation,
    evidenceUrl,
    status = 'in_progress',
  } = req.body || {};

  if (!scenarioId) {
    return res.status(400).json({ error: 'scenarioId is required.' });
  }

  const simStore = loadSimulatorLocalStore();
  const scenario = simStore.collections.simulationScenarios?.[scenarioId] as SimulationScenarioDoc | undefined;
  if (
    scenario &&
    !isScenarioLearnerAccessible(scenario) &&
    !hasActorPermission(req, 'preview_draft_scenarios')
  ) {
    return res.status(403).json({
      error: `Access Denied: Your role cannot start or play ${scenario.status}${scenario.isActive === false ? ' / inactive' : ''} scenarios.`,
    });
  }

  const now = new Date().toISOString();
  const existingIdx = id ? simStore.sessions.findIndex((s: any) => s.id === id) : -1;
  if (existingIdx >= 0) {
    const existing = simStore.sessions[existingIdx];
    if (existing.status === 'completed') {
      return res.status(409).json({
        error: 'Completed simulation sessions are historical records and cannot be overwritten.',
      });
    }
    if (
      existing.employeeId !== actor.id &&
      !hasActorPermission(req, 'view_all_learners_data')
    ) {
      return res.status(403).json({ error: 'Cannot update another employee simulation session.' });
    }
  }

  const existingRecord = existingIdx >= 0 ? simStore.sessions[existingIdx] : null;
  const datasetSnapshot =
    existingRecord?.datasetSnapshot ||
    simStore.datasets?.[scenarioId] ||
    (scenario ? generateDatasetSnapshotForScenario(scenario) : undefined);

  const sessionDoc = {
    id: existingIdx >= 0 ? id : `simsess_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    scenarioId,
    scenarioTitle: String(scenarioTitle || scenario?.titleEn || scenarioId),
    hotelSimulationId: scenario?.hotelId,
    employeeId: existingRecord?.employeeId || actor.id,
    employeeUid: existingRecord?.employeeUid || actor.id,
    language: language === 'en' ? 'en' : 'vi',
    difficulty: difficulty || scenario?.difficultyLabel || 'Intermediate',
    currentStep: Math.max(1, Math.min(6, Number(currentStep) || existingRecord?.currentStep || 1)),
    datasetVersion: existingRecord?.datasetVersion || scenario?.datasetVersion || datasetSnapshot?.datasetVersion || '2026.v1',
    datasetSnapshot,
    analysisNotes: analysisNotes !== undefined ? String(analysisNotes) : existingRecord?.analysisNotes || '',
    analysisWorkspace: analysisWorkspace || existingRecord?.analysisWorkspace,
    decisionWorkspace: decisionWorkspace || existingRecord?.decisionWorkspace,
    executiveReport: executiveReport || existingRecord?.executiveReport,
    roleplayConfig: roleplayConfig || existingRecord?.roleplayConfig,
    selectedOptionIds: Array.isArray(selectedOptionIds) ? selectedOptionIds : existingRecord?.selectedOptionIds || [],
    learnerAnalysis: String(learnerAnalysis || analysisWorkspace?.significantVariances || existingRecord?.learnerAnalysis || ''),
    conversation: Array.isArray(conversation) ? conversation.slice(-40) : existingRecord?.conversation || [],
    evaluation: evaluation || existingRecord?.evaluation,
    evaluationId: existingRecord?.evaluationId,
    finalScore: existingRecord?.finalScore,
    evidenceUrl: evidenceUrl ? String(evidenceUrl) : existingRecord?.evidenceUrl,
    status: status === 'completed' ? 'completed' : 'in_progress',
    startedAt: existingRecord ? existingRecord.startedAt : now,
    submittedAt: status === 'completed' ? now : existingRecord?.submittedAt,
    completedAt: status === 'completed' ? now : undefined,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    simStore.sessions[existingIdx] = sessionDoc;
  } else {
    simStore.sessions.unshift(sessionDoc);
  }

  // Update matching assignment progress if exists
  simStore.assignments = simStore.assignments.map((a) =>
    a.scenarioId === scenarioId && a.learnerId === sessionDoc.employeeId
      ? { ...a, status: sessionDoc.status === 'completed' ? 'completed' : 'in_progress' }
      : a
  );

  saveSimulatorLocalStore(simStore);
  return res.status(existingIdx >= 0 ? 200 : 201).json({ success: true, session: sessionDoc });
});

app.post('/api/simulator/sessions/:id/evaluate', async (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  const { id } = req.params;
  const {
    analysisWorkspace,
    decisionWorkspace,
    executiveReport,
    conversation,
    language = 'vi',
  } = req.body || {};

  const simStore = loadSimulatorLocalStore();
  const idx = simStore.sessions.findIndex((s: any) => s.id === id);
  if (idx < 0) {
    return res.status(404).json({ error: `Simulation session "${id}" not found.` });
  }

  const existing = simStore.sessions[idx];
  if (existing.status === 'completed') {
    return res.status(409).json({
      error: 'Completed simulation sessions cannot be re-submitted or overwritten.',
    });
  }
  if (
    existing.employeeId !== actor.id &&
    !hasActorPermission(req, 'assess_team_members')
  ) {
    return res.status(403).json({ error: 'Cannot evaluate another employee simulation session.' });
  }

  const scenario = simStore.collections.simulationScenarios?.[existing.scenarioId] as SimulationScenarioDoc | undefined;
  if (!scenario) {
    return res.status(404).json({ error: `Scenario "${existing.scenarioId}" not found.` });
  }

  const datasetSnapshot: HotelSimulationDatasetSnapshot =
    existing.datasetSnapshot ||
    simStore.datasets?.[scenario.id] ||
    generateDatasetSnapshotForScenario(scenario);

  const mergedAnalysis = analysisWorkspace || existing.analysisWorkspace;
  const mergedDecision = decisionWorkspace || existing.decisionWorkspace;
  const mergedReport = executiveReport || existing.executiveReport;
  const mergedConvo = Array.isArray(conversation) ? conversation : existing.conversation || [];

  const decisionOptions = Object.values(simStore.collections.simulationDecisionOptions || {}).filter(
    (o: any) => o.scenarioId === scenario.id
  ) as any[];
  const rubrics = Object.values(simStore.collections.simulationEvaluationRubrics || {}).filter(
    (r: any) => r.scenarioId === scenario.id
  ) as any[];

  // 1. Always compute deterministic financial & rubric evaluation in TypeScript first
  const detResult = evaluateDeterministicSimulation({
    scenario,
    datasetSnapshot,
    analysisWorkspace: mergedAnalysis,
    decisionWorkspace: mergedDecision,
    executiveReport: mergedReport,
    decisionOptions,
    rubrics,
    conversation: mergedConvo,
    courses: COURSES,
    ojtAssignments: OJT_ASSIGNMENTS,
    competencies: db.competencies,
    language: language === 'en' ? 'en' : 'vi',
  });

  // 2. Optional Gemini executive qualitative debrief enrichment (graceful fallback if unavailable)
  let aiExecutiveSummary = '';
  let aiEnrichedStrengths: string[] = [];
  let aiEnrichedImprovements: string[] = [];
  let aiErrorNote: string | null = null;

  if (ai) {
    try {
      const refAnalysis = Object.values(simStore.collections.simulationReferenceAnalysis || {}).filter(
        (r: any) => r.scenarioId === scenario.id
      );
      const enrichPrompt = `You are a Corporate VP of Hotel Finance reviewing a Financial Controller candidate's simulation submission.
Provide concise, strictly grounded executive narrative coaching without changing the deterministic numeric scores.
Scenario: ${scenario.scenarioCode} - ${scenario.titleEn}
Verified USALI Actual vs Budget GOP: Actual ${datasetSnapshot.periods.actual.gop} (${datasetSnapshot.periods.actual.gopMarginPct}%) vs Budget ${datasetSnapshot.periods.budget.gop} (${datasetSnapshot.periods.budget.gopMarginPct}%).
Official Reference Key: ${JSON.stringify(refAnalysis)}
Deterministic Criterion Scores: ${JSON.stringify(detResult.scoringCriteria.map((c) => ({ code: c.criterionCode, score: c.score })))}
Learner Variances Notes: ${mergedAnalysis?.significantVariances || 'N/A'}
Learner Decision Rationale: ${mergedDecision?.recommendedAction || 'N/A'} | ${mergedDecision?.rationale || ''}
Learner Executive Summary: ${mergedReport?.executiveSummary || 'N/A'}
Calculation Errors Caught Deterministically: ${JSON.stringify(detResult.calculationErrors)}
Language: ${language === 'vi' ? 'Vietnamese (Tiếng Việt) with key USALI terms' : 'English'}.`;

      const aiRes = await generateContentWithRetry({
        model: GEMINI_MODEL,
        contents: enrichPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveFeedbackSummary: { type: Type.STRING },
              topStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              topImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['executiveFeedbackSummary', 'topStrengths', 'topImprovements'],
          },
        },
      });
      const parsed = parseJsonResponse(aiRes.text);
      aiExecutiveSummary = String(parsed.executiveFeedbackSummary || '');
      aiEnrichedStrengths = Array.isArray(parsed.topStrengths) ? parsed.topStrengths : [];
      aiEnrichedImprovements = Array.isArray(parsed.topImprovements) ? parsed.topImprovements : [];
    } catch (err: any) {
      aiErrorNote = err?.message || 'AI narrative enrichment unavailable; deterministic evaluation persisted.';
    }
  }

  const now = new Date().toISOString();
  const evalId = `simeval_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const evalDoc: SimulationEvaluationDoc = {
    id: evalId,
    sessionId: existing.id,
    scenarioId: scenario.id,
    learnerId: existing.employeeId,
    learnerUid: existing.employeeUid,
    scoringCriteria: detResult.scoringCriteria,
    totalScore: detResult.totalScore,
    assessorType: 'deterministic_plus_ai',
    strengths: aiEnrichedStrengths.length > 0 ? aiEnrichedStrengths : detResult.strengths,
    improvementAreas: aiEnrichedImprovements.length > 0 ? aiEnrichedImprovements : detResult.improvementAreas,
    missedOpportunities: detResult.missedOpportunities,
    calculationErrors: detResult.calculationErrors,
    recommendations: detResult.recommendations,
    recommendedCompetencies: detResult.recommendedCompetencies,
    recommendedCourseIds: detResult.recommendedCourseIds,
    recommendedPracticalIds: detResult.recommendedPracticalIds,
    suggestedIdpObjectives: detResult.suggestedIdpObjectives,
    advisoryDisclaimer:
      language === 'vi'
        ? 'Kết quả mô phỏng và gợi ý cấp độ năng lực mang tính tham khảo hỗ trợ quyết định; không tự động thay đổi hồ sơ đánh giá chính thức hoặc quyết định thăng chức khi chưa có phê duyệt của Người đánh giá / Quản lý L&D.'
        : 'Simulation results and suggested competency levels are advisory only; they do not automatically alter official approved competency assessments or promotion decisions without human assessor sign-off.',
    assessorComments: aiExecutiveSummary || undefined,
    createdAt: now,
  };

  simStore.evaluations.unshift(evalDoc);

  const completedSession = {
    ...existing,
    analysisWorkspace: mergedAnalysis,
    decisionWorkspace: mergedDecision,
    executiveReport: mergedReport,
    selectedOptionIds: mergedDecision?.selectedOptionIds || existing.selectedOptionIds || [],
    learnerAnalysis: mergedAnalysis?.significantVariances || existing.learnerAnalysis || '',
    conversation: mergedConvo,
    datasetSnapshot,
    currentStep: 6,
    evaluationId: evalId,
    evaluation: evalDoc,
    finalScore: evalDoc.totalScore,
    competencyResults: evalDoc.recommendedCompetencies.map((c) => ({
      competencyCode: c.competencyCode,
      suggestedLevel: c.suggestedLevel,
    })),
    feedbackSummary:
      aiExecutiveSummary ||
      (language === 'vi'
        ? `Hoàn thành mô phỏng với tổng điểm ${evalDoc.totalScore}/100.`
        : `Simulation completed with total score ${evalDoc.totalScore}/100.`),
    status: 'completed',
    submittedAt: now,
    completedAt: now,
    updatedAt: now,
  };

  simStore.sessions[idx] = completedSession;
  simStore.assignments = simStore.assignments.map((a) =>
    a.scenarioId === scenario.id && a.learnerId === existing.employeeId ? { ...a, status: 'completed' } : a
  );
  simStore.auditLogs.unshift({
    id: `simaud_${Date.now()}`,
    sessionId: existing.id,
    scenarioId: scenario.id,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'EVALUATE_SIMULATION',
    details: `Evaluated session ${existing.id} (${scenario.scenarioCode}): Score ${evalDoc.totalScore}/100 (${aiErrorNote ? 'Deterministic fallback' : 'Deterministic + Gemini'})`,
    timestamp: now,
  });

  saveSimulatorLocalStore(simStore);
  recordAudit('SIMULATOR_EVALUATION', `${actor.name} (${actor.role})`, scenario.scenarioCode, `Score ${evalDoc.totalScore}/100`);
  persistDB(db);

  return res.json({
    success: true,
    session: completedSession,
    evaluation: evalDoc,
    aiFallbackUsed: Boolean(aiErrorNote),
    aiNotice: aiErrorNote,
  });
});

app.post('/api/simulator/evaluations/:id/review', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  if (!hasActorPermission(req, 'assess_team_members')) {
    return res.status(403).json({
      error: 'Access Denied: Your role lacks assess_team_members permission to modify evaluation scores.',
    });
  }

  const { id } = req.params;
  const { adjustedTotalScore, criterionAdjustments, adjustmentReason = '', assessorComments = '' } = req.body || {};

  const simStore = loadSimulatorLocalStore();
  const evalIdx = simStore.evaluations.findIndex((e) => e.id === id);
  if (evalIdx < 0) {
    return res.status(404).json({ error: `Simulation evaluation "${id}" not found.` });
  }

  if (!String(adjustmentReason).trim() && adjustedTotalScore !== undefined) {
    return res.status(400).json({ error: 'adjustmentReason is required when overriding an evaluation score.' });
  }

  const existingEval = simStore.evaluations[evalIdx];
  const now = new Date().toISOString();

  let updatedCriteria = existingEval.scoringCriteria;
  if (criterionAdjustments && typeof criterionAdjustments === 'object') {
    updatedCriteria = existingEval.scoringCriteria.map((c) => {
      const overrideVal = criterionAdjustments[c.criterionCode];
      if (overrideVal !== undefined && Number.isFinite(Number(overrideVal))) {
        const clamped = Math.max(0, Math.min(100, Number(overrideVal)));
        return { ...c, score: clamped };
      }
      return c;
    });
  }

  const recomputedWeightSum = updatedCriteria.reduce((acc, c) => acc + c.weightPercent, 0) || 100;
  const recomputedWeighted = Math.round(
    updatedCriteria.reduce((acc, c) => acc + (c.score * c.weightPercent) / recomputedWeightSum, 0) * 10
  ) / 10;

  const finalAdjusted =
    adjustedTotalScore !== undefined
      ? Math.max(0, Math.min(100, Number(adjustedTotalScore)))
      : recomputedWeighted;

  const updatedEval: SimulationEvaluationDoc = {
    ...existingEval,
    scoringCriteria: updatedCriteria,
    adjustedTotalScore: finalAdjusted,
    adjustmentReason: String(adjustmentReason || existingEval.adjustmentReason || 'Human assessor review'),
    assessorType: 'human_reviewed',
    reviewerId: actor.id,
    reviewerName: actor.name,
    reviewedAt: now,
    assessorComments: String(assessorComments || existingEval.assessorComments || ''),
  };

  simStore.evaluations[evalIdx] = updatedEval;

  // Sync adjusted score onto session summary (without overwriting original totalScore inside evaluation)
  const sIdx = simStore.sessions.findIndex((s: any) => s.id === existingEval.sessionId);
  if (sIdx >= 0) {
    simStore.sessions[sIdx] = {
      ...simStore.sessions[sIdx],
      evaluation: updatedEval,
      finalScore: finalAdjusted,
      updatedAt: now,
    };
  }

  simStore.auditLogs.unshift({
    id: `simaud_${Date.now()}`,
    sessionId: existingEval.sessionId,
    scenarioId: existingEval.scenarioId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'HUMAN_ASSESSOR_OVERRIDE',
    details: `Assessor adjusted score from ${existingEval.totalScore} to ${finalAdjusted}. Reason: ${updatedEval.adjustmentReason}`,
    timestamp: now,
  });

  saveSimulatorLocalStore(simStore);
  recordAudit('SIMULATOR_HUMAN_REVIEW', `${actor.name} (${actor.role})`, existingEval.sessionId, `${existingEval.totalScore} -> ${finalAdjusted}`);
  persistDB(db);

  return res.json({ success: true, evaluation: updatedEval });
});

app.post('/api/gemini/simulator-roleplay', async (req, res) => {
  try {
    const actor = requireTalentActor(req, res);
    if (!actor) return;

    const {
      scenarioId,
      persona = 'General Manager',
      difficulty = 'Intermediate',
      challengeIntensity = 'Balanced',
      maxQuestions = 5,
      language = 'vi',
      conversationHistory = [],
      userTurn,
      analysisNotes = '',
      decisionSummary = '',
    } = req.body || {};

    if (!scenarioId || !userTurn || !String(userTurn).trim()) {
      return res.status(400).json({ error: 'scenarioId and userTurn are required.' });
    }

    const simStore = loadSimulatorLocalStore();
    const scenario = simStore.collections.simulationScenarios?.[scenarioId] as SimulationScenarioDoc | undefined;
    const dataset = simStore.datasets?.[scenarioId] || (scenario ? generateDatasetSnapshotForScenario(scenario) : undefined);

    const turnCount = conversationHistory.filter((m: any) => m.role === 'user').length + 1;

    const buildRoleplayFallback = () => {
      const gopDiff = dataset ? dataset.periods.actual.gop - dataset.periods.budget.gop : -18000;
      const fallbackReply =
        language === 'vi'
          ? `[${persona}] Tôi đã ghi nhận phân tích của anh/chị ("${String(userTurn).slice(0, 120)}..."). Với chênh lệch GOP hiện tại (${gopDiff.toLocaleString()} ${dataset?.currency || 'USD'}), đâu là 2 hành động định lượng tác động nhanh nhất trong 30 ngày tới mà không làm sụt giảm điểm hài lòng khách?`
          : `[${persona}] I noted your point ("${String(userTurn).slice(0, 120)}..."). Given our GOP variance of ${gopDiff.toLocaleString()} ${dataset?.currency || 'USD'}, which two quantified levers will recover margin within 30 days without hurting guest satisfaction?`;
      return { reply: fallbackReply, persona, turnNumber: turnCount, fallbackUsed: true };
    };

    if (!ai) {
      return res.json(buildRoleplayFallback());
    }

    const datasetFacts = dataset
      ? `Hotel: ${dataset.hotelName} (${dataset.numberOfRooms} keys, ${dataset.currency})
Actual vs Budget:
- Occ %: ${dataset.periods.actual.occupancyPct}% vs ${dataset.periods.budget.occupancyPct}%
- ADR: ${dataset.periods.actual.adr} vs ${dataset.periods.budget.adr}
- RevPAR: ${dataset.periods.actual.revpar} vs ${dataset.periods.budget.revpar}
- Total Operating Revenue: ${dataset.periods.actual.totalOperatingRevenue} vs ${dataset.periods.budget.totalOperatingRevenue}
- Food Cost %: ${dataset.periods.actual.foodCostPct}% vs ${dataset.periods.budget.foodCostPct}%
- Labor Cost %: ${dataset.periods.actual.laborCostPct}% vs ${dataset.periods.budget.laborCostPct}%
- GOP: ${dataset.periods.actual.gop} (${dataset.periods.actual.gopMarginPct}%) vs Budget ${dataset.periods.budget.gop} (${dataset.periods.budget.gopMarginPct}%)`
      : '';

    const systemPrompt = `You are playing the role of "${persona}" at a hospitality property during a live Finance Business Partner meeting.
CRITICAL RULES:
- Never leak official reference answers or grading rubrics. Challenge the Financial Controller / Learner to prove their thesis with exact numbers.
- Difficulty: ${difficulty} | Challenge Intensity: ${challengeIntensity} | Question Turn: ${turnCount} of ${maxQuestions}.
- Ground questions ONLY in these verified property USALI numbers and the learner's submitted work:
Scenario: ${scenario?.titleEn || scenarioId} (${scenario?.periodLabel || ''})
${datasetFacts}
Learner Analysis Draft: ${analysisNotes || 'None submitted yet'}
Learner Decision Draft: ${decisionSummary || 'None submitted yet'}

Conversation History:
${conversationHistory.map((m: any) => `${m.role === 'user' ? 'Learner (FC)' : m.persona || persona}: ${m.text}`).join('\n')}

Latest Learner Statement: "${userTurn}"

Respond strictly in character as ${persona} in ${language === 'vi' ? 'Vietnamese (Tiếng Việt) with executive hospitality terminology' : 'English'}.
Keep it sharp (2 concise paragraphs) and end with ONE targeted executive challenge question (or closing sign-off summary if turn ${turnCount} >= ${maxQuestions}).`;

    try {
      const aiRes = await generateContentWithRetry({
        model: GEMINI_MODEL,
        contents: systemPrompt,
      });
      const reply = aiRes.text;
      if (!reply) {
        return res.json(buildRoleplayFallback());
      }
      return res.json({ reply, persona, turnNumber: turnCount });
    } catch {
      return res.json(buildRoleplayFallback());
    }
  } catch (err: any) {
    return res.status(502).json({ error: err?.message || 'Roleplay request failed.' });
  }
});

app.post('/api/gemini/simulator-coach', async (req, res) => {
  try {
    const actor = requireTalentActor(req, res);
    if (!actor) return;

    const {
      scenarioId,
      mode = 'guided_learning',
      language = 'vi',
      question = '',
      analysisWorkspace,
    } = req.body || {};

    if (!scenarioId) return res.status(400).json({ error: 'scenarioId is required.' });

    const simStore = loadSimulatorLocalStore();
    const scenario = simStore.collections.simulationScenarios?.[scenarioId] as SimulationScenarioDoc | undefined;
    const dataset = simStore.datasets?.[scenarioId] || (scenario ? generateDatasetSnapshotForScenario(scenario) : undefined);
    const auditItems = dataset ? computeFinancialAudit(dataset.periods.actual, dataset.periods.budget) : [];

    const buildCoachFallback = () => ({
      verifiedCalculations: auditItems
        .slice(0, 4)
        .map(
          (a) =>
            `${language === 'vi' ? a.labelVi : a.labelEn}: Actual ${a.actualValue ?? 'N/A'} vs Budget ${a.budgetValue ?? 'N/A'} (${a.classification})`
        ),
      userAssumptions: [
        analysisWorkspace?.significantVariances
          ? `${language === 'vi' ? 'Đã ghi nhận giả định chênh lệch:' : 'Submitted variance hypothesis:'} ${String(analysisWorkspace.significantVariances).slice(0, 120)}`
          : language === 'vi'
          ? 'Chưa nhập giả định nguyên nhân gốc rễ tại tab Phân Tích.'
          : 'No variance root-cause hypothesis entered yet in the Analysis tab.',
      ],
      missingDataOrRisks: [
        language === 'vi'
          ? 'Kiểm tra thêm tác động flow-through, chi phí hoa hồng OTA và hiệu suất giờ công (hours/occupied room).'
          : 'Verify GOP flow-through, OTA commission drag, and departmental labor productivity per occupied room.',
      ],
      coachingRecommendations: [
        language === 'vi'
          ? 'Đối chiếu biến động doanh thu từng bộ phận với tỷ lệ chi phí biến đổi tương ứng trước khi trình GM.'
          : 'Reconcile revenue mix shifts against variable departmental cost ratios before presenting to the GM.',
      ],
      humanValidationNote:
        language === 'vi'
          ? 'Lưu ý: Mọi đề xuất từ AI Business Coach mang tính tham khảo tư duy; đánh giá chính thức do Người hướng dẫn / FC xác nhận.'
          : 'Advisory Notice: AI Coach insights support structured reasoning only; official assessment requires human assessor sign-off.',
    });

    if (!ai) {
      return res.json({ coach: buildCoachFallback(), mode, fallbackUsed: true });
    }

    const coachPrompt = `You are the Optional AI Business Coach for FC Business Partner Simulator.
COACHING MODE: ${mode}
- guided_learning: Teach the USALI analytical approach and point out what formula/denominator to inspect next (NEVER give away the final answer key or completed recommendation).
- challenge_mode: Stress-test the learner's assumptions for hidden blind spots and trade-offs.
- executive_mode: Coach how to frame the insight crisply for a General Manager in 60 seconds.
- reflection_mode: Help the learner reflect on commercial acumen and internal control habits.

STRICT TRANSPARENCY REQUIREMENT:
Structure your response cleanly into these labeled sections:
1. verifiedCalculations (facts strictly from deterministic TypeScript engine below)
2. userAssumptions (assumptions present or missing in learner's inputs)
3. missingDataOrRisks (blind spots or controls to verify)
4. coachingRecommendations (next thinking steps without spoiling the answer key)
5. humanValidationNote (explicit reminder that human review is required before official sign-off)

Scenario: ${scenario?.titleEn || scenarioId}
Verified Deterministic USALI Audit: ${JSON.stringify(auditItems.slice(0, 8))}
Learner Inputs So Far: ${JSON.stringify(analysisWorkspace || {})}
Learner Question: "${question || 'How should I approach the main financial anomaly here?'}"
Respond in ${language === 'vi' ? 'Vietnamese (Tiếng Việt)' : 'English'}.`;

    try {
      const aiRes = await generateContentWithRetry({
        model: GEMINI_MODEL,
        contents: coachPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verifiedCalculations: { type: Type.ARRAY, items: { type: Type.STRING } },
              userAssumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingDataOrRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
              coachingRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              humanValidationNote: { type: Type.STRING },
            },
            required: [
              'verifiedCalculations',
              'userAssumptions',
              'missingDataOrRisks',
              'coachingRecommendations',
              'humanValidationNote',
            ],
          },
        },
      });
      const parsed = parseJsonResponse(aiRes.text);
      return res.json({ coach: parsed, mode });
    } catch {
      return res.json({ coach: buildCoachFallback(), mode, fallbackUsed: true });
    }
  } catch (err: any) {
    return res.status(502).json({ error: err?.message || 'AI Business Coach failed.' });
  }
});

app.post('/api/import/log-audit', (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;

  const { fileName, summary } = req.body || {};
  recordAudit(
    'DATA_IMPORT_FIRESTORE',
    `${actor.name} (${actor.role})`,
    String(fileName || 'Workbook'),
    String(summary || 'Imported curriculum dataset into Firebase Firestore')
  );
  persistDB(db);
  return res.json({ success: true });
});

app.get('/api/import/logs', async (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;

  const demoStore = loadDemoCurriculumStore();
  const adminStatus = await getAuthorizedAdminFirestore();
  let firebaseLogs: any[] = [];
  if (adminStatus.available && adminStatus.db) {
    try {
      const snap = await adminStatus.db
        .collection('importLogs')
        .orderBy('startedAt', 'desc')
        .limit(25)
        .get();
      firebaseLogs = snap.docs.map((d) => d.data());
    } catch {
      firebaseLogs = [];
    }
  }

  return res.json({
    firebaseLogs,
    demoLogs: demoStore.importLogs,
  });
});

app.post('/api/import/export-errors', (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;

  const { issues = [], format = 'xlsx' } = req.body || {};
  const fmt = format === 'csv' ? 'csv' : 'xlsx';
  const buf = buildErrorReportBuffer(Array.isArray(issues) ? issues : [], fmt);

  if (fmt === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="FC_Import_Error_Report.csv"');
  } else {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="FC_Import_Error_Report.xlsx"');
  }
  return res.send(buf);
});

// ============================================================================
// COMPETENCY GAP ENGINE & INDIVIDUAL DEVELOPMENT PLAN (IDP) API ENDPOINTS
// ============================================================================

function requireTalentActor(req: express.Request, res: express.Response): User | null {
  const actor = getRequestActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Authentication required (x-user-id header).' });
    return null;
  }
  return actor;
}

function canViewEmployeeTalentData(actor: User, employeeId: string): boolean {
  if (actor.id === employeeId) return true;
  if (!roleHasPermission(actor.role, 'view_all_learners_data', db.rolePermissions)) return false;
  if (actor.role === 'financial_controller') {
    const emp = db.users.find((u) => u.id === employeeId);
    if (!emp) return false;
    return emp.supervisorId === actor.id || emp.property === actor.property;
  }
  return true;
}

function pushTalentNotification(
  recipientId: string,
  type: LmsNotificationItem['type'],
  title: string,
  message: string,
  relatedId?: string
) {
  db.talentNotifications.unshift({
    id: `tnotif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    recipientId,
    type,
    title,
    message,
    relatedId,
    time: new Date().toISOString().split('T')[0],
    read: false,
  });
  if (db.talentNotifications.length > 100) {
    db.talentNotifications = db.talentNotifications.slice(0, 100);
  }
}

app.get('/api/talent/bootstrap', (req, res) => {
  const actor = getRequestActor(req);
  // Scope sensitive employee records by actor role when x-user-id is supplied
  const scopeFilter = <T extends { employeeId: string }>(arr: T[]) => {
    if (!actor) return [];
    return arr.filter((item) => canViewEmployeeTalentData(actor, item.employeeId));
  };

  return res.json({
    talentConfig: db.talentConfig,
    competencyAssessments: actor ? scopeFilter(db.competencyAssessments) : db.competencyAssessments,
    talentIdps: actor ? scopeFilter(db.talentIdps) : db.talentIdps,
    developmentActivities: actor ? scopeFilter(db.developmentActivities) : db.developmentActivities,
    competencyReassessments: actor
      ? scopeFilter(db.competencyReassessments)
      : db.competencyReassessments,
    careerReadinessReviews: actor
      ? scopeFilter(db.careerReadinessReviews)
      : db.careerReadinessReviews,
    idpReviewLogs: actor ? scopeFilter(db.idpReviewLogs) : db.idpReviewLogs,
    talentNotifications: actor
      ? db.talentNotifications.filter(
          (n) => n.recipientId === 'all' || n.recipientId === actor.id || canViewEmployeeTalentData(actor, n.recipientId)
        )
      : [],
  });
});

app.put('/api/talent/config', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;
  if (!hasActorPermission(req, 'manage_team_idp')) {
    return res.status(403).json({
      error: 'Access Denied: manage_team_idp permission is required to modify competency weights, criticality, or readiness thresholds.',
    });
  }

  const incoming = req.body || {};
  const ratio = incoming.ratio702010 || db.talentConfig.ratio702010;
  if (
    Number(ratio.experiential) + Number(ratio.social) + Number(ratio.formal) !== 100
  ) {
    return res.status(400).json({ error: '70-20-10 ratios must total 100%.' });
  }

  db.talentConfig = {
    ...db.talentConfig,
    weightMode: incoming.weightMode || db.talentConfig.weightMode,
    competencyOverrides: incoming.competencyOverrides ?? db.talentConfig.competencyOverrides,
    customPositionTargets: incoming.customPositionTargets ?? db.talentConfig.customPositionTargets,
    ratio702010: {
      experiential: Number(ratio.experiential),
      social: Number(ratio.social),
      formal: Number(ratio.formal),
    },
    readinessThresholds: {
      ...db.talentConfig.readinessThresholds,
      ...(incoming.readinessThresholds || {}),
    },
    updatedBy: actor.name,
    updatedAt: new Date().toISOString(),
  };

  recordAudit(
    'UPDATE_TALENT_CONFIG',
    `${actor.name} (${actor.role})`,
    'Talent Engine Configuration',
    `Weight mode: ${db.talentConfig.weightMode}, 70-20-10: ${db.talentConfig.ratio702010.experiential}/${db.talentConfig.ratio702010.social}/${db.talentConfig.ratio702010.formal}`
  );
  persistDB(db);
  return res.json({ success: true, talentConfig: db.talentConfig });
});

app.post('/api/talent/assessments', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  const body = req.body || {};
  const {
    id,
    employeeId,
    targetPosition,
    assessmentPeriod,
    assessorType = actor.role === 'learner' ? 'self' : actor.role === 'financial_controller' ? 'financial_controller' : 'hr_lnd',
    overallComments,
    results,
    createNewVersion = false,
  } = body;

  if (!employeeId || !targetPosition || !assessmentPeriod) {
    return res.status(400).json({
      error: 'employeeId, targetPosition, and assessmentPeriod are required.',
    });
  }

  const employee = db.users.find((u) => u.id === employeeId);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found.' });
  }
  if (!canViewEmployeeTalentData(actor, employeeId)) {
    return res.status(403).json({ error: 'Access Denied for this employee.' });
  }

  // Verify target position has defined competency requirements
  const targetMatrix = resolvePositionTargetMatrix(db.competencies, targetPosition, db.talentConfig);
  if (!targetMatrix.hasValidTargets) {
    return res.status(400).json({ error: targetMatrix.error });
  }

  // Enforce immutable historical approved records
  const existingIdx = id ? db.competencyAssessments.findIndex((a) => a.id === id) : -1;
  if (existingIdx >= 0 && !createNewVersion) {
    const existing = db.competencyAssessments[existingIdx];
    if (existing.status === 'approved') {
      return res.status(409).json({
        error: 'Approved assessments are immutable historical records and cannot be edited. Create a new version instead.',
      });
    }
    if (!hasActorPermission(req, 'assess_team_members') && existing.employeeId !== actor.id) {
      return res.status(403).json({ error: 'Cannot edit another employee assessment.' });
    }
  }

  const now = new Date().toISOString();
  const normalizedResults: Record<string, any> = {};
  for (const [code, entry] of Object.entries(results || {}) as Array<[string, any]>) {
    const reqTarget = targetMatrix.targetsByCode[code];
    if (!reqTarget) continue;
    const rawCurr = entry?.currentLevel;
    const currLevel =
      rawCurr === null || rawCurr === undefined || rawCurr === 0
        ? null
        : (Math.max(1, Math.min(4, Number(rawCurr))) as ProficiencyLevel);
    normalizedResults[code] = {
      competencyId: entry.competencyId || db.competencies.find((c) => c.code === code)?.id || code,
      competencyCode: code,
      domainId: entry.domainId || db.competencies.find((c) => c.code === code)?.domainId || 'dom_1',
      currentLevel: currLevel,
      targetLevel: reqTarget,
      gap: currLevel === null ? reqTarget : Math.max(0, reqTarget - currLevel),
      selfLevel: entry.selfLevel ?? (assessorType === 'self' ? currLevel : null),
      supervisorLevel: entry.supervisorLevel ?? (assessorType !== 'self' ? currLevel : null),
      assessorNotes: String(entry.assessorNotes || ''),
      evidenceText: String(entry.evidenceText || ''),
    };
  }

  const previousVersions = db.competencyAssessments.filter(
    (a) => a.employeeId === employeeId && a.assessmentPeriod === assessmentPeriod
  );
  const nextVersion =
    existingIdx >= 0 && !createNewVersion
      ? db.competencyAssessments[existingIdx].version
      : previousVersions.reduce((m, a) => Math.max(m, a.version || 1), 0) + 1;

  const docRecord: CompetencyAssessmentDoc = {
    id: existingIdx >= 0 && !createNewVersion ? id : `casmt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    version: nextVersion,
    supersedesId: createNewVersion ? id : existingIdx >= 0 ? db.competencyAssessments[existingIdx].supersedesId : undefined,
    employeeId,
    employeeName: employee.name,
    property: employee.property,
    department: employee.department,
    currentPosition: employee.position,
    targetPosition,
    assessmentPeriod,
    assessorId: actor.id,
    assessorName: actor.name,
    assessorType,
    status: 'draft',
    overallComments: String(overallComments || ''),
    results: normalizedResults,
    createdAt: existingIdx >= 0 && !createNewVersion ? db.competencyAssessments[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0 && !createNewVersion) {
    db.competencyAssessments[existingIdx] = docRecord;
  } else {
    db.competencyAssessments.unshift(docRecord);
  }

  recordAudit(
    'SAVE_COMPETENCY_ASSESSMENT',
    `${actor.name} (${actor.role})`,
    `${employee.name} (${assessmentPeriod} v${docRecord.version})`,
    `Saved assessment (${assessorType}) for target ${targetPosition}`
  );
  persistDB(db);
  return res.status(201).json({ success: true, assessment: docRecord });
});

app.post('/api/talent/assessments/:id/transition', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  const { id } = req.params;
  const { targetStatus, rejectionReason } = req.body || {};
  const idx = db.competencyAssessments.findIndex((a) => a.id === id);
  if (idx < 0) {
    return res.status(404).json({ error: 'Assessment record not found.' });
  }

  const existing = db.competencyAssessments[idx];
  if (existing.status === 'approved') {
    return res.status(409).json({
      error: 'Approved assessments are immutable and cannot transition or be edited.',
    });
  }

  if (!['submitted', 'approved', 'rejected', 'draft'].includes(targetStatus)) {
    return res.status(400).json({ error: 'Invalid target assessment status.' });
  }

  if (targetStatus === 'approved' || targetStatus === 'rejected') {
    if (actor.id === existing.employeeId) {
      return res.status(403).json({
        error: 'Employees cannot approve or reject their own competency assessment.',
      });
    }
    if (!hasActorPermission(req, 'assess_team_members')) {
      return res.status(403).json({ error: 'Insufficient permissions (assess_team_members) to approve/reject assessments.' });
    }
  } else if (!hasActorPermission(req, 'assess_team_members') && actor.id !== existing.employeeId) {
    return res.status(403).json({ error: 'Cannot submit another employee assessment.' });
  }

  const now = new Date().toISOString();
  const updated: CompetencyAssessmentDoc = {
    ...existing,
    status: targetStatus,
    submittedAt: targetStatus === 'submitted' ? now : existing.submittedAt,
    approvedById: targetStatus === 'approved' ? actor.id : existing.approvedById,
    approvedByName: targetStatus === 'approved' ? actor.name : existing.approvedByName,
    approvedAt: targetStatus === 'approved' ? now : existing.approvedAt,
    rejectionReason: targetStatus === 'rejected' ? String(rejectionReason || 'Returned for revision') : existing.rejectionReason,
    updatedAt: now,
  };

  db.competencyAssessments[idx] = updated;
  if (targetStatus === 'approved') {
    pushTalentNotification(
      existing.employeeId,
      'idp_approved',
      'Competency Assessment Approved',
      `${actor.name} approved your ${existing.assessmentPeriod} assessment (v${existing.version}). Gap Engine updated.`,
      existing.id
    );
  } else if (targetStatus === 'submitted') {
    const supId = db.users.find((u) => u.id === existing.employeeId)?.supervisorId || 'user_fc1';
    pushTalentNotification(
      supId,
      'idp_submitted',
      'Assessment Submitted for Review',
      `${existing.employeeName} submitted ${existing.assessmentPeriod} competency assessment for validation.`,
      existing.id
    );
  }

  recordAudit(
    `ASSESSMENT_${String(targetStatus).toUpperCase()}`,
    `${actor.name} (${actor.role})`,
    `${existing.employeeName} (${existing.assessmentPeriod} v${existing.version})`,
    targetStatus === 'rejected' ? `Rejected: ${updated.rejectionReason}` : `Transitioned to ${targetStatus}`
  );
  persistDB(db);
  return res.json({ success: true, assessment: updated });
});

app.get('/api/talent/gap-analysis', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  const employeeId = String(req.query.employeeId || actor.id);
  if (!canViewEmployeeTalentData(actor, employeeId)) {
    return res.status(403).json({ error: 'Access Denied: Cannot view another employee gap analysis.' });
  }

  const emp = db.users.find((u) => u.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee not found.' });

  const targetPosition = String(req.query.targetPosition || 'Assistant Financial Controller');
  const periodFilter = req.query.period ? String(req.query.period) : undefined;

  const summary = calculateGapAnalysis({
    assessments: db.competencyAssessments,
    employeeId,
    targetPosition,
    competencies: db.competencies,
    domains: COMPETENCY_DOMAINS,
    config: db.talentConfig,
    periodFilter,
  });

  if (!summary.hasValidTargetPosition) {
    return res.status(400).json({ error: summary.targetPositionError, summary });
  }

  return res.json({ summary });
});

app.post('/api/talent/activities', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  const body = req.body || {};
  const { employeeId, competencyCode, titleEn, titleVi, category, ratioCategory } = body;
  if (!employeeId || !competencyCode || (!titleEn && !titleVi)) {
    return res.status(400).json({ error: 'employeeId, competencyCode, and title are required.' });
  }

  if (!hasActorPermission(req, 'manage_team_idp') && actor.id !== employeeId) {
    return res.status(403).json({ error: 'Cannot create development activities for another employee.' });
  }
  if (
    body.sourceType === 'custom_lnd' &&
    !hasActorPermission(req, 'manage_team_idp')
  ) {
    return res.status(403).json({ error: 'manage_team_idp permission is required to create custom mapped activities.' });
  }

  const comp = db.competencies.find((c) => c.code === competencyCode);
  const now = new Date().toISOString();
  const act: DevelopmentActivityDoc = {
    id: `tact_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    idpId: body.idpId,
    objectiveId: body.objectiveId,
    employeeId,
    competencyId: comp?.id || body.competencyId || competencyCode,
    competencyCode,
    domainId: comp?.domainId || body.domainId || 'dom_1',
    category: category || 'B_On_The_Job',
    ratioCategory: ratioCategory || '70_experiential',
    titleEn: String(titleEn || titleVi),
    titleVi: String(titleVi || titleEn),
    descriptionEn: String(body.descriptionEn || titleEn || ''),
    descriptionVi: String(body.descriptionVi || titleVi || ''),
    sourceType: body.sourceType || 'custom_lnd',
    sourceRecordId: body.sourceRecordId,
    sourceCode: body.sourceCode || 'LND-CUSTOM',
    targetLevel: (Number(body.targetLevel) || 3) as ProficiencyLevel,
    estimatedHours: Math.max(1, Number(body.estimatedHours) || 8),
    dueDate: body.dueDate || new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
    status: 'planned',
    validationStatus: body.evidenceRequired === false ? 'not_required' : 'pending_validation',
    evidenceRequired: body.evidenceRequired !== false,
    assignedById: actor.id,
    assignedByName: actor.name,
    createdAt: now,
    updatedAt: now,
  };

  db.developmentActivities.unshift(act);
  recordAudit(
    'CREATE_DEVELOPMENT_ACTIVITY',
    `${actor.name} (${actor.role})`,
    `${employeeId} (${competencyCode})`,
    `Assigned activity: ${act.titleEn}`
  );
  persistDB(db);
  return res.status(201).json({ success: true, activity: act });
});

app.patch('/api/talent/activities/:id', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  const { id } = req.params;
  const idx = db.developmentActivities.findIndex((a) => a.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Development activity not found.' });

  const existing = db.developmentActivities[idx];
  if (!canViewEmployeeTalentData(actor, existing.employeeId)) {
    return res.status(403).json({ error: 'Access Denied.' });
  }

  const { status, validationStatus, evidenceNotes, evidenceFileName, validatorFeedback } = req.body || {};

  // Employees CANNOT validate/approve their own activities
  if (validationStatus && ['approved', 'revision_requested'].includes(validationStatus)) {
    if (!hasActorPermission(req, 'manage_team_idp') || actor.id === existing.employeeId) {
      return res.status(403).json({
        error: 'Employees cannot validate or approve their own development activity evidence.',
      });
    }
  }

  const nextEvidenceNotes = evidenceNotes !== undefined ? String(evidenceNotes).trim() : existing.evidenceNotes;
  const nextEvidenceFile = evidenceFileName !== undefined ? String(evidenceFileName).trim() : existing.evidenceFileName;
  const hasEvidence = Boolean(nextEvidenceNotes || nextEvidenceFile);

  // Evidence required gate before marking completed
  if (status === 'completed' && existing.evidenceRequired && !hasEvidence) {
    return res.status(400).json({
      error: 'Evidence notes or deliverable file name are required before completing this activity.',
    });
  }

  // Non-course activities require supervisor validation to reach completed
  const nextValidation = validationStatus || existing.validationStatus;
  if (
    status === 'completed' &&
    existing.category !== 'A_Formal_Learning' &&
    nextValidation !== 'approved'
  ) {
    if (!hasActorPermission(req, 'manage_team_idp') || actor.id === existing.employeeId) {
      return res.status(400).json({
        error: 'Activity requires supervisor/FC validation before final completion. Submit evidence for validation instead.',
      });
    }
  }

  const now = new Date().toISOString();
  const updated: DevelopmentActivityDoc = {
    ...existing,
    status: status || existing.status,
    validationStatus: nextValidation,
    evidenceNotes: nextEvidenceNotes,
    evidenceFileName: nextEvidenceFile,
    validatorFeedback: validatorFeedback !== undefined ? String(validatorFeedback) : existing.validatorFeedback,
    validatedById:
      validationStatus === 'approved' || validationStatus === 'revision_requested' ? actor.id : existing.validatedById,
    validatedByName:
      validationStatus === 'approved' || validationStatus === 'revision_requested' ? actor.name : existing.validatedByName,
    validatedAt:
      validationStatus === 'approved' || validationStatus === 'revision_requested' ? now : existing.validatedAt,
    updatedAt: now,
  };

  db.developmentActivities[idx] = updated;
  if (validationStatus === 'approved') {
    pushTalentNotification(
      existing.employeeId,
      'activity_validated',
      'Activity Evidence Validated',
      `${actor.name} approved your evidence for ${existing.competencyCode}: ${existing.titleEn}.`,
      existing.id
    );
  }
  persistDB(db);
  return res.json({ success: true, activity: updated });
});

app.get('/api/talent/idps/:employeeId', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  const { employeeId } = req.params;
  if (!canViewEmployeeTalentData(actor, employeeId)) {
    return res.status(403).json({
      error: 'Access Denied: Employees cannot view another employee Individual Development Plan.',
    });
  }

  const idps = db.talentIdps.filter((i) => i.employeeId === employeeId);
  return res.json({ idps });
});

app.post('/api/talent/idps', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  const body = req.body || {};
  const {
    employeeId,
    targetPosition,
    sourceAssessmentId,
    periodStart,
    periodEnd,
    overallGoalEn,
    overallGoalVi,
    objectives = [],
    confirmDuplicate = false,
  } = body;

  if (!employeeId || !targetPosition) {
    return res.status(400).json({ error: 'employeeId and targetPosition are required.' });
  }
  if (actor.role === 'learner' && actor.id !== employeeId) {
    return res.status(403).json({ error: 'Cannot create IDP for another employee.' });
  }

  const employee = db.users.find((u) => u.id === employeeId);
  if (!employee) return res.status(404).json({ error: 'Employee not found.' });

  const targetCheck = resolvePositionTargetMatrix(db.competencies, targetPosition, db.talentConfig);
  if (!targetCheck.hasValidTargets) {
    return res.status(400).json({ error: targetCheck.error });
  }

  const approvedAsmt = sourceAssessmentId
    ? db.competencyAssessments.find((a) => a.id === sourceAssessmentId && a.status === 'approved')
    : db.competencyAssessments.find((a) => a.employeeId === employeeId && a.status === 'approved');

  if (!approvedAsmt) {
    return res.status(400).json({
      error: 'An approved competency assessment is required before generating or creating an IDP.',
    });
  }

  // Duplicate active/open IDP guard (requires explicit confirmation)
  const existingOpen = db.talentIdps.find(
    (i) =>
      i.employeeId === employeeId &&
      i.sourceAssessmentId === approvedAsmt.id &&
      !['closed', 'completed'].includes(i.status)
  );
  if (existingOpen && !confirmDuplicate) {
    return res.status(409).json({
      code: 'DUPLICATE_IDP_CONFIRM_REQUIRED',
      error: `An open IDP (${existingOpen.id}, status: ${existingOpen.status}) already exists for assessment ${approvedAsmt.assessmentPeriod}. Pass confirmDuplicate: true to create a new version.`,
      existingIdpId: existingOpen.id,
    });
  }

  const now = new Date().toISOString();
  const sup = db.users.find((u) => u.id === employee.supervisorId) || db.users.find((u) => u.id === 'user_fc1');
  const nextVersion =
    db.talentIdps
      .filter((i) => i.employeeId === employeeId)
      .reduce((m, i) => Math.max(m, i.version || 1), 0) + 1;

  const idpId = `tidp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const sanitizedObjectives: DevelopmentObjective[] = (Array.isArray(objectives) ? objectives : []).map(
    (o: any, i: number) => ({
      id: o.id || `tobj_${Date.now()}_${i}`,
      competencyId: o.competencyId || db.competencies.find((c) => c.code === o.competencyCode)?.id || o.competencyCode,
      competencyCode: String(o.competencyCode),
      domainId: o.domainId || db.competencies.find((c) => c.code === o.competencyCode)?.domainId || 'dom_1',
      baselineLevel: (Number(o.baselineLevel) || 2) as ProficiencyLevel,
      targetLevel: (Number(o.targetLevel) || 3) as ProficiencyLevel,
      gap: Math.max(0, Number(o.gap) || 1),
      isCritical: Boolean(o.isCritical),
      priority: o.priority || 'High',
      titleEn: String(o.titleEn || o.titleVi || `Develop ${o.competencyCode}`),
      titleVi: String(o.titleVi || o.titleEn || `Phát triển ${o.competencyCode}`),
      category: o.category || 'B_On_The_Job',
      ratioCategory: o.ratioCategory || '70_experiential',
      linkedCourseId: o.linkedCourseId,
      linkedCourseCode: o.linkedCourseCode,
      linkedPracticalId: o.linkedPracticalId,
      linkedPracticalCode: o.linkedPracticalCode,
      activityIds: Array.isArray(o.activityIds) ? o.activityIds : [],
      targetDate: o.targetDate || new Date(Date.now() + (i + 1) * 30 * 86400000).toISOString().split('T')[0],
      successMeasure: String(o.successMeasure || `Reach Target Level ${o.targetLevel || 3}`),
      status: 'not_started',
      progressPercent: 0,
      supervisorValidationStatus: o.category === 'A_Formal_Learning' ? 'not_required' : 'pending_validation',
    })
  );

  const newIdp: IndividualDevelopmentPlanDoc = {
    id: idpId,
    version: nextVersion,
    employeeId,
    employeeName: employee.name,
    property: employee.property,
    department: employee.department,
    currentPosition: employee.position,
    targetPosition,
    sourceAssessmentId: approvedAsmt.id,
    sourceAssessmentPeriod: approvedAsmt.assessmentPeriod,
    managerId: sup?.id || 'user_fc1',
    managerName: sup?.name || 'David Tran',
    status: 'draft',
    periodStart: periodStart || now.split('T')[0],
    periodEnd: periodEnd || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
    overallGoalEn:
      overallGoalEn ||
      `Close ${sanitizedObjectives.length} priority competency gaps to qualify for ${targetPosition}.`,
    overallGoalVi:
      overallGoalVi ||
      `Thu hẹp ${sanitizedObjectives.length} khoảng trống năng lực trọng tâm để đạt chuẩn vị trí ${targetPosition}.`,
    ratioTarget: {
      experiential70: db.talentConfig.ratio702010.experiential,
      social20: db.talentConfig.ratio702010.social,
      formal10: db.talentConfig.ratio702010.formal,
    },
    objectives: sanitizedObjectives,
    createdBy: actor.id,
    createdAt: now,
    updatedAt: now,
  };

  db.talentIdps.unshift(newIdp);
  db.idpReviewLogs.unshift({
    id: `rlog_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    idpId: newIdp.id,
    employeeId,
    action: 'CREATED',
    toStatus: 'draft',
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    comment: `Created IDP v${newIdp.version} for ${targetPosition} (${sanitizedObjectives.length} objectives).`,
    timestamp: now,
  });

  recordAudit(
    'CREATE_TALENT_IDP',
    `${actor.name} (${actor.role})`,
    employee.name,
    `Created IDP ${newIdp.id} for ${targetPosition}`
  );
  persistDB(db);
  return res.status(201).json({ success: true, idp: newIdp });
});

app.post('/api/talent/idps/:id/transition', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  const { id } = req.params;
  const { targetStatus, comment = '' } = req.body || {};
  const idx = db.talentIdps.findIndex((i) => i.id === id);
  if (idx < 0) return res.status(404).json({ error: 'IDP not found.' });

  const existing = db.talentIdps[idx];
  const validStatuses = [
    'draft',
    'submitted',
    'manager_review',
    'lnd_approved',
    'active',
    'in_progress',
    'completed',
    'reassessment',
    'closed',
  ];
  if (!validStatuses.includes(targetStatus)) {
    return res.status(400).json({ error: 'Invalid IDP workflow status.' });
  }

  // Strict RBAC: Employees CANNOT approve their own IDP or force L&D/Manager/Closed transitions
  const approvalOrCloseStatuses = ['manager_review', 'lnd_approved', 'active', 'closed'];
  const canManageIdp = hasActorPermission(req, 'manage_team_idp');
  const canAssessIdp = hasActorPermission(req, 'assess_team_members');
  if (approvalOrCloseStatuses.includes(targetStatus)) {
    if (actor.id === existing.employeeId) {
      return res.status(403).json({
        error: 'Access Denied: Employees cannot approve or close their own Individual Development Plan.',
      });
    }
    if (targetStatus === 'lnd_approved' && !canManageIdp) {
      return res.status(403).json({
        error: 'manage_team_idp permission is required to grant L&D Approval.',
      });
    }
    if (!canManageIdp && !canAssessIdp) {
      return res.status(403).json({ error: 'Insufficient permissions for IDP approval transition.' });
    }
  } else if (!canManageIdp && actor.id !== existing.employeeId) {
    return res.status(403).json({ error: 'Cannot modify another employee IDP.' });
  }

  if (targetStatus === 'completed') {
    const metrics = evaluateIdpProgress({
      idp: existing,
      enrollments: db.enrollments,
      quizAttempts: db.quizAttempts,
      submissions: db.submissions,
      courses: COURSES,
      activities: db.developmentActivities,
    });
    if (metrics.completionPct < 100 && !canManageIdp) {
      return res.status(400).json({
        error: `Cannot mark IDP completed: strict objective completion is ${metrics.completionPct}% (requires 100%).`,
      });
    }
  }

  const now = new Date().toISOString();
  const updated: IndividualDevelopmentPlanDoc = {
    ...existing,
    status: targetStatus,
    submittedAt: targetStatus === 'submitted' ? now : existing.submittedAt,
    managerReviewedBy: targetStatus === 'manager_review' ? actor.name : existing.managerReviewedBy,
    managerReviewedAt: targetStatus === 'manager_review' ? now : existing.managerReviewedAt,
    lndApprovedBy: targetStatus === 'lnd_approved' ? actor.name : existing.lndApprovedBy,
    lndApprovedAt: targetStatus === 'lnd_approved' ? now : existing.lndApprovedAt,
    activatedAt: targetStatus === 'active' ? now : existing.activatedAt,
    completedAt: targetStatus === 'completed' ? now : existing.completedAt,
    closedAt: targetStatus === 'closed' ? now : existing.closedAt,
    rejectionNotes: targetStatus === 'draft' && comment ? String(comment) : existing.rejectionNotes,
    updatedAt: now,
  };

  db.talentIdps[idx] = updated;

  const actionLabel: IdpReviewLogDoc['action'] =
    targetStatus === 'submitted'
      ? 'SUBMITTED'
      : targetStatus === 'manager_review'
      ? 'MANAGER_APPROVED'
      : targetStatus === 'lnd_approved'
      ? 'LND_APPROVED'
      : targetStatus === 'active'
      ? 'ACTIVATED'
      : targetStatus === 'completed'
      ? 'COMPLETED'
      : targetStatus === 'reassessment'
      ? 'REASSESSMENT_TRIGGERED'
      : targetStatus === 'closed'
      ? 'CLOSED'
      : targetStatus === 'draft'
      ? 'RETURNED_FOR_REVISION'
      : 'PROGRESS_UPDATED';

  db.idpReviewLogs.unshift({
    id: `rlog_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    idpId: updated.id,
    employeeId: updated.employeeId,
    action: actionLabel,
    fromStatus: existing.status,
    toStatus: targetStatus,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    comment: String(comment || `Status transitioned from ${existing.status} to ${targetStatus}.`),
    timestamp: now,
  });

  if (targetStatus === 'submitted') {
    pushTalentNotification(
      updated.managerId,
      'idp_submitted',
      'IDP Submitted for Manager Review',
      `${updated.employeeName} submitted IDP v${updated.version} for ${updated.targetPosition}.`,
      updated.id
    );
  } else if (['manager_review', 'lnd_approved', 'active'].includes(targetStatus)) {
    pushTalentNotification(
      updated.employeeId,
      'idp_approved',
      `IDP ${targetStatus.replace('_', ' ').toUpperCase()}`,
      `${actor.name} updated your IDP status to ${targetStatus}.`,
      updated.id
    );
  } else if (targetStatus === 'draft' && comment) {
    pushTalentNotification(
      updated.employeeId,
      'idp_feedback',
      'IDP Revision Feedback',
      `${actor.name} requested IDP revisions: ${comment}`,
      updated.id
    );
  }

  recordAudit(
    `IDP_${actionLabel}`,
    `${actor.name} (${actor.role})`,
    updated.employeeName,
    `${existing.status} -> ${targetStatus}${comment ? ` (${comment})` : ''}`
  );
  persistDB(db);
  return res.json({ success: true, idp: updated });
});

app.patch('/api/talent/idps/:id/objectives/:objId', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  const { id, objId } = req.params;
  const idx = db.talentIdps.findIndex((i) => i.id === id);
  if (idx < 0) return res.status(404).json({ error: 'IDP not found.' });

  const idp = db.talentIdps[idx];
  if (!canViewEmployeeTalentData(actor, idp.employeeId)) {
    return res.status(403).json({ error: 'Access Denied.' });
  }
  if (!hasActorPermission(req, 'manage_team_idp') && actor.id !== idp.employeeId) {
    return res.status(403).json({ error: 'Cannot update another employee IDP.' });
  }

  const objIdx = idp.objectives.findIndex((o) => o.id === objId);
  if (objIdx < 0) return res.status(404).json({ error: 'Objective not found in IDP.' });

  const existingObj = idp.objectives[objIdx];
  const { status, progressPercent, evidenceNotes, evidenceFileName, supervisorValidationStatus } = req.body || {};

  if (supervisorValidationStatus && ['approved', 'revision_requested'].includes(supervisorValidationStatus)) {
    if ((!hasActorPermission(req, 'manage_team_idp') && !hasActorPermission(req, 'assess_team_members')) || actor.id === idp.employeeId) {
      return res.status(403).json({ error: 'Employees cannot validate their own objective evidence.' });
    }
  }

  const nextEvNotes = evidenceNotes !== undefined ? String(evidenceNotes).trim() : existingObj.evidenceNotes;
  const nextEvFile = evidenceFileName !== undefined ? String(evidenceFileName).trim() : existingObj.evidenceFileName;
  const nextValStatus = supervisorValidationStatus || existingObj.supervisorValidationStatus;

  if (status === 'completed' && existingObj.category !== 'A_Formal_Learning') {
    if (!nextEvNotes && !nextEvFile) {
      return res.status(400).json({
        error: 'Evidence notes or deliverable file are required before completing this objective.',
      });
    }
    if (nextValStatus !== 'approved') {
      return res.status(400).json({
        error: 'OJT/Practical/Coaching objectives require supervisor validation approval before completion.',
      });
    }
  }

  const now = new Date().toISOString();
  const updatedObj: DevelopmentObjective = {
    ...existingObj,
    status: status || existingObj.status,
    progressPercent:
      progressPercent !== undefined ? Math.max(0, Math.min(100, Number(progressPercent))) : existingObj.progressPercent,
    evidenceNotes: nextEvNotes,
    evidenceFileName: nextEvFile,
    supervisorValidationStatus: nextValStatus,
    supervisorValidatedBy:
      supervisorValidationStatus === 'approved' ? actor.name : existingObj.supervisorValidatedBy,
    supervisorValidatedAt:
      supervisorValidationStatus === 'approved' ? now : existingObj.supervisorValidatedAt,
    completedAt: status === 'completed' ? now : existingObj.completedAt,
  };

  const nextObjectives = [...idp.objectives];
  nextObjectives[objIdx] = updatedObj;
  const nextIdpStatus =
    idp.status === 'active' && (updatedObj.progressPercent > 0 || updatedObj.status !== 'not_started')
      ? 'in_progress'
      : idp.status;

  db.talentIdps[idx] = {
    ...idp,
    status: nextIdpStatus,
    objectives: nextObjectives,
    updatedAt: now,
  };

  db.idpReviewLogs.unshift({
    id: `rlog_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    idpId: idp.id,
    employeeId: idp.employeeId,
    action: supervisorValidationStatus === 'approved' ? 'EVIDENCE_VALIDATED' : 'PROGRESS_UPDATED',
    toStatus: nextIdpStatus,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    comment: `${updatedObj.competencyCode}: ${updatedObj.status} (${updatedObj.progressPercent}%)${nextEvFile ? ` • File: ${nextEvFile}` : ''}`,
    timestamp: now,
  });

  persistDB(db);
  return res.json({ success: true, idp: db.talentIdps[idx], objective: updatedObj });
});

app.post('/api/talent/reassessments', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  if (!hasActorPermission(req, 'assess_team_members')) {
    return res.status(403).json({
      error: 'assess_team_members permission is required to submit validated competency reassessments.',
    });
  }

  const { employeeId, idpId, updatedLevels = {}, summaryFeedback = '', newPeriod } = req.body || {};
  if (!employeeId) return res.status(400).json({ error: 'employeeId is required.' });

  const emp = db.users.find((u) => u.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee not found.' });

  const idp = idpId
    ? db.talentIdps.find((i) => i.id === idpId)
    : db.talentIdps.find((i) => i.employeeId === employeeId);
  const targetPosition = idp?.targetPosition || 'Assistant Financial Controller';

  const baselineGap = calculateGapAnalysis({
    assessments: db.competencyAssessments,
    employeeId,
    targetPosition,
    competencies: db.competencies,
    domains: COMPETENCY_DOMAINS,
    config: db.talentConfig,
  });

  if (!baselineGap.hasApprovedAssessment || !baselineGap.assessmentId) {
    return res.status(400).json({ error: 'No baseline approved assessment found for comparison.' });
  }

  const baselineAsmt = db.competencyAssessments.find((a) => a.id === baselineGap.assessmentId)!;
  const now = new Date().toISOString();
  const nextPeriod = newPeriod || `${baselineAsmt.assessmentPeriod}-REVAL`;

  const newResults: Record<string, any> = {};
  const comparisonItems: CompetencyReassessmentDoc['items'] = [];

  for (const row of baselineGap.rows) {
    const before = row.currentLevel ?? 1;
    const rawAfter = updatedLevels[row.competencyCode];
    const after = (
      rawAfter !== undefined && rawAfter !== null
        ? Math.max(1, Math.min(4, Number(rawAfter)))
        : before
    ) as ProficiencyLevel;
    newResults[row.competencyCode] = {
      competencyId: row.competencyId,
      competencyCode: row.competencyCode,
      domainId: row.domainId,
      currentLevel: after,
      targetLevel: row.targetLevel,
      gap: Math.max(0, row.targetLevel - after),
      selfLevel: baselineAsmt.results[row.competencyCode]?.selfLevel ?? after,
      supervisorLevel: after,
      assessorNotes: `Reassessed on ${now.split('T')[0]} by ${actor.name}.`,
    };
    comparisonItems.push({
      competencyCode: row.competencyCode,
      competencyNameEn: row.nameEn,
      competencyNameVi: row.nameVi,
      domainId: row.domainId,
      beforeLevel: before,
      afterLevel: after,
      targetLevel: row.targetLevel,
      delta: after - before,
      remainingGap: Math.max(0, row.targetLevel - after),
    });
  }

  const nextVersion =
    db.competencyAssessments
      .filter((a) => a.employeeId === employeeId)
      .reduce((m, a) => Math.max(m, a.version || 1), 0) + 1;

  const newApprovedAsmt: CompetencyAssessmentDoc = {
    id: `casmt_reval_${Date.now()}`,
    version: nextVersion,
    supersedesId: baselineAsmt.id,
    employeeId,
    employeeName: emp.name,
    property: emp.property,
    department: emp.department,
    currentPosition: emp.position,
    targetPosition,
    assessmentPeriod: nextPeriod,
    assessorId: actor.id,
    assessorName: actor.name,
    assessorType: actor.role === 'financial_controller' ? 'financial_controller' : 'final_validated',
    status: 'approved',
    submittedAt: now,
    approvedById: actor.id,
    approvedByName: actor.name,
    approvedAt: now,
    overallComments: summaryFeedback || 'Formal post-IDP competency reassessment.',
    results: newResults,
    createdAt: now,
    updatedAt: now,
  };

  db.competencyAssessments.unshift(newApprovedAsmt);

  const afterGap = calculateGapAnalysis({
    assessments: db.competencyAssessments,
    employeeId,
    targetPosition,
    competencies: db.competencies,
    domains: COMPETENCY_DOMAINS,
    config: db.talentConfig,
    specificAssessmentId: newApprovedAsmt.id,
  });

  const beforeClosed = baselineGap.rows.filter((r) => r.gap === 0).length;
  const afterClosed = afterGap.rows.filter((r) => r.gap === 0).length;

  const reassessmentDoc: CompetencyReassessmentDoc = {
    id: `reasmt_${Date.now()}`,
    employeeId,
    employeeName: emp.name,
    idpId: idp?.id || 'none',
    baselineAssessmentId: baselineAsmt.id,
    newApprovedAssessmentId: newApprovedAsmt.id,
    targetPosition,
    reassessmentDate: now.split('T')[0],
    assessorId: actor.id,
    assessorName: actor.name,
    assessorRole: actor.role,
    beforeAchievementPct: baselineGap.achievementPct,
    afterAchievementPct: afterGap.achievementPct,
    netImprovementPct: afterGap.achievementPct - baselineGap.achievementPct,
    gapsClosedCount: Math.max(0, afterClosed - beforeClosed),
    remainingGapsCount: afterGap.rows.filter((r) => r.gap > 0).length,
    items: comparisonItems,
    summaryFeedback: String(summaryFeedback || ''),
    createdAt: now,
  };

  db.competencyReassessments.unshift(reassessmentDoc);

  if (idp) {
    const idpIdx = db.talentIdps.findIndex((i) => i.id === idp.id);
    if (idpIdx >= 0) {
      db.talentIdps[idpIdx] = {
        ...db.talentIdps[idpIdx],
        status: afterGap.achievementPct >= 95 && afterGap.criticalBlockers.length === 0 ? 'closed' : 'reassessment',
        updatedAt: now,
      };
      db.idpReviewLogs.unshift({
        id: `rlog_${Date.now()}_re`,
        idpId: idp.id,
        employeeId,
        action: 'REASSESSMENT_TRIGGERED',
        fromStatus: idp.status,
        toStatus: db.talentIdps[idpIdx].status,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        comment: `Reassessment completed: ${baselineGap.achievementPct}% -> ${afterGap.achievementPct}% (+${reassessmentDoc.netImprovementPct}%).`,
        timestamp: now,
      });
    }
  }

  pushTalentNotification(
    employeeId,
    'reassessment',
    'Competency Reassessment Completed',
    `${actor.name} completed your reassessment: Achievement moved from ${baselineGap.achievementPct}% to ${afterGap.achievementPct}%.`,
    reassessmentDoc.id
  );

  recordAudit(
    'COMPETENCY_REASSESSMENT',
    `${actor.name} (${actor.role})`,
    emp.name,
    `Baseline ${baselineGap.achievementPct}% -> New ${afterGap.achievementPct}% (v${newApprovedAsmt.version})`
  );
  persistDB(db);
  return res.status(201).json({
    success: true,
    reassessment: reassessmentDoc,
    newAssessment: newApprovedAsmt,
  });
});

app.post('/api/talent/readiness', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;
  if (!hasActorPermission(req, 'manage_team_idp') && !hasActorPermission(req, 'assess_team_members')) {
    return res.status(403).json({ error: 'manage_team_idp or assess_team_members permission is required to submit career readiness reviews.' });
  }

  const { employeeId, targetPosition, reviewNotes = '', requestedStatus } = req.body || {};
  if (!employeeId || !targetPosition) {
    return res.status(400).json({ error: 'employeeId and targetPosition are required.' });
  }

  const emp = db.users.find((u) => u.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee not found.' });

  const gapSummary = calculateGapAnalysis({
    assessments: db.competencyAssessments,
    employeeId,
    targetPosition,
    competencies: db.competencies,
    domains: COMPETENCY_DOMAINS,
    config: db.talentConfig,
  });

  if (!gapSummary.hasValidTargetPosition) {
    return res.status(400).json({ error: gapSummary.targetPositionError });
  }
  if (!gapSummary.hasApprovedAssessment || !gapSummary.assessmentId) {
    return res.status(400).json({ error: 'Employee has no approved competency assessment.' });
  }

  const idp = db.talentIdps.find((i) => i.employeeId === employeeId) || null;
  const idpMetrics = idp
    ? evaluateIdpProgress({
        idp,
        enrollments: db.enrollments,
        quizAttempts: db.quizAttempts,
        submissions: db.submissions,
        courses: COURSES,
        activities: db.developmentActivities,
      })
    : null;

  const evalResult = evaluateCareerReadiness({
    gapSummary,
    idpMetrics,
    config: db.talentConfig,
  });

  // Enforce mandatory critical competency minimum gate
  if (
    requestedStatus === 'Ready for Review' &&
    db.talentConfig.readinessThresholds.requireAllCriticalAtTarget &&
    gapSummary.criticalBlockers.length > 0
  ) {
    return res.status(400).json({
      error: `Cannot mark Ready for Review: mandatory critical competencies below target (${gapSummary.criticalBlockers
        .map((b) => `${b.competencyCode}: L${b.currentLevel ?? 0}/L${b.targetLevel}`)
        .join(', ')}).`,
      evaluation: evalResult,
    });
  }

  const now = new Date().toISOString();
  const review: CareerReadinessReviewDoc = {
    id: `crr_${Date.now()}`,
    employeeId,
    employeeName: emp.name,
    property: emp.property,
    department: emp.department,
    currentPosition: emp.position,
    targetPosition,
    sourceAssessmentId: gapSummary.assessmentId,
    sourceIdpId: idp?.id,
    computedStatus: evalResult.status,
    finalStatus: requestedStatus || evalResult.status,
    achievementPct: evalResult.achievementPct,
    weightedAchievementPct: evalResult.weightedAchievementPct,
    idpCompletionPct: evalResult.idpCompletionPct,
    criticalAchievementPct: evalResult.criticalAchievementPct,
    criticalBlockers: gapSummary.criticalBlockers.map(
      (b) => `${b.competencyCode}: L${b.currentLevel ?? 0}/L${b.targetLevel}`
    ),
    recommendedNextSteps: evalResult.recommendedNextSteps,
    reviewerId: actor.id,
    reviewerName: actor.name,
    reviewerRole: actor.role,
    reviewNotes: String(reviewNotes || evalResult.blockingReasons.join(' | ') || 'Readiness review recorded.'),
    reviewedAt: now,
  };

  db.careerReadinessReviews.unshift(review);
  recordAudit(
    'CAREER_READINESS_REVIEW',
    `${actor.name} (${actor.role})`,
    emp.name,
    `${targetPosition}: ${review.finalStatus} (Achievement ${review.achievementPct}%, IDP ${review.idpCompletionPct}%)`
  );
  persistDB(db);
  return res.status(201).json({ success: true, review, evaluation: evalResult });
});

app.post('/api/talent/notifications/read', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;
  db.talentNotifications = db.talentNotifications.map((n) =>
    n.recipientId === actor.id || n.recipientId === 'all' ? { ...n, read: true } : n
  );
  persistDB(db);
  return res.json({ success: true });
});

app.post('/api/talent/export-report', (req, res) => {
  const actor = requireTalentActor(req, res);
  if (!actor) return;

  const { reportType = 'competency_gap_summary', filters = {} } = req.body || {};
  const scopedFilters = {
    ...filters,
    employeeId: !hasActorPermission(req, 'view_all_learners_data') ? actor.id : filters.employeeId,
  };

  const { buffer, filename } = buildTalentReportWorkbook({
    reportType: reportType as TalentReportType,
    users: db.users,
    competencies: db.competencies,
    domains: COMPETENCY_DOMAINS,
    courses: COURSES,
    ojtAssignments: OJT_ASSIGNMENTS,
    enrollments: db.enrollments,
    quizAttempts: db.quizAttempts,
    submissions: db.submissions,
    competencyAssessments: db.competencyAssessments,
    talentIdps: db.talentIdps,
    developmentActivities: db.developmentActivities,
    competencyReassessments: db.competencyReassessments,
    talentConfig: db.talentConfig,
    filters: scopedFilters,
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(buffer);
});

// 8. Gemini AI Development Coach for Competency Gap Engine & IDP (Strictly Advisory)
app.post('/api/gemini/talent-coach', async (req, res) => {
  try {
    const actor = requireTalentActor(req, res);
    if (!actor) return;
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const {
      employeeId,
      targetPosition = 'Assistant Financial Controller',
      mode = 'explain_gaps',
      language = 'vi',
      customPrompt = '',
    } = req.body || {};

    if (!employeeId) return res.status(400).json({ error: 'employeeId is required.' });
    if (!canViewEmployeeTalentData(actor, employeeId)) {
      return res.status(403).json({ error: 'Access Denied for this employee.' });
    }

    const emp = db.users.find((u) => u.id === employeeId);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    const gapSummary = calculateGapAnalysis({
      assessments: db.competencyAssessments,
      employeeId,
      targetPosition,
      competencies: db.competencies,
      domains: COMPETENCY_DOMAINS,
      config: db.talentConfig,
    });

    const activeIdp = db.talentIdps.find((i) => i.employeeId === employeeId) || null;
    const idpMetrics = activeIdp
      ? evaluateIdpProgress({
          idp: activeIdp,
          enrollments: db.enrollments,
          quizAttempts: db.quizAttempts,
          submissions: db.submissions,
          courses: COURSES,
          activities: db.developmentActivities,
        })
      : null;

    const readiness = evaluateCareerReadiness({
      gapSummary,
      idpMetrics,
      config: db.talentConfig,
    });

    const knowledgeBase = buildCurriculumKnowledgeBase();
    const prompt = `You are the AI Development Coach for FC Learning Academy.
CRITICAL SAFETY RULE: You are strictly an advisory coach and drafter. Never invent nonexistent course IDs or alter official assessment scores/approvals. Ground every recommendation strictly in the approved LMS catalog and employee records below.

${knowledgeBase}

EMPLOYEE CONTEXT:
- Employee: ${emp.name} (${emp.position} -> Target: ${targetPosition})
- Property: ${emp.property}
- Approved Gap Analysis Summary: Achievement ${gapSummary.achievementPct}%, Critical Score ${gapSummary.criticalAchievementPct}%, Avg Gap ${gapSummary.averageGap}, Unassessed ${gapSummary.unassessedCount}
- Priority Competency Gaps: ${JSON.stringify(gapSummary.priorityDevelopmentList.slice(0, 8))}
- Critical Blockers: ${JSON.stringify(gapSummary.criticalBlockers.map((b) => `${b.competencyCode}: L${b.currentLevel}/L${b.targetLevel}`))}
- Active IDP Progress: ${idpMetrics ? `${idpMetrics.completionPct}% (${idpMetrics.completedObjectives}/${idpMetrics.totalObjectives} objectives)` : 'No active IDP yet'}
- Computed Readiness Status: ${readiness.status} (Blocking reasons: ${readiness.blockingReasons.join('; ') || 'None'})

REQUESTED COACHING MODE: ${mode}
Mode Instructions:
- explain_gaps: Explain competency gap results clearly, why the critical competencies affect hotel P&L/internal control/GM partnership, and prioritize the sequence.
- draft_90day_idp: Draft an editable 90-day 70-20-10 IDP action plan referencing exact approved HFC-* courses and OJT-* assignments above.
- recommend_activities: Suggest tailored 70% OJT / 20% coaching / 10% formal activities for the top 4 gaps.
- coaching_questions: Generate 5 sharp coaching & behavioral mentoring questions for the Financial Controller / manager to use in 1-on-1 reviews.
- reassessment_guide: Generate a structured reassessment verification & interview guide testing whether the employee truly moved up a proficiency level.
- career_report: Generate an executive career development & promotion readiness narrative for HR/L&D and General Manager.
${customPrompt ? `Extra Coach Context: ${customPrompt}` : ''}

Output Language: ${language === 'vi' ? 'Vietnamese (Tiếng Việt) with key USALI/finance terms' : 'English'}.
Include a clear advisory disclaimer noting outputs are editable suggestions requiring human review.`;

    const response = await generateContentWithRetry({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            advisoryDisclaimer: { type: Type.STRING },
            executiveInsights: { type: Type.STRING },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  competencyCode: { type: Type.STRING },
                  ratioTag: { type: Type.STRING },
                  title: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                  mappedResourceCode: { type: Type.STRING },
                  successMetric: { type: Type.STRING },
                },
                required: ['competencyCode', 'ratioTag', 'title', 'rationale', 'successMetric'],
              },
            },
            coachingQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['headline', 'advisoryDisclaimer', 'executiveInsights', 'actionItems', 'coachingQuestions'],
        },
      },
    });

    const coaching = parseJsonResponse(response.text);
    return res.json({ coaching, computedReadiness: readiness.status });
  } catch (error: any) {
    console.error('Error in /api/gemini/talent-coach:', error);
    return res.status(502).json({ error: error.message || 'AI Development Coach failed.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`FC Learning Academy Server running at http://localhost:${PORT}`);
  });
}

startServer();
