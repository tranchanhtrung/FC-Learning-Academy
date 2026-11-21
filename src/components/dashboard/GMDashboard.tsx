import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Crown,
  TrendingUp,
  Sparkles,
  ArrowRight,
  BarChart3,
} from 'lucide-react';

const FALLBACK_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%231E293B"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%23F59E0B" font-family="sans-serif" font-weight="700" font-size="22">FC</text></svg>';

export const GMDashboard: React.FC = () => {
  const {
    currentUser,
    successionCandidates,
    assessments,
    ojtAssignments,
    users,
    language,
    setActiveTab,
    canAccessRoute,
  } = useApp();

  const isVi = language === 'vi';
  const readyNowCandidates = successionCandidates.filter((c) => c.readiness === 'Ready Now');
  const readyCandidate = readyNowCandidates[0];
  const readyUser = users.find((u) => u.id === readyCandidate?.userId);

  const avgCompetencyScore =
    successionCandidates.length > 0
      ? (
          successionCandidates.reduce((sum, c) => sum + c.competencyScorePercent, 0) /
          successionCandidates.length
        ).toFixed(1)
      : assessments.length > 0
      ? (
          (1 -
            assessments.reduce((sum, a) => sum + (a.overallGapAverage || 0), 0) /
              (assessments.length * 4)) *
          100
        ).toFixed(1)
      : '84.0';

  const benchCoveragePct =
    successionCandidates.length > 0 ? Math.min(100, Math.round((readyNowCandidates.length / 1) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-[#0F1E36] via-[#1B2A4A] to-[#162744] text-white p-5 sm:p-8 rounded-2xl border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{isVi ? 'BÁO CÁO ĐIỀU HÀNH TỔNG GIÁM ĐỐC' : 'GENERAL MANAGER EXECUTIVE BRIEFING'}</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-snug">
            {isVi ? `Kính chào Tổng Giám Đốc, ${currentUser.name}` : `Welcome, General Manager ${currentUser.name}`}
          </h2>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {isVi
              ? `Đánh giá năng lực chiến lược của Bộ phận Tài chính & Kế toán tại ${currentUser.property}. Giám sát độ sẵn sàng kế thừa vị trí Financial Controller và hiệu quả kinh doanh tác động đến GOP.`
              : `Strategic capability analysis of the Finance & Accounting Department at ${currentUser.property}. Monitoring FC succession pipeline readiness and bottom-line GOP impact.`}
          </p>

          <div className="pt-2 flex flex-wrap gap-3 text-xs font-bold">
            {canAccessRoute('aiAssistant') && (
              <button
                onClick={() => setActiveTab('aiAssistant')}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{isVi ? 'Mở FC Business Partner Simulator' : 'Launch FC Business Partner Simulator'}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
            {canAccessRoute('reports') && (
              <button
                onClick={() => setActiveTab('reports')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                {isVi ? 'Báo cáo chỉ số kinh doanh' : 'View Executive Reports'}
              </button>
            )}
          </div>
        </div>

        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none hidden sm:block">
          <Crown className="w-72 h-72 text-amber-400" />
        </div>
      </div>

      {/* Strategic GM KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Chỉ số năng lực tài chính' : 'Finance Capability Index'}
          </span>
          <div className="text-2xl font-black text-slate-900 tabular-nums">{avgCompetencyScore}%</div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span>
              {successionCandidates.length} {isVi ? 'nhân sự nòng cốt' : 'key bench talent'}
            </span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Sẵn sàng bổ nhiệm FC' : 'FC Succession Bench'}
          </span>
          <div className="text-2xl font-black text-emerald-600 tabular-nums">{benchCoveragePct}%</div>
          <p className="text-[11px] text-slate-500">
            {readyNowCandidates.length} {isVi ? 'ứng viên sẵn sàng ngay (AFC)' : 'Ready Now Candidate (AFC)'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Điểm kiểm toán nội bộ' : 'Internal Audit Score'}
          </span>
          <div className="text-2xl font-black text-blue-600 tabular-nums">94.0%</div>
          <p className="text-[11px] text-emerald-600 font-semibold">
            {isVi ? 'Xếp loại Xuất sắc (Group Audit)' : 'Grade A: Corporate Audit'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Chuyển hóa GOP (Flow-Through)' : 'GOP Flow-Through Rate'}
          </span>
          <div className="text-2xl font-black text-amber-600 tabular-nums">62.5%</div>
          <p className="text-[11px] text-slate-500">
            {isVi ? 'Vượt chuẩn ngành (Mục tiêu 50%)' : 'Exceeds benchmark (50%)'}
          </p>
        </div>
      </div>

      {/* Grid: Succession Spotlight & Business Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Succession Spotlight (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-base text-slate-900">
              {isVi ? 'Nhân Sự Kế Thừa Hàng Đầu' : 'Top FC Succession Candidate'}
            </h3>
            {readyUser && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                {isVi ? 'Sẵn sàng ngay' : 'Ready Now'}
              </span>
            )}
          </div>

          {!readyUser ? (
            <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
              {isVi
                ? 'Chưa có ứng viên đạt trạng thái Sẵn sàng ngay. Kiểm tra lộ trình phát triển đội ngũ tại mục Đánh giá năng lực.'
                : 'No candidate has reached Ready Now status yet.'}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={readyUser.avatar}
                  alt={readyUser.name}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_AVATAR;
                  }}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 truncate">{readyUser.name}</h4>
                  <p className="text-xs text-slate-600 font-medium truncate">{readyUser.position}</p>
                  <p className="text-[11px] text-slate-400 truncate">{readyUser.property}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-slate-100">
                  <span className="text-[11px] text-slate-500 block font-semibold">
                    {isVi ? 'Điểm năng lực' : 'Competency Score'}
                  </span>
                  <span className="font-black text-slate-900 tabular-nums">
                    {readyCandidate?.competencyScorePercent}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-100">
                  <span className="text-[11px] text-slate-500 block font-semibold">
                    {isVi ? 'Dự án OJT' : 'OJT Projects'}
                  </span>
                  <span className="font-black text-slate-900 tabular-nums">
                    {readyCandidate?.completedOJTCount} / {Math.max(6, ojtAssignments.length)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-100">
                  <span className="text-[11px] text-slate-500 block font-semibold">
                    {isVi ? 'Chứng chỉ' : 'Certification'}
                  </span>
                  <span className="font-black text-amber-600">
                    {isVi ? `Cấp ${readyCandidate?.certLevel}` : `Level ${readyCandidate?.certLevel}`}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 italic bg-amber-50/60 p-3 rounded-lg border border-amber-200/60 leading-relaxed">
                {isVi
                  ? `“${readyUser.name} thể hiện tư duy đối tác kinh doanh vượt trội (${readyCandidate?.competencyScorePercent}% năng lực), làm chủ quy trình khóa sổ nhanh Day 3 và bảo vệ hiệu quả các đề xuất tối ưu chi phí vận hành.”`
                  : `“${readyUser.name} demonstrates strong business-partner acumen (${readyCandidate?.competencyScorePercent}% competency score), mastering the Day-3 Fast-Close cycle and defending high-ROI operational initiatives.”`}
              </p>
            </div>
          )}
        </div>

        {/* Right: Business Performance Impact (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-base text-slate-900">
              {isVi ? 'Tác Động Của Đào Tạo Đến Hiệu Quả Kinh Doanh' : 'Training Impact on Hotel P&L'}
            </h3>
            <BarChart3 className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-800">
                  {isVi ? 'Khóa sổ nhanh đúng hạn Day 3' : 'Fast-Close Day 3 Delivery'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isVi
                    ? 'Xuất báo cáo P&L sơ bộ đúng 17:00 ngày Day 3'
                    : 'Preliminary P&L package published on schedule at 17:00 on Day 3'}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap shrink-0">
                {isVi ? '100% Đạt Chuẩn' : '100% On-Time'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-800">
                  {isVi ? 'Độ chính xác ngân sách ZBB' : 'Zero-Based Budget Accuracy'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isVi
                    ? 'Biên độ sai lệch dự báo GOP rolling dưới ±2.8%'
                    : 'Rolling GOP forecast variance held within ±2.8%'}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 whitespace-nowrap shrink-0">
                {isVi ? '±2.8% (Mục tiêu < ±3%)' : '±2.8% (Target < ±3%)'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-800">
                  {isVi ? 'Kiểm soát thất thoát giá vốn F&B' : 'F&B Cost Leakage Prevention'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isVi
                    ? 'Giảm tỷ lệ thất thoát quầy Bar từ 34% xuống 29.5%'
                    : 'Reduced Bar beverage cost variance from 34.0% down to 29.5%'}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 whitespace-nowrap shrink-0">
                {isVi ? 'Tiết kiệm $38,000/năm' : 'Saved $38,000/yr'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
