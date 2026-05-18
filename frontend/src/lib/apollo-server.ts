/**
 * Apollo Server Client for API Routes
 *
 * Provides server-side Apollo Client for use in API routes and server components.
 * Uses admin credentials to perform mutations without user authentication.
 */

import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

let serverClient: ApolloClient<any> | null = null;

/**
 * Get or create Apollo Client for server-side operations
 */
export function getApolloClient(): ApolloClient<any> {
  if (serverClient) {
    return serverClient;
  }

  // GraphQL endpoint
  const graphqlUrl =
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql";

  // Admin secret for server-side operations
  const adminSecret =
    process.env.HASURA_ADMIN_SECRET || process.env.NHOST_ADMIN_SECRET;

  // Create HTTP link
  const httpLink = new HttpLink({
    uri: graphqlUrl,
    fetch,
  });

  // Add authentication header
  const authLink = setContext((_, { headers }) => {
    const authHeaders: Record<string, string> = {};

    if (adminSecret) {
      authHeaders["x-hasura-admin-secret"] = adminSecret;
    }

    return {
      headers: {
        ...headers,
        ...authHeaders,
      },
    };
  });

  // Create client
  serverClient = new ApolloClient({
    link: ApolloLink.from([authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "network-only",
      },
      query: {
        fetchPolicy: "network-only",
      },
    },
  });

  return serverClient;
}

/**
 * Reset the server client (for testing)
 */
export function resetApolloServerClient(): void {
  serverClient = null;
}
