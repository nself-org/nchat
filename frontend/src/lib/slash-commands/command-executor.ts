/**
 * Command Executor
 *
 * Executes parsed commands and handles their actions
 */

import type {
  SlashCommand,
  CommandContext,
  CommandResult,
  CommandResponse,
  CommandSideEffect,
  ParsedCommand,
  CommandArgValue,
} from "./command-types";

import { parseCommand, argsToObject } from "./command-parser";
import { logger } from "@/lib/logger";
import {
  getCommandByTrigger,
  canUserUseCommand,
  canUseCommandInChannel,
} from "./command-registry";

// ============================================================================
// Built-in Action Handlers
// ============================================================================

type BuiltInHandler = (
  context: CommandContext,
  parsed: ParsedCommand,
) => Promise<CommandResult>;

const builtInHandlers: Record<string, BuiltInHandler> = {
  help: handleHelp,
  shortcuts: handleShortcuts,
  away: handleAway,
  active: handleActive,
  status: handleStatus,
  dnd: handleDnd,
  mute: handleMute,
  unmute: handleUnmute,
  invite: handleInvite,
  leave: handleLeave,
  topic: handleTopic,
  rename: handleRename,
  archive: handleArchive,
  remind: handleRemind,
  poll: handlePoll,
  search: handleSearch,
  giphy: handleGiphy,
  shrug: handleTextEmoji,
  tableflip: handleTextEmoji,
  unflip: handleTextEmoji,
  me: handleMe,
  dm: handleDm,
  apps: handleApps,
  settings: handleSettings,
  feedback: handleFeedback,
  kick: handleKick,
  ban: handleBan,
  unban: handleUnban,
  slow: handleSlow,
  clear: handleClear,
};

// ============================================================================
// Main Executor
// ============================================================================

/**
 * Execute a slash command
 */
export async function executeCommand(
  input: string,
  context: Omit<CommandContext, "args" | "flags" | "rawInput" | "timestamp">,
): Promise<CommandResult> {
  // Extract trigger
  const triggerMatch = input.trim().match(/^\/(\S+)/);
  if (!triggerMatch) {
    return {
      success: false,
      error: "Invalid command format",
    };
  }

  const trigger = triggerMatch[1].toLowerCase();

  // Find command
  const command = getCommandByTrigger(trigger);
  if (!command) {
    return {
      success: false,
      error: `Unknown command: /${trigger}. Type /help for a list of commands.`,
    };
  }

  // Check if command is enabled
  if (!command.isEnabled) {
    return {
      success: false,
      error: `Command /${trigger} is currently disabled.`,
    };
  }

  // Check user permissions
  const userCheck = canUserUseCommand(
    command,
    context.userRole,
    context.userId,
  );
  if (!userCheck.allowed) {
    return {
      success: false,
      error: userCheck.reason || "Permission denied",
    };
  }

  // Check channel permissions
  const channelCheck = canUseCommandInChannel(
    command,
    context.channelId,
    context.channelType,
    !!context.threadId,
  );
  if (!channelCheck.allowed) {
    return {
      success: false,
      error: channelCheck.reason || "Command not available here",
    };
  }

  // Parse arguments
  const parsed = parseCommand(input, command);
  if (!parsed.isValid) {
    const errorMessages = parsed.errors.map((e) => e.message).join("\n");
    return {
      success: false,
      error: `Invalid arguments:\n${errorMessages}\n\nUsage: ${command.usage || `/${command.trigger}`}`,
    };
  }

  // Build full context
  const fullContext: CommandContext = {
    ...context,
    rawInput: input.slice(triggerMatch[0].length).trim(),
    args: parsed.args.map((a) => a.value),
    flags: Object.fromEntries(
      Object.entries(parsed.flags).map(([k, v]) => [k, v.value]),
    ),
    timestamp: new Date(),
  };

  // Execute based on action type
  try {
    return await executeAction(command, fullContext, parsed);
  } catch (error) {
    logger.error("Command execution error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An error occurred while executing the command",
    };
  }
}

/**
 * Execute command action
 */
