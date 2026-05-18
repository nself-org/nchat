/**
 * Mention Autocomplete - Logic for mention autocomplete functionality
 *
 * Handles:
 * - Fuzzy search for users and channels
 * - Filtering and sorting suggestions
 * - Group mention suggestions
 * - Keyboard navigation state
 *
 * @example
 * ```typescript
 * import { filterMentionSuggestions, sortSuggestions } from '@/lib/mentions/mention-autocomplete'
 *
 * const suggestions = filterMentionSuggestions(users, channels, '@jo')
 * ```
 */

import type {
  MentionableUser,
  MentionableChannel,
  MentionableRole,
  MentionSuggestion,
  SuggestionType,
  GroupMentionInfo,
  MentionPermissions,
} from "./mention-types";
import { GROUP_MENTIONS } from "./mention-types";

// ============================================================================
// Configuration
// ============================================================================

/** Maximum number of suggestions to show */
export const MAX_SUGGESTIONS = 10;

/** Minimum query length to start searching (0 = show all) */
export const MIN_QUERY_LENGTH = 0;

/** Debounce delay for autocomplete queries (ms) */
export const AUTOCOMPLETE_DEBOUNCE_MS = 150;

// ============================================================================
// Fuzzy Search
// ============================================================================

/**
 * Simple fuzzy match score
 * Returns a score from 0 (no match) to 1 (exact match)
 */
export function fuzzyScore(query: string, target: string): number {
  if (!query) return 0.5; // Show all with medium priority when no query

  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();

  // Exact match
  if (lowerTarget === lowerQuery) {
    return 1;
  }

  // Starts with query (high priority)
  if (lowerTarget.startsWith(lowerQuery)) {
    return 0.9 + (0.09 * query.length) / target.length;
  }

  // Contains query
  if (lowerTarget.includes(lowerQuery)) {
    const position = lowerTarget.indexOf(lowerQuery);
    // Earlier position = higher score
    return 0.5 + 0.4 * (1 - position / target.length);
  }

  // Word boundary match
  const words = lowerTarget.split(/[\s_-]+/);
  for (const word of words) {
    if (word.startsWith(lowerQuery)) {
      return 0.4;
    }
  }

  // Character sequence match (fuzzy)
  let queryIndex = 0;
  let consecutiveBonus = 0;
  let lastMatchIndex = -1;

  for (
    let i = 0;
    i < lowerTarget.length && queryIndex < lowerQuery.length;
    i++
  ) {
    if (lowerTarget[i] === lowerQuery[queryIndex]) {
      if (lastMatchIndex === i - 1) {
        consecutiveBonus += 0.1;
      }
      lastMatchIndex = i;
      queryIndex++;
    }
  }

  if (queryIndex === lowerQuery.length) {
    const baseScore = 0.2 + consecutiveBonus / query.length;
    return Math.min(baseScore, 0.39);
  }

  return 0;
}

/**
 * Check if a user matches a query
 */
export function matchUser(user: MentionableUser, query: string): number {
  const usernameScore = fuzzyScore(query, user.username);
  const displayNameScore = fuzzyScore(query, user.displayName);
  return Math.max(usernameScore, displayNameScore);
}

/**
 * Check if a channel matches a query
 */
export function matchChannel(
  channel: MentionableChannel,
  query: string,
): number {
  const nameScore = fuzzyScore(query, channel.name);
  const slugScore = fuzzyScore(query, channel.slug);
  return Math.max(nameScore, slugScore);
}

/**
 * Check if a role matches a query
 */
export function matchRole(role: MentionableRole, query: string): number {
  return fuzzyScore(query, role.name);
}

// ============================================================================
// Filtering Functions
// ============================================================================

/**
 * Filter users by search query
 */
export function filterUsers(
  users: MentionableUser[],
  query: string,
  limit: number = MAX_SUGGESTIONS,
): Array<MentionableUser & { score: number }> {
  const results = users
    .map((user) => ({ ...user, score: matchUser(user, query) }))
    .filter((user) => user.score > 0)
    .sort((a, b) => {
      // Sort by score first
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Then by online status
      if (a.presence === "online" && b.presence !== "online") return -1;
      if (b.presence === "online" && a.presence !== "online") return 1;
      // Then alphabetically
      return a.displayName.localeCompare(b.displayName);
    });

  return results.slice(0, limit);
}

/**
 * Filter channels by search query
 */
