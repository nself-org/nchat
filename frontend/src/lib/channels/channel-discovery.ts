/**
 * Channel Discovery - Logic for discovering and browsing channels
 */

import type { Channel, ChannelType } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface DiscoveryFilters {
  query?: string;
  type?: ChannelType | "all";
  categoryId?: string | null;
  sortBy?: DiscoverySortOption;
  sortDirection?: "asc" | "desc";
  hasActivity?: boolean;
  memberCountMin?: number;
  memberCountMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  excludeJoined?: boolean;
  excludePrivate?: boolean;
}

export type DiscoverySortOption =
  | "name"
  | "memberCount"
  | "activity"
  | "created"
  | "trending"
  | "relevance";

export interface DiscoveryResult {
  channel: Channel;
  score: number;
  matchedFields: string[];
  isFeatured: boolean;
  isTrending: boolean;
  isNew: boolean;
}

export interface DiscoveryStats {
  totalChannels: number;
  publicChannels: number;
  privateChannels: number;
  totalMembers: number;
  activeToday: number;
  newThisWeek: number;
}

export interface TrendingScore {
  channelId: string;
  score: number;
  messageCount24h: number;
  memberGrowth24h: number;
  reactionCount24h: number;
}

// ============================================================================
// Constants
// ============================================================================

const TRENDING_WEIGHTS = {
  messages: 1.0,
  reactions: 0.5,
  members: 2.0,
  uniquePosters: 1.5,
};

const RELEVANCE_WEIGHTS = {
  nameMatch: 10,
  descriptionMatch: 5,
  topicMatch: 3,
  categoryMatch: 2,
};

const NEW_CHANNEL_DAYS = 7;
const TRENDING_WINDOW_HOURS = 24;

// ============================================================================
// Filtering Functions
// ============================================================================

export function filterChannels(
  channels: Channel[],
  filters: DiscoveryFilters,
): Channel[] {
  return channels.filter((channel) => {
    // Type filter
    if (
      filters.type &&
      filters.type !== "all" &&
      channel.type !== filters.type
    ) {
      return false;
    }

    // Exclude private channels
    if (filters.excludePrivate && channel.type === "private") {
      return false;
    }

    // Category filter
    if (
      filters.categoryId !== undefined &&
      channel.categoryId !== filters.categoryId
    ) {
      return false;
    }

    // Member count range
    if (
      filters.memberCountMin &&
      channel.memberCount < filters.memberCountMin
    ) {
      return false;
    }
    if (
      filters.memberCountMax &&
      channel.memberCount > filters.memberCountMax
    ) {
      return false;
    }

    // Date filters
    if (filters.createdAfter) {
      const createdAt = new Date(channel.createdAt);
      if (createdAt < filters.createdAfter) return false;
    }
    if (filters.createdBefore) {
      const createdAt = new Date(channel.createdAt);
      if (createdAt > filters.createdBefore) return false;
    }

    // Activity filter
    if (filters.hasActivity) {
      if (!channel.lastMessageAt) return false;
      const lastActivity = new Date(channel.lastMessageAt);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (lastActivity < dayAgo) return false;
    }

    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const matchesName = channel.name.toLowerCase().includes(query);
      const matchesDescription = channel.description
        ?.toLowerCase()
        .includes(query);
      const matchesTopic = channel.topic?.toLowerCase().includes(query);
      if (!matchesName && !matchesDescription && !matchesTopic) {
        return false;
      }
    }

    return true;
  });
}

// ============================================================================
// Sorting Functions
// ============================================================================

