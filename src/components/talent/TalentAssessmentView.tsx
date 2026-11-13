import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TalentHeaderBar } from './TalentHeaderBar';
import { resolvePositionTargetMatrix } from '../../lib/talentEngine';
import {
  AssessorType,
  CompetencyAssessmentDoc,
  ProficiencyLevel,
} from '../../types';
import {
  Save,
  Send,
  CheckCircle2,
  XCircle,
  CopyPlus,
  Lock,
  History,
  FilePlus2,
} from 'lucide-react';

export const TalentAssessmentView: React.FC = () => {
  const {
    currentUser,
    users,
    domains,
    competencies,
    talentConfig,
    competencyAssessments,
    selectedTalentEmployeeId,
    selectedTalentTargetPosition,
    saveTalentAssessment,
    transitionTalentAssessment,
    showToast,
    language,
  } = useApp();

  const isLearner = currentUser.role === 'learner';
  const employeeId = isLearner ? currentUser.id : selectedTalentEmployeeId;
  const employee = users.find((u) => u.id === employeeId) || currentUser;

  const employeeAssessments = useMemo(
    () =>
      competencyAssessments
        .filter((a) => a.employeeId === employeeId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [competencyAssessments, employeeId]
  );

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [assessmentPeriod, setAssessmentPeriod] = useState('2026-Q3');
  const [assessorType, setAssessorType] = useState<AssessorType>(
    isLearner ? 'self' : currentUser.role === 'financial_controller' ? 'financial_controller' : 'hr_lnd'
  );
  const [overallComments, setOverallComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [scoresMap, setScoresMap] = useState<Record<string, { currentLevel: ProficiencyLevel | null; notes: string }>>({});
  const [saving, setSaving] = useState(false);

  const targetMatrix = useMemo(
    () => resolvePositionTargetMatrix(competencies, selectedTalentTargetPosition, talentConfig),
    [competencies, selectedTalentTargetPosition, talentConfig]
  );

  const activeAssessment: CompetencyAssessmentDoc | null = useMemo(() => {
    if (selectedAssessmentId === '__new__') return null;
    if (selectedAssessmentId) {
      return employeeAssessments.find((a) => a.id === selectedAssessmentId) || null;
    }
    return employeeAssessments[0] || null;
  }, [employeeAssessments, selectedAssessmentId]);

  useEffect(() => {
    setSelectedAssessmentId(employeeAssessments[0]?.id || '__new__');
  }, [employeeId]);

  useEffect(() => {
    if (activeAssessment) {
      setAssessmentPeriod(activeAssessment.assessmentPeriod);
      setAssessorType(activeAssessment.assessorType);
      setOverallComments(activeAssessment.overallComments || '');
      const mapped: Record<string, { currentLevel: ProficiencyLevel | null; notes: string }> = {};
      competencies.forEach((c) => {
        const entry = activeAssessment.results?.[c.code];
        mapped[c.code] = {
          currentLevel: entry ? entry.currentLevel : null,
          notes: entry?.assessorNotes || '',
        };
      });
      setScoresMap(mapped);
    } else {
      const mapped: Record<string, { currentLevel: ProficiencyLevel | null; notes: string }> = {};
      competencies.forEach((c) => {
        mapped[c.code] = { currentLevel: null, notes: '' };
      });
      setScoresMap(mapped);
      setOverallComments('');
      setAssessorType(
        isLearner ? 'self' : currentUser.role === 'financial_controller' ? 'financial_controller' : 'hr_lnd'
      );
    }
    setShowRejectBox(false);
    setRejectionReason('');
  }, [activeAssessment?.id, employeeId, competencies.length]);

  const isLockedApproved = activeAssessment?.status === 'approved';
  const canApprove = !isLearner && currentUser.id !== employeeId;

  const setLevel = (code: string, level: ProficiencyLevel | null) => {
    if (isLockedApproved) return;
    setScoresMap((prev) => ({
      ...prev,
      [code]: { ...(prev[code] || { notes: '' }), currentLevel: level },
    }));
  };

  const setNote = (code: string, notes: string) => {
    if (isLockedApproved) return;
    setScoresMap((prev) => ({
      ...prev,
      [code]: { ...(prev[code] || { currentLevel: null }), notes },
    }));
  };

  const buildPayloadResults = () => {
    const out: Record<string, any> = {};
    competencies.forEach((comp) => {
      const tgt = targetMatrix.targetsByCode[comp.code];
      if (!tgt) return;
      const item = scoresMap[comp.code] || { currentLevel: null, notes: '' };
      out[comp.code] = {
        competencyId: comp.id,
        competencyCode: comp.code,
        domainId: comp.domainId,
        currentLevel: item.currentLevel,
        targetLevel: tgt,
        assessorNotes: item.notes,
      };
    });
    return out;
  };

  const handleSaveDraft = async (createNewVersion = false) => {
    if (!targetMatrix.hasValidTargets) {
      showToast(targetMatrix.error || 'Missing position target levels', 'error');
      return;
    }
    setSaving(true);
    const saved = await saveTalentAssessment({
      id: activeAssessment?.id,
      employeeId,
      targetPosition: selectedTalentTargetPosition,
      assessmentPeriod,
      assessorType,
      overallComments,
      results: buildPayloadResults(),
      createNewVersion,
    });
    setSaving(false);
    if (saved) {
      setSelectedAssessmentId(saved.id);
      showToast(
        language === 'vi'
          ? `Đã lưu bản đánh giá v${saved.version} (${saved.status}).`
          : `Saved assessment v${saved.version} (${saved.status}).`,
        'success'
      );
    }
  };

  const handleTransition = async (targetStatus: 'submitted' | 'approved' | 'rejected') => {
    if (!activeAssessment) return;
    const res = await transitionTalentAssessment(
      activeAssessment.id,
      targetStatus,
      targetStatus === 'rejected' ? rejectionReason : undefined
    );
    if (res) {
      setShowRejectBox(false);
      showToast(
        language === 'vi'
          ? `Đã chuyển trạng thái đánh giá sang ${res.status}.`
          : `Assessment transitioned to ${res.status}.`,
        'success'
      );
    }
  };

  const handleStartNewAssessment = () => {
    setSelectedAssessmentId('__new__');
    setAssessmentPeriod('2026-Q3');
  };

  const assessedCount = Object.values(scoresMap).filter((v) => v.currentLevel !== null).length;

  return (
    <div className="space-y-6">
      <TalentHeaderBar
        titleEn="Multi-Assessor Competency Assessment"
        titleVi="Đánh giá Năng lực Đa chiều & Phiên bản Lịch sử"
        subtitleEn="Conduct self, supervisor, FC, or HR/L&D assessments across 30 hospitality finance competencies with immutable approval history."
        subtitleVi="Thực hiện tự đánh giá, quản lý trực tiếp, FC và HR/L&D trên 30 năng lực tài chính khách sạn với lịch sử phê duyệt bất biến."
        defaultCoachMode="explain_gaps"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Versioned History */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {language === 'vi' ? 'Lịch sử phiên bản' : 'Assessment Versions'}
              </h2>
            </div>
            <button
              onClick={handleStartNewAssessment}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'vi' ? 'Tạo mới' : 'New Version'}</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
            {employeeAssessments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {language === 'vi'
                  ? 'Chưa có kỳ đánh giá nào cho nhân sự này.'
                  : 'No assessments recorded yet for this employee.'}
              </div>
            ) : (
              employeeAssessments.map((asmt) => {
                const selected = activeAssessment?.id === asmt.id;
                const statusColor =
                  asmt.status === 'approved'
                    ? 'text-emerald-700'
                    : asmt.status === 'submitted'
                    ? 'text-amber-700'
                    : asmt.status === 'rejected'
                    ? 'text-rose-700'
                    : 'text-slate-600';

                return (
                  <button
                    key={asmt.id}
                    onClick={() => setSelectedAssessmentId(asmt.id)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer ${
                      selected ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {asmt.assessmentPeriod} · v{asmt.version}
                      </span>
                      <span className={`font-bold uppercase text-[11px] ${statusColor}`}>
                        {asmt.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {asmt.targetPosition}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {asmt.assessorType} · {asmt.assessorName}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Scoring Sheet */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 space-y-4">
            {isLockedApproved && (
              <div className="p-3.5 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 text-xs">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {language === 'vi'
                        ? 'Hồ sơ đánh giá đã phê duyệt (Bất biến)'
                        : 'Approved Assessment Record (Immutable)'}
                    </p>
                    <p className="text-slate-300 text-[11px]">
                      {language === 'vi'
                        ? `Phê duyệt bởi ${activeAssessment?.approvedByName} ngày ${activeAssessment?.approvedAt?.split('T')[0]}. Không thể sửa trực tiếp — hãy tạo phiên bản mới.`
                        : `Approved by ${activeAssessment?.approvedByName} on ${activeAssessment?.approvedAt?.split('T')[0]}. Historical records cannot be overwritten.`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSaveDraft(true)}
                  disabled={saving}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CopyPlus className="w-3.5 h-3.5" />
                  <span>{language === 'vi' ? 'Tạo phiên bản mới' : 'Create New Version'}</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {language === 'vi' ? 'Kỳ đánh giá' : 'Assessment Period'}
                </label>
                <input
                  type="text"
                  disabled={isLockedApproved}
                  value={assessmentPeriod}
                  onChange={(e) => setAssessmentPeriod(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {language === 'vi' ? 'Vai trò đánh giá' : 'Assessor Type'}
                </label>
                <select
                  disabled={isLockedApproved || isLearner}
                  value={assessorType}
                  onChange={(e) => setAssessorType(e.target.value as AssessorType)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg disabled:bg-slate-100"
                >
                  <option value="self">Self Assessment (Tự đánh giá)</option>
                  <option value="supervisor">Supervisor Review</option>
                  <option value="financial_controller">Financial Controller Validation</option>
                  <option value="hr_lnd">HR / L&D Calibration</option>
                  <option value="final_validated">Final Validated Score</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {language === 'vi' ? 'Tiến độ chấm điểm' : 'Assessment Coverage'}
                </label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold tabular-nums text-slate-800">
                  {assessedCount} / {Object.keys(targetMatrix.targetsByCode).length} Assessed
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {language === 'vi' ? 'Nhận xét tổng thể của người đánh giá' : 'Overall Assessor Comments'}
              </label>
              <textarea
                rows={2}
                disabled={isLockedApproved}
                value={overallComments}
                onChange={(e) => setOverallComments(e.target.value)}
                placeholder={
                  language === 'vi'
                    ? 'Tóm tắt điểm mạnh, rủi ro kiểm soát và định hướng phát triển...'
                    : 'Summarize key strengths, control gaps, and promotion readiness context...'
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>

            {!isLockedApproved && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleSaveDraft(false)}
                    disabled={saving}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'vi' ? 'Lưu nháp' : 'Save Draft'}</span>
                  </button>

                  {activeAssessment && activeAssessment.status !== 'submitted' && (
                    <button
                      onClick={() => handleTransition('submitted')}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{language === 'vi' ? 'Gửi phê duyệt' : 'Submit for Approval'}</span>
                    </button>
                  )}
                </div>

                {activeAssessment && canApprove && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTransition('approved')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{language === 'vi' ? 'Phê duyệt (Khóa dữ liệu)' : 'Approve & Lock'}</span>
                    </button>
                    <button
                      onClick={() => setShowRejectBox((p) => !p)}
                      className="px-3.5 py-2 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{language === 'vi' ? 'Từ chối' : 'Reject'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {showRejectBox && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={language === 'vi' ? 'Nhập lý do từ chối...' : 'Enter rejection reason...'}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg"
                />
                <button
                  onClick={() => handleTransition('rejected')}
                  className="px-3 py-1.5 bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  {language === 'vi' ? 'Xác nhận từ chối' : 'Confirm Reject'}
                </button>
              </div>
            )}
          </div>

          {/* Domain Grouped Scoring Grid */}
          <div className="divide-y divide-slate-200">
            {domains.map((dom) => {
              const domComps = competencies.filter((c) => c.domainId === dom.id);
              return (
                <div key={dom.id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold text-slate-900">
                      {dom.code} · {language === 'vi' ? dom.nameVi : dom.nameEn}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      {domComps.length} competencies
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-[11px] text-slate-500 border-b border-slate-100">
                          <th className="py-2 pr-3 font-semibold">Code & Competency</th>
                          <th className="py-2 px-2 font-semibold text-center whitespace-nowrap">Target</th>
                          <th className="py-2 px-2 font-semibold text-center whitespace-nowrap">Current Level</th>
                          <th className="py-2 px-2 font-semibold text-center whitespace-nowrap">Gap</th>
                          <th className="py-2 pl-2 font-semibold">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {domComps.map((comp) => {
                          const targetLvl = targetMatrix.targetsByCode[comp.code] || 3;
                          const curr = scoresMap[comp.code]?.currentLevel ?? null;
                          const gap = curr === null ? targetLvl : Math.max(0, targetLvl - curr);
                          return (
                            <tr key={comp.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 pr-3 max-w-xs">
                                <span className="font-mono font-bold text-slate-900 mr-1.5">
                                  {comp.code}
                                </span>
                                <span className="text-slate-700 font-medium">
                                  {language === 'vi' ? comp.nameVi : comp.nameEn}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold tabular-nums text-slate-700">
                                L{targetLvl}
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    disabled={isLockedApproved}
                                    onClick={() => setLevel(comp.code, null)}
                                    className={`px-1.5 py-1 text-[11px] font-mono rounded border cursor-pointer disabled:opacity-60 ${
                                      curr === null
                                        ? 'bg-slate-800 text-white border-slate-800'
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    N/A
                                  </button>
                                  {[1, 2, 3, 4].map((lvl) => (
                                    <button
                                      key={lvl}
                                      type="button"
                                      disabled={isLockedApproved}
                                      onClick={() => setLevel(comp.code, lvl as ProficiencyLevel)}
                                      className={`w-7 h-7 text-xs font-mono font-bold rounded border cursor-pointer disabled:opacity-60 ${
                                        curr === lvl
                                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      L{lvl}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold tabular-nums">
                                <span
                                  className={
                                    curr === null
                                      ? 'text-slate-400'
                                      : gap === 0
                                      ? 'text-emerald-700'
                                      : gap === 1
                                      ? 'text-amber-600'
                                      : 'text-rose-700'
                                  }
                                >
                                  {curr === null ? '—' : gap}
                                </span>
                              </td>
                              <td className="py-2.5 pl-2">
                                <input
                                  type="text"
                                  disabled={isLockedApproved}
                                  value={scoresMap[comp.code]?.notes || ''}
                                  onChange={(e) => setNote(comp.code, e.target.value)}
                                  placeholder="Evidence / note..."
                                  className="w-full min-w-[140px] px-2.5 py-1 text-xs border border-slate-200 rounded bg-white disabled:bg-slate-50"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
