import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Plus,
  Building2,
  Eye,
  Send,
  ShieldCheck,
  FileSpreadsheet,
  GitBranch,
  Archive,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ScenarioDetailPreviewModal } from './ScenarioDetailPreviewModal';
import type {
  SimulatorDifficulty,
  SimulatorScenarioCategory,
  SimulationScenarioDoc,
  SimulationScenarioStatus,
} from '../../types';

const CATEGORY_OPTIONS: SimulatorScenarioCategory[] = [
  'GOP & Hotel Financial Performance',
  'Revenue Forecasting & Budgeting',
  'Cost Control & Profitability',
  'Departmental Performance',
  'GM Business Advisory',
  'Executive Meeting & Strategic Finance',
];

const PAGE_SIZE = 12;

export const SimulationAdminTab: React.FC = () => {
  const {
    currentUser,
    language,
    users,
    simulatorData,
    simulatorWorkspace,
    transitionScenarioStatus,
    upsertSimulatorScenario,
    upsertHotelProfile,
    assignSimulatorScenario,
    setActiveTab,
    launchSimulationWorkspace,
  } = useApp();

  const [adminSubTab, setAdminSubTab] = useState<'scenarios' | 'hotels' | 'assignments' | 'audit'>('scenarios');
  const [previewScenario, setPreviewScenario] = useState<SimulationScenarioDoc | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | SimulationScenarioStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);

  const isLndOrAdmin = ['super_admin', 'lnd_manager'].includes(currentUser.role);

  // Scenario Builder State
  const [showNewScenario, setShowNewScenario] = useState(false);
  const [newScn, setNewScn] = useState({
    scenarioCode: 'SIM-NEW-07',
    hotelId: simulatorData.hotelSimulationProfiles[0]?.id || 'hotel_upscale_250',
    titleEn: '',
    titleVi: '',
    summaryEn: '',
    summaryVi: '',
    category: 'GOP & Hotel Financial Performance' as SimulatorScenarioCategory,
    difficultyLabel: 'Intermediate' as SimulatorDifficulty,
    difficultyLevel: 2,
    targetRole: 'Assistant Financial Controller',
    competencyIdsRaw: 'BPA-01, FPM-02, SBP-01',
    status: 'Draft' as 'Draft' | 'Published',
  });

  // Hotel Configurator State
  const [newHotel, setNewHotel] = useState({
    hotelCode: 'HTL-NEW-01',
    hotelName: '',
    brandTier: 'Upscale Full-Service',
    city: 'Ho Chi Minh City',
    totalKeys: 220,
    currency: 'USD',
  });

  const publishedActiveScenarios = useMemo(
    () =>
      simulatorData.simulationScenarios.filter(
        (s) => s.status === 'Published' && s.isActive !== false
      ),
    [simulatorData.simulationScenarios]
  );

  // Assignment State — strictly Published & Active scenarios only
  const learners = users.filter((u) => u.role === 'learner');
  const [asgnForm, setAsgnForm] = useState({
    scenarioId: publishedActiveScenarios[0]?.id || '',
    learnerId: learners[0]?.id || 'user_learner1',
    dueDate: '2026-08-31',
    mandatory: true,
    note: '',
  });

  const filteredScenarios = useMemo(() => {
    return simulatorData.simulationScenarios.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${s.scenarioCode} ${s.id} ${s.titleEn} ${s.titleVi} ${(s.competencyIds || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [simulatorData.simulationScenarios, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredScenarios.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedScenarios = filteredScenarios.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScn.titleEn.trim() || !newScn.titleVi.trim()) return;
    const saved = await upsertSimulatorScenario({
      ...newScn,
      competencyIds: newScn.competencyIdsRaw
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    });
    if (saved) {
      setShowNewScenario(false);
      setNewScn({ ...newScn, titleEn: '', titleVi: '', summaryEn: '', summaryVi: '' });
    }
  };

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotel.hotelName.trim()) return;
    const res = await upsertHotelProfile(newHotel);
    if (res) {
      setNewHotel({ ...newHotel, hotelName: '' });
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = asgnForm.scenarioId || publishedActiveScenarios[0]?.id;
    if (!targetId) return;
    await assignSimulatorScenario({ ...asgnForm, scenarioId: targetId });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-amber-700">
            SIMULATOR GOVERNANCE · LIFECYCLE WORKFLOW &amp; RBAC CONTROL
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            {language === 'vi' ? 'Quản Trị Mô Phỏng Kinh Doanh' : 'Simulation Administration'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLndOrAdmin && (
            <button
              onClick={() => setActiveTab('simImportCenter')}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
              <span>{language === 'vi' ? 'Trung Tâm Nhập Kịch Bản' : 'Scenario Import Center'}</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('simVersionHistory')}
            className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <GitBranch className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'vi' ? 'Lịch Sử Phiên Bản' : 'Version History'}</span>
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'scenarios', label: language === 'vi' ? 'Kịch Bản & Xuất Bản' : 'Scenarios' },
              { id: 'hotels', label: language === 'vi' ? 'Khách Sạn' : 'Hotels' },
              { id: 'assignments', label: language === 'vi' ? 'Giao Bài' : 'Assignments' },
              { id: 'audit', label: 'Audit Trail' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setAdminSubTab(t.id as any)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
                  adminSubTab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SCENARIOS & PUBLISH CONTROL */}
      {adminSubTab === 'scenarios' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              {language === 'vi'
                ? `Danh Mục Kịch Bản (${filteredScenarios.length}/${simulatorData.simulationScenarios.length})`
                : `Scenario Catalog (${filteredScenarios.length}/${simulatorData.simulationScenarios.length})`}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={language === 'vi' ? 'Tìm mã, tiêu đề, năng lực...' : 'Filter code, title, competency...'}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-amber-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="Published">Published</option>
                <option value="Validated">Validated</option>
                <option value="Draft">Draft</option>
                <option value="Archived">Archived</option>
              </select>
              <button
                onClick={() => setShowNewScenario((p) => !p)}
                className="px-3.5 py-2 rounded-lg bg-[#0A192F] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'vi' ? 'Tạo Kịch Bản Mới' : 'New Scenario'}</span>
              </button>
            </div>
          </div>

          {showNewScenario && (
            <form onSubmit={handleCreateScenario} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Scenario Code (e.g. SIM-07)"
                  value={newScn.scenarioCode}
                  onChange={(e) => setNewScn({ ...newScn, scenarioCode: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono"
                />
                <select
                  value={newScn.hotelId}
                  onChange={(e) => setNewScn({ ...newScn, hotelId: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  {simulatorData.hotelSimulationProfiles.map((hp) => (
                    <option key={hp.id} value={hp.id}>
                      {hp.hotelName} ({hp.totalKeys} keys)
                    </option>
                  ))}
                </select>
                <select
                  value={newScn.category}
                  onChange={(e) => setNewScn({ ...newScn, category: e.target.value as any })}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Title (English)"
                  value={newScn.titleEn}
                  onChange={(e) => setNewScn({ ...newScn, titleEn: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Tiêu đề (Tiếng Việt)"
                  value={newScn.titleVi}
                  onChange={(e) => setNewScn({ ...newScn, titleVi: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
                <textarea
                  rows={2}
                  placeholder="Business Summary (EN)"
                  value={newScn.summaryEn}
                  onChange={(e) => setNewScn({ ...newScn, summaryEn: e.target.value })}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white"
                />
                <textarea
                  rows={2}
                  placeholder="Tóm tắt tình huống (VI)"
                  value={newScn.summaryVi}
                  onChange={(e) => setNewScn({ ...newScn, summaryVi: e.target.value })}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Competency IDs (comma separated)"
                  value={newScn.competencyIdsRaw}
                  onChange={(e) => setNewScn({ ...newScn, competencyIdsRaw: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono"
                />
                <select
                  value={newScn.difficultyLabel}
                  onChange={(e) => {
                    const lbl = e.target.value as SimulatorDifficulty;
                    const lvl = lbl === 'Beginner' ? 1 : lbl === 'Intermediate' ? 2 : lbl === 'Advanced' ? 3 : 4;
                    setNewScn({ ...newScn, difficultyLabel: lbl, difficultyLevel: lvl });
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Beginner">Beginner (L1)</option>
                  <option value="Intermediate">Intermediate (L2)</option>
                  <option value="Advanced">Advanced (L3)</option>
                  <option value="Expert">Expert (L4)</option>
                </select>
                <button
                  type="submit"
                  className="py-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 cursor-pointer"
                >
                  {language === 'vi' ? 'Lưu Kịch Bản & Dữ Liệu USALI' : 'Create Scenario & USALI Model'}
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-mono uppercase text-slate-500 text-left">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Title & Category</th>
                  <th className="py-2.5 px-3">Competencies</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedScenarios.map((scn) => (
                  <tr key={scn.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {scn.scenarioCode}
                      <div className="text-[10px] font-normal text-slate-400">v{scn.versionNumber || 1}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{language === 'vi' ? scn.titleVi : scn.titleEn}</div>
                      <div className="text-[11px] text-slate-500">
                        {scn.category} · {scn.difficultyLabel || `L${scn.difficultyLevel}`}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {(scn.competencyIds || []).join(', ')}
                    </td>
                    <td className="py-3 px-3 font-semibold">
                      <span
                        className={
                          scn.status === 'Published'
                            ? 'text-emerald-700'
                            : scn.status === 'Validated'
                            ? 'text-sky-700'
                            : scn.status === 'Draft'
                            ? 'text-amber-700'
                            : 'text-slate-400'
                        }
                      >
                        {scn.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setPreviewScenario(scn)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Detail
                      </button>
                      {isLndOrAdmin && scn.status === 'Draft' && (
                        <button
                          onClick={() => transitionScenarioStatus(scn.id, 'Validated')}
                          className="px-2.5 py-1 rounded-lg border border-sky-300 text-sky-800 text-[11px] font-semibold hover:bg-sky-50 cursor-pointer"
                        >
                          Validate
                        </button>
                      )}
                      {isLndOrAdmin && scn.status !== 'Published' && scn.status !== 'Archived' && (
                        <button
                          onClick={() => transitionScenarioStatus(scn.id, 'Published')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-600 cursor-pointer"
                        >
                          Publish
                        </button>
                      )}
                      {isLndOrAdmin && scn.status === 'Published' && (
                        <button
                          onClick={() => transitionScenarioStatus(scn.id, 'Draft')}
                          className="px-2.5 py-1 rounded-lg border border-amber-300 text-amber-800 text-[11px] font-semibold hover:bg-amber-50 cursor-pointer"
                        >
                          Set Draft
                        </button>
                      )}
                      {isLndOrAdmin && scn.status !== 'Archived' ? (
                        confirmArchiveId === scn.id ? (
                          <>
                            <button
                              onClick={async () => {
                                await transitionScenarioStatus(scn.id, 'Archived');
                                setConfirmArchiveId(null);
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-700 text-white text-[11px] font-semibold cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmArchiveId(null)}
                              className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmArchiveId(scn.id)}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            title="Archive scenario"
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                        )
                      ) : isLndOrAdmin && scn.status === 'Archived' ? (
                        <button
                          onClick={() => transitionScenarioStatus(scn.id, 'Draft')}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 text-[11px] font-semibold hover:bg-slate-50 cursor-pointer"
                        >
                          Restore
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500 tabular-nums">
                Page {safePage} / {totalPages} ({filteredScenarios.length} scenarios)
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
      )}

      {/* HOTEL CONFIGURATOR */}
      {adminSubTab === 'hotels' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>{language === 'vi' ? 'Danh Sách Hồ Sơ Khách Sạn' : 'Configured Hotel Simulation Profiles'}</span>
            </h2>
            <div className="divide-y divide-slate-100 text-xs">
              {simulatorData.hotelSimulationProfiles.map((hp) => (
                <div key={hp.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900">
                      {hp.hotelName} <span className="font-mono text-slate-500">({hp.hotelCode})</span>
                    </div>
                    <div className="text-slate-500">{hp.brandTier} · {hp.city}</div>
                  </div>
                  <div className="font-mono font-bold text-slate-800">
                    {hp.totalKeys} keys · {hp.currency}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateHotel} className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'vi' ? 'Thêm Khách Sạn Mô Phỏng Mới' : 'Add Simulation Hotel Profile'}
            </h3>
            <input
              type="text"
              required
              placeholder="Hotel Code (e.g. HTL-LUX-300)"
              value={newHotel.hotelCode}
              onChange={(e) => setNewHotel({ ...newHotel, hotelCode: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
            <input
              type="text"
              required
              placeholder="Hotel Name"
              value={newHotel.hotelName}
              onChange={(e) => setNewHotel({ ...newHotel, hotelName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={20}
                value={newHotel.totalKeys}
                onChange={(e) => setNewHotel({ ...newHotel, totalKeys: Number(e.target.value) })}
                className="px-3 py-2 rounded-xl border border-slate-200 font-mono"
              />
              <select
                value={newHotel.currency}
                onChange={(e) => setNewHotel({ ...newHotel, currency: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="USD">USD</option>
                <option value="VND">VND</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#0A192F] text-white font-bold hover:bg-slate-800 cursor-pointer"
            >
              {language === 'vi' ? 'Lưu Hồ Sơ Khách Sạn' : 'Save Hotel Profile'}
            </button>
          </form>
        </div>
      )}

      {/* ASSIGNMENTS */}
      {adminSubTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form onSubmit={handleAssign} className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900">
              {language === 'vi' ? 'Giao Kịch Bản Cho Học Viên' : 'Assign Simulation Scenario'}
            </h2>
            <select
              value={asgnForm.scenarioId || publishedActiveScenarios[0]?.id || ''}
              onChange={(e) => setAsgnForm({ ...asgnForm, scenarioId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            >
              {publishedActiveScenarios.length === 0 ? (
                <option value="">No Published scenarios available</option>
              ) : (
                publishedActiveScenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.scenarioCode} · {language === 'vi' ? s.titleVi : s.titleEn}
                  </option>
                ))
              )}
            </select>
            <p className="text-[11px] text-slate-500">
              {language === 'vi'
                ? 'Chỉ kịch bản Published & đang kích hoạt mới được phép giao cho học viên.'
                : 'Only Published active scenarios are eligible for learner assignment.'}
            </p>
            <select
              value={asgnForm.learnerId}
              onChange={(e) => setAsgnForm({ ...asgnForm, learnerId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            >
              {learners.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.position})
                </option>
              ))}
            </select>
            <input
              type="date"
              value={asgnForm.dueDate}
              onChange={(e) => setAsgnForm({ ...asgnForm, dueDate: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={asgnForm.mandatory}
                onChange={(e) => setAsgnForm({ ...asgnForm, mandatory: e.target.checked })}
              />
              <span>{language === 'vi' ? 'Nhiệm vụ bắt buộc trước kỳ đánh giá' : 'Mandatory Assignment'}</span>
            </label>
            <button
              type="submit"
              disabled={publishedActiveScenarios.length === 0}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Giao Kịch Bản' : 'Assign Scenario'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'vi' ? 'Danh Sách Đã Giao' : 'Active Scenario Assignments'}
            </h3>
            <div className="divide-y divide-slate-100">
              {simulatorWorkspace.assignments.map((a) => {
                const emp = users.find((u) => u.id === a.learnerId);
                const scn = simulatorData.simulationScenarios.find((s) => s.id === a.scenarioId);
                return (
                  <div key={a.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">{scn ? (language === 'vi' ? scn.titleVi : scn.titleEn) : a.scenarioId}</div>
                      <div className="text-slate-500">
                        {emp?.name || a.learnerId} · Due {a.dueDate} · By {a.assignedByName}
                      </div>
                    </div>
                    <span className="font-mono font-semibold text-slate-700">{a.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOGS */}
      {adminSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>{language === 'vi' ? 'Nhật Ký Kiểm Toán Simulator' : 'Simulator Audit Logs'}</span>
          </h2>
          <div className="divide-y divide-slate-100 text-xs">
            {simulatorWorkspace.auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="font-mono font-bold text-slate-800">{log.action}</span>{' '}
                  <span className="text-slate-600">— {log.details}</span>
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  {log.actorName} · {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Relational Scenario Detail Preview Modal */}
      {previewScenario && (
        <ScenarioDetailPreviewModal
          scenario={previewScenario}
          onClose={() => setPreviewScenario(null)}
          onTransitionStatus={isLndOrAdmin ? transitionScenarioStatus : undefined}
          onLaunchSimulation={(id) => launchSimulationWorkspace(id, 'simWorkspace')}
        />
      )}
    </div>
  );
};
