import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  auth,
  firebaseConfigSummary,
  testFirestoreConnection,
  signInWithFirebaseGoogle,
  signOutFirebase,
  subscribeFirebaseAuth,
  getFirestoreCollectionDocs,
  fetchImportLogsFromFirestore,
  writeImportLogToFirestore,
  commitCollectionToFirestore,
} from '../../lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  RefreshCw,
  ShieldCheck,
  Database,
  ArrowRight,
  ArrowLeft,
  History,
  CheckSquare,
  Square,
  Layers,
  LogIn,
  LogOut,
  Info,
  Sparkles,
  FileWarning,
  ShieldAlert,
} from 'lucide-react';

type DuplicateStrategy = 'skip' | 'update' | 'reject';
type ExecutionTarget = 'firebase_client' | 'firebase_admin' | 'demo_local';

interface SheetSpec {
  order: number;
  sheetName: string;
  collectionName: string;
  expectedCount: number;
  labelEn: string;
  labelVi: string;
  dependencies: string[];
}

interface ValidationIssue {
  sheet: string;
  collection: string;
  row: number;
  field: string;
  recordId: string;
  severity: 'error' | 'warning';
  reason: string;
}

interface SheetSummaryPreview {
  order: number;
  sheetName: string;
  collectionName: string;
  expectedCount: number;
  detectedHeaders?: string[];
  headerRowNumber?: number;
  detectedRows: number;
  validRows: number;
  invalidRows: number;
  errorCount: number;
  warningCount: number;
  newCount: number;
  existingDuplicateCount: number;
  duplicateIds: string[];
  validationStatus: 'valid' | 'warnings' | 'invalid';
  previewRows: Record<string, any>[];
}

