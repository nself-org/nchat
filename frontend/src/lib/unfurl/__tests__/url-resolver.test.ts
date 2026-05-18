/**
 * URL Resolver Tests
 *
 * Tests for URL shortener resolution and redirect handling.
 */

import {
  isShortenerUrl,
  resolveUrl,
  resolveUrls,
  getCanonicalUrl,
  expandShortenedUrls,
  resolveUrlCached,
  clearResolutionCache,
  getResolutionCacheStats,
} from "../url-resolver";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock validateUrl to allow test URLs
jest.mock("@/services/messages/link-unfurl.service", () => ({
  validateUrl: jest.fn().mockResolvedValue({ valid: true }),
}));

describe("URL Resolver", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    clearResolutionCache();
  });

  describe("isShortenerUrl", () => {
    it("should identify bit.ly URLs", () => {
      expect(isShortenerUrl("https://bit.ly/abc123")).toBe(true);
      expect(isShortenerUrl("http://bit.ly/xyz")).toBe(true);
    });

    it("should identify t.co URLs", () => {
      expect(isShortenerUrl("https://t.co/abc")).toBe(true);
    });

    it("should identify goo.gl URLs", () => {
      expect(isShortenerUrl("https://goo.gl/abc")).toBe(true);
    });

    it("should identify tinyurl.com URLs", () => {
      expect(isShortenerUrl("https://tinyurl.com/abc")).toBe(true);
    });

    it("should identify youtu.be URLs", () => {
      expect(isShortenerUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    });

    it("should identify amzn.to URLs", () => {
      expect(isShortenerUrl("https://amzn.to/abc")).toBe(true);
    });

    it("should identify lnkd.in URLs", () => {
      expect(isShortenerUrl("https://lnkd.in/abc")).toBe(true);
    });

    it("should return false for regular URLs", () => {
      expect(isShortenerUrl("https://example.com")).toBe(false);
      expect(isShortenerUrl("https://github.com/org/repo")).toBe(false);
      expect(isShortenerUrl("https://twitter.com/user")).toBe(false);
    });

    it("should handle invalid URLs", () => {
      expect(isShortenerUrl("not-a-url")).toBe(false);
      expect(isShortenerUrl("")).toBe(false);
    });
  });

  describe("resolveUrl", () => {
    it("should resolve a shortened URL", async () => {
      mockFetch
        .mockResolvedValueOnce({
          status: 301,
          headers: new Headers({ location: "https://example.com/final" }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          url: "https://example.com/final",
        });

      const result = await resolveUrl("https://bit.ly/abc");

      expect(result.success).toBe(true);
      expect(result.resolvedUrl).toBe("https://example.com/final");
      expect(result.wasShortened).toBe(true);
      expect(result.redirectChain).toContain("https://bit.ly/abc");
    });

    it("should handle multiple redirects", async () => {
      mockFetch
        .mockResolvedValueOnce({
          status: 301,
          headers: new Headers({ location: "https://step1.com" }),
        })
        .mockResolvedValueOnce({
          status: 302,
          headers: new Headers({ location: "https://step2.com" }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          url: "https://step2.com",
        });

      const result = await resolveUrl("https://bit.ly/abc");

      expect(result.success).toBe(true);
      expect(result.redirectChain.length).toBeGreaterThan(1);
    });

    it("should return original URL for non-shortened URLs", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        url: "https://example.com",
      });

      const result = await resolveUrl("https://example.com");

      expect(result.success).toBe(true);
      expect(result.resolvedUrl).toBe("https://example.com");
      expect(result.wasShortened).toBe(false);
    });

    it("should handle timeout", async () => {
      mockFetch.mockImplementation(() => {
        const error = new Error("Aborted");
        error.name = "AbortError";
        throw error;
      });

      const result = await resolveUrl("https://bit.ly/abc", { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toContain("timed out");
    });

    it("should enforce max redirects", async () => {
      // Mock infinite redirects
      mockFetch.mockResolvedValue({
        status: 301,
        headers: new Headers({ location: "https://redirect.com/next" }),
      });

      const result = await resolveUrl("https://bit.ly/abc", {
        maxRedirects: 3,
      });

      expect(result.redirectChain.length).toBeLessThanOrEqual(4); // Initial + 3 redirects
    });

    it("should track resolution duration", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        url: "https://example.com",
      });

      const result = await resolveUrl("https://example.com");

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should handle redirect without location header", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 301,
        headers: new Headers({}), // No location
      });

      const result = await resolveUrl("https://bit.ly/abc");

      expect(result.success).toBe(true);
      expect(result.resolvedUrl).toBe("https://bit.ly/abc");
    });
  });

  describe("resolveUrls", () => {
    it("should resolve multiple URLs in parallel", async () => {
      mockFetch
        .mockResolvedValueOnce({
          status: 301,
          headers: new Headers({ location: "https://a.com" }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          url: "https://a.com",
        })
        .mockResolvedValueOnce({
          status: 301,
          headers: new Headers({ location: "https://b.com" }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          url: "https://b.com",
        });

      const results = await resolveUrls(["https://bit.ly/a", "https://t.co/b"]);

      expect(results.size).toBe(2);
      expect(results.get("https://bit.ly/a")).toBeDefined();
      expect(results.get("https://t.co/b")).toBeDefined();
    });

    it("should pass through non-shortened URLs", async () => {
      const results = await resolveUrls([
        "https://example.com",
        "https://github.com",
      ]);

      expect(results.get("https://example.com")!.wasShortened).toBe(false);
      expect(results.get("https://github.com")!.wasShortened).toBe(false);
    });
  });

  describe("getCanonicalUrl", () => {
    it("should return resolved URL", async () => {
      mockFetch
        .mockResolvedValueOnce({
          status: 301,
          headers: new Headers({ location: "https://canonical.com" }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          url: "https://canonical.com",
        });

      const canonical = await getCanonicalUrl("https://bit.ly/abc");

      expect(canonical).toContain("canonical.com");
    });

    it("should return original URL on failure", async () => {
      const {
        validateUrl,
      } = require("@/services/messages/link-unfurl.service");
      validateUrl.mockResolvedValueOnce({ valid: false, error: "Blocked" });

      const canonical = await getCanonicalUrl("https://bit.ly/abc");

      expect(canonical).toBe("https://bit.ly/abc");
    });
  });

  describe("expandShortenedUrls", () => {
    it("should expand shortened URLs in text", async () => {
      mockFetch
        .mockResolvedValueOnce({
          status: 301,
          headers: new Headers({ location: "https://example.com/article" }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          url: "https://example.com/article",
        });

      const result = await expandShortenedUrls(
        "Check out https://bit.ly/abc for more info",
      );

      expect(result.expansions.size).toBe(1);
      expect(result.expansions.get("https://bit.ly/abc")).toBe(
        "https://example.com/article",
      );
      expect(result.text).toContain("https://example.com/article");
    });

    it("should preserve non-shortened URLs", async () => {
      const text =
        "Visit https://github.com/org/repo and https://twitter.com/user";
      const result = await expandShortenedUrls(text);

      expect(result.expansions.size).toBe(0);
      expect(result.text).toBe(text);
    });
  });

  describe("Caching", () => {
    it("should cache resolved URLs", async () => {
      mockFetch
        .mockResolvedValueOnce({
          status: 301,
          headers: new Headers({ location: "https://cached.com" }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          url: "https://cached.com",
        });

      // First call - should fetch
      const result1 = await resolveUrlCached("https://bit.ly/cache-test");
      expect(result1.resolvedUrl).toContain("cached.com");

      // Second call - should use cache
      const result2 = await resolveUrlCached("https://bit.ly/cache-test");
      expect(result2.resolvedUrl).toContain("cached.com");

      // Fetch should only be called once (for the first resolution)
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial HEAD + follow
    });

    it("should clear cache", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        url: "https://example.com",
      });

      await resolveUrlCached("https://example.com");
      expect(getResolutionCacheStats().size).toBeGreaterThan(0);

      clearResolutionCache();
      expect(getResolutionCacheStats().size).toBe(0);
    });

    it("should return cache stats", () => {
      const stats = getResolutionCacheStats();

      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("maxSize");
      expect(stats).toHaveProperty("ttlMs");
      expect(stats.maxSize).toBe(1000);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await resolveUrl("https://bit.ly/network-error");

      // Should still return a result, just not fully resolved
      expect(result.originalUrl).toBe("https://bit.ly/network-error");
    });

    it("should handle SSRF blocked redirects", async () => {
      const {
        validateUrl,
      } = require("@/services/messages/link-unfurl.service");

      // First URL is valid
      validateUrl.mockResolvedValueOnce({ valid: true });
      // Redirect URL is blocked
      validateUrl.mockResolvedValueOnce({
        valid: false,
        error: "Private IP blocked",
      });

      mockFetch.mockResolvedValueOnce({
        status: 301,
        headers: new Headers({ location: "http://192.168.1.1/evil" }),
      });

      const result = await resolveUrl("https://bit.ly/ssrf", {
        validateEachRedirect: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("blocked");
    });
  });
});
