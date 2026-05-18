/**
 * URL utilities for nself-chat
 * @module utils/url
 */

/**
 * Parsed URL information
 */
export interface ParsedUrl {
  /** Full URL string */
  href: string;
  /** Protocol (e.g., 'https:') */
  protocol: string;
  /** Host including port (e.g., 'example.com:8080') */
  host: string;
  /** Hostname without port (e.g., 'example.com') */
  hostname: string;
  /** Port number or empty string */
  port: string;
  /** Path (e.g., '/path/to/page') */
  pathname: string;
  /** Search string including ? (e.g., '?foo=bar') */
  search: string;
  /** Hash including # (e.g., '#section') */
  hash: string;
  /** Origin (e.g., 'https://example.com:8080') */
  origin: string;
  /** Query parameters as object */
  params: Record<string, string>;
}

/**
 * Parse a URL string
 * @param url - URL string to parse
 * @param base - Base URL for relative URLs
 * @returns Parsed URL information or null if invalid
 * @example
 * parseUrl('https://example.com/path?foo=bar#section')
 * // { href: '...', hostname: 'example.com', params: { foo: 'bar' }, ... }
 */
export function parseUrl(url: string, base?: string): ParsedUrl | null {
  try {
    const parsed = new URL(url, base);

    const params: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return {
      href: parsed.href,
      protocol: parsed.protocol,
      host: parsed.host,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      origin: parsed.origin,
      params,
    };
  } catch {
    return null;
  }
}

/**
 * URL building options
 */
export interface BuildUrlOptions {
  /** Base URL */
  base?: string;
  /** Path segments to join */
  path?: string | string[];
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Hash/fragment */
  hash?: string;
  /** Remove trailing slash (default: false) */
  removeTrailingSlash?: boolean;
}

/**
 * Build a URL from components
 * @param options - URL building options
 * @returns Constructed URL string
 * @example
 * buildUrl({
 *   base: 'https://api.example.com',
 *   path: ['users', '123'],
 *   params: { include: 'profile', active: true }
 * })
 * // 'https://api.example.com/users/123?include=profile&active=true'
 */
export function buildUrl(options: BuildUrlOptions): string {
  const {
    base = "",
    path,
    params,
    hash,
    removeTrailingSlash = false,
  } = options;

  let url = base;

  // Add path segments
  if (path) {
    const segments = Array.isArray(path) ? path : [path];
    const cleanSegments = segments
      .map((s) => s.replace(/^\/+|\/+$/g, "")) // Remove leading/trailing slashes
      .filter(Boolean);

    if (cleanSegments.length > 0) {
      url = url.replace(/\/+$/, ""); // Remove trailing slash from base
      url += "/" + cleanSegments.join("/");
    }
  }

  // Add query parameters
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  // Add hash
  if (hash) {
    const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash;
    if (cleanHash) {
      url += "#" + cleanHash;
    }
  }

  // Remove trailing slash if requested
  if (removeTrailingSlash) {
    // Don't remove if it's just the origin
    const urlObj = parseUrl(url);
    if (urlObj && urlObj.pathname !== "/") {
      url = url.replace(/\/+(\?|#|$)/, "$1");
    }
  }

  return url;
}

/**
 * Get query parameters from a URL
 * @param url - URL string or current location
 * @returns Query parameters object
 * @example
 * getQueryParams('https://example.com?foo=bar&baz=qux')
 * // { foo: 'bar', baz: 'qux' }
 */
export function getQueryParams(url?: string): Record<string, string> {
  let searchString: string;

  if (url) {
    const parsed = parseUrl(url);
    searchString = parsed?.search || "";
  } else if (typeof window !== "undefined") {
    searchString = window.location.search;
  } else {
    return {};
  }

  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(searchString);

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Get a single query parameter value
 * @param key - Parameter key
 * @param url - URL string (default: current location)
 * @returns Parameter value or null
 */
export function getQueryParam(key: string, url?: string): string | null {
  const params = getQueryParams(url);
  return params[key] ?? null;
}

/**
 * Set query parameters on a URL
 * @param url - Base URL
 * @param params - Parameters to set
 * @param replace - Replace existing params or merge (default: false)
 * @returns URL with updated parameters
 */
export function setQueryParams(
  url: string,
  params: Record<string, string | number | boolean | undefined | null>,
  replace: boolean = false,
): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;

  const existingParams = replace ? {} : parsed.params;
  const newParams = { ...existingParams };

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      delete newParams[key];
    } else {
      newParams[key] = String(value);
    }
  }

  const baseUrl = parsed.href.split("?")[0].split("#")[0];
  return buildUrl({
    base: baseUrl,
    params: newParams,
    hash: parsed.hash.slice(1),
  });
}

