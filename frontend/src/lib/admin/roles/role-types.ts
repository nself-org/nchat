/**
 * Role Types - Core TypeScript types for role and permission management
 *
 * This module defines the type system for the RBAC (Role-Based Access Control)
 * implementation in nself-chat.
 */

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Permission categories that group related permissions
 */
export type PermissionCategory =
  | "general"
  | "messages"
  | "members"
  | "channels"
  | "admin"
  | "moderation";

/**
 * Individual permission identifiers
 */
export type Permission =
  // General permissions
  | "view_channels"
  | "send_messages"
  | "embed_links"
  | "attach_files"
  | "add_reactions"
  | "use_external_emojis"
  | "use_voice"
  | "use_video"
  | "change_nickname"
  // Message permissions
  | "edit_own_messages"
  | "delete_own_messages"
  | "edit_others_messages"
  | "delete_others_messages"
  | "pin_messages"
  | "mention_everyone"
  | "manage_messages"
  | "view_message_history"
  // Member permissions
  | "invite_members"
  | "kick_members"
  | "ban_members"
  | "timeout_members"
  | "manage_nicknames"
  | "manage_roles"
  | "view_audit_log"
  | "view_member_profiles"
  // Channel permissions
  | "create_channels"
  | "edit_channels"
  | "delete_channels"
  | "manage_channels"
  | "manage_channel_permissions"
  | "create_invites"
  | "manage_invites"
  | "manage_webhooks"
  // Admin permissions
  | "administrator"
  | "manage_server"
  | "manage_integrations"
  | "manage_emojis"
  | "manage_stickers"
  | "view_analytics"
  | "manage_billing"
  | "manage_security"
  // Moderation permissions
  | "mute_members"
  | "deafen_members"
  | "move_members"
  | "moderate_content"
  | "view_reports"
  | "manage_reports"
  | "manage_auto_mod";

/**
 * Permission definition with metadata
 */
export interface PermissionDefinition {
  id: Permission;
  name: string;
  description: string;
  category: PermissionCategory;
  dangerous?: boolean;
  requiresAdmin?: boolean;
}

/**
 * Permissions grouped by category
 */
export interface PermissionGroup {
  category: PermissionCategory;
  name: string;
  description: string;
  icon: string;
  permissions: PermissionDefinition[];
}

// ============================================================================
// Role Types
// ============================================================================

/**
 * Built-in role identifiers
 */
export type BuiltInRoleId =
  | "owner"
  | "admin"
  | "moderator"
  | "member"
  | "guest";

/**
 * Role configuration
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  position: number; // Higher = more authority (0 is lowest)
  isBuiltIn: boolean;
  isDefault: boolean; // Assigned to new members automatically
  isMentionable: boolean;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  memberCount?: number;
}

/**
 * Role creation input
 */
export interface CreateRoleInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  position?: number;
  isDefault?: boolean;
  isMentionable?: boolean;
  permissions?: Permission[];
  copyFrom?: string; // Role ID to copy permissions from
}

/**
 * Role update input
 */
export interface UpdateRoleInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  position?: number;
  isDefault?: boolean;
  isMentionable?: boolean;
  permissions?: Permission[];
}

/**
 * Role assignment to a user
 */
export interface UserRole {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy?: string;
  expiresAt?: Date | null;
}

/**
 * Role change history entry
 */
export interface RoleHistoryEntry {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  action: "assigned" | "removed" | "expired";
  performedBy?: string;
  performedByName?: string;
  timestamp: Date;
  reason?: string;
}

// ============================================================================
// Permission Inheritance
// ============================================================================

/**
 * Effective permissions for a user, considering all roles
 */
export interface EffectivePermissions {
  userId: string;
  permissions: Permission[];
  highestRole: Role;
  roles: Role[];
  isOwner: boolean;
  isAdmin: boolean;
  computedAt: Date;
}

/**
 * Permission override for a specific channel
 */
export interface ChannelPermissionOverride {
  channelId: string;
  roleId?: string;
  userId?: string;
  allow: Permission[];
  deny: Permission[];
}

// ============================================================================
// Role Hierarchy
// ============================================================================

/**
 * Role hierarchy node for tree visualization
 */
export interface RoleHierarchyNode {
  role: Role;
  children: RoleHierarchyNode[];
  depth: number;
  canManage: boolean; // Can current user manage this role
}

/**
 * Role comparison result
 */
export interface RoleComparison {
  higherRole: Role;
  lowerRole: Role;
  positionDifference: number;
  permissionDifference: {
    onlyInHigher: Permission[];
    onlyInLower: Permission[];
    shared: Permission[];
  };
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Role editor state
 */
export interface RoleEditorState {
  role: Partial<Role>;
  isDirty: boolean;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

/**
 * Permission matrix cell state
 */
export interface PermissionMatrixCell {
  permission: Permission;
  roleId: string;
  enabled: boolean;
  inherited: boolean;
  overridden: boolean;
}

/**
 * Bulk role assignment state
 */
export interface BulkAssignmentState {
  userIds: string[];
  roleIds: string[];
  action: "add" | "remove" | "set";
  isProcessing: boolean;
  progress: number;
  errors: Array<{ userId: string; error: string }>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface RoleListResponse {
  roles: Role[];
  total: number;
}

export interface RoleResponse {
  role: Role;
}

export interface RoleMembersResponse {
  members: Array<{
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    assignedAt: Date;
  }>;
  total: number;
}

export interface PermissionCheckResponse {
  hasPermission: boolean;
  reason?: string;
  grantedBy?: string; // Role that grants the permission
}
