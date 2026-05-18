/**
 * Markdown Parser
 *
 * Converts TipTap JSON to markdown and vice versa.
 * Supports:
 * - Bold, italic, underline, strikethrough
 * - Code inline and code blocks
 * - Links
 * - Lists (bullet and ordered)
 * - Blockquotes
 * - Headings (H1-H6)
 * - @mentions, #channels, :emojis:
 * - Images
 * - Horizontal rules
 */

import type { JSONContent } from "@tiptap/core";
import DOMPurify from "isomorphic-dompurify";

// ============================================================================
// Types
// ============================================================================

export interface ParseOptions {
  /** Allow HTML in markdown */
  allowHtml?: boolean;
  /** Sanitize HTML output */
  sanitize?: boolean;
  /** Convert newlines to <br> */
  breaks?: boolean;
}

export interface MarkdownNode {
  type: string;
  content?: MarkdownNode[];
  text?: string;
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
  }>;
  attrs?: Record<string, unknown>;
}

// ============================================================================
// JSON to Markdown
// ============================================================================

/**
 * Convert TipTap JSON to Markdown string
 */
export function jsonToMarkdown(json: JSONContent): string {
  if (!json || !json.content) return "";

  return json.content.map((node) => nodeToMarkdown(node)).join("\n\n");
}

/**
 * Convert a single node to markdown
 */
function nodeToMarkdown(node: JSONContent, inList = false): string {
  switch (node.type) {
    case "paragraph":
      return paragraphToMarkdown(node);

    case "heading":
      return headingToMarkdown(node);

    case "codeBlock":
      return codeBlockToMarkdown(node);

    case "blockquote":
      return blockquoteToMarkdown(node);

    case "bulletList":
      return bulletListToMarkdown(node);

    case "orderedList":
      return orderedListToMarkdown(node);

    case "listItem":
      return listItemToMarkdown(node, inList);

    case "horizontalRule":
      return "---";

    case "hardBreak":
      return "  \n";

    case "image":
      return imageToMarkdown(node);

    case "text":
      return textToMarkdown(node);

    case "mention":
      return mentionToMarkdown(node);

    case "channelMention":
      return channelMentionToMarkdown(node);

    case "emojiMention":
      return emojiMentionToMarkdown(node);

    default:
      // Fallback for unknown node types
      if (node.content) {
        return node.content.map((n) => nodeToMarkdown(n, inList)).join("");
      }
      return "";
  }
}

/**
 * Convert paragraph node to markdown
 */
function paragraphToMarkdown(node: JSONContent): string {
  if (!node.content) return "";
  return node.content.map((n) => nodeToMarkdown(n)).join("");
}

/**
 * Convert heading node to markdown
 */
function headingToMarkdown(node: JSONContent): string {
  const level = node.attrs?.level || 1;
  const content = node.content?.map((n) => nodeToMarkdown(n)).join("") || "";
  return `${"#".repeat(level)} ${content}`;
}

/**
 * Convert code block to markdown
 */
