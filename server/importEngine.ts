import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Firestore as AdminFirestore } from 'firebase-admin/firestore';

export type DuplicateStrategy = 'skip' | 'update' | 'reject';

export interface SheetSpec {
  order: number;
  sheetName: string;
  collectionName: string;
  expectedCount: number;
  labelEn: string;
  labelVi: string;
  dependencies: string[];
}

export const IMPORT_ORDER_SPEC: SheetSpec[] = [
  {
    order: 1,
    sheetName: 'Competency_Domains',
    collectionName: 'competencyDomains',
    expectedCount: 6,
    labelEn: 'Competency Domains',
    labelVi: 'Miền Năng Lực',
    dependencies: [],
  },
  {
    order: 2,
    sheetName: 'Proficiency_Levels',
    collectionName: 'proficiencyLevels',
    expectedCount: 4,
    labelEn: 'Proficiency Levels',
    labelVi: 'Cấp Độ Thành Thạo',
    dependencies: [],
  },
  {
    order: 3,
    sheetName: 'Competencies',
    collectionName: 'competencies',
    expectedCount: 30,
    labelEn: 'Competencies',
    labelVi: 'Năng Lực Chi Tiết',
    dependencies: ['competencyDomains'],
  },
  {
    order: 4,
    sheetName: 'Competency_Rubric',
    collectionName: 'competencyRubrics',
    expectedCount: 120,
    labelEn: 'Competency Rubrics',
    labelVi: 'Thang Đo Hành Vi',
    dependencies: ['competencies'],
  },
  {
    order: 5,
    sheetName: 'Course_Catalog',
    collectionName: 'courses',
    expectedCount: 18,
    labelEn: 'Course Catalog',
    labelVi: 'Danh Mục Khóa Học',
    dependencies: ['competencyDomains', 'competencies'],
  },
  {
    order: 6,
    sheetName: 'Question_Bank',
    collectionName: 'questionBank',
    expectedCount: 60,
    labelEn: 'Question Bank',
    labelVi: 'Ngân Hàng Câu Hỏi',
    dependencies: ['courses', 'competencies'],
  },
  {
    order: 7,
    sheetName: 'Practical_Assignments',
    collectionName: 'practicalAssignments',
    expectedCount: 6,
    labelEn: 'Practical Assignments',
    labelVi: 'Bài Tập Thực Hành OJT',
    dependencies: ['courses', 'competencies'],
  },
  {
    order: 8,
    sheetName: 'Training_Matrix_2027',
    collectionName: 'annualTrainingMatrix',
    expectedCount: 12,
    labelEn: 'Training Matrix 2027',
    labelVi: 'Ma Trận Đào Tạo 2027',
    dependencies: ['competencyDomains', 'courses', 'competencies'],
  },
  {
    order: 9,
    sheetName: 'Career_Paths',
    collectionName: 'careerPaths',
    expectedCount: 3,
    labelEn: 'Career Paths',
    labelVi: 'Lộ Trình Nghề Nghiệp',
    dependencies: ['courses', 'competencies', 'practicalAssignments'],
  },
];

export const README_SHEET_NAME = 'README';

export interface ValidationIssue {
  sheet: string;
  collection: string;
  row: number; // 1-indexed Excel row number (header = row 1, first data row = 2)
  field: string;
  recordId: string;
  severity: 'error' | 'warning';
  reason: string;
}

export interface SheetSummaryPreview {
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
  previewRows: Record<string, any>[];
}

export interface ParseValidateResult {
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

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

const SHEET_ID_ALIASES: Record<string, string[]> = {
  Competency_Domains: ['id', 'domain_id', 'competency_domain_id', 'record_id', 'doc_id'],
  Proficiency_Levels: ['id', 'level_id', 'proficiency_level_id', 'proficiency_id', 'record_id', 'doc_id'],
  Competencies: ['id', 'competency_id', 'comp_id', 'record_id', 'doc_id'],
  Competency_Rubric: ['id', 'rubric_id', 'competency_rubric_id', 'record_id', 'doc_id'],
  Course_Catalog: ['id', 'course_id', 'crs_id', 'record_id', 'doc_id'],
  Question_Bank: ['id', 'question_id', 'q_id', 'record_id', 'doc_id'],
  Practical_Assignments: ['id', 'assignment_id', 'practical_id', 'ojt_id', 'record_id', 'doc_id'],
  Training_Matrix_2027: ['id', 'matrix_id', 'schedule_id', 'entry_id', 'record_id', 'doc_id'],
  Career_Paths: ['id', 'path_id', 'career_path_id', 'record_id', 'doc_id'],
};

const SHEET_HEADER_HINT_TOKENS: Record<string, string[]> = {
  Competency_Domains: ['id', 'domain_id', 'code', 'domain_code', 'name', 'name_en', 'domain_name', 'weight', 'weight_percent', 'sort_order'],
  Proficiency_Levels: ['id', 'level_id', 'level', 'proficiency_level', 'code', 'level_code', 'name', 'name_en', 'target_role'],
  Competencies: ['id', 'competency_id', 'code', 'competency_code', 'domain_id', 'name', 'name_en', 'target_level'],
  Competency_Rubric: ['id', 'rubric_id', 'competency_id', 'proficiency_level', 'level', 'criteria', 'criteria_en', 'assessment_weight'],
  Course_Catalog: ['id', 'course_id', 'code', 'course_code', 'domain_id', 'competency_id', 'title', 'title_en', 'duration_hours', 'passing_score'],
  Question_Bank: ['id', 'question_id', 'course_id', 'competency_id', 'question_type', 'type', 'question_text', 'question_text_en', 'correct_answer', 'answer'],
  Practical_Assignments: ['id', 'assignment_id', 'code', 'assignment_code', 'course_id', 'competency_id', 'title', 'title_en', 'max_score', 'passing_score'],
  Training_Matrix_2027: ['id', 'matrix_id', 'month', 'target_date', 'scheduled_date', 'target_role', 'domain_id', 'course_id', 'competency_id', 'mandatory'],
  Career_Paths: ['id', 'path_id', 'career_path_id', 'code', 'name', 'name_en', 'from_role', 'to_role', 'required_course_ids', 'required_competency_ids'],
};

function normalizeHeaderKey(rawKey: string): string {
  return String(rawKey || '')
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

function stripNonLangParens(rawKey: string): string {
  // Strip parenthetical hints such as "(1-4)", "(YYYY-MM-DD)", "(Yes/No)" while preserving (EN), (VI), (%)
  return String(rawKey || '').replace(
    /\((?!\s*(?:en|vi|english|vietnamese|%)\s*\))[^)]*\)/gi,
    ' '
  );
}

function normalizeRowKeys(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const primary = normalizeHeaderKey(k);
    if (primary && !primary.startsWith('__empty')) {
      out[primary] = v;
      const stripped = normalizeHeaderKey(stripNonLangParens(k));
      if (stripped && stripped !== primary && out[stripped] === undefined) {
        out[stripped] = v;
      }
    }
  }
  return out;
}

function extractSheetTable(ws: XLSX.WorkSheet, sheetName: string): {
  rawRows: Record<string, any>[];
  detectedHeaders: string[];
  normalizedHeaders: Set<string>;
  headerRowNumber: number;
} {
  const matrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
  if (!matrix || matrix.length === 0) {
    return { rawRows: [], detectedHeaders: [], normalizedHeaders: new Set(), headerRowNumber: 1 };
  }

  const hintSet = new Set(SHEET_HEADER_HINT_TOKENS[sheetName] || []);
  let headerRowIdx = 0;
  let bestScore = -1;

  const scanLimit = Math.min(6, matrix.length);
  for (let r = 0; r < scanLimit; r++) {
    const cells = Array.isArray(matrix[r]) ? matrix[r] : [];
    const nonEmptyCells = cells.map((c) => strVal(c)).filter(Boolean);
    if (nonEmptyCells.length === 0) continue;

    let score = 0;
    for (const cell of nonEmptyCells) {
      const k1 = normalizeHeaderKey(cell);
      const k2 = normalizeHeaderKey(stripNonLangParens(cell));
      if (hintSet.has(k1) || hintSet.has(k2)) {
        score += 3;
      } else if (
        k1.endsWith('_id') ||
        k1.endsWith('_en') ||
        k1.endsWith('_vi') ||
        k1.endsWith('_code') ||
        k1.endsWith('_percent')
      ) {
        score += 2;
      }
    }
    // Prefer rows with multiple columns over single-cell banner titles
    if (nonEmptyCells.length >= 2) score += 1;

    if (score > bestScore) {
      bestScore = score;
      headerRowIdx = r;
    }
  }

  const headerCells = Array.isArray(matrix[headerRowIdx]) ? matrix[headerRowIdx] : [];
  const colHeaders: Array<{ colIdx: number; headerText: string }> = [];
  const detectedHeaders: string[] = [];
  const normalizedHeaders = new Set<string>();

  headerCells.forEach((cell, colIdx) => {
    const headerText = strVal(cell);
    if (!headerText) return;
    colHeaders.push({ colIdx, headerText });
    detectedHeaders.push(headerText);
    const k1 = normalizeHeaderKey(headerText);
    const k2 = normalizeHeaderKey(stripNonLangParens(headerText));
    if (k1) normalizedHeaders.add(k1);
    if (k2) normalizedHeaders.add(k2);
  });

  const rawRows: Array<Record<string, any> & { __excelRow: number }> = [];
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const cells = Array.isArray(matrix[r]) ? matrix[r] : [];
    const rowObj: Record<string, any> = { __excelRow: r + 1 };
    let hasAnyValue = false;

    for (const { colIdx, headerText } of colHeaders) {
      const val = colIdx < cells.length ? cells[colIdx] : '';
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        hasAnyValue = true;
      }
      rowObj[headerText] = val;
    }

    if (hasAnyValue) {
      rawRows.push(rowObj as Record<string, any> & { __excelRow: number });
    }
  }

  return {
    rawRows,
    detectedHeaders,
    normalizedHeaders,
    headerRowNumber: headerRowIdx + 1,
  };
}

function hasHeader(normalizedHeaders: Set<string>, ...aliases: string[]): boolean {
  for (const alias of aliases) {
    if (normalizedHeaders.has(normalizeHeaderKey(alias))) return true;
  }
  return false;
}

