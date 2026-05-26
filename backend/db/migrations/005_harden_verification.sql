-- Migration 005: Security Hardening (The Fortress Upgrade)
-- Upgrades verification system with hashing and expiry, and adds audit logging.

-- 1. Upgrade Users Table
ALTER TABLE users RENAME COLUMN verification_token TO verification_token_hash;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;

-- 2. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type  VARCHAR(255) NOT NULL, -- e.g., 'verify_success', 'verify_fail', 'rate_limit_tripped'
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type);
