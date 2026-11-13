import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LearningPath } from '../../types';
import {
  GitBranch,
  CheckCircle2,
  Clock,
  BookOpen,
  Briefcase,
  Award,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Target,
  Layers,
  Check,
} from 'lucide-react';

export const LearningPathsView: React.FC = () => {
  const {
    learningPaths,
    currentUser,
    courses,
    ojtAssignments,
    enrollments,
    language,
    t,
    setSelectedCourseForPlayer,
    setActiveTab,
    updateUserCareerPath,
    showToast,
  } = useApp();

  const [selectedPathId, setSelectedPathId] = useState<string>(
    currentUser.careerPathId || 'path_accountant_to_senior'
  );

  const activePath =
    learningPaths.find((p) => p.id === selectedPathId) || learningPaths[0];

  // Calculate track progress
  const allRequiredCoursesInTrack = activePath.stages.flatMap((s) => s.requiredCourses);
  const completedCoursesCount = allRequiredCoursesInTrack.filter((cid) => {
    const enr = enrollments.find((e) => e.userId === currentUser.id && e.courseId === cid);
    return enr?.status === 'completed';
  }).length;
  const trackProgressPct =
    allRequiredCoursesInTrack.length > 0
      ? Math.round((completedCoursesCount / allRequiredCoursesInTrack.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider mb-2">
            <GitBranch className="w-3.5 h-3.5" />
            <span>Lộ Trình Phát Triển Sự Nghiệp Tài Chính Khách Sạn Chuẩn Quốc Tế</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t.nav.learningPaths}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Chương trình thăng tiến 4 cấp bậc tuần tự từ Kế Toán Viên &rarr; Kế Toán Trưởng &rarr; Trợ Lý FC &rarr; Giám Đốc Tài Chính &rarr; Đối Tác Chiến Lược Của Tổng Giám Đốc (GM).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Tiến Độ Lộ Trình:</span>
            <span className="text-xl font-extrabold text-amber-900 font-mono">{trackProgressPct}%</span>
          </div>
        </div>
      </div>

      {/* Career Tracks Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {learningPaths.map((path) => {
          const isSelected = selectedPathId === path.id;
          const isUserPath = currentUser.careerPathId === path.id;

          return (
            <button
              key={path.id}
              onClick={() => setSelectedPathId(path.id)}
              className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-[#0A192F] text-white border-amber-400 shadow-lg ring-2 ring-amber-400/30'
                  : 'bg-white hover:border-slate-300 border-slate-200 text-slate-800'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold font-mono ${
                      isSelected
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : 'bg-blue-100 text-blue-900'
                    }`}
                  >
                    {path.code}
                  </span>
                  {isUserPath && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white">
                      Đang Theo Học
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-sm leading-snug line-clamp-2">
                  {language === 'vi' ? path.titleVi : path.titleEn}
                </h3>

                <p
                  className={`text-xs line-clamp-3 leading-relaxed ${
                    isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {language === 'vi' ? path.descriptionVi : path.descriptionEn}
                </p>
              </div>

              <div
                className={`mt-4 pt-3 border-t flex items-center justify-between text-xs font-semibold ${
                  isSelected ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {path.totalHours} {language === 'vi' ? 'giờ đào tạo' : 'learning hours'}
                </span>
                <span className={isSelected ? 'text-amber-400 font-bold' : 'text-blue-600 font-bold'}>
                  {path.stages.length} {language === 'vi' ? 'Giai đoạn' : 'Milestones'} &rarr;
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Path Milestone Stages Timeline */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-widest font-mono">
                {activePath.code} &bull; {activePath.totalHours} {language === 'vi' ? 'Tổng giờ học & thực tập' : 'Total Hours'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-bold">
                Hoàn thành: {completedCoursesCount}/{allRequiredCoursesInTrack.length} khóa học
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              {language === 'vi' ? activePath.titleVi : activePath.titleEn}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Vị trí bổ nhiệm đích: <strong className="text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{activePath.targetRole}</strong>
            </p>
          </div>

          <button
            onClick={async () => {
              await updateUserCareerPath(activePath.id);
              showToast(
                language === 'vi'
                  ? `Đã đăng ký lộ trình ${activePath.code} làm mục tiêu phát triển chính của bạn!`
                  : `Enrolled in ${activePath.code} as your primary development track!`,
                'success'
              );
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer shrink-0"
          >
            {language === 'vi' ? 'Chọn Làm Lộ Trình Phát Triển Chính' : 'Set as My Primary Track'}
          </button>
        </div>

        {/* Stages Timeline */}
        <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200 before:z-0">
          {activePath.stages.map((stage, idx) => (
            <div key={idx} className="relative z-10 flex items-start gap-4">
              {/* Stage Number Node */}
              <div className="w-8 h-8 rounded-full bg-[#0A192F] text-amber-400 border-2 border-amber-400 flex items-center justify-center font-extrabold text-xs shrink-0 shadow-md">
                {stage.stageNumber}
              </div>

              {/* Stage Card */}
              <div className="flex-1 bg-slate-50 border border-slate-200/80 p-5 sm:p-6 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-extrabold text-base text-slate-900">
                    {stage.stageNumber}. {language === 'vi' ? stage.titleVi : stage.titleEn}
                  </h4>
                  <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full border border-blue-200 w-fit">
                    Cột mốc {stage.stageNumber}
                  </span>
                </div>

                {/* Promotion Readiness Criteria */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Tiêu chí sẵn sàng thăng tiến (Promotion Readiness Criteria):</span>
                  </span>
                  <p className="text-slate-600 leading-relaxed pl-5">
                    {language === 'vi' ? stage.readinessCriteriaVi : stage.readinessCriteriaEn}
                  </p>
                </div>

                {/* Required Courses & OJT Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Required Courses */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Khóa học bắt buộc hoàn thành:</span>
                    </span>
                    <div className="space-y-2">
                      {stage.requiredCourses.map((cid) => {
                        const c = courses.find((course) => course.id === cid);
                        if (!c) return null;
                        const enr = enrollments.find((e) => e.userId === currentUser.id && e.courseId === cid);
                        const isDone = enr?.status === 'completed';

                        return (
                          <div
                            key={cid}
                            onClick={() => setSelectedCourseForPlayer(c)}
                            className="p-3 rounded-xl bg-white border border-slate-200 hover:border-amber-400 transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                              )}
                              <span className="font-bold text-slate-800 group-hover:text-blue-600 line-clamp-1">
                                {c.code} – {language === 'vi' ? c.titleVi : c.titleEn}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 pl-2">
                              {c.durationHours}h &bull; Vào học &rarr;
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Required OJT Assignments */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                      <span>Bài tập thực hành tại khách sạn (OJT):</span>
                    </span>
                    <div className="space-y-2">
                      {stage.requiredOjtAssignments.map((aid) => {
                        const a = ojtAssignments.find((ojt) => ojt.id === aid);
                        if (!a) return null;
                        return (
                          <div
                            key={aid}
                            onClick={() => setActiveTab('ojtProjects')}
                            className="p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-400 transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                          >
                            <span className="font-bold text-slate-800 group-hover:text-purple-600 line-clamp-1">
                              {a.code} – {language === 'vi' ? a.titleVi : a.titleEn}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
