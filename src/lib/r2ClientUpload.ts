export type ClientUploadCategory =
  | 'course_materials'
  | 'course_videos'
  | 'ojt_evidence'
  | 'assessment_attachments'
  | 'certificates'
  | 'avatars';

export interface PresignedUploadOutcome {
  driver: 'cloudflare_r2' | 'local_upload';
  objectKey: string;
  downloadApiUrl: string;
  fileName: string;
  sizeBytes: number;
}

/**
 * Direct-to-Cloudflare-R2 (or local dev fallback) upload with real-time progress reporting
 * and AbortSignal cancellation via XMLHttpRequest.
 */
export async function uploadFileWithProgress(params: {
  file: File;
  category: ClientUploadCategory;
  recordId: string;
  authHeaders: Record<string, string>;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<PresignedUploadOutcome> {
  const presignRes = await fetch('/api/storage/presign-upload', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...params.authHeaders,
    },
    body: JSON.stringify({
      fileName: params.file.name,
      mimeType: params.file.type || 'application/octet-stream',
      sizeBytes: params.file.size,
      category: params.category,
      recordId: params.recordId,
    }),
  });

  const presign = await presignRes.json().catch(() => ({}));
  if (!presignRes.ok || !presign.uploadUrl) {
    throw new Error(presign.error || 'Không thể khởi tạo đường dẫn tải tệp lên.');
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(presign.method || 'PUT', presign.uploadUrl, true);
    if (presign.driver === 'local_upload') {
      xhr.withCredentials = true;
      Object.entries(params.authHeaders).forEach(([k, v]) => {
        if (k.toLowerCase() !== 'content-type') xhr.setRequestHeader(k, v);
      });
    }
    if (presign.headers && typeof presign.headers === 'object') {
      Object.entries(presign.headers).forEach(([k, v]) => {
        xhr.setRequestHeader(k, String(v));
      });
    }

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && params.onProgress) {
        const pct = Math.min(100, Math.round((ev.loaded / ev.total) * 100));
        params.onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        params.onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Tải tệp thất bại (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Lỗi kết nối mạng khi đang tải tệp lên.'));
    xhr.onabort = () => reject(new Error('Đã hủy tải tệp lên.'));

    if (params.signal) {
      params.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(params.file);
  });

  return {
    driver: presign.driver,
    objectKey: presign.objectKey,
    downloadApiUrl: presign.downloadApiUrl,
    fileName: params.file.name,
    sizeBytes: params.file.size,
  };
}
