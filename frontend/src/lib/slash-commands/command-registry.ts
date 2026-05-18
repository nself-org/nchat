/**
 * Command Registry
 *
 * Central registry for all slash commands (built-in and custom)
 */

import type {
  SlashCommand,
  CommandCategory,
  CommandSuggestion,
} from "./command-types";
import { builtInCommands, builtInTriggerMap } from "./built-in-commands";

import { logger } from "@/lib/logger";

// ============================================================================
// Registry State
// ============================================================================

/** All registered commands by ID */
const commandsById = new Map<string, SlashCommand>();

/** Commands indexed by trigger (including aliases) */
const commandsByTrigger = new Map<string, SlashCommand>();

/** Commands grouped by category */
const commandsByCategory = new Map<CommandCategory, SlashCommand[]>();

/** Custom commands (non-builtin) */
let customCommands: SlashCommand[] = [];

/** Whether built-in commands have been loaded */
let builtInsLoaded = false;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the registry with built-in commands
 */
export function initializeRegistry(): void {
  if (builtInsLoaded) return;

  // Register all built-in commands
  builtInCommands.forEach((cmd) => registerCommand(cmd, false));
  builtInsLoaded = true;
}

/**
 * Reset the registry (for testing)
 */
export function resetRegistry(): void {
  commandsById.clear();
  commandsByTrigger.clear();
  commandsByCategory.clear();
  customCommands = [];
  builtInsLoaded = false;
}

// ============================================================================
// Registration
// ============================================================================

/**
 * Register a command in the registry
 */
export function registerCommand(
  command: SlashCommand,
  isCustom = true,
): boolean {
  // Validate trigger doesn't conflict with existing commands
  const existingByTrigger = commandsByTrigger.get(command.trigger);
  if (existingByTrigger && existingByTrigger.id !== command.id) {
    // Allow custom commands to override built-in commands
    if (existingByTrigger.isBuiltIn && isCustom) {
      // Disable the built-in command
      // REMOVED: console.log(`Custom command /${command.trigger} overriding built-in command`)
    } else if (!existingByTrigger.isBuiltIn) {
      console.error(
        `Command trigger /${command.trigger} already registered by ${existingByTrigger.id}`,
      );
      return false;
    }
  }

  // Register by ID
  commandsById.set(command.id, command);

  // Register by trigger
  commandsByTrigger.set(command.trigger, command);

  // Register aliases
  command.aliases?.forEach((alias) => {
    if (
      !commandsByTrigger.has(alias) ||
      commandsByTrigger.get(alias)?.isBuiltIn
    ) {
      commandsByTrigger.set(alias, command);
    }
  });

  // Register by category
  const categoryCommands = commandsByCategory.get(command.category) || [];
  const existingIndex = categoryCommands.findIndex((c) => c.id === command.id);
  if (existingIndex >= 0) {
    categoryCommands[existingIndex] = command;
  } else {
    categoryCommands.push(command);
  }
  commandsByCategory.set(command.category, categoryCommands);

  // Track custom commands
  if (isCustom && !command.isBuiltIn) {
    const customIndex = customCommands.findIndex((c) => c.id === command.id);
    if (customIndex >= 0) {
      customCommands[customIndex] = command;
    } else {
      customCommands.push(command);
    }
  }

  return true;
}

/**
 * Unregister a command from the registry
 */
export function unregisterCommand(commandId: string): boolean {
  const command = commandsById.get(commandId);
  if (!command) return false;

  // Cannot unregister built-in commands
  if (command.isBuiltIn) {
    logger.error("Cannot unregister built-in commands");
    return false;
  }

  // Remove from ID map
  commandsById.delete(commandId);

  // Remove from trigger map
  commandsByTrigger.delete(command.trigger);
  command.aliases?.forEach((alias) => {
    if (commandsByTrigger.get(alias)?.id === commandId) {
      commandsByTrigger.delete(alias);
    }
  });

  // Remove from category
  const categoryCommands = commandsByCategory.get(command.category);
  if (categoryCommands) {
    const index = categoryCommands.findIndex((c) => c.id === commandId);
    if (index >= 0) {
      categoryCommands.splice(index, 1);
    }
  }

  // Remove from custom commands
  customCommands = customCommands.filter((c) => c.id !== commandId);

  return true;
}

/**
 * Register multiple custom commands
 */
export function registerCustomCommands(commands: SlashCommand[]): void {
  commands.forEach((cmd) => registerCommand(cmd, true));
}

