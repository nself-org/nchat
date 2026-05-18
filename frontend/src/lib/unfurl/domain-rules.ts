/**
 * Per-Domain Rules Configuration for Link Unfurling
 *
 * Provides flexible configuration for how different domains
 * are handled during link unfurling:
 * - Whitelist/Blacklist
 * - Custom embed styles
 * - Timeout handling
 * - Fallback behavior
 *
 * @module lib/unfurl/domain-rules
 */

import { UrlProvider } from "./url-parser";

// ============================================================================
// Types
// ============================================================================

export type UnfurlBehavior = "allow" | "block" | "minimal" | "full" | "player";

export type EmbedStyle =
  | "card"
  | "compact"
  | "inline"
  | "player"
  | "full"
  | "custom";

export interface DomainRule {
  /** Domain pattern (supports wildcards) */
  domain: string;
  /** Whether to unfurl URLs from this domain */
  enabled: boolean;
  /** Unfurl behavior */
  behavior: UnfurlBehavior;
  /** Embed style to use */
  embedStyle: EmbedStyle;
  /** Custom timeout in milliseconds */
  timeout?: number;
  /** Maximum image height in pixels */
  maxImageHeight?: number;
  /** Whether to show description */
  showDescription?: boolean;
  /** Whether to show favicon */
  showFavicon?: boolean;
  /** Whether to show author */
  showAuthor?: boolean;
  /** Custom CSS class for styling */
  customClass?: string;
  /** Priority (higher = matched first) */
  priority?: number;
  /** Reason for rule (for display) */
  reason?: string;
  /** Created at timestamp */
  createdAt?: Date;
  /** Last modified timestamp */
  updatedAt?: Date;
}

export interface DomainRulesConfig {
  /** Default behavior for unmatched domains */
  defaultBehavior: UnfurlBehavior;
  /** Default embed style */
  defaultEmbedStyle: EmbedStyle;
  /** Default timeout in milliseconds */
  defaultTimeout: number;
  /** Enable whitelist mode (only allow listed domains) */
  whitelistMode: boolean;
  /** Global rules */
  rules: DomainRule[];
  /** Provider-specific settings */
  providers: Partial<Record<UrlProvider, ProviderSettings>>;
  /** User overrides */
  userOverrides: Map<string, DomainRule>;
  /** Channel-specific rules */
  channelRules: Map<string, DomainRule[]>;
}

export interface ProviderSettings {
  /** Whether this provider is enabled */
  enabled: boolean;
  /** Default embed style for this provider */
  embedStyle: EmbedStyle;
  /** Show player for video/audio content */
  showPlayer: boolean;
  /** Custom timeout */
  timeout?: number;
  /** API key if required */
  apiKey?: string;
  /** Additional settings */
  settings?: Record<string, unknown>;
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default provider settings
 */
export const DEFAULT_PROVIDER_SETTINGS: Record<UrlProvider, ProviderSettings> =
  {
    twitter: { enabled: true, embedStyle: "card", showPlayer: false },
    youtube: { enabled: true, embedStyle: "player", showPlayer: true },
    github: { enabled: true, embedStyle: "card", showPlayer: false },
    spotify: { enabled: true, embedStyle: "player", showPlayer: true },
    reddit: { enabled: true, embedStyle: "card", showPlayer: false },
    twitch: { enabled: true, embedStyle: "player", showPlayer: true },
    vimeo: { enabled: true, embedStyle: "player", showPlayer: true },
    loom: { enabled: true, embedStyle: "player", showPlayer: true },
    figma: { enabled: true, embedStyle: "card", showPlayer: false },
    notion: { enabled: true, embedStyle: "card", showPlayer: false },
    slack: { enabled: false, embedStyle: "card", showPlayer: false },
    discord: { enabled: true, embedStyle: "card", showPlayer: false },
    linkedin: { enabled: true, embedStyle: "card", showPlayer: false },
    instagram: { enabled: true, embedStyle: "card", showPlayer: false },
    tiktok: { enabled: true, embedStyle: "player", showPlayer: true },
    medium: { enabled: true, embedStyle: "card", showPlayer: false },
    "dev.to": { enabled: true, embedStyle: "card", showPlayer: false },
    stackoverflow: { enabled: true, embedStyle: "card", showPlayer: false },
    codesandbox: { enabled: true, embedStyle: "player", showPlayer: true },
    codepen: { enabled: true, embedStyle: "player", showPlayer: true },
    jsfiddle: { enabled: true, embedStyle: "player", showPlayer: true },
    replit: { enabled: true, embedStyle: "player", showPlayer: true },
    generic: { enabled: true, embedStyle: "card", showPlayer: false },
  };

/**
 * Default blocked domains (security/spam)
 */
export const DEFAULT_BLOCKED_DOMAINS: string[] = [
  // Malicious/phishing patterns
  "*.tk",
  "*.ml",
  "*.ga",
  "*.cf",
  "*.gq",
  // Ad tracking
  "ad.doubleclick.net",
  "ads.google.com",
  "ads.facebook.com",
  // Private/internal
  "localhost",
  "*.local",
  "*.localhost",
  "*.internal",
  "127.0.0.1",
  "0.0.0.0",
];

/**
 * Create default domain rules configuration
 */
export function createDefaultDomainRulesConfig(): DomainRulesConfig {
  return {
    defaultBehavior: "allow",
    defaultEmbedStyle: "card",
    defaultTimeout: 10000,
    whitelistMode: false,
    rules: DEFAULT_BLOCKED_DOMAINS.map((domain) => ({
      domain,
      enabled: true,
      behavior: "block" as UnfurlBehavior,
      embedStyle: "card" as EmbedStyle,
      reason: "Default blocked domain",
    })),
    providers: { ...DEFAULT_PROVIDER_SETTINGS },
    userOverrides: new Map(),
    channelRules: new Map(),
  };
}

// ============================================================================
// Domain Matching
// ============================================================================

/**
 * Check if a domain matches a pattern (supports wildcards)
 */
export function matchDomainPattern(domain: string, pattern: string): boolean {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
  const normalizedPattern = pattern.toLowerCase().replace(/^www\./, "");

  // Direct match
  if (normalizedDomain === normalizedPattern) {
    return true;
  }

  // Wildcard match
  if (normalizedPattern.startsWith("*.")) {
    const suffix = normalizedPattern.slice(1); // Keep the dot
    return (
      normalizedDomain.endsWith(suffix) ||
      normalizedDomain === normalizedPattern.slice(2)
    );
  }

  // Subdomain match (domain ends with .pattern)
  if (normalizedDomain.endsWith("." + normalizedPattern)) {
    return true;
  }

  return false;
}

/**
 * Find the matching rule for a domain
 */
export function findMatchingRule(
  domain: string,
  config: DomainRulesConfig,
  channelId?: string,
  userId?: string,
): DomainRule | null {
  // Check user overrides first (highest priority)
  if (userId) {
    const userKey = `${userId}:${domain}`;
    const userRule = config.userOverrides.get(userKey);
    if (userRule) return userRule;
  }

  // Check channel-specific rules
  if (channelId) {
    const channelRules = config.channelRules.get(channelId) || [];
    for (const rule of channelRules.sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    )) {
      if (matchDomainPattern(domain, rule.domain)) {
        return rule;
      }
    }
  }

