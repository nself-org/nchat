/**
 * Image Processor Tests
 *
 * Comprehensive unit tests for image processing utilities.
 */

import {
  detectFormatFromMime,
  detectFormatFromExtension,
  detectFormat,
  getMimeType,
  supportsTransparency,
  supportsAnimation,
  loadImage,
  getImageDimensions,
  calculateScaledDimensions,
  calculateThumbnailDimensions,
  imageToCanvas,
  canvasToBlob,
  canvasToDataUrl,
  resizeImage,
  generateThumbnail,
  cropImage,
  rotateImage,
  flipImage,
  convertFormat,
  convertToWebP,
  optimizeImage,
  compressImage,
  extractExifData,
  getImageMetadata,
  needsResize,
  estimateCompressedSize,
  validateImageFile,
  createImageUrl,
  revokeImageUrl,
  isBlobUrl,
  DEFAULT_JPEG_QUALITY,
  DEFAULT_THUMBNAIL_SIZE,
  IMAGE_MIME_TYPES,
  ImageFormat,
} from "../image-processor";

// ============================================================================
// Mock Setup
// ============================================================================

const mockContext = {
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: jest.fn(),
  fillRect: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  imageSmoothingEnabled: true,
  imageSmoothingQuality: "high" as ImageSmoothingQuality,
};

HTMLCanvasElement.prototype.getContext = jest.fn(
  () => mockContext,
) as jest.Mock;
HTMLCanvasElement.prototype.toDataURL = jest.fn(
  () => "data:image/png;base64,mockdata",
);
HTMLCanvasElement.prototype.toBlob = jest.fn((callback: BlobCallback) => {
  callback(new Blob(["mock"], { type: "image/jpeg" }));
});

global.URL.createObjectURL = jest.fn(() => "blob:mock-url-123");
global.URL.revokeObjectURL = jest.fn();

// Mock Image
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = "";
  crossOrigin: string = "";
  naturalWidth: number = 800;
  naturalHeight: number = 600;

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

(global as unknown as { Image: typeof MockImage }).Image = MockImage;

// Create test file helpers
function createMockFile(name: string, type: string, size: number = 1024): File {
  const blob = new Blob([new ArrayBuffer(size)], { type });
  return new File([blob], name, { type });
}

function createMockBlob(type: string, size: number = 1024): Blob {
  return new Blob([new ArrayBuffer(size)], { type });
}

// ============================================================================
// Tests
// ============================================================================

