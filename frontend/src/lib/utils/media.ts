/**
 * Media utilities for nself-chat
 * @module utils/media
 */

/**
 * Check if we're in a browser environment
 */
const isBrowser = typeof window !== "undefined";

/**
 * Image dimensions
 */
export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Get image dimensions from a file or URL
 * @param source - Image file, Blob, or URL
 * @returns Promise resolving to image dimensions
 * @example
 * const dimensions = await getImageDimensions(imageFile);
 * // console.log(dimensions.width, dimensions.height);
 */
export async function getImageDimensions(
  source: File | Blob | string,
): Promise<ImageDimensions> {
  if (!isBrowser) {
    throw new Error("getImageDimensions requires a browser environment");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      });

      // Clean up object URL if we created one
      if (typeof source !== "string") {
        URL.revokeObjectURL(img.src);
      }
    };

    img.onerror = () => {
      if (typeof source !== "string") {
        URL.revokeObjectURL(img.src);
      }
      reject(new Error("Failed to load image"));
    };

    if (typeof source === "string") {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Video metadata
 */
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Get video duration and dimensions from a file or URL
 * @param source - Video file, Blob, or URL
 * @returns Promise resolving to video metadata
 * @example
 * const metadata = await getVideoMetadata(videoFile);
 * // console.log(metadata.duration, metadata.width, metadata.height);
 */
export async function getVideoMetadata(
  source: File | Blob | string,
): Promise<VideoMetadata> {
  if (!isBrowser) {
    throw new Error("getVideoMetadata requires a browser environment");
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: video.videoWidth / video.videoHeight,
      });

      if (typeof source !== "string") {
        URL.revokeObjectURL(video.src);
      }
    };

    video.onerror = () => {
      if (typeof source !== "string") {
        URL.revokeObjectURL(video.src);
      }
      reject(new Error("Failed to load video metadata"));
    };

    if (typeof source === "string") {
      video.src = source;
    } else {
      video.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Get video duration from a file or URL
 * @param source - Video file, Blob, or URL
 * @returns Promise resolving to duration in seconds
 */
export async function getVideoDuration(
  source: File | Blob | string,
): Promise<number> {
  const metadata = await getVideoMetadata(source);
  return metadata.duration;
}

/**
 * Audio metadata
 */
export interface AudioMetadata {
  duration: number;
  sampleRate?: number;
  numberOfChannels?: number;
}

/**
 * Get audio duration from a file or URL
 * @param source - Audio file, Blob, or URL
 * @returns Promise resolving to audio metadata
 */
export async function getAudioMetadata(
  source: File | Blob | string,
): Promise<AudioMetadata> {
  if (!isBrowser) {
    throw new Error("getAudioMetadata requires a browser environment");
  }

  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      resolve({
        duration: audio.duration,
      });

      if (typeof source !== "string") {
        URL.revokeObjectURL(audio.src);
      }
    };

    audio.onerror = () => {
      if (typeof source !== "string") {
        URL.revokeObjectURL(audio.src);
      }
      reject(new Error("Failed to load audio metadata"));
    };

    if (typeof source === "string") {
      audio.src = source;
    } else {
      audio.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Thumbnail options
 */
export interface ThumbnailOptions {
  /** Maximum width */
  maxWidth?: number;
  /** Maximum height */
  maxHeight?: number;
  /** Output quality (0-1, default: 0.8) */
  quality?: number;
  /** Output format (default: 'image/jpeg') */
  format?: "image/jpeg" | "image/png" | "image/webp";
  /** Time in seconds for video thumbnail (default: 0) */
  videoTime?: number;
  /** Background color for transparent images (default: 'white') */
  backgroundColor?: string;
}

/**
 * Create a thumbnail from an image file
 * @param source - Image file or Blob
 * @param options - Thumbnail options
 * @returns Promise resolving to thumbnail Blob
 * @example
 * const thumbnail = await createThumbnail(imageFile, { maxWidth: 200, maxHeight: 200 });
 */
export async function createThumbnail(
  source: File | Blob,
  options: ThumbnailOptions = {},
): Promise<Blob> {
  if (!isBrowser) {
    throw new Error("createThumbnail requires a browser environment");
  }

  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.8,
    format = "image/jpeg",
    backgroundColor = "white",
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(img.src);
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Calculate dimensions while maintaining aspect ratio
      let { width, height } = img;
      const aspectRatio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      canvas.width = width;
      canvas.height = height;

      // Fill background for JPEG (no transparency support)
      if (format === "image/jpeg") {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      URL.revokeObjectURL(img.src);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create thumbnail blob"));
          }
        },
        format,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image for thumbnail"));
    };

    img.src = URL.createObjectURL(source);
  });
}

