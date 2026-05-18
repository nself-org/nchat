"use client";

/**
 * FilePreview - Universal file preview modal
 *
 * Automatically selects the appropriate viewer based on file type:
 * - Images: ImageViewer with zoom/pan
 * - Videos: VideoPlayer with controls
 * - Audio: AudioPlayer
 * - PDFs: PDFViewer with page navigation
 * - Text/Code: DocumentPreview with syntax highlighting
 * - Other: Download prompt with file info
 */

import * as React from "react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/lib/media/media-types";
import {
  isImage,
  isVideo,
  isAudio,
  isDocument,
  isTextBased,
  isCode,
  getFileTypeInfo,
  downloadFile,
  openInNewTab,
} from "@/lib/media/file-preview";
import { formatFileSize } from "@/lib/media/media-manager";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  Download,
  ExternalLink,
  Share2,
  Info,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Maximize2,
} from "lucide-react";

// Import viewers
import { ImageViewer } from "./ImageViewer";
import { VideoPlayer } from "./VideoPlayer";
import { AudioPlayer } from "./AudioPlayer";
import { PDFViewer } from "./PDFViewer";
import { DocumentPreview } from "./DocumentPreview";
import { MediaInfo } from "./MediaInfo";

// Local helper - isPDF is not exported from file-preview
function isPDF(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

// ============================================================================
// Types
// ============================================================================

export interface FilePreviewProps {
  item: MediaItem;
  items?: MediaItem[];
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  showNavigation?: boolean;
  showInfo?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function FilePreview({
  item,
  items = [],
  isOpen,
  onClose,
  onNext,
  onPrevious,
  onDownload,
  onShare,
  showNavigation = true,
  showInfo = false,
  className,
}: FilePreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "info">("preview");
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePanX, setImagePanX] = useState(0);
  const [imagePanY, setImagePanY] = useState(0);
  const [imageRotation, setImageRotation] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoRate, setVideoRate] = useState(1);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioRate, setAudioRate] = useState(1);

  const fileInfo = getFileTypeInfo(item.mimeType);
  const canPreview =
    isImage(item.mimeType) ||
    isVideo(item.mimeType) ||
    isAudio(item.mimeType) ||
    isPDF(item.mimeType) ||
    isTextBased(item.mimeType) ||
    isCode(item.mimeType);

  // Determine current index
  const currentIndex = items.findIndex((i) => i.id === item.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  // Download handler
  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload();
    } else {
      downloadFile(item.url, item.fileName);
    }
  }, [item.url, item.fileName, onDownload]);

  // Open in new tab
  const handleOpenExternal = useCallback(() => {
    openInNewTab(item.url);
  }, [item.url]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrevious && onPrevious) onPrevious();
      if (e.key === "ArrowRight" && hasNext && onNext) onNext();
      if (e.key === "d" || e.key === "D") handleDownload();
      if (e.key === "i" || e.key === "I") {
        setActiveTab((t) => (t === "preview" ? "info" : "preview"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    onClose,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext,
    handleDownload,
  ]);

  // Render preview based on file type
  const renderPreview = () => {
    // Image
    if (isImage(item.mimeType)) {
      return (
        <ImageViewer
          item={item}
          zoom={imageZoom}
          panX={imagePanX}
          panY={imagePanY}
          rotation={imageRotation}
          onZoomChange={setImageZoom}
          onPanChange={(x, y) => {
            setImagePanX(x);
            setImagePanY(y);
          }}
          onRotationChange={setImageRotation}
          onDownload={handleDownload}
          showControls={true}
        />
      );
    }

    // Video
    if (isVideo(item.mimeType)) {
      return (
        <VideoPlayer
          item={item}
          isPlaying={videoPlaying}
          currentTime={videoTime}
          volume={videoVolume}
          isMuted={videoMuted}
          playbackRate={videoRate}
          onPlayChange={setVideoPlaying}
          onTimeChange={setVideoTime}
          onVolumeChange={setVideoVolume}
          onMutedChange={setVideoMuted}
          onPlaybackRateChange={setVideoRate}
          onDownload={handleDownload}
          showControls={true}
        />
      );
    }

    // Audio
    if (isAudio(item.mimeType)) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <AudioPlayer
            item={item}
            isPlaying={audioPlaying}
            currentTime={audioTime}
            volume={audioVolume}
            isMuted={audioMuted}
            playbackRate={audioRate}
            onPlayChange={setAudioPlaying}
            onTimeChange={setAudioTime}
            onVolumeChange={setAudioVolume}
            onMutedChange={setAudioMuted}
            onPlaybackRateChange={setAudioRate}
            onDownload={handleDownload}
            compact={false}
            className="max-w-md"
          />
        </div>
      );
    }

    // PDF
    if (isPDF(item.mimeType)) {
      return (
        <PDFViewer
          item={item}
          onDownload={handleDownload}
          showControls={true}
        />
      );
    }

    // Text/Code
    if (isTextBased(item.mimeType) || isCode(item.mimeType)) {
      return (
        <DocumentPreview
          item={item}
          onDownload={handleDownload}
          onOpenExternal={handleOpenExternal}
        />
      );
    }

    // Unsupported - show download prompt
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mb-4 inline-block rounded-full bg-muted p-6">
            <div className="h-16 w-16" style={{ color: fileInfo.color }}>
              📄
            </div>
          </div>
          <h3 className="mb-2 text-xl font-semibold">{item.fileName}</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Preview not available for {fileInfo.label}
          </p>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Size: {formatFileSize(item.fileSize)}
            </p>
            <p className="text-sm text-muted-foreground">
              Type: {item.mimeType}
            </p>
          </div>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" onClick={handleOpenExternal}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn("flex h-[90vh] max-w-7xl flex-col gap-0 p-0", className)}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b px-4 py-3">
          {/* Left: File name */}
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold">{item.fileName}</h2>
            <p className="text-xs text-muted-foreground">
              {fileInfo.label} • {formatFileSize(item.fileSize)}
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {showInfo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setActiveTab((t) => (t === "preview" ? "info" : "preview"))
                }
                title="Toggle info (I)"
              >
                <Info className="h-4 w-4" />
              </Button>
            )}

            {onShare && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onShare}
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              title="Download (D)"
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenExternal}
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showInfo ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="flex h-full flex-col"
            >
              <TabsList className="w-full rounded-none border-b">
                <TabsTrigger value="preview" className="flex-1">
                  Preview
                </TabsTrigger>
                <TabsTrigger value="info" className="flex-1">
                  Info
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="preview"
                className="mt-0 flex-1 overflow-hidden"
              >
                {renderPreview()}
              </TabsContent>
              <TabsContent value="info" className="mt-0 flex-1 overflow-hidden">
                <MediaInfo item={item} />
              </TabsContent>
            </Tabs>
          ) : (
            renderPreview()
          )}
        </div>

        {/* Navigation arrows */}
        {showNavigation && items.length > 1 && (
          <>
            {hasPrevious && onPrevious && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={onPrevious}
                title="Previous (←)"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {hasNext && onNext && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={onNext}
                title="Next (→)"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </>
        )}

        {/* Current position indicator */}
        {items.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
            {currentIndex + 1} / {items.length}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default FilePreview;
