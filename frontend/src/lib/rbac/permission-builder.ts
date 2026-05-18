/**
 * Permission Builder - Fluent API for building complex permission rules
 *
 * Provides a chainable interface for defining permission conditions,
 * resource-level permissions, and custom permission rules.
 */

import {
  type Permission,
  type Role,
  ROLE_HIERARCHY,
  PERMISSIONS,
} from "@/types/rbac";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a permission check
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  grantedBy?: string;
  deniedBy?: string;
  conditions?: PermissionCondition[];
}

/**
 * Context for permission evaluation
 */
export interface PermissionContext {
  userId: string;
  userRole: Role;
  resourceType?: ResourceType;
  resourceId?: string;
  resourceOwnerId?: string;
  channelId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Condition types for permission rules
 */
export type ConditionType =
  | "role"
  | "permission"
  | "owner"
  | "custom"
  | "time"
  | "resource";

/**
 * Resource types that can have permissions
 */
export type ResourceType =
  | "message"
  | "channel"
  | "user"
  | "role"
  | "file"
  | "thread"
  | "reaction";

/**
 * A single permission condition
 */
export interface PermissionCondition {
  type: ConditionType;
  description: string;
  evaluate: (context: PermissionContext) => boolean;
}

/**
 * Permission rule combining multiple conditions
 */
export interface PermissionRule {
  id: string;
  name: string;
  description: string;
  permission: Permission;
  conditions: PermissionCondition[];
  mode: "all" | "any";
  priority: number;
}

// ============================================================================
// Permission Condition Builders
// ============================================================================

/**
 * Create a role-based condition
 */
export function roleCondition(requiredRole: Role): PermissionCondition {
  return {
    type: "role",
    description: `User must have role ${requiredRole} or higher`,
    evaluate: (context: PermissionContext) => {
      return ROLE_HIERARCHY[context.userRole] >= ROLE_HIERARCHY[requiredRole];
    },
  };
}

/**
 * Create a permission-based condition
 */
export function permissionCondition(
  permission: Permission,
): PermissionCondition {
  return {
    type: "permission",
    description: `User must have permission ${permission}`,
    evaluate: (context: PermissionContext) => {
      // Owner has all permissions
      if (context.userRole === "owner") return true;
      // Check if role has permission
      const rolePerms = getRoleDefaultPermissions(context.userRole);
      return rolePerms.includes(permission);
    },
  };
}

/**
 * Create an owner-based condition (resource ownership)
 */
export function ownerCondition(): PermissionCondition {
  return {
    type: "owner",
    description: "User must be the owner of the resource",
    evaluate: (context: PermissionContext) => {
      return context.resourceOwnerId === context.userId;
    },
  };
}

/**
 * Create a time-based condition
 */
export function timeCondition(options: {
  after?: Date;
  before?: Date;
  withinMinutes?: number;
}): PermissionCondition {
  return {
    type: "time",
    description: buildTimeDescription(options),
    evaluate: (_context: PermissionContext) => {
      const now = new Date();

      if (options.after && now < options.after) {
        return false;
      }

      if (options.before && now > options.before) {
        return false;
      }

      return true;
    },
  };
}

/**
 * Create a resource-based condition
 */
export function resourceCondition(
  resourceType: ResourceType,
  check: (context: PermissionContext) => boolean,
): PermissionCondition {
  return {
    type: "resource",
    description: `Custom ${resourceType} resource condition`,
    evaluate: (context: PermissionContext) => {
      if (context.resourceType !== resourceType) {
        return false;
      }
      return check(context);
    },
  };
}

/**
 * Create a custom condition with arbitrary logic
 */
export function customCondition(
  description: string,
  evaluate: (context: PermissionContext) => boolean,
): PermissionCondition {
  return {
    type: "custom",
    description,
    evaluate,
  };
}

// ============================================================================
// Permission Builder Class
// ============================================================================

/**
 * Fluent builder for creating permission rules
 */
export class PermissionBuilder {
  private _id: string;
  private _name: string;
  private _description: string;
  private _permission: Permission | null = null;
  private _conditions: PermissionCondition[] = [];
  private _mode: "all" | "any" = "all";
  private _priority: number = 0;

