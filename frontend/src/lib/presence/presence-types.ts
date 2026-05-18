/**
 * Presence Types - TypeScript types for the user presence system
 *
 * Defines all types for presence status, activities, and related functionality.
 */

// ============================================================================
// Status Types
// ============================================================================

/**
 * Core presence status values
 */
export type PresenceStatus =
  | "online"
  | "away"
  | "dnd"
  | "invisible"
  | "offline";

/**
 * Status colors for UI display
 */
export const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  online: "#22C55E", // green-500
  away: "#F59E0B", // amber-500
  dnd: "#EF4444", // red-500
  invisible: "#6B7280", // gray-500
  offline: "#6B7280", // gray-500
};

/**
 * Status labels for display
 */
export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  online: "Online",
  away: "Away",
  dnd: "Do Not Disturb",
  invisible: "Invisible",
  offline: "Offline",
};

/**
 * Status descriptions
 */
export const PRESENCE_DESCRIPTIONS: Record<PresenceStatus, string> = {
  online: "You are available and visible to others",
  away: "You appear away to others",
  dnd: "You will not receive notifications",
  invisible: "You appear offline but can still use the app",
  offline: "You are disconnected",
};

// ============================================================================
// Activity Types
// ============================================================================

/**
 * Preset activity types
 */
export type ActivityType =
  | "in_meeting"
  | "on_call"
  | "focusing"
  | "commuting"
  | "out_sick"
  | "vacationing"
  | "working_remotely"
  | "custom";

/**
 * Preset activities with their details
 */
export interface PresetActivity {
  type: ActivityType;
  emoji: string;
  text: string;
  defaultDuration?: StatusDuration;
}

/**
 * All preset activities
 */
export const PRESET_ACTIVITIES: PresetActivity[] = [
  {
    type: "in_meeting",
    emoji: "📅",
    text: "In a meeting",
    defaultDuration: "1h",
  },
  { type: "on_call", emoji: "📞", text: "On a call", defaultDuration: "30m" },
  { type: "focusing", emoji: "🎯", text: "Focusing", defaultDuration: "2h" },
  { type: "commuting", emoji: "🚗", text: "Commuting", defaultDuration: "1h" },
  { type: "out_sick", emoji: "🤒", text: "Out sick", defaultDuration: "today" },
  {
    type: "vacationing",
    emoji: "🌴",
    text: "Vacationing",
    defaultDuration: "indefinite",
  },
  {
    type: "working_remotely",
    emoji: "🏠",
    text: "Working remotely",
    defaultDuration: "today",
  },
  {
    type: "custom",
    emoji: "✏️",
    text: "Set a custom status",
    defaultDuration: "indefinite",
  },
];

/**
 * Get preset activity by type
 */
export const getPresetActivity = (
  type: ActivityType,
): PresetActivity | undefined => {
  return PRESET_ACTIVITIES.find((a) => a.type === type);
};

// ============================================================================
// Duration Types
// ============================================================================

/**
 * Status duration options
 */
export type StatusDuration =
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "today"
  | "this_week"
  | "indefinite"
  | "custom";

/**
 * Duration option with label and calculation
 */
export interface DurationOption {
  value: StatusDuration;
  label: string;
  getExpiresAt: () => Date | null;
}

/**
 * Get end of today
 */
const getEndOfToday = (): Date => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * Get end of week (Sunday)
 */
const getEndOfWeek = (): Date => {
  const date = new Date();
  const day = date.getDay();
  const daysUntilSunday = 7 - day;
  date.setDate(date.getDate() + daysUntilSunday);
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * Duration options with labels and expiration calculators
 */
export const DURATION_OPTIONS: DurationOption[] = [
  {
    value: "30m",
    label: "30 minutes",
    getExpiresAt: () => new Date(Date.now() + 30 * 60 * 1000),
  },
  {
    value: "1h",
    label: "1 hour",
    getExpiresAt: () => new Date(Date.now() + 60 * 60 * 1000),
  },
  {
    value: "2h",
    label: "2 hours",
    getExpiresAt: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
  },
  {
    value: "4h",
    label: "4 hours",
    getExpiresAt: () => new Date(Date.now() + 4 * 60 * 60 * 1000),
  },
  {
    value: "today",
    label: "Today",
    getExpiresAt: () => getEndOfToday(),
  },
  {
    value: "this_week",
    label: "This week",
    getExpiresAt: () => getEndOfWeek(),
  },
  {
    value: "indefinite",
    label: "Don't clear",
    getExpiresAt: () => null,
  },
];

/**
 * Get duration option by value
 */
export const getDurationOption = (
  value: StatusDuration,
): DurationOption | undefined => {
  return DURATION_OPTIONS.find((d) => d.value === value);
};

// ============================================================================
// Custom Status Types
// ============================================================================

/**
 * Custom status structure
 */
export interface CustomStatus {
  emoji?: string;
  text?: string;
  expiresAt?: Date | null;
  activity?: ActivityType;
}

/**
 * Frequently used emojis for status
 */
export const COMMON_STATUS_EMOJIS = [
  "😊",
  "👋",
  "🙂",
  "😁",
  "🎉",
  "💼",
  "📅",
  "📞",
  "🎯",
  "💻",
  "🏠",
  "🚗",
  "✈️",
  "🌴",
  "🤒",
  "🎵",
  "🎮",
  "📚",
  "🍔",
  "☕",
  "🔇",
  "⏰",
  "🔒",
  "✨",
  "🌙",
];

// ============================================================================
// Presence Data Types
// ============================================================================

/**
 * Full user presence data
 */
export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  customStatus?: CustomStatus;
  lastSeenAt?: Date;
  device?: string;
  isTyping?: boolean;
  typingInContext?: string;
}

