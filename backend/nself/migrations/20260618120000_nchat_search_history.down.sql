-- Rollback: nchat_search_history (P3 Wave B2)

DROP POLICY IF EXISTS nchat_search_history_admin        ON nchat_search_history;
DROP POLICY IF EXISTS nchat_search_history_user_delete  ON nchat_search_history;
DROP POLICY IF EXISTS nchat_search_history_user_insert  ON nchat_search_history;
DROP POLICY IF EXISTS nchat_search_history_user_select  ON nchat_search_history;

DROP INDEX IF EXISTS idx_nchat_search_history_account;
DROP INDEX IF EXISTS idx_nchat_search_history_user_created;

DROP TABLE IF EXISTS nchat_search_history;
