/**
 * Recording Pipeline Service
 *
 * Comprehensive service for managing call recordings:
 * - Recording capture and storage
 * - Encryption at rest
 * - Multi-track recording
 * - Synchronized timestamps
 * - Processing queue management
 *
 * @module services/recordings/recording-pipeline.service
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";
import { logger } from "@/lib/logger";
import { getStorageConfig } from "@/services/files/config";
import type {
  Recording,
  RecordingStatus,
  RecordingFormat,
  RecordingQuality,
  RecordingLayout,
  RecordingSource,
  RecordingTrack,
  RecordingVariant,
  RecordingThumbnail,
  RecordingMetadata,
  ParticipantInfo,
  EncryptionConfig,
  EncryptedFile,
  StartRecordingRequest,
  StartRecordingResponse,
  StopRecordingResponse,
  ProcessingJob,
  ProcessingJobType,
  ProcessingJobStatus,
  RecordingEvent,
  RecordingEventType,
} from "./types";
import {
  RecordingError,
  RecordingNotFoundError,
  StorageQuotaExceededError,
} from "./types";

// ============================================================================
// Types
// ============================================================================

interface RecordingStore {
  recordings: Map<string, Recording>;
  processingJobs: Map<string, ProcessingJob>;
  events: RecordingEvent[];
  encryptedFiles: Map<string, EncryptedFile>;
}

interface RecordingConfig {
  storageBucket: string;
  storagePrefix: string;
  encryptionEnabled: boolean;
  encryptionAlgorithm: "aes-256-gcm" | "aes-256-cbc";
  thumbnailIntervals: number[];
  defaultQuality: RecordingQuality;
  defaultFormat: RecordingFormat;
  maxFileSizeBytes: number;
  enableMultiTrack: boolean;
}

// ============================================================================
// Recording Pipeline Service
// ============================================================================

export class RecordingPipelineService {
  private store: RecordingStore;
  private s3Client: S3Client;
  private config: RecordingConfig;
  private encryptionKey: Buffer;

  constructor(customConfig?: Partial<RecordingConfig>) {
    this.store = {
      recordings: new Map(),
      processingJobs: new Map(),
      events: [],
      encryptedFiles: new Map(),
    };

    const storageConfig = getStorageConfig();
    this.s3Client = new S3Client({
      endpoint: storageConfig.endpoint,
      region: storageConfig.region || "us-east-1",
      credentials: {
        accessKeyId: storageConfig.accessKey || "",
        secretAccessKey: storageConfig.secretKey || "",
      },
      forcePathStyle: storageConfig.provider === "minio",
    });

    this.config = {
      storageBucket: storageConfig.bucket || "recordings",
      storagePrefix: "recordings",
      encryptionEnabled: customConfig?.encryptionEnabled ?? true,
      encryptionAlgorithm: customConfig?.encryptionAlgorithm ?? "aes-256-gcm",
      thumbnailIntervals: customConfig?.thumbnailIntervals ?? [
        0, 30, 60, 120, 300,
      ],
      defaultQuality: customConfig?.defaultQuality ?? "1080p",
      defaultFormat: customConfig?.defaultFormat ?? "mp4",
      maxFileSizeBytes:
        customConfig?.maxFileSizeBytes ?? 10 * 1024 * 1024 * 1024, // 10GB
      enableMultiTrack: customConfig?.enableMultiTrack ?? true,
    };

    // Initialize encryption key from environment or generate
    const envKey = process.env.RECORDING_ENCRYPTION_KEY;
    if (envKey) {
      this.encryptionKey = Buffer.from(envKey, "base64");
    } else {
      this.encryptionKey = randomBytes(32);
      logger.warn(
        "Using generated encryption key - recordings will not be recoverable after restart",
      );
    }
  }

  // ==========================================================================
  // Recording Lifecycle
  // ==========================================================================

  /**
   * Start a new recording
   */
  async startRecording(
    request: StartRecordingRequest,
    userId: string,
  ): Promise<StartRecordingResponse> {
    const recordingId = crypto.randomUUID();

    // Check for existing active recording for this call/stream
    const existingRecording = await this.getActiveRecordingForSource(
      request.callId || request.streamId || "",
      request.source,
    );

    if (existingRecording) {
      throw new RecordingError(
        "Recording already in progress for this source",
        "RECORDING_ALREADY_EXISTS",
        409,
      );
    }

    const recording: Recording = {
      id: recordingId,
      callId: request.callId,
      streamId: request.streamId,
      channelId: request.channelId,
      workspaceId: await this.getWorkspaceId(request.channelId),
      recordedBy: userId,
      status: "starting",
      format: request.format || this.config.defaultFormat,
      quality: request.quality || this.config.defaultQuality,
      layout: request.layout || "grid",
      source: request.source,
      startedAt: new Date().toISOString(),
      tracks: [],
      variants: [],
      thumbnails: [],
      hasTranscript: false,
      isEncrypted: request.encrypt ?? this.config.encryptionEnabled,
      legalHold: false,
      redactions: [],
      hasRedactions: false,
      visibility: "participants",
      allowedUserIds: [],
      shareLinks: [],
      metadata: {
        participants: [],
        totalParticipants: 0,
        peakParticipants: 0,
        averageDuration: 0,
        screenShares: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
    };

    // Add current user as first participant
    recording.metadata.participants.push({
      userId,
      displayName: await this.getUserDisplayName(userId),
      joinedAt: new Date().toISOString(),
      durationSeconds: 0,
      hasAudio: true,
      hasVideo: request.source !== "voice_chat",
      wasScreenSharing: false,
    });
    recording.metadata.totalParticipants = 1;
    recording.metadata.peakParticipants = 1;

    this.store.recordings.set(recordingId, recording);

    // Emit start event
    await this.emitEvent("recording.started", recording, userId);

    // Transition to recording status
    recording.status = "recording";
    recording.updatedAt = new Date().toISOString();
    this.store.recordings.set(recordingId, recording);

    logger.info("Recording started", {
      recordingId,
      source: request.source,
      format: recording.format,
      quality: recording.quality,
    });

    return {
      success: true,
      recording,
      message: "Recording started successfully",
    };
  }

  /**
   * Add a track to an active recording
   */
  async addTrack(
    recordingId: string,
    track: Omit<RecordingTrack, "id">,
    userId: string,
  ): Promise<RecordingTrack> {
    const recording = await this.getRecording(recordingId);

    if (recording.status !== "recording") {
      throw new RecordingError(
        "Recording is not active",
        "RECORDING_NOT_ACTIVE",
        400,
      );
    }

    const newTrack: RecordingTrack = {
      id: crypto.randomUUID(),
      ...track,
    };

    recording.tracks.push(newTrack);
    recording.updatedAt = new Date().toISOString();
    this.store.recordings.set(recordingId, recording);

    logger.info("Track added to recording", {
      recordingId,
      trackId: newTrack.id,
      type: newTrack.type,
      participantId: newTrack.participantId,
    });

    return newTrack;
  }

  /**
   * Add participant to recording metadata
   */
  async addParticipant(
    recordingId: string,
    participant: ParticipantInfo,
  ): Promise<void> {
    const recording = await this.getRecording(recordingId);

    // Check if participant already exists
    const existingIndex = recording.metadata.participants.findIndex(
      (p) => p.userId === participant.userId,
    );

    if (existingIndex >= 0) {
      // Update existing participant
      recording.metadata.participants[existingIndex] = {
        ...recording.metadata.participants[existingIndex],
        ...participant,
      };
    } else {
      recording.metadata.participants.push(participant);
      recording.metadata.totalParticipants++;
    }

    // Update peak participants
    const activeParticipants = recording.metadata.participants.filter(
      (p) => !p.leftAt,
    ).length;
    if (activeParticipants > recording.metadata.peakParticipants) {
      recording.metadata.peakParticipants = activeParticipants;
    }

    recording.updatedAt = new Date().toISOString();
    this.store.recordings.set(recordingId, recording);
  }

  /**
   * Stop an active recording
   */
  async stopRecording(
    recordingId: string,
    userId: string,
  ): Promise<StopRecordingResponse> {
    const recording = await this.getRecording(recordingId);

    if (recording.status !== "recording") {
      throw new RecordingError(
        "Recording is not active",
        "RECORDING_NOT_ACTIVE",
        400,
      );
    }

    // Update status to stopping
    recording.status = "stopping";
    recording.updatedAt = new Date().toISOString();
    this.store.recordings.set(recordingId, recording);

    // Calculate duration
    const startTime = new Date(recording.startedAt).getTime();
    const endTime = Date.now();
    recording.durationSeconds = Math.floor((endTime - startTime) / 1000);
    recording.endedAt = new Date().toISOString();

    // Update participant durations
    for (const participant of recording.metadata.participants) {
      if (!participant.leftAt) {
        participant.leftAt = recording.endedAt;
        const joinTime = new Date(participant.joinedAt).getTime();
        participant.durationSeconds = Math.floor((endTime - joinTime) / 1000);
      }
    }

    // Calculate average duration
    const totalDuration = recording.metadata.participants.reduce(
      (sum, p) => sum + p.durationSeconds,
      0,
    );
    recording.metadata.averageDuration = Math.floor(
      totalDuration / recording.metadata.participants.length,
    );

    // Transition to processing
    recording.status = "processing";
    recording.updatedAt = new Date().toISOString();
    this.store.recordings.set(recordingId, recording);

    // Emit stop event
    await this.emitEvent("recording.stopped", recording, userId);

    // Queue processing jobs
    await this.queueProcessingJobs(recordingId);

    logger.info("Recording stopped", {
      recordingId,
      durationSeconds: recording.durationSeconds,
      participantCount: recording.metadata.totalParticipants,
    });

    return {
      success: true,
      recording,
      message: "Recording stopped and processing queued",
      estimatedProcessingTime: this.estimateProcessingTime(recording),
    };
  }

  /**
   * Get recording by ID
   */
  async getRecording(recordingId: string): Promise<Recording> {
    const recording = this.store.recordings.get(recordingId);

    if (!recording) {
      throw new RecordingNotFoundError(recordingId);
    }

    return recording;
  }

  /**
   * Get recording if exists
   */
  async getRecordingIfExists(recordingId: string): Promise<Recording | null> {
    return this.store.recordings.get(recordingId) || null;
  }

  /**
   * Get active recording for a source
   */
  async getActiveRecordingForSource(
    sourceId: string,
    source: RecordingSource,
  ): Promise<Recording | null> {
    for (const recording of this.store.recordings.values()) {
      if (
        recording.status === "recording" &&
        recording.source === source &&
        (recording.callId === sourceId || recording.streamId === sourceId)
      ) {
        return recording;
      }
    }
    return null;
  }

  /**
   * List recordings with filters
   */
  async listRecordings(options: {
    workspaceId?: string;
    channelId?: string;
    callId?: string;
    status?: RecordingStatus[];
    source?: RecordingSource[];
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    sortBy?: "createdAt" | "duration" | "fileSize";
    sortOrder?: "asc" | "desc";
  }): Promise<{ recordings: Recording[]; total: number }> {
    let recordings = Array.from(this.store.recordings.values());

    // Apply filters
    if (options.workspaceId) {
      recordings = recordings.filter(
        (r) => r.workspaceId === options.workspaceId,
      );
    }
    if (options.channelId) {
      recordings = recordings.filter((r) => r.channelId === options.channelId);
    }
    if (options.callId) {
      recordings = recordings.filter((r) => r.callId === options.callId);
    }
    if (options.status?.length) {
      recordings = recordings.filter((r) => options.status!.includes(r.status));
    }
    if (options.source?.length) {
      recordings = recordings.filter((r) => options.source!.includes(r.source));
    }
    if (options.startDate) {
      const startDate = new Date(options.startDate).getTime();
      recordings = recordings.filter(
        (r) => new Date(r.createdAt).getTime() >= startDate,
      );
    }
    if (options.endDate) {
      const endDate = new Date(options.endDate).getTime();
      recordings = recordings.filter(
        (r) => new Date(r.createdAt).getTime() <= endDate,
      );
    }

    // Sort
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder || "desc";
    recordings.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case "duration":
          aValue = a.durationSeconds || 0;
          bValue = b.durationSeconds || 0;
          break;
        case "fileSize":
          aValue = a.fileSize || 0;
          bValue = b.fileSize || 0;
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    const total = recordings.length;

    // Paginate
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    recordings = recordings.slice(offset, offset + limit);

    return { recordings, total };
  }

  // ==========================================================================
  // Storage Operations
  // ==========================================================================

  /**
   * Upload recording file to storage
   */
  async uploadRecordingFile(
    recordingId: string,
    fileBuffer: Buffer,
    options: {
      format: RecordingFormat;
      isVariant?: boolean;
      quality?: RecordingQuality;
    },
  ): Promise<string> {
    const recording = await this.getRecording(recordingId);

    // Check storage quota
    const quota = await this.getStorageQuota(recording.workspaceId);
    if (quota.usedBytes + fileBuffer.length > quota.totalBytes) {
      throw new StorageQuotaExceededError(
        recording.workspaceId,
        quota.usedBytes,
        quota.totalBytes,
      );
    }

    // Generate file path
    const timestamp = Date.now();
    const extension = this.getFileExtension(options.format);
    const fileName = options.isVariant
      ? `${recordingId}_${options.quality}.${extension}`
      : `${recordingId}.${extension}`;
    const filePath = `${this.config.storagePrefix}/${recording.workspaceId}/${recording.channelId}/${fileName}`;

    // Calculate checksum
    const checksum = createHash("sha256").update(fileBuffer).digest("hex");

    // Encrypt if enabled
    let uploadBuffer = fileBuffer;
    if (recording.isEncrypted) {
      const encrypted = await this.encryptFile(fileBuffer, recordingId);
      uploadBuffer = encrypted.buffer;
      this.store.encryptedFiles.set(recordingId, encrypted.metadata);
    }

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: this.config.storageBucket,
      Key: filePath,
      Body: uploadBuffer,
      ContentType: this.getMimeType(options.format),
      Metadata: {
        recordingId,
        checksum,
        encrypted: String(recording.isEncrypted),
        quality: options.quality || recording.quality,
      },
    });

    await this.s3Client.send(command);

    // Update recording
    if (options.isVariant) {
      const variant: RecordingVariant = {
        id: crypto.randomUUID(),
        quality: options.quality!,
        format: options.format,
        filePath,
        fileSize: uploadBuffer.length,
        bitrate: this.getDefaultBitrate(options.quality!),
        createdAt: new Date().toISOString(),
      };
      recording.variants.push(variant);
    } else {
      recording.filePath = filePath;
      recording.fileSize = uploadBuffer.length;
      recording.checksum = checksum;
      recording.mimeType = this.getMimeType(options.format);
    }

    recording.updatedAt = new Date().toISOString();
    this.store.recordings.set(recordingId, recording);

    logger.info("Recording file uploaded", {
      recordingId,
      filePath,
      size: uploadBuffer.length,
      encrypted: recording.isEncrypted,
    });

    return filePath;
  }

  /**
   * Get signed download URL for a recording
   */
  async getDownloadUrl(
    recordingId: string,
    options: {
      expirySeconds?: number;
      quality?: RecordingQuality;
    } = {},
  ): Promise<string> {
    const recording = await this.getRecording(recordingId);

    let filePath = recording.filePath;

    // Get variant if requested
    if (options.quality) {
      const variant = recording.variants.find(
        (v) => v.quality === options.quality,
      );
      if (variant) {
        filePath = variant.filePath;
      }
    }

    if (!filePath) {
      throw new RecordingError(
        "Recording file not available",
        "FILE_NOT_AVAILABLE",
        404,
      );
    }

    const command = new GetObjectCommand({
      Bucket: this.config.storageBucket,
      Key: filePath,
      ResponseContentDisposition: `attachment; filename="${recordingId}.${this.getFileExtension(recording.format)}"`,
    });

    const expirySeconds = options.expirySeconds || 3600;
    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: expirySeconds,
    });

    return url;
  }

  /**
   * Delete recording file from storage
   */
  async deleteRecordingFile(recordingId: string): Promise<void> {
    const recording = await this.getRecording(recordingId);

    // Delete main file
    if (recording.filePath) {
      await this.deleteFile(recording.filePath);
    }

    // Delete variants
    for (const variant of recording.variants) {
      await this.deleteFile(variant.filePath);
    }

    // Delete thumbnails
    for (const thumbnail of recording.thumbnails) {
      await this.deleteFile(thumbnail.filePath);
    }

    // Update status
    recording.status = "deleted";
    recording.updatedAt = new Date().toISOString();
    this.store.recordings.set(recordingId, recording);

    // Emit event
    await this.emitEvent("recording.deleted", recording);

    logger.info("Recording files deleted", { recordingId });
  }

  private async deleteFile(filePath: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.storageBucket,
        Key: filePath,
      });
      await this.s3Client.send(command);
    } catch (error) {
      logger.warn("Failed to delete file", { filePath, error: String(error) });
    }
  }

  // ==========================================================================
  // Encryption
  // ==========================================================================

  /**
   * Encrypt file buffer
   */
  async encryptFile(
    buffer: Buffer,
    recordingId: string,
  ): Promise<{ buffer: Buffer; metadata: EncryptedFile }> {
    const iv = randomBytes(16);
    const cipher = createCipheriv(
      this.config.encryptionAlgorithm,
      this.encryptionKey,
      iv,
    );

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    const metadata: EncryptedFile = {
      recordingId,
      keyId: "master-key",
      algorithm: this.config.encryptionAlgorithm,
      iv: iv.toString("base64"),
      authTag:
        this.config.encryptionAlgorithm === "aes-256-gcm"
          ? (cipher as any).getAuthTag().toString("base64")
          : undefined,
      encryptedFilePath: "",
      originalChecksum: createHash("sha256").update(buffer).digest("hex"),
      encryptedChecksum: createHash("sha256").update(encrypted).digest("hex"),
    };

    return { buffer: encrypted, metadata };
  }

  /**
   * Decrypt file buffer
   */
  async decryptFile(
    encryptedBuffer: Buffer,
    recordingId: string,
  ): Promise<Buffer> {
    const metadata = this.store.encryptedFiles.get(recordingId);

    if (!metadata) {
      throw new RecordingError(
        "Encryption metadata not found",
        "ENCRYPTION_ERROR",
        500,
      );
    }

    const iv = Buffer.from(metadata.iv, "base64");
    const decipher = createDecipheriv(
      metadata.algorithm as any,
      this.encryptionKey,
      iv,
    );

    if (metadata.authTag && metadata.algorithm === "aes-256-gcm") {
      (decipher as any).setAuthTag(Buffer.from(metadata.authTag, "base64"));
    }

    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);

    // Verify checksum
    const checksum = createHash("sha256").update(decrypted).digest("hex");
    if (checksum !== metadata.originalChecksum) {
      throw new RecordingError(
        "Decryption checksum mismatch",
        "DECRYPTION_ERROR",
        500,
      );
    }

    return decrypted;
  }

  // ==========================================================================
  // Processing Queue
  // ==========================================================================

  /**
   * Queue processing jobs for a recording
   */
  private async queueProcessingJobs(recordingId: string): Promise<void> {
    const recording = await this.getRecording(recordingId);

    // Transcode to multiple qualities
    const qualities: RecordingQuality[] = ["720p", "480p", "360p"];
    for (const quality of qualities) {
      if (quality !== recording.quality) {
        await this.createProcessingJob(recordingId, "transcode", {
          targetQuality: quality,
          targetFormat: recording.format,
          preserveAspectRatio: true,
        });
      }
    }

    // Generate thumbnails
    await this.createProcessingJob(recordingId, "thumbnail", {
      intervals: this.config.thumbnailIntervals,
      width: 640,
      height: 360,
      format: "jpeg",
      quality: 80,
    });

    // Extract audio track
    if (recording.format !== "audio_only") {
      await this.createProcessingJob(recordingId, "extract_audio", {
        targetQuality: recording.quality,
        targetFormat: "audio_only",
        preserveAspectRatio: true,
      });
    }
  }

  /**
   * Create a processing job
   */
  async createProcessingJob(
    recordingId: string,
    type: ProcessingJobType,
    options: Record<string, unknown>,
    priority: number = 5,
  ): Promise<ProcessingJob> {
    const recording = await this.getRecording(recordingId);

    const job: ProcessingJob = {
      id: crypto.randomUUID(),
      recordingId,
      type,
      status: "queued",
      priority,
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      input: {
        sourceFilePath: recording.filePath || "",
        sourceFormat: recording.format,
        options: options as any,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.store.processingJobs.set(job.id, job);

    // Emit event
    await this.emitEvent("processing.started", recording, undefined, {
      jobId: job.id,
      type,
    });

    logger.info("Processing job created", {
      jobId: job.id,
      recordingId,
      type,
      priority,
    });

    return job;
  }

  /**
   * Get processing job status
   */
  async getProcessingJob(jobId: string): Promise<ProcessingJob | null> {
    return this.store.processingJobs.get(jobId) || null;
  }

  /**
   * Get all processing jobs for a recording
   */
  async getProcessingJobs(recordingId: string): Promise<ProcessingJob[]> {
    const jobs: ProcessingJob[] = [];
    for (const job of this.store.processingJobs.values()) {
      if (job.recordingId === recordingId) {
        jobs.push(job);
      }
    }
    return jobs.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Update processing job status
   */
  async updateProcessingJob(
    jobId: string,
    updates: Partial<
      Pick<ProcessingJob, "status" | "progress" | "error" | "output">
    >,
  ): Promise<ProcessingJob> {
    const job = this.store.processingJobs.get(jobId);

    if (!job) {
      throw new RecordingError(
        "Processing job not found",
        "JOB_NOT_FOUND",
        404,
      );
    }

    Object.assign(job, updates, { updatedAt: new Date().toISOString() });

    if (updates.status === "processing" && !job.startedAt) {
      job.startedAt = new Date().toISOString();
    }

    if (updates.status === "completed" || updates.status === "failed") {
      job.completedAt = new Date().toISOString();
      if (job.startedAt) {
        job.actualDuration =
          new Date(job.completedAt).getTime() -
          new Date(job.startedAt).getTime();
      }

      // Emit event
      const recording = await this.getRecording(job.recordingId);
      await this.emitEvent(
        updates.status === "completed"
          ? "processing.completed"
          : "processing.failed",
        recording,
        undefined,
        { jobId, type: job.type },
      );

      // Check if all jobs completed
      await this.checkAllJobsCompleted(job.recordingId);
    }

    this.store.processingJobs.set(jobId, job);

    return job;
  }

  /**
   * Check if all processing jobs are completed
   */
  private async checkAllJobsCompleted(recordingId: string): Promise<void> {
    const jobs = await this.getProcessingJobs(recordingId);
    const allCompleted = jobs.every(
      (j) => j.status === "completed" || j.status === "failed",
    );

    if (allCompleted) {
      const recording = await this.getRecording(recordingId);
      const anyFailed = jobs.some((j) => j.status === "failed");

      recording.status = anyFailed ? "failed" : "completed";
      recording.processedAt = new Date().toISOString();
      recording.updatedAt = new Date().toISOString();
      this.store.recordings.set(recordingId, recording);

      await this.emitEvent(
        anyFailed ? "recording.failed" : "recording.completed",
        recording,
      );

      logger.info("Recording processing completed", {
        recordingId,
        status: recording.status,
        jobCount: jobs.length,
        failedCount: jobs.filter((j) => j.status === "failed").length,
      });
    }
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  /**
   * Emit a recording event
   */
  async emitEvent(
    type: RecordingEventType,
    recording: Recording,
    userId?: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const event: RecordingEvent = {
      id: crypto.randomUUID(),
      type,
      recordingId: recording.id,
      workspaceId: recording.workspaceId,
      userId,
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        status: recording.status,
        format: recording.format,
        quality: recording.quality,
      },
    };

    this.store.events.push(event);

    logger.debug("Recording event emitted", {
      type,
      recordingId: recording.id,
    });
  }

  /**
   * Get events for a recording
   */
  async getEvents(
    recordingId: string,
    limit: number = 100,
  ): Promise<RecordingEvent[]> {
    return this.store.events
      .filter((e) => e.recordingId === recordingId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async getWorkspaceId(channelId: string): Promise<string> {
    // In production, this would query the database
    return "workspace-default";
  }

  private async getUserDisplayName(userId: string): Promise<string> {
    // In production, this would query the database
    return `User ${userId.slice(0, 8)}`;
  }

  private async getStorageQuota(
    workspaceId: string,
  ): Promise<{ usedBytes: number; totalBytes: number }> {
    // In production, this would calculate from database
    let usedBytes = 0;
    for (const recording of this.store.recordings.values()) {
      if (recording.workspaceId === workspaceId && recording.fileSize) {
        usedBytes += recording.fileSize;
      }
    }
    return {
      usedBytes,
      totalBytes: 100 * 1024 * 1024 * 1024, // 100GB default
    };
  }

  private getFileExtension(format: RecordingFormat): string {
    switch (format) {
      case "mp4":
        return "mp4";
      case "webm":
        return "webm";
      case "mkv":
        return "mkv";
      case "hls":
        return "m3u8";
      case "audio_only":
        return "mp3";
      default:
        return "mp4";
    }
  }

  private getMimeType(format: RecordingFormat): string {
    switch (format) {
      case "mp4":
        return "video/mp4";
      case "webm":
        return "video/webm";
      case "mkv":
        return "video/x-matroska";
      case "hls":
        return "application/x-mpegURL";
      case "audio_only":
        return "audio/mpeg";
      default:
        return "video/mp4";
    }
  }

  private getDefaultBitrate(quality: RecordingQuality): number {
    switch (quality) {
      case "4k":
        return 15000000;
      case "1080p":
        return 6000000;
      case "720p":
        return 3000000;
      case "480p":
        return 1500000;
      case "360p":
        return 800000;
      default:
        return 3000000;
    }
  }

  private estimateProcessingTime(recording: Recording): number {
    const duration = recording.durationSeconds || 0;
    // Rough estimate: 1.5x duration for transcoding
    return Math.ceil(duration * 1.5);
  }

  // ==========================================================================
  // Utility Methods for Testing
  // ==========================================================================

  /**
   * Clear all recordings (for testing)
   */
  clearAll(): void {
    this.store.recordings.clear();
    this.store.processingJobs.clear();
    this.store.events = [];
    this.store.encryptedFiles.clear();
  }

  /**
   * Get all recordings (for testing)
   */
  getAllRecordings(): Recording[] {
    return Array.from(this.store.recordings.values());
  }

  /**
   * Get all events (for testing)
   */
  getAllEvents(): RecordingEvent[] {
    return this.store.events;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let pipelineInstance: RecordingPipelineService | null = null;

/**
 * Get singleton recording pipeline instance
 */
export function getRecordingPipeline(
  config?: Partial<RecordingConfig>,
): RecordingPipelineService {
  if (!pipelineInstance) {
    pipelineInstance = new RecordingPipelineService(config);
  }
  return pipelineInstance;
}

/**
 * Create new recording pipeline instance
 */
export function createRecordingPipeline(
  config?: Partial<RecordingConfig>,
): RecordingPipelineService {
  return new RecordingPipelineService(config);
}
