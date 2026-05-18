/**
 * Calendar Service - Calendar integration for meetings
 *
 * Provides calendar exports (ICS, Google Calendar, Outlook),
 * reminder scheduling, and timezone handling.
 *
 * @module services/meetings/calendar.service
 * @version 1.0.0
 */

import { v4 as uuid } from "uuid";
import { createLogger } from "@/lib/logger";
import { Meeting, ReminderTiming } from "@/lib/meetings/meeting-types";
import {
  generateGoogleCalendarLink,
  generateOutlookCalendarLink,
  generateICSContent,
  meetingToCalendarEvent,
} from "@/lib/meetings/meeting-links";
import {
  REMINDER_MILLISECONDS,
  calculateReminderTime,
  generateReminderNotification,
  ReminderNotification,
} from "@/lib/meetings/meeting-reminders";

const log = createLogger("CalendarService");

// ============================================================================
// Types
// ============================================================================

export interface ScheduledReminder {
  id: string;
  meetingId: string;
  userId: string;
  timing: ReminderTiming;
  scheduledFor: Date;
  sent: boolean;
  sentAt: Date | null;
}

export interface CalendarExport {
  type: "ics" | "google" | "outlook" | "apple";
  content: string;
  filename?: string;
}

export interface ReminderPreferences {
  userId: string;
  defaultTimings: ReminderTiming[];
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

export interface ReminderDeliveryResult {
  reminderId: string;
  channels: {
    email?: boolean;
    push?: boolean;
    inApp?: boolean;
  };
  error?: string;
}

// ============================================================================
// In-Memory Storage
// ============================================================================

const scheduledReminders = new Map<string, ScheduledReminder>();
const reminderTimers = new Map<string, ReturnType<typeof setTimeout>>();
const userPreferences = new Map<string, ReminderPreferences>();

// Default reminder preferences
const DEFAULT_REMINDER_PREFERENCES: Omit<ReminderPreferences, "userId"> = {
  defaultTimings: ["15min"],
  emailEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
};

// ============================================================================
// Calendar Service Class
// ============================================================================

export class CalendarService {
  private reminderCallback?: (
    notification: ReminderNotification,
    userId: string,
  ) => void;

  /**
   * Set the callback for reminder notifications
   */
  setReminderCallback(
    callback: (notification: ReminderNotification, userId: string) => void,
  ): void {
    this.reminderCallback = callback;
  }

  // ==========================================================================
  // Calendar Exports
  // ==========================================================================

  /**
   * Generate calendar export for a meeting
   */
  generateCalendarExport(
    meeting: Meeting,
    type: "ics" | "google" | "outlook" | "apple",
  ): CalendarExport {
    const event = meetingToCalendarEvent(meeting);

    switch (type) {
      case "google":
        return {
          type: "google",
          content: generateGoogleCalendarLink(event),
        };

      case "outlook":
        return {
          type: "outlook",
          content: generateOutlookCalendarLink(event),
        };

      case "apple":
      case "ics":
        const icsContent = generateICSContent(event, meeting);
        return {
          type: "ics",
          content: icsContent,
          filename: `${meeting.title.replace(/[^a-z0-9]/gi, "-")}.ics`,
        };

      default:
        throw new Error(`Unsupported calendar type: ${type}`);
    }
  }

  /**
   * Generate all calendar links for a meeting
   */
  getAllCalendarLinks(meeting: Meeting): {
    google: string;
    outlook: string;
    ics: string;
  } {
    const event = meetingToCalendarEvent(meeting);

    return {
      google: generateGoogleCalendarLink(event),
      outlook: generateOutlookCalendarLink(event),
      ics: generateICSContent(event, meeting),
    };
  }

  // ==========================================================================
  // Reminder Management
  // ==========================================================================

