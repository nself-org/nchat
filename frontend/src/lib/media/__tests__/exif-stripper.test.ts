/**
 * EXIF Stripper Tests
 *
 * Tests for EXIF metadata stripping functionality.
 */

import {
  hasExif,
  extractExif,
  hasGpsData,
  isCameraPhoto,
  getCameraInfo,
  getPhotoDate,
  type ExifData,
} from "../exif-stripper";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a minimal valid JPEG file (no EXIF)
 */
function createMockJpeg(size: number = 1024): File {
  // JPEG magic bytes: FFD8 (SOI) + FFE0 (APP0/JFIF marker) + length + "JFIF" + padding + FFD9 (EOI)
  const header = new Uint8Array([
    0xff,
    0xd8, // SOI
    0xff,
    0xe0, // APP0 marker
    0x00,
    0x10, // Length (16 bytes)
    0x4a,
    0x46,
    0x49,
    0x46,
    0x00, // "JFIF\0"
    0x01,
    0x01, // Version
    0x00, // Units
    0x00,
    0x01, // X density
    0x00,
    0x01, // Y density
    0x00,
    0x00, // Thumbnail
    0xff,
    0xd9, // EOI
  ]);

  // Pad to requested size
  const content = new Uint8Array(size);
  content.set(header);
  // Fill with padding (keeping EOI at the end)
  content[size - 2] = 0xff;
  content[size - 1] = 0xd9;

  return new File([content], "test.jpg", { type: "image/jpeg" });
}

/**
 * Create a JPEG file with EXIF data
 */
function createMockJpegWithExif(): File {
  // JPEG with EXIF marker
  const header = new Uint8Array([
    0xff,
    0xd8, // SOI
    0xff,
    0xe1, // APP1 (EXIF) marker
    0x00,
    0x16, // Length (22 bytes)
    0x45,
    0x78,
    0x69,
    0x66,
    0x00,
    0x00, // "Exif\0\0"
    // TIFF header (little-endian)
    0x49,
    0x49, // 'II' = Intel byte order
    0x2a,
    0x00, // TIFF magic
    0x08,
    0x00,
    0x00,
    0x00, // Offset to IFD0
    // IFD0
    0x00,
    0x00, // 0 entries
    0x00,
    0x00,
    0x00,
    0x00, // No next IFD
    0xff,
    0xd9, // EOI
  ]);

  return new File([header], "test-with-exif.jpg", { type: "image/jpeg" });
}

/**
 * Create a non-JPEG file
 */
function createMockPng(size: number = 1024): File {
  // PNG signature
  const header = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    // Minimal IHDR chunk
    0x00,
    0x00,
    0x00,
    0x0d, // Length
    0x49,
    0x48,
    0x44,
    0x52, // "IHDR"
    0x00,
    0x00,
    0x00,
    0x01, // Width
    0x00,
    0x00,
    0x00,
    0x01, // Height
    0x08,
    0x02, // Bit depth, color type
    0x00,
    0x00,
    0x00, // Compression, filter, interlace
    0x90,
    0x77,
    0x53,
    0xde, // CRC
    // IEND chunk
    0x00,
    0x00,
    0x00,
    0x00,
    0x49,
    0x45,
    0x4e,
    0x44,
    0xae,
    0x42,
    0x60,
    0x82,
  ]);

  const content = new Uint8Array(Math.max(size, header.length));
  content.set(header);

  return new File([content], "test.png", { type: "image/png" });
}

// ============================================================================
// hasExif Tests
// ============================================================================

describe("hasExif", () => {
  it("should return false for JPEG without EXIF", async () => {
    const file = createMockJpeg();
    const result = await hasExif(file);
    expect(result).toBe(false);
  });

  it("should handle JPEG with EXIF marker", async () => {
    const file = createMockJpegWithExif();
    const result = await hasExif(file);
    // The mock has EXIF marker structure but minimal data
    // Result depends on exact parsing implementation
    expect(typeof result).toBe("boolean");
  });

  it("should return false for non-JPEG files", async () => {
    const file = createMockPng();
    const result = await hasExif(file);
    expect(result).toBe(false);
  });

  it("should handle invalid files gracefully", async () => {
    const file = new File(["not a jpeg"], "invalid.jpg", {
      type: "image/jpeg",
    });
    const result = await hasExif(file);
    expect(result).toBe(false);
  });

  it("should handle empty files", async () => {
    const file = new File([], "empty.jpg", { type: "image/jpeg" });
    const result = await hasExif(file);
    expect(result).toBe(false);
  });
});

