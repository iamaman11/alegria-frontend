-- Fix cache_tags table: replace UNIQUE INDEX with PRIMARY KEY for ON CONFLICT support
-- This migration handles existing production tables

-- Step 1: Create new table with correct PRIMARY KEY
CREATE TABLE IF NOT EXISTS cache_tags_new (
  tag TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tag, cache_key)
);

-- Step 2: Copy data from old table if it exists
INSERT OR IGNORE INTO cache_tags_new (tag, cache_key, created_at)
SELECT tag, cache_key, created_at FROM cache_tags
WHERE tag IS NOT NULL AND cache_key IS NOT NULL;

-- Step 3: Drop old table
DROP TABLE IF EXISTS cache_tags;

-- Step 4: Rename new table to original name
ALTER TABLE cache_tags_new RENAME TO cache_tags;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_cache_tags_tag ON cache_tags(tag);
CREATE INDEX IF NOT EXISTS idx_cache_tags_created_at ON cache_tags(created_at);
