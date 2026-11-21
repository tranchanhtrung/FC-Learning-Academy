import React from 'react';
import { useApp } from '../../context/AppContext';
import { Briefcase, AlertTriangle, ClipboardCheck } from 'lucide-react';

const FALLBACK_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%231E293B"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%23F59E0B" font-family="sans-serif" font-weight="700" font-size="22">FC</text></svg>';

export const FCDashboard: React.FC = () => {
  const {
    currentUser,
    users,
    assessments,
    competencies,
    submissions,
    successionCandidates,
    language,
    t,
    setActiveTab,
    canAccessRoute,
  } = useApp();

  const isVi = language === 'vi';

  const myTeam = users.filter(
    (u) =>
      u.role === 'learner' &&
      (u.supervisorId === currentUser.id || u.property === currentUser.property)
  );
  const pendingSubmissions = submissions.filter(
    (s) => s.status === 'submitted' || s.status === 'under_review'
  );

  // Compute live urgent coaching list from latest assessments for each team member
  const urgentCoachingList = myTeam
    .map((member) => {
      const latestAsmt = assessments
        .filter((a) => a.learnerId === member.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      if (!latestAsmt?.scores) {
        const gap = Math.max(0, (member.targetLevel || 4) - member.currentLevel);
        if (gap < 2) return null;
        return {
          name: member.name,
          role: member.position,
          focusArea: isVi
            ? 'Chưa có đánh giá năng lực định kỳ — cần thiết lập baseline'
            : 'Baseline competency evaluation pending',
          gap,
          recommendation: isVi
            ? 'Khởi tạo kỳ đánh giá năng lực đầu tiên và kích hoạt kế hoạch IDP.'
            : 'Initialize competency assessment cycle and assign IDP.',
        };
      }
      const worstEntry = Object.entries(latestAsmt.scores)
        .map(([code, s]) => ({ code, ...s }))
        .sort((a, b) => (b.gap || 0) - (a.gap || 0))[0];
      if (!worstEntry || worstEntry.gap < 2) return null;
      const comp = competencies.find((c) => c.code === worstEntry.code);
      return {
        name: member.name,
        role: member.position,
        focusArea: `${comp ? (isVi ? comp.nameVi : comp.nameEn) : worstEntry.code} (${worstEntry.code})`,
        gap: worstEntry.gap,
        recommendation:
          worstEntry.supervisorNotes ||
          (isVi
            ? 'Kèm cặp trực tiếp tại khách sạn và giao bài tập thực hành OJT chuyên sâu.'
            : 'Conduct direct OJT coaching and assign targeted practical deliverables.'),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const readyNowCandidates = successionCandidates.filter((c) => c.readiness === 'Ready Now');
  const firstReadyUser = readyNowCandidates[0]
    ? users.find((u) => u.id === readyNowCandidates[0].userId)
    : null;

  return (
    <div className="space-y-6">
      {/* Top Welcome */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-5 sm:p-8 rounded-2xl border border-emerald-900/60 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Briefcase className="w-3.5 h-3.5 shrink-0" />
            <span>{isVi ? 'BẢNG ĐIỀU KHIỂN TRƯỞNG BỘ PHẬN TÀI CHÍNH' : 'DIRECTOR OF FINANCE DASHBOARD'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold leading-snug">
            {isVi ? `Quản Trị Năng Lực Đội Ngũ – ${currentUser.name}` : `Team Talent Oversight – ${currentUser.name}`}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {isVi
              ? `Theo dõi tiến độ phát triển, đánh giá năng lực, chấm bài thực hành OJT và bồi dưỡng nhân sự kế thừa cho vị trí Giám Đốc Tài Chính tại ${currentUser.property}.`
              : `Monitor staff competency progression, grade practical OJT deliverables, and mentor future Financial Controllers at ${currentUser.property}.`}
          </p>
        </div>

        {canAccessRoute('assessments') && (
          <button
            onClick={() => setActiveTab('assessments')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <span>{isVi ? 'Đánh giá năng lực nhân viên' : 'Conduct Assessment'}</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Nhân sự trực thuộc' : 'Direct Team'}
          </span>
          <div className="text-2xl font-black text-slate-900 tabular-nums">{myTeam.length}</div>
          <p className="text-[11px] text-slate-500">{isVi ? 'Kế toán viên & Trợ lý' : 'Accountants & AFCs'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Bài OJT cần chấm' : 'Pending OJT Submissions'}
          </span>
          <div className="text-2xl font-black text-amber-600 tabular-nums">{pendingSubmissions.length}</div>
          <p className="text-[11px] text-amber-600 font-semibold">{isVi ? 'Cần duyệt nhận xét' : 'Awaiting grading'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Cần kèm cặp ưu tiên' : 'Requires Coaching'}
          </span>
          <div className="text-2xl font-black text-rose-600 tabular-nums">{urgentCoachingList.length}</div>
          <p className="text-[11px] text-rose-600 font-semibold">{isVi ? 'Khoảng trống >= 2 cấp' : 'Gap >= 2 levels'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Kế thừa sẵn sàng' : 'Succession Ready'}
          </span>
          <div className="text-2xl font-black text-emerald-600 tabular-nums">{readyNowCandidates.length}</div>
          <p className="text-[11px] text-slate-500 truncate">
            {firstReadyUser
              ? `${firstReadyUser.name} (${isVi ? 'Sẵn sàng ngay' : 'Ready Now'})`
              : isVi
              ? 'Đang bồi dưỡng'
              : 'In pipeline'}
          </p>
        </div>
      </div>

      {/* Main Split: Team Gap Matrix & OJT Review Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Team Competency & Gap Overview (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {isVi ? 'Tiến Độ & Khoảng Trống Nhân Sự Bộ Phận' : 'Team Competency & Gap Overview'}
              </h3>
              <p className="text-xs text-slate-500">
                {isVi ? 'Đánh giá định kỳ theo 6 miền năng lực USALI' : 'Assessed according to 6 USALI competency domains'}
              </p>
            </div>
            {canAccessRoute('assessments') && (
              <button
                onClick={() => setActiveTab('assessments')}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer whitespace-nowrap"
              >
                {isVi ? 'Xem ma trận' : 'View Matrix'} &rarr;
              </button>
            )}
          </div>

          <div className="space-y-3">
            {myTeam.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
                {isVi ? 'Chưa có nhân sự trực thuộc trong khách sạn này.' : 'No direct finance team members found.'}
              </div>
            ) : (
              myTeam.map((member) => (
                <div
                  key={member.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_AVATAR;
                      }}
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 truncate">{member.name}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{member.position}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="sm:text-right">
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        {isVi ? 'Cấp độ hiện tại' : 'Current Level'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold whitespace-nowrap">
                        {isVi
                          ? `Cấp ${member.currentLevel} / ${member.targetLevel}`
                          : `Level ${member.currentLevel} / ${member.targetLevel}`}
                      </span>
                    </div>
                    {canAccessRoute('assessments') && (
                      <button
                        onClick={() => setActiveTab('assessments')}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-900 hover:text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {isVi ? 'Đánh giá' : 'Assess'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Urgent Coaching List & OJT Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Urgent Coaching Box */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t.dashboard.urgentCoaching}</span>
            </div>

            <div className="space-y-3">
              {urgentCoachingList.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 font-medium">
                  {isVi
                    ? 'Không có nhân sự nào có khoảng trống năng lực nghiêm trọng (>= 2 cấp).'
                    : 'No team members currently have severe competency gaps (>= 2 levels).'}
                </div>
              ) : (
                urgentCoachingList.map((coach, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-1.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-slate-900">
                      <span>{coach.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-200 text-rose-800 font-bold whitespace-nowrap">
                        {isVi ? `Thiếu ${coach.gap} cấp` : `Gap: ${coach.gap} Levels`}
                      </span>
                    </div>
                    <p className="font-semibold text-rose-900 text-[11px]">{coach.focusArea}</p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{coach.recommendation}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* OJT Submissions Queue (matches pendingSubmissions KPI) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                {isVi ? 'Hàng Đợi Chấm Bài OJT' : 'OJT Deliverable Queue'}
              </h4>
              {canAccessRoute('ojtProjects') && (
                <button
                  onClick={() => setActiveTab('ojtProjects')}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer whitespace-nowrap"
                >
                  {t.common.all} &rarr;
                </button>
              )}
            </div>

            {pendingSubmissions.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 text-center">
                {isVi
                  ? 'Tất cả bài nộp OJT đã được chấm điểm.'
                  : 'All OJT deliverables have been reviewed.'}
              </div>
            ) : (
              pendingSubmissions.map((sub) => {
                const u = users.find((user) => user.id === sub.userId);
                return (
                  <div
                    key={sub.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{u?.name || sub.userId}</p>
                      <p className="text-[11px] text-slate-500 truncate">{sub.fileName || 'OJT Deliverable'}</p>
                    </div>
                    {canAccessRoute('ojtProjects') && (
                      <button
                        onClick={() => setActiveTab('ojtProjects')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {isVi ? 'Chấm điểm' : 'Review'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
