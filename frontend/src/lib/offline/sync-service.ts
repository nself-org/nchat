/**
 * Offline Sync Service
 *
 * Handles automatic synchronization of offline queues:
 * - Monitors online/offline status
 * - Processes message queue
 * - Processes upload queue
 * - Syncs settings and preferences
 * - Manages retry logic with exponential backoff
 */

import { offlineDB, QueuedMessage, QueuedUpload } from "./indexeddb";
import { ConflictResolver } from "./conflict-resolver";

export type SyncStatus = "idle" | "syncing" | "paused" | "error";

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

export interface SyncOptions {
  maxRetries?: number;
  retryDelay?: number; // Base delay in ms
  maxRetryDelay?: number; // Max delay in ms
  batchSize?: number;
}

const DEFAULT_OPTIONS: Required<SyncOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  maxRetryDelay: 30000,
  batchSize: 10,
};

type SyncListener = (status: SyncStatus, progress?: SyncProgress) => void;

class OfflineSyncService {
  private isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  private status: SyncStatus = "idle";
  private listeners = new Set<SyncListener>();
  private syncInterval: NodeJS.Timeout | null = null;
  private conflictResolver = new ConflictResolver();
  private options: Required<SyncOptions> = DEFAULT_OPTIONS;

  constructor() {
    if (typeof window !== "undefined") {
      this.setupEventListeners();
    }
  }

  /**
   * Setup online/offline event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // Listen for visibility changes to sync when app becomes visible
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  /**
   * Handle online event
   */
  private handleOnline = async (): Promise<void> => {
    console.log("[OfflineSync] Connection restored, starting sync...");
    this.isOnline = true;
    await this.sync();
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    console.log("[OfflineSync] Connection lost");
    this.isOnline = false;
    this.pauseSync();
  };

  /**
   * Handle visibility change
   */
  private handleVisibilityChange = async (): Promise<void> => {
    if (document.visibilityState === "visible" && this.isOnline) {
      // Check if we have pending items
      const messageQueue = await offlineDB.getMessageQueue("pending");
      const uploadQueue = await offlineDB.getUploadQueue("pending");

      if (messageQueue.length > 0 || uploadQueue.length > 0) {
        await this.sync();
      }
    }
  };

  /**
   * Configure sync options
   */
  configure(options: SyncOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Add sync status listener
   */
  addListener(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: SyncStatus, progress?: SyncProgress): void {
    this.status = status;
    this.listeners.forEach((listener) => listener(status, progress));
  }

  /**
   * Start automatic sync
   */
  startAutoSync(intervalMs = 30000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (this.isOnline && this.status === "idle") {
        await this.sync();
      }
    }, intervalMs);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Pause sync temporarily
   */
  pauseSync(): void {
    this.notifyListeners("paused");
  }

  /**
   * Main sync method - processes all queues
   */
  async sync(): Promise<void> {
    if (!this.isOnline) {
      console.log("[OfflineSync] Offline, skipping sync");
      return;
    }

    if (this.status === "syncing") {
      console.log("[OfflineSync] Already syncing");
      return;
    }

    try {
      this.notifyListeners("syncing");

      // 1. Process upload queue first (messages may depend on uploads)
      await this.syncUploads();

      // 2. Process message queue
      await this.syncMessages();

      // 3. Sync settings
      await this.syncSettings();

      // 4. Check for conflicts
      await this.checkConflicts();

      this.notifyListeners("idle");
    } catch (error) {
      console.error("[OfflineSync] Sync failed:", error);
      this.notifyListeners("error");
      throw error;
    }
  }

