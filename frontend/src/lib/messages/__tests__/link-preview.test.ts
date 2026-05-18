/**
 * Link Preview Module Tests
 *
 * Comprehensive tests for URL unfurling and link preview generation.
 */

import {
  // Types
  type LinkPreview,
  type LinkPreviewResult,
  type OpenGraphData,
  type TwitterCardData,
  type LinkPreviewType,
  // Constants
  DEFAULT_CACHE_TTL,
  MAX_CACHE_SIZE,
  RATE_LIMIT_REQUESTS,
  RATE_LIMIT_WINDOW,
  BLOCKED_DOMAINS,
  SPECIAL_DOMAINS,
  URL_REGEX,
  // Cache functions
  getCachedPreview,
  cachePreview,
  clearPreviewCache,
  getCacheStats,
  // Rate limiting
  isRateLimited,
  recordRequest,
  clearRateLimits,
  // URL utilities
  isValidUrl,
  normalizeUrl,
  extractDomain,
  getDisplayDomain,
  isBlockedDomain,
  resolveUrl,
  getKnownSiteName,
  // URL detection
  extractUrls,
  containsUrl,
  getFirstUrl,
  // HTML parsing
  decodeHtmlEntities,
  parseOpenGraph,
  parseTwitterCard,
  parseBasicMeta,
  determineContentType,
  parseHtmlForPreview,
  // Preview generation
  generateFallbackPreview,
  createPreviewFromData,
  // Fetch functions
  fetchLinkPreview,
  fetchLinkPreviewViaApi,
  fetchLinkPreviews,
} from "../link-preview";

// ============================================================================
// Test Setup
// ============================================================================

