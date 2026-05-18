"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

type Theme = "light" | "dark" | "system";

interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeConfig: ThemeConfig;
  updateThemeConfig: (config: Partial<ThemeConfig>) => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultThemeConfig: ThemeConfig = {
  primary: "#5865F2",
  secondary: "#7B68EE",
  accent: "#00BFA5",
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [themeConfig, setThemeConfig] =
    useState<ThemeConfig>(defaultThemeConfig);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const applyTheme = useCallback((newTheme: Theme) => {
    setIsTransitioning(true);
    const root = window.document.documentElement;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";

    // Add transition class for smooth color changes
    root.style.setProperty(
      "transition",
      "background-color 0.3s ease-in-out, color 0.3s ease-in-out",
    );

    root.classList.remove("light", "dark");

    if (newTheme === "system") {
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }

    // Remove transition class after animation completes
    setTimeout(() => {
      root.style.removeProperty("transition");
      setIsTransitioning(false);
    }, 300);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  useEffect(() => {
    // Apply custom theme colors with smooth transition
    const root = window.document.documentElement;

    // Animate color changes
    root.style.setProperty("transition", "all 0.3s ease-in-out");
    root.style.setProperty("--primary", themeConfig.primary);
    root.style.setProperty("--secondary", themeConfig.secondary);
    root.style.setProperty("--accent", themeConfig.accent);

    const timer = setTimeout(() => {
      root.style.removeProperty("transition");
    }, 300);

    return () => clearTimeout(timer);
  }, [themeConfig]);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme]);

  const updateThemeConfig = (config: Partial<ThemeConfig>) => {
    setThemeConfig({ ...themeConfig, ...config });
  };

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: handleSetTheme,
        themeConfig,
        updateThemeConfig,
        isTransitioning,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
