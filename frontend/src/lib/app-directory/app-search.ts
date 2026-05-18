/**
 * App Search - Search functionality for the nchat app marketplace
 *
 * Provides filtering, sorting, and search capabilities for apps
 */

import type {
  App,
  AppSearchParams,
  AppSearchResult,
  AppFilters,
  AppType,
  AppPricing,
} from "./app-types";
import { getAllApps } from "./app-registry";

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_FILTERS: AppFilters = {
  categories: [],
  types: [],
  pricing: [],
  minRating: 0,
  verified: false,
  featured: false,
};

export const DEFAULT_SEARCH_PARAMS: AppSearchParams = {
  query: "",
  categories: [],
  types: [],
  pricing: [],
  minRating: 0,
  sortBy: "relevance",
  sortOrder: "desc",
  page: 1,
  limit: 20,
};

// ============================================================================
// Search Implementation
// ============================================================================

/**
 * Calculate relevance score for an app based on search query
 */
function calculateRelevanceScore(app: App, query: string): number {
  if (!query) return 0;

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  let score = 0;

  // Exact name match (highest priority)
  if (app.name.toLowerCase() === queryLower) {
    score += 100;
  }

  // Name starts with query
  if (app.name.toLowerCase().startsWith(queryLower)) {
    score += 50;
  }

  // Name contains query
  if (app.name.toLowerCase().includes(queryLower)) {
    score += 30;
  }

  // Slug match
  if (app.slug.includes(queryLower)) {
    score += 20;
  }

  // Short description match
  if (app.shortDescription.toLowerCase().includes(queryLower)) {
    score += 15;
  }

  // Tag match
  app.tags.forEach((tag) => {
    if (tag.name.toLowerCase().includes(queryLower)) {
      score += 10;
    }
  });

  // Category match
  app.categories.forEach((category) => {
    if (category.name.toLowerCase().includes(queryLower)) {
      score += 8;
    }
  });

  // Long description match
  if (app.longDescription.toLowerCase().includes(queryLower)) {
    score += 5;
  }

  // Feature match
  app.features.forEach((feature) => {
    if (feature.toLowerCase().includes(queryLower)) {
      score += 3;
    }
  });

  // Word-by-word matching for multi-word queries
  queryWords.forEach((word) => {
    if (word.length < 3) return; // Skip short words
    if (app.name.toLowerCase().includes(word)) score += 5;
    if (app.shortDescription.toLowerCase().includes(word)) score += 2;
  });

  // Boost for verified and featured apps
  if (app.verified) score += 5;
  if (app.featured) score += 3;

  return score;
}

/**
 * Filter apps based on search parameters
 */
function filterApps(apps: App[], params: AppSearchParams): App[] {
  return apps.filter((app) => {
    // Category filter
    if (params.categories && params.categories.length > 0) {
      const hasCategory = app.categories.some((cat) =>
        params.categories!.includes(cat.id),
      );
      if (!hasCategory) return false;
    }

    // Type filter
    if (params.types && params.types.length > 0) {
      if (!params.types.includes(app.type)) return false;
    }

    // Pricing filter
    if (params.pricing && params.pricing.length > 0) {
      if (!params.pricing.includes(app.pricing)) return false;
    }

    // Minimum rating filter
    if (params.minRating && params.minRating > 0) {
      if (app.stats.rating < params.minRating) return false;
    }

    // Query filter
    if (params.query && params.query.trim()) {
      const relevance = calculateRelevanceScore(app, params.query);
      if (relevance === 0) return false;
    }

    // Only active apps
    if (app.status !== "active") return false;

    // Only public apps
    if (app.visibility !== "public") return false;

    return true;
  });
}

/**
 * Sort apps based on sort parameters
 */
function sortApps(
  apps: App[],
  sortBy: AppSearchParams["sortBy"],
  sortOrder: AppSearchParams["sortOrder"],
  query?: string,
): App[] {
  const sorted = [...apps];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "relevance":
        if (query) {
          const scoreA = calculateRelevanceScore(a, query);
          const scoreB = calculateRelevanceScore(b, query);
          comparison = scoreB - scoreA;
        } else {
          // Fall back to popularity when no query
          comparison = b.stats.activeInstalls - a.stats.activeInstalls;
        }
        break;

      case "popular":
        comparison = b.stats.activeInstalls - a.stats.activeInstalls;
        break;

      case "rating":
        // Consider both rating and number of ratings
        const weightedA = a.stats.rating * Math.log10(a.stats.ratingCount + 1);
        const weightedB = b.stats.rating * Math.log10(b.stats.ratingCount + 1);
        comparison = weightedB - weightedA;
        break;

      case "recent":
        comparison =
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        break;

      case "name":
        comparison = a.name.localeCompare(b.name);
        break;

      default:
        comparison = 0;
    }

    return sortOrder === "desc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Calculate facets for the current search results
 */
