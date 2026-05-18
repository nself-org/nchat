/**
 * Data Export Types
 *
 * Type definitions for data export and backup functionality.
 */

export type ExportFormat = "json" | "csv" | "html" | "pdf";

export type ExportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export type ExportScope =
  | "all_messages"
  | "direct_messages"
  | "specific_channels"
  | "user_data";

export interface ExportOptions {
  // Scope
  scope: ExportScope;
  channelIds?: string[];
  includeDirectMessages?: boolean;
  includeGroupMessages?: boolean;

  // Date Range
  fromDate?: Date | null;
  toDate?: Date | null;

  // Content Filters
  includeFiles?: boolean;
  includeReactions?: boolean;
  includeThreads?: boolean;
  includeEdits?: boolean;
  includeDeleted?: boolean;

  // File Options
  embedFiles?: boolean; // Embed files in export vs. links only
  maxFileSize?: number; // Max size in MB for embedded files

  // Format
  format: ExportFormat;

  // Additional Options
  includeUserData?: boolean;
  includeChannelData?: boolean;
  includeMetadata?: boolean;
  anonymize?: boolean; // GDPR: Remove identifying information
}

export interface ExportRequest {
  id: string;
  userId: string;
  status: ExportStatus;
  options: ExportOptions;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  errorMessage?: string;
  progress?: number; // 0-100
  itemsTotal?: number;
  itemsProcessed?: number;
}

export interface ExportMetadata {
  exportId: string;
  exportedAt: Date;
  exportedBy: {
    id: string;
    email: string;
    username: string;
  };
  scope: ExportScope;
  format: ExportFormat;
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
  stats: {
    totalMessages: number;
    totalFiles: number;
    totalUsers: number;
    totalChannels: number;
    totalReactions: number;
    totalThreads: number;
  };
  options: ExportOptions;
}

export interface ExportedMessage {
  id: string;
  channelId: string;
  channelName: string;
  userId: string;
  username: string;
  displayName: string;
  content: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  editedAt?: string;
  deletedAt?: string;

  // Optional fields based on export options
  attachments?: ExportedAttachment[];
  reactions?: ExportedReaction[];
  thread?: ExportedThread;
  replyTo?: {
    id: string;
    content: string;
    username: string;
  };
  mentions?: string[];
  metadata?: Record<string, unknown>;
  editHistory?: ExportedEdit[];
}

export interface ExportedAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  embedData?: string; // Base64 encoded file data if embedded
  uploadedAt: string;
}

export interface ExportedReaction {
  emoji: string;
  userId: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface ExportedThread {
  totalReplies: number;
  replies: Array<{
    id: string;
    content: string;
    userId: string;
    username: string;
    createdAt: string;
  }>;
}

export interface ExportedEdit {
  content: string;
  editedAt: string;
  editedBy: string;
}

export interface ExportedChannel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  isPrivate: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
  };
  memberCount: number;
  messageCount: number;
}

export interface ExportedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  createdAt: string;
  avatarUrl?: string;
  status?: string;
}

export interface ExportData {
  metadata: ExportMetadata;
  messages: ExportedMessage[];
  channels?: ExportedChannel[];
  users?: ExportedUser[];
}

// CSV Export Types
export interface MessageCSVRow {
  message_id: string;
  channel_name: string;
  username: string;
  display_name: string;
  content: string;
  created_at: string;
  is_edited: string;
  is_deleted: string;
  has_attachments: string;
  reactions_count: string;
  thread_replies_count: string;
}

// HTML Export Types
export interface HTMLExportOptions {
  theme: "light" | "dark";
  includeStyles: boolean;
  standalone: boolean;
}
