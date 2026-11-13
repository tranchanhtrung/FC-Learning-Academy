import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TalentHeaderBar } from './TalentHeaderBar';
import {
  calculateGapAnalysis,
  matchRecommendationsForCompetency,
} from '../../lib/talentEngine';
import {
  ActivityType702010,
  DevelopmentCategory,
  IdpWorkflowStatus,
  IndividualDevelopmentPlanDoc,
} from '../../types';
import {
  FilePlus2,
  Send,
  CheckCircle2,
  RotateCcw,
  Plus,
  Trash2,
  AlertTriangle,
  History,
  Play,
  Lock,
} from 'lucide-react';

const WORKFLOW_STAGES: { id: IdpWorkflowStatus; labelEn: string; labelVi: string }[] = [
  { id: 'draft', labelEn: 'Draft', labelVi: 'Bản nháp' },
  { id: 'submitted', labelEn: 'Submitted', labelVi: 'Đã gửi' },
  { id: 'manager_review', labelEn: 'Manager Review', labelVi: 'Quản lý duyệt' },
  { id: 'lnd_approved', labelEn: 'L&D Approved', labelVi: 'L&D duyệt' },
  { id: 'active', labelEn: 'Active', labelVi: 'Hiệu lực' },
  { id: 'in_progress', labelEn: 'In Progress', labelVi: 'Đang thực hiện' },
  { id: 'completed', labelEn: 'Completed', labelVi: 'Hoàn thành' },
  { id: 'reassessment', labelEn: 'Reassessment', labelVi: 'Tái đánh giá' },
  { id: 'closed', labelEn: 'Closed', labelVi: 'Đã đóng' },
];

interface DraftObjectiveRow {
  competencyCode: string;
  titleEn: string;
  titleVi: string;
  category: DevelopmentCategory;
  ratioCategory: ActivityType702010;
  linkedCourseId?: string;
  linkedCourseCode?: string;
  linkedPracticalId?: string;
  linkedPracticalCode?: string;
  targetDate: string;
  successMeasure: string;
  baselineLevel: number;
  targetLevel: number;
  gap: number;
  isCritical: boolean;
}

