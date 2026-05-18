/**
 * Built-in Slash Commands
 *
 * Standard commands available in nchat out of the box
 */

import type {
  SlashCommand,
  CommandContext,
  CommandResult,
} from "./command-types";

// ============================================================================
// Helper to create timestamps
// ============================================================================

const now = new Date().toISOString();

// ============================================================================
// Command Factory
// ============================================================================

function createBuiltInCommand(
  partial: Partial<SlashCommand> &
    Pick<SlashCommand, "id" | "trigger" | "name" | "description" | "category">,
): SlashCommand {
  return {
    arguments: [],
    permissions: {
      minRole: "member",
      allowGuests: false,
    },
    channels: {
      allowedTypes: ["public", "private", "direct", "group"],
      allowInThreads: true,
    },
    responseConfig: {
      type: "ephemeral",
      ephemeral: true,
      showTyping: false,
    },
    actionType: "builtin",
    action: {
      type: "builtin",
      handler: partial.trigger,
    },
    isEnabled: true,
    isBuiltIn: true,
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
    ...partial,
  };
}

// ============================================================================
// Built-in Commands
// ============================================================================

export const builtInCommands: SlashCommand[] = [
  // --------------------------------
  // General Commands
  // --------------------------------
  createBuiltInCommand({
    id: "builtin-help",
    trigger: "help",
    aliases: ["?", "commands"],
    name: "Help",
    description: "Show available commands and help information",
    helpText:
      "Displays a list of all available slash commands. Use /help [command] to get detailed help for a specific command.",
    usage: "/help [command]",
    category: "general",
    icon: "HelpCircle",
    arguments: [
      {
        id: "command",
        name: "command",
        type: "string",
        description: "Specific command to get help for",
        required: false,
        position: 0,
        autocomplete: {
          source: "static",
          minChars: 1,
        },
      },
    ],
    permissions: {
      minRole: "guest",
      allowGuests: true,
    },
    order: 1,
  }),

  createBuiltInCommand({
    id: "builtin-shortcuts",
    trigger: "shortcuts",
    aliases: ["keys", "hotkeys"],
    name: "Keyboard Shortcuts",
    description: "Show keyboard shortcuts",
    helpText:
      "Displays all available keyboard shortcuts for navigating and using nchat.",
    usage: "/shortcuts",
    category: "general",
    icon: "Keyboard",
    permissions: {
      minRole: "guest",
      allowGuests: true,
    },
    order: 2,
  }),

  // --------------------------------
  // Status Commands
  // --------------------------------
  createBuiltInCommand({
    id: "builtin-away",
    trigger: "away",
    aliases: ["brb", "afk"],
    name: "Set Away",
    description: "Set your status to away",
    helpText:
      "Sets your status to away. Optionally add a message to let others know when you will be back.",
    usage: "/away [message]",
    category: "user",
    icon: "Clock",
    arguments: [
      {
        id: "message",
        name: "message",
        type: "rest",
        description: "Optional away message",
        required: false,
        position: 0,
      },
    ],
    actionType: "status",
    action: {
      type: "status",
      status: {
        text: "Away",
        emoji: ":clock:",
      },
    },
    responseConfig: {
      type: "notification",
      ephemeral: true,
      showTyping: false,
      template: "Your status has been set to away",
    },
    order: 10,
  }),

  createBuiltInCommand({
    id: "builtin-active",
    trigger: "active",
    aliases: ["back", "online"],
    name: "Set Active",
    description: "Set your status to active",
    helpText: "Clears your away status and sets you as active.",
    usage: "/active",
    category: "user",
    icon: "CheckCircle",
    actionType: "status",
    action: {
      type: "status",
      status: {
        text: "Active",
        emoji: ":green_circle:",
      },
    },
    responseConfig: {
      type: "notification",
      ephemeral: true,
      showTyping: false,
      template: "Your status has been set to active",
    },
    order: 11,
  }),

  createBuiltInCommand({
    id: "builtin-status",
    trigger: "status",
    name: "Set Custom Status",
    description: "Set a custom status message",
    helpText: "Set a custom status with an optional emoji and expiry time.",
    usage: "/status [emoji] <message> [duration]",
    category: "user",
    icon: "MessageSquare",
    arguments: [
      {
        id: "emoji",
        name: "emoji",
        type: "string",
        description: "Status emoji",
        required: false,
        flag: "emoji",
        shortFlag: "e",
      },
      {
        id: "message",
        name: "message",
        type: "string",
        description: "Status message",
        required: true,
        position: 0,
      },
      {
        id: "duration",
        name: "duration",
        type: "duration",
        description: "How long to show status (e.g., 1h, 30m)",
        required: false,
        flag: "duration",
        shortFlag: "d",
      },
    ],
    order: 12,
  }),

  createBuiltInCommand({
    id: "builtin-dnd",
    trigger: "dnd",
    aliases: ["donotdisturb"],
    name: "Do Not Disturb",
    description: "Enable do not disturb mode",
    helpText:
      "Enables do not disturb mode. You will not receive notifications while in this mode.",
    usage: "/dnd [duration]",
    category: "user",
    icon: "BellOff",
    arguments: [
      {
        id: "duration",
        name: "duration",
        type: "duration",
        description: "How long to enable DND (e.g., 1h, 30m)",
        required: false,
        position: 0,
      },
    ],
    order: 13,
  }),

  // --------------------------------
  // Channel Commands
  // --------------------------------
  createBuiltInCommand({
    id: "builtin-mute",
    trigger: "mute",
    name: "Mute Channel",
    description: "Mute notifications for this channel",
    helpText:
      "Mutes notifications from the current channel. You can specify a duration.",
    usage: "/mute [duration]",
    category: "channel",
    icon: "VolumeX",
    arguments: [
      {
        id: "duration",
        name: "duration",
        type: "duration",
        description: "How long to mute (e.g., 1h, 30m, forever)",
        required: false,
        position: 0,
        defaultValue: "forever",
      },
    ],
    order: 20,
  }),

  createBuiltInCommand({
    id: "builtin-unmute",
    trigger: "unmute",
    name: "Unmute Channel",
    description: "Unmute notifications for this channel",
    helpText: "Unmutes notifications from the current channel.",
    usage: "/unmute",
    category: "channel",
    icon: "Volume2",
    order: 21,
  }),

  createBuiltInCommand({
    id: "builtin-invite",
    trigger: "invite",
    name: "Invite User",
    description: "Invite a user to this channel",
    helpText: "Invites the specified user(s) to the current channel.",
    usage: "/invite @user [@user2...]",
    category: "channel",
    icon: "UserPlus",
    arguments: [
      {
        id: "users",
        name: "users",
        type: "user",
        description: "User(s) to invite",
        required: true,
        position: 0,
        autocomplete: {
          source: "users",
          minChars: 1,
        },
      },
    ],
    permissions: {
      minRole: "member",
      allowGuests: false,
    },
    channels: {
      allowedTypes: ["public", "private", "group"],
      allowInThreads: false,
    },
    order: 22,
  }),

  createBuiltInCommand({
    id: "builtin-leave",
    trigger: "leave",
    aliases: ["part"],
    name: "Leave Channel",
    description: "Leave the current channel",
    helpText:
      "Removes you from the current channel. You can rejoin public channels later.",
    usage: "/leave",
    category: "channel",
    icon: "LogOut",
    channels: {
      allowedTypes: ["public", "private", "group"],
      allowInThreads: false,
    },
    order: 23,
  }),

  createBuiltInCommand({
    id: "builtin-topic",
    trigger: "topic",
    name: "Set Topic",
    description: "Set the channel topic",
    helpText: "Sets or clears the topic for the current channel.",
    usage: "/topic <new topic>",
    category: "channel",
    icon: "Type",
    arguments: [
      {
        id: "topic",
        name: "topic",
        type: "rest",
        description: "New channel topic (leave empty to clear)",
        required: false,
        position: 0,
        validation: {
          maxLength: 250,
        },
      },
    ],
    permissions: {
      minRole: "moderator",
      allowGuests: false,
    },
    channels: {
      allowedTypes: ["public", "private"],
      allowInThreads: false,
    },
    order: 24,
  }),

  createBuiltInCommand({
    id: "builtin-rename",
    trigger: "rename",
    name: "Rename Channel",
    description: "Rename the current channel",
    helpText: "Changes the name of the current channel.",
    usage: "/rename <new name>",
    category: "channel",
    icon: "Edit3",
    arguments: [
      {
        id: "name",
        name: "name",
        type: "string",
        description: "New channel name",
        required: true,
        position: 0,
        validation: {
          minLength: 2,
          maxLength: 80,
          pattern: "^[a-z0-9-]+$",
        },
      },
    ],
    permissions: {
      minRole: "admin",
      allowGuests: false,
    },
    channels: {
      allowedTypes: ["public", "private"],
      allowInThreads: false,
    },
    order: 25,
  }),

  createBuiltInCommand({
    id: "builtin-archive",
    trigger: "archive",
    name: "Archive Channel",
    description: "Archive the current channel",
    helpText:
      "Archives the channel. Archived channels are read-only and hidden from the channel list.",
    usage: "/archive",
    category: "channel",
    icon: "Archive",
    permissions: {
      minRole: "admin",
      allowGuests: false,
    },
    channels: {
      allowedTypes: ["public", "private"],
      allowInThreads: false,
    },
    order: 26,
  }),

  // --------------------------------
  // Utility Commands
  // --------------------------------
  createBuiltInCommand({
    id: "builtin-remind",
    trigger: "remind",
    aliases: ["reminder"],
    name: "Set Reminder",
    description: "Set a reminder",
    helpText: "Creates a reminder that will notify you at the specified time.",
    usage: "/remind <time> <message>",
    category: "utility",
    icon: "Bell",
    arguments: [
      {
        id: "time",
        name: "when",
        type: "datetime",
        description: "When to remind (e.g., in 30m, tomorrow at 9am)",
        required: true,
        position: 0,
      },
      {
        id: "message",
        name: "message",
        type: "rest",
        description: "Reminder message",
        required: true,
        position: 1,
      },
    ],
    order: 30,
  }),

  createBuiltInCommand({
    id: "builtin-poll",
    trigger: "poll",
    name: "Create Poll",
    description: "Create a poll",
    helpText:
      "Creates a poll with the given question and options. Separate options with quotes.",
    usage: '/poll "Question" "Option 1" "Option 2" ...',
    category: "utility",
    icon: "BarChart3",
    arguments: [
      {
        id: "question",
        name: "question",
        type: "string",
        description: "Poll question",
        required: true,
        position: 0,
      },
      {
        id: "options",
        name: "options",
        type: "rest",
        description: "Poll options (min 2, max 10)",
        required: true,
        position: 1,
      },
    ],
    responseConfig: {
      type: "message",
      ephemeral: false,
      showTyping: true,
    },
    order: 31,
  }),

  createBuiltInCommand({
    id: "builtin-search",
    trigger: "search",
    aliases: ["find"],
    name: "Search Messages",
    description: "Search messages in this channel",
    helpText:
      "Searches for messages containing the specified text. Use filters to narrow results.",
    usage: "/search <query> [--from @user] [--before date] [--after date]",
    category: "utility",
    icon: "Search",
    arguments: [
      {
        id: "query",
        name: "query",
        type: "string",
        description: "Search query",
        required: true,
        position: 0,
      },
      {
        id: "from",
        name: "from",
        type: "user",
        description: "Filter by author",
        required: false,
        flag: "from",
        shortFlag: "f",
      },
      {
        id: "before",
        name: "before",
        type: "date",
        description: "Messages before this date",
        required: false,
        flag: "before",
        shortFlag: "b",
      },
      {
        id: "after",
        name: "after",
        type: "date",
        description: "Messages after this date",
        required: false,
        flag: "after",
        shortFlag: "a",
      },
    ],
    actionType: "modal",
    action: {
      type: "modal",
      modal: {
        component: "SearchResults",
      },
    },
    order: 32,
  }),

  // --------------------------------
  // Fun Commands
  // --------------------------------
  createBuiltInCommand({
    id: "builtin-giphy",
    trigger: "giphy",
    aliases: ["gif"],
    name: "Giphy",
    description: "Search and share a GIF",
    helpText: "Searches Giphy for a GIF matching your query.",
    usage: "/giphy <search term>",
    category: "fun",
    icon: "Image",
    arguments: [
      {
        id: "query",
        name: "query",
        type: "rest",
        description: "Search term",
        required: true,
        position: 0,
      },
    ],
    responseConfig: {
      type: "message",
      ephemeral: false,
      showTyping: true,
    },
    order: 40,
  }),

  createBuiltInCommand({
    id: "builtin-shrug",
    trigger: "shrug",
    name: "Shrug",
    description: "Send a shrug emoticon",
    usage: "/shrug [message]",
    category: "fun",
    icon: "Meh",
    arguments: [
      {
        id: "message",
        name: "message",
        type: "rest",
        description: "Optional message to include",
        required: false,
        position: 0,
      },
    ],
    actionType: "message",
    action: {
      type: "message",
      message: "{{message}} \u00AF\\_(\u30C4)_/\u00AF",
    },
    responseConfig: {
      type: "message",
      ephemeral: false,
      showTyping: false,
      template: "{{message}} \u00AF\\_(\u30C4)_/\u00AF",
    },
    order: 41,
  }),

  createBuiltInCommand({
    id: "builtin-tableflip",
    trigger: "tableflip",
    aliases: ["flip"],
    name: "Table Flip",
    description: "Flip a table in frustration",
    usage: "/tableflip [message]",
    category: "fun",
    icon: "FlipHorizontal",
    arguments: [
      {
        id: "message",
        name: "message",
        type: "rest",
        description: "Optional message to include",
        required: false,
        position: 0,
      },
    ],
    actionType: "message",
    action: {
      type: "message",
      message:
        "{{message}} (\u256F\u00B0\u25A1\u00B0)\u256F\uFE35 \u253B\u2501\u253B",
    },
    responseConfig: {
      type: "message",
      ephemeral: false,
      showTyping: false,
      template:
        "{{message}} (\u256F\u00B0\u25A1\u00B0)\u256F\uFE35 \u253B\u2501\u253B",
    },
    order: 42,
  }),

  createBuiltInCommand({
    id: "builtin-unflip",
    trigger: "unflip",
    name: "Unflip Table",
    description: "Put the table back",
    usage: "/unflip",
    category: "fun",
    icon: "RotateCcw",
    actionType: "message",
    action: {
      type: "message",
      message: "\u252C\u2500\u2500\u252C\u30CE( \u309C-\u309C\u30CE)",
    },
    responseConfig: {
      type: "message",
      ephemeral: false,
      showTyping: false,
      template: "\u252C\u2500\u2500\u252C\u30CE( \u309C-\u309C\u30CE)",
    },
    order: 43,
  }),

  createBuiltInCommand({
    id: "builtin-me",
    trigger: "me",
    name: "Action Message",
    description: "Send an action message",
    helpText: "Sends a message describing an action you are performing.",
    usage: "/me <action>",
    category: "fun",
    icon: "User",
    arguments: [
      {
        id: "action",
        name: "action",
        type: "rest",
        description: "Action you are performing",
        required: true,
        position: 0,
      },
    ],
    actionType: "message",
    action: {
      type: "message",
      message: "_{{username}} {{action}}_",
    },
    responseConfig: {
      type: "message",
      ephemeral: false,
      showTyping: false,
      template: "_{{username}} {{action}}_",
    },
    order: 44,
  }),

  // --------------------------------
  // Navigation Commands
  // --------------------------------
  createBuiltInCommand({
    id: "builtin-dm",
    trigger: "dm",
    aliases: ["msg", "message"],
    name: "Direct Message",
    description: "Open a direct message with a user",
    helpText: "Opens a direct message conversation with the specified user.",
    usage: "/dm @user [message]",
    category: "user",
    icon: "MessageCircle",
    arguments: [
      {
        id: "user",
        name: "user",
        type: "user",
        description: "User to message",
        required: true,
        position: 0,
        autocomplete: {
          source: "users",
          minChars: 1,
        },
      },
      {
        id: "message",
        name: "message",
        type: "rest",
        description: "Optional initial message",
        required: false,
        position: 1,
      },
    ],
    actionType: "navigate",
    action: {
      type: "navigate",
      navigate: {
        url: "/chat/dm/{{userId}}",
      },
    },
    order: 50,
  }),

  createBuiltInCommand({
    id: "builtin-apps",
    trigger: "apps",
    aliases: ["integrations"],
    name: "App Directory",
    description: "Open the app directory",
    usage: "/apps",
    category: "integration",
    icon: "Grid",
    actionType: "navigate",
    action: {
      type: "navigate",
      navigate: {
        url: "/apps",
      },
    },
    order: 51,
  }),

  createBuiltInCommand({
    id: "builtin-settings",
    trigger: "settings",
    aliases: ["preferences", "prefs"],
    name: "Settings",
    description: "Open settings",
    usage: "/settings [section]",
    category: "general",
    icon: "Settings",
    arguments: [
      {
        id: "section",
        name: "section",
        type: "choice",
        description: "Settings section to open",
        required: false,
        position: 0,
        choices: [
          {
            value: "profile",
            label: "Profile",
            description: "Edit your profile",
          },
          {
            value: "notifications",
            label: "Notifications",
            description: "Notification preferences",
          },
          {
            value: "appearance",
            label: "Appearance",
            description: "Theme and display settings",
          },
          {
            value: "privacy",
            label: "Privacy",
            description: "Privacy settings",
          },
          {
            value: "advanced",
            label: "Advanced",
            description: "Advanced settings",
          },
        ],
      },
    ],
    actionType: "navigate",
    action: {
      type: "navigate",
      navigate: {
        url: "/settings/{{section}}",
      },
    },
    order: 52,
  }),

  // --------------------------------
  // Feedback & Support
  // --------------------------------
  createBuiltInCommand({
    id: "builtin-feedback",
    trigger: "feedback",
    aliases: ["bug", "report"],
    name: "Send Feedback",
    description: "Send feedback or report a bug",
    helpText: "Opens a form to submit feedback, suggestions, or bug reports.",
    usage: "/feedback [message]",
    category: "general",
    icon: "MessageSquarePlus",
    arguments: [
      {
        id: "message",
        name: "message",
        type: "rest",
        description: "Feedback message",
        required: false,
        position: 0,
      },
    ],
    actionType: "modal",
    action: {
      type: "modal",
      modal: {
        component: "FeedbackModal",
        props: {
          prefill: "{{message}}",
        },
      },
    },
    order: 60,
  }),

  // --------------------------------
  // Moderation Commands
  // --------------------------------
  createBuiltInCommand({
    id: "builtin-kick",
    trigger: "kick",
    name: "Kick User",
    description: "Remove a user from this channel",
    helpText: "Removes the specified user from the current channel.",
    usage: "/kick @user [reason]",
    category: "moderation",
    icon: "UserMinus",
    arguments: [
      {
        id: "user",
        name: "user",
        type: "user",
        description: "User to kick",
        required: true,
        position: 0,
      },
      {
        id: "reason",
        name: "reason",
        type: "rest",
        description: "Reason for kick",
        required: false,
        position: 1,
      },
    ],
    permissions: {
      minRole: "moderator",
      allowGuests: false,
    },
    channels: {
      allowedTypes: ["public", "private", "group"],
      allowInThreads: false,
    },
    order: 70,
  }),

  createBuiltInCommand({
    id: "builtin-ban",
    trigger: "ban",
    name: "Ban User",
    description: "Ban a user from this channel",
    helpText:
      "Bans the specified user from the current channel. Banned users cannot rejoin.",
    usage: "/ban @user [reason]",
    category: "moderation",
    icon: "Ban",
    arguments: [
      {
        id: "user",
        name: "user",
        type: "user",
        description: "User to ban",
        required: true,
        position: 0,
      },
      {
        id: "reason",
        name: "reason",
        type: "rest",
        description: "Reason for ban",
        required: false,
        position: 1,
      },
    ],
    permissions: {
      minRole: "admin",
      allowGuests: false,
    },
    channels: {
      allowedTypes: ["public", "private", "group"],
      allowInThreads: false,
    },
    order: 71,
  }),

  createBuiltInCommand({
    id: "builtin-unban",
    trigger: "unban",
    name: "Unban User",
    description: "Remove a ban from a user",
    usage: "/unban @user",
    category: "moderation",
    icon: "UserCheck",
    arguments: [
      {
        id: "user",
        name: "user",
        type: "user",
        description: "User to unban",
        required: true,
        position: 0,
      },
    ],
    permissions: {
      minRole: "admin",
      allowGuests: false,
    },
    channels: {
      allowedTypes: ["public", "private", "group"],
      allowInThreads: false,
    },
    order: 72,
  }),

  createBuiltInCommand({
    id: "builtin-slow",
    trigger: "slow",
    aliases: ["slowmode"],
    name: "Slow Mode",
    description: "Enable slow mode for this channel",
    helpText: "Limits how often users can send messages in this channel.",
    usage: "/slow <duration>",
    category: "moderation",
    icon: "Timer",
    arguments: [
      {
        id: "duration",
        name: "duration",
        type: "duration",
        description:
          'Time between messages (e.g., 5s, 30s, 1m). Use "off" to disable.',
        required: true,
        position: 0,
      },
    ],
    permissions: {
      minRole: "moderator",
      allowGuests: false,
    },
    channels: {
      allowedTypes: ["public", "private"],
      allowInThreads: false,
    },
    order: 73,
  }),

  createBuiltInCommand({
    id: "builtin-clear",
    trigger: "clear",
    aliases: ["purge"],
    name: "Clear Messages",
    description: "Delete recent messages",
    helpText:
      "Deletes the specified number of recent messages in this channel.",
    usage: "/clear <count> [--from @user]",
    category: "moderation",
    icon: "Trash2",
    arguments: [
      {
        id: "count",
        name: "count",
        type: "number",
        description: "Number of messages to delete (max 100)",
        required: true,
        position: 0,
        validation: {
          min: 1,
          max: 100,
        },
      },
      {
        id: "from",
        name: "from",
        type: "user",
        description: "Only delete messages from this user",
        required: false,
        flag: "from",
        shortFlag: "f",
      },
    ],
    permissions: {
      minRole: "admin",
      allowGuests: false,
    },
    order: 74,
  }),
];

