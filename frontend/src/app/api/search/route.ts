/**
 * Search API Route
 *
 * Provides unified search across messages, files, users, and channels using MeiliSearch.
 * Supports full-text search with operators and filters.
 *
 * @endpoint POST /api/search - Search with filters
 * @endpoint GET /api/search?q=query - Quick search
 *
 * Supported operators:
 * - from:username - filter by sender
 * - in:channel-name - filter by channel
 * - has:link - messages with links
 * - has:file - messages with attachments
 * - has:image - messages with images
 * - before:2024-01-01 - before date
 * - after:2024-01-01 - after date
 * - is:pinned - pinned messages only
 * - is:starred - starred messages only
 *
 * @example
 * ```typescript
 * // Quick search
 * const response = await fetch('/api/search?q=hello')
 *
 * // Search with operators
 * const response = await fetch('/api/search?q=project from:john in:general has:file')
 *
 * // Advanced search with filters
 * const response = await fetch('/api/search', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     query: 'project update from:john in:general',
 *     types: ['messages', 'files'],
 *     limit: 20,
 *     offset: 0
 *   })
 * })
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import {
  successResponse,
  badRequestResponse,
  paginatedResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import {
  withErrorHandler,
  withRateLimit,
  getAuthenticatedUser,
  compose,
} from "@/lib/api/middleware";
import { withCsrfProtection } from "@/lib/security/csrf";
import {
  getSearchService,
  type SearchType,
  type SearchFilters,
} from "@/services/search";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Search limits
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 200,

  // Rate limiting
  RATE_LIMIT: {
    limit: 60, // 60 searches per minute
    window: 60,
  },

  // Search types
  VALID_TYPES: ["messages", "files", "users", "channels"] as const,
};

// ============================================================================
// Types
// ============================================================================

// Local type derived from config (used for API validation)
type ApiSearchType = (typeof CONFIG.VALID_TYPES)[number];

interface SearchRequest {
  query: string;
  types?: ApiSearchType[];
  channelIds?: string[];
  userIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: "relevance" | "date";
  sortOrder?: "asc" | "desc";
}

interface SearchResultItem {
  id: string;
  type: ApiSearchType;
  title: string;
  content?: string;
  snippet?: string;
  highlight?: string;
  score?: number;
  channelId?: string;
  channelName?: string;
  userId?: string;
  userName?: string;
  avatarUrl?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface SearchResults {
  items: SearchResultItem[];
  totals: {
    messages: number;
    files: number;
    users: number;
    channels: number;
    total: number;
  };
  query: string;
  types: ApiSearchType[];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Validate search request
 */
function validateSearchRequest(
  body: unknown,
): { valid: true; request: SearchRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const data = body as Record<string, unknown>;

  // Validate query
  if (!data.query || typeof data.query !== "string") {
    return { valid: false, error: "Search query is required" };
  }

  const query = data.query.trim();

  if (query.length < CONFIG.MIN_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Query must be at least ${CONFIG.MIN_QUERY_LENGTH} characters`,
    };
  }

  if (query.length > CONFIG.MAX_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Query must be at most ${CONFIG.MAX_QUERY_LENGTH} characters`,
    };
  }

  // Validate types
  let types: ApiSearchType[] = [...CONFIG.VALID_TYPES];
  if (data.types) {
    if (!Array.isArray(data.types)) {
      return { valid: false, error: "Types must be an array" };
    }

    const invalidTypes = data.types.filter(
      (t) => !CONFIG.VALID_TYPES.includes(t as ApiSearchType),
    );
    if (invalidTypes.length > 0) {
      return {
        valid: false,
        error: `Invalid types: ${invalidTypes.join(", ")}. Valid types: ${CONFIG.VALID_TYPES.join(", ")}`,
      };
    }

    types = data.types as ApiSearchType[];
  }

  // Validate limit
  let limit = CONFIG.DEFAULT_LIMIT;
  if (data.limit !== undefined) {
    if (typeof data.limit !== "number" || data.limit < 1) {
      return { valid: false, error: "Limit must be a positive number" };
    }
    limit = Math.min(data.limit, CONFIG.MAX_LIMIT);
  }

  // Validate offset
  let offset = 0;
  if (data.offset !== undefined) {
    if (typeof data.offset !== "number" || data.offset < 0) {
      return { valid: false, error: "Offset must be a non-negative number" };
    }
    offset = data.offset;
  }

  // Validate dates
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  if (data.dateFrom) {
    if (typeof data.dateFrom !== "string" || isNaN(Date.parse(data.dateFrom))) {
      return { valid: false, error: "Invalid dateFrom format" };
    }
    dateFrom = data.dateFrom;
  }

  if (data.dateTo) {
    if (typeof data.dateTo !== "string" || isNaN(Date.parse(data.dateTo))) {
      return { valid: false, error: "Invalid dateTo format" };
    }
    dateTo = data.dateTo;
  }

  return {
    valid: true,
    request: {
      query,
      types,
      channelIds: Array.isArray(data.channelIds)
        ? (data.channelIds as string[])
        : undefined,
      userIds: Array.isArray(data.userIds)
        ? (data.userIds as string[])
        : undefined,
      dateFrom,
      dateTo,
      limit,
      offset,
      sortBy: data.sortBy === "date" ? "date" : "relevance",
      sortOrder: data.sortOrder === "asc" ? "asc" : "desc",
    },
  };
}