  constructor(id: string) {
    this._id = id;
    this._name = id;
    this._description = "";
  }

  /**
   * Set the rule name
   */
  name(name: string): this {
    this._name = name;
    return this;
  }

  /**
   * Set the rule description
   */
  description(description: string): this {
    this._description = description;
    return this;
  }

  /**
   * Set the permission this rule grants
   */
  forPermission(permission: Permission): this {
    this._permission = permission;
    return this;
  }

  /**
   * Add a role requirement
   */
  requireRole(role: Role): this {
    this._conditions.push(roleCondition(role));
    return this;
  }

  /**
   * Add a permission requirement
   */
  requirePermission(permission: Permission): this {
    this._conditions.push(permissionCondition(permission));
    return this;
  }

  /**
   * Require user to be resource owner
   */
  requireOwnership(): this {
    this._conditions.push(ownerCondition());
    return this;
  }

  /**
   * Add a time-based requirement
   */
  requireTime(options: {
    after?: Date;
    before?: Date;
    withinMinutes?: number;
  }): this {
    this._conditions.push(timeCondition(options));
    return this;
  }

  /**
   * Add a resource-specific requirement
   */
  requireResource(
    resourceType: ResourceType,
    check: (context: PermissionContext) => boolean,
  ): this {
    this._conditions.push(resourceCondition(resourceType, check));
    return this;
  }

  /**
   * Add a custom condition
   */
  requireCustom(
    description: string,
    evaluate: (context: PermissionContext) => boolean,
  ): this {
    this._conditions.push(customCondition(description, evaluate));
    return this;
  }

  /**
   * Allow if owner OR has higher role (common pattern)
   */
  allowOwnerOrRole(minimumRole: Role): this {
    this._mode = "any";
    this._conditions.push(ownerCondition());
    this._conditions.push(roleCondition(minimumRole));
    return this;
  }

  /**
   * Set mode to require ALL conditions
   */
  requireAll(): this {
    this._mode = "all";
    return this;
  }

  /**
   * Set mode to require ANY condition
   */
  requireAny(): this {
    this._mode = "any";
    return this;
  }

  /**
   * Set rule priority (higher = checked first)
   */
  priority(priority: number): this {
    this._priority = priority;
    return this;
  }

  /**
   * Add a pre-built condition
   */
  addCondition(condition: PermissionCondition): this {
    this._conditions.push(condition);
    return this;
  }

  /**
   * Build the permission rule
   */
  build(): PermissionRule {
    if (!this._permission) {
      throw new Error("Permission must be set using forPermission()");
    }

    return {
      id: this._id,
      name: this._name,
      description: this._description,
      permission: this._permission,
      conditions: [...this._conditions],
      mode: this._mode,
      priority: this._priority,
    };
  }
}

// ============================================================================
// Permission Rule Engine
// ============================================================================

/**
 * Engine for evaluating permission rules
 */
export class PermissionRuleEngine {
  private rules: Map<string, PermissionRule[]> = new Map();

  /**
   * Register a permission rule
   */
  registerRule(rule: PermissionRule): void {
    const key = rule.permission;
    const existing = this.rules.get(key) || [];
    existing.push(rule);
    // Sort by priority (highest first)
    existing.sort((a, b) => b.priority - a.priority);
    this.rules.set(key, existing);
  }

  /**
   * Register multiple rules
   */
  registerRules(rules: PermissionRule[]): void {
    rules.forEach((rule) => this.registerRule(rule));
  }

  /**
   * Unregister a rule by ID
   */
  unregisterRule(ruleId: string): boolean {
    let found = false;
    this.rules.forEach((rules, key) => {
      const index = rules.findIndex((r) => r.id === ruleId);
      if (index !== -1) {
        rules.splice(index, 1);
        found = true;
        if (rules.length === 0) {
          this.rules.delete(key);
        }
      }
    });
    return found;
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules.clear();
  }

  /**
   * Get all rules for a permission
   */
  getRulesForPermission(permission: Permission): PermissionRule[] {
    return this.rules.get(permission) || [];
  }

  /**
   * Get all registered rules
   */
  getAllRules(): PermissionRule[] {
    const all: PermissionRule[] = [];
    this.rules.forEach((rules) => all.push(...rules));
    return all;
  }

