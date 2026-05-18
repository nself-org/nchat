/**
 * Slash Command Definitions
 *
 * This file defines all built-in slash commands available in the nself-chat application.
 * Commands provide quick actions and utilities accessible via the message input.
 *
 * @example
 * ```typescript
 * import { COMMANDS, getCommandByName } from '@/lib/commands/commands'
 *
 * const giphyCommand = getCommandByName('giphy')
 * // console.log(giphyCommand?.description)
 * ```
 */

import { FEATURES } from "@/lib/features/feature-flags";
import type { FeatureFlag } from "@/lib/features/types";

// ============================================================================
// Types
// ============================================================================

/**
 * Category of a slash command
 */
export type CommandCategory =
  | "media"
  | "status"
  | "channel"
  | "moderation"
  | "utility"
  | "fun"
  | "navigation";

/**
 * Type of argument a command accepts
 */
export type CommandArgType =
  | "text"
  | "user"
  | "channel"
  | "duration"
  | "emoji"
  | "options"
  | "none";

/**
 * Command argument definition
 */
export interface CommandArg {
  /** Argument name */
  name: string;
  /** Argument type */
  type: CommandArgType;
  /** Whether the argument is required */
  required: boolean;
  /** Description of the argument */
  description: string;
  /** Placeholder text for the argument input */
  placeholder?: string;
  /** Default value if not provided */
  defaultValue?: string;
  /** Valid options (for 'options' type) */
  options?: string[];
}

/**
 * Slash command definition
 */
export interface SlashCommand {
  /** Command name (without the leading slash) */
  name: string;
  /** Short description shown in the command menu */
  description: string;
  /** Detailed description shown in help */
  longDescription?: string;
  /** Usage example */
  usage: string;
  /** Command category for organization */
  category: CommandCategory;
  /** Arguments the command accepts */
  args: CommandArg[];
  /** Keyboard shortcut (if any) */
  shortcut?: string;
  /** Feature flag that must be enabled for this command */
  requiredFeature?: FeatureFlag;
  /** Aliases for the command */
  aliases?: string[];
  /** Whether command requires channel context */
  requiresChannel?: boolean;
  /** Whether command requires admin/moderator permissions */
  requiresPermission?: "admin" | "moderator" | "owner";
  /** Whether the command shows a preview before executing */
  showPreview?: boolean;
  /** Icon name for the command */
  icon?: string;
  /** Whether the command is hidden from the menu */
  hidden?: boolean;
}

// ============================================================================
// Built-in Commands
// ============================================================================

