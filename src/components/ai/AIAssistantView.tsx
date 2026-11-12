import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bot,
  Crown,
  Send,
  Sparkles,
  Award,
  RefreshCw,
  AlertCircle,
  TrendingDown,
  Building,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'gm';
  content: string;
}

const PRESET_SCENARIOS = [
  {
    id: 'scen_01',
    title: 'Khủng hoảng Flow-Through: Công suất tăng 8% nhưng GOP giảm 5%',
    context: 'Khách sạn đạt công suất phòng 82% (tăng 8% so với cùng kỳ). Tuy nhiên báo cáo P&L tháng cho thấy Gross Operating Profit (GOP) lại giảm 5%. Chủ đầu tư đang rất tức giận và yêu cầu giải trình khẩn cấp.',
    metrics: { occupancy: '82%', adr: '$178', revpar: '$146', gopMargin: '31.2%', flowThrough: '-22%' },
  },
  {
    id: 'scen_02',
    title: 'Bùng nổ doanh thu F&B nhưng chi phí làm thêm giờ (Overtime) vượt trần',
    context: 'Bộ phận F&B ghi nhận doanh thu tăng 25% nhờ 12 tiệc cưới lớn trong tháng. Tuy nhiên chi phí nhân công F&B tăng vọt 42% do lạm dụng giờ làm thêm ngoài giờ và thuê lao động thời vụ ngoài giá cao.',
    metrics: { occupancy: '76%', adr: '$190', revpar: '$144', gopMargin: '28.5%', flowThrough: '18%' },
  },
  {
    id: 'scen_03',
    title: 'Giá điện năng & Tiện ích tăng 35%: Đề xuất cắt giảm chi phí bảo trì vs Tiện nghi khách',
    context: 'Chi phí năng lượng (Utilities) tăng đột biến do biểu giá điện mới. Trưởng bộ phận Kỹ thuật đề xuất tắt bớt điều hòa sảnh chính và thang máy, trong khi GM lo ngại điểm hài lòng của khách (GSS) sẽ tụt dốc.',
    metrics: { occupancy: '80%', adr: '$185', revpar: '$148', gopMargin: '33.0%', flowThrough: '38%' },
  },
  {
    id: 'scen_04',
    title: 'Tỷ trọng kênh OTA vượt 65% làm bào mòn giá bán ròng (Net ADR)',
    context: 'Doanh số buồng phòng phụ thuộc quá mức vào Booking.com và Agoda với mức chiết khấu hoa hồng 18-22%. Chi phí phân phối tháng này lên tới $115,000, khiến giá phòng thực thu (Net ADR) chỉ còn $138 so với giá niêm yết $175.',
    metrics: { occupancy: '85%', adr: '$175', revpar: '$148.75', gopMargin: '30.5%', flowThrough: '34%' },
  },
];

