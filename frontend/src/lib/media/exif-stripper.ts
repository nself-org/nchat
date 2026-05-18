/**
 * EXIF Stripper - Remove metadata from images for privacy
 *
 * Strips EXIF metadata from JPEG and other image formats to protect
 * user privacy (location data, device info, etc.).
 *
 * Supports:
 * - JPEG/JPG files (EXIF, IPTC, XMP)
 * - PNG files (metadata chunks)
 * - WebP files (EXIF)
 * - Canvas-based stripping for any browser-supported format
 */

// ============================================================================
// Types
// ============================================================================

export interface ExifData {
  // Camera info
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  dateTimeOriginal?: string;

  // GPS data (sensitive!)
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;

  // Image settings
  exposureTime?: string;
  fNumber?: string;
  iso?: number;
  focalLength?: string;
  flash?: boolean;

  // Orientation
  orientation?: number;

  // Dimensions
  width?: number;
  height?: number;

  // Other
  artist?: string;
  copyright?: string;
  userComment?: string;

  // Raw data for advanced use
  raw?: Record<string, unknown>;
}

export interface StripResult {
  /** The processed image blob (EXIF removed) */
  blob: Blob;
  /** Original file size */
  originalSize: number;
  /** Stripped file size */
  strippedSize: number;
  /** Whether EXIF was found and stripped */
  exifStripped: boolean;
  /** EXIF data that was removed (if requested) */
  removedExif?: ExifData;
  /** Processing method used */
  method: "binary" | "canvas";
}

