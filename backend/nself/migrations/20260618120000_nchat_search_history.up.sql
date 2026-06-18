-- Migration: nchat_search_history (P3 Wave B2)
-- Tracks per-user search queries for history, suggestions, and analytics.
-- Multi-app isolation: source_account_id (Convention Wall — NOT tenant_id).
-- RLS: users see only their own rows within their source_account_id.

CREATE TABLE IF NOT EXISTS nchat_search_history (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  source_account_id TEXT     NOT NULL DEFAULT 'primary',
  user_id        UUID        NOT NULL,
  query          TEXT        NOT NULL,
  result_count   INT         NOT NULL DEFAULT 0,
  filters        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT nchat_search_history_pkey PRIMARY KEY (id)
);

-- Index: most-recent searches per user (for history/autocomplete)
CREATE INDEX IF NOT EXISTS idx_nchat_search_history_user_created
  ON nchat_search_history (user_id, created_at DESC);

-- Index: account-scoped bulk reads (moderation / analytics)
CREATE INDEX IF NOT EXISTS idx_nchat_search_history_account
  ON nchat_search_history (source_account_id, created_at DESC);

-- Enable Row-Level Security
ALTER TABLE nchat_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE nchat_search_history FORCE ROW LEVEL SECURITY;

-- Policy: users can only read their own rows within their account
DROP POLICY IF EXISTS nchat_search_history_user_select ON nchat_search_history;
CREATE POLICY nchat_search_history_user_select
  ON nchat_search_history
  FOR SELECT
  USING (
    source_account_id = current_setting('app.source_account_id', true)
    AND user_id = current_setting('app.user_id', true)::UUID
  );

-- Policy: users can insert their own rows within their account
DROP POLICY IF EXISTS nchat_search_history_user_insert ON nchat_search_history;
CREATE POLICY nchat_search_history_user_insert
  ON nchat_search_history
  FOR INSERT
  WITH CHECK (
    source_account_id = current_setting('app.source_account_id', true)
    AND user_id = current_setting('app.user_id', true)::UUID
  );

-- Policy: users can delete their own history rows
DROP POLICY IF EXISTS nchat_search_history_user_delete ON nchat_search_history;
CREATE POLICY nchat_search_history_user_delete
  ON nchat_search_history
  FOR DELETE
  USING (
    source_account_id = current_setting('app.source_account_id', true)
    AND user_id = current_setting('app.user_id', true)::UUID
  );

-- Admin unrestricted access
DROP POLICY IF EXISTS nchat_search_history_admin ON nchat_search_history;
CREATE POLICY nchat_search_history_admin
  ON nchat_search_history
  USING (current_setting('app.role', true) = 'admin');
