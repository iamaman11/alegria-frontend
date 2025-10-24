-- Create unique index on (tag, cache_key) for efficient lookups and upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_tags_tag_key ON cache_tags(tag, cache_key);

-- Create index on tag for fast tag lookups
CREATE INDEX IF NOT EXISTS idx_cache_tags_tag ON cache_tags(tag);

-- Create index on created_at for cleanup by age
CREATE INDEX IF NOT EXISTS idx_cache_tags_created_at ON cache_tags(created_at);