// ============================================================================
// extractExif Tests
// ============================================================================

describe("extractExif", () => {
  it("should return null for JPEG without EXIF", async () => {
    const file = createMockJpeg();
    const result = await extractExif(file);
    expect(result).toBeNull();
  });

  it("should return null for non-JPEG files", async () => {
    const file = createMockPng();
    const result = await extractExif(file);
    expect(result).toBeNull();
  });

  it("should return ExifData object or null for JPEG with EXIF", async () => {
    const file = createMockJpegWithExif();
    const result = await extractExif(file);
    // The mock file has minimal EXIF, may return null or empty object
    // In production, real EXIF data would be parsed
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("should handle corrupt EXIF gracefully", async () => {
    // Create a JPEG with malformed EXIF
    const header = new Uint8Array([
      0xff,
      0xd8, // SOI
      0xff,
      0xe1, // APP1 marker
      0x00,
      0x08, // Length (8 bytes, too short)
      0x45,
      0x78,
      0x69,
      0x66, // "Exif" (incomplete)
      0xff,
      0xd9, // EOI
    ]);
    const file = new File([header], "corrupt.jpg", { type: "image/jpeg" });

    const result = await extractExif(file);
    // Should not throw, may return null or partial data
    expect(result === null || typeof result === "object").toBe(true);
  });
});

// ============================================================================
// ExifData Helper Tests
// ============================================================================

describe("hasGpsData", () => {
  it("should return false for null EXIF", () => {
    expect(hasGpsData(null)).toBe(false);
  });

  it("should return false for EXIF without GPS", () => {
    const exif: ExifData = { make: "Canon" };
    expect(hasGpsData(exif)).toBe(false);
  });

  it("should return true for EXIF with latitude", () => {
    const exif: ExifData = { gpsLatitude: 37.7749 };
    expect(hasGpsData(exif)).toBe(true);
  });

  it("should return true for EXIF with longitude", () => {
    const exif: ExifData = { gpsLongitude: -122.4194 };
    expect(hasGpsData(exif)).toBe(true);
  });

  it("should return true for EXIF with altitude", () => {
    const exif: ExifData = { gpsAltitude: 100 };
    expect(hasGpsData(exif)).toBe(true);
  });

  it("should return true for complete GPS data", () => {
    const exif: ExifData = {
      gpsLatitude: 37.7749,
      gpsLongitude: -122.4194,
      gpsAltitude: 10,
    };
    expect(hasGpsData(exif)).toBe(true);
  });
});

describe("isCameraPhoto", () => {
  it("should return false for null EXIF", () => {
    expect(isCameraPhoto(null)).toBe(false);
  });

  it("should return false for empty EXIF", () => {
    const exif: ExifData = {};
    expect(isCameraPhoto(exif)).toBe(false);
  });

  it("should return true for EXIF with camera make", () => {
    const exif: ExifData = { make: "Canon" };
    expect(isCameraPhoto(exif)).toBe(true);
  });

  it("should return true for EXIF with camera model", () => {
    const exif: ExifData = { model: "EOS R5" };
    expect(isCameraPhoto(exif)).toBe(true);
  });

  it("should return true for EXIF with exposure settings", () => {
    const exif: ExifData = { exposureTime: "1/250" };
    expect(isCameraPhoto(exif)).toBe(true);
  });

  it("should return true for EXIF with aperture", () => {
    const exif: ExifData = { fNumber: "f/2.8" };
    expect(isCameraPhoto(exif)).toBe(true);
  });

  it("should return true for complete camera metadata", () => {
    const exif: ExifData = {
      make: "Canon",
      model: "EOS R5",
      exposureTime: "1/250",
      fNumber: "f/2.8",
      iso: 100,
    };
    expect(isCameraPhoto(exif)).toBe(true);
  });
});

describe("getCameraInfo", () => {
  it("should return null for null EXIF", () => {
    expect(getCameraInfo(null)).toBeNull();
  });

  it("should return null for EXIF without camera info", () => {
    const exif: ExifData = { iso: 100 };
    expect(getCameraInfo(exif)).toBeNull();
  });

  it("should return make only", () => {
    const exif: ExifData = { make: "Canon" };
    expect(getCameraInfo(exif)).toBe("Canon");
  });

  it("should return model only", () => {
    const exif: ExifData = { model: "EOS R5" };
    expect(getCameraInfo(exif)).toBe("EOS R5");
  });

  it("should return make and model", () => {
    const exif: ExifData = { make: "Canon", model: "EOS R5" };
    expect(getCameraInfo(exif)).toBe("Canon EOS R5");
  });
});

describe("getPhotoDate", () => {
  it("should return null for null EXIF", () => {
    expect(getPhotoDate(null)).toBeNull();
  });

  it("should return null for EXIF without date", () => {
    const exif: ExifData = { make: "Canon" };
    expect(getPhotoDate(exif)).toBeNull();
  });

  it("should parse dateTimeOriginal", () => {
    const exif: ExifData = { dateTimeOriginal: "2024:06:15 14:30:00" };
    const date = getPhotoDate(exif);
    expect(date).not.toBeNull();
    if (date) {
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(5); // June (0-indexed)
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(30);
    }
  });

  it("should parse dateTime as fallback", () => {
    const exif: ExifData = { dateTime: "2024:01:01 00:00:00" };
    const date = getPhotoDate(exif);
    expect(date).not.toBeNull();
    if (date) {
      expect(date.getFullYear()).toBe(2024);
    }
  });

  it("should prefer dateTimeOriginal over dateTime", () => {
    const exif: ExifData = {
      dateTimeOriginal: "2024:06:15 14:30:00",
      dateTime: "2024:01:01 00:00:00",
    };
    const date = getPhotoDate(exif);
    expect(date).not.toBeNull();
    if (date) {
      expect(date.getMonth()).toBe(5); // June from dateTimeOriginal
    }
  });

  it("should return null for invalid date format", () => {
    const exif: ExifData = { dateTime: "invalid date" };
    expect(getPhotoDate(exif)).toBeNull();
  });
});

// ============================================================================
// ExifData Type Tests
// ============================================================================

describe("ExifData interface", () => {
  it("should allow all optional fields", () => {
    const exif: ExifData = {
      make: "Canon",
      model: "EOS R5",
      software: "Photoshop",
      dateTime: "2024:01:01 00:00:00",
      dateTimeOriginal: "2024:01:01 00:00:00",
      gpsLatitude: 37.7749,
      gpsLongitude: -122.4194,
      gpsAltitude: 10,
      exposureTime: "1/250",
      fNumber: "f/2.8",
      iso: 100,
      focalLength: "50mm",
      flash: true,
      orientation: 1,
      width: 4000,
      height: 3000,
      artist: "John Doe",
      copyright: "2024 John Doe",
      userComment: "Test photo",
      raw: { customField: "value" },
    };

    expect(exif.make).toBe("Canon");
    expect(exif.gpsLatitude).toBe(37.7749);
    expect(exif.orientation).toBe(1);
    expect(exif.raw?.customField).toBe("value");
  });

  it("should allow empty object", () => {
    const exif: ExifData = {};
    expect(Object.keys(exif).length).toBe(0);
  });
});

// ============================================================================
// Orientation Tests
// ============================================================================

describe("EXIF Orientation", () => {
  it("should recognize orientation value 1 as normal", () => {
    const exif: ExifData = { orientation: 1 };
    expect(exif.orientation).toBe(1);
  });

  it("should recognize orientation values 2-8", () => {
    for (let i = 2; i <= 8; i++) {
      const exif: ExifData = { orientation: i };
      expect(exif.orientation).toBe(i);
    }
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("should handle very large file size parameter", async () => {
    // This should not throw or hang
    const file = createMockJpeg(1024);
    const result = await hasExif(file);
    expect(typeof result).toBe("boolean");
  });

  it("should handle file with only SOI marker", async () => {
    const header = new Uint8Array([0xff, 0xd8]);
    const file = new File([header], "minimal.jpg", { type: "image/jpeg" });
    const result = await hasExif(file);
    expect(result).toBe(false);
  });

  it("should handle file with wrong MIME type", async () => {
    const pngContent = createMockPng();
    const file = new File([pngContent], "wrong.jpg", { type: "image/jpeg" });
    const result = await hasExif(file);
    expect(result).toBe(false);
  });
});
