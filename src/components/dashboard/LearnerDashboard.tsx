import React from 'react';
import { useApp } from '../../context/AppContext';
import { RadarChart } from '../common/RadarChart';
import {
  GraduationCap,
  Award,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  BookOpen,
  PlayCircle,
  FileText,
  Sparkles,
} from 'lucide-react';

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
    setSelectedCertificateForView,
    language,
    t,
  } = useApp();

  const myEnrollments = enrollments.filter((e) => e.userId === currentUser.id);
  const myCompletedCourses = myEnrollments.filter((e) => e.status === 'completed');
  const mySubmissions = submissions.filter((s) => s.userId === currentUser.id);
  const myAssessment = assessments.find((a) => a.learnerId === currentUser.id);
  const myIDP = idps.find((i) => i.learnerId === currentUser.id);
  const myCerts = certificates.filter((c) => c.userId === currentUser.id);
  const myPath = learningPaths.find((p) => p.id === currentUser.careerPathId) || learningPaths[0];

  // Prepare radar data from my assessment or default scores
  const radarData = domains.map((dom) => {
    // Average assessed score for competencies in this domain
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
      label: language === 'vi' ? dom.nameVi : dom.nameEn,
      code: dom.code,
      target: currentUser.targetLevel || 4,
      current: Math.max(1, Math.min(4, Number(current.toFixed(1)))),
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A192F] via-[#102A4C] to-[#1E3A8A] text-white p-6 sm:p-8 shadow-xl border border-slate-700/50">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Lộ trình phát triển FC' : 'FC Talent Acceleration'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {language === 'vi' ? `Chào mừng trở lại, ${currentUser.name}!` : `Welcome back, ${currentUser.name}!`}
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed">
            {language === 'vi'
              ? `Bạn đang theo đuổi lộ trình: "${myPath.titleVi}". Mục tiêu thăng tiến lên vị trí Giám đốc Tài chính Khách sạn (Financial Controller) thông qua chuẩn hóa 6 miền năng lực USALI.`
              : `You are on track in "${myPath.titleEn}". Progressing toward hotel Financial Controller leadership through mastery of 6 USALI competency domains.`}
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('myLearning')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all shadow-md flex items-center gap-2 font-bold cursor-pointer"
            >
              <span>{language === 'vi' ? 'Tiếp tục khóa học' : 'Continue Learning'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('aiAssistant')}
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl border border-slate-600 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{language === 'vi' ? 'Luyện tập với GM Simulator' : 'Practice with GM Simulator'}</span>
            </button>
          </div>
        </div>

        {/* Decorative Graphic Element */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-8 opacity-10 pointer-events-none">
          <Award className="w-96 h-96 text-amber-400" />
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Career Path Progress */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.dashboard.myPathProgress}
            </span>
            <div className="text-2xl font-black text-slate-900">
              {Math.round((myCompletedCourses.length / Math.max(1, courses.length)) * 100)}%
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{myCompletedCourses.length} / {courses.length} {language === 'vi' ? 'khóa hoàn thành' : 'courses completed'}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Active Courses */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.dashboard.activeCourses}
            </span>
            <div className="text-2xl font-black text-slate-900">
              {myEnrollments.filter((e) => e.status === 'in_progress').length}
            </div>
            <p className="text-[11px] text-slate-500">
              {language === 'vi' ? 'Đang học chủ động' : 'In active progress'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: OJT Deliverables */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.dashboard.pendingAssignments}
            </span>
            <div className="text-2xl font-black text-slate-900">
              {mySubmissions.length}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold">
              {mySubmissions.filter((s) => s.status === 'approved').length} {language === 'vi' ? 'đã được phê duyệt' : 'approved'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Certification Level */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'vi' ? 'Chứng chỉ đạt được' : 'Certifications Earned'}
            </span>
            <div className="text-2xl font-black text-amber-600">
              Level {myCerts.length > 0 ? myCerts[0].level : currentUser.currentLevel}
            </div>
            <p className="text-[11px] text-slate-500">
              {myCerts.length} {language === 'vi' ? 'chứng chỉ số có giá trị' : 'digital credentials'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Radar Chart & In-Progress Learning */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Competency Gap Radar (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-base text-slate-900">
                {t.assessment.radarTitle}
              </h3>
              <button
                onClick={() => setActiveTab('assessments')}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                {t.common.viewDetails} &rarr;
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'vi'
                ? 'So sánh giữa cấp độ đánh giá hiện tại và chuẩn năng lực mục tiêu vị trí FC (Level 4).'
                : 'Comparison between assessed proficiency and target Level 4 standard.'}
            </p>
          </div>

          <div className="py-2 flex items-center justify-center">
            <RadarChart
              data={radarData}
              size={320}
              targetLabel={language === 'vi' ? 'Chuẩn FC (Target)' : 'FC Standard'}
              currentLabel={language === 'vi' ? 'Đã đánh giá' : 'Assessed'}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {language === 'vi' ? 'Khoảng trống trung bình:' : 'Average Gap:'}
            </span>
            <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              {myAssessment ? `${myAssessment.overallGapAverage.toFixed(1)} Levels` : '1.2 Levels'}
            </span>
          </div>
        </div>

        {/* Right: In Progress Courses & IDP Priorities (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Courses Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {language === 'vi' ? 'Khóa Học Đang Tiếp Diễn' : 'Active In-Progress Courses'}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'vi'
                    ? 'Hoàn thành các module bài học và chuẩn bị làm bài kiểm tra trắc nghiệm USALI'
                    : 'Complete pending modules and review USALI workbook exercises'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('courses')}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                {language === 'vi' ? 'Tất cả khóa học' : 'All Courses'} &rarr;
              </button>
            </div>

            <div className="space-y-3">
              {myEnrollments.slice(0, 3).map((enr) => {
                const course = courses.find((c) => c.id === enr.courseId);
                if (!course) return null;

                return (
                  <div
                    key={enr.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-amber-400/80 transition-all bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={course.thumbnail}
                        alt={course.titleVi}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-slate-200"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            {course.code}
                          </span>
                          <span className="text-xs text-slate-500">
                            {course.durationHours} {language === 'vi' ? 'giờ' : 'hrs'}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mt-0.5 line-clamp-1">
                          {language === 'vi' ? course.titleVi : course.titleEn}
                        </h4>
                        <div className="w-48 bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${enr.progressPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-xs font-bold text-slate-700">
                        {enr.progressPercent}%
                      </span>
                      <button
                        onClick={() => setSelectedCourseForPlayer(course)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>{enr.progressPercent === 100 ? (language === 'vi' ? 'Xem lại' : 'Review') : (language === 'vi' ? 'Học tiếp' : 'Continue')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* IDP Development Priorities */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {t.assessment.idpTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'vi'
                    ? 'Nhiệm vụ đào tạo và kèm cặp ưu tiên do Giám Đốc Tài Chính chỉ định'
                    : 'Targeted development priorities formulated by your Financial Controller'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('assessments')}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                {language === 'vi' ? 'Xem kế hoạch đầy đủ' : 'Full IDP'} &rarr;
              </button>
            </div>

            <div className="space-y-3">
              {myIDP?.items.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.priority === 'High'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.priority} Priority
                      </span>
                      <span className="font-bold text-xs text-slate-800">
                        {item.competencyId}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {language === 'vi' ? 'Hạn chót:' : 'Deadline:'} {item.targetDate}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {item.practicalActivity}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                      item.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
