/**
 * Channel Store - Manages channel state for the nself-chat application
 *
 * Handles channels, categories, muted/starred states, and channel navigation
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type ChannelType = "public" | "private" | "direct" | "group";

export interface ChannelMember {
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  lastReadAt: string | null;
  lastReadMessageId: string | null;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ChannelType;
  categoryId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  topic: string | null;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
  isDefault: boolean;
  memberCount: number;
  members?: ChannelMember[];
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  // For DMs
  otherUserId?: string;
  otherUserName?: string;
  otherUserAvatar?: string;
}

export interface ChannelCategory {
  id: string;
  name: string;
  position: number;
  isCollapsed: boolean;
  channelIds: string[];
}

export interface ChannelState {
  // Channel Data
  channels: Map<string, Channel>;
  channelsBySlug: Map<string, string>; // slug -> id mapping

  // Categories
  categories: ChannelCategory[];
  collapsedCategories: Set<string>;

  // Active Channel
  activeChannelId: string | null;
  previousChannelId: string | null;

  // Channel Lists
  mutedChannels: Set<string>;
  starredChannels: Set<string>;
  pinnedChannels: Set<string>;
  recentChannels: string[]; // ordered by recent access
  hiddenChannels: Set<string>;

  // Loading States
  isLoading: boolean;
  isLoadingChannel: string | null;
  error: string | null;

  // Pagination for channel list
  hasMoreChannels: boolean;
  channelListCursor: string | null;
}

export interface ChannelActions {
  // Channel CRUD
  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  removeChannel: (channelId: string) => void;
  getChannelById: (channelId: string) => Channel | undefined;
  getChannelBySlug: (slug: string) => Channel | undefined;

  // Active Channel
  setActiveChannel: (channelId: string | null) => void;
  goToPreviousChannel: () => void;

  // Categories
  setCategories: (categories: ChannelCategory[]) => void;
  addCategory: (category: ChannelCategory) => void;
  updateCategory: (
    categoryId: string,
    updates: Partial<ChannelCategory>,
  ) => void;
  removeCategory: (categoryId: string) => void;
  toggleCategoryCollapse: (categoryId: string) => void;
  setCategoryCollapsed: (categoryId: string, collapsed: boolean) => void;
  moveChannelToCategory: (channelId: string, categoryId: string | null) => void;
  reorderCategories: (categoryIds: string[]) => void;

  // Mute/Star/Pin
  toggleMuteChannel: (channelId: string) => void;
  setChannelMuted: (channelId: string, muted: boolean) => void;
  toggleStarChannel: (channelId: string) => void;
  setChannelStarred: (channelId: string, starred: boolean) => void;
  togglePinChannel: (channelId: string) => void;
  setChannelPinned: (channelId: string, pinned: boolean) => void;

  // Hidden Channels
  hideChannel: (channelId: string) => void;
  unhideChannel: (channelId: string) => void;
  setHiddenChannels: (channelIds: string[]) => void;

  // Recent Channels
  addToRecentChannels: (channelId: string) => void;
  clearRecentChannels: () => void;

  // Members
  updateChannelMembers: (channelId: string, members: ChannelMember[]) => void;
  addChannelMember: (channelId: string, member: ChannelMember) => void;
  removeChannelMember: (channelId: string, userId: string) => void;
  updateChannelMember: (
    channelId: string,
    userId: string,
    updates: Partial<ChannelMember>,
  ) => void;

  // Loading/Error
  setLoading: (loading: boolean) => void;
  setLoadingChannel: (channelId: string | null) => void;
  setError: (error: string | null) => void;

  // Pagination
  setHasMoreChannels: (hasMore: boolean) => void;
  setChannelListCursor: (cursor: string | null) => void;

  // Bulk Operations
  markChannelAsRead: (channelId: string, messageId: string) => void;
  archiveChannel: (channelId: string) => void;
  unarchiveChannel: (channelId: string) => void;

  // Utility
  resetChannelStore: () => void;
}

export type ChannelStore = ChannelState & ChannelActions;

// ============================================================================
// Initial State
// ============================================================================

const MAX_RECENT_CHANNELS = 10;

const initialState: ChannelState = {
  channels: new Map(),
  channelsBySlug: new Map(),
  categories: [],
  collapsedCategories: new Set(),
  activeChannelId: null,
  previousChannelId: null,
  mutedChannels: new Set(),
  starredChannels: new Set(),
  pinnedChannels: new Set(),
  recentChannels: [],
  hiddenChannels: new Set(),
  isLoading: false,
  isLoadingChannel: null,
  error: null,
  hasMoreChannels: false,
  channelListCursor: null,
};

// ============================================================================
// Store
// ============================================================================

export const useChannelStore = create<ChannelStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Channel CRUD
        setChannels: (channels) =>
          set(
            (state) => {
              state.channels = new Map(channels.map((c) => [c.id, c]));
              state.channelsBySlug = new Map(
                channels.map((c) => [c.slug, c.id]),
              );
            },
            false,
            "channel/setChannels",
          ),

        addChannel: (channel) =>
          set(
            (state) => {
              state.channels.set(channel.id, channel);
              state.channelsBySlug.set(channel.slug, channel.id);
            },
            false,
            "channel/addChannel",
          ),

        updateChannel: (channelId, updates) =>
          set(
            (state) => {
              const channel = state.channels.get(channelId);
              if (channel) {
                const oldSlug = channel.slug;

                // Mutate the draft directly (immer pattern)
                Object.assign(channel, updates, {
                  updatedAt: new Date().toISOString(),
                });

                // Update slug mapping if slug changed
                if (updates.slug && updates.slug !== oldSlug) {
                  state.channelsBySlug.delete(oldSlug);
                  state.channelsBySlug.set(updates.slug, channelId);
                }
              }
            },
            false,
            "channel/updateChannel",
          ),

        removeChannel: (channelId) =>
          set(
            (state) => {
              const channel = state.channels.get(channelId);
              if (channel) {
                state.channels.delete(channelId);
                state.channelsBySlug.delete(channel.slug);
                state.mutedChannels.delete(channelId);
                state.starredChannels.delete(channelId);
                state.pinnedChannels.delete(channelId);
                state.hiddenChannels.delete(channelId);
                state.recentChannels = state.recentChannels.filter(
                  (id) => id !== channelId,
                );

                // Update active channel if it was removed
                if (state.activeChannelId === channelId) {
                  state.activeChannelId = state.previousChannelId;
                  state.previousChannelId = null;
                }
              }
            },
            false,
            "channel/removeChannel",
          ),

        getChannelById: (channelId) => get().channels.get(channelId),

        getChannelBySlug: (slug) => {
          const channelId = get().channelsBySlug.get(slug);
          return channelId ? get().channels.get(channelId) : undefined;
        },

        // Active Channel
        setActiveChannel: (channelId) =>
          set(
            (state) => {
              if (state.activeChannelId !== channelId) {
                state.previousChannelId = state.activeChannelId;
                state.activeChannelId = channelId;

                // Add to recent channels
                if (channelId) {
                  state.recentChannels = [
                    channelId,
                    ...state.recentChannels.filter((id) => id !== channelId),
                  ].slice(0, MAX_RECENT_CHANNELS);
                }
              }
            },
            false,
            "channel/setActiveChannel",
          ),

        goToPreviousChannel: () =>
          set(
            (state) => {
              if (state.previousChannelId) {
                const temp = state.activeChannelId;
                state.activeChannelId = state.previousChannelId;
                state.previousChannelId = temp;
              }
            },
            false,
            "channel/goToPreviousChannel",
          ),

        // Categories
        setCategories: (categories) =>
          set(
            (state) => {
              state.categories = categories;
            },
            false,
            "channel/setCategories",
          ),

        addCategory: (category) =>
          set(
            (state) => {
              state.categories.push(category);
            },
            false,
            "channel/addCategory",
          ),

        updateCategory: (categoryId, updates) =>
          set(
            (state) => {
              const index = state.categories.findIndex(
                (c) => c.id === categoryId,
              );
              if (index !== -1) {
                state.categories[index] = {
                  ...state.categories[index],
                  ...updates,
                };
              }
            },
            false,
            "channel/updateCategory",
          ),

        removeCategory: (categoryId) =>
          set(
            (state) => {
              state.categories = state.categories.filter(
                (c) => c.id !== categoryId,
              );
              state.collapsedCategories.delete(categoryId);
            },
            false,
            "channel/removeCategory",
          ),

        toggleCategoryCollapse: (categoryId) =>
          set(
            (state) => {
              if (state.collapsedCategories.has(categoryId)) {
                state.collapsedCategories.delete(categoryId);
              } else {
                state.collapsedCategories.add(categoryId);
              }
            },
            false,
            "channel/toggleCategoryCollapse",
          ),

        setCategoryCollapsed: (categoryId, collapsed) =>
          set(
            (state) => {
              if (collapsed) {
                state.collapsedCategories.add(categoryId);
              } else {
                state.collapsedCategories.delete(categoryId);
              }
            },
            false,
            "channel/setCategoryCollapsed",
          ),

        moveChannelToCategory: (channelId, categoryId) =>
          set(
            (state) => {
              // Remove from all categories
              state.categories.forEach((category) => {
                category.channelIds = category.channelIds.filter(
                  (id) => id !== channelId,
                );
              });

              // Add to new category
              if (categoryId) {
                const category = state.categories.find(
                  (c) => c.id === categoryId,
                );
                if (category) {
                  category.channelIds.push(channelId);
                }
              }

              // Update channel
              const channel = state.channels.get(channelId);
              if (channel) {
                channel.categoryId = categoryId;
              }
            },
            false,
            "channel/moveChannelToCategory",
          ),

        reorderCategories: (categoryIds) =>
          set(
            (state) => {
              const categoryMap = new Map(
                state.categories.map((c) => [c.id, c]),
              );
              state.categories = categoryIds
                .map((id, index) => {
                  const category = categoryMap.get(id);
                  if (category) {
                    return { ...category, position: index };
                  }
                  return null;
                })
                .filter((c): c is ChannelCategory => c !== null);
            },
            false,
            "channel/reorderCategories",
          ),

        // Mute/Star/Pin
        toggleMuteChannel: (channelId) =>
          set(
            (state) => {
              if (state.mutedChannels.has(channelId)) {
                state.mutedChannels.delete(channelId);
              } else {
                state.mutedChannels.add(channelId);
              }
            },
            false,
            "channel/toggleMuteChannel",
          ),

        setChannelMuted: (channelId, muted) =>
          set(
            (state) => {
              if (muted) {
                state.mutedChannels.add(channelId);
              } else {
                state.mutedChannels.delete(channelId);
              }
            },
            false,
            "channel/setChannelMuted",
          ),

        toggleStarChannel: (channelId) =>
          set(
            (state) => {
              if (state.starredChannels.has(channelId)) {
                state.starredChannels.delete(channelId);
              } else {
                state.starredChannels.add(channelId);
              }
            },
            false,
            "channel/toggleStarChannel",
          ),

        setChannelStarred: (channelId, starred) =>
          set(
            (state) => {
              if (starred) {
                state.starredChannels.add(channelId);
              } else {
                state.starredChannels.delete(channelId);
              }
            },
            false,
            "channel/setChannelStarred",
          ),

        togglePinChannel: (channelId) =>
          set(
            (state) => {
              if (state.pinnedChannels.has(channelId)) {
                state.pinnedChannels.delete(channelId);
              } else {
                state.pinnedChannels.add(channelId);
              }
            },
            false,
            "channel/togglePinChannel",
          ),

        setChannelPinned: (channelId, pinned) =>
          set(
            (state) => {
              if (pinned) {
                state.pinnedChannels.add(channelId);
              } else {
                state.pinnedChannels.delete(channelId);
              }
            },
            false,
            "channel/setChannelPinned",
          ),

        // Hidden Channels
        hideChannel: (channelId) =>
          set(
            (state) => {
              state.hiddenChannels.add(channelId);
            },
            false,
            "channel/hideChannel",
          ),

        unhideChannel: (channelId) =>
          set(
            (state) => {
              state.hiddenChannels.delete(channelId);
            },
            false,
            "channel/unhideChannel",
          ),

        setHiddenChannels: (channelIds) =>
          set(
            (state) => {
              state.hiddenChannels = new Set(channelIds);
            },
            false,
            "channel/setHiddenChannels",
          ),

        // Recent Channels
        addToRecentChannels: (channelId) =>
          set(
            (state) => {
              state.recentChannels = [
                channelId,
                ...state.recentChannels.filter((id) => id !== channelId),
              ].slice(0, MAX_RECENT_CHANNELS);
            },
            false,
            "channel/addToRecentChannels",
          ),

        clearRecentChannels: () =>
          set(
            (state) => {
              state.recentChannels = [];
            },
            false,
            "channel/clearRecentChannels",
          ),

        // Members
        updateChannelMembers: (channelId, members) =>
          set(
            (state) => {
              const channel = state.channels.get(channelId);
              if (channel) {
                channel.members = members;
                channel.memberCount = members.length;
              }
            },
            false,
            "channel/updateChannelMembers",
          ),

        addChannelMember: (channelId, member) =>
          set(
            (state) => {
              const channel = state.channels.get(channelId);
              if (channel) {
                if (!channel.members) {
                  channel.members = [];
                }
                channel.members.push(member);
                channel.memberCount = channel.members.length;
              }
            },
            false,
            "channel/addChannelMember",
          ),

        removeChannelMember: (channelId, userId) =>
          set(
            (state) => {
              const channel = state.channels.get(channelId);
              if (channel && channel.members) {
                channel.members = channel.members.filter(
                  (m) => m.userId !== userId,
                );
                channel.memberCount = channel.members.length;
              }
            },
            false,
            "channel/removeChannelMember",
          ),

        updateChannelMember: (channelId, userId, updates) =>
          set(
            (state) => {
              const channel = state.channels.get(channelId);
              if (channel && channel.members) {
                const memberIndex = channel.members.findIndex(
                  (m) => m.userId === userId,
                );
                if (memberIndex !== -1) {
                  channel.members[memberIndex] = {
                    ...channel.members[memberIndex],
                    ...updates,
                  };
                }
              }
            },
            false,
            "channel/updateChannelMember",
          ),

        // Loading/Error
        setLoading: (loading) =>
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            "channel/setLoading",
          ),

        setLoadingChannel: (channelId) =>
          set(
            (state) => {
              state.isLoadingChannel = channelId;
            },
            false,
            "channel/setLoadingChannel",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "channel/setError",
          ),

        // Pagination
        setHasMoreChannels: (hasMore) =>
          set(
            (state) => {
              state.hasMoreChannels = hasMore;
            },
            false,
            "channel/setHasMoreChannels",
          ),

        setChannelListCursor: (cursor) =>
          set(
            (state) => {
              state.channelListCursor = cursor;
            },
            false,
            "channel/setChannelListCursor",
          ),

        // Bulk Operations
        markChannelAsRead: (channelId, messageId) =>
          set(
            (state) => {
              const channel = state.channels.get(channelId);
              if (channel && channel.members) {
                // This would typically update the current user's member entry
                // The actual user ID would come from the user store
              }
            },
            false,
            "channel/markChannelAsRead",
          ),

        archiveChannel: (channelId) =>
          set(
            (state) => {
              const channel = state.channels.get(channelId);
              if (channel) {
                channel.isArchived = true;
                channel.updatedAt = new Date().toISOString();
              }
            },
            false,
            "channel/archiveChannel",
          ),

        unarchiveChannel: (channelId) =>
          set(
            (state) => {
              const channel = state.channels.get(channelId);
              if (channel) {
                channel.isArchived = false;
                channel.updatedAt = new Date().toISOString();
              }
            },
            false,
            "channel/unarchiveChannel",
          ),

        // Utility
        resetChannelStore: () =>
          set(
            () => ({
              ...initialState,
              channels: new Map(),
              channelsBySlug: new Map(),
              collapsedCategories: new Set(),
              mutedChannels: new Set(),
              starredChannels: new Set(),
              pinnedChannels: new Set(),
              hiddenChannels: new Set(),
            }),
            false,
            "channel/resetChannelStore",
          ),
      })),
    ),
    { name: "channel-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectActiveChannel = (state: ChannelStore) =>
  state.activeChannelId ? state.channels.get(state.activeChannelId) : undefined;

export const selectChannelList = (state: ChannelStore) =>
  Array.from(state.channels.values());

export const selectPublicChannels = (state: ChannelStore) =>
  Array.from(state.channels.values()).filter(
    (c) => c.type === "public" && !c.isArchived,
  );

export const selectPrivateChannels = (state: ChannelStore) =>
  Array.from(state.channels.values()).filter(
    (c) => c.type === "private" && !c.isArchived,
  );

export const selectDirectMessages = (state: ChannelStore) =>
  Array.from(state.channels.values()).filter(
    (c) => (c.type === "direct" || c.type === "group") && !c.isArchived,
  );

export const selectStarredChannels = (state: ChannelStore) =>
  Array.from(state.channels.values()).filter((c) =>
    state.starredChannels.has(c.id),
  );

export const selectMutedChannels = (state: ChannelStore) =>
  Array.from(state.channels.values()).filter((c) =>
    state.mutedChannels.has(c.id),
  );

export const selectRecentChannels = (state: ChannelStore) =>
  state.recentChannels
    .map((id) => state.channels.get(id))
    .filter((c): c is Channel => c !== undefined);

export const selectVisibleChannels = (state: ChannelStore) =>
  Array.from(state.channels.values()).filter(
    (c) => !state.hiddenChannels.has(c.id) && !c.isArchived,
  );

export const selectChannelsByCategory = (state: ChannelStore) => {
  const categorized: Record<string, Channel[]> = {};
  const uncategorized: Channel[] = [];

  state.categories.forEach((category) => {
    categorized[category.id] = [];
  });

  state.channels.forEach((channel) => {
    if (channel.isArchived || state.hiddenChannels.has(channel.id)) return;

    if (channel.categoryId && categorized[channel.categoryId]) {
      categorized[channel.categoryId].push(channel);
    } else if (channel.type !== "direct" && channel.type !== "group") {
      uncategorized.push(channel);
    }
  });

  return { categorized, uncategorized };
};

export const selectIsChannelMuted =
  (channelId: string) => (state: ChannelStore) =>
    state.mutedChannels.has(channelId);

export const selectIsChannelStarred =
  (channelId: string) => (state: ChannelStore) =>
    state.starredChannels.has(channelId);

export const selectIsChannelPinned =
  (channelId: string) => (state: ChannelStore) =>
    state.pinnedChannels.has(channelId);
