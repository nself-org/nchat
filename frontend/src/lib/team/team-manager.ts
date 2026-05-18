/**
 * Team Manager
 * Production-ready team and workspace management functionality
 */

import type {
  Team,
  TeamSettings,
  TeamInvitation,
  InviteEmailInput,
  InviteBulkInput,
  InviteBulkResult,
  InviteLink,
  InviteLinkInput,
  TeamMember,
  ChangeMemberRoleInput,
  RemoveMemberInput,
  TransferOwnershipInput,
  TeamDeletionRequest,
  TeamExportRequest,
  TeamExportResult,
  TeamActionResult,
  SlugAvailabilityResult,
  UsageStatistics,
  BillingInfo,
  ChangePlanInput,
  UpdatePaymentMethodInput,
} from "./team-types";
import { logger } from "@/lib/logger";

/**
 * Team Settings Management
 */
export class TeamManager {
  /**
   * Get team details
   */
  async getTeam(teamId: string): Promise<Team> {
    const response = await fetch(`/api/admin/team/${teamId}`);
    if (!response.ok) throw new Error("Failed to fetch team");
    return response.json();
  }

  /**
   * Update team settings
   */
  async updateTeamSettings(
    teamId: string,
    settings: Partial<TeamSettings>,
  ): Promise<TeamActionResult<Team>> {
    try {
      const response = await fetch(`/api/admin/team/${teamId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update team settings");
      }

      const data = await response.json();
      return {
        success: true,
        message: "Team settings updated successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to update team settings",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if team slug is available
   */
  async checkSlugAvailability(
    slug: string,
    teamId?: string,
  ): Promise<SlugAvailabilityResult> {
    try {
      const params = new URLSearchParams({ slug });
      if (teamId) params.append("teamId", teamId);

      const response = await fetch(`/api/admin/team/slug-check?${params}`);
      if (!response.ok) throw new Error("Failed to check slug availability");

      return response.json();
    } catch (error) {
      return {
        available: false,
        slug,
        suggestions: [],
      };
    }
  }

  /**
   * Generate slug from team name
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Invite Member via Email
   */
  async inviteMemberByEmail(
    teamId: string,
    input: InviteEmailInput,
  ): Promise<TeamActionResult<TeamInvitation>> {
    try {
      const response = await fetch(`/api/admin/team/${teamId}/invites/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send invitation");
      }

      const data = await response.json();
      return {
        success: true,
        message: `Invitation sent to ${input.email}`,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to send invitation",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Bulk Invite Members
   */
  async bulkInviteMembers(
    teamId: string,
    input: InviteBulkInput,
  ): Promise<TeamActionResult<InviteBulkResult>> {
    try {
      const response = await fetch(`/api/admin/team/${teamId}/invites/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send bulk invitations");
      }

      const data: InviteBulkResult = await response.json();
      return {
        success: true,
        message: `Sent ${data.totalSent} invitation(s), ${data.totalFailed} failed`,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to send bulk invitations",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create Invite Link
   */
  async createInviteLink(
    teamId: string,
    input: InviteLinkInput,
  ): Promise<TeamActionResult<InviteLink>> {
    try {
      const response = await fetch(`/api/admin/team/${teamId}/invites/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create invite link");
      }

      const data = await response.json();
      return {
        success: true,
        message: "Invite link created successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to create invite link",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get Pending Invitations
   */
  async getPendingInvitations(teamId: string): Promise<TeamInvitation[]> {
    try {
      const response = await fetch(
        `/api/admin/team/${teamId}/invites?status=pending`,
      );
      if (!response.ok) throw new Error("Failed to fetch invitations");
      return response.json();
    } catch (error) {
      logger.error("Failed to fetch pending invitations:", error);
      return [];
    }
  }

  /**
   * Cancel Invitation
   */
  async cancelInvitation(
    teamId: string,
    invitationId: string,
  ): Promise<TeamActionResult<void>> {
    try {
      const response = await fetch(
        `/api/admin/team/${teamId}/invites/${invitationId}/cancel`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to cancel invitation");
      }

      return {
        success: true,
        message: "Invitation canceled successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to cancel invitation",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Resend Invitation
   */
  async resendInvitation(
    teamId: string,
    invitationId: string,
  ): Promise<TeamActionResult<void>> {
    try {
      const response = await fetch(
        `/api/admin/team/${teamId}/invites/${invitationId}/resend`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to resend invitation");
      }

      return {
        success: true,
        message: "Invitation resent successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to resend invitation",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get Team Members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      const response = await fetch(`/api/admin/team/${teamId}/members`);
      if (!response.ok) throw new Error("Failed to fetch team members");
      return response.json();
    } catch (error) {
      logger.error("Failed to fetch team members:", error);
      return [];
    }
  }

  /**
   * Change Member Role
   */
  async changeMemberRole(
    teamId: string,
    input: ChangeMemberRoleInput,
  ): Promise<TeamActionResult<void>> {
    try {
      const response = await fetch(
        `/api/admin/team/${teamId}/members/${input.userId}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: input.newRole, reason: input.reason }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change member role");
      }

      return {
        success: true,
        message: "Member role updated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to change member role",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Remove Team Member
   */
  async removeMember(
    teamId: string,
    input: RemoveMemberInput,
  ): Promise<TeamActionResult<void>> {
    try {
      const response = await fetch(
        `/api/admin/team/${teamId}/members/${input.userId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: input.reason,
            notifyUser: input.notifyUser,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove member");
      }

      return {
        success: true,
        message: "Member removed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to remove member",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Transfer Team Ownership
   */
  async transferOwnership(
    teamId: string,
    input: TransferOwnershipInput,
  ): Promise<TeamActionResult<void>> {
    try {
      const response = await fetch(
        `/api/admin/team/${teamId}/transfer-ownership`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to transfer ownership");
      }

      return {
        success: true,
        message: "Ownership transferred successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to transfer ownership",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get Billing Information
   */
  async getBillingInfo(teamId: string): Promise<BillingInfo | null> {
    try {
      const response = await fetch(`/api/admin/team/${teamId}/billing`);
      if (!response.ok) throw new Error("Failed to fetch billing information");
      return response.json();
    } catch (error) {
      logger.error("Failed to fetch billing information:", error);
      return null;
    }
  }

  /**
   * Get Usage Statistics
   */
  async getUsageStatistics(
    teamId: string,
    period: string = "current",
  ): Promise<UsageStatistics | null> {
    try {
      const response = await fetch(
        `/api/admin/team/${teamId}/usage?period=${period}`,
      );
      if (!response.ok) throw new Error("Failed to fetch usage statistics");
      return response.json();
    } catch (error) {
      logger.error("Failed to fetch usage statistics:", error);
      return null;
    }
  }

  /**
   * Change Billing Plan
   */
  async changePlan(
    teamId: string,
    input: ChangePlanInput,
  ): Promise<TeamActionResult<void>> {
    try {
      const response = await fetch(`/api/admin/team/${teamId}/billing/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change plan");
      }

      return {
        success: true,
        message: "Plan changed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to change plan",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update Payment Method
   */
  async updatePaymentMethod(
    teamId: string,
    input: UpdatePaymentMethodInput,
  ): Promise<TeamActionResult<void>> {
    try {
      const response = await fetch(
        `/api/admin/team/${teamId}/billing/payment-method`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update payment method");
      }

      return {
        success: true,
        message: "Payment method updated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to update payment method",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Request Team Data Export
   */
  async requestDataExport(
    teamId: string,
    request: TeamExportRequest,
  ): Promise<TeamActionResult<TeamExportResult>> {
    try {
      const response = await fetch(`/api/admin/team/${teamId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to request data export");
      }

      const data = await response.json();
      return {
        success: true,
        message: "Data export started. You will be notified when complete.",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to request data export",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete Team
   */
  async deleteTeam(
    teamId: string,
    request: TeamDeletionRequest,
  ): Promise<TeamActionResult<void>> {
    try {
      const response = await fetch(`/api/admin/team/${teamId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete team");
      }

      return {
        success: true,
        message: request.deleteImmediately
          ? "Team deleted successfully"
          : "Team scheduled for deletion",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to delete team",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Validate Email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate Slug
   */
  validateSlug(slug: string): { valid: boolean; error?: string } {
    if (!slug || slug.length < 3) {
      return { valid: false, error: "Slug must be at least 3 characters" };
    }

    if (slug.length > 50) {
      return { valid: false, error: "Slug must be less than 50 characters" };
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return {
        valid: false,
        error: "Slug can only contain lowercase letters, numbers, and hyphens",
      };
    }

    if (slug.startsWith("-") || slug.endsWith("-")) {
      return { valid: false, error: "Slug cannot start or end with a hyphen" };
    }

    // Reserved slugs
    const reserved = [
      "admin",
      "api",
      "app",
      "auth",
      "dashboard",
      "settings",
      "team",
      "www",
    ];
    if (reserved.includes(slug)) {
      return { valid: false, error: "This slug is reserved" };
    }

    return { valid: true };
  }

  /**
   * Parse CSV Emails
   */
  parseCSVEmails(content: string): string[] {
    const lines = content.split("\n").map((line) => line.trim());
    const emails: string[] = [];

    for (const line of lines) {
      if (!line) continue;

      // Handle CSV with multiple columns
      const parts = line.split(",").map((part) => part.trim());

      for (const part of parts) {
        // Extract email if in format "Name <email@example.com>"
        const emailMatch = part.match(/<([^>]+)>/);
        const email = emailMatch ? emailMatch[1] : part;

        if (this.validateEmail(email)) {
          emails.push(email.toLowerCase());
        }
      }
    }

    // Return unique emails
    return [...new Set(emails)];
  }

  /**
   * Format File Size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Calculate Storage Percentage
   */
  calculateStoragePercentage(used: number, quota: number): number {
    if (quota === 0) return 0;
    return Math.round((used / quota) * 100);
  }
}

// Export singleton instance
export const teamManager = new TeamManager();
