/**
 * Trigger Engine
 *
 * Evaluates workflow triggers against incoming events, schedules,
 * webhook requests, and manual invocations. Determines which workflows
 * should be executed and constructs the initial trigger data.
 */

import type { AppEventType } from "../app-contract";
import type {
  WorkflowDefinition,
  WorkflowTrigger,
  EventTrigger,
  ScheduleTrigger,
  WebhookTrigger,
  ManualTrigger,
  RunTriggerInfo,
  TriggerCondition,
} from "./types";
import { evaluateConditions } from "./workflow-builder";

// ============================================================================
// TRIGGER ENGINE
// ============================================================================

/**
 * Engine for evaluating workflow triggers and determining which
 * workflows should fire in response to events.
 */
export class TriggerEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();

  /**
   * Register a workflow for trigger evaluation.
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Unregister a workflow.
   */
  unregisterWorkflow(workflowId: string): void {
    this.workflows.delete(workflowId);
  }

  /**
   * Get all registered workflows.
   */
  getRegisteredWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  // ==========================================================================
  // EVENT TRIGGERS
  // ==========================================================================

  /**
   * Evaluate all registered workflows against an incoming event.
   * Returns workflows that should be triggered along with trigger info.
   */
  evaluateEvent(
    eventType: AppEventType,
    eventData: Record<string, unknown>,
  ): TriggerMatch[] {
    const matches: TriggerMatch[] = [];

    for (const workflow of this.workflows.values()) {
      if (!workflow.enabled) continue;
      if (workflow.trigger.type !== "event") continue;

      const trigger = workflow.trigger as EventTrigger;
      if (trigger.eventType !== eventType) continue;

      // Check channel filter
      if (trigger.channelIds && trigger.channelIds.length > 0) {
        const eventChannelId = eventData.channelId as string | undefined;
        if (!eventChannelId || !trigger.channelIds.includes(eventChannelId)) {
          continue;
        }
      }

      // Check user filter
      if (trigger.userIds && trigger.userIds.length > 0) {
        const eventUserId = eventData.userId as string | undefined;
        if (!eventUserId || !trigger.userIds.includes(eventUserId)) {
          continue;
        }
      }

      // Check conditions
      if (trigger.conditions && trigger.conditions.length > 0) {
        if (!evaluateConditions(trigger.conditions, eventData)) {
          continue;
        }
      }

      matches.push({
        workflow,
        triggerInfo: {
          type: "event",
          eventData,
        },
      });
    }

    return matches;
  }

  // ==========================================================================
  // SCHEDULE TRIGGERS
  // ==========================================================================

  /**
   * Evaluate all registered workflows to find those whose schedule
   * matches the given time.
   */
  evaluateSchedule(currentTime: Date): TriggerMatch[] {
    const matches: TriggerMatch[] = [];

    for (const workflow of this.workflows.values()) {
      if (!workflow.enabled) continue;
      if (workflow.trigger.type !== "schedule") continue;

      const trigger = workflow.trigger as ScheduleTrigger;

      // Check date bounds
      if (trigger.startDate && new Date(trigger.startDate) > currentTime) {
        continue;
      }
      if (trigger.endDate && new Date(trigger.endDate) < currentTime) {
        continue;
      }

      // Evaluate cron against current time
      if (matchesCron(trigger.cronExpression, currentTime, trigger.timezone)) {
        matches.push({
          workflow,
          triggerInfo: {
            type: "schedule",
            scheduledTime: currentTime.toISOString(),
          },
        });
      }
    }

    return matches;
  }

  // ==========================================================================
  // WEBHOOK TRIGGERS
  // ==========================================================================

  /**
   * Evaluate a workflow against an incoming webhook request.
   */
  evaluateWebhook(
    workflowId: string,
    method: string,
    body: Record<string, unknown>,
    headers: Record<string, string>,
  ): TriggerMatch | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.enabled) return null;
    if (workflow.trigger.type !== "webhook") return null;

    const trigger = workflow.trigger as WebhookTrigger;

    // Check method
    if (!trigger.methods.includes(method as "GET" | "POST" | "PUT")) {
      return null;
    }

    // Check content type
    if (trigger.contentType) {
      const contentType = headers["content-type"] || headers["Content-Type"];
      if (contentType && !contentType.includes(trigger.contentType)) {
        return null;
      }
    }

    // Check conditions
    if (trigger.conditions && trigger.conditions.length > 0) {
      if (!evaluateConditions(trigger.conditions, body)) {
        return null;
      }
    }

    return {
      workflow,
      triggerInfo: {
        type: "webhook",
        webhookData: { body, headers, method },
      },
    };
  }

  // ==========================================================================
  // MANUAL TRIGGERS
  // ==========================================================================

  /**
   * Evaluate a manual trigger for a specific workflow.
   */
  evaluateManual(
    workflowId: string,
    userId: string,
    userRoles: string[],
    inputData: Record<string, unknown>,
  ): TriggerMatch | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.enabled) return null;
    if (workflow.trigger.type !== "manual") return null;

    const trigger = workflow.trigger as ManualTrigger;

    // Check user permissions
    if (trigger.allowedUserIds && trigger.allowedUserIds.length > 0) {
      if (!trigger.allowedUserIds.includes(userId)) {
        return null;
      }
    }

    if (trigger.allowedRoles && trigger.allowedRoles.length > 0) {
      const hasRole = trigger.allowedRoles.some((r) => userRoles.includes(r));
      if (!hasRole) {
        return null;
      }
    }

    // Check conditions
    if (trigger.conditions && trigger.conditions.length > 0) {
      if (!evaluateConditions(trigger.conditions, inputData)) {
        return null;
      }
    }

    return {
      workflow,
      triggerInfo: {
        type: "manual",
        userId,
        eventData: inputData,
      },
    };
  }

  /**
   * Clear all registered workflows.
   */
  clear(): void {
    this.workflows.clear();
  }
}

