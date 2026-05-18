/**
 * Auth Library Index
 *
 * Exports all authentication and authorization utilities.
 */

// Role definitions and utilities
export {
  type UserRole,
  ROLE_LEVELS,
  ROLE_METADATA,
  ALL_ROLES,
  ADMIN_ROLES,
  MODERATOR_ROLES,
  CHAT_ROLES,
  getRoleLevel,
  hasRoleOrHigher,
  hasHigherRole,
  compareRoles,
  getRolesAtOrBelow,
  getRolesAtOrAbove,
  isRoleAllowed,
  isAdmin,
  isModerator,
  isOwner,
  isGuest,
  getRoleMetadata,
  getNextHigherRole,
  getNextLowerRole,
  getAssignableRoles,
  canModifyUserRole,
} from "./roles";

// Permission definitions and utilities
export {
  type Permission,
  PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_DESCRIPTIONS,
  getPermissionsForRole,
  roleHasPermission,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getMinimumRoleForPermission,
  getPermissionDescription,
} from "./permissions";

// Session management
export {
  sessionManager,
  SessionManager,
  type SessionConfig,
  type DeviceFingerprint,
  type SessionCreateOptions,
  type SessionValidationResult,
  type SuspiciousActivityResult,
  type SessionNotification,
  DEFAULT_SESSION_CONFIG,
} from "./session-manager";

// Unified session service (cross-platform)
export {
  UnifiedSessionService,
  getUnifiedSessionService,
  type PlatformType,
  type UnifiedSessionConfig,
  type SessionCreationResult,
  type SessionRefreshResult,
  type DeviceInfo,
  type SessionRevocationResult,
} from "./unified-session.service";
