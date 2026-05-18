/**
 * Server-only Nhost Client
 *
 * Use this in API routes and server components to avoid bundling
 * React context code on the server side.
 */

import { createNhostClient } from '@nhost/nhost-js'

// Create nhost client with proper configuration for self-hosted backend
// Note: We're using @nhost/nhost-js instead of @nhost/nextjs to avoid React context issues
export const nhost = createNhostClient({
  // For self-hosted nhost, we use explicit URLs instead of subdomain
  authUrl: 'https://auth.localhost',
  graphqlUrl: 'https://hasura.localhost/v1/graphql',
  storageUrl: 'https://storage.localhost',
  functionsUrl: 'https://functions.localhost',

  // Security settings
  refreshIntervalTime: 600, // Refresh token every 10 minutes

  // Development settings
  devTools: process.env.NODE_ENV === 'development',
  autoSignIn: false, // Don't auto sign in - let user control it
  autoRefreshToken: true, // Auto refresh tokens when expired
})