describe("Link Preview Module", () => {
  beforeEach(() => {
    clearPreviewCache();
    clearRateLimits();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // URL Validation Tests
  // ==========================================================================

  describe("isValidUrl", () => {
    it("should return true for valid http URL", () => {
      expect(isValidUrl("http://example.com")).toBe(true);
    });

    it("should return true for valid https URL", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
    });

    it("should return true for URL with path", () => {
      expect(isValidUrl("https://example.com/path/to/page")).toBe(true);
    });

    it("should return true for URL with query string", () => {
      expect(isValidUrl("https://example.com?foo=bar&baz=qux")).toBe(true);
    });

    it("should return true for URL with port", () => {
      expect(isValidUrl("https://example.com:8080")).toBe(true);
    });

    it("should return true for URL with hash", () => {
      expect(isValidUrl("https://example.com#section")).toBe(true);
    });

    it("should return false for invalid URL", () => {
      expect(isValidUrl("not a url")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidUrl("")).toBe(false);
    });

    it("should return false for ftp URL", () => {
      expect(isValidUrl("ftp://example.com")).toBe(false);
    });

    it("should return false for file URL", () => {
      expect(isValidUrl("file:///path/to/file")).toBe(false);
    });

    it("should return false for mailto URL", () => {
      expect(isValidUrl("mailto:test@example.com")).toBe(false);
    });
  });

  // ==========================================================================
  // URL Normalization Tests
  // ==========================================================================

  describe("normalizeUrl", () => {
    it("should lowercase hostname", () => {
      expect(normalizeUrl("https://EXAMPLE.COM")).toBe("https://example.com/");
    });

    it("should remove trailing slash from path", () => {
      expect(normalizeUrl("https://example.com/path/")).toBe(
        "https://example.com/path",
      );
    });

    it("should preserve query string", () => {
      expect(normalizeUrl("https://example.com?foo=bar")).toBe(
        "https://example.com/?foo=bar",
      );
    });

    it("should handle URL without path", () => {
      expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
    });

    it("should preserve port", () => {
      expect(normalizeUrl("https://example.com:8080/path")).toBe(
        "https://example.com:8080/path",
      );
    });

    it("should handle invalid URL gracefully", () => {
      expect(normalizeUrl("not a url")).toBe("not a url");
    });
  });

  // ==========================================================================
  // Domain Extraction Tests
  // ==========================================================================

  describe("extractDomain", () => {
    it("should extract domain from URL", () => {
      expect(extractDomain("https://example.com/path")).toBe("example.com");
    });

    it("should extract domain with subdomain", () => {
      expect(extractDomain("https://sub.example.com")).toBe("sub.example.com");
    });

    it("should lowercase domain", () => {
      expect(extractDomain("https://EXAMPLE.COM")).toBe("example.com");
    });

    it("should return null for invalid URL", () => {
      expect(extractDomain("not a url")).toBeNull();
    });
  });

  describe("getDisplayDomain", () => {
    it("should remove www prefix", () => {
      expect(getDisplayDomain("https://www.example.com")).toBe("example.com");
    });

    it("should keep other subdomains", () => {
      expect(getDisplayDomain("https://sub.example.com")).toBe(
        "sub.example.com",
      );
    });

    it("should return empty for invalid URL", () => {
      expect(getDisplayDomain("not a url")).toBe("");
    });
  });

  // ==========================================================================
  // Blocked Domain Tests
  // ==========================================================================

  describe("isBlockedDomain", () => {
    it("should block localhost", () => {
      expect(isBlockedDomain("http://localhost")).toBe(true);
    });

    it("should block localhost with port", () => {
      expect(isBlockedDomain("http://localhost:3000")).toBe(true);
    });

    it("should block 127.0.0.1", () => {
      expect(isBlockedDomain("http://127.0.0.1")).toBe(true);
    });

    it("should block 0.0.0.0", () => {
      expect(isBlockedDomain("http://0.0.0.0")).toBe(true);
    });

    it("should not block valid domain", () => {
      expect(isBlockedDomain("https://example.com")).toBe(false);
    });

    it("should block invalid URL", () => {
      expect(isBlockedDomain("not a url")).toBe(true);
    });
  });

  // ==========================================================================
  // URL Resolution Tests
  // ==========================================================================

  describe("resolveUrl", () => {
    it("should return absolute URL unchanged", () => {
      expect(
        resolveUrl("https://example.com", "https://other.com/image.png"),
      ).toBe("https://other.com/image.png");
    });

    it("should resolve protocol-relative URL", () => {
      expect(
        resolveUrl("https://example.com", "//cdn.example.com/image.png"),
      ).toBe("https://cdn.example.com/image.png");
    });

    it("should resolve root-relative URL", () => {
      expect(resolveUrl("https://example.com/page", "/image.png")).toBe(
        "https://example.com/image.png",
      );
    });

    it("should resolve relative URL", () => {
      expect(resolveUrl("https://example.com/page/", "image.png")).toBe(
        "https://example.com/page/image.png",
      );
    });

    it("should return empty string for empty relative", () => {
      expect(resolveUrl("https://example.com", "")).toBe("");
    });

    it("should handle invalid base URL", () => {
      expect(resolveUrl("not a url", "image.png")).toBe("image.png");
    });
  });

  // ==========================================================================
  // Known Site Name Tests
  // ==========================================================================

  describe("getKnownSiteName", () => {
    it("should recognize YouTube", () => {
      expect(getKnownSiteName("https://www.youtube.com/watch?v=123")).toBe(
        "YouTube",
      );
    });

    it("should recognize youtu.be", () => {
      expect(getKnownSiteName("https://youtu.be/123")).toBe("YouTube");
    });

    it("should recognize GitHub", () => {
      expect(getKnownSiteName("https://github.com/user/repo")).toBe("GitHub");
    });

    it("should recognize Twitter", () => {
      expect(getKnownSiteName("https://twitter.com/user")).toBe("Twitter");
    });

    it("should recognize X.com", () => {
      expect(getKnownSiteName("https://x.com/user")).toBe("X");
    });

    it("should return null for unknown domain", () => {
      expect(getKnownSiteName("https://unknown-site.com")).toBeNull();
    });
  });

  // ==========================================================================
  // URL Detection Tests
  // ==========================================================================

  describe("extractUrls", () => {
    it("should extract single URL", () => {
      const urls = extractUrls("Check this out: https://example.com");
      expect(urls).toEqual(["https://example.com"]);
    });

    it("should extract multiple URLs", () => {
      const urls = extractUrls("Visit https://example.com and http://test.org");
      expect(urls).toContain("https://example.com");
      expect(urls).toContain("http://test.org");
    });

    it("should extract URL with path and query", () => {
      const urls = extractUrls("Link: https://example.com/path?foo=bar");
      expect(urls).toEqual(["https://example.com/path?foo=bar"]);
    });

    it("should return empty array for no URLs", () => {
      expect(extractUrls("No links here")).toEqual([]);
    });

    it("should deduplicate URLs", () => {
      const urls = extractUrls(
        "https://example.com and https://example.com again",
      );
      expect(urls).toEqual(["https://example.com"]);
    });
  });

  describe("containsUrl", () => {
    it("should return true when text contains URL", () => {
      expect(containsUrl("Check https://example.com")).toBe(true);
    });

    it("should return false when text has no URL", () => {
      expect(containsUrl("No links here")).toBe(false);
    });
  });

  describe("getFirstUrl", () => {
    it("should return first URL", () => {
      expect(
        getFirstUrl("First https://first.com then https://second.com"),
      ).toBe("https://first.com");
    });

    it("should return null when no URL", () => {
      expect(getFirstUrl("No links")).toBeNull();
    });
  });

  // ==========================================================================
  // HTML Entity Decoding Tests
  // ==========================================================================

  describe("decodeHtmlEntities", () => {
    it("should decode &amp;", () => {
      expect(decodeHtmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    });

    it("should decode &lt; and &gt;", () => {
      expect(decodeHtmlEntities("&lt;div&gt;")).toBe("<div>");
    });

    it("should decode &quot;", () => {
      expect(decodeHtmlEntities("&quot;hello&quot;")).toBe('"hello"');
    });

    it("should decode &#39; and &apos;", () => {
      expect(decodeHtmlEntities("it&#39;s fine")).toBe("it's fine");
      expect(decodeHtmlEntities("it&apos;s fine")).toBe("it's fine");
    });

    it("should decode numeric entities", () => {
      expect(decodeHtmlEntities("&#65;")).toBe("A");
    });

    it("should decode hex entities", () => {
      expect(decodeHtmlEntities("&#x41;")).toBe("A");
    });

    it("should handle multiple entities", () => {
      expect(decodeHtmlEntities("&lt;a href=&quot;test&quot;&gt;")).toBe(
        '<a href="test">',
      );
    });
  });

  // ==========================================================================
  // Open Graph Parsing Tests
  // ==========================================================================

  describe("parseOpenGraph", () => {
    it("should parse og:title", () => {
      const html = '<meta property="og:title" content="Test Title">';
      expect(parseOpenGraph(html).title).toBe("Test Title");
    });

    it("should parse og:description", () => {
      const html =
        '<meta property="og:description" content="Test Description">';
      expect(parseOpenGraph(html).description).toBe("Test Description");
    });

    it("should parse og:image", () => {
      const html =
        '<meta property="og:image" content="https://example.com/image.png">';
      expect(parseOpenGraph(html).image).toBe("https://example.com/image.png");
    });

    it("should parse og:image dimensions", () => {
      const html = `
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
      `;
      const og = parseOpenGraph(html);
      expect(og.imageWidth).toBe(1200);
      expect(og.imageHeight).toBe(630);
    });

    it("should parse og:site_name", () => {
      const html = '<meta property="og:site_name" content="Example Site">';
      expect(parseOpenGraph(html).siteName).toBe("Example Site");
    });

    it("should parse og:type", () => {
      const html = '<meta property="og:type" content="article">';
      expect(parseOpenGraph(html).type).toBe("article");
    });

    it("should parse og:video", () => {
      const html =
        '<meta property="og:video" content="https://example.com/video.mp4">';
      expect(parseOpenGraph(html).video).toBe("https://example.com/video.mp4");
    });

    it("should parse og:audio", () => {
      const html =
        '<meta property="og:audio" content="https://example.com/audio.mp3">';
      expect(parseOpenGraph(html).audio).toBe("https://example.com/audio.mp3");
    });

    it("should handle reversed attribute order", () => {
      const html = '<meta content="Test Title" property="og:title">';
      expect(parseOpenGraph(html).title).toBe("Test Title");
    });

    it("should decode HTML entities in content", () => {
      const html = '<meta property="og:title" content="Tom &amp; Jerry">';
      expect(parseOpenGraph(html).title).toBe("Tom & Jerry");
    });

    it("should handle name attribute instead of property", () => {
      const html = '<meta name="og:title" content="Test Title">';
      expect(parseOpenGraph(html).title).toBe("Test Title");
    });
  });

  // ==========================================================================
  // Twitter Card Parsing Tests
  // ==========================================================================

  describe("parseTwitterCard", () => {
    it("should parse twitter:card", () => {
      const html = '<meta name="twitter:card" content="summary_large_image">';
      expect(parseTwitterCard(html).card).toBe("summary_large_image");
    });

    it("should parse twitter:title", () => {
      const html = '<meta name="twitter:title" content="Test Title">';
      expect(parseTwitterCard(html).title).toBe("Test Title");
    });

    it("should parse twitter:description", () => {
      const html =
        '<meta name="twitter:description" content="Test Description">';
      expect(parseTwitterCard(html).description).toBe("Test Description");
    });

    it("should parse twitter:image", () => {
      const html =
        '<meta name="twitter:image" content="https://example.com/image.png">';
      expect(parseTwitterCard(html).image).toBe(
        "https://example.com/image.png",
      );
    });

    it("should parse twitter:site", () => {
      const html = '<meta name="twitter:site" content="@example">';
      expect(parseTwitterCard(html).site).toBe("@example");
    });

    it("should parse twitter:creator", () => {
      const html = '<meta name="twitter:creator" content="@author">';
      expect(parseTwitterCard(html).creator).toBe("@author");
    });

    it("should parse twitter:player", () => {
      const html =
        '<meta name="twitter:player" content="https://example.com/player">';
      expect(parseTwitterCard(html).player).toBe("https://example.com/player");
    });

    it("should parse player dimensions", () => {
      const html = `
        <meta name="twitter:player:width" content="640">
        <meta name="twitter:player:height" content="480">
      `;
      const twitter = parseTwitterCard(html);
      expect(twitter.playerWidth).toBe(640);
      expect(twitter.playerHeight).toBe(480);
    });

    it("should handle reversed attribute order", () => {
      const html = '<meta content="summary" name="twitter:card">';
      expect(parseTwitterCard(html).card).toBe("summary");
    });
  });

  // ==========================================================================
  // Basic Meta Parsing Tests
  // ==========================================================================

  describe("parseBasicMeta", () => {
    it("should parse title tag", () => {
      const html = "<title>Page Title</title>";
      expect(parseBasicMeta(html, "https://example.com").title).toBe(
        "Page Title",
      );
    });

    it("should parse meta description", () => {
      const html = '<meta name="description" content="Page description">';
      expect(parseBasicMeta(html, "https://example.com").description).toBe(
        "Page description",
      );
    });

    it("should parse favicon", () => {
      const html = '<link rel="icon" href="/favicon.ico">';
      expect(parseBasicMeta(html, "https://example.com").favicon).toBe(
        "https://example.com/favicon.ico",
      );
    });

    it("should parse shortcut icon", () => {
      const html = '<link rel="shortcut icon" href="/icon.png">';
      expect(parseBasicMeta(html, "https://example.com").favicon).toBe(
        "https://example.com/icon.png",
      );
    });

    it("should use apple touch icon as fallback", () => {
      const html = '<link rel="apple-touch-icon" href="/apple-icon.png">';
      expect(parseBasicMeta(html, "https://example.com").favicon).toBe(
        "https://example.com/apple-icon.png",
      );
    });

    it("should parse theme color", () => {
      const html = '<meta name="theme-color" content="#ff0000">';
      expect(parseBasicMeta(html, "https://example.com").themeColor).toBe(
        "#ff0000",
      );
    });

    it("should parse author", () => {
      const html = '<meta name="author" content="John Doe">';
      expect(parseBasicMeta(html, "https://example.com").author).toBe(
        "John Doe",
      );
    });

    it("should decode HTML entities", () => {
      const html = "<title>Tom &amp; Jerry</title>";
      expect(parseBasicMeta(html, "https://example.com").title).toBe(
        "Tom & Jerry",
      );
    });
  });

  // ==========================================================================
  // Content Type Detection Tests
  // ==========================================================================

  describe("determineContentType", () => {
    it("should detect video from og:type", () => {
      expect(determineContentType({ type: "video.movie" }, {})).toBe("video");
    });

    it("should detect article from og:type", () => {
      expect(determineContentType({ type: "article" }, {})).toBe("article");
    });

    it("should detect audio from og:type", () => {
      expect(determineContentType({ type: "music.song" }, {})).toBe("audio");
    });

    it("should detect product from og:type", () => {
      expect(determineContentType({ type: "product" }, {})).toBe("product");
    });

    it("should detect video from twitter:card player", () => {
      expect(determineContentType({}, { card: "player" })).toBe("video");
    });

    it("should detect article from summary_large_image", () => {
      expect(determineContentType({}, { card: "summary_large_image" })).toBe(
        "article",
      );
    });

    it("should detect video from og:video", () => {
      expect(
        determineContentType({ video: "https://example.com/video.mp4" }, {}),
      ).toBe("video");
    });

    it("should detect audio from og:audio", () => {
      expect(
        determineContentType({ audio: "https://example.com/audio.mp3" }, {}),
      ).toBe("audio");
    });

    it("should default to website", () => {
      expect(determineContentType({}, {})).toBe("website");
    });
  });

  // ==========================================================================
  // Full HTML Parsing Tests
  // ==========================================================================

  describe("parseHtmlForPreview", () => {
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Page Title</title>
        <meta name="description" content="Page description">
        <meta property="og:title" content="OG Title">
        <meta property="og:description" content="OG Description">
        <meta property="og:image" content="https://example.com/og-image.png">
        <meta property="og:site_name" content="Example Site">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="Twitter Title">
        <link rel="icon" href="/favicon.ico">
      </head>
      <body></body>
      </html>
    `;

    it("should parse complete HTML document", () => {
      const preview = parseHtmlForPreview(fullHtml, "https://example.com");
      expect(preview.title).toBe("Twitter Title"); // Twitter takes priority
      expect(preview.description).toBe("OG Description");
      expect(preview.image).toBe("https://example.com/og-image.png");
      expect(preview.siteName).toBe("Example Site");
    });

    it("should set domain correctly", () => {
      const preview = parseHtmlForPreview(fullHtml, "https://www.example.com");
      expect(preview.domain).toBe("example.com");
    });

    it("should set url", () => {
      const preview = parseHtmlForPreview(fullHtml, "https://example.com/page");
      expect(preview.url).toBe("https://example.com/page");
    });

    it("should set fetchedAt timestamp", () => {
      const before = Date.now();
      const preview = parseHtmlForPreview(fullHtml, "https://example.com");
      const after = Date.now();
      expect(preview.fetchedAt).toBeGreaterThanOrEqual(before);
      expect(preview.fetchedAt).toBeLessThanOrEqual(after);
    });

    it("should use domain as title fallback", () => {
      const preview = parseHtmlForPreview(
        "<html></html>",
        "https://example.com",
      );
      expect(preview.title).toBe("example.com");
    });
  });

  // ==========================================================================
  // Cache Tests
  // ==========================================================================

  describe("Preview Cache", () => {
    const mockPreview: LinkPreview = {
      url: "https://example.com",
      title: "Test",
      siteName: "Example",
      domain: "example.com",
      type: "website",
      fetchedAt: Date.now(),
    };

    describe("cachePreview", () => {
      it("should cache a preview", () => {
        cachePreview("https://example.com", mockPreview);
        expect(getCachedPreview("https://example.com")).toEqual(mockPreview);
      });

      it("should normalize URL when caching", () => {
        cachePreview("https://EXAMPLE.COM/", mockPreview);
        expect(getCachedPreview("https://example.com")).toEqual(mockPreview);
      });
    });

    describe("getCachedPreview", () => {
      it("should return null for uncached URL", () => {
        expect(getCachedPreview("https://not-cached.com")).toBeNull();
      });

      it("should return cached preview", () => {
        cachePreview("https://example.com", mockPreview);
        expect(getCachedPreview("https://example.com")).toEqual(mockPreview);
      });
    });

    describe("clearPreviewCache", () => {
      it("should clear all cached previews", () => {
        cachePreview("https://example1.com", mockPreview);
        cachePreview("https://example2.com", mockPreview);
        clearPreviewCache();
        expect(getCachedPreview("https://example1.com")).toBeNull();
        expect(getCachedPreview("https://example2.com")).toBeNull();
      });
    });

    describe("getCacheStats", () => {
      it("should return cache statistics", () => {
        clearPreviewCache();
        expect(getCacheStats().size).toBe(0);
        cachePreview("https://example.com", mockPreview);
        expect(getCacheStats().size).toBe(1);
        expect(getCacheStats().maxSize).toBe(MAX_CACHE_SIZE);
      });
    });
  });

  // ==========================================================================
  // Rate Limiting Tests
  // ==========================================================================

  describe("Rate Limiting", () => {
    describe("isRateLimited", () => {
      it("should return false for first request", () => {
        expect(isRateLimited("https://example.com")).toBe(false);
      });

      it("should return false below limit", () => {
        for (let i = 0; i < RATE_LIMIT_REQUESTS - 1; i++) {
          recordRequest("https://example.com");
        }
        expect(isRateLimited("https://example.com")).toBe(false);
      });

      it("should return true at limit", () => {
        for (let i = 0; i < RATE_LIMIT_REQUESTS; i++) {
          recordRequest("https://example.com");
        }
        expect(isRateLimited("https://example.com")).toBe(true);
      });

      it("should track per domain", () => {
        for (let i = 0; i < RATE_LIMIT_REQUESTS; i++) {
          recordRequest("https://example.com");
        }
        expect(isRateLimited("https://example.com")).toBe(true);
        expect(isRateLimited("https://other.com")).toBe(false);
      });
    });

    describe("clearRateLimits", () => {
      it("should clear all rate limits", () => {
        for (let i = 0; i < RATE_LIMIT_REQUESTS; i++) {
          recordRequest("https://example.com");
        }
        expect(isRateLimited("https://example.com")).toBe(true);
        clearRateLimits();
        expect(isRateLimited("https://example.com")).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Fallback Preview Tests
  // ==========================================================================

  describe("generateFallbackPreview", () => {
    it("should generate fallback preview", () => {
      const preview = generateFallbackPreview("https://example.com/page");
      expect(preview.url).toBe("https://example.com/page");
      expect(preview.title).toBe("example.com");
      expect(preview.domain).toBe("example.com");
      expect(preview.type).toBe("website");
    });

    it("should use known site name", () => {
      const preview = generateFallbackPreview("https://github.com/user/repo");
      expect(preview.siteName).toBe("GitHub");
    });

    it("should include favicon", () => {
      const preview = generateFallbackPreview("https://example.com");
      expect(preview.favicon).toBe("https://example.com/favicon.ico");
    });
  });

  describe("createPreviewFromData", () => {
    it("should create preview from partial data", () => {
      const preview = createPreviewFromData("https://example.com", {
        title: "Custom Title",
        description: "Custom description",
      });
      expect(preview.url).toBe("https://example.com");
      expect(preview.title).toBe("Custom Title");
      expect(preview.description).toBe("Custom description");
    });

    it("should use domain as title fallback", () => {
      const preview = createPreviewFromData("https://example.com", {});
      expect(preview.title).toBe("example.com");
    });

    it("should set fetchedAt", () => {
      const before = Date.now();
      const preview = createPreviewFromData("https://example.com", {});
      expect(preview.fetchedAt).toBeGreaterThanOrEqual(before);
    });
  });

  // ==========================================================================
  // Fetch Link Preview Tests
  // ==========================================================================

  describe("fetchLinkPreview", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should return error for invalid URL", async () => {
      const result = await fetchLinkPreview("not a url");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_URL");
    });

    it("should return error for blocked domain", async () => {
      const result = await fetchLinkPreview("http://localhost:3000");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("should return cached preview", async () => {
      const mockPreview: LinkPreview = {
        url: "https://example.com",
        title: "Cached",
        domain: "example.com",
        type: "website",
        fetchedAt: Date.now(),
      };
      cachePreview("https://example.com", mockPreview);

      const result = await fetchLinkPreview("https://example.com");
      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.preview?.title).toBe("Cached");
    });

    it("should skip cache when requested", async () => {
      const mockPreview: LinkPreview = {
        url: "https://example.com",
        title: "Cached",
        domain: "example.com",
        type: "website",
        fetchedAt: Date.now(),
      };
      cachePreview("https://example.com", mockPreview);

      const mockHtml = "<title>Fresh</title>";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await fetchLinkPreview("https://example.com", {
        skipCache: true,
      });
      expect(result.success).toBe(true);
      expect(result.cached).toBe(false);
    });

    it("should return rate limited error", async () => {
      for (let i = 0; i < RATE_LIMIT_REQUESTS; i++) {
        recordRequest("https://example.com");
      }

      const result = await fetchLinkPreview("https://example.com", {
        skipCache: true,
      });
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("RATE_LIMITED");
    });

    it("should fetch and parse HTML", async () => {
      const mockHtml = `
        <title>Test Page</title>
        <meta property="og:description" content="Test description">
      `;
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await fetchLinkPreview("https://example.com");
      expect(result.success).toBe(true);
      expect(result.preview?.title).toBe("Test Page");
      expect(result.preview?.description).toBe("Test description");
    });

    it("should handle 404 error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchLinkPreview("https://example.com");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("NOT_FOUND");
    });

    it("should handle HTTP error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await fetchLinkPreview("https://example.com");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("FETCH_FAILED");
    });

    it("should handle network error", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await fetchLinkPreview("https://example.com");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    it("should have valid DEFAULT_CACHE_TTL", () => {
      expect(DEFAULT_CACHE_TTL).toBe(60 * 60 * 1000);
    });

    it("should have valid MAX_CACHE_SIZE", () => {
      expect(MAX_CACHE_SIZE).toBe(500);
    });

    it("should have valid RATE_LIMIT_REQUESTS", () => {
      expect(RATE_LIMIT_REQUESTS).toBe(10);
    });

    it("should have valid RATE_LIMIT_WINDOW", () => {
      expect(RATE_LIMIT_WINDOW).toBe(60 * 1000);
    });

    it("should have blocked domains", () => {
      expect(BLOCKED_DOMAINS).toContain("localhost");
      expect(BLOCKED_DOMAINS).toContain("127.0.0.1");
    });

    it("should have special domains", () => {
      expect(SPECIAL_DOMAINS["youtube.com"]).toBe("YouTube");
      expect(SPECIAL_DOMAINS["github.com"]).toBe("GitHub");
    });

    it("should have valid URL_REGEX", () => {
      expect(URL_REGEX.test("https://example.com")).toBe(true);
      expect(URL_REGEX.test("not a url")).toBe(false);
    });
  });
});