async function executeAction(
  command: SlashCommand,
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  switch (command.actionType) {
    case "builtin":
      return executeBuiltIn(command, context, parsed);

    case "message":
      return executeMessage(command, context, parsed);

    case "status":
      return executeStatus(command, context, parsed);

    case "navigate":
      return executeNavigate(command, context, parsed);

    case "modal":
      return executeModal(command, context, parsed);

    case "api":
      return executeApi(command, context, parsed);

    case "webhook":
      return executeWebhook(command, context, parsed);

    case "workflow":
      return executeWorkflow(command, context, parsed);

    case "custom":
      return executeCustom(command, context, parsed);

    default:
      return {
        success: false,
        error: `Unknown action type: ${command.actionType}`,
      };
  }
}

// ============================================================================
// Action Executors
// ============================================================================

/**
 * Execute built-in command handler
 */
async function executeBuiltIn(
  command: SlashCommand,
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const handler = builtInHandlers[command.action.handler || command.trigger];
  if (!handler) {
    return {
      success: false,
      error: `No handler found for built-in command: ${command.trigger}`,
    };
  }

  return handler(context, parsed);
}

/**
 * Execute message action
 */
async function executeMessage(
  command: SlashCommand,
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const template = command.action.message || command.responseConfig.template;
  if (!template) {
    return {
      success: false,
      error: "No message template configured",
    };
  }

  const content = interpolateTemplate(template, context, parsed);

  return {
    success: true,
    response: {
      type: command.responseConfig.type,
      content,
      ephemeral: command.responseConfig.ephemeral,
    },
  };
}

/**
 * Execute status action
 */
async function executeStatus(
  command: SlashCommand,
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const statusConfig = command.action.status;
  if (!statusConfig) {
    return {
      success: false,
      error: "No status configuration",
    };
  }

  return {
    success: true,
    response: {
      type: "notification",
      content: `Status set to: ${statusConfig.text}`,
      ephemeral: true,
    },
    sideEffects: [
      {
        type: "update_status",
        payload: {
          userId: context.userId,
          text: interpolateTemplate(statusConfig.text, context, parsed),
          emoji: statusConfig.emoji,
          expiry: statusConfig.expiry,
        },
      },
    ],
  };
}

/**
 * Execute navigate action
 */
async function executeNavigate(
  command: SlashCommand,
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const navConfig = command.action.navigate;
  if (!navConfig) {
    return {
      success: false,
      error: "No navigation configuration",
    };
  }

  const url = interpolateTemplate(navConfig.url, context, parsed);

  return {
    success: true,
    sideEffects: [
      {
        type: "navigate",
        payload: {
          url,
          newTab: navConfig.newTab,
        },
      },
    ],
  };
}

/**
 * Execute modal action
 */
async function executeModal(
  command: SlashCommand,
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const modalConfig = command.action.modal;
  if (!modalConfig) {
    return {
      success: false,
      error: "No modal configuration",
    };
  }

  return {
    success: true,
    sideEffects: [
      {
        type: "open_modal",
        payload: {
          component: modalConfig.component,
          props: {
            ...modalConfig.props,
            context,
            args: argsToObject(parsed),
          },
        },
      },
    ],
  };
}

/**
 * Execute API action
 */
async function executeApi(
  command: SlashCommand,
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const apiConfig = command.action.api;
  if (!apiConfig) {
    return {
      success: false,
      error: "No API configuration",
    };
  }

  try {
    const response = await fetch(apiConfig.endpoint, {
      method: apiConfig.method || "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...apiConfig.body,
        context,
        args: argsToObject(parsed),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "API request failed");
    }

    return {
      success: true,
      response: {
        type: command.responseConfig.type,
        content: data.message || "Success",
        ephemeral: command.responseConfig.ephemeral,
      },
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "API request failed",
    };
  }
}

/**
 * Execute webhook action
 */
