import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export type R2ObjectCategory =
  | 'course_materials'
  | 'course_videos'
  | 'ojt_evidence'
  | 'assessment_attachments'
  | 'certificates'
  | 'avatars';

export interface R2Config {
  enabled: boolean;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
}

export interface StoragePresignPutResult {
  driver: 'cloudflare_r2' | 'local_upload';
  objectKey: string;
  uploadUrl: string;
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
  expiresInSeconds: number;
  maxSizeBytes: number;
}

const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024; // 50 MB for PDF/DOCX/XLSX/PPTX/Images
const MAX_VIDEO_BYTES = 250 * 1024 * 1024; // 250 MB for MP4/WebM direct R2 upload

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
  'mp4',
  'webm',
]);

const ALLOWED_MIMES = new Set([
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
  'video/mp4',
  'video/webm',
  'application/octet-stream',
]);

export function getR2Config(): R2Config {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = (process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || '').trim();
  const publicBaseUrl = (process.env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  const enabled = Boolean(accountId && accessKeyId && secretAccessKey && bucket);
  return { enabled, accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

export function getLocalUploadDir(): string {
  const base = process.env.VERCEL
    ? path.join(os.tmpdir(), 'fc-learning-academy-uploads')
    : path.join(process.cwd(), '.data', 'uploads');
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return base;
}

export function validateUploadMetadata(params: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: R2ObjectCategory;
}): { valid: boolean; maxSizeBytes: number; error?: string } {
  const isVideo =
    params.category === 'course_videos' ||
    params.mimeType.startsWith('video/') ||
    /\.(mp4|webm)$/i.test(params.fileName);
  const maxSizeBytes = isVideo ? MAX_VIDEO_BYTES : MAX_DOCUMENT_BYTES;

  if (!params.fileName || !params.fileName.trim()) {
    return { valid: false, maxSizeBytes, error: 'Tên tệp không được để trống.' };
  }
  if (!Number.isFinite(params.sizeBytes) || params.sizeBytes <= 0) {
    return { valid: false, maxSizeBytes, error: 'Tệp rỗng hoặc dung lượng không hợp lệ.' };
  }
  if (params.sizeBytes > maxSizeBytes) {
    const limitMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      maxSizeBytes,
      error: `Dung lượng tệp vượt quá giới hạn ${limitMb} MB.`,
    };
  }
  const ext = params.fileName.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIMES.has(params.mimeType)) {
    return {
      valid: false,
      maxSizeBytes,
      error: `Định dạng ".${ext || params.mimeType}" chưa được hỗ trợ. Cho phép: PDF, DOCX, XLSX, PPTX, CSV, PNG, JPG, WEBP, MP4, WEBM.`,
    };
  }
  return { valid: true, maxSizeBytes };
}

export function buildSafeObjectKey(params: {
  category: R2ObjectCategory;
  ownerId: string;
  recordId: string;
  fileName: string;
}): string {
  const safeRecord = params.recordId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64) || 'general';
  const safeOwner = params.ownerId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64) || 'anon';
  const safeFile = params.fileName.replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 120) || 'file.bin';
  const nonce = crypto.randomBytes(4).toString('hex');
  if (params.category === 'course_materials' || params.category === 'course_videos') {
    return `${params.category}/${safeRecord}/${Date.now()}_${nonce}_${safeFile}`;
  }
  return `${params.category}/${safeOwner}/${safeRecord}/${Date.now()}_${nonce}_${safeFile}`;
}

// =============================================================================
// Zero-Dependency AWS SigV4 Presigned URL Generator for Cloudflare R2
// =============================================================================
function hmacSha256(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeObjectKeyPath(objectKey: string): string {
  return objectKey
    .split('/')
    .map((segment) => encodeRfc3986(segment))
    .join('/');
}

export function createR2PresignedUrl(params: {
  method: 'GET' | 'PUT' | 'DELETE';
  objectKey: string;
  expiresInSeconds?: number;
  contentType?: string;
}): string {
  const cfg = getR2Config();
  if (!cfg.enabled) {
    throw new Error('Cloudflare R2 is not configured in environment variables.');
  }

  const expires = Math.max(60, Math.min(3600, params.expiresInSeconds ?? 600));
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeRfc3986(cfg.bucket)}/${encodeObjectKeyPath(params.objectKey)}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const signedHeaders = params.method === 'PUT' && params.contentType ? 'content-type;host' : 'host';
  const queryParams: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${cfg.accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expires)],
    ['X-Amz-SignedHeaders', signedHeaders],
  ];
  queryParams.sort((a, b) => a[0].localeCompare(b[0]));

  const canonicalQueryString = queryParams
    .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
    .join('&');

  const canonicalHeaders =
    params.method === 'PUT' && params.contentType
      ? `content-type:${params.contentType}\nhost:${host}\n`
      : `host:${host}\n`;

  const canonicalRequest = [
    params.method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = hmacSha256(kSigning, stringToSign).toString('hex');

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

export async function deleteR2ObjectIfConfigured(objectKey: string): Promise<boolean> {
  const cfg = getR2Config();
  if (!cfg.enabled) {
    // Also clean up local uploaded binary if present
    const safeRel = objectKey.replace(/\.\./g, '').replace(/^\/+/, '');
    const localPath = path.join(getLocalUploadDir(), safeRel);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      return true;
    }
    return false;
  }
  try {
    const deleteUrl = createR2PresignedUrl({
      method: 'DELETE',
      objectKey,
      expiresInSeconds: 120,
    });
    const res = await fetch(deleteUrl, { method: 'DELETE' });
    return res.ok || res.status === 404;
  } catch (err) {
    console.warn('[R2 Cleanup] Failed to delete object:', objectKey, err);
    return false;
  }
}
