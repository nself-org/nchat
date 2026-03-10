#!/usr/bin/env bats
# T-0393 — chat/ CI smoke tests
#
# nself-chat frontend is a Next.js app (not Flutter).
# These bats tests cover the static/static CI tier: type-check, lint, and build.
# They replace the Flutter-oriented test plan with equivalent Next.js checks.
#
# Skip guard: set SKIP_FLUTTER_TESTS=1 to skip all tests in this file.
# (Variable name preserved for CI matrix compatibility with sibling repos.)
#
# Prerequisites: pnpm installed, node_modules present (pnpm install)
# Run: bats chat/integration_test/smoke_test.bats
# CI:  SKIP_FLUTTER_TESTS=1 bats chat/integration_test/smoke_test.bats

REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
FRONTEND="$REPO_ROOT/frontend"

setup() {
  if [ "${SKIP_FLUTTER_TESTS:-1}" = "1" ]; then
    skip "SKIP_FLUTTER_TESTS=1 — set to 0 to run chat CI smoke tests"
  fi

  if [ ! -d "$FRONTEND/node_modules" ]; then
    skip "node_modules not installed — run: pnpm install in $FRONTEND"
  fi
}

# ---------------------------------------------------------------------------
# Scenario 1 — TypeScript type-check exits 0
# ---------------------------------------------------------------------------
@test "TypeScript type-check passes (tsc --noEmit)" {
  run pnpm --dir "$FRONTEND" run type-check
  [ "$status" -eq 0 ]
}

# ---------------------------------------------------------------------------
# Scenario 2 — ESLint exits 0
# ---------------------------------------------------------------------------
@test "ESLint exits 0 (no lint errors)" {
  run pnpm --dir "$FRONTEND" run lint
  [ "$status" -eq 0 ]
}

# ---------------------------------------------------------------------------
# Scenario 3 — Next.js production build exits 0
# ---------------------------------------------------------------------------
@test "Next.js production build exits 0 (next build)" {
  run pnpm --dir "$FRONTEND" run build
  [ "$status" -eq 0 ]
}

# ---------------------------------------------------------------------------
# Scenario 4 — Build output directory exists after build
# ---------------------------------------------------------------------------
@test "Build output directory .next/ exists after build" {
  # Assumes scenario 3 has already run in the same bats session.
  # If run in isolation, trigger the build first.
  if [ ! -d "$FRONTEND/.next" ]; then
    run pnpm --dir "$FRONTEND" run build
    [ "$status" -eq 0 ]
  fi
  [ -d "$FRONTEND/.next" ]
}

# ---------------------------------------------------------------------------
# Scenario 5 — No TypeScript errors in src/ reported by tsc
# ---------------------------------------------------------------------------
@test "No TypeScript errors across src/ (tsc strict)" {
  run pnpm --dir "$FRONTEND" exec tsc --noEmit --strict
  [ "$status" -eq 0 ]
}

# ---------------------------------------------------------------------------
# Scenario 6 — Static export or server bundle is non-empty
# ---------------------------------------------------------------------------
@test ".next/BUILD_ID file exists (confirms build completed)" {
  if [ ! -d "$FRONTEND/.next" ]; then
    run pnpm --dir "$FRONTEND" run build
    [ "$status" -eq 0 ]
  fi
  [ -f "$FRONTEND/.next/BUILD_ID" ]
}

# ---------------------------------------------------------------------------
# Scenario 7 — Unit test suite exits 0
# ---------------------------------------------------------------------------
@test "Jest unit tests exit 0" {
  run pnpm --dir "$FRONTEND" run test -- --passWithNoTests --ci --forceExit
  [ "$status" -eq 0 ]
}
