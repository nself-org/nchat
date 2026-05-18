/**
 * Favicon generation utilities for all required sizes
 */

export interface FaviconOptions {
  source: string; // Base64 data URL or SVG string
  backgroundColor?: string;
  padding?: number;
}

export interface FaviconResult {
  ico: string; // .ico format (16x16, 32x32)
  favicon16: string; // 16x16 PNG
  favicon32: string; // 32x32 PNG
  appleTouchIcon: string; // 180x180 PNG
  android192: string; // 192x192 PNG
  android512: string; // 512x512 PNG
  maskIcon: string; // SVG for Safari mask icon
  msIcon: string; // 150x150 for MS tiles
  ogImage: string; // 1200x630 for Open Graph
}

export interface FaviconSize {
  name: string;
  width: number;
  height: number;
  format: "png" | "svg";
  purpose?: string;
}

/**
 * Standard favicon sizes
 */
export const faviconSizes: FaviconSize[] = [
  { name: "favicon-16x16", width: 16, height: 16, format: "png" },
  { name: "favicon-32x32", width: 32, height: 32, format: "png" },
  { name: "apple-touch-icon", width: 180, height: 180, format: "png" },
  {
    name: "android-chrome-192x192",
    width: 192,
    height: 192,
    format: "png",
    purpose: "any maskable",
  },
  {
    name: "android-chrome-512x512",
    width: 512,
    height: 512,
    format: "png",
    purpose: "any maskable",
  },
  { name: "mstile-150x150", width: 150, height: 150, format: "png" },
  { name: "safari-pinned-tab", width: 512, height: 512, format: "svg" },
];

/**
 * Generate all favicon sizes from a source image
 */
export async function generateFavicons(
  options: FaviconOptions,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  for (const size of faviconSizes) {
    if (size.format === "png") {
      results[size.name] = await resizeImage(
        options.source,
        size.width,
        size.height,
        options.backgroundColor,
        options.padding,
      );
    } else if (size.format === "svg") {
      results[size.name] = await createMaskIcon(options.source);
    }
  }

  return results;
}

/**
 * Generate a single favicon at a specific size
 */
export async function generateFavicon(
  source: string,
  width: number,
  height: number,
  options?: { backgroundColor?: string; padding?: number },
): Promise<string> {
  return resizeImage(
    source,
    width,
    height,
    options?.backgroundColor,
    options?.padding,
  );
}

/**
 * Resize an image to a specific size
 */
async function resizeImage(
  source: string,
  width: number,
  height: number,
  backgroundColor?: string,
  padding = 0,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("resizeImage requires browser environment"));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    // Fill background if specified
    if (backgroundColor && backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // Calculate dimensions with padding
      const drawWidth = width - padding * 2;
      const drawHeight = height - padding * 2;
      const x = padding;
      const y = padding;

      // Draw image centered and scaled to fit
      const scale = Math.min(drawWidth / img.width, drawHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const offsetX = x + (drawWidth - scaledWidth) / 2;
      const offsetY = y + (drawHeight - scaledHeight) / 2;

      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => reject(new Error("Failed to load image"));

    // Handle different source types
    if (source.startsWith("data:")) {
      img.src = source;
    } else if (source.startsWith("<svg") || source.startsWith("<?xml")) {
      const blob = new Blob([source], { type: "image/svg+xml" });
      img.src = URL.createObjectURL(blob);
    } else {
      img.src = source;
    }
  });
}

/**
 * Create a monochrome mask icon for Safari
 */
async function createMaskIcon(source: string): Promise<string> {
  // If source is already SVG, convert to monochrome
  if (source.startsWith("<svg") || source.startsWith("<?xml")) {
    return convertToMonochromeSvg(source);
  }

  if (source.startsWith("data:image/svg+xml")) {
    const svgString = atob(source.replace("data:image/svg+xml;base64,", ""));
    return convertToMonochromeSvg(svgString);
  }

  // For raster images, trace to SVG (simplified version)
  return generateSimpleMaskIcon(source);
}

/**
 * Convert SVG to monochrome for Safari mask icon
 */
