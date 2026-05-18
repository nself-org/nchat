/**
 * Scheduler Bot - Scheduling Engine
 * Manages scheduled messages and recurring tasks
 */

import { createLogger } from "@/lib/logger";
import type { ChannelId, UserId } from "@/lib/bots";
import { formatDuration } from "@/lib/bots";

const logger = createLogger("Scheduler");

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduledMessage {
  id: string;
  userId: UserId;
  channelId: ChannelId;
  message: string;
  createdAt: Date;
  sendAt: Date;
  status: "pending" | "sent" | "cancelled" | "failed";
  errorMessage?: string;
}

export interface RecurringTask {
  id: string;
  userId: UserId;
  channelId: ChannelId;
  message: string;
  interval: number; // milliseconds
  createdAt: Date;
  nextRun: Date;
  lastRun?: Date;
  runCount: number;
  status: "active" | "paused" | "cancelled";
}

export interface RecurringExecution {
  taskId: string;
  userId: UserId;
  channelId: ChannelId;
  message: string;
  executedAt: Date;
}

// ============================================================================
// STORAGE
// ============================================================================

const scheduledMessages = new Map<string, ScheduledMessage>();
const recurringTasks = new Map<string, RecurringTask>();
const messageTimers = new Map<string, NodeJS.Timeout>();
const recurringTimers = new Map<string, NodeJS.Timeout>();

