// ═══════════════════════════════════════════════════════════════════════════════
// Platform Templates Registry
// ═══════════════════════════════════════════════════════════════════════════════
//
// This module provides the template loading and management system for nself-chat.
// Templates can be loaded dynamically based on the NEXT_PUBLIC_PLATFORM_TEMPLATE
// environment variable or selected at runtime.
//
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  PlatformTemplate,
  PartialTemplate,
  TemplateId,
  TemplateRegistryEntry,
  ThemeColors,
  LayoutConfig,
  FeatureConfig,
  TerminologyConfig,
  AnimationConfig,
} from "./types";
import { logger } from "@/lib/logger";

// Re-export types
export type {
  PlatformTemplate,
  PartialTemplate,
  TemplateId,
  ThemeColors,
  LayoutConfig,
  FeatureConfig,
  TerminologyConfig,
  AnimationConfig,
};

// ─────────────────────────────────────────────────────────────────────────────
// Template Registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registry of all available platform templates
 */
export const templateRegistry: Record<TemplateId, TemplateRegistryEntry> = {
  default: {
    id: "default",
    name: "nself",
    description:
      "Modern design combining the best of Slack, Discord, and Telegram",
    preview: "/templates/default-preview.png",
    load: () => import("./default/config").then((m) => m.default),
  },

  slack: {
    id: "slack",
    name: "Slack",
    description: "Classic Slack-style interface with aubergine accents",
    preview: "/templates/slack-preview.png",
    load: () => import("./slack/config").then((m) => m.default),
  },

  discord: {
    id: "discord",
    name: "Discord",
    description: "Discord-style dark theme with blurple accents and servers",
    preview: "/templates/discord-preview.png",
    load: () => import("./discord/config").then((m) => m.default),
  },

  telegram: {
    id: "telegram",
    name: "Telegram",
    description: "Clean, fast Telegram-style interface with blue accents",
    preview: "/templates/telegram-preview.png",
    load: () => import("./telegram/config").then((m) => m.default),
  },

  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp",
    description: "WhatsApp-style chat bubbles with green theme",
    preview: "/templates/whatsapp-preview.png",
    load: () => import("./whatsapp/config").then((m) => m.default),
  },
};

/**
 * Array of all template IDs for easy iteration
 */
export const templates: TemplateId[] = [
  "default",
  "slack",
  "discord",
  "telegram",
  "whatsapp",
];

// ─────────────────────────────────────────────────────────────────────────────
// Template Loading
// ─────────────────────────────────────────────────────────────────────────────

// Cache for loaded templates
const templateCache = new Map<TemplateId, PlatformTemplate>();

/**
 * Get the template ID from environment variable
 */
export function getEnvTemplateId(): TemplateId {
  const envTemplate = process.env.NEXT_PUBLIC_PLATFORM_TEMPLATE as TemplateId;
  if (envTemplate && templateRegistry[envTemplate]) {
    return envTemplate;
  }
  return "default";
}

/**
 * Load a template by ID
 */
export async function loadTemplate(id: TemplateId): Promise<PlatformTemplate> {
  // Check cache first
  const cached = templateCache.get(id);
  if (cached) {
    return cached;
  }

  // Load the template
  const entry = templateRegistry[id];
  if (!entry) {
    logger.warn(`Template "${id}" not found, falling back to default`);
    return loadTemplate("default");
  }

  try {
    const template = await entry.load();
    templateCache.set(id, template);
    return template;
  } catch (error) {
    logger.error(`Failed to load template "${id}":`, error);
    if (id !== "default") {
      return loadTemplate("default");
    }
    throw error;
  }
}

/**
 * Load the template from environment variable
 */
export async function loadEnvTemplate(): Promise<PlatformTemplate> {
  return loadTemplate(getEnvTemplateId());
}

/**
 * Get all available template entries
 */
export function getAvailableTemplates(): TemplateRegistryEntry[] {
  return Object.values(templateRegistry);
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Merging & Customization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(base: T, override: Partial<T>): T {
  const result = { ...base } as T;

  for (const key in override) {
    if (
      Object.prototype.hasOwnProperty.call(override, key) &&
      override[key] !== undefined
    ) {
      const baseValue = base[key as keyof T];
      const overrideValue = override[key];

      if (
        baseValue &&
        typeof baseValue === "object" &&
        !Array.isArray(baseValue) &&
        overrideValue &&
        typeof overrideValue === "object" &&
        !Array.isArray(overrideValue)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          baseValue as object,
          overrideValue as object,
        );
      } else {
        (result as Record<string, unknown>)[key] = overrideValue;
      }
    }
  }

  return result;
}

/**
 * Create a customized template by merging overrides with a base template
 */
