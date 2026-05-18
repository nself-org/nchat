/**
 * Accessibility Store
 *
 * Zustand store for managing accessibility preferences including
 * high contrast mode, reduced motion, font size scaling, and more.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { devtools } from "zustand/middleware";

// ============================================================================
// Types
// ============================================================================

export type FontSize = "small" | "medium" | "large" | "extra-large";
export type ContrastMode = "normal" | "high" | "higher";
export type ColorScheme = "light" | "dark" | "system";

export interface A11ySettings {
  /** Enable reduced motion for animations */
  reduceMotion: boolean;
  /** Enable high contrast mode */
  highContrast: boolean;
  /** Contrast level when high contrast is enabled */
  contrastMode: ContrastMode;
  /** Font size preference */
  fontSize: FontSize;
  /** Screen reader optimization mode */
  screenReaderMode: boolean;
  /** Always show focus indicators (not just on keyboard focus) */
  alwaysShowFocus: boolean;
  /** Reduce transparency effects */
  reduceTransparency: boolean;
  /** Use dyslexia-friendly font */
  dyslexiaFont: boolean;
  /** Enable larger click/touch targets */
  largerTargets: boolean;
  /** Show keyboard navigation hints */
  showKeyboardHints: boolean;
  /** Prefer captions/subtitles */
  preferCaptions: boolean;
  /** Announce new messages immediately (for screen readers) */
  announceMessages: boolean;
  /** Color scheme preference */
  colorScheme: ColorScheme;
  /** Enable auto-focus management */
  autoFocusManagement: boolean;
  /** Link underline preference */
  underlineLinks: boolean;
}

export interface A11yState extends A11ySettings {
  // Individual setters
  setReduceMotion: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
  setContrastMode: (mode: ContrastMode) => void;
  setFontSize: (size: FontSize) => void;
  setScreenReaderMode: (value: boolean) => void;
  setAlwaysShowFocus: (value: boolean) => void;
  setReduceTransparency: (value: boolean) => void;
  setDyslexiaFont: (value: boolean) => void;
  setLargerTargets: (value: boolean) => void;
  setShowKeyboardHints: (value: boolean) => void;
  setPreferCaptions: (value: boolean) => void;
  setAnnounceMessages: (value: boolean) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setAutoFocusManagement: (value: boolean) => void;
  setUnderlineLinks: (value: boolean) => void;

  // Bulk actions
  updateSettings: (settings: Partial<A11ySettings>) => void;
  resetSettings: () => void;

  // Computed helpers
  getFontSizeClass: () => string;
  getFontSizeValue: () => string;
  getFontSizeMultiplier: () => number;
  getTargetSizeClass: () => string;
}

// ============================================================================
// Constants
// ============================================================================

export const fontSizeClasses: Record<FontSize, string> = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
  "extra-large": "text-xl",
};

export const fontSizeValues: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
  "extra-large": "20px",
};

export const fontSizeMultipliers: Record<FontSize, number> = {
  small: 0.875,
  medium: 1,
  large: 1.125,
  "extra-large": 1.25,
};

export const targetSizeClasses: Record<string, string> = {
  true: "min-h-[44px] min-w-[44px]",
  false: "min-h-[36px] min-w-[36px]",
};

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
// Store
// ============================================================================

