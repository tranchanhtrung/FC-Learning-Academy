import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { CoachMode, SimulationRoleplayConfig, SimulatorPersona } from '../../types';
import { Send, Bot, Sparkles, UserCheck, ShieldAlert } from 'lucide-react';

const PERSONAS: SimulatorPersona[] = [
  'General Manager',
  'Director of Operations',
  'Director of Sales & Marketing',
  'Executive Chef / F&B Director',
  'Corporate Finance Reviewer',
];

const COACH_MODES: Array<{ id: CoachMode; labelVi: string; labelEn: string }> = [
  { id: 'guided_learning', labelVi: 'Guided Learning (Gợi ý tư duy)', labelEn: 'Guided Learning' },
  { id: 'challenge_mode', labelVi: 'Challenge Mode (Phản biện giả định)', labelEn: 'Challenge Mode' },
  { id: 'executive_mode', labelVi: 'Executive Mode (Cô đọng trình GM)', labelEn: 'Executive Mode' },
  { id: 'reflection_mode', labelVi: 'Reflection Mode (Tự soi năng lực)', labelEn: 'Reflection Mode' },
];

export const ExecutiveMeetingTab: React.FC = () => {
  const {
    currentUser,
    language,
    simulatorData,
    selectedSimulatorScenarioId,
    setSelectedSimulatorScenarioId,
    activeSimulatorSessionId,
    setActiveSimulatorSessionId,
    saveSimulationSession,
    showToast,
    hasPermission,
  } = useApp();

  const isSupervisorOrAdmin = hasPermission('preview_draft_scenarios');

  const visibleScenarios = useMemo(
    () => simulatorData.simulationScenarios.filter((s) => isSupervisorOrAdmin || s.status === 'Published'),
    [simulatorData.simulationScenarios, isSupervisorOrAdmin]
  );
  const scenario =
    visibleScenarios.find((s) => s.id === selectedSimulatorScenarioId) || visibleScenarios[0] || null;

  const activeSession = useMemo(() => {
    if (!scenario) return null;
    if (activeSimulatorSessionId) {
      const f = simulatorData.simulationSessions.find((s) => s.id === activeSimulatorSessionId);
      if (f) return f;
    }
    return (
      simulatorData.simulationSessions.find(
        (s) => s.scenarioId === scenario.id && s.employeeId === currentUser.id && s.status === 'in_progress'
      ) || null
    );
  }, [activeSimulatorSessionId, simulatorData.simulationSessions, scenario, currentUser.id]);

  const roleplayPrompts = useMemo(
    () =>
      simulatorData.simulationRoleplayPrompts
        .filter((r) => r.scenarioId === scenario?.id)
        .sort((a, b) => a.turnOrder - b.turnOrder),
    [simulatorData.simulationRoleplayPrompts, scenario]
  );

  const [config, setConfig] = useState<SimulationRoleplayConfig>({
    persona: scenario?.defaultPersona || 'General Manager',
    difficulty: scenario?.difficultyLabel || 'Intermediate',
    maxQuestions: 5,
    language,
    challengeIntensity: 'Balanced',
    timeLimitMinutes: 15,
    coachMode: 'guided_learning',
  });

  const [userInput, setUserInput] = useState('');
  const [sending, setSending] = useState(false);

  // Optional AI Business Coach drawer state
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachResult, setCoachResult] = useState<{
    verifiedCalculations: string[];
    userAssumptions: string[];
    missingDataOrRisks: string[];
    coachingRecommendations: string[];
    humanValidationNote: string;
  } | null>(null);

  if (!scenario) return null;

  const openerMessage = roleplayPrompts[0]
    ? language === 'vi'
      ? roleplayPrompts[0].promptVi
      : roleplayPrompts[0].promptEn
    : language === 'vi'
    ? 'Chào anh/chị FC, hãy trình bày ngắn gọn 3 phát hiện tài chính quan trọng nhất trong kỳ và hành động đề xuất.'
    : 'Welcome, FC. Walk me through your top 3 financial findings and priority recovery actions.';

  const messages =
    activeSession?.conversation && activeSession.conversation.length > 0
      ? activeSession.conversation
      : [{ role: 'gm' as const, persona: config.persona, text: openerMessage }];

  const isCompletedSession = activeSession?.status === 'completed';

  const handleSendTurn = async () => {
    if (!userInput.trim() || sending || isCompletedSession) return;
    setSending(true);
    const turnText = userInput.trim();
    setUserInput('');

    const nextHistory = [
      ...messages,
      { role: 'user' as const, text: turnText, timestamp: new Date().toISOString() },
    ];

    try {
      const res = await fetch('/api/gemini/simulator-roleplay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          scenarioId: scenario.id,
          persona: config.persona,
          difficulty: config.difficulty,
          challengeIntensity: config.challengeIntensity,
          maxQuestions: config.maxQuestions,
          language: config.language,
          conversationHistory: messages,
          userTurn: turnText,
          analysisNotes: activeSession?.analysisWorkspace?.significantVariances || activeSession?.learnerAnalysis || '',
          decisionSummary: activeSession?.decisionWorkspace?.recommendedAction || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Roleplay response error.', 'error');
        return;
      }

      const finalConvo = [
        ...nextHistory,
        {
          role: 'gm' as const,
          persona: config.persona,
          text: data.reply,
          timestamp: new Date().toISOString(),
        },
      ];

      const saved = await saveSimulationSession({
        id: activeSession?.id,
        scenarioId: scenario.id,
        scenarioTitle: language === 'vi' ? scenario.titleVi : scenario.titleEn,
        roleplayConfig: config,
        conversation: finalConvo,
        status: 'in_progress',
      });
      if (saved) setActiveSimulatorSessionId(saved.id);
    } catch (err: any) {
      showToast(err?.message || 'Network error calling executive roleplay.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleAskCoach = async () => {
    setCoachLoading(true);
    try {
      const res = await fetch('/api/gemini/simulator-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          scenarioId: scenario.id,
          mode: config.coachMode,
          language: config.language,
          question: coachQuestion,
          analysisWorkspace: activeSession?.analysisWorkspace,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'AI Coach unavailable.', 'error');
        return;
      }
      setCoachResult(data.coach);
    } catch (err: any) {
      showToast(err?.message || 'Failed to reach AI Coach.', 'error');
    } finally {
      setCoachLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left 8 cols: Configurable Multi-Persona Executive Meeting */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 flex flex-col min-h-[600px]">
        <div className="p-4 border-b border-slate-200 bg-[#0A192F] text-white rounded-t-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                EXECUTIVE BOARDROOM ROLEPLAY · MULTI-PERSONA
              </p>
              <h2 className="text-base font-bold mt-0.5">
                {language === 'vi' ? scenario.titleVi : scenario.titleEn}
              </h2>
            </div>
            <select
              value={scenario.id}
              onChange={(e) => {
                setActiveSimulatorSessionId(null);
                setSelectedSimulatorScenarioId(e.target.value);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
            >
              {visibleScenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.scenarioCode} · {language === 'vi' ? s.titleVi : s.titleEn}
                </option>
              ))}
            </select>
          </div>

          {/* Configuration Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <label className="block text-slate-400 mb-1">Persona</label>
              <select
                value={config.persona}
                onChange={(e) => setConfig({ ...config, persona: e.target.value as SimulatorPersona })}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
              >
                {PERSONAS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Challenge Intensity</label>
              <select
                value={config.challengeIntensity}
                onChange={(e) => setConfig({ ...config, challengeIntensity: e.target.value as any })}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
              >
                <option value="Supportive">Supportive</option>
                <option value="Balanced">Balanced</option>
                <option value="Rigorous">Rigorous</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Max Questions</label>
              <select
                value={config.maxQuestions}
                onChange={(e) => setConfig({ ...config, maxQuestions: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
              >
                <option value={3}>3 Turns</option>
                <option value={5}>5 Turns</option>
                <option value={8}>8 Turns</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Language</label>
              <select
                value={config.language}
                onChange={(e) => setConfig({ ...config, language: e.target.value as 'vi' | 'en' })}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[460px] bg-slate-50/40">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed border ${
                  m.role === 'user'
                    ? 'bg-[#0A192F] text-white border-slate-800'
                    : 'bg-white text-slate-800 border-slate-200'
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider mb-1 opacity-75">
                  {m.role === 'user' ? `${currentUser.name} (FC Candidate)` : m.persona || config.persona}
                </div>
                <p className="whitespace-pre-line">{m.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Box */}
        <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl">
          {isCompletedSession ? (
            <div className="text-xs text-slate-500 font-mono text-center py-2">
              {language === 'vi'
                ? 'Phiên mô phỏng này đã hoàn thành và khóa lịch sử đối thoại.'
                : 'Completed simulation transcript is historically locked.'}
            </div>
          ) : (
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={
                  language === 'vi'
                    ? `Trả lời ${config.persona} bằng số liệu USALI định lượng và hành động cụ thể...`
                    : `Brief ${config.persona} with quantified USALI variances & recommendations...`
                }
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={handleSendTurn}
                disabled={sending || !userInput.trim()}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer self-end"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? '...' : language === 'vi' ? 'Phản Biện' : 'Respond'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right 4 cols: Optional 4-Mode AI Business Coach */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {language === 'vi' ? 'AI Business Coach (Tùy Chọn)' : 'Optional AI Business Coach'}
          </h3>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {language === 'vi'
            ? 'Không tiết lộ đáp án trước khi nộp bài; tách bạch số liệu xác thực, giả định cá nhân và rủi ro thiếu sót.'
            : 'Never spoils final answers; separates verified TypeScript math from user assumptions and missing risks.'}
        </p>

        <div className="space-y-2 text-xs">
          <label className="block font-semibold text-slate-700">
            {language === 'vi' ? 'Chế độ huấn luyện' : 'Coach Mode'}
          </label>
          <select
            value={config.coachMode}
            onChange={(e) => setConfig({ ...config, coachMode: e.target.value as CoachMode })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
          >
            {COACH_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {language === 'vi' ? m.labelVi : m.labelEn}
              </option>
            ))}
          </select>

          <textarea
            rows={2}
            value={coachQuestion}
            onChange={(e) => setCoachQuestion(e.target.value)}
            placeholder={
              language === 'vi'
                ? 'Hỏi Coach cách tiếp cận phân tích hoặc rà soát điểm mù...'
                : 'Ask Coach to stress-test assumptions or framing...'
            }
            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
          />

          <button
            onClick={handleAskCoach}
            disabled={coachLoading}
            className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{coachLoading ? (language === 'vi' ? 'Đang phân tích...' : 'Thinking...') : language === 'vi' ? 'Tham Vấn AI Coach' : 'Ask AI Coach'}</span>
          </button>
        </div>

        {coachResult && (
          <div className="space-y-2.5 pt-2 border-t border-slate-100 text-[11px]">
            <div>
              <div className="font-bold text-emerald-700 uppercase">Verified Calculations</div>
              <ul className="list-disc pl-4 text-slate-700 space-y-0.5 mt-0.5">
                {coachResult.verifiedCalculations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-bold text-amber-700 uppercase">Your Assumptions</div>
              <ul className="list-disc pl-4 text-slate-700 space-y-0.5 mt-0.5">
                {coachResult.userAssumptions.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-bold text-rose-700 uppercase">Missing Data & Risks</div>
              <ul className="list-disc pl-4 text-slate-700 space-y-0.5 mt-0.5">
                {coachResult.missingDataOrRisks.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-bold text-slate-800 uppercase">Coaching Recommendations</div>
              <ul className="list-disc pl-4 text-slate-700 space-y-0.5 mt-0.5">
                {coachResult.coachingRecommendations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2 text-slate-600">
              <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <span>{coachResult.humanValidationNote}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
