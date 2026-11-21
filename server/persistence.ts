import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Atomically writes a JSON file via a sibling temporary file + rename so crashes or
 * concurrent reads never observe a truncated/corrupted JSON file.
 */
export function writeJsonAtomic(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const serialized = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmpPath, serialized, 'utf-8');
  try {
    fs.renameSync(tmpPath, filePath);
  } catch {
    // Windows fallback when antivirus or another handle momentarily locks target
    fs.copyFileSync(tmpPath, filePath);
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore cleanup error
    }
  }
}

export function readJsonSafe<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Loads AUTH_SECRET from environment or persists a cryptographically random 32-byte hex secret
 * inside `.data/.auth-secret` so signed sessions remain valid across local server restarts.
 */
export function loadOrCreateAuthSecret(dataDir: string): string {
  const envSecret = (process.env.AUTH_SECRET || '').trim();
  if (envSecret.length >= 24) return envSecret;

  const secretPath = path.join(dataDir, '.auth-secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf-8').trim();
      if (existing.length >= 32) return existing;
    }
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, generated, { encoding: 'utf-8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}
