/**
 * Bot Manager
 * Central management system for all bots
 *
 * Responsibilities:
 * - Bot lifecycle (register, enable, disable, destroy)
 * - Event routing to bots
 * - Command dispatching
 * - Bot state management
 * - Error handling and logging
 */

import { createLogger } from "@/lib/logger";
import type {
  Bot,
  BotConfig,
  BotManifest,
  BotApi,
  MessageContext,
  CommandContext,
  CommandHandler,
  UserContext,
  ReactionContext,
  BotEvent,
  TriggerEvent,
} from "./bot-types";
import { createBotApi, createMockServices } from "./bot-api";
import {
  BotEventEmitter,
  createMessageEvent,
  createUserEvent,
  createReactionEvent,
} from "./bot-events";
import { CommandRegistry } from "./bot-commands";

const logger = createLogger("BotManager");

// ============================================================================
// BOT INSTANCE
// ============================================================================

/**
 * Internal bot instance wrapper
 */
interface BotInstance {
  bot: Bot;
  config: BotConfig;
  manifest: BotManifest;
  api: BotApi;
  eventEmitter: BotEventEmitter;
  commandRegistry: CommandRegistry;
  enabled: boolean;
  lastError?: Error;
  stats: {
    messagesHandled: number;
    commandsExecuted: number;
    eventsProcessed: number;
    errors: number;
    startedAt: Date;
    lastActivity?: Date;
  };
  cleanup?: () => void | Promise<void>;
}

// ============================================================================
// BOT MANAGER
// ============================================================================

export class BotManager {
  private bots = new Map<string, BotInstance>();
  private globalEventEmitter = new BotEventEmitter();
  private commandPrefix = "/";

  constructor(commandPrefix = "/") {
    this.commandPrefix = commandPrefix;
  }

  // ==========================================================================
  // BOT LIFECYCLE
  // ==========================================================================

  /**
   * Register a new bot
   */
  async registerBot(
    bot: Bot,
    config: BotConfig,
    manifest: BotManifest,
  ): Promise<void> {
    if (this.bots.has(bot.id)) {
      throw new Error(`Bot ${bot.id} is already registered`);
    }

    logger.info("Registering bot", { botId: bot.id, name: bot.name });

    // Create bot instance
    const api = createBotApi(manifest, config, createMockServices());
    const eventEmitter = new BotEventEmitter();
    const commandRegistry = new CommandRegistry();

    const instance: BotInstance = {
      bot,
      config,
      manifest,
      api,
      eventEmitter,
      commandRegistry,
      enabled: config.enabled,
      stats: {
        messagesHandled: 0,
        commandsExecuted: 0,
        eventsProcessed: 0,
        errors: 0,
        startedAt: new Date(),
      },
    };

    // Register commands from manifest
    if (manifest.commands) {
      for (const cmd of manifest.commands) {
        commandRegistry.register(
          {
            name: cmd.name,
            description: cmd.description,
            aliases: cmd.aliases,
          },
          (async (ctx: CommandContext) => {
            if (bot.onCommand) {
              return await bot.onCommand(ctx, api);
            }
          }) as CommandHandler,
        );
      }
    }

    this.bots.set(bot.id, instance);

    // Initialize bot
    if (bot.init) {
      try {
        await bot.init(config);
        logger.info("Bot initialized", { botId: bot.id });
      } catch (error) {
        logger.error("Bot initialization failed", error as Error, {
          botId: bot.id,
        });
        instance.lastError = error as Error;
        instance.stats.errors++;
      }
    }
  }

  /**
   * Unregister a bot
   */
  async unregisterBot(botId: string): Promise<void> {
    const instance = this.bots.get(botId);
    if (!instance) {
      logger.warn("Cannot unregister bot: not found", { botId });
      return;
    }

    logger.info("Unregistering bot", { botId });

    // Disable first
    await this.disableBot(botId);

    // Destroy bot
    if (instance.bot.destroy) {
      try {
        await instance.bot.destroy();
      } catch (error) {
        logger.error("Bot destruction failed", error as Error, { botId });
      }
    }

    // Run cleanup
    if (instance.cleanup) {
      try {
        await instance.cleanup();
      } catch (error) {
        logger.error("Bot cleanup failed", error as Error, { botId });
      }
    }

    this.bots.delete(botId);
  }

  /**
   * Enable a bot
   */
  async enableBot(botId: string): Promise<void> {
    const instance = this.bots.get(botId);
    if (!instance) {
      throw new Error(`Bot ${botId} not found`);
    }

    if (instance.enabled) {
      logger.warn("Bot already enabled", { botId });
      return;
    }

    logger.info("Enabling bot", { botId });
    instance.enabled = true;
    instance.config.enabled = true;
    instance.stats.lastActivity = new Date();

    // Update config in storage
    await this.saveConfig(instance);
  }

