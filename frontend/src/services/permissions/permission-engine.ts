/**
 * Permission Engine - Complete Role/Permission System with Full Parity
 *
 * Features:
 * - Hierarchical roles (Owner > Admin > Moderator > Member > Guest + Custom)
 * - Multi-level inheritance (Workspace > Category > Channel > Role > User)
 * - Permission overrides at all levels
 * - Policy simulation ("what-if" testing)
 * - Permission diff and audit
 * - Platform presets (Discord, Slack, Telegram)
 * - Cached permission computation
 *
 * @module services/permissions/permission-engine
 */

import {
  Permission as RBACPermission,
  PERMISSIONS,
  ROLE_HIERARCHY,
  type Role as RBACRole,
} from "@/types/rbac";

// ============================================================================
// Core Types
// ============================================================================

/**
 * Permission identifier - can be from standard RBAC or custom
 */
export type PermissionId = RBACPermission | string;

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
 * Override action - allow or deny
 */
export type OverrideAction = "allow" | "deny" | "inherit";

/**
 * Inheritance level for permissions
 */
export type InheritanceLevel =
  | "workspace"
  | "category"
  | "channel"
  | "role"
  | "user";

/**
 * Platform preset style
 */
export type PlatformPreset = "discord" | "slack" | "telegram" | "custom";

/**
 * Permission state after resolution
 */
export type PermissionState = "allowed" | "denied" | "inherited" | "unset";

// ============================================================================
// Role Types
// ============================================================================

/**
 * Role definition with full configuration
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  position: number; // Higher = more authority (owner typically 100)
  isBuiltIn: boolean;
  isDefault: boolean; // Auto-assigned to new members
  isMentionable: boolean;
  permissions: PermissionId[];
  inheritFrom?: string; // Parent role ID for permission inheritance
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  memberCount?: number;
}

/**
 * Role comparison result
 */
export interface RoleComparison {
  roleA: Role;
  roleB: Role;
  positionDifference: number;
  sharedPermissions: PermissionId[];
  onlyInA: PermissionId[];
  onlyInB: PermissionId[];
  canAManageB: boolean;
  canBManageA: boolean;
}

// ============================================================================
// Override Types
// ============================================================================

/**
 * Permission override at any level
 */
export interface PermissionOverride {
  id: string;
  level: InheritanceLevel;
  targetType: "role" | "user" | "category" | "channel";
  targetId: string;
  permission: PermissionId;
  action: OverrideAction;
  reason?: string;
  expiresAt?: Date;
  createdAt: Date;
  createdBy: string;
  priority: number; // Higher priority overrides lower
}

/**
 * Workspace-level permission defaults
 */
export interface WorkspacePermissions {
  workspaceId: string;
  defaultRole: string; // Role assigned to new members
  defaultPermissions: PermissionId[]; // Base permissions for all users
  restrictedPermissions: PermissionId[]; // Permissions that require special handling
  overrides: PermissionOverride[];
}

/**
 * Category-level permission configuration
 */
export interface CategoryPermissions {
  categoryId: string;
  workspaceId: string;
  name: string;
  inheritFromWorkspace: boolean;
  overrides: PermissionOverride[];
}

/**
 * Channel-level permission configuration
 */
export interface ChannelPermissions {
  channelId: string;
  categoryId?: string;
  workspaceId: string;
  inheritFromCategory: boolean;
  syncWithCategory: boolean; // Auto-sync when category changes
  overrides: PermissionOverride[];
}

// ============================================================================
// Context and Result Types
// ============================================================================

/**
 * Context for permission evaluation
 */
