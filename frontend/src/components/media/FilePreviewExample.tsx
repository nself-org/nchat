"use client";

/**
 * FilePreviewExample - Example usage of the FilePreview system
 *
 * Demonstrates how to use FilePreview, PDFViewer, and DocumentPreview
 * components with various file types.
 */

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilePreview } from "./FilePreview";
import { MediaItem, MediaUser } from "@/lib/media/media-types";
import { Download, Eye } from "lucide-react";

// ============================================================================
// Example Data
// ============================================================================

const exampleUser: MediaUser = {
  id: "user-1",
  username: "johndoe",
  displayName: "John Doe",
  avatarUrl: null,
};

const exampleFiles: MediaItem[] = [
  // Image
  {
    id: "file-1",
    fileName: "screenshot.png",
    fileType: "image",
    mimeType: "image/png",
    fileSize: 524288, // 512 KB
    fileExtension: "png",
    url: "/api/placeholder/1920/1080",
    thumbnailUrl: "/api/placeholder/200/200",
    channelId: "channel-1",
    channelName: "General",
    threadId: null,
    messageId: "msg-1",
    uploadedBy: exampleUser,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      dimensions: { width: 1920, height: 1080 },
    },
    canDelete: true,
    canShare: true,
    canDownload: true,
  },

  // Video
  {
    id: "file-2",
    fileName: "demo.mp4",
    fileType: "video",
    mimeType: "video/mp4",
    fileSize: 10485760, // 10 MB
    fileExtension: "mp4",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl: "/api/placeholder/200/200",
    channelId: "channel-1",
    channelName: "General",
    threadId: null,
    messageId: "msg-2",
    uploadedBy: exampleUser,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      duration: 596,
      dimensions: { width: 1280, height: 720 },
    },
    canDelete: true,
    canShare: true,
    canDownload: true,
  },

  // PDF
  {
    id: "file-3",
    fileName: "document.pdf",
    fileType: "document",
    mimeType: "application/pdf",
    fileSize: 2097152, // 2 MB
    fileExtension: "pdf",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    thumbnailUrl: null,
    channelId: "channel-1",
    channelName: "General",
    threadId: null,
    messageId: "msg-3",
    uploadedBy: exampleUser,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      pageCount: 1,
    },
    canDelete: true,
    canShare: true,
    canDownload: true,
  },

  // Text file
  {
    id: "file-4",
    fileName: "readme.md",
    fileType: "document",
    mimeType: "text/markdown",
    fileSize: 4096, // 4 KB
    fileExtension: "md",
    url: "data:text/markdown;base64,IyBGaWxlIFByZXZpZXcgU3lzdGVtCgpUaGlzIGlzIGEgY29tcHJlaGVuc2l2ZSBmaWxlIHByZXZpZXcgc3lzdGVtIHdpdGg6CgotIEltYWdlIHZpZXdlciB3aXRoIHpvb20vbWFuL3JvdGF0aW9uCi0gVmlkZW8gcGxheWVyIHdpdGggY29udHJvbHMKLSBBdWRpbyBwbGF5ZXIKLSBQRC8uanMgZm9yIFBERnMKLSBDb2RlIHZpZXdlciB3aXRoIHN5bnRheCBoaWdobGlnaHRpbmcKLSBEb2N1bWVudCBwcmV2aWV3CgojIyBGZWF0dXJlcwoKLSBVbml2ZXJzYWwgZmlsZSBwcmV2aWV3IG1vZGFsCi0gS2V5Ym9hcmQgbmF2aWdhdGlvbgotIERvd25sb2FkIGFuZCBzaGFyZSBidXR0b25zCi0gRmlsZSBtZXRhZGF0YSBkaXNwbGF5",
    thumbnailUrl: null,
    channelId: "channel-1",
    channelName: "General",
    threadId: null,
    messageId: "msg-4",
    uploadedBy: exampleUser,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    canDelete: true,
    canShare: true,
    canDownload: true,
  },

  // Code file (JSON)
  {
    id: "file-5",
    fileName: "package.json",
    fileType: "document",
    mimeType: "application/json",
    fileSize: 2048, // 2 KB
    fileExtension: "json",
    url: "data:application/json;base64,ewogICJuYW1lIjogIm5zZWxmLWNoYXQiLAogICJ2ZXJzaW9uIjogIjAuOS4wIiwKICAiZGVzY3JpcHRpb24iOiAiVGVhbSBjb21tdW5pY2F0aW9uIHBsYXRmb3JtIiwKICAic2NyaXB0cyI6IHsKICAgICJkZXYiOiAibmV4dCBkZXYiLAogICAgImJ1aWxkIjogIm5leHQgYnVpbGQiLAogICAgInN0YXJ0IjogIm5leHQgc3RhcnQiCiAgfQp9",
    thumbnailUrl: null,
    channelId: "channel-1",
    channelName: "General",
    threadId: null,
    messageId: "msg-5",
    uploadedBy: exampleUser,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    canDelete: true,
    canShare: true,
    canDownload: true,
  },
];

// ============================================================================
// Component
// ============================================================================

export function FilePreviewExample() {
  const [selectedFile, setSelectedFile] = useState<MediaItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreview = (file: MediaItem) => {
    setSelectedFile(file);
    setIsPreviewOpen(true);
  };

  const handleClose = () => {
    setIsPreviewOpen(false);
    setSelectedFile(null);
  };

  const handleNext = () => {
    if (!selectedFile) return;
    const currentIndex = exampleFiles.findIndex(
      (f) => f.id === selectedFile.id,
    );
    if (currentIndex < exampleFiles.length - 1) {
      setSelectedFile(exampleFiles[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    if (!selectedFile) return;
    const currentIndex = exampleFiles.findIndex(
      (f) => f.id === selectedFile.id,
    );
    if (currentIndex > 0) {
      setSelectedFile(exampleFiles[currentIndex - 1]);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">File Preview System</h1>
        <p className="mt-2 text-muted-foreground">
          Click on any file to preview it. Supports images, videos, PDFs, and
          code files.
        </p>
      </div>

      <div className="space-y-3">
        {exampleFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                {file.fileType === "image" && "🖼️"}
                {file.fileType === "video" && "🎥"}
                {file.fileType === "audio" && "🎵"}
                {file.fileType === "document" && "📄"}
              </div>
              <div>
                <p className="font-medium">{file.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {file.mimeType.split("/")[1].toUpperCase()} •{" "}
                  {(file.fileSize / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreview(file)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* File Preview Modal */}
      {selectedFile && (
        <FilePreview
          item={selectedFile}
          items={exampleFiles}
          isOpen={isPreviewOpen}
          onClose={handleClose}
          onNext={handleNext}
          onPrevious={handlePrevious}
          showNavigation={true}
          showInfo={true}
        />
      )}
    </div>
  );
}

export default FilePreviewExample;
