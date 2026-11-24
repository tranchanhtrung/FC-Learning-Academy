import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Course } from '../../types';
import {
  getCourseSyllabus,
  generateCourseSyllabusMarkdown,
  generateMasterSyllabusMarkdown,
} from '../../data/courseSyllabi';
import { LessonMaterialsManager } from './LessonMaterialsManager';
import { doesMaterialMatchCourse, findCourseMatch } from '../../lib/lessonMaterials';
import { getCoursePriceVnd, formatVnd } from '../../lib/coursePricing';
import { COURSES } from '../../data/initialData';
import {
  Search,
  BookOpen,
  Clock,
  Award,
  PlayCircle,
  CheckCircle2,
  Download,
  ChevronRight,
  ChevronDown,
  User,
  FileSpreadsheet,
  Layers,
  Briefcase,
  Check,
  FileText,
  GraduationCap,
  LayoutGrid,
  ListTree,
  Target,
  Upload,
  Paperclip,
  CreditCard,
  Sparkles,
} from 'lucide-react';

type CatalogViewMode = 'cards' | 'syllabus_matrix' | 'lesson_materials';

function downloadMarkdownFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const CourseCatalogView: React.FC = () => {
  const {
    courses,
    domains,
    competencies,
    enrollments,
    enrollCourse,
    hasCourseAccess,
    hasAllAccess,
    startCourseCheckout,
    setSelectedCourseForPlayer,
    setSelectedLessonIdForPlayer,
    currentUser,
    language,
    t,
    lessonMaterials,
    hasPermission,
    activeTab,
  } = useApp();

  const isVi = language === 'vi';
  const isMyLearningTab = activeTab === 'myLearning';
  const canManageLessonMaterials = hasPermission('manage_lesson_materials');
  const [viewMode, setViewMode] = useState<CatalogViewMode>('cards');
  const [showEnrolledOnly, setShowEnrolledOnly] = useState<boolean>(isMyLearningTab);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  React.useEffect(() => {
    setShowEnrolledOnly(activeTab === 'myLearning');
  }, [activeTab]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<Course | null>(null);
  const [expandedMatrixCourseIds, setExpandedMatrixCourseIds] = useState<Record<string, boolean>>({
    course_01: true,
  });
  const [failedThumbnails, setFailedThumbnails] = useState<Record<string, boolean>>({});

  const myEnrolledCourseIds = useMemo(() => {
    const set = new Set<string>();
    enrollments
      .filter((e) => e.userId === currentUser.id)
      .forEach((e) => {
        set.add(e.courseId);
        const matched = findCourseMatch(courses, e.courseId, COURSES);
        if (matched) set.add(matched.id);
      });
    return set;
  }, [courses, currentUser.id, enrollments]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courses.filter((c) => {
      if (showEnrolledOnly && !myEnrolledCourseIds.has(c.id)) return false;
      const matchesDomain = selectedDomain === 'all' || c.domainId === selectedDomain;
      const matchesDifficulty = selectedDifficulty === 'all' || c.difficulty === selectedDifficulty;
      if (!q) return matchesDomain && matchesDifficulty;

      const syl = getCourseSyllabus(c);
      const syllabusText = syl
        ? [
            syl.overviewVi,
            syl.overviewEn,
            ...syl.competencyCodes,
            ...syl.sessions.flatMap((s) => [s.titleVi, s.titleEn, ...s.topicsVi, ...s.topicsEn]),
          ]
            .join(' ')
            .toLowerCase()
        : '';

      const matchesSearch =
        c.code.toLowerCase().includes(q) ||
        c.titleVi.toLowerCase().includes(q) ||
        c.titleEn.toLowerCase().includes(q) ||
        c.instructorName.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        syllabusText.includes(q);
      return matchesDomain && matchesDifficulty && matchesSearch;
    });
  }, [courses, selectedDomain, selectedDifficulty, searchQuery, showEnrolledOnly, myEnrolledCourseIds]);

  const totalCurriculumHours = useMemo(
    () => courses.reduce((sum, c) => sum + Number(c.durationHours || 0), 0),
    [courses]
  );

  const totalSyllabusSessions = useMemo(
    () =>
      courses.reduce((sum, c) => {
        const syl = getCourseSyllabus(c);
        return sum + (syl?.sessions.length || c.modules.length || 0);
      }, 0),
    [courses]
  );

  const toggleMatrixCourse = (courseId: string) => {
    setExpandedMatrixCourseIds((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  const expandAllFiltered = () => {
    const next: Record<string, boolean> = {};
    filteredCourses.forEach((c) => {
      next[c.id] = true;
    });
    setExpandedMatrixCourseIds(next);
  };

  const collapseAllFiltered = () => {
    setExpandedMatrixCourseIds({});
  };

  const handleDownloadMasterSyllabus = () => {
    const md = generateMasterSyllabusMarkdown(courses, domains, language);
    downloadMarkdownFile(`FC_Learning_Academy_Master_Syllabus_18_Courses_${language.toUpperCase()}.md`, md);
  };

  const handleDownloadSingleSyllabus = (course: Course) => {
    const dom = domains.find((d) => d.id === course.domainId);
    const md = generateCourseSyllabusMarkdown(course, dom, language);
    downloadMarkdownFile(`${course.code}_Syllabus_${language.toUpperCase()}.md`, md);
  };

  const handleEnrollOrOpenCourse = async (course: Course, lessonId: string | null = null) => {
    if (hasCourseAccess(course)) {
      await enrollCourse(course.id);
      setSelectedLessonIdForPlayer(lessonId);
      setSelectedCourseForPlayer(course);
    } else {
      startCourseCheckout(course, lessonId);
    }
  };

  const handleOpenCourseAtSession = (course: Course, sessionNumber: number) => {
    const mod = course.modules[Math.max(0, sessionNumber - 1)] || course.modules[0];
    setSelectedCourseForDetail(null);
    void handleEnrollOrOpenCourse(course, mod?.id || null);
  };

  const detailSyllabus = selectedCourseForDetail ? getCourseSyllabus(selectedCourseForDetail) : undefined;
  const detailDomain = selectedCourseForDetail
    ? domains.find((d) => d.id === selectedCourseForDetail.domainId)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>
              {isVi
                ? 'Chương Trình Đào Tạo Chuẩn Quốc Tế Marriott · IHG · Accor · Hilton'
                : 'Global Hospitality Standards · Marriott · IHG · Accor · Hilton'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t.courses.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            {isVi
              ? 'Hệ thống 18 khóa học và Syllabus chi tiết chuẩn hóa theo 6 miền năng lực cốt lõi. Mỗi khóa học tích hợp đề cương từng học phần, công thức USALI/IFRS, bài lab Excel, Case Study và bài tập OJT thực tế.'
              : '18 structured hospitality finance courses with complete multi-session syllabi aligned to all 6 core competency domains, integrating USALI/IFRS formulas, Excel labs, real case studies, and OJT projects.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                {isVi ? 'Khóa học' : 'Courses'}
              </span>
              <span className="text-lg font-extrabold text-slate-900 font-mono tabular-nums">
                {courses.length}
              </span>
            </div>
            <div className="px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                {isVi ? 'Miền / Học phần' : 'Domains / Units'}
              </span>
              <span className="text-lg font-extrabold text-blue-800 font-mono tabular-nums">
                {domains.length} · {totalSyllabusSessions}
              </span>
            </div>
            <div className="px-3.5 py-2.5 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">
                {isVi ? 'Thời lượng' : 'Total Hours'}
              </span>
              <span className="text-lg font-extrabold text-amber-900 font-mono tabular-nums">
                {totalCurriculumHours}h
              </span>
            </div>
          </div>

          <button
            onClick={handleDownloadMasterSyllabus}
            className="px-4 py-3 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>{isVi ? 'Tải Master Syllabus (.md)' : 'Export Master Syllabus (.md)'}</span>
          </button>
        </div>
      </div>

      {/* View Mode & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Segmented View Mode Switch */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start overflow-x-auto max-w-full">
            <button
              onClick={() => {
                setViewMode('cards');
                setShowEnrolledOnly(false);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'cards' && !showEnrolledOnly
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
              <span>{isVi ? `Tất Cả Khóa Học (${courses.length})` : `All Courses (${courses.length})`}</span>
            </button>
            <button
              onClick={() => {
                setViewMode('cards');
                setShowEnrolledOnly(true);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'cards' && showEnrolledOnly
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isVi ? `Khóa Tôi Đang Học (${myEnrolledCourseIds.size})` : `My Learning (${myEnrolledCourseIds.size})`}</span>
            </button>
            <button
              onClick={() => setViewMode('syllabus_matrix')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'syllabus_matrix'
                  ? 'bg-[#0A192F] text-amber-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>
                {isVi
                  ? 'Khung Syllabus 6 Miền (18 Khóa)'
                  : 'Master Syllabus (6 Domains · 18 Courses)'}
              </span>
            </button>
            {canManageLessonMaterials && (
              <button
                onClick={() => setViewMode('lesson_materials')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === 'lesson_materials'
                    ? 'bg-[#0A192F] text-amber-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {isVi
                    ? `Quản Lý Học Liệu Bài Học (${lessonMaterials.length})`
                    : `Lesson Materials (${lessonMaterials.length})`}
                </span>
              </button>
            )}
          </div>

          {/* Search & Difficulty */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 md:justify-end">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isVi
                    ? 'Tìm mã khóa học, chủ đề syllabus, năng lực...'
                    : 'Search course code, syllabus topic, competency...'
                }
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-slate-50/50"
              />
            </div>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none shrink-0"
            >
              <option value="all">
                {isVi ? 'Tất cả cấp độ thành thạo' : 'All Difficulty Levels'}
              </option>
              <option value="Foundation">L1: Foundation</option>
              <option value="Operational">L2: Operational</option>
              <option value="Advanced">L3: Advanced</option>
              <option value="Strategic">L4: Strategic (FC)</option>
            </select>
          </div>
        </div>

        {/* 6 Core Competency Domains Filter Bar */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedDomain('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              selectedDomain === 'all'
                ? 'bg-[#0A192F] text-amber-300 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {isVi ? `Tất Cả (${courses.length})` : `All (${courses.length})`}
          </button>
          {domains.map((dom) => {
            const count = courses.filter((c) => c.domainId === dom.id).length;
            const isSelected = selectedDomain === dom.id;
            return (
              <button
                key={dom.id}
                onClick={() => setSelectedDomain(dom.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{dom.code}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    isSelected ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================================= */}
      {/* VIEW 1: COURSE CARDS GRID                                         */}
      {/* ================================================================= */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const enrollment = enrollments.find((e) => {
              if (e.userId !== currentUser.id) return false;
              if (e.courseId === course.id) return true;
              const matched = findCourseMatch(courses, e.courseId, COURSES);
              return Boolean(matched && matched.code === course.code);
            });
            const isEnrolled = !!enrollment;
            const isCompleted = enrollment?.status === 'completed';
            const isUnlocked = hasCourseAccess(course);
            const coursePriceVnd = getCoursePriceVnd(course);
            const syllabus = getCourseSyllabus(course);
            const domainObj = domains.find((d) => d.id === course.domainId);
            const imgFailed = !!failedThumbnails[course.id];

            return (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-amber-400 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Thumbnail Header with clean fallback */}
                  <div className="relative h-44 overflow-hidden bg-gradient-to-br from-[#0A192F] via-[#13294B] to-slate-900">
                    {!imgFailed && course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={isVi ? course.titleVi : course.titleEn}
                        onError={() =>
                          setFailedThumbnails((prev) => ({ ...prev, [course.id]: true }))
                        }
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-start justify-end p-5 bg-gradient-to-br from-[#0A192F] via-slate-900 to-blue-950">
                        <span className="text-3xl font-black tracking-tight text-amber-400/25 font-mono">
                          {course.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-300 line-clamp-1">
                          {domainObj ? (isVi ? domainObj.nameVi : domainObj.nameEn) : course.category}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-[#0A192F]/90 text-amber-300 border border-amber-400/40 font-mono">
                        {course.code}
                      </span>
                      {course.isMandatoryForFC && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600/95 text-white">
                          {isVi ? 'Bắt Buộc FC' : 'Mandatory FC'}
                        </span>
                      )}
                    </div>

                    <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-900/90 border border-slate-700/80 text-amber-300 font-mono tabular-nums">
                      {isEnrolled
                        ? isVi
                          ? 'Đã Ghi Danh'
                          : 'Enrolled'
                        : isUnlocked
                        ? hasAllAccess
                          ? 'Pro All-Access'
                          : isVi
                          ? 'Đã Mở Khóa'
                          : 'Unlocked'
                        : formatVnd(coursePriceVnd)}
                    </span>

                    <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900/85 text-slate-100 font-mono tabular-nums">
                      {course.durationHours}h
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 gap-2">
                      <span className="font-semibold text-slate-600 truncate">
                        {domainObj?.code || course.category} · {course.difficulty}
                      </span>
                      <span className="font-mono text-slate-500 shrink-0 tabular-nums">
                        Pass {course.passingScore}%
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                      {isVi ? course.titleVi : course.titleEn}
                    </h3>

                    {syllabus && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {isVi ? syllabus.overviewVi : syllabus.overviewEn}
                      </p>
                    )}

                    {/* Clean Unboxed Metadata Line */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        {syllabus ? `${syllabus.sessions.length} ${isVi ? 'Học phần' : 'Sessions'}` : `${course.modules.length} Modules`}
                      </span>
                      {syllabus && (
                        <span className="font-mono text-amber-700 font-semibold">
                          {syllabus.competencyCodes.join(' · ')}
                        </span>
                      )}
                      {course.materials && course.materials.length > 0 && (
                        <span className="text-emerald-700 font-medium">Excel Lab</span>
                      )}
                      {(() => {
                        const uploadedCnt = lessonMaterials.filter((m) =>
                          doesMaterialMatchCourse(m, course)
                        ).length;
                        return uploadedCnt > 0 ? (
                          <span className="inline-flex items-center gap-1 text-blue-700 font-semibold font-mono tabular-nums">
                            <Paperclip className="w-3 h-3" />
                            {uploadedCnt} {isVi ? 'Tài liệu bài học' : 'Files'}
                          </span>
                        ) : null;
                      })()}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {course.instructorName} · {course.instructorTitle}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedCourseForDetail(course)}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer flex items-center gap-1 whitespace-nowrap"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Xem Syllabus' : 'View Syllabus'}</span>
                    </button>

                    <button
                      onClick={() => void handleEnrollOrOpenCourse(course)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                          : isEnrolled
                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                          : isUnlocked
                          ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                          : 'bg-[#0A192F] hover:bg-[#1E293B] text-amber-400'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Xem Lại' : 'Review'}</span>
                        </>
                      ) : isEnrolled ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>
                            {isVi ? 'Tiếp Tục' : 'Continue'} ({enrollment.progressPercent}%)
                          </span>
                        </>
                      ) : isUnlocked ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Vào Học Ngay' : 'Start Learning'}</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
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
      )}

      {/* ================================================================= */}
      {/* VIEW 2: MASTER SYLLABUS MATRIX (6 DOMAINS · 18 COURSES)           */}
      {/* ================================================================= */}
      {viewMode === 'syllabus_matrix' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-600">
              {isVi
                ? `Đang hiển thị ${filteredCourses.length} / ${courses.length} khóa học theo cấu trúc 6 miền năng lực.`
                : `Showing ${filteredCourses.length} of ${courses.length} courses organized across 6 competency domains.`}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAllFiltered}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
              >
                {isVi ? 'Mở tất cả Syllabus' : 'Expand All Syllabi'}
              </button>
              <button
                onClick={collapseAllFiltered}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
              >
                {isVi ? 'Thu gọn' : 'Collapse All'}
              </button>
            </div>
          </div>

          {domains.map((domain) => {
            const domainCourses = filteredCourses
              .filter((c) => c.domainId === domain.id)
              .sort((a, b) => a.code.localeCompare(b.code));
            if (domainCourses.length === 0) return null;

            const domainHours = domainCourses.reduce((sum, c) => sum + c.durationHours, 0);
            const domainComps = competencies.filter((cp) => cp.domainId === domain.id);

            return (
              <section
                key={domain.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
              >
                {/* Domain Header */}
                <div className="px-6 py-5 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-700">
                      <span>{domain.code}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600">
                        {domainCourses.length} {isVi ? 'Khóa học' : 'Courses'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-amber-700 tabular-nums">{domainHours}h</span>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {isVi ? domain.nameVi : domain.nameEn}
                    </h3>
                    <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                      {isVi ? domain.descriptionVi : domain.descriptionEn}
                    </p>
                  </div>

                  <div className="text-xs text-slate-500 shrink-0 md:text-right space-y-1">
                    <div className="font-semibold text-slate-700">
                      {isVi ? 'Năng lực trọng tâm:' : 'Mapped Competencies:'}
                    </div>
                    <div className="font-mono text-[11px] text-slate-600">
                      {domainComps.map((cp) => cp.code).join(' · ') || 'USALI Core'}
                    </div>
                  </div>
                </div>

                {/* Courses Accordion inside Domain */}
                <div className="divide-y divide-slate-200">
                  {domainCourses.map((course) => {
                    const syllabus = getCourseSyllabus(course);
                    const isExpanded = !!expandedMatrixCourseIds[course.id];
                    const enrollment = enrollments.find((e) => {
                      if (e.userId !== currentUser.id) return false;
                      if (e.courseId === course.id) return true;
                      const matched = findCourseMatch(courses, e.courseId, COURSES);
                      return Boolean(matched && matched.code === course.code);
                    });

                    return (
                      <div key={course.id} className="transition-colors">
                        {/* Course Summary Row */}
                        <div className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70">
                          <button
                            onClick={() => toggleMatrixCourse(course.id)}
                            className="flex items-start gap-3 text-left flex-1 cursor-pointer"
                          >
                            <div className="mt-0.5 text-slate-400">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-blue-700" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-mono font-extrabold text-slate-900 bg-amber-100 px-2 py-0.5 rounded">
                                  {course.code}
                                </span>
                                <span className="font-bold text-slate-900 text-sm">
                                  {isVi ? course.titleVi : course.titleEn}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span>{course.difficulty}</span>
                                <span>·</span>
                                <span className="font-mono tabular-nums">{course.durationHours}h</span>
                                <span>·</span>
                                <span>
                                  {syllabus ? `${syllabus.sessions.length} ${isVi ? 'học phần' : 'sessions'}` : `${course.modules.length} modules`}
                                </span>
                                <span>·</span>
                                <span className="font-mono tabular-nums">
                                  Pass {course.passingScore}%
                                </span>
                                {syllabus && (
                                  <>
                                    <span>·</span>
                                    <span className="font-mono text-blue-700 font-semibold">
                                      {syllabus.competencyCodes.join(', ')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-2 shrink-0 pl-7 lg:pl-0">
                            <button
                              onClick={() => handleDownloadSingleSyllabus(course)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                              title={isVi ? 'Tải đề cương Markdown' : 'Download Syllabus Markdown'}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>.MD</span>
                            </button>
                            <button
                              onClick={() => setSelectedCourseForDetail(course)}
                              className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-bold cursor-pointer whitespace-nowrap"
                            >
                              {isVi ? 'Mở Toàn Bộ Syllabus' : 'Full Modal'}
                            </button>
                            <button
                              onClick={() => void handleEnrollOrOpenCourse(course)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                            >
                              {hasCourseAccess(course) ? (
                                <>
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>{isVi ? 'Vào Học' : 'Launch'}</span>
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>
                                    {isVi ? 'Ghi Danh' : 'Enroll'} · {formatVnd(getCoursePriceVnd(course))}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Inline Detailed Syllabus */}
                        {isExpanded && syllabus && (
                          <div className="px-6 pb-6 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-5">
                            {/* Overview + Assessment Weight Strip */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-2">
                              <div className="lg:col-span-2 space-y-2">
                                <p className="text-xs text-slate-700 leading-relaxed">
                                  {isVi ? syllabus.overviewVi : syllabus.overviewEn}
                                </p>
                                <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                                  <div>
                                    <strong className="text-slate-800">
                                      {isVi ? 'Đối tượng mục tiêu:' : 'Target Audience:'}
                                    </strong>{' '}
                                    {isVi ? syllabus.targetAudienceVi : syllabus.targetAudienceEn}
                                  </div>
                                  <div>
                                    <strong className="text-slate-800">
                                      {isVi ? 'Hình thức & Thời lượng:' : 'Format & Hours:'}
                                    </strong>{' '}
                                    {isVi ? syllabus.deliveryFormatVi : syllabus.deliveryFormatEn}
                                  </div>
                                  <div>
                                    <strong className="text-slate-800">
                                      {isVi ? 'Chuẩn bị trước khóa (Pre-work):' : 'Pre-work:'}
                                    </strong>{' '}
                                    {isVi ? syllabus.preWorkVi : syllabus.preWorkEn}
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                                <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                                  {isVi ? 'Tỷ Trọng Đánh Giá (100%)' : 'Assessment Weighting (100%)'}
                                </div>
                                <div className="space-y-1.5 font-mono text-xs tabular-nums">
                                  <div className="flex justify-between">
                                    <span className="font-sans text-slate-600">
                                      {isVi ? 'Bài thi kiến thức (Quiz)' : 'Knowledge Exam'}
                                    </span>
                                    <span className="font-bold text-slate-900">
                                      {syllabus.assessmentBreakdown.quizWeight}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-sans text-slate-600">
                                      {isVi ? 'Tình huống (Case Study)' : 'Case Study'}
                                    </span>
                                    <span className="font-bold text-slate-900">
                                      {syllabus.assessmentBreakdown.caseStudyWeight}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-sans text-slate-600">
                                      {isVi ? 'Thực hành OJT' : 'OJT Practical'}
                                    </span>
                                    <span className="font-bold text-slate-900">
                                      {syllabus.assessmentBreakdown.practicalOjtWeight}%
                                    </span>
                                  </div>
                                  <div className="pt-1.5 border-t border-slate-100 flex justify-between font-bold text-emerald-700">
                                    <span className="font-sans">
                                      {isVi ? 'Điểm đạt tối thiểu' : 'Passing Score'}
                                    </span>
                                    <span>&ge; {syllabus.assessmentBreakdown.passingScore}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Session-by-Session Grid */}
                            <div className="space-y-3">
                              <div className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                                {isVi
                                  ? `Cấu Trúc ${syllabus.sessions.length} Học Phần Chi Tiết`
                                  : `${syllabus.sessions.length}-Session Detailed Outline`}
                              </div>

                              <div className="space-y-3">
                                {syllabus.sessions.map((session) => (
                                  <div
                                    key={session.sessionNumber}
                                    className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                                        {isVi ? session.titleVi : session.titleEn}
                                      </h4>
                                      <div className="flex items-center gap-2.5 shrink-0">
                                        <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                                          {session.durationHours}h · {session.format}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenCourseAtSession(course, session.sessionNumber)}
                                          className="px-2.5 py-1 rounded-lg bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                        >
                                          <BookOpen className="w-3 h-3" />
                                          <span>{isVi ? 'Xem bài học' : 'View Lesson'}</span>
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                      <div className="space-y-1.5">
                                        <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                                          {isVi ? 'Nội dung chuyên đề' : 'Core Topics'}
                                        </div>
                                        <ul className="space-y-1 text-slate-600 list-disc pl-4">
                                          {(isVi ? session.topicsVi : session.topicsEn).map((tp, i) => (
                                            <li key={i}>{tp}</li>
                                          ))}
                                        </ul>
                                      </div>

                                      <div className="space-y-2">
                                        <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                                          {isVi ? 'Thực hành Lab & Sản phẩm đầu ra' : 'Practical Lab & Deliverables'}
                                        </div>
                                        <p className="text-slate-600">
                                          {isVi ? session.practicalLabVi : session.practicalLabEn}
                                        </p>
                                        <div className="text-[11px] font-semibold text-emerald-800">
                                          &rarr; {(isVi ? session.deliverablesVi : session.deliverablesEn).join(' · ')}
                                        </div>
                                      </div>
                                    </div>

                                    {session.keyStandardsAndFormulas.length > 0 && (
                                      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 space-y-1">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                          {isVi ? 'Công thức & Chuẩn mực Trọng tâm' : 'Key Standards & Formulas'}
                                        </div>
                                        {session.keyStandardsAndFormulas.map((formula, idx) => (
                                          <div
                                            key={idx}
                                            className="font-mono text-[11px] text-slate-800"
                                          >
                                            {formula}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 3: PER-LESSON LEARNING MATERIALS MANAGER (FIRESTORE)         */}
      {/* ================================================================= */}
      {viewMode === 'lesson_materials' && canManageLessonMaterials && (
        <LessonMaterialsManager
          initialCourseId={filteredCourses[0]?.id || courses[0]?.id}
        />
      )}

      {/* ================================================================= */}
      {/* MODAL: FULL COURSE SYLLABUS & CURRICULUM DETAILS                  */}
      {/* ================================================================= */}
      {selectedCourseForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-[#0A192F] text-amber-400 font-mono">
                    {selectedCourseForDetail.code}
                  </span>
                  {detailDomain && (
                    <span className="font-semibold text-blue-700">
                      {detailDomain.code} — {isVi ? detailDomain.nameVi : detailDomain.nameEn}
                    </span>
                  )}
                  <span className="text-slate-300">·</span>
                  <span className="font-mono tabular-nums text-slate-600">
                    {selectedCourseForDetail.durationHours}h · {selectedCourseForDetail.difficulty} · Pass{' '}
                    {selectedCourseForDetail.passingScore}%
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {isVi ? selectedCourseForDetail.titleVi : selectedCourseForDetail.titleEn}
                </h3>
                <p className="text-xs text-slate-500">
                  {isVi ? 'Giảng viên:' : 'Faculty:'}{' '}
                  <strong className="text-slate-800">{selectedCourseForDetail.instructorName}</strong> (
                  {selectedCourseForDetail.instructorTitle})
                </p>
              </div>
              <button
                onClick={() => setSelectedCourseForDetail(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer leading-none px-1"
              >
                &times;
              </button>
            </div>

            {/* Section 1: Overview, Competencies, Pre-Work & Assessment Weighting */}
            {detailSyllabus && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                    {isVi ? '1. Tổng Quan Đề Cương (Course Syllabus Overview)' : '1. Course Syllabus Overview'}
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {isVi ? detailSyllabus.overviewVi : detailSyllabus.overviewEn}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                        {isVi ? 'Đối Tượng Học Viên' : 'Target Audience'}
                      </span>
                      <span className="text-slate-800 font-medium">
                        {isVi ? detailSyllabus.targetAudienceVi : detailSyllabus.targetAudienceEn}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                        {isVi ? 'Lộ Trình Nghề Nghiệp & Năng Lực' : 'Career Track & Competencies'}
                      </span>
                      <span className="text-slate-800 font-medium block">
                        {isVi ? detailSyllabus.careerTrackStageVi : detailSyllabus.careerTrackStageEn}
                      </span>
                      <span className="font-mono text-[11px] text-blue-700 font-bold">
                        {detailSyllabus.competencyCodes.join(' · ')}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 bg-amber-50/60 border border-amber-200 rounded-xl p-3">
                    <strong className="text-amber-900">
                      {isVi ? 'Chuẩn bị trước khóa (Pre-work): ' : 'Pre-work: '}
                    </strong>
                    {isVi ? detailSyllabus.preWorkVi : detailSyllabus.preWorkEn}
                  </div>
                </div>

                {/* Assessment Weight Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isVi ? 'Cấu Trúc Đánh Giá' : 'Assessment Weights'}</span>
                  </div>
                  <div className="space-y-2 font-mono tabular-nums">
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-600">
                        {isVi ? 'Thi kiến thức (Quiz)' : 'Knowledge Quiz'}
                      </span>
                      <span className="font-bold text-slate-900">
                        {detailSyllabus.assessmentBreakdown.quizWeight}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-600">
                        {isVi ? 'Tình huống thực tế' : 'Case Study'}
                      </span>
                      <span className="font-bold text-slate-900">
                        {detailSyllabus.assessmentBreakdown.caseStudyWeight}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-600">
                        {isVi ? 'Thực hành OJT' : 'Practical OJT'}
                      </span>
                      <span className="font-bold text-slate-900">
                        {detailSyllabus.assessmentBreakdown.practicalOjtWeight}%
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-emerald-700">
                      <span className="font-sans">{isVi ? 'Chuẩn Đạt' : 'Pass Score'}</span>
                      <span>&ge; {detailSyllabus.assessmentBreakdown.passingScore}%</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div>
                      <strong>{isVi ? 'Giảng dạy & Lab:' : 'Contact:'}</strong>{' '}
                      <span className="font-mono">{detailSyllabus.totalContactHours}h</span> ·{' '}
                      <strong>{isVi ? 'Tự học:' : 'Self-study:'}</strong>{' '}
                      <span className="font-mono">{detailSyllabus.totalSelfStudyHours}h</span>
                    </div>
                    <div>
                      <strong>{isVi ? 'Điều kiện tiên quyết:' : 'Prerequisites:'}</strong>{' '}
                      {(isVi
                        ? selectedCourseForDetail.prerequisites
                        : selectedCourseForDetail.prerequisitesEn || selectedCourseForDetail.prerequisites
                      ).length > 0
                        ? (isVi
                            ? selectedCourseForDetail.prerequisites
                            : selectedCourseForDetail.prerequisitesEn || selectedCourseForDetail.prerequisites
                          ).join(', ')
                        : isVi
                        ? 'Không yêu cầu'
                        : 'None'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Learning Objectives */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                {isVi ? '2. Mục Tiêu Học Tập Cốt Lõi (Learning Objectives)' : '2. Core Learning Objectives'}
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700">
                {(isVi
                  ? selectedCourseForDetail.learningObjectivesVi
                  : selectedCourseForDetail.learningObjectivesEn
                ).map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 3: Detailed Session-by-Session Syllabus */}
            {detailSyllabus && (
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  {isVi
                    ? `3. Đề Cương Chi Tiết Từng Học Phần (${detailSyllabus.sessions.length} Học Phần · ${selectedCourseForDetail.durationHours} Giờ)`
                    : `3. Detailed Session-by-Session Syllabus (${detailSyllabus.sessions.length} Sessions · ${selectedCourseForDetail.durationHours}h)`}
                </h4>

                <div className="space-y-3">
                  {detailSyllabus.sessions.map((session) => (
                    <div
                      key={session.sessionNumber}
                      className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <span className="font-bold text-sm text-slate-900">
                          {isVi ? session.titleVi : session.titleEn}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded tabular-nums">
                            {session.durationHours}h · {session.format}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenCourseAtSession(selectedCourseForDetail, session.sessionNumber)
                            }
                            className="px-2.5 py-1 rounded-lg bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{isVi ? 'Xem bài học' : 'View Lesson'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1.5">
                          <div className="font-bold text-slate-700">
                            {isVi ? 'Chuẩn đầu ra & Nội dung:' : 'Outcomes & Topics:'}
                          </div>
                          <ul className="space-y-1 text-slate-600 list-disc pl-4">
                            {(isVi ? session.topicsVi : session.topicsEn).map((tp, i) => (
                              <li key={i}>{tp}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1.5">
                          <div className="font-bold text-slate-700">
                            {isVi ? 'Thực hành Excel / Case Lab:' : 'Practical Lab & Exercise:'}
                          </div>
                          <p className="text-slate-600 leading-relaxed">
                            {isVi ? session.practicalLabVi : session.practicalLabEn}
                          </p>
                          <div className="text-[11px] font-bold text-emerald-700 pt-1">
                            {isVi ? 'Sản phẩm nộp:' : 'Deliverables:'}{' '}
                            {(isVi ? session.deliverablesVi : session.deliverablesEn).join(' · ')}
                          </div>
                        </div>
                      </div>

                      {session.keyStandardsAndFormulas.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">
                            {isVi ? 'Công thức & Chuẩn mực áp dụng:' : 'Standards & Formulas:'}
                          </span>
                          {session.keyStandardsAndFormulas.map((f, idx) => (
                            <div key={idx} className="font-mono text-[11px] text-slate-800">
                              {f}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Capstone, Case Study, OJT & References */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedCourseForDetail.caseStudy && (
                <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">
                    {isVi ? 'Nghiên Cứu Tình Huống Thực Tế' : 'Signature Case Study'}
                  </span>
                  <p className="font-bold text-xs text-slate-900">
                    {isVi
                      ? selectedCourseForDetail.caseStudy.titleVi
                      : selectedCourseForDetail.caseStudy.titleEn}
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {isVi
                      ? selectedCourseForDetail.caseStudy.scenarioVi
                      : selectedCourseForDetail.caseStudy.scenarioEn}
                  </p>
                </div>
              )}

              {detailSyllabus && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    {isVi ? 'Sản Phẩm Tốt Nghiệp & Tài Liệu Tham Khảo' : 'Capstone & References'}
                  </span>
                  <p className="font-semibold text-slate-800">
                    {isVi ? detailSyllabus.capstoneDeliverableVi : detailSyllabus.capstoneDeliverableEn}
                  </p>
                  {selectedCourseForDetail.practicalAssignmentTitle && (
                    <div className="text-[11px] text-indigo-700 font-semibold">
                      OJT:{' '}
                      {isVi
                        ? selectedCourseForDetail.practicalAssignmentTitle
                        : selectedCourseForDetail.practicalAssignmentTitleEn ||
                          selectedCourseForDetail.practicalAssignmentTitle}
                    </div>
                  )}
                  <ul className="text-[11px] text-slate-500 list-disc pl-4 space-y-0.5">
                    {detailSyllabus.referencesAndStandards.map((ref, idx) => (
                      <li key={idx}>{ref}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => handleDownloadSingleSyllabus(selectedCourseForDetail)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isVi ? 'Tải Syllabus Khóa Học (.md)' : 'Download Course Syllabus (.md)'}</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedCourseForDetail(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  {isVi ? 'Đóng' : 'Close'}
                </button>
                <button
                  onClick={() => {
                    const course = selectedCourseForDetail;
                    setSelectedCourseForDetail(null);
                    void handleEnrollOrOpenCourse(course);
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {hasCourseAccess(selectedCourseForDetail) ? (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      <span>{isVi ? 'Bắt Đầu Khóa Học Ngay' : 'Start Course Now'}</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>
                        {isVi
                          ? `Ghi Danh & Thanh Toán (${formatVnd(getCoursePriceVnd(selectedCourseForDetail))})`
                          : `Enroll & Pay (${formatVnd(getCoursePriceVnd(selectedCourseForDetail))})`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
