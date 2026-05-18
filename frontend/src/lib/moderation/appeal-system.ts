/**
 * Appeal System
 *
 * Allows users to appeal moderation decisions with
 * review workflow and resolution tracking.
 */

import { logTamperProofEvent } from "@/lib/audit/tamper-proof-audit";
import type { ModerationAction } from "./action-engine";

// ============================================================================
// Types
// ============================================================================

export type AppealStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "partially_approved"
  | "withdrawn";

export type AppealPriority = "low" | "medium" | "high" | "urgent";

export interface Appeal {
  id: string;
  actionId: string; // The moderation action being appealed
  userId: string;
  username?: string;
  status: AppealStatus;
  priority: AppealPriority;
  reason: string;
  evidence: AppealEvidence[];
  assignedTo?: string;
  assignedToName?: string;
  reviewNotes: AppealReviewNote[];
  resolution?: string;
  outcome?: {
    decision: "overturn" | "uphold" | "modify";
    explanation: string;
    newAction?: string; // If modified
    compensationOffered?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface AppealEvidence {
  id: string;
  type: "text" | "screenshot" | "link" | "file";
  content: string;
  description?: string;
  addedAt: Date;
}

export interface AppealReviewNote {
  id: string;
  authorId: string;
  authorName?: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface AppealFilter {
  status?: AppealStatus | AppealStatus[];
  priority?: AppealPriority | AppealPriority[];
  userId?: string;
  assignedTo?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AppealStats {
  total: number;
  byStatus: Record<AppealStatus, number>;
  byPriority: Record<AppealPriority, number>;
  averageResolutionTimeMs: number;
  approvalRate: number;
  rejectionRate: number;
  pendingCount: number;
}

// ============================================================================
// Appeal Queue
// ============================================================================

export class AppealQueue {
  private appeals: Map<string, Appeal> = new Map();
  private maxEvidencePerAppeal = 10;
  private maxAppealTextLength = 5000;

  /**
   * Submit an appeal
   */
  async submitAppeal(params: {
    actionId: string;
    userId: string;
    username?: string;
    reason: string;
    evidence?: Omit<AppealEvidence, "id" | "addedAt">[];
    metadata?: Record<string, unknown>;
  }): Promise<{ success: boolean; appeal?: Appeal; error?: string }> {
    // Validate reason
    if (!params.reason || params.reason.trim().length === 0) {
      return { success: false, error: "Appeal reason is required" };
    }

    if (params.reason.length > this.maxAppealTextLength) {
      return {
        success: false,
        error: `Appeal reason exceeds maximum length of ${this.maxAppealTextLength}`,
      };
    }

    // Check if appeal already exists for this action
    const existingAppeal = Array.from(this.appeals.values()).find(
      (a) =>
        a.actionId === params.actionId &&
        a.userId === params.userId &&
        a.status === "pending",
    );

    if (existingAppeal) {
      return {
        success: false,
        error: "An appeal for this action is already pending",
      };
    }

    // Validate evidence
    if (params.evidence && params.evidence.length > this.maxEvidencePerAppeal) {
      return {
        success: false,
        error: `Maximum ${this.maxEvidencePerAppeal} evidence items allowed`,
      };
    }

    // Create evidence with IDs
    const evidence: AppealEvidence[] = (params.evidence || []).map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      addedAt: new Date(),
    }));

    // Determine priority based on evidence and content
    const priority = this.calculatePriority(params.reason, evidence.length);

    // Create appeal
    const now = new Date();
    const appeal: Appeal = {
      id: crypto.randomUUID(),
      actionId: params.actionId,
      userId: params.userId,
      username: params.username,
      status: "pending",
      priority,
      reason: params.reason.trim(),
      evidence,
      reviewNotes: [],
      createdAt: now,
      updatedAt: now,
      metadata: params.metadata,
    };

    this.appeals.set(appeal.id, appeal);

    // Log audit event
    await logTamperProofEvent({
      action: "appeal_submitted",
      actor: { type: "user", id: params.userId },
      category: "moderation",
      severity: "info",
      description: `User submitted appeal for action ${params.actionId}`,
      resource: { type: "user", id: params.userId },
      success: true,
      metadata: {
        appealId: appeal.id,
        actionId: params.actionId,
        priority,
      },
    });

    return { success: true, appeal };
  }

  /**
   * Calculate appeal priority
   */
  private calculatePriority(
    reason: string,
    evidenceCount: number,
  ): AppealPriority {
    const urgentKeywords = [
      "ban",
      "suspended",
      "terminated",
      "locked out",
      "cannot access",
    ];
    const highKeywords = ["unfair", "mistake", "incorrect", "wrong", "error"];

    const reasonLower = reason.toLowerCase();

    // Check for urgent keywords
    if (urgentKeywords.some((keyword) => reasonLower.includes(keyword))) {
      return "urgent";
    }

    // High priority if multiple evidence items or high keywords
    if (
      evidenceCount >= 3 ||
      highKeywords.some((keyword) => reasonLower.includes(keyword))
    ) {
      return "high";
    }

    // Medium priority if some evidence
    if (evidenceCount > 0) {
      return "medium";
    }

    return "low";
  }

  /**
   * Assign appeal to moderator
   */
  async assignAppeal(
    appealId: string,
    moderatorId: string,
    moderatorName?: string,
  ): Promise<{ success: boolean; appeal?: Appeal; error?: string }> {
    const appeal = this.appeals.get(appealId);
    if (!appeal) {
      return { success: false, error: "Appeal not found" };
    }

    if (appeal.status !== "pending" && appeal.status !== "under_review") {
      return {
        success: false,
        error: "Appeal cannot be assigned in current status",
      };
    }

    appeal.assignedTo = moderatorId;
    appeal.assignedToName = moderatorName;
    appeal.status = "under_review";
    appeal.updatedAt = new Date();

    await logTamperProofEvent({
      action: "appeal_assigned",
      actor: { type: "moderator", id: moderatorId },
      category: "moderation",
      severity: "info",
      description: `Appeal assigned to moderator`,
      resource: { type: "user", id: appeal.userId },
      success: true,
      metadata: {
        appealId,
        moderatorId,
      },
    });

    this.appeals.set(appealId, appeal);
    return { success: true, appeal };
  }

  /**
   * Add review note to appeal
   */
  async addReviewNote(
    appealId: string,
    authorId: string,
    content: string,
    isInternal: boolean = true,
    authorName?: string,
  ): Promise<{ success: boolean; note?: AppealReviewNote; error?: string }> {
    const appeal = this.appeals.get(appealId);
    if (!appeal) {
      return { success: false, error: "Appeal not found" };
    }

    const note: AppealReviewNote = {
      id: crypto.randomUUID(),
      authorId,
      authorName,
      content: content.trim(),
      isInternal,
      createdAt: new Date(),
    };

    appeal.reviewNotes.push(note);
    appeal.updatedAt = new Date();

    this.appeals.set(appealId, appeal);
    return { success: true, note };
  }

  /**
   * Resolve an appeal
   */
  async resolveAppeal(
    appealId: string,
    resolvedBy: string,
    decision: "approve" | "reject" | "partially_approve",
    resolution: string,
    outcome?: Appeal["outcome"],
  ): Promise<{ success: boolean; appeal?: Appeal; error?: string }> {
    const appeal = this.appeals.get(appealId);
    if (!appeal) {
      return { success: false, error: "Appeal not found" };
    }

    if (appeal.status !== "under_review") {
      return {
        success: false,
        error: "Appeal must be under review to be resolved",
      };
    }

    const statusMap: Record<typeof decision, AppealStatus> = {
      approve: "approved",
      reject: "rejected",
      partially_approve: "partially_approved",
    };

    const now = new Date();
    appeal.status = statusMap[decision];
    appeal.resolution = resolution;
    appeal.outcome = outcome;
    appeal.resolvedAt = now;
    appeal.resolvedBy = resolvedBy;
    appeal.reviewedAt = now;
    appeal.reviewedBy = resolvedBy;
    appeal.updatedAt = now;

    await logTamperProofEvent({
      action: "appeal_resolved",
      actor: { type: "moderator", id: resolvedBy },
      category: "moderation",
      severity: "info",
      description: `Appeal ${decision}: ${resolution}`,
      resource: { type: "user", id: appeal.userId },
      success: true,
      metadata: {
        appealId,
        decision,
        outcome: outcome?.decision,
      },
    });

    this.appeals.set(appealId, appeal);
    return { success: true, appeal };
  }

  /**
   * Withdraw an appeal (user cancellation)
   */
  async withdrawAppeal(
    appealId: string,
    userId: string,
  ): Promise<{ success: boolean; appeal?: Appeal; error?: string }> {
    const appeal = this.appeals.get(appealId);
    if (!appeal) {
      return { success: false, error: "Appeal not found" };
    }

    if (appeal.userId !== userId) {
      return {
        success: false,
        error: "Only the appeal submitter can withdraw it",
      };
    }

    if (!["pending", "under_review"].includes(appeal.status)) {
      return {
        success: false,
        error: "Appeal cannot be withdrawn in current status",
      };
    }

    appeal.status = "withdrawn";
    appeal.updatedAt = new Date();

    await logTamperProofEvent({
      action: "appeal_withdrawn",
      actor: { type: "user", id: userId },
      category: "moderation",
      severity: "info",
      description: `Appeal withdrawn by user`,
      resource: { type: "user", id: userId },
      success: true,
      metadata: { appealId },
    });

    this.appeals.set(appealId, appeal);
    return { success: true, appeal };
  }

  /**
   * Get appeal by ID
   */
  getAppeal(appealId: string): Appeal | undefined {
    return this.appeals.get(appealId);
  }

  /**
   * Get filtered appeals
   */
  getAppeals(filter: AppealFilter = {}): Appeal[] {
    let appeals = Array.from(this.appeals.values());

    if (filter.status) {
      const statuses = Array.isArray(filter.status)
        ? filter.status
        : [filter.status];
      appeals = appeals.filter((a) => statuses.includes(a.status));
    }

    if (filter.priority) {
      const priorities = Array.isArray(filter.priority)
        ? filter.priority
        : [filter.priority];
      appeals = appeals.filter((a) => priorities.includes(a.priority));
    }

    if (filter.userId) {
      appeals = appeals.filter((a) => a.userId === filter.userId);
    }

    if (filter.assignedTo) {
      appeals = appeals.filter((a) => a.assignedTo === filter.assignedTo);
    }

    if (filter.startDate) {
      appeals = appeals.filter((a) => a.createdAt >= filter.startDate!);
    }

    if (filter.endDate) {
      appeals = appeals.filter((a) => a.createdAt <= filter.endDate!);
    }

    // Sort by priority then date
    const priorityOrder: Record<AppealPriority, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    appeals.sort((a, b) => {
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return appeals;
  }

  /**
   * Get pending appeals
   */
  getPendingAppeals(): Appeal[] {
    return this.getAppeals({ status: ["pending", "under_review"] });
  }

  /**
   * Get appeals by user
   */
  getUserAppeals(userId: string): Appeal[] {
    return this.getAppeals({ userId });
  }

  /**
   * Get appeals assigned to moderator
   */
  getModeratorAppeals(moderatorId: string): Appeal[] {
    return this.getAppeals({ assignedTo: moderatorId });
  }

  /**
   * Get appeal statistics
   */
  getStatistics(): AppealStats {
    const appeals = Array.from(this.appeals.values());

    const stats: AppealStats = {
      total: appeals.length,
      byStatus: {
        pending: 0,
        under_review: 0,
        approved: 0,
        rejected: 0,
        partially_approved: 0,
        withdrawn: 0,
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
      averageResolutionTimeMs: 0,
      approvalRate: 0,
      rejectionRate: 0,
      pendingCount: 0,
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    appeals.forEach((appeal) => {
      stats.byStatus[appeal.status]++;
      stats.byPriority[appeal.priority]++;

      if (["pending", "under_review"].includes(appeal.status)) {
        stats.pendingCount++;
      }

      if (appeal.resolvedAt) {
        const resolutionTime =
          appeal.resolvedAt.getTime() - appeal.createdAt.getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;

        if (
          appeal.status === "approved" ||
          appeal.status === "partially_approved"
        ) {
          approvedCount++;
        } else if (appeal.status === "rejected") {
          rejectedCount++;
        }
      }
    });

    if (resolvedCount > 0) {
      stats.averageResolutionTimeMs = totalResolutionTime / resolvedCount;
      stats.approvalRate = approvedCount / resolvedCount;
      stats.rejectionRate = rejectedCount / resolvedCount;
    }

    return stats;
  }

  /**
   * Clear all appeals
   */
  clearAll(): void {
    this.appeals.clear();
  }
}

// ============================================================================
// Singleton
// ============================================================================

let appealQueueInstance: AppealQueue | null = null;

export function getAppealQueue(): AppealQueue {
  if (!appealQueueInstance) {
    appealQueueInstance = new AppealQueue();
  }
  return appealQueueInstance;
}
