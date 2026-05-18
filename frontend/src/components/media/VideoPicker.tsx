"use client";

/**
 * VideoPicker Component
 * Video selection with trimming UI and preview
 */

import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Video, Camera, Play, Pause, X, Scissors, Check } from "lucide-react";
import { video } from "@/lib/capacitor/video";
import { formatDuration } from "@/lib/media/video-processor";
import { trimVideoWeb } from "@/lib/capacitor/video";
import { Capacitor } from "@capacitor/core";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface VideoPickerProps {
  maxDurationSeconds?: number;
  maxSizeMB?: number;
  allowCamera?: boolean;
  allowGallery?: boolean;
  allowTrimming?: boolean;
  onVideoSelected?: (videoBlob: Blob, metadata: VideoMetadata) => void;
  onError?: (error: string) => void;
  className?: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  size: number;
  thumbnail?: string;
}

// ============================================================================
// Component
// ============================================================================

export function VideoPicker({
  maxDurationSeconds = 300, // 5 minutes
  maxSizeMB = 100,
  allowCamera = true,
  allowGallery = true,
  allowTrimming = true,
  onVideoSelected,
  onError,
  className,
}: VideoPickerProps) {
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isTrimming, setIsTrimming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      await processVideo(file);
    },
    [],
  );

  /**
   * Process video file
   */
  const processVideo = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("video/")) {
      onError?.("Please select a video file");
      return;
    }

    // Validate file size
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > maxSizeMB) {
      onError?.(`Video size exceeds ${maxSizeMB}MB limit`);
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setSelectedVideo(file);

    // Load video metadata
    const videoElement = document.createElement("video");
    videoElement.src = url;

    videoElement.onloadedmetadata = () => {
      const duration = videoElement.duration;

      if (duration > maxDurationSeconds) {
        onError?.(
          `Video duration exceeds ${Math.floor(maxDurationSeconds / 60)} minutes limit`,
        );
        URL.revokeObjectURL(url);
        setVideoUrl("");
        setSelectedVideo(null);
        return;
      }

      setMetadata({
        duration,
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
        size: file.size,
      });

      setTrimEnd(duration);
    };
  };

  /**
   * Handle camera recording
   */
  const handleCameraRecord = async () => {
    try {
      const hasPermission = await video.requestCameraPermission();
      if (!hasPermission) {
        onError?.("Camera permission denied");
        return;
      }

      const recording = await video.recordVideo({
        maxDuration: maxDurationSeconds,
        quality: "medium",
        saveToGallery: true,
      });

      if (!recording) {
        onError?.("Failed to record video");
        return;
      }

      // Convert to File
      const response = await fetch(recording.uri);
      const blob = await response.blob();
      const file = new File([blob], `video-${Date.now()}.mp4`, {
        type: "video/mp4",
      });

      await processVideo(file);
    } catch (error) {
      logger.error("Camera recording failed:", error);
      onError?.("Failed to record video");
    }
  };

  /**
   * Handle gallery selection
   */
  const handleGallerySelect = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const recording = await video.pickVideo();
        if (!recording) return;

        const response = await fetch(recording.uri);
        const blob = await response.blob();
        const file = new File([blob], `video-${Date.now()}.mp4`, {
          type: "video/mp4",
        });

        await processVideo(file);
      } catch (error) {
        logger.error("Gallery selection failed:", error);
        onError?.("Failed to select video");
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  /**
   * Play/Pause video
   */
  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  /**
   * Handle time update
   */
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  /**
   * Apply trim
   */
  const handleApplyTrim = async () => {
    if (!selectedVideo || !metadata) return;

    setIsProcessing(true);

    try {
      const result = await trimVideoWeb(selectedVideo, trimStart, trimEnd);

      onVideoSelected?.(result.blob, {
        ...metadata,
        duration: result.duration,
        size: result.blob.size,
      });

      setIsProcessing(false);
    } catch (error) {
      logger.error("Failed to trim video:", error);
      onError?.("Failed to trim video");
      setIsProcessing(false);
    }
  };

  /**
   * Send video without trimming
   */
  const handleSendVideo = () => {
    if (!selectedVideo || !metadata) return;

    onVideoSelected?.(selectedVideo, metadata);
  };

  /**
   * Clear selection
   */
  const handleClear = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl("");
    setSelectedVideo(null);
    setMetadata(null);
    setTrimStart(0);
    setTrimEnd(0);
    setIsTrimming(false);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Action Buttons */}
      {!selectedVideo && (
        <div className="flex gap-2">
          {allowCamera && Capacitor.isNativePlatform() && (
            <Button onClick={handleCameraRecord} variant="outline">
              <Camera className="mr-2 h-4 w-4" />
              Record Video
            </Button>
          )}
          {allowGallery && (
            <Button onClick={handleGallerySelect} variant="outline">
              <Video className="mr-2 h-4 w-4" />
              Choose Video
            </Button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Video Preview */}
      {selectedVideo && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full"
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            >
              <track kind="captions" src="" label="Captions" default />
            </video>

            {/* Play button overlay */}
            {!isPlaying && (
              <button
                onClick={handlePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
              >
                <div className="rounded-full bg-white/90 p-4">
                  <Play className="h-8 w-8 text-black" fill="currentColor" />
                </div>
              </button>
            )}
          </div>

          {/* Video info */}
          {metadata && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-4">
                <span>{formatDuration(metadata.duration)}</span>
                <span>
                  {metadata.width} × {metadata.height}
                </span>
                <span>{(metadata.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              {isTrimming && (
                <Badge variant="secondary">
                  Trim: {formatDuration(trimEnd - trimStart)}
                </Badge>
              )}
            </div>
          )}

          {/* Trim Controls */}
          {allowTrimming && metadata && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Trim Video</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsTrimming(!isTrimming)}
                >
                  {isTrimming ? "Cancel Trim" : "Enable Trim"}
                </Button>
              </div>

              {isTrimming && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Start: {formatDuration(trimStart)}</span>
                      <span>End: {formatDuration(trimEnd)}</span>
                    </div>

                    <Slider
                      value={[trimStart, trimEnd]}
                      min={0}
                      max={metadata.duration}
                      step={0.1}
                      onValueChange={([start, end]) => {
                        setTrimStart(start);
                        setTrimEnd(end);
                        if (videoRef.current) {
                          videoRef.current.currentTime = start;
                        }
                      }}
                      className="my-4"
                    />
                  </div>

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="text-sm">Processing video...</div>
                      <Progress value={undefined} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isTrimming ? (
              <Button onClick={handleApplyTrim} disabled={isProcessing}>
                <Scissors className="mr-2 h-4 w-4" />
                Apply Trim
              </Button>
            ) : (
              <Button onClick={handleSendVideo}>
                <Check className="mr-2 h-4 w-4" />
                Use Video
              </Button>
            )}
            <Button variant="outline" onClick={handleClear}>
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedVideo && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
          <Video className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 font-medium">No video selected</p>
          <p className="text-sm text-muted-foreground">
            Record a video or choose from your gallery
          </p>
        </div>
      )}
    </div>
  );
}

export default VideoPicker;