async function executeWebhook(
  command: SlashCommand,
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const webhookConfig = command.webhook;
  if (!webhookConfig) {
    return {
      success: false,
      error: "No webhook configuration",
    };
  }

  try {
    const body = webhookConfig.bodyTemplate
      ? interpolateTemplate(webhookConfig.bodyTemplate, context, parsed)
      : JSON.stringify({
          command: command.trigger,
          context,
          args: argsToObject(parsed),
        });

    const response = await fetch(webhookConfig.url, {
      method: webhookConfig.method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...webhookConfig.headers,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }

    const data = await response.json();

    // Map response using configured paths
    let message = "Webhook executed successfully";
    if (webhookConfig.responseMapping?.messagePath) {
      const mappedMessage = getNestedValue(
        data,
        webhookConfig.responseMapping.messagePath,
      );
      if (typeof mappedMessage === "string") {
        message = mappedMessage;
      }
    }

    return {
      success: true,
      response: {
        type: command.responseConfig.type,
        content: message,
        ephemeral: command.responseConfig.ephemeral,
      },
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Webhook request failed",
    };
  }
}

/**
 * Execute workflow action
 */
async function executeWorkflow(
  command: SlashCommand,
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const workflowConfig = command.workflow;
  if (!workflowConfig) {
    return {
      success: false,
      error: "No workflow configuration",
    };
  }

  // Build workflow input from mapping
  const input: Record<string, unknown> = {};
  if (workflowConfig.inputMapping) {
    const args = argsToObject(parsed);
    for (const [key, argKey] of Object.entries(workflowConfig.inputMapping)) {
      input[key] = args[argKey] ?? context[argKey as keyof CommandContext];
    }
  }

  return {
    success: true,
    response: {
      type: "notification",
      content: "Workflow triggered",
      ephemeral: true,
    },
    sideEffects: [
      {
        type: "workflow",
        payload: {
          workflowId: workflowConfig.workflowId,
          input,
          waitForCompletion: workflowConfig.waitForCompletion,
        },
      },
    ],
  };
}

/**
 * Execute custom JavaScript action (sandboxed)
 */
async function executeCustom(
  command: SlashCommand,
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  // Custom JavaScript execution would need to be sandboxed
  // This is a placeholder - real implementation would use a sandbox
  return {
    success: false,
    error: "Custom JavaScript execution is not yet implemented",
  };
}

// ============================================================================
// Built-in Command Handlers
// ============================================================================

async function handleHelp(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const commandName = parsed.args[0]?.value as string | undefined;

  if (commandName) {
    const cmd = getCommandByTrigger(commandName);
    if (cmd) {
      return {
        success: true,
        response: {
          type: "ephemeral",
          content: `**/${cmd.trigger}** - ${cmd.description}\n\nUsage: \`${cmd.usage || `/${cmd.trigger}`}\`\n\n${cmd.helpText || ""}`,
          ephemeral: true,
        },
      };
    } else {
      return {
        success: false,
        error: `Unknown command: /${commandName}`,
      };
    }
  }

  // Return general help
  return {
    success: true,
    sideEffects: [
      {
        type: "open_modal",
        payload: {
          component: "CommandHelpModal",
          props: {},
        },
      },
    ],
  };
}

async function handleShortcuts(): Promise<CommandResult> {
  return {
    success: true,
    sideEffects: [
      {
        type: "open_modal",
        payload: {
          component: "KeyboardShortcutsModal",
          props: {},
        },
      },
    ],
  };
}

async function handleAway(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const message = parsed.args[0]?.value as string | undefined;

  return {
    success: true,
    response: {
      type: "notification",
      content: "You are now away" + (message ? `: ${message}` : ""),
      ephemeral: true,
    },
    sideEffects: [
      {
        type: "update_status",
        payload: {
          userId: context.userId,
          status: "away",
          message,
        },
      },
    ],
  };
}

async function handleActive(context: CommandContext): Promise<CommandResult> {
  return {
    success: true,
    response: {
      type: "notification",
      content: "You are now active",
      ephemeral: true,
    },
    sideEffects: [
      {
        type: "update_status",
        payload: {
          userId: context.userId,
          status: "online",
        },
      },
    ],
  };
}

async function handleStatus(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const message = parsed.args[0]?.value as string;
  const emoji = parsed.flags.emoji?.value as string | undefined;
  const duration = parsed.flags.duration?.value as number | undefined;

  return {
    success: true,
    response: {
      type: "notification",
      content: `Status updated: ${emoji || ""} ${message}`,
      ephemeral: true,
    },
    sideEffects: [
      {
        type: "update_status",
        payload: {
          userId: context.userId,
          text: message,
          emoji,
          expiresAt: duration
            ? new Date(Date.now() + duration).toISOString()
            : undefined,
        },
      },
    ],
  };
}

async function handleDnd(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const duration = (parsed.args[0]?.value as number) || -1; // -1 = indefinite

  return {
    success: true,
    response: {
      type: "notification",
      content:
        duration > 0
          ? `Do Not Disturb enabled for ${formatDuration(duration)}`
          : "Do Not Disturb enabled",
      ephemeral: true,
    },
    sideEffects: [
      {
        type: "update_status",
        payload: {
          userId: context.userId,
          status: "dnd",
          expiresAt:
            duration > 0
              ? new Date(Date.now() + duration).toISOString()
              : undefined,
        },
      },
    ],
  };
}

async function handleMute(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const duration = (parsed.args[0]?.value as number) || -1;

  return {
    success: true,
    response: {
      type: "notification",
      content:
        duration > 0
          ? `Channel muted for ${formatDuration(duration)}`
          : "Channel muted",
      ephemeral: true,
    },
    sideEffects: [
      {
        type: "notification",
        payload: {
          action: "mute_channel",
          channelId: context.channelId,
          userId: context.userId,
          duration,
        },
      },
    ],
  };
}

async function handleUnmute(context: CommandContext): Promise<CommandResult> {
  return {
    success: true,
    response: {
      type: "notification",
      content: "Channel unmuted",
      ephemeral: true,
    },
    sideEffects: [
      {
        type: "notification",
        payload: {
          action: "unmute_channel",
          channelId: context.channelId,
          userId: context.userId,
        },
      },
    ],
  };
}

async function handleInvite(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const users = parsed.args[0]?.value as string;

  return {
    success: true,
    response: {
      type: "message",
      content: `Invited ${users} to the channel`,
      isSystem: true,
    },
    sideEffects: [
      {
        type: "workflow",
        payload: {
          action: "invite_users",
          channelId: context.channelId,
          users: users.split(/\s+/).map((u) => u.replace("@", "")),
          invitedBy: context.userId,
        },
      },
    ],
  };
}

async function handleLeave(context: CommandContext): Promise<CommandResult> {
  return {
    success: true,
    response: {
      type: "notification",
      content: `You left #${context.channelName}`,
      ephemeral: true,
    },
    sideEffects: [
      {
        type: "workflow",
        payload: {
          action: "leave_channel",
          channelId: context.channelId,
          userId: context.userId,
        },
      },
      {
        type: "navigate",
        payload: {
          url: "/chat",
        },
      },
    ],
  };
}

async function handleTopic(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const topic = (parsed.args[0]?.value as string) || "";

  return {
    success: true,
    response: {
      type: "message",
      content: topic
        ? `${context.displayName} set the channel topic: ${topic}`
        : `${context.displayName} cleared the channel topic`,
      isSystem: true,
    },
    sideEffects: [
      {
        type: "workflow",
        payload: {
          action: "set_topic",
          channelId: context.channelId,
          topic,
          userId: context.userId,
        },
      },
    ],
  };
}

async function handleRename(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const newName = parsed.args[0]?.value as string;

  return {
    success: true,
    response: {
      type: "message",
      content: `${context.displayName} renamed the channel to #${newName}`,
      isSystem: true,
    },
    sideEffects: [
      {
        type: "workflow",
        payload: {
          action: "rename_channel",
          channelId: context.channelId,
          newName,
          userId: context.userId,
        },
      },
    ],
  };
}

async function handleArchive(context: CommandContext): Promise<CommandResult> {
  return {
    success: true,
    response: {
      type: "message",
      content: `${context.displayName} archived this channel`,
      isSystem: true,
    },
    sideEffects: [
      {
        type: "workflow",
        payload: {
          action: "archive_channel",
          channelId: context.channelId,
          userId: context.userId,
        },
      },
    ],
  };
}

async function handleRemind(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const when = parsed.args[0]?.value as string;
  const message = parsed.args[1]?.value as string;

  return {
    success: true,
    response: {
      type: "notification",
      content: `Reminder set for ${when}`,
      ephemeral: true,
    },
    sideEffects: [
      {
        type: "workflow",
        payload: {
          action: "create_reminder",
          userId: context.userId,
          channelId: context.channelId,
          when,
          message,
        },
      },
    ],
  };
}

async function handlePoll(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const question = parsed.args[0]?.value as string;
  const optionsRaw = parsed.args[1]?.value as string;
  const options =
    optionsRaw?.match(/"([^"]+)"/g)?.map((o) => o.replace(/"/g, "")) || [];

  if (options.length < 2) {
    return {
      success: false,
      error:
        'Poll requires at least 2 options. Use format: /poll "Question" "Option 1" "Option 2"',
    };
  }

  return {
    success: true,
    sideEffects: [
      {
        type: "workflow",
        payload: {
          action: "create_poll",
          userId: context.userId,
          channelId: context.channelId,
          question,
          options,
        },
      },
    ],
  };
}