  /**
   * Schedule reminders for a meeting
   */
  scheduleReminders(
    meeting: Meeting,
    userId: string,
    timings?: ReminderTiming[],
  ): ScheduledReminder[] {
    const preferences = this.getUserPreferences(userId);
    const reminderTimings = timings || preferences.defaultTimings;
    const scheduled: ScheduledReminder[] = [];

    for (const timing of reminderTimings) {
      const reminder = this.scheduleReminder(meeting, userId, timing);
      if (reminder) {
        scheduled.push(reminder);
      }
    }

    log.info("Scheduled reminders for meeting", {
      meetingId: meeting.id,
      userId,
      count: scheduled.length,
    });

    return scheduled;
  }

  /**
   * Schedule a single reminder
   */
  private scheduleReminder(
    meeting: Meeting,
    userId: string,
    timing: ReminderTiming,
  ): ScheduledReminder | null {
    const reminderTime = calculateReminderTime(
      meeting.scheduledStartAt,
      timing,
    );
    const now = new Date();

    // Don't schedule if the reminder time has passed
    if (reminderTime <= now) {
      log.debug("Reminder time has passed, skipping", {
        meetingId: meeting.id,
        timing,
        reminderTime,
      });
      return null;
    }

    const reminderId = uuid();
    const reminder: ScheduledReminder = {
      id: reminderId,
      meetingId: meeting.id,
      userId,
      timing,
      scheduledFor: reminderTime,
      sent: false,
      sentAt: null,
    };

    scheduledReminders.set(reminderId, reminder);

    // Set timer for the reminder
    const msUntilReminder = reminderTime.getTime() - now.getTime();
    const timer = setTimeout(() => {
      this.fireReminder(reminderId, meeting);
    }, msUntilReminder);

    reminderTimers.set(reminderId, timer);

    log.debug("Reminder scheduled", {
      reminderId,
      meetingId: meeting.id,
      timing,
      scheduledFor: reminderTime.toISOString(),
      msUntilReminder,
    });

    return reminder;
  }

  /**
   * Fire a reminder
   */
  private fireReminder(reminderId: string, meeting: Meeting): void {
    const reminder = scheduledReminders.get(reminderId);
    if (!reminder || reminder.sent) {
      return;
    }

    reminder.sent = true;
    reminder.sentAt = new Date();

    // Clean up timer
    reminderTimers.delete(reminderId);

    // Generate notification
    const notification = generateReminderNotification(meeting, reminder.timing);

    log.info("Firing reminder", {
      reminderId,
      meetingId: meeting.id,
      userId: reminder.userId,
      timing: reminder.timing,
    });

    // Call the callback if set
    if (this.reminderCallback) {
      this.reminderCallback(notification, reminder.userId);
    }
  }

  /**
   * Cancel a scheduled reminder
   */
  cancelReminder(reminderId: string): boolean {
    const timer = reminderTimers.get(reminderId);
    if (timer) {
      clearTimeout(timer);
      reminderTimers.delete(reminderId);
    }

    const deleted = scheduledReminders.delete(reminderId);

    if (deleted) {
      log.debug("Reminder cancelled", { reminderId });
    }

    return deleted;
  }

  /**
   * Cancel all reminders for a meeting
   */
  cancelMeetingReminders(meetingId: string): number {
    let cancelledCount = 0;

    const entries = Array.from(scheduledReminders.entries());
    for (const [reminderId, reminder] of entries) {
      if (reminder.meetingId === meetingId) {
        this.cancelReminder(reminderId);
        cancelledCount++;
      }
    }

    log.info("Cancelled meeting reminders", {
      meetingId,
      count: cancelledCount,
    });

    return cancelledCount;
  }

  /**
   * Cancel all reminders for a user
   */
  cancelUserReminders(userId: string): number {
    let cancelledCount = 0;

    const entries = Array.from(scheduledReminders.entries());
    for (const [reminderId, reminder] of entries) {
      if (reminder.userId === userId) {
        this.cancelReminder(reminderId);
        cancelledCount++;
      }
    }

    return cancelledCount;
  }

