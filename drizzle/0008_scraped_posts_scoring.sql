-- Scoring columns for scraped posts (discovered_posts table)
ALTER TABLE discovered_posts
  ADD COLUMN IF NOT EXISTS relevance_section VARCHAR(20),
  ADD COLUMN IF NOT EXISTS relevance_reason TEXT;