/**
 * Clear all custom commands
 */
export function clearCustomCommands(): void {
  // Remove each custom command
  const customIds = customCommands.map((c) => c.id);
  customIds.forEach((id) => unregisterCommand(id));
}

// ============================================================================
// Retrieval
// ============================================================================

/**
 * Get a command by ID
 */
export function getCommandById(id: string): SlashCommand | undefined {
  return commandsById.get(id);
}

/**
 * Get a command by trigger (or alias)
 */
export function getCommandByTrigger(trigger: string): SlashCommand | undefined {
  initializeRegistry();
  return commandsByTrigger.get(trigger.toLowerCase());
}

/**
 * Get all registered commands
 */
export function getAllCommands(): SlashCommand[] {
  initializeRegistry();
  return Array.from(commandsById.values()).filter((c) => c.isEnabled);
}

/**
 * Get all built-in commands
 */
export function getBuiltInCommands(): SlashCommand[] {
  initializeRegistry();
  return builtInCommands.filter((c) => c.isEnabled);
}

/**
 * Get all custom commands
 */
export function getCustomCommands(): SlashCommand[] {
  return customCommands.filter((c) => c.isEnabled);
}

/**
 * Get commands by category
 */
export function getCommandsByCategory(
  category: CommandCategory,
): SlashCommand[] {
  initializeRegistry();
  return (commandsByCategory.get(category) || []).filter((c) => c.isEnabled);
}

/**
 * Get all categories with commands
 */
export function getCategoriesWithCommands(): {
  category: CommandCategory;
  commands: SlashCommand[];
}[] {
  initializeRegistry();
  const result: { category: CommandCategory; commands: SlashCommand[] }[] = [];

  const categories: CommandCategory[] = [
    "general",
    "channel",
    "user",
    "message",
    "moderation",
    "fun",
    "utility",
    "integration",
    "custom",
  ];

  for (const category of categories) {
    const commands = getCommandsByCategory(category);
    if (commands.length > 0) {
      result.push({ category, commands });
    }
  }

  return result;
}

// ============================================================================
// Search & Suggestions
// ============================================================================

/**
 * Search commands by query
 */
