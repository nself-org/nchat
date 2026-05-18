/**
 * Redaction Service
 *
 * Handles recording redaction:
 * - Redact audio portions
 * - Redact video portions
 * - Timestamp-based redaction
 * - Redaction audit log
 * - Export redacted version
 *
 * @module services/recordings/redaction.service
 */

import { logger } from "@/lib/logger";
import type {
  Recording,
  RedactionSegment,
  RedactionType,
  RedactionRegion,
  RedactionRequest,
  RedactionAuditLog,
} from "./types";
import { RedactionError, RecordingNotFoundError } from "./types";
import {
  getRecordingPipeline,
  RecordingPipelineService,
} from "./recording-pipeline.service";

// ============================================================================
// Types
// ============================================================================

interface RedactionStore {
  segments: Map<string, RedactionSegment>;
  requests: Map<string, RedactionRequest>;
  auditLogs: Map<string, RedactionAuditLog[]>;
  redactedVersions: Map<string, string>; // original -> redacted recording ID
}

interface RedactionConfig {
  maxSegmentsPerRecording: number;
  minSegmentDuration: number;
  maxSegmentDuration: number;
  allowOverlappingSegments: boolean;
  requireApproval: boolean;
  preserveOriginalByDefault: boolean;
  auditLogRetentionDays: number;
}

// ============================================================================
// Redaction Service
// ============================================================================

export class RedactionService {
  private store: RedactionStore;
  private config: RedactionConfig;
  private pipeline: RecordingPipelineService;

  constructor(
    customConfig?: Partial<RedactionConfig>,
    pipelineInstance?: RecordingPipelineService,
  ) {
    this.store = {
      segments: new Map(),
      requests: new Map(),
      auditLogs: new Map(),
      redactedVersions: new Map(),
    };

    this.config = {
      maxSegmentsPerRecording: customConfig?.maxSegmentsPerRecording ?? 100,
      minSegmentDuration: customConfig?.minSegmentDuration ?? 0.5, // 0.5 seconds
      maxSegmentDuration: customConfig?.maxSegmentDuration ?? 3600, // 1 hour
      allowOverlappingSegments: customConfig?.allowOverlappingSegments ?? false,
      requireApproval: customConfig?.requireApproval ?? false,
      preserveOriginalByDefault:
        customConfig?.preserveOriginalByDefault ?? true,
      auditLogRetentionDays: customConfig?.auditLogRetentionDays ?? 365,
    };

    this.pipeline = pipelineInstance ?? getRecordingPipeline();
  }

  // ==========================================================================
  // Redaction Segment Management
  // ==========================================================================

  /**
   * Add a redaction segment
   */
  async addRedactionSegment(
    recordingId: string,
    segment: {
      type: RedactionType;
      startSeconds: number;
      endSeconds: number;
      reason: string;
      region?: RedactionRegion;
      trackId?: string;
      participantId?: string;
    },
    userId: string,
  ): Promise<RedactionSegment> {
    const recording = await this.pipeline.getRecording(recordingId);

    // Validate segment
    this.validateSegment(recording, segment);

    // Check segment limit
    const existingSegments = await this.getRedactionSegments(recordingId);
    if (existingSegments.length >= this.config.maxSegmentsPerRecording) {
      throw new RedactionError(
        `Maximum of ${this.config.maxSegmentsPerRecording} segments per recording`,
        recordingId,
      );
    }

    // Check for overlapping segments if not allowed
    if (!this.config.allowOverlappingSegments) {
      const overlapping = existingSegments.find(
        (s) =>
          s.applied &&
          this.segmentsOverlap(
            { start: segment.startSeconds, end: segment.endSeconds },
            { start: s.startSeconds, end: s.endSeconds },
          ),
      );

      if (overlapping) {
        throw new RedactionError(
          "Overlapping redaction segments are not allowed",
          recordingId,
          overlapping.id,
        );
      }
    }

    const redactionSegment: RedactionSegment = {
      id: crypto.randomUUID(),
      recordingId,
      type: segment.type,
      startSeconds: segment.startSeconds,
      endSeconds: segment.endSeconds,
      reason: segment.reason,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      applied: false,
      region: segment.region,
      trackId: segment.trackId,
      participantId: segment.participantId,
    };

    this.store.segments.set(redactionSegment.id, redactionSegment);

    // Update recording
    recording.redactions.push(redactionSegment);
    recording.hasRedactions = true;

    // Create audit log
    await this.createAuditLog(
      recordingId,
      redactionSegment.id,
      "created",
      userId,
      undefined,
      redactionSegment,
    );

    logger.info("Redaction segment added", {
      recordingId,
      segmentId: redactionSegment.id,
      type: segment.type,
      duration: segment.endSeconds - segment.startSeconds,
    });

    return redactionSegment;
  }

