/**
 * Unit tests for Google Drive formatter.
 */
import {
  getFileType,
  getFileIcon,
  getFileColor,
  formatDriveFile,
  getEmbedUrl,
  formatDriveFileForChat,
  formatDriveFolderForChat,
  formatDriveNotification,
  formatFileSize,
  formatRelativeTime,
  parseDriveUrl,
  isDriveUrl,
} from "../formatter";

const baseFile = {
  id: "f1",
  name: "Doc.txt",
  mimeType: "text/plain",
  webViewLink: "https://drive.google.com/file/d/f1/view",
  modifiedTime: new Date(Date.now() - 60_000 * 5).toISOString(), // 5 min ago
  shared: false,
  starred: false,
} as any;

describe("getFileType", () => {
  it("detects Google Workspace types", () => {
    expect(getFileType("application/vnd.google-apps.folder")).toBe("folder");
    expect(getFileType("application/vnd.google-apps.document")).toBe(
      "document",
    );
    expect(getFileType("application/vnd.google-apps.spreadsheet")).toBe(
      "spreadsheet",
    );
    expect(getFileType("application/vnd.google-apps.presentation")).toBe(
      "presentation",
    );
    expect(getFileType("application/vnd.google-apps.form")).toBe("form");
    expect(getFileType("application/vnd.google-apps.drawing")).toBe("drawing");
  });

  it("detects standard MIME classes", () => {
    expect(getFileType("application/pdf")).toBe("pdf");
    expect(getFileType("image/png")).toBe("image");
    expect(getFileType("video/mp4")).toBe("video");
    expect(getFileType("audio/wav")).toBe("audio");
  });

  it("detects archive MIME types", () => {
    expect(getFileType("application/zip")).toBe("archive");
    expect(getFileType("application/x-tar")).toBe("archive");
    expect(getFileType("application/gzip")).toBe("archive");
  });

  it("detects code MIME types", () => {
    expect(getFileType("text/javascript")).toBe("code");
    expect(getFileType("text/x-python")).toBe("code");
    expect(getFileType("application/json")).toBe("code");
  });

  it("falls back to file", () => {
    expect(getFileType("application/octet-stream")).toBe("file");
  });
});