export function customizeTemplate(
  base: PlatformTemplate,
  overrides: PartialTemplate,
): PlatformTemplate {
  return {
    ...base,
    ...overrides,
    id: overrides.id ?? base.id,
    name: overrides.name ?? base.name,
    description: overrides.description ?? base.description,
    version: overrides.version ?? base.version,
    theme: {
      defaultMode: overrides.theme?.defaultMode ?? base.theme.defaultMode,
      light: deepMerge(base.theme.light, overrides.theme?.light ?? {}),
      dark: deepMerge(base.theme.dark, overrides.theme?.dark ?? {}),
    },
    layout: deepMerge(base.layout, overrides.layout ?? {}),
    features: deepMerge(base.features, overrides.features ?? {}),
    terminology: deepMerge(base.terminology, overrides.terminology ?? {}),
    animations: deepMerge(base.animations, overrides.animations ?? {}),
    components: {
      ...base.components,
      ...overrides.components,
    },
    customCSS: overrides.customCSS ?? base.customCSS,
  };
}

/**
 * Apply environment variable overrides to a template
 */
export function applyEnvOverrides(
  template: PlatformTemplate,
): PlatformTemplate {
  const overrides: PartialTemplate = {
    theme: {
      defaultMode:
        (process.env.NEXT_PUBLIC_THEME_MODE as "light" | "dark" | "system") ??
        undefined,
    },
    layout: {
      sidebarPosition:
        (process.env.NEXT_PUBLIC_SIDEBAR_POSITION as "left" | "right") ??
        undefined,
      sidebarWidth: process.env.NEXT_PUBLIC_SIDEBAR_WIDTH
        ? parseInt(process.env.NEXT_PUBLIC_SIDEBAR_WIDTH)
        : undefined,
      messageDensity:
        (process.env.NEXT_PUBLIC_MESSAGE_DENSITY as
          | "compact"
          | "comfortable"
          | "spacious") ?? undefined,
      messageGrouping: process.env.NEXT_PUBLIC_MESSAGE_GROUPING
        ? process.env.NEXT_PUBLIC_MESSAGE_GROUPING === "true"
        : undefined,
      avatarStyle:
        (process.env.NEXT_PUBLIC_AVATAR_STYLE as
          | "circle"
          | "rounded"
          | "square") ?? undefined,
      avatarSize:
        (process.env.NEXT_PUBLIC_AVATAR_SIZE as "sm" | "md" | "lg") ??
        undefined,
      showPresenceDots: process.env.NEXT_PUBLIC_SHOW_PRESENCE_DOTS
        ? process.env.NEXT_PUBLIC_SHOW_PRESENCE_DOTS === "true"
        : undefined,
      showChannelIcons: process.env.NEXT_PUBLIC_SHOW_CHANNEL_ICONS
        ? process.env.NEXT_PUBLIC_SHOW_CHANNEL_ICONS === "true"
        : undefined,
      showMemberCount: process.env.NEXT_PUBLIC_SHOW_MEMBER_COUNT
        ? process.env.NEXT_PUBLIC_SHOW_MEMBER_COUNT === "true"
        : undefined,
    },
    features: {
      threads: process.env.NEXT_PUBLIC_FEATURE_THREADS
        ? process.env.NEXT_PUBLIC_FEATURE_THREADS === "true"
        : undefined,
      reactions: process.env.NEXT_PUBLIC_FEATURE_REACTIONS
        ? process.env.NEXT_PUBLIC_FEATURE_REACTIONS === "true"
        : undefined,
      fileUploads: process.env.NEXT_PUBLIC_FEATURE_FILE_UPLOADS
        ? process.env.NEXT_PUBLIC_FEATURE_FILE_UPLOADS === "true"
        : undefined,
      voiceMessages: process.env.NEXT_PUBLIC_FEATURE_VOICE_MESSAGES
        ? process.env.NEXT_PUBLIC_FEATURE_VOICE_MESSAGES === "true"
        : undefined,
      codeBlocks: process.env.NEXT_PUBLIC_FEATURE_CODE_BLOCKS
        ? process.env.NEXT_PUBLIC_FEATURE_CODE_BLOCKS === "true"
        : undefined,
      markdown: process.env.NEXT_PUBLIC_FEATURE_MARKDOWN
        ? process.env.NEXT_PUBLIC_FEATURE_MARKDOWN === "true"
        : undefined,
      linkPreviews: process.env.NEXT_PUBLIC_FEATURE_LINK_PREVIEWS
        ? process.env.NEXT_PUBLIC_FEATURE_LINK_PREVIEWS === "true"
        : undefined,
      gifPicker: process.env.NEXT_PUBLIC_FEATURE_GIF_PICKER
        ? process.env.NEXT_PUBLIC_FEATURE_GIF_PICKER === "true"
        : undefined,
      typing: process.env.NEXT_PUBLIC_FEATURE_TYPING_INDICATORS
        ? process.env.NEXT_PUBLIC_FEATURE_TYPING_INDICATORS === "true"
        : undefined,
      presence: process.env.NEXT_PUBLIC_FEATURE_USER_PRESENCE
        ? process.env.NEXT_PUBLIC_FEATURE_USER_PRESENCE === "true"
        : undefined,
      readReceipts: process.env.NEXT_PUBLIC_FEATURE_READ_RECEIPTS
        ? process.env.NEXT_PUBLIC_FEATURE_READ_RECEIPTS === "true"
        : undefined,
    },
  };

  // Apply color overrides if present
  const primaryColor = process.env.NEXT_PUBLIC_THEME_PRIMARY;
  const secondaryColor = process.env.NEXT_PUBLIC_THEME_SECONDARY;
  const accentColor = process.env.NEXT_PUBLIC_THEME_ACCENT;

  if (primaryColor || secondaryColor || accentColor) {
    overrides.theme = overrides.theme ?? {};
    if (primaryColor) {
      overrides.theme.light = {
        ...overrides.theme.light,
        primaryColor,
      } as Partial<ThemeColors>;
      overrides.theme.dark = {
        ...overrides.theme.dark,
        primaryColor,
      } as Partial<ThemeColors>;
    }
    if (secondaryColor) {
      overrides.theme.light = {
        ...overrides.theme.light,
        secondaryColor,
      } as Partial<ThemeColors>;
      overrides.theme.dark = {
        ...overrides.theme.dark,
        secondaryColor,
      } as Partial<ThemeColors>;
    }
    if (accentColor) {
      overrides.theme.light = {
        ...overrides.theme.light,
        accentColor,
      } as Partial<ThemeColors>;
      overrides.theme.dark = {
        ...overrides.theme.dark,
        accentColor,
      } as Partial<ThemeColors>;
    }
  }

  return customizeTemplate(template, overrides);
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS Variable Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0 0";
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
}