/**
 * Remove query parameters from a URL
 * @param url - URL string
 * @param keys - Keys to remove (or all if not specified)
 * @returns URL without specified parameters
 */
export function removeQueryParams(url: string, keys?: string[]): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;

  const baseUrl = parsed.href.split("?")[0].split("#")[0];

  if (!keys) {
    // Remove all params
    return baseUrl + (parsed.hash || "");
  }

  const keysToRemove = new Set(keys);
  const filteredParams: Record<string, string> = {};

  for (const [key, value] of Object.entries(parsed.params)) {
    if (!keysToRemove.has(key)) {
      filteredParams[key] = value;
    }
  }

  return buildUrl({
    base: baseUrl,
    params: filteredParams,
    hash: parsed.hash.slice(1),
  });
}

/**
 * Check if a URL is external (different origin)
 * @param url - URL to check
 * @param currentOrigin - Current origin (default: window.location.origin)
 * @returns Whether the URL is external
 * @example
 * isExternalUrl('https://google.com') // true
 * isExternalUrl('/path/to/page') // false
 * isExternalUrl('https://example.com', 'https://example.com') // false
 */
export function isExternalUrl(url: string, currentOrigin?: string): boolean {
  if (!url) return false;

  // Relative URLs are internal
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith(".")) {
    return false;
  }

  // Protocol-relative URLs need parsing
  const origin =
    currentOrigin ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const parsed = parseUrl(url, origin);
  if (!parsed) return false;

  // Compare origins
  const current = parseUrl(origin);
  if (!current) return true; // If we can't parse current, assume external

  return parsed.origin !== current.origin;
}

/**
 * Check if a URL is absolute
 * @param url - URL to check
 * @returns Whether the URL is absolute
 */
export function isAbsoluteUrl(url: string): boolean {
  if (!url) return false;
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
}

/**
 * Check if a URL is a valid URL
 * @param url - URL to check
 * @returns Whether the URL is valid
 */
export function isValidUrl(url: string): boolean {
  return parseUrl(url) !== null;
}

/**
 * Get the domain from a URL
 * @param url - URL string
 * @param includeSubdomain - Include subdomain (default: true)
 * @returns Domain or null if invalid
 * @example
 * getUrlDomain('https://www.example.com/path') // 'www.example.com'
 * getUrlDomain('https://www.example.com/path', false) // 'example.com'
 */
export function getUrlDomain(
  url: string,
  includeSubdomain: boolean = true,
): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  if (includeSubdomain) {
    return parsed.hostname;
  }

  // Extract root domain
  const parts = parsed.hostname.split(".");
  if (parts.length <= 2) {
    return parsed.hostname;
  }

  // Handle common TLDs like .co.uk
  const commonSuffixes = ["co", "com", "org", "net", "edu", "gov"];
  const secondLast = parts[parts.length - 2];

  if (commonSuffixes.includes(secondLast) && parts.length > 2) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

/**
 * Get the file extension from a URL path
 * @param url - URL string
 * @returns File extension (without dot) or null
 */
export function getUrlExtension(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const pathname = parsed.pathname;
  const lastDot = pathname.lastIndexOf(".");
  const lastSlash = pathname.lastIndexOf("/");

  if (lastDot > lastSlash && lastDot < pathname.length - 1) {
    return pathname.slice(lastDot + 1).toLowerCase();
  }

  return null;
}

