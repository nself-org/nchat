/**
 * Camera Service for Capacitor
 * Handles photo capture and gallery selection across platforms
 */

import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface CapturedPhoto {
  uri: string;
  filename: string;
  width: number;
  height: number;
  format: string;
  base64?: string;
}

export interface CameraOptions {
  quality?: number;
  width?: number;
  height?: number;
  saveToGallery?: boolean;
}

// ============================================================================
// Camera Service
// ============================================================================

class CameraService {
  /**
   * Take a photo using the device camera
   */
  async takePhoto(options: CameraOptions = {}): Promise<CapturedPhoto | null> {
    try {
      const {
        quality = 90,
        width = 1920,
        height = 1920,
        saveToGallery = true,
      } = options;

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality,
        width,
        height,
        saveToGallery,
        correctOrientation: true,
      });

      return this.processPhoto(photo);
    } catch (error) {
      logger.error("Error taking photo:", error);
      return null;
    }
  }

  /**
   * Pick a photo from the device gallery
   */
  async pickPhoto(options: CameraOptions = {}): Promise<CapturedPhoto | null> {
    try {
      const { quality = 90, width = 1920, height = 1920 } = options;

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        quality,
        width,
        height,
        correctOrientation: true,
      });

      return this.processPhoto(photo);
    } catch (error) {
      logger.error("Error picking photo:", error);
      return null;
    }
  }

  /**
   * Pick multiple photos from the gallery
   */
  async pickMultiplePhotos(limit: number = 10): Promise<CapturedPhoto[]> {
    try {
      const result = await Camera.pickImages({
        quality: 90,
        limit,
      });

      const photos: CapturedPhoto[] = [];
      for (const photo of result.photos) {
        const processed = await this.processGalleryPhoto(photo);
        if (processed) {
          photos.push(processed);
        }
      }

      return photos;
    } catch (error) {
      logger.error("Error picking multiple photos:", error);
      return [];
    }
  }

  /**
   * Process a captured photo
   */
  private processPhoto(photo: Photo): CapturedPhoto | null {
    if (!photo.path && !photo.webPath) {
      return null;
    }

    const uri = photo.webPath || Capacitor.convertFileSrc(photo.path || "");
    const filename = this.generateFilename(photo.format || "jpeg");

    return {
      uri,
      filename,
      width: 0, // Dimensions need to be fetched separately
      height: 0,
      format: photo.format || "jpeg",
      base64: photo.base64String,
    };
  }

  /**
   * Process a gallery photo
   */
  private async processGalleryPhoto(photo: {
    webPath?: string;
    path?: string;
    format?: string;
  }): Promise<CapturedPhoto | null> {
    const uri =
      photo.webPath || (photo.path ? Capacitor.convertFileSrc(photo.path) : "");
    if (!uri) return null;

    const filename = this.generateFilename(photo.format || "jpeg");

    return {
      uri,
      filename,
      width: 0,
      height: 0,
      format: photo.format || "jpeg",
    };
  }

  /**
   * Generate a unique filename
   */
  private generateFilename(format: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `photo_${timestamp}_${random}.${format}`;
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
   * Check photos/gallery permission
   */
  async checkPhotosPermission(): Promise<boolean> {
    try {
      const permissions = await Camera.checkPermissions();
      return permissions.photos === "granted";
    } catch (error) {
      logger.error("Error checking photos permission:", error);
      return false;
    }
  }

  /**
   * Request photos/gallery permission
   */
  async requestPhotosPermission(): Promise<boolean> {
    try {
      const permissions = await Camera.requestPermissions({
        permissions: ["photos"],
      });
      return permissions.photos === "granted";
    } catch (error) {
      logger.error("Error requesting photos permission:", error);
      return false;
    }
  }

  /**
   * Check if running on native platform
   */
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Get current platform
   */
  getPlatform(): string {
    return Capacitor.getPlatform();
  }
}

// Export singleton instance
export const camera = new CameraService();

// Export default for module imports
export default camera;
