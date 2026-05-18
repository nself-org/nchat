/**
 * Motion System
 *
 * Animation tokens, reduced-motion support, and transition presets derived
 * from the skin architecture's transition tokens. All animations have
 * reduced-motion alternatives that either remove motion or replace it with
 * opacity-only transitions.
 *
 * Features:
 *   - Duration and easing tokens (re-exported from design-tokens for convenience)
 *   - Named animation presets (fade, slide, scale, etc.)
 *   - Reduced-motion alternatives for every animation
 *   - CSS keyframe definitions
 *   - Stagger utilities for list animations
 *   - Spring-based animation parameters
 *
 * @module lib/skins/motion
 * @version 1.0.0
 */

import { buildTransitionTokens, type TransitionTokens } from "./design-tokens";

// ============================================================================
// ANIMATION PRESETS
// ============================================================================

export interface AnimationPreset {
  /** CSS keyframes name */
  keyframes: string;
  /** Duration (CSS time value) */
  duration: string;
  /** Easing function */
  easing: string;
  /** Fill mode */
  fillMode: string;
  /** Full shorthand value */
  value: string;
}

export interface ReducedMotionAlternative {
  /** The full-motion animation */
  full: AnimationPreset;
  /** The reduced-motion alternative (usually opacity-only or instant) */
  reduced: AnimationPreset;
}

function makePreset(
  keyframes: string,
  duration: string,
  easing: string,
  fillMode: string = "both",
): AnimationPreset {
  return {
    keyframes,
    duration,
    easing,
    fillMode,
    value: `${keyframes} ${duration} ${easing} ${fillMode}`,
  };
}

// ============================================================================
// KEYFRAME DEFINITIONS
// ============================================================================

export interface KeyframeDefinition {
  name: string;
  frames: Record<string, Record<string, string>>;
}

export function getKeyframeDefinitions(): KeyframeDefinition[] {
  return [
    {
      name: "dt-fade-in",
      frames: {
        from: { opacity: "0" },
        to: { opacity: "1" },
      },
    },
    {
      name: "dt-fade-out",
      frames: {
        from: { opacity: "1" },
        to: { opacity: "0" },
      },
    },
    {
      name: "dt-slide-up",
      frames: {
        from: { transform: "translateY(8px)", opacity: "0" },
        to: { transform: "translateY(0)", opacity: "1" },
      },
    },
    {
      name: "dt-slide-down",
      frames: {
        from: { transform: "translateY(-8px)", opacity: "0" },
        to: { transform: "translateY(0)", opacity: "1" },
      },
    },
    {
      name: "dt-slide-left",
      frames: {
        from: { transform: "translateX(8px)", opacity: "0" },
        to: { transform: "translateX(0)", opacity: "1" },
      },
    },
    {
      name: "dt-slide-right",
      frames: {
        from: { transform: "translateX(-8px)", opacity: "0" },
        to: { transform: "translateX(0)", opacity: "1" },
      },
    },
    {
      name: "dt-scale-in",
      frames: {
        from: { transform: "scale(0.95)", opacity: "0" },
        to: { transform: "scale(1)", opacity: "1" },
      },
    },
    {
      name: "dt-scale-out",
      frames: {
        from: { transform: "scale(1)", opacity: "1" },
        to: { transform: "scale(0.95)", opacity: "0" },
      },
    },
    {
      name: "dt-collapse-down",
      frames: {
        from: { height: "0", opacity: "0" },
        to: { height: "var(--dt-collapse-height, auto)", opacity: "1" },
      },
    },
    {
      name: "dt-collapse-up",
      frames: {
        from: { height: "var(--dt-collapse-height, auto)", opacity: "1" },
        to: { height: "0", opacity: "0" },
      },
    },
    {
      name: "dt-spin",
      frames: {
        from: { transform: "rotate(0deg)" },
        to: { transform: "rotate(360deg)" },
      },
    },
    {
      name: "dt-pulse",
      frames: {
        "0%": { opacity: "1" },
        "50%": { opacity: "0.5" },
        "100%": { opacity: "1" },
      },
    },
    {
      name: "dt-bounce",
      frames: {
        "0%": { transform: "translateY(0)" },
        "50%": { transform: "translateY(-4px)" },
        "100%": { transform: "translateY(0)" },
      },
    },
    {
      name: "dt-shake",
      frames: {
        "0%": { transform: "translateX(0)" },
        "25%": { transform: "translateX(-4px)" },
        "50%": { transform: "translateX(4px)" },
        "75%": { transform: "translateX(-4px)" },
        "100%": { transform: "translateX(0)" },
      },
    },
  ];
}

// ============================================================================
// ANIMATION CATALOG
// ============================================================================

export interface AnimationCatalog {
  fadeIn: ReducedMotionAlternative;
  fadeOut: ReducedMotionAlternative;
  slideUp: ReducedMotionAlternative;
  slideDown: ReducedMotionAlternative;
  slideLeft: ReducedMotionAlternative;
  slideRight: ReducedMotionAlternative;
  scaleIn: ReducedMotionAlternative;
  scaleOut: ReducedMotionAlternative;
  collapseDown: ReducedMotionAlternative;
  collapseUp: ReducedMotionAlternative;
  spin: ReducedMotionAlternative;
  pulse: ReducedMotionAlternative;
  bounce: ReducedMotionAlternative;
  shake: ReducedMotionAlternative;
}

