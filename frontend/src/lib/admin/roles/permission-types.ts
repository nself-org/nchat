/**
 * Permission Types - Complete permission definitions and categories
 *
 * This module defines all available permissions in the system,
 * organized by category with descriptions and metadata.
 */

import {
  Permission,
  PermissionCategory,
  PermissionDefinition,
  PermissionGroup,
} from "./role-types";

// ============================================================================
// Permission Definitions
// ============================================================================

export const PERMISSIONS: Record<Permission, PermissionDefinition> = {
  // General permissions
  view_channels: {
    id: "view_channels",
    name: "View Channels",
    description: "Allows viewing text and voice channels",
    category: "general",
  },
  send_messages: {
    id: "send_messages",
    name: "Send Messages",
    description: "Allows sending messages in text channels",
    category: "general",
  },
  embed_links: {
    id: "embed_links",
    name: "Embed Links",
    description: "Allows links to show embedded content previews",
    category: "general",
  },
  attach_files: {
    id: "attach_files",
    name: "Attach Files",
    description: "Allows uploading files and images",
    category: "general",
  },
  add_reactions: {
    id: "add_reactions",
    name: "Add Reactions",
    description: "Allows adding emoji reactions to messages",
    category: "general",
  },
  use_external_emojis: {
    id: "use_external_emojis",
    name: "Use External Emojis",
    description: "Allows using emojis from other servers",
    category: "general",
  },
  use_voice: {
    id: "use_voice",
    name: "Use Voice",
    description: "Allows speaking in voice channels",
    category: "general",
  },
  use_video: {
    id: "use_video",
    name: "Use Video",
    description: "Allows using video in voice channels",
    category: "general",
  },
  change_nickname: {
    id: "change_nickname",
    name: "Change Nickname",
    description: "Allows changing own nickname",
    category: "general",
  },

  // Message permissions
  edit_own_messages: {
    id: "edit_own_messages",
    name: "Edit Own Messages",
    description: "Allows editing own messages",
    category: "messages",
  },
  delete_own_messages: {
    id: "delete_own_messages",
    name: "Delete Own Messages",
    description: "Allows deleting own messages",
    category: "messages",
  },
  edit_others_messages: {
    id: "edit_others_messages",
    name: "Edit Others Messages",
    description: "Allows editing other members' messages",
    category: "messages",
    dangerous: true,
  },
  delete_others_messages: {
    id: "delete_others_messages",
    name: "Delete Others Messages",
    description: "Allows deleting other members' messages",
    category: "messages",
    dangerous: true,
  },
  pin_messages: {
    id: "pin_messages",
    name: "Pin Messages",
    description: "Allows pinning messages in channels",
    category: "messages",
  },
  mention_everyone: {
    id: "mention_everyone",
    name: "Mention Everyone",
    description: "Allows using @everyone and @here mentions",
    category: "messages",
    dangerous: true,
  },
  manage_messages: {
    id: "manage_messages",
    name: "Manage Messages",
    description: "Allows bulk deleting and managing messages",
    category: "messages",
    dangerous: true,
  },
  view_message_history: {
    id: "view_message_history",
    name: "View Message History",
    description: "Allows viewing message history in channels",
    category: "messages",
  },

  // Member permissions
  invite_members: {
    id: "invite_members",
    name: "Invite Members",
    description: "Allows creating invites to add new members",
    category: "members",
  },
  kick_members: {
    id: "kick_members",
    name: "Kick Members",
    description: "Allows removing members from the server",
    category: "members",
    dangerous: true,
  },
  ban_members: {
    id: "ban_members",
    name: "Ban Members",
    description: "Allows permanently banning members",
    category: "members",
    dangerous: true,
  },
  timeout_members: {
    id: "timeout_members",
    name: "Timeout Members",
    description: "Allows temporarily muting members",
    category: "members",
  },
  manage_nicknames: {
    id: "manage_nicknames",
    name: "Manage Nicknames",
    description: "Allows changing other members' nicknames",
    category: "members",
  },
  manage_roles: {
    id: "manage_roles",
    name: "Manage Roles",
    description: "Allows creating, editing, and assigning roles",
    category: "members",
    dangerous: true,
    requiresAdmin: true,
  },
  view_audit_log: {
    id: "view_audit_log",
    name: "View Audit Log",
    description: "Allows viewing server audit logs",
    category: "members",
    requiresAdmin: true,
  },
  view_member_profiles: {
    id: "view_member_profiles",
    name: "View Member Profiles",
    description: "Allows viewing detailed member profiles",
    category: "members",
  },

  // Channel permissions
  create_channels: {
    id: "create_channels",
    name: "Create Channels",
    description: "Allows creating new text and voice channels",
    category: "channels",
  },
  edit_channels: {
    id: "edit_channels",
    name: "Edit Channels",
    description: "Allows editing channel settings",
    category: "channels",
  },
  delete_channels: {
    id: "delete_channels",
    name: "Delete Channels",
    description: "Allows deleting channels",
    category: "channels",
    dangerous: true,
  },
  manage_channels: {
    id: "manage_channels",
    name: "Manage Channels",
    description: "Full control over channels",
    category: "channels",
    dangerous: true,
  },
  manage_channel_permissions: {
    id: "manage_channel_permissions",
    name: "Manage Channel Permissions",
    description: "Allows configuring channel-specific permissions",
    category: "channels",
    dangerous: true,
  },
  create_invites: {
    id: "create_invites",
    name: "Create Invites",
    description: "Allows creating invite links",
    category: "channels",
  },
  manage_invites: {
    id: "manage_invites",
    name: "Manage Invites",
    description: "Allows viewing and revoking invite links",
    category: "channels",
  },
  manage_webhooks: {
    id: "manage_webhooks",
    name: "Manage Webhooks",
    description: "Allows creating and managing webhooks",
    category: "channels",
    requiresAdmin: true,
  },

  // Admin permissions
  administrator: {
    id: "administrator",
    name: "Administrator",
    description: "Grants all permissions and bypasses channel overrides",
    category: "admin",
    dangerous: true,
    requiresAdmin: true,
  },
  manage_server: {
    id: "manage_server",
    name: "Manage Server",
    description: "Allows changing server settings",
    category: "admin",
    dangerous: true,
    requiresAdmin: true,
  },
  manage_integrations: {
    id: "manage_integrations",
    name: "Manage Integrations",
    description: "Allows managing external integrations",
    category: "admin",
    requiresAdmin: true,
  },
  manage_emojis: {
    id: "manage_emojis",
    name: "Manage Emojis",
    description: "Allows adding and removing custom emojis",
    category: "admin",
  },
  manage_stickers: {
    id: "manage_stickers",
    name: "Manage Stickers",
    description: "Allows adding and removing custom stickers",
    category: "admin",
  },
  view_analytics: {
    id: "view_analytics",
    name: "View Analytics",
    description: "Allows viewing server analytics and insights",
    category: "admin",
    requiresAdmin: true,
  },
  manage_billing: {
    id: "manage_billing",
    name: "Manage Billing",
    description: "Allows managing subscription and billing",
    category: "admin",
    dangerous: true,
    requiresAdmin: true,
  },
  manage_security: {
    id: "manage_security",
    name: "Manage Security",
    description: "Allows configuring security settings",
    category: "admin",
    dangerous: true,
    requiresAdmin: true,
  },

  // Moderation permissions
  mute_members: {
    id: "mute_members",
    name: "Mute Members",
    description: "Allows muting members in voice channels",
    category: "moderation",
  },
  deafen_members: {
    id: "deafen_members",
    name: "Deafen Members",
    description: "Allows deafening members in voice channels",
    category: "moderation",
  },
  move_members: {
    id: "move_members",
    name: "Move Members",
    description: "Allows moving members between voice channels",
    category: "moderation",
  },
  moderate_content: {
    id: "moderate_content",
    name: "Moderate Content",
    description: "Allows moderating user-generated content",
    category: "moderation",
  },
  view_reports: {
    id: "view_reports",
    name: "View Reports",
    description: "Allows viewing user reports",
    category: "moderation",
  },
  manage_reports: {
    id: "manage_reports",
    name: "Manage Reports",
    description: "Allows taking action on reports",
    category: "moderation",
  },
  manage_auto_mod: {
    id: "manage_auto_mod",
    name: "Manage Auto-Mod",
    description: "Allows configuring automatic moderation",
    category: "moderation",
    requiresAdmin: true,
  },
};

