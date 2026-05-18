/**
 * Language Detector
 *
 * Auto-detects user's preferred language from various sources.
 */

import { i18nConfig } from "./i18n-config";
import { isValidLocale, DEFAULT_LOCALE, type LocaleCode } from "./locales";

/**
 * Detection source types
 */
export type DetectionSource =
  | "cookie"
  | "localStorage"
  | "queryString"
  | "navigator"
  | "htmlTag"
  | "path"
  | "subdomain"
  | "header";

/**
 * Detection result
 */
export interface DetectionResult {
  /** Detected locale code */
  locale: LocaleCode;
  /** Source where locale was detected */
  source: DetectionSource | "default";
  /** Confidence level (0-1) */
  confidence: number;
}

/**
 * Detection options
 */
export interface DetectorOptions {
  /** Sources to check in order of priority */
  order?: DetectionSource[];
  /** Cookie name */
  cookieName?: string;
  /** Local storage key */
  storageKey?: string;
  /** Query string parameter */
  queryParam?: string;
  /** Cache detection result */
  cacheResult?: boolean;
}

const defaultOptions: DetectorOptions = {
  order: ["cookie", "localStorage", "queryString", "navigator", "htmlTag"],
  cookieName: i18nConfig.cookieName,
  storageKey: i18nConfig.storageKey,
  queryParam: i18nConfig.urlParamName,
  cacheResult: true,
};

/**
 * Parse locale from cookie
 */
function detectFromCookie(cookieName: string): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === cookieName && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Parse locale from localStorage
 */
function detectFromLocalStorage(storageKey: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    // localStorage might be blocked
    return null;
  }
}

/**
 * Parse locale from query string
 */
function detectFromQueryString(paramName: string): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  return params.get(paramName);
}

/**
 * Parse locale from navigator.languages
 */
function detectFromNavigator(): string | null {
  if (typeof navigator === "undefined") return null;

  const languages: readonly string[] = navigator.languages || [
    navigator.language,
  ];

  for (const lang of languages) {
    // Try exact match first
    const exact = lang.toLowerCase();
    if (isValidLocale(exact)) return exact;

    // Try base language (e.g., 'en-US' -> 'en')
    // Use lang directly to avoid type narrowing from isValidLocale guard
    const base = lang.toLowerCase().split("-")[0];
    if (isValidLocale(base)) return base;
  }

  return null;
}

/**
 * Parse locale from HTML lang attribute
 */
function detectFromHtmlTag(): string | null {
  if (typeof document === "undefined") return null;

  const lang = document.documentElement.lang;
  if (!lang) return null;

  const base = lang.split("-")[0].toLowerCase();
  if (isValidLocale(base)) return base;
  if (isValidLocale(lang.toLowerCase())) return lang.toLowerCase();

  return null;
}

/**
 * Parse locale from URL path (e.g., /en/about)
 */
function detectFromPath(): string | null {
  if (typeof window === "undefined") return null;

  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  if (pathSegments.length > 0) {
    const firstSegment = pathSegments[0].toLowerCase();
    if (isValidLocale(firstSegment)) {
      return firstSegment;
    }
  }
  return null;
}

/**
 * Parse locale from subdomain (e.g., en.example.com)
 */
function detectFromSubdomain(): string | null {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname;
  const parts = hostname.split(".");

  // Need at least subdomain.domain.tld
  if (parts.length >= 3) {
    const subdomain = parts[0].toLowerCase();
    if (isValidLocale(subdomain)) {
      return subdomain;
    }
  }
  return null;
}

/**
 * Detection functions map
 */
const detectors: Record<
  DetectionSource,
  (options: DetectorOptions) => string | null
> = {
  cookie: (opts) => detectFromCookie(opts.cookieName!),
  localStorage: (opts) => detectFromLocalStorage(opts.storageKey!),
  queryString: (opts) => detectFromQueryString(opts.queryParam!),
  navigator: () => detectFromNavigator(),
  htmlTag: () => detectFromHtmlTag(),
  path: () => detectFromPath(),
  subdomain: () => detectFromSubdomain(),
  header: () => null, // Server-side only
};

