"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  X,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Attachment, LinkPreview, AttachmentType } from "@/types/message";

interface MessageAttachmentsProps {
  attachments: Attachment[];
  linkPreviews?: LinkPreview[];
  className?: string;
}

/**
 * Message attachments component
 * Renders images, videos, audio, files, and link previews
 */
export function MessageAttachments({
  attachments,
  linkPreviews,
  className,
}: MessageAttachmentsProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Group attachments by type
  const images = attachments.filter((a) => a.type === "image");
  const videos = attachments.filter((a) => a.type === "video");
  const audios = attachments.filter((a) => a.type === "audio");
  const files = attachments.filter((a) => a.type === "file");

  return (
    <div className={cn("space-y-2", className)}>
      {/* Image gallery */}
      {images.length > 0 && (
        <ImageGallery images={images} onImageClick={setLightboxImage} />
      )}

      {/* Videos */}
      {videos.map((video) => (
        <VideoPlayer key={video.id} attachment={video} />
      ))}

      {/* Audio */}
      {audios.map((audio) => (
        <AudioPlayer key={audio.id} attachment={audio} />
      ))}

      {/* Files */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <FileCard key={file.id} attachment={file} />
          ))}
        </div>
      )}

      {/* Link previews */}
      {linkPreviews && linkPreviews.length > 0 && (
        <div className="space-y-2">
          {linkPreviews.map((preview, i) => (
            <LinkPreviewCard key={i} preview={preview} />
          ))}
        </div>
      )}

      {/* Lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}

/**
 * Image gallery component
 */
interface ImageGalleryProps {
  images: Attachment[];
  onImageClick: (url: string) => void;
}

function ImageGallery({ images, onImageClick }: ImageGalleryProps) {
  const displayImages = images.slice(0, 4);
  const remainingCount = images.length - 4;

  const getGridClass = () => {
    switch (displayImages.length) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-2";
      default:
        return "grid-cols-2";
    }
  };

  return (
    <div className={cn("grid gap-1", getGridClass())}>
      {displayImages.map((image, index) => (
        <button
          key={image.id}
          onClick={() => onImageClick(image.url)}
          className={cn(
            "group relative overflow-hidden rounded-lg bg-muted",
            displayImages.length === 3 && index === 0 && "row-span-2",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          )}
        >
          <div
            className={cn(
              "relative aspect-video w-full",
              displayImages.length === 1 && "max-h-80",
            )}
          >
            <Image
              src={image.thumbnailUrl || image.url}
              alt={image.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>

          {/* Expand overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Maximize2 className="h-6 w-6 text-white" />
          </div>

          {/* Remaining count overlay */}
          {index === 3 && remainingCount > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="text-2xl font-bold text-white">
                +{remainingCount}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Video player component
 */
function VideoPlayer({ attachment }: { attachment: Attachment }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  return (
    <div className="relative max-w-md overflow-hidden rounded-lg bg-black">
      <video
        src={attachment.url}
        poster={attachment.thumbnailUrl}
        className="aspect-video w-full"
        controls
        muted={isMuted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <track kind="captions" src="" label="Captions" default />
      </video>

      {/* Custom controls overlay (optional) */}
      {!isPlaying && attachment.thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black transition-transform hover:scale-110"
            aria-label="Play video"
          >
            <Play className="ml-1 h-6 w-6" />
          </button>
        </div>
      )}

      {/* Duration badge */}
      {attachment.duration && (
        <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
          {formatDuration(attachment.duration)}
        </div>
      )}
    </div>
  );
}

/**
 * Audio player component
 */
function AudioPlayer({ attachment }: { attachment: Attachment }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <div className="bg-muted/50 flex max-w-md items-center gap-3 rounded-lg border p-3">
      {/* Play button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsPlaying(!isPlaying)}
        className="h-10 w-10 shrink-0 rounded-full"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="ml-0.5 h-5 w-5" />
        )}
      </Button>

      {/* Waveform / progress */}
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium">{attachment.name}</span>
          <span className="text-muted-foreground">
            {attachment.duration
              ? formatDuration(attachment.duration)
              : "--:--"}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Download */}
      <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
        <a href={attachment.url} download={attachment.name}>
          <Download className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}

/**
 * File card component
 */
function FileCard({ attachment }: { attachment: Attachment }) {
  const Icon = getFileIcon(attachment.mimeType);

  return (
    <div className="bg-muted/30 hover:bg-muted/50 flex max-w-sm items-center gap-3 rounded-lg border p-3 transition-colors">
      {/* File icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">
          {attachment.size ? formatFileSize(attachment.size) : "Unknown size"}
        </p>
      </div>

      {/* Download button */}
      <Button variant="ghost" size="sm" asChild className="shrink-0">
        <a href={attachment.url} download={attachment.name}>
          <Download className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}

/**
 * Link preview card
 */
function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:border-primary/50 group block max-w-md overflow-hidden rounded-lg border transition-colors"
    >
      {/* Image */}
      {preview.imageUrl && (
        <div className="relative aspect-video w-full bg-muted">
          <Image
            src={preview.imageUrl}
            alt={preview.title || "Link preview"}
            fill
            className="object-cover"
            sizes="400px"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Site info */}
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          {preview.favicon && (
            <Image
              src={preview.favicon}
              alt=""
              width={14}
              height={14}
              className="rounded-sm"
            />
          )}
          <span>{preview.siteName || new URL(preview.url).hostname}</span>
          <ExternalLink className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {/* Title */}
        {preview.title && (
          <p className="mb-1 line-clamp-2 text-sm font-medium text-primary group-hover:underline">
            {preview.title}
          </p>
        )}

        {/* Description */}
        {preview.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}

/**
 * Image lightbox component
 */
function ImageLightbox({
  imageUrl,
  onClose,
}: {
  imageUrl: string | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            aria-label="Close preview"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-[90vw]"
          >
            <Image
              src={imageUrl}
              alt="Full size image"
              width={1200}
              height={800}
              className="h-auto max-h-[90vh] w-auto max-w-[90vw] rounded-lg object-contain"
            />
          </motion.div>

          {/* Download button */}
          <a
            href={imageUrl}
            download
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function getFileIcon(mimeType?: string) {
  if (!mimeType) return File;

  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.includes("pdf")) return FileText;

  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
