/**
 * Main SDK Client
 *
 * The NChatClient provides a unified interface to interact with all nChat APIs.
 * It handles authentication, request management, and provides type-safe access
 * to all resources.
 */

import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  NormalizedCacheObject,
  ApolloLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import {
  NChatError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
} from "./errors";
import { MessagesResource } from "./resources/messages";
import { ChannelsResource } from "./resources/channels";
import { UsersResource } from "./resources/users";
import { AuthResource } from "./resources/auth";
import { WebhooksResource } from "./resources/webhooks";
import { BotsResource } from "./resources/bots";
import { AdminResource } from "./resources/admin";

import { logger } from "@/lib/logger";

/**
 * SDK Configuration Options
 */
export interface NChatConfig {
  /** Base URL for the nChat API (e.g., https://api.nchat.example.com) */
  apiUrl: string;

  /** GraphQL endpoint URL (defaults to {apiUrl}/graphql) */
  graphqlUrl?: string;

  /** API Key for authentication */
  apiKey?: string;

  /** JWT token for user authentication */
  token?: string;

  /** Enable debug mode (logs requests/responses) */
  debug?: boolean;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Custom headers to include in all requests */
  headers?: Record<string, string>;

  /** Retry configuration */
  retry?: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
  };
}

/**
 * SDK Options (internal)
 */
export interface NChatOptions extends NChatConfig {
  apolloClient?: ApolloClient<NormalizedCacheObject>;
}

/**
 * Main nChat SDK Client
 *
 * @example
 * ```typescript
 * const client = new NChatClient({
 *   apiUrl: 'https://api.nchat.example.com',
 * // sast-ignore: HARDCODED_CREDENTIAL -- JSDoc example with placeholder values, not real credentials
 *   apiKey: 'your-api-key'
 * })
 *
 * // Access resources
 * const channels = await client.channels.list()
 * const message = await client.messages.send({ ... })
 * ```
 */
export class NChatClient {
  private config: Required<NChatConfig>;
  private apolloClient: ApolloClient<NormalizedCacheObject>;

  // Resource instances
  public readonly messages: MessagesResource;
  public readonly channels: ChannelsResource;
  public readonly users: UsersResource;
  public readonly auth: AuthResource;
  public readonly webhooks: WebhooksResource;
  public readonly bots: BotsResource;
  public readonly admin: AdminResource;

  constructor(config: NChatConfig) {
    // Set defaults
    this.config = {
      apiUrl: config.apiUrl,
      graphqlUrl: config.graphqlUrl || `${config.apiUrl}/graphql`,
      apiKey: config.apiKey || "",
      token: config.token || "",
      debug: config.debug || false,
      timeout: config.timeout || 30000,
      headers: config.headers || {},
      retry: config.retry || {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
      },
    };

    // Initialize Apollo Client
    this.apolloClient = this.createApolloClient();

    // Initialize resources
    this.messages = new MessagesResource(this);
    this.channels = new ChannelsResource(this);
    this.users = new UsersResource(this);
    this.auth = new AuthResource(this);
    this.webhooks = new WebhooksResource(this);
    this.bots = new BotsResource(this);
    this.admin = new AdminResource(this);
  }

  /**
   * Create Apollo Client for GraphQL operations
   */
  private createApolloClient(): ApolloClient<NormalizedCacheObject> {
    // HTTP link
    const httpLink = new HttpLink({
      uri: this.config.graphqlUrl,
      fetch,
    });

    // Auth link
    const authLink = setContext((_, { headers }) => {
      const authHeaders: Record<string, string> = {};

      if (this.config.apiKey) {
        authHeaders["X-API-Key"] = this.config.apiKey;
      }

      if (this.config.token) {
        authHeaders["Authorization"] = `Bearer ${this.config.token}`;
      }

      return {
        headers: {
          ...headers,
          ...authHeaders,
          ...this.config.headers,
        },
      };
    });

    // Error link
    const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
      if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path, extensions }) => {
          if (this.config.debug) {
            console.error(
              `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`,
            );
          }

          // Handle specific error types
          if (extensions?.code === "UNAUTHENTICATED") {
            throw new AuthenticationError(message);
          } else if (extensions?.code === "RATE_LIMITED") {
            throw new RateLimitError(message);
          }
        });
      }

      if (networkError) {
        if (this.config.debug) {
          logger.error(`[Network error]: ${networkError}`);
        }
        throw new NChatError("Network error occurred", 500);
      }
    });

    return new ApolloClient({
      link: ApolloLink.from([errorLink, authLink, httpLink]),
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: "network-only",
        },
        query: {
          fetchPolicy: "network-only",
          errorPolicy: "all",
        },
        mutate: {
          errorPolicy: "all",
        },
      },
    });
  }

  /**
   * Make a REST API request
   *
   * @internal
   */
  async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    data?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.config.apiUrl}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.headers,
      ...((options?.headers as Record<string, string>) || {}),
    };

    if (this.config.apiKey) {
      headers["X-API-Key"] = this.config.apiKey;
    }

    if (this.config.token) {
      headers["Authorization"] = `Bearer ${this.config.token}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      ...options,
    };

    if (data && method !== "GET") {
      fetchOptions.body = JSON.stringify(data);
    }

    if (this.config.debug) {
      // REMOVED: console.log(`[SDK Request] ${method} ${url}`, data)
    }

    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: response.statusText }));

        if (response.status === 401) {
          throw new AuthenticationError(
            error.message || "Authentication failed",
          );
        } else if (response.status === 429) {
          throw new RateLimitError(error.message || "Rate limit exceeded");
        } else if (response.status >= 400 && response.status < 500) {
          throw new ValidationError(
            error.message || "Validation failed",
            error.errors,
          );
        } else {
          throw new NChatError(
            error.message || "Request failed",
            response.status,
          );
        }
      }

      const result = await response.json();

      if (this.config.debug) {
        // REMOVED: console.log(`[SDK Response] ${method} ${url}`, result)
      }

      return result.data || result;
    } catch (error) {
      if (error instanceof NChatError) {
        throw error;
      }
      throw new NChatError(
        error instanceof Error ? error.message : "Unknown error occurred",
        500,
      );
    }
  }

  /**
   * Get the Apollo Client instance
   *
   * @internal
   */
  getApolloClient(): ApolloClient<NormalizedCacheObject> {
    return this.apolloClient;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<NChatConfig> {
    return { ...this.config };
  }

  /**
   * Update the authentication token
   */
  setToken(token: string): void {
    this.config.token = token;
  }

  /**
   * Update the API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    this.config.token = "";
    this.config.apiKey = "";
  }
}
