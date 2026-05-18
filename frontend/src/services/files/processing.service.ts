/**
 * File Processing Service
 *
 * Integrates with the nself file-processing plugin to handle:
 * - Thumbnail generation
 * - EXIF stripping for privacy
 * - Virus scanning
 * - Image optimization
 */

import type {
  FileRecord,
  ProcessingStatus,
  ProcessingOperation,
  ProcessingResult,
  CreateProcessingJobRequest,
  CreateProcessingJobResponse,
  GetProcessingJobResponse,
  ThumbnailRecord,
  FileMetadata,
  ScanResult,
  OptimizationResult,
  ProcessingWebhookPayload,
} from "./types";
import { getProcessingConfig, FILE_SERVICE_CONSTANTS } from "./config";

// ============================================================================
// Processing Service Class
// ============================================================================

export class ProcessingService {
  private config: ReturnType<typeof getProcessingConfig>;

  constructor() {
    this.config = getProcessingConfig();
  }

  /**
   * Create a new processing job
   */
  async createJob(
    file: FileRecord,
    operations: ProcessingOperation[] = ["thumbnail", "optimize", "metadata"],
  ): Promise<CreateProcessingJobResponse> {
    const request: CreateProcessingJobRequest = {
      fileId: file.id,
      filePath: file.storagePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.mimeType,
      operations,
      priority: 5,
      webhookUrl: this.config.webhookUrl || undefined,
      webhookSecret: this.config.webhookSecret || undefined,
      callbackData: {
        channelId: file.channelId,
        messageId: file.messageId,
      },
    };

    const response = await fetch(`${this.config.baseUrl}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create processing job: ${error}`);
    }

