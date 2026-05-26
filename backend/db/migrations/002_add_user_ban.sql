-- Add ban support to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Banned users cannot login (enforced at API level)
-- This is a soft-ban: their data (submissions, problems) is preserved
-- Use DELETE to permanently remove a user + all their data
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned) WHERE is_banned = true;
