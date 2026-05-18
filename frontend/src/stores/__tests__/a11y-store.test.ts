/**
 * Accessibility Store Unit Tests
 *
 * Comprehensive tests for the accessibility Zustand store including
 * all settings, actions, selectors, and DOM application utilities.
 */

import { act } from "@testing-library/react";
import {
  useA11yStore,
  selectReduceMotion,
  selectHighContrast,
  selectFontSize,
  selectScreenReaderMode,
  selectLargerTargets,
  selectShowKeyboardHints,
  selectAnnounceMessages,
  selectColorScheme,
  applyA11ySettings,
  generateA11yCSSVariables,
  generateA11yCSSRules,
  fontSizeClasses,
  fontSizeValues,
  fontSizeMultipliers,
  targetSizeClasses,
} from "../a11y-store";
import type {
  A11ySettings,
  FontSize,
  ContrastMode,
  ColorScheme,
} from "../a11y-store";

// ============================================================================
// Test Helpers
// ============================================================================

const defaultSettings: A11ySettings = {
  reduceMotion: false,
  highContrast: false,
  contrastMode: "normal",
  fontSize: "medium",
  screenReaderMode: false,
  alwaysShowFocus: false,
  reduceTransparency: false,
  dyslexiaFont: false,
  largerTargets: false,
  showKeyboardHints: false,
  preferCaptions: false,
  announceMessages: true,
  colorScheme: "system",
  autoFocusManagement: true,
  underlineLinks: false,
};

// ============================================================================
// Tests
// ============================================================================

