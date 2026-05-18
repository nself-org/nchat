/**
 * Search Sync Service
 *
 * Keeps MeiliSearch indexes synchronized with the database.
 * Handles real-time indexing, batch syncing, and reindexing operations.
 *
 * Features:
 * - Real-time indexing on create/update/delete
 * - Batch synchronization
 * - Full reindexing
 * - Sync status tracking
 * - Error recovery and retry logic
 *
 * @module services/search/sync.service
 */

import {
  getMeiliClient,
  getMessagesIndex,
  getFilesIndex,
  getUsersIndex,
  getChannelsIndex,
  INDEXES,
  type MeiliMessageDocument,
  type MeiliFileDocument,
  type MeiliUserDocument,
  type MeiliChannelDocument,
} from "@/lib/search/meilisearch-config";
import {
  MessageIndexer,
  getMessageIndexer,
  transformMessageToDocument,
} from "./message-indexer";
import type { Message } from "@/types/message";
import type { Channel } from "@/types/channel";
import type { User, UserBasicInfo } from "@/types/user";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface SyncStatus {
  indexName: string;
  lastSyncAt: Date | null;
  documentsIndexed: number;
  documentsPending: number;
  isRunning: boolean;
  errors: SyncError[];
}

export interface SyncError {
  documentId: string;
  error: string;
  timestamp: Date;
  retryCount: number;
}

export interface SyncResult {
  success: boolean;
  indexed: number;
  failed: number;
  duration: number;
  errors: SyncError[];
}

export interface ReindexProgress {
  indexName: string;
  total: number;
  processed: number;
  failed: number;
  percentage: number;
  startedAt: Date;
  estimatedCompletion?: Date;
}

export type SyncEventType =
  | "create"
  | "update"
  | "delete"
  | "bulk_create"
  | "bulk_delete";

export interface SyncEvent<T = unknown> {
  type: SyncEventType;
  indexName: string;
  documentId?: string;
  documentIds?: string[];
  document?: T;
  documents?: T[];
  timestamp: Date;
}

export type SyncEventHandler = (event: SyncEvent) => void;

// ============================================================================
// File Document Transformer
// ============================================================================

export interface FileInput {
  id: string;
  name: string;
  originalName?: string;
  description?: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  channelId: string;
  channelName?: string;
  messageId: string;
  uploaderId: string;
  uploaderName?: string;
  uploaderUsername?: string;
  createdAt: Date | string;
  extractedText?: string;
  width?: number;
  height?: number;
  duration?: number;
}

function getFileType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("text")
  )
    return "document";
  return "other";
}

function getFileCategory(mimeType: string): string {
  const type = mimeType.split("/")[1] || "unknown";
  return type;
}

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function transformFileToDocument(file: FileInput): MeiliFileDocument {
  return {
    id: file.id,
    name: file.name,
    original_name: file.originalName || file.name,
    description: file.description,
    mime_type: file.mimeType,
    file_type: getFileType(file.mimeType),
    file_category: getFileCategory(file.mimeType),
    extension: getFileExtension(file.name),
    size: file.size,
    url: file.url,
    thumbnail_url: file.thumbnailUrl,
    uploader_id: file.uploaderId,
    uploader_name: file.uploaderName || "",
    uploader_username: file.uploaderUsername || "",
    channel_id: file.channelId,
    channel_name: file.channelName || "",
    message_id: file.messageId,
    created_at: Math.floor(new Date(file.createdAt).getTime() / 1000),
    extracted_text: file.extractedText,
    width: file.width,
    height: file.height,
    duration: file.duration,
  };
}

// ============================================================================
// User Document Transformer
// ============================================================================

export interface UserInput {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  jobTitle?: string;
  department?: string;
  role: string;
  isActive: boolean;
  isBot: boolean;
  createdAt: Date | string;
  lastSeenAt?: Date | string;
}