export interface StripOptions {
  /** Output format (default: same as input) */
  outputFormat?: "jpeg" | "png" | "webp";
  /** Output quality (0-1, default: 0.92) */
  quality?: number;
  /** Return the removed EXIF data */
  returnExif?: boolean;
  /** Preserve orientation by applying it to image */
  applyOrientation?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

// JPEG markers
const JPEG_SOI = 0xffd8; // Start of Image
const JPEG_EOI = 0xffd9; // End of Image
const JPEG_APP0 = 0xffe0; // JFIF
const JPEG_APP1 = 0xffe1; // EXIF
const JPEG_APP2 = 0xffe2; // ICC Profile
const JPEG_APP13 = 0xffed; // IPTC
const JPEG_COM = 0xfffe; // Comment

// Markers to strip (contain metadata)
const STRIP_MARKERS = new Set([
  JPEG_APP1, // EXIF, XMP
  JPEG_APP2, // ICC Profile (optional, may affect colors)
  JPEG_APP13, // IPTC
  JPEG_COM, // Comments
]);

// Exif tag IDs
const EXIF_TAGS = {
  ORIENTATION: 0x0112,
  MAKE: 0x010f,
  MODEL: 0x0110,
  DATETIME: 0x0132,
  DATETIME_ORIGINAL: 0x9003,
  GPS_LATITUDE: 0x0002,
  GPS_LONGITUDE: 0x0004,
  GPS_ALTITUDE: 0x0006,
  ISO: 0x8827,
  EXPOSURE_TIME: 0x829a,
  FNUMBER: 0x829d,
  FOCAL_LENGTH: 0x920a,
  FLASH: 0x9209,
  ARTIST: 0x013b,
  COPYRIGHT: 0x8298,
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Strip EXIF and other metadata from an image
 */
export async function stripExif(
  source: File | Blob,
  options: StripOptions = {},
): Promise<StripResult> {
  const {
    outputFormat,
    quality = 0.92,
    returnExif = false,
    applyOrientation = true,
  } = options;

  const mimeType = source instanceof File ? source.type : source.type;
  const originalSize = source.size;

  // Try binary stripping for JPEG (faster, preserves quality)
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    try {
      const result = await stripJpegExifBinary(source, returnExif);

      // Apply orientation if needed
      if (
        applyOrientation &&
        result.removedExif?.orientation &&
        result.removedExif.orientation > 1
      ) {
        const oriented = await applyExifOrientation(
          result.blob,
          result.removedExif.orientation,
          outputFormat || "jpeg",
          quality,
        );
        return {
          ...result,
          blob: oriented,
          strippedSize: oriented.size,
          method: "canvas",
        };
      }

      // Convert format if requested
      if (outputFormat && outputFormat !== "jpeg") {
        const converted = await convertViaCanvas(
          result.blob,
          outputFormat,
          quality,
        );
        return {
          ...result,
          blob: converted,
          strippedSize: converted.size,
        };
      }

      return result;
    } catch {
      // Fall back to canvas method
    }
  }

  // Canvas-based stripping for other formats
  return stripViaCanvas(
    source,
    outputFormat || getOutputFormat(mimeType),
    quality,
    returnExif,
  );
}

/**
 * Check if an image has EXIF data
 */
export async function hasExif(source: File | Blob): Promise<boolean> {
  const mimeType = source instanceof File ? source.type : source.type;

  if (mimeType !== "image/jpeg" && mimeType !== "image/jpg") {
    return false; // Only JPEG has EXIF in a standard way
  }

  try {
    const buffer = await source.arrayBuffer();
    const view = new DataView(buffer);

    // Check JPEG signature
    if (view.getUint16(0) !== JPEG_SOI) {
      return false;
    }

    // Look for EXIF marker
    let offset = 2;
    while (offset < buffer.byteLength - 4) {
      const marker = view.getUint16(offset);

      // Check if it's a marker
      if ((marker & 0xff00) !== 0xff00) {
        break;
      }

      // Found EXIF marker
      if (marker === JPEG_APP1) {
        // Check for "Exif" signature
        const exifOffset = offset + 4;
        if (exifOffset + 6 <= buffer.byteLength) {
          const sig = String.fromCharCode(
            view.getUint8(exifOffset),
            view.getUint8(exifOffset + 1),
            view.getUint8(exifOffset + 2),
            view.getUint8(exifOffset + 3),
          );
          if (sig === "Exif") {
            return true;
          }
        }
      }

      // Move to next segment
      const length = view.getUint16(offset + 2);
      offset += 2 + length;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Extract EXIF data from an image (without removing it)
 */
export async function extractExif(
  source: File | Blob,
): Promise<ExifData | null> {
  const mimeType = source instanceof File ? source.type : source.type;

  if (mimeType !== "image/jpeg" && mimeType !== "image/jpg") {
    return null;
  }

  try {
    const buffer = await source.arrayBuffer();
    return parseJpegExif(buffer);
  } catch {
    return null;
  }
}

// ============================================================================
// Binary JPEG Processing
// ============================================================================

/**
 * Strip EXIF from JPEG using binary manipulation (preserves quality)
 */
async function stripJpegExifBinary(
  source: File | Blob,
  returnExif: boolean,
): Promise<StripResult> {
  const buffer = await source.arrayBuffer();
  const view = new DataView(buffer);

  // Check JPEG signature
  if (view.getUint16(0) !== JPEG_SOI) {
    throw new Error("Not a valid JPEG");
  }

  // Parse and extract EXIF if requested
  let removedExif: ExifData | undefined;
  if (returnExif) {
    removedExif = parseJpegExif(buffer) || undefined;
  }

  // Find segments to keep
  const segments: Uint8Array[] = [];
  let offset = 2; // Skip SOI
  let exifStripped = false;

  // Add SOI
  segments.push(new Uint8Array([0xff, 0xd8]));

  while (offset < buffer.byteLength - 1) {
    const marker = view.getUint16(offset);

    // Not a marker
    if ((marker & 0xff00) !== 0xff00) {
      break;
    }

    // End of image
    if (marker === JPEG_EOI) {
      segments.push(new Uint8Array(buffer.slice(offset)));
      break;
    }

    // RST markers (no length)
    if (marker >= 0xffd0 && marker <= 0xffd7) {
      segments.push(new Uint8Array([0xff, marker & 0xff]));
      offset += 2;
      continue;
    }

    // SOI, EOI have no length
    if (marker === JPEG_SOI || marker === JPEG_EOI) {
      segments.push(new Uint8Array([0xff, marker & 0xff]));
      offset += 2;
      continue;
    }

    // Read segment length
    const segmentLength = view.getUint16(offset + 2);
    const segmentEnd = offset + 2 + segmentLength;

    // Check if this is a metadata marker to strip
    if (STRIP_MARKERS.has(marker)) {
      exifStripped = true;
      offset = segmentEnd;
      continue;
    }

    // Keep this segment
    segments.push(new Uint8Array(buffer.slice(offset, segmentEnd)));
    offset = segmentEnd;

    // SOS (Start of Scan) - rest is image data
    if (marker === 0xffda) {
      // Find EOI
      let scanEnd = offset;
      while (scanEnd < buffer.byteLength - 1) {
        if (
          view.getUint8(scanEnd) === 0xff &&
          view.getUint8(scanEnd + 1) === 0xd9
        ) {
          break;
        }
        scanEnd++;
      }
      // Add scan data including EOI
      segments.push(new Uint8Array(buffer.slice(offset, scanEnd + 2)));
      break;
    }
  }

  // Combine segments
  const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const segment of segments) {
    result.set(segment, pos);
    pos += segment.length;
  }

  const blob = new Blob([result], { type: "image/jpeg" });

  return {
    blob,
    originalSize: source.size,
    strippedSize: blob.size,
    exifStripped,
    removedExif,
    method: "binary",
  };
}

/**
 * Parse EXIF data from JPEG buffer
 */
function parseJpegExif(buffer: ArrayBuffer): ExifData | null {
  const view = new DataView(buffer);
  let offset = 2; // Skip SOI

  while (offset < buffer.byteLength - 4) {
    const marker = view.getUint16(offset);

    if ((marker & 0xff00) !== 0xff00) break;

    if (marker === JPEG_APP1) {
      const length = view.getUint16(offset + 2);
      const exifOffset = offset + 4;

      // Check for "Exif\0\0" signature
      const sig = String.fromCharCode(
        view.getUint8(exifOffset),
        view.getUint8(exifOffset + 1),
        view.getUint8(exifOffset + 2),
        view.getUint8(exifOffset + 3),
      );

      if (sig === "Exif") {
        return parseExifData(buffer, exifOffset + 6);
      }
    }

    const segLength = view.getUint16(offset + 2);
    offset += 2 + segLength;
  }

  return null;
}

/**
 * Parse EXIF IFD data
 */
function parseExifData(buffer: ArrayBuffer, tiffOffset: number): ExifData {
  const view = new DataView(buffer);
  const exif: ExifData = { raw: {} };

  // Check byte order
  const byteOrder = view.getUint16(tiffOffset);
  const littleEndian = byteOrder === 0x4949; // 'II' = Intel = little-endian

  // Read IFD0 offset
  const ifd0Offset = view.getUint32(tiffOffset + 4, littleEndian);
  const ifd0Start = tiffOffset + ifd0Offset;

  // Read IFD0 entries
  const numEntries = view.getUint16(ifd0Start, littleEndian);

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifd0Start + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    const valueOffset = entryOffset + 8;

    switch (tag) {
      case EXIF_TAGS.ORIENTATION:
        exif.orientation = view.getUint16(valueOffset, littleEndian);
        break;
      case EXIF_TAGS.MAKE:
        exif.make = readExifString(
          view,
          valueOffset,
          count,
          tiffOffset,
          littleEndian,
        );
        break;
      case EXIF_TAGS.MODEL:
        exif.model = readExifString(
          view,
          valueOffset,
          count,
          tiffOffset,
          littleEndian,
        );
        break;
      case EXIF_TAGS.DATETIME:
        exif.dateTime = readExifString(
          view,
          valueOffset,
          count,
          tiffOffset,
          littleEndian,
        );
        break;
    }
  }

  return exif;
}

/**
 * Read a string from EXIF data
 */
function readExifString(
  view: DataView,
  valueOffset: number,
  count: number,
  tiffOffset: number,
  littleEndian: boolean,
): string {
  let offset = valueOffset;
  if (count > 4) {
    offset = tiffOffset + view.getUint32(valueOffset, littleEndian);
  }

  let str = "";
  for (let i = 0; i < count - 1; i++) {
    const char = view.getUint8(offset + i);
    if (char === 0) break;
    str += String.fromCharCode(char);
  }
  return str;
}

// ============================================================================
// Canvas-based Processing
// ============================================================================

/**
 * Strip metadata using canvas (works for any format but recompresses)
 */
async function stripViaCanvas(
  source: File | Blob,
  outputFormat: "jpeg" | "png" | "webp",
  quality: number,
  returnExif: boolean,
): Promise<StripResult> {
  // Extract EXIF before stripping if requested
  let removedExif: ExifData | undefined;
  if (returnExif) {
    removedExif = (await extractExif(source)) || undefined;
  }

  const blob = await convertViaCanvas(source, outputFormat, quality);

  return {
    blob,
    originalSize: source.size,
    strippedSize: blob.size,
    exifStripped: true, // Canvas always strips metadata
    removedExif,
    method: "canvas",
  };
}

/**
 * Convert image via canvas (strips all metadata)
 */
async function convertViaCanvas(
  source: File | Blob,
  format: "jpeg" | "png" | "webp",
  quality: number,
): Promise<Blob> {
  const img = await loadImage(source);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  ctx.drawImage(img, 0, 0);

  return new Promise((resolve, reject) => {
    const mimeType = `image/${format}`;
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas toBlob failed"));
        }
      },
      mimeType,
      quality,
    );
  });
}

