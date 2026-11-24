import * as XLSX from 'xlsx';
import type { DuplicateStrategy, SheetSpec, SheetSummaryPreview, ValidationIssue } from './importEngine.ts';
import { COMPETENCIES } from '../src/data/initialData.ts';
import type {
  Competency,
  ProficiencyLevel,
  SimulationScenarioStatus,
  SimulatorFinancialCheckResult,
  SimulatorScenarioPreviewSummary,
  SimulatorValidationBadge,
} from '../src/types/index.ts';

export type DatasetType = 'academy_2027' | 'simulator_starter';

export const SIMULATOR_IMPORT_ORDER_SPEC: Array<SheetSpec & { stage: 2 | 3 }> = [
  {
    order: 1,
    stage: 2,
    sheetName: 'Hotel_Profiles',
    collectionName: 'hotelSimulationProfiles',
    expectedCount: 6,
    labelEn: 'Hotel Profiles',
    labelVi: 'Hồ Sơ Khách Sạn',
    dependencies: [],
  },
  {
    order: 2,
    stage: 2,
    sheetName: 'Scenario_Master',
    collectionName: 'simulationScenarios',
    expectedCount: 12,
    labelEn: 'Scenario Master',
    labelVi: 'Kịch Bản Mô Phỏng',
    dependencies: ['hotelSimulationProfiles'],
  },
  {
    order: 3,
    stage: 2,
    sheetName: 'Competency_Mapping',
    collectionName: 'simulationCompetencyMappings',
    expectedCount: 36,
    labelEn: 'Competency Mapping',
    labelVi: 'Ánh Xạ Năng Lực',
    dependencies: ['simulationScenarios', 'competencies'],
  },
  {
    order: 4,
    stage: 3,
    sheetName: 'Financial_Dataset',
    collectionName: 'simulationFinancialData',
    expectedCount: 72,
    labelEn: 'Financial Dataset (USALI)',
    labelVi: 'Dữ Liệu Tài Chính USALI',
    dependencies: ['simulationScenarios'],
  },
  {
    order: 5,
    stage: 3,
    sheetName: 'Operational_Dataset',
    collectionName: 'simulationOperationalData',
    expectedCount: 24,
    labelEn: 'Operational Dataset (KPIs)',
    labelVi: 'Dữ Liệu Vận Hành KPIs',
    dependencies: ['simulationScenarios'],
  },
  {
    order: 6,
    stage: 3,
    sheetName: 'Business_Challenges',
    collectionName: 'simulationBusinessChallenges',
    expectedCount: 24,
    labelEn: 'Business Challenges',
    labelVi: 'Thách Thức Kinh Doanh',
    dependencies: ['simulationScenarios'],
  },
  {
    order: 7,
    stage: 3,
    sheetName: 'Learner_Tasks',
    collectionName: 'simulationTasks',
    expectedCount: 36,
    labelEn: 'Learner Tasks',
    labelVi: 'Nhiệm Vụ Học Viên',
    dependencies: ['simulationScenarios'],
  },
  {
    order: 8,
    stage: 3,
    sheetName: 'Reference_Analysis',
    collectionName: 'simulationReferenceAnalysis',
    expectedCount: 12,
    labelEn: 'Reference Analysis',
    labelVi: 'Phân Tích Tham Chiếu',
    dependencies: ['simulationScenarios'],
  },
  {
    order: 9,
    stage: 3,
    sheetName: 'Decision_Options',
    collectionName: 'simulationDecisionOptions',
    expectedCount: 36,
    labelEn: 'Decision Options',
    labelVi: 'Phương Án Quyết Định',
    dependencies: ['simulationScenarios'],
  },
  {
    order: 10,
    stage: 3,
    sheetName: 'GM_Roleplay',
    collectionName: 'simulationRoleplayPrompts',
    expectedCount: 24,
    labelEn: 'GM Roleplay Prompts',
    labelVi: 'Kịch Bản Đối Thoại GM',
    dependencies: ['simulationScenarios'],
  },
  {
    order: 11,
    stage: 3,
    sheetName: 'Evaluation_Rubric',
    collectionName: 'simulationEvaluationRubrics',
    expectedCount: 36,
    labelEn: 'Evaluation Rubric',
    labelVi: 'Tiêu Chí Chấm Điểm',
    dependencies: ['simulationScenarios'],
  },
];

