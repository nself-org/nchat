/**
 * Attachment E2EE Service
 *
 * High-level service for end-to-end encrypted attachment handling.
 * Integrates attachment encryption, key management, metadata protection,
 * and streaming for a complete attachment E2EE solution.
 *
 * Features:
 * - Client-side encryption before upload
 * - Automatic key derivation from message keys
 * - Encrypted metadata (filename, type, size)
 * - Thumbnail encryption
 * - Streaming for large files
 * - Multi-device key distribution
 *
 * Security guarantees:
 * - Server only stores encrypted blobs
 * - Metadata is encrypted alongside content
 * - Keys derived from conversation keys
 * - Forward secrecy through key derivation
 */

import { logger } from "@/lib/logger";
import {
  encryptAttachment,
  decryptAttachment,
  encryptSmallAttachment,
  decryptSmallAttachment,
  generateAttachmentKey,
  validateAttachmentKey,
  wipeAttachmentKey,
  shouldUseChunkedEncryption,
  calculateEncryptedSize,
  validateEncryptedAttachment,
  extractHeader,
  type AttachmentKey,
  type EncryptedAttachment,
  type DecryptedAttachment,
  DEFAULT_CHUNK_SIZE,
} from "@/lib/e2ee/attachment-encryption";
import {
  AttachmentKeyManager,
  createAttachmentKeyManager,
  deriveAttachmentKey,
  encryptAttachmentKey,
  decryptAttachmentKey,
  createContextHash,
  type KeyDerivationContext,
  type EncryptedAttachmentKey,
  type AttachmentKeyManagerConfig,
} from "@/lib/e2ee/attachment-key-manager";
import {
  encryptMetadata,
  decryptMetadata,
  encryptThumbnail,
  decryptThumbnail,
  validateMetadata,
  sanitizeMetadata,
  createMinimalMetadata,
  createMetadataFromFile,
  type AttachmentMetadata,
  type EncryptedMetadata,
  type ThumbnailData,
} from "@/lib/e2ee/secure-metadata";
import {
  encryptFileStream,
  decryptBlobStream,
  createChunkedStream,
  collectStream,
  type StreamProgress,
  type StreamingEncryptionOptions,
  type StreamingDecryptionOptions,
  STREAMING_CHUNK_SIZE,
} from "@/lib/e2ee/streaming-crypto";
import { bytesToBase64, base64ToBytes, hash256 } from "@/lib/e2ee/crypto";

// ============================================================================
// Types
// ============================================================================

/**
 * Service configuration
 */
export interface AttachmentE2EEServiceConfig {
  /** User ID */
  userId: string;
  /** Device ID */
  deviceId: string;
  /** Optional storage for key caching */
  storage?: Storage;
  /** Maximum file size for in-memory encryption (default: 10MB) */
  maxInMemorySize?: number;
  /** Callback for upload progress */
  onUploadProgress?: (progress: UploadProgress) => void;
  /** Callback for download progress */
  onDownloadProgress?: (progress: DownloadProgress) => void;
}

/**
 * Upload progress information
 */
export interface UploadProgress {
  /** Attachment ID (local) */
  attachmentId: string;
  /** Encryption progress (0-100) */
  encryptionProgress: number;
  /** Upload progress (0-100) */
  uploadProgress: number;
  /** Overall progress (0-100) */
  overallProgress: number;
  /** Current phase */
  phase: "encrypting" | "uploading" | "complete" | "error";
  /** Bytes encrypted */
  bytesEncrypted: number;
  /** Bytes uploaded */
  bytesUploaded: number;
  /** Total bytes */
  totalBytes: number;
}

/**
 * Download progress information
 */
export interface DownloadProgress {
  /** Attachment ID */
  attachmentId: string;
  /** Download progress (0-100) */
  downloadProgress: number;
  /** Decryption progress (0-100) */
  decryptionProgress: number;
  /** Overall progress (0-100) */
  overallProgress: number;
  /** Current phase */
  phase: "downloading" | "decrypting" | "complete" | "error";
  /** Bytes downloaded */
  bytesDownloaded: number;
  /** Bytes decrypted */
  bytesDecrypted: number;
  /** Total bytes */
  totalBytes: number;
}

