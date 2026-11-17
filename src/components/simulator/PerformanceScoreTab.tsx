import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Award, ShieldCheck, Info, CheckCircle2, FileEdit, BookOpen, ArrowUpRight } from 'lucide-react';
import { STANDARD_EVALUATION_RUBRIC_BLUEPRINT } from '../../lib/simulatorEngine';

export const PerformanceScoreTab: React.FC = () => {
  const {
    currentUser,
    language,
    users,
    courses,
    ojtAssignments,
    simulatorData,
    simulatorWorkspace,
    reviewSimulationEvaluation,
    setActiveTab,
    showToast,
  } = useApp();

  const canAssess = ['super_admin', 'lnd_manager', 'financial_controller', 'general_manager'].includes(
    currentUser.role
  );

  const visibleEvaluations = useMemo(() => {
    return simulatorWorkspace.evaluations.filter((e) =>
      canAssess ? true : e.learnerId === currentUser.id
    );
  }, [simulatorWorkspace.evaluations, canAssess, currentUser.id]);

  const [selectedEvalId, setSelectedEvalId] = useState<string>('');
  const activeEval =
    visibleEvaluations.find((e) => e.id === selectedEvalId) || visibleEvaluations[0] || null;

  const [overrideScore, setOverrideScore] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [assessorComments, setAssessorComments] = useState<string>('');
  const [savingReview, setSavingReview] = useState(false);

  const criterionAverages = useMemo(() => {
    return STANDARD_EVALUATION_RUBRIC_BLUEPRINT.map((bp) => {
      const scores: number[] = [];
      visibleEvaluations.forEach((ev) => {
        const found = ev.scoringCriteria?.find((c) => c.criterionCode === bp.criterionCode);
        if (found) scores.push(found.score);
      });
      const avg =
        scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
      return { ...bp, avg, count: scores.length };
    });
  }, [visibleEvaluations]);

  const handleSaveHumanReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEval || !canAssess || savingReview) return;
    if (!adjustmentReason.trim()) {
      showToast(
        language === 'vi'
          ? 'Bắt buộc nhập lý do điều chỉnh điểm đánh giá.'
          : 'Adjustment reason is required.',
        'error'
      );
      return;
    }
    setSavingReview(true);
    try {
      await reviewSimulationEvaluation(activeEval.id, {
        adjustedTotalScore: overrideScore.trim() ? Number(overrideScore) : undefined,
        adjustmentReason: adjustmentReason.trim(),
        assessorComments: assessorComments.trim(),
      });
      setAdjustmentReason('');
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Advisory Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-amber-700">
            6-CRITERION RUBRIC · COMPETENCY & IDP ADVISORY
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            {language === 'vi' ? 'Điểm Hiệu Suất & Năng Lực Mô Phỏng' : 'Performance & Competency Score'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('talentGapAnalysis')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <span>{language === 'vi' ? 'Mở Competency Gap Engine' : 'Open Gap Engine'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('talentIdp')}
            className="px-3.5 py-2 rounded-xl bg-[#0A192F] text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <span>{language === 'vi' ? 'Mở Kế Hoạch IDP' : 'Open IDP Module'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p>
          {language === 'vi'
            ? 'Lưu ý quản trị: Kết quả mô phỏng chỉ là minh chứng tham khảo và gợi ý cho IDP. Điểm đánh giá năng lực chính thức và quyết định thăng chức luôn cần xác nhận của Người đánh giá / Quản lý L&D.'
            : 'Governance Rule: Simulator scores provide advisory evidence and IDP recommendations only. They never automatically modify approved official competency ratings or promotion status without human assessor review.'}
        </p>
      </div>

      {/* 6-Criterion Aggregate Averages */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">
          {language === 'vi' ? 'Phân Rã 6 Tiêu Chí Chuẩn FC (Tổng Trọng Số 100%)' : '6-Criterion Weighted Performance Breakdown (100%)'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {criterionAverages.map((c) => (
            <div key={c.criterionCode} className="p-4 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">
                  {language === 'vi' ? c.criterionNameVi : c.criterionNameEn}
                </span>
                <span className="font-mono text-[11px] text-slate-500">{c.weightPercent}%</span>
              </div>
              <div className="flex items-baseline justify-between font-mono tabular-nums pt-1">
                <span className="text-2xl font-bold text-slate-900">{c.avg !== null ? c.avg : '—'}</span>
                <span className="text-[11px] text-slate-500">{c.count} eval(s)</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-md overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${Math.min(100, c.avg ?? 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Evaluation Detailed Breakdown + Human Assessor Review */}
      {visibleEvaluations.length > 0 && activeEval && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'vi' ? 'Chi Tiết Phiếu Chấm Mô Phỏng' : 'Evaluation Record & Competency Advisory'}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {activeEval.id} · {activeEval.assessorType}
                </p>
              </div>
              <select
                value={activeEval.id}
                onChange={(e) => setSelectedEvalId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold max-w-xs"
              >
                {visibleEvaluations.map((ev) => {
                  const emp = users.find((u) => u.id === ev.learnerId);
                  return (
                    <option key={ev.id} value={ev.id}>
                      {ev.scenarioId} · {emp?.name || ev.learnerId} ({ev.adjustedTotalScore ?? ev.totalScore}/100)
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono tabular-nums">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-sans text-slate-500">System / AI Score</div>
                <div className="text-xl font-bold text-slate-900">{activeEval.totalScore}/100</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-sans text-slate-500">Human Adjusted</div>
                <div className="text-xl font-bold text-emerald-700">
                  {activeEval.adjustedTotalScore !== undefined ? `${activeEval.adjustedTotalScore}/100` : 'Pending'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-sans text-slate-500">Reviewer</div>
                <div className="text-xs font-bold text-slate-800 truncate mt-1 font-sans">
                  {activeEval.reviewerName || 'Automated'}
                </div>
              </div>
            </div>

            {activeEval.adjustmentReason && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                <strong>{language === 'vi' ? 'Lý do điều chỉnh của Người đánh giá:' : 'Assessor Adjustment Reason:'}</strong>{' '}
                {activeEval.adjustmentReason}
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                <span>
                  {language === 'vi'
                    ? 'Gợi Ý Cấp Độ Năng Lực Tham Khảo (Cần Phê Duyệt)'
                    : 'Advisory Competency Evidence (Requires Human Approval)'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activeEval.recommendedCompetencies.map((rc) => (
                  <div key={rc.competencyCode} className="p-2.5 rounded-xl border border-slate-200">
                    <div className="font-mono font-bold text-slate-900">
                      {rc.competencyCode} → Suggested L{rc.suggestedLevel}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{rc.rationale}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-slate-600" />
                <span>{language === 'vi' ? 'Mục Tiêu IDP & Khóa Học Đề Xuất' : 'Suggested IDP Objectives & Resources'}</span>
              </div>
              <ul className="space-y-1.5">
                {activeEval.suggestedIdpObjectives.map((obj, idx) => {
                  const crs = courses.find((c) => c.id === obj.linkedCourseId);
                  const ojt = ojtAssignments.find((o) => o.id === obj.linkedPracticalId);
                  return (
                    <li key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="font-semibold text-slate-900">
                        [{obj.competencyCode}] {language === 'vi' ? obj.titleVi : obj.titleEn}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Course: {crs?.code || obj.linkedCourseId || '—'} · OJT: {ojt?.code || obj.linkedPracticalId || '—'}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Human Assessor Override Panel (Supervisors/Admins Only) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileEdit className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'vi' ? 'Rà Soát & Hiệu Đính Điểm (Assessor)' : 'Human Assessor Review & Override'}
              </h3>
            </div>

            {!canAssess ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                {language === 'vi'
                  ? 'Chỉ Giám Đốc Tài Chính (FC), Quản Lý L&D, GM hoặc Admin mới được quyền điều chỉnh điểm mô phỏng.'
                  : 'Only Financial Controllers, L&D Managers, GM, or Super Admins may review and adjust evaluation scores.'}
              </div>
            ) : (
              <form onSubmit={handleSaveHumanReview} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {language === 'vi' ? 'Điểm Điều Chỉnh Tổng (0–100)' : 'Adjusted Total Score (0–100)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder={String(activeEval.totalScore)}
                    value={overrideScore}
                    onChange={(e) => setOverrideScore(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {language === 'vi' ? 'Lý Do Hiệu Đính Điểm (Bắt buộc)' : 'Adjustment Reason (Required)'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder={
                      language === 'vi'
                        ? 'Ví dụ: Học viên bảo vệ xuất sắc tính khả thi CAPEX trong vòng phản biện với GM.'
                        : 'e.g. Candidate demonstrated superior WACC sensitivity defense in GM challenge round.'
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {language === 'vi' ? 'Nhận Xét Của Hội Đồng Chấm' : 'Assessor Feedback Comments'}
                  </label>
                  <textarea
                    rows={2}
                    value={assessorComments}
                    onChange={(e) => setAssessorComments(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingReview}
                  className="w-full py-2.5 rounded-xl bg-[#0A192F] text-white font-bold hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>
                    {savingReview
                      ? language === 'vi'
                        ? 'Đang Lưu...'
                        : 'Saving...'
                      : language === 'vi'
                      ? 'Xác Nhận Hiệu Đính & Lưu Audit'
                      : 'Approve Score Review & Log Audit'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
