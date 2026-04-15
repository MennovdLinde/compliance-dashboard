-- ============================================================
-- Compliance Dashboard Schema (cd_ prefix to avoid conflicts)
-- ============================================================

-- Users (JWT auth, RBAC)
CREATE TABLE IF NOT EXISTS cd_users (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'auditor', 'viewer')),
  full_name   TEXT NOT NULL,
  company     TEXT NOT NULL DEFAULT 'HelvetiaSaaS AG',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance frameworks (gdpr, iso27001, hipaa)
CREATE TABLE IF NOT EXISTS cd_frameworks (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  version     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Controls within each framework
CREATE TABLE IF NOT EXISTS cd_controls (
  id             SERIAL PRIMARY KEY,
  framework_id   INTEGER NOT NULL REFERENCES cd_frameworks(id) ON DELETE CASCADE,
  ref_code       TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  category       TEXT,
  status         TEXT NOT NULL DEFAULT 'not_assessed'
                   CHECK (status IN ('compliant', 'partial', 'non_compliant', 'not_applicable', 'not_assessed')),
  owner          TEXT,
  evidence       TEXT,
  notes          TEXT,
  last_reviewed  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk register
CREATE TABLE IF NOT EXISTS cd_risks (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT,
  likelihood   INTEGER NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  impact       INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
  risk_score   INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,
  status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'mitigated', 'accepted', 'closed')),
  owner        TEXT,
  mitigation   TEXT,
  due_date     DATE,
  framework_id INTEGER REFERENCES cd_frameworks(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable audit log — BIGSERIAL for gap detection
CREATE TABLE IF NOT EXISTS cd_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    INTEGER REFERENCES cd_users(id),
  actor_email TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  detail      JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated reports
CREATE TABLE IF NOT EXISTS cd_reports (
  id           SERIAL PRIMARY KEY,
  framework_id INTEGER REFERENCES cd_frameworks(id),
  title        TEXT NOT NULL,
  generated_by INTEGER REFERENCES cd_users(id),
  score        NUMERIC(5,2),
  summary      JSONB,
  pdf_url      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cd_controls_framework ON cd_controls(framework_id);
CREATE INDEX IF NOT EXISTS idx_cd_controls_status    ON cd_controls(status);
CREATE INDEX IF NOT EXISTS idx_cd_risks_status       ON cd_risks(status);
CREATE INDEX IF NOT EXISTS idx_cd_audit_log_actor    ON cd_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_cd_audit_log_created  ON cd_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cd_audit_log_action   ON cd_audit_log(action);