/**
 * Create a thumbnail from a video file
 * @param source - Video file or Blob
 * @param options - Thumbnail options
 * @returns Promise resolving to thumbnail Blob
 */
export async function createVideoThumbnail(
  source: File | Blob,
  options: ThumbnailOptions = {},
): Promise<Blob> {
  if (!isBrowser) {
    throw new Error("createVideoThumbnail requires a browser environment");
  }

  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.8,
    format = "image/jpeg",
    videoTime = 0,
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(video.src);
    };

    video.onloadedmetadata = () => {
      // Seek to the specified time
      video.currentTime = Math.min(videoTime, video.duration);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        cleanup();
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Calculate dimensions
      let { videoWidth: width, videoHeight: height } = video;
      const aspectRatio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(video, 0, 0, width, height);

      cleanup();

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create video thumbnail blob"));
          }
        },
        format,
        quality,
      );
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video for thumbnail"));
    };

    video.src = URL.createObjectURL(source);
  });
}

/**
 * Compression options
 */
export interface CompressionOptions {
  /** Maximum width */
  maxWidth?: number;
  /** Maximum height */
  maxHeight?: number;
  /** Target quality (0-1, default: 0.8) */
  quality?: number;
  /** Output format */
  format?: "image/jpeg" | "image/png" | "image/webp";
  /** Maximum file size in bytes (will reduce quality to meet) */
  maxSizeBytes?: number;
}

/**
 * Compress an image file
 * @param source - Image file or Blob
 * @param options - Compression options
 * @returns Promise resolving to compressed Blob
 * @example
 * const compressed = await compressImage(imageFile, {
 *   maxWidth: 1920,
 *   maxHeight: 1080,
 *   quality: 0.8,
 *   maxSizeBytes: 1024 * 1024 // 1MB
 * });
 */
export async function compressImage(
  source: File | Blob,
  options: CompressionOptions = {},
): Promise<Blob> {
  if (!isBrowser) {
    throw new Error("compressImage requires a browser environment");
  }

  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality: initialQuality = 0.8,
    format = "image/jpeg",
    maxSizeBytes,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(img.src);
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Calculate dimensions
      let { width, height } = img;
      const aspectRatio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      canvas.width = Math.round(width);
      canvas.height = Math.round(height);

      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(img.src);

      // Function to create blob with given quality
      const createBlob = (q: number): Promise<Blob | null> => {
        return new Promise((res) => {
          canvas.toBlob((blob) => res(blob), format, q);
        });
      };

      let quality = initialQuality;
      let blob = await createBlob(quality);

      // If maxSizeBytes is set, reduce quality until we meet the target
      if (maxSizeBytes && blob) {
        while (blob.size > maxSizeBytes && quality > 0.1) {
          quality -= 0.1;
          const newBlob = await createBlob(quality);
          if (newBlob) {
            blob = newBlob;
          }
        }
      }

      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to compress image"));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = URL.createObjectURL(source);
  });
}

/**
 * Convert a canvas to a Blob
 * @param canvas - HTML Canvas element
 * @param format - Output format
 * @param quality - Output quality
 * @returns Promise resolving to Blob
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string = "image/png",
  quality: number = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      format,
      quality,
    );
  });
}

/**
 * Convert a Blob to a Data URL
 * @param blob - Blob to convert
 * @returns Promise resolving to Data URL string
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a Data URL to a Blob
 * @param dataUrl - Data URL string
 * @returns Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  return new Blob([array], { type: mime });
}

/**
 * Check if a file is an image
 * @param file - File to check
 * @returns Whether the file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Check if a file is a video
 * @param file - File to check
 * @returns Whether the file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

/**
 * Check if a file is audio
 * @param file - File to check
 * @returns Whether the file is audio
 */
