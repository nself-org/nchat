/**
 * RTL Utilities
 *
 * Enhanced RTL (Right-to-Left) support utilities for text direction detection,
 * bidirectional text wrapping, and RTL-aware number/date formatting.
 * Complements the base rtl.ts module with deeper text analysis capabilities.
 */

import { SUPPORTED_LOCALES, RTL_LOCALES, type LocaleCode } from "./locales";

/**
 * Unicode ranges for RTL scripts
 */
const RTL_RANGES: Array<[number, number]> = [
  // Arabic
  [0x0600, 0x06ff],
  [0x0750, 0x077f],
  [0x08a0, 0x08ff],
  [0xfb50, 0xfdff],
  [0xfe70, 0xfeff],
  // Hebrew
  [0x0590, 0x05ff],
  [0xfb1d, 0xfb4f],
  // Thaana (Maldivian)
  [0x0780, 0x07bf],
  // Syriac
  [0x0700, 0x074f],
  // N'Ko
  [0x07c0, 0x07ff],
  // Samaritan
  [0x0800, 0x083f],
  // Mandaic
  [0x0840, 0x085f],
];

/**
 * Unicode ranges for LTR scripts (Latin, CJK, Cyrillic, etc.)
 */
const LTR_RANGES: Array<[number, number]> = [
  // Basic Latin
  [0x0041, 0x005a],
  [0x0061, 0x007a],
  // Latin Extended
  [0x00c0, 0x024f],
  // Greek
  [0x0370, 0x03ff],
  // Cyrillic
  [0x0400, 0x04ff],
  // CJK Unified Ideographs
  [0x4e00, 0x9fff],
  // Hangul
  [0xac00, 0xd7af],
  // Hiragana
  [0x3040, 0x309f],
  // Katakana
  [0x30a0, 0x30ff],
  // Devanagari
  [0x0900, 0x097f],
];

/**
 * Unicode bidirectional control characters
 */
export const BIDI_CHARS = {
  /** Left-to-Right Mark */
  LRM: "\u200E",
  /** Right-to-Left Mark */
  RLM: "\u200F",
  /** Left-to-Right Embedding */
  LRE: "\u202A",
  /** Right-to-Left Embedding */
  RLE: "\u202B",
  /** Pop Directional Formatting */
  PDF: "\u202C",
  /** Left-to-Right Override */
  LRO: "\u202D",
  /** Right-to-Left Override */
  RLO: "\u202E",
  /** Left-to-Right Isolate */
  LRI: "\u2066",
  /** Right-to-Left Isolate */
  RLI: "\u2067",
  /** First Strong Isolate */
  FSI: "\u2068",
  /** Pop Directional Isolate */
  PDI: "\u2069",
} as const;

/**
 * Text direction detection result
 */
export interface DirectionAnalysis {
  /** Detected primary direction */
  direction: "ltr" | "rtl" | "neutral";
  /** Whether the text contains mixed directions */
  isMixed: boolean;
  /** Count of RTL characters */
  rtlCount: number;
  /** Count of LTR characters */
  ltrCount: number;
  /** Count of neutral characters (numbers, punctuation, whitespace) */
  neutralCount: number;
  /** Confidence level 0.0-1.0 */
  confidence: number;
}

/**
 * Check if a character code falls in an RTL range.
 */
function isRTLCharCode(code: number): boolean {
  return RTL_RANGES.some(([start, end]) => code >= start && code <= end);
}

/**
 * Check if a character code falls in an LTR range.
 */
function isLTRCharCode(code: number): boolean {
  return LTR_RANGES.some(([start, end]) => code >= start && code <= end);
}

/**
 * Detect the text direction of a string by analyzing character frequencies.
 * Uses a first-strong-character heuristic supplemented by overall character analysis.
 */
export function detectTextDirection(text: string): DirectionAnalysis {
  if (!text || text.trim().length === 0) {
    return {
      direction: "neutral",
      isMixed: false,
      rtlCount: 0,
      ltrCount: 0,
      neutralCount: 0,
      confidence: 0,
    };
  }

  let rtlCount = 0;
  let ltrCount = 0;
  let neutralCount = 0;
  let firstStrongDir: "ltr" | "rtl" | null = null;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    if (isRTLCharCode(code)) {
      rtlCount++;
      if (firstStrongDir === null) firstStrongDir = "rtl";
    } else if (isLTRCharCode(code)) {
      ltrCount++;
      if (firstStrongDir === null) firstStrongDir = "ltr";
    } else {
      neutralCount++;
    }
  }

  const totalStrong = rtlCount + ltrCount;
  const isMixed = rtlCount > 0 && ltrCount > 0;

  if (totalStrong === 0) {
    return {
      direction: "neutral",
      isMixed: false,
      rtlCount,
      ltrCount,
      neutralCount,
      confidence: 0,
    };
  }

  // Use first strong character as primary heuristic
  const direction = firstStrongDir || "ltr";
  const majorityDir = rtlCount > ltrCount ? "rtl" : "ltr";
  const confidence = Math.max(rtlCount, ltrCount) / totalStrong;

  return {
    direction,
    isMixed,
    rtlCount,
    ltrCount,
    neutralCount,
    confidence:
      isMixed && direction !== majorityDir ? confidence * 0.8 : confidence,
  };
}

/**
 * Detect text direction based on locale code.
 * More reliable than text analysis when the locale is known.
 */
