import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bot,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  HelpCircle,
  ClipboardList,
  BookOpen,
  FileText,
  Target,
} from 'lucide-react';

export type CoachMode =
  | 'explain_gaps'
  | 'draft_90day_idp'
  | 'recommend_activities'
  | 'coaching_questions'
  | 'reassessment_guide'
  | 'career_report';

export interface AiDraftActionItem {
  competencyCode: string;
  ratioTag: string;
  title: string;
  rationale: string;
  mappedResourceCode?: string;
  successMetric: string;
}

interface AICoachDrawerProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  targetPosition: string;
  initialMode?: CoachMode;
  onApplyDraftToIdp?: (items: AiDraftActionItem[], headline: string) => void;
}

export const AICoachDrawer: React.FC<AICoachDrawerProps> = ({
  open,
  onClose,
  employeeId,
  targetPosition,
  initialMode = 'explain_gaps',
  onApplyDraftToIdp,
}) => {
  const { currentUser, users, language, showToast, setActiveTab } = useApp();
  const [mode, setMode] = useState<CoachMode>(initialMode);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    headline: string;
    advisoryDisclaimer: string;
    executiveInsights: string;
    actionItems: AiDraftActionItem[];
    coachingQuestions: string[];
    computedReadiness?: string;
  } | null>(null);

  if (!open) return null;

  const targetUser = users.find((u) => u.id === employeeId);

  const modes: { id: CoachMode; labelVi: string; labelEn: string; icon: React.ElementType }[] = [
    { id: 'explain_gaps', labelVi: 'Giải thích Gap', labelEn: 'Explain Gaps', icon: Target },
    { id: 'draft_90day_idp', labelVi: 'Nháp IDP 90 ngày', labelEn: '90-Day IDP Draft', icon: ClipboardList },
    { id: 'recommend_activities', labelVi: 'Gợi ý 70-20-10', labelEn: '70-20-10 Activities', icon: BookOpen },
    { id: 'coaching_questions', labelVi: 'Câu hỏi Coaching', labelEn: 'Coaching Questions', icon: HelpCircle },
    { id: 'reassessment_guide', labelVi: 'Hướng dẫn tái đánh giá', labelEn: 'Reassessment Guide', icon: CheckCircle2 },
    { id: 'career_report', labelVi: 'Báo cáo sẵn sàng', labelEn: 'Readiness Report', icon: FileText },
  ];

  const handleRunCoach = async (selectedMode?: CoachMode) => {
    const activeMode = selectedMode || mode;
    setMode(activeMode);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/talent-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          employeeId,
          targetPosition,
          mode: activeMode,
          language,
          customPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'AI Development Coach unavailable.');
      } else {
        setResult({
          ...data.coaching,
          computedReadiness: data.computedReadiness,
        });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to connect to AI Development Coach.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToIdp = () => {
    if (!result?.actionItems?.length) return;
    if (onApplyDraftToIdp) {
      onApplyDraftToIdp(result.actionItems, result.headline);
    } else {
      sessionStorage.setItem(
        'fc_ai_idp_draft',
        JSON.stringify({
          employeeId,
          targetPosition,
          headline: result.headline,
          actionItems: result.actionItems,
        })
      );
      setActiveTab('talentIdp');
      onClose();
      showToast(
        language === 'vi'
          ? 'Đã chuyển bản nháp AI sang trình tạo IDP để chỉnh sửa và gửi duyệt.'
          : 'Transferred AI draft to IDP Builder for human review.',
        'info'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {language === 'vi' ? 'AI Development Coach (Tư vấn chuyên môn)' : 'AI Development Coach (Advisory)'}
              </h2>
              <p className="text-xs text-slate-400">
                {targetUser?.name || employeeId} · {targetPosition}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            aria-label="Close AI Coach"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector & Prompt */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {language === 'vi'
                ? 'Nguyên tắc kiểm soát: AI chỉ đóng vai trò cố vấn và tạo bản nháp chỉnh sửa được. AI không tự ý thay đổi điểm đánh giá hay phê duyệt IDP.'
                : 'Governance Guardrail: AI output is strictly advisory and editable. AI never alters official assessment scores or approvals.'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {modes.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleRunCoach(m.id)}
                  disabled={loading}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="truncate">{language === 'vi' ? m.labelVi : m.labelEn}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Câu hỏi thêm cho AI Coach (vd: ưu tiên kiểm soát nội bộ trước kiểm toán Q3)...'
                  : 'Optional context for coach (e.g., prioritize Q3 internal audit readiness)...'
              }
              className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={() => handleRunCoach()}
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{language === 'vi' ? 'Phân tích AI' : 'Generate Advice'}</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
              <p className="text-xs font-medium">
                {language === 'vi'
                  ? 'Đang phân tích hồ sơ năng lực, khóa học và khoảng trống thực tế...'
                  : 'Analyzing approved competency scores, catalog mappings, and IDP status...'}
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs space-y-1">
              <p className="font-bold">AI Coach Error</p>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && !result && (
            <div className="py-10 text-center space-y-3 border border-dashed border-slate-300 rounded-xl p-6">
              <Bot className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">
                {language === 'vi' ? 'Sẵn sàng tư vấn phát triển FC' : 'Ready for Executive Coaching'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {language === 'vi'
                  ? 'Chọn 1 trong 6 chế độ tư vấn phía trên hoặc bấm Phân tích AI để nhận giải thích khoảng trống, bản nháp IDP 90 ngày, hoặc bộ câu hỏi phỏng vấn tái đánh giá.'
                  : 'Select one of the 6 coaching modes above to generate gap explanations, an editable 90-day IDP draft, coaching questions, or reassessment interview guides.'}
              </p>
              <button
                onClick={() => handleRunCoach('explain_gaps')}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                {language === 'vi' ? 'Chạy phân tích khoảng trống ngay' : 'Run Gap Explanation Now'}
              </button>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-5">
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{result.computedReadiness ? `Readiness: ${result.computedReadiness}` : 'Advisory Draft'}</span>
                  <span>Gemini 4 Hydrogen</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{result.headline}</h3>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {result.executiveInsights}
                </p>
                <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  {result.advisoryDisclaimer}
                </p>
              </div>

              {result.actionItems.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      {language === 'vi'
                        ? `Đề xuất hành động phát triển (${result.actionItems.length})`
                        : `Proposed Action Items (${result.actionItems.length})`}
                    </h4>
                    <button
                      onClick={handleApplyToIdp}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{language === 'vi' ? 'Đưa vào IDP Builder' : 'Apply Draft to IDP Builder'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {result.actionItems.map((item, idx) => (
                      <div key={idx} className="p-3.5 space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-mono font-bold text-slate-900">
                            {item.competencyCode}
                            {item.mappedResourceCode ? ` · ${item.mappedResourceCode}` : ''}
                          </span>
                          <span>{item.ratioTag}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-600">{item.rationale}</p>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          {language === 'vi' ? 'Chỉ tiêu đo lường: ' : 'Success metric: '}
                          {item.successMetric}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.coachingQuestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {language === 'vi'
                      ? 'Câu hỏi Coaching & Đánh giá năng lực'
                      : 'Coaching & Behavioral Verification Questions'}
                  </h4>
                  <ol className="space-y-2 list-decimal list-inside border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs text-slate-800">
                    {result.coachingQuestions.map((q, i) => (
                      <li key={i} className="leading-relaxed">
                        {q}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
