/**
 * Automation Engine
 *
 * Provides rule-based automation for administrative tasks including:
 * - Auto-archiving inactive channels
 * - Auto-deleting old messages (retention policies)
 * - Auto-assigning roles based on rules
 * - Scheduled reports
 * - Auto-onboarding workflows
 */

// ============================================================================
// Types
// ============================================================================

export type AutomationTrigger =
  | "schedule" // Cron-based schedule
  | "user.created" // New user created
  | "user.login" // User logs in
  | "channel.created" // New channel created
  | "channel.inactive" // Channel inactive for X days
  | "message.created" // New message
  | "message.old" // Message older than X days
  | "user.inactive"; // User inactive for X days

export type AutomationAction =
  | "channel.archive" // Archive a channel
  | "channel.delete" // Delete a channel
  | "message.delete" // Delete messages
  | "user.assign_role" // Assign role to user
  | "user.send_email" // Send email to user
  | "user.suspend" // Suspend user account
  | "report.generate" // Generate and send report
  | "notification.send"; // Send notification

export type AutomationStatus = "active" | "paused" | "disabled";

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  status: AutomationStatus;
  trigger: AutomationTrigger;
  triggerConfig: AutomationTriggerConfig;
  action: AutomationAction;
  actionConfig: AutomationActionConfig;
  conditions?: AutomationCondition[];
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  successCount: number;
  failureCount: number;
}

export interface AutomationTriggerConfig {
  // For schedule trigger
  schedule?: {
    cron: string; // Cron expression (e.g., "0 0 * * *" for daily at midnight)
    timezone?: string;
  };
  // For time-based triggers
  inactivityDays?: number; // Number of days of inactivity
  ageDays?: number; // Age threshold in days
  // For event-based triggers
  eventFilter?: Record<string, unknown>;
}

export interface AutomationActionConfig {
  // Channel actions
  archiveChannel?: {
    reason?: string;
    notifyMembers?: boolean;
  };
  deleteChannel?: {
    deleteMessages?: boolean;
    notifyMembers?: boolean;
  };
  // Message actions
  deleteMessages?: {
    reason?: string;
    archiveFirst?: boolean;
  };
  // User actions
  assignRole?: {
    roleId: string;
    notifyUser?: boolean;
  };
  sendEmail?: {
    templateId: string;
    subject: string;
    customData?: Record<string, unknown>;
  };
  suspendUser?: {
    reason: string;
    duration?: number; // in days
  };
  // Report actions
  generateReport?: {
    reportType: "users" | "channels" | "messages" | "activity" | "analytics";
    format: "pdf" | "csv" | "json";
    recipients: string[];
    includeCharts?: boolean;
  };
  // Notification actions
  sendNotification?: {
    title: string;
    message: string;
    channels?: string[]; // Notification channels: email, slack, webhook
    recipients?: string[];
  };
}

export interface AutomationCondition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "contains"
    | "not_contains";
  value: unknown;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  startedAt: Date;
  completedAt?: Date;
  status: "running" | "completed" | "failed";
  itemsProcessed: number;
  itemsSuccessful: number;
  itemsFailed: number;
  errors: AutomationExecutionError[];
  logs: AutomationExecutionLog[];
}

export interface AutomationExecutionError {
  itemId?: string;
  message: string;
  timestamp: Date;
}

