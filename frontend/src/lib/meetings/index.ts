/**
 * Meetings Library - Central export point for meeting utilities
 *
 * Provides all types, utilities, and helpers for the meetings feature
 */

// ============================================================================
// Types
// ============================================================================

export * from "./meeting-types";

// ============================================================================
// Scheduler Utilities
// ============================================================================

export {
  // Constants
  DEFAULT_MEETING_SETTINGS,
  DEFAULT_MEETING_DURATION,
  MIN_MEETING_DURATION,
  MAX_MEETING_DURATION,
  MAX_PARTICIPANTS,
  // Time utilities
  roundToInterval,
  getNextAvailableSlot,
  formatDuration,
  calculateDuration,
  formatTime,
  formatDate,
  formatDateTime,
  isToday,
  isPast,
  getRelativeTime,
  // Recurrence utilities
  formatRecurrence,
  generateOccurrences,
  // Calendar utilities
  generateCalendarMonth,
  // Validation
  validateMeetingInput,
  // Time slot utilities
  generateTimeSlots,
  getDurationOptions,
} from "./meeting-scheduler";

export type { ValidationResult, TimeSlot } from "./meeting-scheduler";

// ============================================================================
// Invite Utilities
// ============================================================================

export {
  // Constants
  ROLE_HIERARCHY,
  ROLE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  // Role utilities
  hasRole,
  canPerformAction,
  getAssignableRoles,
  // Participant utilities
  isHost,
  getParticipantRole,
  isParticipant,
  groupParticipantsByStatus,
  groupParticipantsByRole,
  sortParticipants,
  getResponseStats,
  // Invitation utilities
  createParticipants,
  validateInviteInput,
  // RSVP utilities
  canChangeResponse,
  getResponseOptions,
  // Message utilities
  generateInviteMessage,
  generateUpdateMessage,
  generateCancellationMessage,
} from "./meeting-invites";

// ============================================================================
// Reminder Utilities
// ============================================================================

export {
  // Constants
  REMINDER_TIMINGS,
  REMINDER_LABELS,
  REMINDER_MILLISECONDS,
  DEFAULT_REMINDERS,
  // Time calculations
  calculateReminderTime,
  shouldReminderBeSent,
  getTimeUntilReminder,
  getNextPendingReminder,
  getRemindersToSend,
  // Creation utilities
  createDefaultReminders,
  mergeReminders,
  // Notification utilities
  generateReminderNotification,
  formatTimingShort,
  // Browser notifications
  canShowBrowserNotification,
  requestNotificationPermission,
  showReminderNotification,
  // Schedule management
  scheduleReminder,
  cancelReminder,
  cancelAllReminders,
  scheduleAllReminders,
  getScheduledReminders,
} from "./meeting-reminders";

export type { ReminderNotification } from "./meeting-reminders";

// ============================================================================
// Link Utilities
// ============================================================================

export {
  // Code generation
  generateMeetingCode,
  isValidMeetingCode,
  formatMeetingCode,
  parseMeetingCode,
  // URL generation
  getMeetingBaseUrl,
  generateMeetingLink,
  generateInviteLink,
  generateDirectJoinLink,
  decodePassword,
  // Calendar integration
  generateGoogleCalendarLink,
  generateOutlookCalendarLink,
  generateICSContent,
  downloadICS,
  meetingToCalendarEvent,
  // Share utilities
  generateShareContent,
  shareMeeting,
  copyMeetingLink,
  // Room type helpers
  getRoomTypeIcon,
  getRoomTypeLabel,
} from "./meeting-links";

export type { CalendarEvent, ShareContent } from "./meeting-links";
