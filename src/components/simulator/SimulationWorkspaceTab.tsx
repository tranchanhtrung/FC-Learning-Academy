import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  computeCapexMetrics,
  computeFinancialAudit,
  computeRollingForecastScenario,
  generateDatasetSnapshotForScenario,
} from '../../lib/simulatorEngine';
import type {
  LearnerAnalysisWorkspace,
  LearnerDecisionWorkspace,
  LearnerExecutiveReport,
} from '../../types';
import {
  FileSpreadsheet,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  Lock,
  MessageSquare,
  ShieldCheck,
  Info,
} from 'lucide-react';

const EMPTY_ANALYSIS: LearnerAnalysisWorkspace = {
  significantVariances: '',
  rootCauseDepartments: [],
  symptomsVsRootCauses: '',
  quantifiedFinancialImpact: '',
  risksAndOpportunities: '',
  alternativeSolutions: '',
  submittedOccPct: '',
  submittedAdr: '',
  submittedGopMarginPct: '',
  submittedFoodCostPct: '',
  capexUserInputs: { paybackYears: '', roiPct: '', npv: '', irrPct: '' },
};

const EMPTY_DECISION: LearnerDecisionWorkspace = {
  selectedOptionIds: [],
  recommendedAction: '',
  rationale: '',
  estimatedFinancialImpact: '',
  implementationTiming: '',
  responsibleDepartments: '',
  risksAndMitigation: '',
  followupKpis: '',
};

const EMPTY_REPORT = (lang: 'vi' | 'en'): LearnerExecutiveReport => ({
  language: lang,
  executiveSummary: '',
  keyFinancialFindings: '',
  rootCauseAnalysis: '',
  recommendedActions: '',
  financialImpact: '',
  riskAssessment: '',
  implementationPlan: '',
  requiredManagementDecision: '',
});

const DEPT_LIST = [
  'Rooms Division',
  'Sales & Marketing / OTA Revenue',
  'Food & Beverage / Kitchen',
  'Human Resources / Payroll',
  'Engineering / Utilities',
  'Procurement & Cost Control',
];

