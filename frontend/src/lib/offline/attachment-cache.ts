/**
 * Attachment Cache - Manages offline caching of file attachments
 *
 * Features:
 * - Configurable size limits (default 100MB)
 * - LRU eviction when cache is full
 * - Blob storage in IndexedDB
 * - Thumbnail generation for images
 * - Download progress tracking
 */

import { openDatabase } from "./offline-storage";

// =============================================================================
// Types
// =============================================================================

export interface CachedAttachment {
  id: string;
  messageId: string;
  channelId: string;
  name: string;
  type: string; // MIME type
  size: number;
  blob: Blob;
  thumbnailBlob?: Blob;
  url?: string; // Original URL
  cachedAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
}

export interface AttachmentCacheConfig {
  /** Maximum cache size in bytes (default: 100MB) */
  maxSize: number;
  /** Maximum size per file in bytes (default: 25MB) */
  maxFileSize: number;
  /** Generate thumbnails for images */
  generateThumbnails: boolean;
  /** Thumbnail max width */
  thumbnailWidth: number;
  /** Thumbnail max height */
  thumbnailHeight: number;
  /** Thumbnail quality (0-1) */
  thumbnailQuality: number;
}

export interface AttachmentCacheStats {
  count: number;
  totalSize: number;
  maxSize: number;
  usagePercent: number;
  oldestAccess: Date | null;
  newestAccess: Date | null;
}

export interface DownloadProgress {
  attachmentId: string;
  loaded: number;
  total: number;
  percent: number;
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void;

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: AttachmentCacheConfig = {
  maxSize: 100 * 1024 * 1024, // 100MB
  maxFileSize: 25 * 1024 * 1024, // 25MB
  generateThumbnails: true,
  thumbnailWidth: 200,
  thumbnailHeight: 200,
  thumbnailQuality: 0.7,
};

// =============================================================================
// Attachment Cache Class
// =============================================================================

export class AttachmentCache {
  private config: AttachmentCacheConfig;
  private currentSize = 0;
  private downloadCallbacks = new Map<string, DownloadProgressCallback>();

