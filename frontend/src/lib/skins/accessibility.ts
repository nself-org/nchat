/**
 * Accessibility Token System
 *
 * Provides focus ring styles, minimum touch targets, high-contrast overrides,
 * and screen-reader-only utility definitions. All tokens are derived from
 * the skin's color palette to ensure proper contrast ratios.
 *
 * Includes:
 *   - Focus ring style tokens (visible, inset, offset variants)
 *   - Contrast ratio computation (WCAG 2.1 AA/AAA)
 *   - High-contrast mode overrides
 *   - Touch target enforcement tokens
 *   - Screen-reader-only CSS utilities
 *   - ARIA attribute helper types
 *   - Keyboard navigation tokens
 *
 * @module lib/skins/accessibility
 * @version 1.0.0
 */

import type { VisualSkin, SkinColorPalette } from "./types";
import { nchatSkin } from "./visual-skins";

// ============================================================================
// CONTRAST COMPUTATION
// ============================================================================

/**
 * Parse a hex color string to an { r, g, b } object.
 * Supports #RGB, #RRGGBB, and #RRGGBBAA formats.
 */
export function parseHexColor(
  hex: string,
): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  let r: number, g: number, b: number;

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6 || clean.length === 8) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/**
 * Compute the relative luminance of a color per WCAG 2.1.
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(hex: string): number {
  const color = parseHexColor(hex);
  if (!color) return 0;

  const toLinear = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Compute the contrast ratio between two colors per WCAG 2.1.
 * Returns a value between 1 and 21.
 */
