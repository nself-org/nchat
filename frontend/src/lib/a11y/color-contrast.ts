/**
 * Color contrast utilities for accessibility
 *
 * Provides utilities for calculating contrast ratios, validating WCAG compliance,
 * and suggesting accessible color alternatives.
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

export type WCAGLevel = "AA" | "AAA";
export type TextSize = "normal" | "large";

export interface ContrastResult {
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  meetsAALarge: boolean;
  meetsAAALarge: boolean;
  level: WCAGLevel | "fail";
}

export interface ColorSuggestion {
  color: string;
  ratio: number;
  adjustment: "lighter" | "darker" | "none";
}

// ============================================================================
// WCAG Contrast Requirements
// ============================================================================

export const WCAG_CONTRAST_REQUIREMENTS = {
  AA: {
    normalText: 4.5,
    largeText: 3,
    uiComponent: 3,
  },
  AAA: {
    normalText: 7,
    largeText: 4.5,
    uiComponent: 3, // Same as AA
  },
} as const;

// ============================================================================
// Color Parsing
// ============================================================================

/**
 * Parses a hex color string to RGB values
 */
export function hexToRgb(hex: string): RGB | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, "");

  // Expand shorthand form (e.g., "03F") to full form (e.g., "0033FF")
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((char) => char + char)
          .join("")
      : cleanHex;

  // Validate hex format
  if (!/^[a-fA-F0-9]{6}$/.test(fullHex)) {
    return null;
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);

  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Converts RGB values to hex color string
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (value: number): string => {
    const clamped = Math.max(0, Math.min(255, Math.round(value)));
    return clamped.toString(16).padStart(2, "0");
  };

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Parses an rgb() or rgba() color string to RGB values
 */
export function parseRgbString(color: string): RGB | null {
  const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);

  if (!match) return null;

  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
  };
}

/**
 * Parses any supported color format to RGB
 */
export function parseColor(color: string): RGB | null {
  const trimmed = color.trim().toLowerCase();

  // Handle hex colors
  if (trimmed.startsWith("#")) {
    return hexToRgb(trimmed);
  }

  // Handle rgb/rgba
  if (trimmed.startsWith("rgb")) {
    return parseRgbString(trimmed);
  }

  // Handle named colors (limited set)
  const namedColors: Record<string, RGB> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    yellow: { r: 255, g: 255, b: 0 },
    cyan: { r: 0, g: 255, b: 255 },
    magenta: { r: 255, g: 0, b: 255 },
    gray: { r: 128, g: 128, b: 128 },
    grey: { r: 128, g: 128, b: 128 },
  };

  return namedColors[trimmed] || null;
}

// ============================================================================
// Color Conversion
// ============================================================================

/**
 * Converts RGB to HSL
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

  let h = 0;
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

  return { h: h * 360, s, l };
}

/**
 * Converts HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl;
  const hNorm = h / 360;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hNorm) * 255),
    b: Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255),
  };
}

// ============================================================================
// Luminance Calculations
// ============================================================================

/**
 * Calculates the relative luminance of a color
 * Based on WCAG 2.1 formula
 */
export function getRelativeLuminance(rgb: RGB): number {
  const linearize = (value: number): number => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };

  const rLinear = linearize(rgb.r);
  const gLinear = linearize(rgb.g);
  const bLinear = linearize(rgb.b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculates the contrast ratio between two colors
 * Returns a value between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) return 1;

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculates contrast ratio from RGB values directly
 */
