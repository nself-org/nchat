/**
 * Video Processor Tests
 *
 * Comprehensive unit tests for video processing utilities.
 */

import {
  detectFormatFromMime,
  detectFormatFromExtension,
  detectFormat,
  getMimeType,
  isFormatSupported,
  isVideo,
  loadVideo,
  createVideoElement,
  getVideoMetadata,
  getVideoDuration,
  getVideoDimensions,
  generateThumbnail,
  generateThumbnailAtPercentage,
  generateThumbnailDataUrl,
  generatePreviewFrames,
  generateAnimatedPreview,
  validateVideo,
  validateVideoSync,
  formatDuration,
  parseDuration,
  estimateFileSize,
  getRecommendedBitrate,
  createVideoUrl,
  revokeVideoUrl,
  canPlayFormat,
  getSupportedFormats,
  extractFrameImageData,
  DEFAULT_THUMBNAIL_TIME,
  DEFAULT_THUMBNAIL_QUALITY,
  DEFAULT_PREVIEW_FRAMES,
  MAX_VIDEO_DURATION,
  MAX_VIDEO_SIZE,
  VIDEO_MIME_TYPES,
  SUPPORTED_VIDEO_FORMATS,
  VideoFormat,
} from "../video-processor";

// ============================================================================
// Mock Setup
// ============================================================================

const mockContext = {
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1920,
    height: 1080,
  })),
  putImageData: jest.fn(),
  fillRect: jest.fn(),
};

HTMLCanvasElement.prototype.getContext = jest.fn(
  () => mockContext,
) as jest.Mock;
HTMLCanvasElement.prototype.toDataURL = jest.fn(
  () => "data:image/jpeg;base64,mockdata",
);
HTMLCanvasElement.prototype.toBlob = jest.fn((callback: BlobCallback) => {
  callback(new Blob(["mock"], { type: "image/jpeg" }));
});

global.URL.createObjectURL = jest.fn(() => "blob:mock-video-url-123");
global.URL.revokeObjectURL = jest.fn();

// Mock Video Element
class MockVideoElement {
  onloadedmetadata: (() => void) | null = null;
  onseeked: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = "";
  crossOrigin: string = "";
  preload: string = "";
  muted: boolean = false;
  playsInline: boolean = false;
  videoWidth: number = 1920;
  videoHeight: number = 1080;
  duration: number = 120;
  currentTime: number = 0;

  constructor() {
    setTimeout(() => {
      if (this.onloadedmetadata) this.onloadedmetadata();
    }, 0);
  }

  set _currentTime(value: number) {
    this.currentTime = value;
    setTimeout(() => {
      if (this.onseeked) this.onseeked();
    }, 0);
  }

  canPlayType(mimeType: string): string {
    if (mimeType === "video/mp4" || mimeType === "video/webm") {
      return "probably";
    }
    if (mimeType === "video/ogg") {
      return "maybe";
    }
    return "";
  }
}

// Overwrite the real setter with mock behavior
Object.defineProperty(MockVideoElement.prototype, "currentTime", {
  get() {
    return this._currentTimeValue || 0;
  },
  set(value) {
    this._currentTimeValue = value;
    setTimeout(() => {
      if (this.onseeked) this.onseeked();
    }, 0);
  },
});

document.createElement = jest.fn((tag: string) => {
  if (tag === "video") {
    return new MockVideoElement() as unknown as HTMLVideoElement;
  }
  if (tag === "canvas") {
    const canvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => mockContext),
      toBlob: jest.fn((callback: BlobCallback) => {
        callback(new Blob(["mock"], { type: "image/jpeg" }));
      }),
      toDataURL: jest.fn(() => "data:image/jpeg;base64,mockdata"),
    };
    return canvas as unknown as HTMLCanvasElement;
  }
  return {} as HTMLElement;
}) as jest.Mock;

// File Reader mock
class MockFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string = "data:image/jpeg;base64,mockdata";

  readAsDataURL() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

global.FileReader = MockFileReader as unknown as typeof FileReader;

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

