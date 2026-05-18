// ============================================================================
// WORKFLOW TRIGGERS
// Trigger definitions and handlers for the nself-chat workflow system
// ============================================================================

import type {
  TriggerType,
  TriggerConfig,
  TriggerStep,
  TriggerFilter,
  ScheduleConfig,
  WorkflowContext,
  StepTemplate,
} from "./workflow-types";

// ============================================================================
// Trigger Templates
// ============================================================================

export const triggerTemplates: Record<
  TriggerType,
  Omit<StepTemplate, "type">
> = {
  message_received: {
    name: "Message Received",
    description: "Trigger when a message is posted in a channel",
    icon: "MessageSquare",
    color: "#3B82F6",
    category: "Messages",
    defaultConfig: {
      triggerType: "message_received",
      channelId: null,
      userId: null,
      filters: [],
    } as TriggerConfig,
  },
  reaction_added: {
    name: "Reaction Added",
    description: "Trigger when a reaction is added to a message",
    icon: "Smile",
    color: "#F59E0B",
    category: "Messages",
    defaultConfig: {
      triggerType: "reaction_added",
      channelId: null,
      filters: [],
    } as TriggerConfig,
  },
  member_joined: {
    name: "Member Joined",
    description: "Trigger when a member joins a channel or workspace",
    icon: "UserPlus",
    color: "#10B981",
    category: "Members",
    defaultConfig: {
      triggerType: "member_joined",
      channelId: null,
    } as TriggerConfig,
  },
  member_left: {
    name: "Member Left",
    description: "Trigger when a member leaves a channel or workspace",
    icon: "UserMinus",
    color: "#EF4444",
    category: "Members",
    defaultConfig: {
      triggerType: "member_left",
      channelId: null,
    } as TriggerConfig,
  },
  channel_created: {
    name: "Channel Created",
    description: "Trigger when a new channel is created",
    icon: "Hash",
    color: "#8B5CF6",
    category: "Channels",
    defaultConfig: {
      triggerType: "channel_created",
    } as TriggerConfig,
  },
  scheduled: {
    name: "Scheduled",
    description: "Trigger at a specific time or on a recurring schedule",
    icon: "Clock",
    color: "#6366F1",
    category: "Time",
    defaultConfig: {
      triggerType: "scheduled",
      schedule: {
        type: "recurring",
        cron: "0 9 * * 1-5", // Weekdays at 9am
        timezone: "UTC",
      },
    } as TriggerConfig,
  },
  webhook: {
    name: "Webhook",
    description: "Trigger when an external webhook is received",
    icon: "Globe",
    color: "#EC4899",
    category: "External",
    defaultConfig: {
      triggerType: "webhook",
    } as TriggerConfig,
  },
  manual: {
    name: "Manual",
    description: "Trigger manually by a user",
    icon: "Play",
    color: "#14B8A6",
    category: "Manual",
    defaultConfig: {
      triggerType: "manual",
    } as TriggerConfig,
  },
  keyword: {
    name: "Keyword",
    description: "Trigger when a specific keyword is detected",
    icon: "Search",
    color: "#F97316",
    category: "Messages",
    defaultConfig: {
      triggerType: "keyword",
      keyword: "",
      channelId: null,
    } as TriggerConfig,
  },
  mention: {
    name: "Mention",
    description: "Trigger when someone is mentioned",
    icon: "AtSign",
    color: "#0EA5E9",
    category: "Messages",
    defaultConfig: {
      triggerType: "mention",
      mentionType: "user",
      channelId: null,
    } as TriggerConfig,
  },
  slash_command: {
    name: "Slash Command",
    description: "Trigger when a slash command is used",
    icon: "Terminal",
    color: "#84CC16",
    category: "Commands",
    defaultConfig: {
      triggerType: "slash_command",
      slashCommand: "/workflow",
    } as TriggerConfig,
  },
};

// ============================================================================
// Trigger Utilities
// ============================================================================

/**
 * Create a default trigger step
 */
