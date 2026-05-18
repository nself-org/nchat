/**
 * i18next Configuration
 *
 * Configures i18next for the nself-chat application with support for 30+ languages,
 * RTL languages, and dynamic language switching.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { DEFAULT_LOCALE, FALLBACK_LOCALE, LOCALE_CODES } from "./locales";

/**
 * i18next configuration options
 */
export const i18nConfig = {
  // Supported locales
  supportedLngs: LOCALE_CODES,

  // Fallback locale
  fallbackLng: FALLBACK_LOCALE,

  // Default locale
  lng: DEFAULT_LOCALE,

  // Load namespaces
  ns: ["common", "auth", "chat", "settings", "admin", "errors"],
  defaultNS: "common",

  // Debug mode (only in development)
  debug: process.env.NODE_ENV === "development",

  // React options
  react: {
    useSuspense: true,
    bindI18n: "languageChanged loaded",
    bindI18nStore: "added removed",
    transEmptyNodeValue: "",
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ["br", "strong", "i", "em", "b", "code", "p"],
  },

  // Backend options
  backend: {
    loadPath: "/locales/{{lng}}/{{ns}}.json",
    requestOptions: {
      cache: "default",
    },
  },

  // Language detection options
  detection: {
    // Order of detection
    order: [
      "querystring",
      "localStorage",
      "navigator",
      "htmlTag",
      "path",
      "subdomain",
    ],

    // Keys for detection
    lookupQuerystring: "lng",
    lookupCookie: "i18next",
    lookupLocalStorage: "i18nextLng",
    lookupSessionStorage: "i18nextLng",
    lookupFromPathIndex: 0,
    lookupFromSubdomainIndex: 0,

    // Cache user language
    caches: ["localStorage", "cookie"],
    excludeCacheFor: ["cimode"],

    // Cookie options
    cookieMinutes: 10080, // 7 days
    cookieDomain:
      typeof window !== "undefined" ? window.location.hostname : undefined,

    // HTML tag options
    htmlTag:
      typeof document !== "undefined" ? document.documentElement : undefined,

    // Conversion between browser lang codes and i18next
    convertDetectedLanguage: (lng: string) => {
      // Handle language codes with country codes (e.g., en-US -> en)
      const detected = lng.split("-")[0];
      return LOCALE_CODES.includes(detected as any) ? detected : DEFAULT_LOCALE;
    },
  },

  // Interpolation options
  interpolation: {
    escapeValue: false, // React already escapes
    formatSeparator: ",",
    format: (value: any, format: string, lng: string) => {
      if (format === "uppercase") return value.toUpperCase();
      if (format === "lowercase") return value.toLowerCase();
      if (format === "capitalize")
        return value.charAt(0).toUpperCase() + value.slice(1);
      if (value instanceof Date) {
        return new Intl.DateTimeFormat(lng, {
          dateStyle: format as any,
        }).format(value);
      }
      return value;
    },
  },

  // Pluralization
  pluralSeparator: "_",

  // Context
  contextSeparator: "_",

  // Nesting
  nsSeparator: ":",
  keySeparator: ".",

  // Return null for missing keys
  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,

  // Join arrays
  joinArrays: " ",

  // Post processing
  postProcess: false,

  // Load options
  load: "languageOnly" as const, // Load only 'en' instead of 'en-US'
  preload: [DEFAULT_LOCALE],

  // Lowercase locale codes
  lowerCaseLng: true,
  cleanCode: true,

  // Save missing keys
  saveMissing: process.env.NODE_ENV === "development",
  saveMissingTo: "all",

  // Missing key handler
  missingKeyHandler: (lngs: string[], ns: string, key: string) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(`Missing translation: [${lngs.join(", ")}] ${ns}:${key}`);
    }
  },

  // Parse missing key handler
  parseMissingKeyHandler: (key: string) => {
    // Return the key itself as fallback
    return key;
  },

  // Append namespace to missing key
  appendNamespaceToCIMode: true,
};

/**
 * Initialize i18next
 */
export const initializeI18n = () => {
  if (!i18n.isInitialized) {
    i18n
      .use(HttpBackend)
      .use(LanguageDetector)
      .use(initReactI18next)
      // @ts-expect-error - i18next types mismatch with init return type
      .init(i18nConfig)
      .catch((error: any) => {
        console.error("Failed to initialize i18next:", error);
      });
  }

  return i18n;
};

/**
 * Change language
 */
export const changeLanguage = async (lng: string) => {
  try {
    await i18n.changeLanguage(lng);

    // Update HTML lang attribute
    if (typeof document !== "undefined") {
      document.documentElement.lang = lng;
    }

    // Update HTML dir attribute for RTL languages
    if (typeof document !== "undefined") {
      const localeConfig = await import("./locales").then((m) =>
        m.getLocaleConfig(lng),
      );
      if (localeConfig) {
        document.documentElement.dir = localeConfig.direction;
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to change language:", error);
    return false;
  }
};

/**
 * Get current language
 */
export const getCurrentLanguage = () => {
  return i18n.language || DEFAULT_LOCALE;
};

/**
 * Get available languages
 */
export const getAvailableLanguages = () => {
  return LOCALE_CODES;
};

/**
 * Check if language is RTL
 */
export const isRTL = (lng?: string) => {
  const language = lng || getCurrentLanguage();
  const localeConfig = require("./locales").getLocaleConfig(language);
  return localeConfig?.direction === "rtl";
};

/**
 * Export configured i18n instance
 */
export default i18n;
