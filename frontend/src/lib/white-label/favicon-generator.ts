/**
 * Favicon Generator - Generate favicons in multiple sizes from a source image
 */

import { loadImage } from "./logo-processor";

export interface FaviconSize {
  size: number;
  name: string;
  purpose: string;
}

export const FAVICON_SIZES: FaviconSize[] = [
  { size: 16, name: "favicon-16x16.png", purpose: "Browser tab (standard)" },
  { size: 32, name: "favicon-32x32.png", purpose: "Browser tab (retina)" },
  { size: 48, name: "favicon-48x48.png", purpose: "Windows site icon" },
  {
    size: 64,
    name: "favicon-64x64.png",
    purpose: "Windows site icon (retina)",
  },
  { size: 96, name: "favicon-96x96.png", purpose: "Google TV icon" },
  { size: 128, name: "favicon-128x128.png", purpose: "Chrome Web Store" },
  { size: 180, name: "apple-touch-icon.png", purpose: "iOS home screen" },
  {
    size: 192,
    name: "android-chrome-192x192.png",
    purpose: "Android home screen",
  },
  { size: 256, name: "favicon-256x256.png", purpose: "Windows 8/10 tile" },
  {
    size: 384,
    name: "android-chrome-384x384.png",
    purpose: "Android splash screen",
  },
  { size: 512, name: "android-chrome-512x512.png", purpose: "PWA icon" },
];

export interface GeneratedFavicon {
  size: number;
  name: string;
  dataUrl: string;
  blob?: Blob;
}

export interface FaviconGeneratorOptions {
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  sizes?: number[];
}

/**
 * Generate favicons from a source image
 */
export async function generateFavicons(
  source: string | File,
  options: FaviconGeneratorOptions = {},
): Promise<GeneratedFavicon[]> {
  const {
    backgroundColor,
    padding = 0,
    borderRadius = 0,
    sizes = FAVICON_SIZES.map((s) => s.size),
  } = options;

  const img = await loadImage(source);
  const favicons: GeneratedFavicon[] = [];

  for (const size of sizes) {
    const sizeInfo = FAVICON_SIZES.find((s) => s.size === size);
    const name = sizeInfo?.name || `favicon-${size}x${size}.png`;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d")!;

    // Apply rounded corners if specified
    if (borderRadius > 0) {
      const radius = Math.min(borderRadius, size / 2);
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(size - radius, 0);
      ctx.quadraticCurveTo(size, 0, size, radius);
      ctx.lineTo(size, size - radius);
      ctx.quadraticCurveTo(size, size, size - radius, size);
      ctx.lineTo(radius, size);
      ctx.quadraticCurveTo(0, size, 0, size - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.clip();
    }

    // Fill background if specified
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, size, size);
    }

    // Calculate drawing dimensions
    const paddingPx = padding * (size / 100); // Padding as percentage
    const drawSize = size - paddingPx * 2;

    // Maintain aspect ratio
    const aspectRatio = img.width / img.height;
    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (aspectRatio > 1) {
      drawWidth = drawSize;
      drawHeight = drawSize / aspectRatio;
    } else {
      drawHeight = drawSize;
      drawWidth = drawSize * aspectRatio;
    }

    offsetX = (size - drawWidth) / 2;
    offsetY = (size - drawHeight) / 2;

    // Draw image
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    // Convert to data URL
    const dataUrl = canvas.toDataURL("image/png");

    // Convert to blob for download
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/png");
    });

    favicons.push({
      size,
      name,
      dataUrl,
      blob,
    });
  }

  return favicons;
}

/**
 * Generate an ICO file from multiple PNG favicons
 * ICO format is used for older browsers and Windows
 */