  /**
   * Disable a bot
   */
  async disableBot(botId: string): Promise<void> {
    const instance = this.bots.get(botId);
    if (!instance) {
      throw new Error(`Bot ${botId} not found`);
    }

    if (!instance.enabled) {
      logger.warn("Bot already disabled", { botId });
      return;
    }

    logger.info("Disabling bot", { botId });
    instance.enabled = false;
    instance.config.enabled = false;

    // Update config in storage
    await this.saveConfig(instance);
  }

  /**
   * Update bot config
   */
  async updateBotConfig(
    botId: string,
    settings: Record<string, unknown>,
  ): Promise<void> {
    const instance = this.bots.get(botId);
    if (!instance) {
      throw new Error(`Bot ${botId} not found`);
    }

    logger.info("Updating bot config", { botId, settings });
    instance.config.settings = { ...instance.config.settings, ...settings };
    instance.config.updatedAt = new Date();

    await this.saveConfig(instance);
  }

  // ==========================================================================
  // EVENT ROUTING
  // ==========================================================================

  /**
   * Route a message event to all enabled bots
   */
  async handleMessage(context: MessageContext): Promise<void> {
    // Check if message contains a command
    if (context.isCommand && context.command) {
      await this.handleCommand(context as CommandContext);
      return;
    }

    // Route to all enabled bots with onMessage handler
    for (const instance of this.bots.values()) {
      if (!instance.enabled || !instance.bot.onMessage) continue;

      try {
        await this.executeHandler(instance, "message", async () =>
          instance.bot.onMessage!(context, instance.api),
        );
      } catch (error) {
        this.handleBotError(instance, error as Error, "handleMessage");
      }
    }
  }

  /**
   * Route a command to the appropriate bot
   */
  async handleCommand(context: CommandContext): Promise<void> {
    const commandName = context.command.name;

    // Try each bot's command registry
    for (const instance of this.bots.values()) {
      if (!instance.enabled) continue;

      const registered = instance.commandRegistry.get(commandName);
      if (registered) {
        try {
          await this.executeHandler(instance, "command", async () =>
            registered.handler(context, instance.api),
          );
          instance.stats.commandsExecuted++;
          return;
        } catch (error) {
          this.handleBotError(instance, error as Error, "handleCommand");
          return;
        }
      }
    }

    logger.warn("Command not found", { command: commandName });
  }

  /**
   * Route a user join event
   */
  async handleUserJoin(context: UserContext): Promise<void> {
    for (const instance of this.bots.values()) {
      if (!instance.enabled || !instance.bot.onUserJoin) continue;

      try {
        await this.executeHandler(instance, "userJoin", async () =>
          instance.bot.onUserJoin!(context, instance.api),
        );
      } catch (error) {
        this.handleBotError(instance, error as Error, "handleUserJoin");
      }
    }
  }

  /**
   * Route a user leave event
   */
  async handleUserLeave(context: UserContext): Promise<void> {
    for (const instance of this.bots.values()) {
      if (!instance.enabled || !instance.bot.onUserLeave) continue;

      try {
        await this.executeHandler(instance, "userLeave", async () =>
          instance.bot.onUserLeave!(context, instance.api),
        );
      } catch (error) {
        this.handleBotError(instance, error as Error, "handleUserLeave");
      }
    }
  }

  /**
   * Route a reaction event
   */
  async handleReaction(context: ReactionContext): Promise<void> {
    for (const instance of this.bots.values()) {
      if (!instance.enabled || !instance.bot.onReaction) continue;

      try {
        await this.executeHandler(instance, "reaction", async () =>
          instance.bot.onReaction!(context, instance.api),
        );
      } catch (error) {
        this.handleBotError(instance, error as Error, "handleReaction");
      }
    }
  }

  /**
   * Route a generic event
   */
  async handleEvent(event: BotEvent, eventType: TriggerEvent): Promise<void> {
    for (const instance of this.bots.values()) {
      if (!instance.enabled) continue;

      // Check if bot has triggers for this event type
      const hasTrigger = instance.manifest.triggers?.some(
        (t) => t.event === eventType,
      );
      if (!hasTrigger) continue;

      try {
        // Emit event to bot's event emitter
        instance.eventEmitter.emit(eventType, event, instance.api);
        instance.stats.eventsProcessed++;
        instance.stats.lastActivity = new Date();
      } catch (error) {
        this.handleBotError(instance, error as Error, "handleEvent");
      }
    }

    // Also emit to global event emitter
    // Global emitter doesn't have a specific bot API, skip or use a no-op
    // this.globalEventEmitter.emit(eventType, event)
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Execute a bot handler with error handling and stats tracking
   */
  private async executeHandler(
    instance: BotInstance,
    handlerType: string,
    handler: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await handler();

      if (handlerType === "message") {
        instance.stats.messagesHandled++;
      }

      instance.stats.lastActivity = new Date();
    } catch (error) {
      instance.stats.errors++;
      instance.lastError = error as Error;
      throw error;
    }
  }