function pickField(row: Record<string, any>, ...aliases: string[]): any {
  for (const alias of aliases) {
    const key = normalizeHeaderKey(alias);
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return undefined;
}

function strVal(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function parseFiniteNum(val: any): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  const s = String(val).trim();
  if (!s) return null;
  // Support "20%" or "20.5 %" strings
  if (/^-?\d+(?:\.\d+)?\s*%$/.test(s)) {
    const n = Number(s.replace('%', '').trim());
    return Number.isFinite(n) ? n : null;
  }
  const cleaned = s.replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseProficiencyLevel(val: any): number | null {
  const direct = parseFiniteNum(val);
  if (direct !== null) return direct;
  const s = strVal(val);
  if (!s) return null;
  const match = s.match(/^(?:level|lvl|cap|l)[\s\-_]*(\d+)$/i);
  if (match) {
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseMonthVal(val: any): number | null {
  const direct = parseFiniteNum(val);
  if (direct !== null) return direct;
  const s = strVal(val);
  if (!s) return null;
  const mMatch = s.match(/^(?:month|thang|m)[\s\-_]*(\d{1,2})$/i);
  if (mMatch) {
    const n = Number(mMatch[1]);
    return Number.isFinite(n) ? n : null;
  }
  const monthNames: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };
  return monthNames[s.toLowerCase()] ?? null;
}

function normalizeQuestionType(raw: string): string {
  const cleaned = raw.trim().toLowerCase().replace(/[\s\-\/]+/g, '_');
  if (['multiple_choice', 'mc', 'mcq', 'multi_choice', 'multiple'].includes(cleaned)) {
    return 'multiple_choice';
  }
  if (['single_choice', 'sc', 'single'].includes(cleaned)) {
    return 'single_choice';
  }
  if (['true_false', 'tf', 'boolean', 'bool', 'yes_no'].includes(cleaned)) {
    return 'true_false';
  }
  if (['numeric', 'number', 'num', 'calculation', 'calc'].includes(cleaned)) {
    return 'numeric';
  }
  return raw.trim().toLowerCase();
}

function parseBooleanVal(val: any): boolean | null {
  if (typeof val === 'boolean') return val;
  const s = strVal(val).toLowerCase();
  if (['true', '1', 'yes', 'y', 'mandatory', 'required', 'compulsory', 'bat_buoc', 'co'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'optional', 'elective', 'khong', 'tuy_chon'].includes(s)) return false;
  return null;
}

function parseIdList(val: any): string[] {
  if (Array.isArray(val)) {
    return val.map((v) => strVal(v)).filter(Boolean);
  }
  const s = strVal(val);
  if (!s) return [];
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => strVal(v)).filter(Boolean);
      }
    } catch {
      // fall through to delimiter split
    }
  }
  return s
    .split(/[,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIsoDate(val: any): string | null {
  if (val === undefined || val === null || String(val).trim() === '') return null;
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return `${val.getUTCFullYear()}-${String(val.getUTCMonth() + 1).padStart(2, '0')}-${String(
      val.getUTCDate()
    ).padStart(2, '0')}`;
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed && parsed.y >= 1900 && parsed.m >= 1 && parsed.m <= 12 && parsed.d >= 1 && parsed.d <= 31) {
      return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
    return null;
  }
  const s = strVal(val);
  const match = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:T.*)?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() + 1 !== month ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isValidFirestoreId(id: string): boolean {
  return id.length >= 1 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

function pruneUndefined<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== '') {
      clean[k] = v;
    } else if (typeof v === 'boolean' || typeof v === 'number' || Array.isArray(v)) {
      clean[k] = v;
    }
  }
  return clean as T;
}

export function detectWorkbookSheets(buffer: Buffer): {
  allSheets: string[];
  readmeDetected: boolean;
  businessSheets: SheetSpec[];
  unknownSheets: string[];
} {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const allSheets = wb.SheetNames || [];
  const readmeDetected = allSheets.some((name) => name.trim().toUpperCase() === README_SHEET_NAME);
  const specMap = new Map(IMPORT_ORDER_SPEC.map((s) => [s.sheetName.toLowerCase(), s]));
  const businessSheets: SheetSpec[] = [];
  const unknownSheets: string[] = [];

  for (const name of allSheets) {
    if (name.trim().toUpperCase() === README_SHEET_NAME) continue;
    const matched = specMap.get(name.trim().toLowerCase());
    if (matched) {
      businessSheets.push(matched);
    } else {
      unknownSheets.push(name);
    }
  }

  businessSheets.sort((a, b) => a.order - b.order);
  return { allSheets, readmeDetected, businessSheets, unknownSheets };
}

