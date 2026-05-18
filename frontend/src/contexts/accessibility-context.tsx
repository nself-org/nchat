"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";

import { logger } from "@/lib/logger";

/**
 * Accessibility Context
 *
 * Global accessibility settings for the application including:
 * - High contrast mode
 * - Font size adjustments
 * - Reduced motion
 * - Keyboard-only navigation
 * - Screen reader optimizations
 */

// ============================================================================
// Types
// ============================================================================

export type FontSize = "small" | "medium" | "large" | "x-large";
export type ColorBlindMode =
  | "none"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "monochrome";
export type AnimationLevel = "full" | "reduced" | "none";

export interface AccessibilitySettings {
  // Visual settings
  highContrast: boolean;
  fontSize: FontSize;
  colorBlindMode: ColorBlindMode;

  // Motion settings
  reduceMotion: boolean;
  animationLevel: AnimationLevel;

  // Navigation settings
  keyboardOnly: boolean;
  showFocusOutline: boolean;
  showSkipLinks: boolean;

  // Screen reader settings
  screenReaderMode: boolean;
  announceNotifications: boolean;
  announceTyping: boolean;
  verboseDescriptions: boolean;

  // Advanced settings
  enableSoundEffects: boolean;
  enableHapticFeedback: boolean;
  respectSystemPreferences: boolean;
}

export interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  announce: (message: string, priority?: "polite" | "assertive") => void;
  getFontSizeMultiplier: () => number;
  isReducedMotion: () => boolean;
}

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: AccessibilitySettings = {
  // Visual
  highContrast: false,
  fontSize: "medium",
  colorBlindMode: "none",

  // Motion
  reduceMotion: false,
  animationLevel: "full",

  // Navigation
  keyboardOnly: false,
  showFocusOutline: true,
  showSkipLinks: true,

  // Screen reader
  screenReaderMode: false,
  announceNotifications: true,
  announceTyping: false,
  verboseDescriptions: false,

  // Advanced
  enableSoundEffects: false,
  enableHapticFeedback: true,
  respectSystemPreferences: true,
};

const STORAGE_KEY = "accessibility-settings";

// ============================================================================
// Context
// ============================================================================

const AccessibilityContext = createContext<
  AccessibilityContextType | undefined
>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] =
    useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    setMounted(true);

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AccessibilitySettings;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      logger.error("Failed to load accessibility settings:", error);
    }
  }, []);

  // Apply system preferences if enabled
  useEffect(() => {
    if (!mounted || !settings.respectSystemPreferences) return;

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    if (prefersReducedMotion.matches && !settings.reduceMotion) {
      updateSettings({
        reduceMotion: true,
        animationLevel: "reduced",
      });
    }

    // Check for prefers-contrast
    const prefersContrast = window.matchMedia("(prefers-contrast: more)");
    if (prefersContrast.matches && !settings.highContrast) {
      updateSettings({ highContrast: true });
    }

    // Listen for changes
    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (settings.respectSystemPreferences) {
        updateSettings({
          reduceMotion: e.matches,
          animationLevel: e.matches ? "reduced" : "full",
        });
      }
    };

    const handleContrastChange = (e: MediaQueryListEvent) => {
      if (settings.respectSystemPreferences) {
        updateSettings({ highContrast: e.matches });
      }
    };

    prefersReducedMotion.addEventListener("change", handleMotionChange);
    prefersContrast.addEventListener("change", handleContrastChange);

    return () => {
      prefersReducedMotion.removeEventListener("change", handleMotionChange);
      prefersContrast.removeEventListener("change", handleContrastChange);
    };
  }, [mounted, settings.respectSystemPreferences]);

  // Apply settings to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // High contrast
    root.classList.toggle("high-contrast", settings.highContrast);

    // Font size
    root.setAttribute("data-font-size", settings.fontSize);
    const multiplier = getFontSizeMultiplier();
    root.style.setProperty("--font-size-multiplier", multiplier.toString());

    // Color blind mode
    root.setAttribute("data-colorblind-mode", settings.colorBlindMode);

    // Reduce motion
    root.classList.toggle("reduce-motion", settings.reduceMotion);
    root.setAttribute("data-animation-level", settings.animationLevel);

    // Keyboard only
    root.classList.toggle("keyboard-only", settings.keyboardOnly);

    // Focus outline
    root.classList.toggle("show-focus-outline", settings.showFocusOutline);

    // Screen reader mode
    root.classList.toggle("screen-reader-mode", settings.screenReaderMode);

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      logger.error("Failed to save accessibility settings:", error);
    }
  }, [settings, mounted]);

  // Track keyboard usage
  useEffect(() => {
    if (!mounted) return;

    let isUsingKeyboard = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab key indicates keyboard navigation
      if (e.key === "Tab" && !isUsingKeyboard) {
        isUsingKeyboard = true;
        document.documentElement.classList.add("using-keyboard");
      }
    };

    const handleMouseDown = () => {
      if (isUsingKeyboard) {
        isUsingKeyboard = false;
        document.documentElement.classList.remove("using-keyboard");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [mounted]);

  // Update settings
  const updateSettings = useCallback(
    (newSettings: Partial<AccessibilitySettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
    },
    [],
  );

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Announce to screen readers
  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (!mounted) return;

      // Find or create live region
      let liveRegion = document.getElementById(`aria-live-${priority}`);

      if (!liveRegion) {
        liveRegion = document.createElement("div");
        liveRegion.id = `aria-live-${priority}`;
        liveRegion.setAttribute("aria-live", priority);
        liveRegion.setAttribute("aria-atomic", "true");
        liveRegion.className = "sr-only";
        document.body.appendChild(liveRegion);
      }

      // Clear and set new message
      liveRegion.textContent = "";
      setTimeout(() => {
        liveRegion!.textContent = message;
      }, 100);
    },
    [mounted],
  );

  // Get font size multiplier
  const getFontSizeMultiplier = useCallback((): number => {
    switch (settings.fontSize) {
      case "small":
        return 0.875;
      case "medium":
        return 1.0;
      case "large":
        return 1.125;
      case "x-large":
        return 1.25;
      default:
        return 1.0;
    }
  }, [settings.fontSize]);

  // Check if motion should be reduced
  const isReducedMotion = useCallback((): boolean => {
    return settings.reduceMotion || settings.animationLevel !== "full";
  }, [settings.reduceMotion, settings.animationLevel]);

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        announce,
        getFontSizeMultiplier,
        isReducedMotion,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error(
      "useAccessibility must be used within an AccessibilityProvider",
    );
  }
  return context;
}
