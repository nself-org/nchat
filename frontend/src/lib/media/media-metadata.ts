/**
 * Media Metadata - Extract and process metadata from media files
 *
 * Provides functions to extract EXIF data from images, duration from audio/video,
 * and other file-specific metadata.
 */

import { MediaMetadata, MediaType, MediaDimensions } from "./media-types";
import { getMediaTypeFromMime } from "./media-manager";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface ExifData {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  dateTaken?: string;
  location?: {
    lat: number;
    lng: number;
  };
  orientation?: number;
  software?: string;
  copyright?: string;
  artist?: string;
}

export interface ImageMetadata extends MediaMetadata {
  dimensions: MediaDimensions;
  exif?: ExifData;
  colorSpace?: string;
  hasAlpha?: boolean;
}

export interface VideoMetadata extends MediaMetadata {
  dimensions: MediaDimensions;
  duration: number;
  frameRate?: number;
  bitrate?: number;
  codec?: string;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
}

export interface AudioMetadata extends MediaMetadata {
  duration: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;
}

export interface DocumentMetadata extends MediaMetadata {
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  author?: string;
  title?: string;
  subject?: string;
  createdDate?: string;
  modifiedDate?: string;
}

// ============================================================================
// Image Metadata
// ============================================================================

/**
 * Get image dimensions
 */
export function getImageDimensions(
  file: File | Blob,
): Promise<MediaDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Extract EXIF data from JPEG images
 * Note: This is a simplified implementation. For full EXIF support,
 * consider using a library like exif-js or piexifjs
 */
export async function extractExifData(file: File): Promise<ExifData | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    // Check for JPEG SOI marker
    if (dataView.getUint16(0) !== 0xffd8) {
      return null;
    }

    let offset = 2;
    const length = dataView.byteLength;

    while (offset < length) {
      const marker = dataView.getUint16(offset);

      // Check for EXIF APP1 marker
      if (marker === 0xffe1) {
        const exifLength = dataView.getUint16(offset + 2);

        // Check for "Exif" string
        const exifMarker = String.fromCharCode(
          dataView.getUint8(offset + 4),
          dataView.getUint8(offset + 5),
          dataView.getUint8(offset + 6),
          dataView.getUint8(offset + 7),
        );

        if (exifMarker === "Exif") {
          // Simplified EXIF parsing - return basic data
          // Full implementation would parse TIFF headers and IFD entries
          return {
            // Return empty object to indicate EXIF data exists
            // but detailed parsing requires a full EXIF library
          };
        }

        offset += exifLength + 2;
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else {
        offset += dataView.getUint16(offset + 2) + 2;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract image metadata
 */
export async function extractImageMetadata(file: File): Promise<ImageMetadata> {
  const dimensions = await getImageDimensions(file);
  const exif = await extractExifData(file);

  return {
    dimensions,
    exif: exif || undefined,
  };
}

// ============================================================================
// Video Metadata
// ============================================================================

/**
 * Extract video metadata
 */
export function extractVideoMetadata(
  file: File | Blob,
): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        dimensions: {
          width: video.videoWidth,
          height: video.videoHeight,
        },
        duration: video.duration,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        dimensions: { width: 0, height: 0 },
        duration: 0,
      });
    };

    video.src = URL.createObjectURL(file);
  });
}

// ============================================================================
// Audio Metadata
// ============================================================================

/**
 * Extract audio metadata
 */
export function extractAudioMetadata(
  file: File | Blob,
): Promise<AudioMetadata> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve({
        duration: audio.duration,
      });
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      resolve({
        duration: 0,
      });
    };

    audio.src = URL.createObjectURL(file);
  });
}

/**
 * Extract ID3 tags from MP3 files
 * Note: Simplified implementation. For full ID3 support,
 * consider using a library like jsmediatags
 */
