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
} from './src/types/index.ts';
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
    progressPercent: 66,
    completedModules: ['mod_102_1', 'mod_102_2'],
    status: 'in_progress',
    enrolledDate: '2024-03-05',
  },
  {
    id: 'enr_3',
    userId: 'user_learner1',
    courseId: 'course_03',
    progressPercent: 33,
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
    completedModules: ['mod_202_1', 'mod_202_2'],
    status: 'completed',
    enrolledDate: '2023-10-10',
    completedDate: '2023-11-05',
    quizScore: 88,
  },
  {
    id: 'enr_6',
    userId: 'user_learner2',
    courseId: 'course_09',
    progressPercent: 66,
    completedModules: ['mod_501_1', 'mod_501_2'],
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

        const loaded: AcademyDB = {
          users,
          competencies,
          enrollments: parsed.enrollments || [],
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
        };
        if (!hasTalentSeed) {
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
  if (actorId) {
    return db.users.find((u) => u.id === actorId);
  }
  return undefined;
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
    const { action, scenario, userTurn, conversationHistory = [], language = 'vi' } = req.body;
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API Key is not configured on the server.' });
    }
    if (!scenario) {
      return res.status(400).json({ error: 'Scenario context is required.' });
    }

    const knowledgeBase = buildCurriculumKnowledgeBase();

    if (action === 'evaluate') {
      const evaluationPrompt = `You are a Senior Corporate VP of Finance and Regional General Manager evaluating a Financial Controller candidate's performance in a live GM-FC crisis briefing.
Ground your evaluation and course recommendations in the approved FC Learning Academy curriculum:
${knowledgeBase}

Scenario: ${JSON.stringify(scenario)}
Conversation between GM and FC Learner:
${conversationHistory.map((m: any) => `${m.role === 'gm' ? 'GM' : 'FC Learner'}: ${m.text}`).join('\n')}
Latest FC Response: "${userTurn || ''}"

Evaluate strictly on these 5 transparent rubric dimensions (1 to 100 each):
1. financialAccuracy (USALI accuracy, P&L calculations, GOP/Flow-Through math)
2. analyticalThinking (Root-cause isolation, departmental variance diagnosis)
3. commercialUnderstanding (Guest experience balance, OTA vs direct channels, market positioning)
4. strategicRecommendations (Concrete 30/60/90-day corrective actions, owner ROI)
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
      const gmPrompt = `You are Richard Vance, a sharp, demanding 5-star Hotel General Manager at a 420-room luxury resort hotel.
You are in a one-on-one executive briefing with your Financial Controller.
Scenario: ${scenario.title}
Context: ${scenario.context}
Metrics: Occupancy ${scenario.metrics?.occupancy || '74%'}, ADR ${scenario.metrics?.adr || '$185'}, RevPAR ${scenario.metrics?.revpar || '$137'}, GOP Margin ${scenario.metrics?.gopMargin || '32%'}, Flow-through ${scenario.metrics?.flowThrough || '45%'}.

Conversation so far:
${conversationHistory.map((m: any) => `${m.role === 'gm' ? 'GM (You)' : 'FC (Learner)'}: ${m.text}`).join('\n')}

The FC just said: "${userTurn}"

Respond strictly as Richard Vance (GM):
- Challenge vague statements with concrete operational questions (Rooms payroll HPOR, F&B CoS, OTA commission, GSS).
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
  });
});

// Audit logs endpoint
app.get('/api/audit-logs', (req, res) => {
  res.json({ auditLogs: db.auditLogs });
});

