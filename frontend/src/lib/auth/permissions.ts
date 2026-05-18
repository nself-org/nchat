/**
 * Permission Definitions
 *
 * Defines all system permissions and maps them to roles.
 * Permissions are granular access controls for specific actions.
 */

import { UserRole, hasRoleOrHigher, getRoleLevel, ROLE_LEVELS } from "./roles";

/**
 * All available permissions in the system
 */
export const PERMISSIONS = {
  // ============================================================================
  // Channel Permissions
  // ============================================================================
  CHANNEL_CREATE: "channel:create",
  CHANNEL_DELETE: "channel:delete",
  CHANNEL_UPDATE: "channel:update",
  CHANNEL_VIEW: "channel:view",
  CHANNEL_JOIN: "channel:join",
  CHANNEL_LEAVE: "channel:leave",
  CHANNEL_INVITE: "channel:invite",
  CHANNEL_KICK: "channel:kick",
  CHANNEL_ARCHIVE: "channel:archive",
  CHANNEL_PIN_MESSAGES: "channel:pin_messages",
  CHANNEL_MANAGE_PERMISSIONS: "channel:manage_permissions",

  // ============================================================================
  // Message Permissions
  // ============================================================================
  MESSAGE_SEND: "message:send",
  MESSAGE_EDIT_OWN: "message:edit_own",
  MESSAGE_EDIT_ANY: "message:edit_any",
  MESSAGE_DELETE_OWN: "message:delete_own",
  MESSAGE_DELETE_ANY: "message:delete_any",
  MESSAGE_PIN: "message:pin",
  MESSAGE_REACT: "message:react",
  MESSAGE_THREAD: "message:thread",
  MESSAGE_MENTION: "message:mention",
  MESSAGE_MENTION_ALL: "message:mention_all",
  MESSAGE_SCHEDULE: "message:schedule",
  MESSAGE_FORWARD: "message:forward",

  // ============================================================================
  // File Permissions
  // ============================================================================
  FILE_UPLOAD: "file:upload",
  FILE_DOWNLOAD: "file:download",
  FILE_DELETE_OWN: "file:delete_own",
  FILE_DELETE_ANY: "file:delete_any",

  // ============================================================================
  // User Permissions
  // ============================================================================
  USER_VIEW_PROFILE: "user:view_profile",
  USER_UPDATE_OWN_PROFILE: "user:update_own_profile",
  USER_UPDATE_ANY_PROFILE: "user:update_any_profile",
  USER_INVITE: "user:invite",
  USER_BAN: "user:ban",
  USER_UNBAN: "user:unban",
  USER_KICK: "user:kick",
  USER_MUTE: "user:mute",
  USER_ASSIGN_ROLE: "user:assign_role",
  USER_VIEW_ACTIVITY: "user:view_activity",

  // ============================================================================
  // Admin Permissions
  // ============================================================================
  ADMIN_DASHBOARD: "admin:dashboard",
  ADMIN_USERS: "admin:users",
  ADMIN_CHANNELS: "admin:channels",
  ADMIN_SETTINGS: "admin:settings",
  ADMIN_AUDIT_LOG: "admin:audit_log",
  ADMIN_ANALYTICS: "admin:analytics",
  ADMIN_INTEGRATIONS: "admin:integrations",
  ADMIN_WEBHOOKS: "admin:webhooks",
  ADMIN_BACKUP: "admin:backup",

  // ============================================================================
  // Moderation Permissions
  // ============================================================================
  MOD_VIEW_REPORTS: "mod:view_reports",
  MOD_RESOLVE_REPORTS: "mod:resolve_reports",
  MOD_WARN_USER: "mod:warn_user",
  MOD_MUTE_USER: "mod:mute_user",
  MOD_DELETE_MESSAGES: "mod:delete_messages",
  MOD_SLOW_MODE: "mod:slow_mode",

  // ============================================================================
  // System Permissions
  // ============================================================================
  SYSTEM_SETUP: "system:setup",
  SYSTEM_CONFIG: "system:config",
  SYSTEM_BRANDING: "system:branding",
  SYSTEM_TRANSFER_OWNERSHIP: "system:transfer_ownership",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Role to permissions mapping
 * Each role has explicit permissions plus inherits from lower roles
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Guest - very limited read-only access
  guest: [
    PERMISSIONS.CHANNEL_VIEW,
    PERMISSIONS.MESSAGE_REACT,
    PERMISSIONS.FILE_DOWNLOAD,
    PERMISSIONS.USER_VIEW_PROFILE,
  ],

  // Member - standard user
  member: [
    // All guest permissions plus:
    PERMISSIONS.CHANNEL_JOIN,
    PERMISSIONS.CHANNEL_LEAVE,
    PERMISSIONS.MESSAGE_SEND,
    PERMISSIONS.MESSAGE_EDIT_OWN,
    PERMISSIONS.MESSAGE_DELETE_OWN,
    PERMISSIONS.MESSAGE_THREAD,
    PERMISSIONS.MESSAGE_MENTION,
    PERMISSIONS.MESSAGE_FORWARD,
    PERMISSIONS.FILE_UPLOAD,
    PERMISSIONS.FILE_DELETE_OWN,
    PERMISSIONS.USER_UPDATE_OWN_PROFILE,
    PERMISSIONS.USER_INVITE,
  ],

  // Moderator - content moderation
  moderator: [
    // All member permissions plus:
    PERMISSIONS.CHANNEL_CREATE,
    PERMISSIONS.CHANNEL_INVITE,
    PERMISSIONS.CHANNEL_KICK,
    PERMISSIONS.CHANNEL_PIN_MESSAGES,
    PERMISSIONS.MESSAGE_EDIT_ANY,
    PERMISSIONS.MESSAGE_DELETE_ANY,
    PERMISSIONS.MESSAGE_PIN,
    PERMISSIONS.MESSAGE_MENTION_ALL,
    PERMISSIONS.MESSAGE_SCHEDULE,
    PERMISSIONS.FILE_DELETE_ANY,
    PERMISSIONS.USER_MUTE,
    PERMISSIONS.MOD_VIEW_REPORTS,
    PERMISSIONS.MOD_RESOLVE_REPORTS,
    PERMISSIONS.MOD_WARN_USER,
    PERMISSIONS.MOD_MUTE_USER,
    PERMISSIONS.MOD_DELETE_MESSAGES,
    PERMISSIONS.MOD_SLOW_MODE,
  ],

  // Admin - system management
  admin: [
    // All moderator permissions plus:
    PERMISSIONS.CHANNEL_DELETE,
    PERMISSIONS.CHANNEL_UPDATE,
    PERMISSIONS.CHANNEL_ARCHIVE,
    PERMISSIONS.CHANNEL_MANAGE_PERMISSIONS,
    PERMISSIONS.USER_UPDATE_ANY_PROFILE,
    PERMISSIONS.USER_BAN,
    PERMISSIONS.USER_UNBAN,
    PERMISSIONS.USER_KICK,
    PERMISSIONS.USER_ASSIGN_ROLE,
    PERMISSIONS.USER_VIEW_ACTIVITY,
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.ADMIN_USERS,
    PERMISSIONS.ADMIN_CHANNELS,
    PERMISSIONS.ADMIN_SETTINGS,
    PERMISSIONS.ADMIN_AUDIT_LOG,
    PERMISSIONS.ADMIN_ANALYTICS,
    PERMISSIONS.ADMIN_INTEGRATIONS,
    PERMISSIONS.ADMIN_WEBHOOKS,
  ],

  // Owner - full system control
  owner: [
    // All admin permissions plus:
    PERMISSIONS.ADMIN_BACKUP,
    PERMISSIONS.SYSTEM_SETUP,
    PERMISSIONS.SYSTEM_CONFIG,
    PERMISSIONS.SYSTEM_BRANDING,
    PERMISSIONS.SYSTEM_TRANSFER_OWNERSHIP,
  ],
};

