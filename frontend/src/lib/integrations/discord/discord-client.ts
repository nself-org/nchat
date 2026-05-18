/**
 * Discord Integration Client
 *
 * Handles Discord API interactions including OAuth, server sync,
 * message import, and bidirectional message forwarding.
 */

import type {
  IntegrationProvider,
  IntegrationCredentials,
  Integration,
  OAuthConfig,
  OAuthCallbackParams,
  DiscordGuild,
  DiscordChannel,
  DiscordUser,
  DiscordMessage,
  DiscordImportOptions,
  DiscordSyncResult,
} from "../types";
import {
  buildAuthUrl,
  tokenResponseToCredentials,
} from "../integration-manager";

// ============================================================================
// Constants
// ============================================================================

export const DISCORD_API_BASE = "https://discord.com/api/v10";
export const DISCORD_AUTH_URL = "https://discord.com/api/oauth2/authorize";
export const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";

export const DISCORD_DEFAULT_SCOPES = [
  "identify",
  "guilds",
  "guilds.members.read",
  "messages.read",
  "bot",
  "applications.commands",
  "webhooks.write",
];

// ============================================================================
// Discord API Response Types
// ============================================================================

interface DiscordApiErrorResponse {
  code: number;
  message: string;
  errors?: Record<string, unknown>;
}

// ============================================================================
// Discord Client Configuration
// ============================================================================

export interface DiscordClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  botToken?: string;
  scopes?: string[];
  webhookSecret?: string;
}

// ============================================================================
// Discord API Client
// ============================================================================

/**
 * Discord API client for making authenticated requests
 */
export class DiscordApiClient {
  private accessToken: string;
  private botToken?: string;

  constructor(accessToken: string, botToken?: string) {
    this.accessToken = accessToken;
    this.botToken = botToken;
  }

