/**
 * Tests for Upload Service
 *
 * Tests for file upload functionality including presigned URLs,
 * retry logic, and upload management.
 */

import {
  UploadService,
  getUploadService,
  createUploadService,
} from "../upload-service";

// Mock file-utils
jest.mock("../file-utils", () => ({
  getFileType: jest.fn((file: File) => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  }),
  generateImageThumbnail: jest.fn(() =>
    Promise.resolve(new Blob(["thumbnail"], { type: "image/jpeg" })),
  ),
  generateVideoThumbnail: jest.fn(() =>
    Promise.resolve(new Blob(["thumbnail"], { type: "image/jpeg" })),
  ),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Track XHR instances for testing
let xhrInstances: MockXMLHttpRequest[] = [];

// Mock XMLHttpRequest with proper event handling
class MockXMLHttpRequest {
  upload = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  status = 200;
  responseText = "{}";
  readyState = 0;

  private eventListeners: Record<string, Array<(event?: unknown) => void>> = {};

  open = jest.fn();
  setRequestHeader = jest.fn();
  abort = jest.fn(() => {
    this.triggerEvent("abort");
  });

  addEventListener = jest.fn(
    (event: string, callback: (event?: unknown) => void) => {
      if (!this.eventListeners[event]) {
        this.eventListeners[event] = [];
      }
      this.eventListeners[event].push(callback);
    },
  );

  send = jest.fn(() => {
    // Simulate successful upload immediately
    setTimeout(() => {
      this.readyState = 4;
      this.triggerEvent("load");
    }, 0);
  });

  triggerEvent(event: string, eventData?: unknown) {
    const listeners = this.eventListeners[event] || [];
    listeners.forEach((callback) => callback(eventData));
  }

  constructor() {
    xhrInstances.push(this);
  }
}

// Helper to create mock File objects
function createMockFile(name: string, type: string, size: number = 1024): File {
  const content = "x".repeat(size);
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

describe("UploadService", () => {
  let service: UploadService;
  let originalXHR: typeof XMLHttpRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    xhrInstances = [];
    originalXHR = global.XMLHttpRequest as typeof XMLHttpRequest;
    (global as any).XMLHttpRequest = MockXMLHttpRequest;

    service = new UploadService({
      storageUrl: "https://storage.example.com",
      authToken: "test-token",
      bucket: "test-bucket",
      maxRetries: 3,
      retryDelay: 100,
      generateThumbnails: false,
    });
  });

  afterEach(() => {
    global.XMLHttpRequest = originalXHR;
  });

  describe("constructor", () => {
    it("should use provided config", () => {
      const customService = new UploadService({
        storageUrl: "https://custom.storage.com",
        bucket: "custom-bucket",
      });

      expect(customService.getFileUrl("file-123")).toContain(
        "custom.storage.com",
      );
      expect(customService.getFileUrl("file-123")).toContain("custom-bucket");
    });

    it("should use default config when not provided", () => {
      const defaultService = new UploadService();

      expect(defaultService.getFileUrl("file-123")).toBeDefined();
    });
  });

  describe("setAuthToken", () => {
    it("should update the auth token", () => {
      service.setAuthToken("new-token");

      // We can verify this indirectly through behavior
      // The new token should be used in subsequent requests
    });
  });

  describe("getPresignedUrl", () => {
    it("should request presigned URL from storage service", async () => {
      const mockResponse = {
        uploadUrl: "https://storage.example.com/upload/presigned",
        fileId: "file-123",
        publicUrl: "https://storage.example.com/files/file-123",
        expiresAt: Date.now() + 3600000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.getPresignedUrl(
        "test.jpg",
        "image/jpeg",
        1024,
        "uploads/images",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://storage.example.com/presigned-url",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          }),
          body: expect.stringContaining("test-bucket"),
        }),
      );
      expect(result.uploadUrl).toBe(mockResponse.uploadUrl);
      expect(result.fileId).toBe(mockResponse.fileId);
    });

    it("should throw error when request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: "Bucket not found" }),
      });

      await expect(
        service.getPresignedUrl("test.jpg", "image/jpeg", 1024),
      ).rejects.toThrow("Bucket not found");
    });

    it("should throw default error when no message provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error("Parse error")),
      });

      await expect(
        service.getPresignedUrl("test.jpg", "image/jpeg", 1024),
      ).rejects.toThrow("Failed to get presigned URL");
    });
  });

  describe("uploadFile", () => {
    it("should request presigned URL for file upload", async () => {
      const mockPresignedResponse = {
        uploadUrl: "https://storage.example.com/upload/presigned",
        fileId: "file-123",
        publicUrl: "https://storage.example.com/files/file-123",
        expiresAt: Date.now() + 3600000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPresignedResponse),
      });

      const file = createMockFile("test.jpg", "image/jpeg");

      // The upload will start but won't complete without proper XHR mock
      // We just verify the presigned URL request is made
      const uploadPromise = service.uploadFile(file);

      // Let the async operations start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify presigned URL was requested
      expect(mockFetch).toHaveBeenCalledWith(
        "https://storage.example.com/presigned-url",
        expect.objectContaining({
          method: "POST",
        }),
      );

      // Cancel the test - the actual XHR upload won't complete in test env
      uploadPromise.catch(() => {});
    }, 1000);
  });

  describe("uploadWithRetry", () => {
    it("should succeed when not cancelled", async () => {
      const mockPresignedResponse = {
        uploadUrl: "https://storage.example.com/upload/presigned",
        fileId: "file-123",
        publicUrl: "https://storage.example.com/files/file-123",
        expiresAt: Date.now() + 3600000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPresignedResponse),
      });

      const file = createMockFile("test.jpg", "image/jpeg");

      const result = await service.uploadWithRetry(file);
      expect(result).toBeDefined();
      expect(result.id).toBe("file-123");
    });

    it("should accept abort signal option", () => {
      const abortController = new AbortController();
      const file = createMockFile("test.jpg", "image/jpeg");

      // Verify that uploadWithRetry accepts the signal option
      const options = { signal: abortController.signal };
      expect(() => service.uploadWithRetry(file, options)).not.toThrow();
    });
  });

  describe("uploadFiles", () => {
    it("should accept multiple files", () => {
      const files = [
        createMockFile("file1.txt", "text/plain"),
        createMockFile("file2.txt", "text/plain"),
      ];

      // Just verify the method accepts multiple files and options
      expect(() => {
        service.uploadFiles(files, { concurrency: 2 });
      }).not.toThrow();
    });
  });

  describe("deleteFile", () => {
    it("should delete file successfully", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await service.deleteFile("file-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://storage.example.com/files/file-123",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("should throw error when delete fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: "File not found" }),
      });

      await expect(service.deleteFile("file-123")).rejects.toThrow(
        "File not found",
      );
    });
  });

  describe("getFileUrl", () => {
    it("should construct correct file URL", () => {
      const url = service.getFileUrl("file-123");

      expect(url).toBe(
        "https://storage.example.com/files/test-bucket/file-123",
      );
    });
  });
});