  constructor(config: Partial<AttachmentCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the cache
   */
  public async initialize(): Promise<void> {
    await openDatabase();
    await this.calculateCurrentSize();
  }

  // ===========================================================================
  // Cache Operations
  // ===========================================================================

  /**
   * Add an attachment to the cache
   */
  public async add(
    attachment: Omit<
      CachedAttachment,
      "cachedAt" | "lastAccessedAt" | "accessCount"
    >,
  ): Promise<void> {
    // Check file size limit
    if (attachment.size > this.config.maxFileSize) {
      throw new Error(
        `File too large: ${attachment.size} bytes (max: ${this.config.maxFileSize})`,
      );
    }

    // Make room if necessary
    await this.ensureSpace(attachment.size);

    const now = new Date();
    const cached: CachedAttachment = {
      ...attachment,
      cachedAt: now,
      lastAccessedAt: now,
      accessCount: 0,
    };

    // Generate thumbnail if it's an image
    if (
      this.config.generateThumbnails &&
      attachment.type.startsWith("image/")
    ) {
      cached.thumbnailBlob = await this.generateThumbnail(attachment.blob);
    }

    // Store in IndexedDB
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("attachments", "readwrite");
      const store = transaction.objectStore("attachments");
      const request = store.put(cached);

      request.onsuccess = () => {
        this.currentSize += attachment.size;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get an attachment from the cache
   */
  public async get(id: string): Promise<CachedAttachment | null> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("attachments", "readwrite");
      const store = transaction.objectStore("attachments");
      const request = store.get(id);

      request.onsuccess = () => {
        const attachment = request.result as CachedAttachment | undefined;
        if (attachment) {
          // Update access stats
          attachment.lastAccessedAt = new Date();
          attachment.accessCount++;
          store.put(attachment);

          resolve(attachment);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get attachments for a message
   */
  public async getByMessage(messageId: string): Promise<CachedAttachment[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("attachments", "readonly");
      const store = transaction.objectStore("attachments");
      const index = store.index("by-messageId");
      const request = index.getAll(messageId);

      request.onsuccess = () => resolve(request.result as CachedAttachment[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Download and cache an attachment
   */
  public async download(
    url: string,
    attachmentInfo: Omit<
      CachedAttachment,
      "blob" | "cachedAt" | "lastAccessedAt" | "accessCount"
    >,
    onProgress?: DownloadProgressCallback,
  ): Promise<CachedAttachment> {
    if (onProgress) {
      this.downloadCallbacks.set(attachmentInfo.id, onProgress);
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const total = parseInt(response.headers.get("content-length") || "0", 10);
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const chunks: BlobPart[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value as BlobPart);
        loaded += value.length;

        if (onProgress) {
          onProgress({
            attachmentId: attachmentInfo.id,
            loaded,
            total,
            percent: total > 0 ? (loaded / total) * 100 : 0,
          });
        }
      }

      // Create blob from chunks
      const blob = new Blob(chunks, { type: attachmentInfo.type });

      // Add to cache
      await this.add({
        ...attachmentInfo,
        blob,
        url,
      });

      // Get the cached attachment
      const cached = await this.get(attachmentInfo.id);
      if (!cached) {
        throw new Error("Failed to retrieve cached attachment");
      }

      return cached;
    } finally {
      this.downloadCallbacks.delete(attachmentInfo.id);
    }
  }

  /**
   * Remove an attachment from the cache
   */
  public async remove(id: string): Promise<void> {
    const attachment = await this.get(id);
    if (!attachment) return;

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("attachments", "readwrite");
      const store = transaction.objectStore("attachments");
      const request = store.delete(id);

      request.onsuccess = () => {
        this.currentSize -= attachment.size;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached attachments
   */
  public async clear(): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("attachments", "readwrite");
      const store = transaction.objectStore("attachments");
      const request = store.clear();

      request.onsuccess = () => {
        this.currentSize = 0;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Ensure there's enough space for a new attachment
   */
  private async ensureSpace(neededSize: number): Promise<void> {
    // Calculate total size needed
    const totalNeeded = this.currentSize + neededSize;

    if (totalNeeded <= this.config.maxSize) {
      return; // Enough space
    }

    // Need to evict some attachments
    const toEvict = totalNeeded - this.config.maxSize;
    await this.evictLRU(toEvict);
  }

  /**
   * Evict least recently used attachments
   */
  private async evictLRU(bytesToFree: number): Promise<void> {
    const db = await openDatabase();
    const attachments = await this.getAll();

    // Sort by last accessed (oldest first)
    attachments.sort(
      (a, b) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime(),
    );

    let freed = 0;
    const toRemove: string[] = [];

    for (const attachment of attachments) {
      if (freed >= bytesToFree) break;

      toRemove.push(attachment.id);
      freed += attachment.size;
    }

    // Remove attachments
    await Promise.all(toRemove.map((id) => this.remove(id)));

    // REMOVED: console.log(`[AttachmentCache] Evicted ${toRemove.length} attachments (${freed} bytes)`)
  }

  /**
   * Calculate current cache size
   */
  private async calculateCurrentSize(): Promise<void> {
    const attachments = await this.getAll();
    this.currentSize = attachments.reduce((sum, a) => sum + a.size, 0);
  }

  /**
   * Get all cached attachments
   */
  public async getAll(): Promise<CachedAttachment[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("attachments", "readonly");
      const store = transaction.objectStore("attachments");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as CachedAttachment[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<AttachmentCacheStats> {
    const attachments = await this.getAll();

    let oldestAccess: Date | null = null;
    let newestAccess: Date | null = null;

    for (const attachment of attachments) {
      const accessTime = attachment.lastAccessedAt;

      if (!oldestAccess || accessTime < oldestAccess) {
        oldestAccess = accessTime;
      }

      if (!newestAccess || accessTime > newestAccess) {
        newestAccess = accessTime;
      }
    }

    return {
      count: attachments.length,
      totalSize: this.currentSize,
      maxSize: this.config.maxSize,
      usagePercent: (this.currentSize / this.config.maxSize) * 100,
      oldestAccess,
      newestAccess,
    };
  }

  // ===========================================================================
  // Thumbnail Generation
  // ===========================================================================

  /**
   * Generate a thumbnail from an image blob
   */
  private async generateThumbnail(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      img.onload = () => {
        // Calculate thumbnail dimensions (maintain aspect ratio)
        let width = img.width;
        let height = img.height;

        if (
          width > this.config.thumbnailWidth ||
          height > this.config.thumbnailHeight
        ) {
          const ratio = Math.min(
            this.config.thumbnailWidth / width,
            this.config.thumbnailHeight / height,
          );
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw thumbnail
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (thumbnailBlob) => {
            if (thumbnailBlob) {
              resolve(thumbnailBlob);
            } else {
              reject(new Error("Failed to generate thumbnail"));
            }
          },
          "image/jpeg",
          this.config.thumbnailQuality,
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image for thumbnail"));
      };

      img.src = URL.createObjectURL(blob);
    });
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  /**
   * Create a data URL from a cached attachment
   */
  public async getDataUrl(id: string): Promise<string | null> {
    const attachment = await this.get(id);
    if (!attachment) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(attachment.blob);
    });
  }

  /**
   * Create a data URL for a thumbnail
   */
  public async getThumbnailDataUrl(id: string): Promise<string | null> {
    const attachment = await this.get(id);
    if (!attachment?.thumbnailBlob) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(attachment.thumbnailBlob!);
    });
  }

  /**
   * Check if an attachment is cached
   */
  public async isCached(id: string): Promise<boolean> {
    const attachment = await this.get(id);
    return attachment !== null;
  }

  /**
   * Get current cache size
   */
  public getCurrentSize(): number {
    return this.currentSize;
  }

  /**
   * Get max cache size
   */
  public getMaxSize(): number {
    return this.config.maxSize;
  }

  /**
   * Set max cache size
   */
  public async setMaxSize(maxSize: number): Promise<void> {
    const oldMaxSize = this.config.maxSize;
    this.config.maxSize = maxSize;

    // If new max is smaller and we're over limit, evict
    if (maxSize < oldMaxSize && this.currentSize > maxSize) {
      await this.evictLRU(this.currentSize - maxSize);
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let attachmentCacheInstance: AttachmentCache | null = null;

/**
 * Get the default attachment cache instance
 */
export function getAttachmentCache(
  config?: Partial<AttachmentCacheConfig>,
): AttachmentCache {
  if (!attachmentCacheInstance) {
    attachmentCacheInstance = new AttachmentCache(config);
  }
  return attachmentCacheInstance;
}

/**
 * Reset attachment cache instance
 */
export function resetAttachmentCache(): void {
  attachmentCacheInstance = null;
}

export default AttachmentCache;
