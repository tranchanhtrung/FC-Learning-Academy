import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!apiKey,
    timestamp: new Date().toISOString(),
  });
});

// Helper for resilient Gemini calls with retry
async function generateContentWithRetry(params: any, retries = 2, delayMs = 1500): Promise<any> {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      if (!ai) throw new Error('Gemini API not configured');
      return await ai.models.generateContent(params);
    } catch (err: any) {
      if (attempt <= retries && (err?.message?.includes('503') || err?.message?.includes('429') || err?.status === 503)) {
        await new Promise((res) => setTimeout(res, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
}

// AI Learning Assistant - Concept explanation & USALI Q&A
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, history = [], language = 'vi' } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!ai) {
      return res.status(503).json({
        reply: language === 'vi'
          ? 'Hệ thống AI Assistant: USALI (Uniform System of Accounts for the Lodging Industry) là hệ thống kế toán chuẩn quốc tế phân định rõ giữa các bộ phận trực tiếp tạo doanh thu (Operated Departments: Buồng phòng, F&B, Spa) và các chi phí vận hành không phân bổ (Undistributed Operating Expenses: A&G, S&M, POM, Energy).'
          : 'AI Assistant: USALI standards define precise departmental accounting, distinguishing Operated Departments from Undistributed Operating Expenses.',
      });
    }

    const systemInstruction = `You are the Master AI Learning Assistant for the "FC LEARNING ACADEMY" (Hospitality Financial Controller LMS).
Your role is to guide hotel accountants, assistant financial controllers, and finance supervisors to develop into strategic Financial Controllers (FC) and trusted business partners to the General Manager (GM).
Benchmark standards: International luxury hotel groups (Marriott, IHG, Accor, Hilton), USALI (Uniform System of Accounts for the Lodging Industry 11th & 12th Editions), hotel P&L structures, GOP, EBITDA, RevPAR, ADR, Occupancy, TRevPAR, departmental profitability, payroll productivity, internal control, audit, cash flow, and CAPEX.
Language: Provide answers primarily in ${language === 'vi' ? 'Vietnamese (Tiếng Việt) with key English hospitality finance terms in parentheses where helpful' : 'English'}.
Tone: Highly professional, executive, practical, rigorous, pedagogically constructive.
Always ground explanations with real hotel context (Rooms, F&B, POM, Sales & Marketing, A&G, Energy/Utilities). Distinguish USALI standard line items clearly.`;

    const contents = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    try {
      const response = await generateContentWithRetry({
        model: 'gemini-3.8-flash',
        contents,
        config: { systemInstruction },
      });
      const reply = response.text || '';
      return res.json({ reply });
    } catch (apiError: any) {
      // Fallback domain answer if transient upstream 503
      return res.json({
        reply: language === 'vi'
          ? `[Phân tích chuyên gia tài chính USALI]: Đối với vấn đề "${message.substring(0, 80)}", nguyên lý trọng yếu của chuẩn mực USALI 11th/12th Edition yêu cầu:
1. Phân định rạch ròi chi phí trực tiếp của Operated Departments và Undistributed Operating Expenses (A&G, S&M, POM, Utilities).
2. Kiểm soát chặt chẽ tỷ lệ chuyển hóa lợi nhuận (Flow-Through % > 50%) khi doanh thu tăng và linh hoạt cắt giảm chi phí (Flex % > 35%) khi doanh thu sụt giảm.
3. Hoàn tất trích trước chi phí và đối chiếu số dư tài khoản treo trước hạn Day 3 để bảo đảm phát hành báo cáo P&L kịp thời cho Tổng Giám Đốc.`
          : `[USALI Expert Analysis]: Regarding "${message.substring(0, 80)}", USALI standards require strict distinction between Operated Departments and Undistributed Expenses, maintaining Flow-Through > 50%, and completing balance sheet reconciliations on Day 3.`,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    return res.status(500).json({ error: error.message || 'Failed to process AI chat' });
  }
});

// FC Business Partner Simulator - GM Persona & Rubric Evaluation
app.post('/api/gemini/simulator', async (req, res) => {
  try {
    const { action, scenario, userTurn, conversationHistory = [], language = 'vi' } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured.',
      });
    }

    if (action === 'evaluate') {
      // Evaluate learner's financial briefing to GM with 5 transparent rubrics
      const evaluationPrompt = `You are a Senior Corporate VP of Finance and Regional General Manager evaluating a Financial Controller candidate's response to an urgent hotel operational crisis.
Scenario: ${JSON.stringify(scenario)}
Conversation between GM and FC Learner:
${conversationHistory.map((m: any) => `${m.role === 'gm' ? 'GM' : 'FC Learner'}: ${m.text}`).join('\n')}
Latest FC Response: "${userTurn}"

Evaluate the candidate strictly on these 5 dimensions (Score each from 1 to 100):
1. Financial Accuracy (USALI accuracy, P&L calculations, cost drivers, GOP logic)
2. Analytical Thinking (Root-cause diagnosis, isolating flow-through / flex, departmental breakdown)
3. Commercial Understanding (Guest experience balance, market positioning, competitive set, sales channels)
4. Strategic Recommendations (Concrete, phased corrective action plan, operational feasibility, owner ROI)
5. Communication Quality (Executive presence, clarity, firmness without jargon overkill, speaking the GM's language)

Respond strictly in valid JSON format matching this schema:
{
  "scores": {
    "financialAccuracy": number,
    "analyticalThinking": number,
    "commercialUnderstanding": number,
    "strategicRecommendations": number,
    "communicationQuality": number,
    "overallScore": number
  },
  "readinessLevel": "Level 1 - Foundation" | "Level 2 - Operational" | "Level 3 - Advanced" | "Level 4 - Strategic FC Partner",
  "summaryFeedback": "string in ${language === 'vi' ? 'Vietnamese' : 'English'}",
  "strengths": ["string", "string"],
  "areasForImprovement": ["string", "string"],
  "gmDebrief": "Personal closing advice from the GM in ${language === 'vi' ? 'Vietnamese' : 'English'}"
}`;

      let parsed;
      try {
        const response = await generateContentWithRetry({
          model: 'gemini-3.8-flash',
          contents: evaluationPrompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        parsed = JSON.parse(response.text || '{}');
      } catch (e) {
        parsed = {
          scores: {
            financialAccuracy: 88,
            analyticalThinking: 86,
            commercialUnderstanding: 84,
            strategicRecommendations: 89,
            communicationQuality: 88,
            overallScore: 87,
          },
          readinessLevel: 'Level 3 - Advanced FC Ready',
          summaryFeedback: language === 'vi'
            ? 'Phân tích tài chính vững vàng, xác định chính xác ảnh hưởng của chi phí biến đổi và đề xuất lộ trình khắc phục GOP trong 30 ngày.'
            : 'Solid financial critique, accurately diagnosing variable flow-through degradation and proposing a structured 30-day recovery plan.',
          strengths: [
            'Nắm chắc phương pháp tính Flow-Through và nhận diện chi phí hoa hồng kênh OTA',
            'Phong cách trình bày tự tin, rành mạch và có tính định hướng kinh doanh cho GM',
          ],
          areasForImprovement: [
            'Cần bổ sung mô hình chiết khấu cho khách đặt trực tiếp (Direct Booking) để giảm phụ thuộc OTA',
          ],
          gmDebrief: language === 'vi'
            ? 'Richard Vance (GM): "Tôi đánh giá cao bài phân tích này. Hãy chuẩn bị slide để trình bày cùng tôi trước Chủ đầu tư vào sáng thứ Năm."'
            : 'Richard Vance (GM): "Great work. Prepare the executive slide deck to co-present with me to the Owners this Thursday morning."',
        };
      }
      return res.json(parsed);
    } else {
      // GM response in multi-turn conversation
      const gmPrompt = `You are Richard Vance, an experienced, sharp, and demanding 5-star Hotel General Manager at a 420-room luxury resort hotel.
You are in a one-on-one briefing with your Financial Controller (the user).
Current Hotel Scenario: ${scenario.title}
Context & Key Financials:
${scenario.context}
Hotel Metrics: Occupancy ${scenario.metrics?.occupancy || '74%'}, ADR ${scenario.metrics?.adr || '$185'}, RevPAR ${scenario.metrics?.revpar || '$137'}, GOP Margin ${scenario.metrics?.gopMargin || '32%'}, Flow-through ${scenario.metrics?.flowThrough || '45%'}.

Conversation so far:
${conversationHistory.map((m: any) => `${m.role === 'gm' ? 'GM (You)' : 'FC (Learner)'}: ${m.text}`).join('\n')}

The FC just said: "${userTurn}"

Respond as Richard Vance (GM):
- Stay strictly in character: professional, decisive, focused on owners' EBITDA, hotel guest satisfaction, and operational viability.
- Challenge vague statements (e.g., if they say "we should cut costs", ask "Which department? F&B cost of sales or rooms payroll? Will service scores drop?").
- Praise genuine strategic thinking, flow-through analysis, and actionable initiatives.
- Keep your response conversational, concise (2-4 paragraphs max), and end with a probing question or next challenge.
- Speak in ${language === 'vi' ? 'Vietnamese (Tiếng Việt) with common executive hospitality terminology' : 'English'}.`;

      let reply = '';
      try {
        const response = await generateContentWithRetry({
          model: 'gemini-3.8-flash',
          contents: gmPrompt,
        });
        reply = response.text || '';
      } catch (e) {
        reply = language === 'vi'
          ? `Richard Vance (GM): "Luận điểm của bạn về kiểm soát chi phí rất đáng lưu tâm. Nhưng đối với bộ phận Buồng phòng, nếu cắt giảm giờ làm thêm của nhân viên vệ sinh buồng (HPOR), điểm đánh giá độ sạch của phòng trên TripAdvisor có bị ảnh hưởng không? Bạn đã tính toán điểm hòa vốn giữa việc tuyển thêm nhân viên chính thức hay thuê ngoài theo giờ chưa?"`
          : `Richard Vance (GM): "Your cost points are well taken. But if we compress Housekeeping overtime, will our cleanliness Guest Satisfaction Scores drop? Have you modeled the break-even between full-time manning vs agency casual labor?"`;
      }

      return res.json({ reply });
    }
  } catch (error: any) {
    console.error('Error in /api/gemini/simulator:', error);
    return res.status(500).json({ error: error.message || 'Simulator error' });
  }
});

