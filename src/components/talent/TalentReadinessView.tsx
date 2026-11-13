import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TalentHeaderBar } from './TalentHeaderBar';
import {
  calculateGapAnalysis,
  evaluateCareerReadiness,
  evaluateIdpProgress,
} from '../../lib/talentEngine';
import { CareerReadinessStatus } from '../../types';
import {
  ShieldAlert,
  Award,
  Download,
  Printer,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

type TalentReportType =
  | 'competency_gap_summary'
  | 'department_gap_heatmap'
  | 'active_idps_status'
  | 'overdue_idp_actions'
  | 'learning_activity_completion'
  | 'before_after_reassessment'
  | 'career_readiness_pipeline'
  | 'critical_competency_risk';

const REPORT_CATALOG: { id: TalentReportType; titleEn: string; titleVi: string }[] = [
  { id: 'competency_gap_summary', titleEn: '1. Competency Gap Summary', titleVi: '1. Tổng hợp Khoảng trống Năng lực' },
  { id: 'department_gap_heatmap', titleEn: '2. Department & Property Gap Heatmap', titleVi: '2. Heatmap Năng lực Khách sạn & Phòng ban' },
  { id: 'active_idps_status', titleEn: '3. Active IDPs & Status Report', titleVi: '3. Danh sách & Trạng thái IDP' },
  { id: 'overdue_idp_actions', titleEn: '4. Overdue IDP Actions', titleVi: '4. Mục tiêu IDP Quá hạn' },
  { id: 'learning_activity_completion', titleEn: '5. Learning Activity Completion', titleVi: '5. Hoàn thành Hoạt động & Minh chứng' },
  { id: 'before_after_reassessment', titleEn: '6. Before vs After Reassessment', titleVi: '6. So sánh Trước / Sau Tái đánh giá' },
  { id: 'career_readiness_pipeline', titleEn: '7. Career Readiness & Succession Pipeline', titleVi: '7. Sẵn sàng Thăng tiến & Kế thừa' },
  { id: 'critical_competency_risk', titleEn: '8. Critical Competency Risk Register', titleVi: '8. Rủi ro Năng lực Cốt lõi (Critical Risk)' },
];

export const TalentReadinessView: React.FC = () => {
  const {
    currentUser,
    users,
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
    careerReadinessReviews,
    selectedTalentEmployeeId,
    selectedTalentTargetPosition,
    submitCareerReadinessReview,
    showToast,
    language,
  } = useApp();

  const isLearner = currentUser.role === 'learner';
  const employeeId = isLearner ? currentUser.id : selectedTalentEmployeeId;
  const canSignOff = ['financial_controller', 'lnd_manager', 'super_admin', 'general_manager'].includes(
    currentUser.role
  );

  const activeIdp = useMemo(
    () => talentIdps.find((i) => i.employeeId === employeeId) || null,
    [talentIdps, employeeId]
  );

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

  const readiness = useMemo(
    () => evaluateCareerReadiness({ gapSummary, idpMetrics, config: talentConfig }),
    [gapSummary, idpMetrics, talentConfig]
  );

  const [requestedStatus, setRequestedStatus] = useState<CareerReadinessStatus>(readiness.status);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [selectedReport, setSelectedReport] = useState<TalentReportType>('competency_gap_summary');
  const [exporting, setExporting] = useState(false);

  const handleSubmitSignOff = async () => {
    setSubmittingReview(true);
    const res = await submitCareerReadinessReview({
      employeeId,
      targetPosition: selectedTalentTargetPosition,
      requestedStatus,
      reviewNotes,
    });
    setSubmittingReview(false);
    if (res) {
      setReviewNotes('');
      showToast(
        language === 'vi'
          ? `Đã lưu đánh giá Sẵn sàng thăng tiến: ${res.finalStatus}`
          : `Career Readiness review recorded: ${res.finalStatus}`,
        'success'
      );
    }
  };

  const handleDownloadExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/talent/export-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          reportType: selectedReport,
          filters: {
            employeeId: isLearner ? currentUser.id : undefined,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Failed to export Excel report.', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FC_Academy_${selectedReport}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(
        language === 'vi' ? 'Đã tải xuống báo cáo Excel (.xlsx).' : 'Downloaded Excel report (.xlsx).',
        'success'
      );
    } catch (e: any) {
      showToast(e.message || 'Excel export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const empReviews = useMemo(
    () => careerReadinessReviews.filter((r) => r.employeeId === employeeId),
    [careerReadinessReviews, employeeId]
  );

  // Live preview rows for selected report
  const previewRows = useMemo(() => {
    const scopeUsers = isLearner
      ? users.filter((u) => u.id === currentUser.id)
      : users.filter((u) => ['learner', 'financial_controller'].includes(u.role));

    if (selectedReport === 'competency_gap_summary') {
      return gapSummary.rows.slice(0, 12).map((r) => ({
        col1: r.competencyCode,
        col2: language === 'vi' ? r.nameVi : r.nameEn,
        col3: `L${r.currentLevel ?? 0} / L${r.targetLevel}`,
        col4: `Gap ${r.gap} (${r.gapLabel})`,
      }));
    }
    if (selectedReport === 'active_idps_status') {
      return talentIdps
        .filter((i) => !isLearner || i.employeeId === currentUser.id)
        .map((i) => ({
          col1: i.employeeName,
          col2: `${i.targetPosition} (v${i.version})`,
          col3: i.status,
          col4: `${i.objectives.length} objectives · Due ${i.periodEnd}`,
        }));
    }
    if (selectedReport === 'before_after_reassessment') {
      return competencyReassessments
        .filter((r) => !isLearner || r.employeeId === currentUser.id)
        .map((r) => ({
          col1: r.employeeName,
          col2: r.targetPosition,
          col3: `${r.beforeAchievementPct}% → ${r.afterAchievementPct}%`,
          col4: `Gaps closed: ${r.gapsClosedCount}`,
        }));
    }
    if (selectedReport === 'critical_competency_risk') {
      return gapSummary.criticalBlockers.map((b) => ({
        col1: b.competencyCode,
        col2: language === 'vi' ? b.nameVi : b.nameEn,
        col3: `L${b.currentLevel ?? 0} / L${b.targetLevel}`,
        col4: 'CRITICAL BLOCKER',
      }));
    }
    // Career Readiness & Cohort preview
    return scopeUsers.slice(0, 8).map((u) => {
      const targetPos = u.position.includes('Assistant Financial Controller')
        ? 'Financial Controller'
        : u.position.includes('Senior Accountant')
        ? 'Assistant Financial Controller'
        : u.position.includes('Financial Controller')
        ? 'Strategic Finance Business Partner'
        : 'Senior Accountant';
      const gs = calculateGapAnalysis({
        assessments: competencyAssessments,
        employeeId: u.id,
        targetPosition: targetPos,
        competencies,
        domains,
        config: talentConfig,
      });
      const idp = talentIdps.find((i) => i.employeeId === u.id) || null;
      const im = idp
        ? evaluateIdpProgress({
            idp,
            enrollments,
            quizAttempts,
            submissions,
            courses,
            activities: developmentActivities,
          })
        : null;
      const rd = evaluateCareerReadiness({ gapSummary: gs, idpMetrics: im, config: talentConfig });
      return {
        col1: u.name,
        col2: `${u.property} → ${targetPos}`,
        col3: `Ach ${rd.achievementPct}% · IDP ${rd.idpCompletionPct}%`,
        col4: rd.status,
      };
    });
  }, [
    selectedReport,
    isLearner,
    currentUser.id,
    users,
    gapSummary,
    talentIdps,
    competencyReassessments,
    competencyAssessments,
    competencies,
    domains,
    talentConfig,
    enrollments,
    quizAttempts,
    submissions,
    courses,
    developmentActivities,
    language,
  ]);

  const statusTone =
    readiness.status === 'Ready for Review'
      ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
      : readiness.status === 'Nearly Ready'
      ? 'bg-amber-950 text-amber-100 border-amber-800'
      : 'bg-slate-900 text-white border-slate-800';

  return (
    <div className="space-y-6">
      <TalentHeaderBar
        titleEn="Career Readiness Evaluation & Management Reports"
        titleVi="Đánh giá Sẵn sàng Thăng tiến & Trung tâm Báo cáo (8 Báo cáo Excel/PDF)"
        subtitleEn="Automated promotion readiness gate with mandatory critical competency blockers, executive sign-off, and multi-sheet Excel exports."
        subtitleVi="Cổng kiểm soát năng lực cốt lõi trước khi xét bổ nhiệm, ký duyệt đa cấp và xuất 8 báo cáo quản trị Excel/PDF."
        defaultCoachMode="career_report"
      />

      {/* Readiness Verdict & Critical Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-5 rounded-xl border p-6 space-y-4 ${statusTone}`}>
          <div className="flex items-center justify-between text-xs opacity-80">
            <span>Career Readiness Verdict</span>
            <span className="font-mono">{selectedTalentTargetPosition}</span>
          </div>

          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{readiness.status}</h2>
              <p className="text-xs opacity-85 font-mono tabular-nums mt-0.5">
                Achievement {readiness.achievementPct}% · IDP {readiness.idpCompletionPct}% · Critical{' '}
                {readiness.criticalAchievementPct}%
              </p>
            </div>
          </div>

          {readiness.blockingReasons.length > 0 && (
            <div className="p-3.5 rounded-lg bg-black/25 border border-white/15 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  {readiness.blockedFromReadyForReview
                    ? language === 'vi'
                      ? 'BỊ CHẶN "Ready for Review" DO NĂNG LỰC CỐT LÕI'
                      : 'CRITICAL COMPETENCY GATE BLOCKER'
                    : language === 'vi'
                    ? 'Các điều kiện còn thiếu'
                    : 'Readiness Gaps & Blockers'}
                </span>
              </div>
              <ul className="space-y-1 list-disc list-inside opacity-90">
                {readiness.blockingReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {readiness.recommendedNextSteps.length > 0 && (
            <div className="text-xs space-y-1 opacity-90">
              <p className="font-bold text-amber-300">Recommended Next Steps:</p>
              {readiness.recommendedNextSteps.map((s, i) => (
                <p key={i}>• {s}</p>
              ))}
            </div>
          )}
        </div>

        {/* Sign-off & History */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            {language === 'vi'
              ? 'Xác nhận Sẵn sàng Bổ nhiệm (Promotion Panel Sign-Off)'
              : 'Formal Promotion Panel Readiness Sign-Off'}
          </h3>

          {canSignOff && currentUser.id !== employeeId ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Proposed Verdict</label>
                  <select
                    value={requestedStatus}
                    onChange={(e) => setRequestedStatus(e.target.value as CareerReadinessStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Not Ready">Not Ready</option>
                    <option value="Developing">Developing</option>
                    <option value="Nearly Ready">Nearly Ready</option>
                    <option value="Ready for Review">Ready for Review</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Panel Reviewer</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
                    {currentUser.name} ({currentUser.role})
                  </div>
                </div>
              </div>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  language === 'vi'
                    ? 'Nhận xét của FC / L&D / General Manager về mức độ sẵn sàng thăng tiến...'
                    : 'Panel notes, executive risk commentary, or promotion conditions...'
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <button
                onClick={handleSubmitSignOff}
                disabled={submittingReview}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{submittingReview ? 'Saving...' : 'Record Readiness Sign-Off'}</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              {language === 'vi'
                ? 'Chỉ Financial Controller, L&D Manager, General Manager hoặc Super Admin mới có quyền ký duyệt Readiness.'
                : 'Readiness panel sign-off is restricted to Financial Controllers, L&D Managers, General Managers, and Admins.'}
            </p>
          )}

          {empReviews.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Historical Readiness Reviews
              </p>
              <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {empReviews.map((rev) => (
                  <div key={rev.id} className="py-2 text-xs">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>
                        {rev.targetPosition} · {rev.finalStatus}
                      </span>
                      <span className="font-mono text-slate-500">{rev.reviewedAt.split('T')[0]}</span>
                    </div>
                    <p className="text-slate-600">{rev.reviewNotes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 8-Report Management Export Center */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {language === 'vi'
                  ? 'Trung tâm 8 Báo cáo Quản trị Năng lực & IDP'
                  : 'Talent & IDP Management Reports Center (8 Reports)'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'vi'
                  ? 'Xem trước dữ liệu trực tiếp và xuất tệp Excel (.xlsx) hoặc In/PDF.'
                  : 'Inspect live rows below and download structured Excel (.xlsx) or Print / PDF reports.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={exporting}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting...' : 'Download Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 8 Report Selector Buttons */}
          <div className="lg:col-span-4 space-y-1.5">
            {REPORT_CATALOG.map((rep) => (
              <button
                key={rep.id}
                onClick={() => setSelectedReport(rep.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  selectedReport === rep.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {language === 'vi' ? rep.titleVi : rep.titleEn}
              </button>
            ))}
          </div>

          {/* Live Preview Table */}
          <div className="lg:col-span-8 border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">
                {language === 'vi'
                  ? REPORT_CATALOG.find((r) => r.id === selectedReport)?.titleVi
                  : REPORT_CATALOG.find((r) => r.id === selectedReport)?.titleEn}
              </span>
              <span className="font-mono text-slate-500 tabular-nums">{previewRows.length} preview rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <tbody className="divide-y divide-slate-100">
                  {previewRows.length === 0 ? (
                    <tr>
                      <td className="p-6 text-center text-slate-500">
                        No records match this report scope yet.
                      </td>
                    </tr>
                  ) : (
                    previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {row.col1}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{row.col2}</td>
                        <td className="px-4 py-2.5 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {row.col3}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-right text-slate-900 whitespace-nowrap">
                          {row.col4}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
