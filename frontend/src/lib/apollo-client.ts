import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
  from,
  type NormalizedCacheObject,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient, type Client } from "graphql-ws";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

import { logger } from "@/lib/logger";

// Environment variables
const GRAPHQL_HTTP_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ||
  process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL ||
  "http://localhost:1337/v1/graphql";

const GRAPHQL_WS_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_WS_URL ||
  GRAPHQL_HTTP_URL.replace(/^http/, "ws");

// Helper to get auth token
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

// HTTP Link for queries and mutations
const httpLink = createHttpLink({
  uri: GRAPHQL_HTTP_URL,
});

// Auth link to add authorization header to HTTP requests
const authLink = setContext((_, { headers }) => {
  const token = getAuthToken();

  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      logger.error(
        `[GraphQL error]: Message: ${message},  Location: ${locations}, Path: ${path}`,
      );
    });
  }
  if (networkError) {
    logger.error(`[Network error]: ${networkError}`);
  }
});

// WebSocket client and link for subscriptions (client-side only)
let wsClient: Client | null = null;
let wsLink: GraphQLWsLink | null = null;

if (typeof window !== "undefined") {
  wsClient = createClient({
    url: GRAPHQL_WS_URL,
    connectionParams: () => {
      const token = getAuthToken();
      return {
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      };
    },
    // Reconnection configuration
    retryAttempts: 5,
    shouldRetry: () => true,
    retryWait: async (retryCount) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.min(1000 * Math.pow(2, retryCount), 16000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    },
    // Connection acknowledgment timeout
    connectionAckWaitTimeout: 10000,
    // Lazy connection - only connect when first subscription is made
    lazy: true,
    // Event handlers for connection state management
    on: {
      connected: () => {},
      closed: (event) => {},
      error: (error) => {
        logger.error("[WebSocket] Connection error", error);
      },
    },
  });

  wsLink = new GraphQLWsLink(wsClient);
}

// Split link - route subscriptions to WebSocket, others to HTTP
const splitLink =
  wsLink !== null
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === "OperationDefinition" &&
            definition.operation === "subscription"
          );
        },
        wsLink,
        from([errorLink, authLink, httpLink]),
      )
    : from([errorLink, authLink, httpLink]);

// Apollo Client instance (browser-side only)
// On the server (API routes, server components), use getServerApolloClient() instead.
let _browserApolloClient: ApolloClient<NormalizedCacheObject> | null = null;

function getBrowserApolloClient(): ApolloClient<NormalizedCacheObject> {
  if (_browserApolloClient) {
    return _browserApolloClient;
  }
  _browserApolloClient = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            // Add field policies for pagination if needed
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-first",
        nextFetchPolicy: "cache-first",
      },
      query: {
        fetchPolicy: "cache-first",
      },
    },
  });
  return _browserApolloClient;
}

/**
 * Apollo Client singleton.
 * - In browser (client components): returns the WebSocket-capable browser client.
 * - On server (API routes, server components): returns the server-side client with
 *   admin-secret auth and no-cache policy via getServerApolloClient().
 *
 * API routes SHOULD call getServerApolloClient() directly for clarity, but importing
 * apolloClient is safe in any environment.
 */
export const apolloClient: ApolloClient<NormalizedCacheObject> =
  typeof window === "undefined"
    ? // Server-side: delegate to lazy server client (avoids browser-only APIs)
      (new Proxy({} as ApolloClient<NormalizedCacheObject>, {
        get(_target, prop) {
          return getServerApolloClient()[
            prop as keyof ApolloClient<NormalizedCacheObject>
          ];
        },
      }) as ApolloClient<NormalizedCacheObject>)
    : // Browser: return the real browser client (lazy singleton)
      getBrowserApolloClient();

// Utility function to close WebSocket connection (useful for logout)
export function closeWebSocketConnection(): void {
  if (wsClient) {
    wsClient.dispose();
  }
}

// Utility function to reconnect WebSocket (useful after login/token refresh)
export function reconnectWebSocket(): void {
  if (wsClient) {
    // Dispose and recreate happens automatically with lazy: true
    // The next subscription will trigger a new connection with fresh token
    wsClient.dispose();
  }
}

// Utility function to get the Apollo Client instance
export function getApolloClient(): ApolloClient<NormalizedCacheObject> {
  return apolloClient;
}

// ============================================================================
// Server-Side Apollo Client
// ============================================================================

// Server-side Apollo Client (for API routes, no WebSocket needed)
let serverApolloClient: ApolloClient<NormalizedCacheObject> | null = null;

/**
 * Get Apollo Client for server-side use (API routes, server components)
 * Uses admin secret for full access to Hasura
 */
export function getServerApolloClient(): ApolloClient<NormalizedCacheObject> {
  if (serverApolloClient) {
    return serverApolloClient;
  }

  const httpLink = createHttpLink({
    uri: GRAPHQL_HTTP_URL,
  });

  // Auth link with admin secret for server-side operations
  const serverAuthLink = setContext((_, { headers }) => {
    const adminSecret = process.env.HASURA_ADMIN_SECRET;

    return {
      headers: {
        ...headers,
        ...(adminSecret ? { "x-hasura-admin-secret": adminSecret } : {}),
      },
    };
  });

  serverApolloClient = new ApolloClient({
    link: from([errorLink, serverAuthLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "no-cache",
      },
      query: {
        fetchPolicy: "no-cache",
      },
    },
  });

  return serverApolloClient;
}
