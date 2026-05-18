/**
 * Mention Parser - Parses mentions from text content
 *
 * Handles parsing of:
 * - @username mentions
 * - @everyone, @here, @channel group mentions
 * - #channel mentions
 * - @role mentions
 *
 * @example
 * ```typescript
 * import { parseMentions, extractUserMentions } from '@/lib/mentions/mention-parser'
 *
 * const result = parseMentions('Hey @john, check out #general!')
 * // result.mentions = [{ type: 'user', identifier: 'john', ... }, { type: 'channel', identifier: 'general', ... }]
 * ```
 */

import type {
  ParsedMention,
  ParsedMentionResult,
  MentionType,
  MentionableUser,
  MentionableChannel,
  UserMentionData,
  ChannelMentionData,
  GroupMentionData,
} from "./mention-types";
import { isSpecialMention, SPECIAL_MENTIONS } from "./mention-types";

// ============================================================================
// Regular Expressions
// ============================================================================

/**
 * Regex to match @mentions (users, groups, roles)
 * Matches: @username, @everyone, @here, @channel
 * Does not match: @ by itself, @@ double at
 */
export const USER_MENTION_REGEX = /@([a-zA-Z0-9_-]+)/g;

/**
 * Regex to match #channel mentions
 * Matches: #channel-name, #general
 */
export const CHANNEL_MENTION_REGEX = /#([a-zA-Z0-9_-]+)/g;

/**
 * Regex to match @everyone specifically
 */
export const EVERYONE_MENTION_REGEX = /@everyone\b/gi;

/**
 * Regex to match @here specifically
 */
export const HERE_MENTION_REGEX = /@here\b/gi;

/**
 * Regex to match @channel specifically
 */
export const CHANNEL_GROUP_MENTION_REGEX = /@channel\b/gi;

/**
 * Combined regex for all mention types
 */