  /**
   * Validate redaction segment
   */
  private validateSegment(
    recording: Recording,
    segment: {
      type: RedactionType;
      startSeconds: number;
      endSeconds: number;
      region?: RedactionRegion;
    },
  ): void {
    // Check recording is completed
    if (recording.status !== "completed") {
      throw new RedactionError(
        "Can only redact completed recordings",
        recording.id,
      );
    }

    // Check duration
    if (recording.durationSeconds === undefined) {
      throw new RedactionError(
        "Recording duration not available",
        recording.id,
      );
    }

    // Validate times
    if (segment.startSeconds < 0) {
      throw new RedactionError("Start time cannot be negative", recording.id);
    }

    if (segment.endSeconds <= segment.startSeconds) {
      throw new RedactionError(
        "End time must be after start time",
        recording.id,
      );
    }

    if (segment.endSeconds > recording.durationSeconds) {
      throw new RedactionError(
        "End time exceeds recording duration",
        recording.id,
      );
    }

    const duration = segment.endSeconds - segment.startSeconds;

    if (duration < this.config.minSegmentDuration) {
      throw new RedactionError(
        `Segment must be at least ${this.config.minSegmentDuration} seconds`,
        recording.id,
      );
    }

    if (duration > this.config.maxSegmentDuration) {
      throw new RedactionError(
        `Segment cannot exceed ${this.config.maxSegmentDuration} seconds`,
        recording.id,
      );
    }

    // Validate video redaction has region
    if (segment.type === "blur" && !segment.region) {
      throw new RedactionError(
        "Video blur redaction requires a region",
        recording.id,
      );
    }
  }

  /**
   * Check if two segments overlap
   */
  private segmentsOverlap(
    a: { start: number; end: number },
    b: { start: number; end: number },
  ): boolean {
    return a.start < b.end && b.start < a.end;
  }

  /**
   * Get redaction segment by ID
   */
  async getRedactionSegment(
    segmentId: string,
  ): Promise<RedactionSegment | null> {
    return this.store.segments.get(segmentId) || null;
  }

  /**
   * Get all redaction segments for a recording
   */
  async getRedactionSegments(recordingId: string): Promise<RedactionSegment[]> {
    const segments: RedactionSegment[] = [];
    for (const segment of this.store.segments.values()) {
      if (segment.recordingId === recordingId) {
        segments.push(segment);
      }
    }
    return segments.sort((a, b) => a.startSeconds - b.startSeconds);
  }

  /**
   * Update a redaction segment
   */
  async updateRedactionSegment(
    segmentId: string,
    updates: Partial<
      Pick<
        RedactionSegment,
        "type" | "startSeconds" | "endSeconds" | "reason" | "region"
      >
    >,
    userId: string,
  ): Promise<RedactionSegment> {
    const segment = await this.getRedactionSegment(segmentId);
    if (!segment) {
      throw new RedactionError("Segment not found", "", segmentId);
    }

    if (segment.applied) {
      throw new RedactionError(
        "Cannot modify an applied segment",
        segment.recordingId,
        segmentId,
      );
    }

    const previousState = { ...segment };

    // Validate if times changed
    if (
      updates.startSeconds !== undefined ||
      updates.endSeconds !== undefined
    ) {
      const recording = await this.pipeline.getRecording(segment.recordingId);
      this.validateSegment(recording, {
        type: updates.type ?? segment.type,
        startSeconds: updates.startSeconds ?? segment.startSeconds,
        endSeconds: updates.endSeconds ?? segment.endSeconds,
        region: updates.region ?? segment.region,
      });
    }

    Object.assign(segment, updates);
    this.store.segments.set(segmentId, segment);

    // Update recording
    const recording = await this.pipeline.getRecording(segment.recordingId);
    const segmentIndex = recording.redactions.findIndex(
      (s) => s.id === segmentId,
    );
    if (segmentIndex >= 0) {
      recording.redactions[segmentIndex] = segment;
    }

    // Create audit log
    await this.createAuditLog(
      segment.recordingId,
      segmentId,
      "created",
      userId,
      previousState,
      segment,
    );

    logger.info("Redaction segment updated", { segmentId, updates });

    return segment;
  }