// ============================================================================
// Permission Categories
// ============================================================================

export const PERMISSION_CATEGORIES: Record<
  PermissionCategory,
  Omit<PermissionGroup, "permissions">
> = {
  general: {
    category: "general",
    name: "General",
    description: "Basic permissions for interacting with the server",
    icon: "Globe",
  },
  messages: {
    category: "messages",
    name: "Messages",
    description: "Permissions for managing messages",
    icon: "MessageSquare",
  },
  members: {
    category: "members",
    name: "Members",
    description: "Permissions for managing server members",
    icon: "Users",
  },
  channels: {
    category: "channels",
    name: "Channels",
    description: "Permissions for managing channels",
    icon: "Hash",
  },
  admin: {
    category: "admin",
    name: "Administration",
    description: "Server administration permissions",
    icon: "Shield",
  },
  moderation: {
    category: "moderation",
    name: "Moderation",
    description: "Content and member moderation permissions",
    icon: "Gavel",
  },
};

// ============================================================================
// Permission Groups (combined)
// ============================================================================

export const PERMISSION_GROUPS: PermissionGroup[] = Object.keys(
  PERMISSION_CATEGORIES,
).map((category) => ({
  ...PERMISSION_CATEGORIES[category as PermissionCategory],
  permissions: Object.values(PERMISSIONS).filter(
    (p) => p.category === category,
  ),
}));

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all permissions for a specific category
 */
