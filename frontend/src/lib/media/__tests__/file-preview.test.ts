/**
 * File Preview Tests
 *
 * Comprehensive unit tests for file preview utilities.
 */

import {
  getFileTypeInfo,
  getFileCategory,
  getFileIcon,
  getFileIconByExtension,
  getFileLabel,
  getFileColor,
  isPreviewable,
  isImage,
  isVideo,
  isAudio,
  isDocument,
  isArchive,
  isCode,
  isTextBased,
  isMedia,
  generatePreviewUrl,
  generateDataUrl,
  revokePreviewUrl,
  isBlobUrl,
  isDataUrl,
  generateTextPreview,
  generateCodePreview,
  getFileExtension,
  getFileBaseName,
  formatFileSize,
  getFriendlyTypeName,
  canDisplayImage,
  canPlayVideo,
  canPlayAudio,
  canViewInBrowser,
  downloadFile,
  openInNewTab,
  FILE_TYPE_INFO,
  EXTENSION_ICONS,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  FileCategory,
} from "../file-preview";

// ============================================================================
// Mock Setup
// ============================================================================

global.URL.createObjectURL = jest.fn(() => "blob:mock-url-123");
global.URL.revokeObjectURL = jest.fn();

// Mock FileReader
class MockFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | ArrayBuffer | null = "mock file content";

  readAsDataURL() {
    setTimeout(() => {
      this.result = "data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=";
      if (this.onload) this.onload();
    }, 0);
  }

  readAsText() {
    setTimeout(() => {
      this.result = "mock file content";
      if (this.onload) this.onload();
    }, 0);
  }
}

global.FileReader = MockFileReader as unknown as typeof FileReader;

// Mock video/audio elements
const mockVideoElement = {
  canPlayType: jest.fn((mimeType: string) => {
    if (mimeType === "video/mp4" || mimeType === "video/webm")
      return "probably";
    if (mimeType === "video/ogg") return "maybe";
    return "";
  }),
};

const mockAudioElement = {
  canPlayType: jest.fn((mimeType: string) => {
    if (mimeType === "audio/mpeg" || mimeType === "audio/wav")
      return "probably";
    if (mimeType === "audio/ogg") return "maybe";
    return "";
  }),
};

document.createElement = jest.fn((tag: string) => {
  if (tag === "video") return mockVideoElement as unknown as HTMLVideoElement;
  if (tag === "audio") return mockAudioElement as unknown as HTMLAudioElement;
  if (tag === "a") {
    return {
      href: "",
      download: "",
      click: jest.fn(),
    } as unknown as HTMLAnchorElement;
  }
  return {} as HTMLElement;
}) as jest.Mock;

document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

global.window.open = jest.fn();

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

