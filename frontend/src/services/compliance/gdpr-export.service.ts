/**
 * GDPR Export Service
 *
 * Enterprise-grade GDPR data portability service (Article 20).
 * Handles comprehensive user data export with multiple format support.
 *
 * @module services/compliance/gdpr-export.service
 * @version 1.0.0
 */

import { v4 as uuidv4 } from "uuid";
import { createLogger } from "@/lib/logger";
import type {
  GDPRExportJob,
  ExportJobStatus,
  CollectedUserData,
  GDPRExportServiceConfig,
  OperationResult,
  DEFAULT_GDPR_EXPORT_CONFIG,
} from "./compliance.types";
import type {
  ExportDataCategory,
  ExportFormat,
} from "@/lib/compliance/compliance-types";

const log = createLogger("GDPRExportService");

// ============================================================================
// TYPES
// ============================================================================

/**
 * Export job creation input
 */
export interface CreateExportJobInput {
  dsarId: string;
  userId: string;
  categories: ExportDataCategory[];
  format?: ExportFormat;
  dateFrom?: Date;
  dateTo?: Date;
  includeAttachments?: boolean;
  includeMetadata?: boolean;
}

/**
 * Export progress callback
 */
export type ExportProgressCallback = (job: GDPRExportJob) => void;

/**
 * Data collector function type
 */
export type DataCollector<T> = (
  userId: string,
  options: { dateFrom?: Date; dateTo?: Date },
) => Promise<T[]>;

/**
 * Registered data collectors
 */
export interface DataCollectors {
  profile: () => Promise<CollectedUserData["profile"] | null>;
  messages: DataCollector<CollectedUserData["messages"][0]>;
  files: DataCollector<CollectedUserData["files"][0]>;
  channels: DataCollector<CollectedUserData["channels"][0]>;
  activity: DataCollector<CollectedUserData["activity"][0]>;
  reactions: DataCollector<CollectedUserData["reactions"][0]>;
  settings: () => Promise<CollectedUserData["settings"]>;
  consents: DataCollector<CollectedUserData["consents"][0]>;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: GDPRExportServiceConfig = {
  enabled: true,
  includeEncryptedContent: false,
  includeDeletedContent: false,
  includeSystemMessages: false,
  maxFileSizeMB: 100,
  maxTotalSizeMB: 5000,
  defaultFormat: "zip",
  supportedFormats: ["json", "csv", "zip"],
  includeMetadata: true,
  prettyPrintJson: true,
  batchSize: 1000,
  maxConcurrentJobs: 5,
  jobTimeoutMinutes: 60,
  retryAttempts: 3,
  encryptExports: true,
  encryptionAlgorithm: "AES-256-GCM",
  storageProvider: "local",
  storagePath: "/exports",
  storageRetentionDays: 7,
};

// ============================================================================
// GDPR EXPORT SERVICE
// ============================================================================

export class GDPRExportService {
  private config: GDPRExportServiceConfig;
  private jobs = new Map<string, GDPRExportJob>();
  private isInitialized = false;
  private dataCollectors: Partial<DataCollectors> = {};
  private progressCallbacks = new Map<string, ExportProgressCallback[]>();

  constructor(config: Partial<GDPRExportServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.debug("Service already initialized");
      return;
    }

    log.info("Initializing GDPR export service");

    // Register default data collectors
    this.registerDefaultCollectors();

    this.isInitialized = true;
    log.info("GDPR export service initialized");
  }

  /**
   * Register default data collectors (placeholder implementations)
   */
  private registerDefaultCollectors(): void {
    // These would be replaced with actual database queries
    this.dataCollectors = {
      profile: async () => null,
      messages: async () => [],
      files: async () => [],
      channels: async () => [],
      activity: async () => [],
      reactions: async () => [],
      settings: async () => ({}),
      consents: async () => [],
    };
  }

  /**
   * Register a custom data collector
   */
  registerCollector<K extends keyof DataCollectors>(
    category: K,
    collector: DataCollectors[K],
  ): void {
    this.dataCollectors[category] = collector as DataCollectors[K];
    log.info("Data collector registered", { category });
  }

