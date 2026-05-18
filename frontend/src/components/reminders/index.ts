/**
 * Reminders Components
 *
 * A complete reminders system for the nself-chat application.
 * Provides Slack-like reminder functionality with message reminders,
 * custom reminders, recurring reminders, and snooze capabilities.
 *
 * @example
 * ```tsx
 * import {
 *   RemindersList,
 *   SetReminderModal,
 *   ReminderNotification,
 *   QuickRemind,
 * } from '@/components/reminders'
 *
 * // Use in your app
 * <RemindersList userId={user.id} />
 * <SetReminderModal open={isOpen} onOpenChange={setIsOpen} userId={user.id} />
 * ```
 */

// Main components
export { RemindersList } from "./reminders-list";
export { SetReminderModal } from "./set-reminder-modal";
export { ReminderItem } from "./reminder-item";
export {
  ReminderNotification,
  ReminderNotificationContainer,
  ReminderToast,
  ReminderBell,
  useReminderNotifications,
} from "./reminder-notification";
export {
  QuickRemind,
  QuickRemindMenu,
  QuickRemindButtons,
  MessageQuickRemind,
} from "./quick-remind";
export { ReminderTimePicker, CompactTimePicker } from "./reminder-time-picker";

// Types
export type { RemindersListProps } from "./reminders-list";
export type { SetReminderModalProps } from "./set-reminder-modal";
export type { ReminderItemProps } from "./reminder-item";
export type {
  ReminderNotificationProps,
  ReminderNotificationContainerProps,
  ReminderToastProps,
  ReminderBellProps,
} from "./reminder-notification";
export type {
  QuickRemindProps,
  QuickRemindMenuProps,
  QuickRemindButtonsProps,
  MessageQuickRemindProps,
} from "./quick-remind";
export type {
  ReminderTimePickerProps,
  CompactTimePickerProps,
} from "./reminder-time-picker";
