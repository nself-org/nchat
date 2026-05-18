/**
 * Custom Theme Utilities
 *
 * Provides utilities for theme customization, import/export,
 * and theme generation.
 */

import { ThemeColors, ThemePreset, themePresets } from "@/lib/theme-presets";

import { logger } from "@/lib/logger";

/**
 * Font family options for theme customization
 */
export const fontFamilies = [
  {
    value: "Inter, system-ui, sans-serif",
    label: "Inter (Default)",
    category: "Sans-serif",
  },
  {
    value: "system-ui, sans-serif",
    label: "System UI",
    category: "Sans-serif",
  },
  {
    value: "-apple-system, BlinkMacSystemFont, sans-serif",
    label: "Apple System",
    category: "Sans-serif",
  },
  { value: "Arial, sans-serif", label: "Arial", category: "Sans-serif" },
  {
    value: "Helvetica, sans-serif",
    label: "Helvetica",
    category: "Sans-serif",
  },
  {
    value: '"Segoe UI", sans-serif',
    label: "Segoe UI",
    category: "Sans-serif",
  },
  { value: "Roboto, sans-serif", label: "Roboto", category: "Sans-serif" },
  {
    value: '"Open Sans", sans-serif',
    label: "Open Sans",
    category: "Sans-serif",
  },
  { value: "Lato, sans-serif", label: "Lato", category: "Sans-serif" },
  {
    value: "Montserrat, sans-serif",
    label: "Montserrat",
    category: "Sans-serif",
  },
  { value: "Georgia, serif", label: "Georgia", category: "Serif" },
  {
    value: '"Times New Roman", serif',
    label: "Times New Roman",
    category: "Serif",
  },
  { value: "Merriweather, serif", label: "Merriweather", category: "Serif" },
  {
    value: '"Courier New", monospace',
    label: "Courier New",
    category: "Monospace",
  },
  { value: "Monaco, monospace", label: "Monaco", category: "Monospace" },
  {
    value: '"JetBrains Mono", monospace',
    label: "JetBrains Mono",
    category: "Monospace",
  },
  {
    value: '"Fira Code", monospace',
    label: "Fira Code",
    category: "Monospace",
  },
] as const;

/**
 * Border radius options
 */
export const borderRadiusOptions = [
  { value: "0px", label: "None", preview: "rounded-none" },
  { value: "4px", label: "Small", preview: "rounded-sm" },
  { value: "8px", label: "Medium", preview: "rounded-md" },
  { value: "12px", label: "Large", preview: "rounded-lg" },
  { value: "16px", label: "X-Large", preview: "rounded-xl" },
  { value: "24px", label: "XX-Large", preview: "rounded-2xl" },
  { value: "9999px", label: "Full", preview: "rounded-full" },
] as const;

/**
 * Font size scale options (multiplier)
 */
export const fontScaleOptions = [
  { value: 0.75, label: "Extra Small (75%)" },
  { value: 0.875, label: "Small (87.5%)" },
  { value: 1.0, label: "Normal (100%)" },
  { value: 1.125, label: "Large (112.5%)" },
  { value: 1.25, label: "Extra Large (125%)" },
  { value: 1.5, label: "Huge (150%)" },
] as const;

/**
 * Spacing scale options (multiplier)
 */
export const spacingScaleOptions = [
  { value: 0.75, label: "Compact (75%)" },
  { value: 0.875, label: "Cozy (87.5%)" },
  { value: 1.0, label: "Normal (100%)" },
  { value: 1.125, label: "Comfortable (112.5%)" },
  { value: 1.25, label: "Spacious (125%)" },
  { value: 1.5, label: "Roomy (150%)" },
] as const;

/**
 * Extended theme configuration with customization options
 */
export interface CustomThemeConfig {
  // Core theme colors (from AppConfig)
  colors: ThemeColors;

  // Typography
  fontFamily: string;
  fontScale: number; // 0.75 to 1.5

  // Spacing
  borderRadius: string;
  spacingScale: number; // 0.75 to 1.5

  // Custom CSS
  customCSS?: string;

  // Color scheme
  colorScheme: "light" | "dark" | "system";

  // Preset info (if based on preset)
  preset?: string;
  presetName?: string;
}

/**
 * Default custom theme configuration
 */
