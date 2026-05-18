/**
 * Reduced motion utilities for accessibility
 *
 * Provides utilities for detecting and respecting user preferences
 * for reduced motion, along with animation alternatives.
 */

// ============================================================================
// Types
// ============================================================================

export interface MotionPreference {
  /** Whether the user prefers reduced motion */
  prefersReducedMotion: boolean;
  /** The source of the preference */
  source: "system" | "user" | "default";
}

export interface AnimationConfig {
  /** Animation duration in milliseconds */
  duration: number;
  /** CSS timing function */
  easing: string;
  /** CSS transition property */
  property: string;
}

export interface ReducedMotionConfig {
  /** Normal animation configuration */
  normal: AnimationConfig;
  /** Reduced animation configuration */
  reduced: AnimationConfig;
}

export type TransitionStyle = {
  transition: string;
  transitionDuration: string;
  animationDuration: string;
};

// ============================================================================
// Constants
// ============================================================================

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const DEFAULT_ANIMATION_DURATION = 200;
export const REDUCED_ANIMATION_DURATION = 0.01;

export const ANIMATION_PRESETS = {
  /** Instant transitions for reduced motion */
  instant: {
    normal: { duration: 200, easing: "ease-in-out", property: "all" },
    reduced: { duration: 0.01, easing: "linear", property: "all" },
  },
  /** Fade animations */
  fade: {
    normal: { duration: 150, easing: "ease-out", property: "opacity" },
    reduced: { duration: 0.01, easing: "linear", property: "opacity" },
  },
  /** Slide animations */
  slide: {
    normal: {
      duration: 250,
      easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      property: "transform",
    },
    reduced: { duration: 0.01, easing: "linear", property: "opacity" },
  },
  /** Scale animations */
  scale: {
    normal: {
      duration: 200,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      property: "transform",
    },
    reduced: { duration: 0.01, easing: "linear", property: "opacity" },
  },
  /** Bounce animations */
  bounce: {
    normal: {
      duration: 400,
      easing: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      property: "transform",
    },
    reduced: { duration: 0.01, easing: "linear", property: "opacity" },
  },
  /** Spring animations */
  spring: {
    normal: {
      duration: 500,
      easing: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      property: "transform",
    },
    reduced: { duration: 0.01, easing: "linear", property: "opacity" },
  },
} as const;

export type AnimationPreset = keyof typeof ANIMATION_PRESETS;

// ============================================================================
// Motion Detection
// ============================================================================

/**
 * Checks if the system prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Gets the current motion preference with source
 */
export function getMotionPreference(
  userPreference?: boolean,
): MotionPreference {
  // User preference takes priority
  if (userPreference !== undefined) {
    return {
      prefersReducedMotion: userPreference,
      source: "user",
    };
  }

  // Check system preference
  if (typeof window !== "undefined" && window.matchMedia) {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    return {
      prefersReducedMotion: mediaQuery.matches,
      source: "system",
    };
  }

  // Default to allowing motion
  return {
    prefersReducedMotion: false,
    source: "default",
  };
}

/**
 * Subscribes to motion preference changes
 */
export function onMotionPreferenceChange(
  callback: (prefersReduced: boolean) => void,
): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

  const handler = (event: MediaQueryListEvent): void => {
    callback(event.matches);
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }

  // Legacy browsers
  if (mediaQuery.addListener) {
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }

  return () => {};
}

// ============================================================================
// Animation Utilities
// ============================================================================

/**
 * Gets the appropriate animation duration
 */
export function getAnimationDuration(
  normalDuration: number = DEFAULT_ANIMATION_DURATION,
  reducedMotion?: boolean,
): number {
  const shouldReduce = reducedMotion ?? prefersReducedMotion();
  return shouldReduce ? REDUCED_ANIMATION_DURATION : normalDuration;
}

/**
 * Gets transition CSS style object
 */
