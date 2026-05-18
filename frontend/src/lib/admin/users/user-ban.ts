/**
 * User Ban Module
 * Handles user ban/unban functionality for admin
 */

import type {
  UserBan,
  BanUserInput,
  UnbanUserInput,
  UserActionResult,
  BanType,
  AdminUser,
} from "./user-types";

// ============================================================================
// Ban Operations
// ============================================================================

export async function banUser(data: BanUserInput): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/users/${data.userId}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to ban user",
      error: error.message,
    };
  }

  return { success: true, message: "User banned successfully" };
}

export async function unbanUser(
  data: UnbanUserInput,
): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/users/${data.userId}/unban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to unban user",
      error: error.message,
    };
  }

  return { success: true, message: "User unbanned successfully" };
}

// ============================================================================
// Ban History Operations
// ============================================================================

export async function fetchBannedUsers(pagination?: {
  page: number;
  perPage: number;
}): Promise<{ users: AdminUser[]; total: number }> {
  const params = new URLSearchParams();
  if (pagination) {
    params.set("page", pagination.page.toString());
    params.set("perPage", pagination.perPage.toString());
  }
  params.set("isBanned", "true");

  const response = await fetch(`/api/admin/users?${params}`);

  if (!response.ok) {
    throw new Error("Failed to fetch banned users");
  }

  return response.json();
}

export async function fetchUserBanHistory(userId: string): Promise<UserBan[]> {
  const response = await fetch(`/api/admin/users/${userId}/ban-history`);

  if (!response.ok) {
    throw new Error("Failed to fetch ban history");
  }

  return response.json();
}

export async function fetchActiveBans(): Promise<UserBan[]> {
  const response = await fetch("/api/admin/bans/active");

  if (!response.ok) {
    throw new Error("Failed to fetch active bans");
  }

  return response.json();
}

export async function fetchBanById(banId: string): Promise<UserBan | null> {
  const response = await fetch(`/api/admin/bans/${banId}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to fetch ban");
  }

  return response.json();
}

// ============================================================================
// Suspend Operations (temporary restriction without full ban)
// ============================================================================

export async function suspendUser(
  userId: string,
  reason: string,
  duration: string,
): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/users/${userId}/suspend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, duration }),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to suspend user",
      error: error.message,
    };
  }

  return { success: true, message: "User suspended successfully" };
}

export async function unsuspendUser(userId: string): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/users/${userId}/unsuspend`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to unsuspend user",
      error: error.message,
    };
  }

  return { success: true, message: "User unsuspended successfully" };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function parseBanDuration(duration: string): Date | null {
  const now = new Date();

  switch (duration) {
    case "1h":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "6h":
      return new Date(now.getTime() + 6 * 60 * 60 * 1000);
    case "12h":
      return new Date(now.getTime() + 12 * 60 * 60 * 1000);
    case "1d":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "3d":
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "14d":
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    case "365d":
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    case "permanent":
      return null; // null indicates permanent ban
    default:
      // Try to parse custom duration like "5d" or "24h"
      const match = duration.match(/^(\d+)(h|d)$/);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2];
        if (unit === "h") {
          return new Date(now.getTime() + value * 60 * 60 * 1000);
        } else if (unit === "d") {
          return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
        }
      }
      return null;
  }
}

export function formatBanDuration(
  bannedUntil: string | undefined | null,
): string {
  if (!bannedUntil) return "Permanent";

  const endDate = new Date(bannedUntil);
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 1) return "Less than 1 hour";
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""}`;
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function isBanActive(ban: UserBan): boolean {
  if (!ban.isActive) return false;
  if (!ban.bannedUntil) return true; // Permanent ban
  return new Date(ban.bannedUntil) > new Date();
}

export function getBanTypeLabel(type: BanType): string {
  switch (type) {
    case "temporary":
      return "Temporary Ban";
    case "permanent":
      return "Permanent Ban";
    default:
      return "Unknown";
  }
}

export function getBanTypeColor(type: BanType): string {
  switch (type) {
    case "temporary":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "permanent":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
}

export const BAN_DURATION_OPTIONS = [
  { value: "1h", label: "1 Hour" },
  { value: "6h", label: "6 Hours" },
  { value: "12h", label: "12 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "3d", label: "3 Days" },
  { value: "7d", label: "1 Week" },
  { value: "14d", label: "2 Weeks" },
  { value: "30d", label: "1 Month" },
  { value: "90d", label: "3 Months" },
  { value: "365d", label: "1 Year" },
  { value: "permanent", label: "Permanent" },
] as const;

export const BAN_REASON_PRESETS = [
  "Harassment or bullying",
  "Spam or advertising",
  "Inappropriate content",
  "Violation of community guidelines",
  "Abusive language",
  "Impersonation",
  "Sharing sensitive information",
  "Multiple account violations",
  "Other",
] as const;

export function canBanUser(
  adminUser: AdminUser,
  targetUser: AdminUser,
): boolean {
  // Owner cannot be banned
  if (targetUser.role.name === "owner") return false;

  // User cannot ban themselves
  if (adminUser.id === targetUser.id) return false;

  // Admins cannot ban other admins
  if (
    adminUser.role.name === "admin" &&
    ["admin", "owner"].includes(targetUser.role.name)
  ) {
    return false;
  }

  // Moderators can only ban members and guests
  if (adminUser.role.name === "moderator") {
    return ["member", "guest"].includes(targetUser.role.name);
  }

  return true;
}
