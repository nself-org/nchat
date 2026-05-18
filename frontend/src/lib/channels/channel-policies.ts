/**
 * Channel Policies - Naming conventions, validation, and governance utilities
 *
 * Provides utilities for channel naming validation, slug generation,
 * and policy enforcement without service dependencies.
 *
 * Phase 6: Task 63 - Channel governance and templates
 */

import type { ChannelType } from "@/types/channel";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Naming policy configuration
 */
export interface ChannelNamingPolicy {
  /** Enforce lowercase names */
  forceLowercase: boolean;
  /** Allow only alphanumeric and hyphens */
  alphanumericOnly: boolean;
  /** Minimum name length */
  minLength: number;
  /** Maximum name length */
  maxLength: number;
  /** Reserved names that cannot be used */
  reservedNames: string[];
  /** Prefix requirements (e.g., "team-", "proj-") */
  requiredPrefix?: string;
  /** Suffix requirements */
  requiredSuffix?: string;
  /** Regex pattern for custom validation */
  customPattern?: string;
  /** Allow unicode characters */
  allowUnicode: boolean;
  /** Allow numbers at start */
  allowNumbersAtStart: boolean;
  /** Block profanity in names */
  blockProfanity: boolean;
}

/**
 * Validation result
 */
export interface ChannelNameValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedName?: string;
  suggestions?: string[];
}

/**
 * Slug generation options
 */
