/**
 * Tests for File Utilities
 *
 * Tests for file type detection, formatting, validation, and other file utilities.
 */

import {
  getFileTypeFromMime,
  getFileTypeFromExtension,
  getFileType,
  getFileExtension,
  getFileBaseName,
  truncateFileName,
  sanitizeFileName,
  formatFileSize,
  parseFileSize,
  getFileIcon,
  getFileTypeIcon,
  getFileTypeColor,
  validateFile,
  validateFiles,
  formatDuration,
  getMimeTypeFromExtension,
  isPreviewable,
  isImage,
  isVideo,
  isAudio,
  isDocument,
  FILE_ICONS,
  FILE_TYPE_LABELS,
  PREVIEWABLE_TYPES,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
} from "../file-utils";

// Helper to create mock File objects
function createMockFile(name: string, type: string, size: number = 1024): File {
  // Create content of the specified size
  const content = new Uint8Array(size);
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

describe("File Type Detection", () => {
  describe("getFileTypeFromMime", () => {
    it("should detect image types", () => {
      expect(getFileTypeFromMime("image/jpeg")).toBe("image");
      expect(getFileTypeFromMime("image/png")).toBe("image");
      expect(getFileTypeFromMime("image/gif")).toBe("image");
      expect(getFileTypeFromMime("image/webp")).toBe("image");
      expect(getFileTypeFromMime("image/svg+xml")).toBe("image");
    });

    it("should detect video types", () => {
      expect(getFileTypeFromMime("video/mp4")).toBe("video");
      expect(getFileTypeFromMime("video/webm")).toBe("video");
      expect(getFileTypeFromMime("video/quicktime")).toBe("video");
    });

    it("should detect audio types", () => {
      expect(getFileTypeFromMime("audio/mpeg")).toBe("audio");
      expect(getFileTypeFromMime("audio/wav")).toBe("audio");
      expect(getFileTypeFromMime("audio/ogg")).toBe("audio");
    });

    it("should detect archive types", () => {
      expect(getFileTypeFromMime("application/zip")).toBe("archive");
      expect(getFileTypeFromMime("application/x-rar-compressed")).toBe(
        "archive",
      );
      expect(getFileTypeFromMime("application/x-7z-compressed")).toBe(
        "archive",
      );
      expect(getFileTypeFromMime("application/gzip")).toBe("archive");
      expect(getFileTypeFromMime("application/x-tar")).toBe("archive");
    });

    it("should detect document types", () => {
      expect(getFileTypeFromMime("application/pdf")).toBe("document");
      expect(getFileTypeFromMime("application/msword")).toBe("document");
      expect(
        getFileTypeFromMime(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ).toBe("document");
      expect(getFileTypeFromMime("application/vnd.ms-excel")).toBe("document");
      expect(getFileTypeFromMime("application/vnd.ms-powerpoint")).toBe(
        "document",
      );
      expect(getFileTypeFromMime("text/plain")).toBe("document");
      expect(getFileTypeFromMime("text/html")).toBe("document");
    });

    it("should return other for unknown types", () => {
      expect(getFileTypeFromMime("application/octet-stream")).toBe("other");
      expect(getFileTypeFromMime("unknown/type")).toBe("other");
      expect(getFileTypeFromMime("")).toBe("other");
    });
  });

  describe("getFileTypeFromExtension", () => {
    it("should detect image extensions", () => {
      expect(getFileTypeFromExtension("jpg")).toBe("image");
      expect(getFileTypeFromExtension("jpeg")).toBe("image");
      expect(getFileTypeFromExtension("png")).toBe("image");
      expect(getFileTypeFromExtension("gif")).toBe("image");
      expect(getFileTypeFromExtension(".webp")).toBe("image");
    });

    it("should detect video extensions", () => {
      expect(getFileTypeFromExtension("mp4")).toBe("video");
      expect(getFileTypeFromExtension("webm")).toBe("video");
      expect(getFileTypeFromExtension("mov")).toBe("video");
    });

    it("should detect audio extensions", () => {
      expect(getFileTypeFromExtension("mp3")).toBe("audio");
      expect(getFileTypeFromExtension("wav")).toBe("audio");
      expect(getFileTypeFromExtension("ogg")).toBe("audio");
    });

    it("should detect document extensions", () => {
      expect(getFileTypeFromExtension("pdf")).toBe("document");
      expect(getFileTypeFromExtension("doc")).toBe("document");
      expect(getFileTypeFromExtension("docx")).toBe("document");
      expect(getFileTypeFromExtension("xls")).toBe("document");
      expect(getFileTypeFromExtension("xlsx")).toBe("document");
      expect(getFileTypeFromExtension("ppt")).toBe("document");
    });

    it("should detect archive extensions", () => {
      expect(getFileTypeFromExtension("zip")).toBe("archive");
      expect(getFileTypeFromExtension("rar")).toBe("archive");
      expect(getFileTypeFromExtension("7z")).toBe("archive");
    });

    it("should be case insensitive", () => {
      expect(getFileTypeFromExtension("JPG")).toBe("image");
      expect(getFileTypeFromExtension("PNG")).toBe("image");
      expect(getFileTypeFromExtension("MP4")).toBe("video");
    });

    it("should return other for unknown extensions", () => {
      expect(getFileTypeFromExtension("xyz")).toBe("other");
      expect(getFileTypeFromExtension("")).toBe("other");
    });
  });

  describe("getFileType", () => {
    it("should prefer MIME type when available", () => {
      const file = createMockFile("test.txt", "image/jpeg");
      expect(getFileType(file)).toBe("image");
    });

    it("should fall back to extension when MIME type is other", () => {
      const file = createMockFile("test.jpg", "application/octet-stream");
      expect(getFileType(file)).toBe("image");
    });

    it("should handle files with no MIME type", () => {
      const blob = new Blob(["test"]);
      const file = new File([blob], "test.mp4");
      expect(getFileType(file)).toBe("video");
    });
  });
});

describe("File Extension & Name Utilities", () => {
  describe("getFileExtension", () => {
    it("should extract file extension", () => {
      expect(getFileExtension("document.pdf")).toBe("pdf");
      expect(getFileExtension("image.PNG")).toBe("png");
      expect(getFileExtension("archive.tar.gz")).toBe("gz");
    });

    it("should return empty string for files without extension", () => {
      expect(getFileExtension("README")).toBe("");
      expect(getFileExtension("Makefile")).toBe("");
    });

    it("should handle edge cases", () => {
      expect(getFileExtension(".gitignore")).toBe("gitignore");
      expect(getFileExtension("file.")).toBe("");
    });
  });

  describe("getFileBaseName", () => {
    it("should return filename without extension", () => {
      expect(getFileBaseName("document.pdf")).toBe("document");
      expect(getFileBaseName("my-file.test.js")).toBe("my-file.test");
    });

    it("should return full name for files without extension", () => {
      expect(getFileBaseName("README")).toBe("README");
    });

    it("should handle dotfiles", () => {
      expect(getFileBaseName(".gitignore")).toBe(".gitignore");
    });
  });

  describe("truncateFileName", () => {
    it("should not truncate short filenames", () => {
      expect(truncateFileName("short.txt", 30)).toBe("short.txt");
    });

    it("should truncate long filenames preserving extension", () => {
      const result = truncateFileName("this-is-a-very-long-filename.pdf", 20);
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toContain("...");
      expect(result).toContain(".pdf");
    });

    it("should handle very long extensions", () => {
      const result = truncateFileName("file.verylongextension", 15);
      expect(result).toContain("...");
    });

    it("should use default max length of 30", () => {
      const longName = "a".repeat(40) + ".txt";
      const result = truncateFileName(longName);
      expect(result.length).toBeLessThanOrEqual(30);
    });
  });

  describe("sanitizeFileName", () => {
    it("should replace special characters with underscores", () => {
      expect(sanitizeFileName("file name.txt")).toBe("file_name.txt");
      expect(sanitizeFileName("file@#$%.txt")).toBe("file_.txt");
    });

    it("should collapse multiple underscores", () => {
      expect(sanitizeFileName("file   name.txt")).toBe("file_name.txt");
      expect(sanitizeFileName("file___name.txt")).toBe("file_name.txt");
    });

    it("should remove leading/trailing underscores", () => {
      expect(sanitizeFileName("_file_")).toBe("file");
    });

    it("should preserve allowed characters", () => {
      expect(sanitizeFileName("file-name_123.txt")).toBe("file-name_123.txt");
    });
  });
});

describe("File Size Formatting", () => {
  describe("formatFileSize", () => {
    it("should format bytes", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(100)).toBe("100 B");
      expect(formatFileSize(1023)).toBe("1023 B");
    });

    it("should format kilobytes", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(10240)).toBe("10 KB");
    });

    it("should format megabytes", () => {
      expect(formatFileSize(1048576)).toBe("1 MB");
      expect(formatFileSize(5242880)).toBe("5 MB");
    });

    it("should format gigabytes", () => {
      expect(formatFileSize(1073741824)).toBe("1 GB");
    });

    it("should format terabytes", () => {
      expect(formatFileSize(1099511627776)).toBe("1 TB");
    });
  });

  describe("parseFileSize", () => {
    it("should parse bytes", () => {
      expect(parseFileSize("100B")).toBe(100);
      expect(parseFileSize("100 B")).toBe(100);
    });

    it("should parse kilobytes", () => {
      expect(parseFileSize("1KB")).toBe(1024);
      expect(parseFileSize("1.5 KB")).toBe(1536);
    });

    it("should parse megabytes", () => {
      expect(parseFileSize("1MB")).toBe(1048576);
      expect(parseFileSize("10 MB")).toBe(10485760);
    });

    it("should parse gigabytes", () => {
      expect(parseFileSize("1GB")).toBe(1073741824);
    });

    it("should be case insensitive", () => {
      expect(parseFileSize("1kb")).toBe(1024);
      expect(parseFileSize("1Kb")).toBe(1024);
    });

    it("should default to bytes without unit", () => {
      expect(parseFileSize("100")).toBe(100);
    });

    it("should return 0 for invalid input", () => {
      expect(parseFileSize("invalid")).toBe(0);
      expect(parseFileSize("")).toBe(0);
    });
  });
});