export const ALL_MENTIONS_REGEX = /(@[a-zA-Z0-9_-]+|#[a-zA-Z0-9_-]+)/g;

// ============================================================================
// Core Parsing Functions
// ============================================================================

/**
 * Parse all mentions from text content
 */
export function parseMentions(content: string): ParsedMentionResult {
  const mentions: ParsedMention[] = [];
  const userIds: string[] = [];
  const channelIds: string[] = [];
  const roleIds: string[] = [];
  let hasEveryone = false;
  let hasHere = false;
  let hasChannel = false;

  // Parse @mentions (users, groups)
  const userMatches = content.matchAll(USER_MENTION_REGEX);
  for (const match of userMatches) {
    const identifier = match[1];
    const lowerIdentifier = identifier.toLowerCase();

    // Check for special mentions
    if (lowerIdentifier === SPECIAL_MENTIONS.everyone) {
      hasEveryone = true;
      mentions.push({
        type: "everyone",
        raw: match[0],
        identifier: "everyone",
        start: match.index!,
        end: match.index! + match[0].length,
        data: { type: "everyone" },
      });
    } else if (lowerIdentifier === SPECIAL_MENTIONS.here) {
      hasHere = true;
      mentions.push({
        type: "here",
        raw: match[0],
        identifier: "here",
        start: match.index!,
        end: match.index! + match[0].length,
        data: { type: "here" },
      });
    } else if (lowerIdentifier === SPECIAL_MENTIONS.channel) {
      hasChannel = true;
      mentions.push({
        type: "channel",
        raw: match[0],
        identifier: "channel",
        start: match.index!,
        end: match.index! + match[0].length,
        data: { type: "channel" },
      });
    } else {
      // Regular user mention
      mentions.push({
        type: "user",
        raw: match[0],
        identifier: identifier,
        start: match.index!,
        end: match.index! + match[0].length,
      });
    }
  }

  // Parse #channel mentions
  const channelMatches = content.matchAll(CHANNEL_MENTION_REGEX);
  for (const match of channelMatches) {
    mentions.push({
      type: "channel",
      raw: match[0],
      identifier: match[1],
      start: match.index!,
      end: match.index! + match[0].length,
    });
  }

  // Sort mentions by position
  mentions.sort((a, b) => a.start - b.start);

  return {
    mentions,
    userIds,
    channelIds,
    roleIds,
    hasEveryone,
    hasHere,
    hasChannel,
  };
}

/**
 * Parse mentions and resolve them against known users and channels
 */
export function parseAndResolveMentions(
  content: string,
  users: MentionableUser[],
  channels: MentionableChannel[],
): ParsedMentionResult {
  const result = parseMentions(content);

  // Create lookup maps
  const usersByUsername = new Map(
    users.map((u) => [u.username.toLowerCase(), u]),
  );
  const channelsBySlug = new Map(
    channels.map((c) => [c.slug.toLowerCase(), c]),
  );

  // Resolve mentions
  for (const mention of result.mentions) {
    if (mention.type === "user" && !mention.data) {
      const user = usersByUsername.get(mention.identifier.toLowerCase());
      if (user) {
        mention.data = {
          type: "user",
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
        };
        if (!result.userIds.includes(user.id)) {
          result.userIds.push(user.id);
        }
      }
    } else if (mention.type === "channel" && !mention.data) {
      const channel = channelsBySlug.get(mention.identifier.toLowerCase());
      if (channel) {
        mention.data = {
          type: "channel",
          channelId: channel.id,
          channelName: channel.name,
          channelSlug: channel.slug,
        };
        if (!result.channelIds.includes(channel.id)) {
          result.channelIds.push(channel.id);
        }
      }
    }
  }

  return result;
}

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * Extract only user mentions from content
 */
export function extractUserMentions(content: string): string[] {
  const mentions: string[] = [];
  const matches = content.matchAll(USER_MENTION_REGEX);

  for (const match of matches) {
    const identifier = match[1];
    if (!isSpecialMention(identifier) && !mentions.includes(identifier)) {
      mentions.push(identifier);
    }
  }

  return mentions;
}

/**
 * Extract only channel mentions from content
 */
export function extractChannelMentions(content: string): string[] {
  const mentions: string[] = [];
  const matches = content.matchAll(CHANNEL_MENTION_REGEX);

  for (const match of matches) {
    if (!mentions.includes(match[1])) {
      mentions.push(match[1]);
    }
  }

  return mentions;
}

/**
 * Extract group mentions from content
 */
export function extractGroupMentions(content: string): {
  hasEveryone: boolean;
  hasHere: boolean;
  hasChannel: boolean;
} {
  return {
    hasEveryone: EVERYONE_MENTION_REGEX.test(content),
    hasHere: HERE_MENTION_REGEX.test(content),
    hasChannel: CHANNEL_GROUP_MENTION_REGEX.test(content),
  };
}

/**
 * Check if content contains any mentions
 */
export function containsMentions(content: string): boolean {
  return ALL_MENTIONS_REGEX.test(content);
}

/**
 * Check if content contains a specific user mention
 */
export function containsUserMention(
  content: string,
  username: string,
): boolean {
  const regex = new RegExp(`@${username}\\b`, "i");
  return regex.test(content);
}

/**
 * Check if content mentions the current user
 */
export function mentionsCurrentUser(
  content: string,
  currentUsername: string,
): boolean {
  const groupMentions = extractGroupMentions(content);
  if (
    groupMentions.hasEveryone ||
    groupMentions.hasHere ||
    groupMentions.hasChannel
  ) {
    return true;
  }
  return containsUserMention(content, currentUsername);
}

// ============================================================================
// Replacement Functions
// ============================================================================

/**
 * Replace mentions with rendered HTML/React nodes
 */
export function replaceMentionsWithHTML(
  content: string,
  users: Map<string, MentionableUser>,
  channels: Map<string, MentionableChannel>,
  options: {
    userTemplate?: (user: MentionableUser) => string;
    channelTemplate?: (channel: MentionableChannel) => string;
    groupTemplate?: (type: "everyone" | "here" | "channel") => string;
    unknownUserTemplate?: (username: string) => string;
    unknownChannelTemplate?: (channelName: string) => string;
  } = {},
): string {
  const {
    userTemplate = (u) =>
      `<span class="mention mention-user" data-user-id="${u.id}">@${u.displayName}</span>`,
    channelTemplate = (c) =>
      `<span class="mention mention-channel" data-channel-id="${c.id}">#${c.name}</span>`,
    groupTemplate = (t) =>
      `<span class="mention mention-group mention-${t}">@${t}</span>`,
    unknownUserTemplate = (u) =>
      `<span class="mention mention-user mention-unknown">@${u}</span>`,
    unknownChannelTemplate = (c) =>
      `<span class="mention mention-channel mention-unknown">#${c}</span>`,
  } = options;

  let result = content;

  // Replace group mentions first (they're more specific)
  result = result.replace(EVERYONE_MENTION_REGEX, () =>
    groupTemplate("everyone"),
  );
  result = result.replace(HERE_MENTION_REGEX, () => groupTemplate("here"));
  result = result.replace(CHANNEL_GROUP_MENTION_REGEX, () =>
    groupTemplate("channel"),
  );

  // Replace user mentions
  result = result.replace(USER_MENTION_REGEX, (match, username) => {
    // Skip if it's a group mention (already replaced)
    if (isSpecialMention(username)) {
      return match;
    }
    const user = users.get(username.toLowerCase());
    if (user) {
      return userTemplate(user);
    }
    return unknownUserTemplate(username);
  });

  // Replace channel mentions
  result = result.replace(CHANNEL_MENTION_REGEX, (match, channelSlug) => {
    const channel = channels.get(channelSlug.toLowerCase());
    if (channel) {
      return channelTemplate(channel);
    }
    return unknownChannelTemplate(channelSlug);
  });

  return result;
}

/**
 * Strip all mentions from content (for plain text)
 */
export function stripMentions(content: string): string {
  return content
    .replace(USER_MENTION_REGEX, "$1")
    .replace(CHANNEL_MENTION_REGEX, "$1");
}

/**
 * Escape content to prevent mention parsing
 */
export function escapeMentions(content: string): string {
  return content.replace(/@/g, "\\@").replace(/#/g, "\\#");
}

/**
 * Unescape previously escaped mentions
 */
export function unescapeMentions(content: string): string {
  return content.replace(/\\@/g, "@").replace(/\\#/g, "#");
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a username for mention format
 */
export function isValidMentionUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(username);
}

/**
 * Validate a channel name for mention format
 */
export function isValidMentionChannelName(channelName: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(channelName);
}

/**
 * Get mention type from raw text
 */
export function getMentionTypeFromRaw(raw: string): MentionType {
  if (raw.startsWith("#")) {
    return "channel";
  }
  const identifier = raw.slice(1).toLowerCase();
  if (identifier === "everyone") return "everyone";
  if (identifier === "here") return "here";
  if (identifier === "channel") return "channel";
  return "user";
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format a user mention string
 */
export function formatUserMention(username: string): string {
  return `@${username}`;
}

/**
 * Format a channel mention string
 */
export function formatChannelMention(channelSlug: string): string {
  return `#${channelSlug}`;
}

/**
 * Format a group mention string
 */
export function formatGroupMention(
  type: "everyone" | "here" | "channel",
): string {
  return `@${type}`;
}

/**
 * Get display text for a parsed mention
 */
export function getMentionDisplayText(mention: ParsedMention): string {
  if (mention.data) {
    if ("displayName" in mention.data) {
      return `@${mention.data.displayName}`;
    }
    if ("channelName" in mention.data) {
      return `#${mention.data.channelName}`;
    }
    return `@${mention.identifier}`;
  }
  return mention.raw;
}

// ============================================================================
// Query Parsing for Autocomplete
// ============================================================================

/**
 * Parse autocomplete query from cursor position
 */
export function parseAutocompleteQuery(
  text: string,
  cursorPosition: number,
): { trigger: "@" | "#"; query: string; start: number } | null {
  // Look backwards from cursor to find trigger
  let start = cursorPosition - 1;
  let foundTrigger: "@" | "#" | null = null;

  while (start >= 0) {
    const char = text[start];

    // Stop at whitespace or line break
    if (/\s/.test(char)) {
      break;
    }

    // Check for trigger characters
    if (char === "@" || char === "#") {
      // Make sure it's at word boundary (start of text or after whitespace)
      if (start === 0 || /\s/.test(text[start - 1])) {
        foundTrigger = char;
        break;
      }
    }

    start--;
  }

  if (!foundTrigger) {
    return null;
  }

  const query = text.slice(start + 1, cursorPosition);

  // Validate query (allow empty for showing all)
  if (query.length > 0 && !isValidMentionUsername(query)) {
    return null;
  }

  return {
    trigger: foundTrigger,
    query,
    start,
  };
}

/**
 * Check if cursor is in a mention
 */
export function isCursorInMention(
  text: string,
  cursorPosition: number,
): boolean {
  return parseAutocompleteQuery(text, cursorPosition) !== null;
}
