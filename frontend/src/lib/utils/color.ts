/**
 * Color utilities for nself-chat
 * @module utils/color
 */

/**
 * RGB color object
 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * RGBA color object
 */
export interface RGBA extends RGB {
  a: number;
}

/**
 * HSL color object
 */
export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * HSLA color object
 */
export interface HSLA extends HSL {
  a: number;
}

/**
 * Convert hex color to RGB
 * @param hex - Hex color string (with or without #)
 * @returns RGB object or null if invalid
 * @example
 * hexToRgb('#ff5500') // { r: 255, g: 85, b: 0 }
 * hexToRgb('f50') // { r: 255, g: 85, b: 0 }
 */
export function hexToRgb(hex: string): RGB | null {
  // Remove # if present
  let cleanHex = hex.replace(/^#/, "");

  // Handle shorthand (e.g., 'f50' -> 'ff5500')
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  // Handle 8-character hex (with alpha) - just use first 6
  if (cleanHex.length === 8) {
    cleanHex = cleanHex.slice(0, 6);
  }

  if (cleanHex.length !== 6 || !/^[0-9a-fA-F]+$/.test(cleanHex)) {
    return null;
  }

  const num = parseInt(cleanHex, 16);

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Convert hex color to RGBA
 * @param hex - Hex color string (with or without #, 6 or 8 characters)
 * @returns RGBA object or null if invalid
 * @example
 * hexToRgba('#ff550080') // { r: 255, g: 85, b: 0, a: 0.5 }
 */
export function hexToRgba(hex: string): RGBA | null {
  let cleanHex = hex.replace(/^#/, "");

  // Handle shorthand
  if (cleanHex.length === 3) {
    cleanHex =
      cleanHex
        .split("")
        .map((char) => char + char)
        .join("") + "ff";
  } else if (cleanHex.length === 4) {
    cleanHex = cleanHex
      .split("")
      .map((char) => char + char)
      .join("");
  } else if (cleanHex.length === 6) {
    cleanHex += "ff";
  }

  if (cleanHex.length !== 8 || !/^[0-9a-fA-F]+$/.test(cleanHex)) {
    return null;
  }

  const num = parseInt(cleanHex, 16);

  return {
    r: (num >> 24) & 255,
    g: (num >> 16) & 255,
    b: (num >> 8) & 255,
    a: (num & 255) / 255,
  };
}

/**
 * Convert RGB to hex color
 * @param rgb - RGB object or individual values
 * @returns Hex color string with #
 * @example
 * rgbToHex({ r: 255, g: 85, b: 0 }) // '#ff5500'
 * rgbToHex(255, 85, 0) // '#ff5500'
 */
export function rgbToHex(rgbOrR: RGB | number, g?: number, b?: number): string {
  let r: number, green: number, blue: number;

  if (typeof rgbOrR === "object") {
    r = rgbOrR.r;
    green = rgbOrR.g;
    blue = rgbOrR.b;
  } else {
    r = rgbOrR;
    green = g ?? 0;
    blue = b ?? 0;
  }

  // Clamp values
  r = Math.max(0, Math.min(255, Math.round(r)));
  green = Math.max(0, Math.min(255, Math.round(green)));
  blue = Math.max(0, Math.min(255, Math.round(blue)));

  const toHex = (n: number) => n.toString(16).padStart(2, "0");

  return `#${toHex(r)}${toHex(green)}${toHex(blue)}`;
}

/**
 * Convert RGBA to hex color with alpha
 * @param rgba - RGBA object
 * @returns Hex color string with # (8 characters)
 */
export function rgbaToHex(rgba: RGBA): string {
  const hex = rgbToHex(rgba);
  const alpha = Math.max(0, Math.min(255, Math.round(rgba.a * 255)));
  return hex + alpha.toString(16).padStart(2, "0");
}

/**
 * Convert RGB to HSL
 * @param rgb - RGB object
 * @returns HSL object
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
  }

  return { h: h * 360, s, l };
}

/**
 * Convert HSL to RGB
 * @param hsl - HSL object
 * @returns RGB object
 */
export function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl;
  const hue = h / 360;

  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const hueToRgb = (p: number, q: number, t: number): number => {
    let adjustedT = t;
    if (adjustedT < 0) adjustedT += 1;
    if (adjustedT > 1) adjustedT -= 1;
    if (adjustedT < 1 / 6) return p + (q - p) * 6 * adjustedT;
    if (adjustedT < 1 / 2) return q;
    if (adjustedT < 2 / 3) return p + (q - p) * (2 / 3 - adjustedT) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hue) * 255),
    b: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
  };
}

/**
 * Convert hex to HSL
 * @param hex - Hex color string
 * @returns HSL object or null if invalid
 */
export function hexToHsl(hex: string): HSL | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb);
}

/**
 * Convert HSL to hex
 * @param hsl - HSL object
 * @returns Hex color string
 */
