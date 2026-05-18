/**
 * Channel Suggestions - AI-powered channel recommendations
 */

import type { Channel, ChannelType } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface UserContext {
  userId: string;
  joinedChannelIds: string[];
  recentActivityChannelIds: string[];
  interests?: string[];
  role?: string;
  department?: string;
  joinDate?: Date;
}

export interface ChannelSuggestion {
  channel: Channel;
  score: number;
  reason: SuggestionReason;
  confidence: "high" | "medium" | "low";
}

export type SuggestionReason =
  | "similar-to-joined"
  | "popular-in-category"
  | "colleagues-joined"
  | "based-on-interests"
  | "trending"
  | "new-and-relevant"
  | "default-channel"
  | "based-on-role"
  | "frequently-mentioned";

export interface SuggestionConfig {
  maxSuggestions?: number;
  excludeJoined?: boolean;
  prioritizeTrending?: boolean;
  includePrivate?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_SUGGESTIONS = 10;
const SIMILARITY_THRESHOLD = 0.3;
const TRENDING_BOOST = 1.5;
const NEW_CHANNEL_BOOST = 1.2;
const CATEGORY_MATCH_SCORE = 5;
const WORD_MATCH_SCORE = 2;

// ============================================================================
// Suggestion Generation
// ============================================================================

export function generateSuggestions(
  allChannels: Channel[],
  userContext: UserContext,
  config: SuggestionConfig = {},
): ChannelSuggestion[] {
  const {
    maxSuggestions = DEFAULT_MAX_SUGGESTIONS,
    excludeJoined = true,
    prioritizeTrending = true,
    includePrivate = false,
  } = config;

  const joinedSet = new Set(userContext.joinedChannelIds);
  const recentSet = new Set(userContext.recentActivityChannelIds);

  // Filter out joined channels and optionally private channels
  let candidateChannels = allChannels.filter((channel) => {
    if (excludeJoined && joinedSet.has(channel.id)) return false;
    if (!includePrivate && channel.type === "private") return false;
    if (channel.isArchived) return false;
    return true;
  });

  // Get joined channels for similarity calculation
  const joinedChannels = allChannels.filter((c) => joinedSet.has(c.id));

  // Calculate suggestions from different sources
  const suggestions: ChannelSuggestion[] = [];

  // 1. Similar channels based on joined channels
  const similarSuggestions = getSimilarChannelSuggestions(
    candidateChannels,
    joinedChannels,
  );
  suggestions.push(...similarSuggestions);

  // 2. Popular channels in same categories
  const categorySuggestions = getCategorySuggestions(
    candidateChannels,
    joinedChannels,
  );
  suggestions.push(...categorySuggestions);

  // 3. Trending channels
  if (prioritizeTrending) {
    const trendingSuggestions = getTrendingSuggestions(candidateChannels);
    suggestions.push(...trendingSuggestions);
  }

  // 4. Role-based suggestions
  if (userContext.role) {
    const roleSuggestions = getRoleBasedSuggestions(
      candidateChannels,
      userContext.role,
    );
    suggestions.push(...roleSuggestions);
  }

  // 5. Interest-based suggestions
  if (userContext.interests && userContext.interests.length > 0) {
    const interestSuggestions = getInterestBasedSuggestions(
      candidateChannels,
      userContext.interests,
    );
    suggestions.push(...interestSuggestions);
  }

  // 6. Default channels user hasn't joined
  const defaultSuggestions = getDefaultChannelSuggestions(
    candidateChannels,
    joinedSet,
  );
  suggestions.push(...defaultSuggestions);

  // Deduplicate and merge scores
  const mergedSuggestions = mergeSuggestions(suggestions);

  // Sort by score and take top suggestions
  return mergedSuggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);
}

// ============================================================================
// Suggestion Sources
// ============================================================================

function getSimilarChannelSuggestions(
  candidates: Channel[],
  joinedChannels: Channel[],
): ChannelSuggestion[] {
  const suggestions: ChannelSuggestion[] = [];

  for (const candidate of candidates) {
    let maxSimilarity = 0;
    let mostSimilarChannel: Channel | null = null;

    for (const joined of joinedChannels) {
      const similarity = calculateChannelSimilarity(candidate, joined);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilarChannel = joined;
      }
    }

    if (maxSimilarity >= SIMILARITY_THRESHOLD) {
      suggestions.push({
        channel: candidate,
        score: maxSimilarity * 10,
        reason: "similar-to-joined",
        confidence:
          maxSimilarity > 0.7 ? "high" : maxSimilarity > 0.5 ? "medium" : "low",
      });
    }
  }

  return suggestions;
}

function getCategorySuggestions(
  candidates: Channel[],
  joinedChannels: Channel[],
): ChannelSuggestion[] {
  const joinedCategories = new Set(
    joinedChannels.map((c) => c.categoryId).filter(Boolean),
  );

  return candidates
    .filter((c) => c.categoryId && joinedCategories.has(c.categoryId))
    .map((channel) => ({
      channel,
      score: CATEGORY_MATCH_SCORE + channel.memberCount / 10,
      reason: "popular-in-category" as SuggestionReason,
      confidence: "medium" as const,
    }));
}

function getTrendingSuggestions(candidates: Channel[]): ChannelSuggestion[] {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  return candidates
    .filter(
      (c) => c.lastMessageAt && new Date(c.lastMessageAt).getTime() > dayAgo,
    )
    .map((channel) => {
      const recency = channel.lastMessageAt
        ? (new Date(channel.lastMessageAt).getTime() - dayAgo) / (now - dayAgo)
        : 0;

      return {
        channel,
        score: (recency * 5 + channel.memberCount / 5) * TRENDING_BOOST,
        reason: "trending" as SuggestionReason,
        confidence: recency > 0.8 ? "high" : ("medium" as const),
      };
    });
}