describe("Image Processor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Format Detection Tests
  // ==========================================================================

  describe("Format Detection", () => {
    describe("detectFormatFromMime", () => {
      it("should detect JPEG format from mime type", () => {
        expect(detectFormatFromMime("image/jpeg")).toBe("jpeg");
        expect(detectFormatFromMime("image/jpg")).toBe("jpeg");
      });

      it("should detect PNG format from mime type", () => {
        expect(detectFormatFromMime("image/png")).toBe("png");
      });

      it("should detect WebP format from mime type", () => {
        expect(detectFormatFromMime("image/webp")).toBe("webp");
      });

      it("should detect GIF format from mime type", () => {
        expect(detectFormatFromMime("image/gif")).toBe("gif");
      });

      it("should detect BMP format from mime type", () => {
        expect(detectFormatFromMime("image/bmp")).toBe("bmp");
      });

      it("should detect SVG format from mime type", () => {
        expect(detectFormatFromMime("image/svg+xml")).toBe("svg");
      });

      it("should return unknown for unrecognized mime types", () => {
        expect(detectFormatFromMime("image/unknown")).toBe("unknown");
        expect(detectFormatFromMime("application/pdf")).toBe("unknown");
      });

      it("should handle mime types with parameters", () => {
        expect(detectFormatFromMime("image/jpeg; charset=utf-8")).toBe("jpeg");
      });

      it("should handle case-insensitive mime types", () => {
        expect(detectFormatFromMime("IMAGE/JPEG")).toBe("jpeg");
        expect(detectFormatFromMime("Image/Png")).toBe("png");
      });
    });

    describe("detectFormatFromExtension", () => {
      it("should detect format from .jpg extension", () => {
        expect(detectFormatFromExtension("image.jpg")).toBe("jpeg");
      });

      it("should detect format from .jpeg extension", () => {
        expect(detectFormatFromExtension("image.jpeg")).toBe("jpeg");
      });

      it("should detect format from .png extension", () => {
        expect(detectFormatFromExtension("image.png")).toBe("png");
      });

      it("should detect format from .webp extension", () => {
        expect(detectFormatFromExtension("image.webp")).toBe("webp");
      });

      it("should detect format from .gif extension", () => {
        expect(detectFormatFromExtension("image.gif")).toBe("gif");
      });

      it("should detect format from .bmp extension", () => {
        expect(detectFormatFromExtension("image.bmp")).toBe("bmp");
      });

      it("should detect format from .svg extension", () => {
        expect(detectFormatFromExtension("image.svg")).toBe("svg");
      });

      it("should handle uppercase extensions", () => {
        expect(detectFormatFromExtension("image.JPG")).toBe("jpeg");
        expect(detectFormatFromExtension("image.PNG")).toBe("png");
      });

      it("should return unknown for unrecognized extensions", () => {
        expect(detectFormatFromExtension("file.txt")).toBe("unknown");
        expect(detectFormatFromExtension("file.pdf")).toBe("unknown");
      });

      it("should handle files with multiple dots", () => {
        expect(detectFormatFromExtension("my.image.file.jpg")).toBe("jpeg");
      });

      it("should handle files with no extension", () => {
        expect(detectFormatFromExtension("noextension")).toBe("unknown");
      });
    });

    describe("detectFormat", () => {
      it("should prioritize mime type over extension", () => {
        const file = createMockFile("image.gif", "image/jpeg");
        expect(detectFormat(file)).toBe("jpeg");
      });

      it("should fall back to extension if mime is unknown", () => {
        const file = createMockFile("image.png", "application/octet-stream");
        expect(detectFormat(file)).toBe("png");
      });

      it("should detect format from valid jpeg file", () => {
        const file = createMockFile("photo.jpg", "image/jpeg");
        expect(detectFormat(file)).toBe("jpeg");
      });
    });

    describe("getMimeType", () => {
      it("should return correct mime type for jpeg", () => {
        expect(getMimeType("jpeg")).toBe("image/jpeg");
      });

      it("should return correct mime type for png", () => {
        expect(getMimeType("png")).toBe("image/png");
      });

      it("should return correct mime type for webp", () => {
        expect(getMimeType("webp")).toBe("image/webp");
      });

      it("should return correct mime type for gif", () => {
        expect(getMimeType("gif")).toBe("image/gif");
      });

      it("should return correct mime type for svg", () => {
        expect(getMimeType("svg")).toBe("image/svg+xml");
      });

      it("should return octet-stream for unknown", () => {
        expect(getMimeType("unknown")).toBe("application/octet-stream");
      });
    });

    describe("supportsTransparency", () => {
      it("should return true for PNG", () => {
        expect(supportsTransparency("png")).toBe(true);
      });

      it("should return true for WebP", () => {
        expect(supportsTransparency("webp")).toBe(true);
      });

      it("should return true for GIF", () => {
        expect(supportsTransparency("gif")).toBe(true);
      });

      it("should return true for SVG", () => {
        expect(supportsTransparency("svg")).toBe(true);
      });

      it("should return false for JPEG", () => {
        expect(supportsTransparency("jpeg")).toBe(false);
      });

      it("should return false for BMP", () => {
        expect(supportsTransparency("bmp")).toBe(false);
      });
    });

    describe("supportsAnimation", () => {
      it("should return true for GIF", () => {
        expect(supportsAnimation("gif")).toBe(true);
      });

      it("should return true for WebP", () => {
        expect(supportsAnimation("webp")).toBe(true);
      });

      it("should return false for JPEG", () => {
        expect(supportsAnimation("jpeg")).toBe(false);
      });

      it("should return false for PNG", () => {
        expect(supportsAnimation("png")).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Dimension Calculation Tests
  // ==========================================================================

  describe("Dimension Calculations", () => {
    describe("calculateScaledDimensions", () => {
      it("should scale down landscape image to fit", () => {
        const result = calculateScaledDimensions(
          1920,
          1080,
          800,
          600,
          "contain",
        );
        expect(result.width).toBeLessThanOrEqual(800);
        expect(result.height).toBeLessThanOrEqual(600);
      });

      it("should scale down portrait image to fit", () => {
        const result = calculateScaledDimensions(
          1080,
          1920,
          800,
          600,
          "contain",
        );
        expect(result.width).toBeLessThanOrEqual(800);
        expect(result.height).toBeLessThanOrEqual(600);
      });

      it("should not upscale images in contain mode", () => {
        const result = calculateScaledDimensions(400, 300, 800, 600, "contain");
        expect(result.width).toBe(400);
        expect(result.height).toBe(300);
      });

      it("should fill exact dimensions in fill mode", () => {
        const result = calculateScaledDimensions(1920, 1080, 800, 600, "fill");
        expect(result.width).toBe(800);
        expect(result.height).toBe(600);
      });

      it("should cover in cover mode", () => {
        const result = calculateScaledDimensions(1920, 1080, 800, 600, "cover");
        expect(result.width).toBeGreaterThanOrEqual(800);
        expect(result.height).toBeGreaterThanOrEqual(600);
      });

      it("should preserve aspect ratio in contain mode", () => {
        const original = 1920 / 1080;
        const result = calculateScaledDimensions(
          1920,
          1080,
          800,
          600,
          "contain",
        );
        const scaled = result.width / result.height;
        expect(Math.abs(original - scaled)).toBeLessThan(0.01);
      });
    });

    describe("calculateThumbnailDimensions", () => {
      it("should calculate thumbnail for landscape image", () => {
        const result = calculateThumbnailDimensions(800, 600, 200);
        expect(result.width).toBe(200);
        expect(result.height).toBe(150);
      });

      it("should calculate thumbnail for portrait image", () => {
        const result = calculateThumbnailDimensions(600, 800, 200);
        expect(result.width).toBe(150);
        expect(result.height).toBe(200);
      });

      it("should calculate thumbnail for square image", () => {
        const result = calculateThumbnailDimensions(500, 500, 200);
        expect(result.width).toBe(200);
        expect(result.height).toBe(200);
      });

      it("should not upscale small images", () => {
        const result = calculateThumbnailDimensions(100, 80, 200);
        expect(result.width).toBe(100);
        expect(result.height).toBe(80);
      });

      it("should use default thumbnail size", () => {
        const result = calculateThumbnailDimensions(800, 600);
        expect(result.width).toBe(DEFAULT_THUMBNAIL_SIZE);
      });
    });
  });

  // ==========================================================================
  // Image Loading Tests
  // ==========================================================================

  describe("Image Loading", () => {
    describe("loadImage", () => {
      it("should load image from blob", async () => {
        const blob = createMockBlob("image/jpeg");
        const img = await loadImage(blob);
        expect(img).toBeDefined();
        expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      });

      it("should load image from file", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const img = await loadImage(file);
        expect(img).toBeDefined();
      });

      it("should load image from URL string", async () => {
        const img = await loadImage("https://example.com/image.jpg");
        expect(img).toBeDefined();
        expect(img.crossOrigin).toBe("anonymous");
      });

      it("should revoke object URL after loading blob", async () => {
        const blob = createMockBlob("image/jpeg");
        await loadImage(blob);
        expect(URL.revokeObjectURL).toHaveBeenCalled();
      });
    });

    describe("getImageDimensions", () => {
      it("should return image dimensions from blob", async () => {
        const blob = createMockBlob("image/jpeg");
        const dimensions = await getImageDimensions(blob);
        expect(dimensions.width).toBe(800);
        expect(dimensions.height).toBe(600);
        expect(dimensions.aspectRatio).toBeCloseTo(800 / 600);
      });

      it("should return dimensions from file", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const dimensions = await getImageDimensions(file);
        expect(dimensions.width).toBeDefined();
        expect(dimensions.height).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Canvas Operations Tests
  // ==========================================================================

  describe("Canvas Operations", () => {
    describe("imageToCanvas", () => {
      it("should create canvas from image", async () => {
        const blob = createMockBlob("image/jpeg");
        const img = await loadImage(blob);
        const canvas = imageToCanvas(img);
        expect(canvas).toBeDefined();
        expect(canvas.width).toBe(800);
        expect(canvas.height).toBe(600);
      });

      it("should create canvas with custom dimensions", async () => {
        const blob = createMockBlob("image/jpeg");
        const img = await loadImage(blob);
        const canvas = imageToCanvas(img, 400, 300);
        expect(canvas.width).toBe(400);
        expect(canvas.height).toBe(300);
      });

      it("should draw image on canvas", async () => {
        const blob = createMockBlob("image/jpeg");
        const img = await loadImage(blob);
        imageToCanvas(img);
        expect(mockContext.drawImage).toHaveBeenCalled();
      });
    });

    describe("canvasToBlob", () => {
      it("should convert canvas to JPEG blob", async () => {
        const canvas = document.createElement("canvas");
        const blob = await canvasToBlob(canvas, "jpeg", 0.8);
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should convert canvas to PNG blob", async () => {
        const canvas = document.createElement("canvas");
        const blob = await canvasToBlob(canvas, "png");
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should convert canvas to WebP blob", async () => {
        const canvas = document.createElement("canvas");
        const blob = await canvasToBlob(canvas, "webp", 0.8);
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should use default quality for JPEG", async () => {
        const canvas = document.createElement("canvas");
        await canvasToBlob(canvas, "jpeg");
        expect(canvas.toBlob).toHaveBeenCalledWith(
          expect.any(Function),
          "image/jpeg",
          DEFAULT_JPEG_QUALITY,
        );
      });
    });

    describe("canvasToDataUrl", () => {
      it("should convert canvas to data URL", () => {
        const canvas = document.createElement("canvas");
        const dataUrl = canvasToDataUrl(canvas, "jpeg", 0.8);
        expect(dataUrl).toContain("data:image");
      });

      it("should convert canvas to PNG data URL", () => {
        const canvas = document.createElement("canvas");
        const dataUrl = canvasToDataUrl(canvas, "png");
        expect(dataUrl).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Image Resizing Tests
  // ==========================================================================

  describe("Image Resizing", () => {
    describe("resizeImage", () => {
      it("should resize image with default options", async () => {
        const file = createMockFile("test.jpg", "image/jpeg", 1024 * 1024);
        const blob = await resizeImage(file);
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should resize image with custom dimensions", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await resizeImage(file, {
          maxWidth: 400,
          maxHeight: 300,
        });
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should resize image with custom quality", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await resizeImage(file, { quality: 0.5 });
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should resize image with custom format", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await resizeImage(file, { format: "webp" });
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should preserve aspect ratio by default", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await resizeImage(file, {
          maxWidth: 400,
          maxHeight: 400,
          preserveAspectRatio: true,
        });
        expect(blob).toBeInstanceOf(Blob);
      });
    });

    describe("generateThumbnail", () => {
      it("should generate thumbnail with default size", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await generateThumbnail(file);
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should generate thumbnail with custom width", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await generateThumbnail(file, { width: 100 });
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should generate thumbnail with custom height", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await generateThumbnail(file, { height: 100 });
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should generate thumbnail with custom quality", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await generateThumbnail(file, { quality: 0.5 });
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should generate thumbnail with custom format", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await generateThumbnail(file, { format: "webp" });
        expect(blob).toBeInstanceOf(Blob);
      });
    });
  });

  // ==========================================================================
  // Image Transformation Tests
  // ==========================================================================

  describe("Image Transformation", () => {
    describe("cropImage", () => {
      it("should crop image with specified area", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await cropImage(file, {
          x: 100,
          y: 100,
          width: 200,
          height: 200,
        });
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should crop image with custom format", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await cropImage(
          file,
          { x: 0, y: 0, width: 100, height: 100 },
          { format: "png" },
        );
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should crop image with custom quality", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await cropImage(
          file,
          { x: 0, y: 0, width: 100, height: 100 },
          { quality: 0.9 },
        );
        expect(blob).toBeInstanceOf(Blob);
      });
    });

    describe("rotateImage", () => {
      it("should rotate image by 90 degrees", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await rotateImage(file, 90);
        expect(blob).toBeInstanceOf(Blob);
        expect(mockContext.rotate).toHaveBeenCalled();
      });

      it("should rotate image by 180 degrees", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await rotateImage(file, 180);
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should rotate image by 270 degrees", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await rotateImage(file, 270);
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should rotate image with custom format", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await rotateImage(file, 45, { format: "png" });
        expect(blob).toBeInstanceOf(Blob);
      });
    });

    describe("flipImage", () => {
      it("should flip image horizontally", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await flipImage(file, "horizontal");
        expect(blob).toBeInstanceOf(Blob);
        expect(mockContext.scale).toHaveBeenCalledWith(-1, 1);
      });

      it("should flip image vertically", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await flipImage(file, "vertical");
        expect(blob).toBeInstanceOf(Blob);
        expect(mockContext.scale).toHaveBeenCalledWith(1, -1);
      });

      it("should flip image with custom format", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await flipImage(file, "horizontal", { format: "webp" });
        expect(blob).toBeInstanceOf(Blob);
      });
    });
  });

  // ==========================================================================
  // Format Conversion Tests
  // ==========================================================================

  describe("Format Conversion", () => {
    describe("convertFormat", () => {
      it("should convert JPEG to PNG", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await convertFormat(file, "png");
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should convert JPEG to WebP", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await convertFormat(file, "webp");
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should convert PNG to JPEG", async () => {
        const file = createMockFile("test.png", "image/png");
        const blob = await convertFormat(file, "jpeg");
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should convert with custom quality", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await convertFormat(file, "webp", 0.5);
        expect(blob).toBeInstanceOf(Blob);
      });
    });

    describe("convertToWebP", () => {
      it("should convert image to WebP", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await convertToWebP(file);
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should convert with custom quality", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await convertToWebP(file, 0.5);
        expect(blob).toBeInstanceOf(Blob);
      });
    });
  });

  // ==========================================================================
  // Image Optimization Tests
  // ==========================================================================

  describe("Image Optimization", () => {
    describe("optimizeImage", () => {
      it("should return optimization result", async () => {
        const file = createMockFile("test.jpg", "image/jpeg", 1024 * 1024);
        const result = await optimizeImage(file);
        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.originalSize).toBe(1024 * 1024);
        expect(result.optimizedSize).toBeDefined();
        expect(result.compressionRatio).toBeDefined();
      });

      it("should optimize with custom dimensions", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const result = await optimizeImage(file, {
          maxWidth: 800,
          maxHeight: 600,
        });
        expect(result.blob).toBeInstanceOf(Blob);
      });

      it("should optimize with custom quality", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const result = await optimizeImage(file, { quality: 0.5 });
        expect(result.blob).toBeInstanceOf(Blob);
      });

      it("should optimize with custom format", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const result = await optimizeImage(file, { format: "webp" });
        expect(result.blob).toBeInstanceOf(Blob);
      });
    });

    describe("compressImage", () => {
      it("should compress image with default quality", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await compressImage(file);
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should compress image with custom quality", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await compressImage(file, 0.5);
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should compress image with custom format", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const blob = await compressImage(file, 0.8, "webp");
        expect(blob).toBeInstanceOf(Blob);
      });
    });
  });

  // ==========================================================================
  // EXIF and Metadata Tests
  // ==========================================================================

  describe("EXIF and Metadata", () => {
    describe("extractExifData", () => {
      it("should return null for non-JPEG files", async () => {
        const file = createMockFile("test.png", "image/png");
        const exif = await extractExifData(file);
        expect(exif).toBeNull();
      });

      it("should handle files without EXIF data", async () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const exif = await extractExifData(file);
        // Should return null or empty object depending on implementation
        expect(exif === null || typeof exif === "object").toBe(true);
      });
    });

    describe("getImageMetadata", () => {
      it("should return comprehensive metadata", async () => {
        const file = createMockFile("test.jpg", "image/jpeg", 50000);
        const metadata = await getImageMetadata(file);
        expect(metadata.width).toBe(800);
        expect(metadata.height).toBe(600);
        expect(metadata.aspectRatio).toBeCloseTo(800 / 600);
        expect(metadata.format).toBe("jpeg");
        expect(metadata.hasAlpha).toBe(false);
        expect(metadata.fileSize).toBe(50000);
      });

      it("should detect alpha support for PNG", async () => {
        const file = createMockFile("test.png", "image/png");
        const metadata = await getImageMetadata(file);
        expect(metadata.hasAlpha).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Utility Function Tests
  // ==========================================================================

  describe("Utility Functions", () => {
    describe("needsResize", () => {
      it("should return true when width exceeds max", () => {
        expect(needsResize(1920, 1080, 800, 600)).toBe(true);
      });

      it("should return true when height exceeds max", () => {
        expect(needsResize(800, 1200, 800, 600)).toBe(true);
      });

      it("should return false when within limits", () => {
        expect(needsResize(400, 300, 800, 600)).toBe(false);
      });

      it("should return false when exactly at limits", () => {
        expect(needsResize(800, 600, 800, 600)).toBe(false);
      });
    });

    describe("estimateCompressedSize", () => {
      it("should estimate smaller size for WebP", () => {
        const original = 1000000;
        const estimated = estimateCompressedSize(original, 0.8, "webp");
        expect(estimated).toBeLessThan(original);
      });

      it("should estimate smaller size for JPEG", () => {
        const original = 1000000;
        const estimated = estimateCompressedSize(original, 0.8, "jpeg");
        expect(estimated).toBeLessThan(original);
      });

      it("should estimate similar size for PNG", () => {
        const original = 1000000;
        const estimated = estimateCompressedSize(original, 1.0, "png");
        expect(estimated).toBeLessThanOrEqual(original);
      });

      it("should factor in quality", () => {
        const original = 1000000;
        const highQuality = estimateCompressedSize(original, 0.9, "jpeg");
        const lowQuality = estimateCompressedSize(original, 0.5, "jpeg");
        expect(lowQuality).toBeLessThan(highQuality);
      });
    });

    describe("validateImageFile", () => {
      it("should return valid for acceptable file", () => {
        const file = createMockFile("test.jpg", "image/jpeg", 1000);
        const result = validateImageFile(file, { maxSize: 10000 });
        expect(result.valid).toBe(true);
      });

      it("should return invalid for oversized file", () => {
        const file = createMockFile("test.jpg", "image/jpeg", 10000);
        const result = validateImageFile(file, { maxSize: 5000 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("size");
      });

      it("should return invalid for disallowed format", () => {
        const file = createMockFile("test.gif", "image/gif");
        const result = validateImageFile(file, {
          allowedFormats: ["jpeg", "png"],
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("format");
      });

      it("should return valid when no restrictions", () => {
        const file = createMockFile("test.jpg", "image/jpeg", 10000000);
        const result = validateImageFile(file);
        expect(result.valid).toBe(true);
      });

      it("should validate allowed formats correctly", () => {
        const jpegFile = createMockFile("test.jpg", "image/jpeg");
        const result = validateImageFile(jpegFile, {
          allowedFormats: ["jpeg", "png", "webp"],
        });
        expect(result.valid).toBe(true);
      });
    });

    describe("createImageUrl", () => {
      it("should create blob URL for file", () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const url = createImageUrl(file);
        expect(url).toBe("blob:mock-url-123");
        expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      });

      it("should create blob URL for blob", () => {
        const blob = createMockBlob("image/jpeg");
        const url = createImageUrl(blob);
        expect(url).toBeDefined();
      });
    });

    describe("revokeImageUrl", () => {
      it("should revoke blob URL", () => {
        revokeImageUrl("blob:mock-url-123");
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url-123");
      });
    });

    describe("isBlobUrl", () => {
      it("should return true for blob URLs", () => {
        expect(isBlobUrl("blob:http://localhost/12345")).toBe(true);
        expect(isBlobUrl("blob:mock-url")).toBe(true);
      });

      it("should return false for regular URLs", () => {
        expect(isBlobUrl("https://example.com/image.jpg")).toBe(false);
        expect(isBlobUrl("http://localhost/image.png")).toBe(false);
        expect(isBlobUrl("/path/to/image.jpg")).toBe(false);
      });

      it("should return false for data URLs", () => {
        expect(isBlobUrl("data:image/png;base64,abc123")).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    it("should have correct default JPEG quality", () => {
      expect(DEFAULT_JPEG_QUALITY).toBe(0.85);
    });

    it("should have correct default thumbnail size", () => {
      expect(DEFAULT_THUMBNAIL_SIZE).toBe(200);
    });

    it("should have all expected MIME types", () => {
      expect(IMAGE_MIME_TYPES.jpeg).toBe("image/jpeg");
      expect(IMAGE_MIME_TYPES.png).toBe("image/png");
      expect(IMAGE_MIME_TYPES.webp).toBe("image/webp");
      expect(IMAGE_MIME_TYPES.gif).toBe("image/gif");
      expect(IMAGE_MIME_TYPES.bmp).toBe("image/bmp");
      expect(IMAGE_MIME_TYPES.svg).toBe("image/svg+xml");
    });
  });
});