/**
 * Prepared attachment for upload
 */
export interface PreparedAttachment {
  /** Local attachment ID */
  localId: string;
  /** Encrypted attachment data */
  encryptedData: Uint8Array;
  /** Encrypted metadata */
  encryptedMetadata: EncryptedMetadata;
  /** Encrypted attachment key (for storage/sync) */
  encryptedKey: EncryptedAttachmentKey;
  /** Key derivation context */
  keyContext: KeyDerivationContext;
  /** Original file size */
  originalSize: number;
  /** Encrypted size */
  encryptedSize: number;
  /** Plaintext hash (for verification) */
  plaintextHash: string;
  /** Ciphertext hash (for integrity) */
  ciphertextHash: string;
  /** MIME type (for server-side routing) */
  contentType: string;
}

/**
 * Decrypted attachment result
 */
export interface DecryptedAttachmentResult {
  /** Decrypted file data */
  data: Uint8Array;
  /** Decrypted metadata */
  metadata: AttachmentMetadata;
  /** Verified */
  verified: boolean;
  /** Decryption timestamp */
  decryptedAt: number;
}

/**
 * Attachment reference (stored in messages)
 */
export interface AttachmentReference {
  /** Server attachment ID */
  attachmentId: string;
  /** Encrypted key data */
  encryptedKey: EncryptedAttachmentKey;
  /** Encrypted metadata */
  encryptedMetadata: EncryptedMetadata;
  /** File size (encrypted) */
  encryptedSize: number;
  /** Content type hint (for previews) */
  contentTypeHint: string;
  /** Upload timestamp */
  uploadedAt: number;
}

/**
 * Service status
 */
export interface AttachmentE2EEServiceStatus {
  /** Whether service is initialized */
  initialized: boolean;
  /** User ID */
  userId: string | null;
  /** Device ID */
  deviceId: string | null;
  /** Cached keys count */
  cachedKeys: number;
  /** Pending uploads */
  pendingUploads: number;
  /** Pending downloads */
  pendingDownloads: number;
}

// ============================================================================
// Attachment E2EE Service Class
// ============================================================================

/**
 * Main service for E2EE attachment handling
 */
export class AttachmentE2EEService {
  private config: AttachmentE2EEServiceConfig;
  private keyManager: AttachmentKeyManager | null = null;
  private initialized = false;
  private pendingUploads: Map<string, PreparedAttachment> = new Map();
  private pendingDownloads: Set<string> = new Set();
  private uploadIdCounter = 0;

  constructor(config: AttachmentE2EEServiceConfig) {
    this.config = {
      ...config,
      maxInMemorySize: config.maxInMemorySize ?? 10 * 1024 * 1024, // 10MB default
    };
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initializes the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn("AttachmentE2EEService already initialized");
      return;
    }

