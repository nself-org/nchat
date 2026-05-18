/**
 * Command Validator
 *
 * Validates command configurations before saving
 */

import type {
  SlashCommand,
  CommandDraft,
  CommandValidation,
  CommandValidationError,
  CommandValidationWarning,
  CommandArgument,
} from "./command-types";
import { getCommandByTrigger, getBuiltInCommands } from "./command-registry";

// ============================================================================
// Main Validator
// ============================================================================

/**
 * Validate a command configuration
 */
export function validateCommand(
  command: CommandDraft,
  options: {
    checkTriggerConflicts?: boolean;
    existingCommandId?: string;
  } = {},
): CommandValidation {
  const errors: CommandValidationError[] = [];
  const warnings: CommandValidationWarning[] = [];

  // Validate trigger
  const triggerErrors = validateTrigger(command.trigger, options);
  errors.push(...triggerErrors.errors);
  warnings.push(...triggerErrors.warnings);

  // Validate name
  const nameErrors = validateName(command.name);
  errors.push(...nameErrors);

  // Validate description
  const descErrors = validateDescription(command.description);
  errors.push(...descErrors);

  // Validate arguments
  const argErrors = validateArguments(command.arguments);
  errors.push(...argErrors.errors);
  warnings.push(...argErrors.warnings);

  // Validate permissions
  const permErrors = validatePermissions(command.permissions);
  errors.push(...permErrors);

  // Validate channels
  const channelErrors = validateChannels(command.channels);
  errors.push(...channelErrors);

  // Validate response config
  const responseErrors = validateResponseConfig(command.responseConfig);
  errors.push(...responseErrors);

  // Validate action
  const actionErrors = validateAction(command);
  errors.push(...actionErrors.errors);
  warnings.push(...actionErrors.warnings);

  // Validate webhook if present
  if (command.webhook) {
    const webhookErrors = validateWebhook(command.webhook);
    errors.push(...webhookErrors);
  }

  // Validate workflow if present
  if (command.workflow) {
    const workflowErrors = validateWorkflow(command.workflow);
    errors.push(...workflowErrors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Field Validators
// ============================================================================

/**
 * Validate command trigger
 */
function validateTrigger(
  trigger: string,
  options: {
    checkTriggerConflicts?: boolean;
    existingCommandId?: string;
  },
): { errors: CommandValidationError[]; warnings: CommandValidationWarning[] } {
  const errors: CommandValidationError[] = [];
  const warnings: CommandValidationWarning[] = [];

  if (!trigger) {
    errors.push({
      field: "trigger",
      message: "Trigger is required",
      code: "TRIGGER_REQUIRED",
    });
    return { errors, warnings };
  }

  // Check format
  if (!/^[a-z][a-z0-9_-]*$/i.test(trigger)) {
    errors.push({
      field: "trigger",
      message:
        "Trigger must start with a letter and contain only letters, numbers, underscores, and hyphens",
      code: "TRIGGER_INVALID_FORMAT",
    });
  }

  // Check length
  if (trigger.length < 2) {
    errors.push({
      field: "trigger",
      message: "Trigger must be at least 2 characters",
      code: "TRIGGER_TOO_SHORT",
    });
  }

  if (trigger.length > 32) {
    errors.push({
      field: "trigger",
      message: "Trigger must be at most 32 characters",
      code: "TRIGGER_TOO_LONG",
    });
  }

  // Check for conflicts
  if (options.checkTriggerConflicts !== false) {
    const existing = getCommandByTrigger(trigger);
    if (existing && existing.id !== options.existingCommandId) {
      if (existing.isBuiltIn) {
        warnings.push({
          field: "trigger",
          message: `This will override the built-in "/${trigger}" command`,
          code: "TRIGGER_OVERRIDES_BUILTIN",
        });
      } else {
        errors.push({
          field: "trigger",
          message: `Trigger "/${trigger}" is already in use by another custom command`,
          code: "TRIGGER_CONFLICT",
        });
      }
    }
  }

  // Check reserved triggers
  const reserved = ["help", "commands", "admin", "debug", "system"];
  if (reserved.includes(trigger.toLowerCase())) {
    warnings.push({
      field: "trigger",
      message: `"/${trigger}" is a reserved command name`,
      code: "TRIGGER_RESERVED",
    });
  }

  return { errors, warnings };
}

/**
 * Validate command name
 */
function validateName(name?: string): CommandValidationError[] {
  const errors: CommandValidationError[] = [];

  if (!name) {
    errors.push({
      field: "name",
      message: "Name is required",
      code: "NAME_REQUIRED",
    });
    return errors;
  }

  if (name.length < 2) {
    errors.push({
      field: "name",
      message: "Name must be at least 2 characters",
      code: "NAME_TOO_SHORT",
    });
  }

  if (name.length > 50) {
    errors.push({
      field: "name",
      message: "Name must be at most 50 characters",
      code: "NAME_TOO_LONG",
    });
  }

  return errors;
}

/**
 * Validate command description
 */
function validateDescription(description?: string): CommandValidationError[] {
  const errors: CommandValidationError[] = [];

  if (!description) {
    errors.push({
      field: "description",
      message: "Description is required",
      code: "DESCRIPTION_REQUIRED",
    });
    return errors;
  }

  if (description.length < 10) {
    errors.push({
      field: "description",
      message: "Description must be at least 10 characters",
      code: "DESCRIPTION_TOO_SHORT",
    });
  }

  if (description.length > 200) {
    errors.push({
      field: "description",
      message: "Description must be at most 200 characters",
      code: "DESCRIPTION_TOO_LONG",
    });
  }

  return errors;
}

/**
 * Validate command arguments
 */
function validateArguments(args?: CommandArgument[]): {
  errors: CommandValidationError[];
  warnings: CommandValidationWarning[];
} {
  const errors: CommandValidationError[] = [];
  const warnings: CommandValidationWarning[] = [];

  if (!args || args.length === 0) {
    return { errors, warnings };
  }

  // Check for duplicate names
  const names = new Set<string>();
  const flags = new Set<string>();

  // Track positions to ensure correct ordering
  const positions = new Map<number, string>();
  let hasRest = false;
  let restArgName = "";

  for (const arg of args) {
    // Check name uniqueness
    if (names.has(arg.name.toLowerCase())) {
      errors.push({
        field: `arguments.${arg.name}`,
        message: `Duplicate argument name: ${arg.name}`,
        code: "ARG_DUPLICATE_NAME",
      });
    }
    names.add(arg.name.toLowerCase());

    // Check flag uniqueness
    if (arg.flag) {
      if (flags.has(arg.flag)) {
        errors.push({
          field: `arguments.${arg.name}`,
          message: `Duplicate flag: --${arg.flag}`,
          code: "ARG_DUPLICATE_FLAG",
        });
      }
      flags.add(arg.flag);
    }

    // Validate individual argument
    const argErrors = validateArgument(arg);
    errors.push(...argErrors);

    // Check position ordering
    if (arg.position !== undefined) {
      if (positions.has(arg.position)) {
        errors.push({
          field: `arguments.${arg.name}`,
          message: `Duplicate position ${arg.position} with argument "${positions.get(arg.position)}"`,
          code: "ARG_DUPLICATE_POSITION",
        });
      }
      positions.set(arg.position, arg.name);

      // Rest argument must be last
      if (arg.type === "rest") {
        hasRest = true;
        restArgName = arg.name;
      } else if (hasRest) {
        errors.push({
          field: `arguments.${arg.name}`,
          message: `No arguments can come after rest argument "${restArgName}"`,
          code: "ARG_AFTER_REST",
        });
      }
    }
  }

  // Check for gaps in positions
  const sortedPositions = Array.from(positions.keys()).sort((a, b) => a - b);
  for (let i = 0; i < sortedPositions.length; i++) {
    if (sortedPositions[i] !== i) {
      warnings.push({
        field: "arguments",
        message: `Position gap detected. Arguments should be numbered 0, 1, 2, ...`,
        code: "ARG_POSITION_GAP",
      });
      break;
    }
  }

  // Check required vs optional ordering
  let foundOptional = false;
  const positionalArgs = args
    .filter((a) => a.position !== undefined)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  for (const arg of positionalArgs) {
    if (!arg.required) {
      foundOptional = true;
    } else if (foundOptional && arg.type !== "rest") {
      warnings.push({
        field: `arguments.${arg.name}`,
        message: `Required argument "${arg.name}" comes after optional arguments`,
        code: "ARG_REQUIRED_AFTER_OPTIONAL",
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validate a single argument
 */
function validateArgument(arg: CommandArgument): CommandValidationError[] {
  const errors: CommandValidationError[] = [];

  // Check name format
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(arg.name.replace(/\s+/g, "_"))) {
    errors.push({
      field: `arguments.${arg.name}`,
      message:
        "Argument name must start with a letter and contain only letters, numbers, and underscores",
      code: "ARG_INVALID_NAME",
    });
  }

  // Check description
  if (!arg.description || arg.description.length < 3) {
    errors.push({
      field: `arguments.${arg.name}`,
      message: "Argument description must be at least 3 characters",
      code: "ARG_DESCRIPTION_TOO_SHORT",
    });
  }

  // Check choices for choice type
  if (arg.type === "choice") {
    if (!arg.choices || arg.choices.length === 0) {
      errors.push({
        field: `arguments.${arg.name}`,
        message: "Choice argument must have at least one choice",
        code: "ARG_NO_CHOICES",
      });
    } else if (arg.choices.length > 25) {
      errors.push({
        field: `arguments.${arg.name}`,
        message: "Choice argument cannot have more than 25 choices",
        code: "ARG_TOO_MANY_CHOICES",
      });
    }
  }

  // Validate validation rules
  if (arg.validation) {
    if (arg.validation.min !== undefined && arg.validation.max !== undefined) {
      if (arg.validation.min > arg.validation.max) {
        errors.push({
          field: `arguments.${arg.name}`,
          message: "Minimum value cannot be greater than maximum",
          code: "ARG_INVALID_MIN_MAX",
        });
      }
    }

    if (
      arg.validation.minLength !== undefined &&
      arg.validation.maxLength !== undefined
    ) {
      if (arg.validation.minLength > arg.validation.maxLength) {
        errors.push({
          field: `arguments.${arg.name}`,
          message: "Minimum length cannot be greater than maximum length",
          code: "ARG_INVALID_LENGTH_RANGE",
        });
      }
    }

    if (arg.validation.pattern) {
      try {
        new RegExp(arg.validation.pattern);
      } catch {
        errors.push({
          field: `arguments.${arg.name}`,
          message: "Invalid regex pattern",
          code: "ARG_INVALID_PATTERN",
        });
      }
    }
  }

  return errors;
}

/**
 * Validate permissions config
 */
function validatePermissions(
  permissions?: Partial<SlashCommand["permissions"]>,
): CommandValidationError[] {
  const errors: CommandValidationError[] = [];

  if (!permissions) {
    return errors;
  }

  const validRoles = ["owner", "admin", "moderator", "member", "guest"];
  if (permissions.minRole && !validRoles.includes(permissions.minRole)) {
    errors.push({
      field: "permissions.minRole",
      message: `Invalid role: ${permissions.minRole}`,
      code: "PERM_INVALID_ROLE",
    });
  }

  return errors;
}

/**
 * Validate channels config
 */
function validateChannels(
  channels?: Partial<SlashCommand["channels"]>,
): CommandValidationError[] {
  const errors: CommandValidationError[] = [];

  if (!channels) {
    return errors;
  }

  const validTypes = ["public", "private", "direct", "group"];
  if (channels.allowedTypes) {
    for (const type of channels.allowedTypes) {
      if (!validTypes.includes(type)) {
        errors.push({
          field: "channels.allowedTypes",
          message: `Invalid channel type: ${type}`,
          code: "CHANNEL_INVALID_TYPE",
        });
      }
    }

    if (channels.allowedTypes.length === 0) {
      errors.push({
        field: "channels.allowedTypes",
        message: "At least one channel type must be allowed",
        code: "CHANNEL_NO_TYPES",
      });
    }
  }

  return errors;
}

/**
 * Validate response config
 */
function validateResponseConfig(
  responseConfig?: Partial<SlashCommand["responseConfig"]>,
): CommandValidationError[] {
  const errors: CommandValidationError[] = [];

  if (!responseConfig) {
    return errors;
  }

  const validTypes = [
    "message",
    "ephemeral",
    "notification",
    "modal",
    "redirect",
    "none",
  ];
  if (responseConfig.type && !validTypes.includes(responseConfig.type)) {
    errors.push({
      field: "responseConfig.type",
      message: `Invalid response type: ${responseConfig.type}`,
      code: "RESPONSE_INVALID_TYPE",
    });
  }

  return errors;
}

/**
 * Validate action configuration
 */
function validateAction(command: CommandDraft): {
  errors: CommandValidationError[];
  warnings: CommandValidationWarning[];
} {
  const errors: CommandValidationError[] = [];
  const warnings: CommandValidationWarning[] = [];

  if (!command.actionType) {
    errors.push({
      field: "actionType",
      message: "Action type is required",
      code: "ACTION_TYPE_REQUIRED",
    });
    return { errors, warnings };
  }

  const validActionTypes = [
    "message",
    "status",
    "navigate",
    "modal",
    "api",
    "webhook",
    "workflow",
    "builtin",
    "custom",
  ];

  if (!validActionTypes.includes(command.actionType)) {
    errors.push({
      field: "actionType",
      message: `Invalid action type: ${command.actionType}`,
      code: "ACTION_INVALID_TYPE",
    });
  }

  // Validate action details based on type
  switch (command.actionType) {
    case "message":
      if (!command.action?.message && !command.responseConfig?.template) {
        errors.push({
          field: "action.message",
          message: "Message action requires a message template",
          code: "ACTION_MESSAGE_REQUIRED",
        });
      }
      break;

    case "navigate":
      if (!command.action?.navigate?.url) {
        errors.push({
          field: "action.navigate.url",
          message: "Navigate action requires a URL",
          code: "ACTION_URL_REQUIRED",
        });
      }
      break;

    case "modal":
      if (!command.action?.modal?.component) {
        errors.push({
          field: "action.modal.component",
          message: "Modal action requires a component name",
          code: "ACTION_COMPONENT_REQUIRED",
        });
      }
      break;

    case "api":
      if (!command.action?.api?.endpoint) {
        errors.push({
          field: "action.api.endpoint",
          message: "API action requires an endpoint",
          code: "ACTION_ENDPOINT_REQUIRED",
        });
      }
      break;

    case "webhook":
      if (!command.webhook) {
        errors.push({
          field: "webhook",
          message: "Webhook action requires webhook configuration",
          code: "ACTION_WEBHOOK_REQUIRED",
        });
      }
      break;

    case "workflow":
      if (!command.workflow) {
        errors.push({
          field: "workflow",
          message: "Workflow action requires workflow configuration",
          code: "ACTION_WORKFLOW_REQUIRED",
        });
      }
      break;

    case "custom":
      warnings.push({
        field: "actionType",
        message: "Custom JavaScript actions may pose security risks",
        code: "ACTION_CUSTOM_WARNING",
      });
      break;
  }

  return { errors, warnings };
}

/**
 * Validate webhook configuration
 */
function validateWebhook(
  webhook: SlashCommand["webhook"],
): CommandValidationError[] {
  const errors: CommandValidationError[] = [];

  if (!webhook) {
    return errors;
  }

  // Validate URL
  if (!webhook.url) {
    errors.push({
      field: "webhook.url",
      message: "Webhook URL is required",
      code: "WEBHOOK_URL_REQUIRED",
    });
  } else {
    try {
      new URL(webhook.url);
    } catch {
      errors.push({
        field: "webhook.url",
        message: "Invalid webhook URL",
        code: "WEBHOOK_INVALID_URL",
      });
    }
  }

  // Validate method
  const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  if (webhook.method && !validMethods.includes(webhook.method)) {
    errors.push({
      field: "webhook.method",
      message: `Invalid HTTP method: ${webhook.method}`,
      code: "WEBHOOK_INVALID_METHOD",
    });
  }

  // Validate timeout
  if (webhook.timeout !== undefined) {
    if (webhook.timeout < 1000) {
      errors.push({
        field: "webhook.timeout",
        message: "Timeout must be at least 1000ms",
        code: "WEBHOOK_TIMEOUT_TOO_SHORT",
      });
    }
    if (webhook.timeout > 30000) {
      errors.push({
        field: "webhook.timeout",
        message: "Timeout cannot exceed 30000ms",
        code: "WEBHOOK_TIMEOUT_TOO_LONG",
      });
    }
  }

  return errors;
}

/**
 * Validate workflow configuration
 */
function validateWorkflow(
  workflow: SlashCommand["workflow"],
): CommandValidationError[] {
  const errors: CommandValidationError[] = [];

  if (!workflow) {
    return errors;
  }

  if (!workflow.workflowId) {
    errors.push({
      field: "workflow.workflowId",
      message: "Workflow ID is required",
      code: "WORKFLOW_ID_REQUIRED",
    });
  }

  return errors;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick validation check (returns boolean)
 */
export function isValidCommand(command: CommandDraft): boolean {
  const result = validateCommand(command);
  return result.isValid;
}

/**
 * Get validation errors as a simple array of strings
 */
export function getValidationErrors(command: CommandDraft): string[] {
  const result = validateCommand(command);
  return result.errors.map((e) => e.message);
}

/**
 * Sanitize a trigger string
 */
export function sanitizeTrigger(trigger: string): string {
  return trigger
    .toLowerCase()
    .replace(/^\/+/, "") // Remove leading slashes
    .replace(/[^a-z0-9_-]/g, "") // Remove invalid chars
    .slice(0, 32); // Limit length
}
