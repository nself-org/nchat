"use client";

import * as React from "react";
import {
  useDropzone,
  type DropzoneOptions,
  type FileRejection,
} from "react-dropzone";
import {
  Paperclip,
  Plus,
  Image as ImageIcon,
  FileText,
  Film,
  Music,
  Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  validateFile,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
} from "@/lib/storage/upload";

// ============================================================================
// TYPES
// ============================================================================

export interface FileUploadButtonProps {
  /** Callback when files are selected */
  onFilesSelected: (files: File[]) => void;
  /** Callback when files are rejected */
  onFilesRejected?: (rejections: FileRejection[]) => void;
  /** Accepted file types (MIME types) */
  accept?: Record<string, string[]>;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Allow multiple files */
  multiple?: boolean;
  /** Disable the button */
  disabled?: boolean;
  /** Show file count badge */
  fileCount?: number;
  /** Button variant */
  variant?: "default" | "icon" | "dropdown";
  /** Button size */
  size?: ButtonProps["size"];
  /** Button style variant */
  buttonVariant?: ButtonProps["variant"];
  /** Custom icon */
  icon?: React.ReactNode;
  /** Button label */
  label?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default accept configuration */
const DEFAULT_ACCEPT: Record<string, string[]> = {
  "image/*": [],
  "video/*": [],
  "audio/*": [],
  "application/pdf": [],
  "application/msword": [],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [],
  "application/vnd.ms-excel": [],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [],
  "application/vnd.ms-powerpoint": [],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    [],
  "text/plain": [],
  "text/markdown": [],
  "text/csv": [],
  "application/zip": [],
};

/** File type configurations for dropdown */
const FILE_TYPE_OPTIONS = [
  {
    id: "images",
    label: "Images",
    icon: ImageIcon,
    accept: { "image/*": [] },
    description: "JPG, PNG, GIF, WebP",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    accept: {
      "application/pdf": [],
      "application/msword": [],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [],
      "text/plain": [],
      "text/markdown": [],
    },
    description: "PDF, Word, Text",
  },
  {
    id: "videos",
    label: "Videos",
    icon: Film,
    accept: { "video/*": [] },
    description: "MP4, WebM, MOV",
  },
  {
    id: "audio",
    label: "Audio",
    icon: Music,
    accept: { "audio/*": [] },
    description: "MP3, WAV, OGG",
  },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FileUploadButton - Button to trigger file upload
 *
 * @example
 * ```tsx
 * <FileUploadButton
 *   onFilesSelected={(files) => handleUpload(files)}
 *   fileCount={3}
 *   multiple
 * />
 * ```
 */
export function FileUploadButton({
  onFilesSelected,
  onFilesRejected,
  accept = DEFAULT_ACCEPT,
  maxSize = MAX_FILE_SIZE,
  maxFiles,
  multiple = true,
  disabled = false,
  fileCount,
  variant = "icon",
  size = "icon",
  buttonVariant = "ghost",
  icon,
  label,
  tooltip = "Attach files",
  className,
}: FileUploadButtonProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFiles = React.useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const rejections: FileRejection[] = [];

      for (const file of fileArray) {
        const validation = validateFile(file, { maxSize });
        if (validation.valid) {
          validFiles.push(file);
        } else if (validation.error) {
          rejections.push({
            file,
            errors: [
              {
                code: validation.error.code,
                message: validation.error.message,
              },
            ],
          });
        }
      }

      if (rejections.length > 0) {
        onFilesRejected?.(rejections);
      }

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [maxSize, onFilesSelected, onFilesRejected],
  );

  // Handle input change
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
  };

  // Handle click to open file picker
  const handleClick = () => {
    inputRef.current?.click();
  };

  // Create accept string for input
  const acceptString = Object.keys(accept).join(",");

  // Render button content
  const renderButtonContent = () => {
    const iconElement = icon || <Paperclip className="h-4 w-4" />;

    if (variant === "icon") {
      return (
        <div className="relative">
          {iconElement}
          {typeof fileCount === "number" && fileCount > 0 && (
            <Badge
              variant="default"
              className="absolute -right-2 -top-2 h-4 min-w-4 justify-center px-1 text-[10px]"
            >
              {fileCount > 99 ? "99+" : fileCount}
            </Badge>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {iconElement}
        {label && <span>{label}</span>}
        {typeof fileCount === "number" && fileCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {fileCount}
          </Badge>
        )}
      </div>
    );
  };

  // Dropdown variant with file type options
  if (variant === "dropdown") {
    return (
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={buttonVariant}
                  size={size}
                  disabled={disabled}
                  className={className}
                >
                  {renderButtonContent()}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent align="start">
          {/* All files option */}
          <DropdownMenuItem
            onClick={handleClick}
            className="flex items-center gap-2"
          >
            <Folder className="h-4 w-4" />
            <div>
              <p className="font-medium">All files</p>
              <p className="text-xs text-muted-foreground">
                Any supported file type
              </p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* File type options */}
          {FILE_TYPE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => {
                // Create a temporary input with specific accept
                const input = document.createElement("input");
                input.type = "file";
                input.accept = Object.keys(option.accept).join(",");
                input.multiple = multiple;
                input.onchange = (e) => {
                  handleFiles((e.target as HTMLInputElement).files);
                };
                input.click();
              }}
              className="flex items-center gap-2"
            >
              <option.icon className="h-4 w-4" />
              <div>
                <p className="font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>

        {/* Hidden input for "All files" */}
        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          multiple={multiple}
          onChange={handleChange}
          className="sr-only"
          aria-hidden="true"
        />
      </DropdownMenu>
    );
  }

  // Default/icon variant
  const button = (
    <Button
      variant={buttonVariant}
      size={size}
      disabled={disabled}
      onClick={handleClick}
      className={className}
    >
      {renderButtonContent()}
    </Button>
  );

  return (
    <>
      {tooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={acceptString}
        multiple={multiple}
        onChange={handleChange}
        className="sr-only"
        aria-hidden="true"
      />
    </>
  );
}

/**
 * AddFileButton - Plus icon button for adding files
 */
export interface AddFileButtonProps extends Omit<
  FileUploadButtonProps,
  "variant" | "icon"
> {
  /** Show as outline style */
  outline?: boolean;
}

export function AddFileButton({
  outline = false,
  buttonVariant,
  ...props
}: AddFileButtonProps) {
  return (
    <FileUploadButton
      {...props}
      variant="icon"
      buttonVariant={outline ? "outline" : buttonVariant}
      icon={<Plus className="h-4 w-4" />}
      tooltip="Add file"
    />
  );
}

/**
 * ImageUploadButton - Button specifically for image uploads
 */
export interface ImageUploadButtonProps extends Omit<
  FileUploadButtonProps,
  "accept" | "icon"
> {}

export function ImageUploadButton(props: ImageUploadButtonProps) {
  return (
    <FileUploadButton
      {...props}
      accept={{ "image/*": [] }}
      icon={<ImageIcon className="h-4 w-4" />}
      tooltip={props.tooltip || "Upload image"}
    />
  );
}