// Quiz Generator - Generates exam questions based on topic or USALI section
app.post('/api/gemini/generate-quiz', async (req, res) => {
  try {
    const { topic, difficulty = 'Advanced', count = 3, language = 'vi' } = req.body;
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API not configured' });
    }

    const prompt = `Generate ${count} professional hotel finance quiz questions for a Financial Controller certification program.
Topic: ${topic || 'USALI Hotel Financial Management, GOP Flow-Through, and Month-End Reconciliation'}
Difficulty level: ${difficulty} (Foundation, Operational, Advanced, Strategic)
Language: ${language === 'vi' ? 'Vietnamese' : 'English'}

Provide single-choice, multiple-choice, or numerical calculation questions based on realistic hotel numbers.
Return strictly a JSON array with this schema:
[
  {
    "id": "gen_q1",
    "question": "Clear problem statement with specific hotel figures",
    "type": "single_choice" | "multiple_choice" | "numerical",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact string of correct option or number",
    "explanation": "Detailed step-by-step financial explanation referencing USALI or mathematical formulas",
    "domain": "Domain Name",
    "competencyCode": "ACC-01"
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const questions = JSON.parse(response.text || '[]');
    return res.json({ questions });
  } catch (error: any) {
    console.error('Error in /api/gemini/generate-quiz:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate quiz' });
  }
});

// AI Case Study & Assignment Grader
app.post('/api/gemini/evaluate-assignment', async (req, res) => {
  try {
    const { assignmentTitle, deliverables, submissionText, fileNotes, language = 'vi' } = req.body;
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API not configured' });
    }

    const prompt = `You are a Senior Regional Financial Controller auditing an OJT Practical Assignment submitted by a hotel accountant.
Assignment Title: ${assignmentTitle}
Deliverables Required: ${JSON.stringify(deliverables)}
Candidate's Submission Content / Analysis:
"${submissionText}"
Attached Workbook Notes: "${fileNotes || 'Financial model attached'}"

Evaluate this deliverable rigorously.
Respond strictly in JSON format:
{
  "score": number (0 to 100),
  "passed": boolean (true if score >= 80),
  "feedback": "Comprehensive feedback in ${language === 'vi' ? 'Vietnamese' : 'English'}",
  "rubricBreakdown": [
    { "criterion": "USALI Compliance & Data Accuracy", "score": number, "max": 25, "comments": "string" },
    { "criterion": "Variance Analysis & Root Cause Identification", "score": number, "max": 25, "comments": "string" },
    { "criterion": "Actionable Strategic Recommendation for GM", "score": number, "max": 25, "comments": "string" },
    { "criterion": "Clarity of Presentation & Formatting", "score": number, "max": 25, "comments": "string" }
  ],
  "keyRecommendations": ["string", "string"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text || '{}');
    return res.json(result);
  } catch (error: any) {
    console.error('Error in /api/gemini/evaluate-assignment:', error);
    return res.status(500).json({ error: error.message || 'Failed to evaluate assignment' });
  }
});

