import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Course, CourseModule } from '../../types';
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
  const { enrollments, updateCourseProgress, currentUser, language, t, setActiveTab } = useApp();
  const [activeTabSub, setActiveTabSub] = useState<'modules' | 'materials' | 'case_study' | 'assignment'>('modules');
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);

  useEffect(() => {
    setActiveModuleIndex(0);
    setActiveTabSub('modules');
  }, [course?.id]);

  if (!course) return null;

  const enrollment = enrollments.find(
    (e) => e.userId === currentUser.id && e.courseId === course.id
  );

  const activeModule: CourseModule = course.modules[activeModuleIndex] || course.modules[0];
  const isModuleCompleted = enrollment?.completedModules.includes(activeModule?.id);

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
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTabSub === 'modules'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>{language === 'vi' ? 'Nội Dung Bài Học' : 'Lessons & Video'}</span>
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
            {course.materials && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                {course.materials.length}
              </span>
            )}
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
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 shadow-md border border-slate-800 aspect-video flex items-center justify-center group">
                  <img
                    src={course.thumbnail}
                    alt={course.titleVi}
                    className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity"
                  />
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
                        Phần {activeModuleIndex + 1} / {course.modules.length} • {activeModule?.type.toUpperCase()}
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
                        <span>Tải Mô Hình Excel</span>
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

                  {/* Learning Objectives Reminder */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider block">
                      Mục tiêu cốt lõi của khóa học:
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

                    return (
                      <button
                        key={mod.id}
                        onClick={() => setActiveModuleIndex(idx)}
                        className={`w-full p-4 text-left transition-colors flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50/70 border-l-4 border-amber-500'
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
                          <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                            {mod.durationMinutes} phút &bull; {mod.type}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: DOWNLOADABLE MATERIALS & EXCEL WORKING MODELS */}
          {activeTabSub === 'materials' && (
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Tài Liệu Học Tập & File Excel Mẫu Thực Hành
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Toàn bộ các biểu mẫu chuẩn USALI 11th Edition, checklist khóa sổ, công thức tính toán Flow-Through và thẩm định CAPEX được thiết kế sẵn để tải về máy và ứng dụng ngay tại khách sạn.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(course.materials || []).map((mat) => (
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
                        {mat.title}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {mat.descriptionVi}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDownloadExcel(mat.title)}
                      className="w-full py-2 bg-[#0A192F] hover:bg-[#1E293B] text-amber-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải Về Máy Ngay</span>
                    </button>
                  </div>
                ))}
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
                      Tình Huống Thực Tế Chuẩn Tập Đoàn Quốc Tế
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                      {language === 'vi' ? course.caseStudy.titleVi : course.caseStudy.titleEn}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">
                      Bối cảnh khách sạn: {course.caseStudy.propertyContext}
                    </p>
                  </div>

                  {/* Scenario Narrative */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      1. Bối cảnh & Diễn biến sự việc:
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {language === 'vi' ? course.caseStudy.scenarioVi : course.caseStudy.scenarioEn}
                    </p>
                  </div>

                  {/* Key Challenge */}
                  <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                    <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>2. Thách thức cốt lõi đặt ra cho Financial Controller:</span>
                    </span>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      {language === 'vi' ? course.caseStudy.keyChallengeVi : course.caseStudy.keyChallengeEn}
                    </p>
                  </div>

                  {/* Suggested Solution & Action Plan */}
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>3. Khuyến nghị giải pháp & Kế hoạch hành động chuẩn mực:</span>
                    </span>
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      {language === 'vi' ? course.caseStudy.suggestedSolutionVi : course.caseStudy.suggestedSolutionEn}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Không có dữ liệu tình huống cho khóa học này.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRACTICAL ASSIGNMENT (OJT) */}
          {activeTabSub === 'assignment' && (
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-200 pb-4">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                  Bài Tập Thực Hành Tại Khách Sạn (On-the-Job Training)
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                  {course.practicalAssignmentTitle || 'Thực Hành Tác Nghiệp Khóa Sổ & Phân Tích Tài Chính'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bài tập yêu cầu người học áp dụng trực tiếp kiến thức đã học vào số liệu vận hành thực tế tại khách sạn và nộp bài để Giám đốc Tài chính chấm điểm thẩm định.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Sản phẩm đầu ra cần nộp (Deliverables):
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>File Excel tính toán chi tiết mô hình theo mẫu chuẩn mực USALI</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Bản giải trình báo cáo phân tích phương sai (P&L Critique Memo)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Kế hoạch hành động 30 ngày khắc phục chi phí gửi Tổng Giám Đốc</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Được đánh giá theo thang điểm 100 bởi Cluster Financial Controller
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      setActiveTab('ojtProjects');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Mở Phân Hệ Nộp Bài OJT</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
