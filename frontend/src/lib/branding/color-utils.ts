/**
 * Color manipulation utilities for the branding system
 */

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

export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
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
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
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
 * Lighten a color by a percentage
 */
export function lighten(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  hsl.l = Math.min(100, hsl.l + amount);
  return hslToHex(hsl);
}

/**
 * Darken a color by a percentage
 */
export function darken(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  hsl.l = Math.max(0, hsl.l - amount);
  return hslToHex(hsl);
}

/**
 * Saturate a color by a percentage
 */
export function saturate(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  hsl.s = Math.min(100, hsl.s + amount);
  return hslToHex(hsl);
}

/**
 * Desaturate a color by a percentage
 */
export function desaturate(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  hsl.s = Math.max(0, hsl.s - amount);
  return hslToHex(hsl);
}

/**
 * Adjust hue by degrees
 */
export function adjustHue(hex: string, degrees: number): string {
  const hsl = hexToHsl(hex);
  hsl.h = (hsl.h + degrees + 360) % 360;
  return hslToHex(hsl);
}

/**
 * Get complementary color
 */
export function getComplementary(hex: string): string {
  return adjustHue(hex, 180);
}

/**
 * Get analogous colors (30 degrees apart)
 */
export function getAnalogous(hex: string): [string, string, string] {
  return [adjustHue(hex, -30), hex, adjustHue(hex, 30)];
}

/**
 * Get triadic colors (120 degrees apart)
 */
export function getTriadic(hex: string): [string, string, string] {
  return [hex, adjustHue(hex, 120), adjustHue(hex, 240)];
}

/**
 * Get split complementary colors
 */
export function getSplitComplementary(hex: string): [string, string, string] {
  return [hex, adjustHue(hex, 150), adjustHue(hex, 210)];
}

/**
 * Calculate relative luminance
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color is light
 */
export function isLight(hex: string): boolean {
  return getLuminance(hex) > 0.179;
}

/**
 * Check if a color is dark
 */
export function isDark(hex: string): boolean {
  return !isLight(hex);
}

/**
 * Get contrasting text color (black or white)
 */
export function getContrastingTextColor(hex: string): string {
  return isLight(hex) ? "#000000" : "#FFFFFF";
}

/**
 * Get accessible text color with minimum contrast ratio
 */
export function getAccessibleTextColor(
  backgroundColor: string,
  preferredColor: string,
  minContrastRatio = 4.5,
): string {
  const contrast = getContrastRatio(backgroundColor, preferredColor);
  if (contrast >= minContrastRatio) {
    return preferredColor;
  }
  return getContrastingTextColor(backgroundColor);
}

/**
 * Generate a color palette from a base color
 */
export function generatePalette(baseColor: string): ColorPalette {
  const hsl = hexToHsl(baseColor);

  // Adjust saturation for lighter/darker shades
  const adjustSaturation = (l: number): number => {
    if (l > 80) return Math.max(0, hsl.s - 20);
    if (l < 20) return Math.min(100, hsl.s + 10);
    return hsl.s;
  };

  const createShade = (lightness: number): string => {
    return hslToHex({
      h: hsl.h,
      s: adjustSaturation(lightness),
      l: lightness,
    });
  };

  return {
    50: createShade(97),
    100: createShade(94),
    200: createShade(86),
    300: createShade(76),
    400: createShade(64),
    500: createShade(52),
    600: createShade(44),
    700: createShade(36),
    800: createShade(26),
    900: createShade(18),
    950: createShade(10),
  };
}

/**
 * Mix two colors together
 */
export function mix(color1: string, color2: string, weight = 0.5): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  return rgbToHex({
    r: Math.round(rgb1.r * weight + rgb2.r * (1 - weight)),
    g: Math.round(rgb1.g * weight + rgb2.g * (1 - weight)),
    b: Math.round(rgb1.b * weight + rgb2.b * (1 - weight)),
  });
}

/**
 * Convert color to grayscale
 */
export function toGrayscale(hex: string): string {
  const rgb = hexToRgb(hex);
  const gray = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
  return rgbToHex({ r: gray, g: gray, b: gray });
}

/**
 * Get color with alpha as RGBA string
 */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Validate hex color format
 */
export function isValidHex(hex: string): boolean {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

/**
 * Normalize hex color (add # if missing, expand shorthand)
 */
export function normalizeHex(hex: string): string {
  hex = hex.replace(/^#/, "");

  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  return `#${hex.toUpperCase()}`;
}

/**
 * Generate CSS custom properties from a palette
 */
export function paletteToCssVars(
  palette: ColorPalette,
  prefix: string,
): Record<string, string> {
  const vars: Record<string, string> = {};
  Object.entries(palette).forEach(([shade, color]) => {
    vars[`--${prefix}-${shade}`] = color;
  });
  return vars;
}

/**
 * Generate Tailwind color config from a palette
 */
export function paletteToTailwindConfig(
  palette: ColorPalette,
  name: string,
): Record<string, Record<string, string>> {
  return {
    [name]: { ...palette },
  };
}