describe("Video Processor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Format Detection Tests
  // ==========================================================================

  describe("Format Detection", () => {
    describe("detectFormatFromMime", () => {
      it("should detect MP4 format", () => {
        expect(detectFormatFromMime("video/mp4")).toBe("mp4");
      });

      it("should detect WebM format", () => {
        expect(detectFormatFromMime("video/webm")).toBe("webm");
      });

      it("should detect OGG format", () => {
        expect(detectFormatFromMime("video/ogg")).toBe("ogg");
      });

      it("should detect QuickTime format", () => {
        expect(detectFormatFromMime("video/quicktime")).toBe("quicktime");
      });

      it("should detect AVI format", () => {
        expect(detectFormatFromMime("video/x-msvideo")).toBe("avi");
        expect(detectFormatFromMime("video/avi")).toBe("avi");
      });

      it("should detect MKV format", () => {
        expect(detectFormatFromMime("video/x-matroska")).toBe("mkv");
      });

      it("should return unknown for unrecognized types", () => {
        expect(detectFormatFromMime("video/unknown")).toBe("unknown");
        expect(detectFormatFromMime("audio/mp3")).toBe("unknown");
      });

      it("should handle mime types with parameters", () => {
        expect(detectFormatFromMime('video/mp4; codecs="avc1"')).toBe("mp4");
      });

      it("should handle case-insensitive mime types", () => {
        expect(detectFormatFromMime("VIDEO/MP4")).toBe("mp4");
        expect(detectFormatFromMime("Video/WebM")).toBe("webm");
      });
    });

    describe("detectFormatFromExtension", () => {
      it("should detect .mp4 extension", () => {
        expect(detectFormatFromExtension("video.mp4")).toBe("mp4");
      });

      it("should detect .m4v extension as mp4", () => {
        expect(detectFormatFromExtension("video.m4v")).toBe("mp4");
      });

      it("should detect .webm extension", () => {
        expect(detectFormatFromExtension("video.webm")).toBe("webm");
      });

      it("should detect .ogg/.ogv extension", () => {
        expect(detectFormatFromExtension("video.ogg")).toBe("ogg");
        expect(detectFormatFromExtension("video.ogv")).toBe("ogg");
      });

      it("should detect .mov extension as quicktime", () => {
        expect(detectFormatFromExtension("video.mov")).toBe("quicktime");
      });

      it("should detect .avi extension", () => {
        expect(detectFormatFromExtension("video.avi")).toBe("avi");
      });

      it("should detect .mkv extension", () => {
        expect(detectFormatFromExtension("video.mkv")).toBe("mkv");
      });

      it("should handle uppercase extensions", () => {
        expect(detectFormatFromExtension("video.MP4")).toBe("mp4");
        expect(detectFormatFromExtension("video.WEBM")).toBe("webm");
      });

      it("should return unknown for unrecognized extensions", () => {
        expect(detectFormatFromExtension("file.txt")).toBe("unknown");
        expect(detectFormatFromExtension("video.xyz")).toBe("unknown");
      });

      it("should handle files with multiple dots", () => {
        expect(detectFormatFromExtension("my.cool.video.mp4")).toBe("mp4");
      });
    });

    describe("detectFormat", () => {
      it("should prioritize mime type over extension", () => {
        const file = createMockFile("video.avi", "video/mp4");
        expect(detectFormat(file)).toBe("mp4");
      });

      it("should fall back to extension if mime is unknown", () => {
        const file = createMockFile("video.webm", "application/octet-stream");
        expect(detectFormat(file)).toBe("webm");
      });
    });

    describe("getMimeType", () => {
      it("should return correct mime type for mp4", () => {
        expect(getMimeType("mp4")).toBe("video/mp4");
      });

      it("should return correct mime type for webm", () => {
        expect(getMimeType("webm")).toBe("video/webm");
      });

      it("should return correct mime type for quicktime", () => {
        expect(getMimeType("quicktime")).toBe("video/quicktime");
      });

      it("should return octet-stream for unknown", () => {
        expect(getMimeType("unknown")).toBe("application/octet-stream");
      });
    });

    describe("isFormatSupported", () => {
      it("should return true for supported formats", () => {
        expect(isFormatSupported("mp4")).toBe(true);
        expect(isFormatSupported("webm")).toBe(true);
        expect(isFormatSupported("ogg")).toBe(true);
        expect(isFormatSupported("quicktime")).toBe(true);
      });

      it("should return false for unsupported formats", () => {
        expect(isFormatSupported("avi")).toBe(false);
        expect(isFormatSupported("mkv")).toBe(false);
        expect(isFormatSupported("unknown")).toBe(false);
      });
    });

    describe("isVideo", () => {
      it("should return true for video mime types", () => {
        expect(isVideo("video/mp4")).toBe(true);
        expect(isVideo("video/webm")).toBe(true);
        expect(isVideo("video/quicktime")).toBe(true);
      });

      it("should return false for non-video mime types", () => {
        expect(isVideo("audio/mp3")).toBe(false);
        expect(isVideo("image/jpeg")).toBe(false);
        expect(isVideo("application/pdf")).toBe(false);
      });

      it("should be case-insensitive", () => {
        expect(isVideo("VIDEO/MP4")).toBe(true);
        expect(isVideo("Video/WebM")).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Video Loading Tests
  // ==========================================================================

  describe("Video Loading", () => {
    describe("loadVideo", () => {
      it("should load video from blob", async () => {
        const blob = createMockBlob("video/mp4");
        const video = await loadVideo(blob);
        expect(video).toBeDefined();
        expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      });

      it("should load video from file", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const video = await loadVideo(file);
        expect(video).toBeDefined();
      });

      it("should load video from URL", async () => {
        const video = await loadVideo("https://example.com/video.mp4");
        expect(video).toBeDefined();
        expect(video.crossOrigin).toBe("anonymous");
      });

      it("should revoke object URL after loading blob", async () => {
        const blob = createMockBlob("video/mp4");
        await loadVideo(blob);
        expect(URL.revokeObjectURL).toHaveBeenCalled();
      });
    });

    describe("createVideoElement", () => {
      it("should create video element from blob", () => {
        const blob = createMockBlob("video/mp4");
        const video = createVideoElement(blob);
        expect(video).toBeDefined();
        expect(video.preload).toBe("metadata");
        expect(video.muted).toBe(true);
      });

      it("should create video element from URL", () => {
        const video = createVideoElement("https://example.com/video.mp4");
        expect(video).toBeDefined();
        expect(video.crossOrigin).toBe("anonymous");
      });
    });
  });

  // ==========================================================================
  // Video Metadata Tests
  // ==========================================================================

  describe("Video Metadata", () => {
    describe("getVideoMetadata", () => {
      it("should return video metadata", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const metadata = await getVideoMetadata(file);
        expect(metadata.width).toBe(1920);
        expect(metadata.height).toBe(1080);
        expect(metadata.duration).toBe(120);
        expect(metadata.aspectRatio).toBeCloseTo(1920 / 1080);
      });

      it("should include hasAudio flag", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const metadata = await getVideoMetadata(file);
        expect(metadata.hasAudio).toBeDefined();
      });
    });

    describe("getVideoDuration", () => {
      it("should return video duration in seconds", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const duration = await getVideoDuration(file);
        expect(duration).toBe(120);
      });
    });

    describe("getVideoDimensions", () => {
      it("should return video dimensions", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const dimensions = await getVideoDimensions(file);
        expect(dimensions.width).toBe(1920);
        expect(dimensions.height).toBe(1080);
      });
    });
  });

  // ==========================================================================
  // Thumbnail Generation Tests
  // ==========================================================================

  describe("Thumbnail Generation", () => {
    describe("generateThumbnail", () => {
      it("should generate thumbnail with default options", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const blob = await generateThumbnail(file);
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should generate thumbnail at specific time", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const blob = await generateThumbnail(file, { time: 30 });
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should generate thumbnail with custom dimensions", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const blob = await generateThumbnail(file, {
          width: 320,
          height: 180,
        });
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should generate thumbnail with custom quality", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const blob = await generateThumbnail(file, { quality: 0.5 });
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should generate thumbnail with custom format", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const blob = await generateThumbnail(file, { format: "png" });
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should generate thumbnail in WebP format", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const blob = await generateThumbnail(file, { format: "webp" });
        expect(blob).toBeInstanceOf(Blob);
      });
    });

    describe("generateThumbnailAtPercentage", () => {
      it("should generate thumbnail at 50%", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const blob = await generateThumbnailAtPercentage(file, 50);
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should generate thumbnail at 0%", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const blob = await generateThumbnailAtPercentage(file, 0);
        expect(blob).toBeInstanceOf(Blob);
      });

      it("should generate thumbnail at 100%", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const blob = await generateThumbnailAtPercentage(file, 100);
        expect(blob).toBeInstanceOf(Blob);
      });
    });

    describe("generateThumbnailDataUrl", () => {
      it("should return data URL string", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const dataUrl = await generateThumbnailDataUrl(file);
        expect(dataUrl).toContain("data:image");
      });
    });
  });

  // ==========================================================================
  // Preview Generation Tests
  // ==========================================================================

  describe("Preview Generation", () => {
    describe("generatePreviewFrames", () => {
      it("should generate default number of frames", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const frames = await generatePreviewFrames(file);
        expect(frames.length).toBeLessThanOrEqual(DEFAULT_PREVIEW_FRAMES);
      });

      it("should generate custom number of frames", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const frames = await generatePreviewFrames(file, { frameCount: 3 });
        expect(frames.length).toBeLessThanOrEqual(3);
      });

      it("should generate frames with time information", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const frames = await generatePreviewFrames(file, { frameCount: 2 });
        frames.forEach((frame) => {
          expect(frame.time).toBeDefined();
          expect(frame.blob).toBeInstanceOf(Blob);
        });
      });

      it("should respect custom interval", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const frames = await generatePreviewFrames(file, {
          frameCount: 3,
          interval: 10,
        });
        expect(frames.length).toBeLessThanOrEqual(3);
      });
    });

    describe("generateAnimatedPreview", () => {
      it("should return array of data URLs", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const dataUrls = await generateAnimatedPreview(file, { frameCount: 2 });
        expect(Array.isArray(dataUrls)).toBe(true);
        dataUrls.forEach((url) => {
          expect(url).toContain("data:image");
        });
      });
    });
  });

  // ==========================================================================
  // Video Validation Tests
  // ==========================================================================

  describe("Video Validation", () => {
    describe("validateVideo", () => {
      it("should return valid for acceptable video", async () => {
        const file = createMockFile("test.mp4", "video/mp4", 1024 * 1024);
        const result = await validateVideo(file);
        expect(result.valid).toBe(true);
      });

      it("should return invalid for oversized video", async () => {
        const file = createMockFile(
          "test.mp4",
          "video/mp4",
          MAX_VIDEO_SIZE + 1,
        );
        const result = await validateVideo(file, { maxSize: MAX_VIDEO_SIZE });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("size");
      });

      it("should return invalid for disallowed format", async () => {
        const file = createMockFile("test.avi", "video/x-msvideo");
        const result = await validateVideo(file, {
          allowedFormats: ["mp4", "webm"],
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("format");
      });

      it("should validate allowed formats", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const result = await validateVideo(file, {
          allowedFormats: ["mp4", "webm"],
        });
        expect(result.valid).toBe(true);
      });

      it("should validate with all options", async () => {
        const file = createMockFile("test.mp4", "video/mp4", 1024 * 1024);
        const result = await validateVideo(file, {
          maxSize: 100 * 1024 * 1024,
          maxDuration: 300,
          allowedFormats: ["mp4", "webm"],
          minWidth: 640,
          minHeight: 480,
          maxWidth: 4096,
          maxHeight: 2160,
        });
        expect(result.valid).toBe(true);
      });
    });

    describe("validateVideoSync", () => {
      it("should return valid for acceptable video", () => {
        const file = createMockFile("test.mp4", "video/mp4", 1024 * 1024);
        const result = validateVideoSync(file);
        expect(result.valid).toBe(true);
      });

      it("should return invalid for oversized video", () => {
        const file = createMockFile(
          "test.mp4",
          "video/mp4",
          MAX_VIDEO_SIZE + 1,
        );
        const result = validateVideoSync(file, { maxSize: MAX_VIDEO_SIZE });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("size");
      });

      it("should return invalid for disallowed format", () => {
        const file = createMockFile("test.avi", "video/x-msvideo");
        const result = validateVideoSync(file, {
          allowedFormats: ["mp4", "webm"],
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("format");
      });
    });
  });

  // ==========================================================================
  // Utility Function Tests
  // ==========================================================================

  describe("Utility Functions", () => {
    describe("formatDuration", () => {
      it("should format seconds to MM:SS", () => {
        expect(formatDuration(65)).toBe("1:05");
        expect(formatDuration(0)).toBe("0:00");
        expect(formatDuration(59)).toBe("0:59");
      });

      it("should format to HH:MM:SS for long durations", () => {
        expect(formatDuration(3661)).toBe("1:01:01");
        expect(formatDuration(7200)).toBe("2:00:00");
      });

      it("should handle edge cases", () => {
        expect(formatDuration(-1)).toBe("0:00");
        expect(formatDuration(Infinity)).toBe("0:00");
        expect(formatDuration(NaN)).toBe("0:00");
      });

      it("should pad minutes and seconds", () => {
        expect(formatDuration(3601)).toBe("1:00:01");
        expect(formatDuration(3660)).toBe("1:01:00");
      });
    });

    describe("parseDuration", () => {
      it("should parse MM:SS format", () => {
        expect(parseDuration("1:05")).toBe(65);
        expect(parseDuration("0:00")).toBe(0);
        expect(parseDuration("10:30")).toBe(630);
      });

      it("should parse HH:MM:SS format", () => {
        expect(parseDuration("1:01:01")).toBe(3661);
        expect(parseDuration("2:00:00")).toBe(7200);
      });

      it("should parse single number as seconds", () => {
        expect(parseDuration("30")).toBe(30);
      });
    });

    describe("estimateFileSize", () => {
      it("should calculate file size from duration and bitrate", () => {
        const size = estimateFileSize(60, 5000); // 1 min at 5000kbps
        expect(size).toBeGreaterThan(0);
      });

      it("should return 0 for 0 duration", () => {
        expect(estimateFileSize(0, 5000)).toBe(0);
      });

      it("should scale linearly with duration", () => {
        const size1 = estimateFileSize(60, 5000);
        const size2 = estimateFileSize(120, 5000);
        expect(size2).toBe(size1 * 2);
      });
    });

    describe("getRecommendedBitrate", () => {
      it("should return 35000 for 4K", () => {
        expect(getRecommendedBitrate(3840, 2160)).toBe(35000);
      });

      it("should return 8000 for 1080p", () => {
        expect(getRecommendedBitrate(1920, 1080)).toBe(8000);
      });

      it("should return 5000 for 720p", () => {
        expect(getRecommendedBitrate(1280, 720)).toBe(5000);
      });

      it("should return 2500 for 480p", () => {
        expect(getRecommendedBitrate(854, 480)).toBe(2500);
      });

      it("should return 1000 for lower resolutions", () => {
        expect(getRecommendedBitrate(640, 360)).toBe(1000);
        expect(getRecommendedBitrate(320, 240)).toBe(1000);
      });
    });

    describe("createVideoUrl", () => {
      it("should create blob URL for file", () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const url = createVideoUrl(file);
        expect(url).toBe("blob:mock-video-url-123");
        expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      });

      it("should create blob URL for blob", () => {
        const blob = createMockBlob("video/mp4");
        const url = createVideoUrl(blob);
        expect(url).toBeDefined();
      });
    });

    describe("revokeVideoUrl", () => {
      it("should revoke blob URL", () => {
        revokeVideoUrl("blob:mock-video-url-123");
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(
          "blob:mock-video-url-123",
        );
      });
    });

    describe("canPlayFormat", () => {
      it("should return true for supported formats", () => {
        expect(canPlayFormat("mp4")).toBe(true);
        expect(canPlayFormat("webm")).toBe(true);
      });

      it("should return true for maybe-supported formats", () => {
        expect(canPlayFormat("ogg")).toBe(true);
      });

      it("should return false for unsupported formats", () => {
        expect(canPlayFormat("unknown")).toBe(false);
      });
    });

    describe("getSupportedFormats", () => {
      it("should return array of supported formats", () => {
        const formats = getSupportedFormats();
        expect(Array.isArray(formats)).toBe(true);
        expect(formats).toContain("mp4");
        expect(formats).toContain("webm");
      });

      it("should not include unknown format", () => {
        const formats = getSupportedFormats();
        expect(formats).not.toContain("unknown");
      });
    });

    describe("extractFrameImageData", () => {
      it("should extract frame as ImageData", async () => {
        const file = createMockFile("test.mp4", "video/mp4");
        const imageData = await extractFrameImageData(file, 10);
        expect(imageData).toBeDefined();
        expect(imageData.data).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    it("should have correct default thumbnail time", () => {
      expect(DEFAULT_THUMBNAIL_TIME).toBe(1);
    });

    it("should have correct default thumbnail quality", () => {
      expect(DEFAULT_THUMBNAIL_QUALITY).toBe(0.8);
    });

    it("should have correct default preview frames", () => {
      expect(DEFAULT_PREVIEW_FRAMES).toBe(5);
    });

    it("should have correct max video duration", () => {
      expect(MAX_VIDEO_DURATION).toBe(3600);
    });

    it("should have correct max video size", () => {
      expect(MAX_VIDEO_SIZE).toBe(500 * 1024 * 1024);
    });

    it("should have all expected MIME types", () => {
      expect(VIDEO_MIME_TYPES.mp4).toBe("video/mp4");
      expect(VIDEO_MIME_TYPES.webm).toBe("video/webm");
      expect(VIDEO_MIME_TYPES.ogg).toBe("video/ogg");
      expect(VIDEO_MIME_TYPES.quicktime).toBe("video/quicktime");
    });

    it("should have correct supported formats list", () => {
      expect(SUPPORTED_VIDEO_FORMATS).toContain("mp4");
      expect(SUPPORTED_VIDEO_FORMATS).toContain("webm");
      expect(SUPPORTED_VIDEO_FORMATS).toContain("ogg");
      expect(SUPPORTED_VIDEO_FORMATS).toContain("quicktime");
    });
  });
});
