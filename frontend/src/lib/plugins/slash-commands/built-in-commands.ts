/**
 * Built-in System Commands for the Plugin Command Engine
 *
 * These commands are registered by default and cannot be overridden by apps.
 * They provide core platform functionality: help, moderation, channel management, etc.
 */

import type {
  PluginCommand,
  CommandExecutionContext,
  CommandHandlerResult,
  PluginArgSchema,
  UserRole,
  ChannelType,
} from "./types";
import type { CommandRegistry } from "./command-registry";

// ============================================================================
// HELPER: Create a built-in command definition (without id/qualifiedName)
// ============================================================================

type BuiltInDef = Omit<PluginCommand, "id" | "qualifiedName">;

function builtIn(
  name: string,
  description: string,
  handler: (ctx: CommandExecutionContext) => Promise<CommandHandlerResult>,
  options: {
    helpText?: string;
    usage?: string;
    args?: PluginArgSchema[];
    requiredRole?: UserRole;
    allowedChannelTypes?: ChannelType[];
  } = {},
): BuiltInDef {
  return {
    appId: "",
    name,
    description,
    helpText: options.helpText,
    usage: options.usage || `/${name}`,
    args: options.args || [],
    requiredRole: options.requiredRole || "member",
    requiredScopes: [],
    allowedChannelTypes: options.allowedChannelTypes || [
      "public",
      "private",
      "direct",
      "group",
    ],
    isBuiltIn: true,
    enabled: true,
    handler,
  };
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

async function helpHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const commandName = ctx.args.command as string | undefined;
  if (commandName) {
    return {
      success: true,
      message: `Help for /${commandName}: Use /help to see all commands.`,
      visibility: "ephemeral",
    };
  }
  return {
    success: true,
    message:
      "Available commands: /help, /mute, /unmute, /kick, /ban, /unban, /topic, /invite, /leave, /pin, /unpin, /clear, /slow, /nick, /me, /shrug",
    visibility: "ephemeral",
  };
}

async function muteHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const duration = ctx.args.duration as number | undefined;
  return {
    success: true,
    message: duration
      ? `Channel muted for ${duration} minutes`
      : "Channel muted",
    visibility: "ephemeral",
  };
}

async function unmuteHandler(): Promise<CommandHandlerResult> {
  return {
    success: true,
    message: "Channel unmuted",
    visibility: "ephemeral",
  };
}

async function kickHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const user = ctx.args.user as string;
  const reason = ctx.args.reason as string | undefined;
  return {
    success: true,
    message: `${user} has been kicked${reason ? `: ${reason}` : ""}`,
    visibility: "channel",
    data: { action: "kick", user, reason },
  };
}

async function banHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const user = ctx.args.user as string;
  const reason = ctx.args.reason as string | undefined;
  return {
    success: true,
    message: `${user} has been banned${reason ? `: ${reason}` : ""}`,
    visibility: "channel",
    data: { action: "ban", user, reason },
  };
}

async function unbanHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const user = ctx.args.user as string;
  return {
    success: true,
    message: `${user} has been unbanned`,
    visibility: "ephemeral",
    data: { action: "unban", user },
  };
}

async function topicHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const topic = ctx.args.text as string | undefined;
  return {
    success: true,
    message: topic ? `Channel topic set to: ${topic}` : "Channel topic cleared",
    visibility: "channel",
    data: { action: "set_topic", topic },
  };
}

async function inviteHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const user = ctx.args.user as string;
  return {
    success: true,
    message: `${user} has been invited to the channel`,
    visibility: "channel",
    data: { action: "invite", user },
  };
}

async function leaveHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  return {
    success: true,
    message: `You left the channel`,
    visibility: "ephemeral",
    data: { action: "leave", channelId: ctx.channelId },
  };
}

async function pinHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const messageId = ctx.args.message_id as string;
  return {
    success: true,
    message: `Message pinned`,
    visibility: "channel",
    data: { action: "pin", messageId },
  };
}

