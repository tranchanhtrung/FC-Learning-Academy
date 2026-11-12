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
} from 'lucide-react';

export const LearningPathsView: React.FC = () => {
  const {
    learningPaths,
    currentUser,
    courses,
    ojtAssignments,
    language,
    t,
    setSelectedCourseForPlayer,
    setActiveTab,
  } = useApp();

  const [selectedPathId, setSelectedPathId] = useState<string>(
    currentUser.careerPathId || 'path_a'
  );

  const activePath = learningPaths.find((p) => p.id === selectedPathId) || learningPaths[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <GitBranch className="w-3.5 h-3.5" />
            <span>Structured Career Progression Tracks</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.nav.learningPaths}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {language === 'vi'
              ? 'Lộ trình phát triển sự nghiệp từng bước chuyển hóa từ kế toán nghiệp vụ thành Giám Đốc Tài Chính Chiến Lược.'
              : 'Structured career tracks guiding the transformation from transactional accounting into strategic FC leadership.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
            {language === 'vi' ? 'Lộ trình hiện tại:' : 'Active Track:'} {activePath.code}
          </span>
        </div>
      </div>

      {/* 3 Career Paths Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      isSelected
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {path.code}
                  </span>
                  {isUserPath && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white">
                      {language === 'vi' ? 'Đang theo học' : 'My Track'}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm leading-snug line-clamp-2">
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
                  {path.totalHours} {language === 'vi' ? 'giờ học' : 'learning hours'}
                </span>
                <span className={isSelected ? 'text-amber-400 font-bold' : 'text-blue-600 font-bold'}>
                  {path.stages.length} {language === 'vi' ? 'Giai đoạn' : 'Stages'} &rarr;
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Path Milestone Stages Timeline */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
              {activePath.code} &bull; {activePath.totalHours} {language === 'vi' ? 'Tổng giờ học & thực tập' : 'Total Hours'}
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
              {language === 'vi' ? activePath.titleVi : activePath.titleEn}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'vi' ? 'Vị trí bổ nhiệm đích:' : 'Target Leadership Role:'} <strong className="text-slate-800">{activePath.targetRole}</strong>
            </p>
          </div>

          <button
            onClick={() => {
              currentUser.careerPathId = activePath.id;
              alert(language === 'vi' ? `Đã đăng ký lộ trình ${activePath.code} làm mục tiêu phát triển chính!` : `Enrolled in ${activePath.code}!`);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
          >
            {language === 'vi' ? 'Chọn làm lộ trình chính' : 'Set as My Primary Track'}
          </button>
        </div>

        {/* Stages Timeline */}
        <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200 before:z-0">
          {activePath.stages.map((stage, idx) => (
            <div key={idx} className="relative z-10 flex items-start gap-4">
              {/* Stage Number Node */}
              <div className="w-8 h-8 rounded-full bg-[#0A192F] text-amber-400 border-2 border-amber-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                {stage.stageNumber}
              </div>

              {/* Stage Card */}
              <div className="flex-1 bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {language === 'vi' ? stage.titleVi : stage.titleEn}
                  </h4>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 w-fit">
                    Milestone {stage.stageNumber}
                  </span>
                </div>

                {/* Readiness Criteria */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-0.5">
                    {language === 'vi' ? 'Tiêu chí sẵn sàng thăng tiến:' : 'Promotion Readiness Criteria:'}
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    {language === 'vi' ? stage.readinessCriteriaVi : stage.readinessCriteriaEn}
                  </p>
                </div>

                {/* Required Courses & OJT Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Courses */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>{language === 'vi' ? 'Khóa học bắt buộc:' : 'Required Courses:'}</span>
                    </span>
                    <div className="space-y-1.5">
                      {stage.requiredCourses.map((cid) => {
                        const c = courses.find((course) => course.id === cid);
                        if (!c) return null;
                        return (
                          <div
                            key={cid}
                            onClick={() => setSelectedCourseForPlayer(c)}
                            className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 transition-colors flex items-center justify-between cursor-pointer group"
                          >
                            <span className="font-bold text-slate-800 group-hover:text-blue-600">
                              {c.code} – {language === 'vi' ? c.titleVi : c.titleEn}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {c.durationHours}h
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* OJT Projects */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                      <span>{language === 'vi' ? 'Dự án thực tế OJT yêu cầu:' : 'Required OJT Deliverables:'}</span>
                    </span>
                    <div className="space-y-1.5">
                      {stage.requiredOjtAssignments.map((aid) => {
                        const a = ojtAssignments.find((ojt) => ojt.id === aid);
                        if (!a) return null;
                        return (
                          <div
                            key={aid}
                            onClick={() => setActiveTab('ojtProjects')}
                            className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 transition-colors flex items-center justify-between cursor-pointer group"
                          >
                            <span className="font-bold text-slate-800 group-hover:text-purple-600 line-clamp-1">
                              {a.code} – {language === 'vi' ? a.titleVi : a.titleEn}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
