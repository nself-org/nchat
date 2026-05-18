/**
 * User Invite Module
 * Handles user invitation functionality for admin
 */

import type {
  UserInvite,
  InviteCreateInput,
  BulkInviteInput,
  BulkInviteResult,
  InviteLinkInput,
  InviteLink,
  UserActionResult,
  InviteStatus,
} from "./user-types";

// ============================================================================
// Invite CRUD Operations
// ============================================================================

export async function createInvite(
  data: InviteCreateInput,
): Promise<UserActionResult> {
  const response = await fetch("/api/admin/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to create invite",
      error: error.message,
    };
  }

  const invite = await response.json();
  return {
    success: true,
    message: "Invitation sent successfully",
    data: invite,
  };
}

export async function fetchInvites(
  status?: InviteStatus,
  pagination?: { page: number; perPage: number },
): Promise<{ invites: UserInvite[]; total: number }> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (pagination) {
    params.set("page", pagination.page.toString());
    params.set("perPage", pagination.perPage.toString());
  }

  const response = await fetch(`/api/admin/invites?${params}`);

  if (!response.ok) {
    throw new Error("Failed to fetch invites");
  }

  return response.json();
}

export async function fetchInviteById(
  inviteId: string,
): Promise<UserInvite | null> {
  const response = await fetch(`/api/admin/invites/${inviteId}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to fetch invite");
  }

  return response.json();
}

export async function revokeInvite(
  inviteId: string,
): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/invites/${inviteId}/revoke`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to revoke invite",
      error: error.message,
    };
  }

  return { success: true, message: "Invitation revoked successfully" };
}

export async function resendInvite(
  inviteId: string,
): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/invites/${inviteId}/resend`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to resend invite",
      error: error.message,
    };
  }

  return { success: true, message: "Invitation resent successfully" };
}

export async function deleteInvite(
  inviteId: string,
): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/invites/${inviteId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to delete invite",
      error: error.message,
    };
  }

  return { success: true, message: "Invitation deleted successfully" };
}

// ============================================================================
// Bulk Invite Operations
// ============================================================================

export async function createBulkInvites(
  data: BulkInviteInput,
): Promise<BulkInviteResult> {
  const response = await fetch("/api/admin/invites/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create bulk invites");
  }

  return response.json();
}

export function parseCSVEmails(csvContent: string): string[] {
  const lines = csvContent.trim().split("\n");
  const emails: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const line of lines) {
    const values = line
      .split(",")
      .map((v) => v.trim().replace(/^["']|["']$/g, ""));
    for (const value of values) {
      if (emailRegex.test(value)) {
        emails.push(value.toLowerCase());
      }
    }
  }

  // Remove duplicates
  return [...new Set(emails)];
}

export function validateBulkEmails(emails: string[]): {
  valid: string[];
  invalid: string[];
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const email of emails) {
    if (emailRegex.test(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  }

  return { valid, invalid };
}

// ============================================================================
// Invite Link Operations
// ============================================================================

export async function createInviteLink(
  data: InviteLinkInput,
): Promise<UserActionResult> {
  const response = await fetch("/api/admin/invites/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to create invite link",
      error: error.message,
    };
  }

  const link = await response.json();
  return {
    success: true,
    message: "Invite link created successfully",
    data: link,
  };
}

export async function fetchInviteLinks(): Promise<InviteLink[]> {
  const response = await fetch("/api/admin/invites/links");

  if (!response.ok) {
    throw new Error("Failed to fetch invite links");
  }

  return response.json();
}

export async function deactivateInviteLink(
  linkId: string,
): Promise<UserActionResult> {
  const response = await fetch(
    `/api/admin/invites/links/${linkId}/deactivate`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to deactivate link",
      error: error.message,
    };
  }

  return { success: true, message: "Invite link deactivated" };
}

export async function deleteInviteLink(
  linkId: string,
): Promise<UserActionResult> {
  const response = await fetch(`/api/admin/invites/links/${linkId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      message: "Failed to delete link",
      error: error.message,
    };
  }

  return { success: true, message: "Invite link deleted" };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateInviteUrl(code: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/invite/${code}`;
}

export function formatInviteExpiration(expiresAt: string): string {
  const date = new Date(expiresAt);
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return "Expired";

  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (hours < 1) return "Less than 1 hour";
  if (hours < 24) return `${hours} hours`;
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function getInviteStatusColor(status: InviteStatus): string {
  switch (status) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "accepted":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "expired":
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    case "revoked":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
}

export function isInviteExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function getDefaultExpirationDays(): number {
  return 7; // Default to 7 days
}

export function calculateExpirationDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// ============================================================================
// CSV Template Functions
// ============================================================================

/**
 * Download a CSV template for bulk user invites
 */
export function downloadInviteTemplate(): void {
  const template = `email,name,role
user1@example.com,John Doe,member
user2@example.com,Jane Smith,member
`;
  const blob = new Blob([template], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "invite-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Email Template Functions
// ============================================================================

export function generateInviteEmailSubject(appName: string): string {
  return `You've been invited to join ${appName}`;
}

export function generateInviteEmailPreview(
  inviterName: string,
  appName: string,
  message?: string,
): string {
  let preview = `${inviterName} has invited you to join ${appName}.`;
  if (message) {
    preview += ` "${message}"`;
  }
  return preview;
}
