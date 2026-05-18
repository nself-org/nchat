/**
 * Responsive System
 *
 * Mobile-first breakpoints with skin-aware layout adaptations. The responsive
 * system works with CSS variables so that runtime skin switching automatically
 * updates layout without a page reload.
 *
 * Features:
 *   - Breakpoint definitions (xs through 2xl + semantic aliases)
 *   - Layout adaptation rules per breakpoint
 *   - Touch target size enforcement
 *   - Sidebar collapse thresholds
 *   - Compact message mode triggers
 *   - Container query support tokens
 *
 * @module lib/skins/responsive
 * @version 1.0.0
 */

import type { VisualSkin } from "./types";
import { nchatSkin } from "./visual-skins";

// ============================================================================
// BREAKPOINT DEFINITIONS
// ============================================================================

export interface Breakpoint {
  /** Name of the breakpoint */
  name: string;
  /** Minimum width in pixels */
  minWidth: number;
  /** CSS media query string */
  query: string;
}

export interface BreakpointScale {
  xs: Breakpoint;
  sm: Breakpoint;
  md: Breakpoint;
  lg: Breakpoint;
  xl: Breakpoint;
  "2xl": Breakpoint;
}

export function buildBreakpoints(): BreakpointScale {
  return {
    xs: { name: "xs", minWidth: 0, query: "(min-width: 0px)" },
    sm: { name: "sm", minWidth: 480, query: "(min-width: 480px)" },
    md: { name: "md", minWidth: 768, query: "(min-width: 768px)" },
    lg: { name: "lg", minWidth: 1024, query: "(min-width: 1024px)" },
    xl: { name: "xl", minWidth: 1280, query: "(min-width: 1280px)" },
    "2xl": { name: "2xl", minWidth: 1536, query: "(min-width: 1536px)" },
  };
}

/**
 * Ordered list of breakpoint names from smallest to largest.
 */
export const BREAKPOINT_ORDER = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;
export type BreakpointName = (typeof BREAKPOINT_ORDER)[number];

// ============================================================================
// SEMANTIC BREAKPOINT ALIASES
// ============================================================================

export interface SemanticBreakpoints {
  mobile: string;
  tablet: string;
  desktop: string;
  widescreen: string;
  /** Touch-capable device (uses hover: none) */
  touch: string;
  /** Pointer-capable device (uses hover: hover) */
  pointer: string;
  /** Portrait orientation */
  portrait: string;
  /** Landscape orientation */
  landscape: string;
  /** PWA standalone mode */
  standalone: string;
  /** Reduced motion preference */
  reducedMotion: string;
}

export function buildSemanticBreakpoints(): SemanticBreakpoints {
  return {
    mobile: "(max-width: 767px)",
    tablet: "(min-width: 768px) and (max-width: 1023px)",
    desktop: "(min-width: 1024px)",
    widescreen: "(min-width: 1536px)",
    touch: "(hover: none)",
    pointer: "(hover: hover)",
    portrait: "(orientation: portrait)",
    landscape: "(orientation: landscape)",
    standalone: "(display-mode: standalone)",
    reducedMotion: "(prefers-reduced-motion: reduce)",
  };
}

// ============================================================================
// TOUCH TARGETS
// ============================================================================

export interface TouchTargetSizes {
  /** Minimum tappable area per WCAG 2.5.8 (Level AAA = 44px, AA = 24px) */
  minimum: string;
  /** Comfortable touch target */
  comfortable: string;
  /** Large touch target for primary actions */
  large: string;
  /** Spacing between adjacent touch targets */
  spacing: string;
}

export function buildTouchTargets(): TouchTargetSizes {
  return {
    minimum: "44px",
    comfortable: "48px",
    large: "56px",
    spacing: "8px",
  };
}

// ============================================================================
// LAYOUT ADAPTATIONS
// ============================================================================

export interface LayoutAdaptation {
  /** Whether sidebar is visible */
  sidebarVisible: boolean;
  /** Sidebar display mode */
  sidebarMode: "hidden" | "overlay" | "compact" | "full";
  /** Sidebar width override (undefined = use skin default) */
  sidebarWidth?: string;
  /** Whether to use compact message layout */
  compactMessages: boolean;
  /** Number of columns for grid layouts */
  gridColumns: number;
  /** Whether to show the header search bar inline */
  inlineSearch: boolean;
  /** Whether modals appear as full-screen sheets */
  fullScreenModals: boolean;
  /** Composer mode */
  composerMode: "minimal" | "standard" | "expanded";
  /** Maximum content width */
  maxContentWidth?: string;
  /** Whether to use bottom navigation instead of sidebar */
  bottomNav: boolean;
}

/**
 * Compute layout adaptations for each breakpoint based on the active skin.
 */
