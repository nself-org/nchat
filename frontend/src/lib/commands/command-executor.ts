/**
 * Command Executor
 *
 * This module handles the execution of slash commands. It maps commands
 * to their respective actions and handles the execution lifecycle.
 *
 * @example
 * ```typescript
 * import { executeCommand } from '@/lib/commands/command-executor'
 *
 * const result = await executeCommand(parsedCommand, context)
 * if (result.success) {
 *   /* console.log result.message)
 * } else {
 *   logger.error(result.error)
 * }
 * ```
 */

import type { ParsedArg, ParsedCommand } from "./command-parser";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Context for command execution
 */
export interface CommandContext {
  /** Current user ID */
  userId: string;
  /** Current user's display name */
  userName: string;
  /** Current user's role */
  userRole: "owner" | "admin" | "moderator" | "member" | "guest";
  /** Current channel ID (if in a channel) */
  channelId?: string;
  /** Current channel name */
  channelName?: string;
  /** Current thread ID (if in a thread) */
  threadId?: string;
}

/**
 * Result of command execution
 */
export interface CommandResult {
  /** Whether the command executed successfully */
  success: boolean;
  /** Type of result */
  type: CommandResultType;
  /** Success message */
  message?: string;
  /** Error message */
  error?: string;
  /** Data returned by the command */
  data?: CommandResultData;
  /** Side effects to perform */
  effects?: CommandEffect[];
}

/**
 * Type of command result
 */
export type CommandResultType =
  | "message" // Send a message
  | "action" // Perform an action (no message)
  | "navigation" // Navigate somewhere
  | "modal" // Open a modal
  | "preview" // Show preview before executing
  | "error" // Error occurred
  | "silent"; // Success with no visible result

/**
 * Data returned by command execution
 */
export interface CommandResultData {
  /** Message content to send */
  messageContent?: string;
  /** Message type */
  messageType?: "text" | "action" | "system";
  /** URL to navigate to */
  navigateTo?: string;
  /** Modal to open */
  modal?: {
    type: string;
    data?: Record<string, unknown>;
  };
  /** Preview content */
  preview?: {
    title: string;
    content: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
  };
  /** Poll data */
  poll?: {
    question: string;
    options: string[];
  };
  /** GIF data */
  gif?: {
    url: string;
    title: string;
    width: number;
    height: number;
  };
  /** Status data */
  status?: {
    emoji?: string;
    text?: string;
    expiration?: number;
  };
  /** Reminder data */
  reminder?: {
    message: string;
    triggerAt: number;
  };
  /** Channel members list */
  members?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  /** Generic key-value data */
  [key: string]: unknown;
}

/**
 * Side effect to perform after command execution
 */
export interface CommandEffect {
  type: CommandEffectType;
  payload: Record<string, unknown>;
}

export type CommandEffectType =
  | "update_presence"
  | "update_status"
  | "mute_channel"
  | "unmute_channel"
  | "star_channel"
  | "unstar_channel"
  | "leave_channel"
  | "archive_channel"
  | "set_topic"
  | "rename_channel"
  | "invite_user"
  | "kick_user"
  | "ban_user"
  | "unban_user"
  | "warn_user"
  | "set_slowmode"
  | "set_dnd"
  | "set_reminder"
  | "open_modal"
  | "navigate"
  | "collapse_media"
  | "expand_media"
  | "send_message";

/**
 * Command handler function type
 */
export type CommandHandler = (
  args: Record<string, ParsedArg>,
  context: CommandContext,
) => Promise<CommandResult> | CommandResult;

// ============================================================================
// Command Handlers Registry
// ============================================================================