describe("File Icon Utilities", () => {
  describe("getFileIcon", () => {
    it("should return correct icons for known MIME types", () => {
      expect(getFileIcon("image/jpeg")).toBe("image");
      expect(getFileIcon("video/mp4")).toBe("video");
      expect(getFileIcon("audio/mpeg")).toBe("music");
      expect(getFileIcon("application/pdf")).toBe("file-text");
      expect(getFileIcon("application/zip")).toBe("archive");
    });

    it("should return default icon for unknown types", () => {
      expect(getFileIcon("unknown/type")).toBe("file");
    });
  });

  describe("getFileTypeIcon", () => {
    it("should return correct icons for file types", () => {
      expect(getFileTypeIcon("image")).toBe("image");
      expect(getFileTypeIcon("video")).toBe("video");
      expect(getFileTypeIcon("audio")).toBe("music");
      expect(getFileTypeIcon("document")).toBe("file-text");
      expect(getFileTypeIcon("archive")).toBe("archive");
      expect(getFileTypeIcon("other")).toBe("file");
    });
  });

  describe("getFileTypeColor", () => {
    it("should return correct colors for file types", () => {
      expect(getFileTypeColor("image")).toBe("text-blue-500");
      expect(getFileTypeColor("video")).toBe("text-purple-500");
      expect(getFileTypeColor("audio")).toBe("text-green-500");
      expect(getFileTypeColor("document")).toBe("text-orange-500");
      expect(getFileTypeColor("archive")).toBe("text-yellow-500");
      expect(getFileTypeColor("other")).toBe("text-gray-500");
    });
  });
});