async function unpinHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const messageId = ctx.args.message_id as string;
  return {
    success: true,
    message: `Message unpinned`,
    visibility: "channel",
    data: { action: "unpin", messageId },
  };
}

async function clearHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const count = ctx.args.count as number;
  return {
    success: true,
    message: `Cleared ${count} messages`,
    visibility: "ephemeral",
    data: { action: "clear", count },
  };
}

async function slowHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const seconds = ctx.args.seconds as number;
  if (seconds === 0) {
    return {
      success: true,
      message: "Slow mode disabled",
      visibility: "channel",
      data: { action: "slow_mode", seconds: 0 },
    };
  }
  return {
    success: true,
    message: `Slow mode enabled: ${seconds}s between messages`,
    visibility: "channel",
    data: { action: "slow_mode", seconds },
  };
}

async function nickHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const newNick = ctx.args.nickname as string;
  return {
    success: true,
    message: `Nickname changed to ${newNick}`,
    visibility: "ephemeral",
    data: { action: "set_nick", nickname: newNick },
  };
}

async function meHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const action = ctx.args.action as string;
  return {
    success: true,
    message: `_${ctx.username} ${action}_`,
    visibility: "channel",
  };
}

async function shrugHandler(
  ctx: CommandExecutionContext,
): Promise<CommandHandlerResult> {
  const message = ctx.args.message as string | undefined;
  const shrug = "\u00AF\\_(\u30C4)_/\u00AF";
  return {
    success: true,
    message: message ? `${message} ${shrug}` : shrug,
    visibility: "channel",
  };
}

// ============================================================================
// BUILT-IN COMMAND DEFINITIONS
// ============================================================================

