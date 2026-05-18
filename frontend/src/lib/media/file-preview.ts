/**
 * File Preview - Utilities for generating file previews and type detection
 *
 * Handles preview URL generation, file type detection, icon mapping,
 * and thumbnail generation for various file types.
 */

// ============================================================================
// Types
// ============================================================================

export type FileCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "code"
  | "text"
  | "font"
  | "executable"
  | "unknown";

export interface FileTypeInfo {
  category: FileCategory;
  icon: string;
  label: string;
  color: string;
  previewable: boolean;
}

export interface PreviewResult {
  url: string;
  type: "blob" | "data" | "remote";
  width?: number;
  height?: number;
  duration?: number;
}

export interface FilePreviewOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_PREVIEW_WIDTH = 200;
export const DEFAULT_PREVIEW_HEIGHT = 200;
export const DEFAULT_PREVIEW_QUALITY = 0.7;

export const FILE_TYPE_INFO: Record<string, FileTypeInfo> = {
  // Images
  "image/jpeg": {
    category: "image",
    icon: "Image",
    label: "JPEG Image",
    color: "#4CAF50",
    previewable: true,
  },
  "image/jpg": {
    category: "image",
    icon: "Image",
    label: "JPEG Image",
    color: "#4CAF50",
    previewable: true,
  },
  "image/png": {
    category: "image",
    icon: "Image",
    label: "PNG Image",
    color: "#4CAF50",
    previewable: true,
  },
  "image/gif": {
    category: "image",
    icon: "Image",
    label: "GIF Image",
    color: "#4CAF50",
    previewable: true,
  },
  "image/webp": {
    category: "image",
    icon: "Image",
    label: "WebP Image",
    color: "#4CAF50",
    previewable: true,
  },
  "image/svg+xml": {
    category: "image",
    icon: "Image",
    label: "SVG Image",
    color: "#4CAF50",
    previewable: true,
  },
  "image/bmp": {
    category: "image",
    icon: "Image",
    label: "BMP Image",
    color: "#4CAF50",
    previewable: true,
  },
  "image/tiff": {
    category: "image",
    icon: "Image",
    label: "TIFF Image",
    color: "#4CAF50",
    previewable: false,
  },
  "image/heic": {
    category: "image",
    icon: "Image",
    label: "HEIC Image",
    color: "#4CAF50",
    previewable: false,
  },
  "image/heif": {
    category: "image",
    icon: "Image",
    label: "HEIF Image",
    color: "#4CAF50",
    previewable: false,
  },
  "image/x-icon": {
    category: "image",
    icon: "Image",
    label: "Icon",
    color: "#4CAF50",
    previewable: true,
  },

  // Videos
  "video/mp4": {
    category: "video",
    icon: "Video",
    label: "MP4 Video",
    color: "#E91E63",
    previewable: true,
  },
  "video/webm": {
    category: "video",
    icon: "Video",
    label: "WebM Video",
    color: "#E91E63",
    previewable: true,
  },
  "video/ogg": {
    category: "video",
    icon: "Video",
    label: "OGG Video",
    color: "#E91E63",
    previewable: true,
  },
  "video/quicktime": {
    category: "video",
    icon: "Video",
    label: "QuickTime",
    color: "#E91E63",
    previewable: true,
  },
  "video/x-msvideo": {
    category: "video",
    icon: "Video",
    label: "AVI Video",
    color: "#E91E63",
    previewable: false,
  },
  "video/x-matroska": {
    category: "video",
    icon: "Video",
    label: "MKV Video",
    color: "#E91E63",
    previewable: false,
  },
  "video/mpeg": {
    category: "video",
    icon: "Video",
    label: "MPEG Video",
    color: "#E91E63",
    previewable: true,
  },

  // Audio
  "audio/mpeg": {
    category: "audio",
    icon: "Music",
    label: "MP3 Audio",
    color: "#9C27B0",
    previewable: true,
  },
  "audio/mp3": {
    category: "audio",
    icon: "Music",
    label: "MP3 Audio",
    color: "#9C27B0",
    previewable: true,
  },
  "audio/wav": {
    category: "audio",
    icon: "Music",
    label: "WAV Audio",
    color: "#9C27B0",
    previewable: true,
  },
  "audio/ogg": {
    category: "audio",
    icon: "Music",
    label: "OGG Audio",
    color: "#9C27B0",
    previewable: true,
  },
  "audio/webm": {
    category: "audio",
    icon: "Music",
    label: "WebM Audio",
    color: "#9C27B0",
    previewable: true,
  },
  "audio/aac": {
    category: "audio",
    icon: "Music",
    label: "AAC Audio",
    color: "#9C27B0",
    previewable: true,
  },
  "audio/flac": {
    category: "audio",
    icon: "Music",
    label: "FLAC Audio",
    color: "#9C27B0",
    previewable: true,
  },
  "audio/x-m4a": {
    category: "audio",
    icon: "Music",
    label: "M4A Audio",
    color: "#9C27B0",
    previewable: true,
  },

  // Documents
  "application/pdf": {
    category: "document",
    icon: "FileText",
    label: "PDF Document",
    color: "#F44336",
    previewable: true,
  },
  "application/msword": {
    category: "document",
    icon: "FileText",
    label: "Word Document",
    color: "#2196F3",
    previewable: false,
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    category: "document",
    icon: "FileText",
    label: "Word Document",
    color: "#2196F3",
    previewable: false,
  },
  "application/rtf": {
    category: "document",
    icon: "FileText",
    label: "RTF Document",
    color: "#2196F3",
    previewable: false,
  },
  "text/rtf": {
    category: "document",
    icon: "FileText",
    label: "RTF Document",
    color: "#2196F3",
    previewable: false,
  },

  // Spreadsheets
  "application/vnd.ms-excel": {
    category: "spreadsheet",
    icon: "Table",
    label: "Excel Spreadsheet",
    color: "#4CAF50",
    previewable: false,
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    category: "spreadsheet",
    icon: "Table",
    label: "Excel Spreadsheet",
    color: "#4CAF50",
    previewable: false,
  },
  "text/csv": {
    category: "spreadsheet",
    icon: "Table",
    label: "CSV File",
    color: "#4CAF50",
    previewable: true,
  },

  // Presentations
  "application/vnd.ms-powerpoint": {
    category: "presentation",
    icon: "Presentation",
    label: "PowerPoint",
    color: "#FF5722",
    previewable: false,
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    category: "presentation",
    icon: "Presentation",
    label: "PowerPoint",
    color: "#FF5722",
    previewable: false,
  },

  // Archives
  "application/zip": {
    category: "archive",
    icon: "Archive",
    label: "ZIP Archive",
    color: "#795548",
    previewable: false,
  },
  "application/x-zip-compressed": {
    category: "archive",
    icon: "Archive",
    label: "ZIP Archive",
    color: "#795548",
    previewable: false,
  },
  "application/x-rar-compressed": {
    category: "archive",
    icon: "Archive",
    label: "RAR Archive",
    color: "#795548",
    previewable: false,
  },
  "application/x-7z-compressed": {
    category: "archive",
    icon: "Archive",
    label: "7Z Archive",
    color: "#795548",
    previewable: false,
  },
  "application/gzip": {
    category: "archive",
    icon: "Archive",
    label: "GZIP Archive",
    color: "#795548",
    previewable: false,
  },
  "application/x-tar": {
    category: "archive",
    icon: "Archive",
    label: "TAR Archive",
    color: "#795548",
    previewable: false,
  },

  // Code
  "text/javascript": {
    category: "code",
    icon: "Code",
    label: "JavaScript",
    color: "#FFC107",
    previewable: true,
  },
  "application/javascript": {
    category: "code",
    icon: "Code",
    label: "JavaScript",
    color: "#FFC107",
    previewable: true,
  },
  "application/json": {
    category: "code",
    icon: "Code",
    label: "JSON",
    color: "#FFC107",
    previewable: true,
  },
  "text/html": {
    category: "code",
    icon: "Code",
    label: "HTML",
    color: "#E91E63",
    previewable: true,
  },
  "text/css": {
    category: "code",
    icon: "Code",
    label: "CSS",
    color: "#2196F3",
    previewable: true,
  },
  "text/xml": {
    category: "code",
    icon: "Code",
    label: "XML",
    color: "#FF9800",
    previewable: true,
  },
  "application/xml": {
    category: "code",
    icon: "Code",
    label: "XML",
    color: "#FF9800",
    previewable: true,
  },
  "text/x-python": {
    category: "code",
    icon: "Code",
    label: "Python",
    color: "#3776AB",
    previewable: true,
  },
  "text/x-java-source": {
    category: "code",
    icon: "Code",
    label: "Java",
    color: "#B07219",
    previewable: true,
  },
  "application/typescript": {
    category: "code",
    icon: "Code",
    label: "TypeScript",
    color: "#3178C6",
    previewable: true,
  },

  // Text
  "text/plain": {
    category: "text",
    icon: "FileText",
    label: "Text File",
    color: "#607D8B",
    previewable: true,
  },
  "text/markdown": {
    category: "text",
    icon: "FileText",
    label: "Markdown",
    color: "#607D8B",
    previewable: true,
  },

  // Fonts
  "font/ttf": {
    category: "font",
    icon: "Type",
    label: "TTF Font",
    color: "#9E9E9E",
    previewable: false,
  },
  "font/otf": {
    category: "font",
    icon: "Type",
    label: "OTF Font",
    color: "#9E9E9E",
    previewable: false,
  },
  "font/woff": {
    category: "font",
    icon: "Type",
    label: "WOFF Font",
    color: "#9E9E9E",
    previewable: false,
  },
  "font/woff2": {
    category: "font",
    icon: "Type",
    label: "WOFF2 Font",
    color: "#9E9E9E",
    previewable: false,
  },

  // Executables
  "application/x-msdownload": {
    category: "executable",
    icon: "Cpu",
    label: "Executable",
    color: "#FF5722",
    previewable: false,
  },
  "application/x-executable": {
    category: "executable",
    icon: "Cpu",
    label: "Executable",
    color: "#FF5722",
    previewable: false,
  },
};

