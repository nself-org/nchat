/**
 * Pin Permissions
 *
 * Permission checking for pinning messages.
 */

import type { PinPermission, PinConfig } from "./pin-types";

// ============================================================================
// Role Types
// ============================================================================

export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

// ============================================================================
// Permission Checking
// ============================================================================

/**
 * Role hierarchy for permission checking.
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 100,
  admin: 80,
  moderator: 60,
  member: 40,
  guest: 20,
};

/**
 * Minimum role required for each pin permission level.
 */
const PIN_PERMISSION_ROLES: Record<PinPermission, UserRole> = {
  "admins-only": "admin",
  moderators: "moderator",
  members: "member",
  anyone: "guest",
};

/**
 * Check if a user has permission to pin messages.
 */
export function canPinMessage(
  userRole: UserRole,
  pinPermission: PinPermission,
): boolean {
  const requiredRole = PIN_PERMISSION_ROLES[pinPermission];
  const userLevel = ROLE_HIERARCHY[userRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * Check if a user has permission to unpin messages.
 * Users can unpin messages they pinned, or if they have pin permission.
 */
export function canUnpinMessage(
  userRole: UserRole,
  pinPermission: PinPermission,
  isPinner: boolean,
): boolean {
  // If user pinned the message, they can always unpin it
  if (isPinner) {
    return true;
  }

  // Otherwise, check if they have pin permission
  return canPinMessage(userRole, pinPermission);
}

/**
 * Check if a user has permission to reorder pinned messages.
 * Only moderators and above can reorder.
 */
export function canReorderPins(userRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.moderator;
}

/**
 * Check if a user has permission to edit pin notes.
 */
export function canEditPinNote(userRole: UserRole, isPinner: boolean): boolean {
  // Pinner can always edit their own pin note
  if (isPinner) {
    return true;
  }

  // Moderators and above can edit any pin note
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.moderator;
}

/**
 * Check if a user has permission to configure pin settings.
 */
export function canConfigurePins(userRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.admin;
}

// ============================================================================
// Permission Descriptions
// ============================================================================

/**
 * Get human-readable description for a pin permission level.
 */
export function getPinPermissionDescription(permission: PinPermission): string {
  const descriptions: Record<PinPermission, string> = {
    "admins-only": "Only admins can pin messages",
    moderators: "Moderators and admins can pin messages",
    members: "All members can pin messages",
    anyone: "Anyone can pin messages",
  };

  return descriptions[permission];
}

/**
 * Get the minimum role name for a pin permission level.
 */
export function getMinimumRoleForPin(permission: PinPermission): string {
  const roles: Record<PinPermission, string> = {
    "admins-only": "Admin",
    moderators: "Moderator",
    members: "Member",
    anyone: "Guest",
  };

  return roles[permission];
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate pin configuration.
 */
export function validatePinConfig(config: Partial<PinConfig>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.maxPins !== undefined) {
    if (config.maxPins < 1) {
      errors.push("Maximum pins must be at least 1");
    }
    if (config.maxPins > 200) {
      errors.push("Maximum pins cannot exceed 200");
    }
  }

  if (config.pinPermission !== undefined) {
    const validPermissions: PinPermission[] = [
      "admins-only",
      "moderators",
      "members",
      "anyone",
    ];
    if (!validPermissions.includes(config.pinPermission)) {
      errors.push("Invalid pin permission level");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
