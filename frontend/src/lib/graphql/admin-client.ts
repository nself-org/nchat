/**
 * Hasura Admin GraphQL Client
 *
 * Provides a secure, server-side only GraphQL client with admin credentials.
 * This client should NEVER be used in client-side code or exposed to the browser.
 *
 * Security Features:
 * - Server-side only enforcement (throws error if used in browser)
 * - Required environment variable validation
 * - Singleton pattern to prevent multiple instances
 * - Typed return values for better type safety
 *
 * @module lib/graphql/admin-client
 *
 * @example
 * ```typescript
 * import { getAdminClient } from '@/lib/graphql/admin-client'
 *
 * // In API route or server component
 * const client = getAdminClient()
 * const result = await client.query({
 *   query: MY_QUERY,
 *   variables: { id: '123' }
 * })
 * ```
 */

import { ApolloClient, InMemoryCache, HttpLink, NormalizedCacheObject } from '@apollo/client'

import { logger } from '@/lib/logger'

// ============================================================================
// Security Validation
// ============================================================================

/**
 * Known-bad values that are never acceptable in any environment.
 * These are dev-stub defaults that must never reach a real Hasura instance.
 */
const KNOWN_BAD_ADMIN_SECRETS = [
  'dummy-admin-secret',
  'dummy-secret-for-build-only-must-be-at-least-32-chars',
  'hasura-admin-secret-dev',
  'changeme',
  'changeme123',
  'secret',
  'admin',
]

/**
 * Returns true when the value is a known dev-stub that must be rejected.
 */
function isKnownBadSecret(secret: string): boolean {
  const lower = secret.toLowerCase()
  return (
    KNOWN_BAD_ADMIN_SECRETS.includes(lower) ||
    lower.startsWith('dummy') ||
    lower.startsWith('test') ||
    lower === ''
  )
}

/**
 * Ensure this code only runs on the server
 */
function enforceServerSide(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY VIOLATION: Admin GraphQL client can only be used server-side. ' +
        'This code attempted to run in the browser, which would expose admin credentials.'
    )
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): {
  graphqlUrl: string
  adminSecret: string
} {
  // Skip validation during build — allowed only in development with explicit opt-in.
  // SKIP_ENV_VALIDATION must NEVER be used in production.
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: SKIP_ENV_VALIDATION cannot be used in production. ' +
          'Set HASURA_ADMIN_SECRET and NEXT_PUBLIC_GRAPHQL_URL instead.'
      )
    }
    if (process.env.NEXT_PUBLIC_ALLOW_DUMMY_ADMIN_SECRET !== 'true') {
      throw new Error(
        'CRITICAL: SKIP_ENV_VALIDATION requires NEXT_PUBLIC_ALLOW_DUMMY_ADMIN_SECRET=true in development. ' +
          'Set HASURA_ADMIN_SECRET for a real backend, or set NEXT_PUBLIC_ALLOW_DUMMY_ADMIN_SECRET=true for local builds.'
      )
    }
    // Dev-only path: use a placeholder that Hasura will reject rather than a
    // recognisable dummy string. Any actual Hasura call will fail with an auth
    // error — that is intentional; this path is for build-time only.
    logger.warn('SKIP_ENV_VALIDATION is true — admin client is build-time placeholder (dev only)')
    return {
      graphqlUrl: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/v1/graphql',
      adminSecret: '__build_time_placeholder__',
    }
  }

  const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL
  const adminSecret = process.env.HASURA_ADMIN_SECRET

  if (!graphqlUrl) {
    throw new Error('FATAL: NEXT_PUBLIC_GRAPHQL_URL environment variable must be set')
  }

  if (!adminSecret) {
    throw new Error(
      'FATAL: HASURA_ADMIN_SECRET environment variable must be set. ' +
        'Generate with: openssl rand -hex 32'
    )
  }

  if (isKnownBadSecret(adminSecret)) {
    throw new Error(
      'FATAL: HASURA_ADMIN_SECRET is set to a known insecure dev-stub value. ' +
        'Generate a real secret with: openssl rand -hex 32'
    )
  }

  if (adminSecret.length < 32) {
    throw new Error('FATAL: HASURA_ADMIN_SECRET must be at least 32 characters')
  }

  return { graphqlUrl, adminSecret }
}

