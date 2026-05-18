/**
 * i18n Configuration
 *
 * Central configuration for the internationalization system.
 */

import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALE_CODES,
  type LocaleCode,
} from "./locales";

/**
 * i18n configuration options
 */
export interface I18nConfig {
  /** Default locale to use */
  defaultLocale: LocaleCode;
  /** Fallback locale when translation is missing */
  fallbackLocale: LocaleCode;
  /** List of supported locale codes */
  supportedLocales: readonly string[];
  /** Whether to show missing translation warnings in console */
  debug: boolean;
  /** Whether to load translations on demand (lazy loading) */
  lazyLoad: boolean;
  /** Key separator for nested translations (e.g., 'common.buttons.save') */
  keySeparator: string;
  /** Namespace separator (e.g., 'chat:messages.new') */
  namespaceSeparator: string;
  /** Plural separator (e.g., 'message_one', 'message_other') */
  pluralSeparator: string;
  /** Context separator (e.g., 'greeting_male', 'greeting_female') */
  contextSeparator: string;
  /** Interpolation start delimiter */
  interpolationStart: string;
  /** Interpolation end delimiter */
  interpolationEnd: string;
  /** Default namespace to use if none specified */
  defaultNamespace: string;
  /** Available namespaces */
  namespaces: readonly string[];
  /** Whether to escape interpolated values */
  escapeValue: boolean;
  /** Whether to load all namespaces on init */
  preloadNamespaces: boolean;
  /** Storage key for persisting locale preference */
  storageKey: string;
  /** Cookie name for locale (for SSR) */
  cookieName: string;
  /** Cookie max age in seconds */
  cookieMaxAge: number;
  /** Whether to detect locale from browser */
  detectBrowserLocale: boolean;
  /** Whether to detect locale from URL */
  detectUrlLocale: boolean;
  /** URL parameter name for locale */
  urlParamName: string;
  /** Whether to persist locale to localStorage */
  persistLocale: boolean;
}

/**
 * Default i18n configuration
 */
export const i18nConfig: I18nConfig = {
  defaultLocale: DEFAULT_LOCALE as LocaleCode,
  fallbackLocale: FALLBACK_LOCALE as LocaleCode,
  supportedLocales: LOCALE_CODES,
  debug: process.env.NODE_ENV === "development",
  lazyLoad: true,
  keySeparator: ".",
  namespaceSeparator: ":",
  pluralSeparator: "_",
  contextSeparator: "_",
  interpolationStart: "{{",
  interpolationEnd: "}}",
  defaultNamespace: "common",
  namespaces: [
    "common",
    "chat",
    "settings",
    "admin",
    "auth",
    "errors",
  ] as const,
  escapeValue: true,
  preloadNamespaces: false,
  storageKey: "nchat-locale",
  cookieName: "NCHAT_LOCALE",
  cookieMaxAge: 365 * 24 * 60 * 60, // 1 year
  detectBrowserLocale: true,
  detectUrlLocale: false,
  urlParamName: "lang",
  persistLocale: true,
};

/**
 * Namespace type
 */
export type Namespace = (typeof i18nConfig.namespaces)[number];

/**
 * Get config value
 */
export function getI18nConfig<K extends keyof I18nConfig>(
  key: K,
): I18nConfig[K] {
  return i18nConfig[key];
}

/**
 * Check if namespace is valid
 */
export function isValidNamespace(ns: string): ns is Namespace {
  return i18nConfig.namespaces.includes(ns as Namespace);
}

/**
 * Parse translation key with namespace
 * e.g., 'chat:messages.new' => { namespace: 'chat', key: 'messages.new' }
 */
export function parseTranslationKey(fullKey: string): {
  namespace: string;
  key: string;
} {
  const parts = fullKey.split(i18nConfig.namespaceSeparator);
  if (parts.length === 2) {
    return {
      namespace: parts[0],
      key: parts[1],
    };
  }
  return {
    namespace: i18nConfig.defaultNamespace,
    key: fullKey,
  };
}

/**
 * Build full translation key
 */
export function buildTranslationKey(namespace: string, key: string): string {
  if (namespace === i18nConfig.defaultNamespace) {
    return key;
  }
  return `${namespace}${i18nConfig.namespaceSeparator}${key}`;
}

/**
 * Environment-aware config overrides
 */
export function getEnvironmentConfig(): Partial<I18nConfig> {
  if (typeof window === "undefined") {
    // Server-side
    return {
      detectBrowserLocale: false,
      persistLocale: false,
    };
  }
  return {};
}

/**
 * Merged config with environment overrides
 */
export function getMergedConfig(): I18nConfig {
  return {
    ...i18nConfig,
    ...getEnvironmentConfig(),
  };
}