let idCounter = 1;

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${(idCounter++).toString(36)}`;
}

// ============================================================================
// SCHEDULED MESSAGES
// ============================================================================

/**
 * Schedule a message
 */
export function scheduleMessage(
  userId: UserId,
  channelId: ChannelId,
  message: string,
  delay: number,
  onSend: (msg: ScheduledMessage) => Promise<void>,
): ScheduledMessage {
  const scheduled: ScheduledMessage = {
    id: generateId("sched"),
    userId,
    channelId,
    message,
    createdAt: new Date(),
    sendAt: new Date(Date.now() + delay),
    status: "pending",
  };

  scheduledMessages.set(scheduled.id, scheduled);

  // Schedule timer
  const timer = setTimeout(async () => {
    messageTimers.delete(scheduled.id);
    scheduled.status = "sent";

    try {
      await onSend(scheduled);
      logger.info("Scheduled message sent", { id: scheduled.id });
    } catch (error) {
      scheduled.status = "failed";
      scheduled.errorMessage = (error as Error).message;
      logger.error("Failed to send scheduled message", error as Error, {
        id: scheduled.id,
      });
    }
  }, delay);

  messageTimers.set(scheduled.id, timer);

  logger.info("Message scheduled", {
    id: scheduled.id,
    sendAt: scheduled.sendAt,
    delay,
  });

  return scheduled;
}

/**
 * Cancel a scheduled message
 */
export function cancelScheduledMessage(
  scheduleId: string,
  userId?: UserId,
): boolean {
  const scheduled = scheduledMessages.get(scheduleId);

  if (!scheduled) {
    return false;
  }

  // Check permission
  if (userId && scheduled.userId !== userId) {
    return false;
  }

  if (scheduled.status !== "pending") {
    return false;
  }

  scheduled.status = "cancelled";

  // Cancel timer
  const timer = messageTimers.get(scheduleId);
  if (timer) {
    clearTimeout(timer);
    messageTimers.delete(scheduleId);
  }

  logger.info("Scheduled message cancelled", { id: scheduleId });

  return true;
}

/**
 * Get scheduled message
 */
export function getScheduledMessage(
  scheduleId: string,
): ScheduledMessage | undefined {
  return scheduledMessages.get(scheduleId);
}

/**
 * Get user's scheduled messages
 */
export function getUserScheduledMessages(userId: UserId): ScheduledMessage[] {
  return Array.from(scheduledMessages.values())
    .filter((m) => m.userId === userId && m.status === "pending")
    .sort((a, b) => a.sendAt.getTime() - b.sendAt.getTime());
}

/**
 * Get channel's scheduled messages
 */
export function getChannelScheduledMessages(
  channelId: ChannelId,
): ScheduledMessage[] {
  return Array.from(scheduledMessages.values())
    .filter((m) => m.channelId === channelId && m.status === "pending")
    .sort((a, b) => a.sendAt.getTime() - b.sendAt.getTime());
}

// ============================================================================
// RECURRING TASKS
// ============================================================================

/**
 * Create a recurring task
 */
export function createRecurringTask(
  userId: UserId,
  channelId: ChannelId,
  message: string,
  interval: number,
  onExecute: (execution: RecurringExecution) => Promise<void>,
): RecurringTask {
  const task: RecurringTask = {
    id: generateId("task"),
    userId,
    channelId,
    message,
    interval,
    createdAt: new Date(),
    nextRun: new Date(Date.now() + interval),
    runCount: 0,
    status: "active",
  };

  recurringTasks.set(task.id, task);

  // Schedule recurring execution
  scheduleRecurringExecution(task, onExecute);

  logger.info("Recurring task created", {
    id: task.id,
    interval,
    nextRun: task.nextRun,
  });

  return task;
}

/**
 * Schedule recurring execution
 */
function scheduleRecurringExecution(
  task: RecurringTask,
  onExecute: (execution: RecurringExecution) => Promise<void>,
): void {
  const delay = task.nextRun.getTime() - Date.now();

  const timer = setTimeout(async () => {
    if (task.status !== "active") {
      recurringTimers.delete(task.id);
      return;
    }

    // Execute task
    const execution: RecurringExecution = {
      taskId: task.id,
      userId: task.userId,
      channelId: task.channelId,
      message: task.message,
      executedAt: new Date(),
    };

    try {
      await onExecute(execution);
      task.lastRun = new Date();
      task.runCount++;
      logger.info("Recurring task executed", {
        id: task.id,
        runCount: task.runCount,
      });
    } catch (error) {
      logger.error("Failed to execute recurring task", error as Error, {
        id: task.id,
      });
    }

    // Schedule next execution
    task.nextRun = new Date(Date.now() + task.interval);
    scheduleRecurringExecution(task, onExecute);
  }, delay);

  recurringTimers.set(task.id, timer);
}

/**
 * Cancel a recurring task
 */
export function cancelRecurringTask(taskId: string, userId?: UserId): boolean {
  const task = recurringTasks.get(taskId);

  if (!task) {
    return false;
  }

  // Check permission
  if (userId && task.userId !== userId) {
    return false;
  }

  if (task.status === "cancelled") {
    return false;
  }

  task.status = "cancelled";

  // Cancel timer
  const timer = recurringTimers.get(taskId);
  if (timer) {
    clearTimeout(timer);
    recurringTimers.delete(taskId);
  }

  logger.info("Recurring task cancelled", { id: taskId });

  return true;
}

/**
 * Pause a recurring task
 */
export function pauseRecurringTask(taskId: string, userId?: UserId): boolean {
  const task = recurringTasks.get(taskId);

  if (!task) {
    return false;
  }

  // Check permission
  if (userId && task.userId !== userId) {
    return false;
  }

  if (task.status !== "active") {
    return false;
  }

  task.status = "paused";

  // Cancel timer
  const timer = recurringTimers.get(taskId);
  if (timer) {
    clearTimeout(timer);
    recurringTimers.delete(taskId);
  }

  logger.info("Recurring task paused", { id: taskId });

  return true;
}

/**
 * Resume a paused recurring task
 */
export function resumeRecurringTask(
  taskId: string,
  userId: UserId,
  onExecute: (execution: RecurringExecution) => Promise<void>,
): boolean {
  const task = recurringTasks.get(taskId);

  if (!task) {
    return false;
  }

  // Check permission
  if (task.userId !== userId) {
    return false;
  }

  if (task.status !== "paused") {
    return false;
  }

  task.status = "active";
  task.nextRun = new Date(Date.now() + task.interval);

  // Schedule next execution
  scheduleRecurringExecution(task, onExecute);

  logger.info("Recurring task resumed", { id: taskId });

  return true;
}

/**
 * Get recurring task
 */
export function getRecurringTask(taskId: string): RecurringTask | undefined {
  return recurringTasks.get(taskId);
}

/**
 * Get user's recurring tasks
 */
export function getRecurringTasks(userId: UserId): RecurringTask[] {
  return Array.from(recurringTasks.values())
    .filter((t) => t.userId === userId && t.status === "active")
    .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime());
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format scheduled message for display
 */
export function formatScheduledMessage(msg: ScheduledMessage): string {
  const timeUntil = msg.sendAt.getTime() - Date.now();
  const timeStr = timeUntil > 0 ? `in ${formatDuration(timeUntil)}` : "overdue";

  return `**${msg.id}** - ${timeStr}\n  "${msg.message}"\n  Channel: <#${msg.channelId}>`;
}

/**
 * Format scheduled messages list
 */
export function formatScheduleList(messages: ScheduledMessage[]): string {
  if (messages.length === 0) {
    return "You have no scheduled messages.";
  }

  let result = `**Your Scheduled Messages (${messages.length}):**\n\n`;
  for (const msg of messages) {
    result += formatScheduledMessage(msg) + "\n\n";
  }

  result += "\n*Use `/cancelschedule <id>` to cancel a scheduled message*";
  return result;
}