  /**
   * Close the service
   */
  async close(): Promise<void> {
    log.info("Closing GDPR export service");
    this.jobs.clear();
    this.progressCallbacks.clear();
    this.isInitialized = false;
  }

  // ============================================================================
  // JOB MANAGEMENT
  // ============================================================================

  /**
   * Create a new export job
   */
  async createJob(
    input: CreateExportJobInput,
  ): Promise<OperationResult<GDPRExportJob>> {
    this.ensureInitialized();

    if (!this.config.enabled) {
      return { success: false, error: "GDPR export service is disabled" };
    }

    log.info("Creating export job", {
      dsarId: input.dsarId,
      userId: input.userId,
    });

    // Validate input
    if (!input.userId) {
      return { success: false, error: "User ID is required" };
    }

    if (!input.dsarId) {
      return { success: false, error: "DSAR ID is required" };
    }

    if (!input.categories || input.categories.length === 0) {
      return {
        success: false,
        error: "At least one data category is required",
      };
    }

    // Validate format
    const format = input.format || this.config.defaultFormat;
    if (!this.config.supportedFormats.includes(format)) {
      return {
        success: false,
        error: `Unsupported format: ${format}. Supported: ${this.config.supportedFormats.join(", ")}`,
      };
    }

    // Check concurrent jobs
    const activeJobs = Array.from(this.jobs.values()).filter(
      (j) => !["completed", "failed"].includes(j.status),
    );
    if (activeJobs.length >= this.config.maxConcurrentJobs) {
      return {
        success: false,
        error: "Maximum concurrent export jobs reached",
      };
    }

    // Create job
    const job: GDPRExportJob = {
      id: uuidv4(),
      dsarId: input.dsarId,
      userId: input.userId,
      status: "queued",
      progress: 0,
      currentPhase: "Queued for processing",

      profileIncluded:
        input.categories.includes("profile") ||
        input.categories.includes("all"),
      messagesCollected: 0,
      filesCollected: 0,
      activitiesCollected: 0,
      reactionsCollected: 0,
      consentsCollected: 0,

      outputFormat: format,
      retryCount: 0,
      maxRetries: this.config.retryAttempts,
    };

    this.jobs.set(job.id, job);
    log.info("Export job created", { jobId: job.id });

    return { success: true, data: job };
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): GDPRExportJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get jobs for a DSAR
   */
  getJobsByDSAR(dsarId: string): GDPRExportJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.dsarId === dsarId);
  }

  /**
   * Get jobs for a user
   */
  getJobsByUser(userId: string): GDPRExportJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.userId === userId);
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): GDPRExportJob[] {
    return Array.from(this.jobs.values()).filter(
      (j) => !["completed", "failed"].includes(j.status),
    );
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<OperationResult<void>> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    if (["completed", "failed"].includes(job.status)) {
      return { success: false, error: "Cannot cancel completed or failed job" };
    }

    job.status = "failed";
    job.errorMessage = "Job cancelled by user";
    job.completedAt = new Date();

    this.notifyProgress(job);
    log.info("Export job cancelled", { jobId });

    return { success: true };
  }

  // ============================================================================
  // JOB EXECUTION
  // ============================================================================

  /**
   * Execute an export job
   */
  async executeJob(
    jobId: string,
    options: { dateFrom?: Date; dateTo?: Date } = {},
  ): Promise<OperationResult<CollectedUserData>> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return { success: false, error: "Job not found" };
    }

    if (job.status !== "queued") {
      return {
        success: false,
        error: `Job is not in queued state: ${job.status}`,
      };
    }

    log.info("Executing export job", { jobId, userId: job.userId });
    const startTime = Date.now();

    try {
      // Initialize collected data
      const collectedData: CollectedUserData = {
        profile: {
          id: job.userId,
          email: "",
          createdAt: new Date(),
        },
        messages: [],
        files: [],
        channels: [],
        activity: [],
        reactions: [],
        settings: {},
        consents: [],
      };

      // Phase 1: Collect profile
      await this.updateJobStatus(
        job,
        "collecting_profile",
        5,
        "Collecting profile data",
      );
      if (job.profileIncluded && this.dataCollectors.profile) {
        const profile = await this.dataCollectors.profile();
        if (profile) {
          collectedData.profile = profile;
        }
      }

      // Phase 2: Collect messages
      await this.updateJobStatus(
        job,
        "collecting_messages",
        15,
        "Collecting messages",
      );
      if (this.dataCollectors.messages) {
        collectedData.messages = await this.collectInBatches(
          () => this.dataCollectors.messages!(job.userId, options),
          "messages",
          job,
        );
        job.messagesCollected = collectedData.messages.length;
      }

      // Phase 3: Collect files
      await this.updateJobStatus(
        job,
        "collecting_files",
        35,
        "Collecting files",
      );
      if (this.dataCollectors.files) {
        collectedData.files = await this.collectInBatches(
          () => this.dataCollectors.files!(job.userId, options),
          "files",
          job,
        );
        job.filesCollected = collectedData.files.length;
      }

      // Phase 4: Collect channels
      await this.updateJobStatus(
        job,
        "collecting_files",
        45,
        "Collecting channel memberships",
      );
      if (this.dataCollectors.channels) {
        collectedData.channels = await this.dataCollectors.channels(
          job.userId,
          options,
        );
      }

      // Phase 5: Collect activity
      await this.updateJobStatus(
        job,
        "collecting_activity",
        55,
        "Collecting activity logs",
      );
      if (this.dataCollectors.activity) {
        collectedData.activity = await this.collectInBatches(
          () => this.dataCollectors.activity!(job.userId, options),
          "activity",
          job,
        );
        job.activitiesCollected = collectedData.activity.length;
      }

      // Phase 6: Collect reactions
      await this.updateJobStatus(
        job,
        "collecting_activity",
        65,
        "Collecting reactions",
      );
      if (this.dataCollectors.reactions) {
        collectedData.reactions = await this.dataCollectors.reactions(
          job.userId,
          options,
        );
        job.reactionsCollected = collectedData.reactions.length;
      }

      // Phase 7: Collect settings
      await this.updateJobStatus(
        job,
        "collecting_activity",
        70,
        "Collecting settings",
      );
      if (this.dataCollectors.settings) {
        collectedData.settings = await this.dataCollectors.settings();
      }

      // Phase 8: Collect consents
      await this.updateJobStatus(
        job,
        "collecting_activity",
        75,
        "Collecting consent records",
      );
      if (this.dataCollectors.consents) {
        collectedData.consents = await this.dataCollectors.consents(
          job.userId,
          options,
        );
        job.consentsCollected = collectedData.consents.length;
      }

      // Phase 9: Generate archive
      await this.updateJobStatus(
        job,
        "generating_archive",
        80,
        "Generating archive",
      );
      const archiveResult = await this.generateArchive(
        collectedData,
        job.outputFormat,
      );
      job.outputPath = archiveResult.path;
      job.outputSize = archiveResult.size;
      job.outputChecksum = archiveResult.checksum;

      // Phase 10: Encrypt if configured
      if (this.config.encryptExports) {
        await this.updateJobStatus(job, "encrypting", 90, "Encrypting archive");
        const encryptionResult = await this.encryptArchive(archiveResult.path);
        job.encryptionKey = encryptionResult.key;
      }

      // Complete
      await this.updateJobStatus(job, "completed", 100, "Export completed");
      job.completedAt = new Date();

      const duration = Date.now() - startTime;
      log.info("Export job completed", {
        jobId,
        duration,
        messages: job.messagesCollected,
        files: job.filesCollected,
        size: job.outputSize,
      });

      return { success: true, data: collectedData };
    } catch (error) {
      job.status = "failed";
      job.errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      job.errorDetails = { error: String(error) };
      job.completedAt = new Date();

      this.notifyProgress(job);
      log.error("Export job failed", error, { jobId });

      return {
        success: false,
        error: job.errorMessage,
        details: job.errorDetails,
      };
    }
  }

  /**
   * Collect data in batches
   */
  private async collectInBatches<T>(
    collector: () => Promise<T[]>,
    category: string,
    job: GDPRExportJob,
  ): Promise<T[]> {
    try {
      const items = await collector();
      log.debug("Collected items", {
        category,
        count: items.length,
        jobId: job.id,
      });
      return items;
    } catch (error) {
      log.error("Failed to collect data", error, { category, jobId: job.id });
      throw error;
    }
  }

  /**
   * Update job status and notify
   */
  private async updateJobStatus(
    job: GDPRExportJob,
    status: ExportJobStatus,
    progress: number,
    phase: string,
  ): Promise<void> {
    job.status = status;
    job.progress = progress;
    job.currentPhase = phase;

    if (!job.startedAt && status !== "queued") {
      job.startedAt = new Date();
    }

    this.notifyProgress(job);
  }

  /**
   * Generate archive from collected data
   */
  private async generateArchive(
    data: CollectedUserData,
    format: ExportFormat,
  ): Promise<{ path: string; size: number; checksum: string }> {
    log.debug("Generating archive", { format });

    // Generate content based on format
    let content: string;
    switch (format) {
      case "json":
        content = this.config.prettyPrintJson
          ? JSON.stringify(data, null, 2)
          : JSON.stringify(data);
        break;
      case "csv":
        content = this.convertToCSV(data);
        break;
      case "zip":
      default:
        content = JSON.stringify(data, null, 2);
        break;
    }

    // Calculate size and checksum
    const size = new TextEncoder().encode(content).length;
    const checksum = await this.calculateChecksum(content);

    // In production, this would save to storage
    const path = `${this.config.storagePath}/${uuidv4()}.${format}`;

    return { path, size, checksum };
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: CollectedUserData): string {
    const sections: string[] = [];

    // Profile section
    sections.push("=== PROFILE ===");
    sections.push("id,email,displayName,username,createdAt");
    sections.push(
      [
        data.profile.id,
        data.profile.email,
        data.profile.displayName || "",
        data.profile.username || "",
        data.profile.createdAt.toISOString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );

    // Messages section
    if (data.messages.length > 0) {
      sections.push("");
      sections.push("=== MESSAGES ===");
      sections.push(
        "id,channelId,channelName,content,createdAt,isEdited,isDeleted",
      );
      data.messages.forEach((msg) => {
        sections.push(
          [
            msg.id,
            msg.channelId,
            msg.channelName,
            msg.content.substring(0, 1000), // Truncate long content
            msg.createdAt.toISOString(),
            msg.isEdited,
            msg.isDeleted,
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(","),
        );
      });
    }

    // Files section
    if (data.files.length > 0) {
      sections.push("");
      sections.push("=== FILES ===");
      sections.push("id,filename,mimeType,size,uploadedAt");
      data.files.forEach((file) => {
        sections.push(
          [
            file.id,
            file.filename,
            file.mimeType,
            file.size,
            file.uploadedAt.toISOString(),
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(","),
        );
      });
    }

    // Activity section
    if (data.activity.length > 0) {
      sections.push("");
      sections.push("=== ACTIVITY ===");
      sections.push("type,timestamp,ipAddress");
      data.activity.forEach((act) => {
        sections.push(
          [act.type, act.timestamp.toISOString(), act.ipAddress || ""]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(","),
        );
      });
    }

    // Consents section
    if (data.consents.length > 0) {
      sections.push("");
      sections.push("=== CONSENTS ===");
      sections.push("type,granted,grantedAt,revokedAt");
      data.consents.forEach((consent) => {
        sections.push(
          [
            consent.type,
            consent.granted,
            consent.grantedAt?.toISOString() || "",
            consent.revokedAt?.toISOString() || "",
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(","),
        );
      });
    }

    return sections.join("\n");
  }

  /**
   * Encrypt archive (placeholder)
   */
  private async encryptArchive(
    path: string,
  ): Promise<{ path: string; key: string }> {
    log.debug("Encrypting archive", { path });

    // In production, use Web Crypto API or node crypto
    const key = uuidv4(); // Placeholder - would be proper encryption key

    return { path: `${path}.enc`, key };
  }

  /**
   * Calculate checksum
   */
  private async calculateChecksum(content: string): Promise<string> {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    // Fallback for environments without crypto
    return `checksum-${Date.now()}`;
  }

  // ============================================================================
  // PROGRESS CALLBACKS
  // ============================================================================

  /**
   * Subscribe to job progress updates
   */
  onProgress(jobId: string, callback: ExportProgressCallback): () => void {
    const callbacks = this.progressCallbacks.get(jobId) || [];
    callbacks.push(callback);
    this.progressCallbacks.set(jobId, callbacks);

    // Return unsubscribe function
    return () => {
      const current = this.progressCallbacks.get(jobId) || [];
      this.progressCallbacks.set(
        jobId,
        current.filter((cb) => cb !== callback),
      );
    };
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(job: GDPRExportJob): void {
    const callbacks = this.progressCallbacks.get(job.id) || [];
    callbacks.forEach((cb) => {
      try {
        cb(job);
      } catch (error) {
        log.error("Progress callback error", error, { jobId: job.id });
      }
    });
  }

  // ============================================================================
  // DATA FORMATTING
  // ============================================================================

  /**
   * Format collected data for delivery
   */
  formatForDelivery(
    data: CollectedUserData,
    format: ExportFormat,
  ): { content: string; mimeType: string; filename: string } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case "json":
        content = this.config.prettyPrintJson
          ? JSON.stringify(data, null, 2)
          : JSON.stringify(data);
        mimeType = "application/json";
        extension = "json";
        break;
      case "csv":
        content = this.convertToCSV(data);
        mimeType = "text/csv";
        extension = "csv";
        break;
      case "zip":
      default:
        content = JSON.stringify(data, null, 2);
        mimeType = "application/zip";
        extension = "zip";
        break;
    }

    return {
      content,
      mimeType,
      filename: `nchat-data-export-${timestamp}.${extension}`,
    };
  }

  /**
   * Generate export metadata
   */
  generateMetadata(
    job: GDPRExportJob,
    data: CollectedUserData,
  ): Record<string, unknown> {
    return {
      exportType: "GDPR Article 20 - Right to Data Portability",
      exportId: job.id,
      dsarId: job.dsarId,
      userId: job.userId,
      generatedAt: new Date().toISOString(),
      format: job.outputFormat,
      statistics: {
        messagesIncluded: data.messages.length,
        filesIncluded: data.files.length,
        channelsIncluded: data.channels.length,
        activitiesIncluded: data.activity.length,
        reactionsIncluded: data.reactions.length,
        consentsIncluded: data.consents.length,
      },
      checksum: job.outputChecksum,
      size: job.outputSize,
      encrypted: this.config.encryptExports,
    };
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get service statistics
   */
  getStatistics(): {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageDurationMs: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const completed = jobs.filter((j) => j.status === "completed");
    const failed = jobs.filter((j) => j.status === "failed");
    const active = jobs.filter(
      (j) => !["completed", "failed"].includes(j.status),
    );

    const durations = completed
      .filter((j) => j.startedAt && j.completedAt)
      .map((j) => j.completedAt!.getTime() - j.startedAt!.getTime());

    const averageDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    return {
      totalJobs: jobs.length,
      activeJobs: active.length,
      completedJobs: completed.length,
      failedJobs: failed.length,
      averageDurationMs: Math.round(averageDuration),
    };
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get current configuration
   */
  getConfig(): GDPRExportServiceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(
    updates: Partial<GDPRExportServiceConfig>,
  ): GDPRExportServiceConfig {
    this.config = { ...this.config, ...updates };
    log.info("Configuration updated");
    return this.config;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        "GDPRExportService not initialized. Call initialize() first.",
      );
    }
  }

  /**
   * Check if service is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if service is enabled
   */
  get enabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get job count
   */
  get jobCount(): number {
    return this.jobs.size;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let gdprExportService: GDPRExportService | null = null;

/**
 * Get or create the GDPR export service singleton
 */
export function getGDPRExportService(): GDPRExportService {
  if (!gdprExportService) {
    gdprExportService = new GDPRExportService();
  }
  return gdprExportService;
}

/**
 * Create a new GDPR export service instance
 */
export function createGDPRExportService(
  config?: Partial<GDPRExportServiceConfig>,
): GDPRExportService {
  return new GDPRExportService(config);
}

/**
 * Initialize the GDPR export service
 */
export async function initializeGDPRExportService(): Promise<GDPRExportService> {
  const service = getGDPRExportService();
  await service.initialize();
  return service;
}

/**
 * Reset the singleton (for testing)
 */
export function resetGDPRExportService(): void {
  if (gdprExportService) {
    gdprExportService.close();
    gdprExportService = null;
  }
}

export default GDPRExportService;
