/**
 * DM Store - Manages direct message state for the nself-chat application
 *
 * Handles DMs, group DMs, participants, notifications, and DM navigation
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  DirectMessage,
  DMParticipant,
  DMMessage,
  DMTypingIndicator,
  DMNotificationPreference,
  DMFilterType,
  DMSortType,
  DMPinnedMessage,
  DMSharedFile,
  DMMediaItem,
  DMReadReceipt,
} from "@/lib/dm/dm-types";

// ============================================================================
// Types
// ============================================================================

export interface DMState {
  // DM Data
  dms: Map<string, DirectMessage>;
  dmsBySlug: Map<string, string>; // slug -> id mapping

  // Active DM
  activeDMId: string | null;
  previousDMId: string | null;

  // Messages by DM
  messagesByDM: Record<string, DMMessage[]>;
  loadingMessages: Set<string>;
  hasMoreMessages: Record<string, boolean>;
  messageCursors: Record<string, string | null>;

  // DM Lists
  mutedDMs: Set<string>;
  starredDMs: Set<string>;
  archivedDMs: Set<string>;
  recentDMs: string[]; // ordered by recent access

  // Notification Preferences
  notificationPreferences: Map<string, DMNotificationPreference>;

  // Typing Indicators
  typingIndicators: Record<string, DMTypingIndicator[]>;

  // Read Receipts
  readReceipts: Record<string, DMReadReceipt[]>;

  // Pinned Messages by DM
  pinnedMessages: Record<string, DMPinnedMessage[]>;

  // Shared Content by DM
  sharedFiles: Record<string, DMSharedFile[]>;
  mediaItems: Record<string, DMMediaItem[]>;

  // Unread Counts
  unreadCounts: Record<string, number>;
  totalUnreadCount: number;

  // Filters & Sort
  filterType: DMFilterType;
  sortType: DMSortType;
  searchQuery: string;

  // Loading States
  isLoading: boolean;
  isLoadingDM: string | null;
  error: string | null;

  // Pagination
  hasMoreDMs: boolean;
  dmListCursor: string | null;

  // UI State
  isNewDMModalOpen: boolean;
  isGroupDMCreateOpen: boolean;
  selectedUserIds: string[];
}

export interface DMActions {
  // DM CRUD
  setDMs: (dms: DirectMessage[]) => void;
  addDM: (dm: DirectMessage) => void;
  updateDM: (dmId: string, updates: Partial<DirectMessage>) => void;
  removeDM: (dmId: string) => void;
  getDMById: (dmId: string) => DirectMessage | undefined;
  getDMBySlug: (slug: string) => DirectMessage | undefined;

  // Active DM
  setActiveDM: (dmId: string | null) => void;
  goToPreviousDM: () => void;

  // Messages
  setMessages: (dmId: string, messages: DMMessage[]) => void;
  addMessage: (dmId: string, message: DMMessage) => void;
  updateMessage: (
    dmId: string,
    messageId: string,
    updates: Partial<DMMessage>,
  ) => void;
  removeMessage: (dmId: string, messageId: string) => void;
  prependMessages: (dmId: string, messages: DMMessage[]) => void;
  setMessagesLoading: (dmId: string, loading: boolean) => void;
  setHasMoreMessages: (dmId: string, hasMore: boolean) => void;
  setMessageCursor: (dmId: string, cursor: string | null) => void;

  // Mute/Star/Archive
  toggleMuteDM: (dmId: string) => void;
  setDMMuted: (dmId: string, muted: boolean, muteUntil?: string | null) => void;
  toggleStarDM: (dmId: string) => void;
  setDMStarred: (dmId: string, starred: boolean) => void;
  archiveDM: (dmId: string) => void;
  unarchiveDM: (dmId: string) => void;

  // Recent DMs
  addToRecentDMs: (dmId: string) => void;
  clearRecentDMs: () => void;

  // Notification Preferences
  setNotificationPreference: (
    dmId: string,
    preference: DMNotificationPreference,
  ) => void;
  updateNotificationPreference: (
    dmId: string,
    updates: Partial<DMNotificationPreference>,
  ) => void;

  // Typing Indicators
  setTypingIndicators: (dmId: string, indicators: DMTypingIndicator[]) => void;
  addTypingIndicator: (dmId: string, indicator: DMTypingIndicator) => void;
  removeTypingIndicator: (dmId: string, userId: string) => void;
  clearTypingIndicators: (dmId: string) => void;

  // Read Receipts
  setReadReceipts: (dmId: string, receipts: DMReadReceipt[]) => void;
  addReadReceipt: (dmId: string, receipt: DMReadReceipt) => void;

  // Pinned Messages
  setPinnedMessages: (dmId: string, messages: DMPinnedMessage[]) => void;
  addPinnedMessage: (dmId: string, message: DMPinnedMessage) => void;
  removePinnedMessage: (dmId: string, messageId: string) => void;

  // Shared Content
  setSharedFiles: (dmId: string, files: DMSharedFile[]) => void;
  addSharedFile: (dmId: string, file: DMSharedFile) => void;
  setMediaItems: (dmId: string, items: DMMediaItem[]) => void;
  addMediaItem: (dmId: string, item: DMMediaItem) => void;

  // Unread
  setUnreadCount: (dmId: string, count: number) => void;
  markAsRead: (dmId: string) => void;
  incrementUnread: (dmId: string) => void;
  recalculateTotalUnread: () => void;

  // Filters & Sort
  setFilterType: (filter: DMFilterType) => void;
  setSortType: (sort: DMSortType) => void;
  setSearchQuery: (query: string) => void;

  // Loading/Error
  setLoading: (loading: boolean) => void;
  setLoadingDM: (dmId: string | null) => void;
  setError: (error: string | null) => void;

  // Pagination
  setHasMoreDMs: (hasMore: boolean) => void;
  setDMListCursor: (cursor: string | null) => void;

  // UI State
  openNewDMModal: () => void;
  closeNewDMModal: () => void;
  openGroupDMCreate: () => void;
  closeGroupDMCreate: () => void;
  setSelectedUserIds: (ids: string[]) => void;
  toggleUserSelection: (userId: string) => void;
  clearUserSelection: () => void;

  // Participants (for group DMs)
  addParticipant: (dmId: string, participant: DMParticipant) => void;
  removeParticipant: (dmId: string, userId: string) => void;
  updateParticipant: (
    dmId: string,
    userId: string,
    updates: Partial<DMParticipant>,
  ) => void;

  // Utility
  clearDM: (dmId: string) => void;
  resetDMStore: () => void;
}

export type DMStore = DMState & DMActions;

// ============================================================================
// Initial State
// ============================================================================

const MAX_RECENT_DMS = 10;

const initialState: DMState = {
  dms: new Map(),
  dmsBySlug: new Map(),
  activeDMId: null,
  previousDMId: null,
  messagesByDM: {},
  loadingMessages: new Set(),
  hasMoreMessages: {},
  messageCursors: {},
  mutedDMs: new Set(),
  starredDMs: new Set(),
  archivedDMs: new Set(),
  recentDMs: [],
  notificationPreferences: new Map(),
  typingIndicators: {},
  readReceipts: {},
  pinnedMessages: {},
  sharedFiles: {},
  mediaItems: {},
  unreadCounts: {},
  totalUnreadCount: 0,
  filterType: "all",
  sortType: "recent",
  searchQuery: "",
  isLoading: false,
  isLoadingDM: null,
  error: null,
  hasMoreDMs: false,
  dmListCursor: null,
  isNewDMModalOpen: false,
  isGroupDMCreateOpen: false,
  selectedUserIds: [],
};

// ============================================================================
// Store
// ============================================================================

export const useDMStore = create<DMStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // DM CRUD
          setDMs: (dms) =>
            set(
              (state) => {
                state.dms = new Map(dms.map((dm) => [dm.id, dm]));
                state.dmsBySlug = new Map(dms.map((dm) => [dm.slug, dm.id]));
              },
              false,
              "dm/setDMs",
            ),

          addDM: (dm) =>
            set(
              (state) => {
                state.dms.set(dm.id, dm);
                state.dmsBySlug.set(dm.slug, dm.id);
              },
              false,
              "dm/addDM",
            ),

          updateDM: (dmId, updates) =>
            set(
              (state) => {
                const dm = state.dms.get(dmId);
                if (dm) {
                  const oldSlug = dm.slug;

                  // Mutate the draft directly (immer pattern)
                  Object.assign(dm, updates, {
                    updatedAt: new Date().toISOString(),
                  });

                  if (updates.slug && updates.slug !== oldSlug) {
                    state.dmsBySlug.delete(oldSlug);
                    state.dmsBySlug.set(updates.slug, dmId);
                  }
                }
              },
              false,
              "dm/updateDM",
            ),

          removeDM: (dmId) =>
            set(
              (state) => {
                const dm = state.dms.get(dmId);
                if (dm) {
                  state.dms.delete(dmId);
                  state.dmsBySlug.delete(dm.slug);
                  state.mutedDMs.delete(dmId);
                  state.starredDMs.delete(dmId);
                  state.archivedDMs.delete(dmId);
                  state.recentDMs = state.recentDMs.filter((id) => id !== dmId);
                  delete state.messagesByDM[dmId];
                  delete state.unreadCounts[dmId];
                  state.notificationPreferences.delete(dmId);

                  if (state.activeDMId === dmId) {
                    state.activeDMId = state.previousDMId;
                    state.previousDMId = null;
                  }
                }
              },
              false,
              "dm/removeDM",
            ),

          getDMById: (dmId) => get().dms.get(dmId),

          getDMBySlug: (slug) => {
            const dmId = get().dmsBySlug.get(slug);
            return dmId ? get().dms.get(dmId) : undefined;
          },

          // Active DM
          setActiveDM: (dmId) =>
            set(
              (state) => {
                if (state.activeDMId !== dmId) {
                  state.previousDMId = state.activeDMId;
                  state.activeDMId = dmId;

                  if (dmId) {
                    state.recentDMs = [
                      dmId,
                      ...state.recentDMs.filter((id) => id !== dmId),
                    ].slice(0, MAX_RECENT_DMS);
                  }
                }
              },
              false,
              "dm/setActiveDM",
            ),

          goToPreviousDM: () =>
            set(
              (state) => {
                if (state.previousDMId) {
                  const temp = state.activeDMId;
                  state.activeDMId = state.previousDMId;
                  state.previousDMId = temp;
                }
              },
              false,
              "dm/goToPreviousDM",
            ),

          // Messages
          setMessages: (dmId, messages) =>
            set(
              (state) => {
                state.messagesByDM[dmId] = messages;
              },
              false,
              "dm/setMessages",
            ),

          addMessage: (dmId, message) =>
            set(
              (state) => {
                if (!state.messagesByDM[dmId]) {
                  state.messagesByDM[dmId] = [];
                }
                state.messagesByDM[dmId].push(message);

                // Update DM's last message info
                const dm = state.dms.get(dmId);
                if (dm) {
                  dm.lastMessageId = message.id;
                  dm.lastMessageAt = message.createdAt;
                  dm.lastMessagePreview = message.content.slice(0, 100);
                  dm.lastMessageUserId = message.userId;
                }
              },
              false,
              "dm/addMessage",
            ),

          updateMessage: (dmId, messageId, updates) =>
            set(
              (state) => {
                const messages = state.messagesByDM[dmId];
                if (messages) {
                  const index = messages.findIndex((m) => m.id === messageId);
                  if (index !== -1) {
                    messages[index] = { ...messages[index], ...updates };
                  }
                }
              },
              false,
              "dm/updateMessage",
            ),

          removeMessage: (dmId, messageId) =>
            set(
              (state) => {
                const messages = state.messagesByDM[dmId];
                if (messages) {
                  state.messagesByDM[dmId] = messages.filter(
                    (m) => m.id !== messageId,
                  );
                }
              },
              false,
              "dm/removeMessage",
            ),

          prependMessages: (dmId, messages) =>
            set(
              (state) => {
                if (!state.messagesByDM[dmId]) {
                  state.messagesByDM[dmId] = [];
                }
                state.messagesByDM[dmId] = [
                  ...messages,
                  ...state.messagesByDM[dmId],
                ];
              },
              false,
              "dm/prependMessages",
            ),

          setMessagesLoading: (dmId, loading) =>
            set(
              (state) => {
                if (loading) {
                  state.loadingMessages.add(dmId);
                } else {
                  state.loadingMessages.delete(dmId);
                }
              },
              false,
              "dm/setMessagesLoading",
            ),

          setHasMoreMessages: (dmId, hasMore) =>
            set(
              (state) => {
                state.hasMoreMessages[dmId] = hasMore;
              },
              false,
              "dm/setHasMoreMessages",
            ),

          setMessageCursor: (dmId, cursor) =>
            set(
              (state) => {
                state.messageCursors[dmId] = cursor;
              },
              false,
              "dm/setMessageCursor",
            ),

          // Mute/Star/Archive
          toggleMuteDM: (dmId) =>
            set(
              (state) => {
                if (state.mutedDMs.has(dmId)) {
                  state.mutedDMs.delete(dmId);
                } else {
                  state.mutedDMs.add(dmId);
                }
              },
              false,
              "dm/toggleMuteDM",
            ),

          setDMMuted: (dmId, muted, muteUntil) =>
            set(
              (state) => {
                if (muted) {
                  state.mutedDMs.add(dmId);
                } else {
                  state.mutedDMs.delete(dmId);
                }
                const pref = state.notificationPreferences.get(dmId);
                if (pref) {
                  pref.muteUntil = muteUntil || null;
                }
              },
              false,
              "dm/setDMMuted",
            ),

          toggleStarDM: (dmId) =>
            set(
              (state) => {
                if (state.starredDMs.has(dmId)) {
                  state.starredDMs.delete(dmId);
                } else {
                  state.starredDMs.add(dmId);
                }
              },
              false,
              "dm/toggleStarDM",
            ),

          setDMStarred: (dmId, starred) =>
            set(
              (state) => {
                if (starred) {
                  state.starredDMs.add(dmId);
                } else {
                  state.starredDMs.delete(dmId);
                }
              },
              false,
              "dm/setDMStarred",
            ),

          archiveDM: (dmId) =>
            set(
              (state) => {
                state.archivedDMs.add(dmId);
                const dm = state.dms.get(dmId);
                if (dm) {
                  dm.status = "archived";
                  dm.archivedAt = new Date().toISOString();
                }
              },
              false,
              "dm/archiveDM",
            ),

          unarchiveDM: (dmId) =>
            set(
              (state) => {
                state.archivedDMs.delete(dmId);
                const dm = state.dms.get(dmId);
                if (dm) {
                  dm.status = "active";
                  dm.archivedAt = null;
                  dm.archivedBy = null;
                }
              },
              false,
              "dm/unarchiveDM",
            ),

          // Recent DMs
          addToRecentDMs: (dmId) =>
            set(
              (state) => {
                state.recentDMs = [
                  dmId,
                  ...state.recentDMs.filter((id) => id !== dmId),
                ].slice(0, MAX_RECENT_DMS);
              },
              false,
              "dm/addToRecentDMs",
            ),

          clearRecentDMs: () =>
            set(
              (state) => {
                state.recentDMs = [];
              },
              false,
              "dm/clearRecentDMs",
            ),

          // Notification Preferences
          setNotificationPreference: (dmId, preference) =>
            set(
              (state) => {
                state.notificationPreferences.set(dmId, preference);
              },
              false,
              "dm/setNotificationPreference",
            ),

          updateNotificationPreference: (dmId, updates) =>
            set(
              (state) => {
                const pref = state.notificationPreferences.get(dmId);
                if (pref) {
                  state.notificationPreferences.set(dmId, {
                    ...pref,
                    ...updates,
                  });
                }
              },
              false,
              "dm/updateNotificationPreference",
            ),

          // Typing Indicators
          setTypingIndicators: (dmId, indicators) =>
            set(
              (state) => {
                state.typingIndicators[dmId] = indicators;
              },
              false,
              "dm/setTypingIndicators",
            ),

          addTypingIndicator: (dmId, indicator) =>
            set(
              (state) => {
                if (!state.typingIndicators[dmId]) {
                  state.typingIndicators[dmId] = [];
                }
                const existing = state.typingIndicators[dmId].findIndex(
                  (i) => i.userId === indicator.userId,
                );
                if (existing === -1) {
                  state.typingIndicators[dmId].push(indicator);
                } else {
                  state.typingIndicators[dmId][existing] = indicator;
                }
              },
              false,
              "dm/addTypingIndicator",
            ),

          removeTypingIndicator: (dmId, userId) =>
            set(
              (state) => {
                if (state.typingIndicators[dmId]) {
                  state.typingIndicators[dmId] = state.typingIndicators[
                    dmId
                  ].filter((i) => i.userId !== userId);
                }
              },
              false,
              "dm/removeTypingIndicator",
            ),

          clearTypingIndicators: (dmId) =>
            set(
              (state) => {
                state.typingIndicators[dmId] = [];
              },
              false,
              "dm/clearTypingIndicators",
            ),

          // Read Receipts
          setReadReceipts: (dmId, receipts) =>
            set(
              (state) => {
                state.readReceipts[dmId] = receipts;
              },
              false,
              "dm/setReadReceipts",
            ),

          addReadReceipt: (dmId, receipt) =>
            set(
              (state) => {
                if (!state.readReceipts[dmId]) {
                  state.readReceipts[dmId] = [];
                }
                state.readReceipts[dmId].push(receipt);
              },
              false,
              "dm/addReadReceipt",
            ),

          // Pinned Messages
          setPinnedMessages: (dmId, messages) =>
            set(
              (state) => {
                state.pinnedMessages[dmId] = messages;
              },
              false,
              "dm/setPinnedMessages",
            ),

          addPinnedMessage: (dmId, message) =>
            set(
              (state) => {
                if (!state.pinnedMessages[dmId]) {
                  state.pinnedMessages[dmId] = [];
                }
                state.pinnedMessages[dmId].push(message);
              },
              false,
              "dm/addPinnedMessage",
            ),

          removePinnedMessage: (dmId, messageId) =>
            set(
              (state) => {
                if (state.pinnedMessages[dmId]) {
                  state.pinnedMessages[dmId] = state.pinnedMessages[
                    dmId
                  ].filter((p) => p.messageId !== messageId);
                }
              },
              false,
              "dm/removePinnedMessage",
            ),

          // Shared Content
          setSharedFiles: (dmId, files) =>
            set(
              (state) => {
                state.sharedFiles[dmId] = files;
              },
              false,
              "dm/setSharedFiles",
            ),

          addSharedFile: (dmId, file) =>
            set(
              (state) => {
                if (!state.sharedFiles[dmId]) {
                  state.sharedFiles[dmId] = [];
                }
                state.sharedFiles[dmId].unshift(file);
              },
              false,
              "dm/addSharedFile",
            ),

          setMediaItems: (dmId, items) =>
            set(
              (state) => {
                state.mediaItems[dmId] = items;
              },
              false,
              "dm/setMediaItems",
            ),

          addMediaItem: (dmId, item) =>
            set(
              (state) => {
                if (!state.mediaItems[dmId]) {
                  state.mediaItems[dmId] = [];
                }
                state.mediaItems[dmId].unshift(item);
              },
              false,
              "dm/addMediaItem",
            ),

          // Unread
          setUnreadCount: (dmId, count) =>
            set(
              (state) => {
                state.unreadCounts[dmId] = count;
                const dm = state.dms.get(dmId);
                if (dm) {
                  dm.unreadCount = count;
                  dm.hasUnread = count > 0;
                }
              },
              false,
              "dm/setUnreadCount",
            ),

          markAsRead: (dmId) =>
            set(
              (state) => {
                const prevCount = state.unreadCounts[dmId] || 0;
                state.unreadCounts[dmId] = 0;
                state.totalUnreadCount = Math.max(
                  0,
                  state.totalUnreadCount - prevCount,
                );
                const dm = state.dms.get(dmId);
                if (dm) {
                  dm.unreadCount = 0;
                  dm.hasUnread = false;
                }
              },
              false,
              "dm/markAsRead",
            ),

          incrementUnread: (dmId) =>
            set(
              (state) => {
                state.unreadCounts[dmId] = (state.unreadCounts[dmId] || 0) + 1;
                state.totalUnreadCount += 1;
                const dm = state.dms.get(dmId);
                if (dm) {
                  dm.unreadCount = state.unreadCounts[dmId];
                  dm.hasUnread = true;
                }
              },
              false,
              "dm/incrementUnread",
            ),

          recalculateTotalUnread: () =>
            set(
              (state) => {
                state.totalUnreadCount = Object.values(
                  state.unreadCounts,
                ).reduce((sum, count) => sum + count, 0);
              },
              false,
              "dm/recalculateTotalUnread",
            ),

          // Filters & Sort
          setFilterType: (filter) =>
            set(
              (state) => {
                state.filterType = filter;
              },
              false,
              "dm/setFilterType",
            ),

          setSortType: (sort) =>
            set(
              (state) => {
                state.sortType = sort;
              },
              false,
              "dm/setSortType",
            ),

          setSearchQuery: (query) =>
            set(
              (state) => {
                state.searchQuery = query;
              },
              false,
              "dm/setSearchQuery",
            ),

          // Loading/Error
          setLoading: (loading) =>
            set(
              (state) => {
                state.isLoading = loading;
              },
              false,
              "dm/setLoading",
            ),

          setLoadingDM: (dmId) =>
            set(
              (state) => {
                state.isLoadingDM = dmId;
              },
              false,
              "dm/setLoadingDM",
            ),

          setError: (error) =>
            set(
              (state) => {
                state.error = error;
              },
              false,
              "dm/setError",
            ),

          // Pagination
          setHasMoreDMs: (hasMore) =>
            set(
              (state) => {
                state.hasMoreDMs = hasMore;
              },
              false,
              "dm/setHasMoreDMs",
            ),

          setDMListCursor: (cursor) =>
            set(
              (state) => {
                state.dmListCursor = cursor;
              },
              false,
              "dm/setDMListCursor",
            ),

          // UI State
          openNewDMModal: () =>
            set(
              (state) => {
                state.isNewDMModalOpen = true;
                state.selectedUserIds = [];
              },
              false,
              "dm/openNewDMModal",
            ),

          closeNewDMModal: () =>
            set(
              (state) => {
                state.isNewDMModalOpen = false;
                state.selectedUserIds = [];
              },
              false,
              "dm/closeNewDMModal",
            ),

          openGroupDMCreate: () =>
            set(
              (state) => {
                state.isGroupDMCreateOpen = true;
                state.selectedUserIds = [];
              },
              false,
              "dm/openGroupDMCreate",
            ),

          closeGroupDMCreate: () =>
            set(
              (state) => {
                state.isGroupDMCreateOpen = false;
                state.selectedUserIds = [];
              },
              false,
              "dm/closeGroupDMCreate",
            ),

          setSelectedUserIds: (ids) =>
            set(
              (state) => {
                state.selectedUserIds = ids;
              },
              false,
              "dm/setSelectedUserIds",
            ),

          toggleUserSelection: (userId) =>
            set(
              (state) => {
                const index = state.selectedUserIds.indexOf(userId);
                if (index === -1) {
                  state.selectedUserIds.push(userId);
                } else {
                  state.selectedUserIds.splice(index, 1);
                }
              },
              false,
              "dm/toggleUserSelection",
            ),

          clearUserSelection: () =>
            set(
              (state) => {
                state.selectedUserIds = [];
              },
              false,
              "dm/clearUserSelection",
            ),

          // Participants
          addParticipant: (dmId, participant) =>
            set(
              (state) => {
                const dm = state.dms.get(dmId);
                if (dm) {
                  dm.participants.push(participant);
                  dm.participantCount = dm.participants.length;
                }
              },
              false,
              "dm/addParticipant",
            ),

          removeParticipant: (dmId, userId) =>
            set(
              (state) => {
                const dm = state.dms.get(dmId);
                if (dm) {
                  dm.participants = dm.participants.filter(
                    (p) => p.userId !== userId,
                  );
                  dm.participantCount = dm.participants.length;
                }
              },
              false,
              "dm/removeParticipant",
            ),

          updateParticipant: (dmId, userId, updates) =>
            set(
              (state) => {
                const dm = state.dms.get(dmId);
                if (dm) {
                  const participant = dm.participants.find(
                    (p) => p.userId === userId,
                  );
                  if (participant) {
                    Object.assign(participant, updates);
                  }
                }
              },
              false,
              "dm/updateParticipant",
            ),

          // Utility
          clearDM: (dmId) =>
            set(
              (state) => {
                delete state.messagesByDM[dmId];
                delete state.typingIndicators[dmId];
                delete state.readReceipts[dmId];
                delete state.pinnedMessages[dmId];
                delete state.sharedFiles[dmId];
                delete state.mediaItems[dmId];
                delete state.unreadCounts[dmId];
                state.loadingMessages.delete(dmId);
              },
              false,
              "dm/clearDM",
            ),

          resetDMStore: () =>
            set(
              () => ({
                ...initialState,
                dms: new Map(),
                dmsBySlug: new Map(),
                mutedDMs: new Set(),
                starredDMs: new Set(),
                archivedDMs: new Set(),
                loadingMessages: new Set(),
                notificationPreferences: new Map(),
              }),
              false,
              "dm/resetDMStore",
            ),
        })),
        {
          name: "dm-store",
          partialize: (state) => ({
            mutedDMs: Array.from(state.mutedDMs),
            starredDMs: Array.from(state.starredDMs),
            recentDMs: state.recentDMs,
            filterType: state.filterType,
            sortType: state.sortType,
          }),
          merge: (persisted, current) => {
            const merged = { ...current };
            if (persisted && typeof persisted === "object") {
              const p = persisted as Record<string, unknown>;
              if (Array.isArray(p.mutedDMs)) {
                merged.mutedDMs = new Set(p.mutedDMs as string[]);
              }
              if (Array.isArray(p.starredDMs)) {
                merged.starredDMs = new Set(p.starredDMs as string[]);
              }
              if (Array.isArray(p.recentDMs)) {
                merged.recentDMs = p.recentDMs as string[];
              }
              if (p.filterType) {
                merged.filterType = p.filterType as DMFilterType;
              }
              if (p.sortType) {
                merged.sortType = p.sortType as DMSortType;
              }
            }
            return merged;
          },
        },
      ),
    ),
    { name: "dm-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectActiveDM = (state: DMStore) =>
  state.activeDMId ? state.dms.get(state.activeDMId) : undefined;

export const selectDMList = (state: DMStore) => Array.from(state.dms.values());

export const selectDirectDMs = (state: DMStore) =>
  Array.from(state.dms.values()).filter((dm) => dm.type === "direct");

export const selectGroupDMs = (state: DMStore) =>
  Array.from(state.dms.values()).filter((dm) => dm.type === "group");

export const selectStarredDMs = (state: DMStore) =>
  Array.from(state.dms.values()).filter((dm) => state.starredDMs.has(dm.id));

export const selectMutedDMs = (state: DMStore) =>
  Array.from(state.dms.values()).filter((dm) => state.mutedDMs.has(dm.id));

export const selectArchivedDMs = (state: DMStore) =>
  Array.from(state.dms.values()).filter((dm) => state.archivedDMs.has(dm.id));

export const selectActiveDMs = (state: DMStore) =>
  Array.from(state.dms.values()).filter((dm) => dm.status === "active");

export const selectUnreadDMs = (state: DMStore) =>
  Array.from(state.dms.values()).filter((dm) => (dm.unreadCount || 0) > 0);

export const selectRecentDMs = (state: DMStore) =>
  state.recentDMs
    .map((id) => state.dms.get(id))
    .filter((dm): dm is DirectMessage => dm !== undefined);

export const selectMessages = (dmId: string) => (state: DMStore) =>
  state.messagesByDM[dmId] ?? [];

export const selectTypingUsers = (dmId: string) => (state: DMStore) =>
  state.typingIndicators[dmId] ?? [];

export const selectIsDMMuted = (dmId: string) => (state: DMStore) =>
  state.mutedDMs.has(dmId);

export const selectIsDMStarred = (dmId: string) => (state: DMStore) =>
  state.starredDMs.has(dmId);

export const selectPinnedMessages = (dmId: string) => (state: DMStore) =>
  state.pinnedMessages[dmId] ?? [];

export const selectSharedFiles = (dmId: string) => (state: DMStore) =>
  state.sharedFiles[dmId] ?? [];

export const selectMediaItems = (dmId: string) => (state: DMStore) =>
  state.mediaItems[dmId] ?? [];

export const selectFilteredDMs = (state: DMStore) => {
  let dms = Array.from(state.dms.values());

  // Apply filter
  switch (state.filterType) {
    case "unread":
      dms = dms.filter((dm) => (dm.unreadCount || 0) > 0);
      break;
    case "starred":
      dms = dms.filter((dm) => state.starredDMs.has(dm.id));
      break;
    case "archived":
      dms = dms.filter((dm) => state.archivedDMs.has(dm.id));
      break;
    case "muted":
      dms = dms.filter((dm) => state.mutedDMs.has(dm.id));
      break;
    case "all":
    default:
      dms = dms.filter((dm) => dm.status === "active");
  }

  // Apply search
  if (state.searchQuery.trim()) {
    const query = state.searchQuery.toLowerCase();
    dms = dms.filter((dm) => {
      if (dm.name?.toLowerCase().includes(query)) return true;
      return dm.participants.some(
        (p) =>
          p.user.displayName?.toLowerCase().includes(query) ||
          p.user.username.toLowerCase().includes(query),
      );
    });
  }

  // Apply sort
  switch (state.sortType) {
    case "unread":
      dms.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
      break;
    case "alphabetical":
      dms.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      break;
    case "recent":
    default:
      dms.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  return dms;
};
