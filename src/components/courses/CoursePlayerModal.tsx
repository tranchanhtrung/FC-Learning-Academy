import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Course, CourseModule, LessonMaterialDoc } from '../../types';
import { getCourseSyllabus, generateCourseSyllabusMarkdown } from '../../data/courseSyllabi';
import { downloadLessonMaterial, canPreviewInline, getMaterialBlobUrl } from '../../lib/lessonMaterials';
import { LessonMaterialsManager } from './LessonMaterialsManager';
import {
  X,
  Play,
  CheckCircle2,
  Download,
  Award,
  BookOpen,
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
} from 'lucide-react';

interface CoursePlayerModalProps {
  course: Course | null;
  onClose: () => void;
  onStartQuiz: (course: Course) => void;
}

export const CoursePlayerModal: React.FC<CoursePlayerModalProps> = ({
  course,
  onClose,
  onStartQuiz,
}) => {
  const {
    enrollments,
    updateCourseProgress,
    currentUser,
    language,
    t,
    setActiveTab,
    domains,
    lessonMaterials,
    hasPermission,
    canAccessRoute,
  } = useApp();
  const [activeTabSub, setActiveTabSub] = useState<'syllabus' | 'modules' | 'materials' | 'case_study' | 'assignment'>('modules');
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [thumbError, setThumbError] = useState<boolean>(false);
  const [showLessonUploadDrawer, setShowLessonUploadDrawer] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<LessonMaterialDoc | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);

  useEffect(() => {
    setActiveModuleIndex(0);
    setActiveTabSub('modules');
    setThumbError(false);
    setShowLessonUploadDrawer(false);
    setPreviewDoc(null);
  }, [course?.id]);

  useEffect(() => {
    if (!previewDoc) {
      setPreviewUrl(null);
      setPreviewText(null);
      return;
    }
    let revoked: string | null = null;
    const url = getMaterialBlobUrl(previewDoc);
    setPreviewUrl(url);
    if (url && previewDoc.storageMode === 'firestore_inline') revoked = url;

    const mime = (previewDoc.mimeType || '').toLowerCase();
    const ext = (previewDoc.fileName || '').split('.').pop()?.toLowerCase() || '';
    if (
      previewDoc.storageMode === 'firestore_inline' &&
      previewDoc.inlineBase64 &&
      (mime.startsWith('text/') || ['txt', 'md', 'csv'].includes(ext))
    ) {
      try {
        const bin = atob(previewDoc.inlineBase64);
        const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
        setPreviewText(new TextDecoder('utf-8').decode(bytes));
      } catch {
        setPreviewText(null);
      }
    } else {
      setPreviewText(null);
    }

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [previewDoc]);

  if (!course) return null;

  const isVi = language === 'vi';
  const canManageLessonMaterials = hasPermission('manage_lesson_materials');
  const courseLessonMaterials = lessonMaterials.filter((m) => m.courseId === course.id);
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

  const enrollment = enrollments.find(
    (e) => e.userId === currentUser.id && e.courseId === course.id
  );

  const activeModule: CourseModule = course.modules[activeModuleIndex] || course.modules[0];
  const isModuleCompleted = enrollment?.completedModules.includes(activeModule?.id);
  const activeLessonMaterials = courseLessonMaterials.filter(
    (m) => m.lessonId === activeModule?.id
  );

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[92vh] flex flex-col shadow-2xl border border-slate-700/50 overflow-hidden my-auto">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#0A192F] text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-amber-400 text-slate-950 font-mono">
              {course.code}
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white line-clamp-1">
                {language === 'vi' ? course.titleVi : course.titleEn}
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{course.instructorName} &bull; {course.instructorTitle}</span>
                <span className="hidden sm:inline text-amber-300 font-semibold">• {course.difficulty} Level</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
          {/* TAB 1: MODULES & VIDEO PLAYER */}
          {activeTabSub === 'modules' && (
            <>
              {/* Main Stage (70%) */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* Simulated Video Player */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0A192F] via-slate-900 to-blue-950 shadow-md border border-slate-800 aspect-video flex items-center justify-center group">
                  {!thumbError && course.thumbnail && (
                    <img
                      src={course.thumbnail}
                      alt={isVi ? course.titleVi : course.titleEn}
                      onError={() => setThumbError(true)}
                      className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-45 transition-opacity"
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 cursor-pointer">
                      <Play className="w-7 h-7 fill-slate-950 ml-1" />
                    </div>
                    <div>
                      <h4 className="text-white font-extrabold text-base">
                        {language === 'vi' ? activeModule?.titleVi : activeModule?.titleEn}
                      </h4>
                      <p className="text-amber-300 text-xs mt-0.5 font-medium">
                        {course.instructorName} &bull; USALI Masterclass Video (4K Ultra HD)
                      </p>
                    </div>
                  </div>

                  {/* Video Player Controls Mock */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 flex items-center justify-between text-xs text-white">
                    <div className="flex items-center gap-3">
                      <Play className="w-4 h-4 fill-white cursor-pointer" />
                      <span className="text-[11px] font-mono text-slate-300">14:20 / {activeModule?.durationMinutes || 45}:00</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800">1080p HD</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800">1.0x</span>
                    </div>
                  </div>
                </div>

                {/* Lesson Notes & Downloadables */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        {isVi ? 'Phần' : 'Module'} {activeModuleIndex + 1} / {course.modules.length} • {activeModule?.type.toUpperCase()}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                        {language === 'vi' ? activeModule?.titleVi : activeModule?.titleEn}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadExcel()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>{isVi ? 'Tải Mô Hình Excel' : 'Download Excel Model'}</span>
                      </button>

                      <button
                        onClick={handleMarkCompleted}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isModuleCompleted
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isModuleCompleted ? (language === 'vi' ? 'Đã hoàn thành' : 'Completed') : (language === 'vi' ? 'Đánh dấu hoàn thành' : 'Mark as Done')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Matching Syllabus Session Context */}
                  {matchingSession && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                          {isVi ? 'Trọng tâm Đề cương Học phần tương ứng:' : 'Aligned Syllabus Session Focus:'}
                        </span>
                        <span className="font-mono text-[11px] text-blue-700 font-bold">
                          {matchingSession.durationHours}h · {matchingSession.format}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {isVi ? matchingSession.titleVi : matchingSession.titleEn}
                      </p>
                      <p className="text-slate-600">
                        <strong>{isVi ? 'Thực hành Lab:' : 'Lab:'}</strong>{' '}
                        {isVi ? matchingSession.practicalLabVi : matchingSession.practicalLabEn}
                      </p>
                      {matchingSession.keyStandardsAndFormulas.length > 0 && (
                        <div className="pt-1 space-y-0.5">
                          {matchingSession.keyStandardsAndFormulas.map((f, idx) => (
                            <div key={idx} className="font-mono text-[11px] text-slate-800">
                              {f}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Per-Lesson Uploaded Materials (Firestore) */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5 text-blue-700" />
                        <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider">
                          {isVi
                            ? `Học Liệu Riêng Của Bài ${activeModuleIndex + 1} (${activeLessonMaterials.length})`
                            : `Lesson ${activeModuleIndex + 1} Uploaded Materials (${activeLessonMaterials.length})`}
                        </span>
                      </div>
                      {canManageLessonMaterials && activeModule && (
                        <button
                          type="button"
                          onClick={() => setShowLessonUploadDrawer((prev) => !prev)}
                          className="px-3 py-1.5 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {showLessonUploadDrawer
                              ? isVi
                                ? 'Thu gọn trình Upload'
                                : 'Hide Upload Drawer'
                              : isVi
                              ? '+ Upload Học Liệu Cho Bài Này'
                              : '+ Upload Material to This Lesson'}
                          </span>
                        </button>
                      )}
                    </div>

                    {showLessonUploadDrawer && activeModule ? (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <LessonMaterialsManager
                          initialCourseId={course.id}
                          initialLessonId={activeModule.id}
                          compact
                          lockSelection
                        />
                      </div>
                    ) : activeLessonMaterials.length === 0 ? (
                      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                        {isVi
                          ? 'Bài học này chưa có học liệu đính kèm riêng trên Firestore.'
                          : 'No custom per-lesson materials uploaded to Firestore for this lesson yet.'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeLessonMaterials.map((mat) => (
                          <div
                            key={mat.id}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="font-bold text-xs text-slate-900 truncate">
                                {isVi ? mat.titleVi : mat.titleEn}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 flex flex-wrap items-center gap-x-2">
                                <span className="uppercase font-bold text-blue-700">{mat.materialType}</span>
                                <span>&middot;</span>
                                <span>{mat.fileSizeLabel}</span>
                                <span>&middot;</span>
                                <span>{mat.storageMode}</span>
                                {mat.isRequired && (
                                  <>
                                    <span>&middot;</span>
                                    <span className="text-rose-700 font-bold">
                                      {isVi ? 'Bắt buộc' : 'Required'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {(canPreviewInline(mat) || Boolean(mat.downloadUrl)) && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(mat)}
                                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-blue-600" />
                                  <span>{isVi ? 'Xem' : 'Preview'}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => downloadLessonMaterial(mat)}
                                className="px-3 py-1 rounded-lg bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                {mat.storageMode === 'external_link' ? (
                                  <ExternalLink className="w-3 h-3" />
                                ) : (
                                  <Download className="w-3 h-3" />
                                )}
                                <span>{isVi ? 'Tải' : 'Get'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Learning Objectives Reminder */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider block">
                      {isVi ? 'Mục tiêu cốt lõi của khóa học:' : 'Core Course Learning Objectives:'}
                    </span>
                    <ul className="space-y-1 text-xs text-slate-600">
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

              {/* Sidebar Modules List (30%) */}
              <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                    {t.courses.modules} ({course.modules.length})
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    {course.durationHours} {language === 'vi' ? 'giờ' : 'hrs'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {course.modules.map((mod, idx) => {
                    const isSelected = activeModuleIndex === idx;
                    const isDone = enrollment?.completedModules.includes(mod.id);
                    const modMatCount = courseLessonMaterials.filter((m) => m.lessonId === mod.id).length;

                    return (
                      <button
                        key={mod.id}
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
                            <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[9px] font-bold text-slate-500">
                              {idx + 1}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h5 className={`font-bold text-xs leading-snug ${isSelected ? 'text-slate-950 font-extrabold' : 'text-slate-700'}`}>
                            {language === 'vi' ? mod.titleVi : mod.titleEn}
                          </h5>
                          <span className="text-[10px] text-slate-500 mt-1 block font-mono tabular-nums">
                            {mod.durationMinutes} {isVi ? 'phút' : 'min'} &bull; {mod.type}
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
          {activeTabSub === 'assignment' && (
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-200 pb-4">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                  {isVi ? 'Bài Tập Thực Hành Tại Khách Sạn (On-the-Job Training)' : 'On-the-Job Training (OJT) Practical Assignment'}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                  {(isVi
                    ? course.practicalAssignmentTitle
                    : course.practicalAssignmentTitleEn || course.practicalAssignmentTitle) ||
                    (isVi ? 'Thực Hành Tác Nghiệp Khóa Sổ & Phân Tích Tài Chính' : 'Hotel Month-End Closing & Financial Analysis Practicum')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isVi
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
                    <li className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        {isVi
                          ? 'File Excel tính toán chi tiết mô hình theo mẫu chuẩn mực USALI'
                          : 'USALI-compliant Excel calculation & reconciliation workbook'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        {isVi
                          ? 'Bản giải trình báo cáo phân tích phương sai (P&L Critique Memo)'
                          : 'Executive variance explanation memo (P&L Critique Memo)'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        {isVi
                          ? 'Kế hoạch hành động 30 ngày khắc phục chi phí gửi Tổng Giám Đốc'
                          : '30-day corrective cost-control action plan for the General Manager'}
                      </span>
                    </li>
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
          )}
        </div>
      </div>

      {/* Inline Preview Modal inside CoursePlayerModal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-[#0A192F] text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-amber-400">
                  {previewDoc.courseCode} · {isVi ? `Bài ${previewDoc.lessonOrder}` : `Lesson ${previewDoc.lessonOrder}`} · {previewDoc.fileSizeLabel}
                </div>
                <h4 className="font-extrabold text-sm truncate">
                  {isVi ? previewDoc.titleVi : previewDoc.titleEn}
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadLessonMaterial(previewDoc)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Tải xuống' : 'Download'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 overflow-auto p-4 flex items-center justify-center">
              {previewText !== null ? (
                <pre className="w-full h-full bg-white rounded-xl border border-slate-200 p-4 text-xs font-mono text-slate-800 overflow-auto whitespace-pre-wrap">
                  {previewText}
                </pre>
              ) : previewUrl && (previewDoc.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(previewDoc.fileName || '')) ? (
                <img
                  src={previewUrl}
                  alt={isVi ? previewDoc.titleVi : previewDoc.titleEn}
                  className="max-w-full max-h-full rounded-xl shadow-md object-contain"
                />
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={isVi ? previewDoc.titleVi : previewDoc.titleEn}
                  className="w-full h-full rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="text-xs text-slate-500">
                  {isVi
                    ? 'Định dạng tệp này không hỗ trợ xem trực tiếp. Vui lòng bấm Tải xuống.'
                    : 'Inline preview is not supported for this file type. Please click Download.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
