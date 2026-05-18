/**
 * Slack Integration Client
 *
 * Handles Slack API interactions including OAuth, channel sync,
 * message import, and message forwarding.
 */

import type {
  IntegrationProvider,
  IntegrationCredentials,
  Integration,
  OAuthConfig,
  OAuthCallbackParams,
  SlackChannel,
  SlackUser,
  SlackMessage,
  SlackFile,
  SlackImportOptions,
  SlackSyncResult,
} from "../types";

import {
  buildAuthUrl,
  tokenResponseToCredentials,
} from "../integration-manager";

import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

export const SLACK_API_BASE = "https://slack.com/api";
export const SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize";
export const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";

export const SLACK_DEFAULT_SCOPES = [
  "channels:history",
  "channels:read",
  "chat:write",
  "files:read",
  "groups:history",
  "groups:read",
  "im:history",
  "im:read",
  "mpim:history",
  "mpim:read",
  "users:read",
  "users:read.email",
];

// ============================================================================
// Slack API Response Types
// ============================================================================

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  warning?: string;
  response_metadata?: {
    next_cursor?: string;
    warnings?: string[];
  };
}

interface SlackChannelsListResponse extends SlackApiResponse {
  channels: SlackChannel[];
}

interface SlackUsersListResponse extends SlackApiResponse {
  members: SlackUser[];
}

interface SlackConversationsHistoryResponse extends SlackApiResponse {
  messages: SlackMessage[];
  has_more: boolean;
}

interface SlackPostMessageResponse extends SlackApiResponse {
  channel: string;
  ts: string;
  message: SlackMessage;
}

// ============================================================================
// Slack Client Configuration
// ============================================================================

export interface SlackClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

// ============================================================================
// Slack API Client
// ============================================================================

/**
 * Slack API client for making authenticated requests
 */
