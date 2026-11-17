import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Play, Clock, Building2, CheckCircle2, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SimulatorDifficulty, SimulatorScenarioCategory } from '../../types';

const CATEGORIES: Array<'ALL' | SimulatorScenarioCategory> = [
  'ALL',
  'GOP & Hotel Financial Performance',
  'Revenue Forecasting & Budgeting',
  'Cost Control & Profitability',
  'Departmental Performance',
  'GM Business Advisory',
  'Executive Meeting & Strategic Finance',
];

const DIFFICULTIES: Array<'ALL' | SimulatorDifficulty> = ['ALL', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];
const PAGE_SIZE = 12;

export const ScenarioLibraryTab: React.FC = () => {
  const {
    currentUser,
    language,
    simulatorData,
    simulatorWorkspace,
    launchSimulationWorkspace,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | SimulatorScenarioCategory>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'ALL' | SimulatorDifficulty>('ALL');
  const [selectedHotelId, setSelectedHotelId] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const isSupervisorOrAdmin = ['super_admin', 'lnd_manager', 'financial_controller', 'general_manager'].includes(
    currentUser.role
  );

  const filteredScenarios = useMemo(() => {
    return simulatorData.simulationScenarios.filter((s) => {
      if (!isSupervisorOrAdmin && (s.status !== 'Published' || s.isActive === false)) return false;
      if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
      const diff =
        s.difficultyLabel ||
        (s.difficultyLevel === 1 ? 'Beginner' : s.difficultyLevel === 2 ? 'Intermediate' : s.difficultyLevel === 3 ? 'Advanced' : 'Expert');
      if (selectedDifficulty !== 'ALL' && diff !== selectedDifficulty) return false;
      if (selectedHotelId !== 'ALL' && s.hotelId !== selectedHotelId) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${s.scenarioCode} ${s.titleEn} ${s.titleVi} ${s.summaryEn} ${s.summaryVi} ${(s.competencyIds || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    simulatorData.simulationScenarios,
    isSupervisorOrAdmin,
    selectedCategory,
    selectedDifficulty,
    selectedHotelId,
    search,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredScenarios.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedScenarios = filteredScenarios.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const userSessions = simulatorData.simulationSessions.filter(
    (s) => s.employeeId === currentUser.id || s.employeeUid === currentUser.id
  );
  const myAssignments = simulatorWorkspace.assignments.filter((a) => a.learnerId === currentUser.id);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-amber-700">
              SCENARIO CATALOG · 6 HOSPITALITY FINANCE DOMAINS
            </p>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              {language === 'vi' ? 'Thư Viện Kịch Bản Mô Phỏng' : 'Simulation Scenario Library'}
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-500 tabular-nums">
            {filteredScenarios.length}{' '}
            {language === 'vi' ? 'kịch bản hiển thị' : 'scenarios available'}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={language === 'vi' ? 'Tìm mã kịch bản, năng lực...' : 'Search code, title, competency...'}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-amber-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? (language === 'vi' ? 'Tất cả 6 nhóm chuyên môn' : 'All 6 Categories') : cat}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => {
              setSelectedDifficulty(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-amber-500"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d === 'ALL' ? (language === 'vi' ? 'Mọi cấp độ khó' : 'All Difficulties') : d}
              </option>
            ))}
          </select>

          <select
            value={selectedHotelId}
            onChange={(e) => {
              setSelectedHotelId(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">
              {language === 'vi' ? 'Mọi mô hình khách sạn' : 'All Hotel Profiles'}
            </option>
            {simulatorData.hotelSimulationProfiles.map((hp) => (
              <option key={hp.id} value={hp.id}>
                {hp.hotelName} ({hp.totalKeys} keys)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scenario Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedScenarios.map((scn) => {
          const hotel = simulatorData.hotelSimulationProfiles.find((h) => h.id === scn.hotelId);
          const draft = userSessions.find((sess) => sess.scenarioId === scn.id && sess.status === 'in_progress');
          const completed = userSessions.find((sess) => sess.scenarioId === scn.id && sess.status === 'completed');
          const assigned = myAssignments.find((a) => a.scenarioId === scn.id);

          return (
            <div
              key={scn.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 hover:border-slate-300"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                  <span>
                    <strong className="text-slate-900">{scn.scenarioCode}</strong> · {scn.category || 'Hospitality Finance'}
                  </span>
                  <span className="font-semibold text-amber-700">
                    {scn.difficultyLabel || `Level ${scn.difficultyLevel}`}
                    {scn.status !== 'Published' && ` · ${scn.status}`}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {language === 'vi' ? scn.titleVi : scn.titleEn}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {language === 'vi' ? scn.summaryVi : scn.summaryEn}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{hotel?.hotelName || scn.hotelId}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{scn.estimatedDurationMinutes || 35} min</span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-500 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {language === 'vi' ? 'Năng lực:' : 'Competencies:'}{' '}
                    <strong className="text-slate-700">{(scn.competencyIds || []).join(', ') || 'BPA-01'}</strong>
                  </span>
                  <span>
                    {language === 'vi' ? 'Mục tiêu:' : 'Target:'} {scn.targetRole}
                  </span>
                </div>

                {assigned && (
                  <div className="text-[11px] text-rose-700 font-semibold">
                    {language === 'vi' ? `Nhiệm vụ bắt buộc · Hạn: ${assigned.dueDate}` : `Mandatory Assignment · Due ${assigned.dueDate}`}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {completed ? (
                  <span className="text-xs font-mono font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {language === 'vi' ? 'Đã hoàn thành:' : 'Completed:'} {completed.finalScore ?? '—'}/100
                    </span>
                  </span>
                ) : draft ? (
                  <span className="text-xs font-mono text-amber-700 font-semibold">
                    {language === 'vi' ? `Bản nháp Bước ${draft.currentStep || 1}/6` : `Draft Step ${draft.currentStep || 1}/6`}
                  </span>
                ) : scn.status !== 'Published' ? (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> {scn.status}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-mono">v{scn.datasetVersion || '2026.v1'}</span>
                )}

                <div className="flex items-center gap-2">
                  {completed && (
                    <button
                      onClick={() => launchSimulationWorkspace(scn.id, 'simWorkspace', completed.id)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {language === 'vi' ? 'Xem Báo Cáo' : 'Inspect'}
                    </button>
                  )}
                  <button
                    onClick={() => launchSimulationWorkspace(scn.id, 'simWorkspace', draft?.id || null)}
                    className="px-3.5 py-2 rounded-xl bg-[#0A192F] text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {draft
                        ? language === 'vi'
                          ? 'Tiếp Tục Nháp'
                          : 'Resume Draft'
                        : language === 'vi'
                        ? 'Bắt Đầu Mới'
                        : 'Start New'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between text-xs">
          <span className="font-mono text-slate-500 tabular-nums">
            Page {safePage} / {totalPages} · {filteredScenarios.length} scenarios
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
