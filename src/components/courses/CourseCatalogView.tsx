import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Course } from '../../types';
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  Award,
  PlayCircle,
  CheckCircle2,
  Download,
  Sparkles,
  ChevronRight,
  User,
} from 'lucide-react';

export const CourseCatalogView: React.FC = () => {
  const {
    courses,
    domains,
    enrollments,
    enrollCourse,
    setSelectedCourseForPlayer,
    currentUser,
    language,
    t,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    'all',
    'Financial Accounting',
    'Financial Control',
    'Financial Planning',
    'Business Performance',
    'Leadership',
    'Strategic Business Partnership',
  ];

  const filteredCourses = courses.filter((c) => {
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || c.difficulty === selectedDifficulty;
    const matchesSearch =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.titleVi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>USALI Academic & Operational Curriculum</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.courses.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {t.courses.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
            {courses.length} {language === 'vi' ? 'Khóa học chuyên sâu' : 'Accredited Courses'}
          </span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.common.search}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
            >
              <option value="all">{language === 'vi' ? 'Tất cả cấp độ' : 'All Levels'}</option>
              <option value="Foundation">Foundation</option>
              <option value="Operational">Operational</option>
              <option value="Advanced">Advanced</option>
              <option value="Strategic">Strategic</option>
            </select>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#0A192F] text-amber-300 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat === 'all' ? (language === 'vi' ? 'Tất cả phân loại' : 'All Categories') : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const enrollment = enrollments.find(
            (e) => e.userId === currentUser.id && e.courseId === course.id
          );
          const isEnrolled = !!enrollment;
          const isCompleted = enrollment?.status === 'completed';

          return (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-slate-200/80 hover:border-amber-400/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Thumbnail */}
                <div className="relative h-44 overflow-hidden bg-slate-900">
                  <img
                    src={course.thumbnail}
                    alt={course.titleVi}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0A192F]/90 text-amber-300 border border-amber-400/30">
                      {course.code}
                    </span>
                    {course.isMandatoryForFC && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-600 text-white">
                        {t.courses.mandatoryBadge}
                      </span>
                    )}
                  </div>

                  <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-slate-200">
                    {course.durationHours} {language === 'vi' ? 'giờ' : 'hrs'}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{course.category}</span>
                    <span className="font-bold text-amber-600">{course.difficulty}</span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {language === 'vi' ? course.titleVi : course.titleEn}
                  </h3>

                  {/* Instructor */}
                  <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{course.instructorName}</span>
                  </div>

                  {/* Progress bar if enrolled */}
                  {isEnrolled && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-500">{language === 'vi' ? 'Tiến độ' : 'Progress'}</span>
                        <span className="text-amber-600">{enrollment.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all"
                          style={{ width: `${enrollment.progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 pt-0">
                {isEnrolled ? (
                  <button
                    onClick={() => setSelectedCourseForPlayer(course)}
                    className="w-full py-2.5 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-300 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <PlayCircle className="w-4 h-4 text-amber-400" />
                    <span>
                      {isCompleted
                        ? (language === 'vi' ? 'Xem lại bài học' : 'Review Course')
                        : (language === 'vi' ? 'Tiếp tục bài học' : 'Continue Course')}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      enrollCourse(course.id);
                      setSelectedCourseForPlayer(course);
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{t.courses.enroll}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