export interface PermissionContext {
  userId: string;
  userRoles: Role[];
  workspaceId: string;
  categoryId?: string;
  channelId?: string;
  resourceType?: "message" | "channel" | "user" | "role" | "file";
  resourceId?: string;
  resourceOwnerId?: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Result of a permission check
 */
export interface PermissionResult {
  permission: PermissionId;
  allowed: boolean;
  state: PermissionState;
  reason: string;
  grantedBy?: string; // Role/override that granted
  deniedBy?: string; // Role/override that denied
  level: InheritanceLevel;
  chain: PermissionChainLink[];
  computedAt: Date;
}

/**
 * Link in the permission resolution chain
 */
export interface PermissionChainLink {
  level: InheritanceLevel;
  source: string; // role name, override ID, etc.
  action: OverrideAction;
  priority: number;
}

/**
 * Effective permissions for a user in a context
 */
export interface EffectivePermissions {
  userId: string;
  workspaceId: string;
  categoryId?: string;
  channelId?: string;
  permissions: Map<PermissionId, PermissionResult>;
  allowedPermissions: PermissionId[];
  deniedPermissions: PermissionId[];
  inheritedPermissions: PermissionId[];
  highestRole: Role;
  isOwner: boolean;
  isAdmin: boolean;
  computedAt: Date;
}

// ============================================================================
// Simulation Types
// ============================================================================

/**
 * Policy simulation request
 */
export interface PolicySimulationRequest {
  context: PermissionContext;
  hypotheticalChanges: HypotheticalChange[];
}

/**
 * Hypothetical change for simulation
 */
export interface HypotheticalChange {
  type:
    | "add_role"
    | "remove_role"
    | "add_override"
    | "remove_override"
    | "change_role_position";
  targetUserId?: string;
  roleId?: string;
  override?: Partial<PermissionOverride>;
  newPosition?: number;
}

/**
 * Policy simulation result
 */
export interface PolicySimulationResult {
  before: EffectivePermissions;
  after: EffectivePermissions;
  changedPermissions: PermissionDiff[];
  warnings: string[];
  wouldBreakAccess: boolean;
}

/**
 * Permission difference between two states
 */
export interface PermissionDiff {
  permission: PermissionId;
  before: PermissionState;
  after: PermissionState;
  impact: "gained" | "lost" | "unchanged";
}

// ============================================================================
// Audit Types
// ============================================================================

/**
 * Permission audit entry
 */
export interface PermissionAuditEntry {
  id: string;
  timestamp: Date;
  actorId: string;
  actorRole: string;
  action: "grant" | "revoke" | "modify" | "create_override" | "remove_override";
  targetType: "role" | "user" | "channel" | "category";
  targetId: string;
  permission?: PermissionId;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}

// ============================================================================
// Permission Engine Class
// ============================================================================

/**
 * Main permission engine for computing and managing permissions
 */
export class PermissionEngine {
  private workspacePermissions: Map<string, WorkspacePermissions> = new Map();
  private categoryPermissions: Map<string, CategoryPermissions> = new Map();
  private channelPermissions: Map<string, ChannelPermissions> = new Map();
  private roles: Map<string, Role> = new Map();
  private platformPreset: PlatformPreset = "discord";
  private auditLog: PermissionAuditEntry[] = [];
  private cache: Map<string, EffectivePermissions> = new Map();
  private cacheEnabled: boolean = true;
  private cacheTTLMs: number = 60000; // 1 minute

