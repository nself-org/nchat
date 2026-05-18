/**
 * Reminder Bot Scheduler
 * Manages reminder scheduling and execution
 */

import { randomBytes } from "crypto";
import type { BotApi, BotResponse, ChannelId, UserId } from "@/lib/bots";
import { response, embed, mentionUser, formatDuration } from "@/lib/bots";

// ============================================================================
// REMINDER TYPES
// ============================================================================

export interface Reminder {
  id: string;
  userId: UserId;
  channelId: ChannelId;
  message: string;
  createdAt: Date;
  remindAt: Date;
  isChannel: boolean; // Remind entire channel vs just user
  snoozedCount: number;
  status: "pending" | "triggered" | "cancelled" | "snoozed";
}

// ============================================================================
// REMINDER STORAGE
// ============================================================================

// In-memory storage (in production, use persistent storage via api.setStorage)
const reminders = new Map<string, Reminder>();
const timers = new Map<string, NodeJS.Timeout>();

/**
 * Generate a unique reminder ID
 */
export function generateReminderId(): string {
  return `rem_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

/**
 * Create a new reminder
 */
export function createReminder(
  userId: UserId,
  channelId: ChannelId,
  message: string,
  delay: number,
  isChannel = false,
): Reminder {
  const reminder: Reminder = {
    id: generateReminderId(),
    userId,
    channelId,
    message,
    createdAt: new Date(),
    remindAt: new Date(Date.now() + delay),
    isChannel,
    snoozedCount: 0,
    status: "pending",
  };

  reminders.set(reminder.id, reminder);
  return reminder;
}

/**
 * Get a reminder by ID
 */
export function getReminder(reminderId: string): Reminder | undefined {
  return reminders.get(reminderId);
}

/**
 * Get all reminders for a user
 */
export function getUserReminders(userId: UserId): Reminder[] {
  return Array.from(reminders.values())
    .filter((r) => r.userId === userId && r.status === "pending")
    .sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());
}

/**
 * Cancel a reminder
 */
export function cancelReminder(
  reminderId: string,
  userId: UserId,
): { success: boolean; message: string } {
  const reminder = reminders.get(reminderId);

  if (!reminder) {
    return { success: false, message: "Reminder not found" };
  }

  if (reminder.userId !== userId) {
    return {
      success: false,
      message: "You can only cancel your own reminders",
    };
  }

  if (reminder.status !== "pending") {
    return { success: false, message: "This reminder is no longer active" };
  }

  reminder.status = "cancelled";

  // Cancel the timer
  const timer = timers.get(reminderId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(reminderId);
  }

  return { success: true, message: "Reminder cancelled" };
}

/**
 * Snooze a reminder
 */
export function snoozeReminder(
  reminderId: string,
  userId: UserId,
  duration: number,
): { success: boolean; message: string; reminder?: Reminder } {
  const reminder = reminders.get(reminderId);

  if (!reminder) {
    return { success: false, message: "Reminder not found" };
  }

  if (reminder.userId !== userId) {
    return {
      success: false,
      message: "You can only snooze your own reminders",
    };
  }

  // Cancel existing timer
  const existingTimer = timers.get(reminderId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    timers.delete(reminderId);
  }

  // Update reminder
  reminder.remindAt = new Date(Date.now() + duration);
  reminder.snoozedCount++;
  reminder.status = "pending";

  return { success: true, message: "Reminder snoozed", reminder };
}

// ============================================================================
// SCHEDULER
// ============================================================================

/**
 * Schedule a reminder to be triggered
 */
export function scheduleReminder(
  reminder: Reminder,
  onTrigger: (reminder: Reminder) => void,
): void {
  const delay = reminder.remindAt.getTime() - Date.now();

  if (delay <= 0) {
    // Trigger immediately if already past
    onTrigger(reminder);
    return;
  }

  const timer = setTimeout(() => {
    timers.delete(reminder.id);
    reminder.status = "triggered";
    onTrigger(reminder);
  }, delay);

  timers.set(reminder.id, timer);
}

/**
 * Build reminder trigger message
 */
export function buildReminderMessage(reminder: Reminder): BotResponse {
  const userMention = mentionUser(reminder.userId);
  const snoozeInfo =
    reminder.snoozedCount > 0
      ? ` (snoozed ${reminder.snoozedCount} time${reminder.snoozedCount > 1 ? "s" : ""})`
      : "";

  if (reminder.isChannel) {
    return response()
      .embed(
        embed()
          .title(":bell: Channel Reminder")
          .description(reminder.message)
          .color("#F59E0B")
          .footer(`Set by ${userMention}${snoozeInfo}`)
          .timestamp(),
      )
      .build();
  }

  return response()
    .embed(
      embed()
        .title(":bell: Reminder")
        .description(reminder.message)
        .color("#6366F1")
        .footer(`Reminder ID: ${reminder.id}${snoozeInfo}`)
        .field("Snooze", `/snooze ${reminder.id}`, true)
        .timestamp(),
    )
    .text(`${userMention}, here's your reminder!`)
    .build();
}

