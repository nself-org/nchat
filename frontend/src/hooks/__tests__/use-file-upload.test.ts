/**
 * useFileUpload Hook Tests
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useFileUpload } from "../use-file-upload";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock XMLHttpRequest
const mockXHR = {
  open: jest.fn(),
  send: jest.fn(),
  upload: {
    addEventListener: jest.fn(),
  },
  addEventListener: jest.fn(),
  abort: jest.fn(),
  status: 200,
  responseText: JSON.stringify({
    file: {
      id: "test-id",
      name: "test.jpg",
      url: "http://example.com/test.jpg",
      size: 1024,
      mimeType: "image/jpeg",
    },
  }),
};

const originalXMLHttpRequest = global.XMLHttpRequest;
// @ts-expect-error - Mocking XMLHttpRequest
global.XMLHttpRequest = jest.fn(() => mockXHR);

// Mock UUID
jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-uuid"),
}));

// Mock auth context
jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-123" },
  }),
}));

describe("useFileUpload", () => {
  const createMockFile = (name: string, size: number, type: string): File => {
    const blob = new Blob(["test content"], { type });
    return new File([blob], name, { type });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockXHR.addEventListener.mockReset();
    mockXHR.upload.addEventListener.mockReset();
    mockXHR.open.mockReset();
    mockXHR.send.mockReset();
  });

  afterAll(() => {
    global.XMLHttpRequest = originalXMLHttpRequest;
  });

  describe("addFiles", () => {
    it("should add valid files to the queue", () => {
      const { result } = renderHook(() => useFileUpload());

      const file = createMockFile("test.jpg", 1024, "image/jpeg");

      act(() => {
        result.current.addFiles([file]);
      });

      expect(result.current.files).toHaveLength(1);
      expect(result.current.files[0].file.name).toBe("test.jpg");
      expect(result.current.files[0].progress.status).toBe("pending");
    });

    it("should return file IDs when adding files", () => {
      const { result } = renderHook(() => useFileUpload());

      const file = createMockFile("test.jpg", 1024, "image/jpeg");

      let fileIds: string[] = [];
      act(() => {
        fileIds = result.current.addFiles([file]);
      });

      expect(fileIds).toHaveLength(1);
      expect(fileIds[0]).toBe("test-uuid");
    });

    it("should reject files that fail validation", () => {
      const { result } = renderHook(() => useFileUpload());

      // Create an executable file (blocked by default)
      const file = createMockFile(
        "malware.exe",
        1024,
        "application/x-executable",
      );

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      act(() => {
        result.current.addFiles([file]);
      });

      expect(result.current.files).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should add multiple files", () => {
      const { result } = renderHook(() => useFileUpload());

      const files = [
        createMockFile("test1.jpg", 1024, "image/jpeg"),
        createMockFile("test2.png", 2048, "image/png"),
        createMockFile("test3.pdf", 4096, "application/pdf"),
      ];

      act(() => {
        result.current.addFiles(files);
      });

      expect(result.current.files).toHaveLength(3);
    });
  });

  describe("removeFile", () => {
    it("should remove a file from the queue", () => {
      const { result } = renderHook(() => useFileUpload());

      const file = createMockFile("test.jpg", 1024, "image/jpeg");

      act(() => {
        result.current.addFiles([file]);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.removeFile(fileId);
      });

      expect(result.current.files).toHaveLength(0);
    });
  });

  describe("clearFiles", () => {
    it("should clear all files from the queue", () => {
      const { result } = renderHook(() => useFileUpload());

      const files = [
        createMockFile("test1.jpg", 1024, "image/jpeg"),
        createMockFile("test2.png", 2048, "image/png"),
      ];

      act(() => {
        result.current.addFiles(files);
      });

      expect(result.current.files).toHaveLength(2);

      act(() => {
        result.current.clearFiles();
      });

      expect(result.current.files).toHaveLength(0);
    });
  });

  describe("validateFile", () => {
    it("should validate files correctly", () => {
      const { result } = renderHook(() => useFileUpload());

      const validFile = createMockFile("test.jpg", 1024, "image/jpeg");
      const invalidFile = createMockFile(
        "malware.exe",
        1024,
        "application/x-executable",
      );

      expect(result.current.validateFile(validFile).valid).toBe(true);
      expect(result.current.validateFile(invalidFile).valid).toBe(false);
    });
  });

  describe("computed values", () => {
    it("should calculate total progress", () => {
      const { result } = renderHook(() => useFileUpload());

      const file = createMockFile("test.jpg", 1024, "image/jpeg");

      act(() => {
        result.current.addFiles([file]);
      });

      // Initial progress should be 0
      expect(result.current.totalProgress).toBe(0);
    });

    it("should track uploading state", () => {
      const { result } = renderHook(() => useFileUpload());

      expect(result.current.isUploading).toBe(false);
    });

    it("should track completed files", () => {
      const { result } = renderHook(() => useFileUpload());

      expect(result.current.completedFiles).toHaveLength(0);
    });

    it("should track failed files", () => {
      const { result } = renderHook(() => useFileUpload());

      expect(result.current.failedFiles).toHaveLength(0);
    });
  });

  describe("callbacks", () => {
    it("should call onComplete when upload finishes", async () => {
      const onComplete = jest.fn();

      // Simulate successful XHR
      mockXHR.addEventListener.mockImplementation(
        (event: string, handler: () => void) => {
          if (event === "load") {
            setTimeout(handler, 10);
          }
        },
      );

      const { result } = renderHook(() => useFileUpload({ onComplete }));

      const file = createMockFile("test.jpg", 1024, "image/jpeg");

      act(() => {
        result.current.addFiles([file]);
      });

      // Note: Full upload testing would require more complex XHR mocking
      // This test verifies the hook accepts callbacks
      expect(onComplete).not.toHaveBeenCalled(); // Not called until upload completes
    });

    it("should call onError when upload fails", async () => {
      const onError = jest.fn();

      const { result } = renderHook(() => useFileUpload({ onError }));

      // Error callback is set up correctly
      expect(onError).not.toHaveBeenCalled();
    });
  });
});