export function sortChannels(
  channels: Channel[],
  sortBy: DiscoverySortOption,
  direction: "asc" | "desc" = "desc",
): Channel[] {
  const sorted = [...channels];
  const multiplier = direction === "asc" ? 1 : -1;

  switch (sortBy) {
    case "name":
      return sorted.sort((a, b) => multiplier * a.name.localeCompare(b.name));

    case "memberCount":
      return sorted.sort(
        (a, b) => multiplier * (a.memberCount - b.memberCount),
      );

    case "activity":
      return sorted.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return multiplier * (aTime - bTime);
      });

    case "created":
      return sorted.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return multiplier * (aTime - bTime);
      });

    case "trending":
      // For trending, we need activity data - fall back to activity sort
      return sortChannels(channels, "activity", direction);

    case "relevance":
      // Relevance sort requires a search query - fall back to activity
      return sortChannels(channels, "activity", direction);

    default:
      return sorted;
  }
}

// ============================================================================
// Scoring Functions
// ============================================================================

export function calculateRelevanceScore(
  channel: Channel,
  query: string,
): { score: number; matchedFields: string[] } {
  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);
  let score = 0;
  const matchedFields: string[] = [];

  // Name matches
  const nameLower = channel.name.toLowerCase();
  if (nameLower === normalizedQuery) {
    score += RELEVANCE_WEIGHTS.nameMatch * 2; // Exact match bonus
    matchedFields.push("name");
  } else if (nameLower.includes(normalizedQuery)) {
    score += RELEVANCE_WEIGHTS.nameMatch;
    matchedFields.push("name");
  } else {
    const nameWordMatches = words.filter((w) => nameLower.includes(w)).length;
    if (nameWordMatches > 0) {
      score += RELEVANCE_WEIGHTS.nameMatch * (nameWordMatches / words.length);
      matchedFields.push("name");
    }
  }

  // Description matches
  if (channel.description) {
    const descLower = channel.description.toLowerCase();
    if (descLower.includes(normalizedQuery)) {
      score += RELEVANCE_WEIGHTS.descriptionMatch;
      matchedFields.push("description");
    } else {
      const descWordMatches = words.filter((w) => descLower.includes(w)).length;
      if (descWordMatches > 0) {
        score +=
          RELEVANCE_WEIGHTS.descriptionMatch * (descWordMatches / words.length);
        matchedFields.push("description");
      }
    }
  }

  // Topic matches
  if (channel.topic) {
    const topicLower = channel.topic.toLowerCase();
    if (topicLower.includes(normalizedQuery)) {
      score += RELEVANCE_WEIGHTS.topicMatch;
      matchedFields.push("topic");
    }
  }

  return { score, matchedFields };
}

export function isChannelNew(channel: Channel): boolean {
  const createdAt = new Date(channel.createdAt);
  const cutoff = new Date(Date.now() - NEW_CHANNEL_DAYS * 24 * 60 * 60 * 1000);
  return createdAt > cutoff;
}

export function isChannelActive(
  channel: Channel,
  hoursAgo: number = 24,
): boolean {
  if (!channel.lastMessageAt) return false;
  const lastActivity = new Date(channel.lastMessageAt);
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return lastActivity > cutoff;
}

// ============================================================================
// Discovery Results
// ============================================================================

export function discoverChannels(
  channels: Channel[],
  query: string,
  filters?: Omit<DiscoveryFilters, "query">,
): DiscoveryResult[] {
  // Apply filters first
  const filtered = filterChannels(channels, { ...filters, query });

  // Calculate relevance scores
  const results: DiscoveryResult[] = filtered.map((channel) => {
    const { score, matchedFields } = calculateRelevanceScore(channel, query);
    return {
      channel,
      score,
      matchedFields,
      isFeatured: channel.isDefault,
      isTrending: isChannelActive(channel, TRENDING_WINDOW_HOURS),
      isNew: isChannelNew(channel),
    };
  });

  // Sort by relevance score
  return results.sort((a, b) => b.score - a.score);
}

