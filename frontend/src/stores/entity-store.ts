/**
 * Unified Entity Store
 *
 * Manages all chat entity types in a single store:
 * - Direct Messages (DM)
 * - Groups
 * - Supergroups
 * - Communities
 * - Channels
 *
 * @module stores/entity-store
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  ChatEntity,
  ChatEntityType,
  DirectMessageEntity,
  GroupEntity,
  SupergroupEntity,
  CommunityEntity,
  ChannelEntity,
  EntityMember,
  EntityStatus,
  LastMessagePreview,
} from "@/types/entities";

import {
  isDirectMessage,
  isGroup,
  isSupergroup,
  isCommunity,
  isChannel,
} from "@/lib/entities";

// =============================================================================
// TYPES
// =============================================================================

export interface EntityFilter {
  types?: ChatEntityType[];
  status?: EntityStatus[];
  search?: string;
  visibility?: ("private" | "public" | "discoverable")[];
  hasUnread?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
}

export type EntitySortBy =
  | "recent"
  | "name"
  | "unread"
  | "memberCount"
  | "created";
export type SortOrder = "asc" | "desc";

export interface EntityListOptions {
  filter?: EntityFilter;
  sortBy?: EntitySortBy;
  sortOrder?: SortOrder;
  limit?: number;
  offset?: number;
}

// =============================================================================
// STATE
// =============================================================================

export interface EntityState {
  // Entity data by type for efficient lookups
  entities: Map<string, ChatEntity>;
  entitiesBySlug: Map<string, string>; // slug -> id

  // Categorized entity IDs for quick access
  dmIds: Set<string>;
  groupIds: Set<string>;
  supergroupIds: Set<string>;
  communityIds: Set<string>;
  channelIds: Set<string>;

  // Active entity
  activeEntityId: string | null;
  previousEntityId: string | null;

  // User preferences
  mutedEntityIds: Set<string>;
  pinnedEntityIds: Set<string>;
  archivedEntityIds: Set<string>;
  hiddenEntityIds: Set<string>;

  // Unread tracking
  unreadCounts: Record<string, number>;
  totalUnreadCount: number;

  // Recent entities (for quick access)
  recentEntityIds: string[];

  // Loading states
  isLoading: boolean;
  loadingEntityId: string | null;
  error: string | null;

  // Pagination
  hasMore: boolean;
  cursor: string | null;
}

// =============================================================================
// ACTIONS
// =============================================================================

export interface EntityActions {
  // CRUD
  setEntities: (entities: ChatEntity[]) => void;
  addEntity: (entity: ChatEntity) => void;
  updateEntity: (entityId: string, updates: Partial<ChatEntity>) => void;
  removeEntity: (entityId: string) => void;
  getEntityById: (entityId: string) => ChatEntity | undefined;
  getEntityBySlug: (slug: string) => ChatEntity | undefined;

  // Active entity
  setActiveEntity: (entityId: string | null) => void;
  goToPreviousEntity: () => void;

  // Filtering and selection
  getEntitiesByType: (type: ChatEntityType) => ChatEntity[];
  getFilteredEntities: (options: EntityListOptions) => ChatEntity[];
  getAllDMs: () => DirectMessageEntity[];
  getAllGroups: () => GroupEntity[];
  getAllSupergroups: () => SupergroupEntity[];
  getAllCommunities: () => CommunityEntity[];
  getAllChannels: () => ChannelEntity[];

  // User preferences
  toggleMute: (entityId: string) => void;
  setMuted: (entityId: string, muted: boolean) => void;
  togglePin: (entityId: string) => void;
  setPin: (entityId: string, pinned: boolean) => void;
  archiveEntity: (entityId: string) => void;
  unarchiveEntity: (entityId: string) => void;
  hideEntity: (entityId: string) => void;
  unhideEntity: (entityId: string) => void;

  // Unread tracking
  setUnreadCount: (entityId: string, count: number) => void;
  incrementUnread: (entityId: string) => void;
  markAsRead: (entityId: string) => void;
  markAllAsRead: () => void;
  recalculateTotalUnread: () => void;

  // Recent entities
  addToRecent: (entityId: string) => void;
  clearRecent: () => void;

  // Last message updates
  updateLastMessage: (entityId: string, message: LastMessagePreview) => void;

  // Loading states
  setLoading: (loading: boolean) => void;
  setLoadingEntity: (entityId: string | null) => void;
  setError: (error: string | null) => void;

  // Pagination
  setHasMore: (hasMore: boolean) => void;
  setCursor: (cursor: string | null) => void;

  // Bulk operations
  muteMultiple: (entityIds: string[]) => void;
  archiveMultiple: (entityIds: string[]) => void;
  deleteMultiple: (entityIds: string[]) => void;

  // Reset
  resetStore: () => void;
}

export type EntityStore = EntityState & EntityActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const MAX_RECENT_ENTITIES = 20;

const initialState: EntityState = {
  entities: new Map(),
  entitiesBySlug: new Map(),
  dmIds: new Set(),
  groupIds: new Set(),
  supergroupIds: new Set(),
  communityIds: new Set(),
  channelIds: new Set(),
  activeEntityId: null,
  previousEntityId: null,
  mutedEntityIds: new Set(),
  pinnedEntityIds: new Set(),
  archivedEntityIds: new Set(),
  hiddenEntityIds: new Set(),
  unreadCounts: {},
  totalUnreadCount: 0,
  recentEntityIds: [],
  isLoading: false,
  loadingEntityId: null,
  error: null,
  hasMore: false,
  cursor: null,
};

// =============================================================================
// STORE
// =============================================================================

export const useEntityStore = create<EntityStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // ===================================================================
          // CRUD Operations
          // ===================================================================

          setEntities: (entities) =>
            set(
              (state) => {
                state.entities = new Map();
                state.entitiesBySlug = new Map();
                state.dmIds = new Set();
                state.groupIds = new Set();
                state.supergroupIds = new Set();
                state.communityIds = new Set();
                state.channelIds = new Set();

                entities.forEach((entity) => {
                  state.entities.set(entity.id, entity);
                  state.entitiesBySlug.set(entity.slug, entity.id);
                  addToTypeSet(state, entity);
                });
              },
              false,
              "entity/setEntities",
            ),

          addEntity: (entity) =>
            set(
              (state) => {
                state.entities.set(entity.id, entity);
                state.entitiesBySlug.set(entity.slug, entity.id);
                addToTypeSet(state, entity);
              },
              false,
              "entity/addEntity",
            ),

          updateEntity: (entityId, updates) =>
            set(
              (state) => {
                const entity = state.entities.get(entityId);
                if (entity) {
                  const oldSlug = entity.slug;
                  const updated = {
                    ...entity,
                    ...updates,
                    updatedAt: new Date().toISOString(),
                  };
                  state.entities.set(entityId, updated as ChatEntity);

                  // Update slug mapping if changed
                  if (updates.slug && updates.slug !== oldSlug) {
                    state.entitiesBySlug.delete(oldSlug);
                    state.entitiesBySlug.set(updates.slug, entityId);
                  }
                }
              },
              false,
              "entity/updateEntity",
            ),

          removeEntity: (entityId) =>
            set(
              (state) => {
                const entity = state.entities.get(entityId);
                if (entity) {
                  state.entities.delete(entityId);
                  state.entitiesBySlug.delete(entity.slug);
                  removeFromTypeSet(state, entity);

                  // Clean up related state
                  state.mutedEntityIds.delete(entityId);
                  state.pinnedEntityIds.delete(entityId);
                  state.archivedEntityIds.delete(entityId);
                  state.hiddenEntityIds.delete(entityId);
                  state.recentEntityIds = state.recentEntityIds.filter(
                    (id) => id !== entityId,
                  );
                  delete state.unreadCounts[entityId];

                  // Update active entity if needed
                  if (state.activeEntityId === entityId) {
                    state.activeEntityId = state.previousEntityId;
                    state.previousEntityId = null;
                  }
                }
              },
              false,
              "entity/removeEntity",
            ),

          getEntityById: (entityId) => get().entities.get(entityId),

          getEntityBySlug: (slug) => {
            const entityId = get().entitiesBySlug.get(slug);
            return entityId ? get().entities.get(entityId) : undefined;
          },

          // ===================================================================
          // Active Entity
          // ===================================================================

          setActiveEntity: (entityId) =>
            set(
              (state) => {
                if (state.activeEntityId !== entityId) {
                  state.previousEntityId = state.activeEntityId;
                  state.activeEntityId = entityId;

                  if (entityId) {
                    // Add to recent
                    state.recentEntityIds = [
                      entityId,
                      ...state.recentEntityIds.filter((id) => id !== entityId),
                    ].slice(0, MAX_RECENT_ENTITIES);

                    // Mark as read
                    const prevCount = state.unreadCounts[entityId] || 0;
                    state.unreadCounts[entityId] = 0;
                    state.totalUnreadCount = Math.max(
                      0,
                      state.totalUnreadCount - prevCount,
                    );
                  }
                }
              },
              false,
              "entity/setActiveEntity",
            ),

          goToPreviousEntity: () =>
            set(
              (state) => {
                if (state.previousEntityId) {
                  const temp = state.activeEntityId;
                  state.activeEntityId = state.previousEntityId;
                  state.previousEntityId = temp;
                }
              },
              false,
              "entity/goToPreviousEntity",
            ),

          // ===================================================================
          // Filtering and Selection
          // ===================================================================

          getEntitiesByType: (type) => {
            const state = get();
            let ids: Set<string>;

            switch (type) {
              case "dm":
                ids = state.dmIds;
                break;
              case "group":
                ids = state.groupIds;
                break;
              case "supergroup":
                ids = state.supergroupIds;
                break;
              case "community":
                ids = state.communityIds;
                break;
              case "channel":
                ids = state.channelIds;
                break;
              default:
                return [];
            }

            return Array.from(ids)
              .map((id) => state.entities.get(id))
              .filter((e): e is ChatEntity => !!e);
          },

          getFilteredEntities: (options) => {
            const state = get();
            let entities = Array.from(state.entities.values());

            const { filter, sortBy = "recent", sortOrder = "desc" } = options;

            // Apply filters
            if (filter) {
              if (filter.types?.length) {
                entities = entities.filter((e) =>
                  filter.types!.includes(e.type),
                );
              }

              if (filter.status?.length) {
                entities = entities.filter((e) =>
                  filter.status!.includes(e.status),
                );
              }

              if (filter.visibility?.length) {
                entities = entities.filter((e) =>
                  filter.visibility!.includes(e.visibility),
                );
              }

              if (filter.search) {
                const searchLower = filter.search.toLowerCase();
                entities = entities.filter(
                  (e) =>
                    e.name.toLowerCase().includes(searchLower) ||
                    e.description?.toLowerCase().includes(searchLower),
                );
              }

              if (filter.hasUnread === true) {
                entities = entities.filter(
                  (e) => (state.unreadCounts[e.id] || 0) > 0,
                );
              }

              if (filter.isPinned === true) {
                entities = entities.filter((e) =>
                  state.pinnedEntityIds.has(e.id),
                );
              }

              if (filter.isMuted === true) {
                entities = entities.filter((e) =>
                  state.mutedEntityIds.has(e.id),
                );
              }
            }

            // Exclude hidden and archived by default
            entities = entities.filter(
              (e) =>
                !state.hiddenEntityIds.has(e.id) &&
                !state.archivedEntityIds.has(e.id),
            );

            // Sort
            entities.sort((a, b) => {
              let comparison = 0;

              switch (sortBy) {
                case "recent": {
                  const aTime = getLastActivityTime(a);
                  const bTime = getLastActivityTime(b);
                  comparison = bTime - aTime;
                  break;
                }
                case "name":
                  comparison = a.name.localeCompare(b.name);
                  break;
                case "unread":
                  comparison =
                    (state.unreadCounts[b.id] || 0) -
                    (state.unreadCounts[a.id] || 0);
                  break;
                case "memberCount":
                  comparison = b.memberCount - a.memberCount;
                  break;
                case "created":
                  comparison =
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime();
                  break;
              }

              return sortOrder === "asc" ? -comparison : comparison;
            });

            // Apply pagination
            if (options.offset) {
              entities = entities.slice(options.offset);
            }
            if (options.limit) {
              entities = entities.slice(0, options.limit);
            }

            return entities;
          },

          getAllDMs: () =>
            get().getEntitiesByType("dm") as DirectMessageEntity[],

          getAllGroups: () => get().getEntitiesByType("group") as GroupEntity[],

          getAllSupergroups: () =>
            get().getEntitiesByType("supergroup") as SupergroupEntity[],

          getAllCommunities: () =>
            get().getEntitiesByType("community") as CommunityEntity[],

          getAllChannels: () =>
            get().getEntitiesByType("channel") as ChannelEntity[],

          // ===================================================================
          // User Preferences
          // ===================================================================

          toggleMute: (entityId) =>
            set(
              (state) => {
                if (state.mutedEntityIds.has(entityId)) {
                  state.mutedEntityIds.delete(entityId);
                } else {
                  state.mutedEntityIds.add(entityId);
                }
              },
              false,
              "entity/toggleMute",
            ),

          setMuted: (entityId, muted) =>
            set(
              (state) => {
                if (muted) {
                  state.mutedEntityIds.add(entityId);
                } else {
                  state.mutedEntityIds.delete(entityId);
                }
              },
              false,
              "entity/setMuted",
            ),

          togglePin: (entityId) =>
            set(
              (state) => {
                if (state.pinnedEntityIds.has(entityId)) {
                  state.pinnedEntityIds.delete(entityId);
                } else {
                  state.pinnedEntityIds.add(entityId);
                }
              },
              false,
              "entity/togglePin",
            ),

          setPin: (entityId, pinned) =>
            set(
              (state) => {
                if (pinned) {
                  state.pinnedEntityIds.add(entityId);
                } else {
                  state.pinnedEntityIds.delete(entityId);
                }
              },
              false,
              "entity/setPin",
            ),

          archiveEntity: (entityId) =>
            set(
              (state) => {
                state.archivedEntityIds.add(entityId);
                const entity = state.entities.get(entityId);
                if (entity) {
                  (entity as ChatEntity).status = "archived";
                }
              },
              false,
              "entity/archiveEntity",
            ),

          unarchiveEntity: (entityId) =>
            set(
              (state) => {
                state.archivedEntityIds.delete(entityId);
                const entity = state.entities.get(entityId);
                if (entity) {
                  (entity as ChatEntity).status = "active";
                }
              },
              false,
              "entity/unarchiveEntity",
            ),

          hideEntity: (entityId) =>
            set(
              (state) => {
                state.hiddenEntityIds.add(entityId);
              },
              false,
              "entity/hideEntity",
            ),

          unhideEntity: (entityId) =>
            set(
              (state) => {
                state.hiddenEntityIds.delete(entityId);
              },
              false,
              "entity/unhideEntity",
            ),

          // ===================================================================
          // Unread Tracking
          // ===================================================================

          setUnreadCount: (entityId, count) =>
            set(
              (state) => {
                const oldCount = state.unreadCounts[entityId] || 0;
                state.unreadCounts[entityId] = count;
                state.totalUnreadCount += count - oldCount;
              },
              false,
              "entity/setUnreadCount",
            ),

          incrementUnread: (entityId) =>
            set(
              (state) => {
                state.unreadCounts[entityId] =
                  (state.unreadCounts[entityId] || 0) + 1;
                state.totalUnreadCount += 1;
              },
              false,
              "entity/incrementUnread",
            ),

          markAsRead: (entityId) =>
            set(
              (state) => {
                const count = state.unreadCounts[entityId] || 0;
                state.unreadCounts[entityId] = 0;
                state.totalUnreadCount = Math.max(
                  0,
                  state.totalUnreadCount - count,
                );
              },
              false,
              "entity/markAsRead",
            ),

          markAllAsRead: () =>
            set(
              (state) => {
                state.unreadCounts = {};
                state.totalUnreadCount = 0;
              },
              false,
              "entity/markAllAsRead",
            ),

          recalculateTotalUnread: () =>
            set(
              (state) => {
                state.totalUnreadCount = Object.values(
                  state.unreadCounts,
                ).reduce((sum, count) => sum + count, 0);
              },
              false,
              "entity/recalculateTotalUnread",
            ),

          // ===================================================================
          // Recent Entities
          // ===================================================================

          addToRecent: (entityId) =>
            set(
              (state) => {
                state.recentEntityIds = [
                  entityId,
                  ...state.recentEntityIds.filter((id) => id !== entityId),
                ].slice(0, MAX_RECENT_ENTITIES);
              },
              false,
              "entity/addToRecent",
            ),

          clearRecent: () =>
            set(
              (state) => {
                state.recentEntityIds = [];
              },
              false,
              "entity/clearRecent",
            ),

          // ===================================================================
          // Last Message Updates
          // ===================================================================

          updateLastMessage: (entityId, message) =>
            set(
              (state) => {
                const entity = state.entities.get(entityId);
                if (entity && "lastMessage" in entity) {
                  (entity as GroupEntity).lastMessage = message;
                  entity.updatedAt = message.timestamp;
                }
              },
              false,
              "entity/updateLastMessage",
            ),

          // ===================================================================
          // Loading States
          // ===================================================================

          setLoading: (loading) =>
            set(
              (state) => {
                state.isLoading = loading;
              },
              false,
              "entity/setLoading",
            ),

          setLoadingEntity: (entityId) =>
            set(
              (state) => {
                state.loadingEntityId = entityId;
              },
              false,
              "entity/setLoadingEntity",
            ),

          setError: (error) =>
            set(
              (state) => {
                state.error = error;
              },
              false,
              "entity/setError",
            ),

          // ===================================================================
          // Pagination
          // ===================================================================

          setHasMore: (hasMore) =>
            set(
              (state) => {
                state.hasMore = hasMore;
              },
              false,
              "entity/setHasMore",
            ),

          setCursor: (cursor) =>
            set(
              (state) => {
                state.cursor = cursor;
              },
              false,
              "entity/setCursor",
            ),

          // ===================================================================
          // Bulk Operations
          // ===================================================================

          muteMultiple: (entityIds) =>
            set(
              (state) => {
                entityIds.forEach((id) => state.mutedEntityIds.add(id));
              },
              false,
              "entity/muteMultiple",
            ),

          archiveMultiple: (entityIds) =>
            set(
              (state) => {
                entityIds.forEach((id) => {
                  state.archivedEntityIds.add(id);
                  const entity = state.entities.get(id);
                  if (entity) {
                    (entity as ChatEntity).status = "archived";
                  }
                });
              },
              false,
              "entity/archiveMultiple",
            ),

          deleteMultiple: (entityIds) =>
            set(
              (state) => {
                entityIds.forEach((entityId) => {
                  const entity = state.entities.get(entityId);
                  if (entity) {
                    state.entities.delete(entityId);
                    state.entitiesBySlug.delete(entity.slug);
                    removeFromTypeSet(state, entity);
                    state.mutedEntityIds.delete(entityId);
                    state.pinnedEntityIds.delete(entityId);
                    state.archivedEntityIds.delete(entityId);
                    state.hiddenEntityIds.delete(entityId);
                    delete state.unreadCounts[entityId];
                  }
                });
                state.recentEntityIds = state.recentEntityIds.filter(
                  (id) => !entityIds.includes(id),
                );
              },
              false,
              "entity/deleteMultiple",
            ),

          // ===================================================================
          // Reset
          // ===================================================================

          resetStore: () =>
            set(
              () => ({
                ...initialState,
                entities: new Map(),
                entitiesBySlug: new Map(),
                dmIds: new Set(),
                groupIds: new Set(),
                supergroupIds: new Set(),
                communityIds: new Set(),
                channelIds: new Set(),
                mutedEntityIds: new Set(),
                pinnedEntityIds: new Set(),
                archivedEntityIds: new Set(),
                hiddenEntityIds: new Set(),
              }),
              false,
              "entity/resetStore",
            ),
        })),
        {
          name: "entity-store",
          partialize: (state) => ({
            mutedEntityIds: Array.from(state.mutedEntityIds),
            pinnedEntityIds: Array.from(state.pinnedEntityIds),
            archivedEntityIds: Array.from(state.archivedEntityIds),
            hiddenEntityIds: Array.from(state.hiddenEntityIds),
            recentEntityIds: state.recentEntityIds,
          }),
          merge: (persisted, current) => {
            const merged = { ...current };
            if (persisted && typeof persisted === "object") {
              const p = persisted as Record<string, unknown>;
              if (Array.isArray(p.mutedEntityIds)) {
                merged.mutedEntityIds = new Set(p.mutedEntityIds as string[]);
              }
              if (Array.isArray(p.pinnedEntityIds)) {
                merged.pinnedEntityIds = new Set(p.pinnedEntityIds as string[]);
              }
              if (Array.isArray(p.archivedEntityIds)) {
                merged.archivedEntityIds = new Set(
                  p.archivedEntityIds as string[],
                );
              }
              if (Array.isArray(p.hiddenEntityIds)) {
                merged.hiddenEntityIds = new Set(p.hiddenEntityIds as string[]);
              }
              if (Array.isArray(p.recentEntityIds)) {
                merged.recentEntityIds = p.recentEntityIds as string[];
              }
            }
            return merged;
          },
        },
      ),
    ),
    { name: "entity-store" },
  ),
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function addToTypeSet(state: EntityState, entity: ChatEntity) {
  switch (entity.type) {
    case "dm":
      state.dmIds.add(entity.id);
      break;
    case "group":
      state.groupIds.add(entity.id);
      break;
    case "supergroup":
      state.supergroupIds.add(entity.id);
      break;
    case "community":
      state.communityIds.add(entity.id);
      break;
    case "channel":
      state.channelIds.add(entity.id);
      break;
  }
}

function removeFromTypeSet(state: EntityState, entity: ChatEntity) {
  switch (entity.type) {
    case "dm":
      state.dmIds.delete(entity.id);
      break;
    case "group":
      state.groupIds.delete(entity.id);
      break;
    case "supergroup":
      state.supergroupIds.delete(entity.id);
      break;
    case "community":
      state.communityIds.delete(entity.id);
      break;
    case "channel":
      state.channelIds.delete(entity.id);
      break;
  }
}

function getLastActivityTime(entity: ChatEntity): number {
  // Check for lastMessage in entities that have it
  if ("lastMessage" in entity && entity.lastMessage) {
    return new Date(entity.lastMessage.timestamp).getTime();
  }
  if ("lastPost" in entity && entity.lastPost) {
    return new Date(entity.lastPost.timestamp).getTime();
  }
  return new Date(entity.updatedAt).getTime();
}

// =============================================================================
// SELECTORS
// =============================================================================

export const selectActiveEntity = (state: EntityStore) =>
  state.activeEntityId ? state.entities.get(state.activeEntityId) : undefined;

export const selectEntityCount = (state: EntityStore) => state.entities.size;

export const selectDMCount = (state: EntityStore) => state.dmIds.size;

export const selectGroupCount = (state: EntityStore) => state.groupIds.size;

export const selectSupergroupCount = (state: EntityStore) =>
  state.supergroupIds.size;

export const selectCommunityCount = (state: EntityStore) =>
  state.communityIds.size;

export const selectChannelCount = (state: EntityStore) => state.channelIds.size;

export const selectRecentEntities = (state: EntityStore) =>
  state.recentEntityIds
    .map((id) => state.entities.get(id))
    .filter((e): e is ChatEntity => !!e);

export const selectPinnedEntities = (state: EntityStore) =>
  Array.from(state.pinnedEntityIds)
    .map((id) => state.entities.get(id))
    .filter((e): e is ChatEntity => !!e);

export const selectMutedEntities = (state: EntityStore) =>
  Array.from(state.mutedEntityIds)
    .map((id) => state.entities.get(id))
    .filter((e): e is ChatEntity => !!e);

export const selectUnreadEntities = (state: EntityStore) =>
  Array.from(state.entities.values()).filter(
    (e) => (state.unreadCounts[e.id] || 0) > 0,
  );

export const selectIsEntityMuted = (entityId: string) => (state: EntityStore) =>
  state.mutedEntityIds.has(entityId);

export const selectIsEntityPinned =
  (entityId: string) => (state: EntityStore) =>
    state.pinnedEntityIds.has(entityId);

export const selectEntityUnreadCount =
  (entityId: string) => (state: EntityStore) =>
    state.unreadCounts[entityId] || 0;
