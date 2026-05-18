/**
 * Per-App RBAC/ACL Types
 *
 * Enables monorepo "one of many" compatibility where users can have different
 * roles across different applications sharing the same backend.
 *
 * Example: A user can be an admin in nchat, but a regular user in ntv
 */

/**
 * Application registry entry
 */
export interface App {
  id: string;
  app_id: string; // e.g., "nchat", "ntv", "nfamily"
  app_name: string; // e.g., "ɳChat", "ɳTV", "ɳFamily"
  app_url?: string; // e.g., "https://chat.nself.org"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * User role assignment for a specific app
 */
export interface AppUserRole {
  id: string;
  app_id: string;
  user_id: string;
  role: AppRole;
  granted_by?: string; // User ID who granted this role
  granted_at: string;
  expires_at?: string; // Optional expiration for temporary roles
  created_at: string;
  updated_at: string;
}

/**
 * Permission definition for a role within an app
 */
export interface AppRolePermission {
  id: string;
  app_id: string;
  role: AppRole;
  permission: string; // e.g., "channels.create", "messages.delete", "users.ban"
  resource?: string; // Optional: specific resource ID this permission applies to
  created_at: string;
}

/**
 * Standard role types across all apps
 */
export type AppRole = "owner" | "admin" | "moderator" | "member" | "guest";

/**
 * Permission categories and specific permissions
 */
export type AppPermission =
  // Application-level
  | "app.admin"
  // User management
  | "users.manage"
  | "users.ban"
  | "users.warn"
  | "users.timeout"
  // Channel management
  | "channels.create"
  | "channels.delete"
  | "channels.manage"
  | "channels.view"
  | "channels.join"
  // Message management
  | "messages.send"
  | "messages.delete"
  | "messages.delete.any"
  | "messages.delete.own"
  | "messages.edit.own"
  | "messages.pin"
  | "messages.react"
  | "messages.view"
  // File management
  | "files.upload"
  // DM management
  | "dms.send"
  // Settings
  | "settings.manage"
  | "settings.view"
  // Billing
  | "billing.manage"
  // Integrations
  | "integrations.manage";

/**
 * Role hierarchy (higher = more permissions)
 */
export const RoleHierarchy: Record<AppRole, number> = {
  owner: 5,
  admin: 4,
  moderator: 3,
  member: 2,
  guest: 1,
};

/**
 * Check if a role has higher or equal rank than another
 */
export function hasRoleRank(userRole: AppRole, requiredRole: AppRole): boolean {
  return RoleHierarchy[userRole] >= RoleHierarchy[requiredRole];
}

/**
 * Default permissions for each role (used for reference)
 */
export const DefaultRolePermissions: Record<AppRole, AppPermission[]> = {
  owner: [
    "app.admin",
    "users.manage",
    "users.ban",
    "channels.create",
    "channels.delete",
    "channels.manage",
    "messages.delete.any",
    "settings.manage",
    "billing.manage",
    "integrations.manage",
  ],
  admin: [
    "users.manage",
    "users.ban",
    "channels.create",
    "channels.delete",
    "channels.manage",
    "messages.delete.any",
    "settings.view",
    "integrations.manage",
  ],
  moderator: [
    "users.warn",
    "users.timeout",
    "channels.manage",
    "messages.delete",
    "messages.pin",
  ],
  member: [
    "channels.view",
    "channels.join",
    "messages.send",
    "messages.edit.own",
    "messages.delete.own",
    "messages.react",
    "files.upload",
    "dms.send",
  ],
  guest: ["channels.view", "messages.view"],
};

/**
 * User's app context (for current app)
 */
export interface UserAppContext {
  appId: string;
  roles: AppRole[];
  permissions: AppPermission[];
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
}

/**
 * Hook return type for useAppPermissions
 */
export interface UseAppPermissionsResult {
  hasRole: (role: AppRole) => boolean;
  hasPermission: (permission: AppPermission, resource?: string) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  hasAllPermissions: (permissions: AppPermission[]) => boolean;
  userRoles: AppRole[];
  userPermissions: AppPermission[];
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  loading: boolean;
  error?: Error;
}

/**
 * GraphQL query result types
 */
export interface GetUserAppRolesResult {
  role: AppRole;
  granted_at: string;
  expires_at?: string;
}

export interface CheckUserAppRoleResult {
  user_has_app_role: boolean;
}

export interface CheckUserAppPermissionResult {
  user_has_app_permission: boolean;
}
