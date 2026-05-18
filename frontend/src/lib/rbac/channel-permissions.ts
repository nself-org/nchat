/**
 * Channel Permissions - Channel-specific permission management
 *
 * Provides per-channel role overrides, channel-level bans, and invite permissions.
 * Allows fine-grained control over permissions at the channel level.
 */

import {
  type Permission,
  type Role,
  ROLE_HIERARCHY,
  PERMISSIONS,
} from "@/types/rbac";
import {
  type PermissionContext,
  type PermissionResult,
} from "./permission-builder";

// ============================================================================
// Types
// ============================================================================

/**
 * Permission override for a channel
 */
export interface ChannelPermissionOverride {
  id: string;
  channelId: string;
  targetType: "role" | "user";
  targetId: string; // roleId or userId
  allow: Permission[];
  deny: Permission[];
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
}

/**
 * Channel ban entry
 */
export interface ChannelBan {
  id: string;
  channelId: string;
  userId: string;
  reason?: string;
  bannedAt: Date;
  bannedBy: string;
  expiresAt?: Date;
}

/**
 * Channel invite configuration
 */
export interface ChannelInvite {
  id: string;
  channelId: string;
  code: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  maxUses?: number;
  uses: number;
  isActive: boolean;
}

/**
 * Channel-specific permission context
 */
export interface ChannelPermissionContext extends PermissionContext {
  channelId: string;
  channelOwnerId?: string;
  isChannelPublic?: boolean;
  userChannelRole?: Role;
}

/**
 * Effective channel permissions for a user
 */
export interface EffectiveChannelPermissions {
  userId: string;
  channelId: string;
  permissions: Permission[];
  overrides: ChannelPermissionOverride[];
  isBanned: boolean;
  banExpiresAt?: Date;
  computedAt: Date;
}

// ============================================================================
// Channel Permission Manager
// ============================================================================

/**
 * Manager for channel-level permissions
 */
export class ChannelPermissionManager {
  private overrides: Map<string, ChannelPermissionOverride[]> = new Map();
  private bans: Map<string, ChannelBan[]> = new Map();
  private invites: Map<string, ChannelInvite[]> = new Map();

  // -------------------------------------------------------------------------
  // Override Management
  // -------------------------------------------------------------------------

  /**
   * Add a permission override for a channel
   */
  addOverride(override: ChannelPermissionOverride): void {
    const key = override.channelId;
    const existing = this.overrides.get(key) || [];

    // Remove any existing override for the same target
    const filtered = existing.filter(
      (o) =>
        !(
          o.targetType === override.targetType &&
          o.targetId === override.targetId
        ),
    );

    filtered.push(override);
    this.overrides.set(key, filtered);
  }

  /**
   * Remove a permission override
   */
  removeOverride(
    channelId: string,
    targetType: "role" | "user",
    targetId: string,
  ): boolean {
    const existing = this.overrides.get(channelId);
    if (!existing) return false;

    const filtered = existing.filter(
      (o) => !(o.targetType === targetType && o.targetId === targetId),
    );

    if (filtered.length === existing.length) return false;

    if (filtered.length === 0) {
      this.overrides.delete(channelId);
    } else {
      this.overrides.set(channelId, filtered);
    }

    return true;
  }

  /**
   * Get all overrides for a channel
   */
  getOverrides(channelId: string): ChannelPermissionOverride[] {
    return this.overrides.get(channelId) || [];
  }

  /**
   * Get override for a specific target
   */
  getOverride(
    channelId: string,
    targetType: "role" | "user",
    targetId: string,
  ): ChannelPermissionOverride | undefined {
    const overrides = this.overrides.get(channelId) || [];
    return overrides.find(
      (o) => o.targetType === targetType && o.targetId === targetId,
    );
  }

  /**
   * Clear all overrides for a channel
   */
  clearOverrides(channelId: string): void {
    this.overrides.delete(channelId);
  }

  // -------------------------------------------------------------------------
  // Ban Management
  // -------------------------------------------------------------------------

