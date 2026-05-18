/**
 * DM Search - Search functionality for direct messages
 *
 * Provides client-side search and filtering for DM conversations
 */

import type {
  DirectMessage,
  DMMessage,
  DMSearchResult,
  DMSearchOptions,
  DMSearchHighlight,
  DMMessageType,
  DMParticipant,
} from "./dm-types";
import { getOtherParticipants } from "./dm-manager";

// ============================================================================
// Types
// ============================================================================

export interface SearchIndex {
  dmId: string;
  messageId: string;
  content: string;
  userId: string;
  userName: string;
  timestamp: string;
  type: DMMessageType;
  hasAttachment: boolean;
  attachmentNames: string[];
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search within DM messages (client-side)
 */
export function searchDMMessages(
  messages: DMMessage[],
  query: string,
  options: Partial<DMSearchOptions> = {},
): DMMessage[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return messages;
  }

  let filtered = messages;

  // Filter by user
  if (options.fromUserId) {
    filtered = filtered.filter((m) => m.userId === options.fromUserId);
  }

  // Filter by message type
  if (options.messageTypes && options.messageTypes.length > 0) {
    filtered = filtered.filter((m) => options.messageTypes!.includes(m.type));
  }

  // Filter by attachment
  if (options.hasAttachment !== undefined) {
    filtered = filtered.filter((m) => {
      const hasAtt = m.attachments && m.attachments.length > 0;
      return options.hasAttachment ? hasAtt : !hasAtt;
    });
  }

  // Filter by date range
  if (options.dateFrom) {
    const dateFrom = new Date(options.dateFrom);
    filtered = filtered.filter((m) => new Date(m.createdAt) >= dateFrom);
  }

  if (options.dateTo) {
    const dateTo = new Date(options.dateTo);
    filtered = filtered.filter((m) => new Date(m.createdAt) <= dateTo);
  }

