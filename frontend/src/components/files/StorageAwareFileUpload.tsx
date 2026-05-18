"use client";

/**
 * Storage-Aware File Upload Component
 *
 * File upload component that checks storage quota before uploading
 * and provides real-time feedback on storage usage.
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  File,
  X,
  HardDrive,
} from "lucide-react";
import { useStorageQuota, useQuotaCheck } from "@/hooks/use-storage-quota";
import {
  uploadFile,
  formatFileSize,
  type UploadResult,
} from "@/lib/storage/upload";
import { formatBytes, getQuotaStatus } from "@/lib/storage/quota-manager";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

interface StorageAwareFileUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  accept?: string;
  maxFileSize?: number;
  className?: string;
}

export function StorageAwareFileUpload({
  onUploadComplete,
  onUploadError,
  accept,
  maxFileSize,
  className,
}: StorageAwareFileUploadProps) {
  const { quota, loading: quotaLoading } = useStorageQuota({
    autoRefresh: true,
  });
  const { checkUpload, recordUpload } = useQuotaCheck();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadError(null);
      setQuotaError(null);

      // Check if file size exceeds quota
      const quotaCheck = await checkUpload(file.size);
      if (!quotaCheck.allowed) {
        setQuotaError(quotaCheck.reason || "Upload not allowed");
        return;
      }

      setSelectedFile(file);
    },
    [checkUpload],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // Upload file
      const result = await uploadFile(selectedFile, {
        onProgress: (progress) => {
          setUploadProgress(progress.percentage);
        },
      });

      // Record upload in quota
      await recordUpload(selectedFile.size);

      // Notify parent
      onUploadComplete?.(result);

      // Reset
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      setUploadError(errorMessage);
      onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setUploading(false);
    }
  }, [selectedFile, recordUpload, onUploadComplete, onUploadError]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setUploadError(null);
    setQuotaError(null);
    setUploadProgress(0);
  }, []);

  const quotaStatus = quota ? getQuotaStatus(quota.used, quota.limit) : "ok";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Storage Quota Display */}
      {quota && !quotaLoading && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <HardDrive className="h-4 w-4" />
              Storage Usage
            </div>
            <Badge
              variant={
                quotaStatus === "exceeded"
                  ? "destructive"
                  : quotaStatus === "critical" || quotaStatus === "warning"
                    ? "default"
                    : "secondary"
              }
            >
              {quota.percentage}%
            </Badge>
          </div>
          <Progress
            value={quota.percentage}
            className={cn(
              "h-2",
              quotaStatus === "exceeded" && "[&>*]:bg-red-500",
              quotaStatus === "critical" && "[&>*]:bg-orange-500",
              quotaStatus === "warning" && "[&>*]:bg-yellow-500",
            )}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {formatBytes(quota.used)} / {formatBytes(quota.limit)}
            </span>
            <span>{formatBytes(quota.limit - quota.used)} remaining</span>
          </div>
        </div>
      )}

      {/* Quota Warnings */}
      {quotaStatus === "warning" && (
        <Alert className="border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You're running low on storage space. Consider deleting old files.
          </AlertDescription>
        </Alert>
      )}

      {quotaStatus === "critical" && (
        <Alert className="border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Storage is almost full. Delete files or upgrade your plan.
          </AlertDescription>
        </Alert>
      )}

      {quotaStatus === "exceeded" && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Storage quota exceeded. Please delete files before uploading more.
          </AlertDescription>
        </Alert>
      )}

      {/* Quota Error */}
      {quotaError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{quotaError}</AlertDescription>
        </Alert>
      )}

      {/* Upload Error */}
      {uploadError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* File Input */}
      {!selectedFile && (
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept={accept}
            onChange={handleFileSelect}
            disabled={uploading || quotaStatus === "exceeded"}
          />
          <label htmlFor="file-upload" className="flex-1">
            <span className="sr-only">Choose file to upload</span>
            <Button
              variant="outline"
              className="w-full"
              asChild
              disabled={uploading || quotaStatus === "exceeded"}
            >
              <div className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </div>
            </Button>
          </label>
        </div>
      )}

      {/* Selected File */}
      {selectedFile && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
            <File className="h-8 w-8 shrink-0 text-muted-foreground" />
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            {!uploading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Upload Button */}
          {!uploading && (
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Upload Complete */}
      {!selectedFile && !uploading && uploadProgress === 100 && (
        <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>File uploaded successfully!</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function CompactStorageUpload({
  onUploadComplete,
  className,
}: {
  onUploadComplete?: (result: UploadResult) => void;
  className?: string;
}) {
  const { checkUpload, recordUpload } = useQuotaCheck();
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Check quota
      const quotaCheck = await checkUpload(file.size);
      if (!quotaCheck.allowed) {
        alert(quotaCheck.reason);
        return;
      }

      setUploading(true);
      try {
        const result = await uploadFile(file);
        await recordUpload(file.size);
        onUploadComplete?.(result);
      } catch (error) {
        logger.error("Upload failed:", error);
        alert("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [checkUpload, recordUpload, onUploadComplete],
  );

  return (
    <div className={className}>
      <input
        type="file"
        id="compact-upload"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      <label htmlFor="compact-upload">
        <span className="sr-only">Upload file</span>
        <Button variant="outline" size="sm" asChild disabled={uploading}>
          <div className="cursor-pointer">
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload"}
          </div>
        </Button>
      </label>
    </div>
  );
}
