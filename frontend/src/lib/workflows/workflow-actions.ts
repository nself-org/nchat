// ============================================================================
// WORKFLOW ACTIONS
// Action definitions and handlers for the nself-chat workflow system
// ============================================================================

import type {
  ActionType,
  ActionConfig,
  ActionStep,
  WorkflowContext,
  StepTemplate,
} from "./workflow-types";

// ============================================================================
// Action Templates
// ============================================================================

export const actionTemplates: Record<ActionType, Omit<StepTemplate, "type">> = {
  set_variable: {
    name: "Set Variable",
    description: "Set or update a workflow variable",
    icon: "Variable",
    color: "#6366F1",
    category: "Variables",
    defaultConfig: {
      actionType: "set_variable",
      variableName: "",
      variableValue: "",
    } as ActionConfig,
  },
  update_user: {
    name: "Update User",
    description: "Update user properties or settings",
    icon: "UserCog",
    color: "#8B5CF6",
    category: "Users",
    defaultConfig: {
      actionType: "update_user",
      targetUserId: "",
    } as ActionConfig,
  },
  update_channel: {
    name: "Update Channel",
    description: "Update channel properties",
    icon: "Hash",
    color: "#0EA5E9",
    category: "Channels",
    defaultConfig: {
      actionType: "update_channel",
      targetChannelId: "",
    } as ActionConfig,
  },
  add_reaction: {
    name: "Add Reaction",
    description: "Add a reaction to a message",
    icon: "Smile",
    color: "#F59E0B",
    category: "Messages",
    defaultConfig: {
      actionType: "add_reaction",
      targetMessageId: "",
      reactionEmoji: "",
    } as ActionConfig,
  },
  remove_reaction: {
    name: "Remove Reaction",
    description: "Remove a reaction from a message",
    icon: "SmileMinus",
    color: "#EF4444",
    category: "Messages",
    defaultConfig: {
      actionType: "remove_reaction",
      targetMessageId: "",
      reactionEmoji: "",
    } as ActionConfig,
  },
  pin_message: {
    name: "Pin Message",
    description: "Pin a message to a channel",
    icon: "Pin",
    color: "#10B981",
    category: "Messages",
    defaultConfig: {
      actionType: "pin_message",
      targetMessageId: "",
    } as ActionConfig,
  },
  unpin_message: {
    name: "Unpin Message",
    description: "Unpin a message from a channel",
    icon: "PinOff",
    color: "#6B7280",
    category: "Messages",
    defaultConfig: {
      actionType: "unpin_message",
      targetMessageId: "",
    } as ActionConfig,
  },
  archive_channel: {
    name: "Archive Channel",
    description: "Archive a channel",
    icon: "Archive",
    color: "#6B7280",
    category: "Channels",
    defaultConfig: {
      actionType: "archive_channel",
      targetChannelId: "",
    } as ActionConfig,
  },
  invite_user: {
    name: "Invite User",
    description: "Invite users to a channel",
    icon: "UserPlus",
    color: "#10B981",
    category: "Users",
    defaultConfig: {
      actionType: "invite_user",
      targetChannelId: "",
      inviteUserIds: [],
    } as ActionConfig,
  },
  remove_user: {
    name: "Remove User",
    description: "Remove a user from a channel",
    icon: "UserMinus",
    color: "#EF4444",
    category: "Users",
    defaultConfig: {
      actionType: "remove_user",
      targetChannelId: "",
      targetUserId: "",
    } as ActionConfig,
  },
  set_topic: {
    name: "Set Topic",
    description: "Set channel topic",
    icon: "Type",
    color: "#3B82F6",
    category: "Channels",
    defaultConfig: {
      actionType: "set_topic",
      targetChannelId: "",
      topic: "",
    } as ActionConfig,
  },
  create_channel: {
    name: "Create Channel",
    description: "Create a new channel",
    icon: "FolderPlus",
    color: "#8B5CF6",
    category: "Channels",
    defaultConfig: {
      actionType: "create_channel",
      channelName: "",
      channelType: "public",
    } as ActionConfig,
  },
  log: {
    name: "Log",
    description: "Log a message for debugging",
    icon: "FileText",
    color: "#6B7280",
    category: "Utility",
    defaultConfig: {
      actionType: "log",
      logLevel: "info",
      logMessage: "",
    } as ActionConfig,
  },
  notify: {
    name: "Notify",
    description: "Send a notification",
    icon: "Bell",
    color: "#F97316",
    category: "Notifications",
    defaultConfig: {
      actionType: "notify",
      notificationTitle: "",
      notificationBody: "",
    } as ActionConfig,
  },
  custom: {
    name: "Custom Action",
    description: "Execute a custom action",
    icon: "Code",
    color: "#EC4899",
    category: "Advanced",
    defaultConfig: {
      actionType: "custom",
      customAction: "",
      customPayload: {},
    } as ActionConfig,
  },
};

