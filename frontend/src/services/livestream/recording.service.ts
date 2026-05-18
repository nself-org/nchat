/**
 * Livestream Recording Service
 *
 * Handles stream recording, VOD processing, trimming, and clip creation.
 *
 * @module services/livestream/recording.service
 */

import { logger } from "@/lib/logger";
import type {
  Stream,
  StreamRecording,
  RecordingQuality,
  RecordingTrim,
  ClipConfig,
  StreamQuality,
} from "./types";
import { StreamNotFoundError, StreamUnauthorizedError } from "./types";

// ============================================================================
// Types
// ============================================================================

export type RecordingStatus = "recording" | "processing" | "ready" | "failed";
export type RecordingFormat = "mp4" | "webm" | "hls";

interface RecordingStore {
  recordings: Map<string, StreamRecording>;
  clips: Map<string, StreamRecording>;
  activeRecordings: Set<string>;
}

interface ProcessingJob {
  id: string;
  recordingId: string;
  type: "transcode" | "trim" | "clip";
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================================================
// Livestream Recording Service
// ============================================================================

export class LivestreamRecordingService {
  private store: RecordingStore;
  private jobs: Map<string, ProcessingJob>;
  private storageBaseUrl: string;

  constructor(storageBaseUrl?: string) {
    this.store = {
      recordings: new Map(),
      clips: new Map(),
      activeRecordings: new Set(),
    };
    this.jobs = new Map();
    this.storageBaseUrl =
      storageBaseUrl ?? process.env.NEXT_PUBLIC_STORAGE_URL ?? "/storage";
  }

  // ==========================================================================
  // Recording Lifecycle
  // ==========================================================================

  /**
   * Start recording a stream
   */
  async startRecording(
    streamId: string,
    userId: string,
  ): Promise<StreamRecording> {
    if (this.store.activeRecordings.has(streamId)) {
      throw new Error("Recording already in progress for this stream");
    }

    const recording: StreamRecording = {
      id: crypto.randomUUID(),
      streamId,
      status: "recording",
      format: "mp4",
      qualities: [],
      createdAt: new Date().toISOString(),
    };

    this.store.recordings.set(recording.id, recording);
    this.store.activeRecordings.add(streamId);

    logger.info("Recording started", { streamId, recordingId: recording.id });

    return recording;
  }

  /**
   * Stop recording a stream
   */
  async stopRecording(
    streamId: string,
    userId: string,
  ): Promise<StreamRecording> {
    const recording = await this.getActiveRecording(streamId);

    if (!recording) {
      throw new Error("No active recording for this stream");
    }

    this.store.activeRecordings.delete(streamId);

    // Update recording status to processing
    const updatedRecording: StreamRecording = {
      ...recording,
      status: "processing",
    };

    this.store.recordings.set(recording.id, updatedRecording);

    // Start processing job
    await this.startProcessingJob(recording.id, "transcode");

    logger.info("Recording stopped, processing started", {
      streamId,
      recordingId: recording.id,
    });

    return updatedRecording;
  }

  /**
   * Get active recording for stream
   */
  async getActiveRecording(streamId: string): Promise<StreamRecording | null> {
    for (const recording of this.store.recordings.values()) {
      if (recording.streamId === streamId && recording.status === "recording") {
        return recording;
      }
    }
    return null;
  }

  /**
   * Get recording by ID
   */
  async getRecording(recordingId: string): Promise<StreamRecording> {
    const recording = this.store.recordings.get(recordingId);
    if (!recording) {
      throw new Error(`Recording not found: ${recordingId}`);
    }
    return recording;
  }