/**
 * Apply EXIF orientation to image
 */
async function applyExifOrientation(
  source: File | Blob,
  orientation: number,
  format: "jpeg" | "png" | "webp",
  quality: number,
): Promise<Blob> {
  const img = await loadImage(source);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const { width, height } = img;
  const swapped = orientation >= 5 && orientation <= 8;

  canvas.width = swapped ? height : width;
  canvas.height = swapped ? width : height;

  // Apply transformation based on orientation
  switch (orientation) {
    case 2: // Flip horizontal
      ctx.scale(-1, 1);
      ctx.translate(-width, 0);
      break;
    case 3: // Rotate 180
      ctx.rotate(Math.PI);
      ctx.translate(-width, -height);
      break;
    case 4: // Flip vertical
      ctx.scale(1, -1);
      ctx.translate(0, -height);
      break;
    case 5: // Flip horizontal + rotate 90 CW
      ctx.rotate(Math.PI / 2);
      ctx.scale(1, -1);
      break;
    case 6: // Rotate 90 CW
      ctx.rotate(Math.PI / 2);
      ctx.translate(0, -height);
      break;
    case 7: // Flip horizontal + rotate 90 CCW
      ctx.rotate(-Math.PI / 2);
      ctx.scale(1, -1);
      ctx.translate(-width, 0);
      break;
    case 8: // Rotate 90 CCW
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-width, 0);
      break;
  }

  ctx.drawImage(img, 0, 0);

  return new Promise((resolve, reject) => {
    const mimeType = `image/${format}`;
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas toBlob failed"));
        }
      },
      mimeType,
      quality,
    );
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Load image from blob
 */
