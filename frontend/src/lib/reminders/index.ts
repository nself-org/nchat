/**
 * Reminders Library
 *
 * State management and hooks for the reminders system.
 *
 * @example
 * ```tsx
 * import {
 *   useReminders,
 *   useReminderStore,
 *   getUserTimezone,
 * } from '@/lib/reminders'
 *
 * function MyComponent() {
 *   const { reminders, createReminder } = useReminders({ userId: user.id })
 *   // ...
 * }
 * ```
 */

// Store
export {
  useReminderStore,
  getUserTimezone,
  formatTimezoneOffset,
  getCommonTimezones,
  isReminderInPast,
  getDefaultReminderTime,
  getPresetReminderTimes,
  getTomorrowMorning,
  getTomorrowAfternoon,
  getNextWeek,
  formatFutureTime,
  getSnoozeDurations,
  getNextRecurrence,
} from "./reminder-store";

// Types from store
export type {
  ReminderDraft,
  ReminderFilter,
  RemindersState,
} from "./reminder-store";

// Hooks
export {
  useReminders,
  useChannelReminders,
  useRemindersCount,
  useMessageReminder,
} from "./use-reminders";

// Types from hooks
export type { UseRemindersOptions, UseRemindersReturn } from "./use-reminders";
