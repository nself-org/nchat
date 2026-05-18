/**
 * Theme Customizer Hook
 *
 * Provides state and actions for theme customization.
 * Handles preset loading, color changes, typography, and export/import.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useAppConfig } from "@/contexts/app-config-context";
import type { AppConfig } from "@/config/app-config";
import { ThemeColors } from "@/lib/theme-presets";
import { logger } from "@/lib/logger";
import {
  CustomThemeConfig,
  defaultCustomTheme,
  createThemeFromPreset,
  applyCustomTheme,
  exportThemeJSON,
  importThemeJSON,
  generateThemeShareURL,
  saveCustomThemeToStorage,
  loadCustomThemeFromStorage,
  clearCustomThemeFromStorage,
} from "@/lib/theme/custom-theme";

export interface UseThemeCustomizerReturn {
  // Current theme state
  theme: CustomThemeConfig;
  isModified: boolean;
  isLoading: boolean;

  // Color actions
  updateColor: (key: keyof ThemeColors, value: string) => void;
  updateColors: (colors: Partial<ThemeColors>) => void;
  resetColor: (key: keyof ThemeColors) => void;
  resetAllColors: () => void;

  // Typography actions
  setFontFamily: (font: string) => void;
  setFontScale: (scale: number) => void;

  // Spacing actions
  setBorderRadius: (radius: string) => void;
  setSpacingScale: (scale: number) => void;

  // Color scheme
  setColorScheme: (scheme: "light" | "dark" | "system") => void;

  // Custom CSS
  setCustomCSS: (css: string) => void;

  // Preset actions
  loadPreset: (presetKey: string, colorScheme?: "light" | "dark") => void;
  resetToPreset: () => void;

  // Save/Load actions
  saveTheme: () => Promise<void>;
  loadTheme: () => void;
  resetTheme: () => void;

  // Import/Export
  exportJSON: () => string;
  importJSON: (json: string) => void;
  generateShareURL: () => string;
  downloadJSON: () => void;
  copyJSON: () => Promise<void>;
}

/**
 * Hook for theme customization
 */