export const EXTENSION_ICONS: Record<string, string> = {
  // Documents
  pdf: "FileText",
  doc: "FileText",
  docx: "FileText",
  odt: "FileText",
  rtf: "FileText",

  // Spreadsheets
  xls: "Table",
  xlsx: "Table",
  csv: "Table",
  ods: "Table",

  // Presentations
  ppt: "Presentation",
  pptx: "Presentation",
  odp: "Presentation",

  // Images
  jpg: "Image",
  jpeg: "Image",
  png: "Image",
  gif: "Image",
  webp: "Image",
  svg: "Image",
  bmp: "Image",
  ico: "Image",

  // Videos
  mp4: "Video",
  webm: "Video",
  mov: "Video",
  avi: "Video",
  mkv: "Video",
  wmv: "Video",

  // Audio
  mp3: "Music",
  wav: "Music",
  ogg: "Music",
  flac: "Music",
  m4a: "Music",
  aac: "Music",

  // Archives
  zip: "Archive",
  rar: "Archive",
  "7z": "Archive",
  tar: "Archive",
  gz: "Archive",

  // Code
  js: "Code",
  ts: "Code",
  jsx: "Code",
  tsx: "Code",
  html: "Code",
  css: "Code",
  json: "Code",
  py: "Code",
  java: "Code",
  c: "Code",
  cpp: "Code",
  go: "Code",
  rs: "Code",
  rb: "Code",
  php: "Code",

  // Text
  txt: "FileText",
  md: "FileText",
  log: "FileText",

  // Fonts
  ttf: "Type",
  otf: "Type",
  woff: "Type",
  woff2: "Type",

  // Executables
  exe: "Cpu",
  dmg: "Cpu",
  app: "Cpu",
};

