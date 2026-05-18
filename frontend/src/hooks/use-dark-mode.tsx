"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";

// ============================================================================
// Types
// ============================================================================

export type ColorScheme = "light" | "dark" | "system";

export interface UseDarkModeOptions {
  defaultValue?: ColorScheme;
  storageKey?: string;
  onChange?: (isDark: boolean) => void;
}

export interface UseDarkModeReturn {
  isDark: boolean;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  toggle: () => void;
  systemPreference: "light" | "dark";
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "nchat-color-scheme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing dark mode with system preference detection
 *
 * Features:
 * - System preference detection
 * - Persistent user override
 * - Smooth transitions
 * - SSR-safe
 * - Automatic theme switching
 *
 * @example
 * ```tsx
 * const { isDark, toggle, colorScheme, setColorScheme } = useDarkMode()
 *
 * // Toggle dark mode
 * <button onClick={toggle}>Toggle Dark Mode</button>
 *
 * // Set specific scheme
 * <button onClick={() => setColorScheme('dark')}>Dark</button>
 * <button onClick={() => setColorScheme('light')}>Light</button>
 * <button onClick={() => setColorScheme('system')}>System</button>
 * ```
 */
export function useDarkMode(
  options: UseDarkModeOptions = {},
): UseDarkModeReturn {
  const {
    defaultValue = "system",
    storageKey = STORAGE_KEY,
    onChange,
  } = options;

  // Get system preference
  const [systemPreference, setSystemPreference] = useState<"light" | "dark">(
    () => {
      if (typeof window === "undefined") return "light";
      return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
    },
  );

  // Get user preference (with localStorage)
  const [colorScheme, setStoredColorScheme] = useLocalStorage<ColorScheme>(
    storageKey,
    defaultValue,
  );

  // Calculate effective dark mode state
  const isDark =
    colorScheme === "dark" ||
    (colorScheme === "system" && systemPreference === "dark");

  // Update color scheme
  const setColorScheme = useCallback(
    (scheme: ColorScheme) => {
      setStoredColorScheme(scheme);
    },
    [setStoredColorScheme],
  );

  // Toggle dark mode
  const toggle = useCallback(() => {
    setColorScheme(isDark ? "light" : "dark");
  }, [isDark, setColorScheme]);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(MEDIA_QUERY);

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemPreference(e.matches ? "dark" : "light");
    };

    // Initial check
    handleChange(mediaQuery);

    // Add listener (supports both old and new API)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // Remove both classes first
    root.classList.remove("light", "dark");

    // Add appropriate class
    root.classList.add(isDark ? "dark" : "light");

    // Update color-scheme CSS property for native browser elements
    root.style.colorScheme = isDark ? "dark" : "light";

    // Call onChange callback
    onChange?.(isDark);
  }, [isDark, onChange]);

  return {
    isDark,
    colorScheme,
    setColorScheme,
    toggle,
    systemPreference,
  };
}

// ============================================================================
// React Context Version (Optional)
// ============================================================================

import { createContext, useContext, ReactNode } from "react";

interface DarkModeContextValue extends UseDarkModeReturn {
  // Additional context-specific values can go here
}

const DarkModeContext = createContext<DarkModeContextValue | undefined>(
  undefined,
);

export interface DarkModeProviderProps {
  children: ReactNode;
  options?: UseDarkModeOptions;
}

/**
 * Dark mode provider component
 * Wraps app with dark mode context
 */
export function DarkModeProvider({ children, options }: DarkModeProviderProps) {
  const darkMode = useDarkMode(options);

  return (
    <DarkModeContext.Provider value={darkMode}>
      {children}
    </DarkModeContext.Provider>
  );
}

/**
 * Hook to access dark mode context
 * Must be used within DarkModeProvider
 */
export function useDarkModeContext(): DarkModeContextValue {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error("useDarkModeContext must be used within DarkModeProvider");
  }
  return context;
}
