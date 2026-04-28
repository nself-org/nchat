/**
 * @jest-environment node
 */

/**
 * Startup guard tests for admin-client.ts
 *
 * Verifies that validateEnvironment() throws on missing or known-bad secrets,
 * and succeeds on a valid 32+ char secret.
 *
 * These tests exercise the security guard that prevents the app from booting
 * with a hardcoded dummy admin secret (N04 fix).
 */

// We need fresh module state per test — isolate modules and set env before require.
// Jest runs these in Node env (testEnvironment is jsdom for UI, but lib tests
// run server-side code so we directly manipulate process.env).

const VALID_SECRET = 'a'.repeat(32) // 32-char placeholder that passes length check

// Helper: reset module registry so admin-client re-evaluates its module-level code.
function freshModule() {
  jest.resetModules()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/graphql/admin-client')
}

describe('admin-client startup guard', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Clone env to isolate mutations between tests
    process.env = { ...originalEnv }
    // Ensure we are not in SKIP_ENV_VALIDATION mode by default
    delete process.env.SKIP_ENV_VALIDATION
    delete process.env.NEXT_PUBLIC_ALLOW_DUMMY_ADMIN_SECRET
    process.env.NEXT_PUBLIC_GRAPHQL_URL = 'http://localhost:8080/v1/graphql'
  })

  afterEach(() => {
    process.env = originalEnv
    jest.resetModules()
  })

  describe('validateEnvironment — missing secret', () => {
    it('throws FATAL when HASURA_ADMIN_SECRET is not set', () => {
      delete process.env.HASURA_ADMIN_SECRET
      const { validateEnvironment } = freshModule()
      // validateEnvironment is not exported directly; we test via getAdminClient
      // which is exported and calls validateEnvironment internally.
      // We call it from a simulated server context by mocking window to undefined.
      // Since jest runs in node, window is undefined already.
      expect(() => freshModule().getAdminClient()).toThrow(
        /HASURA_ADMIN_SECRET environment variable must be set/,
      )
    })
  })

  describe('validateEnvironment — known-bad dummy secrets', () => {
    const dummyValues = [
      'dummy-admin-secret',
      'dummy-secret-for-build-only-must-be-at-least-32-chars',
      'dummy',
      'dummyvalue12345678901234567890123',
      'hasura-admin-secret-dev',
      'changeme',
      'changeme123',
    ]

    dummyValues.forEach((bad) => {
      it(`throws FATAL when HASURA_ADMIN_SECRET="${bad}"`, () => {
        process.env.HASURA_ADMIN_SECRET = bad
        expect(() => freshModule().getAdminClient()).toThrow(
          /HASURA_ADMIN_SECRET is (not set|set to a known insecure|must be at least)/,
        )
      })
    })
  })

  describe('validateEnvironment — too-short secret', () => {
    it('throws FATAL when secret is shorter than 32 characters', () => {
      process.env.HASURA_ADMIN_SECRET = 'short'
      expect(() => freshModule().getAdminClient()).toThrow(
        /HASURA_ADMIN_SECRET must be at least 32 characters/,
      )
    })
  })

  describe('validateEnvironment — valid secret', () => {
    it('does not throw when HASURA_ADMIN_SECRET is a 32-char random string', () => {
      process.env.HASURA_ADMIN_SECRET = VALID_SECRET
      // getAdminClient() will also try to create an Apollo client — that's fine for
      // this test since we only care that validateEnvironment passes.
      expect(() => freshModule().getAdminClient()).not.toThrow()
    })

    it('does not throw when HASURA_ADMIN_SECRET is a 64-char hex string', () => {
      process.env.HASURA_ADMIN_SECRET = 'f'.repeat(64)
      expect(() => freshModule().getAdminClient()).not.toThrow()
    })
  })

  describe('SKIP_ENV_VALIDATION bypass — production blocked', () => {
    it('throws CRITICAL when SKIP_ENV_VALIDATION=true in production', () => {
      process.env.SKIP_ENV_VALIDATION = 'true'
      process.env.NODE_ENV = 'production'
      expect(() => freshModule().getAdminClient()).toThrow(
        /SKIP_ENV_VALIDATION cannot be used in production/,
      )
    })
  })

  describe('SKIP_ENV_VALIDATION bypass — missing opt-in flag', () => {
    it('throws CRITICAL when SKIP_ENV_VALIDATION=true without ALLOW_DUMMY flag', () => {
      process.env.SKIP_ENV_VALIDATION = 'true'
      process.env.NODE_ENV = 'development'
      delete process.env.NEXT_PUBLIC_ALLOW_DUMMY_ADMIN_SECRET
      expect(() => freshModule().getAdminClient()).toThrow(
        /SKIP_ENV_VALIDATION requires NEXT_PUBLIC_ALLOW_DUMMY_ADMIN_SECRET=true/,
      )
    })
  })

  describe('SKIP_ENV_VALIDATION bypass — dev opt-in succeeds', () => {
    it('does not throw when SKIP_ENV_VALIDATION=true with ALLOW_DUMMY in development', () => {
      process.env.SKIP_ENV_VALIDATION = 'true'
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_ALLOW_DUMMY_ADMIN_SECRET = 'true'
      // Should not throw — dev-only build-time path
      expect(() => freshModule().getAdminClient()).not.toThrow()
    })
  })
})