export const CATEGORY_COLORS: Record<FileCategory, string> = {
  image: "#4CAF50",
  video: "#E91E63",
  audio: "#9C27B0",
  document: "#2196F3",
  spreadsheet: "#4CAF50",
  presentation: "#FF5722",
  archive: "#795548",
  code: "#FFC107",
  text: "#607D8B",
  font: "#9E9E9E",
  executable: "#FF5722",
  unknown: "#9E9E9E",
};

export const CATEGORY_ICONS: Record<FileCategory, string> = {
  image: "Image",
  video: "Video",
  audio: "Music",
  document: "FileText",
  spreadsheet: "Table",
  presentation: "Presentation",
  archive: "Archive",
  code: "Code",
  text: "FileText",
  font: "Type",
  executable: "Cpu",
  unknown: "File",
};

// ============================================================================
// File Type Detection
// ============================================================================

/**
 * Get file type info from MIME type
 */
export function getFileTypeInfo(mimeType: string): FileTypeInfo {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  const info = FILE_TYPE_INFO[normalized];

  if (info) return info;

  // Fallback based on general type
  if (normalized.startsWith("image/")) {
    return {
      category: "image",
      icon: "Image",
      label: "Image",
      color: CATEGORY_COLORS.image,
      previewable: true,
    };
  }
  if (normalized.startsWith("video/")) {
    return {
      category: "video",
      icon: "Video",
      label: "Video",
      color: CATEGORY_COLORS.video,
      previewable: true,
    };
  }
  if (normalized.startsWith("audio/")) {
    return {
      category: "audio",
      icon: "Music",
      label: "Audio",
      color: CATEGORY_COLORS.audio,
      previewable: true,
    };
  }
  if (normalized.startsWith("text/")) {
    return {
      category: "text",
      icon: "FileText",
      label: "Text",
      color: CATEGORY_COLORS.text,
      previewable: true,
    };
  }

  return {
    category: "unknown",
    icon: "File",
    label: "File",
    color: CATEGORY_COLORS.unknown,
    previewable: false,
  };
}

