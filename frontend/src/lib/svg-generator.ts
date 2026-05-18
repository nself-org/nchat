export interface IconSVGOptions {
  content: string;
  isSymbol: boolean;
  textColor: string;
  bgType: "solid" | "gradient";
  bgColor1: string;
  bgColor2?: string;
  gradientDirection?: string;
  iconShape: "square" | "rounded" | "circle";
  size?: number;
}

export interface LogoSVGOptions {
  text: string;
  tagline?: string;
  fontFamily: string;
  fontWeight: string;
  textColor: string;
  taglineColor?: string;
  includeIcon?: boolean;
  iconSvg?: string;
  iconPosition?: "left" | "top";
  alignment?: "left" | "center" | "right";
  backgroundColor?: string;
  showDivider?: boolean;
  dividerPosition?: "above" | "below";
  dividerColor?: string;
  dividerWidth?: number;
  textOffsetX?: number;
  textOffsetY?: number;
  taglineOffsetX?: number;
  taglineOffsetY?: number;
}

export function generateIconSVG(options: IconSVGOptions): string {
  const {
    content,
    isSymbol,
    textColor,
    bgType,
    bgColor1,
    bgColor2,
    gradientDirection = "to bottom right",
    iconShape,
    size = 512,
  } = options;

  // Create background
  let bgElement = "";
  let defs = "";

  if (bgType === "gradient" && bgColor2) {
    const gradientId = "iconGrad";

    if (gradientDirection === "radial") {
      defs = `
        <defs>
          <radialGradient id="${gradientId}">
            <stop offset="0%" stop-color="${bgColor1}"/>
            <stop offset="100%" stop-color="${bgColor2}"/>
          </radialGradient>
        </defs>`;
    } else {
      const coords =
        gradientDirection === "to right"
          ? 'x1="0%" y1="0%" x2="100%" y2="0%"'
          : gradientDirection === "to bottom"
            ? 'x1="0%" y1="0%" x2="0%" y2="100%"'
            : 'x1="0%" y1="0%" x2="100%" y2="100%"';

      defs = `
        <defs>
          <linearGradient id="${gradientId}" ${coords}>
            <stop offset="0%" stop-color="${bgColor1}"/>
            <stop offset="100%" stop-color="${bgColor2}"/>
          </linearGradient>
        </defs>`;
    }
    bgElement = `fill="url(#${gradientId})"`;
  } else {
    bgElement = `fill="${bgColor1}"`;
  }

  // Create shape path
  let shapePath = "";
  if (iconShape === "circle") {
    shapePath = `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" ${bgElement}/>`;
  } else if (iconShape === "rounded") {
    const radius = size * 0.125;
    shapePath = `<rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" ${bgElement}/>`;
  } else {
    shapePath = `<rect x="0" y="0" width="${size}" height="${size}" ${bgElement}/>`;
  }

  // Calculate font size
  const fontSize = isSymbol
    ? 280
    : content.length === 1
      ? 320
      : content.length === 2
        ? 240
        : 180;

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  ${shapePath}
  <text x="50%" y="50%" 
        font-family="${isSymbol ? "Arial, sans-serif" : "Inter, system-ui, -apple-system, sans-serif"}" 
        font-size="${fontSize}" 
        font-weight="${isSymbol ? "normal" : "bold"}" 
        fill="${textColor}" 
        text-anchor="middle" 
        dominant-baseline="middle">${content}</text>
</svg>`;

  return svg;
}

export function generateLogoSVG(options: LogoSVGOptions): string {
  const {
    text,
    tagline,
    fontFamily,
    fontWeight,
    textColor,
    taglineColor = "#6B7280",
    includeIcon,
    iconSvg,
    iconPosition = "left",
    alignment = "left",
    backgroundColor = "transparent",
    showDivider,
    dividerPosition = "below",
    dividerColor = "#6B7280",
    dividerWidth = 60,
    textOffsetX = 0,
    textOffsetY = 0,
    taglineOffsetX = 0,
    taglineOffsetY = 0,
  } = options;

  // Calculate dimensions
  const iconSize = includeIcon ? 48 : 0;
  const iconSpacing = includeIcon ? 16 : 0;
  const fontSize = 32;
  const taglineFontSize = tagline ? 14 : 0;
  const padding = 32;

  // Estimate text width (rough approximation)
  const textWidth = text.length * fontSize * 0.6;
  const taglineWidth = tagline ? tagline.length * taglineFontSize * 0.6 : 0;
  const maxTextWidth = Math.max(textWidth, taglineWidth);

  let width: number, height: number;

  if (iconPosition === "top") {
    width = Math.max(iconSize, maxTextWidth) + padding * 2;
    height =
      iconSize +
      iconSpacing +
      fontSize +
      (tagline ? 8 + taglineFontSize : 0) +
      padding * 2;
  } else {
    width = iconSize + iconSpacing + maxTextWidth + padding * 2;
    height =
      Math.max(iconSize, fontSize + (tagline ? 8 + taglineFontSize : 0)) +
      padding * 2;
  }

  let elements: string[] = [];

  // Background
  if (backgroundColor !== "transparent") {
    elements.push(
      `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`,
    );
  }

  // Icon
  if (includeIcon && iconSvg) {
    let iconX = padding;
    let iconY = padding;

    if (iconPosition === "top") {
      if (alignment === "center") iconX = (width - iconSize) / 2;
      else if (alignment === "right") iconX = width - padding - iconSize;
    } else {
      iconY = (height - iconSize) / 2;
    }

    // If iconSvg is an SVG string, embed it directly
    if (iconSvg.startsWith("<svg")) {
      // Parse SVG and embed as group
      const svgMatch = iconSvg.match(/<svg[^>]*>(.*?)<\/svg>/s);
      if (svgMatch) {
        elements.push(
          `<g transform="translate(${iconX}, ${iconY}) scale(${iconSize / 512}, ${iconSize / 512})">${svgMatch[1]}</g>`,
        );
      }
    } else {
      // Otherwise treat as data URL or path
      elements.push(
        `<image x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" href="${iconSvg}"/>`,
      );
    }
  }

  // Text positioning
  let textX = padding;
  let textY = padding;
  let textAnchor = "start";

  if (iconPosition === "top") {
    textY = padding + (includeIcon ? iconSize + iconSpacing : 0);
  } else {
    if (includeIcon) textX = padding + iconSize + iconSpacing;
    textY = (height - (fontSize + (tagline ? 8 + taglineFontSize : 0))) / 2;
  }

  if (alignment === "center") {
    textX = width / 2;
    textAnchor = "middle";
  } else if (alignment === "right") {
    textX = width - padding;
    textAnchor = "end";
  }

  // Divider (above text)
  if (showDivider && dividerPosition === "above") {
    const dividerX =
      alignment === "center"
        ? (width - dividerWidth) / 2
        : alignment === "right"
          ? width - padding - dividerWidth
          : textX;
    const dividerY = textY - 4;
    elements.push(
      `<line x1="${dividerX}" y1="${dividerY}" x2="${dividerX + dividerWidth}" y2="${dividerY}" stroke="${dividerColor}" stroke-width="2"/>`,
    );
  }

  // Main text
  elements.push(`<text x="${textX + textOffsetX}" y="${textY + fontSize * 0.8 + textOffsetY}" 
        font-family="'${fontFamily}', sans-serif" 
        font-size="${fontSize}" 
        font-weight="${fontWeight}" 
        fill="${textColor}" 
        text-anchor="${textAnchor}">${text}</text>`);

  // Tagline
  if (tagline) {
    const taglineY = textY + fontSize + 8;
    elements.push(`<text x="${textX + taglineOffsetX}" y="${taglineY + taglineFontSize * 0.8 + taglineOffsetY}" 
          font-family="'${fontFamily}', sans-serif" 
          font-size="${taglineFontSize}" 
          font-weight="400" 
          fill="${taglineColor}" 
          text-anchor="${textAnchor}">${tagline}</text>`);
  }

  // Divider (below text/tagline)
  if (showDivider && dividerPosition === "below") {
    const dividerX =
      alignment === "center"
        ? (width - dividerWidth) / 2
        : alignment === "right"
          ? width - padding - dividerWidth
          : textX;
    const dividerY = textY + fontSize + (tagline ? 8 + taglineFontSize : 0) + 8;
    elements.push(
      `<line x1="${dividerX}" y1="${dividerY}" x2="${dividerX + dividerWidth}" y2="${dividerY}" stroke="${dividerColor}" stroke-width="2"/>`,
    );
  }

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${elements.join("\n  ")}
</svg>`;

  return svg;
}

// Convert data URL to blob
export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Save SVG to file
export async function saveSVGToFile(
  svg: string,
  filename: string,
): Promise<string> {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  // For now, return the blob URL
  // In a real implementation, this would save to the public directory
  return url;
}