const commandHandlers: Record<string, CommandHandler> = {
  // -------------------------------------------------------------------------
  // Fun Commands
  // -------------------------------------------------------------------------
  shrug: (args) => {
    const text = args.text?.value || "";
    return {
      success: true,
      type: "message",
      data: {
        messageContent: `${text} \u00AF\\_(\u30C4)_/\u00AF`.trim(),
        messageType: "text",
      },
    };
  },

  tableflip: (args) => {
    const text = args.text?.value || "";
    return {
      success: true,
      type: "message",
      data: {
        messageContent:
          `${text} (\u256F\u00B0\u25A1\u00B0)\u256F\uFE35 \u253B\u2501\u253B`.trim(),
        messageType: "text",
      },
    };
  },

  unflip: (args) => {
    const text = args.text?.value || "";
    return {
      success: true,
      type: "message",
      data: {
        messageContent:
          `\u252C\u2500\u252C\u30CE( \u00BA _ \u00BA\u30CE) ${text}`.trim(),
        messageType: "text",
      },
    };
  },

  me: (args) => {
    const action = args.action?.value;
    const actionText = Array.isArray(action) ? action.join(" ") : action || "";
    if (!actionText) {
      return {
        success: false,
        type: "error",
        error: "Please provide an action.",
      };
    }
    return {
      success: true,
      type: "message",
      data: {
        messageContent: actionText,
        messageType: "action",
      },
    };
  },

  // -------------------------------------------------------------------------
  // Status Commands
  // -------------------------------------------------------------------------
  status: (args, _context) => {
    const emoji = args.emoji?.value as string | undefined;
    const text = args.text?.value as string | undefined;

    if (!emoji && !text) {
      return {
        success: true,
        type: "action",
        message: "Status cleared.",
        effects: [
          {
            type: "update_status",
            payload: { emoji: null, text: null },
          },
        ],
      };
    }

    return {
      success: true,
      type: "action",
      message: "Status updated.",
      data: {
        status: { emoji, text },
      },
      effects: [
        {
          type: "update_status",
          payload: { emoji, text },
        },
      ],
    };
  },

  away: (_args, _context) => {
    return {
      success: true,
      type: "action",
      message: "You are now away.",
      effects: [
        {
          type: "update_presence",
          payload: { status: "away" },
        },
      ],
    };
  },

  active: (_, context) => {
    return {
      success: true,
      type: "action",
      message: "You are now active.",
      effects: [
        {
          type: "update_presence",
          payload: { status: "online" },
        },
      ],
    };
  },

  dnd: (args) => {
    const duration = args.duration?.value as string | undefined;
    const durationMs = args.duration?.rawValue
      ? parseDurationToMs(args.duration.rawValue)
      : undefined;

    return {
      success: true,
      type: "action",
      message: duration
        ? `Do not disturb enabled for ${duration}.`
        : "Do not disturb enabled.",
      effects: [
        {
          type: "set_dnd",
          payload: {
            enabled: true,
            expiresAt: durationMs ? Date.now() + durationMs : undefined,
          },
        },
      ],
    };
  },

  // -------------------------------------------------------------------------
  // Channel Commands
  // -------------------------------------------------------------------------
  mute: (args, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    const duration = args.duration?.value as string | undefined;
    const durationMs = args.duration?.rawValue
      ? parseDurationToMs(args.duration.rawValue)
      : undefined;

    return {
      success: true,
      type: "action",
      message: duration ? `Channel muted for ${duration}.` : "Channel muted.",
      effects: [
        {
          type: "mute_channel",
          payload: {
            channelId: context.channelId,
            expiresAt: durationMs ? Date.now() + durationMs : undefined,
          },
        },
      ],
    };
  },

  unmute: (_, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    return {
      success: true,
      type: "action",
      message: "Channel unmuted.",
      effects: [
        {
          type: "unmute_channel",
          payload: { channelId: context.channelId },
        },
      ],
    };
  },

  star: (_, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    return {
      success: true,
      type: "action",
      message: "Channel starred.",
      effects: [
        {
          type: "star_channel",
          payload: { channelId: context.channelId },
        },
      ],
    };
  },

  unstar: (_, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    return {
      success: true,
      type: "action",
      message: "Channel unstarred.",
      effects: [
        {
          type: "unstar_channel",
          payload: { channelId: context.channelId },
        },
      ],
    };
  },

  leave: (_, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    return {
      success: true,
      type: "preview",
      message: "Confirm leaving channel.",
      data: {
        preview: {
          title: "Leave Channel",
          content: `Are you sure you want to leave #${context.channelName || "this channel"}?`,
          confirmLabel: "Leave",
          cancelLabel: "Cancel",
        },
      },
      effects: [
        {
          type: "leave_channel",
          payload: { channelId: context.channelId },
        },
      ],
    };
  },

  archive: (_, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    return {
      success: true,
      type: "preview",
      message: "Confirm archiving channel.",
      data: {
        preview: {
          title: "Archive Channel",
          content: `Are you sure you want to archive #${context.channelName || "this channel"}? Members will no longer be able to post.`,
          confirmLabel: "Archive",
          cancelLabel: "Cancel",
        },
      },
      effects: [
        {
          type: "archive_channel",
          payload: { channelId: context.channelId },
        },
      ],
    };
  },

  topic: (args, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    const topic = args.topic?.value as string;
    if (!topic) {
      return {
        success: false,
        type: "error",
        error: "Please provide a topic.",
      };
    }

    return {
      success: true,
      type: "action",
      message: "Channel topic updated.",
      effects: [
        {
          type: "set_topic",
          payload: { channelId: context.channelId, topic },
        },
      ],
    };
  },

  rename: (args, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    const name = args.name?.value as string;
    if (!name) {
      return {
        success: false,
        type: "error",
        error: "Please provide a new name.",
      };
    }

    return {
      success: true,
      type: "action",
      message: `Channel renamed to #${name}.`,
      effects: [
        {
          type: "rename_channel",
          payload: { channelId: context.channelId, name },
        },
      ],
    };
  },

  invite: (args, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    const users = args.users?.value as string;
    if (!users) {
      return {
        success: false,
        type: "error",
        error: "Please specify a user to invite.",
      };
    }

    return {
      success: true,
      type: "action",
      message: `Invited @${users} to the channel.`,
      effects: [
        {
          type: "invite_user",
          payload: { channelId: context.channelId, username: users },
        },
      ],
    };
  },

  who: (_, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    return {
      success: true,
      type: "modal",
      message: "Showing channel members.",
      data: {
        modal: {
          type: "channel-members",
          data: { channelId: context.channelId },
        },
      },
    };
  },

  // -------------------------------------------------------------------------
  // Moderation Commands
  // -------------------------------------------------------------------------
  kick: (args, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    const user = args.user?.value as string;
    if (!user) {
      return {
        success: false,
        type: "error",
        error: "Please specify a user to kick.",
      };
    }

    return {
      success: true,
      type: "preview",
      data: {
        preview: {
          title: "Kick User",
          content: `Are you sure you want to remove @${user} from #${context.channelName || "this channel"}?`,
          confirmLabel: "Kick",
          cancelLabel: "Cancel",
        },
      },
      effects: [
        {
          type: "kick_user",
          payload: { channelId: context.channelId, username: user },
        },
      ],
    };
  },

  ban: (args, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    const user = args.user?.value as string;
    const reason = args.reason?.value as string | undefined;

    if (!user) {
      return {
        success: false,
        type: "error",
        error: "Please specify a user to ban.",
      };
    }

    return {
      success: true,
      type: "preview",
      data: {
        preview: {
          title: "Ban User",
          content: `Are you sure you want to ban @${user} from #${context.channelName || "this channel"}?${reason ? ` Reason: ${reason}` : ""}`,
          confirmLabel: "Ban",
          cancelLabel: "Cancel",
        },
      },
      effects: [
        {
          type: "ban_user",
          payload: { channelId: context.channelId, username: user, reason },
        },
      ],
    };
  },

  unban: (args, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    const user = args.user?.value as string;
    if (!user) {
      return {
        success: false,
        type: "error",
        error: "Please specify a user to unban.",
      };
    }

    return {
      success: true,
      type: "action",
      message: `@${user} has been unbanned.`,
      effects: [
        {
          type: "unban_user",
          payload: { channelId: context.channelId, username: user },
        },
      ],
    };
  },

  warn: (args, context) => {
    const user = args.user?.value as string;
    const reason = args.reason?.value as string | undefined;

    if (!user) {
      return {
        success: false,
        type: "error",
        error: "Please specify a user to warn.",
      };
    }

    return {
      success: true,
      type: "action",
      message: `@${user} has been warned.`,
      effects: [
        {
          type: "warn_user",
          payload: {
            channelId: context.channelId,
            username: user,
            reason,
          },
        },
      ],
    };
  },

  slowmode: (args, context) => {
    if (!context.channelId) {
      return {
        success: false,
        type: "error",
        error: "This command must be used in a channel.",
      };
    }

    const interval = args.interval?.value as string;
    const intervalMs = args.interval?.rawValue
      ? parseDurationToMs(args.interval.rawValue)
      : 30000; // Default 30 seconds

    return {
      success: true,
      type: "action",
      message: interval
        ? `Slow mode enabled (${interval} between messages).`
        : "Slow mode enabled (30 seconds between messages).",
      effects: [
        {
          type: "set_slowmode",
          payload: {
            channelId: context.channelId,
            intervalMs,
          },
        },
      ],
    };
  },

  // -------------------------------------------------------------------------
  // Utility Commands
  // -------------------------------------------------------------------------
  remind: (args) => {
    const time = args.time?.value as string;
    const message = args.message?.value as string;
    const triggerMs = args.time?.rawValue
      ? parseDurationToMs(args.time.rawValue)
      : undefined;

    if (!time || !triggerMs) {
      return {
        success: false,
        type: "error",
        error: "Please specify when to remind you.",
      };
    }

    if (!message) {
      return {
        success: false,
        type: "error",
        error: "Please specify what to remind you about.",
      };
    }

    return {
      success: true,
      type: "action",
      message: `Reminder set for ${time}.`,
      data: {
        reminder: {
          message,
          triggerAt: Date.now() + triggerMs,
        },
      },
      effects: [
        {
          type: "set_reminder",
          payload: {
            message,
            triggerAt: Date.now() + triggerMs,
          },
        },
      ],
    };
  },

  search: (args) => {
    const query = args.query?.value as string;
    if (!query) {
      return {
        success: false,
        type: "error",
        error: "Please specify a search query.",
      };
    }

    return {
      success: true,
      type: "navigation",
      data: {
        modal: {
          type: "search",
          data: { query },
        },
      },
      effects: [
        {
          type: "open_modal",
          payload: { type: "search", query },
        },
      ],
    };
  },

  shortcuts: () => {
    return {
      success: true,
      type: "modal",
      data: {
        modal: {
          type: "keyboard-shortcuts",
        },
      },
      effects: [
        {
          type: "open_modal",
          payload: { type: "keyboard-shortcuts" },
        },
      ],
    };
  },

  help: (args) => {
    const command = args.command?.value as string | undefined;

    return {
      success: true,
      type: "modal",
      data: {
        modal: {
          type: "command-help",
          data: { command },
        },
      },
      effects: [
        {
          type: "open_modal",
          payload: { type: "command-help", command },
        },
      ],
    };
  },

  collapse: () => {
    return {
      success: true,
      type: "action",
      message: "All media collapsed.",
      effects: [
        {
          type: "collapse_media",
          payload: {},
        },
      ],
    };
  },

  expand: () => {
    return {
      success: true,
      type: "action",
      message: "All media expanded.",
      effects: [
        {
          type: "expand_media",
          payload: {},
        },
      ],
    };
  },

  // -------------------------------------------------------------------------
  // Navigation Commands
  // -------------------------------------------------------------------------
  open: (args) => {
    const channel = args.channel?.value as string;
    if (!channel) {
      return {
        success: false,
        type: "error",
        error: "Please specify a channel to open.",
      };
    }

    return {
      success: true,
      type: "navigation",
      data: {
        navigateTo: `/chat/channel/${channel}`,
      },
      effects: [
        {
          type: "navigate",
          payload: { to: `/chat/channel/${channel}` },
        },
      ],
    };
  },

  dm: (args) => {
    const user = args.user?.value as string;
    if (!user) {
      return {
        success: false,
        type: "error",
        error: "Please specify a user to message.",
      };
    }

    return {
      success: true,
      type: "navigation",
      data: {
        navigateTo: `/chat/dm/${user}`,
      },
      effects: [
        {
          type: "navigate",
          payload: { to: `/chat/dm/${user}` },
        },
      ],
    };
  },

  settings: () => {
    return {
      success: true,
      type: "navigation",
      data: {
        navigateTo: "/settings",
      },
      effects: [
        {
          type: "navigate",
          payload: { to: "/settings" },
        },
      ],
    };
  },

  // -------------------------------------------------------------------------
  // Media Commands (require API calls - return preview/placeholder)
  // -------------------------------------------------------------------------
  giphy: (args) => {
    const query = args.query?.value as string;
    if (!query) {
      return {
        success: false,
        type: "error",
        error: "Please specify a search term.",
      };
    }

    // Return preview type - actual GIF search will be handled by UI
    return {
      success: true,
      type: "preview",
      message: "Select a GIF to send.",
      data: {
        preview: {
          title: "Search GIPHY",
          content: `Searching for "${query}"...`,
          confirmLabel: "Send",
          cancelLabel: "Cancel",
        },
        searchQuery: query,
        searchType: "giphy",
      },
    };
  },

  poll: (args) => {
    const question = args.question?.value as string;
    const options = args.options?.value as string[] | undefined;

    if (!question) {
      return {
        success: false,
        type: "error",
        error: "Please provide a poll question.",
      };
    }

    if (!options || options.length < 2) {
      return {
        success: false,
        type: "error",
        error: "Please provide at least 2 poll options.",
      };
    }

    return {
      success: true,
      type: "preview",
      data: {
        poll: {
          question,
          options,
        },
        preview: {
          title: "Create Poll",
          content: `Question: ${question}\nOptions: ${options.join(", ")}`,
          confirmLabel: "Create Poll",
          cancelLabel: "Cancel",
        },
      },
    };
  },
};