function calculateFacets(apps: App[]): AppSearchResult["facets"] {
  const categories: Map<string, { id: string; name: string; count: number }> =
    new Map();
  const types: Map<AppType, number> = new Map();
  const pricing: Map<AppPricing, number> = new Map();

  apps.forEach((app) => {
    // Count categories
    app.categories.forEach((cat) => {
      const existing = categories.get(cat.id);
      if (existing) {
        existing.count++;
      } else {
        categories.set(cat.id, { id: cat.id, name: cat.name, count: 1 });
      }
    });

    // Count types
    types.set(app.type, (types.get(app.type) || 0) + 1);

    // Count pricing
    pricing.set(app.pricing, (pricing.get(app.pricing) || 0) + 1);
  });

  return {
    categories: Array.from(categories.values()).sort(
      (a, b) => b.count - a.count,
    ),
    types: Array.from(types.entries()).map(([type, count]) => ({
      type,
      count,
    })),
    pricing: Array.from(pricing.entries()).map(([pricing, count]) => ({
      pricing,
      count,
    })),
  };
}

/**
 * Search apps with full filtering, sorting, and pagination
 */
export async function searchApps(
  params: AppSearchParams = {},
): Promise<AppSearchResult> {
  const mergedParams = { ...DEFAULT_SEARCH_PARAMS, ...params };

  // Get all apps
  let apps = getAllApps();

  // Filter apps
  apps = filterApps(apps, mergedParams);

  // Calculate facets before pagination
  const facets = calculateFacets(apps);

  // Sort apps
  apps = sortApps(
    apps,
    mergedParams.sortBy,
    mergedParams.sortOrder,
    mergedParams.query,
  );

  // Calculate pagination
  const total = apps.length;
  const page = mergedParams.page || 1;
  const limit = mergedParams.limit || 20;
  const offset = (page - 1) * limit;

  // Apply pagination
  const paginatedApps = apps.slice(offset, offset + limit);

  return {
    apps: paginatedApps,
    total,
    page,
    limit,
    hasMore: offset + limit < total,
    facets,
  };
}

/**
 * Quick search for autocomplete (returns app names and IDs)
 */
export function quickSearch(
  query: string,
  limit: number = 5,
): { id: string; name: string; icon: string; type: AppType }[] {
  if (!query || query.length < 2) return [];

  const apps = getAllApps();
  const results: { app: App; score: number }[] = [];

  apps.forEach((app) => {
    if (app.status !== "active" || app.visibility !== "public") return;

    const score = calculateRelevanceScore(app, query);
    if (score > 0) {
      results.push({ app, score });
    }
  });

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ app }) => ({
      id: app.id,
      name: app.name,
      icon: app.icon,
      type: app.type,
    }));
}

/**
 * Get search suggestions based on partial query
 */
export function getSearchSuggestions(query: string): string[] {
  if (!query || query.length < 2) return [];

  const suggestions = new Set<string>();
  const queryLower = query.toLowerCase();
  const apps = getAllApps();

  apps.forEach((app) => {
    // Add app name if it matches
    if (app.name.toLowerCase().includes(queryLower)) {
      suggestions.add(app.name);
    }

    // Add matching tags
    app.tags.forEach((tag) => {
      if (tag.name.toLowerCase().includes(queryLower)) {
        suggestions.add(tag.name);
      }
    });

    // Add matching category names
    app.categories.forEach((cat) => {
      if (cat.name.toLowerCase().includes(queryLower)) {
        suggestions.add(cat.name);
      }
    });
  });

  return Array.from(suggestions).slice(0, 10);
}

/**
 * Get related apps based on an app's categories and tags
 */
export function getRelatedApps(appId: string, limit: number = 6): App[] {
  const apps = getAllApps();
  const targetApp = apps.find((a) => a.id === appId);

  if (!targetApp) return [];

  const targetCategories = new Set(targetApp.categories.map((c) => c.id));
  const targetTags = new Set(targetApp.tags.map((t) => t.id));

  const scored = apps
    .filter((app) => app.id !== appId && app.status === "active")
    .map((app) => {
      let score = 0;

      // Category overlap
      app.categories.forEach((cat) => {
        if (targetCategories.has(cat.id)) score += 10;
      });

      // Tag overlap
      app.tags.forEach((tag) => {
        if (targetTags.has(tag.id)) score += 5;
      });

      // Same type
      if (app.type === targetApp.type) score += 3;

      // Same developer
      if (app.developer.id === targetApp.developer.id) score += 2;

      return { app, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ app }) => app);
}

/**
 * Get apps similar to user's installed apps
 */
export function getRecommendedApps(
  installedAppIds: string[],
  limit: number = 10,
): App[] {
  if (installedAppIds.length === 0) {
    return getAllApps()
      .filter((a) => a.featured && a.status === "active")
      .slice(0, limit);
  }

  const allRelated: Map<string, { app: App; score: number }> = new Map();

  installedAppIds.forEach((installedId) => {
    const related = getRelatedApps(installedId, 20);
    related.forEach((app) => {
      if (installedAppIds.includes(app.id)) return;

      const existing = allRelated.get(app.id);
      if (existing) {
        existing.score += 1;
      } else {
        allRelated.set(app.id, { app, score: 1 });
      }
    });
  });

  return Array.from(allRelated.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ app }) => app);
}
