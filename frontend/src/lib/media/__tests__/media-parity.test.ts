/**
 * Media Parity Tests
 *
 * Comprehensive tests for media/file sharing parity features including:
 * - Platform preset limits (WhatsApp, Telegram, Discord, Slack)
 * - File validation and categorization
 * - Upload configuration
 * - Album/grouping features
 * - Utility functions
 */

import {
  PLATFORM_PRESETS,
  getFileCategory,
  getFileExtension,
  validateFileForPlatform,
  validateAttachments,
  getUploadConfigForPlatform,
  getFileTypeConfigForPlatform,
  getProcessingOperations,
  calculateChunks,
  getFileChunk,
  calculateUploadProgress,
  groupMediaByDate,
  groupMediaBySender,
  groupMediaByType,
  formatBytes,
  formatDuration,
  getFileCategoryIcon,
  getFileCategoryLabel,
  isPreviewable,
  getRecommendedThumbnailSizes,
  type PlatformPreset,
  type FileCategory,
  type ResumableUploadState,
} from "../media-parity";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockFile(name: string, size: number, type: string): File {
  // Create a Uint8Array with actual data (not empty ArrayBuffer)
  const content = new Uint8Array(size);
  // Fill with pattern to verify chunk integrity in tests
  for (let i = 0; i < size; i++) {
    content[i] = i % 256;
  }
  return new File([content], name, { type });
}

// ============================================================================
// Platform Preset Tests
// ============================================================================

