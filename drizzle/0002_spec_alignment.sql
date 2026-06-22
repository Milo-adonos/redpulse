-- RedPulse spec alignment v2
DO $$ BEGIN
  CREATE TYPE alert_frequency AS ENUM ('realtime', 'hourly', 'daily', 'weekly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dm_status AS ENUM ('draft', 'pending_review', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE team_settings ADD COLUMN IF NOT EXISTS alert_frequency alert_frequency NOT NULL DEFAULT 'daily';

CREATE TABLE IF NOT EXISTS response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  body text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  discovered_post_id uuid REFERENCES discovered_posts(id),
  comment_id uuid REFERENCES comments(id),
  recipient_username varchar(100) NOT NULL,
  subject varchar(200) NOT NULL,
  body text NOT NULL,
  status dm_status NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
