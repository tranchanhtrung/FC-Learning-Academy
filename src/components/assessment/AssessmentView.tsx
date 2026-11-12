import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { RadarChart } from '../common/RadarChart';
import {
  AssessmentRecord,
  ProficiencyLevel,
  IndividualDevelopmentPlan,
  IDPItem,
} from '../../types';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Download,
  Calendar,
  History,
  Plus,
  Eye,
  Award,
  Filter,
  Clock,
  Send,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sliders,
  Check,
} from 'lucide-react';

export const AssessmentView: React.FC = () => {
  const {
    currentUser,
    users,
    domains,
    competencies,
    assessments,
    saveAssessment,
    generateIDPFromGap,
    updateIDPItem,
    saveIDPPlan,
    createAssessmentCycle,
    idps,
    language,
    t,
  } = useApp();

  const isSupervisor =
    currentUser.role === 'financial_controller' ||
    currentUser.role === 'super_admin' ||
    currentUser.role === 'lnd_manager';

  // Target learner selection
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>(() => {
    if (currentUser.role === 'learner') return currentUser.id;
    return 'user_learner1'; // Default: Nguyễn Minh Thư
  });

  const activeLearner = users.find((u) => u.id === selectedLearnerId) || currentUser;

  // Multi-cycle history for active learner
  const learnerAssessments = useMemo(() => {
    return assessments
      .filter((a) => a.learnerId === selectedLearnerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [assessments, selectedLearnerId]);

  // Selected assessment cycle ID
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');

  // Active assessment record (either selected cycle or latest)
  const currentAssessment = useMemo(() => {
    if (selectedCycleId) {
      const found = learnerAssessments.find((a) => a.id === selectedCycleId);
      if (found) return found;
    }
    return learnerAssessments[0] || null;
  }, [learnerAssessments, selectedCycleId]);

  const activeIDP = idps.find((i) => i.learnerId === selectedLearnerId);

  // Sub tabs: 'matrix' (Scoring & Gaps) | 'idp' (Individual Development Plan) | 'history' (Cycle Timeline & Trend)
  const [activeTabSub, setActiveTabSub] = useState<'matrix' | 'idp' | 'history'>('matrix');

  // Radar analysis mode:
  // 'target_sup': Target FC (L4) vs Supervisor Assessed
  // 'target_self': Target FC (L4) vs Learner Self Assessed
  // 'perception_gap': Perception Gap (Self vs Supervisor)
  const [radarMode, setRadarMode] = useState<'target_sup' | 'target_self' | 'perception_gap'>('target_sup');

  // Filter domain in matrix
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');

  // Show Rubric Guide modal
  const [showRubricModal, setShowRubricModal] = useState<boolean>(false);

  // New Cycle modal
  const [showNewCycleModal, setShowNewCycleModal] = useState<boolean>(false);
  const [newCycleName, setNewCycleName] = useState<string>('2026 Q3 Mid-Year Evaluation');

  // State for working assessment scores
  const [scores, setScores] = useState<Record<string, {
    selfLevel: ProficiencyLevel;
    supervisorLevel: ProficiencyLevel;
    gap: number;
    selfNotes?: string;
    supervisorNotes: string;
    evidenceText?: string;
  }>>({});

  // General comments & reflections
  const [learnerReflection, setLearnerReflection] = useState<string>('');
  const [supervisorComments, setSupervisorComments] = useState<string>('');

  // Synchronize scores state when currentAssessment changes
  React.useEffect(() => {
    if (currentAssessment) {
      const sanitized: Record<string, any> = {};
      Object.entries(currentAssessment.scores || {}).forEach(([k, v]) => {
        sanitized[k] = {
          ...v,
          supervisorNotes: v.supervisorNotes || '',
        };
      });
      setScores(sanitized);
      setLearnerReflection(currentAssessment.learnerReflection || '');
      setSupervisorComments(currentAssessment.supervisorComments || '');
      if (!selectedCycleId) {
        setSelectedCycleId(currentAssessment.id);
      }
    } else {
      // Build baseline if none exists
      const initial: Record<string, any> = {};
      competencies.slice(0, 10).forEach((c) => {
        initial[c.code] = {
          selfLevel: 2,
          supervisorLevel: 2,
          gap: Math.max(0, (activeLearner.targetLevel || 4) - 2),
          selfNotes: '',
          supervisorNotes: '',
        };
      });
      setScores(initial);
      setLearnerReflection('');
      setSupervisorComments('');
    }
  }, [currentAssessment, selectedLearnerId]);

  // Handle score change
  const handleScoreChange = (
    code: string,
    field: 'selfLevel' | 'supervisorLevel',
    value: ProficiencyLevel
  ) => {
    setScores((prev) => {
      const currentObj = prev[code] || {
        selfLevel: 2,
        supervisorLevel: 2,
        gap: 2,
        selfNotes: '',
        supervisorNotes: '',
      };
      const newSelf = field === 'selfLevel' ? value : currentObj.selfLevel;
      const newSup = field === 'supervisorLevel' ? value : currentObj.supervisorLevel;
      const targetLevel = activeLearner.targetLevel || 4;
      // Authoritative gap uses Supervisor level if evaluated; otherwise self level
      const evaluatedLevel = currentAssessment?.status === 'pending_supervisor' ? newSelf : newSup;
      const newGap = Math.max(0, targetLevel - evaluatedLevel);

      return {
        ...prev,
        [code]: {
          ...currentObj,
          [field]: value,
          gap: newGap,
        },
      };
    });
  };

  // Handle text note changes
  const handleNoteChange = (
    code: string,
    field: 'selfNotes' | 'supervisorNotes' | 'evidenceText',
    text: string
  ) => {
    setScores((prev) => {
      const currentObj = prev[code] || {
        selfLevel: 2,
        supervisorLevel: 2,
        gap: 2,
        selfNotes: '',
        supervisorNotes: '',
      };
      return {
        ...prev,
        [code]: {
          ...currentObj,
          [field]: text,
        },
      };
    });
  };

  // Save assessment workflow
  const handleSaveAssessment = async (status: 'pending_self' | 'pending_supervisor' | 'approved') => {
    const targetLevel = activeLearner.targetLevel || 4;
    const entries = Object.entries(scores);
    const avgGap =
      entries.length > 0
        ? entries.reduce((acc, [_, val]) => acc + (val.gap || 0), 0) / entries.length
        : 1.0;

    const sanitizedScores: Record<string, {
      selfLevel: ProficiencyLevel;
      supervisorLevel: ProficiencyLevel;
      gap: number;
      selfNotes?: string;
      supervisorNotes: string;
      evidenceText?: string;
    }> = {};

    Object.entries(scores).forEach(([code, val]) => {
      sanitizedScores[code] = {
        selfLevel: val.selfLevel,
        supervisorLevel: val.supervisorLevel,
        gap: val.gap,
        selfNotes: val.selfNotes,
        supervisorNotes: val.supervisorNotes || '',
        evidenceText: val.evidenceText,
      };
    });

    const recordToSave: AssessmentRecord = {
      id: currentAssessment?.id || `asmt_${Date.now()}`,
      learnerId: selectedLearnerId,
      supervisorId: currentUser.id,
      cycle: currentAssessment?.cycle || '2026 Q2 Competency Evaluation',
      status,
      date: new Date().toISOString().split('T')[0],
      scores: sanitizedScores,
      overallGapAverage: Number(avgGap.toFixed(1)),
      learnerReflection,
      supervisorComments,
      approvedDate: status === 'approved' ? new Date().toISOString().split('T')[0] : currentAssessment?.approvedDate,
    };

    await saveAssessment(recordToSave);

    let message = '';
    if (status === 'pending_supervisor') {
      message = language === 'vi'
        ? `Tự đánh giá đã được gửi tới Giám Đốc Tài Chính (David Tran) để xem xét và chấm điểm thẩm định.`
        : `Self-assessment submitted to Financial Controller for review and sign-off.`;
    } else if (status === 'approved') {
      message = language === 'vi'
        ? `Đã phê duyệt chính thức đánh giá năng lực cho ${activeLearner.name}! Hồ sơ đã lưu trữ vào hồ sơ nhân sự.`
        : `Competency evaluation formally approved for ${activeLearner.name}! Recorded in HR file.`;
    } else {
      message = language === 'vi'
        ? `Đã lưu bản nháp đánh giá năng lực thành công.`
        : `Draft evaluation saved successfully.`;
    }
    alert(message);
  };

  // 1-Click IDP generation
  const handleGenerateIDP = async () => {
    await generateIDPFromGap(
      selectedLearnerId,
      'Assistant Financial Controller (AFC)',
      currentUser.role === 'learner' ? 'David Tran (Cluster FC)' : currentUser.name
    );
    setActiveTabSub('idp');
    alert(
      language === 'vi'
        ? `Kế hoạch Phát Triển Cá Nhân (IDP) đã được hệ thống tự động sinh ra dựa trên các năng lực có khoảng cách lớn nhất!`
        : `Individual Development Plan (IDP) generated based on top competency gaps!`
    );
  };

  // Create new assessment cycle
  const handleCreateNewCycle = () => {
    if (!newCycleName.trim()) return;
    const newRecord = createAssessmentCycle(selectedLearnerId, newCycleName.trim());
    setSelectedCycleId(newRecord.id);
    setShowNewCycleModal(false);
    alert(
      language === 'vi'
        ? `Đã khởi tạo thành công kỳ đánh giá mới: "${newCycleName}" cho ${activeLearner.name}.`
        : `Successfully created new evaluation cycle: "${newCycleName}" for ${activeLearner.name}.`
    );
  };

  // Radar chart data preparation
  const radarData = useMemo(() => {
    return domains.map((dom) => {
      const domComps = competencies.filter((c) => c.domainId === dom.id);
      let supTotal = 0;
      let selfTotal = 0;
      let count = 0;

      domComps.forEach((c) => {
        if (scores[c.code]) {
          supTotal += scores[c.code].supervisorLevel || 2;
          selfTotal += scores[c.code].selfLevel || 2;
          count++;
        }
      });

      const supAvg = count > 0 ? supTotal / count : 2;
      const selfAvg = count > 0 ? selfTotal / count : 2;
      const targetLvl = activeLearner.targetLevel || 4;

      if (radarMode === 'target_sup') {
        return {
          label: language === 'vi' ? dom.nameVi : dom.nameEn,
          code: dom.code,
          target: targetLvl,
          current: Number(supAvg.toFixed(1)),
        };
      } else if (radarMode === 'target_self') {
        return {
          label: language === 'vi' ? dom.nameVi : dom.nameEn,
          code: dom.code,
          target: targetLvl,
          current: Number(selfAvg.toFixed(1)),
        };
      } else {
        // Perception gap: Primary is Supervisor, Secondary is Self
        return {
          label: language === 'vi' ? dom.nameVi : dom.nameEn,
          code: dom.code,
          target: targetLvl,
          current: Number(supAvg.toFixed(1)),
          secondary: Number(selfAvg.toFixed(1)),
        };
      }
    });
  }, [domains, competencies, scores, radarMode, activeLearner, language]);

  // Filtered competencies for matrix table
  const displayedCompetencies = useMemo(() => {
    if (selectedDomainFilter === 'all') return competencies;
    return competencies.filter((c) => c.domainId === selectedDomainFilter);
  }, [competencies, selectedDomainFilter]);

  // IDP Priority filter
  const [idpPriorityFilter, setIdpPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const filteredIDPItems = useMemo(() => {
    if (!activeIDP?.items) return [];
    if (idpPriorityFilter === 'All') return activeIDP.items;
    return activeIDP.items.filter((item) => item.priority === idpPriorityFilter);
  }, [activeIDP, idpPriorityFilter]);

  // IDP metrics
  const idpTotal = activeIDP?.items.length || 0;
  const idpCompleted = activeIDP?.items.filter((i) => i.status === 'Completed').length || 0;
  const idpInProgress = activeIDP?.items.filter((i) => i.status === 'In Progress').length || 0;
  const idpCompletionPct = idpTotal > 0 ? Math.round((idpCompleted / idpTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Gap = Target Level (4) – Assessed Level | Chuẩn Quốc Tế Marriott, IHG, Accor</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t.assessment.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Hệ thống đánh giá năng lực 2 chiều (Tự đánh giá & Cấp trên thẩm định), phân tích khoảng cách năng lực thời gian thực và tự động tạo Kế hoạch Phát triển Cá nhân (IDP).
          </p>
        </div>

        {/* Learner & Cycle Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Learner selector (available to Supervisor or Executive) */}
          {isSupervisor ? (
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 grow xl:grow-0">
              <span className="text-xs font-bold text-slate-600 pl-1 shrink-0">
                {language === 'vi' ? 'Nhân sự:' : 'Learner:'}
              </span>
              <select
                value={selectedLearnerId}
                onChange={(e) => {
                  setSelectedLearnerId(e.target.value);
                  setSelectedCycleId('');
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                {users
                  .filter((u) => u.role === 'learner')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} – {u.position} ({u.property})
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs font-bold">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Hồ sơ tự đánh giá của: {activeLearner.name}</span>
            </div>
          )}

          {/* Cycle Selector */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 grow xl:grow-0">
            <span className="text-xs font-bold text-slate-600 pl-1 shrink-0">
              {language === 'vi' ? 'Kỳ:' : 'Cycle:'}
            </span>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none"
            >
              {learnerAssessments.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.cycle} ({cycle.date})
                </option>
              ))}
            </select>
          </div>

          {/* New Cycle Button */}
          {isSupervisor && (
            <button
              onClick={() => setShowNewCycleModal(true)}
              className="px-3 py-2 bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              title="Khởi tạo kỳ đánh giá mới cho nhân sự"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Kỳ Mới' : 'New Cycle'}</span>
            </button>
          )}

          {/* Rubric Definition Button */}
          <button
            onClick={() => setShowRubricModal(true)}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
            title="Xem tiêu chuẩn 4 cấp độ năng lực"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTabSub('matrix')}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTabSub === 'matrix'
                ? 'bg-[#0A192F] text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{language === 'vi' ? 'Ma Trận & Đánh Giá Năng Lực' : 'Competency Matrix & Scoring'}</span>
          </button>

          <button
            onClick={() => setActiveTabSub('idp')}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTabSub === 'idp'
                ? 'bg-[#0A192F] text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t.assessment.idpTitle}</span>
            {idpTotal > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-400/20 text-amber-300 font-mono">
                {idpCompleted}/{idpTotal}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTabSub('history')}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTabSub === 'history'
                ? 'bg-[#0A192F] text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{language === 'vi' ? 'Lịch Sử & Xu Hướng Thu Hẹp Gap' : 'History & Gap Reduction Trend'}</span>
          </button>
        </div>

        {/* Current status badge */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Trạng thái kỳ đánh giá:</span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              currentAssessment?.status === 'approved'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : currentAssessment?.status === 'pending_supervisor'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}
          >
            {currentAssessment?.status === 'approved'
              ? 'Đã Phê Duyệt (Approved)'
              : currentAssessment?.status === 'pending_supervisor'
              ? 'Chờ Cấp Trên Thẩm Định'
              : 'Bản Nháp (Draft)'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPETENCY MATRIX & EVALUATION                                     */}
      {/* ========================================================================= */}
      {activeTabSub === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Radar Analysis & Learner Profile (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Learner Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-3.5 mb-4">
                <img
                  src={activeLearner.avatar}
                  alt={activeLearner.name}
                  className="w-14 h-14 rounded-full object-cover ring-3 ring-amber-400/50"
                />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{activeLearner.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{activeLearner.position} • {activeLearner.property}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Mục tiêu: Financial Controller (Level {activeLearner.targetLevel || 4})
                    </span>
                  </div>
                </div>
              </div>

              {/* Radar Mode Switcher */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Chế độ so sánh biểu đồ Radar:
                </span>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                  <button
                    onClick={() => setRadarMode('target_sup')}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                      radarMode === 'target_sup'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Target vs FC
                  </button>
                  <button
                    onClick={() => setRadarMode('target_self')}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                      radarMode === 'target_self'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Target vs Self
                  </button>
                  <button
                    onClick={() => setRadarMode('perception_gap')}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                      radarMode === 'perception_gap'
                        ? 'bg-[#0A192F] text-amber-400 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Perception Gap
                  </button>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="py-2 flex items-center justify-center">
                <RadarChart
                  data={radarData}
                  size={320}
                  targetLabel={
                    radarMode === 'perception_gap'
                      ? 'Mục tiêu FC (L4)'
                      : language === 'vi'
                      ? 'Mục tiêu FC (L4)'
                      : 'Target FC (L4)'
                  }
                  currentLabel={
                    radarMode === 'target_self'
                      ? language === 'vi'
                        ? 'Học viên tự đánh giá'
                        : 'Self Assessed'
                      : language === 'vi'
                      ? 'Cấp trên FC thẩm định'
                      : 'Supervisor Assessed'
                  }
                  secondaryLabel={language === 'vi' ? 'Học viên tự đánh giá' : 'Self Assessed'}
                  showSecondary={radarMode === 'perception_gap'}
                  currentColor={radarMode === 'target_self' ? '#10B981' : '#2563EB'}
                  secondaryColor="#10B981"
                />
              </div>

              {/* Summary Gap KPI Box */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">
                      Khoảng Trống Trung Bình:
                    </span>
                    <span className="text-lg font-extrabold text-amber-900 font-mono">
                      {currentAssessment?.overallGapAverage || '1.2'} Levels
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-[10px] font-bold text-blue-800 uppercase block">
                      Số Năng Lực Cần Thu Hẹp:
                    </span>
                    <span className="text-lg font-extrabold text-blue-900 font-mono">
                      {Object.values(scores).filter((s) => s.gap > 0).length} / {Object.keys(scores).length}
                    </span>
                  </div>
                </div>

                {/* 1-Click IDP Trigger */}
                <button
                  onClick={handleGenerateIDP}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>{t.assessment.generateIDP}</span>
                </button>
              </div>
            </div>

            {/* Qualitative Feedback & Reflection Box */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Ý Kiến Đánh Giá & Ghi Chú Phê Duyệt</span>
              </h4>

              {/* Learner Reflection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Tự nhận xét & dẫn chứng của Học viên:
                </label>
                <textarea
                  value={learnerReflection}
                  onChange={(e) => setLearnerReflection(e.target.value)}
                  disabled={isSupervisor && currentAssessment?.status === 'approved'}
                  placeholder="Học viên ghi nhận cảm nhận về các năng lực tự tin nhất, các thách thức trong công việc hàng ngày..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                />
              </div>

              {/* Supervisor Feedback */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Ý kiến & định hướng phát triển của Cấp Trên (FC):
                </label>
                <textarea
                  value={supervisorComments}
                  onChange={(e) => setSupervisorComments(e.target.value)}
                  placeholder="Ghi nhận điểm mạnh chuyên môn, khuyến nghị các hoạt động OJT cụ thể, lộ trình chuẩn bị cho vị trí AFC/FC..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Competency Scoring Matrix (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
            {/* Table Header & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {language === 'vi' ? 'Chấm Điểm & Phân Tích Khoảng Cách Năng Lực' : 'Detailed Competency Gap Scoring'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  L1: Foundation • L2: Operational • L3: Advanced • L4: Strategic FC Partner
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveAssessment('pending_self')}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  {t.common.save} Nháp
                </button>

                {/* Learner submits to supervisor */}
                {currentUser.role === 'learner' && (
                  <button
                    onClick={() => handleSaveAssessment('pending_supervisor')}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Nộp Cho Cấp Trên</span>
                  </button>
                )}

                {/* Supervisor approves */}
                {isSupervisor && (
                  <button
                    onClick={() => handleSaveAssessment('approved')}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Phê Duyệt Đánh Giá</span>
                  </button>
                )}
              </div>
            </div>

            {/* Domain Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedDomainFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedDomainFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất Cả ({competencies.length})
              </button>
              {domains.map((dom) => (
                <button
                  key={dom.id}
                  onClick={() => setSelectedDomainFilter(dom.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    selectedDomainFilter === dom.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dom.code}
                </button>
              ))}
            </div>

            {/* Competency Assessment Items List */}
            <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
              {displayedCompetencies.map((comp) => {
                const scoreObj = scores[comp.code] || {
                  selfLevel: 2,
                  supervisorLevel: 2,
                  gap: Math.max(0, (activeLearner.targetLevel || 4) - 2),
                  selfNotes: '',
                  supervisorNotes: '',
                };

                const targetLevel = activeLearner.targetLevel || 4;
                const gap = scoreObj.gap;

                return (
                  <div
                    key={comp.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-all space-y-3"
                  >
                    {/* Item Top Info */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 font-mono">
                            {comp.code}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900">
                            {language === 'vi' ? comp.nameVi : comp.nameEn}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {language === 'vi' ? comp.definitionVi : comp.definitionEn}
                        </p>
                      </div>

                      {/* Gap Indicator Badge */}
                      <div className="shrink-0 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono ${
                            gap === 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : gap === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {gap === 0 ? 'Đạt Mục Tiêu' : `Gap: -${gap} Cấp`}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                          Mục tiêu L{targetLevel}
                        </span>
                      </div>
                    </div>

                    {/* Level Selectors (Self vs Supervisor) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                      {/* Self Rating */}
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-600 uppercase">
                            1. Học viên tự đánh giá:
                          </span>
                          <span className="text-[11px] font-bold text-blue-700 font-mono">
                            Level {scoreObj.selfLevel}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[1, 2, 3, 4].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => handleScoreChange(comp.code, 'selfLevel', lvl as ProficiencyLevel)}
                              className={`py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                scoreObj.selfLevel === lvl
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              L{lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Supervisor Rating */}
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-600 uppercase">
                            2. Cấp trên (FC) thẩm định:
                          </span>
                          <span className="text-[11px] font-bold text-amber-700 font-mono">
                            Level {scoreObj.supervisorLevel}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[1, 2, 3, 4].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => handleScoreChange(comp.code, 'supervisorLevel', lvl as ProficiencyLevel)}
                              className={`py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                scoreObj.supervisorLevel === lvl
                                  ? 'bg-[#0A192F] text-amber-400 ring-2 ring-amber-400/50 shadow-xs'
                                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              L{lvl}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Evidence & Coaching Notes Input */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <input
                          type="text"
                          value={scoreObj.selfNotes || ''}
                          onChange={(e) => handleNoteChange(comp.code, 'selfNotes', e.target.value)}
                          placeholder="Dẫn chứng/Ghi chú của học viên (ví dụ: đã tham gia khóa sổ tháng 3)..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={scoreObj.supervisorNotes || ''}
                          onChange={(e) => handleNoteChange(comp.code, 'supervisorNotes', e.target.value)}
                          placeholder="Góp ý/Chỉ đạo của FC (ví dụ: cần tự lập báo cáo P&L Critique)..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INDIVIDUAL DEVELOPMENT PLAN (IDP)                                   */}
      {/* ========================================================================= */}
      {activeTabSub === 'idp' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          {/* IDP Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  {activeIDP?.status || 'Active'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {language === 'vi' ? 'Người phê duyệt:' : 'Approved by:'} {activeIDP?.approvedBy || 'David Tran, Cluster FC'} ({activeIDP?.approvedDate || '2026-03-01'})
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {t.assessment.idpTitle} – {activeLearner.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mục tiêu thăng tiến: <strong className="text-slate-700">{activeIDP?.targetPosition || 'Assistant Financial Controller (AFC)'}</strong> • Hạn hoàn thành: <strong className="text-slate-700">{activeIDP?.targetCompletionDate || '2026-09-30'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateIDP}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Cập Nhật Theo Gap Mới' : 'Regenerate from Gap'}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.common.printReport}</span>
              </button>
            </div>
          </div>

          {/* IDP Progress Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Tổng Hành Động:</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono">{idpTotal}</span>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Đã Hoàn Thành:</span>
              <span className="text-2xl font-extrabold text-emerald-900 font-mono">{idpCompleted}</span>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-[10px] font-bold text-blue-800 uppercase block">Đang Thực Hiện:</span>
              <span className="text-2xl font-extrabold text-blue-900 font-mono">{idpInProgress}</span>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Tiến Độ IDP:</span>
              <span className="text-2xl font-extrabold text-amber-900 font-mono">{idpCompletionPct}%</span>
            </div>
          </div>

          {/* Priority Filter Bar */}
          <div className="flex items-center justify-between border-y border-slate-100 py-3">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600">Lọc theo mức độ ưu tiên:</span>
              {(['All', 'High', 'Medium', 'Low'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setIdpPriorityFilter(p)}
                  className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer ${
                    idpPriorityFilter === p
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p === 'All' ? 'Tất cả' : `${p} Priority`}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500">
              Hiển thị {filteredIDPItems.length} mục hành động
            </span>
          </div>

          {/* IDP Action Items List */}
          <div className="space-y-4">
            {filteredIDPItems.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.priority === 'High'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : item.priority === 'Medium'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.priority} Priority
                    </span>
                    <span className="font-mono text-xs font-bold text-blue-900 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                      {item.competencyId}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      Hạn: {item.targetDate}
                    </span>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-1.5">
                    {(['Not Started', 'In Progress', 'Completed'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => updateIDPItem(selectedLearnerId, item.id, st)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          item.status === st
                            ? st === 'Completed'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : st === 'In Progress'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st === 'Completed' && <Check className="w-3 h-3 inline mr-1" />}
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Practical Activity Details */}
                <p className="font-bold text-sm text-slate-900 leading-relaxed">
                  {item.practicalActivity}
                </p>

                {/* Mentor Notes & Learner Evidence Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
                    <span className="text-[10px] font-bold text-amber-900 uppercase block mb-1">
                      Chỉ đạo & Đánh giá của Mentor (FC):
                    </span>
                    <p className="text-slate-700 italic">
                      {item.mentorNotes || 'Cần phối hợp với GM và Trưởng bộ phận trong kỳ kiểm kê tới.'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Dẫn chứng hoàn thành của Học viên:
                    </span>
                    <input
                      type="text"
                      value={item.evidenceNotes || ''}
                      onChange={(e) =>
                        updateIDPItem(
                          selectedLearnerId,
                          item.id,
                          item.status,
                          e.target.value
                        )
                      }
                      placeholder="Nhập tên file hoặc link dẫn chứng (ví dụ: đã nộp file Closing_Report.xlsx)..."
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Formal Approval Sign-off Block for Printing */}
          <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-12">
              <span className="font-bold text-slate-700 uppercase tracking-wider block">
                Học Viên Ký Cam Kết Thực Hiện
              </span>
              <div className="font-bold text-slate-900">{activeLearner.name}</div>
            </div>

            <div className="space-y-12">
              <span className="font-bold text-slate-700 uppercase tracking-wider block">
                Giám Đốc Tài Chính (FC) Phê Duyệt & Bảo Trợ
              </span>
              <div className="font-bold text-slate-900">
                {activeIDP?.approvedBy || 'David Tran, Cluster FC'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ASSESSMENT HISTORY & GAP REDUCTION TREND                            */}
      {/* ========================================================================= */}
      {activeTabSub === 'history' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {language === 'vi' ? 'Tiến Trình & Lịch Sử Đánh Giá Năng Lực' : 'Assessment History & Gap Progression'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi sự thu hẹp khoảng cách năng lực qua từng quý của {activeLearner.name}.
              </p>
            </div>

            {isSupervisor && (
              <button
                onClick={() => setShowNewCycleModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Khởi Tạo Kỳ Đánh Giá Mới</span>
              </button>
            )}
          </div>

          {/* Timeline Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Kỳ Đánh Giá (Cycle)</th>
                  <th className="p-3.5">Ngày Đánh Giá</th>
                  <th className="p-3.5">Người Thẩm Định</th>
                  <th className="p-3.5 text-center">Gap Trung Bình</th>
                  <th className="p-3.5 text-center">Trạng Thái</th>
                  <th className="p-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {learnerAssessments.map((asmt, idx) => {
                  const isCurrent = asmt.id === currentAssessment?.id;
                  const prevAsmt = learnerAssessments[idx + 1];
                  const gapDiff = prevAsmt ? (prevAsmt.overallGapAverage - asmt.overallGapAverage).toFixed(1) : null;

                  return (
                    <tr
                      key={asmt.id}
                      className={`hover:bg-slate-50/80 transition-all ${
                        isCurrent ? 'bg-amber-50/30 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          {isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                          )}
                          <span className="font-bold text-slate-900">{asmt.cycle}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono">{asmt.date}</td>
                      <td className="p-3.5 text-slate-700">
                        {users.find((u) => u.id === asmt.supervisorId)?.name || 'David Tran (Cluster FC)'}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-900 font-mono font-bold">
                          <span>{asmt.overallGapAverage} Lvl</span>
                          {gapDiff && Number(gapDiff) > 0 && (
                            <span className="text-[10px] text-emerald-600 font-bold">
                              (-{gapDiff})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            asmt.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : asmt.status === 'pending_supervisor'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {asmt.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedCycleId(asmt.id);
                            setActiveTabSub('matrix');
                          }}
                          className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                        >
                          Xem Chi Tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROFICIENCY RUBRIC DEFINITIONS                                     */}
      {/* ========================================================================= */}
      {showRubricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Thang Tiêu Chuẩn Năng Lực 4 Cấp Độ (FC Competency Rubric)
                </h3>
              </div>
              <button
                onClick={() => setShowRubricModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white font-mono">
                    LEVEL 1
                  </span>
                  <h4 className="font-bold text-slate-900">FOUNDATION (Cơ Bản / Nhập Môn)</h4>
                </div>
                <p className="text-slate-600">
                  Hiểu các nguyên tắc cơ bản của kế toán khách sạn (USALI, kiểm soát nội bộ, luân chuyển chứng từ). Thực hiện các tác vụ định kỳ dưới sự hướng dẫn và giám sát trực tiếp của Kế toán trưởng hoặc FC.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-white font-mono">
                    LEVEL 2
                  </span>
                  <h4 className="font-bold text-slate-900">OPERATIONAL (Tác Nghiệp Độc Lập)</h4>
                </div>
                <p className="text-slate-600">
                  Vận hành thành thạo và nhất quán các quy trình khóa sổ tháng, đối soát bảng cân đối kế toán, lập báo cáo doanh thu hàng ngày (Daily Revenue Report), giải quyết các sai lệch tác nghiệp mà không cần giám sát thường xuyên.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white font-mono">
                    LEVEL 3
                  </span>
                  <h4 className="font-bold text-slate-900">ADVANCED (Chuyên Sâu & Phân Tích)</h4>
                </div>
                <p className="text-slate-600">
                  Chủ động xây dựng mô hình dự báo tài chính (Forecasting), lập ngân sách hàng năm, phân tích biến động P&L Critique sắc bén, hướng dẫn và đào tạo nhân viên kế toán cấp dưới, quản lý rủi ro kiểm soát nội bộ.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white font-mono">
                    LEVEL 4
                  </span>
                  <h4 className="font-bold text-slate-900">STRATEGIC FC PARTNER (Đối Tác Chiến Lược Của GM)</h4>
                </div>
                <p className="text-slate-600">
                  Hoạt động như một cánh tay phải đắc lực của Tổng Giám Đốc (GM). Cung cấp góc nhìn tài chính chiến lược, tham vấn giá bán và tối ưu hóa lợi nhuận GOP/EBITDA, thẩm định đầu tư CAPEX, bảo vệ tài sản và dẫn dắt văn hóa tuân thủ của toàn khách sạn.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowRubricModal(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                Đã Hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW EVALUATION CYCLE                                        */}
      {/* ========================================================================= */}
      {showNewCycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Khởi Tạo Kỳ Đánh Giá Mới
                </h3>
              </div>
              <button
                onClick={() => setShowNewCycleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nhân Sự Được Đánh Giá:</label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900">
                  {activeLearner.name} ({activeLearner.position})
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên Kỳ Đánh Giá:</label>
                <input
                  type="text"
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  placeholder="Ví dụ: 2026 Q3 Mid-Year Evaluation"
                  className="w-full p-2.5 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Hệ thống sẽ sao chép cấu trúc năng lực chuẩn, đặt trạng thái ban đầu là <strong>Chờ Tự Đánh Giá (pending_self)</strong> để học viên hoàn thành trước khi chuyển đến Cấp Trên thẩm định.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowNewCycleModal(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateNewCycle}
                className="px-4 py-2 bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Tạo Kỳ Đánh Giá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
