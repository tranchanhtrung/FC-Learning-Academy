import type {
  Competency,
  Course,
  LearningPath,
  LessonMaterialDoc,
  LessonMaterialType,
  OJTAssignment,
} from '../types';

const CRS_ID_TO_CODE: Record<string, string> = {
  'CRS-01': 'HFC-101',
  'CRS-02': 'HFC-102',
  'CRS-03': 'HFC-103',
  'CRS-04': 'HFC-201',
  'CRS-05': 'HFC-202',
  'CRS-06': 'HFC-203',
  'CRS-07': 'HFC-301',
  'CRS-08': 'HFC-302',
  'CRS-09': 'HFC-303',
  'CRS-10': 'HFC-401',
  'CRS-11': 'HFC-402',
  'CRS-12': 'HFC-403',
  'CRS-13': 'HFC-501',
  'CRS-14': 'HFC-502',
  'CRS-15': 'HFC-503',
  'CRS-16': 'HFC-601',
  'CRS-17': 'HFC-602',
  'CRS-18': 'HFC-603',
};

const OJT_ALIAS_GROUPS: string[][] = [
  ['ojt_01', 'OJT-FAR-01', 'OJT-2027-01', 'PA-FAR-01'],
  ['ojt_05', 'OJT-FCA-01', 'OJT-2027-02', 'PA-FCA-01'],
  ['ojt_02', 'OJT-FPM-01', 'OJT-2027-03', 'PA-FPM-01'],
  ['ojt_04', 'OJT-FPM-02'],
  ['ojt_03', 'OJT-BPA-01', 'OJT-2027-04', 'PA-BPA-01'],
  ['ojt_07', 'OJT-LPM-01', 'OJT-2027-05', 'PA-LPM-01'],
  ['ojt_06', 'OJT-SBP-01', 'OJT-2027-06', 'PA-SBP-01'],
];

const LEARNING_PATH_ALIAS_GROUPS: string[][] = [
  ['path_accountant_to_senior', 'PATH-1', 'CP-ACC-TO-SENIOR', 'PATH-L1-L2'],
  ['path_senior_to_afc', 'PATH-2', 'CP-SENIOR-TO-AFC', 'PATH-L2-L3'],
  ['path_afc_to_fc', 'PATH-3', 'CP-AFC-TO-FC', 'PATH-L3-L4'],
  ['path_fc_to_sbp', 'PATH-4', 'CP-FC-TO-SBP', 'PATH-L4-SBP'],
  ['path_comprehensive_highway', 'PATH-A', 'CP-COMPREHENSIVE-18', 'PATH-ALL-18'],
];

export function getLearningPathCanonicalKey(idOrCode?: string): string {
  if (!idOrCode) return '';
  const norm = idOrCode.trim().toUpperCase();
  for (const grp of LEARNING_PATH_ALIAS_GROUPS) {
    if (grp.some((g) => g.toUpperCase() === norm)) return grp[0];
  }
  return idOrCode;
}

export function findLearningPathMatch(
  pathsList: LearningPath[],
  pathIdOrCode?: string
): LearningPath | undefined {
  if (!pathIdOrCode) return undefined;
  const direct = pathsList.find((p) => p.id === pathIdOrCode || p.code === pathIdOrCode);
  if (direct) return direct;
  const canonicalKey = getLearningPathCanonicalKey(pathIdOrCode);
  const group = LEARNING_PATH_ALIAS_GROUPS.find((g) => g[0] === canonicalKey);
  if (!group) return undefined;
  const upperSet = new Set(group.map((g) => g.toUpperCase()));
  return pathsList.find(
    (p) => upperSet.has((p.id || '').toUpperCase()) || upperSet.has((p.code || '').toUpperCase())
  );
}