export function searchCommands(
  query: string,
  options: {
    limit?: number;
    includeDisabled?: boolean;
    category?: CommandCategory;
  } = {},
): CommandSuggestion[] {
  initializeRegistry();

  const { limit = 10, includeDisabled = false, category } = options;
  const normalizedQuery = query.toLowerCase().trim();

  // Get candidate commands
  let candidates = getAllCommands();
  if (category) {
    candidates = candidates.filter((c) => c.category === category);
  }
  if (!includeDisabled) {
    candidates = candidates.filter((c) => c.isEnabled);
  }

  // Score each command
  const scored: CommandSuggestion[] = candidates.map((command) => {
    const score = calculateMatchScore(command, normalizedQuery);
    return { command, score };
  });

  // Sort by score and return top results
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get command suggestions for autocomplete
 */
export function getCommandSuggestions(
  input: string,
  options: {
    limit?: number;
    channelType?: "public" | "private" | "direct" | "group";
    userRole?: "owner" | "admin" | "moderator" | "member" | "guest";
  } = {},
): CommandSuggestion[] {
  initializeRegistry();

  const { limit = 10, channelType, userRole } = options;

  // Remove leading slash if present
  const query = input.startsWith("/") ? input.slice(1) : input;
  const normalizedQuery = query.toLowerCase().trim();

  // Get all enabled commands
  let candidates = getAllCommands();

  // Filter by channel type
  if (channelType) {
    candidates = candidates.filter((c) =>
      c.channels.allowedTypes.includes(channelType),
    );
  }

  // Filter by user role (simplified role hierarchy check)
  if (userRole) {
    const roleHierarchy: Record<string, number> = {
      guest: 0,
      member: 1,
      moderator: 2,
      admin: 3,
      owner: 4,
    };
    const userLevel = roleHierarchy[userRole] ?? 0;
    candidates = candidates.filter((c) => {
      const minLevel = roleHierarchy[c.permissions.minRole] ?? 0;
      return userLevel >= minLevel;
    });
  }

  // Score and filter
  const suggestions: CommandSuggestion[] = [];

  for (const command of candidates) {
    // Exact trigger match gets highest score
    if (command.trigger.startsWith(normalizedQuery)) {
      suggestions.push({
        command,
        score: 100 + (command.trigger === normalizedQuery ? 50 : 0),
      });
      continue;
    }

    // Check aliases
    const aliasMatch = command.aliases?.find((a) =>
      a.startsWith(normalizedQuery),
    );
    if (aliasMatch) {
      suggestions.push({
        command,
        score: 80 + (aliasMatch === normalizedQuery ? 20 : 0),
      });
      continue;
    }

    // Check name and description
    if (command.name.toLowerCase().includes(normalizedQuery)) {
      suggestions.push({
        command,
        score: 60,
      });
      continue;
    }

    if (command.description.toLowerCase().includes(normalizedQuery)) {
      suggestions.push({
        command,
        score: 40,
      });
    }
  }

  // Sort by score and limit
  return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Calculate match score for a command
 */
function calculateMatchScore(command: SlashCommand, query: string): number {
  if (!query) return 50; // Return medium score for empty query

  let score = 0;

  // Exact trigger match
  if (command.trigger === query) {
    score = 150;
  }
  // Trigger starts with query
  else if (command.trigger.startsWith(query)) {
    score = 100;
  }
  // Trigger contains query
  else if (command.trigger.includes(query)) {
    score = 70;
  }

  // Check aliases
  if (command.aliases) {
    for (const alias of command.aliases) {
      if (alias === query) {
        score = Math.max(score, 140);
      } else if (alias.startsWith(query)) {
        score = Math.max(score, 90);
      } else if (alias.includes(query)) {
        score = Math.max(score, 60);
      }
    }
  }

  // Check name
  const nameLower = command.name.toLowerCase();
  if (nameLower.includes(query)) {
    score = Math.max(score, 50);
  }

  // Check description
  const descLower = command.description.toLowerCase();
  if (descLower.includes(query)) {
    score = Math.max(score, 30);
  }

  // Boost for frequently used commands (would need usage data)
  // score += command.usageCount ? Math.min(command.usageCount / 10, 20) : 0

  return score;
}

// ============================================================================
// Permission Checking
// ============================================================================

/**
 * Check if a user can use a command
 */
export function canUserUseCommand(
  command: SlashCommand,
  userRole: "owner" | "admin" | "moderator" | "member" | "guest",
  userId: string,
): { allowed: boolean; reason?: string } {
  const roleHierarchy: Record<string, number> = {
    guest: 0,
    member: 1,
    moderator: 2,
    admin: 3,
    owner: 4,
  };

  // Check if user is explicitly denied
  if (command.permissions.deniedUsers?.includes(userId)) {
    return {
      allowed: false,
      reason: "You are not allowed to use this command",
    };
  }

  // Check if user is explicitly allowed
  if (command.permissions.allowedUsers?.includes(userId)) {
    return { allowed: true };
  }

  // Check role hierarchy
  const userLevel = roleHierarchy[userRole] ?? 0;
  const minLevel = roleHierarchy[command.permissions.minRole] ?? 0;

  if (userLevel < minLevel) {
    return {
      allowed: false,
      reason: `This command requires ${command.permissions.minRole} role or higher`,
    };
  }

  // Check guest permission
  if (userRole === "guest" && !command.permissions.allowGuests) {
    return {
      allowed: false,
      reason: "Guests cannot use this command",
    };
  }

  return { allowed: true };
}

/**
 * Check if a command can be used in a channel
 */
export function canUseCommandInChannel(
  command: SlashCommand,
  channelId: string,
  channelType: "public" | "private" | "direct" | "group",
  isThread: boolean,
): { allowed: boolean; reason?: string } {
  // Check channel type
  if (!command.channels.allowedTypes.includes(channelType)) {
    return {
      allowed: false,
      reason: `This command cannot be used in ${channelType} channels`,
    };
  }

  // Check specific channel allowlist
  if (
    command.channels.allowedChannels &&
    !command.channels.allowedChannels.includes(channelId)
  ) {
    return {
      allowed: false,
      reason: "This command is not available in this channel",
    };
  }

  // Check blocklist
  if (command.channels.blockedChannels?.includes(channelId)) {
    return {
      allowed: false,
      reason: "This command is blocked in this channel",
    };
  }

  // Check thread permission
  if (isThread && !command.channels.allowInThreads) {
    return {
      allowed: false,
      reason: "This command cannot be used in threads",
    };
  }

  return { allowed: true };
}
