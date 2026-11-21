import type express from 'express';

/**
 * Baseline HTTP security headers (equivalent to core Helmet protections without extra deps).
 */
export function securityHeadersMiddleware(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '0');
  next();
}

interface RateBucket {
  count: number;
  resetAt: number;
}

/**
 * Sliding-window in-memory rate limiter keyed by client IP + optional bucket prefix.
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
}) {
  const buckets = new Map<string, RateBucket>();

  // Periodic cleanup to avoid unbounded memory growth
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets.entries()) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }, Math.max(30_000, options.windowMs));
  cleanupTimer.unref?.();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const forwarded = String(req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim();
    const ip = forwarded || req.ip || req.socket.remoteAddress || 'local';
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, options.max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error:
          options.message ||
          `Quá nhiều yêu cầu. Vui lòng thử lại sau ${retryAfterSec} giây.`,
        retryAfterSeconds: retryAfterSec,
      });
    }

    next();
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (typeof password !== 'string' || password.length < 8) {
    return {
      valid: false,
      reason: 'Mật khẩu phải có tối thiểu 8 ký tự.',
    };
  }
  if (password.length > 128) {
    return {
      valid: false,
      reason: 'Mật khẩu không được vượt quá 128 ký tự.',
    };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return {
      valid: false,
      reason: 'Mật khẩu cần có ít nhất 1 chữ cái và 1 chữ số.',
    };
  }
  return { valid: true };
}

/**
 * Picks only explicitly allowlisted keys from an untrusted request body to prevent mass assignment.
 */
export function pickAllowedFields<T extends Record<string, any>>(
  source: unknown,
  allowedKeys: ReadonlyArray<string>
): Partial<T> {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }
  const src = source as Record<string, any>;
  const out: Record<string, any> = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(src, key) && src[key] !== undefined) {
      out[key] = src[key];
    }
  }
  return out as Partial<T>;
}