export function findOjtMatch(
  ojtList: OJTAssignment[],
  ojtIdOrCode?: string,
  fallbackOjts: OJTAssignment[] = []
): OJTAssignment | undefined {
  if (!ojtIdOrCode) return undefined;
  const norm = ojtIdOrCode.trim().toUpperCase();
  const group = OJT_ALIAS_GROUPS.find((g) => g.some((a) => a.toUpperCase() === norm));
  const aliasSet = new Set((group || [ojtIdOrCode]).map((a) => a.toUpperCase()));

  const found = ojtList.find(
    (o) => aliasSet.has((o.id || '').toUpperCase()) || aliasSet.has((o.code || '').toUpperCase())
  );
  if (found) return found;

  return fallbackOjts.find(
    (o) => aliasSet.has((o.id || '').toUpperCase()) || aliasSet.has((o.code || '').toUpperCase())
  );
}

export function findCompetencyMatch(
  compsList: Competency[],
  idOrCode?: string,
  fallbackComps: Competency[] = []
): Competency | undefined {
  if (!idOrCode) return undefined;
  const norm = idOrCode.trim().toUpperCase();
  const found = compsList.find(
    (c) => c.id.toUpperCase() === norm || c.code.toUpperCase() === norm
  );
  if (found) return found;
  const fb = fallbackComps.find(
    (c) => c.id.toUpperCase() === norm || c.code.toUpperCase() === norm
  );
  if (fb) {
    return (
      compsList.find((c) => c.code.toUpperCase() === fb.code.toUpperCase()) || fb
    );
  }
  return undefined;
}

export function findCourseMatch(
  coursesList: Course[],
  courseIdOrCode?: string,
  fallbackCourses: Course[] = []
): Course | undefined {
  if (!courseIdOrCode) return undefined;
  const direct = coursesList.find(
    (c) => c.id === courseIdOrCode || c.code === courseIdOrCode
  );
  if (direct) return direct;

  const mappedCode = CRS_ID_TO_CODE[courseIdOrCode.toUpperCase()];
  if (mappedCode) {
    const byMapped = coursesList.find((c) => c.code === mappedCode);
    if (byMapped) return byMapped;
  }

  const localMatch = fallbackCourses.find(
    (c) => c.id === courseIdOrCode || c.code === courseIdOrCode || (mappedCode ? c.code === mappedCode : false)
  );
  if (localMatch) {
    const byCode = coursesList.find((c) => c.code === localMatch.code);
    if (byCode) return byCode;
    return localMatch;
  }
  return undefined;
}

export function doesMaterialMatchCourse(
  material: Pick<LessonMaterialDoc, 'courseId' | 'courseCode'>,
  course?: Pick<Course, 'id' | 'code'> | null
): boolean {
  if (!course) return false;
  if (material.courseId === course.id) return true;
  if (course.code && material.courseCode && material.courseCode === course.code) return true;
  return false;
}

export function resolveMaterialLessonInfo(
  material: Pick<LessonMaterialDoc, 'courseId' | 'courseCode' | 'lessonId' | 'lessonOrder' | 'lessonTitleVi' | 'lessonTitleEn'>,
  coursesList: Course[],
  fallbackCourses: Course[] = []
): {
  lessonOrder: number;
  lessonTitleVi: string;
  lessonTitleEn: string;
} {
  const course =
    findCourseMatch(coursesList, material.courseId, fallbackCourses) ||
    findCourseMatch(coursesList, material.courseCode, fallbackCourses);
  const modules = course?.modules || [];
  const byIdIdx = modules.findIndex((m) => m.id === material.lessonId);
  const byOrderIdx =
    material.lessonOrder && material.lessonOrder >= 1 && material.lessonOrder <= modules.length
      ? material.lessonOrder - 1
      : -1;
  const matchedIdx = byIdIdx >= 0 ? byIdIdx : byOrderIdx;
  const matchedMod = matchedIdx >= 0 ? modules[matchedIdx] : undefined;

  if (matchedMod) {
    return {
      lessonOrder: matchedIdx + 1,
      lessonTitleVi: matchedMod.titleVi,
      lessonTitleEn: matchedMod.titleEn,
    };
  }
  return {
    lessonOrder: material.lessonOrder || 1,
    lessonTitleVi: material.lessonTitleVi,
    lessonTitleEn: material.lessonTitleEn,
  };
}

