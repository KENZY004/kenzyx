-- Migration 003: Add Notifications Table
-- Enables persistent, asynchronous alerts for users (e.g., problem approval/rejection)

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  message     TEXT DEFAULT '',
  type        VARCHAR(32) DEFAULT 'info' CHECK (type IN ('success', 'info', 'warning', 'danger')),
  link        TEXT DEFAULT '',
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_all ON notifications(user_id, created_at DESC);