/**
 * Get file category from MIME type
 */
export function getFileCategory(mimeType: string): FileCategory {
  return getFileTypeInfo(mimeType).category;
}

/**
 * Get icon name for MIME type
 */
export function getFileIcon(mimeType: string): string {
  return getFileTypeInfo(mimeType).icon;
}

/**
 * Get icon name for file extension
 */
export function getFileIconByExtension(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  return EXTENSION_ICONS[ext] || "File";
}

/**
 * Get file label for MIME type
 */
export function getFileLabel(mimeType: string): string {
  return getFileTypeInfo(mimeType).label;
}

/**
 * Get file color for MIME type
 */
export function getFileColor(mimeType: string): string {
  return getFileTypeInfo(mimeType).color;
}

/**
 * Check if file is previewable
 */
export function isPreviewable(mimeType: string): boolean {
  return getFileTypeInfo(mimeType).previewable;
}

// ============================================================================
// Category Checks
// ============================================================================

/**
 * Check if file is an image
 */
export function isImage(mimeType: string): boolean {
  return getFileCategory(mimeType) === "image";
}

/**
 * Check if file is a video
 */
export function isVideo(mimeType: string): boolean {
  return getFileCategory(mimeType) === "video";
}

/**
 * Check if file is audio
 */
export function isAudio(mimeType: string): boolean {
  return getFileCategory(mimeType) === "audio";
}

/**
 * Check if file is a document
 */
export function isDocument(mimeType: string): boolean {
  const category = getFileCategory(mimeType);
  return (
    category === "document" ||
    category === "spreadsheet" ||
    category === "presentation"
  );
}

/**
 * Check if file is an archive
 */
export function isArchive(mimeType: string): boolean {
  return getFileCategory(mimeType) === "archive";
}

/**
 * Check if file is code
 */
export function isCode(mimeType: string): boolean {
  return getFileCategory(mimeType) === "code";
}

/**
 * Check if file is text-based
 */
export function isTextBased(mimeType: string): boolean {
  const category = getFileCategory(mimeType);
  return category === "text" || category === "code";
}