export function buildLayoutAdaptations(
  skin: VisualSkin,
): Record<BreakpointName, LayoutAdaptation> {
  const skinSidebarWidth = skin.spacing.sidebarWidth;

  return {
    xs: {
      sidebarVisible: false,
      sidebarMode: "hidden",
      compactMessages: true,
      gridColumns: 1,
      inlineSearch: false,
      fullScreenModals: true,
      composerMode: "minimal",
      bottomNav: true,
    },
    sm: {
      sidebarVisible: false,
      sidebarMode: "overlay",
      compactMessages: true,
      gridColumns: 1,
      inlineSearch: false,
      fullScreenModals: true,
      composerMode: "minimal",
      bottomNav: true,
    },
    md: {
      sidebarVisible: true,
      sidebarMode: "compact",
      sidebarWidth: "72px",
      compactMessages: false,
      gridColumns: 2,
      inlineSearch: false,
      fullScreenModals: false,
      composerMode: "standard",
      bottomNav: false,
    },
    lg: {
      sidebarVisible: true,
      sidebarMode: "full",
      sidebarWidth: skinSidebarWidth,
      compactMessages: false,
      gridColumns: 3,
      inlineSearch: true,
      fullScreenModals: false,
      composerMode: "standard",
      bottomNav: false,
    },
    xl: {
      sidebarVisible: true,
      sidebarMode: "full",
      sidebarWidth: skinSidebarWidth,
      compactMessages: false,
      gridColumns: 4,
      inlineSearch: true,
      fullScreenModals: false,
      composerMode: "expanded",
      maxContentWidth: "1200px",
      bottomNav: false,
    },
    "2xl": {
      sidebarVisible: true,
      sidebarMode: "full",
      sidebarWidth: skinSidebarWidth,
      compactMessages: false,
      gridColumns: 4,
      inlineSearch: true,
      fullScreenModals: false,
      composerMode: "expanded",
      maxContentWidth: "1400px",
      bottomNav: false,
    },
  };
}

// ============================================================================
// CONTAINER QUERIES
// ============================================================================

export interface ContainerQueryTokens {
  /** Minimum width for a sidebar container to show full labels */
  sidebarExpanded: string;
  /** Minimum width for a message container to show inline reactions */
  messageInlineReactions: string;
  /** Minimum width for a header to show all actions inline */
  headerActionsInline: string;
  /** Minimum width for a composer to show the toolbar */
  composerToolbar: string;
}

export function buildContainerQueries(): ContainerQueryTokens {
  return {
    sidebarExpanded: "200px",
    messageInlineReactions: "400px",
    headerActionsInline: "600px",
    composerToolbar: "500px",
  };
}

// ============================================================================
// SAFE AREA INSETS
// ============================================================================

export interface SafeAreaTokens {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export function buildSafeAreaTokens(): SafeAreaTokens {
  return {
    top: "env(safe-area-inset-top, 0px)",
    right: "env(safe-area-inset-right, 0px)",
    bottom: "env(safe-area-inset-bottom, 0px)",
    left: "env(safe-area-inset-left, 0px)",
  };
}

// ============================================================================
// CONSOLIDATED RESPONSIVE CONFIG
// ============================================================================

export interface ResponsiveConfig {
  breakpoints: BreakpointScale;
  semanticBreakpoints: SemanticBreakpoints;
  touchTargets: TouchTargetSizes;
  layouts: Record<BreakpointName, LayoutAdaptation>;
  containerQueries: ContainerQueryTokens;
  safeArea: SafeAreaTokens;
}

/**
 * Build the complete responsive configuration from a visual skin.
 *
 * @param skin - The visual skin to derive layout adaptations from.
 * @returns A fully resolved ResponsiveConfig object.
 */
export function getResponsiveConfig(
  skin: VisualSkin = nchatSkin,
): ResponsiveConfig {
  return {
    breakpoints: buildBreakpoints(),
    semanticBreakpoints: buildSemanticBreakpoints(),
    touchTargets: buildTouchTargets(),
    layouts: buildLayoutAdaptations(skin),
    containerQueries: buildContainerQueries(),
    safeArea: buildSafeAreaTokens(),
  };
}

/**
 * Convert responsive config to CSS custom properties.
 */
export function responsiveConfigToCSSVariables(
  config: ResponsiveConfig,
  prefix: string = "--resp",
): Record<string, string> {
  const vars: Record<string, string> = {};

  // Breakpoints
  for (const [key, bp] of Object.entries(config.breakpoints)) {
    vars[`${prefix}-bp-${key}`] = `${bp.minWidth}px`;
  }

  // Touch targets
  vars[`${prefix}-touch-min`] = config.touchTargets.minimum;
  vars[`${prefix}-touch-comfortable`] = config.touchTargets.comfortable;
  vars[`${prefix}-touch-large`] = config.touchTargets.large;
  vars[`${prefix}-touch-spacing`] = config.touchTargets.spacing;

  // Safe area
  vars[`${prefix}-safe-top`] = config.safeArea.top;
  vars[`${prefix}-safe-right`] = config.safeArea.right;
  vars[`${prefix}-safe-bottom`] = config.safeArea.bottom;
  vars[`${prefix}-safe-left`] = config.safeArea.left;

  return vars;
}
