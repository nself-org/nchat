/**
 * Media Pipeline Plugin Hooks
 * React hooks for using Media Pipeline plugin functionality
 */

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  mediaService,
  type MediaUploadResponse,
  type MediaMetadata,
} from "@/services/plugins/media.service";

export function useMediaUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadImage = useCallback(
    async (file: File): Promise<MediaUploadResponse | null> => {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 100);

        const result = await mediaService.uploadImage(file);

        clearInterval(progressInterval);
        setUploadProgress(100);

        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Upload failed"));
        return null;
      } finally {
        setIsUploading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    },
    [],
  );

  return {
    uploadImage,
    isUploading,
    uploadProgress,
    error,
  };
}

export function useMediaMetadata(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<MediaMetadata>(
    id ? `/media/metadata/${id}` : null,
    () => (id ? mediaService.getMetadata(id) : Promise.reject()),
  );

  return {
    metadata: data,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useMediaHealth() {
  const { data, error, isLoading, mutate } = useSWR(
    "/media/health",
    () => mediaService.checkHealth(),
    { refreshInterval: 30000 },
  );

  return {
    health: data,
    isHealthy: data?.status === "healthy",
    isLoading,
    error,
    checkHealth: mutate,
  };
}
