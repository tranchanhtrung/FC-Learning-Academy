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
  FileSpreadsheet,
  Layers,
  Briefcase,
  Sliders,
  Check,
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

  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<Course | null>(null);

  const filteredCourses = courses.filter((c) => {
    const matchesDomain = selectedDomain === 'all' || c.domainId === selectedDomain;
    const matchesDifficulty = selectedDifficulty === 'all' || c.difficulty === selectedDifficulty;
    const matchesSearch =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.titleVi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDomain && matchesDifficulty && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Chương Trình Đào Tạo Chuẩn Quốc Tế Marriott, IHG, Accor, Hilton</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t.courses.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Hệ thống 18 khóa học chuyên sâu chuẩn hóa theo 6 miền năng lực cốt lõi. Mỗi khóa học đều tích hợp mục tiêu học tập, bài giảng video, file Excel mẫu chuẩn USALI, tình huống thực tế và bài tập OJT.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Tổng Khóa Học:</span>
            <span className="text-xl font-extrabold text-amber-900 font-mono">{courses.length} Khóa</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
            <span className="text-[10px] font-bold text-blue-800 uppercase block">Miền Năng Lực:</span>
            <span className="text-xl font-extrabold text-blue-900 font-mono">6 Domains</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm mã khóa học, tên bài học, giảng viên..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none"
            >
              <option value="all">{language === 'vi' ? 'Tất cả cấp độ thành thạo' : 'All Difficulty Levels'}</option>
              <option value="Foundation">Level 1: Foundation (Cơ bản)</option>
              <option value="Operational">Level 2: Operational (Tác nghiệp)</option>
              <option value="Advanced">Level 3: Advanced (Chuyên sâu)</option>
              <option value="Strategic">Level 4: Strategic (Chiến lược FC)</option>
            </select>
          </div>
        </div>

        {/* 6 Core Competency Domains Pills */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedDomain('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedDomain === 'all'
                ? 'bg-[#0A192F] text-amber-300 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Tất Cả ({courses.length})
          </button>
          {domains.map((dom) => {
            const count = courses.filter((c) => c.domainId === dom.id).length;
            const isSelected = selectedDomain === dom.id;
            return (
              <button
                key={dom.id}
                onClick={() => setSelectedDomain(dom.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{dom.code}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
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
              className="bg-white rounded-2xl border border-slate-200/80 hover:border-amber-400 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Thumbnail Header */}
                <div className="relative h-44 overflow-hidden bg-slate-950">
                  <img
                    src={course.thumbnail}
                    alt={course.titleVi}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent"></div>

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0A192F]/90 text-amber-300 border border-amber-400/40 font-mono">
                      {course.code}
                    </span>
                    {course.isMandatoryForFC && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-600 text-white">
                        Bắt Buộc Cho FC
                      </span>
                    )}
                  </div>

                  <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-slate-200 font-mono">
                    {course.durationHours} {language === 'vi' ? 'giờ' : 'hrs'}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">{course.category}</span>
                    <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {course.difficulty}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                    {language === 'vi' ? course.titleVi : course.titleEn}
                  </h3>

                  {/* Instructor */}
                  <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{course.instructorName} &bull; {course.instructorTitle}</span>
                  </div>

                  {/* Course Features Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-slate-500" />
                      {course.modules.length} Modules
                    </span>
                    {course.materials && course.materials.length > 0 && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                        File Excel Mẫu
                      </span>
                    )}
                    {course.caseStudy && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-amber-600" />
                        Case Study
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-5 pt-0">
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedCourseForDetail(course)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Xem Chi Tiết &rarr;
                  </button>

                  <button
                    onClick={() => {
                      if (!isEnrolled) {
                        enrollCourse(course.id);
                      }
                      setSelectedCourseForPlayer(course);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      isCompleted
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : isEnrolled
                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                        : 'bg-[#0A192F] hover:bg-[#1E293B] text-amber-400'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Xem Lại Bài Học</span>
                      </>
                    ) : isEnrolled ? (
                      <>
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Tiếp Tục Học ({enrollment.progressPercent}%)</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>{t.courses.enroll}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: COURSE SYLLABUS & CURRICULUM DETAILS */}
      {selectedCourseForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[85vh] overflow-y-auto my-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-[#0A192F] text-amber-400 font-mono">
                  {selectedCourseForDetail.code}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                  {language === 'vi' ? selectedCourseForDetail.titleVi : selectedCourseForDetail.titleEn}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Giảng viên: <strong>{selectedCourseForDetail.instructorName}</strong> ({selectedCourseForDetail.instructorTitle})
                </p>
              </div>
              <button
                onClick={() => setSelectedCourseForDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Learning Objectives */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                Mục Tiêu Học Tập (Learning Objectives):
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {(language === 'vi' ? selectedCourseForDetail.learningObjectivesVi : selectedCourseForDetail.learningObjectivesEn).map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Course Modules Syllabus */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                Cấu Trúc Các Phần Học ({selectedCourseForDetail.modules.length} Modules):
              </h4>
              <div className="space-y-2">
                {selectedCourseForDetail.modules.map((mod, idx) => (
                  <div key={mod.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">
                        {language === 'vi' ? mod.titleVi : mod.titleEn}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {mod.durationMinutes} min ({mod.type})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Case Study Preview */}
            {selectedCourseForDetail.caseStudy && (
              <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">
                  Nghiên Cứu Tình Huống Thực Tế:
                </span>
                <p className="font-bold text-xs text-slate-900">
                  {selectedCourseForDetail.caseStudy.titleVi}
                </p>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  {selectedCourseForDetail.caseStudy.scenarioVi}
                </p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedCourseForDetail(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  const course = selectedCourseForDetail;
                  setSelectedCourseForDetail(null);
                  enrollCourse(course.id);
                  setSelectedCourseForPlayer(course);
                }}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Bắt Đầu Khóa Học Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