  /**
   * Get scheduled reminders for a meeting
   */
  getMeetingReminders(meetingId: string): ScheduledReminder[] {
    return Array.from(scheduledReminders.values())
      .filter((r) => r.meetingId === meetingId)
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  /**
   * Get scheduled reminders for a user
   */
  getUserReminders(userId: string): ScheduledReminder[] {
    return Array.from(scheduledReminders.values())
      .filter((r) => r.userId === userId && !r.sent)
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  /**
   * Reschedule reminders when a meeting time changes
   */
  rescheduleReminders(meeting: Meeting): void {
    // Get all reminders for this meeting
    const existingReminders = this.getMeetingReminders(meeting.id);

    // Group by user
    const remindersByUser = new Map<string, ReminderTiming[]>();
    for (const reminder of existingReminders) {
      const timings = remindersByUser.get(reminder.userId) || [];
      timings.push(reminder.timing);
      remindersByUser.set(reminder.userId, timings);
    }

    // Cancel all existing reminders
    this.cancelMeetingReminders(meeting.id);

    // Reschedule for each user
    const userEntries = Array.from(remindersByUser.entries());
    for (const [userId, timings] of userEntries) {
      this.scheduleReminders(meeting, userId, timings);
    }

    log.info("Rescheduled reminders for meeting", {
      meetingId: meeting.id,
      userCount: remindersByUser.size,
    });
  }

  // ==========================================================================
  // User Preferences
  // ==========================================================================

  /**
   * Get user reminder preferences
   */
  getUserPreferences(userId: string): ReminderPreferences {
    const prefs = userPreferences.get(userId);
    if (prefs) {
      return prefs;
    }

    // Return defaults
    return {
      userId,
      ...DEFAULT_REMINDER_PREFERENCES,
    };
  }

  /**
   * Update user reminder preferences
   */
  updateUserPreferences(
    userId: string,
    updates: Partial<Omit<ReminderPreferences, "userId">>,
  ): ReminderPreferences {
    const current = this.getUserPreferences(userId);
    const updated: ReminderPreferences = {
      ...current,
      ...updates,
    };

    userPreferences.set(userId, updated);

    log.info("Updated user reminder preferences", { userId, updates });

    return updated;
  }

  // ==========================================================================
  // Timezone Handling
  // ==========================================================================

  /**
   * Convert meeting time to user's timezone
   */
  convertToTimezone(isoString: string, timezone: string): Date {
    try {
      const date = new Date(isoString);
      // Create formatter with target timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      // Format and parse back
      const parts = formatter.formatToParts(date);
      const values: Record<string, string> = {};
      for (const part of parts) {
        values[part.type] = part.value;
      }

      return new Date(
        `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`,
      );
    } catch (error) {
      log.warn("Failed to convert timezone", { isoString, timezone, error });
      return new Date(isoString);
    }
  }

  /**
   * Get list of available timezones
   */
  getAvailableTimezones(): string[] {
    // Intl.supportedValuesOf may not be available in older environments
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      return (
        Intl as { supportedValuesOf: (key: string) => string[] }
      ).supportedValuesOf("timeZone");
    }
    // Fallback list of common timezones
    return [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Moscow",
      "Asia/Dubai",
      "Asia/Kolkata",
      "Asia/Shanghai",
      "Asia/Tokyo",
      "Asia/Seoul",
      "Australia/Sydney",
      "Pacific/Auckland",
    ];
  }

  /**
   * Detect user's timezone
   */
  detectUserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  }

