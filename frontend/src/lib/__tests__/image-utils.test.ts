/**
 * Tests for image utilities
 */

import { validateImageFile, formatFileSize } from "../image-utils";

describe("Image Utilities", () => {
  describe("validateImageFile", () => {
    it("should accept valid image files", () => {
      const validFile = new File([""], "test.jpg", { type: "image/jpeg" });
      const result = validateImageFile(validFile);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept PNG files", () => {
      const pngFile = new File([""], "test.png", { type: "image/png" });
      expect(validateImageFile(pngFile).valid).toBe(true);
    });

    it("should accept WebP files", () => {
      const webpFile = new File([""], "test.webp", { type: "image/webp" });
      expect(validateImageFile(webpFile).valid).toBe(true);
    });

    it("should accept GIF files", () => {
      const gifFile = new File([""], "test.gif", { type: "image/gif" });
      expect(validateImageFile(gifFile).valid).toBe(true);
    });

    it("should reject non-image files", () => {
      const textFile = new File([""], "test.txt", { type: "text/plain" });
      const result = validateImageFile(textFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be an image");
    });

    it("should reject unsupported image formats", () => {
      const bmpFile = new File([""], "test.bmp", { type: "image/bmp" });
      const result = validateImageFile(bmpFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unsupported");
    });

    it("should reject files larger than 10MB", () => {
      const largeData = new ArrayBuffer(11 * 1024 * 1024); // 11MB
      const largeFile = new File([largeData], "large.jpg", {
        type: "image/jpeg",
      });
      const result = validateImageFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("smaller than 10MB");
    });

    it("should accept files at max size", () => {
      const maxData = new ArrayBuffer(10 * 1024 * 1024); // Exactly 10MB
      const maxFile = new File([maxData], "max.jpg", { type: "image/jpeg" });
      const result = validateImageFile(maxFile);
      expect(result.valid).toBe(true);
    });
  });

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
      expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
    });

    it("should format gigabytes", () => {
      expect(formatFileSize(1073741824)).toBe("1 GB");
    });

    it("should handle zero bytes", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("should round to 2 decimal places", () => {
      const result = formatFileSize(1536);
      expect(result).toMatch(/^\d+(\.\d{1,2})? KB$/);
    });
  });
});
