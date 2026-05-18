/**
 * Permission Management for Capacitor
 * Centralized permission handling for camera, microphone, storage, etc.
 */

import { Camera } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type PermissionType =
  | "camera"
  | "photos"
  | "microphone"
  | "storage"
  | "notifications";

export type PermissionStatus = "granted" | "denied" | "prompt" | "unknown";

export interface PermissionResult {
  status: PermissionStatus;
  canRequest: boolean;
}

// ============================================================================
// Permission Manager
// ============================================================================

class PermissionManager {
  /**
   * Check if running on native platform
   */
  private isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Check camera permission
   */
  async checkCameraPermission(): Promise<PermissionResult> {
    try {
      if (!this.isNative()) {
        // Web: Check using MediaDevices API
        const status = await this.checkMediaDevicePermission("camera");
        return { status, canRequest: status !== "granted" };
      }

      const permissions = await Camera.checkPermissions();
      return {
        status: permissions.camera as PermissionStatus,
        canRequest: permissions.camera !== "granted",
      };
    } catch (error) {
      logger.error("Error checking camera permission:", error);
      return { status: "unknown", canRequest: true };
    }
  }

  /**
   * Request camera permission
   */
  async requestCameraPermission(): Promise<PermissionStatus> {
    try {
      if (!this.isNative()) {
        return await this.requestMediaDevicePermission("camera");
      }

      const permissions = await Camera.requestPermissions({
        permissions: ["camera"],
      });
      return permissions.camera as PermissionStatus;
    } catch (error) {
      logger.error("Error requesting camera permission:", error);
      return "denied";
    }
  }

  /**
   * Check photo library permission
   */
  async checkPhotoLibraryPermission(): Promise<PermissionResult> {
    try {
      if (!this.isNative()) {
        return { status: "granted", canRequest: false };
      }

      const permissions = await Camera.checkPermissions();
      return {
        status: permissions.photos as PermissionStatus,
        canRequest: permissions.photos !== "granted",
      };
    } catch (error) {
      logger.error("Error checking photo library permission:", error);
      return { status: "unknown", canRequest: true };
    }
  }

  /**
   * Request photo library permission
   */
  async requestPhotoLibraryPermission(): Promise<PermissionStatus> {
    try {
      if (!this.isNative()) {
        return "granted";
      }

      const permissions = await Camera.requestPermissions({
        permissions: ["photos"],
      });
      return permissions.photos as PermissionStatus;
    } catch (error) {
      logger.error("Error requesting photo library permission:", error);
      return "denied";
    }
  }

  /**
   * Check microphone permission
   */
  async checkMicrophonePermission(): Promise<PermissionResult> {
    try {
      const status = await this.checkMediaDevicePermission("microphone");
      return { status, canRequest: status !== "granted" };
    } catch (error) {
      logger.error("Error checking microphone permission:", error);
      return { status: "unknown", canRequest: true };
    }
  }

  /**
   * Request microphone permission
   */
  async requestMicrophonePermission(): Promise<PermissionStatus> {
    try {
      return await this.requestMediaDevicePermission("microphone");
    } catch (error) {
      logger.error("Error requesting microphone permission:", error);
      return "denied";
    }
  }

  /**
   * Check multiple permissions at once
   */
  async checkPermissions(
    types: PermissionType[],
  ): Promise<Record<PermissionType, PermissionResult>> {
    const results: Partial<Record<PermissionType, PermissionResult>> = {};

    for (const type of types) {
      switch (type) {
        case "camera":
          results.camera = await this.checkCameraPermission();
          break;
        case "photos":
          results.photos = await this.checkPhotoLibraryPermission();
          break;
        case "microphone":
          results.microphone = await this.checkMicrophonePermission();
          break;
        default:
          results[type] = { status: "unknown", canRequest: false };
      }
    }

    return results as Record<PermissionType, PermissionResult>;
  }

