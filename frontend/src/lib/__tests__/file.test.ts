/**
 * @fileoverview Tests for File Utilities
 */

import {
  formatFileSize,
  parseFileSize,
  getFileCategory,
  isImage,
  isVideo,
  isAudio,
  isDocument,
  isArchive,
  isPreviewable,
  getFileIcon,
  getFileIconByExtension,
  getFileExtension,
  getFileBaseName,
  sanitizeFileName,
  generateUniqueFileName,
  isFileSizeAllowed,
  isFileTypeAllowed,
  validateFile,
  type FileCategory,
} from "../file";

describe("File Size Formatting", () => {
  describe("formatFileSize", () => {
    it("should format bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format kilobytes", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("should format megabytes", () => {
      expect(formatFileSize(1048576)).toBe("1 MB");
    });

    it("should format gigabytes", () => {
      expect(formatFileSize(1073741824)).toBe("1 GB");
    });

    it("should handle zero bytes", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("should handle negative bytes", () => {
      expect(formatFileSize(-100)).toBe("Invalid size");
    });

    it("should respect decimal places", () => {
      expect(formatFileSize(1536, 0)).toBe("2 KB");
      expect(formatFileSize(1536, 1)).toBe("1.5 KB");
      expect(formatFileSize(1536, 3)).toBe("1.5 KB");
    });
  });

  describe("parseFileSize", () => {
    it("should parse bytes", () => {
      expect(parseFileSize("500 B")).toBe(500);
    });

    it("should parse kilobytes", () => {
      expect(parseFileSize("1 KB")).toBe(1024);
      expect(parseFileSize("1.5 KB")).toBe(1536);
    });

    it("should parse megabytes", () => {
      expect(parseFileSize("1 MB")).toBe(1048576);
    });

    it("should parse case-insensitively", () => {
      expect(parseFileSize("1 kb")).toBe(1024);
      expect(parseFileSize("1 Kb")).toBe(1024);
    });

    it("should return NaN for invalid input", () => {
      expect(parseFileSize("invalid")).toBeNaN();
      expect(parseFileSize("1 XB")).toBeNaN();
      expect(parseFileSize("")).toBeNaN();
    });
  });
});

describe("File Category Detection", () => {
  describe("getFileCategory", () => {
    it("should detect images", () => {
      expect(getFileCategory("image/jpeg")).toBe("image");
      expect(getFileCategory("image/png")).toBe("image");
      expect(getFileCategory("image/gif")).toBe("image");
      expect(getFileCategory("image/webp")).toBe("image");
    });

    it("should detect videos", () => {
      expect(getFileCategory("video/mp4")).toBe("video");
      expect(getFileCategory("video/webm")).toBe("video");
      expect(getFileCategory("video/quicktime")).toBe("video");
    });

    it("should detect audio", () => {
      expect(getFileCategory("audio/mpeg")).toBe("audio");
      expect(getFileCategory("audio/wav")).toBe("audio");
      expect(getFileCategory("audio/ogg")).toBe("audio");
    });

    it("should detect documents", () => {
      expect(getFileCategory("application/pdf")).toBe("document");
      expect(getFileCategory("text/plain")).toBe("document");
      expect(getFileCategory("application/msword")).toBe("document");
    });

    it("should detect archives", () => {
      expect(getFileCategory("application/zip")).toBe("archive");
      expect(getFileCategory("application/x-rar-compressed")).toBe("archive");
    });

    it("should detect code files", () => {
      expect(getFileCategory("text/javascript")).toBe("code");
      expect(getFileCategory("application/json")).toBe("code");
      expect(getFileCategory("text/html")).toBe("code");
    });

    it("should return other for unknown types", () => {
      expect(getFileCategory("application/octet-stream")).toBe("other");
      expect(getFileCategory("unknown/type")).toBe("other");
    });

    it("should handle MIME type with parameters", () => {
      expect(getFileCategory("image/jpeg; charset=utf-8")).toBe("image");
    });
  });

  describe("Type check functions", () => {
    it("isImage should work correctly", () => {
      expect(isImage("image/jpeg")).toBe(true);
      expect(isImage("video/mp4")).toBe(false);
    });

    it("isVideo should work correctly", () => {
      expect(isVideo("video/mp4")).toBe(true);
      expect(isVideo("image/jpeg")).toBe(false);
    });

    it("isAudio should work correctly", () => {
      expect(isAudio("audio/mpeg")).toBe(true);
      expect(isAudio("video/mp4")).toBe(false);
    });

    it("isDocument should work correctly", () => {
      expect(isDocument("application/pdf")).toBe(true);
      expect(isDocument("image/jpeg")).toBe(false);
    });

    it("isArchive should work correctly", () => {
      expect(isArchive("application/zip")).toBe(true);
      expect(isArchive("application/pdf")).toBe(false);
    });

    it("isPreviewable should work correctly", () => {
      expect(isPreviewable("image/jpeg")).toBe(true);
      expect(isPreviewable("video/mp4")).toBe(true);
      expect(isPreviewable("audio/mpeg")).toBe(true);
      expect(isPreviewable("application/pdf")).toBe(true);
      expect(isPreviewable("application/zip")).toBe(false);
    });
  });
});

describe("File Icons", () => {
  describe("getFileIcon", () => {
    it("should return correct icon for images", () => {
      expect(getFileIcon("image/jpeg")).toBe("image");
    });

    it("should return correct icon for videos", () => {
      expect(getFileIcon("video/mp4")).toBe("video");
    });

    it("should return correct icon for audio", () => {
      expect(getFileIcon("audio/mpeg")).toBe("music");
    });

    it("should return correct icon for documents", () => {
      expect(getFileIcon("application/pdf")).toBe("file-text");
    });

    it("should return default icon for unknown types", () => {
      expect(getFileIcon("application/octet-stream")).toBe("file");
    });
  });

  describe("getFileIconByExtension", () => {
    it("should return correct icon for images", () => {
      expect(getFileIconByExtension("photo.jpg")).toBe("image");
      expect(getFileIconByExtension("photo.png")).toBe("image");
    });

    it("should return correct icon for videos", () => {
      expect(getFileIconByExtension("video.mp4")).toBe("video");
    });

    it("should return correct icon for code", () => {
      expect(getFileIconByExtension("app.js")).toBe("code");
      expect(getFileIconByExtension("app.ts")).toBe("code");
    });

    it("should return default icon for unknown extensions", () => {
      expect(getFileIconByExtension("file.xyz")).toBe("file");
    });
  });
});

describe("File Name Utilities", () => {
  describe("getFileExtension", () => {
    it("should extract extension", () => {
      expect(getFileExtension("file.txt")).toBe("txt");
      expect(getFileExtension("file.tar.gz")).toBe("gz");
    });

    it("should return empty for no extension", () => {
      expect(getFileExtension("file")).toBe("");
      expect(getFileExtension("file.")).toBe("");
    });

    it("should handle hidden files", () => {
      expect(getFileExtension(".gitignore")).toBe("gitignore");
    });
  });

  describe("getFileBaseName", () => {
    it("should extract base name", () => {
      expect(getFileBaseName("file.txt")).toBe("file");
      expect(getFileBaseName("path/to/file.txt")).toBe("path/to/file");
    });

    it("should return full name for no extension", () => {
      expect(getFileBaseName("file")).toBe("file");
    });
  });

  describe("sanitizeFileName", () => {
    it("should remove unsafe characters", () => {
      expect(sanitizeFileName('file<>:"|?*.txt')).toBe("file_______.txt");
    });

    it("should handle empty base name", () => {
      expect(sanitizeFileName("...")).toBe("file");
    });

    it("should truncate long names", () => {
      const longName = "a".repeat(300) + ".txt";
      const result = sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it("should preserve extension", () => {
      expect(sanitizeFileName("file.txt")).toBe("file.txt");
    });
  });

  describe("generateUniqueFileName", () => {
    it("should return original if unique", () => {
      expect(generateUniqueFileName("file.txt", [])).toBe("file.txt");
    });

    it("should add number for duplicates", () => {
      expect(generateUniqueFileName("file.txt", ["file.txt"])).toBe(
        "file (1).txt",
      );
    });

    it("should increment for multiple duplicates", () => {
      expect(
        generateUniqueFileName("file.txt", ["file.txt", "file (1).txt"]),
      ).toBe("file (2).txt");
    });

    it("should be case-insensitive", () => {
      expect(generateUniqueFileName("File.txt", ["file.txt"])).toBe(
        "File (1).txt",
      );
    });
  });
});

describe("File Validation", () => {
  describe("isFileSizeAllowed", () => {
    it("should allow files within limit", () => {
      expect(isFileSizeAllowed(1000, 2000)).toBe(true);
    });

    it("should reject files over limit", () => {
      expect(isFileSizeAllowed(3000, 2000)).toBe(false);
    });

    it("should reject zero-size files", () => {
      expect(isFileSizeAllowed(0, 2000)).toBe(false);
    });

    it("should allow files at exact limit", () => {
      expect(isFileSizeAllowed(2000, 2000)).toBe(true);
    });
  });

  describe("isFileTypeAllowed", () => {
    it("should allow exact match", () => {
      expect(isFileTypeAllowed("image/jpeg", ["image/jpeg", "image/png"])).toBe(
        true,
      );
    });

    it("should reject non-matching types", () => {
      expect(isFileTypeAllowed("video/mp4", ["image/jpeg", "image/png"])).toBe(
        false,
      );
    });

    it("should support wildcard patterns", () => {
      expect(isFileTypeAllowed("image/jpeg", ["image/*"])).toBe(true);
      expect(isFileTypeAllowed("video/mp4", ["image/*"])).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(isFileTypeAllowed("IMAGE/JPEG", ["image/jpeg"])).toBe(true);
    });
  });

  describe("validateFile", () => {
    const createMockFile = (name: string, size: number, type: string): File => {
      return {
        name,
        size,
        type,
        lastModified: Date.now(),
        webkitRelativePath: "",
        arrayBuffer: jest.fn(),
        bytes: jest.fn(),
        slice: jest.fn(),
        stream: jest.fn(),
        text: jest.fn(),
      } as unknown as File;
    };

    it("should validate valid file", () => {
      const file = createMockFile("test.jpg", 1000, "image/jpeg");
      const result = validateFile(file, {
        maxSize: 2000,
        allowedTypes: ["image/*"],
      });
      expect(result.valid).toBe(true);
    });

    it("should reject file too large", () => {
      const file = createMockFile("test.jpg", 3000, "image/jpeg");
      const result = validateFile(file, { maxSize: 2000 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too large");
    });

    it("should reject invalid type", () => {
      const file = createMockFile("test.exe", 1000, "application/x-msdownload");
      const result = validateFile(file, { allowedTypes: ["image/*"] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("should reject long file names", () => {
      const longName = "a".repeat(300) + ".txt";
      const file = createMockFile(longName, 1000, "text/plain");
      const result = validateFile(file, { maxNameLength: 255 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too long");
    });
  });
});
