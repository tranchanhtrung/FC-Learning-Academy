import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from './firebase';

export type StorageUploadCategory =
  | 'course_materials'
  | 'learning_documents'
  | 'assignment_evidence'
  | 'ojt_evidence'
  | 'assessment_attachments'
  | 'certificates';

export interface StorageUploadResult {
  downloadUrl: string;
  fullPath: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit per Spark-compatible security rules

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'xlsx',
  'xls',
  'csv',
  'txt',
  'md',
  'docx',
  'doc',
  'pptx',
  'ppt',
  'png',
  'jpg',
  'jpeg',
  'webp',
]);

export function validateStorageFile(file: File): { valid: boolean; error?: string } {
  if (!file) return { valid: false, error: 'No file selected.' };
  if (file.size <= 0) return { valid: false, error: 'Selected file is empty.' };
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB).`,
    };
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type "${ext || file.type}". Allowed: PDF, XLSX, CSV, DOCX, PPTX, TXT, MD, PNG, JPG, WEBP.`,
    };
  }
  return { valid: true };
}

export async function uploadAuthorizedTrainingFile(params: {
  file: File;
  category: StorageUploadCategory;
  recordId: string;
  filePrefix?: string;
}): Promise<StorageUploadResult> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) {
    throw new Error('Verified Firebase authentication is required before uploading files to Storage.');
  }

  const check = validateStorageFile(params.file);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const safeName = params.file.name.replace(/[^a-zA-Z0-9._\-]/g, '_');
  const safeRecordId = params.recordId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const safePrefix = params.filePrefix ? `${params.filePrefix.replace(/[^a-zA-Z0-9_\-]/g, '_')}_` : '';
  const fullPath =
    params.category === 'course_materials' || params.category === 'learning_documents'
      ? `${params.category}/${safeRecordId}/${safePrefix}${Date.now()}_${safeName}`
      : `${params.category}/${fbUser.uid}/${safeRecordId}/${safePrefix}${Date.now()}_${safeName}`;

  const storageRef = ref(storage, fullPath);
  const snap = await uploadBytes(storageRef, params.file, {
    contentType: params.file.type || 'application/octet-stream',
    customMetadata: {
      uploadedByUid: fbUser.uid,
      recordId: safeRecordId,
      category: params.category,
    },
  });
  const downloadUrl = await getDownloadURL(snap.ref);
  return {
    downloadUrl,
    fullPath: snap.ref.fullPath,
    fileName: params.file.name,
    sizeBytes: params.file.size,
    contentType: params.file.type || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
  };
}
