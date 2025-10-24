-- Create cache_tags table with PRIMARY KEY for upsert operations
-- If table exists, this migration should be run separately with ALTER TABLE
CREATE TABLE IF NOT EXISTS cache_tags (
  tag TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tag, cache_key)
);

-- Create index on tag for fast tag lookups
CREATE INDEX IF NOT EXISTS idx_cache_tags_tag ON cache_tags(tag);

-- Create index on created_at for cleanup by age
CREATE INDEX IF NOT EXISTS idx_cache_tags_created_at ON cache_tags(created_at);