  // Check global rules (sorted by priority)
  const sortedRules = [...config.rules].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0),
  );
  for (const rule of sortedRules) {
    if (matchDomainPattern(domain, rule.domain)) {
      return rule;
    }
  }

  return null;
}

/**
 * Check if a domain is allowed
 */
export function isDomainAllowed(
  domain: string,
  config: DomainRulesConfig,
  channelId?: string,
  userId?: string,
): { allowed: boolean; reason?: string } {
  const rule = findMatchingRule(domain, config, channelId, userId);

  if (rule) {
    if (rule.behavior === "block") {
      return { allowed: false, reason: rule.reason || "Domain is blocked" };
    }
    return { allowed: true };
  }

  // In whitelist mode, unmatched domains are blocked
  if (config.whitelistMode) {
    return { allowed: false, reason: "Domain not in whitelist" };
  }

  // Default behavior
  if (config.defaultBehavior === "block") {
    return { allowed: false, reason: "Default behavior is block" };
  }

  return { allowed: true };
}

/**
 * Get the effective settings for a domain
 */
export function getDomainSettings(
  domain: string,
  provider: UrlProvider,
  config: DomainRulesConfig,
  channelId?: string,
  userId?: string,
): {
  behavior: UnfurlBehavior;
  embedStyle: EmbedStyle;
  timeout: number;
  showPlayer: boolean;
  maxImageHeight?: number;
  showDescription: boolean;
  showFavicon: boolean;
  showAuthor: boolean;
  customClass?: string;
} {
  // Get provider settings
  const providerSettings =
    config.providers[provider] || DEFAULT_PROVIDER_SETTINGS[provider];

  // Check for matching rule
  const rule = findMatchingRule(domain, config, channelId, userId);

  // Merge settings with priority: rule > provider > defaults
  return {
    behavior: rule?.behavior ?? config.defaultBehavior,
    embedStyle:
      rule?.embedStyle ??
      providerSettings.embedStyle ??
      config.defaultEmbedStyle,
    timeout: rule?.timeout ?? providerSettings.timeout ?? config.defaultTimeout,
    showPlayer: providerSettings.showPlayer ?? false,
    maxImageHeight: rule?.maxImageHeight,
    showDescription: rule?.showDescription ?? true,
    showFavicon: rule?.showFavicon ?? true,
    showAuthor: rule?.showAuthor ?? true,
    customClass: rule?.customClass,
  };
}

// ============================================================================
// Rule Management
// ============================================================================

/**
 * Add a new domain rule
 */
export function addDomainRule(
  config: DomainRulesConfig,
  rule: DomainRule,
): DomainRulesConfig {
  const now = new Date();
  const newRule = {
    ...rule,
    createdAt: rule.createdAt || now,
    updatedAt: now,
  };

  return {
    ...config,
    rules: [...config.rules, newRule],
  };
}