  // Search content
  filtered = filtered.filter((m) => {
    // Search message content
    if (m.content.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Search attachment file names
    if (m.attachments) {
      return m.attachments.some((a) =>
        a.fileName.toLowerCase().includes(normalizedQuery),
      );
    }

    return false;
  });

  // Sort by relevance (most recent first)
  return filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Search across all DMs (conversations)
 */
export function searchDMConversations(
  dms: DirectMessage[],
  query: string,
  currentUserId: string,
): DirectMessage[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return dms;
  }

  return dms.filter((dm) => {
    // Search DM name
    if (dm.name?.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Search participant names
    const others = getOtherParticipants(dm, currentUserId);
    if (
      others.some(
        (p) =>
          p.user.displayName?.toLowerCase().includes(normalizedQuery) ||
          p.user.username.toLowerCase().includes(normalizedQuery),
      )
    ) {
      return true;
    }

    // Search last message preview
    if (dm.lastMessagePreview?.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    return false;
  });
}

/**
 * Generate search highlights for a message
 */
export function generateHighlights(
  message: DMMessage,
  query: string,
): DMSearchHighlight[] {
  const highlights: DMSearchHighlight[] = [];
  const normalizedQuery = query.toLowerCase();

  // Highlight in content
  const contentPositions = findQueryPositions(message.content, normalizedQuery);
  if (contentPositions.length > 0) {
    highlights.push({
      messageId: message.id,
      field: "content",
      fragment: extractFragment(message.content, contentPositions[0], 100),
      positions: contentPositions,
    });
  }

  // Highlight in attachment names
  message.attachments?.forEach((attachment) => {
    const namePositions = findQueryPositions(
      attachment.fileName,
      normalizedQuery,
    );
    if (namePositions.length > 0) {
      highlights.push({
        messageId: message.id,
        field: "fileName",
        fragment: attachment.fileName,
        positions: namePositions,
      });
    }
  });

  return highlights;
}

/**
 * Find all positions of a query in text
 */
function findQueryPositions(
  text: string,
  query: string,
): Array<{ start: number; end: number }> {
  const positions: Array<{ start: number; end: number }> = [];
  const normalizedText = text.toLowerCase();
  let lastIndex = 0;

  while (true) {
    const index = normalizedText.indexOf(query, lastIndex);
    if (index === -1) break;
    positions.push({ start: index, end: index + query.length });
    lastIndex = index + 1;
  }

  return positions;
}

/**
 * Extract a fragment around a match position
 */
function extractFragment(
  text: string,
  position: { start: number; end: number },
  contextLength: number,
): string {
  const halfContext = Math.floor(contextLength / 2);
  const start = Math.max(0, position.start - halfContext);
  const end = Math.min(text.length, position.end + halfContext);

  let fragment = text.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) fragment = "..." + fragment;
  if (end < text.length) fragment = fragment + "...";

  return fragment;
}

/**
 * Create a full search result with highlights
 */
export function createSearchResult(
  dm: DirectMessage,
  messages: DMMessage[],
  query: string,
): DMSearchResult {
  const matchedMessages = searchDMMessages(messages, query);
  const highlights = matchedMessages.flatMap((m) =>
    generateHighlights(m, query),
  );

  return {
    dm,
    messages: matchedMessages,
    matchCount: matchedMessages.length,
    highlights,
  };
}

// ============================================================================
// Advanced Search
// ============================================================================

/**
 * Parse search query with operators
 * Supports: from:username, has:attachment, type:image, before:date, after:date
 */
export function parseSearchQuery(query: string): {
  text: string;
  filters: {
    from?: string;
    hasAttachment?: boolean;
    types?: DMMessageType[];
    before?: string;
    after?: string;
  };
} {
  const filters: {
    from?: string;
    hasAttachment?: boolean;
    types?: DMMessageType[];
    before?: string;
    after?: string;
  } = {};

  let text = query;

  // from:username
  const fromMatch = text.match(/from:(\S+)/i);
  if (fromMatch) {
    filters.from = fromMatch[1];
    text = text.replace(fromMatch[0], "");
  }

  // has:attachment
  if (/has:attachment/i.test(text)) {
    filters.hasAttachment = true;
    text = text.replace(/has:attachment/gi, "");
  }

  // has:file, has:image, has:video, etc.
  const hasTypes: DMMessageType[] = [];
  const typePatterns = [
    { pattern: /has:image/gi, type: "image" as DMMessageType },
    { pattern: /has:video/gi, type: "video" as DMMessageType },
    { pattern: /has:audio/gi, type: "audio" as DMMessageType },
    { pattern: /has:file/gi, type: "file" as DMMessageType },
  ];

  typePatterns.forEach(({ pattern, type }) => {
    if (pattern.test(text)) {
      hasTypes.push(type);
      text = text.replace(pattern, "");
    }
  });

  if (hasTypes.length > 0) {
    filters.types = hasTypes;
    filters.hasAttachment = true;
  }

  // before:date
  const beforeMatch = text.match(/before:(\d{4}-\d{2}-\d{2})/i);
  if (beforeMatch) {
    filters.before = beforeMatch[1];
    text = text.replace(beforeMatch[0], "");
  }

  // after:date
  const afterMatch = text.match(/after:(\d{4}-\d{2}-\d{2})/i);
  if (afterMatch) {
    filters.after = afterMatch[1];
    text = text.replace(afterMatch[0], "");
  }

  return {
    text: text.trim(),
    filters,
  };
}

// ============================================================================
// Search Suggestions
// ============================================================================

/**
 * Get search suggestions based on recent searches and participants
 */
export function getSearchSuggestions(
  dms: DirectMessage[],
  currentUserId: string,
  recentSearches: string[] = [],
  limit: number = 5,
): string[] {
  const suggestions: string[] = [];

  // Add recent searches
  suggestions.push(...recentSearches.slice(0, 3));

  // Add participant names as suggestions
  const participantNames = new Set<string>();
  dms.forEach((dm) => {
    const others = getOtherParticipants(dm, currentUserId);
    others.forEach((p) => {
      participantNames.add(p.user.displayName || p.user.username);
    });
  });

  suggestions.push(
    ...Array.from(participantNames)
      .slice(0, limit - suggestions.length)
      .map((name) => `from:${name}`),
  );

  // Add search operators as hints
  if (suggestions.length < limit) {
    suggestions.push("has:attachment");
  }

  return suggestions.slice(0, limit);
}

// ============================================================================
// Indexing (for full-text search)
// ============================================================================

/**
 * Build search index from messages
 */
export function buildSearchIndex(
  dmId: string,
  messages: DMMessage[],
): SearchIndex[] {
  return messages.map((message) => ({
    dmId,
    messageId: message.id,
    content: message.content.toLowerCase(),
    userId: message.userId,
    userName: (message.user.displayName || message.user.username).toLowerCase(),
    timestamp: message.createdAt,
    type: message.type,
    hasAttachment: message.attachments && message.attachments.length > 0,
    attachmentNames:
      message.attachments?.map((a) => a.fileName.toLowerCase()) || [],
  }));
}

/**
 * Search using index (faster for large datasets)
 */
export function searchIndex(
  index: SearchIndex[],
  query: string,
  options: Partial<DMSearchOptions> = {},
): SearchIndex[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return index;
  }

  let results = index;

  // Apply filters
  if (options.dmId) {
    results = results.filter((i) => i.dmId === options.dmId);
  }

  if (options.fromUserId) {
    results = results.filter((i) => i.userId === options.fromUserId);
  }

  if (options.messageTypes && options.messageTypes.length > 0) {
    results = results.filter((i) => options.messageTypes!.includes(i.type));
  }

  if (options.hasAttachment !== undefined) {
    results = results.filter((i) =>
      options.hasAttachment ? i.hasAttachment : !i.hasAttachment,
    );
  }

  if (options.dateFrom) {
    results = results.filter((i) => i.timestamp >= options.dateFrom!);
  }

  if (options.dateTo) {
    results = results.filter((i) => i.timestamp <= options.dateTo!);
  }

  // Search content and attachment names
  results = results.filter(
    (i) =>
      i.content.includes(normalizedQuery) ||
      i.attachmentNames.some((name) => name.includes(normalizedQuery)),
  );

  // Pagination
  const offset = options.offset || 0;
  const limit = options.limit || 50;

  return results.slice(offset, offset + limit);
}