export function useThemeCustomizer(): UseThemeCustomizerReturn {
  const { config, updateConfig } = useAppConfig();
  const [theme, setTheme] = useState<CustomThemeConfig>(defaultCustomTheme);
  const [originalTheme, setOriginalTheme] =
    useState<CustomThemeConfig>(defaultCustomTheme);
  const [isModified, setIsModified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme from AppConfig or localStorage
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Try to load from localStorage first
        const storedTheme = loadCustomThemeFromStorage();
        if (storedTheme) {
          setTheme(storedTheme);
          setOriginalTheme(storedTheme);
          applyCustomTheme(storedTheme);
          setIsLoading(false);
          return;
        }

        // Otherwise, create from AppConfig
        const configTheme: CustomThemeConfig = {
          colors: {
            primaryColor: config.theme.primaryColor,
            secondaryColor: config.theme.secondaryColor,
            accentColor: config.theme.accentColor,
            backgroundColor: config.theme.backgroundColor,
            surfaceColor: config.theme.surfaceColor,
            textColor: config.theme.textColor,
            mutedColor: config.theme.mutedColor,
            borderColor: config.theme.borderColor,
            buttonPrimaryBg: config.theme.buttonPrimaryBg,
            buttonPrimaryText: config.theme.buttonPrimaryText,
            buttonSecondaryBg: config.theme.buttonSecondaryBg,
            buttonSecondaryText: config.theme.buttonSecondaryText,
            successColor: config.theme.successColor,
            warningColor: config.theme.warningColor,
            errorColor: config.theme.errorColor,
            infoColor: config.theme.infoColor,
          },
          fontFamily: config.theme.fontFamily || defaultCustomTheme.fontFamily,
          fontScale: 1.0,
          borderRadius:
            config.theme.borderRadius || defaultCustomTheme.borderRadius,
          spacingScale: 1.0,
          customCSS: config.theme.customCSS,
          colorScheme: config.theme.colorScheme || "dark",
          preset: config.theme.preset,
        };

        setTheme(configTheme);
        setOriginalTheme(configTheme);
        applyCustomTheme(configTheme);
      } catch (error) {
        logger.error("Failed to initialize theme:", error);
        setTheme(defaultCustomTheme);
        setOriginalTheme(defaultCustomTheme);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, [config.theme]);

  // Check if theme has been modified
  useEffect(() => {
    const hasChanged = JSON.stringify(theme) !== JSON.stringify(originalTheme);
    setIsModified(hasChanged);
  }, [theme, originalTheme]);

  // Apply theme changes to DOM
  useEffect(() => {
    if (!isLoading) {
      applyCustomTheme(theme);
    }
  }, [theme, isLoading]);

  /**
   * Update a single color
   */
  const updateColor = useCallback((key: keyof ThemeColors, value: string) => {
    setTheme((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: value,
      },
    }));
  }, []);

  /**
   * Update multiple colors at once
   */
  const updateColors = useCallback((colors: Partial<ThemeColors>) => {
    setTheme((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        ...colors,
      },
    }));
  }, []);

  /**
   * Reset a single color to original
   */
  const resetColor = useCallback(
    (key: keyof ThemeColors) => {
      setTheme((prev) => ({
        ...prev,
        colors: {
          ...prev.colors,
          [key]: originalTheme.colors[key],
        },
      }));
    },
    [originalTheme],
  );

  /**
   * Reset all colors to original
   */
  const resetAllColors = useCallback(() => {
    setTheme((prev) => ({
      ...prev,
      colors: { ...originalTheme.colors },
    }));
  }, [originalTheme]);

  /**
   * Set font family
   */
  const setFontFamily = useCallback((font: string) => {
    setTheme((prev) => ({
      ...prev,
      fontFamily: font,
    }));
  }, []);

  /**
   * Set font scale
   */
  const setFontScale = useCallback((scale: number) => {
    setTheme((prev) => ({
      ...prev,
      fontScale: scale,
    }));
  }, []);

  /**
   * Set border radius
   */
  const setBorderRadius = useCallback((radius: string) => {
    setTheme((prev) => ({
      ...prev,
      borderRadius: radius,
    }));
  }, []);

  /**
   * Set spacing scale
   */
  const setSpacingScale = useCallback((scale: number) => {
    setTheme((prev) => ({
      ...prev,
      spacingScale: scale,
    }));
  }, []);

  /**
   * Set color scheme
   */
  const setColorScheme = useCallback((scheme: "light" | "dark" | "system") => {
    setTheme((prev) => ({
      ...prev,
      colorScheme: scheme,
    }));
  }, []);

  /**
   * Set custom CSS
   */
  const setCustomCSS = useCallback((css: string) => {
    setTheme((prev) => ({
      ...prev,
      customCSS: css,
    }));
  }, []);

  /**
   * Load a preset theme
   */
  const loadPreset = useCallback(
    (presetKey: string, colorScheme?: "light" | "dark") => {
      const scheme = colorScheme || theme.colorScheme;
      const actualScheme = scheme === "system" ? "dark" : scheme;
      const presetTheme = createThemeFromPreset(presetKey, actualScheme);

      setTheme((prev) => ({
        ...presetTheme,
        // Preserve user customizations for non-color properties
        fontFamily: prev.fontFamily,
        fontScale: prev.fontScale,
        borderRadius: prev.borderRadius,
        spacingScale: prev.spacingScale,
        customCSS: prev.customCSS,
      }));
    },
    [theme.colorScheme],
  );

  /**
   * Reset to original preset
   */
  const resetToPreset = useCallback(() => {
    setTheme(originalTheme);
  }, [originalTheme]);

  /**
   * Save theme to AppConfig and localStorage
   */
  const saveTheme = useCallback(async () => {
    try {
      // Save to AppConfig
      await updateConfig({
        theme: {
          preset: theme.preset as AppConfig["theme"]["preset"],
          primaryColor: theme.colors.primaryColor,
          secondaryColor: theme.colors.secondaryColor,
          accentColor: theme.colors.accentColor,
          backgroundColor: theme.colors.backgroundColor,
          surfaceColor: theme.colors.surfaceColor,
          textColor: theme.colors.textColor,
          mutedColor: theme.colors.mutedColor,
          borderColor: theme.colors.borderColor,
          buttonPrimaryBg: theme.colors.buttonPrimaryBg,
          buttonPrimaryText: theme.colors.buttonPrimaryText,
          buttonSecondaryBg: theme.colors.buttonSecondaryBg,
          buttonSecondaryText: theme.colors.buttonSecondaryText,
          successColor: theme.colors.successColor,
          warningColor: theme.colors.warningColor,
          errorColor: theme.colors.errorColor,
          infoColor: theme.colors.infoColor,
          borderRadius: theme.borderRadius,
          fontFamily: theme.fontFamily,
          customCSS: theme.customCSS,
          colorScheme: theme.colorScheme,
        },
      });

      // Save to localStorage
      saveCustomThemeToStorage(theme);

      // Update original theme
      setOriginalTheme(theme);
      setIsModified(false);
    } catch (error) {
      logger.error("Failed to save theme:", error);
      throw error;
    }
  }, [theme, updateConfig]);

  /**
   * Load theme from localStorage
   */
  const loadTheme = useCallback(() => {
    const storedTheme = loadCustomThemeFromStorage();
    if (storedTheme) {
      setTheme(storedTheme);
      setOriginalTheme(storedTheme);
      applyCustomTheme(storedTheme);
    }
  }, []);

  /**
   * Reset theme to default
   */
  const resetTheme = useCallback(() => {
    setTheme(defaultCustomTheme);
    setOriginalTheme(defaultCustomTheme);
    clearCustomThemeFromStorage();
    applyCustomTheme(defaultCustomTheme);
  }, []);

  /**
   * Export theme as JSON string
   */
  const exportJSON = useCallback(() => {
    return exportThemeJSON(theme);
  }, [theme]);

  /**
   * Import theme from JSON string
   */
  const importJSON = useCallback((json: string) => {
    try {
      const importedTheme = importThemeJSON(json);
      setTheme(importedTheme);
      applyCustomTheme(importedTheme);
    } catch (error) {
      logger.error("Failed to import theme:", error);
      throw error;
    }
  }, []);

  /**
   * Generate shareable URL
   */
  const generateShareURL = useCallback(() => {
    return generateThemeShareURL(theme);
  }, [theme]);

  /**
   * Download theme as JSON file
   */
  const downloadJSON = useCallback(() => {
    const json = exportThemeJSON(theme);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `theme-${theme.preset || "custom"}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [theme]);

  /**
   * Copy JSON to clipboard
   */
  const copyJSON = useCallback(async () => {
    const json = exportThemeJSON(theme);
    await navigator.clipboard.writeText(json);
  }, [theme]);

  return {
    theme,
    isModified,
    isLoading,
    updateColor,
    updateColors,
    resetColor,
    resetAllColors,
    setFontFamily,
    setFontScale,
    setBorderRadius,
    setSpacingScale,
    setColorScheme,
    setCustomCSS,
    loadPreset,
    resetToPreset,
    saveTheme,
    loadTheme,
    resetTheme,
    exportJSON,
    importJSON,
    generateShareURL,
    downloadJSON,
    copyJSON,
  };
}
