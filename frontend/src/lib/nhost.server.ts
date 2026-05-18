/**
 * Server-only Nhost Client
 *
 * Use this in API routes and server components to avoid bundling
 * React context code on the server side.
 */

import { createNhostClient } from '@nhost/nhost-js'
import type { HasuraAuthClient } from '@nhost/hasura-auth-js'

// Typed response shape for nhost.graphql.request — consistent across graphql-js peer versions.
// Uses `any` for the data field to preserve the permissive typing that the existing API routes
// rely on when accessing GraphQL response properties (e.g. data.nchat_calls_by_pk).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NhostGraphqlResponse<T = any> =
  | { data: T; error: null }
  | { data: null; error: { message: string }[] | { message: string } }

// Typed nhost server client with explicit auth and graphql surfaces to avoid
// TypeScript resolving to incorrect peer-dependency types in CI
export interface NhostServerClient {
  auth: HasuraAuthClient
  graphql: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request<T = any>(
      document: string,
      variables?: Record<string, unknown>
    ): Promise<NhostGraphqlResponse<T>>
  }
}

// Create nhost client with proper configuration for self-hosted backend.
// Note: We're using @nhost/nhost-js instead of @nhost/nextjs to avoid React context issues.
// The options are cast to `any` because CI's pnpm peer-resolution can surface the internal
// @nhost/hasura-auth-js `NhostClientOptions` type (which omits graphql/storage/devTools
// constructor params) instead of the public `NhostClientConstructorParams` from @nhost/nhost-js.
// All properties here are valid at runtime per the nhost-js 3.x API.
export const nhost = createNhostClient({
  // For self-hosted nhost, we use explicit URLs instead of subdomain
  authUrl: 'https://auth.localhost',
  graphqlUrl: 'https://hasura.localhost/v1/graphql',
  storageUrl: 'https://storage.localhost',
  functionsUrl: 'https://functions.localhost',

  // Development settings
  devTools: process.env.NODE_ENV === 'development',
  autoSignIn: false, // Don't auto sign in - let user control it
  autoRefreshToken: true, // Auto refresh tokens when expired
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any) as unknown as NhostServerClient