/**
 * Perform search across all types using MeiliSearch via SearchService
 */
async function performSearch(
  request: SearchRequest,
  userId?: string,
): Promise<SearchResults> {
  try {
    const searchService = getSearchService();

    // Build filters from request
    const filters: SearchFilters = {
      channelIds: request.channelIds,
      userIds: request.userIds,
      dateFrom: request.dateFrom,
      dateTo: request.dateTo,
    };

    // Perform search using the SearchService
    const searchResults = await searchService.search({
      query: request.query,
      types: request.types as SearchType[],
      filters,
      limit: request.limit || CONFIG.DEFAULT_LIMIT,
      offset: request.offset || 0,
      sort:
        request.sortBy === "date"
          ? [`created_at:${request.sortOrder || "desc"}`]
          : undefined,
    });

    // Convert SearchService results to API response format
    const results: SearchResultItem[] = searchResults.hits.map((hit) => {
      const doc = hit.document as Record<string, unknown>;
      const formatted = hit._formatted as Record<string, unknown> | undefined;

      switch (hit.type) {
        case "message":
          return {
            id: hit.id,
            type: "messages" as const,
            title: `Message from ${doc.author_name}`,
            content: doc.content as string,
            snippet: (formatted?.content ||
              (doc.content as string)?.slice(0, 200)) as string,
            highlight: formatted?.content as string | undefined,
            channelId: doc.channel_id as string,
            channelName: doc.channel_name as string,
            userId: doc.author_id as string,
            userName: doc.author_name as string,
            createdAt: new Date(
              (doc.created_at as number) * 1000,
            ).toISOString(),
            score: hit.score,
          };
        case "file":
          return {
            id: hit.id,
            type: "files" as const,
            title: (doc.name || doc.original_name) as string,
            content: doc.description as string | undefined,
            snippet: formatted?.description as string | undefined,
            channelId: doc.channel_id as string,
            userId: doc.uploader_id as string,
            userName: doc.uploader_name as string,
            createdAt: new Date(
              (doc.created_at as number) * 1000,
            ).toISOString(),
            metadata: {
              size: doc.size,
              mimeType: doc.mime_type,
              fileType: doc.file_type,
            },
            score: hit.score,
          };
        case "user":
          return {
            id: hit.id,
            type: "users" as const,
            title: doc.display_name as string,
            content: doc.email as string | undefined,
            snippet: formatted?.bio as string | undefined,
            avatarUrl: doc.avatar_url as string | undefined,
            createdAt: new Date(
              (doc.created_at as number) * 1000,
            ).toISOString(),
            metadata: {
              role: doc.role,
              username: doc.username,
            },
            score: hit.score,
          };
        case "channel":
          return {
            id: hit.id,
            type: "channels" as const,
            title: doc.name as string,
            content: doc.description as string | undefined,
            snippet: formatted?.description as string | undefined,
            createdAt: new Date(
              (doc.created_at as number) * 1000,
            ).toISOString(),
            metadata: {
              isPrivate: doc.is_private,
              memberCount: doc.member_count,
            },
            score: hit.score,
          };
        default: {
          // TypeScript exhaustiveness check - this should never be reached
          // Cast to base SearchHit to access common properties
          const baseHit = hit as { id: string; score?: number };
          return {
            id: baseHit.id,
            type: "messages" as const,
            title: "Unknown",
            createdAt: new Date().toISOString(),
            score: baseHit.score,
          };
        }
      }
    });

    return {
      items: results,
      totals: {
        messages: searchResults.facets?.messages || 0,
        files: searchResults.facets?.files || 0,
        users: searchResults.facets?.users || 0,
        channels: searchResults.facets?.channels || 0,
        total: searchResults.totalHits,
      },
      query: request.query,
      types: request.types || [...CONFIG.VALID_TYPES],
    };
  } catch (error) {
    logger.error("MeiliSearch search error:", error);
    captureError(error as Error, {
      tags: { api: "search", service: "meilisearch" },
      extra: { query: request.query, types: request.types },
    });

    // Re-throw to let the handler return a proper error response
    // No mock fallback - MeiliSearch is the sole search provider
    throw new Error(
      `Search service unavailable: ${error instanceof Error ? (error instanceof Error ? error.message : String(error)) : "Unknown error"}`,
    );
  }
}

