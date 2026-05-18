/**
 * SDK Type Definitions
 *
 * Core types and interfaces used across the SDK.
 */

/**
 * Common Types
 */
export type UUID = string;
export type ISO8601 = string;
export type URL = string;

/**
 * User
 */
export interface User {
  id: UUID;
  email: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "moderator" | "member" | "guest";
  status: "active" | "inactive" | "suspended" | "deleted";
  isOnline: boolean;
  lastSeenAt?: ISO8601;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

/**
 * Channel Types
 */
export type ChannelType = "public" | "private" | "direct" | "group";
export type ChannelCategory =
  | "general"
  | "announcements"
  | "support"
  | "random"
  | "custom";

export interface Channel {
  id: UUID;
  name: string;
  description?: string;
  type: ChannelType;
  category?: ChannelCategory;
  isArchived: boolean;
  memberCount: number;
  unreadCount?: number;
  lastMessageAt?: ISO8601;
  createdBy: UUID;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  metadata?: Record<string, unknown>;
}

/**
 * Message Types
 */
export type MessageType =
  | "text"
  | "file"
  | "image"
  | "video"
  | "audio"
  | "system";
export type MessageStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface Message {
  id: UUID;
  channelId: UUID;
  userId: UUID;
  user?: User;
  content: string;
  type: MessageType;
  status: MessageStatus;
  parentId?: UUID;
  threadCount?: number;
  reactions?: Reaction[];
  attachments?: Attachment[];
  mentions?: UUID[];
  isEdited: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  editedAt?: ISO8601;
  deletedAt?: ISO8601;
}

/**
 * Reaction
 */
export interface Reaction {
  emoji: string;
  count: number;
  users: UUID[];
  hasReacted?: boolean;
}

/**
 * Attachment
 */
export interface Attachment {
  id: UUID;
  type: "file" | "image" | "video" | "audio";
  name: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

/**
 * Webhook
 */
export interface Webhook {
  id: UUID;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

/**
 * Bot
 */
export interface Bot {
  id: UUID;
  name: string;
  username: string;
  description?: string;
  avatarUrl?: string;
  isActive: boolean;
  apiKey: string;
  permissions: string[];
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

/**
 * Pagination
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

/**
 * List Options
 */
export interface ListOptions extends PaginationOptions {
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  filter?: Record<string, unknown>;
  /** Index signature to allow passing to URLSearchParams */
  [key: string]: unknown;
}

/**
 * Query Result
 */
export interface QueryResult<T> {
  data?: T;
  error?: Error;
  loading: boolean;
}

/**
 * Mutation Result
 */
export interface MutationResult<T> {
  data?: T;
  error?: Error;
  success: boolean;
}
