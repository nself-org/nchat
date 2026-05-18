/**
 * RBAC (Role-Based Access Control) Types
 *
 * Defines the core roles, permissions, and hierarchy for the nchat application.
 */

export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MODERATOR: "moderator",
  MEMBER: "member",
  GUEST: "guest",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Role hierarchy - higher numbers indicate more permissions
 * Owner (100) > Admin (90) > Moderator (70) > Member (20) > Guest (10)
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 100,
  admin: 90,
  moderator: 70,
  member: 20,
  guest: 10,
};

export const PERMISSIONS = {
  // Messaging
  MESSAGE_SEND: "message.send",
  MESSAGE_EDIT: "message.edit",
  MESSAGE_DELETE: "message.delete",
  MESSAGE_DELETE_OTHERS: "message.delete_others",
  MESSAGE_PIN: "message.pin",

  // Channels
  CHANNEL_CREATE: "channel.create",
  CHANNEL_EDIT: "channel.edit",
  CHANNEL_DELETE: "channel.delete",
  CHANNEL_MANAGE: "channel.manage",

  // Users
  USER_VIEW: "user.view",
  USER_EDIT: "user.edit",
  USER_BAN: "user.ban",
  USER_KICK: "user.kick",
  USER_MUTE: "user.mute",

  // Roles
  ROLE_VIEW: "role.view",
  ROLE_CREATE: "role.create",
  ROLE_EDIT: "role.edit",
  ROLE_DELETE: "role.delete",
  ROLE_ASSIGN: "role.assign",

  // Admin
  ADMIN_DASHBOARD: "admin.dashboard",
  ADMIN_SETTINGS: "admin.settings",
  ADMIN_BILLING: "admin.billing",
  ADMIN_AUDIT_LOG: "admin.audit_log",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface RolePermissions {
  role: Role;
  permissions: Permission[];
}
