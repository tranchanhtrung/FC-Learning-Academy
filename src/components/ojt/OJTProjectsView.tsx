import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { OJTAssignment, AssignmentSubmission } from '../../types';
import {
  Briefcase,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  X,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';

export const OJTProjectsView: React.FC = () => {
  const {
    ojtAssignments,
    submissions,
    submitAssignment,
    gradeAssignment,
    currentUser,
    users,
    language,
    t,
    showToast,
  } = useApp();

  const isSupervisorOrAdmin =
    currentUser.role === 'financial_controller' ||
    currentUser.role === 'super_admin' ||
    currentUser.role === 'lnd_manager';

  const [selectedAssignment, setSelectedAssignment] = useState<OJTAssignment | null>(null);
  const [submissionModalOpen, setSubmissionModalOpen] = useState<boolean>(false);
  const [gradingModalOpen, setGradingModalOpen] = useState<boolean>(false);
  const [selectedSubmissionForGrade, setSelectedSubmissionForGrade] = useState<AssignmentSubmission | null>(null);

  // Submission Form State
  const [notes, setNotes] = useState<string>('');
  const [fileName, setFileName] = useState<string>('OJT_Deliverable_Model.xlsx');
  const [isAiEvaluating, setIsAiEvaluating] = useState<boolean>(false);
  const [aiEvalResult, setAiEvalResult] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Grading Form State
  const [gradeScore, setGradeScore] = useState<number>(85);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');

  const handleDownloadTemplate = (assignment: OJTAssignment) => {
    const csvData = `FC LEARNING ACADEMY - OJT DELIVERABLE TEMPLATE\nAssignment: ${assignment.code} - ${assignment.titleEn}\nContext: ${assignment.propertyContext}\nDeliverables Required: ${assignment.deliverablesEn.join('; ')}\n\nMonth,Room Revenue,F&B Revenue,Other Revenue,Total Revenue,Departmental Expenses,GOP,Flow-Through %\nJan,$850000,$420000,$110000,$1380000,$780000,$600000,-\nFeb,$920000,$460000,$120000,$1500000,$810000,$690000,75.0%\nMar,$980000,$490000,$130000,$1600000,$845000,$755000,65.0%`;

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', assignment.templateFileName || `${assignment.code}_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAiPreAudit = async () => {
    if (!selectedAssignment) return;
    if (!notes.trim()) {
      showToast(
        language === 'vi'
          ? 'Vui lòng nhập giải trình tóm tắt trước khi thẩm định AI.'
          : 'Please enter an Executive Summary before running AI audit.',
        'error'
      );
      return;
    }
    try {
      setIsAiEvaluating(true);
      setAiError(null);
      const res = await fetch('/api/gemini/evaluate-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentTitle: selectedAssignment.titleEn,
          deliverables: selectedAssignment.deliverablesEn,
          submissionText: notes,
          fileNotes: fileName,
          language,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        const errMsg = result?.error || 'AI evaluation request failed';
        setAiError(errMsg);
        showToast(errMsg, 'error');
        return;
      }
      setAiEvalResult(result);
    } catch (e: any) {
      const errMsg = e?.message || 'AI evaluation failed';
      setAiError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsAiEvaluating(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!selectedAssignment) return;
    if (!notes.trim()) {
      showToast(
        language === 'vi'
          ? 'Vui lòng nhập giải trình tóm tắt kết quả trước khi nộp bài.'
          : 'Please provide an executive summary before submitting.',
        'error'
      );
      return;
    }
    await submitAssignment(selectedAssignment.id, notes.trim(), fileName, aiEvalResult);
    setSubmissionModalOpen(false);
    setNotes('');
    setAiEvalResult(null);
    setAiError(null);
    showToast(
      language === 'vi' ? 'Đã nộp bài tập OJT thành công!' : 'OJT project submitted successfully!',
      'success'
    );
  };

  const handleSaveGrade = async (status: 'approved' | 'revision_requested') => {
    if (!selectedSubmissionForGrade) return;
    const boundedScore = Math.max(0, Math.min(100, Number(gradeScore) || 0));
    await gradeAssignment(selectedSubmissionForGrade.id, boundedScore, gradeFeedback, status);
    setGradingModalOpen(false);
    setSelectedSubmissionForGrade(null);
    showToast(language === 'vi' ? 'Đã lưu kết quả chấm bài!' : 'Grading submitted!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Real Hotel Operations & Case Studies</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.ojt.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {t.ojt.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold">
            {ojtAssignments.length} {language === 'vi' ? 'Dự án thực tế' : 'Practical Cases'}
          </span>
        </div>
      </div>

      {/* Grid of 6 Real OJT Cases */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ojtAssignments.map((assignment) => {
          const mySub = submissions.find(
            (s) => s.assignmentId === assignment.id && s.userId === currentUser.id
          );
          const isDone = mySub?.status === 'approved';

          return (
            <div
              key={assignment.id}
              className="bg-white p-6 rounded-2xl border border-slate-200/80 hover:border-amber-400/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 font-mono">
                    {assignment.code}
                  </span>
                  {mySub && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {mySub.status}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-slate-900 leading-snug">
                  {language === 'vi' ? assignment.titleVi : assignment.titleEn}
                </h3>

                <p className="text-xs text-amber-700 font-semibold bg-amber-50/70 p-2 rounded-lg border border-amber-200/60">
                  {assignment.propertyContext}
                </p>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {language === 'vi' ? assignment.descriptionVi : assignment.descriptionEn}
                </p>

                {/* Rubric Points Overview */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="font-bold text-slate-700 block">
                    {language === 'vi' ? 'Tiêu chí đánh giá trọng tâm:' : 'Key Rubrics:'}
                  </span>
                  {assignment.evaluationRubric.slice(0, 2).map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="truncate max-w-[200px]">
                        {language === 'vi' ? r.criterionVi : r.criterionEn}
                      </span>
                      <span className="font-bold text-slate-700">{r.maxPoints} pts</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleDownloadTemplate(assignment)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>{language === 'vi' ? 'Mẫu Excel' : 'Template'}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedAssignment(assignment);
                    setNotes(mySub?.submissionNotes || '');
                    setFileName(mySub?.fileName || `${assignment.code}_Deliverable.xlsx`);
                    setAiEvalResult(null);
                    setAiError(null);
                    setSubmissionModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{mySub ? (language === 'vi' ? 'Xem lại / Nộp lại' : 'Resubmit') : t.ojt.uploadSolution}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submissions Grading Queue (Supervisors / FC) */}
      {isSupervisorOrAdmin && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {language === 'vi' ? 'Hàng Đợi Chấm Điểm Dự Án OJT Của Đội Ngũ' : 'Team OJT Evaluation Queue'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'vi'
                  ? 'Đánh giá các sản phẩm báo cáo tài chính thực tế do nhân viên nộp'
                  : 'Review deliverables and deliver constructive feedback to your team'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Học viên' : 'Learner'}</th>
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Dự án OJT' : 'OJT Case'}</th>
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Tệp đính kèm' : 'File'}</th>
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'vi' ? 'Thao tác' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub) => {
                  const u = users.find((user) => user.id === sub.userId);
                  const a = ojtAssignments.find((ojt) => ojt.id === sub.assignmentId);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-bold text-slate-800 flex items-center gap-2">
                        <img
                          src={u?.avatar}
                          alt={u?.name}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <span>{u?.name}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {language === 'vi' ? a?.titleVi : a?.titleEn}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{sub.fileName}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            sub.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedSubmissionForGrade(sub);
                            setGradeScore(sub.score || 85);
                            setGradeFeedback(sub.feedback || '');
                            setGradingModalOpen(true);
                          }}
                          className="px-3 py-1 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          {language === 'vi' ? 'Chấm điểm' : 'Grade'}
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

      {/* Submission Modal */}
      {submissionModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-700/50 my-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 font-mono">
                  {selectedAssignment.code}
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">
                  {language === 'vi' ? selectedAssignment.titleVi : selectedAssignment.titleEn}
                </h3>
              </div>
              <button
                onClick={() => setSubmissionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Deliverables Checklist */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <span className="font-bold text-slate-800 block">Sản phẩm đầu ra yêu cầu:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                {(language === 'vi' ? selectedAssignment.deliverablesVi : selectedAssignment.deliverablesEn).map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>

            {/* Executive Summary Input */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 block">
                {language === 'vi' ? 'Giải trình tóm tắt kết quả (Executive Summary for GM/FC):' : 'Executive Summary:'}
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={language === 'vi' ? 'Nhập tóm tắt phân tích nguyên nhân biến động, đề xuất giải pháp...' : 'Provide key findings and strategic recommendations...'}
                className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            {/* Simulated File Attachment */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-slate-800">{fileName}</p>
                <p className="text-[10px] text-slate-500">Working Model &bull; 3.2 MB &bull; Excel 2026</p>
              </div>
              <button
                type="button"
                onClick={() => setFileName(`Deliverable_${Date.now()}.xlsx`)}
                className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Đổi file
              </button>
            </div>

            {/* AI Preliminary Review Trigger */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-amber-900">
                  {language === 'vi' ? 'Chấm thử sơ bộ bằng AI Gemini:' : 'AI Preliminary Rubric Audit:'}
                </span>
              </div>
              <button
                type="button"
                disabled={isAiEvaluating || !notes}
                onClick={handleAiPreAudit}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isAiEvaluating ? 'Đang thẩm định...' : 'Thẩm định ngay'}
              </button>
            </div>

            {/* AI Error Alert if Any */}
            {aiError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {/* AI Review Results if Available */}
            {aiEvalResult && (
              <div className="p-4 bg-white rounded-xl border border-amber-300 space-y-3 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900">Điểm dự kiến AI: {aiEvalResult.score} / 100</span>
                  <span className={aiEvalResult.passed ? 'text-emerald-700' : 'text-amber-700'}>
                    {aiEvalResult.passed ? 'ĐẠT YÊU CẦU' : 'CẦN BỔ SUNG'}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed italic bg-slate-50 p-2.5 rounded-lg">
                  {aiEvalResult.feedback}
                </p>

                {Array.isArray(aiEvalResult.rubricBreakdown) && aiEvalResult.rubricBreakdown.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      {language === 'vi' ? 'Chi tiết chấm điểm Rubric:' : 'Rubric Breakdown:'}
                    </span>
                    {aiEvalResult.rubricBreakdown.map((item: any, idx: number) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>{item.criterion}</span>
                          <span className="font-mono text-amber-700">{item.score}/{item.maxScore}</span>
                        </div>
                        {item.comments && <p className="text-[11px] text-slate-600 mt-0.5">{item.comments}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {Array.isArray(aiEvalResult.keyRecommendations) && aiEvalResult.keyRecommendations.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      {language === 'vi' ? 'Khuyến nghị hoàn thiện:' : 'Key Recommendations:'}
                    </span>
                    <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5">
                      {aiEvalResult.keyRecommendations.map((rec: string, i: number) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 text-xs">
              <button
                onClick={() => setSubmissionModalOpen(false)}
                className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleFinalSubmit}
                className="px-5 py-2 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                {t.common.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supervisor Grading Modal */}
      {gradingModalOpen && selectedSubmissionForGrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-700/50 my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {language === 'vi' ? 'Chấm Điểm & Nhận Xét Dự Án' : 'Grade Deliverable'}
              </h3>
              <button
                onClick={() => setGradingModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Điểm số (0 - 100):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={gradeScore}
                  onChange={(e) => setGradeScore(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg font-bold text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nhận xét & Hướng dẫn phát triển từ Trưởng bộ phận:
                </label>
                <textarea
                  rows={4}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Ghi nhận điểm mạnh và các điểm cần hoàn thiện..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 text-xs">
              <button
                onClick={() => handleSaveGrade('revision_requested')}
                className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold rounded-xl"
              >
                {t.common.reject}
              </button>
              <button
                onClick={() => handleSaveGrade('approved')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-sm"
              >
                {t.common.approve}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