export const defaultCustomTheme: CustomThemeConfig = {
  colors: themePresets.nself.dark,
  fontFamily: "Inter, system-ui, sans-serif",
  fontScale: 1.0,
  borderRadius: "12px",
  spacingScale: 1.0,
  colorScheme: "dark",
  preset: "nself",
  presetName: "nself (Default)",
};

/**
 * Color property metadata for customization UI
 */
export const colorProperties = [
  {
    key: "primaryColor" as keyof ThemeColors,
    label: "Primary Color",
    description: "Main brand color used for primary actions",
    category: "Brand",
  },
  {
    key: "secondaryColor" as keyof ThemeColors,
    label: "Secondary Color",
    description: "Secondary brand color for accents",
    category: "Brand",
  },
  {
    key: "accentColor" as keyof ThemeColors,
    label: "Accent Color",
    description: "Accent color for highlights and emphasis",
    category: "Brand",
  },
  {
    key: "backgroundColor" as keyof ThemeColors,
    label: "Background Color",
    description: "Main background color",
    category: "Surfaces",
  },
  {
    key: "surfaceColor" as keyof ThemeColors,
    label: "Surface Color",
    description: "Color for cards, panels, and elevated surfaces",
    category: "Surfaces",
  },
  {
    key: "borderColor" as keyof ThemeColors,
    label: "Border Color",
    description: "Color for borders and dividers",
    category: "Surfaces",
  },
  {
    key: "textColor" as keyof ThemeColors,
    label: "Text Color",
    description: "Primary text color",
    category: "Text",
  },
  {
    key: "mutedColor" as keyof ThemeColors,
    label: "Muted Text",
    description: "Secondary or muted text color",
    category: "Text",
  },
  {
    key: "buttonPrimaryBg" as keyof ThemeColors,
    label: "Primary Button Background",
    description: "Background color for primary buttons",
    category: "Buttons",
  },
  {
    key: "buttonPrimaryText" as keyof ThemeColors,
    label: "Primary Button Text",
    description: "Text color for primary buttons",
    category: "Buttons",
  },
  {
    key: "buttonSecondaryBg" as keyof ThemeColors,
    label: "Secondary Button Background",
    description: "Background color for secondary buttons",
    category: "Buttons",
  },
  {
    key: "buttonSecondaryText" as keyof ThemeColors,
    label: "Secondary Button Text",
    description: "Text color for secondary buttons",
    category: "Buttons",
  },
  {
    key: "successColor" as keyof ThemeColors,
    label: "Success Color",
    description: "Color for success states and messages",
    category: "Status",
  },
  {
    key: "warningColor" as keyof ThemeColors,
    label: "Warning Color",
    description: "Color for warning states and messages",
    category: "Status",
  },
  {
    key: "errorColor" as keyof ThemeColors,
    label: "Error Color",
    description: "Color for error states and messages",
    category: "Status",
  },
  {
    key: "infoColor" as keyof ThemeColors,
    label: "Info Color",
    description: "Color for informational messages",
    category: "Status",
  },
] as const;

/**
 * Convert ThemeColors to CSS variables
 */
export function themeColorsToCSSVariables(
  colors: ThemeColors,
): Record<string, string> {
  return {
    "--color-primary": colors.primaryColor,
    "--color-secondary": colors.secondaryColor,
    "--color-accent": colors.accentColor,
    "--color-background": colors.backgroundColor,
    "--color-surface": colors.surfaceColor,
    "--color-text": colors.textColor,
    "--color-muted": colors.mutedColor,
    "--color-border": colors.borderColor,
    "--color-button-primary-bg": colors.buttonPrimaryBg,
    "--color-button-primary-text": colors.buttonPrimaryText,
    "--color-button-secondary-bg": colors.buttonSecondaryBg,
    "--color-button-secondary-text": colors.buttonSecondaryText,
    "--color-success": colors.successColor,
    "--color-warning": colors.warningColor,
    "--color-error": colors.errorColor,
    "--color-info": colors.infoColor,
  };
}

/**
 * Apply custom theme to document
 */
