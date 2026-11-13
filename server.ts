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
} from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

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
}

const DATA_DIR = path.join(__dirname, '.data');
const DB_FILE = path.join(DATA_DIR, 'academy-db.json');

function getSeedDB(): AcademyDB {
  return {
    users: JSON.parse(JSON.stringify(INITIAL_USERS)),
    competencies: JSON.parse(JSON.stringify(COMPETENCIES)),
    enrollments: JSON.parse(JSON.stringify(DEFAULT_ENROLLMENTS)),
    quizAttempts: JSON.parse(JSON.stringify(DEFAULT_QUIZ_ATTEMPTS)),
    submissions: JSON.parse(JSON.stringify(DEFAULT_SUBMISSIONS)),
    assessments: JSON.parse(JSON.stringify(INITIAL_ASSESSMENT_RECORDS)),
    idps: JSON.parse(JSON.stringify(INITIAL_IDPS)),
    certificates: JSON.parse(JSON.stringify(INITIAL_CERTIFICATES)),
    auditLogs: JSON.parse(JSON.stringify(DEFAULT_AUDIT_LOGS)),
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
        return {
          users: parsed.users,
          competencies: parsed.competencies || JSON.parse(JSON.stringify(COMPETENCIES)),
          enrollments: parsed.enrollments || [],
          quizAttempts: parsed.quizAttempts || [],
          submissions: parsed.submissions || [],
          assessments: parsed.assessments || [],
          idps: parsed.idps || [],
          certificates: parsed.certificates || [],
          auditLogs: parsed.auditLogs || JSON.parse(JSON.stringify(DEFAULT_AUDIT_LOGS)),
        };
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
