/**
 * Role Defaults - Default role configurations
 *
 * Defines the built-in roles with their default permissions.
 * These roles are created when the server is first set up.
 */

import { Permission, Role, BuiltInRoleId } from "./role-types";

// ============================================================================
// Default Role Colors
// ============================================================================

export const ROLE_COLORS: Record<BuiltInRoleId | string, string> = {
  owner: "#F59E0B", // Amber/Gold
  admin: "#EF4444", // Red
  moderator: "#8B5CF6", // Purple
  member: "#3B82F6", // Blue
  guest: "#6B7280", // Gray
};

// ============================================================================
// Default Role Icons
// ============================================================================

export const ROLE_ICONS: Record<BuiltInRoleId | string, string> = {
  owner: "Crown",
  admin: "ShieldCheck",
  moderator: "Shield",
  member: "User",
  guest: "UserCircle",
};

// ============================================================================
// Permission Sets for Built-in Roles
// ============================================================================

/**
 * Owner has all permissions
 */
export const OWNER_PERMISSIONS: Permission[] = [
  // General
  "view_channels",
  "send_messages",
  "embed_links",
  "attach_files",
  "add_reactions",
  "use_external_emojis",
  "use_voice",
  "use_video",
  "change_nickname",
  // Messages
  "edit_own_messages",
  "delete_own_messages",
  "edit_others_messages",
  "delete_others_messages",
  "pin_messages",
  "mention_everyone",
  "manage_messages",
  "view_message_history",
  // Members
  "invite_members",
  "kick_members",
  "ban_members",
  "timeout_members",
  "manage_nicknames",
  "manage_roles",
  "view_audit_log",
  "view_member_profiles",
  // Channels
  "create_channels",
  "edit_channels",
  "delete_channels",
  "manage_channels",
  "manage_channel_permissions",
  "create_invites",
  "manage_invites",
  "manage_webhooks",
  // Admin
  "administrator",
  "manage_server",
  "manage_integrations",
  "manage_emojis",
  "manage_stickers",
  "view_analytics",
  "manage_billing",
  "manage_security",
  // Moderation
  "mute_members",
  "deafen_members",
  "move_members",
  "moderate_content",
  "view_reports",
  "manage_reports",
  "manage_auto_mod",
];

/**
 * Admin permissions - Most permissions except billing and some security
 */
export const ADMIN_PERMISSIONS: Permission[] = [
  // General
  "view_channels",
  "send_messages",
  "embed_links",
  "attach_files",
  "add_reactions",
  "use_external_emojis",
  "use_voice",
  "use_video",
  "change_nickname",
  // Messages
  "edit_own_messages",
  "delete_own_messages",
  "edit_others_messages",
  "delete_others_messages",
  "pin_messages",
  "mention_everyone",
  "manage_messages",
  "view_message_history",
  // Members
  "invite_members",
  "kick_members",
  "ban_members",
  "timeout_members",
  "manage_nicknames",
  "manage_roles",
  "view_audit_log",
  "view_member_profiles",
  // Channels
  "create_channels",
  "edit_channels",
  "delete_channels",
  "manage_channels",
  "manage_channel_permissions",
  "create_invites",
  "manage_invites",
  "manage_webhooks",
  // Admin (limited)
  "manage_server",
  "manage_integrations",
  "manage_emojis",
  "manage_stickers",
  "view_analytics",
  // Moderation
  "mute_members",
  "deafen_members",
  "move_members",
  "moderate_content",
  "view_reports",
  "manage_reports",
  "manage_auto_mod",
];

/**
 * Moderator permissions - Focus on content and member moderation
 */
export const MODERATOR_PERMISSIONS: Permission[] = [
  // General
  "view_channels",
  "send_messages",
  "embed_links",
  "attach_files",
  "add_reactions",
  "use_external_emojis",
  "use_voice",
  "use_video",
  "change_nickname",
  // Messages
  "edit_own_messages",
  "delete_own_messages",
  "delete_others_messages",
  "pin_messages",
  "mention_everyone",
  "manage_messages",
  "view_message_history",
  // Members (limited)
  "invite_members",
  "kick_members",
  "timeout_members",
  "manage_nicknames",
  "view_member_profiles",
  // Channels (limited)
  "edit_channels",
  "create_invites",
  "manage_invites",
  // Moderation
  "mute_members",
  "deafen_members",
  "move_members",
  "moderate_content",
  "view_reports",
  "manage_reports",
];

/**
 * Member permissions - Standard user permissions
 */
export const MEMBER_PERMISSIONS: Permission[] = [
  // General
  "view_channels",
  "send_messages",
  "embed_links",
  "attach_files",
  "add_reactions",
  "use_external_emojis",
  "use_voice",
  "use_video",
  "change_nickname",
  // Messages
  "edit_own_messages",
  "delete_own_messages",
  "view_message_history",
  // Members (limited)
  "invite_members",
  "view_member_profiles",
  // Channels (limited)
  "create_invites",
];

/**
 * Guest permissions - Read-only with minimal interaction
 */
export const GUEST_PERMISSIONS: Permission[] = [
  "view_channels",
  "view_message_history",
  "add_reactions",
  "view_member_profiles",
];

