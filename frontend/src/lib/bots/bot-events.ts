/**
 * Bot Events System
 * Event handling and dispatch for bot SDK
 */

import type {
  TriggerEvent,
  BotEvent,
  MessageEventData,
  UserEventData,
  ReactionEventData,
  ChannelEventData,
  MessageContext,
  UserContext,
  ReactionContext,
  ParsedCommand,
  MessageHandler,
  UserEventHandler,
  ReactionHandler,
  EventHandler,
  BotApi,
} from "./bot-types";
import { logger } from "@/lib/logger";

// ============================================================================
// EVENT EMITTER
// ============================================================================

type EventCallback<T = unknown> = (
  event: T,
  api: BotApi,
) => void | Promise<void>;

/**
 * Simple typed event emitter for bots
 */
export class BotEventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private onceListeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Register an event listener
   */
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback);
    };
  }

  /**
   * Register a one-time event listener
   */
  once<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(callback as EventCallback);

    return () => {
      this.onceListeners.get(event)?.delete(callback as EventCallback);
    };
  }

  /**
   * Remove an event listener
   */
  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
    this.onceListeners.get(event)?.delete(callback);
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Emit an event to all listeners
   */
  async emit<T = unknown>(event: string, data: T, api: BotApi): Promise<void> {
    const regularListeners = this.listeners.get(event) || new Set();
    const onceListenerSet = this.onceListeners.get(event) || new Set();

    // Execute regular listeners
    for (const listener of regularListeners) {
      try {
        await listener(data, api);
      } catch (error) {
        logger.error(
          `[BotEventEmitter] Error in listener for '${event}':`,
          error,
        );
      }
    }

    // Execute and remove once listeners
    for (const listener of onceListenerSet) {
      try {
        await listener(data, api);
      } catch (error) {
        logger.error(
          `[BotEventEmitter] Error in once listener for '${event}':`,
          error,
        );
      }
    }
    this.onceListeners.delete(event);
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return (
      (this.listeners.get(event)?.size || 0) +
      (this.onceListeners.get(event)?.size || 0)
    );
  }

  /**
   * Get all event names with listeners
   */
  eventNames(): string[] {
    const names = new Set([
      ...this.listeners.keys(),
      ...this.onceListeners.keys(),
    ]);
    return Array.from(names);
  }
}

// ============================================================================
// EVENT FACTORY
// ============================================================================

/**
 * Create a base event object
 */
export function createBaseEvent(type: TriggerEvent): BotEvent {
  return {
    id: generateEventId(),
    type,
    timestamp: new Date(),
  };
}

/**
 * Create a message event
 */
export function createMessageEvent(
  data: MessageEventData,
  channel: { id: string; name: string; type: "public" | "private" | "direct" },
  user: { id: string; displayName: string; avatarUrl?: string; role?: string },
): MessageContext {
  const content = data.content.trim();
  const commandMatch = content.match(/^\/(\w+)(?:\s+(.*))?$/);
  const isCommand = !!commandMatch;

  let command: ParsedCommand | undefined;
  if (isCommand && commandMatch) {
    command = {
      name: commandMatch[1].toLowerCase(),
      rawArgs: commandMatch[2] || "",
      args: parseCommandArgs(commandMatch[2] || ""),
      prefix: "/",
    };
  }

  return {
    message: data,
    channel,
    user,
    isCommand,
    command,
    isMention: (data.mentions?.length || 0) > 0,
    isThread: !!data.threadId,
    isDirect: channel.type === "direct",
  };
}

/**
 * Create a user join/leave event
 */
export function createUserEvent(
  data: UserEventData,
  channel: { id: string; name: string; type: "public" | "private" | "direct" },
  memberCount?: number,
): UserContext {
  return {
    user: data,
    channel,
    memberCount,
  };
}

/**
 * Create a reaction event
 */