export async function extractID3Tags(
  file: File,
): Promise<Partial<AudioMetadata> | null> {
  try {
    const arrayBuffer = await file.slice(0, 128).arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    // Check for ID3v1 tag at end of file
    const endBuffer = await file.slice(-128).arrayBuffer();
    const endView = new DataView(endBuffer);

    const tag = String.fromCharCode(
      endView.getUint8(0),
      endView.getUint8(1),
      endView.getUint8(2),
    );

    if (tag === "TAG") {
      // ID3v1 tag found - extract basic info
      const decoder = new TextDecoder("iso-8859-1");

      const titleBytes = new Uint8Array(endBuffer, 3, 30);
      const artistBytes = new Uint8Array(endBuffer, 33, 30);
      const albumBytes = new Uint8Array(endBuffer, 63, 30);
      const yearBytes = new Uint8Array(endBuffer, 93, 4);

      return {
        title:
          decoder.decode(titleBytes).replace(/\0/g, "").trim() || undefined,
        artist:
          decoder.decode(artistBytes).replace(/\0/g, "").trim() || undefined,
        album:
          decoder.decode(albumBytes).replace(/\0/g, "").trim() || undefined,
        year:
          parseInt(decoder.decode(yearBytes).replace(/\0/g, "").trim()) ||
          undefined,
      };
    }

    // Check for ID3v2 tag at beginning
    const id3v2 = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2),
    );

    if (id3v2 === "ID3") {
      // ID3v2 found - requires more complex parsing
      // For full support, use a library like jsmediatags
      return {};
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// Document Metadata
// ============================================================================

/**
 * Extract PDF metadata
 * Note: Simplified implementation. For full PDF parsing,
 * consider using pdf.js
 */
export async function extractPdfMetadata(
  file: File,
): Promise<DocumentMetadata | null> {
  try {
    const text = await file.slice(0, 2048).text();

    // Basic PDF validation
    if (!text.startsWith("%PDF")) {
      return null;
    }

    // Try to extract some basic metadata
    const metadata: DocumentMetadata = {};

    // Look for /Title
    const titleMatch = text.match(/\/Title\s*\((.*?)\)/);
    if (titleMatch) {
      metadata.title = titleMatch[1];
    }

    // Look for /Author
    const authorMatch = text.match(/\/Author\s*\((.*?)\)/);
    if (authorMatch) {
      metadata.author = authorMatch[1];
    }

    // Look for /Subject
    const subjectMatch = text.match(/\/Subject\s*\((.*?)\)/);
    if (subjectMatch) {
      metadata.subject = subjectMatch[1];
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  } catch {
    return null;
  }
}

// ============================================================================
// Main Metadata Extractor
// ============================================================================

/**
 * Extract metadata from any supported file type
 */
export async function extractMediaMetadata(file: File): Promise<MediaMetadata> {
  const mediaType: MediaType = getMediaTypeFromMime(file.type);

  try {
    switch (mediaType) {
      case "image":
        return extractImageMetadata(file);

      case "video":
        return extractVideoMetadata(file);

      case "audio": {
        const audioMeta = await extractAudioMetadata(file);
        const id3Tags = await extractID3Tags(file);
        return { ...audioMeta, ...id3Tags };
      }

      case "document":
        if (file.type === "application/pdf") {
          const pdfMeta = await extractPdfMetadata(file);
          return pdfMeta || {};
        }
        return {};

      default:
        return {};
    }
  } catch (error) {
    logger.error("Failed to extract metadata:", error);
    return {};
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format metadata for display
 */
export function formatMetadataValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "Unknown";
  }

  switch (key) {
    case "duration":
      return formatMediaDuration(value as number);

    case "dimensions":
      const dims = value as MediaDimensions;
      return `${dims.width} x ${dims.height}`;

    case "bitrate":
      return formatBitrate(value as number);

    case "sampleRate":
      return `${((value as number) / 1000).toFixed(1)} kHz`;

    case "channels":
      return value === 1
        ? "Mono"
        : value === 2
          ? "Stereo"
          : `${value} channels`;

    case "location":
      const loc = value as { lat: number; lng: number };
      return `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;

    default:
      return String(value);
  }
}

/**
 * Format duration in seconds to readable string
 * @alias formatDuration from media-manager.ts
 */
export function formatMediaDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format bitrate for display
 */
export function formatBitrate(bitrate: number): string {
  if (bitrate >= 1000000) {
    return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  }
  if (bitrate >= 1000) {
    return `${(bitrate / 1000).toFixed(0)} kbps`;
  }
  return `${bitrate} bps`;
}

/**
 * Get aspect ratio description
 */
export function getAspectRatioDescription(
  width: number,
  height: number,
): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const ratioWidth = width / divisor;
  const ratioHeight = height / divisor;

  // Common aspect ratios
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.01) return "16:9 (Widescreen)";
  if (Math.abs(ratio - 4 / 3) < 0.01) return "4:3 (Standard)";
  if (Math.abs(ratio - 1) < 0.01) return "1:1 (Square)";
  if (Math.abs(ratio - 3 / 2) < 0.01) return "3:2 (Photo)";
  if (Math.abs(ratio - 21 / 9) < 0.01) return "21:9 (Ultrawide)";
  if (Math.abs(ratio - 9 / 16) < 0.01) return "9:16 (Portrait)";

  return `${ratioWidth}:${ratioHeight}`;
}

/**
 * Check if image has transparency
 */
export async function hasTransparency(file: File): Promise<boolean> {
  const type = file.type;

  // Only PNG and WebP can have transparency
  if (type !== "image/png" && type !== "image/webp") {
    return false;
  }

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(img.src);
        resolve(false);
        return;
      }

      canvas.width = Math.min(img.naturalWidth, 100);
      canvas.height = Math.min(img.naturalHeight, 100);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Check alpha channel
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          URL.revokeObjectURL(img.src);
          resolve(true);
          return;
        }
      }

      URL.revokeObjectURL(img.src);
      resolve(false);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(false);
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get color profile from image (simplified)
 */
export function getColorProfile(mimeType: string): string {
  // Most web images use sRGB
  return "sRGB";
}

/**
 * Calculate megapixels from dimensions
 */
export function getMegapixels(width: number, height: number): string {
  const mp = (width * height) / 1000000;
  return `${mp.toFixed(1)} MP`;
}
