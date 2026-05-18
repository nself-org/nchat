/**
 * GDPR Export Service Tests
 *
 * Comprehensive test suite for GDPR data portability service.
 * Target: 30+ tests
 */

import {
  GDPRExportService,
  createGDPRExportService,
  resetGDPRExportService,
  type CreateExportJobInput,
} from "../gdpr-export.service";
import type {
  GDPRExportServiceConfig,
  CollectedUserData,
} from "../compliance.types";

describe("GDPRExportService", () => {
  let service: GDPRExportService;

  beforeEach(async () => {
    resetGDPRExportService();
    service = createGDPRExportService();
    await service.initialize();
  });

  afterEach(async () => {
    await service.close();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe("Initialization", () => {
    it("should initialize successfully", () => {
      expect(service.initialized).toBe(true);
    });

    it("should be enabled by default", () => {
      expect(service.enabled).toBe(true);
    });

    it("should have zero jobs initially", () => {
      expect(service.jobCount).toBe(0);
    });

    it("should not re-initialize if already initialized", async () => {
      const newService = createGDPRExportService();
      await newService.initialize();
      await newService.initialize(); // Second call should be no-op
      expect(newService.initialized).toBe(true);
      await newService.close();
    });

    it("should close and reset state", async () => {
      await service.close();
      expect(service.initialized).toBe(false);
    });
  });

  // ============================================================================
  // CONFIGURATION TESTS
  // ============================================================================

  describe("Configuration", () => {
    it("should use default configuration", () => {
      const config = service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.defaultFormat).toBe("zip");
      expect(config.batchSize).toBe(1000);
    });

    it("should accept custom configuration", async () => {
      const customService = createGDPRExportService({
        batchSize: 500,
        maxConcurrentJobs: 10,
      });
      await customService.initialize();

      const config = customService.getConfig();
      expect(config.batchSize).toBe(500);
      expect(config.maxConcurrentJobs).toBe(10);

      await customService.close();
    });

    it("should update configuration", () => {
      const newConfig = service.updateConfig({ batchSize: 2000 });
      expect(newConfig.batchSize).toBe(2000);
    });

    it("should validate supported formats", () => {
      const config = service.getConfig();
      expect(config.supportedFormats).toContain("json");
      expect(config.supportedFormats).toContain("csv");
      expect(config.supportedFormats).toContain("zip");
    });
  });

  // ============================================================================
  // JOB CREATION TESTS
  // ============================================================================

  describe("Job Creation", () => {
    const validInput: CreateExportJobInput = {
      dsarId: "dsar-123",
      userId: "user-123",
      categories: ["profile", "messages"],
      format: "json",
    };

    it("should create a job successfully", async () => {
      const result = await service.createJob(validInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBeDefined();
      expect(result.data!.status).toBe("queued");
      expect(result.data!.progress).toBe(0);
    });

    it("should require userId", async () => {
      const result = await service.createJob({
        ...validInput,
        userId: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("User ID");
    });

    it("should require dsarId", async () => {
      const result = await service.createJob({
        ...validInput,
        dsarId: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("DSAR ID");
    });

    it("should require at least one category", async () => {
      const result = await service.createJob({
        ...validInput,
        categories: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("category");
    });

    it("should reject unsupported formats", async () => {
      const result = await service.createJob({
        ...validInput,
        format: "pdf" as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported format");
    });

    it("should use default format if not specified", async () => {
      const result = await service.createJob({
        dsarId: "dsar-123",
        userId: "user-123",
        categories: ["profile"],
      });

      expect(result.success).toBe(true);
      expect(result.data!.outputFormat).toBe("zip");
    });

    it("should increment job count", async () => {
      expect(service.jobCount).toBe(0);

      await service.createJob(validInput);
      expect(service.jobCount).toBe(1);

      await service.createJob({ ...validInput, dsarId: "dsar-456" });
      expect(service.jobCount).toBe(2);
    });

    it("should respect max concurrent jobs limit", async () => {
      const customService = createGDPRExportService({ maxConcurrentJobs: 2 });
      await customService.initialize();

      await customService.createJob({ ...validInput, dsarId: "dsar-1" });
      await customService.createJob({ ...validInput, dsarId: "dsar-2" });
      const result = await customService.createJob({
        ...validInput,
        dsarId: "dsar-3",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Maximum concurrent");

      await customService.close();
    });

    it("should fail when service is disabled", async () => {
      service.updateConfig({ enabled: false });

      const result = await service.createJob(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("disabled");
    });
  });

  // ============================================================================
  // JOB RETRIEVAL TESTS
  // ============================================================================

  describe("Job Retrieval", () => {
    beforeEach(async () => {
      await service.createJob({
        dsarId: "dsar-1",
        userId: "user-1",
        categories: ["profile"],
      });
      await service.createJob({
        dsarId: "dsar-2",
        userId: "user-1",
        categories: ["messages"],
      });
      await service.createJob({
        dsarId: "dsar-3",
        userId: "user-2",
        categories: ["all"],
      });
    });

    it("should get job by ID", async () => {
      const result = await service.createJob({
        dsarId: "dsar-test",
        userId: "user-test",
        categories: ["profile"],
      });

      const job = service.getJob(result.data!.id);
      expect(job).not.toBeNull();
      expect(job!.dsarId).toBe("dsar-test");
    });

    it("should return null for non-existent job", () => {
      const job = service.getJob("non-existent-id");
      expect(job).toBeNull();
    });

    it("should get jobs by DSAR ID", () => {
      const jobs = service.getJobsByDSAR("dsar-1");
      expect(jobs.length).toBe(1);
      expect(jobs[0].dsarId).toBe("dsar-1");
    });

    it("should get jobs by user ID", () => {
      const jobs = service.getJobsByUser("user-1");
      expect(jobs.length).toBe(2);
    });

    it("should get active jobs", () => {
      const jobs = service.getActiveJobs();
      expect(jobs.length).toBe(3); // All 3 jobs from beforeEach are queued (active)
    });
  });

  // ============================================================================
  // JOB EXECUTION TESTS
  // ============================================================================

  describe("Job Execution", () => {
    it("should execute a job successfully", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-exec",
        userId: "user-exec",
        categories: ["profile"],
      });

      const result = await service.executeJob(createResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should track progress during execution", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-progress",
        userId: "user-progress",
        categories: ["profile", "messages"],
      });

      const progressUpdates: number[] = [];
      service.onProgress(createResult.data!.id, (job) => {
        progressUpdates.push(job.progress);
      });

      await service.executeJob(createResult.data!.id);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it("should fail for non-existent job", async () => {
      const result = await service.executeJob("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should fail for non-queued job", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-double",
        userId: "user-double",
        categories: ["profile"],
      });

      await service.executeJob(createResult.data!.id);
      const result = await service.executeJob(createResult.data!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not in queued state");
    });

    it("should update job status on completion", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-status",
        userId: "user-status",
        categories: ["profile"],
      });

      await service.executeJob(createResult.data!.id);
      const job = service.getJob(createResult.data!.id);

      expect(job!.status).toBe("completed");
      expect(job!.completedAt).toBeDefined();
    });

    it("should set start time on execution", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-time",
        userId: "user-time",
        categories: ["profile"],
      });

      await service.executeJob(createResult.data!.id);
      const job = service.getJob(createResult.data!.id);

      expect(job!.startedAt).toBeDefined();
    });
  });

  // ============================================================================
  // JOB CANCELLATION TESTS
  // ============================================================================

  describe("Job Cancellation", () => {
    it("should cancel a queued job", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-cancel",
        userId: "user-cancel",
        categories: ["profile"],
      });

      const result = await service.cancelJob(createResult.data!.id);

      expect(result.success).toBe(true);
    });

    it("should update job status on cancellation", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-cancel2",
        userId: "user-cancel2",
        categories: ["profile"],
      });

      await service.cancelJob(createResult.data!.id);
      const job = service.getJob(createResult.data!.id);

      expect(job!.status).toBe("failed");
      expect(job!.errorMessage).toContain("cancelled");
    });

    it("should fail to cancel completed job", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-completed",
        userId: "user-completed",
        categories: ["profile"],
      });

      await service.executeJob(createResult.data!.id);
      const result = await service.cancelJob(createResult.data!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot cancel");
    });

    it("should fail to cancel non-existent job", async () => {
      const result = await service.cancelJob("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  // ============================================================================
  // DATA COLLECTOR TESTS
  // ============================================================================

  describe("Data Collectors", () => {
    it("should register custom collectors", async () => {
      const customMessages = [
        {
          id: "msg-1",
          channelId: "ch-1",
          channelName: "general",
          content: "Hello",
          contentType: "text" as const,
          createdAt: new Date(),
          isEdited: false,
          isDeleted: false,
        },
      ];

      service.registerCollector("messages", async () => customMessages);

      const createResult = await service.createJob({
        dsarId: "dsar-custom",
        userId: "user-custom",
        categories: ["messages"],
      });

      const result = await service.executeJob(createResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data!.messages).toEqual(customMessages);
    });

    it("should collect profile data", async () => {
      const customProfile = {
        id: "user-profile",
        email: "test@example.com",
        displayName: "Test User",
        createdAt: new Date(),
      };

      service.registerCollector("profile", async () => customProfile);

      const createResult = await service.createJob({
        dsarId: "dsar-profile",
        userId: "user-profile",
        categories: ["profile"],
      });

      const result = await service.executeJob(createResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data!.profile.email).toBe("test@example.com");
    });
  });

  // ============================================================================
  // DATA FORMATTING TESTS
  // ============================================================================

  describe("Data Formatting", () => {
    const testData: CollectedUserData = {
      profile: {
        id: "user-1",
        email: "test@example.com",
        displayName: "Test User",
        createdAt: new Date("2024-01-01"),
      },
      messages: [
        {
          id: "msg-1",
          channelId: "ch-1",
          channelName: "general",
          content: "Hello, world!",
          contentType: "text",
          createdAt: new Date("2024-01-02"),
          isEdited: false,
          isDeleted: false,
        },
      ],
      files: [],
      channels: [],
      activity: [],
      reactions: [],
      settings: {},
      consents: [],
    };

    it("should format data as JSON", () => {
      const result = service.formatForDelivery(testData, "json");

      expect(result.mimeType).toBe("application/json");
      expect(result.filename).toContain(".json");

      const parsed = JSON.parse(result.content);
      expect(parsed.profile.email).toBe("test@example.com");
    });

    it("should format data as CSV", () => {
      const result = service.formatForDelivery(testData, "csv");

      expect(result.mimeType).toBe("text/csv");
      expect(result.filename).toContain(".csv");
      expect(result.content).toContain("PROFILE");
      expect(result.content).toContain("MESSAGES");
    });

    it("should format data as ZIP (JSON content)", () => {
      const result = service.formatForDelivery(testData, "zip");

      expect(result.mimeType).toBe("application/zip");
      expect(result.filename).toContain(".zip");
    });

    it("should include timestamp in filename", () => {
      const result = service.formatForDelivery(testData, "json");
      expect(result.filename).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  // ============================================================================
  // METADATA GENERATION TESTS
  // ============================================================================

  describe("Metadata Generation", () => {
    it("should generate export metadata", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-meta",
        userId: "user-meta",
        categories: ["profile"],
      });

      const job = service.getJob(createResult.data!.id)!;
      const testData: CollectedUserData = {
        profile: {
          id: "user-meta",
          email: "meta@example.com",
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

      const metadata = service.generateMetadata(job, testData);

      expect(metadata.exportType).toContain("GDPR");
      expect(metadata.exportId).toBe(job.id);
      expect(metadata.userId).toBe("user-meta");
      expect(metadata.statistics).toBeDefined();
    });
  });

  // ============================================================================
  // STATISTICS TESTS
  // ============================================================================

  describe("Statistics", () => {
    it("should track job statistics", async () => {
      await service.createJob({
        dsarId: "dsar-stat1",
        userId: "user-stat",
        categories: ["profile"],
      });

      const stats = service.getStatistics();

      expect(stats.totalJobs).toBe(1);
      expect(stats.activeJobs).toBe(1);
      expect(stats.completedJobs).toBe(0);
    });

    it("should update stats after completion", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-stat2",
        userId: "user-stat2",
        categories: ["profile"],
      });

      await service.executeJob(createResult.data!.id);
      const stats = service.getStatistics();

      expect(stats.completedJobs).toBe(1);
      expect(stats.activeJobs).toBe(0);
    });

    it("should calculate average duration", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-duration",
        userId: "user-duration",
        categories: ["profile"],
      });

      await service.executeJob(createResult.data!.id);
      const stats = service.getStatistics();

      expect(stats.averageDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe("Error Handling", () => {
    it("should throw when not initialized", async () => {
      const uninitializedService = createGDPRExportService();

      await expect(
        uninitializedService.createJob({
          dsarId: "dsar-err",
          userId: "user-err",
          categories: ["profile"],
        }),
      ).rejects.toThrow("not initialized");
    });

    it("should handle collector errors gracefully", async () => {
      service.registerCollector("messages", async () => {
        throw new Error("Database connection failed");
      });

      const createResult = await service.createJob({
        dsarId: "dsar-error",
        userId: "user-error",
        categories: ["messages"],
      });

      const result = await service.executeJob(createResult.data!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database connection failed");

      const job = service.getJob(createResult.data!.id);
      expect(job!.status).toBe("failed");
    });
  });

  // ============================================================================
  // PROGRESS CALLBACK TESTS
  // ============================================================================

  describe("Progress Callbacks", () => {
    it("should subscribe to progress updates", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-cb",
        userId: "user-cb",
        categories: ["profile"],
      });

      let callCount = 0;
      const unsubscribe = service.onProgress(createResult.data!.id, () => {
        callCount++;
      });

      await service.executeJob(createResult.data!.id);

      expect(callCount).toBeGreaterThan(0);
      unsubscribe();
    });

    it("should unsubscribe from progress updates", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-unsub",
        userId: "user-unsub",
        categories: ["profile"],
      });

      let callCount = 0;
      const unsubscribe = service.onProgress(createResult.data!.id, () => {
        callCount++;
      });

      unsubscribe();
      await service.executeJob(createResult.data!.id);

      expect(callCount).toBe(0);
    });
  });
});
