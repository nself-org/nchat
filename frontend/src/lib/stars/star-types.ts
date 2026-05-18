/**
 * Star Types
 *
 * TypeScript type definitions for the starred messages system.
 * Stars provide quick access to important messages with color/priority support.
 */

import type { Message, MessageUser } from "@/types/message";

// ============================================================================
// Star Color/Priority Types
// ============================================================================

/**
 * Available star colors for prioritization.
 */
export type StarColor =
  | "yellow"
  | "red"
  | "green"
  | "blue"
  | "purple"
  | "orange";

/**
 * Star priority levels.
 */
export type StarPriority = "low" | "medium" | "high" | "urgent";

/**
 * Star color configuration.
 */
export const STAR_COLORS: Record<
  StarColor,
  { hex: string; label: string; priority: StarPriority }
> = {
  yellow: { hex: "#FBBF24", label: "Default", priority: "medium" },
  red: { hex: "#EF4444", label: "Urgent", priority: "urgent" },
  orange: { hex: "#F97316", label: "High Priority", priority: "high" },
  green: { hex: "#22C55E", label: "Complete", priority: "low" },
  blue: { hex: "#3B82F6", label: "Reference", priority: "low" },
  purple: { hex: "#A855F7", label: "Important", priority: "high" },
};

/**
 * Priority order for sorting.
 */
export const PRIORITY_ORDER: Record<StarPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// ============================================================================
// Starred Message Types
// ============================================================================

/**
 * Starred message record.
 */
export interface StarredMessage {
  /** Unique star ID */
  id: string;
  /** User who starred the message */
  userId: string;
  /** ID of the starred message */
  messageId: string;
  /** Channel ID where the message exists */
  channelId: string;
  /** When the message was starred */
  starredAt: Date;
  /** The actual message content */
  message: Message;
  /** Star color */
  color: StarColor;
  /** Star priority (derived from color or set manually) */
  priority: StarPriority;
  /** User's note about the starred message */
  note?: string;
  /** Whether this is a quick-access star (shows in sidebar) */
  quickAccess: boolean;
  /** Category/label for organization */
  category?: string;
}

/**
 * Input for starring a message.
 */
export interface StarMessageInput {
  /** Message ID to star */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Star color (default: yellow) */
  color?: StarColor;
  /** Priority override */
  priority?: StarPriority;
  /** Optional note */
  note?: string;
  /** Enable quick access */
  quickAccess?: boolean;
  /** Optional category */
  category?: string;
}

/**
 * Input for updating a starred message.
 */
export interface UpdateStarInput {
  /** Star ID */
  starId: string;
  /** Updated color */
  color?: StarColor;
  /** Updated priority */
  priority?: StarPriority;
  /** Updated note */
  note?: string;
  /** Updated quick access */
  quickAccess?: boolean;
  /** Updated category */
  category?: string;
}

/**
 * Input for unstarring a message.
 */
export interface UnstarMessageInput {
  /** Star ID or message ID */
  starId?: string;
  messageId?: string;
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filter options for starred messages.
 */
export interface StarFilters {
  /** Filter by channel */
  channelId?: string;
  /** Filter by color */
  color?: StarColor;
  /** Filter by colors (multiple) */
  colors?: StarColor[];
  /** Filter by priority */
  priority?: StarPriority;
  /** Filter by priorities (multiple) */
  priorities?: StarPriority[];
  /** Filter quick access only */
  quickAccessOnly?: boolean;
  /** Filter by category */
  category?: string;
  /** Filter by date range - starred after */
  starredAfter?: Date;
  /** Filter by date range - starred before */
  starredBefore?: Date;
  /** Filter by message type */
  messageType?: string;
  /** Search query */
  searchQuery?: string;
  /** Filter messages with attachments */
  hasAttachments?: boolean;
  /** Filter messages with notes */
  hasNote?: boolean;
  /** Filter by message author */
  authorUserId?: string;
}

/**
 * Sort options for starred messages.
 */
export type StarSortBy =
  | "starredAt"
  | "messageDate"
  | "priority"
  | "channel"
  | "color";
export type StarSortOrder = "asc" | "desc";

/**
 * Starred messages list options.
 */
export interface StarListOptions {
  filters?: StarFilters;
  sortBy?: StarSortBy;
  sortOrder?: StarSortOrder;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Star statistics.
 */
export interface StarStats {
  /** Total starred messages */
  totalStarred: number;
  /** Count by color */
  byColor: Record<StarColor, number>;
  /** Count by priority */
  byPriority: Record<StarPriority, number>;
  /** Count by channel */
  byChannel: Record<string, number>;
  /** Quick access count */
  quickAccessCount: number;
  /** Count by category */
  byCategory: Record<string, number>;
  /** Recent activity */
  recentActivity: { date: Date; count: number }[];
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Star event for real-time updates.
 */
export interface StarEvent {
  type: "starred" | "unstarred" | "updated";
  userId: string;
  starredMessage?: StarredMessage;
  messageId?: string;
  timestamp: Date;
}

// ============================================================================
// Category Types
// ============================================================================

/**
 * Predefined star categories.
 */
export const DEFAULT_STAR_CATEGORIES = [
  "follow-up",
  "reference",
  "action-item",
  "idea",
  "meeting",
  "decision",
  "question",
  "announcement",
] as const;

export type DefaultStarCategory = (typeof DEFAULT_STAR_CATEGORIES)[number];

/**
 * Category configuration.
 */
export interface StarCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  isDefault?: boolean;
}
