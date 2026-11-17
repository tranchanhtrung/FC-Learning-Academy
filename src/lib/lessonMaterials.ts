import type { LessonMaterialDoc, LessonMaterialType } from '../types';

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
  if (material.storageMode !== 'firestore_inline' || !material.inlineBase64) return false;
  const mime = (material.mimeType || '').toLowerCase();
  const ext = (material.fileName || '').split('.').pop()?.toLowerCase() || '';
  return (
    mime === 'application/pdf' ||
    mime.startsWith('image/') ||
    mime.startsWith('text/') ||
    ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'md', 'csv'].includes(ext)
  );
}
