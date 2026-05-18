/**
 * Search Types for nself-chat
 *
 * Type definitions for search queries, filters, results, and search configuration.
 * Supports message search, user search, channel search, and file search.
 */

import type { UserBasicInfo } from "./user";
import type { Channel } from "./channel";
import type { Message } from "./message";
import type { Attachment } from "./attachment";

// ============================================================================
// Search Result Type Definitions
// ============================================================================

/**
 * Types of searchable entities.
 */
export type SearchResultType =
  | "message"
  | "user"
  | "channel"
  | "file"
  | "thread";

/**
 * Search scope options.
 */
export type SearchScope = "all" | "messages" | "users" | "channels" | "files";

/**
 * Search sort options.
 */
export type SearchSortBy = "relevance" | "date" | "popularity";

/**
 * Search sort order.
 */
export type SearchSortOrder = "asc" | "desc";

// ============================================================================
// Search Query Types
// ============================================================================

/**
 * Basic search query.
 */
export interface SearchQuery {
  /** Search text */
  query: string;
  /** Search scope */
  scope: SearchScope;
  /** Filters to apply */
  filters?: SearchFilters;
  /** Sort options */
  sort?: SearchSortOptions;
  /** Pagination */
  pagination?: SearchPagination;
}

/**
 * Advanced search query with operators.
 */
export interface AdvancedSearchQuery extends SearchQuery {
  /** Exact phrase to match */
  exactPhrase?: string;
  /** Words that must be included */
  includeWords?: string[];
  /** Words to exclude */
  excludeWords?: string[];
  /** Use fuzzy matching */
  fuzzy?: boolean;
  /** Fuzzy distance (1-3) */
  fuzzyDistance?: number;
  /** Highlight matches */
  highlight?: boolean;
  /** Highlight tag (for HTML) */
  highlightTag?: string;
}

/**
 * Search sort options.
 */
export interface SearchSortOptions {
  sortBy: SearchSortBy;
  sortOrder: SearchSortOrder;
}

/**
 * Search pagination options.
 */
export interface SearchPagination {
  /** Page number (1-based) */
  page: number;
  /** Results per page */
  perPage: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
}

// ============================================================================
// Search Filters Types
// ============================================================================

/**
 * Combined search filters.
 */
export interface SearchFilters {
  /** Filter by channel IDs */
  channelIds?: string[];
  /** Filter by user IDs (authors) */
  userIds?: string[];
  /** Filter by date range */
  dateRange?: DateRangeFilter;
  /** Filter by message properties */
  message?: MessageSearchFilters;
  /** Filter by file properties */
  file?: FileSearchFilters;
  /** Filter by channel properties */
  channel?: ChannelSearchFilters;
  /** Filter by user properties */
  user?: UserSearchFilters;
}

/**
 * Date range filter.
 */
export interface DateRangeFilter {
  /** Start date (inclusive) */
  from?: Date;
  /** End date (inclusive) */
  to?: Date;
  /** Relative time (e.g., 'last_7_days') */
  relative?: RelativeDateRange;
}

/**
 * Relative date range options.
 */
export type RelativeDateRange =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "last_year"
  | "this_week"
  | "this_month"
  | "this_year";

/**
 * Message-specific search filters.
 */
export interface MessageSearchFilters {
  /** Has attachments */
  hasAttachments?: boolean;
  /** Has links */
  hasLinks?: boolean;
  /** Has reactions */
  hasReactions?: boolean;
  /** Is pinned */
  isPinned?: boolean;
  /** Is in thread */
  isThreadReply?: boolean;
  /** Mentions current user */
  mentionsMe?: boolean;
  /** From bots */
  fromBots?: boolean;
  /** Message types to include */
  messageTypes?: string[];
}

/**
 * File-specific search filters.
 */
export interface FileSearchFilters {
  /** File types */
  fileTypes?: ("image" | "video" | "audio" | "document" | "other")[];
  /** File extensions */
  extensions?: string[];
  /** Min file size in bytes */
  minSize?: number;
  /** Max file size in bytes */
  maxSize?: number;
  /** Uploaded by user IDs */
  uploadedBy?: string[];
}

/**
 * Channel-specific search filters.
 */
export interface ChannelSearchFilters {
  /** Channel types */
  types?: ("public" | "private" | "direct" | "group_dm")[];
  /** Include archived channels */
  includeArchived?: boolean;
  /** Only channels user is member of */
  onlyJoined?: boolean;
  /** Has unread messages */
  hasUnread?: boolean;
}

/**
 * User-specific search filters.
 */
export interface UserSearchFilters {
  /** User roles */
  roles?: ("owner" | "admin" | "moderator" | "member" | "guest")[];
  /** Online status */
  status?: ("online" | "away" | "dnd" | "offline")[];
  /** Include bots */
  includeBots?: boolean;
  /** Include deactivated users */
  includeDeactivated?: boolean;
}

// ============================================================================
// Search Result Types
// ============================================================================

/**
 * Base search result.
 */
export interface BaseSearchResult {
  /** Result type */
  type: SearchResultType;
  /** Relevance score */
  score: number;
  /** Highlighted snippets */
  highlights?: SearchHighlight[];
}