  /**
   * Get all recordings for a stream
   */
  async getStreamRecordings(streamId: string): Promise<StreamRecording[]> {
    const recordings: StreamRecording[] = [];

    for (const recording of this.store.recordings.values()) {
      if (recording.streamId === streamId) {
        recordings.push(recording);
      }
    }

    return recordings.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  // ==========================================================================
  // Recording Processing
  // ==========================================================================

  /**
   * Process recording (transcode to multiple qualities)
   */
  private async startProcessingJob(
    recordingId: string,
    type: "transcode" | "trim" | "clip",
  ): Promise<ProcessingJob> {
    const job: ProcessingJob = {
      id: crypto.randomUUID(),
      recordingId,
      type,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(job.id, job);

    // Simulate async processing
    this.simulateProcessing(job.id);

    return job;
  }

  /**
   * Simulate processing (in production, this would be a job queue)
   */
  private async simulateProcessing(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Update to processing
    job.status = "processing";
    this.jobs.set(jobId, job);

    // Simulate progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      job.progress = i;
      this.jobs.set(jobId, job);
    }

    // Complete processing
    job.status = "completed";
    job.completedAt = new Date().toISOString();
    this.jobs.set(jobId, job);

    // Update recording
    const recording = this.store.recordings.get(job.recordingId);
    if (recording) {
      const qualities = this.generateQualityVariants(recording);

      const updatedRecording: StreamRecording = {
        ...recording,
        status: "ready",
        url: `${this.storageBaseUrl}/recordings/${recording.id}/index.m3u8`,
        thumbnailUrl: `${this.storageBaseUrl}/recordings/${recording.id}/thumbnail.jpg`,
        durationSeconds: 3600, // Placeholder
        sizeBytes: 1024 * 1024 * 500, // Placeholder
        qualities,
        completedAt: new Date().toISOString(),
      };

      this.store.recordings.set(recording.id, updatedRecording);
    }

    logger.info("Processing completed", {
      jobId,
      recordingId: job.recordingId,
    });
  }

  /**
   * Generate quality variants for recording
   */
  private generateQualityVariants(
    recording: StreamRecording,
  ): RecordingQuality[] {
    const qualities: StreamQuality[] = ["1080p", "720p", "480p", "360p"];
    const bitrates: Record<StreamQuality, number> = {
      "1080p": 6000,
      "720p": 3000,
      "480p": 1500,
      "360p": 800,
      auto: 3000,
    };

    return qualities.map((quality) => ({
      quality,
      url: `${this.storageBaseUrl}/recordings/${recording.id}/${quality}.mp4`,
      sizeBytes:
        Math.floor(Math.random() * 500 * 1024 * 1024) + 100 * 1024 * 1024,
      bitrate: bitrates[quality],
    }));
  }

  /**
   * Get processing job status
   */
  async getJobStatus(jobId: string): Promise<ProcessingJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  // ==========================================================================
  // Trimming & Editing
  // ==========================================================================

  /**
   * Trim recording
   */
  async trimRecording(
    recordingId: string,
    userId: string,
    trim: RecordingTrim,
  ): Promise<StreamRecording> {
    const recording = await this.getRecording(recordingId);

    if (recording.status !== "ready") {
      throw new Error("Recording is not ready for editing");
    }

    // Validate trim parameters
    if (trim.startSeconds < 0) {
      throw new Error("Start time cannot be negative");
    }

    if (
      recording.durationSeconds &&
      trim.endSeconds > recording.durationSeconds
    ) {
      throw new Error("End time exceeds recording duration");
    }

    if (trim.startSeconds >= trim.endSeconds) {
      throw new Error("Start time must be before end time");
    }

    // Create new recording with trimmed content
    const trimmedRecording: StreamRecording = {
      id: crypto.randomUUID(),
      streamId: recording.streamId,
      status: "processing",
      format: recording.format,
      qualities: [],
      createdAt: new Date().toISOString(),
    };

    this.store.recordings.set(trimmedRecording.id, trimmedRecording);

    // Start trim job
    await this.startProcessingJob(trimmedRecording.id, "trim");

    logger.info("Recording trim started", {
      originalId: recordingId,
      newId: trimmedRecording.id,
      trim,
    });

    return trimmedRecording;
  }

  // ==========================================================================
  // Clip Creation
  // ==========================================================================

  /**
   * Create clip from recording
   */
  async createClip(
    recordingId: string,
    userId: string,
    config: ClipConfig,
  ): Promise<StreamRecording> {
    const recording = await this.getRecording(recordingId);

    if (recording.status !== "ready") {
      throw new Error("Recording is not ready for clipping");
    }

    // Validate clip parameters
    if (config.startSeconds < 0) {
      throw new Error("Start time cannot be negative");
    }

    if (config.durationSeconds <= 0 || config.durationSeconds > 60) {
      throw new Error("Clip duration must be between 1 and 60 seconds");
    }

    const endSeconds = config.startSeconds + config.durationSeconds;
    if (recording.durationSeconds && endSeconds > recording.durationSeconds) {
      throw new Error("Clip exceeds recording duration");
    }

    const clip: StreamRecording = {
      id: crypto.randomUUID(),
      streamId: recording.streamId,
      status: "processing",
      format: "mp4",
      durationSeconds: config.durationSeconds,
      qualities: [],
      createdAt: new Date().toISOString(),
    };

    this.store.clips.set(clip.id, clip);

    // Start clip processing
    await this.startProcessingJob(clip.id, "clip");

    logger.info("Clip creation started", {
      recordingId,
      clipId: clip.id,
      config,
    });

    return clip;
  }

  /**
   * Get clip by ID
   */
  async getClip(clipId: string): Promise<StreamRecording | null> {
    return this.store.clips.get(clipId) ?? null;
  }

  /**
   * Get all clips for a stream
   */
  async getStreamClips(streamId: string): Promise<StreamRecording[]> {
    const clips: StreamRecording[] = [];

    for (const clip of this.store.clips.values()) {
      if (clip.streamId === streamId) {
        clips.push(clip);
      }
    }

    return clips.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  // ==========================================================================
  // Recording Management
  // ==========================================================================

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string, userId: string): Promise<void> {
    const recording = this.store.recordings.get(recordingId);

    if (!recording) {
      throw new Error(`Recording not found: ${recordingId}`);
    }

    if (recording.status === "recording") {
      throw new Error("Cannot delete active recording");
    }

    this.store.recordings.delete(recordingId);

    logger.info("Recording deleted", { recordingId });
  }

  /**
   * Delete clip
   */
  async deleteClip(clipId: string, userId: string): Promise<void> {
    if (!this.store.clips.has(clipId)) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    this.store.clips.delete(clipId);

    logger.info("Clip deleted", { clipId });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(userId: string): Promise<{
    totalRecordings: number;
    totalClips: number;
    totalSizeBytes: number;
    totalDurationSeconds: number;
  }> {
    let totalSizeBytes = 0;
    let totalDurationSeconds = 0;

    for (const recording of this.store.recordings.values()) {
      if (recording.sizeBytes) {
        totalSizeBytes += recording.sizeBytes;
      }
      if (recording.durationSeconds) {
        totalDurationSeconds += recording.durationSeconds;
      }
    }

    return {
      totalRecordings: this.store.recordings.size,
      totalClips: this.store.clips.size,
      totalSizeBytes,
      totalDurationSeconds,
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Format duration to human-readable string
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Get thumbnail URL for time position
   */
  getThumbnailUrl(recordingId: string, timeSeconds: number): string {
    return `${this.storageBaseUrl}/recordings/${recordingId}/thumbnails/${timeSeconds}.jpg`;
  }

  /**
   * Cleanup all data for a stream
   */
  async cleanupStream(streamId: string): Promise<void> {
    // Remove recordings
    for (const [id, recording] of this.store.recordings) {
      if (recording.streamId === streamId) {
        this.store.recordings.delete(id);
      }
    }

    // Remove clips
    for (const [id, clip] of this.store.clips) {
      if (clip.streamId === streamId) {
        this.store.clips.delete(id);
      }
    }

    // Remove active recording flag
    this.store.activeRecordings.delete(streamId);

    logger.info("Stream recording data cleaned up", { streamId });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serviceInstance: LivestreamRecordingService | null = null;

/**
 * Get singleton recording service instance
 */
export function getRecordingService(
  storageBaseUrl?: string,
): LivestreamRecordingService {
  if (!serviceInstance) {
    serviceInstance = new LivestreamRecordingService(storageBaseUrl);
  }
  return serviceInstance;
}

/**
 * Create new recording service instance
 */
export function createRecordingService(
  storageBaseUrl?: string,
): LivestreamRecordingService {
  return new LivestreamRecordingService(storageBaseUrl);
}
