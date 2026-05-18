/**
 * Camera Adapter Module
 *
 * Provides a unified camera interface across platforms.
 * Supports web (MediaDevices API), mobile (Capacitor Camera),
 * and desktop platforms.
 */

import {
  Platform,
  detectPlatform,
  hasMediaDevicesAPI,
  isBrowser,
} from "./platform-detector";

// ============================================================================
// Types
// ============================================================================

/**
 * Camera source type
 */
export type CameraSource = "camera" | "photos" | "prompt";

/**
 * Camera direction
 */
export type CameraDirection = "front" | "rear" | "user" | "environment";

/**
 * Image quality (0-100)
 */
export type ImageQuality = number;

/**
 * Result encoding type
 */
export type CameraResultType = "uri" | "base64" | "dataUrl" | "blob";

/**
 * Camera options
 */
export interface CameraOptions {
  /** Source: camera, photos, or prompt user */
  source?: CameraSource;
  /** Camera direction */
  direction?: CameraDirection;
  /** Image quality (0-100) */
  quality?: ImageQuality;
  /** Result type */
  resultType?: CameraResultType;
  /** Maximum width */
  width?: number;
  /** Maximum height */
  height?: number;
  /** Allow editing after capture */
  allowEditing?: boolean;
  /** Save to gallery */
  saveToGallery?: boolean;
  /** Prompt labels */
  promptLabelHeader?: string;
  promptLabelCancel?: string;
  promptLabelPhoto?: string;
  promptLabelPicture?: string;
}

/**
 * Camera result
 */
export interface CameraResult {
  /** Success indicator */
  success: boolean;
  /** Data (URI, base64, or data URL) */
  data?: string;
  /** Blob data if resultType is blob */
  blob?: Blob;
  /** MIME type */
  format?: string;
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
  /** Error if failed */
  error?: Error;
  /** Whether the operation was cancelled */
  cancelled?: boolean;
}

/**
 * Camera permission state
 */
export type CameraPermission = "granted" | "denied" | "prompt";

/**
 * Camera adapter interface
 */
export interface CameraAdapter {
  /** Check camera permission */
  checkPermission(): Promise<CameraPermission>;
  /** Request camera permission */
  requestPermission(): Promise<CameraPermission>;
  /** Take a photo */
  takePicture(options?: CameraOptions): Promise<CameraResult>;
  /** Pick from gallery */
  pickFromGallery(options?: CameraOptions): Promise<CameraResult>;
  /** Check if camera is available */
  isAvailable(): boolean;
}

/**
 * Extended window for camera APIs
 */
interface CameraWindow extends Window {
  Capacitor?: {
    Plugins?: {
      Camera?: {
        checkPermissions: () => Promise<{ camera: string; photos: string }>;
        requestPermissions: (opts?: {
          permissions: string[];
        }) => Promise<{ camera: string; photos: string }>;
        getPhoto: (opts: {
          quality?: number;
          allowEditing?: boolean;
          resultType?: string;
          source?: string;
          direction?: string;
          width?: number;
          height?: number;
          saveToGallery?: boolean;
          promptLabelHeader?: string;
          promptLabelCancel?: string;
          promptLabelPhoto?: string;
          promptLabelPicture?: string;
        }) => Promise<{
          base64String?: string;
          dataUrl?: string;
          path?: string;
          webPath?: string;
          format: string;
        }>;
      };
    };
  };
}

// ============================================================================
// Web Camera Adapter
// ============================================================================

/**
 * Web MediaDevices API camera adapter
 */
export class WebCameraAdapter implements CameraAdapter {
  private stream: MediaStream | null = null;

  isAvailable(): boolean {
    return hasMediaDevicesAPI();
  }

  async checkPermission(): Promise<CameraPermission> {
    if (!hasMediaDevicesAPI()) {
      return "denied";
    }

    try {
      const result = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      if (result.state === "granted") return "granted";
      if (result.state === "denied") return "denied";
      return "prompt";
    } catch {
      // Firefox doesn't support camera permission query
      return "prompt";
    }
  }

  async requestPermission(): Promise<CameraPermission> {
    if (!hasMediaDevicesAPI()) {
      return "denied";
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      return "granted";
    } catch (error) {
      if ((error as Error).name === "NotAllowedError") {
        return "denied";
      }
      return "prompt";
    }
  }