export async function generateIcoFile(
  source: string | File,
  sizes: number[] = [16, 32, 48],
): Promise<Blob> {
  const favicons = await generateFavicons(source, { sizes });

  // ICO file structure:
  // ICONDIR (6 bytes)
  // ICONDIRENTRY (16 bytes each)
  // Image data (PNG format)

  const iconDir = new ArrayBuffer(6);
  const iconDirView = new DataView(iconDir);
  iconDirView.setUint16(0, 0, true); // Reserved
  iconDirView.setUint16(2, 1, true); // Image type (1 = icon)
  iconDirView.setUint16(4, favicons.length, true); // Number of images

  const iconDirEntries: ArrayBuffer[] = [];
  const imageData: Uint8Array[] = [];
  let offset = 6 + favicons.length * 16; // Start of image data

  for (const favicon of favicons) {
    const blob = favicon.blob!;
    const arrayBuffer = await blob.arrayBuffer();
    const imageBytes = new Uint8Array(arrayBuffer);

    // ICONDIRENTRY (16 bytes)
    const entry = new ArrayBuffer(16);
    const entryView = new DataView(entry);

    entryView.setUint8(0, favicon.size >= 256 ? 0 : favicon.size); // Width (0 = 256)
    entryView.setUint8(1, favicon.size >= 256 ? 0 : favicon.size); // Height (0 = 256)
    entryView.setUint8(2, 0); // Color palette
    entryView.setUint8(3, 0); // Reserved
    entryView.setUint16(4, 1, true); // Color planes
    entryView.setUint16(6, 32, true); // Bits per pixel
    entryView.setUint32(8, imageBytes.length, true); // Size of image data
    entryView.setUint32(12, offset, true); // Offset of image data

    iconDirEntries.push(entry);
    imageData.push(imageBytes);
    offset += imageBytes.length;
  }

  // Combine all parts
  const totalSize =
    6 +
    favicons.length * 16 +
    imageData.reduce((sum, data) => sum + data.length, 0);
  const result = new Uint8Array(totalSize);

  let pos = 0;
  result.set(new Uint8Array(iconDir), pos);
  pos += 6;

  for (const entry of iconDirEntries) {
    result.set(new Uint8Array(entry), pos);
    pos += 16;
  }

  for (const data of imageData) {
    result.set(data, pos);
    pos += data.length;
  }

  return new Blob([result], { type: "image/x-icon" });
}

/**
 * Generate SVG favicon
 */
export async function generateSvgFavicon(
  source: string | File,
  options: {
    backgroundColor?: string;
    padding?: number;
  } = {},
): Promise<string> {
  const { backgroundColor, padding = 10 } = options;

  const img = await loadImage(source);

  // Create canvas to convert image to base64
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const imageBase64 = canvas.toDataURL("image/png");

  const viewBoxSize = 100;
  const imageSize = viewBoxSize - padding * 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}">`;

  if (backgroundColor) {
    svg += `<rect width="${viewBoxSize}" height="${viewBoxSize}" fill="${backgroundColor}"/>`;
  }

  svg += `<image x="${padding}" y="${padding}" width="${imageSize}" height="${imageSize}" href="${imageBase64}"/>`;
  svg += "</svg>";

  return svg;
}

/**
 * Generate webmanifest for PWA
 */
export function generateWebManifest(
  appName: string,
  shortName: string,
  themeColor: string,
  backgroundColor: string,
): string {
  return JSON.stringify(
    {
      name: appName,
      short_name: shortName,
      icons: [
        {
          src: "/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      theme_color: themeColor,
      background_color: backgroundColor,
      display: "standalone",
      start_url: "/",
    },
    null,
    2,
  );
}

/**
 * Generate browserconfig.xml for Windows tiles
 */
export function generateBrowserConfig(tileColor: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/mstile-150x150.png"/>
      <TileColor>${tileColor}</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;
}

/**
 * Generate HTML link tags for favicons
 */
export function generateFaviconHtml(): string {
  return `<!-- Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/x-icon" href="/favicon.ico">

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

<!-- Web Manifest (PWA) -->
<link rel="manifest" href="/site.webmanifest">

<!-- Windows Tiles -->
<meta name="msapplication-TileColor" content="#ffffff">
<meta name="msapplication-config" content="/browserconfig.xml">

<!-- Theme Color -->
<meta name="theme-color" content="#ffffff">`;
}

/**
 * Update the current page's favicon
 */
export function updatePageFavicon(dataUrl: string): void {
  let faviconLink = document.querySelector(
    'link[rel="icon"]',
  ) as HTMLLinkElement;

  if (!faviconLink) {
    faviconLink = document.createElement("link");
    faviconLink.rel = "icon";
    document.head.appendChild(faviconLink);
  }

  faviconLink.href = dataUrl;
}

/**
 * Download all generated favicons as a zip file
 */
export async function downloadFaviconsAsZip(
  favicons: GeneratedFavicon[],
  appName: string,
  themeColor: string,
  backgroundColor: string,
): Promise<void> {
  // Dynamic import of JSZip to avoid SSR issues
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Add all favicon images
  for (const favicon of favicons) {
    if (favicon.blob) {
      zip.file(favicon.name, favicon.blob);
    }
  }

  // Add manifest and config files
  const webmanifest = generateWebManifest(
    appName,
    appName,
    themeColor,
    backgroundColor,
  );
  zip.file("site.webmanifest", webmanifest);

  const browserconfig = generateBrowserConfig(themeColor);
  zip.file("browserconfig.xml", browserconfig);

  const htmlSnippet = generateFaviconHtml();
  zip.file("favicon-html.txt", htmlSnippet);

  // Generate and download zip
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "favicons.zip";
  link.click();
  URL.revokeObjectURL(url);
}
