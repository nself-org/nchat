/**
 * User Manager
 * Core user management operations for admin functionality
 */

import type {
  AdminUser,
  UserFilterOptions,
  UserSortOptions,
  UserPagination,
  UserEditForm,
  UserCreateForm,
  UserActionResult,
  UserRole,
} from "./user-types";

// ============================================================================
// User CRUD Operations
// ============================================================================

export async function fetchUsers(
  filters?: UserFilterOptions,
  sort?: UserSortOptions,
  pagination?: { page: number; perPage: number },
): Promise<{ users: AdminUser[]; total: number }> {
  // In production, this would call the GraphQL API
  // For now, return mock data structure
  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filters, sort, pagination }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }

  return response.json();
}

export async function fetchUserById(userId: string): Promise<AdminUser | null> {
  const response = await fetch(`/api/admin/users/${userId}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to fetch user");
  }

  return response.json();
}

export async function createUser(
  data: UserCreateForm,
): Promise<UserActionResult> {
  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to create user",
      error: error.message,
    };
  }

  const user = await response.json();
  return { success: true, message: "User created successfully", data: user };
}

export async function updateUser(
  userId: string,
  data: Partial<UserEditForm>,
): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to update user",
      error: error.message,
    };
  }

  const user = await response.json();
  return { success: true, message: "User updated successfully", data: user };
}

export async function deleteUser(userId: string): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to delete user",
      error: error.message,
    };
  }

  return { success: true, message: "User deleted successfully" };
}

// ============================================================================
// User Status Operations
// ============================================================================

export async function deactivateUser(
  userId: string,
  reason?: string,
): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to deactivate user",
      error: error.message,
    };
  }

  return { success: true, message: "User deactivated successfully" };
}

export async function reactivateUser(
  userId: string,
): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/users/${userId}/reactivate`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to reactivate user",
      error: error.message,
    };
  }

  return { success: true, message: "User reactivated successfully" };
}

// ============================================================================
// Role Operations
// ============================================================================

export async function changeUserRole(
  userId: string,
  roleId: string,
): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleId }),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to change user role",
      error: error.message,
    };
  }

  return { success: true, message: "User role updated successfully" };
}

// ============================================================================
// Password Operations
// ============================================================================

export async function resetUserPassword(
  userId: string,
  options: {
    sendEmail?: boolean;
    requireChange?: boolean;
    temporaryPassword?: string;
  },
): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to reset password",
      error: error.message,
    };
  }

  const result = await response.json();
  return {
    success: true,
    message: options.sendEmail
      ? "Password reset email sent"
      : "Password reset successfully",
    data: result,
  };
}

// ============================================================================
// Session Operations
// ============================================================================

export async function revokeAllUserSessions(
  userId: string,
): Promise<UserActionResult> {
  const response = await fetch(
    `/api/admin/users/${userId}/sessions/revoke-all`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to revoke sessions",
      error: error.message,
    };
  }

  return { success: true, message: "All user sessions revoked" };
}

export async function revokeUserSession(
  userId: string,
  sessionId: string,
): Promise<UserActionResult> {
  const response = await fetch(
    `/api/admin/users/${userId}/sessions/${sessionId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to revoke session",
      error: error.message,
    };
  }

  return { success: true, message: "Session revoked successfully" };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getUserStatus(
  user: AdminUser,
): "active" | "inactive" | "banned" | "pending" {
  if (user.isBanned) return "banned";
  if (!user.isActive) return "inactive";
  return "active";
}

export function canPerformAction(
  adminUser: AdminUser,
  targetUser: AdminUser,
  action: string,
): boolean {
  // Owner cannot be modified by anyone
  if (targetUser.role.name === "owner") {
    return false;
  }

  // Admins cannot modify other admins or owners
  if (
    adminUser.role.name === "admin" &&
    ["admin", "owner"].includes(targetUser.role.name)
  ) {
    return false;
  }

  // Moderators can only perform limited actions
  if (adminUser.role.name === "moderator") {
    const moderatorActions = ["view", "viewActivity", "ban", "unban"];
    return moderatorActions.includes(action);
  }

  return true;
}

export function getRoleHierarchy(role: UserRole): number {
  const hierarchy: Record<UserRole, number> = {
    owner: 5,
    admin: 4,
    moderator: 3,
    member: 2,
    guest: 1,
  };
  return hierarchy[role] ?? 0;
}

export function canAssignRole(
  adminRole: UserRole,
  targetRole: UserRole,
): boolean {
  const adminLevel = getRoleHierarchy(adminRole);
  const targetLevel = getRoleHierarchy(targetRole);

  // Can only assign roles below your own level (except owner can do anything)
  if (adminRole === "owner") return true;
  return adminLevel > targetLevel;
}

export function formatLastSeen(lastSeenAt: string | undefined | null): string {
  if (!lastSeenAt) return "Never";

  const date = new Date(lastSeenAt);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

export function getUserInitials(displayName: string): string {
  if (!displayName) return "?";

  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }
  if (username.length > 30) {
    return { valid: false, error: "Username must be 30 characters or less" };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      valid: false,
      error:
        "Username can only contain letters, numbers, underscores, and hyphens",
    };
  }
  return { valid: true };
}

// ============================================================================
// Bulk Operations
// ============================================================================

export async function bulkUpdateUsers(
  userIds: string[],
  updates: Partial<UserEditForm>,
): Promise<UserActionResult> {
  const response = await fetch("/api/admin/users/bulk-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds, updates }),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Bulk update failed",
      error: error.message,
    };
  }

  return {
    success: true,
    message: `${userIds.length} users updated successfully`,
  };
}

export async function bulkDeleteUsers(
  userIds: string[],
): Promise<UserActionResult> {
  const response = await fetch("/api/admin/users/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds }),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Bulk delete failed",
      error: error.message,
    };
  }

  return {
    success: true,
    message: `${userIds.length} users deleted successfully`,
  };
}

export async function bulkChangeRole(
  userIds: string[],
  roleId: string,
): Promise<UserActionResult> {
  const response = await fetch("/api/admin/users/bulk-role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds, roleId }),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Bulk role change failed",
      error: error.message,
    };
  }

  return { success: true, message: `${userIds.length} users' roles updated` };
}
