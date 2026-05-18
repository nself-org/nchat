/**
 * Markdown Utilities
 *
 * Client-side utilities for markdown parsing, HTML sanitization, and code highlighting.
 * This module provides convenient wrapper functions around the MessageFormatterService.
 *
 * @example
 * ```typescript
 * import { formatMarkdown, sanitize, highlightSyntax } from '@/lib/markdown'
 *
 * // Format markdown to safe HTML
 * const html = formatMarkdown('**Hello** _world_')
 *
 * // Sanitize user-provided HTML
 * const safe = sanitize('<script>alert("xss")</script>Safe text')
 *
 * // Highlight code
 * const highlighted = highlightSyntax('const x = 1', 'javascript')
 * ```
 */

import DOMPurify from "isomorphic-dompurify";
import { marked, type Tokens, Renderer } from "marked";
import hljs from "highlight.js";

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface MarkdownOptions {
  /** Enable GitHub Flavored Markdown */
  gfm?: boolean;
  /** Convert \n to <br> */
  breaks?: boolean;
  /** Enable syntax highlighting */
  highlight?: boolean;
  /** Enable line numbers in code blocks */
  lineNumbers?: boolean;
  /** Enable emoji shortcode conversion */
  emojis?: boolean;
  /** Custom CSS class prefix for highlighting */
  classPrefix?: string;
}

export interface SanitizeOptions {
  /** Additional allowed tags */
  allowTags?: string[];
  /** Additional allowed attributes */
  allowAttrs?: string[];
  /** Allow data-* attributes */
  allowDataAttrs?: boolean;
  /** Allow target="_blank" on links */
  allowTargetBlank?: boolean;
}

