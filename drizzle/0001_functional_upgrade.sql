-- Migration manuelle pour passer au schéma fonctionnel v2
-- Exécuter sur Railway si db:push échoue

ALTER TABLE discovered_posts ADD COLUMN IF NOT EXISTS permalink text;
ALTER TABLE discovered_posts ADD COLUMN IF NOT EXISTS intent_score numeric(3,2);
ALTER TABLE discovered_posts ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

ALTER TABLE comments ADD COLUMN IF NOT EXISTS ban_risk_score numeric(3,2);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  site_url text NOT NULL,
  description text NOT NULL,
  keywords jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS projects_team_idx ON projects(team_id);

CREATE TABLE IF NOT EXISTS project_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_token varchar(64) NOT NULL UNIQUE,
  project_name varchar(255) NOT NULL,
  site_url text NOT NULL,
  description text NOT NULL,
  invites jsonb DEFAULT '[]',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  role role NOT NULL DEFAULT 'viewer',
  token varchar(64) NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_settings (
  team_id uuid PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  replies_per_hour integer NOT NULL DEFAULT 10,
  posts_per_day integer NOT NULL DEFAULT 3,
  max_ban_risk numeric(3,2) NOT NULL DEFAULT 0.60,
  char_limit integer NOT NULL DEFAULT 400,
  warmup_enabled boolean NOT NULL DEFAULT false,
  warmup_actions_per_day integer NOT NULL DEFAULT 3,
  warmup_comments_per_week integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index composite team + reddit (drop ancienne contrainte unique globale si présente)
DROP INDEX IF EXISTS discovered_posts_reddit_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS discovered_posts_team_reddit_idx ON discovered_posts(team_id, reddit_id);