  async takePicture(options?: CameraOptions): Promise<CameraResult> {
    if (!hasMediaDevicesAPI()) {
      return { success: false, error: new Error("Camera not available") };
    }

    try {
      // Get video stream
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: this.mapDirection(options?.direction),
          width: options?.width ? { ideal: options.width } : undefined,
          height: options?.height ? { ideal: options.height } : undefined,
        },
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create video element to capture frame
      const video = document.createElement("video");
      video.srcObject = this.stream;
      video.autoplay = true;
      video.playsInline = true;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      // Wait a moment for the camera to adjust
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Capture frame to canvas
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      ctx.drawImage(video, 0, 0);

      // Stop stream
      this.stopStream();

      // Get result based on type
      const quality = (options?.quality ?? 90) / 100;
      const format = "image/jpeg";

      if (options?.resultType === "blob") {
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, format, quality);
        });

        if (!blob) {
          throw new Error("Failed to create blob");
        }

        return {
          success: true,
          blob,
          format: "jpeg",
          width: canvas.width,
          height: canvas.height,
        };
      }

      const dataUrl = canvas.toDataURL(format, quality);

      if (options?.resultType === "base64") {
        const base64 = dataUrl.split(",")[1];
        return {
          success: true,
          data: base64,
          format: "jpeg",
          width: canvas.width,
          height: canvas.height,
        };
      }

      return {
        success: true,
        data: dataUrl,
        format: "jpeg",
        width: canvas.width,
        height: canvas.height,
      };
    } catch (error) {
      this.stopStream();

      if ((error as Error).name === "NotAllowedError") {
        return { success: false, cancelled: true };
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async pickFromGallery(options?: CameraOptions): Promise<CameraResult> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve({ success: false, cancelled: true });
          return;
        }

        try {
          const result = await this.processImageFile(file, options);
          resolve(result);
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      };

      input.oncancel = () => {
        resolve({ success: false, cancelled: true });
      };

      input.click();
    });
  }

  private async processImageFile(
    file: File,
    options?: CameraOptions,
  ): Promise<CameraResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");

        let width = img.width;
        let height = img.height;

        // Scale if max dimensions specified
        if (options?.width && width > options.width) {
          height = (height * options.width) / width;
          width = options.width;
        }
        if (options?.height && height > options.height) {
          width = (width * options.height) / height;
          height = options.height;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const quality = (options?.quality ?? 90) / 100;
        const format = "image/jpeg";

        if (options?.resultType === "blob") {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to create blob"));
                return;
              }
              resolve({
                success: true,
                blob,
                format: "jpeg",
                width,
                height,
              });
            },
            format,
            quality,
          );
          return;
        }

        const dataUrl = canvas.toDataURL(format, quality);

        if (options?.resultType === "base64") {
          resolve({
            success: true,
            data: dataUrl.split(",")[1],
            format: "jpeg",
            width,
            height,
          });
          return;
        }

        resolve({
          success: true,
          data: dataUrl,
          format: "jpeg",
          width,
          height,
        });
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  private mapDirection(direction?: CameraDirection): string {
    switch (direction) {
      case "front":
      case "user":
        return "user";
      case "rear":
      case "environment":
      default:
        return "environment";
    }
  }

  private stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}

// ============================================================================
// Capacitor Camera Adapter
// ============================================================================

/**
 * Capacitor Camera adapter for mobile
 */
export class CapacitorCameraAdapter implements CameraAdapter {
  private getCamera():
    | NonNullable<NonNullable<CameraWindow["Capacitor"]>["Plugins"]>["Camera"]
    | null {
    const win = typeof window !== "undefined" ? (window as CameraWindow) : null;
    return win?.Capacitor?.Plugins?.Camera ?? null;
  }

  isAvailable(): boolean {
    return !!this.getCamera();
  }

  async checkPermission(): Promise<CameraPermission> {
    const Camera = this.getCamera();
    if (!Camera) {
      return "denied";
    }

    try {
      const { camera } = await Camera.checkPermissions();
      if (camera === "granted") return "granted";
      if (camera === "denied") return "denied";
      return "prompt";
    } catch {
      return "denied";
    }
  }

  async requestPermission(): Promise<CameraPermission> {
    const Camera = this.getCamera();
    if (!Camera) {
      return "denied";
    }

    try {
      const { camera } = await Camera.requestPermissions({
        permissions: ["camera"],
      });
      if (camera === "granted") return "granted";
      if (camera === "denied") return "denied";
      return "prompt";
    } catch {
      return "denied";
    }
  }

