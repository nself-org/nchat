/**
 * Translator
 *
 * Core translation function that handles string interpolation,
 * pluralization, and fallbacks.
 */

import { i18nConfig, parseTranslationKey, type Namespace } from "./i18n-config";
import {
  getPluralCategory,
  buildPluralKey,
  type PluralCategory,
} from "./plurals";
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  isValidLocale,
  type LocaleCode,
} from "./locales";

import { logger } from "@/lib/logger";

/**
 * Translation value types
 */
export type TranslationValue = string | TranslationObject;
export type TranslationObject = { [key: string]: TranslationValue };

/**
 * Translation store type
 */
export type TranslationStore = Record<
  string,
  Record<string, TranslationObject>
>;

/**
 * Interpolation values
 */
export type InterpolationValues = Record<string, string | number | boolean>;

/**
 * Translation options
 */
export interface TranslateOptions {
  /** Count for pluralization */
  count?: number;
  /** Context for contextual translations */
  context?: string;
  /** Interpolation values */
  values?: InterpolationValues;
  /** Default value if translation not found */
  defaultValue?: string;
  /** Namespace to use */
  ns?: string;
  /** Locale to use (overrides current) */
  locale?: string;
}

// In-memory translation cache
const translationCache: TranslationStore = {};

// Current locale
let currentLocale: LocaleCode = DEFAULT_LOCALE as LocaleCode;

// Loaded namespaces per locale
const loadedNamespaces: Record<string, Set<string>> = {};

// Missing translation handlers
type MissingTranslationHandler = (key: string, locale: string) => void;
const missingHandlers: MissingTranslationHandler[] = [];

/**
 * Set the current locale
 */
export function setCurrentLocale(locale: string): void {
  if (isValidLocale(locale)) {
    currentLocale = locale as LocaleCode;
  } else if (i18nConfig.debug) {
    logger.warn(`[i18n] Invalid locale: ${locale}`);
  }
}

/**
 * Get the current locale
 */
export function getCurrentLocale(): LocaleCode {
  return currentLocale;
}

/**
 * Register translations for a locale and namespace
 */
export function registerTranslations(
  locale: string,
  namespace: string,
  translations: TranslationObject,
): void {
  if (!translationCache[locale]) {
    translationCache[locale] = {};
  }
  translationCache[locale][namespace] = deepMerge(
    translationCache[locale][namespace] || {},
    translations,
  );

  // Track loaded namespace
  if (!loadedNamespaces[locale]) {
    loadedNamespaces[locale] = new Set();
  }
  loadedNamespaces[locale].add(namespace);
}

/**
 * Check if a namespace is loaded
 */
export function isNamespaceLoaded(locale: string, namespace: string): boolean {
  return loadedNamespaces[locale]?.has(namespace) ?? false;
}

/**
 * Get all loaded namespaces for a locale
 */
export function getLoadedNamespaces(locale: string): string[] {
  return Array.from(loadedNamespaces[locale] || []);
}

/**
 * Deep merge objects
 */