describe("getFileIcon + getFileColor", () => {
  it("icons are stable strings per type", () => {
    expect(getFileIcon("folder")).toBe("folder");
    expect(getFileIcon("document")).toBe("file-text");
    expect(getFileIcon("spreadsheet")).toBe("table");
  });

  it("colors are hex strings", () => {
    expect(getFileColor("folder")).toMatch(/^#[0-9a-f]{6}$/);
    expect(getFileColor("document")).toBe("#4285f4");
    expect(getFileColor("spreadsheet")).toBe("#0f9d58");
  });
});

describe("formatDriveFile", () => {
  it("produces formatted record with relative time", () => {
    const f = formatDriveFile(baseFile);
    expect(f.id).toBe("f1");
    expect(f.name).toBe("Doc.txt");
    expect(f.url).toContain("drive.google.com");
    expect(f.modifiedTimeRelative).toMatch(/ago|just now/);
  });

  it("preserves owner info when present", () => {
    const f = formatDriveFile({
      ...baseFile,
      owners: [{ displayName: "Alice", photoLink: "https://p" }],
    } as any);
    expect(f.owner?.name).toBe("Alice");
    expect(f.owner?.avatarUrl).toBe("https://p");
  });

  it("formats size from string bytes", () => {
    const f = formatDriveFile({ ...baseFile, size: "2048" } as any);
    expect(f.size).toMatch(/2\.0 KB/);
  });
});

describe("getEmbedUrl", () => {
  it("google workspace types have document preview URLs", () => {
    expect(
      getEmbedUrl({
        id: "x",
        mimeType: "application/vnd.google-apps.document",
      } as any),
    ).toContain("document/d/x/preview");
    expect(
      getEmbedUrl({
        id: "x",
        mimeType: "application/vnd.google-apps.spreadsheet",
      } as any),
    ).toContain("spreadsheets/d/x/preview");
  });

  it("image/video/pdf go to drive preview", () => {
    expect(getEmbedUrl({ id: "x", mimeType: "image/png" } as any)).toContain(
      "drive.google.com/file/d/x/preview",
    );
    expect(
      getEmbedUrl({ id: "x", mimeType: "application/pdf" } as any),
    ).toContain("/preview");
  });

  it("other types return undefined", () => {
    expect(
      getEmbedUrl({ id: "x", mimeType: "text/plain" } as any),
    ).toBeUndefined();
  });
});

describe("formatDriveFileForChat", () => {
  it("returns text + html + embed", () => {
    const r = formatDriveFileForChat(baseFile);
    expect(r.text).toContain("Doc.txt");
    expect(r.html).toContain("drive-file-embed");
    expect(r.embed?.type).toBe("google-drive");
    expect(r.embed?.title).toBe("Doc.txt");
  });

  it("includes size/owner fields when present", () => {
    const r = formatDriveFileForChat({
      ...baseFile,
      size: "1024",
      owners: [{ displayName: "Bob", photoLink: "" }],
    } as any);
    expect(r.embed?.fields?.some((f) => f.name === "Size")).toBe(true);
    expect(r.embed?.fields?.some((f) => f.name === "Owner")).toBe(true);
  });
});

describe("formatDriveFolderForChat", () => {
  it("returns folder embed", () => {
    const r = formatDriveFolderForChat(
      {
        ...baseFile,
        mimeType: "application/vnd.google-apps.folder",
        name: "My Folder",
      } as any,
      7,
    );
    expect(r.embed?.type).toBe("google-drive-folder");
    expect(r.embed?.description).toContain("7");
    expect(r.html).toContain("drive-folder-embed");
  });

  it("without fileCount, no description", () => {
    const r = formatDriveFolderForChat({
      ...baseFile,
      mimeType: "application/vnd.google-apps.folder",
    } as any);
    expect(r.embed?.description).toBeUndefined();
  });
});

describe("formatDriveNotification", () => {
  it("create is green with file-added icon", () => {
    const n = formatDriveNotification("create", baseFile);
    expect(n.icon).toBe("file-added");
    expect(n.color).toBe("green");
    expect(n.metadata.fileId).toBe("f1");
  });

  it("delete is red", () => {
    const n = formatDriveNotification("delete", baseFile);
    expect(n.color).toBe("red");
    expect(n.icon).toBe("file-deleted");
  });

  it("share and unshare use user name", () => {
    const user = {
      displayName: "Bob",
      emailAddress: "b@x",
      permissionId: "pid",
    } as any;
    const shared = formatDriveNotification("share", baseFile, user);
    expect(shared.body).toContain("Bob");
    const unshared = formatDriveNotification("unshare", baseFile, user);
    expect(unshared.color).toBe("red");
  });

  it("comment uses blue with comment icon", () => {
    const n = formatDriveNotification("comment", baseFile);
    expect(n.icon).toBe("comment-added");
    expect(n.color).toBe("blue");
  });

  it("folder detection renames title", () => {
    const n = formatDriveNotification("create", {
      ...baseFile,
      mimeType: "application/vnd.google-apps.folder",
    } as any);
    expect(n.title).toContain("Folder");
  });
});

describe("formatFileSize", () => {
  it("handles 0 bytes", () => expect(formatFileSize(0)).toBe("0 B"));
  it("handles B-scale", () => expect(formatFileSize(500)).toBe("500 B"));
  it("handles KB", () => expect(formatFileSize(2048)).toBe("2.0 KB"));
  it("handles MB", () =>
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB"));
  it("handles GB", () =>
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toMatch(/GB/));
});

describe("formatRelativeTime", () => {
  it("just now for <60s", () => {
    expect(formatRelativeTime(new Date(Date.now() - 10_000))).toBe("just now");
  });
  it("m ago for minutes", () => {
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000))).toMatch(
      /\dm ago/,
    );
  });
  it("h ago for hours", () => {
    expect(formatRelativeTime(new Date(Date.now() - 3 * 3600_000))).toMatch(
      /h ago/,
    );
  });
  it("d ago for days", () => {
    expect(formatRelativeTime(new Date(Date.now() - 2 * 86400_000))).toMatch(
      /d ago/,
    );
  });
  it("w ago for weeks", () => {
    expect(formatRelativeTime(new Date(Date.now() - 10 * 86400_000))).toMatch(
      /w ago/,
    );
  });
});

describe("parseDriveUrl", () => {
  it("parses file URL", () => {
    expect(
      parseDriveUrl("https://drive.google.com/file/d/abc123/view"),
    ).toEqual({
      type: "file",
      id: "abc123",
    });
  });

  it("parses folder URL", () => {
    expect(
      parseDriveUrl("https://drive.google.com/drive/folders/fld1"),
    ).toEqual({
      type: "folder",
      id: "fld1",
    });
  });

  it("parses document URL", () => {
    expect(parseDriveUrl("https://docs.google.com/document/d/d1/edit")).toEqual(
      {
        type: "document",
        id: "d1",
      },
    );
  });

  it("parses spreadsheet + presentation + form URLs", () => {
    expect(
      parseDriveUrl("https://docs.google.com/spreadsheets/d/s1/edit").type,
    ).toBe("spreadsheet");
    expect(
      parseDriveUrl("https://docs.google.com/presentation/d/p1/edit").type,
    ).toBe("presentation");
    expect(parseDriveUrl("https://docs.google.com/forms/d/fo1/edit").type).toBe(
      "form",
    );
  });

  it("parses ?id= query", () => {
    expect(parseDriveUrl("https://drive.google.com/open?id=qid1")).toEqual({
      type: "file",
      id: "qid1",
    });
  });

  it("returns unknown on non-drive URL", () => {
    expect(parseDriveUrl("https://example.com/other")).toEqual({
      type: "unknown",
      id: null,
    });
  });
});

describe("isDriveUrl", () => {
  it("detects drive/docs/sheets/slides/forms", () => {
    expect(isDriveUrl("https://drive.google.com/x")).toBe(true);
    expect(isDriveUrl("https://docs.google.com/y")).toBe(true);
    expect(isDriveUrl("https://sheets.google.com/z")).toBe(true);
    expect(isDriveUrl("https://slides.google.com/z")).toBe(true);
    expect(isDriveUrl("https://forms.google.com/z")).toBe(true);
  });

  it("rejects other URLs", () => {
    expect(isDriveUrl("https://github.com")).toBe(false);
    expect(isDriveUrl("https://example.com")).toBe(false);
  });
});
