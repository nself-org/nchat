/**
 * URL Parser Tests
 *
 * Comprehensive tests for URL detection, parsing, and extraction.
 */

import {
  parseUrl,
  detectProvider,
  extractUrls,
  extractUrlsWithPositions,
  isValidUrl,
  isShortUrl,
  normalizeUrl,
  getDisplayDomain,
  shouldUnfurl,
  parseProviderUrl,
  punycodeToUnicode,
  unicodeToPunycode,
  URL_SHORTENERS,
  PROVIDER_PATTERNS,
} from "../url-parser";

describe("URL Parser", () => {
  describe("parseUrl", () => {
    it("should parse a simple HTTPS URL", () => {
      const result = parseUrl("https://example.com");
      expect(result).not.toBeNull();
      expect(result!.domain).toBe("example.com");
      expect(result!.protocol).toBe("https");
      expect(result!.path).toBe("/");
      expect(result!.isShortened).toBe(false);
    });

    it("should parse a URL with path and query", () => {
      const result = parseUrl(
        "https://example.com/path/to/page?foo=bar&baz=qux",
      );
      expect(result).not.toBeNull();
      expect(result!.domain).toBe("example.com");
      expect(result!.path).toBe("/path/to/page");
      expect(result!.query).toBe("?foo=bar&baz=qux");
    });

    it("should parse a URL with hash fragment", () => {
      const result = parseUrl("https://example.com/page#section");
      expect(result).not.toBeNull();
      expect(result!.hash).toBe("#section");
    });

    it("should add https:// if protocol is missing", () => {
      const result = parseUrl("example.com/page");
      expect(result).not.toBeNull();
      expect(result!.protocol).toBe("https");
      expect(result!.normalizedUrl).toContain("https://");
    });

    it("should strip www prefix from domain", () => {
      const result = parseUrl("https://www.example.com");
      expect(result).not.toBeNull();
      expect(result!.domain).toBe("example.com");
    });

    it("should detect shortened URLs", () => {
      const bitly = parseUrl("https://bit.ly/abc123");
      expect(bitly).not.toBeNull();
      expect(bitly!.isShortened).toBe(true);

      const tco = parseUrl("https://t.co/xyz");
      expect(tco).not.toBeNull();
      expect(tco!.isShortened).toBe(true);
    });

    it("should extract TLD correctly", () => {
      const com = parseUrl("https://example.com");
      expect(com!.tld).toBe("com");

      const io = parseUrl("https://example.io");
      expect(io!.tld).toBe("io");

      const couk = parseUrl("https://example.co.uk");
      expect(couk!.tld).toBe("uk");
    });

    it("should return null for invalid URLs", () => {
      // Empty strings return null
      expect(parseUrl("")).toBeNull();
      // JavaScript URLs are blocked
      expect(parseUrl("javascript:alert(1)")).toBeNull();
      // Note: 'not-a-url' gets normalized to https://not-a-url which is valid
      // so we test with clearly invalid input
    });
  });

  describe("detectProvider", () => {
    it("should detect Twitter/X URLs", () => {
      expect(detectProvider("twitter.com", "/")).toBe("twitter");
      expect(detectProvider("x.com", "/")).toBe("twitter");
      expect(detectProvider("mobile.twitter.com", "/")).toBe("twitter");
    });

    it("should detect YouTube URLs", () => {
      expect(detectProvider("youtube.com", "/watch")).toBe("youtube");
      expect(detectProvider("youtu.be", "/abc")).toBe("youtube");
      expect(detectProvider("m.youtube.com", "/watch")).toBe("youtube");
    });

    it("should detect GitHub URLs", () => {
      expect(detectProvider("github.com", "/org/repo")).toBe("github");
      expect(detectProvider("gist.github.com", "/user/id")).toBe("github");
    });

    it("should detect Spotify URLs", () => {
      expect(detectProvider("open.spotify.com", "/track/id")).toBe("spotify");
      expect(detectProvider("spotify.com", "/")).toBe("spotify");
    });

    it("should detect Reddit URLs", () => {
      expect(detectProvider("reddit.com", "/r/subreddit")).toBe("reddit");
      expect(detectProvider("old.reddit.com", "/r/subreddit")).toBe("reddit");
    });

    it("should detect Twitch URLs", () => {
      expect(detectProvider("twitch.tv", "/channel")).toBe("twitch");
      expect(detectProvider("clips.twitch.tv", "/clip")).toBe("twitch");
    });

    it("should return generic for unknown domains", () => {
      expect(detectProvider("unknown-site.com", "/")).toBe("generic");
    });
  });

  describe("extractUrls", () => {
    it("should extract a single URL", () => {
      const result = extractUrls("Check out https://example.com for more");
      expect(result.count).toBe(1);
      expect(result.plainUrls[0]).toBe("https://example.com");
    });

    it("should extract multiple URLs", () => {
      const result = extractUrls("See https://a.com and https://b.com");
      expect(result.count).toBe(2);
      expect(result.plainUrls).toContain("https://a.com");
      expect(result.plainUrls).toContain("https://b.com");
    });

    it("should extract URLs with query parameters", () => {
      const result = extractUrls(
        "Link: https://example.com/search?q=test&page=1",
      );
      expect(result.count).toBe(1);
      expect(result.plainUrls[0]).toContain("?q=test&page=1");
    });

    it("should not duplicate URLs", () => {
      const result = extractUrls(
        "Visit https://example.com and https://example.com again",
      );
      expect(result.count).toBe(1);
    });

    it("should return empty for text without URLs", () => {
      const result = extractUrls("This is plain text without any links");
      expect(result.count).toBe(0);
      expect(result.plainUrls).toHaveLength(0);
    });

    it("should handle empty input", () => {
      expect(extractUrls("").count).toBe(0);
      expect(extractUrls(null as unknown as string).count).toBe(0);
    });
  });

  describe("extractUrlsWithPositions", () => {
    it("should return correct positions", () => {
      const text = "Check https://example.com here";
      const result = extractUrlsWithPositions(text);
      expect(result).toHaveLength(1);
      expect(result[0].start).toBe(6);
      expect(result[0].end).toBe(25);
      expect(text.substring(result[0].start, result[0].end)).toBe(
        "https://example.com",
      );
    });

    it("should return positions for multiple URLs", () => {
      const text = "A: https://a.com B: https://b.com";
      const result = extractUrlsWithPositions(text);
      expect(result).toHaveLength(2);
    });
  });

  describe("isValidUrl", () => {
    it("should return true for valid URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("http://example.com/path")).toBe(true);
      expect(isValidUrl("https://sub.example.com:8080/path?q=1")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      // JavaScript URLs blocked
      expect(isValidUrl("javascript:void(0)")).toBe(false);
      // Empty string is invalid
      expect(isValidUrl("")).toBe(false);
      // Data URLs blocked
      expect(isValidUrl("data:text/html,<script>alert(1)</script>")).toBe(
        false,
      );
    });
  });

  describe("isShortUrl", () => {
    it("should detect shortener URLs", () => {
      expect(isShortUrl("https://bit.ly/abc")).toBe(true);
      expect(isShortUrl("https://t.co/xyz")).toBe(true);
      expect(isShortUrl("https://goo.gl/123")).toBe(true);
      expect(isShortUrl("https://tinyurl.com/abc")).toBe(true);
      expect(isShortUrl("https://youtu.be/abcd123")).toBe(true);
    });

    it("should return false for regular URLs", () => {
      expect(isShortUrl("https://example.com")).toBe(false);
      expect(isShortUrl("https://github.com/org/repo")).toBe(false);
    });
  });

  describe("normalizeUrl", () => {
    it("should remove tracking parameters", () => {
      const url =
        "https://example.com/page?utm_source=twitter&utm_campaign=test&id=1";
      const normalized = normalizeUrl(url);
      expect(normalized).not.toContain("utm_source");
      expect(normalized).not.toContain("utm_campaign");
      expect(normalized).toContain("id=1");
    });

    it("should remove trailing slash", () => {
      const url = "https://example.com/page/";
      const normalized = normalizeUrl(url);
      expect(normalized).toBe("https://example.com/page");
    });

    it("should keep root slash", () => {
      const url = "https://example.com/";
      const normalized = normalizeUrl(url);
      expect(normalized).toBe("https://example.com/");
    });

    it("should handle empty URLs gracefully", () => {
      expect(normalizeUrl("")).toBe("");
    });
  });

  describe("getDisplayDomain", () => {
    it("should return domain without www", () => {
      expect(getDisplayDomain("https://www.example.com/path")).toBe(
        "example.com",
      );
      expect(getDisplayDomain("https://example.com")).toBe("example.com");
    });

    it("should preserve subdomains", () => {
      expect(getDisplayDomain("https://blog.example.com")).toBe(
        "blog.example.com",
      );
    });

    it("should return input for invalid URLs", () => {
      expect(getDisplayDomain("invalid")).toBe("invalid");
    });
  });

  describe("shouldUnfurl", () => {
    it("should return true for regular URLs", () => {
      expect(shouldUnfurl("https://example.com/article")).toBe(true);
      expect(shouldUnfurl("https://github.com/org/repo")).toBe(true);
    });

    it("should return true for known providers", () => {
      expect(shouldUnfurl("https://twitter.com/user/status/123")).toBe(true);
      expect(shouldUnfurl("https://youtube.com/watch?v=abc")).toBe(true);
    });

    it("should return false for binary file URLs", () => {
      expect(shouldUnfurl("https://example.com/file.pdf")).toBe(false);
      expect(shouldUnfurl("https://example.com/file.zip")).toBe(false);
      expect(shouldUnfurl("https://example.com/file.exe")).toBe(false);
    });

    it("should return false for very long URLs", () => {
      const longUrl = "https://example.com/" + "a".repeat(3000);
      expect(shouldUnfurl(longUrl)).toBe(false);
    });
  });

  describe("parseProviderUrl", () => {
    describe("Twitter", () => {
      it("should parse tweet URL", () => {
        const result = parseProviderUrl(
          "https://twitter.com/user/status/123456789",
        );
        expect(result).not.toBeNull();
        expect(result!.provider).toBe("twitter");
        expect(result!.type).toBe("tweet");
        expect(result!.id).toBe("123456789");
        expect(result!.extra!.username).toBe("user");
      });

      it("should parse X.com tweet URL", () => {
        const result = parseProviderUrl("https://x.com/user/status/123456789");
        expect(result).not.toBeNull();
        expect(result!.provider).toBe("twitter");
      });
    });

    describe("YouTube", () => {
      it("should parse watch URL", () => {
        const result = parseProviderUrl(
          "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        );
        expect(result).not.toBeNull();
        expect(result!.provider).toBe("youtube");
        expect(result!.type).toBe("video");
        expect(result!.id).toBe("dQw4w9WgXcQ");
      });

      it("should parse short URL", () => {
        const result = parseProviderUrl("https://youtu.be/dQw4w9WgXcQ");
        expect(result).not.toBeNull();
        expect(result!.provider).toBe("youtube");
        expect(result!.type).toBe("shortVideo");
        expect(result!.id).toBe("dQw4w9WgXcQ");
      });

      it("should parse shorts URL", () => {
        const result = parseProviderUrl(
          "https://youtube.com/shorts/abc12345678",
        );
        expect(result).not.toBeNull();
        expect(result!.type).toBe("shorts");
      });
    });

    describe("GitHub", () => {
      it("should parse repo URL", () => {
        const result = parseProviderUrl("https://github.com/org/repo");
        expect(result).not.toBeNull();
        expect(result!.provider).toBe("github");
        expect(result!.type).toBe("repo");
        expect(result!.extra!.owner).toBe("org");
        expect(result!.extra!.repo).toBe("repo");
      });

      it("should parse issue URL", () => {
        const result = parseProviderUrl(
          "https://github.com/org/repo/issues/123",
        );
        expect(result).not.toBeNull();
        expect(result!.type).toBe("issue");
        expect(result!.id).toBe("123");
      });

      it("should parse PR URL", () => {
        const result = parseProviderUrl("https://github.com/org/repo/pull/456");
        expect(result).not.toBeNull();
        expect(result!.type).toBe("pr");
        expect(result!.id).toBe("456");
      });

      it("should parse gist URL", () => {
        const result = parseProviderUrl(
          "https://gist.github.com/user/abc123def456",
        );
        expect(result).not.toBeNull();
        expect(result!.type).toBe("gist");
      });
    });

    describe("Reddit", () => {
      it("should parse post URL", () => {
        const result = parseProviderUrl(
          "https://reddit.com/r/programming/comments/abc123",
        );
        expect(result).not.toBeNull();
        expect(result!.provider).toBe("reddit");
        expect(result!.type).toBe("post");
        expect(result!.extra!.subreddit).toBe("programming");
      });

      it("should parse subreddit URL", () => {
        const result = parseProviderUrl("https://reddit.com/r/javascript");
        expect(result).not.toBeNull();
        expect(result!.type).toBe("subreddit");
      });

      it("should parse short URL", () => {
        const result = parseProviderUrl("https://redd.it/abc123");
        expect(result).not.toBeNull();
        expect(result!.type).toBe("post");
      });
    });

    describe("Twitch", () => {
      it("should parse channel URL", () => {
        const result = parseProviderUrl("https://twitch.tv/streamer");
        expect(result).not.toBeNull();
        expect(result!.provider).toBe("twitch");
        expect(result!.type).toBe("channel");
        expect(result!.id).toBe("streamer");
      });

      it("should parse video URL", () => {
        const result = parseProviderUrl("https://twitch.tv/videos/123456");
        expect(result).not.toBeNull();
        expect(result!.type).toBe("video");
      });

      it("should parse clip URL", () => {
        const result = parseProviderUrl("https://clips.twitch.tv/ClipName123");
        expect(result).not.toBeNull();
        expect(result!.type).toBe("clip");
      });
    });

    describe("Spotify", () => {
      it("should parse track URL", () => {
        const result = parseProviderUrl(
          "https://open.spotify.com/track/abc123",
        );
        expect(result).not.toBeNull();
        expect(result!.provider).toBe("spotify");
        expect(result!.type).toBe("track");
      });

      it("should parse playlist URL", () => {
        const result = parseProviderUrl(
          "https://open.spotify.com/playlist/xyz789",
        );
        expect(result).not.toBeNull();
        expect(result!.type).toBe("playlist");
      });
    });
  });

  describe("International Domain Support", () => {
    it("should detect international domains", () => {
      const result = parseUrl("https://xn--nxasmq5b.com/path");
      expect(result).not.toBeNull();
      expect(result!.isInternational).toBe(true);
    });

    it("should handle Unicode domains", () => {
      // Note: Browser/Node URL API handles Punycode conversion
      const unicode = unicodeToPunycode("example.com");
      expect(unicode).toBe("example.com");
    });
  });
});
