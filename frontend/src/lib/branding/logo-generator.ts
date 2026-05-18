/**
 * Programmatic logo generation utilities
 */

export interface LogoOptions {
  text: string;
  tagline?: string;
  icon?: string | null; // Base64 data URL or SVG string
  fontFamily?: string;
  fontWeight?: number;
  textColor?: string;
  taglineColor?: string;
  backgroundColor?: string;
  iconPosition?: "left" | "top" | "right";
  alignment?: "left" | "center" | "right";
  padding?: number;
  iconSize?: number;
  fontSize?: number;
  taglineFontSize?: number;
  spacing?: number;
  width?: number;
  height?: number;
  format?: "png" | "svg" | "both";
}

export interface LogoResult {
  png?: string; // Base64 data URL
  svg?: string; // SVG string
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: Required<Omit<LogoOptions, "text" | "icon">> = {
  tagline: "",
  fontFamily: "Inter",
  fontWeight: 700,
  textColor: "#18181B",
  taglineColor: "#6B7280",
  backgroundColor: "transparent",
  iconPosition: "left",
  alignment: "left",
  padding: 32,
  iconSize: 48,
  fontSize: 48,
  taglineFontSize: 18,
  spacing: 16,
  width: 0, // Auto-calculated
  height: 0, // Auto-calculated
  format: "both",
};

/**
 * Generate a logo from text and options
 */
export async function generateLogo(options: LogoOptions): Promise<LogoResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Calculate dimensions
  const dimensions = calculateLogoDimensions(opts);

  // Generate SVG
  const svg = generateLogoSvg(opts, dimensions);

  // Generate PNG if requested
  let png: string | undefined;
  if (opts.format === "png" || opts.format === "both") {
    png = await svgToPng(svg, dimensions.width, dimensions.height);
  }

  return {
    png,
    svg: opts.format === "svg" || opts.format === "both" ? svg : undefined,
    width: dimensions.width,
    height: dimensions.height,
  };
}

interface LogoDimensions {
  width: number;
  height: number;
  textX: number;
  textY: number;
  taglineX: number;
  taglineY: number;
  iconX: number;
  iconY: number;
}

/**
 * Calculate logo dimensions based on options
 */
function calculateLogoDimensions(
  opts: Required<Omit<LogoOptions, "icon">> & {
    icon?: string | null;
    text: string;
  },
): LogoDimensions {
  const hasIcon = !!opts.icon;
  const hasTagline = !!opts.tagline;

  // Estimate text width (rough approximation)
  const textWidth = opts.text.length * opts.fontSize * 0.6;
  const taglineWidth = hasTagline
    ? opts.tagline.length * opts.taglineFontSize * 0.5
    : 0;

  let width: number;
  let height: number;
  let textX: number;
  let textY: number;
  let taglineX: number;
  let taglineY: number;
  let iconX: number;
  let iconY: number;

  if (opts.iconPosition === "left" || opts.iconPosition === "right") {
    // Horizontal layout
    const contentWidth = hasIcon
      ? opts.iconSize + opts.spacing + Math.max(textWidth, taglineWidth)
      : Math.max(textWidth, taglineWidth);
    const contentHeight = hasTagline
      ? opts.fontSize + opts.spacing / 2 + opts.taglineFontSize
      : opts.fontSize;

    width = opts.width || contentWidth + opts.padding * 2;
    height =
      opts.height || Math.max(opts.iconSize, contentHeight) + opts.padding * 2;

    if (opts.iconPosition === "left") {
      iconX = opts.padding;
      textX = hasIcon
        ? opts.padding + opts.iconSize + opts.spacing
        : opts.padding;
    } else {
      textX = opts.padding;
      iconX = width - opts.padding - opts.iconSize;
    }

    iconY = (height - opts.iconSize) / 2;
    textY = hasTagline
      ? (height - contentHeight) / 2 + opts.fontSize * 0.8
      : height / 2 + opts.fontSize * 0.3;
    taglineX = textX;
    taglineY = textY + opts.spacing / 2 + opts.taglineFontSize * 0.8;
  } else {
    // Vertical layout (icon on top)
    const contentWidth = Math.max(opts.iconSize, textWidth, taglineWidth);
    const contentHeight =
      opts.iconSize +
      opts.spacing +
      opts.fontSize +
      (hasTagline ? opts.spacing / 2 + opts.taglineFontSize : 0);

    width = opts.width || contentWidth + opts.padding * 2;
    height = opts.height || contentHeight + opts.padding * 2;

    iconX = (width - opts.iconSize) / 2;
    iconY = opts.padding;
    textX = width / 2;
    textY = opts.padding + opts.iconSize + opts.spacing + opts.fontSize * 0.8;
    taglineX = width / 2;
    taglineY = textY + opts.spacing / 2 + opts.taglineFontSize * 0.8;
  }

  // Apply alignment
  if (opts.alignment === "center" && opts.iconPosition !== "top") {
    textX = width / 2;
    taglineX = width / 2;
    if (hasIcon && opts.iconPosition === "left") {
      const totalContentWidth =
        opts.iconSize + opts.spacing + Math.max(textWidth, taglineWidth);
      iconX = (width - totalContentWidth) / 2;
      textX = iconX + opts.iconSize + opts.spacing + textWidth / 2;
      taglineX = iconX + opts.iconSize + opts.spacing + taglineWidth / 2;
    }
  } else if (opts.alignment === "right" && opts.iconPosition !== "top") {
    textX = width - opts.padding;
    taglineX = width - opts.padding;
    if (hasIcon && opts.iconPosition === "left") {
      iconX =
        width -
        opts.padding -
        opts.iconSize -
        opts.spacing -
        Math.max(textWidth, taglineWidth);
    }
  }

  return {
    width,
    height,
    textX,
    textY,
    taglineX,
    taglineY,
    iconX,
    iconY,
  };
}