export function parseAndValidateWorkbook(params: {
  buffer: Buffer;
  fileName: string;
  selectedSheets?: string[];
  existingIdsByCollection?: Record<string, string[]>;
}): ParseValidateResult {
  const { buffer, fileName, selectedSheets, existingIdsByCollection = {} } = params;
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const detectedAll = wb.SheetNames || [];
  const readmeDetected = detectedAll.some((n) => n.trim().toUpperCase() === README_SHEET_NAME);

  const selectedSet = selectedSheets && selectedSheets.length > 0
    ? new Set(selectedSheets.map((s) => s.trim().toLowerCase()))
    : new Set(IMPORT_ORDER_SPEC.map((s) => s.sheetName.toLowerCase()));

  const ignoredSheets = detectedAll.filter((name) => {
    const lower = name.trim().toLowerCase();
    if (lower === 'readme') return true;
    const isKnown = IMPORT_ORDER_SPEC.some((s) => s.sheetName.toLowerCase() === lower);
    return !isKnown || !selectedSet.has(lower);
  });

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const sheetSummaries: SheetSummaryPreview[] = [];
  const sanitizedByCollection: Record<string, Record<string, any>[]> = {};

  const importBatchId = `batch_${Date.now()}`;
  const importedAt = new Date().toISOString();

  // Combined FK pools (existing Firestore/demo IDs + valid IDs & code-to-ID aliases parsed in dependency order)
  const knownIds: Record<string, Set<string>> = {};
  const codeToId: Record<string, Map<string, string>> = {};
  const resolvedDocsById: Record<string, Record<string, Record<string, any>>> = {};
  for (const spec of IMPORT_ORDER_SPEC) {
    knownIds[spec.collectionName] = new Set(existingIdsByCollection[spec.collectionName] || []);
    codeToId[spec.collectionName] = new Map();
    resolvedDocsById[spec.collectionName] = {};
  }

  const resolveFk = (collection: string, rawRef: string): string => {
    const trimmed = rawRef.trim();
    if (!trimmed) return '';
    if (knownIds[collection]?.has(trimmed)) return trimmed;
    const byCode = codeToId[collection]?.get(trimmed.toLowerCase());
    if (byCode && knownIds[collection]?.has(byCode)) return byCode;
    return trimmed;
  };

  const pushIssue = (issue: ValidationIssue) => {
    if (issue.severity === 'error') errors.push(issue);
    else warnings.push(issue);
  };

  let totalRowsDetected = 0;
  let validRecordsTotal = 0;
  let invalidRecordsTotal = 0;

  for (const spec of IMPORT_ORDER_SPEC) {
    const matchingSheetName = detectedAll.find(
      (n) => n.trim().toLowerCase() === spec.sheetName.toLowerCase()
    );
    if (!matchingSheetName || !selectedSet.has(spec.sheetName.toLowerCase())) {
      continue;
    }

    const ws = wb.Sheets[matchingSheetName];
    const { rawRows, detectedHeaders, normalizedHeaders, headerRowNumber } = extractSheetTable(
      ws,
      spec.sheetName
    );
    const existingSet = new Set(existingIdsByCollection[spec.collectionName] || []);

    const seenInSheet = new Map<string, number>();
    const validDocs: Record<string, any>[] = [];
    const previewRows: Record<string, any>[] = [];
    const invalidRowIndices = new Set<number>();
    const duplicateIds: string[] = [];
    let sheetErrors = 0;
    let sheetWarnings = 0;
    let newCount = 0;

    // Temporary structures for sheet-level / group-level weight validation
    const rowMetadata: Array<{ excelRow: number; doc: Record<string, any> | null; recordId: string }> = [];

    const addRowError = (excelRow: number, field: string, recordId: string, reason: string) => {
      invalidRowIndices.add(excelRow);
      sheetErrors++;
      pushIssue({
        sheet: spec.sheetName,
        collection: spec.collectionName,
        row: excelRow,
        field,
        recordId,
        severity: 'error',
        reason,
      });
    };

    const addRowWarning = (excelRow: number, field: string, recordId: string, reason: string) => {
      sheetWarnings++;
      pushIssue({
        sheet: spec.sheetName,
        collection: spec.collectionName,
        row: excelRow,
        field,
        recordId,
        severity: 'warning',
        reason,
      });
    };

    const idAliases = SHEET_ID_ALIASES[spec.sheetName] || ['id', 'record_id', 'doc_id'];
    const hasDedicatedViNameHeader = hasHeader(
      normalizedHeaders,
      'name_vi',
      'nameVi',
      'title_vi',
      'titleVi',
      'domain_name_vi',
      'level_name_vi',
      'competency_name_vi',
      'course_title_vi',
      'course_name_vi',
      'assignment_title_vi',
      'path_name_vi',
      'name_vietnamese',
      'ten_vi',
      'ten_tieng_viet',
      'ten_mien',
      'ten_cap_do',
      'ten_nang_luc',
      'ten_khoa_hoc',
      'ten_bai_tap',
      'ten_lo_trinh'
    );

    rawRows.forEach((rawRow, idx) => {
      const excelRow = typeof (rawRow as any).__excelRow === 'number' ? (rawRow as any).__excelRow : idx + 2;
      const row = normalizeRowKeys(rawRow);
      const id = strVal(pickField(row, ...idAliases));
      const rowErrCountBefore = sheetErrors;

      if (!id) {
        addRowError(excelRow, 'id', '(missing)', 'Required unique ID is empty.');
      } else if (!isValidFirestoreId(id)) {
        addRowError(
          excelRow,
          'id',
          id,
          'ID must be 1–128 characters containing only letters, numbers, underscores, or hyphens.'
        );
      } else if (seenInSheet.has(id)) {
        const firstRow = seenInSheet.get(id)!;
        addRowError(excelRow, 'id', id, `Duplicate ID "${id}" inside sheet (first seen at row ${firstRow}).`);
      } else {
        seenInSheet.set(id, excelRow);
        if (existingSet.has(id)) {
          duplicateIds.push(id);
          addRowWarning(
            excelRow,
            'id',
            id,
            `Record "${id}" already exists in ${spec.collectionName} (subject to duplicate policy).`
          );
        } else {
          newCount++;
        }
      }

      let candidateDoc: Record<string, any> | null = null;

      if (spec.sheetName === 'Competency_Domains') {
        const hasCodeCol = hasHeader(normalizedHeaders, 'code', 'domain_code', 'short_code', 'key');
        const code = hasCodeCol
          ? strVal(pickField(row, 'code', 'domain_code', 'short_code', 'key'))
          : id.slice(0, 32);
        const nameEn = strVal(
          pickField(
            row,
            'name_en',
            'nameEn',
            'domain_name_en',
            'title_en',
            'domain_en',
            'name_english',
            'domain_name_english',
            ...(hasDedicatedViNameHeader ? [] : ['name', 'domain_name', 'domain', 'title', 'competency_domain'])
          )
        );
        const rawNameVi = strVal(
          pickField(
            row,
            'name_vi',
            'nameVi',
            'domain_name_vi',
            'title_vi',
            'domain_vi',
            'name_vietnamese',
            'domain_name_vietnamese',
            'ten_tieng_viet',
            'ten_vi',
            'ten_mien'
          )
        );
        const nameVi = rawNameVi || (!hasDedicatedViNameHeader ? nameEn : '');
        const descriptionEn = strVal(pickField(row, 'description_en', 'descriptionEn', 'domain_description_en', 'desc_en', 'description'));
        const descriptionVi = strVal(pickField(row, 'description_vi', 'descriptionVi', 'domain_description_vi', 'desc_vi'));
        const weightPercent = parseFiniteNum(
          pickField(row, 'weight_percent', 'weightPercent', 'domain_weight_percent', 'weight_pct', 'weight', 'domain_weight', 'percentage', 'ty_trong', 'trong_so')
        );
        const hasSortCol = hasHeader(normalizedHeaders, 'sort_order', 'sortOrder', 'order', 'display_order', 'sequence', 'seq', 'sort', 'stt');
        const sortOrder = hasSortCol
          ? parseFiniteNum(pickField(row, 'sort_order', 'sortOrder', 'order', 'display_order', 'sequence', 'seq', 'sort', 'stt'))
          : idx + 1;

        if (!code) addRowError(excelRow, 'code', id, 'Required field "code" is empty.');
        if (!nameEn) addRowError(excelRow, 'name_en', id, 'Required field "name_en" is empty.');
        if (!nameVi) addRowError(excelRow, 'name_vi', id, 'Required field "name_vi" is empty.');
        if (weightPercent === null || weightPercent < 0 || weightPercent > 100) {
          addRowError(excelRow, 'weight_percent', id, 'weight_percent must be a number between 0 and 100.');
        }
        if (sortOrder === null || sortOrder < 0) {
          addRowError(excelRow, 'sort_order', id, 'sort_order must be a non-negative number.');
        }

        if (sheetErrors === rowErrCountBefore) {
          candidateDoc = pruneUndefined({
            id,
            code: code.slice(0, 32),
            nameEn: nameEn.slice(0, 200),
            nameVi: nameVi.slice(0, 200),
            descriptionEn: descriptionEn ? descriptionEn.slice(0, 1000) : undefined,
            descriptionVi: descriptionVi ? descriptionVi.slice(0, 1000) : undefined,
            weightPercent: weightPercent!,
            sortOrder: sortOrder!,
            importedAt,
            importBatchId,
          });
        }
      } else if (spec.sheetName === 'Proficiency_Levels') {
        const level = parseProficiencyLevel(
          pickField(row, 'level', 'proficiency_level', 'level_number', 'level_no', 'level_num', 'tier', 'grade', 'rank')
        );
        const hasCodeCol = hasHeader(normalizedHeaders, 'code', 'level_code', 'short_code');
        const rawCode = strVal(pickField(row, 'code', 'level_code', 'short_code'));
        const code = hasCodeCol ? rawCode : level !== null ? `L${level}` : id.slice(0, 32);
        const nameEn = strVal(
          pickField(
            row,
            'name_en',
            'nameEn',
            'level_name_en',
            'proficiency_name_en',
            'title_en',
            'name_english',
            ...(hasDedicatedViNameHeader ? [] : ['name', 'level_name', 'proficiency_name', 'title', 'label'])
          )
        );
        const rawNameVi = strVal(
          pickField(row, 'name_vi', 'nameVi', 'level_name_vi', 'proficiency_name_vi', 'title_vi', 'name_vietnamese', 'ten_vi', 'ten_cap_do')
        );
        const nameVi = rawNameVi || (!hasDedicatedViNameHeader ? nameEn : '');
        const descriptionEn = strVal(pickField(row, 'description_en', 'descriptionEn', 'behavioral_descriptor_en', 'desc_en', 'description', 'descriptor', 'summary'));
        const descriptionVi = strVal(pickField(row, 'description_vi', 'descriptionVi', 'behavioral_descriptor_vi', 'desc_vi'));
        const targetRole = strVal(pickField(row, 'target_role', 'targetRole', 'role', 'applicable_role', 'applicable_roles', 'job_role', 'target_roles'));

        if (level === null || !Number.isInteger(level) || level < 1 || level > 4) {
          addRowError(excelRow, 'level', id, 'Proficiency level must be an integer between 1 and 4.');
        }
        if (!code) addRowError(excelRow, 'code', id, 'Required field "code" is empty.');
        if (!nameEn) addRowError(excelRow, 'name_en', id, 'Required field "name_en" is empty.');
        if (!nameVi) addRowError(excelRow, 'name_vi', id, 'Required field "name_vi" is empty.');

        if (sheetErrors === rowErrCountBefore) {
          candidateDoc = pruneUndefined({
            id,
            level: level!,
            code: code.slice(0, 32),
            nameEn: nameEn.slice(0, 150),
            nameVi: nameVi.slice(0, 150),
            descriptionEn: descriptionEn ? descriptionEn.slice(0, 1000) : undefined,
            descriptionVi: descriptionVi ? descriptionVi.slice(0, 1000) : undefined,
            targetRole: targetRole ? targetRole.slice(0, 150) : undefined,
            importedAt,
            importBatchId,
          });
        }
      } else if (spec.sheetName === 'Competencies') {
        const hasCodeCol = hasHeader(normalizedHeaders, 'code', 'competency_code', 'comp_code');
        const code = hasCodeCol ? strVal(pickField(row, 'code', 'competency_code', 'comp_code')) : id.slice(0, 32);
        const rawDomainRef = strVal(pickField(row, 'domain_id', 'domainId', 'competency_domain_id', 'domain_code', 'domain'));
        const domainId = resolveFk('competencyDomains', rawDomainRef);
        const nameEn = strVal(
          pickField(
            row,
            'name_en',
            'nameEn',
            'competency_name_en',
            'title_en',
            'name_english',
            ...(hasDedicatedViNameHeader ? [] : ['name', 'competency_name', 'competency', 'title'])
          )
        );
        const rawNameVi = strVal(
          pickField(row, 'name_vi', 'nameVi', 'competency_name_vi', 'title_vi', 'name_vietnamese', 'ten_vi', 'ten_nang_luc')
        );
        const nameVi = rawNameVi || (!hasDedicatedViNameHeader ? nameEn : '');
        const definitionEn = strVal(pickField(row, 'definition_en', 'definitionEn', 'description_en', 'desc_en', 'definition', 'description'));
        const definitionVi = strVal(pickField(row, 'definition_vi', 'definitionVi', 'description_vi', 'desc_vi'));
        const targetLevel = parseProficiencyLevel(
          pickField(row, 'target_level', 'targetLevel', 'required_level', 'proficiency_level', 'level', 'target_proficiency_level', 'fc_target_level')
        );
        const rawWeight = pickField(row, 'weight_percent', 'weightPercent', 'weight_pct', 'weight', 'trong_so');
        const weightPercent = rawWeight !== undefined ? parseFiniteNum(rawWeight) : undefined;

        if (!code) addRowError(excelRow, 'code', id, 'Required field "code" is empty.');
        if (!domainId) {
          addRowError(excelRow, 'domain_id', id, 'Required foreign key "domain_id" is empty.');
        } else if (!knownIds.competencyDomains.has(domainId)) {
          addRowError(
            excelRow,
            'domain_id',
            id,
            `Foreign key domain_id "${rawDomainRef}" does not match any valid Competency_Domains record.`
          );
        }
        if (!nameEn) addRowError(excelRow, 'name_en', id, 'Required field "name_en" is empty.');
        if (!nameVi) addRowError(excelRow, 'name_vi', id, 'Required field "name_vi" is empty.');
        if (targetLevel === null || !Number.isInteger(targetLevel) || targetLevel < 1 || targetLevel > 4) {
          addRowError(excelRow, 'target_level', id, 'target_level must be an integer between 1 and 4.');
        }
        if (weightPercent !== undefined && (weightPercent === null || weightPercent < 0 || weightPercent > 100)) {
          addRowError(excelRow, 'weight_percent', id, 'weight_percent must be a number between 0 and 100.');
        }

        if (sheetErrors === rowErrCountBefore) {
          candidateDoc = pruneUndefined({
            id,
            code: code.slice(0, 32),
            domainId,
            nameEn: nameEn.slice(0, 250),
            nameVi: nameVi.slice(0, 250),
            definitionEn: definitionEn ? definitionEn.slice(0, 1500) : undefined,
            definitionVi: definitionVi ? definitionVi.slice(0, 1500) : undefined,
            targetLevel: targetLevel!,
            weightPercent: weightPercent ?? undefined,
            importedAt,
            importBatchId,
          });
        }
      } else if (spec.sheetName === 'Competency_Rubric') {
        const rawCompRef = strVal(pickField(row, 'competency_id', 'competencyId', 'comp_id', 'competency_code', 'competency'));
        const competencyId = resolveFk('competencies', rawCompRef);
        const proficiencyLevelId = resolveFk(
          'proficiencyLevels',
          strVal(pickField(row, 'proficiency_level_id', 'proficiencyLevelId', 'level_id'))
        );
        const hasLevelCol = hasHeader(normalizedHeaders, 'proficiency_level', 'proficiencyLevel', 'level', 'level_number', 'proficiency_level_number', 'tier');
        const levelDoc = proficiencyLevelId ? resolvedDocsById.proficiencyLevels[proficiencyLevelId] : undefined;
        const parsedLevel = parseProficiencyLevel(
          pickField(row, 'proficiency_level', 'proficiencyLevel', 'level', 'level_number', 'proficiency_level_number', 'tier')
        );
        const proficiencyLevel = parsedLevel !== null ? parsedLevel : !hasLevelCol && levelDoc ? Number(levelDoc.level) : null;

        const hasCriteriaViHeader = hasHeader(
          normalizedHeaders,
          'criteria_vi',
          'criteriaVi',
          'rubric_criteria_vi',
          'behavioral_criteria_vi',
          'indicator_vi',
          'observable_behavior_vi',
          'description_vi',
          'descriptor_vi',
          'tieu_chi_vi'
        );
        const criteriaEn = strVal(
          pickField(
            row,
            'criteria_en',
            'criteriaEn',
            'rubric_criteria_en',
            'behavioral_criteria_en',
            'indicator_en',
            'observable_behavior_en',
            'description_en',
            'descriptor_en',
            ...(hasCriteriaViHeader
              ? []
              : ['criteria', 'rubric_criteria', 'behavioral_criteria', 'indicator', 'behavioral_indicator', 'descriptor', 'description'])
          )
        );
        const rawCriteriaVi = strVal(
          pickField(
            row,
            'criteria_vi',
            'criteriaVi',
            'rubric_criteria_vi',
            'behavioral_criteria_vi',
            'indicator_vi',
            'observable_behavior_vi',
            'description_vi',
            'descriptor_vi',
            'tieu_chi_vi'
          )
        );
        const criteriaVi = rawCriteriaVi || (!hasCriteriaViHeader ? criteriaEn : '');
        const observableBehavior = strVal(pickField(row, 'observable_behavior', 'observableBehavior', 'observable_behaviors', 'behavior', 'behavioral_evidence', 'examples'));
        const evidenceRequired = strVal(pickField(row, 'evidence_required', 'evidenceRequired', 'evidence', 'required_evidence', 'proof_required'));

        const hasWeightCol = hasHeader(normalizedHeaders, 'assessment_weight', 'assessmentWeight', 'assessment_weight_percent', 'weight_percent', 'weight_pct', 'weight');
        const assessmentWeight = hasWeightCol
          ? parseFiniteNum(pickField(row, 'assessment_weight', 'assessmentWeight', 'assessment_weight_percent', 'weight_percent', 'weight_pct', 'weight'))
          : 25; // Even placeholder; re-balanced per competency group below if column omitted

        if (!competencyId) {
          addRowError(excelRow, 'competency_id', id, 'Required foreign key "competency_id" is empty.');
        } else if (!knownIds.competencies.has(competencyId)) {
          addRowError(
            excelRow,
            'competency_id',
            id,
            `Foreign key competency_id "${rawCompRef}" does not match any valid Competencies record.`
          );
        }
        if (
          proficiencyLevel === null ||
          !Number.isInteger(proficiencyLevel) ||
          proficiencyLevel < 1 ||
          proficiencyLevel > 4
        ) {
          addRowError(excelRow, 'proficiency_level', id, 'proficiency_level must be an integer between 1 and 4.');
        }
        if (
          proficiencyLevelId &&
          knownIds.proficiencyLevels.size > 0 &&
          !knownIds.proficiencyLevels.has(proficiencyLevelId)
        ) {
          addRowError(
            excelRow,
            'proficiency_level_id',
            id,
            `Foreign key proficiency_level_id "${proficiencyLevelId}" does not exist in Proficiency_Levels.`
          );
        }
        if (!criteriaEn) addRowError(excelRow, 'criteria_en', id, 'Required field "criteria_en" is empty.');
        if (!criteriaVi) addRowError(excelRow, 'criteria_vi', id, 'Required field "criteria_vi" is empty.');
        if (assessmentWeight === null || assessmentWeight < 0 || assessmentWeight > 100) {
          addRowError(
            excelRow,
            'assessment_weight',
            id,
            'assessment_weight must be a valid number between 0 and 100.'
          );
        }

        if (sheetErrors === rowErrCountBefore) {
          candidateDoc = pruneUndefined({
            id,
            competencyId,
            proficiencyLevel: proficiencyLevel!,
            proficiencyLevelId: proficiencyLevelId || undefined,
            criteriaEn: criteriaEn.slice(0, 1500),
            criteriaVi: criteriaVi.slice(0, 1500),
            observableBehavior: observableBehavior ? observableBehavior.slice(0, 1000) : undefined,
            evidenceRequired: evidenceRequired ? evidenceRequired.slice(0, 500) : undefined,
            assessmentWeight: assessmentWeight!,
            _autoRubricWeight: !hasWeightCol,
            importedAt,
            importBatchId,
          });
        }
      } else if (spec.sheetName === 'Course_Catalog') {
        const hasCodeCol = hasHeader(normalizedHeaders, 'code', 'course_code', 'crs_code');
        const code = hasCodeCol ? strVal(pickField(row, 'code', 'course_code', 'crs_code')) : id.slice(0, 32);
        const rawCompRef = strVal(pickField(row, 'competency_id', 'competencyId', 'comp_id', 'competency_code', 'competency'));
        const competencyId = resolveFk('competencies', rawCompRef);

        const hasDomainCol = hasHeader(normalizedHeaders, 'domain_id', 'domainId', 'competency_domain_id', 'domain_code', 'domain');
        const rawDomainRef = strVal(pickField(row, 'domain_id', 'domainId', 'competency_domain_id', 'domain_code', 'domain'));
        const inferredDomainId = !hasDomainCol && competencyId ? resolvedDocsById.competencies[competencyId]?.domainId || '' : '';
        const domainId = rawDomainRef ? resolveFk('competencyDomains', rawDomainRef) : inferredDomainId;

        const titleEn = strVal(
          pickField(
            row,
            'title_en',
            'titleEn',
            'course_title_en',
            'name_en',
            'course_name_en',
            ...(hasDedicatedViNameHeader ? [] : ['title', 'course_title', 'name', 'course_name', 'course'])
          )
        );
        const rawTitleVi = strVal(
          pickField(row, 'title_vi', 'titleVi', 'course_title_vi', 'name_vi', 'course_name_vi', 'ten_khoa_hoc', 'ten_vi')
        );
        const titleVi = rawTitleVi || (!hasDedicatedViNameHeader ? titleEn : '');
        const descriptionEn = strVal(pickField(row, 'description_en', 'descriptionEn', 'course_description_en', 'summary_en', 'description', 'overview'));
        const descriptionVi = strVal(pickField(row, 'description_vi', 'descriptionVi', 'course_description_vi', 'summary_vi'));
        const targetLevel = parseProficiencyLevel(
          pickField(row, 'target_level', 'targetLevel', 'proficiency_level', 'level', 'target_proficiency_level')
        );
        const durationHours = parseFiniteNum(
          pickField(row, 'duration_hours', 'durationHours', 'duration', 'hours', 'duration_hrs', 'credit_hours', 'est_hours')
        );
        const hasPassingCol = hasHeader(normalizedHeaders, 'passing_score', 'passingScore', 'passing_score_percent', 'pass_score', 'pass_mark', 'passing_mark', 'min_score', 'min_passing_score');
        const passingScore = hasPassingCol
          ? parseFiniteNum(
              pickField(row, 'passing_score', 'passingScore', 'passing_score_percent', 'pass_score', 'pass_mark', 'passing_mark', 'min_score', 'min_passing_score')
            )
          : 80;

        const hasQuizWeightCol = hasHeader(normalizedHeaders, 'assessment_weight_quiz', 'assessmentWeightQuiz', 'assessment_weight_quiz_percent', 'quiz_weight', 'quiz_weight_percent', 'quiz_percent', 'theory_weight');
        const hasPracticalWeightCol = hasHeader(normalizedHeaders, 'assessment_weight_practical', 'assessmentWeightPractical', 'assessment_weight_practical_percent', 'practical_weight', 'practical_weight_percent', 'practical_percent', 'ojt_weight');

        let assessmentWeightQuiz = hasQuizWeightCol
          ? parseFiniteNum(
              pickField(row, 'assessment_weight_quiz', 'assessmentWeightQuiz', 'assessment_weight_quiz_percent', 'quiz_weight', 'quiz_weight_percent', 'quiz_percent', 'theory_weight')
            )
          : null;
        let assessmentWeightPractical = hasPracticalWeightCol
          ? parseFiniteNum(
              pickField(row, 'assessment_weight_practical', 'assessmentWeightPractical', 'assessment_weight_practical_percent', 'practical_weight', 'practical_weight_percent', 'practical_percent', 'ojt_weight')
            )
          : null;

        if (!hasQuizWeightCol && !hasPracticalWeightCol) {
          assessmentWeightQuiz = 40;
          assessmentWeightPractical = 60;
        } else if (hasQuizWeightCol && !hasPracticalWeightCol && assessmentWeightQuiz !== null && assessmentWeightQuiz >= 0 && assessmentWeightQuiz <= 100) {
          assessmentWeightPractical = Number((100 - assessmentWeightQuiz).toFixed(2));
        } else if (!hasQuizWeightCol && hasPracticalWeightCol && assessmentWeightPractical !== null && assessmentWeightPractical >= 0 && assessmentWeightPractical <= 100) {
          assessmentWeightQuiz = Number((100 - assessmentWeightPractical).toFixed(2));
        } else if (
          assessmentWeightQuiz !== null &&
          assessmentWeightPractical !== null &&
          assessmentWeightQuiz >= 0 &&
          assessmentWeightPractical >= 0 &&
          assessmentWeightQuiz <= 1 &&
          assessmentWeightPractical <= 1 &&
          Math.abs(assessmentWeightQuiz + assessmentWeightPractical - 1) <= 0.01
        ) {
          assessmentWeightQuiz = Math.round(assessmentWeightQuiz * 100 * 100) / 100;
          assessmentWeightPractical = Math.round(assessmentWeightPractical * 100 * 100) / 100;
        }

        const deliveryMode = strVal(pickField(row, 'delivery_mode', 'deliveryMode', 'delivery_format', 'format', 'mode', 'modality'));

        if (!code) addRowError(excelRow, 'code', id, 'Required field "code" is empty.');
        if (!domainId) {
          addRowError(excelRow, 'domain_id', id, 'Required foreign key "domain_id" is empty.');
        } else if (!knownIds.competencyDomains.has(domainId)) {
          addRowError(
            excelRow,
            'domain_id',
            id,
            `Foreign key domain_id "${rawDomainRef || domainId}" does not match any valid Competency_Domains record.`
          );
        }
        if (!competencyId) {
          addRowError(excelRow, 'competency_id', id, 'Required foreign key "competency_id" is empty.');
        } else if (!knownIds.competencies.has(competencyId)) {
          addRowError(
            excelRow,
            'competency_id',
            id,
            `Foreign key competency_id "${rawCompRef}" does not match any valid Competencies record.`
          );
        }
        if (!titleEn) addRowError(excelRow, 'title_en', id, 'Required field "title_en" is empty.');
        if (!titleVi) addRowError(excelRow, 'title_vi', id, 'Required field "title_vi" is empty.');
        if (targetLevel === null || !Number.isInteger(targetLevel) || targetLevel < 1 || targetLevel > 4) {
          addRowError(excelRow, 'target_level', id, 'target_level must be an integer between 1 and 4.');
        }
        if (durationHours === null || durationHours <= 0) {
          addRowError(excelRow, 'duration_hours', id, 'Course duration_hours must be a positive number (> 0).');
        }
        if (passingScore === null || passingScore < 0 || passingScore > 100) {
          addRowError(excelRow, 'passing_score', id, 'passing_score must be a number between 0 and 100.');
        }
        if (assessmentWeightQuiz === null || assessmentWeightQuiz < 0 || assessmentWeightQuiz > 100) {
          addRowError(
            excelRow,
            'assessment_weight_quiz',
            id,
            'assessment_weight_quiz must be a number between 0 and 100.'
          );
        }
        if (assessmentWeightPractical === null || assessmentWeightPractical < 0 || assessmentWeightPractical > 100) {
          addRowError(
            excelRow,
            'assessment_weight_practical',
            id,
            'assessment_weight_practical must be a number between 0 and 100.'
          );
        }
        if (
          assessmentWeightQuiz !== null &&
          assessmentWeightPractical !== null &&
          Math.abs(assessmentWeightQuiz + assessmentWeightPractical - 100) > 0.01
        ) {
          addRowError(
            excelRow,
            'assessment_weight_quiz',
            id,
            `Assessment weights must total 100% (quiz ${assessmentWeightQuiz}% + practical ${assessmentWeightPractical}% = ${
              assessmentWeightQuiz + assessmentWeightPractical
            }%).`
          );
        }

        if (sheetErrors === rowErrCountBefore) {
          candidateDoc = pruneUndefined({
            id,
            code: code.slice(0, 32),
            domainId,
            competencyId,
            titleEn: titleEn.slice(0, 250),
            titleVi: titleVi.slice(0, 250),
            descriptionEn: descriptionEn ? descriptionEn.slice(0, 2000) : undefined,
            descriptionVi: descriptionVi ? descriptionVi.slice(0, 2000) : undefined,
            targetLevel: targetLevel!,
            durationHours: durationHours!,
            passingScore: passingScore!,
            assessmentWeightQuiz: assessmentWeightQuiz!,
            assessmentWeightPractical: assessmentWeightPractical!,
            deliveryMode: deliveryMode ? deliveryMode.slice(0, 100) : undefined,
            importedAt,
            importBatchId,
          });
        }
      } else if (spec.sheetName === 'Question_Bank') {
        const rawCourseRef = strVal(pickField(row, 'course_id', 'courseId', 'course_code', 'course'));
        const courseId = resolveFk('courses', rawCourseRef);
        const hasCompCol = hasHeader(normalizedHeaders, 'competency_id', 'competencyId', 'comp_id', 'competency_code', 'competency');
        const rawCompRef = strVal(pickField(row, 'competency_id', 'competencyId', 'comp_id', 'competency_code', 'competency'));
        const inferredCompId = !hasCompCol && courseId ? resolvedDocsById.courses[courseId]?.competencyId || '' : '';
        const competencyId = rawCompRef ? resolveFk('competencies', rawCompRef) : inferredCompId;

        const rawTypeInput = strVal(pickField(row, 'question_type', 'questionType', 'type', 'q_type', 'format'));
        const rawType = normalizeQuestionType(rawTypeInput);

        const hasQTextViHeader = hasHeader(normalizedHeaders, 'question_text_vi', 'questionTextVi', 'question_vi', 'prompt_vi', 'stem_vi', 'text_vi', 'cau_hoi');
        const questionTextEn = strVal(
          pickField(
            row,
            'question_text_en',
            'questionTextEn',
            'question_en',
            'prompt_en',
            'stem_en',
            'text_en',
            ...(hasQTextViHeader ? [] : ['question_text', 'question', 'prompt', 'stem'])
          )
        );
        const rawQTextVi = strVal(
          pickField(row, 'question_text_vi', 'questionTextVi', 'question_vi', 'prompt_vi', 'stem_vi', 'text_vi', 'cau_hoi')
        );
        const questionTextVi = rawQTextVi || (!hasQTextViHeader ? questionTextEn : '');
        const optionA = strVal(pickField(row, 'option_a', 'optionA', 'opt_a', 'choice_a', 'a'));
        const optionB = strVal(pickField(row, 'option_b', 'optionB', 'opt_b', 'choice_b', 'b'));
        const optionC = strVal(pickField(row, 'option_c', 'optionC', 'opt_c', 'choice_c', 'c'));
        const optionD = strVal(pickField(row, 'option_d', 'optionD', 'opt_d', 'choice_d', 'd'));
        const rawCorrectAnswer = strVal(pickField(row, 'correct_answer', 'correctAnswer', 'answer', 'key', 'correct_option'));
        const explanationEn = strVal(pickField(row, 'explanation_en', 'explanationEn', 'rationale_en', 'explanation', 'rationale'));
        const explanationVi = strVal(pickField(row, 'explanation_vi', 'explanationVi', 'rationale_vi'));

        const hasLevelCol = hasHeader(normalizedHeaders, 'proficiency_level', 'proficiencyLevel', 'level', 'difficulty_level', 'target_level');
        const parsedQLevel = parseProficiencyLevel(
          pickField(row, 'proficiency_level', 'proficiencyLevel', 'level', 'difficulty_level', 'target_level')
        );
        const proficiencyLevel =
          parsedQLevel !== null
            ? parsedQLevel
            : !hasLevelCol && courseId && resolvedDocsById.courses[courseId]
            ? Number(resolvedDocsById.courses[courseId].targetLevel) || 2
            : null;

        const hasPointsCol = hasHeader(normalizedHeaders, 'points', 'score', 'marks', 'max_points');
        const points = hasPointsCol
          ? parseFiniteNum(pickField(row, 'points', 'score', 'marks', 'max_points'))
          : 1;

        const supportedTypes = ['multiple_choice', 'single_choice', 'numeric', 'true_false'];
        if (!courseId) {
          addRowError(excelRow, 'course_id', id, 'Required foreign key "course_id" is empty.');
        } else if (!knownIds.courses.has(courseId)) {
          addRowError(
            excelRow,
            'course_id',
            id,
            `Foreign key course_id "${rawCourseRef}" does not match any valid Course_Catalog record.`
          );
        }
        if (!competencyId) {
          addRowError(excelRow, 'competency_id', id, 'Required foreign key "competency_id" is empty.');
        } else if (!knownIds.competencies.has(competencyId)) {
          addRowError(
            excelRow,
            'competency_id',
            id,
            `Foreign key competency_id "${rawCompRef || competencyId}" does not match any valid Competencies record.`
          );
        }
        if (!supportedTypes.includes(rawType)) {
          addRowError(
            excelRow,
            'question_type',
            id,
            `Unsupported question_type "${rawTypeInput || rawType}". Supported: multiple_choice, single_choice, numeric, true_false.`
          );
        }
        if (!questionTextEn) addRowError(excelRow, 'question_text_en', id, 'Required field "question_text_en" is empty.');
        if (!questionTextVi) addRowError(excelRow, 'question_text_vi', id, 'Required field "question_text_vi" is empty.');

        let normalizedAnswer = rawCorrectAnswer;
        if (!rawCorrectAnswer) {
          addRowError(excelRow, 'correct_answer', id, 'Required field "correct_answer" is empty.');
        } else if (rawType === 'multiple_choice' || rawType === 'single_choice') {
          const upper = rawCorrectAnswer.toUpperCase();
          if (!['A', 'B', 'C', 'D'].includes(upper)) {
            addRowError(
              excelRow,
              'correct_answer',
              id,
              `For ${rawType}, correct_answer must strictly be A, B, C, or D (found "${rawCorrectAnswer}").`
            );
          } else {
            const optMap: Record<string, string> = { A: optionA, B: optionB, C: optionC, D: optionD };
            if (!optMap[upper]) {
              addRowError(
                excelRow,
                `option_${upper.toLowerCase()}`,
                id,
                `Selected correct_answer "${upper}" references an empty option_${upper.toLowerCase()}.`
              );
            }
            normalizedAnswer = upper;
          }
        } else if (rawType === 'numeric') {
          const numAns = parseFiniteNum(rawCorrectAnswer);
          if (numAns === null) {
            addRowError(
              excelRow,
              'correct_answer',
              id,
              `For numeric question type, correct_answer must be a valid finite number (found "${rawCorrectAnswer}").`
            );
          } else {
            normalizedAnswer = String(numAns);
          }
        } else if (rawType === 'true_false') {
          const tf = parseBooleanVal(rawCorrectAnswer);
          if (tf === null) {
            addRowError(
              excelRow,
              'correct_answer',
              id,
              `For true_false question type, correct_answer must be TRUE or FALSE (found "${rawCorrectAnswer}").`
            );
          } else {
            normalizedAnswer = tf ? 'TRUE' : 'FALSE';
          }
        }

        if (
          proficiencyLevel === null ||
          !Number.isInteger(proficiencyLevel) ||
          proficiencyLevel < 1 ||
          proficiencyLevel > 4
        ) {
          addRowError(excelRow, 'proficiency_level', id, 'proficiency_level must be an integer between 1 and 4.');
        }
        if (points === null || points <= 0) {
          addRowError(excelRow, 'points', id, 'points must be a positive number (> 0).');
        }

        if (sheetErrors === rowErrCountBefore) {
          candidateDoc = pruneUndefined({
            id,
            courseId,
            competencyId,
            questionType: rawType,
            questionTextEn: questionTextEn.slice(0, 2000),
            questionTextVi: questionTextVi.slice(0, 2000),
            optionA: optionA ? optionA.slice(0, 500) : undefined,
            optionB: optionB ? optionB.slice(0, 500) : undefined,
            optionC: optionC ? optionC.slice(0, 500) : undefined,
            optionD: optionD ? optionD.slice(0, 500) : undefined,
            correctAnswer: normalizedAnswer.slice(0, 200),
            explanationEn: explanationEn ? explanationEn.slice(0, 2000) : undefined,
            explanationVi: explanationVi ? explanationVi.slice(0, 2000) : undefined,
            proficiencyLevel: proficiencyLevel!,
            points: points!,
            importedAt,
            importBatchId,
          });
        }
      } else if (spec.sheetName === 'Practical_Assignments') {
        const hasCodeCol = hasHeader(normalizedHeaders, 'code', 'assignment_code', 'practical_code', 'ojt_code');
        const code = hasCodeCol
          ? strVal(pickField(row, 'code', 'assignment_code', 'practical_code', 'ojt_code'))
          : id.slice(0, 32);
        const rawCourseRef = strVal(pickField(row, 'course_id', 'courseId', 'course_code', 'course'));
        const courseId = resolveFk('courses', rawCourseRef);

        const hasCompCol = hasHeader(normalizedHeaders, 'competency_id', 'competencyId', 'comp_id', 'competency_code', 'competency');
        const rawCompRef = strVal(pickField(row, 'competency_id', 'competencyId', 'comp_id', 'competency_code', 'competency'));
        const inferredCompId = !hasCompCol && courseId ? resolvedDocsById.courses[courseId]?.competencyId || '' : '';
        const competencyId = rawCompRef ? resolveFk('competencies', rawCompRef) : inferredCompId;

        const titleEn = strVal(
          pickField(
            row,
            'title_en',
            'titleEn',
            'assignment_title_en',
            'name_en',
            ...(hasDedicatedViNameHeader ? [] : ['title', 'assignment_title', 'name', 'assignment_name'])
          )
        );
        const rawTitleVi = strVal(
          pickField(row, 'title_vi', 'titleVi', 'assignment_title_vi', 'name_vi', 'ten_bai_tap', 'ten_vi')
        );
        const titleVi = rawTitleVi || (!hasDedicatedViNameHeader ? titleEn : '');
        const scenarioEn = strVal(pickField(row, 'scenario_en', 'scenarioEn', 'case_study_en', 'description_en', 'scenario', 'description', 'brief'));
        const scenarioVi = strVal(pickField(row, 'scenario_vi', 'scenarioVi', 'case_study_vi', 'description_vi'));
        const deliverables = strVal(pickField(row, 'deliverables', 'deliverable', 'expected_output', 'submission_requirements'));
        const hasMaxCol = hasHeader(normalizedHeaders, 'max_score', 'maxScore', 'maximum_score', 'total_score', 'full_score', 'points');
        const maxScore = hasMaxCol
          ? parseFiniteNum(pickField(row, 'max_score', 'maxScore', 'maximum_score', 'total_score', 'full_score', 'points'))
          : 100;
        const hasPassCol = hasHeader(normalizedHeaders, 'passing_score', 'passingScore', 'pass_score', 'min_passing_score', 'min_score');
        const passingScore = hasPassCol
          ? parseFiniteNum(pickField(row, 'passing_score', 'passingScore', 'pass_score', 'min_passing_score', 'min_score'))
          : 80;
        const rawWeight = pickField(row, 'weight_percent', 'weightPercent', 'weight_pct', 'weight');
        const weightPercent = rawWeight !== undefined ? parseFiniteNum(rawWeight) : undefined;
        const rawDue = pickField(row, 'due_date_days', 'dueDateDays', 'due_days', 'deadline_days', 'duration_days');
        const dueDateDays = rawDue !== undefined ? parseFiniteNum(rawDue) : undefined;

        if (!code) addRowError(excelRow, 'code', id, 'Required field "code" is empty.');
        if (!courseId) {
          addRowError(excelRow, 'course_id', id, 'Required foreign key "course_id" is empty.');
        } else if (!knownIds.courses.has(courseId)) {
          addRowError(
            excelRow,
            'course_id',
            id,
            `Foreign key course_id "${rawCourseRef}" does not match any valid Course_Catalog record.`
          );
        }
        if (!competencyId) {
          addRowError(excelRow, 'competency_id', id, 'Required foreign key "competency_id" is empty.');
        } else if (!knownIds.competencies.has(competencyId)) {
          addRowError(
            excelRow,
            'competency_id',
            id,
            `Foreign key competency_id "${rawCompRef || competencyId}" does not match any valid Competencies record.`
          );
        }
        if (!titleEn) addRowError(excelRow, 'title_en', id, 'Required field "title_en" is empty.');
        if (!titleVi) addRowError(excelRow, 'title_vi', id, 'Required field "title_vi" is empty.');
        if (maxScore === null || maxScore <= 0) {
          addRowError(excelRow, 'max_score', id, 'max_score must be a positive number.');
        }
        if (passingScore === null || passingScore < 0 || (maxScore !== null && passingScore > maxScore)) {
          addRowError(excelRow, 'passing_score', id, 'passing_score must be between 0 and max_score.');
        }
        if (weightPercent !== undefined && (weightPercent === null || weightPercent < 0 || weightPercent > 100)) {
          addRowError(excelRow, 'weight_percent', id, 'weight_percent must be between 0 and 100.');
        }
        if (dueDateDays !== undefined && (dueDateDays === null || dueDateDays <= 0)) {
          addRowError(excelRow, 'due_date_days', id, 'due_date_days must be a positive number.');
        }

        if (sheetErrors === rowErrCountBefore) {
          candidateDoc = pruneUndefined({
            id,
            code: code.slice(0, 32),
            courseId,
            competencyId,
            titleEn: titleEn.slice(0, 250),
            titleVi: titleVi.slice(0, 250),
            scenarioEn: scenarioEn ? scenarioEn.slice(0, 2500) : undefined,
            scenarioVi: scenarioVi ? scenarioVi.slice(0, 2500) : undefined,
            deliverables: deliverables ? deliverables.slice(0, 1500) : undefined,
            maxScore: maxScore!,
            passingScore: passingScore!,
            weightPercent: weightPercent ?? undefined,
            dueDateDays: dueDateDays ?? undefined,
            importedAt,
            importBatchId,
          });
        }
      } else if (spec.sheetName === 'Training_Matrix_2027') {
        const rawDate = pickField(row, 'target_date', 'targetDate', 'scheduled_date', 'date', 'due_date', 'session_date', 'planned_date');
        const targetDate = parseIsoDate(rawDate);
        const hasMonthCol = hasHeader(normalizedHeaders, 'month', 'month_number', 'month_no');
        const parsedMonth = parseMonthVal(pickField(row, 'month', 'month_number', 'month_no'));
        const month = parsedMonth !== null ? parsedMonth : !hasMonthCol && targetDate ? Number(targetDate.slice(5, 7)) : null;

        const targetRole = strVal(pickField(row, 'target_role', 'targetRole', 'role', 'audience', 'target_audience', 'participants'));
        const rawCourseRef = strVal(pickField(row, 'course_id', 'courseId', 'course_code', 'course'));
        const courseId = resolveFk('courses', rawCourseRef);

        const hasDomainCol = hasHeader(normalizedHeaders, 'domain_id', 'domainId', 'domain_code', 'domain');
        const rawDomainRef = strVal(pickField(row, 'domain_id', 'domainId', 'domain_code', 'domain'));
        const domainId = rawDomainRef
          ? resolveFk('competencyDomains', rawDomainRef)
          : !hasDomainCol && courseId
          ? resolvedDocsById.courses[courseId]?.domainId || ''
          : '';

        const hasCompCol = hasHeader(normalizedHeaders, 'competency_id', 'competencyId', 'comp_id', 'competency_code', 'competency');
        const rawCompRef = strVal(pickField(row, 'competency_id', 'competencyId', 'comp_id', 'competency_code', 'competency'));
        const competencyId = rawCompRef
          ? resolveFk('competencies', rawCompRef)
          : !hasCompCol && courseId
          ? resolvedDocsById.courses[courseId]?.competencyId || ''
          : '';

        const deliveryFormat = strVal(pickField(row, 'delivery_format', 'deliveryFormat', 'delivery_mode', 'format', 'mode'));
        const hasMandatoryCol = hasHeader(normalizedHeaders, 'mandatory', 'is_mandatory', 'required', 'is_required', 'compulsory');
        const mandatory = hasMandatoryCol
          ? parseBooleanVal(pickField(row, 'mandatory', 'is_mandatory', 'required', 'is_required', 'compulsory'))
          : true;
        const rawCohort = pickField(row, 'cohort_size', 'cohortSize', 'target_participants', 'headcount', 'participants_count');
        const cohortSize = rawCohort !== undefined ? parseFiniteNum(rawCohort) : undefined;
        const rawWeight = pickField(row, 'assessment_weight', 'assessmentWeight', 'weight_percent', 'weight');
        const assessmentWeight = rawWeight !== undefined ? parseFiniteNum(rawWeight) : undefined;

        if (month === null || !Number.isInteger(month) || month < 1 || month > 12) {
          addRowError(excelRow, 'month', id, 'month must be an integer between 1 and 12.');
        }
        if (!targetDate) {
          addRowError(
            excelRow,
            'target_date',
            id,
            `Invalid target_date "${strVal(rawDate)}". Must be formatted YYYY-MM-DD.`
          );
        }
        if (!targetRole) addRowError(excelRow, 'target_role', id, 'Required field "target_role" is empty.');
        if (!domainId || !knownIds.competencyDomains.has(domainId)) {
          addRowError(
            excelRow,
            'domain_id',
            id,
            `Foreign key domain_id "${rawDomainRef || domainId || '(empty)'}" does not match Competency_Domains.`
          );
        }
        if (!courseId || !knownIds.courses.has(courseId)) {
          addRowError(
            excelRow,
            'course_id',
            id,
            `Foreign key course_id "${rawCourseRef || '(empty)'}" does not match Course_Catalog.`
          );
        }
        if (!competencyId || !knownIds.competencies.has(competencyId)) {
          addRowError(
            excelRow,
            'competency_id',
            id,
            `Foreign key competency_id "${rawCompRef || competencyId || '(empty)'}" does not match Competencies.`
          );
        }
        if (mandatory === null) {
          addRowError(excelRow, 'mandatory', id, 'mandatory must be a boolean (true/false).');
        }
        if (cohortSize !== undefined && (cohortSize === null || cohortSize < 0)) {
          addRowError(excelRow, 'cohort_size', id, 'cohort_size must be a non-negative number.');
        }
        if (assessmentWeight !== undefined && (assessmentWeight === null || assessmentWeight < 0 || assessmentWeight > 100)) {
          addRowError(excelRow, 'assessment_weight', id, 'assessment_weight must be between 0 and 100.');
        }

        if (sheetErrors === rowErrCountBefore) {
          candidateDoc = pruneUndefined({
            id,
            month: month!,
            targetDate: targetDate!,
            targetRole: targetRole.slice(0, 150),
            domainId,
            courseId,
            competencyId,
            deliveryFormat: deliveryFormat ? deliveryFormat.slice(0, 100) : undefined,
            mandatory: mandatory!,
            cohortSize: cohortSize ?? undefined,
            assessmentWeight: assessmentWeight ?? undefined,
            importedAt,
            importBatchId,
          });
        }
      } else if (spec.sheetName === 'Career_Paths') {
        const hasCodeCol = hasHeader(normalizedHeaders, 'code', 'path_code', 'career_path_code');
        const code = hasCodeCol ? strVal(pickField(row, 'code', 'path_code', 'career_path_code')) : id.slice(0, 64);
        const nameEn = strVal(
          pickField(
            row,
            'name_en',
            'nameEn',
            'path_name_en',
            'title_en',
            ...(hasDedicatedViNameHeader ? [] : ['name', 'path_name', 'title', 'career_path'])
          )
        );
        const rawNameVi = strVal(
          pickField(row, 'name_vi', 'nameVi', 'path_name_vi', 'title_vi', 'ten_lo_trinh', 'ten_vi')
        );
        const nameVi = rawNameVi || (!hasDedicatedViNameHeader ? nameEn : '');
        const fromRole = strVal(pickField(row, 'from_role', 'fromRole', 'current_role', 'starting_role', 'source_role'));
        const toRole = strVal(pickField(row, 'to_role', 'toRole', 'target_role', 'destination_role', 'next_role'));
        const targetLevel = parseProficiencyLevel(
          pickField(row, 'target_level', 'targetLevel', 'required_level', 'proficiency_level', 'level')
        );
        const durationMonths = parseFiniteNum(
          pickField(row, 'duration_months', 'durationMonths', 'duration', 'months', 'duration_mths', 'timeline_months')
        );
        const requiredCourseIds = parseIdList(
          pickField(row, 'required_course_ids', 'requiredCourseIds', 'required_courses', 'course_ids', 'courses')
        ).map((cid) => resolveFk('courses', cid));
        const requiredCompetencyIds = parseIdList(
          pickField(
            row,
            'required_competency_ids',
            'requiredCompetencyIds',
            'required_competencies',
            'competency_ids',
            'competencies'
          )
        ).map((cid) => resolveFk('competencies', cid));
        const requiredPracticalIds = parseIdList(
          pickField(
            row,
            'required_practical_ids',
            'requiredPracticalIds',
            'required_practicals',
            'practical_ids',
            'practical_assignment_ids',
            'required_assignments'
          )
        ).map((pid) => resolveFk('practicalAssignments', pid));
        const minAssessmentScore = parseFiniteNum(
          pickField(row, 'min_assessment_score', 'minAssessmentScore', 'min_score', 'passing_score', 'required_score', 'min_pass_score')
        );

        if (!code) addRowError(excelRow, 'code', id, 'Required field "code" is empty.');
        if (!nameEn) addRowError(excelRow, 'name_en', id, 'Required field "name_en" is empty.');
        if (!nameVi) addRowError(excelRow, 'name_vi', id, 'Required field "name_vi" is empty.');
        if (!fromRole) addRowError(excelRow, 'from_role', id, 'Required field "from_role" is empty.');
        if (!toRole) addRowError(excelRow, 'to_role', id, 'Required field "to_role" is empty.');
        if (targetLevel === null || !Number.isInteger(targetLevel) || targetLevel < 1 || targetLevel > 4) {
          addRowError(excelRow, 'target_level', id, 'target_level must be an integer between 1 and 4.');
        }
        if (durationMonths === null || durationMonths <= 0) {
          addRowError(excelRow, 'duration_months', id, 'duration_months must be a positive number.');
        }
        if (minAssessmentScore === null || minAssessmentScore < 0 || minAssessmentScore > 100) {
          addRowError(excelRow, 'min_assessment_score', id, 'min_assessment_score must be between 0 and 100.');
        }
        if (requiredCourseIds.length === 0) {
          addRowError(excelRow, 'required_course_ids', id, 'required_course_ids must reference at least one course.');
        } else {
          const invalidCrs = requiredCourseIds.filter((cid) => !knownIds.courses.has(cid));
          if (invalidCrs.length > 0) {
            addRowError(
              excelRow,
              'required_course_ids',
              id,
              `Invalid course FK references: ${invalidCrs.join(', ')}.`
            );
          }
        }
        if (requiredCompetencyIds.length === 0) {
          addRowError(
            excelRow,
            'required_competency_ids',
            id,
            'required_competency_ids must reference at least one competency.'
          );
        } else {
          const invalidComps = requiredCompetencyIds.filter((cid) => !knownIds.competencies.has(cid));
          if (invalidComps.length > 0) {
            addRowError(
              excelRow,
              'required_competency_ids',
              id,
              `Invalid competency FK references: ${invalidComps.join(', ')}.`
            );
          }
        }
        if (requiredPracticalIds.length > 0) {
          const invalidPracts = requiredPracticalIds.filter((pid) => !knownIds.practicalAssignments.has(pid));
          if (invalidPracts.length > 0) {
            addRowError(
              excelRow,
              'required_practical_ids',
              id,
              `Invalid practical assignment FK references: ${invalidPracts.join(', ')}.`
            );
          }
        }

        if (sheetErrors === rowErrCountBefore) {
          candidateDoc = pruneUndefined({
            id,
            code: code.slice(0, 64),
            nameEn: nameEn.slice(0, 200),
            nameVi: nameVi.slice(0, 200),
            fromRole: fromRole.slice(0, 150),
            toRole: toRole.slice(0, 150),
            targetLevel: targetLevel!,
            durationMonths: durationMonths!,
            requiredCourseIds: requiredCourseIds.slice(0, 30),
            requiredCompetencyIds: requiredCompetencyIds.slice(0, 40),
            requiredPracticalIds: requiredPracticalIds.length > 0 ? requiredPracticalIds.slice(0, 20) : undefined,
            minAssessmentScore: minAssessmentScore!,
            importedAt,
            importBatchId,
          });
        }
      }

      rowMetadata.push({ excelRow, doc: candidateDoc, recordId: id || `row_${excelRow}` });
    });

    // Sheet-level & Group-level Weight Sums (= 100%, with Excel decimal 0.0–1.0 normalization if sum == 1.0)
    if (spec.sheetName === 'Competency_Domains' && rowMetadata.length > 0) {
      const domainDocs = rowMetadata.filter((m) => m.doc !== null);
      if (domainDocs.length > 0) {
        let sumWeight = domainDocs.reduce((acc, m) => acc + (Number(m.doc!.weightPercent) || 0), 0);
        if (Math.abs(sumWeight - 1) <= 0.01 && domainDocs.every((m) => Number(m.doc!.weightPercent) <= 1)) {
          domainDocs.forEach((m) => {
            m.doc!.weightPercent = Math.round(Number(m.doc!.weightPercent) * 100 * 100) / 100;
          });
          sumWeight = domainDocs.reduce((acc, m) => acc + (Number(m.doc!.weightPercent) || 0), 0);
        }
        if (Math.abs(sumWeight - 100) > 0.01) {
          domainDocs.forEach((m) => {
            addRowError(
              m.excelRow,
              'weight_percent',
              m.recordId,
              `Competency_Domains weights must total 100% (current total: ${sumWeight}%).`
            );
          });
        }
      }
    }

    if (spec.sheetName === 'Competency_Rubric' && rowMetadata.length > 0) {
      const byComp = new Map<string, Array<{ excelRow: number; recordId: string; weight: number; doc: Record<string, any> }>>();
      for (const m of rowMetadata) {
        if (m.doc) {
          const cid = m.doc.competencyId as string;
          const arr = byComp.get(cid) || [];
          arr.push({
            excelRow: m.excelRow,
            recordId: m.recordId,
            weight: Number(m.doc.assessmentWeight) || 0,
            doc: m.doc,
          });
          byComp.set(cid, arr);
        }
      }
      for (const [cid, items] of byComp.entries()) {
        // Rebalance evenly if assessment_weight header was omitted from sheet
        if (items.length > 0 && items.every((i) => i.doc._autoRubricWeight)) {
          const evenWeight = Number((100 / items.length).toFixed(2));
          let assigned = 0;
          items.forEach((i, itemIdx) => {
            const w = itemIdx === items.length - 1 ? Number((100 - assigned).toFixed(2)) : evenWeight;
            assigned += w;
            i.doc.assessmentWeight = w;
            i.weight = w;
          });
        }
        for (const item of items) {
          delete item.doc._autoRubricWeight;
        }
        let groupSum = items.reduce((acc, i) => acc + i.weight, 0);
        if (Math.abs(groupSum - 1) <= 0.01 && items.every((i) => i.weight <= 1)) {
          items.forEach((i) => {
            i.doc.assessmentWeight = Math.round(i.weight * 100 * 100) / 100;
            i.weight = i.doc.assessmentWeight;
          });
          groupSum = items.reduce((acc, i) => acc + i.weight, 0);
        }
        if (Math.abs(groupSum - 100) > 0.01) {
          for (const item of items) {
            addRowError(
              item.excelRow,
              'assessment_weight',
              item.recordId,
              `Assessment weights for competency "${cid}" in Competency_Rubric must total 100% (current total: ${groupSum}%).`
            );
          }
        }
      }
    }

    if (spec.sheetName === 'Practical_Assignments' && rowMetadata.length > 0) {
      const weighted = rowMetadata.filter((m) => m.doc && typeof m.doc.weightPercent === 'number');
      if (weighted.length > 0) {
        let sumPractical = weighted.reduce((acc, m) => acc + (Number(m.doc!.weightPercent) || 0), 0);
        if (Math.abs(sumPractical - 1) <= 0.01 && weighted.every((m) => Number(m.doc!.weightPercent) <= 1)) {
          weighted.forEach((m) => {
            m.doc!.weightPercent = Math.round(Number(m.doc!.weightPercent) * 100 * 100) / 100;
          });
          sumPractical = weighted.reduce((acc, m) => acc + (Number(m.doc!.weightPercent) || 0), 0);
        }
        if (Math.abs(sumPractical - 100) > 0.01) {
          for (const m of weighted) {
            addRowError(
              m.excelRow,
              'weight_percent',
              m.recordId,
              `Practical_Assignments weight_percent values must total 100% (current total: ${sumPractical}%).`
            );
          }
        }
      }
    }

    // Finalize valid records for this sheet (never silently discarding invalid ones)
    for (const m of rowMetadata) {
      const hasRowError = invalidRowIndices.has(m.excelRow);
      if (!hasRowError && m.doc) {
        validDocs.push(m.doc);
        const docId = String(m.doc.id);
        knownIds[spec.collectionName].add(docId);
        resolvedDocsById[spec.collectionName][docId] = m.doc;
        if (m.doc.code) {
          codeToId[spec.collectionName].set(String(m.doc.code).trim().toLowerCase(), docId);
        }
        if (previewRows.length < 15) {
          previewRows.push({
            ...m.doc,
            _excelRow: m.excelRow,
            _isDuplicate: existingSet.has(docId),
          });
        }
      } else if (previewRows.length < 15) {
        previewRows.push({
          id: m.recordId,
          _excelRow: m.excelRow,
          _isDuplicate: existingSet.has(m.recordId),
          _hasError: true,
        });
      }
    }

    const sheetInvalidCount = invalidRowIndices.size;
    const sheetValidCount = validDocs.length;
    totalRowsDetected += rawRows.length;
    validRecordsTotal += sheetValidCount;
    invalidRecordsTotal += sheetInvalidCount;

    sanitizedByCollection[spec.collectionName] = validDocs;

    sheetSummaries.push({
      order: spec.order,
      sheetName: spec.sheetName,
      collectionName: spec.collectionName,
      expectedCount: spec.expectedCount,
      detectedHeaders,
      headerRowNumber,
      detectedRows: rawRows.length,
      validRows: sheetValidCount,
      invalidRows: sheetInvalidCount,
      errorCount: sheetErrors,
      warningCount: sheetWarnings,
      newCount,
      existingDuplicateCount: duplicateIds.length,
      duplicateIds,
      validationStatus: sheetErrors > 0 ? 'invalid' : sheetWarnings > 0 ? 'warnings' : 'valid',
      previewRows,
    });
  }

  return {
    importBatchId,
    fileName,
    readmeDetected,
    detectedSheets: detectedAll,
    ignoredSheets,
    selectedSheets: sheetSummaries.map((s) => s.sheetName),
    totalRowsDetected,
    validRecords: validRecordsTotal,
    invalidRecords: invalidRecordsTotal,
    errorCount: errors.length,
    warningCount: warnings.length,
    sheetSummaries,
    errors,
    warnings,
    sanitizedByCollection,
  };
}

