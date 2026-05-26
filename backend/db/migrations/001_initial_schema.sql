-- Kenyx Platform — Complete Database Schema
-- Run on NeonDB (PostgreSQL) to initialize all tables

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(32) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  avatar_url  TEXT DEFAULT '',
  bio         TEXT DEFAULT '',
  role        VARCHAR(16) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  reputation  INT DEFAULT 0,
  streak      INT DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ─── Tags ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tags (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(64) UNIQUE NOT NULL,
  slug VARCHAR(64) UNIQUE NOT NULL
);

-- Insert default tags
INSERT INTO tags (name, slug) VALUES
  ('Arrays', 'arrays'),
  ('Dynamic Programming', 'dynamic-programming'),
  ('Graphs', 'graphs'),
  ('Trees', 'trees'),
  ('Strings', 'strings'),
  ('Hash Tables', 'hash-tables'),
  ('Binary Search', 'binary-search'),
  ('Two Pointers', 'two-pointers'),
  ('Sliding Window', 'sliding-window'),
  ('Backtracking', 'backtracking'),
  ('Math', 'math'),
  ('Greedy', 'greedy'),
  ('Stack', 'stack'),
  ('Queue', 'queue'),
  ('Linked List', 'linked-list'),
  ('Sorting', 'sorting'),
  ('Bit Manipulation', 'bit-manipulation'),
  ('Recursion', 'recursion')
ON CONFLICT (slug) DO NOTHING;

-- ─── Problems ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS problems (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(128) UNIQUE NOT NULL,
  title         VARCHAR(256) NOT NULL,
  description   TEXT NOT NULL,
  constraints   TEXT DEFAULT '',
  input_format  TEXT DEFAULT '',
  output_format TEXT DEFAULT '',
  difficulty    VARCHAR(8) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status        VARCHAR(16) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  creator_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  likes         INT DEFAULT 0,
  solves        INT DEFAULT 0,
  acceptance    FLOAT DEFAULT 0.0,
  is_daily      BOOLEAN DEFAULT false,
  rejection_note TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_problems_slug ON problems(slug);
CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_creator ON problems(creator_id);
CREATE INDEX IF NOT EXISTS idx_problems_daily ON problems(is_daily) WHERE is_daily = true;

-- ─── Problem Tags (junction) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS problem_tags (
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  tag_id     UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (problem_id, tag_id)
);

-- ─── Test Cases ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS test_cases (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  input      TEXT NOT NULL,
  expected   TEXT NOT NULL,
  is_sample  BOOLEAN DEFAULT false,
  order_num  INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_test_cases_problem ON test_cases(problem_id);

-- ─── Submissions ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  problem_id   UUID REFERENCES problems(id) ON DELETE SET NULL,
  language     VARCHAR(32) NOT NULL,
  code         TEXT NOT NULL,
  status       VARCHAR(32) DEFAULT 'queued' CHECK (
    status IN ('queued','running','accepted','wrong_answer',
               'time_limit_exceeded','memory_limit_exceeded',
               'runtime_error','compile_error')
  ),
  runtime_ms   INT DEFAULT 0,
  memory_kb    INT DEFAULT 0,
  passed_cases INT DEFAULT 0,
  total_cases  INT DEFAULT 0,
  error_msg    TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- ─── Problem Likes ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS problem_likes (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, problem_id)
);

-- ─── Problem Ratings ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS problem_ratings (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, problem_id)
);

-- ─── User Stats ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_stats (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  problems_solved INT DEFAULT 0,
  easy_solved     INT DEFAULT 0,
  medium_solved   INT DEFAULT 0,
  hard_solved     INT DEFAULT 0,
  total_score     INT DEFAULT 0,
  rank            INT,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Battles ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS battles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id  UUID REFERENCES problems(id) ON DELETE SET NULL,
  player1_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  player2_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  winner_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  status      VARCHAR(16) DEFAULT 'waiting' CHECK (status IN ('waiting','active','finished')),
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);

-- ─── Helper Views ─────────────────────────────────────────────────────────────

-- Problem list view with creator info and tags
CREATE OR REPLACE VIEW problem_list AS
SELECT
  p.id, p.slug, p.title, p.difficulty, p.status,
  p.likes, p.solves, p.acceptance, p.is_daily,
  p.created_at,
  u.username AS creator_name,
  COALESCE(
    json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
    FILTER (WHERE t.id IS NOT NULL),
    '[]'
  ) AS tags
FROM problems p
LEFT JOIN users u ON u.id = p.creator_id
LEFT JOIN problem_tags pt ON pt.problem_id = p.id
LEFT JOIN tags t ON t.id = pt.tag_id
GROUP BY p.id, u.username;

-- ─── Functions & Triggers ─────────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS problems_updated_at ON problems;
CREATE TRIGGER problems_updated_at
  BEFORE UPDATE ON problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update problem acceptance rate after submission
CREATE OR REPLACE FUNCTION update_acceptance_rate()
RETURNS TRIGGER AS $$
DECLARE
  total_count INT;
  accepted_count INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM submissions WHERE problem_id = NEW.problem_id;
  SELECT COUNT(*) INTO accepted_count FROM submissions WHERE problem_id = NEW.problem_id AND status = 'accepted';
  IF total_count > 0 THEN
    UPDATE problems SET acceptance = (accepted_count::FLOAT / total_count) WHERE id = NEW.problem_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS submission_acceptance_update ON submissions;
CREATE TRIGGER submission_acceptance_update
  AFTER INSERT OR UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_acceptance_rate();

-- Initialize user_stats row on user creation
CREATE OR REPLACE FUNCTION create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_stats_init ON users;
CREATE TRIGGER user_stats_init
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_stats();