  async takePicture(options?: CameraOptions): Promise<CameraResult> {
    const Camera = this.getCamera();
    if (!Camera) {
      return {
        success: false,
        error: new Error("Capacitor Camera not available"),
      };
    }

    try {
      const result = await Camera.getPhoto({
        quality: options?.quality ?? 90,
        allowEditing: options?.allowEditing ?? false,
        resultType: this.mapResultType(options?.resultType),
        source: "CAMERA",
        direction: this.mapDirection(options?.direction),
        width: options?.width,
        height: options?.height,
        saveToGallery: options?.saveToGallery,
        promptLabelHeader: options?.promptLabelHeader,
        promptLabelCancel: options?.promptLabelCancel,
        promptLabelPhoto: options?.promptLabelPhoto,
        promptLabelPicture: options?.promptLabelPicture,
      });

      return {
        success: true,
        data: result.dataUrl || result.base64String || result.webPath,
        format: result.format,
      };
    } catch (error) {
      if (
        (error as Error).message?.includes("cancelled") ||
        (error as Error).message?.includes("canceled")
      ) {
        return { success: false, cancelled: true };
      }
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async pickFromGallery(options?: CameraOptions): Promise<CameraResult> {
    const Camera = this.getCamera();
    if (!Camera) {
      return {
        success: false,
        error: new Error("Capacitor Camera not available"),
      };
    }

    try {
      const result = await Camera.getPhoto({
        quality: options?.quality ?? 90,
        allowEditing: options?.allowEditing ?? false,
        resultType: this.mapResultType(options?.resultType),
        source: "PHOTOS",
        width: options?.width,
        height: options?.height,
      });

      return {
        success: true,
        data: result.dataUrl || result.base64String || result.webPath,
        format: result.format,
      };
    } catch (error) {
      if (
        (error as Error).message?.includes("cancelled") ||
        (error as Error).message?.includes("canceled")
      ) {
        return { success: false, cancelled: true };
      }
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private mapResultType(type?: CameraResultType): string {
    switch (type) {
      case "base64":
        return "Base64";
      case "dataUrl":
        return "DataUrl";
      case "uri":
      default:
        return "Uri";
    }
  }

  private mapDirection(direction?: CameraDirection): string {
    switch (direction) {
      case "front":
      case "user":
        return "FRONT";
      case "rear":
      case "environment":
      default:
        return "REAR";
    }
  }
}

// ============================================================================
// Noop Camera Adapter
// ============================================================================

/**
 * No-op camera adapter (for SSR or unsupported platforms)
 */
export class NoopCameraAdapter implements CameraAdapter {
  isAvailable(): boolean {
    return false;
  }

  async checkPermission(): Promise<CameraPermission> {
    return "denied";
  }

  async requestPermission(): Promise<CameraPermission> {
    return "denied";
  }

  async takePicture(_options?: CameraOptions): Promise<CameraResult> {
    return { success: false, error: new Error("Camera not available") };
  }

  async pickFromGallery(_options?: CameraOptions): Promise<CameraResult> {
    return { success: false, error: new Error("Camera not available") };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Detect the best camera backend for the current platform
 */
export function detectCameraBackend(): "web" | "capacitor" | "none" {
  const platform = detectPlatform();
  const win = typeof window !== "undefined" ? (window as CameraWindow) : null;

  switch (platform) {
    case Platform.IOS:
    case Platform.ANDROID:
      return win?.Capacitor?.Plugins?.Camera
        ? "capacitor"
        : hasMediaDevicesAPI()
          ? "web"
          : "none";
    case Platform.ELECTRON:
    case Platform.TAURI:
    case Platform.WEB:
    default:
      return hasMediaDevicesAPI() ? "web" : "none";
  }
}

/**
 * Create a camera adapter for the current platform
 */
export function createCameraAdapter(): CameraAdapter {
  const backend = detectCameraBackend();

  switch (backend) {
    case "capacitor":
      return new CapacitorCameraAdapter();
    case "web":
      return new WebCameraAdapter();
    case "none":
    default:
      return new NoopCameraAdapter();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultAdapter: CameraAdapter | null = null;

/**
 * Get the default camera adapter
 */
export function getCameraAdapter(): CameraAdapter {
  if (!defaultAdapter) {
    defaultAdapter = createCameraAdapter();
  }
  return defaultAdapter;
}

/**
 * Reset the default camera adapter
 */
export function resetCameraAdapter(): void {
  defaultAdapter = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check camera permission
 */
export async function checkCameraPermission(): Promise<CameraPermission> {
  return getCameraAdapter().checkPermission();
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<CameraPermission> {
  return getCameraAdapter().requestPermission();
}

/**
 * Take a picture
 */
export async function takePicture(
  options?: CameraOptions,
): Promise<CameraResult> {
  return getCameraAdapter().takePicture(options);
}

/**
 * Pick from gallery
 */
export async function pickFromGallery(
  options?: CameraOptions,
): Promise<CameraResult> {
  return getCameraAdapter().pickFromGallery(options);
}

// ============================================================================
// Exports
// ============================================================================

export const Camera = {
  // Adapters
  WebCameraAdapter,
  CapacitorCameraAdapter,
  NoopCameraAdapter,

  // Factory
  createCameraAdapter,
  detectCameraBackend,
  getCameraAdapter,
  resetCameraAdapter,

  // Convenience
  checkPermission: checkCameraPermission,
  requestPermission: requestCameraPermission,
  takePicture,
  pickFromGallery,
};

export default Camera;