  /**
   * Sync message queue
   */
  private async syncMessages(): Promise<void> {
    const queue = await offlineDB.getMessageQueue("pending");

    if (queue.length === 0) {
      return;
    }

    console.log(`[OfflineSync] Syncing ${queue.length} messages...`);

    const total = queue.length;
    let completed = 0;
    let failed = 0;

    for (const message of queue) {
      this.notifyListeners("syncing", {
        total,
        completed,
        failed,
        current: message.id,
      });

      try {
        await this.sendMessage(message);
        await offlineDB.removeFromMessageQueue(message.id);
        completed++;
      } catch (error) {
        console.error("[OfflineSync] Failed to sync message:", error);
        failed++;

        // Update retry info
        await offlineDB.updateMessageQueueItem(message.id, {
          attempts: message.attempts + 1,
          lastAttempt: Date.now(),
          error: error instanceof Error ? error.message : "Unknown error",
          status:
            message.attempts + 1 >= this.options.maxRetries
              ? "failed"
              : "pending",
        });
      }
    }

    console.log(
      `[OfflineSync] Messages synced: ${completed} succeeded, ${failed} failed`,
    );
  }

  /**
   * Send a queued message
   */
  private async sendMessage(message: QueuedMessage): Promise<void> {
    // Mark as syncing
    await offlineDB.updateMessageQueueItem(message.id, { status: "syncing" });

    // Send to server (implement actual API call)
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: message.channelId,
        content: message.content,
        contentType: message.contentType,
        attachments: message.attachments,
        replyTo: message.replyTo,
        metadata: message.metadata,
        tempId: message.id, // For client-side matching
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    const result = await response.json();

    // Cache the synced message
    await offlineDB.cacheMessage({
      id: result.id,
      channelId: message.channelId,
      content: message.content,
      userId: result.userId,
      createdAt: result.createdAt,
      version: 1,
      lastSynced: Date.now(),
    });

    // Update sync metadata
    await offlineDB.setSyncMetadata({
      entityType: "message",
      entityId: result.id,
      localVersion: 1,
      serverVersion: 1,
      lastSynced: Date.now(),
      hasConflict: false,
    });
  }

  /**
   * Sync upload queue
   */
  private async syncUploads(): Promise<void> {
    const queue = await offlineDB.getUploadQueue("pending");

    if (queue.length === 0) {
      return;
    }

    console.log(`[OfflineSync] Syncing ${queue.length} uploads...`);

    const total = queue.length;
    let completed = 0;
    let failed = 0;

    for (const upload of queue) {
      this.notifyListeners("syncing", {
        total,
        completed,
        failed,
        current: upload.id,
      });

      try {
        await this.uploadFile(upload);
        await offlineDB.removeFromUploadQueue(upload.id);
        completed++;
      } catch (error) {
        console.error("[OfflineSync] Failed to sync upload:", error);
        failed++;

        await offlineDB.updateUploadQueueItem(upload.id, {
          attempts: upload.attempts + 1,
          lastAttempt: Date.now(),
          error: error instanceof Error ? error.message : "Unknown error",
          status:
            upload.attempts + 1 >= this.options.maxRetries
              ? "failed"
              : "pending",
        });
      }
    }

    console.log(
      `[OfflineSync] Uploads synced: ${completed} succeeded, ${failed} failed`,
    );
  }