function codeBlockToMarkdown(node: JSONContent): string {
  const language = node.attrs?.language || "";
  const content = node.content?.map((n) => nodeToMarkdown(n)).join("") || "";
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

/**
 * Convert blockquote to markdown
 */
function blockquoteToMarkdown(node: JSONContent): string {
  if (!node.content) return "";
  return node.content
    .map((n) => {
      const content = nodeToMarkdown(n);
      return content
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    })
    .join("\n");
}

/**
 * Convert bullet list to markdown
 */
function bulletListToMarkdown(node: JSONContent): string {
  if (!node.content) return "";
  return node.content.map((n) => nodeToMarkdown(n, true)).join("\n");
}

/**
 * Convert ordered list to markdown
 */
function orderedListToMarkdown(node: JSONContent): string {
  if (!node.content) return "";
  return node.content
    .map((n, index) => {
      const content = listItemToMarkdown(n, true);
      return `${index + 1}. ${content.substring(2)}`; // Replace "- " with number
    })
    .join("\n");
}

/**
 * Convert list item to markdown
 */
function listItemToMarkdown(node: JSONContent, inList: boolean): string {
  if (!node.content) return "";
  const content = node.content.map((n) => nodeToMarkdown(n, inList)).join("");
  return inList ? `- ${content}` : content;
}

/**
 * Convert image to markdown
 */
function imageToMarkdown(node: JSONContent): string {
  const src = node.attrs?.src || "";
  const alt = node.attrs?.alt || "";
  const title = node.attrs?.title;
  return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
}

/**
 * Convert mention to markdown
 */
function mentionToMarkdown(node: JSONContent): string {
  const label = node.attrs?.label || node.attrs?.id || "unknown";
  return `@${label}`;
}

/**
 * Convert channel mention to markdown
 */
function channelMentionToMarkdown(node: JSONContent): string {
  const label = node.attrs?.label || node.attrs?.id || "unknown";
  return `#${label}`;
}

/**
 * Convert emoji mention to markdown
 */
function emojiMentionToMarkdown(node: JSONContent): string {
  const emoji = node.attrs?.id || node.attrs?.label || "";
  return emoji;
}

/**
 * Convert text with marks to markdown
 */
function textToMarkdown(node: JSONContent): string {
  let text = node.text || "";

  if (node.marks && node.marks.length > 0) {
    // Apply marks in specific order
    const marks = node.marks;

    // Link (must be first to wrap other marks)
    const linkMark = marks.find((m) => m.type === "link");
    if (linkMark) {
      const href = linkMark.attrs?.href || "";
      text = `[${text}](${href})`;
      // Remove link mark for further processing
      const otherMarks = marks.filter((m) => m.type !== "link");
      if (otherMarks.length === 0) return text;
    }

    // Code (wraps text, applied before formatting)
    if (marks.some((m) => m.type === "code")) {
      return `\`${text}\``;
    }

    // Bold
    if (marks.some((m) => m.type === "bold")) {
      text = `**${text}**`;
    }

    // Italic
    if (marks.some((m) => m.type === "italic")) {
      text = `_${text}_`;
    }

    // Underline (HTML needed)
    if (marks.some((m) => m.type === "underline")) {
      text = `<u>${text}</u>`;
    }

    // Strikethrough
    if (marks.some((m) => m.type === "strike")) {
      text = `~~${text}~~`;
    }
  }

  return text;
}

// ============================================================================
// Markdown to JSON
// ============================================================================

/**
 * Convert Markdown string to TipTap JSON
 * Note: This is a simplified parser. For production, consider using a library like remark.
 */
export function markdownToJson(markdown: string): JSONContent {
  const lines = markdown.split("\n");
  const content: JSONContent[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line - skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      content.push({
        type: "heading",
        attrs: { level: headingMatch[1].length },
        content: parseInlineContent(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Code block
    if (line.startsWith("```")) {
      const language = line.substring(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      content.push({
        type: "codeBlock",
        attrs: { language },
        content: [{ type: "text", text: codeLines.join("\n") }],
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].substring(2));
        i++;
      }
      content.push({
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: parseInlineContent(quoteLines.join(" ")),
          },
        ],
      });
      continue;
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      content.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const listItems: JSONContent[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        const itemText = lines[i].replace(/^\d+\.\s+/, "");
        listItems.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInlineContent(itemText),
            },
          ],
        });
        i++;
      }
      content.push({
        type: "orderedList",
        content: listItems,
      });
      continue;
    }

    // Bullet list
    if (line.match(/^[-*+]\s+/)) {
      const listItems: JSONContent[] = [];
      while (i < lines.length && lines[i].match(/^[-*+]\s+/)) {
        const itemText = lines[i].replace(/^[-*+]\s+/, "");
        listItems.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInlineContent(itemText),
            },
          ],
        });
        i++;
      }
      content.push({
        type: "bulletList",
        content: listItems,
      });
      continue;
    }

    // Regular paragraph
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isSpecialLine(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    if (paragraphLines.length > 0) {
      content.push({
        type: "paragraph",
        content: parseInlineContent(paragraphLines.join(" ")),
      });
    }
  }

  return {
    type: "doc",
    content,
  };
}

