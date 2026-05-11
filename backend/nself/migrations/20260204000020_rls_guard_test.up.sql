-- Migration 20260204000020: RLS fail-closed guard test
-- Verifies app.current_source_account_id() is fail-closed (returns NULL when GUC unset)
-- and that source_account_id RLS policies block cross-tenant and unauthenticated access.
--
-- This migration is a self-contained test that ALWAYS rolls back — no test data is committed.
-- It RAISES EXCEPTION on any assertion failure, causing the migration runner to abort (which
-- is the desired behaviour: a failing guard test must block deployment).
--
-- Run standalone: psql -v ON_ERROR_STOP=1 -f this_file.sql

BEGIN;

-- ============================================================================
-- Setup: minimal test table that mirrors the RLS pattern
-- ============================================================================

CREATE TEMP TABLE _rls_guard_test_table (
    id          SERIAL PRIMARY KEY,
    source_account_id TEXT NOT NULL DEFAULT 'primary',
    payload     TEXT
) ON COMMIT DELETE ROWS;

ALTER TABLE _rls_guard_test_table ENABLE ROW LEVEL SECURITY;

-- Mirror the same policy pattern used on production tables.
DROP POLICY IF EXISTS rls_guard_source_account ON _rls_guard_test_table;
CREATE POLICY rls_guard_source_account ON _rls_guard_test_table
    USING (source_account_id = app.current_source_account_id());

-- Seed rows for two tenants using SECURITY DEFINER context so INSERT bypasses RLS.
DO $$
BEGIN
    INSERT INTO _rls_guard_test_table (source_account_id, payload)
    VALUES ('tenant_a', 'secret-a'), ('tenant_b', 'secret-b');
END;
$$;

-- ============================================================================
-- Test 1: GUC unset → function returns NULL → ZERO rows visible (fail-closed)
-- ============================================================================
DO $$
DECLARE
    v_fn_result TEXT;
    v_row_count INTEGER;
BEGIN
    -- Verify the helper itself returns NULL when GUC is not set
    v_fn_result := app.current_source_account_id();
    IF v_fn_result IS NOT NULL THEN
        RAISE EXCEPTION
            'ASSERT FAIL (Test 1a): expected NULL when GUC unset, got "%"',
            v_fn_result;
    END IF;

    -- Verify RLS hides ALL rows when GUC is unset
    SELECT COUNT(*) INTO v_row_count FROM _rls_guard_test_table;
    IF v_row_count <> 0 THEN
        RAISE EXCEPTION
            'ASSERT FAIL (Test 1b): expected 0 rows when GUC unset, got %',
            v_row_count;
    END IF;
END;
$$;

-- ============================================================================
-- Test 2: GUC = 'tenant_a' → only tenant_a rows visible
-- ============================================================================
DO $$
DECLARE
    v_row_count INTEGER;
    v_payload   TEXT;
BEGIN
    PERFORM set_config('app.current_source_account_id', 'tenant_a', true);

    SELECT COUNT(*) INTO v_row_count FROM _rls_guard_test_table;
    IF v_row_count <> 1 THEN
        RAISE EXCEPTION
            'ASSERT FAIL (Test 2a): expected 1 row for tenant_a, got %',
            v_row_count;
    END IF;

    SELECT payload INTO v_payload FROM _rls_guard_test_table LIMIT 1;
    IF v_payload <> 'secret-a' THEN
        RAISE EXCEPTION
            'ASSERT FAIL (Test 2b): expected payload "secret-a" for tenant_a, got "%"',
            v_payload;
    END IF;
END;
$$;

-- ============================================================================
-- Test 3: GUC = 'tenant_b' → only tenant_b rows visible
-- ============================================================================
DO $$
DECLARE
    v_row_count INTEGER;
    v_payload   TEXT;
BEGIN
    PERFORM set_config('app.current_source_account_id', 'tenant_b', true);

    SELECT COUNT(*) INTO v_row_count FROM _rls_guard_test_table;
    IF v_row_count <> 1 THEN
        RAISE EXCEPTION
            'ASSERT FAIL (Test 3a): expected 1 row for tenant_b, got %',
            v_row_count;
    END IF;

    SELECT payload INTO v_payload FROM _rls_guard_test_table LIMIT 1;
    IF v_payload <> 'secret-b' THEN
        RAISE EXCEPTION
            'ASSERT FAIL (Test 3b): expected payload "secret-b" for tenant_b, got "%"',
            v_payload;
    END IF;
END;
$$;

-- ============================================================================
-- Test 4: GUC set to empty string → treated same as unset → NULL → ZERO rows
-- ============================================================================
DO $$
DECLARE
    v_fn_result TEXT;
    v_row_count INTEGER;
BEGIN
    PERFORM set_config('app.current_source_account_id', '', true);

    v_fn_result := app.current_source_account_id();
    IF v_fn_result IS NOT NULL THEN
        RAISE EXCEPTION
            'ASSERT FAIL (Test 4a): expected NULL for empty-string GUC, got "%"',
            v_fn_result;
    END IF;

    SELECT COUNT(*) INTO v_row_count FROM _rls_guard_test_table;
    IF v_row_count <> 0 THEN
        RAISE EXCEPTION
            'ASSERT FAIL (Test 4b): expected 0 rows for empty-string GUC, got %',
            v_row_count;
    END IF;
END;
$$;

-- All assertions passed — roll back so no test data persists.
ROLLBACK;
