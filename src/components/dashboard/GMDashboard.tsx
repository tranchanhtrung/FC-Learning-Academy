import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Crown,
  TrendingUp,
  ShieldCheck,
  Award,
  DollarSign,
  AlertCircle,
  Sparkles,
  ArrowRight,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

export const GMDashboard: React.FC = () => {
  const {
    currentUser,
    successionCandidates,
    users,
    language,
    t,
    setActiveTab,
  } = useApp();

  const readyCandidate = successionCandidates.find((c) => c.readiness === 'Ready Now');
  const readyUser = users.find((u) => u.id === readyCandidate?.userId);

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-[#0F1E36] via-[#1B2A4A] to-[#162744] text-white p-6 sm:p-8 rounded-2xl border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'vi' ? 'BÁO CÁO ĐIỀU HÀNH TỔNG GIÁM ĐỐC' : 'GENERAL MANAGER EXECUTIVE BRIEFING'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {language === 'vi' ? `Kính chào Tổng Giám Đốc, ${currentUser.name}` : `Welcome, General Manager ${currentUser.name}`}
          </h2>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {language === 'vi'
              ? 'Đánh giá năng lực chiến lược của Bộ phận Tài chính & Kế toán tại Grand Horizon Saigon. Giám sát độ sẵn sàng kế thừa vị trí Financial Controller và hiệu quả kinh doanh tác động đến GOP.'
              : 'Strategic capability analysis of the Finance & Accounting Department at Grand Horizon Saigon. Monitoring FC succession pipeline readiness and bottom-line GOP impact.'}
          </p>

          <div className="pt-2 flex flex-wrap gap-3 text-xs font-bold">
            <button
              onClick={() => setActiveTab('aiAssistant')}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{language === 'vi' ? 'Mở FC Business Partner Simulator' : 'Launch FC Business Partner Simulator'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              {language === 'vi' ? 'Báo cáo chỉ số kinh doanh' : 'View Executive Reports'}
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <Crown className="w-80 h-80 text-amber-400" />
        </div>
      </div>

      {/* Strategic GM KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Finance Capability Index */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {language === 'vi' ? 'Chỉ số năng lực tài chính' : 'Finance Capability Index'}
          </span>
          <div className="text-2xl font-black text-slate-900">84.2%</div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+6.4% {language === 'vi' ? 'sau 6 tháng đào tạo' : 'over 6 months'}</span>
          </p>
        </div>

        {/* Metric 2: FC Succession Readiness */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {language === 'vi' ? 'Sẵn sàng bổ nhiệm FC' : 'FC Succession Bench'}
          </span>
          <div className="text-2xl font-black text-emerald-600">100%</div>
          <p className="text-[11px] text-slate-500">
            {language === 'vi' ? '1 Ứng viên Ready Now (AFC)' : '1 Ready Now Candidate (AFC)'}
          </p>
        </div>

        {/* Metric 3: Internal Audit Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {language === 'vi' ? 'Điểm kiểm toán nội bộ' : 'Internal Audit Score'}
          </span>
          <div className="text-2xl font-black text-blue-600">94.0%</div>
          <p className="text-[11px] text-emerald-600 font-semibold">
            {language === 'vi' ? 'Xếp loại Xuất sắc (Group Audit)' : 'Grade A: Corporate Audit'}
          </p>
        </div>

        {/* Metric 4: Flow-Through Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {language === 'vi' ? 'Chuyển hóa GOP (Flow-Through)' : 'GOP Flow-Through Rate'}
          </span>
          <div className="text-2xl font-black text-amber-600">62.5%</div>
          <p className="text-[11px] text-slate-500">
            {language === 'vi' ? 'Vượt chuẩn ngành (Mục tiêu 50%)' : 'Exceeds benchmark (50%)'}
          </p>
        </div>
      </div>

      {/* Grid: Succession Spotlight & Business Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Succession Spotlight (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">
              {language === 'vi' ? 'Nhân Sự Kế Thừa Hàng Đầu (Succession Spotlight)' : 'Top FC Succession Candidate'}
            </h3>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Ready Now
            </span>
          </div>

          {readyUser && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-3.5">
                <img
                  src={readyUser.avatar}
                  alt={readyUser.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/40"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{readyUser.name}</h4>
                  <p className="text-xs text-slate-600 font-medium">{readyUser.position}</p>
                  <p className="text-[11px] text-slate-400">{readyUser.property}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center text-xs">
                <div className="p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-semibold">Điểm năng lực</span>
                  <span className="font-black text-slate-900">{readyCandidate?.competencyScorePercent}%</span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-semibold">Dự án OJT</span>
                  <span className="font-black text-slate-900">{readyCandidate?.completedOJTCount} / 6</span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-semibold">Chứng chỉ</span>
                  <span className="font-black text-amber-600">Level {readyCandidate?.certLevel}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 italic bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60">
                &ldquo;Lê Hoàng Nam thể hiện tư duy đối tác kinh doanh vượt trội, làm chủ quy trình Fast-Close Day 3 và bảo vệ thành công mô hình đầu tư tiết kiệm năng lượng $850k.&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Right: Business Performance Impact (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">
              {language === 'vi' ? 'Tác Động Của Đào Tạo Đến Hiệu Quả Kinh Doanh' : 'Training Impact on Hotel P&L'}
            </h3>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Fast-Close Day 3 Delivery</p>
                <p className="text-[11px] text-slate-500">Xuất báo cáo P&L sơ bộ đúng 17:00 ngày Day 3</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                100% Đạt Chuẩn
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Zero-Based Budget Accuracy</p>
                <p className="text-[11px] text-slate-500">Biên độ sai lệch dự báo GOP rolling dưới ±2.8%</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                ±2.8% (Mục tiêu &lt; ±3%)
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">F&B Cost Leakage Prevention</p>
                <p className="text-[11px] text-slate-500">Giảm tỷ lệ thất thoát quầy Bar từ 34% xuống 29.5%</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Tiết kiệm $38,000/năm
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