export function getTransitionStyle(
  property: string = "all",
  duration: number = DEFAULT_ANIMATION_DURATION,
  easing: string = "ease-in-out",
  reducedMotion?: boolean,
): TransitionStyle {
  const shouldReduce = reducedMotion ?? prefersReducedMotion();
  const actualDuration = shouldReduce ? REDUCED_ANIMATION_DURATION : duration;

  return {
    transition: shouldReduce
      ? "none"
      : `${property} ${actualDuration}ms ${easing}`,
    transitionDuration: `${actualDuration}ms`,
    animationDuration: `${actualDuration}ms`,
  };
}

/**
 * Gets animation configuration based on preset
 */
export function getAnimationConfig(
  preset: AnimationPreset,
  reducedMotion?: boolean,
): AnimationConfig {
  const shouldReduce = reducedMotion ?? prefersReducedMotion();
  const config = ANIMATION_PRESETS[preset];
  return shouldReduce ? config.reduced : config.normal;
}

/**
 * Gets CSS transition string based on preset
 */
export function getPresetTransition(
  preset: AnimationPreset,
  reducedMotion?: boolean,
): string {
  const config = getAnimationConfig(preset, reducedMotion);
  return `${config.property} ${config.duration}ms ${config.easing}`;
}

/**
 * Builds custom transition configuration
 */
export function buildTransitionConfig(
  normalConfig: Partial<AnimationConfig>,
  reducedConfig?: Partial<AnimationConfig>,
): ReducedMotionConfig {
  const defaultNormal: AnimationConfig = {
    duration: DEFAULT_ANIMATION_DURATION,
    easing: "ease-in-out",
    property: "all",
  };

  const defaultReduced: AnimationConfig = {
    duration: REDUCED_ANIMATION_DURATION,
    easing: "linear",
    property: "opacity",
  };

  return {
    normal: { ...defaultNormal, ...normalConfig },
    reduced: { ...defaultReduced, ...reducedConfig },
  };
}

// ============================================================================
// CSS Class Utilities
// ============================================================================

export const motionClasses = {
  /** Disable all motion when reduced motion is preferred */
  safe: "motion-safe:transition-all motion-reduce:transition-none",
  /** Reduce animation/transition when reduced motion is preferred */
  reduced: "motion-reduce:animate-none motion-reduce:transition-none",
  /** Only animate when motion is safe */
  animateSafe: "motion-safe:animate-pulse motion-reduce:animate-none",
  /** Fade only when motion is safe */
  fadeSafe: "motion-safe:transition-opacity motion-reduce:transition-none",
  /** Transform only when motion is safe */
  transformSafe:
    "motion-safe:transition-transform motion-reduce:transition-none",
  /** Scale only when motion is safe */
  scaleSafe: "motion-safe:scale-100 motion-reduce:scale-100",
  /** Opacity transition that respects motion preferences */
  opacity: "motion-safe:duration-200 motion-reduce:duration-0",
} as const;

/**
 * Gets motion-safe CSS class string
 */
export function getMotionSafeClass(
  animationClass: string,
  fallbackClass: string = "",
): string {
  return `motion-safe:${animationClass} motion-reduce:${fallbackClass || "animate-none"}`;
}

/**
 * Conditionally returns animation class based on motion preference
 */
export function conditionalAnimation(
  animationClass: string,
  reducedMotion?: boolean,
): string {
  const shouldReduce = reducedMotion ?? prefersReducedMotion();
  return shouldReduce ? "" : animationClass;
}

// ============================================================================
// Animation Alternatives
// ============================================================================

export interface AnimationAlternative {
  /** Class to use when motion is allowed */
  motion: string;
  /** Class to use when motion is reduced */
  reduced: string;
}

export const animationAlternatives: Record<string, AnimationAlternative> = {
  fadeIn: {
    motion: "animate-fadeIn",
    reduced: "opacity-100",
  },
  fadeOut: {
    motion: "animate-fadeOut",
    reduced: "opacity-0",
  },
  slideIn: {
    motion: "animate-slideIn",
    reduced: "translate-x-0",
  },
  slideOut: {
    motion: "animate-slideOut",
    reduced: "-translate-x-full",
  },
  scaleIn: {
    motion: "animate-scaleIn",
    reduced: "scale-100",
  },
  scaleOut: {
    motion: "animate-scaleOut",
    reduced: "scale-0",
  },
  spin: {
    motion: "animate-spin",
    reduced: "", // No spinning
  },
  pulse: {
    motion: "animate-pulse",
    reduced: "", // No pulsing
  },
  bounce: {
    motion: "animate-bounce",
    reduced: "", // No bouncing
  },
  shake: {
    motion: "animate-shake",
    reduced: "", // No shaking
  },
};

