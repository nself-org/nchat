-- Rollback: 20260204000000_add_source_account_id
-- Removes source_account_id column and its indexes from the 11 nchat core tables.
-- WARNING: This is irreversible if data has been written with non-'primary' values.

BEGIN;

-- nchat_reactions
DROP INDEX IF EXISTS idx_nchat_reactions_source_account;
ALTER TABLE nchat_reactions DROP COLUMN IF EXISTS source_account_id;

-- nchat_thread_members
DROP INDEX IF EXISTS idx_nchat_thread_members_source_account;
ALTER TABLE nchat_thread_members DROP COLUMN IF EXISTS source_account_id;

-- nchat_threads
DROP INDEX IF EXISTS idx_nchat_threads_source_account;
ALTER TABLE nchat_threads DROP COLUMN IF EXISTS source_account_id;

-- nchat_messages
DROP INDEX IF EXISTS idx_nchat_messages_source_account;
ALTER TABLE nchat_messages DROP COLUMN IF EXISTS source_account_id;

-- nchat_channel_members
DROP INDEX IF EXISTS idx_nchat_channel_members_source_account;
ALTER TABLE nchat_channel_members DROP COLUMN IF EXISTS source_account_id;

-- nchat_channels
DROP INDEX IF EXISTS idx_nchat_channels_source_account;
ALTER TABLE nchat_channels DROP COLUMN IF EXISTS source_account_id;

-- nchat_workspaces
DROP INDEX IF EXISTS idx_nchat_workspaces_source_account;
ALTER TABLE nchat_workspaces DROP COLUMN IF EXISTS source_account_id;

-- nchat_user_settings
DROP INDEX IF EXISTS idx_nchat_user_settings_source_account;
ALTER TABLE nchat_user_settings DROP COLUMN IF EXISTS source_account_id;

-- nchat_presence
DROP INDEX IF EXISTS idx_nchat_presence_source_account;
ALTER TABLE nchat_presence DROP COLUMN IF EXISTS source_account_id;

-- nchat_profiles
DROP INDEX IF EXISTS idx_nchat_profiles_source_account;
ALTER TABLE nchat_profiles DROP COLUMN IF EXISTS source_account_id;

-- nchat_users
DROP INDEX IF EXISTS idx_nchat_users_source_account;
ALTER TABLE nchat_users DROP COLUMN IF EXISTS source_account_id;

COMMIT;
