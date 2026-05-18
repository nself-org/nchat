/**
 * Workflow Scheduler
 *
 * Manages cron-based scheduling, delayed execution, and one-time triggers.
 * Provides timezone-aware cron evaluation and next-run calculation.
 */

import { generateId } from "../app-lifecycle";
import type {
  WorkflowDefinition,
  ScheduledExecution,
  WorkflowRunStatus,
  WorkflowAuditEntry,
  WorkflowAuditEventType,
} from "./types";
import {
  getNextCronTime,
  matchesCron,
  parseCronExpression,
} from "./trigger-engine";

// ============================================================================
// SCHEDULER STORE
// ============================================================================

/**
 * In-memory store for scheduled executions.
 */
export class ScheduleStore {
  private schedules: Map<string, ScheduledExecution> = new Map();

  get(id: string): ScheduledExecution | undefined {
    return this.schedules.get(id);
  }

  getByWorkflowId(workflowId: string): ScheduledExecution | undefined {
    for (const schedule of this.schedules.values()) {
      if (schedule.workflowId === workflowId) {
        return schedule;
      }
    }
    return undefined;
  }

  list(filter?: {
    active?: boolean;
    workflowId?: string;
  }): ScheduledExecution[] {
    let schedules = Array.from(this.schedules.values());
    if (filter?.active !== undefined) {
      schedules = schedules.filter((s) => s.active === filter.active);
    }
    if (filter?.workflowId) {
      schedules = schedules.filter((s) => s.workflowId === filter.workflowId);
    }
    return schedules;
  }

  save(schedule: ScheduledExecution): void {
    this.schedules.set(schedule.id, schedule);
  }

  delete(id: string): boolean {
    return this.schedules.delete(id);
  }

  clear(): void {
    this.schedules.clear();
  }
}

// ============================================================================
// SCHEDULER
// ============================================================================

export interface SchedulerConfig {
  /** Custom time function (for testing) */
  nowFn?: () => Date;
  /** Tick interval in ms (how often to check schedules, default: 60000) */
  tickIntervalMs: number;
}

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  tickIntervalMs: 60000,
};

/**
 * Workflow scheduler. Manages cron-based schedule evaluation
 * and next-run calculation.
 */
export class WorkflowScheduler {
  private store: ScheduleStore;
  private config: SchedulerConfig;
  private auditLog: WorkflowAuditEntry[] = [];
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  /** Callback when a schedule fires - the consumer should start the workflow run */
  onScheduleFired?: (schedule: ScheduledExecution) => void;

  constructor(store?: ScheduleStore, config?: Partial<SchedulerConfig>) {
    this.store = store ?? new ScheduleStore();
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
  }

  // ==========================================================================
  // SCHEDULE MANAGEMENT
  // ==========================================================================

  /**
   * Create a schedule from a workflow definition.
   */
  createSchedule(workflow: WorkflowDefinition): ScheduledExecution {
    if (workflow.trigger.type !== "schedule") {
      throw new SchedulerError(
        "Workflow trigger is not a schedule trigger",
        "INVALID_TRIGGER_TYPE",
      );
    }

    const trigger = workflow.trigger;
    const cronFields = parseCronExpression(trigger.cronExpression);
    if (!cronFields) {
      throw new SchedulerError(
        `Invalid cron expression: ${trigger.cronExpression}`,
        "INVALID_CRON",
      );
    }

    // Check for existing schedule for this workflow
    const existing = this.store.getByWorkflowId(workflow.id);
    if (existing) {
      // Update existing
      existing.cronExpression = trigger.cronExpression;
      existing.timezone = trigger.timezone;
      existing.startDate = trigger.startDate;
      existing.endDate = trigger.endDate;
      existing.active = workflow.enabled;

      const nextRun = getNextCronTime(
        trigger.cronExpression,
        this.now(),
        trigger.timezone,
      );
      if (nextRun) {
        existing.nextRunAt = nextRun.toISOString();
      }

      this.store.save(existing);
      this.audit("workflow.schedule_updated", workflow.id, "system", {
        cronExpression: trigger.cronExpression,
        timezone: trigger.timezone,
      });
      return existing;
    }

    const now = this.now();
    const nextRun = getNextCronTime(
      trigger.cronExpression,
      now,
      trigger.timezone,
    );

    const schedule: ScheduledExecution = {
      id: generateId("sched"),
      workflowId: workflow.id,
      cronExpression: trigger.cronExpression,
      timezone: trigger.timezone,
      nextRunAt: nextRun
        ? nextRun.toISOString()
        : new Date(now.getTime() + 60000).toISOString(),
      active: workflow.enabled,
      createdAt: now.toISOString(),
      startDate: trigger.startDate,
      endDate: trigger.endDate,
    };

    this.store.save(schedule);
    this.audit("workflow.schedule_created", workflow.id, "system", {
      cronExpression: trigger.cronExpression,
      timezone: trigger.timezone,
      nextRunAt: schedule.nextRunAt,
    });

    return schedule;
  }

