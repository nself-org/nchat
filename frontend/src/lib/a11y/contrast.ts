/**
 * Color Contrast Utilities
 *
 * Utilities for checking and ensuring color contrast compliance
 * with WCAG 2.1 guidelines.
 */

// ============================================================================
// Types
// ============================================================================

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export type ContrastLevel = "AAA" | "AA" | "AA-large" | "fail";

export interface ContrastResult {
  ratio: number;
  level: ContrastLevel;
  passes: {
    AA: boolean;
    AAA: boolean;
    AALarge: boolean;
    AAALarge: boolean;
  };
}

// ============================================================================
// Color Conversion
// ============================================================================

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
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
    h: h * 360,
    s: s * 100,
    l: l * 100,
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

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
    r: r * 255,
    g: g * 255,
    b: b * 255,
  };
}

// ============================================================================
// Luminance Calculation
// ============================================================================

/**
 * Calculate relative luminance of a color (WCAG 2.1)
 */
export function getLuminance(rgb: RGB): number {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ============================================================================
// Contrast Ratio
// ============================================================================

/**
 * Calculate contrast ratio between two colors (WCAG 2.1)
 */
export function getContrastRatio(color1: RGB, color2: RGB): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG requirements
 */
export function checkContrast(
  foreground: RGB,
  background: RGB,
  options?: {
    fontSize?: number;
    fontWeight?: number | string;
  },
): ContrastResult {
  const ratio = getContrastRatio(foreground, background);
  const { fontSize = 16, fontWeight = 400 } = options || {};

  // Large text: 18pt (24px) or 14pt (18.66px) bold
  const isLargeText =
    fontSize >= 24 ||
    (fontSize >= 18.66 && (fontWeight === "bold" || Number(fontWeight) >= 700));

  const passes = {
    AA: isLargeText ? ratio >= 3 : ratio >= 4.5,
    AAA: isLargeText ? ratio >= 4.5 : ratio >= 7,
    AALarge: ratio >= 3,
    AAALarge: ratio >= 4.5,
  };

  let level: ContrastLevel;
  if (passes.AAA) {
    level = "AAA";
  } else if (passes.AA) {
    level = "AA";
  } else if (isLargeText && passes.AALarge) {
    level = "AA-large";
  } else {
    level = "fail";
  }

  return {
    ratio,
    level,
    passes,
  };
}

/**
 * Check if contrast ratio meets minimum WCAG AA requirements
 */
export function meetsWCAG_AA(
  foreground: RGB,
  background: RGB,
  isLargeText = false,
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA requirements
 */
export function meetsWCAG_AAA(
  foreground: RGB,
  background: RGB,
  isLargeText = false,
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

// ============================================================================
// Color Adjustment
// ============================================================================

/**
 * Adjust color to meet minimum contrast ratio
 */
export function adjustColorForContrast(
  color: RGB,
  background: RGB,
  targetRatio: number = 4.5,
): RGB {
  const currentRatio = getContrastRatio(color, background);

  if (currentRatio >= targetRatio) {
    return color;
  }

  const hsl = rgbToHsl(color);
  const backgroundLum = getLuminance(background);

  // Determine if we should lighten or darken
  const shouldLighten = backgroundLum < 0.5;

  const adjusted = { ...hsl };
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const rgb = hslToRgb(adjusted);
    const ratio = getContrastRatio(rgb, background);

    if (ratio >= targetRatio) {
      return rgb;
    }

    // Adjust lightness
    if (shouldLighten) {
      adjusted.l = Math.min(100, adjusted.l + 1);
    } else {
      adjusted.l = Math.max(0, adjusted.l - 1);
    }

    attempts++;
  }

  // If we couldn't meet the ratio, return the best attempt
  return hslToRgb(adjusted);
}

/**
 * Get accessible text color for a background
 */
export function getAccessibleTextColor(background: RGB): RGB {
  const luminance = getLuminance(background);

  // Use white text for dark backgrounds, black for light
  return luminance > 0.5
    ? { r: 0, g: 0, b: 0 } // Black
    : { r: 255, g: 255, b: 255 }; // White
}

/**
 * Suggest alternative color that meets contrast requirements
 */
export function suggestAccessibleColor(
  color: string,
  background: string,
  targetRatio: number = 4.5,
): string {
  const colorRgb = hexToRgb(color);
  const bgRgb = hexToRgb(background);

  if (!colorRgb || !bgRgb) {
    throw new Error("Invalid color format");
  }

  const adjusted = adjustColorForContrast(colorRgb, bgRgb, targetRatio);
  return rgbToHex(adjusted);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format contrast ratio for display
 */
export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Get WCAG level description
 */
export function getContrastLevelDescription(level: ContrastLevel): string {
  switch (level) {
    case "AAA":
      return "Excellent (AAA)";
    case "AA":
      return "Good (AA)";
    case "AA-large":
      return "Good for large text (AA)";
    case "fail":
      return "Poor - does not meet WCAG standards";
  }
}

/**
 * Check if color is too bright (might cause eye strain)
 */
export function isTooLight(rgb: RGB): boolean {
  const luminance = getLuminance(rgb);
  return luminance > 0.9;
}

/**
 * Check if color is too dark
 */
export function isTooDark(rgb: RGB): boolean {
  const luminance = getLuminance(rgb);
  return luminance < 0.1;
}

/**
 * Generate color palette with accessible contrasts
 */
export function generateAccessiblePalette(baseColor: string): {
  primary: string;
  onPrimary: string;
  primaryVariant: string;
  onPrimaryVariant: string;
} {
  const base = hexToRgb(baseColor);
  if (!base) {
    throw new Error("Invalid base color");
  }

  const onPrimary = getAccessibleTextColor(base);
  const hsl = rgbToHsl(base);

  // Create a variant by adjusting lightness
  const variantHsl = {
    ...hsl,
    l: hsl.l > 50 ? hsl.l - 15 : hsl.l + 15,
  };
  const variant = hslToRgb(variantHsl);
  const onVariant = getAccessibleTextColor(variant);

  return {
    primary: rgbToHex(base),
    onPrimary: rgbToHex(onPrimary),
    primaryVariant: rgbToHex(variant),
    onPrimaryVariant: rgbToHex(onVariant),
  };
}

// ============================================================================
// Color Blind Simulation
// ============================================================================

/**
 * Simulate protanopia (red-blind)
 */
export function simulateProtanopia(rgb: RGB): RGB {
  return {
    r: 0.567 * rgb.r + 0.433 * rgb.g,
    g: 0.558 * rgb.r + 0.442 * rgb.g,
    b: 0.242 * rgb.g + 0.758 * rgb.b,
  };
}

/**
 * Simulate deuteranopia (green-blind)
 */
export function simulateDeuteranopia(rgb: RGB): RGB {
  return {
    r: 0.625 * rgb.r + 0.375 * rgb.g,
    g: 0.7 * rgb.r + 0.3 * rgb.g,
    b: 0.3 * rgb.g + 0.7 * rgb.b,
  };
}

/**
 * Simulate tritanopia (blue-blind)
 */
export function simulateTritanopia(rgb: RGB): RGB {
  return {
    r: 0.95 * rgb.r + 0.05 * rgb.g,
    g: 0.433 * rgb.g + 0.567 * rgb.b,
    b: 0.475 * rgb.g + 0.525 * rgb.b,
  };
}

/**
 * Simulate monochromacy (total color blindness)
 */
export function simulateMonochromacy(rgb: RGB): RGB {
  const gray = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return { r: gray, g: gray, b: gray };
}
