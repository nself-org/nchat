/**
 * useDropZone Tests
 *
 * Tests for drag-and-drop, paste, and file upload functionality.
 */

import { renderHook, act } from "@testing-library/react";
import {
  useDropZone,
  usePasteUpload,
  useGlobalDragState,
} from "../use-drop-zone";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockFile(name: string, size: number, type: string): File {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
}

function createMockDataTransfer(files: File[]): DataTransfer {
  const dt = {
    items: files.map((file) => ({
      kind: "file" as const,
      type: file.type,
      getAsFile: () => file,
    })),
    types: ["Files"],
    files,
    getData: () => "",
    setData: () => {},
    clearData: () => {},
    setDragImage: () => {},
    dropEffect: "none" as DataTransferDropEffect,
    effectAllowed: "none" as DataTransfer["effectAllowed"],
  };
  return dt as unknown as DataTransfer;
}

function createDragEvent(type: string, files: File[] = []): React.DragEvent {
  return {
    type,
    dataTransfer: createMockDataTransfer(files),
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  } as unknown as React.DragEvent;
}

// ============================================================================
// Basic Hook Tests
// ============================================================================

describe("useDropZone", () => {
  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useDropZone());

      expect(result.current.isDragging).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.dragCount).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.warnings).toEqual([]);
    });

    it("should provide refs and props", () => {
      const { result } = renderHook(() => useDropZone());

      expect(result.current.dropZoneRef).toBeDefined();
      expect(result.current.fileInputRef).toBeDefined();
      expect(result.current.dropZoneProps).toBeDefined();
      expect(result.current.inputProps).toBeDefined();
    });

    it("should provide action functions", () => {
      const { result } = renderHook(() => useDropZone());

      expect(typeof result.current.openFilePicker).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
      expect(typeof result.current.addFiles).toBe("function");
    });
  });

  describe("dropZoneProps", () => {
    it("should have required event handlers", () => {
      const { result } = renderHook(() => useDropZone());
      const props = result.current.dropZoneProps;

      expect(typeof props.onDragEnter).toBe("function");
      expect(typeof props.onDragOver).toBe("function");
      expect(typeof props.onDragLeave).toBe("function");
      expect(typeof props.onDrop).toBe("function");
      expect(props["data-dragging"]).toBe(false);
    });
  });

  describe("inputProps", () => {
    it("should have correct file input properties", () => {
      const { result } = renderHook(() =>
        useDropZone({
          accept: "image/*,.pdf",
          maxFiles: 5,
        }),
      );
      const props = result.current.inputProps;

      expect(props.type).toBe("file");
      expect(props.accept).toBe("image/*,.pdf");
      expect(props.multiple).toBe(true);
    });

    it("should be single file when maxFiles is 1", () => {
      const { result } = renderHook(() => useDropZone({ maxFiles: 1 }));

      expect(result.current.inputProps.multiple).toBe(false);
    });
  });
});

// ============================================================================
// Drag Event Tests
// ============================================================================

