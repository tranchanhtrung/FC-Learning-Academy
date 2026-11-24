import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { uploadAuthorizedTrainingFile } from '../../lib/firebase';
import {
  Bot,
  Crown,
  Send,
  Sparkles,
  Award,
  RefreshCw,
  AlertCircle,
  Building,
  CheckCircle2,
  Target,
  BookOpen,
  FileText,
  Layers,
  ChevronRight,
  HelpCircle,
  XCircle,
  Lock,
  Globe,
  Save,
  Paperclip,
  TrendingUp,
  ListChecks,
  CheckSquare,
  Square,
  ShieldCheck,
  Database,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'gm';
  content: string;
}

const PRESET_SCENARIOS = [
  {
    id: 'scen_01',
    title: 'Khủng hoảng Flow-Through: Công suất tăng 8% nhưng GOP giảm 5%',
    titleEn: 'Flow-Through Crisis: Occupancy +8% Yet GOP Declines 5%',
    context:
      'Khách sạn đạt công suất phòng 82% (tăng 8% so với cùng kỳ). Tuy nhiên báo cáo P&L tháng cho thấy Gross Operating Profit (GOP) lại giảm 5%. Chủ đầu tư đang rất tức giận và yêu cầu giải trình khẩn cấp.',
    contextEn:
      'Hotel occupancy reached 82% (+8% YoY), yet monthly Gross Operating Profit (GOP) declined 5%. Ownership is concerned and demands an immediate USALI variance explanation and recovery plan.',
    metrics: { occupancy: '82%', adr: '$178', revpar: '$146', gopMargin: '31.2%', flowThrough: '-22%' },
  },
  {
    id: 'scen_02',
    title: 'Bùng nổ doanh thu F&B nhưng chi phí làm thêm giờ (Overtime) vượt trần',
    titleEn: 'F&B Revenue Surge Offset by Excessive Labor Overtime Costs',
    context:
      'Bộ phận F&B ghi nhận doanh thu tăng 25% nhờ 12 tiệc cưới lớn trong tháng. Tuy nhiên chi phí nhân công F&B tăng vọt 42% do lạm dụng giờ làm thêm ngoài giờ và thuê lao động thời vụ ngoài giá cao.',
    contextEn:
      'F&B revenue grew 25% driven by 12 large banquet events, but F&B payroll surged 42% due to unmanaged overtime and high-rate casual labor.',
    metrics: { occupancy: '76%', adr: '$190', revpar: '$144', gopMargin: '28.5%', flowThrough: '18%' },
  },
  {
    id: 'scen_03',
    title: 'Giá điện năng & Tiện ích tăng 35%: Đề xuất cắt giảm chi phí bảo trì vs Tiện nghi khách',
    titleEn: 'Utilities Cost Spike +35%: Energy Savings vs. Guest Satisfaction',
    context:
      'Chi phí năng lượng (Utilities) tăng đột biến do biểu giá điện mới. Trưởng bộ phận Kỹ thuật đề xuất tắt bớt điều hòa sảnh chính và thang máy, trong khi GM lo ngại điểm hài lòng của khách (GSS) sẽ tụt dốc.',
    contextEn:
      'Utility expenses jumped 35% after a tariff hike. Engineering proposes shutting down lobby HVAC zones, while the GM worries Guest Satisfaction Scores (GSS) will plunge.',
    metrics: { occupancy: '80%', adr: '$185', revpar: '$148', gopMargin: '33.0%', flowThrough: '38%' },
  },
  {
    id: 'scen_04',
    title: 'Tỷ trọng kênh OTA vượt 65% làm bào mòn giá bán ròng (Net ADR)',
    titleEn: 'OTA Channel Mix Exceeds 65%, Eroding Net ADR & Margin',
    context:
      'Doanh số buồng phòng phụ thuộc quá mức vào Booking.com và Agoda với mức chiết khấu hoa hồng 18-22%. Chi phí phân phối tháng này lên tới $115,000, khiến giá phòng thực thu (Net ADR) chỉ còn $138 so với giá niêm yết $175.',
    contextEn:
      'Room mix relies heavily on OTAs at 18–22% commission. Distribution fees reached $115,000 this month, compressing Net ADR down to $138 from a $175 headline rate.',
    metrics: { occupancy: '85%', adr: '$175', revpar: '$148.75', gopMargin: '30.5%', flowThrough: '34%' },
  },
];