/**
 * Get all permissions for a role (including inherited permissions from lower roles)
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  const roleLevel = getRoleLevel(role);
  const allPermissions = new Set<Permission>();

  // Collect permissions from this role and all lower roles
  for (const [r, perms] of Object.entries(ROLE_PERMISSIONS)) {
    if (ROLE_LEVELS[r as UserRole] <= roleLevel) {
      perms.forEach((p) => allPermissions.add(p));
    }
  }

  return Array.from(allPermissions);
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

/**
 * Check if a user (by role) has a specific permission
 */
export function hasPermission(
  userRole: UserRole,
  permission: Permission,
): boolean {
  return roleHasPermission(userRole, permission);
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  userRole: UserRole,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(userRole, p));
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  userRole: UserRole,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(userRole, p));
}

/**
 * Get the minimum role required for a permission
 */
export function getMinimumRoleForPermission(
  permission: Permission,
): UserRole | null {
  // Check from lowest role to highest
  const rolesAscending: UserRole[] = [
    "guest",
    "member",
    "moderator",
    "admin",
    "owner",
  ];

  for (const role of rolesAscending) {
    if (roleHasPermission(role, permission)) {
      return role;
    }
  }

  return null;
}

/**
 * Permission groups for UI organization
 */
export const PERMISSION_GROUPS = {
  channel: {
    label: "Channel",
    permissions: [
      PERMISSIONS.CHANNEL_CREATE,
      PERMISSIONS.CHANNEL_DELETE,
      PERMISSIONS.CHANNEL_UPDATE,
      PERMISSIONS.CHANNEL_VIEW,
      PERMISSIONS.CHANNEL_JOIN,
      PERMISSIONS.CHANNEL_LEAVE,
      PERMISSIONS.CHANNEL_INVITE,
      PERMISSIONS.CHANNEL_KICK,
      PERMISSIONS.CHANNEL_ARCHIVE,
      PERMISSIONS.CHANNEL_PIN_MESSAGES,
      PERMISSIONS.CHANNEL_MANAGE_PERMISSIONS,
    ],
  },
  message: {
    label: "Messages",
    permissions: [
      PERMISSIONS.MESSAGE_SEND,
      PERMISSIONS.MESSAGE_EDIT_OWN,
      PERMISSIONS.MESSAGE_EDIT_ANY,
      PERMISSIONS.MESSAGE_DELETE_OWN,
      PERMISSIONS.MESSAGE_DELETE_ANY,
      PERMISSIONS.MESSAGE_PIN,
      PERMISSIONS.MESSAGE_REACT,
      PERMISSIONS.MESSAGE_THREAD,
      PERMISSIONS.MESSAGE_MENTION,
      PERMISSIONS.MESSAGE_MENTION_ALL,
      PERMISSIONS.MESSAGE_SCHEDULE,
      PERMISSIONS.MESSAGE_FORWARD,
    ],
  },
  file: {
    label: "Files",
    permissions: [
      PERMISSIONS.FILE_UPLOAD,
      PERMISSIONS.FILE_DOWNLOAD,
      PERMISSIONS.FILE_DELETE_OWN,
      PERMISSIONS.FILE_DELETE_ANY,
    ],
  },
  user: {
    label: "Users",
    permissions: [
      PERMISSIONS.USER_VIEW_PROFILE,
      PERMISSIONS.USER_UPDATE_OWN_PROFILE,
      PERMISSIONS.USER_UPDATE_ANY_PROFILE,
      PERMISSIONS.USER_INVITE,
      PERMISSIONS.USER_BAN,
      PERMISSIONS.USER_UNBAN,
      PERMISSIONS.USER_KICK,
      PERMISSIONS.USER_MUTE,
      PERMISSIONS.USER_ASSIGN_ROLE,
      PERMISSIONS.USER_VIEW_ACTIVITY,
    ],
  },
  admin: {
    label: "Administration",
    permissions: [
      PERMISSIONS.ADMIN_DASHBOARD,
      PERMISSIONS.ADMIN_USERS,
      PERMISSIONS.ADMIN_CHANNELS,
      PERMISSIONS.ADMIN_SETTINGS,
      PERMISSIONS.ADMIN_AUDIT_LOG,
      PERMISSIONS.ADMIN_ANALYTICS,
      PERMISSIONS.ADMIN_INTEGRATIONS,
      PERMISSIONS.ADMIN_WEBHOOKS,
      PERMISSIONS.ADMIN_BACKUP,
    ],
  },
  moderation: {
    label: "Moderation",
    permissions: [
      PERMISSIONS.MOD_VIEW_REPORTS,
      PERMISSIONS.MOD_RESOLVE_REPORTS,
      PERMISSIONS.MOD_WARN_USER,
      PERMISSIONS.MOD_MUTE_USER,
      PERMISSIONS.MOD_DELETE_MESSAGES,
      PERMISSIONS.MOD_SLOW_MODE,
    ],
  },
  system: {
    label: "System",
    permissions: [
      PERMISSIONS.SYSTEM_SETUP,
      PERMISSIONS.SYSTEM_CONFIG,
      PERMISSIONS.SYSTEM_BRANDING,
      PERMISSIONS.SYSTEM_TRANSFER_OWNERSHIP,
    ],
  },
} as const;

