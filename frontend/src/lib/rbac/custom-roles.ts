/**
 * Custom Role Management
 *
 * Enterprise RBAC features:
 * - Custom role creation
 * - Fine-grained permissions
 * - Role templates
 * - Permission inheritance
 * - Dynamic permission system
 */

import { v4 as uuidv4 } from "uuid";
import { UserRole } from "@/lib/auth/roles";
import { Permission } from "@/lib/auth/permissions";
import { logAuditEvent } from "@/lib/audit/audit-logger";
import { captureError } from "@/lib/sentry-utils";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Custom role definition
 */
export interface CustomRole {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;

  // Permission System
  permissions: Permission[];
  baseRole?: UserRole; // Inherit from base role
  inheritedRoles?: string[]; // Inherit from other custom roles

  // Metadata
  isSystem: boolean; // System roles cannot be deleted
  isDefault: boolean; // Assigned to new users
  priority: number; // Higher priority wins in conflicts (1-100)

  // Constraints
  maxUsers?: number; // Maximum number of users with this role
  expiresAfter?: number; // Auto-expire after N days

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Role template for quick setup
 */
export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  category: "management" | "moderation" | "support" | "developer" | "custom";
  icon?: string;
  permissions: Permission[];
  baseRole?: UserRole;
  recommended: boolean;
}

/**
 * Permission group for organization
 */
export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  permissions: Permission[];
  requiresBaseRole?: UserRole; // Minimum base role required
  dangerous?: boolean; // Requires confirmation to grant
}

/**
 * Role assignment
 */
export interface RoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Role Templates
// ============================================================================

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "community-manager",
    name: "Community Manager",
    description: "Manages community engagement and content",
    category: "management",
    icon: "Users",
    baseRole: "moderator",
    permissions: [
      "channel:create",
      "channel:update",
      "channel:invite",
      "message:delete_any",
      "message:pin",
      "user:invite",
      "user:mute",
      "mod:view_reports",
      "mod:resolve_reports",
    ],
    recommended: true,
  },
  {
    id: "content-moderator",
    name: "Content Moderator",
    description: "Focuses on content moderation and safety",
    category: "moderation",
    icon: "Shield",
    baseRole: "moderator",
    permissions: [
      "message:delete_any",
      "message:edit_any",
      "file:delete_any",
      "user:mute",
      "user:kick",
      "mod:view_reports",
      "mod:resolve_reports",
      "mod:delete_messages",
      "mod:warn_user",
    ],
    recommended: true,
  },
  {
    id: "support-agent",
    name: "Support Agent",
    description: "Customer support and user assistance",
    category: "support",
    icon: "Headphones",
    baseRole: "member",
    permissions: [
      "channel:view",
      "channel:join",
      "message:send",
      "user:view_profile",
      "user:view_activity",
    ],
    recommended: true,
  },
  {
    id: "developer",
    name: "Developer",
    description: "API access and integration management",
    category: "developer",
    icon: "Code",
    baseRole: "member",
    permissions: ["admin:webhooks", "admin:integrations", "admin:analytics"],
    recommended: false,
  },
  {
    id: "analyst",
    name: "Analyst",
    description: "Analytics and reporting access",
    category: "management",
    icon: "BarChart",
    baseRole: "member",
    permissions: ["admin:analytics", "admin:audit_log", "user:view_activity"],
    recommended: false,
  },
  {
    id: "channel-admin",
    name: "Channel Administrator",
    description: "Manages specific channels",
    category: "management",
    icon: "Hash",
    baseRole: "member",
    permissions: [
      "channel:create",
      "channel:update",
      "channel:delete",
      "channel:invite",
      "channel:kick",
      "channel:manage_permissions",
      "message:pin",
    ],
    recommended: false,
  },
];

// ============================================================================
// Permission Groups
// ============================================================================

