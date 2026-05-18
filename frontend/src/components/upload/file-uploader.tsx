"use client";

/**
 * File Uploader Component
 * Combines file upload zone with progress tracking
 */

import * as React from "react";
import { FileUploadZone } from "./file-upload-zone";
import { UploadProgress } from "./upload-progress";
import { cn } from "@/lib/utils";

export interface FileUploaderProps {
  onFilesSelected?: (files: File[]) => void;
  onUploadComplete?: (files: File[]) => void;
  onError?: (error: string) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
}

export function FileUploader({
  onFilesSelected,
  onUploadComplete,
  onError,
  maxFiles = 10,
  maxSizeMB = 50,
  accept = "*/*",
  className,
}: FileUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = React.useState<File[]>([]);

  const handleFilesSelected = React.useCallback(
    (files: File[]) => {
      setUploadingFiles(files);
      onFilesSelected?.(files);
      // Simulate immediate completion for now
      onUploadComplete?.(files);
    },
    [onFilesSelected, onUploadComplete],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <FileUploadZone
        onFilesSelected={handleFilesSelected}
        maxFiles={maxFiles}
        accept={accept}
      />
      {uploadingFiles.length > 0 && (
        <UploadProgress
          id="batch-upload"
          fileName={
            uploadingFiles.length === 1
              ? uploadingFiles[0].name
              : `${uploadingFiles.length} files`
          }
          fileSize={uploadingFiles.reduce((sum, f) => sum + f.size, 0)}
          status="completed"
          progress={100}
          onRemove={() => setUploadingFiles([])}
        />
      )}
    </div>
  );
}

export default FileUploader;
