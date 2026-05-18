/**
 * Upload Components - Barrel export file
 *
 * Exports all upload-related components for the nself-chat application
 */

// Drag and Drop Zone
export { FileUploadZone, FileUploadOverlay } from "./file-upload-zone";
export type {
  FileUploadZoneProps,
  FileUploadOverlayProps,
} from "./file-upload-zone";

// Upload Button
export {
  FileUploadButton,
  CompactUploadButton,
  IconUploadButton,
} from "./file-upload-button";
export type {
  FileUploadButtonProps,
  CompactUploadButtonProps,
  IconUploadButtonProps,
  FileCategory,
} from "./file-upload-button";

// Upload Preview
export { UploadPreview, UploadPreviewListItem } from "./upload-preview";
export type {
  UploadPreviewProps,
  UploadPreviewListItemProps,
} from "./upload-preview";

// Upload Progress
export {
  UploadProgress,
  AggregateUploadProgress,
  UploadProgressToast,
} from "./upload-progress";
export type {
  UploadProgressProps,
  AggregateUploadProgressProps,
  UploadProgressToastProps,
} from "./upload-progress";

// Attachment Preview
export { AttachmentPreview, AttachmentStrip } from "./attachment-preview";
export type {
  AttachmentPreviewProps,
  AttachmentStripProps,
  AttachmentItem,
} from "./attachment-preview";

// Image Gallery
export { ImageGallery, useImageGallery } from "./image-gallery";
export type {
  ImageGalleryProps,
  GalleryImage,
  UseImageGalleryReturn,
} from "./image-gallery";

// Video Player
export { VideoPlayer, CompactVideoPlayer } from "./video-player";
export type { VideoPlayerProps, CompactVideoPlayerProps } from "./video-player";

// Audio Player
export { AudioPlayer, VoiceMessagePlayer } from "./audio-player";
export type { AudioPlayerProps, VoiceMessagePlayerProps } from "./audio-player";

// File Card
export { FileCard, FileIcon, FileList } from "./file-card";
export type { FileCardProps, FileListProps } from "./file-card";