export function buildAnimationCatalog(
  transitions: TransitionTokens,
): AnimationCatalog {
  const { durations, easings } = transitions;

  const fadeInFull = makePreset("dt-fade-in", durations.normal, easings.out);
  const fadeOutFull = makePreset("dt-fade-out", durations.normal, easings.in);

  // Reduced motion: use instant duration or no-motion variant
  const instantFade = makePreset(
    "dt-fade-in",
    durations.instant,
    easings.default,
  );
  const instantFadeOut = makePreset(
    "dt-fade-out",
    durations.instant,
    easings.default,
  );

  return {
    fadeIn: {
      full: fadeInFull,
      reduced: makePreset("dt-fade-in", durations.fast, easings.out),
    },
    fadeOut: {
      full: fadeOutFull,
      reduced: makePreset("dt-fade-out", durations.fast, easings.in),
    },
    slideUp: {
      full: makePreset("dt-slide-up", durations.normal, easings.out),
      reduced: makePreset("dt-fade-in", durations.fast, easings.out),
    },
    slideDown: {
      full: makePreset("dt-slide-down", durations.normal, easings.out),
      reduced: makePreset("dt-fade-in", durations.fast, easings.out),
    },
    slideLeft: {
      full: makePreset("dt-slide-left", durations.normal, easings.out),
      reduced: makePreset("dt-fade-in", durations.fast, easings.out),
    },
    slideRight: {
      full: makePreset("dt-slide-right", durations.normal, easings.out),
      reduced: makePreset("dt-fade-in", durations.fast, easings.out),
    },
    scaleIn: {
      full: makePreset("dt-scale-in", durations.normal, easings.bounce),
      reduced: makePreset("dt-fade-in", durations.fast, easings.out),
    },
    scaleOut: {
      full: makePreset("dt-scale-out", durations.normal, easings.in),
      reduced: makePreset("dt-fade-out", durations.fast, easings.in),
    },
    collapseDown: {
      full: makePreset("dt-collapse-down", durations.slow, easings.inOut),
      reduced: makePreset("dt-fade-in", durations.fast, easings.out),
    },
    collapseUp: {
      full: makePreset("dt-collapse-up", durations.slow, easings.inOut),
      reduced: makePreset("dt-fade-out", durations.fast, easings.in),
    },
    spin: {
      full: makePreset("dt-spin", "1000ms", "linear", "none"),
      reduced: instantFade, // No spin in reduced motion
    },
    pulse: {
      full: makePreset("dt-pulse", "2000ms", easings.inOut, "none"),
      reduced: instantFade,
    },
    bounce: {
      full: makePreset("dt-bounce", durations.slow, easings.bounce),
      reduced: instantFade,
    },
    shake: {
      full: makePreset("dt-shake", durations.slow, easings.default),
      reduced: instantFadeOut,
    },
  };
}

// ============================================================================
// STAGGER UTILITIES
// ============================================================================

export interface StaggerConfig {
  /** Delay between each item */
  delay: string;
  /** Maximum total stagger time */
  maxDelay: string;
  /** Number of items before the stagger caps out */
  maxItems: number;
}

export function buildStaggerConfig(): StaggerConfig {
  return {
    delay: "50ms",
    maxDelay: "500ms",
    maxItems: 10,
  };
}

/**
 * Compute the stagger delay for item at `index`.
 */
export function getStaggerDelay(index: number, config?: StaggerConfig): string {
  const c = config ?? buildStaggerConfig();
  const delay = parseFloat(c.delay);
  const max = parseFloat(c.maxDelay);
  const computed = Math.min(index * delay, max);
  return `${computed}ms`;
}

// ============================================================================
// SPRING PARAMETERS
// ============================================================================

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  /** Approximate CSS cubic-bezier equivalent */
  cssApproximation: string;
}

export interface SpringPresets {
  gentle: SpringConfig;
  snappy: SpringConfig;
  bouncy: SpringConfig;
  stiff: SpringConfig;
}

export function buildSpringPresets(): SpringPresets {
  return {
    gentle: {
      stiffness: 120,
      damping: 14,
      mass: 1,
      cssApproximation: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    },
    snappy: {
      stiffness: 300,
      damping: 20,
      mass: 1,
      cssApproximation: "cubic-bezier(0.2, 0, 0, 1)",
    },
    bouncy: {
      stiffness: 200,
      damping: 10,
      mass: 1,
      cssApproximation: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
    stiff: {
      stiffness: 400,
      damping: 30,
      mass: 1,
      cssApproximation: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  };
}

// ============================================================================
// CONSOLIDATED MOTION TOKENS
// ============================================================================

export interface MotionTokens {
  transitions: TransitionTokens;
  animations: AnimationCatalog;
  keyframes: KeyframeDefinition[];
  stagger: StaggerConfig;
  springs: SpringPresets;
}

/**
 * Build the complete motion token set.
 *
 * @returns Fully resolved motion tokens.
 */
export function getMotionTokens(): MotionTokens {
  const transitions = buildTransitionTokens();
  return {
    transitions,
    animations: buildAnimationCatalog(transitions),
    keyframes: getKeyframeDefinitions(),
    stagger: buildStaggerConfig(),
    springs: buildSpringPresets(),
  };
}

/**
 * Get the animation preset considering the user's motion preference.
 *
 * @param animation - The animation from the catalog.
 * @param prefersReducedMotion - Whether the user prefers reduced motion.
 * @returns The appropriate AnimationPreset.
 */
export function resolveAnimation(
  animation: ReducedMotionAlternative,
  prefersReducedMotion: boolean,
): AnimationPreset {
  return prefersReducedMotion ? animation.reduced : animation.full;
}
