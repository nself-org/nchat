/**
 * Link Unfurl Service Tests
 *
 * Tests for URL unfurling with SSRF protection.
 */

import {
  LinkUnfurlService,
  createLinkUnfurlService,
  validateUrl,
  hashUrl,
  extractDomain,
  getKnownSiteName,
  parseOpenGraph,
  parseTwitterCard,
  extractBasicMeta,
} from "../link-unfurl.service";

describe("LinkUnfurlService", () => {
  let service: LinkUnfurlService;

  beforeEach(() => {
    service = createLinkUnfurlService();
  });

  describe("validateUrl - SSRF Protection", () => {
    it("should allow valid public URLs", async () => {
      const result = await validateUrl("https://example.com");
      expect(result.valid).toBe(true);
    });

    it("should allow HTTPS URLs", async () => {
      const result = await validateUrl("https://github.com/test");
      expect(result.valid).toBe(true);
    });

    it("should allow HTTP URLs", async () => {
      const result = await validateUrl("http://example.com");
      expect(result.valid).toBe(true);
    });

    it("should block localhost", async () => {
      const result = await validateUrl("http://localhost:3000");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("blocked");
    });

    it("should block 127.0.0.1", async () => {
      const result = await validateUrl("http://127.0.0.1:8080");
      expect(result.valid).toBe(false);
    });

    it("should block ::1 (IPv6 localhost)", async () => {
      const result = await validateUrl("http://[::1]:8080");
      expect(result.valid).toBe(false);
    });

    it("should block 10.x.x.x (Class A private)", async () => {
      const result = await validateUrl("http://10.0.0.1");
      expect(result.valid).toBe(false);
    });

    it("should block 172.16-31.x.x (Class B private)", async () => {
      const result1 = await validateUrl("http://172.16.0.1");
      expect(result1.valid).toBe(false);

      const result2 = await validateUrl("http://172.31.255.255");
      expect(result2.valid).toBe(false);

      // 172.32.x.x should be allowed
      const result3 = await validateUrl("http://172.32.0.1");
      expect(result3.valid).toBe(true);
    });

    it("should block 192.168.x.x (Class C private)", async () => {
      const result = await validateUrl("http://192.168.1.1");
      expect(result.valid).toBe(false);
    });

    it("should block 169.254.x.x (link-local)", async () => {
      const result = await validateUrl("http://169.254.169.254");
      expect(result.valid).toBe(false);
    });

    it("should block multicast addresses (224-239.x.x.x)", async () => {
      const result1 = await validateUrl("http://224.0.0.1");
      expect(result1.valid).toBe(false);

      const result2 = await validateUrl("http://239.255.255.255");
      expect(result2.valid).toBe(false);
    });

    it("should block .local domains", async () => {
      const result = await validateUrl("http://myserver.local");
      expect(result.valid).toBe(false);
    });

    it("should block .localhost domains", async () => {
      const result = await validateUrl("http://app.localhost");
      expect(result.valid).toBe(false);
    });

    it("should block .internal domains", async () => {
      const result = await validateUrl("http://service.internal");
      expect(result.valid).toBe(false);
    });

    it("should block metadata service addresses", async () => {
      const result = await validateUrl("http://metadata.google.internal");
      expect(result.valid).toBe(false);
    });

    it("should reject non-HTTP protocols", async () => {
      const resultFtp = await validateUrl("ftp://example.com");
      expect(resultFtp.valid).toBe(false);

      const resultFile = await validateUrl("file:///etc/passwd");
      expect(resultFile.valid).toBe(false);

      const resultJavascript = await validateUrl("javascript:alert(1)");
      expect(resultJavascript.valid).toBe(false);
    });

    it("should reject invalid URLs", async () => {
      const result = await validateUrl("not-a-url");
      expect(result.valid).toBe(false);
    });
  });

  describe("hashUrl", () => {
    it("should return consistent hash for same URL", () => {
      const hash1 = hashUrl("https://example.com");
      const hash2 = hashUrl("https://example.com");
      expect(hash1).toBe(hash2);
    });

    it("should return different hash for different URLs", () => {
      const hash1 = hashUrl("https://example.com");
      const hash2 = hashUrl("https://example.org");
      expect(hash1).not.toBe(hash2);
    });

    it("should be case insensitive", () => {
      const hash1 = hashUrl("https://EXAMPLE.COM");
      const hash2 = hashUrl("https://example.com");
      expect(hash1).toBe(hash2);
    });

    it("should return 64-character hex string", () => {
      const hash = hashUrl("https://example.com");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("extractDomain", () => {
    it("should extract domain from URL", () => {
      expect(extractDomain("https://example.com/path")).toBe("example.com");
    });

    it("should remove www prefix", () => {
      expect(extractDomain("https://www.example.com")).toBe("example.com");
    });

    it("should handle subdomains", () => {
      expect(extractDomain("https://blog.example.com")).toBe(
        "blog.example.com",
      );
    });

    it("should return empty string for invalid URLs", () => {
      expect(extractDomain("not-a-url")).toBe("");
    });
  });

  describe("getKnownSiteName", () => {
    it("should return known site name for YouTube", () => {
      expect(getKnownSiteName("https://youtube.com/watch?v=123")).toBe(
        "YouTube",
      );
      expect(getKnownSiteName("https://www.youtube.com/watch?v=123")).toBe(
        "YouTube",
      );
      expect(getKnownSiteName("https://youtu.be/123")).toBe("YouTube");
    });

    it("should return known site name for GitHub", () => {
      expect(getKnownSiteName("https://github.com/user/repo")).toBe("GitHub");
    });

    it("should return known site name for Twitter/X", () => {
      expect(getKnownSiteName("https://twitter.com/user")).toBe("Twitter");
      expect(getKnownSiteName("https://x.com/user")).toBe("X");
    });

    it("should return undefined for unknown domains", () => {
      expect(getKnownSiteName("https://unknown-site.com")).toBeUndefined();
    });
  });

  describe("parseOpenGraph", () => {
    it("should parse Open Graph tags", () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Test Title">
            <meta property="og:description" content="Test Description">
            <meta property="og:image" content="https://example.com/image.jpg">
            <meta property="og:site_name" content="Test Site">
            <meta property="og:type" content="article">
          </head>
        </html>
      `;

      const result = parseOpenGraph(html);

      expect(result.title).toBe("Test Title");
      expect(result.description).toBe("Test Description");
      expect(result.image).toBe("https://example.com/image.jpg");
      expect(result.siteName).toBe("Test Site");
      expect(result.type).toBe("article");
    });

    it("should handle reversed attribute order", () => {
      const html = `
        <html>
          <head>
            <meta content="Test Title" property="og:title">
          </head>
        </html>
      `;

      const result = parseOpenGraph(html);
      expect(result.title).toBe("Test Title");
    });

    it("should decode HTML entities", () => {
      const html = `
        <meta property="og:title" content="Test &amp; Title">
      `;

      const result = parseOpenGraph(html);
      expect(result.title).toBe("Test & Title");
    });

    it("should parse image dimensions", () => {
      const html = `
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
      `;

      const result = parseOpenGraph(html);
      expect(result.imageWidth).toBe(1200);
      expect(result.imageHeight).toBe(630);
    });
  });

  describe("parseTwitterCard", () => {
    it("should parse Twitter Card tags", () => {
      const html = `
        <html>
          <head>
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="Twitter Title">
            <meta name="twitter:description" content="Twitter Description">
            <meta name="twitter:image" content="https://example.com/twitter-image.jpg">
          </head>
        </html>
      `;

      const result = parseTwitterCard(html);

      expect(result.card).toBe("summary_large_image");
      expect(result.title).toBe("Twitter Title");
      expect(result.description).toBe("Twitter Description");
      expect(result.image).toBe("https://example.com/twitter-image.jpg");
    });

    it("should parse player card", () => {
      const html = `
        <meta name="twitter:card" content="player">
        <meta name="twitter:player" content="https://example.com/player">
        <meta name="twitter:player:width" content="640">
        <meta name="twitter:player:height" content="360">
      `;

      const result = parseTwitterCard(html);
      expect(result.card).toBe("player");
      expect(result.player).toBe("https://example.com/player");
      expect(result.playerWidth).toBe(640);
      expect(result.playerHeight).toBe(360);
    });
  });

  describe("extractBasicMeta", () => {
    it("should extract title from title tag", () => {
      const html = `
        <html>
          <head>
            <title>Page Title</title>
          </head>
        </html>
      `;

      const result = extractBasicMeta(html, "https://example.com");
      expect(result.title).toBe("Page Title");
    });

    it("should extract description from meta tag", () => {
      const html = `
        <meta name="description" content="Page description here">
      `;

      const result = extractBasicMeta(html, "https://example.com");
      expect(result.description).toBe("Page description here");
    });

    it("should extract favicon", () => {
      const html = `
        <link rel="icon" href="/favicon.ico">
      `;

      const result = extractBasicMeta(html, "https://example.com");
      expect(result.favicon).toBe("https://example.com/favicon.ico");
    });

    it("should use default favicon if none specified", () => {
      const html = `<html></html>`;

      const result = extractBasicMeta(html, "https://example.com");
      expect(result.favicon).toBe("https://example.com/favicon.ico");
    });

    it("should extract theme color", () => {
      const html = `
        <meta name="theme-color" content="#ff0000">
      `;

      const result = extractBasicMeta(html, "https://example.com");
      expect(result.themeColor).toBe("#ff0000");
    });
  });

  describe("unfurlUrl", () => {
    it("should return error for blocked URLs", async () => {
      const result = await service.unfurlUrl("http://localhost:3000");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("SSRF_BLOCKED");
    });

    it("should return error for private IPs", async () => {
      const result = await service.unfurlUrl("http://192.168.1.1");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("SSRF_BLOCKED");
    });

    it("should return error for invalid URLs", async () => {
      const result = await service.unfurlUrl("not-a-valid-url");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("SSRF_BLOCKED");
    });

    // Note: These tests would require mocking fetch or a test server
    // For now, they test the validation path only
  });
});

describe("LinkUnfurlIntegration", () => {
  // These tests would require mocking Apollo client
  // For now, focusing on URL extraction tests

  describe("URL extraction pattern", () => {
    const URL_REGEX =
      /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

    it("should match HTTP URLs", () => {
      const text = "Check out http://example.com for more info";
      const matches = text.match(URL_REGEX);
      expect(matches).toContain("http://example.com");
    });

    it("should match HTTPS URLs", () => {
      const text = "Visit https://secure.example.com/page";
      const matches = text.match(URL_REGEX);
      expect(matches).toContain("https://secure.example.com/page");
    });

    it("should match URLs with query params", () => {
      const text = "See https://example.com/search?q=test&page=1";
      const matches = text.match(URL_REGEX);
      expect(matches).toContain("https://example.com/search?q=test&page=1");
    });

    it("should match URLs with fragments", () => {
      const text = "Read https://docs.example.com/guide#section-1";
      const matches = text.match(URL_REGEX);
      expect(matches).toContain("https://docs.example.com/guide#section-1");
    });

    it("should match multiple URLs in text", () => {
      const text = "Check https://first.com and also https://second.com";
      const matches = text.match(URL_REGEX);
      expect(matches).toHaveLength(2);
    });

    it("should not match invalid URLs", () => {
      const text = "This is not a URL: example.com without protocol";
      const matches = text.match(URL_REGEX);
      expect(matches).toBeNull();
    });
  });
});