/**
 * Generate CSS custom properties from theme colors
 */
export function generateCSSVariables(colors: ThemeColors): string {
  const vars: string[] = [];

  // Map theme colors to CSS variables
  const colorMap: Record<string, string> = {
    "--primary": colors.primaryColor,
    "--primary-rgb": hexToRgb(colors.primaryColor),
    "--secondary": colors.secondaryColor,
    "--secondary-rgb": hexToRgb(colors.secondaryColor),
    "--accent": colors.accentColor,
    "--accent-rgb": hexToRgb(colors.accentColor),

    "--background": colors.backgroundColor,
    "--background-rgb": hexToRgb(colors.backgroundColor),
    "--surface": colors.surfaceColor,
    "--surface-rgb": hexToRgb(colors.surfaceColor),
    "--card": colors.cardColor,
    "--popover": colors.popoverColor,

    "--foreground": colors.textColor,
    "--foreground-rgb": hexToRgb(colors.textColor),
    "--muted": colors.textMutedColor,
    "--muted-foreground": colors.textMutedColor,

    "--border": colors.borderColor,
    "--input": colors.borderColor,
    "--ring": colors.focusRingColor,

    "--success": colors.successColor,
    "--warning": colors.warningColor,
    "--destructive": colors.errorColor,
    "--info": colors.infoColor,

    "--link": colors.linkColor,
    "--selection": colors.selectionBg,
    "--highlight": colors.highlightBg,
  };

  for (const [key, value] of Object.entries(colorMap)) {
    vars.push(`${key}: ${value};`);
  }

  return vars.join("\n  ");
}

/**
 * Generate complete CSS for a template
 */
export function generateTemplateCSS(template: PlatformTemplate): string {
  const lightVars = generateCSSVariables(template.theme.light);
  const darkVars = generateCSSVariables(template.theme.dark);

  return `
/* ═══════════════════════════════════════════════════════════════════════════════
 * Generated Template CSS: ${template.name}
 * Template ID: ${template.id}
 * ═══════════════════════════════════════════════════════════════════════════════ */

:root {
  --sidebar-width: ${template.layout.sidebarWidth}px;
  --sidebar-collapsed-width: ${template.layout.sidebarCollapsedWidth}px;
  --header-height: ${template.layout.headerHeight}px;
  --thread-panel-width: ${template.features.threadPanelWidth}px;

  --avatar-size-xs: 20px;
  --avatar-size-sm: 28px;
  --avatar-size-md: 36px;
  --avatar-size-lg: 44px;
  --avatar-size-xl: 64px;

  --transition-fast: 100ms;
  --transition-normal: 200ms;
  --transition-slow: 300ms;
}

/* Light Theme */
:root, .light {
  ${lightVars}
}

/* Dark Theme */
.dark {
  ${darkVars}
}

/* Message Density */
.message-density-compact .message-item {
  padding: 2px 16px;
}

.message-density-comfortable .message-item {
  padding: 8px 16px;
}

.message-density-spacious .message-item {
  padding: 16px;
}

/* Avatar Styles */
.avatar-circle {
  border-radius: 9999px;
}

.avatar-rounded {
  border-radius: 8px;
}

.avatar-square {
  border-radius: 4px;
}

${template.customCSS ?? ""}
`;
}
