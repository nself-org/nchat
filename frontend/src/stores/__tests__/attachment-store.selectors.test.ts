/**
 * Tests for attachment-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  AttachmentStore,
  AttachmentState,
  UploadProgress,
  UploadQueueItem,
} from "../attachment-store";
import {
  selectAllUploads,
  selectUploadsByChannel,
  selectUploadsByThread,
  selectPendingUploads,
  selectCompletedUploads,
  selectFailedUploads,
  selectUploadProgress,
  selectIsUploading,
  selectQueueLength,
  selectDragActive,
  selectTotalUploadProgress,
  formatFileSize,
  getFileIcon,
  getFileExtension,
  isPreviewable,
  estimateTimeRemaining,
} from "../attachment-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUpload(overrides?: Partial<UploadProgress>): UploadProgress {
  return {
    id: "u1",
    file: new File([""], "test.txt", { type: "text/plain" }),
    fileName: "test.txt",
    fileSize: 1024,
    fileType: "document",
    mimeType: "text/plain",
    status: "pending",
    progress: 0,
    uploadedBytes: 0,
    error: null,
    retryCount: 0,
    maxRetries: 3,
    channelId: null,
    threadId: null,
    messageId: null,
    previewUrl: null,
    thumbnailUrl: null,
    uploadedUrl: null,
    uploadedId: null,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    ...overrides,
  } as UploadProgress;
}

function makeQueueItem(overrides?: Partial<UploadQueueItem>): UploadQueueItem {
  return {
    id: "u1",
    priority: 0,
    addedAt: Date.now(),
    ...overrides,
  };
}

function makeState(overrides?: Partial<AttachmentState>): AttachmentStore {
  const defaultState: AttachmentState = {
    uploads: new Map(),
    queue: [],
    activeUploads: new Set(),
    maxConcurrentUploads: 3,
    maxFileSize: 50 * 1024 * 1024,
    maxFilesPerMessage: 10,
    allowedFileTypes: [],
    dragActive: false,
    previewModalOpen: false,
    previewModalFileId: null,
    totalUploaded: 0,
    totalFailed: 0,
  };
  return { ...defaultState, ...overrides } as unknown as AttachmentStore;
}

// ---------------------------------------------------------------------------
// selectAllUploads
// ---------------------------------------------------------------------------

describe("selectAllUploads", () => {
  it("returns empty array when no uploads", () => {
    expect(selectAllUploads(makeState())).toEqual([]);
  });

  it("returns all uploads as array", () => {
    const u1 = makeUpload({ id: "u1" });
    const u2 = makeUpload({ id: "u2" });
    const uploads = new Map([
      ["u1", u1],
      ["u2", u2],
    ]);
    const result = selectAllUploads(makeState({ uploads }));
    expect(result).toHaveLength(2);
    const ids = result.map((u) => u.id);
    expect(ids).toContain("u1");
    expect(ids).toContain("u2");
  });
});

// ---------------------------------------------------------------------------
// selectUploadsByChannel
// ---------------------------------------------------------------------------

describe("selectUploadsByChannel", () => {
  it("returns empty array when no uploads", () => {
    const selector = selectUploadsByChannel("ch1");
    expect(selector(makeState())).toEqual([]);
  });

  it("returns uploads for the specified channel", () => {
    const u1 = makeUpload({ id: "u1", channelId: "ch1" });
    const u2 = makeUpload({ id: "u2", channelId: "ch2" });
    const uploads = new Map([
      ["u1", u1],
      ["u2", u2],
    ]);
    const selector = selectUploadsByChannel("ch1");
    const result = selector(makeState({ uploads }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("u1");
  });

  it("returns empty array when no uploads match the channel", () => {
    const u1 = makeUpload({ id: "u1", channelId: "ch1" });
    const uploads = new Map([["u1", u1]]);
    const selector = selectUploadsByChannel("ch99");
    expect(selector(makeState({ uploads }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectUploadsByThread
// ---------------------------------------------------------------------------

describe("selectUploadsByThread", () => {
  it("returns empty array when no uploads", () => {
    const selector = selectUploadsByThread("t1");
    expect(selector(makeState())).toEqual([]);
  });

  it("returns uploads for the specified thread", () => {
    const u1 = makeUpload({ id: "u1", threadId: "t1" });
    const u2 = makeUpload({ id: "u2", threadId: "t2" });
    const uploads = new Map([
      ["u1", u1],
      ["u2", u2],
    ]);
    const selector = selectUploadsByThread("t1");
    const result = selector(makeState({ uploads }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("u1");
  });
});

// ---------------------------------------------------------------------------
// selectPendingUploads
// ---------------------------------------------------------------------------

describe("selectPendingUploads", () => {
  it("returns empty array when no uploads", () => {
    expect(selectPendingUploads(makeState())).toEqual([]);
  });

  it("includes pending, queued, and uploading status", () => {
    const u1 = makeUpload({ id: "u1", status: "pending" });
    const u2 = makeUpload({ id: "u2", status: "queued" });
    const u3 = makeUpload({ id: "u3", status: "uploading" });
    const u4 = makeUpload({ id: "u4", status: "completed" });
    const u5 = makeUpload({ id: "u5", status: "failed" });
    const uploads = new Map([
      ["u1", u1],
      ["u2", u2],
      ["u3", u3],
      ["u4", u4],
      ["u5", u5],
    ]);
    const result = selectPendingUploads(makeState({ uploads }));
    expect(result).toHaveLength(3);
    const ids = result.map((u) => u.id);
    expect(ids).toContain("u1");
    expect(ids).toContain("u2");
    expect(ids).toContain("u3");
  });
});

// ---------------------------------------------------------------------------
// selectCompletedUploads
// ---------------------------------------------------------------------------

describe("selectCompletedUploads", () => {
  it("returns empty array when no uploads", () => {
    expect(selectCompletedUploads(makeState())).toEqual([]);
  });

  it("returns only completed uploads", () => {
    const u1 = makeUpload({ id: "u1", status: "completed" });
    const u2 = makeUpload({ id: "u2", status: "pending" });
    const uploads = new Map([
      ["u1", u1],
      ["u2", u2],
    ]);
    const result = selectCompletedUploads(makeState({ uploads }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("u1");
  });
});

// ---------------------------------------------------------------------------
// selectFailedUploads
// ---------------------------------------------------------------------------

describe("selectFailedUploads", () => {
  it("returns empty array when no uploads", () => {
    expect(selectFailedUploads(makeState())).toEqual([]);
  });

  it("returns only failed uploads", () => {
    const u1 = makeUpload({
      id: "u1",
      status: "failed",
      error: "Network error",
    });
    const u2 = makeUpload({ id: "u2", status: "completed" });
    const uploads = new Map([
      ["u1", u1],
      ["u2", u2],
    ]);
    const result = selectFailedUploads(makeState({ uploads }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("u1");
  });
});

// ---------------------------------------------------------------------------
// selectUploadProgress
// ---------------------------------------------------------------------------

describe("selectUploadProgress", () => {
  it("returns undefined when upload not found", () => {
    const selector = selectUploadProgress("missing");
    expect(selector(makeState())).toBeUndefined();
  });

  it("returns the upload progress for the given id", () => {
    const u1 = makeUpload({ id: "u1", progress: 50 });
    const uploads = new Map([["u1", u1]]);
    const selector = selectUploadProgress("u1");
    const result = selector(makeState({ uploads }));
    expect(result).toBeDefined();
    expect(result?.progress).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// selectIsUploading
// ---------------------------------------------------------------------------

describe("selectIsUploading", () => {
  it("returns false when no active uploads", () => {
    expect(selectIsUploading(makeState())).toBe(false);
  });

  it("returns true when there are active uploads", () => {
    const activeUploads = new Set(["u1"]);
    expect(selectIsUploading(makeState({ activeUploads }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectQueueLength
// ---------------------------------------------------------------------------

describe("selectQueueLength", () => {
  it("returns 0 when queue is empty", () => {
    expect(selectQueueLength(makeState())).toBe(0);
  });

  it("returns the queue length", () => {
    const queue = [makeQueueItem({ id: "u1" }), makeQueueItem({ id: "u2" })];
    expect(selectQueueLength(makeState({ queue }))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectDragActive
// ---------------------------------------------------------------------------

describe("selectDragActive", () => {
  it("returns false when drag is not active", () => {
    expect(selectDragActive(makeState())).toBe(false);
  });

  it("returns true when drag is active", () => {
    expect(selectDragActive(makeState({ dragActive: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectTotalUploadProgress
// ---------------------------------------------------------------------------

describe("selectTotalUploadProgress", () => {
  it("returns 100 when there are no pending uploads", () => {
    expect(selectTotalUploadProgress(makeState())).toBe(100);
  });

  it("returns 0 when pending uploads have no uploaded bytes", () => {
    const u1 = makeUpload({
      id: "u1",
      status: "uploading",
      fileSize: 1000,
      uploadedBytes: 0,
    });
    const uploads = new Map([["u1", u1]]);
    expect(selectTotalUploadProgress(makeState({ uploads }))).toBe(0);
  });

  it("returns 50 when half of bytes have been uploaded", () => {
    const u1 = makeUpload({
      id: "u1",
      status: "uploading",
      fileSize: 1000,
      uploadedBytes: 500,
    });
    const uploads = new Map([["u1", u1]]);
    expect(selectTotalUploadProgress(makeState({ uploads }))).toBe(50);
  });

  it("returns correct progress across multiple uploads", () => {
    const u1 = makeUpload({
      id: "u1",
      status: "uploading",
      fileSize: 1000,
      uploadedBytes: 1000,
    });
    const u2 = makeUpload({
      id: "u2",
      status: "pending",
      fileSize: 1000,
      uploadedBytes: 0,
    });
    const uploads = new Map([
      ["u1", u1],
      ["u2", u2],
    ]);
    // (1000 / 2000) * 100 = 50
    expect(selectTotalUploadProgress(makeState({ uploads }))).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// formatFileSize (helper)
// ---------------------------------------------------------------------------

describe("formatFileSize", () => {
  it("returns '0 B' for 0 bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("formats bytes correctly", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats KB correctly", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("formats MB correctly", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1 MB");
  });

  it("formats GB correctly", () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
  });
});

// ---------------------------------------------------------------------------
// getFileIcon (helper)
// ---------------------------------------------------------------------------

describe("getFileIcon", () => {
  it("returns image for image type", () => {
    expect(getFileIcon("image")).toBe("image");
  });

  it("returns video for video type", () => {
    expect(getFileIcon("video")).toBe("video");
  });

  it("returns audio for audio type", () => {
    expect(getFileIcon("audio")).toBe("audio");
  });

  it("returns file-text for document type", () => {
    expect(getFileIcon("document")).toBe("file-text");
  });

  it("returns archive for archive type", () => {
    expect(getFileIcon("archive")).toBe("archive");
  });

  it("returns file for other type", () => {
    expect(getFileIcon("other")).toBe("file");
  });
});

// ---------------------------------------------------------------------------
// getFileExtension (helper)
// ---------------------------------------------------------------------------

describe("getFileExtension", () => {
  it("returns extension from filename", () => {
    expect(getFileExtension("document.pdf")).toBe("pdf");
  });

  it("returns last extension from filename with multiple dots", () => {
    expect(getFileExtension("archive.tar.gz")).toBe("gz");
  });

  it("returns empty string for filename without extension", () => {
    expect(getFileExtension("README")).toBe("");
  });

  it("returns lowercase extension", () => {
    expect(getFileExtension("photo.JPG")).toBe("jpg");
  });
});

// ---------------------------------------------------------------------------
// isPreviewable (helper)
// ---------------------------------------------------------------------------

describe("isPreviewable", () => {
  it("returns true for image", () => {
    expect(isPreviewable("image")).toBe(true);
  });

  it("returns true for video", () => {
    expect(isPreviewable("video")).toBe(true);
  });

  it("returns true for audio", () => {
    expect(isPreviewable("audio")).toBe(true);
  });

  it("returns false for document", () => {
    expect(isPreviewable("document")).toBe(false);
  });

  it("returns false for archive", () => {
    expect(isPreviewable("archive")).toBe(false);
  });

  it("returns false for other", () => {
    expect(isPreviewable("other")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// estimateTimeRemaining (helper)
// ---------------------------------------------------------------------------

describe("estimateTimeRemaining", () => {
  it("returns null when uploadedBytes is 0", () => {
    expect(estimateTimeRemaining(0, 1000, Date.now() - 1000)).toBeNull();
  });

  it("returns a number for valid upload progress", () => {
    const startTime = Date.now() - 2000; // 2 seconds ago
    const result = estimateTimeRemaining(500, 1000, startTime);
    expect(typeof result).toBe("number");
    // 500 bytes in 2000ms = 0.25 bytes/ms; 500 remaining / 0.25 = ~2000ms
    expect(result).toBeGreaterThan(0);
  });
});
