/**
 * Meeting Reminders - Utilities for managing meeting reminders
 *
 * Handles reminder scheduling, notifications, and timing calculations
 */

import { Meeting, MeetingReminder, ReminderTiming } from "./meeting-types";

// ============================================================================
// Constants
// ============================================================================

export const REMINDER_TIMINGS: ReminderTiming[] = [
  "5min",
  "10min",
  "15min",
  "30min",
  "1hour",
  "1day",
];

export const REMINDER_LABELS: Record<ReminderTiming, string> = {
  "5min": "5 minutes before",
  "10min": "10 minutes before",
  "15min": "15 minutes before",
  "30min": "30 minutes before",
  "1hour": "1 hour before",
  "1day": "1 day before",
};

export const REMINDER_MILLISECONDS: Record<ReminderTiming, number> = {
  "5min": 5 * 60 * 1000,
  "10min": 10 * 60 * 1000,
  "15min": 15 * 60 * 1000,
  "30min": 30 * 60 * 1000,
  "1hour": 60 * 60 * 1000,
  "1day": 24 * 60 * 60 * 1000,
};

export const DEFAULT_REMINDERS: ReminderTiming[] = ["15min"];

// ============================================================================
// Reminder Time Calculations
// ============================================================================

/**
 * Calculate when a reminder should fire based on meeting start time
 */
export function calculateReminderTime(
  meetingStartTime: Date | string,
  timing: ReminderTiming,
): Date {
  const startTime =
    typeof meetingStartTime === "string"
      ? new Date(meetingStartTime)
      : meetingStartTime;

  return new Date(startTime.getTime() - REMINDER_MILLISECONDS[timing]);
}

/**
 * Check if a reminder should have already been sent
 */
export function shouldReminderBeSent(
  meetingStartTime: Date | string,
  timing: ReminderTiming,
  currentTime: Date = new Date(),
): boolean {
  const reminderTime = calculateReminderTime(meetingStartTime, timing);
  return currentTime >= reminderTime;
}

/**
 * Get time until reminder fires in milliseconds
 */
export function getTimeUntilReminder(
  meetingStartTime: Date | string,
  timing: ReminderTiming,
  currentTime: Date = new Date(),
): number {
  const reminderTime = calculateReminderTime(meetingStartTime, timing);
  return Math.max(0, reminderTime.getTime() - currentTime.getTime());
}

/**
 * Get the next pending reminder for a meeting
 */
export function getNextPendingReminder(
  reminders: MeetingReminder[],
  meetingStartTime: Date | string,
  currentTime: Date = new Date(),
): MeetingReminder | null {
  const pendingReminders = reminders
    .filter((r) => r.isEnabled && !r.sentAt)
    .sort((a, b) => {
      const timeA = getTimeUntilReminder(
        meetingStartTime,
        a.timing,
        currentTime,
      );
      const timeB = getTimeUntilReminder(
        meetingStartTime,
        b.timing,
        currentTime,
      );
      return timeA - timeB;
    });

  return pendingReminders[0] ?? null;
}

/**
 * Get all reminders that need to be sent now
 */
export function getRemindersToSend(
  reminders: MeetingReminder[],
  meetingStartTime: Date | string,
  currentTime: Date = new Date(),
): MeetingReminder[] {
  return reminders.filter((r) => {
    if (!r.isEnabled || r.sentAt) {
      return false;
    }
    return shouldReminderBeSent(meetingStartTime, r.timing, currentTime);
  });
}

// ============================================================================
// Reminder Creation Utilities
// ============================================================================

/**
 * Create default reminders for a meeting
 */
export function createDefaultReminders(
  meetingId: string,
  userId: string,
  timings: ReminderTiming[] = DEFAULT_REMINDERS,
): Omit<MeetingReminder, "id">[] {
  return timings.map((timing) => ({
    meetingId,
    userId,
    timing,
    sentAt: null,
    isEnabled: true,
  }));
}

/**
 * Merge user reminder preferences with defaults
 */
export function mergeReminders(
  existingReminders: MeetingReminder[],
  preferredTimings: ReminderTiming[],
): MeetingReminder[] {
  const existingTimings = new Set(existingReminders.map((r) => r.timing));

  // Update existing reminders
  const updatedReminders = existingReminders.map((r) => ({
    ...r,
    isEnabled: preferredTimings.includes(r.timing),
  }));

  // Note: New timings would need to be created via the API
  // This function just updates the enabled state

  return updatedReminders;
}

// ============================================================================
// Notification Content
// ============================================================================

