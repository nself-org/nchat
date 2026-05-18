/**
 * Creates an Apollo Client instance for GraphQL communication.
 *
 * @param options.uri - The GraphQL endpoint URI.
 * @param options.headers - Optional HTTP headers to attach to every request.
 * @returns An ApolloClient instance.
 */
export function createApolloClient(options: {
  uri: string;
  headers?: Record<string, string>;
}): import('@apollo/client').ApolloClient<import('@apollo/client').NormalizedCacheObject> {
  // TODO: wire real Apollo client in S05
  void options;
  return null as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// Re-export ApolloProvider for consumer convenience — real wiring in S05
export { ApolloProvider } from '@apollo/client'