function loadImage(source: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(source);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Get output format from MIME type
 */
function getOutputFormat(mimeType: string): "jpeg" | "png" | "webp" {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpeg";
  }
}

/**
 * Check if GPS data exists in EXIF
 */
export function hasGpsData(exif: ExifData | null): boolean {
  if (!exif) return false;
  return (
    exif.gpsLatitude !== undefined ||
    exif.gpsLongitude !== undefined ||
    exif.gpsAltitude !== undefined
  );
}

/**
 * Check if image was taken with a camera (vs screenshot/generated)
 */
export function isCameraPhoto(exif: ExifData | null): boolean {
  if (!exif) return false;
  return !!(exif.make || exif.model || exif.exposureTime || exif.fNumber);
}

/**
 * Get human-readable camera info
 */
export function getCameraInfo(exif: ExifData | null): string | null {
  if (!exif) return null;
  const parts: string[] = [];

  if (exif.make) parts.push(exif.make);
  if (exif.model) parts.push(exif.model);

  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * Get date photo was taken
 */
export function getPhotoDate(exif: ExifData | null): Date | null {
  if (!exif) return null;

  const dateStr = exif.dateTimeOriginal || exif.dateTime;
  if (!dateStr) return null;

  // EXIF date format: "YYYY:MM:DD HH:MM:SS"
  const match = dateStr.match(
    /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/,
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second),
  );
}
