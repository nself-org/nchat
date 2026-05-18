/**
 * Channel Discovery
 *
 * Provides functionality for discovering public channels, recommendations,
 * popular channels, and category-based filtering.
 */

// ============================================================================
// Types
// ============================================================================

export type ChannelType = "public" | "private" | "direct" | "group";

export type ChannelCategory =
  | "general"
  | "engineering"
  | "design"
  | "marketing"
  | "sales"
  | "support"
  | "social"
  | "announcements"
  | "other";

export interface ChannelInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ChannelType;
  category: ChannelCategory | null;
  memberCount: number;
  createdAt: Date;
  createdBy: string;
  isArchived: boolean;
  lastActivityAt: Date | null;
  topic: string | null;
  icon: string | null;
  color: string | null;
}

export interface DiscoverableChannel extends ChannelInfo {
  isMember: boolean;
  isRecommended: boolean;
  popularityScore: number;
  matchScore: number;
}

export interface ChannelDiscoveryOptions {
  categories?: ChannelCategory[];
  excludeJoined?: boolean;
  excludeArchived?: boolean;
  minMembers?: number;
  maxMembers?: number;
  sortBy?: ChannelSortOption;
  limit?: number;
  offset?: number;
}

export type ChannelSortOption =
  | "popular"
  | "recent"
  | "alphabetical"
  | "members"
  | "activity";

export interface ChannelRecommendationContext {
  userId: string;
  joinedChannels: string[];
  interests: string[];
  colleagues: string[];
  recentActivity: { channelId: string; timestamp: Date }[];
}

export interface ChannelDiscoveryResult {
  channels: DiscoverableChannel[];
  totalCount: number;
  hasMore: boolean;
  nextOffset: number | null;
}

export interface ChannelCategoryInfo {
  category: ChannelCategory;
  label: string;
  description: string;
  channelCount: number;
  icon: string;
}

// ============================================================================
// Constants
// ============================================================================

export const CHANNEL_CATEGORIES: Record<
  ChannelCategory,
  { label: string; description: string; icon: string }
