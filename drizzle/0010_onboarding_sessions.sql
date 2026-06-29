-- Onboarding sessions + plan enum values
ALTER TYPE plan ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE plan ADD VALUE IF NOT EXISTS 'growth';

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  product_name varchar(255),
  tagline text,
  problem_solved text,
  target_audience text,
  key_features jsonb DEFAULT '[]'::jsonb,
  tone varchar(50),
  product_prompt text,
  suggested_subreddits jsonb DEFAULT '[]'::jsonb,
  suggested_keywords jsonb DEFAULT '[]'::jsonb,
  project_name varchar(255),
  plan varchar(20),
  stripe_session_id varchar(255),
  paid boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_sessions_stripe_idx
  ON onboarding_sessions (stripe_session_id);