/**
 * Generate SVG logo
 */
function generateLogoSvg(
  opts: Required<Omit<LogoOptions, "icon">> & {
    icon?: string | null;
    text: string;
  },
  dims: LogoDimensions,
): string {
  const textAnchor =
    opts.alignment === "center"
      ? "middle"
      : opts.alignment === "right"
        ? "end"
        : "start";

  let iconElement = "";
  if (opts.icon) {
    if (opts.icon.startsWith("data:image/svg")) {
      // Extract SVG content and embed it
      const svgContent = extractSvgContent(opts.icon);
      iconElement = `
        <g transform="translate(${dims.iconX}, ${dims.iconY})">
          <g transform="scale(${opts.iconSize / 512})">
            ${svgContent}
          </g>
        </g>
      `;
    } else if (opts.icon.startsWith("data:image/")) {
      // Embed raster image
      iconElement = `
        <image
          x="${dims.iconX}"
          y="${dims.iconY}"
          width="${opts.iconSize}"
          height="${opts.iconSize}"
          href="${opts.icon}"
          preserveAspectRatio="xMidYMid meet"
        />
      `;
    } else if (opts.icon.startsWith("<svg")) {
      // Direct SVG string
      const svgContent = extractSvgContent(
        `data:image/svg+xml;base64,${btoa(opts.icon)}`,
      );
      iconElement = `
        <g transform="translate(${dims.iconX}, ${dims.iconY})">
          <g transform="scale(${opts.iconSize / 512})">
            ${svgContent}
          </g>
        </g>
      `;
    }
  }

  const taglineElement = opts.tagline
    ? `
      <text
        x="${dims.taglineX}"
        y="${dims.taglineY}"
        font-family="'${opts.fontFamily}', sans-serif"
        font-size="${opts.taglineFontSize}"
        font-weight="400"
        fill="${opts.taglineColor}"
        text-anchor="${textAnchor}"
      >${escapeXml(opts.tagline)}</text>
    `
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${dims.width}"
  height="${dims.height}"
  viewBox="0 0 ${dims.width} ${dims.height}"
>
  ${opts.backgroundColor !== "transparent" ? `<rect width="100%" height="100%" fill="${opts.backgroundColor}"/>` : ""}
  ${iconElement}
  <text
    x="${dims.textX}"
    y="${dims.textY}"
    font-family="'${opts.fontFamily}', sans-serif"
    font-size="${opts.fontSize}"
    font-weight="${opts.fontWeight}"
    fill="${opts.textColor}"
    text-anchor="${textAnchor}"
  >${escapeXml(opts.text)}</text>
  ${taglineElement}
</svg>`;
}

/**
 * Extract inner content from SVG data URL
 */
function extractSvgContent(dataUrl: string): string {
  try {
    const base64 = dataUrl.replace(/^data:image\/svg\+xml;base64,/, "");
    const svgString = atob(base64);
    // Extract content between <svg> tags
    const match = svgString.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convert SVG to PNG data URL
 */
async function svgToPng(
  svg: string,
  width: number,
  height: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("svgToPng requires browser environment"));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width * 2; // 2x for retina
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load SVG"));

    const blob = new Blob([svg], { type: "image/svg+xml" });
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Generate a simple text-only logo
 */
export async function generateTextLogo(
  text: string,
  options?: Partial<LogoOptions>,
): Promise<LogoResult> {
  return generateLogo({
    text,
    ...options,
  });
}

/**
 * Generate a monogram logo (1-3 characters)
 */
export async function generateMonogramLogo(
  initials: string,
  options?: Partial<LogoOptions>,
): Promise<LogoResult> {
  const chars = initials.slice(0, 3).toUpperCase();
  return generateLogo({
    text: chars,
    fontSize: chars.length === 1 ? 72 : chars.length === 2 ? 56 : 42,
    fontWeight: 700,
    ...options,
  });
}

/**
 * Generate logo variations for different use cases
 */
export async function generateLogoVariations(options: LogoOptions): Promise<{
  full: LogoResult;
  compact: LogoResult;
  icon: LogoResult;
  wordmark: LogoResult;
}> {
  // Full logo with icon and text
  const full = await generateLogo(options);

  // Compact version (icon only or smaller)
  const compact = await generateLogo({
    ...options,
    tagline: "",
    padding: 16,
  });

  // Icon only (if icon provided)
  let icon: LogoResult;
  if (options.icon) {
    icon = await generateLogo({
      text: "",
      icon: options.icon,
      iconSize: 64,
      padding: 0,
    });
  } else {
    // Generate monogram as icon
    icon = await generateMonogramLogo(options.text.slice(0, 2), {
      backgroundColor: options.textColor || "#18181B",
      textColor: "#FFFFFF",
    });
  }

  // Wordmark (text only)
  const wordmark = await generateLogo({
    ...options,
    icon: null,
  });

  return { full, compact, icon, wordmark };
}
