/**
 * Markdown Parser Tests
 *
 * Tests for markdown parsing and conversion utilities.
 */

import {
  jsonToMarkdown,
  markdownToJson,
  jsonToHtml,
  jsonToPlainText,
  getExcerpt,
  countWords,
  isEmpty,
} from "../parser";
import type { JSONContent } from "@tiptap/core";

describe("Markdown Parser", () => {
  describe("jsonToMarkdown", () => {
    it("converts bold text", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "bold text",
                marks: [{ type: "bold" }],
              },
            ],
          },
        ],
      };
      expect(jsonToMarkdown(json)).toBe("**bold text**");
    });

    it("converts italic text", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "italic text",
                marks: [{ type: "italic" }],
              },
            ],
          },
        ],
      };
      expect(jsonToMarkdown(json)).toBe("_italic text_");
    });

    it("converts code blocks", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "codeBlock",
            attrs: { language: "javascript" },
            content: [
              {
                type: "text",
                text: "const x = 1;",
              },
            ],
          },
        ],
      };
      expect(jsonToMarkdown(json)).toBe("```javascript\nconst x = 1;\n```");
    });

    it("converts links", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "click here",
                marks: [
                  {
                    type: "link",
                    attrs: { href: "https://example.com" },
                  },
                ],
              },
            ],
          },
        ],
      };
      expect(jsonToMarkdown(json)).toBe("[click here](https://example.com)");
    });

    it("converts mentions", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "mention",
                attrs: { id: "user1", label: "alice" },
              },
            ],
          },
        ],
      };
      expect(jsonToMarkdown(json)).toBe("@alice");
    });

    it("converts channel mentions", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "channelMention",
                attrs: { id: "channel1", label: "general" },
              },
            ],
          },
        ],
      };
      expect(jsonToMarkdown(json)).toBe("#general");
    });

    it("converts bullet lists", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "First item" }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Second item" }],
                  },
                ],
              },
            ],
          },
        ],
      };
      expect(jsonToMarkdown(json)).toBe("- First item\n- Second item");
    });

    it("converts headings", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Title" }],
          },
        ],
      };
      expect(jsonToMarkdown(json)).toBe("## Title");
    });
  });

  describe("markdownToJson", () => {
    it("parses bold text", () => {
      const markdown = "**bold text**";
      const json = markdownToJson(markdown);
      expect(json.content).toBeDefined();
      expect(json.content![0].type).toBe("paragraph");
    });

    it("parses headings", () => {
      const markdown = "# Heading 1";
      const json = markdownToJson(markdown);
      expect(json.content![0].type).toBe("heading");
      expect(json.content![0].attrs?.level).toBe(1);
    });

    it("parses code blocks", () => {
      const markdown = "```javascript\nconst x = 1;\n```";
      const json = markdownToJson(markdown);
      expect(json.content![0].type).toBe("codeBlock");
      expect(json.content![0].attrs?.language).toBe("javascript");
    });

    it("parses bullet lists", () => {
      const markdown = "- First\n- Second";
      const json = markdownToJson(markdown);
      expect(json.content![0].type).toBe("bulletList");
      expect(json.content![0].content).toHaveLength(2);
    });

    it("parses ordered lists", () => {
      const markdown = "1. First\n2. Second";
      const json = markdownToJson(markdown);
      expect(json.content![0].type).toBe("orderedList");
    });

    it("parses blockquotes", () => {
      const markdown = "> This is a quote";
      const json = markdownToJson(markdown);
      expect(json.content![0].type).toBe("blockquote");
    });

    it("parses horizontal rules", () => {
      const markdown = "---";
      const json = markdownToJson(markdown);
      expect(json.content![0].type).toBe("horizontalRule");
    });
  });

  describe("jsonToHtml", () => {
    it("converts to sanitized HTML", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "bold",
                marks: [{ type: "bold" }],
              },
            ],
          },
        ],
      };
      const html = jsonToHtml(json);
      expect(html).toContain("<strong>bold</strong>");
    });

    it("escapes HTML characters", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: '<script>alert("xss")</script>',
              },
            ],
          },
        ],
      };
      const html = jsonToHtml(json);
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });

  describe("jsonToPlainText", () => {
    it("extracts plain text from formatted content", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Hello ",
              },
              {
                type: "text",
                text: "world",
                marks: [{ type: "bold" }],
              },
            ],
          },
        ],
      };
      // Implementation may add extra spacing between text nodes
      expect(jsonToPlainText(json).replace(/\s+/g, " ").trim()).toBe(
        "Hello world",
      );
    });

    it("strips all formatting marks", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "formatted text",
                marks: [
                  { type: "bold" },
                  { type: "italic" },
                  { type: "underline" },
                ],
              },
            ],
          },
        ],
      };
      expect(jsonToPlainText(json)).toBe("formatted text");
    });
  });

  describe("getExcerpt", () => {
    it("returns full text if shorter than limit", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Short text" }],
          },
        ],
      };
      expect(getExcerpt(json, 100)).toBe("Short text");
    });

    it("truncates long text with ellipsis", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "This is a very long text that should be truncated",
              },
            ],
          },
        ],
      };
      const excerpt = getExcerpt(json, 20);
      expect(excerpt.length).toBeLessThanOrEqual(23); // 20 + '...'
      expect(excerpt).toContain("...");
    });
  });

  describe("countWords", () => {
    it("counts words correctly", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "one two three four" }],
          },
        ],
      };
      expect(countWords(json)).toBe(4);
    });

    it("handles multiple paragraphs", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "first paragraph" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "second paragraph" }],
          },
        ],
      };
      expect(countWords(json)).toBe(4);
    });
  });

  describe("isEmpty", () => {
    it("returns true for empty content", () => {
      const json: JSONContent = {
        type: "doc",
        content: [],
      };
      expect(isEmpty(json)).toBe(true);
    });

    it("returns true for whitespace only", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "   " }],
          },
        ],
      };
      expect(isEmpty(json)).toBe(true);
    });

    it("returns false for non-empty content", () => {
      const json: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hello" }],
          },
        ],
      };
      expect(isEmpty(json)).toBe(false);
    });
  });

  describe("round-trip conversion", () => {
    it("preserves content through markdown conversion", () => {
      const original = "**Bold** and _italic_ text";
      const json = markdownToJson(original);
      const result = jsonToMarkdown(json);

      // Check that the content is preserved (exact format may vary)
      expect(result).toMatch(/bold/i);
      expect(result).toMatch(/italic/i);
    });

    it("handles complex content", () => {
      // Build markdown with code fence - avoiding template literal parsing issues
      const codeFence = "`".repeat(3);
      const original = [
        "# Heading",
        "",
        "**Bold** text with a [link](https://example.com).",
        "",
        "- List item 1",
        "- List item 2",
        "",
        codeFence + "javascript",
        "const x = 1;",
        codeFence,
      ].join("\n");
      const json = markdownToJson(original);
      const result = jsonToMarkdown(json);

      expect(result).toContain("Heading");
      expect(result).toContain("Bold");
      expect(result).toContain("link");
      expect(result).toContain("List item");
      expect(result).toContain("const x = 1");
    });
  });
});
