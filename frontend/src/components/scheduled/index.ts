/**
 * Scheduled Messages Components
 *
 * This module exports all components related to the scheduled messages feature.
 * These components work together to provide a complete scheduling system.
 *
 * @example
 * ```tsx
 * import {
 *   ScheduleMessageModal,
 *   ScheduledMessagesList,
 *   ScheduledIndicator,
 *   ScheduleButton,
 * } from '@/components/scheduled'
 * ```
 */

// Main modal for scheduling messages
export { ScheduleMessageModal } from "./schedule-message-modal";
export { default as ScheduleMessageModalDefault } from "./schedule-message-modal";

// List of all scheduled messages
export { ScheduledMessagesList } from "./scheduled-messages-list";
export { default as ScheduledMessagesListDefault } from "./scheduled-messages-list";

// Individual scheduled message item
export { ScheduledMessageItem } from "./scheduled-message-item";
export { default as ScheduledMessageItemDefault } from "./scheduled-message-item";

// Date/time picker for scheduling
export { SchedulePicker } from "./schedule-picker";
export { default as SchedulePickerDefault } from "./schedule-picker";

// Quick scheduling options
export {
  ScheduleQuickOptions,
  QUICK_OPTIONS,
  type QuickOption,
  type ScheduleQuickOptionsProps,
} from "./schedule-quick-options";
export { default as ScheduleQuickOptionsDefault } from "./schedule-quick-options";

// Indicator components for message input
export {
  ScheduledIndicator,
  ScheduleButton,
  ScheduledCountBadge,
} from "./scheduled-indicator";
export { default as ScheduledIndicatorDefault } from "./scheduled-indicator";
