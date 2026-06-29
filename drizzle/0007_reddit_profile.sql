CREATE TABLE IF NOT EXISTS team_reddit_profiles (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  profile_url TEXT NOT NULL,
  username VARCHAR(100) NOT NULL,
  total_karma INTEGER NOT NULL DEFAULT 0,
  link_karma INTEGER NOT NULL DEFAULT 0,
  comment_karma INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER,
  comment_count INTEGER,
  active_subreddits JSONB DEFAULT '[]'::jsonb,
  account_created_at TIMESTAMPTZ,
  baseline_karma INTEGER,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reddit_karma_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  total_karma INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reddit_karma_snapshots_team_recorded_idx
  ON reddit_karma_snapshots(team_id, recorded_at DESC);
