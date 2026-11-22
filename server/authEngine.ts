import express from 'express';
import crypto from 'crypto';
import path from 'path';
import type { User, UserRole } from '../src/types/index.ts';
import { loadOrCreateAuthSecret, readJsonSafe, writeJsonAtomic } from './persistence.ts';
import { isValidEmail, validatePasswordStrength } from './securityMiddleware.ts';
import { loadPgSnapshot, queuePgSnapshotSave } from './db/postgresStore.ts';

export const SESSION_COOKIE_NAME = 'fc_session';
export const DEFAULT_DEMO_PASSWORD = process.env.DEFAULT_DEMO_PASSWORD || 'FCAcademy@2026';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface AuthAccountRecord {
  userId: string;
  email: string; // normalized lowercase
  passwordHash: string; // scrypt:<saltHex>:<derivedHex>
  failedAttempts: number;
  lockedUntil?: number;
  resetCodeHash?: string;
  resetExpiresAt?: number;
  tokenVersion: number;
  createdAt: string;
  lastLoginAt?: string;
}

interface AuthStoreFile {
  accounts: Record<string, AuthAccountRecord>; // keyed by normalized email
  revokedTokens: Record<string, number>; // jti -> expiresAt epoch ms
}

export interface VerifiedSessionPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
  ver: number;
  jti: string;
  iat: number;
  exp: number;
}

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPasswordScrypt(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function hashSha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf-8');
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}

export interface AuthEngineDependencies {
  dataDir: string;
  getUsers: () => User[];
  addUser: (user: User) => void;
  recordAudit: (action: string, actor: string, target: string, details: string) => void;
  persistMainDB: () => void;
}

