import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  auth,
  firebaseConfigSummary,
  testFirestoreConnection,
  signInWithFirebaseGoogle,
  signOutFirebase,
  getFirestoreCollectionDocs,
  fetchImportLogsFromFirestore,
  writeImportLogToFirestore,
  writeScenarioImportJobToFirestore,
  writeScenarioVersionToFirestore,
  syncRecordToFirestore,
  commitCollectionToFirestore,
  uploadAuthorizedTrainingFile,
  type StorageUploadCategory,
  type StorageUploadResult,
} from '../../lib/firebase';
import { generateDatasetSnapshotForScenario } from '../../lib/simulatorEngine';
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
  Wrench,
  GitMerge,
  Calculator,
  FolderUp,
  RotateCcw,
} from 'lucide-react';

type DatasetType = 'academy_2027' | 'simulator_starter';
type DuplicateStrategy = 'skip' | 'update' | 'reject';
type ExecutionTarget = 'firebase_client' | 'firebase_admin' | 'demo_local';
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface SheetSpec {
  order: number;
  stage?: 1 | 2 | 3;
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
  datasetType?: DatasetType;
  importBatchId: string;
  fileName: string;
  readmeDetected: boolean;
  detectedSheets: string[];
  missingSheets?: string[];
  ignoredSheets: string[];
  selectedSheets: string[];
  totalRowsDetected: number;
  validRecords: number;
  invalidRecords: number;
  errorCount: number;
  warningCount: number;
  financialChecksRun?: number;
  financialChecksPassed?: number;
  unresolvedRelationships?: number;
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

const TRANSACTIONAL_PROTECTED_COLLECTIONS = [
  'enrollments',
  'quizAttempts',
  'practicalSubmissions',
  'competencyAssessments',
  'individualDevelopmentPlans',
  'idpReviewLogs',
  'competencyReassessments',
  'careerReadinessReviews',
  'simulationSessions',
];

const CANONICAL_FIELDS_BY_SHEET: Record<string, string[]> = {
  Competency_Domains: ['id', 'code', 'name_en', 'name_vi', 'description_en', 'description_vi', 'weight_percent', 'sort_order'],
  Proficiency_Levels: ['id', 'level', 'code', 'name_en', 'name_vi', 'description_en', 'description_vi', 'target_role'],
  Competencies: ['id', 'code', 'domain_id', 'name_en', 'name_vi', 'definition_en', 'definition_vi', 'target_level', 'weight_percent'],
  Competency_Rubric: ['id', 'competency_id', 'proficiency_level', 'proficiency_level_id', 'criteria_en', 'criteria_vi', 'observable_behavior', 'evidence_required', 'assessment_weight'],
  Course_Catalog: ['id', 'code', 'domain_id', 'competency_id', 'title_en', 'title_vi', 'description_en', 'description_vi', 'target_level', 'duration_hours', 'passing_score', 'assessment_weight_quiz', 'assessment_weight_practical', 'delivery_mode'],
  Question_Bank: ['id', 'course_id', 'competency_id', 'question_type', 'question_text_en', 'question_text_vi', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation_en', 'explanation_vi', 'proficiency_level', 'points'],
  Practical_Assignments: ['id', 'code', 'course_id', 'competency_id', 'title_en', 'title_vi', 'scenario_en', 'scenario_vi', 'deliverables', 'max_score', 'passing_score', 'weight_percent', 'due_date_days'],
  Training_Matrix_2027: ['id', 'month', 'target_date', 'target_role', 'domain_id', 'course_id', 'competency_id', 'delivery_format', 'mandatory', 'cohort_size', 'assessment_weight'],
  Career_Paths: ['id', 'code', 'name_en', 'name_vi', 'from_role', 'to_role', 'target_level', 'duration_months', 'required_course_ids', 'required_competency_ids', 'required_practical_ids', 'min_assessment_score'],
  Hotel_Profiles: ['id', 'hotel_code', 'hotel_name', 'brand_tier', 'city', 'rooms_available', 'total_keys', 'fc_position_level', 'currency'],
  Scenario_Master: ['id', 'scenario_code', 'hotel_id', 'title_en', 'title_vi', 'summary_en', 'summary_vi', 'difficulty_level', 'target_role', 'period_label', 'status'],
  Competency_Mapping: ['id', 'scenario_id', 'competency_id', 'target_proficiency_level', 'weight_percent', 'is_primary'],
  Financial_Dataset: ['id', 'scenario_id', 'period_label', 'department_code', 'department_name', 'departmental_revenue', 'departmental_expenses', 'departmental_profit', 'total_operating_revenue', 'total_departmental_expenses', 'total_undistributed_expenses', 'gop', 'gop_margin_pct', 'rooms_revenue', 'budget_gop'],
  Operational_Dataset: ['id', 'scenario_id', 'period_label', 'rooms_available', 'rooms_sold', 'rooms_revenue', 'occupancy_pct', 'adr', 'revpar', 'fb_covers', 'labor_hours', 'overtime_hours', 'gss_score'],
  Business_Challenges: ['id', 'scenario_id', 'challenge_code', 'title_en', 'title_vi', 'description_en', 'description_vi', 'severity', 'impact_area'],
  Learner_Tasks: ['id', 'scenario_id', 'task_order', 'title_en', 'title_vi', 'instructions_en', 'instructions_vi', 'deliverable_type', 'max_points'],
  Reference_Analysis: ['id', 'scenario_id', 'topic', 'root_cause_en', 'root_cause_vi', 'benchmark_formula', 'recommended_action_en', 'recommended_action_vi'],
  Decision_Options: ['id', 'scenario_id', 'option_code', 'title_en', 'title_vi', 'financial_impact_estimate', 'gop_impact_pct', 'risk_level', 'is_optimal', 'rationale_en', 'rationale_vi'],
  GM_Roleplay: ['id', 'scenario_id', 'turn_order', 'speaker_role', 'prompt_en', 'prompt_vi', 'expected_focus_points'],
  Evaluation_Rubric: ['id', 'scenario_id', 'criterion_code', 'criterion_name_en', 'criterion_name_vi', 'weight_percent', 'max_score', 'passing_score'],
};

const DEFAULT_ACADEMY_SPECS: SheetSpec[] = [
  { order: 1, stage: 1, sheetName: 'Competency_Domains', collectionName: 'competencyDomains', expectedCount: 6, labelEn: 'Competency Domains', labelVi: 'Miền Năng Lực', dependencies: [] },
  { order: 2, stage: 1, sheetName: 'Proficiency_Levels', collectionName: 'proficiencyLevels', expectedCount: 4, labelEn: 'Proficiency Levels', labelVi: 'Cấp Độ Thành Thạo', dependencies: [] },
  { order: 3, stage: 1, sheetName: 'Competencies', collectionName: 'competencies', expectedCount: 30, labelEn: 'Competencies', labelVi: 'Năng Lực Chi Tiết', dependencies: ['competencyDomains'] },
  { order: 4, stage: 1, sheetName: 'Competency_Rubric', collectionName: 'competencyRubrics', expectedCount: 120, labelEn: 'Competency Rubrics', labelVi: 'Thang Đo Hành Vi', dependencies: ['competencies'] },
  { order: 5, stage: 1, sheetName: 'Course_Catalog', collectionName: 'courses', expectedCount: 18, labelEn: 'Course Catalog', labelVi: 'Danh Mục Khóa Học', dependencies: ['competencyDomains', 'competencies'] },
  { order: 6, stage: 1, sheetName: 'Question_Bank', collectionName: 'questionBank', expectedCount: 60, labelEn: 'Question Bank', labelVi: 'Ngân Hàng Câu Hỏi', dependencies: ['courses', 'competencies'] },
  { order: 7, stage: 1, sheetName: 'Practical_Assignments', collectionName: 'practicalAssignments', expectedCount: 6, labelEn: 'Practical Assignments', labelVi: 'Bài Tập Thực Hành OJT', dependencies: ['courses', 'competencies'] },
  { order: 8, stage: 1, sheetName: 'Training_Matrix_2027', collectionName: 'annualTrainingMatrix', expectedCount: 12, labelEn: 'Training Matrix 2027', labelVi: 'Ma Trận Đào Tạo 2027', dependencies: ['competencyDomains', 'courses', 'competencies'] },
  { order: 9, stage: 1, sheetName: 'Career_Paths', collectionName: 'careerPaths', expectedCount: 5, labelEn: 'Career Paths', labelVi: 'Lộ Trình Nghề Nghiệp', dependencies: ['courses', 'competencies', 'practicalAssignments'] },
];

const DEFAULT_SIMULATOR_SPECS: SheetSpec[] = [
  { order: 1, stage: 2, sheetName: 'Hotel_Profiles', collectionName: 'hotelSimulationProfiles', expectedCount: 3, labelEn: 'Hotel Profiles', labelVi: 'Hồ Sơ Khách Sạn', dependencies: [] },
  { order: 2, stage: 2, sheetName: 'Scenario_Master', collectionName: 'simulationScenarios', expectedCount: 3, labelEn: 'Scenario Master', labelVi: 'Kịch Bản Mô Phỏng', dependencies: ['hotelSimulationProfiles'] },
  { order: 3, stage: 2, sheetName: 'Competency_Mapping', collectionName: 'simulationCompetencyMappings', expectedCount: 9, labelEn: 'Competency Mapping', labelVi: 'Ánh Xạ Năng Lực', dependencies: ['simulationScenarios', 'competencies'] },
  { order: 4, stage: 3, sheetName: 'Financial_Dataset', collectionName: 'simulationFinancialData', expectedCount: 9, labelEn: 'Financial Dataset (USALI)', labelVi: 'Dữ Liệu Tài Chính USALI', dependencies: ['simulationScenarios'] },
  { order: 5, stage: 3, sheetName: 'Operational_Dataset', collectionName: 'simulationOperationalData', expectedCount: 3, labelEn: 'Operational Dataset (KPIs)', labelVi: 'Dữ Liệu Vận Hành KPIs', dependencies: ['simulationScenarios'] },
  { order: 6, stage: 3, sheetName: 'Business_Challenges', collectionName: 'simulationBusinessChallenges', expectedCount: 3, labelEn: 'Business Challenges', labelVi: 'Thách Thức Kinh Doanh', dependencies: ['simulationScenarios'] },
  { order: 7, stage: 3, sheetName: 'Learner_Tasks', collectionName: 'simulationTasks', expectedCount: 6, labelEn: 'Learner Tasks', labelVi: 'Nhiệm Vụ Học Viên', dependencies: ['simulationScenarios'] },
  { order: 8, stage: 3, sheetName: 'Reference_Analysis', collectionName: 'simulationReferenceAnalysis', expectedCount: 3, labelEn: 'Reference Analysis', labelVi: 'Phân Tích Tham Chiếu', dependencies: ['simulationScenarios'] },
  { order: 9, stage: 3, sheetName: 'Decision_Options', collectionName: 'simulationDecisionOptions', expectedCount: 9, labelEn: 'Decision Options', labelVi: 'Phương Án Quyết Định', dependencies: ['simulationScenarios'] },
  { order: 10, stage: 3, sheetName: 'GM_Roleplay', collectionName: 'simulationRoleplayPrompts', expectedCount: 6, labelEn: 'GM Roleplay Prompts', labelVi: 'Kịch Bản Đối Thoại GM', dependencies: ['simulationScenarios'] },
  { order: 11, stage: 3, sheetName: 'Evaluation_Rubric', collectionName: 'simulationEvaluationRubrics', expectedCount: 9, labelEn: 'Evaluation Rubric', labelVi: 'Tiêu Chí Chấm Điểm', dependencies: ['simulationScenarios'] },
];

export const DataImportCenterView: React.FC = () => {
  const {
    currentUser,
    hasPermission,
    language,
    showToast,
    firebaseUser,
    firebaseProfile,
    competencies,
    productionCounts,
    setDataSourceMode,
    refreshFromFirestore,
    refreshSimulatorData,
  } = useApp();
  const isVi = language === 'vi';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storageFileRef = useRef<HTMLInputElement | null>(null);

  const isBootstrappedOwnerEmail =
    firebaseUser?.email?.toLowerCase() === 'tranchanhtrung@gmail.com' && !!firebaseUser?.emailVerified;
  const hasFirestoreAdminAccess = Boolean(
    firebaseUser?.emailVerified && (firebaseProfile?.isAdmin || isBootstrappedOwnerEmail)
  );
  const hasImportPermission = hasPermission('access_data_import_center');
  const isAuthorized = hasImportPermission || hasFirestoreAdminAccess;

  // 9-Step Wizard State
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedDataset, setSelectedDataset] = useState<DatasetType>('academy_2027');

  // Firebase Infrastructure Status
  const [firestorePing, setFirestorePing] = useState<{ ok: boolean; message: string } | null>(null);
  const [serverStatus, setServerStatus] = useState<{
    adminSdkAvailable: boolean;
    adminSdkReason: string;
    importOrderSpec: SheetSpec[];
    simulatorImportOrderSpec: SheetSpec[];
    demoCounts: Record<string, number>;
    simulatorCounts: Record<string, number>;
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

  // Column Mapping & Inline Row Fixes
  const [columnMappingsBySheet, setColumnMappingsBySheet] = useState<Record<string, Record<string, string>>>({});
  const [editedRowsBySheet, setEditedRowsBySheet] = useState<Record<string, Record<number, Record<string, any>>>>({});
  const [inlineEditingIssue, setInlineEditingIssue] = useState<ValidationIssue | null>(null);
  const [inlineEditDraft, setInlineEditDraft] = useState<Record<string, string>>({});

  // Parse/Validate state
  const [isParsing, setIsParsing] = useState(false);
  const [validationResult, setValidationResult] = useState<ParseValidateResult | null>(null);
  const [activePreviewSheet, setActivePreviewSheet] = useState<string>('');
  const [issueSeverityFilter, setIssueSeverityFilter] = useState<'all' | 'error' | 'warning'>('all');
  const [issueSheetFilter, setIssueSheetFilter] = useState<string>('all');

  // Step 7 Confirm & Step 8 Execute state
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip');
  const [executionTarget, setExecutionTarget] = useState<ExecutionTarget>('demo_local');
  const [allowPartialOnErrors, setAllowPartialOnErrors] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [progressState, setProgressState] = useState<{
    percent: number;
    currentCollection: string;
    detail: string;
  }>({ percent: 0, currentCollection: '', detail: '' });

  // Step 9 Results, Retry, Verification & History
  const [importLogResult, setImportLogResult] = useState<Record<string, any> | null>(null);
  const [runtimeFailures, setRuntimeFailures] = useState<ValidationIssue[]>([]);
  const [failedDocsForRetry, setFailedDocsForRetry] = useState<Record<string, Record<string, any>[]>>({});
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [importHistory, setImportHistory] = useState<Record<string, any>[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);

  // Storage Official Material Uploader State
  const [storageCategory, setStorageCategory] = useState<StorageUploadCategory>('course_materials');
  const [storageRecordId, setStorageRecordId] = useState<string>('HFC-101');
  const [storageUploading, setStorageUploading] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<StorageUploadResult[]>([]);

  const effectiveApiUserId =
    hasImportPermission
      ? currentUser.id
      : hasFirestoreAdminAccess
      ? 'user_admin'
      : currentUser.id;
  const effectiveApiRole =
    hasImportPermission
      ? currentUser.role
      : hasFirestoreAdminAccess
      ? 'super_admin'
      : currentUser.role;

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      'x-user-id': effectiveApiUserId,
      'x-user-role': effectiveApiRole,
    }),
    [effectiveApiRole, effectiveApiUserId]
  );

  const loadImportStatusAndLogs = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      const [ping, statusRes, logsRes] = await Promise.all([
        testFirestoreConnection(),
        fetch('/api/import/status', {
          headers: { 'x-user-id': effectiveApiUserId, 'x-user-role': effectiveApiRole },
        }),
        fetch('/api/import/logs', {
          headers: { 'x-user-id': effectiveApiUserId, 'x-user-role': effectiveApiRole },
        }),
      ]);
      setFirestorePing(ping);
      if (statusRes.ok) {
        const sData = await statusRes.json();
        setServerStatus(sData);
      }

      const combinedLogs: Record<string, any>[] = [];
      if (logsRes.ok) {
        const lData = await logsRes.json();
        if (Array.isArray(lData.firebaseLogs)) combinedLogs.push(...lData.firebaseLogs);
        if (Array.isArray(lData.demoLogs)) combinedLogs.push(...lData.demoLogs);
      }

      if (hasFirestoreAdminAccess) {
        try {
          const fsLogs = await fetchImportLogsFromFirestore(25);
          combinedLogs.unshift(...fsLogs);
        } catch {
          // ignore if user lacks Firestore admin claim
        }
      }

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
  }, [effectiveApiRole, effectiveApiUserId, hasFirestoreAdminAccess, isAuthorized]);

  useEffect(() => {
    loadImportStatusAndLogs();
  }, [loadImportStatusAndLogs]);

  useEffect(() => {
    if (serverStatus?.adminSdkAvailable) {
      setExecutionTarget('firebase_admin');
    } else if (hasFirestoreAdminAccess) {
      setExecutionTarget('firebase_client');
    } else {
      setExecutionTarget('demo_local');
    }
  }, [hasFirestoreAdminAccess, serverStatus?.adminSdkAvailable]);

  const activeSpecsForDataset = useCallback(
    (ds: DatasetType): SheetSpec[] => {
      if (ds === 'simulator_starter') {
        return serverStatus?.simulatorImportOrderSpec?.length
          ? serverStatus.simulatorImportOrderSpec
          : DEFAULT_SIMULATOR_SPECS;
      }
      return serverStatus?.importOrderSpec?.length
        ? serverStatus.importOrderSpec.map((s) => ({ ...s, stage: 1 as const }))
        : DEFAULT_ACADEMY_SPECS;
    },
    [serverStatus]
  );

  // Fetch existing IDs + code-to-ID aliases from Firestore before validation
  const gatherExistingState = useCallback(
    async (
      ds: 'auto' | DatasetType,
      target: ExecutionTarget
    ): Promise<{
      existingIdsByCollection?: Record<string, string[]>;
      existingCodeToIdByCollection?: Record<string, Record<string, string>>;
      existingCompetencyIds?: string[];
    }> => {
      if (target === 'firebase_client' && auth.currentUser?.emailVerified) {
        const specsToFetch =
          ds === 'auto'
            ? [...activeSpecsForDataset('academy_2027'), ...activeSpecsForDataset('simulator_starter')]
            : activeSpecsForDataset(ds);

        const uniqueColNames = Array.from(new Set([...specsToFetch.map((s) => s.collectionName), 'competencies']));
        const out: Record<string, string[]> = {};
        const codeMapOut: Record<string, Record<string, string>> = {};

        await Promise.all(
          uniqueColNames.map(async (colName) => {
            try {
              const snap = await getFirestoreCollectionDocs(colName);
              out[colName] = Array.from(snap.ids);
              const colCodes: Record<string, string> = {};
              snap.docs.forEach((d) => {
                if (d.code) colCodes[String(d.code).trim().toLowerCase()] = String(d.id);
                if (d.hotelCode) colCodes[String(d.hotelCode).trim().toLowerCase()] = String(d.id);
                if (d.scenarioCode) colCodes[String(d.scenarioCode).trim().toLowerCase()] = String(d.id);
              });
              if (Object.keys(colCodes).length > 0) codeMapOut[colName] = colCodes;
            } catch {
              out[colName] = [];
            }
          })
        );

        const compIds =
          out.competencies && out.competencies.length > 0
            ? out.competencies
            : competencies.map((c) => c.id);
        return {
          existingIdsByCollection: out,
          existingCodeToIdByCollection: codeMapOut,
          existingCompetencyIds: compIds,
        };
      }
      return {
        existingIdsByCollection: undefined,
        existingCodeToIdByCollection: undefined,
        existingCompetencyIds: competencies.map((c) => c.id),
      };
    },
    [activeSpecsForDataset, competencies]
  );

  // Core parse + validate runner
  const runParseAndValidate = useCallback(
    async (params: {
      name: string;
      base64: string;
      datasetHint?: 'auto' | DatasetType;
      sheetsToUse?: string[];
      mappingsOverride?: Record<string, Record<string, string>>;
      editedOverride?: Record<string, Record<number, Record<string, any>>>;
      advanceStepTo?: WizardStep;
    }) => {
      setIsParsing(true);
      try {
        const hintArg: 'auto' | DatasetType = params.datasetHint || 'auto';
        const { existingIdsByCollection, existingCodeToIdByCollection, existingCompetencyIds } =
          await gatherExistingState(hintArg, executionTarget);

        const res = await fetch('/api/import/parse-validate', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            datasetType: params.datasetHint || 'auto',
            fileName: params.name,
            fileBase64: params.base64,
            selectedSheets: params.sheetsToUse,
            existingIdsByCollection,
            existingCodeToIdByCollection,
            existingCompetencyIds,
            columnMappingsBySheet: params.mappingsOverride ?? columnMappingsBySheet,
            editedRowsBySheet: params.editedOverride ?? editedRowsBySheet,
            targetMode: executionTarget,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Failed to parse workbook.', 'error');
          return;
        }

        const resolvedDs: DatasetType =
          data.datasetType === 'simulator_starter' ? 'simulator_starter' : 'academy_2027';
        setSelectedDataset(resolvedDs);

        const val: ParseValidateResult = data.validation;
        let resolvedSpecs: SheetSpec[] = [];
        let isReadme = val.readmeDetected;
        let unknown: string[] = [];

        if (resolvedDs === 'simulator_starter') {
          const allSimSpecs = activeSpecsForDataset('simulator_starter');
          const present = new Set((val.sheetSummaries || []).map((s) => s.sheetName));
          const detectedLower = new Set((val.detectedSheets || []).map((s) => s.toLowerCase()));
          resolvedSpecs = allSimSpecs.filter(
            (sp) => present.has(sp.sheetName) || detectedLower.has(sp.sheetName.toLowerCase())
          );
          if (resolvedSpecs.length === 0) resolvedSpecs = allSimSpecs;
          const knownLower = new Set([
            'readme',
            ...allSimSpecs.map((s) => s.sheetName.toLowerCase()),
          ]);
          unknown = (val.detectedSheets || []).filter((n) => !knownLower.has(n.toLowerCase()));
        } else {
          const det = data.sheetDetection || {};
          isReadme = !!det.readmeDetected;
          resolvedSpecs = (det.businessSheets || []).map((s: SheetSpec) => ({ ...s, stage: 1 as const }));
          unknown = det.unknownSheets || [];
        }

        setReadmeDetected(isReadme);
        setDetectedSheets(resolvedSpecs);
        setUnknownSheets(unknown);
        if (!params.sheetsToUse || params.sheetsToUse.length === 0) {
          setSelectedSheets(resolvedSpecs.map((s) => s.sheetName));
        }
        setValidationResult({ ...val, datasetType: resolvedDs });
        if (val.sheetSummaries?.length > 0 && !activePreviewSheet) {
          setActivePreviewSheet(val.sheetSummaries[0].sheetName);
        } else if (val.sheetSummaries?.length > 0) {
          const stillThere = val.sheetSummaries.some((s) => s.sheetName === activePreviewSheet);
          if (!stillThere) setActivePreviewSheet(val.sheetSummaries[0].sheetName);
        }
        if (params.advanceStepTo) {
          setStep(params.advanceStepTo);
        }
      } catch (err: any) {
        showToast(err?.message || 'Error parsing workbook.', 'error');
      } finally {
        setIsParsing(false);
      }
    },
    [
      activePreviewSheet,
      authHeaders,
      columnMappingsBySheet,
      editedRowsBySheet,
      executionTarget,
      gatherExistingState,
      selectedDataset,
      serverStatus?.simulatorImportOrderSpec,
      showToast,
    ]
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
      setColumnMappingsBySheet({});
      setEditedRowsBySheet({});
      setImportLogResult(null);
      setVerificationResult(null);
      setFailedDocsForRetry({});
      await runParseAndValidate({
        name: file.name,
        base64,
        datasetHint: 'auto',
        advanceStepTo: 3,
      });
      showToast(
        isVi ? `Đã phân tích tệp ${file.name}.` : `Parsed workbook ${file.name}.`,
        'success'
      );
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadTemplate = async (ds: DatasetType) => {
    try {
      const urlPath = ds === 'simulator_starter' ? '/api/import/template?dataset=simulator' : '/api/import/template';
      const res = await fetch(urlPath, {
        headers: { 'x-user-id': effectiveApiUserId, 'x-user-role': effectiveApiRole },
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
      a.download =
        ds === 'simulator_starter'
          ? 'FC_Business_Partner_Simulator_Starter_Dataset.xlsx'
          : 'FC_Learning_Academy_Training_Dataset_2027_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(
        isVi
          ? `Đã tải xuống mẫu ${ds === 'simulator_starter' ? 'Simulator Starter' : 'LMS 2027'} (.xlsx).`
          : `Downloaded ${ds === 'simulator_starter' ? 'Simulator Starter' : 'LMS 2027'} template (.xlsx).`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Template download error.', 'error');
    }
  };

  const handleLoadOfficialSample = async (ds: DatasetType) => {
    try {
      setIsParsing(true);
      setSelectedDataset(ds);
      const urlPath = ds === 'simulator_starter' ? '/api/import/template?dataset=simulator' : '/api/import/template';
      const res = await fetch(urlPath, {
        headers: { 'x-user-id': effectiveApiUserId, 'x-user-role': effectiveApiRole },
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
      const officialName =
        ds === 'simulator_starter'
          ? 'FC_Business_Partner_Simulator_Starter_Dataset.xlsx'
          : 'FC_Learning_Academy_Training_Dataset_2027.xlsx';
      setUploadedFileName(officialName);
      setUploadedFileSize(bytes.byteLength);
      setFileBase64(base64);
      setColumnMappingsBySheet({});
      setEditedRowsBySheet({});
      setImportLogResult(null);
      setVerificationResult(null);
      setFailedDocsForRetry({});
      await runParseAndValidate({
        name: officialName,
        base64,
        datasetHint: ds,
        advanceStepTo: 3,
      });
      showToast(
        ds === 'simulator_starter'
          ? isVi
            ? 'Đã nạp Bộ Dữ Liệu Simulator (11 sheet USALI + README).'
            : 'Loaded FC Business Partner Simulator Dataset (11 USALI sheets + README).'
          : isVi
          ? 'Đã nạp Bộ Dữ Liệu LMS 2027 (259 bản ghi / 9 sheet + README).'
          : 'Loaded 2027 official LMS workbook (259 records across 9 sheets + README).',
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
        isVi ? `Đã kết nối Firebase Auth: ${user.email}` : `Connected Firebase Auth: ${user.email}`,
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

  const runPostImportVerification = async (target: ExecutionTarget, ds: DatasetType = selectedDataset) => {
    setIsVerifying(true);
    try {
      const specs = activeSpecsForDataset(ds);
      if (target === 'firebase_client' && auth.currentUser?.emailVerified && specs.length > 0) {
        const snapshot: Record<string, Record<string, Record<string, any>>> = {};
        for (const spec of specs) {
          const { docs } = await getFirestoreCollectionDocs(spec.collectionName);
          snapshot[spec.collectionName] = {};
          docs.forEach((d) => {
            snapshot[spec.collectionName][String(d.id)] = d;
          });
        }
        const res = await fetch('/api/import/verify', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            source: 'firebase_client',
            datasetType: ds,
            collectionsSnapshot: snapshot,
          }),
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
          body: JSON.stringify({ source, datasetType: ds }),
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

  // Inline Row Fix modal opener
  const openInlineEditor = (issue: ValidationIssue) => {
    setInlineEditingIssue(issue);
    const existingEdits = editedRowsBySheet[issue.sheet]?.[issue.row] || {};
    const summary = validationResult?.sheetSummaries.find((s) => s.sheetName === issue.sheet);
    const rowPreview = summary?.previewRows.find((r) => r._excelRow === issue.row);
    const raw = (rowPreview?._raw || rowPreview || {}) as Record<string, any>;
    setInlineEditDraft({
      [issue.field]: String(existingEdits[issue.field] ?? raw[issue.field] ?? ''),
    });
  };

  const applyInlineEditAndRevalidate = async () => {
    if (!inlineEditingIssue || !fileBase64) return;
    const { sheet, row } = inlineEditingIssue;
    const nextEdited = {
      ...editedRowsBySheet,
      [sheet]: {
        ...(editedRowsBySheet[sheet] || {}),
        [row]: {
          ...((editedRowsBySheet[sheet] || {})[row] || {}),
          ...inlineEditDraft,
        },
      },
    };
    setEditedRowsBySheet(nextEdited);
    setInlineEditingIssue(null);
    await runParseAndValidate({
      name: uploadedFileName,
      base64: fileBase64,
      datasetHint: selectedDataset,
      sheetsToUse: selectedSheets,
      editedOverride: nextEdited,
    });
    showToast(
      isVi ? `Đã cập nhật dòng ${row} sheet ${sheet} và kiểm tra lại.` : `Updated ${sheet} row ${row} and revalidated.`,
      'success'
    );
  };

  // Execute Import (Firebase Client WriteBatch OR Server Firebase Admin / Demo Local Store)
  const handleConfirmImport = async () => {
    if (!validationResult || !fileBase64) return;
    if (validationResult.errorCount > 0 && !allowPartialOnErrors) {
      showToast(
        isVi
          ? 'Tồn tại lỗi dữ liệu. Hãy sửa trực tiếp hoặc bật tùy chọn chỉ nhập dòng hợp lệ.'
          : 'Validation errors remain. Fix rows inline or enable partial import for valid rows only.',
        'error'
      );
      return;
    }

    if (executionTarget === 'firebase_client') {
      if (!auth.currentUser || !auth.currentUser.emailVerified) {
        const msg = isVi
          ? 'Yêu cầu đăng nhập Firebase và xác minh email (Email Verified) để ghi trực tiếp Firestore.'
          : 'Verified Firebase Authentication is required for direct Firestore writes.';
        setExecutionError(msg);
        showToast(msg, 'error');
        return;
      }
      if (!hasFirestoreAdminAccess) {
        const msg = isVi
          ? `Tài khoản ${auth.currentUser.email} (UID: ${auth.currentUser.uid}) chưa có quyền Admin trên Firestore (/admins/${auth.currentUser.uid}). Vui lòng đăng nhập bằng tranchanhtrung@gmail.com hoặc cấp quyền trong bảng Quản Trị.`
          : `Account ${auth.currentUser.email} (UID: ${auth.currentUser.uid}) is not registered as a Firestore Admin in /admins/${auth.currentUser.uid}. Sign in with tranchanhtrung@gmail.com or grant admin role first.`;
        setExecutionError(msg);
        showToast(msg, 'error');
        return;
      }
    }

    setExecutionError(null);
    setStep(8);
    setIsExecuting(true);
    setFailedDocsForRetry({});
    const startedAt = new Date().toISOString();
    setProgressState({
      percent: 5,
      currentCollection: 'Preparing',
      detail: isVi ? 'Đang khởi tạo phiên nhập theo Stage 1 → 2 → 3...' : 'Initializing dependency-ordered import batch...',
    });

    try {
      if (executionTarget === 'firebase_client' && auth.currentUser) {
        const specs = activeSpecsForDataset(selectedDataset).filter((sp) =>
          selectedSheets.some((s) => s.toLowerCase() === sp.sheetName.toLowerCase())
        );

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let failedCount = validationResult.invalidRecords;
        const collectedFailures: ValidationIssue[] = [...validationResult.errors];
        const retryBucket: Record<string, Record<string, any>[]> = {};
        const executionSheetResults: any[] = [];
        const collectionsSnapshot: Record<string, Record<string, Record<string, any>>> = {};

        for (let idx = 0; idx < specs.length; idx++) {
          const spec = specs[idx];
          if (TRANSACTIONAL_PROTECTED_COLLECTIONS.includes(spec.collectionName)) {
            continue;
          }

          setProgressState({
            percent: Math.round(((idx + 0.2) / Math.max(1, specs.length)) * 90),
            currentCollection: spec.collectionName,
            detail: `Stage ${spec.stage || 1} (${idx + 1}/${specs.length}): ${spec.sheetName} -> /${spec.collectionName}`,
          });

          let existingIds = new Set<string>();
          collectionsSnapshot[spec.collectionName] = {};
          try {
            const existingData = await getFirestoreCollectionDocs(spec.collectionName);
            existingIds = existingData.ids;
            existingData.docs.forEach((d) => {
              collectionsSnapshot[spec.collectionName][String(d.id)] = d;
            });
          } catch (readErr: any) {
            const rawReadMsg = readErr instanceof Error ? readErr.message : String(readErr);
            collectedFailures.push({
              sheet: spec.sheetName,
              collection: spec.collectionName,
              row: 0,
              field: 'firestore_read',
              recordId: '*',
              severity: 'error',
              reason: `Cannot query existing docs in /${spec.collectionName}: ${rawReadMsg}`,
            });
          }

          const records = validationResult.sanitizedByCollection[spec.collectionName] || [];
          const outcome = await commitCollectionToFirestore(
            spec.collectionName,
            records,
            existingIds,
            duplicateStrategy
          );

          createdCount += outcome.createdCount;
          updatedCount += outcome.updatedCount;
          skippedCount += outcome.skippedCount;
          failedCount += outcome.failedCount;

          records.forEach((rec) => {
            if (outcome.succeededIds.includes(String(rec.id))) {
              collectionsSnapshot[spec.collectionName][String(rec.id)] = rec;
            }
          });

          if (outcome.failedRecords.length > 0) {
            const failedIdSet = new Set(outcome.failedRecords.map((f) => f.id));
            retryBucket[spec.collectionName] = records.filter((r) => failedIdSet.has(String(r.id)));
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
          }

          executionSheetResults.push({
            sheetName: spec.sheetName,
            collectionName: spec.collectionName,
            created: outcome.createdCount,
            updated: outcome.updatedCount,
            skipped: outcome.skippedCount,
            failed: outcome.failedCount,
          });
        }

        setFailedDocsForRetry(retryBucket);
        setProgressState({
          percent: 95,
          currentCollection: 'verification',
          detail: isVi ? 'Đang kiểm tra toàn vẹn dữ liệu sau nhập...' : 'Running post-import integrity verification...',
        });

        let verif: VerificationResult | null = null;
        try {
          const verifyRes = await fetch('/api/import/verify', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              source: 'firebase_client',
              datasetType: selectedDataset,
              collectionsSnapshot,
            }),
          });
          const verifyJson = await verifyRes.json();
          if (verifyRes.ok && verifyJson.verification) {
            verif = verifyJson.verification;
            setVerificationResult(verif);
          }
        } catch {
          // Non-fatal verification warning
        }

        const completedAt = new Date().toISOString();
        const actorEmail = (auth.currentUser.email || currentUser.email || 'admin@fc-academy.local').slice(0, 200);
        const actorDisplayName = `${currentUser.name || 'Admin'} (${actorEmail})`.slice(0, 200);
        const logDoc = {
          id: `imp_${Date.now()}`,
          datasetType: selectedDataset,
          fileName: (uploadedFileName || 'workbook.xlsx').slice(0, 255),
          performedByUid: auth.currentUser.uid,
          performedByEmail: actorEmail,
          performedByName: actorDisplayName,
          performedByRole: String(effectiveApiRole || 'super_admin').slice(0, 64),
          duplicateStrategy,
          selectedSheets: selectedSheets.slice(0, 20),
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
          sheetSummaries: executionSheetResults.slice(0, 20),
        };

        try {
          await writeImportLogToFirestore(logDoc);
        } catch (logErr: any) {
          const logMsg = logErr instanceof Error ? logErr.message : String(logErr);
          collectedFailures.push({
            sheet: 'importLogs',
            collection: 'importLogs',
            row: 0,
            field: 'firestore_log',
            recordId: logDoc.id,
            severity: 'error',
            reason: `Could not record audit log to /importLogs: ${logMsg}`,
          });
        }

        if (selectedDataset === 'simulator_starter') {
          await writeScenarioImportJobToFirestore({
            id: logDoc.id,
            fileName: logDoc.fileName,
            strategy: duplicateStrategy,
            mode: 'firebase_client',
            status: logDoc.status,
            totalRows: logDoc.totalRowsDetected,
            validRows: logDoc.validRecords,
            errorCount: failedCount,
            warningCount: validationResult.warningCount,
            createdCount,
            updatedCount,
            skippedCount,
            failedCount,
            performedById: auth.currentUser.uid,
            performedByName: actorDisplayName,
            performedByEmail: actorEmail,
            startedAt,
            updatedAt: completedAt,
          }).catch(() => {});

          const importedScenarios = Object.values(collectionsSnapshot.simulationScenarios || {});
          const importedHotels = collectionsSnapshot.hotelSimulationProfiles || {};
          const importedFin = Object.values(collectionsSnapshot.simulationFinancialData || {});
          const importedOps = Object.values(collectionsSnapshot.simulationOperationalData || {});

          for (const scn of importedScenarios) {
            const hotel = importedHotels[String(scn.hotelId)];
            const scnFin = importedFin.filter((f: any) => String(f.scenarioId) === String(scn.id));
            const scnOps = importedOps.filter((o: any) => String(o.scenarioId) === String(scn.id));
            const ds = generateDatasetSnapshotForScenario(scn as any, hotel as any, undefined, scnFin as any, scnOps as any);
            await syncRecordToFirestore(
              'simulationDatasets',
              ds.datasetId || String(scn.id),
              { ...ds, scenarioId: scn.id },
              true
            ).catch(() => {});

            await writeScenarioVersionToFirestore({
              id: `scnver_${scn.id}_v${scn.versionNumber || 1}_${Date.now()}`,
              scenarioId: scn.id,
              scenarioCode: scn.scenarioCode,
              versionNumber: Number(scn.versionNumber || 1),
              datasetVersion: scn.datasetVersion || '2026.v1',
              status: scn.status || 'Validated',
              isActive: scn.status === 'Published',
              changeSummary: `Data Import Center (${duplicateStrategy}) from ${logDoc.fileName}`,
              importJobId: logDoc.id,
              createdBy: currentUser.name,
              createdAt: completedAt,
            }).catch(() => {});
          }
        }

        await fetch('/api/import/log-audit', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            fileName: uploadedFileName,
            summary: `Firebase Batch Commit [${selectedDataset}] (${duplicateStrategy}): Created ${createdCount}, Updated ${updatedCount}, Skipped ${skippedCount}, Failed ${failedCount}`,
          }),
        }).catch(() => {});

        setImportLogResult(logDoc);
        setRuntimeFailures(collectedFailures);
        setProgressState({ percent: 100, currentCollection: 'Done', detail: 'Completed' });
        setStep(9);
        if (createdCount + updatedCount > 0) {
          setDataSourceMode('firestore');
        }
        await Promise.all([
          loadImportStatusAndLogs(),
          refreshFromFirestore(createdCount + updatedCount > 0 ? 'firestore' : undefined),
        ]);
        showToast(
          failedCount > 0 && createdCount + updatedCount === 0
            ? isVi
              ? `Nhập Firestore thất bại (${failedCount} lỗi). Xem chi tiết tại Bước 9.`
              : `Firestore import failed (${failedCount} error(s)). Inspect diagnostics below.`
            : isVi
            ? `Đã ghi ${createdCount + updatedCount} bản ghi lên Firebase Firestore!`
            : `Committed ${createdCount + updatedCount} records to Firebase Firestore!`,
          failedCount > 0 && createdCount + updatedCount === 0
            ? 'error'
            : failedCount > 0
            ? 'info'
            : 'success'
        );
      } else {
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
            datasetType: selectedDataset,
            fileName: uploadedFileName,
            fileBase64,
            selectedSheets,
            duplicateStrategy,
            mode: executionTarget,
            allowPartialOnErrors,
            columnMappingsBySheet,
            editedRowsBySheet,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setExecutionError(data.error || 'Import execution failed.');
          showToast(data.error || 'Import execution failed.', 'error');
          setIsExecuting(false);
          return;
        }

        setProgressState({ percent: 100, currentCollection: 'Done', detail: 'Completed' });
        setImportLogResult(data.log);
        setRuntimeFailures(data.runtimeFailures || []);
        setVerificationResult(data.verification || null);
        setStep(9);
        if (data.mode === 'firebase_admin' && (data.log?.createdCount || 0) + (data.log?.updatedCount || 0) > 0) {
          setDataSourceMode('firestore');
        }
        await Promise.all([
          loadImportStatusAndLogs(),
          refreshSimulatorData(),
          ...(data.mode === 'firebase_admin' ? [refreshFromFirestore('firestore')] : []),
        ]);
        showToast(
          data.mode === 'firebase_admin'
            ? 'Imported dataset into Firebase Firestore via Admin SDK.'
            : isVi
            ? `Đã nhập ${selectedDataset === 'simulator_starter' ? 'Simulator Dataset' : 'LMS 2027'} ở Chế độ Demo Local.`
            : `Imported ${selectedDataset === 'simulator_starter' ? 'Simulator Dataset' : 'LMS 2027'} in Demo Local Mode.`,
          'success'
        );
      }
    } catch (err: any) {
      const msg = err?.message || 'Error executing import.';
      setExecutionError(msg);
      showToast(msg, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  // Retry Failed Records Only
  const handleRetryFailedRecords = async () => {
    const entries = Object.entries(failedDocsForRetry).filter(([, arr]) => arr.length > 0);
    if (entries.length === 0 || !auth.currentUser?.emailVerified) return;

    setIsExecuting(true);
    let recovered = 0;
    const stillFailed: ValidationIssue[] = [];
    const nextRetryBucket: Record<string, Record<string, any>[]> = {};

    try {
      for (const [colName, docs] of entries) {
        const existingData = await getFirestoreCollectionDocs(colName);
        const outcome = await commitCollectionToFirestore(colName, docs, existingData.ids, 'update');
        recovered += outcome.createdCount + outcome.updatedCount;
        if (outcome.failedRecords.length > 0) {
          const failIds = new Set(outcome.failedRecords.map((f) => f.id));
          nextRetryBucket[colName] = docs.filter((d) => failIds.has(String(d.id)));
          outcome.failedRecords.forEach((f) => {
            stillFailed.push({
              sheet: colName,
              collection: colName,
              row: 0,
              field: 'retry_write',
              recordId: f.id,
              severity: 'error',
              reason: f.reason,
            });
          });
        }
      }
      setFailedDocsForRetry(nextRetryBucket);
      setRuntimeFailures(stillFailed);
      await runPostImportVerification('firebase_client', selectedDataset);
      await refreshFromFirestore();
      showToast(
        isVi ? `Đã khôi phục thành công ${recovered} bản ghi lỗi.` : `Recovered ${recovered} failed records.`,
        stillFailed.length === 0 ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast(err?.message || 'Retry failed.', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  // Upload authorized PDF/XLSX/DOCX curriculum file to Firebase Storage
  const handleUploadStorageAsset = async (file: File) => {
    try {
      setStorageUploading(true);
      const uploaded = await uploadAuthorizedTrainingFile({
        file,
        category: storageCategory,
        recordId: storageRecordId || 'general',
      });
      setUploadedAssets((prev) => [uploaded, ...prev]);
      showToast(
        isVi
          ? `Đã tải tệp "${file.name}" lên Firebase Storage.`
          : `Uploaded "${file.name}" to Firebase Storage.`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Firebase Storage upload failed.', 'error');
    } finally {
      setStorageUploading(false);
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
            ? 'Chỉ Quản Trị Viên Cấp Cao (Super Admin) và Giám Đốc Đào Tạo (L&D Manager) mới được quyền truy cập Trung Tâm Nhập Dữ Liệu Firebase.'
            : 'Only Super Administrators and authorized L&D Managers may access the Firebase Data Import Center.'}
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
    if (issueSheetFilter !== 'all') {
      return base.filter((iss) => iss.sheet === issueSheetFilter);
    }
    return base;
  })();

  const displayedIssues = (() => {
    if (issueSheetFilter !== 'all') {
      return visibleIssues.slice(0, 150);
    }
    const perSheetCounts = new Map<string, number>();
    const stratified: ValidationIssue[] = [];
    for (const iss of visibleIssues) {
      const count = perSheetCounts.get(iss.sheet) || 0;
      if (count < 20) {
        stratified.push(iss);
        perSheetCounts.set(iss.sheet, count + 1);
      }
      if (stratified.length >= 200) break;
    }
    return stratified;
  })();

  const totalDuplicatesSelected =
    validationResult?.sheetSummaries.reduce((acc, s) => acc + s.existingDuplicateCount, 0) || 0;

  const totalRetryCount = Object.values(failedDocsForRetry).reduce((a, b) => a + b.length, 0);

  const stepLabels: Array<{ num: WizardStep; title: string }> = [
    { num: 1, title: isVi ? '1. Chọn Bộ Dữ Liệu' : '1. Dataset' },
    { num: 2, title: isVi ? '2. Tải Tệp' : '2. Upload' },
    { num: 3, title: isVi ? '3. Chọn Sheet' : '3. Worksheets' },
    { num: 4, title: isVi ? '4. Ánh Xạ Cột' : '4. Mapping' },
    { num: 5, title: isVi ? '5. Kiểm Tra & Sửa' : '5. Validate' },
    { num: 6, title: isVi ? '6. Xem Trước' : '6. Preview' },
    { num: 7, title: isVi ? '7. Xác Nhận' : '7. Confirm' },
    { num: 8, title: isVi ? '8. Thực Thi' : '8. Execute' },
    { num: 9, title: isVi ? '9. Báo Cáo' : '9. Verify' },
  ];

  const isCanClickStep = (num: WizardStep): boolean => {
    if (num === 1 || num === 2) return true;
    if (num >= 3 && num <= 7) return !!fileBase64 && !!validationResult;
    if (num === 8) return isExecuting || !!importLogResult;
    if (num === 9) return !!importLogResult;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0A192F] text-white p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-md flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
            <Database className="w-3.5 h-3.5" />
            <span>Administration &rarr; Data Management &rarr; Firebase Data Import Center</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {isVi
              ? 'Trung Tâm Nhập Dữ Liệu Firebase (LMS 2027 + Simulator USALI)'
              : 'Firebase Data Import Center (LMS 2027 + USALI Simulator)'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            {isVi
              ? 'Quy trình 9 bước chuẩn hóa dữ liệu Excel (.xlsx), ánh xạ cột, kiểm tra toán học USALI xác định, sửa lỗi trực tiếp và ghi an toàn vào Cloud Firestore (fc-learning-academy).'
              : '9-step dual-dataset ingestion wizard with schema mapping, deterministic USALI arithmetic checks, inline row fixes, and dependency-ordered Firestore batch writes.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => handleDownloadTemplate('academy_2027')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isVi ? 'Mẫu LMS 2027 (.xlsx)' : 'LMS 2027 Template'}</span>
          </button>
          <button
            onClick={() => handleDownloadTemplate('simulator_starter')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 font-bold text-xs shadow-sm cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isVi ? 'Mẫu Simulator (.xlsx)' : 'Simulator Template'}</span>
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
            <span className="font-bold text-slate-800">Project:</span>
            <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
              {firebaseConfigSummary.projectId} / {firebaseConfigSummary.databaseId.slice(0, 22)}...
            </code>
          </div>

          {firebaseUser ? (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-bold ${
                hasFirestoreAdminAccess
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {firebaseUser.email} {firebaseUser.emailVerified ? '• Verified' : '• Email Unverified'}
                {hasFirestoreAdminAccess
                  ? ' • Firestore Admin'
                  : firebaseUser.emailVerified
                  ? ` • Viewer Only (UID: ${firebaseUser.uid.slice(0, 8)}...)`
                  : ''}
              </span>
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
                  ? 'Chế độ Demo Sandbox sẵn sàng — Đăng nhập Firebase Auth (Google/Email) để ghi trực tiếp Firestore'
                  : 'Sandbox ready — Sign in via Firebase Auth to write live to Firestore'}
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
              <span>{isVi ? 'Đăng xuất Firebase' : 'Sign Out Firebase'}</span>
            </button>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isVi ? 'Đăng Nhập Google (Firebase)' : 'Sign in with Google (Firebase)'}</span>
            </button>
          )}
          <button
            onClick={() => {
              loadImportStatusAndLogs();
              refreshFromFirestore();
            }}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
            title={isVi ? 'Làm mới trạng thái Firebase' : 'Refresh status'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 9-Step Wizard Stepper */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[920px] gap-1.5">
          {stepLabels.map((st, idx) => {
            const isCurrent = step === st.num;
            const isDone = step > st.num;
            const canClick = isCanClickStep(st.num);

            return (
              <React.Fragment key={st.num}>
                <button
                  disabled={!canClick}
                  onClick={() => canClick && setStep(st.num)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                    isCurrent
                      ? 'bg-[#0A192F] text-amber-400 shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-pointer'
                      : canClick
                      ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer'
                      : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : null}
                  <span>{st.title}</span>
                </button>
                {idx < stepLabels.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: SELECT DATASET */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Dataset 1 Card */}
            <div
              onClick={() => setSelectedDataset('academy_2027')}
              className={`bg-white p-6 rounded-2xl border-2 transition-all cursor-pointer space-y-4 ${
                selectedDataset === 'academy_2027'
                  ? 'border-[#0A192F] ring-2 ring-amber-400/50 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px] uppercase">
                    Dataset 1 &bull; Stage 1 Core LMS (9 Sheets)
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-2">
                    FC_Learning_Academy_Training_Dataset_2027.xlsx
                  </h3>
                </div>
                {selectedDataset === 'academy_2027' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isVi
                  ? 'Khung năng lực chuẩn 2027 (6 Domains, 4 Levels, 30 Competencies, 120 Rubrics), 18 Khóa học, 60 Câu hỏi, 6 OJT, 12 Training Matrix và 3 Career Paths.'
                  : 'Official 2027 LMS Curriculum: Competency Domains, Proficiency Levels, 30 Competencies, 120 Rubrics, 18 Courses, 60 Questions, 6 Practical Assignments, Training Matrix, and Career Paths.'}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadOfficialSample('academy_2027');
                  }}
                  disabled={isParsing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Nạp Nhanh Dataset 1 (259 dòng)' : 'Quick-Load Dataset 1 (259 rows)'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTemplate('academy_2027');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Template</span>
                </button>
              </div>
            </div>

            {/* Dataset 2 Card */}
            <div
              onClick={() => setSelectedDataset('simulator_starter')}
              className={`bg-white p-6 rounded-2xl border-2 transition-all cursor-pointer space-y-4 ${
                selectedDataset === 'simulator_starter'
                  ? 'border-[#0A192F] ring-2 ring-amber-400/50 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] uppercase">
                    Dataset 2 &bull; Stage 2 & 3 Simulator (11 Sheets)
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-2">
                    FC_Business_Partner_Simulator_Starter_Dataset.xlsx
                  </h3>
                </div>
                {selectedDataset === 'simulator_starter' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isVi
                  ? 'Hồ sơ khách sạn, Kịch bản mô phỏng GM-FC, Dữ liệu tài chính USALI (GOP/Flow-Through), KPI vận hành (Occupancy/ADR/RevPAR), Nhiệm vụ, Phương án quyết định và Rubric chấm điểm.'
                  : 'Hotel Simulation Profiles, Scenarios, USALI Financial & Operational KPI Datasets, Challenges, Tasks, Decision Options, GM Roleplay Turns, and 100%-weighted Evaluation Rubrics.'}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadOfficialSample('simulator_starter');
                  }}
                  disabled={isParsing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Nạp Nhanh Dataset 2 (USALI Simulator)' : 'Quick-Load Dataset 2 (Simulator)'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTemplate('simulator_starter');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Template</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="text-slate-600">
              {isVi ? 'Đang chọn:' : 'Selected Dataset:'}{' '}
              <strong className="text-slate-900">
                {selectedDataset === 'simulator_starter'
                  ? 'FC_Business_Partner_Simulator_Starter_Dataset.xlsx (11 sheets)'
                  : 'FC_Learning_Academy_Training_Dataset_2027.xlsx (9 sheets)'}
              </strong>
              {Object.keys(productionCounts).length > 0 && (
                <span className="ml-3 text-emerald-700 font-bold">
                  (Live Firestore Docs: {Object.values(productionCounts).reduce((a, b) => a + b, 0)})
                </span>
              )}
            </div>
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold cursor-pointer"
            >
              <span>{isVi ? 'Tiếp Tục Tải Tệp Excel' : 'Continue to Upload'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: UPLOAD EXCEL */}
      {step === 2 && (
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
            <p className="text-xs text-slate-500 mt-1.5 max-w-xl mx-auto">
              {isVi
                ? 'Hệ thống tự động nhận diện Dataset 1 (LMS 2027 - 9 sheets) hoặc Dataset 2 (Simulator - 11 sheets) và tự động loại trừ sheet README.'
                : 'Auto-detects Dataset 1 (LMS 2027 - 9 sheets) or Dataset 2 (Simulator Starter - 11 sheets) and automatically excludes README.'}
            </p>
            {isParsing && (
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#0A192F]">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{isVi ? 'Đang phân tích cấu trúc & kiểm tra USALI...' : 'Parsing structure & running validation...'}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isVi ? 'Quay lại chọn bộ dữ liệu' : 'Back to Dataset'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLoadOfficialSample(selectedDataset)}
                disabled={isParsing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isVi
                    ? `Nạp mẫu chuẩn (${selectedDataset === 'simulator_starter' ? 'Simulator' : '2027'})`
                    : `Quick-Load (${selectedDataset === 'simulator_starter' ? 'Simulator' : '2027'})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: DETECT WORKSHEETS */}
      {step === 3 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>{uploadedFileName}</span>
                <span className="text-xs font-mono font-normal text-slate-500">
                  ({Math.round(uploadedFileSize / 1024)} KB)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0A192F] text-amber-400 text-[10px] font-bold uppercase">
                  {selectedDataset === 'simulator_starter' ? 'Simulator (11 Sheets)' : 'LMS 2027 (9 Sheets)'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isVi
                  ? 'Các sheet được sắp xếp tự động theo thứ tự phụ thuộc khóa ngoại Stage 1 → 2 → 3.'
                  : 'Worksheets are ordered strictly by foreign-key dependency stage (1 → 2 → 3).'}
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
                    ? 'Sheet hướng dẫn được nhận diện và tự động loại trừ khỏi Firestore.'
                    : 'Instruction sheet detected and permanently excluded from Firestore import.'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px] uppercase">
                Excluded
              </span>
            </div>
          )}

          {validationResult?.missingSheets && validationResult.missingSheets.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <strong>{isVi ? 'Cảnh báo thiếu worksheet:' : 'Missing expected worksheets:'}</strong>{' '}
              {validationResult.missingSheets.join(', ')}
            </div>
          )}

          {unknownSheets.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <strong>{isVi ? 'Sheet phụ bỏ qua:' : 'Unmapped sheets skipped:'}</strong>{' '}
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
                    <div className="flex items-center gap-1.5">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#0A192F] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="px-2 py-0.5 rounded bg-[#0A192F] text-amber-400 font-mono text-[10px] font-bold">
                        S{spec.stage || 1} #{spec.order}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {summary ? `${summary.detectedRows} rows` : `~${spec.expectedCount}`}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 mt-2.5">{spec.sheetName}</h4>
                  <p className="text-[11px] font-mono text-slate-500">&rarr; /{spec.collectionName}</p>
                  {spec.dependencies.length > 0 && (
                    <p className="text-[10px] text-slate-500 mt-2">FK: {spec.dependencies.join(', ')}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isVi ? 'Chọn tệp khác' : 'Change File'}</span>
            </button>

            <button
              disabled={selectedSheets.length === 0 || isParsing}
              onClick={() =>
                runParseAndValidate({
                  name: uploadedFileName,
                  base64: fileBase64,
                  datasetHint: selectedDataset,
                  sheetsToUse: selectedSheets,
                  advanceStepTo: 4,
                })
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isParsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
              <span>
                {isVi
                  ? `Ánh Xạ Cột (${selectedSheets.length} sheet)`
                  : `Inspect Column Mapping (${selectedSheets.length} sheets)`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DATA MAPPING */}
      {step === 4 && validationResult && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-blue-600" />
                <span>
                  {isVi
                    ? 'Ánh Xạ Cột & Kiểm Tra Khóa Ngoại (Column Mapping)'
                    : 'Worksheet Column Mapping & Relationship Resolution'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isVi
                  ? 'Hệ thống tự động chuẩn hóa tên cột (camelCase / snake_case). Bạn có thể chỉnh lại ánh xạ cột nếu tệp Excel dùng tiêu đề tùy chỉnh.'
                  : 'Headers are auto-normalized cleanly. Override any custom column header mapping below and revalidate.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {typeof validationResult.unresolvedRelationships === 'number' && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    validationResult.unresolvedRelationships === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  Unresolved FKs: {validationResult.unresolvedRelationships}
                </span>
              )}
              <button
                onClick={() =>
                  runParseAndValidate({
                    name: uploadedFileName,
                    base64: fileBase64,
                    datasetHint: selectedDataset,
                    sheetsToUse: selectedSheets,
                    mappingsOverride: columnMappingsBySheet,
                  })
                }
                disabled={isParsing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isParsing ? 'animate-spin' : ''}`} />
                <span>{isVi ? 'Áp Dụng Mapping & Kiểm Tra' : 'Apply Mapping & Revalidate'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {validationResult.sheetSummaries.map((s) => {
              const targetFields = CANONICAL_FIELDS_BY_SHEET[s.sheetName] || [];
              const sheetMap = columnMappingsBySheet[s.sheetName] || {};
              return (
                <div key={s.sheetName} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-slate-900">{s.sheetName}</span>
                      <span className="text-[11px] font-mono text-slate-500 ml-2">&rarr; /{s.collectionName}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {(s.detectedHeaders || []).length} cols
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(s.detectedHeaders || []).map((hdr) => {
                      const autoGuess = hdr
                        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
                        .trim()
                        .toLowerCase()
                        .replace(/[\s\-]+/g, '_');
                      const selectedVal = sheetMap[hdr] ?? '';
                      return (
                        <div key={hdr} className="flex items-center justify-between gap-2 text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                          <code className="font-mono font-bold text-slate-800 truncate">{hdr}</code>
                          <span className="text-slate-400">&rarr;</span>
                          <select
                            value={selectedVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setColumnMappingsBySheet((prev) => ({
                                ...prev,
                                [s.sheetName]: {
                                  ...(prev[s.sheetName] || {}),
                                  [hdr]: val,
                                },
                              }));
                            }}
                            className="px-2 py-1 rounded border border-slate-300 bg-slate-50 text-[11px] font-mono text-slate-700"
                          >
                            <option value="">Auto ({autoGuess})</option>
                            {targetFields.map((tf) => (
                              <option key={tf} value={tf}>
                                {tf}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isVi ? 'Quay lại chọn sheet' : 'Back to Worksheets'}</span>
            </button>
            <button
              onClick={() => setStep(5)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer"
            >
              <span>{isVi ? 'Tiếp Tục Kiểm Tra & Sửa Lỗi' : 'Continue to Validation & Inline Fix'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: VALIDATION & INLINE FIX */}
      {step === 5 && validationResult && (
        <div className="space-y-5">
          {/* KPI Cards */}
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

          {/* USALI Deterministic Math Banner (Dataset 2) */}
          {typeof validationResult.financialChecksRun === 'number' && validationResult.financialChecksRun > 0 && (
            <div
              className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                validationResult.financialChecksPassed === validationResult.financialChecksRun
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calculator className="w-5 h-5 shrink-0" />
                <div>
                  <strong className="block">
                    {isVi
                      ? 'Kiểm Toán Công Thức USALI & KPI Xác Định (Deterministic Engine)'
                      : 'Deterministic USALI Financial & KPI Arithmetic Audit'}
                  </strong>
                  <span>
                    Departmental Profit, GOP, GOP Margin %, Occupancy %, ADR & RevPAR:{' '}
                    <strong>
                      {validationResult.financialChecksPassed} / {validationResult.financialChecksRun} passed
                    </strong>
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-white font-mono font-bold text-[11px] border border-current/20">
                100% Formula-Checked (No LLM)
              </span>
            </div>
          )}

          {/* Per-sheet Validation Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {isVi ? 'Trạng Thái Kiểm Tra Theo Từng Sheet' : 'Sheet-by-Sheet Validation Summary'}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {validationResult.errorCount > 0 && (
                  <button
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 font-bold text-blue-800 cursor-pointer"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Ánh Xạ Cột (Bước 4)' : 'Column Mapping (Step 4)'}</span>
                  </button>
                )}
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

            {validationResult.errorCount > 0 &&
              validationResult.sheetSummaries.some((s) => s.errorCount > 0 && (s.detectedHeaders || []).length > 0) && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      {isVi
                        ? 'Các cột Excel đã đọc được ở các sheet có lỗi (nếu tên cột khác chuẩn, vào Bước 4 Ánh Xạ Cột để ghép nhanh):'
                        : 'Detected Excel headers on sheets with errors (use Step 4 Column Mapping if any custom column header needs mapping):'}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto text-[11px]">
                    {validationResult.sheetSummaries
                      .filter((s) => s.errorCount > 0 && (s.detectedHeaders || []).length > 0)
                      .map((s) => {
                        const firstErr = validationResult.errors.find((e) => e.sheet === s.sheetName);
                        return (
                          <div key={s.sheetName} className="font-mono text-slate-800">
                            <strong className="text-amber-900">{s.sheetName}</strong> (header row {s.headerRowNumber || 1}):{' '}
                            <span className="text-slate-600">{(s.detectedHeaders || []).join(', ')}</span>
                            {firstErr && (
                              <div className="text-rose-700 font-semibold mt-0.5">
                                &bull; Sample error (row {firstErr.row}, {firstErr.field}): {firstErr.reason}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

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
                      onClick={() => {
                        setActivePreviewSheet(s.sheetName);
                        setStep(6);
                      }}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{s.order}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.sheetName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{s.collectionName}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{s.detectedRows}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{s.validRows}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">{s.errorCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-bold">{s.existingDuplicateCount}</td>
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

          {/* Inline Row Editor Drawer */}
          {inlineEditingIssue && (
            <div className="bg-amber-50 p-5 rounded-2xl border-2 border-amber-400 shadow-md space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-700" />
                  <span>
                    {isVi
                      ? `Sửa Trực Tiếp Dòng ${inlineEditingIssue.row} — ${inlineEditingIssue.sheet}`
                      : `Inline Fix: ${inlineEditingIssue.sheet} Row ${inlineEditingIssue.row}`}
                  </span>
                </div>
                <button
                  onClick={() => setInlineEditingIssue(null)}
                  className="text-slate-600 font-bold hover:text-slate-900 cursor-pointer"
                >
                  Close
                </button>
              </div>
              <p className="text-rose-800 font-semibold">{inlineEditingIssue.reason}</p>
              {(() => {
                const sm = validationResult.sheetSummaries.find((s) => s.sheetName === inlineEditingIssue.sheet);
                const rp = sm?.previewRows.find((r) => r._excelRow === inlineEditingIssue.row);
                const rawObj = rp?._raw as Record<string, any> | undefined;
                if (!rawObj) return null;
                const pairs = Object.entries(rawObj)
                  .filter(([, v]) => v !== undefined && String(v).trim() !== '')
                  .slice(0, 8);
                if (pairs.length === 0) return null;
                return (
                  <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200 font-mono text-[11px] text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                    {pairs.map(([k, v]) => (
                      <span key={k}>
                        <strong className="text-slate-900">{k}:</strong> {String(v).slice(0, 60)}
                      </span>
                    ))}
                  </div>
                );
              })()}
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block font-bold text-slate-700 mb-1 font-mono">
                    {inlineEditingIssue.field}
                  </label>
                  <input
                    type="text"
                    value={inlineEditDraft[inlineEditingIssue.field] ?? ''}
                    onChange={(e) =>
                      setInlineEditDraft((prev) => ({
                        ...prev,
                        [inlineEditingIssue.field]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono text-xs"
                  />
                </div>
                <button
                  onClick={applyInlineEditAndRevalidate}
                  disabled={isParsing}
                  className="px-4 py-2 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isVi ? 'Lưu & Kiểm Tra Lại' : 'Apply Fix & Revalidate'}
                </button>
              </div>
            </div>
          )}

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

                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                  <select
                    value={issueSheetFilter}
                    onChange={(e) => setIssueSheetFilter(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    <option value="all">{isVi ? 'Tất cả Sheet (mẫu đại diện)' : 'All Sheets (Stratified)'}</option>
                    {validationResult.sheetSummaries
                      .filter((s) => s.errorCount > 0 || s.warningCount > 0)
                      .map((s) => (
                        <option key={s.sheetName} value={s.sheetName}>
                          {s.sheetName} ({s.errorCount}E / {s.warningCount}W)
                        </option>
                      ))}
                  </select>
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
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedIssues.map((iss, i) => (
                      <tr key={i} className={iss.severity === 'error' ? 'bg-rose-50/40' : 'bg-amber-50/40'}>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              iss.severity === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
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
                        <td className="py-2 px-3 text-right">
                          {iss.row > 0 && (
                            <button
                              onClick={() => openInlineEditor(iss)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-300 hover:bg-amber-100 font-bold text-[10px] text-slate-800 cursor-pointer"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>{isVi ? 'Sửa dòng' : 'Fix Row'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isVi ? 'Quay lại ánh xạ cột' : 'Back to Mapping'}</span>
            </button>

            <button
              onClick={() => setStep(6)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer"
            >
              <span>{isVi ? 'Xem Trước Dữ Liệu' : 'Continue to Data Preview'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: DATA PREVIEW */}
      {step === 6 && validationResult && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          {/* Worksheet Switcher Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
            {validationResult.sheetSummaries.map((s) => (
              <button
                key={s.sheetName}
                onClick={() => setActivePreviewSheet(s.sheetName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activePreviewSheet === s.sheetName
                    ? 'bg-[#0A192F] text-amber-400 shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                #{s.order} {s.sheetName} ({s.detectedRows})
              </button>
            ))}
          </div>

          {activePreviewSummary && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-extrabold text-slate-900">
                  {activePreviewSummary.sheetName} &rarr;{' '}
                  <code className="text-xs font-mono text-slate-500">/{activePreviewSummary.collectionName}</code>
                </h4>
                <span className="text-[11px] text-slate-500">
                  Valid: <strong className="text-emerald-700">{activePreviewSummary.validRows}</strong> /{' '}
                  {activePreviewSummary.detectedRows}
                </span>
              </div>

              {/* USALI Financial / Operational KPI Strip for Dataset 2 */}
              {(activePreviewSummary.sheetName === 'Financial_Dataset' ||
                activePreviewSummary.sheetName === 'Operational_Dataset') &&
                activePreviewSummary.previewRows.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {activePreviewSummary.previewRows.slice(0, 3).map((r, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 font-mono">
                        <div className="font-bold text-slate-900">{r.scenarioId || r.id} ({r.periodLabel || 'Monthly'})</div>
                        {activePreviewSummary.sheetName === 'Financial_Dataset' ? (
                          <div className="text-[11px] text-slate-700">
                            Rev: ${Number(r.totalOperatingRevenue || 0).toLocaleString()} | GOP: ${Number(r.gop || 0).toLocaleString()} ({r.gopMarginPct}%)
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-700">
                            Occ: {r.occupancyPct}% | ADR: ${r.adr} | RevPAR: ${r.revpar}
                          </div>
                        )}
                      </div>
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
                            !['id', '_excelRow', '_isDuplicate', '_hasError', '_raw', 'importedAt', 'importBatchId'].includes(
                              k
                            )
                        )
                        .slice(0, 5)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(',') : String(v).slice(0, 40)}`)
                        .join(' | ');
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-500">{r._excelRow}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.id}</td>
                          <td className="py-2 px-3">
                            {r._hasError ? (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">INVALID</span>
                            ) : r._isDuplicate ? (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">EXISTS</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">NEW</span>
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

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(5)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isVi ? 'Quay lại kiểm tra lỗi' : 'Back to Validation'}</span>
            </button>
            <button
              onClick={() => setStep(7)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer"
            >
              <span>{isVi ? 'Tiếp Tục Xác Nhận Nhập' : 'Proceed to Confirm Import'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: CONFIRM IMPORT */}
      {step === 7 && validationResult && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-extrabold text-slate-900">
              {isVi ? 'Cấu Hình Xử Lý Trùng Lặp & Đích Lưu Trữ' : 'Duplicate Policy & Target Firestore Confirmation'}
            </h3>
          </div>

          <div className="space-y-2.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
              {isVi
                ? `Chiến Lược Xử Lý Trùng ID (${totalDuplicatesSelected} bản ghi trùng)`
                : `Duplicate Record Policy (${totalDuplicatesSelected} existing duplicates detected)`}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {[
                {
                  id: 'skip' as DuplicateStrategy,
                  title: isVi ? 'Skip Existing (Mặc định)' : 'Skip Existing Records (Default)',
                  desc: isVi
                    ? 'Chỉ thêm bản ghi mới, giữ nguyên bản ghi đã tồn tại.'
                    : 'Preserve existing records untouched and insert only new document IDs.',
                },
                {
                  id: 'update' as DuplicateStrategy,
                  title: isVi ? 'Update Existing (Upsert / Merge)' : 'Update Existing (Merge / Upsert)',
                  desc: isVi
                    ? 'Cập nhật hợp nhất thông tin mới cho các ID trùng khớp.'
                    : 'Merge updated fields into matching master collection IDs.',
                },
                {
                  id: 'reject' as DuplicateStrategy,
                  title: isVi ? 'Insert New / Fail Duplicates' : 'Create Only (Reject Duplicates)',
                  desc: isVi
                    ? 'Đánh dấu tất cả bản ghi trùng ID là lỗi từ chối.'
                    : 'Reject duplicate document IDs and log them in the failure report.',
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

          {/* Execution Target Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
              {isVi ? 'Đích Lưu Trữ Dữ Liệu (Database Target)' : 'Database Execution Target'}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <button
                onClick={() => hasFirestoreAdminAccess && setExecutionTarget('firebase_client')}
                disabled={!hasFirestoreAdminAccess}
                className={`p-4 rounded-xl border text-left transition-all ${
                  executionTarget === 'firebase_client'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500'
                    : hasFirestoreAdminAccess
                    ? 'border-slate-200 hover:bg-slate-50 cursor-pointer'
                    : 'border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed'
                }`}
              >
                <div className="font-extrabold text-slate-900">Firebase Firestore Live (Client SDK)</div>
                <p className="text-[11px] text-slate-600 mt-1">
                  {hasFirestoreAdminAccess
                    ? `Admin Verified: ${firebaseUser?.email}`
                    : firebaseUser?.emailVerified
                    ? isVi
                      ? `${firebaseUser.email} chưa có quyền trong /admins (${firebaseUser.uid}). Hãy đăng nhập tranchanhtrung@gmail.com.`
                      : `${firebaseUser.email} is not registered in /admins (${firebaseUser.uid}). Sign in as tranchanhtrung@gmail.com.`
                    : isVi
                    ? 'Đăng nhập Firebase Auth đã xác minh email để ghi trực tiếp.'
                    : 'Requires verified Firebase Admin Auth session above.'}
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
                    ? 'Lưu mô phỏng trên máy chủ cục bộ (.data/*.json) để kiểm thử end-to-end.'
                    : 'Local sandbox JSON persistence with full validation & Simulator preview.'}
                </p>
              </button>
            </div>
          </div>

          {validationResult.errorCount > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-bold text-rose-900">
                  {isVi
                    ? `Phát hiện ${validationResult.errorCount} lỗi tại ${validationResult.invalidRecords} dòng.`
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
                      ? `Chỉ nhập ${validationResult.validRecords} bản ghi hợp lệ và ghi nhận ${validationResult.invalidRecords} dòng lỗi`
                      : `Import ${validationResult.validRecords} valid records and log ${validationResult.invalidRecords} invalid rows`}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Transactional Collection Protection Notice */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs flex items-start gap-3 text-blue-900">
            <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-1">
                {isVi ? 'Bảo Vệ Tuyệt Đối Dữ Liệu Giao Dịch Học Viên:' : 'Transactional Collection Overwrite Protection:'}
              </strong>
              <span>
                {isVi
                  ? 'Các collection sau bị khóa ghi từ Data Import Center và không bao giờ bị ghi đè: '
                  : 'The following learner transactional collections are strictly protected and never overwritten by imports: '}
                <code className="font-mono text-[11px]">{TRANSACTIONAL_PROTECTED_COLLECTIONS.join(', ')}</code>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(6)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isVi ? 'Quay lại xem trước' : 'Back to Preview'}</span>
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
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isVi
                  ? `Thực Thi Nhập ${validationResult.validRecords} Bản Ghi`
                  : `Execute Import (${validationResult.validRecords} Valid Records)`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 8: EXECUTE */}
      {step === 8 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-amber-400 flex items-center gap-2">
                {isExecuting && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{progressState.currentCollection || 'Processing'}</span>
              </span>
              <span className="font-mono">{progressState.percent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progressState.percent}%` }}
              />
            </div>
            <p className="text-xs text-slate-300 font-mono">{progressState.detail}</p>
          </div>

          {executionError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
              <div className="font-extrabold flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{isVi ? 'Lỗi Khi Ghi Dữ Liệu Lên Firestore:' : 'Import Execution Error:'}</span>
              </div>
              <p className="font-mono text-[11px] break-all">{executionError}</p>
              <button
                onClick={() => setStep(7)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 font-bold text-rose-800 hover:bg-rose-100 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isVi ? 'Quay lại Xác nhận' : 'Back to Confirm'}</span>
              </button>
            </div>
          )}

          {!isExecuting && importLogResult && (
            <div className="flex justify-end">
              <button
                onClick={() => setStep(9)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A192F] text-amber-400 font-bold text-xs cursor-pointer"
              >
                <span>{isVi ? 'Xem Báo Cáo & Đối Chiếu' : 'View Import Report & Verify'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 9: IMPORT REPORT & VERIFY */}
      {step === 9 && importLogResult && (
        <div className="space-y-6">
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
                  {importLogResult.performedByName} ({importLogResult.performedByRole}) &bull; {importLogResult.startedAt}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {totalRetryCount > 0 && executionTarget === 'firebase_client' && (
                  <button
                    onClick={handleRetryFailedRecords}
                    disabled={isExecuting}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {isVi ? `Thử Lại ${totalRetryCount} Bản Ghi Lỗi` : `Retry Failed Records Only (${totalRetryCount})`}
                    </span>
                  </button>
                )}
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

            {runtimeFailures.length > 0 && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <strong>{isVi ? 'Hướng Dẫn Khắc Phục An Toàn:' : 'Non-Destructive Recovery Guidance:'}</strong>
                  <p>
                    {isVi
                      ? 'Nếu lỗi là permission-denied trên Firestore: kiểm tra email tài khoản đã xác minh (emailVerified=true) và UID có trong collection /admins hoặc dùng email chủ sở hữu tranchanhtrung@gmail.com, sau đó nhấn "Thử Lại Bản Ghi Lỗi".'
                      : 'If Firestore returned permission-denied: confirm your Firebase user email is verified and registered in /admins (or signed in as tranchanhtrung@gmail.com), then click "Retry Failed Records Only".'}
                  </p>
                </div>

                <div className="max-h-64 overflow-y-auto overflow-x-auto border border-rose-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-rose-50 text-rose-800 uppercase font-bold sticky top-0 border-b border-rose-200">
                      <tr>
                        <th className="py-2 px-3">Sheet / Source</th>
                        <th className="py-2 px-3">Collection</th>
                        <th className="py-2 px-3">Record ID</th>
                        <th className="py-2 px-3">Field</th>
                        <th className="py-2 px-3">Failure Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                      {runtimeFailures.slice(0, 80).map((f, idx) => (
                        <tr key={idx} className="bg-white hover:bg-rose-50/40">
                          <td className="py-2 px-3 font-bold text-slate-900">{f.sheet}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{f.collection}</td>
                          <td className="py-2 px-3 font-mono text-slate-800">{f.recordId}</td>
                          <td className="py-2 px-3 font-mono text-rose-700">{f.field}</td>
                          <td className="py-2 px-3 text-slate-700 break-words max-w-md">{f.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

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
                        ? 'Đối Chiếu Toàn Vẹn Collection & Khóa Ngoại'
                        : 'Post-Import Collection & Relationship Verification'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Source: <code className="font-mono">{verificationResult.source}</code> &bull; Checked{' '}
                      {verificationResult.checkedAt}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => runPostImportVerification(executionTarget, selectedDataset)}
                  disabled={isVerifying}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span>{isVi ? 'Kiểm Tra Lại' : 'Re-Run Verification'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  {verificationResult.relationshipChecks.map((r) => (
                    <div
                      key={r.check}
                      className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2 ${
                        r.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/60 border-amber-200'
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

      {/* Firebase Storage Official Course Materials Uploader */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FolderUp className="w-4 h-4 text-amber-600" />
              <span>
                {isVi
                  ? 'Tải Học Liệu Chính Thức Lên Firebase Storage (PDF, XLSX, DOCX — Tối đa 10MB)'
                  : 'Official Training Materials Upload (Firebase Storage • 10MB Max)'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isVi
                ? 'Lưu trữ tài liệu USALI, biểu mẫu thực hành OJT và tài liệu khóa học trên bucket fc-learning-academy.firebasestorage.app.'
                : 'Upload approved USALI handbooks, OJT templates, and course documents securely with MIME & size validation.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={storageCategory}
              onChange={(e) => setStorageCategory(e.target.value as StorageUploadCategory)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800"
            >
              <option value="course_materials">/course_materials</option>
              <option value="learning_documents">/learning_documents</option>
            </select>
            <input
              type="text"
              value={storageRecordId}
              onChange={(e) => setStorageRecordId(e.target.value)}
              placeholder="Course / Doc ID"
              className="w-28 px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-mono"
            />
            <input
              ref={storageFileRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadStorageAsset(f);
              }}
            />
            <button
              onClick={() => storageFileRef.current?.click()}
              disabled={storageUploading || !firebaseUser?.emailVerified}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold cursor-pointer disabled:opacity-50"
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>{storageUploading ? 'Uploading...' : isVi ? 'Tải Tài Liệu' : 'Upload Asset'}</span>
            </button>
          </div>
        </div>

        {uploadedAssets.length > 0 && (
          <div className="space-y-1.5 text-xs">
            {uploadedAssets.map((a, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                <span className="font-mono text-emerald-900 truncate">
                  {a.fullPath} ({Math.round(a.sizeBytes / 1024)} KB)
                </span>
                <a
                  href={a.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 font-bold hover:underline shrink-0"
                >
                  Open URL
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

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
            {isVi ? 'Chưa có lượt nhập dữ liệu nào được ghi nhận.' : 'No import executions recorded yet.'}
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
