/**
 * Skin Engine
 *
 * Resolves, merges, validates, and applies skins and behaviors. This is the
 * central runtime that converts declarations into active state. It supports:
 *
 *   - Deep merge of partial overrides onto base skins/behaviors
 *   - Profile resolution (skin + behavior + overrides)
 *   - CSS variable generation from a resolved skin
 *   - Validation of skin and behavior completeness
 *   - Runtime switching without page reload
 *
 * @module lib/skins/skin-engine
 * @version 1.0.0
 */

import type {
  VisualSkin,
  BehaviorPreset,
  CompositeProfile,
  DeepPartial,
  SkinValidationResult,
  ResolvedSkinState,
  SkinRegistry,
  SkinColorPalette,
} from "./types";

import { visualSkins } from "./visual-skins";
import { behaviorPresets } from "./behavior-presets";
import { compositeProfiles } from "./composite-profiles";

// ============================================================================
// DEEP MERGE
// ============================================================================

/**
 * Recursively merges `source` into `target`, returning a new object. Arrays
 * are replaced (not concatenated). `undefined` values in source are skipped.
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: DeepPartial<T>,
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key];
    if (sourceVal === undefined) continue;

    const targetVal = target[key];

    if (
      sourceVal !== null &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as DeepPartial<Record<string, unknown>>,
      ) as T[keyof T];
    } else {
      result[key] = sourceVal as T[keyof T];
    }
  }

  return result;
}

// ============================================================================
// REGISTRY
// ============================================================================

/**
 * Build a registry snapshot from the built-in collections.
 */
export function createRegistry(): SkinRegistry {
  return {
    skins: { ...visualSkins },
    behaviors: { ...behaviorPresets },
    profiles: { ...compositeProfiles },
  };
}

/**
 * Register a custom skin at runtime.
 */
export function registerSkin(registry: SkinRegistry, skin: VisualSkin): void {
  registry.skins[skin.id] = skin;
}

/**
 * Register a custom behavior preset at runtime.
 */
export function registerBehavior(
  registry: SkinRegistry,
  behavior: BehaviorPreset,
): void {
  registry.behaviors[behavior.id] = behavior;
}

/**
 * Register a custom composite profile at runtime.
 */
export function registerProfile(
  registry: SkinRegistry,
  profile: CompositeProfile,
): void {
  registry.profiles[profile.id] = profile;
}

// ============================================================================
// RESOLUTION
// ============================================================================

/**
 * Get a skin from the registry, applying optional overrides.
 */
export function getSkin(
  skinId: string,
  overrides?: DeepPartial<VisualSkin>,
  registry?: SkinRegistry,
): VisualSkin | undefined {
  const source = registry ?? {
    skins: visualSkins,
    behaviors: behaviorPresets,
    profiles: compositeProfiles,
  };
  const base = source.skins[skinId];
  if (!base) return undefined;
  if (!overrides) return base;
  return deepMerge(
    base as unknown as Record<string, unknown>,
    overrides as unknown as DeepPartial<Record<string, unknown>>,
  ) as unknown as VisualSkin;
}

/**
 * Get a behavior preset from the registry, applying optional overrides.
 */
export function getBehavior(
  behaviorId: string,
  overrides?: DeepPartial<BehaviorPreset>,
  registry?: SkinRegistry,
): BehaviorPreset | undefined {
  const source = registry ?? {
    skins: visualSkins,
    behaviors: behaviorPresets,
    profiles: compositeProfiles,
  };
  const base = source.behaviors[behaviorId];
  if (!base) return undefined;
  if (!overrides) return base;
  return deepMerge(
    base as unknown as Record<string, unknown>,
    overrides as unknown as DeepPartial<Record<string, unknown>>,
  ) as unknown as BehaviorPreset;
}

/**
 * Resolve a composite profile into a fully hydrated skin + behavior pair.
 */
