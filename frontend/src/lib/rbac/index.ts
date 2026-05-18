/**
 * RBAC Module Barrel Export
 *
 * Re-exports all RBAC types and utilities for convenient importing.
 */

// Types
export {
  ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  type Role,
  type Permission,
  type RolePermissions,
} from "@/types/rbac";

// Permission utilities
export {
  DEFAULT_ROLE_PERMISSIONS,
  hasPermission,
  hasRole,
  canManageRole,
  isOwner,
  canModifyUser,
  getRolePermissions,
  getRoleDisplayName,
  getAllRolesSorted,
} from "./permissions";

// Permission Builder
export {
  PermissionBuilder,
  PermissionRuleEngine,
  permission,
  createRuleEngine,
  roleCondition,
  permissionCondition,
  ownerCondition,
  timeCondition,
  resourceCondition,
  customCondition,
  getRoleDefaultPermissions,
  createMessagePermissionRules,
  createChannelPermissionRules,
  createUserPermissionRules,
  type PermissionResult,
  type PermissionContext,
  type PermissionCondition,
  type PermissionRule,
  type ConditionType,
  type ResourceType,
} from "./permission-builder";

// Channel Permissions
export {
  ChannelPermissionManager,
  createChannelPermissionManager,
  createOverride,
  createBan,
  createInvite,
  createReadOnlyOverride,
  createAnnouncementOverride,
  createMutedUserOverride,
  type ChannelPermissionOverride,
  type ChannelBan,
  type ChannelInvite,
  type ChannelPermissionContext,
  type EffectiveChannelPermissions,
} from "./channel-permissions";

// Permission Cache
export {
  PermissionCache,
  createPermissionCache,
  createHighPerformanceCache,
  createRealtimeCache,
  withCache,
  withBatchCache,
  type CacheKey,
  type CacheEntry,
  type CacheStats,
  type CacheConfig,
  type BatchPermissionRequest,
  type BatchPermissionResult,
} from "./permission-cache";

// Audit Logger
export {
  AuditLogger,
  createAuditLogger,
  createMinimalAuditLogger,
  createComprehensiveAuditLogger,
  formatAuditEntry,
  groupByDate,
  groupByUser,
  groupByEventType,
  type AuditEventType,
  type AuditLogEntry,
  type AuditLogQuery,
  type AuditLogQueryResult,
  type AuditLoggerConfig,
  type AuditStats,
} from "./audit-logger";
