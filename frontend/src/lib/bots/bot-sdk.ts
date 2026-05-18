/**
 * Bot SDK v0.7.0
 * High-level SDK for building nchat bots
 *
 * Features:
 * - Fluent bot builder API
 * - Event system (message, command, reaction, etc.)
 * - Context API for accessing channel/user/message info
 * - Response builders for rich messages
 * - State management API
 * - Webhook integration
 * - Version management
 * - Sandbox execution support
 */

// Extend Reflect for metadata support (requires reflect-metadata polyfill)
declare global {
  namespace Reflect {
    function getMetadata(key: string | symbol, target: object): unknown;
    function defineMetadata(
      key: string | symbol,
      value: unknown,
      target: object,
    ): void;
  }
}

/**
 * Type for command metadata stored via decorators
 */
interface CommandMetadata {
  definition: BotCommandDefinition;
  methodName: string;
}

/**
 * Bot version information
 */
export interface BotVersion {
  version: string;
  changelog?: string;
  createdAt: Date;
  isPublished: boolean;
}

import type {
  BotManifest,
  BotConfig,
  BotCommandDefinition,
  BotTriggerDefinition,
  BotSettingDefinition,
  BotPermission,
  CommandHandler,
  MessageHandler,
  UserEventHandler,
  ReactionHandler,
  CommandContext,
  MessageContext,
  UserContext,
  ReactionContext,
  BotApi,
  BotResponse,
  ChannelId,
} from "./bot-types";

import { BotInstance, getRuntime, createBot } from "./bot-runtime";
import { command, CommandBuilder } from "./bot-commands";
import {
  response,
  embed,
  button,
  select,
  text,
  error,
  success,
  info,
  warning,
  confirm,
  list,
  code,
  quote,
} from "./bot-responses";
import {
  parseDuration,
  formatDuration,
  matchesKeyword,
  matchesPattern,
} from "./bot-events";

import { logger } from "@/lib/logger";

// ============================================================================
// BOT BUILDER
// ============================================================================

/**
 * Fluent bot builder for creating bots
 */
export class BotBuilder {
  private manifest: Partial<BotManifest>;
  private config: Partial<BotConfig>;
  private commandDefs: Array<{
    definition: BotCommandDefinition;
    handler: CommandHandler;
  }> = [];
  private messageHandlers: MessageHandler[] = [];
  private userJoinHandlers: UserEventHandler[] = [];
  private userLeaveHandlers: UserEventHandler[] = [];
  private reactionHandlers: ReactionHandler[] = [];
  private initHandler?: (bot: BotInstance, api: BotApi) => void | Promise<void>;

  constructor(id: string) {
    this.manifest = {
      id,
      permissions: ["read_messages", "send_messages"],
    };
    this.config = {
      id,
      enabled: true,
    };
  }

  /**
   * Set bot name
   */
  name(name: string): this {
    this.manifest.name = name;
    return this;
  }

  /**
   * Set bot description
   */
  description(description: string): this {
    this.manifest.description = description;
    return this;
  }

  /**
   * Set bot version
   */
  version(version: string): this {
    this.manifest.version = version;
    return this;
  }

  /**
   * Set bot author
   */
  author(author: string): this {
    this.manifest.author = author;
    return this;
  }

  /**
   * Set bot icon
   */
  icon(icon: string): this {
    this.manifest.icon = icon;
    return this;
  }

  /**
   * Set bot permissions
   */
  permissions(...permissions: BotPermission[]): this {
    this.manifest.permissions = permissions;
    return this;
  }

  /**
   * Add a permission
   */
  addPermission(permission: BotPermission): this {
    if (!this.manifest.permissions) {
      this.manifest.permissions = [];
    }
    if (!this.manifest.permissions.includes(permission)) {
      this.manifest.permissions.push(permission);
    }
    return this;
  }

  /**
   * Set enabled channels
   */
  channels(...channelIds: ChannelId[]): this {
    this.config.channels = channelIds;
    return this;
  }