export interface ReminderNotification {
  title: string;
  body: string;
  meetingId: string;
  meetingLink: string;
  timing: ReminderTiming;
}

/**
 * Generate notification content for a reminder
 */
export function generateReminderNotification(
  meeting: Meeting,
  timing: ReminderTiming,
): ReminderNotification {
  const timeLabel = REMINDER_LABELS[timing];

  return {
    title: `Meeting in ${formatTimingShort(timing)}`,
    body: meeting.title,
    meetingId: meeting.id,
    meetingLink: meeting.meetingLink,
    timing,
  };
}

/**
 * Format timing as short string (e.g., "5 min", "1 hr")
 */
export function formatTimingShort(timing: ReminderTiming): string {
  switch (timing) {
    case "5min":
      return "5 min";
    case "10min":
      return "10 min";
    case "15min":
      return "15 min";
    case "30min":
      return "30 min";
    case "1hour":
      return "1 hr";
    case "1day":
      return "1 day";
    default:
      return timing;
  }
}

// ============================================================================
// Browser Notification Utilities
// ============================================================================

/**
 * Check if browser notifications are supported and enabled
 */
export function canShowBrowserNotification(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  return Notification.permission === "granted";
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/**
 * Show a browser notification for a meeting reminder
 */
export function showReminderNotification(
  notification: ReminderNotification,
  onClick?: () => void,
): void {
  if (!canShowBrowserNotification()) {
    return;
  }

  const browserNotification = new Notification(notification.title, {
    body: notification.body,
    icon: "/icons/meeting-icon.png",
    tag: `meeting-reminder-${notification.meetingId}`,
    requireInteraction: true,
  });

  if (onClick) {
    browserNotification.onclick = () => {
      onClick();
      browserNotification.close();
    };
  }

  // Auto-close after 30 seconds
  setTimeout(() => {
    browserNotification.close();
  }, 30000);
}

// ============================================================================
// Reminder Schedule Management
// ============================================================================

interface ScheduledReminder {
  meetingId: string;
  timing: ReminderTiming;
  timeoutId: ReturnType<typeof setTimeout>;
}

const scheduledReminders: Map<string, ScheduledReminder> = new Map();

/**
 * Get unique key for a reminder
 */
function getReminderKey(meetingId: string, timing: ReminderTiming): string {
  return `${meetingId}:${timing}`;
}

/**
 * Schedule a reminder to fire at the appropriate time
 */
export function scheduleReminder(
  meeting: Meeting,
  timing: ReminderTiming,
  onReminder: (notification: ReminderNotification) => void,
): void {
  const key = getReminderKey(meeting.id, timing);

  // Cancel existing scheduled reminder
  cancelReminder(meeting.id, timing);

  const timeUntil = getTimeUntilReminder(meeting.scheduledStartAt, timing);

  if (timeUntil <= 0) {
    // Reminder time has passed
    return;
  }

  const timeoutId = setTimeout(() => {
    const notification = generateReminderNotification(meeting, timing);
    onReminder(notification);
    scheduledReminders.delete(key);
  }, timeUntil);

  scheduledReminders.set(key, {
    meetingId: meeting.id,
    timing,
    timeoutId,
  });
}

/**
 * Cancel a scheduled reminder
 */
export function cancelReminder(
  meetingId: string,
  timing: ReminderTiming,
): void {
  const key = getReminderKey(meetingId, timing);
  const scheduled = scheduledReminders.get(key);

  if (scheduled) {
    clearTimeout(scheduled.timeoutId);
    scheduledReminders.delete(key);
  }
}

/**
 * Cancel all reminders for a meeting
 */
export function cancelAllReminders(meetingId: string): void {
  for (const [key, scheduled] of scheduledReminders.entries()) {
    if (scheduled.meetingId === meetingId) {
      clearTimeout(scheduled.timeoutId);
      scheduledReminders.delete(key);
    }
  }
}

/**
 * Schedule all reminders for a meeting
 */
export function scheduleAllReminders(
  meeting: Meeting,
  reminders: MeetingReminder[],
  onReminder: (notification: ReminderNotification) => void,
): void {
  const enabledReminders = reminders.filter((r) => r.isEnabled && !r.sentAt);

  for (const reminder of enabledReminders) {
    scheduleReminder(meeting, reminder.timing, onReminder);
  }
}

/**
 * Get list of all currently scheduled reminders
 */
export function getScheduledReminders(): Array<{
  meetingId: string;
  timing: ReminderTiming;
}> {
  return Array.from(scheduledReminders.values()).map(
    ({ meetingId, timing }) => ({
      meetingId,
      timing,
    }),
  );
}
