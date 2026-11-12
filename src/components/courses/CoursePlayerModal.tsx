import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Course, CourseModule } from '../../types';
import {
  X,
  Play,
  CheckCircle2,
  FileText,
  Download,
  Award,
  BookOpen,
  ChevronRight,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
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
  const { enrollments, updateCourseProgress, currentUser, language, t } = useApp();

  if (!course) return null;

  const enrollment = enrollments.find(
    (e) => e.userId === currentUser.id && e.courseId === course.id
  );

  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
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

  const handleDownloadExcel = () => {
    // Generate realistic Excel workbook mock file
    const sampleContent = `FC LEARNING ACADEMY - WORKING FINANCIAL MODEL\nCourse: ${course.code} - ${course.titleEn}\nAuthor: ${course.instructorName}\nStandard: USALI 11th & 12th Edition\nGenerated for: ${currentUser.name}\n\nPeriod,Occupancy,ADR,RevPAR,Total Revenue,Rooms Expense,F&B Cost,GOP,GOP Margin,Flow-Through\nMonth 1,74.5%,$185,$137.83,$1420000,$240000,$285000,$520000,36.6%,-\nMonth 2,82.0%,$192,$157.44,$1620000,$260000,$310000,$645000,39.8%,62.5%\nMonth 3,85.0%,$198,$168.30,$1730000,$272000,$325000,$715000,41.3%,63.6%`;

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${course.code}_Working_Model_${currentUser.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-700/50 overflow-hidden my-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#0A192F] text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
              {course.code}
            </span>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-white line-clamp-1">
                {language === 'vi' ? course.titleVi : course.titleEn}
              </h3>
              <p className="text-[10px] text-slate-400">
                {course.instructorName} &bull; {course.instructorTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-slate-400">{language === 'vi' ? 'Tiến độ:' : 'Progress:'}</span>
              <span className="font-bold text-amber-400">{enrollment?.progressPercent || 0}%</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body (Split Video/Reading + Modules Sidebar) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Stage (70%) */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50">
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
                  <h4 className="text-white font-bold text-base">
                    {language === 'vi' ? activeModule?.titleVi : activeModule?.titleEn}
                  </h4>
                  <p className="text-amber-300 text-xs mt-0.5">
                    {course.instructorName} &bull; USALI Masterclass Video (4K)
                  </p>
                </div>
              </div>

              {/* Video Player Controls Mock */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 flex items-center justify-between text-xs text-white">
                <div className="flex items-center gap-3">
                  <Play className="w-4 h-4 fill-white cursor-pointer" />
                  <span className="text-[11px] font-mono text-slate-300">12:45 / 45:00</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800">1080p HD</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800">1.0x</span>
                </div>
              </div>
            </div>

            {/* Lesson Notes & Downloadables */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    Module {activeModuleIndex + 1} of {course.modules.length}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {language === 'vi' ? activeModule?.titleVi : activeModule?.titleEn}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>{t.courses.downloadMaterial}</span>
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

              {/* Text Notes */}
              <div className="text-xs text-slate-700 leading-relaxed space-y-3">
                <p>
                  <strong>Nguyên lý quản trị cốt lõi:</strong> Chuẩn mực USALI yêu cầu phân bổ chính xác doanh thu và chi phí trực tiếp của từng bộ phận tạo doanh thu (Operated Departments: Rooms, F&B, Spa) trước khi tính toán Gross Operating Profit (GOP).
                </p>
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                  <span className="font-bold text-blue-900 text-xs">Điểm lưu ý cho Financial Controller:</span>
                  <p className="text-[11px] text-blue-800 leading-normal">
                    Chi phí trích trước (Accruals) cho các hóa đơn điện năng, giặt là ngoài và chi phí hoa hồng OTA phải được hoàn tất trước 12:00 ngày Day 2 để đảm bảo phát hành Day 3 Flash P&L.
                  </p>
                </div>
              </div>

              {/* Exam prompt if last module */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    {language === 'vi' ? 'Sẵn sàng kiểm tra kiến thức?' : 'Ready for the Examination?'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Điểm qua: {course.passingScore}% &bull; Câu hỏi trắc nghiệm & tình huống tính toán USALI
                  </p>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onStartQuiz(course);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>{t.quiz.startExam}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Modules List (30%) */}
          <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                {t.courses.modules} ({course.modules.length})
              </h4>
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
                      <h5 className={`font-bold text-xs leading-snug ${isSelected ? 'text-slate-950' : 'text-slate-700'}`}>
                        {language === 'vi' ? mod.titleVi : mod.titleEn}
                      </h5>
                      <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                        {mod.durationMinutes} min &bull; {mod.type}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
