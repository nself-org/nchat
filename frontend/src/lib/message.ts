/**
 * Message Utilities
 *
 * Utilities for parsing and processing chat message content
 */

// ============================================================================
// Types
// ============================================================================

export interface ParsedMention {
  type: "user" | "channel" | "everyone" | "here";
  id?: string;
  raw: string;
  display: string;
  start: number;
  end: number;
}

export interface ParsedLink {
  url: string;
  text: string;
  start: number;
  end: number;
  isAutolinked: boolean;
}

export interface ParsedEmoji {
  shortcode: string;
  unicode?: string;
  custom?: boolean;
  url?: string;
  start: number;
  end: number;
}

export interface ParsedMessageContent {
  text: string;
  mentions: ParsedMention[];
  links: ParsedLink[];
  emojis: ParsedEmoji[];
}

// ============================================================================
// Regex Patterns
// ============================================================================

// Mentions: @username, @channel-name, @everyone, @here
const MENTION_REGEX = /@(everyone|here|[\w-]+)/gi;

// User mention with ID: <@U123456>
const USER_MENTION_ID_REGEX = /<@(U[A-Z0-9]+)(?:\|([^>]+))?>/gi;

// Channel mention: <#C123456|channel-name>
const CHANNEL_MENTION_REGEX = /<#(C[A-Z0-9]+)(?:\|([^>]+))?>/gi;

