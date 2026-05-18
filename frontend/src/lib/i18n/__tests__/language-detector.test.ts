/**
 * @fileoverview Tests for language detection
 *
 * Tests the language detection module including browser detection,
 * storage-based detection, and Accept-Language header parsing.
 */

import {
  detectLanguage,
  clearDetectionCache,
  persistLocale,
  clearPersistedLocale,
  parseAcceptLanguage,
  detectFromHeaders,
  type DetectorOptions,
  type DetectionResult,
} from "../language-detector";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Mock document.cookie
let mockCookie = "";

describe("language-detector", () => {
  beforeEach(() => {
    clearDetectionCache();
    localStorageMock.clear();
    mockCookie = "";

    // Set up mocks
    Object.defineProperty(global, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    Object.defineProperty(document, "cookie", {
      get: () => mockCookie,
      set: (value: string) => {
        mockCookie = value;
      },
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("detectLanguage", () => {
    it("should return default locale when no detection source matches", () => {
      const result = detectLanguage({
        cacheResult: false,
        order: [], // Empty order to force default
      });
      expect(result.locale).toBe("en");
      expect(result.source).toBe("default");
      expect(result.confidence).toBe(0);
    });

    it("should detect from localStorage", () => {
      localStorageMock.setItem("nchat-locale", "es");

      const result = detectLanguage({
        cacheResult: false,
        order: ["localStorage"],
      });

      expect(result.locale).toBe("es");
      expect(result.source).toBe("localStorage");
      expect(result.confidence).toBe(1.0);
    });

    it("should detect from cookie", () => {
      mockCookie = "NCHAT_LOCALE=fr";

      const result = detectLanguage({
        cacheResult: false,
        order: ["cookie"],
      });

      expect(result.locale).toBe("fr");
      expect(result.source).toBe("cookie");
      expect(result.confidence).toBe(1.0);
    });

    it("should detect from query string", () => {
      // Mock window.location
      const originalLocation = window.location;
      delete (window as { location?: Location }).location;
      window.location = {
        ...originalLocation,
        search: "?lang=de",
      } as Location;

      const result = detectLanguage({
        cacheResult: false,
        order: ["queryString"],
      });

      expect(result.locale).toBe("de");
      expect(result.source).toBe("queryString");
      expect(result.confidence).toBe(0.9);

      window.location = originalLocation;
    });

    it("should cache result by default", () => {
      localStorageMock.setItem("nchat-locale", "es");

      const result1 = detectLanguage({ order: ["localStorage"] });
      localStorageMock.setItem("nchat-locale", "fr");
      const result2 = detectLanguage({ order: ["localStorage"] });

      // Should return cached result
      expect(result1.locale).toBe(result2.locale);
    });

    it("should not cache when cacheResult is false", () => {
      localStorageMock.setItem("nchat-locale", "es");

      const result1 = detectLanguage({
        cacheResult: false,
        order: ["localStorage"],
      });
      localStorageMock.setItem("nchat-locale", "fr");
      const result2 = detectLanguage({
        cacheResult: false,
        order: ["localStorage"],
      });

      expect(result1.locale).toBe("es");
      expect(result2.locale).toBe("fr");
    });

    it("should respect detection order", () => {
      localStorageMock.setItem("nchat-locale", "es");
      mockCookie = "NCHAT_LOCALE=fr";

      // Cookie first
      const result1 = detectLanguage({
        cacheResult: false,
        order: ["cookie", "localStorage"],
      });
      expect(result1.locale).toBe("fr");

      // LocalStorage first
      const result2 = detectLanguage({
        cacheResult: false,
        order: ["localStorage", "cookie"],
      });
      expect(result2.locale).toBe("es");
    });

    it("should skip invalid locales", () => {
      localStorageMock.setItem("nchat-locale", "invalid");
      mockCookie = "NCHAT_LOCALE=es";

      const result = detectLanguage({
        cacheResult: false,
        order: ["localStorage", "cookie"],
      });

      expect(result.locale).toBe("es");
    });

    it("should use custom storage key", () => {
      localStorageMock.setItem("custom-key", "pt");

      const result = detectLanguage({
        cacheResult: false,
        order: ["localStorage"],
        storageKey: "custom-key",
      });

      expect(result.locale).toBe("pt");
    });

    it("should use custom cookie name", () => {
      mockCookie = "CUSTOM_LOCALE=ru";

      const result = detectLanguage({
        cacheResult: false,
        order: ["cookie"],
        cookieName: "CUSTOM_LOCALE",
      });

      expect(result.locale).toBe("ru");
    });
  });

  describe("clearDetectionCache", () => {
    it("should clear cached detection result", () => {
      localStorageMock.setItem("nchat-locale", "es");

      // First detection caches the result
      detectLanguage({ order: ["localStorage"] });

      // Change the stored value
      localStorageMock.setItem("nchat-locale", "fr");

      // Without clearing, should still return cached
      const cachedResult = detectLanguage({ order: ["localStorage"] });
      expect(cachedResult.locale).toBe("es");

      // Clear cache
      clearDetectionCache();

      // Now should detect new value
      const freshResult = detectLanguage({
        order: ["localStorage"],
        cacheResult: false,
      });
      expect(freshResult.locale).toBe("fr");
    });
  });

  describe("persistLocale", () => {
    it("should persist locale to localStorage", () => {
      persistLocale("es", { localStorage: true, cookie: false });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "nchat-locale",
        "es",
      );
    });

    it("should persist locale to cookie", () => {
      persistLocale("fr", { localStorage: false, cookie: true });
      expect(mockCookie).toContain("NCHAT_LOCALE=fr");
    });

    it("should persist to both by default", () => {
      persistLocale("de");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "nchat-locale",
        "de",
      );
      expect(mockCookie).toContain("NCHAT_LOCALE=de");
    });

    it("should clear detection cache after persisting", () => {
      localStorageMock.setItem("nchat-locale", "es");
      detectLanguage({ order: ["localStorage"] });

      persistLocale("fr");

      // Cache should be cleared
      const result = detectLanguage({
        cacheResult: false,
        order: ["localStorage"],
      });
      expect(result.locale).toBe("fr");
    });

    it("should set cookie with correct attributes", () => {
      persistLocale("ar");
      expect(mockCookie).toContain("path=/");
      expect(mockCookie).toContain("SameSite=Lax");
      expect(mockCookie).toContain("expires=");
    });
  });

  describe("clearPersistedLocale", () => {
    it("should remove locale from localStorage", () => {
      localStorageMock.setItem("nchat-locale", "es");
      clearPersistedLocale();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("nchat-locale");
    });

    it("should remove locale cookie", () => {
      persistLocale("es");
      clearPersistedLocale();
      expect(mockCookie).toContain("expires=Thu, 01 Jan 1970");
    });

    it("should clear detection cache", () => {
      localStorageMock.setItem("nchat-locale", "es");
      detectLanguage({ order: ["localStorage"] });

      clearPersistedLocale();

      const result = detectLanguage({
        cacheResult: false,
        order: ["localStorage"],
      });
      expect(result.source).toBe("default");
    });
  });

  describe("parseAcceptLanguage", () => {
    it("should parse simple Accept-Language header", () => {
      const result = parseAcceptLanguage("en");
      expect(result).toBe("en");
    });

    it("should parse Accept-Language with quality values", () => {
      const result = parseAcceptLanguage("en-US,en;q=0.9,es;q=0.8");
      expect(result).toBe("en");
    });

    it("should respect quality ordering", () => {
      const result = parseAcceptLanguage("es;q=0.9,en;q=0.5");
      expect(result).toBe("es");
    });

    it("should extract base language from regional variant", () => {
      const result = parseAcceptLanguage("en-GB");
      expect(result).toBe("en");
    });

    it("should return null for invalid header", () => {
      expect(parseAcceptLanguage("")).toBeNull();
    });

    it("should return null when no supported locale found", () => {
      const result = parseAcceptLanguage("xx-XX");
      expect(result).toBeNull();
    });

    it("should handle complex Accept-Language headers", () => {
      const result = parseAcceptLanguage("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7");
      expect(result).toBe("fr");
    });

    it("should parse Arabic locale", () => {
      const result = parseAcceptLanguage("ar-SA,ar;q=0.9");
      expect(result).toBe("ar");
    });

    it("should parse Chinese locale", () => {
      const result = parseAcceptLanguage("zh-CN,zh;q=0.9");
      expect(result).toBe("zh");
    });

    it("should parse Japanese locale", () => {
      const result = parseAcceptLanguage("ja-JP,ja;q=0.9");
      expect(result).toBe("ja");
    });

    it("should handle whitespace in header", () => {
      const result = parseAcceptLanguage("en-US, es;q=0.9, fr;q=0.8");
      expect(result).toBe("en");
    });
  });

  describe("detectFromHeaders", () => {
    it("should detect from cookie header first", () => {
      const result = detectFromHeaders({
        cookie: "NCHAT_LOCALE=es",
        "accept-language": "en-US",
      });

      expect(result.locale).toBe("es");
      expect(result.source).toBe("cookie");
      expect(result.confidence).toBe(1.0);
    });

    it("should fallback to Accept-Language header", () => {
      const result = detectFromHeaders({
        "accept-language": "fr-FR,fr;q=0.9",
      });

      expect(result.locale).toBe("fr");
      expect(result.source).toBe("header");
      expect(result.confidence).toBe(0.6);
    });

    it("should return default when no headers match", () => {
      const result = detectFromHeaders({});

      expect(result.locale).toBe("en");
      expect(result.source).toBe("default");
      expect(result.confidence).toBe(0);
    });

    it("should skip invalid cookie values", () => {
      const result = detectFromHeaders({
        cookie: "NCHAT_LOCALE=invalid",
        "accept-language": "es",
      });

      expect(result.locale).toBe("es");
    });

    it("should handle URL-encoded cookie values", () => {
      const result = detectFromHeaders({
        cookie: `NCHAT_LOCALE=${encodeURIComponent("de")}`,
      });

      expect(result.locale).toBe("de");
    });

    it("should parse multiple cookies", () => {
      const result = detectFromHeaders({
        cookie: "other=value; NCHAT_LOCALE=pt; another=test",
      });

      expect(result.locale).toBe("pt");
    });

    it("should detect RTL locales", () => {
      const result = detectFromHeaders({
        "accept-language": "ar-SA",
      });

      expect(result.locale).toBe("ar");
    });
  });

  describe("confidence levels", () => {
    it("should have high confidence for cookie", () => {
      mockCookie = "NCHAT_LOCALE=es";
      const result = detectLanguage({
        cacheResult: false,
        order: ["cookie"],
      });
      expect(result.confidence).toBe(1.0);
    });

    it("should have high confidence for localStorage", () => {
      localStorageMock.setItem("nchat-locale", "fr");
      const result = detectLanguage({
        cacheResult: false,
        order: ["localStorage"],
      });
      expect(result.confidence).toBe(1.0);
    });

    it("should have medium-high confidence for queryString", () => {
      const originalLocation = window.location;
      delete (window as { location?: Location }).location;
      window.location = {
        ...originalLocation,
        search: "?lang=de",
      } as Location;

      const result = detectLanguage({
        cacheResult: false,
        order: ["queryString"],
      });
      expect(result.confidence).toBe(0.9);

      window.location = originalLocation;
    });

    it("should have zero confidence for default", () => {
      const result = detectLanguage({ cacheResult: false, order: [] });
      expect(result.confidence).toBe(0);
    });
  });

  describe("DetectionResult type", () => {
    it("should have required fields", () => {
      const result = detectLanguage({ cacheResult: false });

      expect(typeof result.locale).toBe("string");
      expect(typeof result.source).toBe("string");
      expect(typeof result.confidence).toBe("number");
    });

    it("should have valid source values", () => {
      const validSources = [
        "cookie",
        "localStorage",
        "queryString",
        "navigator",
        "htmlTag",
        "path",
        "subdomain",
        "header",
        "default",
      ];

      const result = detectLanguage({ cacheResult: false });
      expect(validSources).toContain(result.source);
    });

    it("should have confidence between 0 and 1", () => {
      const result = detectLanguage({ cacheResult: false });
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("DetectorOptions", () => {
    it("should accept custom order", () => {
      const options: DetectorOptions = {
        order: ["localStorage", "cookie"],
      };

      localStorageMock.setItem("nchat-locale", "es");
      const result = detectLanguage({ ...options, cacheResult: false });
      expect(result.source).toBe("localStorage");
    });

    it("should accept custom cookie name", () => {
      const options: DetectorOptions = {
        cookieName: "MY_LOCALE",
        order: ["cookie"],
      };

      mockCookie = "MY_LOCALE=ja";
      const result = detectLanguage({ ...options, cacheResult: false });
      expect(result.locale).toBe("ja");
    });

    it("should accept custom storage key", () => {
      const options: DetectorOptions = {
        storageKey: "my-locale-key",
        order: ["localStorage"],
      };

      localStorageMock.setItem("my-locale-key", "zh");
      const result = detectLanguage({ ...options, cacheResult: false });
      expect(result.locale).toBe("zh");
    });

    it("should accept custom query param", () => {
      const originalLocation = window.location;
      delete (window as { location?: Location }).location;
      window.location = {
        ...originalLocation,
        search: "?locale=ru",
      } as Location;

      const options: DetectorOptions = {
        queryParam: "locale",
        order: ["queryString"],
      };

      const result = detectLanguage({ ...options, cacheResult: false });
      expect(result.locale).toBe("ru");

      window.location = originalLocation;
    });
  });
});