export function getProfile(
  profileId: string,
  registry?: SkinRegistry,
): ResolvedSkinState | undefined {
  const source = registry ?? {
    skins: visualSkins,
    behaviors: behaviorPresets,
    profiles: compositeProfiles,
  };
  const profile = source.profiles[profileId];
  if (!profile) return undefined;

  const skin = getSkin(profile.skinId, profile.overrides?.skin, source);
  const behavior = getBehavior(
    profile.behaviorId,
    profile.overrides?.behavior,
    source,
  );

  if (!skin || !behavior) return undefined;

  return {
    skin,
    behavior,
    profileId: profile.id,
    isDarkMode: false,
  };
}

/**
 * Resolve a skin + behavior pair independently (without a named profile).
 */
export function resolveIndependent(
  skinId: string,
  behaviorId: string,
  skinOverrides?: DeepPartial<VisualSkin>,
  behaviorOverrides?: DeepPartial<BehaviorPreset>,
  registry?: SkinRegistry,
): ResolvedSkinState | undefined {
  const skin = getSkin(skinId, skinOverrides, registry);
  const behavior = getBehavior(behaviorId, behaviorOverrides, registry);
  if (!skin || !behavior) return undefined;

  return {
    skin,
    behavior,
    isDarkMode: false,
  };
}

// ============================================================================
// CSS VARIABLE GENERATION
// ============================================================================

/**
 * Convert a color palette into a map of CSS custom property names to values.
 */
export function colorsToCSSVariables(
  colors: SkinColorPalette,
  prefix: string = "--skin",
): Record<string, string> {
  return {
    [`${prefix}-primary`]: colors.primary,
    [`${prefix}-secondary`]: colors.secondary,
    [`${prefix}-accent`]: colors.accent,
    [`${prefix}-background`]: colors.background,
    [`${prefix}-surface`]: colors.surface,
    [`${prefix}-text`]: colors.text,
    [`${prefix}-text-secondary`]: colors.textSecondary,
    [`${prefix}-muted`]: colors.muted,
    [`${prefix}-border`]: colors.border,
    [`${prefix}-success`]: colors.success,
    [`${prefix}-warning`]: colors.warning,
    [`${prefix}-error`]: colors.error,
    [`${prefix}-info`]: colors.info,
    [`${prefix}-button-primary-bg`]: colors.buttonPrimaryBg,
    [`${prefix}-button-primary-text`]: colors.buttonPrimaryText,
    [`${prefix}-button-secondary-bg`]: colors.buttonSecondaryBg,
    [`${prefix}-button-secondary-text`]: colors.buttonSecondaryText,
  };
}

/**
 * Generate all CSS variables for a resolved skin, including typography,
 * spacing, and border-radius tokens.
 */
export function skinToCSSVariables(
  skin: VisualSkin,
  isDarkMode: boolean = false,
  prefix: string = "--skin",
): Record<string, string> {
  const colors = isDarkMode ? skin.darkMode.colors : skin.colors;
  const vars: Record<string, string> = {
    ...colorsToCSSVariables(colors, prefix),
    // Typography
    [`${prefix}-font-family`]: skin.typography.fontFamily,
    [`${prefix}-font-family-mono`]: skin.typography.fontFamilyMono,
    [`${prefix}-font-size-base`]: skin.typography.fontSizeBase,
    [`${prefix}-font-size-sm`]: skin.typography.fontSizeSm,
    [`${prefix}-font-size-lg`]: skin.typography.fontSizeLg,
    [`${prefix}-font-size-xl`]: skin.typography.fontSizeXl,
    [`${prefix}-font-weight-normal`]: String(skin.typography.fontWeightNormal),
    [`${prefix}-font-weight-medium`]: String(skin.typography.fontWeightMedium),
    [`${prefix}-font-weight-bold`]: String(skin.typography.fontWeightBold),
    [`${prefix}-line-height`]: String(skin.typography.lineHeight),
    [`${prefix}-letter-spacing`]: skin.typography.letterSpacing,
    // Spacing
    [`${prefix}-message-gap`]: skin.spacing.messageGap,
    [`${prefix}-message-padding`]: skin.spacing.messagePadding,
    [`${prefix}-sidebar-width`]: skin.spacing.sidebarWidth,
    [`${prefix}-header-height`]: skin.spacing.headerHeight,
    [`${prefix}-input-height`]: skin.spacing.inputHeight,
    [`${prefix}-avatar-size`]: skin.spacing.avatarSize,
    [`${prefix}-avatar-size-sm`]: skin.spacing.avatarSizeSm,
    [`${prefix}-avatar-size-lg`]: skin.spacing.avatarSizeLg,
    // Border radius
    [`${prefix}-radius-none`]: skin.borderRadius.none,
    [`${prefix}-radius-sm`]: skin.borderRadius.sm,
    [`${prefix}-radius-md`]: skin.borderRadius.md,
    [`${prefix}-radius-lg`]: skin.borderRadius.lg,
    [`${prefix}-radius-xl`]: skin.borderRadius.xl,
    [`${prefix}-radius-full`]: skin.borderRadius.full,
  };

  return vars;
}

