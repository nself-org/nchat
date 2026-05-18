/**
 * String utilities for nself-chat
 * @module utils/string
 */

/**
 * Truncate options
 */
export interface TruncateOptions {
  /** Maximum length (default: 50) */
  length?: number;
  /** String to append when truncated (default: '...') */
  ellipsis?: string;
  /** Truncate at word boundary (default: true) */
  wordBoundary?: boolean;
  /** Position: 'end', 'middle', or 'start' (default: 'end') */
  position?: "end" | "middle" | "start";
}

/**
 * Truncate a string to a maximum length
 * @param str - String to truncate
 * @param options - Truncation options
 * @returns Truncated string
 * @example
 * truncate('Hello, World!', { length: 8 }) // "Hello..."
 * truncate('Hello, World!', { length: 8, position: 'middle' }) // "Hel...d!"
 */
export function truncate(str: string, options: TruncateOptions = {}): string {
  const {
    length = 50,
    ellipsis = "...",
    wordBoundary = true,
    position = "end",
  } = options;

  if (!str || str.length <= length) {
    return str || "";
  }

  const availableLength = length - ellipsis.length;

  if (availableLength <= 0) {
    return ellipsis.slice(0, length);
  }

  switch (position) {
    case "start": {
      const result = str.slice(-availableLength);
      return ellipsis + result;
    }

    case "middle": {
      const halfLength = Math.floor(availableLength / 2);
      const start = str.slice(0, halfLength);
      const end = str.slice(-(availableLength - halfLength));
      return start + ellipsis + end;
    }

    case "end":
    default: {
      let result = str.slice(0, availableLength);

      if (wordBoundary) {
        const lastSpace = result.lastIndexOf(" ");
        if (lastSpace > availableLength * 0.5) {
          result = result.slice(0, lastSpace);
        }
      }

      return result.trimEnd() + ellipsis;
    }
  }
}

/**
 * Slugify options
 */
export interface SlugifyOptions {
  /** Separator character (default: '-') */
  separator?: string;
  /** Convert to lowercase (default: true) */
  lowercase?: boolean;
  /** Remove leading/trailing separators (default: true) */
  trim?: boolean;
  /** Maximum length */
  maxLength?: number;
}

/**
 * Convert a string to a URL-friendly slug
 * @param str - String to slugify
 * @param options - Slugify options
 * @returns URL-friendly slug
 * @example
 * slugify('Hello World!') // "hello-world"
 * slugify('  Multiple   Spaces  ') // "multiple-spaces"
 * slugify('CamelCase', { separator: '_' }) // "camel_case"
 */
export function slugify(str: string, options: SlugifyOptions = {}): string {
  const { separator = "-", lowercase = true, trim = true, maxLength } = options;

  if (!str) return "";

  let result = str;

  // Convert to lowercase if needed
  if (lowercase) {
    result = result.toLowerCase();
  }

  // Replace accented characters
  result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Handle camelCase and PascalCase by adding separator before capitals
  result = result.replace(/([a-z])([A-Z])/g, `$1${separator}$2`);

  // Replace non-alphanumeric characters with separator
  result = result.replace(/[^a-zA-Z0-9]+/g, separator);

  // Convert to lowercase again (for camelCase handling)
  if (lowercase) {
    result = result.toLowerCase();
  }

  // Remove multiple consecutive separators
  const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  result = result.replace(new RegExp(`${escapedSeparator}+`, "g"), separator);

  // Trim separators from start and end
  if (trim) {
    result = result.replace(
      new RegExp(`^${escapedSeparator}|${escapedSeparator}$`, "g"),
      "",
    );
  }

  // Enforce max length
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength);
    // Remove trailing separator if we cut in the middle
    result = result.replace(new RegExp(`${escapedSeparator}$`), "");
  }

  return result;
}

/**
 * Highlight matching text in a string (for search results)
 * @param text - Source text
 * @param query - Search query to highlight
 * @param options - Highlight options
 * @returns HTML string with highlighted matches
 * @example
 * highlight('Hello World', 'wor') // "Hello <mark>Wor</mark>ld"
 */
