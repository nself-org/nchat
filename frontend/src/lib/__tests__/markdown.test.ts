/**
 * Markdown Utilities Tests
 *
 * Comprehensive tests for markdown parsing, HTML sanitization, and XSS prevention.
 */

// Mock the marked and hljs modules to avoid ESM issues
jest.mock("marked", () => ({
  marked: {
    parse: jest.fn((content: string) => `<p>${content}</p>`),
    use: jest.fn(),
  },
  Renderer: jest.fn().mockImplementation(() => ({
    code: jest.fn(),
    codespan: jest.fn(),
    link: jest.fn(),
  })),
  Tokens: {},
}));

jest.mock("highlight.js", () => ({
  highlight: jest.fn((code: string) => ({
    value: code,
    language: "javascript",
    relevance: 5,
  })),
  highlightAuto: jest.fn((code: string) => ({
    value: code,
    language: "javascript",
    relevance: 5,
  })),
  getLanguage: jest.fn(() => true),
}));

import {
  sanitize,
  isDangerousHtml,
  escapeHtml,
  convertEmojis,
} from "../markdown";

describe("Markdown Utilities", () => {
  // Note: formatMarkdown, highlightSyntax tests are mocked due to ESM issues with marked/hljs
  // These are tested in integration tests

  describe("sanitize - XSS Prevention", () => {
    it("removes script tags", () => {
      const html = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitize(html);
      expect(result).not.toContain("<script");
      expect(result).not.toContain("alert");
      expect(result).toContain("Safe content");
    });

    it("removes iframe tags", () => {
      const html = '<iframe src="evil.com"></iframe><p>Content</p>';
      const result = sanitize(html);
      expect(result).not.toContain("<iframe");
      expect(result).toContain("Content");
    });

    it("removes object and embed tags", () => {
      const html = '<object data="evil.swf"></object><embed src="evil.swf">';
      const result = sanitize(html);
      expect(result).not.toContain("<object");
      expect(result).not.toContain("<embed");
    });

    it("removes onerror handlers", () => {
      const html = '<img src="x" onerror="alert(1)">';
      const result = sanitize(html);
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("alert");
    });

    it("removes onclick handlers", () => {
      const html = '<a href="#" onclick="alert(1)">Link</a>';
      const result = sanitize(html);
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("alert");
    });

    it("removes onload handlers", () => {
      const html = '<body onload="alert(1)">Content</body>';
      const result = sanitize(html);
      expect(result).not.toContain("onload");
      expect(result).not.toContain("alert");
    });

    it("removes javascript: URLs", () => {
      const html = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitize(html);
      expect(result).not.toContain("javascript:");
    });

    it("removes vbscript: URLs", () => {
      const html = '<a href="vbscript:msgbox(1)">Link</a>';
      const result = sanitize(html);
      expect(result).not.toContain("vbscript:");
    });

    it("removes data: URLs in images", () => {
      const html = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitize(html);
      // DOMPurify should remove or sanitize this
      expect(result).not.toContain("<script");
    });

    it("allows safe HTML tags", () => {
      const html =
        "<p><strong>Bold</strong> <em>Italic</em> <code>Code</code></p>";
      const result = sanitize(html);
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>");
      expect(result).toContain("<em>");
      expect(result).toContain("<code>");
    });

    it("allows safe links", () => {
      const html = '<a href="https://example.com">Safe Link</a>';
      const result = sanitize(html);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain("Safe Link");
    });

    it("removes form tags", () => {
      const html = '<form action="/submit"><input type="text"></form>';
      const result = sanitize(html);
      expect(result).not.toContain("<form");
      expect(result).not.toContain("<input");
    });

    it("removes style tags", () => {
      const html = "<style>body { background: red; }</style><p>Content</p>";
      const result = sanitize(html);
      expect(result).not.toContain("<style");
      expect(result).toContain("Content");
    });

    it("handles empty input", () => {
      expect(sanitize("")).toBe("");
      expect(sanitize(null as any)).toBe("");
      expect(sanitize(undefined as any)).toBe("");
    });

    it("supports custom allowed tags", () => {
      const html = '<video src="test.mp4"></video>';
      const resultDefault = sanitize(html);
      expect(resultDefault).not.toContain("<video");

      const resultWithVideo = sanitize(html, { allowTags: ["video"] });
      expect(resultWithVideo).toContain("<video");
    });

    it("supports custom allowed attributes", () => {
      const html = '<div data-custom="value">Content</div>';
      const result = sanitize(html, { allowAttrs: ["data-custom"] });
      expect(result).toContain("data-custom");
    });

    it("escapes malicious attributes in safe tags", () => {
      const html = '<p onmouseover="alert(1)">Hover</p>';
      const result = sanitize(html);
      expect(result).not.toContain("onmouseover");
      expect(result).toContain("Hover");
    });
  });

  describe("isDangerousHtml", () => {
    it("detects script tags", () => {
      expect(isDangerousHtml("<script>alert(1)</script>")).toBe(true);
      expect(isDangerousHtml("<SCRIPT>alert(1)</SCRIPT>")).toBe(true);
    });

    it("detects iframe tags", () => {
      expect(isDangerousHtml('<iframe src="evil.com"></iframe>')).toBe(true);
    });

    it("detects object tags", () => {
      expect(isDangerousHtml('<object data="evil.swf"></object>')).toBe(true);
    });

    it("detects javascript: URLs", () => {
      expect(isDangerousHtml('<a href="javascript:alert(1)">Link</a>')).toBe(
        true,
      );
      expect(isDangerousHtml('<a href="JavaScript:alert(1)">Link</a>')).toBe(
        true,
      );
    });

    it("detects event handlers", () => {
      expect(isDangerousHtml('<img onerror="alert(1)">')).toBe(true);
      expect(isDangerousHtml('<div onclick="alert(1)">')).toBe(true);
      expect(isDangerousHtml('<body onload="alert(1)">')).toBe(true);
    });

    it("detects data: URLs", () => {
      expect(isDangerousHtml('<img src="data:text/html,<script>">')).toBe(true);
    });

    it("returns false for safe HTML", () => {
      expect(isDangerousHtml("<p>Safe content</p>")).toBe(false);
      expect(isDangerousHtml("<strong>Bold</strong>")).toBe(false);
      expect(isDangerousHtml('<a href="https://example.com">Link</a>')).toBe(
        false,
      );
    });

    it("handles empty input", () => {
      expect(isDangerousHtml("")).toBe(false);
      expect(isDangerousHtml(null as any)).toBe(false);
    });
  });

  describe("escapeHtml", () => {
    it("escapes < and >", () => {
      expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
    });

    it("escapes quotes", () => {
      expect(escapeHtml("\"double\" and 'single'")).toBe(
        "&quot;double&quot; and &#39;single&#39;",
      );
    });

    it("escapes ampersand", () => {
      expect(escapeHtml("A & B")).toBe("A &amp; B");
    });

    it("handles multiple special characters", () => {
      const result = escapeHtml('<script src="evil.js">alert("xss")</script>');
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
      expect(result).toContain("&quot;");
    });
  });

  describe("convertEmojis", () => {
    it("converts emoji shortcodes", () => {
      const result = convertEmojis("Hello :smile: world");
      expect(result).toContain("😄");
      expect(result).not.toContain(":smile:");
    });

    it("converts multiple emojis", () => {
      const result = convertEmojis(":thumbsup: :heart: :fire:");
      expect(result).toContain("👍");
      expect(result).toContain("❤️");
      expect(result).toContain("🔥");
    });

    it("leaves unknown shortcodes unchanged", () => {
      const result = convertEmojis(":unknown:");
      expect(result).toBe(":unknown:");
    });

    it("handles empty input", () => {
      expect(convertEmojis("")).toBe("");
      expect(convertEmojis(null as any)).toBe("");
    });
  });
});