export const AIAssistantView: React.FC = () => {
  const {
    language,
    t,
    currentUser,
    users,
    courses,
    domains,
    showToast,
    setSelectedCourseForPlayer,
    setActiveTab: setMainNavTab,
    simulatorData,
    toggleScenarioPublish,
    saveSimulationSession,
    firebaseUser,
    dataSourceMode,
    hasPermission,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'simulator' | 'advisor' | 'gapCoach' | 'lab'>('simulator');

  const canPreviewDrafts = hasPermission('preview_draft_scenarios');
  const canManageSim = hasPermission('manage_sim_admin');
  const isAdminOrLnd = canPreviewDrafts || canManageSim;
  const isSupervisor =
    hasPermission('view_all_learners_data') || hasPermission('assess_team_members');

  // ---------------- MODE 1: SIMULATOR STATE ----------------
  const visibleImportedScenarios = useMemo(() => {
    const all = simulatorData?.simulationScenarios || [];
    return canPreviewDrafts ? all : all.filter((s) => s.status === 'Published');
  }, [canPreviewDrafts, simulatorData?.simulationScenarios]);

  const isUsingDemoFallback = visibleImportedScenarios.length === 0;

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);

  useEffect(() => {
    if (visibleImportedScenarios.length > 0) {
      const stillExists = visibleImportedScenarios.some((s) => s.id === selectedScenarioId);
      if (!stillExists) {
        setSelectedScenarioId(visibleImportedScenarios[0].id);
      }
    }
  }, [selectedScenarioId, visibleImportedScenarios]);

  const activeImportedScenario = useMemo(
    () => visibleImportedScenarios.find((s) => s.id === selectedScenarioId) || visibleImportedScenarios[0] || null,
    [selectedScenarioId, visibleImportedScenarios]
  );

  const activeHotelProfile = useMemo(() => {
    if (!activeImportedScenario) return null;
    return (simulatorData.hotelSimulationProfiles || []).find((h) => h.id === activeImportedScenario.hotelId) || null;
  }, [activeImportedScenario, simulatorData.hotelSimulationProfiles]);

  const activeFinancialRows = useMemo(() => {
    if (!activeImportedScenario) return [];
    return (simulatorData.simulationFinancialData || []).filter((f) => f.scenarioId === activeImportedScenario.id);
  }, [activeImportedScenario, simulatorData.simulationFinancialData]);

  const activeOperationalRows = useMemo(() => {
    if (!activeImportedScenario) return [];
    return (simulatorData.simulationOperationalData || []).filter((o) => o.scenarioId === activeImportedScenario.id);
  }, [activeImportedScenario, simulatorData.simulationOperationalData]);

  const activeChallenges = useMemo(() => {
    if (!activeImportedScenario) return [];
    return (simulatorData.simulationBusinessChallenges || []).filter((c) => c.scenarioId === activeImportedScenario.id);
  }, [activeImportedScenario, simulatorData.simulationBusinessChallenges]);

  const activeTasks = useMemo(() => {
    if (!activeImportedScenario) return [];
    return (simulatorData.simulationTasks || [])
      .filter((tItem) => tItem.scenarioId === activeImportedScenario.id)
      .sort((a, b) => a.taskOrder - b.taskOrder);
  }, [activeImportedScenario, simulatorData.simulationTasks]);

  const activeDecisionOptions = useMemo(() => {
    if (!activeImportedScenario) return [];
    return (simulatorData.simulationDecisionOptions || []).filter((o) => o.scenarioId === activeImportedScenario.id);
  }, [activeImportedScenario, simulatorData.simulationDecisionOptions]);

  const activeRoleplayPrompts = useMemo(() => {
    if (!activeImportedScenario) return [];
    return (simulatorData.simulationRoleplayPrompts || [])
      .filter((r) => r.scenarioId === activeImportedScenario.id)
      .sort((a, b) => a.turnOrder - b.turnOrder);
  }, [activeImportedScenario, simulatorData.simulationRoleplayPrompts]);

  const activeRubrics = useMemo(() => {
    if (!activeImportedScenario) return [];
    return (simulatorData.simulationEvaluationRubrics || []).filter((r) => r.scenarioId === activeImportedScenario.id);
  }, [activeImportedScenario, simulatorData.simulationEvaluationRubrics]);

  const activeReferenceAnalysis = useMemo(() => {
    if (!activeImportedScenario) return [];
    return (simulatorData.simulationReferenceAnalysis || []).filter((r) => r.scenarioId === activeImportedScenario.id);
  }, [activeImportedScenario, simulatorData.simulationReferenceAnalysis]);

  const selectedFallbackScenario = PRESET_SCENARIOS[selectedScenarioIndex] || PRESET_SCENARIOS[0];

  const buildStructuredScenarioPayload = () => {
    if (activeImportedScenario) {
      const latestFin = activeFinancialRows[0];
      const latestOp = activeOperationalRows[0];
      return {
        id: activeImportedScenario.id,
        title: language === 'vi' ? activeImportedScenario.titleVi : activeImportedScenario.titleEn,
        context: language === 'vi' ? activeImportedScenario.summaryVi : activeImportedScenario.summaryEn,
        gmPersona: activeHotelProfile ? `${activeHotelProfile.hotelName} General Manager` : t.ai.gmPersona,
        metrics: {
          occupancy: latestOp ? `${latestOp.occupancyPct}%` : 'N/A',
          adr: latestOp ? `$${latestOp.adr}` : 'N/A',
          revpar: latestOp ? `$${latestOp.revpar}` : 'N/A',
          gopMargin: latestFin ? `${latestFin.gopMarginPct}%` : 'N/A',
          flowThrough: latestFin
            ? `Budget GOP $${latestFin.budgetGop ?? 'N/A'} vs Actual $${latestFin.gop}`
            : 'N/A',
        },
        hotelProfile: activeHotelProfile,
        financials: activeFinancialRows,
        operational: activeOperationalRows,
        challenges: activeChallenges,
        tasks: activeTasks,
        decisionOptions: activeDecisionOptions,
        rubrics: activeRubrics,
        referenceAnalysis: activeReferenceAnalysis,
      };
    }
    return {
      ...selectedFallbackScenario,
      title: language === 'vi' ? selectedFallbackScenario.title : selectedFallbackScenario.titleEn,
      context: language === 'vi' ? selectedFallbackScenario.context : selectedFallbackScenario.contextEn,
    };
  };

  const [selectedDecisionIds, setSelectedDecisionIds] = useState<string[]>([]);
  const [learnerMemo, setLearnerMemo] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [sessionLockedCompleted, setSessionLockedCompleted] = useState<boolean>(false);
  const [evidenceAttachmentUrl, setEvidenceAttachmentUrl] = useState<string>('');
  const [evidenceUploading, setEvidenceUploading] = useState<boolean>(false);
  const evidenceFileRef = useRef<HTMLInputElement | null>(null);

  const [simulatorInput, setSimulatorInput] = useState<string>('');
  const [simulatorMessages, setSimulatorMessages] = useState<{ role: 'gm' | 'user'; text: string }[]>([
    {
      role: 'gm',
      text:
        language === 'vi'
          ? 'Chào Financial Controller! Tôi vừa xem qua báo cáo nhanh tháng này. Công suất phòng đạt 82% rất ấn tượng, nhưng tại sao GOP lại sụt giảm 5% so với cùng kỳ? Chủ tịch Hội đồng Quản trị vừa gọi điện cho tôi lúc 7 giờ sáng yêu cầu câu trả lời. Bạn hãy giải thích các nguyên nhân gốc rễ và đề xuất phương án khắc phục ngay.'
          : 'Good morning, Financial Controller! I just reviewed the flash report. We reached 82% occupancy, yet our GOP is down 5%! The Owner already called me demanding explanations. Walk me through the numbers and your recovery plan immediately.',
    },
  ]);
  const [simulatorLoading, setSimulatorLoading] = useState<boolean>(false);
  const [simulatorError, setSimulatorError] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  useEffect(() => {
    if (activeImportedScenario) {
      const opening = activeRoleplayPrompts[0];
      const gmGreeting = opening
        ? language === 'vi'
          ? opening.promptVi
          : opening.promptEn
        : language === 'vi'
        ? `Chào FC! Tôi đang xem kịch bản "${activeImportedScenario.titleVi}". Hãy trình bày phân tích USALI và phương án khắc phục.`
        : `Good morning FC! I am reviewing "${activeImportedScenario.titleEn}". Walk me through your USALI analysis and recovery plan.`;
      setSimulatorMessages([{ role: 'gm', text: gmGreeting }]);
      setSelectedDecisionIds([]);
      setLearnerMemo('');
      setEvaluationResult(null);
      setActiveSessionId(undefined);
      setSessionLockedCompleted(false);
      setEvidenceAttachmentUrl('');
      setSimulatorError(null);
    }
  }, [activeImportedScenario?.id]);

  // ---------------- MODE 2: ADVISOR STATE ----------------
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('');
  const [advisorInput, setAdvisorInput] = useState<string>('');
  const [advisorMessages, setAdvisorMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        language === 'vi'
          ? 'Xin chào! Tôi là Trợ Lý AI Học Viện FC (kết nối trực tiếp học liệu USALI 12th và 18 khóa học chính thức của Học viện). Hãy chọn một khóa học hoặc đặt câu hỏi về P&L, Flow-Through, Kiểm toán nội bộ, Dự báo dòng tiền hay CAPEX.'
          : 'Hello! I am your FC Academy AI Assistant, grounded in all 18 approved courses and USALI 12th standards. Select a course reference or ask any hospitality finance question.',
    },
  ]);
  const [advisorLoading, setAdvisorLoading] = useState<boolean>(false);

  // ---------------- MODE 3: GAP COACH STATE ----------------
  const [coachLearnerId, setCoachLearnerId] = useState<string>(
    !hasPermission('view_all_learners_data') ? currentUser.id : 'user_learner1'
  );
  const [coachFocusQuestion, setCoachFocusQuestion] = useState<string>('');
  const [coachLoading, setCoachLoading] = useState<boolean>(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachingPlan, setCoachingPlan] = useState<any>(null);

  const canViewCohortCoach = hasPermission('view_all_learners_data');
  useEffect(() => {
    if (!canViewCohortCoach) {
      setCoachLearnerId(currentUser.id);
    }
  }, [currentUser.id, canViewCohortCoach]);

  // ---------------- MODE 4: LAB (CASE STUDY / QUIZ / ANSWER ANALYZER) ----------------
  const [labMode, setLabMode] = useState<'case_study' | 'quiz'>('case_study');
  const [labCourseId, setLabCourseId] = useState<string>('');
  const [labDomainId, setLabDomainId] = useState<string>('all');
  const [labTopic, setLabTopic] = useState<string>('');
  const [labDifficulty, setLabDifficulty] = useState<string>('Advanced');
  const [labLoading, setLabLoading] = useState<boolean>(false);
  const [labError, setLabError] = useState<string | null>(null);

  // Generated Case Study & Answer Analyzer
  const [generatedCase, setGeneratedCase] = useState<any>(null);
  const [showModelAnswer, setShowModelAnswer] = useState<boolean>(false);
  const [learnerWrittenAnswer, setLearnerWrittenAnswer] = useState<string>('');
  const [customPromptForAnalyzer, setCustomPromptForAnalyzer] = useState<string>('');
  const [analyzingAnswer, setAnalyzingAnswer] = useState<boolean>(false);
  const [answerAnalysis, setAnswerAnalysis] = useState<any>(null);

  // Generated Practice Quiz in Lab
  const [generatedQuiz, setGeneratedQuiz] = useState<any[]>([]);
  const [quizSelections, setQuizSelections] = useState<Record<number, string>>({});
  const [quizRevealed, setQuizRevealed] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [advisorMessages, simulatorMessages]);

  const openCourseByCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const match = courses.find((c) => c.code.toUpperCase() === cleanCode || c.id === code);
    if (match) {
      setSelectedCourseForPlayer(match);
    } else {
      showToast(
        language === 'vi'
          ? `Không tìm thấy khóa học mã "${code}" trong danh mục.`
          : `Course "${code}" not found in catalog.`,
        'info'
      );
    }
  };

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
          courseId: selectedCourseFilter || undefined,
          history: advisorMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI service returned an error.');
      }
      setAdvisorMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e: any) {
      const msg = e.message || 'Failed to connect to Gemini AI service.';
      setAdvisorMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `[AI Error] ${msg}`,
        },
      ]);
      showToast(msg, 'error');
    } finally {
      setAdvisorLoading(false);
    }
  };

  // Send message to GM in Simulator Mode
  const handleSendSimulator = async () => {
    if (!simulatorInput.trim() || simulatorLoading) return;
    const userMsg = simulatorInput.trim();
    setSimulatorInput('');
    setSimulatorError(null);
    const updatedHistory = [...simulatorMessages, { role: 'user' as const, text: userMsg }];
    setSimulatorMessages(updatedHistory);
    setSimulatorLoading(true);

    try {
      const scenarioPayload = buildStructuredScenarioPayload();
      const selectedOptionsObj = activeDecisionOptions.filter((o) => selectedDecisionIds.includes(o.id));
      const res = await fetch('/api/gemini/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          scenario: scenarioPayload,
          selectedDecisionOptions: selectedOptionsObj,
          learnerAnalysis: learnerMemo,
          userTurn: userMsg,
          conversationHistory: simulatorMessages.slice(-8),
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'GM Simulator failed to respond.');
      }
      setSimulatorMessages((prev) => [...prev, { role: 'gm', text: data.reply }]);
    } catch (e: any) {
      const msg = e.message || 'Simulator error';
      setSimulatorError(msg);
      showToast(msg, 'error');
    } finally {
      setSimulatorLoading(false);
    }
  };

  // Persist Simulation Session Progress or Completion
  const handlePersistSession = async (targetStatus: 'in_progress' | 'completed', evalObj?: any) => {
    const scenId = activeImportedScenario?.id || selectedFallbackScenario.id;
    const scenTitle = activeImportedScenario
      ? language === 'vi'
        ? activeImportedScenario.titleVi
        : activeImportedScenario.titleEn
      : language === 'vi'
      ? selectedFallbackScenario.title
      : selectedFallbackScenario.titleEn;
    const saved = await saveSimulationSession({
      id: activeSessionId,
      scenarioId: scenId,
      scenarioTitle: scenTitle,
      selectedOptionIds: selectedDecisionIds,
      learnerAnalysis: learnerMemo,
      conversation: simulatorMessages,
      evaluation: evalObj || evaluationResult || undefined,
      evidenceUrl: evidenceAttachmentUrl || undefined,
      status: targetStatus,
    });
    if (saved) {
      setActiveSessionId(saved.id);
      if (saved.status === 'completed') setSessionLockedCompleted(true);
      showToast(
        targetStatus === 'completed'
          ? language === 'vi'
            ? 'Đã hoàn tất & lưu phiên mô phỏng.'
            : 'Completed and archived simulation session.'
          : language === 'vi'
          ? 'Đã lưu tiến độ phiên mô phỏng.'
          : 'Saved simulation progress.',
        'success'
      );
    }
  };

  const handleUploadEvidenceAttachment = async (file: File) => {
    try {
      setEvidenceUploading(true);
      const scenId = activeImportedScenario?.id || selectedFallbackScenario.id;
      const uploaded = await uploadAuthorizedTrainingFile({
        file,
        category: 'ojt_evidence',
        recordId: `sim_${scenId}`,
      });
      setEvidenceAttachmentUrl(uploaded.downloadUrl);
      showToast(
        language === 'vi'
          ? `Đã đính kèm minh chứng "${uploaded.fileName}" lên Firebase Storage.`
          : `Attached evidence "${uploaded.fileName}" to Firebase Storage.`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Storage attachment upload failed.', 'error');
    } finally {
      setEvidenceUploading(false);
    }
  };

  // Request Evaluation from GM
  const handleRequestEvaluation = async () => {
    try {
      setSimulatorLoading(true);
      setSimulatorError(null);
      const scenarioPayload = buildStructuredScenarioPayload();
      const selectedOptionsObj = activeDecisionOptions.filter((o) => selectedDecisionIds.includes(o.id));
      const res = await fetch('/api/gemini/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          scenario: scenarioPayload,
          selectedDecisionOptions: selectedOptionsObj,
          learnerAnalysis: learnerMemo,
          userTurn:
            learnerMemo.trim() ||
            simulatorMessages.filter((m) => m.role === 'user').slice(-1)[0]?.text ||
            (language === 'vi'
              ? 'Tổng kết đề xuất chiến lược tài chính'
              : 'Executive financial strategy recommendation summary'),
          conversationHistory: simulatorMessages,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI evaluation failed.');
      }
      setEvaluationResult(data);
      if (!sessionLockedCompleted) {
        await handlePersistSession('completed', data);
      }
    } catch (e: any) {
      const msg = e.message || 'Evaluation service unavailable.';
      setSimulatorError(msg);
      showToast(msg, 'error');
    } finally {
      setSimulatorLoading(false);
    }
  };

  // Run Gap Coach AI Diagnosis
  const handleRunGapCoach = async () => {
    try {
      setCoachLoading(true);
      setCoachError(null);
      const res = await fetch('/api/gemini/gap-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId: coachLearnerId,
          focusQuestion: coachFocusQuestion.trim() || undefined,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gap coach request failed.');
      }
      setCoachingPlan(data.coachingPlan);
    } catch (e: any) {
      const msg = e.message || 'AI Gap Coach error';
      setCoachError(msg);
      showToast(msg, 'error');
    } finally {
      setCoachLoading(false);
    }
  };

  // Generate Case Study or Quiz in Lab
  const handleGenerateLabContent = async () => {
    try {
      setLabLoading(true);
      setLabError(null);
      if (labMode === 'case_study') {
        setShowModelAnswer(false);
        setAnswerAnalysis(null);
        const res = await fetch('/api/gemini/generate-case-study', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: labCourseId || undefined,
            domainId: labDomainId !== 'all' ? labDomainId : undefined,
            topic: labTopic.trim() || undefined,
            difficulty: labDifficulty,
            language,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate case study.');
        setGeneratedCase(data.caseStudy);
      } else {
        setQuizSelections({});
        setQuizRevealed(false);
        const selectedCourse = courses.find((c) => c.id === labCourseId);
        const res = await fetch('/api/gemini/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: labCourseId || undefined,
            topic: labTopic.trim() || selectedCourse?.titleEn || 'USALI & Hotel Financial Control',
            difficulty: labDifficulty,
            count: 4,
            language,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate quiz.');
        setGeneratedQuiz(data.questions || []);
      }
    } catch (e: any) {
      const msg = e.message || 'AI Lab error';
      setLabError(msg);
      showToast(msg, 'error');
    } finally {
      setLabLoading(false);
    }
  };

  // Analyze Learner Answer with Transparent Rubric
  const handleAnalyzeAnswer = async () => {
    if (!learnerWrittenAnswer.trim()) {
      showToast(
        language === 'vi' ? 'Vui lòng nhập câu trả lời của bạn để AI chấm điểm.' : 'Please enter your answer to analyze.',
        'error'
      );
      return;
    }

    try {
      setAnalyzingAnswer(true);
      setLabError(null);
      const effectivePrompt = generatedCase
        ? `${generatedCase.title}: ${generatedCase.executiveDilemma}\nQuestions:\n${(generatedCase.questionsForLearner || []).join('\n')}`
        : customPromptForAnalyzer.trim() ||
          'Analyze hotel P&L Flow-Through decline and propose a 30-day corrective plan for the General Manager.';

      const res = await fetch('/api/gemini/analyze-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptQuestion: effectivePrompt,
          learnerAnswer: learnerWrittenAnswer.trim(),
          rubricCriteria: generatedCase?.scoringRubric,
          courseId: labCourseId || undefined,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze answer.');
      setAnswerAnalysis(data.analysis);
    } catch (e: any) {
      const msg = e.message || 'Answer analysis failed.';
      setLabError(msg);
      showToast(msg, 'error');
    } finally {
      setAnalyzingAnswer(false);
    }
  };

  const quizCorrectCount = generatedQuiz.reduce((acc, q, idx) => {
    return acc + (quizSelections[idx] === q.correctAnswer ? 1 : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0A192F] via-[#102A4C] to-[#1E3A8A] text-white p-6 sm:p-8 rounded-2xl border border-slate-700/50 shadow-xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Google Gemini AI &bull; Curriculum-Grounded Assistant</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">{t.ai.title}</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {t.ai.subtitle}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 text-xs font-bold gap-1 w-full xl:w-auto">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{t.ai.tabSimulator}</span>
          </button>
          <button
            onClick={() => setActiveTab('advisor')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'advisor'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{t.ai.tabAdvisor}</span>
          </button>
          <button
            onClick={() => setActiveTab('gapCoach')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'gapCoach'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>{t.ai.tabGapCoach}</span>
          </button>
          <button
            onClick={() => setActiveTab('lab')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'lab'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t.ai.tabLab}</span>
          </button>
        </div>
      </div>

      {/* MODE 1: FC Business Partner Simulator (GM Roleplay & USALI Decision Workspace) */}
      {activeTab === 'simulator' && (
        <div className="space-y-5">
          {/* Dataset Source Indicator Banner */}
          {isUsingDemoFallback ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <strong className="uppercase tracking-wide">
                    {language === 'vi'
                      ? 'Chế Độ Dữ Liệu Demo Dự Phòng (Demo Fallback Scenarios)'
                      : 'Demo Fallback Scenarios Active'}
                  </strong>
                  <span className="block text-[11px] text-amber-800 mt-0.5">
                    {language === 'vi'
                      ? 'Chưa có kịch bản Simulator nào được nhập hoặc Publish từ bộ dữ liệu chính thức. Đang hiển thị 4 tình huống mẫu để luyện tập.'
                      : 'No imported Published scenarios detected yet in active Simulator store. Showing 4 preset practice scenarios.'}
                  </span>
                </div>
              </div>
              {(hasPermission('access_sim_import_center') || hasPermission('access_data_import_center')) && (
                <button
                  onClick={() =>
                    setMainNavTab(
                      hasPermission('access_sim_import_center') ? 'simImportCenter' : 'dataImportCenter'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold text-xs cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{language === 'vi' ? 'Mở Data Import Center' : 'Import Simulator Dataset'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>
                    {dataSourceMode === 'firestore'
                      ? 'Firebase Firestore Simulator Live'
                      : 'Imported Simulator Dataset'}
                  </strong>{' '}
                  — {visibleImportedScenarios.length}{' '}
                  {language === 'vi'
                    ? 'kịch bản khả dụng (Học viên chỉ xem được kịch bản Published).'
                    : 'available scenarios (Learners see Published scenarios only).'}
                </span>
              </div>
              {activeImportedScenario && canManageSim && (
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      activeImportedScenario.status === 'Published'
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {activeImportedScenario.status}
                  </span>
                  <button
                    onClick={() =>
                      toggleScenarioPublish(
                        activeImportedScenario.id,
                        activeImportedScenario.status === 'Published' ? 'Draft' : 'Published'
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold text-[11px] cursor-pointer"
                  >
                    {activeImportedScenario.status === 'Published' ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>{language === 'vi' ? 'Chuyển về Draft' : 'Set Draft'}</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3" />
                        <span>{language === 'vi' ? 'Xuất Bản (Publish)' : 'Publish Scenario'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT PANEL (5 cols): Scenario Selector, Hotel Profile, USALI P&L, Operational KPIs, Challenges, Tasks, Decision Options, Rubric */}
            <div className="lg:col-span-5 space-y-4">
              {/* Scenario Selector */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {t.ai.scenarioSelect}
                </span>

                {!isUsingDemoFallback ? (
                  <div className="space-y-2">
                    {visibleImportedScenarios.map((scen) => (
                      <button
                        key={scen.id}
                        onClick={() => setSelectedScenarioId(scen.id)}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          activeImportedScenario?.id === scen.id
                            ? 'bg-[#0A192F] text-amber-300 border-amber-400 font-bold shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-[10px] opacity-80">
                            {scen.scenarioCode} &bull; L{scen.difficultyLevel}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              scen.status === 'Published'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {scen.status}
                          </span>
                        </div>
                        <span className="block font-extrabold line-clamp-2">
                          {language === 'vi' ? scen.titleVi : scen.titleEn}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {PRESET_SCENARIOS.map((scen, idx) => {
                      const scenLabel = language === 'vi' ? scen.title : scen.titleEn;
                      return (
                        <button
                          key={scen.id}
                          onClick={() => {
                            setSelectedScenarioIndex(idx);
                            setSimulatorMessages([
                              {
                                role: 'gm',
                                text:
                                  language === 'vi'
                                    ? `Chào FC! Tôi đang xem kịch bản: "${scen.title}". Hãy cho tôi biết phân tích tài chính và kế hoạch giải quyết cụ thể của bạn.`
                                    : `Good morning FC! I am looking at: "${scen.titleEn}". Walk me through your diagnostic and tactical plan.`,
                              },
                            ]);
                            setEvaluationResult(null);
                            setSimulatorError(null);
                          }}
                          className={`w-full p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            selectedScenarioIndex === idx
                              ? 'bg-[#0A192F] text-amber-300 border-amber-400 font-bold shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span className="block font-extrabold line-clamp-1">{scenLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hotel Profile & Operational Metrics */}
              {activeImportedScenario ? (
                <>
                  {activeHotelProfile && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-800 font-bold">
                          <Building className="w-4 h-4 text-blue-600" />
                          <span>{activeHotelProfile.hotelName}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                          {activeHotelProfile.roomsAvailable} Keys &bull; {activeHotelProfile.currency}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {activeHotelProfile.brandTier} &bull; {activeHotelProfile.city} &bull; Target Role:{' '}
                        <strong>{activeImportedScenario.targetRole}</strong>
                      </p>
                      <p className="text-[11px] text-slate-700 bg-amber-50 p-3 rounded-xl border border-amber-200/80 leading-relaxed">
                        {language === 'vi' ? activeImportedScenario.summaryVi : activeImportedScenario.summaryEn}
                      </p>
                    </div>
                  )}

                  {/* Operational KPIs Card */}
                  {activeOperationalRows.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{language === 'vi' ? 'Chỉ Số Vận Hành (USALI KPIs)' : 'Hotel Operational KPIs'}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {activeOperationalRows[0].periodLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-semibold">Occupancy</span>
                          <span className="font-bold text-slate-900 font-mono">
                            {activeOperationalRows[0].occupancyPct}%
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-semibold">ADR</span>
                          <span className="font-bold text-slate-900 font-mono">${activeOperationalRows[0].adr}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-semibold">RevPAR</span>
                          <span className="font-bold text-slate-900 font-mono">${activeOperationalRows[0].revpar}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-semibold">Overtime</span>
                          <span className="font-bold text-rose-600 font-mono">
                            {activeOperationalRows[0].overtimeHours ?? 0} hrs
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-semibold">GSS Score</span>
                          <span className="font-bold text-blue-700 font-mono">
                            {activeOperationalRows[0].gssScore ?? 'N/A'}/100
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-semibold">Rooms Sold</span>
                          <span className="font-bold text-amber-700 font-mono">
                            {activeOperationalRows[0].roomsSold}/{activeOperationalRows[0].roomsAvailable}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* USALI Financial Dataset Table */}
                  {activeFinancialRows.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span>{language === 'vi' ? 'Bảng Dữ Liệu P&L Chuẩn USALI' : 'USALI Financial Dataset'}</span>
                      </div>
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-[11px] text-left">
                          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2">Period</th>
                              <th className="p-2 text-right">Total Rev</th>
                              <th className="p-2 text-right">Actual GOP</th>
                              <th className="p-2 text-right">Budget GOP</th>
                              <th className="p-2 text-right">GOP %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {activeFinancialRows.map((fin) => (
                              <tr key={fin.id}>
                                <td className="p-2 font-sans font-bold text-slate-800">{fin.periodLabel}</td>
                                <td className="p-2 text-right">${fin.totalOperatingRevenue.toLocaleString()}</td>
                                <td
                                  className={`p-2 text-right font-bold ${
                                    fin.budgetGop !== undefined && fin.gop < fin.budgetGop ? 'text-rose-600' : 'text-emerald-700'
                                  }`}
                                >
                                  ${fin.gop.toLocaleString()}
                                </td>
                                <td className="p-2 text-right text-slate-500">
                                  {fin.budgetGop !== undefined ? `$${fin.budgetGop.toLocaleString()}` : '—'}
                                </td>
                                <td className="p-2 text-right font-bold">{fin.gopMarginPct}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Challenges & Learner Tasks */}
                  {(activeChallenges.length > 0 || activeTasks.length > 0) && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs">
                      {activeChallenges.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="font-bold text-rose-800 uppercase text-[10px] block">
                            {language === 'vi' ? 'Thách Thức Vận Hành & Tài Chính' : 'Business Challenges'}
                          </span>
                          {activeChallenges.map((c) => (
                            <div key={c.id} className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200">
                              <div className="font-bold text-rose-950">
                                {c.challengeCode}: {language === 'vi' ? c.titleVi : c.titleEn} ({c.severity})
                              </div>
                              <p className="text-[11px] text-rose-900 mt-0.5">
                                {language === 'vi' ? c.descriptionVi : c.descriptionEn}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTasks.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <span className="font-bold text-slate-800 uppercase text-[10px] flex items-center gap-1">
                            <ListChecks className="w-3.5 h-3.5 text-blue-600" />
                            <span>{language === 'vi' ? 'Nhiệm Vụ Học Viên' : 'Learner Tasks'}</span>
                          </span>
                          {activeTasks.map((tk) => (
                            <div key={tk.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                              <div className="font-bold text-slate-900">
                                #{tk.taskOrder} {language === 'vi' ? tk.titleVi : tk.titleEn}{' '}
                                <span className="font-mono text-amber-700">({tk.maxPoints} pts)</span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                {language === 'vi' ? tk.instructionsVi : tk.instructionsEn}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selectable Decision Options */}
                  {activeDecisionOptions.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5 text-xs">
                      <span className="font-bold text-slate-800 uppercase text-[10px] block">
                        {language === 'vi'
                          ? 'Chọn Phương Án Đề Xuất Cho GM (Decision Options)'
                          : 'Select Strategic Decision Options'}
                      </span>
                      {activeDecisionOptions.map((opt) => {
                        const checked = selectedDecisionIds.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            disabled={sessionLockedCompleted}
                            onClick={() => {
                              setSelectedDecisionIds((prev) =>
                                prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]
                              );
                            }}
                            className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-60 ${
                              checked
                                ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-300'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {checked ? (
                                <CheckSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <div className="font-bold text-slate-900">
                                  {opt.optionCode}: {language === 'vi' ? opt.titleVi : opt.titleEn}
                                </div>
                                <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                                  Impact: +${opt.financialImpactEstimate.toLocaleString()} | GOP +{opt.gopImpactPct}% |
                                  Risk: {opt.riskLevel}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Evaluation Rubric Card */}
                  {activeRubrics.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2 text-xs">
                      <span className="font-bold text-slate-800 uppercase text-[10px] block">
                        {language === 'vi' ? 'Thang Điểm Rubric Kịch Bản (100%)' : 'Scenario Evaluation Rubric (100%)'}
                      </span>
                      <div className="space-y-1.5">
                        {activeRubrics.map((rb) => (
                          <div key={rb.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="font-semibold text-slate-800">
                              {language === 'vi' ? rb.criterionNameVi : rb.criterionNameEn}
                            </span>
                            <span className="font-mono font-bold text-amber-700">{rb.weightPercent}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span>{language === 'vi' ? 'Chỉ Số Vận Hành Khách Sạn Tháng Này' : 'Monthly Hotel Operational Metrics'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">Occupancy</span>
                      <span className="font-bold text-slate-900 font-mono">{selectedFallbackScenario.metrics.occupancy}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">ADR</span>
                      <span className="font-bold text-slate-900 font-mono">{selectedFallbackScenario.metrics.adr}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">RevPAR</span>
                      <span className="font-bold text-slate-900 font-mono">{selectedFallbackScenario.metrics.revpar}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">GOP Margin</span>
                      <span className="font-bold text-rose-600 font-mono">{selectedFallbackScenario.metrics.gopMargin}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200/80 leading-relaxed">
                    {language === 'vi' ? selectedFallbackScenario.context : selectedFallbackScenario.contextEn}
                  </p>
                </div>
              )}

              <button
                onClick={handleRequestEvaluation}
                disabled={simulatorLoading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Award className="w-4 h-4" />
                <span>{t.ai.requestAIEval}</span>
              </button>
            </div>

            {/* RIGHT PANEL (7 cols): Interactive GM Roleplay + Strategic Memo + Storage Evidence + Evaluation + Reference Analysis */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-col h-[560px] bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {activeHotelProfile ? `${activeHotelProfile.hotelName} General Manager` : t.ai.gmPersona}
                      </h4>
                      <p className="text-[10px] text-amber-300 font-medium">
                        {language === 'vi'
                          ? 'Tổng Giám Đốc Điều Hành Khách Sạn • Phiên Đối Thoại Trực Tuyến'
                          : 'Hotel General Manager • Live Executive Simulation'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePersistSession('in_progress')}
                      disabled={sessionLockedCompleted}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-slate-700 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      <span>{sessionLockedCompleted ? 'Archived' : language === 'vi' ? 'Lưu Nháp' : 'Save Draft'}</span>
                    </button>
                  </div>
                </div>

                {simulatorError && (
                  <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{simulatorError}</span>
                  </div>
                )}

                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50">
                  {simulatorMessages.map((msg, i) => (
                    <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
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
                      <span>
                        {language === 'vi'
                          ? 'Tổng Giám Đốc đang phân tích luận điểm của bạn...'
                          : 'General Manager is reviewing your financial briefing...'}
                      </span>
                    </div>
                  )}

                  {evaluationResult && (
                    <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-2xl border-2 border-amber-400 space-y-4 text-xs shadow-md">
                      <div className="flex items-center justify-between border-b border-amber-300/80 pb-3">
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-amber-700" />
                          <h4 className="font-extrabold text-sm text-slate-900 uppercase">
                            {language === 'vi'
                              ? 'KẾT QUẢ ĐÁNH GIÁ CỦA HỘI ĐỒNG ĐIỀU HÀNH'
                              : 'EXECUTIVE BOARD RUBRIC EVALUATION'}
                          </h4>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-amber-600 text-white font-black text-xs">
                          {evaluationResult.readinessLevel} ({evaluationResult.scores?.overallScore}%)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-white border border-amber-200">
                          <span className="text-[9px] text-slate-500 block font-bold">Financial Accuracy</span>
                          <span className="font-black text-slate-900 text-sm font-mono">
                            {evaluationResult.scores?.financialAccuracy}%
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-amber-200">
                          <span className="text-[9px] text-slate-500 block font-bold">Analytical Thinking</span>
                          <span className="font-black text-slate-900 text-sm font-mono">
                            {evaluationResult.scores?.analyticalThinking}%
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-amber-200">
                          <span className="text-[9px] text-slate-500 block font-bold">Commercial IQ</span>
                          <span className="font-black text-slate-900 text-sm font-mono">
                            {evaluationResult.scores?.commercialUnderstanding}%
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-amber-200">
                          <span className="text-[9px] text-slate-500 block font-bold">Strategic Actions</span>
                          <span className="font-black text-slate-900 text-sm font-mono">
                            {evaluationResult.scores?.strategicRecommendations}%
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-amber-200">
                          <span className="text-[9px] text-slate-500 block font-bold">Communication</span>
                          <span className="font-black text-slate-900 text-sm font-mono">
                            {evaluationResult.scores?.communicationQuality}%
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-800 leading-relaxed font-medium bg-white/80 p-3 rounded-xl border border-amber-200">
                        {evaluationResult.summaryFeedback}
                      </p>

                      {Array.isArray(evaluationResult.strengths) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                            <span className="font-bold text-emerald-800 block">
                              {language === 'vi' ? 'Điểm mạnh:' : 'Strengths:'}
                            </span>
                            <ul className="list-disc list-inside text-emerald-900 space-y-0.5">
                              {evaluationResult.strengths.map((s: string, idx: number) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-1">
                            <span className="font-bold text-rose-800 block">
                              {language === 'vi' ? 'Điểm cần cải thiện:' : 'Areas to Improve:'}
                            </span>
                            <ul className="list-disc list-inside text-rose-900 space-y-0.5">
                              {(evaluationResult.areasForImprovement || []).map((s: string, idx: number) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      <p className="text-amber-900 italic font-semibold border-l-4 border-amber-500 pl-3">
                        {evaluationResult.gmDebrief}
                      </p>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

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

              {/* Learner Executive Memo & Firebase Storage Evidence Upload */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-slate-900">
                    {language === 'vi'
                      ? 'Bản Ghi Chú Phân Tích Tài Chính & Minh Chứng Đính Kèm (Storage)'
                      : 'Executive Financial Memo & Storage Evidence Attachment'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      ref={evidenceFileRef}
                      type="file"
                      accept=".pdf,.xlsx,.xls,.csv,.docx,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadEvidenceAttachment(f);
                      }}
                    />
                    <button
                      onClick={() => evidenceFileRef.current?.click()}
                      disabled={evidenceUploading || !firebaseUser?.emailVerified}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                      title={
                        !firebaseUser?.emailVerified
                          ? 'Sign in with verified Firebase account to attach files to Firebase Storage'
                          : ''
                      }
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>
                        {evidenceUploading
                          ? 'Uploading...'
                          : language === 'vi'
                          ? 'Đính Kèm File (.xlsx/.pdf)'
                          : 'Attach Evidence'}
                      </span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  disabled={sessionLockedCompleted}
                  value={learnerMemo}
                  onChange={(e) => setLearnerMemo(e.target.value)}
                  placeholder={
                    language === 'vi'
                      ? 'Tổng hợp phân tích GOP Flow-Through, lý do chọn phương án và kế hoạch 30-60-90 ngày cho GM...'
                      : 'Draft your USALI variance reconciliation, Flow-Through breakdown, and 30-60-90 day action plan...'
                  }
                  className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none text-xs"
                />
                {evidenceAttachmentUrl && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between">
                    <span>Storage Evidence Attached</span>
                    <a href={evidenceAttachmentUrl} target="_blank" rel="noreferrer" className="font-bold underline">
                      View File
                    </a>
                  </div>
                )}
              </div>

              {/* Official Reference Analysis Panel (Admins see always; Learners see after Evaluation) */}
              {activeReferenceAnalysis.length > 0 && (canPreviewDrafts || evaluationResult) && (
                <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 font-extrabold text-emerald-900">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>
                      {language === 'vi'
                        ? 'Phân Tích Chuẩn Tham Chiếu (USALI Reference Analysis)'
                        : 'Official USALI Reference Analysis'}
                    </span>
                  </div>
                  {activeReferenceAnalysis.map((ref) => (
                    <div key={ref.id} className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                      <div className="font-bold text-emerald-950">{ref.topic}</div>
                      <p className="text-slate-700">{language === 'vi' ? ref.rootCauseVi : ref.rootCauseEn}</p>
                      <div className="font-mono text-[11px] text-blue-800 bg-white/80 px-2 py-1 rounded border border-emerald-200">
                        Formula: {ref.benchmarkFormula}
                      </div>
                      <p className="text-emerald-900 font-semibold">
                        Action: {language === 'vi' ? ref.recommendedActionVi : ref.recommendedActionEn}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recorded Simulation Sessions */}
              {(() => {
                const visibleSessions = (simulatorData.simulationSessions || []).filter((sess) =>
                  isSupervisor
                    ? true
                    : sess.employeeId === currentUser.id || sess.employeeUid === currentUser.id
                );
                if (visibleSessions.length === 0) return null;
                return (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2 text-xs">
                    <span className="font-extrabold text-slate-900 block">
                      {language === 'vi'
                        ? `Lịch Sử Phiên Mô Phỏng (${visibleSessions.length})`
                        : `Recorded Simulation Sessions (${visibleSessions.length})`}
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {visibleSessions.slice(0, 8).map((sess) => (
                        <div
                          key={sess.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{sess.scenarioTitle}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {sess.id} &bull; Decisions: {sess.selectedOptionIds?.length || 0} &bull; {sess.updatedAt}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              sess.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sess.status}
                            {sess.evaluation?.scores?.overallScore ? ` (${sess.evaluation.scores.overallScore}%)` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: USALI & Curriculum-Grounded Finance Tutor */}
      {activeTab === 'advisor' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-[650px] overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="font-bold text-slate-500 whitespace-nowrap">
                {language === 'vi' ? 'Gợi ý nhanh:' : 'Quick Prompts:'}
              </span>
              {(language === 'vi'
                ? [
                    'Giải thích cấu trúc phân bổ chi phí USALI 12th Edition',
                    'Công thức tính Flow-Through và Flex khi doanh thu biến động',
                    'Checklist quy trình Fast-Close Day 3',
                    'Phân biệt FF&E Reserve và Chi phí bảo trì POM',
                  ]
                : [
                    'Explain USALI 12th Edition Undistributed Cost Allocation',
                    'How to calculate GOP Flow-Through & Flex Variance',
                    'Day-3 Fast-Close Month-End Checklist',
                    'FF&E Reserve vs. Property Operations & Maintenance (POM)',
                  ]
              ).map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setAdvisorInput(q)}
                  className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:border-amber-400 text-slate-700 whitespace-nowrap text-[11px] transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 shrink-0"
            >
              <option value="">
                {language === 'vi' ? 'Nguồn: Toàn bộ giáo trình (18 khóa)' : 'Source: Full Approved Curriculum'}
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}: {language === 'vi' ? c.titleVi : c.titleEn}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            {advisorMessages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
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
                <span>
                  {language === 'vi'
                    ? 'Trợ lý AI đang tra cứu giáo trình chuẩn USALI và soạn câu trả lời...'
                    : 'Consulting approved USALI curriculum and drafting guidance...'}
                </span>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={advisorInput}
              onChange={(e) => setAdvisorInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAdvisor()}
              placeholder={
                language === 'vi'
                  ? 'Hỏi về USALI, hạch toán doanh thu, tính RevPAR, kiểm soát chi phí...'
                  : 'Ask about USALI, RevPAR, month-end closing...'
              }
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-slate-50/50"
            />
            <button
              onClick={handleSendAdvisor}
              disabled={advisorLoading || !advisorInput.trim()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Gửi câu hỏi' : 'Send'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 3: AI COMPETENCY GAP COACH & ACTIVITY RECOMMENDER */}
      {activeTab === 'gapCoach' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900">
                  {language === 'vi'
                    ? 'Cố Vấn Phân Tích Khoảng Trống & Đề Xuất Lộ Trình Học Tập AI'
                    : 'AI Competency Gap Coach & Activity Recommender'}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'vi'
                    ? 'AI đọc trực tiếp hồ sơ đánh giá năng lực, điểm khóa học, bài thi và OJT thực tế để kê đơn khóa học chuẩn xác.'
                    : 'Analyzes live competency gaps, course completion, quizzes, and OJT records to prescribe approved learning actions.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isSupervisor && (
                  <select
                    value={coachLearnerId}
                    onChange={(e) => setCoachLearnerId(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 text-slate-800"
                  >
                    {users
                      .filter((u) => u.role === 'learner')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.position})
                        </option>
                      ))}
                  </select>
                )}

                <button
                  onClick={handleRunGapCoach}
                  disabled={coachLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {coachLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>
                    {coachLoading
                      ? language === 'vi'
                        ? 'Đang phân tích hồ sơ...'
                        : 'Analyzing Profile...'
                      : language === 'vi'
                      ? 'Phân Tích Gap & Đề Xuất Hoạt Động'
                      : 'Diagnose Gaps & Recommend Activities'}
                  </span>
                </button>
              </div>
            </div>

            <input
              type="text"
              value={coachFocusQuestion}
              onChange={(e) => setCoachFocusQuestion(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Mục tiêu ưu tiên (vd: Chuẩn bị thăng tiến lên Assistant FC trong 6 tháng tới)...'
                  : 'Optional coaching focus (e.g., Preparing for AFC promotion within 6 months)...'
              }
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />

            {coachError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{coachError}</span>
              </div>
            )}
          </div>

          {coachingPlan && (
            <div className="space-y-6">
              {/* Executive Diagnosis */}
              <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-600" />
                    <span>{language === 'vi' ? 'Chẩn Đoán Năng Lực Tổng Quan' : 'Executive Readiness Diagnosis'}</span>
                  </h4>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                    {coachingPlan.readinessDiagnosis}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {coachingPlan.executiveSummary}
                </p>
              </div>

              {/* Top Priority Gaps */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900">
                  {language === 'vi' ? 'Khoảng Trống Trọng Tâm Cần Thu Hẹp' : 'Priority Competency Gaps'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {(coachingPlan.topGaps || []).map((gap: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                          {gap.competencyCode}
                        </span>
                        <span className="font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                          L{gap.currentLevel} &rarr; L{gap.targetLevel} (Gap -{gap.gap})
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{gap.businessImpact}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => openCourseByCode(gap.recommendedCourseCode)}
                          className="px-2.5 py-1 rounded-lg bg-[#0A192F] hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>{gap.recommendedCourseCode}</span>
                        </button>
                        <button
                          onClick={() => setMainNavTab('ojtProjects')}
                          className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[11px] cursor-pointer"
                        >
                          {gap.recommendedOjtCode} &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 30/60/90 Day Action Roadmap */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900">
                  {language === 'vi' ? 'Lộ Trình Hành Động & Coaching 30/60/90 Ngày' : 'Recommended 30/60/90-Day Coaching Roadmap'}
                </h4>
                <div className="space-y-3 text-xs">
                  {(coachingPlan.recommendedActivities || []).map((act: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                            {act.timeframe}
                          </span>
                          <span className="font-extrabold text-slate-900">{act.activityTitle}</span>
                        </div>
                        <p className="text-slate-600">{act.coachingAction}</p>
                        <p className="text-[11px] text-emerald-700 font-semibold">
                          KPI: {act.successMetric}
                        </p>
                      </div>
                      <button
                        onClick={() => openCourseByCode(act.courseCode)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors"
                      >
                        {act.courseCode} <ChevronRight className="w-3.5 h-3.5 inline" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 4: QUIZ, CASE STUDY GENERATOR & ANSWER ANALYZER LAB */}
      {activeTab === 'lab' && (
        <div className="space-y-6">
          {/* Controls Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {language === 'vi'
                    ? 'Phòng Lab Tạo Case Study, Đề Thi & Chấm Bài Theo Rubric'
                    : 'Case Study Generator, Practice Quiz & Rubric Answer Analyzer'}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'vi'
                    ? 'Sinh tình huống & câu hỏi trực tiếp từ học liệu chuẩn của Học viện, chấm bài viết và chỉ ra khoảng trống năng lực.'
                    : 'Generate curriculum-grounded case studies or quizzes, write your financial analysis, and receive rubric grading.'}
                </p>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
                <button
                  onClick={() => setLabMode('case_study')}
                  className={`px-3.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                    labMode === 'case_study' ? 'bg-[#0A192F] text-amber-300 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {language === 'vi' ? 'Tình Huống & Chấm Bài' : 'Case Study & Analyzer'}
                </button>
                <button
                  onClick={() => setLabMode('quiz')}
                  className={`px-3.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                    labMode === 'quiz' ? 'bg-[#0A192F] text-amber-300 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {language === 'vi' ? 'Sinh Đề Trắc Nghiệm' : 'AI Practice Quiz'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <select
                value={labCourseId}
                onChange={(e) => setLabCourseId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800"
              >
                <option value="">{language === 'vi' ? 'Tất cả 18 khóa học' : 'All 18 Courses'}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}: {language === 'vi' ? c.titleVi : c.titleEn}
                  </option>
                ))}
              </select>

              <select
                value={labDomainId}
                onChange={(e) => setLabDomainId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800"
              >
                <option value="all">{language === 'vi' ? 'Tất cả 6 miền năng lực' : 'All 6 Competency Domains'}</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}: {language === 'vi' ? d.nameVi : d.nameEn}
                  </option>
                ))}
              </select>

              <select
                value={labDifficulty}
                onChange={(e) => setLabDifficulty(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800"
              >
                <option value="Foundation">Level 1: Foundation</option>
                <option value="Operational">Level 2: Operational</option>
                <option value="Advanced">Level 3: Advanced</option>
                <option value="Strategic">Level 4: Strategic</option>
              </select>

              <button
                onClick={handleGenerateLabContent}
                disabled={labLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {labLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>
                  {labLoading
                    ? language === 'vi'
                      ? 'Đang tạo...'
                      : 'Generating...'
                    : labMode === 'case_study'
                    ? language === 'vi'
                      ? 'Tạo Case Study Mới'
                      : 'Generate Case Study'
                    : language === 'vi'
                    ? 'Tạo 4 Câu Hỏi Thi'
                    : 'Generate 4-Question Quiz'}
                </span>
              </button>
            </div>

            <input
              type="text"
              value={labTopic}
              onChange={(e) => setLabTopic(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Chủ đề cụ thể (vd: Phân tích Flow-Through F&B giảm sút, Kiểm soát công nợ AR DSO > 45 ngày...)'
                  : 'Custom topic focus (e.g., F&B Flow-Through compression, AR DSO aging > 45 days)...'
              }
              className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
            />

            {labError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{labError}</span>
              </div>
            )}
          </div>

          {/* CASE STUDY & ANSWER ANALYZER VIEW */}
          {labMode === 'case_study' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Generated Case Study or Custom Prompt (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                {generatedCase ? (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 text-xs">
                    <div className="border-b border-slate-200 pb-3">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {(generatedCase.competencyCodes || []).map((c: string) => (
                          <span key={c} className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono font-bold text-[10px]">
                            {c}
                          </span>
                        ))}
                        {(generatedCase.recommendedCourseCodes || []).map((c: string) => (
                          <button
                            key={c}
                            onClick={() => openCourseByCode(c)}
                            className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-mono font-bold text-[10px] cursor-pointer"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900">{generatedCase.title}</h4>
                      <p className="text-slate-500 mt-0.5">{generatedCase.propertyProfile}</p>
                    </div>

                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">{generatedCase.scenarioNarrative}</p>

                    {/* Metrics Snapshot */}
                    {Array.isArray(generatedCase.financialSnapshot) && generatedCase.financialSnapshot.length > 0 && (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2">Metric</th>
                              <th className="p-2 text-right">Budget</th>
                              <th className="p-2 text-right">Actual</th>
                              <th className="p-2 text-right">Variance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {generatedCase.financialSnapshot.map((row: any, idx: number) => (
                              <tr key={idx}>
                                <td className="p-2 font-sans font-semibold text-slate-800">{row.metric}</td>
                                <td className="p-2 text-right text-slate-600">{row.budget}</td>
                                <td className="p-2 text-right font-bold text-slate-900">{row.actual}</td>
                                <td className="p-2 text-right font-bold text-rose-600">{row.variance}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                      <span className="font-bold text-rose-900 uppercase text-[10px]">
                        {language === 'vi' ? 'Bài Toán Điều Hành Đặt Ra:' : 'Executive Dilemma:'}
                      </span>
                      <p className="text-rose-800 leading-relaxed">{generatedCase.executiveDilemma}</p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-800 block">
                        {language === 'vi' ? 'Câu hỏi phân tích dành cho Học viên:' : 'Questions for Analysis:'}
                      </span>
                      <ol className="list-decimal list-inside space-y-1 text-slate-700">
                        {(generatedCase.questionsForLearner || []).map((q: string, idx: number) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Transparent Scoring Rubric */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <span className="font-bold text-slate-800 block">
                        {language === 'vi' ? 'Thang Điểm Rubric Minh Bạch (100 điểm):' : 'Transparent Scoring Rubric (100 pts):'}
                      </span>
                      <div className="space-y-1.5">
                        {(generatedCase.scoringRubric || []).map((r: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                            <div>
                              <span className="font-bold text-slate-900 block">{r.criterion}</span>
                              <span className="text-[11px] text-slate-500">{r.expectation}</span>
                            </div>
                            <span className="font-mono font-bold text-amber-700 shrink-0">{r.maxPoints} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowModelAnswer(!showModelAnswer)}
                      className="text-blue-700 font-bold hover:underline cursor-pointer"
                    >
                      {showModelAnswer
                        ? language === 'vi'
                          ? 'Ẩn đáp án tham khảo chuẩn'
                          : 'Hide Model Solution'
                        : language === 'vi'
                        ? 'Xem gợi ý đáp án tham khảo'
                        : 'Reveal Model Solution Outline'}
                    </button>

                    {showModelAnswer && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 whitespace-pre-line leading-relaxed">
                        {generatedCase.modelAnswerOutline}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>
                        {language === 'vi'
                          ? 'Hoặc Nhập Đề Bài / Tình Huống Riêng Để AI Chấm Điểm'
                          : 'Custom Prompt or Generated Case Study'}
                      </span>
                    </div>
                    <p className="text-slate-500">
                      {language === 'vi'
                        ? 'Nhấn "Tạo Case Study Mới" ở trên để AI sinh tình huống hoàn chỉnh kèm bảng số liệu USALI & Rubric, hoặc nhập trực tiếp đề bài của bạn tại đây:'
                        : 'Click "Generate Case Study" above, or paste your own hospitality finance question below to evaluate your answer:'}
                    </p>
                    <textarea
                      rows={5}
                      value={customPromptForAnalyzer}
                      onChange={(e) => setCustomPromptForAnalyzer(e.target.value)}
                      placeholder={
                        language === 'vi'
                          ? 'Ví dụ: Doanh thu phòng tăng 10% lên $990k nhưng chi phí nhân sự tăng 22% và OTA chiếm 60%. Hãy giải thích tác động lên GOP Flow-Through và đề xuất giải pháp...'
                          : 'Paste your finance prompt here...'
                      }
                      className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Right: Answer Submission & AI Rubric Breakdown (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 text-xs">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>
                      {language === 'vi'
                        ? 'Bài Làm Phân Tích & Chấm Điểm Rubric Tự Động'
                        : 'Your Financial Analysis & AI Rubric Evaluation'}
                    </span>
                  </h4>

                  <textarea
                    rows={8}
                    value={learnerWrittenAnswer}
                    onChange={(e) => setLearnerWrittenAnswer(e.target.value)}
                    placeholder={
                      language === 'vi'
                        ? 'Trình bày phân tích USALI, tính toán Flow-Through / phương sai chi phí, xác định nguyên nhân gốc rễ và đề xuất kế hoạch hành động cho GM...'
                        : 'Write your USALI analysis, Flow-Through calculations, root causes, and strategic GM recommendations...'
                    }
                    className="w-full p-3.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 leading-relaxed"
                  />

                  <button
                    onClick={handleAnalyzeAnswer}
                    disabled={analyzingAnswer || !learnerWrittenAnswer.trim()}
                    className="w-full py-3 bg-[#0A192F] hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {analyzingAnswer ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>
                      {analyzingAnswer
                        ? language === 'vi'
                          ? 'AI đang chấm theo Rubric...'
                          : 'Analyzing against Rubric...'
                        : language === 'vi'
                        ? 'Phân Tích Bài Làm & Chấm Điểm Rubric'
                        : 'Analyze Answer with AI Rubric'}
                    </span>
                  </button>
                </div>

                {answerAnalysis && (
                  <div className="bg-white p-6 rounded-2xl border-2 border-amber-300 shadow-md space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          {language === 'vi' ? 'Điểm Tổng Hợp Theo Rubric' : 'Rubric Total Score'}
                        </span>
                        <span className="text-2xl font-black font-mono text-slate-900">
                          {answerAnalysis.overallScore} / 100
                        </span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full font-extrabold text-xs ${
                          answerAnalysis.passed
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {answerAnalysis.passed ? t.quiz.passed : t.quiz.failed}
                      </span>
                    </div>

                    {/* Transparent Criterion Breakdown */}
                    <div className="space-y-2">
                      <span className="font-bold text-slate-800 block">
                        {language === 'vi' ? 'Chi Tiết Điểm Từng Tiêu Chí:' : 'Rubric Breakdown:'}
                      </span>
                      {(answerAnalysis.rubricBreakdown || []).map((item: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>{item.criterion}</span>
                            <span className="font-mono text-blue-700">
                              {item.score} / {item.maxPoints}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{item.justification}</p>
                        </div>
                      ))}
                    </div>

                    {/* Gaps Identified & Recommended Courses */}
                    {Array.isArray(answerAnalysis.competencyGapsIdentified) &&
                      answerAnalysis.competencyGapsIdentified.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                          <span className="font-bold text-amber-900 block">
                            {language === 'vi' ? 'Khoảng Trống Năng Lực Phát Hiện:' : 'Competency Gaps Identified:'}
                          </span>
                          {answerAnalysis.competencyGapsIdentified.map((g: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-amber-300 text-amber-900 text-[10px]">
                                {g.competencyCode}
                              </span>
                              <span className="text-slate-700">{g.issue}</span>
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {(answerAnalysis.recommendedCourseCodes || []).map((code: string) => (
                              <button
                                key={code}
                                onClick={() => openCourseByCode(code)}
                                className="px-2.5 py-1 rounded-lg bg-[#0A192F] hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-[11px] cursor-pointer"
                              >
                                {code} &rarr;
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-slate-800 leading-relaxed">
                      <strong className="block text-blue-900 mb-1">
                        {language === 'vi' ? 'Nhận xét của Chuyên gia FC:' : 'Coach Revision Guidance:'}
                      </strong>
                      {answerAnalysis.coachingFeedback}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRACTICE QUIZ GENERATOR VIEW */}
          {labMode === 'quiz' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5 text-xs">
              {generatedQuiz.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <HelpCircle className="w-8 h-8 mx-auto text-amber-500" />
                  <p className="font-bold text-slate-700">
                    {language === 'vi'
                      ? 'Chọn khóa học hoặc chủ đề ở trên rồi nhấn "Tạo 4 Câu Hỏi Thi".'
                      : 'Select a course or topic above and click "Generate 4-Question Quiz".'}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="font-extrabold text-sm text-slate-900">
                      {language === 'vi'
                        ? `Đề Thi Thực Hành AI (${generatedQuiz.length} câu)`
                        : `AI Practice Exam (${generatedQuiz.length} Questions)`}
                    </span>
                    {quizRevealed && (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold font-mono">
                        {quizCorrectCount}/{generatedQuiz.length} ({Math.round((quizCorrectCount / generatedQuiz.length) * 100)}%)
                      </span>
                    )}
                  </div>

                  {generatedQuiz.map((q, idx) => {
                    const selected = quizSelections[idx];
                    const isCorrect = selected === q.correctAnswer;
                    return (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-slate-900">
                            {idx + 1}. {q.question}
                          </p>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 shrink-0">
                            {q.competencyCode}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || []).map((opt: string, optIdx: number) => {
                            const isPicked = selected === opt;
                            const isRightOpt = q.correctAnswer === opt;
                            return (
                              <button
                                key={optIdx}
                                disabled={quizRevealed}
                                onClick={() => setQuizSelections((prev) => ({ ...prev, [idx]: opt }))}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                  quizRevealed
                                    ? isRightOpt
                                      ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold'
                                      : isPicked
                                      ? 'bg-rose-100 border-rose-400 text-rose-900'
                                      : 'bg-white border-slate-200 text-slate-500'
                                    : isPicked
                                    ? 'bg-[#0A192F] text-amber-300 border-amber-400 font-bold'
                                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {quizRevealed && (
                          <div
                            className={`p-3 rounded-lg border text-[11px] flex items-start gap-2 ${
                              isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                            }`}
                          >
                            {isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <strong>{t.quiz.explanation}: </strong>
                              {q.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex justify-end">
                    <button
                      onClick={() => setQuizRevealed(true)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                    >
                      {t.quiz.submitAnswers}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