export interface CodeHighlightResult {
  html: string;
  language: string;
  relevance: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default allowed HTML tags for sanitization
 */
const DEFAULT_ALLOWED_TAGS = [
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "ins",
  "mark",
  "small",
  "sub",
  "sup",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "pre",
  "code",
  "kbd",
  "samp",
  "blockquote",
  "q",
  "cite",
  "a",
  "span",
  "div",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
];

/**
 * Default allowed attributes for sanitization
 */
const DEFAULT_ALLOWED_ATTRS = [
  "href",
  "title",
  "class",
  "id",
  "rel",
  "target",
  "colspan",
  "rowspan",
  "scope",
];

/**
 * Languages supported for syntax highlighting
 */
export const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "go",
  "rust",
  "java",
  "c",
  "cpp",
  "csharp",
  "html",
  "css",
  "scss",
  "less",
  "sql",
  "bash",
  "shell",
  "json",
  "yaml",
  "xml",
  "markdown",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "scala",
  "haskell",
  "elixir",
  "erlang",
  "clojure",
  "r",
  "lua",
  "perl",
  "dockerfile",
  "graphql",
  "prisma",
  "toml",
  "ini",
  "diff",
  "plaintext",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Common emoji shortcodes for quick lookup
 */
const COMMON_EMOJIS: Record<string, string> = {
  ":smile:": "\u{1F604}",
  ":thumbsup:": "\u{1F44D}",
  ":thumbsdown:": "\u{1F44E}",
  ":heart:": "\u{2764}\u{FE0F}",
  ":fire:": "\u{1F525}",
  ":rocket:": "\u{1F680}",
  ":star:": "\u{2B50}",
  ":check:": "\u{2705}",
  ":x:": "\u{274C}",
  ":warning:": "\u{26A0}\u{FE0F}",
  ":info:": "\u{2139}\u{FE0F}",
  ":question:": "\u{2753}",
  ":exclamation:": "\u{2757}",
  ":bug:": "\u{1F41B}",
  ":gear:": "\u{2699}\u{FE0F}",
  ":lock:": "\u{1F512}",
  ":key:": "\u{1F511}",
  ":bulb:": "\u{1F4A1}",
  ":memo:": "\u{1F4DD}",
  ":link:": "\u{1F517}",
  ":tada:": "\u{1F389}",
  ":100:": "\u{1F4AF}",
  ":ok_hand:": "\u{1F44C}",
  ":wave:": "\u{1F44B}",
  ":clap:": "\u{1F44F}",
  ":muscle:": "\u{1F4AA}",
  ":pray:": "\u{1F64F}",
  ":thinking:": "\u{1F914}",
  ":rofl:": "\u{1F923}",
  ":joy:": "\u{1F602}",
  ":cry:": "\u{1F622}",
  ":angry:": "\u{1F620}",
  ":coffee:": "\u{2615}",
  ":beer:": "\u{1F37A}",
  ":pizza:": "\u{1F355}",
  ":+1:": "\u{1F44D}",
  ":-1:": "\u{1F44E}",
};

// ============================================================================
// MARKDOWN FORMATTING
// ============================================================================

/**
 * Format markdown content to safe HTML
 *
 * @param content - Markdown content to format
 * @param options - Formatting options
 * @returns Sanitized HTML string
 *
 * @example
 * ```typescript
 * const html = formatMarkdown('# Hello\n\nThis is **bold**')
 * // Returns: <h1>Hello</h1><p>This is <strong>bold</strong></p>
 * ```
 */
export function formatMarkdown(
  content: string,
  options: MarkdownOptions = {},
): string {
  if (!content || typeof content !== "string") {
    return "";
  }

  const {
    gfm = true,
    breaks = true,
    highlight = true,
    lineNumbers = false,
    emojis = true,
    classPrefix = "hljs",
  } = options;

  try {
    // Convert emoji shortcodes if enabled
    let processedContent = content;
    if (emojis) {
      processedContent = convertEmojis(processedContent);
    }

    // Configure renderer
    const renderer = new Renderer();

    // Custom code block renderer
    renderer.code = ({ text, lang }: Tokens.Code): string => {
      const language = normalizeLanguage(lang || "plaintext");
      let codeHtml: string;

      if (highlight && lang) {
        codeHtml = highlightSyntax(text, language).html;
      } else {
        codeHtml = escapeHtml(text);
      }

      const lineNumbersHtml = lineNumbers ? generateLineNumbers(text) : "";
      return `<pre class="${classPrefix}-code-block" data-language="${language}"><code class="${classPrefix} language-${language}">${lineNumbersHtml}${codeHtml}</code></pre>`;
    };

    // Custom inline code renderer
    renderer.codespan = ({ text }: Tokens.Codespan): string => {
      return `<code class="${classPrefix}-inline">${escapeHtml(text)}</code>`;
    };

    // Custom link renderer with security
    renderer.link = ({ href, title, text }: Tokens.Link): string => {
      const safeHref = sanitizeUrl(href);
      if (!safeHref) {
        return typeof text === "string" ? text : "";
      }
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      const textContent = typeof text === "string" ? text : "";
      return `<a href="${safeHref}"${titleAttr} rel="noopener noreferrer" target="_blank">${textContent}</a>`;
    };

    // Configure marked
    marked.use({ renderer, gfm, breaks });

    // Parse markdown
    const html = marked.parse(processedContent, { async: false }) as string;

    // Sanitize output
    return sanitize(html);
  } catch (error) {
    logger.error("Failed to format markdown:", error);
    return escapeHtml(content);
  }
}

/**
 * Parse markdown to HTML without sanitization (use with caution)
 *
 * @param content - Markdown content
 * @returns HTML string (not sanitized)
 */
export function parseMarkdownRaw(content: string): string {
  if (!content || typeof content !== "string") {
    return "";
  }

  try {
    return marked.parse(content, { async: false }) as string;
  } catch {
    return escapeHtml(content);
  }
}

// ============================================================================
// HTML SANITIZATION
// ============================================================================

/**
 * Sanitize HTML to remove XSS vectors
 *
 * SECURITY: This function removes dangerous content from HTML including:
 * - <script>, <iframe>, <object>, <embed> tags
 * - javascript: URLs
 * - on* event handlers (onclick, onerror, etc.)
 *
 * @param html - HTML to sanitize
 * @param options - Sanitization options
 * @returns Sanitized HTML string
 *
 * @example
 * ```typescript
 * const safe = sanitize('<script>alert("xss")</script><p>Safe</p>')
 * // Returns: <p>Safe</p>
 * ```
 */
export function sanitize(html: string, options: SanitizeOptions = {}): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  const {
    allowTags = [],
    allowAttrs = [],
    allowDataAttrs = false,
    allowTargetBlank = true,
  } = options;

