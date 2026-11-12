import React, { useEffect } from 'react';
import { Certificate, User } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Printer, Award, ShieldCheck, Download, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CertificateModalProps {
  certificate: Certificate | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, onClose }) => {
  const { users, language, t } = useApp();

  useEffect(() => {
    if (certificate) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#0A192F', '#3B82F6', '#E5C378'],
        });
      } catch (e) {
        // ignore if canvas-confetti is not loaded
      }
    }
  }, [certificate]);

  if (!certificate) return null;

  const recipient: User | undefined = users.find((u) => u.id === certificate.userId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-amber-200/60 my-8">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm tracking-wide text-amber-100">
                {language === 'vi' ? 'CHỨNG CHỈ NĂNG LỰC TÀI CHÍNH KHÁCH SẠN' : 'HOSPITALITY FINANCE CERTIFICATE OF COMPETENCY'}
              </h3>
              <p className="text-xs text-slate-400">
                ID: <span className="font-mono text-amber-300">{certificate.certificateNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'vi' ? 'In / Lưu PDF' : 'Print / Save PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Canvas */}
        <div className="p-8 sm:p-12 bg-gradient-to-br from-[#FCFBF7] to-[#FAF8F0] text-slate-800 relative select-none">
          {/* Ornate Gold Border */}
          <div className="border-4 border-[#C5A059] p-2 rounded-xl relative">
            <div className="border border-[#D4AF37]/60 p-6 sm:p-10 rounded-lg bg-white/70 relative backdrop-blur-xs">
              {/* Corner Ornaments */}
              <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-[#C5A059]"></div>
              <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-[#C5A059]"></div>
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-[#C5A059]"></div>
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-[#C5A059]"></div>

              {/* Header */}
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-200/80 mb-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-800">
                    FC LEARNING ACADEMY • INTERNATIONAL BENCHMARK
                  </span>
                </div>
                <h1
                  className="text-2xl sm:text-4xl font-extrabold tracking-wider text-slate-900"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  CERTIFICATE OF COMPETENCY
                </h1>
                <p className="text-xs uppercase tracking-widest text-amber-700 font-semibold">
                  HOSPITALITY FINANCIAL CONTROLLER TALENT ACCELERATION PROGRAM
                </p>
              </div>

              {/* Presentation Line */}
              <div className="text-center space-y-4 my-8">
                <p className="text-xs sm:text-sm text-slate-500 uppercase tracking-widest">
                  {language === 'vi' ? 'CHỨNG NHẬN ĐƯỢC TRAO CHO' : 'THIS IS PROUDLY PRESENTED TO'}
                </p>
                <h2
                  className="text-2xl sm:text-4xl font-bold text-[#0A192F] tracking-wide border-b-2 border-amber-300/60 pb-3 max-w-xl mx-auto"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {recipient?.name || 'Nguyễn Minh Thư'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  {recipient?.position || 'Senior Accountant'} &bull; {recipient?.property || 'Grand Horizon Saigon Hotel'}
                </p>
              </div>

              {/* Award Description */}
              <div className="max-w-2xl mx-auto text-center space-y-3 my-6">
                <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
                  {language === 'vi'
                    ? 'Đã hoàn thành xuất sắc các khóa đào tạo chuyên sâu, vượt qua kỳ sát hạch kiến thức chuẩn USALI và bảo vệ thành công các dự án thực tế OJT, chính thức được công nhận đạt cấp độ:'
                    : 'Having successfully fulfilled all rigorous academic curricula, passed international USALI evaluations, and demonstrated exceptional operational finance leadership in on-the-job projects, is hereby awarded:'}
                </p>
                <div className="py-2 px-4 bg-amber-50/80 border border-amber-200 rounded-lg inline-block">
                  <span className="text-sm sm:text-base font-bold text-amber-900">
                    {language === 'vi' ? certificate.titleVi : certificate.titleEn}
                  </span>
                </div>
              </div>

              {/* Signatures & Seal */}
              <div className="grid grid-cols-3 items-end pt-12 mt-6 border-t border-slate-200 text-center gap-4">
                {/* Signer 1 */}
                <div className="space-y-2">
                  <div className="h-10 flex items-center justify-center">
                    <span className="font-serif italic text-lg sm:text-xl text-slate-700 select-none">
                      David Tran
                    </span>
                  </div>
                  <div className="border-t border-slate-400/60 pt-1.5">
                    <p className="text-[11px] sm:text-xs font-bold text-slate-800">David Tran</p>
                    <p className="text-[10px] text-slate-500">Cluster Director of Finance</p>
                  </div>
                </div>

                {/* Center Seal */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[#C5A059] flex items-center justify-center p-1 bg-gradient-to-br from-amber-100 to-amber-200 shadow-inner">
                    <div className="w-full h-full rounded-full border border-dashed border-[#8A6D3B] flex flex-col items-center justify-center p-1 text-center">
                      <Award className="w-5 h-5 sm:w-6 sm:h-6 text-[#8A6D3B]" />
                      <span className="text-[7px] sm:text-[8px] font-bold text-[#8A6D3B] uppercase tracking-tighter">
                        FC ACADEMY
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-2 font-mono">
                    {language === 'vi' ? 'Ngày cấp: ' : 'Issued: '} {certificate.issueDate}
                  </p>
                </div>

                {/* Signer 2 */}
                <div className="space-y-2">
                  <div className="h-10 flex items-center justify-center">
                    <span className="font-serif italic text-lg sm:text-xl text-slate-700 select-none">
                      Richard Vance
                    </span>
                  </div>
                  <div className="border-t border-slate-400/60 pt-1.5">
                    <p className="text-[11px] sm:text-xs font-bold text-slate-800">Richard Vance</p>
                    <p className="text-[10px] text-slate-500">General Manager</p>
                  </div>
                </div>
              </div>

              {/* Bottom Verification Strip */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>VERIFICATION CODE: {certificate.verificationCode}</span>
                <span>STATUS: CERTIFIED & ACTIVE</span>
                <span>USALI 11TH/12TH COMPLIANT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="px-8 py-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 print:hidden">
          {language === 'vi'
            ? 'Chứng chỉ nội bộ ghi nhận năng lực chuyên môn và độ sẵn sàng bổ nhiệm của nhân sự tài chính khách sạn. Xác thực trực tuyến qua mã Verification ID.'
            : 'Internal hospitality finance competency credential validating promotion readiness. Online validation via Verification Code.'}
        </div>
      </div>
    </div>
  );
};
