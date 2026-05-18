/**
 * Advanced Search Plugin Service
 * Client-side service for interacting with Advanced Search plugin API
 */

export interface SearchResult {
  type: "message" | "channel" | "user" | "file";
  id: string;
  content: string;
  channelId?: string;
  channelName?: string;
  userId?: string;
  userName?: string;
  timestamp?: string;
  highlights?: string[];
  relevanceScore?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  limit: number;
  offset: number;
  facets?: SearchFacets;
}

export interface SearchFacets {
  users: Array<{ id: string; name: string; count: number }>;
  channels: Array<{ id: string; name: string; count: number }>;
  types: Array<{ type: string; count: number }>;
  dates: Array<{ date: string; count: number }>;
}

export interface SearchSuggestion {
  type: "user" | "channel" | "query" | "saved";
  value: string;
  label: string;
  metadata?: Record<string, any>;
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
  query: string;
}

export interface SearchFilters {
  from?: string;
  in?: string;
  after?: string;
  before?: string;
  has?: string;
  type?: string;
}

// Semantic Search Types
export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: {
    channelIds?: string[];
    userIds?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
    types?: Array<"message" | "file" | "channel" | "user">;
  };
}

export interface SemanticSearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  semanticQuery?: string;
  processingTimeMs: number;
}

// Search History Types
export interface SearchHistoryItem {
  id: string;
  userId: string;
  query: string;
  resultCount: number;
  filters?: SearchFilters;
  searchedAt: string;
}

export interface SearchHistoryResponse {
  history: SearchHistoryItem[];
  total: number;
}

// Saved Search Types
export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: string;
  filters?: SearchFilters;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  useCount: number;
}

export interface CreateSavedSearchRequest {
  userId: string;
  name: string;
  query: string;
  filters?: SearchFilters;
}

export interface SavedSearchesResponse {
  savedSearches: SavedSearch[];
  total: number;
}

class SearchService {
  private baseUrl = "/api/plugins/search";

  async search(
    query: string,
    filters?: SearchFilters,
    limit: number = 20,
    offset: number = 0,
  ): Promise<SearchResponse> {
    const fullQuery = this.buildQuery(query, filters);
    const response = await fetch(
      `${this.baseUrl}/search?q=${encodeURIComponent(fullQuery)}&limit=${limit}&offset=${offset}`,
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getSuggestions(query: string): Promise<SearchSuggestionsResponse> {
    const response = await fetch(
      `${this.baseUrl}/suggest?q=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get suggestions: ${response.statusText}`);
    }

    return response.json();
  }

  private buildQuery(query: string, filters?: SearchFilters): string {
    if (!filters) return query;

    const parts = [query];

    if (filters.from) parts.push(`from:${filters.from}`);
    if (filters.in) parts.push(`in:${filters.in}`);
    if (filters.after) parts.push(`after:${filters.after}`);
    if (filters.before) parts.push(`before:${filters.before}`);
    if (filters.has) parts.push(`has:${filters.has}`);

    return parts.join(" ");
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.json();
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const searchService = new SearchService();