/**
 * Apply CSS variables to a DOM element (typically `document.documentElement`).
 * Runs in the browser only; no-ops if `typeof document` is undefined.
 */
export function applySkin(
  skin: VisualSkin,
  isDarkMode: boolean = false,
  target?: HTMLElement,
): void {
  if (typeof document === "undefined") return;

  const element = target ?? document.documentElement;
  const vars = skinToCSSVariables(skin, isDarkMode);

  for (const [prop, value] of Object.entries(vars)) {
    element.style.setProperty(prop, value);
  }
}

/**
 * Remove all skin CSS variables from a DOM element.
 */
export function removeSkinVariables(
  prefix: string = "--skin",
  target?: HTMLElement,
): void {
  if (typeof document === "undefined") return;

  const element = target ?? document.documentElement;
  const style = element.style;

  for (let i = style.length - 1; i >= 0; i--) {
    const prop = style.item(i);
    if (prop.startsWith(prefix)) {
      style.removeProperty(prop);
    }
  }
}

/**
 * Apply a behavior preset. Behavior does not touch the DOM; it returns the
 * resolved preset so the caller (context provider) can distribute it.
 */
export function applyBehavior(
  behaviorId: string,
  overrides?: DeepPartial<BehaviorPreset>,
  registry?: SkinRegistry,
): BehaviorPreset | undefined {
  return getBehavior(behaviorId, overrides, registry);
}

/**
 * Switch the skin at runtime (applies CSS variables, no page reload).
 */
export function switchSkin(
  newSkinId: string,
  isDarkMode: boolean = false,
  overrides?: DeepPartial<VisualSkin>,
  registry?: SkinRegistry,
  target?: HTMLElement,
): VisualSkin | undefined {
  const skin = getSkin(newSkinId, overrides, registry);
  if (!skin) return undefined;
  applySkin(skin, isDarkMode, target);
  return skin;
}

/**
 * Reset all skin variables and re-apply the default nchat skin.
 */
export function resetSkin(
  isDarkMode: boolean = false,
  target?: HTMLElement,
  registry?: SkinRegistry,
): ResolvedSkinState | undefined {
  removeSkinVariables("--skin", target);
  const state = getProfile("nchat", registry);
  if (state) {
    applySkin(state.skin, isDarkMode, target);
  }
  return state;
}

// ============================================================================
// VALIDATION
// ============================================================================

const REQUIRED_COLOR_KEYS: (keyof SkinColorPalette)[] = [
  "primary",
  "secondary",
  "accent",
  "background",
  "surface",
  "text",
  "textSecondary",
  "muted",
  "border",
  "success",
  "warning",
  "error",
  "info",
  "buttonPrimaryBg",
  "buttonPrimaryText",
  "buttonSecondaryBg",
  "buttonSecondaryText",
];

/**
 * Validate that a skin has all required fields.
 */
