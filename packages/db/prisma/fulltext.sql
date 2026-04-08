-- Optional PostgreSQL full text strategy.
-- Run this script manually after first migration.

ALTER TABLE "Post"
ADD COLUMN IF NOT EXISTS "searchVector" tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("content", '')), 'B')
) STORED;

CREATE INDEX IF NOT EXISTS "Post_searchVector_idx"
ON "Post"
USING GIN ("searchVector");
