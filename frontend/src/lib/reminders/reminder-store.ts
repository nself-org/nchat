/**
 * Zustand Store for Reminders
 *
 * Manages the state of reminders in the application.
 * Provides actions for creating, updating, completing, snoozing, and deleting reminders.
 *
 * @example
 * ```tsx
 * import { useReminderStore } from '@/lib/reminders/reminder-store'
 *
 * function RemindersList() {
 *   const { reminders, isLoading } = useReminderStore()
 *   // ...
 * }
 * ```
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import type { Reminder, RecurrenceRule } from "@/graphql/reminders";

// ============================================================================
// Types
// ============================================================================

export interface ReminderDraft {
  messageId?: string;
  channelId?: string;
  content: string;
  note?: string;
  remindAt: Date;
  timezone: string;
  type: "message" | "custom" | "followup";
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
}

export interface ReminderFilter {
  status?: "pending" | "completed" | "dismissed" | "snoozed" | "all";
  channelId?: string;
  type?: "message" | "custom" | "followup" | "all";
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface RemindersState {
  // Data
  reminders: Reminder[];
  remindersById: Record<string, Reminder>;
  remindersByChannel: Record<string, Reminder[]>;
  dueReminders: Reminder[];
  completedReminders: Reminder[];

  // UI State
  isLoading: boolean;
  error: string | null;
  selectedReminderId: string | null;
  isModalOpen: boolean;
  editingReminder: Reminder | null;
  filter: ReminderFilter;

  // Notification State
  activeNotificationId: string | null;
  notificationQueue: string[];

  // Draft for new reminder
  draft: ReminderDraft | null;

  // Actions - Data Management
  setReminders: (reminders: Reminder[]) => void;
  addReminder: (reminder: Reminder) => void;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  removeReminder: (id: string) => void;
  clearReminders: () => void;
  setDueReminders: (reminders: Reminder[]) => void;
  setCompletedReminders: (reminders: Reminder[]) => void;

  // Actions - UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectReminder: (id: string | null) => void;
  openModal: (options?: {
    messageId?: string;
    channelId?: string;
    content?: string;
  }) => void;
  closeModal: () => void;
  setEditingReminder: (reminder: Reminder | null) => void;
  setFilter: (filter: Partial<ReminderFilter>) => void;
  resetFilter: () => void;

  // Actions - Notifications
  showNotification: (reminderId: string) => void;
  dismissNotification: (reminderId: string) => void;
  clearNotificationQueue: () => void;

  // Actions - Draft
  setDraft: (draft: ReminderDraft | null) => void;
  updateDraft: (updates: Partial<ReminderDraft>) => void;
  clearDraft: () => void;

  // Selectors
  getReminderById: (id: string) => Reminder | undefined;
  getRemindersForChannel: (channelId: string) => Reminder[];
  getRemindersForMessage: (messageId: string) => Reminder[];
  getPendingCount: () => number;
  getNextReminder: () => Reminder | undefined;
  getFilteredReminders: () => Reminder[];
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_FILTER: ReminderFilter = {
  status: "pending",
  type: "all",
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useReminderStore = create<RemindersState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      reminders: [],
      remindersById: {},
      remindersByChannel: {},
      dueReminders: [],
      completedReminders: [],
      isLoading: false,
      error: null,
      selectedReminderId: null,
      isModalOpen: false,
      editingReminder: null,
      filter: DEFAULT_FILTER,
      activeNotificationId: null,
      notificationQueue: [],
      draft: null,

      // Actions - Data Management
      setReminders: (reminders) => {
        const remindersById: Record<string, Reminder> = {};
        const remindersByChannel: Record<string, Reminder[]> = {};

        for (const reminder of reminders) {
          remindersById[reminder.id] = reminder;
          if (reminder.channel_id) {
            if (!remindersByChannel[reminder.channel_id]) {
              remindersByChannel[reminder.channel_id] = [];
            }
            remindersByChannel[reminder.channel_id].push(reminder);
          }
        }

        // Sort reminders by remind_at within each channel
        for (const channelId of Object.keys(remindersByChannel)) {
          remindersByChannel[channelId].sort(
            (a, b) =>
              new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime(),
          );
        }

        set({
          reminders: reminders.sort(
            (a, b) =>
              new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime(),
          ),
          remindersById,
          remindersByChannel,
        });
      },

      addReminder: (reminder) => {
        set((state) => {
          const newReminders = [...state.reminders, reminder].sort(
            (a, b) =>
              new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime(),
          );

          const newRemindersById = {
            ...state.remindersById,
            [reminder.id]: reminder,
          };

          const newRemindersByChannel = { ...state.remindersByChannel };
          if (reminder.channel_id) {
            const channelReminders =
              state.remindersByChannel[reminder.channel_id] || [];
            newRemindersByChannel[reminder.channel_id] = [
              ...channelReminders,
              reminder,
            ].sort(
              (a, b) =>
                new Date(a.remind_at).getTime() -
                new Date(b.remind_at).getTime(),
            );
          }

          return {
            reminders: newReminders,
            remindersById: newRemindersById,
            remindersByChannel: newRemindersByChannel,
          };
        });
      },

      updateReminder: (id, updates) => {
        set((state) => {
          const existingReminder = state.remindersById[id];
          if (!existingReminder) return state;

          const updatedReminder = { ...existingReminder, ...updates };
          const newRemindersById = {
            ...state.remindersById,
            [id]: updatedReminder,
          };

          const newReminders = state.reminders
            .map((r) => (r.id === id ? updatedReminder : r))
            .sort(
              (a, b) =>
                new Date(a.remind_at).getTime() -
                new Date(b.remind_at).getTime(),
            );

          // Update channel grouping
          const newRemindersByChannel = { ...state.remindersByChannel };
          if (updatedReminder.channel_id) {
            const channelId = updatedReminder.channel_id;
            if (newRemindersByChannel[channelId]) {
              newRemindersByChannel[channelId] = newRemindersByChannel[
                channelId
              ]
                .map((r) => (r.id === id ? updatedReminder : r))
                .sort(
                  (a, b) =>
                    new Date(a.remind_at).getTime() -
                    new Date(b.remind_at).getTime(),
                );
            }
          }

          return {
            reminders: newReminders,
            remindersById: newRemindersById,
            remindersByChannel: newRemindersByChannel,
          };
        });
      },

      removeReminder: (id) => {
        set((state) => {
          const reminder = state.remindersById[id];
          if (!reminder) return state;

          const { [id]: removed, ...newRemindersById } = state.remindersById;
          const newReminders = state.reminders.filter((r) => r.id !== id);

          const newRemindersByChannel = { ...state.remindersByChannel };
          if (
            reminder.channel_id &&
            newRemindersByChannel[reminder.channel_id]
          ) {
            newRemindersByChannel[reminder.channel_id] = newRemindersByChannel[
              reminder.channel_id
            ].filter((r) => r.id !== id);
          }

          // Remove from notification queue if present
          const newNotificationQueue = state.notificationQueue.filter(
            (nId) => nId !== id,
          );

          return {
            reminders: newReminders,
            remindersById: newRemindersById,
            remindersByChannel: newRemindersByChannel,
            dueReminders: state.dueReminders.filter((r) => r.id !== id),
            notificationQueue: newNotificationQueue,
            activeNotificationId:
              state.activeNotificationId === id
                ? null
                : state.activeNotificationId,
            selectedReminderId:
              state.selectedReminderId === id ? null : state.selectedReminderId,
          };
        });
      },

      clearReminders: () => {
        set({
          reminders: [],
          remindersById: {},
          remindersByChannel: {},
          dueReminders: [],
          completedReminders: [],
        });
      },

      setDueReminders: (reminders) => {
        set({ dueReminders: reminders });

        // Add new due reminders to notification queue
        const currentQueue = get().notificationQueue;
        const newIds = reminders
          .map((r) => r.id)
          .filter((id) => !currentQueue.includes(id));

        if (newIds.length > 0) {
          set((state) => ({
            notificationQueue: [...state.notificationQueue, ...newIds],
          }));
        }
      },

      setCompletedReminders: (reminders) => {
        set({ completedReminders: reminders });
      },

      // Actions - UI
      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      selectReminder: (id) => set({ selectedReminderId: id }),

      openModal: (options) => {
        const draft: ReminderDraft = {
          messageId: options?.messageId,
          channelId: options?.channelId,
          content: options?.content || "",
          remindAt: getDefaultReminderTime(),
          timezone: getUserTimezone(),
          type: options?.messageId ? "message" : "custom",
          isRecurring: false,
        };

        set({
          isModalOpen: true,
          draft,
          editingReminder: null,
        });
      },

      closeModal: () => {
        set({
          isModalOpen: false,
          draft: null,
          editingReminder: null,
        });
      },

      setEditingReminder: (reminder) => {
        if (reminder) {
          set({
            editingReminder: reminder,
            isModalOpen: true,
            draft: {
              messageId: reminder.message_id,
              channelId: reminder.channel_id,
              content: reminder.content,
              note: reminder.note,
              remindAt: new Date(reminder.remind_at),
              timezone: reminder.timezone,
              type: reminder.type as ReminderDraft["type"],
              isRecurring: reminder.is_recurring,
              recurrenceRule: reminder.recurrence_rule,
            },
          });
        } else {
          set({ editingReminder: null });
        }
      },

      setFilter: (filter) => {
        set((state) => ({
          filter: { ...state.filter, ...filter },
        }));
      },

      resetFilter: () => {
        set({ filter: DEFAULT_FILTER });
      },

      // Actions - Notifications
      showNotification: (reminderId) => {
        set((state) => ({
          activeNotificationId: reminderId,
          notificationQueue: state.notificationQueue.filter(
            (id) => id !== reminderId,
          ),
        }));
      },

      dismissNotification: (reminderId) => {
        set((state) => ({
          activeNotificationId:
            state.activeNotificationId === reminderId
              ? state.notificationQueue[0] || null
              : state.activeNotificationId,
        }));
      },

      clearNotificationQueue: () => {
        set({
          activeNotificationId: null,
          notificationQueue: [],
        });
      },

      // Actions - Draft
      setDraft: (draft) => set({ draft }),

      updateDraft: (updates) => {
        set((state) => ({
          draft: state.draft ? { ...state.draft, ...updates } : null,
        }));
      },

      clearDraft: () => set({ draft: null }),

      // Selectors
      getReminderById: (id) => get().remindersById[id],

      getRemindersForChannel: (channelId) =>
        get().remindersByChannel[channelId] || [],

      getRemindersForMessage: (messageId) =>
        get().reminders.filter((r) => r.message_id === messageId),

      getPendingCount: () =>
        get().reminders.filter((r) => r.status === "pending").length,

      getNextReminder: () => {
        const pending = get().reminders.filter((r) => r.status === "pending");
        if (pending.length === 0) return undefined;
        return pending[0]; // Already sorted by remind_at
      },

      getFilteredReminders: () => {
        const { reminders, filter } = get();

        return reminders.filter((reminder) => {
          // Filter by status
          if (filter.status && filter.status !== "all") {
            if (reminder.status !== filter.status) return false;
          }

          // Filter by channel
          if (filter.channelId) {
            if (reminder.channel_id !== filter.channelId) return false;
          }

          // Filter by type
          if (filter.type && filter.type !== "all") {
            if (reminder.type !== filter.type) return false;
          }

          // Filter by date range
          if (filter.dateRange) {
            const remindAt = new Date(reminder.remind_at);
            if (filter.dateRange.start && remindAt < filter.dateRange.start) {
              return false;
            }
            if (filter.dateRange.end && remindAt > filter.dateRange.end) {
              return false;
            }
          }

          return true;
        });
      },
    })),
    { name: "reminders" },
  ),
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the user's current timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format a timezone offset string (e.g., "GMT-8")
 */