export function createTriggerStep(
  triggerType: TriggerType,
  overrides?: Partial<TriggerStep>,
): TriggerStep {
  const template = triggerTemplates[triggerType];
  const id = `trigger_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    type: "trigger",
    name: template.name,
    description: template.description,
    position: { x: 100, y: 100 },
    config: template.defaultConfig as TriggerConfig,
    metadata: {
      icon: template.icon,
      color: template.color,
      category: template.category,
    },
    ...overrides,
  };
}

/**
 * Validate trigger configuration
 */
export function validateTriggerConfig(config: TriggerConfig): string[] {
  const errors: string[] = [];

  switch (config.triggerType) {
    case "keyword":
      if (!config.keyword || config.keyword.trim() === "") {
        errors.push("Keyword is required");
      }
      break;
    case "scheduled":
      if (!config.schedule) {
        errors.push("Schedule configuration is required");
      } else {
        const scheduleErrors = validateScheduleConfig(config.schedule);
        errors.push(...scheduleErrors);
      }
      break;
    case "slash_command":
      if (!config.slashCommand || !config.slashCommand.startsWith("/")) {
        errors.push("Slash command must start with /");
      }
      break;
  }

  return errors;
}

/**
 * Validate schedule configuration
 */
export function validateScheduleConfig(schedule: ScheduleConfig): string[] {
  const errors: string[] = [];

  if (schedule.type === "once") {
    if (!schedule.datetime) {
      errors.push("Datetime is required for one-time schedules");
    } else {
      const date = new Date(schedule.datetime);
      if (isNaN(date.getTime())) {
        errors.push("Invalid datetime format");
      } else if (date <= new Date()) {
        errors.push("Scheduled time must be in the future");
      }
    }
  } else if (schedule.type === "recurring") {
    if (!schedule.cron) {
      errors.push("Cron expression is required for recurring schedules");
    } else {
      const cronErrors = validateCronExpression(schedule.cron);
      errors.push(...cronErrors);
    }
  }

  return errors;
}

/**
 * Validate cron expression
 */
export function validateCronExpression(cron: string): string[] {
  const errors: string[] = [];
  const parts = cron.trim().split(/\s+/);

  if (parts.length < 5 || parts.length > 6) {
    errors.push("Cron expression must have 5 or 6 parts");
    return errors;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Basic validation for each part
  const validatePart = (
    part: string,
    name: string,
    min: number,
    max: number,
  ) => {
    if (part === "*") return;

    // Handle ranges and lists
    const values = part.split(",");
    for (const value of values) {
      if (value.includes("-")) {
        const [start, end] = value.split("-").map(Number);
        if (isNaN(start) || isNaN(end) || start < min || end > max) {
          errors.push(`Invalid ${name} range: ${value}`);
        }
      } else if (value.includes("/")) {
        const [, step] = value.split("/");
        if (isNaN(Number(step))) {
          errors.push(`Invalid ${name} step: ${value}`);
        }
      } else if (!/^\d+$/.test(value)) {
        // Allow named values for month and day of week
        if (!(name === "month" || name === "day of week")) {
          errors.push(`Invalid ${name}: ${value}`);
        }
      } else {
        const num = Number(value);
        if (num < min || num > max) {
          errors.push(`${name} must be between ${min} and ${max}`);
        }
      }
    }
  };

  validatePart(minute, "minute", 0, 59);
  validatePart(hour, "hour", 0, 23);
  validatePart(dayOfMonth, "day of month", 1, 31);
  validatePart(month, "month", 1, 12);
  validatePart(dayOfWeek, "day of week", 0, 7);

  return errors;
}

// ============================================================================
// Filter Matching
// ============================================================================

/**
 * Check if trigger filters match the context
 */
export function matchTriggerFilters(
  filters: TriggerFilter[],
  context: WorkflowContext,
): boolean {
  if (!filters || filters.length === 0) {
    return true;
  }

  return filters.every((filter) => matchFilter(filter, context));
}

/**
 * Match a single filter against context
 */
function matchFilter(filter: TriggerFilter, context: WorkflowContext): boolean {
  const value = getContextValue(filter.field, context);
  if (value === undefined) return false;

  const stringValue = String(value).toLowerCase();
  const filterValue = String(filter.value).toLowerCase();

  switch (filter.operator) {
    case "equals":
      return stringValue === filterValue;
    case "not_equals":
      return stringValue !== filterValue;
    case "contains":
      return stringValue.includes(filterValue);
    case "startsWith":
      return stringValue.startsWith(filterValue);
    case "endsWith":
      return stringValue.endsWith(filterValue);
    case "matches":
      try {
        return new RegExp(filter.value, "i").test(stringValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Get a value from context by path
 */
function getContextValue(path: string, context: WorkflowContext): unknown {
  const parts = path.split(".");
  let value: unknown = context;

  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[part];
  }

  return value;
}

// ============================================================================
// Trigger Evaluation
// ============================================================================

/**
 * Check if a trigger should fire based on event and config
 */
export function shouldTriggerFire(
  trigger: TriggerStep,
  event: TriggerEvent,
): boolean {
  const config = trigger.config;

  // Check if trigger type matches
  if (config.triggerType !== event.type) {
    return false;
  }

  // Check channel filter
  if (config.channelId && event.channelId !== config.channelId) {
    return false;
  }

  // Check user filter
  if (config.userId && event.userId !== config.userId) {
    return false;
  }

  // Check keyword for keyword triggers
  if (config.triggerType === "keyword" && config.keyword) {
    const content = event.data?.content as string | undefined;
    if (
      !content ||
      !content.toLowerCase().includes(config.keyword.toLowerCase())
    ) {
      return false;
    }
  }

  // Check slash command
  if (config.triggerType === "slash_command" && config.slashCommand) {
    const command = event.data?.command as string | undefined;
    if (command !== config.slashCommand) {
      return false;
    }
  }

  // Check mention type
  if (config.triggerType === "mention" && config.mentionType) {
    const mentionType = event.data?.mentionType as string | undefined;
    if (mentionType !== config.mentionType) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Event Types
// ============================================================================

export interface TriggerEvent {
  id: string;
  type: TriggerType;
  timestamp: string;
  channelId?: string;
  userId?: string;
  messageId?: string;
  data?: Record<string, unknown>;
}

/**
 * Create a trigger event from message data
 */
export function createMessageTriggerEvent(
  messageId: string,
  channelId: string,
  userId: string,
  content: string,
  metadata?: Record<string, unknown>,
): TriggerEvent {
  return {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: "message_received",
    timestamp: new Date().toISOString(),
    channelId,
    userId,
    messageId,
    data: {
      content,
      ...metadata,
    },
  };
}

/**
 * Create a trigger event for member join
 */
export function createMemberJoinEvent(
  userId: string,
  channelId?: string,
  metadata?: Record<string, unknown>,
): TriggerEvent {
  return {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: "member_joined",
    timestamp: new Date().toISOString(),
    channelId,
    userId,
    data: metadata,
  };
}

/**
 * Create a trigger event for scheduled workflows
 */
export function createScheduledTriggerEvent(
  workflowId: string,
  schedule: ScheduleConfig,
): TriggerEvent {
  return {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: "scheduled",
    timestamp: new Date().toISOString(),
    data: {
      workflowId,
      schedule,
      scheduledTime: new Date().toISOString(),
    },
  };
}

/**
 * Create a trigger event for webhook
 */
export function createWebhookTriggerEvent(
  payload: Record<string, unknown>,
  headers?: Record<string, string>,
): TriggerEvent {
  return {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: "webhook",
    timestamp: new Date().toISOString(),
    data: {
      payload,
      headers,
    },
  };
}

/**
 * Create a trigger event for manual trigger
 */
export function createManualTriggerEvent(
  userId: string,
  channelId?: string,
  inputs?: Record<string, unknown>,
): TriggerEvent {
  return {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: "manual",
    timestamp: new Date().toISOString(),
    userId,
    channelId,
    data: {
      triggeredBy: userId,
      inputs,
    },
  };
}

// ============================================================================
// Cron Utilities
// ============================================================================

/**
 * Get human-readable description of a cron expression
 */
export function describeCronExpression(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return "Invalid cron expression";

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Common patterns
  if (
    minute === "0" &&
    hour === "*" &&
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "*"
  ) {
    return "Every hour at the start of the hour";
  }
  if (
    minute === "0" &&
    hour === "0" &&
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "*"
  ) {
    return "Every day at midnight";
  }
  if (
    minute === "0" &&
    hour === "9" &&
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "1-5"
  ) {
    return "Every weekday at 9:00 AM";
  }
  if (
    minute === "0" &&
    hour === "9" &&
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "1"
  ) {
    return "Every Monday at 9:00 AM";
  }

  // Generic description
  const parts_desc: string[] = [];

  if (minute !== "*") parts_desc.push(`minute ${minute}`);
  if (hour !== "*") parts_desc.push(`hour ${hour}`);
  if (dayOfMonth !== "*") parts_desc.push(`day ${dayOfMonth}`);
  if (month !== "*") parts_desc.push(`month ${month}`);
  if (dayOfWeek !== "*") parts_desc.push(`weekday ${dayOfWeek}`);

  return `At ${parts_desc.join(", ")}` || "Every minute";
}

/**
 * Get next run time for a cron expression
 */
export function getNextCronRun(
  cron: string,
  fromDate: Date = new Date(),
): Date | null {
  // Simple implementation - for production, use a proper cron library
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return null;

  const [minuteStr, hourStr] = parts;

  const minute =
    minuteStr === "*" ? fromDate.getMinutes() : parseInt(minuteStr, 10);
  const hour = hourStr === "*" ? fromDate.getHours() : parseInt(hourStr, 10);

  const nextRun = new Date(fromDate);
  nextRun.setMinutes(minute);
  nextRun.setHours(hour);
  nextRun.setSeconds(0);
  nextRun.setMilliseconds(0);

  if (nextRun <= fromDate) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun;
}