/**
 * Permission descriptions for UI
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  // Channel
  [PERMISSIONS.CHANNEL_CREATE]: "Create new channels",
  [PERMISSIONS.CHANNEL_DELETE]: "Delete channels",
  [PERMISSIONS.CHANNEL_UPDATE]: "Update channel settings",
  [PERMISSIONS.CHANNEL_VIEW]: "View channels",
  [PERMISSIONS.CHANNEL_JOIN]: "Join channels",
  [PERMISSIONS.CHANNEL_LEAVE]: "Leave channels",
  [PERMISSIONS.CHANNEL_INVITE]: "Invite users to channels",
  [PERMISSIONS.CHANNEL_KICK]: "Remove users from channels",
  [PERMISSIONS.CHANNEL_ARCHIVE]: "Archive channels",
  [PERMISSIONS.CHANNEL_PIN_MESSAGES]: "Pin messages in channels",
  [PERMISSIONS.CHANNEL_MANAGE_PERMISSIONS]:
    "Manage channel-specific permissions",

  // Message
  [PERMISSIONS.MESSAGE_SEND]: "Send messages",
  [PERMISSIONS.MESSAGE_EDIT_OWN]: "Edit own messages",
  [PERMISSIONS.MESSAGE_EDIT_ANY]: "Edit any message",
  [PERMISSIONS.MESSAGE_DELETE_OWN]: "Delete own messages",
  [PERMISSIONS.MESSAGE_DELETE_ANY]: "Delete any message",
  [PERMISSIONS.MESSAGE_PIN]: "Pin messages",
  [PERMISSIONS.MESSAGE_REACT]: "Add reactions to messages",
  [PERMISSIONS.MESSAGE_THREAD]: "Start and reply to threads",
  [PERMISSIONS.MESSAGE_MENTION]: "Mention users",
  [PERMISSIONS.MESSAGE_MENTION_ALL]: "Mention @everyone or @channel",
  [PERMISSIONS.MESSAGE_SCHEDULE]: "Schedule messages",
  [PERMISSIONS.MESSAGE_FORWARD]: "Forward messages",

  // File
  [PERMISSIONS.FILE_UPLOAD]: "Upload files",
  [PERMISSIONS.FILE_DOWNLOAD]: "Download files",
  [PERMISSIONS.FILE_DELETE_OWN]: "Delete own files",
  [PERMISSIONS.FILE_DELETE_ANY]: "Delete any file",

  // User
  [PERMISSIONS.USER_VIEW_PROFILE]: "View user profiles",
  [PERMISSIONS.USER_UPDATE_OWN_PROFILE]: "Update own profile",
  [PERMISSIONS.USER_UPDATE_ANY_PROFILE]: "Update any user profile",
  [PERMISSIONS.USER_INVITE]: "Invite new users",
  [PERMISSIONS.USER_BAN]: "Ban users",
  [PERMISSIONS.USER_UNBAN]: "Unban users",
  [PERMISSIONS.USER_KICK]: "Kick users",
  [PERMISSIONS.USER_MUTE]: "Mute users",
  [PERMISSIONS.USER_ASSIGN_ROLE]: "Assign roles to users",
  [PERMISSIONS.USER_VIEW_ACTIVITY]: "View user activity logs",

  // Admin
  [PERMISSIONS.ADMIN_DASHBOARD]: "Access admin dashboard",
  [PERMISSIONS.ADMIN_USERS]: "Manage users",
  [PERMISSIONS.ADMIN_CHANNELS]: "Manage all channels",
  [PERMISSIONS.ADMIN_SETTINGS]: "Manage system settings",
  [PERMISSIONS.ADMIN_AUDIT_LOG]: "View audit logs",
  [PERMISSIONS.ADMIN_ANALYTICS]: "View analytics",
  [PERMISSIONS.ADMIN_INTEGRATIONS]: "Manage integrations",
  [PERMISSIONS.ADMIN_WEBHOOKS]: "Manage webhooks",
  [PERMISSIONS.ADMIN_BACKUP]: "Create and restore backups",

  // Moderation
  [PERMISSIONS.MOD_VIEW_REPORTS]: "View reports",
  [PERMISSIONS.MOD_RESOLVE_REPORTS]: "Resolve reports",
  [PERMISSIONS.MOD_WARN_USER]: "Warn users",
  [PERMISSIONS.MOD_MUTE_USER]: "Mute users",
  [PERMISSIONS.MOD_DELETE_MESSAGES]: "Delete messages",
  [PERMISSIONS.MOD_SLOW_MODE]: "Enable slow mode",

  // System
  [PERMISSIONS.SYSTEM_SETUP]: "Run setup wizard",
  [PERMISSIONS.SYSTEM_CONFIG]: "Configure system settings",
  [PERMISSIONS.SYSTEM_BRANDING]: "Update branding",
  [PERMISSIONS.SYSTEM_TRANSFER_OWNERSHIP]: "Transfer ownership",
};

/**
 * Get human-readable description of a permission
 */
export function getPermissionDescription(permission: Permission): string {
  return PERMISSION_DESCRIPTIONS[permission] || permission;
}