  /**
   * Set bot settings
   */
  settings(settings: Record<string, unknown>): this {
    this.config.settings = settings;
    return this;
  }

  /**
   * Add a command using builder
   */
  command(cmd: CommandBuilder, handler: CommandHandler): this;
  command(name: string, description: string, handler: CommandHandler): this;
  command(
    nameOrBuilder: string | CommandBuilder,
    descriptionOrHandler: string | CommandHandler,
    maybeHandler?: CommandHandler,
  ): this {
    if (typeof nameOrBuilder === "string") {
      const definition: BotCommandDefinition = {
        name: nameOrBuilder,
        description: descriptionOrHandler as string,
      };
      this.commandDefs.push({ definition, handler: maybeHandler! });
    } else {
      const definition = nameOrBuilder.build();
      this.commandDefs.push({
        definition,
        handler: descriptionOrHandler as CommandHandler,
      });
    }
    return this;
  }

  /**
   * Add a message handler
   */
  onMessage(handler: MessageHandler): this {
    this.messageHandlers.push(handler);
    return this;
  }

  /**
   * Add keyword trigger
   */
  onKeyword(keywords: string[], handler: MessageHandler): this {
    this.messageHandlers.push((ctx, api) => {
      if (matchesKeyword(ctx.message.content, keywords)) {
        return handler(ctx, api);
      }
    });
    return this;
  }

  /**
   * Add pattern trigger
   */
  onPattern(patterns: string[], handler: MessageHandler): this {
    this.messageHandlers.push((ctx, api) => {
      if (matchesPattern(ctx.message.content, patterns)) {
        return handler(ctx, api);
      }
    });
    return this;
  }

  /**
   * Add mention trigger
   */
  onMention(handler: MessageHandler): this {
    this.messageHandlers.push((ctx, api) => {
      if (ctx.isMention) {
        return handler(ctx, api);
      }
    });
    return this;
  }

  /**
   * Add user join handler
   */
  onUserJoin(handler: UserEventHandler): this {
    this.userJoinHandlers.push(handler);
    return this;
  }

  /**
   * Add user leave handler
   */
  onUserLeave(handler: UserEventHandler): this {
    this.userLeaveHandlers.push(handler);
    return this;
  }

  /**
   * Add reaction handler
   */
  onReaction(handler: ReactionHandler): this {
    this.reactionHandlers.push(handler);
    return this;
  }

  /**
   * Add initialization handler
   */
  onInit(
    handler: (bot: BotInstance, api: BotApi) => void | Promise<void>,
  ): this {
    this.initHandler = handler;
    return this;
  }