export function detectDirectionByLocale(locale: string): "ltr" | "rtl" {
  // Check exact match first
  if (locale in SUPPORTED_LOCALES) {
    return SUPPORTED_LOCALES[locale].direction;
  }

  // Try base language code
  const baseLocale = locale.split("-")[0].toLowerCase();
  if (baseLocale in SUPPORTED_LOCALES) {
    return SUPPORTED_LOCALES[baseLocale].direction;
  }

  // Check RTL locales list
  if (RTL_LOCALES.includes(locale) || RTL_LOCALES.includes(baseLocale)) {
    return "rtl";
  }

  return "ltr";
}

/**
 * Wrap text with appropriate Unicode bidi isolate characters.
 * This prevents text direction from leaking into surrounding content.
 */
export function wrapBidi(
  text: string,
  direction?: "ltr" | "rtl" | "auto",
): string {
  if (!text) return text;

  if (direction === "ltr") {
    return `${BIDI_CHARS.LRI}${text}${BIDI_CHARS.PDI}`;
  }
  if (direction === "rtl") {
    return `${BIDI_CHARS.RLI}${text}${BIDI_CHARS.PDI}`;
  }

  // Auto-detect using First Strong Isolate
  return `${BIDI_CHARS.FSI}${text}${BIDI_CHARS.PDI}`;
}

/**
 * Strip all Unicode bidi control characters from a string.
 */
export function stripBidiChars(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
}

/**
 * Check if a string contains any bidi control characters.
 */
export function hasBidiChars(text: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/.test(text);
}

/**
 * Format a number in an RTL-aware manner.
 * In RTL locales, numbers are still rendered LTR but may need
 * directional marks to display correctly next to RTL text.
 */
export function formatNumberRTL(
  value: number,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  const config = SUPPORTED_LOCALES[locale];
  const bcp47 = config?.bcp47 || "en-US";
  const isRtl = config?.direction === "rtl";

  try {
    const formatted = new Intl.NumberFormat(bcp47, options).format(value);

    // In RTL context, wrap number with LRM marks to ensure proper display
    if (isRtl) {
      return `${BIDI_CHARS.LRM}${formatted}${BIDI_CHARS.LRM}`;
    }

    return formatted;
  } catch {
    return String(value);
  }
}

/**
 * Format a date string in an RTL-aware manner.
 * Date components are typically LTR (numbers) but separators and month names
 * may need directional handling in RTL contexts.
 */
export function formatDateRTL(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const config = SUPPORTED_LOCALES[locale];
  const bcp47 = config?.bcp47 || "en-US";

  try {
    return new Intl.DateTimeFormat(bcp47, options).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

/**
 * Get CSS logical property equivalent for a physical property.
 * Useful for building RTL-aware CSS dynamically.
 */
export function getLogicalProperty(
  physicalProperty: string,
  isRtl: boolean,
): string {
  const mappings: Record<string, string> = {
    "margin-left": "margin-inline-start",
    "margin-right": "margin-inline-end",
    "padding-left": "padding-inline-start",
    "padding-right": "padding-inline-end",
    "border-left": "border-inline-start",
    "border-right": "border-inline-end",
    left: "inset-inline-start",
    right: "inset-inline-end",
    "text-align: left": isRtl ? "text-align: right" : "text-align: left",
    "text-align: right": isRtl ? "text-align: left" : "text-align: right",
    "float: left": isRtl ? "float: right" : "float: left",
    "float: right": isRtl ? "float: left" : "float: right",
  };

  return mappings[physicalProperty] || physicalProperty;
}

/**
 * Create RTL-aware CSS transform for mirroring.
 * Flips translateX, scaleX, and rotateY values for RTL contexts.
 */
export function createRTLTransform(
  transforms: { translateX?: number; scaleX?: number; rotate?: number },
  isRtl: boolean,
): string {
  const parts: string[] = [];

  if (transforms.translateX !== undefined) {
    const value = isRtl ? -transforms.translateX : transforms.translateX;
    parts.push(`translateX(${value}px)`);
  }

  if (transforms.scaleX !== undefined) {
    const value = isRtl ? -transforms.scaleX : transforms.scaleX;
    parts.push(`scaleX(${value})`);
  }

  if (transforms.rotate !== undefined) {
    const value = isRtl ? -transforms.rotate : transforms.rotate;
    parts.push(`rotate(${value}deg)`);
  }

  return parts.join(" ") || "none";
}

/**
 * Mirror a horizontal position for RTL layouts.
 * Converts 'start'/'end' to physical 'left'/'right' based on direction.
 */
export function resolveLogicalPosition(
  position: "start" | "end" | "left" | "right",
  isRtl: boolean,
): "left" | "right" {
  if (position === "start") return isRtl ? "right" : "left";
  if (position === "end") return isRtl ? "left" : "right";
  return position;
}

/**
 * Check if a locale code represents an RTL language.
 */
export function isRTLLocale(locale: string): boolean {
  const config = SUPPORTED_LOCALES[locale];
  if (config) return config.direction === "rtl";

  const base = locale.split("-")[0].toLowerCase();
  const baseConfig = SUPPORTED_LOCALES[base];
  if (baseConfig) return baseConfig.direction === "rtl";

  return RTL_LOCALES.includes(locale) || RTL_LOCALES.includes(base);
}

/**
 * Get list of all supported RTL locale codes.
 */
export function getRTLLocales(): string[] {
  return [...RTL_LOCALES];
}

/**
 * Determine the writing direction for a mixed content block.
 * Useful when a message contains both RTL and LTR text.
 */
export function getMixedContentDirection(
  text: string,
  fallbackLocale?: string,
): "ltr" | "rtl" {
  const analysis = detectTextDirection(text);

  if (analysis.direction === "neutral" && fallbackLocale) {
    return detectDirectionByLocale(fallbackLocale);
  }

  if (analysis.direction === "neutral") {
    return "ltr";
  }

  return analysis.direction;
}