async function handleSearch(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const query = parsed.args[0]?.value as string;
  const from = parsed.flags.from?.value as string | undefined;
  const before = parsed.flags.before?.value as string | undefined;
  const after = parsed.flags.after?.value as string | undefined;

  return {
    success: true,
    sideEffects: [
      {
        type: "open_modal",
        payload: {
          component: "SearchResults",
          props: {
            query,
            channelId: context.channelId,
            filters: { from, before, after },
          },
        },
      },
    ],
  };
}

async function handleGiphy(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const query = parsed.args[0]?.value as string;

  return {
    success: true,
    sideEffects: [
      {
        type: "open_modal",
        payload: {
          component: "GiphyPicker",
          props: {
            query,
            channelId: context.channelId,
          },
        },
      },
    ],
  };
}

async function handleTextEmoji(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const command = parsed.command;
  const message = (parsed.args[0]?.value as string) || "";

  const emojis: Record<string, string> = {
    shrug: "\u00AF\\_(\u30C4)_/\u00AF",
    tableflip: "(\u256F\u00B0\u25A1\u00B0)\u256F\uFE35 \u253B\u2501\u253B",
    unflip: "\u252C\u2500\u2500\u252C\u30CE( \u309C-\u309C\u30CE)",
  };

  const emoji = emojis[command.trigger] || "";
  const content = message ? `${message} ${emoji}` : emoji;

  return {
    success: true,
    response: {
      type: "message",
      content,
      ephemeral: false,
    },
  };
}