export interface AutomationExecutionLog {
  level: "info" | "warn" | "error";
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Predefined Automation Templates
// ============================================================================

export const AUTOMATION_TEMPLATES: Partial<AutomationRule>[] = [
  {
    name: "Archive Inactive Channels",
    description: "Automatically archive channels with no activity for 90 days",
    trigger: "schedule",
    triggerConfig: {
      schedule: {
        cron: "0 0 * * 0", // Weekly on Sunday at midnight
      },
      inactivityDays: 90,
    },
    action: "channel.archive",
    actionConfig: {
      archiveChannel: {
        reason: "Archived due to inactivity (90 days)",
        notifyMembers: true,
      },
    },
  },
  {
    name: "Delete Old Messages",
    description:
      "Delete messages older than 365 days to comply with retention policy",
    trigger: "schedule",
    triggerConfig: {
      schedule: {
        cron: "0 2 * * *", // Daily at 2 AM
      },
      ageDays: 365,
    },
    action: "message.delete",
    actionConfig: {
      deleteMessages: {
        reason: "Retention policy: messages older than 1 year",
        archiveFirst: true,
      },
    },
  },
  {
    name: "Auto-assign Member Role",
    description:
      'Automatically assign "member" role to new users after email verification',
    trigger: "user.created",
    triggerConfig: {},
    action: "user.assign_role",
    actionConfig: {
      assignRole: {
        roleId: "member", // This would be the actual role ID
        notifyUser: true,
      },
    },
  },
  {
    name: "Welcome Email",
    description: "Send welcome email to new users",
    trigger: "user.created",
    triggerConfig: {},
    action: "user.send_email",
    actionConfig: {
      sendEmail: {
        templateId: "welcome",
        subject: "Welcome to the team!",
      },
    },
  },
  {
    name: "Weekly Activity Report",
    description: "Generate and send weekly activity report to admins",
    trigger: "schedule",
    triggerConfig: {
      schedule: {
        cron: "0 9 * * 1", // Monday at 9 AM
      },
    },
    action: "report.generate",
    actionConfig: {
      generateReport: {
        reportType: "activity",
        format: "pdf",
        recipients: ["admin@example.com"],
        includeCharts: true,
      },
    },
  },
  {
    name: "Suspend Inactive Users",
    description: "Suspend user accounts inactive for 180 days",
    trigger: "schedule",
    triggerConfig: {
      schedule: {
        cron: "0 3 * * 0", // Weekly on Sunday at 3 AM
      },
      inactivityDays: 180,
    },
    action: "user.suspend",
    actionConfig: {
      suspendUser: {
        reason: "Account inactive for 180 days",
      },
    },
  },
];

// ============================================================================
// Cron Expression Parser
// ============================================================================

export interface CronSchedule {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

/**
 * Parse a cron expression into its components
 */
export function parseCronExpression(expression: string): CronSchedule | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4],
  };
}

/**
 * Get human-readable description of cron schedule
 */
export function describeCronSchedule(expression: string): string {
  const schedule = parseCronExpression(expression);
  if (!schedule) return "Invalid schedule";

  // Handle common patterns
  if (expression === "* * * * *") return "Every minute";
  if (expression === "0 * * * *") return "Every hour";
  if (expression === "0 0 * * *") return "Daily at midnight";
  if (expression === "0 0 * * 0") return "Weekly on Sunday at midnight";
  if (expression === "0 0 1 * *") return "Monthly on the 1st at midnight";

  // Build description from parts
  const parts: string[] = [];

  // Minute
  if (schedule.minute === "*") {
    parts.push("every minute");
  } else if (schedule.minute.includes("/")) {
    const interval = schedule.minute.split("/")[1];
    parts.push(`every ${interval} minutes`);
  } else {
    parts.push(`at minute ${schedule.minute}`);
  }

  // Hour
  if (schedule.hour !== "*") {
    const hour = parseInt(schedule.hour);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    parts.push(`at ${displayHour}:00 ${ampm}`);
  }

  // Day of week
  if (schedule.dayOfWeek !== "*") {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const day = days[parseInt(schedule.dayOfWeek)] || schedule.dayOfWeek;
    parts.push(`on ${day}`);
  }

  // Day of month
  if (schedule.dayOfMonth !== "*") {
    parts.push(`on day ${schedule.dayOfMonth}`);
  }

  return parts.join(" ");
}

/**
 * Calculate next run time from cron expression
 */