export function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/");
}

/**
 * Get the media type from a file
 * @param file - File to check
 * @returns Media type ('image', 'video', 'audio', or 'other')
 */
export function getMediaType(
  file: File,
): "image" | "video" | "audio" | "other" {
  if (isImageFile(file)) return "image";
  if (isVideoFile(file)) return "video";
  if (isAudioFile(file)) return "audio";
  return "other";
}

/**
 * Check if the browser supports a specific media type
 * @param type - MIME type to check
 * @returns Whether the type is supported
 */
export function isMediaTypeSupported(type: string): boolean {
  if (!isBrowser) return false;

  if (type.startsWith("image/")) {
    const img = document.createElement("img");
    return img.decode !== undefined;
  }

  if (type.startsWith("video/")) {
    const video = document.createElement("video");
    return video.canPlayType(type) !== "";
  }

  if (type.startsWith("audio/")) {
    const audio = document.createElement("audio");
    return audio.canPlayType(type) !== "";
  }

  return false;
}

/**
 * Preload an image
 * @param src - Image URL
 * @returns Promise that resolves when loaded
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    img.src = src;
  });
}

/**
 * Preload multiple images
 * @param srcs - Array of image URLs
 * @returns Promise that resolves when all loaded
 */
export async function preloadImages(
  srcs: string[],
): Promise<HTMLImageElement[]> {
  return Promise.all(srcs.map(preloadImage));
}

/**
 * Calculate the optimal dimensions for displaying media
 * @param originalWidth - Original width
 * @param originalHeight - Original height
 * @param containerWidth - Container width
 * @param containerHeight - Container height
 * @param mode - Fit mode ('contain' or 'cover')
 * @returns Optimal display dimensions
 */
export function calculateDisplayDimensions(
  originalWidth: number,
  originalHeight: number,
  containerWidth: number,
  containerHeight: number,
  mode: "contain" | "cover" = "contain",
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  const containerAspectRatio = containerWidth / containerHeight;

  let width: number;
  let height: number;

  if (mode === "contain") {
    if (aspectRatio > containerAspectRatio) {
      width = containerWidth;
      height = containerWidth / aspectRatio;
    } else {
      height = containerHeight;
      width = containerHeight * aspectRatio;
    }
  } else {
    // cover
    if (aspectRatio > containerAspectRatio) {
      height = containerHeight;
      width = containerHeight * aspectRatio;
    } else {
      width = containerWidth;
      height = containerWidth / aspectRatio;
    }
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Rotate an image by a given angle
 * @param source - Image file or Blob
 * @param degrees - Rotation angle (90, 180, 270, or -90, -180, -270)
 * @returns Promise resolving to rotated Blob
 */
export async function rotateImage(
  source: File | Blob,
  degrees: number,
): Promise<Blob> {
  if (!isBrowser) {
    throw new Error("rotateImage requires a browser environment");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(img.src);
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Normalize degrees
      const normalizedDegrees = ((degrees % 360) + 360) % 360;

      // Swap dimensions for 90 and 270 degree rotations
      if (normalizedDegrees === 90 || normalizedDegrees === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // Translate to center, rotate, then draw
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((normalizedDegrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      URL.revokeObjectURL(img.src);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create rotated image blob"));
        }
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image for rotation"));
    };

    img.src = URL.createObjectURL(source);
  });
}

/**
 * Flip an image horizontally or vertically
 * @param source - Image file or Blob
 * @param direction - Flip direction ('horizontal' or 'vertical')
 * @returns Promise resolving to flipped Blob
 */
export async function flipImage(
  source: File | Blob,
  direction: "horizontal" | "vertical",
): Promise<Blob> {
  if (!isBrowser) {
    throw new Error("flipImage requires a browser environment");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(img.src);
        reject(new Error("Failed to get canvas context"));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      if (direction === "horizontal") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
      }

      ctx.drawImage(img, 0, 0);

      URL.revokeObjectURL(img.src);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create flipped image blob"));
        }
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image for flipping"));
    };

    img.src = URL.createObjectURL(source);
  });
}
