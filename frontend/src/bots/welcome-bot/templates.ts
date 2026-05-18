/**
 * Welcome Bot Templates
 * Welcome message templates and formatting
 */

import type { ChannelId, UserId, UserEventData } from "@/lib/bots";
import { embed, mentionUser } from "@/lib/bots";

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface WelcomeTemplate {
  message: string;
  enabled: boolean;
  dmMessage?: string;
  sendDm: boolean;
  mentionUser: boolean;
  showMemberCount: boolean;
  delaySeconds: number;
}

export interface WelcomeVariables {
  user: string;
  userId: UserId;
  channel: string;
  channelId: ChannelId;
  memberCount?: number;
  serverName?: string;
  date: string;
  time: string;
}

// ============================================================================
// TEMPLATE STORAGE
// ============================================================================

// In-memory storage for channel templates (use api.setStorage in production)
const channelTemplates = new Map<ChannelId, WelcomeTemplate>();

// Statistics
const stats = {
  totalWelcomes: 0,
  byChannel: new Map<ChannelId, number>(),
};

/**
 * Get the template for a channel
 */
export function getChannelTemplate(
  channelId: ChannelId,
): WelcomeTemplate | undefined {
  return channelTemplates.get(channelId);
}

/**
 * Set a custom template for a channel
 */
export function setChannelTemplate(
  channelId: ChannelId,
  template: Partial<WelcomeTemplate>,
): WelcomeTemplate {
  const existing = channelTemplates.get(channelId);
  const updated: WelcomeTemplate = {
    message:
      template.message ?? existing?.message ?? getDefaultTemplate().message,
    enabled: template.enabled ?? existing?.enabled ?? true,
    dmMessage: template.dmMessage ?? existing?.dmMessage,
    sendDm: template.sendDm ?? existing?.sendDm ?? false,
    mentionUser: template.mentionUser ?? existing?.mentionUser ?? true,
    showMemberCount:
      template.showMemberCount ?? existing?.showMemberCount ?? true,
    delaySeconds: template.delaySeconds ?? existing?.delaySeconds ?? 2,
  };

  channelTemplates.set(channelId, updated);
  return updated;
}

/**
 * Delete a channel template
 */
export function deleteChannelTemplate(channelId: ChannelId): boolean {
  return channelTemplates.delete(channelId);
}

/**
 * Get the default template
 */
export function getDefaultTemplate(): WelcomeTemplate {
  return {
    message: "Welcome to {channel}, {user}! We're glad to have you here.",
    enabled: true,
    sendDm: false,
    mentionUser: true,
    showMemberCount: true,
    delaySeconds: 2,
  };
}

// ============================================================================
// TEMPLATE PROCESSING
// ============================================================================

/**
 * Process template variables
 */
export function processTemplate(
  template: string,
  variables: WelcomeVariables,
): string {
  let result = template;

  // Replace all variables
  result = result.replace(/\{user\}/g, variables.user);
  result = result.replace(/\{channel\}/g, variables.channel);
  result = result.replace(/\{server\}/g, variables.serverName || "the server");
  result = result.replace(/\{date\}/g, variables.date);
  result = result.replace(/\{time\}/g, variables.time);

  if (variables.memberCount !== undefined) {
    result = result.replace(/\{count\}/g, String(variables.memberCount));
    result = result.replace(/\{memberCount\}/g, String(variables.memberCount));
  }

  return result;
}

/**
 * Create welcome variables from user data
 */
export function createWelcomeVariables(
  user: UserEventData,
  channelName: string,
  memberCount?: number,
  serverName?: string,
): WelcomeVariables {
  const now = new Date();

  return {
    user: user.displayName,
    userId: user.userId,
    channel: channelName,
    channelId: user.channelId,
    memberCount,
    serverName,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
  };
}

// ============================================================================
// WELCOME MESSAGE BUILDERS
// ============================================================================

/**
 * Build a simple welcome message
 */
