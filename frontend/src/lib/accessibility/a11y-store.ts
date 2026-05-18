import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type FontSize = "small" | "medium" | "large" | "extra-large";
export type ContrastMode = "normal" | "high" | "higher";

export interface A11ySettings {
  /** Reduce motion for animations */
  reduceMotion: boolean;
  /** High contrast mode */
  highContrast: boolean;
  /** Contrast level when high contrast is enabled */
  contrastMode: ContrastMode;
  /** Font size preference */
  fontSize: FontSize;
  /** Screen reader optimization mode */
  screenReaderMode: boolean;
  /** Show focus indicators always (not just on keyboard focus) */
  alwaysShowFocus: boolean;
  /** Reduce transparency effects */
  reduceTransparency: boolean;
  /** Dyslexia-friendly font */
  dyslexiaFont: boolean;
  /** Larger click/touch targets */
  largerTargets: boolean;
  /** Keyboard navigation hints */
  showKeyboardHints: boolean;
  /** Captions/subtitles preference */
  preferCaptions: boolean;
  /** Announce messages immediately (screen reader) */
  announceMessages: boolean;
}

export interface A11yState extends A11ySettings {
  // Actions
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
  // Bulk actions
  updateSettings: (settings: Partial<A11ySettings>) => void;
  resetSettings: () => void;
  // Computed
  getFontSizeClass: () => string;
  getFontSizeValue: () => string;
}

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
};

const fontSizeClasses: Record<FontSize, string> = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
  "extra-large": "text-xl",
};

const fontSizeValues: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
  "extra-large": "20px",
};

export const useA11yStore = create<A11yState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setReduceMotion: (value) => set({ reduceMotion: value }),
      setHighContrast: (value) => set({ highContrast: value }),
      setContrastMode: (mode) => set({ contrastMode: mode }),
      setFontSize: (size) => set({ fontSize: size }),
      setScreenReaderMode: (value) => set({ screenReaderMode: value }),
      setAlwaysShowFocus: (value) => set({ alwaysShowFocus: value }),
      setReduceTransparency: (value) => set({ reduceTransparency: value }),
      setDyslexiaFont: (value) => set({ dyslexiaFont: value }),
      setLargerTargets: (value) => set({ largerTargets: value }),
      setShowKeyboardHints: (value) => set({ showKeyboardHints: value }),
      setPreferCaptions: (value) => set({ preferCaptions: value }),
      setAnnounceMessages: (value) => set({ announceMessages: value }),

      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),

      resetSettings: () => set(defaultSettings),

      getFontSizeClass: () => fontSizeClasses[get().fontSize],
      getFontSizeValue: () => fontSizeValues[get().fontSize],
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
      }),
    },
  ),
);

/**
 * Apply accessibility settings to the document
 */
export function applyA11ySettings(settings: A11ySettings): void {
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
  if (settings.dyslexiaFont) {
    body.classList.add("dyslexia-font");
  } else {
    body.classList.remove("dyslexia-font");
  }

  // Larger targets
  root.classList.toggle("larger-targets", settings.largerTargets);

  // Keyboard hints
  root.classList.toggle("show-keyboard-hints", settings.showKeyboardHints);
}

/**
 * Generate CSS custom properties for accessibility
 */
export function generateA11yCSSVariables(settings: A11ySettings): string {
  const vars: Record<string, string> = {
    "--a11y-font-size": fontSizeValues[settings.fontSize],
    "--a11y-motion-duration": settings.reduceMotion ? "0.01ms" : "200ms",
    "--a11y-transition-duration": settings.reduceMotion ? "0.01ms" : "150ms",
    "--a11y-focus-ring-width": settings.alwaysShowFocus ? "3px" : "2px",
    "--a11y-target-size": settings.largerTargets ? "48px" : "40px",
    "--a11y-min-target-size": settings.largerTargets ? "44px" : "36px",
  };

  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join("\n");
}

export default useA11yStore;