// Links: both markdown and raw URLs
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/gi;
const URL_REGEX = /https?:\/\/[^\s<>[\]()'"]+/gi;

// Emoji: :shortcode:
const EMOJI_REGEX = /:([a-z0-9_+-]+):/gi;

// ============================================================================
// Mention Extraction
// ============================================================================

/**
 * Extract all mentions from message content
 */
export function extractMentions(content: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];

  // Extract @everyone and @here mentions
  let match: RegExpExecArray | null;
  const mentionRegex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags);

  while ((match = mentionRegex.exec(content)) !== null) {
    const value = match[1].toLowerCase();

    if (value === "everyone") {
      mentions.push({
        type: "everyone",
        raw: match[0],
        display: "@everyone",
        start: match.index,
        end: match.index + match[0].length,
      });
    } else if (value === "here") {
      mentions.push({
        type: "here",
        raw: match[0],
        display: "@here",
        start: match.index,
        end: match.index + match[0].length,
      });
    } else {
      mentions.push({
        type: "user",
        raw: match[0],
        display: `@${match[1]}`,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Extract Slack-style user mentions: <@U123456>
  const userIdRegex = new RegExp(
    USER_MENTION_ID_REGEX.source,
    USER_MENTION_ID_REGEX.flags,
  );

  while ((match = userIdRegex.exec(content)) !== null) {
    mentions.push({
      type: "user",
      id: match[1],
      raw: match[0],
      display: match[2] ? `@${match[2]}` : `@${match[1]}`,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Extract channel mentions: <#C123456|channel-name>
  const channelRegex = new RegExp(
    CHANNEL_MENTION_REGEX.source,
    CHANNEL_MENTION_REGEX.flags,
  );

  while ((match = channelRegex.exec(content)) !== null) {
    mentions.push({
      type: "channel",
      id: match[1],
      raw: match[0],
      display: match[2] ? `#${match[2]}` : `#${match[1]}`,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Sort by position
  return mentions.sort((a, b) => a.start - b.start);
}

/**
 * Check if content contains mentions for a specific user
 */
export function hasMention(content: string, userId: string): boolean {
  const mentions = extractMentions(content);
  return mentions.some(
    (m) =>
      (m.type === "user" && m.id === userId) ||
      m.type === "everyone" ||
      m.type === "here",
  );
}

// ============================================================================
// Link Extraction
// ============================================================================

/**
 * Extract all links from message content
 */
export function extractLinks(content: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  const processedRanges: { start: number; end: number }[] = [];

  // First, extract markdown links [text](url)
  let match: RegExpExecArray | null;
  const mdLinkRegex = new RegExp(
    MARKDOWN_LINK_REGEX.source,
    MARKDOWN_LINK_REGEX.flags,
  );

  while ((match = mdLinkRegex.exec(content)) !== null) {
    links.push({
      url: match[2],
      text: match[1],
      start: match.index,
      end: match.index + match[0].length,
      isAutolinked: false,
    });
    processedRanges.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Then extract raw URLs, excluding those inside markdown links
  const urlRegex = new RegExp(URL_REGEX.source, URL_REGEX.flags);

  while ((match = urlRegex.exec(content)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;

    // Check if this URL is inside a markdown link
    const isInsideMarkdown = processedRanges.some(
      (range) => start >= range.start && end <= range.end,
    );

    if (!isInsideMarkdown) {
      links.push({
        url: match[0],
        text: match[0],
        start,
        end,
        isAutolinked: true,
      });
    }
  }

  // Sort by position
  return links.sort((a, b) => a.start - b.start);
}

/**
 * Check if a URL is an image URL
 */
export function isImageUrl(url: string): boolean {
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
    ".ico",
  ];
  const urlLower = url.toLowerCase();
  return imageExtensions.some((ext) => urlLower.includes(ext));
}

/**
 * Check if a URL is a video URL
 */
export function isVideoUrl(url: string): boolean {
  const videoPatterns = [
    /youtube\.com\/watch/i,
    /youtu\.be\//i,
    /vimeo\.com\//i,
    /\.mp4$/i,
    /\.webm$/i,
    /\.mov$/i,
  ];
  return videoPatterns.some((pattern) => pattern.test(url));
}

// ============================================================================
// Emoji Extraction
// ============================================================================

/**
 * Extract all emoji shortcodes from content
 */
export function extractEmojis(content: string): ParsedEmoji[] {
  const emojis: ParsedEmoji[] = [];
  let match: RegExpExecArray | null;
  const emojiRegex = new RegExp(EMOJI_REGEX.source, EMOJI_REGEX.flags);

  while ((match = emojiRegex.exec(content)) !== null) {
    emojis.push({
      shortcode: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return emojis;
}

// ============================================================================
// Content Parsing
// ============================================================================

/**
 * Parse message content and extract all metadata
 */
export function parseMessageContent(content: string): ParsedMessageContent {
  return {
    text: content,
    mentions: extractMentions(content),
    links: extractLinks(content),
    emojis: extractEmojis(content),
  };
}

// ============================================================================
// HTML Sanitization
// ============================================================================

/**
 * Basic HTML entity encoding
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * Sanitize HTML content, removing dangerous tags and attributes
 * For production, use a library like DOMPurify
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let sanitized = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );

  // Remove on* event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: URLs (except for images)
  sanitized = sanitized.replace(/data:(?!image\/)/gi, "");

  // Remove iframe, object, embed, form
  sanitized = sanitized.replace(
    /<(iframe|object|embed|form)[^>]*>.*?<\/\1>/gi,
    "",
  );
  sanitized = sanitized.replace(/<(iframe|object|embed|form)[^>]*\/?>/gi, "");

  // Remove style tags
  sanitized = sanitized.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    "",
  );

  // Remove link tags
  sanitized = sanitized.replace(/<link[^>]*\/?>/gi, "");

  return sanitized;
}

/**
 * Strip all HTML tags from content
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

// ============================================================================
// Message Formatting
// ============================================================================

/**
 * Truncate message content for preview
 */
export function truncateMessage(
  content: string,
  maxLength: number = 100,
): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength - 3) + "...";
}

/**
 * Convert plain text to basic HTML (newlines to <br>, escape HTML)
 */
export function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

/**
 * Get a plain text preview of message content
 */
export function getMessagePreview(
  content: string,
  maxLength: number = 100,
): string {
  // Strip HTML if present
  let preview = stripHtml(content);

  // Replace newlines with spaces
  preview = preview.replace(/\n+/g, " ");

  // Normalize whitespace
  preview = preview.replace(/\s+/g, " ").trim();

  return truncateMessage(preview, maxLength);
}