describe("File Preview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // File Type Detection Tests
  // ==========================================================================

  describe("File Type Detection", () => {
    describe("getFileTypeInfo", () => {
      it("should return info for JPEG", () => {
        const info = getFileTypeInfo("image/jpeg");
        expect(info.category).toBe("image");
        expect(info.icon).toBe("Image");
        expect(info.previewable).toBe(true);
      });

      it("should return info for PNG", () => {
        const info = getFileTypeInfo("image/png");
        expect(info.category).toBe("image");
        expect(info.previewable).toBe(true);
      });

      it("should return info for MP4 video", () => {
        const info = getFileTypeInfo("video/mp4");
        expect(info.category).toBe("video");
        expect(info.icon).toBe("Video");
        expect(info.previewable).toBe(true);
      });

      it("should return info for MP3 audio", () => {
        const info = getFileTypeInfo("audio/mpeg");
        expect(info.category).toBe("audio");
        expect(info.icon).toBe("Music");
        expect(info.previewable).toBe(true);
      });

      it("should return info for PDF", () => {
        const info = getFileTypeInfo("application/pdf");
        expect(info.category).toBe("document");
        expect(info.previewable).toBe(true);
      });

      it("should return info for ZIP", () => {
        const info = getFileTypeInfo("application/zip");
        expect(info.category).toBe("archive");
        expect(info.previewable).toBe(false);
      });

      it("should return info for JavaScript", () => {
        const info = getFileTypeInfo("text/javascript");
        expect(info.category).toBe("code");
        expect(info.previewable).toBe(true);
      });

      it("should return unknown for unrecognized types", () => {
        const info = getFileTypeInfo("application/unknown");
        expect(info.category).toBe("unknown");
        expect(info.previewable).toBe(false);
      });

      it("should handle mime types with parameters", () => {
        const info = getFileTypeInfo("image/jpeg; charset=utf-8");
        expect(info.category).toBe("image");
      });

      it("should be case-insensitive", () => {
        const info = getFileTypeInfo("IMAGE/JPEG");
        expect(info.category).toBe("image");
      });

      it("should fallback for generic image types", () => {
        const info = getFileTypeInfo("image/x-custom");
        expect(info.category).toBe("image");
      });

      it("should fallback for generic video types", () => {
        const info = getFileTypeInfo("video/x-custom");
        expect(info.category).toBe("video");
      });

      it("should fallback for generic audio types", () => {
        const info = getFileTypeInfo("audio/x-custom");
        expect(info.category).toBe("audio");
      });

      it("should fallback for generic text types", () => {
        const info = getFileTypeInfo("text/x-custom");
        expect(info.category).toBe("text");
      });
    });

    describe("getFileCategory", () => {
      it("should return image category", () => {
        expect(getFileCategory("image/png")).toBe("image");
      });

      it("should return video category", () => {
        expect(getFileCategory("video/mp4")).toBe("video");
      });

      it("should return audio category", () => {
        expect(getFileCategory("audio/mpeg")).toBe("audio");
      });

      it("should return document category", () => {
        expect(getFileCategory("application/pdf")).toBe("document");
      });

      it("should return archive category", () => {
        expect(getFileCategory("application/zip")).toBe("archive");
      });

      it("should return code category", () => {
        expect(getFileCategory("application/javascript")).toBe("code");
      });

      it("should return unknown category", () => {
        expect(getFileCategory("application/unknown")).toBe("unknown");
      });
    });

    describe("getFileIcon", () => {
      it("should return Image icon for images", () => {
        expect(getFileIcon("image/jpeg")).toBe("Image");
      });

      it("should return Video icon for videos", () => {
        expect(getFileIcon("video/mp4")).toBe("Video");
      });

      it("should return Music icon for audio", () => {
        expect(getFileIcon("audio/mpeg")).toBe("Music");
      });

      it("should return FileText icon for documents", () => {
        expect(getFileIcon("application/pdf")).toBe("FileText");
      });

      it("should return Archive icon for archives", () => {
        expect(getFileIcon("application/zip")).toBe("Archive");
      });

      it("should return Code icon for code", () => {
        expect(getFileIcon("text/javascript")).toBe("Code");
      });

      it("should return File icon for unknown", () => {
        expect(getFileIcon("application/unknown")).toBe("File");
      });
    });

    describe("getFileIconByExtension", () => {
      it("should return Image icon for jpg", () => {
        expect(getFileIconByExtension("photo.jpg")).toBe("Image");
      });

      it("should return Video icon for mp4", () => {
        expect(getFileIconByExtension("video.mp4")).toBe("Video");
      });

      it("should return Music icon for mp3", () => {
        expect(getFileIconByExtension("audio.mp3")).toBe("Music");
      });

      it("should return FileText icon for pdf", () => {
        expect(getFileIconByExtension("document.pdf")).toBe("FileText");
      });

      it("should return Archive icon for zip", () => {
        expect(getFileIconByExtension("archive.zip")).toBe("Archive");
      });

      it("should return Code icon for js", () => {
        expect(getFileIconByExtension("script.js")).toBe("Code");
      });

      it("should return File icon for unknown extension", () => {
        expect(getFileIconByExtension("file.xyz")).toBe("File");
      });

      it("should handle uppercase extensions", () => {
        expect(getFileIconByExtension("photo.JPG")).toBe("Image");
      });

      it("should handle files with multiple dots", () => {
        expect(getFileIconByExtension("my.photo.jpg")).toBe("Image");
      });
    });

    describe("getFileLabel", () => {
      it("should return label for JPEG", () => {
        expect(getFileLabel("image/jpeg")).toBe("JPEG Image");
      });

      it("should return label for MP4", () => {
        expect(getFileLabel("video/mp4")).toBe("MP4 Video");
      });

      it("should return label for MP3", () => {
        expect(getFileLabel("audio/mpeg")).toBe("MP3 Audio");
      });

      it("should return label for PDF", () => {
        expect(getFileLabel("application/pdf")).toBe("PDF Document");
      });
    });

    describe("getFileColor", () => {
      it("should return color for images", () => {
        const color = getFileColor("image/jpeg");
        expect(color).toBe("#4CAF50");
      });

      it("should return color for videos", () => {
        const color = getFileColor("video/mp4");
        expect(color).toBe("#E91E63");
      });

      it("should return color for audio", () => {
        const color = getFileColor("audio/mpeg");
        expect(color).toBe("#9C27B0");
      });
    });

    describe("isPreviewable", () => {
      it("should return true for images", () => {
        expect(isPreviewable("image/jpeg")).toBe(true);
        expect(isPreviewable("image/png")).toBe(true);
      });

      it("should return true for videos", () => {
        expect(isPreviewable("video/mp4")).toBe(true);
      });

      it("should return true for audio", () => {
        expect(isPreviewable("audio/mpeg")).toBe(true);
      });

      it("should return true for PDF", () => {
        expect(isPreviewable("application/pdf")).toBe(true);
      });

      it("should return false for archives", () => {
        expect(isPreviewable("application/zip")).toBe(false);
      });

      it("should return false for Word documents", () => {
        expect(isPreviewable("application/msword")).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Category Checks Tests
  // ==========================================================================

  describe("Category Checks", () => {
    describe("isImage", () => {
      it("should return true for image types", () => {
        expect(isImage("image/jpeg")).toBe(true);
        expect(isImage("image/png")).toBe(true);
        expect(isImage("image/gif")).toBe(true);
        expect(isImage("image/webp")).toBe(true);
      });

      it("should return false for non-image types", () => {
        expect(isImage("video/mp4")).toBe(false);
        expect(isImage("audio/mpeg")).toBe(false);
        expect(isImage("application/pdf")).toBe(false);
      });
    });

    describe("isVideo", () => {
      it("should return true for video types", () => {
        expect(isVideo("video/mp4")).toBe(true);
        expect(isVideo("video/webm")).toBe(true);
        expect(isVideo("video/ogg")).toBe(true);
      });

      it("should return false for non-video types", () => {
        expect(isVideo("image/jpeg")).toBe(false);
        expect(isVideo("audio/mpeg")).toBe(false);
      });
    });

    describe("isAudio", () => {
      it("should return true for audio types", () => {
        expect(isAudio("audio/mpeg")).toBe(true);
        expect(isAudio("audio/wav")).toBe(true);
        expect(isAudio("audio/ogg")).toBe(true);
      });

      it("should return false for non-audio types", () => {
        expect(isAudio("image/jpeg")).toBe(false);
        expect(isAudio("video/mp4")).toBe(false);
      });
    });

    describe("isDocument", () => {
      it("should return true for document types", () => {
        expect(isDocument("application/pdf")).toBe(true);
        expect(isDocument("application/msword")).toBe(true);
      });

      it("should return true for spreadsheets", () => {
        expect(isDocument("application/vnd.ms-excel")).toBe(true);
      });

      it("should return true for presentations", () => {
        expect(isDocument("application/vnd.ms-powerpoint")).toBe(true);
      });

      it("should return false for non-document types", () => {
        expect(isDocument("image/jpeg")).toBe(false);
        expect(isDocument("video/mp4")).toBe(false);
      });
    });

    describe("isArchive", () => {
      it("should return true for archive types", () => {
        expect(isArchive("application/zip")).toBe(true);
        expect(isArchive("application/x-rar-compressed")).toBe(true);
        expect(isArchive("application/gzip")).toBe(true);
      });

      it("should return false for non-archive types", () => {
        expect(isArchive("image/jpeg")).toBe(false);
        expect(isArchive("application/pdf")).toBe(false);
      });
    });

    describe("isCode", () => {
      it("should return true for code types", () => {
        expect(isCode("text/javascript")).toBe(true);
        expect(isCode("application/javascript")).toBe(true);
        expect(isCode("application/json")).toBe(true);
        expect(isCode("text/html")).toBe(true);
        expect(isCode("text/css")).toBe(true);
      });

      it("should return false for non-code types", () => {
        expect(isCode("text/plain")).toBe(false);
        expect(isCode("image/jpeg")).toBe(false);
      });
    });

    describe("isTextBased", () => {
      it("should return true for text types", () => {
        expect(isTextBased("text/plain")).toBe(true);
        expect(isTextBased("text/markdown")).toBe(true);
      });

      it("should return true for code types", () => {
        expect(isTextBased("text/javascript")).toBe(true);
      });

      it("should return false for binary types", () => {
        expect(isTextBased("image/jpeg")).toBe(false);
        expect(isTextBased("application/zip")).toBe(false);
      });
    });

    describe("isMedia", () => {
      it("should return true for images", () => {
        expect(isMedia("image/jpeg")).toBe(true);
      });

      it("should return true for videos", () => {
        expect(isMedia("video/mp4")).toBe(true);
      });

      it("should return true for audio", () => {
        expect(isMedia("audio/mpeg")).toBe(true);
      });

      it("should return false for non-media types", () => {
        expect(isMedia("application/pdf")).toBe(false);
        expect(isMedia("text/plain")).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Preview URL Tests
  // ==========================================================================

  describe("Preview URL Generation", () => {
    describe("generatePreviewUrl", () => {
      it("should create blob URL for file", () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        const url = generatePreviewUrl(file);
        expect(url).toBe("blob:mock-url-123");
        expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      });

      it("should create blob URL for blob", () => {
        const blob = createMockBlob("image/jpeg");
        const url = generatePreviewUrl(blob);
        expect(url).toBeDefined();
      });
    });

    describe("generateDataUrl", () => {
      it("should return data URL string", async () => {
        const file = createMockFile("test.txt", "text/plain");
        const dataUrl = await generateDataUrl(file);
        expect(dataUrl).toContain("data:");
      });
    });

    describe("revokePreviewUrl", () => {
      it("should revoke blob URL", () => {
        revokePreviewUrl("blob:mock-url-123");
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url-123");
      });

      it("should not revoke non-blob URLs", () => {
        revokePreviewUrl("https://example.com/image.jpg");
        expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      });

      it("should not revoke data URLs", () => {
        revokePreviewUrl("data:image/png;base64,abc123");
        expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      });
    });

    describe("isBlobUrl", () => {
      it("should return true for blob URLs", () => {
        expect(isBlobUrl("blob:http://localhost/123")).toBe(true);
        expect(isBlobUrl("blob:mock-url")).toBe(true);
      });

      it("should return false for non-blob URLs", () => {
        expect(isBlobUrl("https://example.com/image.jpg")).toBe(false);
        expect(isBlobUrl("data:image/png;base64,abc")).toBe(false);
      });
    });

    describe("isDataUrl", () => {
      it("should return true for data URLs", () => {
        expect(isDataUrl("data:image/png;base64,abc123")).toBe(true);
        expect(isDataUrl("data:text/plain,hello")).toBe(true);
      });

      it("should return false for non-data URLs", () => {
        expect(isDataUrl("blob:mock-url")).toBe(false);
        expect(isDataUrl("https://example.com")).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Text Preview Tests
  // ==========================================================================

  describe("Text Preview", () => {
    describe("generateTextPreview", () => {
      it("should return text content", async () => {
        const file = createMockFile("test.txt", "text/plain");
        const content = await generateTextPreview(file);
        expect(content).toBeDefined();
      });

      it("should respect maxLength", async () => {
        const file = createMockFile("test.txt", "text/plain");
        const content = await generateTextPreview(file, 10);
        expect(content.length).toBeLessThanOrEqual(10);
      });
    });

    describe("generateCodePreview", () => {
      it("should return content with language", async () => {
        const file = createMockFile("script.js", "text/javascript");
        const preview = await generateCodePreview(file);
        expect(preview.content).toBeDefined();
        expect(preview.language).toBe("javascript");
      });

      it("should detect TypeScript", async () => {
        const file = createMockFile("app.ts", "text/typescript");
        const preview = await generateCodePreview(file);
        expect(preview.language).toBe("typescript");
      });

      it("should detect Python", async () => {
        const file = createMockFile("script.py", "text/python");
        const preview = await generateCodePreview(file);
        expect(preview.language).toBe("python");
      });

      it("should detect HTML", async () => {
        const file = createMockFile("page.html", "text/html");
        const preview = await generateCodePreview(file);
        expect(preview.language).toBe("html");
      });

      it("should return plaintext for unknown extensions", async () => {
        const file = createMockFile("file.xyz", "text/plain");
        const preview = await generateCodePreview(file);
        expect(preview.language).toBe("plaintext");
      });
    });
  });

  // ==========================================================================
  // File Information Tests
  // ==========================================================================

  describe("File Information", () => {
    describe("getFileExtension", () => {
      it("should return extension", () => {
        expect(getFileExtension("file.jpg")).toBe("jpg");
        expect(getFileExtension("file.png")).toBe("png");
      });

      it("should return lowercase extension", () => {
        expect(getFileExtension("file.JPG")).toBe("jpg");
      });

      it("should handle multiple dots", () => {
        expect(getFileExtension("my.file.jpg")).toBe("jpg");
      });

      it("should return empty for no extension", () => {
        expect(getFileExtension("noextension")).toBe("");
      });

      it("should return empty for trailing dot", () => {
        expect(getFileExtension("file.")).toBe("");
      });
    });

    describe("getFileBaseName", () => {
      it("should return base name", () => {
        expect(getFileBaseName("file.jpg")).toBe("file");
      });

      it("should handle multiple dots", () => {
        expect(getFileBaseName("my.file.jpg")).toBe("my.file");
      });

      it("should return full name for no extension", () => {
        expect(getFileBaseName("noextension")).toBe("noextension");
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
      });

      it("should format gigabytes", () => {
        expect(formatFileSize(1073741824)).toBe("1 GB");
      });

      it("should handle zero", () => {
        expect(formatFileSize(0)).toBe("0 B");
      });

      it("should handle negative", () => {
        expect(formatFileSize(-1)).toBe("Invalid size");
      });

      it("should respect decimals parameter", () => {
        expect(formatFileSize(1536, 0)).toBe("2 KB");
        expect(formatFileSize(1536, 3)).toBe("1.5 KB");
      });
    });

    describe("getFriendlyTypeName", () => {
      it("should return label for known types", () => {
        expect(getFriendlyTypeName("image/jpeg")).toBe("JPEG Image");
        expect(getFriendlyTypeName("video/mp4")).toBe("MP4 Video");
      });

      it("should use extension for unknown types", () => {
        expect(getFriendlyTypeName("application/unknown", "file.xyz")).toBe(
          "XYZ File",
        );
      });

      it("should return File for completely unknown", () => {
        expect(getFriendlyTypeName("application/unknown")).toBe("File");
      });
    });
  });

  // ==========================================================================
  // Preview Capability Tests
  // ==========================================================================

  describe("Preview Capabilities", () => {
    describe("canDisplayImage", () => {
      it("should return true for common image types", () => {
        expect(canDisplayImage("image/jpeg")).toBe(true);
        expect(canDisplayImage("image/png")).toBe(true);
        expect(canDisplayImage("image/gif")).toBe(true);
        expect(canDisplayImage("image/webp")).toBe(true);
        expect(canDisplayImage("image/svg+xml")).toBe(true);
      });

      it("should return false for unsupported types", () => {
        expect(canDisplayImage("image/tiff")).toBe(false);
        expect(canDisplayImage("image/heic")).toBe(false);
      });
    });

    describe("canPlayVideo", () => {
      it("should check video playability", () => {
        expect(canPlayVideo("video/mp4")).toBe(true);
        expect(canPlayVideo("video/webm")).toBe(true);
      });
    });

    describe("canPlayAudio", () => {
      it("should check audio playability", () => {
        expect(canPlayAudio("audio/mpeg")).toBe(true);
        expect(canPlayAudio("audio/wav")).toBe(true);
      });
    });

    describe("canViewInBrowser", () => {
      it("should return true for displayable images", () => {
        expect(canViewInBrowser("image/jpeg")).toBe(true);
        expect(canViewInBrowser("image/png")).toBe(true);
      });

      it("should return true for playable video", () => {
        expect(canViewInBrowser("video/mp4")).toBe(true);
      });

      it("should return true for playable audio", () => {
        expect(canViewInBrowser("audio/mpeg")).toBe(true);
      });

      it("should return true for PDF", () => {
        expect(canViewInBrowser("application/pdf")).toBe(true);
      });

      it("should return true for text files", () => {
        expect(canViewInBrowser("text/plain")).toBe(true);
        expect(canViewInBrowser("text/html")).toBe(true);
      });

      it("should return false for binary files", () => {
        expect(canViewInBrowser("application/zip")).toBe(false);
        expect(canViewInBrowser("application/msword")).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Download Helper Tests
  // ==========================================================================

  describe("Download Helpers", () => {
    describe("downloadFile", () => {
      it("should trigger download for file", () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        downloadFile(file);
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(document.body.appendChild).toHaveBeenCalled();
        expect(document.body.removeChild).toHaveBeenCalled();
      });

      it("should use provided filename", () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        downloadFile(file, "custom-name.jpg");
        // Verify link was created (mocked)
        expect(document.createElement).toHaveBeenCalledWith("a");
      });

      it("should handle URL string", () => {
        downloadFile("https://example.com/file.jpg", "download.jpg");
        expect(document.createElement).toHaveBeenCalledWith("a");
      });
    });

    describe("openInNewTab", () => {
      it("should open file in new tab", () => {
        const file = createMockFile("test.jpg", "image/jpeg");
        openInNewTab(file);
        expect(window.open).toHaveBeenCalled();
      });

      it("should open URL in new tab", () => {
        openInNewTab("https://example.com/file.jpg");
        expect(window.open).toHaveBeenCalledWith(
          "https://example.com/file.jpg",
          "_blank",
        );
      });
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    it("should have FILE_TYPE_INFO entries", () => {
      expect(FILE_TYPE_INFO["image/jpeg"]).toBeDefined();
      expect(FILE_TYPE_INFO["video/mp4"]).toBeDefined();
      expect(FILE_TYPE_INFO["audio/mpeg"]).toBeDefined();
      expect(FILE_TYPE_INFO["application/pdf"]).toBeDefined();
    });

    it("should have EXTENSION_ICONS entries", () => {
      expect(EXTENSION_ICONS["jpg"]).toBe("Image");
      expect(EXTENSION_ICONS["mp4"]).toBe("Video");
      expect(EXTENSION_ICONS["mp3"]).toBe("Music");
      expect(EXTENSION_ICONS["pdf"]).toBe("FileText");
    });

    it("should have CATEGORY_COLORS for all categories", () => {
      const categories: FileCategory[] = [
        "image",
        "video",
        "audio",
        "document",
        "spreadsheet",
        "presentation",
        "archive",
        "code",
        "text",
        "font",
        "executable",
        "unknown",
      ];
      categories.forEach((cat) => {
        expect(CATEGORY_COLORS[cat]).toBeDefined();
      });
    });

    it("should have CATEGORY_ICONS for all categories", () => {
      const categories: FileCategory[] = [
        "image",
        "video",
        "audio",
        "document",
        "spreadsheet",
        "presentation",
        "archive",
        "code",
        "text",
        "font",
        "executable",
        "unknown",
      ];
      categories.forEach((cat) => {
        expect(CATEGORY_ICONS[cat]).toBeDefined();
      });
    });
  });
});
