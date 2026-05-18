/**
 * useDropZone - Drag-and-drop and paste file upload hook
 *
 * Provides comprehensive file upload support via:
 * - Drag-and-drop
 * - Clipboard paste
 * - File input selection
 * - Multi-file support
 *
 * Integrates with the file upload system for validation,
 * progress tracking, and resumable uploads.
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { RefObject } from "react";
import {
  validateFileForPlatform,
  type PlatformPreset,
  type ValidationResult,
  getFileCategory,
} from "@/lib/media/media-parity";
import type { FileTypeConfig } from "@/services/files/types";
import { validateFile as validateFileType } from "@/services/files/types";

// ============================================================================
// Types
// ============================================================================

export interface DropZoneOptions {
  /** Enable drag-and-drop */
  dragDrop?: boolean;
  /** Enable paste from clipboard */
  paste?: boolean;
  /** Maximum number of files */
  maxFiles?: number;
  /** Maximum total size in bytes */
  maxTotalSize?: number;
  /** Accept filter (e.g., 'image/*', '.pdf,.doc') */
  accept?: string | string[];
  /** Platform preset for validation */
  platformPreset?: PlatformPreset;
  /** Is premium user (affects size limits) */
  isPremium?: boolean;
  /** Custom file validation */
  customValidation?: (file: File) => ValidationResult;
  /** Disable the entire drop zone */
  disabled?: boolean;
  /** Callback when files are added */
  onFilesAdded?: (files: File[]) => void;
  /** Callback when files are rejected */
  onFilesRejected?: (files: File[], errors: string[]) => void;
  /** Callback when drag enters */
  onDragEnter?: () => void;
  /** Callback when drag leaves */
  onDragLeave?: () => void;
  /** Callback when paste occurs */
  onPaste?: (files: File[]) => void;
}

export interface DropZoneState {
  /** Whether dragging over the drop zone */
  isDragging: boolean;
  /** Whether currently processing files */
  isProcessing: boolean;
  /** Number of files being dragged */
  dragCount: number;
  /** Error message if any */
  error: string | null;
  /** Last validation warnings */
  warnings: string[];
}

export interface DropZoneActions {
  /** Open file picker dialog */
  openFilePicker: () => void;
  /** Clear any errors */
  clearError: () => void;
  /** Manually add files */
  addFiles: (files: FileList | File[]) => void;
}

export interface UseDropZoneReturn extends DropZoneState, DropZoneActions {
  /** Ref to attach to the drop zone element */
  dropZoneRef: RefObject<HTMLDivElement | null>;
  /** Props to spread on the drop zone element */
  dropZoneProps: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    "data-dragging": boolean;
  };
  /** Hidden file input element ref */
  fileInputRef: RefObject<HTMLInputElement | null>;
  /** Input element props */
  inputProps: {
    type: "file";
    ref: RefObject<HTMLInputElement | null>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    accept?: string;
    multiple: boolean;
    style: React.CSSProperties;
  };
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if the DataTransfer contains files
 */
function hasFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;

  // Check types
  if (dataTransfer.types) {
    for (const type of dataTransfer.types) {
      if (type === "Files") return true;
    }
  }

  // Check items
  if (dataTransfer.items) {
    for (const item of dataTransfer.items) {
      if (item.kind === "file") return true;
    }
  }

  return false;
}

/**
 * Extract files from DataTransfer
 */
function extractFiles(dataTransfer: DataTransfer): File[] {
  const files: File[] = [];

  if (dataTransfer.items) {
    for (const item of dataTransfer.items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  } else if (dataTransfer.files) {
    for (const file of dataTransfer.files) {
      files.push(file);
    }
  }

  return files;
}

/**
 * Extract files from clipboard
 */
function extractFilesFromClipboard(clipboardData: DataTransfer): File[] {
  const files: File[] = [];

  if (clipboardData.items) {
    for (const item of clipboardData.items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          // For pasted images, generate a descriptive name
          if (file.type.startsWith("image/") && file.name === "image.png") {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const extension = file.type.split("/")[1] || "png";
            const namedFile = new File(
              [file],
              `pasted-image-${timestamp}.${extension}`,
              {
                type: file.type,
              },
            );
            files.push(namedFile);
          } else {
            files.push(file);
          }
        }
      }
    }
  }

  return files;
}