describe("A11y Store", () => {
  beforeEach(() => {
    // Reset store to default state
    act(() => {
      useA11yStore.getState().resetSettings();
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    describe("fontSizeClasses", () => {
      it("should have all font size classes", () => {
        expect(fontSizeClasses.small).toBe("text-sm");
        expect(fontSizeClasses.medium).toBe("text-base");
        expect(fontSizeClasses.large).toBe("text-lg");
        expect(fontSizeClasses["extra-large"]).toBe("text-xl");
      });
    });

    describe("fontSizeValues", () => {
      it("should have all font size values", () => {
        expect(fontSizeValues.small).toBe("14px");
        expect(fontSizeValues.medium).toBe("16px");
        expect(fontSizeValues.large).toBe("18px");
        expect(fontSizeValues["extra-large"]).toBe("20px");
      });
    });

    describe("fontSizeMultipliers", () => {
      it("should have all font size multipliers", () => {
        expect(fontSizeMultipliers.small).toBe(0.875);
        expect(fontSizeMultipliers.medium).toBe(1);
        expect(fontSizeMultipliers.large).toBe(1.125);
        expect(fontSizeMultipliers["extra-large"]).toBe(1.25);
      });
    });

    describe("targetSizeClasses", () => {
      it("should have target size classes", () => {
        expect(targetSizeClasses.true).toContain("44px");
        expect(targetSizeClasses.false).toContain("36px");
      });
    });
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe("Initial State", () => {
    it("should have correct default values", () => {
      const state = useA11yStore.getState();

      expect(state.reduceMotion).toBe(false);
      expect(state.highContrast).toBe(false);
      expect(state.contrastMode).toBe("normal");
      expect(state.fontSize).toBe("medium");
      expect(state.screenReaderMode).toBe(false);
      expect(state.alwaysShowFocus).toBe(false);
      expect(state.reduceTransparency).toBe(false);
      expect(state.dyslexiaFont).toBe(false);
      expect(state.largerTargets).toBe(false);
      expect(state.showKeyboardHints).toBe(false);
      expect(state.preferCaptions).toBe(false);
      expect(state.announceMessages).toBe(true);
      expect(state.colorScheme).toBe("system");
      expect(state.autoFocusManagement).toBe(true);
      expect(state.underlineLinks).toBe(false);
    });
  });

  // ==========================================================================
  // Individual Setters Tests
  // ==========================================================================

  describe("Individual Setters", () => {
    it("should set reduceMotion", () => {
      act(() => {
        useA11yStore.getState().setReduceMotion(true);
      });
      expect(useA11yStore.getState().reduceMotion).toBe(true);
    });

    it("should set highContrast", () => {
      act(() => {
        useA11yStore.getState().setHighContrast(true);
      });
      expect(useA11yStore.getState().highContrast).toBe(true);
    });

    it("should set contrastMode", () => {
      const modes: ContrastMode[] = ["normal", "high", "higher"];
      for (const mode of modes) {
        act(() => {
          useA11yStore.getState().setContrastMode(mode);
        });
        expect(useA11yStore.getState().contrastMode).toBe(mode);
      }
    });

    it("should set fontSize", () => {
      const sizes: FontSize[] = ["small", "medium", "large", "extra-large"];
      for (const size of sizes) {
        act(() => {
          useA11yStore.getState().setFontSize(size);
        });
        expect(useA11yStore.getState().fontSize).toBe(size);
      }
    });

    it("should set screenReaderMode", () => {
      act(() => {
        useA11yStore.getState().setScreenReaderMode(true);
      });
      expect(useA11yStore.getState().screenReaderMode).toBe(true);
    });

    it("should set alwaysShowFocus", () => {
      act(() => {
        useA11yStore.getState().setAlwaysShowFocus(true);
      });
      expect(useA11yStore.getState().alwaysShowFocus).toBe(true);
    });

    it("should set reduceTransparency", () => {
      act(() => {
        useA11yStore.getState().setReduceTransparency(true);
      });
      expect(useA11yStore.getState().reduceTransparency).toBe(true);
    });

    it("should set dyslexiaFont", () => {
      act(() => {
        useA11yStore.getState().setDyslexiaFont(true);
      });
      expect(useA11yStore.getState().dyslexiaFont).toBe(true);
    });

    it("should set largerTargets", () => {
      act(() => {
        useA11yStore.getState().setLargerTargets(true);
      });
      expect(useA11yStore.getState().largerTargets).toBe(true);
    });

    it("should set showKeyboardHints", () => {
      act(() => {
        useA11yStore.getState().setShowKeyboardHints(true);
      });
      expect(useA11yStore.getState().showKeyboardHints).toBe(true);
    });

    it("should set preferCaptions", () => {
      act(() => {
        useA11yStore.getState().setPreferCaptions(true);
      });
      expect(useA11yStore.getState().preferCaptions).toBe(true);
    });

    it("should set announceMessages", () => {
      act(() => {
        useA11yStore.getState().setAnnounceMessages(false);
      });
      expect(useA11yStore.getState().announceMessages).toBe(false);
    });

    it("should set colorScheme", () => {
      const schemes: ColorScheme[] = ["light", "dark", "system"];
      for (const scheme of schemes) {
        act(() => {
          useA11yStore.getState().setColorScheme(scheme);
        });
        expect(useA11yStore.getState().colorScheme).toBe(scheme);
      }
    });

    it("should set autoFocusManagement", () => {
      act(() => {
        useA11yStore.getState().setAutoFocusManagement(false);
      });
      expect(useA11yStore.getState().autoFocusManagement).toBe(false);
    });

    it("should set underlineLinks", () => {
      act(() => {
        useA11yStore.getState().setUnderlineLinks(true);
      });
      expect(useA11yStore.getState().underlineLinks).toBe(true);
    });
  });

  // ==========================================================================
  // Bulk Actions Tests
  // ==========================================================================

  describe("Bulk Actions", () => {
    describe("updateSettings", () => {
      it("should update multiple settings at once", () => {
        act(() => {
          useA11yStore.getState().updateSettings({
            reduceMotion: true,
            highContrast: true,
            fontSize: "large",
          });
        });

        const state = useA11yStore.getState();
        expect(state.reduceMotion).toBe(true);
        expect(state.highContrast).toBe(true);
        expect(state.fontSize).toBe("large");
      });

      it("should preserve unchanged settings", () => {
        act(() => {
          useA11yStore.getState().setAnnounceMessages(false);
          useA11yStore.getState().updateSettings({
            reduceMotion: true,
          });
        });

        const state = useA11yStore.getState();
        expect(state.reduceMotion).toBe(true);
        expect(state.announceMessages).toBe(false);
      });
    });

    describe("resetSettings", () => {
      it("should reset all settings to defaults", () => {
        act(() => {
          useA11yStore.getState().updateSettings({
            reduceMotion: true,
            highContrast: true,
            fontSize: "extra-large",
            announceMessages: false,
          });
          useA11yStore.getState().resetSettings();
        });

        const state = useA11yStore.getState();
        expect(state.reduceMotion).toBe(defaultSettings.reduceMotion);
        expect(state.highContrast).toBe(defaultSettings.highContrast);
        expect(state.fontSize).toBe(defaultSettings.fontSize);
        expect(state.announceMessages).toBe(defaultSettings.announceMessages);
      });
    });
  });

  // ==========================================================================
  // Computed Helpers Tests
  // ==========================================================================

  describe("Computed Helpers", () => {
    describe("getFontSizeClass", () => {
      it("should return correct class for each size", () => {
        const sizes: FontSize[] = ["small", "medium", "large", "extra-large"];

        for (const size of sizes) {
          act(() => {
            useA11yStore.getState().setFontSize(size);
          });
          expect(useA11yStore.getState().getFontSizeClass()).toBe(
            fontSizeClasses[size],
          );
        }
      });
    });

    describe("getFontSizeValue", () => {
      it("should return correct value for each size", () => {
        const sizes: FontSize[] = ["small", "medium", "large", "extra-large"];

        for (const size of sizes) {
          act(() => {
            useA11yStore.getState().setFontSize(size);
          });
          expect(useA11yStore.getState().getFontSizeValue()).toBe(
            fontSizeValues[size],
          );
        }
      });
    });

    describe("getFontSizeMultiplier", () => {
      it("should return correct multiplier for each size", () => {
        const sizes: FontSize[] = ["small", "medium", "large", "extra-large"];

        for (const size of sizes) {
          act(() => {
            useA11yStore.getState().setFontSize(size);
          });
          expect(useA11yStore.getState().getFontSizeMultiplier()).toBe(
            fontSizeMultipliers[size],
          );
        }
      });
    });

    describe("getTargetSizeClass", () => {
      it("should return larger class when largerTargets is true", () => {
        act(() => {
          useA11yStore.getState().setLargerTargets(true);
        });
        expect(useA11yStore.getState().getTargetSizeClass()).toContain("44px");
      });

      it("should return normal class when largerTargets is false", () => {
        act(() => {
          useA11yStore.getState().setLargerTargets(false);
        });
        expect(useA11yStore.getState().getTargetSizeClass()).toContain("36px");
      });
    });
  });

  // ==========================================================================
  // Selectors Tests
  // ==========================================================================

  describe("Selectors", () => {
    it("should select reduceMotion", () => {
      act(() => {
        useA11yStore.getState().setReduceMotion(true);
      });
      expect(selectReduceMotion(useA11yStore.getState())).toBe(true);
    });

    it("should select highContrast", () => {
      act(() => {
        useA11yStore.getState().setHighContrast(true);
      });
      expect(selectHighContrast(useA11yStore.getState())).toBe(true);
    });

    it("should select fontSize", () => {
      act(() => {
        useA11yStore.getState().setFontSize("large");
      });
      expect(selectFontSize(useA11yStore.getState())).toBe("large");
    });

    it("should select screenReaderMode", () => {
      act(() => {
        useA11yStore.getState().setScreenReaderMode(true);
      });
      expect(selectScreenReaderMode(useA11yStore.getState())).toBe(true);
    });

    it("should select largerTargets", () => {
      act(() => {
        useA11yStore.getState().setLargerTargets(true);
      });
      expect(selectLargerTargets(useA11yStore.getState())).toBe(true);
    });

    it("should select showKeyboardHints", () => {
      act(() => {
        useA11yStore.getState().setShowKeyboardHints(true);
      });
      expect(selectShowKeyboardHints(useA11yStore.getState())).toBe(true);
    });

    it("should select announceMessages", () => {
      act(() => {
        useA11yStore.getState().setAnnounceMessages(false);
      });
      expect(selectAnnounceMessages(useA11yStore.getState())).toBe(false);
    });

    it("should select colorScheme", () => {
      act(() => {
        useA11yStore.getState().setColorScheme("dark");
      });
      expect(selectColorScheme(useA11yStore.getState())).toBe("dark");
    });
  });

  // ==========================================================================
  // DOM Application Tests
  // ==========================================================================

  describe("applyA11ySettings", () => {
    beforeEach(() => {
      // Reset document classes and attributes
      document.documentElement.className = "";
      document.body.className = "";
      document.documentElement.removeAttribute("data-contrast");
      document.documentElement.removeAttribute("data-font-size");
      document.documentElement.removeAttribute("data-theme");
    });

    it("should apply reduceMotion class", () => {
      applyA11ySettings({ ...defaultSettings, reduceMotion: true });

      expect(document.documentElement.classList.contains("reduce-motion")).toBe(
        true,
      );
      expect(
        document.documentElement.style.getPropertyValue("--animation-duration"),
      ).toBe("0.01ms");
    });

    it("should remove reduceMotion class when false", () => {
      document.documentElement.classList.add("reduce-motion");
      applyA11ySettings({ ...defaultSettings, reduceMotion: false });

      expect(document.documentElement.classList.contains("reduce-motion")).toBe(
        false,
      );
    });

    it("should apply highContrast class", () => {
      applyA11ySettings({ ...defaultSettings, highContrast: true });

      expect(document.documentElement.classList.contains("high-contrast")).toBe(
        true,
      );
    });

    it("should set contrastMode attribute", () => {
      applyA11ySettings({ ...defaultSettings, contrastMode: "higher" });

      expect(document.documentElement.getAttribute("data-contrast")).toBe(
        "higher",
      );
    });

    it("should set fontSize CSS variable", () => {
      applyA11ySettings({ ...defaultSettings, fontSize: "large" });

      expect(
        document.documentElement.style.getPropertyValue("--base-font-size"),
      ).toBe("18px");
      expect(document.documentElement.getAttribute("data-font-size")).toBe(
        "large",
      );
    });

    it("should apply screenReaderMode class", () => {
      applyA11ySettings({ ...defaultSettings, screenReaderMode: true });

      expect(
        document.documentElement.classList.contains("screen-reader-mode"),
      ).toBe(true);
    });

    it("should apply alwaysShowFocus class", () => {
      applyA11ySettings({ ...defaultSettings, alwaysShowFocus: true });

      expect(
        document.documentElement.classList.contains("always-show-focus"),
      ).toBe(true);
    });

    it("should apply reduceTransparency class", () => {
      applyA11ySettings({ ...defaultSettings, reduceTransparency: true });

      expect(
        document.documentElement.classList.contains("reduce-transparency"),
      ).toBe(true);
    });

    it("should apply dyslexiaFont class to body", () => {
      applyA11ySettings({ ...defaultSettings, dyslexiaFont: true });

      expect(document.body.classList.contains("dyslexia-font")).toBe(true);
    });

    it("should apply largerTargets class", () => {
      applyA11ySettings({ ...defaultSettings, largerTargets: true });

      expect(
        document.documentElement.classList.contains("larger-targets"),
      ).toBe(true);
    });

    it("should apply showKeyboardHints class", () => {
      applyA11ySettings({ ...defaultSettings, showKeyboardHints: true });

      expect(
        document.documentElement.classList.contains("show-keyboard-hints"),
      ).toBe(true);
    });

    it("should apply underlineLinks class", () => {
      applyA11ySettings({ ...defaultSettings, underlineLinks: true });

      expect(
        document.documentElement.classList.contains("underline-links"),
      ).toBe(true);
    });

    it("should set colorScheme attribute for non-system", () => {
      applyA11ySettings({ ...defaultSettings, colorScheme: "dark" });

      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("should remove colorScheme attribute for system", () => {
      document.documentElement.setAttribute("data-theme", "dark");
      applyA11ySettings({ ...defaultSettings, colorScheme: "system" });

      expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    });
  });

  // ==========================================================================
  // CSS Generation Tests
  // ==========================================================================

  describe("generateA11yCSSVariables", () => {
    it("should generate font size variable", () => {
      const css = generateA11yCSSVariables({
        ...defaultSettings,
        fontSize: "large",
      });

      expect(css).toContain("--a11y-font-size: 18px");
    });

    it("should generate motion duration variables", () => {
      const cssWithMotion = generateA11yCSSVariables({
        ...defaultSettings,
        reduceMotion: false,
      });
      const cssReduced = generateA11yCSSVariables({
        ...defaultSettings,
        reduceMotion: true,
      });

      expect(cssWithMotion).toContain("--a11y-motion-duration: 200ms");
      expect(cssReduced).toContain("--a11y-motion-duration: 0.01ms");
    });

    it("should generate focus ring width variable", () => {
      const cssNormal = generateA11yCSSVariables({
        ...defaultSettings,
        alwaysShowFocus: false,
      });
      const cssAlways = generateA11yCSSVariables({
        ...defaultSettings,
        alwaysShowFocus: true,
      });

      expect(cssNormal).toContain("--a11y-focus-ring-width: 2px");
      expect(cssAlways).toContain("--a11y-focus-ring-width: 3px");
    });

    it("should generate target size variable", () => {
      const cssNormal = generateA11yCSSVariables({
        ...defaultSettings,
        largerTargets: false,
      });
      const cssLarger = generateA11yCSSVariables({
        ...defaultSettings,
        largerTargets: true,
      });

      expect(cssNormal).toContain("--a11y-target-size: 36px");
      expect(cssLarger).toContain("--a11y-target-size: 44px");
    });

    it("should generate transparency variable", () => {
      const cssNormal = generateA11yCSSVariables({
        ...defaultSettings,
        reduceTransparency: false,
      });
      const cssReduced = generateA11yCSSVariables({
        ...defaultSettings,
        reduceTransparency: true,
      });

      expect(cssNormal).toContain("--a11y-transparency: 0.95");
      expect(cssReduced).toContain("--a11y-transparency: 1");
    });
  });

  describe("generateA11yCSSRules", () => {
    it("should generate reduceMotion rules", () => {
      const css = generateA11yCSSRules({
        ...defaultSettings,
        reduceMotion: true,
      });

      expect(css).toContain("animation-duration: 0.01ms");
      expect(css).toContain("transition-duration: 0.01ms");
      expect(css).toContain("scroll-behavior: auto");
    });

    it("should generate highContrast rules", () => {
      const css = generateA11yCSSRules({
        ...defaultSettings,
        highContrast: true,
      });

      expect(css).toContain("--background");
      expect(css).toContain("--foreground");
      expect(css).toContain("--border-width: 2px");
    });

    it("should generate alwaysShowFocus rules", () => {
      const css = generateA11yCSSRules({
        ...defaultSettings,
        alwaysShowFocus: true,
      });

      expect(css).toContain("*:focus");
      expect(css).toContain("outline: 3px solid");
    });

    it("should generate underlineLinks rules", () => {
      const css = generateA11yCSSRules({
        ...defaultSettings,
        underlineLinks: true,
      });

      expect(css).toContain("text-decoration: underline");
    });

    it("should generate dyslexiaFont rules", () => {
      const css = generateA11yCSSRules({
        ...defaultSettings,
        dyslexiaFont: true,
      });

      expect(css).toContain("OpenDyslexic");
      expect(css).toContain("letter-spacing");
      expect(css).toContain("line-height");
    });

    it("should return empty string for default settings", () => {
      const css = generateA11yCSSRules(defaultSettings);

      expect(css.trim()).toBe("");
    });
  });
});
