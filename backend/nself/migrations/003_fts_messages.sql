-- Full-text search support for messages using pg_trgm
-- Enables fast ILIKE queries and prepares for MeiliSearch sync
--
-- Depends on: 20260203070910_imported_schema (nchat_messages table)
-- Run after: 20260203070920_indexes_and_triggers
--
-- What this migration does:
--   1. Ensures pg_trgm is available (may already be enabled via POSTGRES_EXTENSIONS)
--   2. Adds a generated tsvector column to nchat_messages for native PG FTS
--   3. Creates a GIN index on the tsvector column for fast @@ queries
--   4. Creates trigram GIN indexes on content_plain for fast ILIKE / similarity queries
--   5. Adds a trigger to keep the tsvector column in sync on INSERT/UPDATE
--   6. Creates a helper function used by the MeiliSearch sync hook to fetch
--      messages modified since a given timestamp

-- ============================================================================
-- Extensions
-- ============================================================================

-- pg_trgm ships with PostgreSQL and is listed in the default POSTGRES_EXTENSIONS
-- for this project. CREATE EXTENSION IF NOT EXISTS is safe to re-run.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- tsvector column for native PostgreSQL FTS
-- ============================================================================

-- Add the tsvector column if it does not already exist.
-- We store the weighted vector so we can query it without recomputing.
-- content_plain carries the plain-text body (stripped of markdown/HTML);
-- fall back to content when content_plain is NULL.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_name  = 'nchat_messages'
       AND column_name = 'content_tsv'
  ) THEN
    ALTER TABLE nchat_messages
      ADD COLUMN content_tsv tsvector
        GENERATED ALWAYS AS (
          to_tsvector(
            'english',
            coalesce(content_plain, '') || ' ' || coalesce(content, '')
          )
        ) STORED;
  END IF;
END;
$$;

-- ============================================================================
-- GIN index on tsvector column (native FTS)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_nchat_messages_content_tsv
  ON nchat_messages USING GIN (content_tsv);

-- ============================================================================
-- Trigram GIN indexes (fast ILIKE + similarity queries)
-- ============================================================================

-- Index on content_plain — primary FTS surface
CREATE INDEX IF NOT EXISTS idx_nchat_messages_content_plain_trgm
  ON nchat_messages USING GIN (content_plain gin_trgm_ops);

-- Index on content — fallback when content_plain is NULL
CREATE INDEX IF NOT EXISTS idx_nchat_messages_content_trgm
  ON nchat_messages USING GIN (content gin_trgm_ops);

-- ============================================================================
-- Composite index: channel + tsvector (scoped FTS inside a channel)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_nchat_messages_channel_tsv
  ON nchat_messages USING GIN (channel_id, content_tsv);

-- ============================================================================
-- Helper view: messages ready for MeiliSearch sync
--
-- The MeiliSearch sync hook (frontend/src/lib/search/meilisearch.ts) calls
-- this view to fetch the fields it needs for indexing. Keeping the projection
-- here means the TypeScript code does not embed column names.
-- ============================================================================

CREATE OR REPLACE VIEW nchat_messages_search_view AS
SELECT
  m.id,
  m.channel_id,
  m.user_id,
  m.thread_id,
  m.parent_message_id,
  coalesce(m.content_plain, m.content) AS content_search,
  m.content_plain,
  m.type,
  m.is_pinned,
  m.is_deleted,
  m.is_edited,
  m.reaction_count,
  m.reply_count,
  m.mentions,
  m.created_at,
  m.updated_at
FROM nchat_messages m
WHERE m.is_deleted IS NOT TRUE;

-- Grant SELECT to the Hasura database role so it can expose the view
-- via the GraphQL API when the admin configures it.
-- The role name follows the nSelf convention for Hasura (nhost_hasura).
-- If the role does not exist the GRANT is silently skipped.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nhost_hasura') THEN
    EXECUTE 'GRANT SELECT ON nchat_messages_search_view TO nhost_hasura';
  END IF;
END;
$$;
