/**
 * Scheduled Messages Library
 *
 * This module exports all utilities and hooks for the scheduled messages feature.
 *
 * @example
 * ```tsx
 * import {
 *   useScheduled,
 *   useScheduledStore,
 *   getUserTimezone,
 * } from '@/lib/scheduled'
 * ```
 */

// Zustand store and utilities
export {
  useScheduledStore,
  getUserTimezone,
  getCommonTimezones,
  formatTimezoneOffset,
  isScheduledInPast,
  getDefaultScheduledTime,
  type ScheduledMessageDraft,
  type ScheduledMessagesState,
} from "./scheduled-store";

// React hooks
export {
  useScheduled,
  useChannelScheduledMessages,
  useScheduledMessagesCount,
  type UseScheduledOptions,
  type UseScheduledReturn,
} from "./use-scheduled";
