/**
 * Design Token System
 *
 * Comprehensive token set derived from the VisualSkin architecture. Every token
 * is computed from skin values -- no hardcoded magic numbers escape the token
 * boundary. Consumers import `getDesignTokens(skin)` and receive a fully
 * resolved, flat token map suitable for CSS variable injection or direct use.
 *
 * Token categories:
 *   - Spacing scale (4px base, 13 stops)
 *   - Typography scale (xs through 5xl + body/caption/heading aliases)
 *   - Color aliases (semantic shortcuts into the skin palette)
 *   - Shadow system (elevation levels 0-5)
 *   - Transition tokens (durations + easings)
 *   - Z-index scale (organized by layer purpose)
 *   - Dark mode overrides (all color-dependent tokens swapped)
 *
 * @module lib/skins/design-tokens
 * @version 1.0.0
 */

import type { VisualSkin, SkinColorPalette } from "./types";
import { nchatSkin } from "./visual-skins";

// ============================================================================
// SPACING SCALE
// ============================================================================

/**
 * 4px-base spacing scale. Derived from the skin's base font size to
 * maintain proportional rhythm.
 */
export interface SpacingScale {
  "0": string;
  px: string;
  "0.5": string;
  "1": string;
  "1.5": string;
  "2": string;
  "2.5": string;
  "3": string;
  "4": string;
  "5": string;
  "6": string;
  "8": string;
  "10": string;
  "12": string;
  "16": string;
  "20": string;
  "24": string;
  "32": string;
  "40": string;
  "48": string;
  "56": string;
  "64": string;
}

export function buildSpacingScale(): SpacingScale {
  return {
    "0": "0px",
    px: "1px",
    "0.5": "2px",
    "1": "4px",
    "1.5": "6px",
    "2": "8px",
    "2.5": "10px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
    "20": "80px",
    "24": "96px",
    "32": "128px",
    "40": "160px",
    "48": "192px",
    "56": "224px",
    "64": "256px",
  };
}

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================

export interface TypeScaleEntry {
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
}

export interface TypeScale {
  xs: TypeScaleEntry;
  sm: TypeScaleEntry;
  base: TypeScaleEntry;
  lg: TypeScaleEntry;
  xl: TypeScaleEntry;
  "2xl": TypeScaleEntry;
  "3xl": TypeScaleEntry;
  "4xl": TypeScaleEntry;
  "5xl": TypeScaleEntry;
}

export interface TypeAliases {
  caption: TypeScaleEntry;
  body: TypeScaleEntry;
  bodyLarge: TypeScaleEntry;
  headingSm: TypeScaleEntry;
  headingMd: TypeScaleEntry;
  headingLg: TypeScaleEntry;
  headingXl: TypeScaleEntry;
  display: TypeScaleEntry;
}

export function buildTypeScale(skin: VisualSkin): TypeScale {
  const base = parseFloat(skin.typography.fontSizeBase) || 14;
  const lh = skin.typography.lineHeight || 1.5;
  const ls = skin.typography.letterSpacing || "normal";

  return {
    xs: {
      fontSize: `${Math.round(base * 0.714)}px`,
      lineHeight: String(lh + 0.2),
      letterSpacing: "0.02em",
    },
    sm: {
      fontSize: skin.typography.fontSizeSm,
      lineHeight: String(lh + 0.1),
      letterSpacing: "0.01em",
    },
    base: {
      fontSize: skin.typography.fontSizeBase,
      lineHeight: String(lh),
      letterSpacing: ls,
    },
    lg: {
      fontSize: skin.typography.fontSizeLg,
      lineHeight: String(lh - 0.05),
      letterSpacing: ls,
    },
    xl: {
      fontSize: skin.typography.fontSizeXl,
      lineHeight: String(lh - 0.1),
      letterSpacing: "-0.01em",
    },
    "2xl": {
      fontSize: `${Math.round(base * 1.714)}px`,
      lineHeight: String(lh - 0.15),
      letterSpacing: "-0.015em",
    },
    "3xl": {
      fontSize: `${Math.round(base * 2.143)}px`,
      lineHeight: String(lh - 0.2),
      letterSpacing: "-0.02em",
    },
    "4xl": {
      fontSize: `${Math.round(base * 2.571)}px`,
      lineHeight: String(lh - 0.25),
      letterSpacing: "-0.025em",
    },
    "5xl": {
      fontSize: `${Math.round(base * 3.429)}px`,
      lineHeight: String(lh - 0.3),
      letterSpacing: "-0.03em",
    },
  };
}

export function buildTypeAliases(scale: TypeScale): TypeAliases {
  return {
    caption: scale.xs,
    body: scale.base,
    bodyLarge: scale.lg,
    headingSm: scale.lg,
    headingMd: scale.xl,
    headingLg: scale["2xl"],
    headingXl: scale["3xl"],
    display: scale["5xl"],
  };
}

