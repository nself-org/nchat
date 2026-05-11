-- Rollback: 20260204000010_source_account_rls
-- Drops source_account_id RLS policies from the 11 nchat core tables.

BEGIN;

DROP POLICY IF EXISTS rls_nchat_reactions_source_account ON nchat_reactions;
DROP POLICY IF EXISTS rls_nchat_thread_members_source_account ON nchat_thread_members;
DROP POLICY IF EXISTS rls_nchat_threads_source_account ON nchat_threads;
DROP POLICY IF EXISTS rls_nchat_messages_source_account ON nchat_messages;
DROP POLICY IF EXISTS rls_nchat_channel_members_source_account ON nchat_channel_members;
DROP POLICY IF EXISTS rls_nchat_channels_source_account ON nchat_channels;
DROP POLICY IF EXISTS rls_nchat_workspaces_source_account ON nchat_workspaces;
DROP POLICY IF EXISTS rls_nchat_user_settings_source_account ON nchat_user_settings;
DROP POLICY IF EXISTS rls_nchat_presence_source_account ON nchat_presence;
DROP POLICY IF EXISTS rls_nchat_profiles_source_account ON nchat_profiles;
DROP POLICY IF EXISTS rls_nchat_users_source_account ON nchat_users;

DROP FUNCTION IF EXISTS app.current_source_account_id();

COMMIT;