  /**
   * Build and register the bot
   */
  build(): BotInstance {
    const manifest: BotManifest = {
      id: this.manifest.id!,
      name: this.manifest.name || this.manifest.id!,
      description: this.manifest.description || "",
      version: this.manifest.version || "1.0.0",
      author: this.manifest.author,
      icon: this.manifest.icon,
      permissions: this.manifest.permissions || [
        "read_messages",
        "send_messages",
      ],
      commands: this.commandDefs.map((c) => c.definition),
    };

    const config: BotConfig = {
      id: this.config.id!,
      enabled: this.config.enabled ?? true,
      channels: this.config.channels,
      settings: this.config.settings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const bot = getRuntime().register(manifest, config, (instance) => {
      // Register commands
      for (const { definition, handler } of this.commandDefs) {
        instance.commands.register(definition, handler);
      }

      // Register handlers
      for (const handler of this.messageHandlers) {
        instance.onMessage(handler);
      }
      for (const handler of this.userJoinHandlers) {
        instance.onUserJoin(handler);
      }
      for (const handler of this.userLeaveHandlers) {
        instance.onUserLeave(handler);
      }
      for (const handler of this.reactionHandlers) {
        instance.onReaction(handler);
      }

      // Run init handler
      if (this.initHandler) {
        Promise.resolve(this.initHandler(instance, instance.api)).catch(
          (err) => {
            logger.error(
              `[BotBuilder] Init error for '${manifest.name}':`,
              err,
            );
          },
        );
      }
    });

    bot.start();
    return bot;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new bot builder
 */
export function bot(id: string): BotBuilder {
  return new BotBuilder(id);
}

/**
 * Quick bot creation with minimal config
 */
export function quickBot(
  id: string,
  name: string,
  setup: (bot: BotBuilder) => void,
): BotInstance {
  const builder = bot(id).name(name);
  setup(builder);
  return builder.build();
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

// Command building
export { command, CommandBuilder };

// Response building
export {
  response,
  embed,
  button,
  select,
  text,
  error,
  success,
  info,
  warning,
  confirm,
  list,
  code,
  quote,
};

// Event helpers
export { parseDuration, formatDuration, matchesKeyword, matchesPattern };

// Runtime
export { getRuntime, createBot, BotInstance };

// Types
export type {
  BotManifest,
  BotConfig,
  BotApi,
  BotResponse,
  CommandContext,
  MessageContext,
  UserContext,
  ReactionContext,
  CommandHandler,
  MessageHandler,
  UserEventHandler,
  ReactionHandler,
};

// ============================================================================
// DECORATORS (for class-based bots)
// ============================================================================

/**
 * Command decorator metadata key
 */
const COMMAND_METADATA_KEY = Symbol("commands");

/**
 * Command decorator
 */
export function Command(nameOrDef: string | BotCommandDefinition) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const existing = Reflect.getMetadata(
      COMMAND_METADATA_KEY,
      target.constructor,
    );
    const commands: CommandMetadata[] = Array.isArray(existing) ? existing : [];
    const definition: BotCommandDefinition =
      typeof nameOrDef === "string"
        ? { name: nameOrDef, description: "" }
        : nameOrDef;
    commands.push({
      definition,
      methodName: propertyKey,
    });
    Reflect.defineMetadata(COMMAND_METADATA_KEY, commands, target.constructor);
    return descriptor;
  };
}

/**
 * Base class for class-based bots
 */
export abstract class BaseBot {
  public readonly instance: BotInstance;
  protected readonly api: BotApi;

  constructor(
    id: string,
    name: string,
    description: string = "",
    permissions: BotPermission[] = ["read_messages", "send_messages"],
  ) {
    const manifest: BotManifest = {
      id,
      name,
      description,
      version: "1.0.0",
      permissions,
    };

    this.instance = getRuntime().register(manifest, undefined, (bot) => {
      this.setupCommands(bot);
      this.setup(bot);
    });

    this.api = this.instance.api;
    this.instance.start();
  }

  /**
   * Override to add custom setup
   */
  protected setup(bot: BotInstance): void {
    // Override in subclass
  }

  /**
   * Setup decorated commands
   */
  private setupCommands(bot: BotInstance): void {
    const existing = Reflect.getMetadata(
      COMMAND_METADATA_KEY,
      this.constructor,
    );
    const commands: CommandMetadata[] = Array.isArray(existing) ? existing : [];
    for (const { definition, methodName } of commands) {
      const method = (this as Record<string, unknown>)[
        methodName
      ] as CommandHandler;
      if (typeof method === "function") {
        bot.commands.register(definition, method.bind(this));
      }
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a simple echo bot for testing
 */
export function createEchoBot(id = "echo-bot"): BotInstance {
  return bot(id)
    .name("Echo Bot")
    .description("Echoes back messages")
    .command("echo", "Echo a message", (ctx) => {
      const message = (ctx.args._raw as string) || "Nothing to echo!";
      return text(message);
    })
    .onMention((ctx) => {
      return text(`You mentioned me! You said: "${ctx.message.content}"`);
    })
    .build();
}

/**
 * Create a simple ping bot for testing
 */
export function createPingBot(id = "ping-bot"): BotInstance {
  return bot(id)
    .name("Ping Bot")
    .description("Responds to ping with pong")
    .command("ping", "Check if bot is alive", () => {
      return text("Pong!");
    })
    .build();
}