  /**
   * Make an authenticated GET request to Discord API
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${DISCORD_API_BASE}${endpoint}`);
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

    if (!response.ok) {
      const error: DiscordApiErrorResponse = await response.json();
      throw new DiscordApiError(
        error.message || `Discord API error: ${response.status}`,
        error.code,
        endpoint,
      );
    }

    return response.json();
  }

  /**
   * Make an authenticated POST request to Discord API
   */
  async post<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error: DiscordApiErrorResponse = await response.json();
      throw new DiscordApiError(
        error.message || `Discord API error: ${response.status}`,
        error.code,
        endpoint,
      );
    }

    return response.json();
  }

  /**
   * Make a bot-authenticated request
   */
  async botGet<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<T> {
    if (!this.botToken) {
      throw new Error("Bot token not configured");
    }

    const url = new URL(`${DISCORD_API_BASE}${endpoint}`);
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
        Authorization: `Bot ${this.botToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error: DiscordApiErrorResponse = await response.json();
      throw new DiscordApiError(
        error.message || `Discord API error: ${response.status}`,
        error.code,
        endpoint,
      );
    }

    return response.json();
  }

  /**
   * Make a bot-authenticated POST request
   */
  async botPost<T>(
    endpoint: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.botToken) {
      throw new Error("Bot token not configured");
    }

    const response = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${this.botToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error: DiscordApiErrorResponse = await response.json();
      throw new DiscordApiError(
        error.message || `Discord API error: ${response.status}`,
        error.code,
        endpoint,
      );
    }

    return response.json();
  }

  // ==========================================================================
  // User Methods
  // ==========================================================================

  /**
   * Get authenticated user
   */
  async getCurrentUser(): Promise<DiscordUser> {
    return this.get<DiscordUser>("/users/@me");
  }

  // ==========================================================================
  // Guild (Server) Methods
  // ==========================================================================

  /**
   * Get user's guilds
   */
  async getUserGuilds(): Promise<DiscordGuild[]> {
    return this.get<DiscordGuild[]>("/users/@me/guilds");
  }

  /**
   * Get guild information
   */
  async getGuild(guildId: string): Promise<DiscordGuild> {
    return this.botGet<DiscordGuild>(`/guilds/${guildId}`);
  }

  // ==========================================================================
  // Channel Methods
  // ==========================================================================

  /**
   * Get guild channels
   */
  async getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
    return this.botGet<DiscordChannel[]>(`/guilds/${guildId}/channels`);
  }

  /**
   * Get channel information
   */
  async getChannel(channelId: string): Promise<DiscordChannel> {
    return this.botGet<DiscordChannel>(`/channels/${channelId}`);
  }

  // ==========================================================================
  // Message Methods
  // ==========================================================================

  /**
   * Get channel messages
   */
  async getChannelMessages(
    channelId: string,
    options?: {
      limit?: number;
      before?: string;
      after?: string;
      around?: string;
    },
  ): Promise<DiscordMessage[]> {
    const params: Record<string, string> = {
      limit: String(options?.limit || 100),
    };
    if (options?.before) params.before = options.before;
    if (options?.after) params.after = options.after;
    if (options?.around) params.around = options.around;

    return this.botGet<DiscordMessage[]>(
      `/channels/${channelId}/messages`,
      params,
    );
  }

  /**
   * Get all messages from a channel (paginated)
   */
  async getAllChannelMessages(
    channelId: string,
    options?: {
      after?: string;
      before?: string;
    },
  ): Promise<DiscordMessage[]> {
    const allMessages: DiscordMessage[] = [];
    let lastMessageId: string | undefined = options?.before;

    while (true) {
      const messages = await this.getChannelMessages(channelId, {
        limit: 100,
        before: lastMessageId,
        after: options?.after,
      });

      if (messages.length === 0) break;

      allMessages.push(...messages);
      lastMessageId = messages[messages.length - 1].id;

      // Rate limiting: Discord allows 50 requests per second
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return allMessages;
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(
    channelId: string,
    content: string,
    options?: {
      embeds?: Array<Record<string, unknown>>;
      components?: Array<Record<string, unknown>>;
    },
  ): Promise<DiscordMessage> {
    const body: Record<string, unknown> = { content };
    if (options?.embeds) body.embeds = options.embeds;
    if (options?.components) body.components = options.components;

    return this.botPost<DiscordMessage>(
      `/channels/${channelId}/messages`,
      body,
    );
  }

  // ==========================================================================
  // Webhook Methods
  // ==========================================================================

  /**
   * Create a webhook for a channel
   */
  async createWebhook(
    channelId: string,
    name: string,
  ): Promise<{ id: string; token: string; url: string }> {
    return this.botPost(`/channels/${channelId}/webhooks`, { name });
  }

  /**
   * Execute a webhook (send message via webhook)
   */
  async executeWebhook(
    webhookId: string,
    webhookToken: string,
    content: string,
    options?: {
      username?: string;
      avatar_url?: string;
      embeds?: Array<Record<string, unknown>>;
    },
  ): Promise<void> {
    const body: Record<string, unknown> = { content };
    if (options?.username) body.username = options.username;
    if (options?.avatar_url) body.avatar_url = options.avatar_url;
    if (options?.embeds) body.embeds = options.embeds;

    await fetch(`${DISCORD_API_BASE}/webhooks/${webhookId}/${webhookToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
}

// ============================================================================
// Discord API Error
// ============================================================================

export class DiscordApiError extends Error {
  public readonly code: number;
  public readonly endpoint: string;

  constructor(message: string, code: number, endpoint: string) {
    super(
      `Discord API error: ${message} (code: ${code}, endpoint: ${endpoint})`,
    );
    this.name = "DiscordApiError";
    this.code = code;
    this.endpoint = endpoint;
  }
}

// ============================================================================
// Discord Integration Provider
// ============================================================================

/**
 * Discord integration provider implementation
 */
export class DiscordIntegrationProvider implements IntegrationProvider {
  readonly id = "discord" as const;
  readonly name = "Discord";
  readonly icon = "discord";
  readonly description = "Import servers and sync messages from Discord";
  readonly category = "communication" as const;
  readonly scopes: string[];

  private config: DiscordClientConfig;
  private client: DiscordApiClient | null = null;

  constructor(config: DiscordClientConfig) {
    this.config = config;
    this.scopes = config.scopes || DISCORD_DEFAULT_SCOPES;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(config?: Partial<OAuthConfig>): string {
    return buildAuthUrl(DISCORD_AUTH_URL, {
      client_id: this.config.clientId,
      redirect_uri: config?.redirectUri || this.config.redirectUri,
      response_type: "code",
      scope: (config?.scopes || this.scopes).join(" "),
      state: config?.state || "",
    });
  }

  /**
   * Start authorization
   */
  async authorize(): Promise<void> {
    // Handled by integration manager
  }

  /**
   * Disconnect from Discord
   */
  async disconnect(): Promise<void> {
    this.client = null;
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

    const response = await fetch(DISCORD_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: params.code,
        grant_type: "authorization_code",
        redirect_uri: this.config.redirectUri,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    if (!data.access_token) {
      throw new Error("No access token in response");
    }

    this.client = new DiscordApiClient(data.access_token, this.config.botToken);

    return tokenResponseToCredentials({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
    });
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

    const response = await fetch(DISCORD_TOKEN_URL, {
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

    if (data.error) {
      throw new Error(data.error_description || data.error);
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
        const user = await this.client.getCurrentUser();
        status.status = "connected";
        status.config = {
          username: user.username,
          discriminator: user.discriminator,
          id: user.id,
          avatarUrl: user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : undefined,
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
    const testClient = new DiscordApiClient(
      credentials.accessToken,
      this.config.botToken,
    );
    try {
      await testClient.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Discord-Specific Methods
  // ==========================================================================

  /**
   * Get API client
   */
  getClient(credentials?: IntegrationCredentials): DiscordApiClient {
    if (credentials) {
      this.client = new DiscordApiClient(
        credentials.accessToken,
        this.config.botToken,
      );
    }
    if (!this.client) {
      throw new Error("Discord client not initialized. Please connect first.");
    }
    return this.client;
  }

  /**
   * Import Discord history
   */
  async importHistory(
    credentials: IntegrationCredentials,
    options?: DiscordImportOptions,
  ): Promise<DiscordSyncResult> {
    const client = this.getClient(credentials);
    const result: DiscordSyncResult = {
      success: false,
      guildsSynced: 0,
      channelsSynced: 0,
      messagesSynced: 0,
      errors: [],
    };

    try {
      // Fetch user's guilds
      let guilds = await client.getUserGuilds();

      // Filter guilds if specified
      if (options?.guildIds?.length) {
        guilds = guilds.filter((g) => options.guildIds!.includes(g.id));
      }

      // Import each guild's channels and messages
      for (const guild of guilds) {
        try {
          const channels = await client.getGuildChannels(guild.id);

          // Filter text channels only
          const textChannels = channels.filter((c) => c.type === 0); // 0 = GUILD_TEXT

          // Filter channels if specified
          let targetChannels = textChannels;
          if (options?.channelIds?.length) {
            targetChannels = textChannels.filter((c) =>
              options.channelIds!.includes(c.id),
            );
          }

          for (const channel of targetChannels) {
            try {
              const historyOptions: { after?: string; before?: string } = {};

              if (options?.startDate) {
                // Discord uses snowflake IDs, convert date to snowflake
                const timestamp = new Date(options.startDate).getTime();
                historyOptions.after = String(
                  (timestamp - 1420070400000) * 4194304,
                );
              }
              if (options?.endDate) {
                const timestamp = new Date(options.endDate).getTime();
                historyOptions.before = String(
                  (timestamp - 1420070400000) * 4194304,
                );
              }

              const messages = await client.getAllChannelMessages(
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

          result.guildsSynced++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          result.errors.push(
            `Failed to import guild ${guild.name}: ${errorMessage}`,
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
   * Sync guilds from Discord
   */
  async syncGuilds(
    credentials: IntegrationCredentials,
  ): Promise<DiscordGuild[]> {
    const client = this.getClient(credentials);
    return client.getUserGuilds();
  }

  /**
   * Forward message to Discord channel
   */
  async forwardMessage(
    credentials: IntegrationCredentials,
    channelId: string,
    message: string,
    options?: {
      embeds?: Array<Record<string, unknown>>;
    },
  ): Promise<DiscordMessage> {
    const client = this.getClient(credentials);
    return client.sendMessage(channelId, message, options);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Discord integration provider
 */
export function createDiscordProvider(
  config: DiscordClientConfig,
): DiscordIntegrationProvider {
  return new DiscordIntegrationProvider(config);
}