// ============================================================================
// Client Singleton
// ============================================================================

let adminClientInstance: ApolloClient<NormalizedCacheObject> | null = null

/**
 * Get or create the admin GraphQL client
 *
 * Returns a singleton instance of Apollo Client configured with admin credentials.
 * This client has full access to the database and should only be used for:
 * - User creation/deletion
 * - System-level operations
 * - Admin dashboard queries
 * - Migrations and seed data
 *
 * @throws {Error} If called from browser context
 * @throws {Error} If required environment variables are not set
 *
 * @returns {ApolloClient} Configured Apollo Client with admin access
 */
export function getAdminClient(): ApolloClient<NormalizedCacheObject> {
  // Security check - must be server-side
  enforceServerSide()

  // Return existing instance if available
  if (adminClientInstance) {
    return adminClientInstance
  }

  // Validate environment
  const { graphqlUrl, adminSecret } = validateEnvironment()

  // Create HTTP link with admin credentials
  const httpLink = new HttpLink({
    uri: graphqlUrl,
    headers: {
      'x-hasura-admin-secret': adminSecret,
      'Content-Type': 'application/json',
    },
    // Disable credentials since we're using admin secret
    credentials: 'omit',
  })

  // Create client with error handling
  adminClientInstance = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache({
      // Configure cache to handle common patterns
      typePolicies: {
        Query: {
          fields: {
            // Add field policies as needed
          },
        },
      },
    }),
    // Disable query deduplication for admin operations
    queryDeduplication: false,
    // Always use network-only for admin queries (no cache)
    defaultOptions: {
      query: {
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
  })

  return adminClientInstance
}

/**
 * Reset the admin client instance
 *
 * Useful for testing or when environment variables change.
 * In production, this should never be called.
 */
export function resetAdminClient(): void {
  enforceServerSide()
  adminClientInstance = null
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Execute a GraphQL query with admin privileges
 *
 * Convenience wrapper around getAdminClient().query()
 *
 * @param query - GraphQL query document
 * @param variables - Query variables
 * @returns Query result
 */
export async function adminQuery<
  TData = any,
  TVariables extends Record<string, any> = Record<string, any>,
>(query: any, variables?: TVariables): Promise<{ data: TData | null; errors?: readonly any[] }> {
  enforceServerSide()

  const client = getAdminClient()
  const result = await client.query<TData, TVariables>({
    query,
    variables,
  })

  return {
    data: result.data || null,
    errors: result.errors,
  }
}

/**
 * Execute a GraphQL mutation with admin privileges
 *
 * Convenience wrapper around getAdminClient().mutate()
 *
 * @param mutation - GraphQL mutation document
 * @param variables - Mutation variables
 * @returns Mutation result
 */
export async function adminMutate<
  TData = any,
  TVariables extends Record<string, any> = Record<string, any>,
>(mutation: any, variables?: TVariables): Promise<{ data: TData | null; errors?: readonly any[] }> {
  enforceServerSide()

  const client = getAdminClient()
  const result = await client.mutate<TData, TVariables>({
    mutation,
    variables,
  })

  return {
    data: result.data || null,
    errors: result.errors,
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a GraphQL result has errors
 */
export function hasGraphQLErrors(result: {
  errors?: readonly any[]
}): result is { errors: readonly any[] } {
  return Array.isArray(result.errors) && result.errors.length > 0
}

/**
 * Get error message from GraphQL errors
 */
export function getGraphQLErrorMessage(result: { errors?: readonly any[] }): string {
  if (!hasGraphQLErrors(result)) {
    return 'Unknown error'
  }

  return result.errors.map((err) => err.message).join(', ')
}
