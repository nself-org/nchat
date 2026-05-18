/**
 * @fileoverview Tests for Message Utilities
 */

import {
  extractMentions,
  hasMention,
  extractLinks,
  isImageUrl,
  isVideoUrl,
  extractEmojis,
  parseMessageContent,
  escapeHtml,
  sanitizeHtml,
  stripHtml,
  truncateMessage,
  textToHtml,
  getMessagePreview,
  type ParsedMention,
  type ParsedLink,
  type ParsedEmoji,
} from "../message";

describe("Mention Extraction", () => {
  describe("extractMentions", () => {
    it("should extract @everyone mention", () => {
      const mentions = extractMentions("Hello @everyone!");
      expect(mentions).toHaveLength(1);
      expect(mentions[0].type).toBe("everyone");
      expect(mentions[0].display).toBe("@everyone");
    });

    it("should extract @here mention", () => {
      const mentions = extractMentions("Hey @here, check this out");
      expect(mentions).toHaveLength(1);
      expect(mentions[0].type).toBe("here");
      expect(mentions[0].display).toBe("@here");
    });

    it("should extract @username mention", () => {
      const mentions = extractMentions("Hey @john-doe!");
      expect(mentions).toHaveLength(1);
      expect(mentions[0].type).toBe("user");
      expect(mentions[0].display).toBe("@john-doe");
    });

    it("should extract multiple mentions", () => {
      const mentions = extractMentions("@alice and @bob and @everyone");
      expect(mentions).toHaveLength(3);
    });

    it("should extract Slack-style user mention", () => {
      const mentions = extractMentions("Hey <@U12345|john>");
      // Finds both the Slack-style and the @U12345 as a regular mention
      const slackMention = mentions.find((m) => m.id === "U12345");
      expect(slackMention).toBeDefined();
      expect(slackMention!.display).toBe("@john");
    });

    it("should extract channel mention", () => {
      const mentions = extractMentions("Check out <#C12345|general>");
      expect(mentions).toHaveLength(1);
      expect(mentions[0].type).toBe("channel");
      expect(mentions[0].id).toBe("C12345");
      expect(mentions[0].display).toBe("#general");
    });

    it("should return empty array for no mentions", () => {
      const mentions = extractMentions("Hello world!");
      expect(mentions).toHaveLength(0);
    });

    it("should include position information", () => {
      const mentions = extractMentions("Hey @alice!");
      expect(mentions[0].start).toBe(4);
      expect(mentions[0].end).toBe(10);
    });
  });

  describe("hasMention", () => {
    it("should return true for user ID match", () => {
      expect(hasMention("<@U12345|john> check this", "U12345")).toBe(true);
    });

    it("should return true for @everyone", () => {
      expect(hasMention("Hey @everyone!", "any-user-id")).toBe(true);
    });

    it("should return true for @here", () => {
      expect(hasMention("Hey @here!", "any-user-id")).toBe(true);
    });

    it("should return false for no mention", () => {
      expect(hasMention("Hello world", "U12345")).toBe(false);
    });
  });
});

describe("Link Extraction", () => {
  describe("extractLinks", () => {
    it("should extract raw URL", () => {
      const links = extractLinks("Check out https://example.com");
      expect(links).toHaveLength(1);
      expect(links[0].url).toBe("https://example.com");
      expect(links[0].isAutolinked).toBe(true);
    });

    it("should extract markdown link", () => {
      const links = extractLinks("Check out [Example](https://example.com)");
      expect(links).toHaveLength(1);
      expect(links[0].url).toBe("https://example.com");
      expect(links[0].text).toBe("Example");
      expect(links[0].isAutolinked).toBe(false);
    });

    it("should extract multiple links", () => {
      const links = extractLinks("Visit https://a.com and https://b.com");
      expect(links).toHaveLength(2);
    });

    it("should not duplicate URL inside markdown", () => {
      const links = extractLinks("[Click](https://example.com)");
      expect(links).toHaveLength(1);
    });

    it("should return empty array for no links", () => {
      const links = extractLinks("Hello world!");
      expect(links).toHaveLength(0);
    });

    it("should include position information", () => {
      const links = extractLinks("Go to https://example.com now");
      expect(links[0].start).toBe(6);
      // End position includes the URL
      expect(links[0].end).toBeGreaterThan(links[0].start);
    });
  });

  describe("isImageUrl", () => {
    it("should detect image URLs", () => {
      expect(isImageUrl("https://example.com/image.jpg")).toBe(true);
      expect(isImageUrl("https://example.com/image.png")).toBe(true);
      expect(isImageUrl("https://example.com/image.gif")).toBe(true);
      expect(isImageUrl("https://example.com/image.webp")).toBe(true);
    });

    it("should return false for non-image URLs", () => {
      expect(isImageUrl("https://example.com/page")).toBe(false);
      expect(isImageUrl("https://example.com/doc.pdf")).toBe(false);
    });
  });

  describe("isVideoUrl", () => {
    it("should detect YouTube URLs", () => {
      expect(isVideoUrl("https://youtube.com/watch?v=abc123")).toBe(true);
      expect(isVideoUrl("https://youtu.be/abc123")).toBe(true);
    });

    it("should detect Vimeo URLs", () => {
      expect(isVideoUrl("https://vimeo.com/123456")).toBe(true);
    });

    it("should detect video file URLs", () => {
      expect(isVideoUrl("https://example.com/video.mp4")).toBe(true);
      expect(isVideoUrl("https://example.com/video.webm")).toBe(true);
    });

    it("should return false for non-video URLs", () => {
      expect(isVideoUrl("https://example.com/page")).toBe(false);
    });
  });
});