// Cache for detection result
let cachedResult: DetectionResult | null = null;

/**
 * Detect user's preferred language
 */
export function detectLanguage(options: DetectorOptions = {}): DetectionResult {
  const opts = { ...defaultOptions, ...options };

  // Return cached result if available
  if (opts.cacheResult && cachedResult) {
    return cachedResult;
  }

  // Try each detection source in order
  for (const source of opts.order!) {
    const detector = detectors[source];
    if (!detector) continue;

    const locale = detector(opts);
    if (locale && isValidLocale(locale)) {
      const result: DetectionResult = {
        locale: locale as LocaleCode,
        source,
        confidence: getConfidence(source),
      };

      if (opts.cacheResult) {
        cachedResult = result;
      }

      return result;
    }
  }

  // Return default locale
  return {
    locale: DEFAULT_LOCALE as LocaleCode,
    source: "default",
    confidence: 0,
  };
}

/**
 * Get confidence level for a detection source
 */
function getConfidence(source: DetectionSource): number {
  switch (source) {
    case "cookie":
    case "localStorage":
      return 1.0; // User explicitly chose this
    case "queryString":
      return 0.9; // URL parameter
    case "path":
    case "subdomain":
      return 0.85; // URL-based
    case "navigator":
      return 0.7; // Browser settings
    case "htmlTag":
      return 0.5; // HTML attribute
    case "header":
      return 0.6; // Accept-Language header
    default:
      return 0;
  }
}

/**
 * Clear cached detection result
 */
export function clearDetectionCache(): void {
  cachedResult = null;
}

/**
 * Persist locale to storage
 */
export function persistLocale(
  locale: string,
  options: { cookie?: boolean; localStorage?: boolean } = {},
): void {
  const { cookie = true, localStorage = true } = options;

  if (cookie && typeof document !== "undefined") {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `${i18nConfig.cookieName}=${locale};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  if (localStorage && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(i18nConfig.storageKey, locale);
    } catch {
      // localStorage might be blocked
    }
  }

  // Clear cache to pick up new value
  clearDetectionCache();
}

/**
 * Remove persisted locale
 */
export function clearPersistedLocale(): void {
  if (typeof document !== "undefined") {
    document.cookie = `${i18nConfig.cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(i18nConfig.storageKey);
    } catch {
      // localStorage might be blocked
    }
  }

  clearDetectionCache();
}

/**
 * Get locale from Accept-Language header (server-side)
 */
export function parseAcceptLanguage(header: string): string | null {
  if (!header) return null;

  // Parse header: "en-US,en;q=0.9,es;q=0.8"
  const languages = header.split(",").map((lang) => {
    const [code, qValue] = lang.trim().split(";q=");
    return {
      code: code.trim().toLowerCase(),
      quality: qValue ? parseFloat(qValue) : 1.0,
    };
  });

  // Sort by quality
  languages.sort((a, b) => b.quality - a.quality);

  for (const item of languages) {
    const code = item.code;
    // Compute base language before type narrowing
    const baseLang = code.split("-")[0];

    // Try exact match
    if (isValidLocale(code)) return code;

    // Try base language
    if (isValidLocale(baseLang)) return baseLang;
  }

  return null;
}

/**
 * Detect language from request headers (server-side)
 */
export function detectFromHeaders(headers: {
  "accept-language"?: string;
  cookie?: string;
}): DetectionResult {
  // Try cookie first
  if (headers.cookie) {
    const cookies = headers.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === i18nConfig.cookieName && value) {
        const locale = decodeURIComponent(value);
        if (isValidLocale(locale)) {
          return {
            locale: locale as LocaleCode,
            source: "cookie",
            confidence: 1.0,
          };
        }
      }
    }
  }

  // Try Accept-Language header
  if (headers["accept-language"]) {
    const locale = parseAcceptLanguage(headers["accept-language"]);
    if (locale && isValidLocale(locale)) {
      return {
        locale: locale as LocaleCode,
        source: "header",
        confidence: 0.6,
      };
    }
  }

  return {
    locale: DEFAULT_LOCALE as LocaleCode,
    source: "default",
    confidence: 0,
  };
}
