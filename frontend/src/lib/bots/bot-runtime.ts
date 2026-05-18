/**
 * Bot Runtime System
 * Manages bot lifecycle, event routing, and execution
 */

import type {
  BotManifest,
  BotConfig,
  BotState,
  BotApi,
  BotId,
  ChannelId,
  TriggerEvent,
  MessageContext,
  UserContext,
  ReactionContext,
  MessageHandler,
  UserEventHandler,
  ReactionHandler,
  CommandHandler,
  BotResponse,
} from "./bot-types";
import { BotEventEmitter } from "./bot-events";
import { CommandRegistry, createHelpCommand } from "./bot-commands";
import { createBotApi, createMockServices, type BotServices } from "./bot-api";
import { createLogger } from "@/lib/logger";

const logger = createLogger("BotRuntime");

// ============================================================================
// BOT INSTANCE
// ============================================================================

/**
 * Individual bot instance
 */
export class BotInstance {
  public readonly manifest: BotManifest;
  public config: BotConfig;
  public state: BotState;
  public readonly api: BotApi;
  public readonly commands: CommandRegistry;
  public readonly events: BotEventEmitter;

  private messageHandlers: MessageHandler[] = [];
  private userJoinHandlers: UserEventHandler[] = [];
  private userLeaveHandlers: UserEventHandler[] = [];
  private reactionHandlers: ReactionHandler[] = [];
  private cleanupFunctions: Array<() => void> = [];

  constructor(manifest: BotManifest, config: BotConfig, services: BotServices) {
    this.manifest = manifest;
    this.config = config;
    this.state = {
      status: "initializing",
      stats: {
        messagesProcessed: 0,
        commandsExecuted: 0,
        errorsCount: 0,
      },
    };
    this.api = createBotApi(manifest, config, services);
    this.commands = new CommandRegistry("/");
    this.events = new BotEventEmitter();

    // Register manifest commands
    if (manifest.commands) {
      for (const cmd of manifest.commands) {
        // Commands will be registered by the bot implementation
      }
    }
  }

  /**
   * Register a command handler
   */
  command(name: string, handler: CommandHandler): this {
    const cmdDef = this.manifest.commands?.find((c) => c.name === name);
    if (cmdDef) {
      this.commands.register(cmdDef, handler);
    } else {
      // Create a simple command definition
      this.commands.register(
        { name, description: `Command: ${name}` },
        handler,
      );
    }
    return this;
  }

  /**
   * Register a message handler
   */
  onMessage(handler: MessageHandler): this {
    this.messageHandlers.push(handler);
    return this;
  }

  /**
   * Register a user join handler
   */
  onUserJoin(handler: UserEventHandler): this {
    this.userJoinHandlers.push(handler);
    return this;
  }

  /**
   * Register a user leave handler
   */
  onUserLeave(handler: UserEventHandler): this {
    this.userLeaveHandlers.push(handler);
    return this;
  }

  /**
   * Register a reaction handler
   */
  onReaction(handler: ReactionHandler): this {
    this.reactionHandlers.push(handler);
    return this;
  }

