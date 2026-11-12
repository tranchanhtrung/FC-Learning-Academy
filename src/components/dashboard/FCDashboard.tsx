import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Briefcase,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  TrendingUp,
  FileText,
  UserCheck,
  Sparkles,
} from 'lucide-react';

export const FCDashboard: React.FC = () => {
  const {
    currentUser,
    users,
    assessments,
    submissions,
    successionCandidates,
    language,
    t,
    setActiveTab,
  } = useApp();

  // My direct team members (those supervised by this FC or in the same property)
  const myTeam = users.filter((u) => u.role === 'learner' && (u.supervisorId === currentUser.id || u.property.includes('Grand Horizon')));
  const pendingSubmissions = submissions.filter((s) => s.status === 'submitted' || s.status === 'under_review');
  const urgentCoachingList = [
    {
      name: 'Nguyễn Minh Thư',
      role: 'Senior Accountant',
      focusArea: 'Month-End Accruals & Fast-Close Timetable (FAR-02)',
      gap: 2,
      recommendation: 'Kèm cặp trực tiếp quy trình đối chiếu số dư và rút ngắn thời gian lập báo cáo Day 3.',
    },
    {
      name: 'Đoàn Văn Phúc',
      role: 'Assistant Cost Controller',
      focusArea: 'F&B Potential Cost & Recipe Yield Audits (FCA-03)',
      gap: 2,
      recommendation: 'Hướng dẫn kiểm tra tỷ lệ hao hụt quầy bar và quy trình kiểm kê đột xuất.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-emerald-900/60 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Briefcase className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'BẢNG ĐIỀU KHIỂN TRƯỞNG BỘ PHẬN TÀI CHÍNH' : 'DIRECTOR OF FINANCE DASHBOARD'}</span>
          </div>
          <h2 className="text-2xl font-extrabold">
            {language === 'vi' ? `Quản Trị Năng Lực Đội Ngũ – ${currentUser.name}` : `Team Talent Oversight – ${currentUser.name}`}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {language === 'vi'
              ? `Theo dõi tiến độ phát triển, đánh giá năng lực, chấm bài thực hành OJT và bồi dưỡng nhân sự kế thừa cho vị trí Giám Đốc Tài Chính tại ${currentUser.property}.`
              : `Monitor staff competency progression, grade practical OJT deliverables, and mentor future Financial Controllers at ${currentUser.property}.`}
          </p>
        </div>

        <button
          onClick={() => setActiveTab('assessments')}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>{language === 'vi' ? 'Đánh giá năng lực nhân viên' : 'Conduct Assessment'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">{language === 'vi' ? 'Nhân sự trực thuộc' : 'Direct Team'}</span>
          <div className="text-2xl font-black text-slate-900">{myTeam.length}</div>
          <p className="text-[11px] text-slate-500">{language === 'vi' ? 'Kế toán viên & Trợ lý' : 'Accountants & AFCs'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">{language === 'vi' ? 'Bài OJT cần chấm' : 'Pending OJT Submissions'}</span>
          <div className="text-2xl font-black text-amber-600">{pendingSubmissions.length}</div>
          <p className="text-[11px] text-amber-600 font-semibold">{language === 'vi' ? 'Cần duyệt nhận xét' : 'Awaiting grading'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">{language === 'vi' ? 'Cần kèm cặp ưu tiên' : 'Requires Coaching'}</span>
          <div className="text-2xl font-black text-rose-600">{urgentCoachingList.length}</div>
          <p className="text-[11px] text-rose-600 font-semibold">{language === 'vi' ? 'Khoảng trống L2 &gt; 1 cấp' : 'Gap &gt; 1 level'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">{language === 'vi' ? 'Kế thừa sẵn sàng' : 'Succession Ready'}</span>
          <div className="text-2xl font-black text-emerald-600">1</div>
          <p className="text-[11px] text-slate-500">Lê Hoàng Nam (Ready Now)</p>
        </div>
      </div>

      {/* Main Split: Team Gap Matrix & OJT Review Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Team Competency & Gap Overview (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {language === 'vi' ? 'Tiến Độ & Khoảng Trống Nhân Sự Bộ Phận' : 'Team Competency & Gap Overview'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'vi' ? 'Đánh giá định kỳ theo 6 miền năng lực USALI' : 'Assessed according to 6 USALI competency domains'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('assessments')}
              className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
            >
              {language === 'vi' ? 'Xem ma trận' : 'View Matrix'} &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {myTeam.map((member) => (
              <div
                key={member.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/60 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{member.name}</h4>
                    <p className="text-[10px] text-slate-500">{member.position}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Cấp độ hiện tại</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                      Level {member.currentLevel} / {member.targetLevel}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('assessments')}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-200 hover:bg-slate-900 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {language === 'vi' ? 'Đánh giá' : 'Assess'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Urgent Coaching List & OJT Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Urgent Coaching Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{t.dashboard.urgentCoaching}</span>
            </div>

            <div className="space-y-3">
              {urgentCoachingList.map((coach, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{coach.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-200 text-rose-800 font-bold">
                      Gap: {coach.gap} Levels
                    </span>
                  </div>
                  <p className="font-semibold text-rose-900 text-[11px]">{coach.focusArea}</p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{coach.recommendation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* OJT Submissions Queue */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                {language === 'vi' ? 'Hàng Đợi Chấm Bài OJT' : 'OJT Deliverable Queue'}
              </h4>
              <button
                onClick={() => setActiveTab('ojtProjects')}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                {t.common.all} &rarr;
              </button>
            </div>

            {submissions.map((sub) => {
              const u = users.find((user) => user.id === sub.userId);
              return (
                <div
                  key={sub.id}
                  className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800">{u?.name}</p>
                    <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{sub.fileName}</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('ojtProjects')}
                    className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] cursor-pointer"
                  >
                    {language === 'vi' ? 'Chấm điểm' : 'Review'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