// ============================================================================
// Command Map for Quick Lookup
// ============================================================================

export const builtInCommandsMap = new Map<string, SlashCommand>();
export const builtInTriggerMap = new Map<string, SlashCommand>();

// Populate maps
builtInCommands.forEach((cmd) => {
  builtInCommandsMap.set(cmd.id, cmd);
  builtInTriggerMap.set(cmd.trigger, cmd);
  cmd.aliases?.forEach((alias) => {
    builtInTriggerMap.set(alias, cmd);
  });
});

// ============================================================================
// Command Categories
// ============================================================================

export const commandCategories = {
  general: {
    name: "General",
    description: "General utility commands",
    icon: "Grid",
  },
  channel: {
    name: "Channel",
    description: "Channel management commands",
    icon: "Hash",
  },
  user: {
    name: "User",
    description: "User-related commands",
    icon: "User",
  },
  message: {
    name: "Message",
    description: "Message operations",
    icon: "MessageSquare",
  },
  moderation: {
    name: "Moderation",
    description: "Moderation tools",
    icon: "Shield",
  },
  fun: {
    name: "Fun",
    description: "Fun and entertainment",
    icon: "Smile",
  },
  utility: {
    name: "Utility",
    description: "Utility commands",
    icon: "Tool",
  },
  integration: {
    name: "Integration",
    description: "External integrations",
    icon: "Plug",
  },
  custom: {
    name: "Custom",
    description: "Custom commands",
    icon: "Sparkles",
  },
} as const;
