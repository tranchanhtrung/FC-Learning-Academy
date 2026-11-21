import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Award,
  TrendingUp,
  Building,
  GraduationCap,
  ShieldCheck,
  Download,
} from 'lucide-react';

const FALLBACK_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%231E293B"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%23F59E0B" font-family="sans-serif" font-weight="700" font-size="22">FC</text></svg>';

export const AdminDashboard: React.FC = () => {
  const {
    users,
    enrollments,
    quizAttempts,
    idps,
    successionCandidates,
    submissions,
    t,
    language,
    setActiveTab,
    canAccessRoute,
  } = useApp();

  const isVi = language === 'vi';
  const learners = users.filter((u) => u.role === 'learner');
  const totalLearners = learners.length;
  const totalEnrollments = enrollments.length;
  const completedEnrollments = enrollments.filter((e) => e.status === 'completed').length;
  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  const activeIdpCount = learners.filter((l) => idps.some((i) => i.learnerId === l.id)).length;
  const activeIdpPct = totalLearners > 0 ? Math.round((activeIdpCount / totalLearners) * 100) : 0;

  const scoredItems = [
    ...quizAttempts.map((q) => q.score),
    ...submissions.filter((s) => typeof s.score === 'number').map((s) => s.score as number),
  ];
  const avgAssessmentScore =
    scoredItems.length > 0
      ? (scoredItems.reduce((sum, s) => sum + s, 0) / scoredItems.length).toFixed(1)
      : '0.0';

  const readyNowCount = successionCandidates.filter((c) => c.readiness === 'Ready Now').length;
  const ready1To2Count = successionCandidates.filter((c) => c.readiness === 'Ready in 1-2 Years').length;

  // Dynamically include all hotel properties represented by learners so newly imported properties appear automatically
  const defaultProperties = [
    'Grand Horizon Saigon Hotel & Residences',
    'Royal Palm Resort & Spa Danang',
    'Marina Bay Heritage Hotel Hanoi',
    'Emerald Bay Luxury Suites Nha Trang',
  ];
  const dynamicProperties = Array.from(
    new Set([
      ...defaultProperties,
      ...learners.map((l) => l.property).filter((p): p is string => Boolean(p && p.trim())),
    ])
  );
  const propertyColors = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600', 'bg-cyan-600'];
  const propertyStats = dynamicProperties.map((propName, idx) => {
    const propLearners = learners.filter((u) => u.property === propName);
    const propEnrollments = enrollments.filter((e) => propLearners.some((l) => l.id === e.userId));
    const avgProgress =
      propEnrollments.length > 0
        ? Math.round(propEnrollments.reduce((acc, e) => acc + e.progressPercent, 0) / propEnrollments.length)
        : propLearners.length > 0
        ? Math.round(
            (propLearners.reduce((acc, l) => acc + l.currentLevel / Math.max(1, l.targetLevel), 0) /
              propLearners.length) *
              100
          )
        : 0;
    return {
      name: propName,
      count: propLearners.length,
      rate: Math.min(100, avgProgress),
      color: propertyColors[idx % propertyColors.length],
    };
  });

  const translateReadiness = (readiness: string) => {
    if (!isVi) return readiness;
    if (readiness === 'Ready Now') return 'Sẵn sàng ngay';
    if (readiness === 'Ready in 1-2 Years') return '1–2 năm tới';
    return 'Đang phát triển';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{isVi ? 'QUẢN TRỊ TRUNG TÂM ACADEMY' : 'CENTRAL ACADEMY ADMINISTRATION'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold leading-snug">
            {isVi ? 'Bảng Điều Khiển Quản Trị Hệ Thống & Đào Tạo' : 'System Administration & Learning Analytics'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isVi
              ? 'Theo dõi chỉ số hiệu suất phát triển nhân tài tài chính toàn cụm khách sạn 5 sao.'
              : 'Holistic performance and talent development tracking across 5-star hotel clusters.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canAccessRoute('reports') && (
            <button
              onClick={() => setActiveTab('reports')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{t.common.exportExcel}</span>
            </button>
          )}
          {canAccessRoute('administration') && (
            <button
              onClick={() => setActiveTab('administration')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer whitespace-nowrap"
            >
              {isVi ? 'Cấu hình hệ thống' : 'System Settings'}
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t.dashboard.totalLearners}
            </span>
            <Users className="w-5 h-5 text-blue-600 shrink-0" />
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">{totalLearners}</div>
          <p className="text-[11px] text-slate-500">
            {activeIdpPct}% {isVi ? 'đã kích hoạt IDP' : 'with active IDP'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t.dashboard.completionRate}
            </span>
            <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
          </div>
          <div className="text-2xl font-black text-emerald-600 tabular-nums">{completionRate}%</div>
          <p className="text-[11px] text-emerald-600 font-semibold">
            {completedEnrollments}/{totalEnrollments} {isVi ? 'lượt khóa học xong' : 'enrollments completed'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t.dashboard.fcReadyCount}
            </span>
            <Award className="w-5 h-5 text-amber-600 shrink-0" />
          </div>
          <div className="text-2xl font-black text-amber-600 tabular-nums">{readyNowCount}</div>
          <p className="text-[11px] text-slate-500">
            {ready1To2Count} {isVi ? 'trong 1-2 năm tới' : 'ready in 1-2 yrs'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t.dashboard.avgAssessmentScore}
            </span>
            <GraduationCap className="w-5 h-5 text-purple-600 shrink-0" />
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">{avgAssessmentScore} / 100</div>
          <p className="text-[11px] text-slate-500">
            {submissions.length} {isVi ? 'dự án OJT đã nộp' : 'OJT projects submitted'}
          </p>
        </div>
      </div>

      {/* Middle Row: Succession Pipeline & Hotel Properties Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Succession Pipeline (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900">{t.reports.tabSuccession}</h3>
              <p className="text-xs text-slate-500">
                {isVi
                  ? 'Ứng viên sáng giá cho vị trí Giám Đốc Tài Chính tại các khách sạn thành viên'
                  : 'High-potential candidates in the Financial Controller succession bench'}
              </p>
            </div>
            {canAccessRoute('reports') && (
              <button
                onClick={() => setActiveTab('reports')}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer whitespace-nowrap"
              >
                {t.common.viewDetails} &rarr;
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            {successionCandidates.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                {isVi ? 'Chưa có ứng viên kế thừa nào.' : 'No succession candidates yet.'}
              </div>
            ) : (
              <table className="w-full text-xs text-left min-w-[480px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">{isVi ? 'Nhân sự' : 'Candidate'}</th>
                    <th className="py-2.5 px-3">{isVi ? 'Vị trí hiện tại' : 'Current Role'}</th>
                    <th className="py-2.5 px-3">{isVi ? 'Mức sẵn sàng' : 'Readiness'}</th>
                    <th className="py-2.5 px-3 text-right">{isVi ? 'Điểm năng lực' : 'Score'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {successionCandidates.map((cand) => {
                    const u = users.find((user) => user.id === cand.userId);
                    return (
                      <tr key={cand.userId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 flex items-center gap-2.5 font-bold text-slate-800 whitespace-nowrap">
                          <img
                            src={u?.avatar || FALLBACK_AVATAR}
                            alt={u?.name || cand.userId}
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_AVATAR;
                            }}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <span>{u?.name || cand.userId}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">{cand.currentRole}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              cand.readiness === 'Ready Now'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : cand.readiness === 'Ready in 1-2 Years'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {translateReadiness(cand.readiness)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 font-mono tabular-nums">
                          {cand.competencyScorePercent}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Hotel Cluster Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-base text-slate-900">
              {isVi ? 'Tiến Độ Theo Khách Sạn' : 'Property Progress'}
            </h3>
            <Building className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          <div className="space-y-4">
            {propertyStats.map((prop, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-800 truncate">{prop.name}</span>
                  <span className="font-bold text-slate-600 font-mono tabular-nums shrink-0">{prop.rate}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`${prop.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${prop.rate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {prop.count} {isVi ? 'học viên tài chính' : 'finance learners'}
                  </span>
                  <span>{isVi ? 'Chuẩn hóa USALI' : 'USALI Standardized'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