  /**
   * Remove a redaction segment
   */
  async removeRedactionSegment(
    segmentId: string,
    userId: string,
  ): Promise<void> {
    const segment = await this.getRedactionSegment(segmentId);
    if (!segment) {
      throw new RedactionError("Segment not found", "", segmentId);
    }

    if (segment.applied) {
      throw new RedactionError(
        "Cannot remove an applied segment",
        segment.recordingId,
        segmentId,
      );
    }

    const previousState = { ...segment };
    this.store.segments.delete(segmentId);

    // Update recording
    const recording = await this.pipeline.getRecording(segment.recordingId);
    recording.redactions = recording.redactions.filter(
      (s) => s.id !== segmentId,
    );
    recording.hasRedactions = recording.redactions.length > 0;

    // Create audit log
    await this.createAuditLog(
      segment.recordingId,
      segmentId,
      "removed",
      userId,
      previousState,
    );

    logger.info("Redaction segment removed", { segmentId });
  }

  // ==========================================================================
  // Redaction Requests
  // ==========================================================================

  /**
   * Create a redaction request (batch operation)
   */
  async createRedactionRequest(
    recordingId: string,
    segments: Omit<
      RedactionSegment,
      "id" | "recordingId" | "applied" | "appliedAt" | "createdAt"
    >[],
    userId: string,
    options: {
      applyImmediately?: boolean;
      preserveOriginal?: boolean;
    } = {},
  ): Promise<RedactionRequest> {
    const recording = await this.pipeline.getRecording(recordingId);

    // Validate all segments first
    for (const segment of segments) {
      this.validateSegment(recording, segment);
    }

    // Create segments
    const createdSegments: RedactionSegment[] = [];
    for (const segmentData of segments) {
      const segment = await this.addRedactionSegment(
        recordingId,
        segmentData,
        userId,
      );
      createdSegments.push(segment);
    }

    const request: RedactionRequest = {
      id: crypto.randomUUID(),
      recordingId,
      segments: createdSegments,
      status: "pending",
      requestedBy: userId,
      requestedAt: new Date().toISOString(),
    };

    this.store.requests.set(request.id, request);

    // Apply immediately if requested and not requiring approval
    if (options.applyImmediately && !this.config.requireApproval) {
      await this.applyRedactionRequest(
        request.id,
        userId,
        options.preserveOriginal,
      );
    }

    logger.info("Redaction request created", {
      requestId: request.id,
      recordingId,
      segmentCount: segments.length,
    });

    return request;
  }

