import React, { useEffect } from 'react';
import { Certificate, User } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Printer, Award, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CertificateModalProps {
  certificate: Certificate | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, onClose }) => {
  const { users, language } = useApp();
  const isVi = language === 'vi';

  useEffect(() => {
    if (certificate) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#0A192F', '#3B82F6', '#E5C378'],
        });
      } catch {
        // ignore if canvas-confetti is unavailable
      }
    }
  }, [certificate]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!certificate) return null;

  const recipient: User | undefined = users.find((u) => u.id === certificate.userId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-amber-200/60 my-auto">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm tracking-wide text-amber-100 truncate">
                {isVi ? 'CHỨNG CHỈ NĂNG LỰC TÀI CHÍNH KHÁCH SẠN' : 'HOSPITALITY FINANCE CERTIFICATE OF COMPETENCY'}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                ID: <span className="font-mono text-amber-300">{certificate.certificateNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>{isVi ? 'In / Lưu PDF' : 'Print / Save PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label={isVi ? 'Đóng' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Certificate Canvas */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 sm:p-8 lg:p-12 bg-gradient-to-br from-[#FCFBF7] to-[#FAF8F0] text-slate-800 relative select-none">
            {/* Ornate Gold Border */}
            <div className="border-4 border-[#C5A059] p-1.5 sm:p-2 rounded-xl relative">
              <div className="border border-[#D4AF37]/60 p-4 sm:p-8 lg:p-10 rounded-lg bg-white/70 relative backdrop-blur-xs">
                {/* Corner Ornaments */}
                <div className="absolute top-2 left-2 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 border-[#C5A059]" />
                <div className="absolute top-2 right-2 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 border-[#C5A059]" />
                <div className="absolute bottom-2 left-2 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 border-[#C5A059]" />
                <div className="absolute bottom-2 right-2 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 border-[#C5A059]" />

                {/* Header */}
                <div className="text-center space-y-2 mb-6 sm:mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-200/80 mb-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-amber-800">
                      {isVi
                        ? 'FC LEARNING ACADEMY • CHUẨN QUỐC TẾ'
                        : 'FC LEARNING ACADEMY • INTERNATIONAL BENCHMARK'}
                    </span>
                  </div>
                  <h1 className="font-serif text-2xl sm:text-4xl font-extrabold tracking-wide text-slate-900">
                    {isVi ? 'CHỨNG CHỈ NĂNG LỰC CHUYÊN MÔN' : 'CERTIFICATE OF COMPETENCY'}
                  </h1>
                  <p className="text-[11px] sm:text-xs uppercase tracking-widest text-amber-700 font-semibold">
                    {isVi
                      ? 'CHƯƠNG TRÌNH PHÁT TRIỂN GIÁM ĐỐC TÀI CHÍNH KHÁCH SẠN'
                      : 'HOSPITALITY FINANCIAL CONTROLLER TALENT ACCELERATION PROGRAM'}
                  </p>
                </div>

                {/* Presentation Line */}
                <div className="text-center space-y-3 sm:space-y-4 my-6 sm:my-8">
                  <p className="text-xs sm:text-sm text-slate-500 uppercase tracking-widest">
                    {isVi ? 'CHỨNG NHẬN ĐƯỢC TRAO CHO' : 'THIS IS PROUDLY PRESENTED TO'}
                  </p>
                  {/* Playfair Display fully supports Vietnamese diacritics */}
                  <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#0A192F] tracking-normal border-b-2 border-amber-300/60 pb-3 max-w-xl mx-auto">
                    {recipient?.name || 'Nguyễn Minh Thư'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    {recipient?.position || 'Senior Accountant'} &bull;{' '}
                    {recipient?.property || 'Grand Horizon Saigon Hotel'}
                  </p>
                </div>

                {/* Award Description */}
                <div className="max-w-2xl mx-auto text-center space-y-3 my-6">
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
                    {isVi
                      ? 'Đã hoàn thành xuất sắc các khóa đào tạo chuyên sâu, vượt qua kỳ sát hạch kiến thức chuẩn USALI và bảo vệ thành công các dự án thực tế OJT, chính thức được công nhận đạt cấp độ:'
                      : 'Having successfully fulfilled all rigorous academic curricula, passed international USALI evaluations, and demonstrated exceptional operational finance leadership in on-the-job projects, is hereby awarded:'}
                  </p>
                  <div className="py-2 px-4 bg-amber-50/80 border border-amber-200 rounded-lg inline-block">
                    <span className="text-sm sm:text-base font-bold text-amber-900">
                      {isVi ? certificate.titleVi : certificate.titleEn}
                    </span>
                  </div>
                </div>

                {/* Signatures & Seal — stacked cleanly on mobile, 3-col on sm+ */}
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center sm:items-end pt-8 sm:pt-12 mt-6 border-t border-slate-200 text-center gap-6 sm:gap-4">
                  {/* Signer 1 */}
                  <div className="space-y-2 order-2 sm:order-1">
                    <div className="h-9 flex items-center justify-center">
                      <span className="font-serif italic text-lg sm:text-xl text-slate-700 select-none">
                        David Tran
                      </span>
                    </div>
                    <div className="border-t border-slate-400/60 pt-1.5">
                      <p className="text-xs font-bold text-slate-800">David Tran</p>
                      <p className="text-[11px] text-slate-500">
                        {isVi ? 'Giám Đốc Tài Chính Cụm Khách Sạn' : 'Cluster Director of Finance'}
                      </p>
                    </div>
                  </div>

                  {/* Center Seal */}
                  <div className="flex flex-col items-center order-1 sm:order-2">
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-[#C5A059] flex items-center justify-center p-1 bg-gradient-to-br from-amber-100 to-amber-200 shadow-inner">
                      <div className="w-full h-full rounded-full border border-dashed border-[#8A6D3B] flex flex-col items-center justify-center p-1 text-center">
                        <Award className="w-5 h-5 sm:w-6 sm:h-6 text-[#8A6D3B]" />
                        <span className="text-[8px] font-bold text-[#8A6D3B] uppercase tracking-tight">
                          FC ACADEMY
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono">
                      {isVi ? 'Ngày cấp: ' : 'Issued: '}
                      {certificate.issueDate}
                    </p>
                  </div>

                  {/* Signer 2 */}
                  <div className="space-y-2 order-3">
                    <div className="h-9 flex items-center justify-center">
                      <span className="font-serif italic text-lg sm:text-xl text-slate-700 select-none">
                        Richard Vance
                      </span>
                    </div>
                    <div className="border-t border-slate-400/60 pt-1.5">
                      <p className="text-xs font-bold text-slate-800">Richard Vance</p>
                      <p className="text-[11px] text-slate-500">
                        {isVi ? 'Tổng Giám Đốc Khách Sạn' : 'General Manager'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Verification Strip */}
                <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
                  <span>
                    {isVi ? 'MÃ XÁC THỰC' : 'VERIFICATION CODE'}: {certificate.verificationCode}
                  </span>
                  <span>{isVi ? 'TRẠNG THÁI: ĐANG HIỆU LỰC' : 'STATUS: CERTIFIED & ACTIVE'}</span>
                  <span>USALI 11TH/12TH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          <div className="px-4 sm:px-8 py-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 print:hidden">
            {isVi
              ? 'Chứng chỉ nội bộ ghi nhận năng lực chuyên môn và độ sẵn sàng bổ nhiệm của nhân sự tài chính khách sạn. Xác thực trực tuyến qua mã Verification ID.'
              : 'Internal hospitality finance competency credential validating promotion readiness. Online validation via Verification Code.'}
          </div>
        </div>
      </div>
    </div>
  );
};