export function getDiscoveryResults(
  channels: Channel[],
  filters: DiscoveryFilters,
  joinedChannelIds?: Set<string>,
): DiscoveryResult[] {
  // Filter out joined channels if requested
  let filteredChannels = channels;
  if (filters.excludeJoined && joinedChannelIds) {
    filteredChannels = channels.filter((c) => !joinedChannelIds.has(c.id));
  }

  // Apply other filters
  filteredChannels = filterChannels(filteredChannels, filters);

  // If there is a query, use discovery search
  if (filters.query) {
    return discoverChannels(filteredChannels, filters.query, filters);
  }

  // Otherwise, just convert to results
  const results: DiscoveryResult[] = filteredChannels.map((channel) => ({
    channel,
    score: 0,
    matchedFields: [],
    isFeatured: channel.isDefault,
    isTrending: isChannelActive(channel, TRENDING_WINDOW_HOURS),
    isNew: isChannelNew(channel),
  }));

  // Apply sorting
  const sortBy = filters.sortBy || "activity";
  const sortDirection = filters.sortDirection || "desc";

  return results.sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1;

    switch (sortBy) {
      case "name":
        return multiplier * a.channel.name.localeCompare(b.channel.name);
      case "memberCount":
        return multiplier * (a.channel.memberCount - b.channel.memberCount);
      case "activity":
        const aTime = a.channel.lastMessageAt
          ? new Date(a.channel.lastMessageAt).getTime()
          : 0;
        const bTime = b.channel.lastMessageAt
          ? new Date(b.channel.lastMessageAt).getTime()
          : 0;
        return multiplier * (aTime - bTime);
      case "created":
        return (
          multiplier *
          (new Date(a.channel.createdAt).getTime() -
            new Date(b.channel.createdAt).getTime())
        );
      case "trending":
        // Prioritize trending channels
        if (a.isTrending && !b.isTrending) return -1;
        if (!a.isTrending && b.isTrending) return 1;
        return multiplier * (a.channel.memberCount - b.channel.memberCount);
      default:
        return 0;
    }
  });
}

// ============================================================================
// Stats and Analytics
// ============================================================================

export function calculateDiscoveryStats(channels: Channel[]): DiscoveryStats {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const publicChannels = channels.filter((c) => c.type === "public");
  const privateChannels = channels.filter((c) => c.type === "private");
  const activeToday = channels.filter((c) => isChannelActive(c, 24));
  const newThisWeek = channels.filter((c) => new Date(c.createdAt) > weekAgo);

  return {
    totalChannels: channels.length,
    publicChannels: publicChannels.length,
    privateChannels: privateChannels.length,
    totalMembers: channels.reduce((sum, c) => sum + c.memberCount, 0),
    activeToday: activeToday.length,
    newThisWeek: newThisWeek.length,
  };
}

// ============================================================================
// Category-based Discovery
// ============================================================================

export function getChannelsByCategory(
  channels: Channel[],
): Map<string | null, Channel[]> {
  const byCategory = new Map<string | null, Channel[]>();

  channels.forEach((channel) => {
    const categoryId = channel.categoryId;
    if (!byCategory.has(categoryId)) {
      byCategory.set(categoryId, []);
    }
    byCategory.get(categoryId)!.push(channel);
  });

  return byCategory;
}

export function getFeaturedChannels(channels: Channel[]): Channel[] {
  return channels
    .filter((c) => c.isDefault || c.memberCount > 10)
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 6);
}

export function getPopularChannels(
  channels: Channel[],
  limit: number = 10,
): Channel[] {
  return [...channels]
    .filter((c) => c.type === "public")
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, limit);
}

export function getRecentlyActiveChannels(
  channels: Channel[],
  limit: number = 10,
): Channel[] {
  return [...channels]
    .filter((c) => c.lastMessageAt)
    .sort((a, b) => {
      const aTime = new Date(a.lastMessageAt!).getTime();
      const bTime = new Date(b.lastMessageAt!).getTime();
      return bTime - aTime;
    })
    .slice(0, limit);
}

export function getNewChannels(
  channels: Channel[],
  limit: number = 10,
): Channel[] {
  return channels.filter(isChannelNew).slice(0, limit);
}