export const PERMISSION_GROUPS_ENTERPRISE: PermissionGroup[] = [
  {
    id: "channel-management",
    name: "Channel Management",
    description: "Full control over channels",
    category: "channels",
    permissions: [
      "channel:create",
      "channel:delete",
      "channel:update",
      "channel:archive",
      "channel:manage_permissions",
    ],
    requiresBaseRole: "moderator",
  },
  {
    id: "user-administration",
    name: "User Administration",
    description: "Manage users and their roles",
    category: "users",
    permissions: [
      "user:ban",
      "user:unban",
      "user:kick",
      "user:assign_role",
      "user:update_any_profile",
    ],
    requiresBaseRole: "admin",
    dangerous: true,
  },
  {
    id: "content-control",
    name: "Content Control",
    description: "Edit and delete any content",
    category: "moderation",
    permissions: ["message:edit_any", "message:delete_any", "file:delete_any"],
    requiresBaseRole: "moderator",
  },
  {
    id: "system-configuration",
    name: "System Configuration",
    description: "Configure system settings",
    category: "admin",
    permissions: [
      "admin:settings",
      "admin:integrations",
      "admin:webhooks",
      "system:config",
    ],
    requiresBaseRole: "admin",
    dangerous: true,
  },
];

// ============================================================================
// Custom Role Service
// ============================================================================

export class CustomRoleService {
  private roles: Map<string, CustomRole> = new Map();
  private assignments: Map<string, RoleAssignment[]> = new Map();

  constructor() {
    this.initializeSystemRoles();
  }

  /**
   * Initialize default system roles
   */
  private initializeSystemRoles(): void {
    // Convert base roles to custom roles for unified system
    const systemRoles: Partial<CustomRole>[] = [
      {
        name: "Member",
        slug: "member",
        description: "Standard member with chat access",
        baseRole: "member",
        isSystem: true,
        isDefault: true,
        priority: 40,
        color: "#10B981",
      },
      {
        name: "Moderator",
        slug: "moderator",
        description: "Content moderation and channel management",
        baseRole: "moderator",
        isSystem: true,
        priority: 60,
        color: "#8B5CF6",
      },
      {
        name: "Administrator",
        slug: "admin",
        description: "System administration",
        baseRole: "admin",
        isSystem: true,
        priority: 80,
        color: "#EF4444",
      },
    ];

    systemRoles.forEach((roleData) => {
      const role: CustomRole = {
        id: uuidv4(),
        permissions: [],
        isDefault: false,
        priority: 50,
        color: "#6B7280",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "system",
        isSystem: false,
        ...roleData,
      } as CustomRole;

      this.roles.set(role.id, role);
    });
  }

  /**
   * Create a custom role
   */
  async createRole(
    data: Omit<CustomRole, "id" | "createdAt" | "updatedAt" | "createdBy">,
    createdBy: string,
  ): Promise<CustomRole> {
    try {
      const role: CustomRole = {
        id: uuidv4(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
      };

      // Validate role
      this.validateRole(role);

      // Resolve inherited permissions
      role.permissions = this.resolvePermissions(role);

      this.roles.set(role.id, role);

      await logAuditEvent({
        action: "role_created",
        actor: { type: "user", id: createdBy },
        category: "admin",
        severity: "info",
        description: `Custom role created: ${role.name}`,
        metadata: {
          roleId: role.id,
          permissions: role.permissions,
          baseRole: role.baseRole,
        },
      });

      return role;
    } catch (error) {
      captureError(error as Error, {
        tags: { context: "create-custom-role" },
        extra: { roleName: data.name },
      });
      throw error;
    }
  }

  /**
   * Update a custom role
   */
  async updateRole(
    roleId: string,
    updates: Partial<CustomRole>,
    updatedBy: string,
  ): Promise<CustomRole> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    if (role.isSystem && updates.isSystem === false) {
      throw new Error("Cannot modify system role status");
    }

    const updated = {
      ...role,
      ...updates,
      updatedAt: new Date(),
    };

    this.validateRole(updated);
    updated.permissions = this.resolvePermissions(updated);

    this.roles.set(roleId, updated);

    await logAuditEvent({
      action: "role_updated",
      actor: { type: "user", id: updatedBy },
      category: "admin",
      severity: "info",
      description: `Role updated: ${role.name}`,
      metadata: {
        roleId,
        changes: Object.keys(updates),
      },
    });

    return updated;
  }