export function getContrastRatioFromRgb(rgb1: RGB, rgb2: RGB): number {
  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================================
// WCAG Compliance Checking
// ============================================================================

/**
 * Checks if a contrast ratio meets WCAG requirements
 */
export function meetsContrastRequirement(
  ratio: number,
  level: WCAGLevel = "AA",
  textSize: TextSize = "normal",
): boolean {
  const isLarge = textSize === "large";
  const requirement = isLarge
    ? WCAG_CONTRAST_REQUIREMENTS[level].largeText
    : WCAG_CONTRAST_REQUIREMENTS[level].normalText;

  return ratio >= requirement;
}

/**
 * Gets detailed contrast analysis between two colors
 */
export function analyzeContrast(
  foreground: string,
  background: string,
): ContrastResult {
  const ratio = getContrastRatio(foreground, background);

  const meetsAA = ratio >= WCAG_CONTRAST_REQUIREMENTS.AA.normalText;
  const meetsAAA = ratio >= WCAG_CONTRAST_REQUIREMENTS.AAA.normalText;
  const meetsAALarge = ratio >= WCAG_CONTRAST_REQUIREMENTS.AA.largeText;
  const meetsAAALarge = ratio >= WCAG_CONTRAST_REQUIREMENTS.AAA.largeText;

  let level: WCAGLevel | "fail" = "fail";
  if (meetsAAA) level = "AAA";
  else if (meetsAA) level = "AA";

  return {
    ratio,
    meetsAA,
    meetsAAA,
    meetsAALarge,
    meetsAAALarge,
    level,
  };
}

/**
 * Checks if colors meet WCAG requirements for UI components
 */
export function meetsUIComponentRequirement(
  foreground: string,
  background: string,
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= WCAG_CONTRAST_REQUIREMENTS.AA.uiComponent;
}

// ============================================================================
// Color Suggestions
// ============================================================================

/**
 * Adjusts color lightness to meet contrast requirements
 */
export function adjustForContrast(
  foreground: string,
  background: string,
  targetRatio: number = WCAG_CONTRAST_REQUIREMENTS.AA.normalText,
): ColorSuggestion | null {
  const fgRgb = parseColor(foreground);
  const bgRgb = parseColor(background);

  if (!fgRgb || !bgRgb) return null;

  const currentRatio = getContrastRatioFromRgb(fgRgb, bgRgb);

  if (currentRatio >= targetRatio) {
    return {
      color: foreground,
      ratio: currentRatio,
      adjustment: "none",
    };
  }

  const fgHsl = rgbToHsl(fgRgb);
  const bgLum = getRelativeLuminance(bgRgb);

  // Determine direction: lighter or darker
  const shouldDarken = bgLum > 0.5;

  // Binary search for the right lightness
  let low = shouldDarken ? 0 : fgHsl.l;
  let high = shouldDarken ? fgHsl.l : 1;
  let bestColor = foreground;
  let bestRatio = currentRatio;

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const testHsl = { ...fgHsl, l: mid };
    const testRgb = hslToRgb(testHsl);
    const testRatio = getContrastRatioFromRgb(testRgb, bgRgb);

    if (testRatio >= targetRatio) {
      bestColor = rgbToHex(testRgb);
      bestRatio = testRatio;
      if (shouldDarken) {
        low = mid;
      } else {
        high = mid;
      }
    } else {
      if (shouldDarken) {
        high = mid;
      } else {
        low = mid;
      }
    }
  }

  return {
    color: bestColor,
    ratio: bestRatio,
    adjustment: shouldDarken ? "darker" : "lighter",
  };
}

/**
 * Suggests accessible color alternatives
 */