/**
 * Update an existing domain rule
 */
export function updateDomainRule(
  config: DomainRulesConfig,
  domain: string,
  updates: Partial<DomainRule>,
): DomainRulesConfig {
  const now = new Date();

  return {
    ...config,
    rules: config.rules.map((rule) =>
      rule.domain === domain
        ? {
            ...rule,
            ...updates,
            updatedAt: now,
          }
        : rule,
    ),
  };
}

/**
 * Remove a domain rule
 */
export function removeDomainRule(
  config: DomainRulesConfig,
  domain: string,
): DomainRulesConfig {
  return {
    ...config,
    rules: config.rules.filter((rule) => rule.domain !== domain),
  };
}

/**
 * Set user override for a domain
 */
export function setUserDomainOverride(
  config: DomainRulesConfig,
  userId: string,
  domain: string,
  rule: DomainRule,
): DomainRulesConfig {
  const newOverrides = new Map(config.userOverrides);
  newOverrides.set(`${userId}:${domain}`, rule);

  return {
    ...config,
    userOverrides: newOverrides,
  };
}

/**
 * Remove user override for a domain
 */
export function removeUserDomainOverride(
  config: DomainRulesConfig,
  userId: string,
  domain: string,
): DomainRulesConfig {
  const newOverrides = new Map(config.userOverrides);
  newOverrides.delete(`${userId}:${domain}`);

  return {
    ...config,
    userOverrides: newOverrides,
  };
}

/**
 * Set channel-specific rules
 */
export function setChannelRules(
  config: DomainRulesConfig,
  channelId: string,
  rules: DomainRule[],
): DomainRulesConfig {
  const newChannelRules = new Map(config.channelRules);
  newChannelRules.set(channelId, rules);

  return {
    ...config,
    channelRules: newChannelRules,
  };
}

/**
 * Update provider settings
 */
export function updateProviderSettings(
  config: DomainRulesConfig,
  provider: UrlProvider,
  settings: Partial<ProviderSettings>,
): DomainRulesConfig {
  return {
    ...config,
    providers: {
      ...config.providers,
      [provider]: {
        ...DEFAULT_PROVIDER_SETTINGS[provider],
        ...config.providers[provider],
        ...settings,
      },
    },
  };
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize domain rules config to JSON
 */
export function serializeDomainRulesConfig(config: DomainRulesConfig): string {
  const serializable = {
    ...config,
    userOverrides: Array.from(config.userOverrides.entries()),
    channelRules: Array.from(config.channelRules.entries()),
  };

  return JSON.stringify(serializable);
}

/**
 * Deserialize domain rules config from JSON
 */
export function deserializeDomainRulesConfig(json: string): DomainRulesConfig {
  const parsed = JSON.parse(json);

  return {
    ...parsed,
    userOverrides: new Map(parsed.userOverrides || []),
    channelRules: new Map(parsed.channelRules || []),
  };
}

/**
 * Export rules to a shareable format
 */
export function exportRules(config: DomainRulesConfig): object {
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    defaultBehavior: config.defaultBehavior,
    defaultEmbedStyle: config.defaultEmbedStyle,
    whitelistMode: config.whitelistMode,
    rules: config.rules.map((rule) => ({
      domain: rule.domain,
      behavior: rule.behavior,
      embedStyle: rule.embedStyle,
      reason: rule.reason,
    })),
    providers: config.providers,
  };
}

/**
 * Import rules from external format
 */
export function importRules(
  data: object,
  config: DomainRulesConfig,
): { config: DomainRulesConfig; imported: number; skipped: number } {
  const importData = data as {
    rules?: Array<{
      domain: string;
      behavior: UnfurlBehavior;
      embedStyle: EmbedStyle;
    }>;
    providers?: Partial<Record<UrlProvider, ProviderSettings>>;
    defaultBehavior?: UnfurlBehavior;
    whitelistMode?: boolean;
  };

  let imported = 0;
  let skipped = 0;
  let newConfig = { ...config };

  if (importData.rules) {
    for (const rule of importData.rules) {
      if (rule.domain && rule.behavior) {
        // Check if rule already exists
        const existingIndex = newConfig.rules.findIndex(
          (r) => r.domain === rule.domain,
        );
        if (existingIndex >= 0) {
          skipped++;
        } else {
          newConfig = addDomainRule(newConfig, {
            domain: rule.domain,
            enabled: true,
            behavior: rule.behavior,
            embedStyle: rule.embedStyle || "card",
          });
          imported++;
        }
      }
    }
  }

  if (importData.providers) {
    newConfig.providers = {
      ...newConfig.providers,
      ...importData.providers,
    };
  }

  if (importData.defaultBehavior) {
    newConfig.defaultBehavior = importData.defaultBehavior;
  }

  if (importData.whitelistMode !== undefined) {
    newConfig.whitelistMode = importData.whitelistMode;
  }

  return { config: newConfig, imported, skipped };
}