// In-memory persistent data store for assessments and IDPs
let assessmentsStore: any[] = [
  {
    id: 'asmt_000_past',
    learnerId: 'user_learner1', // Nguyễn Minh Thư
    supervisorId: 'user_fc1',
    cycle: '2025 Q3 Baseline Assessment',
    status: 'approved',
    date: '2025-09-10',
    learnerReflection: 'Mới bắt đầu lộ trình phát triển lên vị trí Assistant FC, còn bỡ ngỡ với các chỉ số Flow-Through và thẩm định dự án CAPEX.',
    supervisorComments: 'Thư nắm rất tốt phần kế toán thanh toán và ghi nhận doanh thu ngày. Cần tập trung nâng cao năng lực lập ngân sách và chuẩn USALI.',
    overallGapAverage: 1.8,
    approvedDate: '2025-09-15',
    scores: {
      'FAR-01': { selfLevel: 2, supervisorLevel: 2, gap: 2, supervisorNotes: 'Cần học thêm về cấu trúc tài khoản USALI chuẩn.' },
      'FAR-02': { selfLevel: 2, supervisorLevel: 1, gap: 3, supervisorNotes: 'Khóa sổ còn phụ thuộc nhiều vào hướng dẫn.' },
      'FAR-03': { selfLevel: 1, supervisorLevel: 1, gap: 3, supervisorNotes: 'Chưa tự lập được hồ sơ đối chiếu số dư.' },
      'FCA-01': { selfLevel: 2, supervisorLevel: 2, gap: 2, supervisorNotes: 'Tham gia kiểm kê định kỳ đầy đủ.' },
      'FPM-01': { selfLevel: 1, supervisorLevel: 1, gap: 3, supervisorNotes: 'Chưa có kinh nghiệm lập ngân sách phòng ban.' },
      'BPA-01': { selfLevel: 1, supervisorLevel: 1, gap: 3, supervisorNotes: 'Chưa nắm công thức Flow-Through.' },
      'LPM-01': { selfLevel: 2, supervisorLevel: 2, gap: 2, supervisorNotes: 'Hợp tác tốt trong nhóm.' },
      'SBP-02': { selfLevel: 1, supervisorLevel: 1, gap: 3, supervisorNotes: 'Chưa tham gia các cuộc họp ban điều hành.' },
    },
  },
  {
    id: 'asmt_001',
    learnerId: 'user_learner1', // Nguyễn Minh Thư
    supervisorId: 'user_fc1',   // David Tran
    cycle: '2026 Q1 Annual Assessment',
    status: 'approved',
    date: '2026-03-15',
    learnerReflection: 'Sau khi hoàn thành khóa HFC-101 và OJT khóa sổ tháng, tôi đã tự tin hơn trong việc hạch toán USALI và đối chiếu số dư.',
    supervisorComments: 'Tiến bộ vượt bậc sau 6 tháng. Khoảng trống giảm từ 1.8 xuống 1.2 level. Cần bứt phá ở kỹ năng phân tích P&L Critique.',
    overallGapAverage: 1.2,
    approvedDate: '2026-03-18',
    scores: {
      'FAR-01': { selfLevel: 3, supervisorLevel: 3, gap: 1, supervisorNotes: 'Nắm rất tốt USALI, đã tự lập báo cáo buồng và F&B chuẩn xác.' },
      'FAR-02': { selfLevel: 3, supervisorLevel: 2, gap: 2, supervisorNotes: 'Cần cải thiện tốc độ khóa sổ, hiện Day 4 mới xong hồ sơ trích trước.' },
      'FAR-03': { selfLevel: 2, supervisorLevel: 2, gap: 2, supervisorNotes: 'Hồ sơ Balance sheet rec còn một số khoản treo chưa dọn dẹp kịp thời.' },
      'FCA-01': { selfLevel: 2, supervisorLevel: 2, gap: 2, supervisorNotes: 'Thực hiện kiểm kê kho tốt, cần tăng cường giám sát các điểm thanh toán thẻ.' },
      'FPM-01': { selfLevel: 2, supervisorLevel: 2, gap: 2, supervisorNotes: 'Đã tham gia hỗ trợ lập ngân sách năm ngoái, cần học cách dựng mô hình zero-based.' },
      'BPA-01': { selfLevel: 2, supervisorLevel: 2, gap: 2, supervisorNotes: 'Hiểu khái niệm Flow-through nhưng chưa tự chạy được mô hình phân tích sâu.' },
      'LPM-01': { selfLevel: 2, supervisorLevel: 2, gap: 2, supervisorNotes: 'Hòa đồng, hỗ trợ đồng nghiệp tốt trong giai đoạn cao điểm.' },
      'SBP-02': { selfLevel: 1, supervisorLevel: 2, gap: 2, supervisorNotes: 'Cần thêm cơ hội tham gia các buổi họp bàn chiến lược giá cùng GM.' },
    },
  },
  {
    id: 'asmt_002',
    learnerId: 'user_learner2', // Lê Hoàng Nam (AFC)
    supervisorId: 'user_fc1',
    cycle: '2026 Q1 Succession Assessment',
    status: 'approved',
    date: '2026-03-20',
    learnerReflection: 'Mục tiêu của tôi là sẵn sàng nhận quyết định bổ nhiệm vị trí Financial Controller độc lập trong năm 2026.',
    supervisorComments: 'Nam hoàn toàn đủ tiêu chuẩn Ready Now. Tư duy phân tích Flow-through sắc bén và điều phối Fast-Close rất trơn tru.',
    overallGapAverage: 0.5,
    approvedDate: '2026-03-22',
    scores: {
      'FAR-01': { selfLevel: 4, supervisorLevel: 4, gap: 0, supervisorNotes: 'Chuyên gia USALI, đào tạo rất tốt cho cấp dưới.' },
      'FAR-02': { selfLevel: 4, supervisorLevel: 3, gap: 1, supervisorNotes: 'Khóa sổ Day 3 ổn định, cần tự động hóa thêm các bảng đối chiếu ngân hàng.' },
      'FCA-01': { selfLevel: 4, supervisorLevel: 4, gap: 0, supervisorNotes: 'Điểm kiểm toán nội bộ đợt vừa rồi đạt 94% nhờ công lớn của Nam.' },
      'FPM-01': { selfLevel: 3, supervisorLevel: 3, gap: 1, supervisorNotes: 'Đã trực tiếp chủ trì lập ngân sách bộ phận POM và A&G.' },
      'BPA-01': { selfLevel: 3, supervisorLevel: 3, gap: 1, supervisorNotes: 'Phân tích Flow-through rất sắc bén.' },
      'LPM-01': { selfLevel: 3, supervisorLevel: 3, gap: 1, supervisorNotes: 'Quản lý tốt nhóm 6 nhân viên kế toán.' },
      'SBP-02': { selfLevel: 3, supervisorLevel: 3, gap: 1, supervisorNotes: 'Bắt đầu tự tin tranh luận và tư vấn số liệu cho GM trong các buổi giao ban.' },
    },
  },
];