/**
 * Search highlight.
 */
export interface SearchHighlight {
  /** Field that was matched */
  field: string;
  /** Highlighted text with markers */
  text: string;
  /** Match positions */
  positions?: { start: number; end: number }[];
}

/**
 * Message search result.
 */
export interface MessageSearchResult extends BaseSearchResult {
  type: "message";
  /** The message */
  message: Message;
  /** Channel info */
  channel: Pick<Channel, "id" | "name" | "type">;
  /** Thread info (if thread reply) */
  thread?: {
    id: string;
    rootMessagePreview: string;
  };
}

/**
 * User search result.
 */
export interface UserSearchResult extends BaseSearchResult {
  type: "user";
  /** The user */
  user: UserBasicInfo & {
    bio?: string;
    email?: string;
  };
  /** Mutual channels count */
  mutualChannelsCount?: number;
}

/**
 * Channel search result.
 */
export interface ChannelSearchResult extends BaseSearchResult {
  type: "channel";
  /** The channel */
  channel: Pick<
    Channel,
    "id" | "name" | "type" | "description" | "memberCount"
  >;
  /** Whether user is member */
  isMember: boolean;
  /** Last activity */
  lastActivityAt?: Date;
}

/**
 * File search result.
 */
export interface FileSearchResult extends BaseSearchResult {
  type: "file";
  /** The attachment */
  file: Attachment;
  /** Message the file is attached to */
  message: Pick<Message, "id" | "channelId" | "createdAt">;
  /** Channel info */
  channel: Pick<Channel, "id" | "name">;
  /** Uploader info */
  uploadedBy: UserBasicInfo;
}

/**
 * Thread search result.
 */
export interface ThreadSearchResult extends BaseSearchResult {
  type: "thread";
  /** Thread ID */
  threadId: string;
  /** Root message */
  rootMessage: Message;
  /** Reply count */
  replyCount: number;
  /** Last reply */
  lastReply?: Message;
  /** Channel info */
  channel: Pick<Channel, "id" | "name">;
}

/**
 * Union type for all search results.
 */
export type SearchResult =
  | MessageSearchResult
  | UserSearchResult
  | ChannelSearchResult
  | FileSearchResult
  | ThreadSearchResult;

// ============================================================================
// Search Response Types
// ============================================================================

/**
 * Search response.
 */
export interface SearchResponse<T extends SearchResult = SearchResult> {
  /** Search results */
  results: T[];
  /** Total results count */
  totalCount: number;
  /** Pagination info */
  pagination: SearchResponsePagination;
  /** Search metadata */
  metadata: SearchMetadata;
  /** Facets/aggregations */
  facets?: SearchFacets;
}

/**
 * Search response pagination.
 */
export interface SearchResponsePagination {
  /** Current page */
  page: number;
  /** Results per page */
  perPage: number;
  /** Total pages */
  totalPages: number;
  /** Has more results */
  hasMore: boolean;
  /** Next cursor (for cursor-based pagination) */
  nextCursor?: string;
}

/**
 * Search metadata.
 */
export interface SearchMetadata {
  /** Original query */
  query: string;
  /** Time taken in milliseconds */
  took: number;
  /** Search scope used */
  scope: SearchScope;
  /** Applied filters */
  appliedFilters: string[];
  /** Corrected query (if spell-check applied) */
  correctedQuery?: string;
  /** Search suggestions */
  suggestions?: string[];
}

/**
 * Search facets/aggregations.
 */
export interface SearchFacets {
  /** Results by type */
  byType?: { type: SearchResultType; count: number }[];
  /** Results by channel */
  byChannel?: { channelId: string; channelName: string; count: number }[];
  /** Results by user */
  byUser?: { userId: string; userName: string; count: number }[];
  /** Results by date */
  byDate?: { date: string; count: number }[];
  /** Results by file type */
  byFileType?: { fileType: string; count: number }[];
}

// ============================================================================
// Search Suggestion Types
// ============================================================================

/**
 * Search suggestion.
 */
export interface SearchSuggestion {
  /** Suggestion type */
  type: "query" | "user" | "channel" | "filter";
  /** Display text */
  text: string;
  /** Value to use */
  value: string;
  /** Icon (emoji or URL) */
  icon?: string;
  /** Description */
  description?: string;
}

/**
 * Quick search result (for instant search).
 */
export interface QuickSearchResult {
  /** Result type */
  type: SearchResultType;
  /** Display title */
  title: string;
  /** Display subtitle */
  subtitle?: string;
  /** Icon/avatar URL */
  icon?: string;
  /** Navigation URL */
  url: string;
  /** Entity ID */
  id: string;
}

/**
 * Quick search response.
 */
export interface QuickSearchResponse {
  /** Quick results by category */
  results: {
    messages: QuickSearchResult[];
    users: QuickSearchResult[];
    channels: QuickSearchResult[];
    files: QuickSearchResult[];
  };
  /** Total matches */
  totalMatches: number;
  /** Has more results */
  hasMore: boolean;
}

// ============================================================================
// Search History Types
// ============================================================================