  /**
   * Remove a schedule.
   */
  removeSchedule(scheduleId: string): boolean {
    const schedule = this.store.get(scheduleId);
    if (!schedule) return false;

    this.audit("workflow.schedule_deleted", schedule.workflowId, "system", {
      scheduleId,
    });

    return this.store.delete(scheduleId);
  }

  /**
   * Pause a schedule.
   */
  pauseSchedule(scheduleId: string): ScheduledExecution {
    const schedule = this.store.get(scheduleId);
    if (!schedule) {
      throw new SchedulerError(
        `Schedule not found: ${scheduleId}`,
        "SCHEDULE_NOT_FOUND",
      );
    }
    schedule.active = false;
    this.store.save(schedule);
    return schedule;
  }

  /**
   * Resume a schedule.
   */
  resumeSchedule(scheduleId: string): ScheduledExecution {
    const schedule = this.store.get(scheduleId);
    if (!schedule) {
      throw new SchedulerError(
        `Schedule not found: ${scheduleId}`,
        "SCHEDULE_NOT_FOUND",
      );
    }
    schedule.active = true;

    // Recalculate next run
    const nextRun = getNextCronTime(
      schedule.cronExpression,
      this.now(),
      schedule.timezone,
    );
    if (nextRun) {
      schedule.nextRunAt = nextRun.toISOString();
    }

    this.store.save(schedule);
    return schedule;
  }

  // ==========================================================================
  // TICK PROCESSING
  // ==========================================================================

  /**
   * Process all due schedules at the current time.
   * Returns the list of schedules that fired.
   */
  tick(currentTime?: Date): ScheduledExecution[] {
    const now = currentTime ?? this.now();
    const activeSchedules = this.store.list({ active: true });
    const fired: ScheduledExecution[] = [];

    for (const schedule of activeSchedules) {
      // Check date bounds
      if (schedule.startDate && new Date(schedule.startDate) > now) {
        continue;
      }
      if (schedule.endDate && new Date(schedule.endDate) < now) {
        schedule.active = false;
        this.store.save(schedule);
        continue;
      }

      // Check if the scheduled time has arrived
      const nextRun = new Date(schedule.nextRunAt);
      if (nextRun <= now) {
        // Fire the schedule
        schedule.lastRunAt = now.toISOString();

        // Calculate next run time
        const nextExecution = getNextCronTime(
          schedule.cronExpression,
          now,
          schedule.timezone,
        );
        if (nextExecution) {
          schedule.nextRunAt = nextExecution.toISOString();
        } else {
          // No more valid execution times
          schedule.active = false;
        }

        this.store.save(schedule);

        this.audit("workflow.schedule_fired", schedule.workflowId, "system", {
          scheduleId: schedule.id,
          firedAt: now.toISOString(),
          nextRunAt: schedule.nextRunAt,
        });

        if (this.onScheduleFired) {
          this.onScheduleFired(schedule);
        }

        fired.push(schedule);
      }
    }

    return fired;
  }

  /**
   * Start the scheduler tick loop.
   */
  start(): void {
    if (this.tickInterval) return;

    this.tickInterval = setInterval(() => {
      this.tick();
    }, this.config.tickIntervalMs);
  }

  /**
   * Stop the scheduler tick loop.
   */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Update the last run status for a schedule.
   */
  updateLastRunStatus(scheduleId: string, status: WorkflowRunStatus): void {
    const schedule = this.store.get(scheduleId);
    if (schedule) {
      schedule.lastRunStatus = status;
      this.store.save(schedule);
    }
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * Get a schedule by ID.
   */
  getSchedule(id: string): ScheduledExecution | undefined {
    return this.store.get(id);
  }

  /**
   * Get schedule by workflow ID.
   */
  getScheduleByWorkflow(workflowId: string): ScheduledExecution | undefined {
    return this.store.getByWorkflowId(workflowId);
  }

  /**
   * List all schedules.
   */
  listSchedules(filter?: { active?: boolean }): ScheduledExecution[] {
    return this.store.list(filter);
  }

  /**
   * Get the next N upcoming scheduled executions across all workflows.
   */
  getUpcomingExecutions(limit: number = 10): ScheduledExecution[] {
    return this.store
      .list({ active: true })
      .sort(
        (a, b) =>
          new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime(),
      )
      .slice(0, limit);
  }

  /**
   * Get the audit log.
   */
  getAuditLog(): WorkflowAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.stop();
    this.store.clear();
    this.auditLog = [];
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private audit(
    eventType: WorkflowAuditEventType,
    workflowId: string,
    actorId: string = "system",
    data?: Record<string, unknown>,
  ): void {
    const entry: WorkflowAuditEntry = {
      id: generateId("audit"),
      eventType,
      workflowId,
      actorId,
      timestamp: this.now().toISOString(),
      description: `${eventType} for workflow ${workflowId}`,
      data,
    };
    this.auditLog.push(entry);
  }

  private now(): Date {
    return this.config.nowFn ? this.config.nowFn() : new Date();
  }
}

// ============================================================================
// ERRORS
// ============================================================================

export class SchedulerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SchedulerError";
  }
}
