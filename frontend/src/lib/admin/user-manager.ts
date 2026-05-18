/**
 * User Manager - User management utilities for the admin dashboard
 *
 * Provides functions to list, filter, suspend, unsuspend, delete users,
 * and reset passwords.
 */

// ============================================================================
// Types
// ============================================================================

export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

export type UserStatus = "active" | "suspended" | "deleted" | "pending";

export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
  lastSeenAt?: string;
  suspendedAt?: string;
  suspendedUntil?: string;
  suspendReason?: string;
  messageCount: number;
  channelCount: number;
}

export interface UserFilters {
  search?: string;
  role?: UserRole | UserRole[];
  status?: UserStatus | UserStatus[];
  createdAfter?: Date;
  createdBefore?: Date;
  hasActivity?: boolean;
}

export interface UserSortOptions {
  field:
    | "username"
    | "email"
    | "displayName"
    | "createdAt"
    | "lastSeenAt"
    | "messageCount";
  direction: "asc" | "desc";
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SuspendUserInput {
  userId: string;
  reason: string;
  duration?: number; // Duration in milliseconds, undefined = permanent
  notifyUser?: boolean;
}

export interface SuspendResult {
  success: boolean;
  userId: string;
  suspendedAt: string;
  suspendedUntil?: string;
  error?: string;
}

export interface DeleteUserInput {
  userId: string;
  reason?: string;
  deleteContent?: boolean;
  anonymizeData?: boolean;
}

export interface DeleteResult {
  success: boolean;
  userId: string;
  deletedAt: string;
  contentDeleted: boolean;
  dataAnonymized: boolean;
  error?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  userId: string;
  temporaryPassword?: string;
  resetLink?: string;
  expiresAt?: string;
  error?: string;
}

export interface BulkActionResult {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}

// ============================================================================
// Filter Functions
// ============================================================================

/**
 * Apply search filter to users
 */
export function filterBySearch(
  users: ManagedUser[],
  search: string,
): ManagedUser[] {
  if (!search || search.trim() === "") {
    return users;
  }

  const searchLower = search.toLowerCase().trim();
  return users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.displayName.toLowerCase().includes(searchLower),
  );
}

/**
 * Apply role filter to users
 */
export function filterByRole(
  users: ManagedUser[],
  role: UserRole | UserRole[],
): ManagedUser[] {
  const roles = Array.isArray(role) ? role : [role];
  if (roles.length === 0) {
    return users;
  }
  return users.filter((user) => roles.includes(user.role));
}

/**
 * Apply status filter to users
 */
export function filterByStatus(
  users: ManagedUser[],
  status: UserStatus | UserStatus[],
): ManagedUser[] {
  const statuses = Array.isArray(status) ? status : [status];
  if (statuses.length === 0) {
    return users;
  }
  return users.filter((user) => statuses.includes(user.status));
}

/**
 * Apply date range filter to users
 */
export function filterByDateRange(
  users: ManagedUser[],
  after?: Date,
  before?: Date,
): ManagedUser[] {
  return users.filter((user) => {
    const createdAt = new Date(user.createdAt);
    if (after && createdAt < after) return false;
    if (before && createdAt > before) return false;
    return true;
  });
}

/**
 * Apply activity filter to users
 */
export function filterByActivity(
  users: ManagedUser[],
  hasActivity: boolean,
): ManagedUser[] {
  if (hasActivity) {
    return users.filter(
      (user) => user.messageCount > 0 || user.channelCount > 0,
    );
  }
  return users.filter(
    (user) => user.messageCount === 0 && user.channelCount === 0,
  );
}

/**
 * Apply all filters to users
 */
export function applyFilters(
  users: ManagedUser[],
  filters: UserFilters,
): ManagedUser[] {
  let result = [...users];

  if (filters.search) {
    result = filterBySearch(result, filters.search);
  }

  if (filters.role) {
    result = filterByRole(result, filters.role);
  }

  if (filters.status) {
    result = filterByStatus(result, filters.status);
  }

  if (filters.createdAfter || filters.createdBefore) {
    result = filterByDateRange(
      result,
      filters.createdAfter,
      filters.createdBefore,
    );
  }

  if (filters.hasActivity !== undefined) {
    result = filterByActivity(result, filters.hasActivity);
  }

  return result;
}

// ============================================================================
// Sort Functions
// ============================================================================

/**
 * Sort users by field and direction
 */
export function sortUsers(
  users: ManagedUser[],
  options: UserSortOptions,
): ManagedUser[] {
  const { field, direction } = options;
  const multiplier = direction === "asc" ? 1 : -1;

  return [...users].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (field) {
      case "username":
        aValue = a.username.toLowerCase();
        bValue = b.username.toLowerCase();
        break;
      case "email":
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
        break;
      case "displayName":
        aValue = a.displayName.toLowerCase();
        bValue = b.displayName.toLowerCase();
        break;
      case "createdAt":
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case "lastSeenAt":
        aValue = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
        bValue = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
        break;
      case "messageCount":
        aValue = a.messageCount;
        bValue = b.messageCount;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return -1 * multiplier;
    if (aValue > bValue) return 1 * multiplier;
    return 0;
  });
}

