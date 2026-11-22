import pg from 'pg';

const { Pool } = pg;
type PgPool = InstanceType<typeof Pool>;

export type PgStoreKey = 'academy_db' | 'auth_accounts' | 'billing_store';

let pool: PgPool | null = null;
let tableReadyPromise: Promise<boolean> | null = null;
const writeQueues = new Map<PgStoreKey, Promise<void>>();

export function getDatabaseUrl(): string {
  return (process.env.DATABASE_URL || '').trim();
}

export function isPostgresEnabled(): boolean {
  const url = getDatabaseUrl();
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

function getPool(): PgPool | null {
  if (!isPostgresEnabled()) return null;
  if (pool) return pool;

  const connectionString = getDatabaseUrl();
  const isLocal =
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1') ||
    process.env.PGSSLMODE === 'disable';

  pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 15_000,
    connectionTimeoutMillis: 8_000,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Pool background error:', err.message);
  });

  return pool;
}

export async function ensurePgStoreTable(): Promise<boolean> {
  const pgPool = getPool();
  if (!pgPool) return false;
  if (!tableReadyPromise) {
    tableReadyPromise = pgPool
      .query(`
        CREATE TABLE IF NOT EXISTS app_state_snapshots (
          store_key TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `)
      .then(() => true)
      .catch((err) => {
        console.error('[PostgreSQL] Failed to initialize snapshot table:', err.message);
        tableReadyPromise = null;
        return false;
      });
  }
  return tableReadyPromise;
}

export async function loadPgSnapshot<T>(key: PgStoreKey): Promise<T | null> {
  const ready = await ensurePgStoreTable();
  const pgPool = getPool();
  if (!ready || !pgPool) return null;

  try {
    const result = await pgPool.query<{ payload: T }>(
      'SELECT payload FROM app_state_snapshots WHERE store_key = $1 LIMIT 1',
      [key]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].payload;
  } catch (err: any) {
    console.error(`[PostgreSQL] Failed to load "${key}":`, err?.message || err);
    return null;
  }
}

/**
 * Serialized write-through persistence to PostgreSQL JSONB snapshot table.
 * Prevents out-of-order concurrent writes while keeping request latency minimal.
 */
export function queuePgSnapshotSave(key: PgStoreKey, data: unknown): Promise<void> {
  if (!isPostgresEnabled()) return Promise.resolve();

  const serialized = JSON.stringify(data);
  const prev = writeQueues.get(key) || Promise.resolve();
  const next = prev
    .catch(() => undefined)
    .then(async () => {
      const ready = await ensurePgStoreTable();
      const pgPool = getPool();
      if (!ready || !pgPool) return;
      await pgPool.query(
        `
        INSERT INTO app_state_snapshots (store_key, payload, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (store_key)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW();
        `,
        [key, serialized]
      );
    })
    .catch((err: any) => {
      console.error(`[PostgreSQL] Failed to save "${key}":`, err?.message || err);
    });

  writeQueues.set(key, next);
  return next;
}

export async function checkPostgresHealth(): Promise<{
  enabled: boolean;
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!isPostgresEnabled()) {
    return { enabled: false, connected: false };
  }
  const pgPool = getPool();
  if (!pgPool) return { enabled: true, connected: false, error: 'Pool unavailable' };
  const start = Date.now();
  try {
    await pgPool.query('SELECT 1');
    return { enabled: true, connected: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { enabled: true, connected: false, error: err?.message || 'Connection failed' };
  }
}