export function createReactionEvent(
  reaction: ReactionEventData,
  message: MessageEventData,
  user: { id: string; displayName: string },
): ReactionContext {
  return {
    reaction,
    message,
    user,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parse command arguments into an object
 * Supports: positional args, named args (--name value, --flag)
 */
function parseCommandArgs(rawArgs: string): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const positional: string[] = [];
  const tokens = tokenize(rawArgs);

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    if (token.startsWith("--")) {
      const key = token.slice(2);
      const nextToken = tokens[i + 1];

      // Check if next token is a value or another flag
      if (nextToken && !nextToken.startsWith("--")) {
        args[key] = parseValue(nextToken);
        i += 2;
      } else {
        // Boolean flag
        args[key] = true;
        i += 1;
      }
    } else if (token.startsWith("-") && token.length === 2) {
      const key = token.slice(1);
      const nextToken = tokens[i + 1];

      if (nextToken && !nextToken.startsWith("-")) {
        args[key] = parseValue(nextToken);
        i += 2;
      } else {
        args[key] = true;
        i += 1;
      }
    } else {
      positional.push(token);
      i += 1;
    }
  }

  // Add positional arguments
  if (positional.length > 0) {
    args._positional = positional;
    positional.forEach((value, index) => {
      args[`$${index}`] = value;
    });
  }

  return args;
}

/**
 * Tokenize a command string, respecting quotes
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
    } else if (char === " " && !inQuotes) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse a string value to appropriate type
 */
function parseValue(value: string): unknown {
  // Try number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  // Try boolean
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  // Return as string
  return value;
}

// ============================================================================
// EVENT MATCHERS
// ============================================================================

/**
 * Check if a message matches a keyword
 */
export function matchesKeyword(content: string, keywords: string[]): boolean {
  const lowerContent = content.toLowerCase();
  return keywords.some((keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    // Support wildcards
    if (lowerKeyword.includes("*")) {
      const pattern = lowerKeyword.replace(/\*/g, ".*");
      return new RegExp(`^${pattern}$`).test(lowerContent);
    }
    return lowerContent.includes(lowerKeyword);
  });
}

/**
 * Check if a message matches a pattern (regex)
 */
export function matchesPattern(content: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    try {
      return new RegExp(pattern, "i").test(content);
    } catch {
      return false;
    }
  });
}

/**
 * Check if a user/channel is in the allowed list
 */
export function isAllowed(id: string, allowList?: string[]): boolean {
  if (!allowList || allowList.length === 0) return true;
  return allowList.includes(id);
}

// ============================================================================
// DURATION PARSER
// ============================================================================

/**
 * Parse a duration string to milliseconds
 * Examples: "5m", "1h", "30s", "1d", "1w"
 */
export function parseDuration(input: string): number | null {
  const match = input.match(
    /^(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days|w|week|weeks)$/i,
  );

  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    sec: 1000,
    second: 1000,
    seconds: 1000,
    m: 60 * 1000,
    min: 60 * 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    h: 60 * 60 * 1000,
    hr: 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit] || 0);
}

/**
 * Format milliseconds to a human-readable duration
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (weeks > 0) return `${weeks} week${weeks === 1 ? "" : "s"}`;
  if (days > 0) return `${days} day${days === 1 ? "" : "s"}`;
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

// ============================================================================
// EVENT TYPES EXPORT
// ============================================================================

export const EVENT_TYPES: Record<TriggerEvent, string> = {
  message_created: "Message Created",
  message_edited: "Message Edited",
  message_deleted: "Message Deleted",
  reaction_added: "Reaction Added",
  reaction_removed: "Reaction Removed",
  user_joined: "User Joined",
  user_left: "User Left",
  channel_created: "Channel Created",
  channel_updated: "Channel Updated",
  mention: "Bot Mentioned",
  keyword: "Keyword Detected",
  scheduled: "Scheduled Task",
  webhook: "Webhook Received",
};

export type {
  TriggerEvent,
  BotEvent,
  MessageEventData,
  UserEventData,
  ReactionEventData,
  ChannelEventData,
  MessageContext,
  UserContext,
  ReactionContext,
  MessageHandler,
  UserEventHandler,
  ReactionHandler,
  EventHandler,
};
