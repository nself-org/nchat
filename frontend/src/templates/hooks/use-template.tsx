"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// useTemplate Hook
// ═══════════════════════════════════════════════════════════════════════════════
//
// React hook for accessing the current platform template configuration.
// Handles loading, caching, and applying templates throughout the application.
//
// ═══════════════════════════════════════════════════════════════════════════════

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import type {
  PlatformTemplate,
  PartialTemplate,
  TemplateId,
  ThemeColors,
  LayoutConfig,
  FeatureConfig,
  TerminologyConfig,
} from "../types";
import {
  loadTemplate,
  loadEnvTemplate,
  applyEnvOverrides,
  customizeTemplate,
  generateTemplateCSS,
  getEnvTemplateId,
} from "../index";

// ─────────────────────────────────────────────────────────────────────────────
// Template Context
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateContextValue {
  // Current template
  template: PlatformTemplate | null;
  templateId: TemplateId;
  isLoading: boolean;
  error: Error | null;

  // Theme
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark" | "system") => void;
  colors: ThemeColors;

  // Layout
  layout: LayoutConfig;

  // Features
  features: FeatureConfig;
  isFeatureEnabled: (feature: keyof FeatureConfig) => boolean;

  // Terminology
  terminology: TerminologyConfig;
  t: (
    key: keyof TerminologyConfig,
    replacements?: Record<string, string>,
  ) => string;

  // Customization
  switchTemplate: (templateId: TemplateId) => Promise<void>;
  applyOverrides: (overrides: PartialTemplate) => void;
}

const TemplateContext = createContext<TemplateContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Template Provider
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateProviderProps {
  children: ReactNode;
  initialTemplateId?: TemplateId;
}

export function TemplateProvider({
  children,
  initialTemplateId,
}: TemplateProviderProps) {
  const [template, setTemplate] = useState<PlatformTemplate | null>(null);
  const [templateId, setTemplateId] = useState<TemplateId>(
    initialTemplateId ?? getEnvTemplateId(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [theme, setThemeState] = useState<"light" | "dark">("dark");
  const [overrides, setOverrides] = useState<PartialTemplate>({});

  // Load initial template
  useEffect(() => {
    async function loadInitialTemplate() {
      setIsLoading(true);
      setError(null);

      try {
        let loadedTemplate: PlatformTemplate;

        if (initialTemplateId) {
          loadedTemplate = await loadTemplate(initialTemplateId);
        } else {
          loadedTemplate = await loadEnvTemplate();
        }

        // Apply environment variable overrides
        loadedTemplate = applyEnvOverrides(loadedTemplate);

        setTemplate(loadedTemplate);

        // Set initial theme mode
        if (loadedTemplate.theme.defaultMode === "system") {
          const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)",
          ).matches;
          setThemeState(prefersDark ? "dark" : "light");
        } else {
          setThemeState(loadedTemplate.theme.defaultMode);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load template"),
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialTemplate();
  }, [initialTemplateId]);

  // Apply template CSS to document
  useEffect(() => {
    if (!template) return;

    const finalTemplate =
      Object.keys(overrides).length > 0
        ? customizeTemplate(template, overrides)
        : template;

    // Generate and inject CSS
    const css = generateTemplateCSS(finalTemplate);
    let styleElement = document.getElementById(
      "template-css",
    ) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = "template-css";
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = css;

    // Apply theme class to document
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);

    return () => {
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [template, theme, overrides]);

  // Set theme with system preference support
  const setTheme = useCallback((newTheme: "light" | "dark" | "system") => {
    if (newTheme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setThemeState(prefersDark ? "dark" : "light");

      // Listen for system preference changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        setThemeState(e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      setThemeState(newTheme);
    }
  }, []);

  // Switch to a different template
  const switchTemplate = useCallback(
    async (newTemplateId: TemplateId) => {
      setIsLoading(true);
      setError(null);

      try {
        let loadedTemplate = await loadTemplate(newTemplateId);
        loadedTemplate = applyEnvOverrides(loadedTemplate);

        if (Object.keys(overrides).length > 0) {
          loadedTemplate = customizeTemplate(loadedTemplate, overrides);
        }

        setTemplate(loadedTemplate);
        setTemplateId(newTemplateId);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to switch template"),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [overrides],
  );

  // Apply custom overrides
  const applyOverrides = useCallback((newOverrides: PartialTemplate) => {
    setOverrides((prev) => ({
      ...prev,
      ...newOverrides,
    }));
  }, []);

  // Get current colors based on theme
  const colors = useMemo(() => {
    if (!template) {
      // Return empty colors while loading
      return {} as ThemeColors;
    }
    return theme === "dark" ? template.theme.dark : template.theme.light;
  }, [template, theme]);

  // Get current layout
  const layout = useMemo(() => {
    if (!template) return {} as LayoutConfig;
    return template.layout;
  }, [template]);

  // Get current features
  const features = useMemo(() => {
    if (!template) return {} as FeatureConfig;
    return template.features;
  }, [template]);

  // Check if a feature is enabled
  const isFeatureEnabled = useCallback(
    (feature: keyof FeatureConfig): boolean => {
      if (!template) return false;
      const value = template.features[feature];
      return typeof value === "boolean" ? value : Boolean(value);
    },
    [template],
  );

  // Get current terminology
  const terminology = useMemo(() => {
    if (!template) return {} as TerminologyConfig;
    return template.terminology;
  }, [template]);

  // Terminology translation helper
  const t = useCallback(
    (
      key: keyof TerminologyConfig,
      replacements?: Record<string, string>,
    ): string => {
      if (!template) return key as string;
      let text = template.terminology[key] || (key as string);

      if (replacements) {
        for (const [placeholder, value] of Object.entries(replacements)) {
          text = text.replace(`{{${placeholder}}}`, value);
        }
      }

      return text;
    },
    [template],
  );

  const value: TemplateContextValue = {
    template,
    templateId,
    isLoading,
    error,
    theme,
    setTheme,
    colors,
    layout,
    features,
    isFeatureEnabled,
    terminology,
    t,
    switchTemplate,
    applyOverrides,
  };

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useTemplate Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Access the current platform template configuration
 */
export function useTemplate(): TemplateContextValue {
  const context = useContext(TemplateContext);

  if (!context) {
    throw new Error("useTemplate must be used within a TemplateProvider");
  }

  return context;
}

/**
 * Get just the theme colors
 */
export function useThemeColors(): ThemeColors {
  const { colors } = useTemplate();
  return colors;
}

/**
 * Get just the layout config
 */
export function useLayout(): LayoutConfig {
  const { layout } = useTemplate();
  return layout;
}

/**
 * Get just the feature config
 */
export function useFeatures(): FeatureConfig {
  const { features } = useTemplate();
  return features;
}

/**
 * Check if a specific feature is enabled
 */
export function useFeature(feature: keyof FeatureConfig): boolean {
  const { isFeatureEnabled } = useTemplate();
  return isFeatureEnabled(feature);
}

/**
 * Get the terminology translation function
 */
export function useTerminology() {
  const { terminology, t } = useTemplate();
  return { terminology, t };
}

export default useTemplate;
