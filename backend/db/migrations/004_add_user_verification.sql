-- Migration 004: Add User Verification
-- Tracks which users have verified their email addresses

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);

-- Pre-verify existing users so they don't get locked out
UPDATE users SET is_verified = true WHERE is_verified IS NULL OR is_verified = false;

-- Add index for token lookups during verification
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
