/**
 * File Upload Button - Upload button with dropdown menu
 *
 * Features:
 * - Paperclip/attachment icon
 * - Click to open file picker
 * - Dropdown menu with file type options
 * - Support for different file categories
 */

"use client";

import * as React from "react";
import { useCallback, useRef } from "react";
import {
  Paperclip,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  FileText,
  File,
  FolderArchive,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type FileCategory =
  | "all"
  | "images"
  | "videos"
  | "audio"
  | "documents"
  | "archives";

export interface FileUploadButtonProps {
  /** Callback when files are selected */
  onFilesSelected: (files: File[]) => void;
  /** Allow multiple files */
  multiple?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Show dropdown menu for file types */
  showMenu?: boolean;
  /** Default file category */
  defaultCategory?: FileCategory;
  /** Custom class name */
  className?: string;
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Custom trigger content */
  children?: React.ReactNode;
  /** Tooltip text */
  tooltip?: string;
}

// ============================================================================
// Constants
// ============================================================================

const FILE_CATEGORIES: Record<
  FileCategory,
  { accept: string; label: string; icon: React.ReactNode }
> = {
  all: {
    accept: "*/*",
    label: "All Files",
    icon: <File className="h-4 w-4" />,
  },
  images: {
    accept: "image/*",
    label: "Images",
    icon: <ImageIcon className="h-4 w-4" />,
  },
  videos: {
    accept: "video/*",
    label: "Videos",
    icon: <FileVideo className="h-4 w-4" />,
  },
  audio: {
    accept: "audio/*",
    label: "Audio",
    icon: <FileAudio className="h-4 w-4" />,
  },
  documents: {
    accept: ".pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.ppt,.pptx,.csv",
    label: "Documents",
    icon: <FileText className="h-4 w-4" />,
  },
  archives: {
    accept: ".zip,.rar,.7z,.tar,.gz",
    label: "Archives",
    icon: <FolderArchive className="h-4 w-4" />,
  },
};

// ============================================================================
// Component
// ============================================================================

export function FileUploadButton({
  onFilesSelected,
  multiple = true,
  disabled = false,
  showMenu = false,
  defaultCategory = "all",
  className,
  variant = "ghost",
  size = "icon",
  children,
  tooltip,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const currentCategoryRef = useRef<FileCategory>(defaultCategory);

  // Handle file selection
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        onFilesSelected(Array.from(files));
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [onFilesSelected],
  );

  // Open file picker with category
  const openFilePicker = useCallback(
    (category: FileCategory = defaultCategory) => {
      if (inputRef.current && !disabled) {
        currentCategoryRef.current = category;
        inputRef.current.accept = FILE_CATEGORIES[category].accept;
        inputRef.current.click();
      }
    },
    [defaultCategory, disabled],
  );

  // Handle menu item click
  const handleMenuItemClick = useCallback(
    (category: FileCategory) => {
      openFilePicker(category);
    },
    [openFilePicker],
  );

  // Render button content
  const buttonContent = children || <Paperclip className="h-4 w-4" />;

  // Simple button without menu
  if (!showMenu) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={FILE_CATEGORIES[defaultCategory].accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
          aria-hidden="true"
        />
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          onClick={() => openFilePicker()}
          className={className}
          title={tooltip}
          aria-label={tooltip || "Attach files"}
        >
          {buttonContent}
        </Button>
      </>
    );
  }

  // Button with dropdown menu
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
        aria-hidden="true"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled}
            className={cn("gap-1", className)}
            aria-label={tooltip || "Attach files"}
          >
            {buttonContent}
            {size !== "icon" && <Plus className="h-3 w-3" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => handleMenuItemClick("images")}>
            <ImageIcon className="mr-2 h-4 w-4 text-blue-500" />
            <span>Images</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuItemClick("videos")}>
            <FileVideo className="mr-2 h-4 w-4 text-purple-500" />
            <span>Videos</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuItemClick("audio")}>
            <FileAudio className="mr-2 h-4 w-4 text-green-500" />
            <span>Audio</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuItemClick("documents")}>
            <FileText className="mr-2 h-4 w-4 text-orange-500" />
            <span>Documents</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuItemClick("archives")}>
            <FolderArchive className="mr-2 h-4 w-4 text-yellow-500" />
            <span>Archives</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleMenuItemClick("all")}>
            <File className="mr-2 h-4 w-4 text-gray-500" />
            <span>All Files</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

// ============================================================================
// Compact Upload Button
// ============================================================================

export interface CompactUploadButtonProps {
  /** Callback when files are selected */
  onFilesSelected: (files: File[]) => void;
  /** Allow multiple files */
  multiple?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Accept file types */
  accept?: string;
  /** Custom class name */
  className?: string;
  /** Label text */
  label?: string;
}

export function CompactUploadButton({
  onFilesSelected,
  multiple = true,
  disabled = false,
  accept,
  className,
  label = "Attach",
}: CompactUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        onFilesSelected(Array.from(files));
      }
      e.target.value = "";
    },
    [onFilesSelected],
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <Paperclip className="h-4 w-4" />
        <span>{label}</span>
      </button>
    </>
  );
}

// ============================================================================
// Icon Upload Button (minimal)
// ============================================================================

export interface IconUploadButtonProps {
  /** Callback when files are selected */
  onFilesSelected: (files: File[]) => void;
  /** Allow multiple files */
  multiple?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Accept file types */
  accept?: string;
  /** Custom class name */
  className?: string;
  /** Icon size */
  iconSize?: number;
}

export function IconUploadButton({
  onFilesSelected,
  multiple = true,
  disabled = false,
  accept,
  className,
  iconSize = 20,
}: IconUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        onFilesSelected(Array.from(files));
      }
      e.target.value = "";
    },
    [onFilesSelected],
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={cn(
          "rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        aria-label="Attach files"
      >
        <Paperclip style={{ width: iconSize, height: iconSize }} />
      </button>
    </>
  );
}

export default FileUploadButton;
