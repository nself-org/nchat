/**
 * Video Recording and Management for Capacitor
 * Handles video capture, trimming, and processing
 */

import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { getVideoMetadata, generateThumbnail } from "../media/video-processor";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface VideoFile {
  uri: string;
  path?: string;
  duration: number;
  width: number;
  height: number;
  size: number;
  thumbnailUri?: string;
  format: string;
}

export interface VideoRecordingOptions {
  maxDuration?: number; // in seconds
  quality?: "low" | "medium" | "high";
  saveToGallery?: boolean;
}

export interface VideoTrimOptions {
  startTime: number;
  endTime: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_VIDEO_DURATION = 300; // 5 minutes
const DEFAULT_QUALITY = "medium";

// ============================================================================
// Video Recording Service
// ============================================================================

class VideoService {
  /**
   * Record a video using the camera
   */
  async recordVideo(
    options: VideoRecordingOptions = {},
  ): Promise<VideoFile | null> {
    try {
      const {
        maxDuration = MAX_VIDEO_DURATION,
        quality = DEFAULT_QUALITY,
        saveToGallery = true,
      } = options;

      // Note: Capacitor Camera plugin has limited video support
      // For production, consider using a dedicated video capture plugin
      const video = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: this.getQualityValue(quality),
        saveToGallery,
        // @ts-ignore - video mode not in types but supported on some platforms
        mediaType: "video",
        // @ts-ignore
        duration: maxDuration,
      });

      if (!video.path) {
        return null;
      }

      return this.processVideo(video.path);
    } catch (error) {
      logger.error("Error recording video:", error);
      return null;
    }
  }

  /**
   * Pick a video from the gallery
   */
  async pickVideo(): Promise<VideoFile | null> {
    try {
      const video = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        quality: 90,
        // @ts-ignore - video mode
        mediaType: "video",
      });

      if (!video.path) {
        return null;
      }

      return this.processVideo(video.path);
    } catch (error) {
      logger.error("Error picking video:", error);
      return null;
    }
  }

  /**
   * Process video file to extract metadata and thumbnail
   */
  private async processVideo(path: string): Promise<VideoFile> {
    const uri = Capacitor.convertFileSrc(path);

    // Get metadata
    const metadata = await getVideoMetadata(uri);

    // Get file size
    let size = 0;
    try {
      const stat = await Filesystem.stat({ path });
      size = stat.size;
    } catch (error) {
      logger.warn("Could not get video file size:", { context: error });
    }

    // Generate thumbnail
    let thumbnailUri: string | undefined;
    try {
      const thumbnailBlob = await generateThumbnail(uri, { time: 1 });
      const reader = new FileReader();
      thumbnailUri = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(thumbnailBlob);
      });
    } catch (error) {
      logger.warn("Could not generate video thumbnail:", { context: error });
    }

    return {
      uri,
      path,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      size,
      thumbnailUri,
      format: "mp4",
    };
  }

  /**
   * Trim video (requires native plugin or web implementation)
   */
  async trimVideo(
    videoPath: string,
    options: VideoTrimOptions,
  ): Promise<VideoFile | null> {
    // Note: Video trimming requires a native plugin like capacitor-video-editor
    // This is a placeholder implementation
    logger.warn("Video trimming requires native plugin implementation");

    // For web implementation, we would need to use FFmpeg.wasm
    // which is quite heavy. Better to handle this server-side.
    return null;
  }

  /**
   * Get video duration without full processing
   */
  async getVideoDuration(path: string): Promise<number> {
    const uri = Capacitor.convertFileSrc(path);
    const metadata = await getVideoMetadata(uri);
    return metadata.duration;
  }

  /**
   * Validate video file
   */
  async validateVideo(
    path: string,
    maxDurationSeconds: number = MAX_VIDEO_DURATION,
    maxSizeMB: number = 100,
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const video = await this.processVideo(path);

      if (video.duration > maxDurationSeconds) {
        return {
          valid: false,
          error: `Video is too long. Maximum duration is ${Math.floor(maxDurationSeconds / 60)} minutes.`,
        };
      }

      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (video.size > maxSizeBytes) {
        return {
          valid: false,
          error: `Video file is too large. Maximum size is ${maxSizeMB}MB.`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: "Failed to validate video file.",
      };
    }
  }

  /**
   * Delete video from device
   */
  async deleteVideo(path: string): Promise<boolean> {
    try {
      await Filesystem.deleteFile({ path, directory: Directory.Data });
      return true;
    } catch (error) {
      logger.error("Error deleting video:", error);
      return false;
    }
  }

  /**
   * Get quality value for camera
   */
  private getQualityValue(quality: "low" | "medium" | "high"): number {
    const qualityMap = {
      low: 50,
      medium: 70,
      high: 90,
    };
    return qualityMap[quality];
  }

  /**
   * Check camera permission
   */
  async checkCameraPermission(): Promise<boolean> {
    try {
      const permissions = await Camera.checkPermissions();
      return permissions.camera === "granted";
    } catch (error) {
      logger.error("Error checking camera permission:", error);
      return false;
    }
  }

  /**
   * Request camera permission
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const permissions = await Camera.requestPermissions({
        permissions: ["camera"],
      });
      return permissions.camera === "granted";
    } catch (error) {
      logger.error("Error requesting camera permission:", error);
      return false;
    }
  }

  /**
   * Check microphone permission (for video recording with audio)
   */
  async checkMicrophonePermission(): Promise<boolean> {
    try {
      // Check using Web Audio API
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Request microphone permission
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Error requesting microphone permission:", error);
      return false;
    }
  }
}

// Export singleton instance
export const video = new VideoService();

// ============================================================================
// Web-based Video Trimming (using HTML5 Video)
// ============================================================================

export interface VideoTrimResult {
  blob: Blob;
  duration: number;
}

/**
 * Simple video trimming using MediaRecorder API (web only)
 * For native apps, use a native plugin like capacitor-video-editor
 */
export async function trimVideoWeb(
  videoFile: File | Blob,
  startTime: number,
  endTime: number,
): Promise<VideoTrimResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;

    video.onloadedmetadata = () => {
      const duration = endTime - startTime;

      // Create canvas for rendering
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Capture stream from canvas
      const stream = canvas.captureStream(30); // 30 FPS

      // Add audio track if present
      // Note: This is simplified - proper audio trimming is complex

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
        videoBitsPerSecond: 2500000,
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        URL.revokeObjectURL(video.src);
        resolve({ blob, duration });
      };

      // Seek to start time
      video.currentTime = startTime;

      video.onseeked = () => {
        mediaRecorder.start();
        video.play();

        // Draw frames
        const drawFrame = () => {
          if (video.currentTime >= endTime) {
            mediaRecorder.stop();
            video.pause();
            return;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        };

        drawFrame();
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video"));
    };
  });
}