  /**
   * Ban a user from a channel
   */
  banUser(ban: ChannelBan): void {
    const key = ban.channelId;
    const existing = this.bans.get(key) || [];

    // Remove any existing ban for the same user
    const filtered = existing.filter((b) => b.userId !== ban.userId);
    filtered.push(ban);
    this.bans.set(key, filtered);
  }

  /**
   * Unban a user from a channel
   */
  unbanUser(channelId: string, userId: string): boolean {
    const existing = this.bans.get(channelId);
    if (!existing) return false;

    const filtered = existing.filter((b) => b.userId !== userId);

    if (filtered.length === existing.length) return false;

    if (filtered.length === 0) {
      this.bans.delete(channelId);
    } else {
      this.bans.set(channelId, filtered);
    }

    return true;
  }

  /**
   * Check if a user is banned from a channel
   */
  isBanned(channelId: string, userId: string): boolean {
    const ban = this.getBan(channelId, userId);
    if (!ban) return false;

    // Check if ban has expired
    if (ban.expiresAt && new Date() > ban.expiresAt) {
      this.unbanUser(channelId, userId);
      return false;
    }

    return true;
  }

  /**
   * Get ban entry for a user
   */
  getBan(channelId: string, userId: string): ChannelBan | undefined {
    const bans = this.bans.get(channelId) || [];
    return bans.find((b) => b.userId === userId);
  }

  /**
   * Get all bans for a channel
   */
  getChannelBans(channelId: string): ChannelBan[] {
    return this.bans.get(channelId) || [];
  }

  /**
   * Clear all bans for a channel
   */
  clearBans(channelId: string): void {
    this.bans.delete(channelId);
  }

  // -------------------------------------------------------------------------
  // Invite Management
  // -------------------------------------------------------------------------

  /**
   * Create a channel invite
   */
  createInvite(invite: ChannelInvite): void {
    const key = invite.channelId;
    const existing = this.invites.get(key) || [];
    existing.push(invite);
    this.invites.set(key, existing);
  }

  /**
   * Get invite by code
   */
  getInviteByCode(code: string): ChannelInvite | undefined {
    for (const invites of this.invites.values()) {
      const invite = invites.find((i) => i.code === code);
      if (invite) return invite;
    }
    return undefined;
  }

  /**
   * Use an invite (increment use count)
   */
  useInvite(code: string): boolean {
    const invite = this.getInviteByCode(code);
    if (!invite) return false;

    // Check if invite is valid
    if (!this.isInviteValid(invite)) return false;

    // Increment use count
    invite.uses++;

    // Deactivate if max uses reached
    if (invite.maxUses && invite.uses >= invite.maxUses) {
      invite.isActive = false;
    }

    return true;
  }

  /**
   * Check if an invite is valid
   */
  isInviteValid(invite: ChannelInvite): boolean {
    if (!invite.isActive) return false;
    if (invite.expiresAt && new Date() > invite.expiresAt) return false;
    if (invite.maxUses && invite.uses >= invite.maxUses) return false;
    return true;
  }

  /**
   * Revoke an invite
   */
  revokeInvite(code: string): boolean {
    const invite = this.getInviteByCode(code);
    if (!invite) return false;
    invite.isActive = false;
    return true;
  }

  /**
   * Get all invites for a channel
   */
  getChannelInvites(channelId: string): ChannelInvite[] {
    return this.invites.get(channelId) || [];
  }

  /**
   * Get active invites for a channel
   */
  getActiveInvites(channelId: string): ChannelInvite[] {
    const invites = this.invites.get(channelId) || [];
    return invites.filter((i) => this.isInviteValid(i));
  }

  /**
   * Clear all invites for a channel
   */
  clearInvites(channelId: string): void {
    this.invites.delete(channelId);
  }

  // -------------------------------------------------------------------------
  // Permission Checking
  // -------------------------------------------------------------------------