export function getPermissionsByCategory(
  category: PermissionCategory,
): PermissionDefinition[] {
  return Object.values(PERMISSIONS).filter((p) => p.category === category);
}

/**
 * Get a permission definition by ID
 */
export function getPermission(
  id: Permission,
): PermissionDefinition | undefined {
  return PERMISSIONS[id];
}

/**
 * Get all dangerous permissions
 */
export function getDangerousPermissions(): PermissionDefinition[] {
  return Object.values(PERMISSIONS).filter((p) => p.dangerous);
}

/**
 * Get all admin-required permissions
 */
export function getAdminPermissions(): PermissionDefinition[] {
  return Object.values(PERMISSIONS).filter((p) => p.requiresAdmin);
}

/**
 * Check if a permission is dangerous
 */
export function isDangerousPermission(permission: Permission): boolean {
  return PERMISSIONS[permission]?.dangerous ?? false;
}

/**
 * Check if a permission requires admin
 */
export function requiresAdmin(permission: Permission): boolean {
  return PERMISSIONS[permission]?.requiresAdmin ?? false;
}

/**
 * Get all permission IDs
 */
export function getAllPermissionIds(): Permission[] {
  return Object.keys(PERMISSIONS) as Permission[];
}

/**
 * Get permission count by category
 */
export function getPermissionCountByCategory(): Record<
  PermissionCategory,
  number
> {
  const counts: Record<PermissionCategory, number> = {
    general: 0,
    messages: 0,
    members: 0,
    channels: 0,
    admin: 0,
    moderation: 0,
  };

  Object.values(PERMISSIONS).forEach((p) => {
    counts[p.category]++;
  });

  return counts;
}