  constructor(config?: {
    preset?: PlatformPreset;
    cacheEnabled?: boolean;
    cacheTTLMs?: number;
  }) {
    if (config?.preset) {
      this.platformPreset = config.preset;
      this.initializePreset(config.preset);
    }
    if (config?.cacheEnabled !== undefined) {
      this.cacheEnabled = config.cacheEnabled;
    }
    if (config?.cacheTTLMs !== undefined) {
      this.cacheTTLMs = config.cacheTTLMs;
    }
    this.initializeBuiltInRoles();
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  /**
   * Initialize built-in roles
   */
  private initializeBuiltInRoles(): void {
    const builtInRoles: Role[] = [
      {
        id: "owner",
        name: "Owner",
        color: "#ff0000",
        position: 100,
        isBuiltIn: true,
        isDefault: false,
        isMentionable: false,
        permissions: Object.values(PERMISSIONS),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "admin",
        name: "Admin",
        color: "#ff7b00",
        position: 90,
        isBuiltIn: true,
        isDefault: false,
        isMentionable: true,
        permissions: this.getAdminDefaultPermissions(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "moderator",
        name: "Moderator",
        color: "#00ff00",
        position: 70,
        isBuiltIn: true,
        isDefault: false,
        isMentionable: true,
        permissions: this.getModeratorDefaultPermissions(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "member",
        name: "Member",
        color: "#808080",
        position: 20,
        isBuiltIn: true,
        isDefault: true,
        isMentionable: false,
        permissions: this.getMemberDefaultPermissions(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "guest",
        name: "Guest",
        color: "#c0c0c0",
        position: 10,
        isBuiltIn: true,
        isDefault: false,
        isMentionable: false,
        permissions: this.getGuestDefaultPermissions(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    builtInRoles.forEach((role) => this.roles.set(role.id, role));
  }

  /**
   * Initialize platform preset configurations
   */
  private initializePreset(preset: PlatformPreset): void {
    switch (preset) {
      case "discord":
        // Discord-style: Role stacking, complex hierarchy
        // Permissions are OR'd across all roles
        // Channel overrides can allow/deny per role
        break;
      case "slack":
        // Slack-style: Simpler, workspace admins have full control
        // Channels have limited permission customization
        this.roles.get("member")?.permissions.push(PERMISSIONS.CHANNEL_CREATE);
        break;
      case "telegram":
        // Telegram-style: Admin-only for most actions
        // Very restrictive defaults
        const member = this.roles.get("member");
        if (member) {
          member.permissions = [
            PERMISSIONS.MESSAGE_SEND,
            PERMISSIONS.MESSAGE_EDIT,
            PERMISSIONS.USER_VIEW,
          ];
        }
        break;
      case "custom":
        // No preset modifications
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Role Management
  // -------------------------------------------------------------------------

  /**
   * Get a role by ID
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get all roles sorted by position (highest first)
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values()).sort(
      (a, b) => b.position - a.position,
    );
  }

  /**
   * Create a new custom role
   */
  createRole(
    input: Omit<Role, "id" | "createdAt" | "updatedAt" | "isBuiltIn">,
  ): Role {
    const role: Role = {
      ...input,
      id: this.generateId(),
      isBuiltIn: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.roles.set(role.id, role);
    this.invalidateCache();

    return role;
  }

  /**
   * Update a role
   */
  updateRole(
    roleId: string,
    updates: Partial<Omit<Role, "id" | "isBuiltIn" | "createdAt">>,
  ): Role | undefined {
    const role = this.roles.get(roleId);
    if (!role) return undefined;

    // Don't allow modifying built-in role's core properties
    if (
      role.isBuiltIn &&
      (updates.position !== undefined || updates.permissions !== undefined)
    ) {
      throw new Error("Cannot modify core properties of built-in roles");
    }

    const updated: Role = {
      ...role,
      ...updates,
      updatedAt: new Date(),
    };

    this.roles.set(roleId, updated);
    this.invalidateCache();

    return updated;
  }

  /**
   * Delete a custom role
   */
  deleteRole(roleId: string): boolean {
    const role = this.roles.get(roleId);
    if (!role || role.isBuiltIn) return false;

    this.roles.delete(roleId);
    this.invalidateCache();
    return true;
  }

  /**
   * Get the highest role from a list
   */
  getHighestRole(roles: Role[]): Role | undefined {
    if (roles.length === 0) return undefined;
    return roles.reduce((highest, current) =>
      current.position > highest.position ? current : highest,
    );
  }

  /**
   * Check if role A can manage role B
   */
  canManageRole(managerRole: Role, targetRole: Role): boolean {
    // Owner role cannot be managed
    if (targetRole.id === "owner" && targetRole.isBuiltIn) {
      return false;
    }
    // Manager must have higher position
    return managerRole.position > targetRole.position;
  }

  /**
   * Compare two roles
   */
  compareRoles(roleA: Role, roleB: Role): RoleComparison {
    const permSetA = new Set(roleA.permissions);
    const permSetB = new Set(roleB.permissions);

    const sharedPermissions = roleA.permissions.filter((p) => permSetB.has(p));
    const onlyInA = roleA.permissions.filter((p) => !permSetB.has(p));
    const onlyInB = roleB.permissions.filter((p) => !permSetA.has(p));

    return {
      roleA,
      roleB,
      positionDifference: roleA.position - roleB.position,
      sharedPermissions,
      onlyInA,
      onlyInB,
      canAManageB: this.canManageRole(roleA, roleB),
      canBManageA: this.canManageRole(roleB, roleA),
    };
  }

  // -------------------------------------------------------------------------
  // Permission Overrides
  // -------------------------------------------------------------------------

  /**
   * Add a permission override
   * Note: For channel/category overrides, the containerId specifies where the override applies
   */
  addOverride(
    override: Omit<PermissionOverride, "id" | "createdAt">,
    containerId?: string,
  ): PermissionOverride {
    const newOverride: PermissionOverride = {
      ...override,
      id: this.generateId(),
      createdAt: new Date(),
    };

    // Determine the container ID for storing the override
    const storeId = containerId || "default";

    switch (override.level) {
      case "workspace":
        this.addWorkspaceOverride(storeId, newOverride);
        break;
      case "category":
        this.addCategoryOverride(storeId, newOverride);
        break;
      case "channel":
        this.addChannelOverride(storeId, newOverride);
        break;
      default:
        break;
    }

    this.invalidateCache();
    return newOverride;
  }

  /**
   * Remove a permission override
   */
  removeOverride(
    overrideId: string,
    level: InheritanceLevel,
    targetId: string,
  ): boolean {
    switch (level) {
      case "workspace": {
        const workspace = this.workspacePermissions.get(targetId);
        if (workspace) {
          const idx = workspace.overrides.findIndex((o) => o.id === overrideId);
          if (idx !== -1) {
            workspace.overrides.splice(idx, 1);
            this.invalidateCache();
            return true;
          }
        }
        break;
      }
      case "category": {
        const category = this.categoryPermissions.get(targetId);
        if (category) {
          const idx = category.overrides.findIndex((o) => o.id === overrideId);
          if (idx !== -1) {
            category.overrides.splice(idx, 1);
            this.invalidateCache();
            return true;
          }
        }
        break;
      }
      case "channel": {
        const channel = this.channelPermissions.get(targetId);
        if (channel) {
          const idx = channel.overrides.findIndex((o) => o.id === overrideId);
          if (idx !== -1) {
            channel.overrides.splice(idx, 1);
            this.invalidateCache();
            return true;
          }
        }
        break;
      }
    }
    return false;
  }

  /**
   * Get all overrides for a target
   */
  getOverrides(
    level: InheritanceLevel,
    targetId: string,
  ): PermissionOverride[] {
    switch (level) {
      case "workspace":
        return this.workspacePermissions.get(targetId)?.overrides || [];
      case "category":
        return this.categoryPermissions.get(targetId)?.overrides || [];
      case "channel":
        return this.channelPermissions.get(targetId)?.overrides || [];
      default:
        return [];
    }
  }

  private addWorkspaceOverride(
    workspaceId: string,
    override: PermissionOverride,
  ): void {
    let workspace = this.workspacePermissions.get(workspaceId);
    if (!workspace) {
      workspace = {
        workspaceId,
        defaultRole: "member",
        defaultPermissions: [],
        restrictedPermissions: [],
        overrides: [],
      };
      this.workspacePermissions.set(workspaceId, workspace);
    }
    workspace.overrides.push(override);
  }

  private addCategoryOverride(
    categoryId: string,
    override: PermissionOverride,
  ): void {
    let category = this.categoryPermissions.get(categoryId);
    if (!category) {
      category = {
        categoryId,
        workspaceId: "",
        name: "",
        inheritFromWorkspace: true,
        overrides: [],
      };
      this.categoryPermissions.set(categoryId, category);
    }
    category.overrides.push(override);
  }

  private addChannelOverride(
    channelId: string,
    override: PermissionOverride,
  ): void {
    let channel = this.channelPermissions.get(channelId);
    if (!channel) {
      channel = {
        channelId,
        workspaceId: "",
        inheritFromCategory: true,
        syncWithCategory: true,
        overrides: [],
      };
      this.channelPermissions.set(channelId, channel);
    }
    channel.overrides.push(override);
  }

  // -------------------------------------------------------------------------
  // Permission Checking
  // -------------------------------------------------------------------------

  /**
   * Check a single permission
   */
  checkPermission(
    permission: PermissionId,
    context: PermissionContext,
  ): PermissionResult {
    const chain: PermissionChainLink[] = [];
    const now = new Date();

    // Owner always has all permissions
    const highestRole = this.getHighestRole(context.userRoles);
    if (highestRole?.id === "owner") {
      return {
        permission,
        allowed: true,
        state: "allowed",
        reason: "Owner has all permissions",
        grantedBy: "owner",
        level: "role",
        chain: [
          { level: "role", source: "owner", action: "allow", priority: 1000 },
        ],
        computedAt: now,
      };
    }

    // Build permission chain from all levels
    // 1. Check user-specific overrides (highest priority)
    const userOverrides = this.getUserOverrides(context, permission);
    chain.push(
      ...userOverrides.map((o) => ({
        level: o.level,
        source: `user-override:${o.id}`,
        action: o.action,
        priority: o.priority + 500,
      })),
    );

    // 2. Check role-based overrides
    for (const role of context.userRoles) {
      const roleOverrides = this.getRoleOverrides(context, permission, role.id);
      chain.push(
        ...roleOverrides.map((o) => ({
          level: o.level,
          source: `role-override:${role.id}:${o.id}`,
          action: o.action,
          priority: o.priority + role.position,
        })),
      );
    }

    // 3. Check channel-level permissions
    if (context.channelId) {
      const channelOverrides = this.getChannelLevelOverrides(
        context.channelId,
        permission,
      );
      chain.push(
        ...channelOverrides.map((o) => ({
          level: "channel" as InheritanceLevel,
          source: `channel:${o.id}`,
          action: o.action,
          priority: o.priority,
        })),
      );
    }

    // 4. Check category-level permissions
    if (context.categoryId) {
      const categoryOverrides = this.getCategoryLevelOverrides(
        context.categoryId,
        permission,
      );
      chain.push(
        ...categoryOverrides.map((o) => ({
          level: "category" as InheritanceLevel,
          source: `category:${o.id}`,
          action: o.action,
          priority: o.priority,
        })),
      );
    }

    // 5. Check workspace-level permissions
    const workspaceOverrides = this.getWorkspaceLevelOverrides(
      context.workspaceId,
      permission,
    );
    chain.push(
      ...workspaceOverrides.map((o) => ({
        level: "workspace" as InheritanceLevel,
        source: `workspace:${o.id}`,
        action: o.action,
        priority: o.priority,
      })),
    );

    // 6. Check role base permissions (lowest priority)
    for (const role of context.userRoles) {
      if (role.permissions.includes(permission)) {
        chain.push({
          level: "role",
          source: `role:${role.id}`,
          action: "allow",
          priority: role.position,
        });
      }
    }

    // Sort chain by priority (highest first)
    chain.sort((a, b) => b.priority - a.priority);

    // Resolve permission - deny takes precedence at same priority level
    for (const link of chain) {
      if (link.action === "deny") {
        return {
          permission,
          allowed: false,
          state: "denied",
          reason: `Denied by ${link.source}`,
          deniedBy: link.source,
          level: link.level,
          chain,
          computedAt: now,
        };
      }
      if (link.action === "allow") {
        return {
          permission,
          allowed: true,
          state: "allowed",
          reason: `Granted by ${link.source}`,
          grantedBy: link.source,
          level: link.level,
          chain,
          computedAt: now,
        };
      }
    }

    // No explicit grant or deny found
    return {
      permission,
      allowed: false,
      state: "unset",
      reason: "Permission not granted by any role or override",
      level: "workspace",
      chain,
      computedAt: now,
    };
  }

  /**
   * Check multiple permissions
   */
  checkPermissions(
    permissions: PermissionId[],
    context: PermissionContext,
  ): Map<PermissionId, PermissionResult> {
    const results = new Map<PermissionId, PermissionResult>();
    permissions.forEach((perm) => {
      results.set(perm, this.checkPermission(perm, context));
    });
    return results;
  }

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(
    permissions: PermissionId[],
    context: PermissionContext,
  ): boolean {
    return permissions.every(
      (perm) => this.checkPermission(perm, context).allowed,
    );
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(
    permissions: PermissionId[],
    context: PermissionContext,
  ): boolean {
    return permissions.some(
      (perm) => this.checkPermission(perm, context).allowed,
    );
  }

  /**
   * Get effective permissions for a user in a context
   */
  getEffectivePermissions(context: PermissionContext): EffectivePermissions {
    // Check cache
    const cacheKey = this.buildCacheKey(context);
    if (this.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (
        cached &&
        Date.now() - cached.computedAt.getTime() < this.cacheTTLMs
      ) {
        return cached;
      }
    }

    const allPermissions = this.getAllPermissionIds();
    const results = this.checkPermissions(allPermissions, context);

    const allowedPermissions: PermissionId[] = [];
    const deniedPermissions: PermissionId[] = [];
    const inheritedPermissions: PermissionId[] = [];

    results.forEach((result, perm) => {
      if (result.allowed) {
        allowedPermissions.push(perm);
      } else if (result.state === "denied") {
        deniedPermissions.push(perm);
      } else {
        inheritedPermissions.push(perm);
      }
    });

    const highestRole = this.getHighestRole(context.userRoles);

    const effective: EffectivePermissions = {
      userId: context.userId,
      workspaceId: context.workspaceId,
      categoryId: context.categoryId,
      channelId: context.channelId,
      permissions: results,
      allowedPermissions,
      deniedPermissions,
      inheritedPermissions,
      highestRole: highestRole!,
      isOwner: highestRole?.id === "owner",
      isAdmin: highestRole?.id === "owner" || highestRole?.id === "admin",
      computedAt: new Date(),
    };

    // Cache result
    if (this.cacheEnabled) {
      this.cache.set(cacheKey, effective);
    }

    return effective;
  }

  // -------------------------------------------------------------------------
  // Override Resolution Helpers
  // -------------------------------------------------------------------------

  private getUserOverrides(
    context: PermissionContext,
    permission: PermissionId,
  ): PermissionOverride[] {
    const overrides: PermissionOverride[] = [];
    const now = new Date();

    // Check channel-level user overrides
    if (context.channelId) {
      const channel = this.channelPermissions.get(context.channelId);
      if (channel) {
        overrides.push(
          ...channel.overrides.filter(
            (o) =>
              o.targetType === "user" &&
              o.targetId === context.userId &&
              o.permission === permission &&
              (!o.expiresAt || o.expiresAt > now),
          ),
        );
      }
    }

    // Check category-level user overrides
    if (context.categoryId) {
      const category = this.categoryPermissions.get(context.categoryId);
      if (category) {
        overrides.push(
          ...category.overrides.filter(
            (o) =>
              o.targetType === "user" &&
              o.targetId === context.userId &&
              o.permission === permission &&
              (!o.expiresAt || o.expiresAt > now),
          ),
        );
      }
    }

    // Check workspace-level user overrides
    const workspace = this.workspacePermissions.get(context.workspaceId);
    if (workspace) {
      overrides.push(
        ...workspace.overrides.filter(
          (o) =>
            o.targetType === "user" &&
            o.targetId === context.userId &&
            o.permission === permission &&
            (!o.expiresAt || o.expiresAt > now),
        ),
      );
    }

    return overrides;
  }

  private getRoleOverrides(
    context: PermissionContext,
    permission: PermissionId,
    roleId: string,
  ): PermissionOverride[] {
    const overrides: PermissionOverride[] = [];
    const now = new Date();

    // Check channel-level role overrides
    if (context.channelId) {
      const channel = this.channelPermissions.get(context.channelId);
      if (channel) {
        overrides.push(
          ...channel.overrides.filter(
            (o) =>
              o.targetType === "role" &&
              o.targetId === roleId &&
              o.permission === permission &&
              (!o.expiresAt || o.expiresAt > now),
          ),
        );
      }
    }

    // Check category-level role overrides
    if (context.categoryId) {
      const category = this.categoryPermissions.get(context.categoryId);
      if (category) {
        overrides.push(
          ...category.overrides.filter(
            (o) =>
              o.targetType === "role" &&
              o.targetId === roleId &&
              o.permission === permission &&
              (!o.expiresAt || o.expiresAt > now),
          ),
        );
      }
    }

    // Check workspace-level role overrides
    const workspace = this.workspacePermissions.get(context.workspaceId);
    if (workspace) {
      overrides.push(
        ...workspace.overrides.filter(
          (o) =>
            o.targetType === "role" &&
            o.targetId === roleId &&
            o.permission === permission &&
            (!o.expiresAt || o.expiresAt > now),
        ),
      );
    }

    return overrides;
  }

  private getChannelLevelOverrides(
    channelId: string,
    permission: PermissionId,
  ): PermissionOverride[] {
    const channel = this.channelPermissions.get(channelId);
    if (!channel) return [];
    const now = new Date();
    return channel.overrides.filter(
      (o) =>
        o.permission === permission &&
        o.targetType === "channel" &&
        (!o.expiresAt || o.expiresAt > now),
    );
  }

  private getCategoryLevelOverrides(
    categoryId: string,
    permission: PermissionId,
  ): PermissionOverride[] {
    const category = this.categoryPermissions.get(categoryId);
    if (!category) return [];
    const now = new Date();
    return category.overrides.filter(
      (o) =>
        o.permission === permission &&
        o.targetType === "category" &&
        (!o.expiresAt || o.expiresAt > now),
    );
  }

  private getWorkspaceLevelOverrides(
    workspaceId: string,
    permission: PermissionId,
  ): PermissionOverride[] {
    const workspace = this.workspacePermissions.get(workspaceId);
    if (!workspace) return [];
    const now = new Date();
    return workspace.overrides.filter(
      (o) => o.permission === permission && (!o.expiresAt || o.expiresAt > now),
    );
  }

  // -------------------------------------------------------------------------
  // Policy Simulation
  // -------------------------------------------------------------------------

  /**
   * Simulate permission changes
   */
  simulatePolicy(request: PolicySimulationRequest): PolicySimulationResult {
    const before = this.getEffectivePermissions(request.context);

    // Create a temporary context with hypothetical changes
    const tempContext = {
      ...request.context,
      userRoles: [...request.context.userRoles],
    };

    for (const change of request.hypotheticalChanges) {
      switch (change.type) {
        case "add_role":
          if (change.roleId) {
            const role = this.roles.get(change.roleId);
            if (role && !tempContext.userRoles.find((r) => r.id === role.id)) {
              tempContext.userRoles.push(role);
            }
          }
          break;
        case "remove_role":
          if (change.roleId) {
            tempContext.userRoles = tempContext.userRoles.filter(
              (r) => r.id !== change.roleId,
            );
          }
          break;
        case "change_role_position":
          if (change.roleId && change.newPosition !== undefined) {
            const roleIdx = tempContext.userRoles.findIndex(
              (r) => r.id === change.roleId,
            );
            if (roleIdx !== -1) {
              tempContext.userRoles[roleIdx] = {
                ...tempContext.userRoles[roleIdx],
                position: change.newPosition,
              };
            }
          }
          break;
      }
    }

    const after = this.getEffectivePermissions(tempContext);

    // Compute diffs
    const changedPermissions: PermissionDiff[] = [];
    const warnings: string[] = [];

    const allPerms = new Set([
      ...before.allowedPermissions,
      ...after.allowedPermissions,
    ]);

    allPerms.forEach((perm) => {
      const beforeState = before.permissions.get(perm)?.state || "unset";
      const afterState = after.permissions.get(perm)?.state || "unset";

      if (beforeState !== afterState) {
        let impact: "gained" | "lost" | "unchanged" = "unchanged";
        if (beforeState !== "allowed" && afterState === "allowed") {
          impact = "gained";
        } else if (beforeState === "allowed" && afterState !== "allowed") {
          impact = "lost";
        }

        changedPermissions.push({
          permission: perm,
          before: beforeState,
          after: afterState,
          impact,
        });

        // Add warnings for dangerous permission changes
        if (impact === "gained" && this.isDangerousPermission(perm)) {
          warnings.push(`User would gain dangerous permission: ${perm}`);
        }
      }
    });

    const wouldBreakAccess = changedPermissions.some(
      (d) => d.impact === "lost" && d.permission === PERMISSIONS.USER_VIEW,
    );

    return {
      before,
      after,
      changedPermissions,
      warnings,
      wouldBreakAccess,
    };
  }

  /**
   * Show effective permissions for a user (for debugging/audit)
   */
  showEffectivePermissions(context: PermissionContext): string {
    const effective = this.getEffectivePermissions(context);
    const lines: string[] = [
      `=== Effective Permissions for User ${context.userId} ===`,
      `Workspace: ${context.workspaceId}`,
      context.categoryId ? `Category: ${context.categoryId}` : "",
      context.channelId ? `Channel: ${context.channelId}` : "",
      `Highest Role: ${effective.highestRole.name} (position: ${effective.highestRole.position})`,
      `Is Owner: ${effective.isOwner}`,
      `Is Admin: ${effective.isAdmin}`,
      "",
      `Allowed Permissions (${effective.allowedPermissions.length}):`,
      ...effective.allowedPermissions.map((p) => `  + ${p}`),
      "",
      `Denied Permissions (${effective.deniedPermissions.length}):`,
      ...effective.deniedPermissions.map((p) => `  - ${p}`),
      "",
      `Computed at: ${effective.computedAt.toISOString()}`,
    ].filter(Boolean);

    return lines.join("\n");
  }

  /**
   * Get permission diff between two roles
   */
  getPermissionDiff(
    fromRole: Role,
    toRole: Role,
  ): { added: PermissionId[]; removed: PermissionId[] } {
    const fromSet = new Set(fromRole.permissions);
    const toSet = new Set(toRole.permissions);

    const added = toRole.permissions.filter((p) => !fromSet.has(p));
    const removed = fromRole.permissions.filter((p) => !toSet.has(p));

    return { added, removed };
  }

  // -------------------------------------------------------------------------
  // Platform Presets
  // -------------------------------------------------------------------------

  /**
   * Get current platform preset
   */
  getPreset(): PlatformPreset {
    return this.platformPreset;
  }

  /**
   * Apply a platform preset
   */
  applyPreset(preset: PlatformPreset): void {
    this.platformPreset = preset;
    this.initializeBuiltInRoles(); // Reset to defaults
    this.initializePreset(preset); // Apply preset modifications
    this.invalidateCache();
  }

  /**
   * Get preset configuration details
   */
  getPresetInfo(preset: PlatformPreset): {
    name: string;
    description: string;
    characteristics: string[];
  } {
    switch (preset) {
      case "discord":
        return {
          name: "Discord",
          description:
            "Complex role hierarchy with permission stacking and channel overrides",
          characteristics: [
            "Roles stack - user gets all permissions from all roles",
            "Channel-specific permission overrides",
            "Deny takes precedence over allow at same level",
            "Rich permission inheritance",
          ],
        };
      case "slack":
        return {
          name: "Slack",
          description: "Simpler workspace-based permissions with admin control",
          characteristics: [
            "Workspace admins have broad control",
            "Members can create channels by default",
            "Simpler permission model",
            "Focus on collaboration",
          ],
        };
      case "telegram":
        return {
          name: "Telegram",
          description: "Restrictive admin-only model for large groups",
          characteristics: [
            "Admins have most permissions",
            "Members have very limited permissions",
            "Designed for broadcast-style channels",
            "Strict moderation focus",
          ],
        };
      case "custom":
        return {
          name: "Custom",
          description: "Fully customizable permission configuration",
          characteristics: [
            "No preset restrictions",
            "Full control over all settings",
            "Build your own permission model",
          ],
        };
    }
  }

  // -------------------------------------------------------------------------
  // Audit Logging
  // -------------------------------------------------------------------------

  /**
   * Log a permission change
   */
  logAudit(entry: Omit<PermissionAuditEntry, "id" | "timestamp">): void {
    this.auditLog.push({
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
    });
  }

  /**
   * Get audit log entries
   */
  getAuditLog(filters?: {
    actorId?: string;
    targetId?: string;
    action?: string;
    since?: Date;
    limit?: number;
  }): PermissionAuditEntry[] {
    let entries = [...this.auditLog];

    if (filters?.actorId) {
      entries = entries.filter((e) => e.actorId === filters.actorId);
    }
    if (filters?.targetId) {
      entries = entries.filter((e) => e.targetId === filters.targetId);
    }
    if (filters?.action) {
      entries = entries.filter((e) => e.action === filters.action);
    }
    if (filters?.since) {
      entries = entries.filter((e) => e.timestamp >= filters.since!);
    }

    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      entries = entries.slice(0, filters.limit);
    }

    return entries;
  }

  // -------------------------------------------------------------------------
  // Workspace/Category/Channel Configuration
  // -------------------------------------------------------------------------

  /**
   * Configure workspace permissions
   */
  configureWorkspace(config: WorkspacePermissions): void {
    this.workspacePermissions.set(config.workspaceId, config);
    this.invalidateCache();
  }

  /**
   * Configure category permissions
   */
  configureCategory(config: CategoryPermissions): void {
    this.categoryPermissions.set(config.categoryId, config);
    this.invalidateCache();
  }

  /**
   * Configure channel permissions
   */
  configureChannel(config: ChannelPermissions): void {
    this.channelPermissions.set(config.channelId, config);
    this.invalidateCache();
  }

  /**
   * Get workspace configuration
   */
  getWorkspaceConfig(workspaceId: string): WorkspacePermissions | undefined {
    return this.workspacePermissions.get(workspaceId);
  }

  /**
   * Get category configuration
   */
  getCategoryConfig(categoryId: string): CategoryPermissions | undefined {
    return this.categoryPermissions.get(categoryId);
  }

  /**
   * Get channel configuration
   */
  getChannelConfig(channelId: string): ChannelPermissions | undefined {
    return this.channelPermissions.get(channelId);
  }

  // -------------------------------------------------------------------------
  // Cache Management
  // -------------------------------------------------------------------------

  /**
   * Invalidate all cache entries
   */
  invalidateCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache for specific user
   */
  invalidateUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Invalidate cache for specific channel
   */
  invalidateChannelCache(channelId: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(channelId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; enabled: boolean; ttlMs: number } {
    return {
      size: this.cache.size,
      enabled: this.cacheEnabled,
      ttlMs: this.cacheTTLMs,
    };
  }

  // -------------------------------------------------------------------------
  // Helper Methods
  // -------------------------------------------------------------------------

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private buildCacheKey(context: PermissionContext): string {
    return [
      context.userId,
      context.workspaceId,
      context.categoryId || "no-cat",
      context.channelId || "no-ch",
      context.userRoles.map((r) => r.id).join(","),
    ].join(":");
  }

  private getAllPermissionIds(): PermissionId[] {
    return Object.values(PERMISSIONS) as PermissionId[];
  }

  private isDangerousPermission(permission: PermissionId): boolean {
    const dangerous: PermissionId[] = [
      PERMISSIONS.ADMIN_BILLING,
      PERMISSIONS.ADMIN_SETTINGS,
      PERMISSIONS.USER_BAN,
      PERMISSIONS.ROLE_CREATE,
      PERMISSIONS.ROLE_DELETE,
      PERMISSIONS.CHANNEL_DELETE,
    ];
    return dangerous.includes(permission);
  }

  private getAdminDefaultPermissions(): PermissionId[] {
    return [
      PERMISSIONS.MESSAGE_SEND,
      PERMISSIONS.MESSAGE_EDIT,
      PERMISSIONS.MESSAGE_DELETE,
      PERMISSIONS.MESSAGE_DELETE_OTHERS,
      PERMISSIONS.MESSAGE_PIN,
      PERMISSIONS.CHANNEL_CREATE,
      PERMISSIONS.CHANNEL_EDIT,
      PERMISSIONS.CHANNEL_DELETE,
      PERMISSIONS.CHANNEL_MANAGE,
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.USER_EDIT,
      PERMISSIONS.USER_BAN,
      PERMISSIONS.USER_KICK,
      PERMISSIONS.USER_MUTE,
      PERMISSIONS.ROLE_VIEW,
      PERMISSIONS.ROLE_ASSIGN,
      PERMISSIONS.ADMIN_DASHBOARD,
      PERMISSIONS.ADMIN_SETTINGS,
      PERMISSIONS.ADMIN_AUDIT_LOG,
    ];
  }

  private getModeratorDefaultPermissions(): PermissionId[] {
    return [
      PERMISSIONS.MESSAGE_SEND,
      PERMISSIONS.MESSAGE_EDIT,
      PERMISSIONS.MESSAGE_DELETE,
      PERMISSIONS.MESSAGE_DELETE_OTHERS,
      PERMISSIONS.MESSAGE_PIN,
      PERMISSIONS.CHANNEL_MANAGE,
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.USER_MUTE,
      PERMISSIONS.USER_KICK,
      PERMISSIONS.ADMIN_DASHBOARD,
    ];
  }

  private getMemberDefaultPermissions(): PermissionId[] {
    return [
      PERMISSIONS.MESSAGE_SEND,
      PERMISSIONS.MESSAGE_EDIT,
      PERMISSIONS.MESSAGE_DELETE,
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.ROLE_VIEW,
    ];
  }

  private getGuestDefaultPermissions(): PermissionId[] {
    return [PERMISSIONS.USER_VIEW];
  }

  // -------------------------------------------------------------------------
  // Export/Import for Persistence
  // -------------------------------------------------------------------------

  /**
   * Export engine state for persistence
   */
  exportState(): {
    roles: Role[];
    workspacePermissions: WorkspacePermissions[];
    categoryPermissions: CategoryPermissions[];
    channelPermissions: ChannelPermissions[];
    preset: PlatformPreset;
    auditLog: PermissionAuditEntry[];
  } {
    return {
      roles: Array.from(this.roles.values()),
      workspacePermissions: Array.from(this.workspacePermissions.values()),
      categoryPermissions: Array.from(this.categoryPermissions.values()),
      channelPermissions: Array.from(this.channelPermissions.values()),
      preset: this.platformPreset,
      auditLog: this.auditLog,
    };
  }

  /**
   * Import engine state from persistence
   */
  importState(state: ReturnType<PermissionEngine["exportState"]>): void {
    this.roles.clear();
    state.roles.forEach((role) => this.roles.set(role.id, role));

    this.workspacePermissions.clear();
    state.workspacePermissions.forEach((wp) =>
      this.workspacePermissions.set(wp.workspaceId, wp),
    );

    this.categoryPermissions.clear();
    state.categoryPermissions.forEach((cp) =>
      this.categoryPermissions.set(cp.categoryId, cp),
    );

    this.channelPermissions.clear();
    state.channelPermissions.forEach((chp) =>
      this.channelPermissions.set(chp.channelId, chp),
    );

    this.platformPreset = state.preset;
    this.auditLog = state.auditLog;

    this.invalidateCache();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new permission engine with default Discord-style configuration
 */
export function createPermissionEngine(config?: {
  preset?: PlatformPreset;
  cacheEnabled?: boolean;
  cacheTTLMs?: number;
}): PermissionEngine {
  return new PermissionEngine(config);
}

/**
 * Create a permission engine optimized for high-performance scenarios
 */
export function createHighPerformanceEngine(): PermissionEngine {
  return new PermissionEngine({
    preset: "discord",
    cacheEnabled: true,
    cacheTTLMs: 300000, // 5 minutes
  });
}

/**
 * Create a permission engine for real-time scenarios (shorter cache)
 */
export function createRealtimeEngine(): PermissionEngine {
  return new PermissionEngine({
    preset: "discord",
    cacheEnabled: true,
    cacheTTLMs: 5000, // 5 seconds
  });
}