  try {
    const allowedTags = [...DEFAULT_ALLOWED_TAGS, ...allowTags];
    const allowedAttrs = [...DEFAULT_ALLOWED_ATTRS, ...allowAttrs];

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttrs,
      ALLOW_DATA_ATTR: allowDataAttrs,
      FORBID_TAGS: [
        "script",
        "style",
        "iframe",
        "object",
        "embed",
        "form",
        "input",
        "button",
      ],
      FORBID_ATTR: [
        "onerror",
        "onclick",
        "onload",
        "onmouseover",
        "onmouseout",
        "onmousedown",
        "onmouseup",
        "onkeydown",
        "onkeyup",
        "onkeypress",
        "onfocus",
        "onblur",
        "onchange",
        "onsubmit",
        "onreset",
        "onselect",
        "ondblclick",
        "oncontextmenu",
      ],
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      ADD_ATTR: allowTargetBlank ? ["target", "rel"] : undefined,
    });
  } catch (error) {
    logger.error("Failed to sanitize HTML:", error);
    return escapeHtml(html);
  }
}

/**
 * Check if a string contains potentially dangerous HTML
 *
 * @param html - HTML to check
 * @returns true if dangerous content is detected
 */
export function isDangerousHtml(html: string): boolean {
  if (!html) return false;

  const dangerousPatterns = [
    /<script\b/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /data:/i,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(html));
}

// ============================================================================
// CODE HIGHLIGHTING
// ============================================================================

/**
 * Highlight code with syntax highlighting
 *
 * @param code - Code to highlight
 * @param language - Programming language
 * @returns Highlighted HTML and metadata
 *
 * @example
 * ```typescript
 * const result = highlightSyntax('const x = 1', 'javascript')
 * // console.log(result.html) // <span class="hljs-keyword">const</span> x = ...
 * ```
 */
export function highlightSyntax(
  code: string,
  language: string,
): CodeHighlightResult {
  if (!code) {
    return { html: "", language: "plaintext", relevance: 0 };
  }

  const normalizedLang = normalizeLanguage(language);

  try {
    // Try explicit language
    if (
      normalizedLang &&
      normalizedLang !== "plaintext" &&
      hljs.getLanguage(normalizedLang)
    ) {
      const result = hljs.highlight(code, {
        language: normalizedLang,
        ignoreIllegals: true,
      });
      return {
        html: result.value,
        language: normalizedLang,
        relevance: result.relevance,
      };
    }

    // Auto-detect language
    if (!normalizedLang || normalizedLang === "plaintext") {
      return {
        html: escapeHtml(code),
        language: "plaintext",
        relevance: 0,
      };
    }

    // Fallback to auto-detection
    const autoResult = hljs.highlightAuto(code);
    return {
      html: autoResult.value,
      language: autoResult.language || "plaintext",
      relevance: autoResult.relevance,
    };
  } catch (error) {
    logger.error("Failed to highlight code:", error);
    return {
      html: escapeHtml(code),
      language: "plaintext",
      relevance: 0,
    };
  }
}

/**
 * Detect the language of a code snippet
 *
 * @param code - Code to analyze
 * @returns Detected language name
 */
export function detectLanguage(code: string): string {
  if (!code) return "plaintext";

  try {
    const result = hljs.highlightAuto(code);
    return result.language || "plaintext";
  } catch {
    return "plaintext";
  }
}

/**
 * Check if a language is supported for highlighting
 *
 * @param language - Language name to check
 * @returns true if language is supported
 */
export function isLanguageSupported(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return (
    SUPPORTED_LANGUAGES.includes(normalized as SupportedLanguage) ||
    hljs.getLanguage(normalized) !== undefined
  );
}

// ============================================================================
// EMOJI CONVERSION
// ============================================================================

/**
 * Convert emoji shortcodes to Unicode emojis
 *
 * @param content - Text containing emoji shortcodes
 * @returns Text with shortcodes replaced by emojis
 *
 * @example
 * ```typescript
 * const text = convertEmojis('Hello :smile: :thumbsup:')
 * // Returns: Hello \u{1F604} \u{1F44D}
 * ```
 */