function getRoleBasedSuggestions(
  candidates: Channel[],
  role: string,
): ChannelSuggestion[] {
  const roleKeywords = getRoleKeywords(role);

  return candidates
    .filter((c) => {
      const text =
        `${c.name} ${c.description || ""} ${c.topic || ""}`.toLowerCase();
      return roleKeywords.some((keyword) => text.includes(keyword));
    })
    .map((channel) => ({
      channel,
      score: 6,
      reason: "based-on-role" as SuggestionReason,
      confidence: "medium" as const,
    }));
}

function getInterestBasedSuggestions(
  candidates: Channel[],
  interests: string[],
): ChannelSuggestion[] {
  const interestSet = new Set(interests.map((i) => i.toLowerCase()));

  return candidates
    .map((channel) => {
      const text =
        `${channel.name} ${channel.description || ""} ${channel.topic || ""}`.toLowerCase();
      const matchCount = interests.filter((interest) =>
        text.includes(interest.toLowerCase()),
      ).length;

      if (matchCount > 0) {
        return {
          channel,
          score: matchCount * WORD_MATCH_SCORE,
          reason: "based-on-interests" as SuggestionReason,
          confidence: matchCount >= 2 ? "high" : ("low" as const),
        };
      }
      return null;
    })
    .filter((s): s is ChannelSuggestion => s !== null);
}

function getDefaultChannelSuggestions(
  candidates: Channel[],
  joinedSet: Set<string>,
): ChannelSuggestion[] {
  return candidates
    .filter((c) => c.isDefault && !joinedSet.has(c.id))
    .map((channel) => ({
      channel,
      score: 8,
      reason: "default-channel" as SuggestionReason,
      confidence: "high" as const,
    }));
}

// ============================================================================
// Similarity Calculation
// ============================================================================

function calculateChannelSimilarity(a: Channel, b: Channel): number {
  let score = 0;
  let weights = 0;

  // Category match (high weight)
  if (a.categoryId && a.categoryId === b.categoryId) {
    score += 3;
  }
  weights += 3;

  // Type match
  if (a.type === b.type) {
    score += 1;
  }
  weights += 1;

  // Name similarity
  const nameSim = calculateTextSimilarity(a.name, b.name);
  score += nameSim * 2;
  weights += 2;

  // Description similarity
  if (a.description && b.description) {
    const descSim = calculateTextSimilarity(a.description, b.description);
    score += descSim * 2;
    weights += 2;
  }

  // Topic similarity
  if (a.topic && b.topic) {
    const topicSim = calculateTextSimilarity(a.topic, b.topic);
    score += topicSim;
    weights += 1;
  }

  return score / weights;
}

function calculateTextSimilarity(a: string, b: string): number {
  const wordsA = extractWords(a);
  const wordsB = extractWords(b);

  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union; // Jaccard similarity
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2);
}

// ============================================================================
// Helper Functions
// ============================================================================

function getRoleKeywords(role: string): string[] {
  const roleMap: Record<string, string[]> = {
    owner: ["admin", "management", "leadership", "announcements"],
    admin: ["admin", "moderation", "support", "management"],
    moderator: ["moderation", "support", "help"],
    member: [],
    guest: ["welcome", "general", "help"],
  };

  return roleMap[role.toLowerCase()] || [];
}

function mergeSuggestions(
  suggestions: ChannelSuggestion[],
): ChannelSuggestion[] {
  const byChannelId = new Map<string, ChannelSuggestion>();

  for (const suggestion of suggestions) {
    const existing = byChannelId.get(suggestion.channel.id);
    if (existing) {
      // Merge: take higher score, combine reasons
      existing.score = Math.max(existing.score, suggestion.score);
      // Keep the higher confidence
      if (
        getConfidenceValue(suggestion.confidence) >
        getConfidenceValue(existing.confidence)
      ) {
        existing.confidence = suggestion.confidence;
      }
    } else {
      byChannelId.set(suggestion.channel.id, { ...suggestion });
    }
  }

  return Array.from(byChannelId.values());
}

function getConfidenceValue(confidence: "high" | "medium" | "low"): number {
  switch (confidence) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}

// ============================================================================
// Similar Channels (for channel details page)
// ============================================================================

export function getSimilarChannels(
  targetChannel: Channel,
  allChannels: Channel[],
  limit: number = 5,
): Channel[] {
  return allChannels
    .filter((c) => c.id !== targetChannel.id && !c.isArchived)
    .map((channel) => ({
      channel,
      similarity: calculateChannelSimilarity(targetChannel, channel),
    }))
    .filter((item) => item.similarity >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((item) => item.channel);
}

// ============================================================================
// Reason Display Text
// ============================================================================

export function getSuggestionReasonText(reason: SuggestionReason): string {
  switch (reason) {
    case "similar-to-joined":
      return "Similar to channels you follow";
    case "popular-in-category":
      return "Popular in your categories";
    case "colleagues-joined":
      return "Your colleagues are here";
    case "based-on-interests":
      return "Based on your interests";
    case "trending":
      return "Trending now";
    case "new-and-relevant":
      return "New and relevant to you";
    case "default-channel":
      return "Recommended for all members";
    case "based-on-role":
      return "Relevant to your role";
    case "frequently-mentioned":
      return "Frequently mentioned in your channels";
    default:
      return "Recommended for you";
  }
}
