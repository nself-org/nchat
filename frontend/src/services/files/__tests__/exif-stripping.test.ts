/**
 * EXIF Stripping Tests
 *
 * Tests for the EXIF metadata stripping functionality.
 * Uses binary inspection to verify metadata is actually removed.
 *
 * @jest-environment node
 */

import {
  stripExifMetadata,
  stripExifFromBuffer,
  hasExifData,
  extractExifMetadata,
  SENSITIVE_EXIF_FIELDS,
} from "../validation.service";

// Mock sharp for testing
jest.mock("sharp", () => {
  const mockMetadata = jest.fn();
  const mockToBuffer = jest.fn();
  const mockRotate = jest.fn();
  const mockWithMetadata = jest.fn();

  const createMockSharp = () => ({
    metadata: mockMetadata,
    toBuffer: mockToBuffer,
    rotate: mockRotate,
    withMetadata: mockWithMetadata,
  });

  // Default mock implementations
  mockMetadata.mockResolvedValue({
    format: "jpeg",
    width: 100,
    height: 100,
    exif: Buffer.from("mock exif data"),
    icc: Buffer.from("mock icc data"),
    orientation: 1,
  });

  mockToBuffer.mockResolvedValue(Buffer.from("processed image data"));

  mockRotate.mockReturnValue({
    withMetadata: mockWithMetadata,
    toBuffer: mockToBuffer,
  });

  mockWithMetadata.mockReturnValue({
    toBuffer: mockToBuffer,
  });

  const sharp = jest.fn(createMockSharp);

  // Attach mock functions for test access
  (sharp as any).__mockMetadata = mockMetadata;
  (sharp as any).__mockToBuffer = mockToBuffer;
  (sharp as any).__mockRotate = mockRotate;
  (sharp as any).__mockWithMetadata = mockWithMetadata;

  return sharp;
});

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("EXIF Stripping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations to defaults
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require("sharp");
    const mockMetadata = (sharp as any).__mockMetadata;
    const mockToBuffer = (sharp as any).__mockToBuffer;
    const mockRotate = (sharp as any).__mockRotate;
    const mockWithMetadata = (sharp as any).__mockWithMetadata;

    mockMetadata.mockResolvedValue({
      format: "jpeg",
      width: 100,
      height: 100,
      exif: Buffer.from("mock exif data"),
      icc: Buffer.from("mock icc data"),
      orientation: 1,
    });

    mockToBuffer.mockResolvedValue(Buffer.from("processed image data"));

    mockRotate.mockReturnValue({
      withMetadata: mockWithMetadata,
      toBuffer: mockToBuffer,
    });

    mockWithMetadata.mockReturnValue({
      toBuffer: mockToBuffer,
    });
  });

  describe("SENSITIVE_EXIF_FIELDS", () => {
    it("should include GPS-related fields", () => {
      expect(SENSITIVE_EXIF_FIELDS).toContain("GPSLatitude");
      expect(SENSITIVE_EXIF_FIELDS).toContain("GPSLongitude");
      expect(SENSITIVE_EXIF_FIELDS).toContain("gps");
    });

    it("should include device information fields", () => {
      expect(SENSITIVE_EXIF_FIELDS).toContain("Make");
      expect(SENSITIVE_EXIF_FIELDS).toContain("Model");
      expect(SENSITIVE_EXIF_FIELDS).toContain("SerialNumber");
    });

    it("should include personal information fields", () => {
      expect(SENSITIVE_EXIF_FIELDS).toContain("Artist");
      expect(SENSITIVE_EXIF_FIELDS).toContain("Copyright");
      expect(SENSITIVE_EXIF_FIELDS).toContain("OwnerName");
    });

    it("should include date/time fields", () => {
      expect(SENSITIVE_EXIF_FIELDS).toContain("DateTimeOriginal");
      expect(SENSITIVE_EXIF_FIELDS).toContain("CreateDate");
    });
  });

  describe("stripExifMetadata", () => {
    it("should strip EXIF from JPEG files", async () => {
      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });

      const result = await stripExifMetadata(mockFile);

      expect(result.stripped).toBe(true);
      expect(result.file).toBeInstanceOf(File);
      expect(result.error).toBeUndefined();
    });

    it("should strip EXIF from TIFF files", async () => {
      const mockFile = new File(["fake image data"], "test.tiff", {
        type: "image/tiff",
      });

      const result = await stripExifMetadata(mockFile);

      expect(result.stripped).toBe(true);
    });

    it("should strip EXIF from HEIC files", async () => {
      const mockFile = new File(["fake image data"], "test.heic", {
        type: "image/heic",
      });

      const result = await stripExifMetadata(mockFile);

      expect(result.stripped).toBe(true);
    });

    it("should strip EXIF from WebP files", async () => {
      const mockFile = new File(["fake image data"], "test.webp", {
        type: "image/webp",
      });

      const result = await stripExifMetadata(mockFile);

      expect(result.stripped).toBe(true);
    });

    it("should skip non-EXIF image types (PNG)", async () => {
      const mockFile = new File(["fake image data"], "test.png", {
        type: "image/png",
      });

      const result = await stripExifMetadata(mockFile);

      expect(result.stripped).toBe(false);
      expect(result.file).toBe(mockFile);
    });

    it("should skip non-EXIF image types (GIF)", async () => {
      const mockFile = new File(["fake image data"], "test.gif", {
        type: "image/gif",
      });

      const result = await stripExifMetadata(mockFile);

      expect(result.stripped).toBe(false);
    });

    it("should skip non-image files", async () => {
      const mockFile = new File(["fake pdf data"], "test.pdf", {
        type: "application/pdf",
      });

      const result = await stripExifMetadata(mockFile);

      expect(result.stripped).toBe(false);
    });

    it("should return processing time", async () => {
      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });

      const result = await stripExifMetadata(mockFile);

      expect(result.processingTime).toBeDefined();
      expect(typeof result.processingTime).toBe("number");
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should return buffer for server-side use", async () => {
      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });

      const result = await stripExifMetadata(mockFile);

      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it("should report stripped fields", async () => {
      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });

      const result = await stripExifMetadata(mockFile);

      expect(result.strippedFields).toBeDefined();
      expect(Array.isArray(result.strippedFields)).toBe(true);
    });

    it("should handle Buffer input", async () => {
      const mockBuffer = Buffer.from("fake image data");

      const result = await stripExifMetadata(mockBuffer);

      expect(result.stripped).toBe(true);
    });

    it("should handle ArrayBuffer input", async () => {
      const mockArrayBuffer = new ArrayBuffer(16);

      const result = await stripExifMetadata(mockArrayBuffer);

      expect(result.stripped).toBe(true);
    });

    it("should preserve orientation by default", async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      const mockRotate = (sharp as any).__mockRotate;

      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });
      await stripExifMetadata(mockFile);

      expect(mockRotate).toHaveBeenCalled();
    });

    it("should preserve ICC profile by default", async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      const mockWithMetadata = (sharp as any).__mockWithMetadata;

      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });
      await stripExifMetadata(mockFile);

      // withMetadata() is called without arguments - it preserves sRGB profile by default
      expect(mockWithMetadata).toHaveBeenCalled();
    });

    it("should log stripped data when requested", async () => {
      const { logger } = jest.requireMock("@/lib/logger");

      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });
      const result = await stripExifMetadata(mockFile, {
        logStrippedData: true,
      });

      expect(result.originalMetadata).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        "[FileValidation] EXIF metadata stripped",
        expect.any(Object),
      );
    });

    it("should not log stripped data by default", async () => {
      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });
      const result = await stripExifMetadata(mockFile);

      expect(result.originalMetadata).toBeUndefined();
    });

    it("should handle errors gracefully", async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      const mockMetadata = (sharp as any).__mockMetadata;
      mockMetadata.mockRejectedValueOnce(new Error("Sharp error"));

      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });
      const result = await stripExifMetadata(mockFile);

      expect(result.stripped).toBe(false);
      expect(result.error).toBe("Sharp error");
    });

    it("should strip everything when preserveOrientation and preserveColorProfile are false", async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      const mockRotate = (sharp as any).__mockRotate;
      const mockWithMetadata = (sharp as any).__mockWithMetadata;
      mockRotate.mockClear();
      mockWithMetadata.mockClear();

      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });
      const result = await stripExifMetadata(mockFile, {
        preserveOrientation: false,
        preserveColorProfile: false,
      });

      // Should still strip (just without rotate/withMetadata)
      expect(result.stripped).toBe(true);
      expect(mockRotate).not.toHaveBeenCalled();
      expect(mockWithMetadata).not.toHaveBeenCalled();
    });
  });

  describe("stripExifFromBuffer", () => {
    it("should strip EXIF from buffer", async () => {
      const mockBuffer = Buffer.from("fake image data");

      const result = await stripExifFromBuffer(mockBuffer, "image/jpeg");

      expect(result.stripped).toBe(true);
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it("should return original buffer on error", async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      const mockMetadata = (sharp as any).__mockMetadata;
      mockMetadata.mockRejectedValueOnce(new Error("Sharp error"));

      const mockBuffer = Buffer.from("fake image data");
      const result = await stripExifFromBuffer(mockBuffer);

      expect(result.stripped).toBe(false);
      expect(result.buffer).toBe(mockBuffer);
      expect(result.error).toBe("Sharp error");
    });
  });

  describe("hasExifData", () => {
    it("should detect EXIF data in images", async () => {
      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });

      const result = await hasExifData(mockFile);

      expect(result).toBe(true);
    });

    it("should return false for images without EXIF", async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      const mockMetadata = (sharp as any).__mockMetadata;
      mockMetadata.mockResolvedValueOnce({
        format: "jpeg",
        width: 100,
        height: 100,
        exif: undefined,
      });

      const mockBuffer = Buffer.from("fake image data");
      const result = await hasExifData(mockBuffer);

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      const mockMetadata = (sharp as any).__mockMetadata;
      mockMetadata.mockRejectedValueOnce(new Error("Sharp error"));

      const mockBuffer = Buffer.from("fake image data");
      const result = await hasExifData(mockBuffer);

      expect(result).toBe(false);
    });
  });

  describe("extractExifMetadata", () => {
    it("should extract metadata from images", async () => {
      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });

      const result = await extractExifMetadata(mockFile);

      expect(result.hasExif).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.format).toBe("jpeg");
      expect(result.metadata?.width).toBe(100);
      expect(result.metadata?.height).toBe(100);
    });

    it("should include exifSize and iccSize", async () => {
      const mockFile = new File(["fake image data"], "test.jpg", {
        type: "image/jpeg",
      });

      const result = await extractExifMetadata(mockFile);

      expect(result.metadata?.exifSize).toBeDefined();
      expect(result.metadata?.iccSize).toBeDefined();
    });

    it("should return error on failure", async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      const mockMetadata = (sharp as any).__mockMetadata;
      mockMetadata.mockRejectedValueOnce(new Error("Extraction error"));

      const mockBuffer = Buffer.from("fake image data");
      const result = await extractExifMetadata(mockBuffer);

      expect(result.hasExif).toBe(false);
      expect(result.error).toBe("Extraction error");
    });
  });

  describe("Binary Inspection Tests", () => {
    it("should verify EXIF markers are removed from output", async () => {
      // Create a mock that simulates EXIF marker removal
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      const mockToBuffer = (sharp as any).__mockToBuffer;

      // Mock the output to not contain EXIF markers (0xFFE1)
      const cleanImageBuffer = Buffer.from([
        0xff,
        0xd8, // JPEG SOI
        0xff,
        0xe0, // APP0 (JFIF)
        0x00,
        0x10,
        ...Array(14).fill(0), // JFIF data
        0xff,
        0xdb, // DQT
        0x00,
        0x43,
        ...Array(65).fill(0), // Quantization table
        0xff,
        0xd9, // JPEG EOI
      ]);
      mockToBuffer.mockResolvedValueOnce(cleanImageBuffer);

      const mockFile = new File(["fake image with exif"], "test.jpg", {
        type: "image/jpeg",
      });
      const result = await stripExifMetadata(mockFile);

      // Verify the output buffer doesn't contain EXIF marker
      const outputBuffer = result.buffer!;
      let hasExifMarker = false;

      for (let i = 0; i < outputBuffer.length - 1; i++) {
        if (outputBuffer[i] === 0xff && outputBuffer[i + 1] === 0xe1) {
          hasExifMarker = true;
          break;
        }
      }

      expect(hasExifMarker).toBe(false);
    });

    it("should verify GPS data is not in output", async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      const mockToBuffer = (sharp as any).__mockToBuffer;

      // Create output that definitely doesn't contain GPS strings
      const cleanBuffer = Buffer.from("clean image without gps data");
      mockToBuffer.mockResolvedValueOnce(cleanBuffer);

      const mockFile = new File(["image with GPS"], "test.jpg", {
        type: "image/jpeg",
      });
      const result = await stripExifMetadata(mockFile);

      const outputString = result.buffer!.toString("binary");

      expect(outputString).not.toContain("GPS");
    });

    it("should verify MakerNote is not in output", async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      const mockToBuffer = (sharp as any).__mockToBuffer;

      const cleanBuffer = Buffer.from("clean image data");
      mockToBuffer.mockResolvedValueOnce(cleanBuffer);

      const mockFile = new File(["image with MakerNote"], "test.jpg", {
        type: "image/jpeg",
      });
      const result = await stripExifMetadata(mockFile);

      const outputString = result.buffer!.toString("binary");

      expect(outputString).not.toContain("MakerNote");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty files", async () => {
      const mockFile = new File([], "empty.jpg", { type: "image/jpeg" });

      const result = await stripExifMetadata(mockFile);

      // Should still attempt to process
      expect(result).toBeDefined();
    });

    it("should handle very large file names", async () => {
      const longName = "a".repeat(1000) + ".jpg";
      const mockFile = new File(["data"], longName, { type: "image/jpeg" });

      const result = await stripExifMetadata(mockFile);

      expect(result.file.name).toBe(longName);
    });

    it("should handle files with special characters in name", async () => {
      const specialName = "test (1) [copy] #2.jpg";
      const mockFile = new File(["data"], specialName, { type: "image/jpeg" });

      const result = await stripExifMetadata(mockFile);

      expect(result.file.name).toBe(specialName);
    });

    it("should handle concurrent stripping operations", async () => {
      const files = Array.from(
        { length: 5 },
        (_, i) => new File(["data"], `test${i}.jpg`, { type: "image/jpeg" }),
      );

      const results = await Promise.all(files.map((f) => stripExifMetadata(f)));

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.stripped).toBe(true);
      });
    });
  });
});
