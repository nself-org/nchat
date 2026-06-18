/**
 * Purpose:    Singleton urql client for the ɳChat SPA, built via @nself/graphql-client.
 *             The app talks to Hasura directly (no hand-rolled Next API routes) per
 *             canonical-patterns §2.
 * Inputs:     VITE_GRAPHQL_URL env var (Hasura endpoint).
 * Outputs:    A configured urql Client (cacheExchange → errorExchange → fetchExchange).
 * Constraints:Create once at app root; re-provide via <Provider> (never re-instantiate).
 *             Auth exchange is wired through the cookie transport in the browser, so the
 *             default (cookie-credentialed) fetch is sufficient for the web surface.
 * Usage:      import { gqlClient } from '@/lib/graphql-client'
 * SOT:        F-NCHAT-GQL-CLIENT-01
 */
import { NselfGraphqlClient } from '@nself/graphql-client'

const url =
  (import.meta.env.VITE_GRAPHQL_URL as string | undefined) ??
  'https://api.local.nself.org/v1/graphql'

export const gqlClient = NselfGraphqlClient({ url })
