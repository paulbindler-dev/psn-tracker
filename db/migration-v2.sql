CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE games ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

INSERT INTO users (slug, name) VALUES ('paul', 'Paul') ON CONFLICT (slug) DO NOTHING;
UPDATE games SET user_id = (SELECT id FROM users WHERE slug = 'paul') WHERE user_id IS NULL;