export const TalentIdpView: React.FC = () => {
  const {
    currentUser,
    competencies,
    domains,
    courses,
    ojtAssignments,
    learningPaths,
    talentConfig,
    competencyAssessments,
    talentIdps,
    developmentActivities,
    idpReviewLogs,
    selectedTalentEmployeeId,
    selectedTalentTargetPosition,
    createTalentIdp,
    transitionTalentIdp,
    showToast,
    language,
  } = useApp();

  const isLearner = currentUser.role === 'learner';
  const employeeId = isLearner ? currentUser.id : selectedTalentEmployeeId;
  const isManagerOrAbove = ['financial_controller', 'lnd_manager', 'super_admin', 'general_manager'].includes(
    currentUser.role
  );
  const isLndOrAdmin = ['lnd_manager', 'super_admin'].includes(currentUser.role);

  const employeeIdps = useMemo(
    () =>
      talentIdps
        .filter((i) => i.employeeId === employeeId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [talentIdps, employeeId]
  );

  const [selectedIdpId, setSelectedIdpId] = useState<string | null>(null);
  const [builderMode, setBuilderMode] = useState<boolean>(false);
  const [overallGoalEn, setOverallGoalEn] = useState('');
  const [overallGoalVi, setOverallGoalVi] = useState('');
  const [draftObjectives, setDraftObjectives] = useState<DraftObjectiveRow[]>([]);
  const [duplicateConfirmId, setDuplicateConfirmId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [creating, setCreating] = useState(false);

  const gapSummary = useMemo(
    () =>
      calculateGapAnalysis({
        assessments: competencyAssessments,
        employeeId,
        targetPosition: selectedTalentTargetPosition,
        competencies,
        domains,
        config: talentConfig,
      }),
    [competencyAssessments, employeeId, selectedTalentTargetPosition, competencies, domains, talentConfig]
  );

  const activeIdp: IndividualDevelopmentPlanDoc | null = useMemo(() => {
    if (builderMode) return null;
    if (selectedIdpId) return employeeIdps.find((i) => i.id === selectedIdpId) || employeeIdps[0] || null;
    return employeeIdps[0] || null;
  }, [builderMode, selectedIdpId, employeeIdps]);

  const populateDraftFromGaps = () => {
    const topGaps = gapSummary.priorityDevelopmentList.slice(0, 5);
    const built: DraftObjectiveRow[] = [];

    topGaps.forEach((gapRow, idx) => {
      const comp = competencies.find((c) => c.code === gapRow.competencyCode);
      if (!comp) return;
      const match = matchRecommendationsForCompetency({
        competency: comp,
        gap: gapRow.gap,
        targetLevel: gapRow.targetLevel,
        courses,
        ojtAssignments,
        learningPaths,
        customActivities: developmentActivities,
      });

      const primary =
        match.recommendations.find((r) => r.ratioCategory === '70_experiential') ||
        match.recommendations[0];

      built.push({
        competencyCode: gapRow.competencyCode,
        titleEn: primary
          ? primary.titleEn
          : `Develop ${gapRow.competencyCode}: ${gapRow.nameEn}`,
        titleVi: primary
          ? primary.titleVi
          : `Phát triển ${gapRow.competencyCode}: ${gapRow.nameVi}`,
        category: primary?.category || 'B_On_The_Job',
        ratioCategory: primary?.ratioCategory || '70_experiential',
        linkedCourseId: primary?.sourceType === 'course' ? primary.sourceRecordId : undefined,
        linkedCourseCode: primary?.sourceType === 'course' ? primary.sourceCode : undefined,
        linkedPracticalId:
          primary?.sourceType === 'practical_assignment' ? primary.sourceRecordId : undefined,
        linkedPracticalCode:
          primary?.sourceType === 'practical_assignment' ? primary.sourceCode : undefined,
        targetDate: new Date(Date.now() + (idx + 1) * 30 * 86400000).toISOString().split('T')[0],
        successMeasure: `Reach Level ${gapRow.targetLevel} verified by Financial Controller`,
        baselineLevel: gapRow.currentLevel || 1,
        targetLevel: gapRow.targetLevel,
        gap: gapRow.gap,
        isCritical: gapRow.isCritical,
      });
    });

    setOverallGoalEn(
      `Close ${built.length} priority competency gaps to achieve ${selectedTalentTargetPosition} readiness.`
    );
    setOverallGoalVi(
      `Thu hẹp ${built.length} khoảng trống năng lực trọng tâm để sẵn sàng cho vị trí ${selectedTalentTargetPosition}.`
    );
    setDraftObjectives(built);
    setBuilderMode(true);
    setDuplicateConfirmId(null);
  };

  useEffect(() => {
    setSelectedIdpId(employeeIdps[0]?.id || null);
    setBuilderMode(false);

    const triggerEmp = sessionStorage.getItem('fc_trigger_generate_idp');
    if (triggerEmp === employeeId) {
      sessionStorage.removeItem('fc_trigger_generate_idp');
      populateDraftFromGaps();
      return;
    }

    const aiDraftRaw = sessionStorage.getItem('fc_ai_idp_draft');
    if (aiDraftRaw) {
      try {
        const parsed = JSON.parse(aiDraftRaw);
        if (parsed.employeeId === employeeId && Array.isArray(parsed.actionItems)) {
          sessionStorage.removeItem('fc_ai_idp_draft');
          const mapped: DraftObjectiveRow[] = parsed.actionItems.map((it: any, idx: number) => {
            const gapRow = gapSummary.rows.find((r) => r.competencyCode === it.competencyCode);
            const ratio: ActivityType702010 = String(it.ratioTag).includes('10')
              ? '10_formal'
              : String(it.ratioTag).includes('20')
              ? '20_social'
              : '70_experiential';
            const cat: DevelopmentCategory =
              ratio === '10_formal'
                ? 'A_Formal_Learning'
                : ratio === '20_social'
                ? 'D_Coaching_Mentoring'
                : 'B_On_The_Job';
            const matchedCourse = courses.find((c) => c.code === it.mappedResourceCode);
            const matchedOjt = ojtAssignments.find((o) => o.code === it.mappedResourceCode);
            return {
              competencyCode: it.competencyCode || 'FAR-01',
              titleEn: it.title,
              titleVi: it.title,
              category: cat,
              ratioCategory: ratio,
              linkedCourseId: matchedCourse?.id,
              linkedCourseCode: matchedCourse?.code,
              linkedPracticalId: matchedOjt?.id,
              linkedPracticalCode: matchedOjt?.code,
              targetDate: new Date(Date.now() + (idx + 1) * 30 * 86400000).toISOString().split('T')[0],
              successMeasure: it.successMetric,
              baselineLevel: gapRow?.currentLevel || 2,
              targetLevel: gapRow?.targetLevel || 3,
              gap: gapRow?.gap || 1,
              isCritical: gapRow?.isCritical || false,
            };
          });
          setOverallGoalEn(parsed.headline || '');
          setOverallGoalVi(parsed.headline || '');
          setDraftObjectives(mapped);
          setBuilderMode(true);
        }
      } catch {
        // ignore invalid draft json
      }
    }
  }, [employeeId]);

  const handleSaveNewIdp = async (confirmDuplicate = false) => {
    if (!gapSummary.hasApprovedAssessment) {
      showToast(
        language === 'vi'
          ? 'Cần có đánh giá năng lực đã phê duyệt trước khi tạo IDP.'
          : 'An approved competency assessment is required before creating an IDP.',
        'error'
      );
      return;
    }
    if (draftObjectives.length === 0) {
      showToast('Add at least one development objective.', 'error');
      return;
    }

    setCreating(true);
    const res = await createTalentIdp({
      employeeId,
      targetPosition: selectedTalentTargetPosition,
      sourceAssessmentId: gapSummary.assessmentId,
      overallGoalEn,
      overallGoalVi,
      objectives: draftObjectives,
      confirmDuplicate,
    });
    setCreating(false);

    if (res.duplicateId) {
      setDuplicateConfirmId(res.duplicateId);
      return;
    }
    if (res.idp) {
      setDuplicateConfirmId(null);
      setBuilderMode(false);
      setSelectedIdpId(res.idp.id);
      showToast(
        language === 'vi'
          ? `Đã tạo IDP v${res.idp.version} (Bản nháp).`
          : `Created IDP v${res.idp.version} (Draft).`,
        'success'
      );
    }
  };

  const handleTransition = async (targetStatus: IdpWorkflowStatus) => {
    if (!activeIdp) return;
    const updated = await transitionTalentIdp(activeIdp.id, targetStatus, reviewComment);
    if (updated) {
      setReviewComment('');
      showToast(
        language === 'vi'
          ? `Đã chuyển IDP sang trạng thái: ${updated.status}`
          : `IDP transitioned to ${updated.status}.`,
        'success'
      );
    }
  };

  const addObjectiveRow = () => {
    const firstGap = gapSummary.priorityDevelopmentList[0] || gapSummary.rows[0];
    if (!firstGap) return;
    setDraftObjectives((prev) => [
      ...prev,
      {
        competencyCode: firstGap.competencyCode,
        titleEn: `Targeted practice for ${firstGap.competencyCode}`,
        titleVi: `Thực hành chuyên sâu ${firstGap.competencyCode}`,
        category: 'B_On_The_Job',
        ratioCategory: '70_experiential',
        targetDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        successMeasure: `Reach Level ${firstGap.targetLevel}`,
        baselineLevel: firstGap.currentLevel || 2,
        targetLevel: firstGap.targetLevel,
        gap: firstGap.gap,
        isCritical: firstGap.isCritical,
      },
    ]);
  };

  const activeLogs = useMemo(
    () => (activeIdp ? idpReviewLogs.filter((l) => l.idpId === activeIdp.id) : []),
    [idpReviewLogs, activeIdp?.id]
  );

  const mixCounts = useMemo(() => {
    const objs = builderMode ? draftObjectives : activeIdp?.objectives || [];
    const total = objs.length || 1;
    const exp = Math.round((objs.filter((o) => o.ratioCategory === '70_experiential').length / total) * 100);
    const soc = Math.round((objs.filter((o) => o.ratioCategory === '20_social').length / total) * 100);
    const frm = Math.round((objs.filter((o) => o.ratioCategory === '10_formal').length / total) * 100);
    return { exp, soc, frm };
  }, [builderMode, draftObjectives, activeIdp]);

  return (
    <div className="space-y-6">
      <TalentHeaderBar
        titleEn="Individual Development Plan (IDP) Builder & 9-Stage Workflow"
        titleVi="Xây dựng Kế hoạch Phát triển Cá nhân (IDP) & Quy trình 9 Bước"
        subtitleEn="Build 70-20-10 development plans from approved gaps with multi-tier Manager & L&D approvals and immutable review logs."
        subtitleVi="Tạo IDP theo mô hình 70-20-10 từ khoảng trống năng lực, kiểm soát phê duyệt đa cấp và nhật ký soát xét bất biến."
        defaultCoachMode="draft_90day_idp"
      />

      {/* Top IDP Selector & Create Button */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600">
            {language === 'vi' ? 'Hồ sơ IDP:' : 'Employee IDPs:'}
          </span>
          {employeeIdps.map((idp) => (
            <button
              key={idp.id}
              onClick={() => {
                setBuilderMode(false);
                setSelectedIdpId(idp.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                !builderMode && activeIdp?.id === idp.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              v{idp.version} · {idp.targetPosition} ({idp.status})
            </button>
          ))}
        </div>

        <button
          onClick={populateDraftFromGaps}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          <span>{language === 'vi' ? 'Tạo IDP Mới từ Gap' : 'Build New IDP from Gaps'}</span>
        </button>
      </div>

      {/* Duplicate Confirmation Warning Banner */}
      {duplicateConfirmId && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {language === 'vi'
                  ? 'Phát hiện IDP đang mở cho cùng kỳ đánh giá!'
                  : 'Open IDP Already Exists for This Assessment Period'}
              </p>
              <p className="text-amber-800 mt-0.5">
                {language === 'vi'
                  ? `Hồ sơ IDP (${duplicateConfirmId}) hiện vẫn đang hoạt động. Xác nhận nếu bạn vẫn muốn tạo một phiên bản IDP mới.`
                  : `IDP (${duplicateConfirmId}) is currently active/open. Confirm to create a new IDP version anyway.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setDuplicateConfirmId(null)}
              className="px-3 py-1.5 bg-white border border-amber-300 text-xs font-semibold rounded-lg cursor-pointer"
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              onClick={() => handleSaveNewIdp(true)}
              className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              {language === 'vi' ? 'Xác nhận tạo bản mới' : 'Confirm Duplicate Version'}
            </button>
          </div>
        </div>
      )}

      {/* BUILDER MODE */}
      {builderMode && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {language === 'vi' ? 'Trình soạn thảo IDP 70-20-10 Mới' : 'New 70-20-10 IDP Draft Builder'}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedTalentTargetPosition} · Source Period: {gapSummary.assessmentPeriod || 'N/A'}
              </p>
            </div>
            <div className="text-xs font-mono text-slate-700 tabular-nums">
              Mix: {mixCounts.exp}% Exp / {mixCounts.soc}% Coaching / {mixCounts.frm}% Formal (Target{' '}
              {talentConfig.ratio702010.experiential}/{talentConfig.ratio702010.social}/
              {talentConfig.ratio702010.formal})
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Overall Goal (EN)</label>
              <input
                type="text"
                value={overallGoalEn}
                onChange={(e) => setOverallGoalEn(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mục tiêu tổng thể (VI)</label>
              <input
                type="text"
                value={overallGoalVi}
                onChange={(e) => setOverallGoalVi(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Development Objectives ({draftObjectives.length})
              </h3>
              <button
                onClick={addObjectiveRow}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Objective</span>
              </button>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {draftObjectives.map((obj, idx) => (
                <div key={idx} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Competency</label>
                    <select
                      value={obj.competencyCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        setDraftObjectives((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, competencyCode: code } : row))
                        );
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    >
                      {competencies.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Action Title</label>
                    <input
                      type="text"
                      value={language === 'vi' ? obj.titleVi : obj.titleEn}
                      onChange={(e) =>
                        setDraftObjectives((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? { ...row, titleEn: e.target.value, titleVi: e.target.value }
                              : row
                          )
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">70-20-10</label>
                    <select
                      value={obj.ratioCategory}
                      onChange={(e) => {
                        const ratio = e.target.value as ActivityType702010;
                        const cat: DevelopmentCategory =
                          ratio === '10_formal'
                            ? 'A_Formal_Learning'
                            : ratio === '20_social'
                            ? 'D_Coaching_Mentoring'
                            : 'B_On_The_Job';
                        setDraftObjectives((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, ratioCategory: ratio, category: cat } : row
                          )
                        );
                      }}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    >
                      <option value="70_experiential">70% OJT / Project</option>
                      <option value="20_social">20% Coaching</option>
                      <option value="10_formal">10% Course</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Date</label>
                    <input
                      type="date"
                      value={obj.targetDate}
                      onChange={(e) =>
                        setDraftObjectives((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, targetDate: e.target.value } : row))
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDraftObjectives((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      aria-label="Remove objective"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setBuilderMode(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              onClick={() => handleSaveNewIdp(false)}
              disabled={creating}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
            >
              {creating ? 'Creating...' : language === 'vi' ? 'Lưu IDP Nháp' : 'Save Draft IDP'}
            </button>
          </div>
        </div>
      )}

      {/* VIEW ACTIVE IDP & 9-STAGE PIPELINE */}
      {!builderMode && !activeIdp && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm font-bold text-slate-900">
            {language === 'vi' ? 'Chưa có IDP nào cho nhân sự này' : 'No Individual Development Plan Created Yet'}
          </p>
          <p className="text-xs text-slate-500">
            {language === 'vi'
              ? 'Bấm "Tạo IDP Mới từ Gap" để tự động đề xuất các mục tiêu phát triển theo tỷ lệ 70-20-10.'
              : 'Click "Build New IDP from Gaps" to generate an action plan grounded in approved competency gaps.'}
          </p>
        </div>
      )}

      {!builderMode && activeIdp && (
        <div className="space-y-6">
          {/* 9-Stage Workflow Stepper */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="text-xs font-mono text-slate-500">
                  IDP v{activeIdp.version} · {activeIdp.sourceAssessmentPeriod} · {activeIdp.periodStart} →{' '}
                  {activeIdp.periodEnd}
                </p>
                <h2 className="text-base font-bold text-slate-900">
                  {language === 'vi' ? activeIdp.overallGoalVi : activeIdp.overallGoalEn}
                </h2>
              </div>
              <div className="text-xs font-mono text-slate-700 tabular-nums shrink-0">
                Mix: {mixCounts.exp}% Exp · {mixCounts.soc}% Coach · {mixCounts.frm}% Course
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5 pt-2">
              {WORKFLOW_STAGES.map((stage, idx) => {
                const currentIdx = WORKFLOW_STAGES.findIndex((s) => s.id === activeIdp.status);
                const passed = idx < currentIdx;
                const isCurr = idx === currentIdx;
                return (
                  <div
                    key={stage.id}
                    className={`px-2 py-2 rounded-lg border text-center text-[11px] font-semibold ${
                      isCurr
                        ? 'bg-slate-900 text-amber-400 border-slate-900 font-bold'
                        : passed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    <div className="font-mono text-[10px] opacity-75">0{idx + 1}</div>
                    <div className="truncate">{language === 'vi' ? stage.labelVi : stage.labelEn}</div>
                  </div>
                );
              })}
            </div>

            {/* Transition Controls */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <input
                type="text"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={
                  language === 'vi'
                    ? 'Ghi chú phê duyệt hoặc lý do trả về chỉnh sửa...'
                    : 'Review comment or revision notes...'
                }
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {activeIdp.status === 'draft' && (
                  <button
                    onClick={() => handleTransition('submitted')}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{language === 'vi' ? 'Gửi Quản lý duyệt' : 'Submit IDP'}</span>
                  </button>
                )}

                {isManagerOrAbove && currentUser.id !== activeIdp.employeeId && (
                  <>
                    {activeIdp.status === 'submitted' && (
                      <button
                        onClick={() => handleTransition('manager_review')}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'vi' ? 'Quản lý Chấp thuận' : 'Manager Approve'}</span>
                      </button>
                    )}

                    {(activeIdp.status === 'manager_review' || activeIdp.status === 'submitted') && isLndOrAdmin && (
                      <button
                        onClick={() => handleTransition('lnd_approved')}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === 'vi' ? 'L&D Phê duyệt' : 'L&D Approve'}</span>
                      </button>
                    )}

                    {activeIdp.status === 'lnd_approved' && (
                      <button
                        onClick={() => handleTransition('active')}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'vi' ? 'Kích hoạt IDP' : 'Activate Plan'}</span>
                      </button>
                    )}

                    {['submitted', 'manager_review'].includes(activeIdp.status) && (
                      <button
                        onClick={() => handleTransition('draft')}
                        className="px-3 py-2 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{language === 'vi' ? 'Trả về sửa' : 'Return for Revision'}</span>
                      </button>
                    )}

                    {['completed', 'reassessment'].includes(activeIdp.status) && (
                      <button
                        onClick={() => handleTransition('closed')}
                        className="px-3.5 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'vi' ? 'Đóng chu kỳ IDP' : 'Close IDP Cycle'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Objectives Table & Review Audit Trail */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {language === 'vi' ? 'Mục tiêu phát triển trong IDP' : 'IDP Development Objectives'}
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  {activeIdp.objectives.length} objectives
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {activeIdp.objectives.map((obj) => (
                  <div key={obj.id} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900">
                        {obj.competencyCode} · L{obj.baselineLevel} → L{obj.targetLevel}
                        {obj.isCritical ? ' · Critical' : ''}
                      </span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {obj.ratioCategory.replace('_', ' ')} · Due {obj.targetDate}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      {language === 'vi' ? obj.titleVi : obj.titleEn}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Success Measure: {obj.successMeasure} · Status: <strong>{obj.status}</strong> (
                      {obj.progressPercent}%)
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Immutable Audit Trail */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {language === 'vi' ? 'Nhật ký Phê duyệt Bất biến' : 'Immutable Review Trail'}
                </h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {activeLogs.length === 0 ? (
                  <div className="p-5 text-xs text-slate-500 text-center">No review events logged yet.</div>
                ) : (
                  activeLogs.map((log) => (
                    <div key={log.id} className="p-3.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">{log.action}</span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {log.timestamp.split('T')[0]}
                        </span>
                      </div>
                      <p className="text-slate-700">{log.comment}</p>
                      <p className="text-[11px] text-slate-500">
                        {log.actorName} ({log.actorRole})
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