export const SimulationWorkspaceTab: React.FC = () => {
  const {
    currentUser,
    language,
    courses,
    ojtAssignments,
    simulatorData,
    simulatorWorkspace,
    selectedSimulatorScenarioId,
    setSelectedSimulatorScenarioId,
    activeSimulatorSessionId,
    setActiveSimulatorSessionId,
    saveSimulationSession,
    evaluateSimulationSession,
    setActiveTab,
    showToast,
    hasPermission,
  } = useApp();

  const isSupervisorOrAdmin = hasPermission('preview_draft_scenarios');

  const visibleScenarios = useMemo(
    () => simulatorData.simulationScenarios.filter((s) => isSupervisorOrAdmin || s.status === 'Published'),
    [simulatorData.simulationScenarios, isSupervisorOrAdmin]
  );

  const scenario = useMemo(
    () =>
      visibleScenarios.find((s) => s.id === selectedSimulatorScenarioId) ||
      visibleScenarios[0] ||
      null,
    [visibleScenarios, selectedSimulatorScenarioId]
  );

  const activeSession = useMemo(() => {
    if (!scenario) return null;
    if (activeSimulatorSessionId) {
      const found = simulatorData.simulationSessions.find((s) => s.id === activeSimulatorSessionId);
      if (found) return found;
    }
    return (
      simulatorData.simulationSessions.find(
        (s) => s.scenarioId === scenario.id && s.employeeId === currentUser.id && s.status === 'in_progress'
      ) || null
    );
  }, [activeSimulatorSessionId, simulatorData.simulationSessions, scenario, currentUser.id]);

  const isCompleted = activeSession?.status === 'completed';

  const dataset = useMemo(() => {
    if (!scenario) return null;
    if (activeSession?.datasetSnapshot) return activeSession.datasetSnapshot;
    const wsDs = simulatorWorkspace.datasets[scenario.id];
    if (wsDs) return wsDs;
    const hotel = simulatorData.hotelSimulationProfiles.find((h) => h.id === scenario.hotelId);
    return generateDatasetSnapshotForScenario(scenario, hotel);
  }, [scenario, activeSession, simulatorWorkspace.datasets, simulatorData.hotelSimulationProfiles]);

  const hotelProfile = useMemo(
    () => simulatorData.hotelSimulationProfiles.find((h) => h.id === scenario?.hotelId),
    [simulatorData.hotelSimulationProfiles, scenario]
  );

  const challenges = useMemo(
    () => simulatorData.simulationBusinessChallenges.filter((c) => c.scenarioId === scenario?.id),
    [simulatorData.simulationBusinessChallenges, scenario]
  );
  const tasks = useMemo(
    () =>
      simulatorData.simulationTasks
        .filter((t) => t.scenarioId === scenario?.id)
        .sort((a, b) => a.taskOrder - b.taskOrder),
    [simulatorData.simulationTasks, scenario]
  );
  const decisionOptions = useMemo(
    () => simulatorData.simulationDecisionOptions.filter((o) => o.scenarioId === scenario?.id),
    [simulatorData.simulationDecisionOptions, scenario]
  );
  const referenceAnswers = useMemo(
    () => simulatorData.simulationReferenceAnalysis.filter((r) => r.scenarioId === scenario?.id),
    [simulatorData.simulationReferenceAnalysis, scenario]
  );

  const [step, setStep] = useState<number>(1);
  const [dataRoomSubTab, setDataRoomSubTab] = useState<'pnl' | 'audit' | 'charts'>('pnl');
  const [analysis, setAnalysis] = useState<LearnerAnalysisWorkspace>(EMPTY_ANALYSIS);
  const [decision, setDecision] = useState<LearnerDecisionWorkspace>(EMPTY_DECISION);
  const [execReport, setExecReport] = useState<LearnerExecutiveReport>(() => EMPTY_REPORT(language));
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  // Sync workspace forms cleanly when session/scenario changes
  useEffect(() => {
    if (activeSession) {
      setStep(activeSession.status === 'completed' ? 6 : activeSession.currentStep || 1);
      setAnalysis(activeSession.analysisWorkspace || EMPTY_ANALYSIS);
      setDecision(
        activeSession.decisionWorkspace || {
          ...EMPTY_DECISION,
          selectedOptionIds: activeSession.selectedOptionIds || [],
        }
      );
      setExecReport(activeSession.executiveReport || EMPTY_REPORT(language));
    } else {
      setStep(1);
      const initialRf = dataset?.rollingForecastInputs?.map((m) => ({
        monthLabel: m.monthLabel,
        baseOccPct: m.suggestedBaseOccPct,
        baseAdr: m.suggestedBaseAdr,
        upsideOccPct: m.suggestedUpsideOccPct,
        upsideAdr: m.suggestedUpsideAdr,
        downsideOccPct: m.suggestedDownsideOccPct,
        downsideAdr: m.suggestedDownsideAdr,
      }));
      setAnalysis({
        ...EMPTY_ANALYSIS,
        rollingForecastUserScenarios: initialRf,
      });
      setDecision(EMPTY_DECISION);
      setExecReport(EMPTY_REPORT(language));
    }
  }, [activeSession?.id, scenario?.id]);

  const auditRows = useMemo(() => {
    if (!dataset) return [];
    return computeFinancialAudit(dataset.periods.actual, dataset.periods.budget);
  }, [dataset]);

  const rollingForecastComputed = useMemo(() => {
    if (!dataset?.rollingForecastInputs) return null;
    return computeRollingForecastScenario(
      dataset.rollingForecastInputs,
      analysis.rollingForecastUserScenarios
    );
  }, [dataset, analysis.rollingForecastUserScenarios]);

  const capexComputed = useMemo(() => {
    if (!dataset?.capexAssumptions) return null;
    return computeCapexMetrics(dataset.capexAssumptions);
  }, [dataset]);

  const activeEvaluation = useMemo(() => {
    if (!activeSession) return null;
    return (
      simulatorWorkspace.evaluations.find((e) => e.id === activeSession.evaluationId || e.sessionId === activeSession.id) ||
      (activeSession.evaluation as any) ||
      null
    );
  }, [activeSession, simulatorWorkspace.evaluations]);

  if (!scenario || !dataset) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-600">
        {language === 'vi' ? 'Chưa có kịch bản khả dụng.' : 'No published simulation scenarios available.'}
      </div>
    );
  }

  const fmtCurr = (val: number) =>
    `${dataset.currency === 'VND' ? '' : '$'}${Math.round(val).toLocaleString()}${dataset.currency === 'VND' ? ' ₫' : ''}`;

  const persistDraft = async (nextStep = step) => {
    if (isCompleted) return activeSession;
    setSaving(true);
    try {
      const saved = await saveSimulationSession({
        id: activeSession?.id,
        scenarioId: scenario.id,
        scenarioTitle: language === 'vi' ? scenario.titleVi : scenario.titleEn,
        currentStep: nextStep,
        language,
        analysisWorkspace: analysis,
        decisionWorkspace: decision,
        executiveReport: execReport,
        selectedOptionIds: decision.selectedOptionIds,
        learnerAnalysis: analysis.significantVariances,
        status: 'in_progress',
      });
      if (saved) {
        setActiveSimulatorSessionId(saved.id);
        showToast(language === 'vi' ? 'Đã lưu nháp phiên mô phỏng.' : 'Simulation draft saved.', 'info');
      }
      return saved;
    } finally {
      setSaving(false);
    }
  };

  const handleStepChange = async (targetStep: number) => {
    if (!isCompleted && targetStep > 1 && !activeSession) {
      await persistDraft(targetStep);
    } else if (!isCompleted && activeSession) {
      await persistDraft(targetStep);
    }
    setStep(targetStep);
  };

  const handleSubmitForEvaluation = async () => {
    if (isCompleted) return;
    setEvaluating(true);
    try {
      let sess = activeSession;
      if (!sess) {
        sess = await saveSimulationSession({
          scenarioId: scenario.id,
          scenarioTitle: language === 'vi' ? scenario.titleVi : scenario.titleEn,
          currentStep: 5,
          language,
          analysisWorkspace: analysis,
          decisionWorkspace: decision,
          executiveReport: execReport,
          selectedOptionIds: decision.selectedOptionIds,
          learnerAnalysis: analysis.significantVariances,
          status: 'in_progress',
        });
        if (sess) setActiveSimulatorSessionId(sess.id);
      }
      if (!sess) return;
      const result = await evaluateSimulationSession(sess.id, {
        analysisWorkspace: analysis,
        decisionWorkspace: decision,
        executiveReport: execReport,
        conversation: sess.conversation || [],
        language,
      });
      if (result) {
        setStep(6);
      }
    } finally {
      setEvaluating(false);
    }
  };

  const STEP_LABELS =
    language === 'vi'
      ? ['1. Bối Cảnh', '2. Data Room USALI', '3. Phân Tích', '4. Quyết Định', '5. Báo Cáo GM', '6. Tổng Kết']
      : ['1. Briefing', '2. USALI Data Room', '3. Analysis', '4. Decisions', '5. Executive Memo', '6. Debrief'];

  return (
    <div className="space-y-5">
      {/* Top Scenario Switcher & Status Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={scenario.id}
            onChange={(e) => {
              setActiveSimulatorSessionId(null);
              setSelectedSimulatorScenarioId(e.target.value);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 max-w-md"
          >
            {visibleScenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.scenarioCode} · {language === 'vi' ? s.titleVi : s.titleEn}
              </option>
            ))}
          </select>
          <span className="text-[11px] font-mono text-slate-500">
            {hotelProfile?.hotelName} · v{dataset.datasetVersion}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 font-mono">
              <Lock className="w-3.5 h-3.5" />
              {language === 'vi' ? `Đã Khóa Sổ (${activeSession?.finalScore ?? '—'}/100)` : `Completed Snapshot (${activeSession?.finalScore ?? '—'}/100)`}
            </span>
          ) : (
            <button
              onClick={() => persistDraft(step)}
              disabled={saving}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : language === 'vi' ? 'Lưu Nháp' : 'Save Draft'}</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('simMeeting')}
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Phòng Họp GM & AI Coach' : 'GM Meeting & Coach'}</span>
          </button>
        </div>
      </div>

      {/* 6-Step Progress Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {STEP_LABELS.map((lbl, idx) => {
          const sNum = idx + 1;
          const active = step === sNum;
          const lockedOutOfDebrief = sNum === 6 && !isCompleted;
          return (
            <button
              key={lbl}
              disabled={lockedOutOfDebrief}
              onClick={() => handleStepChange(sNum)}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left transition-colors ${
                active
                  ? 'bg-[#0A192F] text-white border-slate-900'
                  : lockedOutOfDebrief
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 cursor-pointer'
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>

      {/* STEP 1: BUSINESS BRIEFING */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-amber-700">
                {scenario.scenarioCode} · {scenario.periodLabel} · {scenario.usaliReferenceLabel || 'USALI 12th Ed.'}
              </p>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {language === 'vi' ? scenario.titleVi : scenario.titleEn}
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {language === 'vi' ? scenario.summaryVi : scenario.summaryEn}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  {language === 'vi' ? 'Mục Tiêu Học Tập' : 'Learning Objectives'}
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                  {(language === 'vi' ? scenario.learningObjectivesVi : scenario.learningObjectivesEn)?.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  {language === 'vi' ? 'Yêu Cầu Đầu Ra' : 'Expected Deliverables'}
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                  {(language === 'vi' ? scenario.expectedOutputsVi : scenario.expectedOutputsEn)?.map((out, i) => (
                    <li key={i}>{out}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {language === 'vi' ? 'Vấn Đề Kinh Doanh & Nhiệm Vụ Cụ Thể' : 'Business Challenges & Tasks'}
              </h3>
              {challenges.map((ch) => (
                <div key={ch.id} className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 text-xs">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>
                      {ch.challengeCode}: {language === 'vi' ? ch.titleVi : ch.titleEn}
                    </span>
                    <span className="font-mono text-rose-700">{ch.severity}</span>
                  </div>
                  <p className="text-slate-600 mt-1">{language === 'vi' ? ch.descriptionVi : ch.descriptionEn}</p>
                </div>
              ))}
              {tasks.map((tk) => (
                <div key={tk.id} className="p-3.5 rounded-xl border border-slate-200 text-xs flex justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">
                      Task {tk.taskOrder}: {language === 'vi' ? tk.titleVi : tk.titleEn}
                    </div>
                    <p className="text-slate-600 mt-0.5">{language === 'vi' ? tk.instructionsVi : tk.instructionsEn}</p>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-500 shrink-0">{tk.maxPoints} pts</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                {language === 'vi' ? 'Hồ Sơ Khách Sạn Mô Phỏng' : 'Property Profile Snapshot'}
              </h3>
              <dl className="space-y-2 divide-y divide-slate-100">
                <div className="pt-1 flex justify-between">
                  <dt className="text-slate-500">{language === 'vi' ? 'Khách sạn' : 'Property'}</dt>
                  <dd className="font-semibold text-slate-900 text-right">{dataset.hotelName}</dd>
                </div>
                <div className="pt-2 flex justify-between">
                  <dt className="text-slate-500">{language === 'vi' ? 'Quy mô' : 'Scale'}</dt>
                  <dd className="font-mono text-slate-900">{dataset.numberOfRooms} keys · {dataset.numberOfOutlets} outlets</dd>
                </div>
                <div className="pt-2 flex justify-between">
                  <dt className="text-slate-500">{language === 'vi' ? 'Phân khúc' : 'Segment'}</dt>
                  <dd className="font-medium text-slate-800 text-right">{dataset.marketSegment}</dd>
                </div>
                <div className="pt-2 flex justify-between">
                  <dt className="text-slate-500">{language === 'vi' ? 'Chuẩn báo cáo' : 'Basis'}</dt>
                  <dd className="font-medium text-slate-800 text-right">{dataset.reportingBasis}</dd>
                </div>
                <div className="pt-2">
                  <dt className="text-slate-500 mb-1">{language === 'vi' ? 'Giả định Ngân sách' : 'Budget Assumptions'}</dt>
                  <dd className="text-slate-700 leading-relaxed">{dataset.budgetAssumptions}</dd>
                </div>
              </dl>

              <button
                onClick={() => handleStepChange(2)}
                className="w-full mt-3 py-2.5 rounded-xl bg-[#0A192F] text-white font-bold text-xs hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{language === 'vi' ? 'Mở Kho Dữ Liệu Tài Chính (Bước 2)' : 'Enter USALI Data Room (Step 2)'}</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: USALI DATA ROOM */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {language === 'vi' ? 'Kho Dữ Liệu Tài Chính & Vận Hành (USALI)' : 'USALI Financial & Operational Data Room'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{dataset.operationalAssumptions}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setDataRoomSubTab('pnl')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  dataRoomSubTab === 'pnl' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {language === 'vi' ? 'Báo Cáo P&L' : 'USALI P&L'}
              </button>
              <button
                onClick={() => setDataRoomSubTab('audit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  dataRoomSubTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {language === 'vi' ? 'Công Thức & Mẫu Số' : 'Audit Trail'}
              </button>
              <button
                onClick={() => setDataRoomSubTab('charts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  dataRoomSubTab === 'charts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {language === 'vi' ? 'Biểu Đồ Biến Động' : 'Charts'}
              </button>
            </div>
          </div>

          {dataRoomSubTab === 'pnl' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] uppercase text-slate-500">
                    <th className="py-2.5 px-3 text-left">{language === 'vi' ? 'Chỉ Tiêu USALI' : 'USALI Line Item'}</th>
                    <th className="py-2.5 px-3 text-right">Actual</th>
                    <th className="py-2.5 px-3 text-right">Budget</th>
                    <th className="py-2.5 px-3 text-right">Forecast</th>
                    <th className="py-2.5 px-3 text-right">Last Year</th>
                    <th className="py-2.5 px-3 text-right">{language === 'vi' ? 'Chênh Lệch (Act-Bud)' : 'Var (Act-Bud)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {[
                    { label: 'Available Rooms', key: 'availableRooms', type: 'int' },
                    { label: 'Occupied Rooms', key: 'occupiedRooms', type: 'int' },
                    { label: 'Occupancy %', key: 'occupancyPct', type: 'pct' },
                    { label: 'ADR', key: 'adr', type: 'curr' },
                    { label: 'RevPAR', key: 'revpar', type: 'curr' },
                    { label: 'Rooms Revenue (Schedule 1)', key: 'roomsRevenue', type: 'curr', bold: true },
                    { label: 'Rooms Departmental Profit', key: 'roomsProfit', type: 'curr' },
                    { label: 'Food & Beverage Revenue (Schedule 2)', key: 'fbRevenue', type: 'curr', bold: true },
                    { label: 'Food Cost % (of Food Rev)', key: 'foodCostPct', type: 'pct' },
                    { label: 'Beverage Cost % (of Bev Rev)', key: 'beverageCostPct', type: 'pct' },
                    { label: 'F&B Departmental Profit', key: 'fbProfit', type: 'curr' },
                    { label: 'Other Operating Revenue (Spa/Other)', key: 'otherOperatingRevenue', type: 'curr' },
                    { label: 'Total Operating Revenue', key: 'totalOperatingRevenue', type: 'curr', bold: true },
                    { label: 'Total Departmental Expenses', key: 'totalDepartmentalExpenses', type: 'curr' },
                    { label: 'Total Departmental Profit', key: 'totalDepartmentalProfit', type: 'curr', bold: true },
                    { label: 'Admin & General (A&G)', key: 'adminAndGeneral', type: 'curr' },
                    { label: 'Sales & Marketing', key: 'salesAndMarketing', type: 'curr' },
                    { label: 'Property Operations & Maintenance', key: 'propertyOperationsMaintenance', type: 'curr' },
                    { label: 'Utilities / Energy', key: 'utilities', type: 'curr' },
                    { label: 'Total Undistributed Expenses', key: 'totalUndistributedExpenses', type: 'curr', bold: true },
                    { label: 'Gross Operating Profit (GOP)', key: 'gop', type: 'curr', bold: true, highlight: true },
                    { label: 'GOP Margin %', key: 'gopMarginPct', type: 'pct', bold: true, highlight: true },
                    { label: 'Total Labor Cost % of Revenue', key: 'laborCostPct', type: 'pct' },
                    { label: 'EBITDA (After Management Fees)', key: 'ebitda', type: 'curr', bold: true },
                  ].map((row) => {
                    const a = (dataset.periods.actual as any)[row.key] as number;
                    const b = (dataset.periods.budget as any)[row.key] as number;
                    const f = (dataset.periods.forecast as any)[row.key] as number;
                    const ly = (dataset.periods.lastYear as any)[row.key] as number;
                    const diff = a - b;
                    const fmtCell = (v: number) =>
                      row.type === 'pct' ? `${v.toFixed(1)}%` : row.type === 'int' ? Math.round(v).toLocaleString() : fmtCurr(v);
                    return (
                      <tr key={row.key} className={row.highlight ? 'bg-amber-50/60' : undefined}>
                        <td className={`py-2 px-3 font-sans ${row.bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                          {row.label}
                        </td>
                        <td className={`py-2 px-3 text-right ${row.bold ? 'font-bold text-slate-900' : ''}`}>{fmtCell(a)}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{fmtCell(b)}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{fmtCell(f)}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{fmtCell(ly)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-800">
                          {diff >= 0 ? '+' : ''}
                          {row.type === 'pct' ? `${diff.toFixed(1)} pts` : row.type === 'int' ? Math.round(diff).toLocaleString() : fmtCurr(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {dataRoomSubTab === 'audit' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] uppercase text-slate-500">
                    <th className="py-2.5 px-3 text-left">{language === 'vi' ? 'Chỉ Số' : 'Metric'}</th>
                    <th className="py-2.5 px-3 text-left">{language === 'vi' ? 'Công Thức & Mẫu Số' : 'Formula & Denominator'}</th>
                    <th className="py-2.5 px-3 text-right">Actual</th>
                    <th className="py-2.5 px-3 text-right">Budget</th>
                    <th className="py-2.5 px-3 text-right">{language === 'vi' ? 'Phân Loại USALI' : 'Classification'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditRows.map((item) => (
                    <tr key={item.metricKey}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {language === 'vi' ? item.labelVi : item.labelEn}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="font-mono text-[11px] text-slate-800">{item.formula}</div>
                        <div className="text-[11px] text-slate-500">{item.denominatorDefinition}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {item.actualValue === null
                          ? 'N/A'
                          : item.unit === 'percent'
                          ? `${item.actualValue}%`
                          : fmtCurr(item.actualValue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {item.budgetValue === null
                          ? 'N/A'
                          : item.unit === 'percent'
                          ? `${item.budgetValue}%`
                          : fmtCurr(item.budgetValue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        <span
                          className={
                            item.classification === 'Favorable'
                              ? 'text-emerald-700'
                              : item.classification === 'Unfavorable'
                              ? 'text-rose-700'
                              : 'text-slate-500'
                          }
                        >
                          {item.classification}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {dataRoomSubTab === 'charts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Simple Clean SVG Comparison Chart */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {language === 'vi' ? 'So Sánh Doanh Thu & GOP (Actual vs Budget)' : 'Revenue vs GOP (Actual vs Budget)'}
                </h3>
                {(() => {
                  const actRev = dataset.periods.actual.totalOperatingRevenue;
                  const budRev = dataset.periods.budget.totalOperatingRevenue;
                  const actGop = dataset.periods.actual.gop;
                  const budGop = dataset.periods.budget.gop;
                  const maxVal = Math.max(actRev, budRev, 1);
                  const bars = [
                    { label: 'Actual Rev', val: actRev, color: '#0A192F' },
                    { label: 'Budget Rev', val: budRev, color: '#64748B' },
                    { label: 'Actual GOP', val: actGop, color: '#D97706' },
                    { label: 'Budget GOP', val: budGop, color: '#10B981' },
                  ];
                  return (
                    <div className="space-y-2.5">
                      {bars.map((b) => (
                        <div key={b.label} className="space-y-1 text-xs">
                          <div className="flex justify-between font-mono tabular-nums">
                            <span className="font-semibold text-slate-700">{b.label}</span>
                            <span className="font-bold text-slate-900">{fmtCurr(b.val)}</span>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-md overflow-hidden">
                            <div
                              className="h-full rounded-md"
                              style={{ width: `${Math.max(4, Math.round((b.val / maxVal) * 100))}%`, backgroundColor: b.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {language === 'vi' ? 'Chỉ Số Kênh & Chi Phí Chính (Actual vs Budget)' : 'Mix & Cost Ratios (Actual vs Budget)'}
                </h3>
                <div className="space-y-2.5 text-xs font-mono tabular-nums">
                  {[
                    { label: 'OTA Channel Mix %', a: dataset.periods.actual.otaSharePct, b: dataset.periods.budget.otaSharePct },
                    { label: 'GOP Margin %', a: dataset.periods.actual.gopMarginPct, b: dataset.periods.budget.gopMarginPct },
                    { label: 'Food Cost %', a: dataset.periods.actual.foodCostPct, b: dataset.periods.budget.foodCostPct },
                    { label: 'Total Labor Cost %', a: dataset.periods.actual.laborCostPct, b: dataset.periods.budget.laborCostPct },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="font-sans text-slate-700">{r.label}</span>
                      <span>
                        <strong>{r.a}%</strong> <span className="text-slate-400">vs {r.b}% Bud</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Special Data Room Exhibits for Rolling Forecast & CAPEX */}
          {dataset.rollingForecastInputs && (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                <span>{language === 'vi' ? 'Dữ Liệu PMS Booking Pace & Nhóm Khách Q2' : 'PMS Booking Pace & MICE Group Pickup'}</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse font-mono tabular-nums">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] text-slate-500">
                      <th className="py-2 px-3">Month</th>
                      <th className="py-2 px-3 text-right">Avail Rooms</th>
                      <th className="py-2 px-3 text-right">Budget Occ% / ADR</th>
                      <th className="py-2 px-3 text-right">On-the-Books Pace%</th>
                      <th className="py-2 px-3 text-right">Group Nights</th>
                      <th className="py-2 px-3 text-right">Cancel Rate%</th>
                      <th className="py-2 px-3 text-right">F&B / Occ Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataset.rollingForecastInputs.map((m) => (
                      <tr key={m.monthLabel}>
                        <td className="py-2 px-3 font-sans font-semibold">{m.monthLabel}</td>
                        <td className="py-2 px-3 text-right">{m.availableRooms.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right">{m.budgetOccupancyPct}% / {fmtCurr(m.budgetAdr)}</td>
                        <td className="py-2 px-3 text-right">{m.bookingPacePct}%</td>
                        <td className="py-2 px-3 text-right">{m.groupRoomsBooked.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right">{m.cancellationRatePct}%</td>
                        <td className="py-2 px-3 text-right">{fmtCurr(m.fbCapturePerOccupiedRoom)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dataset.capexAssumptions && (
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-2">
                <Calculator className="w-4 h-4 text-amber-600" />
                <span>{language === 'vi' ? dataset.capexAssumptions.equipmentNameVi : dataset.capexAssumptions.equipmentNameEn}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-sans text-slate-500">Initial Investment</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{fmtCurr(dataset.capexAssumptions.initialInvestment)}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-sans text-slate-500">Annual Energy + Labor Savings</div>
                  <div className="text-sm font-bold text-emerald-700 mt-0.5">
                    {fmtCurr(dataset.capexAssumptions.annualEnergySavings + dataset.capexAssumptions.annualLaborSavings)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-sans text-slate-500">Annual Banquet Uplift - Maint.</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    +{fmtCurr(dataset.capexAssumptions.annualIncrementalRevenue)} / -{fmtCurr(dataset.capexAssumptions.annualMaintenanceCost)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-sans text-slate-500">Useful Life / Hurdle WACC</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {dataset.capexAssumptions.usefulLifeYears} yrs · {dataset.capexAssumptions.discountRatePct}%
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => handleStepChange(1)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {language === 'vi' ? 'Bước 1' : 'Step 1'}
            </button>
            <button
              onClick={() => handleStepChange(3)}
              className="px-4 py-2 rounded-xl bg-[#0A192F] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>{language === 'vi' ? 'Sang Bước 3: Không Gian Phân Tích' : 'Next: Analysis Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ANALYSIS WORKSPACE */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {language === 'vi' ? 'Bước 3: Không Gian Phân Tích & Kiểm Chứng Số Liệu' : 'Step 3: Quantitative & Root Cause Analysis Workspace'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'vi'
                ? 'Đáp án chuẩn được ẩn cho tới khi bạn nộp bài. Hãy tự tính và nhập kết quả kiểm chứng.'
                : 'Reference answer keys stay hidden until submission. Compute and record your verified metrics below.'}
            </p>
          </div>

          {/* Interactive Rolling Forecast Grid OR CAPEX Verification OR Standard USALI KPIs */}
          {scenario.scenarioKind === 'rolling_forecast' && dataset.rollingForecastInputs ? (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {language === 'vi'
                  ? 'Mô Hình Dự Báo Cuốn 3 Tháng (Chỉnh Occupancy % & ADR theo 3 Kịch Bản)'
                  : '3-Month Rolling Forecast Interactive Inputs (Base / Upside / Downside)'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-300 text-[11px] text-slate-600 text-left">
                      <th className="py-2 px-2">Month</th>
                      <th className="py-2 px-2">Base Occ%</th>
                      <th className="py-2 px-2">Base ADR</th>
                      <th className="py-2 px-2">Upside Occ%</th>
                      <th className="py-2 px-2">Upside ADR</th>
                      <th className="py-2 px-2">Downside Occ%</th>
                      <th className="py-2 px-2">Downside ADR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dataset.rollingForecastInputs.map((m, idx) => {
                      const list = analysis.rollingForecastUserScenarios || [];
                      const row = list[idx] || {
                        monthLabel: m.monthLabel,
                        baseOccPct: m.suggestedBaseOccPct,
                        baseAdr: m.suggestedBaseAdr,
                        upsideOccPct: m.suggestedUpsideOccPct,
                        upsideAdr: m.suggestedUpsideAdr,
                        downsideOccPct: m.suggestedDownsideOccPct,
                        downsideAdr: m.suggestedDownsideAdr,
                      };
                      const updateCell = (field: keyof typeof row, val: number) => {
                        if (isCompleted) return;
                        const next = dataset.rollingForecastInputs!.map((dm, i) => {
                          const existing = list[i] || {
                            monthLabel: dm.monthLabel,
                            baseOccPct: dm.suggestedBaseOccPct,
                            baseAdr: dm.suggestedBaseAdr,
                            upsideOccPct: dm.suggestedUpsideOccPct,
                            upsideAdr: dm.suggestedUpsideAdr,
                            downsideOccPct: dm.suggestedDownsideOccPct,
                            downsideAdr: dm.suggestedDownsideAdr,
                          };
                          return i === idx ? { ...existing, [field]: val } : existing;
                        });
                        setAnalysis({ ...analysis, rollingForecastUserScenarios: next });
                      };
                      return (
                        <tr key={m.monthLabel}>
                          <td className="py-2 px-2 font-sans font-bold">{m.monthLabel}</td>
                          {(
                            [
                              'baseOccPct',
                              'baseAdr',
                              'upsideOccPct',
                              'upsideAdr',
                              'downsideOccPct',
                              'downsideAdr',
                            ] as const
                          ).map((field) => (
                            <td key={field} className="py-1.5 px-1.5">
                              <input
                                type="number"
                                disabled={isCompleted}
                                value={row[field]}
                                onChange={(e) => updateCell(field, Number(e.target.value) || 0)}
                                className="w-20 px-2 py-1 rounded border border-slate-300 bg-white text-right text-xs"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {rollingForecastComputed && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  {(['Budget', 'Base', 'Upside', 'Downside'] as const).map((k) => {
                    const tot = rollingForecastComputed.totals[k];
                    return (
                      <div key={k} className="p-3 rounded-xl bg-white border border-slate-200 font-mono tabular-nums text-xs">
                        <div className="font-sans font-bold text-slate-900">{k} Q2 Total</div>
                        <div className="text-slate-600 mt-1">Rev: {fmtCurr(tot.totalRevenue)}</div>
                        <div className="font-bold text-amber-700">
                          GOP: {fmtCurr(tot.gop)} ({tot.gopMarginPct}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : scenario.scenarioKind === 'capex' && dataset.capexAssumptions ? (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {language === 'vi'
                  ? 'Kiểm Chứng Tính Toán CAPEX (Nhập Số Bạn Tính Được Trước Khi Chấm Điểm)'
                  : 'CAPEX Underwriting Verification Inputs'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payback (Years)</label>
                  <input
                    type="text"
                    disabled={isCompleted}
                    placeholder="e.g. 2.73"
                    value={analysis.capexUserInputs?.paybackYears || ''}
                    onChange={(e) =>
                      setAnalysis({
                        ...analysis,
                        capexUserInputs: { ...analysis.capexUserInputs, paybackYears: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lifetime ROI (%)</label>
                  <input
                    type="text"
                    disabled={isCompleted}
                    placeholder="e.g. 120"
                    value={analysis.capexUserInputs?.roiPct || ''}
                    onChange={(e) =>
                      setAnalysis({
                        ...analysis,
                        capexUserInputs: { ...analysis.capexUserInputs, roiPct: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NPV @ {dataset.capexAssumptions.discountRatePct}%</label>
                  <input
                    type="text"
                    disabled={isCompleted}
                    placeholder="e.g. 107448"
                    value={analysis.capexUserInputs?.npv || ''}
                    onChange={(e) =>
                      setAnalysis({
                        ...analysis,
                        capexUserInputs: { ...analysis.capexUserInputs, npv: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IRR (%)</label>
                  <input
                    type="text"
                    disabled={isCompleted}
                    placeholder="e.g. 28.4"
                    value={analysis.capexUserInputs?.irrPct || ''}
                    onChange={(e) =>
                      setAnalysis({
                        ...analysis,
                        capexUserInputs: { ...analysis.capexUserInputs, irrPct: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>
              {isCompleted && capexComputed && (
                <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs font-mono">
                  Verified Deterministic CAPEX Result: Net Cash Flow {fmtCurr(capexComputed.annualNetCashFlow)}/yr · Payback {capexComputed.paybackYears} yrs · ROI {capexComputed.roiPct}% · NPV {fmtCurr(capexComputed.npv)} · IRR {capexComputed.irrPct}%
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {language === 'vi' ? 'Kiểm Chứng 4 Chỉ Số USALI Thực Tế (Actual)' : 'Verify 4 Core Actual USALI KPIs'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Occupancy (%)</label>
                  <input
                    type="text"
                    disabled={isCompleted}
                    placeholder="e.g. 81.6"
                    value={analysis.submittedOccPct || ''}
                    onChange={(e) => setAnalysis({ ...analysis, submittedOccPct: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ADR ({dataset.currency})</label>
                  <input
                    type="text"
                    disabled={isCompleted}
                    placeholder="e.g. 138"
                    value={analysis.submittedAdr || ''}
                    onChange={(e) => setAnalysis({ ...analysis, submittedAdr: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GOP Margin (%)</label>
                  <input
                    type="text"
                    disabled={isCompleted}
                    placeholder="e.g. 24.7"
                    value={analysis.submittedGopMarginPct || ''}
                    onChange={(e) => setAnalysis({ ...analysis, submittedGopMarginPct: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Food Cost (%)</label>
                  <input
                    type="text"
                    disabled={isCompleted}
                    placeholder="e.g. 36.2"
                    value={analysis.submittedFoodCostPct || ''}
                    onChange={(e) => setAnalysis({ ...analysis, submittedFoodCostPct: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Root Cause Department Multi-Select */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              {language === 'vi' ? 'Bộ Phận Liên Quan Nguyên Nhân Gốc' : 'Responsible Root-Cause Departments'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEPT_LIST.map((dept) => {
                const checked = analysis.rootCauseDepartments.includes(dept);
                return (
                  <label
                    key={dept}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer ${
                      checked ? 'border-amber-500 bg-amber-50/70 font-semibold text-slate-900' : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={isCompleted}
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? analysis.rootCauseDepartments.filter((d) => d !== dept)
                          : [...analysis.rootCauseDepartments, dept];
                        setAnalysis({ ...analysis, rootCauseDepartments: next });
                      }}
                    />
                    <span>{dept}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {language === 'vi' ? 'Biến Động Trọng Yếu Phát Hiện Được' : 'Significant Financial Variances'}
              </label>
              <textarea
                rows={4}
                disabled={isCompleted}
                value={analysis.significantVariances}
                onChange={(e) => setAnalysis({ ...analysis, significantVariances: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {language === 'vi' ? 'Phân Tách Triệu Chứng vs Nguyên Nhân Gốc' : 'Symptoms vs Underlying Root Causes'}
              </label>
              <textarea
                rows={4}
                disabled={isCompleted}
                value={analysis.symptomsVsRootCauses}
                onChange={(e) => setAnalysis({ ...analysis, symptomsVsRootCauses: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {language === 'vi' ? 'Lượng Hóa Tác Động Tài Chính (USD / VND)' : 'Quantified Financial Impact'}
              </label>
              <textarea
                rows={3}
                disabled={isCompleted}
                value={analysis.quantifiedFinancialImpact}
                onChange={(e) => setAnalysis({ ...analysis, quantifiedFinancialImpact: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {language === 'vi' ? 'Rủi Ro Vận Hành & Cơ Hội Cải Thiện' : 'Business Risks & Margin Opportunities'}
              </label>
              <textarea
                rows={3}
                disabled={isCompleted}
                value={analysis.risksAndOpportunities}
                onChange={(e) => setAnalysis({ ...analysis, risksAndOpportunities: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => handleStepChange(2)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {language === 'vi' ? 'Bước 2' : 'Step 2'}
            </button>
            <button
              onClick={() => handleStepChange(4)}
              className="px-4 py-2 rounded-xl bg-[#0A192F] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>{language === 'vi' ? 'Sang Bước 4: Ra Quyết Định' : 'Next: Decision Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DECISION WORKSPACE */}
      {step === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {language === 'vi' ? 'Bước 4: Đánh Đổi Phương Án & Quyết Định Điều Hành' : 'Step 4: Strategic Decision Trade-offs & Action Plan'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'vi'
                ? 'Chọn phương án tối ưu và thiết kế kế hoạch triển khai cùng KPI theo dõi.'
                : 'Evaluate management options objectively (optimal tags stay concealed until evaluation) and specify controls.'}
            </p>
          </div>

          <div className="space-y-3">
            {decisionOptions.map((opt) => {
              const selected = decision.selectedOptionIds.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`block p-4 rounded-xl border cursor-pointer transition-colors ${
                    selected ? 'border-amber-500 bg-amber-50/60' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      disabled={isCompleted}
                      checked={selected}
                      onChange={() => {
                        const nextIds = selected
                          ? decision.selectedOptionIds.filter((x) => x !== opt.id)
                          : [...decision.selectedOptionIds, opt.id];
                        setDecision({ ...decision, selectedOptionIds: nextIds });
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 text-xs space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          {opt.optionCode}: {language === 'vi' ? opt.titleVi : opt.titleEn}
                        </span>
                        <span className="font-mono text-[11px] text-slate-600">
                          Est. Impact: {fmtCurr(opt.financialImpactEstimate)} · GOP {opt.gopImpactPct >= 0 ? '+' : ''}
                          {opt.gopImpactPct}% · Risk: {opt.riskLevel}
                        </span>
                      </div>
                      {isCompleted && (
                        <p className="text-slate-600 pt-1 border-t border-slate-200/70">
                          {language === 'vi' ? opt.rationaleVi : opt.rationaleEn}{' '}
                          {opt.isOptimal && <strong className="text-emerald-700">[Optimal Choice]</strong>}
                        </p>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {language === 'vi' ? 'Hành Động Khuyến Nghị Trọng Tâm' : 'Recommended Management Action'}
              </label>
              <textarea
                rows={3}
                disabled={isCompleted}
                value={decision.recommendedAction}
                onChange={(e) => setDecision({ ...decision, recommendedAction: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {language === 'vi' ? 'Cơ Sở Tài Chính & Vận Hành' : 'Financial & Commercial Rationale'}
              </label>
              <textarea
                rows={3}
                disabled={isCompleted}
                value={decision.rationale}
                onChange={(e) => setDecision({ ...decision, rationale: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {language === 'vi' ? 'Ước Tính Tác Động & Tiến Độ' : 'Estimated Impact & Implementation Timing'}
              </label>
              <input
                type="text"
                disabled={isCompleted}
                placeholder="e.g. +$42,000 GOP recovery within 30 days"
                value={decision.estimatedFinancialImpact}
                onChange={(e) => setDecision({ ...decision, estimatedFinancialImpact: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {language === 'vi' ? 'Kiểm Soát Nội Bộ & KPI Theo Dõi' : 'Internal Controls, Risks & Follow-up KPIs'}
              </label>
              <input
                type="text"
                disabled={isCompleted}
                placeholder="e.g. Daily par-stock sign-off, cap overtime at 4%, weekly flash GOP%"
                value={decision.risksAndMitigation}
                onChange={(e) => setDecision({ ...decision, risksAndMitigation: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => handleStepChange(3)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {language === 'vi' ? 'Bước 3' : 'Step 3'}
            </button>
            <button
              onClick={() => handleStepChange(5)}
              className="px-4 py-2 rounded-xl bg-[#0A192F] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>{language === 'vi' ? 'Sang Bước 5: Báo Cáo Trình GM' : 'Next: Executive Presentation'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: EXECUTIVE PRESENTATION */}
      {step === 5 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {language === 'vi' ? 'Bước 5: Báo Cáo Điều Hành Gửi Tổng Giám Đốc (GM Memo)' : 'Step 5: Executive Presentation & GM Memo'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'vi'
                  ? 'Tổng hợp ngắn gọn theo ngôn ngữ điều hành để GM ký duyệt hành động.'
                  : 'Synthesize boardroom-ready findings, financial impact, and the specific GM sign-off required.'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">{language === 'vi' ? 'Ngôn ngữ báo cáo:' : 'Memo Language:'}</span>
              <select
                disabled={isCompleted}
                value={execReport.language}
                onChange={(e) => setExecReport({ ...execReport, language: e.target.value as 'vi' | 'en' })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold"
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {(
              [
                ['executiveSummary', language === 'vi' ? '1. Tóm Tắt Điều Hành (Executive Summary)' : '1. Executive Summary'],
                ['keyFinancialFindings', language === 'vi' ? '2. Phát Hiện Tài Chính Trọng Yếu' : '2. Key Financial Findings'],
                ['rootCauseAnalysis', language === 'vi' ? '3. Nguyên Nhân Gốc Rễ' : '3. Root Cause Analysis'],
                ['recommendedActions', language === 'vi' ? '4. Đề Xuất Hành Động & Phân Công' : '4. Recommended Actions'],
                ['financialImpact', language === 'vi' ? '5. Tác Động Tài Chính Dự Kiến' : '5. Expected Financial Impact'],
                ['riskAssessment', language === 'vi' ? '6. Đánh Giá Rủi Ro & Kiểm Soát' : '6. Risk Assessment & Controls'],
                ['implementationPlan', language === 'vi' ? '7. Lộ Trình Triển Khai 30/60/90 Ngày' : '7. Implementation Timeline'],
                ['requiredManagementDecision', language === 'vi' ? '8. Đề Xuất GM Phê Duyệt' : '8. Required GM Sign-Off Decision'],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="block font-bold text-slate-800 mb-1">{label}</label>
                <textarea
                  rows={3}
                  disabled={isCompleted}
                  value={execReport[field]}
                  onChange={(e) => setExecReport({ ...execReport, [field]: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => handleStepChange(4)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {language === 'vi' ? 'Bước 4' : 'Step 4'}
            </button>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={async () => {
                  await persistDraft(5);
                  setActiveTab('simMeeting');
                }}
                className="px-4 py-2.5 rounded-xl border border-amber-500 text-amber-800 text-xs font-bold hover:bg-amber-50 cursor-pointer"
              >
                {language === 'vi' ? 'Vào Phản Biện Trước Với GM' : 'Rehearse in GM Meeting First'}
              </button>
              {!isCompleted && (
                <button
                  onClick={handleSubmitForEvaluation}
                  disabled={evaluating}
                  className="px-5 py-2.5 rounded-xl bg-[#0A192F] text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {evaluating
                      ? language === 'vi'
                        ? 'Đang Chấm Điểm...'
                        : 'Evaluating Submission...'
                      : language === 'vi'
                      ? 'Nộp Bài & Chấm Điểm Chính Thức'
                      : 'Submit & Evaluate Simulation'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: SIMULATION DEBRIEF (UNLOCKED AFTER COMPLETION) */}
      {step === 6 && isCompleted && (
        <div className="space-y-5">
          {/* Advisory Disclaimer */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              {activeEvaluation?.advisoryDisclaimer ||
                (language === 'vi'
                  ? 'Kết quả mô phỏng mang tính đánh giá thực hành và tham khảo IDP; không tự động ghi đè hồ sơ đánh giá năng lực chính thức khi chưa có xác nhận của người đánh giá.'
                  : 'Simulation results are advisory practice evidence and never automatically overwrite approved official competency ratings.')}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'vi' ? 'KẾT QUẢ CHẤM ĐIỂM ĐỘC LẬP & PHÂN TÍCH CHUẨN' : 'SIMULATION DEBRIEF & REFERENCE KEY'}
                </p>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {language === 'vi' ? scenario.titleVi : scenario.titleEn}
                </h2>
              </div>
              <div className="text-right font-mono tabular-nums">
                <div className="text-xs text-slate-500">
                  {activeEvaluation?.adjustedTotalScore !== undefined ? 'Assessor Final Score' : 'Evaluated Score'}
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  {activeEvaluation?.adjustedTotalScore ?? activeEvaluation?.totalScore ?? activeSession?.finalScore ?? 0}
                  <span className="text-sm text-slate-400"> / 100</span>
                </div>
              </div>
            </div>

            {/* 6-Criterion Scorecard */}
            {activeEvaluation?.scoringCriteria && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeEvaluation.scoringCriteria.map((c: any) => (
                  <div key={c.criterionCode} className="p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>
                        {language === 'vi' ? c.criterionNameVi : c.criterionNameEn} ({c.weightPercent}%)
                      </span>
                      <span className="font-mono tabular-nums text-amber-700">
                        {c.score}/100 · L{c.behavioralLevel}
                      </span>
                    </div>
                    <p className="text-slate-600">{c.behavioralAnchor}</p>
                    <p className="text-[11px] font-mono text-slate-500">{c.evidence}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Calculation Errors Check & Official Reference Key */}
            {activeEvaluation?.calculationErrors?.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5 text-xs">
                <div className="font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{language === 'vi' ? 'Sai Lệch Số Liệu Phát Hiện' : 'Deterministic Calculation Variances'}</span>
                </div>
                <ul className="list-disc pl-5 text-rose-900 space-y-1 font-mono">
                  {activeEvaluation.calculationErrors.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {referenceAnswers.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>{language === 'vi' ? 'Phân Tích Chuẩn Của Hội Đồng FC' : 'Official Financial Controller Reference Analysis'}</span>
                </div>
                {referenceAnswers.map((ref) => (
                  <div key={ref.id} className="space-y-1 text-slate-700">
                    <p>
                      <strong>{language === 'vi' ? 'Nguyên nhân gốc:' : 'Root Cause:'}</strong>{' '}
                      {language === 'vi' ? ref.rootCauseVi : ref.rootCauseEn}
                    </p>
                    <p>
                      <strong>{language === 'vi' ? 'Hành động khuyến nghị:' : 'Recommended Action:'}</strong>{' '}
                      {language === 'vi' ? ref.recommendedActionVi : ref.recommendedActionEn}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">{ref.benchmarkFormula}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Courses & OJT Recommendations */}
            {activeEvaluation?.recommendedCourseIds?.length > 0 && (
              <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
                <div className="font-bold text-slate-800">
                  {language === 'vi' ? 'Khóa Học & OJT Đề Xuất Bổ Sung' : 'Recommended Academy Courses & OJT Follow-Up'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeEvaluation.recommendedCourseIds.map((cid: string) => {
                    const crs = courses.find((c) => c.id === cid);
                    return (
                      <span key={cid} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800">
                        {crs ? `${crs.code}: ${language === 'vi' ? crs.titleVi : crs.titleEn}` : cid}
                      </span>
                    );
                  })}
                  {activeEvaluation.recommendedPracticalIds?.map((oid: string) => {
                    const ojt = ojtAssignments.find((o) => o.id === oid);
                    return (
                      <span key={oid} className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/50 font-medium text-amber-900">
                        {ojt ? `OJT: ${language === 'vi' ? ojt.titleVi : ojt.titleEn}` : oid}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