// ============================================================================
// GET Handler - Quick Search
// ============================================================================

async function handleGet(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return badRequestResponse("Search query (q) is required", "MISSING_QUERY");
  }

  if (query.length < CONFIG.MIN_QUERY_LENGTH) {
    return badRequestResponse(
      `Query must be at least ${CONFIG.MIN_QUERY_LENGTH} characters`,
      "QUERY_TOO_SHORT",
    );
  }

  const user = await getAuthenticatedUser(request);

  try {
    const searchRequest: SearchRequest = {
      query,
      types: [...CONFIG.VALID_TYPES],
      limit: parseInt(
        searchParams.get("limit") || String(CONFIG.DEFAULT_LIMIT),
        10,
      ),
      offset: parseInt(searchParams.get("offset") || "0", 10),
    };

    const results = await performSearch(searchRequest, user?.id);

    return paginatedResponse(results.items, {
      total: results.totals.total,
      page:
        Math.floor(
          (searchRequest.offset || 0) /
            (searchRequest.limit || CONFIG.DEFAULT_LIMIT),
        ) + 1,
      limit: searchRequest.limit || CONFIG.DEFAULT_LIMIT,
    });
  } catch (error) {
    logger.error("Search error:", error);
    return internalErrorResponse("Search failed");
  }
}

// ============================================================================
// POST Handler - Advanced Search
// ============================================================================

async function handlePost(request: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body", "INVALID_JSON");
  }

  const validation = validateSearchRequest(body);
  if (!validation.valid) {
    return badRequestResponse(
      (validation as { valid: false; error: string }).error,
      "VALIDATION_ERROR",
    );
  }

  const user = await getAuthenticatedUser(request);

  try {
    const results = await performSearch(validation.request, user?.id);

    return successResponse({
      results: results.items,
      totals: results.totals,
      query: results.query,
      types: results.types,
      pagination: {
        total: results.totals.total,
        limit: validation.request.limit || CONFIG.DEFAULT_LIMIT,
        offset: validation.request.offset || 0,
        hasMore:
          (validation.request.offset || 0) +
            (validation.request.limit || CONFIG.DEFAULT_LIMIT) <
          results.totals.total,
      },
    });
  } catch (error) {
    logger.error("Search error:", error);
    return internalErrorResponse("Search failed");
  }
}

// ============================================================================
// Export Handlers
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit(CONFIG.RATE_LIMIT),
)(handleGet);

export const POST = compose(
  withErrorHandler,
  withCsrfProtection,
  withRateLimit(CONFIG.RATE_LIMIT),
)(handlePost);

// ============================================================================
// Route Configuration
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