    return response.json();
  }

  /**
   * Get processing job status
   */
  async getJobStatus(jobId: string): Promise<GetProcessingJobResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/jobs/${jobId}`, {
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Wait for processing to complete
   */
  async waitForCompletion(
    jobId: string,
    options: {
      maxWait?: number;
      pollInterval?: number;
      onProgress?: (status: ProcessingStatus) => void;
    } = {},
  ): Promise<ProcessingResult> {
    const { maxWait = 60000, pollInterval = 1000, onProgress } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const jobResponse = await this.getJobStatus(jobId);
      const { job, thumbnails, metadata, scan } = jobResponse;

      onProgress?.(job.status);

      if (job.status === "completed") {
        return {
          jobId: job.id,
          fileId: job.fileId,
          status: "completed",
          thumbnails: thumbnails || [],
          metadata,
          scan,
          duration: job.durationMs || 0,
          completedAt: new Date(),
        };
      }

      if (job.status === "failed") {
        throw new Error(job.error || "Processing failed");
      }

      if (job.status === "cancelled") {
        throw new Error("Processing was cancelled");
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error("Processing timeout");
  }

  /**
   * Cancel a processing job
   */
  async cancelJob(jobId: string): Promise<void> {
    const response = await fetch(
      `${this.config.baseUrl}/api/jobs/${jobId}/cancel`,
      {
        method: "POST",
        signal: AbortSignal.timeout(this.config.timeout),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to cancel job: ${response.statusText}`);
    }
  }

  /**
   * Get processing statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    avgDurationMs: number;
    totalProcessed: number;
    thumbnailsGenerated: number;
    storageUsed: number;
  }> {
    const response = await fetch(`${this.config.baseUrl}/api/stats`, {
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Health check for processing service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: {
      server: boolean;
      worker: boolean;
      redis: boolean;
      storage: boolean;
    };
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          healthy: false,
          services: {
            server: false,
            worker: false,
            redis: false,
            storage: false,
          },
        };
      }

      return response.json();
    } catch {
      return {
        healthy: false,
        services: {
          server: false,
          worker: false,
          redis: false,
          storage: false,
        },
      };
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string = this.config.webhookSecret,
  ): Promise<boolean> {
    if (!secret) return false;

    // HMAC-SHA256 signature verification
    return verifyHmacSignature(payload, signature, secret);
  }

  /**
   * Process webhook payload
   */
  async processWebhook(payload: ProcessingWebhookPayload): Promise<void> {
    const {
      event,
      fileId,
      status,
      thumbnails,
      metadata,
      scan,
      optimization,
      error,
    } = payload;

    if (event === "job.completed") {
      // Update file record with processing results
      await this.updateFileWithResults(fileId, {
        status: "completed",
        thumbnails,
        metadata,
        scan,
        optimization,
      });
    } else if (event === "job.failed") {
      // Update file record with error
      await this.updateFileWithResults(fileId, {
        status: "failed",
        error,
      });
    }
  }

  /**
   * Update file record with processing results
   */
  private async updateFileWithResults(
    fileId: string,
    results: {
      status: ProcessingStatus;
      thumbnails?: ThumbnailRecord[];
      metadata?: FileMetadata;
      scan?: ScanResult;
      optimization?: OptimizationResult;
      error?: string;
    },
  ): Promise<void> {
    await fetch(`/api/files/${fileId}/processing-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(results),
    });
  }

  /**
   * Reprocess a file
   */
  async reprocessFile(
    file: FileRecord,
    operations?: ProcessingOperation[],
  ): Promise<CreateProcessingJobResponse> {
    // Default operations based on file type
    const ops = operations || this.getDefaultOperations(file.mimeType);
    return this.createJob(file, ops);
  }

  /**
   * Get default processing operations for a MIME type
   */
  getDefaultOperations(mimeType: string): ProcessingOperation[] {
    const operations: ProcessingOperation[] = ["metadata"];

    if (mimeType.startsWith("image/")) {
      operations.push("thumbnail", "optimize");
    } else if (mimeType.startsWith("video/")) {
      operations.push("thumbnail");
    }

    return operations;
  }

  /**
   * Check if file type supports thumbnails
   */
  supportsThumbnails(mimeType: string): boolean {
    return (
      FILE_SERVICE_CONSTANTS.THUMBNAIL_SUPPORTED_TYPES.includes(
        mimeType as any,
      ) ||
      FILE_SERVICE_CONSTANTS.VIDEO_THUMBNAIL_SUPPORTED_TYPES.includes(
        mimeType as any,
      )
    );
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let processingServiceInstance: ProcessingService | null = null;

export function getProcessingService(): ProcessingService {
  if (!processingServiceInstance) {
    processingServiceInstance = new ProcessingService();
  }
  return processingServiceInstance;
}

// ============================================================================
// Webhook Verification
// ============================================================================

/**
 * Verify HMAC-SHA256 signature
 */
async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload),
    );

    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    if (signature.length !== computedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ computedSignature.charCodeAt(i);
    }

    return result === 0;
  } catch {
    return false;
  }
}

// ============================================================================
// Processing Status Helpers
// ============================================================================

/**
 * Check if processing status indicates completion
 */
export function isProcessingComplete(status: ProcessingStatus): boolean {
  return (
    status === "completed" || status === "failed" || status === "cancelled"
  );
}

/**
 * Check if processing status indicates success
 */
export function isProcessingSuccessful(status: ProcessingStatus): boolean {
  return status === "completed";
}

/**
 * Get human-readable status message
 */
export function getStatusMessage(status: ProcessingStatus): string {
  switch (status) {
    case "pending":
      return "Waiting to process";
    case "uploading":
      return "Uploading file";
    case "processing":
      return "Processing file";
    case "completed":
      return "Processing complete";
    case "failed":
      return "Processing failed";
    case "cancelled":
      return "Processing cancelled";
    default:
      return "Unknown status";
  }
}

/**
 * Estimate processing time based on file size and type
 */
export function estimateProcessingTime(
  fileSize: number,
  mimeType: string,
): number {
  // Base time in milliseconds
  let baseTime = 500;

  // Add time based on file size (roughly 100ms per MB)
  baseTime += (fileSize / (1024 * 1024)) * 100;

  // Add time based on file type
  if (mimeType.startsWith("image/")) {
    // Images are generally fast
    baseTime += 500;
  } else if (mimeType.startsWith("video/")) {
    // Videos take longer
    baseTime += 2000;
    // Add more time for larger videos
    baseTime += (fileSize / (1024 * 1024)) * 200;
  }

  return Math.round(baseTime);
}