export function highlight(
  text: string,
  query: string,
  options: {
    tag?: string;
    className?: string;
    caseSensitive?: boolean;
  } = {},
): string {
  const { tag = "mark", className, caseSensitive = false } = options;

  if (!text || !query) {
    return text || "";
  }

  // Escape special regex characters in query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const flags = caseSensitive ? "g" : "gi";
  const regex = new RegExp(`(${escapedQuery})`, flags);

  const classAttr = className ? ` class="${className}"` : "";
  return text.replace(regex, `<${tag}${classAttr}>$1</${tag}>`);
}

/**
 * HTML entities map
 */
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Escape HTML special characters to prevent XSS
 * @param str - String to escape
 * @returns Escaped string safe for HTML
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Unescape HTML entities
 * @param str - String with HTML entities
 * @returns Unescaped string
 */
export function unescapeHtml(str: string): string {
  if (!str) return "";

  const reverseEntities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#x2F;": "/",
    "&#x60;": "`",
    "&#x3D;": "=",
  };

  return str.replace(
    /&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;|&#x60;|&#x3D;/g,
    (entity) => reverseEntities[entity] || entity,
  );
}

/**
 * Simple markdown parsing (for basic formatting)
 * @param text - Markdown text
 * @param options - Parse options
 * @returns HTML string
 * @example
 * parseMarkdown('**bold** and *italic*') // "<strong>bold</strong> and <em>italic</em>"
 */
