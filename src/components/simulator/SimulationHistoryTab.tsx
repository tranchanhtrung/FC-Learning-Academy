import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { History, Lock, Play, Eye, Printer, CheckCircle2 } from 'lucide-react';

export const SimulationHistoryTab: React.FC = () => {
  const {
    currentUser,
    language,
    users,
    simulatorData,
    launchSimulationWorkspace,
    hasPermission,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'completed' | 'in_progress'>('ALL');
  const isSupervisorOrAdmin = hasPermission('view_all_learners_data');

  const visibleSessions = useMemo(() => {
    return simulatorData.simulationSessions
      .filter((s) => (isSupervisorOrAdmin ? true : s.employeeId === currentUser.id || s.employeeUid === currentUser.id))
      .filter((s) => (statusFilter === 'ALL' ? true : s.status === statusFilter));
  }, [simulatorData.simulationSessions, isSupervisorOrAdmin, currentUser.id, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-amber-700">
            IMMUTABLE SIMULATION ARCHIVE · VERSIONED SNAPSHOTS
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            {language === 'vi' ? 'Lịch Sử Phiên Mô Phỏng' : 'My Simulation History'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
          >
            <option value="ALL">{language === 'vi' ? 'Tất cả trạng thái' : 'All Statuses'}</option>
            <option value="completed">{language === 'vi' ? 'Đã hoàn thành (Khóa sổ)' : 'Completed (Locked)'}</option>
            <option value="in_progress">{language === 'vi' ? 'Đang thực hiện (Nháp)' : 'In Progress (Draft)'}</option>
          </select>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer print:hidden"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'In / PDF' : 'Print'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {visibleSessions.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              {language === 'vi' ? 'Chưa có phiên mô phỏng nào.' : 'No simulation sessions recorded.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-mono uppercase text-slate-500">
                  <th className="py-3 px-4">{language === 'vi' ? 'Kịch Bản' : 'Scenario'}</th>
                  {isSupervisorOrAdmin && <th className="py-3 px-4">{language === 'vi' ? 'Học Viên' : 'Learner'}</th>}
                  <th className="py-3 px-4">{language === 'vi' ? 'Phiên Bản Dữ Liệu' : 'Dataset Snapshot'}</th>
                  <th className="py-3 px-4">{language === 'vi' ? 'Trạng Thái' : 'Status'}</th>
                  <th className="py-3 px-4 text-right">{language === 'vi' ? 'Điểm' : 'Score'}</th>
                  <th className="py-3 px-4">{language === 'vi' ? 'Cập Nhật' : 'Updated'}</th>
                  <th className="py-3 px-4 text-right print:hidden">{language === 'vi' ? 'Thao Tác' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {visibleSessions.map((sess) => {
                  const learner = users.find((u) => u.id === sess.employeeId);
                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{sess.scenarioTitle}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{sess.id}</p>
                      </td>
                      {isSupervisorOrAdmin && (
                        <td className="py-3.5 px-4 text-slate-700">{learner?.name || sess.employeeId}</td>
                      )}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        v{sess.datasetVersion || '2026.v1'} · {sess.language?.toUpperCase() || 'VI'}
                      </td>
                      <td className="py-3.5 px-4">
                        {sess.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{language === 'vi' ? 'Hoàn thành (Bất biến)' : 'Completed (Locked)'}</span>
                            <Lock className="w-3 h-3 text-slate-400" />
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold">
                            {language === 'vi' ? `Nháp Bước ${sess.currentStep || 1}/6` : `Draft Step ${sess.currentStep || 1}/6`}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {typeof sess.finalScore === 'number' ? `${sess.finalScore}/100` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {new Date(sess.completedAt || sess.updatedAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right print:hidden">
                        <button
                          onClick={() => launchSimulationWorkspace(sess.scenarioId, 'simWorkspace', sess.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {sess.status === 'completed' ? <Eye className="w-3 h-3" /> : <Play className="w-3 h-3 text-amber-400" />}
                          <span>
                            {sess.status === 'completed'
                              ? language === 'vi'
                                ? 'Xem Hồ Sơ'
                                : 'Inspect'
                              : language === 'vi'
                              ? 'Tiếp Tục'
                              : 'Resume'}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
