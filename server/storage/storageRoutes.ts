import express from 'express';
import fs from 'fs';
import path from 'path';
import type { User } from '../../src/types/index.ts';
import {
  R2ObjectCategory,
  buildSafeObjectKey,
  createR2PresignedUrl,
  deleteR2ObjectIfConfigured,
  getLocalUploadDir,
  getR2Config,
  validateUploadMetadata,
} from './r2StorageEngine.ts';

export interface StorageRouterDeps {
  getRequestActor: (req: express.Request) => User | undefined;
  canManageCourseMaterials: (req: express.Request) => boolean;
  recordAudit: (action: string, actor: string, target: string, details: string) => void;
}

export function createStorageRouter(deps: StorageRouterDeps) {
  const router = express.Router();

  router.get('/status', (_req, res) => {
    const cfg = getR2Config();
    return res.json({
      driver: cfg.enabled ? 'cloudflare_r2' : 'local_upload',
      bucket: cfg.enabled ? cfg.bucket : 'local-uploads',
      maxDocumentMb: 50,
      maxVideoMb: 250,
      egressFree: cfg.enabled,
    });
  });

  // Step 1: Client requests a short-lived Presigned PUT URL (direct browser -> Cloudflare R2)
  router.post('/presign-upload', (req, res) => {
    const actor = deps.getRequestActor(req);
    if (!actor) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để tải tệp lên hệ thống.' });
    }

    const {
      fileName,
      mimeType = 'application/octet-stream',
      sizeBytes,
      category = 'course_materials',
      recordId = 'general',
    } = req.body || {};

    const validCategories: R2ObjectCategory[] = [
      'course_materials',
      'course_videos',
      'ojt_evidence',
      'assessment_attachments',
      'certificates',
      'avatars',
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Danh mục lưu trữ không hợp lệ.' });
    }

    if (
      (category === 'course_materials' || category === 'course_videos') &&
      !deps.canManageCourseMaterials(req)
    ) {
      return res.status(403).json({
        error: 'Bạn không có quyền tải lên bài giảng/học liệu khóa học.',
      });
    }

    const check = validateUploadMetadata({
      fileName: String(fileName || ''),
      mimeType: String(mimeType || 'application/octet-stream'),
      sizeBytes: Number(sizeBytes || 0),
      category,
    });
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }

    const objectKey = buildSafeObjectKey({
      category,
      ownerId: actor.id,
      recordId: String(recordId || 'general'),
      fileName: String(fileName),
    });

    const cfg = getR2Config();
    if (cfg.enabled) {
      const uploadUrl = createR2PresignedUrl({
        method: 'PUT',
        objectKey,
        expiresInSeconds: 900, // 15 minutes
        contentType: String(mimeType || 'application/octet-stream'),
      });
      return res.json({
        driver: 'cloudflare_r2',
        objectKey,
        uploadUrl,
        method: 'PUT',
        headers: { 'Content-Type': String(mimeType || 'application/octet-stream') },
        downloadApiUrl: `/api/storage/file?key=${encodeURIComponent(objectKey)}`,
        expiresInSeconds: 900,
        maxSizeBytes: check.maxSizeBytes,
      });
    }

    // Local development direct binary upload endpoint (identical XHR PUT progress UX!)
    return res.json({
      driver: 'local_upload',
      objectKey,
      uploadUrl: `/api/storage/local-upload?key=${encodeURIComponent(objectKey)}`,
      method: 'PUT',
      headers: { 'Content-Type': String(mimeType || 'application/octet-stream') },
      downloadApiUrl: `/api/storage/file?key=${encodeURIComponent(objectKey)}`,
      expiresInSeconds: 900,
      maxSizeBytes: check.maxSizeBytes,
    });
  });

  // Local binary receiver (used only when Cloudflare R2 env vars are not set)
  router.put(
    '/local-upload',
    express.raw({ type: '*/*', limit: '55mb' }),
    (req, res) => {
      const actor = deps.getRequestActor(req);
      if (!actor) return res.status(401).json({ error: 'Unauthorized' });

      const objectKey = String(req.query.key || '').replace(/\.\./g, '').replace(/^\/+/, '');
      if (!objectKey) return res.status(400).json({ error: 'Missing object key.' });

      const bodyBuf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
      if (bodyBuf.length === 0) {
        return res.status(400).json({ error: 'Empty upload body.' });
      }

      const targetPath = path.join(getLocalUploadDir(), objectKey);
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(targetPath, bodyBuf);

      deps.recordAudit('STORAGE_UPLOAD', actor.name, objectKey, `Uploaded ${(bodyBuf.length / 1024).toFixed(1)} KB`);
      return res.status(200).json({
        success: true,
        objectKey,
        sizeBytes: bodyBuf.length,
        downloadUrl: `/api/storage/file?key=${encodeURIComponent(objectKey)}`,
      });
    }
  );

  // Short-lived Signed Download Redirect (Cloudflare R2) or local stream
  router.get('/file', (req, res) => {
    const objectKey = String(req.query.key || '').replace(/\.\./g, '').replace(/^\/+/, '');
    if (!objectKey) return res.status(400).json({ error: 'Missing object key.' });

    const cfg = getR2Config();
    if (cfg.enabled) {
      const signedGetUrl = createR2PresignedUrl({
        method: 'GET',
        objectKey,
        expiresInSeconds: 600, // 10 min short-lived signed URL
      });
      return res.redirect(302, signedGetUrl);
    }

    const targetPath = path.join(getLocalUploadDir(), objectKey);
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'File not found in storage.' });
    }
    return res.sendFile(targetPath);
  });

  // Delete object from Cloudflare R2 / local storage to eliminate orphaned files
  router.delete('/object', async (req, res) => {
    const actor = deps.getRequestActor(req);
    if (!actor || !deps.canManageCourseMaterials(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const objectKey = String(req.query.key || req.body?.objectKey || '')
      .replace(/\.\./g, '')
      .replace(/^\/+/, '');
    if (!objectKey) return res.status(400).json({ error: 'Missing object key.' });

    const deleted = await deleteR2ObjectIfConfigured(objectKey);
    deps.recordAudit('STORAGE_DELETE', actor.name, objectKey, deleted ? 'Removed object from storage' : 'Not found');
    return res.json({ success: true, deleted });
  });

  return router;
}