  /**
   * Apply a redaction request
   */
  async applyRedactionRequest(
    requestId: string,
    userId: string,
    preserveOriginal?: boolean,
  ): Promise<RedactionRequest> {
    const request = this.store.requests.get(requestId);
    if (!request) {
      throw new RedactionError("Redaction request not found", "");
    }

    if (request.status !== "pending") {
      throw new RedactionError(
        `Request is already ${request.status}`,
        request.recordingId,
      );
    }

    const recording = await this.pipeline.getRecording(request.recordingId);

    // Update status
    request.status = "processing";
    this.store.requests.set(requestId, request);

    try {
      // Create processing job for redaction
      const preserveOrig =
        preserveOriginal ?? this.config.preserveOriginalByDefault;

      await this.pipeline.createProcessingJob(
        request.recordingId,
        "redaction",
        {
          segments: request.segments,
          preserveOriginal: preserveOrig,
        },
        10, // High priority
      );

      // Mark segments as applied
      // Note: request.segments are partial, so we look them up in recording.redactions
      for (const recordingSegment of recording.redactions) {
        // Check if this segment is part of the request
        const isInRequest = request.segments.some(
          (s) =>
            s.type === recordingSegment.type &&
            s.startSeconds === recordingSegment.startSeconds &&
            s.endSeconds === recordingSegment.endSeconds,
        );

        if (isInRequest && !recordingSegment.applied) {
          recordingSegment.applied = true;
          recordingSegment.appliedAt = new Date().toISOString();
          this.store.segments.set(recordingSegment.id, recordingSegment);

          // Create audit log
          await this.createAuditLog(
            recordingSegment.recordingId,
            recordingSegment.id,
            "applied",
            userId,
          );
        }
      }

      // If preserving original, create a new recording for redacted version
      if (preserveOrig) {
        const redactedRecordingId = crypto.randomUUID();
        this.store.redactedVersions.set(
          request.recordingId,
          redactedRecordingId,
        );
        request.outputRecordingId = redactedRecordingId;
      }

      request.status = "completed";
      request.completedAt = new Date().toISOString();

      await this.pipeline.emitEvent("recording.redacted", recording, userId, {
        requestId,
        segmentCount: request.segments.length,
        preservedOriginal: preserveOrig,
      });

      logger.info("Redaction request applied", {
        requestId,
        segmentCount: request.segments.length,
      });
    } catch (error) {
      request.status = "failed";
      request.error = String(error);
      logger.error("Redaction request failed", {
        requestId,
        error: String(error),
      });
    }

    this.store.requests.set(requestId, request);
    return request;
  }

  /**
   * Get redaction request by ID
   */
  async getRedactionRequest(
    requestId: string,
  ): Promise<RedactionRequest | null> {
    return this.store.requests.get(requestId) || null;
  }