export function formatTimezoneOffset(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  });
  const parts = formatter.formatToParts(now);
  const timeZonePart = parts.find((p) => p.type === "timeZoneName");
  return timeZonePart?.value || timezone;
}

/**
 * Get common timezone options
 */
export function getCommonTimezones(): { value: string; label: string }[] {
  return [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Anchorage", label: "Alaska Time (AKT)" },
    { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
    { value: "UTC", label: "UTC" },
  ];
}

/**
 * Check if a reminder time is in the past
 */
export function isReminderInPast(remindAt: Date | string): boolean {
  const scheduled = new Date(remindAt);
  return scheduled.getTime() < Date.now();
}

/**
 * Get the default reminder time (1 hour from now, rounded to next 15 min)
 */
export function getDefaultReminderTime(): Date {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  now.setMinutes(roundedMinutes, 0, 0);
  now.setHours(now.getHours() + 1);
  return now;
}

/**
 * Get preset reminder times
 */
export function getPresetReminderTimes(): {
  label: string;
  value: () => Date;
  description: string;
}[] {
  return [
    {
      label: "In 20 minutes",
      value: () => new Date(Date.now() + 20 * 60 * 1000),
      description: formatFutureTime(new Date(Date.now() + 20 * 60 * 1000)),
    },
    {
      label: "In 1 hour",
      value: () => new Date(Date.now() + 60 * 60 * 1000),
      description: formatFutureTime(new Date(Date.now() + 60 * 60 * 1000)),
    },
    {
      label: "In 3 hours",
      value: () => new Date(Date.now() + 3 * 60 * 60 * 1000),
      description: formatFutureTime(new Date(Date.now() + 3 * 60 * 60 * 1000)),
    },
    {
      label: "Tomorrow morning",
      value: () => getTomorrowMorning(),
      description: formatFutureTime(getTomorrowMorning()),
    },
    {
      label: "Tomorrow afternoon",
      value: () => getTomorrowAfternoon(),
      description: formatFutureTime(getTomorrowAfternoon()),
    },
    {
      label: "Next week",
      value: () => getNextWeek(),
      description: formatFutureTime(getNextWeek()),
    },
  ];
}

/**
 * Get tomorrow morning (9 AM)
 */
export function getTomorrowMorning(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}

/**
 * Get tomorrow afternoon (1 PM)
 */
export function getTomorrowAfternoon(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(13, 0, 0, 0);
  return tomorrow;
}

/**
 * Get next week (same day, 9 AM)
 */
export function getNextWeek(): Date {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(9, 0, 0, 0);
  return nextWeek;
}

/**
 * Format a future time for display
 */
export function formatFutureTime(date: Date): string {
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isTomorrow =
    date.getDate() === now.getDate() + 1 &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return `${dateStr} at ${timeStr}`;
}

/**
 * Get snooze duration options
 */
export function getSnoozeDurations(): {
  label: string;
  value: number;
  description: string;
}[] {
  return [
    {
      label: "5 minutes",
      value: 5 * 60 * 1000,
      description: formatFutureTime(new Date(Date.now() + 5 * 60 * 1000)),
    },
    {
      label: "15 minutes",
      value: 15 * 60 * 1000,
      description: formatFutureTime(new Date(Date.now() + 15 * 60 * 1000)),
    },
    {
      label: "30 minutes",
      value: 30 * 60 * 1000,
      description: formatFutureTime(new Date(Date.now() + 30 * 60 * 1000)),
    },
    {
      label: "1 hour",
      value: 60 * 60 * 1000,
      description: formatFutureTime(new Date(Date.now() + 60 * 60 * 1000)),
    },
    {
      label: "2 hours",
      value: 2 * 60 * 60 * 1000,
      description: formatFutureTime(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    },
    {
      label: "Tomorrow morning",
      value: getTomorrowMorning().getTime() - Date.now(),
      description: formatFutureTime(getTomorrowMorning()),
    },
  ];
}

/**
 * Calculate the next occurrence for a recurring reminder
 */
export function getNextRecurrence(
  currentDate: Date,
  rule: RecurrenceRule,
): Date | null {
  const next = new Date(currentDate);

  switch (rule.frequency) {
    case "daily":
      next.setDate(next.getDate() + rule.interval);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7 * rule.interval);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + rule.interval);
      if (rule.dayOfMonth) {
        next.setDate(rule.dayOfMonth);
      }
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + rule.interval);
      break;
  }

  // Check if we've exceeded the end date
  if (rule.endDate && next > new Date(rule.endDate)) {
    return null;
  }

  return next;
}
