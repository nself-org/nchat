/**
 * User Impersonation Module
 * Handles admin impersonation functionality
 */

import type {
  AdminUser,
  ImpersonationSession,
  ImpersonateUserInput,
  UserActionResult,
} from "./user-types";

// ============================================================================
// Impersonation Operations
// ============================================================================

export async function startImpersonation(
  data: ImpersonateUserInput,
): Promise<UserActionResult> {
  const response = await fetch("/api/admin/impersonate/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to start impersonation",
      error: error.message,
    };
  }

  const session = await response.json();
  return {
    success: true,
    message: "Impersonation session started",
    data: session,
  };
}

export async function endImpersonation(): Promise<UserActionResult> {
  const response = await fetch("/api/admin/impersonate/end", {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to end impersonation",
      error: error.message,
    };
  }

  return { success: true, message: "Impersonation session ended" };
}

export async function getActiveImpersonation(): Promise<ImpersonationSession | null> {
  const response = await fetch("/api/admin/impersonate/active");

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to get active impersonation");
  }

  return response.json();
}

export async function getImpersonationHistory(pagination?: {
  page: number;
  perPage: number;
}): Promise<{ sessions: ImpersonationSession[]; total: number }> {
  const params = new URLSearchParams();
  if (pagination) {
    params.set("page", pagination.page.toString());
    params.set("perPage", pagination.perPage.toString());
  }

  const response = await fetch(`/api/admin/impersonate/history?${params}`);

  if (!response.ok) {
    throw new Error("Failed to get impersonation history");
  }

  return response.json();
}

export async function getImpersonationSessionsByUser(
  userId: string,
): Promise<ImpersonationSession[]> {
  const response = await fetch(`/api/admin/impersonate/history/${userId}`);

  if (!response.ok) {
    throw new Error("Failed to get impersonation sessions");
  }

  return response.json();
}

// ============================================================================
// Permission Checks
// ============================================================================

export function canImpersonate(
  adminUser: AdminUser,
  targetUser: AdminUser,
): boolean {
  // Only owners and admins can impersonate
  if (!["owner", "admin"].includes(adminUser.role.name)) {
    return false;
  }

  // Cannot impersonate yourself
  if (adminUser.id === targetUser.id) {
    return false;
  }

  // Admins cannot impersonate owners
  if (adminUser.role.name === "admin" && targetUser.role.name === "owner") {
    return false;
  }

  // Cannot impersonate banned users
  if (targetUser.isBanned) {
    return false;
  }

  return true;
}

export function getImpersonationRestrictions(
  adminUser: AdminUser,
  targetUser: AdminUser,
): string[] {
  const restrictions: string[] = [];

  if (!["owner", "admin"].includes(adminUser.role.name)) {
    restrictions.push("Only owners and admins can impersonate users");
  }

  if (adminUser.id === targetUser.id) {
    restrictions.push("Cannot impersonate yourself");
  }

  if (adminUser.role.name === "admin" && targetUser.role.name === "owner") {
    restrictions.push("Admins cannot impersonate the owner");
  }

  if (targetUser.isBanned) {
    restrictions.push("Cannot impersonate banned users");
  }

  return restrictions;
}

// ============================================================================
// Storage Keys
// ============================================================================

const IMPERSONATION_KEY = "nchat_impersonation";
const ORIGINAL_USER_KEY = "nchat_original_user";

export function setImpersonationState(session: ImpersonationSession): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(session));
  }
}

export function getImpersonationState(): ImpersonationSession | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    return stored ? JSON.parse(stored) : null;
  }
  return null;
}

export function clearImpersonationState(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(IMPERSONATION_KEY);
    sessionStorage.removeItem(ORIGINAL_USER_KEY);
  }
}

export function setOriginalUser(user: AdminUser): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(ORIGINAL_USER_KEY, JSON.stringify(user));
  }
}

export function getOriginalUser(): AdminUser | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(ORIGINAL_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }
  return null;
}

export function isImpersonating(): boolean {
  return getImpersonationState() !== null;
}

// ============================================================================
// Impersonation UI Helpers
// ============================================================================

export interface ImpersonationBannerProps {
  session: ImpersonationSession;
  onEnd: () => void;
}

export function formatImpersonationDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diff = now.getTime() - start.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "Just started";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  return `${hours} hour${hours > 1 ? "s" : ""}`;
}

// ============================================================================
// Reason Presets
// ============================================================================

export const IMPERSONATION_REASON_PRESETS = [
  "Investigating reported issue",
  "Troubleshooting user problem",
  "Testing user experience",
  "Verifying permissions",
  "Support request assistance",
  "Security audit",
  "Other",
] as const;

export function validateImpersonationReason(reason: string): {
  valid: boolean;
  error?: string;
} {
  if (!reason.trim()) {
    return { valid: false, error: "Reason is required" };
  }

  if (reason.length < 10) {
    return { valid: false, error: "Reason must be at least 10 characters" };
  }

  if (reason.length > 500) {
    return { valid: false, error: "Reason must be 500 characters or less" };
  }

  return { valid: true };
}

// ============================================================================
// Audit Trail
// ============================================================================

export interface ImpersonationAuditEntry {
  id: string;
  sessionId: string;
  action: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export async function getImpersonationAuditLog(
  sessionId: string,
): Promise<ImpersonationAuditEntry[]> {
  const response = await fetch(`/api/admin/impersonate/${sessionId}/audit`);

  if (!response.ok) {
    throw new Error("Failed to get audit log");
  }

  return response.json();
}

export function logImpersonationAction(
  action: string,
  details?: Record<string, unknown>,
): void {
  // This would be called internally to log actions during impersonation
  // In production, this would send to the server
}
