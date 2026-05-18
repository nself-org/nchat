/**
 * App Permissions - Permission system for the nchat app marketplace
 *
 * Defines permission scopes, groups, and validation utilities
 */

import type {
  PermissionScope,
  PermissionGroup,
  AppPermission,
  PermissionLevel,
} from "./app-types";

// Re-export types for convenience
export type {
  PermissionScope,
  PermissionGroup,
  AppPermission,
  PermissionLevel,
};

// ============================================================================
// Permission Definitions
// ============================================================================

export const PERMISSION_DEFINITIONS: Record<
  PermissionScope,
  { label: string; description: string }
> = {
  "channels:read": {
    label: "View channels",
    description: "View channel information, names, and descriptions",
  },
  "channels:write": {
    label: "Manage channels",
    description: "Create, edit, and archive channels",
  },
  "channels:history": {
    label: "Access channel history",
    description: "Read message history in channels",
  },
  "messages:read": {
    label: "Read messages",
    description: "View messages in channels the app has access to",
  },
  "messages:write": {
    label: "Send messages",
    description: "Post messages to channels on behalf of users",
  },
  "messages:delete": {
    label: "Delete messages",
    description: "Delete messages from channels",
  },
  "users:read": {
    label: "View user profiles",
    description: "Access basic user profile information",
  },
  "users:write": {
    label: "Edit user profiles",
    description: "Modify user profile information",
  },
  "users:presence": {
    label: "View user presence",
    description: "See when users are online or away",
  },
  "files:read": {
    label: "View files",
    description: "Access files shared in channels",
  },
  "files:write": {
    label: "Upload files",
    description: "Upload and share files to channels",
  },
  "reactions:read": {
    label: "View reactions",
    description: "See emoji reactions on messages",
  },
  "reactions:write": {
    label: "Add reactions",
    description: "Add emoji reactions to messages",
  },
  "threads:read": {
    label: "Read threads",
    description: "View thread conversations",
  },
  "threads:write": {
    label: "Reply in threads",
    description: "Post replies in message threads",
  },
  "notifications:send": {
    label: "Send notifications",
    description: "Send push and in-app notifications to users",
  },
  "webhooks:receive": {
    label: "Receive webhooks",
    description: "Receive webhook events from nchat",
  },
  "webhooks:send": {
    label: "Send webhooks",
    description: "Send webhook requests to external services",
  },
  "commands:register": {
    label: "Register slash commands",
    description: "Create custom slash commands for users",
  },
  "admin:read": {
    label: "View admin settings",
    description: "Access workspace administration information",
  },
  "admin:write": {
    label: "Manage admin settings",
    description: "Modify workspace settings and configurations",
  },
  "identity:read": {
    label: "View user identity",
    description: "Access user identity information",
  },
  "identity:email": {
    label: "View user email",
    description: "Access user email addresses",
  },
  "team:read": {
    label: "View team info",
    description: "Access team/workspace information",
  },
};

// ============================================================================
// Permission Groups
// ============================================================================

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "basic",
    name: "Basic Access",
    description: "Read-only access to public information",
    permissions: ["channels:read", "users:read", "team:read"],
    icon: "Eye",
    riskLevel: "low",
  },
  {
    id: "messaging",
    name: "Messaging",
    description: "Read and write messages",
    permissions: ["messages:read", "messages:write", "channels:history"],
    icon: "MessageSquare",
    riskLevel: "medium",
  },
  {
    id: "files",
    name: "File Access",
    description: "Upload and manage files",
    permissions: ["files:read", "files:write"],
    icon: "FileText",
    riskLevel: "medium",
  },
  {
    id: "interactions",
    name: "Interactions",
    description: "Reactions and thread replies",
    permissions: [
      "reactions:read",
      "reactions:write",
      "threads:read",
      "threads:write",
    ],
    icon: "Heart",
    riskLevel: "low",
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Send notifications to users",
    permissions: ["notifications:send"],
    icon: "Bell",
    riskLevel: "medium",
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Send and receive webhook events",
    permissions: ["webhooks:receive", "webhooks:send"],
    icon: "Webhook",
    riskLevel: "medium",
  },
  {
    id: "commands",
    name: "Slash Commands",
    description: "Register custom slash commands",
    permissions: ["commands:register"],
    icon: "Terminal",
    riskLevel: "low",
  },
  {
    id: "identity",
    name: "User Identity",
    description: "Access user identity and email",
    permissions: ["identity:read", "identity:email"],
    icon: "User",
    riskLevel: "high",
  },
  {
    id: "admin",
    name: "Administration",
    description: "Workspace administration access",
    permissions: [
      "admin:read",
      "admin:write",
      "channels:write",
      "users:write",
      "messages:delete",
    ],
    icon: "Settings",
    riskLevel: "high",
  },
];

