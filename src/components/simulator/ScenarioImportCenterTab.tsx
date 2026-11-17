import React, { useMemo, useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RefreshCw,
  ShieldAlert,
  Eye,
  RotateCcw,
  SlidersHorizontal,
  Link2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { auth } from '../../lib/firebase';
import {
  commitCollectionToFirestore,
  getFirestoreCollectionDocs,
  saveScenarioCompetencyMappingToFirestore,
  writeScenarioImportErrorToFirestore,
  writeScenarioImportJobToFirestore,
  writeScenarioVersionToFirestore,
} from '../../lib/firestore';
import { ScenarioDetailPreviewModal } from './ScenarioDetailPreviewModal';
import type {
  ScenarioImportErrorDoc,
  SimulationScenarioStatus,
  SimulatorFinancialCheckResult,
  SimulatorImportStrategy,
  SimulatorScenarioPreviewSummary,
  SimulatorValidationBadge,
} from '../../types';

const PREVIEW_TABS = [
  { id: 'summary', label: 'Workbook Summary' },
  { id: 'scenarios', label: 'Scenario Master Preview' },
  { id: 'hotels', label: 'Hotel Profile Preview' },
  { id: 'financial', label: 'Financial Data Preview' },
  { id: 'operational', label: 'Operational Data Preview' },
  { id: 'tasks', label: 'Tasks Preview' },
  { id: 'roleplay', label: 'GM Roleplay Preview' },
  { id: 'competencies', label: 'Competency Mapping Preview' },
  { id: 'errors', label: 'Validation Errors' },
  { id: 'warnings', label: 'Warnings' },
] as const;

type PreviewTabId = (typeof PREVIEW_TABS)[number]['id'];

const SIMULATOR_COLLECTIONS_ORDER: Array<{ sheetName: string; collectionName: string }> = [
  { sheetName: 'Hotel_Profiles', collectionName: 'hotelSimulationProfiles' },
  { sheetName: 'Scenario_Master', collectionName: 'simulationScenarios' },
  { sheetName: 'Competency_Mapping', collectionName: 'simulationCompetencyMappings' },
  { sheetName: 'Financial_Dataset', collectionName: 'simulationFinancialData' },
  { sheetName: 'Operational_Dataset', collectionName: 'simulationOperationalData' },
  { sheetName: 'Business_Challenges', collectionName: 'simulationBusinessChallenges' },
  { sheetName: 'Learner_Tasks', collectionName: 'simulationTasks' },
  { sheetName: 'Reference_Analysis', collectionName: 'simulationReferenceAnalysis' },
  { sheetName: 'Decision_Options', collectionName: 'simulationDecisionOptions' },
  { sheetName: 'GM_Roleplay', collectionName: 'simulationRoleplayPrompts' },
  { sheetName: 'Evaluation_Rubric', collectionName: 'simulationEvaluationRubrics' },
];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

interface UnmappedCandidate {
  workbookCompetencyId: string;
  sheet: string;
  rows: number[];
  scenarioIds: string[];
  suggestedMatches: Array<{
    id: string;
    code: string;
    nameEn: string;
    nameVi: string;
    domainId: string;
  }>;
}

interface SheetSummaryRow {
  order: number;
  sheetName: string;
  collectionName: string;
  expectedCount: number;
  detectedHeaders: string[];
  headerRowNumber: number;
  detectedRows: number;
  validRows: number;
  invalidRows: number;
  errorCount: number;
  warningCount: number;
  newCount: number;
  existingDuplicateCount: number;
  duplicateIds: string[];
  validationStatus: 'valid' | 'warnings' | 'invalid';
}

interface ValidationResponsePayload {
  datasetType: string;
  importBatchId: string;
  fileName: string;
  schemaVersionDetected: string;
  toleranceUsed: number;
  readmeDetected: boolean;
  detectedSheets: string[];
  missingSheets: string[];
  ignoredSheets: string[];
  selectedSheets: string[];
  totalRowsDetected: number;
  totalScenariosDetected: number;
  validRecords: number;
  invalidRecords: number;
  errorCount: number;
  warningCount: number;
  financialChecksRun: number;
  financialChecksPassed: number;
  financialChecks: SimulatorFinancialCheckResult[];
  unmappedCompetencies: UnmappedCandidate[];
  sheetSummaries: SheetSummaryRow[];
  scenarioPreviews: SimulatorScenarioPreviewSummary[];
  errors: Array<{
    sheet: string;
    collection: string;
    row: number;
    field: string;
    recordId: string;
    scenarioId?: string;
    severity: 'error' | 'warning';
    reason: string;
  }>;
  warnings: Array<{
    sheet: string;
    collection: string;
    row: number;
    field: string;
    recordId: string;
    scenarioId?: string;
    severity: 'error' | 'warning';
    reason: string;
  }>;
  sanitizedByCollection: Record<string, Record<string, any>[]>;
}

export const ScenarioImportCenterTab: React.FC = () => {
  const {
    currentUser,
    language,
    competencies,
    scenarioImportJobs,
    scenarioCompetencyMappings,
    refreshSimulatorData,
    refreshSimulatorWorkspace,
    refreshScenarioGovernance,
    setActiveTab,
    showToast,
  } = useApp();

  const isAuthorizedAdmin =
    currentUser.role === 'super_admin' || currentUser.role === 'lnd_manager';

  const [fileName, setFileName] = useState<string>('');
  const [fileBase64, setFileBase64] = useState<string>('');
  const [financialTolerance, setFinancialTolerance] = useState<number>(0.02);
  const [duplicateStrategy, setDuplicateStrategy] = useState<SimulatorImportStrategy>('skip');
  const [defaultImportedStatus, setDefaultImportedStatus] = useState<SimulationScenarioStatus>('Validated');
  const [batchSize, setBatchSize] = useState<number>(25);
  const [targetMode, setTargetMode] = useState<'demo_local' | 'firebase_client' | 'firebase_admin'>('demo_local');
  const [allowPartialOnErrors, setAllowPartialOnErrors] = useState<boolean>(false);

  const [parsing, setParsing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);

  const [validation, setValidation] = useState<ValidationResponsePayload | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTabId>('summary');
  const [scenarioSearch, setScenarioSearch] = useState('');
  const [scenarioStatusFilter, setScenarioStatusFilter] = useState<'ALL' | SimulatorValidationBadge>('ALL');
  const [errorSearch, setErrorSearch] = useState('');
  const [inspectedPreview, setInspectedPreview] = useState<SimulatorScenarioPreviewSummary | null>(null);

  // Competency Mapping state: workbookCompetencyId -> lmsCompetencyId
  const [draftCompMap, setDraftCompMap] = useState<Record<string, string>>({});
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [columnMappingsBySheet, setColumnMappingsBySheet] = useState<Record<string, Record<string, string>>>({});
  const [mapperSheet, setMapperSheet] = useState<string>('Scenario_Master');

  const [executionResult, setExecutionResult] = useState<any>(null);
  const [inspectedJobErrors, setInspectedJobErrors] = useState<{
    jobId: string;
    errors: ScenarioImportErrorDoc[];
  } | null>(null);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'x-user-id': currentUser.id,
    'x-user-role': currentUser.role,
  });

  const runParseValidate = async (
    b64: string,
    name: string,
    overrideCompMap?: Record<string, string>,
    overrideColMaps?: Record<string, Record<string, string>>
  ) => {
    setParsing(true);
    setExecutionResult(null);
    try {
      const mergedCompMap = {
        ...Object.fromEntries(
          scenarioCompetencyMappings.map((m) => [m.workbookCompetencyId, m.lmsCompetencyId])
        ),
        ...(overrideCompMap || draftCompMap),
      };

      const res = await fetch('/api/import/parse-validate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          datasetType: 'simulator_starter',
          fileName: name,
          fileBase64: b64,
          competencyIdMap: mergedCompMap,
          financialTolerance,
          defaultImportedStatus,
          columnMappingsBySheet: overrideColMaps || columnMappingsBySheet,
          targetMode: targetMode === 'firebase_admin' ? 'firebase_admin' : 'demo_local',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to validate simulator workbook.', 'error');
        return;
      }
      setValidation(data.validation);
      if (data.savedCompetencyMappings) {
        setDraftCompMap((prev) => ({ ...data.savedCompetencyMappings, ...prev }));
      }
      if ((data.validation?.unmappedCompetencies || []).length > 0) {
        showToast(
          language === 'vi'
            ? `Phát hiện ${data.validation.unmappedCompetencies.length} mã năng lực chưa ánh xạ. Vui lòng ghép mã trước khi import.`
            : `Detected ${data.validation.unmappedCompetencies.length} unmapped Competency ID(s). Map them to existing LMS competencies below.`,
          'info'
        );
      } else {
        showToast(
          language === 'vi'
            ? `Đã kiểm tra ${data.validation.totalScenariosDetected} kịch bản (${data.validation.errorCount} lỗi).`
            : `Validated ${data.validation.totalScenariosDetected} scenarios (${data.validation.errorCount} errors).`,
          data.validation.errorCount > 0 ? 'error' : 'success'
        );
      }
    } catch (err: any) {
      showToast(err?.message || 'Parse/validate error.', 'error');
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const buf = await f.arrayBuffer();
    const b64 = arrayBufferToBase64(buf);
    setFileName(f.name);
    setFileBase64(b64);
    await runParseValidate(b64, f.name);
  };

  const handleLoadStarterWorkbook = async () => {
    setParsing(true);
    try {
      const res = await fetch('/api/import/template?dataset=simulator', {
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role },
      });
      if (!res.ok) {
        showToast('Unable to download starter workbook template.', 'error');
        return;
      }
      const buf = await res.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      const name = 'FC_Business_Partner_Simulator_Starter_Dataset.xlsx';
      setFileName(name);
      setFileBase64(b64);
      await runParseValidate(b64, name);
    } finally {
      setParsing(false);
    }
  };

  const handleDownloadStarterTemplate = async () => {
    const res = await fetch('/api/import/template?dataset=simulator', {
      headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role },
    });
    if (!res.ok) {
      showToast('Failed to download workbook.', 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'FC_Business_Partner_Simulator_Starter_Dataset.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveCompetencyMappings = async () => {
    if (!validation) return;
    const entries = validation.unmappedCompetencies
      .map((u) => ({
        workbookCompetencyId: u.workbookCompetencyId,
        lmsCompetencyId: draftCompMap[u.workbookCompetencyId] || '',
      }))
      .filter((m) => m.lmsCompetencyId);

    if (entries.length === 0) {
      showToast('Select at least one target LMS Competency before saving.', 'error');
      return;
    }

    setSavingMappings(true);
    try {
      const res = await fetch('/api/simulator/competency-mappings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ mappings: entries }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save competency mappings.', 'error');
        return;
      }

      if (auth.currentUser?.emailVerified && Array.isArray(data.saved)) {
        for (const docItem of data.saved) {
          await saveScenarioCompetencyMappingToFirestore(docItem).catch(() => {});
        }
      }

      await refreshScenarioGovernance();
      showToast(`Saved ${entries.length} verified competency mapping(s). Re-validating workbook...`, 'success');
      if (fileBase64) {
        await runParseValidate(fileBase64, fileName, data.mapObject || draftCompMap);
      }
    } finally {
      setSavingMappings(false);
    }
  };

  const handleDownloadErrorReport = async (format: 'xlsx' | 'csv') => {
    if (!validation) return;
    const issues = [...validation.errors, ...validation.warnings];
    const res = await fetch('/api/import/export-errors', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ issues, format }),
    });
    if (!res.ok) {
      showToast('Failed to export error report.', 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Simulator_Validation_Report.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteImport = async () => {
    if (!validation || !fileBase64) return;
    if (validation.errorCount > 0 && !allowPartialOnErrors) {
      showToast('Resolve blocking validation errors or enable partial import before executing.', 'error');
      return;
    }
    setExecuting(true);
    try {
      // Optional direct Firestore browser client commit when explicitly chosen
      if (targetMode === 'firebase_client') {
        if (!auth.currentUser?.emailVerified) {
          showToast('Sign in with a verified Firebase Admin account first to commit via Firebase Client.', 'error');
          return;
        }
        const jobId = `simjob_${Date.now()}`;
        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        for (const spec of SIMULATOR_COLLECTIONS_ORDER) {
          const rows = (validation.sanitizedByCollection[spec.collectionName] || []).map((r) => ({
            ...r,
            importBatchId: jobId,
          }));
          if (rows.length === 0) continue;
          const existing = await getFirestoreCollectionDocs(spec.collectionName);
          const out = await commitCollectionToFirestore(
            spec.collectionName,
            rows,
            existing.ids,
            duplicateStrategy
          );
          createdCount += out.createdCount;
          updatedCount += out.updatedCount;
          skippedCount += out.skippedCount;
          failedCount += out.failedCount;
        }
        await writeScenarioImportJobToFirestore({
          id: jobId,
          fileName,
          strategy: duplicateStrategy,
          mode: 'firebase_client',
          status: failedCount > 0 ? 'partial_failure' : 'completed',
          totalRows: validation.totalRowsDetected,
          validRows: validation.validRecords,
          errorCount: failedCount,
          warningCount: validation.warningCount,
          createdCount,
          updatedCount,
          skippedCount,
          failedCount,
          performedById: currentUser.id,
          performedByName: currentUser.name,
          performedByEmail: currentUser.email,
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
        for (const scn of validation.sanitizedByCollection.simulationScenarios || []) {
          await writeScenarioVersionToFirestore({
            id: `scnver_${scn.id}_v${scn.versionNumber || 1}_${Date.now()}`,
            scenarioId: scn.id,
            scenarioCode: scn.scenarioCode,
            versionNumber: Number(scn.versionNumber || 1),
            datasetVersion: scn.datasetVersion || '2026.v1',
            status: scn.status,
            isActive: scn.status === 'Published',
            changeSummary: `Firebase Client Excel import (${duplicateStrategy}) from ${fileName}`,
            importJobId: jobId,
            createdBy: currentUser.name,
            createdAt: new Date().toISOString(),
          }).catch(() => {});
        }
      }

      // Always execute through backend simulator pipeline (and Firebase Admin when selected)
      const apiMode = targetMode === 'firebase_admin' ? 'firebase_admin' : 'demo_local';
      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          datasetType: 'simulator_starter',
          fileName,
          fileBase64,
          duplicateStrategy,
          mode: apiMode,
          allowPartialOnErrors,
          competencyIdMap: draftCompMap,
          financialTolerance,
          defaultImportedStatus,
          batchSize,
          columnMappingsBySheet,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Import execution failed.', 'error');
        return;
      }

      setExecutionResult(data);
      await Promise.all([
        refreshSimulatorData(),
        refreshSimulatorWorkspace(),
        refreshScenarioGovernance(),
      ]);
      showToast(
        `Import completed: ${data.job?.createdCount ?? 0} created, ${data.job?.updatedCount ?? 0} updated, ${data.job?.skippedCount ?? 0} skipped.`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Import execution failed.', 'error');
    } finally {
      setExecuting(false);
    }
  };

  const handleResumeJob = async (jobId: string) => {
    setExecuting(true);
    try {
      const res = await fetch(`/api/simulator/import-jobs/${encodeURIComponent(jobId)}/resume`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ fileBase64: fileBase64 || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Resume import job failed.', 'error');
        return;
      }
      setExecutionResult(data);
      await Promise.all([
        refreshSimulatorData(),
        refreshSimulatorWorkspace(),
        refreshScenarioGovernance(),
      ]);
      showToast(`Resumed job ${jobId}: now ${data.job?.status}.`, 'success');
    } finally {
      setExecuting(false);
    }
  };

  const handleViewJobErrors = async (jobId: string) => {
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

  const filteredScenarios = useMemo(() => {
    if (!validation) return [];
    return validation.scenarioPreviews.filter((s) => {
      if (scenarioStatusFilter !== 'ALL' && s.badge !== scenarioStatusFilter) return false;
      if (scenarioSearch.trim()) {
        const q = scenarioSearch.trim().toLowerCase();
        const hay = `${s.scenarioCode} ${s.scenarioId} ${s.titleEn} ${s.titleVi} ${s.hotelName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [validation, scenarioSearch, scenarioStatusFilter]);

  const filteredErrors = useMemo(() => {
    if (!validation) return [];
    if (!errorSearch.trim()) return validation.errors;
    const q = errorSearch.trim().toLowerCase();
    return validation.errors.filter((e) =>
      `${e.sheet} ${e.recordId} ${e.field} ${e.reason}`.toLowerCase().includes(q)
    );
  }, [validation, errorSearch]);

  if (!isAuthorizedAdmin) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
        <ShieldAlert className="w-9 h-9 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Access Denied · Administrator or L&amp;D Manager Required</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          The Scenario Data Import Center is restricted strictly to Super Admin and L&amp;D Manager accounts to protect simulation reference data and USALI integrity.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-amber-700">
            FC BUSINESS PARTNER SIMULATOR · ENTERPRISE EXCEL PIPELINE
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-600" />
            <span>
              {language === 'vi'
                ? 'Trung Tâm Nhập Dữ Liệu Kịch Bản Simulator'
                : 'Scenario Data Import Center'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Supports 12-worksheet USALI simulation workbooks (README auto-excluded + 11 relational collections, scalable to 100+ scenarios).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={handleDownloadStarterTemplate}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download 12-Scenario Template</span>
          </button>
          <button
            onClick={handleLoadStarterWorkbook}
            disabled={parsing}
            className="px-3.5 py-2 rounded-lg bg-[#0A192F] text-white font-semibold hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-amber-400" />
            <span>{parsing ? 'Validating...' : 'Load Starter Workbook'}</span>
          </button>
          <label className="px-3.5 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload .xlsx</span>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-mono text-slate-500 mb-1">Duplicate Strategy</label>
          <select
            value={duplicateStrategy}
            onChange={(e) => setDuplicateStrategy(e.target.value as SimulatorImportStrategy)}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
          >
            <option value="skip">SKIP EXISTING (Default)</option>
            <option value="insert_new">INSERT NEW ONLY</option>
            <option value="update">UPDATE EXISTING</option>
            <option value="reject">REJECT DUPLICATES</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-500 mb-1">Default Status</label>
          <select
            value={defaultImportedStatus}
            onChange={(e) => setDefaultImportedStatus(e.target.value as SimulationScenarioStatus)}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
          >
            <option value="Validated">Validated (Recommended)</option>
            <option value="Draft">Draft (Review Required)</option>
            <option value="Published">Published (Immediate Live)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-500 mb-1">Financial Tolerance</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={financialTolerance}
            onChange={(e) => setFinancialTolerance(Number(e.target.value) || 0)}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-mono tabular-nums"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-500 mb-1">Chunk Batch Size</label>
          <input
            type="number"
            min="5"
            max="350"
            value={batchSize}
            onChange={(e) => setBatchSize(Math.max(5, Number(e.target.value) || 25))}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-mono tabular-nums"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-500 mb-1">Target Destination</label>
          <select
            value={targetMode}
            onChange={(e) => setTargetMode(e.target.value as any)}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
          >
            <option value="demo_local">Simulator Local Store</option>
            <option value="firebase_client">Firestore (Signed-In Auth)</option>
            <option value="firebase_admin">Firestore (Admin SDK)</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            disabled={!fileBase64 || parsing}
            onClick={() => runParseValidate(fileBase64, fileName)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold hover:bg-slate-100 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${parsing ? 'animate-spin' : ''}`} />
            <span>Re-Validate</span>
          </button>
        </div>
      </div>

      {/* Column Mapper Optional Toggle */}
      {validation && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-900">{validation.fileName}</span>
              <span className="text-slate-400">·</span>
              <span className="font-mono text-slate-700">{validation.schemaVersionDetected}</span>
              <span className="text-slate-400">·</span>
              <span className="font-mono text-slate-700">
                {validation.detectedSheets.length} worksheets detected
                {validation.readmeDetected ? ' (README auto-excluded from import)' : ''}
              </span>
            </div>
            <button
              onClick={() => setShowColumnMapper((p) => !p)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showColumnMapper ? 'Hide Column Mapper' : 'Custom Column Mapper'}</span>
            </button>
          </div>

          {showColumnMapper && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Worksheet Headers:</span>
                  <select
                    value={mapperSheet}
                    onChange={(e) => setMapperSheet(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-mono"
                  >
                    {validation.sheetSummaries.map((s) => (
                      <option key={s.sheetName} value={s.sheetName}>
                        {s.sheetName} ({s.detectedHeaders.length} cols)
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => runParseValidate(fileBase64, fileName)}
                  className="px-3 py-1 rounded-lg bg-[#0A192F] text-white font-semibold cursor-pointer"
                >
                  Apply Overrides &amp; Re-Validate
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {(validation.sheetSummaries.find((s) => s.sheetName === mapperSheet)?.detectedHeaders || []).map(
                  (hdr) => (
                    <div key={hdr} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <span className="font-mono text-[11px] text-slate-600 truncate flex-1">{hdr}</span>
                      <input
                        type="text"
                        placeholder="Canonical field override"
                        value={columnMappingsBySheet[mapperSheet]?.[hdr] || ''}
                        onChange={(e) =>
                          setColumnMappingsBySheet((prev) => ({
                            ...prev,
                            [mapperSheet]: {
                              ...(prev[mapperSheet] || {}),
                              [hdr]: e.target.value,
                            },
                          }))
                        }
                        className="w-36 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]"
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Top Validation Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
              <div className="text-[11px] text-slate-500">Scenarios Detected</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                {validation.totalScenariosDetected}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
              <div className="text-[11px] text-slate-500">Total Data Rows</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                {validation.totalRowsDetected}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
              <div className="text-[11px] text-slate-500">Valid Rows</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-700">
                {validation.validRecords}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
              <div className="text-[11px] text-slate-500">Blocking Errors</div>
              <div className={`text-lg font-bold font-mono tabular-nums ${validation.errorCount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {validation.errorCount}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
              <div className="text-[11px] text-slate-500">Warnings</div>
              <div className="text-lg font-bold font-mono tabular-nums text-amber-700">
                {validation.warningCount}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
              <div className="text-[11px] text-slate-500">USALI Audit Checks</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                {validation.financialChecksPassed} / {validation.financialChecksRun}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Competency Mapping Panel (when unmatched workbook Competency_IDs exist) */}
      {validation && validation.unmappedCompetencies.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-300 p-5 space-y-3 text-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-600" />
                <span>Interactive Competency Mapping Required ({validation.unmappedCompetencies.length} Unmatched IDs)</span>
              </h2>
              <p className="text-slate-600 mt-0.5">
                Unmatched workbook Competency IDs are <strong>never auto-created</strong> in the LMS Competency Framework. Map each ID below to an existing LMS competency, then save and re-validate.
              </p>
            </div>
            <button
              disabled={savingMappings}
              onClick={handleSaveCompetencyMappings}
              className="px-4 py-2 rounded-lg bg-[#0A192F] text-white font-semibold hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {savingMappings ? 'Saving...' : 'Save Mappings & Re-Validate'}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                  <th className="py-2 px-3">Workbook ID</th>
                  <th className="py-2 px-3">Rows &amp; Scenarios</th>
                  <th className="py-2 px-3">Quick Suggested Matches</th>
                  <th className="py-2 px-3">Map to Existing LMS Competency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validation.unmappedCompetencies.map((item) => (
                  <tr key={item.workbookCompetencyId}>
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-700">
                      {item.workbookCompetencyId}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      Rows {item.rows.join(', ')} · {item.scenarioIds.join(', ')}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1.5">
                        {item.suggestedMatches.slice(0, 3).map((sug) => (
                          <button
                            key={sug.id}
                            onClick={() =>
                              setDraftCompMap((p) => ({
                                ...p,
                                [item.workbookCompetencyId]: sug.id,
                              }))
                            }
                            className="px-2 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-amber-50 font-mono text-[11px] text-slate-800 cursor-pointer"
                          >
                            {sug.code}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={draftCompMap[item.workbookCompetencyId] || ''}
                        onChange={(e) =>
                          setDraftCompMap((p) => ({
                            ...p,
                            [item.workbookCompetencyId]: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                      >
                        <option value="">-- Select Existing LMS Competency --</option>
                        {competencies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} · {language === 'vi' ? c.nameVi : c.nameEn} ({c.id})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 10 Preview Tabs */}
      {validation && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
            {PREVIEW_TABS.map((tab) => {
              const count =
                tab.id === 'errors'
                  ? validation.errorCount
                  : tab.id === 'warnings'
                  ? validation.warningCount
                  : tab.id === 'scenarios'
                  ? validation.totalScenariosDetected
                  : undefined;
              return (
                <button
                  key={tab.id}
                  onClick={() => setPreviewTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    previewTab === tab.id
                      ? 'bg-[#0A192F] text-white'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  {count !== undefined ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>

          <div className="p-4 text-xs space-y-4">
            {/* TAB 1: WORKBOOK SUMMARY */}
            {previewTab === 'summary' && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Worksheet</th>
                      <th className="py-2.5 px-3">Firestore Collection</th>
                      <th className="py-2.5 px-3 text-right">Rows</th>
                      <th className="py-2.5 px-3 text-right">Valid</th>
                      <th className="py-2.5 px-3 text-right">Errors</th>
                      <th className="py-2.5 px-3 text-right">Duplicates</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {validation.readmeDetected && (
                      <tr className="bg-slate-50/70 text-slate-500">
                        <td className="py-2.5 px-3">0</td>
                        <td className="py-2.5 px-3 font-bold">README</td>
                        <td className="py-2.5 px-3">(Excluded from Firestore import)</td>
                        <td className="py-2.5 px-3 text-right">—</td>
                        <td className="py-2.5 px-3 text-right">—</td>
                        <td className="py-2.5 px-3 text-right">0</td>
                        <td className="py-2.5 px-3 text-right">0</td>
                        <td className="py-2.5 px-3 font-sans text-slate-500">Ignored</td>
                      </tr>
                    )}
                    {validation.sheetSummaries.map((sh) => (
                      <tr key={sh.sheetName} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-slate-500">{sh.order}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{sh.sheetName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{sh.collectionName}</td>
                        <td className="py-2.5 px-3 text-right">{sh.detectedRows}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">{sh.validRows}</td>
                        <td className={`py-2.5 px-3 text-right font-bold ${sh.errorCount > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                          {sh.errorCount}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-700">{sh.existingDuplicateCount}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold">
                          {sh.validationStatus === 'valid' ? (
                            <span className="text-emerald-700 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : sh.validationStatus === 'warnings' ? (
                            <span className="text-amber-700 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Warnings ({sh.warningCount})
                            </span>
                          ) : (
                            <span className="text-rose-700 inline-flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Invalid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: SCENARIO MASTER PREVIEW */}
            {previewTab === 'scenarios' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <input
                    type="text"
                    value={scenarioSearch}
                    onChange={(e) => setScenarioSearch(e.target.value)}
                    placeholder="Filter scenarios by code, ID, title, or hotel..."
                    className="px-3 py-2 rounded-lg border border-slate-200 w-72 focus:outline-none focus:border-amber-500"
                  />
                  <select
                    value={scenarioStatusFilter}
                    onChange={(e) => setScenarioStatusFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="READY TO IMPORT">READY TO IMPORT</option>
                    <option value="VALID">VALID</option>
                    <option value="DUPLICATE">DUPLICATE</option>
                    <option value="WARNING">WARNING</option>
                    <option value="INVALID">INVALID</option>
                  </select>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                        <th className="py-2.5 px-3">Scenario Code</th>
                        <th className="py-2.5 px-3">Title &amp; Hotel</th>
                        <th className="py-2.5 px-3 text-right">Fin / Ops</th>
                        <th className="py-2.5 px-3 text-right">Tasks / GM</th>
                        <th className="py-2.5 px-3 text-right">Rubric %</th>
                        <th className="py-2.5 px-3">Validation Status</th>
                        <th className="py-2.5 px-3 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredScenarios.map((scn) => (
                        <tr key={scn.scenarioId} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {scn.scenarioCode}
                            <div className="text-[11px] font-normal text-slate-500">{scn.scenarioId}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{language === 'vi' ? scn.titleVi : scn.titleEn}</div>
                            <div className="text-[11px] text-slate-500">{scn.hotelName} · {scn.periodLabel}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            {scn.childCounts.financialRows} / {scn.childCounts.operationalRows}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            {scn.childCounts.tasks} / {scn.childCounts.roleplayPrompts}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${Math.abs(scn.rubricWeightSum - 100) <= 0.05 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {scn.rubricWeightSum}%
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            <span
                              className={
                                scn.badge === 'INVALID'
                                  ? 'text-rose-700'
                                  : scn.badge === 'DUPLICATE' || scn.badge === 'WARNING'
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }
                            >
                              {scn.badge}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setInspectedPreview(scn)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: HOTEL PROFILE PREVIEW */}
            {previewTab === 'hotels' && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                      <th className="py-2 px-3">ID / Code</th>
                      <th className="py-2 px-3">Hotel Name</th>
                      <th className="py-2 px-3">Brand Tier</th>
                      <th className="py-2 px-3">City</th>
                      <th className="py-2 px-3 text-right">Keys / Avail</th>
                      <th className="py-2 px-3">Currency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(validation.sanitizedByCollection.hotelSimulationProfiles || []).map((h: any) => (
                      <tr key={h.id}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{h.id} · {h.hotelCode}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{h.hotelName}</td>
                        <td className="py-2 px-3 text-slate-600">{h.brandTier}</td>
                        <td className="py-2 px-3 text-slate-600">{h.city}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{h.totalKeys} / {h.roomsAvailable}</td>
                        <td className="py-2 px-3 font-mono">{h.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: FINANCIAL DATA PREVIEW */}
            {previewTab === 'financial' && (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                      <tr>
                        <th className="py-2 px-3">Scenario</th>
                        <th className="py-2 px-3">Period / Ver</th>
                        <th className="py-2 px-3">Dept</th>
                        <th className="py-2 px-3 text-right">Dept Rev</th>
                        <th className="py-2 px-3 text-right">Dept Profit</th>
                        <th className="py-2 px-3 text-right">Total Rev</th>
                        <th className="py-2 px-3 text-right">GOP</th>
                        <th className="py-2 px-3 text-right">GOP %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                      {(validation.sanitizedByCollection.simulationFinancialData || []).map((f: any) => (
                        <tr key={f.id}>
                          <td className="py-2 px-3 font-bold text-slate-900">{f.scenarioId}</td>
                          <td className="py-2 px-3">{f.periodLabel} · {f.version}</td>
                          <td className="py-2 px-3">{f.departmentCode}</td>
                          <td className="py-2 px-3 text-right">{Number(f.departmentalRevenue || 0).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-semibold">{Number(f.departmentalProfit || 0).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right">{Number(f.totalOperatingRevenue || 0).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{Number(f.gop || 0).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-amber-700 font-bold">{Number(f.gopMarginPct || 0).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {validation.financialChecks.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 font-bold text-slate-900">
                      USALI Arithmetic Checks ({validation.financialChecksPassed} / {validation.financialChecksRun} passed within tolerance ±{validation.toleranceUsed})
                    </div>
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {validation.financialChecks.filter((c) => !c.passed).map((c) => (
                        <div key={c.id} className="px-4 py-2 text-rose-700 font-mono text-[11px]">
                          [{c.scenarioId} Row {c.row}] {c.formulaName}: {c.message} (Diff: {c.difference})
                        </div>
                      ))}
                      {validation.financialChecks.every((c) => c.passed) && (
                        <div className="px-4 py-3 text-emerald-700 font-semibold">
                          All {validation.financialChecksRun} deterministic financial consistency formulas passed.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: OPERATIONAL DATA PREVIEW */}
            {previewTab === 'operational' && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                    <tr>
                      <th className="py-2 px-3">Scenario</th>
                      <th className="py-2 px-3">Period / Ver</th>
                      <th className="py-2 px-3 text-right">Avail</th>
                      <th className="py-2 px-3 text-right">Sold</th>
                      <th className="py-2 px-3 text-right">Occ %</th>
                      <th className="py-2 px-3 text-right">ADR</th>
                      <th className="py-2 px-3 text-right">RevPAR</th>
                      <th className="py-2 px-3 text-right">Rooms Rev</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {(validation.sanitizedByCollection.simulationOperationalData || []).map((o: any) => (
                      <tr key={o.id}>
                        <td className="py-2 px-3 font-bold text-slate-900">{o.scenarioId}</td>
                        <td className="py-2 px-3">{o.periodLabel} · {o.version}</td>
                        <td className="py-2 px-3 text-right">{Number(o.roomsAvailable).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right">{Number(o.roomsSold).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-semibold">{Number(o.occupancyPct).toFixed(2)}%</td>
                        <td className="py-2 px-3 text-right">{Number(o.adr).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right">{Number(o.revpar).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-semibold">{Number(o.roomsRevenue).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 6: TASKS PREVIEW */}
            {previewTab === 'tasks' && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                    <tr>
                      <th className="py-2 px-3">Scenario</th>
                      <th className="py-2 px-3">Order / Task ID</th>
                      <th className="py-2 px-3">Title</th>
                      <th className="py-2 px-3">Deliverable</th>
                      <th className="py-2 px-3 text-right">Max Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(validation.sanitizedByCollection.simulationTasks || []).map((tk: any) => (
                      <tr key={tk.id}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{tk.scenarioId}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">#{tk.taskOrder} · {tk.taskId || tk.id}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{language === 'vi' ? tk.titleVi : tk.titleEn}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{tk.deliverableType}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{tk.maxPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 7: GM ROLEPLAY PREVIEW */}
            {previewTab === 'roleplay' && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                    <tr>
                      <th className="py-2 px-3">Scenario</th>
                      <th className="py-2 px-3">Turn / Roleplay ID</th>
                      <th className="py-2 px-3">Speaker</th>
                      <th className="py-2 px-3">Prompt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(validation.sanitizedByCollection.simulationRoleplayPrompts || []).map((rp: any) => (
                      <tr key={rp.id}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{rp.scenarioId}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">Turn #{rp.turnOrder} · {rp.roleplayId || rp.id}</td>
                        <td className="py-2 px-3 font-semibold text-amber-700">{rp.speakerRole}</td>
                        <td className="py-2 px-3 text-slate-700 max-w-lg">{language === 'vi' ? rp.promptVi : rp.promptEn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 8: COMPETENCY MAPPING PREVIEW */}
            {previewTab === 'competencies' && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                    <tr>
                      <th className="py-2 px-3">Scenario</th>
                      <th className="py-2 px-3">Resolved LMS Competency</th>
                      <th className="py-2 px-3">Workbook ID</th>
                      <th className="py-2 px-3 text-right">Target Level</th>
                      <th className="py-2 px-3 text-right">Weight %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {(validation.sanitizedByCollection.simulationCompetencyMappings || []).map((cm: any) => (
                      <tr key={cm.id}>
                        <td className="py-2 px-3 font-bold text-slate-900">{cm.scenarioId}</td>
                        <td className="py-2 px-3 text-emerald-700 font-bold">
                          {cm.competencyCode || cm.competencyId} · {cm.competencyNameEn || ''}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{cm.workbookCompetencyId || cm.competencyId}</td>
                        <td className="py-2 px-3 text-right">L{cm.targetProficiencyLevel}</td>
                        <td className="py-2 px-3 text-right">{cm.weightPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 9: VALIDATION ERRORS */}
            {previewTab === 'errors' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <input
                    type="text"
                    value={errorSearch}
                    onChange={(e) => setErrorSearch(e.target.value)}
                    placeholder="Filter errors by sheet, record ID, field..."
                    className="px-3 py-2 rounded-lg border border-slate-200 w-72"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadErrorReport('csv')}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> CSV Report
                    </button>
                    <button
                      onClick={() => handleDownloadErrorReport('xlsx')}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Excel Error Report
                    </button>
                  </div>
                </div>

                {filteredErrors.length === 0 ? (
                  <div className="p-6 text-center text-emerald-700 font-semibold border border-slate-200 rounded-xl">
                    Zero blocking validation errors detected across all sheets.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                        <tr>
                          <th className="py-2 px-3">Sheet</th>
                          <th className="py-2 px-3 text-right">Row</th>
                          <th className="py-2 px-3">Record ID</th>
                          <th className="py-2 px-3">Field</th>
                          <th className="py-2 px-3">Error Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredErrors.map((err, i) => (
                          <tr key={`${err.sheet}_${err.row}_${i}`} className="text-rose-800">
                            <td className="py-2 px-3 font-mono font-bold">{err.sheet}</td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">{err.row}</td>
                            <td className="py-2 px-3 font-mono">{err.recordId}</td>
                            <td className="py-2 px-3 font-mono">{err.field}</td>
                            <td className="py-2 px-3">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 10: WARNINGS */}
            {previewTab === 'warnings' && (
              <div className="space-y-2">
                {validation.warnings.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 border border-slate-200 rounded-xl">
                    Zero warnings reported.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                        <tr>
                          <th className="py-2 px-3">Sheet</th>
                          <th className="py-2 px-3 text-right">Row</th>
                          <th className="py-2 px-3">Record ID</th>
                          <th className="py-2 px-3">Field</th>
                          <th className="py-2 px-3">Warning</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {validation.warnings.map((w, i) => (
                          <tr key={`${w.sheet}_${w.row}_${i}`} className="text-amber-800">
                            <td className="py-2 px-3 font-mono font-bold">{w.sheet}</td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">{w.row}</td>
                            <td className="py-2 px-3 font-mono">{w.recordId}</td>
                            <td className="py-2 px-3 font-mono">{w.field}</td>
                            <td className="py-2 px-3">{w.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Execute Bar */}
          <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPartialOnErrors}
                onChange={(e) => setAllowPartialOnErrors(e.target.checked)}
              />
              <span>
                Allow partial import of valid rows when errors exist ({validation.validRecords} valid / {validation.invalidRecords} invalid)
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {validation.errorCount > 0 && !allowPartialOnErrors && (
                <span className="text-rose-700 font-semibold">
                  Fix {validation.errorCount} blocking error(s) or enable partial import.
                </span>
              )}
              <button
                disabled={executing || (validation.errorCount > 0 && !allowPartialOnErrors)}
                onClick={handleExecuteImport}
                className="px-5 py-2.5 rounded-lg bg-[#0A192F] text-white font-bold hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-amber-400" />
                <span>{executing ? 'Executing Batch Import...' : 'Execute Scenario Import'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Summary Banner */}
      {executionResult && (
        <div className="bg-white rounded-xl border border-emerald-300 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900">
                Import Job {executionResult.job?.id} — {executionResult.job?.status?.toUpperCase()}
              </div>
              <div className="font-mono text-slate-700 mt-0.5 tabular-nums">
                Created: <strong>{executionResult.job?.createdCount ?? 0}</strong> · Updated:{' '}
                <strong>{executionResult.job?.updatedCount ?? 0}</strong> · Skipped:{' '}
                <strong>{executionResult.job?.skippedCount ?? 0}</strong> · Errors:{' '}
                <strong>{executionResult.job?.errorCount ?? 0}</strong>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('simAdmin')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              Manage &amp; Publish Scenarios
            </button>
            <button
              onClick={() => setActiveTab('simVersionHistory')}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 cursor-pointer"
            >
              View Version History
            </button>
          </div>
        </div>
      )}

      {/* Import Jobs & Resumable Recovery History */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Recent Scenario Import Jobs &amp; Batch Recovery ({scenarioImportJobs.length})
          </h2>
          <button
            onClick={() => refreshScenarioGovernance()}
            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Sync Jobs
          </button>
        </div>

        {scenarioImportJobs.length === 0 ? (
          <div className="text-xs text-slate-500">No scenario import jobs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500 text-left">
                  <th className="py-2.5 px-3">Job ID &amp; File</th>
                  <th className="py-2.5 px-3">Strategy</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Created / Updated / Skipped / Fail</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scenarioImportJobs.map((job) => (
                  <React.Fragment key={job.id}>
                    <tr>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{job.fileName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{job.id}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {(job.strategy || job.importMode || 'skip').toUpperCase()} · {job.mode || job.targetDestination || 'demo_local'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">
                        <span
                          className={
                            job.status === 'completed'
                              ? 'text-emerald-700'
                              : job.status === 'interrupted' || job.status === 'partial_failure'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {job.createdCount} / {job.updatedCount} / {job.skippedCount} / {job.failedCount}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {new Date(job.startedAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                        {(job.status === 'interrupted' || job.status === 'partial_failure') && (
                          <button
                            disabled={executing}
                            onClick={() => handleResumeJob(job.id)}
                            className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> Resume
                          </button>
                        )}
                        <button
                          onClick={() => handleViewJobErrors(job.id)}
                          className="px-2.5 py-1 rounded border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          {inspectedJobErrors?.jobId === job.id ? 'Hide Errors' : 'Errors'}
                        </button>
                      </td>
                    </tr>
                    {inspectedJobErrors?.jobId === job.id && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50 p-3 border-t border-slate-200">
                          {inspectedJobErrors.errors.length === 0 ? (
                            <span className="text-emerald-700 font-semibold">No errors recorded for this job.</span>
                          ) : (
                            <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-[11px]">
                              {inspectedJobErrors.errors.map((err) => (
                                <div key={err.id} className="text-rose-700">
                                  [{err.sheetName} Row {err.rowNumber}] {err.recordId}: {err.message}
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

      {/* Scenario Detail Preview Modal */}
      {inspectedPreview && (
        <ScenarioDetailPreviewModal
          previewSummary={inspectedPreview}
          onClose={() => setInspectedPreview(null)}
        />
      )}
    </div>
  );
};