export interface SlugGenerationOptions {
  maxLength?: number;
  separator?: string;
  preserveCase?: boolean;
  transliterate?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default reserved channel names
 */
export const RESERVED_CHANNEL_NAMES = [
  "admin",
  "administrator",
  "system",
  "bot",
  "help",
  "support",
  "mod",
  "moderator",
  "owner",
  "staff",
  "team",
  "api",
  "webhook",
  "null",
  "undefined",
  "true",
  "false",
  "channel",
  "channels",
  "user",
  "users",
  "message",
  "messages",
  "settings",
  "config",
  "configuration",
  "root",
  "master",
  "main",
  "default",
  "all",
  "everyone",
  "here",
  "channel-create",
  "channel-delete",
  "workspace",
  "login",
  "logout",
  "signup",
  "register",
  "forgot-password",
  "reset-password",
  "verify",
  "auth",
  "oauth",
  "sso",
] as const;

/**
 * Basic profanity list (can be extended)
 */
export const PROFANITY_WORDS = new Set([
  "fuck",
  "shit",
  "damn",
  "ass",
  "bitch",
  "crap",
  "piss",
  "dick",
  "cock",
  "pussy",
  "bastard",
  "slut",
  "whore",
  "cunt",
  "nigger",
  "faggot",
  "retard",
]);

/**
 * Default naming policy
 */
export const DEFAULT_NAMING_POLICY: ChannelNamingPolicy = {
  forceLowercase: true,
  alphanumericOnly: true,
  minLength: 2,
  maxLength: 80,
  reservedNames: [...RESERVED_CHANNEL_NAMES],
  allowUnicode: false,
  allowNumbersAtStart: false,
  blockProfanity: true,
};

/**
 * Strict naming policy (for enterprise)
 */
export const STRICT_NAMING_POLICY: ChannelNamingPolicy = {
  forceLowercase: true,
  alphanumericOnly: true,
  minLength: 3,
  maxLength: 50,
  reservedNames: [...RESERVED_CHANNEL_NAMES],
  allowUnicode: false,
  allowNumbersAtStart: false,
  blockProfanity: true,
};

/**
 * Relaxed naming policy (for casual use)
 */
export const RELAXED_NAMING_POLICY: ChannelNamingPolicy = {
  forceLowercase: false,
  alphanumericOnly: false,
  minLength: 1,
  maxLength: 100,
  reservedNames: ["admin", "system", "bot"],
  allowUnicode: true,
  allowNumbersAtStart: true,
  blockProfanity: true,
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate a channel name against a naming policy
 */
export function validateChannelName(
  name: string,
  policy: ChannelNamingPolicy = DEFAULT_NAMING_POLICY,
): ChannelNameValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitizedName = name.trim();

  // Handle empty name
  if (!sanitizedName) {
    return {
      valid: false,
      errors: ["Channel name is required"],
      warnings: [],
    };
  }

  // Apply lowercase if required
  if (policy.forceLowercase) {
    sanitizedName = sanitizedName.toLowerCase();
  }

  // Check length
  if (sanitizedName.length < policy.minLength) {
    errors.push(`Name must be at least ${policy.minLength} characters`);
  }
  if (sanitizedName.length > policy.maxLength) {
    errors.push(`Name must be at most ${policy.maxLength} characters`);
  }

  // Check alphanumeric
  if (policy.alphanumericOnly) {
    const alphanumericPattern = policy.allowUnicode
      ? /^[\p{L}\p{N}-]+$/u
      : /^[a-z0-9-]+$/i;
    if (!alphanumericPattern.test(sanitizedName)) {
      errors.push("Name can only contain letters, numbers, and hyphens");
    }
  }

  // Check for numbers at start
  if (!policy.allowNumbersAtStart && /^[0-9]/.test(sanitizedName)) {
    errors.push("Name cannot start with a number");
  }

  // Check reserved names
  const lowerName = sanitizedName.toLowerCase();
  if (policy.reservedNames.map((n) => n.toLowerCase()).includes(lowerName)) {
    errors.push(`"${sanitizedName}" is a reserved name and cannot be used`);
  }

  // Check prefix requirement
  if (
    policy.requiredPrefix &&
    !sanitizedName.startsWith(policy.requiredPrefix)
  ) {
    warnings.push(`Name should start with "${policy.requiredPrefix}"`);
  }

  // Check suffix requirement
  if (policy.requiredSuffix && !sanitizedName.endsWith(policy.requiredSuffix)) {
    warnings.push(`Name should end with "${policy.requiredSuffix}"`);
  }

  // Check custom pattern
  if (policy.customPattern) {
    try {
      const customRegex = new RegExp(policy.customPattern);
      if (!customRegex.test(sanitizedName)) {
        errors.push("Name does not match required pattern");
      }
    } catch {
      // Invalid regex pattern in policy
    }
  }

  // Check profanity
  if (policy.blockProfanity) {
    const nameParts = sanitizedName.toLowerCase().split(/[-_\s]/);
    for (const part of nameParts) {
      if (PROFANITY_WORDS.has(part)) {
        errors.push("Name contains inappropriate language");
        break;
      }
    }
  }

  // Check for consecutive hyphens
  if (sanitizedName.includes("--")) {
    warnings.push("Name should not contain consecutive hyphens");
  }

  // Check for leading/trailing hyphens
  if (sanitizedName.startsWith("-") || sanitizedName.endsWith("-")) {
    warnings.push("Name should not start or end with a hyphen");
  }

  // Check for spaces (if alphanumeric only)
  if (policy.alphanumericOnly && sanitizedName.includes(" ")) {
    errors.push("Name cannot contain spaces");
  }

  // Generate suggestions if invalid
  let suggestions: string[] | undefined;
  if (errors.length > 0) {
    suggestions = generateNameSuggestions(name, policy);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitizedName: errors.length === 0 ? sanitizedName : undefined,
    suggestions,
  };
}

/**
 * Generate name suggestions based on policy
 */
export function generateNameSuggestions(
  name: string,
  policy: ChannelNamingPolicy = DEFAULT_NAMING_POLICY,
): string[] {
  const suggestions: string[] = [];
  let base = name.trim();

  // Apply transformations
  if (policy.forceLowercase) {
    base = base.toLowerCase();
  }

  if (policy.alphanumericOnly) {
    base = base
      .replace(/[^a-z0-9\s-]/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  base = base.replace(/^-+|-+$/g, "").substring(0, policy.maxLength);

  if (
    base.length >= policy.minLength &&
    !policy.reservedNames.includes(base.toLowerCase())
  ) {
    suggestions.push(base);
  }

  // Add variations
  const withNumber = `${base}-1`;
  if (withNumber.length <= policy.maxLength) {
    suggestions.push(withNumber);
  }

  const withPrefix = policy.requiredPrefix
    ? `${policy.requiredPrefix}${base}`
    : null;
  if (withPrefix && withPrefix.length <= policy.maxLength) {
    suggestions.push(withPrefix);
  }

  return suggestions.filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3);
}

/**
 * Sanitize a channel name according to policy
 */
export function sanitizeChannelName(
  name: string,
  policy: ChannelNamingPolicy = DEFAULT_NAMING_POLICY,
): string {
  let sanitized = name.trim();

  if (policy.forceLowercase) {
    sanitized = sanitized.toLowerCase();
  }

  if (policy.alphanumericOnly) {
    sanitized = sanitized
      .replace(/[^a-z0-9\s-]/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  sanitized = sanitized.replace(/^-+|-+$/g, "").substring(0, policy.maxLength);

  return sanitized;
}

/**
 * Check if a name is reserved
 */
export function isReservedName(
  name: string,
  additionalReserved: string[] = [],
): boolean {
  const allReserved = [...RESERVED_CHANNEL_NAMES, ...additionalReserved].map(
    (n) => n.toLowerCase(),
  );
  return allReserved.includes(name.toLowerCase());
}

/**
 * Check if a name contains profanity
 */
export function containsProfanity(name: string): boolean {
  const parts = name.toLowerCase().split(/[-_\s]/);
  return parts.some((part) => PROFANITY_WORDS.has(part));
}

// =============================================================================
// SLUG GENERATION
// =============================================================================

/**
 * Generate a URL-safe slug from a channel name
 */
export function generateChannelSlug(
  name: string,
  options: SlugGenerationOptions = {},
): string {
  const { maxLength = 80, separator = "-", preserveCase = false } = options;

  let slug = name.trim();

  // Lowercase unless preserving case
  if (!preserveCase) {
    slug = slug.toLowerCase();
  }

  // Replace spaces and special chars with separator
  slug = slug
    .replace(/[^a-z0-9]+/gi, separator)
    .replace(new RegExp(`${separator}+`, "g"), separator)
    .replace(new RegExp(`^${separator}|${separator}$`, "g"), "");

  // Truncate to max length
  return slug.substring(0, maxLength);
}

/**
 * Generate a unique slug from a name, avoiding duplicates
 */
export function generateUniqueSlug(
  name: string,
  existingSlugs: string[],
  options: SlugGenerationOptions = {},
): string {
  let slug = generateChannelSlug(name, options);

  if (!existingSlugs.includes(slug)) {
    return slug;
  }

  // Add number suffix to make unique
  let counter = 1;
  let uniqueSlug = `${slug}-${counter}`;
  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Check if a slug is valid
 */
export function isValidSlug(slug: string): boolean {
  // Must be lowercase alphanumeric with hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return false;
  }

  // No consecutive hyphens
  if (slug.includes("--")) {
    return false;
  }

  // No leading/trailing hyphens
  if (slug.startsWith("-") || slug.endsWith("-")) {
    return false;
  }

  // Reasonable length
  if (slug.length < 1 || slug.length > 100) {
    return false;
  }

  return true;
}

// =============================================================================
// CHANNEL TYPE POLICIES
// =============================================================================

/**
 * Get naming policy for a specific channel type
 */
export function getPolicyForChannelType(
  type: ChannelType,
): ChannelNamingPolicy {
  switch (type) {
    case "direct":
    case "group_dm":
      // DMs don't need naming validation
      return RELAXED_NAMING_POLICY;
    case "private":
      // Private channels can be slightly more relaxed
      return {
        ...DEFAULT_NAMING_POLICY,
        minLength: 1,
      };
    case "public":
    default:
      return DEFAULT_NAMING_POLICY;
  }
}

/**
 * Check if a channel name is unique in a workspace
 */
export function checkNameUniqueness(
  name: string,
  existingNames: string[],
  caseInsensitive: boolean = true,
): { unique: boolean; conflictsWith?: string } {
  const normalizedName = caseInsensitive ? name.toLowerCase() : name;
  const normalizedExisting = existingNames.map((n) =>
    caseInsensitive ? n.toLowerCase() : n,
  );

  const index = normalizedExisting.indexOf(normalizedName);
  if (index === -1) {
    return { unique: true };
  }

  return { unique: false, conflictsWith: existingNames[index] };
}

// =============================================================================
// NAMING PATTERN HELPERS
// =============================================================================

/**
 * Common naming patterns for channels
 */
export const NAMING_PATTERNS = {
  /** Standard kebab-case: my-channel-name */
  KEBAB_CASE: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
  /** Snake case: my_channel_name */
  SNAKE_CASE: /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/,
  /** Team prefix: team-engineering */
  TEAM_PREFIX: /^team-[a-z0-9-]+$/,
  /** Project prefix: proj-alpha */
  PROJECT_PREFIX: /^proj-[a-z0-9-]+$/,
  /** Department prefix: dept-engineering */
  DEPARTMENT_PREFIX: /^dept-[a-z0-9-]+$/,
  /** Support prefix: support-tickets */
  SUPPORT_PREFIX: /^support-[a-z0-9-]+$/,
  /** Year prefix: 2024-q1-planning */
  YEAR_PREFIX: /^20[0-9]{2}-[a-z0-9-]+$/,
} as const;

/**
 * Check if a name matches a pattern
 */
export function matchesPattern(name: string, pattern: RegExp): boolean {
  return pattern.test(name.toLowerCase());
}

/**
 * Extract pattern type from a name
 */
export function detectNamingPattern(name: string): string | null {
  const lowerName = name.toLowerCase();

  for (const [patternName, pattern] of Object.entries(NAMING_PATTERNS)) {
    if (pattern.test(lowerName)) {
      return patternName;
    }
  }

  return null;
}

// =============================================================================
// CHANNEL NAME FORMATTING
// =============================================================================

/**
 * Format a channel name for display (with # prefix)
 */
export function formatChannelName(
  name: string,
  includeHash: boolean = true,
): string {
  return includeHash ? `#${name}` : name;
}

/**
 * Parse a channel mention to get the name
 */
export function parseChannelMention(mention: string): string | null {
  const match = mention.match(/^#?([a-z0-9-]+)$/i);
  return match ? match[1] : null;
}

/**
 * Convert a display name to a valid channel name
 */
export function displayNameToChannelName(
  displayName: string,
  policy: ChannelNamingPolicy = DEFAULT_NAMING_POLICY,
): string {
  return sanitizeChannelName(displayName, policy);
}

/**
 * Create a human-readable name from a slug
 */
export function slugToDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