export const TRANSACTIONAL_PROTECTED_COLLECTIONS = new Set([
  'enrollments',
  'quizAttempts',
  'practicalSubmissions',
  'competencyAssessments',
  'individualDevelopmentPlans',
  'idpReviewLogs',
  'competencyReassessments',
  'careerReadinessReviews',
  'simulationSessions',
]);

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function normalizeKey(raw: string): string {
  return String(raw || '')
    .replace(/^\uFEFF/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/%/g, ' percent ')
    .replace(/[()[\]{}*#:?!.,/\\|"'`]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function strVal(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function numVal(v: any): number | null {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const cleaned = String(v).replace(/[$€£¥₫,\s%]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function boolVal(v: any): boolean {
  if (typeof v === 'boolean') return v;
  const s = strVal(v).toLowerCase();
  return ['true', 'yes', 'y', '1', 'có'].includes(s);
}

function sanitizeId(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128);
}

function buildCompositeId(parts: string[]): string {
  return parts
    .map((p) => sanitizeId(p))
    .filter(Boolean)
    .join('__')
    .slice(0, 120);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function detectWorkbookDatasetType(buffer: Buffer): {
  datasetType: DatasetType;
  sheetNames: string[];
  matchedAcademySheets: number;
  matchedSimulatorSheets: number;
} {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = wb.SheetNames || [];
  const lower = new Set(sheetNames.map((s) => normalizeKey(s)));

  const academyHints = ['competency_domains', 'proficiency_levels', 'course_catalog', 'question_bank'];
  const simHints = ['hotel_profiles', 'scenario_master', 'financial_dataset', 'operational_dataset', 'gm_roleplay'];

  const matchedAcademySheets = academyHints.filter((h) => lower.has(h)).length;
  const matchedSimulatorSheets = simHints.filter((h) => lower.has(h)).length;

  return {
    datasetType: matchedSimulatorSheets >= matchedAcademySheets && matchedSimulatorSheets > 0 ? 'simulator_starter' : 'academy_2027',
    sheetNames,
    matchedAcademySheets,
    matchedSimulatorSheets,
  };
}

function resolveSheetByName(wb: XLSX.WorkBook, targetName: string): string | null {
  if (wb.Sheets[targetName]) return targetName;
  const normTarget = normalizeKey(targetName);
  return wb.SheetNames.find((n) => normalizeKey(n) === normTarget) || null;
}

function normalizeRows(
  ws: XLSX.WorkSheet,
  columnMappings?: Record<string, string>
): { rows: Array<{ excelRow: number; raw: Record<string, any>; mapped: Record<string, any> }>; headers: string[]; headerRowNumber: number } {
  const matrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
  if (!matrix || matrix.length === 0) return { rows: [], headers: [], headerRowNumber: 1 };

  let headerIdx = 0;
  for (let i = 0; i < Math.min(12, matrix.length); i++) {
    const nonEmpty = (matrix[i] || []).filter((c) => strVal(c) !== '');
    if (nonEmpty.length >= 3) {
      headerIdx = i;
      break;
    }
  }

  const rawHeaders = (matrix[headerIdx] || []).map((h) => strVal(h));
  const headers = rawHeaders.filter(Boolean);
  const rows: Array<{ excelRow: number; raw: Record<string, any>; mapped: Record<string, any> }> = [];

  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const line = matrix[r] || [];
    const hasAny = line.some((c) => strVal(c) !== '');
    if (!hasAny) continue;

    const raw: Record<string, any> = {};
    const mapped: Record<string, any> = {};
    rawHeaders.forEach((h, colIdx) => {
      if (!h) return;
      const val = line[colIdx];
      raw[h] = val;
      const normH = normalizeKey(h);
      mapped[normH] = val;
      if (columnMappings && columnMappings[h]) {
        mapped[normalizeKey(columnMappings[h])] = val;
      }
      if (columnMappings && columnMappings[normH]) {
        mapped[normalizeKey(columnMappings[normH])] = val;
      }
    });

    rows.push({ excelRow: r + 1, raw, mapped });
  }

  return { rows, headers, headerRowNumber: headerIdx + 1 };
}

function pick(row: Record<string, any>, aliases: string[]): any {
  for (const a of aliases) {
    const v = row[normalizeKey(a)];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
}

function inferScenarioCategory(raw: string): any {
  const s = raw.toLowerCase();
  if (s.includes('forecast') || s.includes('budget')) return 'Revenue Forecasting & Budgeting';
  if (s.includes('cost') || s.includes('profit') || s.includes('labor') || s.includes('f&b')) return 'Cost Control & Profitability';
  if (s.includes('department') || s.includes('rooms') || s.includes('ota')) return 'Departmental Performance';
  if (s.includes('executive') || s.includes('board') || s.includes('capex')) return 'Executive Meeting & Strategic Finance';
  if (s.includes('advisory') || s.includes('gm')) return 'GM Business Advisory';
  return 'GOP & Hotel Financial Performance';
}

function inferDifficultyLabel(level: number, rawLabel: string): any {
  const l = rawLabel.toLowerCase();
  if (l === 'beginner' || level === 1) return 'Beginner';
  if (l === 'intermediate' || level === 2) return 'Intermediate';
  if (l === 'advanced' || level === 3) return 'Advanced';
  if (l === 'expert' || level === 4) return 'Expert';
  return level <= 1 ? 'Beginner' : level === 2 ? 'Intermediate' : level === 3 ? 'Advanced' : 'Expert';
}

export interface UnmappedCompetencyCandidate {
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

export interface SimulatorParseValidateResult {
  datasetType: 'simulator_starter';
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
  unmappedCompetencies: UnmappedCompetencyCandidate[];
  unresolvedRelationships: Array<{ sheet: string; field: string; missingId: string; row: number; scenarioId?: string }>;
  sheetSummaries: SheetSummaryPreview[];
  scenarioPreviews: SimulatorScenarioPreviewSummary[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  sanitizedByCollection: Record<string, Record<string, any>[]>;
}

export function parseAndValidateSimulatorWorkbook(params: {
  buffer: Buffer;
  fileName: string;
  selectedSheets?: string[];
  existingIdsByCollection?: Record<string, string[]>;
  existingCompetencyIds?: string[];
  existingCompetenciesList?: Array<Partial<Competency> & { id: string; code?: string; nameEn?: string; nameVi?: string; domainId?: string }>;
  competencyIdMap?: Record<string, string>;
  columnMappingsBySheet?: Record<string, Record<string, string>>;
  editedRowsBySheet?: Record<string, Record<number, Record<string, any>>>;
  financialTolerance?: number;
  pctTolerance?: number;
  defaultImportedStatus?: SimulationScenarioStatus;
}): SimulatorParseValidateResult {
  const wb = XLSX.read(params.buffer, { type: 'buffer' });
  const importBatchId = `sim_batch_${Date.now()}`;
  const importedAt = new Date().toISOString();
  const financialTolerance =
    params.financialTolerance !== undefined && Number.isFinite(params.financialTolerance) && params.financialTolerance >= 0
      ? params.financialTolerance
      : 0.02;
  const pctTolerance =
    params.pctTolerance !== undefined && Number.isFinite(params.pctTolerance) && params.pctTolerance >= 0
      ? params.pctTolerance
      : 0.05;

  const knownSheetSet = new Set(SIMULATOR_IMPORT_ORDER_SPEC.map((s) => normalizeKey(s.sheetName)));
  const readmeSheetName = resolveSheetByName(wb, 'README');
  const readmeDetected = Boolean(readmeSheetName);
  const ignoredSheets = wb.SheetNames.filter((n) => !knownSheetSet.has(normalizeKey(n)));
  const missingSheets = SIMULATOR_IMPORT_ORDER_SPEC.filter((s) => !resolveSheetByName(wb, s.sheetName)).map(
    (s) => s.sheetName
  );

  // Detect schema version if present on README
  let schemaVersionDetected = 'USALI-Sim-v2.0';
  if (readmeSheetName) {
    const readmeRows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[readmeSheetName]);
    for (const rr of readmeRows) {
      const txt = JSON.stringify(rr);
      if (txt.includes('v2') || txt.includes('12')) {
        schemaVersionDetected = 'USALI-Sim-v2.0 (12-Sheet Workbook)';
        break;
      }
    }
  }

  const selectedSet = params.selectedSheets?.length
    ? new Set(params.selectedSheets.map((s) => normalizeKey(s)))
    : null;

  const existingIds = params.existingIdsByCollection || {};

  // Build authoritative lookup of existing competencies ONLY (never auto-create)
  const masterCompetencies = (
    params.existingCompetenciesList && params.existingCompetenciesList.length > 0
      ? params.existingCompetenciesList
      : COMPETENCIES
  ) as Array<{ id: string; code?: string; nameEn?: string; nameVi?: string; domainId?: string }>;

  const knownCompetencies = new Set<string>([
    ...masterCompetencies.map((c) => c.id),
    ...(params.existingCompetencyIds || []),
  ]);
  const compLookupByUpper = new Map<string, { id: string; code: string; nameEn: string; nameVi: string; domainId: string }>();
  masterCompetencies.forEach((c) => {
    const item = {
      id: c.id,
      code: c.code || c.id,
      nameEn: c.nameEn || c.id,
      nameVi: c.nameVi || c.nameEn || c.id,
      domainId: c.domainId || 'D1',
    };
    compLookupByUpper.set(c.id.toUpperCase(), item);
    if (c.code) compLookupByUpper.set(c.code.toUpperCase(), item);
  });

  // Also index additional IDs passed via existingCompetencyIds
  (params.existingCompetencyIds || []).forEach((cid) => {
    if (!compLookupByUpper.has(cid.toUpperCase())) {
      compLookupByUpper.set(cid.toUpperCase(), {
        id: cid,
        code: cid,
        nameEn: cid,
        nameVi: cid,
        domainId: 'D1',
      });
    }
  });

  const approvedMapUpper = new Map<string, string>();
  Object.entries(params.competencyIdMap || {}).forEach(([k, v]) => {
    if (k && v && (knownCompetencies.has(v) || compLookupByUpper.has(v.toUpperCase()))) {
      const target = compLookupByUpper.get(v.toUpperCase())?.id || v;
      approvedMapUpper.set(k.trim().toUpperCase(), target);
    }
  });

  const validIds: Record<string, Set<string>> = {
    hotelSimulationProfiles: new Set(existingIds.hotelSimulationProfiles || []),
    simulationScenarios: new Set(existingIds.simulationScenarios || []),
    competencies: knownCompetencies,
  };

  // Track hotelId per scenario from Scenario_Master for cross-sheet hotel validation
  const scenarioHotelMap = new Map<string, string>();
  const hotelNameMap = new Map<string, string>();
  const hotelKeysMap = new Map<string, number>();

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const unresolvedRelationships: Array<{ sheet: string; field: string; missingId: string; row: number; scenarioId?: string }> = [];
  const unmappedCompTrack = new Map<string, { rows: Set<number>; scenarioIds: Set<string>; sheet: string }>();
  const financialChecks: SimulatorFinancialCheckResult[] = [];
  const sanitizedByCollection: Record<string, Record<string, any>[]> = {};
  const sheetSummaries: SheetSummaryPreview[] = [];

  let totalRowsDetected = 0;
  let validRecordsTotal = 0;
  let invalidRecordsTotal = 0;
  let financialChecksRun = 0;
  let financialChecksPassed = 0;

  // Group collectors for cross-row & cross-sheet checks
  const decisionCountByScenario = new Map<string, { count: number; optimalCount: number; rows: number[]; ids: string[] }>();
  const financialRowsWithMeta: Array<{ row: number; doc: Record<string, any> }> = [];
  const operationalRowsWithMeta: Array<{ row: number; doc: Record<string, any> }> = [];

  for (const spec of SIMULATOR_IMPORT_ORDER_SPEC) {
    if (selectedSet && !selectedSet.has(normalizeKey(spec.sheetName))) continue;

    const actualSheet = resolveSheetByName(wb, spec.sheetName);
    if (!actualSheet) {
      sanitizedByCollection[spec.collectionName] = [];
      sheetSummaries.push({
        order: spec.order,
        sheetName: spec.sheetName,
        collectionName: spec.collectionName,
        expectedCount: spec.expectedCount,
        detectedHeaders: [],
        headerRowNumber: 1,
        detectedRows: 0,
        validRows: 0,
        invalidRows: 0,
        errorCount: 1,
        warningCount: 0,
        newCount: 0,
        existingDuplicateCount: 0,
        duplicateIds: [],
        validationStatus: 'invalid',
        previewRows: [],
      });
      errors.push({
        sheet: spec.sheetName,
        collection: spec.collectionName,
        row: 0,
        field: 'worksheet',
        recordId: '-',
        severity: 'error',
        reason: `Required worksheet "${spec.sheetName}" is missing from the uploaded workbook.`,
      });
      continue;
    }

    const { rows, headers, headerRowNumber } = normalizeRows(
      wb.Sheets[actualSheet],
      params.columnMappingsBySheet?.[spec.sheetName]
    );
    const edits = params.editedRowsBySheet?.[spec.sheetName] || {};
    const existingCollectionIds = new Set(existingIds[spec.collectionName] || []);
    const seenInFile = new Set<string>();
    const validDocsWithRow: Array<{ doc: Record<string, any>; excelRow: number }> = [];
    const invalidRowsSet = new Set<number>();
    const duplicateIds: string[] = [];
    let sheetErrors = 0;
    let sheetWarnings = 0;
    let newCount = 0;
    const previewRows: Record<string, any>[] = [];

    // Scenario-scoped uniqueness trackers
    const rubricSumByScenario = new Map<string, Array<{ row: number; id: string; w: number; doc?: Record<string, any> }>>();
    const seenTaskKeyByScenario = new Set<string>();
    const seenRoleplayKeyByScenario = new Set<string>();
    const seenOptionCodeByScenario = new Set<string>();
    const seenRubricCodeByScenario = new Set<string>();

    const addErr = (excelRow: number, field: string, recordId: string, reason: string) => {
      invalidRowsSet.add(excelRow);
      sheetErrors++;
      errors.push({
        sheet: spec.sheetName,
        collection: spec.collectionName,
        row: excelRow,
        field,
        recordId,
        severity: 'error',
        reason,
      });
    };

    const addWarn = (excelRow: number, field: string, recordId: string, reason: string) => {
      sheetWarnings++;
      warnings.push({
        sheet: spec.sheetName,
        collection: spec.collectionName,
        row: excelRow,
        field,
        recordId,
        severity: 'warning',
        reason,
      });
    };

    if (rows.length === 0) {
      addWarn(0, 'rows', '-', `Worksheet "${spec.sheetName}" contains headers only with 0 data rows.`);
    }

    rows.forEach(({ excelRow, mapped }) => {
      const override = edits[excelRow];
      const m: Record<string, any> = { ...mapped };
      if (override) {
        for (const [ok, ov] of Object.entries(override)) {
          m[normalizeKey(ok)] = ov;
        }
      }

      const rowErrBefore = sheetErrors;
      let doc: Record<string, any> | null = null;
      let recId = '';

      if (spec.sheetName === 'Hotel_Profiles') {
        recId = sanitizeId(strVal(pick(m, ['hotel_profile_id', 'id', 'hotel_id', 'profile_id', 'hotel_code'])));
        const hotelCode = strVal(pick(m, ['hotel_code', 'code', 'hotel_profile_id', 'id']));
        const hotelName = strVal(pick(m, ['hotel_name', 'name', 'property_name']));
        const brandTier = strVal(pick(m, ['brand_tier', 'tier', 'brand', 'hotel_type'])) || '5-Star Luxury';
        const city = strVal(pick(m, ['city', 'location'])) || 'Ho Chi Minh City';
        const totalKeys = numVal(pick(m, ['total_keys', 'total_rooms', 'keys', 'rooms_available']));
        const roomsAvailable = numVal(pick(m, ['rooms_available', 'available_rooms', 'total_keys', 'total_rooms', 'keys'])) ?? totalKeys;
        const fcPositionLevel = strVal(pick(m, ['fc_position_level', 'target_role'])) || 'Financial Controller';
        const currency = strVal(pick(m, ['currency'])) || 'USD';

        if (!recId || !VALID_ID_REGEX.test(recId)) {
          addErr(excelRow, 'hotel_profile_id', recId || '(missing)', 'Required Hotel_Profile_ID / Hotel_ID is empty or invalid.');
        }
        if (!hotelName) addErr(excelRow, 'hotel_name', recId, 'Required field "hotel_name" is empty.');
        if (roomsAvailable === null || roomsAvailable <= 0) {
          addErr(excelRow, 'rooms_available', recId, 'rooms_available must be a positive number (> 0).');
        }
        if (totalKeys === null || totalKeys <= 0) {
          addErr(excelRow, 'total_keys', recId, 'total_keys must be a positive number (> 0).');
        }
        if (currency && currency.length > 10) {
          addWarn(excelRow, 'currency', recId, `Unusual currency code "${currency}".`);
        }

        if (sheetErrors === rowErrBefore) {
          doc = {
            id: recId,
            hotelCode: (hotelCode || recId).slice(0, 32),
            hotelName: hotelName.slice(0, 200),
            brandTier: brandTier.slice(0, 80),
            city: city.slice(0, 100),
            roomsAvailable: roomsAvailable!,
            totalKeys: totalKeys!,
            fcPositionLevel: fcPositionLevel.slice(0, 120),
            currency: currency.slice(0, 12),
            importedAt,
            importBatchId,
          };
          hotelNameMap.set(recId, doc.hotelName);
          hotelKeysMap.set(recId, doc.totalKeys);
        }
      } else if (spec.sheetName === 'Scenario_Master') {
        recId = sanitizeId(strVal(pick(m, ['scenario_id', 'id', 'scenario_code'])));
        const scenarioCode = strVal(pick(m, ['scenario_code', 'scenario_id', 'code', 'id']));
        const hotelId = sanitizeId(strVal(pick(m, ['hotel_profile_id', 'hotel_id', 'property_id'])));
        const titleEn = strVal(pick(m, ['title_en', 'scenario_title_en', 'scenario_title', 'title']));
        const titleVi = strVal(pick(m, ['title_vi', 'scenario_title_vi', 'title', 'title_en'])) || titleEn;
        const summaryEn = strVal(pick(m, ['summary_en', 'business_context_en', 'summary', 'description_en', 'context'])) || titleEn;
        const summaryVi = strVal(pick(m, ['summary_vi', 'business_context_vi', 'description_vi', 'summary_en'])) || summaryEn;
        const difficultyLevel = numVal(pick(m, ['difficulty_level', 'proficiency_level', 'level'])) ?? 3;
        const difficultyRawLabel = strVal(pick(m, ['difficulty_label', 'difficulty']));
        const targetRole = strVal(pick(m, ['target_role', 'role'])) || 'Financial Controller';
        const periodLabel = strVal(pick(m, ['period_label', 'period'])) || '2027-Q1';
        const categoryRaw = strVal(pick(m, ['category', 'domain', 'focus_area']));
        const compIdsRaw = strVal(pick(m, ['competency_ids', 'competency_id', 'primary_competency']));
        const rawStatus = strVal(pick(m, ['status'])) || (params.defaultImportedStatus || 'Validated');
        const status: SimulationScenarioStatus =
          rawStatus === 'Published'
            ? 'Published'
            : rawStatus === 'Archived'
            ? 'Archived'
            : rawStatus === 'Validated'
            ? 'Validated'
            : 'Draft';

        if (!recId) addErr(excelRow, 'scenario_id', '(missing)', 'Required Scenario_ID is empty.');
        if (!hotelId || !validIds.hotelSimulationProfiles.has(hotelId)) {
          addErr(
            excelRow,
            'hotel_profile_id',
            recId,
            `Foreign key Hotel_Profile_ID "${hotelId}" does not match any Hotel_Profiles record.`
          );
          if (hotelId) {
            unresolvedRelationships.push({ sheet: spec.sheetName, field: 'hotel_profile_id', missingId: hotelId, row: excelRow, scenarioId: recId });
          }
        }
        if (!titleEn) addErr(excelRow, 'title_en', recId, 'Required scenario title_en is empty.');
        if (difficultyLevel < 1 || difficultyLevel > 4) {
          addErr(excelRow, 'difficulty_level', recId, 'difficulty_level must be between 1 and 4.');
        }

        if (sheetErrors === rowErrBefore) {
          const parsedCompIds = compIdsRaw
            ? compIdsRaw
                .split(/[,;|]/)
                .map((x) => x.trim())
                .filter(Boolean)
                .map((rawC) => approvedMapUpper.get(rawC.toUpperCase()) || compLookupByUpper.get(rawC.toUpperCase())?.id || rawC)
            : [];
          const diffLvl = Math.max(1, Math.min(4, Math.round(difficultyLevel))) as ProficiencyLevel;

          doc = {
            id: recId,
            scenarioCode: (scenarioCode || recId).slice(0, 32),
            hotelId,
            titleEn: titleEn.slice(0, 250),
            titleVi: titleVi.slice(0, 250),
            summaryEn: summaryEn.slice(0, 2000),
            summaryVi: summaryVi.slice(0, 2000),
            category: inferScenarioCategory(categoryRaw || titleEn),
            difficultyLabel: inferDifficultyLabel(diffLvl, difficultyRawLabel),
            difficultyLevel: diffLvl,
            targetRole: targetRole.slice(0, 120),
            ...(parsedCompIds.length > 0 ? { competencyIds: parsedCompIds } : {}),
            periodLabel: periodLabel.slice(0, 80),
            estimatedDurationMinutes: numVal(pick(m, ['estimated_duration_minutes', 'duration_minutes'])) ?? 40,
            datasetVersion: strVal(pick(m, ['dataset_version', 'version'])) || '2027.v1',
            versionNumber: 1,
            isActive: status === 'Published',
            status,
            ...(status === 'Validated' ? { validatedAt: importedAt, validatedBy: 'Workbook Validation Engine' } : {}),
            ...(status === 'Published' ? { publishedAt: importedAt, publishedBy: 'Workbook Import' } : {}),
            importedAt,
            importBatchId,
          };
          scenarioHotelMap.set(recId, hotelId);
        }
      } else if (spec.sheetName === 'Competency_Mapping') {
        const scenarioId = sanitizeId(strVal(pick(m, ['scenario_id'])));
        const rawComp = strVal(pick(m, ['competency_id', 'competency_code']));
        const mappedTarget = approvedMapUpper.get(rawComp.toUpperCase()) || compLookupByUpper.get(rawComp.toUpperCase())?.id || rawComp;
        const matchedComp = compLookupByUpper.get(mappedTarget.toUpperCase());

        const explicitId = sanitizeId(strVal(pick(m, ['id', 'mapping_id'])));
        recId = explicitId || buildCompositeId([scenarioId, 'Comp', matchedComp?.id || mappedTarget || `r${excelRow}`]);
        const targetProf = numVal(pick(m, ['target_proficiency_level', 'target_level', 'proficiency_level'])) ?? 3;
        const weightPercent = numVal(pick(m, ['weight_percent', 'weight'])) ?? 25;
        const isPrimary = boolVal(pick(m, ['is_primary', 'primary']));

        if (!scenarioId || !validIds.simulationScenarios.has(scenarioId)) {
          addErr(excelRow, 'scenario_id', recId, `Missing scenario_id FK "${scenarioId}" in Scenario_Master.`);
          if (scenarioId) unresolvedRelationships.push({ sheet: spec.sheetName, field: 'scenario_id', missingId: scenarioId, row: excelRow, scenarioId });
        }

        if (!rawComp || (!matchedComp && !validIds.competencies.has(mappedTarget))) {
          addErr(
            excelRow,
            'competency_id',
            recId,
            `Unmapped Competency_ID "${rawComp}" does not match any existing Competency Framework record. Use Competency Mapping to map it before importing (auto-creation is disabled).`
          );
          if (rawComp) {
            unresolvedRelationships.push({ sheet: spec.sheetName, field: 'competency_id', missingId: rawComp, row: excelRow, scenarioId });
            const existingTrack = unmappedCompTrack.get(rawComp) || { rows: new Set(), scenarioIds: new Set(), sheet: spec.sheetName };
            existingTrack.rows.add(excelRow);
            if (scenarioId) existingTrack.scenarioIds.add(scenarioId);
            unmappedCompTrack.set(rawComp, existingTrack);
          }
        }
        if (targetProf < 1 || targetProf > 4) addErr(excelRow, 'target_proficiency_level', recId, 'Proficiency level must be 1–4.');
        if (weightPercent < 0 || weightPercent > 100) addErr(excelRow, 'weight_percent', recId, 'weight_percent must be between 0 and 100.');

        if (sheetErrors === rowErrBefore) {
          doc = {
            id: recId,
            scenarioId,
            competencyId: matchedComp?.id || mappedTarget,
            workbookCompetencyId: rawComp,
            competencyCode: matchedComp?.code || mappedTarget,
            competencyNameEn: matchedComp?.nameEn || mappedTarget,
            domainId: matchedComp?.domainId || 'D1',
            targetProficiencyLevel: Math.max(1, Math.min(4, Math.round(targetProf))) as ProficiencyLevel,
            weightPercent,
            isPrimary,
            importedAt,
            importBatchId,
          };
        }
      } else if (spec.sheetName === 'Financial_Dataset') {
        const scenarioId = sanitizeId(strVal(pick(m, ['scenario_id'])));
        const hotelProfileId = sanitizeId(strVal(pick(m, ['hotel_profile_id', 'hotel_id'])));
        const periodLabel = strVal(pick(m, ['period_label', 'period'])) || '2027-M01';
        const version = strVal(pick(m, ['version', 'data_version', 'statement_version'])) || 'Actual';
        const deptCode = strVal(pick(m, ['department_code', 'dept_code', 'department'])) || 'TOTAL';
        const deptName = strVal(pick(m, ['department_name', 'department'])) || deptCode;
        const unit = strVal(pick(m, ['unit', 'currency'])) || 'USD';
        const metricType = strVal(pick(m, ['metric_type', 'account_nature', 'category'])) || 'Profit';
        const explicitId = sanitizeId(strVal(pick(m, ['id', 'financial_id'])));
        recId = explicitId || buildCompositeId([scenarioId, 'Financial', periodLabel, version, deptCode]);

        const deptRev = numVal(pick(m, ['departmental_revenue', 'dept_revenue', 'revenue']));
        const deptExp = numVal(pick(m, ['departmental_expenses', 'dept_expenses', 'expenses']));
        const deptProfit = numVal(pick(m, ['departmental_profit', 'dept_profit', 'profit']));
        const totalOpRev = numVal(pick(m, ['total_operating_revenue', 'total_revenue']));
        const totalDeptExp = numVal(pick(m, ['total_departmental_expenses', 'total_dept_expenses']));
        const totalUndistExp = numVal(pick(m, ['total_undistributed_expenses', 'total_undistributed_operating_expenses', 'undistributed_expenses']));
        const gop = numVal(pick(m, ['gop', 'gross_operating_profit']));
        const gopMarginPct = numVal(pick(m, ['gop_margin_pct', 'gop_margin']));
        const roomsRev = numVal(pick(m, ['rooms_revenue'])) ?? deptRev ?? 0;
        const budgetGop = numVal(pick(m, ['budget_gop'])) ?? undefined;

        if (!scenarioId || !validIds.simulationScenarios.has(scenarioId)) {
          addErr(excelRow, 'scenario_id', recId, `Missing scenario_id FK "${scenarioId}" in Scenario_Master.`);
          if (scenarioId) unresolvedRelationships.push({ sheet: spec.sheetName, field: 'scenario_id', missingId: scenarioId, row: excelRow, scenarioId });
        }

        if (hotelProfileId) {
          if (!validIds.hotelSimulationProfiles.has(hotelProfileId)) {
            addErr(excelRow, 'hotel_profile_id', recId, `Invalid Hotel_Profile_ID FK "${hotelProfileId}" in Financial_Dataset.`);
            unresolvedRelationships.push({ sheet: spec.sheetName, field: 'hotel_profile_id', missingId: hotelProfileId, row: excelRow, scenarioId });
          } else if (scenarioHotelMap.has(scenarioId) && scenarioHotelMap.get(scenarioId) !== hotelProfileId) {
            addWarn(
              excelRow,
              'hotel_profile_id',
              recId,
              `Hotel_Profile_ID "${hotelProfileId}" differs from parent Scenario_Master hotel "${scenarioHotelMap.get(scenarioId)}".`
            );
          }
        }

        if (
          deptRev === null ||
          deptExp === null ||
          deptProfit === null ||
          totalOpRev === null ||
          totalDeptExp === null ||
          totalUndistExp === null ||
          gop === null ||
          gopMarginPct === null
        ) {
          addErr(
            excelRow,
            'financial_metrics',
            recId,
            'Missing required USALI numeric fields (departmental_revenue, departmental_expenses, departmental_profit, total_operating_revenue, total_departmental_expenses, total_undistributed_expenses, gop, gop_margin_pct).'
          );
        } else {
          // 1. Departmental Profit Check
          financialChecksRun++;
          const expectedDeptProfit = round2(deptRev - deptExp);
          const deptDiff = round2(Math.abs(deptProfit - expectedDeptProfit));
          const deptPassed = deptDiff <= financialTolerance;
          financialChecks.push({
            id: `${recId}__chk_dept_profit`,
            scenarioId,
            sheet: spec.sheetName,
            row: excelRow,
            periodLabel,
            version,
            departmentCode: deptCode,
            formulaName: 'Departmental Profit',
            formulaExpression: 'Departmental_Revenue - Departmental_Expenses',
            reportedValue: deptProfit,
            expectedValue: expectedDeptProfit,
            difference: deptDiff,
            tolerance: financialTolerance,
            passed: deptPassed,
            severity: 'error',
            message: deptPassed
              ? `Departmental Profit (${deptCode}) verified: ${deptProfit}`
              : `Departmental Profit mismatch on row ${excelRow} (${deptCode}, ${version}): reported ${deptProfit}, expected ${expectedDeptProfit} (diff ${deptDiff}, tolerance ${financialTolerance}).`,
          });
          if (!deptPassed) {
            addErr(excelRow, 'departmental_profit', recId, financialChecks[financialChecks.length - 1].message);
          } else {
            financialChecksPassed++;
          }

          // 2. GOP Formula Check
          financialChecksRun++;
          const expectedGop = round2(totalOpRev - totalDeptExp - totalUndistExp);
          const gopDiff = round2(Math.abs(gop - expectedGop));
          const gopPassed = gopDiff <= financialTolerance;
          financialChecks.push({
            id: `${recId}__chk_gop`,
            scenarioId,
            sheet: spec.sheetName,
            row: excelRow,
            periodLabel,
            version,
            departmentCode: deptCode,
            formulaName: 'Gross Operating Profit (GOP)',
            formulaExpression: 'Total_Operating_Revenue - Total_Departmental_Expenses - Total_Undistributed_Operating_Expenses',
            reportedValue: gop,
            expectedValue: expectedGop,
            difference: gopDiff,
            tolerance: financialTolerance,
            passed: gopPassed,
            severity: 'error',
            message: gopPassed
              ? `GOP verified (${version}): ${gop}`
              : `GOP mismatch on row ${excelRow} (${periodLabel} ${version}): reported ${gop}, expected ${expectedGop} (diff ${gopDiff}, tolerance ${financialTolerance}).`,
          });
          if (!gopPassed) {
            addErr(excelRow, 'gop', recId, financialChecks[financialChecks.length - 1].message);
          } else {
            financialChecksPassed++;
          }

          // 3. GOP Margin % Check & Unit Convention Check (72.0 vs 0.72)
          financialChecksRun++;
          const expectedGopMargin = totalOpRev > 0 ? round2((expectedGop / totalOpRev) * 100) : 0;
          const marginDiff = round2(Math.abs(gopMarginPct - expectedGopMargin));
          const isDecimalPercent = Math.abs(gopMarginPct * 100 - expectedGopMargin) <= pctTolerance && Math.abs(gopMarginPct) <= 1.0 && expectedGopMargin > 2;
          const marginPassed = marginDiff <= pctTolerance;
          financialChecks.push({
            id: `${recId}__chk_gop_margin`,
            scenarioId,
            sheet: spec.sheetName,
            row: excelRow,
            periodLabel,
            version,
            departmentCode: deptCode,
            formulaName: 'GOP Margin %',
            formulaExpression: '(GOP / Total_Operating_Revenue) × 100',
            reportedValue: gopMarginPct,
            expectedValue: expectedGopMargin,
            difference: marginDiff,
            tolerance: pctTolerance,
            passed: marginPassed,
            severity: 'error',
            message: marginPassed
              ? `GOP Margin verified (${version}): ${gopMarginPct}%`
              : isDecimalPercent
              ? `Percentage unit format mismatch on row ${excelRow}: reported ${gopMarginPct} (decimal 0..1) instead of ${expectedGopMargin}% (0..100).`
              : `GOP Margin % mismatch on row ${excelRow} (${version}): reported ${gopMarginPct}%, expected ${expectedGopMargin}% (diff ${marginDiff}pp).`,
          });
          if (!marginPassed) {
            addErr(excelRow, 'gop_margin_pct', recId, financialChecks[financialChecks.length - 1].message);
          } else {
            financialChecksPassed++;
          }
        }

        // Compute deterministic variance classification if Budget GOP supplied on Actual row
        let varianceAmount: number | undefined;
        let variancePct: number | undefined;
        let varianceClassification: 'Favorable' | 'Unfavorable' | 'Neutral' | undefined;
        if (gop !== null && budgetGop !== undefined) {
          varianceAmount = round2(gop - budgetGop);
          variancePct = budgetGop !== 0 ? round2(((gop - budgetGop) / Math.abs(budgetGop)) * 100) : 0;
          const isExpenseMetric = metricType.toLowerCase().includes('expense') || metricType.toLowerCase().includes('cost');
          if (Math.abs(varianceAmount) <= financialTolerance) {
            varianceClassification = 'Neutral';
          } else if (isExpenseMetric) {
            varianceClassification = varianceAmount < 0 ? 'Favorable' : 'Unfavorable';
          } else {
            varianceClassification = varianceAmount > 0 ? 'Favorable' : 'Unfavorable';
          }
        }

        if (sheetErrors === rowErrBefore) {
          doc = {
            id: recId,
            scenarioId,
            ...(hotelProfileId ? { hotelProfileId } : {}),
            periodLabel: periodLabel.slice(0, 32),
            version: version.slice(0, 32),
            departmentCode: deptCode.slice(0, 32),
            departmentName: deptName.slice(0, 120),
            unit: unit.slice(0, 32),
            metricType: metricType.slice(0, 40),
            departmentalRevenue: deptRev!,
            departmentalExpenses: deptExp!,
            departmentalProfit: deptProfit!,
            totalOperatingRevenue: totalOpRev!,
            totalDepartmentalExpenses: totalDeptExp!,
            totalUndistributedExpenses: totalUndistExp!,
            gop: gop!,
            gopMarginPct: gopMarginPct!,
            roomsRevenue: roomsRev,
            ...(budgetGop !== undefined ? { budgetGop } : {}),
            ...(varianceAmount !== undefined ? { varianceAmount } : {}),
            ...(variancePct !== undefined ? { variancePct } : {}),
            ...(varianceClassification !== undefined ? { varianceClassification } : {}),
            importedAt,
            importBatchId,
          };
          financialRowsWithMeta.push({ row: excelRow, doc });
        }
      } else if (spec.sheetName === 'Operational_Dataset') {
        const scenarioId = sanitizeId(strVal(pick(m, ['scenario_id'])));
        const hotelProfileId = sanitizeId(strVal(pick(m, ['hotel_profile_id', 'hotel_id'])));
        const periodLabel = strVal(pick(m, ['period_label', 'period'])) || '2027-M01';
        const version = strVal(pick(m, ['version', 'data_version'])) || 'Actual';
        const explicitId = sanitizeId(strVal(pick(m, ['id', 'operational_id'])));
        recId = explicitId || buildCompositeId([scenarioId, 'Operational', periodLabel, version]);

        const roomsAvailable = numVal(pick(m, ['rooms_available']));
        const roomsSold = numVal(pick(m, ['rooms_sold']));
        const roomsRevenue = numVal(pick(m, ['rooms_revenue']));
        const occupancyPct = numVal(pick(m, ['occupancy_pct', 'occupancy']));
        const adr = numVal(pick(m, ['adr']));
        const revpar = numVal(pick(m, ['revpar']));

        if (!scenarioId || !validIds.simulationScenarios.has(scenarioId)) {
          addErr(excelRow, 'scenario_id', recId, `Missing scenario_id FK "${scenarioId}" in Scenario_Master.`);
          if (scenarioId) unresolvedRelationships.push({ sheet: spec.sheetName, field: 'scenario_id', missingId: scenarioId, row: excelRow, scenarioId });
        }

        if (hotelProfileId && !validIds.hotelSimulationProfiles.has(hotelProfileId)) {
          addErr(excelRow, 'hotel_profile_id', recId, `Invalid Hotel_Profile_ID FK "${hotelProfileId}" in Operational_Dataset.`);
          unresolvedRelationships.push({ sheet: spec.sheetName, field: 'hotel_profile_id', missingId: hotelProfileId, row: excelRow, scenarioId });
        }

        if (
          roomsAvailable === null ||
          roomsSold === null ||
          roomsRevenue === null ||
          occupancyPct === null ||
          adr === null ||
          revpar === null ||
          roomsAvailable <= 0 ||
          roomsSold <= 0
        ) {
          addErr(excelRow, 'operational_metrics', recId, 'rooms_available (>0), rooms_sold (>0), rooms_revenue, occupancy_pct, adr, and revpar are required.');
        } else {
          if (roomsSold > roomsAvailable) {
            addWarn(excelRow, 'rooms_sold', recId, `Rooms Sold (${roomsSold}) exceeds Rooms Available (${roomsAvailable}).`);
          }

          const linkedHotelId = hotelProfileId || scenarioHotelMap.get(scenarioId);
          const keysCount = linkedHotelId ? hotelKeysMap.get(linkedHotelId) : undefined;
          if (keysCount && roomsAvailable < keysCount * 20) {
            addWarn(
              excelRow,
              'rooms_available',
              recId,
              `Operational Rooms Available (${roomsAvailable}) looks smaller than Hotel Keys (${keysCount} × ~30 days). Verify daily vs monthly unit consistency.`
            );
          }

          // 1. Occupancy %
          financialChecksRun++;
          const expectedOcc = round2((roomsSold / roomsAvailable) * 100);
          const occDiff = round2(Math.abs(occupancyPct - expectedOcc));
          const isOccDecimal = Math.abs(occupancyPct * 100 - expectedOcc) <= pctTolerance && occupancyPct <= 1.0;
          const occPassed = occDiff <= pctTolerance;
          financialChecks.push({
            id: `${recId}__chk_occ`,
            scenarioId,
            sheet: spec.sheetName,
            row: excelRow,
            periodLabel,
            version,
            departmentCode: 'ROOMS-KPI',
            formulaName: 'Occupancy %',
            formulaExpression: '(Rooms_Sold / Rooms_Available) × 100',
            reportedValue: occupancyPct,
            expectedValue: expectedOcc,
            difference: occDiff,
            tolerance: pctTolerance,
            passed: occPassed,
            severity: 'error',
            message: occPassed
              ? `Occupancy verified: ${occupancyPct}%`
              : isOccDecimal
              ? `Occupancy unit format mismatch on row ${excelRow}: reported ${occupancyPct} (decimal 0..1) instead of ${expectedOcc}% (0..100).`
              : `Occupancy % mismatch on row ${excelRow}: reported ${occupancyPct}%, expected ${expectedOcc}% (diff ${occDiff}pp).`,
          });
          if (!occPassed) {
            addErr(excelRow, 'occupancy_pct', recId, financialChecks[financialChecks.length - 1].message);
          } else {
            financialChecksPassed++;
          }

          // 2. ADR
          financialChecksRun++;
          const expectedAdr = round2(roomsRevenue / roomsSold);
          const adrDiff = round2(Math.abs(adr - expectedAdr));
          const adrTol = Math.max(financialTolerance, 0.05);
          const adrPassed = adrDiff <= adrTol;
          financialChecks.push({
            id: `${recId}__chk_adr`,
            scenarioId,
            sheet: spec.sheetName,
            row: excelRow,
            periodLabel,
            version,
            departmentCode: 'ROOMS-KPI',
            formulaName: 'ADR (Average Daily Rate)',
            formulaExpression: 'Rooms_Revenue / Rooms_Sold',
            reportedValue: adr,
            expectedValue: expectedAdr,
            difference: adrDiff,
            tolerance: adrTol,
            passed: adrPassed,
            severity: 'error',
            message: adrPassed
              ? `ADR verified: ${adr}`
              : `ADR mismatch on row ${excelRow}: reported ${adr}, expected ${expectedAdr} (diff ${adrDiff}).`,
          });
          if (!adrPassed) {
            addErr(excelRow, 'adr', recId, financialChecks[financialChecks.length - 1].message);
          } else {
            financialChecksPassed++;
          }

          // 3. RevPAR
          financialChecksRun++;
          const expectedRevpar = round2(roomsRevenue / roomsAvailable);
          const revparDiff = round2(Math.abs(revpar - expectedRevpar));
          const revparTol = Math.max(financialTolerance, 0.05);
          const revparPassed = revparDiff <= revparTol;
          financialChecks.push({
            id: `${recId}__chk_revpar`,
            scenarioId,
            sheet: spec.sheetName,
            row: excelRow,
            periodLabel,
            version,
            departmentCode: 'ROOMS-KPI',
            formulaName: 'RevPAR',
            formulaExpression: 'Rooms_Revenue / Rooms_Available',
            reportedValue: revpar,
            expectedValue: expectedRevpar,
            difference: revparDiff,
            tolerance: revparTol,
            passed: revparPassed,
            severity: 'error',
            message: revparPassed
              ? `RevPAR verified: ${revpar}`
              : `RevPAR mismatch on row ${excelRow}: reported ${revpar}, expected ${expectedRevpar} (diff ${revparDiff}).`,
          });
          if (!revparPassed) {
            addErr(excelRow, 'revpar', recId, financialChecks[financialChecks.length - 1].message);
          } else {
            financialChecksPassed++;
          }
        }

        if (sheetErrors === rowErrBefore) {
          doc = {
            id: recId,
            scenarioId,
            ...(hotelProfileId ? { hotelProfileId } : {}),
            periodLabel: periodLabel.slice(0, 32),
            version: version.slice(0, 32),
            roomsAvailable: roomsAvailable!,
            roomsSold: roomsSold!,
            roomsRevenue: roomsRevenue!,
            occupancyPct: occupancyPct!,
            adr: adr!,
            revpar: revpar!,
            ...(numVal(pick(m, ['fb_covers'])) !== null ? { fbCovers: numVal(pick(m, ['fb_covers']))! } : {}),
            ...(numVal(pick(m, ['labor_hours'])) !== null ? { laborHours: numVal(pick(m, ['labor_hours']))! } : {}),
            ...(numVal(pick(m, ['overtime_hours'])) !== null ? { overtimeHours: numVal(pick(m, ['overtime_hours']))! } : {}),
            ...(numVal(pick(m, ['gss_score'])) !== null ? { gssScore: numVal(pick(m, ['gss_score']))! } : {}),
            importedAt,
            importBatchId,
          };
          operationalRowsWithMeta.push({ row: excelRow, doc });
        }
      } else if (spec.sheetName === 'Business_Challenges') {
        const scenarioId = sanitizeId(strVal(pick(m, ['scenario_id'])));
        const challengeCode = strVal(pick(m, ['challenge_code', 'code'])) || `CH_${excelRow}`;
        recId = sanitizeId(strVal(pick(m, ['id', 'challenge_id']))) || buildCompositeId([scenarioId, 'Challenge', challengeCode]);
        const titleEn = strVal(pick(m, ['title_en', 'title']));
        const titleVi = strVal(pick(m, ['title_vi', 'title'])) || titleEn;
        const descriptionEn = strVal(pick(m, ['description_en', 'description'])) || titleEn;
        const descriptionVi = strVal(pick(m, ['description_vi', 'description'])) || descriptionEn;
        const severity = strVal(pick(m, ['severity'])) || 'High';
        const impactArea = strVal(pick(m, ['impact_area', 'area'])) || 'GOP & Flow-Through';

        if (!scenarioId || !validIds.simulationScenarios.has(scenarioId)) {
          addErr(excelRow, 'scenario_id', recId, `Missing scenario_id FK "${scenarioId}".`);
          if (scenarioId) unresolvedRelationships.push({ sheet: spec.sheetName, field: 'scenario_id', missingId: scenarioId, row: excelRow, scenarioId });
        }
        if (!titleEn) addErr(excelRow, 'title_en', recId, 'Required title_en is empty.');

        if (sheetErrors === rowErrBefore) {
          doc = {
            id: recId,
            scenarioId,
            challengeCode: challengeCode.slice(0, 32),
            titleEn: titleEn.slice(0, 250),
            titleVi: titleVi.slice(0, 250),
            descriptionEn: descriptionEn.slice(0, 2000),
            descriptionVi: descriptionVi.slice(0, 2000),
            severity: ['Low', 'Medium', 'High', 'Critical'].includes(severity) ? severity : 'High',
            impactArea: impactArea.slice(0, 120),
            importedAt,
            importBatchId,
          };
        }
      } else if (spec.sheetName === 'Learner_Tasks') {
        const scenarioId = sanitizeId(strVal(pick(m, ['scenario_id'])));
        const taskId = strVal(pick(m, ['task_id', 'task_code', 'id']));
        const taskOrder = numVal(pick(m, ['task_order', 'order'])) ?? excelRow - 1;
        const uniqueKeySuffix = taskId || String(taskOrder).padStart(2, '0');
        recId = sanitizeId(taskId) || buildCompositeId([scenarioId, 'Task', uniqueKeySuffix]);
        const titleEn = strVal(pick(m, ['title_en', 'title']));
        const titleVi = strVal(pick(m, ['title_vi', 'title'])) || titleEn;
        const instructionsEn = strVal(pick(m, ['instructions_en', 'instructions', 'description_en'])) || titleEn;
        const instructionsVi = strVal(pick(m, ['instructions_vi', 'instructions', 'description_vi'])) || instructionsEn;
        const deliverableType = strVal(pick(m, ['deliverable_type', 'deliverable'])) || 'Executive Financial Memo';
        const maxPoints = numVal(pick(m, ['max_points', 'points'])) ?? 25;

        if (!scenarioId || !validIds.simulationScenarios.has(scenarioId)) {
          addErr(excelRow, 'scenario_id', recId, `Missing scenario_id FK "${scenarioId}".`);
          if (scenarioId) unresolvedRelationships.push({ sheet: spec.sheetName, field: 'scenario_id', missingId: scenarioId, row: excelRow, scenarioId });
        }
        if (!titleEn) addErr(excelRow, 'title_en', recId, 'Required title_en is empty.');

        const uniqTaskKey = `${scenarioId}::${uniqueKeySuffix.toUpperCase()}`;
        if (seenTaskKeyByScenario.has(uniqTaskKey)) {
          addErr(excelRow, 'task_id', recId, `Duplicate Task_ID / Task_Order "${uniqueKeySuffix}" within scenario "${scenarioId}".`);
        } else {
          seenTaskKeyByScenario.add(uniqTaskKey);
        }

        if (sheetErrors === rowErrBefore) {
          doc = {
            id: recId,
            scenarioId,
            ...(taskId ? { taskId: taskId.slice(0, 64) } : {}),
            taskOrder,
            titleEn: titleEn.slice(0, 250),
            titleVi: titleVi.slice(0, 250),
            instructionsEn: instructionsEn.slice(0, 2000),
            instructionsVi: instructionsVi.slice(0, 2000),
            deliverableType: deliverableType.slice(0, 120),
            maxPoints,
            importedAt,
            importBatchId,
          };
        }
      } else if (spec.sheetName === 'Reference_Analysis') {
        const scenarioId = sanitizeId(strVal(pick(m, ['scenario_id'])));
        recId = sanitizeId(strVal(pick(m, ['id', 'analysis_id']))) || buildCompositeId([scenarioId, 'Ref', `${excelRow}`]);
        const topic = strVal(pick(m, ['topic', 'title'])) || 'Financial Root Cause';
        const rootCauseEn = strVal(pick(m, ['root_cause_en', 'root_cause', 'analysis_en']));
        const rootCauseVi = strVal(pick(m, ['root_cause_vi', 'analysis_vi'])) || rootCauseEn;
        const benchmarkFormula = strVal(pick(m, ['benchmark_formula', 'formula'])) || 'GOP = Total Operating Revenue - Dept Exp - Undist Exp';
        const recommendedActionEn = strVal(pick(m, ['recommended_action_en', 'recommended_action'])) || rootCauseEn;
        const recommendedActionVi = strVal(pick(m, ['recommended_action_vi'])) || recommendedActionEn;

        if (!scenarioId || !validIds.simulationScenarios.has(scenarioId)) {
          addErr(excelRow, 'scenario_id', recId, `Missing scenario_id FK "${scenarioId}".`);
          if (scenarioId) unresolvedRelationships.push({ sheet: spec.sheetName, field: 'scenario_id', missingId: scenarioId, row: excelRow, scenarioId });
        }
        if (!rootCauseEn) addErr(excelRow, 'root_cause_en', recId, 'Required root_cause_en is empty.');

        if (sheetErrors === rowErrBefore) {
          doc = {
            id: recId,
            scenarioId,
            topic: topic.slice(0, 150),
            rootCauseEn: rootCauseEn.slice(0, 2000),
            rootCauseVi: rootCauseVi.slice(0, 2000),
            benchmarkFormula: benchmarkFormula.slice(0, 300),
            recommendedActionEn: recommendedActionEn.slice(0, 2000),
            recommendedActionVi: recommendedActionVi.slice(0, 2000),
            importedAt,
            importBatchId,
          };
        }
      } else if (spec.sheetName === 'Decision_Options') {
        const scenarioId = sanitizeId(strVal(pick(m, ['scenario_id'])));
        const optionCode = strVal(pick(m, ['option_code', 'code'])) || `OPT_${excelRow}`;
        recId = sanitizeId(strVal(pick(m, ['id', 'option_id']))) || buildCompositeId([scenarioId, 'Option', optionCode]);
        const titleEn = strVal(pick(m, ['title_en', 'title', 'option_title']));
        const titleVi = strVal(pick(m, ['title_vi', 'title'])) || titleEn;
        const financialImpactEstimate = numVal(pick(m, ['financial_impact_estimate', 'financial_impact'])) ?? 0;
        const gopImpactPct = numVal(pick(m, ['gop_impact_pct', 'gop_impact'])) ?? 0;
        const riskLevel = strVal(pick(m, ['risk_level', 'risk'])) || 'Medium';
        const isOptimal = boolVal(pick(m, ['is_optimal', 'optimal']));
        const rationaleEn = strVal(pick(m, ['rationale_en', 'rationale'])) || titleEn;
        const rationaleVi = strVal(pick(m, ['rationale_vi', 'rationale'])) || rationaleEn;

        if (!scenarioId || !validIds.simulationScenarios.has(scenarioId)) {
          addErr(excelRow, 'scenario_id', recId, `Missing scenario_id FK "${scenarioId}".`);
          if (scenarioId) unresolvedRelationships.push({ sheet: spec.sheetName, field: 'scenario_id', missingId: scenarioId, row: excelRow, scenarioId });
        }
        if (!titleEn) addErr(excelRow, 'title_en', recId, 'Required option title_en is empty.');

        const uniqOptKey = `${scenarioId}::${optionCode.toUpperCase()}`;
        if (seenOptionCodeByScenario.has(uniqOptKey)) {
          addErr(excelRow, 'option_code', recId, `Duplicate Option_Code "${optionCode}" within scenario "${scenarioId}".`);
        } else {
          seenOptionCodeByScenario.add(uniqOptKey);
        }

        if (sheetErrors === rowErrBefore) {
          doc = {
            id: recId,
            scenarioId,
            optionCode: optionCode.slice(0, 32),
            titleEn: titleEn.slice(0, 250),
            titleVi: titleVi.slice(0, 250),
            financialImpactEstimate,
            gopImpactPct,
            riskLevel: ['Low', 'Medium', 'High'].includes(riskLevel) ? riskLevel : 'Medium',
            isOptimal,
            rationaleEn: rationaleEn.slice(0, 1500),
            rationaleVi: rationaleVi.slice(0, 1500),
            importedAt,
            importBatchId,
          };
          const track = decisionCountByScenario.get(scenarioId) || { count: 0, optimalCount: 0, rows: [], ids: [] };
          track.count++;
          if (isOptimal) track.optimalCount++;
          track.rows.push(excelRow);
          track.ids.push(recId);
          decisionCountByScenario.set(scenarioId, track);
        }
      } else if (spec.sheetName === 'GM_Roleplay') {
        const scenarioId = sanitizeId(strVal(pick(m, ['scenario_id'])));
        const roleplayId = strVal(pick(m, ['roleplay_id', 'prompt_id', 'id']));
        const turnOrder = numVal(pick(m, ['turn_order', 'turn', 'order'])) ?? excelRow - 1;
        const uniqSuffix = roleplayId || String(turnOrder).padStart(2, '0');
        recId = sanitizeId(roleplayId) || buildCompositeId([scenarioId, 'GM', uniqSuffix]);
        const speakerRole = strVal(pick(m, ['speaker_role', 'role'])) || 'General Manager';
        const promptEn = strVal(pick(m, ['prompt_en', 'prompt', 'gm_prompt']));
        const promptVi = strVal(pick(m, ['prompt_vi', 'prompt'])) || promptEn;
        const expectedFocusPoints = strVal(pick(m, ['expected_focus_points', 'focus_points'])) || 'Root cause & flow-through recovery';

        if (!scenarioId || !validIds.simulationScenarios.has(scenarioId)) {
          addErr(excelRow, 'scenario_id', recId, `Missing scenario_id FK "${scenarioId}".`);
          if (scenarioId) unresolvedRelationships.push({ sheet: spec.sheetName, field: 'scenario_id', missingId: scenarioId, row: excelRow, scenarioId });
        }
        if (!promptEn) addErr(excelRow, 'prompt_en', recId, 'Required prompt_en is empty.');

        const uniqRpKey = `${scenarioId}::${uniqSuffix.toUpperCase()}`;
        if (seenRoleplayKeyByScenario.has(uniqRpKey)) {
          addErr(excelRow, 'roleplay_id', recId, `Duplicate Roleplay_ID / Turn_Order "${uniqSuffix}" within scenario "${scenarioId}".`);
        } else {
          seenRoleplayKeyByScenario.add(uniqRpKey);
        }

        if (sheetErrors === rowErrBefore) {
          doc = {
            id: recId,
            scenarioId,
            ...(roleplayId ? { roleplayId: roleplayId.slice(0, 64) } : {}),
            turnOrder,
            speakerRole: speakerRole.slice(0, 80),
            promptEn: promptEn.slice(0, 2000),
            promptVi: promptVi.slice(0, 2000),
            expectedFocusPoints: expectedFocusPoints.slice(0, 1000),
            importedAt,
            importBatchId,
          };
        }
      } else if (spec.sheetName === 'Evaluation_Rubric') {
        const scenarioId = sanitizeId(strVal(pick(m, ['scenario_id'])));
        const criterionCode = strVal(pick(m, ['criterion_code', 'code'])) || `CRIT_${excelRow}`;
        recId = sanitizeId(strVal(pick(m, ['id', 'rubric_id']))) || buildCompositeId([scenarioId, 'Rubric', criterionCode]);
        const criterionNameEn = strVal(pick(m, ['criterion_name_en', 'criterion_name', 'criteria_en', 'title_en']));
        const criterionNameVi = strVal(pick(m, ['criterion_name_vi', 'criteria_vi', 'title_vi'])) || criterionNameEn;
        const weightPercent = numVal(pick(m, ['weight_percent', 'weight', 'assessment_weight']));
        const maxScore = numVal(pick(m, ['max_score'])) ?? 100;
        const passingScore = numVal(pick(m, ['passing_score'])) ?? 70;

        if (!scenarioId || !validIds.simulationScenarios.has(scenarioId)) {
          addErr(excelRow, 'scenario_id', recId, `Missing scenario_id FK "${scenarioId}".`);
          if (scenarioId) unresolvedRelationships.push({ sheet: spec.sheetName, field: 'scenario_id', missingId: scenarioId, row: excelRow, scenarioId });
        }
        if (!criterionNameEn) addErr(excelRow, 'criterion_name_en', recId, 'Required criterion_name_en is empty.');
        if (weightPercent === null || weightPercent <= 0 || weightPercent > 100) {
          addErr(excelRow, 'weight_percent', recId, 'Evaluation_Rubric weight_percent must be > 0 and <= 100.');
        }

        const uniqRubKey = `${scenarioId}::${criterionCode.toUpperCase()}`;
        if (seenRubricCodeByScenario.has(uniqRubKey)) {
          addErr(excelRow, 'criterion_code', recId, `Duplicate Criterion_Code "${criterionCode}" within scenario "${scenarioId}".`);
        } else {
          seenRubricCodeByScenario.add(uniqRubKey);
        }

        if (sheetErrors === rowErrBefore && weightPercent !== null) {
          doc = {
            id: recId,
            scenarioId,
            criterionCode: criterionCode.slice(0, 32),
            criterionNameEn: criterionNameEn.slice(0, 250),
            criterionNameVi: criterionNameVi.slice(0, 250),
            weightPercent,
            maxScore,
            passingScore,
            importedAt,
            importBatchId,
          };
          const list = rubricSumByScenario.get(scenarioId) || [];
          list.push({ row: excelRow, id: recId, w: weightPercent, doc });
          rubricSumByScenario.set(scenarioId, list);
        }
      }

      if (recId) {
        if (seenInFile.has(recId)) {
          addErr(excelRow, 'id', recId, `Duplicate ID "${recId}" within worksheet "${spec.sheetName}".`);
        } else {
          seenInFile.add(recId);
        }
        if (existingCollectionIds.has(recId)) {
          duplicateIds.push(recId);
        } else {
          newCount++;
        }
      }

      if (!invalidRowsSet.has(excelRow) && doc) {
        validDocsWithRow.push({ doc, excelRow });
        if (!validIds[spec.collectionName]) validIds[spec.collectionName] = new Set();
        validIds[spec.collectionName].add(doc.id);
        if (previewRows.length < 150) {
          previewRows.push({ ...doc, _excelRow: excelRow, _isDuplicate: existingCollectionIds.has(doc.id), _raw: m });
        }
      } else if (previewRows.length < 150) {
        previewRows.push({
          id: recId || `row_${excelRow}`,
          _excelRow: excelRow,
          _hasError: true,
          _raw: m,
        });
      }
    });

    // Check Evaluation_Rubric weights total 100% per scenario
    if (spec.sheetName === 'Evaluation_Rubric') {
      for (const [scenId, items] of rubricSumByScenario.entries()) {
        let sum = items.reduce((a, b) => a + b.w, 0);
        if (Math.abs(sum - 1) <= 0.01 && items.every((i) => i.w <= 1)) {
          items.forEach((it) => {
            it.w = round2(it.w * 100);
            if (it.doc) it.doc.weightPercent = it.w;
          });
          sum = items.reduce((a, b) => a + b.w, 0);
        }
        if (Math.abs(sum - 100) > 0.02) {
          items.forEach((it) => {
            addErr(
              it.row,
              'weight_percent',
              it.id,
              `Evaluation_Rubric weights for scenario "${scenId}" must total 100% (current total: ${round2(sum)}%).`
            );
          });
        }
      }
    }

    // Check Decision_Options >= 2 per decision scenario & warn if none optimal
    if (spec.sheetName === 'Decision_Options') {
      for (const [scenId, track] of decisionCountByScenario.entries()) {
        if (track.count === 1) {
          addErr(
            track.rows[0],
            'option_code',
            track.ids[0],
            `Scenario "${scenId}" only has 1 Decision Option; decision-based scenarios must contain at least 2 options.`
          );
        } else if (track.optimalCount === 0) {
          addWarn(
            track.rows[0],
            'is_optimal',
            track.ids[0],
            `Scenario "${scenId}" has ${track.count} decision options but none is flagged is_optimal = TRUE.`
          );
        }
      }
    }

    const finalValidDocs = validDocsWithRow
      .filter((entry) => !invalidRowsSet.has(entry.excelRow))
      .map((entry) => entry.doc);

    sanitizedByCollection[spec.collectionName] = finalValidDocs;
    totalRowsDetected += rows.length;
    validRecordsTotal += finalValidDocs.length;
    invalidRecordsTotal += invalidRowsSet.size;

    sheetSummaries.push({
      order: spec.order,
      sheetName: spec.sheetName,
      collectionName: spec.collectionName,
      expectedCount: spec.expectedCount,
      detectedHeaders: headers,
      headerRowNumber,
      detectedRows: rows.length,
      validRows: finalValidDocs.length,
      invalidRows: invalidRowsSet.size,
      errorCount: sheetErrors,
      warningCount: sheetWarnings,
      newCount,
      existingDuplicateCount: duplicateIds.length,
      duplicateIds,
      validationStatus: sheetErrors > 0 ? 'invalid' : sheetWarnings > 0 ? 'warnings' : 'valid',
      previewRows,
    });
  }

  // Cross-sheet Financial & Operational consistency audits (Department Sum vs Hotel Total, Operational vs Financial Rooms Revenue)
  const finByScenPeriodVer = new Map<string, Array<{ row: number; doc: Record<string, any> }>>();
  financialRowsWithMeta.forEach((entry) => {
    const key = `${entry.doc.scenarioId}::${entry.doc.periodLabel}::${(entry.doc.version || 'Actual').toLowerCase()}`;
    const list = finByScenPeriodVer.get(key) || [];
    list.push(entry);
    finByScenPeriodVer.set(key, list);
  });

  for (const [groupKey, groupRows] of finByScenPeriodVer.entries()) {
    const [scenId, periodLabel, versionLower] = groupKey.split('::');
    const deptRows = groupRows.filter((g) => !['TOTAL', 'ALL', 'HOTEL'].includes(String(g.doc.departmentCode).toUpperCase()));
    if (deptRows.length >= 2) {
      const hasOtherOrAllDepts = deptRows.some((g) => String(g.doc.departmentCode).toUpperCase().includes('OTHER')) || deptRows.length >= 3;
      if (hasOtherOrAllDepts) {
        const sumDeptRev = round2(deptRows.reduce((acc, g) => acc + Number(g.doc.departmentalRevenue || 0), 0));
        const sumDeptExp = round2(deptRows.reduce((acc, g) => acc + Number(g.doc.departmentalExpenses || 0), 0));
        const reportedTotalRev = Number(deptRows[0].doc.totalOperatingRevenue || 0);
        const reportedTotalExp = Number(deptRows[0].doc.totalDepartmentalExpenses || 0);

        financialChecksRun += 2;
        const revDiff = round2(Math.abs(sumDeptRev - reportedTotalRev));
        const expDiff = round2(Math.abs(sumDeptExp - reportedTotalExp));
        const revOk = revDiff <= financialTolerance;
        const expOk = expDiff <= financialTolerance;

        financialChecks.push({
          id: `${scenId}__${periodLabel}__${versionLower}__sum_rev`,
          scenarioId: scenId,
          sheet: 'Financial_Dataset',
          row: deptRows[0].row,
          periodLabel,
          version: deptRows[0].doc.version || 'Actual',
          departmentCode: 'ALL-DEPTS',
          formulaName: 'Hotel Total Operating Revenue Consistency',
          formulaExpression: 'Sum(Departmental_Revenue) == Total_Operating_Revenue',
          reportedValue: reportedTotalRev,
          expectedValue: sumDeptRev,
          difference: revDiff,
          tolerance: financialTolerance,
          passed: revOk,
          severity: 'error',
          message: revOk
            ? `Multi-department revenue sum (${sumDeptRev}) matches Total Operating Revenue (${reportedTotalRev}).`
            : `Department revenues sum to ${sumDeptRev} but Total Operating Revenue is ${reportedTotalRev} (diff ${revDiff}).`,
        });

        financialChecks.push({
          id: `${scenId}__${periodLabel}__${versionLower}__sum_exp`,
          scenarioId: scenId,
          sheet: 'Financial_Dataset',
          row: deptRows[0].row,
          periodLabel,
          version: deptRows[0].doc.version || 'Actual',
          departmentCode: 'ALL-DEPTS',
          formulaName: 'Hotel Total Departmental Expenses Consistency',
          formulaExpression: 'Sum(Departmental_Expenses) == Total_Departmental_Expenses',
          reportedValue: reportedTotalExp,
          expectedValue: sumDeptExp,
          difference: expDiff,
          tolerance: financialTolerance,
          passed: expOk,
          severity: 'error',
          message: expOk
            ? `Multi-department expense sum (${sumDeptExp}) matches Total Departmental Expenses (${reportedTotalExp}).`
            : `Department expenses sum to ${sumDeptExp} but Total Departmental Expenses is ${reportedTotalExp} (diff ${expDiff}).`,
        });

        if (!revOk) {
          errors.push({
            sheet: 'Financial_Dataset',
            collection: 'simulationFinancialData',
            row: deptRows[0].row,
            field: 'total_operating_revenue',
            recordId: deptRows[0].doc.id,
            severity: 'error',
            reason: financialChecks[financialChecks.length - 2].message,
          });
        } else {
          financialChecksPassed++;
        }

        if (!expOk) {
          errors.push({
            sheet: 'Financial_Dataset',
            collection: 'simulationFinancialData',
            row: deptRows[0].row,
            field: 'total_departmental_expenses',
            recordId: deptRows[0].doc.id,
            severity: 'error',
            reason: financialChecks[financialChecks.length - 1].message,
          });
        } else {
          financialChecksPassed++;
        }
      }
    }
  }

  // Operational vs Financial Rooms Revenue cross-check
  for (const opEntry of operationalRowsWithMeta) {
    const op = opEntry.doc;
    const matchKey = `${op.scenarioId}::${op.periodLabel}::${(op.version || 'Actual').toLowerCase()}`;
    const matchingFin = finByScenPeriodVer.get(matchKey);
    if (matchingFin && matchingFin.length > 0) {
      const roomsFin = matchingFin.find((f) => String(f.doc.departmentCode).toUpperCase() === 'ROOMS') || matchingFin[0];
      const finRoomsRev = Number(roomsFin.doc.roomsRevenue || roomsFin.doc.departmentalRevenue || 0);
      const opRoomsRev = Number(op.roomsRevenue || 0);
      const diff = round2(Math.abs(finRoomsRev - opRoomsRev));
      financialChecksRun++;
      const matched = diff <= Math.max(financialTolerance, 1);
      financialChecks.push({
        id: `${op.id}__xcheck_rooms_rev`,
        scenarioId: op.scenarioId,
        sheet: 'Operational_Dataset',
        row: opEntry.row,
        periodLabel: op.periodLabel,
        version: op.version || 'Actual',
        departmentCode: 'ROOMS',
        formulaName: 'Operational vs Financial Rooms Revenue',
        formulaExpression: 'Operational_Dataset.Rooms_Revenue == Financial_Dataset.Rooms_Revenue',
        reportedValue: opRoomsRev,
        expectedValue: finRoomsRev,
        difference: diff,
        tolerance: Math.max(financialTolerance, 1),
        passed: matched,
        severity: 'warning',
        message: matched
          ? `Operational Rooms Revenue (${opRoomsRev}) matches Financial Statement (${finRoomsRev}).`
          : `Operational Rooms Revenue (${opRoomsRev}) differs from Financial Dataset (${finRoomsRev}) by ${diff}.`,
      });
      if (matched) {
        financialChecksPassed++;
      } else {
        warnings.push({
          sheet: 'Operational_Dataset',
          collection: 'simulationOperationalData',
          row: opEntry.row,
          field: 'rooms_revenue',
          recordId: op.id,
          severity: 'warning',
          reason: financialChecks[financialChecks.length - 1].message,
        });
      }
    }
  }

  // Build unmapped competencies list with fuzzy suggestions
  const unmappedCompetencies: UnmappedCompetencyCandidate[] = [];
  for (const [wbId, info] of unmappedCompTrack.entries()) {
    const token = wbId.toLowerCase();
    const suggestedMatches = masterCompetencies
      .map((c) => ({
        id: c.id,
        code: c.code || c.id,
        nameEn: c.nameEn || c.id,
        nameVi: c.nameVi || c.nameEn || c.id,
        domainId: c.domainId || 'D1',
        score:
          c.id.toLowerCase().includes(token) || (c.code || '').toLowerCase().includes(token)
            ? 3
            : (c.domainId || '').toLowerCase().includes(token.slice(0, 2))
            ? 2
            : 1,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ score: _s, ...rest }) => rest);

    unmappedCompetencies.push({
      workbookCompetencyId: wbId,
      sheet: info.sheet,
      rows: Array.from(info.rows),
      scenarioIds: Array.from(info.scenarioIds),
      suggestedMatches,
    });
  }

  // Assemble per-scenario preview bundles across all child collections
  const scenarios = sanitizedByCollection.simulationScenarios || [];
  const existingScenarioIdSet = new Set(existingIds.simulationScenarios || []);
  const errorsByScenario = new Map<string, number>();
  const warningsByScenario = new Map<string, number>();

  errors.forEach((e) => {
    const guessScenId = e.recordId.includes('__') ? e.recordId.split('__')[0] : e.recordId;
    if (guessScenId) errorsByScenario.set(guessScenId, (errorsByScenario.get(guessScenId) || 0) + 1);
  });
  warnings.forEach((w) => {
    const guessScenId = w.recordId.includes('__') ? w.recordId.split('__')[0] : w.recordId;
    if (guessScenId) warningsByScenario.set(guessScenId, (warningsByScenario.get(guessScenId) || 0) + 1);
  });

  const scenarioPreviews: SimulatorScenarioPreviewSummary[] = scenarios.map((scn: any) => {
    const sId = String(scn.id);
    const fin = (sanitizedByCollection.simulationFinancialData || []).filter((r: any) => r.scenarioId === sId);
    const ops = (sanitizedByCollection.simulationOperationalData || []).filter((r: any) => r.scenarioId === sId);
    const chal = (sanitizedByCollection.simulationBusinessChallenges || []).filter((r: any) => r.scenarioId === sId);
    const tsk = (sanitizedByCollection.simulationTasks || []).filter((r: any) => r.scenarioId === sId);
    const ref = (sanitizedByCollection.simulationReferenceAnalysis || []).filter((r: any) => r.scenarioId === sId);
    const opt = (sanitizedByCollection.simulationDecisionOptions || []).filter((r: any) => r.scenarioId === sId);
    const rp = (sanitizedByCollection.simulationRoleplayPrompts || []).filter((r: any) => r.scenarioId === sId);
    const rub = (sanitizedByCollection.simulationEvaluationRubrics || []).filter((r: any) => r.scenarioId === sId);
    const cmp = (sanitizedByCollection.simulationCompetencyMappings || []).filter((r: any) => r.scenarioId === sId);
    const scnChecks = financialChecks.filter((c) => c.scenarioId === sId);

    const rubricWeightSum = round2(rub.reduce((a: number, r: any) => a + Number(r.weightPercent || 0), 0));
    const errCount = (errorsByScenario.get(sId) || 0) + scnChecks.filter((c) => !c.passed && c.severity === 'error').length;
    const warnCount = (warningsByScenario.get(sId) || 0) + scnChecks.filter((c) => !c.passed && c.severity === 'warning').length;
    const isDuplicate = existingScenarioIdSet.has(sId);

    let badge: SimulatorValidationBadge = 'READY TO IMPORT';
    if (errCount > 0) badge = 'INVALID';
    else if (isDuplicate) badge = 'DUPLICATE';
    else if (warnCount > 0) badge = 'WARNING';
    else if (fin.length > 0 && tsk.length > 0 && rub.length > 0) badge = 'VALID';

    return {
      scenarioId: sId,
      scenarioCode: scn.scenarioCode,
      hotelId: scn.hotelId,
      hotelName: hotelNameMap.get(scn.hotelId) || scn.hotelId,
      titleEn: scn.titleEn,
      titleVi: scn.titleVi,
      summaryEn: scn.summaryEn,
      summaryVi: scn.summaryVi,
      difficultyLevel: scn.difficultyLevel,
      targetRole: scn.targetRole,
      periodLabel: scn.periodLabel,
      status: scn.status,
      badge,
      isDuplicate,
      errorCount: errCount,
      warningCount: warnCount,
      rubricWeightSum,
      decisionOptionsCount: opt.length,
      childCounts: {
        financialRows: fin.length,
        operationalRows: ops.length,
        challenges: chal.length,
        tasks: tsk.length,
        referenceAnalyses: ref.length,
        decisionOptions: opt.length,
        roleplayPrompts: rp.length,
        rubrics: rub.length,
        competencyMappings: cmp.length,
      },
      financialChecks: scnChecks,
      sampleFinancialRows: fin as any[],
      sampleOperationalRows: ops as any[],
      tasks: tsk as any[],
      challenges: chal as any[],
      decisionOptions: opt as any[],
      roleplayPrompts: rp as any[],
      rubrics: rub as any[],
      competencyMappings: cmp as any[],
      referenceAnalyses: ref as any[],
    };
  });

  return {
    datasetType: 'simulator_starter',
    importBatchId,
    fileName: params.fileName,
    schemaVersionDetected,
    toleranceUsed: financialTolerance,
    readmeDetected,
    detectedSheets: wb.SheetNames,
    missingSheets,
    ignoredSheets,
    selectedSheets: sheetSummaries.map((s) => s.sheetName),
    totalRowsDetected,
    totalScenariosDetected: scenarios.length,
    validRecords: validRecordsTotal,
    invalidRecords: invalidRecordsTotal,
    errorCount: errors.length,
    warningCount: warnings.length,
    financialChecksRun,
    financialChecksPassed,
    financialChecks,
    unmappedCompetencies,
    unresolvedRelationships,
    sheetSummaries,
    scenarioPreviews,
    errors,
    warnings,
    sanitizedByCollection,
  };
}

// ============================================================================
// 12-SCENARIO STARTER WORKBOOK GENERATOR (12 Worksheets: README + 11 Data Tabs)
// ============================================================================

export function createSimulatorStarterTemplateBuffer(): Buffer {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      {
        Section: 'Workbook_Version',
        Value: 'USALI-Sim-v2.0',
        Instructions: 'FC Business Partner Simulator 12-Scenario Starter Dataset. README sheet is automatically excluded from Firestore import.',
      },
      {
        Section: 'Financial_Identities',
        Value: 'Tolerance = 0.02',
        Instructions: 'Departmental_Profit = Departmental_Revenue - Departmental_Expenses; GOP = Total_Operating_Revenue - Total_Departmental_Expenses - Total_Undistributed_Operating_Expenses; GOP_Margin = GOP / Total_Operating_Revenue * 100.',
      },
      {
        Section: 'Operational_KPIs',
        Value: 'USALI 12th',
        Instructions: 'Occupancy_% = Rooms_Sold / Rooms_Available * 100; ADR = Rooms_Revenue / Rooms_Sold; RevPAR = Rooms_Revenue / Rooms_Available.',
      },
    ]),
    'README'
  );

  const hotels = [
    { hotel_profile_id: 'hotel_sg', hotel_code: 'GH-SGN', hotel_name: 'Grand Horizon Saigon Hotel & Residences', brand_tier: '5-Star Luxury Urban', city: 'Ho Chi Minh City', rooms_available: 320, total_keys: 320, fc_position_level: 'Financial Controller', currency: 'USD' },
    { hotel_profile_id: 'hotel_dn', hotel_code: 'RP-DAD', hotel_name: 'Royal Palm Resort & Spa Danang', brand_tier: '5-Star Coastal Resort', city: 'Danang', rooms_available: 450, total_keys: 450, fc_position_level: 'Financial Controller', currency: 'USD' },
    { hotel_profile_id: 'hotel_hn', hotel_code: 'MB-HAN', hotel_name: 'Marina Bay Heritage Hotel Hanoi', brand_tier: 'Upper Upscale City', city: 'Hanoi', rooms_available: 240, total_keys: 240, fc_position_level: 'Assistant Financial Controller', currency: 'USD' },
    { hotel_profile_id: 'hotel_pq', hotel_code: 'CS-PQC', hotel_name: 'Coral Shores Phu Quoc Luxury Villas', brand_tier: 'Luxury Lifestyle Resort', city: 'Phu Quoc', rooms_available: 280, total_keys: 280, fc_position_level: 'Financial Controller', currency: 'USD' },
    { hotel_profile_id: 'hotel_nt', hotel_code: 'OB-NHA', hotel_name: 'Ocean Breeze Convention Hotel Nha Trang', brand_tier: 'Upscale MICE Hotel', city: 'Nha Trang', rooms_available: 380, total_keys: 380, fc_position_level: 'Assistant Financial Controller', currency: 'USD' },
    { hotel_profile_id: 'hotel_dl', hotel_code: 'HL-DLI', hotel_name: 'Highland Pines Sanctuary Resort Dalat', brand_tier: 'Boutique Heritage Resort', city: 'Dalat', rooms_available: 160, total_keys: 160, fc_position_level: 'Financial Controller', currency: 'USD' },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hotels), 'Hotel_Profiles');

  const scenarioDefs = [
    {
      id: 'scen_sim_01', code: 'SIM001', hotel: 'hotel_sg', keys: 320, days: 31, period: '2027-M03', diff: 3, status: 'Published',
      cat: 'GOP & Hotel Financial Performance', role: 'Financial Controller',
      titleEn: 'Flow-Through Erosion Despite 82% Occupancy Surge',
      titleVi: 'Suy giảm Flow-Through dù công suất phòng đạt 82%',
      sumEn: 'Occupancy surged +8pp to 82%, yet monthly GOP fell $55K below budget due to F&B banquet overtime and peak utility spikes.',
      sumVi: 'Công suất đạt 82% nhưng GOP hụt $55K do tăng ca tiệc F&B và chi phí điện năng.',
      comps: ['comp_bpa_01', 'comp_fpm_05', 'comp_sbp_02'],
      actOccSold: 8134, actAdr: 185, actFbRev: 680000, actFbExp: 545000, actOthRev: 120000, actOthExp: 62000, actUndist: 590000,
      bgtOccSold: 7440, bgtAdr: 182, bgtFbRev: 640000, bgtFbExp: 448000, bgtOthRev: 115000, bgtOthExp: 55000, bgtUndist: 545000,
      roomsExpRateAct: 0.25, roomsExpRateBgt: 0.24,
    },
    {
      id: 'scen_sim_02', code: 'SIM002', hotel: 'hotel_dn', keys: 450, days: 30, period: '2027-M04', diff: 3, status: 'Published',
      cat: 'Departmental Performance', role: 'Financial Controller',
      titleEn: 'OTA Channel Mix Over-Reliance & Net ADR Compression',
      titleVi: 'Phụ thuộc kênh OTA vượt 65% làm bào mòn Net ADR',
      sumEn: 'Resort hit 80% occupancy in shoulder season, yet OTA commissions inflated Rooms expenses and eroded Net ADR.',
      sumVi: 'Công suất đạt 80% nhưng tỷ trọng OTA cao làm hoa hồng phân phối ăn mòn Net ADR.',
      comps: ['comp_bpa_02', 'comp_sbp_01', 'comp_far_05'],
      actOccSold: 10800, actAdr: 160, actFbRev: 520000, actFbExp: 375000, actOthRev: 152000, actOthExp: 78000, actUndist: 600000,
      bgtOccSold: 10530, bgtAdr: 168, bgtFbRev: 530000, bgtFbExp: 365000, bgtOthRev: 155000, bgtOthExp: 75000, bgtUndist: 580000,
      roomsExpRateAct: 0.29, roomsExpRateBgt: 0.22,
    },
    {
      id: 'scen_sim_03', code: 'SIM003', hotel: 'hotel_hn', keys: 240, days: 31, period: '2027-M05', diff: 4, status: 'Validated',
      cat: 'Executive Meeting & Strategic Finance', role: 'Strategic Finance Business Partner',
      titleEn: 'Chiller VFD CAPEX Underwriting & DSCR Liquidity Defense',
      titleVi: 'Thẩm định dự án CAPEX VFD tiết kiệm điện & Bảo vệ DSCR',
      sumEn: 'Evaluate a $180K chiller retrofit while corporate occupancy softens to 62.5% and bank covenants watch DSCR closely.',
      sumVi: 'Đánh giá đầu tư nâng cấp VFD $180K khi công suất khối doanh nghiệp giảm còn 62.5%.',
      comps: ['comp_fpm_04', 'comp_fpm_03', 'comp_sbp_03'],
      actOccSold: 4650, actAdr: 160, actFbRev: 310000, actFbExp: 225000, actOthRev: 76000, actOthExp: 42000, actUndist: 345000,
      bgtOccSold: 5060, bgtAdr: 165, bgtFbRev: 335000, bgtFbExp: 230000, bgtOthRev: 82000, bgtOthExp: 43000, bgtUndist: 340000,
      roomsExpRateAct: 0.24, roomsExpRateBgt: 0.23,
    },
    {
      id: 'scen_sim_04', code: 'SIM004', hotel: 'hotel_pq', keys: 280, days: 30, period: '2027-M06', diff: 2, status: 'Published',
      cat: 'Cost Control & Profitability', role: 'Assistant Financial Controller',
      titleEn: 'All-Day Dining Food Cost Spike & Menu Engineering Fix',
      titleVi: 'Biến động Food Cost tăng vọt & Tái cấu trúc thực đơn F&B',
      sumEn: 'Food cost jumped from 31% budget to 38.5% due to buffet over-production, shellfish waste, and unadjusted menu prices.',
      sumVi: 'Chi phí thực phẩm tăng từ 31% lên 38.5% do hao hụt buffet và giá nguyên liệu hải sản.',
      comps: ['comp_fca_03', 'comp_bpa_01', 'comp_far_01'],
      actOccSold: 6048, actAdr: 225, actFbRev: 540000, actFbExp: 448000, actOthRev: 140000, actOthExp: 65000, actUndist: 485000,
      bgtOccSold: 6048, bgtAdr: 225, bgtFbRev: 550000, bgtFbExp: 385000, bgtOthRev: 145000, bgtOthExp: 66000, bgtUndist: 480000,
      roomsExpRateAct: 0.21, roomsExpRateBgt: 0.21,
    },
    {
      id: 'scen_sim_05', code: 'SIM005', hotel: 'hotel_nt', keys: 380, days: 31, period: '2027-M07', diff: 3, status: 'Published',
      cat: 'Revenue Forecasting & Budgeting', role: 'Financial Controller',
      titleEn: 'MICE Group Wash Factor & 90-Day Rolling Forecast Calibration',
      titleVi: 'Hiệu chỉnh Rolling Forecast 90 ngày & Rủi ro hủy đoàn MICE',
      sumEn: 'Two major convention blocks postponed rooms and banquet spend; re-forecast Q3 GOP and flex variable labor immediately.',
      sumVi: 'Hai đoàn hội nghị lớn hoãn lịch đặt phòng và tiệc; cần cập nhật dự báo 90 ngày và điều chỉnh định biên.',
      comps: ['comp_fpm_02', 'comp_fpm_05', 'comp_sbp_01'],
      actOccSold: 7657, actAdr: 145, actFbRev: 495000, actFbExp: 360000, actOthRev: 95000, actOthExp: 48000, actUndist: 465000,
      bgtOccSold: 8835, bgtAdr: 152, bgtFbRev: 610000, bgtFbExp: 415000, bgtOthRev: 105000, bgtOthExp: 50000, bgtUndist: 470000,
      roomsExpRateAct: 0.25, roomsExpRateBgt: 0.23,
    },
    {
      id: 'scen_sim_06', code: 'SIM006', hotel: 'hotel_sg', keys: 320, days: 30, period: '2027-M06', diff: 2, status: 'Published',
      cat: 'Cost Control & Profitability', role: 'Assistant Financial Controller',
      titleEn: 'Housekeeping HPOR Labor Productivity & Agency Temps Control',
      titleVi: 'Kiểm soát năng suất HPOR Buồng phòng & Nhân sự thuê ngoài',
      sumEn: 'Elevated transient check-outs drove Housekeeping minutes-per-room and agency labor rates 19% over flex budget.',
      sumVi: 'Khách lưu trú ngắn ngày tăng làm chi phí nhân công thuê ngoài Buồng phòng vượt 19% định mức linh hoạt.',
      comps: ['comp_bpa_03', 'comp_lpm_01', 'comp_far_05'],
      actOccSold: 7488, actAdr: 192, actFbRev: 610000, actFbExp: 430000, actOthRev: 112000, actOthExp: 54000, actUndist: 540000,
      bgtOccSold: 7488, bgtAdr: 190, bgtFbRev: 605000, bgtFbExp: 425000, bgtOthRev: 110000, bgtOthExp: 53000, bgtUndist: 535000,
      roomsExpRateAct: 0.27, roomsExpRateBgt: 0.22,
    },
    {
      id: 'scen_sim_07', code: 'SIM007', hotel: 'hotel_dl', keys: 160, days: 31, period: '2027-M08', diff: 3, status: 'Published',
      cat: 'GOP & Hotel Financial Performance', role: 'Financial Controller',
      titleEn: 'Bundled Half-Board Package IFRS 15 Allocation & Spa Margin',
      titleVi: 'Phân bổ doanh thu gói Package IFRS 15 & Biên lợi nhuận Spa',
      sumEn: 'Aggressive summer packages misallocated F&B credits vs Rooms, distorting both Rooms ADR and Spa departmental profit.',
      sumVi: 'Gói combo hè phân bổ sai tỷ trọng giữa Phòng, Ẩm thực và Spa làm méo mó biên lợi nhuận từng bộ phận.',
      comps: ['comp_far_04', 'comp_far_01', 'comp_bpa_04'],
      actOccSold: 3869, actAdr: 175, actFbRev: 265000, actFbExp: 195000, actOthRev: 115000, actOthExp: 64000, actUndist: 295000,
      bgtOccSold: 3820, bgtAdr: 185, bgtFbRev: 245000, bgtFbExp: 175000, bgtOthRev: 120000, bgtOthExp: 58000, bgtUndist: 290000,
      roomsExpRateAct: 0.24, roomsExpRateBgt: 0.22,
    },
    {
      id: 'scen_sim_08', code: 'SIM008', hotel: 'hotel_hn', keys: 240, days: 30, period: '2027-M09', diff: 3, status: 'Published',
      cat: 'Cost Control & Profitability', role: 'Financial Controller',
      titleEn: 'Corporate AR Aging Spike & Credit Control Turnaround',
      titleVi: 'Kiểm soát công nợ phải thu doanh nghiệp quá hạn & DSO',
      sumEn: 'DSO stretched to 49 days across diplomatic and tour-operator accounts, straining vendor payment timing and cash buffer.',
      sumVi: 'Chỉ số thu hồi nợ DSO tăng lên 49 ngày ở nhóm đại lý lữ hành, gây áp lực vốn lưu động.',
      comps: ['comp_fca_05', 'comp_fpm_03', 'comp_fca_04'],
      actOccSold: 5472, actAdr: 170, actFbRev: 345000, actFbExp: 248000, actOthRev: 88000, actOthExp: 44000, actUndist: 372000,
      bgtOccSold: 5616, bgtAdr: 172, bgtFbRev: 350000, bgtFbExp: 245000, bgtOthRev: 90000, bgtOthExp: 44000, bgtUndist: 365000,
      roomsExpRateAct: 0.23, roomsExpRateBgt: 0.22,
    },
    {
      id: 'scen_sim_09', code: 'SIM009', hotel: 'hotel_dn', keys: 450, days: 31, period: '2027-M10', diff: 4, status: 'Published',
      cat: 'GM Business Advisory', role: 'Strategic Finance Business Partner',
      titleEn: 'POS Void Abuse & Revenue Leakage Forensic Audit',
      titleVi: 'Kiểm toán gian lận hủy hóa đơn POS & Thất thoát doanh thu',
      sumEn: 'Late-night bar voids and open-check comps surged 3.4x after midnight while cash-to-card ratio shifted unexpectedly.',
      sumVi: 'Tỷ lệ hủy bill và miễn phí quầy bar sau nửa đêm tăng gấp 3.4 lần đòi hỏi kiểm soát nội bộ khẩn.',
      comps: ['comp_fca_02', 'comp_fca_01', 'comp_sbp_04'],
      actOccSold: 9905, actAdr: 158, actFbRev: 480000, actFbExp: 365000, actOthRev: 140000, actOthExp: 72000, actUndist: 575000,
      bgtOccSold: 10044, bgtAdr: 162, bgtFbRev: 545000, bgtFbExp: 368000, bgtOthRev: 145000, bgtOthExp: 70000, bgtUndist: 570000,
      roomsExpRateAct: 0.23, roomsExpRateBgt: 0.22,
    },
    {
      id: 'scen_sim_10', code: 'SIM010', hotel: 'hotel_pq', keys: 280, days: 31, period: '2027-M10', diff: 2, status: 'Published',
      cat: 'GOP & Hotel Financial Performance', role: 'Assistant Financial Controller',
      titleEn: 'Month-End Day-3 Close & Balance Sheet Accrual Integrity',
      titleVi: 'Khóa sổ cuối tháng đúng hạn Day-3 & Kiểm soát trích trước',
      sumEn: 'Reconcile unposted utility accruals, prepaid insurance amortization, and banquet deposits to deliver clean Day-3 USALI P&L.',
      sumVi: 'Đối chiếu trích trước tiền điện, chi phí trả trước và đặt cọc tiệc để khóa sổ P&L chuẩn xác vào ngày làm việc thứ 3.',
      comps: ['comp_far_02', 'comp_far_03', 'comp_far_01'],
      actOccSold: 6250, actAdr: 230, actFbRev: 560000, actFbExp: 388000, actOthRev: 150000, actOthExp: 72000, actUndist: 498000,
      bgtOccSold: 6250, bgtAdr: 228, bgtFbRev: 550000, bgtFbExp: 382000, bgtOthRev: 148000, bgtOthExp: 70000, bgtUndist: 492000,
      roomsExpRateAct: 0.21, roomsExpRateBgt: 0.21,
    },
    {
      id: 'scen_sim_11', code: 'SIM011', hotel: 'hotel_nt', keys: 380, days: 30, period: '2027-M11', diff: 4, status: 'Published',
      cat: 'Revenue Forecasting & Budgeting', role: 'Financial Controller',
      titleEn: '2028 Zero-Based Budget & Owner GOP Conversion Target',
      titleVi: 'Lập ngân sách Zero-Based 2028 & Cam kết biên GOP với Chủ đầu tư',
      sumEn: 'Owner demands 38% GOP margin in 2028 despite 7% wage inflation. Partner with GM to defend realistic rate & productivity levers.',
      sumVi: 'Chủ đầu tư yêu cầu biên GOP 38% năm 2028 dù lương cơ bản tăng 7%. Xây dựng phương án cân đối giá phòng & năng suất.',
      comps: ['comp_fpm_01', 'comp_bpa_05', 'comp_sbp_05'],
      actOccSold: 8550, actAdr: 155, actFbRev: 580000, actFbExp: 412000, actOthRev: 110000, actOthExp: 54000, actUndist: 485000,
      bgtOccSold: 8892, bgtAdr: 162, bgtFbRev: 615000, bgtFbExp: 418000, bgtOthRev: 118000, bgtOthExp: 55000, bgtUndist: 478000,
      roomsExpRateAct: 0.23, roomsExpRateBgt: 0.21,
    },
    {
      id: 'scen_sim_12', code: 'SIM012', hotel: 'hotel_dl', keys: 160, days: 30, period: '2027-M12', diff: 3, status: 'Draft',
      cat: 'Executive Meeting & Strategic Finance', role: 'Financial Controller',
      titleEn: 'Peak Festive Margin Protection & Executive Board Briefing',
      titleVi: 'Bảo vệ biên lợi nhuận mùa cao điểm lễ hội & Trình bày HĐQT',
      sumEn: 'Evaluate minimum length-of-stay rules, gala dinner pricing, and temporary seasonal hiring prior to GM executive sign-off.',
      sumVi: 'Đánh giá chính sách lưu trú tối thiểu, giá tiệc Gala và định biên thời vụ trước khi trình GM phê duyệt.',
      comps: ['comp_sbp_02', 'comp_lpm_02', 'comp_bpa_01'],
      actOccSold: 4320, actAdr: 210, actFbRev: 340000, actFbExp: 232000, actOthRev: 98000, actOthExp: 46000, actUndist: 310000,
      bgtOccSold: 4224, bgtAdr: 205, bgtFbRev: 325000, bgtFbExp: 222000, bgtOthRev: 92000, bgtOthExp: 44000, bgtUndist: 305000,
      roomsExpRateAct: 0.22, roomsExpRateBgt: 0.22,
    },
  ];

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      scenarioDefs.map((s) => ({
        scenario_id: s.id,
        scenario_code: s.code,
        hotel_profile_id: s.hotel,
        title_en: s.titleEn,
        title_vi: s.titleVi,
        summary_en: s.sumEn,
        summary_vi: s.sumVi,
        category: s.cat,
        difficulty_level: s.diff,
        target_role: s.role,
        period_label: s.period,
        competency_ids: s.comps.join(', '),
        dataset_version: '2027.v1',
        status: s.status,
      }))
    ),
    'Scenario_Master'
  );

  // Competency Mapping (3 competencies per scenario -> 36 rows, weighted 40/35/25 = 100%)
  const compMapRows: any[] = [];
  scenarioDefs.forEach((s) => {
    const weights = [40, 35, 25];
    s.comps.forEach((cid, idx) => {
      compMapRows.push({
        id: `${s.id}__Comp__${cid}`,
        scenario_id: s.id,
        competency_id: cid,
        target_proficiency_level: idx === 0 ? s.diff : Math.max(2, s.diff - 1),
        weight_percent: weights[idx],
        is_primary: idx === 0,
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compMapRows), 'Competency_Mapping');

  // Financial & Operational Datasets across Actual + Budget versions (with ROOMS, FB, OTHER summing cleanly to Total)
  const finRows: any[] = [];
  const opRows: any[] = [];

  scenarioDefs.forEach((s) => {
    const roomsAvail = s.keys * s.days;

    // Actual calculations
    const actRoomsRev = round2(s.actOccSold * s.actAdr);
    const actRoomsExp = round2(actRoomsRev * s.roomsExpRateAct);
    const actTotOpRev = round2(actRoomsRev + s.actFbRev + s.actOthRev);
    const actTotDeptExp = round2(actRoomsExp + s.actFbExp + s.actOthExp);
    const actGop = round2(actTotOpRev - actTotDeptExp - s.actUndist);
    const actGopMargin = round2((actGop / actTotOpRev) * 100);

    // Budget calculations
    const bgtRoomsRev = round2(s.bgtOccSold * s.bgtAdr);
    const bgtRoomsExp = round2(bgtRoomsRev * s.roomsExpRateBgt);
    const bgtTotOpRev = round2(bgtRoomsRev + s.bgtFbRev + s.bgtOthRev);
    const bgtTotDeptExp = round2(bgtRoomsExp + s.bgtFbExp + s.bgtOthExp);
    const bgtGop = round2(bgtTotOpRev - bgtTotDeptExp - s.bgtUndist);
    const bgtGopMargin = round2((bgtGop / bgtTotOpRev) * 100);

    const pushDepts = (ver: 'Actual' | 'Budget', rRev: number, rExp: number, fRev: number, fExp: number, oRev: number, oExp: number, totRev: number, totExp: number, undist: number, gopVal: number, gopMgn: number) => {
      const depts = [
        { code: 'ROOMS', name: 'Rooms Department', rev: rRev, exp: rExp },
        { code: 'FB', name: 'Food & Beverage', rev: fRev, exp: fExp },
        { code: 'OTHER', name: 'Other Operating Departments', rev: oRev, exp: oExp },
      ];
      depts.forEach((d) => {
        finRows.push({
          id: `${s.id}__Financial__${s.period}__${ver}__${d.code}`,
          scenario_id: s.id,
          hotel_profile_id: s.hotel,
          period_label: s.period,
          version: ver,
          department_code: d.code,
          department_name: d.name,
          unit: 'USD',
          metric_type: 'Profit',
          departmental_revenue: d.rev,
          departmental_expenses: d.exp,
          departmental_profit: round2(d.rev - d.exp),
          total_operating_revenue: totRev,
          total_departmental_expenses: totExp,
          total_undistributed_expenses: undist,
          gop: gopVal,
          gop_margin_pct: gopMgn,
          rooms_revenue: rRev,
          budget_gop: bgtGop,
        });
      });
    };

    pushDepts('Actual', actRoomsRev, actRoomsExp, s.actFbRev, s.actFbExp, s.actOthRev, s.actOthExp, actTotOpRev, actTotDeptExp, s.actUndist, actGop, actGopMargin);
    pushDepts('Budget', bgtRoomsRev, bgtRoomsExp, s.bgtFbRev, s.bgtFbExp, s.bgtOthRev, s.bgtOthExp, bgtTotOpRev, bgtTotDeptExp, s.bgtUndist, bgtGop, bgtGopMargin);

    opRows.push({
      id: `${s.id}__Operational__${s.period}__Actual`,
      scenario_id: s.id,
      hotel_profile_id: s.hotel,
      period_label: s.period,
      version: 'Actual',
      rooms_available: roomsAvail,
      rooms_sold: s.actOccSold,
      rooms_revenue: actRoomsRev,
      occupancy_pct: round2((s.actOccSold / roomsAvail) * 100),
      adr: round2(actRoomsRev / s.actOccSold),
      revpar: round2(actRoomsRev / roomsAvail),
      fb_covers: Math.round(s.actOccSold * 1.8),
      labor_hours: Math.round(s.actOccSold * 3.4),
      overtime_hours: Math.round(s.actOccSold * 0.25),
      gss_score: 88.5,
    });
    opRows.push({
      id: `${s.id}__Operational__${s.period}__Budget`,
      scenario_id: s.id,
      hotel_profile_id: s.hotel,
      period_label: s.period,
      version: 'Budget',
      rooms_available: roomsAvail,
      rooms_sold: s.bgtOccSold,
      rooms_revenue: bgtRoomsRev,
      occupancy_pct: round2((s.bgtOccSold / roomsAvail) * 100),
      adr: round2(bgtRoomsRev / s.bgtOccSold),
      revpar: round2(bgtRoomsRev / roomsAvail),
      fb_covers: Math.round(s.bgtOccSold * 1.75),
      labor_hours: Math.round(s.bgtOccSold * 3.1),
      overtime_hours: Math.round(s.bgtOccSold * 0.1),
      gss_score: 90.0,
    });
  });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(finRows), 'Financial_Dataset');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(opRows), 'Operational_Dataset');

  const challengeRows: any[] = [];
  const taskRows: any[] = [];
  const refRows: any[] = [];
  const optRows: any[] = [];
  const rpRows: any[] = [];
  const rubRows: any[] = [];

  scenarioDefs.forEach((s) => {
    challengeRows.push(
      {
        id: `${s.id}__Challenge__CH1`,
        scenario_id: s.id,
        challenge_code: 'CH-1',
        title_en: `${s.titleEn} — Primary Variance Driver`,
        title_vi: `${s.titleVi} — Nguyên nhân chính`,
        description_en: s.sumEn,
        description_vi: s.sumVi,
        severity: 'Critical',
        impact_area: s.cat,
      },
      {
        id: `${s.id}__Challenge__CH2`,
        scenario_id: s.id,
        challenge_code: 'CH-2',
        title_en: 'GM Operational Trade-Off & Guest Satisfaction Balance',
        title_vi: 'Cân bằng giữa cắt giảm chi phí và hài lòng khách hàng',
        description_en: 'Protect 5-star service standards while executing rapid 30-day margin recovery.',
        description_vi: 'Bảo vệ tiêu chuẩn dịch vụ 5 sao trong khi phục hồi biên lợi nhuận trong 30 ngày.',
        severity: 'High',
        impact_area: 'Executive Governance',
      }
    );

    taskRows.push(
      {
        id: `${s.id}__Task__01`,
        scenario_id: s.id,
        task_id: `${s.code}-T1`,
        task_order: 1,
        title_en: 'Quantify USALI Departmental Variance Bridge',
        title_vi: 'Lập cầu nối biến động P&L theo USALI',
        instructions_en: 'Reconcile Rooms, F&B, and Undistributed variances between Actual and Budget.',
        instructions_vi: 'Đối chiếu chênh lệch Thực tế vs Ngân sách theo từng bộ phận.',
        deliverable_type: 'Variance Bridge',
        max_points: 35,
      },
      {
        id: `${s.id}__Task__02`,
        scenario_id: s.id,
        task_id: `${s.code}-T2`,
        task_order: 2,
        title_en: 'Evaluate Commercial & Cost Corrective Levers',
        title_vi: 'Đánh giá phương án tối ưu doanh thu & chi phí',
        instructions_en: 'Select high-ROI low-risk actions and quantify expected GOP recovery.',
        instructions_vi: 'Lựa chọn hành động tối ưu và lượng hóa mức cải thiện GOP.',
        deliverable_type: 'Decision Matrix',
        max_points: 35,
      },
      {
        id: `${s.id}__Task__03`,
        scenario_id: s.id,
        task_id: `${s.code}-T3`,
        task_order: 3,
        title_en: 'Brief General Manager in Executive Meeting',
        title_vi: 'Thuyết trình phương án trong cuộc họp điều hành với GM',
        instructions_en: 'Deliver a crisp 60-second recommendation and defend financial assumptions.',
        instructions_vi: 'Trình bày tóm tắt 60 giây và phản biện giả định tài chính với GM.',
        deliverable_type: 'GM Executive Memo',
        max_points: 30,
      }
    );

    refRows.push({
      id: `${s.id}__Ref__01`,
      scenario_id: s.id,
      topic: s.titleEn,
      root_cause_en: `Verified root cause for ${s.code}: ${s.sumEn}`,
      root_cause_vi: `Nguyên nhân gốc rễ chuẩn hóa cho ${s.code}: ${s.sumVi}`,
      benchmark_formula: 'Flow-Through % = (Actual GOP - Budget GOP) / (Actual Total Revenue - Budget Total Revenue)',
      recommended_action_en: 'Execute Option A (flexed labor & channel parity discipline) while monitoring daily RevPAR & HPOR.',
      recommended_action_vi: 'Triển khai Phương án A kết hợp giám sát RevPAR và năng suất HPOR hàng ngày.',
    });

    optRows.push(
      {
        id: `${s.id}__Option__A`,
        scenario_id: s.id,
        option_code: 'A',
        title_en: 'Targeted Operational Flex & Commercial Mix Optimization',
        title_vi: 'Điều chỉnh định biên linh hoạt & Tối ưu cơ cấu doanh thu',
        financial_impact_estimate: 58000,
        gop_impact_pct: 2.6,
        risk_level: 'Low',
        is_optimal: true,
        rationale_en: 'Addresses the root departmental leakage directly without harming 5-star guest scores.',
        rationale_vi: 'Xử lý trực tiếp điểm rò rỉ lợi nhuận mà không ảnh hưởng chất lượng dịch vụ.',
      },
      {
        id: `${s.id}__Option__B`,
        scenario_id: s.id,
        option_code: 'B',
        title_en: 'Across-the-Board 15% Amenity & Service Cut',
        title_vi: 'Cắt giảm đồng loạt 15% tiện ích và tiêu chuẩn phục vụ',
        financial_impact_estimate: 14000,
        gop_impact_pct: 0.6,
        risk_level: 'High',
        is_optimal: false,
        rationale_en: 'Triggers guest satisfaction erosion and ignores structural channel/cost drivers.',
        rationale_vi: 'Làm sụt giảm điểm hài lòng khách và không giải quyết gốc rễ vấn đề.',
      },
      {
        id: `${s.id}__Option__C`,
        scenario_id: s.id,
        option_code: 'C',
        title_en: 'Defer Action Until Next Annual Budget Cycle',
        title_vi: 'Trì hoãn xử lý đến kỳ ngân sách năm sau',
        financial_impact_estimate: -45000,
        gop_impact_pct: -1.9,
        risk_level: 'High',
        is_optimal: false,
        rationale_en: 'Allows annualized GOP leakage and covenant pressure to compound.',
        rationale_vi: 'Khiến thâm hụt GOP lũy kế nghiêm trọng hơn qua các tháng tiếp theo.',
      }
    );

    rpRows.push(
      {
        id: `${s.id}__GM__01`,
        scenario_id: s.id,
        roleplay_id: `${s.code}-GM1`,
        turn_order: 1,
        speaker_role: 'General Manager',
        prompt_en: `FC, walk me through the primary driver behind ${s.code} (${s.period}) and quantify the exact GOP impact vs budget.`,
        prompt_vi: `FC, hãy giải trình nguyên nhân cốt lõi của tình huống ${s.code} (${s.period}) và lượng hóa tác động GOP so với ngân sách.`,
        expected_focus_points: 'Exact revenue/cost variance bridge, root cause separation from symptoms.',
      },
      {
        id: `${s.id}__GM__02`,
        scenario_id: s.id,
        roleplay_id: `${s.code}-GM2`,
        turn_order: 2,
        speaker_role: 'General Manager',
        prompt_en: 'If Operations pushes back on service impact, how will you measure recovery in the next 30 days without sacrificing guest satisfaction?',
        prompt_vi: 'Nếu Bộ phận Vận hành lo ngại ảnh hưởng chất lượng dịch vụ, bạn đề xuất KPI kiểm soát nào trong 30 ngày tới?',
        expected_focus_points: 'Balanced KPI scorecard (GSS, HPOR, Net ADR, GOP flow-through).',
      }
    );

    rubRows.push(
      {
        id: `${s.id}__Rubric__FIN`,
        scenario_id: s.id,
        criterion_code: 'FIN-ACC',
        criterion_name_en: 'USALI Financial & KPI Calculation Accuracy',
        criterion_name_vi: 'Độ chính xác tính toán tài chính & KPI USALI',
        weight_percent: 40,
        max_score: 100,
        passing_score: 70,
      },
      {
        id: `${s.id}__Rubric__BIZ`,
        scenario_id: s.id,
        criterion_code: 'BIZ-STR',
        criterion_name_en: 'Root Cause Diagnosis & Commercial Judgment',
        criterion_name_vi: 'Chẩn đoán nguyên nhân & Tư duy thương mại',
        weight_percent: 35,
        max_score: 100,
        passing_score: 70,
      },
      {
        id: `${s.id}__Rubric__COM`,
        scenario_id: s.id,
        criterion_code: 'GM-ADV',
        criterion_name_en: 'Executive GM Advisory & Action Plan Clarity',
        criterion_name_vi: 'Kỹ năng cố vấn GM & Kế hoạch hành động',
        weight_percent: 25,
        max_score: 100,
        passing_score: 70,
      }
    );
  });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(challengeRows), 'Business_Challenges');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows), 'Learner_Tasks');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(refRows), 'Reference_Analysis');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(optRows), 'Decision_Options');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rpRows), 'GM_Roleplay');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rubRows), 'Evaluation_Rubric');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