  /**
   * Request multiple permissions at once
   */
  async requestPermissions(
    types: PermissionType[],
  ): Promise<Record<PermissionType, PermissionStatus>> {
    const results: Partial<Record<PermissionType, PermissionStatus>> = {};

    for (const type of types) {
      switch (type) {
        case "camera":
          results.camera = await this.requestCameraPermission();
          break;
        case "photos":
          results.photos = await this.requestPhotoLibraryPermission();
          break;
        case "microphone":
          results.microphone = await this.requestMicrophonePermission();
          break;
        default:
          results[type] = "unknown";
      }
    }

    return results as Record<PermissionType, PermissionStatus>;
  }

  /**
   * Check media device permission (Web API)
   */
  private async checkMediaDevicePermission(
    kind: "camera" | "microphone",
  ): Promise<PermissionStatus> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return "unknown";
    }

    const constraints = kind === "camera" ? { video: true } : { audio: true };

    try {
      // Try to get stream (will prompt if not granted)
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Stop all tracks
      stream.getTracks().forEach((track) => track.stop());

      return "granted";
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          return "denied";
        }
        if (
          error.name === "NotFoundError" ||
          error.name === "DevicesNotFoundError"
        ) {
          return "unknown";
        }
      }
      return "prompt";
    }
  }

  /**
   * Request media device permission (Web API)
   */
  private async requestMediaDevicePermission(
    kind: "camera" | "microphone",
  ): Promise<PermissionStatus> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return "unknown";
    }

    const constraints = kind === "camera" ? { video: true } : { audio: true };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((track) => track.stop());
      return "granted";
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          return "denied";
        }
      }
      return "denied";
    }
  }

  /**
   * Open app settings (iOS/Android)
   */
  async openAppSettings(): Promise<void> {
    if (!this.isNative()) {
      logger.warn("openAppSettings is only available on native platforms");
      return;
    }

    // Note: This requires a plugin like @capacitor/app
    // For now, just log a warning
    logger.warn("Please enable permissions in your device settings");
  }

  /**
   * Show permission rationale
   */
  showPermissionRationale(type: PermissionType): string {
    const rationales: Record<PermissionType, string> = {
      camera: "Camera access is needed to take photos and videos.",
      photos: "Photo library access is needed to select images.",
      microphone:
        "Microphone access is needed to record audio and voice notes.",
      storage: "Storage access is needed to save files.",
      notifications: "Notification permission is needed to receive updates.",
    };

    return (
      rationales[type] ||
      "This permission is required for the app to function properly."
    );
  }

  /**
   * Check if permission is permanently denied
   */
  async isPermissionPermanentlyDenied(type: PermissionType): Promise<boolean> {
    const result = await this.checkPermissions([type]);
    return result[type].status === "denied" && !result[type].canRequest;
  }
}

// Export singleton instance
export const permissions = new PermissionManager();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if all permissions are granted
 */
export async function areAllPermissionsGranted(
  types: PermissionType[],
): Promise<boolean> {
  const results = await permissions.checkPermissions(types);
  return types.every((type) => results[type].status === "granted");
}

/**
 * Request all missing permissions
 */
export async function requestMissingPermissions(
  types: PermissionType[],
): Promise<{ granted: PermissionType[]; denied: PermissionType[] }> {
  const results = await permissions.requestPermissions(types);

  const granted: PermissionType[] = [];
  const denied: PermissionType[] = [];

  for (const type of types) {
    if (results[type] === "granted") {
      granted.push(type);
    } else {
      denied.push(type);
    }
  }

  return { granted, denied };
}

/**
 * Show permission dialog with rationale
 */
export async function requestPermissionWithRationale(
  type: PermissionType,
  onShowRationale?: (message: string) => Promise<boolean>,
): Promise<PermissionStatus> {
  const result = await permissions.checkPermissions([type]);

  if (result[type].status === "granted") {
    return "granted";
  }

  // Show rationale if provided
  if (onShowRationale) {
    const message = permissions.showPermissionRationale(type);
    const shouldRequest = await onShowRationale(message);

    if (!shouldRequest) {
      return "denied";
    }
  }

  // Request permission
  const status = await permissions.requestPermissions([type]);
  return status[type];
}