// ============================================================================
// Action Utilities
// ============================================================================

/**
 * Create an action step
 */
export function createActionStep(
  actionType: ActionType,
  overrides?: Partial<ActionStep>,
): ActionStep {
  const template = actionTemplates[actionType];
  const id = `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    type: "action",
    name: template.name,
    description: template.description,
    position: { x: 200, y: 200 },
    config: { ...template.defaultConfig } as ActionConfig,
    metadata: {
      icon: template.icon,
      color: template.color,
      category: template.category,
    },
    ...overrides,
  };
}

/**
 * Validate action configuration
 */
export function validateActionConfig(config: ActionConfig): string[] {
  const errors: string[] = [];

  switch (config.actionType) {
    case "set_variable":
      if (!config.variableName || config.variableName.trim() === "") {
        errors.push("Variable name is required");
      }
      if (!isValidVariableName(config.variableName || "")) {
        errors.push(
          "Variable name must start with a letter and contain only letters, numbers, and underscores",
        );
      }
      break;

    case "add_reaction":
    case "remove_reaction":
      if (!config.reactionEmoji || config.reactionEmoji.trim() === "") {
        errors.push("Reaction emoji is required");
      }
      break;

    case "set_topic":
      if (!config.targetChannelId) {
        errors.push("Target channel is required");
      }
      if (config.topic && config.topic.length > 250) {
        errors.push("Topic must be 250 characters or less");
      }
      break;

    case "create_channel":
      if (!config.channelName || config.channelName.trim() === "") {
        errors.push("Channel name is required");
      }
      if (config.channelName && !isValidChannelName(config.channelName)) {
        errors.push(
          "Channel name must be lowercase with no spaces (use hyphens)",
        );
      }
      break;

    case "invite_user":
      if (!config.targetChannelId) {
        errors.push("Target channel is required");
      }
      if (!config.inviteUserIds || config.inviteUserIds.length === 0) {
        errors.push("At least one user to invite is required");
      }
      break;

    case "remove_user":
      if (!config.targetChannelId) {
        errors.push("Target channel is required");
      }
      if (!config.targetUserId) {
        errors.push("User to remove is required");
      }
      break;

    case "log":
      if (!config.logMessage || config.logMessage.trim() === "") {
        errors.push("Log message is required");
      }
      break;

    case "notify":
      if (!config.notificationTitle || config.notificationTitle.trim() === "") {
        errors.push("Notification title is required");
      }
      if (!config.notificationBody || config.notificationBody.trim() === "") {
        errors.push("Notification body is required");
      }
      break;

    case "custom":
      if (!config.customAction || config.customAction.trim() === "") {
        errors.push("Custom action name is required");
      }
      break;
  }

  return errors;
}

/**
 * Check if a variable name is valid
 */
function isValidVariableName(name: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Check if a channel name is valid
 */
function isValidChannelName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(name);
}

// ============================================================================
// Action Execution
// ============================================================================

export interface ActionResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

/**
 * Execute an action
 */
export async function executeAction(
  action: ActionStep,
  context: WorkflowContext,
): Promise<ActionResult> {
  const config = action.config;

  try {
    switch (config.actionType) {
      case "set_variable":
        return executeSetVariable(config, context);
      case "update_user":
        return executeUpdateUser(config, context);
      case "update_channel":
        return executeUpdateChannel(config, context);
      case "add_reaction":
        return executeAddReaction(config, context);
      case "remove_reaction":
        return executeRemoveReaction(config, context);
      case "pin_message":
        return executePinMessage(config, context);
      case "unpin_message":
        return executeUnpinMessage(config, context);
      case "archive_channel":
        return executeArchiveChannel(config, context);
      case "invite_user":
        return executeInviteUser(config, context);
      case "remove_user":
        return executeRemoveUser(config, context);
      case "set_topic":
        return executeSetTopic(config, context);
      case "create_channel":
        return executeCreateChannel(config, context);
      case "log":
        return executeLog(config, context);
      case "notify":
        return executeNotify(config, context);
      case "custom":
        return executeCustom(config, context);
      default:
        return {
          success: false,
          error: `Unknown action type: ${config.actionType}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Action Handlers
// ============================================================================

function executeSetVariable(
  config: ActionConfig,
  context: WorkflowContext,
): ActionResult {
  const { variableName, variableValue } = config;

  if (!variableName) {
    return { success: false, error: "Variable name is required" };
  }

  // Process variable value - might contain references to other variables
  const processedValue = processVariableValue(variableValue, context);

  // Set the variable in context
  context.variables[variableName] = processedValue;

  return {
    success: true,
    output: {
      variableName,
      value: processedValue,
    },
  };
}

function executeUpdateUser(
  config: ActionConfig,
  _context: WorkflowContext,
): ActionResult {
  const { targetUserId } = config;

  if (!targetUserId) {
    return { success: false, error: "Target user ID is required" };
  }

  // In a real implementation, this would call the user service
  return {
    success: true,
    output: {
      userId: targetUserId,
      action: "updated",
    },
  };
}

function executeUpdateChannel(
  config: ActionConfig,
  _context: WorkflowContext,
): ActionResult {
  const { targetChannelId } = config;

  if (!targetChannelId) {
    return { success: false, error: "Target channel ID is required" };
  }

  // In a real implementation, this would call the channel service
  return {
    success: true,
    output: {
      channelId: targetChannelId,
      action: "updated",
    },
  };
}

function executeAddReaction(
  config: ActionConfig,
  _context: WorkflowContext,
): ActionResult {
  const { targetMessageId, reactionEmoji } = config;

  if (!targetMessageId || !reactionEmoji) {
    return {
      success: false,
      error: "Message ID and reaction emoji are required",
    };
  }

  // In a real implementation, this would call the reaction service
  return {
    success: true,
    output: {
      messageId: targetMessageId,
      emoji: reactionEmoji,
      action: "added",
    },
  };
}

function executeRemoveReaction(
  config: ActionConfig,
  _context: WorkflowContext,
): ActionResult {
  const { targetMessageId, reactionEmoji } = config;

  if (!targetMessageId || !reactionEmoji) {
    return {
      success: false,
      error: "Message ID and reaction emoji are required",
    };
  }

  // In a real implementation, this would call the reaction service
  return {
    success: true,
    output: {
      messageId: targetMessageId,
      emoji: reactionEmoji,
      action: "removed",
    },
  };
}

function executePinMessage(
  config: ActionConfig,
  _context: WorkflowContext,
): ActionResult {
  const { targetMessageId } = config;

  if (!targetMessageId) {
    return { success: false, error: "Message ID is required" };
  }

  // In a real implementation, this would call the message service
  return {
    success: true,
    output: {
      messageId: targetMessageId,
      action: "pinned",
    },
  };
}

function executeUnpinMessage(
  config: ActionConfig,
  _context: WorkflowContext,
): ActionResult {
  const { targetMessageId } = config;

  if (!targetMessageId) {
    return { success: false, error: "Message ID is required" };
  }

  // In a real implementation, this would call the message service
  return {
    success: true,
    output: {
      messageId: targetMessageId,
      action: "unpinned",
    },
  };
}

function executeArchiveChannel(
  config: ActionConfig,
  _context: WorkflowContext,
): ActionResult {
  const { targetChannelId } = config;

  if (!targetChannelId) {
    return { success: false, error: "Channel ID is required" };
  }

  // In a real implementation, this would call the channel service
  return {
    success: true,
    output: {
      channelId: targetChannelId,
      action: "archived",
    },
  };
}

function executeInviteUser(
  config: ActionConfig,
  _context: WorkflowContext,
): ActionResult {
  const { targetChannelId, inviteUserIds } = config;

  if (!targetChannelId || !inviteUserIds || inviteUserIds.length === 0) {
    return { success: false, error: "Channel ID and user IDs are required" };
  }

  // In a real implementation, this would call the channel service
  return {
    success: true,
    output: {
      channelId: targetChannelId,
      userIds: inviteUserIds,
      action: "invited",
    },
  };
}

function executeRemoveUser(
  config: ActionConfig,
  _context: WorkflowContext,
): ActionResult {
  const { targetChannelId, targetUserId } = config;

  if (!targetChannelId || !targetUserId) {
    return { success: false, error: "Channel ID and user ID are required" };
  }

  // In a real implementation, this would call the channel service
  return {
    success: true,
    output: {
      channelId: targetChannelId,
      userId: targetUserId,
      action: "removed",
    },
  };
}

function executeSetTopic(
  config: ActionConfig,
  _context: WorkflowContext,
): ActionResult {
  const { targetChannelId, topic } = config;

  if (!targetChannelId) {
    return { success: false, error: "Channel ID is required" };
  }

  // In a real implementation, this would call the channel service
  return {
    success: true,
    output: {
      channelId: targetChannelId,
      topic: topic || "",
      action: "topic_set",
    },
  };
}

function executeCreateChannel(
  config: ActionConfig,
  _context: WorkflowContext,
): ActionResult {
  const { channelName, channelType } = config;

  if (!channelName) {
    return { success: false, error: "Channel name is required" };
  }

  // In a real implementation, this would call the channel service
  const newChannelId = `channel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    success: true,
    output: {
      channelId: newChannelId,
      channelName,
      channelType: channelType || "public",
      action: "created",
    },
  };
}

function executeLog(
  config: ActionConfig,
  context: WorkflowContext,
): ActionResult {
  const { logLevel, logMessage } = config;

  const processedMessage = processVariableValue(logMessage, context);

  return {
    success: true,
    output: {
      level: logLevel || "info",
      message: processedMessage,
      timestamp: new Date().toISOString(),
    },
  };
}

function executeNotify(
  config: ActionConfig,
  context: WorkflowContext,
): ActionResult {
  const { notificationTitle, notificationBody } = config;

  const processedTitle = processVariableValue(notificationTitle, context);
  const processedBody = processVariableValue(notificationBody, context);

  // In a real implementation, this would call the notification service
  return {
    success: true,
    output: {
      title: processedTitle,
      body: processedBody,
      sentAt: new Date().toISOString(),
    },
  };
}

function executeCustom(
  config: ActionConfig,
  _context: WorkflowContext,
): ActionResult {
  const { customAction, customPayload } = config;

  if (!customAction) {
    return { success: false, error: "Custom action name is required" };
  }

  // In a real implementation, this would dispatch to custom action handlers
  return {
    success: true,
    output: {
      action: customAction,
      payload: customPayload,
      executedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Variable Processing
// ============================================================================

/**
 * Process a value that might contain variable references
 * Variables are referenced using {{variableName}} syntax
 */
function processVariableValue(
  value: unknown,
  context: WorkflowContext,
): unknown {
  if (typeof value !== "string") {
    return value;
  }

  // Replace variable references
  return value.replace(/\{\{([^}]+)\}\}/g, (_, varName) => {
    const trimmedName = varName.trim();

    // Check for nested property access
    if (trimmedName.includes(".")) {
      return String(getNestedValue(trimmedName, context) ?? "");
    }

    // Direct variable lookup
    const varValue = context.variables[trimmedName];
    return varValue !== undefined ? String(varValue) : "";
  });
}

/**
 * Get a nested value from context
 */
function getNestedValue(path: string, context: WorkflowContext): unknown {
  const parts = path.split(".");
  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

// ============================================================================
// Action Categories
// ============================================================================

export const actionCategories = [
  {
    id: "variables",
    name: "Variables",
    description: "Manage workflow variables",
    actions: ["set_variable"],
  },
  {
    id: "messages",
    name: "Messages",
    description: "Message-related actions",
    actions: [
      "add_reaction",
      "remove_reaction",
      "pin_message",
      "unpin_message",
    ],
  },
  {
    id: "channels",
    name: "Channels",
    description: "Channel management actions",
    actions: [
      "update_channel",
      "archive_channel",
      "set_topic",
      "create_channel",
    ],
  },
  {
    id: "users",
    name: "Users",
    description: "User-related actions",
    actions: ["update_user", "invite_user", "remove_user"],
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Send notifications",
    actions: ["notify"],
  },
  {
    id: "utility",
    name: "Utility",
    description: "Utility and debugging actions",
    actions: ["log"],
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "Advanced and custom actions",
    actions: ["custom"],
  },
];

/**
 * Get all actions for a category
 */
export function getActionsByCategory(categoryId: string): ActionType[] {
  const category = actionCategories.find((c) => c.id === categoryId);
  return (category?.actions || []) as ActionType[];
}

/**
 * Get all action templates grouped by category
 */
export function getActionTemplatesByCategory(): Record<
  string,
  Array<StepTemplate & { actionType: ActionType }>
> {
  const result: Record<
    string,
    Array<StepTemplate & { actionType: ActionType }>
  > = {};

  for (const category of actionCategories) {
    result[category.name] = category.actions.map((actionType) => ({
      type: "action" as const,
      ...actionTemplates[actionType as ActionType],
      actionType: actionType as ActionType,
    }));
  }

  return result;
}