function getMaterialCategoryRank(m: LessonMaterialDoc): number {
  const text = `${m.titleVi || ''} ${m.titleEn || ''} ${m.fileName || ''}`.toLowerCase();
  if (/ngan\s*hang\s*cau\s*hoi|question\s*bank/.test(text)) return 4;
  if (/dap\s*an|answer\s*key|solution/.test(text)) return 3;
  if (/de\s*bai|exercise|lab\b/.test(text)) return 2;
  if (['docx', 'pdf', 'slide', 'video', 'checklist'].includes(m.materialType)) return 1;
  return 2;
}

export function sortLessonMaterialsAsc(items: LessonMaterialDoc[]): LessonMaterialDoc[] {
  return [...items].sort((a, b) => {
    const courseCmp = (a.courseCode || a.courseId || '').localeCompare(
      b.courseCode || b.courseId || '',
      undefined,
      { numeric: true, sensitivity: 'base' }
    );
    if (courseCmp !== 0) return courseCmp;

    const orderDiff = (a.lessonOrder || 999) - (b.lessonOrder || 999);
    if (orderDiff !== 0) return orderDiff;

    const rankDiff = getMaterialCategoryRank(a) - getMaterialCategoryRank(b);
    if (rankDiff !== 0) return rankDiff;

    const titleCmp = (a.titleVi || a.titleEn || '').localeCompare(
      b.titleVi || b.titleEn || '',
      undefined,
      { numeric: true, sensitivity: 'base' }
    );
    if (titleCmp !== 0) return titleCmp;

    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
}

export const FIRESTORE_INLINE_MAX_BYTES = 650 * 1024; // ~867KB base64, safely under Firestore 1MB doc limit
export const FIREBASE_STORAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB max per storage.rules

export function formatFileSizeLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'External';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function inferMaterialTypeFromFile(file: File): LessonMaterialType {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(ext) || file.type.includes('spreadsheet') || file.type.includes('excel')) {
    return 'excel';
  }
  if (['ppt', 'pptx'].includes(ext) || file.type.includes('presentation') || file.type.includes('powerpoint')) {
    return 'slide';
  }
  if (['doc', 'docx', 'txt', 'md'].includes(ext) || file.type.includes('word')) {
    return 'docx';
  }
  return 'other';
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export function base64ToBlob(base64: string, mimeType = 'application/octet-stream'): Blob {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function getMaterialExtension(material: Pick<LessonMaterialDoc, 'fileName' | 'downloadUrl' | 'externalUrl'>): string {
  const fromFile = (material.fileName || '').split('.').pop()?.trim().toLowerCase() || '';
  if (fromFile && fromFile.length <= 8 && !fromFile.includes('/')) return fromFile;
  const rawUrl = material.downloadUrl || material.externalUrl || '';
  if (!rawUrl) return '';
  try {
    const clean = rawUrl.split('?')[0].split('#')[0];
    const ext = clean.split('.').pop()?.trim().toLowerCase() || '';
    if (ext && ext.length <= 8 && !ext.includes('/')) return ext;
  } catch {
    // ignore malformed url
  }
  return '';
}

export type MaterialPreviewKind =
  | 'docx'
  | 'excel'
  | 'pdf'
  | 'image'
  | 'text'
  | 'video'
  | 'link'
  | 'unsupported';

export function getYouTubeOrVimeoEmbedUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    if (host.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (url.pathname.startsWith('/embed/')) return rawUrl;
    }
    if (host === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host.includes('vimeo.com')) {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function detectPreviewKind(material: LessonMaterialDoc): MaterialPreviewKind {
  const mime = (material.mimeType || '').toLowerCase();
  const ext = getMaterialExtension(material);
  const url = material.downloadUrl || material.externalUrl || '';

  if (
    ext === 'docx' ||
    mime.includes('wordprocessingml.document')
  ) {
    return 'docx';
  }
  if (
    ['xlsx', 'xls', 'xlsm', 'xlsb', 'ods'].includes(ext) ||
    mime.includes('spreadsheetml') ||
    mime.includes('ms-excel')
  ) {
    return 'excel';
  }
  if (ext === 'csv') {
    return 'excel';
  }
  if (ext === 'pdf' || mime === 'application/pdf') {
    return 'pdf';
  }
  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)
  ) {
    return 'image';
  }
  if (
    mime.startsWith('text/') ||
    ['txt', 'md', 'json', 'log'].includes(ext)
  ) {
    return 'text';
  }
  if (
    material.materialType === 'video' ||
    mime.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'ogg'].includes(ext) ||
    Boolean(getYouTubeOrVimeoEmbedUrl(url))
  ) {
    return 'video';
  }
  if (material.storageMode === 'external_link' || Boolean(url)) {
    return 'link';
  }
  return 'unsupported';
}

export async function getMaterialArrayBuffer(material: LessonMaterialDoc): Promise<ArrayBuffer> {
  if (material.inlineBase64) {
    const binary = atob(material.inlineBase64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  const targetUrl = material.downloadUrl || material.externalUrl;
  if (!targetUrl) {
    throw new Error('No file payload or URL available for this material.');
  }
  const res = await fetch(targetUrl);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} while loading material.`);
  }
  return await res.arrayBuffer();
}

export function sanitizeDocxHtml(html: string): string {
  if (!html) return '';

  // Prefer native DOMParser allowlist sanitization in browser to eliminate regex bypass XSS vectors
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const BLOCKED_TAGS = new Set([
      'script',
      'style',
      'iframe',
      'object',
      'embed',
      'svg',
      'math',
      'form',
      'input',
      'button',
      'meta',
      'link',
      'base',
    ]);
    const SAFE_URL_PROTOCOLS = /^(https?:|mailto:|tel:|#)/i;

    const sanitizeNode = (node: Element) => {
      const children = Array.from(node.children);
      for (const el of children) {
        const tag = el.tagName.toLowerCase();
        if (BLOCKED_TAGS.has(tag)) {
          el.remove();
          continue;
        }
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          const val = attr.value.trim();
          if (name.startsWith('on') || name === 'style' || name === 'srcdoc') {
            el.removeAttribute(attr.name);
            continue;
          }
          if ((name === 'href' || name === 'src' || name === 'xlink:href') && !SAFE_URL_PROTOCOLS.test(val)) {
            if (name === 'href') {
              el.setAttribute('href', '#');
            } else {
              el.removeAttribute(attr.name);
            }
          }
        }
        if (tag === 'a') {
          el.setAttribute('rel', 'noopener noreferrer');
          el.setAttribute('target', '_blank');
        }
        sanitizeNode(el);
      }
    };

    sanitizeNode(doc.body);
    return doc.body.innerHTML;
  }

  return html
    .replace(/<(script|iframe|object|embed|svg|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:(['"]).*?\1|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(['"])\s*(?:javascript|data|vbscript):[^'"]*\2/gi, '$1="#"');
}

export function getMaterialBlobUrl(material: LessonMaterialDoc): string | null {
  if (material.storageMode === 'firestore_inline' && material.inlineBase64) {
    const blob = base64ToBlob(material.inlineBase64, material.mimeType || 'application/octet-stream');
    return URL.createObjectURL(blob);
  }
  return material.downloadUrl || material.externalUrl || null;
}

export function downloadLessonMaterial(material: LessonMaterialDoc): void {
  if (material.storageMode === 'firestore_inline' && material.inlineBase64) {
    const blob = base64ToBlob(material.inlineBase64, material.mimeType || 'application/octet-stream');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', material.fileName || `${material.courseCode}_Lesson_${material.lessonOrder}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }

  const targetUrl = material.downloadUrl || material.externalUrl;
  if (targetUrl) {
    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function canPreviewInline(material: LessonMaterialDoc): boolean {
  return detectPreviewKind(material) !== 'unsupported';
}