// ============================================================================
// Pagination Functions
// ============================================================================

/**
 * Paginate users
 */
export function paginateUsers(
  users: ManagedUser[],
  options: PaginationOptions,
): PaginatedResult<ManagedUser> {
  const { page, pageSize } = options;
  const total = users.length;
  const totalPages = Math.ceil(total / pageSize);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const items = users.slice(startIndex, endIndex);

  return {
    items,
    total,
    page: validPage,
    pageSize,
    totalPages,
    hasNext: validPage < totalPages,
    hasPrev: validPage > 1,
  };
}

/**
 * List users with filters, sorting, and pagination
 */
export function listUsers(
  users: ManagedUser[],
  filters?: UserFilters,
  sort?: UserSortOptions,
  pagination?: PaginationOptions,
): PaginatedResult<ManagedUser> {
  let result = [...users];

  // Apply filters
  if (filters) {
    result = applyFilters(result, filters);
  }

  // Apply sorting
  if (sort) {
    result = sortUsers(result, sort);
  } else {
    // Default sort by createdAt desc
    result = sortUsers(result, { field: "createdAt", direction: "desc" });
  }

  // Apply pagination
  const paginationOptions = pagination || { page: 1, pageSize: 20 };
  return paginateUsers(result, paginationOptions);
}

// ============================================================================
// User Management Functions
// ============================================================================

/**
 * Suspend a user
 */
export function suspendUser(
  user: ManagedUser,
  input: SuspendUserInput,
): SuspendResult {
  const now = new Date();

  if (user.status === "deleted") {
    return {
      success: false,
      userId: input.userId,
      suspendedAt: now.toISOString(),
      error: "Cannot suspend a deleted user",
    };
  }

  if (user.role === "owner") {
    return {
      success: false,
      userId: input.userId,
      suspendedAt: now.toISOString(),
      error: "Cannot suspend the owner",
    };
  }

  const suspendedUntil = input.duration
    ? new Date(now.getTime() + input.duration).toISOString()
    : undefined;

  return {
    success: true,
    userId: input.userId,
    suspendedAt: now.toISOString(),
    suspendedUntil,
  };
}

/**
 * Unsuspend a user
 */
export function unsuspendUser(user: ManagedUser): SuspendResult {
  const now = new Date();

  if (user.status !== "suspended") {
    return {
      success: false,
      userId: user.id,
      suspendedAt: now.toISOString(),
      error: "User is not suspended",
    };
  }

  return {
    success: true,
    userId: user.id,
    suspendedAt: now.toISOString(),
  };
}

/**
 * Check if a suspension has expired
 */
export function isSuspensionExpired(user: ManagedUser): boolean {
  if (user.status !== "suspended") return false;
  if (!user.suspendedUntil) return false; // Permanent suspension

  const expirationDate = new Date(user.suspendedUntil);
  return expirationDate < new Date();
}

/**
 * Delete a user
 */
export function deleteUser(
  user: ManagedUser,
  input: DeleteUserInput,
): DeleteResult {
  const now = new Date();

  if (user.role === "owner") {
    return {
      success: false,
      userId: input.userId,
      deletedAt: now.toISOString(),
      contentDeleted: false,
      dataAnonymized: false,
      error: "Cannot delete the owner",
    };
  }

  if (user.status === "deleted") {
    return {
      success: false,
      userId: input.userId,
      deletedAt: now.toISOString(),
      contentDeleted: false,
      dataAnonymized: false,
      error: "User is already deleted",
    };
  }

  return {
    success: true,
    userId: input.userId,
    deletedAt: now.toISOString(),
    contentDeleted: input.deleteContent ?? false,
    dataAnonymized: input.anonymizeData ?? false,
  };
}

/**
 * Reset user password
 */
export function resetPassword(user: ManagedUser): ResetPasswordResult {
  const now = new Date();

  if (user.status === "deleted") {
    return {
      success: false,
      userId: user.id,
      error: "Cannot reset password for a deleted user",
    };
  }

  // Generate a temporary password
  const temporaryPassword = generateTemporaryPassword();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  return {
    success: true,
    userId: user.id,
    temporaryPassword,
    expiresAt,
  };
}

/**
 * Generate a reset link for password reset
 */
