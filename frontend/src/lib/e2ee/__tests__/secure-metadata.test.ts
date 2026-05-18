/**
 * Secure Metadata Tests
 *
 * Comprehensive tests for metadata encryption and validation.
 */

import { describe, it, expect } from "@jest/globals";
import {
  validateFilename,
  validateMimeType,
  validateMetadata,
  sanitizeMetadata,
  encryptMetadata,
  decryptMetadata,
  encryptThumbnail,
  decryptThumbnail,
  createMinimalMetadata,
  createMetadataFromFile,
  getExtensionFromMimeType,
  getMimeTypeFromExtension,
  isImageMimeType,
  isVideoMimeType,
  isAudioMimeType,
  formatFileSize,
  type AttachmentMetadata,
  type ThumbnailData,
  MAX_FILENAME_LENGTH,
  MAX_THUMBNAIL_SIZE,
} from "../secure-metadata";
import { generateRandomBytes } from "../crypto";
import { generateAttachmentKey } from "../attachment-encryption";

describe("Secure Metadata", () => {
  // ==========================================================================
  // Filename Validation Tests
  // ==========================================================================

  describe("validateFilename", () => {
    it("accepts valid filename", () => {
      const result = validateFilename("document.pdf");

      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe("document.pdf");
      expect(result.errors.length).toBe(0);
    });

    it("accepts filename with spaces", () => {
      const result = validateFilename("my document.pdf");

      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe("my document.pdf");
    });

    it("accepts filename with numbers", () => {
      const result = validateFilename("file123.txt");

      expect(result.valid).toBe(true);
    });

    it("accepts filename with special characters", () => {
      const result = validateFilename("file-name_2024.txt");

      expect(result.valid).toBe(true);
    });

    it("truncates too long filename", () => {
      const longName = "a".repeat(300) + ".txt";
      const result = validateFilename(longName);

      expect(result.valid).toBe(false);
      expect(result.sanitized.length).toBe(MAX_FILENAME_LENGTH);
      expect(result.errors).toContain("Filename too long");
    });

    it("removes path separators", () => {
      const result = validateFilename("path/to/file.txt");

      expect(result.valid).toBe(false);
      expect(result.sanitized).toBe("path_to_file.txt");
      expect(result.errors).toContain("Filename contains path separators");
    });

    it("removes backslash separators", () => {
      const result = validateFilename("path\\to\\file.txt");

      expect(result.valid).toBe(false);
      expect(result.sanitized).toBe("path_to_file.txt");
    });

    it("removes null bytes", () => {
      const result = validateFilename("file\0name.txt");

      expect(result.valid).toBe(false);
      expect(result.sanitized).toBe("filename.txt");
      expect(result.errors).toContain("Filename contains null bytes");
    });

    it("removes directory traversal", () => {
      const result = validateFilename("../../etc/passwd");

      expect(result.valid).toBe(false);
      expect(result.sanitized).not.toContain("..");
      expect(result.errors).toContain("Filename contains directory traversal");
    });

    it("removes control characters", () => {
      const result = validateFilename("file\x00\x1f\x7fname.txt");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Filename contains control characters");
    });

    it("handles empty filename", () => {
      const result = validateFilename("");

      expect(result.valid).toBe(false);
      expect(result.sanitized).toBe("unnamed_file");
    });
  });

  // ==========================================================================
  // MIME Type Validation Tests
  // ==========================================================================

  describe("validateMimeType", () => {
    it("accepts valid MIME type", () => {
      const result = validateMimeType("image/png");

      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe("image/png");
    });

    it("accepts application types", () => {
      const result = validateMimeType("application/pdf");

      expect(result.valid).toBe(true);
    });

    it("accepts text types", () => {
      const result = validateMimeType("text/plain");

      expect(result.valid).toBe(true);
    });

    it("normalizes to lowercase", () => {
      const result = validateMimeType("IMAGE/PNG");

      expect(result.sanitized).toBe("image/png");
    });

    it("trims whitespace", () => {
      const result = validateMimeType("  image/png  ");

      expect(result.sanitized).toBe("image/png");
    });

    it("rejects invalid format", () => {
      const result = validateMimeType("invalid");

      expect(result.valid).toBe(false);
      expect(result.sanitized).toBe("application/octet-stream");
    });

    it("rejects type without subtype", () => {
      const result = validateMimeType("image/");

      expect(result.valid).toBe(false);
    });

    it("accepts MIME type with special characters", () => {
      const result = validateMimeType("application/vnd.ms-excel");

      expect(result.valid).toBe(true);
    });

    it("truncates too long MIME type", () => {
      const longMime = "application/" + "a".repeat(200);
      const result = validateMimeType(longMime);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("MIME type too long");
    });
  });

  // ==========================================================================
  // Metadata Validation Tests
  // ==========================================================================

  describe("validateMetadata", () => {
    const validMetadata: AttachmentMetadata = {
      filename: "document.pdf",
      mimeType: "application/pdf",
      size: 1024,
      createdAt: Date.now(),
    };

    it("validates correct metadata", () => {
      const result = validateMetadata(validMetadata);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("rejects negative size", () => {
      const invalid = { ...validMetadata, size: -1 };
      const result = validateMetadata(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("size: must be non-negative");
    });

    it("rejects negative timestamp", () => {
      const invalid = { ...validMetadata, createdAt: -1 };
      const result = validateMetadata(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("createdAt: invalid timestamp");
    });

    it("validates image metadata", () => {
      const withImage: AttachmentMetadata = {
        ...validMetadata,
        image: { width: 100, height: 100 },
      };
      const result = validateMetadata(withImage);

      expect(result.valid).toBe(true);
    });

    it("rejects invalid image dimensions", () => {
      const withImage: AttachmentMetadata = {
        ...validMetadata,
        image: { width: 0, height: 100 },
      };
      const result = validateMetadata(withImage);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("image: invalid dimensions");
    });

    it("validates video metadata", () => {
      const withVideo: AttachmentMetadata = {
        ...validMetadata,
        video: { width: 1920, height: 1080, duration: 120 },
      };
      const result = validateMetadata(withVideo);

      expect(result.valid).toBe(true);
    });

    it("rejects invalid video duration", () => {
      const withVideo: AttachmentMetadata = {
        ...validMetadata,
        video: { width: 1920, height: 1080, duration: -1 },
      };
      const result = validateMetadata(withVideo);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("video: invalid duration");
    });

    it("validates audio metadata", () => {
      const withAudio: AttachmentMetadata = {
        ...validMetadata,
        audio: { duration: 180 },
      };
      const result = validateMetadata(withAudio);

      expect(result.valid).toBe(true);
    });

    it("rejects invalid audio duration", () => {
      const withAudio: AttachmentMetadata = {
        ...validMetadata,
        audio: { duration: -10 },
      };
      const result = validateMetadata(withAudio);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("audio: invalid duration");
    });

    it("rejects oversized thumbnail", () => {
      const withThumbnail: AttachmentMetadata = {
        ...validMetadata,
        thumbnail: {
          data: new Uint8Array(MAX_THUMBNAIL_SIZE + 1),
          mimeType: "image/jpeg",
          width: 100,
          height: 100,
        },
      };
      const result = validateMetadata(withThumbnail);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("thumbnail: exceeds maximum size");
    });
  });

  // ==========================================================================
  // Metadata Sanitization Tests
  // ==========================================================================

  describe("sanitizeMetadata", () => {
    const metadata: AttachmentMetadata = {
      filename: "path/to/file.pdf",
      mimeType: "APPLICATION/PDF",
      size: 1024,
      createdAt: Date.now(),
      custom: { key: "value" },
    };

    it("sanitizes filename", () => {
      const result = sanitizeMetadata(metadata);

      expect(result.filename).toBe("path_to_file.pdf");
    });

    it("normalizes MIME type", () => {
      const result = sanitizeMetadata(metadata);

      expect(result.mimeType).toBe("application/pdf");
    });

    it("can strip extension", () => {
      const result = sanitizeMetadata(metadata, { stripExtension: true });

      expect(result.filename).not.toContain(".pdf");
    });

    it("can anonymize filename", () => {
      const result = sanitizeMetadata(metadata, { anonymizeFilename: true });

      expect(result.filename).toMatch(/^file_[A-Za-z0-9+/]+=*\.pdf$/);
    });

    it("can strip custom metadata", () => {
      const result = sanitizeMetadata(metadata, { stripCustomMetadata: true });

      expect(result.custom).toBeUndefined();
    });

    it("can strip timestamps", () => {
      const result = sanitizeMetadata(metadata, { stripTimestamps: true });

      expect(result.createdAt).toBe(0);
      expect(result.modifiedAt).toBeUndefined();
    });

    it("truncates long document author", () => {
      const withDoc: AttachmentMetadata = {
        ...metadata,
        document: { author: "a".repeat(300) },
      };
      const result = sanitizeMetadata(withDoc);

      expect(result.document?.author?.length).toBeLessThanOrEqual(255);
    });
  });

  // ==========================================================================
  // Metadata Encryption Tests
  // ==========================================================================

  describe("encryptMetadata / decryptMetadata", () => {
    const testMetadata: AttachmentMetadata = {
      filename: "test-file.pdf",
      mimeType: "application/pdf",
      size: 12345,
      createdAt: Date.now(),
    };

    it("encrypts and decrypts metadata", async () => {
      const key = generateAttachmentKey();

      const encrypted = await encryptMetadata(testMetadata, key);
      const decrypted = await decryptMetadata(encrypted, key);

      expect(decrypted.filename).toBe(testMetadata.filename);
      expect(decrypted.mimeType).toBe(testMetadata.mimeType);
      expect(decrypted.size).toBe(testMetadata.size);
    });

    it("encrypted metadata has correct structure", async () => {
      const key = generateAttachmentKey();

      const encrypted = await encryptMetadata(testMetadata, key);

      expect(typeof encrypted.encryptedData).toBe("string");
      expect(typeof encrypted.iv).toBe("string");
      expect(encrypted.version).toBe(1);
      expect(typeof encrypted.metadataHash).toBe("string");
    });

    it("fails with wrong key", async () => {
      const key1 = generateAttachmentKey();
      const key2 = generateAttachmentKey();

      const encrypted = await encryptMetadata(testMetadata, key1);

      await expect(decryptMetadata(encrypted, key2)).rejects.toThrow();
    });

    it("handles metadata with image info", async () => {
      const key = generateAttachmentKey();
      const withImage: AttachmentMetadata = {
        ...testMetadata,
        image: { width: 1920, height: 1080, colorSpace: "sRGB" },
      };

      const encrypted = await encryptMetadata(withImage, key);
      const decrypted = await decryptMetadata(encrypted, key);

      expect(decrypted.image?.width).toBe(1920);
      expect(decrypted.image?.height).toBe(1080);
    });

    it("handles metadata with video info", async () => {
      const key = generateAttachmentKey();
      const withVideo: AttachmentMetadata = {
        ...testMetadata,
        video: { width: 1920, height: 1080, duration: 120.5 },
      };

      const encrypted = await encryptMetadata(withVideo, key);
      const decrypted = await decryptMetadata(encrypted, key);

      expect(decrypted.video?.duration).toBe(120.5);
    });

    it("handles metadata with custom fields", async () => {
      const key = generateAttachmentKey();
      const withCustom: AttachmentMetadata = {
        ...testMetadata,
        custom: { myField: "myValue", count: 42 },
      };

      const encrypted = await encryptMetadata(withCustom, key);
      const decrypted = await decryptMetadata(encrypted, key);

      expect(decrypted.custom?.myField).toBe("myValue");
      expect(decrypted.custom?.count).toBe(42);
    });

    it("verifies metadata hash", async () => {
      const key = generateAttachmentKey();

      const encrypted = await encryptMetadata(testMetadata, key);

      // Tamper with encrypted data
      const tampered = {
        ...encrypted,
        encryptedData: encrypted.encryptedData + "x",
      };

      await expect(decryptMetadata(tampered, key)).rejects.toThrow();
    });

    it("accepts raw key bytes", async () => {
      const keyBytes = generateRandomBytes(32);

      const encrypted = await encryptMetadata(testMetadata, keyBytes);
      const decrypted = await decryptMetadata(encrypted, keyBytes);

      expect(decrypted.filename).toBe(testMetadata.filename);
    });
  });

  // ==========================================================================
  // Thumbnail Encryption Tests
  // ==========================================================================

  describe("encryptThumbnail / decryptThumbnail", () => {
    const testThumbnail: ThumbnailData = {
      data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]), // JPEG header
      mimeType: "image/jpeg",
      width: 100,
      height: 100,
    };

    it("encrypts and decrypts thumbnail", async () => {
      const key = generateRandomBytes(32);

      const encrypted = await encryptThumbnail(testThumbnail, key);
      const decrypted = await decryptThumbnail(encrypted, key);

      expect(decrypted.data).toEqual(testThumbnail.data);
      expect(decrypted.width).toBe(testThumbnail.width);
      expect(decrypted.height).toBe(testThumbnail.height);
    });

    it("encrypted thumbnail has correct structure", async () => {
      const key = generateRandomBytes(32);

      const encrypted = await encryptThumbnail(testThumbnail, key);

      expect(typeof encrypted.encryptedData).toBe("string");
      expect(typeof encrypted.iv).toBe("string");
      expect(encrypted.width).toBe(100);
      expect(encrypted.height).toBe(100);
      expect(typeof encrypted.thumbnailHash).toBe("string");
    });

    it("fails with wrong key", async () => {
      const key1 = generateRandomBytes(32);
      const key2 = generateRandomBytes(32);

      const encrypted = await encryptThumbnail(testThumbnail, key1);

      await expect(decryptThumbnail(encrypted, key2)).rejects.toThrow();
    });

    it("detects WebP format", async () => {
      const key = generateRandomBytes(32);
      const webpThumbnail: ThumbnailData = {
        data: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]), // RIFF header
        mimeType: "image/webp",
        width: 50,
        height: 50,
      };

      const encrypted = await encryptThumbnail(webpThumbnail, key);
      const decrypted = await decryptThumbnail(encrypted, key);

      expect(decrypted.mimeType).toBe("image/webp");
    });

    it("verifies thumbnail hash", async () => {
      const key = generateRandomBytes(32);

      const encrypted = await encryptThumbnail(testThumbnail, key);

      // Tamper with hash
      const tampered = { ...encrypted, thumbnailHash: "invalid" };

      await expect(decryptThumbnail(tampered, key)).rejects.toThrow();
    });

    it("rejects oversized thumbnail", async () => {
      const key = generateRandomBytes(32);
      const oversized: ThumbnailData = {
        data: new Uint8Array(MAX_THUMBNAIL_SIZE + 1),
        mimeType: "image/jpeg",
        width: 1000,
        height: 1000,
      };

      await expect(encryptThumbnail(oversized, key)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Metadata With Thumbnail Tests
  // ==========================================================================

  describe("Metadata with Thumbnail", () => {
    it("encrypts and decrypts metadata with thumbnail", async () => {
      const key = generateAttachmentKey();
      const metadata: AttachmentMetadata = {
        filename: "image.jpg",
        mimeType: "image/jpeg",
        size: 5000,
        createdAt: Date.now(),
        thumbnail: {
          data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
          mimeType: "image/jpeg",
          width: 100,
          height: 100,
        },
      };

      const encrypted = await encryptMetadata(metadata, key);
      expect(encrypted.hasThumbnail).toBe(true);
      expect(encrypted.encryptedThumbnail).toBeDefined();

      const decrypted = await decryptMetadata(encrypted, key);
      expect(decrypted.thumbnail).toBeDefined();
      expect(decrypted.thumbnail?.width).toBe(100);
    });
  });

  // ==========================================================================
  // Utility Function Tests
  // ==========================================================================

  describe("createMinimalMetadata", () => {
    it("creates metadata with required fields", () => {
      const metadata = createMinimalMetadata("file.txt", "text/plain", 1000);

      expect(metadata.filename).toBe("file.txt");
      expect(metadata.mimeType).toBe("text/plain");
      expect(metadata.size).toBe(1000);
      expect(metadata.createdAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("getExtensionFromMimeType", () => {
    it("returns correct extensions", () => {
      expect(getExtensionFromMimeType("image/jpeg")).toBe(".jpg");
      expect(getExtensionFromMimeType("image/png")).toBe(".png");
      expect(getExtensionFromMimeType("application/pdf")).toBe(".pdf");
      expect(getExtensionFromMimeType("video/mp4")).toBe(".mp4");
      expect(getExtensionFromMimeType("audio/mpeg")).toBe(".mp3");
    });

    it("returns empty string for unknown type", () => {
      expect(getExtensionFromMimeType("application/x-custom")).toBe("");
    });
  });

  describe("getMimeTypeFromExtension", () => {
    it("returns correct MIME types", () => {
      expect(getMimeTypeFromExtension("file.jpg")).toBe("image/jpeg");
      expect(getMimeTypeFromExtension("file.png")).toBe("image/png");
      expect(getMimeTypeFromExtension("file.pdf")).toBe("application/pdf");
      expect(getMimeTypeFromExtension("file.mp4")).toBe("video/mp4");
      expect(getMimeTypeFromExtension("file.mp3")).toBe("audio/mpeg");
    });

    it("returns octet-stream for unknown extension", () => {
      expect(getMimeTypeFromExtension("file.xyz")).toBe(
        "application/octet-stream",
      );
    });
  });

  describe("isImageMimeType", () => {
    it("identifies image types", () => {
      expect(isImageMimeType("image/jpeg")).toBe(true);
      expect(isImageMimeType("image/png")).toBe(true);
      expect(isImageMimeType("image/gif")).toBe(true);
      expect(isImageMimeType("IMAGE/PNG")).toBe(true);
    });

    it("rejects non-image types", () => {
      expect(isImageMimeType("video/mp4")).toBe(false);
      expect(isImageMimeType("application/pdf")).toBe(false);
    });
  });

  describe("isVideoMimeType", () => {
    it("identifies video types", () => {
      expect(isVideoMimeType("video/mp4")).toBe(true);
      expect(isVideoMimeType("video/webm")).toBe(true);
      expect(isVideoMimeType("VIDEO/MP4")).toBe(true);
    });

    it("rejects non-video types", () => {
      expect(isVideoMimeType("image/jpeg")).toBe(false);
      expect(isVideoMimeType("audio/mpeg")).toBe(false);
    });
  });

  describe("isAudioMimeType", () => {
    it("identifies audio types", () => {
      expect(isAudioMimeType("audio/mpeg")).toBe(true);
      expect(isAudioMimeType("audio/wav")).toBe(true);
      expect(isAudioMimeType("AUDIO/MP3")).toBe(true);
    });

    it("rejects non-audio types", () => {
      expect(isAudioMimeType("video/mp4")).toBe(false);
      expect(isAudioMimeType("image/png")).toBe(false);
    });
  });

  describe("formatFileSize", () => {
    it("formats bytes", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(500)).toBe("500 B");
      expect(formatFileSize(1023)).toBe("1023 B");
    });

    it("formats kilobytes", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(2048)).toBe("2.0 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("formats megabytes", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
      expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
    });

    it("formats gigabytes", () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.0 GB");
    });
  });
});