export function validateSkin(skin: VisualSkin): SkinValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!skin.id) errors.push("Skin must have an id");
  if (!skin.name) errors.push("Skin must have a name");
  if (!skin.version) warnings.push("Skin is missing a version string");

  // Validate light mode colors
  if (!skin.colors) {
    errors.push("Skin must have light mode colors");
  } else {
    for (const key of REQUIRED_COLOR_KEYS) {
      if (!skin.colors[key]) {
        errors.push(`Missing light mode color: ${key}`);
      }
    }
  }

  // Validate dark mode colors
  if (!skin.darkMode?.colors) {
    errors.push("Skin must have dark mode colors");
  } else {
    for (const key of REQUIRED_COLOR_KEYS) {
      if (!skin.darkMode.colors[key]) {
        errors.push(`Missing dark mode color: ${key}`);
      }
    }
  }

  // Validate typography
  if (!skin.typography) {
    errors.push("Skin must have typography settings");
  } else {
    if (!skin.typography.fontFamily)
      errors.push("Missing typography.fontFamily");
    if (!skin.typography.fontSizeBase)
      errors.push("Missing typography.fontSizeBase");
  }

  // Validate spacing
  if (!skin.spacing) {
    errors.push("Skin must have spacing settings");
  }

  // Validate border radius
  if (!skin.borderRadius) {
    errors.push("Skin must have borderRadius settings");
  }

  // Validate icons
  if (!skin.icons) {
    warnings.push("Skin is missing icon configuration");
  }

  // Validate components
  if (!skin.components) {
    warnings.push("Skin is missing component style configuration");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate that a behavior preset has all required fields.
 */
export function validateBehavior(
  behavior: BehaviorPreset,
): SkinValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!behavior.id) errors.push("Behavior must have an id");
  if (!behavior.name) errors.push("Behavior must have a name");
  if (!behavior.version) warnings.push("Behavior is missing a version string");

  // Validate sections
  if (!behavior.messaging) errors.push("Behavior must have messaging section");
  if (!behavior.channels) errors.push("Behavior must have channels section");
  if (!behavior.presence) errors.push("Behavior must have presence section");
  if (!behavior.calls) errors.push("Behavior must have calls section");
  if (!behavior.notifications)
    errors.push("Behavior must have notifications section");
  if (!behavior.moderation)
    errors.push("Behavior must have moderation section");
  if (!behavior.privacy) errors.push("Behavior must have privacy section");
  if (!behavior.features) errors.push("Behavior must have features section");

  // Validate messaging specifics
  if (behavior.messaging) {
    if (typeof behavior.messaging.maxMessageLength !== "number") {
      errors.push("messaging.maxMessageLength must be a number");
    }
    if (behavior.messaging.maxMessageLength <= 0) {
      errors.push("messaging.maxMessageLength must be positive");
    }
  }

  // Validate channels
  if (behavior.channels) {
    if (
      !Array.isArray(behavior.channels.types) ||
      behavior.channels.types.length === 0
    ) {
      errors.push("channels.types must be a non-empty array");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a composite profile, checking that its referenced skin and
 * behavior exist in the registry.
 */
export function validateProfile(
  profile: CompositeProfile,
  registry?: SkinRegistry,
): SkinValidationResult {
  const source = registry ?? {
    skins: visualSkins,
    behaviors: behaviorPresets,
    profiles: compositeProfiles,
  };
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!profile.id) errors.push("Profile must have an id");
  if (!profile.name) errors.push("Profile must have a name");
  if (!profile.skinId) errors.push("Profile must have a skinId");
  if (!profile.behaviorId) errors.push("Profile must have a behaviorId");

  if (profile.skinId && !source.skins[profile.skinId]) {
    errors.push(`Referenced skin "${profile.skinId}" not found in registry`);
  }

  if (profile.behaviorId && !source.behaviors[profile.behaviorId]) {
    errors.push(
      `Referenced behavior "${profile.behaviorId}" not found in registry`,
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}