// ============================================================================
// FIREBASE ADMIN & DEMO LOCAL CURRICULUM STORE HELPERS
// ============================================================================

const DEMO_CURRICULUM_FILE = path.join(process.cwd(), '.data', 'firestore-curriculum-demo.json');

export interface DemoCurriculumStore {
  collections: Record<string, Record<string, Record<string, any>>>;
  importLogs: Record<string, any>[];
}

export function loadDemoCurriculumStore(): DemoCurriculumStore {
  try {
    const dir = path.dirname(DEMO_CURRICULUM_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(DEMO_CURRICULUM_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DEMO_CURRICULUM_FILE, 'utf-8'));
      if (parsed && parsed.collections) {
        return {
          collections: parsed.collections,
          importLogs: Array.isArray(parsed.importLogs) ? parsed.importLogs : [],
        };
      }
    }
  } catch (err) {
    console.warn('Could not read demo curriculum store:', err);
  }
  const emptyCollections: Record<string, Record<string, Record<string, any>>> = {};
  for (const spec of IMPORT_ORDER_SPEC) {
    emptyCollections[spec.collectionName] = {};
  }
  return { collections: emptyCollections, importLogs: [] };
}

export function saveDemoCurriculumStore(store: DemoCurriculumStore): void {
  const dir = path.dirname(DEMO_CURRICULUM_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DEMO_CURRICULUM_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export function getDemoExistingIds(): Record<string, string[]> {
  const store = loadDemoCurriculumStore();
  const res: Record<string, string[]> = {};
  for (const spec of IMPORT_ORDER_SPEC) {
    res[spec.collectionName] = Object.keys(store.collections[spec.collectionName] || {});
  }
  return res;
}

export function loadFirebaseConfigJson(): { projectId: string; firestoreDatabaseId: string } | null {
  try {
    const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return null;
}

let cachedAdminDb: AdminFirestore | null = null;
let cachedAdminStatus: { checked: boolean; available: boolean; reason: string } = {
  checked: false,
  available: false,
  reason: 'Not initialized',
};

export async function getAuthorizedAdminFirestore(): Promise<{
  db: AdminFirestore | null;
  available: boolean;
  reason: string;
}> {
  if (cachedAdminStatus.checked) {
    return { db: cachedAdminDb, available: cachedAdminStatus.available, reason: cachedAdminStatus.reason };
  }

  const cfg = loadFirebaseConfigJson();
  if (!cfg || !cfg.projectId || !cfg.firestoreDatabaseId) {
    cachedAdminStatus = { checked: true, available: false, reason: 'firebase-applet-config.json missing.' };
    return { db: null, available: false, reason: cachedAdminStatus.reason };
  }

  try {
    if (getApps().length === 0) {
      const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (saJson && saJson.trim().startsWith('{')) {
        initializeApp({
          credential: cert(JSON.parse(saJson)),
          projectId: cfg.projectId,
        });
      } else {
        initializeApp({
          credential: applicationDefault(),
          projectId: cfg.projectId,
        });
      }
    }

    const adminDb = getFirestore(cfg.firestoreDatabaseId);
    // Probe minimal read to detect runtime IAM availability cleanly
    await adminDb.collection('competencyDomains').limit(1).get();
    cachedAdminDb = adminDb;
    cachedAdminStatus = { checked: true, available: true, reason: 'Firebase Admin SDK authorized' };
    return { db: adminDb, available: true, reason: cachedAdminStatus.reason };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    cachedAdminStatus = {
      checked: true,
      available: false,
      reason: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
        ? `Service Account error: ${msg}`
        : 'Server ADC lacks IAM write role (use Firebase Google Auth client commit or set FIREBASE_SERVICE_ACCOUNT_JSON).',
    };
    return { db: null, available: false, reason: cachedAdminStatus.reason };
  }
}

export interface VerificationResult {
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

export function verifyNormalizedDataset(
  collectionsMap: Record<string, Record<string, Record<string, any>>>,
  source: VerificationResult['source']
): VerificationResult {
  const counts = IMPORT_ORDER_SPEC.map((spec) => {
    const actual = Object.keys(collectionsMap[spec.collectionName] || {}).length;
    return {
      collection: spec.collectionName,
      sheetName: spec.sheetName,
      actual,
      expected: spec.expectedCount,
      matchesExpected: actual === spec.expectedCount,
    };
  });

  const domains = collectionsMap.competencyDomains || {};
  const competencies = collectionsMap.competencies || {};
  const courses = collectionsMap.courses || {};
  const rubrics = collectionsMap.competencyRubrics || {};
  const questions = collectionsMap.questionBank || {};
  const practicals = collectionsMap.practicalAssignments || {};
  const matrix = collectionsMap.annualTrainingMatrix || {};
  const paths = collectionsMap.careerPaths || {};

  const checkFk = (
    label: string,
    records: Record<string, Record<string, any>>,
    predicate: (doc: Record<string, any>) => boolean
  ) => {
    let broken = 0;
    for (const doc of Object.values(records)) {
      if (!predicate(doc)) broken++;
    }
    return {
      check: label,
      passed: Object.keys(records).length > 0 && broken === 0,
      brokenReferences: broken,
      details:
        Object.keys(records).length === 0
          ? 'No records present in collection.'
          : broken === 0
          ? `All ${Object.keys(records).length} records have valid parent references.`
          : `${broken} record(s) reference missing parent document(s).`,
    };
  };

  const relationshipChecks = [
    checkFk('Competencies → Competency Domains', competencies, (d) => !!domains[d.domainId]),
    checkFk('Competency Rubrics → Competencies', rubrics, (d) => !!competencies[d.competencyId]),
    checkFk(
      'Courses → Domains & Competencies',
      courses,
      (d) => !!domains[d.domainId] && !!competencies[d.competencyId]
    ),
    checkFk(
      'Question Bank → Courses & Competencies',
      questions,
      (d) => !!courses[d.courseId] && !!competencies[d.competencyId]
    ),
    checkFk(
      'Practical Assignments → Courses & Competencies',
      practicals,
      (d) => !!courses[d.courseId] && !!competencies[d.competencyId]
    ),
    checkFk(
      'Training Matrix 2027 → Domains, Courses & Competencies',
      matrix,
      (d) => !!domains[d.domainId] && !!courses[d.courseId] && !!competencies[d.competencyId]
    ),
    checkFk(
      'Career Paths → Courses & Competencies',
      paths,
      (d) =>
        Array.isArray(d.requiredCourseIds) &&
        d.requiredCourseIds.every((id: string) => !!courses[id]) &&
        Array.isArray(d.requiredCompetencyIds) &&
        d.requiredCompetencyIds.every((id: string) => !!competencies[id])
    ),
  ];

  const allCountsMatch = counts.every((c) => c.matchesExpected);
  const allRelationsPass = relationshipChecks.every((r) => r.passed);

  return {
    verificationPassed: allCountsMatch && allRelationsPass,
    checkedAt: new Date().toISOString(),
    source,
    counts,
    relationshipChecks,
  };
}

export function buildErrorReportBuffer(
  issues: ValidationIssue[],
  format: 'csv' | 'xlsx'
): Buffer {
  const rows = issues.map((iss) => ({
    Severity: iss.severity.toUpperCase(),
    Sheet: iss.sheet,
    Firestore_Collection: iss.collection,
    Excel_Row: iss.row,
    Field: iss.field,
    Record_ID: iss.recordId,
    Reason: iss.reason,
  }));

  const ws = XLSX.utils.json_to_sheet(
    rows.length > 0
      ? rows
      : [{ Severity: 'INFO', Sheet: '-', Firestore_Collection: '-', Excel_Row: 0, Field: '-', Record_ID: '-', Reason: 'No errors or warnings.' }]
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import_Validation_Report');

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return Buffer.from('\uFEFF' + csv, 'utf-8');
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
