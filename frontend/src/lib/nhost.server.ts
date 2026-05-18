/**
 * Server-only Nhost Client
 *
 * Use this in API routes and server components to avoid bundling
 * React context code on the server side. Uses @nhost/nhost-js directly
 * (pinned at ^3.3.1 via root pnpm override to prevent v4 resolution in CI
 * — v4 removes getSession() which all API routes depend on).
 */

import { createNhostClient } from "@nhost/nhost-js";

// Create nhost client with proper configuration for self-hosted backend.
export const nhost = createNhostClient({
  // For self-hosted nhost, we use explicit URLs instead of subdomain
  authUrl: "https://auth.localhost",
  graphqlUrl: "https://hasura.localhost/v1/graphql",
  storageUrl: "https://storage.localhost",
  functionsUrl: "https://functions.localhost",

  // Development settings
  devTools: process.env.NODE_ENV === "development",
  autoSignIn: false, // Don't auto sign in - let user control it
  autoRefreshToken: true, // Auto refresh tokens when expired
});
