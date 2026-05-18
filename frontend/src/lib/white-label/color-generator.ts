/**
 * Color Generator - Generate color palettes from a primary color
 */

export interface ColorPalette {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  card: string;
  cardForeground: string;
  border: string;
  input: string;
  ring: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  error: string;
  errorForeground: string;
  info: string;
  infoForeground: string;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Convert hex to HSL
 */
export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex));
}

/**
 * Convert HSL to hex
 */
export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Adjust lightness of a color
 */
export function adjustLightness(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  hsl.l = Math.max(0, Math.min(100, hsl.l + amount));
  return hslToHex(hsl);
}

/**
 * Adjust saturation of a color
 */
export function adjustSaturation(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  hsl.s = Math.max(0, Math.min(100, hsl.s + amount));
  return hslToHex(hsl);
}

/**
 * Get complementary color
 */
export function getComplementary(hex: string): string {
  const hsl = hexToHsl(hex);
  hsl.h = (hsl.h + 180) % 360;
  return hslToHex(hsl);
}

/**
 * Get analogous colors
 */
export function getAnalogous(
  hex: string,
  angle: number = 30,
): [string, string] {
  const hsl = hexToHsl(hex);
  return [
    hslToHex({ ...hsl, h: (hsl.h - angle + 360) % 360 }),
    hslToHex({ ...hsl, h: (hsl.h + angle) % 360 }),
  ];
}

/**
 * Get triadic colors
 */
export function getTriadic(hex: string): [string, string] {
  const hsl = hexToHsl(hex);
  return [
    hslToHex({ ...hsl, h: (hsl.h + 120) % 360 }),
    hslToHex({ ...hsl, h: (hsl.h + 240) % 360 }),
  ];
}

/**
 * Get split complementary colors
 */
export function getSplitComplementary(hex: string): [string, string] {
  const hsl = hexToHsl(hex);
  return [
    hslToHex({ ...hsl, h: (hsl.h + 150) % 360 }),
    hslToHex({ ...hsl, h: (hsl.h + 210) % 360 }),
  ];
}

/**
 * Calculate relative luminance
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const sRGB = [rgb.r, rgb.g, rgb.b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standard (4.5:1 for normal text)
 */
export function meetsWcagAA(color1: string, color2: string): boolean {
  return getContrastRatio(color1, color2) >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standard (7:1 for normal text)
 */
export function meetsWcagAAA(color1: string, color2: string): boolean {
  return getContrastRatio(color1, color2) >= 7;
}

/**
 * Get appropriate foreground color (black or white) for a background
 */
export function getContrastingForeground(backgroundColor: string): string {
  const luminance = getRelativeLuminance(backgroundColor);
  return luminance > 0.179 ? "#000000" : "#FFFFFF";
}

/**
 * Generate a color scale from a base color
 */
export function generateColorScale(
  hex: string,
  steps: number = 10,
): Record<number, string> {
  const scale: Record<number, string> = {};
  const hsl = hexToHsl(hex);

  for (let i = 0; i <= steps; i++) {
    const lightness = 100 - (i / steps) * 90;
    scale[i === 0 ? 50 : i * 100] = hslToHex({
      ...hsl,
      l: lightness,
    });
  }

  return scale;
}

/**
 * Generate a full color palette from a primary color
 */
export function generatePalette(
  primaryHex: string,
  mode: "light" | "dark" = "light",
): ColorPalette {
  const hsl = hexToHsl(primaryHex);

  // Secondary color (slightly desaturated and shifted hue)
  const secondaryHsl = {
    h: (hsl.h + 30) % 360,
    s: Math.max(0, hsl.s - 20),
    l: mode === "light" ? 45 : 55,
  };

  // Accent color (complementary or split complementary)
  const accentHsl = {
    h: (hsl.h + 180) % 360,
    s: hsl.s,
    l: mode === "light" ? 50 : 60,
  };

  const primary = primaryHex;
  const secondary = hslToHex(secondaryHsl);
  const accent = hslToHex(accentHsl);

  // Background and foreground based on mode
  const background = mode === "light" ? "#FFFFFF" : "#09090B";
  const foreground = mode === "light" ? "#18181B" : "#FAFAFA";
  const card = mode === "light" ? "#FFFFFF" : "#18181B";
  const cardForeground = foreground;
  const muted = mode === "light" ? "#F4F4F5" : "#27272A";
  const mutedForeground = mode === "light" ? "#71717A" : "#A1A1AA";
  const border = mode === "light" ? "#E4E4E7" : "#27272A";
  const input = border;
  const ring = primary;

  return {
    primary,
    primaryForeground: getContrastingForeground(primary),
    secondary,
    secondaryForeground: getContrastingForeground(secondary),
    accent,
    accentForeground: getContrastingForeground(accent),
    background,
    foreground,
    muted,
    mutedForeground,
    card,
    cardForeground,
    border,
    input,
    ring,
    // Semantic colors
    success: "#22C55E",
    successForeground: "#FFFFFF",
    warning: "#F59E0B",
    warningForeground: "#000000",
    error: "#EF4444",
    errorForeground: "#FFFFFF",
    info: primary,
    infoForeground: getContrastingForeground(primary),
  };
}

/**
 * Generate both light and dark palettes from a primary color
 */
export function generateDualPalette(primaryHex: string): {
  light: ColorPalette;
  dark: ColorPalette;
} {
  return {
    light: generatePalette(primaryHex, "light"),
    dark: generatePalette(primaryHex, "dark"),
  };
}

/**
 * Blend two colors together
 */
export function blendColors(
  color1: string,
  color2: string,
  weight: number = 0.5,
): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  return rgbToHex({
    r: Math.round(rgb1.r * weight + rgb2.r * (1 - weight)),
    g: Math.round(rgb1.g * weight + rgb2.g * (1 - weight)),
    b: Math.round(rgb1.b * weight + rgb2.b * (1 - weight)),
  });
}

/**
 * Generate a gradient from colors
 */
export function generateGradient(
  colors: string[],
  direction: "to right" | "to bottom" | "to bottom right" = "to right",
): string {
  const stops = colors
    .map((color, i) => `${color} ${(i / (colors.length - 1)) * 100}%`)
    .join(", ");
  return `linear-gradient(${direction}, ${stops})`;
}

/**
 * Check if a color is dark
 */
export function isDarkColor(hex: string): boolean {
  const luminance = getRelativeLuminance(hex);
  return luminance < 0.179;
}

/**
 * Parse color string (supports hex, rgb, hsl)
 */
export function parseColor(color: string): string {
  // Already hex
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color;
  }

  // rgb(r, g, b)
  const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    return rgbToHex({
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    });
  }

  // hsl(h, s%, l%)
  const hslMatch = color.match(/^hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)$/);
  if (hslMatch) {
    return hslToHex({
      h: parseInt(hslMatch[1]),
      s: parseInt(hslMatch[2]),
      l: parseInt(hslMatch[3]),
    });
  }

  throw new Error(`Unable to parse color: ${color}`);
}

/**
 * Format color as CSS custom property value
 */
export function formatAsCssVar(hex: string): string {
  const hsl = hexToHsl(hex);
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Export palette as CSS custom properties
 */
export function paletteToCSS(
  palette: ColorPalette,
  prefix: string = "",
): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(palette)) {
    const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    const varName = prefix ? `--${prefix}-${cssKey}` : `--${cssKey}`;
    lines.push(`  ${varName}: ${value};`);
  }

  return lines.join("\n");
}