  /**
   * Upload a queued file
   */
  private async uploadFile(upload: QueuedUpload): Promise<void> {
    await offlineDB.updateUploadQueueItem(upload.id, {
      status: "uploading",
      progress: 0,
    });

    const formData = new FormData();
    formData.append("file", upload.file);
    formData.append("channelId", upload.channelId);
    if (upload.messageId) {
      formData.append("messageId", upload.messageId);
    }

    // Use XMLHttpRequest for progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", async (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          await offlineDB.updateUploadQueueItem(upload.id, { progress });
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"));
      });

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    });

    await offlineDB.updateUploadQueueItem(upload.id, {
      status: "uploaded",
      progress: 100,
    });
  }

  /**
   * Sync user settings
   */
  private async syncSettings(): Promise<void> {
    // Get current user (implement actual auth check)
    const userId = this.getCurrentUserId();
    if (!userId) return;

    const localSettings = await offlineDB.getSettings(userId);
    if (!localSettings) return;

    try {
      // Fetch server settings
      const response = await fetch(`/api/users/${userId}/settings`);
      if (!response.ok) {
        throw new Error("Failed to fetch server settings");
      }

      const serverSettings = await response.json();

      // Check for conflicts
      if (serverSettings.version > localSettings.version) {
        // Server is newer - check for conflict
        if (localSettings.lastSynced < serverSettings.updatedAt) {
          // Conflict detected
          await offlineDB.setSyncMetadata({
            entityType: "settings",
            entityId: userId,
            localVersion: localSettings.version,
            serverVersion: serverSettings.version,
            lastSynced: Date.now(),
            hasConflict: true,
            conflictData: { local: localSettings, server: serverSettings },
          });
          return;
        }
      }

      // No conflict or local is newer - sync to server
      if (localSettings.version >= serverSettings.version) {
        const syncResponse = await fetch(`/api/users/${userId}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(localSettings),
        });

        if (!syncResponse.ok) {
          throw new Error("Failed to sync settings");
        }

        // Update local sync timestamp
        await offlineDB.saveSettings({
          ...localSettings,
          lastSynced: Date.now(),
        });
      }
    } catch (error) {
      console.error("[OfflineSync] Settings sync failed:", error);
    }
  }

  /**
   * Check and resolve conflicts
   */
  private async checkConflicts(): Promise<void> {
    const conflicts = await offlineDB.getConflicts();

    if (conflicts.length > 0) {
      console.log(`[OfflineSync] Found ${conflicts.length} conflicts`);

      for (const conflict of conflicts) {
        try {
          // @ts-expect-error - SyncMetadata and Conflict types are compatible but not exact
          await this.conflictResolver.resolve(conflict);
          await offlineDB.resolveConflict(
            conflict.entityType,
            conflict.entityId,
          );
        } catch (error) {
          console.error("[OfflineSync] Failed to resolve conflict:", error);
        }
      }
    }
  }

  /**
   * Get current user ID from localStorage
   * Falls back to localStorage as the offline sync runs independently
   * of React context. The auth context sets this value on login.
   */
  private getCurrentUserId(): string | null {
    return typeof window !== "undefined"
      ? localStorage.getItem("userId")
      : null;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(attempts: number): number {
    const delay = this.options.retryDelay * Math.pow(2, attempts);
    return Math.min(delay, this.options.maxRetryDelay);
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Check if online
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    messages: { pending: number; failed: number; syncing: number };
    uploads: { pending: number; failed: number; uploading: number };
  }> {
    const [
      pendingMessages,
      failedMessages,
      syncingMessages,
      pendingUploads,
      failedUploads,
      uploadingUploads,
    ] = await Promise.all([
      offlineDB.getMessageQueue("pending"),
      offlineDB.getMessageQueue("failed"),
      offlineDB.getMessageQueue("syncing"),
      offlineDB.getUploadQueue("pending"),
      offlineDB.getUploadQueue("failed"),
      offlineDB.getUploadQueue("uploading"),
    ]);

    return {
      messages: {
        pending: pendingMessages.length,
        failed: failedMessages.length,
        syncing: syncingMessages.length,
      },
      uploads: {
        pending: pendingUploads.length,
        failed: failedUploads.length,
        uploading: uploadingUploads.length,
      },
    };
  }

  /**
   * Retry failed items
   */
  async retryFailed(): Promise<void> {
    const [failedMessages, failedUploads] = await Promise.all([
      offlineDB.getMessageQueue("failed"),
      offlineDB.getUploadQueue("failed"),
    ]);

    // Reset failed items to pending
    await Promise.all([
      ...failedMessages.map((msg) =>
        offlineDB.updateMessageQueueItem(msg.id, {
          status: "pending",
          attempts: 0,
          error: undefined,
        }),
      ),
      ...failedUploads.map((upload) =>
        offlineDB.updateUploadQueueItem(upload.id, {
          status: "pending",
          attempts: 0,
          error: undefined,
        }),
      ),
    ]);

    // Trigger sync
    await this.sync();
  }

  /**
   * Clear all queues
   */
  async clearQueues(): Promise<void> {
    await offlineDB.clearMessageQueue();
    // Upload queue needs individual deletion to revoke object URLs
    const uploads = await offlineDB.getUploadQueue();
    await Promise.all(
      uploads.map((upload) => offlineDB.removeFromUploadQueue(upload.id)),
    );
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAutoSync();

    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }

    this.listeners.clear();
  }
}

// Singleton instance
export const syncService = new OfflineSyncService();