describe("File Validation", () => {
  describe("validateFile", () => {
    it("should validate file size against maximum", () => {
      const smallFile = createMockFile("small.txt", "text/plain", 100);
      const largeFile = createMockFile("large.txt", "text/plain", 10000);

      expect(validateFile(smallFile, { maxSize: 1000 }).valid).toBe(true);
      expect(validateFile(largeFile, { maxSize: 1000 }).valid).toBe(false);
      expect(validateFile(largeFile, { maxSize: 1000 }).error).toContain(
        "too large",
      );
    });

    it("should validate file size against minimum", () => {
      const tinyFile = createMockFile("tiny.txt", "text/plain", 10);

      expect(validateFile(tinyFile, { minSize: 100 }).valid).toBe(false);
      expect(validateFile(tinyFile, { minSize: 100 }).error).toContain(
        "too small",
      );
    });

    it("should validate exact MIME types", () => {
      const jpegFile = createMockFile("image.jpg", "image/jpeg");

      expect(
        validateFile(jpegFile, { allowedTypes: ["image/jpeg"] }).valid,
      ).toBe(true);
      expect(
        validateFile(jpegFile, { allowedTypes: ["image/png"] }).valid,
      ).toBe(false);
      expect(
        validateFile(jpegFile, { allowedTypes: ["image/png"] }).error,
      ).toContain("not allowed");
    });

    it("should validate wildcard MIME types", () => {
      const jpegFile = createMockFile("image.jpg", "image/jpeg");

      expect(validateFile(jpegFile, { allowedTypes: ["image/*"] }).valid).toBe(
        true,
      );
      expect(validateFile(jpegFile, { allowedTypes: ["video/*"] }).valid).toBe(
        false,
      );
    });

    it("should validate file extensions", () => {
      const pdfFile = createMockFile("document.pdf", "application/pdf");

      expect(
        validateFile(pdfFile, { allowedExtensions: ["pdf", "doc"] }).valid,
      ).toBe(true);
      expect(
        validateFile(pdfFile, { allowedExtensions: ["jpg", "png"] }).valid,
      ).toBe(false);
      expect(validateFile(pdfFile, { allowedExtensions: [".pdf"] }).valid).toBe(
        true,
      );
    });

    it("should pass validation with no options", () => {
      const file = createMockFile("test.txt", "text/plain");

      expect(validateFile(file).valid).toBe(true);
    });
  });

  describe("validateFiles", () => {
    it("should validate multiple files", () => {
      const files = [
        createMockFile("small.txt", "text/plain", 100),
        createMockFile("medium.txt", "text/plain", 500),
        createMockFile("large.txt", "text/plain", 2000),
      ];

      const result = validateFiles(files, { maxSize: 1000 });

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error).toContain("too large");
    });

    it("should enforce maximum file count", () => {
      const files = [
        createMockFile("file1.txt", "text/plain"),
        createMockFile("file2.txt", "text/plain"),
        createMockFile("file3.txt", "text/plain"),
      ];

      const result = validateFiles(files, { maxFiles: 2 });

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error).toContain("Maximum 2 files");
    });
  });
});