  /**
   * Format time for display in a specific timezone
   */
  formatTimeInTimezone(
    isoString: string,
    timezone: string,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      timeZone: timezone,
      ...options,
    });
  }

  // ==========================================================================
  // Meeting Time Helpers
  // ==========================================================================

  /**
   * Check if a time slot is available (no overlapping meetings)
   */
  async isTimeSlotAvailable(
    userId: string,
    startTime: string,
    endTime: string,
    excludeMeetingId?: string,
    getMeetings?: () => Promise<Meeting[]>,
  ): Promise<boolean> {
    // This would typically query the database
    // For now, we check against provided meetings function
    if (!getMeetings) {
      return true; // Assume available if no check function
    }

    const meetings = await getMeetings();
    const userMeetings = meetings.filter(
      (m) =>
        (m.hostId === userId ||
          m.participants.some((p) => p.userId === userId)) &&
        m.id !== excludeMeetingId &&
        m.status !== "cancelled" &&
        m.status !== "ended",
    );

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    for (const meeting of userMeetings) {
      const meetingStart = new Date(meeting.scheduledStartAt).getTime();
      const meetingEnd = new Date(meeting.scheduledEndAt).getTime();

      // Check for overlap
      if (start < meetingEnd && end > meetingStart) {
        return false;
      }
    }

    return true;
  }

  /**
   * Find the next available time slot
   */
  findNextAvailableSlot(
    startAfter: Date = new Date(),
    duration: number = 60, // minutes
    workingHours: { start: number; end: number } = { start: 9, end: 17 },
  ): { start: Date; end: Date } {
    const slotStart = new Date(startAfter);

    // Round up to the next 15-minute interval
    const minutes = slotStart.getMinutes();
    const remainder = minutes % 15;
    if (remainder !== 0) {
      slotStart.setMinutes(minutes + (15 - remainder));
    }
    slotStart.setSeconds(0);
    slotStart.setMilliseconds(0);

    // Check if within working hours
    const hour = slotStart.getHours();
    if (hour < workingHours.start) {
      slotStart.setHours(workingHours.start, 0, 0, 0);
    } else if (hour >= workingHours.end) {
      // Move to next day
      slotStart.setDate(slotStart.getDate() + 1);
      slotStart.setHours(workingHours.start, 0, 0, 0);
    }

    // Skip weekends
    const day = slotStart.getDay();
    if (day === 0) {
      slotStart.setDate(slotStart.getDate() + 1);
    } else if (day === 6) {
      slotStart.setDate(slotStart.getDate() + 2);
    }

    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

    return { start: slotStart, end: slotEnd };
  }

  /**
   * Get suggested meeting times based on participants' availability
   */
  suggestMeetingTimes(
    duration: number = 60,
    participantCount: number = 2,
    preferredTimeOfDay: "morning" | "afternoon" | "any" = "any",
  ): Array<{ start: Date; end: Date }> {
    const suggestions: Array<{ start: Date; end: Date }> = [];
    let currentDate = new Date();

    // Round to next hour
    currentDate.setMinutes(0, 0, 0);
    currentDate.setHours(currentDate.getHours() + 1);

    const workingHours =
      preferredTimeOfDay === "morning"
        ? { start: 9, end: 12 }
        : preferredTimeOfDay === "afternoon"
          ? { start: 13, end: 17 }
          : { start: 9, end: 17 };

    // Generate 5 suggestions
    while (suggestions.length < 5) {
      const slot = this.findNextAvailableSlot(
        currentDate,
        duration,
        workingHours,
      );

      // Only suggest if end time is within working hours
      if (slot.end.getHours() <= workingHours.end) {
        suggestions.push(slot);
      }

      currentDate = new Date(slot.start.getTime() + 60 * 60 * 1000); // Move forward 1 hour
    }

    return suggestions;
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Clear all scheduled reminders (for testing)
   */
  clearAll(): void {
    const timers = Array.from(reminderTimers.values());
    for (const timer of timers) {
      clearTimeout(timer);
    }
    reminderTimers.clear();
    scheduledReminders.clear();
    userPreferences.clear();

    log.info("Cleared all calendar service data");
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let calendarServiceInstance: CalendarService | null = null;

export function getCalendarService(): CalendarService {
  if (!calendarServiceInstance) {
    calendarServiceInstance = new CalendarService();
  }
  return calendarServiceInstance;
}

export function resetCalendarService(): void {
  if (calendarServiceInstance) {
    calendarServiceInstance.clearAll();
  }
  calendarServiceInstance = null;
}

export default CalendarService;
