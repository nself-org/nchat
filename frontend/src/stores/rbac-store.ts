/**
 * RBAC Store - Extended Zustand store for role-based access control
 *
 * Provides centralized state management for user permissions, channel permissions,
 * and permission caching with real-time updates support.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  type Role,
  type Permission,
  PERMISSIONS,
  ROLE_HIERARCHY,
} from "@/types/rbac";
import {
  type PermissionResult,
  type PermissionContext,
  PermissionRuleEngine,
  createRuleEngine,
  createMessagePermissionRules,
  createChannelPermissionRules,
  createUserPermissionRules,
} from "@/lib/rbac/permission-builder";
import {
  type ChannelPermissionOverride,
  type ChannelBan,
  type EffectiveChannelPermissions,
  ChannelPermissionManager,
  createChannelPermissionManager,
} from "@/lib/rbac/channel-permissions";
import {
  type CacheKey,
  PermissionCache,
  createPermissionCache,
} from "@/lib/rbac/permission-cache";
import {
  type AuditLogEntry,
  AuditLogger,
  createAuditLogger,
} from "@/lib/rbac/audit-logger";
import {
  hasPermission as checkRolePermission,
  getRolePermissions,
} from "@/lib/rbac/permissions";

// ============================================================================
// Types
// ============================================================================

/**
 * User permission entry
 */
export interface UserPermissionEntry {
  userId: string;
  role: Role;
  permissions: Permission[];
  channelOverrides: Map<string, EffectiveChannelPermissions>;
  lastUpdated: Date;
}

/**
 * Permission check options
 */
export interface PermissionCheckOptions {
  channelId?: string;
  resourceType?: import("@/lib/rbac/permission-builder").ResourceType;
  resourceId?: string;
  resourceOwnerId?: string;
  skipCache?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * RBAC state
 */
interface RBACState {
  // User permissions
  userPermissions: Map<string, UserPermissionEntry>;
  currentUserId: string | null;
  currentUserRole: Role | null;

  // Channel permissions
  channelManager: ChannelPermissionManager;

  // Permission engine and cache
  ruleEngine: PermissionRuleEngine;
  cache: PermissionCache;

  // Audit logging
  auditLogger: AuditLogger;
  auditEnabled: boolean;

  // Loading and error state
  isLoading: boolean;
  error: string | null;

  // Last refresh timestamp
  lastRefresh: Date | null;
}

/**
 * RBAC actions
 */
interface RBACActions {
  // User management
  setCurrentUser: (userId: string, role: Role) => void;
  clearCurrentUser: () => void;
  setUserRole: (userId: string, role: Role) => void;
  getUserRole: (userId: string) => Role | undefined;
  getUserPermissions: (userId: string) => Permission[];

  // Permission checking
  hasPermission: (
    permission: Permission,
    options?: PermissionCheckOptions,
  ) => boolean;
  checkPermission: (
    permission: Permission,
    options?: PermissionCheckOptions,
  ) => PermissionResult;
  hasAnyPermission: (
    permissions: Permission[],
    options?: PermissionCheckOptions,
  ) => boolean;
  hasAllPermissions: (
    permissions: Permission[],
    options?: PermissionCheckOptions,
  ) => boolean;
  canManageUser: (
    targetUserId: string,
    targetRole: Role,
    action: "ban" | "kick" | "mute" | "demote",
  ) => PermissionResult;

  // Channel permissions
  setChannelOverride: (override: ChannelPermissionOverride) => void;
  removeChannelOverride: (
    channelId: string,
    targetType: "role" | "user",
    targetId: string,
  ) => void;
  getChannelOverrides: (channelId: string) => ChannelPermissionOverride[];
  checkChannelPermission: (
    channelId: string,
    permission: Permission,
  ) => PermissionResult;
  getEffectiveChannelPermissions: (
    channelId: string,
  ) => EffectiveChannelPermissions | null;

  // Channel bans
  banFromChannel: (
    channelId: string,
    userId: string,
    options?: { reason?: string; duration?: number },
  ) => void;
  unbanFromChannel: (channelId: string, userId: string) => void;
  isChannelBanned: (channelId: string, userId: string) => boolean;
  getChannelBans: (channelId: string) => ChannelBan[];

  // Cache management
  invalidateCache: (userId?: string) => void;
  invalidateChannelCache: (channelId: string) => void;
  getCacheStats: () => {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
  };

  // Audit logging
  setAuditEnabled: (enabled: boolean) => void;
  getAuditLog: (limit?: number) => AuditLogEntry[];
  clearAuditLog: () => void;