/**
 * Check if a line is a special markdown line (heading, list, etc.)
 */
function isSpecialLine(line: string): boolean {
  return (
    line.startsWith("#") ||
    line.startsWith("```") ||
    line.startsWith("> ") ||
    line.match(/^[-*+]\s+/) !== null ||
    line.match(/^\d+\.\s+/) !== null ||
    line.match(/^(-{3,}|\*{3,}|_{3,})$/) !== null
  );
}

/**
 * Parse inline content (bold, italic, code, links, etc.)
 */
function parseInlineContent(text: string): JSONContent[] {
  const nodes: JSONContent[] = [];
  const current = text;

  // This is a simplified parser - for production use a proper markdown parser
  // We'll handle basic inline formatting

  // Match patterns
  const patterns = [
    // Links: [text](url)
    { regex: /\[([^\]]+)\]\(([^)]+)\)/, type: "link" },
    // Bold: **text** or __text__
    { regex: /\*\*([^*]+)\*\*|__([^_]+)__/, type: "bold" },
    // Italic: *text* or _text_
    { regex: /\*([^*]+)\*|_([^_]+)_/, type: "italic" },
    // Code: `code`
    { regex: /`([^`]+)`/, type: "code" },
    // Strikethrough: ~~text~~
    { regex: /~~([^~]+)~~/, type: "strike" },
    // Underline: <u>text</u>
    { regex: /<u>([^<]+)<\/u>/, type: "underline" },
    // Mention: @username
    { regex: /@(\w+)/, type: "mention" },
    // Channel: #channel
    { regex: /#(\w+)/, type: "channel" },
    // Image: ![alt](url)
    { regex: /!\[([^\]]*)\]\(([^)]+)\)/, type: "image" },
  ];

  // Simple tokenizer - split by spaces and process each token
  const tokens = current.split(/(\s+)/);

  for (const token of tokens) {
    let matched = false;

    for (const pattern of patterns) {
      const match = token.match(pattern.regex);
      if (match) {
        matched = true;

        switch (pattern.type) {
          case "link":
            nodes.push({
              type: "text",
              text: match[1],
              marks: [{ type: "link", attrs: { href: match[2] } }],
            });
            break;

          case "image":
            nodes.push({
              type: "image",
              attrs: { src: match[2], alt: match[1] },
            });
            break;

          case "mention":
            nodes.push({
              type: "mention",
              attrs: { id: match[1], label: match[1] },
            });
            break;

          case "channel":
            nodes.push({
              type: "channelMention",
              attrs: { id: match[1], label: match[1] },
            });
            break;

          case "bold":
          case "italic":
          case "code":
          case "strike":
          case "underline":
            nodes.push({
              type: "text",
              text: match[1] || match[2],
              marks: [{ type: pattern.type }],
            });
            break;
        }
        break;
      }
    }

    if (!matched) {
      // Plain text
      nodes.push({
        type: "text",
        text: token,
      });
    }
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text }];
}

// ============================================================================
// HTML Conversion
// ============================================================================

/**
 * Convert TipTap JSON to HTML string
 */
export function jsonToHtml(
  json: JSONContent,
  options: ParseOptions = {},
): string {
  const markdown = jsonToMarkdown(json);
  const html = markdownToHtml(markdown);

  if (options.sanitize !== false) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "s",
        "code",
        "pre",
        "a",
        "ul",
        "ol",
        "li",
        "blockquote",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "img",
        "hr",
        "span",
        "div",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "rel", "target"],
    });
  }

  return html;
}

/**
 * Simple markdown to HTML converter
 */
export function markdownToHtml(markdown: string): string {
  const json = markdownToJson(markdown);
  return jsonToHtmlNode(json);
}

/**
 * Convert JSON node to HTML
 */
function jsonToHtmlNode(node: JSONContent): string {
  switch (node.type) {
    case "doc":
      return node.content?.map((n) => jsonToHtmlNode(n)).join("") || "";

    case "paragraph":
      return `<p>${node.content?.map((n) => jsonToHtmlNode(n)).join("") || ""}</p>`;

    case "heading":
      const level = node.attrs?.level || 1;
      return `<h${level}>${node.content?.map((n) => jsonToHtmlNode(n)).join("") || ""}</h${level}>`;

    case "codeBlock":
      const lang = node.attrs?.language || "";
      const codeContent =
        node.content?.map((n) => jsonToHtmlNode(n)).join("") || "";
      return `<pre><code class="language-${lang}">${escapeHtml(codeContent)}</code></pre>`;

    case "blockquote":
      return `<blockquote>${node.content?.map((n) => jsonToHtmlNode(n)).join("") || ""}</blockquote>`;

    case "bulletList":
      return `<ul>${node.content?.map((n) => jsonToHtmlNode(n)).join("") || ""}</ul>`;

    case "orderedList":
      return `<ol>${node.content?.map((n) => jsonToHtmlNode(n)).join("") || ""}</ol>`;

    case "listItem":
      return `<li>${node.content?.map((n) => jsonToHtmlNode(n)).join("") || ""}</li>`;

    case "horizontalRule":
      return "<hr>";

    case "hardBreak":
      return "<br>";

    case "image":
      const src = node.attrs?.src || "";
      const alt = node.attrs?.alt || "";
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">`;

    case "text":
      return textToHtml(node);

    case "mention":
      const mentionLabel = node.attrs?.label || node.attrs?.id || "unknown";
      return `<span class="mention mention-user" data-id="${node.attrs?.id}">@${escapeHtml(mentionLabel)}</span>`;

    case "channelMention":
      const channelLabel = node.attrs?.label || node.attrs?.id || "unknown";
      return `<span class="mention mention-channel" data-id="${node.attrs?.id}">#${escapeHtml(channelLabel)}</span>`;

    case "emojiMention":
      const emoji = node.attrs?.id || node.attrs?.label || "";
      return `<span class="emoji">${emoji}</span>`;

    default:
      return "";
  }
}

