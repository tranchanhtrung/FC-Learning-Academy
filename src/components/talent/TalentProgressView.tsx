import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { TalentHeaderBar } from './TalentHeaderBar';
import { calculateGapAnalysis, evaluateIdpProgress } from '../../lib/talentEngine';
import { ProficiencyLevel } from '../../types';
import {
  CheckCircle2,
  AlertCircle,
  Bell,
  RefreshCw,
  FileUp,
  TrendingUp,
} from 'lucide-react';

export const TalentProgressView: React.FC = () => {
  const {
    currentUser,
    competencies,
    domains,
    courses,
    enrollments,
    quizAttempts,
    submissions,
    talentConfig,
    competencyAssessments,
    talentIdps,
    developmentActivities,
    competencyReassessments,
    talentNotifications,
    selectedTalentEmployeeId,
    selectedTalentTargetPosition,
    updateTalentIdpObjective,
    submitTalentReassessment,
    showToast,
    language,
  } = useApp();

  const isLearner = currentUser.role === 'learner';
  const employeeId = isLearner ? currentUser.id : selectedTalentEmployeeId;
  const canReassess = ['financial_controller', 'lnd_manager', 'super_admin', 'general_manager'].includes(
    currentUser.role
  );

  const employeeIdps = useMemo(
    () =>
      talentIdps
        .filter((i) => i.employeeId === employeeId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [talentIdps, employeeId]
  );

  const activeIdp = employeeIdps[0] || null;

  const idpMetrics = useMemo(() => {
    if (!activeIdp) return null;
    return evaluateIdpProgress({
      idp: activeIdp,
      enrollments,
      quizAttempts,
      submissions,
      courses,
      activities: developmentActivities,
    });
  }, [activeIdp, enrollments, quizAttempts, submissions, courses, developmentActivities]);

  const gapSummary = useMemo(
    () =>
      calculateGapAnalysis({
        assessments: competencyAssessments,
        employeeId,
        targetPosition: activeIdp?.targetPosition || selectedTalentTargetPosition,
        competencies,
        domains,
        config: talentConfig,
      }),
    [
      competencyAssessments,
      employeeId,
      activeIdp?.targetPosition,
      selectedTalentTargetPosition,
      competencies,
      domains,
      talentConfig,
    ]
  );

  const [evidenceInput, setEvidenceInput] = useState<Record<string, { notes: string; fileName: string }>>({});
  const [reassessLevels, setReassessLevels] = useState<Record<string, ProficiencyLevel>>({});
  const [reassessSummary, setReassessSummary] = useState('');
  const [submittingReassess, setSubmittingReassess] = useState(false);

  useEffect(() => {
    const initial: Record<string, ProficiencyLevel> = {};
    gapSummary.rows.forEach((r) => {
      initial[r.competencyCode] = (r.currentLevel || 2) as ProficiencyLevel;
    });
    setReassessLevels(initial);
  }, [employeeId, gapSummary.assessmentId]);

  const empReassessments = useMemo(
    () => competencyReassessments.filter((r) => r.employeeId === employeeId),
    [competencyReassessments, employeeId]
  );

  const empNotifications = useMemo(
    () =>
      talentNotifications.filter((n) => n.recipientId === employeeId || n.recipientId === 'all').slice(0, 6),
    [talentNotifications, employeeId]
  );

  const handleSaveObjectiveEvidence = async (objId: string) => {
    if (!activeIdp) return;
    const draft = evidenceInput[objId];
    const updated = await updateTalentIdpObjective(activeIdp.id, objId, {
      status: 'pending_validation',
      progressPercent: 85,
      evidenceNotes: draft?.notes || '',
      evidenceFileName: draft?.fileName || '',
    });
    if (updated) {
      showToast(
        language === 'vi'
          ? 'Đã gửi minh chứng mục tiêu chờ quản lý xác nhận.'
          : 'Objective evidence submitted for supervisor validation.',
        'success'
      );
    }
  };

  const handleSupervisorValidateObj = async (objId: string, approved: boolean) => {
    if (!activeIdp) return;
    const updated = await updateTalentIdpObjective(activeIdp.id, objId, {
      status: approved ? 'completed' : 'in_progress',
      progressPercent: approved ? 100 : 60,
      supervisorValidationStatus: approved ? 'approved' : 'revision_requested',
    });
    if (updated) {
      showToast(
        approved
          ? language === 'vi'
            ? 'Đã xác nhận hoàn thành mục tiêu IDP.'
            : 'Objective validated and marked completed.'
          : language === 'vi'
          ? 'Đã yêu cầu bổ sung minh chứng.'
          : 'Returned objective for additional evidence.',
        'info'
      );
    }
  };

  const handleSubmitReassessment = async () => {
    setSubmittingReassess(true);
    const res = await submitTalentReassessment({
      employeeId,
      idpId: activeIdp?.id,
      updatedLevels: reassessLevels,
      summaryFeedback:
        reassessSummary || 'Post-IDP competency reassessment verified against practical deliverables.',
    });
    setSubmittingReassess(false);
    if (res?.reassessment) {
      setReassessSummary('');
      showToast(
        language === 'vi'
          ? `Tái đánh giá thành công: ${res.reassessment.beforeAchievementPct}% → ${res.reassessment.afterAchievementPct}%`
          : `Reassessment saved: ${res.reassessment.beforeAchievementPct}% -> ${res.reassessment.afterAchievementPct}%`,
        'success'
      );
    }
  };

  const focusReassessRows = useMemo(() => {
    const idpCodes = new Set((activeIdp?.objectives || []).map((o) => o.competencyCode));
    const filtered = gapSummary.rows.filter((r) => idpCodes.has(r.competencyCode) || r.gap > 0);
    return filtered.length > 0 ? filtered : gapSummary.rows.slice(0, 8);
  }, [gapSummary.rows, activeIdp]);

  return (
    <div className="space-y-6">
      <TalentHeaderBar
        titleEn="Progress Monitoring & Competency Reassessment"
        titleVi="Giám sát Tiến độ IDP & Tái Đánh giá Năng lực (Reassessment)"
        subtitleEn="Strict objective completion verification (LMS course + quiz pass, OJT evidence + supervisor sign-off) and versioned before/after reassessment."
        subtitleVi="Kiểm soát hoàn thành chặt chẽ (khóa học + bài thi LMS, minh chứng OJT + duyệt quản lý) và tái đánh giá tăng trưởng năng lực."
        defaultCoachMode="reassessment_guide"
      />

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium">
            {language === 'vi' ? 'Tỷ lệ hoàn thành IDP (Strict)' : 'Strict IDP Completion %'}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {idpMetrics ? `${idpMetrics.completionPct}%` : '0%'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            {idpMetrics
              ? `${idpMetrics.completedObjectives}/${idpMetrics.totalObjectives} objectives verified`
              : 'No active IDP'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium">
            {language === 'vi' ? 'Chờ quản lý xác thực' : 'Awaiting Validation'}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
            {idpMetrics?.pendingValidationObjectives ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {idpMetrics?.inProgressObjectives ?? 0} in progress · {idpMetrics?.notStartedObjectives ?? 0} not started
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium">
            {language === 'vi' ? 'Điểm Năng lực Hiện tại' : 'Current Achievement'}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {gapSummary.achievementPct}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {gapSummary.criticalBlockers.length} critical blockers remaining
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium">
            {language === 'vi' ? 'Số lần Tái đánh giá' : 'Reassessments Logged'}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {empReassessments.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {empReassessments[0]
              ? `Latest Delta: +${empReassessments[0].netImprovementPct}%`
              : 'Pending post-IDP evaluation'}
          </p>
        </div>
      </div>

      {/* Objective Completion Breakdown + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {language === 'vi'
                ? 'Kiểm tra Điều kiện Hoàn thành từng Mục tiêu IDP'
                : 'Strict Objective Completion & Blocking Rule Verification'}
            </h2>
            {activeIdp && (
              <span className="text-xs font-mono text-slate-500">IDP v{activeIdp.version}</span>
            )}
          </div>

          {!activeIdp ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {language === 'vi' ? 'Chưa có IDP để theo dõi tiến độ.' : 'No IDP found for this employee.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {activeIdp.objectives.map((obj) => {
                const detail = idpMetrics?.objectiveDetails.find((d) => d.objectiveId === obj.id);
                const draft = evidenceInput[obj.id] || {
                  notes: obj.evidenceNotes || '',
                  fileName: obj.evidenceFileName || '',
                };

                return (
                  <div key={obj.id} className="p-4 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-900 mr-2">
                          {obj.competencyCode}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {language === 'vi' ? obj.titleVi : obj.titleEn}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
                        {detail?.strictCompleted ? (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Verified Complete</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            <span>Incomplete</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {detail?.blockingReason && (
                      <p className="text-[11px] text-rose-700 font-medium">
                        Gate Rule: {detail.blockingReason}
                      </p>
                    )}

                    {obj.category !== 'A_Formal_Learning' && !detail?.strictCompleted && (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                        <input
                          type="text"
                          value={draft.notes}
                          onChange={(e) =>
                            setEvidenceInput((p) => ({
                              ...p,
                              [obj.id]: { ...draft, notes: e.target.value },
                            }))
                          }
                          placeholder="Deliverable summary..."
                          className="sm:col-span-5 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={draft.fileName}
                          onChange={(e) =>
                            setEvidenceInput((p) => ({
                              ...p,
                              [obj.id]: { ...draft, fileName: e.target.value },
                            }))
                          }
                          placeholder="Workbook / File ref"
                          className="sm:col-span-3 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                        />
                        <div className="sm:col-span-4 flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSaveObjectiveEvidence(obj.id)}
                            className="px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <FileUp className="w-3 h-3 text-amber-400" />
                            <span>Submit</span>
                          </button>
                          {canReassess && currentUser.id !== employeeId && (
                            <button
                              onClick={() => handleSupervisorValidateObj(obj.id, true)}
                              className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Validate
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications & Before/After Delta Log */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {language === 'vi' ? 'Thông báo Quy trình' : 'Workflow Notifications'}
              </h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {empNotifications.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">No recent notifications.</div>
              ) : (
                empNotifications.map((n) => (
                  <div key={n.id} className="p-3.5 text-xs space-y-0.5">
                    <p className="font-bold text-slate-900">{n.title}</p>
                    <p className="text-slate-600">{n.message}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{n.time}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {language === 'vi' ? 'Lịch sử Trước / Sau (Reassessment)' : 'Before / After Reassessment Log'}
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {empReassessments.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">No reassessments recorded yet.</div>
              ) : (
                empReassessments.map((r) => (
                  <div key={r.id} className="p-4 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span className="text-slate-900">{r.reassessmentDate}</span>
                      <span className="text-emerald-700 tabular-nums">
                        {r.beforeAchievementPct}% → {r.afterAchievementPct}% (+{r.netImprovementPct}%)
                      </span>
                    </div>
                    <p className="text-slate-700">{r.summaryFeedback}</p>
                    <p className="text-[11px] text-slate-500">
                      Assessor: {r.assessorName} · Gaps closed: {r.gapsClosedCount}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reassessment Execution Panel */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {language === 'vi'
                ? 'Thực hiện Tái Đánh giá Năng lực Sau IDP (Tạo Phiên bản Mới Bất biến)'
                : 'Conduct Post-IDP Competency Reassessment (Creates Versioned Approved Assessment)'}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'vi'
                ? 'Dữ liệu đánh giá gốc được giữ nguyên; hệ thống tạo phiên bản đánh giá mới và tính chênh lệch Trước/Sau.'
                : 'Original baseline assessment remains untouched; records a new approved version and Before vs After delta.'}
            </p>
          </div>
          {canReassess && (
            <button
              onClick={handleSubmitReassessment}
              disabled={submittingReassess || !gapSummary.hasApprovedAssessment}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {submittingReassess
                  ? 'Saving...'
                  : language === 'vi'
                  ? 'Lưu kết quả Tái đánh giá'
                  : 'Submit Validated Reassessment'}
              </span>
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          <input
            type="text"
            disabled={!canReassess}
            value={reassessSummary}
            onChange={(e) => setReassessSummary(e.target.value)}
            placeholder={
              language === 'vi'
                ? 'Nhận xét tiến bộ năng lực sau quá trình thực hiện IDP và bằng chứng thực tế...'
                : 'Summary feedback on demonstrated proficiency uplift and evidence review...'
            }
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg disabled:bg-slate-50"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-3 font-semibold">Competency</th>
                  <th className="py-2 px-3 font-semibold text-center">Baseline</th>
                  <th className="py-2 px-3 font-semibold text-center">Target</th>
                  <th className="py-2 px-3 font-semibold text-center">New Level (Post-IDP)</th>
                  <th className="py-2 pl-3 font-semibold text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {focusReassessRows.map((row) => {
                  const before = row.currentLevel || 1;
                  const after = reassessLevels[row.competencyCode] ?? before;
                  const delta = after - before;
                  return (
                    <tr key={row.competencyCode}>
                      <td className="py-2.5 pr-3">
                        <span className="font-mono font-bold text-slate-900 mr-1.5">
                          {row.competencyCode}
                        </span>
                        <span className="text-slate-700">
                          {language === 'vi' ? row.nameVi : row.nameEn}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">L{before}</td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold">
                        L{row.targetLevel}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {[1, 2, 3, 4].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              disabled={!canReassess}
                              onClick={() =>
                                setReassessLevels((p) => ({
                                  ...p,
                                  [row.competencyCode]: lvl as ProficiencyLevel,
                                }))
                              }
                              className={`w-7 h-7 rounded border font-mono text-xs font-bold cursor-pointer disabled:opacity-60 ${
                                after === lvl
                                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              L{lvl}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono font-bold tabular-nums">
                        <span className={delta > 0 ? 'text-emerald-700' : 'text-slate-500'}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