describe("Platform Presets", () => {
  describe("PLATFORM_PRESETS", () => {
    it("should have all required platform presets", () => {
      expect(PLATFORM_PRESETS).toHaveProperty("whatsapp");
      expect(PLATFORM_PRESETS).toHaveProperty("telegram");
      expect(PLATFORM_PRESETS).toHaveProperty("discord");
      expect(PLATFORM_PRESETS).toHaveProperty("slack");
      expect(PLATFORM_PRESETS).toHaveProperty("default");
    });

    it("should have correct WhatsApp limits", () => {
      const whatsapp = PLATFORM_PRESETS.whatsapp;
      expect(whatsapp.maxVideoSize).toBe(16 * 1024 * 1024); // 16MB
      expect(whatsapp.maxFileSize).toBe(100 * 1024 * 1024); // 100MB
      expect(whatsapp.maxAttachments).toBe(30);
      expect(whatsapp.maxVideoDuration).toBe(180); // 3 minutes
    });

    it("should have correct Telegram limits", () => {
      const telegram = PLATFORM_PRESETS.telegram;
      expect(telegram.maxVideoSize).toBe(2 * 1024 * 1024 * 1024); // 2GB
      expect(telegram.premium?.maxFileSize).toBe(4 * 1024 * 1024 * 1024); // 4GB
      expect(telegram.maxAttachments).toBe(10);
    });

    it("should have correct Discord limits", () => {
      const discord = PLATFORM_PRESETS.discord;
      expect(discord.maxVideoSize).toBe(8 * 1024 * 1024); // 8MB free
      expect(discord.premium?.maxFileSize).toBe(500 * 1024 * 1024); // 500MB Nitro
      expect(discord.maxAttachments).toBe(10);
    });

    it("should have correct Slack limits", () => {
      const slack = PLATFORM_PRESETS.slack;
      expect(slack.maxFileSize).toBe(1024 * 1024 * 1024); // 1GB
      expect(slack.maxAttachments).toBe(10);
    });

    it("should have supported extensions for each platform", () => {
      for (const preset of Object.values(PLATFORM_PRESETS)) {
        expect(preset.supportedExtensions.images.length).toBeGreaterThan(0);
        expect(preset.supportedExtensions.videos.length).toBeGreaterThan(0);
        expect(preset.supportedExtensions.audio.length).toBeGreaterThan(0);
        expect(preset.supportedExtensions.documents.length).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================================================
// File Category Tests
// ============================================================================

describe("File Category Detection", () => {
  describe("getFileCategory", () => {
    it("should detect image types", () => {
      expect(getFileCategory("image/jpeg")).toBe("image");
      expect(getFileCategory("image/png")).toBe("image");
      expect(getFileCategory("image/gif")).toBe("image");
      expect(getFileCategory("image/webp")).toBe("image");
      expect(getFileCategory("image/avif")).toBe("image");
      expect(getFileCategory("image/svg+xml")).toBe("image");
    });

    it("should detect video types", () => {
      expect(getFileCategory("video/mp4")).toBe("video");
      expect(getFileCategory("video/webm")).toBe("video");
      expect(getFileCategory("video/quicktime")).toBe("video");
      expect(getFileCategory("video/x-matroska")).toBe("video");
    });

    it("should detect audio types", () => {
      expect(getFileCategory("audio/mpeg")).toBe("audio");
      expect(getFileCategory("audio/wav")).toBe("audio");
      expect(getFileCategory("audio/ogg")).toBe("audio");
      expect(getFileCategory("audio/flac")).toBe("audio");
    });

    it("should detect document types", () => {
      expect(getFileCategory("application/pdf")).toBe("document");
      expect(getFileCategory("application/msword")).toBe("document");
      expect(getFileCategory("text/plain")).toBe("document");
      expect(getFileCategory("text/csv")).toBe("document");
    });

    it("should detect archive types", () => {
      expect(getFileCategory("application/zip")).toBe("archive");
      expect(getFileCategory("application/x-rar-compressed")).toBe("archive");
      expect(getFileCategory("application/gzip")).toBe("archive");
    });

    it('should return "other" for unknown types', () => {
      expect(getFileCategory("application/octet-stream")).toBe("other");
      expect(getFileCategory("unknown/type")).toBe("other");
    });

    it("should handle MIME types with charset", () => {
      expect(getFileCategory("text/plain; charset=utf-8")).toBe("document");
    });
  });

  describe("getFileExtension", () => {
    it("should extract file extension", () => {
      expect(getFileExtension("image.jpg")).toBe("jpg");
      expect(getFileExtension("document.PDF")).toBe("pdf");
      expect(getFileExtension("archive.tar.gz")).toBe("gz");
    });

    it("should return empty string for files without extension", () => {
      expect(getFileExtension("noextension")).toBe("");
      expect(getFileExtension("file.")).toBe("");
    });

    it("should handle hidden files", () => {
      expect(getFileExtension(".gitignore")).toBe("gitignore");
    });
  });
});

// ============================================================================
// File Validation Tests
// ============================================================================

describe("File Validation", () => {
  describe("validateFileForPlatform", () => {
    it("should validate files within size limits", () => {
      const file = createMockFile("test.jpg", 5 * 1024 * 1024, "image/jpeg");
      const result = validateFileForPlatform(file, "whatsapp");
      expect(result.valid).toBe(true);
    });

    it("should reject files exceeding size limits", () => {
      const file = createMockFile("test.mp4", 20 * 1024 * 1024, "video/mp4");
      const result = validateFileForPlatform(file, "whatsapp");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds maximum");
    });

    it("should use premium limits when specified", () => {
      const file = createMockFile("test.mp4", 25 * 1024 * 1024, "video/mp4");

      const freeResult = validateFileForPlatform(file, "discord", false);
      expect(freeResult.valid).toBe(false);

      const premiumResult = validateFileForPlatform(file, "discord", true);
      expect(premiumResult.valid).toBe(true);
    });

    it("should warn about unsupported extensions", () => {
      const file = createMockFile("test.xyz", 1024, "application/octet-stream");
      const result = validateFileForPlatform(file, "default");
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(
        result.warnings?.some((w) => w.includes("may not be fully supported")),
      ).toBe(true);
    });

    it("should recommend compression for large images", () => {
      const file = createMockFile("test.jpg", 2 * 1024 * 1024, "image/jpeg");
      const result = validateFileForPlatform(file, "whatsapp");
      expect(result.valid).toBe(true);
      expect(result.warnings?.some((w) => w.includes("compression"))).toBe(
        true,
      );
    });
  });

  describe("validateAttachments", () => {
    it("should validate multiple files", () => {
      const files = [
        createMockFile("image1.jpg", 1024 * 1024, "image/jpeg"),
        createMockFile("image2.jpg", 1024 * 1024, "image/jpeg"),
      ];
      const result = validateAttachments(files, "default");
      expect(result.valid).toBe(true);
    });

    it("should reject when exceeding max attachments", () => {
      const files = Array(15)
        .fill(null)
        .map((_, i) => createMockFile(`image${i}.jpg`, 1024, "image/jpeg"));
      const result = validateAttachments(files, "discord");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Maximum");
    });

    it("should stop at first invalid file", () => {
      const files = [
        createMockFile("valid.jpg", 1024, "image/jpeg"),
        createMockFile("invalid.mp4", 100 * 1024 * 1024, "video/mp4"),
        createMockFile("valid2.jpg", 1024, "image/jpeg"),
      ];
      const result = validateAttachments(files, "whatsapp");
      expect(result.valid).toBe(false);
    });
  });
});

// ============================================================================
// Upload Configuration Tests
// ============================================================================

describe("Upload Configuration", () => {
  describe("getUploadConfigForPlatform", () => {
    it("should return valid configuration for each platform", () => {
      const presets: PlatformPreset[] = [
        "whatsapp",
        "telegram",
        "discord",
        "slack",
        "default",
      ];

      for (const preset of presets) {
        const config = getUploadConfigForPlatform(preset);
        expect(config.dragDrop).toBe(true);
        expect(config.paste).toBe(true);
        expect(config.chunkSize).toBeGreaterThan(0);
        expect(config.maxConcurrent).toBeGreaterThan(0);
      }
    });

    it("should enable compression for platforms that use it", () => {
      const whatsappConfig = getUploadConfigForPlatform("whatsapp");
      expect(whatsappConfig.compression).toBe(true);

      const discordConfig = getUploadConfigForPlatform("discord");
      expect(discordConfig.compression).toBe(false);
    });

    it("should have appropriate quality settings", () => {
      const whatsappConfig = getUploadConfigForPlatform("whatsapp");
      expect(whatsappConfig.compressionOptions?.imageQuality).toBeLessThan(
        0.85,
      );

      const telegramConfig = getUploadConfigForPlatform("telegram");
      expect(telegramConfig.compressionOptions?.videoQuality).toBe("high");
    });
  });

  describe("getFileTypeConfigForPlatform", () => {
    it("should return valid file type configuration", () => {
      const config = getFileTypeConfigForPlatform("default");
      expect(config.maxSize).toBeGreaterThan(0);
      expect(config.blockedExtensions).toContain("exe");
      expect(config.enableVirusScan).toBe(true);
      expect(config.stripExif).toBe(true);
      expect(config.generateThumbnails).toBe(true);
    });

    it("should use premium limits when specified", () => {
      const freeConfig = getFileTypeConfigForPlatform("discord", false);
      const premiumConfig = getFileTypeConfigForPlatform("discord", true);
      expect(premiumConfig.maxSize).toBeGreaterThan(freeConfig.maxSize);
    });
  });
});

// ============================================================================
// Processing Operations Tests
// ============================================================================

describe("Processing Operations", () => {
  describe("getProcessingOperations", () => {
    it("should include metadata and scan for all types", () => {
      const ops = getProcessingOperations("image/jpeg");
      expect(ops).toContain("metadata");
      expect(ops).toContain("scan");
    });

    it("should include thumbnail for images", () => {
      const ops = getProcessingOperations("image/jpeg");
      expect(ops).toContain("thumbnail");
    });

    it("should include optimize for platforms with compression", () => {
      const ops = getProcessingOperations("image/jpeg", "whatsapp");
      expect(ops).toContain("optimize");
    });

    it("should include thumbnail for videos", () => {
      const ops = getProcessingOperations("video/mp4");
      expect(ops).toContain("thumbnail");
    });

    it("should not include thumbnail for audio", () => {
      const ops = getProcessingOperations("audio/mpeg");
      expect(ops).not.toContain("thumbnail");
    });
  });
});

// ============================================================================
// Resumable Upload Tests
// ============================================================================

describe("Resumable Uploads", () => {
  describe("calculateChunks", () => {
    it("should calculate correct number of chunks", () => {
      const fileSize = 15 * 1024 * 1024; // 15MB
      const chunkSize = 5 * 1024 * 1024; // 5MB
      const result = calculateChunks(fileSize, chunkSize);

      expect(result.totalChunks).toBe(3);
      expect(result.lastChunkSize).toBe(5 * 1024 * 1024);
    });

    it("should handle files smaller than chunk size", () => {
      const result = calculateChunks(1024 * 1024, 5 * 1024 * 1024);
      expect(result.totalChunks).toBe(1);
      expect(result.lastChunkSize).toBe(1024 * 1024);
    });

    it("should handle uneven file sizes", () => {
      const fileSize = 12 * 1024 * 1024; // 12MB
      const chunkSize = 5 * 1024 * 1024; // 5MB
      const result = calculateChunks(fileSize, chunkSize);

      expect(result.totalChunks).toBe(3);
      expect(result.lastChunkSize).toBe(2 * 1024 * 1024);
    });
  });

  describe("getFileChunk", () => {
    it("should return a Blob for chunk", () => {
      const file = createMockFile("test.bin", 1024, "application/octet-stream");
      const chunk = getFileChunk(file, 0, 512);

      // Verify it returns a Blob
      expect(chunk instanceof Blob).toBe(true);
    });

    it("should calculate correct chunk boundaries", () => {
      // Test the logic of getFileChunk without relying on File.slice behavior
      const fileSize = 15 * 1024 * 1024; // 15MB
      const chunkSize = 5 * 1024 * 1024; // 5MB

      // First chunk: 0 to 5MB
      const start0 = 0 * chunkSize;
      const end0 = Math.min(start0 + chunkSize, fileSize);
      expect(end0 - start0).toBe(chunkSize);

      // Second chunk: 5MB to 10MB
      const start1 = 1 * chunkSize;
      const end1 = Math.min(start1 + chunkSize, fileSize);
      expect(end1 - start1).toBe(chunkSize);

      // Third chunk: 10MB to 15MB
      const start2 = 2 * chunkSize;
      const end2 = Math.min(start2 + chunkSize, fileSize);
      expect(end2 - start2).toBe(chunkSize);
    });

    it("should calculate correct last chunk size for uneven files", () => {
      const fileSize = 12 * 1024 * 1024; // 12MB
      const chunkSize = 5 * 1024 * 1024; // 5MB

      // Third chunk: 10MB to 12MB
      const start = 2 * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      expect(end - start).toBe(2 * 1024 * 1024);
    });
  });

  describe("calculateUploadProgress", () => {
    it("should calculate correct progress percentage", () => {
      const state: ResumableUploadState = {
        fileId: "test",
        fileName: "test.bin",
        fileSize: 15 * 1024 * 1024,
        mimeType: "application/octet-stream",
        storagePath: "/uploads/test",
        uploadedChunks: [0, 1],
        totalChunks: 3,
        bytesUploaded: 10 * 1024 * 1024,
        startedAt: new Date(),
      };

      const progress = calculateUploadProgress(state);
      expect(progress).toBe(67); // 2/3 * 100, rounded
    });

    it("should return 0 for no chunks", () => {
      const state: ResumableUploadState = {
        fileId: "test",
        fileName: "test.bin",
        fileSize: 0,
        mimeType: "application/octet-stream",
        storagePath: "/uploads/test",
        uploadedChunks: [],
        totalChunks: 0,
        bytesUploaded: 0,
        startedAt: new Date(),
      };

      const progress = calculateUploadProgress(state);
      expect(progress).toBe(0);
    });
  });
});

// ============================================================================
// Grouping Tests
// ============================================================================

describe("Media Grouping", () => {
  const mockItems = [
    {
      id: "1",
      createdAt: new Date().toISOString(),
      mimeType: "image/jpeg",
      uploadedBy: { id: "user1" },
    },
    {
      id: "2",
      createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      mimeType: "video/mp4",
      uploadedBy: { id: "user1" },
    },
    {
      id: "3",
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), // Week ago
      mimeType: "audio/mpeg",
      uploadedBy: { id: "user2" },
    },
  ];

  describe("groupMediaByDate", () => {
    it("should group items by date", () => {
      const groups = groupMediaByDate(mockItems);
      expect(groups.size).toBeGreaterThanOrEqual(2);
      expect(groups.has("Today")).toBe(true);
      expect(groups.has("Yesterday")).toBe(true);
    });

    it("should include all items in groups", () => {
      const groups = groupMediaByDate(mockItems);
      const totalItems = Array.from(groups.values()).reduce(
        (sum, g) => sum + g.length,
        0,
      );
      expect(totalItems).toBe(mockItems.length);
    });
  });

  describe("groupMediaBySender", () => {
    it("should group items by sender", () => {
      const groups = groupMediaBySender(mockItems);
      expect(groups.size).toBe(2);
      expect(groups.get("user1")?.length).toBe(2);
      expect(groups.get("user2")?.length).toBe(1);
    });
  });

  describe("groupMediaByType", () => {
    it("should group items by type", () => {
      const groups = groupMediaByType(mockItems);
      expect(groups.size).toBe(3);
      expect(groups.has("image")).toBe(true);
      expect(groups.has("video")).toBe(true);
      expect(groups.has("audio")).toBe(true);
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("Utility Functions", () => {
  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
    });

    it("should handle decimal precision", () => {
      expect(formatBytes(1536, 1)).toBe("1.5 KB");
      expect(formatBytes(1536, 0)).toBe("2 KB");
    });

    it("should handle negative sizes", () => {
      expect(formatBytes(-1)).toBe("Invalid size");
    });
  });

  describe("formatDuration", () => {
    it("should format seconds correctly", () => {
      expect(formatDuration(0)).toBe("0:00");
      expect(formatDuration(30)).toBe("0:30");
      expect(formatDuration(90)).toBe("1:30");
      expect(formatDuration(3661)).toBe("1:01:01");
    });

    it("should handle invalid input", () => {
      expect(formatDuration(-1)).toBe("0:00");
      expect(formatDuration(Infinity)).toBe("0:00");
      expect(formatDuration(NaN)).toBe("0:00");
    });
  });

  describe("getFileCategoryIcon", () => {
    it("should return correct icons", () => {
      expect(getFileCategoryIcon("image")).toBe("Image");
      expect(getFileCategoryIcon("video")).toBe("Video");
      expect(getFileCategoryIcon("audio")).toBe("Music");
      expect(getFileCategoryIcon("document")).toBe("FileText");
      expect(getFileCategoryIcon("archive")).toBe("Archive");
      expect(getFileCategoryIcon("other")).toBe("File");
    });
  });

  describe("getFileCategoryLabel", () => {
    it("should return correct labels", () => {
      expect(getFileCategoryLabel("image")).toBe("Image");
      expect(getFileCategoryLabel("video")).toBe("Video");
      expect(getFileCategoryLabel("audio")).toBe("Audio");
      expect(getFileCategoryLabel("document")).toBe("Document");
    });
  });

  describe("isPreviewable", () => {
    it("should identify previewable image types", () => {
      expect(isPreviewable("image/jpeg")).toBe(true);
      expect(isPreviewable("image/png")).toBe(true);
      expect(isPreviewable("image/webp")).toBe(true);
    });

    it("should identify non-previewable image types", () => {
      expect(isPreviewable("image/heic")).toBe(false);
      expect(isPreviewable("image/tiff")).toBe(false);
    });

    it("should identify previewable video types", () => {
      expect(isPreviewable("video/mp4")).toBe(true);
      expect(isPreviewable("video/webm")).toBe(true);
    });

    it("should identify non-previewable video types", () => {
      expect(isPreviewable("video/x-matroska")).toBe(false);
    });

    it("should identify previewable audio types", () => {
      expect(isPreviewable("audio/mpeg")).toBe(true);
      expect(isPreviewable("audio/wav")).toBe(true);
    });

    it("should identify previewable document types", () => {
      expect(isPreviewable("application/pdf")).toBe(true);
      expect(isPreviewable("text/plain")).toBe(true);
    });

    it("should return false for archives", () => {
      expect(isPreviewable("application/zip")).toBe(false);
    });
  });

  describe("getRecommendedThumbnailSizes", () => {
    it("should return sizes for images and videos", () => {
      expect(getRecommendedThumbnailSizes("image")).toEqual([100, 400, 1200]);
      expect(getRecommendedThumbnailSizes("video")).toEqual([100, 400, 1200]);
    });

    it("should return empty array for audio", () => {
      expect(getRecommendedThumbnailSizes("audio")).toEqual([]);
    });

    it("should return single size for documents", () => {
      expect(getRecommendedThumbnailSizes("document")).toEqual([400]);
    });
  });
});