  /**
   * Check if a user has a permission in a channel
   */
  checkPermission(
    permission: Permission,
    context: ChannelPermissionContext,
    basePermissions: Permission[],
  ): PermissionResult {
    // Owner always has all permissions
    if (context.userRole === "owner") {
      return {
        allowed: true,
        reason: "Owner has all permissions",
        grantedBy: "owner-role",
      };
    }

    // Check if user is banned from the channel
    if (this.isBanned(context.channelId, context.userId)) {
      return {
        allowed: false,
        reason: "User is banned from this channel",
        deniedBy: "channel-ban",
      };
    }

    // Get all applicable overrides (user-specific and role-specific)
    const userOverride = this.getOverride(
      context.channelId,
      "user",
      context.userId,
    );
    const roleOverride = context.userRole
      ? this.getOverride(context.channelId, "role", context.userRole)
      : undefined;

    // User overrides take complete precedence over role overrides
    // Check user override first (both allow and deny)
    if (userOverride) {
      if (userOverride.deny.includes(permission)) {
        return {
          allowed: false,
          reason: "Permission denied by user channel override",
          deniedBy: `channel-override-user:${context.userId}`,
        };
      }
      if (userOverride.allow.includes(permission)) {
        return {
          allowed: true,
          reason: "Permission granted by user channel override",
          grantedBy: `channel-override-user:${context.userId}`,
        };
      }
    }

    // Then check role override (if no user override matched)
    if (roleOverride) {
      if (roleOverride.deny.includes(permission)) {
        return {
          allowed: false,
          reason: "Permission denied by role channel override",
          deniedBy: `channel-override-role:${context.userRole}`,
        };
      }
      if (roleOverride.allow.includes(permission)) {
        return {
          allowed: true,
          reason: "Permission granted by role channel override",
          grantedBy: `channel-override-role:${context.userRole}`,
        };
      }
    }

    // Fall back to base permissions
    const allowed = basePermissions.includes(permission);
    return {
      allowed,
      reason: allowed
        ? `Granted by ${context.userRole} role`
        : `${context.userRole} role does not have this permission`,
      grantedBy: allowed ? `${context.userRole}-role` : undefined,
      deniedBy: allowed ? undefined : `${context.userRole}-role`,
    };
  }

  /**
   * Get effective permissions for a user in a channel
   */
  getEffectivePermissions(
    context: ChannelPermissionContext,
    basePermissions: Permission[],
  ): EffectiveChannelPermissions {
    const overrides: ChannelPermissionOverride[] = [];
    let permissions = [...basePermissions];

    // Check if user is banned
    const isBanned = this.isBanned(context.channelId, context.userId);
    const ban = this.getBan(context.channelId, context.userId);

    if (isBanned) {
      return {
        userId: context.userId,
        channelId: context.channelId,
        permissions: [],
        overrides: [],
        isBanned: true,
        banExpiresAt: ban?.expiresAt,
        computedAt: new Date(),
      };
    }

    // Get role override
    const roleOverride = context.userRole
      ? this.getOverride(context.channelId, "role", context.userRole)
      : undefined;

    if (roleOverride) {
      overrides.push(roleOverride);
      // Apply role overrides
      permissions = applyOverride(permissions, roleOverride);
    }

    // Get user override (takes precedence)
    const userOverride = this.getOverride(
      context.channelId,
      "user",
      context.userId,
    );

    if (userOverride) {
      overrides.push(userOverride);
      // Apply user overrides
      permissions = applyOverride(permissions, userOverride);
    }

    return {
      userId: context.userId,
      channelId: context.channelId,
      permissions,
      overrides,
      isBanned: false,
      computedAt: new Date(),
    };
  }