/**
 * Format recurring task for display
 */
export function formatRecurringTask(task: RecurringTask): string {
  const timeUntil = task.nextRun.getTime() - Date.now();
  const nextStr = timeUntil > 0 ? `in ${formatDuration(timeUntil)}` : "soon";

  return `**${task.id}** - Every ${formatDuration(task.interval)}\n  "${task.message}"\n  Next run: ${nextStr} | Runs: ${task.runCount}`;
}

/**
 * Format recurring tasks list
 */
export function formatRecurringTaskList(tasks: RecurringTask[]): string {
  if (tasks.length === 0) {
    return "You have no recurring tasks.";
  }

  let result = `**Your Recurring Tasks (${tasks.length}):**\n\n`;
  for (const task of tasks) {
    result += formatRecurringTask(task) + "\n\n";
  }

  result += "\n*Use `/cancelrecurring <id>` to cancel a recurring task*";
  return result;
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clean up old completed/cancelled messages
 */
export function cleanupOldMessages(maxAge = 7 * 24 * 60 * 60 * 1000): number {
  const cutoff = new Date(Date.now() - maxAge);
  let deleted = 0;

  for (const [id, msg] of scheduledMessages.entries()) {
    if (
      (msg.status === "sent" ||
        msg.status === "cancelled" ||
        msg.status === "failed") &&
      msg.sendAt < cutoff
    ) {
      scheduledMessages.delete(id);
      deleted++;
    }
  }

  logger.info("Cleaned up old messages", { deleted });
  return deleted;
}

/**
 * Stop all timers
 */
export function stopAllTimers(): void {
  for (const timer of messageTimers.values()) {
    clearTimeout(timer);
  }
  for (const timer of recurringTimers.values()) {
    clearTimeout(timer);
  }

  messageTimers.clear();
  recurringTimers.clear();

  logger.info("All timers stopped");
}

/**
 * Clear all schedules
 */
export function clearAllSchedules(): void {
  stopAllTimers();
  scheduledMessages.clear();
  recurringTasks.clear();

  logger.info("All schedules cleared");
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics
 */
export function getStats(): {
  scheduledMessages: {
    total: number;
    pending: number;
    sent: number;
    cancelled: number;
    failed: number;
  };
  recurringTasks: {
    total: number;
    active: number;
    paused: number;
    cancelled: number;
    totalRuns: number;
  };
} {
  const messageStats = {
    total: scheduledMessages.size,
    pending: 0,
    sent: 0,
    cancelled: 0,
    failed: 0,
  };

  for (const msg of scheduledMessages.values()) {
    messageStats[msg.status]++;
  }

  const taskStats = {
    total: recurringTasks.size,
    active: 0,
    paused: 0,
    cancelled: 0,
    totalRuns: 0,
  };

  for (const task of recurringTasks.values()) {
    taskStats[task.status]++;
    taskStats.totalRuns += task.runCount;
  }

  return {
    scheduledMessages: messageStats,
    recurringTasks: taskStats,
  };
}

// ============================================================================
// PERSISTENCE
// ============================================================================

/**
 * Export all schedules
 */
export function exportSchedules(): {
  messages: ScheduledMessage[];
  tasks: RecurringTask[];
} {
  return {
    messages: Array.from(scheduledMessages.values()),
    tasks: Array.from(recurringTasks.values()),
  };
}

/**
 * Import schedules
 */
export function importSchedules(
  messages: ScheduledMessage[],
  tasks: RecurringTask[],
  onExecute: (
    execution: RecurringExecution | ScheduledMessage,
  ) => Promise<void>,
): void {
  // Import scheduled messages
  for (const msg of messages) {
    // Rehydrate dates
    msg.createdAt = new Date(msg.createdAt);
    msg.sendAt = new Date(msg.sendAt);

    scheduledMessages.set(msg.id, msg);

    // Reschedule if still pending
    if (msg.status === "pending") {
      const delay = msg.sendAt.getTime() - Date.now();
      if (delay > 0) {
        scheduleMessage(
          msg.userId,
          msg.channelId,
          msg.message,
          delay,
          onExecute as any,
        );
      }
    }
  }

  // Import recurring tasks
  for (const task of tasks) {
    // Rehydrate dates
    task.createdAt = new Date(task.createdAt);
    task.nextRun = new Date(task.nextRun);
    if (task.lastRun) task.lastRun = new Date(task.lastRun);

    recurringTasks.set(task.id, task);

    // Reschedule if active
    if (task.status === "active") {
      scheduleRecurringExecution(task, onExecute as any);
    }
  }

  logger.info("Imported schedules", {
    messages: messages.length,
    tasks: tasks.length,
  });
}