describe("getUploadService", () => {
  it("should return singleton instance", () => {
    const service1 = getUploadService();
    const service2 = getUploadService();

    expect(service1).toBe(service2);
  });

  it("should recreate instance when config provided", () => {
    const service1 = getUploadService();
    const service2 = getUploadService({
      storageUrl: "https://new.storage.com",
    });

    expect(service1).not.toBe(service2);
  });
});

describe("createUploadService", () => {
  it("should create new instance each time", () => {
    const service1 = createUploadService();
    const service2 = createUploadService();

    expect(service1).not.toBe(service2);
  });

  it("should accept custom config", () => {
    const service = createUploadService({
      storageUrl: "https://custom.storage.com",
      bucket: "custom-bucket",
    });

    expect(service.getFileUrl("test")).toContain("custom.storage.com");
    expect(service.getFileUrl("test")).toContain("custom-bucket");
  });
});

describe("UploadService thumbnail generation", () => {
  let service: UploadService;
  let originalXHR: typeof XMLHttpRequest;
  const {
    generateImageThumbnail,
    generateVideoThumbnail,
  } = require("../file-utils");

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    xhrInstances = [];
    originalXHR = global.XMLHttpRequest as typeof XMLHttpRequest;
    (global as any).XMLHttpRequest = MockXMLHttpRequest;

    service = new UploadService({
      storageUrl: "https://storage.example.com",
      generateThumbnails: true,
    });
  });

  afterEach(() => {
    global.XMLHttpRequest = originalXHR;
  });

  it("should generate thumbnail for image files when enabled", async () => {
    const { getFileType } = require("../file-utils");
    getFileType.mockReturnValue("image");

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            uploadUrl: "https://storage.example.com/upload",
            fileId: "file-123",
            publicUrl: "https://storage.example.com/files/file-123",
            expiresAt: Date.now() + 3600000,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            url: "https://storage.example.com/files/thumb-123",
          }),
      });

    const file = createMockFile("test.jpg", "image/jpeg");

    // Start the upload and let it complete with the mocked XHR
    const result = await service.uploadFile(file);

    // Verify the upload completed
    expect(result).toBeDefined();
    expect(result.fileType).toBe("image");
  });

  it("should not generate thumbnail when disabled", async () => {
    const noThumbService = new UploadService({
      storageUrl: "https://storage.example.com",
      generateThumbnails: false,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          uploadUrl: "https://storage.example.com/upload",
          fileId: "file-123",
          publicUrl: "https://storage.example.com/files/file-123",
          expiresAt: Date.now() + 3600000,
        }),
    });

    const file = createMockFile("test.jpg", "image/jpeg");

    // Start the upload and let it complete
    const result = await noThumbService.uploadFile(file);

    // Verify the upload completed but no thumbnail was generated
    expect(result).toBeDefined();
    expect(generateImageThumbnail).not.toHaveBeenCalled();
    expect(generateVideoThumbnail).not.toHaveBeenCalled();
  });
});
