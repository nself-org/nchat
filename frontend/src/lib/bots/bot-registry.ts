/**
 * Bot Registry
 * Central registry for all available bots
 */

import type { Bot, BotManifest, BotConfig } from "./bot-types";
import { getBotManager } from "./bot-manager";
import { createLogger } from "@/lib/logger";

/**
 * Shape of a dynamically imported bot module.
 * Bot factories may return BotInstance (from bot-runtime) which is structurally
 * different from Bot, so we use a loose return type here.
 */
interface BotModule {
  default: (...args: unknown[]) => unknown;
  manifest: BotManifest;
}

const logger = createLogger("BotRegistry");

// ============================================================================
// BOT FACTORY TYPE
// ============================================================================

export type BotFactory = () => Bot;

// ============================================================================
// BOT REGISTRATION
// ============================================================================

interface RegisteredBot {
  factory: BotFactory;
  manifest: BotManifest;
  category: string;
  featured: boolean;
  tags: string[];
}

const registry = new Map<string, RegisteredBot>();

/**
 * Register a bot in the registry
 */
export function registerBotFactory(
  botId: string,
  factory: BotFactory,
  manifest: BotManifest,
  options: {
    category?: string;
    featured?: boolean;
    tags?: string[];
  } = {},
): void {
  if (registry.has(botId)) {
    logger.warn("Bot already registered, overwriting", { botId });
  }

  registry.set(botId, {
    factory,
    manifest,
    category: options.category || "General",
    featured: options.featured || false,
    tags: options.tags || [],
  });

  logger.info("Bot registered", {
    botId,
    name: manifest.name,
    version: manifest.version,
  });
}

/**
 * Unregister a bot from the registry
 */
export function unregisterBotFactory(botId: string): boolean {
  const deleted = registry.delete(botId);
  if (deleted) {
    logger.info("Bot unregistered", { botId });
  }
  return deleted;
}

/**
 * Get a bot factory
 */
export function getBotFactory(botId: string): BotFactory | undefined {
  return registry.get(botId)?.factory;
}

/**
 * Get bot manifest
 */
export function getBotManifest(botId: string): BotManifest | undefined {
  return registry.get(botId)?.manifest;
}

/**
 * Get all registered bot IDs
 */
export function getRegisteredBotIds(): string[] {
  return Array.from(registry.keys());
}

/**
 * Get all registered bots
 */
export function getRegisteredBots(): Array<{
  botId: string;
  manifest: BotManifest;
  category: string;
  featured: boolean;
  tags: string[];
}> {
  return Array.from(registry.entries()).map(([botId, bot]) => ({
    botId,
    manifest: bot.manifest,
    category: bot.category,
    featured: bot.featured,
    tags: bot.tags,
  }));
}

/**
 * Get featured bots
 */
export function getFeaturedBots(): Array<{
  botId: string;
  manifest: BotManifest;
  category: string;
}> {
  return Array.from(registry.entries())
    .filter(([, bot]) => bot.featured)
    .map(([botId, bot]) => ({
      botId,
      manifest: bot.manifest,
      category: bot.category,
    }));
}

/**
 * Get bots by category
 */
export function getBotsByCategory(category: string): Array<{
  botId: string;
  manifest: BotManifest;
}> {
  return Array.from(registry.entries())
    .filter(([, bot]) => bot.category === category)
    .map(([botId, bot]) => ({
      botId,
      manifest: bot.manifest,
    }));
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
  const categories = new Set<string>();
  for (const bot of registry.values()) {
    categories.add(bot.category);
  }
  return Array.from(categories).sort();
}

/**
 * Search bots
 */