  // Refresh and state management
  refreshPermissions: (userId?: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export type RBACStore = RBACState & RBACActions;

// ============================================================================
// Initial State
// ============================================================================

const createInitialState = (): RBACState => {
  const ruleEngine = createRuleEngine();
  // Register default rules
  ruleEngine.registerRules(createMessagePermissionRules());
  ruleEngine.registerRules(createChannelPermissionRules());
  ruleEngine.registerRules(createUserPermissionRules());

  return {
    userPermissions: new Map(),
    currentUserId: null,
    currentUserRole: null,
    channelManager: createChannelPermissionManager(),
    ruleEngine,
    cache: createPermissionCache({ maxSize: 1000, ttlMs: 60000 }),
    auditLogger: createAuditLogger({ logPermissionChecks: false }),
    auditEnabled: true,
    isLoading: false,
    error: null,
    lastRefresh: null,
  };
};

// ============================================================================
// Store
// ============================================================================

export const useRBACStore = create<RBACStore>()(
  devtools(
    immer((set, get) => ({
      ...createInitialState(),

      // -----------------------------------------------------------------------
      // User Management
      // -----------------------------------------------------------------------

      setCurrentUser: (userId, role) =>
        set(
          (state) => {
            state.currentUserId = userId;
            state.currentUserRole = role;

            // Initialize user permissions if not exists
            if (!state.userPermissions.has(userId)) {
              state.userPermissions.set(userId, {
                userId,
                role,
                permissions: getRolePermissions(role),
                channelOverrides: new Map(),
                lastUpdated: new Date(),
              });
            } else {
              const entry = state.userPermissions.get(userId)!;
              entry.role = role;
              entry.permissions = getRolePermissions(role);
              entry.lastUpdated = new Date();
            }

            // Log login
            if (state.auditEnabled) {
              state.auditLogger.logLogin({ userId });
            }
          },
          false,
          "rbac/setCurrentUser",
        ),

      clearCurrentUser: () =>
        set(
          (state) => {
            if (state.currentUserId && state.auditEnabled) {
              state.auditLogger.logLogout({ userId: state.currentUserId });
            }
            state.currentUserId = null;
            state.currentUserRole = null;
          },
          false,
          "rbac/clearCurrentUser",
        ),

      setUserRole: (userId, role) =>
        set(
          (state) => {
            const existing = state.userPermissions.get(userId);
            const oldRole = existing?.role;

            if (existing) {
              existing.role = role;
              existing.permissions = getRolePermissions(role);
              existing.lastUpdated = new Date();
            } else {
              state.userPermissions.set(userId, {
                userId,
                role,
                permissions: getRolePermissions(role),
                channelOverrides: new Map(),
                lastUpdated: new Date(),
              });
            }

            // Invalidate cache for this user
            state.cache.invalidateUser(userId);

            // Log role change
            if (state.auditEnabled && oldRole && oldRole !== role) {
              if (ROLE_HIERARCHY[role] > ROLE_HIERARCHY[oldRole]) {
                state.auditLogger.logRoleAssigned({
                  userId,
                  role,
                  actorId: state.currentUserId || "system",
                });
              } else {
                state.auditLogger.logRoleRemoved({
                  userId,
                  role: oldRole,
                  actorId: state.currentUserId || "system",
                });
              }
            }
          },
          false,
          "rbac/setUserRole",
        ),

      getUserRole: (userId) => {
        return get().userPermissions.get(userId)?.role;
      },

      getUserPermissions: (userId) => {
        return get().userPermissions.get(userId)?.permissions || [];
      },

      // -----------------------------------------------------------------------
      // Permission Checking
      // -----------------------------------------------------------------------

      hasPermission: (permission, options) => {
        const result = get().checkPermission(permission, options);
        return result.allowed;
      },

      checkPermission: (permission, options = {}) => {
        const state = get();
        const {
          currentUserId,
          currentUserRole,
          ruleEngine,
          cache,
          auditLogger,
          auditEnabled,
        } = state;

        if (!currentUserId || !currentUserRole) {
          return {
            allowed: false,
            reason: "No user logged in",
            deniedBy: "no-user",
          };
        }

        // Build cache key
        const cacheKey: CacheKey = {
          userId: currentUserId,
          permission,
          channelId: options.channelId,
          resourceId: options.resourceId,
        };

        // Check cache first (unless skipCache)
        if (!options.skipCache) {
          const cached = cache.get(cacheKey);
          if (cached) {
            return cached;
          }
        }

        // Build permission context
        const context: PermissionContext = {
          userId: currentUserId,
          userRole: currentUserRole,
          channelId: options.channelId,
          resourceType: options.resourceType,
          resourceId: options.resourceId,
          resourceOwnerId: options.resourceOwnerId,
          metadata: options.metadata,
        };

        // Check channel-specific permissions if channelId provided
        if (options.channelId) {
          const channelResult = state.channelManager.checkPermission(
            permission,
            { ...context, channelId: options.channelId },
            getRolePermissions(currentUserRole),
          );

          if (!options.skipCache) {
            cache.set(cacheKey, channelResult);
          }

          // Log permission check
          if (auditEnabled) {
            auditLogger.logPermissionCheck({
              userId: currentUserId,
              permission,
              result: channelResult,
              channelId: options.channelId,
              resourceType: options.resourceType,
              resourceId: options.resourceId,
            });
          }

          return channelResult;
        }

        // Use rule engine for non-channel permissions
        const result = ruleEngine.check(permission, context);

        if (!options.skipCache) {
          cache.set(cacheKey, result);
        }

        // Log permission check
        if (auditEnabled) {
          auditLogger.logPermissionCheck({
            userId: currentUserId,
            permission,
            result,
            resourceType: options.resourceType,
            resourceId: options.resourceId,
          });
        }

        return result;
      },

      hasAnyPermission: (permissions, options) => {
        return permissions.some((p) => get().hasPermission(p, options));
      },

      hasAllPermissions: (permissions, options) => {
        return permissions.every((p) => get().hasPermission(p, options));
      },

      canManageUser: (targetUserId, targetRole, action) => {
        const state = get();
        const {
          currentUserId,
          currentUserRole,
          channelManager,
          auditLogger,
          auditEnabled,
        } = state;

        if (!currentUserId || !currentUserRole) {
          return { allowed: false, reason: "No user logged in" };
        }

        // Owner protection
        if (targetRole === "owner") {
          const result = {
            allowed: false,
            reason: "Cannot modify owner",
            deniedBy: "owner-protection",
          };
          if (auditEnabled) {
            auditLogger.logAccessDenied({
              userId: currentUserId,
              reason: "Cannot modify owner",
              resource: `user:${targetUserId}`,
              metadata: { action, targetRole },
            });
          }
          return result;
        }

        // Cannot modify self (for demote/ban)
        if (
          currentUserId === targetUserId &&
          (action === "demote" || action === "ban")
        ) {
          return { allowed: false, reason: `Cannot ${action} yourself` };
        }

        // Use channel manager for ban check (has role hierarchy logic)
        const result = channelManager.canBan(
          { userId: currentUserId, userRole: currentUserRole, channelId: "" },
          targetUserId,
          targetRole,
        );

        return result;
      },

      // -----------------------------------------------------------------------
      // Channel Permissions
      // -----------------------------------------------------------------------

      setChannelOverride: (override) =>
        set(
          (state) => {
            state.channelManager.addOverride(override);
            state.cache.invalidateChannel(override.channelId);

            if (state.auditEnabled) {
              state.auditLogger.logChannelPermissionOverride({
                channelId: override.channelId,
                targetType: override.targetType,
                targetId: override.targetId,
                actorId: state.currentUserId || "system",
                allow: override.allow,
                deny: override.deny,
              });
            }
          },
          false,
          "rbac/setChannelOverride",
        ),

      removeChannelOverride: (channelId, targetType, targetId) =>
        set(
          (state) => {
            state.channelManager.removeOverride(
              channelId,
              targetType,
              targetId,
            );
            state.cache.invalidateChannel(channelId);

            if (state.auditEnabled) {
              state.auditLogger.logChannelPermissionRevoked({
                channelId,
                targetType,
                targetId,
                actorId: state.currentUserId || "system",
              });
            }
          },
          false,
          "rbac/removeChannelOverride",
        ),

      getChannelOverrides: (channelId) => {
        return get().channelManager.getOverrides(channelId);
      },

      checkChannelPermission: (channelId, permission) => {
        return get().checkPermission(permission, { channelId });
      },

      getEffectiveChannelPermissions: (channelId) => {
        const state = get();
        const { currentUserId, currentUserRole, channelManager } = state;

        if (!currentUserId || !currentUserRole) {
          return null;
        }

        return channelManager.getEffectivePermissions(
          { userId: currentUserId, userRole: currentUserRole, channelId },
          getRolePermissions(currentUserRole),
        );
      },

      // -----------------------------------------------------------------------
      // Channel Bans
      // -----------------------------------------------------------------------

      banFromChannel: (channelId, userId, options) =>
        set(
          (state) => {
            const ban = {
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              channelId,
              userId,
              bannedBy: state.currentUserId || "system",
              bannedAt: new Date(),
              reason: options?.reason,
              expiresAt: options?.duration
                ? new Date(Date.now() + options.duration * 1000)
                : undefined,
            };

            state.channelManager.banUser(ban);
            state.cache.invalidateUser(userId);

            if (state.auditEnabled) {
              state.auditLogger.logUserBanned({
                userId,
                actorId: state.currentUserId || "system",
                channelId,
                reason: options?.reason,
                duration: options?.duration,
              });
            }
          },
          false,
          "rbac/banFromChannel",
        ),

      unbanFromChannel: (channelId, userId) =>
        set(
          (state) => {
            state.channelManager.unbanUser(channelId, userId);
            state.cache.invalidateUser(userId);

            if (state.auditEnabled) {
              state.auditLogger.logUserUnbanned({
                userId,
                actorId: state.currentUserId || "system",
                channelId,
              });
            }
          },
          false,
          "rbac/unbanFromChannel",
        ),

      isChannelBanned: (channelId, userId) => {
        return get().channelManager.isBanned(channelId, userId);
      },

      getChannelBans: (channelId) => {
        return get().channelManager.getChannelBans(channelId);
      },

      // -----------------------------------------------------------------------
      // Cache Management
      // -----------------------------------------------------------------------

      invalidateCache: (userId) =>
        set(
          (state) => {
            if (userId) {
              state.cache.invalidateUser(userId);
            } else {
              state.cache.clear();
            }
          },
          false,
          "rbac/invalidateCache",
        ),

      invalidateChannelCache: (channelId) =>
        set(
          (state) => {
            state.cache.invalidateChannel(channelId);
          },
          false,
          "rbac/invalidateChannelCache",
        ),

      getCacheStats: () => {
        const stats = get().cache.getStats();
        return {
          hits: stats.hits,
          misses: stats.misses,
          size: stats.size,
          hitRate: stats.hitRate,
        };
      },

      // -----------------------------------------------------------------------
      // Audit Logging
      // -----------------------------------------------------------------------

      setAuditEnabled: (enabled) =>
        set(
          (state) => {
            state.auditEnabled = enabled;
            state.auditLogger.setEnabled(enabled);
          },
          false,
          "rbac/setAuditEnabled",
        ),

      getAuditLog: (limit = 100) => {
        return get().auditLogger.getRecent(limit);
      },

      clearAuditLog: () =>
        set(
          (state) => {
            state.auditLogger.clear();
          },
          false,
          "rbac/clearAuditLog",
        ),

      // -----------------------------------------------------------------------
      // State Management
      // -----------------------------------------------------------------------

      refreshPermissions: (userId) =>
        set(
          (state) => {
            const targetUserId = userId || state.currentUserId;
            if (!targetUserId) return;

            // Invalidate cache
            state.cache.invalidateUser(targetUserId);

            // Update last refresh
            state.lastRefresh = new Date();
          },
          false,
          "rbac/refreshPermissions",
        ),

      setLoading: (loading) =>
        set(
          (state) => {
            state.isLoading = loading;
          },
          false,
          "rbac/setLoading",
        ),

      setError: (error) =>
        set(
          (state) => {
            state.error = error;
          },
          false,
          "rbac/setError",
        ),

      reset: () => set(() => createInitialState(), false, "rbac/reset"),
    })),
    { name: "rbac-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentUser = (state: RBACStore) => ({
  userId: state.currentUserId,
  role: state.currentUserRole,
});

export const selectIsOwner = (state: RBACStore) =>
  state.currentUserRole === "owner";

export const selectIsAdmin = (state: RBACStore) =>
  state.currentUserRole === "owner" || state.currentUserRole === "admin";

export const selectIsModerator = (state: RBACStore) =>
  state.currentUserRole === "owner" ||
  state.currentUserRole === "admin" ||
  state.currentUserRole === "moderator";

export const selectIsLoading = (state: RBACStore) => state.isLoading;

export const selectError = (state: RBACStore) => state.error;

export const selectCacheStats = (state: RBACStore) => state.getCacheStats();

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to check a single permission
 */
export function useHasPermission(
  permission: Permission,
  options?: PermissionCheckOptions,
): boolean {
  return useRBACStore((state) => state.hasPermission(permission, options));
}

/**
 * Hook to check multiple permissions (any)
 */
export function useHasAnyPermission(
  permissions: Permission[],
  options?: PermissionCheckOptions,
): boolean {
  return useRBACStore((state) => state.hasAnyPermission(permissions, options));
}

/**
 * Hook to check multiple permissions (all)
 */
export function useHasAllPermissions(
  permissions: Permission[],
  options?: PermissionCheckOptions,
): boolean {
  return useRBACStore((state) => state.hasAllPermissions(permissions, options));
}

/**
 * Hook to get current user role
 */
export function useCurrentRole(): Role | null {
  return useRBACStore((state) => state.currentUserRole);
}

/**
 * Hook to check if current user is owner
 */
export function useIsOwner(): boolean {
  return useRBACStore(selectIsOwner);
}

/**
 * Hook to check if current user is admin or above
 */
export function useIsAdmin(): boolean {
  return useRBACStore(selectIsAdmin);
}

/**
 * Hook to check if current user is moderator or above
 */
export function useIsModerator(): boolean {
  return useRBACStore(selectIsModerator);
}
