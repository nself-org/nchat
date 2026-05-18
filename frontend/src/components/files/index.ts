/**
 * File Upload Components
 *
 * A comprehensive file upload system for nself-chat.
 *
 * @example
 * ```tsx
 * import {
 *   FileUploadZone,
 *   FileUploadButton,
 *   FilePreviewList,
 *   FileAttachment,
 *   ImageLightbox,
 *   useFileUpload,
 * } from '@/components/files'
 *
 * function ChatInput() {
 *   const {
 *     files,
 *     addFiles,
 *     removeFile,
 *     startUpload,
 *     isUploading,
 *   } = useFileUpload({ autoUpload: true })
 *
 *   return (
 *     <div>
 *       <FileUploadZone onFilesAccepted={addFiles} variant="inline">
 *         <input placeholder="Type a message..." />
 *       </FileUploadZone>
 *
 *       <FilePreviewList
 *         files={files}
 *         onRemove={removeFile}
 *       />
 *
 *       <FileUploadButton
 *         onFilesSelected={addFiles}
 *         fileCount={files.length}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */

// Components
export { FileIcon, getFileIconInfo } from "./file-icon";
export type { FileIconProps } from "./file-icon";

export { UploadProgress, CircularUploadProgress } from "./upload-progress";
export type {
  UploadProgressProps,
  CircularUploadProgressProps,
  UploadStatus,
} from "./upload-progress";

export { FilePreviewItem, CompactFilePreviewItem } from "./file-preview-item";
export type {
  FilePreviewItemProps,
  CompactFilePreviewItemProps,
} from "./file-preview-item";

export {
  FilePreviewList,
  FilePreviewListHeader,
  getFileListStats,
} from "./file-preview-list";
export type {
  FilePreviewListProps,
  FilePreviewListHeaderProps,
  FileUploadState,
} from "./file-preview-list";

export { FileUploadZone, useFileUploadZone } from "./file-upload-zone";
export type { FileUploadZoneProps } from "./file-upload-zone";

export {
  FileUploadButton,
  AddFileButton,
  ImageUploadButton,
} from "./file-upload-button";
export type {
  FileUploadButtonProps,
  AddFileButtonProps,
  ImageUploadButtonProps,
} from "./file-upload-button";

export { FileAttachment } from "./file-attachment";
export type {
  FileAttachmentData,
  FileAttachmentProps,
} from "./file-attachment";

export { ImageLightbox, useLightbox } from "./image-lightbox";
export type { ImageLightboxProps } from "./image-lightbox";

// New file uploader with processing integration
export { FileUploader } from "./file-uploader";
export type { FileUploaderProps } from "./file-uploader";

// Enhanced file preview
export { FilePreview } from "./file-preview";
export type { FilePreviewProps } from "./file-preview";

// Image gallery with lightbox
export { ImageGallery, ImageGalleryGrid } from "./image-gallery";
export type { ImageGalleryProps, ImageGalleryGridProps } from "./image-gallery";

// Hooks
export { useFileUpload, useSingleFileUpload } from "./use-file-upload";
export type {
  UseFileUploadOptions,
  UseFileUploadReturn,
} from "./use-file-upload";

// Re-export from hooks directory (file processing integration)
export {
  useFileUpload as useFileUploadWithProcessing,
  useSingleFileUpload as useSingleFileUploadWithProcessing,
} from "@/hooks/use-file-upload";
export { useAttachments, useAttachmentPreview } from "@/hooks/use-attachments";