> = {
  general: {
    label: "General",
    description: "General discussion channels",
    icon: "hash",
  },
  engineering: {
    label: "Engineering",
    description: "Technical and engineering channels",
    icon: "code",
  },
  design: {
    label: "Design",
    description: "Design and creative channels",
    icon: "palette",
  },
  marketing: {
    label: "Marketing",
    description: "Marketing and growth channels",
    icon: "megaphone",
  },
  sales: {
    label: "Sales",
    description: "Sales and business development channels",
    icon: "briefcase",
  },
  support: {
    label: "Support",
    description: "Customer support and help channels",
    icon: "life-buoy",
  },
  social: {
    label: "Social",
    description: "Social and fun channels",
    icon: "smile",
  },
  announcements: {
    label: "Announcements",
    description: "Company announcements and updates",
    icon: "bell",
  },
  other: {
    label: "Other",
    description: "Other channels",
    icon: "folder",
  },
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ============================================================================
// Channel Discovery Service
// ============================================================================

export class ChannelDiscoveryService {
  private channels: Map<string, ChannelInfo> = new Map();
  private membershipCache: Map<string, Set<string>> = new Map(); // userId -> channelIds
  private activityCache: Map<string, Date> = new Map(); // channelId -> lastActivity

  /**
   * Sets channel data for discovery
   */
  setChannels(channels: ChannelInfo[]): void {
    this.channels.clear();
    for (const channel of channels) {
      this.channels.set(channel.id, channel);
    }
  }

  /**
   * Adds or updates a single channel
   */
  addChannel(channel: ChannelInfo): void {
    this.channels.set(channel.id, channel);
  }

  /**
   * Removes a channel
   */
  removeChannel(channelId: string): void {
    this.channels.delete(channelId);
  }

  /**
   * Sets user membership data
   */
  setUserMemberships(userId: string, channelIds: string[]): void {
    this.membershipCache.set(userId, new Set(channelIds));
  }

  /**
   * Updates channel activity timestamp
   */
  updateActivity(channelId: string, timestamp: Date): void {
    this.activityCache.set(channelId, timestamp);
  }

  /**
   * Gets public channels for discovery
   */
  getPublicChannels(
    options: ChannelDiscoveryOptions = {},
  ): ChannelDiscoveryResult {
    return this.discover({
      ...options,
      types: ["public"],
    });
  }

  /**
   * Discovers channels based on options
   */
  discover(
    options: ChannelDiscoveryOptions & {
      types?: ChannelType[];
      userId?: string;
    } = {},
  ): ChannelDiscoveryResult {
    const {
      categories,
      excludeJoined = false,
      excludeArchived = true,
      minMembers,
      maxMembers,
      sortBy = "popular",
      limit = DEFAULT_LIMIT,
      offset = 0,
      types = ["public"],
      userId,
    } = options;

    const effectiveLimit = Math.min(limit, MAX_LIMIT);
    const userChannels = userId
      ? (this.membershipCache.get(userId) ?? new Set())
      : new Set<string>();

    // Filter channels
    let filtered: DiscoverableChannel[] = [];

    for (const channel of this.channels.values()) {
      // Type filter
      if (!types.includes(channel.type)) continue;

      // Archived filter
      if (excludeArchived && channel.isArchived) continue;

      // Joined filter
      if (excludeJoined && userChannels.has(channel.id)) continue;

      // Category filter
      if (categories && categories.length > 0) {
        if (!channel.category || !categories.includes(channel.category))
          continue;
      }

      // Member count filters
      if (minMembers !== undefined && channel.memberCount < minMembers)
        continue;
      if (maxMembers !== undefined && channel.memberCount > maxMembers)
        continue;

      filtered.push({
        ...channel,
        isMember: userChannels.has(channel.id),
        isRecommended: false,
        popularityScore: this.calculatePopularity(channel),
        matchScore: 0,
      });
    }

    // Sort
    filtered = this.sortChannels(filtered, sortBy);

    // Paginate
    const totalCount = filtered.length;
    const hasMore = offset + effectiveLimit < totalCount;
    const paginated = filtered.slice(offset, offset + effectiveLimit);

    return {
      channels: paginated,
      totalCount,
      hasMore,
      nextOffset: hasMore ? offset + effectiveLimit : null,
    };
  }

  /**
   * Gets recommended channels for a user
   */
  getRecommendedChannels(
    context: ChannelRecommendationContext,
    limit = 10,
  ): DiscoverableChannel[] {
    const userChannels = new Set(context.joinedChannels);
    const recommendations: DiscoverableChannel[] = [];

    for (const channel of this.channels.values()) {
      // Skip private, archived, or already joined
      if (channel.type !== "public") continue;
      if (channel.isArchived) continue;
      if (userChannels.has(channel.id)) continue;

      const matchScore = this.calculateRecommendationScore(channel, context);

      if (matchScore > 0) {
        recommendations.push({
          ...channel,
          isMember: false,
          isRecommended: true,
          popularityScore: this.calculatePopularity(channel),
          matchScore,
        });
      }
    }

    // Sort by match score
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return recommendations.slice(0, limit);
  }

  /**
   * Gets popular channels
   */
  getPopularChannels(limit = 10, userId?: string): DiscoverableChannel[] {
    const userChannels = userId
      ? (this.membershipCache.get(userId) ?? new Set())
      : new Set<string>();
    const popular: DiscoverableChannel[] = [];

    for (const channel of this.channels.values()) {
      if (channel.type !== "public" || channel.isArchived) continue;

      popular.push({
        ...channel,
        isMember: userChannels.has(channel.id),
        isRecommended: false,
        popularityScore: this.calculatePopularity(channel),
        matchScore: 0,
      });
    }

    popular.sort((a, b) => b.popularityScore - a.popularityScore);

    return popular.slice(0, limit);
  }

  /**
   * Gets recently active channels
   */
  getRecentlyActiveChannels(
    limit = 10,
    userId?: string,
  ): DiscoverableChannel[] {
    const userChannels = userId
      ? (this.membershipCache.get(userId) ?? new Set())
      : new Set<string>();
    const recent: DiscoverableChannel[] = [];

    for (const channel of this.channels.values()) {
      if (channel.type !== "public" || channel.isArchived) continue;

      const lastActivity =
        this.activityCache.get(channel.id) ?? channel.lastActivityAt;
      if (!lastActivity) continue;

      recent.push({
        ...channel,
        isMember: userChannels.has(channel.id),
        isRecommended: false,
        popularityScore: this.calculatePopularity(channel),
        matchScore: 0,
        lastActivityAt: lastActivity,
      });
    }

    recent.sort((a, b) => {
      const aTime = a.lastActivityAt?.getTime() ?? 0;
      const bTime = b.lastActivityAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    return recent.slice(0, limit);
  }

  /**
   * Gets channels by category
   */
  getChannelsByCategory(
    category: ChannelCategory,
    options: ChannelDiscoveryOptions = {},
  ): ChannelDiscoveryResult {
    return this.discover({
      ...options,
      categories: [category],
    });
  }

  /**
   * Gets category information with channel counts
   */
  getCategories(): ChannelCategoryInfo[] {
    const categoryCounts = new Map<ChannelCategory, number>();

    for (const channel of this.channels.values()) {
      if (channel.type !== "public" || channel.isArchived) continue;
      if (!channel.category) continue;

      const count = categoryCounts.get(channel.category) ?? 0;
      categoryCounts.set(channel.category, count + 1);
    }

    const categories: ChannelCategoryInfo[] = [];

    for (const [category, info] of Object.entries(CHANNEL_CATEGORIES)) {
      categories.push({
        category: category as ChannelCategory,
        label: info.label,
        description: info.description,
        icon: info.icon,
        channelCount: categoryCounts.get(category as ChannelCategory) ?? 0,
      });
    }

    // Sort by channel count descending
    categories.sort((a, b) => b.channelCount - a.channelCount);

    return categories;
  }

  /**
   * Searches channels by name or description
   */
  searchChannels(
    query: string,
    options: ChannelDiscoveryOptions = {},
  ): ChannelDiscoveryResult {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return this.discover(options);
    }

    const results = this.discover({
      ...options,
      sortBy: "alphabetical", // Will re-sort by match
    });

    // Filter by query and calculate match scores
    const filtered = results.channels
      .map((channel) => {
        const nameMatch = channel.name.toLowerCase().includes(normalizedQuery);
        const descMatch = channel.description
          ?.toLowerCase()
          .includes(normalizedQuery);
        const slugMatch = channel.slug.toLowerCase().includes(normalizedQuery);

        let matchScore = 0;
        if (nameMatch) matchScore += 10;
        if (slugMatch) matchScore += 5;
        if (descMatch) matchScore += 3;

        // Exact name match bonus
        if (channel.name.toLowerCase() === normalizedQuery) {
          matchScore += 20;
        }

        // Name starts with query bonus
        if (channel.name.toLowerCase().startsWith(normalizedQuery)) {
          matchScore += 10;
        }

        return { ...channel, matchScore };
      })
      .filter((channel) => channel.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    return {
      channels: filtered.slice(0, options.limit ?? DEFAULT_LIMIT),
      totalCount: filtered.length,
      hasMore: filtered.length > (options.limit ?? DEFAULT_LIMIT),
      nextOffset: null,
    };
  }

  /**
   * Gets a channel by ID
   */
  getChannel(channelId: string): ChannelInfo | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Checks if user is member of channel
   */
  isMember(userId: string, channelId: string): boolean {
    return this.membershipCache.get(userId)?.has(channelId) ?? false;
  }

  /**
   * Gets channel count
   */
  getChannelCount(type?: ChannelType): number {
    if (!type) {
      return this.channels.size;
    }

    let count = 0;
    for (const channel of this.channels.values()) {
      if (channel.type === type) count++;
    }
    return count;
  }

  /**
   * Clears all data
   */
  clear(): void {
    this.channels.clear();
    this.membershipCache.clear();
    this.activityCache.clear();
  }

  /**
   * Calculates popularity score for a channel
   */
  private calculatePopularity(channel: ChannelInfo): number {
    let score = 0;

    // Member count (logarithmic scale)
    score += Math.log(channel.memberCount + 1) * 10;

    // Recent activity bonus
    const lastActivity =
      this.activityCache.get(channel.id) ?? channel.lastActivityAt;
    if (lastActivity) {
      const daysSinceActivity =
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity < 1) score += 20;
      else if (daysSinceActivity < 7) score += 10;
      else if (daysSinceActivity < 30) score += 5;
    }

    return score;
  }

  /**
   * Calculates recommendation score for a channel
   */
  private calculateRecommendationScore(
    channel: ChannelInfo,
    context: ChannelRecommendationContext,
  ): number {
    let score = 0;

    // Check if colleagues are members
    // This would require additional membership data
    // For now, we'll use interests matching

    // Interest matching
    const channelText =
      `${channel.name} ${channel.description ?? ""} ${channel.topic ?? ""}`.toLowerCase();
    for (const interest of context.interests) {
      if (channelText.includes(interest.toLowerCase())) {
        score += 5;
      }
    }

    // Popular channels get a baseline score
    score += this.calculatePopularity(channel) / 10;

    return score;
  }

  /**
   * Sorts channels by the specified option
   */
  private sortChannels(
    channels: DiscoverableChannel[],
    sortBy: ChannelSortOption,
  ): DiscoverableChannel[] {
    switch (sortBy) {
      case "popular":
        return channels.sort((a, b) => b.popularityScore - a.popularityScore);
      case "recent":
        return channels.sort((a, b) => {
          const aTime = a.lastActivityAt?.getTime() ?? 0;
          const bTime = b.lastActivityAt?.getTime() ?? 0;
          return bTime - aTime;
        });
      case "alphabetical":
        return channels.sort((a, b) => a.name.localeCompare(b.name));
      case "members":
        return channels.sort((a, b) => b.memberCount - a.memberCount);
      case "activity":
        return channels.sort((a, b) => {
          const aTime = a.lastActivityAt?.getTime() ?? 0;
          const bTime = b.lastActivityAt?.getTime() ?? 0;
          return bTime - aTime;
        });
      default:
        return channels;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let defaultService: ChannelDiscoveryService | null = null;

/**
 * Gets or creates the default channel discovery service
 */
export function getChannelDiscoveryService(): ChannelDiscoveryService {
  if (!defaultService) {
    defaultService = new ChannelDiscoveryService();
  }
  return defaultService;
}

/**
 * Creates a new channel discovery service instance
 */
export function createChannelDiscoveryService(): ChannelDiscoveryService {
  return new ChannelDiscoveryService();
}

export default ChannelDiscoveryService;