async function handleMe(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const action = parsed.args[0]?.value as string;

  return {
    success: true,
    response: {
      type: "message",
      content: `_${context.displayName} ${action}_`,
      ephemeral: false,
    },
  };
}

async function handleDm(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const user = (parsed.args[0]?.value as string).replace("@", "");
  const message = parsed.args[1]?.value as string | undefined;

  return {
    success: true,
    sideEffects: [
      {
        type: "navigate",
        payload: {
          url: `/chat/dm/${user}`,
        },
      },
      ...(message
        ? [
            {
              type: "workflow" as const,
              payload: {
                action: "send_dm",
                toUser: user,
                message,
              },
            },
          ]
        : []),
    ],
  };
}

async function handleApps(): Promise<CommandResult> {
  return {
    success: true,
    sideEffects: [
      {
        type: "navigate",
        payload: {
          url: "/apps",
        },
      },
    ],
  };
}

async function handleSettings(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const section = (parsed.args[0]?.value as string) || "";

  return {
    success: true,
    sideEffects: [
      {
        type: "navigate",
        payload: {
          url: `/settings${section ? `/${section}` : ""}`,
        },
      },
    ],
  };
}

async function handleFeedback(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const message = parsed.args[0]?.value as string | undefined;

  return {
    success: true,
    sideEffects: [
      {
        type: "open_modal",
        payload: {
          component: "FeedbackModal",
          props: {
            prefill: message,
          },
        },
      },
    ],
  };
}