const BUILT_IN_DEFINITIONS: BuiltInDef[] = [
  builtIn("help", "Show available commands and help information", helpHandler, {
    helpText:
      "Displays a list of all available slash commands. Use /help [command] for details.",
    usage: "/help [command]",
    args: [
      {
        name: "command",
        description: "Command to get help for",
        type: "string",
        required: false,
      },
    ],
    requiredRole: "guest",
  }),

  builtIn("mute", "Mute notifications for this channel", muteHandler, {
    helpText: "Mutes notifications from the current channel.",
    usage: "/mute [duration]",
    args: [
      {
        name: "duration",
        description: "Duration in minutes",
        type: "number",
        required: false,
      },
    ],
  }),

  builtIn("unmute", "Unmute notifications for this channel", unmuteHandler, {
    helpText: "Unmutes notifications from the current channel.",
    usage: "/unmute",
  }),

  builtIn("kick", "Remove a user from this channel", kickHandler, {
    helpText: "Removes the specified user from the current channel.",
    usage: "/kick @user [reason]",
    args: [
      {
        name: "user",
        description: "User to kick",
        type: "user",
        required: true,
      },
      {
        name: "reason",
        description: "Reason for kick",
        type: "string",
        required: false,
      },
    ],
    requiredRole: "moderator",
    allowedChannelTypes: ["public", "private", "group"],
  }),

  builtIn("ban", "Ban a user from this channel", banHandler, {
    helpText: "Bans the specified user from the current channel.",
    usage: "/ban @user [reason]",
    args: [
      {
        name: "user",
        description: "User to ban",
        type: "user",
        required: true,
      },
      {
        name: "reason",
        description: "Reason for ban",
        type: "string",
        required: false,
      },
    ],
    requiredRole: "admin",
    allowedChannelTypes: ["public", "private", "group"],
  }),

  builtIn("unban", "Remove a ban from a user", unbanHandler, {
    helpText: "Removes the ban from the specified user.",
    usage: "/unban @user",
    args: [
      {
        name: "user",
        description: "User to unban",
        type: "user",
        required: true,
      },
    ],
    requiredRole: "admin",
    allowedChannelTypes: ["public", "private", "group"],
  }),

  builtIn("topic", "Set the channel topic", topicHandler, {
    helpText: "Sets or clears the topic for the current channel.",
    usage: "/topic [text]",
    args: [
      {
        name: "text",
        description: "New channel topic",
        type: "string",
        required: false,
        maxLength: 250,
      },
    ],
    requiredRole: "moderator",
    allowedChannelTypes: ["public", "private"],
  }),

  builtIn("invite", "Invite a user to this channel", inviteHandler, {
    helpText: "Invites the specified user to the current channel.",
    usage: "/invite @user",
    args: [
      {
        name: "user",
        description: "User to invite",
        type: "user",
        required: true,
      },
    ],
    allowedChannelTypes: ["public", "private", "group"],
  }),

  builtIn("leave", "Leave the current channel", leaveHandler, {
    helpText: "Removes you from the current channel.",
    usage: "/leave",
    allowedChannelTypes: ["public", "private", "group"],
  }),

  builtIn("pin", "Pin a message", pinHandler, {
    helpText: "Pins the specified message to the channel.",
    usage: "/pin <message_id>",
    args: [
      {
        name: "message_id",
        description: "ID of message to pin",
        type: "string",
        required: true,
      },
    ],
    requiredRole: "moderator",
  }),

  builtIn("unpin", "Unpin a message", unpinHandler, {
    helpText: "Unpins the specified message from the channel.",
    usage: "/unpin <message_id>",
    args: [
      {
        name: "message_id",
        description: "ID of message to unpin",
        type: "string",
        required: true,
      },
    ],
    requiredRole: "moderator",
  }),

  builtIn("clear", "Delete recent messages", clearHandler, {
    helpText: "Deletes the specified number of recent messages.",
    usage: "/clear <count>",
    args: [
      {
        name: "count",
        description: "Number of messages (1-100)",
        type: "number",
        required: true,
        min: 1,
        max: 100,
      },
    ],
    requiredRole: "admin",
  }),

  builtIn("slow", "Enable slow mode", slowHandler, {
    helpText: "Limits how often users can send messages. Use 0 to disable.",
    usage: "/slow <seconds>",
    args: [
      {
        name: "seconds",
        description: "Seconds between messages (0 to disable)",
        type: "number",
        required: true,
        min: 0,
        max: 3600,
      },
    ],
    requiredRole: "moderator",
    allowedChannelTypes: ["public", "private"],
  }),

  builtIn("nick", "Change your display name", nickHandler, {
    helpText: "Changes your nickname in this channel.",
    usage: "/nick <nickname>",
    args: [
      {
        name: "nickname",
        description: "New nickname",
        type: "string",
        required: true,
        minLength: 1,
        maxLength: 32,
      },
    ],
  }),

  builtIn("me", "Send an action message", meHandler, {
    helpText: "Sends a message describing an action you are performing.",
    usage: "/me <action>",
    args: [
      {
        name: "action",
        description: "Action description",
        type: "string",
        required: true,
      },
    ],
    requiredRole: "guest",
  }),

  builtIn("shrug", "Send a shrug emoticon", shrugHandler, {
    helpText: "Sends the shrug emoticon with an optional message.",
    usage: "/shrug [message]",
    args: [
      {
        name: "message",
        description: "Optional message",
        type: "string",
        required: false,
      },
    ],
    requiredRole: "guest",
  }),
];

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Register all built-in commands into a registry.
 */
export function registerBuiltInCommands(
  registry: CommandRegistry,
): PluginCommand[] {
  const registered: PluginCommand[] = [];
  for (const def of BUILT_IN_DEFINITIONS) {
    const cmd = registry.register(def);
    registered.push(cmd);
  }
  return registered;
}

/**
 * Get the list of built-in command definitions (for testing/inspection).
 */
export function getBuiltInDefinitions(): BuiltInDef[] {
  return [...BUILT_IN_DEFINITIONS];
}

/**
 * Get built-in command names.
 */
export function getBuiltInCommandNames(): string[] {
  return BUILT_IN_DEFINITIONS.map((d) => d.name);
}
