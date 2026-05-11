-- Migration 20260204000000: Add source_account_id to nchat core tables
-- F-NCHAT-01 remediation — Wave 5B Multi-Tenant Wall
-- Adds source_account_id TEXT NOT NULL DEFAULT 'primary' to the 11 nchat core tables
-- that participate in multi-app isolation (PatternUserOwned convention).
--
-- Tables targeted (core message-passing + user identity tables):
--   nchat_users, nchat_profiles, nchat_presence, nchat_user_settings,
--   nchat_channels, nchat_channel_members, nchat_messages,
--   nchat_threads, nchat_thread_members, nchat_reactions, nchat_workspaces
--
-- Excluded (workspace-level config, not per-app-tenant data):
--   nchat_plans, nchat_permissions, nchat_app_configuration, nchat_sessions,
--   nchat_push_subscriptions, nchat_bots, nchat_webhooks, nchat_incoming_webhooks,
--   nchat_integrations, nchat_search_index, nchat_audit_logs, nchat_bookmarks,
--   nchat_pinned_messages, nchat_custom_emojis, nchat_categories, nchat_roles,
--   nchat_user_roles, nchat_workspace_members, nchat_workspace_invites,
--   nchat_invoices, nchat_subscriptions, nchat_media, nchat_attachments,
--   nchat_notifications

BEGIN;

-- ============================================================================
-- nchat_users
-- ============================================================================

ALTER TABLE nchat_users
    ADD COLUMN IF NOT EXISTS source_account_id TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS idx_nchat_users_source_account
    ON nchat_users (source_account_id, created_at DESC);

-- ============================================================================
-- nchat_profiles
-- ============================================================================

ALTER TABLE nchat_profiles
    ADD COLUMN IF NOT EXISTS source_account_id TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS idx_nchat_profiles_source_account
    ON nchat_profiles (source_account_id);

-- ============================================================================
-- nchat_presence
-- ============================================================================

ALTER TABLE nchat_presence
    ADD COLUMN IF NOT EXISTS source_account_id TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS idx_nchat_presence_source_account
    ON nchat_presence (source_account_id);

-- ============================================================================
-- nchat_user_settings
-- ============================================================================

ALTER TABLE nchat_user_settings
    ADD COLUMN IF NOT EXISTS source_account_id TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS idx_nchat_user_settings_source_account
    ON nchat_user_settings (source_account_id);

-- ============================================================================
-- nchat_workspaces
-- ============================================================================

ALTER TABLE nchat_workspaces
    ADD COLUMN IF NOT EXISTS source_account_id TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS idx_nchat_workspaces_source_account
    ON nchat_workspaces (source_account_id, created_at DESC);

-- ============================================================================
-- nchat_channels
-- ============================================================================

ALTER TABLE nchat_channels
    ADD COLUMN IF NOT EXISTS source_account_id TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS idx_nchat_channels_source_account
    ON nchat_channels (source_account_id, created_at DESC);

-- ============================================================================
-- nchat_channel_members
-- ============================================================================

ALTER TABLE nchat_channel_members
    ADD COLUMN IF NOT EXISTS source_account_id TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS idx_nchat_channel_members_source_account
    ON nchat_channel_members (source_account_id, joined_at DESC);

-- ============================================================================
-- nchat_messages
-- ============================================================================

ALTER TABLE nchat_messages
    ADD COLUMN IF NOT EXISTS source_account_id TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS idx_nchat_messages_source_account
    ON nchat_messages (source_account_id, created_at DESC);

-- ============================================================================
-- nchat_threads
-- ============================================================================

ALTER TABLE nchat_threads
    ADD COLUMN IF NOT EXISTS source_account_id TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS idx_nchat_threads_source_account
    ON nchat_threads (source_account_id, created_at DESC);

-- ============================================================================
-- nchat_thread_members
-- ============================================================================

ALTER TABLE nchat_thread_members
    ADD COLUMN IF NOT EXISTS source_account_id TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS idx_nchat_thread_members_source_account
    ON nchat_thread_members (source_account_id, joined_at DESC);

-- ============================================================================
-- nchat_reactions
-- ============================================================================

ALTER TABLE nchat_reactions
    ADD COLUMN IF NOT EXISTS source_account_id TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS idx_nchat_reactions_source_account
    ON nchat_reactions (source_account_id, created_at DESC);

COMMIT;