function transformUserToDocument(user: UserInput): MeiliUserDocument {
  return {
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    email: user.email,
    avatar_url: user.avatarUrl,
    bio: user.bio,
    job_title: user.jobTitle,
    department: user.department,
    role: user.role,
    is_active: user.isActive,
    is_bot: user.isBot,
    created_at: Math.floor(new Date(user.createdAt).getTime() / 1000),
    last_seen_at: user.lastSeenAt
      ? Math.floor(new Date(user.lastSeenAt).getTime() / 1000)
      : undefined,
  };
}

// ============================================================================
// Channel Document Transformer
// ============================================================================

export interface ChannelInput {
  id: string;
  name: string;
  description?: string;
  topic?: string;
  type: string;
  isPrivate?: boolean;
  isArchived?: boolean;
  isDefault?: boolean;
  createdBy: string;
  createdAt: Date | string;
  categoryId?: string;
  memberCount: number;
  lastMessageAt?: Date | string;
  icon?: string;
}

function transformChannelToDocument(
  channel: ChannelInput,
): MeiliChannelDocument {
  return {
    id: channel.id,
    name: channel.name,
    description: channel.description,
    topic: channel.topic,
    type: channel.type,
    is_private: channel.isPrivate || channel.type === "private",
    is_archived: channel.isArchived || false,
    is_default: channel.isDefault || false,
    created_by: channel.createdBy,
    created_at: Math.floor(new Date(channel.createdAt).getTime() / 1000),
    category_id: channel.categoryId,
    member_count: channel.memberCount,
    last_message_at: channel.lastMessageAt
      ? Math.floor(new Date(channel.lastMessageAt).getTime() / 1000)
      : undefined,
    icon: channel.icon,
  };
}

// ============================================================================
// Sync Service Class
// ============================================================================

export class SyncService {
  private client = getMeiliClient();
  private messageIndexer: MessageIndexer;
  private syncStatus: Map<string, SyncStatus> = new Map();
  private eventHandlers: Set<SyncEventHandler> = new Set();
  private reindexProgress: Map<string, ReindexProgress> = new Map();
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.messageIndexer = getMessageIndexer();