export const useA11yStore = create<A11yState>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultSettings,

        // Individual setters
        setReduceMotion: (value) =>
          set({ reduceMotion: value }, false, "a11y/setReduceMotion"),

        setHighContrast: (value) =>
          set({ highContrast: value }, false, "a11y/setHighContrast"),

        setContrastMode: (mode) =>
          set({ contrastMode: mode }, false, "a11y/setContrastMode"),

        setFontSize: (size) =>
          set({ fontSize: size }, false, "a11y/setFontSize"),

        setScreenReaderMode: (value) =>
          set({ screenReaderMode: value }, false, "a11y/setScreenReaderMode"),

        setAlwaysShowFocus: (value) =>
          set({ alwaysShowFocus: value }, false, "a11y/setAlwaysShowFocus"),

        setReduceTransparency: (value) =>
          set(
            { reduceTransparency: value },
            false,
            "a11y/setReduceTransparency",
          ),

        setDyslexiaFont: (value) =>
          set({ dyslexiaFont: value }, false, "a11y/setDyslexiaFont"),

        setLargerTargets: (value) =>
          set({ largerTargets: value }, false, "a11y/setLargerTargets"),

        setShowKeyboardHints: (value) =>
          set({ showKeyboardHints: value }, false, "a11y/setShowKeyboardHints"),

        setPreferCaptions: (value) =>
          set({ preferCaptions: value }, false, "a11y/setPreferCaptions"),

        setAnnounceMessages: (value) =>
          set({ announceMessages: value }, false, "a11y/setAnnounceMessages"),

        setColorScheme: (scheme) =>
          set({ colorScheme: scheme }, false, "a11y/setColorScheme"),

        setAutoFocusManagement: (value) =>
          set(
            { autoFocusManagement: value },
            false,
            "a11y/setAutoFocusManagement",
          ),

        setUnderlineLinks: (value) =>
          set({ underlineLinks: value }, false, "a11y/setUnderlineLinks"),

        // Bulk actions
        updateSettings: (settings) =>
          set(
            (state) => ({ ...state, ...settings }),
            false,
            "a11y/updateSettings",
          ),

        resetSettings: () => set(defaultSettings, false, "a11y/resetSettings"),

        // Computed helpers
        getFontSizeClass: () => fontSizeClasses[get().fontSize],

        getFontSizeValue: () => fontSizeValues[get().fontSize],

        getFontSizeMultiplier: () => fontSizeMultipliers[get().fontSize],

        getTargetSizeClass: () =>
          targetSizeClasses[String(get().largerTargets) as "true" | "false"],
      }),
      {
        name: "nchat-a11y-settings",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          reduceMotion: state.reduceMotion,
          highContrast: state.highContrast,
          contrastMode: state.contrastMode,
          fontSize: state.fontSize,
          screenReaderMode: state.screenReaderMode,
          alwaysShowFocus: state.alwaysShowFocus,
          reduceTransparency: state.reduceTransparency,
          dyslexiaFont: state.dyslexiaFont,
          largerTargets: state.largerTargets,
          showKeyboardHints: state.showKeyboardHints,
          preferCaptions: state.preferCaptions,
          announceMessages: state.announceMessages,
          colorScheme: state.colorScheme,
          autoFocusManagement: state.autoFocusManagement,
          underlineLinks: state.underlineLinks,
        }),
      },
    ),
    { name: "a11y-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectReduceMotion = (state: A11yState): boolean =>
  state.reduceMotion;
export const selectHighContrast = (state: A11yState): boolean =>
  state.highContrast;
export const selectFontSize = (state: A11yState): FontSize => state.fontSize;
export const selectScreenReaderMode = (state: A11yState): boolean =>
  state.screenReaderMode;
export const selectLargerTargets = (state: A11yState): boolean =>
  state.largerTargets;
export const selectShowKeyboardHints = (state: A11yState): boolean =>
  state.showKeyboardHints;
export const selectAnnounceMessages = (state: A11yState): boolean =>
  state.announceMessages;
export const selectColorScheme = (state: A11yState): ColorScheme =>
  state.colorScheme;

// ============================================================================
// DOM Application Utilities
// ============================================================================

/**
 * Applies accessibility settings to the document
 */
export function applyA11ySettings(settings: A11ySettings): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const body = document.body;

  // Reduce motion
  if (settings.reduceMotion) {
    root.classList.add("reduce-motion");
    root.style.setProperty("--animation-duration", "0.01ms");
    root.style.setProperty("--transition-duration", "0.01ms");
  } else {
    root.classList.remove("reduce-motion");
    root.style.removeProperty("--animation-duration");
    root.style.removeProperty("--transition-duration");
  }

  // High contrast
  root.classList.toggle("high-contrast", settings.highContrast);
  root.setAttribute("data-contrast", settings.contrastMode);

  // Font size
  root.style.setProperty("--base-font-size", fontSizeValues[settings.fontSize]);
  root.setAttribute("data-font-size", settings.fontSize);

  // Screen reader mode
  root.classList.toggle("screen-reader-mode", settings.screenReaderMode);

  // Always show focus
  root.classList.toggle("always-show-focus", settings.alwaysShowFocus);

  // Reduce transparency
  root.classList.toggle("reduce-transparency", settings.reduceTransparency);

  // Dyslexia font
  body.classList.toggle("dyslexia-font", settings.dyslexiaFont);

  // Larger targets
  root.classList.toggle("larger-targets", settings.largerTargets);

  // Keyboard hints
  root.classList.toggle("show-keyboard-hints", settings.showKeyboardHints);

  // Underline links
  root.classList.toggle("underline-links", settings.underlineLinks);

  // Color scheme
  if (settings.colorScheme !== "system") {
    root.setAttribute("data-theme", settings.colorScheme);
  } else {
    root.removeAttribute("data-theme");
  }
}

/**
 * Generates CSS custom properties for accessibility settings
 */
export function generateA11yCSSVariables(settings: A11ySettings): string {
  const vars: Record<string, string> = {
    "--a11y-font-size": fontSizeValues[settings.fontSize],
    "--a11y-font-multiplier": String(fontSizeMultipliers[settings.fontSize]),
    "--a11y-motion-duration": settings.reduceMotion ? "0.01ms" : "200ms",
    "--a11y-transition-duration": settings.reduceMotion ? "0.01ms" : "150ms",
    "--a11y-focus-ring-width": settings.alwaysShowFocus ? "3px" : "2px",
    "--a11y-target-size": settings.largerTargets ? "44px" : "36px",
    "--a11y-min-target-size": settings.largerTargets ? "44px" : "36px",
    "--a11y-transparency": settings.reduceTransparency ? "1" : "0.95",
  };

  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join("\n");
}

/**
 * Creates CSS rules for accessibility settings
 */
export function generateA11yCSSRules(settings: A11ySettings): string {
  const rules: string[] = [];

  if (settings.reduceMotion) {
    rules.push(`
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `);
  }

  if (settings.highContrast) {
    rules.push(`
      :root {
        --background: #ffffff;
        --foreground: #000000;
        --border-width: 2px;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --background: #000000;
          --foreground: #ffffff;
        }
      }
    `);
  }

  if (settings.alwaysShowFocus) {
    rules.push(`
      *:focus {
        outline: 3px solid var(--ring, #3b82f6) !important;
        outline-offset: 2px !important;
      }
    `);
  }

  if (settings.underlineLinks) {
    rules.push(`
      a {
        text-decoration: underline !important;
      }
    `);
  }

  if (settings.dyslexiaFont) {
    rules.push(`
      body {
        font-family: 'OpenDyslexic', 'Comic Sans MS', sans-serif !important;
        letter-spacing: 0.05em !important;
        word-spacing: 0.1em !important;
        line-height: 1.8 !important;
      }
    `);
  }

  return rules.join("\n");
}

export default useA11yStore;