export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Lighten a color
 * @param color - Hex color string
 * @param amount - Amount to lighten (0-1, default: 0.1)
 * @returns Lightened hex color
 * @example
 * lighten('#3366ff', 0.2) // Lighter blue
 */
export function lighten(color: string, amount: number = 0.1): string {
  const hsl = hexToHsl(color);
  if (!hsl) return color;

  hsl.l = Math.min(1, hsl.l + amount);
  return hslToHex(hsl);
}

/**
 * Darken a color
 * @param color - Hex color string
 * @param amount - Amount to darken (0-1, default: 0.1)
 * @returns Darkened hex color
 * @example
 * darken('#3366ff', 0.2) // Darker blue
 */
export function darken(color: string, amount: number = 0.1): string {
  const hsl = hexToHsl(color);
  if (!hsl) return color;

  hsl.l = Math.max(0, hsl.l - amount);
  return hslToHex(hsl);
}

/**
 * Saturate a color
 * @param color - Hex color string
 * @param amount - Amount to saturate (0-1, default: 0.1)
 * @returns Saturated hex color
 */
export function saturate(color: string, amount: number = 0.1): string {
  const hsl = hexToHsl(color);
  if (!hsl) return color;

  hsl.s = Math.min(1, hsl.s + amount);
  return hslToHex(hsl);
}

/**
 * Desaturate a color
 * @param color - Hex color string
 * @param amount - Amount to desaturate (0-1, default: 0.1)
 * @returns Desaturated hex color
 */
export function desaturate(color: string, amount: number = 0.1): string {
  const hsl = hexToHsl(color);
  if (!hsl) return color;

  hsl.s = Math.max(0, hsl.s - amount);
  return hslToHex(hsl);
}

/**
 * Adjust hue of a color
 * @param color - Hex color string
 * @param degrees - Degrees to rotate (can be negative)
 * @returns Adjusted hex color
 */
export function adjustHue(color: string, degrees: number): string {
  const hsl = hexToHsl(color);
  if (!hsl) return color;

  hsl.h = (hsl.h + degrees + 360) % 360;
  return hslToHex(hsl);
}

/**
 * Get complementary color (opposite on color wheel)
 * @param color - Hex color string
 * @returns Complementary hex color
 */
export function getComplementary(color: string): string {
  return adjustHue(color, 180);
}

/**
 * Get contrast color (black or white) for readability
 * @param backgroundColor - Background hex color
 * @param darkColor - Dark color option (default: '#000000')
 * @param lightColor - Light color option (default: '#ffffff')
 * @returns Best contrast color
 * @example
 * getContrastColor('#ffffff') // '#000000'
 * getContrastColor('#000000') // '#ffffff'
 * getContrastColor('#3366ff') // '#ffffff'
 */
export function getContrastColor(
  backgroundColor: string,
  darkColor: string = "#000000",
  lightColor: string = "#ffffff",
): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return darkColor;

  // Calculate relative luminance using WCAG formula
  const luminance = getLuminance(rgb);

  // Use contrast ratio threshold
  return luminance > 0.179 ? darkColor : lightColor;
}

/**
 * Calculate relative luminance of a color
 * @param rgb - RGB object
 * @returns Luminance value (0-1)
 */
export function getLuminance(rgb: RGB): number {
  const toLinear = (value: number): number => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 - First hex color
 * @param color2 - Second hex color
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG requirements
 * @param color1 - First hex color
 * @param color2 - Second hex color
 * @param level - WCAG level ('AA' or 'AAA')
 * @param largeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns Whether contrast is sufficient
 */
export function meetsContrastRequirement(
  color1: string,
  color2: string,
  level: "AA" | "AAA" = "AA",
  largeText: boolean = false,
): boolean {
  const ratio = getContrastRatio(color1, color2);

  const requirements = {
    AA: { normal: 4.5, large: 3 },
    AAA: { normal: 7, large: 4.5 },
  };

  const minRatio = largeText
    ? requirements[level].large
    : requirements[level].normal;

  return ratio >= minRatio;
}

/**
 * Mix two colors together
 * @param color1 - First hex color
 * @param color2 - Second hex color
 * @param weight - Weight of first color (0-1, default: 0.5)
 * @returns Mixed hex color
 */
export function mix(
  color1: string,
  color2: string,
  weight: number = 0.5,
): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return color1;

  const w = Math.max(0, Math.min(1, weight));

  return rgbToHex({
    r: Math.round(rgb1.r * w + rgb2.r * (1 - w)),
    g: Math.round(rgb1.g * w + rgb2.g * (1 - w)),
    b: Math.round(rgb1.b * w + rgb2.b * (1 - w)),
  });
}

/**
 * Create a tint (mix with white)
 * @param color - Hex color
 * @param amount - Amount of white (0-1)
 * @returns Tinted hex color
 */
