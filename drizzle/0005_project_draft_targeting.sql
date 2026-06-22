ALTER TABLE "project_drafts" ADD COLUMN IF NOT EXISTS "keywords" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "project_drafts" ADD COLUMN IF NOT EXISTS "subreddits" jsonb DEFAULT '[]'::jsonb;