export function calculateNextRun(
  expression: string,
  from: Date = new Date(),
): Date | null {
  // This is a simplified implementation
  // In production, use a library like node-cron or cron-parser
  const schedule = parseCronExpression(expression);
  if (!schedule) return null;

  const next = new Date(from);

  // Simple daily schedule
  if (expression === "0 0 * * *") {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  // Simple weekly schedule
  if (expression === "0 0 * * 0") {
    const daysUntilSunday = (7 - next.getDay()) % 7 || 7;
    next.setDate(next.getDate() + daysUntilSunday);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  // For other patterns, add 1 day as fallback
  next.setDate(next.getDate() + 1);
  return next;
}

// ============================================================================
// Automation Executor
// ============================================================================

export class AutomationExecutor {
  private execution: AutomationExecution;

  constructor(rule: AutomationRule) {
    this.execution = {
      id: crypto.randomUUID(),
      ruleId: rule.id,
      ruleName: rule.name,
      startedAt: new Date(),
      status: "running",
      itemsProcessed: 0,
      itemsSuccessful: 0,
      itemsFailed: 0,
      errors: [],
      logs: [],
    };
  }

  log(
    level: "info" | "warn" | "error",
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    this.execution.logs.push({
      level,
      message,
      timestamp: new Date(),
      metadata,
    });
  }

  incrementSuccess() {
    this.execution.itemsProcessed++;
    this.execution.itemsSuccessful++;
  }

  incrementFailure(error: string, itemId?: string) {
    this.execution.itemsProcessed++;
    this.execution.itemsFailed++;
    this.execution.errors.push({
      itemId,
      message: error,
      timestamp: new Date(),
    });
  }

  complete() {
    this.execution.status = "completed";
    this.execution.completedAt = new Date();
  }

  fail() {
    this.execution.status = "failed";
    this.execution.completedAt = new Date();
  }

  getExecution(): AutomationExecution {
    return this.execution;
  }
}

// ============================================================================
// Condition Evaluator
// ============================================================================

export function evaluateCondition(
  condition: AutomationCondition,
  value: unknown,
): boolean {
  switch (condition.operator) {
    case "equals":
      return value === condition.value;
    case "not_equals":
      return value !== condition.value;
    case "greater_than":
      return typeof value === "number" && typeof condition.value === "number"
        ? value > condition.value
        : false;
    case "less_than":
      return typeof value === "number" && typeof condition.value === "number"
        ? value < condition.value
        : false;
    case "contains":
      return typeof value === "string" && typeof condition.value === "string"
        ? value.includes(condition.value)
        : false;
    case "not_contains":
      return typeof value === "string" && typeof condition.value === "string"
        ? !value.includes(condition.value)
        : false;
    default:
      return false;
  }
}

export function evaluateConditions(
  conditions: AutomationCondition[],
  context: Record<string, unknown>,
): boolean {
  // All conditions must be true (AND logic)
  return conditions.every((condition) => {
    const value = context[condition.field];
    return evaluateCondition(condition, value);
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getAutomationStatusColor(status: AutomationStatus): string {
  switch (status) {
    case "active":
      return "text-green-600 dark:text-green-400";
    case "paused":
      return "text-yellow-600 dark:text-yellow-400";
    case "disabled":
      return "text-gray-600 dark:text-gray-400";
  }
}

export function getAutomationStatusBadgeVariant(
  status: AutomationStatus,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "paused":
      return "secondary";
    case "disabled":
      return "outline";
  }
}

export function formatAutomationRunCount(count: number): string {
  if (count === 0) return "Never run";
  if (count === 1) return "1 run";
  return `${count.toLocaleString()} runs`;
}

export function formatAutomationSuccessRate(
  successCount: number,
  totalCount: number,
): string {
  if (totalCount === 0) return "N/A";
  const rate = (successCount / totalCount) * 100;
  return `${rate.toFixed(1)}%`;
}
