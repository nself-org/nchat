/**
 * Logo Processor - Utilities for processing and manipulating logo images
 */

export interface LogoProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  backgroundColor?: string;
  padding?: number;
}

export interface ProcessedLogo {
  dataUrl: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Load an image from a data URL or file
 */
export function loadImage(source: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));

    if (typeof source === "string") {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Process a logo image with various transformations
 */
export async function processLogo(
  source: string | File,
  options: LogoProcessingOptions = {},
): Promise<ProcessedLogo> {
  const {
    maxWidth = 512,
    maxHeight = 512,
    format = "png",
    quality = 0.9,
    backgroundColor,
    padding = 0,
  } = options;

  const img = await loadImage(source);

  // Calculate dimensions maintaining aspect ratio
  let width = img.width;
  let height = img.height;

  const aspectRatio = width / height;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  // Add padding
  const canvasWidth = Math.ceil(width + padding * 2);
  const canvasHeight = Math.ceil(height + padding * 2);

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d")!;

  // Fill background if specified
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // Draw image centered with padding
  ctx.drawImage(img, padding, padding, width, height);

  // Convert to data URL
  const mimeType =
    format === "jpeg"
      ? "image/jpeg"
      : format === "webp"
        ? "image/webp"
        : "image/png";
  const dataUrl = canvas.toDataURL(mimeType, quality);

  return {
    dataUrl,
    width: canvasWidth,
    height: canvasHeight,
    format,
  };
}

/**
 * Create a square version of a logo (for icons)
 */
export async function createSquareLogo(
  source: string | File,
  size: number = 512,
  backgroundColor?: string,
): Promise<ProcessedLogo> {
  const img = await loadImage(source);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;

  // Fill background
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);
  }

  // Calculate dimensions to fit in square
  const aspectRatio = img.width / img.height;
  let drawWidth: number;
  let drawHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (aspectRatio > 1) {
    // Wider than tall
    drawWidth = size * 0.8;
    drawHeight = drawWidth / aspectRatio;
    offsetX = (size - drawWidth) / 2;
    offsetY = (size - drawHeight) / 2;
  } else {
    // Taller than wide
    drawHeight = size * 0.8;
    drawWidth = drawHeight * aspectRatio;
    offsetX = (size - drawWidth) / 2;
    offsetY = (size - drawHeight) / 2;
  }

  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: size,
    height: size,
    format: "png",
  };
}

/**
 * Create light and dark mode variants of a logo
 */
export async function createLogoVariants(
  source: string | File,
  options: {
    lightBackground?: string;
    darkBackground?: string;
    size?: number;
  } = {},
): Promise<{
  original: ProcessedLogo;
  light: ProcessedLogo;
  dark: ProcessedLogo;
}> {
  const {
    lightBackground = "#FFFFFF",
    darkBackground = "#18181B",
    size = 512,
  } = options;

  const original = await processLogo(source, {
    maxWidth: size,
    maxHeight: size,
  });
  const light = await processLogo(source, {
    maxWidth: size,
    maxHeight: size,
    backgroundColor: lightBackground,
    padding: 20,
  });
  const dark = await processLogo(source, {
    maxWidth: size,
    maxHeight: size,
    backgroundColor: darkBackground,
    padding: 20,
  });

  return { original, light, dark };
}

/**
 * Resize a logo to specific dimensions
 */
export async function resizeLogo(
  source: string | File,
  width: number,
  height: number,
  maintainAspectRatio: boolean = true,
): Promise<ProcessedLogo> {
  const img = await loadImage(source);

  let finalWidth = width;
  let finalHeight = height;

  if (maintainAspectRatio) {
    const aspectRatio = img.width / img.height;
    const targetRatio = width / height;

    if (aspectRatio > targetRatio) {
      finalHeight = width / aspectRatio;
    } else {
      finalWidth = height * aspectRatio;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = finalWidth;
  canvas.height = finalHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: finalWidth,
    height: finalHeight,
    format: "png",
  };
}

/**
 * Crop a logo to specified bounds
 */
export async function cropLogo(
  source: string | File,
  cropBounds: { x: number; y: number; width: number; height: number },
): Promise<ProcessedLogo> {
  const img = await loadImage(source);

  const canvas = document.createElement("canvas");
  canvas.width = cropBounds.width;
  canvas.height = cropBounds.height;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    img,
    cropBounds.x,
    cropBounds.y,
    cropBounds.width,
    cropBounds.height,
    0,
    0,
    cropBounds.width,
    cropBounds.height,
  );

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: cropBounds.width,
    height: cropBounds.height,
    format: "png",
  };
}

/**
 * Add rounded corners to a logo
 */
export async function addRoundedCorners(
  source: string | File,
  radius: number,
): Promise<ProcessedLogo> {
  const img = await loadImage(source);

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d")!;

  // Create rounded rectangle path
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(img.width - radius, 0);
  ctx.quadraticCurveTo(img.width, 0, img.width, radius);
  ctx.lineTo(img.width, img.height - radius);
  ctx.quadraticCurveTo(img.width, img.height, img.width - radius, img.height);
  ctx.lineTo(radius, img.height);
  ctx.quadraticCurveTo(0, img.height, 0, img.height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(img, 0, 0);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: img.width,
    height: img.height,
    format: "png",
  };
}

/**
 * Convert an image to grayscale
 */
export async function toGrayscale(
  source: string | File,
): Promise<ProcessedLogo> {
  const img = await loadImage(source);

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: img.width,
    height: img.height,
    format: "png",
  };
}

/**
 * Get the dominant color from an image
 */
export async function getDominantColor(source: string | File): Promise<string> {
  const img = await loadImage(source);

  const canvas = document.createElement("canvas");
  const sampleSize = 10;
  canvas.width = sampleSize;
  canvas.height = sampleSize;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const data = imageData.data;

  let r = 0,
    g = 0,
    b = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    // Skip transparent pixels
    if (data[i + 3] < 128) continue;

    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }

  if (count === 0) return "#000000";

  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Validate if a file is a valid image
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/svg+xml",
    "image/gif",
  ];
  return validTypes.includes(file.type);
}

/**
 * Get image dimensions from a file or data URL
 */
export async function getImageDimensions(
  source: string | File,
): Promise<{ width: number; height: number }> {
  const img = await loadImage(source);
  return { width: img.width, height: img.height };
}