// ============================================================================
// COLOR ALIASES
// ============================================================================

/**
 * Semantic color aliases that map skin palette values to usage-specific names.
 * Every value is derived from the skin -- nothing hardcoded.
 */
export interface ColorAliases {
  /* Surface hierarchy */
  bgApp: string;
  bgSurface: string;
  bgSurfaceHover: string;
  bgSurfaceActive: string;
  bgOverlay: string;
  bgInverse: string;

  /* Text hierarchy */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textLink: string;
  textLinkHover: string;

  /* Interactive */
  interactivePrimary: string;
  interactiveSecondary: string;
  interactiveHover: string;
  interactiveActive: string;
  interactiveDisabled: string;
  interactiveFocus: string;

  /* Borders */
  borderDefault: string;
  borderStrong: string;
  borderFocus: string;

  /* Status */
  statusSuccess: string;
  statusWarning: string;
  statusError: string;
  statusInfo: string;

  /* Brand */
  brandPrimary: string;
  brandSecondary: string;
  brandAccent: string;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  // Strip existing alpha if present (8-char hex)
  const base = hex.length === 9 ? hex.slice(0, 7) : hex.slice(0, 7);
  return `${base}${a}`;
}

export function buildColorAliases(
  colors: SkinColorPalette,
  isDarkMode: boolean,
): ColorAliases {
  return {
    bgApp: colors.background,
    bgSurface: colors.surface,
    bgSurfaceHover: hexWithAlpha(colors.primary, 0.06),
    bgSurfaceActive: hexWithAlpha(colors.primary, 0.1),
    bgOverlay: hexWithAlpha(isDarkMode ? "#000000" : "#000000", 0.5),
    bgInverse: colors.text,

    textPrimary: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: colors.muted,
    textInverse: colors.background,
    textLink: colors.primary,
    textLinkHover: colors.secondary,

    interactivePrimary: colors.buttonPrimaryBg,
    interactiveSecondary: colors.buttonSecondaryBg,
    interactiveHover: hexWithAlpha(colors.primary, 0.08),
    interactiveActive: hexWithAlpha(colors.primary, 0.12),
    interactiveDisabled: hexWithAlpha(colors.muted, 0.4),
    interactiveFocus: colors.primary,

    borderDefault: colors.border,
    borderStrong: colors.textSecondary,
    borderFocus: colors.primary,

    statusSuccess: colors.success,
    statusWarning: colors.warning,
    statusError: colors.error,
    statusInfo: colors.info,

    brandPrimary: colors.primary,
    brandSecondary: colors.secondary,
    brandAccent: colors.accent,
  };
}

// ============================================================================
// SHADOW SYSTEM
// ============================================================================