  /**
   * Get all redaction requests for a recording
   */
  async getRedactionRequests(recordingId: string): Promise<RedactionRequest[]> {
    const requests: RedactionRequest[] = [];
    for (const request of this.store.requests.values()) {
      if (request.recordingId === recordingId) {
        requests.push(request);
      }
    }
    return requests.sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );
  }

  // ==========================================================================
  // Export Redacted Version
  // ==========================================================================

  /**
   * Get redacted version of a recording
   */
  async getRedactedVersion(recordingId: string): Promise<Recording | null> {
    const redactedId = this.store.redactedVersions.get(recordingId);
    if (!redactedId) {
      return null;
    }
    return this.pipeline.getRecordingIfExists(redactedId);
  }

  /**
   * Export recording with redactions applied
   */
  async exportRedactedRecording(
    recordingId: string,
    userId: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const recording = await this.pipeline.getRecording(recordingId);

    // Check for applied redactions
    const appliedRedactions = recording.redactions.filter((s) => s.applied);
    if (appliedRedactions.length === 0) {
      throw new RedactionError("No applied redactions to export", recordingId);
    }

    // Check for redacted version
    let exportRecordingId = recordingId;
    const redactedVersion = await this.getRedactedVersion(recordingId);
    if (redactedVersion) {
      exportRecordingId = redactedVersion.id;
    }

    // Get download URL
    const downloadUrl = await this.pipeline.getDownloadUrl(exportRecordingId);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    // Create audit log
    for (const segment of appliedRedactions) {
      await this.createAuditLog(recordingId, segment.id, "exported", userId);
    }

    logger.info("Redacted recording exported", {
      recordingId,
      exportRecordingId,
      redactionCount: appliedRedactions.length,
    });

    return { downloadUrl, expiresAt };
  }

  // ==========================================================================
  // Audit Logging
  // ==========================================================================

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    recordingId: string,
    segmentId: string,
    action: "created" | "applied" | "removed" | "exported",
    performedBy: string,
    previousState?: Partial<RedactionSegment>,
    newState?: Partial<RedactionSegment>,
  ): Promise<RedactionAuditLog> {
    const log: RedactionAuditLog = {
      id: crypto.randomUUID(),
      recordingId,
      segmentId,
      action,
      performedBy,
      performedAt: new Date().toISOString(),
      previousState,
      newState,
    };

    const logs = this.store.auditLogs.get(recordingId) || [];
    logs.push(log);
    this.store.auditLogs.set(recordingId, logs);

    return log;
  }

  /**
   * Get audit logs for a recording
   */
  async getAuditLogs(recordingId: string): Promise<RedactionAuditLog[]> {
    return this.store.auditLogs.get(recordingId) || [];
  }

  /**
   * Get audit logs for a specific segment
   */
  async getSegmentAuditLogs(segmentId: string): Promise<RedactionAuditLog[]> {
    const logs: RedactionAuditLog[] = [];
    for (const recordingLogs of this.store.auditLogs.values()) {
      for (const log of recordingLogs) {
        if (log.segmentId === segmentId) {
          logs.push(log);
        }
      }
    }
    return logs.sort(
      (a, b) =>
        new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
    );
  }

  /**
   * Cleanup old audit logs
   */
  async cleanupAuditLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - this.config.auditLogRetentionDays,
    );
    let deletedCount = 0;

    for (const [recordingId, logs] of this.store.auditLogs) {
      const filteredLogs = logs.filter(
        (log) => new Date(log.performedAt) > cutoffDate,
      );
      deletedCount += logs.length - filteredLogs.length;

      if (filteredLogs.length === 0) {
        this.store.auditLogs.delete(recordingId);
      } else {
        this.store.auditLogs.set(recordingId, filteredLogs);
      }
    }

    if (deletedCount > 0) {
      logger.info("Audit logs cleaned up", { deletedCount });
    }

    return deletedCount;
  }

  // ==========================================================================
  // Redaction Preview
  // ==========================================================================

  /**
   * Generate preview of redacted segment
   */
  async generateRedactionPreview(
    recordingId: string,
    segment: {
      type: RedactionType;
      startSeconds: number;
      endSeconds: number;
      region?: RedactionRegion;
    },
  ): Promise<{ previewUrl: string; expiresAt: string }> {
    const recording = await this.pipeline.getRecording(recordingId);

    // Validate segment
    this.validateSegment(recording, segment);

    // In production, this would generate a preview video/audio
    // For now, return a placeholder
    const previewUrl = `${process.env.NEXT_PUBLIC_STORAGE_URL}/previews/${recordingId}/${Date.now()}.mp4`;
    const expiresAt = new Date(Date.now() + 300 * 1000).toISOString(); // 5 minutes

    logger.info("Redaction preview generated", {
      recordingId,
      type: segment.type,
      start: segment.startSeconds,
      end: segment.endSeconds,
    });

    return { previewUrl, expiresAt };
  }

  // ==========================================================================
  // Utility Methods for Testing
  // ==========================================================================

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.store.segments.clear();
    this.store.requests.clear();
    this.store.auditLogs.clear();
    this.store.redactedVersions.clear();
  }

  /**
   * Get all segments (for testing)
   */
  getAllSegments(): RedactionSegment[] {
    return Array.from(this.store.segments.values());
  }

  /**
   * Get all requests (for testing)
   */
  getAllRequests(): RedactionRequest[] {
    return Array.from(this.store.requests.values());
  }

  /**
   * Get all audit logs (for testing)
   */
  getAllAuditLogs(): RedactionAuditLog[] {
    const logs: RedactionAuditLog[] = [];
    for (const recordingLogs of this.store.auditLogs.values()) {
      logs.push(...recordingLogs);
    }
    return logs;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let redactionInstance: RedactionService | null = null;

/**
 * Get singleton redaction service instance
 */
export function getRedactionService(
  config?: Partial<RedactionConfig>,
): RedactionService {
  if (!redactionInstance) {
    redactionInstance = new RedactionService(config);
  }
  return redactionInstance;
}

/**
 * Create new redaction service instance
 */
export function createRedactionService(
  config?: Partial<RedactionConfig>,
  pipelineInstance?: RecordingPipelineService,
): RedactionService {
  return new RedactionService(config, pipelineInstance);
}