  /**
   * Delete a custom role
   */
  async deleteRole(roleId: string, deletedBy: string): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    if (role.isSystem) {
      throw new Error("Cannot delete system role");
    }

    // Check if role is assigned to users
    const assignments = this.assignments.get(roleId) || [];
    if (assignments.length > 0) {
      throw new Error(
        `Cannot delete role with ${assignments.length} active assignments`,
      );
    }

    this.roles.delete(roleId);

    await logAuditEvent({
      action: "role_deleted",
      actor: { type: "user", id: deletedBy },
      category: "admin",
      severity: "warning",
      description: `Role deleted: ${role.name}`,
      metadata: { roleId, roleName: role.name },
    });
  }

  /**
   * Get role by ID
   */
  getRole(roleId: string): CustomRole | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get all roles
   */
  getAllRoles(): CustomRole[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get roles by category
   */
  getRolesByCategory(category: string): CustomRole[] {
    // This would filter by metadata category if implemented
    return this.getAllRoles();
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
    expiresAt?: Date,
  ): Promise<RoleAssignment> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Check max users constraint
    if (role.maxUsers) {
      const currentAssignments = this.assignments.get(roleId) || [];
      if (currentAssignments.length >= role.maxUsers) {
        throw new Error(
          `Role has reached maximum user limit: ${role.maxUsers}`,
        );
      }
    }

    const assignment: RoleAssignment = {
      id: uuidv4(),
      userId,
      roleId,
      assignedBy,
      assignedAt: new Date(),
      expiresAt:
        expiresAt ||
        (role.expiresAfter
          ? new Date(Date.now() + role.expiresAfter * 24 * 60 * 60 * 1000)
          : undefined),
    };

    const userAssignments = this.assignments.get(roleId) || [];
    userAssignments.push(assignment);
    this.assignments.set(roleId, userAssignments);

    await logAuditEvent({
      action: "role_assigned",
      actor: { type: "user", id: assignedBy },
      category: "admin",
      target: { type: "user", id: userId },
      severity: "info",
      description: `Role assigned to user: ${role.name}`,
      metadata: {
        roleId,
        userId,
        expiresAt: assignment.expiresAt?.toISOString(),
      },
    });

    return assignment;
  }

  /**
   * Remove role from user
   */
  async unassignRole(
    assignmentId: string,
    unassignedBy: string,
  ): Promise<void> {
    for (const [roleId, assignments] of this.assignments.entries()) {
      const index = assignments.findIndex((a) => a.id === assignmentId);
      if (index !== -1) {
        const assignment = assignments[index];
        assignments.splice(index, 1);
        this.assignments.set(roleId, assignments);

        await logAuditEvent({
          action: "role_unassigned",
          actor: { type: "user", id: unassignedBy },
          category: "admin",
          target: { type: "user", id: assignment.userId },
          severity: "info",
          description: "Role unassigned from user",
          metadata: {
            assignmentId,
            roleId,
            userId: assignment.userId,
          },
        });

        return;
      }
    }

    throw new Error("Assignment not found");
  }

  /**
   * Get user's assigned roles
   */
  getUserRoles(userId: string): CustomRole[] {
    const userRoles: CustomRole[] = [];

    for (const [roleId, assignments] of this.assignments.entries()) {
      const userAssignment = assignments.find(
        (a) =>
          a.userId === userId && (!a.expiresAt || a.expiresAt > new Date()),
      );
      if (userAssignment) {
        const role = this.roles.get(roleId);
        if (role) {
          userRoles.push(role);
        }
      }
    }

    return userRoles.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get effective permissions for user
   */
  getUserPermissions(userId: string): Permission[] {
    const roles = this.getUserRoles(userId);
    const permissions = new Set<Permission>();

    roles.forEach((role) => {
      role.permissions.forEach((permission) => {
        permissions.add(permission);
      });
    });

    return Array.from(permissions);
  }

  /**
   * Check if user has permission
   */
  userHasPermission(userId: string, permission: Permission): boolean {
    const permissions = this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  /**
   * Create role from template
   */
  async createFromTemplate(
    templateId: string,
    overrides: Partial<CustomRole>,
    createdBy: string,
  ): Promise<CustomRole> {
    const template = ROLE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    return this.createRole(
      {
        name: template.name,
        slug: template.name.toLowerCase().replace(/\s+/g, "-"),
        description: template.description,
        permissions: template.permissions,
        baseRole: template.baseRole,
        color: "#6B7280",
        isSystem: false,
        isDefault: false,
        priority: 50,
        ...overrides,
      },
      createdBy,
    );
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private validateRole(role: CustomRole): void {
    if (!role.name || role.name.trim().length === 0) {
      throw new Error("Role name is required");
    }

    if (!role.slug || role.slug.trim().length === 0) {
      throw new Error("Role slug is required");
    }

    if (role.priority < 1 || role.priority > 100) {
      throw new Error("Role priority must be between 1 and 100");
    }

    // Check for slug uniqueness
    for (const [id, existingRole] of this.roles.entries()) {
      if (id !== role.id && existingRole.slug === role.slug) {
        throw new Error(`Role slug already exists: ${role.slug}`);
      }
    }
  }

  private resolvePermissions(role: CustomRole): Permission[] {
    const permissions = new Set<Permission>(role.permissions);

    // Add base role permissions if specified
    if (role.baseRole) {
      // In production, get permissions from base role
      // For now, just return the explicitly defined permissions
    }

    // Add inherited role permissions
    if (role.inheritedRoles && role.inheritedRoles.length > 0) {
      role.inheritedRoles.forEach((inheritedRoleId) => {
        const inheritedRole = this.roles.get(inheritedRoleId);
        if (inheritedRole) {
          inheritedRole.permissions.forEach((p) => permissions.add(p));
        }
      });
    }

    return Array.from(permissions);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let customRoleServiceInstance: CustomRoleService | null = null;

export function getCustomRoleService(): CustomRoleService {
  if (!customRoleServiceInstance) {
    customRoleServiceInstance = new CustomRoleService();
  }
  return customRoleServiceInstance;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate permission compatibility with base role
 */
export function isPermissionCompatible(
  permission: Permission,
  baseRole?: UserRole,
): boolean {
  if (!baseRole) return true;

  // Check if permission requires a higher base role
  const group = PERMISSION_GROUPS_ENTERPRISE.find((g) =>
    g.permissions.includes(permission),
  );

  if (!group || !group.requiresBaseRole) return true;

  // Compare role levels (would need to import role utilities)
  return true; // Simplified for now
}

/**
 * Get recommended permissions for a role
 */
export function getRecommendedPermissions(baseRole?: UserRole): Permission[] {
  if (!baseRole) return [];

  // Return permissions typically associated with this base role
  const template = ROLE_TEMPLATES.find(
    (t) => t.baseRole === baseRole && t.recommended,
  );
  return template?.permissions || [];
}

/**
 * Check if role can be assigned by user
 */
export function canAssignRole(
  assignerRole: UserRole | CustomRole,
  targetRole: CustomRole,
): boolean {
  // Owners and admins can assign any non-owner role
  if (typeof assignerRole === "string") {
    return assignerRole === "owner" || assignerRole === "admin";
  }

  // Custom role assigners must have higher priority
  return assignerRole.priority > targetRole.priority;
}