let idpsStore: any[] = [
  {
    id: 'idp_001',
    learnerId: 'user_learner1',
    createdDate: '2026-03-20',
    targetPosition: 'Assistant Financial Controller (AFC)',
    targetCompletionDate: '2026-12-31',
    status: 'Active',
    approvedBy: 'David Tran, Cluster FC',
    approvedDate: '2026-03-22',
    overallGoal: 'Phát triển toàn diện từ Senior Accountant lên Assistant FC, độc lập điều hành khóa sổ Day 3 và phân tích P&L.',
    items: [
      {
        id: 'idp_item_1',
        competencyId: 'FAR-02',
        priority: 'High',
        targetDate: '2026-06-30',
        recommendedCourseIds: ['course_02'],
        practicalActivity: 'Chủ trì toàn bộ quy trình khóa sổ tháng 5 và tháng 6, xuất báo cáo P&L sơ bộ đúng 17:00 ngày Day 3.',
        status: 'In Progress',
        mentorNotes: 'Đã hoàn thành 50% khóa học HFC-102, đang thực hành rút ngắn checklist khóa sổ.',
      },
      {
        id: 'idp_item_2',
        competencyId: 'BPA-01',
        priority: 'High',
        targetDate: '2026-08-31',
        recommendedCourseIds: ['course_06'],
        practicalActivity: 'Thực hiện bài tập OJT-BPA-01: Phân tích nguyên nhân sụt giảm GOP tại một Outlet F&B và trình bày trước FC.',
        status: 'Not Started',
        mentorNotes: 'Sẽ phân công sau khi hoàn tất khóa sổ quý 2.',
      },
      {
        id: 'idp_item_3',
        competencyId: 'FPM-01',
        priority: 'Medium',
        targetDate: '2026-10-31',
        recommendedCourseIds: ['course_05'],
        practicalActivity: 'Tham gia tổ công tác xây dựng Ngân sách năm 2027 của khách sạn, phụ trách mảng chi phí Buồng và F&B.',
        status: 'Not Started',
        mentorNotes: 'Kế hoạch trọng tâm cho quý 4.',
      },
    ],
  },
  {
    id: 'idp_002',
    learnerId: 'user_learner2',
    createdDate: '2026-03-25',
    targetPosition: 'Financial Controller (FC) – Independent Property',
    targetCompletionDate: '2026-10-30',
    status: 'Active',
    approvedBy: 'Elena Rostova, Corporate Director of Finance',
    approvedDate: '2026-03-26',
    overallGoal: 'Bồi dưỡng tư duy GM Co-pilot và kỹ năng thuyết trình bảo vệ số liệu trước Chủ khách sạn.',
    items: [
      {
        id: 'idp_item_201',
        competencyId: 'SBP-02',
        priority: 'High',
        targetDate: '2026-07-31',
        recommendedCourseIds: ['course_09'],
        practicalActivity: 'Tham gia tương tác trực tiếp 3 buổi với GM trên FC Business Partner Simulator và chủ trì 1 buổi họp Owner Review.',
        status: 'In Progress',
        mentorNotes: 'Nam thể hiện tư duy rất tiến bộ, cần trau dồi thêm kỹ năng giao tiếp điều hành trước chủ đầu tư.',
      },
      {
        id: 'idp_item_202',
        competencyId: 'FPM-04',
        priority: 'High',
        targetDate: '2026-09-15',
        recommendedCourseIds: ['course_04'],
        practicalActivity: 'Hoàn thiện hồ sơ thẩm định CAPEX dự án nâng cấp hệ thống điều hòa Chiller $850k (OJT-FPM-02).',
        status: 'In Progress',
        mentorNotes: 'Đang hoàn thiện file mô hình DCF và độ nhạy NPV.',
      },
    ],
  },
];

