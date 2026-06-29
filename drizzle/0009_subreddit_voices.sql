CREATE TABLE IF NOT EXISTS subreddit_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subreddit VARCHAR(100) NOT NULL,
  voice_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_size INTEGER NOT NULL DEFAULT 0,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, subreddit)
);

CREATE INDEX IF NOT EXISTS subreddit_voices_project_idx
  ON subreddit_voices(project_id);