    try {
      // Initialize key manager
      this.keyManager = await createAttachmentKeyManager({
        userId: this.config.userId,
        deviceId: this.config.deviceId,
        storage: this.config.storage,
      });

      this.initialized = true;
      logger.info("AttachmentE2EEService initialized", {
        userId: this.config.userId,
        deviceId: this.config.deviceId,
      });
    } catch (error) {
      logger.error("Failed to initialize AttachmentE2EEService", { error });
      throw error;
    }
  }

  /**
   * Checks if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets service status
   */
  getStatus(): AttachmentE2EEServiceStatus {
    return {
      initialized: this.initialized,
      userId: this.config.userId,
      deviceId: this.config.deviceId,
      cachedKeys: this.keyManager?.getCacheStats().totalKeys ?? 0,
      pendingUploads: this.pendingUploads.size,
      pendingDownloads: this.pendingDownloads.size,
    };
  }

  // ==========================================================================
  // Attachment Preparation (Pre-Upload)
  // ==========================================================================

  /**
   * Prepares an attachment for encrypted upload
   *
   * @param file - The file to encrypt
   * @param messageKey - The message encryption key (from E2EE session)
   * @param context - Key derivation context
   * @param thumbnail - Optional thumbnail data
   * @returns Prepared attachment ready for upload
   */
  async prepareAttachment(
    file: File | Uint8Array,
    messageKey: Uint8Array,
    context: Omit<KeyDerivationContext, "attachmentIndex">,
    attachmentIndex: number = 0,
    thumbnail?: ThumbnailData,
  ): Promise<PreparedAttachment> {
    this.ensureInitialized();

    const localId = `upload_${++this.uploadIdCounter}_${Date.now()}`;

    try {
      // Get file data
      const fileData =
        file instanceof File ? new Uint8Array(await file.arrayBuffer()) : file;

      // Create metadata
      const metadata: AttachmentMetadata =
        file instanceof File
          ? { ...createMetadataFromFile(file), thumbnail }
          : {
              ...createMinimalMetadata(
                "attachment",
                "application/octet-stream",
                fileData.length,
              ),
              thumbnail,
            };

      // Full context with index
      const fullContext: KeyDerivationContext = {
        ...context,
        attachmentIndex,
      };

      // Derive attachment key from message key
      const { attachmentKey, contextHash } = deriveAttachmentKey(
        messageKey,
        fullContext,
      );

      // Store key in cache
      this.keyManager!.storeKey(attachmentKey, fullContext);

      // Encrypt the file
      let encryptedData: Uint8Array;
      let plaintextHash: string;
      let ciphertextHash: string;

      if (shouldUseChunkedEncryption(fileData.length)) {
        // Use chunked encryption for large files
        const result = await encryptAttachment(fileData, {
          chunkSize: DEFAULT_CHUNK_SIZE,
          onProgress: (progress) => {
            if (this.config.onUploadProgress) {
              this.config.onUploadProgress({
                attachmentId: localId,
                encryptionProgress: progress,
                uploadProgress: 0,
                overallProgress: progress * 0.5,
                phase: "encrypting",
                bytesEncrypted: Math.floor((progress / 100) * fileData.length),
                bytesUploaded: 0,
                totalBytes: fileData.length,
              });
            }
          },
        });

        encryptedData = result.encryptedData;
        plaintextHash = result.plaintextHash;
        ciphertextHash = result.ciphertextHash;
      } else {
        // Use simple encryption for small files
        const result = await encryptSmallAttachment(fileData, attachmentKey);
        encryptedData = result.encryptedData;
        plaintextHash = result.plaintextHash;
        ciphertextHash = bytesToBase64(hash256(encryptedData));
      }

      // Encrypt metadata
      const encryptedMetadata = await encryptMetadata(metadata, attachmentKey);

      // Encrypt key for storage (using message key as wrapping key)
      const encryptedKey = await encryptAttachmentKey(
        attachmentKey,
        messageKey,
        fullContext,
      );

      const prepared: PreparedAttachment = {
        localId,
        encryptedData,
        encryptedMetadata,
        encryptedKey,
        keyContext: fullContext,
        originalSize: fileData.length,
        encryptedSize: encryptedData.length,
        plaintextHash,
        ciphertextHash,
        contentType: metadata.mimeType,
      };

      // Store in pending
      this.pendingUploads.set(localId, prepared);

      // Report completion
      if (this.config.onUploadProgress) {
        this.config.onUploadProgress({
          attachmentId: localId,
          encryptionProgress: 100,
          uploadProgress: 0,
          overallProgress: 50,
          phase: "encrypting",
          bytesEncrypted: fileData.length,
          bytesUploaded: 0,
          totalBytes: fileData.length,
        });
      }

      logger.info("Attachment prepared for upload", {
        localId,
        originalSize: fileData.length,
        encryptedSize: encryptedData.length,
      });

      return prepared;
    } catch (error) {
      logger.error("Failed to prepare attachment", { localId, error });

      if (this.config.onUploadProgress) {
        this.config.onUploadProgress({
          attachmentId: localId,
          encryptionProgress: 0,
          uploadProgress: 0,
          overallProgress: 0,
          phase: "error",
          bytesEncrypted: 0,
          bytesUploaded: 0,
          totalBytes: 0,
        });
      }

      throw error;
    }
  }

  /**
   * Creates an attachment reference after successful upload
   */
  createAttachmentReference(
    prepared: PreparedAttachment,
    serverAttachmentId: string,
  ): AttachmentReference {
    // Remove from pending
    this.pendingUploads.delete(prepared.localId);

    return {
      attachmentId: serverAttachmentId,
      encryptedKey: prepared.encryptedKey,
      encryptedMetadata: prepared.encryptedMetadata,
      encryptedSize: prepared.encryptedSize,
      contentTypeHint: prepared.contentType,
      uploadedAt: Date.now(),
    };
  }

  // ==========================================================================
  // Attachment Decryption (Post-Download)
  // ==========================================================================

  /**
   * Decrypts a downloaded attachment
   *
   * @param encryptedData - The encrypted attachment data
   * @param reference - The attachment reference (from message)
   * @param messageKey - The message encryption key
   * @returns Decrypted attachment with metadata
   */
  async decryptAttachment(
    encryptedData: Uint8Array,
    reference: AttachmentReference,
    messageKey: Uint8Array,
  ): Promise<DecryptedAttachmentResult> {
    this.ensureInitialized();

    const attachmentId = reference.attachmentId;
    this.pendingDownloads.add(attachmentId);

    try {
      // Decrypt the attachment key
      const attachmentKey = await decryptAttachmentKey(
        reference.encryptedKey,
        messageKey,
      );

      // Validate the key
      if (!validateAttachmentKey(attachmentKey)) {
        throw new Error("Invalid decrypted attachment key");
      }

      // Validate encrypted data structure
      const validation = validateEncryptedAttachment(encryptedData);
      if (!validation.valid) {
        // Try simple decryption for small files
        logger.debug("Chunked validation failed, trying simple decryption", {
          error: validation.error,
        });
      }

      // Decrypt the file
      let decryptedData: Uint8Array;

      if (validation.valid && validation.header) {
        // Chunked decryption
        const result = await decryptAttachment(encryptedData, attachmentKey, {
          onProgress: (progress) => {
            if (this.config.onDownloadProgress) {
              this.config.onDownloadProgress({
                attachmentId,
                downloadProgress: 100,
                decryptionProgress: progress,
                overallProgress: 50 + progress * 0.5,
                phase: "decrypting",
                bytesDownloaded: encryptedData.length,
                bytesDecrypted: Math.floor(
                  (progress / 100) * (validation.header?.originalSize ?? 0),
                ),
                totalBytes: validation.header?.originalSize ?? 0,
              });
            }
          },
        });
        decryptedData = result.data;
      } else {
        // Simple decryption
        decryptedData = await decryptSmallAttachment(
          encryptedData,
          attachmentKey,
        );
      }

      // Decrypt metadata
      const metadata = await decryptMetadata(
        reference.encryptedMetadata,
        attachmentKey,
      );

      // Verify size matches
      if (decryptedData.length !== metadata.size) {
        logger.warn("Size mismatch after decryption", {
          expected: metadata.size,
          actual: decryptedData.length,
        });
      }

      // Clean up
      this.pendingDownloads.delete(attachmentId);
      wipeAttachmentKey(attachmentKey);

      // Report completion
      if (this.config.onDownloadProgress) {
        this.config.onDownloadProgress({
          attachmentId,
          downloadProgress: 100,
          decryptionProgress: 100,
          overallProgress: 100,
          phase: "complete",
          bytesDownloaded: encryptedData.length,
          bytesDecrypted: decryptedData.length,
          totalBytes: decryptedData.length,
        });
      }

      logger.info("Attachment decrypted successfully", {
        attachmentId,
        size: decryptedData.length,
        filename: metadata.filename,
      });

      return {
        data: decryptedData,
        metadata,
        verified: true,
        decryptedAt: Date.now(),
      };
    } catch (error) {
      this.pendingDownloads.delete(attachmentId);

      if (this.config.onDownloadProgress) {
        this.config.onDownloadProgress({
          attachmentId,
          downloadProgress: 100,
          decryptionProgress: 0,
          overallProgress: 0,
          phase: "error",
          bytesDownloaded: encryptedData.length,
          bytesDecrypted: 0,
          totalBytes: 0,
        });
      }

      logger.error("Failed to decrypt attachment", { attachmentId, error });
      throw error;
    }
  }

  // ==========================================================================
  // Streaming Operations (Large Files)
  // ==========================================================================

  /**
   * Encrypts a large file using streaming
   */
  async encryptLargeFile(
    file: File,
    messageKey: Uint8Array,
    context: Omit<KeyDerivationContext, "attachmentIndex">,
    attachmentIndex: number = 0,
    options: StreamingEncryptionOptions = {},
  ): Promise<{
    encryptedBlob: Blob;
    encryptedKey: EncryptedAttachmentKey;
    encryptedMetadata: EncryptedMetadata;
    plaintextHash: string;
  }> {
    this.ensureInitialized();

    const fullContext: KeyDerivationContext = {
      ...context,
      attachmentIndex,
    };

    // Derive key
    const { attachmentKey } = deriveAttachmentKey(messageKey, fullContext);

    // Create metadata
    const metadata = createMetadataFromFile(file);

    // Stream encrypt
    const { encryptedBlob, metadata: streamMeta } = await encryptFileStream(
      file,
      attachmentKey,
      {
        ...options,
        onProgress: (progress) => {
          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
      },
    );

    // Encrypt metadata
    const encryptedMetadata = await encryptMetadata(metadata, attachmentKey);

    // Encrypt key
    const encryptedKey = await encryptAttachmentKey(
      attachmentKey,
      messageKey,
      fullContext,
    );

    // Wipe key
    wipeAttachmentKey(attachmentKey);

    return {
      encryptedBlob,
      encryptedKey,
      encryptedMetadata,
      plaintextHash: streamMeta.plaintextHash,
    };
  }

  /**
   * Decrypts a large file using streaming
   */
  async decryptLargeFile(
    encryptedBlob: Blob,
    reference: AttachmentReference,
    messageKey: Uint8Array,
    options: StreamingDecryptionOptions = {},
  ): Promise<{
    decryptedBlob: Blob;
    metadata: AttachmentMetadata;
  }> {
    this.ensureInitialized();

    // Decrypt key
    const attachmentKey = await decryptAttachmentKey(
      reference.encryptedKey,
      messageKey,
    );

    // Get chunk size from header (or default)
    const headerBytes = new Uint8Array(
      await encryptedBlob.slice(0, 100).arrayBuffer(),
    );
    let chunkSize = DEFAULT_CHUNK_SIZE;

    try {
      const header = extractHeader(headerBytes);
      chunkSize = header.chunkSize;
    } catch {
      // Use default for simple encryption format
      chunkSize = STREAMING_CHUNK_SIZE;
    }

    // Stream decrypt
    const { decryptedBlob, metadata: streamMeta } = await decryptBlobStream(
      encryptedBlob,
      attachmentKey,
      chunkSize,
      {
        ...options,
        onProgress: (progress) => {
          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
      },
    );

    // Decrypt metadata
    const metadata = await decryptMetadata(
      reference.encryptedMetadata,
      attachmentKey,
    );

    // Wipe key
    wipeAttachmentKey(attachmentKey);

    return {
      decryptedBlob,
      metadata,
    };
  }

  // ==========================================================================
  // Thumbnail Operations
  // ==========================================================================

  /**
   * Encrypts a thumbnail for preview
   */
  async encryptThumbnail(
    thumbnail: ThumbnailData,
    attachmentKey: AttachmentKey,
  ): Promise<{
    encryptedData: string;
    iv: string;
    width: number;
    height: number;
  }> {
    const encrypted = await encryptThumbnail(thumbnail, attachmentKey.key);
    return {
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv,
      width: encrypted.width,
      height: encrypted.height,
    };
  }

  /**
   * Decrypts a thumbnail for display
   */
  async decryptThumbnail(
    encryptedThumbnail: {
      encryptedData: string;
      iv: string;
      width: number;
      height: number;
      thumbnailHash: string;
    },
    attachmentKey: AttachmentKey,
  ): Promise<ThumbnailData> {
    return decryptThumbnail(encryptedThumbnail, attachmentKey.key);
  }

  // ==========================================================================
  // Key Management
  // ==========================================================================

  /**
   * Gets or derives an attachment key for a context
   */
  getOrDeriveKey(
    messageKey: Uint8Array,
    context: KeyDerivationContext,
  ): AttachmentKey {
    this.ensureInitialized();

    // Try to get from cache first
    const cached = this.keyManager!.getKey(context);
    if (cached) {
      return cached;
    }

    // Derive new key
    return this.keyManager!.deriveKey(messageKey, context);
  }

  /**
   * Distributes an attachment key to another device
   */
  async distributeKeyToDevice(
    attachmentKey: AttachmentKey,
    context: KeyDerivationContext,
    deviceWrappingKey: Uint8Array,
  ): Promise<EncryptedAttachmentKey> {
    return encryptAttachmentKey(attachmentKey, deviceWrappingKey, context);
  }

  /**
   * Receives a distributed key from another device
   */
  async receiveDistributedKey(
    encryptedKey: EncryptedAttachmentKey,
    context: KeyDerivationContext,
    deviceWrappingKey: Uint8Array,
  ): Promise<AttachmentKey> {
    const key = await decryptAttachmentKey(encryptedKey, deviceWrappingKey);

    // Cache the key
    this.keyManager!.storeKey(key, context);

    return key;
  }

  /**
   * Clears cached keys for a conversation
   */
  clearKeysForConversation(conversationId: string): void {
    this.ensureInitialized();
    const removed = this.keyManager!.removeKeysForConversation(conversationId);
    logger.debug("Cleared keys for conversation", { conversationId, removed });
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Clears pending operations
   */
  clearPending(): void {
    this.pendingUploads.clear();
    this.pendingDownloads.clear();
  }

  /**
   * Performs maintenance tasks
   */
  async performMaintenance(): Promise<void> {
    this.ensureInitialized();

    // Clean up expired keys
    const expired = this.keyManager!.cleanupExpiredKeys();
    if (expired > 0) {
      logger.info("Cleaned up expired attachment keys", { count: expired });
    }

    // Save to storage
    await this.keyManager!.saveToStorage();
  }

  /**
   * Destroys the service and wipes all key material
   */
  destroy(): void {
    this.clearPending();

    if (this.keyManager) {
      this.keyManager.destroy();
      this.keyManager = null;
    }

    this.initialized = false;
    logger.info("AttachmentE2EEService destroyed");
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private ensureInitialized(): void {
    if (!this.initialized || !this.keyManager) {
      throw new Error(
        "AttachmentE2EEService not initialized. Call initialize() first.",
      );
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates and initializes an attachment E2EE service
 */
export async function createAttachmentE2EEService(
  config: AttachmentE2EEServiceConfig,
): Promise<AttachmentE2EEService> {
  const service = new AttachmentE2EEService(config);
  await service.initialize();
  return service;
}

// ============================================================================
// Singleton Management
// ============================================================================

let attachmentE2EEServiceInstance: AttachmentE2EEService | null = null;

/**
 * Gets or creates the attachment E2EE service singleton
 */
export async function getAttachmentE2EEService(
  config?: AttachmentE2EEServiceConfig,
): Promise<AttachmentE2EEService> {
  if (!attachmentE2EEServiceInstance && config) {
    attachmentE2EEServiceInstance = await createAttachmentE2EEService(config);
  }

  if (!attachmentE2EEServiceInstance) {
    throw new Error(
      "AttachmentE2EEService not configured. Provide config on first call.",
    );
  }

  return attachmentE2EEServiceInstance;
}

/**
 * Resets the attachment E2EE service singleton
 */
export function resetAttachmentE2EEService(): void {
  if (attachmentE2EEServiceInstance) {
    attachmentE2EEServiceInstance.destroy();
    attachmentE2EEServiceInstance = null;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default AttachmentE2EEService;