// ============================================================================
// Main Executor Function
// ============================================================================

/**
 * Execute a parsed command
 */
export async function executeCommand(
  parsed: ParsedCommand,
  context: CommandContext,
): Promise<CommandResult> {
  // Check if command is valid
  if (!parsed.valid || !parsed.command) {
    return {
      success: false,
      type: "error",
      error: parsed.errors[0]?.message || "Invalid command.",
    };
  }

  const commandName = parsed.commandName;
  const handler = commandHandlers[commandName];

  if (!handler) {
    return {
      success: false,
      type: "error",
      error: `Command handler not implemented: /${commandName}`,
    };
  }

  try {
    const result = await handler(parsed.namedArgs, context);
    return result;
  } catch (error) {
    logger.error(`Error executing command /${commandName}:`, error);
    return {
      success: false,
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred.",
    };
  }
}

/**
 * Register a custom command handler
 */
export function registerCommandHandler(
  commandName: string,
  handler: CommandHandler,
): void {
  commandHandlers[commandName] = handler;
}

/**
 * Unregister a command handler
 */
export function unregisterCommandHandler(commandName: string): void {
  delete commandHandlers[commandName];
}

/**
 * Check if a command handler is registered
 */
export function hasCommandHandler(commandName: string): boolean {
  return commandName in commandHandlers;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse duration string to milliseconds
 */
function parseDurationToMs(input: string): number | undefined {
  const match = input.match(
    /^(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days|w|week|weeks)$/i,
  );
  if (!match) return undefined;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    sec: 1000,
    second: 1000,
    seconds: 1000,
    m: 60 * 1000,
    min: 60 * 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    h: 60 * 60 * 1000,
    hr: 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit] || 1000);
}