function convertToMonochromeSvg(svgString: string): string {
  // Parse and modify SVG to be monochrome
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = doc.querySelector("svg");

  if (!svg) return svgString;

  // Remove all fill and stroke colors, replace with currentColor
  const elements = svg.querySelectorAll("*");
  elements.forEach((el) => {
    if (el.hasAttribute("fill") && el.getAttribute("fill") !== "none") {
      el.setAttribute("fill", "black");
    }
    if (el.hasAttribute("stroke") && el.getAttribute("stroke") !== "none") {
      el.setAttribute("stroke", "black");
    }
  });

  // Set viewBox if not present
  if (!svg.hasAttribute("viewBox")) {
    const width = svg.getAttribute("width") || "512";
    const height = svg.getAttribute("height") || "512";
    svg.setAttribute("viewBox", `0 0 ${parseInt(width)} ${parseInt(height)}`);
  }

  return new XMLSerializer().serializeToString(svg);
}

/**
 * Generate a simple mask icon from a raster image
 */
async function generateSimpleMaskIcon(source: string): Promise<string> {
  // This is a simplified version - in production, you'd want to use
  // a proper image tracing library
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="black"/>
</svg>`;
}

/**
 * Generate manifest.json content for PWA
 */
export function generateWebManifest(options: {
  name: string;
  shortName: string;
  description?: string;
  themeColor: string;
  backgroundColor: string;
  display?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
}): string {
  return JSON.stringify(
    {
      name: options.name,
      short_name: options.shortName,
      description: options.description || options.name,
      theme_color: options.themeColor,
      background_color: options.backgroundColor,
      display: options.display || "standalone",
      scope: "/",
      start_url: "/",
      icons: [
        {
          src: "/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    },
    null,
    2,
  );
}

/**
 * Generate browserconfig.xml for Microsoft
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
 * Generate favicon HTML tags
 */
export function generateFaviconTags(options: {
  themeColor: string;
  appleTouchIconPath?: string;
  manifestPath?: string;
}): string {
  return `
<!-- Favicons -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="${options.appleTouchIconPath || "/apple-touch-icon.png"}">
<link rel="manifest" href="${options.manifestPath || "/site.webmanifest"}">
<link rel="mask-icon" href="/safari-pinned-tab.svg" color="${options.themeColor}">
<meta name="msapplication-TileColor" content="${options.themeColor}">
<meta name="theme-color" content="${options.themeColor}">
`.trim();
}

/**
 * Generate Open Graph image
 */
export async function generateOgImage(options: {
  title: string;
  description?: string;
  logo?: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("generateOgImage requires browser environment"));
      return;
    }

    const width = 1200;
    const height = 630;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    // Background
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Accent line at top
    ctx.fillStyle = options.accentColor;
    ctx.fillRect(0, 0, width, 8);

    // Draw logo if provided
    let contentStartY = 180;

    const drawText = () => {
      // Title
      ctx.fillStyle = options.textColor;
      ctx.font = "bold 64px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Word wrap title
      const words = options.title.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > width - 160) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      lines.push(currentLine);

      lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, contentStartY + i * 80);
      });

      // Description
      if (options.description) {
        ctx.font = "32px Inter, system-ui, sans-serif";
        ctx.fillStyle = options.textColor + "AA"; // Semi-transparent
        const descY = contentStartY + lines.length * 80 + 40;
        ctx.fillText(options.description.slice(0, 100), width / 2, descY);
      }

      resolve(canvas.toDataURL("image/png"));
    };

    if (options.logo) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Draw logo centered at top
        const logoHeight = 80;
        const logoWidth = (img.width / img.height) * logoHeight;
        ctx.drawImage(img, (width - logoWidth) / 2, 80, logoWidth, logoHeight);
        contentStartY = 200;
        drawText();
      };
      img.onerror = () => drawText();
      img.src = options.logo;
    } else {
      drawText();
    }
  });
}

/**
 * Create a data URL from canvas
 */
export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  format: "image/png" | "image/jpeg" = "image/png",
  quality?: number,
): string {
  return canvas.toDataURL(format, quality);
}

/**
 * Download a data URL as a file
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download all favicons as a zip (requires JSZip in browser)
 */
export async function downloadFaviconsZip(
  favicons: Record<string, string>,
  zipFilename = "favicons.zip",
): Promise<void> {
  // This would require JSZip library
  // For now, download individually
  Object.entries(favicons).forEach(([name, dataUrl]) => {
    const extension = dataUrl.includes("svg") ? "svg" : "png";
    downloadDataUrl(dataUrl, `${name}.${extension}`);
  });
}