/**
 * Presence update event
 */
export interface PresenceUpdate {
  userId: string;
  status: PresenceStatus;
  customStatus?: CustomStatus;
  timestamp: Date;
}

/**
 * Typing status
 */
export interface TypingStatus {
  userId: string;
  userName: string;
  userAvatar?: string;
  channelId?: string;
  threadId?: string;
  startedAt: Date;
}

// ============================================================================
// Presence Settings Types
// ============================================================================

/**
 * User's presence settings/preferences
 */
export interface PresenceSettings {
  /**
   * Auto-away settings
   */
  autoAway: {
    enabled: boolean;
    timeout: number; // minutes
    setStatus: PresenceStatus;
  };

  /**
   * Idle detection settings
   */
  idleDetection: {
    enabled: boolean;
    timeout: number; // minutes
  };

  /**
   * Privacy settings
   */
  privacy: {
    showLastSeen: boolean;
    showTypingIndicator: boolean;
    shareActivityStatus: boolean;
  };

  /**
   * Do Not Disturb settings
   */
  dndSchedule: {
    enabled: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    days: number[]; // 0-6, Sunday = 0
  };
}

/**
 * Default presence settings
 */
export const DEFAULT_PRESENCE_SETTINGS: PresenceSettings = {
  autoAway: {
    enabled: true,
    timeout: 5, // 5 minutes
    setStatus: "away",
  },
  idleDetection: {
    enabled: true,
    timeout: 5, // 5 minutes
  },
  privacy: {
    showLastSeen: true,
    showTypingIndicator: true,
    shareActivityStatus: true,
  },
  dndSchedule: {
    enabled: false,
    startTime: "22:00",
    endTime: "08:00",
    days: [0, 1, 2, 3, 4, 5, 6], // all days
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get presence color by status
 */
export const getPresenceColor = (status: PresenceStatus): string => {
  return PRESENCE_COLORS[status] ?? PRESENCE_COLORS.offline;
};

/**
 * Get presence label by status
 */
export const getPresenceLabel = (status: PresenceStatus): string => {
  return PRESENCE_LABELS[status] ?? PRESENCE_LABELS.offline;
};

/**
 * Get presence description by status
 */
export const getPresenceDescription = (status: PresenceStatus): string => {
  return PRESENCE_DESCRIPTIONS[status] ?? PRESENCE_DESCRIPTIONS.offline;
};

/**
 * Check if status is considered "active" (not offline or invisible)
 */
export const isActiveStatus = (status: PresenceStatus): boolean => {
  return status === "online" || status === "away" || status === "dnd";
};

/**
 * Check if status should show as online to others
 */
export const isVisibleOnline = (status: PresenceStatus): boolean => {
  return status !== "offline" && status !== "invisible";
};

/**
 * Check if custom status has expired
 */
export const isStatusExpired = (
  customStatus: CustomStatus | undefined,
): boolean => {
  if (!customStatus?.expiresAt) return false;
  return new Date(customStatus.expiresAt) < new Date();
};

/**
 * Format last seen time
 */
export const formatLastSeen = (
  lastSeenAt: Date | string | undefined,
): string => {
  if (!lastSeenAt) return "Never";

  const date =
    typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

/**
 * Format status duration remaining
 */
export const formatDurationRemaining = (
  expiresAt: Date | string | null | undefined,
): string => {
  if (!expiresAt) return "";

  const date = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return "Expired";

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
};
