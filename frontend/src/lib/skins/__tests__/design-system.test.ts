/**
 * Comprehensive Design System Tests
 *
 * Covers all design token categories, responsive system, motion system,
 * accessibility tokens, and component token mapping.
 *
 * Categories:
 *   1. Design Tokens (spacing, type scale, colors, shadows, transitions, z-index)
 *   2. Responsive (breakpoints, layout adaptations, touch targets)
 *   3. Motion (animations, reduced-motion, keyframes, stagger, springs)
 *   4. Accessibility (contrast ratios, focus rings, touch targets, SR utilities)
 *   5. Component Tokens (all 11 components)
 *   6. Integration (skin derivation, dark mode consistency)
 *   7. Edge Cases (invalid input, missing overrides)
 *
 * @module lib/skins/__tests__/design-system.test
 */

import {
  // Design Tokens
  getDesignTokens,
  buildSpacingScale,
  buildTypeScale,
  buildTypeAliases,
  buildColorAliases,
  buildShadowScale,
  buildTransitionTokens,
  buildZIndexScale,
  designTokensToCSSVariables,
  type DesignTokens,
  type SpacingScale,
  type TypeScale,
} from "../design-tokens";

import {
  // Responsive
  getResponsiveConfig,
  buildBreakpoints,
  buildSemanticBreakpoints,
  buildTouchTargets,
  buildLayoutAdaptations,
  buildContainerQueries,
  buildSafeAreaTokens,
  responsiveConfigToCSSVariables,
  BREAKPOINT_ORDER,
  type ResponsiveConfig,
} from "../responsive";

import {
  // Motion
  getMotionTokens,
  buildAnimationCatalog,
  getKeyframeDefinitions,
  buildStaggerConfig,
  getStaggerDelay,
  buildSpringPresets,
  resolveAnimation,
  type MotionTokens,
} from "../motion";

import {
  // Accessibility
  getAccessibilityTokens,
  parseHexColor,
  relativeLuminance,
  contrastRatio,
  meetsContrastRequirement,
  buildFocusRingTokens,
  buildHighContrastOverrides,
  buildTouchTargetTokens,
  getScreenReaderOnlyStyle,
  getScreenReaderFocusableStyle,
  buildKeyboardNavigationTokens,
  type AccessibilityTokens,
} from "../accessibility";

import {
  // Component Tokens
  getComponentTokens,
  componentTokensToCSSVariables,
  COMPONENT_NAMES,
  type ComponentTokens,
} from "../component-tokens";

import {
  nchatSkin,
  whatsappSkin,
  discordSkin,
  slackSkin,
  telegramSkin,
  signalSkin,
  visualSkins,
} from "../visual-skins";

import type { VisualSkin } from "../types";

// ============================================================================
// HELPERS
// ============================================================================

const ALL_SKIN_IDS = [
  "nchat",
  "whatsapp",
  "telegram",
  "discord",
  "slack",
  "signal",
];

