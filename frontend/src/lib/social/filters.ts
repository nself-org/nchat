/**
 * Social Media Post Filtering Logic
 * Filters posts based on hashtags, keywords, engagement, etc.
 */

import type { SocialPost, SocialIntegration, FilterCriteria } from "./types";

/**
 * Check if a post matches the integration's filter criteria
 */
export function matchesFilters(
  post: SocialPost,
  integration: SocialIntegration,
): boolean {
  // Check hashtag filters
  if (integration.filter_hashtags && integration.filter_hashtags.length > 0) {
    if (!post.hashtags || post.hashtags.length === 0) {
      return false;
    }

    const hasMatchingHashtag = integration.filter_hashtags.some((filterTag) =>
      post.hashtags!.some(
        (postTag) => postTag.toLowerCase() === filterTag.toLowerCase(),
      ),
    );

    if (!hasMatchingHashtag) {
      return false;
    }
  }

  // Check keyword filters
  if (integration.filter_keywords && integration.filter_keywords.length > 0) {
    const content = post.content.toLowerCase();
    const hasMatchingKeyword = integration.filter_keywords.some((keyword) =>
      content.includes(keyword.toLowerCase()),
    );

    if (!hasMatchingKeyword) {
      return false;
    }
  }

  // Check minimum engagement
  if (integration.min_engagement && integration.min_engagement > 0) {
    const totalEngagement = getTotalEngagement(post);
    if (totalEngagement < integration.min_engagement) {
      return false;
    }
  }

  // Check exclude retweets (Twitter only)
  if (integration.exclude_retweets && isRetweet(post)) {
    return false;
  }

  // Check exclude replies (Twitter only)
  if (integration.exclude_replies && isReply(post)) {
    return false;
  }

  return true;
}

/**
 * Calculate total engagement for a post
 */
function getTotalEngagement(post: SocialPost): number {
  if (!post.engagement) {
    return 0;
  }

  const {
    likes = 0,
    retweets = 0,
    replies = 0,
    shares = 0,
    comments = 0,
  } = post.engagement;
  return likes + retweets + replies + shares + comments;
}

/**
 * Check if a post is a retweet (Twitter)
 */
function isRetweet(post: SocialPost): boolean {
  return post.content.startsWith("RT @") || post.content.startsWith("RT: @");
}

/**
 * Check if a post is a reply (Twitter)
 */
function isReply(post: SocialPost): boolean {
  return (
    post.content.startsWith("@") && !!post.mentions && post.mentions.length > 0
  );
}

/**
 * Filter a list of posts based on criteria
 */
export function filterPosts(
  posts: SocialPost[],
  criteria: FilterCriteria,
): SocialPost[] {
  return posts.filter((post) => {
    // Hashtag filter
    if (criteria.hashtags && criteria.hashtags.length > 0) {
      if (!post.hashtags || post.hashtags.length === 0) {
        return false;
      }

      const hasMatchingHashtag = criteria.hashtags.some((filterTag) =>
        post.hashtags!.some(
          (postTag) => postTag.toLowerCase() === filterTag.toLowerCase(),
        ),
      );

      if (!hasMatchingHashtag) {
        return false;
      }
    }

    // Keyword filter
    if (criteria.keywords && criteria.keywords.length > 0) {
      const content = post.content.toLowerCase();
      const hasMatchingKeyword = criteria.keywords.some((keyword) =>
        content.includes(keyword.toLowerCase()),
      );

      if (!hasMatchingKeyword) {
        return false;
      }
    }

    // Minimum engagement
    if (criteria.minEngagement && criteria.minEngagement > 0) {
      const totalEngagement = getTotalEngagement(post);
      if (totalEngagement < criteria.minEngagement) {
        return false;
      }
    }

    // Exclude retweets
    if (criteria.excludeRetweets && isRetweet(post)) {
      return false;
    }

    // Exclude replies
    if (criteria.excludeReplies && isReply(post)) {
      return false;
    }

    return true;
  });
}

/**
 * Extract hashtags from text
 */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g);
  if (!matches) return [];
  return matches.map((tag) => tag.slice(1).toLowerCase());
}

/**
 * Extract mentions from text
 */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@\w+/g);
  if (!matches) return [];
  return matches.map((mention) => mention.slice(1).toLowerCase());
}

/**
 * Check if any filters are active for an integration
 */
export function hasActiveFilters(integration: SocialIntegration): boolean {
  return !!(
    (integration.filter_hashtags && integration.filter_hashtags.length > 0) ||
    (integration.filter_keywords && integration.filter_keywords.length > 0) ||
    (integration.min_engagement && integration.min_engagement > 0) ||
    integration.exclude_retweets ||
    integration.exclude_replies
  );
}

/**
 * Get a human-readable description of active filters
 */
export function getFilterDescription(integration: SocialIntegration): string {
  const filters: string[] = [];

  if (integration.filter_hashtags && integration.filter_hashtags.length > 0) {
    filters.push(`Hashtags: ${integration.filter_hashtags.join(", ")}`);
  }

  if (integration.filter_keywords && integration.filter_keywords.length > 0) {
    filters.push(`Keywords: ${integration.filter_keywords.join(", ")}`);
  }

  if (integration.min_engagement && integration.min_engagement > 0) {
    filters.push(`Min engagement: ${integration.min_engagement}`);
  }

  if (integration.exclude_retweets) {
    filters.push("Exclude retweets");
  }

  if (integration.exclude_replies) {
    filters.push("Exclude replies");
  }

  if (filters.length === 0) {
    return "No filters (all posts)";
  }

  return filters.join(" • ");
}