describe("Duration Formatting", () => {
  describe("formatDuration", () => {
    it("should format seconds", () => {
      expect(formatDuration(5)).toBe("0:05");
      expect(formatDuration(59)).toBe("0:59");
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(60)).toBe("1:00");
      expect(formatDuration(90)).toBe("1:30");
      expect(formatDuration(754)).toBe("12:34");
    });

    it("should format hours", () => {
      expect(formatDuration(3600)).toBe("1:00:00");
      expect(formatDuration(3661)).toBe("1:01:01");
      expect(formatDuration(7384)).toBe("2:03:04");
    });

    it("should handle zero and invalid values", () => {
      expect(formatDuration(0)).toBe("0:00");
      expect(formatDuration(-5)).toBe("0:00");
      expect(formatDuration(Infinity)).toBe("0:00");
      expect(formatDuration(NaN)).toBe("0:00");
    });
  });
});

describe("MIME Type Utilities", () => {
  describe("getMimeTypeFromExtension", () => {
    it("should return correct MIME types for images", () => {
      expect(getMimeTypeFromExtension("jpg")).toBe("image/jpeg");
      expect(getMimeTypeFromExtension("jpeg")).toBe("image/jpeg");
      expect(getMimeTypeFromExtension("png")).toBe("image/png");
      expect(getMimeTypeFromExtension("gif")).toBe("image/gif");
      expect(getMimeTypeFromExtension("svg")).toBe("image/svg+xml");
    });

    it("should return correct MIME types for videos", () => {
      expect(getMimeTypeFromExtension("mp4")).toBe("video/mp4");
      expect(getMimeTypeFromExtension("webm")).toBe("video/webm");
      expect(getMimeTypeFromExtension("mov")).toBe("video/quicktime");
    });

    it("should return correct MIME types for audio", () => {
      expect(getMimeTypeFromExtension("mp3")).toBe("audio/mpeg");
      expect(getMimeTypeFromExtension("wav")).toBe("audio/wav");
      expect(getMimeTypeFromExtension("ogg")).toBe("audio/ogg");
    });

    it("should return correct MIME types for documents", () => {
      expect(getMimeTypeFromExtension("pdf")).toBe("application/pdf");
      expect(getMimeTypeFromExtension("doc")).toBe("application/msword");
      expect(getMimeTypeFromExtension("txt")).toBe("text/plain");
    });

    it("should return octet-stream for unknown extensions", () => {
      expect(getMimeTypeFromExtension("xyz")).toBe("application/octet-stream");
    });

    it("should handle extensions with dots", () => {
      expect(getMimeTypeFromExtension(".jpg")).toBe("image/jpeg");
    });
  });
});