  /**
   * Handle incoming message event
   */
  async handleMessage(ctx: MessageContext): Promise<BotResponse | void> {
    if (!this.isActive()) return;
    if (!this.isChannelAllowed(ctx.channel.id)) return;

    this.state.lastActivity = new Date();
    this.state.stats.messagesProcessed++;

    try {
      // Check for commands first
      if (ctx.isCommand && ctx.command) {
        const result = await this.commands.execute(ctx, this.api);
        if (result) {
          this.state.stats.commandsExecuted++;
          return result;
        }
      }

      // Run message handlers
      for (const handler of this.messageHandlers) {
        const result = await handler(ctx, this.api);
        if (result) return result;
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Handle user join event
   */
  async handleUserJoin(ctx: UserContext): Promise<BotResponse | void> {
    if (!this.isActive()) return;
    if (!this.isChannelAllowed(ctx.channel.id)) return;

    this.state.lastActivity = new Date();

    try {
      for (const handler of this.userJoinHandlers) {
        const result = await handler(ctx, this.api);
        if (result) return result;
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Handle user leave event
   */
  async handleUserLeave(ctx: UserContext): Promise<BotResponse | void> {
    if (!this.isActive()) return;
    if (!this.isChannelAllowed(ctx.channel.id)) return;

    this.state.lastActivity = new Date();

    try {
      for (const handler of this.userLeaveHandlers) {
        const result = await handler(ctx, this.api);
        if (result) return result;
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Handle reaction event
   */
  async handleReaction(ctx: ReactionContext): Promise<BotResponse | void> {
    if (!this.isActive()) return;

    this.state.lastActivity = new Date();

    try {
      for (const handler of this.reactionHandlers) {
        const result = await handler(ctx, this.api);
        if (result) return result;
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Start the bot
   */
  start(): void {
    this.state.status = "active";
  }

  /**
   * Stop the bot
   */
  stop(): void {
    this.state.status = "inactive";
    // Run all cleanup functions
    this.cleanupFunctions.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        logger.error(
          `Cleanup error for bot ${this.manifest.id}`,
          error as Error,
          {
            botId: this.manifest.id,
            botName: this.manifest.name,
          },
        );
      }
    });
    this.cleanupFunctions = [];
  }

  /**
   * Register a cleanup function to be called when bot stops
   */
  registerCleanup(fn: () => void): void {
    this.cleanupFunctions.push(fn);
  }

  /**
   * Check if bot is active
   */
  isActive(): boolean {
    return this.config.enabled && this.state.status === "active";
  }

  /**
   * Check if channel is allowed
   */
  isChannelAllowed(channelId: ChannelId): boolean {
    if (!this.config.channels || this.config.channels.length === 0) {
      return true; // No restrictions
    }
    return this.config.channels.includes(channelId);
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.state.stats.errorsCount++;
    this.state.errorMessage = error.message;
    logger.error(`Error in bot ${this.manifest.id}`, error, {
      botId: this.manifest.id,
      botName: this.manifest.name,
      errorCount: this.state.stats.errorsCount,
    });
  }
}

// ============================================================================
// BOT RUNTIME
// ============================================================================

/**
 * Bot runtime - manages all bot instances
 */
export class BotRuntime {
  private bots: Map<BotId, BotInstance> = new Map();
  private services: BotServices;

  constructor(services?: BotServices) {
    this.services = services || createMockServices();
  }

  /**
   * Register a bot
   */
  register(
    manifest: BotManifest,
    config?: Partial<BotConfig>,
    setup?: (bot: BotInstance) => void,
  ): BotInstance {
    const fullConfig: BotConfig = {
      id: manifest.id,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...config,
    };

    const bot = new BotInstance(manifest, fullConfig, this.services);

    // Run setup function if provided
    if (setup) {
      setup(bot);
    }

    // Register built-in help command
    const helpCmd = createHelpCommand(bot.commands);
    bot.commands.register(helpCmd.definition, helpCmd.handler);

    this.bots.set(manifest.id, bot);

    return bot;
  }

  /**
   * Unregister a bot
   */
  unregister(botId: BotId): boolean {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stop();
      this.bots.delete(botId);
      return true;
    }
    return false;
  }

  /**
   * Get a bot by ID
   */
  get(botId: BotId): BotInstance | undefined {
    return this.bots.get(botId);
  }

  /**
   * Get all bots
   */
  getAll(): BotInstance[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get active bots
   */
  getActive(): BotInstance[] {
    return this.getAll().filter((bot) => bot.isActive());
  }

  /**
   * Start all bots
   */
  startAll(): void {
    for (const bot of this.bots.values()) {
      if (bot.config.enabled) {
        bot.start();
      }
    }
  }

  /**
   * Stop all bots
   */
  stopAll(): void {
    for (const bot of this.bots.values()) {
      bot.stop();
    }
  }

  /**
   * Dispatch message to all active bots
   */
  async dispatchMessage(ctx: MessageContext): Promise<BotResponse[]> {
    const responses: BotResponse[] = [];

    for (const bot of this.getActive()) {
      const response = await bot.handleMessage(ctx);
      if (response) {
        responses.push(response);
      }
    }

    return responses;
  }

  /**
   * Dispatch user join to all active bots
   */
  async dispatchUserJoin(ctx: UserContext): Promise<BotResponse[]> {
    const responses: BotResponse[] = [];

    for (const bot of this.getActive()) {
      const response = await bot.handleUserJoin(ctx);
      if (response) {
        responses.push(response);
      }
    }

    return responses;
  }

  /**
   * Dispatch user leave to all active bots
   */
  async dispatchUserLeave(ctx: UserContext): Promise<BotResponse[]> {
    const responses: BotResponse[] = [];

    for (const bot of this.getActive()) {
      const response = await bot.handleUserLeave(ctx);
      if (response) {
        responses.push(response);
      }
    }

    return responses;
  }

  /**
   * Dispatch reaction to all active bots
   */
  async dispatchReaction(ctx: ReactionContext): Promise<BotResponse[]> {
    const responses: BotResponse[] = [];

    for (const bot of this.getActive()) {
      const response = await bot.handleReaction(ctx);
      if (response) {
        responses.push(response);
      }
    }

    return responses;
  }

  /**
   * Get runtime statistics
   */
  getStats(): RuntimeStats {
    const bots = this.getAll();
    return {
      totalBots: bots.length,
      activeBots: bots.filter((b) => b.isActive()).length,
      totalMessagesProcessed: bots.reduce(
        (sum, b) => sum + b.state.stats.messagesProcessed,
        0,
      ),
      totalCommandsExecuted: bots.reduce(
        (sum, b) => sum + b.state.stats.commandsExecuted,
        0,
      ),
      totalErrors: bots.reduce((sum, b) => sum + b.state.stats.errorsCount, 0),
    };
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface RuntimeStats {
  totalBots: number;
  activeBots: number;
  totalMessagesProcessed: number;
  totalCommandsExecuted: number;
  totalErrors: number;
}

// ============================================================================
// SINGLETON RUNTIME
// ============================================================================

let globalRuntime: BotRuntime | null = null;

/**
 * Get the global bot runtime instance
 */
export function getRuntime(): BotRuntime {
  if (!globalRuntime) {
    globalRuntime = new BotRuntime();
  }
  return globalRuntime;
}

/**
 * Set the global bot runtime instance
 */
export function setRuntime(runtime: BotRuntime): void {
  globalRuntime = runtime;
}

/**
 * Create a new bot runtime
 */
export function createRuntime(services?: BotServices): BotRuntime {
  return new BotRuntime(services);
}

// ============================================================================
// BOT FACTORY
// ============================================================================

/**
 * Options for creating a bot
 */
export interface CreateBotOptions {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  icon?: string;
  permissions?: BotManifest["permissions"];
  enabled?: boolean;
  channels?: ChannelId[];
}

/**
 * Create a simple bot with minimal configuration
 */
export function createBot(
  id: string,
  options: CreateBotOptions,
  setup?: (bot: BotInstance) => void,
): BotInstance {
  const manifest: BotManifest = {
    id,
    name: options.name,
    description: options.description || "",
    version: options.version || "1.0.0",
    author: options.author,
    icon: options.icon,
    permissions: options.permissions || ["read_messages", "send_messages"],
  };

  const config: Partial<BotConfig> = {
    enabled: options.enabled ?? true,
    channels: options.channels,
  };

  return getRuntime().register(manifest, config, setup);
}