/**
 * Convert text with marks to HTML
 */
function textToHtml(node: JSONContent): string {
  let text = escapeHtml(node.text || "");

  if (node.marks && node.marks.length > 0) {
    for (const mark of node.marks) {
      switch (mark.type) {
        case "bold":
          text = `<strong>${text}</strong>`;
          break;
        case "italic":
          text = `<em>${text}</em>`;
          break;
        case "underline":
          text = `<u>${text}</u>`;
          break;
        case "strike":
          text = `<s>${text}</s>`;
          break;
        case "code":
          text = `<code>${text}</code>`;
          break;
        case "link":
          const href = mark.attrs?.href || "";
          text = `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
          break;
      }
    }
  }

  return text;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get plain text from JSON (strips all formatting)
 */
export function jsonToPlainText(json: JSONContent): string {
  if (!json) return "";

  if (json.type === "text") {
    return json.text || "";
  }

  if (json.content) {
    return json.content.map((node) => jsonToPlainText(node)).join(" ");
  }

  return "";
}

/**
 * Get excerpt from JSON (first N characters of plain text)
 */
export function getExcerpt(json: JSONContent, length = 100): string {
  const text = jsonToPlainText(json);
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + "...";
}

/**
 * Count words in JSON content
 */
export function countWords(json: JSONContent): number {
  const text = jsonToPlainText(json);
  return text.trim().split(/\s+/).length;
}

/**
 * Check if JSON content is empty
 */
export function isEmpty(json: JSONContent): boolean {
  const text = jsonToPlainText(json).trim();
  return text.length === 0;
}
