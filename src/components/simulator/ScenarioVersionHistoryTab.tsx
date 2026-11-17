import React, { useMemo, useState } from 'react';
import {
  GitBranch,
  RefreshCw,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ScenarioImportErrorDoc, ScenarioVersionDoc } from '../../types';

export const ScenarioVersionHistoryTab: React.FC = () => {
  const {
    currentUser,
    language,
    scenarioVersions,
    scenarioImportJobs,
    simulatorData,
    refreshScenarioGovernance,
    setActiveTab,
  } = useApp();

  const canAccess = ['super_admin', 'lnd_manager', 'financial_controller', 'general_manager'].includes(
    currentUser.role
  );

  const [search, setSearch] = useState('');
  const [scenarioFilter, setScenarioFilter] = useState<string>('ALL');
  const [jobFilter, setJobFilter] = useState<string>('ALL');
  const [compareLeftId, setCompareLeftId] = useState<string>('');
  const [compareRightId, setCompareRightId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [inspectedJobErrors, setInspectedJobErrors] = useState<{
    jobId: string;
    errors: ScenarioImportErrorDoc[];
  } | null>(null);

  const filteredVersions = useMemo(() => {
    return scenarioVersions.filter((v) => {
      if (scenarioFilter !== 'ALL' && v.scenarioId !== scenarioFilter) return false;
      if (jobFilter !== 'ALL' && v.importJobId !== jobFilter && v.sourceImportJobId !== jobFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${v.scenarioCode} ${v.scenarioId} ${v.datasetVersion} ${v.changeSummary} ${
          v.snapshotSummary?.titleEn || ''
        } ${v.snapshotSummary?.titleVi || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scenarioVersions, scenarioFilter, jobFilter, search]);

  const leftVersion: ScenarioVersionDoc | undefined =
    scenarioVersions.find((v) => v.id === compareLeftId) || filteredVersions[1] || filteredVersions[0];
  const rightVersion: ScenarioVersionDoc | undefined =
    scenarioVersions.find((v) => v.id === compareRightId) || filteredVersions[0];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshScenarioGovernance();
    } finally {
      setRefreshing(false);
    }
  };

  const handleInspectJobErrors = async (jobId: string) => {
    if (inspectedJobErrors?.jobId === jobId) {
      setInspectedJobErrors(null);
      return;
    }
    const res = await fetch(`/api/simulator/import-jobs/${encodeURIComponent(jobId)}/errors`, {
      headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role },
    });
    if (res.ok) {
      const d = await res.json();
      setInspectedJobErrors({ jobId, errors: d.errors || [] });
    }
  };

  if (!canAccess) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-600">
          Scenario Version History is available only to Finance Supervisors, L&amp;D Managers, and Administrators.
        </p>
      </div>
    );
  }

  const fmtNum = (val?: number, suffix = '') =>
    val === undefined || val === null ? '—' : `${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;

  const compareRows: Array<{ label: string; a: string; b: string }> =
    leftVersion && rightVersion
      ? [
          { label: 'Scenario Code / ID', a: `${leftVersion.scenarioCode} (${leftVersion.scenarioId})`, b: `${rightVersion.scenarioCode} (${rightVersion.scenarioId})` },
          { label: 'Version / Dataset', a: `v${leftVersion.versionNumber} · ${leftVersion.datasetVersion}`, b: `v${rightVersion.versionNumber} · ${rightVersion.datasetVersion}` },
          { label: 'Lifecycle Status', a: `${leftVersion.status} (Active: ${leftVersion.isActive !== false ? 'Yes' : 'No'})`, b: `${rightVersion.status} (Active: ${rightVersion.isActive !== false ? 'Yes' : 'No'})` },
          { label: 'Title (EN)', a: leftVersion.snapshotSummary?.titleEn || '—', b: rightVersion.snapshotSummary?.titleEn || '—' },
          { label: 'Hotel Profile', a: leftVersion.snapshotSummary?.hotelId || '—', b: rightVersion.snapshotSummary?.hotelId || '—' },
          { label: 'Competencies', a: (leftVersion.snapshotSummary?.competencyIds || []).join(', ') || '—', b: (rightVersion.snapshotSummary?.competencyIds || []).join(', ') || '—' },
          { label: 'Total Revenue (Actual)', a: fmtNum(leftVersion.snapshotSummary?.totalRevenueActual), b: fmtNum(rightVersion.snapshotSummary?.totalRevenueActual) },
          { label: 'GOP (Actual)', a: fmtNum(leftVersion.snapshotSummary?.gopActual), b: fmtNum(rightVersion.snapshotSummary?.gopActual) },
          { label: 'GOP Margin %', a: fmtNum(leftVersion.snapshotSummary?.gopMarginPctActual, '%'), b: fmtNum(rightVersion.snapshotSummary?.gopMarginPctActual, '%') },
          { label: 'Tasks / Rubrics / Fin Rows', a: `${leftVersion.snapshotSummary?.tasksCount ?? '—'} / ${leftVersion.snapshotSummary?.rubricsCount ?? '—'} / ${leftVersion.snapshotSummary?.financialRowCount ?? leftVersion.snapshotSummary?.financialRows ?? '—'}`, b: `${rightVersion.snapshotSummary?.tasksCount ?? '—'} / ${rightVersion.snapshotSummary?.rubricsCount ?? '—'} / ${rightVersion.snapshotSummary?.financialRowCount ?? rightVersion.snapshotSummary?.financialRows ?? '—'}` },
          { label: 'Change Summary', a: leftVersion.changeSummary, b: rightVersion.changeSummary },
        ]
      : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-amber-700">
            SCENARIO GOVERNANCE · AUDITABLE VERSION TRAIL &amp; DIFF
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-amber-600" />
            <span>
              {language === 'vi' ? 'Lịch Sử Phiên Bản Kịch Bản Simulator' : 'Scenario Version History & Import Audit'}
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{language === 'vi' ? 'Làm Mới' : 'Refresh'}</span>
          </button>
          {['super_admin', 'lnd_manager'].includes(currentUser.role) && (
            <button
              onClick={() => setActiveTab('simImportCenter')}
              className="px-3.5 py-2 rounded-lg bg-[#0A192F] text-white font-semibold hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {language === 'vi' ? 'Mở Trung Tâm Nhập Kịch Bản' : 'Open Scenario Import Center'}
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={language === 'vi' ? 'Tìm mã kịch bản, thay đổi, dataset...' : 'Filter by code, summary, dataset...'}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-amber-500"
        />
        <select
          value={scenarioFilter}
          onChange={(e) => setScenarioFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-amber-500"
        >
          <option value="ALL">All Scenarios ({simulatorData.simulationScenarios.length})</option>
          {simulatorData.simulationScenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.scenarioCode} · {language === 'vi' ? s.titleVi : s.titleEn}
            </option>
          ))}
        </select>
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-amber-500"
        >
          <option value="ALL">All Import Jobs ({scenarioImportJobs.length})</option>
          {scenarioImportJobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.fileName} ({j.id.slice(0, 14)})
            </option>
          ))}
        </select>
        <div className="flex items-center justify-end font-mono text-slate-600 tabular-nums">
          Showing {filteredVersions.length} / {scenarioVersions.length} version snapshots
        </div>
      </div>

      {/* Side-by-side Version Comparison */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-amber-600" />
            <span>{language === 'vi' ? 'So Sánh Hai Phiên Bản Bất Kỳ' : 'Compare Any Two Versions'}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <select
              value={leftVersion?.id || ''}
              onChange={(e) => setCompareLeftId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
            >
              {scenarioVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  Baseline: {v.scenarioCode} v{v.versionNumber} ({v.datasetVersion})
                </option>
              ))}
            </select>
            <select
              value={rightVersion?.id || ''}
              onChange={(e) => setCompareRightId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
            >
              {scenarioVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  Target: {v.scenarioCode} v{v.versionNumber} ({v.datasetVersion})
                </option>
              ))}
            </select>
          </div>
        </div>

        {compareRows.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                  <th className="py-2 px-3 w-48">Attribute</th>
                  <th className="py-2 px-3">Version A (Baseline)</th>
                  <th className="py-2 px-3">Version B (Selected)</th>
                  <th className="py-2 px-3 w-24 text-right">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compareRows.map((row) => {
                  const changed = row.a !== row.b;
                  return (
                    <tr key={row.label} className={changed ? 'bg-amber-50/40' : ''}>
                      <td className="py-2 px-3 font-semibold text-slate-700">{row.label}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{row.a}</td>
                      <td className="py-2 px-3 font-mono text-slate-900 font-semibold">{row.b}</td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {changed ? (
                          <span className="text-amber-700 font-bold">Changed</span>
                        ) : (
                          <span className="text-slate-400">Same</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-slate-500">No version records available yet for comparison.</div>
        )}
      </div>

      {/* Version Timeline Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-700" />
          <span>{language === 'vi' ? 'Chuỗi Phiên Bản Kịch Bản' : 'Scenario Version Timeline'}</span>
        </h2>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                <th className="py-2.5 px-3">Scenario</th>
                <th className="py-2.5 px-3">Ver</th>
                <th className="py-2.5 px-3">Dataset</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Change Summary</th>
                <th className="py-2.5 px-3">Changed By &amp; Time</th>
                <th className="py-2.5 px-3 text-right">Compare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVersions.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3">
                    <div className="font-mono font-bold text-slate-900">{v.scenarioCode}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[240px]">
                      {language === 'vi' ? v.snapshotSummary?.titleVi : v.snapshotSummary?.titleEn}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold tabular-nums text-slate-900">
                    v{v.versionNumber}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">{v.datasetVersion}</td>
                  <td className="py-2.5 px-3 font-semibold">
                    <span
                      className={
                        v.status === 'Published'
                          ? 'text-emerald-700'
                          : v.status === 'Validated'
                          ? 'text-sky-700'
                          : v.status === 'Archived'
                          ? 'text-slate-400'
                          : 'text-amber-700'
                      }
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 max-w-sm">{v.changeSummary}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                    <div>{v.createdBy || v.changedByName || 'System'}</div>
                    <div>{v.createdAt || v.changedAt ? new Date(v.createdAt || v.changedAt!).toLocaleString() : '—'}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => setCompareLeftId(v.id)}
                      className="px-2 py-1 rounded border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Set A
                    </button>
                    <button
                      onClick={() => setCompareRightId(v.id)}
                      className="px-2 py-1 rounded border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Set B
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Import Jobs Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900">
          {language === 'vi' ? 'Nhật Ký Tác Vụ Import Workbook' : 'Scenario Import Job History'}
        </h2>
        {scenarioImportJobs.length === 0 ? (
          <div className="text-xs text-slate-500">No Excel import jobs executed yet.</div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                  <th className="py-2.5 px-3">Job &amp; File</th>
                  <th className="py-2.5 px-3">Mode / Strategy</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Created / Updated / Skipped / Err</th>
                  <th className="py-2.5 px-3">Executor &amp; Time</th>
                  <th className="py-2.5 px-3 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scenarioImportJobs.map((job) => (
                  <React.Fragment key={job.id}>
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{job.fileName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{job.id}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {job.mode || job.targetDestination || 'demo_local'} · {(job.strategy || job.importMode || 'skip').toUpperCase()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">
                        <span className="inline-flex items-center gap-1">
                          {job.status === 'completed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : job.status === 'interrupted' || job.status === 'partial_failure' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>{job.status}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                        {job.createdCount} / {job.updatedCount} / {job.skippedCount} / {job.errorCount ?? job.failedCount}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        <div>{job.performedByName || job.uploadedByName}</div>
                        <div>{new Date(job.startedAt).toLocaleString()}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleInspectJobErrors(job.id)}
                          className="px-2.5 py-1 rounded border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          {inspectedJobErrors?.jobId === job.id ? 'Hide Log' : 'View Errors'}
                        </button>
                      </td>
                    </tr>
                    {inspectedJobErrors?.jobId === job.id && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50 p-3 border-t border-slate-200">
                          {inspectedJobErrors.errors.length === 0 ? (
                            <span className="text-xs text-emerald-700 font-semibold">
                              Zero row errors recorded for this job.
                            </span>
                          ) : (
                            <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-[11px]">
                              {inspectedJobErrors.errors.map((err) => (
                                <div key={err.id} className="text-rose-700">
                                  [{err.sheetName} Row {err.rowNumber}] {err.recordId} ({err.field || err.fieldName}): {err.message}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
