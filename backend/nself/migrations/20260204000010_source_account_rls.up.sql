-- Migration 20260204000010: RLS policies for source_account_id on nchat core tables
-- F-NCHAT-01 remediation — Wave 5B Multi-Tenant Wall
-- Enforces source_account_id isolation via Row Level Security (PatternUserOwned).
-- Depends on: 20260204000000_add_source_account_id.up.sql
--
-- IMPORTANT: These policies run IN ADDITION TO the existing user-level RLS from
-- 20260203070940_rls_policies.up.sql. They add a source_account_id filter so
-- data from one nSelf deploy's "source app" cannot leak to another's.
-- The existing hasura.user.id check already exists; this migration adds the
-- multi-app isolation layer on top.

BEGIN;

-- ============================================================================
-- Helper: source_account_id guard function
-- ============================================================================

CREATE OR REPLACE FUNCTION app.current_source_account_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_source_account_id', true), '');
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION app.current_source_account_id() IS
  'Returns the current source_account_id GUC value, or NULL if unset/empty. '
  'FAIL-CLOSED CONTRACT: when NULL is returned, the RLS predicate '
  '(source_account_id = app.current_source_account_id()) evaluates to NULL '
  '(not TRUE), so NO rows are returned. This prevents data exposure in raw '
  'psql sessions, migration runners, and Hasura admin-role contexts where the '
  'GUC is not set. DO NOT add a COALESCE fallback — that would re-open the bypass.';

-- ============================================================================
-- nchat_users — source_account_id isolation
-- ============================================================================

ALTER TABLE nchat_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_nchat_users_source_account ON nchat_users;
CREATE POLICY rls_nchat_users_source_account ON nchat_users
    USING (source_account_id = app.current_source_account_id());

-- ============================================================================
-- nchat_profiles
-- ============================================================================

ALTER TABLE nchat_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_nchat_profiles_source_account ON nchat_profiles;
CREATE POLICY rls_nchat_profiles_source_account ON nchat_profiles
    USING (source_account_id = app.current_source_account_id());

-- ============================================================================
-- nchat_presence
-- ============================================================================

ALTER TABLE nchat_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_nchat_presence_source_account ON nchat_presence;
CREATE POLICY rls_nchat_presence_source_account ON nchat_presence
    USING (source_account_id = app.current_source_account_id());

-- ============================================================================
-- nchat_user_settings
-- ============================================================================

ALTER TABLE nchat_user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_nchat_user_settings_source_account ON nchat_user_settings;
CREATE POLICY rls_nchat_user_settings_source_account ON nchat_user_settings
    USING (source_account_id = app.current_source_account_id());

-- ============================================================================
-- nchat_workspaces
-- ============================================================================

ALTER TABLE nchat_workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_nchat_workspaces_source_account ON nchat_workspaces;
CREATE POLICY rls_nchat_workspaces_source_account ON nchat_workspaces
    USING (source_account_id = app.current_source_account_id());

-- ============================================================================
-- nchat_channels
-- ============================================================================

ALTER TABLE nchat_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_nchat_channels_source_account ON nchat_channels;
CREATE POLICY rls_nchat_channels_source_account ON nchat_channels
    USING (source_account_id = app.current_source_account_id());

-- ============================================================================
-- nchat_channel_members
-- ============================================================================

ALTER TABLE nchat_channel_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_nchat_channel_members_source_account ON nchat_channel_members;
CREATE POLICY rls_nchat_channel_members_source_account ON nchat_channel_members
    USING (source_account_id = app.current_source_account_id());

-- ============================================================================
-- nchat_messages
-- ============================================================================

ALTER TABLE nchat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_nchat_messages_source_account ON nchat_messages;
CREATE POLICY rls_nchat_messages_source_account ON nchat_messages
    USING (source_account_id = app.current_source_account_id());

-- ============================================================================
-- nchat_threads
-- ============================================================================

ALTER TABLE nchat_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_nchat_threads_source_account ON nchat_threads;
CREATE POLICY rls_nchat_threads_source_account ON nchat_threads
    USING (source_account_id = app.current_source_account_id());

-- ============================================================================
-- nchat_thread_members
-- ============================================================================

ALTER TABLE nchat_thread_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_nchat_thread_members_source_account ON nchat_thread_members;
CREATE POLICY rls_nchat_thread_members_source_account ON nchat_thread_members
    USING (source_account_id = app.current_source_account_id());

-- ============================================================================
-- nchat_reactions
-- ============================================================================

ALTER TABLE nchat_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_nchat_reactions_source_account ON nchat_reactions;
CREATE POLICY rls_nchat_reactions_source_account ON nchat_reactions
    USING (source_account_id = app.current_source_account_id());

COMMIT;
