-- Extend message types for Influence and Posts sections
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'influence';
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'post';

-- Product prompt (injected in all Claude generations)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS product_prompt text;
ALTER TABLE project_drafts ADD COLUMN IF NOT EXISTS product_prompt text;

-- Post metadata from Reddit JSON
ALTER TABLE discovered_posts ADD COLUMN IF NOT EXISTS flair text;
ALTER TABLE discovered_posts ADD COLUMN IF NOT EXISTS relevance_score integer;
ALTER TABLE discovered_posts ADD COLUMN IF NOT EXISTS section_scores jsonb;

-- Generated message metadata
ALTER TABLE generated_messages ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE generated_messages ADD COLUMN IF NOT EXISTS contains_url boolean DEFAULT false;
ALTER TABLE generated_messages ADD COLUMN IF NOT EXISTS reddit_score integer;

-- Per-section relevance minimums (0-100)
ALTER TABLE team_settings ADD COLUMN IF NOT EXISTS reply_min_score integer NOT NULL DEFAULT 80;
ALTER TABLE team_settings ADD COLUMN IF NOT EXISTS warmup_min_score integer NOT NULL DEFAULT 40;
ALTER TABLE team_settings ADD COLUMN IF NOT EXISTS influence_min_score integer NOT NULL DEFAULT 65;

-- Scraped comments on posts
CREATE TABLE IF NOT EXISTS scraped_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  discovered_post_id uuid NOT NULL REFERENCES discovered_posts(id) ON DELETE CASCADE,
  reddit_id varchar(20) NOT NULL,
  author varchar(100),
  body text,
  score integer DEFAULT 0,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(discovered_post_id, reddit_id)
);