/**
 * Join URL path segments
 * @param segments - Path segments to join
 * @returns Joined path
 * @example
 * joinPath('api', 'users', '123') // 'api/users/123'
 * joinPath('/api/', '/users/', '/123') // '/api/users/123'
 */
export function joinPath(...segments: string[]): string {
  return segments
    .filter(Boolean)
    .map((segment, index) => {
      let s = segment;

      // Remove trailing slashes (except for first segment's leading slash)
      s = s.replace(/\/+$/, "");

      // Remove leading slashes (except for first segment)
      if (index > 0) {
        s = s.replace(/^\/+/, "");
      }

      return s;
    })
    .filter(Boolean)
    .join("/");
}

/**
 * Normalize a URL path
 * @param path - Path to normalize
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
  // Handle empty path
  if (!path) return "/";

  // Ensure leading slash
  let normalized = path.startsWith("/") ? path : "/" + path;

  // Remove multiple consecutive slashes
  normalized = normalized.replace(/\/+/g, "/");

  // Remove trailing slash (except for root)
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Encode URL component (with better handling than encodeURIComponent)
 * @param str - String to encode
 * @returns Encoded string
 */
export function encodeUrlComponent(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/**
 * Safely decode URL component
 * @param str - String to decode
 * @returns Decoded string or original if invalid
 */
export function decodeUrlComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/**
 * Create a slug-friendly URL from text
 * @param text - Text to convert
 * @returns URL-friendly slug
 */
export function toUrlSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Remove multiple hyphens
}

/**
 * Add or update URL hash
 * @param url - URL string
 * @param hash - New hash value
 * @returns URL with updated hash
 */
export function setUrlHash(url: string, hash: string): string {
  const baseUrl = url.split("#")[0];
  const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash;
  return cleanHash ? `${baseUrl}#${cleanHash}` : baseUrl;
}

/**
 * Get the hash from a URL
 * @param url - URL string
 * @returns Hash value (without #) or empty string
 */
export function getUrlHash(url: string): string {
  const hashIndex = url.indexOf("#");
  return hashIndex >= 0 ? url.slice(hashIndex + 1) : "";
}

/**
 * Check if two URLs are the same (ignoring hash and trailing slash)
 * @param url1 - First URL
 * @param url2 - Second URL
 * @returns Whether URLs are the same
 */
export function isSameUrl(url1: string, url2: string): boolean {
  const normalize = (url: string) => {
    const parsed = parseUrl(url);
    if (!parsed) return url;

    let normalized = parsed.origin + parsed.pathname;
    if (parsed.search) {
      // Sort search params for comparison
      const params = new URLSearchParams(parsed.search);
      params.sort();
      const sortedSearch = params.toString();
      if (sortedSearch) {
        normalized += "?" + sortedSearch;
      }
    }
    return normalized.replace(/\/$/, "");
  };

  return normalize(url1) === normalize(url2);
}

/**
 * Add UTM parameters to a URL
 * @param url - Base URL
 * @param utm - UTM parameters
 * @returns URL with UTM parameters
 */
export function addUtmParams(
  url: string,
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  },
): string {
  const params: Record<string, string | undefined> = {
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
    utm_term: utm.term,
    utm_content: utm.content,
  };

  return setQueryParams(url, params);
}

/**
 * Check if URL matches a pattern (with wildcards)
 * @param url - URL to check
 * @param pattern - Pattern with * wildcards
 * @returns Whether URL matches pattern
 * @example
 * matchUrlPattern('/users/123', '/users/*') // true
 * matchUrlPattern('/api/v1/users', '/api/* /users') // true
 */
export function matchUrlPattern(url: string, pattern: string): boolean {
  // Escape special regex characters except *
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*");

  const regex = new RegExp(`^${escaped}$`);
  return regex.test(url);
}
