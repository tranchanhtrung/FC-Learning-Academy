import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileBarChart2,
  Download,
  Printer,
  Filter,
  Search,
  Users,
  Award,
  TrendingUp,
  DollarSign,
  Building,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const {
    users,
    courses,
    competencies,
    enrollments,
    assessments,
    submissions,
    successionCandidates,
    certificates,
    language,
    t,
  } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<
    'succession' | 'completion' | 'gap' | 'investment'
  >('succession');

  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all');

  const properties = [
    'all',
    'Grand Horizon Saigon Hotel & Residences',
    'Royal Palm Resort & Spa Danang',
    'Marina Bay Heritage Hotel Hanoi',
    'Emerald Bay Luxury Suites Nha Trang',
  ];

  const filteredCandidates = React.useMemo(() => {
    return successionCandidates.filter((cand) => {
      if (selectedPropertyFilter === 'all') return true;
      const u = users.find((user) => user.id === cand.userId);
      return u?.property === selectedPropertyFilter;
    });
  }, [successionCandidates, users, selectedPropertyFilter]);

  const filteredEnrollments = React.useMemo(() => {
    return enrollments.filter((enr) => {
      if (selectedPropertyFilter === 'all') return true;
      const u = users.find((user) => user.id === enr.userId);
      return u?.property === selectedPropertyFilter;
    });
  }, [enrollments, users, selectedPropertyFilter]);

  // Compute Cluster Competency Gap Matrix dynamically from latest assessment per learner
  const clusterGapMatrix = React.useMemo(() => {
    const latestByLearner = new Map<string, typeof assessments[0]>();
    assessments.forEach((asmt) => {
      const learner = users.find((u) => u.id === asmt.learnerId);
      if (selectedPropertyFilter !== 'all' && learner?.property !== selectedPropertyFilter) return;
      const existing = latestByLearner.get(asmt.learnerId);
      if (!existing || new Date(asmt.date).getTime() >= new Date(existing.date).getTime()) {
        latestByLearner.set(asmt.learnerId, asmt);
      }
    });

    const latestAssessments = Array.from(latestByLearner.values());
    return competencies
      .map((comp) => {
        let sumGap = 0;
        let count = 0;
        latestAssessments.forEach((asmt) => {
          const scoreObj = asmt.scores?.[comp.code];
          if (scoreObj !== undefined) {
            sumGap += scoreObj.gap || 0;
            count++;
          }
        });
        const avgGap = count > 0 ? Number((sumGap / count).toFixed(1)) : 0;
        const priority = avgGap >= 1.5 ? 'High' : avgGap >= 0.8 ? 'Medium' : 'Low';
        return {
          code: comp.code,
          title: language === 'vi' ? comp.nameVi : comp.nameEn,
          avgGap,
          priority,
          sampleSize: count,
        };
      })
      .filter((item) => item.sampleSize > 0)
      .sort((a, b) => b.avgGap - a.avgGap);
  }, [assessments, competencies, users, selectedPropertyFilter, language]);

  const readyNowCount = filteredCandidates.filter((c) => c.readiness === 'Ready Now').length;
  const readySoonCount = filteredCandidates.filter((c) => c.readiness === 'Ready in 1-2 Years').length;

  const handleExportCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCurrentReport = () => {
    if (activeReportTab === 'succession') {
      const headers = ['Candidate Name', 'Current Position', 'Property', 'Target Role', 'Readiness', 'Competency Attainment', 'OJT Completed'];
      const rows = filteredCandidates.map((c) => {
        const u = users.find((user) => user.id === c.userId);
        return [`"${u?.name || ''}"`, `"${c.currentRole}"`, `"${u?.property || ''}"`, `"${c.targetRole}"`, `"${c.readiness}"`, `"${c.competencyScorePercent}%"`, `"${c.completedOJTCount}"`];
      });
      handleExportCSV('FC_Succession_Pipeline_Report', headers, rows);
    } else if (activeReportTab === 'gap') {
      const headers = ['Competency Code', 'Competency Title', 'Average Gap (Levels)', 'Priority', 'Learners Assessed'];
      const rows = clusterGapMatrix.map((item) => [
        `"${item.code}"`,
        `"${item.title}"`,
        `"${item.avgGap}"`,
        `"${item.priority}"`,
        `"${item.sampleSize}"`,
      ]);
      handleExportCSV('Cluster_Competency_Gap_Matrix', headers, rows);
    } else if (activeReportTab === 'investment') {
      const headers = ['Metric', 'Value', 'Notes'];
      const rows = [
        ['"Total Training Investment"', '"$18,500"', '"Curriculum, certification, and OJT audits"'],
        ['"Estimated Cost Savings"', '"$142,000"', '"F&B leakage reduction & overtime optimization"'],
        ['"Approved OJT Projects"', `"${submissions.filter((s) => s.status === 'approved').length}"`, '"Audited deliverables"'],
        ['"Certificates Issued"', `"${certificates.length}"`, '"Verified academy credentials"'],
        ['"Calculated Training ROI"', '"668%"', '"Annualized cluster impact"'],
      ];
      handleExportCSV('FC_Academy_Training_ROI_Report', headers, rows);
    } else {
      const headers = ['Learner Name', 'Property', 'Course Code', 'Progress %', 'Status', 'Enrolled Date', 'Quiz Score'];
      const rows = filteredEnrollments.map((e) => {
        const u = users.find((user) => user.id === e.userId);
        const c = courses.find((course) => course.id === e.courseId);
        return [`"${u?.name || ''}"`, `"${u?.property || ''}"`, `"${c?.code || ''}"`, `"${e.progressPercent}%"`, `"${e.status}"`, `"${e.enrolledDate}"`, `"${e.quizScore || 'N/A'}"`];
      });
      handleExportCSV('Training_Completion_Analytics_Report', headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <FileBarChart2 className="w-3.5 h-3.5" />
            <span>Executive Reporting & Management Analytics</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.reports.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {t.reports.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCurrentReport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>{t.common.exportExcel}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{t.common.printReport}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs + Property Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveReportTab('succession')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeReportTab === 'succession'
                ? 'bg-[#0A192F] text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.reports.tabSuccession}
          </button>
          <button
            onClick={() => setActiveReportTab('completion')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeReportTab === 'completion'
                ? 'bg-[#0A192F] text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.reports.tabCompletion}
          </button>
          <button
            onClick={() => setActiveReportTab('gap')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeReportTab === 'gap'
                ? 'bg-[#0A192F] text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {language === 'vi' ? 'Ma Trận Khoảng Trống Toàn Cụm' : 'Cluster Competency Gap Matrix'}
          </button>
          <button
            onClick={() => setActiveReportTab('investment')}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeReportTab === 'investment'
                ? 'bg-[#0A192F] text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.reports.tabInvestment}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedPropertyFilter}
            onChange={(e) => setSelectedPropertyFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs focus:outline-none"
          >
            <option value="all">{language === 'vi' ? 'Tất cả khách sạn (Cluster)' : 'All Properties (Cluster)'}</option>
            {properties.slice(1).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Report 1: Succession Pipeline Readiness Matrix */}
      {activeReportTab === 'succession' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Đường Ống Kế Thừa Vị Trí Giám Đốc Tài Chính (FC Succession Pipeline)
              </h3>
              <p className="text-xs text-slate-500">
                Phân loại theo mức độ sẵn sàng: Ready Now, Ready in 1-2 Years, Developing
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                {readyNowCount} Ready Now
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {readySoonCount} Ready in 1-2 Years
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Học viên</th>
                  <th className="py-3 px-3">Vị trí hiện tại</th>
                  <th className="py-3 px-3">Khách sạn</th>
                  <th className="py-3 px-3">Vị trí kế thừa</th>
                  <th className="py-3 px-3">Mức độ sẵn sàng</th>
                  <th className="py-3 px-3 text-center">Năng lực</th>
                  <th className="py-3 px-3 text-center">Dự án OJT</th>
                  <th className="py-3 px-3">Mentor / Huấn luyện viên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.map((cand) => {
                  const u = users.find((user) => user.id === cand.userId);
                  return (
                    <tr key={cand.userId} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 flex items-center gap-2.5 font-bold text-slate-900">
                        <img
                          src={u?.avatar}
                          alt={u?.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <span>{u?.name}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{cand.currentRole}</td>
                      <td className="py-3 px-3 text-slate-500 truncate max-w-[160px]">{u?.property}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">{cand.targetRole}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            cand.readiness === 'Ready Now'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : cand.readiness === 'Ready in 1-2 Years'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {cand.readiness}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                        {cand.competencyScorePercent}%
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {cand.completedOJTCount} / 6
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{cand.mentorName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 2: Training Completion & Course Statistics */}
      {activeReportTab === 'completion' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">
              Báo Cáo Tiến Độ Hoàn Thành Khóa Học Các Đơn Vị
            </h3>
            <span className="text-xs text-slate-500 font-bold">
              Tổng số lượt học: {filteredEnrollments.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Học viên</th>
                  <th className="py-3 px-3">Khóa học</th>
                  <th className="py-3 px-3">Tiến độ (%)</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3">Ngày bắt đầu</th>
                  <th className="py-3 px-3 text-right">Điểm thi USALI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEnrollments.map((enr) => {
                  const u = users.find((user) => user.id === enr.userId);
                  const c = courses.find((course) => course.id === enr.courseId);
                  return (
                    <tr key={enr.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-bold text-slate-900">{u?.name}</td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {c?.code} – {language === 'vi' ? c?.titleVi : c?.titleEn}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full"
                              style={{ width: `${enr.progressPercent}%` }}
                            ></div>
                          </div>
                          <span className="font-mono font-bold text-slate-700">{enr.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            enr.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {enr.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{enr.enrolledDate}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                        {enr.quizScore ? `${enr.quizScore}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 3: Cluster Gap Matrix */}
      {activeReportTab === 'gap' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Ma Trận Phân Tích Khoảng Trống Năng Lực Cấp Cụm Khách Sạn
            </h3>
            <p className="text-xs text-slate-500">
              Công thức: Khoảng Trống = Cấp Độ Mục Tiêu – Cấp Độ Đánh Giá Thực Tế
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {clusterGapMatrix.map((item) => (
              <div key={item.code} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-800">{item.code}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.priority === 'High'
                        ? 'bg-rose-100 text-rose-800'
                        : item.priority === 'Medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {item.priority} Priority
                  </span>
                </div>
                <h4 className="font-bold text-slate-900">{item.title}</h4>
                <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200">
                  <span>Khoảng trống bình quân ({item.sampleSize} hồ sơ):</span>
                  <span className="font-bold text-slate-900 font-mono">{item.avgGap} Levels</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report 4: Training Investment & ROI */}
      {activeReportTab === 'investment' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Hiệu Quả Đầu Tư Đào Tạo & Lợi Nhuận Thu Về (Training ROI)
            </h3>
            <p className="text-xs text-slate-500">
              Đo lường giá trị tạo ra từ việc tiết kiệm chi phí, ngăn ngừa thất thoát và tối ưu tỷ lệ Flow-Through
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-slate-500 font-bold uppercase tracking-wider block">Tổng chi phí đào tạo LMS</span>
              <div className="text-2xl font-black text-slate-900 font-mono">$18,500</div>
              <p className="text-[11px] text-slate-500">Bao gồm học liệu, chứng chỉ và kiểm toán OJT</p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
              <span className="text-emerald-700 font-bold uppercase tracking-wider block">Giá trị tiết kiệm chi phí</span>
              <div className="text-2xl font-black text-emerald-700 font-mono">$142,000</div>
              <p className="text-[11px] text-emerald-800 font-medium">Giảm thất thoát F&B và tối ưu chi phí làm thêm giờ</p>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
              <span className="text-amber-800 font-bold uppercase tracking-wider block">Hệ số hoàn vốn đầu tư (ROI)</span>
              <div className="text-2xl font-black text-amber-700 font-mono">668%</div>
              <p className="text-[11px] text-amber-900 font-medium">Tỷ suất sinh lời vượt trội từ năng lực quản trị tài chính</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