export function createAuthEngine(deps: AuthEngineDependencies) {
  const authStorePath = path.join(deps.dataDir, 'auth-accounts.json');
  const secret = loadOrCreateAuthSecret(deps.dataDir);

  let store: AuthStoreFile = readJsonSafe<AuthStoreFile>(authStorePath) || {
    accounts: {},
    revokedTokens: {},
  };
  if (!store.accounts || typeof store.accounts !== 'object') store.accounts = {};
  if (!store.revokedTokens || typeof store.revokedTokens !== 'object') store.revokedTokens = {};

  const persistAuthStore = () => {
    // Prune expired revoked tokens before saving
    const now = Date.now();
    for (const [jti, exp] of Object.entries(store.revokedTokens)) {
      if (exp <= now) delete store.revokedTokens[jti];
    }
    writeJsonAtomic(authStorePath, store);
    void queuePgSnapshotSave('auth_accounts', store);
  };

  const hydrateFromPostgres = async () => {
    const remote = await loadPgSnapshot<AuthStoreFile>('auth_accounts');
    if (remote && typeof remote === 'object' && remote.accounts) {
      store = {
        accounts: remote.accounts || {},
        revokedTokens: remote.revokedTokens || {},
      };
      writeJsonAtomic(authStorePath, store);
    }
    ensureSeedAccounts();
  };

  const isDemoAccountsAllowed = () =>
    process.env.DEMO_MODE === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE !== 'false');

  // Seed 1 official Bootstrap Super Admin if BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD are configured
  const ensureBootstrapAdmin = () => {
    const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = (process.env.BOOTSTRAP_ADMIN_PASSWORD || '').trim();
    const adminName = (process.env.BOOTSTRAP_ADMIN_NAME || 'System Administrator').trim();
    if (!adminEmail || !isValidEmail(adminEmail) || adminPassword.length < 8) return;

    const existingUser = deps.getUsers().find((u) => u.email.toLowerCase() === adminEmail);
    const now = new Date().toISOString();
    let targetUserId = existingUser?.id;

    if (!existingUser) {
      targetUserId = `user_owner_${crypto.createHash('sha256').update(adminEmail).digest('hex').slice(0, 10)}`;
      deps.addUser({
        id: targetUserId,
        name: adminName,
        email: adminEmail,
        role: 'super_admin',
        position: 'System Owner & Super Administrator',
        department: 'Executive Administration',
        property: 'FC Learning Academy',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=0A192F&color=D4AF37`,
        currentLevel: 4,
        targetLevel: 4,
        joinedDate: now.split('T')[0],
      });
      deps.persistMainDB();
    }

    if (targetUserId && !store.accounts[adminEmail]) {
      store.accounts[adminEmail] = {
        userId: targetUserId,
        email: adminEmail,
        passwordHash: hashPasswordScrypt(adminPassword),
        failedAttempts: 0,
        tokenVersion: 1,
        createdAt: now,
      };
      persistAuthStore();
    }
  };

  // Seed default credentials ONLY when demo mode is enabled (never in clean Production!)
  const ensureSeedAccounts = () => {
    ensureBootstrapAdmin();
    if (!isDemoAccountsAllowed()) return;

    let changed = false;
    const now = new Date().toISOString();
    for (const user of deps.getUsers()) {
      const normEmail = (user.email || '').trim().toLowerCase();
      if (!normEmail || !isValidEmail(normEmail)) continue;
      if (!store.accounts[normEmail]) {
        store.accounts[normEmail] = {
          userId: user.id,
          email: normEmail,
          passwordHash: hashPasswordScrypt(DEFAULT_DEMO_PASSWORD),
          failedAttempts: 0,
          tokenVersion: 1,
          createdAt: now,
        };
        changed = true;
      }
    }
    if (changed) {
      persistAuthStore();
    }
  };

  ensureSeedAccounts();

  const signToken = (payload: VerifiedSessionPayload): string => {
    const headerPart = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadPart = base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${headerPart}.${payloadPart}`;
    const sig = crypto.createHmac('sha256', secret).update(signingInput).digest();
    return `${signingInput}.${base64UrlEncode(sig)}`;
  };

  const verifyToken = (token: string): VerifiedSessionPayload | null => {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerPart, payloadPart, sigPart] = parts;
    const signingInput = `${headerPart}.${payloadPart}`;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', secret).update(signingInput).digest()
    );
    try {
      const a = Buffer.from(sigPart);
      const b = Buffer.from(expectedSig);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

      const payload = JSON.parse(base64UrlDecode(payloadPart)) as VerifiedSessionPayload;
      if (!payload || !payload.sub || !payload.email || !payload.exp) return null;
      if (Date.now() >= payload.exp) return null;
      if (payload.jti && store.revokedTokens[payload.jti]) return null;

      const account = store.accounts[payload.email.toLowerCase()];
      if (!account || account.userId !== payload.sub) return null;
      if (account.tokenVersion !== payload.ver) return null;

      return payload;
    } catch {
      return null;
    }
  };

  const extractTokenFromRequest = (req: express.Request): string | null => {
    const authHeader = String(req.headers.authorization || '').trim();
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const t = authHeader.slice(7).trim();
      if (t) return t;
    }
    const cookies = parseCookieHeader(req.headers.cookie);
    if (cookies[SESSION_COOKIE_NAME]) {
      return cookies[SESSION_COOKIE_NAME];
    }
    return null;
  };

  const resolveAuthenticatedUser = (
    req: express.Request
  ): { user: User; session: VerifiedSessionPayload } | null => {
    const token = extractTokenFromRequest(req);
    if (!token) return null;
    const session = verifyToken(token);
    if (!session) return null;
    const user = deps.getUsers().find((u) => u.id === session.sub);
    if (!user) return null;
    return { user, session };
  };

  const setSessionCookie = (res: express.Response, token: string) => {
    const isProd = process.env.NODE_ENV === 'production';
    const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
    const parts = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${maxAgeSec}`,
    ];
    if (isProd) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
  };

  const clearSessionCookie = (res: express.Response) => {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
    );
  };

  const issueSession = (user: User, account: AuthAccountRecord, res: express.Response) => {
    const now = Date.now();
    const payload: VerifiedSessionPayload = {
      sub: user.id,
      email: account.email,
      role: user.role,
      ver: account.tokenVersion,
      jti: crypto.randomBytes(16).toString('hex'),
      iat: now,
      exp: now + SESSION_TTL_MS,
    };
    const token = signToken(payload);
    setSessionCookie(res, token);
    return { token, expiresAt: new Date(payload.exp).toISOString() };
  };

  // Express Router for /api/auth/*
  const router = express.Router();

  router.get('/demo-accounts', (_req, res) => {
    ensureSeedAccounts();
    if (!isDemoAccountsAllowed()) {
      return res.json({ enabled: false, accounts: [] });
    }
    const rolePriority: UserRole[] = [
      'super_admin',
      'lnd_manager',
      'financial_controller',
      'general_manager',
      'learner',
    ];
    const users = deps.getUsers();
    const featured: Array<{ id: string; name: string; email: string; role: UserRole; position: string }> = [];
    for (const r of rolePriority) {
      const u = users.find((x) => x.role === r && x.email);
      if (u) {
        featured.push({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          position: u.position,
        });
      }
    }
    return res.json({
      enabled: true,
      defaultPasswordHint: DEFAULT_DEMO_PASSWORD,
      accounts: featured,
    });
  });

  router.get('/me', (req, res) => {
    const resolved = resolveAuthenticatedUser(req);
    if (!resolved) {
      return res.json({ authenticated: false, user: null });
    }
    return res.json({
      authenticated: true,
      user: resolved.user,
      expiresAt: new Date(resolved.session.exp).toISOString(),
    });
  });

  router.post('/register', (req, res) => {
    ensureSeedAccounts();
    const {
      name,
      email,
      password,
      position,
      department,
      property,
      requestedRole,
    } = req.body || {};

    const cleanName = String(name || '').trim().slice(0, 120);
    const normEmail = String(email || '').trim().toLowerCase().slice(0, 180);
    const rawPassword = String(password || '');

    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'Vui lòng nhập họ và tên hợp lệ (tối thiểu 2 ký tự).' });
    }
    if (!isValidEmail(normEmail)) {
      return res.status(400).json({ error: 'Địa chỉ email không hợp lệ.' });
    }
    const pwCheck = validatePasswordStrength(rawPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({ error: pwCheck.reason });
    }
    if (store.accounts[normEmail] || deps.getUsers().some((u) => u.email.toLowerCase() === normEmail)) {
      return res.status(409).json({
        error: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng chức năng Quên mật khẩu.',
      });
    }

    const now = new Date().toISOString();
    const newUserId = `user_reg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const validRoles: UserRole[] = [
      'learner',
      'financial_controller',
      'general_manager',
      'lnd_manager',
      'super_admin',
    ];
    const safeRequestedRole: UserRole | undefined =
      requestedRole && validRoles.includes(requestedRole) && requestedRole !== 'learner'
        ? requestedRole
        : undefined;

    // Security rule: newly self-registered users always start as 'learner' (never self-escalate to admin)
    const newUser: User = {
      id: newUserId,
      name: cleanName,
      email: normEmail,
      role: 'learner',
      ...(safeRequestedRole ? { requestedRole: safeRequestedRole } : {}),
      position: String(position || 'Hospitality Finance Professional').trim().slice(0, 120),
      department: String(department || 'Finance & Accounting').trim().slice(0, 120),
      property: String(property || 'Grand Horizon Saigon Hotel & Residences').trim().slice(0, 160),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0A192F&color=D4AF37`,
      currentLevel: 1,
      targetLevel: 4,
      careerPathId: 'path_accountant_to_senior',
      joinedDate: now.split('T')[0],
    };

    const account: AuthAccountRecord = {
      userId: newUser.id,
      email: normEmail,
      passwordHash: hashPasswordScrypt(rawPassword),
      failedAttempts: 0,
      tokenVersion: 1,
      createdAt: now,
      lastLoginAt: now,
    };

    deps.addUser(newUser);
    store.accounts[normEmail] = account;
    deps.recordAudit(
      'AUTH_REGISTER',
      newUser.name,
      newUser.email,
      `Registered new academy account (role: learner${safeRequestedRole ? `, requested: ${safeRequestedRole}` : ''})`
    );
    deps.persistMainDB();
    persistAuthStore();

    const sessionInfo = issueSession(newUser, account, res);
    return res.status(201).json({
      success: true,
      user: newUser,
      token: sessionInfo.token,
      expiresAt: sessionInfo.expiresAt,
    });
  });

  router.post('/login', (req, res) => {
    ensureSeedAccounts();
    const normEmail = String(req.body?.email || '').trim().toLowerCase();
    const rawPassword = String(req.body?.password || '');

    if (!isValidEmail(normEmail) || !rawPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ email và mật khẩu.' });
    }

    const account = store.accounts[normEmail];
    if (!account) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
    }

    const nowMs = Date.now();
    if (account.lockedUntil && account.lockedUntil > nowMs) {
      const waitSec = Math.ceil((account.lockedUntil - nowMs) / 1000);
      return res.status(423).json({
        error: `Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ${waitSec} giây.`,
      });
    }

    if (!verifyPasswordScrypt(rawPassword, account.passwordHash)) {
      account.failedAttempts = (account.failedAttempts || 0) + 1;
      if (account.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        account.lockedUntil = nowMs + LOCKOUT_MS;
        account.failedAttempts = 0;
      }
      persistAuthStore();
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
    }

    const user = deps.getUsers().find((u) => u.id === account.userId);
    if (!user) {
      return res.status(404).json({ error: 'Hồ sơ người dùng không tồn tại trong hệ thống.' });
    }

    account.failedAttempts = 0;
    account.lockedUntil = undefined;
    account.lastLoginAt = new Date().toISOString();
    persistAuthStore();

    deps.recordAudit('AUTH_LOGIN', user.name, user.email, `Authenticated via Academy Server Auth (${user.role})`);
    deps.persistMainDB();

    const sessionInfo = issueSession(user, account, res);
    return res.json({
      success: true,
      user,
      token: sessionInfo.token,
      expiresAt: sessionInfo.expiresAt,
    });
  });

  router.post('/logout', (req, res) => {
    const resolved = resolveAuthenticatedUser(req);
    if (resolved) {
      store.revokedTokens[resolved.session.jti] = resolved.session.exp;
      persistAuthStore();
      deps.recordAudit('AUTH_LOGOUT', resolved.user.name, resolved.user.email, 'User signed out');
      deps.persistMainDB();
    }
    clearSessionCookie(res);
    return res.json({ success: true });
  });

  router.post('/change-password', (req, res) => {
    const resolved = resolveAuthenticatedUser(req);
    if (!resolved) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập trước khi đổi mật khẩu.' });
    }
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const account = store.accounts[resolved.session.email.toLowerCase()];
    if (!account || !verifyPasswordScrypt(currentPassword, account.passwordHash)) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác.' });
    }
    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({ error: pwCheck.reason });
    }

    account.passwordHash = hashPasswordScrypt(newPassword);
    account.tokenVersion = (account.tokenVersion || 1) + 1;
    persistAuthStore();

    deps.recordAudit('AUTH_CHANGE_PASSWORD', resolved.user.name, resolved.user.email, 'Password changed');
    deps.persistMainDB();

    const sessionInfo = issueSession(resolved.user, account, res);
    return res.json({
      success: true,
      token: sessionInfo.token,
      expiresAt: sessionInfo.expiresAt,
    });
  });

  router.post('/forgot-password', (req, res) => {
    ensureSeedAccounts();
    const normEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!isValidEmail(normEmail)) {
      return res.status(400).json({ error: 'Vui lòng nhập địa chỉ email hợp lệ.' });
    }

    const account = store.accounts[normEmail];
    if (!account) {
      // Avoid enumerating whether an email exists in production
      return res.json({
        success: true,
        message: 'Nếu email tồn tại trong hệ thống, mã khôi phục đã được tạo.',
      });
    }

    const code = String(crypto.randomInt(100000, 999999));
    account.resetCodeHash = hashSha256(code);
    account.resetExpiresAt = Date.now() + RESET_CODE_TTL_MS;
    persistAuthStore();

    const isLocalDev = process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true';
    return res.json({
      success: true,
      message: 'Mã khôi phục 6 chữ số đã được tạo (hiệu lực 15 phút).',
      ...(isLocalDev ? { devPreviewCode: code } : {}),
    });
  });

  router.post('/reset-password', (req, res) => {
    const normEmail = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!isValidEmail(normEmail) || !code) {
      return res.status(400).json({ error: 'Vui lòng nhập email và mã khôi phục 6 chữ số.' });
    }
    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({ error: pwCheck.reason });
    }

    const account = store.accounts[normEmail];
    if (
      !account ||
      !account.resetCodeHash ||
      !account.resetExpiresAt ||
      Date.now() > account.resetExpiresAt ||
      account.resetCodeHash !== hashSha256(code)
    ) {
      return res.status(400).json({ error: 'Mã khôi phục không đúng hoặc đã hết hạn.' });
    }

    account.passwordHash = hashPasswordScrypt(newPassword);
    account.resetCodeHash = undefined;
    account.resetExpiresAt = undefined;
    account.failedAttempts = 0;
    account.lockedUntil = undefined;
    account.tokenVersion = (account.tokenVersion || 1) + 1;
    persistAuthStore();

    const user = deps.getUsers().find((u) => u.id === account.userId);
    if (user) {
      deps.recordAudit('AUTH_RESET_PASSWORD', user.name, user.email, 'Password reset completed');
      deps.persistMainDB();
    }

    return res.json({ success: true });
  });

  return {
    router,
    resolveAuthenticatedUser,
    ensureSeedAccounts,
    hydrateFromPostgres,
  };
}