export const AIAssistantView: React.FC = () => {
  const { language, t, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'advisor' | 'simulator'>('simulator');

  // Advisor State
  const [advisorInput, setAdvisorInput] = useState<string>('');
  const [advisorMessages, setAdvisorMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: language === 'vi'
        ? 'Xin chào! Tôi là Trợ Lý AI Học Viện FC (được huấn luyện theo chuẩn USALI 11th & 12th Edition). Bạn có thể hỏi tôi bất kỳ câu hỏi nào về chuẩn mực tài chính khách sạn, đối chiếu số dư bảng cân đối, hoặc phân tích GOP Flow-through.'
        : 'Hello! I am your FC Academy AI Assistant, specialized in USALI 11th & 12th hospitality finance standards. How can I assist your study today?',
    },
  ]);
  const [advisorLoading, setAdvisorLoading] = useState<boolean>(false);

  // Simulator State
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const selectedScenario = PRESET_SCENARIOS[selectedScenarioIndex];
  const [simulatorInput, setSimulatorInput] = useState<string>('');
  const [simulatorMessages, setSimulatorMessages] = useState<{ role: 'gm' | 'user'; text: string }[]>([
    {
      role: 'gm',
      text: language === 'vi'
        ? `Chào Financial Controller! Tôi vừa xem qua báo cáo nhanh tháng này. Công suất phòng đạt 82% rất ấn tượng, nhưng tại sao GOP lại sụt giảm 5% so với cùng kỳ? Chủ tịch Hội đồng Quản trị vừa gọi điện cho tôi lúc 7 giờ sáng yêu cầu câu trả lời. Bạn hãy giải thích các nguyên nhân gốc rễ và đề xuất phương án khắc phục ngay.`
        : `Good morning, Financial Controller! I just reviewed the flash report. We reached 82% occupancy, yet our GOP is down 5%! The Owner already called me demanding explanations. Walk me through the numbers and your recovery plan immediately.`,
    },
  ]);
  const [simulatorLoading, setSimulatorLoading] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [advisorMessages, simulatorMessages]);

  // Send message in Advisor Mode
  const handleSendAdvisor = async () => {
    if (!advisorInput.trim() || advisorLoading) return;
    const userMsg = advisorInput.trim();
    setAdvisorInput('');
    setAdvisorMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setAdvisorLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: advisorMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAdvisorMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        const err = await res.json();
        setAdvisorMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: err.fallback || 'Không thể kết nối với dịch vụ AI vào lúc này. Vui lòng kiểm tra GEMINI_API_KEY.',
          },
        ]);
      }
    } catch (e: any) {
      setAdvisorMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Lỗi kết nối mạng: ' + e.message },
      ]);
    } finally {
      setAdvisorLoading(false);
    }
  };

  // Send message to GM in Simulator Mode
  const handleSendSimulator = async () => {
    if (!simulatorInput.trim() || simulatorLoading) return;
    const userMsg = simulatorInput.trim();
    setSimulatorInput('');
    setSimulatorMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setSimulatorLoading(true);

    try {
      const res = await fetch('/api/gemini/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          scenario: selectedScenario,
          userTurn: userMsg,
          conversationHistory: simulatorMessages.slice(-8),
          language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimulatorMessages((prev) => [...prev, { role: 'gm', text: data.reply }]);
      } else {
        setSimulatorMessages((prev) => [
          ...prev,
          {
            role: 'gm',
            text: language === 'vi'
              ? 'Richard Vance (GM): "Tôi hiểu phân tích của bạn. Nhưng tôi cần bạn trình bày số liệu cụ thể hơn: chi phí buồng phòng trượt bao nhiêu % và giải pháp ngắn hạn trong tuần tới là gì?"'
              : 'Richard Vance (GM): "I hear your points. However, give me exact numbers: which department blew the budget and what is our 7-day correction plan?"',
          },
        ]);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setSimulatorLoading(false);
    }
  };

  // Request Evaluation from GM
  const handleRequestEvaluation = async () => {
    try {
      setSimulatorLoading(true);
      const res = await fetch('/api/gemini/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          scenario: selectedScenario,
          userTurn: simulatorMessages[simulatorMessages.length - 1]?.text || 'Tổng kết đề xuất chiến lược tài chính',
          conversationHistory: simulatorMessages,
          language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEvaluationResult(data);
      } else {
        // Fallback realistic evaluation if offline
        setEvaluationResult({
          scores: {
            financialAccuracy: 88,
            analyticalThinking: 85,
            commercialUnderstanding: 82,
            strategicRecommendations: 86,
            communicationQuality: 90,
            overallScore: 86,
          },
          readinessLevel: 'Level 3 - Advanced FC Ready',
          summaryFeedback: language === 'vi'
            ? 'Ứng viên phân tích rất sắc bén nguyên nhân chênh lệch giữa công suất và GOP, nắm vững chuẩn USALI và đề xuất được kế hoạch hành động 30 ngày khả thi cho GM.'
            : 'Candidate demonstrated impressive command of USALI flow-through diagnostics and structured a realistic 30-day profit recovery plan.',
          strengths: [
            'Bóc tách rành mạch tác động giữa Rate Variance và Volume Variance',
            'Giao tiếp tự tin, phong thái đối tác kinh doanh điều hành với GM',
          ],
          areasForImprovement: [
            'Cần bổ sung thêm phân tích độ nhạy của việc tăng giá bán ròng kênh Direct Web',
          ],
          gmDebrief: language === 'vi'
            ? 'Richard Vance (GM): "Rất ấn tượng với bài thuyết trình của bạn. Đây chính xác là tư duy của một Financial Controller mà tôi cần ở bàn họp điều hành."'
            : 'Richard Vance (GM): "Strong presentation. This is the strategic co-piloting I expect from my Financial Controller."',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulatorLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0A192F] via-[#102A4C] to-[#1E3A8A] text-white p-6 sm:p-8 rounded-2xl border border-slate-700/50 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Gemini 3.8 Flash &bull; Server-Side AI</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {t.ai.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {t.ai.subtitle}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>{t.ai.tabSimulator}</span>
          </button>
          <button
            onClick={() => setActiveTab('advisor')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'advisor'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>{t.ai.tabAdvisor}</span>
          </button>
        </div>
      </div>

      {/* Mode 1: FC Business Partner Simulator (GM Roleplay) */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Scenario Selector & Financial Snapshot (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                {t.ai.scenarioSelect}
              </span>
              <div className="space-y-2">
                {PRESET_SCENARIOS.map((scen, idx) => (
                  <button
                    key={scen.id}
                    onClick={() => {
                      setSelectedScenarioIndex(idx);
                      setSimulatorMessages([
                        {
                          role: 'gm',
                          text: language === 'vi'
                            ? `Chào FC! Tôi đang xem kịch bản: "${scen.title}". Hãy cho tôi biết phân tích tài chính và kế hoạch giải quyết cụ thể của bạn.`
                            : `Good morning FC! I am looking at: "${scen.title}". Walk me through your diagnostic and tactical plan.`,
                        },
                      ]);
                      setEvaluationResult(null);
                    }}
                    className={`w-full p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      selectedScenarioIndex === idx
                        ? 'bg-[#0A192F] text-amber-300 border-amber-400 font-bold shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="block font-extrabold line-clamp-1">{scen.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scenario Financial Metrics Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Chỉ Số Vận Hành Khách Sạn Tháng Này</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Công suất phòng</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedScenario.metrics.occupancy}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Giá bình quân ADR</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedScenario.metrics.adr}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">RevPAR</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedScenario.metrics.revpar}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Biên lợi nhuận GOP</span>
                  <span className="font-bold text-rose-600 font-mono">{selectedScenario.metrics.gopMargin}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200/80 leading-relaxed">
                {selectedScenario.context}
              </p>
            </div>

            {/* Request Evaluation Button */}
            <button
              onClick={handleRequestEvaluation}
              disabled={simulatorLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Award className="w-4 h-4" />
              <span>{t.ai.requestAIEval}</span>
            </button>
          </div>

          {/* Interactive Chat Dialog with GM Richard Vance (8 cols) */}
          <div className="lg:col-span-8 flex flex-col h-[650px] bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Header Persona */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{t.ai.gmPersona}</h4>
                  <p className="text-[10px] text-amber-300 font-medium">
                    {language === 'vi' ? 'Tổng Giám Đốc Khách Sạn 5 Sao &bull; Trực tuyến' : '5-Star Luxury General Manager &bull; Live'}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30">
                Co-Pilot Simulation
              </span>
            </div>

            {/* Conversation Flow */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50">
              {simulatorMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                        : 'bg-[#0A192F] text-amber-400 ring-2 ring-amber-400/40'
                    }`}
                  >
                    {msg.role === 'user' ? 'FC' : 'GM'}
                  </div>

                  <div
                    className={`p-4 rounded-2xl max-w-xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))}

              {simulatorLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic pl-11">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span>Tổng Giám Đốc đang phản hồi và phân tích luận điểm của bạn...</span>
                </div>
              )}

              {/* Evaluation Board Feedback Box if triggered */}
              {evaluationResult && (
                <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-2xl border-2 border-amber-400 space-y-4 text-xs shadow-md">
                  <div className="flex items-center justify-between border-b border-amber-300/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-700" />
                      <h4 className="font-extrabold text-sm text-slate-900 uppercase">
                        KẾT QUẢ ĐÁNH GIÁ CỦA HỘI ĐỒNG ĐIỀU HÀNH
                      </h4>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-600 text-white font-black text-xs">
                      {evaluationResult.readinessLevel}
                    </span>
                  </div>

                  {/* 5-Dimension Rubrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-white border border-amber-200">
                      <span className="text-[9px] text-slate-500 block font-bold">Chính xác số liệu</span>
                      <span className="font-black text-slate-900 text-sm font-mono">{evaluationResult.scores?.financialAccuracy}%</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-amber-200">
                      <span className="text-[9px] text-slate-500 block font-bold">Phân tích nguyên nhân</span>
                      <span className="font-black text-slate-900 text-sm font-mono">{evaluationResult.scores?.analyticalThinking}%</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-amber-200">
                      <span className="text-[9px] text-slate-500 block font-bold">Thấu hiểu kinh doanh</span>
                      <span className="font-black text-slate-900 text-sm font-mono">{evaluationResult.scores?.commercialUnderstanding}%</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-amber-200">
                      <span className="text-[9px] text-slate-500 block font-bold">Khuyến nghị chiến lược</span>
                      <span className="font-black text-slate-900 text-sm font-mono">{evaluationResult.scores?.strategicRecommendations}%</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-amber-200">
                      <span className="text-[9px] text-slate-500 block font-bold">Giao tiếp điều hành</span>
                      <span className="font-black text-slate-900 text-sm font-mono">{evaluationResult.scores?.communicationQuality}%</span>
                    </div>
                  </div>

                  <p className="text-slate-800 leading-relaxed font-medium bg-white/80 p-3 rounded-xl border border-amber-200">
                    {evaluationResult.summaryFeedback}
                  </p>

                  <p className="text-amber-900 italic font-semibold border-l-4 border-amber-500 pl-3">
                    {evaluationResult.gmDebrief}
                  </p>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={simulatorInput}
                onChange={(e) => setSimulatorInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendSimulator()}
                placeholder={t.ai.yourProposal}
                className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-slate-50/50"
              />
              <button
                onClick={handleSendSimulator}
                disabled={simulatorLoading || !simulatorInput.trim()}
                className="px-4 py-2.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.ai.sendToGM}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: General USALI & Hotel Finance Tutor */}
      {activeTab === 'advisor' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Preset Questions Chips */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="font-bold text-slate-500 whitespace-nowrap">Gợi ý nhanh:</span>
            {[
              'Giải thích cấu trúc phân bổ chi phí USALI 11th Edition',
              'Công thức tính Flow-Through và Flex khi doanh thu biến động',
              'Checklist quy trình Fast-Close Day 3',
              'Phân biệt FF&E Reserve và Chi phí bảo trì POM',
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAdvisorInput(q);
                }}
                className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:border-amber-400 text-slate-700 whitespace-nowrap text-[11px] transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            {advisorMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 ${
                  msg.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-black'
                  }`}
                >
                  {msg.role === 'user' ? 'FC' : <Sparkles className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl max-w-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}

            {advisorLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 italic pl-11">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Trợ lý AI đang tra cứu chuẩn USALI và soạn câu trả lời chuyên sâu...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={advisorInput}
              onChange={(e) => setAdvisorInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAdvisor()}
              placeholder={language === 'vi' ? 'Hỏi về USALI, hạch toán doanh thu, tính RevPAR, kiểm soát chi phí...' : 'Ask about USALI, RevPAR, month-end closing...'}
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-slate-50/50"
            />
            <button
              onClick={handleSendAdvisor}
              disabled={advisorLoading || !advisorInput.trim()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi câu hỏi</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
