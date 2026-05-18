/**
 * Composite Profile Definitions
 *
 * A composite profile binds one visual skin to one behavior preset, optionally
 * with per-field overrides. This allows users to pick a "WhatsApp" profile that
 * pairs the WhatsApp skin with WhatsApp behavior, or create a hybrid like
 * "Discord look + Slack behavior".
 *
 * @module lib/skins/composite-profiles
 * @version 1.0.0
 */

import type { CompositeProfile } from "./types";

// ============================================================================
// SAME-PLATFORM PROFILES (skin === behavior)
// ============================================================================

export const nchatProfile: CompositeProfile = {
  id: "nchat",
  name: "nChat",
  description: "nChat default experience with balanced defaults",
  skinId: "nchat",
  behaviorId: "nchat",
};

export const whatsappProfile: CompositeProfile = {
  id: "whatsapp",
  name: "WhatsApp",
  description:
    "Full WhatsApp experience with E2EE, bubbles, and privacy controls",
  skinId: "whatsapp",
  behaviorId: "whatsapp",
};

export const telegramProfile: CompositeProfile = {
  id: "telegram",
  name: "Telegram",
  description: "Full Telegram experience with bots, channels, and supergroups",
  skinId: "telegram",
  behaviorId: "telegram",
};

export const discordProfile: CompositeProfile = {
  id: "discord",
  name: "Discord",
  description:
    "Full Discord experience with servers, roles, and voice channels",
  skinId: "discord",
  behaviorId: "discord",
};

export const slackProfile: CompositeProfile = {
  id: "slack",
  name: "Slack",
  description:
    "Full Slack experience with workspaces, threads, and integrations",
  skinId: "slack",
  behaviorId: "slack",
};

export const signalProfile: CompositeProfile = {
  id: "signal",
  name: "Signal",
  description: "Full Signal experience with privacy-first encrypted messaging",
  skinId: "signal",
  behaviorId: "signal",
};

// ============================================================================
// HYBRID PROFILES (different skin + behavior combinations)
// ============================================================================

/**
 * Discord look with Slack behavior: server hierarchy visual style but
 * workspace-style threads, huddles, and notification defaults.
 */
export const discordLookSlackBehaviorProfile: CompositeProfile = {
  id: "discord-look-slack-behavior",
  name: "Discord Look + Slack Behavior",
  description: "Discord visual style with Slack interaction patterns",
  skinId: "discord",
  behaviorId: "slack",
};

/**
 * Slack look with Discord behavior: workspace visual style but server-style
 * categories, roles, and voice channels.
 */
export const slackLookDiscordBehaviorProfile: CompositeProfile = {
  id: "slack-look-discord-behavior",
  name: "Slack Look + Discord Behavior",
  description: "Slack visual style with Discord interaction patterns",
  skinId: "slack",
  behaviorId: "discord",
};

/**
 * WhatsApp look with Telegram behavior: chat-bubble visual style but
 * supergroup scale, bots, and channels.
 */
export const whatsappLookTelegramBehaviorProfile: CompositeProfile = {
  id: "whatsapp-look-telegram-behavior",
  name: "WhatsApp Look + Telegram Behavior",
  description: "WhatsApp visual style with Telegram interaction patterns",
  skinId: "whatsapp",
  behaviorId: "telegram",
};

/**
 * Signal look with WhatsApp behavior: minimal visual style with WhatsApp-style
 * groups, broadcasts, and stories.
 */
export const signalLookWhatsappBehaviorProfile: CompositeProfile = {
  id: "signal-look-whatsapp-behavior",
  name: "Signal Look + WhatsApp Behavior",
  description: "Signal visual style with WhatsApp interaction patterns",
  skinId: "signal",
  behaviorId: "whatsapp",
};

/**
 * Privacy-focused team: nChat look with Signal privacy behavior but enhanced
 * with threads.
 */
export const privacyTeamProfile: CompositeProfile = {
  id: "privacy-team",
  name: "Privacy Team",
  description:
    "nChat look with Signal-level privacy defaults and thread support",
  skinId: "nchat",
  behaviorId: "signal",
  overrides: {
    behavior: {
      messaging: {
        threadingModel: "side-panel" as const,
        pinning: true,
        bookmarking: true,
      },
      channels: {
        types: ["private", "dm", "group-dm"],
      },
    },
  },
};

// ============================================================================
// PROFILE REGISTRY
// ============================================================================

/**
 * All built-in composite profiles keyed by their id.
 */
export const compositeProfiles: Record<string, CompositeProfile> = {
  nchat: nchatProfile,
  whatsapp: whatsappProfile,
  telegram: telegramProfile,
  discord: discordProfile,
  slack: slackProfile,
  signal: signalProfile,
  "discord-look-slack-behavior": discordLookSlackBehaviorProfile,
  "slack-look-discord-behavior": slackLookDiscordBehaviorProfile,
  "whatsapp-look-telegram-behavior": whatsappLookTelegramBehaviorProfile,
  "signal-look-whatsapp-behavior": signalLookWhatsappBehaviorProfile,
  "privacy-team": privacyTeamProfile,
};

/**
 * List of all built-in profile IDs.
 */
export const compositeProfileIds = Object.keys(compositeProfiles);

/**
 * Retrieve a composite profile by ID, or undefined if not found.
 */
export function getCompositeProfile(id: string): CompositeProfile | undefined {
  return compositeProfiles[id];
}