describe("Emoji Extraction", () => {
  describe("extractEmojis", () => {
    it("should extract emoji shortcodes", () => {
      const emojis = extractEmojis("Hello :wave: world :smile:");
      expect(emojis).toHaveLength(2);
      expect(emojis[0].shortcode).toBe("wave");
      expect(emojis[1].shortcode).toBe("smile");
    });

    it("should handle emoji with numbers", () => {
      const emojis = extractEmojis(":+1: nice!");
      expect(emojis).toHaveLength(1);
      expect(emojis[0].shortcode).toBe("+1");
    });

    it("should return empty array for no emojis", () => {
      const emojis = extractEmojis("Hello world!");
      expect(emojis).toHaveLength(0);
    });

    it("should include position information", () => {
      const emojis = extractEmojis("Hi :wave:!");
      expect(emojis[0].start).toBe(3);
      expect(emojis[0].end).toBe(9);
    });
  });
});

describe("Content Parsing", () => {
  describe("parseMessageContent", () => {
    it("should parse all content types", () => {
      const content = "Hey @alice! Check https://example.com :wave:";
      const parsed = parseMessageContent(content);

      expect(parsed.text).toBe(content);
      expect(parsed.mentions).toHaveLength(1);
      expect(parsed.links).toHaveLength(1);
      expect(parsed.emojis).toHaveLength(1);
    });

    it("should handle empty content", () => {
      const parsed = parseMessageContent("");
      expect(parsed.text).toBe("");
      expect(parsed.mentions).toHaveLength(0);
      expect(parsed.links).toHaveLength(0);
      expect(parsed.emojis).toHaveLength(0);
    });
  });
});

describe("HTML Sanitization", () => {
  describe("escapeHtml", () => {
    it("should escape HTML entities", () => {
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
      expect(escapeHtml("a & b")).toBe("a &amp; b");
      expect(escapeHtml('"quoted"')).toBe("&quot;quoted&quot;");
      expect(escapeHtml("it's")).toBe("it&#39;s");
    });

    it("should handle normal text", () => {
      expect(escapeHtml("Hello world")).toBe("Hello world");
    });
  });

  describe("sanitizeHtml", () => {
    it("should remove script tags", () => {
      const html = '<p>Hello</p><script>alert("xss")</script>';
      expect(sanitizeHtml(html)).toBe("<p>Hello</p>");
    });

    it("should remove event handlers", () => {
      const html = '<img src="x" onerror="alert(1)">';
      expect(sanitizeHtml(html)).not.toContain("onerror");
    });

    it("should remove javascript: URLs", () => {
      const html = '<a href="javascript:alert(1)">click</a>';
      expect(sanitizeHtml(html)).not.toContain("javascript:");
    });

    it("should remove iframes", () => {
      const html = '<iframe src="https://evil.com"></iframe>';
      expect(sanitizeHtml(html)).not.toContain("iframe");
    });

    it("should remove style tags", () => {
      const html = "<style>body { display: none }</style><p>Hi</p>";
      expect(sanitizeHtml(html)).not.toContain("<style>");
    });
  });

  describe("stripHtml", () => {
    it("should remove all HTML tags", () => {
      expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe(
        "Hello world",
      );
    });

    it("should handle self-closing tags", () => {
      expect(stripHtml("Line 1<br/>Line 2")).toBe("Line 1Line 2");
    });

    it("should handle nested tags", () => {
      expect(stripHtml("<div><p><span>Text</span></p></div>")).toBe("Text");
    });
  });
});

describe("Message Formatting", () => {
  describe("truncateMessage", () => {
    it("should not truncate short messages", () => {
      expect(truncateMessage("Hello", 100)).toBe("Hello");
    });

    it("should truncate long messages", () => {
      const longMessage = "a".repeat(150);
      const result = truncateMessage(longMessage, 100);
      expect(result.length).toBe(100);
      expect(result.endsWith("...")).toBe(true);
    });

    it("should use default max length", () => {
      const longMessage = "a".repeat(150);
      const result = truncateMessage(longMessage);
      expect(result.length).toBe(100);
    });
  });

  describe("textToHtml", () => {
    it("should convert newlines to br tags", () => {
      expect(textToHtml("Line 1\nLine 2")).toBe("Line 1<br>Line 2");
    });

    it("should escape HTML", () => {
      expect(textToHtml("<script>")).toBe("&lt;script&gt;");
    });

    it("should handle multiple newlines", () => {
      expect(textToHtml("a\n\nb")).toBe("a<br><br>b");
    });
  });

  describe("getMessagePreview", () => {
    it("should strip HTML", () => {
      expect(getMessagePreview("<p>Hello</p>")).toBe("Hello");
    });

    it("should normalize whitespace", () => {
      expect(getMessagePreview("Hello    world")).toBe("Hello world");
    });

    it("should replace newlines with spaces", () => {
      expect(getMessagePreview("Line 1\nLine 2")).toBe("Line 1 Line 2");
    });

    it("should truncate long previews", () => {
      const longMessage = "a".repeat(150);
      const result = getMessagePreview(longMessage, 100);
      expect(result.length).toBe(100);
    });
  });
});
