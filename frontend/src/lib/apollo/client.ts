/**
 * Apollo Client Configuration
 *
 * Sets up Apollo Client with HTTP and WebSocket links for subscriptions,
 * authentication headers, error handling, and cache configuration.
 */

import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  Observable,
  split,
  from,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import { createClient } from "graphql-ws";
import { cache } from "./cache";

import { logger } from "@/lib/logger";

// =============================================================================
// Configuration
// =============================================================================

const GRAPHQL_HTTP_URL =
  process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL ||
  process.env.NEXT_PUBLIC_GRAPHQL_URL ||
  "http://localhost:1337/v1/graphql";

const GRAPHQL_WS_URL = GRAPHQL_HTTP_URL.replace(/^http/, "ws");

// Token management
let authToken: string | null = null;
let tokenRefreshCallback: (() => Promise<string | null>) | null = null;

/**
 * Set the authentication token for Apollo requests
 */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/**
 * Get the current authentication token
 */
export function getAuthToken(): string | null {
  // Try memory first
  if (authToken) return authToken;

  // Fallback to localStorage in browser
  if (typeof window !== "undefined") {
    return localStorage.getItem("nchat-token");
  }

  return null;
}

/**
 * Set a callback to refresh the token when needed
 */
export function setTokenRefreshCallback(
  callback: () => Promise<string | null>,
) {
  tokenRefreshCallback = callback;
}

// =============================================================================
// HTTP Link
// =============================================================================

const httpLink = new HttpLink({
  uri: GRAPHQL_HTTP_URL,
  credentials: "include", // Include cookies for auth
});

// =============================================================================
// WebSocket Link (for subscriptions)
// =============================================================================

let wsClient: ReturnType<typeof createClient> | null = null;

function createWsClient() {
  if (typeof window === "undefined") return null;

  return createClient({
    url: GRAPHQL_WS_URL,
    connectionParams: () => {
      const token = getAuthToken();
      return {
        headers: {
          authorization: token ? `Bearer ${token}` : "",
        },
      };
    },
    // Connection options
    retryAttempts: 5,
    shouldRetry: () => true,
    lazy: true, // Connect only when subscription is made
    on: {
      connected: () => {},
      closed: (event) => {},
      error: (error) => {
        logger.error("[GraphQL WS] Error", error);
      },
    },
  });
}

// Create WebSocket link (only on client)
const wsLink =
  typeof window !== "undefined"
    ? new GraphQLWsLink((wsClient = createWsClient()!))
    : null;

/**
 * Reconnect WebSocket with new token
 */
export async function reconnectWebSocket() {
  if (wsClient) {
    wsClient.dispose();
    wsClient = createWsClient()!;
  }
}

// =============================================================================
// Auth Link
// =============================================================================

const authLink = setContext(async (_, { headers }) => {
  const token = getAuthToken();

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      "x-hasura-role": token ? "user" : "anonymous",
    },
  };
});

// =============================================================================
// Error Link
// =============================================================================

const errorLink = onError(
  ({ graphQLErrors, networkError, operation, forward }) => {
    // Handle GraphQL errors
    if (graphQLErrors) {
      for (const err of graphQLErrors) {
        console.error(
          `[GraphQL Error] Message: ${err.message}, Path: ${err.path}, Code: ${err.extensions?.code}`,
        );

        // Handle authentication errors
        if (
          err.extensions?.code === "UNAUTHENTICATED" ||
          err.extensions?.code === "invalid-jwt" ||
          err.extensions?.code === "jwt-expired"
        ) {
          // Attempt to refresh token
          if (tokenRefreshCallback) {
            return new Observable((observer) => {
              tokenRefreshCallback!()
                .then((newToken) => {
                  if (newToken) {
                    setAuthToken(newToken);
                    // Retry the operation with new token
                    const subscriber = {
                      next: observer.next.bind(observer),
                      error: observer.error.bind(observer),
                      complete: observer.complete.bind(observer),
                    };
                    forward(operation).subscribe(subscriber);
                  } else {
                    // Token refresh failed, emit error
                    observer.error(err);
                  }
                })
                .catch((refreshError) => {
                  logger.error("Token refresh failed:", refreshError);
                  observer.error(err);
                });
            });
          }

          // Dispatch auth error event
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("nchat:auth-error", {
                detail: { error: err, code: err.extensions?.code },
              }),
            );
          }
        }

        // Handle permission errors
        if (err.extensions?.code === "FORBIDDEN") {
          logger.error(
            "Permission denied for operation:",
            operation.operationName,
          );
        }
      }
    }

    // Handle network errors
    if (networkError) {
      logger.error(`[Network Error] ${networkError.message}`);

      // Check if it's a CORS or connection issue
      if ("statusCode" in networkError) {
        const statusCode = (networkError as { statusCode?: number }).statusCode;
        if (statusCode === 401) {
          // Unauthorized - token might be invalid
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("nchat:auth-error", {
                detail: { error: networkError, code: "UNAUTHORIZED" },
              }),
            );
          }
        }
      }
    }
  },
);

// =============================================================================
// Retry Link
// =============================================================================

const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 3000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Don't retry on auth errors
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        return false;
      }
      // Retry on network errors
      return !!error;
    },
  },
});

// =============================================================================
// Request Logging (Development)
// =============================================================================

const loggerLink =
  process.env.NODE_ENV === "development"
    ? new ApolloLink((operation, forward) => {
        const startTime = Date.now();
        const operationType = operation.query.definitions.find(
          (def) => def.kind === "OperationDefinition",
        );
        const opType =
          operationType?.kind === "OperationDefinition"
            ? operationType.operation
            : "unknown";

        return forward(operation).map((result) => {
          const duration = Date.now() - startTime;
          return result;
        });
      })
    : null;

// =============================================================================
// Split Link (HTTP vs WebSocket)
// =============================================================================

const splitLink = wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === "OperationDefinition" &&
          definition.operation === "subscription"
        );
      },
      wsLink,
      httpLink,
    )
  : httpLink;

// =============================================================================
// Create Apollo Client
// =============================================================================

// Build link chain
const linkChain: ApolloLink[] = [errorLink, retryLink, authLink];

// Add logger in development
if (loggerLink) {
  linkChain.push(loggerLink);
}

// Add split link last
linkChain.push(splitLink);

export const apolloClient = new ApolloClient({
  link: from(linkChain),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
      notifyOnNetworkStatusChange: true,
    },
    query: {
      fetchPolicy: "cache-first",
      errorPolicy: "all",
    },
    mutate: {
      errorPolicy: "all",
    },
  },
  // Updated for Apollo Client v3.14.0+ - use devtools.enabled instead of connectToDevTools
  devtools: {
    enabled: process.env.NODE_ENV === "development",
  },
  // Updated for Apollo Client v3.14.0+ - use clientAwareness instead of name/version
  clientAwareness: {
    name: "nchat-web",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "0.9.1",
  },
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Reset Apollo cache and store
 */
export async function resetApolloStore() {
  await apolloClient.clearStore();
}

/**
 * Refetch all active queries
 */
export async function refetchActiveQueries() {
  await apolloClient.refetchQueries({
    include: "active",
  });
}

/**
 * Stop all subscriptions and reset client
 */
export async function stopAllSubscriptions() {
  apolloClient.stop();
  if (wsClient) {
    wsClient.dispose();
  }
}

// =============================================================================
// Export
// =============================================================================

export default apolloClient;
