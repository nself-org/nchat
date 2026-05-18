/**
 * Automated Action Engine
 *
 * Executes moderation actions based on AI analysis results.
 * Handles auto-moderation with appeal process and audit trail.
 */

import {
  getAIModerator,
  type ContentAnalysis,
  type AutoAction,
} from "./ai-moderator";
import { logTamperProofEvent } from "@/lib/audit/tamper-proof-audit";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface ModerationAction {
  id: string;
  actionType: AutoAction;
  contentId: string;
  contentType: string;
  targetUserId: string;
  targetUsername?: string;
  initiatedBy: "system" | "moderator" | "admin";
  initiatorId: string;
  reason: string;
  analysis: ContentAnalysis;
  status: "pending" | "executed" | "failed" | "appealed" | "reversed";
  executedAt?: Date;
  reversedAt?: Date;
  reversedBy?: string;
  reversalReason?: string;
  expiresAt?: Date; // For temporary actions like mutes
  appealId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionExecutionResult {
  success: boolean;
  action?: ModerationAction;
  error?: string;
  affectedResources: {
    type: "message" | "user" | "channel";
    id: string;
    action: string;
  }[];
}

export interface ActionExecutor {
  execute(action: ModerationAction): Promise<ActionExecutionResult>;
  canExecute(action: ModerationAction): boolean;
}

// ============================================================================
// Action Executors
// ============================================================================

class FlagExecutor implements ActionExecutor {
  canExecute(action: ModerationAction): boolean {
    return action.actionType === "flag";
  }

  async execute(action: ModerationAction): Promise<ActionExecutionResult> {
    try {
      // Flag content for manual review
      const affectedResources: ActionExecutionResult["affectedResources"] = [
        {
          type: "message",
          id: action.contentId,
          action: "flagged",
        },
      ];

      await logTamperProofEvent({
        action: "content_flagged",
        actor: { type: action.initiatedBy, id: action.initiatorId },
        category: "moderation",
        severity: "warning",
        description: `Content flagged: ${action.reason}`,
        resource: { type: "message", id: action.contentId },
        success: true,
        metadata: {
          targetUserId: action.targetUserId,
          analysisScore: action.analysis.overallScore,
        },
      });

      action.status = "executed";
      action.executedAt = new Date();

      return { success: true, action, affectedResources };
    } catch (error) {
      logger.error("[FlagExecutor]", error as Error);
      return {
        success: false,
        error: (error as Error).message,
        affectedResources: [],
      };
    }
  }
}

class HideExecutor implements ActionExecutor {
  canExecute(action: ModerationAction): boolean {
    return action.actionType === "hide" || action.actionType === "delete";
  }

  async execute(action: ModerationAction): Promise<ActionExecutionResult> {
    try {
      // Hide/delete content from view
      const affectedResources: ActionExecutionResult["affectedResources"] = [
        {
          type: "message",
          id: action.contentId,
          action: action.actionType === "delete" ? "deleted" : "hidden",
        },
      ];

      await logTamperProofEvent({
        action:
          action.actionType === "delete" ? "content_deleted" : "content_hidden",
        actor: { type: action.initiatedBy, id: action.initiatorId },
        category: "moderation",
        severity: "info",
        description: `Content ${action.actionType}: ${action.reason}`,
        resource: { type: "message", id: action.contentId },
        success: true,
        metadata: {
          targetUserId: action.targetUserId,
          analysisScore: action.analysis.overallScore,
        },
      });

      action.status = "executed";
      action.executedAt = new Date();

      return { success: true, action, affectedResources };
    } catch (error) {
      logger.error("[HideExecutor]", error as Error);
      return {
        success: false,
        error: (error as Error).message,
        affectedResources: [],
      };
    }
  }
}

class WarnExecutor implements ActionExecutor {
  canExecute(action: ModerationAction): boolean {
    return action.actionType === "warn";
  }

  async execute(action: ModerationAction): Promise<ActionExecutionResult> {
    try {
      // Send warning to user
      const affectedResources: ActionExecutionResult["affectedResources"] = [
        {
          type: "user",
          id: action.targetUserId,
          action: "warned",
        },
      ];

      await logTamperProofEvent({
        action: "user_warned",
        actor: { type: action.initiatedBy, id: action.initiatorId },
        category: "moderation",
        severity: "warning",
        description: `User warned: ${action.reason}`,
        resource: { type: "user", id: action.targetUserId },
        success: true,
        metadata: {
          contentId: action.contentId,
          analysisScore: action.analysis.overallScore,
        },
      });

      action.status = "executed";
      action.executedAt = new Date();

      return { success: true, action, affectedResources };
    } catch (error) {
      logger.error("[WarnExecutor]", error as Error);
      return {
        success: false,
        error: (error as Error).message,
        affectedResources: [],
      };
    }
  }
}

class MuteExecutor implements ActionExecutor {
  canExecute(action: ModerationAction): boolean {
    return action.actionType === "mute";
  }

  async execute(action: ModerationAction): Promise<ActionExecutionResult> {
    try {
      // Mute user temporarily (default 24 hours)
      const muteDuration = 24 * 60 * 60 * 1000; // 24 hours
      const expiresAt = new Date(Date.now() + muteDuration);

      const affectedResources: ActionExecutionResult["affectedResources"] = [
        {
          type: "user",
          id: action.targetUserId,
          action: "muted",
        },
      ];

      await logTamperProofEvent({
        action: "user_muted",
        actor: { type: action.initiatedBy, id: action.initiatorId },
        category: "moderation",
        severity: "warning",
        description: `User muted until ${expiresAt.toISOString()}: ${action.reason}`,
        resource: { type: "user", id: action.targetUserId },
        success: true,
        metadata: {
          expiresAt: expiresAt.toISOString(),
          duration: muteDuration,
          analysisScore: action.analysis.overallScore,
        },
      });

      action.status = "executed";
      action.executedAt = new Date();
      action.expiresAt = expiresAt;

      return { success: true, action, affectedResources };
    } catch (error) {
      logger.error("[MuteExecutor]", error as Error);
      return {
        success: false,
        error: (error as Error).message,
        affectedResources: [],
      };
    }
  }
}

class BanExecutor implements ActionExecutor {
  canExecute(action: ModerationAction): boolean {
    return action.actionType === "ban" || action.actionType === "shadowban";
  }

  async execute(action: ModerationAction): Promise<ActionExecutionResult> {
    try {
      const affectedResources: ActionExecutionResult["affectedResources"] = [
        {
          type: "user",
          id: action.targetUserId,
          action: action.actionType === "shadowban" ? "shadowbanned" : "banned",
        },
      ];

      await logTamperProofEvent({
        action:
          action.actionType === "shadowban"
            ? "user_shadowbanned"
            : "user_banned",
        actor: { type: action.initiatedBy, id: action.initiatorId },
        category: "moderation",
        severity: "critical",
        description: `User ${action.actionType}: ${action.reason}`,
        resource: { type: "user", id: action.targetUserId },
        success: true,
        metadata: {
          contentId: action.contentId,
          analysisScore: action.analysis.overallScore,
        },
      });

      action.status = "executed";
      action.executedAt = new Date();

      return { success: true, action, affectedResources };
    } catch (error) {
      logger.error("[BanExecutor]", error as Error);
      return {
        success: false,
        error: (error as Error).message,
        affectedResources: [],
      };
    }
  }
}

// ============================================================================
// Action Engine
// ============================================================================

export class AutomatedActionEngine {
  private executors: Map<AutoAction, ActionExecutor> = new Map();
  private actions: Map<string, ModerationAction> = new Map();
  private moderator = getAIModerator();

  constructor() {
    // Register executors
    const flagExecutor = new FlagExecutor();
    const hideExecutor = new HideExecutor();
    const warnExecutor = new WarnExecutor();
    const muteExecutor = new MuteExecutor();
    const banExecutor = new BanExecutor();

    this.executors.set("flag", flagExecutor);
    this.executors.set("hide", hideExecutor);
    this.executors.set("delete", hideExecutor);
    this.executors.set("warn", warnExecutor);
    this.executors.set("mute", muteExecutor);
    this.executors.set("ban", banExecutor);
    this.executors.set("shadowban", banExecutor);
  }

  /**
   * Process content and execute auto-moderation if needed
   */
  async processContent(
    contentId: string,
    contentType: ContentAnalysis["contentType"],
    content: string,
    userId: string,
    username?: string,
    metadata?: ContentAnalysis["metadata"],
  ): Promise<{
    analysis: ContentAnalysis;
    action?: ModerationAction;
    executed: boolean;
  }> {
    // Analyze content
    const analysis = await this.moderator.analyzeContent(
      contentId,
      contentType,
      content,
      {
        ...metadata,
        userId,
      },
    );

    // If no auto-action needed, return analysis only
    if (analysis.autoAction === "none") {
      return { analysis, executed: false };
    }

    // Create moderation action
    const action = this.createAction({
      actionType: analysis.autoAction,
      contentId,
      contentType,
      targetUserId: userId,
      targetUsername: username,
      initiatedBy: "system",
      initiatorId: "auto-moderator",
      reason: analysis.autoActionReason,
      analysis,
    });

    // Execute action
    const result = await this.executeAction(action);

    return {
      analysis,
      action: result.action,
      executed: result.success,
    };
  }

  /**
   * Create a moderation action
   */
  createAction(params: {
    actionType: AutoAction;
    contentId: string;
    contentType: string;
    targetUserId: string;
    targetUsername?: string;
    initiatedBy: ModerationAction["initiatedBy"];
    initiatorId: string;
    reason: string;
    analysis: ContentAnalysis;
    metadata?: Record<string, unknown>;
  }): ModerationAction {
    const now = new Date();
    const action: ModerationAction = {
      id: crypto.randomUUID(),
      actionType: params.actionType,
      contentId: params.contentId,
      contentType: params.contentType,
      targetUserId: params.targetUserId,
      targetUsername: params.targetUsername,
      initiatedBy: params.initiatedBy,
      initiatorId: params.initiatorId,
      reason: params.reason,
      analysis: params.analysis,
      status: "pending",
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.actions.set(action.id, action);
    return action;
  }

  /**
   * Execute a moderation action
   */
  async executeAction(
    action: ModerationAction,
  ): Promise<ActionExecutionResult> {
    const executor = this.executors.get(action.actionType);

    if (!executor) {
      return {
        success: false,
        error: `No executor found for action type: ${action.actionType}`,
        affectedResources: [],
      };
    }

    if (!executor.canExecute(action)) {
      return {
        success: false,
        error: `Executor cannot execute action: ${action.actionType}`,
        affectedResources: [],
      };
    }

    const result = await executor.execute(action);

    if (result.success && result.action) {
      this.actions.set(result.action.id, result.action);

      // Record violation for user
      if (action.analysis.detectedIssues.length > 0) {
        type Severity = "low" | "medium" | "high" | "critical";
        const highestSeverity = action.analysis.detectedIssues.reduce(
          (max, issue) => {
            const severityOrder: Record<Severity, number> = {
              low: 1,
              medium: 2,
              high: 3,
              critical: 4,
            };
            const maxOrder = severityOrder[max];
            const issueOrder = severityOrder[issue.severity];
            return issueOrder > maxOrder ? issue.severity : max;
          },
          "low" as Severity,
        );

        await this.moderator.recordViolation(
          action.targetUserId,
          highestSeverity,
        );
      }
    }

    return result;
  }

  /**
   * Reverse a moderation action (manual moderator intervention)
   */
  async reverseAction(
    actionId: string,
    reversedBy: string,
    reason: string,
  ): Promise<ActionExecutionResult> {
    const action = this.actions.get(actionId);

    if (!action) {
      return {
        success: false,
        error: "Action not found",
        affectedResources: [],
      };
    }

    if (action.status !== "executed") {
      return {
        success: false,
        error: `Cannot reverse action with status: ${action.status}`,
        affectedResources: [],
      };
    }

    action.status = "reversed";
    action.reversedAt = new Date();
    action.reversedBy = reversedBy;
    action.reversalReason = reason;
    action.updatedAt = new Date();

    await logTamperProofEvent({
      action: "moderation_action_reversed",
      actor: { type: "moderator", id: reversedBy },
      category: "moderation",
      severity: "info",
      description: `Moderation action reversed: ${reason}`,
      resource: { type: "user", id: action.targetUserId },
      success: true,
      metadata: {
        originalAction: action.actionType,
        originalReason: action.reason,
      },
    });

    this.actions.set(actionId, action);

    return {
      success: true,
      action,
      affectedResources: [
        {
          type: "user",
          id: action.targetUserId,
          action: "action_reversed",
        },
      ],
    };
  }

  /**
   * Get action by ID
   */
  getAction(actionId: string): ModerationAction | undefined {
    return this.actions.get(actionId);
  }

  /**
   * Get actions by user
   */
  getActionsByUser(userId: string): ModerationAction[] {
    return Array.from(this.actions.values()).filter(
      (a) => a.targetUserId === userId,
    );
  }

  /**
   * Get pending actions
   */
  getPendingActions(): ModerationAction[] {
    return Array.from(this.actions.values()).filter(
      (a) => a.status === "pending",
    );
  }

  /**
   * Get appealed actions
   */
  getAppealedActions(): ModerationAction[] {
    return Array.from(this.actions.values()).filter(
      (a) => a.status === "appealed",
    );
  }

  /**
   * Get action statistics
   */
  getStatistics(): {
    total: number;
    byType: Record<AutoAction, number>;
    byStatus: Record<ModerationAction["status"], number>;
    byInitiator: Record<ModerationAction["initiatedBy"], number>;
    executionRate: number;
    reversalRate: number;
  } {
    const actions = Array.from(this.actions.values());
    const total = actions.length;

    const stats = {
      total,
      byType: {} as Record<AutoAction, number>,
      byStatus: {} as Record<ModerationAction["status"], number>,
      byInitiator: {} as Record<ModerationAction["initiatedBy"], number>,
      executionRate: 0,
      reversalRate: 0,
    };

    let executed = 0;
    let reversed = 0;

    actions.forEach((action) => {
      // By type
      stats.byType[action.actionType] =
        (stats.byType[action.actionType] || 0) + 1;

      // By status
      stats.byStatus[action.status] = (stats.byStatus[action.status] || 0) + 1;

      // By initiator
      stats.byInitiator[action.initiatedBy] =
        (stats.byInitiator[action.initiatedBy] || 0) + 1;

      if (action.status === "executed") executed++;
      if (action.status === "reversed") reversed++;
    });

    stats.executionRate = total > 0 ? executed / total : 0;
    stats.reversalRate = executed > 0 ? reversed / executed : 0;

    return stats;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let actionEngineInstance: AutomatedActionEngine | null = null;

export function getActionEngine(): AutomatedActionEngine {
  if (!actionEngineInstance) {
    actionEngineInstance = new AutomatedActionEngine();
  }
  return actionEngineInstance;
}

export { type ContentAnalysis, type AutoAction };
