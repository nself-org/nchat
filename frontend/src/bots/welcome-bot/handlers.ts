/**
 * Welcome Bot Handlers
 * User join event handling
 */

import type { UserContext, BotApi, BotResponse } from "@/lib/bots";
import { response } from "@/lib/bots";
import {
  getChannelTemplate,
  getDefaultTemplate,
  createWelcomeVariables,
  buildSimpleWelcome,
  buildWelcomeEmbed,
  recordWelcome,
} from "./templates";

// ============================================================================
// USER JOIN HANDLER
// ============================================================================

/**
 * Handle user join events
 */
export async function handleUserJoin(
  ctx: UserContext,
  api: BotApi,
): Promise<BotResponse | void> {
  const config = api.getBotConfig();

  // Get channel-specific template or use default
  let template = getChannelTemplate(ctx.channel.id);

  if (!template) {
    // Use settings from bot config as defaults
    template = {
      message:
        (config.settings?.default_message as string) ||
        getDefaultTemplate().message,
      enabled: true,
      sendDm: (config.settings?.send_dm as boolean) || false,
      dmMessage: config.settings?.dm_message as string,
      mentionUser: (config.settings?.mention_user as boolean) !== false,
      showMemberCount:
        (config.settings?.show_member_count as boolean) !== false,
      delaySeconds: (config.settings?.delay_seconds as number) || 2,
    };
  }

  // Check if welcome is enabled
  if (!template.enabled) {
    return;
  }

  // Create variables
  const variables = createWelcomeVariables(
    ctx.user,
    ctx.channel.name,
    ctx.memberCount,
  );

  // Delay before sending (optional)
  if (template.delaySeconds > 0) {
    await sleep(template.delaySeconds * 1000);
  }

  // Record the welcome for stats
  recordWelcome(ctx.channel.id);

  // Build the welcome message
  const welcomeEmbed = buildWelcomeEmbed(template.message, variables, {
    mentionUser: template.mentionUser,
    showMemberCount: template.showMemberCount,
    avatarUrl: ctx.user.avatarUrl,
    showAvatar: !!ctx.user.avatarUrl,
  });

  // Build the response
  const res = response();

  if (template.mentionUser) {
    res.text(`<@${ctx.user.userId}>`);
  }

  res.embed(welcomeEmbed);

  // Handle DM if enabled (in a real implementation)
  if (template.sendDm && template.dmMessage) {
    // In production, use api.sendDirectMessage or similar
  }

  return res.build();
}

/**
 * Handle user leave events (optional logging)
 */
export async function handleUserLeave(
  ctx: UserContext,
  api: BotApi,
): Promise<BotResponse | void> {
  // Optional: Log departures or send farewell messages

  // By default, don't send any message on leave
  // Could be enabled via settings
  return;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a user is new to the server (joined today)
 */
export function isNewMember(joinDate: Date): boolean {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return joinDate > oneDayAgo;
}

/**
 * Get a personalized greeting based on time of day
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Good morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  } else if (hour >= 17 && hour < 21) {
    return "Good evening";
  } else {
    return "Hello";
  }
}

/**
 * Format member count with ordinal suffix
 */
export function formatMemberNumber(count: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = count % 100;

  return count + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