/**
 * Search history item.
 */
export interface SearchHistoryItem {
  /** History item ID */
  id: string;
  /** Search query */
  query: string;
  /** Search scope */
  scope: SearchScope;
  /** Filters used */
  filters?: SearchFilters;
  /** When search was performed */
  searchedAt: Date;
  /** Number of results */
  resultCount: number;
}

/**
 * Saved search.
 */
export interface SavedSearch {
  /** Saved search ID */
  id: string;
  /** Display name */
  name: string;
  /** Search query */
  query: SearchQuery;
  /** Who created it */
  createdBy: string;
  /** When it was created */
  createdAt: Date;
  /** When it was last used */
  lastUsedAt?: Date;
  /** Usage count */
  usageCount: number;
}

// ============================================================================
// Search Configuration Types
// ============================================================================

/**
 * Search configuration.
 */
export interface SearchConfig {
  /** Enable search */
  enabled: boolean;
  /** Search engine type */
  engine: "postgres" | "meilisearch" | "typesense" | "elasticsearch";
  /** Minimum query length */
  minQueryLength: number;
  /** Maximum results per page */
  maxResultsPerPage: number;
  /** Enable fuzzy search */
  fuzzySearch: boolean;
  /** Enable search suggestions */
  suggestions: boolean;
  /** Enable search history */
  history: boolean;
  /** History retention days */
  historyRetentionDays: number;
  /** Enable spell check */
  spellCheck: boolean;
  /** Enable synonyms */
  synonyms: boolean;
  /** Index real-time */
  realTimeIndex: boolean;
  /** Searchable fields */
  searchableFields: {
    messages: string[];
    users: string[];
    channels: string[];
    files: string[];
  };
}

/**
 * Default search configuration.
 */
export const DefaultSearchConfig: SearchConfig = {
  enabled: true,
  engine: "postgres",
  minQueryLength: 2,
  maxResultsPerPage: 50,
  fuzzySearch: true,
  suggestions: true,
  history: true,
  historyRetentionDays: 30,
  spellCheck: false,
  synonyms: false,
  realTimeIndex: true,
  searchableFields: {
    messages: ["content"],
    users: ["username", "displayName", "email", "bio"],
    channels: ["name", "description", "topic"],
    files: ["name"],
  },
};

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Search filter preset.
 */
export interface SearchFilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: SearchFilters;
  icon?: string;
}

/**
 * Common search filter presets.
 */
export const CommonSearchPresets: SearchFilterPreset[] = [
  {
    id: "mentions",
    name: "Mentions",
    description: "Messages that mention you",
    filters: { message: { mentionsMe: true } },
    icon: "@",
  },
  {
    id: "files",
    name: "Files",
    description: "Messages with attachments",
    filters: { message: { hasAttachments: true } },
    icon: "📎",
  },
  {
    id: "links",
    name: "Links",
    description: "Messages with links",
    filters: { message: { hasLinks: true } },
    icon: "🔗",
  },
  {
    id: "pinned",
    name: "Pinned",
    description: "Pinned messages",
    filters: { message: { isPinned: true } },
    icon: "📌",
  },
  {
    id: "images",
    name: "Images",
    description: "Image files",
    filters: { file: { fileTypes: ["image"] } },
    icon: "🖼️",
  },
  {
    id: "documents",
    name: "Documents",
    description: "Document files",
    filters: { file: { fileTypes: ["document"] } },
    icon: "📄",
  },
];

/**
 * Build search URL with query parameters.
 */
export function buildSearchUrl(
  query: SearchQuery,
  baseUrl = "/search",
): string {
  const params = new URLSearchParams();
  params.set("q", query.query);
  params.set("scope", query.scope);
  if (query.filters) {
    params.set("filters", JSON.stringify(query.filters));
  }
  if (query.sort) {
    params.set("sort", `${query.sort.sortBy}:${query.sort.sortOrder}`);
  }
  if (query.pagination) {
    params.set("page", String(query.pagination.page));
    params.set("perPage", String(query.pagination.perPage));
  }
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Parse search URL into query object.
 */
export function parseSearchUrl(url: string): SearchQuery | null {
  try {
    const urlObj = new URL(url, "http://localhost");
    const q = urlObj.searchParams.get("q");
    if (!q) return null;

    const query: SearchQuery = {
      query: q,
      scope: (urlObj.searchParams.get("scope") as SearchScope) || "all",
    };

    const filters = urlObj.searchParams.get("filters");
    if (filters) {
      query.filters = JSON.parse(filters);
    }

    const sort = urlObj.searchParams.get("sort");
    if (sort) {
      const [sortBy, sortOrder] = sort.split(":");
      query.sort = {
        sortBy: sortBy as SearchSortBy,
        sortOrder: sortOrder as SearchSortOrder,
      };
    }

    const page = urlObj.searchParams.get("page");
    const perPage = urlObj.searchParams.get("perPage");
    if (page || perPage) {
      query.pagination = {
        page: page ? parseInt(page, 10) : 1,
        perPage: perPage ? parseInt(perPage, 10) : 20,
      };
    }

    return query;
  } catch {
    return null;
  }
}