export function contrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color pair meets WCAG 2.1 contrast requirements.
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: "AA" | "AAA" = "AA",
  isLargeText: boolean = false,
): boolean {
  const ratio = contrastRatio(foreground, background);
  if (level === "AAA") {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  // AA
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

// ============================================================================
// FOCUS RING STYLES
// ============================================================================

export interface FocusRingStyle {
  /** Outline width */
  width: string;
  /** Outline offset from the element */
  offset: string;
  /** Outline color */
  color: string;
  /** Outline style */
  style: string;
  /** Full CSS outline shorthand */
  outline: string;
  /** Box-shadow alternative for rounded elements */
  boxShadow: string;
}

export interface FocusRingTokens {
  /** Default visible focus ring */
  default: FocusRingStyle;
  /** Inset focus ring (for filled containers) */
  inset: FocusRingStyle;
  /** Error-state focus ring */
  error: FocusRingStyle;
  /** High contrast focus ring */
  highContrast: FocusRingStyle;
}

export function buildFocusRingTokens(
  colors: SkinColorPalette,
): FocusRingTokens {
  const defaultRing: FocusRingStyle = {
    width: "2px",
    offset: "2px",
    color: colors.primary,
    style: "solid",
    outline: `2px solid ${colors.primary}`,
    boxShadow: `0 0 0 2px ${colors.background}, 0 0 0 4px ${colors.primary}`,
  };

  const insetRing: FocusRingStyle = {
    width: "2px",
    offset: "-2px",
    color: colors.primary,
    style: "solid",
    outline: `2px solid ${colors.primary}`,
    boxShadow: `inset 0 0 0 2px ${colors.primary}`,
  };

  const errorRing: FocusRingStyle = {
    width: "2px",
    offset: "2px",
    color: colors.error,
    style: "solid",
    outline: `2px solid ${colors.error}`,
    boxShadow: `0 0 0 2px ${colors.background}, 0 0 0 4px ${colors.error}`,
  };

  const highContrastRing: FocusRingStyle = {
    width: "3px",
    offset: "2px",
    color: colors.text,
    style: "solid",
    outline: `3px solid ${colors.text}`,
    boxShadow: `0 0 0 2px ${colors.background}, 0 0 0 5px ${colors.text}`,
  };

  return {
    default: defaultRing,
    inset: insetRing,
    error: errorRing,
    highContrast: highContrastRing,
  };
}

// ============================================================================
// HIGH CONTRAST OVERRIDES
// ============================================================================

export interface HighContrastOverrides {
  /** Forced background for surfaces */
  background: string;
  /** Forced text color */
  text: string;
  /** Forced border color */
  border: string;
  /** Forced link color */
  link: string;
  /** Forced button background */
  buttonBg: string;
  /** Forced button text */
  buttonText: string;
  /** Minimum border width */
  borderWidth: string;
  /** Whether to show underlines on all links */
  underlineLinks: boolean;
}

export function buildHighContrastOverrides(
  colors: SkinColorPalette,
  isDarkMode: boolean,
): HighContrastOverrides {
  return {
    background: isDarkMode ? "#000000" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#000000",
    border: isDarkMode ? "#FFFFFF" : "#000000",
    link: colors.primary,
    buttonBg: isDarkMode ? "#FFFFFF" : "#000000",
    buttonText: isDarkMode ? "#000000" : "#FFFFFF",
    borderWidth: "2px",
    underlineLinks: true,
  };
}

// ============================================================================
// TOUCH TARGET TOKENS
// ============================================================================

export interface TouchTargetTokens {
  /** WCAG 2.5.8 minimum (AAA) */
  minimumSize: string;
  /** WCAG 2.5.5 enhanced minimum */
  enhancedSize: string;
  /** Comfortable interaction size */
  comfortableSize: string;
  /** Minimum spacing between adjacent targets */
  minimumGap: string;
  /** Minimum hit area for inline actions */
  inlineActionSize: string;
}

export function buildTouchTargetTokens(): TouchTargetTokens {
  return {
    minimumSize: "44px",
    enhancedSize: "48px",
    comfortableSize: "48px",
    minimumGap: "8px",
    inlineActionSize: "32px",
  };
}

// ============================================================================
// SCREEN READER UTILITIES
// ============================================================================

export interface ScreenReaderOnlyStyle {
  position: string;
  width: string;
  height: string;
  padding: string;
  margin: string;
  overflow: string;
  clip: string;
  whiteSpace: string;
  borderWidth: string;
}

/**
 * CSS properties for visually hiding content while keeping it accessible
 * to screen readers.
 */
export function getScreenReaderOnlyStyle(): ScreenReaderOnlyStyle {
  return {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    borderWidth: "0",
  };
}

/**
 * CSS properties to reverse screen-reader-only hiding (e.g., on focus).
 */
export function getScreenReaderFocusableStyle(): Record<string, string> {
  return {
    position: "static",
    width: "auto",
    height: "auto",
    padding: "0",
    margin: "0",
    overflow: "visible",
    clip: "auto",
    whiteSpace: "normal",
  };
}

// ============================================================================
// KEYBOARD NAVIGATION TOKENS
// ============================================================================

export interface KeyboardNavigationTokens {
  /** Skip link styles */
  skipLink: {
    background: string;
    color: string;
    padding: string;
    fontSize: string;
    zIndex: number;
  };
  /** Focus trap indicator */
  focusTrapIndicator: {
    borderColor: string;
    borderWidth: string;
    borderStyle: string;
  };
}

export function buildKeyboardNavigationTokens(
  colors: SkinColorPalette,
): KeyboardNavigationTokens {
  return {
    skipLink: {
      background: colors.buttonPrimaryBg,
      color: colors.buttonPrimaryText,
      padding: "8px 16px",
      fontSize: "14px",
      zIndex: 9999,
    },
    focusTrapIndicator: {
      borderColor: colors.primary,
      borderWidth: "2px",
      borderStyle: "dashed",
    },
  };
}

// ============================================================================
// CONSOLIDATED ACCESSIBILITY TOKENS
// ============================================================================

export interface AccessibilityTokens {
  focusRings: FocusRingTokens;
  highContrast: HighContrastOverrides;
  touchTargets: TouchTargetTokens;
  screenReaderOnly: ScreenReaderOnlyStyle;
  screenReaderFocusable: Record<string, string>;
  keyboardNav: KeyboardNavigationTokens;
  /** Pre-computed contrast ratios for key color pairs */
  contrastRatios: {
    textOnBackground: number;
    textOnSurface: number;
    primaryOnBackground: number;
    buttonPrimaryTextOnBg: number;
  };
}

/**
 * Build the complete accessibility token set from a visual skin.
 *
 * @param skin - The visual skin to derive tokens from. Defaults to nchatSkin.
 * @param isDarkMode - Whether to use dark mode colors.
 * @returns Fully resolved AccessibilityTokens.
 */
export function getAccessibilityTokens(
  skin: VisualSkin = nchatSkin,
  isDarkMode: boolean = false,
): AccessibilityTokens {
  const colors = isDarkMode ? skin.darkMode.colors : skin.colors;

  return {
    focusRings: buildFocusRingTokens(colors),
    highContrast: buildHighContrastOverrides(colors, isDarkMode),
    touchTargets: buildTouchTargetTokens(),
    screenReaderOnly: getScreenReaderOnlyStyle(),
    screenReaderFocusable: getScreenReaderFocusableStyle(),
    keyboardNav: buildKeyboardNavigationTokens(colors),
    contrastRatios: {
      textOnBackground: contrastRatio(colors.text, colors.background),
      textOnSurface: contrastRatio(colors.text, colors.surface),
      primaryOnBackground: contrastRatio(colors.primary, colors.background),
      buttonPrimaryTextOnBg: contrastRatio(
        colors.buttonPrimaryText,
        colors.buttonPrimaryBg,
      ),
    },
  };
}