/**
 * Parse accept string into array
 */
function parseAccept(accept: string | string[] | undefined): string[] {
  if (!accept) return [];
  if (Array.isArray(accept)) return accept;
  return accept.split(",").map((s) => s.trim());
}

/**
 * Check if file matches accept filter
 */
function matchesAccept(file: File, acceptList: string[]): boolean {
  if (acceptList.length === 0) return true;

  for (const accept of acceptList) {
    // MIME type pattern (e.g., 'image/*')
    if (accept.includes("/")) {
      if (accept.endsWith("/*")) {
        const prefix = accept.replace("/*", "/");
        if (file.type.startsWith(prefix)) return true;
      } else if (file.type === accept) {
        return true;
      }
    }
    // Extension pattern (e.g., '.pdf')
    else if (accept.startsWith(".")) {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === accept.substring(1).toLowerCase()) return true;
    }
  }

  return false;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDropZone(options: DropZoneOptions = {}): UseDropZoneReturn {
  const {
    dragDrop = true,
    paste = true,
    maxFiles = DEFAULT_MAX_FILES,
    maxTotalSize = DEFAULT_MAX_TOTAL_SIZE,
    accept,
    platformPreset = "default",
    isPremium = false,
    customValidation,
    disabled = false,
    onFilesAdded,
    onFilesRejected,
    onDragEnter,
    onDragLeave,
    onPaste,
  } = options;

  // State
  const [state, setState] = useState<DropZoneState>({
    isDragging: false,
    isProcessing: false,
    dragCount: 0,
    error: null,
    warnings: [],
  });

  // Refs
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Parse accept filter
  const acceptList = parseAccept(accept);

  // ============================================================================
  // File Validation
  // ============================================================================

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; rejected: File[]; errors: string[] } => {
      const valid: File[] = [];
      const rejected: File[] = [];
      const errors: string[] = [];
      let totalSize = 0;

      for (const file of files) {
        // Check file count
        if (valid.length >= maxFiles) {
          rejected.push(file);
          errors.push(`Maximum ${maxFiles} files allowed`);
          continue;
        }

        // Check accept filter
        if (acceptList.length > 0 && !matchesAccept(file, acceptList)) {
          rejected.push(file);
          errors.push(`${file.name}: File type not accepted`);
          continue;
        }

        // Check total size
        if (totalSize + file.size > maxTotalSize) {
          rejected.push(file);
          errors.push(`${file.name}: Would exceed maximum total size`);
          continue;
        }

        // Platform validation
        const platformResult = validateFileForPlatform(
          file,
          platformPreset,
          isPremium,
        );
        if (!platformResult.valid) {
          rejected.push(file);
          errors.push(`${file.name}: ${platformResult.error}`);
          continue;
        }

        // Custom validation
        if (customValidation) {
          const customResult = customValidation(file);
          if (!customResult.valid) {
            rejected.push(file);
            errors.push(`${file.name}: ${customResult.error}`);
            continue;
          }
        }

        valid.push(file);
        totalSize += file.size;
      }

      return { valid, rejected, errors };
    },
    [
      maxFiles,
      maxTotalSize,
      acceptList,
      platformPreset,
      isPremium,
      customValidation,
    ],
  );

  // ============================================================================
  // Process Files
  // ============================================================================

  const processFiles = useCallback(
    async (files: File[]) => {
      if (disabled || files.length === 0) return;

      setState((prev) => ({
        ...prev,
        isProcessing: true,
        error: null,
        warnings: [],
      }));

      try {
        const { valid, rejected, errors } = validateFiles(files);

        // Collect warnings from valid files
        const warnings: string[] = [];
        for (const file of valid) {
          const result = validateFileForPlatform(
            file,
            platformPreset,
            isPremium,
          );
          if (result.warnings) {
            warnings.push(...result.warnings.map((w) => `${file.name}: ${w}`));
          }
        }

        setState((prev) => ({
          ...prev,
          warnings,
        }));

        if (valid.length > 0) {
          onFilesAdded?.(valid);
        }

        if (rejected.length > 0) {
          onFilesRejected?.(rejected, errors);
          // Show first error
          if (errors.length > 0) {
            setState((prev) => ({
              ...prev,
              error: errors[0],
            }));
          }
        }
      } finally {
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [
      disabled,
      validateFiles,
      platformPreset,
      isPremium,
      onFilesAdded,
      onFilesRejected,
    ],
  );

  // ============================================================================
  // Drag Handlers
  // ============================================================================

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled || !dragDrop) return;
      if (!hasFiles(e.dataTransfer)) return;

      dragCounterRef.current++;

      if (dragCounterRef.current === 1) {
        setState((prev) => ({
          ...prev,
          isDragging: true,
          dragCount: e.dataTransfer?.items?.length || 0,
        }));
        onDragEnter?.();
      }
    },
    [disabled, dragDrop, onDragEnter],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled || !dragDrop) return;

      // Set drop effect
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    },
    [disabled, dragDrop],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled || !dragDrop) return;

      dragCounterRef.current--;

      if (dragCounterRef.current === 0) {
        setState((prev) => ({
          ...prev,
          isDragging: false,
          dragCount: 0,
        }));
        onDragLeave?.();
      }
    },
    [disabled, dragDrop, onDragLeave],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current = 0;
      setState((prev) => ({
        ...prev,
        isDragging: false,
        dragCount: 0,
      }));

      if (disabled || !dragDrop) return;
      if (!e.dataTransfer) return;

      const files = extractFiles(e.dataTransfer);
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [disabled, dragDrop, processFiles],
  );

  // ============================================================================
  // Paste Handler
  // ============================================================================

  useEffect(() => {
    if (disabled || !paste) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;

      // Don't intercept if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Only allow paste if the drop zone is focused or contains the target
        if (!dropZoneRef.current?.contains(target)) return;
      }

      const files = extractFilesFromClipboard(e.clipboardData);
      if (files.length > 0) {
        e.preventDefault();
        onPaste?.(files);
        processFiles(files);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [disabled, paste, processFiles, onPaste]);

  // ============================================================================
  // File Input Handler
  // ============================================================================

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;

      const files = Array.from(e.target.files);
      processFiles(files);

      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [processFiles],
  );

  // ============================================================================
  // Actions
  // ============================================================================

  const openFilePicker = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.isArray(files) ? files : Array.from(files);
      processFiles(fileArray);
    },
    [processFiles],
  );

  // ============================================================================
  // Return Value
  // ============================================================================

  return {
    // State
    isDragging: state.isDragging,
    isProcessing: state.isProcessing,
    dragCount: state.dragCount,
    error: state.error,
    warnings: state.warnings,

    // Actions
    openFilePicker,
    clearError,
    addFiles,

    // Refs
    dropZoneRef,
    fileInputRef,

    // Props to spread
    dropZoneProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      "data-dragging": state.isDragging,
    },

    inputProps: {
      type: "file" as const,
      ref: fileInputRef,
      onChange: handleInputChange,
      accept: accept
        ? Array.isArray(accept)
          ? accept.join(",")
          : accept
        : undefined,
      multiple: maxFiles > 1,
      style: {
        position: "absolute" as const,
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap" as const,
        border: 0,
      },
    },
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Simple hook for paste-only uploads (e.g., in chat input)
 */
export function usePasteUpload(options: {
  onPaste: (files: File[]) => void;
  accept?: string | string[];
  disabled?: boolean;
}) {
  const { onPaste, accept, disabled = false } = options;
  const acceptList = parseAccept(accept);

  useEffect(() => {
    if (disabled) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;

      const files = extractFilesFromClipboard(e.clipboardData).filter(
        (f) => acceptList.length === 0 || matchesAccept(f, acceptList),
      );

      if (files.length > 0) {
        e.preventDefault();
        onPaste(files);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [disabled, acceptList, onPaste]);
}

/**
 * Hook for detecting drag state globally (for overlay UI)
 */
export function useGlobalDragState() {
  const [isDragging, setIsDragging] = useState(false);
  const counterRef = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return;
      counterRef.current++;
      if (counterRef.current === 1) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = () => {
      counterRef.current--;
      if (counterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = () => {
      counterRef.current = 0;
      setIsDragging(false);
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  return isDragging;
}

export default useDropZone;