export function suggestAccessibleColors(
  foreground: string,
  background: string,
  options: { count?: number; includeBlackWhite?: boolean } = {},
): ColorSuggestion[] {
  const { count = 3, includeBlackWhite = true } = options;
  const suggestions: ColorSuggestion[] = [];

  const bgRgb = parseColor(background);
  if (!bgRgb) return suggestions;

  // Check black and white first
  if (includeBlackWhite) {
    const blackRatio = getContrastRatio("#000000", background);
    const whiteRatio = getContrastRatio("#ffffff", background);

    if (blackRatio >= WCAG_CONTRAST_REQUIREMENTS.AA.normalText) {
      suggestions.push({
        color: "#000000",
        ratio: blackRatio,
        adjustment: "darker",
      });
    }

    if (whiteRatio >= WCAG_CONTRAST_REQUIREMENTS.AA.normalText) {
      suggestions.push({
        color: "#ffffff",
        ratio: whiteRatio,
        adjustment: "lighter",
      });
    }
  }

  // Try to adjust the original color
  const adjusted = adjustForContrast(foreground, background);
  if (adjusted && adjusted.adjustment !== "none") {
    suggestions.push(adjusted);
  }

  // Generate more suggestions by varying lightness
  const fgRgb = parseColor(foreground);
  if (fgRgb) {
    const fgHsl = rgbToHsl(fgRgb);
    const lightnessVariations = [0.1, 0.2, 0.3, 0.7, 0.8, 0.9];

    for (const l of lightnessVariations) {
      const variantRgb = hslToRgb({ ...fgHsl, l });
      const variantHex = rgbToHex(variantRgb);
      const ratio = getContrastRatioFromRgb(variantRgb, bgRgb);

      if (ratio >= WCAG_CONTRAST_REQUIREMENTS.AA.normalText) {
        const isDarker = l < fgHsl.l;
        suggestions.push({
          color: variantHex,
          ratio,
          adjustment: isDarker ? "darker" : "lighter",
        });
      }
    }
  }

  // Sort by ratio (descending) and remove duplicates
  const uniqueSuggestions = suggestions
    .filter((s, i, arr) => arr.findIndex((x) => x.color === s.color) === i)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, count);

  return uniqueSuggestions;
}

// ============================================================================
// High Contrast Mode Detection
// ============================================================================

/**
 * Detects if the user has high contrast mode enabled
 */
export function detectHighContrastMode(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  // Check for forced-colors media query (Windows high contrast)
  const forcedColors = window.matchMedia("(forced-colors: active)");
  if (forcedColors.matches) {
    return true;
  }

  // Check for prefers-contrast media query
  const prefersMoreContrast = window.matchMedia("(prefers-contrast: more)");
  if (prefersMoreContrast.matches) {
    return true;
  }

  return false;
}

/**
 * Gets the preferred contrast level
 */
export function getPreferredContrast():
  | "no-preference"
  | "more"
  | "less"
  | "custom" {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "no-preference";
  }

  if (window.matchMedia("(prefers-contrast: more)").matches) {
    return "more";
  }

  if (window.matchMedia("(prefers-contrast: less)").matches) {
    return "less";
  }

  if (window.matchMedia("(prefers-contrast: custom)").matches) {
    return "custom";
  }

  return "no-preference";
}

/**
 * Listens for high contrast mode changes
 */
export function onHighContrastChange(
  callback: (isHighContrast: boolean) => void,
): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }

  const forcedColors = window.matchMedia("(forced-colors: active)");
  const prefersMoreContrast = window.matchMedia("(prefers-contrast: more)");

  const handler = (): void => {
    callback(forcedColors.matches || prefersMoreContrast.matches);
  };

  forcedColors.addEventListener("change", handler);
  prefersMoreContrast.addEventListener("change", handler);

  return () => {
    forcedColors.removeEventListener("change", handler);
    prefersMoreContrast.removeEventListener("change", handler);
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if a color is considered "light"
 */
export function isLightColor(color: string): boolean {
  const rgb = parseColor(color);
  if (!rgb) return false;

  const luminance = getRelativeLuminance(rgb);
  return luminance > 0.179; // WCAG threshold
}

/**
 * Gets an appropriate text color (black or white) for a background
 */
export function getTextColorForBackground(
  background: string,
): "#000000" | "#ffffff" {
  return isLightColor(background) ? "#000000" : "#ffffff";
}

/**
 * Calculates the perceived brightness of a color (0-255)
 */
export function getPerceivedBrightness(color: string): number {
  const rgb = parseColor(color);
  if (!rgb) return 0;

  // Using the formula: (R * 299 + G * 587 + B * 114) / 1000
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}

/**
 * Formats a contrast ratio for display
 */
export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Gets WCAG level badge text
 */
export function getWCAGBadge(ratio: number): string {
  if (ratio >= WCAG_CONTRAST_REQUIREMENTS.AAA.normalText) {
    return "AAA";
  }
  if (ratio >= WCAG_CONTRAST_REQUIREMENTS.AA.normalText) {
    return "AA";
  }
  if (ratio >= WCAG_CONTRAST_REQUIREMENTS.AA.largeText) {
    return "AA Large";
  }
  return "Fail";
}