  /**
   * Handle bot errors
   */
  private handleBotError(
    instance: BotInstance,
    error: Error,
    context: string,
  ): void {
    logger.error("Bot error", error, {
      botId: instance.bot.id,
      context,
    });

    instance.stats.errors++;
    instance.lastError = error;

    // Auto-disable bot if too many errors
    const errorRate =
      instance.stats.errors / (instance.stats.eventsProcessed + 1);
    if (errorRate > 0.5 && instance.stats.eventsProcessed > 10) {
      logger.warn("Auto-disabling bot due to high error rate", {
        botId: instance.bot.id,
        errorRate,
      });
      this.disableBot(instance.bot.id);
    }
  }

  /**
   * Save bot config to storage
   */
  private async saveConfig(instance: BotInstance): Promise<void> {
    try {
      await instance.api.setStorage("config", instance.config);
    } catch (error) {
      logger.error("Failed to save bot config", error as Error, {
        botId: instance.bot.id,
      });
    }
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  /**
   * Get a bot instance
   */
  getBot(botId: string): BotInstance | undefined {
    return this.bots.get(botId);
  }

  /**
   * Get all registered bots
   */
  getAllBots(): BotInstance[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get all enabled bots
   */
  getEnabledBots(): BotInstance[] {
    return Array.from(this.bots.values()).filter((b) => b.enabled);
  }

  /**
   * Get bot by name
   */
  getBotByName(name: string): BotInstance | undefined {
    return Array.from(this.bots.values()).find((b) => b.bot.name === name);
  }

  /**
   * Check if bot exists
   */
  hasBot(botId: string): boolean {
    return this.bots.has(botId);
  }

  /**
   * Get bot stats
   */
  getBotStats(botId: string): BotInstance["stats"] | undefined {
    return this.bots.get(botId)?.stats;
  }

  /**
   * Get all bot stats
   */
  getAllStats(): Record<string, BotInstance["stats"]> {
    const stats: Record<string, BotInstance["stats"]> = {};
    for (const [botId, instance] of this.bots) {
      stats[botId] = instance.stats;
    }
    return stats;
  }

  /**
   * Get global event emitter
   */
  getGlobalEventEmitter(): BotEventEmitter {
    return this.globalEventEmitter;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Register cleanup handler for a bot
   */
  registerCleanup(botId: string, cleanup: () => void | Promise<void>): void {
    const instance = this.bots.get(botId);
    if (instance) {
      instance.cleanup = cleanup;
    }
  }

  /**
   * Parse command from message
   */
  parseCommand(message: string): { name: string; args: string } | null {
    if (!message.startsWith(this.commandPrefix)) {
      return null;
    }

    const content = message.slice(this.commandPrefix.length).trim();
    const spaceIndex = content.indexOf(" ");

    if (spaceIndex === -1) {
      return { name: content, args: "" };
    }

    return {
      name: content.slice(0, spaceIndex),
      args: content.slice(spaceIndex + 1).trim(),
    };
  }

  /**
   * List all available commands
   */
  listAllCommands(): Array<{
    botId: string;
    botName: string;
    commands: string[];
  }> {
    const result: Array<{
      botId: string;
      botName: string;
      commands: string[];
    }> = [];

    for (const instance of this.bots.values()) {
      if (!instance.enabled) continue;

      const commands = instance.commandRegistry
        .getAll()
        .map((c) => c.definition.name);
      if (commands.length > 0) {
        result.push({
          botId: instance.bot.id,
          botName: instance.bot.name,
          commands,
        });
      }
    }

    return result;
  }

  /**
   * Shutdown all bots
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down bot manager");

    for (const botId of Array.from(this.bots.keys())) {
      await this.unregisterBot(botId);
    }

    this.bots.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: BotManager | null = null;

/**
 * Get the global bot manager instance
 */
export function getBotManager(): BotManager {
  if (!instance) {
    instance = new BotManager();
  }
  return instance;
}

/**
 * Set a custom bot manager instance
 */
export function setBotManager(manager: BotManager): void {
  instance = manager;
}

/**
 * Reset the bot manager (useful for tests)
 */
export function resetBotManager(): void {
  if (instance) {
    instance.shutdown();
  }
  instance = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default BotManager;
