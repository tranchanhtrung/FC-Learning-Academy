import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Play,
  Award,
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  ArrowRight,
  Compass,
  Building2,
  BarChart3,
} from 'lucide-react';
import { calculateGapAnalysis } from '../../lib/talentEngine';

const CAREER_STEPS = [
  { id: 'Accountant', labelEn: 'Accountant', labelVi: 'Kế Toán Viên' },
  { id: 'Senior Accountant', labelEn: 'Senior Accountant', labelVi: 'Kế Toán Tổng Hợp' },
  { id: 'Assistant Financial Controller', labelEn: 'Assistant FC', labelVi: 'Phó Giám Đốc TC (AFC)' },
  { id: 'Financial Controller', labelEn: 'Financial Controller', labelVi: 'Giám Đốc Tài Chính (FC)' },
  { id: 'Strategic Finance Business Partner', labelEn: 'Strategic Finance BP', labelVi: 'Đối Tác Chiến Lược GM' },
];

export const SimulationDashboardTab: React.FC = () => {
  const {
    currentUser,
    language,
    competencies,
    domains,
    competencyAssessments,
    talentConfig,
    simulatorData,
    simulatorWorkspace,
    launchSimulationWorkspace,
    setActiveTab,
  } = useApp();

  const isSupervisorOrAdmin = ['super_admin', 'lnd_manager', 'financial_controller', 'general_manager'].includes(
    currentUser.role
  );

  const visibleScenarios = useMemo(() => {
    return simulatorData.simulationScenarios.filter((s) => isSupervisorOrAdmin || s.status === 'Published');
  }, [simulatorData.simulationScenarios, isSupervisorOrAdmin]);

  const userSessions = useMemo(() => {
    return simulatorData.simulationSessions.filter((s) =>
      isSupervisorOrAdmin ? true : s.employeeId === currentUser.id || s.employeeUid === currentUser.id
    );
  }, [simulatorData.simulationSessions, currentUser.id, isSupervisorOrAdmin]);

  const completedSessions = useMemo(
    () => userSessions.filter((s) => s.status === 'completed'),
    [userSessions]
  );

  const averageScore = useMemo(() => {
    const scored = completedSessions.filter((s) => typeof s.finalScore === 'number');
    if (scored.length === 0) return null;
    const sum = scored.reduce((acc, s) => acc + Number(s.finalScore || 0), 0);
    return Math.round((sum / scored.length) * 10) / 10;
  }, [completedSessions]);

  // Pull competency gap recommendations from IDP / Gap Engine
  const gapSummary = useMemo(() => {
    return calculateGapAnalysis({
      assessments: competencyAssessments,
      employeeId: currentUser.id,
      targetPosition: 'Assistant Financial Controller',
      competencies,
      domains,
      config: talentConfig,
    });
  }, [competencyAssessments, currentUser.id, competencies, domains, talentConfig]);

  // Aggregate criterion scores from completed evaluations
  const criterionInsights = useMemo(() => {
    const evals = simulatorWorkspace.evaluations.filter((e) =>
      isSupervisorOrAdmin ? true : e.learnerId === currentUser.id
    );
    if (evals.length === 0) return { best: null, weakest: null, improvement: null };
    const buckets: Record<string, { nameEn: string; nameVi: string; total: number; count: number }> = {};
    evals.forEach((ev) => {
      (ev.scoringCriteria || []).forEach((c) => {
        if (!buckets[c.criterionCode]) {
          buckets[c.criterionCode] = { nameEn: c.criterionNameEn, nameVi: c.criterionNameVi, total: 0, count: 0 };
        }
        buckets[c.criterionCode].total += c.score;
        buckets[c.criterionCode].count += 1;
      });
    });
    const list = Object.values(buckets).map((b) => ({ ...b, avg: Math.round((b.total / b.count) * 10) / 10 }));
    list.sort((a, b) => b.avg - a.avg);
    const first = list[0] || null;
    const last = list[list.length - 1] || null;

    let improvement: number | null = null;
    if (evals.length >= 2) {
      const oldest = evals[evals.length - 1];
      const latest = evals[0];
      improvement = Math.round(((latest.adjustedTotalScore ?? latest.totalScore) - (oldest.adjustedTotalScore ?? oldest.totalScore)) * 10) / 10;
    }
    return { best: first, weakest: last, improvement };
  }, [simulatorWorkspace.evaluations, currentUser.id, isSupervisorOrAdmin]);

  const difficultyCounts = useMemo(() => {
    const counts: Record<string, number> = { Beginner: 0, Intermediate: 0, Advanced: 0, Expert: 0 };
    visibleScenarios.forEach((s) => {
      const label =
        s.difficultyLabel ||
        (s.difficultyLevel === 1 ? 'Beginner' : s.difficultyLevel === 2 ? 'Intermediate' : s.difficultyLevel === 3 ? 'Advanced' : 'Expert');
      counts[label] = (counts[label] || 0) + 1;
    });
    return counts;
  }, [visibleScenarios]);

  const recommendedScenarios = useMemo(() => {
    const priorityCodes = new Set(gapSummary.priorityDevelopmentList.slice(0, 6).map((p) => p.competencyCode));
    const completedIds = new Set(completedSessions.map((s) => s.scenarioId));
    return [...visibleScenarios]
      .sort((a, b) => {
        const aCompScore = (a.competencyIds || []).filter((c) => priorityCodes.has(c)).length;
        const bCompScore = (b.competencyIds || []).filter((c) => priorityCodes.has(c)).length;
        const aDone = completedIds.has(a.id) ? 0 : 1;
        const bDone = completedIds.has(b.id) ? 0 : 1;
        return bDone - aDone || bCompScore - aCompScore;
      })
      .slice(0, 3);
  }, [visibleScenarios, gapSummary.priorityDevelopmentList, completedSessions]);

  const myAssignments = useMemo(() => {
    return simulatorWorkspace.assignments.filter((a) =>
      isSupervisorOrAdmin ? a.status !== 'completed' : a.learnerId === currentUser.id && a.status !== 'completed'
    );
  }, [simulatorWorkspace.assignments, currentUser.id, isSupervisorOrAdmin]);

  const currentCareerIdx = Math.min(4, Math.max(0, (currentUser.currentLevel || 1) - 1));

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-[#0A192F] text-white rounded-2xl p-6 border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-amber-400">
              FC BUSINESS PARTNER SIMULATOR · USALI 11TH & 12TH ED.
            </p>
            <h1 className="text-2xl font-bold tracking-tight mt-1">
              {language === 'vi'
                ? 'Từ Báo Cáo Tài Chính Đến Đối Tác Kinh Doanh Chiến Lược'
                : 'From Financial Reporting to Strategic Business Partnership'}
            </h1>
            <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
              {language === 'vi'
                ? 'Thực hành chẩn đoán P&L khách sạn chuẩn USALI, dự báo cuốn 3 tháng, thẩm định CAPEX và bảo vệ khuyến nghị trực tiếp trước Tổng Giám đốc.'
                : 'Practice USALI hospitality P&L diagnostics, 3-month rolling forecasts, CAPEX underwriting, and live executive briefings with the General Manager.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('simLibrary')}
              className="px-4 py-2.5 rounded-xl border border-slate-600 text-xs font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              {language === 'vi' ? 'Thư Viện Kịch Bản' : 'Browse Library'}
            </button>
            <button
              onClick={() => {
                const next = recommendedScenarios[0] || visibleScenarios[0];
                if (next) launchSimulationWorkspace(next.id, 'simWorkspace');
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Bắt Đầu Mô Phỏng' : 'Start Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Career Progression Stepper */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {language === 'vi' ? 'Lộ Trình Năng Lực Đối Tác Kinh Doanh' : 'Finance Business Partner Progression'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {CAREER_STEPS.map((step, idx) => {
              const reached = idx <= currentCareerIdx;
              const isCurrent = idx === currentCareerIdx;
              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-xl border text-xs ${
                    isCurrent
                      ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                      : reached
                      ? 'bg-slate-800/70 border-slate-700 text-slate-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="font-mono text-[10px] opacity-80">STAGE 0{idx + 1}</div>
                  <div className="font-semibold mt-0.5 truncate">
                    {language === 'vi' ? step.labelVi : step.labelEn}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{language === 'vi' ? 'Kịch Bản Khả Dụng' : 'Available Scenarios'}</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums mt-2">
            {visibleScenarios.length}
          </div>
          <p className="text-xs text-slate-500 mt-2 font-mono">
            {Object.entries(difficultyCounts)
              .map(([k, v]) => `${k[0]}:${v}`)
              .join(' · ')}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{language === 'vi' ? 'Phiên Đã Hoàn Thành' : 'Simulations Completed'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums mt-2">
            {completedSessions.length}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {userSessions.filter((s) => s.status === 'in_progress').length}{' '}
            {language === 'vi' ? 'phiên đang thực hiện' : 'draft sessions active'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{language === 'vi' ? 'Điểm Mô Phỏng TB' : 'Average Simulation Score'}</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums mt-2">
            {averageScore !== null ? `${averageScore}` : '—'}
            {averageScore !== null && <span className="text-sm font-normal text-slate-400"> / 100</span>}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {criterionInsights.improvement !== null
              ? `${language === 'vi' ? 'Cải thiện:' : 'Trend:'} ${criterionInsights.improvement >= 0 ? '+' : ''}${criterionInsights.improvement} pts`
              : language === 'vi'
              ? 'Chờ dữ liệu đa phiên để tính xu hướng'
              : 'Complete 2+ sessions for trend'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{language === 'vi' ? 'Năng Lực Mạnh / Cần Cải Thiện' : 'Strength vs Focus Area'}</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="text-xs">
              <span className="text-emerald-700 font-semibold">
                {language === 'vi' ? 'Mạnh nhất: ' : 'Best: '}
              </span>
              <span className="text-slate-800 font-medium">
                {criterionInsights.best
                  ? `${language === 'vi' ? criterionInsights.best.nameVi : criterionInsights.best.nameEn} (${criterionInsights.best.avg})`
                  : gapSummary.priorityDevelopmentList[0]
                  ? `${gapSummary.priorityDevelopmentList[0].competencyCode} (IDP)`
                  : '—'}
              </span>
            </div>
            <div className="text-xs">
              <span className="text-amber-700 font-semibold">
                {language === 'vi' ? 'Ưu tiên nâng cao: ' : 'Focus: '}
              </span>
              <span className="text-slate-800 font-medium">
                {criterionInsights.weakest
                  ? `${language === 'vi' ? criterionInsights.weakest.nameVi : criterionInsights.weakest.nameEn} (${criterionInsights.weakest.avg})`
                  : gapSummary.priorityDevelopmentList[0]?.competencyCode || 'BPA-01'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Asymmetric Main Section: Recommended Scenarios (Left 7 cols) & Assignments + Recent Results (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                {language === 'vi' ? 'Kịch Bản Gợi Ý Theo Khoảng Trống IDP' : 'Recommended Next Simulations (IDP Aligned)'}
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('simLibrary')}
              className="text-xs font-semibold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{language === 'vi' ? 'Xem tất cả' : 'View all'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recommendedScenarios.map((scn) => {
              const isAssigned = myAssignments.some((a) => a.scenarioId === scn.id);
              return (
                <div
                  key={scn.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500">
                      <span className="font-bold text-slate-800">{scn.scenarioCode}</span>
                      <span>·</span>
                      <span>{scn.category || 'Hotel Finance'}</span>
                      <span>·</span>
                      <span>{scn.difficultyLabel || `L${scn.difficultyLevel}`}</span>
                      {isAssigned && (
                        <>
                          <span>·</span>
                          <span className="text-rose-600 font-semibold">
                            {language === 'vi' ? 'Bắt buộc' : 'Assigned'}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {language === 'vi' ? scn.titleVi : scn.titleEn}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {language === 'vi' ? scn.summaryVi : scn.summaryEn}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {(scn.competencyIds || []).join(' · ')}
                    </p>
                  </div>

                  <button
                    onClick={() => launchSimulationWorkspace(scn.id, 'simWorkspace')}
                    className="shrink-0 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'vi' ? 'Vào Phiên' : 'Launch'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          {/* Mandatory Assignments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-rose-600" />
              <h2 className="text-base font-bold text-slate-900">
                {language === 'vi' ? 'Nhiệm Vụ Được Giao' : 'Assigned Simulations'}
              </h2>
            </div>
            {myAssignments.length === 0 ? (
              <p className="text-xs text-slate-500">
                {language === 'vi' ? 'Không có kịch bản tồn đọng quá hạn.' : 'No pending mandatory assignments.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {myAssignments.slice(0, 4).map((asgn) => {
                  const scn = visibleScenarios.find((s) => s.id === asgn.scenarioId);
                  return (
                    <div key={asgn.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {scn ? (language === 'vi' ? scn.titleVi : scn.titleEn) : asgn.scenarioId}
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {language === 'vi' ? 'Hạn:' : 'Due:'} {asgn.dueDate}
                          </span>
                        </p>
                      </div>
                      {scn && (
                        <button
                          onClick={() => launchSimulationWorkspace(scn.id, 'simWorkspace')}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-bold hover:bg-amber-400 cursor-pointer shrink-0"
                        >
                          {language === 'vi' ? 'Làm Bài' : 'Open'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Latest Simulation Results */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-700" />
                <h2 className="text-base font-bold text-slate-900">
                  {language === 'vi' ? 'Kết Quả Gần Nhất' : 'Latest Results'}
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('simHistory')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {language === 'vi' ? 'Lịch sử' : 'History'}
              </button>
            </div>
            {userSessions.length === 0 ? (
              <p className="text-xs text-slate-500">
                {language === 'vi' ? 'Chưa có phiên mô phỏng nào được ghi nhận.' : 'No simulation sessions recorded yet.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {userSessions.slice(0, 4).map((sess) => (
                  <div key={sess.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{sess.scenarioTitle}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {sess.status === 'completed'
                          ? `${language === 'vi' ? 'Hoàn thành' : 'Completed'} · ${new Date(sess.completedAt || sess.updatedAt).toLocaleDateString()}`
                          : `${language === 'vi' ? 'Bản nháp Bước' : 'Draft Step'} ${sess.currentStep || 1}/6`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {typeof sess.finalScore === 'number' && (
                        <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
                          {sess.finalScore}/100
                        </span>
                      )}
                      <button
                        onClick={() => launchSimulationWorkspace(sess.scenarioId, 'simWorkspace', sess.id)}
                        className="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer"
                      >
                        {sess.status === 'completed'
                          ? language === 'vi'
                            ? 'Xem lại'
                            : 'Review'
                          : language === 'vi'
                          ? 'Tiếp tục'
                          : 'Resume'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