export class SlackApiClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make an authenticated GET request to Slack API
   */
  async get<T extends SlackApiResponse>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${SLACK_API_BASE}/${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data: T = await response.json();

    if (!data.ok) {
      throw new SlackApiError(
        data.error || "Unknown Slack API error",
        endpoint,
      );
    }

    return data;
  }

  /**
   * Make an authenticated POST request to Slack API
   */
  async post<T extends SlackApiResponse>(
    endpoint: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(`${SLACK_API_BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data: T = await response.json();

    if (!data.ok) {
      throw new SlackApiError(
        data.error || "Unknown Slack API error",
        endpoint,
      );
    }

    return data;
  }

  // ==========================================================================
  // Channel Methods
  // ==========================================================================

  /**
   * List all public channels
   */
  async listChannels(cursor?: string): Promise<{
    channels: SlackChannel[];
    nextCursor?: string;
  }> {
    const params: Record<string, string> = {
      types: "public_channel",
      exclude_archived: "true",
      limit: "200",
    };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await this.get<SlackChannelsListResponse>(
      "conversations.list",
      params,
    );

    return {
      channels: response.channels,
      nextCursor: response.response_metadata?.next_cursor || undefined,
    };
  }

  /**
   * List all channels (paginated, fetches all)
   */
  async listAllChannels(): Promise<SlackChannel[]> {
    const allChannels: SlackChannel[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.listChannels(cursor);
      allChannels.push(...result.channels);
      cursor = result.nextCursor;
    } while (cursor);

    return allChannels;
  }

  /**
   * Get channel info
   */
  async getChannelInfo(channelId: string): Promise<SlackChannel> {
    const response = await this.get<
      SlackApiResponse & { channel: SlackChannel }
    >("conversations.info", { channel: channelId });
    return response.channel;
  }

  // ==========================================================================
  // User Methods
  // ==========================================================================

  /**
   * List all users
   */
  async listUsers(cursor?: string): Promise<{
    users: SlackUser[];
    nextCursor?: string;
  }> {
    const params: Record<string, string> = { limit: "200" };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await this.get<SlackUsersListResponse>(
      "users.list",
      params,
    );

    return {
      users: response.members,
      nextCursor: response.response_metadata?.next_cursor || undefined,
    };
  }

  /**
   * List all users (paginated, fetches all)
   */
  async listAllUsers(): Promise<SlackUser[]> {
    const allUsers: SlackUser[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.listUsers(cursor);
      allUsers.push(...result.users);
      cursor = result.nextCursor;
    } while (cursor);

    return allUsers;
  }

  /**
   * Get user info
   */
  async getUserInfo(userId: string): Promise<SlackUser> {
    const response = await this.get<SlackApiResponse & { user: SlackUser }>(
      "users.info",
      {
        user: userId,
      },
    );
    return response.user;
  }

  // ==========================================================================
  // Message Methods
  // ==========================================================================

  /**
   * Get channel history
   */
  async getChannelHistory(
    channelId: string,
    options?: {
      cursor?: string;
      oldest?: string;
      latest?: string;
      limit?: number;
    },
  ): Promise<{
    messages: SlackMessage[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const params: Record<string, string> = {
      channel: channelId,
      limit: String(options?.limit || 100),
    };
    if (options?.cursor) params.cursor = options.cursor;
    if (options?.oldest) params.oldest = options.oldest;
    if (options?.latest) params.latest = options.latest;

    const response = await this.get<SlackConversationsHistoryResponse>(
      "conversations.history",
      params,
    );

    return {
      messages: response.messages,
      hasMore: response.has_more,
      nextCursor: response.response_metadata?.next_cursor,
    };
  }

  /**
   * Get all messages from a channel
   */
  async getAllChannelHistory(
    channelId: string,
    options?: {
      oldest?: string;
      latest?: string;
    },
  ): Promise<SlackMessage[]> {
    const allMessages: SlackMessage[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.getChannelHistory(channelId, {
        cursor,
        oldest: options?.oldest,
        latest: options?.latest,
      });
      allMessages.push(...result.messages);
      cursor = result.nextCursor;
    } while (cursor);

    return allMessages;
  }

  /**
   * Post a message to a channel
   */
  async postMessage(
    channelId: string,
    text: string,
    options?: {
      threadTs?: string;
      username?: string;
      iconEmoji?: string;
    },
  ): Promise<SlackMessage> {
    const body: Record<string, unknown> = {
      channel: channelId,
      text,
    };
    if (options?.threadTs) body.thread_ts = options.threadTs;
    if (options?.username) body.username = options.username;
    if (options?.iconEmoji) body.icon_emoji = options.iconEmoji;

    const response = await this.post<SlackPostMessageResponse>(
      "chat.postMessage",
      body,
    );
    return response.message;
  }

  // ==========================================================================
  // Auth Methods
  // ==========================================================================

  /**
   * Test authentication
   */
  async testAuth(): Promise<{
    url: string;
    team: string;
    user: string;
    teamId: string;
    userId: string;
  }> {
    const response = await this.get<
      SlackApiResponse & {
        url: string;
        team: string;
        user: string;
        team_id: string;
        user_id: string;
      }
    >("auth.test");

    return {
      url: response.url,
      team: response.team,
      user: response.user,
      teamId: response.team_id,
      userId: response.user_id,
    };
  }

  /**
   * Revoke token
   */
  async revokeToken(): Promise<void> {
    await this.get<SlackApiResponse>("auth.revoke");
  }
}

// ============================================================================
// Slack API Error
// ============================================================================

export class SlackApiError extends Error {
  public readonly code: string;
  public readonly endpoint: string;

  constructor(code: string, endpoint: string) {
    super(`Slack API error: ${code} (endpoint: ${endpoint})`);
    this.name = "SlackApiError";
    this.code = code;
    this.endpoint = endpoint;
  }
}

// ============================================================================
// Slack Integration Provider
// ============================================================================

/**
 * Slack integration provider implementation
 */
export class SlackIntegrationProvider implements IntegrationProvider {
  readonly id = "slack" as const;
  readonly name = "Slack";
  readonly icon = "slack";
  readonly description = "Import channels and sync messages from Slack";
  readonly category = "communication" as const;
  readonly scopes: string[];

  private config: SlackClientConfig;
  private client: SlackApiClient | null = null;

  constructor(config: SlackClientConfig) {
    this.config = config;
    this.scopes = config.scopes || SLACK_DEFAULT_SCOPES;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(config?: Partial<OAuthConfig>): string {
    return buildAuthUrl(SLACK_AUTH_URL, {
      client_id: this.config.clientId,
      redirect_uri: config?.redirectUri || this.config.redirectUri,
      scope: (config?.scopes || this.scopes).join(","),
      state: config?.state || "",
    });
  }

  /**
   * Start authorization (redirects in browser)
   */
  async authorize(): Promise<void> {
    // This is handled by the integration manager
    // The provider just needs to implement the interface
  }

  /**
   * Disconnect from Slack
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.revokeToken();
      } catch (error) {
        // Ignore errors during revocation
        logger.warn("Failed to revoke Slack token:", { context: error });
      }
      this.client = null;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    params: OAuthCallbackParams,
  ): Promise<IntegrationCredentials> {
    if (!params.code) {
      throw new Error("Missing authorization code");
    }

    const response = await fetch(SLACK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: params.code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Failed to exchange code for token");
    }

    // Slack returns tokens differently for bot vs user tokens
    const accessToken = data.access_token || data.authed_user?.access_token;

    if (!accessToken) {
      throw new Error("No access token in response");
    }

    this.client = new SlackApiClient(accessToken);

    return {
      accessToken,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || "Bearer",
      scope: data.scope,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    credentials: IntegrationCredentials,
  ): Promise<IntegrationCredentials> {
    if (!credentials.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(SLACK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "refresh_token",
        refresh_token: credentials.refreshToken,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Failed to refresh token");
    }

    return tokenResponseToCredentials({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
    });
  }

  /**
   * Get current integration status
   */
  async getStatus(): Promise<Integration> {
    const status: Integration = {
      id: this.id,
      name: this.name,
      icon: this.icon,
      description: this.description,
      category: this.category,
      status: "disconnected",
      scopes: this.scopes,
      config: {},
    };

    if (this.client) {
      try {
        const auth = await this.client.testAuth();
        status.status = "connected";
        status.config = {
          team: auth.team,
          teamId: auth.teamId,
          user: auth.user,
          userId: auth.userId,
        };
      } catch {
        status.status = "error";
        status.error = "Failed to verify connection";
      }
    }

    return status;
  }

  /**
   * Validate credentials
   */
  async validateCredentials(
    credentials: IntegrationCredentials,
  ): Promise<boolean> {
    const testClient = new SlackApiClient(credentials.accessToken);
    try {
      await testClient.testAuth();
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Slack-Specific Methods
  // ==========================================================================

  /**
   * Get API client (creates if needed with credentials)
   */
  getClient(credentials?: IntegrationCredentials): SlackApiClient {
    if (credentials) {
      this.client = new SlackApiClient(credentials.accessToken);
    }
    if (!this.client) {
      throw new Error("Slack client not initialized. Please connect first.");
    }
    return this.client;
  }

  /**
   * Import Slack history
   */
  async importHistory(
    credentials: IntegrationCredentials,
    options?: SlackImportOptions,
  ): Promise<SlackSyncResult> {
    const client = this.getClient(credentials);
    const result: SlackSyncResult = {
      success: false,
      channelsSynced: 0,
      messagesSynced: 0,
      usersSynced: 0,
      errors: [],
    };

    try {
      // Fetch users first for mapping
      const users = await client.listAllUsers();
      result.usersSynced = users.length;

      // Fetch channels
      let channels = await client.listAllChannels();

      // Filter channels if specified
      if (options?.channelIds?.length) {
        channels = channels.filter((c) => options.channelIds!.includes(c.id));
      }

      // Import each channel's history
      for (const channel of channels) {
        try {
          const historyOptions: { oldest?: string; latest?: string } = {};

          if (options?.startDate) {
            historyOptions.oldest = (
              new Date(options.startDate).getTime() / 1000
            ).toString();
          }
          if (options?.endDate) {
            historyOptions.latest = (
              new Date(options.endDate).getTime() / 1000
            ).toString();
          }

          const messages = await client.getAllChannelHistory(
            channel.id,
            historyOptions,
          );
          result.messagesSynced += messages.length;
          result.channelsSynced++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          result.errors.push(
            `Failed to import channel ${channel.name}: ${errorMessage}`,
          );
        }
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Import failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Sync channels from Slack
   */
  async syncChannels(
    credentials: IntegrationCredentials,
  ): Promise<SlackChannel[]> {
    const client = this.getClient(credentials);
    return client.listAllChannels();
  }

  /**
   * Forward message to Slack channel
   */
  async forwardMessage(
    credentials: IntegrationCredentials,
    channelId: string,
    message: string,
    options?: {
      threadTs?: string;
      username?: string;
    },
  ): Promise<SlackMessage> {
    const client = this.getClient(credentials);
    return client.postMessage(channelId, message, options);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Slack integration provider
 */
export function createSlackProvider(
  config: SlackClientConfig,
): SlackIntegrationProvider {
  return new SlackIntegrationProvider(config);
}
