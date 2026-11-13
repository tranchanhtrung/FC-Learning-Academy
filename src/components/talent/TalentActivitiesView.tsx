import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TalentHeaderBar } from './TalentHeaderBar';
import {
  calculateGapAnalysis,
  matchRecommendationsForCompetency,
  RecommendedActivityCandidate,
} from '../../lib/talentEngine';
import {
  ActivityType702010,
  DevelopmentCategory,
} from '../../types';
import {
  Plus,
  CheckCircle2,
  FileUp,
  AlertCircle,
  BookOpen,
  Briefcase,
  Users,
  Sparkles,
  X,
} from 'lucide-react';

export const TalentActivitiesView: React.FC = () => {
  const {
    currentUser,
    competencies,
    domains,
    courses,
    ojtAssignments,
    learningPaths,
    talentConfig,
    competencyAssessments,
    developmentActivities,
    selectedTalentEmployeeId,
    selectedTalentTargetPosition,
    createTalentActivity,
    updateTalentActivity,
    setSelectedCourseForPlayer,
    showToast,
    language,
  } = useApp();

  const isLearner = currentUser.role === 'learner';
  const employeeId = isLearner ? currentUser.id : selectedTalentEmployeeId;
  const canCreateCustom = ['super_admin', 'lnd_manager', 'financial_controller'].includes(currentUser.role);
  const canValidate = !isLearner && currentUser.id !== employeeId;

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

  const [selectedGapCode, setSelectedGapCode] = useState<string>(
    gapSummary.priorityDevelopmentList[0]?.competencyCode || competencies[0]?.code || ''
  );
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customForm, setCustomForm] = useState({
    competencyCode: '',
    category: 'B_On_The_Job' as DevelopmentCategory,
    ratioCategory: '70_experiential' as ActivityType702010,
    titleEn: '',
    titleVi: '',
    descriptionEn: '',
    estimatedHours: 16,
    dueDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
  });

  const [evidenceDraft, setEvidenceDraft] = useState<Record<string, { notes: string; fileName: string }>>({});

  const selectedComp = competencies.find((c) => c.code === selectedGapCode) || competencies[0];
  const selectedGapRow = gapSummary.rows.find((r) => r.competencyCode === selectedComp?.code);

  const matchResult = useMemo(() => {
    if (!selectedComp) {
      return { hasMappedActivity: false, recommendations: [], unmappedMessage: 'No mapped learning activity available' };
    }
    return matchRecommendationsForCompetency({
      competency: selectedComp,
      gap: selectedGapRow?.gap || 1,
      targetLevel: selectedGapRow?.targetLevel || 3,
      courses,
      ojtAssignments,
      learningPaths,
      customActivities: developmentActivities,
    });
  }, [selectedComp, selectedGapRow, courses, ojtAssignments, learningPaths, developmentActivities]);

  const employeeActivities = useMemo(
    () => developmentActivities.filter((a) => a.employeeId === employeeId),
    [developmentActivities, employeeId]
  );

  const handleAssignRecommendation = async (rec: RecommendedActivityCandidate) => {
    const res = await createTalentActivity({
      employeeId,
      competencyCode: rec.competencyCode,
      category: rec.category,
      ratioCategory: rec.ratioCategory,
      titleEn: rec.titleEn,
      titleVi: rec.titleVi,
      descriptionEn: rec.descriptionEn,
      descriptionVi: rec.descriptionVi,
      sourceType: rec.sourceType,
      sourceRecordId: rec.sourceRecordId,
      sourceCode: rec.sourceCode,
      targetLevel: selectedGapRow?.targetLevel || 3,
      estimatedHours: rec.estimatedHours,
      dueDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
      evidenceRequired: rec.evidenceRequired,
    });
    if (res) {
      showToast(
        language === 'vi'
          ? `Đã giao hoạt động "${rec.titleVi}" cho nhân sự.`
          : `Assigned "${rec.titleEn}".`,
        'success'
      );
    }
  };

  const handleSubmitCustomActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = customForm.competencyCode || selectedComp?.code || '';
    if (!code || !customForm.titleEn.trim()) return;

    const res = await createTalentActivity({
      employeeId,
      competencyCode: code,
      category: customForm.category,
      ratioCategory: customForm.ratioCategory,
      titleEn: customForm.titleEn.trim(),
      titleVi: customForm.titleVi.trim() || customForm.titleEn.trim(),
      descriptionEn: customForm.descriptionEn.trim() || customForm.titleEn.trim(),
      descriptionVi: customForm.descriptionEn.trim() || customForm.titleEn.trim(),
      sourceType: 'custom_lnd',
      sourceCode: `CUSTOM-${code}`,
      targetLevel: selectedGapRow?.targetLevel || 3,
      estimatedHours: customForm.estimatedHours,
      dueDate: customForm.dueDate,
      evidenceRequired: customForm.category !== 'A_Formal_Learning',
    });
    if (res) {
      setCustomModalOpen(false);
      showToast(
        language === 'vi' ? 'Đã tạo hoạt động L&D tùy chỉnh.' : 'Custom L&D activity created & assigned.',
        'success'
      );
    }
  };

  const handleSubmitEvidence = async (actId: string) => {
    const draft = evidenceDraft[actId];
    const updated = await updateTalentActivity(actId, {
      status: 'evidence_submitted',
      evidenceNotes: draft?.notes || '',
      evidenceFileName: draft?.fileName || '',
    });
    if (updated) {
      showToast(
        language === 'vi' ? 'Đã nộp minh chứng chờ quản lý xác nhận.' : 'Evidence submitted for supervisor validation.',
        'success'
      );
    }
  };

  const handleAttemptComplete = async (actId: string) => {
    const draft = evidenceDraft[actId];
    const updated = await updateTalentActivity(actId, {
      status: 'completed',
      evidenceNotes: draft?.notes,
      evidenceFileName: draft?.fileName,
    });
    if (updated) {
      showToast(
        language === 'vi' ? 'Đã hoàn tất hoạt động phát triển.' : 'Activity marked completed.',
        'success'
      );
    }
  };

  const handleValidate = async (actId: string, validationStatus: 'approved' | 'revision_requested') => {
    const updated = await updateTalentActivity(actId, {
      validationStatus,
      status: validationStatus === 'approved' ? 'completed' : 'in_progress',
      validatorFeedback:
        validationStatus === 'approved'
          ? 'Evidence verified against USALI & internal control standards.'
          : 'Please attach reconciliations and variance narrative before resubmitting.',
    });
    if (updated) {
      showToast(
        validationStatus === 'approved'
          ? language === 'vi'
            ? 'Đã xác nhận minh chứng hợp lệ.'
            : 'Activity evidence approved.'
          : language === 'vi'
          ? 'Đã yêu cầu bổ sung minh chứng.'
          : 'Revision requested.',
        'info'
      );
    }
  };

  const categoryLabels: Record<DevelopmentCategory, string> = {
    A_Formal_Learning: 'A · Formal Learning (10%)',
    B_On_The_Job: 'B · On-the-Job Training (70%)',
    C_Practical_Assignment: 'C · Practical Assignment (70%)',
    D_Coaching_Mentoring: 'D · Coaching & Mentoring (20%)',
    E_Self_Learning: 'E · Self-Learning & Case Study',
  };

  return (
    <div className="space-y-6">
      <TalentHeaderBar
        titleEn="Development Activities & Recommendation Engine"
        titleVi="Kho Hoạt động Phát triển 70-20-10 & Xác thực Minh chứng"
        subtitleEn="Auto-matched courses, OJT deliverables, and coaching mapped strictly to approved competency gaps — with mandatory evidence validation."
        subtitleVi="Đề xuất khóa học, dự án OJT và coaching gắn với khoảng trống năng lực thực tế — yêu cầu minh chứng & xác nhận của quản lý."
        defaultCoachMode="recommend_activities"
      />

      {/* Recommendation Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Priority Gaps Selector */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {language === 'vi' ? 'Chọn Khoảng trống Năng lực' : 'Select Competency Gap'}
            </h2>
            {canCreateCustom && (
              <button
                onClick={() => {
                  setCustomForm((p) => ({ ...p, competencyCode: selectedComp?.code || '' }));
                  setCustomModalOpen(true);
                }}
                className="px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'vi' ? 'Tạo mới L&D' : 'Custom Activity'}</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto">
            {(gapSummary.priorityDevelopmentList.length > 0
              ? gapSummary.priorityDevelopmentList
              : gapSummary.rows
            ).map((row) => {
              const active = selectedComp?.code === row.competencyCode;
              return (
                <button
                  key={row.competencyCode}
                  onClick={() => setSelectedGapCode(row.competencyCode)}
                  className={`w-full text-left p-3.5 transition-colors cursor-pointer ${
                    active ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">{row.competencyCode}</span>
                    <span className={row.gap > 0 ? 'font-bold text-rose-700' : 'text-emerald-700'}>
                      {row.gap > 0 ? `Gap ${row.gap} (L${row.currentLevel ?? 0}→L${row.targetLevel})` : 'On Target'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium mt-0.5 truncate">
                    {language === 'vi' ? row.nameVi : row.nameEn}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Matched Recommendations A-E */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <p className="text-xs text-slate-500 font-mono">
                {selectedComp?.code} · {selectedComp?.domainId}
              </p>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'vi' ? selectedComp?.nameVi : selectedComp?.nameEn}
              </h3>
            </div>
            {canCreateCustom && (
              <button
                onClick={() => {
                  setCustomForm((p) => ({ ...p, competencyCode: selectedComp?.code || '' }));
                  setCustomModalOpen(true);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Thêm hoạt động L&D tùy chỉnh' : 'Create Custom L&D Activity'}</span>
              </button>
            )}
          </div>

          {!matchResult.hasMappedActivity ? (
            <div className="p-6 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
              <AlertCircle className="w-7 h-7 text-amber-600 mx-auto" />
              <p className="text-sm font-bold text-slate-900">{matchResult.unmappedMessage}</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {language === 'vi'
                  ? 'Năng lực này chưa có khóa học hoặc bài tập thực hành được gắn trực tiếp trong danh mục. L&D hoặc FC có thể tạo hoạt động tùy chỉnh mới.'
                  : 'No catalog courses or OJT deliverables are currently mapped to this competency. L&D Managers or FCs can create a custom activity.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {matchResult.recommendations.map((rec) => {
                const Icon =
                  rec.category === 'A_Formal_Learning'
                    ? BookOpen
                    : rec.category === 'D_Coaching_Mentoring'
                    ? Users
                    : Briefcase;
                const linkedCourse = rec.sourceType === 'course'
                  ? courses.find((c) => c.id === rec.sourceRecordId)
                  : undefined;

                return (
                  <div
                    key={rec.key}
                    className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3 bg-white"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <Icon className="w-3.5 h-3.5 text-amber-600" />
                          {categoryLabels[rec.category]}
                        </span>
                        <span className="font-mono tabular-nums">{rec.estimatedHours}h</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {language === 'vi' ? rec.titleVi : rec.titleEn}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {language === 'vi' ? rec.descriptionVi : rec.descriptionEn}
                      </p>
                      <p className="text-[11px] text-slate-400">{rec.matchReason}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleAssignRecommendation(rec)}
                        className="flex-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {language === 'vi' ? 'Giao cho nhân sự' : 'Assign Activity'}
                      </button>
                      {linkedCourse && (
                        <button
                          onClick={() => setSelectedCourseForPlayer(linkedCourse)}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          {language === 'vi' ? 'Mở khóa học' : 'Open Course'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Activity & Evidence Validation Tracker */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {language === 'vi'
                ? 'Theo dõi Hoạt động & Phê duyệt Minh chứng (Evidence Gate)'
                : 'Assigned Development Activities & Evidence Validation Gate'}
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {employeeActivities.length} activities
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {employeeActivities.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {language === 'vi'
                ? 'Chưa có hoạt động phát triển nào được giao cho nhân sự này.'
                : 'No development activities assigned to this employee yet.'}
            </div>
          ) : (
            employeeActivities.map((act) => {
              const draft = evidenceDraft[act.id] || {
                notes: act.evidenceNotes || '',
                fileName: act.evidenceFileName || '',
              };
              return (
                <div key={act.id} className="p-5 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-bold text-slate-900">{act.competencyCode}</span>
                        <span aria-hidden="true">·</span>
                        <span>{categoryLabels[act.category]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">Due {act.dueDate}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                        {language === 'vi' ? act.titleVi : act.titleEn}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-bold shrink-0">
                      <span
                        className={
                          act.status === 'completed'
                            ? 'text-emerald-700'
                            : act.status === 'evidence_submitted'
                            ? 'text-amber-700'
                            : 'text-slate-700'
                        }
                      >
                        Status: {act.status}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span
                        className={
                          act.validationStatus === 'approved'
                            ? 'text-emerald-700'
                            : act.validationStatus === 'revision_requested'
                            ? 'text-rose-700'
                            : 'text-slate-600'
                        }
                      >
                        Validation: {act.validationStatus}
                      </span>
                    </div>
                  </div>

                  {/* Evidence Input & Validation Controls */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2">
                    <div className="lg:col-span-5">
                      <input
                        type="text"
                        disabled={act.status === 'completed'}
                        value={draft.notes}
                        onChange={(e) =>
                          setEvidenceDraft((prev) => ({
                            ...prev,
                            [act.id]: { ...draft, notes: e.target.value },
                          }))
                        }
                        placeholder={
                          language === 'vi'
                            ? 'Mô tả minh chứng thực tế (số chứng từ, kết quả đối soát...)'
                            : 'Evidence summary / deliverable notes...'
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <input
                        type="text"
                        disabled={act.status === 'completed'}
                        value={draft.fileName}
                        onChange={(e) =>
                          setEvidenceDraft((prev) => ({
                            ...prev,
                            [act.id]: { ...draft, fileName: e.target.value },
                          }))
                        }
                        placeholder="File ref (e.g. Reconciliation_Q2.xlsx)"
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                    <div className="lg:col-span-4 flex flex-wrap items-center justify-end gap-2">
                      {act.status !== 'completed' && (
                        <>
                          <button
                            onClick={() => handleSubmitEvidence(act.id)}
                            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileUp className="w-3.5 h-3.5 text-amber-400" />
                            <span>{language === 'vi' ? 'Nộp minh chứng' : 'Submit Evidence'}</span>
                          </button>
                          <button
                            onClick={() => handleAttemptComplete(act.id)}
                            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {language === 'vi' ? 'Đánh dấu hoàn tất' : 'Mark Completed'}
                          </button>
                        </>
                      )}
                      {canValidate && act.validationStatus !== 'approved' && (
                        <>
                          <button
                            onClick={() => handleValidate(act.id, 'approved')}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{language === 'vi' ? 'Duyệt minh chứng' : 'Validate & Approve'}</span>
                          </button>
                          <button
                            onClick={() => handleValidate(act.id, 'revision_requested')}
                            className="px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {language === 'vi' ? 'Yêu cầu sửa' : 'Revision'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {act.validatorFeedback && (
                    <p className="text-[11px] text-slate-600">
                      Validator Feedback ({act.validatedByName}): {act.validatorFeedback}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Custom L&D Activity Creator Modal */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSubmitCustomActivity}
            className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">
                  {language === 'vi' ? 'Tạo Hoạt động L&D Tùy chỉnh' : 'Create Custom L&D Development Activity'}
                </h3>
              </div>
              <button type="button" onClick={() => setCustomModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Competency</label>
                  <select
                    value={customForm.competencyCode || selectedComp?.code}
                    onChange={(e) => setCustomForm((p) => ({ ...p, competencyCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {competencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category (A–E)</label>
                  <select
                    value={customForm.category}
                    onChange={(e) => {
                      const cat = e.target.value as DevelopmentCategory;
                      const ratio: ActivityType702010 =
                        cat === 'A_Formal_Learning'
                          ? '10_formal'
                          : cat === 'D_Coaching_Mentoring'
                          ? '20_social'
                          : '70_experiential';
                      setCustomForm((p) => ({ ...p, category: cat, ratioCategory: ratio }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Activity Title (EN)</label>
                <input
                  type="text"
                  required
                  value={customForm.titleEn}
                  onChange={(e) => setCustomForm((p) => ({ ...p, titleEn: e.target.value }))}
                  placeholder="e.g. Lead monthly USALI F&B margin diagnostic with Executive Chef"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Activity Title (VI)</label>
                <input
                  type="text"
                  value={customForm.titleVi}
                  onChange={(e) => setCustomForm((p) => ({ ...p, titleVi: e.target.value }))}
                  placeholder="Chủ trì phân tích biên lợi nhuận F&B theo chuẩn USALI cùng Bếp trưởng"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deliverable / Description</label>
                <textarea
                  rows={2}
                  value={customForm.descriptionEn}
                  onChange={(e) => setCustomForm((p) => ({ ...p, descriptionEn: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hours</label>
                  <input
                    type="number"
                    min={1}
                    value={customForm.estimatedHours}
                    onChange={(e) => setCustomForm((p) => ({ ...p, estimatedHours: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={customForm.dueDate}
                    onChange={(e) => setCustomForm((p) => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
              >
                Create & Assign
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
