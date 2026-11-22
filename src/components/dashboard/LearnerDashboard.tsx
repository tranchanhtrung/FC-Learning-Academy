import React from 'react';
import { useApp } from '../../context/AppContext';
import { RadarChart } from '../common/RadarChart';
import {
  GraduationCap,
  Award,
  Clock,
  TrendingUp,
  ArrowRight,
  BookOpen,
  PlayCircle,
  FileText,
  Sparkles,
} from 'lucide-react';

const FALLBACK_THUMB =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="16" fill="%230F172A"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%23F59E0B" font-family="sans-serif" font-weight="700" font-size="24">HFC</text></svg>';

export const LearnerDashboard: React.FC = () => {
  const {
    currentUser,
    domains,
    competencies,
    courses,
    enrollments,
    submissions,
    assessments,
    idps,
    certificates,
    learningPaths,
    setActiveTab,
    setSelectedCourseForPlayer,
    language,
    t,
    canAccessRoute,
  } = useApp();

  const isVi = language === 'vi';
  const myEnrollments = enrollments.filter((e) => e.userId === currentUser.id);
  const myCompletedCourses = myEnrollments.filter((e) => e.status === 'completed');
  const mySubmissions = submissions.filter((s) => s.userId === currentUser.id);
  const myAssessment = assessments.find((a) => a.learnerId === currentUser.id);
  const myIDP = idps.find((i) => i.learnerId === currentUser.id);
  const myCerts = certificates.filter((c) => c.userId === currentUser.id);
  const myPath = learningPaths.find((p) => p.id === currentUser.careerPathId) || learningPaths[0];

  const activePathTitle = myPath
    ? isVi
      ? myPath.titleVi
      : myPath.titleEn
    : isVi
    ? 'Lộ trình Giám đốc Tài chính Khách sạn (FC)'
    : 'Hospitality Financial Controller Track';

  // Prepare radar data from my assessment or default scores
  const radarData = domains.map((dom) => {
    const domComps = competencies.filter((c) => c.domainId === dom.id);
    let totalScore = 0;
    let count = 0;

    domComps.forEach((c) => {
      const scoreObj = myAssessment?.scores[c.code];
      if (scoreObj) {
        totalScore += scoreObj.supervisorLevel;
        count++;
      }
    });

    const current = count > 0 ? totalScore / count : currentUser.currentLevel;
    return {
      label: isVi ? dom.nameVi : dom.nameEn,
      code: dom.code,
      target: currentUser.targetLevel || 4,
      current: Math.max(1, Math.min(4, Number(current.toFixed(1)))),
    };
  });

  const translatePriority = (priority: string) => {
    if (!isVi) return `${priority} Priority`;
    if (priority === 'High') return 'Ưu tiên cao';
    if (priority === 'Medium') return 'Ưu tiên TB';
    return 'Ưu tiên thấp';
  };

  const translateStatus = (status: string) => {
    if (!isVi) return status;
    if (status === 'Completed') return 'Hoàn thành';
    if (status === 'In Progress') return 'Đang thực hiện';
    return 'Chưa bắt đầu';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A192F] via-[#102A4C] to-[#1E3A8A] text-white p-5 sm:p-8 shadow-xl border border-slate-700/50">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{isVi ? 'Lộ trình phát triển FC' : 'FC Talent Acceleration'}</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-snug">
            {isVi ? `Chào mừng trở lại, ${currentUser.name}!` : `Welcome back, ${currentUser.name}!`}
          </h2>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {isVi
              ? `Bạn đang theo đuổi lộ trình: "${activePathTitle}". Mục tiêu thăng tiến lên vị trí Giám đốc Tài chính Khách sạn (Financial Controller) thông qua chuẩn hóa 6 miền năng lực USALI.`
              : `You are on track in "${activePathTitle}". Progressing toward hotel Financial Controller leadership through mastery of 6 USALI competency domains.`}
          </p>

          <div className="pt-2 flex flex-wrap gap-3 text-xs font-semibold">
            {canAccessRoute('myLearning') && (
              <button
                onClick={() => setActiveTab('myLearning')}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all shadow-md flex items-center gap-2 font-bold cursor-pointer whitespace-nowrap"
              >
                <span>{isVi ? 'Tiếp tục khóa học' : 'Continue Learning'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            )}
            {canAccessRoute('aiAssistant') && (
              <button
                onClick={() => setActiveTab('aiAssistant')}
                className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl border border-slate-600 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{isVi ? 'Luyện tập với GM Simulator' : 'Practice with GM Simulator'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative Graphic Element */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-8 opacity-10 pointer-events-none hidden sm:block">
          <Award className="w-80 h-80 text-amber-400" />
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Career Path Progress */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              {t.dashboard.myPathProgress}
            </span>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {Math.round((myCompletedCourses.length / Math.max(1, courses.length)) * 100)}%
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {myCompletedCourses.length} / {courses.length} {isVi ? 'khóa hoàn thành' : 'courses completed'}
              </span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Active Courses */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              {t.dashboard.activeCourses}
            </span>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {myEnrollments.filter((e) => e.status === 'in_progress').length}
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {isVi ? 'Đang học chủ động' : 'In active progress'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: OJT Deliverables */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              {t.dashboard.pendingAssignments}
            </span>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {mySubmissions.length}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold truncate">
              {mySubmissions.filter((s) => s.status === 'approved').length}{' '}
              {isVi ? 'đã được phê duyệt' : 'approved'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Certification Level */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              {isVi ? 'Chứng chỉ đạt được' : 'Certifications Earned'}
            </span>
            <div className="text-2xl font-black text-amber-600">
              {isVi ? 'Cấp' : 'Level'} {myCerts.length > 0 ? myCerts[0].level : currentUser.currentLevel}
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {myCerts.length} {isVi ? 'chứng chỉ số có giá trị' : 'digital credentials'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Radar Chart & In-Progress Learning */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Competency Gap Radar (5 cols) */}
        <div className="xl:col-span-5 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="font-bold text-base text-slate-900">
                {t.assessment.radarTitle}
              </h3>
              {canAccessRoute('assessments') && (
                <button
                  onClick={() => setActiveTab('assessments')}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  {t.common.viewDetails} &rarr;
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isVi
                ? 'So sánh giữa cấp độ đánh giá hiện tại và chuẩn năng lực mục tiêu vị trí FC (Cấp 4).'
                : 'Comparison between assessed proficiency and target Level 4 standard.'}
            </p>
          </div>

          <div className="py-1 flex items-center justify-center">
            <RadarChart
              data={radarData}
              size={300}
              targetLabel={isVi ? 'Chuẩn FC (Mục tiêu)' : 'FC Standard'}
              currentLabel={isVi ? 'Đã đánh giá' : 'Assessed'}
            />
          </div>

          {/* Compact 6-Domain Score Summary to provide clear numerical readout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {radarData.map((d) => {
              const gap = Number(Math.max(0, d.target - d.current).toFixed(1));
              return (
                <div
                  key={d.code}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2 text-xs"
                  title={d.label}
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 block leading-tight">{d.code}</span>
                    <span className="text-[11px] text-slate-500 truncate block">{d.label}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-md font-mono font-bold text-[11px] shrink-0 tabular-nums ${
                      gap >= 1.5
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : gap > 0
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    L{d.current}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
            <span className="text-slate-500 font-medium">
              {isVi ? 'Khoảng trống trung bình:' : 'Average Gap:'}
            </span>
            <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 tabular-nums">
              {myAssessment
                ? `${myAssessment.overallGapAverage.toFixed(1)} ${isVi ? 'cấp độ' : 'Levels'}`
                : isVi
                ? 'Chưa đánh giá'
                : 'Not Assessed'}
            </span>
          </div>
        </div>

        {/* Right: In Progress Courses & IDP Priorities (7 cols) */}
        <div className="xl:col-span-7 space-y-6 min-w-0">
          {/* Active Courses Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-900">
                  {isVi ? 'Khóa Học Đang Tiếp Diễn' : 'Active In-Progress Courses'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isVi
                    ? 'Hoàn thành các module bài học và chuẩn bị làm bài kiểm tra trắc nghiệm USALI'
                    : 'Complete pending modules and review USALI workbook exercises'}
                </p>
              </div>
              {canAccessRoute('courses') && (
                <button
                  onClick={() => setActiveTab('courses')}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isVi ? 'Tất cả khóa học' : 'All Courses'} &rarr;
                </button>
              )}
            </div>

            <div className="space-y-3">
              {myEnrollments.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center space-y-2">
                  <p className="text-xs text-slate-600 font-medium">
                    {isVi
                      ? 'Bạn chưa đăng ký khóa học nào. Hãy khám phá danh mục khóa học USALI để bắt đầu.'
                      : 'No enrolled courses yet. Explore the USALI course catalog to get started.'}
                  </p>
                  {canAccessRoute('courses') && (
                    <button
                      onClick={() => setActiveTab('courses')}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isVi ? 'Khám phá khóa học' : 'Browse Courses'}
                    </button>
                  )}
                </div>
              ) : (
                myEnrollments.slice(0, 3).map((enr) => {
                  const course = courses.find((c) => c.id === enr.courseId);
                  if (!course) return null;

                  return (
                    <div
                      key={enr.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-amber-400/80 transition-all bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 w-full sm:flex-1">
                        <img
                          src={course.thumbnail}
                          alt={isVi ? course.titleVi : course.titleEn}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_THUMB;
                          }}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-slate-200"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
                              {course.code}
                            </span>
                            <span className="text-xs text-slate-500">
                              {course.durationHours} {isVi ? 'giờ' : 'hrs'}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-0.5 line-clamp-2 sm:line-clamp-1">
                            {isVi ? course.titleVi : course.titleEn}
                          </h4>
                          <div className="w-full max-w-[14rem] bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${enr.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                        <span className="text-xs font-bold text-slate-700 font-mono tabular-nums">
                          {enr.progressPercent}%
                        </span>
                        <button
                          onClick={() => setSelectedCourseForPlayer(course)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {enr.progressPercent === 100
                              ? isVi
                                ? 'Xem lại'
                                : 'Review'
                              : isVi
                              ? 'Học tiếp'
                              : 'Continue'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* IDP Development Priorities */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-900">
                  {t.assessment.idpTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {isVi
                    ? 'Nhiệm vụ đào tạo và kèm cặp ưu tiên do Giám Đốc Tài Chính chỉ định'
                    : 'Targeted development priorities formulated by your Financial Controller'}
                </p>
              </div>
              {canAccessRoute('assessments') && (
                <button
                  onClick={() => setActiveTab('assessments')}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isVi ? 'Xem kế hoạch đầy đủ' : 'Full IDP'} &rarr;
                </button>
              )}
            </div>

            <div className="space-y-3">
              {!myIDP || myIDP.items.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
                  {isVi
                    ? 'Chưa có kế hoạch phát triển cá nhân (IDP). Hoàn thành đánh giá năng lực để tạo lộ trình IDP tự động.'
                    : 'No Individual Development Plan (IDP) assigned yet. Complete an assessment to generate your IDP.'}
                </div>
              ) : (
                myIDP.items.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                            item.priority === 'High'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {translatePriority(item.priority)}
                        </span>
                        <span className="font-bold text-xs text-slate-800 font-mono">
                          {item.competencyId}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3 shrink-0" />
                          {isVi ? 'Hạn chót:' : 'Deadline:'} {item.targetDate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {isVi
                          ? item.practicalActivity
                          : item.practicalActivityEn || item.practicalActivity}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 self-start whitespace-nowrap ${
                        item.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {translateStatus(item.status)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