export function tint(color: string, amount: number = 0.1): string {
  return mix(color, "#ffffff", 1 - amount);
}

/**
 * Create a shade (mix with black)
 * @param color - Hex color
 * @param amount - Amount of black (0-1)
 * @returns Shaded hex color
 */
export function shade(color: string, amount: number = 0.1): string {
  return mix(color, "#000000", 1 - amount);
}

/**
 * Generate a color palette from a base color
 * @param baseColor - Base hex color
 * @param steps - Number of steps (default: 10)
 * @returns Array of hex colors from lightest to darkest
 */
export function generatePalette(
  baseColor: string,
  steps: number = 10,
): string[] {
  const palette: string[] = [];

  for (let i = 0; i < steps; i++) {
    const amount = (i / (steps - 1)) * 2 - 1; // -1 to 1

    if (amount < 0) {
      // Tint (lighter)
      palette.push(tint(baseColor, Math.abs(amount)));
    } else if (amount > 0) {
      // Shade (darker)
      palette.push(shade(baseColor, amount));
    } else {
      palette.push(baseColor);
    }
  }

  return palette;
}

/**
 * Generate triadic colors (120 degrees apart)
 * @param color - Base hex color
 * @returns Array of three hex colors
 */
export function getTriadic(color: string): [string, string, string] {
  return [color, adjustHue(color, 120), adjustHue(color, 240)];
}

/**
 * Generate analogous colors (adjacent on color wheel)
 * @param color - Base hex color
 * @param angle - Angle between colors (default: 30)
 * @returns Array of three hex colors
 */
export function getAnalogous(
  color: string,
  angle: number = 30,
): [string, string, string] {
  return [adjustHue(color, -angle), color, adjustHue(color, angle)];
}

/**
 * Generate split-complementary colors
 * @param color - Base hex color
 * @param angle - Split angle (default: 30)
 * @returns Array of three hex colors
 */
export function getSplitComplementary(
  color: string,
  angle: number = 30,
): [string, string, string] {
  return [color, adjustHue(color, 180 - angle), adjustHue(color, 180 + angle)];
}

/**
 * Convert color to grayscale
 * @param color - Hex color
 * @returns Grayscale hex color
 */
export function toGrayscale(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  // Use luminance-based conversion for perceptual accuracy
  const gray = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
  return rgbToHex({ r: gray, g: gray, b: gray });
}

/**
 * Invert a color
 * @param color - Hex color
 * @returns Inverted hex color
 */
export function invert(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  return rgbToHex({
    r: 255 - rgb.r,
    g: 255 - rgb.g,
    b: 255 - rgb.b,
  });
}

/**
 * Check if a string is a valid hex color
 * @param color - String to check
 * @returns Whether it's a valid hex color
 */
export function isValidHex(color: string): boolean {
  return hexToRgb(color) !== null;
}

/**
 * Parse any CSS color to hex
 * @param color - CSS color string (hex, rgb, rgba, hsl, hsla, named)
 * @returns Hex color or null if unparseable
 */
export function parseColor(color: string): string | null {
  if (!color) return null;

  const trimmed = color.trim().toLowerCase();

  // Already hex
  if (trimmed.startsWith("#")) {
    const rgb = hexToRgb(trimmed);
    return rgb ? rgbToHex(rgb) : null;
  }

  // RGB/RGBA
  const rgbMatch = trimmed.match(
    /^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/,
  );
  if (rgbMatch) {
    return rgbToHex({
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    });
  }

  // HSL/HSLA
  const hslMatch = trimmed.match(
    /^hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*[\d.]+)?\s*\)$/,
  );
  if (hslMatch) {
    return hslToHex({
      h: parseFloat(hslMatch[1]),
      s: parseFloat(hslMatch[2]) / 100,
      l: parseFloat(hslMatch[3]) / 100,
    });
  }

  // Named colors (common ones)
  const namedColors: Record<string, string> = {
    black: "#000000",
    white: "#ffffff",
    red: "#ff0000",
    green: "#008000",
    blue: "#0000ff",
    yellow: "#ffff00",
    cyan: "#00ffff",
    magenta: "#ff00ff",
    gray: "#808080",
    grey: "#808080",
    orange: "#ffa500",
    purple: "#800080",
    pink: "#ffc0cb",
    transparent: "#00000000",
  };

  return namedColors[trimmed] || null;
}

/**
 * Format color as CSS rgb() string
 * @param color - Hex color
 * @returns CSS rgb() string
 */
export function toRgbString(color: string): string | null {
  const rgb = hexToRgb(color);
  if (!rgb) return null;
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

/**
 * Format color as CSS hsl() string
 * @param color - Hex color
 * @returns CSS hsl() string
 */
export function toHslString(color: string): string | null {
  const hsl = hexToHsl(color);
  if (!hsl) return null;
  return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%)`;
}
