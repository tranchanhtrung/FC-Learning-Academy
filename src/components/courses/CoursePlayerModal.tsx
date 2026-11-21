import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Course, CourseModule, LessonMaterialDoc } from '../../types';
import { getCourseSyllabus, generateCourseSyllabusMarkdown } from '../../data/courseSyllabi';
import {
  downloadLessonMaterial,
  doesMaterialMatchCourse,
  findCourseMatch,
  sortLessonMaterialsAsc,
} from '../../lib/lessonMaterials';
import { COURSES } from '../../data/initialData';
import { LessonMaterialsManager } from './LessonMaterialsManager';
import {
  LessonMaterialContentRenderer,
  LessonMaterialPreviewModal,
} from './LessonMaterialPreviewModal';
import {
  X,
  CheckCircle2,
  Download,
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Layers,
  Briefcase,
  AlertCircle,
  FileCheck,
  FileText,
  Target,
  Upload,
  Eye,
  ExternalLink,
  Paperclip,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CoursePlayerModalProps {
  course: Course | null;
  initialLessonId?: string | null;
  onClose: () => void;
  onStartQuiz: (course: Course) => void;
}

export const CoursePlayerModal: React.FC<CoursePlayerModalProps> = ({
  course: rawCourse,
  initialLessonId,
  onClose,
  onStartQuiz,
}) => {
  const {
    courses,
    enrollments,
    updateCourseProgress,
    currentUser,
    language,
    t,
    setActiveTab,
    domains,
    ojtAssignments,
    lessonMaterials,
    hasPermission,
    canAccessRoute,
  } = useApp();
  const course = useMemo(() => {
    if (!rawCourse) return null;
    return findCourseMatch(courses, rawCourse.id, [rawCourse]) ||
      findCourseMatch(courses, rawCourse.code, [rawCourse]) ||
      rawCourse;
  }, [rawCourse, courses]);
  const [activeTabSub, setActiveTabSub] = useState<'syllabus' | 'modules' | 'materials' | 'case_study' | 'assignment'>('modules');
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [showLessonUploadDrawer, setShowLessonUploadDrawer] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<LessonMaterialDoc | null>(null);
  const [selectedEmbeddedMatId, setSelectedEmbeddedMatId] = useState<string | null>(null);
  const [showInlineReader, setShowInlineReader] = useState<boolean>(true);

  useEffect(() => {
    let resolvedIdx = 0;
    if (course && initialLessonId) {
      const foundIdx = course.modules.findIndex((m) => m.id === initialLessonId);
      if (foundIdx >= 0) resolvedIdx = foundIdx;
    }
    setActiveModuleIndex(resolvedIdx);
    setActiveTabSub('modules');
    setShowLessonUploadDrawer(false);
    setPreviewDoc(null);
    setSelectedEmbeddedMatId(null);
    setShowInlineReader(true);
  }, [course?.id, initialLessonId]);

  useEffect(() => {
    setSelectedEmbeddedMatId(null);
  }, [activeModuleIndex]);

  if (!course) return null;

  const isVi = language === 'vi';
  const canManageLessonMaterials = hasPermission('manage_lesson_materials');
  const courseLessonMaterials = sortLessonMaterialsAsc(
    lessonMaterials.filter((m) => doesMaterialMatchCourse(m, course))
  );
  const syllabus = getCourseSyllabus(course);
  const domainObj = domains.find((d) => d.id === course.domainId);
  const matchingSession =
    syllabus?.sessions[Math.min(activeModuleIndex, Math.max(0, (syllabus?.sessions.length || 1) - 1))];

  const handleDownloadSyllabusMd = () => {
    const md = generateCourseSyllabusMarkdown(course, domainObj, language);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${course.code}_Syllabus_${language.toUpperCase()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const enrollment = enrollments.find((e) => {
    if (e.userId !== currentUser.id) return false;
    if (e.courseId === course.id) return true;
    const matched = findCourseMatch(courses, e.courseId, COURSES);
    return Boolean(matched && matched.code === course.code);
  });

  const activeModule: CourseModule = course.modules[activeModuleIndex] || course.modules[0];
  const isModuleCompleted = enrollment?.completedModules.includes(activeModule?.id);
  const activeLessonMaterials = courseLessonMaterials.filter(
    (m) => m.lessonId === activeModule?.id || m.lessonOrder === activeModuleIndex + 1
  );
  const activeEmbeddedMaterial =
    activeLessonMaterials.find((m) => m.id === selectedEmbeddedMatId) ||
    activeLessonMaterials[0] ||
    null;

  const handleMarkCompleted = () => {
    if (activeModule) {
      updateCourseProgress(course.id, activeModule.id);
      if (activeModuleIndex < course.modules.length - 1) {
        setActiveModuleIndex(activeModuleIndex + 1);
      }
    }
  };

  const handleDownloadExcel = (fileName?: string) => {
    // Generate realistic Excel / CSV template file for financial models
    const sampleContent = `FC LEARNING ACADEMY - WORKING FINANCIAL MODEL\nCourse: ${course.code} - ${course.titleEn}\nAuthor: ${course.instructorName} (${course.instructorTitle})\nStandard: USALI 11th & 12th Edition\nGenerated for: ${currentUser.name} (${currentUser.position})\n\nPeriod,Occupancy,ADR,RevPAR,Total Revenue,Rooms Expense,F&B Cost,GOP,GOP Margin,Flow-Through\nMonth 1,74.5%,$185,$137.83,$1420000,$240000,$285000,$520000,36.6%,-\nMonth 2,82.0%,$192,$157.44,$1620000,$260000,$310000,$645000,39.8%,62.5%\nMonth 3,85.0%,$198,$168.30,$1730000,$272000,$325000,$715000,41.3%,63.6%\nMonth 4,88.5%,$205,$181.43,$1880000,$285000,$340000,$805000,42.8%,60.0%`;

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const downloadName = fileName
      ? `${course.code}_${fileName.replace(/\s+/g, '_')}.csv`
      : `${course.code}_Working_Model_${currentUser.name.replace(/\s+/g, '_')}.csv`;
    link.setAttribute('download', downloadName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[94vh] sm:h-[92vh] flex flex-col shadow-2xl border border-slate-700/50 overflow-hidden my-auto">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[#0A192F] text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-amber-400 text-slate-950 font-mono shrink-0">
              {course.code}
            </span>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white truncate">
                {language === 'vi' ? course.titleVi : course.titleEn}
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-2 truncate">
                <span className="truncate">{course.instructorName} &bull; {course.instructorTitle}</span>
                <span className="hidden sm:inline text-amber-300 font-semibold shrink-0">• {course.difficulty} Level</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-slate-400">{language === 'vi' ? 'Tiến độ:' : 'Progress:'}</span>
              <span className="font-bold text-amber-400 font-mono">{enrollment?.progressPercent || 0}%</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-6 py-2 bg-slate-100 border-b border-slate-200 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTabSub('modules')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTabSub === 'modules'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>{language === 'vi' ? 'Nội Dung Bài Học' : 'Lessons & Video'}</span>
          </button>

          <button
            onClick={() => setActiveTabSub('syllabus')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTabSub === 'syllabus'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>{language === 'vi' ? 'Đề Cương (Syllabus)' : 'Full Syllabus'}</span>
            {syllabus && (
              <span className="font-mono text-[10px] text-slate-500">({syllabus.sessions.length})</span>
            )}
          </button>

          <button
            onClick={() => setActiveTabSub('materials')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTabSub === 'materials'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === 'vi' ? 'Tài Liệu & File Excel Mẫu' : 'Working Materials & Excel'}</span>
            <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-1.5 rounded-full tabular-nums">
              {(course.materials?.length || 0) + courseLessonMaterials.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabSub('case_study')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTabSub === 'case_study'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>{language === 'vi' ? 'Nghiên Cứu Tình Huống' : 'Case Study'}</span>
          </button>

          <button
            onClick={() => setActiveTabSub('assignment')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTabSub === 'assignment'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
            <span>{language === 'vi' ? 'Bài Tập Thực Tế (OJT)' : 'Practical Assignment'}</span>
          </button>

          <div className="ml-auto">
            <button
              onClick={() => {
                onClose();
                onStartQuiz(course);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Award className="w-3.5 h-3.5" />
              <span>{t.quiz.startExam}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50">
          {/* TAB 1: LESSON VIEWER & LEARNING CONTENT */}
          {activeTabSub === 'modules' && (
            <>
              {/* Main Lesson Study Stage (70%) */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5">
                {/* Active Lesson Navigation & Control Header */}
                <div className="bg-[#0A192F] text-white rounded-2xl p-5 shadow-sm border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="text-[11px] font-mono text-amber-400 flex flex-wrap items-center gap-x-2">
                        <span className="font-bold uppercase">
                          {isVi ? `Bài ${activeModuleIndex + 1} / ${course.modules.length}` : `Lesson ${activeModuleIndex + 1} / ${course.modules.length}`}
                        </span>
                        <span aria-hidden="true">&middot;</span>
                        <span>
                          {Math.round(((activeModule?.durationMinutes || 60) / 60) * 10) / 10}h ({activeModule?.durationMinutes || 60} {isVi ? 'phút' : 'min'})
                        </span>
                        <span aria-hidden="true">&middot;</span>
                        <span className="uppercase">{activeModule?.type}</span>
                        <span aria-hidden="true">&middot;</span>
                        <span className={isModuleCompleted ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                          {isModuleCompleted
                            ? isVi ? 'Đã hoàn thành' : 'Completed'
                            : isVi ? 'Đang học' : 'In Progress'}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                        {isVi ? activeModule?.titleVi : activeModule?.titleEn}
                      </h3>
                      <p className="text-xs text-slate-300">
                        {course.instructorName} &bull; {course.instructorTitle}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={activeModuleIndex <= 0}
                        onClick={() => setActiveModuleIndex((idx) => Math.max(0, idx - 1))}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>{isVi ? 'Bài trước' : 'Prev'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={activeModuleIndex >= course.modules.length - 1}
                        onClick={() =>
                          setActiveModuleIndex((idx) => Math.min(course.modules.length - 1, idx + 1))
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <span>{isVi ? 'Bài tiếp' : 'Next'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadExcel()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>{isVi ? 'Tải Mô Hình Excel' : 'Download Excel Model'}</span>
                      </button>

                      {canManageLessonMaterials && activeModule && (
                        <button
                          type="button"
                          onClick={() => setShowLessonUploadDrawer((prev) => !prev)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {showLessonUploadDrawer
                              ? isVi ? 'Ẩn Upload' : 'Hide Upload'
                              : isVi ? '+ Upload Học Liệu' : '+ Upload Material'}
                          </span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleMarkCompleted}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                        isModuleCompleted
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isModuleCompleted
                          ? isVi ? 'Đã hoàn thành bài này' : 'Completed'
                          : isVi ? 'Đánh dấu hoàn thành & Tiếp tục' : 'Mark Done & Next'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Upload Drawer (Authorized Roles Only) */}
                {showLessonUploadDrawer && activeModule && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <LessonMaterialsManager
                      initialCourseId={course.id}
                      initialLessonId={activeModule.id}
                      compact
                      lockSelection
                    />
                  </div>
                )}

                {/* Embedded Lesson Material Reader (DOCX / XLSX / PDF / Video / Links) */}
                {activeLessonMaterials.length > 0 && activeEmbeddedMaterial && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-4 h-4 text-blue-700 shrink-0" />
                        <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider truncate">
                          {isVi
                            ? `Nội Dung & Tài Liệu Đính Kèm Bài ${activeModuleIndex + 1} (${activeLessonMaterials.length})`
                            : `Lesson ${activeModuleIndex + 1} Attached Content (${activeLessonMaterials.length})`}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(activeEmbeddedMaterial)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-blue-700" />
                          <span>{isVi ? 'Xem Toàn Màn Hình' : 'Fullscreen Reader'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadLessonMaterial(activeEmbeddedMaterial)}
                          className="px-3 py-1.5 rounded-lg bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          {activeEmbeddedMaterial.storageMode === 'external_link' ? (
                            <ExternalLink className="w-3.5 h-3.5" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{isVi ? 'Tải Xuống' : 'Download'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowInlineReader((prev) => !prev)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          {showInlineReader ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>{isVi ? 'Thu gọn' : 'Collapse'}</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>{isVi ? 'Mở đọc' : 'Read'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Multi-file selector if lesson has >1 material */}
                    {activeLessonMaterials.length > 1 && (
                      <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
                        {activeLessonMaterials.map((mat) => {
                          const isSelected = activeEmbeddedMaterial.id === mat.id;
                          return (
                            <button
                              key={mat.id}
                              type="button"
                              onClick={() => {
                                setSelectedEmbeddedMatId(mat.id);
                                setShowInlineReader(true);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-[#0A192F] text-amber-400'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isVi ? mat.titleVi : mat.titleEn}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Active Material Metadata Bar */}
                    <div className="px-5 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="font-bold text-slate-900 truncate">
                        {isVi ? activeEmbeddedMaterial.titleVi : activeEmbeddedMaterial.titleEn}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 tabular-nums">
                        <span className="uppercase font-bold text-blue-700">{activeEmbeddedMaterial.materialType}</span>
                        <span aria-hidden="true">&middot;</span>
                        <span>{activeEmbeddedMaterial.fileSizeLabel}</span>
                        {activeEmbeddedMaterial.fileName && (
                          <>
                            <span aria-hidden="true">&middot;</span>
                            <span className="truncate max-w-[200px]">{activeEmbeddedMaterial.fileName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Embedded Reader Viewport */}
                    {showInlineReader && (
                      <div className="bg-slate-100">
                        <LessonMaterialContentRenderer
                          material={activeEmbeddedMaterial}
                          isVi={isVi}
                          embedded
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Complete Structured Lesson Content from Syllabus */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 space-y-5 shadow-xs">
                  {matchingSession ? (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                            {isVi ? 'Giáo Trình Chi Tiết Bài Học' : 'Detailed Lesson Curriculum Guide'}
                          </span>
                          <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                            {isVi ? matchingSession.titleVi : matchingSession.titleEn}
                          </h4>
                        </div>
                        <span className="font-mono text-xs text-slate-600 font-bold shrink-0 tabular-nums">
                          {matchingSession.durationHours}h · {matchingSession.format}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Learning Outcomes */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <h5 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">
                            {isVi ? '1. Chuẩn Đầu Ra Bài Học' : '1. Lesson Learning Outcomes'}
                          </h5>
                          <ul className="space-y-1.5 text-slate-700">
                            {(isVi ? matchingSession.learningOutcomesVi : matchingSession.learningOutcomesEn).map(
                              (lo, idx) => (
                                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                  <span>{lo}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>

                        {/* Key Topics */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <h5 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">
                            {isVi ? '2. Nội Dung Kiến Thức Trọng Tâm' : '2. Core Knowledge Topics'}
                          </h5>
                          <ul className="space-y-1.5 text-slate-700 list-disc pl-4 leading-relaxed">
                            {(isVi ? matchingSession.topicsVi : matchingSession.topicsEn).map((tp, idx) => (
                              <li key={idx}>{tp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Formulas & Standards */}
                      {matchingSession.keyStandardsAndFormulas.length > 0 && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <h5 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">
                            {isVi ? '3. Chuẩn Mực USALI / IFRS & Công Thức Trọng Tâm' : '3. USALI / IFRS Standards & Formulas'}
                          </h5>
                          <div className="space-y-1.5">
                            {matchingSession.keyStandardsAndFormulas.map((f, idx) => (
                              <div
                                key={idx}
                                className="font-mono text-xs text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200/80"
                              >
                                {f}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practical Lab & Deliverables */}
                      <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2 text-xs">
                        <h5 className="font-extrabold text-emerald-950 uppercase text-[11px] tracking-wider">
                          {isVi ? '4. Bài Thực Hành Lab & Sản Phẩm Đầu Ra' : '4. Practical Lab & Deliverables'}
                        </h5>
                        <p className="text-slate-800 leading-relaxed">
                          {isVi ? matchingSession.practicalLabVi : matchingSession.practicalLabEn}
                        </p>
                        <div className="pt-1 font-bold text-emerald-800">
                          {isVi ? 'Sản phẩm đầu ra:' : 'Deliverables:'}{' '}
                          {(isVi ? matchingSession.deliverablesVi : matchingSession.deliverablesEn).join(' · ')}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* No Custom Material Notice (Quiet, Clear) */}
                  {activeLessonMaterials.length === 0 && (
                    <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {isVi
                          ? 'Bài học này hiện chưa có tệp học liệu đính kèm riêng (Word/PDF/Excel).'
                          : 'No separate uploaded files (Word/PDF/Excel) attached to this lesson yet.'}
                      </span>
                      {canManageLessonMaterials && (
                        <button
                          type="button"
                          onClick={() => setShowLessonUploadDrawer(true)}
                          className="font-bold text-blue-700 hover:underline cursor-pointer"
                        >
                          {isVi ? '+ Upload học liệu cho bài này' : '+ Upload material'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Learning Objectives Reminder */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider block">
                      {isVi ? 'Mục tiêu cốt lõi của khóa học:' : 'Core Course Learning Objectives:'}
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {(language === 'vi' ? course.learningObjectivesVi : course.learningObjectivesEn).map((obj, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Sidebar Modules List (30%) — capped height on mobile/tablet so main lesson pane stays readable */}
              <div className="w-full lg:w-80 max-h-56 lg:max-h-none bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                    {t.courses.modules} ({course.modules.length})
                  </h4>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {course.durationHours} {language === 'vi' ? 'giờ' : 'hrs'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {course.modules.map((mod, idx) => {
                    const isSelected = activeModuleIndex === idx;
                    const isDone = enrollment?.completedModules.includes(mod.id);
                    const modMatCount = courseLessonMaterials.filter(
                      (m) => m.lessonId === mod.id || m.lessonOrder === idx + 1
                    ).length;

                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setActiveModuleIndex(idx)}
                        className={`w-full p-4 text-left transition-colors flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50/80 ring-1 ring-inset ring-amber-300'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                                isSelected
                                  ? 'border-amber-600 bg-amber-500 text-slate-950'
                                  : 'border-slate-400 text-slate-500'
                              }`}
                            >
                              {idx + 1}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className={`font-bold text-xs leading-snug ${isSelected ? 'text-slate-950 font-extrabold' : 'text-slate-700'}`}>
                            {language === 'vi' ? mod.titleVi : mod.titleEn}
                          </h5>
                          <span className="text-[10px] text-slate-500 mt-1 block font-mono tabular-nums">
                            {Math.round((mod.durationMinutes / 60) * 10) / 10}h ({mod.durationMinutes} {isVi ? 'phút' : 'min'}) &bull; {mod.type}
                            {modMatCount > 0 ? ` · ${modMatCount} ${isVi ? 'học liệu' : 'files'}` : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 1B: FULL COURSE SYLLABUS */}
          {activeTabSub === 'syllabus' && (
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6 max-w-4xl mx-auto w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <span className="text-[11px] font-mono font-bold text-blue-700 uppercase tracking-wider">
                    {course.code} · {domainObj?.code || course.category} · {course.durationHours}h
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                    {isVi ? 'Đề Cương Chi Tiết Khóa Học (Official Syllabus)' : 'Official Course Syllabus'}
                  </h3>
                </div>
                <button
                  onClick={handleDownloadSyllabusMd}
                  className="px-4 py-2 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 font-bold text-xs flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Tải Syllabus (.md)' : 'Download Syllabus (.md)'}</span>
                </button>
              </div>

              {syllabus ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                      <p className="text-slate-700 leading-relaxed">
                        {isVi ? syllabus.overviewVi : syllabus.overviewEn}
                      </p>
                      <div className="text-slate-600 pt-1 space-y-1">
                        <div>
                          <strong className="text-slate-800">{isVi ? 'Đối tượng:' : 'Audience:'}</strong>{' '}
                          {isVi ? syllabus.targetAudienceVi : syllabus.targetAudienceEn}
                        </div>
                        <div>
                          <strong className="text-slate-800">{isVi ? 'Năng lực:' : 'Competencies:'}</strong>{' '}
                          <span className="font-mono text-blue-700 font-bold">
                            {syllabus.competencyCodes.join(' · ')}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-800">{isVi ? 'Pre-work:' : 'Pre-work:'}</strong>{' '}
                          {isVi ? syllabus.preWorkVi : syllabus.preWorkEn}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isVi ? 'Đánh giá' : 'Grading'}</span>
                      </div>
                      <div className="space-y-1.5 font-mono tabular-nums pt-1">
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-600">Quiz</span>
                          <span className="font-bold">{syllabus.assessmentBreakdown.quizWeight}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-600">Case Study</span>
                          <span className="font-bold">{syllabus.assessmentBreakdown.caseStudyWeight}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-sans text-slate-600">OJT Project</span>
                          <span className="font-bold">{syllabus.assessmentBreakdown.practicalOjtWeight}%</span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-100 flex justify-between font-bold text-emerald-700">
                          <span className="font-sans">{isVi ? 'Điểm Đạt' : 'Pass'}</span>
                          <span>&ge; {syllabus.assessmentBreakdown.passingScore}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {syllabus.sessions.map((s) => (
                      <div key={s.sessionNumber} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <h4 className="font-bold text-sm text-slate-900">
                            {isVi ? s.titleVi : s.titleEn}
                          </h4>
                          <span className="font-mono text-xs text-blue-700 font-semibold shrink-0 tabular-nums">
                            {s.durationHours}h · {s.format}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <div className="font-bold text-slate-700 mb-1">
                              {isVi ? 'Nội dung chính:' : 'Key Topics:'}
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-slate-600">
                              {(isVi ? s.topicsVi : s.topicsEn).map((tp, i) => (
                                <li key={i}>{tp}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-1.5">
                            <div className="font-bold text-slate-700">
                              {isVi ? 'Bài thực hành Excel / Lab:' : 'Practical Lab:'}
                            </div>
                            <p className="text-slate-600">{isVi ? s.practicalLabVi : s.practicalLabEn}</p>
                            <div className="font-semibold text-emerald-700">
                              {(isVi ? s.deliverablesVi : s.deliverablesEn).join(' · ')}
                            </div>
                          </div>
                        </div>
                        {s.keyStandardsAndFormulas.length > 0 && (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1">
                            {s.keyStandardsAndFormulas.map((f, idx) => (
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
              ) : (
                <div className="text-xs text-slate-500">
                  {isVi ? 'Đang cập nhật đề cương chi tiết.' : 'Detailed syllabus updating.'}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOWNLOADABLE MATERIALS & EXCEL WORKING MODELS */}
          {activeTabSub === 'materials' && (
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-8">
              {/* Firestore Per-Lesson Materials Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {isVi
                        ? `Học Liệu Theo Từng Bài Học (${courseLessonMaterials.length})`
                        : `Per-Lesson Uploaded Materials (${courseLessonMaterials.length})`}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hasPermission('manage_lesson_materials')
                        ? isVi
                          ? 'Tài liệu PDF, Excel, Slide và đường dẫn được upload riêng cho từng bài học trong khóa và lưu trên Firestore (/lessonMaterials).'
                          : 'PDF, Excel, Slide, and resource links attached directly to specific lessons in Firestore (/lessonMaterials).'
                        : isVi
                        ? 'Tài liệu PDF, Excel, Slide và đường dẫn học tập đính kèm riêng cho từng bài học.'
                        : 'PDF, Excel, Slide, and reference links attached to each lesson in this course.'}
                    </p>
                  </div>
                </div>

                <LessonMaterialsManager
                  initialCourseId={course.id}
                  initialLessonId={activeModule?.id}
                  compact
                />
              </div>

              {/* Default Working Excel Templates */}
              <div className="space-y-4 pt-2 border-t border-slate-200">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {isVi ? 'File Excel Mẫu & Biểu Mẫu Thực Hành Chuẩn Khóa Học' : 'Course Standard Working Templates & Excel Models'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {isVi
                      ? 'Toàn bộ các biểu mẫu chuẩn USALI 11th & 12th Edition, checklist khóa sổ, công thức tính toán Flow-Through và thẩm định CAPEX được thiết kế sẵn.'
                      : 'USALI 11th & 12th Edition templates, month-end closing checklists, Flow-Through models, and CAPEX underwriting workbooks ready for immediate hotel deployment.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(course.materials || []).map((mat) => {
                    const matTitle = isVi ? mat.title : mat.titleEn || mat.title;
                    return (
                      <div
                        key={mat.id}
                        className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-400 transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 font-mono">
                              {mat.type.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{mat.fileSize}</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 leading-snug">
                            {matTitle}
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {isVi
                              ? mat.descriptionVi || mat.descriptionEn
                              : mat.descriptionEn || mat.descriptionVi}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDownloadExcel(matTitle)}
                          className="w-full py-2 bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Tải Về Máy Ngay' : 'Download Template'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HOSPITALITY REAL CASE STUDY */}
          {activeTabSub === 'case_study' && (
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6 max-w-4xl mx-auto">
              {course.caseStudy ? (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                      {isVi ? 'Tình Huống Thực Tế Chuẩn Tập Đoàn Quốc Tế' : 'International Hospitality Group Case Study'}
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                      {isVi ? course.caseStudy.titleVi : course.caseStudy.titleEn}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">
                      {isVi ? 'Bối cảnh khách sạn:' : 'Property Context:'}{' '}
                      {isVi
                        ? course.caseStudy.propertyContext
                        : course.caseStudy.propertyContextEn || course.caseStudy.propertyContext}
                    </p>
                  </div>

                  {/* Scenario Narrative */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      {isVi ? '1. Bối cảnh & Diễn biến sự việc:' : '1. Operational Context & Scenario:'}
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {isVi ? course.caseStudy.scenarioVi : course.caseStudy.scenarioEn}
                    </p>
                  </div>

                  {/* Key Challenge */}
                  <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                    <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>{isVi ? '2. Thách thức cốt lõi đặt ra cho Financial Controller:' : '2. Core Financial Controller Challenge:'}</span>
                    </span>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      {isVi ? course.caseStudy.keyChallengeVi : course.caseStudy.keyChallengeEn}
                    </p>
                  </div>

                  {/* Suggested Solution & Action Plan */}
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{isVi ? '3. Khuyến nghị giải pháp & Kế hoạch hành động chuẩn mực:' : '3. Recommended Solution & Action Plan:'}</span>
                    </span>
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      {isVi ? course.caseStudy.suggestedSolutionVi : course.caseStudy.suggestedSolutionEn}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  {isVi ? 'Không có dữ liệu tình huống cho khóa học này.' : 'No case study available for this course.'}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRACTICAL ASSIGNMENT (OJT) */}
          {activeTabSub === 'assignment' && (() => {
            const matchedOjt = ojtAssignments.find(
              (o) =>
                o.id === course.practicalAssignmentId ||
                (course.practicalAssignmentTitle &&
                  course.practicalAssignmentTitle.startsWith(o.code))
            );
            const deliverablesList = matchedOjt
              ? isVi
                ? matchedOjt.deliverablesVi
                : matchedOjt.deliverablesEn
              : isVi
              ? [
                  'File Excel tính toán chi tiết mô hình theo chuẩn mực USALI',
                  'Bản giải trình báo cáo phân tích chuyên đề gửi Giám đốc Tài chính',
                  'Kế hoạch hành động áp dụng trực tiếp tại khách sạn',
                ]
              : [
                  'USALI-compliant Excel calculation & reconciliation workbook',
                  'Executive critique & recommendation memo for the Financial Controller',
                  'Property-level corrective action plan ready for GM review',
                ];

            return (
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6 max-w-4xl mx-auto">
                <div className="border-b border-slate-200 pb-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                    {isVi ? 'Bài Tập Thực Hành Tại Khách Sạn (On-the-Job Training)' : 'On-the-Job Training (OJT) Practical Assignment'}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                    {(isVi
                      ? course.practicalAssignmentTitle || matchedOjt?.titleVi
                      : course.practicalAssignmentTitleEn || matchedOjt?.titleEn || course.practicalAssignmentTitle) ||
                      (isVi ? 'Thực Hành Tác Nghiệp Khách Sạn Chuyên Sâu' : 'Hospitality Finance Practical Assignment')}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {matchedOjt
                      ? isVi
                        ? matchedOjt.descriptionVi
                        : matchedOjt.descriptionEn
                      : isVi
                      ? 'Bài tập yêu cầu người học áp dụng trực tiếp kiến thức đã học vào số liệu vận hành thực tế tại khách sạn và nộp bài để Giám đốc Tài chính chấm điểm thẩm định.'
                      : 'Learners apply course concepts directly to live hotel operational data and submit deliverables for Cluster Financial Controller rubric grading.'}
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      {isVi ? 'Sản phẩm đầu ra cần nộp (Deliverables):' : 'Required Deliverables:'}
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {deliverablesList.map((deliv, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <FileCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <span>{deliv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {isVi
                        ? 'Được đánh giá theo thang điểm 100 bởi Cluster Financial Controller'
                        : 'Graded on a 100-point rubric by the Cluster Financial Controller'}
                    </span>
                    {canAccessRoute('ojtProjects') && (
                      <button
                        onClick={() => {
                          onClose();
                          setActiveTab('ojtProjects');
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>{isVi ? 'Mở Phân Hệ Nộp Bài OJT' : 'Open OJT Submission Hub'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Unified Lesson Material Reader Modal inside CoursePlayerModal */}
      <LessonMaterialPreviewModal
        material={previewDoc}
        materials={activeLessonMaterials.length > 0 ? activeLessonMaterials : courseLessonMaterials}
        isVi={isVi}
        onSelectMaterial={setPreviewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
};