export const COMMANDS: SlashCommand[] = [
  // -------------------------------------------------------------------------
  // Media Commands
  // -------------------------------------------------------------------------
  {
    name: "giphy",
    description: "Search and send a GIF",
    longDescription:
      "Search the GIPHY library and send an animated GIF to the channel.",
    usage: "/giphy [search term]",
    category: "media",
    args: [
      {
        name: "query",
        type: "text",
        required: true,
        description: "Search term for finding GIFs",
        placeholder: "Search for GIFs...",
      },
    ],
    requiredFeature: FEATURES.GIF_PICKER,
    showPreview: true,
    icon: "film",
  },
  {
    name: "tenor",
    description: "Search GIFs on Tenor",
    usage: "/tenor [search term]",
    category: "media",
    args: [
      {
        name: "query",
        type: "text",
        required: true,
        description: "Search term for finding GIFs",
        placeholder: "Search Tenor...",
      },
    ],
    requiredFeature: FEATURES.GIF_PICKER,
    showPreview: true,
    icon: "video",
    hidden: true,
  },

  // -------------------------------------------------------------------------
  // Interactive Commands
  // -------------------------------------------------------------------------
  {
    name: "poll",
    description: "Create a poll",
    longDescription:
      "Create a poll with multiple options for channel members to vote on.",
    usage: '/poll "Question" "Option 1" "Option 2" ...',
    category: "utility",
    args: [
      {
        name: "question",
        type: "text",
        required: true,
        description: "The poll question",
        placeholder: "What is your question?",
      },
      {
        name: "options",
        type: "options",
        required: true,
        description: "Poll options (2-10 options)",
        placeholder: "Add poll options...",
      },
    ],
    requiredFeature: FEATURES.POLLS,
    showPreview: true,
    icon: "chart-bar",
  },
  {
    name: "remind",
    description: "Set a reminder",
    longDescription:
      "Set a reminder that will notify you at the specified time.",
    usage: "/remind [time] [message]",
    category: "utility",
    args: [
      {
        name: "time",
        type: "duration",
        required: true,
        description:
          'When to remind you (e.g., "in 30 minutes", "tomorrow at 9am")',
        placeholder: "in 30 minutes",
      },
      {
        name: "message",
        type: "text",
        required: true,
        description: "What to remind you about",
        placeholder: "Reminder message...",
      },
    ],
    requiredFeature: FEATURES.REMINDERS,
    icon: "clock",
  },

  // -------------------------------------------------------------------------
  // Status Commands
  // -------------------------------------------------------------------------
  {
    name: "status",
    description: "Set your status",
    longDescription:
      "Update your status with an emoji and optional text message.",
    usage: "/status [emoji] [text]",
    category: "status",
    args: [
      {
        name: "emoji",
        type: "emoji",
        required: false,
        description: "Status emoji",
        placeholder: "Select an emoji...",
      },
      {
        name: "text",
        type: "text",
        required: false,
        description: "Status text",
        placeholder: "What are you up to?",
      },
    ],
    requiredFeature: FEATURES.USERS_CUSTOM_STATUS,
    icon: "smile",
  },
  {
    name: "away",
    description: "Set yourself as away",
    longDescription:
      "Mark yourself as away. Others will see you as unavailable.",
    usage: "/away",
    category: "status",
    args: [],
    requiredFeature: FEATURES.USERS_PRESENCE,
    icon: "moon",
  },
  {
    name: "active",
    description: "Set yourself as active",
    usage: "/active",
    category: "status",
    args: [],
    requiredFeature: FEATURES.USERS_PRESENCE,
    icon: "circle",
    aliases: ["online", "back"],
  },
  {
    name: "dnd",
    description: "Enable do not disturb",
    longDescription:
      "Enable do not disturb mode. You will not receive notifications.",
    usage: "/dnd [duration]",
    category: "status",
    args: [
      {
        name: "duration",
        type: "duration",
        required: false,
        description: "How long to enable DND (optional)",
        placeholder: "1 hour",
        defaultValue: "until you turn it off",
      },
    ],
    requiredFeature: FEATURES.NOTIFICATIONS_DND,
    icon: "bell-off",
  },

  // -------------------------------------------------------------------------
  // Channel Commands
  // -------------------------------------------------------------------------
  {
    name: "mute",
    description: "Mute current channel",
    longDescription:
      "Mute the current channel to stop receiving notifications.",
    usage: "/mute [duration]",
    category: "channel",
    args: [
      {
        name: "duration",
        type: "duration",
        required: false,
        description: "How long to mute (optional)",
        placeholder: "1 hour",
        defaultValue: "until you unmute",
      },
    ],
    requiresChannel: true,
    requiredFeature: FEATURES.CHANNELS_MUTE,
    icon: "volume-x",
  },
  {
    name: "unmute",
    description: "Unmute current channel",
    usage: "/unmute",
    category: "channel",
    args: [],
    requiresChannel: true,
    requiredFeature: FEATURES.CHANNELS_MUTE,
    icon: "volume-2",
  },
  {
    name: "invite",
    description: "Invite user to channel",
    longDescription: "Invite one or more users to join the current channel.",
    usage: "/invite @user",
    category: "channel",
    args: [
      {
        name: "users",
        type: "user",
        required: true,
        description: "User(s) to invite",
        placeholder: "@username",
      },
    ],
    requiresChannel: true,
    icon: "user-plus",
  },
  {
    name: "topic",
    description: "Set channel topic",
    longDescription: "Update the topic/description of the current channel.",
    usage: "/topic [new topic]",
    category: "channel",
    args: [
      {
        name: "topic",
        type: "text",
        required: true,
        description: "New channel topic",
        placeholder: "Enter new topic...",
      },
    ],
    requiresChannel: true,
    requiredFeature: FEATURES.CHANNELS_TOPICS,
    requiresPermission: "moderator",
    icon: "hash",
  },
  {
    name: "rename",
    description: "Rename channel",
    longDescription: "Change the name of the current channel.",
    usage: "/rename [new name]",
    category: "channel",
    args: [
      {
        name: "name",
        type: "text",
        required: true,
        description: "New channel name",
        placeholder: "Enter new name...",
      },
    ],
    requiresChannel: true,
    requiresPermission: "admin",
    icon: "edit",
  },
  {
    name: "archive",
    description: "Archive channel",
    longDescription:
      "Archive the current channel. Members will no longer be able to post.",
    usage: "/archive",
    category: "channel",
    args: [],
    requiresChannel: true,
    requiredFeature: FEATURES.CHANNELS_ARCHIVE,
    requiresPermission: "admin",
    showPreview: true,
    icon: "archive",
  },
  {
    name: "leave",
    description: "Leave channel",
    longDescription:
      "Leave the current channel. You can rejoin public channels later.",
    usage: "/leave",
    category: "channel",
    args: [],
    requiresChannel: true,
    showPreview: true,
    icon: "log-out",
  },
  {
    name: "star",
    description: "Star current channel",
    usage: "/star",
    category: "channel",
    args: [],
    requiresChannel: true,
    requiredFeature: FEATURES.CHANNELS_FAVORITES,
    icon: "star",
  },
  {
    name: "unstar",
    description: "Unstar current channel",
    usage: "/unstar",
    category: "channel",
    args: [],
    requiresChannel: true,
    requiredFeature: FEATURES.CHANNELS_FAVORITES,
    icon: "star-off",
  },

  // -------------------------------------------------------------------------
  // Moderation Commands
  // -------------------------------------------------------------------------
  {
    name: "kick",
    description: "Remove user from channel",
    longDescription:
      "Remove a user from the current channel. They can rejoin if the channel is public.",
    usage: "/kick @user",
    category: "moderation",
    args: [
      {
        name: "user",
        type: "user",
        required: true,
        description: "User to remove",
        placeholder: "@username",
      },
    ],
    requiresChannel: true,
    requiresPermission: "moderator",
    showPreview: true,
    icon: "user-minus",
  },
  {
    name: "ban",
    description: "Ban user from channel",
    longDescription:
      "Ban a user from the current channel. They will not be able to rejoin.",
    usage: "/ban @user [reason]",
    category: "moderation",
    args: [
      {
        name: "user",
        type: "user",
        required: true,
        description: "User to ban",
        placeholder: "@username",
      },
      {
        name: "reason",
        type: "text",
        required: false,
        description: "Reason for the ban",
        placeholder: "Reason...",
      },
    ],
    requiresChannel: true,
    requiredFeature: FEATURES.MODERATION_BANS,
    requiresPermission: "moderator",
    showPreview: true,
    icon: "ban",
  },
  {
    name: "unban",
    description: "Unban user from channel",
    usage: "/unban @user",
    category: "moderation",
    args: [
      {
        name: "user",
        type: "user",
        required: true,
        description: "User to unban",
        placeholder: "@username",
      },
    ],
    requiresChannel: true,
    requiredFeature: FEATURES.MODERATION_BANS,
    requiresPermission: "moderator",
    icon: "user-check",
  },
  {
    name: "warn",
    description: "Warn a user",
    usage: "/warn @user [reason]",
    category: "moderation",
    args: [
      {
        name: "user",
        type: "user",
        required: true,
        description: "User to warn",
        placeholder: "@username",
      },
      {
        name: "reason",
        type: "text",
        required: false,
        description: "Reason for the warning",
        placeholder: "Reason...",
      },
    ],
    requiresChannel: true,
    requiredFeature: FEATURES.MODERATION_WARNINGS,
    requiresPermission: "moderator",
    icon: "alert-triangle",
  },
  {
    name: "slowmode",
    description: "Enable slow mode",
    longDescription: "Limit how often users can send messages in this channel.",
    usage: "/slowmode [interval]",
    category: "moderation",
    args: [
      {
        name: "interval",
        type: "duration",
        required: false,
        description: 'Time between messages (e.g., "30s", "1m")',
        placeholder: "30 seconds",
        defaultValue: "30s",
      },
    ],
    requiresChannel: true,
    requiredFeature: FEATURES.MODERATION_SLOW_MODE,
    requiresPermission: "moderator",
    icon: "clock",
  },

  // -------------------------------------------------------------------------
  // Utility Commands
  // -------------------------------------------------------------------------
  {
    name: "who",
    description: "List channel members",
    longDescription: "Display a list of all members in the current channel.",
    usage: "/who",
    category: "utility",
    args: [],
    requiresChannel: true,
    icon: "users",
  },
  {
    name: "search",
    description: "Search messages",
    longDescription:
      "Search for messages in the current channel or across all channels.",
    usage: "/search [query]",
    category: "navigation",
    args: [
      {
        name: "query",
        type: "text",
        required: true,
        description: "Search query",
        placeholder: "Search for...",
      },
    ],
    requiredFeature: FEATURES.SEARCH_MESSAGES,
    shortcut: "Cmd+K",
    icon: "search",
  },
  {
    name: "shortcuts",
    description: "Show keyboard shortcuts",
    longDescription: "Display a list of all available keyboard shortcuts.",
    usage: "/shortcuts",
    category: "utility",
    args: [],
    shortcut: "Cmd+/",
    icon: "keyboard",
  },
  {
    name: "help",
    description: "Show available commands",
    longDescription: "Display a list of all available slash commands.",
    usage: "/help [command]",
    category: "utility",
    args: [
      {
        name: "command",
        type: "text",
        required: false,
        description: "Command to get help for",
        placeholder: "Command name...",
      },
    ],
    icon: "help-circle",
  },

  // -------------------------------------------------------------------------
  // Fun Commands
  // -------------------------------------------------------------------------
  {
    name: "shrug",
    description: "Send a shrug",
    longDescription: "Append the shrug emoji to your message.",
    usage: "/shrug [text]",
    category: "fun",
    args: [
      {
        name: "text",
        type: "text",
        required: false,
        description: "Optional text before the shrug",
        placeholder: "Message...",
      },
    ],
    icon: "meh",
  },
  {
    name: "tableflip",
    description: "Send a table flip",
    usage: "/tableflip [text]",
    category: "fun",
    args: [
      {
        name: "text",
        type: "text",
        required: false,
        description: "Optional text before the flip",
        placeholder: "Message...",
      },
    ],
    icon: "zap",
    aliases: ["flip"],
  },
  {
    name: "unflip",
    description: "Put the table back",
    usage: "/unflip [text]",
    category: "fun",
    args: [
      {
        name: "text",
        type: "text",
        required: false,
        description: "Optional text after the unflip",
        placeholder: "Message...",
      },
    ],
    icon: "refresh-cw",
  },
  {
    name: "me",
    description: "Action message",
    longDescription: "Send an action message that appears in italics.",
    usage: "/me [action]",
    category: "fun",
    args: [
      {
        name: "action",
        type: "text",
        required: true,
        description: "The action you are performing",
        placeholder: "is doing something...",
      },
    ],
    icon: "user",
  },

  // -------------------------------------------------------------------------
  // Display Commands
  // -------------------------------------------------------------------------
  {
    name: "collapse",
    description: "Collapse all images",
    longDescription:
      "Collapse all inline images and previews in the current channel.",
    usage: "/collapse",
    category: "utility",
    args: [],
    icon: "minimize-2",
  },
  {
    name: "expand",
    description: "Expand all images",
    longDescription:
      "Expand all inline images and previews in the current channel.",
    usage: "/expand",
    category: "utility",
    args: [],
    icon: "maximize-2",
  },

  // -------------------------------------------------------------------------
  // Navigation Commands
  // -------------------------------------------------------------------------
  {
    name: "open",
    description: "Open a channel",
    usage: "/open [channel]",
    category: "navigation",
    args: [
      {
        name: "channel",
        type: "channel",
        required: true,
        description: "Channel to open",
        placeholder: "#channel",
      },
    ],
    shortcut: "Cmd+K",
    icon: "hash",
    aliases: ["goto", "jump"],
  },
  {
    name: "dm",
    description: "Open direct message",
    usage: "/dm @user",
    category: "navigation",
    args: [
      {
        name: "user",
        type: "user",
        required: true,
        description: "User to message",
        placeholder: "@username",
      },
    ],
    requiredFeature: FEATURES.CHANNELS_DIRECT,
    icon: "message-circle",
    aliases: ["msg", "message"],
  },
  {
    name: "settings",
    description: "Open settings",
    usage: "/settings",
    category: "navigation",
    args: [],
    shortcut: "Cmd+,",
    icon: "settings",
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a command by its name
 */
export function getCommandByName(name: string): SlashCommand | undefined {
  const normalizedName = name.toLowerCase();
  return COMMANDS.find(
    (cmd) =>
      cmd.name === normalizedName || cmd.aliases?.includes(normalizedName),
  );
}

/**
 * Get all commands in a category
 */
export function getCommandsByCategory(
  category: CommandCategory,
): SlashCommand[] {
  return COMMANDS.filter((cmd) => cmd.category === category && !cmd.hidden);
}

/**
 * Get all visible commands
 */
export function getVisibleCommands(): SlashCommand[] {
  return COMMANDS.filter((cmd) => !cmd.hidden);
}

/**
 * Search commands by query
 */
export function searchCommands(query: string): SlashCommand[] {
  const normalizedQuery = query.toLowerCase();
  return COMMANDS.filter((cmd) => {
    if (cmd.hidden) return false;
    return (
      cmd.name.includes(normalizedQuery) ||
      cmd.description.toLowerCase().includes(normalizedQuery) ||
      cmd.aliases?.some((alias) => alias.includes(normalizedQuery))
    );
  });
}

/**
 * Get command categories with labels
 */
export const COMMAND_CATEGORIES: Record<CommandCategory, string> = {
  media: "Media",
  status: "Status",
  channel: "Channel",
  moderation: "Moderation",
  utility: "Utility",
  fun: "Fun",
  navigation: "Navigation",
};

/**
 * Get all categories in display order
 */
export function getCommandCategoriesInOrder(): CommandCategory[] {
  return [
    "navigation",
    "channel",
    "status",
    "media",
    "utility",
    "moderation",
    "fun",
  ];
}