interface ParseValidateResult {
  importBatchId: string;
  fileName: string;
  readmeDetected: boolean;
  detectedSheets: string[];
  ignoredSheets: string[];
  selectedSheets: string[];
  totalRowsDetected: number;
  validRecords: number;
  invalidRecords: number;
  errorCount: number;
  warningCount: number;
  sheetSummaries: SheetSummaryPreview[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  sanitizedByCollection: Record<string, Record<string, any>[]>;
}

interface VerificationResult {
  verificationPassed: boolean;
  checkedAt: string;
  source: 'firebase_admin' | 'firebase_client' | 'demo_local';
  counts: Array<{
    collection: string;
    sheetName: string;
    actual: number;
    expected: number;
    matchesExpected: boolean;
  }>;
  relationshipChecks: Array<{
    check: string;
    passed: boolean;
    brokenReferences: number;
    details: string;
  }>;
}

export const DataImportCenterView: React.FC = () => {
  const { currentUser, language, showToast } = useApp();
  const isVi = language === 'vi';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'lnd_manager';

  // Wizard Step (1..5)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Firebase Auth & Infrastructure Status
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [firestorePing, setFirestorePing] = useState<{ ok: boolean; message: string } | null>(null);
  const [serverStatus, setServerStatus] = useState<{
    adminSdkAvailable: boolean;
    adminSdkReason: string;
    importOrderSpec: SheetSpec[];
    demoCounts: Record<string, number>;
    adminCounts: Record<string, number> | null;
  } | null>(null);

  // Workbook state
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileSize, setUploadedFileSize] = useState<number>(0);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [detectedSheets, setDetectedSheets] = useState<SheetSpec[]>([]);
  const [readmeDetected, setReadmeDetected] = useState<boolean>(false);
  const [unknownSheets, setUnknownSheets] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);

  // Parse/Validate state
  const [isParsing, setIsParsing] = useState(false);
  const [validationResult, setValidationResult] = useState<ParseValidateResult | null>(null);
  const [activePreviewSheet, setActivePreviewSheet] = useState<string>('');
  const [issueSeverityFilter, setIssueSeverityFilter] = useState<'all' | 'error' | 'warning'>('all');

  // Step 4 Confirm & Execution state
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip');
  const [executionTarget, setExecutionTarget] = useState<ExecutionTarget>('demo_local');
  const [allowPartialOnErrors, setAllowPartialOnErrors] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressState, setProgressState] = useState<{
    percent: number;
    currentCollection: string;
    detail: string;
  }>({ percent: 0, currentCollection: '', detail: '' });

  // Step 5 Results, Verification & History
  const [importLogResult, setImportLogResult] = useState<Record<string, any> | null>(null);
  const [runtimeFailures, setRuntimeFailures] = useState<ValidationIssue[]>([]);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [importHistory, setImportHistory] = useState<Record<string, any>[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      'x-user-id': currentUser.id,
      'x-user-role': currentUser.role,
    }),
    [currentUser.id, currentUser.role]
  );

  // Subscribe Firebase Google Auth state
  useEffect(() => {
    const unsub = subscribeFirebaseAuth((user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  // Load connection status + logs
  const loadImportStatusAndLogs = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      const [ping, statusRes, logsRes] = await Promise.all([
        testFirestoreConnection(),
        fetch('/api/import/status', { headers: { 'x-user-id': currentUser.id } }),
        fetch('/api/import/logs', { headers: { 'x-user-id': currentUser.id } }),
      ]);
      setFirestorePing(ping);
      if (statusRes.ok) {
        const sData = await statusRes.json();
        setServerStatus(sData);
        if (sData.adminSdkAvailable) {
          setExecutionTarget('firebase_admin');
        } else if (auth.currentUser) {
          setExecutionTarget('firebase_client');
        } else {
          setExecutionTarget('demo_local');
        }
      }

      const combinedLogs: Record<string, any>[] = [];
      if (logsRes.ok) {
        const lData = await logsRes.json();
        if (Array.isArray(lData.firebaseLogs)) combinedLogs.push(...lData.firebaseLogs);
        if (Array.isArray(lData.demoLogs)) combinedLogs.push(...lData.demoLogs);
      }

      if (auth.currentUser) {
        try {
          const fsLogs = await fetchImportLogsFromFirestore(25);
          combinedLogs.unshift(...fsLogs);
        } catch {
          // ignore if user doesn't have admin claim in Firestore yet
        }
      }

      // Deduplicate by id sorted newest first
      const seen = new Set<string>();
      const deduped = combinedLogs
        .filter((l) => {
          if (!l?.id || seen.has(l.id)) return false;
          seen.add(l.id);
          return true;
        })
        .sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')));
      setImportHistory(deduped);
    } catch (err) {
      console.warn('Could not load import status:', err);
    }
  }, [currentUser.id, isAuthorized]);

  useEffect(() => {
    loadImportStatusAndLogs();
  }, [loadImportStatusAndLogs]);

  // Switch default execution target cleanly when Firebase user logs in/out
  useEffect(() => {
    if (serverStatus?.adminSdkAvailable) {
      setExecutionTarget('firebase_admin');
    } else if (firebaseUser) {
      setExecutionTarget('firebase_client');
    } else {
      setExecutionTarget('demo_local');
    }
  }, [firebaseUser, serverStatus?.adminSdkAvailable]);

  // Fetch existing IDs from target before validation
  const gatherExistingIds = useCallback(
    async (target: ExecutionTarget): Promise<Record<string, string[]> | undefined> => {
      if (target === 'firebase_client' && auth.currentUser && serverStatus?.importOrderSpec) {
        const out: Record<string, string[]> = {};
        for (const spec of serverStatus.importOrderSpec) {
          try {
            const snap = await getFirestoreCollectionDocs(spec.collectionName);
            out[spec.collectionName] = Array.from(snap.ids);
          } catch {
            out[spec.collectionName] = [];
          }
        }
        return out;
      }
      return undefined; // Server handles Admin SDK or Demo Local Store lookup automatically
    },
    [serverStatus?.importOrderSpec]
  );

  // Core parse + validate runner
  const runParseAndValidate = useCallback(
    async (
      name: string,
      base64: string,
      sheetsToUse?: string[],
      advanceStepTo?: 2 | 3
    ) => {
      setIsParsing(true);
      try {
        const existingIdsByCollection = await gatherExistingIds(executionTarget);
        const res = await fetch('/api/import/parse-validate', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            fileName: name,
            fileBase64: base64,
            selectedSheets: sheetsToUse,
            existingIdsByCollection,
            targetMode: executionTarget,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Failed to parse workbook.', 'error');
          return;
        }

        const det: {
          readmeDetected: boolean;
          businessSheets: SheetSpec[];
          unknownSheets: string[];
        } = data.sheetDetection;
        const val: ParseValidateResult = data.validation;

        setReadmeDetected(det.readmeDetected);
        setDetectedSheets(det.businessSheets);
        setUnknownSheets(det.unknownSheets || []);
        if (!sheetsToUse || sheetsToUse.length === 0) {
          setSelectedSheets(det.businessSheets.map((s) => s.sheetName));
        }
        setValidationResult(val);
        if (val.sheetSummaries.length > 0) {
          setActivePreviewSheet(val.sheetSummaries[0].sheetName);
        }
        if (advanceStepTo) {
          setStep(advanceStepTo);
        }
      } catch (err: any) {
        showToast(err?.message || 'Error parsing workbook.', 'error');
      } finally {
        setIsParsing(false);
      }
    },
    [authHeaders, executionTarget, gatherExistingIds, showToast]
  );

  const handleFileSelected = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      showToast(
        isVi ? 'Vui lòng chọn tệp Excel (.xlsx).' : 'Please select an Excel workbook (.xlsx).',
        'error'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = String(ev.target?.result || '');
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      setUploadedFileName(file.name);
      setUploadedFileSize(file.size);
      setFileBase64(base64);
      setImportLogResult(null);
      setVerificationResult(null);
      await runParseAndValidate(file.name, base64, undefined, 2);
      showToast(
        isVi ? `Đã phân tích tệp ${file.name}.` : `Parsed workbook ${file.name}.`,
        'success'
      );
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/import/template', {
        headers: { 'x-user-id': currentUser.id },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to download template.', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FC_Learning_Academy_Training_Dataset_2027_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(
        isVi
          ? 'Đã tải xuống tệp mẫu chuẩn 2027 (.xlsx).'
          : 'Downloaded 2027 official Excel template (.xlsx).',
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Template download error.', 'error');
    }
  };

  const handleLoadOfficialSample = async () => {
    try {
      setIsParsing(true);
      const res = await fetch('/api/import/template', {
        headers: { 'x-user-id': currentUser.id },
      });
      if (!res.ok) {
        showToast('Unable to load official dataset template.', 'error');
        setIsParsing(false);
        return;
      }
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const officialName = 'FC_Learning_Academy_Training_Dataset_2027.xlsx';
      setUploadedFileName(officialName);
      setUploadedFileSize(bytes.byteLength);
      setFileBase64(base64);
      setImportLogResult(null);
      setVerificationResult(null);
      await runParseAndValidate(officialName, base64, undefined, 2);
      showToast(
        isVi
          ? 'Đã nạp bộ dữ liệu chuẩn 2027 (259 bản ghi / 9 sheet + README).'
          : 'Loaded 2027 official workbook (259 records across 9 sheets + README).',
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to load official sample.', 'error');
      setIsParsing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithFirebaseGoogle();
      showToast(
        isVi
          ? `Đã kết nối Firebase Auth: ${user.email}`
          : `Connected Firebase Auth: ${user.email}`,
        'success'
      );
      await loadImportStatusAndLogs();
    } catch (err: any) {
      showToast(err?.message || 'Google Sign-In failed.', 'error');
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutFirebase();
    showToast(isVi ? 'Đã đăng xuất Firebase Auth.' : 'Signed out of Firebase Auth.', 'info');
  };

  const handleExportErrorReport = async (format: 'xlsx' | 'csv') => {
    if (!validationResult) return;
    const dedupIssues =
      runtimeFailures.length > 0
        ? [...runtimeFailures, ...validationResult.warnings]
        : [...validationResult.errors, ...validationResult.warnings];
    try {
      const res = await fetch('/api/import/export-errors', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ issues: dedupIssues, format }),
      });
      if (!res.ok) {
        showToast('Failed to export validation report.', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FC_Import_Error_Report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast(err?.message || 'Error exporting report.', 'error');
    }
  };

  const runPostImportVerification = async (target: ExecutionTarget) => {
    setIsVerifying(true);
    try {
      if (target === 'firebase_client' && auth.currentUser && serverStatus?.importOrderSpec) {
        const snapshot: Record<string, Record<string, Record<string, any>>> = {};
        for (const spec of serverStatus.importOrderSpec) {
          const { docs } = await getFirestoreCollectionDocs(spec.collectionName);
          snapshot[spec.collectionName] = {};
          docs.forEach((d) => {
            snapshot[spec.collectionName][String(d.id)] = d;
          });
        }
        const res = await fetch('/api/import/verify', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ source: 'firebase_client', collectionsSnapshot: snapshot }),
        });
        const data = await res.json();
        if (res.ok && data.verification) {
          setVerificationResult(data.verification);
        }
      } else {
        const source = target === 'firebase_admin' ? 'firebase_admin' : 'demo_local';
        const res = await fetch('/api/import/verify', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ source }),
        });
        const data = await res.json();
        if (res.ok && data.verification) {
          setVerificationResult(data.verification);
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Verification failed.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Execute Import (Firebase Client WriteBatch OR Server Firebase Admin / Demo Local Store)
  const handleConfirmImport = async () => {
    if (!validationResult || !fileBase64) return;
    if (validationResult.errorCount > 0 && !allowPartialOnErrors) {
      showToast(
        isVi
          ? 'Tồn tại lỗi dữ liệu. Hãy sửa tệp hoặc bật tùy chọn chỉ nhập các dòng hợp lệ.'
          : 'Validation errors remain. Fix errors or enable partial import for valid rows only.',
        'error'
      );
      return;
    }

    setIsExecuting(true);
    const startedAt = new Date().toISOString();
    setProgressState({
      percent: 5,
      currentCollection: 'Preparing',
      detail: isVi ? 'Đang khởi tạo phiên nhập dữ liệu...' : 'Initializing import batch...',
    });

    try {
      if (executionTarget === 'firebase_client') {
        if (!auth.currentUser) {
          showToast(
            isVi ? 'Vui lòng đăng nhập Google (Firebase Auth) trước.' : 'Please sign in with Google first.',
            'error'
          );
          setIsExecuting(false);
          return;
        }

        const specs = (serverStatus?.importOrderSpec || []).filter((sp) =>
          selectedSheets.some((s) => s.toLowerCase() === sp.sheetName.toLowerCase())
        );

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let failedCount = validationResult.invalidRecords;
        const collectedFailures: ValidationIssue[] = [...validationResult.errors];
        const executionSheetResults: any[] = [];
        const collectionsSnapshot: Record<string, Record<string, Record<string, any>>> = {};

        for (let idx = 0; idx < specs.length; idx++) {
          const spec = specs[idx];
          setProgressState({
            percent: Math.round(((idx + 0.2) / specs.length) * 90),
            currentCollection: spec.collectionName,
            detail: `${idx + 1}/${specs.length}: ${spec.sheetName} -> ${spec.collectionName}`,
          });

          const existingData = await getFirestoreCollectionDocs(spec.collectionName);
          collectionsSnapshot[spec.collectionName] = {};
          existingData.docs.forEach((d) => {
            collectionsSnapshot[spec.collectionName][String(d.id)] = d;
          });

          const records = validationResult.sanitizedByCollection[spec.collectionName] || [];
          const outcome = await commitCollectionToFirestore(
            spec.collectionName,
            records,
            existingData.ids,
            duplicateStrategy
          );

          createdCount += outcome.createdCount;
          updatedCount += outcome.updatedCount;
          skippedCount += outcome.skippedCount;
          failedCount += outcome.failedCount;

          // Update snapshot with newly committed docs
          records.forEach((rec) => {
            if (outcome.succeededIds.includes(String(rec.id))) {
              collectionsSnapshot[spec.collectionName][String(rec.id)] = rec;
            }
          });

          outcome.failedRecords.forEach((f) => {
            collectedFailures.push({
              sheet: spec.sheetName,
              collection: spec.collectionName,
              row: 0,
              field: 'firestore_write',
              recordId: f.id,
              severity: 'error',
              reason: f.reason,
            });
          });

          executionSheetResults.push({
            sheetName: spec.sheetName,
            collectionName: spec.collectionName,
            created: outcome.createdCount,
            updated: outcome.updatedCount,
            skipped: outcome.skippedCount,
            failed: outcome.failedCount,
          });
        }

        setProgressState({
          percent: 95,
          currentCollection: 'verification',
          detail: isVi ? 'Đang kiểm tra tính toàn vẹn dữ liệu sau nhập...' : 'Running post-import verification...',
        });

        const verifyRes = await fetch('/api/import/verify', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            source: 'firebase_client',
            collectionsSnapshot,
          }),
        });
        const verifyJson = await verifyRes.json();
        const verif: VerificationResult = verifyJson.verification;
        setVerificationResult(verif);

        const completedAt = new Date().toISOString();
        const logDoc = {
          id: `imp_${Date.now()}`,
          fileName: uploadedFileName,
          performedByUid: auth.currentUser.uid,
          performedByEmail: auth.currentUser.email || currentUser.email,
          performedByName: `${currentUser.name} (${auth.currentUser.displayName || 'Firebase'})`,
          performedByRole: currentUser.role,
          duplicateStrategy,
          selectedSheets,
          status:
            failedCount > 0
              ? createdCount + updatedCount > 0
                ? 'partial_failure'
                : 'failed'
              : 'completed',
          totalRowsDetected: validationResult.totalRowsDetected,
          validRecords: validationResult.validRecords,
          invalidRecords: validationResult.invalidRecords,
          createdCount,
          skippedCount,
          updatedCount,
          failedCount,
          errorCount: collectedFailures.length,
          warningCount: validationResult.warningCount,
          verificationPassed: !!verif?.verificationPassed,
          startedAt,
          completedAt,
          sheetSummaries: executionSheetResults,
        };

        await writeImportLogToFirestore(logDoc);
        await fetch('/api/import/log-audit', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            fileName: uploadedFileName,
            summary: `Firebase Firestore Batch Commit (${duplicateStrategy}): Created ${createdCount}, Updated ${updatedCount}, Skipped ${skippedCount}, Failed ${failedCount}`,
          }),
        });

        setImportLogResult(logDoc);
        setRuntimeFailures(collectedFailures);
        setProgressState({ percent: 100, currentCollection: 'Done', detail: 'Completed' });
        setStep(5);
        await loadImportStatusAndLogs();
        showToast(
          isVi
            ? `Đã nhập thành công ${createdCount + updatedCount} bản ghi lên Firebase Firestore!`
            : `Successfully imported ${createdCount + updatedCount} records to Firebase Firestore!`,
          failedCount > 0 ? 'info' : 'success'
        );
      } else {
        // Server-side execution (firebase_admin or demo_local)
        setProgressState({
          percent: 45,
          currentCollection: executionTarget,
          detail:
            executionTarget === 'firebase_admin'
              ? 'Committing batches via Firebase Admin SDK...'
              : 'Writing normalized collections to Demo Local Store...',
        });

        const res = await fetch('/api/import/execute', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            fileName: uploadedFileName,
            fileBase64,
            selectedSheets,
            duplicateStrategy,
            mode: executionTarget,
            allowPartialOnErrors,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Import execution failed.', 'error');
          setIsExecuting(false);
          return;
        }

        setProgressState({ percent: 100, currentCollection: 'Done', detail: 'Completed' });
        setImportLogResult(data.log);
        setRuntimeFailures(data.runtimeFailures || []);
        setVerificationResult(data.verification || null);
        setStep(5);
        await loadImportStatusAndLogs();
        showToast(
          data.mode === 'firebase_admin'
            ? 'Imported dataset into Firebase Firestore via Admin SDK.'
            : isVi
            ? 'Đã nhập dữ liệu ở Chế độ Demo Local (.data/firestore-curriculum-demo.json).'
            : 'Imported dataset in Demo Local Mode (.data/firestore-curriculum-demo.json).',
          'success'
        );
      }
    } catch (err: any) {
      showToast(err?.message || 'Error executing import.', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center max-w-xl mx-auto my-8 space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="text-lg font-extrabold text-slate-900">
          {isVi ? 'Không có quyền truy cập' : 'Access Restricted'}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          {isVi
            ? 'Chỉ Quản Trị Viên Cấp Cao (Super Admin) và Giám Đốc Đào Tạo (L&D Manager) mới được quyền truy cập Trung Tâm Nhập Dữ Liệu.'
            : 'Only Super Administrators and authorized L&D Managers may access the Data Import Center.'}
        </p>
      </div>
    );
  }

  const activePreviewSummary = validationResult?.sheetSummaries.find(
    (s) => s.sheetName === activePreviewSheet
  );

  const visibleIssues = (() => {
    if (!validationResult) return [];
    const base =
      issueSeverityFilter === 'error'
        ? validationResult.errors
        : issueSeverityFilter === 'warning'
        ? validationResult.warnings
        : [...validationResult.errors, ...validationResult.warnings];
    return base;
  })();

  const stepLabels = [
    { num: 1, title: isVi ? '1. Tải Tệp Excel' : '1. Upload Excel' },
    { num: 2, title: isVi ? '2. Chọn Sheet' : '2. Select Sheets' },
    { num: 3, title: isVi ? '3. Kiểm Tra & Xem Trước' : '3. Preview & Validate' },
    { num: 4, title: isVi ? '4. Xác Nhận Nhập' : '4. Confirm Import' },
    { num: 5, title: isVi ? '5. Kết Quả & Đối Chiếu' : '5. Results & Verify' },
  ] as const;

  const totalDuplicatesSelected =
    validationResult?.sheetSummaries.reduce((acc, s) => acc + s.existingDuplicateCount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0A192F] text-white p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
            <Database className="w-3.5 h-3.5" />
            <span>Administration &rarr; Data Management &rarr; Data Import Center</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {isVi
              ? 'Trung Tâm Nhập Dữ Liệu Chương Trình 2027 (Excel → Firestore)'
              : 'Training Dataset Import Center (Excel → Firebase Firestore)'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            {isVi
              ? 'Nhập, chuẩn hóa, kiểm tra ràng buộc khóa ngoại 9 sheet từ FC_Learning_Academy_Training_Dataset_2027.xlsx vào Firebase Firestore mà không ảnh hưởng dữ liệu học viên.'
              : 'Upload, validate schema & foreign keys, resolve duplicates, and commit the 9 curriculum sheets into Firebase Firestore without altering transactional learner data.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{isVi ? 'Tải Mẫu Excel 2027 (.xlsx)' : 'Download 2027 Template (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Firebase Auth & Connection Status Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                firestorePing?.ok ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="font-bold text-slate-800">Firestore:</span>
            <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
              {firebaseConfigSummary.projectId} / {firebaseConfigSummary.databaseId.slice(0, 24)}...
            </code>
          </div>

          {firebaseUser ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Firebase Auth: {firebaseUser.email}</span>
            </div>
          ) : serverStatus?.adminSdkAvailable ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Server Admin SDK Connected</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
              <Info className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {isVi
                  ? 'Chế độ Demo Local khả dụng — Đăng nhập Google để ghi trực tiếp Firestore'
                  : 'Demo Local Mode ready — Sign in with Google to write live to Firestore'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {firebaseUser ? (
            <button
              onClick={handleGoogleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isVi ? 'Đăng xuất Google' : 'Sign Out Firebase'}</span>
            </button>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isVi ? 'Đăng Nhập Google (Firebase Auth)' : 'Sign in with Google (Firebase)'}</span>
            </button>
          )}
          <button
            onClick={loadImportStatusAndLogs}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
            title={isVi ? 'Làm mới trạng thái' : 'Refresh status'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5-Step Progress Stepper */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[640px] gap-2">
          {stepLabels.map((st, idx) => {
            const isCurrent = step === st.num;
            const isDone = step > st.num;
            const canClick =
              st.num === 1 ||
              (st.num === 2 && !!fileBase64) ||
              (st.num === 3 && !!validationResult) ||
              (st.num === 4 && !!validationResult) ||
              (st.num === 5 && !!importLogResult);

            return (
              <React.Fragment key={st.num}>
                <button
                  disabled={!canClick}
                  onClick={() => canClick && setStep(st.num)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#0A192F] text-amber-400 shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-pointer'
                      : canClick
                      ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer'
                      : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : null}
                  <span>{st.title}</span>
                </button>
                {idx < stepLabels.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: UPLOAD EXCEL */}
      {step === 1 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileSelected(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-amber-500 bg-amber-50/70'
                : 'border-slate-300 hover:border-[#0A192F] hover:bg-slate-50/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelected(f);
              }}
            />
            <div className="w-14 h-14 rounded-2xl bg-[#0A192F] text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              {isVi
                ? 'Kéo thả tệp Excel (.xlsx) vào đây hoặc bấm để chọn tệp'
                : 'Drag & drop your .xlsx workbook here, or click to browse'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-lg mx-auto">
              {isVi
                ? 'Hỗ trợ tệp FC_Learning_Academy_Training_Dataset_2027.xlsx với tối đa 9 sheet dữ liệu (sheet README sẽ tự động được bỏ qua).'
                : 'Supports FC_Learning_Academy_Training_Dataset_2027.xlsx containing the 9 curriculum sheets (README sheet is automatically excluded).'}
            </p>
            {isParsing && (
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#0A192F]">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{isVi ? 'Đang phân tích và kiểm tra cấu trúc workbook...' : 'Parsing & validating workbook...'}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">
                  {isVi ? 'Nạp Nhanh Bộ Dữ Liệu Chuẩn 2027 (259 bản ghi)' : 'Quick-Load Official 2027 Dataset (259 Records)'}
                </p>
                <p className="text-slate-600 mt-0.5">
                  {isVi
                    ? 'Tải và kiểm thử ngay toàn bộ 6 Domains, 4 Levels, 30 Competencies, 120 Rubrics, 18 Courses, 60 Questions, 6 Practical Assignments, 12 Matrix, 3 Career Paths.'
                    : 'Immediately load & validate 6 Domains, 4 Levels, 30 Competencies, 120 Rubrics, 18 Courses, 60 Questions, 6 Practical Assignments, 12 Matrix Entries, and 3 Career Paths.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLoadOfficialSample}
              disabled={isParsing}
              className="px-4 py-2 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isVi ? 'Nạp Bộ Dữ Liệu 2027' : 'Load 2027 Dataset'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SELECT SHEETS */}
      {step === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>{uploadedFileName}</span>
                <span className="text-xs font-mono font-normal text-slate-500">
                  ({Math.round(uploadedFileSize / 1024)} KB)
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isVi
                  ? 'Các sheet được sắp xếp theo đúng thứ tự phụ thuộc khóa ngoại khi ghi vào Firestore.'
                  : 'Sheets are ordered strictly by foreign-key dependency sequence (1 → 9).'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setSelectedSheets(detectedSheets.map((s) => s.sheetName))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
              >
                {isVi ? 'Chọn tất cả' : 'Select All'}
              </button>
              <button
                onClick={() => setSelectedSheets([])}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
              >
                {isVi ? 'Bỏ chọn' : 'Clear'}
              </button>
            </div>
          </div>

          {readmeDetected && (
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Info className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  <strong>README</strong> —{' '}
                  {isVi
                    ? 'Sheet hướng dẫn được nhận diện và tự động loại trừ khỏi quá trình import.'
                    : 'Instruction sheet detected and permanently excluded from Firestore business data import.'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px] uppercase">
                Ignored
              </span>
            </div>
          )}

          {unknownSheets.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <strong>{isVi ? 'Sheet không hợp lệ:' : 'Unmapped sheets skipped:'}</strong>{' '}
              {unknownSheets.join(', ')}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {detectedSheets.map((spec) => {
              const isSelected = selectedSheets.includes(spec.sheetName);
              const summary = validationResult?.sheetSummaries.find(
                (s) => s.sheetName === spec.sheetName
              );
              return (
                <div
                  key={spec.sheetName}
                  onClick={() => {
                    setSelectedSheets((prev) =>
                      prev.includes(spec.sheetName)
                        ? prev.filter((x) => x !== spec.sheetName)
                        : [...prev, spec.sheetName]
                    );
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#0A192F] bg-slate-50 ring-1 ring-[#0A192F]/20'
                      : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#0A192F] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="px-2 py-0.5 rounded bg-[#0A192F] text-amber-400 font-mono text-[10px] font-bold">
                        #{spec.order}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {summary ? `${summary.detectedRows} rows` : `~${spec.expectedCount}`}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 mt-2.5">{spec.sheetName}</h4>
                  <p className="text-[11px] font-mono text-slate-500">&rarr; /{spec.collectionName}</p>
                  {spec.dependencies.length > 0 && (
                    <p className="text-[10px] text-slate-500 mt-2">
                      FK: {spec.dependencies.join(', ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isVi ? 'Chọn tệp khác' : 'Change File'}</span>
            </button>

            <button
              disabled={selectedSheets.length === 0 || isParsing}
              onClick={() => runParseAndValidate(uploadedFileName, fileBase64, selectedSheets, 3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isParsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              <span>
                {isVi
                  ? `Kiểm Tra Hợp Lệ (${selectedSheets.length} sheet)`
                  : `Validate & Preview (${selectedSheets.length} sheets)`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & VALIDATE */}
      {step === 3 && validationResult && (
        <div className="space-y-5">
          {/* Validation KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {isVi ? 'Tổng Dòng Dữ Liệu' : 'Total Rows'}
              </span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono">
                {validationResult.totalRowsDetected}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                {isVi ? 'Bản Ghi Hợp Lệ' : 'Valid Records'}
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 font-mono">
                {validationResult.validRecords}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-rose-700 block">
                {isVi ? 'Dòng Không Hợp Lệ' : 'Invalid Rows'}
              </span>
              <span className="text-2xl font-extrabold text-rose-700 font-mono">
                {validationResult.invalidRecords}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-rose-700 block">
                {isVi ? 'Tổng Lỗi' : 'Error Count'}
              </span>
              <span className="text-2xl font-extrabold text-rose-700 font-mono">
                {validationResult.errorCount}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-amber-700 block">
                {isVi ? 'Cảnh Báo / Trùng ID' : 'Warnings / Duplicates'}
              </span>
              <span className="text-2xl font-extrabold text-amber-700 font-mono">
                {validationResult.warningCount}
              </span>
            </div>
          </div>

          {/* Per-sheet Summary Strip */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {isVi ? 'Trạng Thái Kiểm Tra Theo Từng Sheet' : 'Sheet-by-Sheet Validation Summary'}
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => handleExportErrorReport('csv')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV Report</span>
                </button>
                <button
                  onClick={() => handleExportErrorReport('xlsx')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel Error Report (.xlsx)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Excel Sheet</th>
                    <th className="py-2.5 px-3">Firestore Collection</th>
                    <th className="py-2.5 px-3 text-right">Rows</th>
                    <th className="py-2.5 px-3 text-right">Valid</th>
                    <th className="py-2.5 px-3 text-right">Errors</th>
                    <th className="py-2.5 px-3 text-right">Duplicates</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validationResult.sheetSummaries.map((s) => (
                    <tr
                      key={s.sheetName}
                      onClick={() => setActivePreviewSheet(s.sheetName)}
                      className={`cursor-pointer transition-colors ${
                        activePreviewSheet === s.sheetName ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{s.order}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.sheetName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{s.collectionName}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{s.detectedRows}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                        {s.validRows}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">
                        {s.errorCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-bold">
                        {s.existingDuplicateCount}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {s.validationStatus === 'valid' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Valid
                          </span>
                        ) : s.validationStatus === 'warnings' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3" /> Warnings
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <XCircle className="w-3 h-3" /> Invalid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Errors & Warnings Detail Table */}
          {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <FileWarning className="w-4 h-4 text-rose-600" />
                  <span>
                    {isVi
                      ? `Báo Cáo Lỗi & Cảnh Báo (${validationResult.errorCount} lỗi, ${validationResult.warningCount} cảnh báo)`
                      : `Validation Errors & Warnings (${validationResult.errorCount} errors, ${validationResult.warningCount} warnings)`}
                  </span>
                </h4>

                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  {(['all', 'error', 'warning'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setIssueSeverityFilter(f)}
                      className={`px-3 py-1 rounded-lg cursor-pointer ${
                        issueSeverityFilter === f
                          ? 'bg-[#0A192F] text-amber-400'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Severity</th>
                      <th className="py-2 px-3">Sheet</th>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Field</th>
                      <th className="py-2 px-3">Record ID</th>
                      <th className="py-2 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleIssues.slice(0, 100).map((iss, i) => (
                      <tr key={i} className={iss.severity === 'error' ? 'bg-rose-50/40' : 'bg-amber-50/40'}>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              iss.severity === 'error'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {iss.severity}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">{iss.sheet}</td>
                        <td className="py-2 px-3 font-mono">{iss.row}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{iss.field}</td>
                        <td className="py-2 px-3 font-mono">{iss.recordId}</td>
                        <td className="py-2 px-3 text-slate-700">{iss.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Live Record Preview Table for Selected Sheet */}
          {activePreviewSummary && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-900">
                  {isVi ? 'Xem Trước Dữ Liệu:' : 'Record Preview:'}{' '}
                  <span className="text-amber-700">{activePreviewSummary.sheetName}</span> &rarr;{' '}
                  <code className="text-xs font-mono text-slate-500">
                    /{activePreviewSummary.collectionName}
                  </code>
                </h4>
                <span className="text-[11px] text-slate-500">
                  Showing up to first {activePreviewSummary.previewRows.length} rows
                </span>
              </div>

              {activePreviewSummary.detectedHeaders && activePreviewSummary.detectedHeaders.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <span className="font-bold text-slate-600 mr-1">
                    {isVi
                      ? `Cột nhận diện (Hàng ${activePreviewSummary.headerRowNumber || 1}):`
                      : `Detected columns (Row ${activePreviewSummary.headerRowNumber || 1}):`}
                  </span>
                  {activePreviewSummary.detectedHeaders.map((h) => (
                    <code
                      key={h}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-700"
                    >
                      {h}
                    </code>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">ID</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Summary Fields</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePreviewSummary.previewRows.map((r, idx) => {
                      const summaryPairs = Object.entries(r)
                        .filter(
                          ([k]) =>
                            !['id', '_excelRow', '_isDuplicate', '_hasError', 'importedAt', 'importBatchId'].includes(
                              k
                            )
                        )
                        .slice(0, 4)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(',') : String(v).slice(0, 42)}`)
                        .join(' | ');
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-500">{r._excelRow}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.id}</td>
                          <td className="py-2 px-3">
                            {r._hasError ? (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                INVALID
                              </span>
                            ) : r._isDuplicate ? (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                EXISTS
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                NEW
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-2xl">{summaryPairs}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isVi ? 'Quay lại chọn sheet' : 'Back to Sheet Selection'}</span>
            </button>

            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer"
            >
              <span>{isVi ? 'Tiếp Tục Xác Nhận Nhập' : 'Proceed to Confirm Import'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRM IMPORT */}
      {step === 4 && validationResult && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-extrabold text-slate-900">
              {isVi ? 'Cấu Hình Xử Lý Trùng Lặp & Đích Lưu Trữ' : 'Duplicate Policy & Import Confirmation'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isVi
                ? 'Kiểm tra kỹ chính sách xử lý bản ghi trùng ID và đích ghi dữ liệu trước khi thực thi.'
                : 'Confirm duplicate handling rules and target database mode before committing records.'}
            </p>
          </div>

          {/* Duplicate Handling Strategy */}
          <div className="space-y-2.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
              {isVi
                ? `Chiến Lược Xử Lý Trùng ID (${totalDuplicatesSelected} bản ghi trùng được phát hiện)`
                : `Duplicate Record Strategy (${totalDuplicatesSelected} existing duplicates detected)`}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {[
                {
                  id: 'skip' as DuplicateStrategy,
                  title: isVi ? 'Bỏ qua bản ghi đã tồn tại (Mặc định)' : 'Skip Existing Records (Default)',
                  desc: isVi
                    ? 'Chỉ thêm mới các ID chưa tồn tại. An toàn tuyệt đối với dữ liệu đang vận hành.'
                    : 'Preserve existing records untouched and create only new IDs.',
                },
                {
                  id: 'update' as DuplicateStrategy,
                  title: isVi ? 'Cập nhật bản ghi trùng (Upsert / Merge)' : 'Update Existing Records (With Preview)',
                  desc: isVi
                    ? 'Ghi đè hợp nhất thông tin mới vào các bản ghi trùng ID trong 9 collection.'
                    : 'Merge incoming values into matching document IDs across selected collections.',
                },
                {
                  id: 'reject' as DuplicateStrategy,
                  title: isVi ? 'Từ chối bản ghi trùng ID (Reject)' : 'Reject Duplicate Records',
                  desc: isVi
                    ? 'Đánh dấu tất cả bản ghi trùng ID là lỗi từ chối trong báo cáo kết quả.'
                    : 'Flag all duplicate document IDs as failed/rejected in the import log.',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setDuplicateStrategy(opt.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    duplicateStrategy === opt.id
                      ? 'border-[#0A192F] bg-slate-50 ring-2 ring-amber-400/60'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-extrabold text-slate-900">{opt.title}</div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Update Preview if Update strategy selected and duplicates > 0 */}
          {duplicateStrategy === 'update' && totalDuplicatesSelected > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
              <div className="font-extrabold text-amber-900">
                {isVi
                  ? `Xem Trước Bản Ghi Sẽ Cập Nhật (${totalDuplicatesSelected} bản ghi):`
                  : `Update Preview Summary (${totalDuplicatesSelected} records will be updated):`}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {validationResult.sheetSummaries
                  .filter((s) => s.existingDuplicateCount > 0)
                  .map((s) => (
                    <div key={s.sheetName} className="bg-white/90 p-2.5 rounded-lg border border-amber-200">
                      <div className="font-bold text-slate-800">{s.collectionName}</div>
                      <div className="text-[11px] text-amber-800">
                        {s.existingDuplicateCount} ID(s): {s.duplicateIds.slice(0, 4).join(', ')}
                        {s.duplicateIds.length > 4 ? '...' : ''}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Execution Target Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
              {isVi ? 'Đích Lưu Trữ Dữ Liệu (Database Target)' : 'Database Execution Target'}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <button
                onClick={() => firebaseUser && setExecutionTarget('firebase_client')}
                disabled={!firebaseUser}
                className={`p-4 rounded-xl border text-left transition-all ${
                  executionTarget === 'firebase_client'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500'
                    : firebaseUser
                    ? 'border-slate-200 hover:bg-slate-50 cursor-pointer'
                    : 'border-slate-200 bg-slate-50 opacity-55 cursor-not-allowed'
                }`}
              >
                <div className="font-extrabold text-slate-900">Firebase Firestore (Google Auth)</div>
                <p className="text-[11px] text-slate-600 mt-1">
                  {firebaseUser
                    ? `Signed in: ${firebaseUser.email}`
                    : isVi
                    ? 'Đăng nhập Google ở thanh trên để kích hoạt.'
                    : 'Sign in with Google above to enable live Firestore writes.'}
                </p>
              </button>

              <button
                onClick={() => serverStatus?.adminSdkAvailable && setExecutionTarget('firebase_admin')}
                disabled={!serverStatus?.adminSdkAvailable}
                className={`p-4 rounded-xl border text-left transition-all ${
                  executionTarget === 'firebase_admin'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500'
                    : serverStatus?.adminSdkAvailable
                    ? 'border-slate-200 hover:bg-slate-50 cursor-pointer'
                    : 'border-slate-200 bg-slate-50 opacity-55 cursor-not-allowed'
                }`}
              >
                <div className="font-extrabold text-slate-900">Firebase Admin SDK (Server)</div>
                <p className="text-[11px] text-slate-600 mt-1">
                  {serverStatus?.adminSdkAvailable
                    ? 'Server service account authorized'
                    : isVi
                    ? 'Yêu cầu cấu hình FIREBASE_SERVICE_ACCOUNT_JSON trên server.'
                    : 'Requires FIREBASE_SERVICE_ACCOUNT_JSON on server.'}
                </p>
              </button>

              <button
                onClick={() => setExecutionTarget('demo_local')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  executionTarget === 'demo_local'
                    ? 'border-[#0A192F] bg-slate-50 ring-1 ring-[#0A192F]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-extrabold text-slate-900">Demo Local Mode (Sandbox)</div>
                <p className="text-[11px] text-slate-600 mt-1">
                  {isVi
                    ? 'Lưu trữ mô phỏng tại máy chủ cục bộ (.data/firestore-curriculum-demo.json).'
                    : 'Local sandbox JSON persistence with full validation & verification.'}
                </p>
              </button>
            </div>
          </div>

          {/* Partial Import Option if invalid records exist */}
          {validationResult.errorCount > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-bold text-rose-900">
                  {isVi
                    ? `Phát hiện ${validationResult.errorCount} lỗi tại ${validationResult.invalidRecords} dòng dữ liệu.`
                    : `Detected ${validationResult.errorCount} error(s) across ${validationResult.invalidRecords} invalid row(s).`}
                </p>
                <label className="inline-flex items-center gap-2 font-bold text-rose-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowPartialOnErrors}
                    onChange={(e) => setAllowPartialOnErrors(e.target.checked)}
                    className="rounded border-rose-400"
                  />
                  <span>
                    {isVi
                      ? `Cho phép nhập ${validationResult.validRecords} bản ghi hợp lệ và ghi nhận ${validationResult.invalidRecords} dòng lỗi vào báo cáo`
                      : `Import the ${validationResult.validRecords} valid records and log ${validationResult.invalidRecords} invalid rows as failures`}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Transactional Isolation Notice */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs flex items-start gap-3 text-blue-900">
            <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <strong>{isVi ? 'Bảo Vệ Dữ Liệu Giao Dịch:' : 'Transactional Data Protection:'}</strong>{' '}
              {isVi
                ? 'Tiến trình chỉ ghi vào 9 collection khung chương trình & importLogs. Hồ sơ đánh giá, kết quả bài thi, IDP, OJT, chứng chỉ và tài khoản học viên hoàn toàn không bị thay đổi.'
                : 'Imports only write to the 9 curriculum collections & importLogs. Existing learner profiles, assessments, enrollments, quiz attempts, OJT submissions, IDPs, and certificates are never modified.'}
            </div>
          </div>

          {/* Progress Bar during Execution */}
          {isExecuting && (
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-amber-400">{progressState.currentCollection}</span>
                <span className="font-mono">{progressState.percent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${progressState.percent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-300 font-mono">{progressState.detail}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              disabled={isExecuting}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isVi ? 'Quay lại kiểm tra' : 'Back to Preview'}</span>
            </button>

            <button
              disabled={
                isExecuting ||
                validationResult.validRecords === 0 ||
                (validationResult.errorCount > 0 && !allowPartialOnErrors)
              }
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isExecuting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {isVi
                  ? `Xác Nhận Nhập ${validationResult.validRecords} Bản Ghi`
                  : `Confirm & Import ${validationResult.validRecords} Valid Records`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: RESULTS, POST-IMPORT VERIFICATION & HISTORY */}
      {step === 5 && importLogResult && (
        <div className="space-y-6">
          {/* Import Outcome Summary */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase ${
                    importLogResult.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : importLogResult.status === 'demo_mode'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Status: {importLogResult.status}</span>
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-2">
                  {importLogResult.fileName} — Batch <code className="text-xs font-mono">{importLogResult.id}</code>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isVi ? 'Thực hiện bởi:' : 'Performed by:'}{' '}
                  <strong>{importLogResult.performedByName}</strong> ({importLogResult.performedByRole}) &bull;{' '}
                  {importLogResult.startedAt} &rarr; {importLogResult.completedAt}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {runtimeFailures.length > 0 && (
                  <button
                    onClick={() => handleExportErrorReport('xlsx')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 font-bold text-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Failure Report</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setStep(1);
                    setValidationResult(null);
                    setFileBase64('');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0A192F] text-amber-400 font-bold text-xs cursor-pointer"
                >
                  {isVi ? 'Nhập Tệp Mới' : 'New Import'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
              {[
                { label: 'Total Rows', val: importLogResult.totalRowsDetected, cls: 'text-slate-900' },
                { label: 'Valid', val: importLogResult.validRecords, cls: 'text-emerald-700' },
                { label: 'Created', val: importLogResult.createdCount, cls: 'text-emerald-700' },
                { label: 'Updated', val: importLogResult.updatedCount, cls: 'text-blue-700' },
                { label: 'Skipped', val: importLogResult.skippedCount, cls: 'text-amber-700' },
                { label: 'Failed / Invalid', val: importLogResult.failedCount, cls: 'text-rose-700' },
              ].map((m) => (
                <div key={m.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">{m.label}</span>
                  <span className={`text-xl font-extrabold font-mono ${m.cls}`}>{m.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Post-Import Verification Report */}
          {verificationResult && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck
                    className={`w-5 h-5 ${
                      verificationResult.verificationPassed ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  />
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {isVi
                        ? 'Kiểm Tra Toàn Vẹn Dữ Liệu Sau Nhập (Post-Import Verification)'
                        : 'Post-Import Collection & Relationship Verification'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Source: <code className="font-mono">{verificationResult.source}</code> &bull; Checked at{' '}
                      {verificationResult.checkedAt}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => runPostImportVerification(executionTarget)}
                  disabled={isVerifying}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span>{isVi ? 'Kiểm Tra Lại' : 'Re-Run Verification'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Document Counts Check */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Collection</th>
                        <th className="py-2 px-3 text-right">Actual</th>
                        <th className="py-2 px-3 text-right">Target</th>
                        <th className="py-2 px-3 text-center">Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {verificationResult.counts.map((c) => (
                        <tr key={c.collection}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{c.collection}</td>
                          <td className="py-2 px-3 text-right font-mono">{c.actual}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">{c.expected}</td>
                          <td className="py-2 px-3 text-center">
                            {c.matchesExpected ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                MATCH
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                DIFF
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* FK Relationship Checks */}
                <div className="space-y-2">
                  {verificationResult.relationshipChecks.map((r) => (
                    <div
                      key={r.check}
                      className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2 ${
                        r.passed
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-amber-50/60 border-amber-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{r.check}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{r.details}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] shrink-0 ${
                          r.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.passed ? 'PASS' : `${r.brokenReferences} BROKEN`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Persistent Import History & Audit Logs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-[#0A192F]" />
            <span>
              {isVi
                ? `Lịch Sử Nhập Dữ Liệu & Kiểm Toán (${importHistory.length})`
                : `Import History & Audit Logs (${importHistory.length})`}
            </span>
          </h3>
        </div>

        {importHistory.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6 italic">
            {isVi
              ? 'Chưa có lượt nhập dữ liệu nào được ghi nhận.'
              : 'No import executions recorded yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Batch ID</th>
                  <th className="py-2.5 px-3">Workbook File</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Strategy</th>
                  <th className="py-2.5 px-3 text-right">Created / Updated / Skipped / Failed</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{log.id}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{log.fileName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{log.performedByName || log.performedByUid}</td>
                    <td className="py-2.5 px-3 uppercase font-mono text-[11px]">{log.duplicateStrategy}</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <span className="text-emerald-700 font-bold">{log.createdCount}</span> /{' '}
                      <span className="text-blue-700 font-bold">{log.updatedCount}</span> /{' '}
                      <span className="text-amber-700 font-bold">{log.skippedCount}</span> /{' '}
                      <span className="text-rose-700 font-bold">{log.failedCount}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'demo_mode'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{log.startedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