// ============================================================================
// Permission Utilities
// ============================================================================

/**
 * Get permission definition by scope
 */
export function getPermissionDefinition(scope: PermissionScope): {
  label: string;
  description: string;
} {
  return PERMISSION_DEFINITIONS[scope];
}

/**
 * Get the permission group a scope belongs to
 */
export function getPermissionGroup(
  scope: PermissionScope,
): PermissionGroup | undefined {
  return PERMISSION_GROUPS.find((group) => group.permissions.includes(scope));
}

/**
 * Get risk level for a permission scope
 */
export function getPermissionRiskLevel(
  scope: PermissionScope,
): "low" | "medium" | "high" {
  const group = getPermissionGroup(scope);
  return group?.riskLevel || "medium";
}

/**
 * Group permissions by their groups
 */
export function groupPermissions(
  permissions: AppPermission[],
): Map<PermissionGroup, AppPermission[]> {
  const grouped = new Map<PermissionGroup, AppPermission[]>();

  permissions.forEach((permission) => {
    const group = getPermissionGroup(permission.scope);
    if (group) {
      const existing = grouped.get(group) || [];
      existing.push(permission);
      grouped.set(group, existing);
    }
  });

  return grouped;
}

/**
 * Check if permissions include any high-risk scopes
 */
export function hasHighRiskPermissions(permissions: AppPermission[]): boolean {
  return permissions.some((p) => getPermissionRiskLevel(p.scope) === "high");
}

/**
 * Get required permissions from a list
 */
export function getRequiredPermissions(
  permissions: AppPermission[],
): AppPermission[] {
  return permissions.filter((p) => p.level === "required");
}

/**
 * Get optional permissions from a list
 */
export function getOptionalPermissions(
  permissions: AppPermission[],
): AppPermission[] {
  return permissions.filter((p) => p.level === "optional");
}

/**
 * Validate that granted permissions satisfy required permissions
 */
export function validatePermissions(
  required: AppPermission[],
  granted: PermissionScope[],
): { valid: boolean; missing: PermissionScope[] } {
  const requiredScopes = required
    .filter((p) => p.level === "required")
    .map((p) => p.scope);
  const missing = requiredScopes.filter((scope) => !granted.includes(scope));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Create a permission object with reason
 */
export function createPermission(
  scope: PermissionScope,
  level: PermissionLevel,
  reason?: string,
): AppPermission {
  const definition = getPermissionDefinition(scope);
  return {
    scope,
    level,
    description: definition.description,
    reason,
  };
}

/**
 * Get all permission scopes
 */
export function getAllPermissionScopes(): PermissionScope[] {
  return Object.keys(PERMISSION_DEFINITIONS) as PermissionScope[];
}

/**
 * Sort permissions by risk level (high first)
 */
export function sortPermissionsByRisk(
  permissions: AppPermission[],
): AppPermission[] {
  const riskOrder = { high: 0, medium: 1, low: 2 };
  return [...permissions].sort((a, b) => {
    const riskA = getPermissionRiskLevel(a.scope);
    const riskB = getPermissionRiskLevel(b.scope);
    return riskOrder[riskA] - riskOrder[riskB];
  });
}

/**
 * Get a summary of permissions for display
 */
export function getPermissionsSummary(permissions: AppPermission[]): {
  total: number;
  required: number;
  optional: number;
  highRisk: number;
  groups: string[];
} {
  const groups = new Set<string>();
  let highRisk = 0;

  permissions.forEach((p) => {
    const group = getPermissionGroup(p.scope);
    if (group) {
      groups.add(group.name);
    }
    if (getPermissionRiskLevel(p.scope) === "high") {
      highRisk++;
    }
  });

  return {
    total: permissions.length,
    required: getRequiredPermissions(permissions).length,
    optional: getOptionalPermissions(permissions).length,
    highRisk,
    groups: Array.from(groups),
  };
}
