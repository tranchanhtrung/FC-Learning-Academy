-- =============================================================================
-- FC Learning Academy — Production PostgreSQL Schema (Supabase / Neon Ready)
-- Includes: Auth & RBAC, LMS Curriculum, OJT, Talent Engine, Cloudflare R2
-- Storage Registry, and Glitch-Proof Billing / Entitlements (VietQR, MoMo,
-- VNPay, Stripe, B2B Hotel Cluster Seats).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ORGANIZATIONS (Hotel Properties / Clusters for B2B Seat Licensing)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  tax_code        TEXT,
  billing_address TEXT,
  billing_email   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. USERS, CREDENTIALS & REVOCABLE SESSIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  org_id          TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  role            TEXT NOT NULL DEFAULT 'learner'
                  CHECK (role IN ('super_admin', 'lnd_manager', 'financial_controller', 'general_manager', 'learner')),
  requested_role  TEXT,
  position        TEXT NOT NULL DEFAULT 'Hospitality Finance Professional',
  department      TEXT NOT NULL DEFAULT 'Finance & Accounting',
  property        TEXT NOT NULL DEFAULT 'FC Learning Academy',
  avatar_url      TEXT,
  supervisor_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  current_level   SMALLINT NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 4),
  target_level    SMALLINT NOT NULL DEFAULT 4 CHECK (target_level BETWEEN 1 AND 4),
  career_path_id  TEXT,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  joined_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_accounts (
  user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_normalized TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  failed_attempts  INTEGER NOT NULL DEFAULT 0,
  locked_until     TIMESTAMPTZ,
  reset_code_hash  TEXT,
  reset_expires_at TIMESTAMPTZ,
  token_version    INTEGER NOT NULL DEFAULT 1,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti        TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_exp ON revoked_tokens(expires_at);

CREATE TABLE IF NOT EXISTS role_permissions (
  role            TEXT PRIMARY KEY,
  permissions     JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_name TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. CLOUDFLARE R2 STORAGE OBJECT REGISTRY (Prevents Orphaned Files)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS storage_objects (
  id              TEXT PRIMARY KEY,
  bucket          TEXT NOT NULL,
  object_key      TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL
                  CHECK (category IN ('course_materials', 'course_videos', 'ojt_evidence', 'assessment_attachments', 'certificates', 'avatars')),
  original_name   TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL CHECK (size_bytes > 0),
  sha256_checksum TEXT,
  uploaded_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  course_id       TEXT,
  lesson_id       TEXT,
  is_public       BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'deleted')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_storage_objects_course ON storage_objects(course_id, lesson_id) WHERE status = 'active';

-- -----------------------------------------------------------------------------
-- 4. LMS CURRICULUM, MATERIALS, ENROLLMENTS, OJT & CERTIFICATES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_materials (
  id              TEXT PRIMARY KEY,
  course_id       TEXT NOT NULL,
  course_code     TEXT NOT NULL,
  lesson_id       TEXT NOT NULL,
  lesson_order    INTEGER NOT NULL DEFAULT 1,
  title_vi        TEXT NOT NULL,
  title_en        TEXT NOT NULL,
  description_vi  TEXT,
  description_en  TEXT,
  material_type   TEXT NOT NULL,
  storage_mode    TEXT NOT NULL CHECK (storage_mode IN ('cloudflare_r2', 'external_url', 'local_file')),
  storage_obj_id  TEXT REFERENCES storage_objects(id) ON DELETE SET NULL,
  external_url    TEXT,
  is_free_preview BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  uploaded_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id         TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percent  SMALLINT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  completed_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiz_score        SMALLINT,
  enrolled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS ojt_submissions (
  id               TEXT PRIMARY KEY,
  assignment_id    TEXT NOT NULL,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'revision_requested')),
  submission_notes TEXT NOT NULL,
  storage_obj_id   TEXT REFERENCES storage_objects(id) ON DELETE SET NULL,
  file_name        TEXT,
  file_size_label  TEXT,
  score            SMALLINT,
  feedback         TEXT,
  reviewed_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 5. GLITCH-PROOF BILLING, ORDERS, COUPONS, ENTITLEMENTS & WEBHOOKS
--    (All monetary values stored in INTEGER minor units: VND integer / USD cents)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                  TEXT PRIMARY KEY,
  code                TEXT NOT NULL UNIQUE,
  product_type        TEXT NOT NULL CHECK (product_type IN ('course', 'path_bundle', 'subscription', 'b2b_seats')),
  name_vi             TEXT NOT NULL,
  name_en             TEXT NOT NULL,
  description_vi      TEXT,
  description_en      TEXT,
  price_vnd           BIGINT NOT NULL CHECK (price_vnd >= 0),
  price_usd_cents     INTEGER NOT NULL DEFAULT 0 CHECK (price_usd_cents >= 0),
  billing_cycle       TEXT NOT NULL DEFAULT 'one_time' CHECK (billing_cycle IN ('one_time', 'monthly', 'yearly')),
  duration_days       INTEGER, -- NULL means lifetime
  scope               TEXT NOT NULL CHECK (scope IN ('course', 'path', 'all_access', 'simulator')),
  resource_id         TEXT,    -- course_id or path_id, NULL for all_access
  ai_monthly_quota    INTEGER NOT NULL DEFAULT 50,
  simulator_access    BOOLEAN NOT NULL DEFAULT FALSE,
  min_seats           INTEGER NOT NULL DEFAULT 1,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  code                TEXT PRIMARY KEY,
  discount_type       TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed_vnd')),
  discount_value      BIGINT NOT NULL CHECK (discount_value > 0),
  max_discount_vnd    BIGINT,
  min_order_vnd       BIGINT NOT NULL DEFAULT 0,
  max_uses            INTEGER,
  used_count          INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  starts_at           TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id                  TEXT PRIMARY KEY,
  order_code          TEXT NOT NULL UNIQUE, -- Short bank-transfer-safe code e.g. FC2611A9B2
  idempotency_key     TEXT NOT NULL,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  org_id              TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  product_id          TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  currency            TEXT NOT NULL DEFAULT 'VND' CHECK (currency IN ('VND', 'USD')),
  subtotal_amount     BIGINT NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount     BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  vat_amount          BIGINT NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  total_amount        BIGINT NOT NULL CHECK (total_amount >= 0),
  coupon_code         TEXT REFERENCES coupons(code) ON DELETE SET NULL,
  provider            TEXT NOT NULL CHECK (provider IN ('payos_vietqr', 'momo', 'vnpay', 'stripe', 'sandbox')),
  provider_request_id TEXT,
  provider_tx_id      TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'expired', 'flagged_mismatch', 'paid_late_review', 'refunded')),
  payment_url         TEXT,
  qr_code_data        TEXT,
  invoice_info        JSONB,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at          TIMESTAMPTZ NOT NULL,
  paid_at             TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_exp ON orders(status, expires_at);

CREATE TABLE IF NOT EXISTS entitlements (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id           TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  scope            TEXT NOT NULL CHECK (scope IN ('course', 'path', 'all_access', 'simulator')),
  resource_id      TEXT NOT NULL DEFAULT '*',
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  valid_from       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until      TIMESTAMPTZ,
  source_order_id  TEXT REFERENCES orders(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at       TIMESTAMPTZ,
  UNIQUE(source_order_id, user_id, scope, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_active ON entitlements(user_id, scope, resource_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS webhook_events (
  id                TEXT PRIMARY KEY,
  provider          TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  order_id          TEXT REFERENCES orders(id) ON DELETE SET NULL,
  signature_valid   BOOLEAN NOT NULL,
  processing_status TEXT NOT NULL CHECK (processing_status IN ('processed', 'ignored_duplicate', 'rejected_signature', 'flagged_mismatch', 'error')),
  raw_payload       JSONB NOT NULL,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  action      TEXT NOT NULL,
  actor       TEXT NOT NULL,
  target      TEXT NOT NULL,
  details     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