export function buildSimpleWelcome(
  message: string,
  variables: WelcomeVariables,
  options: { mentionUser?: boolean; showMemberCount?: boolean } = {},
): { text: string } {
  let text = processTemplate(message, variables);

  // Add mention at the beginning if enabled
  if (options.mentionUser) {
    text = `${mentionUser(variables.userId)} ${text}`;
  }

  // Add member count if enabled
  if (options.showMemberCount && variables.memberCount !== undefined) {
    text += `\n\nYou are member #${variables.memberCount}!`;
  }

  return { text };
}

/**
 * Build a rich welcome embed
 */
export function buildWelcomeEmbed(
  message: string,
  variables: WelcomeVariables,
  options: {
    mentionUser?: boolean;
    showMemberCount?: boolean;
    color?: string;
    showAvatar?: boolean;
    avatarUrl?: string;
  } = {},
): ReturnType<typeof embed> {
  const processedMessage = processTemplate(message, variables);

  const e = embed()
    .title(`:wave: Welcome, ${variables.user}!`)
    .description(processedMessage)
    .color(options.color || "#10B981")
    .timestamp();

  if (options.showMemberCount && variables.memberCount !== undefined) {
    e.field("Member Number", `#${variables.memberCount}`, true);
  }

  e.field("Joined", variables.date, true);

  if (options.showAvatar && options.avatarUrl) {
    e.thumbnail(options.avatarUrl);
  }

  e.footer(`Welcome to ${variables.serverName || variables.channel}!`);

  return e;
}

// ============================================================================
// PRESET TEMPLATES
// ============================================================================

export const PRESET_TEMPLATES = {
  simple: {
    name: "Simple",
    message: "Welcome to {channel}, {user}!",
  },
  friendly: {
    name: "Friendly",
    message: "Hey {user}! Welcome to {channel}. We're so happy you're here!",
  },
  formal: {
    name: "Formal",
    message:
      "Welcome to {channel}, {user}. We hope you find our community valuable.",
  },
  fun: {
    name: "Fun",
    message: ":tada: {user} just joined the party! Welcome to {channel}!",
  },
  informative: {
    name: "Informative",
    message:
      "Welcome to {channel}, {user}! Be sure to check out our rules and introduce yourself.",
  },
  gaming: {
    name: "Gaming",
    message:
      ":video_game: Player {user} has entered the game! Welcome to {channel}!",
  },
  professional: {
    name: "Professional",
    message:
      "Welcome aboard, {user}. We're pleased to have you join {channel}.",
  },
  community: {
    name: "Community",
    message:
      ":heart: Welcome to our community, {user}! You're member #{memberCount} in {channel}!",
  },
};

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Record a welcome event
 */
export function recordWelcome(channelId: ChannelId): void {
  stats.totalWelcomes++;
  const channelCount = stats.byChannel.get(channelId) || 0;
  stats.byChannel.set(channelId, channelCount + 1);
}

/**
 * Get welcome statistics
 */
export function getWelcomeStats(): {
  total: number;
  byChannel: { channelId: ChannelId; count: number }[];
} {
  return {
    total: stats.totalWelcomes,
    byChannel: Array.from(stats.byChannel.entries())
      .map(([channelId, count]) => ({ channelId, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Format statistics for display
 */
export function formatStats(): string {
  const s = getWelcomeStats();

  let result = `**Welcome Statistics**\n\n`;
  result += `Total welcomes: **${s.total}**\n\n`;

  if (s.byChannel.length > 0) {
    result += `**By Channel:**\n`;
    for (const { channelId, count } of s.byChannel.slice(0, 10)) {
      result += `  <#${channelId}>: ${count}\n`;
    }
  }

  return result;
}

// ============================================================================
// EXPORT/IMPORT
// ============================================================================

/**
 * Export all templates
 */
export function exportTemplates(): Record<ChannelId, WelcomeTemplate> {
  const result: Record<ChannelId, WelcomeTemplate> = {};
  for (const [channelId, template] of channelTemplates) {
    result[channelId] = template;
  }
  return result;
}

/**
 * Import templates
 */
export function importTemplates(
  templates: Record<ChannelId, WelcomeTemplate>,
): void {
  for (const [channelId, template] of Object.entries(templates)) {
    channelTemplates.set(channelId, template);
  }
}