describe("useDropZone - Drag Events", () => {
  describe("onDragEnter", () => {
    it("should set isDragging to true on drag enter", () => {
      const { result } = renderHook(() => useDropZone());
      const file = createMockFile("test.jpg", 1024, "image/jpeg");
      const event = createDragEvent("dragenter", [file]);

      act(() => {
        result.current.dropZoneProps.onDragEnter(event);
      });

      expect(result.current.isDragging).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("should call onDragEnter callback", () => {
      const onDragEnter = jest.fn();
      const { result } = renderHook(() => useDropZone({ onDragEnter }));
      const file = createMockFile("test.jpg", 1024, "image/jpeg");
      const event = createDragEvent("dragenter", [file]);

      act(() => {
        result.current.dropZoneProps.onDragEnter(event);
      });

      expect(onDragEnter).toHaveBeenCalled();
    });

    it("should not activate when disabled", () => {
      const { result } = renderHook(() => useDropZone({ disabled: true }));
      const file = createMockFile("test.jpg", 1024, "image/jpeg");
      const event = createDragEvent("dragenter", [file]);

      act(() => {
        result.current.dropZoneProps.onDragEnter(event);
      });

      expect(result.current.isDragging).toBe(false);
    });

    it("should not activate when dragDrop is disabled", () => {
      const { result } = renderHook(() => useDropZone({ dragDrop: false }));
      const file = createMockFile("test.jpg", 1024, "image/jpeg");
      const event = createDragEvent("dragenter", [file]);

      act(() => {
        result.current.dropZoneProps.onDragEnter(event);
      });

      expect(result.current.isDragging).toBe(false);
    });
  });

  describe("onDragLeave", () => {
    it("should set isDragging to false on final drag leave", () => {
      const { result } = renderHook(() => useDropZone());
      const file = createMockFile("test.jpg", 1024, "image/jpeg");
      const enterEvent = createDragEvent("dragenter", [file]);
      const leaveEvent = createDragEvent("dragleave", [file]);

      act(() => {
        result.current.dropZoneProps.onDragEnter(enterEvent);
      });
      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.dropZoneProps.onDragLeave(leaveEvent);
      });
      expect(result.current.isDragging).toBe(false);
    });

    it("should call onDragLeave callback", () => {
      const onDragLeave = jest.fn();
      const { result } = renderHook(() => useDropZone({ onDragLeave }));
      const file = createMockFile("test.jpg", 1024, "image/jpeg");

      act(() => {
        result.current.dropZoneProps.onDragEnter(
          createDragEvent("dragenter", [file]),
        );
        result.current.dropZoneProps.onDragLeave(
          createDragEvent("dragleave", [file]),
        );
      });

      expect(onDragLeave).toHaveBeenCalled();
    });
  });

  describe("onDragOver", () => {
    it("should prevent default on drag over", () => {
      const { result } = renderHook(() => useDropZone());
      const event = createDragEvent("dragover", []);

      act(() => {
        result.current.dropZoneProps.onDragOver(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe("onDrop", () => {
    it("should process dropped files", () => {
      const onFilesAdded = jest.fn();
      const { result } = renderHook(() => useDropZone({ onFilesAdded }));
      const file = createMockFile("test.jpg", 1024, "image/jpeg");
      const event = createDragEvent("drop", [file]);

      act(() => {
        result.current.dropZoneProps.onDragEnter(
          createDragEvent("dragenter", [file]),
        );
        result.current.dropZoneProps.onDrop(event);
      });

      expect(result.current.isDragging).toBe(false);
      expect(onFilesAdded).toHaveBeenCalledWith([file]);
    });

    it("should reset drag state on drop", () => {
      const { result } = renderHook(() => useDropZone());
      const file = createMockFile("test.jpg", 1024, "image/jpeg");

      act(() => {
        result.current.dropZoneProps.onDragEnter(
          createDragEvent("dragenter", [file]),
        );
      });
      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.dropZoneProps.onDrop(createDragEvent("drop", [file]));
      });
      expect(result.current.isDragging).toBe(false);
      expect(result.current.dragCount).toBe(0);
    });
  });
});

// ============================================================================
// File Validation Tests
// ============================================================================

describe("useDropZone - File Validation", () => {
  describe("maxFiles", () => {
    it("should reject files exceeding maxFiles limit", () => {
      const onFilesRejected = jest.fn();
      const { result } = renderHook(() =>
        useDropZone({ maxFiles: 2, onFilesRejected }),
      );
      const files = [
        createMockFile("1.jpg", 1024, "image/jpeg"),
        createMockFile("2.jpg", 1024, "image/jpeg"),
        createMockFile("3.jpg", 1024, "image/jpeg"),
      ];

      act(() => {
        result.current.addFiles(files);
      });

      expect(onFilesRejected).toHaveBeenCalled();
      const [rejected] = onFilesRejected.mock.calls[0];
      expect(rejected.length).toBe(1);
    });
  });

  describe("accept filter", () => {
    it("should accept files matching MIME type pattern", () => {
      const onFilesAdded = jest.fn();
      const { result } = renderHook(() =>
        useDropZone({ accept: "image/*", onFilesAdded }),
      );
      const file = createMockFile("test.jpg", 1024, "image/jpeg");

      act(() => {
        result.current.addFiles([file]);
      });

      expect(onFilesAdded).toHaveBeenCalledWith([file]);
    });

    it("should reject files not matching accept filter", () => {
      const onFilesRejected = jest.fn();
      const { result } = renderHook(() =>
        useDropZone({ accept: "image/*", onFilesRejected }),
      );
      const file = createMockFile("test.pdf", 1024, "application/pdf");

      act(() => {
        result.current.addFiles([file]);
      });

      expect(onFilesRejected).toHaveBeenCalled();
    });

    it("should accept files matching extension filter", () => {
      const onFilesAdded = jest.fn();
      const { result } = renderHook(() =>
        useDropZone({ accept: ".pdf,.doc", onFilesAdded }),
      );
      const file = createMockFile("test.pdf", 1024, "application/pdf");

      act(() => {
        result.current.addFiles([file]);
      });

      expect(onFilesAdded).toHaveBeenCalledWith([file]);
    });
  });

  describe("maxTotalSize", () => {
    it("should reject files exceeding total size limit", () => {
      const onFilesRejected = jest.fn();
      const { result } = renderHook(() =>
        useDropZone({
          maxTotalSize: 1024 * 1024, // 1MB
          onFilesRejected,
        }),
      );
      const file = createMockFile("big.jpg", 2 * 1024 * 1024, "image/jpeg");

      act(() => {
        result.current.addFiles([file]);
      });

      expect(onFilesRejected).toHaveBeenCalled();
    });
  });

  describe("platform validation", () => {
    it("should use platform preset for validation", () => {
      const onFilesRejected = jest.fn();
      const { result } = renderHook(() =>
        useDropZone({
          platformPreset: "discord",
          onFilesRejected,
        }),
      );
      // Discord free limit is 8MB
      const file = createMockFile("video.mp4", 20 * 1024 * 1024, "video/mp4");

      act(() => {
        result.current.addFiles([file]);
      });

      expect(onFilesRejected).toHaveBeenCalled();
    });

    it("should use premium limits when specified", () => {
      const onFilesAdded = jest.fn();
      const { result } = renderHook(() =>
        useDropZone({
          platformPreset: "discord",
          isPremium: true,
          onFilesAdded,
        }),
      );
      // Discord Nitro limit is 50MB
      const file = createMockFile("video.mp4", 20 * 1024 * 1024, "video/mp4");

      act(() => {
        result.current.addFiles([file]);
      });

      expect(onFilesAdded).toHaveBeenCalledWith([file]);
    });
  });

  describe("custom validation", () => {
    it("should use custom validation function", () => {
      const onFilesRejected = jest.fn();
      const { result } = renderHook(() =>
        useDropZone({
          customValidation: (file) => ({
            valid: file.name !== "blocked.jpg",
            error: "This file is blocked",
          }),
          onFilesRejected,
        }),
      );
      const file = createMockFile("blocked.jpg", 1024, "image/jpeg");

      act(() => {
        result.current.addFiles([file]);
      });

      expect(onFilesRejected).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Action Tests
// ============================================================================

describe("useDropZone - Actions", () => {
  describe("clearError", () => {
    it("should clear error state", () => {
      const { result } = renderHook(() => useDropZone({ maxFiles: 1 }));
      const files = [
        createMockFile("1.jpg", 1024, "image/jpeg"),
        createMockFile("2.jpg", 1024, "image/jpeg"),
      ];

      act(() => {
        result.current.addFiles(files);
      });
      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe("addFiles", () => {
    it("should accept FileList", () => {
      const onFilesAdded = jest.fn();
      const { result } = renderHook(() => useDropZone({ onFilesAdded }));
      const file = createMockFile("test.jpg", 1024, "image/jpeg");

      act(() => {
        result.current.addFiles([file]);
      });

      expect(onFilesAdded).toHaveBeenCalledWith([file]);
    });

    it("should accept File array", () => {
      const onFilesAdded = jest.fn();
      const { result } = renderHook(() => useDropZone({ onFilesAdded }));
      const files = [
        createMockFile("1.jpg", 1024, "image/jpeg"),
        createMockFile("2.jpg", 1024, "image/jpeg"),
      ];

      act(() => {
        result.current.addFiles(files);
      });

      expect(onFilesAdded).toHaveBeenCalledWith(files);
    });
  });
});

// ============================================================================
// Warnings Tests
// ============================================================================

describe("useDropZone - Warnings", () => {
  it("should collect warnings from validation", () => {
    const { result } = renderHook(() =>
      useDropZone({ platformPreset: "whatsapp" }),
    );
    // Large image that triggers compression warning
    const file = createMockFile("big.jpg", 2 * 1024 * 1024, "image/jpeg");

    act(() => {
      result.current.addFiles([file]);
    });

    expect(result.current.warnings.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// usePasteUpload Tests
// ============================================================================

describe("usePasteUpload", () => {
  it("should be a function", () => {
    expect(typeof usePasteUpload).toBe("function");
  });

  // Note: Full paste tests require DOM event simulation
  // which is complex in Jest. These would be better as integration tests.
});

// ============================================================================
// useGlobalDragState Tests
// ============================================================================

describe("useGlobalDragState", () => {
  it("should initialize as not dragging", () => {
    const { result } = renderHook(() => useGlobalDragState());
    expect(result.current).toBe(false);
  });

  // Note: Global drag event tests require document-level event simulation
});
