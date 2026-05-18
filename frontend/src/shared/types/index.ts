/**
 * Shared types for nself-chat (web and mobile)
 * These types are platform-agnostic and can be used in both Next.js and React Native
 */

// Re-export app config types
export type { AppConfig } from "../../config/app-config";

// User types
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
  lastSeen?: Date;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserStatus = "online" | "offline" | "away" | "dnd";
export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

// Channel types
export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: ChannelType;
  isPrivate: boolean;
  createdBy: string;
  members: string[];
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  unreadCount?: number;
}

export type ChannelType = "public" | "private" | "direct" | "group";

// Message types
export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  type: MessageType;
  attachments?: Attachment[];
  reactions?: Reaction[];
  replyTo?: string;
  threadId?: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "system";

export interface Attachment {
  id: string;
  type: AttachmentType;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export type AttachmentType = "image" | "video" | "audio" | "file";

export interface Reaction {
  emoji: string;
  userIds: string[];
  count: number;
}

// Thread types
export interface Thread {
  id: string;
  channelId: string;
  parentMessageId: string;
  participantIds: string[];
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

export type NotificationType =
  | "message"
  | "mention"
  | "reaction"
  | "thread_reply"
  | "channel_invite"
  | "direct_message"
  | "system";

// Call types
export interface Call {
  id: string;
  type: CallType;
  status: CallStatus;
  participants: CallParticipant[];
  initiatorId: string;
  channelId?: string;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
}

export type CallType = "audio" | "video";
export type CallStatus = "ringing" | "active" | "ended" | "missed" | "declined";

export interface CallParticipant {
  userId: string;
  joinedAt?: Date;
  leftAt?: Date;
  isMuted: boolean;
  isVideoEnabled: boolean;
}

// Status/Stories types
export interface Status {
  id: string;
  userId: string;
  type: StatusType;
  content: string;
  mediaUrl?: string;
  backgroundColor?: string;
  viewerIds: string[];
  expiresAt: Date;
  createdAt: Date;
}

export type StatusType = "text" | "image" | "video";

// Search types
export interface SearchResult {
  type: "message" | "channel" | "user" | "file";
  id: string;
  title: string;
  subtitle?: string;
  highlight?: string;
  timestamp?: Date;
}

// Typing indicator
export interface TypingIndicator {
  channelId: string;
  userId: string;
  timestamp: Date;
}

// Presence
export interface Presence {
  userId: string;
  status: UserStatus;
  lastSeen: Date;
  customStatus?: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}
