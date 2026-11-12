import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  BookOpen,
  Award,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  Building,
  GraduationCap,
  ShieldCheck,
  Download,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    users,
    courses,
    enrollments,
    assessments,
    successionCandidates,
    submissions,
    t,
    language,
    setActiveTab,
  } = useApp();

  const totalLearners = users.filter((u) => u.role === 'learner').length;
  const totalEnrollments = enrollments.length;
  const completedEnrollments = enrollments.filter((e) => e.status === 'completed').length;
  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 74;

  const readyNowCount = successionCandidates.filter((c) => c.readiness === 'Ready Now').length;
  const ready1To2Count = successionCandidates.filter((c) => c.readiness === 'Ready in 1-2 Years').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>{language === 'vi' ? 'QUẢN TRỊ TRUNG TÂM ACADEMY' : 'CENTRAL ACADEMY ADMINISTRATION'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {language === 'vi' ? 'Bảng Điều Khiển Quản Trị Hệ Thống & Đào Tạo' : 'System Administration & Learning Analytics'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'vi'
              ? 'Theo dõi chỉ số hiệu suất phát triển nhân tài tài chính toàn cụm khách sạn 5 sao.'
              : 'Holistic performance and talent development tracking across 5-star hotel clusters.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('reports')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.common.exportExcel}</span>
          </button>
          <button
            onClick={() => setActiveTab('administration')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
          >
            {language === 'vi' ? 'Cấu hình hệ thống' : 'System Settings'}
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">{t.dashboard.totalLearners}</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalLearners}</div>
          <p className="text-[11px] text-slate-500">100% {language === 'vi' ? 'đã kích hoạt IDP' : 'with active IDP'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">{t.dashboard.completionRate}</span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{completionRate}%</div>
          <p className="text-[11px] text-emerald-600 font-semibold">+8% {language === 'vi' ? 'so với quý trước' : 'vs prior quarter'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">{t.dashboard.fcReadyCount}</span>
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{readyNowCount}</div>
          <p className="text-[11px] text-slate-500">{ready1To2Count} {language === 'vi' ? 'trong 1-2 năm tới' : 'ready in 1-2 yrs'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">{t.dashboard.avgAssessmentScore}</span>
            <GraduationCap className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">88.5 / 100</div>
          <p className="text-[11px] text-slate-500">{submissions.length} {language === 'vi' ? 'dự án OJT đã nộp' : 'OJT projects graded'}</p>
        </div>
      </div>

      {/* Middle Row: Succession Pipeline & Hotel Properties Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Succession Pipeline (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {t.reports.tabSuccession}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'vi'
                  ? 'Ứng viên sáng giá cho vị trí Giám Đốc Tài Chính tại các khách sạn thành viên'
                  : 'High-potential candidates in the Financial Controller succession bench'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
            >
              {t.common.viewDetails} &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Nhân sự' : 'Candidate'}</th>
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Vị trí hiện tại' : 'Current Role'}</th>
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Mức sẵn sàng' : 'Readiness'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'vi' ? 'Điểm năng lực' : 'Score'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {successionCandidates.map((cand) => {
                  const u = users.find((user) => user.id === cand.userId);
                  return (
                    <tr key={cand.userId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 flex items-center gap-2.5 font-bold text-slate-800">
                        <img
                          src={u?.avatar}
                          alt={u?.name}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <span>{u?.name}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{cand.currentRole}</td>
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
                      <td className="py-3 px-3 text-right font-black text-slate-900 font-mono">
                        {cand.competencyScorePercent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hotel Cluster Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">
              {language === 'vi' ? 'Tiến Độ Theo Khách Sạn' : 'Property Progress'}
            </h3>
            <Building className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-4">
            {[
              { name: 'Grand Horizon Saigon Hotel', count: 4, rate: 82, color: 'bg-blue-600' },
              { name: 'Royal Palm Resort Danang', count: 3, rate: 76, color: 'bg-emerald-600' },
              { name: 'Marina Bay Heritage Hanoi', count: 2, rate: 68, color: 'bg-amber-600' },
              { name: 'Emerald Bay Luxury Suites Nha Trang', count: 2, rate: 58, color: 'bg-purple-600' },
            ].map((prop, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{prop.name}</span>
                  <span className="font-bold text-slate-600">{prop.rate}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`${prop.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${prop.rate}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{prop.count} {language === 'vi' ? 'học viên tài chính' : 'finance learners'}</span>
                  <span>USALI Standardized</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