export function filterChannels(
  channels: MentionableChannel[],
  query: string,
  limit: number = MAX_SUGGESTIONS,
): Array<MentionableChannel & { score: number }> {
  const results = channels
    .filter((c) => !c.isArchived) // Exclude archived channels
    .map((channel) => ({ ...channel, score: matchChannel(channel, query) }))
    .filter((channel) => channel.score > 0)
    .sort((a, b) => {
      // Sort by score first
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Then by type (public first)
      if (a.type === "public" && b.type !== "public") return -1;
      if (b.type === "public" && a.type !== "public") return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });

  return results.slice(0, limit);
}

/**
 * Filter roles by search query
 */
export function filterRoles(
  roles: MentionableRole[],
  query: string,
  limit: number = MAX_SUGGESTIONS,
): Array<MentionableRole & { score: number }> {
  const results = roles
    .map((role) => ({ ...role, score: matchRole(role, query) }))
    .filter((role) => role.score > 0)
    .sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Filter group mentions by search query
 */
export function filterGroupMentions(
  query: string,
  permissions: MentionPermissions,
): GroupMentionInfo[] {
  const lowerQuery = query.toLowerCase();
  const groups: GroupMentionInfo[] = [];

  if (permissions.canMentionEveryone) {
    const everyone = GROUP_MENTIONS.everyone;
    if (
      !query ||
      everyone.label.toLowerCase().includes(lowerQuery) ||
      "everyone".includes(lowerQuery)
    ) {
      groups.push(everyone);
    }
  }

  if (permissions.canMentionHere) {
    const here = GROUP_MENTIONS.here;
    if (
      !query ||
      here.label.toLowerCase().includes(lowerQuery) ||
      "here".includes(lowerQuery)
    ) {
      groups.push(here);
    }
  }

  if (permissions.canMentionChannel) {
    const channel = GROUP_MENTIONS.channel;
    if (
      !query ||
      channel.label.toLowerCase().includes(lowerQuery) ||
      "channel".includes(lowerQuery)
    ) {
      groups.push(channel);
    }
  }

  return groups;
}

// ============================================================================
// Suggestion Generation
// ============================================================================

/**
 * Convert a user to a mention suggestion
 */
export function userToSuggestion(
  user: MentionableUser & { score?: number },
): MentionSuggestion {
  return {
    type: "user",
    id: user.id,
    label: user.displayName,
    sublabel: `@${user.username}`,
    avatarUrl: user.avatarUrl ?? undefined,
    presence: user.presence,
    data: user,
  };
}

/**
 * Convert a channel to a mention suggestion
 */
export function channelToSuggestion(
  channel: MentionableChannel & { score?: number },
): MentionSuggestion {
  const typeIcons: Record<string, string> = {
    public: "hash",
    private: "lock",
    direct: "user",
    group: "users",
  };

  return {
    type: "channel",
    id: channel.id,
    label: channel.name,
    sublabel: channel.description || undefined,
    icon: channel.icon || typeIcons[channel.type] || "hash",
    data: channel,
  };
}

/**
 * Convert a group mention to a suggestion
 */
export function groupMentionToSuggestion(
  group: GroupMentionInfo,
): MentionSuggestion {
  return {
    type: "group",
    id: group.type,
    label: group.label,
    sublabel: group.description,
    icon: group.icon,
    data: group,
  };
}

/**
 * Convert a role to a mention suggestion
 */
export function roleToSuggestion(
  role: MentionableRole & { score?: number },
): MentionSuggestion {
  return {
    type: "role",
    id: role.id,
    label: `@${role.name}`,
    sublabel: `${role.memberCount} members`,
    color: role.color,
    icon: "shield",
    data: role,
  };
}

// ============================================================================
// Main Autocomplete Function
// ============================================================================

/**
 * Options for filtering mention suggestions
 */
export interface FilterSuggestionsOptions {
  /** User mention suggestions */
  users?: MentionableUser[];
  /** Channel mention suggestions */
  channels?: MentionableChannel[];
  /** Role mention suggestions */
  roles?: MentionableRole[];
  /** Permissions for group mentions */
  permissions?: MentionPermissions;
  /** The trigger character ('@' or '#') */
  trigger: "@" | "#";
  /** The search query */
  query: string;
  /** Maximum total suggestions */
  maxSuggestions?: number;
  /** Prioritize channel members in user suggestions */
  prioritizeChannelMembers?: boolean;
  /** IDs of channel members to prioritize */
  channelMemberIds?: Set<string>;
}

/**
 * Filter and combine all mention suggestions
 */
export function filterMentionSuggestions(
  options: FilterSuggestionsOptions,
): MentionSuggestion[] {
  const {
    users = [],
    channels = [],
    roles = [],
    permissions = {
      canMentionUsers: true,
      canMentionChannels: true,
      canMentionEveryone: false,
      canMentionHere: false,
      canMentionChannel: false,
      canMentionRoles: false,
    },
    trigger,
    query,
    maxSuggestions = MAX_SUGGESTIONS,
    prioritizeChannelMembers = false,
    channelMemberIds = new Set(),
  } = options;

  const suggestions: MentionSuggestion[] = [];

  if (trigger === "@") {
    // User mentions
    if (permissions.canMentionUsers) {
      let filteredUsers = filterUsers(users, query, maxSuggestions);

      // Prioritize channel members
      if (prioritizeChannelMembers && channelMemberIds.size > 0) {
        filteredUsers = filteredUsers.sort((a, b) => {
          const aIsMember = channelMemberIds.has(a.id);
          const bIsMember = channelMemberIds.has(b.id);
          if (aIsMember && !bIsMember) return -1;
          if (bIsMember && !aIsMember) return 1;
          return b.score - a.score;
        });
      }

      suggestions.push(...filteredUsers.map(userToSuggestion));
    }

    // Group mentions (only if query matches or is empty)
    const groupSuggestions = filterGroupMentions(query, permissions);
    suggestions.push(...groupSuggestions.map(groupMentionToSuggestion));

    // Role mentions
    if (permissions.canMentionRoles) {
      const filteredRoles = filterRoles(roles, query, 5);
      suggestions.push(...filteredRoles.map(roleToSuggestion));
    }
  } else if (trigger === "#") {
    // Channel mentions
    if (permissions.canMentionChannels) {
      const filteredChannels = filterChannels(channels, query, maxSuggestions);
      suggestions.push(...filteredChannels.map(channelToSuggestion));
    }
  }

  return suggestions.slice(0, maxSuggestions);
}

// ============================================================================
// Keyboard Navigation
// ============================================================================

/**
 * Handle keyboard navigation for autocomplete
 */
export function handleAutocompleteKeyboard(
  key: string,
  selectedIndex: number,
  suggestions: MentionSuggestion[],
  onSelect: (suggestion: MentionSuggestion) => void,
  onClose: () => void,
): { handled: boolean; newIndex?: number } {
  const suggestionsCount = suggestions.length;

  switch (key) {
    case "ArrowDown":
      return {
        handled: true,
        newIndex: (selectedIndex + 1) % suggestionsCount,
      };

    case "ArrowUp":
      return {
        handled: true,
        newIndex: selectedIndex <= 0 ? suggestionsCount - 1 : selectedIndex - 1,
      };

    case "Enter":
    case "Tab":
      if (suggestions[selectedIndex]) {
        onSelect(suggestions[selectedIndex]);
        return { handled: true };
      }
      break;

    case "Escape":
      onClose();
      return { handled: true };
  }

  return { handled: false };
}

// ============================================================================
// Insertion Helpers
// ============================================================================

/**
 * Create the text to insert for a mention
 */
export function getMentionInsertText(suggestion: MentionSuggestion): string {
  switch (suggestion.type) {
    case "user": {
      const user = suggestion.data as MentionableUser;
      return `@${user.username} `;
    }
    case "channel": {
      const channel = suggestion.data as MentionableChannel;
      return `#${channel.slug} `;
    }
    case "group": {
      const group = suggestion.data as GroupMentionInfo;
      return `@${group.type} `;
    }
    case "role": {
      const role = suggestion.data as MentionableRole;
      return `@${role.name} `;
    }
    default:
      return "";
  }
}

/**
 * Calculate text replacement for inserting a mention
 */
export function calculateMentionReplacement(
  text: string,
  cursorPosition: number,
  suggestion: MentionSuggestion,
  triggerStart: number,
): { newText: string; newCursorPosition: number } {
  const insertText = getMentionInsertText(suggestion);
  const before = text.slice(0, triggerStart);
  const after = text.slice(cursorPosition);

  const newText = before + insertText + after;
  const newCursorPosition = triggerStart + insertText.length;

  return { newText, newCursorPosition };
}

// ============================================================================
// Recent Mentions
// ============================================================================

/** Key for storing recent mentions in localStorage */
const RECENT_MENTIONS_KEY = "nchat-recent-mentions";
const MAX_RECENT_MENTIONS = 5;

/**
 * Get recently used mentions
 */
export function getRecentMentions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_MENTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add a mention to recent list
 */
export function addRecentMention(identifier: string): void {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentMentions();
    const updated = [
      identifier,
      ...recent.filter((m) => m !== identifier),
    ].slice(0, MAX_RECENT_MENTIONS);
    localStorage.setItem(RECENT_MENTIONS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear recent mentions
 */
export function clearRecentMentions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_MENTIONS_KEY);
  } catch {
    // Ignore storage errors
  }
}