export function searchBots(query: string): Array<{
  botId: string;
  manifest: BotManifest;
  category: string;
  score: number;
}> {
  const queryLower = query.toLowerCase();
  const results: Array<{
    botId: string;
    manifest: BotManifest;
    category: string;
    score: number;
  }> = [];

  for (const [botId, bot] of registry.entries()) {
    let score = 0;

    // Exact match in name
    if (bot.manifest.name.toLowerCase() === queryLower) {
      score += 10;
    } else if (bot.manifest.name.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // Match in description
    if (bot.manifest.description.toLowerCase().includes(queryLower)) {
      score += 3;
    }

    // Match in tags
    for (const tag of bot.tags) {
      if (tag.toLowerCase().includes(queryLower)) {
        score += 2;
      }
    }

    // Match in category
    if (bot.category.toLowerCase().includes(queryLower)) {
      score += 1;
    }

    if (score > 0) {
      results.push({
        botId,
        manifest: bot.manifest,
        category: bot.category,
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ============================================================================
// BOT INSTANTIATION
// ============================================================================

/**
 * Create and register a bot instance
 */
export async function instantiateBot(
  botId: string,
  config: Partial<BotConfig> = {},
): Promise<Bot> {
  const registered = registry.get(botId);
  if (!registered) {
    throw new Error(`Bot ${botId} not found in registry`);
  }

  logger.info("Instantiating bot", { botId });

  // Create bot instance
  const bot = registered.factory();

  // Create config
  const botConfig: BotConfig = {
    id: botId,
    enabled: config.enabled !== undefined ? config.enabled : true,
    channels: config.channels || [],
    settings: config.settings || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Register with bot manager
  const manager = getBotManager();
  await manager.registerBot(bot, botConfig, registered.manifest);

  logger.info("Bot instantiated and registered", { botId });

  return bot;
}

/**
 * Bulk instantiate bots
 */
export async function instantiateBots(
  configs: Array<{ botId: string; config?: Partial<BotConfig> }>,
): Promise<Bot[]> {
  const bots: Bot[] = [];

  for (const { botId, config } of configs) {
    try {
      const bot = await instantiateBot(botId, config);
      bots.push(bot);
    } catch (error) {
      logger.error("Failed to instantiate bot", error as Error, { botId });
    }
  }

  return bots;
}

// ============================================================================
// DEFAULT BOTS
// ============================================================================

/**
 * Register all default bots
 */
export async function registerDefaultBots(): Promise<void> {
  logger.info("Registering default bots");

  try {
    // Dynamically import bot factories with typed modules
    const reminderMod = (await import("@/bots/reminder-bot")) as BotModule;
    const welcomeMod = (await import("@/bots/welcome-bot")) as BotModule;
    const pollMod = (await import("@/bots/poll-bot")) as BotModule;
    const faqMod = (await import("@/bots/faq-bot")) as BotModule;
    const schedulerMod = (await import("@/bots/scheduler-bot")) as BotModule;

    // Register bots
    registerBotFactory(
      "reminder-bot",
      reminderMod.default as BotFactory,
      reminderMod.manifest,
      {
        category: "Productivity",
        featured: true,
        tags: ["reminders", "productivity", "time-management"],
      },
    );

    registerBotFactory(
      "welcome-bot",
      welcomeMod.default as BotFactory,
      welcomeMod.manifest,
      {
        category: "Engagement",
        featured: true,
        tags: ["welcome", "onboarding", "greetings"],
      },
    );

    registerBotFactory(
      "poll-bot",
      pollMod.default as BotFactory,
      pollMod.manifest,
      {
        category: "Engagement",
        featured: true,
        tags: ["polls", "voting", "surveys"],
      },
    );

    registerBotFactory(
      "faq-bot",
      faqMod.default as BotFactory,
      faqMod.manifest,
      {
        category: "Support",
        featured: true,
        tags: ["faq", "help", "support", "knowledge-base"],
      },
    );

    registerBotFactory(
      "scheduler-bot",
      schedulerMod.default as BotFactory,
      schedulerMod.manifest,
      {
        category: "Productivity",
        featured: true,
        tags: ["scheduling", "automation", "recurring-tasks"],
      },
    );

    logger.info("Default bots registered", { count: registry.size });
  } catch (error) {
    logger.error("Failed to register default bots", error as Error);
  }
}

/**
 * Clear the registry
 */
export function clearRegistry(): void {
  registry.clear();
  logger.info("Registry cleared");
}
