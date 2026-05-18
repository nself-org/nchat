/**
 * User Unfurl Preferences Hook
 *
 * Manages user preferences for link unfurling:
 * - Enable/disable unfurls globally
 * - Per-domain settings
 * - Display preferences
 * - Blocked domains
 *
 * @module hooks/use-unfurl-preferences
 */

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  DomainRule,
  EmbedStyle,
  UnfurlBehavior,
  DomainRulesConfig,
  createDefaultDomainRulesConfig,
  setUserDomainOverride,
  removeUserDomainOverride,
  isDomainAllowed,
  getDomainSettings,
  serializeDomainRulesConfig,
  deserializeDomainRulesConfig,
} from "@/lib/unfurl/domain-rules";
import { UrlProvider } from "@/lib/unfurl/url-parser";

// ============================================================================
// Types
// ============================================================================

export interface UnfurlPreferences {
  /** Global enable/disable for link previews */
  enabled: boolean;
  /** Auto-unfurl URLs as user types */
  autoUnfurl: boolean;
  /** Collapse previews by default */
  collapseByDefault: boolean;
  /** Show images in previews */
  showImages: boolean;
  /** Show descriptions in previews */
  showDescriptions: boolean;
  /** Show favicons in previews */
  showFavicons: boolean;
  /** Maximum image height in pixels */
  maxImageHeight: number;
  /** Use compact mode for previews */
  compactMode: boolean;
  /** Lazy load preview images */
  lazyLoadImages: boolean;
  /** Preload images on hover */
  preloadOnHover: boolean;
  /** Hide referrer when opening links */
  hideReferrer: boolean;
  /** Default embed style */
  defaultEmbedStyle: EmbedStyle;
  /** User's blocked domains */
  blockedDomains: string[];
  /** User's allowed domains (whitelist mode) */
  allowedDomains: string[];
  /** Enable whitelist mode */
  whitelistMode: boolean;
}

export interface UseUnfurlPreferencesOptions {
  /** User ID */
  userId?: string;
  /** Channel ID for channel-specific settings */
  channelId?: string;
  /** Storage key prefix */
  storageKey?: string;
  /** Callback when preferences change */
  onPreferencesChange?: (preferences: UnfurlPreferences) => void;
}

export interface UseUnfurlPreferencesReturn {
  /** Current preferences */
  preferences: UnfurlPreferences;
  /** Domain rules configuration */
  domainRulesConfig: DomainRulesConfig;
  /** Whether preferences are loading */
  isLoading: boolean;
  /** Update preferences */
  updatePreferences: (updates: Partial<UnfurlPreferences>) => void;
  /** Block a domain */
  blockDomain: (domain: string, reason?: string) => void;
  /** Unblock a domain */
  unblockDomain: (domain: string) => void;
  /** Allow a domain (in whitelist mode) */
  allowDomain: (domain: string) => void;
  /** Remove domain from allowed list */
  disallowDomain: (domain: string) => void;
  /** Check if a domain is allowed */
  checkDomainAllowed: (domain: string) => { allowed: boolean; reason?: string };
  /** Get settings for a domain */
  getDomainConfig: (
    domain: string,
    provider: UrlProvider,
  ) => {
    behavior: UnfurlBehavior;
    embedStyle: EmbedStyle;
    timeout: number;
    showPlayer: boolean;
    showDescription: boolean;
    showFavicon: boolean;
    showAuthor: boolean;
  };
  /** Set custom domain override */
  setDomainOverride: (domain: string, settings: Partial<DomainRule>) => void;
  /** Remove custom domain override */
  removeDomainOverride: (domain: string) => void;
  /** Reset to default preferences */
  resetToDefaults: () => void;
  /** Export preferences for backup */
  exportPreferences: () => string;
  /** Import preferences from backup */
  importPreferences: (data: string) => boolean;
}

// ============================================================================
// Default Preferences
// ============================================================================

export const DEFAULT_UNFURL_PREFERENCES: UnfurlPreferences = {
  enabled: true,
  autoUnfurl: true,
  collapseByDefault: false,
  showImages: true,
  showDescriptions: true,
  showFavicons: true,
  maxImageHeight: 300,
  compactMode: false,
  lazyLoadImages: true,
  preloadOnHover: false,
  hideReferrer: true,
  defaultEmbedStyle: "card",
  blockedDomains: [],
  allowedDomains: [],
  whitelistMode: false,
};

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY_PREFERENCES = "nchat:unfurl:preferences";
const STORAGE_KEY_DOMAIN_RULES = "nchat:unfurl:domain-rules";

// ============================================================================
// Hook Implementation
// ============================================================================