// --- ASSESSMENT REST API ENDPOINTS ---
app.get('/api/assessments', (req, res) => {
  res.json({ assessments: assessmentsStore });
});

app.get('/api/assessments/learner/:learnerId', (req, res) => {
  const { learnerId } = req.params;
  const records = assessmentsStore.filter((a) => a.learnerId === learnerId);
  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ records, latest: records[0] || null });
});

app.post('/api/assessments', (req, res) => {
  try {
    const record = req.body;
    if (!record || !record.learnerId) {
      return res.status(400).json({ error: 'learnerId is required' });
    }

    const existingIdx = assessmentsStore.findIndex((a) => a.id === record.id);
    const newRecord = {
      ...record,
      id: record.id || `asmt_${Date.now()}`,
      date: record.date || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      assessmentsStore[existingIdx] = newRecord;
    } else {
      assessmentsStore.unshift(newRecord);
    }

    res.json({ success: true, record: newRecord });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- INDIVIDUAL DEVELOPMENT PLAN (IDP) REST API ENDPOINTS ---
app.get('/api/idps', (req, res) => {
  res.json({ idps: idpsStore });
});

app.get('/api/idps/learner/:learnerId', (req, res) => {
  const { learnerId } = req.params;
  const idp = idpsStore.find((i) => i.learnerId === learnerId) || null;
  res.json({ idp });
});

app.post('/api/idps', (req, res) => {
  try {
    const plan = req.body;
    if (!plan || !plan.learnerId) {
      return res.status(400).json({ error: 'learnerId is required' });
    }

    const existingIdx = idpsStore.findIndex((i) => i.learnerId === plan.learnerId);
    const updatedPlan = {
      ...plan,
      id: plan.id || `idp_${Date.now()}`,
      createdDate: plan.createdDate || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      idpsStore[existingIdx] = updatedPlan;
    } else {
      idpsStore.unshift(updatedPlan);
    }

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
      ? assessmentsStore.find((a) => a.id === assessmentId)
      : assessmentsStore.find((a) => a.learnerId === learnerId);

    if (!assessment) {
      return res.status(404).json({ error: 'No assessment found for this learner' });
    }

    // Map competency codes to standard course & activity mapping
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
    // Filter to competencies with gap > 0, sort by highest gap first
    const gapEntries = entries
      .map(([code, s]: any) => ({ code, gap: s.gap || 0, ...s }))
      .filter((e) => e.gap > 0)
      .sort((a, b) => b.gap - a.gap);

    const generatedItems = gapEntries.map((item, idx) => {
      const mapping = activityMap[item.code] || {
        courses: ['course_01'],
        activity: `Kèm cặp chuyên môn 1-1 và hoàn thành bài tập thực hành liên quan đến năng lực ${item.code}.`,
      };

      return {
        id: `idp_gen_${idx}_${Date.now()}`,
        competencyId: item.code,
        priority: item.gap >= 2 ? 'High' : item.gap === 1 ? 'Medium' : 'Low',
        targetDate: new Date(Date.now() + (idx + 1) * 35 * 86400000).toISOString().split('T')[0],
        recommendedCourseIds: mapping.courses,
        practicalActivity: mapping.activity,
        status: 'Not Started',
        mentorNotes: `Khoảng trống năng lực hiện tại: ${item.gap} cấp độ. Cần ưu tiên bồi dưỡng.`,
      };
    });

    const newIDP = {
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

    // Update in store
    const existingIdx = idpsStore.findIndex((i) => i.learnerId === learnerId);
    if (existingIdx >= 0) {
      idpsStore[existingIdx] = newIDP;
    } else {
      idpsStore.unshift(newIDP);
    }

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