/**
 * Check if file is media (image, video, or audio)
 */
export function isMedia(mimeType: string): boolean {
  const category = getFileCategory(mimeType);
  return category === "image" || category === "video" || category === "audio";
}

// ============================================================================
// Preview URL Generation
// ============================================================================

/**
 * Generate a preview URL for a file
 */
export function generatePreviewUrl(file: File | Blob): string {
  return URL.createObjectURL(file);
}

/**
 * Generate a data URL from a file
 */
export function generateDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Revoke a preview URL
 */
export function revokePreviewUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Check if URL is a blob URL
 */
export function isBlobUrl(url: string): boolean {
  return url.startsWith("blob:");
}

/**
 * Check if URL is a data URL
 */
export function isDataUrl(url: string): boolean {
  return url.startsWith("data:");
}

// ============================================================================
// Text Preview
// ============================================================================

/**
 * Generate text preview from file
 */
export async function generateTextPreview(
  file: File | Blob,
  maxLength: number = 1000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      resolve(text.slice(0, maxLength));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Generate code preview with syntax detection
 */
export async function generateCodePreview(
  file: File,
  maxLines: number = 20,
): Promise<{ content: string; language: string }> {
  const content = await generateTextPreview(file, 10000);
  const lines = content.split("\n").slice(0, maxLines).join("\n");
  const ext = file.name.toLowerCase().split(".").pop() || "";

  const languageMap: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "jsx",
    tsx: "tsx",
    html: "html",
    css: "css",
    json: "json",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    go: "go",
    rs: "rust",
    rb: "ruby",
    php: "php",
    md: "markdown",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
    sh: "bash",
  };

  return {
    content: lines,
    language: languageMap[ext] || "plaintext",
  };
}

// ============================================================================
// File Information
// ============================================================================

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return "";
  }
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Get filename without extension
 */
export function getFileBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) {
    return filename;
  }
  return filename.substring(0, lastDot);
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 B";
  if (bytes < 0) return "Invalid size";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Get friendly file type name
 */
export function getFriendlyTypeName(
  mimeType: string,
  filename?: string,
): string {
  const info = getFileTypeInfo(mimeType);
  if (info.label !== "File") return info.label;

  if (filename) {
    const ext = getFileExtension(filename).toUpperCase();
    if (ext) return `${ext} File`;
  }

  return "File";
}

// ============================================================================
// Preview Capability Checks
// ============================================================================

/**
 * Check if browser can display image inline
 */
export function canDisplayImage(mimeType: string): boolean {
  const displayable = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    "image/x-icon",
  ];
  return displayable.includes(mimeType.toLowerCase());
}

/**
 * Check if browser can play video inline
 */
export function canPlayVideo(mimeType: string): boolean {
  const video = document.createElement("video");
  return video.canPlayType(mimeType) !== "";
}

/**
 * Check if browser can play audio inline
 */
export function canPlayAudio(mimeType: string): boolean {
  const audio = document.createElement("audio");
  return audio.canPlayType(mimeType) !== "";
}

/**
 * Check if file can be viewed in browser
 */
export function canViewInBrowser(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();

  // Check images
  if (canDisplayImage(normalized)) return true;

  // Check videos
  if (normalized.startsWith("video/") && canPlayVideo(normalized)) return true;

  // Check audio
  if (normalized.startsWith("audio/") && canPlayAudio(normalized)) return true;

  // Check PDFs
  if (normalized === "application/pdf") return true;

  // Check text-based files
  if (normalized.startsWith("text/")) return true;

  return false;
}

// ============================================================================
// Download Helper
// ============================================================================

/**
 * Trigger file download
 */
export function downloadFile(
  source: File | Blob | string,
  filename?: string,
): void {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || (source instanceof File ? source.name : "download");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof source !== "string") {
    URL.revokeObjectURL(url);
  }
}

/**
 * Open file in new tab
 */
export function openInNewTab(source: File | Blob | string): void {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  window.open(url, "_blank");
}
