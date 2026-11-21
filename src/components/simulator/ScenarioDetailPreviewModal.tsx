import React, { useEffect, useState } from 'react';
import {
  X,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  FileSpreadsheet,
  Award,
  MessageSquare,
  ListChecks,
  ShieldAlert,
  Archive,
  UploadCloud,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type {
  HotelSimulationProfileDoc,
  ScenarioVersionDoc,
  SimulationBusinessChallengeDoc,
  SimulationCompetencyMappingDoc,
  SimulationDecisionOptionDoc,
  SimulationEvaluationRubricDoc,
  SimulationFinancialRecordDoc,
  SimulationOperationalRecordDoc,
  SimulationReferenceAnalysisDoc,
  SimulationRoleplayPromptDoc,
  SimulationScenarioDoc,
  SimulationScenarioStatus,
  SimulationTaskDoc,
  SimulatorFinancialCheckResult,
  SimulatorScenarioPreviewSummary,
} from '../../types';

interface ScenarioDetailPreviewModalProps {
  scenario?: SimulationScenarioDoc | null;
  previewSummary?: SimulatorScenarioPreviewSummary | null;
  hotelProfile?: HotelSimulationProfileDoc | null;
  onClose: () => void;
  onTransitionStatus?: (scenarioId: string, status: SimulationScenarioStatus) => Promise<boolean | void>;
  onLaunchSimulation?: (scenarioId: string) => void;
}

type ModalTab =
  | 'overview'
  | 'financial'
  | 'operational'
  | 'tasks'
  | 'decision_gm'
  | 'rubric'
  | 'reference';

interface LoadedDetails {
  scenario: SimulationScenarioDoc;
  hotelProfile: HotelSimulationProfileDoc | null;
  financialData: SimulationFinancialRecordDoc[];
  operationalData: SimulationOperationalRecordDoc[];
  businessChallenges: SimulationBusinessChallengeDoc[];
  tasks: SimulationTaskDoc[];
  decisionOptions: SimulationDecisionOptionDoc[];
  roleplayPrompts: SimulationRoleplayPromptDoc[];
  evaluationRubrics: SimulationEvaluationRubricDoc[];
  competencyMappings: SimulationCompetencyMappingDoc[];
  referenceAnalysis: SimulationReferenceAnalysisDoc[];
  versions: ScenarioVersionDoc[];
}

const fmtCurrency = (v: number | undefined | null, currency = 'USD') => {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return '—';
  const num = Number(v);
  if (currency === 'VND') return `${Math.round(num).toLocaleString()} VND`;
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const ScenarioDetailPreviewModal: React.FC<ScenarioDetailPreviewModalProps> = ({
  scenario,
  previewSummary,
  hotelProfile: initialHotelProfile,
  onClose,
  onTransitionStatus,
  onLaunchSimulation,
}) => {
  const { currentUser, language, dataSourceMode, simulatorData, scenarioVersions, hasPermission } = useApp();
  const [activeTab, setActiveTab] = useState<ModalTab>('overview');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedDetails | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const isAdminOrLnd = hasPermission('preview_draft_scenarios') || hasPermission('manage_sim_admin');
  const canManageLifecycle =
    hasPermission('manage_sim_admin') && Boolean(scenario?.id) && Boolean(onTransitionStatus);

  useEffect(() => {
    if (!isAdminOrLnd && activeTab === 'reference') {
      setActiveTab('overview');
    }
  }, [isAdminOrLnd, activeTab]);

  useEffect(() => {
    if (!scenario?.id) {
      setLoaded(null);
      return;
    }

    const buildFromContext = (): LoadedDetails => ({
      scenario,
      hotelProfile:
        simulatorData.hotelSimulationProfiles.find((h) => h.id === scenario.hotelId) ||
        initialHotelProfile ||
        null,
      financialData: simulatorData.simulationFinancialData.filter((f) => f.scenarioId === scenario.id),
      operationalData: simulatorData.simulationOperationalData.filter((o) => o.scenarioId === scenario.id),
      businessChallenges: simulatorData.simulationBusinessChallenges.filter((c) => c.scenarioId === scenario.id),
      tasks: simulatorData.simulationTasks.filter((t) => t.scenarioId === scenario.id),
      decisionOptions: simulatorData.simulationDecisionOptions.filter((o) => o.scenarioId === scenario.id),
      roleplayPrompts: simulatorData.simulationRoleplayPrompts.filter((p) => p.scenarioId === scenario.id),
      evaluationRubrics: simulatorData.simulationEvaluationRubrics.filter((r) => r.scenarioId === scenario.id),
      competencyMappings: simulatorData.simulationCompetencyMappings.filter((m) => m.scenarioId === scenario.id),
      referenceAnalysis: simulatorData.simulationReferenceAnalysis.filter((r) => r.scenarioId === scenario.id),
      versions: scenarioVersions.filter((v) => v.scenarioId === scenario.id),
    });

    if (dataSourceMode === 'firestore') {
      setErrorMsg(null);
      setLoading(false);
      setLoaded(buildFromContext());
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    fetch(`/api/simulator/scenarios/${encodeURIComponent(scenario.id)}/details`, {
      headers: {
        'x-user-id': currentUser.id,
        'x-user-role': currentUser.role,
      },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || 'Failed to load scenario details.');
        }
        return body;
      })
      .then((data) => {
        if (!cancelled) {
          setLoaded(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const ctxFallback = buildFromContext();
          if (ctxFallback.scenario) {
            setLoaded(ctxFallback);
          } else {
            setErrorMsg(err?.message || 'Unable to load scenario details.');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scenario, currentUser.id, currentUser.role, dataSourceMode, simulatorData, scenarioVersions, initialHotelProfile]);

  const activeScenario: Partial<SimulationScenarioDoc> | null = loaded?.scenario || scenario || (previewSummary
    ? {
        id: previewSummary.scenarioId,
        scenarioCode: previewSummary.scenarioCode,
        hotelId: previewSummary.hotelId,
        titleEn: previewSummary.titleEn,
        titleVi: previewSummary.titleVi,
        summaryEn: previewSummary.summaryEn,
        summaryVi: previewSummary.summaryVi,
        difficultyLevel: previewSummary.difficultyLevel,
        targetRole: previewSummary.targetRole,
        periodLabel: previewSummary.periodLabel,
        status: previewSummary.status,
        competencyIds: previewSummary.competencyMappings.map((c) => c.competencyCode || c.competencyId),
      }
    : null);

  if (!activeScenario) return null;

  const hotel = loaded?.hotelProfile || initialHotelProfile || null;
  const currency = hotel?.currency || 'USD';
  const finRows = loaded?.financialData || previewSummary?.sampleFinancialRows || [];
  const opsRows = loaded?.operationalData || previewSummary?.sampleOperationalRows || [];
  const challenges = loaded?.businessChallenges || previewSummary?.challenges || [];
  const tasks = loaded?.tasks || previewSummary?.tasks || [];
  const decisionOptions = loaded?.decisionOptions || previewSummary?.decisionOptions || [];
  const roleplayPrompts = loaded?.roleplayPrompts || previewSummary?.roleplayPrompts || [];
  const rubrics = loaded?.evaluationRubrics || previewSummary?.rubrics || [];
  const compMappings = loaded?.competencyMappings || previewSummary?.competencyMappings || [];
  const referenceAnalyses = loaded?.referenceAnalysis || previewSummary?.referenceAnalyses || [];
  const finChecks: SimulatorFinancialCheckResult[] = previewSummary?.financialChecks || [];
  const rubricWeightSum = rubrics.reduce((sum, r) => sum + Number(r.weightPercent || 0), 0);

  const handleLifecycleAction = async (target: SimulationScenarioStatus) => {
    if (!activeScenario.id || !onTransitionStatus) return;
    setUpdatingStatus(true);
    try {
      await onTransitionStatus(activeScenario.id, target);
      setConfirmArchive(false);
      if (loaded?.scenario) {
        setLoaded({
          ...loaded,
          scenario: { ...loaded.scenario, status: target, isActive: target === 'Published' },
        });
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const tabs: Array<{ id: ModalTab; label: string }> = [
    { id: 'overview', label: language === 'vi' ? 'Tổng Quan & Khách Sạn' : 'Overview & Hotel' },
    { id: 'financial', label: `USALI P&L (${finRows.length})` },
    { id: 'operational', label: `KPIs (${opsRows.length})` },
    { id: 'tasks', label: `${language === 'vi' ? 'Thách Thức & Nhiệm Vụ' : 'Challenges & Tasks'} (${challenges.length + tasks.length})` },
    { id: 'decision_gm', label: `${language === 'vi' ? 'Quyết Định & GM' : 'Decisions & GM'} (${decisionOptions.length + roleplayPrompts.length})` },
    { id: 'rubric', label: `Rubric & Comps (${rubrics.length})` },
    ...(isAdminOrLnd
      ? [{ id: 'reference' as ModalTab, label: `${language === 'vi' ? 'Đáp Án Tham Chiếu' : 'Reference Analysis'} (${referenceAnalyses.length})` }]
      : []),
  ];

  const statusColor =
    activeScenario.status === 'Published'
      ? 'text-emerald-700'
      : activeScenario.status === 'Validated'
      ? 'text-sky-700'
      : activeScenario.status === 'Archived'
      ? 'text-slate-500'
      : 'text-amber-700';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 bg-white">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
              <span className="font-bold text-slate-900">{activeScenario.scenarioCode || activeScenario.id}</span>
              <span>·</span>
              <span className={`font-semibold ${statusColor}`}>{activeScenario.status || 'Draft'}</span>
              <span>·</span>
              <span>v{activeScenario.versionNumber || 1} ({activeScenario.datasetVersion || '2026.v1'})</span>
              {previewSummary?.badge && (
                <>
                  <span>·</span>
                  <span className="font-bold text-amber-700">{previewSummary.badge}</span>
                </>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1 truncate">
              {language === 'vi' ? activeScenario.titleVi || activeScenario.titleEn : activeScenario.titleEn}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {hotel?.hotelName || previewSummary?.hotelName || activeScenario.hotelId} · {activeScenario.periodLabel} · {activeScenario.targetRole}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 cursor-pointer shrink-0"
            aria-label="Close scenario preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tab Bar */}
        <div className="px-6 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#0A192F] text-white'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {loading && (
            <div className="p-6 text-center text-slate-500 font-mono">
              {language === 'vi' ? 'Đang tải chi tiết kịch bản...' : 'Loading scenario detail payload...'}
            </div>
          )}
          {errorMsg && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 font-semibold">
              {errorMsg}
            </div>
          )}

          {!loading && activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    {language === 'vi' ? 'Tóm Tắt Bối Cảnh Kinh Doanh' : 'Business Context Summary'}
                  </div>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {language === 'vi' ? activeScenario.summaryVi || activeScenario.summaryEn : activeScenario.summaryEn}
                  </p>
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600">
                    <span>Category: {activeScenario.category || 'Hospitality Finance'}</span>
                    <span>Difficulty: L{activeScenario.difficultyLevel || 2} ({activeScenario.difficultyLabel || 'Intermediate'})</span>
                    <span>Period: {activeScenario.periodLabel || 'Monthly'}</span>
                    <span>Target: {activeScenario.targetRole || 'FC'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>{language === 'vi' ? 'Hồ Sơ Khách Sạn Mô Phỏng' : 'Hotel Property Profile'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Hotel Name</span>
                      <span className="font-bold text-slate-900">{hotel?.hotelName || previewSummary?.hotelName || activeScenario.hotelId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Code / Brand Tier</span>
                      <span className="font-mono text-slate-800">{hotel?.hotelCode || activeScenario.hotelId} · {hotel?.brandTier || '5-Star'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Keys / Available Rooms</span>
                      <span className="font-mono font-bold tabular-nums text-slate-900">
                        {hotel?.totalKeys ?? '—'} keys ({hotel?.roomsAvailable ?? '—'} avail/mo)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">City & Currency</span>
                      <span className="font-mono text-slate-800">{hotel?.city || '—'} · {currency}</span>
                    </div>
                  </div>
                </div>
              </div>

              {previewSummary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[11px] text-slate-500 block">Financial Rows</span>
                    <span className="text-base font-bold font-mono tabular-nums text-slate-900">{previewSummary.childCounts.financialRows}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[11px] text-slate-500 block">Operational KPIs</span>
                    <span className="text-base font-bold font-mono tabular-nums text-slate-900">{previewSummary.childCounts.operationalRows}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[11px] text-slate-500 block">Tasks / Challenges</span>
                    <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                      {previewSummary.childCounts.tasks} / {previewSummary.childCounts.challenges}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[11px] text-slate-500 block">Decisions / GM Turns</span>
                    <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                      {previewSummary.childCounts.decisionOptions} / {previewSummary.childCounts.roleplayPrompts}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[11px] text-slate-500 block">Rubric Total Weight</span>
                    <span className={`text-base font-bold font-mono tabular-nums ${Math.abs(previewSummary.rubricWeightSum - 100) <= 0.05 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {previewSummary.rubricWeightSum}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === 'financial' && (
            <div className="space-y-4">
              {finChecks.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                    <span>Deterministic USALI Arithmetic & Tolerance Checks</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {finChecks.map((chk) => (
                      <div key={chk.id} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {chk.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : chk.severity === 'error' ? (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">
                              {chk.formulaName} · <span className="font-mono text-[11px] text-slate-500">{chk.periodLabel} ({chk.version} / {chk.departmentCode})</span>
                            </div>
                            <div className="text-[11px] text-slate-600">{chk.message}</div>
                          </div>
                        </div>
                        <div className="font-mono text-[11px] tabular-nums text-slate-700 shrink-0">
                          Reported: <strong>{chk.reportedValue.toLocaleString()}</strong> · Expected: <strong>{chk.expectedValue.toLocaleString()}</strong> · Diff: <strong>{chk.difference}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Version</th>
                      <th className="py-2.5 px-3">Dept</th>
                      <th className="py-2.5 px-3 text-right">Dept Rev</th>
                      <th className="py-2.5 px-3 text-right">Dept Exp</th>
                      <th className="py-2.5 px-3 text-right">Dept Profit</th>
                      <th className="py-2.5 px-3 text-right">Total Rev</th>
                      <th className="py-2.5 px-3 text-right">Undist. Exp</th>
                      <th className="py-2.5 px-3 text-right">GOP</th>
                      <th className="py-2.5 px-3 text-right">GOP %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {finRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-slate-800">{row.periodLabel}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{row.version || 'Actual'}</td>
                        <td className="py-2 px-3 text-slate-700">{row.departmentCode}</td>
                        <td className="py-2 px-3 text-right">{fmtCurrency(row.departmentalRevenue, currency)}</td>
                        <td className="py-2 px-3 text-right">{fmtCurrency(row.departmentalExpenses, currency)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">{fmtCurrency(row.departmentalProfit, currency)}</td>
                        <td className="py-2 px-3 text-right">{fmtCurrency(row.totalOperatingRevenue, currency)}</td>
                        <td className="py-2 px-3 text-right">{fmtCurrency(row.totalUndistributedExpenses, currency)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{fmtCurrency(row.gop, currency)}</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-700">{Number(row.gopMarginPct || 0).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && activeTab === 'operational' && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Version</th>
                    <th className="py-2.5 px-3 text-right">Avail Rooms</th>
                    <th className="py-2.5 px-3 text-right">Sold Rooms</th>
                    <th className="py-2.5 px-3 text-right">Occ %</th>
                    <th className="py-2.5 px-3 text-right">ADR</th>
                    <th className="py-2.5 px-3 text-right">RevPAR</th>
                    <th className="py-2.5 px-3 text-right">Rooms Revenue</th>
                    <th className="py-2.5 px-3 text-right">F&B Covers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {opsRows.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 text-slate-800">{op.periodLabel}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{op.version || 'Actual'}</td>
                      <td className="py-2 px-3 text-right">{Number(op.roomsAvailable).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{Number(op.roomsSold).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">{Number(op.occupancyPct).toFixed(2)}%</td>
                      <td className="py-2 px-3 text-right">{fmtCurrency(op.adr, currency)}</td>
                      <td className="py-2 px-3 text-right">{fmtCurrency(op.revpar, currency)}</td>
                      <td className="py-2 px-3 text-right font-semibold">{fmtCurrency(op.roomsRevenue, currency)}</td>
                      <td className="py-2 px-3 text-right">{op.fbCovers?.toLocaleString() ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && activeTab === 'tasks' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>{language === 'vi' ? 'Thách Thức Kinh Doanh' : 'Business Challenges'} ({challenges.length})</span>
                </h3>
                {challenges.map((ch) => (
                  <div key={ch.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                      <span className="font-bold text-slate-900">{ch.challengeCode}</span>
                      <span className={ch.severity === 'Critical' || ch.severity === 'High' ? 'text-rose-700 font-bold' : 'text-amber-700'}>
                        {ch.severity} · {ch.impactArea}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900">{language === 'vi' ? ch.titleVi : ch.titleEn}</div>
                    <p className="text-slate-600 leading-relaxed">{language === 'vi' ? ch.descriptionVi : ch.descriptionEn}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-emerald-700" />
                  <span>{language === 'vi' ? 'Nhiệm Vụ Học Viên' : 'Learner Tasks'} ({tasks.length})</span>
                </h3>
                {tasks
                  .slice()
                  .sort((a, b) => a.taskOrder - b.taskOrder)
                  .map((tk) => (
                    <div key={tk.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                        <span className="font-bold text-slate-900">Step {tk.taskOrder} · {tk.taskId || tk.id}</span>
                        <span>{tk.deliverableType} · {tk.maxPoints} pts</span>
                      </div>
                      <div className="font-bold text-slate-900">{language === 'vi' ? tk.titleVi : tk.titleEn}</div>
                      <p className="text-slate-600 leading-relaxed">{language === 'vi' ? tk.instructionsVi : tk.instructionsEn}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {!loading && activeTab === 'decision_gm' && (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <h3 className="font-bold text-slate-900">
                  {language === 'vi' ? 'Phương Án Quyết Định Chiến Lược' : 'Strategic Decision Options'} ({decisionOptions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {decisionOptions.map((opt) => (
                    <div key={opt.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-bold text-slate-900">{opt.optionCode}</span>
                        <span className={isAdminOrLnd && opt.isOptimal ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {isAdminOrLnd && opt.isOptimal ? 'Optimal Reference · ' : ''}Risk: {opt.riskLevel}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900">{language === 'vi' ? opt.titleVi : opt.titleEn}</div>
                      <div className="font-mono text-[11px] tabular-nums text-amber-700">
                        Impact: {fmtCurrency(opt.financialImpactEstimate, currency)} · GOP +{opt.gopImpactPct}%
                      </div>
                      {isAdminOrLnd && (
                        <p className="text-slate-600 leading-relaxed">{language === 'vi' ? opt.rationaleVi : opt.rationaleEn}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <span>{language === 'vi' ? 'Kịch Bản Đối Thoại GM Roleplay' : 'GM Executive Roleplay Turns'} ({roleplayPrompts.length})</span>
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                  {roleplayPrompts
                    .slice()
                    .sort((a, b) => a.turnOrder - b.turnOrder)
                    .map((rp) => (
                      <div key={rp.id} className="p-3.5 space-y-1">
                        <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                          <span className="font-bold text-slate-900">Turn #{rp.turnOrder} · {rp.speakerRole}</span>
                          <span>{rp.roleplayId || rp.id}</span>
                        </div>
                        <p className="text-slate-800 font-medium">{language === 'vi' ? rp.promptVi : rp.promptEn}</p>
                        {isAdminOrLnd && rp.expectedFocusPoints && (
                          <div className="text-[11px] text-slate-500">
                            Expected Focus: <span className="text-slate-700">{rp.expectedFocusPoints}</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'rubric' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>Evaluation Rubric</span>
                  </span>
                  <span className={`font-mono font-bold tabular-nums ${Math.abs(rubricWeightSum - 100) <= 0.05 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Total Weight: {rubricWeightSum}%
                  </span>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full min-w-[460px] text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3">Criterion</th>
                      <th className="py-2 px-3 text-right">Weight</th>
                      <th className="py-2 px-3 text-right">Max / Pass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rubrics.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.criterionCode}</td>
                        <td className="py-2 px-3 text-slate-800">{language === 'vi' ? r.criterionNameVi : r.criterionNameEn}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold">{r.weightPercent}%</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">{r.maxScore} / {r.passingScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              <div className="lg:col-span-5 border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-slate-900">
                  Competency Mapping ({compMappings.length})
                </div>
                <div className="divide-y divide-slate-100">
                  {compMappings.map((cm) => (
                    <div key={cm.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-slate-900">
                          {cm.competencyCode || cm.competencyId}
                          {cm.workbookCompetencyId && cm.workbookCompetencyId !== cm.competencyId && (
                            <span className="text-amber-700 font-normal"> (← {cm.workbookCompetencyId})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{cm.competencyNameEn || cm.competencyId}</div>
                      </div>
                      <div className="text-right font-mono tabular-nums text-[11px] text-slate-700">
                        <div>L{cm.targetProficiencyLevel} · {cm.weightPercent}%</div>
                        {cm.isPrimary && <div className="text-amber-700 font-bold">Primary</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'reference' && (
            <div className="space-y-3">
              {referenceAnalyses.length === 0 ? (
                <div className="p-6 text-center text-slate-500 border border-slate-200 rounded-xl">
                  {language === 'vi'
                    ? 'Không có bản ghi phân tích tham chiếu hoặc bị ẩn theo phân quyền học viên.'
                    : 'No reference analysis records available or restricted until completion.'}
                </div>
              ) : (
                referenceAnalyses.map((ref) => (
                  <div key={ref.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="font-mono text-[11px] font-bold text-amber-700 uppercase">{ref.topic}</div>
                    <div>
                      <span className="font-bold text-slate-900 block mb-0.5">Root Cause Analysis:</span>
                      <p className="text-slate-700">{language === 'vi' ? ref.rootCauseVi : ref.rootCauseEn}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800">
                      Benchmark Formula: {ref.benchmarkFormula}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block mb-0.5">Recommended Controller Action:</span>
                      <p className="text-slate-700">{language === 'vi' ? ref.recommendedActionVi : ref.recommendedActionEn}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {canManageLifecycle && (
              <>
                {activeScenario.status === 'Draft' && (
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleLifecycleAction('Validated')}
                    className="px-3 py-1.5 rounded-lg border border-sky-300 bg-white text-sky-800 font-semibold hover:bg-sky-50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Mark Validated
                  </button>
                )}
                {activeScenario.status !== 'Published' && activeScenario.status !== 'Archived' && (
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleLifecycleAction('Published')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-600 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Publish to Learners</span>
                  </button>
                )}
                {activeScenario.status === 'Published' && (
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleLifecycleAction('Draft')}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-800 font-semibold hover:bg-amber-50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Unpublish → Draft
                  </button>
                )}
                {activeScenario.status !== 'Archived' ? (
                  confirmArchive ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        disabled={updatingStatus}
                        onClick={() => handleLifecycleAction('Archived')}
                        className="px-3 py-1.5 rounded-lg bg-rose-700 text-white font-semibold hover:bg-rose-600 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Confirm Archive
                      </button>
                      <button
                        onClick={() => setConfirmArchive(false)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={updatingStatus}
                      onClick={() => setConfirmArchive(true)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-semibold hover:bg-slate-100 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive</span>
                    </button>
                  )
                ) : (
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleLifecycleAction('Draft')}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Restore → Draft
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onLaunchSimulation && activeScenario.id && (
              <button
                onClick={() => {
                  const id = activeScenario.id!;
                  onClose();
                  onLaunchSimulation(id);
                }}
                className="px-4 py-2 rounded-lg bg-[#0A192F] text-white font-semibold hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'vi' ? 'Mở Không Gian Mô Phỏng' : 'Launch in Workspace'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {language === 'vi' ? 'Đóng' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