export function generateResetLink(
  user: ManagedUser,
  baseUrl: string,
): ResetPasswordResult {
  const now = new Date();

  if (user.status === "deleted") {
    return {
      success: false,
      userId: user.id,
      error: "Cannot generate reset link for a deleted user",
    };
  }

  const token = generateResetToken();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const resetLink = `${baseUrl}/reset-password?token=${token}&userId=${user.id}`;

  return {
    success: true,
    userId: user.id,
    resetLink,
    expiresAt,
  };
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Suspend multiple users
 */
export function bulkSuspend(
  users: ManagedUser[],
  userIds: string[],
  reason: string,
  duration?: number,
): BulkActionResult {
  const errors: Array<{ userId: string; error: string }> = [];
  let succeeded = 0;

  for (const userId of userIds) {
    const user = users.find((u) => u.id === userId);
    if (!user) {
      errors.push({ userId, error: "User not found" });
      continue;
    }

    const result = suspendUser(user, { userId, reason, duration });
    if (result.success) {
      succeeded++;
    } else {
      errors.push({ userId, error: result.error || "Unknown error" });
    }
  }

  return {
    success: errors.length === 0,
    total: userIds.length,
    succeeded,
    failed: errors.length,
    errors,
  };
}

/**
 * Unsuspend multiple users
 */
export function bulkUnsuspend(
  users: ManagedUser[],
  userIds: string[],
): BulkActionResult {
  const errors: Array<{ userId: string; error: string }> = [];
  let succeeded = 0;

  for (const userId of userIds) {
    const user = users.find((u) => u.id === userId);
    if (!user) {
      errors.push({ userId, error: "User not found" });
      continue;
    }

    const result = unsuspendUser(user);
    if (result.success) {
      succeeded++;
    } else {
      errors.push({ userId, error: result.error || "Unknown error" });
    }
  }

  return {
    success: errors.length === 0,
    total: userIds.length,
    succeeded,
    failed: errors.length,
    errors,
  };
}

/**
 * Delete multiple users
 */
export function bulkDelete(
  users: ManagedUser[],
  userIds: string[],
  options?: { deleteContent?: boolean; anonymizeData?: boolean },
): BulkActionResult {
  const errors: Array<{ userId: string; error: string }> = [];
  let succeeded = 0;

  for (const userId of userIds) {
    const user = users.find((u) => u.id === userId);
    if (!user) {
      errors.push({ userId, error: "User not found" });
      continue;
    }

    const result = deleteUser(user, { userId, ...options });
    if (result.success) {
      succeeded++;
    } else {
      errors.push({ userId, error: result.error || "Unknown error" });
    }
  }

  return {
    success: errors.length === 0,
    total: userIds.length,
    succeeded,
    failed: errors.length,
    errors,
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate user role change
 */
export function canChangeRole(
  currentUser: ManagedUser,
  targetUser: ManagedUser,
  newRole: UserRole,
): { valid: boolean; error?: string } {
  // Cannot change own role
  if (currentUser.id === targetUser.id) {
    return { valid: false, error: "Cannot change your own role" };
  }

  // Cannot change owner's role
  if (targetUser.role === "owner") {
    return { valid: false, error: "Cannot change the owner role" };
  }

  // Only owner can promote to admin
  if (newRole === "admin" && currentUser.role !== "owner") {
    return { valid: false, error: "Only the owner can promote users to admin" };
  }

  // Only owner can create another owner (transfer ownership)
  if (newRole === "owner") {
    if (currentUser.role !== "owner") {
      return { valid: false, error: "Only the owner can transfer ownership" };
    }
  }

  // Admin can only change roles below admin level
  if (currentUser.role === "admin") {
    const allowedRoles: UserRole[] = ["moderator", "member", "guest"];
    if (!allowedRoles.includes(newRole)) {
      return {
        valid: false,
        error: "Admin can only assign moderator, member, or guest roles",
      };
    }
  }

  return { valid: true };
}

/**
 * Check if user can manage another user
 */
export function canManageUser(
  currentUser: ManagedUser,
  targetUser: ManagedUser,
): boolean {
  // Owner can manage everyone except themselves
  if (currentUser.role === "owner") {
    return currentUser.id !== targetUser.id;
  }

  // Admin can manage non-owners and non-admins
  if (currentUser.role === "admin") {
    return targetUser.role !== "owner" && targetUser.role !== "admin";
  }

  // Moderator can manage members and guests
  if (currentUser.role === "moderator") {
    return targetUser.role === "member" || targetUser.role === "guest";
  }

  return false;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a temporary password
 */
export function generateTemporaryPassword(length: number = 12): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

/**
 * Generate a reset token
 */
export function generateResetToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Format user status for display
 */
export function formatUserStatus(status: UserStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "suspended":
      return "Suspended";
    case "deleted":
      return "Deleted";
    case "pending":
      return "Pending Verification";
    default:
      return "Unknown";
  }
}

/**
 * Get status color for display
 */
export function getStatusColor(status: UserStatus): string {
  switch (status) {
    case "active":
      return "#22C55E"; // green
    case "suspended":
      return "#F59E0B"; // amber
    case "deleted":
      return "#EF4444"; // red
    case "pending":
      return "#6B7280"; // gray
    default:
      return "#6B7280";
  }
}

/**
 * Get user initials for avatar fallback
 */
export function getUserInitials(displayName: string): string {
  if (!displayName) return "?";

  const names = displayName.trim().split(/\s+/);
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }

  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}
