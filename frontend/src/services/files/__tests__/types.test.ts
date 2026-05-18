/**
 * File Service Types Tests
 */

import {
  validateFile,
  getFileCategory,
  formatBytes,
  getDefaultOperations,
  DEFAULT_FILE_CONFIG,
} from "../types";
import type { FileTypeConfig } from "../types";

describe("File Service Types", () => {
  describe("validateFile", () => {
    const createMockFile = (name: string, size: number, type: string): File => {
      // Create content of specified size (use ArrayBuffer for accurate size)
      const content = new ArrayBuffer(size);
      const blob = new Blob([content], { type });
      return new File([blob], name, { type });
    };

    it("should validate a valid file", () => {
      const file = createMockFile("test.jpg", 1024, "image/jpeg");
      const result = validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject files exceeding max size", () => {
      const config: FileTypeConfig = {
        ...DEFAULT_FILE_CONFIG,
        maxSize: 1024, // 1KB
      };

      const file = createMockFile("large.jpg", 2048, "image/jpeg");
      const result = validateFile(file, config);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("too large");
    });

    it("should reject blocked MIME types", () => {
      const file = createMockFile(
        "malware.exe",
        1024,
        "application/x-executable",
      );
      const result = validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("should reject blocked extensions", () => {
      const file = createMockFile("script.bat", 1024, "text/plain");
      const result = validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain(".bat");
    });

    it("should accept only allowed MIME types when specified", () => {
      const config: FileTypeConfig = {
        ...DEFAULT_FILE_CONFIG,
        allowedMimeTypes: ["image/jpeg", "image/png"],
      };

      const jpgFile = createMockFile("test.jpg", 1024, "image/jpeg");
      const pdfFile = createMockFile("test.pdf", 1024, "application/pdf");

      expect(validateFile(jpgFile, config).valid).toBe(true);
      expect(validateFile(pdfFile, config).valid).toBe(false);
    });

    it("should support wildcard MIME types", () => {
      const config: FileTypeConfig = {
        ...DEFAULT_FILE_CONFIG,
        allowedMimeTypes: ["image/*"],
      };

      const jpgFile = createMockFile("test.jpg", 1024, "image/jpeg");
      const pngFile = createMockFile("test.png", 1024, "image/png");
      const pdfFile = createMockFile("test.pdf", 1024, "application/pdf");

      expect(validateFile(jpgFile, config).valid).toBe(true);
      expect(validateFile(pngFile, config).valid).toBe(true);
      expect(validateFile(pdfFile, config).valid).toBe(false);
    });
  });

  describe("getFileCategory", () => {
    it("should categorize image files", () => {
      expect(getFileCategory("image/jpeg")).toBe("image");
      expect(getFileCategory("image/png")).toBe("image");
      expect(getFileCategory("image/gif")).toBe("image");
      expect(getFileCategory("image/webp")).toBe("image");
    });

    it("should categorize video files", () => {
      expect(getFileCategory("video/mp4")).toBe("video");
      expect(getFileCategory("video/webm")).toBe("video");
      expect(getFileCategory("video/quicktime")).toBe("video");
    });

    it("should categorize audio files", () => {
      expect(getFileCategory("audio/mpeg")).toBe("audio");
      expect(getFileCategory("audio/wav")).toBe("audio");
      expect(getFileCategory("audio/ogg")).toBe("audio");
    });

    it("should categorize document files", () => {
      expect(getFileCategory("application/pdf")).toBe("document");
      expect(getFileCategory("application/msword")).toBe("document");
      expect(
        getFileCategory(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ).toBe("document");
    });

    it("should categorize archive files", () => {
      expect(getFileCategory("application/zip")).toBe("archive");
      expect(getFileCategory("application/x-rar-compressed")).toBe("archive");
      expect(getFileCategory("application/gzip")).toBe("archive");
    });

    it("should categorize code files", () => {
      expect(getFileCategory("text/javascript")).toBe("code");
      expect(getFileCategory("application/json")).toBe("code");
      expect(getFileCategory("text/html")).toBe("code");
    });

    it("should return other for unknown types", () => {
      expect(getFileCategory("application/octet-stream")).toBe("other");
      expect(getFileCategory("unknown/type")).toBe("other");
    });
  });

  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(1)).toBe("1 B");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
    });

    it("should respect decimal places", () => {
      expect(formatBytes(1536, 0)).toBe("2 KB");
      expect(formatBytes(1536, 1)).toBe("1.5 KB");
      expect(formatBytes(1536, 2)).toBe("1.5 KB");
    });

    it("should handle large numbers", () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1 TB");
    });
  });

  describe("getDefaultOperations", () => {
    it("should return metadata for all files", () => {
      const ops = getDefaultOperations("application/pdf");
      expect(ops).toContain("metadata");
    });

    it("should include thumbnail for images", () => {
      const config = { ...DEFAULT_FILE_CONFIG, generateThumbnails: true };
      const ops = getDefaultOperations("image/jpeg", config);

      expect(ops).toContain("thumbnail");
      expect(ops).toContain("metadata");
    });

    it("should include optimize for images", () => {
      const config = { ...DEFAULT_FILE_CONFIG, enableOptimization: true };
      const ops = getDefaultOperations("image/jpeg", config);

      expect(ops).toContain("optimize");
    });

    it("should include thumbnail for videos", () => {
      const config = { ...DEFAULT_FILE_CONFIG, generateThumbnails: true };
      const ops = getDefaultOperations("video/mp4", config);

      expect(ops).toContain("thumbnail");
    });

    it("should include scan when virus scanning is enabled", () => {
      const config = { ...DEFAULT_FILE_CONFIG, enableVirusScan: true };
      const ops = getDefaultOperations("application/pdf", config);

      expect(ops).toContain("scan");
    });

    it("should not include scan when virus scanning is disabled", () => {
      const config = { ...DEFAULT_FILE_CONFIG, enableVirusScan: false };
      const ops = getDefaultOperations("application/pdf", config);

      expect(ops).not.toContain("scan");
    });
  });
});
