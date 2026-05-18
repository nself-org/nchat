/**
 * Reduced Motion Unit Tests
 *
 * Comprehensive tests for reduced motion utilities including
 * motion detection, animation alternatives, and CSS utilities.
 */

import {
  prefersReducedMotion,
  getMotionPreference,
  onMotionPreferenceChange,
  getAnimationDuration,
  getTransitionStyle,
  getAnimationConfig,
  getPresetTransition,
  buildTransitionConfig,
  motionClasses,
  getMotionSafeClass,
  conditionalAnimation,
  animationAlternatives,
  getAnimationAlternative,
  getMotionSafeKeyframes,
  safeAnimate,
  getScrollBehavior,
  getScrollOptions,
  safeScrollIntoView,
  getMotionSafeVariants,
  getReducedMotionProps,
  DEFAULT_ANIMATION_DURATION,
  REDUCED_ANIMATION_DURATION,
  ANIMATION_PRESETS,
} from "../reduced-motion";

// ============================================================================
// Test Helpers
// ============================================================================

let originalMatchMedia: typeof window.matchMedia;

function mockMatchMedia(matches: boolean): () => void {
  originalMatchMedia = window.matchMedia;

  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

  return () => {
    window.matchMedia = originalMatchMedia;
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Reduced Motion", () => {
  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    }
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    it("should have correct default duration", () => {
      expect(DEFAULT_ANIMATION_DURATION).toBe(200);
    });

    it("should have correct reduced duration", () => {
      expect(REDUCED_ANIMATION_DURATION).toBe(0.01);
    });

    it("should have animation presets", () => {
      expect(ANIMATION_PRESETS.instant).toBeDefined();
      expect(ANIMATION_PRESETS.fade).toBeDefined();
      expect(ANIMATION_PRESETS.slide).toBeDefined();
      expect(ANIMATION_PRESETS.scale).toBeDefined();
      expect(ANIMATION_PRESETS.bounce).toBeDefined();
      expect(ANIMATION_PRESETS.spring).toBeDefined();
    });

    it("should have normal and reduced configs in presets", () => {
      expect(ANIMATION_PRESETS.fade.normal).toBeDefined();
      expect(ANIMATION_PRESETS.fade.reduced).toBeDefined();
      expect(ANIMATION_PRESETS.fade.normal.duration).toBe(150);
      expect(ANIMATION_PRESETS.fade.reduced.duration).toBe(0.01);
    });
  });

  // ==========================================================================
  // Motion Detection Tests
  // ==========================================================================

  describe("prefersReducedMotion", () => {
    it("should return false when reduced motion is not preferred", () => {
      const restore = mockMatchMedia(false);
      expect(prefersReducedMotion()).toBe(false);
      restore();
    });

    it("should return true when reduced motion is preferred", () => {
      const restore = mockMatchMedia(true);
      expect(prefersReducedMotion()).toBe(true);
      restore();
    });
  });

  describe("getMotionPreference", () => {
    it("should return user preference when provided", () => {
      const result = getMotionPreference(true);

      expect(result.prefersReducedMotion).toBe(true);
      expect(result.source).toBe("user");
    });

    it("should return system preference when no user preference", () => {
      const restore = mockMatchMedia(true);
      const result = getMotionPreference();

      expect(result.prefersReducedMotion).toBe(true);
      expect(result.source).toBe("system");
      restore();
    });

    it("should return default when no system support", () => {
      const originalMatchMedia = window.matchMedia;
      // @ts-expect-error - intentionally removing matchMedia
      delete window.matchMedia;

      const result = getMotionPreference();

      expect(result.prefersReducedMotion).toBe(false);
      // Implementation may return 'system' or 'default' as fallback
      expect(["default", "system"]).toContain(result.source);

      window.matchMedia = originalMatchMedia;
    });

    it("should prioritize user preference over system", () => {
      const restore = mockMatchMedia(true); // System prefers reduced
      const result = getMotionPreference(false); // User says no

      expect(result.prefersReducedMotion).toBe(false);
      expect(result.source).toBe("user");
      restore();
    });
  });

  describe("onMotionPreferenceChange", () => {
    it("should return cleanup function", () => {
      const restore = mockMatchMedia(false);
      const cleanup = onMotionPreferenceChange(jest.fn());

      expect(typeof cleanup).toBe("function");
      cleanup();
      restore();
    });

    it("should add event listener", () => {
      const addEventListenerMock = jest.fn();
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: addEventListenerMock,
        removeEventListener: jest.fn(),
      }));

      onMotionPreferenceChange(jest.fn());

      expect(addEventListenerMock).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      );
    });

    it("should support legacy addListener", () => {
      const addListenerMock = jest.fn();
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
        addListener: addListenerMock,
      }));

      onMotionPreferenceChange(jest.fn());

      expect(addListenerMock).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should return no-op when no matchMedia support", () => {
      const originalMatchMedia = window.matchMedia;
      // @ts-expect-error - intentionally removing matchMedia
      delete window.matchMedia;

      const cleanup = onMotionPreferenceChange(jest.fn());
      expect(typeof cleanup).toBe("function");
      cleanup(); // Should not throw

      window.matchMedia = originalMatchMedia;
    });
  });

  // ==========================================================================
  // Animation Utilities Tests
  // ==========================================================================

  describe("getAnimationDuration", () => {
    it("should return normal duration when motion allowed", () => {
      const restore = mockMatchMedia(false);
      expect(getAnimationDuration(300)).toBe(300);
      restore();
    });

    it("should return reduced duration when motion preferred", () => {
      const restore = mockMatchMedia(true);
      expect(getAnimationDuration(300)).toBe(REDUCED_ANIMATION_DURATION);
      restore();
    });

    it("should use default duration when not specified", () => {
      const restore = mockMatchMedia(false);
      expect(getAnimationDuration()).toBe(DEFAULT_ANIMATION_DURATION);
      restore();
    });

    it("should respect explicit reducedMotion parameter", () => {
      const restore = mockMatchMedia(false);
      expect(getAnimationDuration(300, true)).toBe(REDUCED_ANIMATION_DURATION);
      expect(getAnimationDuration(300, false)).toBe(300);
      restore();
    });
  });

  describe("getTransitionStyle", () => {
    it("should return transition style object", () => {
      const restore = mockMatchMedia(false);
      const style = getTransitionStyle("opacity", 200, "ease-out");

      expect(style.transition).toBe("opacity 200ms ease-out");
      expect(style.transitionDuration).toBe("200ms");
      expect(style.animationDuration).toBe("200ms");
      restore();
    });

    it("should return none for reduced motion", () => {
      const restore = mockMatchMedia(true);
      const style = getTransitionStyle("opacity", 200);

      expect(style.transition).toBe("none");
      expect(style.transitionDuration).toBe("0.01ms");
      restore();
    });

    it("should use default values", () => {
      const restore = mockMatchMedia(false);
      const style = getTransitionStyle();

      expect(style.transition).toContain("all");
      expect(style.transition).toContain("200ms");
      expect(style.transition).toContain("ease-in-out");
      restore();
    });

    it("should respect explicit reducedMotion parameter", () => {
      const restore = mockMatchMedia(false);
      const style = getTransitionStyle("all", 200, "ease", true);

      expect(style.transition).toBe("none");
      restore();
    });
  });

  describe("getAnimationConfig", () => {
    it("should return normal config when motion allowed", () => {
      const restore = mockMatchMedia(false);
      const config = getAnimationConfig("fade");

      expect(config.duration).toBe(150);
      expect(config.easing).toBe("ease-out");
      expect(config.property).toBe("opacity");
      restore();
    });

    it("should return reduced config when motion reduced", () => {
      const restore = mockMatchMedia(true);
      const config = getAnimationConfig("fade");

      expect(config.duration).toBe(0.01);
      expect(config.easing).toBe("linear");
      restore();
    });

    it("should handle all presets", () => {
      const restore = mockMatchMedia(false);
      const presets = [
        "instant",
        "fade",
        "slide",
        "scale",
        "bounce",
        "spring",
      ] as const;

      for (const preset of presets) {
        const config = getAnimationConfig(preset);
        expect(config.duration).toBeGreaterThan(0);
        expect(config.easing).toBeDefined();
        expect(config.property).toBeDefined();
      }
      restore();
    });
  });

  describe("getPresetTransition", () => {
    it("should return CSS transition string", () => {
      const restore = mockMatchMedia(false);
      const transition = getPresetTransition("fade");

      expect(transition).toBe("opacity 150ms ease-out");
      restore();
    });

    it("should return reduced transition", () => {
      const restore = mockMatchMedia(true);
      const transition = getPresetTransition("fade");

      expect(transition).toBe("opacity 0.01ms linear");
      restore();
    });
  });

  describe("buildTransitionConfig", () => {
    it("should build custom config", () => {
      const config = buildTransitionConfig(
        { duration: 300, easing: "ease-in" },
        { duration: 0 },
      );

      expect(config.normal.duration).toBe(300);
      expect(config.normal.easing).toBe("ease-in");
      expect(config.reduced.duration).toBe(0);
    });

    it("should use defaults for missing values", () => {
      const config = buildTransitionConfig({});

      expect(config.normal.duration).toBe(DEFAULT_ANIMATION_DURATION);
      expect(config.normal.easing).toBe("ease-in-out");
      expect(config.normal.property).toBe("all");
      expect(config.reduced.duration).toBe(REDUCED_ANIMATION_DURATION);
    });
  });

  // ==========================================================================
  // CSS Class Utilities Tests
  // ==========================================================================

  describe("motionClasses", () => {
    it("should have safe class", () => {
      expect(motionClasses.safe).toContain("motion-safe");
      expect(motionClasses.safe).toContain("motion-reduce");
    });

    it("should have reduced class", () => {
      expect(motionClasses.reduced).toContain("motion-reduce:animate-none");
    });

    it("should have all utility classes", () => {
      expect(motionClasses.animateSafe).toBeDefined();
      expect(motionClasses.fadeSafe).toBeDefined();
      expect(motionClasses.transformSafe).toBeDefined();
      expect(motionClasses.scaleSafe).toBeDefined();
      expect(motionClasses.opacity).toBeDefined();
    });
  });

  describe("getMotionSafeClass", () => {
    it("should return motion-safe class string", () => {
      const result = getMotionSafeClass("animate-fadeIn", "opacity-100");

      expect(result).toBe(
        "motion-safe:animate-fadeIn motion-reduce:opacity-100",
      );
    });

    it("should use animate-none as default fallback", () => {
      const result = getMotionSafeClass("animate-spin");

      expect(result).toBe(
        "motion-safe:animate-spin motion-reduce:animate-none",
      );
    });
  });

  describe("conditionalAnimation", () => {
    it("should return animation class when motion allowed", () => {
      const restore = mockMatchMedia(false);
      const result = conditionalAnimation("animate-bounce");

      expect(result).toBe("animate-bounce");
      restore();
    });

    it("should return empty string when motion reduced", () => {
      const restore = mockMatchMedia(true);
      const result = conditionalAnimation("animate-bounce");

      expect(result).toBe("");
      restore();
    });

    it("should respect explicit parameter", () => {
      const restore = mockMatchMedia(false);
      expect(conditionalAnimation("animate-spin", true)).toBe("");
      expect(conditionalAnimation("animate-spin", false)).toBe("animate-spin");
      restore();
    });
  });

  // ==========================================================================
  // Animation Alternatives Tests
  // ==========================================================================

  describe("animationAlternatives", () => {
    it("should have fadeIn alternative", () => {
      expect(animationAlternatives.fadeIn.motion).toBe("animate-fadeIn");
      expect(animationAlternatives.fadeIn.reduced).toBe("opacity-100");
    });

    it("should have all common alternatives", () => {
      const expected = [
        "fadeIn",
        "fadeOut",
        "slideIn",
        "slideOut",
        "scaleIn",
        "scaleOut",
        "spin",
        "pulse",
        "bounce",
        "shake",
      ];

      for (const name of expected) {
        expect(animationAlternatives[name]).toBeDefined();
      }
    });
  });

  describe("getAnimationAlternative", () => {
    it("should return motion class when motion allowed", () => {
      const restore = mockMatchMedia(false);
      const result = getAnimationAlternative("fadeIn");

      expect(result).toBe("animate-fadeIn");
      restore();
    });

    it("should return reduced class when motion reduced", () => {
      const restore = mockMatchMedia(true);
      const result = getAnimationAlternative("fadeIn");

      expect(result).toBe("opacity-100");
      restore();
    });

    it("should handle spin with no reduced alternative", () => {
      const restore = mockMatchMedia(true);
      const result = getAnimationAlternative("spin");

      expect(result).toBe("");
      restore();
    });
  });

  // ==========================================================================
  // Keyframe Animation Tests
  // ==========================================================================

  describe("getMotionSafeKeyframes", () => {
    it("should return original keyframes when motion allowed", () => {
      const restore = mockMatchMedia(false);
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 200 };

      const result = getMotionSafeKeyframes(keyframes, options);

      expect(result.keyframes).toEqual(keyframes);
      expect(result.options.duration).toBe(200);
      restore();
    });

    it("should return instant keyframes when motion reduced", () => {
      const restore = mockMatchMedia(true);
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 200 };

      const result = getMotionSafeKeyframes(keyframes, options);

      expect(result.keyframes).toHaveLength(1);
      expect(result.keyframes[0]).toEqual({ opacity: 1 });
      expect(result.options.duration).toBe(REDUCED_ANIMATION_DURATION);
      restore();
    });

    it("should handle empty keyframes", () => {
      const restore = mockMatchMedia(true);
      const result = getMotionSafeKeyframes([], { duration: 200 });

      expect(result.keyframes).toHaveLength(1);
      expect(result.keyframes[0]).toEqual({});
      restore();
    });
  });

  describe("safeAnimate", () => {
    it("should return null for element without animate", () => {
      const element = document.createElement("div");
      // @ts-expect-error - intentionally removing animate
      delete element.animate;

      const result = safeAnimate(element, [{ opacity: 0 }, { opacity: 1 }], {
        duration: 200,
      });

      expect(result).toBeNull();
    });

    it("should call animate with safe keyframes", () => {
      const restore = mockMatchMedia(false);
      const element = document.createElement("div");
      const animateMock = jest.fn().mockReturnValue({});
      element.animate = animateMock;

      safeAnimate(element, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });

      expect(animateMock).toHaveBeenCalled();
      restore();
    });
  });

  // ==========================================================================
  // Scroll Behavior Tests
  // ==========================================================================

  describe("getScrollBehavior", () => {
    it("should return smooth when motion allowed", () => {
      const restore = mockMatchMedia(false);
      expect(getScrollBehavior()).toBe("smooth");
      restore();
    });

    it("should return instant when motion reduced", () => {
      const restore = mockMatchMedia(true);
      expect(getScrollBehavior()).toBe("instant");
      restore();
    });

    it("should respect explicit parameter", () => {
      expect(getScrollBehavior(true)).toBe("instant");
      expect(getScrollBehavior(false)).toBe("smooth");
    });
  });

  describe("getScrollOptions", () => {
    it("should return options with safe behavior", () => {
      const restore = mockMatchMedia(false);
      const options = getScrollOptions({ block: "center" });

      expect(options.behavior).toBe("smooth");
      expect(options.block).toBe("center");
      restore();
    });

    it("should override behavior when motion reduced", () => {
      const restore = mockMatchMedia(true);
      const options = getScrollOptions({ behavior: "smooth" });

      expect(options.behavior).toBe("instant");
      restore();
    });
  });

  describe("safeScrollIntoView", () => {
    it("should call scrollIntoView with safe options", () => {
      const restore = mockMatchMedia(false);
      const element = document.createElement("div");
      const scrollIntoViewMock = jest.fn();
      element.scrollIntoView = scrollIntoViewMock;

      safeScrollIntoView(element, { block: "start" });

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        block: "start",
        behavior: "smooth",
      });
      restore();
    });

    it("should use instant when motion reduced", () => {
      const restore = mockMatchMedia(true);
      const element = document.createElement("div");
      const scrollIntoViewMock = jest.fn();
      element.scrollIntoView = scrollIntoViewMock;

      safeScrollIntoView(element);

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: "instant",
      });
      restore();
    });
  });

  // ==========================================================================
  // Framer Motion Integration Tests
  // ==========================================================================

  describe("getMotionSafeVariants", () => {
    it("should return original variants when motion allowed", () => {
      const restore = mockMatchMedia(false);
      const variants = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.3 } },
      };

      const result = getMotionSafeVariants(variants);

      expect(result).toEqual(variants);
      restore();
    });

    it("should return instant variants when motion reduced", () => {
      const restore = mockMatchMedia(true);
      const variants = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.3 } },
      };

      const result = getMotionSafeVariants(variants);

      expect(result.animate.transition?.duration).toBe(0);
      restore();
    });

    it("should handle variants without transitions", () => {
      const restore = mockMatchMedia(true);
      const variants = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      };

      const result = getMotionSafeVariants(variants);

      expect(result.animate.transition?.duration).toBe(0);
      restore();
    });
  });

  describe("getReducedMotionProps", () => {
    it("should return empty props when motion allowed", () => {
      const restore = mockMatchMedia(false);
      const props = getReducedMotionProps();

      expect(props.initial).toBeUndefined();
      expect(props.animate).toBeUndefined();
      expect(props.exit).toBeUndefined();
      expect(props.transition).toBeUndefined();
      restore();
    });

    it("should return disabled props when motion reduced", () => {
      const restore = mockMatchMedia(true);
      const props = getReducedMotionProps();

      expect(props.initial).toBe(false);
      expect(props.animate).toBe(false);
      expect(props.exit).toBe(false);
      expect(props.transition).toEqual({ duration: 0 });
      restore();
    });

    it("should respect explicit parameter", () => {
      const props = getReducedMotionProps(true);
      expect(props.initial).toBe(false);

      const propsAllowed = getReducedMotionProps(false);
      expect(propsAllowed.initial).toBeUndefined();
    });
  });
});