/**
 * Format reminder for list display
 */
export function formatReminder(reminder: Reminder): string {
  const timeUntil = reminder.remindAt.getTime() - Date.now();
  const timeStr = timeUntil > 0 ? `in ${formatDuration(timeUntil)}` : "now";
  const snoozeStr =
    reminder.snoozedCount > 0 ? ` (snoozed ${reminder.snoozedCount}x)` : "";

  return `**${reminder.id}** - ${timeStr}${snoozeStr}\n  "${reminder.message}"`;
}

/**
 * Format list of reminders
 */
export function formatReminderList(reminderList: Reminder[]): string {
  if (reminderList.length === 0) {
    return "You have no active reminders.";
  }

  let result = `**Your Reminders (${reminderList.length}):**\n\n`;
  for (const reminder of reminderList) {
    result += formatReminder(reminder) + "\n\n";
  }

  result += "\n*Use `/cancelreminder <id>` to cancel a reminder*";
  return result;
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clean up old triggered/cancelled reminders
 */
export function cleanupOldReminders(maxAge = 24 * 60 * 60 * 1000): number {
  const cutoff = new Date(Date.now() - maxAge);
  let deleted = 0;

  for (const [id, reminder] of reminders.entries()) {
    if (
      (reminder.status === "triggered" || reminder.status === "cancelled") &&
      reminder.remindAt < cutoff
    ) {
      reminders.delete(id);
      deleted++;
    }
  }

  return deleted;
}

/**
 * Stop all active timers (for shutdown)
 */
export function stopAllTimers(): void {
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }
  timers.clear();
}

/**
 * Clear all reminders and stop all timers
 */
export function clearAllReminders(): void {
  stopAllTimers();
  reminders.clear();
}

/**
 * Get statistics
 */
export function getStats(): {
  total: number;
  pending: number;
  triggered: number;
  cancelled: number;
  snoozed: number;
} {
  const stats = {
    total: reminders.size,
    pending: 0,
    triggered: 0,
    cancelled: 0,
    snoozed: 0,
  };

  for (const reminder of reminders.values()) {
    switch (reminder.status) {
      case "pending":
        stats.pending++;
        break;
      case "triggered":
        stats.triggered++;
        break;
      case "cancelled":
        stats.cancelled++;
        break;
      case "snoozed":
        stats.snoozed++;
        break;
    }
  }

  return stats;
}

// ============================================================================
// PERSISTENCE HELPERS
// ============================================================================

/**
 * Export all reminders for persistence
 */
export function exportReminders(): Reminder[] {
  return Array.from(reminders.values());
}

/**
 * Import reminders from persistence
 */
export function importReminders(
  savedReminders: Reminder[],
  onTrigger: (reminder: Reminder) => void,
): void {
  for (const reminder of savedReminders) {
    // Rehydrate dates
    reminder.createdAt = new Date(reminder.createdAt);
    reminder.remindAt = new Date(reminder.remindAt);

    reminders.set(reminder.id, reminder);

    // Reschedule if still pending
    if (reminder.status === "pending") {
      scheduleReminder(reminder, onTrigger);
    }
  }
}