describe("File Type Checks", () => {
  describe("isPreviewable", () => {
    it("should return true for images, videos, and audio", () => {
      expect(isPreviewable(createMockFile("test.jpg", "image/jpeg"))).toBe(
        true,
      );
      expect(isPreviewable(createMockFile("test.mp4", "video/mp4"))).toBe(true);
      expect(isPreviewable(createMockFile("test.mp3", "audio/mpeg"))).toBe(
        true,
      );
    });

    it("should return false for documents and others", () => {
      expect(isPreviewable(createMockFile("test.pdf", "application/pdf"))).toBe(
        false,
      );
      expect(isPreviewable(createMockFile("test.zip", "application/zip"))).toBe(
        false,
      );
    });
  });

  describe("isImage", () => {
    it("should return true for image files", () => {
      expect(isImage(createMockFile("test.jpg", "image/jpeg"))).toBe(true);
      expect(isImage(createMockFile("test.png", "image/png"))).toBe(true);
    });

    it("should return false for non-image files", () => {
      expect(isImage(createMockFile("test.mp4", "video/mp4"))).toBe(false);
    });
  });

  describe("isVideo", () => {
    it("should return true for video files", () => {
      expect(isVideo(createMockFile("test.mp4", "video/mp4"))).toBe(true);
      expect(isVideo(createMockFile("test.webm", "video/webm"))).toBe(true);
    });

    it("should return false for non-video files", () => {
      expect(isVideo(createMockFile("test.jpg", "image/jpeg"))).toBe(false);
    });
  });

  describe("isAudio", () => {
    it("should return true for audio files", () => {
      expect(isAudio(createMockFile("test.mp3", "audio/mpeg"))).toBe(true);
      expect(isAudio(createMockFile("test.wav", "audio/wav"))).toBe(true);
    });

    it("should return false for non-audio files", () => {
      expect(isAudio(createMockFile("test.jpg", "image/jpeg"))).toBe(false);
    });
  });

  describe("isDocument", () => {
    it("should return true for document files", () => {
      expect(isDocument(createMockFile("test.pdf", "application/pdf"))).toBe(
        true,
      );
      expect(isDocument(createMockFile("test.doc", "application/msword"))).toBe(
        true,
      );
    });

    it("should return false for non-document files", () => {
      expect(isDocument(createMockFile("test.jpg", "image/jpeg"))).toBe(false);
    });
  });
});

describe("Constants", () => {
  it("should have FILE_ICONS defined", () => {
    expect(FILE_ICONS).toBeDefined();
    expect(FILE_ICONS["image/jpeg"]).toBe("image");
    expect(FILE_ICONS.default).toBe("file");
  });

  it("should have FILE_TYPE_LABELS defined", () => {
    expect(FILE_TYPE_LABELS).toBeDefined();
    expect(FILE_TYPE_LABELS.image).toBe("Image");
    expect(FILE_TYPE_LABELS.video).toBe("Video");
  });

  it("should have PREVIEWABLE_TYPES defined", () => {
    expect(PREVIEWABLE_TYPES).toContain("image");
    expect(PREVIEWABLE_TYPES).toContain("video");
    expect(PREVIEWABLE_TYPES).toContain("audio");
  });

  it("should have extension arrays defined", () => {
    expect(IMAGE_EXTENSIONS).toContain("jpg");
    expect(VIDEO_EXTENSIONS).toContain("mp4");
    expect(AUDIO_EXTENSIONS).toContain("mp3");
  });
});