async function handleKick(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const user = (parsed.args[0]?.value as string).replace("@", "");
  const reason = parsed.args[1]?.value as string | undefined;

  return {
    success: true,
    response: {
      type: "message",
      content: `${user} has been removed from the channel${reason ? `: ${reason}` : ""}`,
      isSystem: true,
    },
    sideEffects: [
      {
        type: "workflow",
        payload: {
          action: "kick_user",
          channelId: context.channelId,
          userId: user,
          kickedBy: context.userId,
          reason,
        },
      },
    ],
  };
}

async function handleBan(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const user = (parsed.args[0]?.value as string).replace("@", "");
  const reason = parsed.args[1]?.value as string | undefined;

  return {
    success: true,
    response: {
      type: "message",
      content: `${user} has been banned from the channel${reason ? `: ${reason}` : ""}`,
      isSystem: true,
    },
    sideEffects: [
      {
        type: "workflow",
        payload: {
          action: "ban_user",
          channelId: context.channelId,
          userId: user,
          bannedBy: context.userId,
          reason,
        },
      },
    ],
  };
}

async function handleUnban(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const user = (parsed.args[0]?.value as string).replace("@", "");

  return {
    success: true,
    response: {
      type: "notification",
      content: `${user} has been unbanned`,
      ephemeral: true,
    },
    sideEffects: [
      {
        type: "workflow",
        payload: {
          action: "unban_user",
          channelId: context.channelId,
          userId: user,
        },
      },
    ],
  };
}

async function handleSlow(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const duration = parsed.args[0]?.value as number;

  if (duration === 0) {
    return {
      success: true,
      response: {
        type: "message",
        content: "Slow mode disabled",
        isSystem: true,
      },
      sideEffects: [
        {
          type: "workflow",
          payload: {
            action: "set_slow_mode",
            channelId: context.channelId,
            duration: 0,
          },
        },
      ],
    };
  }

  return {
    success: true,
    response: {
      type: "message",
      content: `Slow mode enabled: ${formatDuration(duration)} between messages`,
      isSystem: true,
    },
    sideEffects: [
      {
        type: "workflow",
        payload: {
          action: "set_slow_mode",
          channelId: context.channelId,
          duration,
        },
      },
    ],
  };
}

async function handleClear(
  context: CommandContext,
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const count = parsed.args[0]?.value as number;
  const from = parsed.flags.from?.value as string | undefined;

  return {
    success: true,
    response: {
      type: "notification",
      content: `Deleting ${count} messages${from ? ` from @${from}` : ""}...`,
      ephemeral: true,
    },
    sideEffects: [
      {
        type: "workflow",
        payload: {
          action: "clear_messages",
          channelId: context.channelId,
          count,
          from: from?.replace("@", ""),
          clearedBy: context.userId,
        },
      },
    ],
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Interpolate template with context and args
 */
function interpolateTemplate(
  template: string,
  context: CommandContext,
  parsed: ParsedCommand,
): string {
  let result = template;

  // Replace context variables
  result = result.replace(/\{\{userId\}\}/g, context.userId);
  result = result.replace(/\{\{username\}\}/g, context.username);
  result = result.replace(/\{\{displayName\}\}/g, context.displayName);
  result = result.replace(/\{\{channelId\}\}/g, context.channelId);
  result = result.replace(/\{\{channelName\}\}/g, context.channelName);

  // Replace argument values
  const args = argsToObject(parsed);
  for (const [key, value] of Object.entries(args)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, String(value || ""));
  }

  // Clean up any remaining template variables
  result = result.replace(/\{\{[^}]+\}\}/g, "");

  return result.trim();
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(ms: number): string {
  if (ms < 0) return "indefinitely";
  if (ms === 0) return "disabled";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours % 24 > 0) parts.push(`${hours % 24}h`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
  if (seconds % 60 > 0 && parts.length === 0) parts.push(`${seconds % 60}s`);

  return parts.join(" ") || "0s";
}
