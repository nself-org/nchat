/**
 * Bot API Implementation
 * API interface for bots to interact with nchat
 */

import type {
  BotApi,
  BotManifest,
  BotConfig,
  BotResponse,
  ChannelId,
  MessageId,
  UserId,
  ChannelEventData,
  UserEventData,
} from "./bot-types";
import { logger } from "@/lib/logger";

// ============================================================================
// BOT API IMPLEMENTATION
// ============================================================================

/**
 * Create a bot API instance for a specific bot
 */
export function createBotApi(
  manifest: BotManifest,
  config: BotConfig,
  services: BotServices,
): BotApi {
  return {
    // ========================================================================
    // MESSAGE OPERATIONS
    // ========================================================================

    async sendMessage(
      channelId: ChannelId,
      response: BotResponse,
    ): Promise<MessageId> {
      return services.messaging.send(channelId, response);
    },

    async replyToMessage(
      messageId: MessageId,
      response: BotResponse,
    ): Promise<MessageId> {
      return services.messaging.reply(messageId, response);
    },

    async editMessage(
      messageId: MessageId,
      response: BotResponse,
    ): Promise<void> {
      return services.messaging.edit(messageId, response);
    },

    async deleteMessage(messageId: MessageId): Promise<void> {
      return services.messaging.delete(messageId);
    },

    // ========================================================================
    // REACTION OPERATIONS
    // ========================================================================

    async addReaction(messageId: MessageId, emoji: string): Promise<void> {
      return services.reactions.add(messageId, emoji);
    },

    async removeReaction(messageId: MessageId, emoji: string): Promise<void> {
      return services.reactions.remove(messageId, emoji);
    },

    // ========================================================================
    // CHANNEL OPERATIONS
    // ========================================================================

    async getChannel(channelId: ChannelId): Promise<ChannelEventData | null> {
      return services.channels.get(channelId);
    },

    async getChannelMembers(channelId: ChannelId): Promise<UserEventData[]> {
      return services.channels.getMembers(channelId);
    },

    // ========================================================================
    // USER OPERATIONS
    // ========================================================================

    async getUser(userId: UserId): Promise<UserEventData | null> {
      return services.users.get(userId);
    },

    mentionUser(userId: UserId): string {
      return `<@${userId}>`;
    },

    // ========================================================================
    // STORAGE OPERATIONS
    // ========================================================================

    async getStorage<T = unknown>(key: string): Promise<T | null> {
      return services.storage.get<T>(manifest.id, key);
    },

    async setStorage<T = unknown>(key: string, value: T): Promise<void> {
      return services.storage.set(manifest.id, key, value);
    },

    async deleteStorage(key: string): Promise<void> {
      return services.storage.delete(manifest.id, key);
    },

    // ========================================================================
    // SCHEDULING
    // ========================================================================

    async scheduleMessage(
      channelId: ChannelId,
      response: BotResponse,
      delay: number,
    ): Promise<string> {
      return services.scheduler.schedule(
        manifest.id,
        channelId,
        response,
        delay,
      );
    },

    async cancelScheduledMessage(scheduleId: string): Promise<void> {
      return services.scheduler.cancel(scheduleId);
    },

    // ========================================================================
    // BOT INFO
    // ========================================================================

    getBotInfo(): BotManifest {
      return manifest;
    },

    getBotConfig(): BotConfig {
      return config;
    },
  };
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Services required by the bot API
 */
export interface BotServices {
  messaging: MessagingService;
  reactions: ReactionService;
  channels: ChannelService;
  users: UserService;
  storage: StorageService;
  scheduler: SchedulerService;
}

/**
 * Messaging service interface
 */
export interface MessagingService {
  send(channelId: ChannelId, response: BotResponse): Promise<MessageId>;
  reply(messageId: MessageId, response: BotResponse): Promise<MessageId>;
  edit(messageId: MessageId, response: BotResponse): Promise<void>;
  delete(messageId: MessageId): Promise<void>;
}

/**
 * Reaction service interface
 */
export interface ReactionService {
  add(messageId: MessageId, emoji: string): Promise<void>;
  remove(messageId: MessageId, emoji: string): Promise<void>;
}

/**
 * Channel service interface
 */
export interface ChannelService {
  get(channelId: ChannelId): Promise<ChannelEventData | null>;
  getMembers(channelId: ChannelId): Promise<UserEventData[]>;
}

/**
 * User service interface
 */
export interface UserService {
  get(userId: UserId): Promise<UserEventData | null>;
}

/**
 * Storage service interface
 */
export interface StorageService {
  get<T = unknown>(botId: string, key: string): Promise<T | null>;
  set<T = unknown>(botId: string, key: string, value: T): Promise<void>;
  delete(botId: string, key: string): Promise<void>;
}

/**
 * Scheduler service interface
 */
export interface SchedulerService {
  schedule(
    botId: string,
    channelId: ChannelId,
    response: BotResponse,
    delay: number,
  ): Promise<string>;
  cancel(scheduleId: string): Promise<void>;
}

// ============================================================================
// MOCK SERVICES (for development/testing)
// ============================================================================

/**
 * Create mock services for development
 */
export function createMockServices(): BotServices {
  const storage = new Map<string, unknown>();
  const schedules = new Map<string, NodeJS.Timeout>();

  return {
    messaging: {
      async send(channelId, response) {
        return `msg_${Date.now()}`;
      },
      async reply(messageId, response) {
        return `msg_${Date.now()}`;
      },
      async edit(messageId, response) {},
      async delete(messageId) {},
    },

    reactions: {
      async add(messageId, emoji) {},
      async remove(messageId, emoji) {},
    },

    channels: {
      async get(channelId) {
        return {
          channelId,
          name: "mock-channel",
          type: "public" as const,
          description: "A mock channel for testing",
        };
      },
      async getMembers() {
        return [
          {
            userId: "user_1",
            channelId: "channel_1",
            displayName: "Test User 1",
            role: "member",
          },
          {
            userId: "user_2",
            channelId: "channel_1",
            displayName: "Test User 2",
            role: "member",
          },
        ];
      },
    },

    users: {
      async get(userId) {
        return {
          userId,
          channelId: "channel_1",
          displayName: `User ${userId}`,
          role: "member",
        };
      },
    },

    storage: {
      async get<T>(botId: string, key: string): Promise<T | null> {
        const fullKey = `${botId}:${key}`;
        return (storage.get(fullKey) as T) || null;
      },
      async set<T>(botId: string, key: string, value: T) {
        const fullKey = `${botId}:${key}`;
        storage.set(fullKey, value);
      },
      async delete(botId: string, key: string) {
        const fullKey = `${botId}:${key}`;
        storage.delete(fullKey);
      },
    },

    scheduler: {
      async schedule(botId, channelId, response, delay) {
        const id = `sched_${Date.now()}`;
        const timeout = setTimeout(() => {
          schedules.delete(id);
        }, delay);
        schedules.set(id, timeout);
        return id;
      },
      async cancel(scheduleId) {
        const timeout = schedules.get(scheduleId);
        if (timeout) {
          clearTimeout(timeout);
          schedules.delete(scheduleId);
        }
      },
    },
  };
}

// ============================================================================
// API HELPERS
// ============================================================================

/**
 * Check if bot has a specific permission
 */
export function hasPermission(
  manifest: BotManifest,
  permission: string,
): boolean {
  return (
    manifest.permissions.includes(permission as never) ||
    manifest.permissions.includes("admin")
  );
}

/**
 * Validate bot can perform action based on permissions
 */
export function validatePermission(
  manifest: BotManifest,
  permission: string,
): void {
  if (!hasPermission(manifest, permission)) {
    throw new Error(
      `Bot '${manifest.name}' does not have permission: ${permission}`,
    );
  }
}

/**
 * Create a rate-limited API wrapper
 */
export function withRateLimit(api: BotApi, requestsPerMinute = 60): BotApi {
  const requests: number[] = [];
  const interval = 60000 / requestsPerMinute;

  const checkRateLimit = () => {
    const now = Date.now();
    // Remove old requests
    while (requests.length > 0 && requests[0] < now - 60000) {
      requests.shift();
    }
    if (requests.length >= requestsPerMinute) {
      throw new Error(
        "Rate limit exceeded. Please wait before making more requests.",
      );
    }
    requests.push(now);
  };

  return new Proxy(api, {
    get(target, prop) {
      const value = target[prop as keyof BotApi];
      if (typeof value === "function") {
        return (...args: unknown[]) => {
          checkRateLimit();
          return (value as Function).apply(target, args);
        };
      }
      return value;
    },
  });
}

/**
 * Create a logging wrapper for the API
 */
export function withLogging(api: BotApi, botId: string): BotApi {
  return new Proxy(api, {
    get(target, prop) {
      const value = target[prop as keyof BotApi];
      if (typeof value === "function") {
        return async (...args: unknown[]) => {
          try {
            const result = await (value as Function).apply(target, args);
            return result;
          } catch (error) {
            logger.error(`[Bot:${botId}] ${String(prop)} ERROR:`, error);
            throw error;
          }
        };
      }
      return value;
    },
  });
}
