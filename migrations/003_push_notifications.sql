-- Migration 003: Web push notifications
-- Run once in Neon console or via API

-- 1. Add notify column to games
ALTER TABLE games ADD COLUMN IF NOT EXISTS notify BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