  /**
   * Check if a permission is allowed given the context
   */
  check(permission: Permission, context: PermissionContext): PermissionResult {
    // Owner protection rule - owners cannot be modified
    if (
      context.resourceType === "user" &&
      context.resourceOwnerId !== context.userId &&
      context.metadata?.targetRole === "owner"
    ) {
      const action = context.action;
      if (action === "delete" || action === "demote" || action === "ban") {
        return {
          allowed: false,
          reason: "Cannot modify owner",
          deniedBy: "owner-protection",
        };
      }
    }

    // Check registered rules
    const rules = this.rules.get(permission);

    if (rules && rules.length > 0) {
      // Try each rule in priority order
      for (const rule of rules) {
        const result = this.evaluateRule(rule, context);
        if (result.allowed) {
          return {
            allowed: true,
            reason: rule.description,
            grantedBy: rule.id,
            conditions: rule.conditions,
          };
        }
      }
      // If we have rules but none matched, deny the permission
      // Only fall back to default if NO rules are registered for this permission
      return {
        allowed: false,
        reason: "No matching rules granted permission",
        deniedBy: "rule-engine",
      };
    }

    // Fall back to default role-based check only when no rules are registered
    return this.checkDefaultPermission(permission, context);
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(
    rule: PermissionRule,
    context: PermissionContext,
  ): PermissionResult {
    const results = rule.conditions.map((cond) => cond.evaluate(context));

    const allowed =
      rule.mode === "all" ? results.every((r) => r) : results.some((r) => r);

    return {
      allowed,
      reason: allowed ? rule.description : "Conditions not met",
      grantedBy: allowed ? rule.id : undefined,
      deniedBy: allowed ? undefined : rule.id,
      conditions: rule.conditions,
    };
  }

  /**
   * Check permission using default role-based system
   */
  private checkDefaultPermission(
    permission: Permission,
    context: PermissionContext,
  ): PermissionResult {
    // Owner always has all permissions
    if (context.userRole === "owner") {
      return {
        allowed: true,
        reason: "Owner has all permissions",
        grantedBy: "owner-role",
      };
    }

    const rolePerms = getRoleDefaultPermissions(context.userRole);
    const allowed = rolePerms.includes(permission);

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
   * Check multiple permissions (all must pass)
   */
  checkAll(
    permissions: Permission[],
    context: PermissionContext,
  ): PermissionResult {
    for (const permission of permissions) {
      const result = this.check(permission, context);
      if (!result.allowed) {
        return result;
      }
    }

    return {
      allowed: true,
      reason: "All permissions granted",
    };
  }

  /**
   * Check multiple permissions (any must pass)
   */
  checkAny(
    permissions: Permission[],
    context: PermissionContext,
  ): PermissionResult {
    const deniedReasons: string[] = [];

    for (const permission of permissions) {
      const result = this.check(permission, context);
      if (result.allowed) {
        return result;
      }
      if (result.reason) {
        deniedReasons.push(result.reason);
      }
    }

    return {
      allowed: false,
      reason: `None of the required permissions were granted: ${deniedReasons.join("; ")}`,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new permission builder
 */
export function permission(id: string): PermissionBuilder {
  return new PermissionBuilder(id);
}

/**
 * Create a new permission rule engine
 */
export function createRuleEngine(): PermissionRuleEngine {
  return new PermissionRuleEngine();
}

/**
 * Get default permissions for a role
 */
export function getRoleDefaultPermissions(role: Role): Permission[] {
  const permissionsByRole: Record<Role, Permission[]> = {
    owner: Object.values(PERMISSIONS),
    admin: [
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
    ],
    moderator: [
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
    ],
    member: [
      PERMISSIONS.MESSAGE_SEND,
      PERMISSIONS.MESSAGE_EDIT,
      PERMISSIONS.MESSAGE_DELETE,
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.ROLE_VIEW,
    ],
    guest: [PERMISSIONS.USER_VIEW],
  };

  return permissionsByRole[role] || [];
}

/**
 * Build time description for time conditions
 */
function buildTimeDescription(options: {
  after?: Date;
  before?: Date;
  withinMinutes?: number;
}): string {
  const parts: string[] = [];

  if (options.after) {
    parts.push(`after ${options.after.toISOString()}`);
  }

  if (options.before) {
    parts.push(`before ${options.before.toISOString()}`);
  }

  if (options.withinMinutes) {
    parts.push(`within ${options.withinMinutes} minutes`);
  }

  return parts.length > 0
    ? `Time condition: ${parts.join(", ")}`
    : "Time condition";
}

// ============================================================================
// Common Permission Rules
// ============================================================================

/**
 * Create common permission rules for message operations
 */
export function createMessagePermissionRules(): PermissionRule[] {
  return [
    // Edit own messages - owner OR has edit permission
    permission("message-edit-own")
      .name("Edit Own Message")
      .description("Allow users to edit their own messages")
      .forPermission(PERMISSIONS.MESSAGE_EDIT)
      .requireAll()
      .requireOwnership()
      .build(),

    // Edit others' messages - requires elevated permission
    permission("message-edit-others")
      .name("Edit Others Messages")
      .description("Allow moderators+ to edit any message")
      .forPermission(PERMISSIONS.MESSAGE_EDIT)
      .requireRole("moderator")
      .build(),

    // Delete own messages
    permission("message-delete-own")
      .name("Delete Own Message")
      .description("Allow users to delete their own messages")
      .forPermission(PERMISSIONS.MESSAGE_DELETE)
      .requireAll()
      .requireOwnership()
      .build(),

    // Delete others' messages
    permission("message-delete-others")
      .name("Delete Others Messages")
      .description("Allow moderators+ to delete any message")
      .forPermission(PERMISSIONS.MESSAGE_DELETE_OTHERS)
      .requireRole("moderator")
      .build(),

    // Pin messages
    permission("message-pin")
      .name("Pin Messages")
      .description("Allow users to pin messages")
      .forPermission(PERMISSIONS.MESSAGE_PIN)
      .requireRole("moderator")
      .build(),
  ];
}

/**
 * Create common permission rules for channel operations
 */
export function createChannelPermissionRules(): PermissionRule[] {
  return [
    // Create channels
    permission("channel-create")
      .name("Create Channel")
      .description("Allow creating new channels")
      .forPermission(PERMISSIONS.CHANNEL_CREATE)
      .requireRole("admin")
      .build(),

    // Edit channels
    permission("channel-edit")
      .name("Edit Channel")
      .description("Allow editing channel settings")
      .forPermission(PERMISSIONS.CHANNEL_EDIT)
      .requireRole("admin")
      .build(),

    // Delete channels
    permission("channel-delete")
      .name("Delete Channel")
      .description("Allow deleting channels")
      .forPermission(PERMISSIONS.CHANNEL_DELETE)
      .requireRole("admin")
      .build(),

    // Manage channels
    permission("channel-manage")
      .name("Manage Channel")
      .description("Allow full channel management")
      .forPermission(PERMISSIONS.CHANNEL_MANAGE)
      .requireRole("moderator")
      .build(),
  ];
}

/**
 * Create common permission rules for user operations
 */
export function createUserPermissionRules(): PermissionRule[] {
  return [
    // Ban users (admin+, cannot ban owner)
    permission("user-ban")
      .name("Ban User")
      .description("Allow banning users (except owner)")
      .forPermission(PERMISSIONS.USER_BAN)
      .requireRole("admin")
      .requireCustom(
        "Cannot ban owner",
        (ctx) => ctx.metadata?.targetRole !== "owner",
      )
      .build(),

    // Kick users (moderator+, cannot kick owner)
    permission("user-kick")
      .name("Kick User")
      .description("Allow kicking users (except owner)")
      .forPermission(PERMISSIONS.USER_KICK)
      .requireRole("moderator")
      .requireCustom(
        "Cannot kick owner",
        (ctx) => ctx.metadata?.targetRole !== "owner",
      )
      .build(),

    // Mute users
    permission("user-mute")
      .name("Mute User")
      .description("Allow muting users")
      .forPermission(PERMISSIONS.USER_MUTE)
      .requireRole("moderator")
      .requireCustom(
        "Cannot mute owner",
        (ctx) => ctx.metadata?.targetRole !== "owner",
      )
      .build(),
  ];
}