// --- USERS & RBAC ---
app.post('/api/users', (req, res) => {
  const actor = getRequestActor(req);
  if (actor && actor.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Administrator can create user accounts.' });
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

  if (actor && actor.role !== 'super_admin' && !isSelfCareerUpdate) {
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
  if (actor && actor.role !== 'super_admin' && actor.role !== 'lnd_manager') {
    return res.status(403).json({ error: 'Only Admin or L&D Manager can modify competencies.' });
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
  if (actor && actor.role !== 'super_admin' && actor.role !== 'lnd_manager') {
    return res.status(403).json({ error: 'Only Admin or L&D Manager can delete competencies.' });
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
  if (actor && !['financial_controller', 'super_admin', 'lnd_manager'].includes(actor.role)) {
    return res.status(403).json({ error: 'Learners cannot grade OJT submissions.' });
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

  // Enforce level eligibility unless explicitly issued by Super Admin / L&D / FC
  const isAuthorizedIssuer = actor && ['super_admin', 'lnd_manager', 'financial_controller'].includes(actor.role);
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

    // RBAC check: learners cannot approve assessments directly
    if (actor && actor.role === 'learner' && record.status === 'approved') {
      return res.status(403).json({ error: 'Learners cannot approve their own competency assessments.' });
    }

    const existingIdx = db.assessments.findIndex((a) => a.id === record.id);
    const existingRecord = existingIdx >= 0 ? db.assessments[existingIdx] : undefined;

    // Preserve supervisor ratings/comments if saved by learner
    let mergedScores = record.scores || {};
    let mergedSupervisorComments = record.supervisorComments || '';
    if (actor && actor.role === 'learner' && existingRecord) {
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
        actor?.role === 'learner'
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

    const activityMap: Record<string, { courses: string[]; activity: string }> = {
      'FAR-01': { courses: ['course_01'], activity: 'Làm chủ hạch toán các tài khoản USALI và hoàn thành bài thi HFC-101 đạt trên 85%.' },
      'FAR-02': { courses: ['course_02'], activity: 'Chủ trì toàn bộ quy trình khóa sổ tháng và xuất báo cáo P&L sơ bộ đúng hạn Day 3.' },
      'FAR-03': { courses: ['course_02'], activity: 'Hoàn thiện tập hồ sơ Balance Sheet Reconciliation không còn tài khoản treo quá 30 ngày.' },
      'FAR-04': { courses: ['course_01'], activity: 'Xây dựng ma trận bóc tách doanh thu các gói Package phức tạp (Room + F&B + Spa).' },
      'FAR-05': { courses: ['course_06'], activity: 'Soạn thảo báo cáo Monthly Financial Critique giải trình biến động chi phí trên 5% gửi GM.' },
      'FCA-01': { courses: ['course_03'], activity: 'Thực hiện kiểm tra đột xuất quỹ tiền mặt và quy trình thu ngân quầy Lễ tân & F&B.' },
      'FCA-02': { courses: ['course_03'], activity: 'Rà soát 100% các khoản giảm trừ (Rebates/Allowances) và audit trail hủy hóa đơn POS.' },
      'FCA-03': { courses: ['course_07'], activity: 'Kiểm toán tỷ lệ hao hụt nguyên liệu F&B và phối hợp Bếp trưởng thực hiện Butcher Test.' },
      'FCA-04': { courses: ['course_03'], activity: 'Cập nhật ma trận rủi ro gian lận và chuẩn bị hồ sơ kiểm toán nội bộ tập đoàn.' },
      'FCA-05': { courses: ['course_02'], activity: 'Chủ trì cuộc họp Credit Meeting hàng tuần, duy trì chỉ số DSO dưới 28 ngày.' },
      'FPM-01': { courses: ['course_05'], activity: 'Tham gia tổ công tác xây dựng Ngân sách năm tiếp theo theo phương pháp zero-based.' },
      'FPM-02': { courses: ['course_05'], activity: 'Xây dựng mô hình 90-day Rolling Forecast với biên độ sai lệch GOP dưới ±3%.' },
      'FPM-03': { courses: ['course_05'], activity: 'Lập và theo dõi dự báo dòng tiền 13 tuần trực tiếp bảo đảm thanh khoản vận hành.' },
      'FPM-04': { courses: ['course_04'], activity: 'Xây dựng mô hình chiết khấu dòng tiền DCF (NPV, IRR) thẩm định dự án đầu tư CAPEX.' },
      'FPM-05': { courses: ['course_06'], activity: 'Thiết lập ma trận linh hoạt chi phí (Cost Flexing) ứng phó khi công suất phòng sụt giảm.' },
      'BPA-01': { courses: ['course_06'], activity: 'Phân tích Flow-Through & Flex của từng Outlet và tư vấn giải pháp phục hồi biên GOP.' },
      'BPA-02': { courses: ['course_07'], activity: 'Phân tích báo cáo STR Index và tính toán Net ADR sau khi trừ hoa hồng kênh OTA.' },
      'BPA-03': { courses: ['course_06'], activity: 'Tính toán chỉ số năng suất lao động HPOR buồng phòng và kiểm soát giờ làm thêm.' },
      'LPM-01': { courses: ['course_08'], activity: 'Tổ chức các buổi họp nhóm chia sẻ nghiệp vụ và duy trì gắn kết đội ngũ kế toán.' },
      'SBP-02': { courses: ['course_09'], activity: 'Tham gia tương tác trực tiếp giải quyết kịch bản khủng hoảng với GM trên Simulator.' },
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
      };

      return {
        id: `idp_gen_${idx}_${Date.now()}`,
        competencyId: item.code,
        priority: (item.gap >= 2 ? 'High' : item.gap === 1 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
        targetDate: new Date(Date.now() + (idx + 1) * 35 * 86400000).toISOString().split('T')[0],
        recommendedCourseIds: mapping.courses,
        practicalActivity: mapping.activity,
        status: 'Not Started' as const,
        mentorNotes: `Khoảng trống năng lực hiện tại: ${item.gap} cấp độ. Cần ưu tiên bồi dưỡng.`,
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

function requireImportAdmin(req: express.Request, res: express.Response): User | null {
  const actorId =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    req.body?.actorId;
  if (!actorId) {
    res.status(401).json({ error: 'Authentication required for Data Import Center.' });
    return null;
  }
  const actor = db.users.find((u) => u.id === actorId);
  if (!actor) {
    res.status(401).json({ error: 'Invalid user session.' });
    return null;
  }
  if (actor.role !== 'super_admin' && actor.role !== 'lnd_manager') {
    res.status(403).json({
      error: 'Access Denied: Only Super Administrator and authorized L&D Managers can access Data Import Center.',
    });
    return null;
  }
  return actor;
}

function decodeBase64Workbook(rawBase64: string): Buffer {
  const cleaned = String(rawBase64 || '').replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(cleaned, 'base64');
}

app.get('/api/import/status', async (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;

  const firebaseConfig = loadFirebaseConfigJson();
  const adminStatus = await getAuthorizedAdminFirestore();
  const demoStore = loadDemoCurriculumStore();

  const demoCounts: Record<string, number> = {};
  for (const spec of IMPORT_ORDER_SPEC) {
    demoCounts[spec.collectionName] = Object.keys(demoStore.collections[spec.collectionName] || {}).length;
  }

  let adminCounts: Record<string, number> | null = null;
  if (adminStatus.available && adminStatus.db) {
    adminCounts = {};
    for (const spec of IMPORT_ORDER_SPEC) {
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
    demoCounts,
    adminCounts,
    recentDemoLogs: demoStore.importLogs.slice(0, 15),
  });
});

app.get('/api/import/template', (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;

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
      fileName = 'FC_Learning_Academy_Training_Dataset_2027.xlsx',
      fileBase64,
      selectedSheets,
      existingIdsByCollection,
      targetMode = 'auto',
    } = req.body || {};

    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ error: 'Excel file content (fileBase64) is required.' });
    }

    const buffer = decodeBase64Workbook(fileBase64);
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
    });

    return res.json({
      success: true,
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

app.post('/api/import/execute', async (req, res) => {
  const actor = requireImportAdmin(req, res);
  if (!actor) return;

  const startedAt = new Date().toISOString();

  try {
    const {
      fileName = 'FC_Learning_Academy_Training_Dataset_2027.xlsx',
      fileBase64,
      selectedSheets,
      duplicateStrategy = 'skip',
      mode = 'auto',
      allowPartialOnErrors = false,
    } = req.body || {};

    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ error: 'Excel file content (fileBase64) is required.' });
    }
    if (!['skip', 'update', 'reject'].includes(duplicateStrategy)) {
      return res.status(400).json({ error: 'duplicateStrategy must be skip, update, or reject.' });
    }

    const buffer = decodeBase64Workbook(fileBase64);
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

    // Gather existing IDs for duplicate resolution
    const existingIdsByCollection: Record<string, string[]> = {};
    const demoStore = useFirebaseAdmin ? null : loadDemoCurriculumStore();

    if (useFirebaseAdmin && adminStatus.db) {
      for (const spec of IMPORT_ORDER_SPEC) {
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

    for (const spec of IMPORT_ORDER_SPEC) {
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
          if (duplicateStrategy === 'skip') {
            sheetSkipped++;
            skippedCount++;
          } else if (duplicateStrategy === 'reject') {
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
            batch.set(ref, item.record, { merge: item.mode === 'update' });
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
            // Isolate individual failures within chunk
            for (const item of chunk) {
              try {
                await adminStatus.db
                  .collection(spec.collectionName)
                  .doc(String(item.record.id))
                  .set(item.record, { merge: item.mode === 'update' });
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

    // Post-import verification
    let verification;
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
      fileName: String(fileName),
      performedByUid: actor.id,
      performedByEmail: actor.email,
      performedByName: actor.name,
      performedByRole: actor.role,
      duplicateStrategy: duplicateStrategy as DuplicateStrategy,
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
    } else if (demoStore) {
      demoStore.importLogs.unshift(logEntry);
      if (demoStore.importLogs.length > 50) {
        demoStore.importLogs = demoStore.importLogs.slice(0, 50);
      }
      saveDemoCurriculumStore(demoStore);
    }

    recordAudit(
      useFirebaseAdmin ? 'DATA_IMPORT_FIRESTORE' : 'DATA_IMPORT_DEMO',
      `${actor.name} (${actor.role})`,
      String(fileName),
      `Strategy: ${duplicateStrategy} | Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`
    );
    persistDB(db);

    return res.json({
      success: true,
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
    const { source = 'demo_local', collectionsSnapshot } = req.body || {};

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
  if (['super_admin', 'lnd_manager', 'general_manager'].includes(actor.role)) return true;
  if (actor.role === 'financial_controller') {
    const emp = db.users.find((u) => u.id === employeeId);
    if (!emp) return false;
    return emp.supervisorId === actor.id || emp.property === actor.property;
  }
  return false;
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
  if (actor.role !== 'super_admin' && actor.role !== 'lnd_manager') {
    return res.status(403).json({
      error: 'Access Denied: Only Super Administrator or L&D Manager can modify competency weights, criticality, or readiness thresholds.',
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
    if (actor.role === 'learner' && existing.employeeId !== actor.id) {
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
    if (actor.role === 'learner' || actor.id === existing.employeeId) {
      return res.status(403).json({
        error: 'Learners/employees cannot approve or reject their own competency assessment.',
      });
    }
    if (!['financial_controller', 'lnd_manager', 'super_admin', 'general_manager'].includes(actor.role)) {
      return res.status(403).json({ error: 'Insufficient permissions to approve/reject assessments.' });
    }
  } else if (actor.role === 'learner' && actor.id !== existing.employeeId) {
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

  if (actor.role === 'learner' && actor.id !== employeeId) {
    return res.status(403).json({ error: 'Cannot create development activities for another employee.' });
  }
  if (
    body.sourceType === 'custom_lnd' &&
    !['super_admin', 'lnd_manager', 'financial_controller'].includes(actor.role)
  ) {
    return res.status(403).json({ error: 'Only L&D Manager, Super Admin, or FC can create custom mapped activities.' });
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

  // Learners CANNOT validate/approve their own activities
  if (validationStatus && ['approved', 'revision_requested'].includes(validationStatus)) {
    if (actor.role === 'learner' || actor.id === existing.employeeId) {
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
    if (actor.role === 'learner' || actor.id === existing.employeeId) {
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
  if (approvalOrCloseStatuses.includes(targetStatus)) {
    if (actor.role === 'learner' || actor.id === existing.employeeId) {
      return res.status(403).json({
        error: 'Access Denied: Employees cannot approve or close their own Individual Development Plan.',
      });
    }
    if (targetStatus === 'lnd_approved' && !['lnd_manager', 'super_admin'].includes(actor.role)) {
      return res.status(403).json({
        error: 'Only L&D Manager or Super Administrator can grant L&D Approval.',
      });
    }
    if (!['financial_controller', 'lnd_manager', 'super_admin', 'general_manager'].includes(actor.role)) {
      return res.status(403).json({ error: 'Insufficient role for IDP approval transition.' });
    }
  } else if (actor.role === 'learner' && actor.id !== existing.employeeId) {
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
    if (metrics.completionPct < 100 && actor.role === 'learner') {
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
  if (actor.role === 'learner' && actor.id !== idp.employeeId) {
    return res.status(403).json({ error: 'Cannot update another employee IDP.' });
  }

  const objIdx = idp.objectives.findIndex((o) => o.id === objId);
  if (objIdx < 0) return res.status(404).json({ error: 'Objective not found in IDP.' });

  const existingObj = idp.objectives[objIdx];
  const { status, progressPercent, evidenceNotes, evidenceFileName, supervisorValidationStatus } = req.body || {};

  if (supervisorValidationStatus && ['approved', 'revision_requested'].includes(supervisorValidationStatus)) {
    if (actor.role === 'learner' || actor.id === idp.employeeId) {
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

  if (!['financial_controller', 'lnd_manager', 'super_admin', 'general_manager'].includes(actor.role)) {
    return res.status(403).json({
      error: 'Only Financial Controller, L&D Manager, GM, or Super Admin can submit validated competency reassessments.',
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
  if (!['financial_controller', 'lnd_manager', 'super_admin', 'general_manager'].includes(actor.role)) {
    return res.status(403).json({ error: 'Only supervisors, L&D, GM, or Admins can submit career readiness reviews.' });
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
    employeeId: actor.role === 'learner' ? actor.id : filters.employeeId,
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