// ============================================================================
// TRIGGER MATCH
// ============================================================================

/**
 * A match result from trigger evaluation.
 */
export interface TriggerMatch {
  workflow: WorkflowDefinition;
  triggerInfo: RunTriggerInfo;
}

// ============================================================================
// CRON PARSER
// ============================================================================

/**
 * Parse a cron expression into its component fields.
 * Supports 5-field format: minute hour day-of-month month day-of-week
 *
 * Special characters:
 *   * = any value
 *   n = specific value
 *   n-m = range
 *   n,m = list
 *   * /n = every n (step)
 */
export function parseCronExpression(expression: string): CronFields | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }

  try {
    return {
      minute: parseCronField(parts[0], 0, 59),
      hour: parseCronField(parts[1], 0, 23),
      dayOfMonth: parseCronField(parts[2], 1, 31),
      month: parseCronField(parts[3], 1, 12),
      dayOfWeek: parseCronField(parts[4], 0, 6),
    };
  } catch {
    return null;
  }
}

export interface CronFields {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

/**
 * Parse a single cron field into an array of matching values.
 */
export function parseCronField(
  field: string,
  min: number,
  max: number,
): number[] {
  const values = new Set<number>();

  const parts = field.split(",");
  for (const part of parts) {
    // Handle step values (*/n or n-m/s)
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[2], 10);
      const base = stepMatch[1];

      let start = min;
      let end = max;

      if (base !== "*") {
        const rangeMatch = base.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
          start = parseInt(rangeMatch[1], 10);
          end = parseInt(rangeMatch[2], 10);
        } else {
          start = parseInt(base, 10);
          end = max;
        }
      }

      for (let i = start; i <= end; i += step) {
        if (i >= min && i <= max) values.add(i);
      }
      continue;
    }

    // Handle wildcard
    if (part === "*") {
      for (let i = min; i <= max; i++) {
        values.add(i);
      }
      continue;
    }

    // Handle range (n-m)
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= end; i++) {
        if (i >= min && i <= max) values.add(i);
      }
      continue;
    }

    // Handle single value
    const val = parseInt(part, 10);
    if (!isNaN(val) && val >= min && val <= max) {
      values.add(val);
    }
  }

  return Array.from(values).sort((a, b) => a - b);
}

/**
 * Check if a cron expression matches a specific time.
 */
export function matchesCron(
  expression: string,
  time: Date,
  _timezone: string = "UTC",
): boolean {
  const fields = parseCronExpression(expression);
  if (!fields) return false;

  // Use UTC by default (timezone conversion would require a library
  // like luxon in production - for now we use UTC)
  const minute = time.getUTCMinutes();
  const hour = time.getUTCHours();
  const dayOfMonth = time.getUTCDate();
  const month = time.getUTCMonth() + 1; // 1-indexed
  const dayOfWeek = time.getUTCDay(); // 0=Sunday

  return (
    fields.minute.includes(minute) &&
    fields.hour.includes(hour) &&
    fields.dayOfMonth.includes(dayOfMonth) &&
    fields.month.includes(month) &&
    fields.dayOfWeek.includes(dayOfWeek)
  );
}

/**
 * Calculate the next execution time for a cron expression.
 * Returns null if no valid next time found within 1 year.
 */
export function getNextCronTime(
  expression: string,
  after: Date,
  _timezone: string = "UTC",
): Date | null {
  const fields = parseCronExpression(expression);
  if (!fields) return null;

  // Start from the next minute
  const candidate = new Date(after);
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);

  // Safety: don't search more than 1 year ahead
  const maxDate = new Date(after);
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 1);

  while (candidate < maxDate) {
    const minute = candidate.getUTCMinutes();
    const hour = candidate.getUTCHours();
    const dayOfMonth = candidate.getUTCDate();
    const month = candidate.getUTCMonth() + 1;
    const dayOfWeek = candidate.getUTCDay();

    if (
      fields.month.includes(month) &&
      fields.dayOfMonth.includes(dayOfMonth) &&
      fields.dayOfWeek.includes(dayOfWeek) &&
      fields.hour.includes(hour) &&
      fields.minute.includes(minute)
    ) {
      return candidate;
    }

    // Advance by 1 minute
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }

  return null;
}
