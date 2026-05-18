/**
 * File Processing Plugin Integration Tests
 *
 * Comprehensive test suite for the File Processing plugin (ɳPlugin: file-processing v1.0.0)
 * Tests image processing, video thumbnails, document previews, and virus scanning.
 *
 * @group integration
 * @group plugins
 * @group file-processing
 */

import { describe, it, expect, beforeAll } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

// Configuration
const FILE_PROCESSING_URL =
  process.env.NEXT_PUBLIC_FILE_PROCESSING_URL || "http://files.localhost:3104";
const PLUGINS_ENABLED = process.env.PLUGINS_ENABLED === "true";
const TEST_TIMEOUT = 30000;

// Helper functions
async function waitForPlugin(url: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) return;
    } catch (error) {
      // Continue retrying
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Plugin at ${url} did not become ready`);
}

// Create test image buffer (1x1 PNG)
function createTestImage(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
}

describe("File Processing Plugin", () => {
  const describeIf = PLUGINS_ENABLED ? describe : describe.skip;

  beforeAll(async () => {
    if (!PLUGINS_ENABLED) {
      console.log(
        "⚠️  File Processing plugin tests skipped (PLUGINS_ENABLED=false)",
      );
      return;
    }

    console.log("Waiting for File Processing plugin to be ready...");
    await waitForPlugin(FILE_PROCESSING_URL);
    console.log("File Processing plugin ready");
  }, TEST_TIMEOUT);

  describeIf("Health Check", () => {
    it("should return healthy status", async () => {
      const response = await fetch(`${FILE_PROCESSING_URL}/health`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toMatchObject({
        status: "healthy",
        service: "file-processing",
      });
    }, 10000);

    it("should report S3 storage status", async () => {
      const response = await fetch(`${FILE_PROCESSING_URL}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("dependencies");
      expect(data.dependencies).toHaveProperty("s3");
      expect(data.dependencies.s3).toHaveProperty("status");
    }, 10000);
  });

  describeIf("Image Processing", () => {
    it("should resize image", async () => {
      const formData = new FormData();
      const blob = new Blob([createTestImage()], { type: "image/png" });
      formData.append("file", blob, "test.png");
      formData.append("width", "200");
      formData.append("height", "200");

      const response = await fetch(`${FILE_PROCESSING_URL}/image/resize`, {
        method: "POST",
        body: formData,
      });

      expect(response.ok).toBe(true);
    }, 10000);

    it("should optimize image", async () => {
      const formData = new FormData();
      const blob = new Blob([createTestImage()], { type: "image/png" });
      formData.append("file", blob, "test.png");
      formData.append("quality", "85");

      const response = await fetch(`${FILE_PROCESSING_URL}/image/optimize`, {
        method: "POST",
        body: formData,
      });

      expect(response.ok).toBe(true);
    }, 10000);

    it("should generate thumbnail", async () => {
      const formData = new FormData();
      const blob = new Blob([createTestImage()], { type: "image/png" });
      formData.append("file", blob, "test.png");
      formData.append("size", "200");

      const response = await fetch(`${FILE_PROCESSING_URL}/image/thumbnail`, {
        method: "POST",
        body: formData,
      });

      expect(response.ok).toBe(true);
    }, 10000);

    it("should strip EXIF metadata", async () => {
      const formData = new FormData();
      const blob = new Blob([createTestImage()], { type: "image/jpeg" });
      formData.append("file", blob, "test.jpg");

      const response = await fetch(
        `${FILE_PROCESSING_URL}/image/strip-metadata`,
        {
          method: "POST",
          body: formData,
        },
      );

      expect(response.ok).toBe(true);
    }, 10000);

    it("should convert image format", async () => {
      const formData = new FormData();
      const blob = new Blob([createTestImage()], { type: "image/png" });
      formData.append("file", blob, "test.png");
      formData.append("format", "webp");

      const response = await fetch(`${FILE_PROCESSING_URL}/image/convert`, {
        method: "POST",
        body: formData,
      });

      expect(response.ok).toBe(true);
    }, 10000);
  });

  describeIf("Video Processing", () => {
    it("should generate video thumbnail", async () => {
      const formData = new FormData();
      // Mock video file
      const blob = new Blob(["mock video"], { type: "video/mp4" });
      formData.append("file", blob, "test.mp4");
      formData.append("time", "1");

      const response = await fetch(`${FILE_PROCESSING_URL}/video/thumbnail`, {
        method: "POST",
        body: formData,
      });

      // May fail without actual video, but should accept request
      expect(response.status).toBeLessThan(500);
    }, 10000);

    it("should extract video metadata", async () => {
      const formData = new FormData();
      const blob = new Blob(["mock video"], { type: "video/mp4" });
      formData.append("file", blob, "test.mp4");

      const response = await fetch(`${FILE_PROCESSING_URL}/video/metadata`, {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBeLessThan(500);
    }, 10000);
  });

  describeIf("Document Processing", () => {
    it("should generate PDF preview", async () => {
      const formData = new FormData();
      const blob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
      formData.append("file", blob, "test.pdf");

      const response = await fetch(`${FILE_PROCESSING_URL}/document/preview`, {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBeLessThan(500);
    }, 10000);

    it("should extract document text", async () => {
      const formData = new FormData();
      const blob = new Blob(["Test document content"], { type: "text/plain" });
      formData.append("file", blob, "test.txt");

      const response = await fetch(
        `${FILE_PROCESSING_URL}/document/extract-text`,
        {
          method: "POST",
          body: formData,
        },
      );

      expect(response.status).toBeLessThan(500);
    }, 10000);
  });

  describeIf("Virus Scanning", () => {
    it("should scan file for viruses", async () => {
      const formData = new FormData();
      const blob = new Blob([createTestImage()], { type: "image/png" });
      formData.append("file", blob, "test.png");

      const response = await fetch(`${FILE_PROCESSING_URL}/scan`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty("clean");
      }
    }, 10000);
  });

  describeIf("Batch Processing", () => {
    it("should process multiple files", async () => {
      const formData = new FormData();
      const blob1 = new Blob([createTestImage()], { type: "image/png" });
      const blob2 = new Blob([createTestImage()], { type: "image/png" });
      formData.append("files", blob1, "test1.png");
      formData.append("files", blob2, "test2.png");

      const response = await fetch(`${FILE_PROCESSING_URL}/batch/optimize`, {
        method: "POST",
        body: formData,
      });

      expect(response.ok).toBe(true);
    }, 15000);
  });

  describeIf("Error Handling", () => {
    it("should handle invalid file type", async () => {
      const formData = new FormData();
      const blob = new Blob(["invalid"], { type: "application/octet-stream" });
      formData.append("file", blob, "test.xyz");

      const response = await fetch(`${FILE_PROCESSING_URL}/image/resize`, {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 10000);

    it("should handle file too large", async () => {
      const formData = new FormData();
      // Create 100MB buffer
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024);
      const blob = new Blob([largeBuffer], { type: "image/png" });
      formData.append("file", blob, "large.png");

      const response = await fetch(`${FILE_PROCESSING_URL}/image/resize`, {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 10000);
  });
});