function isValidCSSLength(value: string): boolean {
  return (
    /^-?\d+(\.\d+)?(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|svh|dvh|lvh)$/.test(
      value,
    ) ||
    value === "0" ||
    value === "auto" ||
    value === "none" ||
    value === "normal" ||
    /^env\(/.test(value) ||
    /^calc\(/.test(value) ||
    /^var\(/.test(value) ||
    /^0px$/.test(value)
  );
}

function isValidCSSColor(value: string): boolean {
  return (
    /^#[0-9a-fA-F]{3,8}$/.test(value) ||
    /^rgb/.test(value) ||
    /^hsl/.test(value) ||
    /^transparent$/.test(value) ||
    /^var\(/.test(value)
  );
}

// ============================================================================
// 1. DESIGN TOKENS
// ============================================================================

describe("Design Tokens", () => {
  let tokens: DesignTokens;

  beforeEach(() => {
    tokens = getDesignTokens(nchatSkin, false);
  });

  describe("Spacing Scale", () => {
    test("spacing scale has all expected stops", () => {
      const spacing = buildSpacingScale();
      const expectedKeys = [
        "0",
        "px",
        "0.5",
        "1",
        "1.5",
        "2",
        "2.5",
        "3",
        "4",
        "5",
        "6",
        "8",
        "10",
        "12",
        "16",
        "20",
        "24",
        "32",
        "40",
        "48",
        "56",
        "64",
      ];
      for (const key of expectedKeys) {
        expect(spacing[key as keyof SpacingScale]).toBeDefined();
      }
    });

    test("spacing values are valid CSS lengths", () => {
      const spacing = buildSpacingScale();
      for (const value of Object.values(spacing)) {
        expect(isValidCSSLength(value)).toBe(true);
      }
    });

    test("spacing scale is monotonically increasing", () => {
      const spacing = buildSpacingScale();
      const numericKeys = [
        "0",
        "0.5",
        "1",
        "1.5",
        "2",
        "2.5",
        "3",
        "4",
        "5",
        "6",
        "8",
        "10",
        "12",
        "16",
        "20",
        "24",
        "32",
        "40",
        "48",
        "56",
        "64",
      ];
      for (let i = 1; i < numericKeys.length; i++) {
        const prev = parseFloat(
          spacing[numericKeys[i - 1] as keyof SpacingScale],
        );
        const curr = parseFloat(spacing[numericKeys[i] as keyof SpacingScale]);
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    test('spacing "0" is 0px', () => {
      expect(tokens.spacing["0"]).toBe("0px");
    });

    test('spacing "px" is 1px', () => {
      expect(tokens.spacing.px).toBe("1px");
    });
  });

  describe("Type Scale", () => {
    test("type scale has all expected sizes", () => {
      const expectedSizes = [
        "xs",
        "sm",
        "base",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
      ];
      for (const size of expectedSizes) {
        expect(tokens.typeScale[size as keyof TypeScale]).toBeDefined();
      }
    });

    test("each type scale entry has fontSize, lineHeight, and letterSpacing", () => {
      for (const entry of Object.values(tokens.typeScale)) {
        expect(entry.fontSize).toBeTruthy();
        expect(entry.lineHeight).toBeTruthy();
        expect(entry.letterSpacing).toBeTruthy();
      }
    });

    test("type scale font sizes increase monotonically", () => {
      const sizes = [
        "xs",
        "sm",
        "base",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
      ] as const;
      for (let i = 1; i < sizes.length; i++) {
        const prev = parseFloat(tokens.typeScale[sizes[i - 1]].fontSize);
        const curr = parseFloat(tokens.typeScale[sizes[i]].fontSize);
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    test("type aliases map to existing scale entries", () => {
      expect(tokens.typeAliases.body).toEqual(tokens.typeScale.base);
      expect(tokens.typeAliases.caption).toEqual(tokens.typeScale.xs);
      expect(tokens.typeAliases.headingMd).toEqual(tokens.typeScale.xl);
    });

    test("type scale is derived from skin typography", () => {
      const scale = buildTypeScale(nchatSkin);
      expect(scale.base.fontSize).toBe(nchatSkin.typography.fontSizeBase);
      expect(scale.sm.fontSize).toBe(nchatSkin.typography.fontSizeSm);
    });
  });

  describe("Color Aliases", () => {
    test("color aliases include all semantic categories", () => {
      const categories = [
        "bgApp",
        "bgSurface",
        "textPrimary",
        "textSecondary",
        "interactivePrimary",
        "borderDefault",
        "statusSuccess",
        "statusError",
        "brandPrimary",
      ];
      for (const cat of categories) {
        expect(tokens.colors[cat as keyof typeof tokens.colors]).toBeTruthy();
      }
    });

    test("bgApp derives from skin background color", () => {
      expect(tokens.colors.bgApp).toBe(nchatSkin.colors.background);
    });

    test("textPrimary derives from skin text color", () => {
      expect(tokens.colors.textPrimary).toBe(nchatSkin.colors.text);
    });

    test("brandPrimary derives from skin primary color", () => {
      expect(tokens.colors.brandPrimary).toBe(nchatSkin.colors.primary);
    });

    test("dark mode color aliases differ from light mode", () => {
      const lightTokens = getDesignTokens(nchatSkin, false);
      const darkTokens = getDesignTokens(nchatSkin, true);
      expect(lightTokens.colors.bgApp).not.toBe(darkTokens.colors.bgApp);
      expect(lightTokens.colors.textPrimary).not.toBe(
        darkTokens.colors.textPrimary,
      );
    });
  });

  describe("Shadow Scale", () => {
    test("shadow scale has all levels", () => {
      const levels = ["none", "xs", "sm", "md", "lg", "xl"] as const;
      for (const level of levels) {
        expect(tokens.shadows[level]).toBeDefined();
      }
    });

    test('shadow "none" is "none"', () => {
      expect(tokens.shadows.none).toBe("none");
    });

    test("non-none shadows contain rgba", () => {
      const levels = ["xs", "sm", "md", "lg", "xl"] as const;
      for (const level of levels) {
        expect(tokens.shadows[level]).toContain("rgba");
      }
    });

    test("dark mode shadows have higher opacity", () => {
      const lightShadows = buildShadowScale(false);
      const darkShadows = buildShadowScale(true);
      // Extract first opacity from xs shadow
      const lightOpacity = lightShadows.xs.match(/rgba\(0, 0, 0, ([\d.]+)\)/);
      const darkOpacity = darkShadows.xs.match(/rgba\(0, 0, 0, ([\d.]+)\)/);
      expect(parseFloat(darkOpacity![1])).toBeGreaterThan(
        parseFloat(lightOpacity![1]),
      );
    });
  });

  describe("Transition Tokens", () => {
    test("transition tokens have all durations", () => {
      const durations = [
        "instant",
        "fast",
        "normal",
        "slow",
        "slower",
      ] as const;
      for (const d of durations) {
        expect(tokens.transitions.durations[d]).toBeDefined();
        expect(tokens.transitions.durations[d]).toMatch(/^\d+ms$/);
      }
    });

    test("durations increase monotonically", () => {
      const order = ["instant", "fast", "normal", "slow", "slower"] as const;
      for (let i = 1; i < order.length; i++) {
        const prev = parseFloat(tokens.transitions.durations[order[i - 1]]);
        const curr = parseFloat(tokens.transitions.durations[order[i]]);
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    test("easings are valid cubic-bezier values", () => {
      for (const easing of Object.values(tokens.transitions.easings)) {
        expect(easing).toMatch(/^cubic-bezier\(/);
      }
    });

    test("instant duration is 0ms", () => {
      expect(tokens.transitions.durations.instant).toBe("0ms");
    });
  });

  describe("Z-Index Scale", () => {
    test("z-index scale has all expected layers", () => {
      const layers = [
        "hide",
        "base",
        "raised",
        "dropdown",
        "sticky",
        "overlay",
        "modal",
        "popover",
        "toast",
        "tooltip",
        "max",
      ];
      for (const layer of layers) {
        expect(typeof tokens.zIndex[layer as keyof typeof tokens.zIndex]).toBe(
          "number",
        );
      }
    });

    test("z-index layers are ordered correctly", () => {
      expect(tokens.zIndex.hide).toBeLessThan(tokens.zIndex.base);
      expect(tokens.zIndex.base).toBeLessThan(tokens.zIndex.dropdown);
      expect(tokens.zIndex.dropdown).toBeLessThan(tokens.zIndex.sticky);
      expect(tokens.zIndex.sticky).toBeLessThan(tokens.zIndex.overlay);
      expect(tokens.zIndex.overlay).toBeLessThan(tokens.zIndex.modal);
      expect(tokens.zIndex.modal).toBeLessThan(tokens.zIndex.popover);
      expect(tokens.zIndex.popover).toBeLessThan(tokens.zIndex.toast);
      expect(tokens.zIndex.toast).toBeLessThan(tokens.zIndex.tooltip);
    });

    test("max z-index is 9999", () => {
      expect(tokens.zIndex.max).toBe(9999);
    });
  });

  describe("Border Radius", () => {
    test("border radius values come from the skin", () => {
      expect(tokens.borderRadius.none).toBe(nchatSkin.borderRadius.none);
      expect(tokens.borderRadius.sm).toBe(nchatSkin.borderRadius.sm);
      expect(tokens.borderRadius.md).toBe(nchatSkin.borderRadius.md);
      expect(tokens.borderRadius.lg).toBe(nchatSkin.borderRadius.lg);
      expect(tokens.borderRadius.full).toBe(nchatSkin.borderRadius.full);
    });
  });

  describe("CSS Variable Export", () => {
    test("designTokensToCSSVariables produces a non-empty map", () => {
      const vars = designTokensToCSSVariables(tokens);
      expect(Object.keys(vars).length).toBeGreaterThan(50);
    });

    test("CSS variables use the correct prefix", () => {
      const vars = designTokensToCSSVariables(tokens, "--my");
      for (const key of Object.keys(vars)) {
        expect(key.startsWith("--my-")).toBe(true);
      }
    });

    test("spacing CSS variables are present", () => {
      const vars = designTokensToCSSVariables(tokens);
      expect(vars["--dt-spacing-4"]).toBe("16px");
    });

    test("color CSS variables are present", () => {
      const vars = designTokensToCSSVariables(tokens);
      expect(vars["--dt-color-bg-app"]).toBe(nchatSkin.colors.background);
    });
  });
});

// ============================================================================
// 2. RESPONSIVE
// ============================================================================

describe("Responsive System", () => {
  let config: ResponsiveConfig;

  beforeEach(() => {
    config = getResponsiveConfig(nchatSkin);
  });

  describe("Breakpoints", () => {
    test("breakpoints are ordered by minWidth", () => {
      const bps = config.breakpoints;
      const values = BREAKPOINT_ORDER.map((name) => bps[name].minWidth);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });

    test("all breakpoints have valid media query strings", () => {
      for (const bp of Object.values(config.breakpoints)) {
        expect(bp.query).toMatch(/^\(min-width: \d+px\)$/);
      }
    });

    test("xs starts at 0", () => {
      expect(config.breakpoints.xs.minWidth).toBe(0);
    });

    test("lg starts at 1024 (desktop threshold)", () => {
      expect(config.breakpoints.lg.minWidth).toBe(1024);
    });
  });

  describe("Semantic Breakpoints", () => {
    test("mobile query targets max-width below md", () => {
      expect(config.semanticBreakpoints.mobile).toContain("max-width");
    });

    test("desktop query targets min-width at lg", () => {
      expect(config.semanticBreakpoints.desktop).toContain("min-width: 1024px");
    });

    test("touch query uses hover: none", () => {
      expect(config.semanticBreakpoints.touch).toBe("(hover: none)");
    });

    test("reducedMotion query is defined", () => {
      expect(config.semanticBreakpoints.reducedMotion).toContain(
        "prefers-reduced-motion",
      );
    });
  });

  describe("Touch Targets", () => {
    test("minimum touch target is at least 44px", () => {
      expect(parseFloat(config.touchTargets.minimum)).toBeGreaterThanOrEqual(
        44,
      );
    });

    test("comfortable touch target is at least 44px", () => {
      expect(
        parseFloat(config.touchTargets.comfortable),
      ).toBeGreaterThanOrEqual(44);
    });

    test("large touch target is at least 48px", () => {
      expect(parseFloat(config.touchTargets.large)).toBeGreaterThanOrEqual(48);
    });

    test("touch spacing is positive", () => {
      expect(parseFloat(config.touchTargets.spacing)).toBeGreaterThan(0);
    });
  });

  describe("Layout Adaptations", () => {
    test("xs layout hides sidebar and uses bottom nav", () => {
      const xs = config.layouts.xs;
      expect(xs.sidebarVisible).toBe(false);
      expect(xs.sidebarMode).toBe("hidden");
      expect(xs.bottomNav).toBe(true);
    });

    test("sm layout uses overlay sidebar", () => {
      expect(config.layouts.sm.sidebarMode).toBe("overlay");
    });

    test("md layout shows compact sidebar", () => {
      expect(config.layouts.md.sidebarVisible).toBe(true);
      expect(config.layouts.md.sidebarMode).toBe("compact");
    });

    test("lg layout shows full sidebar with skin width", () => {
      expect(config.layouts.lg.sidebarVisible).toBe(true);
      expect(config.layouts.lg.sidebarMode).toBe("full");
      expect(config.layouts.lg.sidebarWidth).toBe(
        nchatSkin.spacing.sidebarWidth,
      );
    });

    test("xs and sm use compact messages", () => {
      expect(config.layouts.xs.compactMessages).toBe(true);
      expect(config.layouts.sm.compactMessages).toBe(true);
    });

    test("lg and above do not use compact messages", () => {
      expect(config.layouts.lg.compactMessages).toBe(false);
      expect(config.layouts.xl.compactMessages).toBe(false);
    });

    test("xs/sm use full-screen modals, lg does not", () => {
      expect(config.layouts.xs.fullScreenModals).toBe(true);
      expect(config.layouts.lg.fullScreenModals).toBe(false);
    });

    test("grid columns increase with breakpoint", () => {
      expect(config.layouts.xs.gridColumns).toBeLessThan(
        config.layouts.lg.gridColumns,
      );
    });

    test("xl and 2xl have maxContentWidth", () => {
      expect(config.layouts.xl.maxContentWidth).toBeDefined();
      expect(config.layouts["2xl"].maxContentWidth).toBeDefined();
    });

    test("different skin produces different sidebar width", () => {
      const discordConfig = getResponsiveConfig(discordSkin);
      const slackConfig = getResponsiveConfig(slackSkin);
      // Discord sidebar (240px) differs from Slack (260px)
      expect(discordConfig.layouts.lg.sidebarWidth).toBe(
        discordSkin.spacing.sidebarWidth,
      );
      expect(slackConfig.layouts.lg.sidebarWidth).toBe(
        slackSkin.spacing.sidebarWidth,
      );
    });
  });

  describe("Container Queries", () => {
    test("all container query tokens are valid CSS lengths", () => {
      const cq = config.containerQueries;
      expect(parseFloat(cq.sidebarExpanded)).toBeGreaterThan(0);
      expect(parseFloat(cq.messageInlineReactions)).toBeGreaterThan(0);
    });
  });

  describe("Safe Area", () => {
    test("safe area tokens use env() function", () => {
      for (const value of Object.values(config.safeArea)) {
        expect(value).toContain("env(safe-area-inset");
      }
    });
  });

  describe("CSS Variable Export", () => {
    test("responsive CSS variables are non-empty", () => {
      const vars = responsiveConfigToCSSVariables(config);
      expect(Object.keys(vars).length).toBeGreaterThan(10);
    });
  });
});

// ============================================================================
// 3. MOTION
// ============================================================================

describe("Motion System", () => {
  let motion: MotionTokens;

  beforeEach(() => {
    motion = getMotionTokens();
  });

  describe("Animation Catalog", () => {
    test("all named animations are present", () => {
      const names = [
        "fadeIn",
        "fadeOut",
        "slideUp",
        "slideDown",
        "slideLeft",
        "slideRight",
        "scaleIn",
        "scaleOut",
        "collapseDown",
        "collapseUp",
        "spin",
        "pulse",
        "bounce",
        "shake",
      ];
      for (const name of names) {
        const anim = motion.animations[name as keyof typeof motion.animations];
        expect(anim).toBeDefined();
        expect(anim.full).toBeDefined();
        expect(anim.reduced).toBeDefined();
      }
    });

    test("each animation has a valid value shorthand", () => {
      for (const anim of Object.values(motion.animations)) {
        expect(anim.full.value).toContain(anim.full.keyframes);
        expect(anim.full.value).toContain(anim.full.duration);
      }
    });

    test("reduced-motion alternatives use shorter durations or fade-only", () => {
      // slideUp reduced should use fade, not slide
      const slideUp = motion.animations.slideUp;
      expect(slideUp.reduced.keyframes).toBe("dt-fade-in");
      expect(parseFloat(slideUp.reduced.duration)).toBeLessThanOrEqual(
        parseFloat(slideUp.full.duration),
      );
    });

    test("resolveAnimation returns full when prefersReducedMotion is false", () => {
      const result = resolveAnimation(motion.animations.fadeIn, false);
      expect(result).toBe(motion.animations.fadeIn.full);
    });

    test("resolveAnimation returns reduced when prefersReducedMotion is true", () => {
      const result = resolveAnimation(motion.animations.fadeIn, true);
      expect(result).toBe(motion.animations.fadeIn.reduced);
    });
  });

  describe("Keyframe Definitions", () => {
    test("keyframe definitions are non-empty", () => {
      expect(motion.keyframes.length).toBeGreaterThan(10);
    });

    test("each keyframe has a name and frames", () => {
      for (const kf of motion.keyframes) {
        expect(kf.name).toBeTruthy();
        expect(Object.keys(kf.frames).length).toBeGreaterThan(0);
      }
    });

    test("fade-in keyframe goes from opacity 0 to 1", () => {
      const fadeIn = motion.keyframes.find((k) => k.name === "dt-fade-in")!;
      expect(fadeIn.frames.from.opacity).toBe("0");
      expect(fadeIn.frames.to.opacity).toBe("1");
    });
  });

  describe("Stagger", () => {
    test("stagger config has positive delay", () => {
      expect(parseFloat(motion.stagger.delay)).toBeGreaterThan(0);
    });

    test("getStaggerDelay returns 0ms for index 0", () => {
      expect(getStaggerDelay(0)).toBe("0ms");
    });

    test("getStaggerDelay increases with index", () => {
      const d1 = parseFloat(getStaggerDelay(1));
      const d3 = parseFloat(getStaggerDelay(3));
      expect(d3).toBeGreaterThan(d1);
    });

    test("getStaggerDelay caps at maxDelay", () => {
      const config = buildStaggerConfig();
      const maxDelay = parseFloat(config.maxDelay);
      const result = parseFloat(getStaggerDelay(1000, config));
      expect(result).toBeLessThanOrEqual(maxDelay);
    });
  });

  describe("Spring Presets", () => {
    test("all spring presets are defined", () => {
      const names = ["gentle", "snappy", "bouncy", "stiff"] as const;
      for (const name of names) {
        const spring = motion.springs[name];
        expect(spring.stiffness).toBeGreaterThan(0);
        expect(spring.damping).toBeGreaterThan(0);
        expect(spring.mass).toBeGreaterThan(0);
        expect(spring.cssApproximation).toContain("cubic-bezier");
      }
    });
  });
});

// ============================================================================
// 4. ACCESSIBILITY
// ============================================================================

describe("Accessibility", () => {
  let a11y: AccessibilityTokens;

  beforeEach(() => {
    a11y = getAccessibilityTokens(nchatSkin, false);
  });

  describe("Contrast Computation", () => {
    test("parseHexColor parses 6-digit hex", () => {
      const color = parseHexColor("#FF8800");
      expect(color).toEqual({ r: 255, g: 136, b: 0 });
    });

    test("parseHexColor parses 3-digit hex", () => {
      const color = parseHexColor("#F80");
      expect(color).toEqual({ r: 255, g: 136, b: 0 });
    });

    test("parseHexColor returns null for invalid input", () => {
      expect(parseHexColor("invalid")).toBeNull();
      expect(parseHexColor("#GG0000")).toBeNull();
    });

    test("parseHexColor handles 8-digit hex (with alpha)", () => {
      const color = parseHexColor("#FF8800FF");
      expect(color).toEqual({ r: 255, g: 136, b: 0 });
    });

    test("relativeLuminance of white is approximately 1", () => {
      expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 1);
    });

    test("relativeLuminance of black is approximately 0", () => {
      expect(relativeLuminance("#000000")).toBeCloseTo(0, 1);
    });

    test("contrastRatio of white on black is 21", () => {
      expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
    });

    test("contrastRatio is symmetric", () => {
      const r1 = contrastRatio("#FF0000", "#0000FF");
      const r2 = contrastRatio("#0000FF", "#FF0000");
      expect(r1).toBeCloseTo(r2, 5);
    });

    test("meetsContrastRequirement returns true for high contrast pair", () => {
      expect(meetsContrastRequirement("#000000", "#FFFFFF", "AA")).toBe(true);
      expect(meetsContrastRequirement("#000000", "#FFFFFF", "AAA")).toBe(true);
    });

    test("meetsContrastRequirement is stricter for AAA", () => {
      // A medium contrast pair that passes AA but not AAA
      // Gray on white: ~4.6:1 contrast
      expect(meetsContrastRequirement("#767676", "#FFFFFF", "AA")).toBe(true);
      expect(meetsContrastRequirement("#767676", "#FFFFFF", "AAA")).toBe(false);
    });

    test("large text has a lower threshold", () => {
      // A pair that fails AA normal text (< 4.5:1) but passes AA large text (>= 3:1)
      // #808080 on white has a contrast ratio of approximately 3.95:1
      expect(meetsContrastRequirement("#808080", "#FFFFFF", "AA", false)).toBe(
        false,
      );
      expect(meetsContrastRequirement("#808080", "#FFFFFF", "AA", true)).toBe(
        true,
      );
    });
  });

  describe("Contrast Ratios in nChat Skin", () => {
    test("text on background meets WCAG AA", () => {
      expect(a11y.contrastRatios.textOnBackground).toBeGreaterThanOrEqual(4.5);
    });

    test("text on surface meets WCAG AA", () => {
      expect(a11y.contrastRatios.textOnSurface).toBeGreaterThanOrEqual(4.5);
    });

    test("button primary text on bg meets WCAG AA", () => {
      expect(a11y.contrastRatios.buttonPrimaryTextOnBg).toBeGreaterThanOrEqual(
        4.5,
      );
    });

    test("dark mode text on background meets WCAG AA", () => {
      const darkA11y = getAccessibilityTokens(nchatSkin, true);
      expect(darkA11y.contrastRatios.textOnBackground).toBeGreaterThanOrEqual(
        4.5,
      );
    });
  });

  describe("Focus Rings", () => {
    test("default focus ring has all required properties", () => {
      const ring = a11y.focusRings.default;
      expect(ring.width).toBeTruthy();
      expect(ring.offset).toBeTruthy();
      expect(ring.color).toBeTruthy();
      expect(ring.outline).toBeTruthy();
      expect(ring.boxShadow).toBeTruthy();
    });

    test("error focus ring uses error color", () => {
      expect(a11y.focusRings.error.color).toBe(nchatSkin.colors.error);
    });

    test("high contrast focus ring is wider", () => {
      expect(parseFloat(a11y.focusRings.highContrast.width)).toBeGreaterThan(
        parseFloat(a11y.focusRings.default.width),
      );
    });

    test("inset focus ring has negative offset", () => {
      expect(parseFloat(a11y.focusRings.inset.offset)).toBeLessThan(0);
    });
  });

  describe("High Contrast Overrides", () => {
    test("light mode high contrast uses white bg and black text", () => {
      const hc = a11y.highContrast;
      expect(hc.background).toBe("#FFFFFF");
      expect(hc.text).toBe("#000000");
    });

    test("dark mode high contrast uses black bg and white text", () => {
      const darkA11y = getAccessibilityTokens(nchatSkin, true);
      expect(darkA11y.highContrast.background).toBe("#000000");
      expect(darkA11y.highContrast.text).toBe("#FFFFFF");
    });

    test("high contrast forces underline on links", () => {
      expect(a11y.highContrast.underlineLinks).toBe(true);
    });
  });

  describe("Touch Targets", () => {
    test("minimum size is 44px (WCAG 2.5.8)", () => {
      expect(a11y.touchTargets.minimumSize).toBe("44px");
    });

    test("enhanced size is at least 48px", () => {
      expect(parseFloat(a11y.touchTargets.enhancedSize)).toBeGreaterThanOrEqual(
        48,
      );
    });

    test("minimum gap is positive", () => {
      expect(parseFloat(a11y.touchTargets.minimumGap)).toBeGreaterThan(0);
    });
  });

  describe("Screen Reader Utilities", () => {
    test("screen reader only style has position absolute", () => {
      expect(a11y.screenReaderOnly.position).toBe("absolute");
    });

    test("screen reader only style has 1px dimensions", () => {
      expect(a11y.screenReaderOnly.width).toBe("1px");
      expect(a11y.screenReaderOnly.height).toBe("1px");
    });

    test("screen reader only style clips content", () => {
      expect(a11y.screenReaderOnly.clip).toContain("rect");
    });

    test("screen reader focusable style restores visibility", () => {
      expect(a11y.screenReaderFocusable.position).toBe("static");
      expect(a11y.screenReaderFocusable.width).toBe("auto");
    });
  });

  describe("Keyboard Navigation", () => {
    test("skip link has high z-index", () => {
      expect(a11y.keyboardNav.skipLink.zIndex).toBeGreaterThanOrEqual(9999);
    });

    test("focus trap indicator uses skin primary color", () => {
      expect(a11y.keyboardNav.focusTrapIndicator.borderColor).toBe(
        nchatSkin.colors.primary,
      );
    });
  });
});

// ============================================================================
// 5. COMPONENT TOKENS
// ============================================================================

describe("Component Tokens", () => {
  let components: ComponentTokens;

  beforeEach(() => {
    components = getComponentTokens(nchatSkin, false);
  });

  test("all 11 required components have tokens", () => {
    for (const name of COMPONENT_NAMES) {
      expect(components[name]).toBeDefined();
    }
  });

  describe("Message Bubble", () => {
    test("layout matches skin component style", () => {
      expect(components.messageBubble.layout).toBe(
        nchatSkin.components.messageLayout,
      );
    });

    test("padding derives from skin spacing", () => {
      expect(components.messageBubble.padding).toBe(
        nchatSkin.spacing.messagePadding,
      );
    });

    test("timestamp uses small font size", () => {
      expect(
        parseFloat(components.messageBubble.timestampFontSize),
      ).toBeLessThan(parseFloat(nchatSkin.typography.fontSizeBase));
    });

    test("bubble layout uses different styling for own vs other messages", () => {
      const waComponents = getComponentTokens(whatsappSkin, false);
      expect(waComponents.messageBubble.layout).toBe("bubbles");
      // Own and other bg should differ
      expect(waComponents.messageBubble.ownBg).not.toBe(
        waComponents.messageBubble.otherBg,
      );
    });

    test("code font family uses mono font from skin", () => {
      expect(components.messageBubble.codeFontFamily).toBe(
        nchatSkin.typography.fontFamilyMono,
      );
    });
  });

  describe("Sidebar", () => {
    test("width derives from skin spacing", () => {
      expect(components.sidebar.width).toBe(nchatSkin.spacing.sidebarWidth);
    });

    test("active item uses primary color", () => {
      expect(components.sidebar.activeItemText).toBe(nchatSkin.colors.primary);
    });

    test("unread indicator uses primary color", () => {
      expect(components.sidebar.unreadIndicatorBg).toBe(
        nchatSkin.colors.primary,
      );
    });
  });

  describe("Header", () => {
    test("height derives from skin spacing", () => {
      expect(components.header.height).toBe(nchatSkin.spacing.headerHeight);
    });

    test("style matches skin component style", () => {
      expect(components.header.style).toBe(nchatSkin.components.headerStyle);
    });
  });

  describe("Composer", () => {
    test("send button uses primary color", () => {
      expect(components.composer.sendButtonBg).toBe(nchatSkin.colors.primary);
    });

    test("min height derives from skin input height", () => {
      expect(components.composer.minHeight).toBe(nchatSkin.spacing.inputHeight);
    });
  });

  describe("Modal", () => {
    test("overlay uses semi-transparent black", () => {
      expect(components.modal.overlayBg).toContain("#000000");
    });

    test("border radius uses xl from skin", () => {
      expect(components.modal.borderRadius).toBe(nchatSkin.borderRadius.xl);
    });
  });

  describe("Tooltip", () => {
    test("background is text color (inverted)", () => {
      expect(components.tooltip.background).toBe(nchatSkin.colors.text);
    });

    test("text is background color (inverted)", () => {
      expect(components.tooltip.text).toBe(nchatSkin.colors.background);
    });
  });

  describe("Dropdown", () => {
    test("min width is reasonable", () => {
      expect(parseFloat(components.dropdown.minWidth)).toBeGreaterThanOrEqual(
        100,
      );
    });

    test("shadow is substantial (lg)", () => {
      expect(components.dropdown.shadow).toContain("rgba");
    });
  });

  describe("Avatar", () => {
    test("shape matches skin component style", () => {
      expect(components.avatar.shape).toBe(nchatSkin.components.avatarShape);
    });

    test("circle avatars have full border radius", () => {
      expect(components.avatar.borderRadius).toBe(nchatSkin.borderRadius.full);
    });

    test("discord uses rounded avatars", () => {
      const discordComponents = getComponentTokens(discordSkin, false);
      expect(discordComponents.avatar.shape).toBe("rounded");
      expect(discordComponents.avatar.borderRadius).toBe(
        discordSkin.borderRadius.md,
      );
    });

    test("status colors map to semantic colors", () => {
      expect(components.avatar.statusOnline).toBe(nchatSkin.colors.success);
      expect(components.avatar.statusDnd).toBe(nchatSkin.colors.error);
    });
  });

  describe("Badge", () => {
    test("primary badge uses primary color", () => {
      expect(components.badge.primaryBg).toBe(nchatSkin.colors.primary);
    });

    test("border radius is full (pill shape)", () => {
      expect(components.badge.borderRadius).toBe(nchatSkin.borderRadius.full);
    });
  });

  describe("Button", () => {
    test("style matches skin component style", () => {
      expect(components.button.style).toBe(nchatSkin.components.buttonStyle);
    });

    test("pill buttons use full border radius", () => {
      const waComponents = getComponentTokens(whatsappSkin, false);
      expect(waComponents.button.borderRadius).toBe(
        whatsappSkin.borderRadius.full,
      );
    });

    test("primary bg derives from skin button colors", () => {
      expect(components.button.primaryBg).toBe(
        nchatSkin.colors.buttonPrimaryBg,
      );
    });

    test("destructive uses error color", () => {
      expect(components.button.destructiveBg).toBe(nchatSkin.colors.error);
    });

    test("focus ring includes primary color", () => {
      expect(components.button.focusRing).toContain(nchatSkin.colors.primary);
    });
  });

  describe("Input", () => {
    test("style matches skin component style", () => {
      expect(components.input.style).toBe(nchatSkin.components.inputStyle);
    });

    test("filled variant uses surface background", () => {
      const discordComponents = getComponentTokens(discordSkin, false);
      expect(discordComponents.input.background).toBe(
        discordSkin.colors.surface,
      );
    });

    test("focus border uses primary color", () => {
      expect(components.input.borderColorFocus).toBe(nchatSkin.colors.primary);
    });

    test("error border uses error color", () => {
      expect(components.input.errorBorderColor).toBe(nchatSkin.colors.error);
    });
  });

  describe("CSS Variable Export", () => {
    test("component tokens to CSS variables produces a non-empty map", () => {
      const vars = componentTokensToCSSVariables(components);
      expect(Object.keys(vars).length).toBeGreaterThan(50);
    });

    test("CSS variables use correct prefix and kebab-case", () => {
      const vars = componentTokensToCSSVariables(components, "--c");
      for (const key of Object.keys(vars)) {
        expect(key.startsWith("--c-")).toBe(true);
        // No camelCase in variable names
        expect(key).not.toMatch(/[A-Z]/);
      }
    });
  });
});

// ============================================================================
// 6. INTEGRATION
// ============================================================================

describe("Integration", () => {
  test.each(ALL_SKIN_IDS)(
    'getDesignTokens produces valid tokens for skin "%s"',
    (id) => {
      const skin = visualSkins[id];
      const tokens = getDesignTokens(skin, false);
      expect(tokens.spacing).toBeDefined();
      expect(tokens.typeScale).toBeDefined();
      expect(tokens.colors.bgApp).toBe(skin.colors.background);
      expect(tokens.colors.brandPrimary).toBe(skin.colors.primary);
    },
  );

  test.each(ALL_SKIN_IDS)(
    'getDesignTokens dark mode uses darkMode.colors for skin "%s"',
    (id) => {
      const skin = visualSkins[id];
      const tokens = getDesignTokens(skin, true);
      expect(tokens.colors.bgApp).toBe(skin.darkMode.colors.background);
      expect(tokens.colors.brandPrimary).toBe(skin.darkMode.colors.primary);
    },
  );

  test.each(ALL_SKIN_IDS)(
    'getComponentTokens produces all components for skin "%s"',
    (id) => {
      const skin = visualSkins[id];
      const components = getComponentTokens(skin, false);
      for (const name of COMPONENT_NAMES) {
        expect(components[name]).toBeDefined();
      }
    },
  );

  test.each(ALL_SKIN_IDS)(
    'dark mode component tokens differ from light mode for skin "%s"',
    (id) => {
      const skin = visualSkins[id];
      const light = getComponentTokens(skin, false);
      const dark = getComponentTokens(skin, true);
      // At minimum, sidebar background should differ
      expect(light.sidebar.background).not.toBe(dark.sidebar.background);
    },
  );

  test("design tokens are consistent with component tokens", () => {
    const tokens = getDesignTokens(nchatSkin, false);
    const components = getComponentTokens(nchatSkin, false);

    // Header height should come from the skin
    expect(components.header.height).toBe(nchatSkin.spacing.headerHeight);
    // Sidebar width should come from the skin
    expect(components.sidebar.width).toBe(nchatSkin.spacing.sidebarWidth);
    // Border radius should be consistent
    expect(components.modal.borderRadius).toBe(tokens.borderRadius.xl);
  });

  test("responsive config sidebar width matches component sidebar width", () => {
    const config = getResponsiveConfig(nchatSkin);
    const components = getComponentTokens(nchatSkin, false);
    expect(config.layouts.lg.sidebarWidth).toBe(components.sidebar.width);
  });

  test("accessibility tokens contrast ratios are computed from correct colors", () => {
    const a11y = getAccessibilityTokens(nchatSkin, false);
    const expected = contrastRatio(
      nchatSkin.colors.text,
      nchatSkin.colors.background,
    );
    expect(a11y.contrastRatios.textOnBackground).toBeCloseTo(expected, 5);
  });
});

// ============================================================================
// 7. EDGE CASES
// ============================================================================

describe("Edge Cases", () => {
  test("getDesignTokens with default parameters returns nchat tokens", () => {
    const tokens = getDesignTokens();
    expect(tokens.colors.brandPrimary).toBe(nchatSkin.colors.primary);
  });

  test("getResponsiveConfig with default parameters returns nchat config", () => {
    const config = getResponsiveConfig();
    expect(config.layouts.lg.sidebarWidth).toBe(nchatSkin.spacing.sidebarWidth);
  });

  test("getAccessibilityTokens with default parameters returns nchat tokens", () => {
    const a11y = getAccessibilityTokens();
    expect(a11y.focusRings.default.color).toBe(nchatSkin.colors.primary);
  });

  test("getComponentTokens with default parameters returns nchat tokens", () => {
    const components = getComponentTokens();
    expect(components.sidebar.width).toBe(nchatSkin.spacing.sidebarWidth);
  });

  test("getMotionTokens returns consistent tokens on repeated calls", () => {
    const m1 = getMotionTokens();
    const m2 = getMotionTokens();
    expect(m1.transitions.durations.normal).toBe(
      m2.transitions.durations.normal,
    );
    expect(m1.animations.fadeIn.full.value).toBe(
      m2.animations.fadeIn.full.value,
    );
  });

  test("stagger delay with custom config", () => {
    const config = { delay: "100ms", maxDelay: "200ms", maxItems: 5 };
    expect(getStaggerDelay(0, config)).toBe("0ms");
    expect(getStaggerDelay(1, config)).toBe("100ms");
    expect(getStaggerDelay(5, config)).toBe("200ms"); // capped
  });

  test("parseHexColor handles edge case inputs", () => {
    expect(parseHexColor("")).toBeNull();
    expect(parseHexColor("#")).toBeNull();
    expect(parseHexColor("#12")).toBeNull();
    expect(parseHexColor("#ZZZZZZ")).toBeNull();
  });

  test("contrast ratio of same color is 1", () => {
    expect(contrastRatio("#FF0000", "#FF0000")).toBeCloseTo(1, 5);
  });

  test("building type scale with different skin produces different sizes", () => {
    const nchatScale = buildTypeScale(nchatSkin); // 14px base
    const discordScale = buildTypeScale(discordSkin); // 16px base
    expect(nchatScale.base.fontSize).toBe("14px");
    expect(discordScale.base.fontSize).toBe("16px");
    expect(parseFloat(discordScale["2xl"].fontSize)).toBeGreaterThan(
      parseFloat(nchatScale["2xl"].fontSize),
    );
  });

  test("component tokens for different skins have correct avatar shapes", () => {
    // nchat: circle, discord: rounded, slack: rounded
    expect(getComponentTokens(nchatSkin).avatar.shape).toBe("circle");
    expect(getComponentTokens(discordSkin).avatar.shape).toBe("rounded");
    expect(getComponentTokens(slackSkin).avatar.shape).toBe("rounded");
  });

  test("layout adaptations for whatsapp skin use its wider sidebar", () => {
    const config = getResponsiveConfig(whatsappSkin);
    // WhatsApp sidebar is 340px
    expect(config.layouts.lg.sidebarWidth).toBe("340px");
  });
});
