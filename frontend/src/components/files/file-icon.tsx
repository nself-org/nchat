"use client";

import * as React from "react";
import {
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  Presentation,
  FileType2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFileCategory, getFileExtension } from "@/lib/storage/upload";

// ============================================================================
// TYPES
// ============================================================================

export interface FileIconProps {
  /** File name or MIME type */
  file: string | File;
  /** Icon size */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Custom class name */
  className?: string;
  /** Show colored background */
  showBackground?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZE_MAP = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
} as const;

const BACKGROUND_SIZE_MAP = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
} as const;

/** Extension to icon mapping */
const EXTENSION_ICONS: Record<
  string,
  { icon: typeof File; color: string; bg: string }
> = {
  // Documents - PDF
  pdf: {
    icon: FileText,
    color: "text-red-500",
    bg: "bg-red-100 dark:bg-red-900/30",
  },

  // Documents - Word
  doc: {
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  docx: {
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  odt: {
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  rtf: {
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },

  // Documents - Excel
  xls: {
    icon: FileSpreadsheet,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  xlsx: {
    icon: FileSpreadsheet,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  csv: {
    icon: FileSpreadsheet,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  ods: {
    icon: FileSpreadsheet,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
  },

  // Documents - PowerPoint
  ppt: {
    icon: Presentation,
    color: "text-orange-500",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  pptx: {
    icon: Presentation,
    color: "text-orange-500",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  odp: {
    icon: Presentation,
    color: "text-orange-500",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },

  // Text files
  txt: {
    icon: FileType2,
    color: "text-gray-600",
    bg: "bg-gray-100 dark:bg-gray-900/30",
  },
  md: {
    icon: FileType2,
    color: "text-gray-600",
    bg: "bg-gray-100 dark:bg-gray-900/30",
  },
  markdown: {
    icon: FileType2,
    color: "text-gray-600",
    bg: "bg-gray-100 dark:bg-gray-900/30",
  },

  // Code files
  js: {
    icon: FileCode,
    color: "text-yellow-500",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  jsx: {
    icon: FileCode,
    color: "text-yellow-500",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  ts: {
    icon: FileCode,
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  tsx: {
    icon: FileCode,
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  py: {
    icon: FileCode,
    color: "text-green-500",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  java: {
    icon: FileCode,
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  c: {
    icon: FileCode,
    color: "text-blue-700",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  cpp: {
    icon: FileCode,
    color: "text-blue-700",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  h: {
    icon: FileCode,
    color: "text-blue-700",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  hpp: {
    icon: FileCode,
    color: "text-blue-700",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  go: {
    icon: FileCode,
    color: "text-cyan-500",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  rs: {
    icon: FileCode,
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  rb: {
    icon: FileCode,
    color: "text-red-500",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  php: {
    icon: FileCode,
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  swift: {
    icon: FileCode,
    color: "text-orange-500",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  kt: {
    icon: FileCode,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  html: {
    icon: FileCode,
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  css: {
    icon: FileCode,
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  scss: {
    icon: FileCode,
    color: "text-pink-500",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },
  json: {
    icon: FileCode,
    color: "text-yellow-600",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  xml: {
    icon: FileCode,
    color: "text-gray-600",
    bg: "bg-gray-100 dark:bg-gray-900/30",
  },
  yaml: {
    icon: FileCode,
    color: "text-red-500",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  yml: {
    icon: FileCode,
    color: "text-red-500",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  sql: {
    icon: FileCode,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  sh: {
    icon: FileCode,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  bash: {
    icon: FileCode,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
  },

  // Images
  jpg: {
    icon: FileImage,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  jpeg: {
    icon: FileImage,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  png: {
    icon: FileImage,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  gif: {
    icon: FileImage,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  webp: {
    icon: FileImage,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  svg: {
    icon: FileImage,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  bmp: {
    icon: FileImage,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  ico: {
    icon: FileImage,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  tiff: {
    icon: FileImage,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  psd: {
    icon: FileImage,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  ai: {
    icon: FileImage,
    color: "text-orange-500",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },

  // Video
  mp4: {
    icon: FileVideo,
    color: "text-pink-500",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },
  webm: {
    icon: FileVideo,
    color: "text-pink-500",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },
  mov: {
    icon: FileVideo,
    color: "text-pink-500",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },
  avi: {
    icon: FileVideo,
    color: "text-pink-500",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },
  mkv: {
    icon: FileVideo,
    color: "text-pink-500",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },
  flv: {
    icon: FileVideo,
    color: "text-pink-500",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },
  wmv: {
    icon: FileVideo,
    color: "text-pink-500",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },

  // Audio
  mp3: {
    icon: FileAudio,
    color: "text-cyan-500",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  wav: {
    icon: FileAudio,
    color: "text-cyan-500",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  ogg: {
    icon: FileAudio,
    color: "text-cyan-500",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  flac: {
    icon: FileAudio,
    color: "text-cyan-500",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  aac: {
    icon: FileAudio,
    color: "text-cyan-500",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  m4a: {
    icon: FileAudio,
    color: "text-cyan-500",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  wma: {
    icon: FileAudio,
    color: "text-cyan-500",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
  },

  // Archives
  zip: {
    icon: FileArchive,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  rar: {
    icon: FileArchive,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  "7z": {
    icon: FileArchive,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  tar: {
    icon: FileArchive,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  gz: {
    icon: FileArchive,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  bz2: {
    icon: FileArchive,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  xz: {
    icon: FileArchive,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
};

/** Category fallback icons */
const CATEGORY_ICONS: Record<
  string,
  { icon: typeof File; color: string; bg: string }
> = {
  image: {
    icon: FileImage,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  video: {
    icon: FileVideo,
    color: "text-pink-500",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },
  audio: {
    icon: FileAudio,
    color: "text-cyan-500",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  document: {
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  archive: {
    icon: FileArchive,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  code: {
    icon: FileCode,
    color: "text-green-500",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  other: {
    icon: File,
    color: "text-gray-500",
    bg: "bg-gray-100 dark:bg-gray-900/30",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FileIcon - Displays an icon based on file type
 *
 * @example
 * ```tsx
 * <FileIcon file="document.pdf" />
 * <FileIcon file={file} size="lg" showBackground />
 * ```
 */
export function FileIcon({
  file,
  size = "md",
  className,
  showBackground = false,
}: FileIconProps) {
  // Get file info
  const fileName = typeof file === "string" ? file : file.name;
  const mimeType = typeof file === "string" ? "" : file.type;
  const extension = getFileExtension(fileName);

  // Get icon config
  let iconConfig = EXTENSION_ICONS[extension];

  if (!iconConfig) {
    // Fall back to category-based icon
    const category = mimeType ? getFileCategory(mimeType) : "other";
    iconConfig = CATEGORY_ICONS[category];
  }

  const { icon: Icon, color, bg } = iconConfig;

  if (showBackground) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg",
          bg,
          BACKGROUND_SIZE_MAP[size],
          className,
        )}
      >
        <Icon className={cn(SIZE_MAP[size], color)} />
      </div>
    );
  }

  return <Icon className={cn(SIZE_MAP[size], color, className)} />;
}

/**
 * Get icon info for a file without rendering
 */
export function getFileIconInfo(file: string | File) {
  const fileName = typeof file === "string" ? file : file.name;
  const mimeType = typeof file === "string" ? "" : file.type;
  const extension = getFileExtension(fileName);

  let iconConfig = EXTENSION_ICONS[extension];

  if (!iconConfig) {
    const category = mimeType ? getFileCategory(mimeType) : "other";
    iconConfig = CATEGORY_ICONS[category];
  }

  return iconConfig;
}