// ============================================================================
// Default Roles
// ============================================================================

const now = new Date();

export const DEFAULT_ROLES: Record<BuiltInRoleId, Role> = {
  owner: {
    id: "owner",
    name: "Owner",
    description: "Server owner with full administrative access",
    color: ROLE_COLORS.owner,
    icon: ROLE_ICONS.owner,
    position: 100,
    isBuiltIn: true,
    isDefault: false,
    isMentionable: true,
    permissions: OWNER_PERMISSIONS,
    createdAt: now,
    updatedAt: now,
  },
  admin: {
    id: "admin",
    name: "Admin",
    description: "Server administrator with most permissions",
    color: ROLE_COLORS.admin,
    icon: ROLE_ICONS.admin,
    position: 80,
    isBuiltIn: true,
    isDefault: false,
    isMentionable: true,
    permissions: ADMIN_PERMISSIONS,
    createdAt: now,
    updatedAt: now,
  },
  moderator: {
    id: "moderator",
    name: "Moderator",
    description: "Content and member moderator",
    color: ROLE_COLORS.moderator,
    icon: ROLE_ICONS.moderator,
    position: 60,
    isBuiltIn: true,
    isDefault: false,
    isMentionable: true,
    permissions: MODERATOR_PERMISSIONS,
    createdAt: now,
    updatedAt: now,
  },
  member: {
    id: "member",
    name: "Member",
    description: "Standard server member",
    color: ROLE_COLORS.member,
    icon: ROLE_ICONS.member,
    position: 40,
    isBuiltIn: true,
    isDefault: true,
    isMentionable: false,
    permissions: MEMBER_PERMISSIONS,
    createdAt: now,
    updatedAt: now,
  },
  guest: {
    id: "guest",
    name: "Guest",
    description: "Limited access for guests",
    color: ROLE_COLORS.guest,
    icon: ROLE_ICONS.guest,
    position: 20,
    isBuiltIn: true,
    isDefault: false,
    isMentionable: false,
    permissions: GUEST_PERMISSIONS,
    createdAt: now,
    updatedAt: now,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default role by ID
 */
export function getDefaultRole(id: BuiltInRoleId): Role {
  return DEFAULT_ROLES[id];
}

/**
 * Get all default roles sorted by position
 */
export function getAllDefaultRoles(): Role[] {
  return Object.values(DEFAULT_ROLES).sort((a, b) => b.position - a.position);
}

/**
 * Get the default member role
 */
export function getDefaultMemberRole(): Role {
  return DEFAULT_ROLES.member;
}

/**
 * Get permissions for a built-in role
 */
export function getDefaultPermissions(roleId: BuiltInRoleId): Permission[] {
  switch (roleId) {
    case "owner":
      return OWNER_PERMISSIONS;
    case "admin":
      return ADMIN_PERMISSIONS;
    case "moderator":
      return MODERATOR_PERMISSIONS;
    case "member":
      return MEMBER_PERMISSIONS;
    case "guest":
      return GUEST_PERMISSIONS;
    default:
      return [];
  }
}

/**
 * Create a new custom role with default settings
 */
export function createNewRole(name: string, position?: number): Partial<Role> {
  return {
    name,
    description: "",
    color: "#6B7280",
    position: position ?? 30,
    isBuiltIn: false,
    isDefault: false,
    isMentionable: false,
    permissions: MEMBER_PERMISSIONS, // Start with member permissions
  };
}

/**
 * Color presets for role customization
 */
export const ROLE_COLOR_PRESETS = [
  { name: "Slate", color: "#64748B" },
  { name: "Gray", color: "#6B7280" },
  { name: "Red", color: "#EF4444" },
  { name: "Orange", color: "#F97316" },
  { name: "Amber", color: "#F59E0B" },
  { name: "Yellow", color: "#EAB308" },
  { name: "Lime", color: "#84CC16" },
  { name: "Green", color: "#22C55E" },
  { name: "Emerald", color: "#10B981" },
  { name: "Teal", color: "#14B8A6" },
  { name: "Cyan", color: "#06B6D4" },
  { name: "Sky", color: "#0EA5E9" },
  { name: "Blue", color: "#3B82F6" },
  { name: "Indigo", color: "#6366F1" },
  { name: "Violet", color: "#8B5CF6" },
  { name: "Purple", color: "#A855F7" },
  { name: "Fuchsia", color: "#D946EF" },
  { name: "Pink", color: "#EC4899" },
  { name: "Rose", color: "#F43F5E" },
];

/**
 * Icon options for role customization
 */
export const ROLE_ICON_OPTIONS = [
  "Crown",
  "ShieldCheck",
  "Shield",
  "User",
  "UserCircle",
  "Users",
  "Star",
  "Heart",
  "Zap",
  "Award",
  "Badge",
  "Briefcase",
  "Code",
  "Coffee",
  "Gamepad2",
  "Headphones",
  "Music",
  "Palette",
  "Rocket",
  "Sparkles",
  "Sword",
  "Target",
  "Trophy",
  "Verified",
  "Wrench",
];