export function applyCustomTheme(theme: CustomThemeConfig): void {
  const root = document.documentElement;

  // Apply color variables
  const colorVars = themeColorsToCSSVariables(theme.colors);
  Object.entries(colorVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Apply typography
  root.style.setProperty("--font-family", theme.fontFamily);
  root.style.setProperty("--font-scale", theme.fontScale.toString());

  // Apply spacing
  root.style.setProperty("--border-radius", theme.borderRadius);
  root.style.setProperty("--spacing-scale", theme.spacingScale.toString());

  // Apply custom CSS
  if (theme.customCSS) {
    let styleEl = document.getElementById(
      "custom-theme-css",
    ) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "custom-theme-css";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = theme.customCSS;
  }
}

/**
 * Export theme as JSON
 */
export function exportThemeJSON(theme: CustomThemeConfig): string {
  return JSON.stringify(theme, null, 2);
}

/**
 * Import theme from JSON
 */
export function importThemeJSON(json: string): CustomThemeConfig {
  try {
    const parsed = JSON.parse(json);

    // Validate required fields
    if (!parsed.colors || typeof parsed.colors !== "object") {
      throw new Error("Invalid theme: missing colors");
    }

    // Merge with defaults to ensure all fields exist
    return {
      ...defaultCustomTheme,
      ...parsed,
      colors: {
        ...defaultCustomTheme.colors,
        ...parsed.colors,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to import theme: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generate shareable theme URL
 */
export function generateThemeShareURL(theme: CustomThemeConfig): string {
  const encoded = btoa(JSON.stringify(theme));
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/theme/${encoded}`;
}

/**
 * Parse theme from share URL
 */
export function parseThemeFromShareURL(encoded: string): CustomThemeConfig {
  try {
    const json = atob(encoded);
    return importThemeJSON(json);
  } catch (error) {
    throw new Error(
      `Failed to parse theme URL: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Create theme from preset
 */
export function createThemeFromPreset(
  presetKey: string,
  colorScheme: "light" | "dark",
): CustomThemeConfig {
  const preset = themePresets[presetKey];
  if (!preset) {
    throw new Error(`Preset not found: ${presetKey}`);
  }

  return {
    colors: colorScheme === "dark" ? preset.dark : preset.light,
    fontFamily: defaultCustomTheme.fontFamily,
    fontScale: defaultCustomTheme.fontScale,
    borderRadius: defaultCustomTheme.borderRadius,
    spacingScale: defaultCustomTheme.spacingScale,
    colorScheme,
    preset: presetKey,
    presetName: preset.name,
  };
}

/**
 * Check if color is light (for contrast calculations)
 */
export function isLightColor(color: string): boolean {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

/**
 * Generate contrasting text color for background
 */
export function getContrastingTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? "#000000" : "#FFFFFF";
}

/**
 * Lighten or darken a color by percentage
 */
export function adjustColorBrightness(color: string, percent: number): string {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const adjust = (value: number) => {
    const adjusted = Math.round(value + (255 - value) * (percent / 100));
    return Math.max(0, Math.min(255, adjusted));
  };

  const newR = adjust(r).toString(16).padStart(2, "0");
  const newG = adjust(g).toString(16).padStart(2, "0");
  const newB = adjust(b).toString(16).padStart(2, "0");

  return `#${newR}${newG}${newB}`;
}

/**
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Get all available theme presets
 */
export function getThemePresets(): ThemePreset[] {
  return Object.values(themePresets);
}

/**
 * Get preset by key
 */
export function getPresetByKey(key: string): ThemePreset | undefined {
  return themePresets[key];
}

/**
 * Save custom theme to localStorage
 */
export function saveCustomThemeToStorage(theme: CustomThemeConfig): void {
  try {
    localStorage.setItem("custom-theme", JSON.stringify(theme));
  } catch (error) {
    logger.error("Failed to save custom theme:", error);
  }
}

/**
 * Load custom theme from localStorage
 */
export function loadCustomThemeFromStorage(): CustomThemeConfig | null {
  try {
    const stored = localStorage.getItem("custom-theme");
    if (!stored) return null;
    return importThemeJSON(stored);
  } catch (error) {
    logger.error("Failed to load custom theme:", error);
    return null;
  }
}

/**
 * Clear custom theme from localStorage
 */
export function clearCustomThemeFromStorage(): void {
  try {
    localStorage.removeItem("custom-theme");
  } catch (error) {
    logger.error("Failed to clear custom theme:", error);
  }
}