/**
 * Gets the appropriate animation class based on motion preference
 */
export function getAnimationAlternative(
  animationName: keyof typeof animationAlternatives,
  reducedMotion?: boolean,
): string {
  const shouldReduce = reducedMotion ?? prefersReducedMotion();
  const alternative = animationAlternatives[animationName];
  return shouldReduce ? alternative.reduced : alternative.motion;
}

// ============================================================================
// Keyframe Animation Helpers
// ============================================================================

export interface KeyframeOptions {
  /** Keyframe properties */
  keyframes: Keyframe[];
  /** Animation options */
  options: KeyframeAnimationOptions;
}

/**
 * Gets motion-safe keyframe animation options
 */
export function getMotionSafeKeyframes(
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
  reducedMotion?: boolean,
): KeyframeOptions {
  const shouldReduce = reducedMotion ?? prefersReducedMotion();

  if (shouldReduce) {
    // Return instant animation with final state
    const finalKeyframe = keyframes[keyframes.length - 1] || {};
    return {
      keyframes: [finalKeyframe],
      options: {
        ...options,
        duration: REDUCED_ANIMATION_DURATION,
        easing: "linear",
      },
    };
  }

  return { keyframes, options };
}

/**
 * Safely animates an element respecting motion preferences
 */
export function safeAnimate(
  element: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
  reducedMotion?: boolean,
): Animation | null {
  if (!element?.animate) return null;

  const safe = getMotionSafeKeyframes(keyframes, options, reducedMotion);
  return element.animate(safe.keyframes, safe.options);
}

// ============================================================================
// Scroll Behavior
// ============================================================================

/**
 * Gets motion-safe scroll behavior
 */
export function getScrollBehavior(reducedMotion?: boolean): ScrollBehavior {
  const shouldReduce = reducedMotion ?? prefersReducedMotion();
  return shouldReduce ? "instant" : "smooth";
}

/**
 * Gets motion-safe scroll options
 */
export function getScrollOptions(
  options: ScrollIntoViewOptions = {},
  reducedMotion?: boolean,
): ScrollIntoViewOptions {
  return {
    ...options,
    behavior: getScrollBehavior(reducedMotion),
  };
}

/**
 * Scrolls element into view with motion preference
 */
export function safeScrollIntoView(
  element: HTMLElement,
  options: ScrollIntoViewOptions = {},
  reducedMotion?: boolean,
): void {
  const safeOptions = getScrollOptions(options, reducedMotion);
  element.scrollIntoView(safeOptions);
}

// ============================================================================
// Framer Motion Integration
// ============================================================================

export interface FramerMotionVariant {
  opacity?: number;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  transition?: {
    duration?: number;
    ease?: string | number[];
  };
}

/**
 * Gets motion-safe Framer Motion variants
 */
export function getMotionSafeVariants(
  variants: Record<string, FramerMotionVariant>,
  reducedMotion?: boolean,
): Record<string, FramerMotionVariant> {
  const shouldReduce = reducedMotion ?? prefersReducedMotion();

  if (!shouldReduce) return variants;

  // Return instant transitions
  const safeVariants: Record<string, FramerMotionVariant> = {};

  for (const [key, variant] of Object.entries(variants)) {
    safeVariants[key] = {
      ...variant,
      transition: {
        ...variant.transition,
        duration: 0,
      },
    };
  }

  return safeVariants;
}

/**
 * Gets Framer Motion props for reduced motion
 */
export function getReducedMotionProps(
  reducedMotion?: boolean,
): Record<string, unknown> {
  const shouldReduce = reducedMotion ?? prefersReducedMotion();

  return {
    initial: shouldReduce ? false : undefined,
    animate: shouldReduce ? false : undefined,
    exit: shouldReduce ? false : undefined,
    transition: shouldReduce ? { duration: 0 } : undefined,
  };
}