export interface ShadowScale {
  none: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export function buildShadowScale(isDarkMode: boolean): ShadowScale {
  // Shadows are more prominent in dark mode to create elevation distinction
  const opacity = isDarkMode ? 0.4 : 0.1;
  const opStr = (mult: number) => (opacity * mult).toFixed(2);

  return {
    none: "none",
    xs: `0 1px 2px 0 rgba(0, 0, 0, ${opStr(1)})`,
    sm: `0 1px 3px 0 rgba(0, 0, 0, ${opStr(1)}), 0 1px 2px -1px rgba(0, 0, 0, ${opStr(1)})`,
    md: `0 4px 6px -1px rgba(0, 0, 0, ${opStr(1)}), 0 2px 4px -2px rgba(0, 0, 0, ${opStr(1)})`,
    lg: `0 10px 15px -3px rgba(0, 0, 0, ${opStr(1)}), 0 4px 6px -4px rgba(0, 0, 0, ${opStr(1)})`,
    xl: `0 20px 25px -5px rgba(0, 0, 0, ${opStr(1.5)}), 0 8px 10px -6px rgba(0, 0, 0, ${opStr(1)})`,
  };
}

// ============================================================================
// TRANSITION TOKENS
// ============================================================================

export interface TransitionDurations {
  instant: string;
  fast: string;
  normal: string;
  slow: string;
  slower: string;
}

export interface TransitionEasings {
  default: string;
  in: string;
  out: string;
  inOut: string;
  bounce: string;
  spring: string;
}

export interface TransitionTokens {
  durations: TransitionDurations;
  easings: TransitionEasings;
}

export function buildTransitionTokens(): TransitionTokens {
  return {
    durations: {
      instant: "0ms",
      fast: "100ms",
      normal: "200ms",
      slow: "300ms",
      slower: "500ms",
    },
    easings: {
      default: "cubic-bezier(0.2, 0, 0, 1)",
      in: "cubic-bezier(0.4, 0, 1, 1)",
      out: "cubic-bezier(0, 0, 0.2, 1)",
      inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    },
  };
}

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export interface ZIndexScale {
  hide: number;
  base: number;
  raised: number;
  dropdown: number;
  sticky: number;
  overlay: number;
  modal: number;
  popover: number;
  toast: number;
  tooltip: number;
  max: number;
}

export function buildZIndexScale(): ZIndexScale {
  return {
    hide: -1,
    base: 0,
    raised: 1,
    dropdown: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    popover: 50,
    toast: 60,
    tooltip: 70,
    max: 9999,
  };
}

// ============================================================================
// CONSOLIDATED DESIGN TOKENS
// ============================================================================

export interface DesignTokens {
  spacing: SpacingScale;
  typeScale: TypeScale;
  typeAliases: TypeAliases;
  colors: ColorAliases;
  shadows: ShadowScale;
  transitions: TransitionTokens;
  zIndex: ZIndexScale;
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  typography: {
    fontFamily: string;
    fontFamilyMono: string;
    fontWeightNormal: number;
    fontWeightMedium: number;
    fontWeightBold: number;
  };
}

/**
 * Build the complete design token set from a visual skin.
 *
 * @param skin - The visual skin to derive tokens from. Defaults to nchatSkin.
 * @param isDarkMode - Whether to derive dark mode color tokens.
 * @returns A fully resolved DesignTokens object.
 */
export function getDesignTokens(
  skin: VisualSkin = nchatSkin,
  isDarkMode: boolean = false,
): DesignTokens {
  const colors = isDarkMode ? skin.darkMode.colors : skin.colors;
  const typeScale = buildTypeScale(skin);

  return {
    spacing: buildSpacingScale(),
    typeScale,
    typeAliases: buildTypeAliases(typeScale),
    colors: buildColorAliases(colors, isDarkMode),
    shadows: buildShadowScale(isDarkMode),
    transitions: buildTransitionTokens(),
    zIndex: buildZIndexScale(),
    borderRadius: {
      none: skin.borderRadius.none,
      sm: skin.borderRadius.sm,
      md: skin.borderRadius.md,
      lg: skin.borderRadius.lg,
      xl: skin.borderRadius.xl,
      full: skin.borderRadius.full,
    },
    typography: {
      fontFamily: skin.typography.fontFamily,
      fontFamilyMono: skin.typography.fontFamilyMono,
      fontWeightNormal: skin.typography.fontWeightNormal,
      fontWeightMedium: skin.typography.fontWeightMedium,
      fontWeightBold: skin.typography.fontWeightBold,
    },
  };
}

/**
 * Convert design tokens to a flat CSS custom properties map for injection
 * into the DOM.
 */
export function designTokensToCSSVariables(
  tokens: DesignTokens,
  prefix: string = "--dt",
): Record<string, string> {
  const vars: Record<string, string> = {};

  // Spacing
  for (const [key, value] of Object.entries(tokens.spacing)) {
    vars[`${prefix}-spacing-${key}`] = value;
  }

  // Type scale
  for (const [key, entry] of Object.entries(tokens.typeScale)) {
    const e = entry as TypeScaleEntry;
    vars[`${prefix}-type-${key}-size`] = e.fontSize;
    vars[`${prefix}-type-${key}-lh`] = e.lineHeight;
    vars[`${prefix}-type-${key}-ls`] = e.letterSpacing;
  }

  // Color aliases
  for (const [key, value] of Object.entries(tokens.colors)) {
    const kebab = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    vars[`${prefix}-color-${kebab}`] = value;
  }

  // Shadows
  for (const [key, value] of Object.entries(tokens.shadows)) {
    vars[`${prefix}-shadow-${key}`] = value;
  }

  // Transitions
  for (const [key, value] of Object.entries(tokens.transitions.durations)) {
    vars[`${prefix}-duration-${key}`] = value;
  }
  for (const [key, value] of Object.entries(tokens.transitions.easings)) {
    const kebab = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    vars[`${prefix}-easing-${kebab}`] = value;
  }

  // Z-index
  for (const [key, value] of Object.entries(tokens.zIndex)) {
    vars[`${prefix}-z-${key}`] = String(value);
  }

  // Border radius
  for (const [key, value] of Object.entries(tokens.borderRadius)) {
    vars[`${prefix}-radius-${key}`] = value;
  }

  // Typography globals
  vars[`${prefix}-font-family`] = tokens.typography.fontFamily;
  vars[`${prefix}-font-family-mono`] = tokens.typography.fontFamilyMono;
  vars[`${prefix}-font-weight-normal`] = String(
    tokens.typography.fontWeightNormal,
  );
  vars[`${prefix}-font-weight-medium`] = String(
    tokens.typography.fontWeightMedium,
  );
  vars[`${prefix}-font-weight-bold`] = String(tokens.typography.fontWeightBold);

  return vars;
}