  /**
   * Check if user can invite others to a channel
   */
  canInvite(
    context: ChannelPermissionContext,
    basePermissions: Permission[],
  ): boolean {
    // Check if user has invite permission
    const result = this.checkPermission(
      PERMISSIONS.CHANNEL_MANAGE,
      context,
      basePermissions,
    );

    if (result.allowed) return true;

    // Check for specific invite permission in overrides
    const userOverride = this.getOverride(
      context.channelId,
      "user",
      context.userId,
    );
    if (userOverride?.allow.includes(PERMISSIONS.CHANNEL_MANAGE)) {
      return true;
    }

    // Check role hierarchy - moderator and above can usually invite
    if (
      context.userRole &&
      ROLE_HIERARCHY[context.userRole] >= ROLE_HIERARCHY.moderator
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can manage channel permissions
   */
  canManagePermissions(context: ChannelPermissionContext): boolean {
    // Owner can always manage
    if (context.userRole === "owner") return true;

    // Channel owner can manage
    if (context.channelOwnerId === context.userId) return true;

    // Admin can manage
    if (context.userRole === "admin") return true;

    return false;
  }

  /**
   * Check if user can ban others from a channel
   */
  canBan(
    context: ChannelPermissionContext,
    targetUserId: string,
    targetRole: Role,
  ): PermissionResult {
    // Owner protection
    if (targetRole === "owner") {
      return {
        allowed: false,
        reason: "Cannot ban owner",
        deniedBy: "owner-protection",
      };
    }

    // Cannot ban yourself
    if (context.userId === targetUserId) {
      return {
        allowed: false,
        reason: "Cannot ban yourself",
        deniedBy: "self-protection",
      };
    }

    // Owner can ban anyone except owner
    if (context.userRole === "owner") {
      return {
        allowed: true,
        reason: "Owner can ban anyone",
        grantedBy: "owner-role",
      };
    }

    // Admin can ban non-admin/non-owner
    if (context.userRole === "admin") {
      if (targetRole === "admin") {
        return {
          allowed: false,
          reason: "Admin cannot ban other admins",
          deniedBy: "role-hierarchy",
        };
      }
      return {
        allowed: true,
        reason: "Admin can ban this user",
        grantedBy: "admin-role",
      };
    }

    // Moderator can ban member/guest
    if (context.userRole === "moderator") {
      if (ROLE_HIERARCHY[targetRole] >= ROLE_HIERARCHY.moderator) {
        return {
          allowed: false,
          reason: "Moderator cannot ban moderator or above",
          deniedBy: "role-hierarchy",
        };
      }
      return {
        allowed: true,
        reason: "Moderator can ban this user",
        grantedBy: "moderator-role",
      };
    }

    return {
      allowed: false,
      reason: "Insufficient permissions to ban users",
      deniedBy: "role-hierarchy",
    };
  }

  // -------------------------------------------------------------------------
  // Utility Methods
  // -------------------------------------------------------------------------

  /**
   * Clear all data for a channel (when channel is deleted)
   */
  clearChannel(channelId: string): void {
    this.clearOverrides(channelId);
    this.clearBans(channelId);
    this.clearInvites(channelId);
  }

  /**
   * Get all channel IDs with data
   */
  getChannelIds(): string[] {
    const ids = new Set<string>();
    this.overrides.forEach((_, key) => ids.add(key));
    this.bans.forEach((_, key) => ids.add(key));
    this.invites.forEach((_, key) => ids.add(key));
    return Array.from(ids);
  }

  /**
   * Export all data for serialization
   */
  exportData(): {
    overrides: Record<string, ChannelPermissionOverride[]>;
    bans: Record<string, ChannelBan[]>;
    invites: Record<string, ChannelInvite[]>;
  } {
    const overridesObj: Record<string, ChannelPermissionOverride[]> = {};
    const bansObj: Record<string, ChannelBan[]> = {};
    const invitesObj: Record<string, ChannelInvite[]> = {};

    this.overrides.forEach((v, k) => {
      overridesObj[k] = v;
    });
    this.bans.forEach((v, k) => {
      bansObj[k] = v;
    });
    this.invites.forEach((v, k) => {
      invitesObj[k] = v;
    });

    return { overrides: overridesObj, bans: bansObj, invites: invitesObj };
  }

  /**
   * Import data from serialized format
   */
  importData(data: {
    overrides?: Record<string, ChannelPermissionOverride[]>;
    bans?: Record<string, ChannelBan[]>;
    invites?: Record<string, ChannelInvite[]>;
  }): void {
    if (data.overrides) {
      Object.entries(data.overrides).forEach(([k, v]) => {
        this.overrides.set(k, v);
      });
    }
    if (data.bans) {
      Object.entries(data.bans).forEach(([k, v]) => {
        this.bans.set(k, v);
      });
    }
    if (data.invites) {
      Object.entries(data.invites).forEach(([k, v]) => {
        this.invites.set(k, v);
      });
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Apply an override to a permission list
 */
function applyOverride(
  permissions: Permission[],
  override: ChannelPermissionOverride,
): Permission[] {
  // Check if override has expired
  if (override.expiresAt && new Date() > override.expiresAt) {
    return permissions;
  }

  // Remove denied permissions
  let result = permissions.filter((p) => !override.deny.includes(p));

  // Add allowed permissions
  override.allow.forEach((p) => {
    if (!result.includes(p)) {
      result.push(p);
    }
  });

  return result;
}

/**
 * Create a new channel permission manager
 */
export function createChannelPermissionManager(): ChannelPermissionManager {
  return new ChannelPermissionManager();
}

/**
 * Create a permission override
 */
export function createOverride(params: {
  channelId: string;
  targetType: "role" | "user";
  targetId: string;
  allow?: Permission[];
  deny?: Permission[];
  createdBy: string;
  expiresAt?: Date;
}): ChannelPermissionOverride {
  return {
    id: generateId(),
    channelId: params.channelId,
    targetType: params.targetType,
    targetId: params.targetId,
    allow: params.allow || [],
    deny: params.deny || [],
    createdAt: new Date(),
    createdBy: params.createdBy,
    expiresAt: params.expiresAt,
  };
}

/**
 * Create a channel ban
 */
export function createBan(params: {
  channelId: string;
  userId: string;
  bannedBy: string;
  reason?: string;
  expiresAt?: Date;
}): ChannelBan {
  return {
    id: generateId(),
    channelId: params.channelId,
    userId: params.userId,
    reason: params.reason,
    bannedAt: new Date(),
    bannedBy: params.bannedBy,
    expiresAt: params.expiresAt,
  };
}

/**
 * Create a channel invite
 */
export function createInvite(params: {
  channelId: string;
  createdBy: string;
  code?: string;
  expiresAt?: Date;
  maxUses?: number;
}): ChannelInvite {
  return {
    id: generateId(),
    channelId: params.channelId,
    code: params.code || generateInviteCode(),
    createdBy: params.createdBy,
    createdAt: new Date(),
    expiresAt: params.expiresAt,
    maxUses: params.maxUses,
    uses: 0,
    isActive: true,
  };
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate an invite code
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================================================
// Pre-built Channel Permission Configurations
// ============================================================================

/**
 * Create a read-only channel permission override for a role
 */
export function createReadOnlyOverride(
  channelId: string,
  roleId: string,
  createdBy: string,
): ChannelPermissionOverride {
  return createOverride({
    channelId,
    targetType: "role",
    targetId: roleId,
    allow: [PERMISSIONS.USER_VIEW],
    deny: [
      PERMISSIONS.MESSAGE_SEND,
      PERMISSIONS.MESSAGE_EDIT,
      PERMISSIONS.MESSAGE_DELETE,
      PERMISSIONS.MESSAGE_PIN,
    ],
    createdBy,
  });
}

/**
 * Create an announcement channel permission override (only admins can post)
 */
export function createAnnouncementOverride(
  channelId: string,
  createdBy: string,
): ChannelPermissionOverride {
  return createOverride({
    channelId,
    targetType: "role",
    targetId: "member",
    allow: [PERMISSIONS.USER_VIEW],
    deny: [PERMISSIONS.MESSAGE_SEND],
    createdBy,
  });
}

/**
 * Create a muted user override (temporary)
 */
export function createMutedUserOverride(
  channelId: string,
  userId: string,
  createdBy: string,
  durationMinutes: number,
): ChannelPermissionOverride {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

  return createOverride({
    channelId,
    targetType: "user",
    targetId: userId,
    deny: [PERMISSIONS.MESSAGE_SEND],
    createdBy,
    expiresAt,
  });
}