export function useUnfurlPreferences(
  options: UseUnfurlPreferencesOptions = {},
): UseUnfurlPreferencesReturn {
  const { userId, channelId, storageKey = "", onPreferencesChange } = options;

  // State
  const [preferences, setPreferences] = useState<UnfurlPreferences>(
    DEFAULT_UNFURL_PREFERENCES,
  );
  const [domainRulesConfig, setDomainRulesConfig] = useState<DomainRulesConfig>(
    createDefaultDomainRulesConfig(),
  );
  const [isLoading, setIsLoading] = useState(true);

  // Storage keys with optional prefix
  const preferencesKey = storageKey
    ? `${storageKey}:${STORAGE_KEY_PREFERENCES}`
    : STORAGE_KEY_PREFERENCES;
  const domainRulesKey = storageKey
    ? `${storageKey}:${STORAGE_KEY_DOMAIN_RULES}`
    : STORAGE_KEY_DOMAIN_RULES;

  // Load preferences from storage
  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      // Load preferences
      const storedPrefs = localStorage.getItem(preferencesKey);
      if (storedPrefs) {
        const parsed = JSON.parse(storedPrefs);
        setPreferences({ ...DEFAULT_UNFURL_PREFERENCES, ...parsed });
      }

      // Load domain rules
      const storedRules = localStorage.getItem(domainRulesKey);
      if (storedRules) {
        const parsed = deserializeDomainRulesConfig(storedRules);
        setDomainRulesConfig(parsed);
      }
    } catch (error) {
      console.error("Failed to load unfurl preferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, [preferencesKey, domainRulesKey]);

  // Save preferences to storage
  const savePreferences = useCallback(
    (newPrefs: UnfurlPreferences) => {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(preferencesKey, JSON.stringify(newPrefs));
        }
      } catch (error) {
        console.error("Failed to save unfurl preferences:", error);
      }
    },
    [preferencesKey],
  );

  // Save domain rules to storage
  const saveDomainRules = useCallback(
    (newRules: DomainRulesConfig) => {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            domainRulesKey,
            serializeDomainRulesConfig(newRules),
          );
        }
      } catch (error) {
        console.error("Failed to save domain rules:", error);
      }
    },
    [domainRulesKey],
  );

  // Update preferences
  const updatePreferences = useCallback(
    (updates: Partial<UnfurlPreferences>) => {
      setPreferences((prev) => {
        const newPrefs = { ...prev, ...updates };
        savePreferences(newPrefs);
        onPreferencesChange?.(newPrefs);
        return newPrefs;
      });
    },
    [savePreferences, onPreferencesChange],
  );

  // Block a domain
  const blockDomain = useCallback(
    (domain: string, reason?: string) => {
      // Add to blocked domains in preferences
      setPreferences((prev) => {
        const newBlockedDomains = [
          ...new Set([...prev.blockedDomains, domain]),
        ];
        const newPrefs = { ...prev, blockedDomains: newBlockedDomains };
        savePreferences(newPrefs);
        return newPrefs;
      });

      // Add rule to domain config
      if (userId) {
        setDomainRulesConfig((prev) => {
          const newConfig = setUserDomainOverride(prev, userId, domain, {
            domain,
            enabled: true,
            behavior: "block",
            embedStyle: "card",
            reason: reason || "Blocked by user",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          saveDomainRules(newConfig);
          return newConfig;
        });
      }
    },
    [userId, savePreferences, saveDomainRules],
  );

  // Unblock a domain
  const unblockDomain = useCallback(
    (domain: string) => {
      // Remove from blocked domains in preferences
      setPreferences((prev) => {
        const newBlockedDomains = prev.blockedDomains.filter(
          (d) => d !== domain,
        );
        const newPrefs = { ...prev, blockedDomains: newBlockedDomains };
        savePreferences(newPrefs);
        return newPrefs;
      });

      // Remove rule from domain config
      if (userId) {
        setDomainRulesConfig((prev) => {
          const newConfig = removeUserDomainOverride(prev, userId, domain);
          saveDomainRules(newConfig);
          return newConfig;
        });
      }
    },
    [userId, savePreferences, saveDomainRules],
  );

  // Allow a domain (whitelist mode)
  const allowDomain = useCallback(
    (domain: string) => {
      setPreferences((prev) => {
        const newAllowedDomains = [
          ...new Set([...prev.allowedDomains, domain]),
        ];
        const newPrefs = { ...prev, allowedDomains: newAllowedDomains };
        savePreferences(newPrefs);
        return newPrefs;
      });
    },
    [savePreferences],
  );

  // Disallow a domain
  const disallowDomain = useCallback(
    (domain: string) => {
      setPreferences((prev) => {
        const newAllowedDomains = prev.allowedDomains.filter(
          (d) => d !== domain,
        );
        const newPrefs = { ...prev, allowedDomains: newAllowedDomains };
        savePreferences(newPrefs);
        return newPrefs;
      });
    },
    [savePreferences],
  );

  // Check if a domain is allowed
  const checkDomainAllowed = useCallback(
    (domain: string): { allowed: boolean; reason?: string } => {
      // Check global enable
      if (!preferences.enabled) {
        return { allowed: false, reason: "Link previews are disabled" };
      }

      // Check blocked domains
      if (preferences.blockedDomains.includes(domain)) {
        return { allowed: false, reason: "Domain is blocked by user" };
      }

      // Check whitelist mode
      if (
        preferences.whitelistMode &&
        !preferences.allowedDomains.includes(domain)
      ) {
        return { allowed: false, reason: "Domain not in allowed list" };
      }

      // Check domain rules
      return isDomainAllowed(domain, domainRulesConfig, channelId, userId);
    },
    [preferences, domainRulesConfig, channelId, userId],
  );

  // Get settings for a domain
  const getDomainConfig = useCallback(
    (domain: string, provider: UrlProvider) => {
      return getDomainSettings(
        domain,
        provider,
        domainRulesConfig,
        channelId,
        userId,
      );
    },
    [domainRulesConfig, channelId, userId],
  );

  // Set custom domain override
  const setDomainOverride = useCallback(
    (domain: string, settings: Partial<DomainRule>) => {
      if (!userId) return;

      setDomainRulesConfig((prev) => {
        const newConfig = setUserDomainOverride(prev, userId, domain, {
          domain,
          enabled: true,
          behavior: "allow",
          embedStyle: "card",
          ...settings,
          updatedAt: new Date(),
        } as DomainRule);
        saveDomainRules(newConfig);
        return newConfig;
      });
    },
    [userId, saveDomainRules],
  );

  // Remove custom domain override
  const removeDomainOverride = useCallback(
    (domain: string) => {
      if (!userId) return;

      setDomainRulesConfig((prev) => {
        const newConfig = removeUserDomainOverride(prev, userId, domain);
        saveDomainRules(newConfig);
        return newConfig;
      });
    },
    [userId, saveDomainRules],
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_UNFURL_PREFERENCES);
    setDomainRulesConfig(createDefaultDomainRulesConfig());
    savePreferences(DEFAULT_UNFURL_PREFERENCES);
    saveDomainRules(createDefaultDomainRulesConfig());
  }, [savePreferences, saveDomainRules]);

  // Export preferences
  const exportPreferences = useCallback((): string => {
    return JSON.stringify({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      preferences,
      domainRules: {
        rules: domainRulesConfig.rules,
        providers: domainRulesConfig.providers,
        defaultBehavior: domainRulesConfig.defaultBehavior,
        whitelistMode: domainRulesConfig.whitelistMode,
      },
    });
  }, [preferences, domainRulesConfig]);

  // Import preferences
  const importPreferences = useCallback(
    (data: string): boolean => {
      try {
        const parsed = JSON.parse(data);

        if (parsed.preferences) {
          const newPrefs = {
            ...DEFAULT_UNFURL_PREFERENCES,
            ...parsed.preferences,
          };
          setPreferences(newPrefs);
          savePreferences(newPrefs);
        }

        if (parsed.domainRules) {
          const newRules = {
            ...createDefaultDomainRulesConfig(),
            ...parsed.domainRules,
            userOverrides: new Map(),
            channelRules: new Map(),
          };
          setDomainRulesConfig(newRules);
          saveDomainRules(newRules);
        }

        return true;
      } catch (error) {
        console.error("Failed to import preferences:", error);
        return false;
      }
    },
    [savePreferences, saveDomainRules],
  );

  return {
    preferences,
    domainRulesConfig,
    isLoading,
    updatePreferences,
    blockDomain,
    unblockDomain,
    allowDomain,
    disallowDomain,
    checkDomainAllowed,
    getDomainConfig,
    setDomainOverride,
    removeDomainOverride,
    resetToDefaults,
    exportPreferences,
    importPreferences,
  };
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Check if previews should be shown for a URL
 */
export function useShouldShowPreview(
  url: string,
  options: UseUnfurlPreferencesOptions = {},
) {
  const { preferences, checkDomainAllowed, isLoading } =
    useUnfurlPreferences(options);

  return useMemo(() => {
    if (isLoading) {
      return { shouldShow: false, reason: "Loading preferences" };
    }

    if (!preferences.enabled) {
      return { shouldShow: false, reason: "Link previews disabled" };
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, "");
      return checkDomainAllowed(domain);
    } catch {
      return { shouldShow: false, reason: "Invalid URL" };
    }
  }, [url, preferences.enabled, checkDomainAllowed, isLoading]);
}