export function convertEmojis(content: string): string {
  if (!content) return "";

  let result = content;
  for (const [shortcode, emoji] of Object.entries(COMMON_EMOJIS)) {
    result = result.split(shortcode).join(emoji);
  }

  return result;
}

/**
 * Get the Unicode emoji for a shortcode
 *
 * @param shortcode - Emoji shortcode (e.g., ':smile:')
 * @returns Unicode emoji or null if not found
 */
export function getEmoji(shortcode: string): string | null {
  return COMMON_EMOJIS[shortcode] || null;
}

/**
 * Get all supported emoji shortcodes
 *
 * @returns Array of supported shortcodes
 */
export function getSupportedEmojis(): string[] {
  return Object.keys(COMMON_EMOJIS);
}

// ============================================================================
// EXTRACTION UTILITIES
// ============================================================================

/**
 * Extract code blocks from markdown content
 *
 * @param content - Markdown content
 * @returns Array of code blocks with language and code
 */
export function extractCodeBlocks(content: string): Array<{
  language: string;
  code: string;
  startIndex: number;
  endIndex: number;
}> {
  const blocks: Array<{
    language: string;
    code: string;
    startIndex: number;
    endIndex: number;
  }> = [];

  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      language: normalizeLanguage(match[1] || "plaintext"),
      code: match[2].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return blocks;
}

/**
 * Extract mentions from content (@username format)
 *
 * @param content - Text content
 * @returns Array of mentioned usernames
 */
export function extractMentions(content: string): string[] {
  if (!content) return [];

  const regex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return Array.from(new Set(mentions));
}

/**
 * Extract URLs from content
 *
 * @param content - Text content
 * @returns Array of URLs
 */
export function extractUrls(content: string): string[] {
  if (!content) return [];

  const regex = /https?:\/\/[^\s<>"\[\]]+/gi;
  const urls = content.match(regex) || [];
  return Array.from(new Set(urls));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Escape HTML entities
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => escapeMap[char]);
}

/**
 * Unescape HTML entities
 *
 * @param text - Text to unescape
 * @returns Unescaped text
 */
export function unescapeHtml(text: string): string {
  const unescapeMap: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };
  return text.replace(
    /&(?:amp|lt|gt|quot|#39);/g,
    (entity) => unescapeMap[entity] || entity,
  );
}

/**
 * Strip all HTML tags from content
 *
 * @param html - HTML content
 * @returns Plain text without HTML tags
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Normalize language name for highlight.js
 */
function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim();

  const aliases: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    rb: "ruby",
    sh: "bash",
    zsh: "bash",
    shell: "bash",
    yml: "yaml",
    md: "markdown",
    docker: "dockerfile",
    "c++": "cpp",
    "c#": "csharp",
  };

  return aliases[normalized] || normalized || "plaintext";
}

/**
 * Sanitize URL to prevent dangerous schemes
 */
function sanitizeUrl(url: string): string | null {
  if (!url) return null;

  const trimmed = url.trim().toLowerCase();
  const dangerousPatterns = [
    /^javascript:/i,
    /^vbscript:/i,
    /^data:/i,
    /^file:/i,
    /^about:/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return null;
    }
  }

  // Allow relative URLs
  if (
    url.startsWith("/") ||
    url.startsWith("#") ||
    url.startsWith("./") ||
    url.startsWith("../")
  ) {
    return url;
  }

  // Validate absolute URLs
  try {
    const parsed = new URL(url);
    if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return null;
    }
    return url;
  } catch {
    return url; // Allow if URL parsing fails (might be relative)
  }
}

/**
 * Generate line numbers HTML for code blocks
 */
function generateLineNumbers(code: string): string {
  const lines = code.split("\n");
  const numbers = lines
    .map((_, i) => `<span class="hljs-line-number">${i + 1}</span>`)
    .join("\n");
  return `<span class="hljs-line-numbers" aria-hidden="true">${numbers}</span>`;
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  formatMarkdown,
  parseMarkdownRaw,
  sanitize,
  isDangerousHtml,
  highlightSyntax,
  detectLanguage,
  isLanguageSupported,
  convertEmojis,
  getEmoji,
  getSupportedEmojis,
  extractCodeBlocks,
  extractMentions,
  extractUrls,
  escapeHtml,
  unescapeHtml,
  stripHtml,
  SUPPORTED_LANGUAGES,
};
