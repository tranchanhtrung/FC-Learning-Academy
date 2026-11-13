import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Certificate } from '../../types';
import {
  Award,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Search,
  ExternalLink,
  Printer,
  Sparkles,
  FileText,
  Clock,
} from 'lucide-react';

export const CertificationsView: React.FC = () => {
  const {
    certificates,
    users,
    courses,
    ojtAssignments,
    enrollments,
    submissions,
    currentUser,
    issueCertificate,
    setSelectedCertificateForView,
    language,
    t,
    showToast,
  } = useApp();

  const isAuthorizedIssuer =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'lnd_manager' ||
    currentUser.role === 'financial_controller';

  const [selectedUserId, setSelectedUserId] = useState<string>(() =>
    currentUser.role === 'learner' ? currentUser.id : 'user_learner1'
  );

  React.useEffect(() => {
    if (currentUser.role === 'learner') {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser.id, currentUser.role]);

  const targetUser = users.find((u) => u.id === selectedUserId) || currentUser;

  const [verifyCodeInput, setVerifyCodeInput] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<Certificate | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [issuingLevel, setIssuingLevel] = useState<number | null>(null);

  const levels = [
    {
      level: 1 as const,
      titleVi: 'Cấp độ 1 – Nền Tảng Kế Toán Khách Sạn (Hospitality Finance Foundation)',
      titleEn: 'Level 1 – Hospitality Finance Foundation',
      descVi: 'Nắm vững các nguyên lý hạch toán kế toán khách sạn theo USALI 11th Edition, đối chiếu số dư tiền mặt và khóa sổ doanh thu hàng ngày.',
      descEn: 'Fundamental hospitality accounting, daily revenue recognition, and cashier float auditing.',
      requiredCourses: ['HFC-101'],
      requiredOjt: ['OJT-FAR-01'],
      minScore: 80,
    },
    {
      level: 2 as const,
      titleVi: 'Cấp độ 2 – Chuyên Viên Kế Toán Khách Sạn Chuyên Nghiệp (Hospitality Finance Professional)',
      titleEn: 'Level 2 – Hospitality Finance Professional',
      descVi: 'Độc lập thực hiện quy trình khóa sổ tháng Day 3, lập hồ sơ đối chiếu bảng cân đối kế toán chuẩn Big 4 và kiểm soát chi phí F&B.',
      descEn: 'Autonomous Day 3 closing, audit-ready balance sheet reconciliations, and F&B cost control.',
      requiredCourses: ['HFC-101', 'HFC-102', 'HFC-201'],
      requiredOjt: ['OJT-FAR-01', 'OJT-FCA-01'],
      minScore: 80,
    },
    {
      level: 3 as const,
      titleVi: 'Cấp độ 3 – Sẵn Sàng Bổ Nhiệm Trợ Lý Giám Đốc Tài Chính (AFC Ready)',
      titleEn: 'Level 3 – Assistant Financial Controller Ready',
      descVi: 'Xây dựng mô hình ngân sách năm, dự báo dòng tiền 13 tuần, thẩm định dự án đầu tư CAPEX và phân tích Flow-through.',
      descEn: 'Annual master budgeting, 13-week cash flow, Capex DCF modeling, and GOP flow-through analysis.',
      requiredCourses: ['HFC-301', 'HFC-302', 'HFC-202'],
      requiredOjt: ['OJT-FPM-01', 'OJT-BPA-01'],
      minScore: 85,
    },
    {
      level: 4 as const,
      titleVi: 'Cấp độ 4 – Sẵn Sàng Giám Đốc Tài Chính Độc Lập (Financial Controller Ready)',
      titleEn: 'Level 4 – Financial Controller Ready (Property Leader)',
      descVi: 'Lãnh đạo toàn diện bộ phận tài chính 15+ nhân sự, xây dựng quan hệ tin cậy với Chủ sở hữu và đồng hành cùng GM tối đa hóa EBITDA.',
      descEn: 'Full financial stewardship of 400+ key luxury properties, owner asset management alignment, and high-performance team leadership.',
      requiredCourses: ['HFC-401', 'HFC-501'],
      requiredOjt: ['OJT-FPM-02', 'OJT-SBP-01'],
      minScore: 90,
    },
    {
      level: 5 as const,
      titleVi: 'Cấp độ 5 – Đối Tác Kinh Doanh Tài Chính Chiến Lược (Strategic Finance Business Partner)',
      titleEn: 'Level 5 – Strategic Finance Business Partner (Cluster/Corporate FC)',
      descVi: 'Định vị giá trị tài sản khách sạn (Real Estate Value Creation), tái cơ cấu nợ, đàm phán hợp đồng quản lý (HMA) và cố vấn chiến lược chuỗi khách sạn.',
      descEn: 'Hotel real estate asset optimization, multi-property cluster steering, HMA advisory, and executive board governance.',
      requiredCourses: ['HFC-303', 'HFC-501'],
      requiredOjt: ['OJT-SBP-01'],
      minScore: 90,
    },
  ];

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    const found = certificates.find(
      (c) => c.verificationCode.toLowerCase() === verifyCodeInput.trim().toLowerCase()
    );
    setVerificationResult(found || null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>5-Level Professional Certification Journey</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.certifications.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {t.certifications.subtitle}
          </p>
        </div>

        {isAuthorizedIssuer ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 shrink-0">
              {language === 'vi' ? 'Hồ sơ cấp chứng chỉ:' : 'Candidate:'}
            </span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold text-xs focus:outline-none"
            >
              {users
                .filter((u) => u.role === 'learner' || u.id === currentUser.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.position} • L{u.currentLevel})
                  </option>
                ))}
            </select>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs max-w-xs">
            <p className="text-slate-600 leading-tight">
              <strong>Lưu ý quản trị:</strong> Chứng chỉ học viện công nhận năng lực học thuật & chuyên môn, là điều kiện tiên quyết nhưng tách biệt với quyết định bổ nhiệm nhân sự chính thức của Tập đoàn.
            </p>
          </div>
        )}
      </div>

      {/* Verification Search Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0A192F] p-5 rounded-2xl text-white shadow-md border border-slate-700">
        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'vi' ? 'Tra Cứu & Xác Thực Chứng Chỉ Trực Tuyến' : 'Online Certificate Verification'}</span>
            </span>
            <p className="text-slate-300 text-xs">
              {language === 'vi'
                ? 'Nhập mã Verification ID (ví dụ: VERIFY-AFC-8829-VN) để kiểm tra tính hợp lệ'
                : 'Enter Verification ID (e.g., VERIFY-AFC-8829-VN) to confirm integrity'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={verifyCodeInput}
              onChange={(e) => setVerifyCodeInput(e.target.value)}
              placeholder="VERIFY-AFC-8829-VN"
              className="px-4 py-2 text-xs font-mono rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
            >
              {language === 'vi' ? 'Xác thực' : 'Validate'}
            </button>
          </div>
        </form>

        {/* Verification Result Popdown */}
        {hasSearched && (
          <div className="mt-4 pt-4 border-t border-slate-700/80 text-xs">
            {verificationResult ? (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="font-bold block">Chứng chỉ hợp lệ: {language === 'vi' ? verificationResult.titleVi : verificationResult.titleEn}</span>
                    <span className="text-[11px] text-slate-300">
                      {language === 'vi' ? 'Cấp cho:' : 'Issued to:'}{' '}
                      <strong>
                        {users.find((u) => u.id === verificationResult.userId)?.name || verificationResult.userId}
                      </strong>{' '}
                      &bull; {language === 'vi' ? 'Ngày:' : 'Date:'} {verificationResult.issueDate} &bull; #{verificationResult.certificateNumber}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCertificateForView(verificationResult)}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                >
                  {t.certifications.viewCert}
                </button>
              </div>
            ) : (
              <p className="text-rose-400">
                Không tìm thấy chứng chỉ với mã xác thực này. Vui lòng kiểm tra lại.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 5 Levels Roadmap Grid */}
      <div className="space-y-4">
        {levels.map((lvl) => {
          const userHasCert = certificates.find(
            (c) => c.userId === targetUser.id && c.level === lvl.level
          );

          const completedCourseCount = lvl.requiredCourses.filter((code) => {
            const courseObj = courses.find((c) => c.code === code);
            if (!courseObj) return false;
            const enr = enrollments.find((e) => e.userId === targetUser.id && e.courseId === courseObj.id);
            return enr && enr.progressPercent >= 100 && (enr.quizScore ?? 100) >= lvl.minScore;
          }).length;

          const approvedOjtCount = lvl.requiredOjt.filter((code) => {
            const ojtObj = ojtAssignments.find((a) => a.code === code);
            if (!ojtObj) return false;
            const sub = submissions.find((s) => s.userId === targetUser.id && s.assignmentId === ojtObj.id);
            return sub && sub.status === 'approved' && (sub.score ?? 100) >= lvl.minScore;
          }).length;

          const allRequirementsMet =
            completedCourseCount === lvl.requiredCourses.length &&
            approvedOjtCount === lvl.requiredOjt.length;
          const isUnlocked = targetUser.currentLevel >= lvl.level || allRequirementsMet;
          const canIssueNow = !userHasCert && (isUnlocked || isAuthorizedIssuer);

          const handleIssue = async () => {
            setIssuingLevel(lvl.level);
            const issued = await issueCertificate(targetUser.id, lvl.level);
            setIssuingLevel(null);
            if (issued) {
              showToast(
                language === 'vi'
                  ? `Đã cấp chứng chỉ Level ${lvl.level} cho ${targetUser.name}.`
                  : `Issued Level ${lvl.level} certificate to ${targetUser.name}.`,
                'success'
              );
            }
          };

          return (
            <div
              key={lvl.level}
              className={`p-6 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                userHasCert
                  ? 'bg-gradient-to-r from-amber-50/60 to-white border-amber-300 shadow-sm ring-1 ring-amber-300/50'
                  : isUnlocked
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-50/70 border-slate-200 opacity-85'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                    userHasCert
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-md'
                      : isUnlocked
                      ? 'bg-slate-900 text-amber-400'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  L{lvl.level}
                </div>

                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                      {language === 'vi' ? lvl.titleVi : lvl.titleEn}
                    </h3>
                    {userHasCert && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ĐÃ ĐẠT
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {language === 'vi' ? lvl.descVi : lvl.descEn}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span>
                      Khóa học bắt buộc: <strong>{lvl.requiredCourses.join(', ')}</strong> ({completedCourseCount}/{lvl.requiredCourses.length})
                    </span>
                    <span>&bull;</span>
                    <span>
                      Dự án OJT: <strong>{lvl.requiredOjt.join(', ')}</strong> ({approvedOjtCount}/{lvl.requiredOjt.length})
                    </span>
                    <span>&bull;</span>
                    <span>Điểm chuẩn: <strong>{lvl.minScore}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                {userHasCert ? (
                  <button
                    onClick={() => setSelectedCertificateForView(userHasCert)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>{t.certifications.viewCert}</span>
                  </button>
                ) : canIssueNow ? (
                  <button
                    disabled={issuingLevel === lvl.level}
                    onClick={handleIssue}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {issuingLevel === lvl.level
                        ? language === 'vi' ? 'Đang cấp...' : 'Issuing...'
                        : language === 'vi' ? `Cấp chứng chỉ Level ${lvl.level}` : `Issue Level ${lvl.level}`}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold px-3 py-2 bg-slate-100 rounded-xl">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Chưa đủ điều kiện</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
