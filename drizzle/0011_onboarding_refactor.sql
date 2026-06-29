-- User plan & message quotas
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan varchar(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS messages_limit integer NOT NULL DEFAULT 200;
ALTER TABLE users ADD COLUMN IF NOT EXISTS messages_used integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_started_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS messages_reset_at timestamptz;

-- Onboarding session extensions
ALTER TABLE onboarding_sessions ADD COLUMN IF NOT EXISTS scraped_text text;
ALTER TABLE onboarding_sessions ADD COLUMN IF NOT EXISTS competitors jsonb DEFAULT '[]'::jsonb;
ALTER TABLE onboarding_sessions ADD COLUMN IF NOT EXISTS first_name varchar(255);
ALTER TABLE onboarding_sessions ADD COLUMN IF NOT EXISTS last_name varchar(255);
ALTER TABLE onboarding_sessions ADD COLUMN IF NOT EXISTS email varchar(255);

-- Project competitors
ALTER TABLE projects ADD COLUMN IF NOT EXISTS competitors jsonb DEFAULT '[]'::jsonb;