function deepMerge(
  target: TranslationObject,
  source: TranslationObject,
): TranslationObject {
  const result: TranslationObject = { ...target };

  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === "object" &&
      source[key] !== null &&
      typeof target[key] === "object" &&
      target[key] !== null
    ) {
      result[key] = deepMerge(
        target[key] as TranslationObject,
        source[key] as TranslationObject,
      );
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Get nested value from object by dot-separated path
 */
function getNestedValue(
  obj: TranslationObject | undefined,
  path: string,
): string | undefined {
  if (!obj) return undefined;

  const keys = path.split(i18nConfig.keySeparator);
  let current: TranslationValue | undefined = obj;

  for (const key of keys) {
    if (current === undefined || typeof current === "string") {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Look up translation in cache
 */
function lookupTranslation(
  locale: string,
  namespace: string,
  key: string,
): string | undefined {
  const translations = translationCache[locale]?.[namespace];
  return getNestedValue(translations, key);
}

/**
 * Interpolate values into translation string
 */
function interpolate(
  text: string,
  values: InterpolationValues,
  escape: boolean = true,
): string {
  const { interpolationStart, interpolationEnd } = i18nConfig;

  return text.replace(
    new RegExp(
      `${escapeRegex(interpolationStart)}\\s*([\\w.]+)\\s*${escapeRegex(interpolationEnd)}`,
      "g",
    ),
    (_, key) => {
      const value = values[key];
      if (value === undefined)
        return `${interpolationStart}${key}${interpolationEnd}`;

      const stringValue = String(value);
      return escape ? escapeHtml(stringValue) : stringValue;
    },
  );
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Build full key with plural/context suffixes
 */
function buildFullKey(
  key: string,
  options: TranslateOptions,
  locale: string,
): string[] {
  const keys: string[] = [];
  const { count, context } = options;
  const { pluralSeparator, contextSeparator } = i18nConfig;

  // Build key variants in order of specificity
  if (count !== undefined && context) {
    // key_context_plural
    const plural = getPluralCategory(locale, count);
    keys.push(`${key}${contextSeparator}${context}${pluralSeparator}${plural}`);
  }

  if (count !== undefined) {
    // key_plural
    const plural = getPluralCategory(locale, count);
    keys.push(`${key}${pluralSeparator}${plural}`);

    // Also try key_other as fallback
    if (plural !== "other") {
      keys.push(`${key}${pluralSeparator}other`);
    }
  }

  if (context) {
    // key_context
    keys.push(`${key}${contextSeparator}${context}`);
  }

  // Base key
  keys.push(key);

  return keys;
}

/**
 * Notify missing translation handlers
 */
function notifyMissing(key: string, locale: string): void {
  for (const handler of missingHandlers) {
    handler(key, locale);
  }
}

/**
 * Main translation function
 */
export function translate(key: string, options: TranslateOptions = {}): string {
  const {
    ns,
    locale: localeOverride,
    defaultValue,
    values = {},
    count,
  } = options;

  // Parse namespace from key
  const { namespace, key: translationKey } = parseTranslationKey(key);
  const finalNamespace = ns || namespace;
  const locale = localeOverride || currentLocale;

  // Add count to interpolation values
  const interpolationValues: InterpolationValues = { ...values };
  if (count !== undefined) {
    interpolationValues.count = count;
  }

  // Build key variants to try
  const keyVariants = buildFullKey(translationKey, options, locale);

  // Try each key variant
  for (const keyVariant of keyVariants) {
    // Try current locale
    const translation = lookupTranslation(locale, finalNamespace, keyVariant);
    if (translation) {
      return interpolate(
        translation,
        interpolationValues,
        i18nConfig.escapeValue,
      );
    }
  }

  // Try fallback locale
  if (locale !== FALLBACK_LOCALE) {
    for (const keyVariant of keyVariants) {
      const fallbackTranslation = lookupTranslation(
        FALLBACK_LOCALE,
        finalNamespace,
        keyVariant,
      );
      if (fallbackTranslation) {
        if (i18nConfig.debug) {
          logger.warn(
            `[i18n] Missing translation for "${key}" in "${locale}", using fallback`,
          );
        }
        return interpolate(
          fallbackTranslation,
          interpolationValues,
          i18nConfig.escapeValue,
        );
      }
    }
  }

  // Log missing translation in debug mode
  if (i18nConfig.debug) {
    logger.warn(`[i18n] Missing translation: "${key}" (${locale})`);
  }

  // Notify handlers
  notifyMissing(key, locale);

  // Return default value or key
  return defaultValue || key;
}

/**
 * Shorthand for translate
 */
export const t = translate;

/**
 * Check if translation exists
 */
export function hasTranslation(key: string, locale?: string): boolean {
  const { namespace, key: translationKey } = parseTranslationKey(key);
  const targetLocale = locale || currentLocale;
  return (
    lookupTranslation(targetLocale, namespace, translationKey) !== undefined
  );
}

/**
 * Get all keys for a namespace
 */
export function getTranslationKeys(
  namespace: string,
  locale?: string,
): string[] {
  const targetLocale = locale || currentLocale;
  const translations = translationCache[targetLocale]?.[namespace];
  if (!translations) return [];

  const keys: string[] = [];
  const flatten = (obj: TranslationObject, prefix: string = "") => {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "string") {
        keys.push(fullKey);
      } else {
        flatten(value, fullKey);
      }
    }
  };
  flatten(translations);
  return keys;
}

/**
 * Add handler for missing translations
 */
export function onMissingTranslation(
  handler: MissingTranslationHandler,
): () => void {
  missingHandlers.push(handler);
  return () => {
    const index = missingHandlers.indexOf(handler);
    if (index > -1) {
      missingHandlers.splice(index, 1);
    }
  };
}

/**
 * Clear all translations (useful for testing)
 */
export function clearTranslations(): void {
  for (const locale of Object.keys(translationCache)) {
    delete translationCache[locale];
  }
  for (const locale of Object.keys(loadedNamespaces)) {
    loadedNamespaces[locale].clear();
  }
}

/**
 * Get raw translation object (for debugging/admin)
 */
export function getRawTranslations(
  locale: string,
  namespace: string,
): TranslationObject | undefined {
  return translationCache[locale]?.[namespace];
}

/**
 * Create namespaced translator
 */
export function createNamespacedTranslator(
  namespace: string,
): (key: string, options?: Omit<TranslateOptions, "ns">) => string {
  return (key, options = {}) => translate(key, { ...options, ns: namespace });
}

/**
 * Plural helper
 */
export function plural(
  count: number,
  options: {
    one: string;
    other: string;
    zero?: string;
    two?: string;
    few?: string;
    many?: string;
  },
  locale?: string,
): string {
  const category = getPluralCategory(locale || currentLocale, count);
  const value = options[category] ?? options.other;
  return interpolate(value, { count }, false);
}