    // Initialize sync status for all indexes
    for (const indexName of Object.values(INDEXES)) {
      this.syncStatus.set(indexName, {
        indexName,
        lastSyncAt: null,
        documentsIndexed: 0,
        documentsPending: 0,
        isRunning: false,
        errors: [],
      });
    }
  }

  // --------------------------------------------------------------------------
  // Real-time Sync: Messages
  // --------------------------------------------------------------------------

  /**
   * Index a new message
   */
  async indexMessage(
    message: Message,
    channel?: Pick<Channel, "id" | "name">,
    author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">,
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const result = await this.messageIndexer.indexMessage(
        message,
        channel,
        author,
      );

      if (result.success) {
        this.updateSyncStatus(INDEXES.MESSAGES, { documentsIndexed: 1 });
        this.emitEvent({
          type: "create",
          indexName: INDEXES.MESSAGES,
          documentId: message.id,
          document: message,
          timestamp: new Date(),
        });

        return {
          success: true,
          indexed: 1,
          failed: 0,
          duration: Date.now() - startTime,
          errors: [],
        };
      }

      return {
        success: false,
        indexed: 0,
        failed: 1,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: message.id,
            error: result.error || "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        indexed: 0,
        failed: 1,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: message.id,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    }
  }

  /**
   * Update a message in the index
   */
  async updateMessage(
    message: Message,
    channel?: Pick<Channel, "id" | "name">,
    author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">,
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const result = await this.messageIndexer.updateMessage(
        message,
        channel,
        author,
      );

      if (result.success) {
        this.emitEvent({
          type: "update",
          indexName: INDEXES.MESSAGES,
          documentId: message.id,
          document: message,
          timestamp: new Date(),
        });

        return {
          success: true,
          indexed: 1,
          failed: 0,
          duration: Date.now() - startTime,
          errors: [],
        };
      }

      return {
        success: false,
        indexed: 0,
        failed: 1,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: message.id,
            error: result.error || "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        indexed: 0,
        failed: 1,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: message.id,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    }
  }

  /**
   * Remove a message from the index
   */
  async removeMessage(messageId: string): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const result = await this.messageIndexer.removeMessage(messageId);

      if (result.success) {
        this.emitEvent({
          type: "delete",
          indexName: INDEXES.MESSAGES,
          documentId: messageId,
          timestamp: new Date(),
        });

        return {
          success: true,
          indexed: 0,
          failed: 0,
          duration: Date.now() - startTime,
          errors: [],
        };
      }

      return {
        success: false,
        indexed: 0,
        failed: 1,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: messageId,
            error: result.error || "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        indexed: 0,
        failed: 1,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: messageId,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    }
  }

  // --------------------------------------------------------------------------
  // Real-time Sync: Files
  // --------------------------------------------------------------------------

  /**
   * Index a file
   */
  async indexFile(file: FileInput): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const document = transformFileToDocument(file);
      const index = getFilesIndex();
      const task = await index.addDocuments([document]);

      this.updateSyncStatus(INDEXES.FILES, { documentsIndexed: 1 });
      this.emitEvent({
        type: "create",
        indexName: INDEXES.FILES,
        documentId: file.id,
        document: file,
        timestamp: new Date(),
      });

      return {
        success: true,
        indexed: 1,
        failed: 0,
        duration: Date.now() - startTime,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        indexed: 0,
        failed: 1,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: file.id,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    }
  }

  /**
   * Update a file in the index
   */
  async updateFile(file: FileInput): Promise<SyncResult> {
    return this.indexFile(file); // MeiliSearch handles updates via addDocuments
  }

  /**
   * Remove a file from the index
   */
  async removeFile(fileId: string): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const index = getFilesIndex();
      await index.deleteDocument(fileId);

      this.emitEvent({
        type: "delete",
        indexName: INDEXES.FILES,
        documentId: fileId,
        timestamp: new Date(),
      });

      return {
        success: true,
        indexed: 0,
        failed: 0,
        duration: Date.now() - startTime,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        indexed: 0,
        failed: 1,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: fileId,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    }
  }

  // --------------------------------------------------------------------------
  // Real-time Sync: Users
  // --------------------------------------------------------------------------

  /**
   * Index a user
   */
  async indexUser(user: UserInput): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const document = transformUserToDocument(user);
      const index = getUsersIndex();
      await index.addDocuments([document]);

      this.updateSyncStatus(INDEXES.USERS, { documentsIndexed: 1 });
      this.emitEvent({
        type: "create",
        indexName: INDEXES.USERS,
        documentId: user.id,
        document: user,
        timestamp: new Date(),
      });

      return {
        success: true,
        indexed: 1,
        failed: 0,
        duration: Date.now() - startTime,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        indexed: 0,
        failed: 1,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: user.id,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    }
  }

  /**
   * Update a user in the index
   */
  async updateUser(user: UserInput): Promise<SyncResult> {
    return this.indexUser(user);
  }

  /**
   * Remove a user from the index
   */
  async removeUser(userId: string): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const index = getUsersIndex();
      await index.deleteDocument(userId);

      this.emitEvent({
        type: "delete",
        indexName: INDEXES.USERS,
        documentId: userId,
        timestamp: new Date(),
      });

      return {
        success: true,
        indexed: 0,
        failed: 0,
        duration: Date.now() - startTime,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        indexed: 0,
        failed: 1,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: userId,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    }
  }

  // --------------------------------------------------------------------------
  // Real-time Sync: Channels
  // --------------------------------------------------------------------------

  /**
   * Index a channel
   */
  async indexChannel(channel: ChannelInput): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const document = transformChannelToDocument(channel);
      const index = getChannelsIndex();
      await index.addDocuments([document]);

      this.updateSyncStatus(INDEXES.CHANNELS, { documentsIndexed: 1 });
      this.emitEvent({
        type: "create",
        indexName: INDEXES.CHANNELS,
        documentId: channel.id,
        document: channel,
        timestamp: new Date(),
      });

      return {
        success: true,
        indexed: 1,
        failed: 0,
        duration: Date.now() - startTime,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        indexed: 0,
        failed: 1,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: channel.id,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    }
  }

  /**
   * Update a channel in the index
   */
  async updateChannel(channel: ChannelInput): Promise<SyncResult> {
    return this.indexChannel(channel);
  }

  /**
   * Remove a channel from the index
   */
  async removeChannel(channelId: string): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const index = getChannelsIndex();
      await index.deleteDocument(channelId);

      this.emitEvent({
        type: "delete",
        indexName: INDEXES.CHANNELS,
        documentId: channelId,
        timestamp: new Date(),
      });

      return {
        success: true,
        indexed: 0,
        failed: 0,
        duration: Date.now() - startTime,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        indexed: 0,
        failed: 1,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: channelId,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    }
  }

  // --------------------------------------------------------------------------
  // Batch Sync
  // --------------------------------------------------------------------------

  /**
   * Batch index messages
   */
  async batchIndexMessages(
    messages: Array<{
      message: Message;
      channel?: Pick<Channel, "id" | "name">;
      author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
    }>,
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const result = await this.messageIndexer.indexMessages(messages);

      this.updateSyncStatus(INDEXES.MESSAGES, {
        documentsIndexed: result.successful,
      });
      this.emitEvent({
        type: "bulk_create",
        indexName: INDEXES.MESSAGES,
        documentIds: messages.map((m) => m.message.id),
        timestamp: new Date(),
      });

      return {
        success: result.failed === 0,
        indexed: result.successful,
        failed: result.failed,
        duration: Date.now() - startTime,
        errors: result.errors.map((e: any) => ({
          documentId: e.documentId || e.id || "unknown",
          error: e.error || e.message || "Unknown error",
          timestamp: new Date(),
          retryCount: 0,
        })) as SyncError[],
      };
    } catch (error) {
      return {
        success: false,
        indexed: 0,
        failed: messages.length,
        duration: Date.now() - startTime,
        errors: messages.map((m) => ({
          documentId: m.message.id,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date(),
          retryCount: 0,
        })),
      };
    }
  }

  /**
   * Batch index files
   */
  async batchIndexFiles(files: FileInput[]): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncError[] = [];
    let indexed = 0;

    try {
      const documents = files.map(transformFileToDocument);
      const index = getFilesIndex();
      await index.addDocuments(documents);
      indexed = files.length;

      this.updateSyncStatus(INDEXES.FILES, { documentsIndexed: indexed });
      this.emitEvent({
        type: "bulk_create",
        indexName: INDEXES.FILES,
        documentIds: files.map((f) => f.id),
        timestamp: new Date(),
      });
    } catch (error) {
      errors.push(
        ...files.map((f) => ({
          documentId: f.id,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date(),
          retryCount: 0,
        })),
      );
    }

    return {
      success: errors.length === 0,
      indexed,
      failed: errors.length,
      duration: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Batch index users
   */
  async batchIndexUsers(users: UserInput[]): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncError[] = [];
    let indexed = 0;

    try {
      const documents = users.map(transformUserToDocument);
      const index = getUsersIndex();
      await index.addDocuments(documents);
      indexed = users.length;

      this.updateSyncStatus(INDEXES.USERS, { documentsIndexed: indexed });
      this.emitEvent({
        type: "bulk_create",
        indexName: INDEXES.USERS,
        documentIds: users.map((u) => u.id),
        timestamp: new Date(),
      });
    } catch (error) {
      errors.push(
        ...users.map((u) => ({
          documentId: u.id,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date(),
          retryCount: 0,
        })),
      );
    }

    return {
      success: errors.length === 0,
      indexed,
      failed: errors.length,
      duration: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Batch index channels
   */
  async batchIndexChannels(channels: ChannelInput[]): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncError[] = [];
    let indexed = 0;

    try {
      const documents = channels.map(transformChannelToDocument);
      const index = getChannelsIndex();
      await index.addDocuments(documents);
      indexed = channels.length;

      this.updateSyncStatus(INDEXES.CHANNELS, { documentsIndexed: indexed });
      this.emitEvent({
        type: "bulk_create",
        indexName: INDEXES.CHANNELS,
        documentIds: channels.map((c) => c.id),
        timestamp: new Date(),
      });
    } catch (error) {
      errors.push(
        ...channels.map((c) => ({
          documentId: c.id,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date(),
          retryCount: 0,
        })),
      );
    }

    return {
      success: errors.length === 0,
      indexed,
      failed: errors.length,
      duration: Date.now() - startTime,
      errors,
    };
  }

  // --------------------------------------------------------------------------
  // Full Reindex
  // --------------------------------------------------------------------------

  /**
   * Reindex all messages
   */
  async reindexMessages(
    getMessages: () => Promise<
      Array<{
        message: Message;
        channel?: Pick<Channel, "id" | "name">;
        author?: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
      }>
    >,
    onProgress?: (progress: ReindexProgress) => void,
  ): Promise<SyncResult> {
    const startTime = Date.now();

    this.reindexProgress.set(INDEXES.MESSAGES, {
      indexName: INDEXES.MESSAGES,
      total: 0,
      processed: 0,
      failed: 0,
      percentage: 0,
      startedAt: new Date(),
    });

    try {
      const result = await this.messageIndexer.reindexAll(
        getMessages,
        (progress) => {
          const reindexProgress: ReindexProgress = {
            indexName: INDEXES.MESSAGES,
            total: progress.total,
            processed: progress.indexed,
            failed: 0,
            percentage: Math.round((progress.indexed / progress.total) * 100),
            startedAt:
              this.reindexProgress.get(INDEXES.MESSAGES)?.startedAt ||
              new Date(),
          };

          this.reindexProgress.set(INDEXES.MESSAGES, reindexProgress);
          onProgress?.(reindexProgress);
        },
      );

      this.reindexProgress.delete(INDEXES.MESSAGES);

      return {
        success: result.failed === 0,
        indexed: result.successful,
        failed: result.failed,
        duration: Date.now() - startTime,
        errors: result.errors.map((e: any) => ({
          documentId: e.documentId || e.id || "unknown",
          error: e.error || e.message || "Unknown error",
          timestamp: new Date(),
          retryCount: 0,
        })) as SyncError[],
      };
    } catch (error) {
      this.reindexProgress.delete(INDEXES.MESSAGES);

      return {
        success: false,
        indexed: 0,
        failed: 0,
        duration: Date.now() - startTime,
        errors: [
          {
            documentId: "reindex",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
      };
    }
  }

  // --------------------------------------------------------------------------
  // Status and Events
  // --------------------------------------------------------------------------

  /**
   * Get sync status for an index
   */
  getSyncStatus(indexName: string): SyncStatus | undefined {
    return this.syncStatus.get(indexName);
  }

  /**
   * Get sync status for all indexes
   */
  getAllSyncStatus(): Map<string, SyncStatus> {
    return new Map(this.syncStatus);
  }

  /**
   * Get reindex progress
   */
  getReindexProgress(indexName: string): ReindexProgress | undefined {
    return this.reindexProgress.get(indexName);
  }

  /**
   * Subscribe to sync events
   */
  onSyncEvent(handler: SyncEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private updateSyncStatus(
    indexName: string,
    updates: Partial<SyncStatus>,
  ): void {
    const current = this.syncStatus.get(indexName);
    if (current) {
      this.syncStatus.set(indexName, {
        ...current,
        ...updates,
        lastSyncAt: new Date(),
      });
    }
  }

  private emitEvent(event: SyncEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        logger.error("[SyncService] Error in event handler:", error);
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.messageIndexer.destroy();
    this.eventHandlers.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let syncServiceInstance: SyncService | null = null;

/**
 * Get the singleton SyncService instance
 */
export function getSyncService(): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
}

/**
 * Create a new SyncService instance
 */
export function createSyncService(): SyncService {
  return new SyncService();
}

export default SyncService;