export function parseMarkdown(
  text: string,
  options: {
    escapeHtml?: boolean;
    allowLinks?: boolean;
    allowImages?: boolean;
    allowCode?: boolean;
  } = {},
): string {
  const {
    escapeHtml: shouldEscape = true,
    allowLinks = true,
    allowImages = false,
    allowCode = true,
  } = options;

  if (!text) return "";

  let result = shouldEscape ? escapeHtml(text) : text;

  // Code blocks (```code```)
  if (allowCode) {
    result = result.replace(/```([^`]+)```/g, "<pre><code>$1</code></pre>");
  }

  // Inline code (`code`)
  if (allowCode) {
    result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  // Bold (**text** or __text__)
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic (*text* or _text_)
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  result = result.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Strikethrough (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // Images (![alt](url))
  if (allowImages) {
    result = result.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" />',
    );
  }

  // Links ([text](url))
  if (allowLinks) {
    result = result.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
  }

  // Line breaks
  result = result.replace(/\n/g, "<br />");

  return result;
}

/**
 * Mention pattern for @username
 */
const MENTION_REGEX = /@([a-zA-Z][a-zA-Z0-9_]{0,29})/g;

/**
 * Extract @mentions from text
 * @param text - Text to search
 * @returns Array of mentioned usernames (without @)
 * @example
 * extractMentions('Hello @john and @jane!') // ['john', 'jane']
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];

  const mentions: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const username = match[1];
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }

  return mentions;
}

/**
 * Channel pattern for #channel-name
 */
const CHANNEL_REGEX = /#([a-z][a-z0-9_-]{0,79})/gi;

/**
 * Extract #channel references from text
 * @param text - Text to search
 * @returns Array of channel names (without #)
 * @example
 * extractChannels('Check #general and #random') // ['general', 'random']
 */
export function extractChannels(text: string): string[] {
  if (!text) return [];

  const channels: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  CHANNEL_REGEX.lastIndex = 0;

  while ((match = CHANNEL_REGEX.exec(text)) !== null) {
    const channel = match[1].toLowerCase();
    if (!channels.includes(channel)) {
      channels.push(channel);
    }
  }

  return channels;
}

/**
 * URL pattern (simplified)
 */
const URL_REGEX =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

/**
 * Extract URLs from text
 * @param text - Text to search
 * @returns Array of URLs found
 * @example
 * extractUrls('Visit https://example.com or http://test.org')
 * // ['https://example.com', 'http://test.org']
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];

  const urls: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    // Remove trailing punctuation that might have been captured
    const cleanUrl = url.replace(/[.,;:!?)\]]+$/, "");
    if (!urls.includes(cleanUrl)) {
      urls.push(cleanUrl);
    }
  }

  return urls;
}

/**
 * Make URLs in text clickable
 * @param text - Text containing URLs
 * @param options - Link options
 * @returns Text with URLs wrapped in anchor tags
 */
export function linkifyUrls(
  text: string,
  options: {
    target?: string;
    rel?: string;
    className?: string;
  } = {},
): string {
  const { target = "_blank", rel = "noopener noreferrer", className } = options;

  if (!text) return "";

  const classAttr = className ? ` class="${className}"` : "";

  return text.replace(URL_REGEX, (url) => {
    const cleanUrl = url.replace(/[.,;:!?)\]]+$/, "");
    const trailing = url.slice(cleanUrl.length);
    return `<a href="${escapeHtml(cleanUrl)}" target="${target}" rel="${rel}"${classAttr}>${escapeHtml(cleanUrl)}</a>${escapeHtml(trailing)}`;
  });
}

/**
 * Capitalize the first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 * @example
 * capitalize('hello') // "Hello"
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to title case
 * @param str - String to convert
 * @returns Title cased string
 * @example
 * titleCase('hello world') // "Hello World"
 */
export function titleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Convert string to camelCase
 * @param str - String to convert
 * @returns camelCase string
 * @example
 * camelCase('hello world') // "helloWorld"
 * camelCase('hello-world') // "helloWorld"
 */
export function camelCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
}

/**
 * Convert string to kebab-case
 * @param str - String to convert
 * @returns kebab-case string
 * @example
 * kebabCase('helloWorld') // "hello-world"
 * kebabCase('Hello World') // "hello-world"
 */
export function kebabCase(str: string): string {
  return slugify(str, { separator: "-", lowercase: true });
}

/**
 * Convert string to snake_case
 * @param str - String to convert
 * @returns snake_case string
 * @example
 * snakeCase('helloWorld') // "hello_world"
 */
export function snakeCase(str: string): string {
  return slugify(str, { separator: "_", lowercase: true });
}

/**
 * Count words in a string
 * @param str - String to count words in
 * @returns Word count
 */
export function wordCount(str: string): number {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Strip HTML tags from a string
 * @param html - HTML string
 * @returns Plain text without HTML tags
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Normalize whitespace in a string
 * @param str - String to normalize
 * @returns String with normalized whitespace
 */
export function normalizeWhitespace(str: string): string {
  if (!str) return "";
  return str.replace(/\s+/g, " ").trim();
}

/**
 * Pad a string to a certain length
 * @param str - String to pad
 * @param length - Target length
 * @param char - Character to pad with (default: ' ')
 * @param position - Pad position (default: 'end')
 * @returns Padded string
 */
export function pad(
  str: string,
  length: number,
  char: string = " ",
  position: "start" | "end" | "both" = "end",
): string {
  const s = str || "";
  if (s.length >= length) return s;

  const padLength = length - s.length;
  const padChar = char[0] || " ";

  switch (position) {
    case "start":
      return padChar.repeat(padLength) + s;
    case "both": {
      const leftPad = Math.floor(padLength / 2);
      const rightPad = padLength - leftPad;
      return padChar.repeat(leftPad) + s + padChar.repeat(rightPad);
    }
    case "end":
    default:
      return s + padChar.repeat(padLength);
  }
}

/**
 * Check if a string contains another string (case-insensitive by default)
 * @param str - String to search in
 * @param search - String to search for
 * @param caseSensitive - Whether to be case-sensitive
 * @returns Whether the string contains the search term
 */
export function contains(
  str: string,
  search: string,
  caseSensitive: boolean = false,
): boolean {
  if (!str || !search) return false;
  if (caseSensitive) {
    return str.includes(search);
  }
  return str.toLowerCase().includes(search.toLowerCase());
}

/**
 * Remove diacritics/accents from a string
 * @param str - String to normalize
 * @returns String without diacritics
 * @example
 * removeDiacritics('café') // "cafe"
 */
export function removeDiacritics(str: string): string {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Create initials from a name
 * @param name - Full name
 * @param maxLength - Maximum number of initials (default: 2)
 * @returns Uppercase initials
 * @example
 * initials('John Doe') // "JD"
 * initials('John Michael Doe', 3) // "JMD"
 */
export function initials(name: string, maxLength: number = 2): string {
  if (!name) return "";

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxLength)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

/**
 * Reverse a string
 * @param str - String to reverse
 * @returns Reversed string
 */
export function reverse(str: string): string {
  if (!str) return "";
  return [...str].reverse().join("");
}

/**
 * Check if a string is a valid JSON
 * @param str - String to check
 * @returns Whether the string is valid JSON
 */
export function isValidJson(str: string): boolean {
  if (!str) return false;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a string's byte size in UTF-8
 * @param str - String to measure
 * @returns Size in bytes
 */
export function byteSize(str: string): number {
  if (!str) return 0;
  return new Blob([str]).size;
}
