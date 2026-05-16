/**
 * Creates an Apollo Client instance for GraphQL communication.
 *
 * @param options.uri - The GraphQL endpoint URI.
 * @param options.headers - Optional HTTP headers to attach to every request.
 * @returns An ApolloClient instance.
 */
export declare function createApolloClient(options: {
    uri: string;
    headers?: Record<string, string>;
}): import('@apollo/client').ApolloClient<import('@apollo/client').NormalizedCacheObject>;
export { ApolloProvider } from '@apollo/client';
//# sourceMappingURL=index.d.ts.map