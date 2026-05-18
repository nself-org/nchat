/**
 * Report Handler - Server-side report processing and action execution
 *
 * Handles report submissions, action processing, notifications,
 * auto-escalation, and moderation workflow automation.
 */

import {
  ReportQueue,
  type Report,
  type CreateReportInput,
  type UpdateReportInput,
  type ReportStatus,
  type ReportPriority,
  type ReportTargetType,
  type ReportCategory,
  DEFAULT_REPORT_CATEGORIES,
} from "./report-system";

// ============================================================================
// Types
// ============================================================================

export interface ReportActionContext {
  reportId: string;
  moderatorId: string;
  moderatorName?: string;
  action: ReportAction;
  notes?: string;
  timestamp: string;
}

export type ReportAction =
  | "approve"
  | "dismiss"
  | "escalate"
  | "remove-content"
  | "warn-user"
  | "mute-user"
  | "ban-user"
  | "assign"
  | "review"
  | "resolve";

export interface ActionResult {
  success: boolean;
  reportId: string;
  action: ReportAction;
  newStatus: ReportStatus;
  message?: string;
  error?: string;
  notifications?: Notification[];
}

export interface Notification {
  type: "email" | "in-app" | "webhook";
  recipient: string;
  subject: string;
  body: string;
  priority: "low" | "normal" | "high";
}

export interface ModerationAction {
  action: string;
  targetId: string;
  targetType: string;
  executedBy: string;
  reason: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface EscalationRule {
  categoryId: string;
  autoEscalate: boolean;
  escalateToPriority: ReportPriority;
  notifyRoles: string[];
}

export interface ReportHandlerConfig {
  enableAutoModeration: boolean;
  enableNotifications: boolean;
  enableEscalation: boolean;
  notificationChannels: ("email" | "in-app" | "webhook")[];
  escalationRules: EscalationRule[];
  actionExecutors: Partial<Record<ReportAction, ActionExecutor>>;
}

export type ActionExecutor = (
  context: ReportActionContext,
  report: Report,
) => Promise<ActionResult>;

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    categoryId: "hate-speech",
    autoEscalate: true,
    escalateToPriority: "urgent",
    notifyRoles: ["admin", "moderator"],
  },
  {
    categoryId: "scam",
    autoEscalate: true,
    escalateToPriority: "urgent",
    notifyRoles: ["admin"],
  },
  {
    categoryId: "harassment",
    autoEscalate: true,
    escalateToPriority: "high",
    notifyRoles: ["admin", "moderator"],
  },
  {
    categoryId: "impersonation",
    autoEscalate: true,
    escalateToPriority: "high",
    notifyRoles: ["admin"],
  },
];

export const DEFAULT_HANDLER_CONFIG: ReportHandlerConfig = {
  enableAutoModeration: true,
  enableNotifications: true,
  enableEscalation: true,
  notificationChannels: ["in-app", "email"],
  escalationRules: DEFAULT_ESCALATION_RULES,
  actionExecutors: {},
};

// ============================================================================
// Report Handler Class
// ============================================================================

export class ReportHandler {
  private queue: ReportQueue;
  private config: ReportHandlerConfig;
  private actionLog: ModerationAction[] = [];
  private notificationQueue: Notification[] = [];

  constructor(config: Partial<ReportHandlerConfig> = {}) {
    this.config = { ...DEFAULT_HANDLER_CONFIG, ...config };
    this.queue = new ReportQueue();
  }

  /**
   * Submits a new report
   */
  async submitReport(input: CreateReportInput): Promise<ActionResult> {
    const result = this.queue.createReport(input);

    if (!result.success || !result.report) {
      return {
        success: false,
        reportId: "",
        action: "review",
        newStatus: "pending",
        error: result.errors?.join(", "),
      };
    }

    const report = result.report;

    // Check for auto-escalation
    if (this.config.enableEscalation) {
      await this.checkEscalation(report);
    }

    // Send notifications
    if (this.config.enableNotifications) {
      await this.sendReportNotifications(report, "created");
    }

    // Auto-moderate if enabled
    if (this.config.enableAutoModeration) {
      await this.autoModerate(report);
    }

    return {
      success: true,
      reportId: report.id,
      action: "review",
      newStatus: report.status,
      message: "Report submitted successfully",
      notifications: this.notificationQueue.filter((n) =>
        n.subject.includes(report.id),
      ),
    };
  }

  /**
   * Processes a moderation action
   */
  async processAction(context: ReportActionContext): Promise<ActionResult> {
    const report = this.queue.getReport(context.reportId);

    if (!report) {
      return {
        success: false,
        reportId: context.reportId,
        action: context.action,
        newStatus: "pending",
        error: "Report not found",
      };
    }

    // Execute action
    let result: ActionResult;

    switch (context.action) {
      case "approve":
        result = await this.approveReport(context, report);
        break;
      case "dismiss":
        result = await this.dismissReport(context, report);
        break;
      case "escalate":
        result = await this.escalateReport(context, report);
        break;
      case "remove-content":
        result = await this.removeContent(context, report);
        break;
      case "warn-user":
        result = await this.warnUser(context, report);
        break;
      case "mute-user":
        result = await this.muteUser(context, report);
        break;
      case "ban-user":
        result = await this.banUser(context, report);
        break;
      case "assign":
        result = await this.assignReport(context, report);
        break;
      case "resolve":
        result = await this.resolveReport(context, report);
        break;
      default:
        result = {
          success: false,
          reportId: context.reportId,
          action: context.action,
          newStatus: report.status,
          error: `Unknown action: ${context.action}`,
        };
    }

    // Log action
    this.logAction({
      action: context.action,
      targetId: report.targetId,
      targetType: report.targetType,
      executedBy: context.moderatorId,
      reason: context.notes || report.description,
      timestamp: context.timestamp,
      metadata: { reportId: report.id },
    });

    // Send notifications
    if (result.success && this.config.enableNotifications) {
      await this.sendActionNotifications(context, report, result);
    }

    return result;
  }

  /**
   * Approves a report (no action needed on content)
   */
  private async approveReport(
    context: ReportActionContext,
    report: Report,
  ): Promise<ActionResult> {
    const updateResult = this.queue.updateReport(
      report.id,
      {
        status: "resolved",
        resolution:
          context.notes || "Report reviewed and approved - no violations found",
      },
      context.moderatorId,
    );

    if (!updateResult.success) {
      return {
        success: false,
        reportId: report.id,
        action: "approve",
        newStatus: report.status,
        error: updateResult.error,
      };
    }

    return {
      success: true,
      reportId: report.id,
      action: "approve",
      newStatus: "resolved",
      message: "Report approved - no action taken",
    };
  }

  /**
   * Dismisses a report (invalid or duplicate)
   */
  private async dismissReport(
    context: ReportActionContext,
    report: Report,
  ): Promise<ActionResult> {
    const updateResult = this.queue.updateReport(
      report.id,
      {
        status: "dismissed",
        resolution: context.notes || "Report dismissed",
      },
      context.moderatorId,
    );

    if (!updateResult.success) {
      return {
        success: false,
        reportId: report.id,
        action: "dismiss",
        newStatus: report.status,
        error: updateResult.error,
      };
    }

    return {
      success: true,
      reportId: report.id,
      action: "dismiss",
      newStatus: "dismissed",
      message: "Report dismissed",
    };
  }

  /**
   * Escalates a report to higher priority
   */
  private async escalateReport(
    context: ReportActionContext,
    report: Report,
  ): Promise<ActionResult> {
    const newPriority: ReportPriority =
      report.priority === "low"
        ? "medium"
        : report.priority === "medium"
          ? "high"
          : "urgent";

    const updateResult = this.queue.updateReport(
      report.id,
      {
        status: "escalated",
        priority: newPriority,
      },
      context.moderatorId,
    );

    if (!updateResult.success) {
      return {
        success: false,
        reportId: report.id,
        action: "escalate",
        newStatus: report.status,
        error: updateResult.error,
      };
    }

    // Add escalation note
    this.queue.addNote(
      report.id,
      context.moderatorId,
      context.notes || `Escalated to ${newPriority} priority`,
      true,
      context.moderatorName,
    );

    return {
      success: true,
      reportId: report.id,
      action: "escalate",
      newStatus: "escalated",
      message: `Report escalated to ${newPriority} priority`,
    };
  }

  /**
   * Removes reported content
   */
  private async removeContent(
    context: ReportActionContext,
    report: Report,
  ): Promise<ActionResult> {
    // In a real implementation, this would call the appropriate API
    // to delete/hide the content (message, user profile, channel, etc.)

    const updateResult = this.queue.updateReport(
      report.id,
      {
        status: "resolved",
        resolution: "Content removed",
      },
      context.moderatorId,
    );

    if (!updateResult.success) {
      return {
        success: false,
        reportId: report.id,
        action: "remove-content",
        newStatus: report.status,
        error: updateResult.error,
      };
    }

    return {
      success: true,
      reportId: report.id,
      action: "remove-content",
      newStatus: "resolved",
      message: `${report.targetType} content removed`,
    };
  }

  /**
   * Warns a user
   */
  private async warnUser(
    context: ReportActionContext,
    report: Report,
  ): Promise<ActionResult> {
    // In a real implementation, this would send a warning notification
    // to the user and log it in their moderation history

    const updateResult = this.queue.updateReport(
      report.id,
      {
        status: "resolved",
        resolution: "User warned",
      },
      context.moderatorId,
    );

    if (!updateResult.success) {
      return {
        success: false,
        reportId: report.id,
        action: "warn-user",
        newStatus: report.status,
        error: updateResult.error,
      };
    }

    return {
      success: true,
      reportId: report.id,
      action: "warn-user",
      newStatus: "resolved",
      message: "User warned",
    };
  }

  /**
   * Mutes a user
   */
  private async muteUser(
    context: ReportActionContext,
    report: Report,
  ): Promise<ActionResult> {
    // In a real implementation, this would call the mute API

    const updateResult = this.queue.updateReport(
      report.id,
      {
        status: "resolved",
        resolution: "User muted",
      },
      context.moderatorId,
    );

    if (!updateResult.success) {
      return {
        success: false,
        reportId: report.id,
        action: "mute-user",
        newStatus: report.status,
        error: updateResult.error,
      };
    }

    return {
      success: true,
      reportId: report.id,
      action: "mute-user",
      newStatus: "resolved",
      message: "User muted",
    };
  }

  /**
   * Bans a user
   */
  private async banUser(
    context: ReportActionContext,
    report: Report,
  ): Promise<ActionResult> {
    // In a real implementation, this would call the ban API

    const updateResult = this.queue.updateReport(
      report.id,
      {
        status: "resolved",
        resolution: "User banned",
      },
      context.moderatorId,
    );

    if (!updateResult.success) {
      return {
        success: false,
        reportId: report.id,
        action: "ban-user",
        newStatus: report.status,
        error: updateResult.error,
      };
    }

    return {
      success: true,
      reportId: report.id,
      action: "ban-user",
      newStatus: "resolved",
      message: "User banned",
    };
  }

  /**
   * Assigns a report to a moderator
   */
  private async assignReport(
    context: ReportActionContext,
    report: Report,
  ): Promise<ActionResult> {
    const updateResult = this.queue.updateReport(
      report.id,
      {
        status: "in_review",
        assignedTo: context.moderatorId,
        assignedToName: context.moderatorName,
      },
      context.moderatorId,
    );

    if (!updateResult.success) {
      return {
        success: false,
        reportId: report.id,
        action: "assign",
        newStatus: report.status,
        error: updateResult.error,
      };
    }

    return {
      success: true,
      reportId: report.id,
      action: "assign",
      newStatus: "in_review",
      message: "Report assigned",
    };
  }

  /**
   * Resolves a report
   */
  private async resolveReport(
    context: ReportActionContext,
    report: Report,
  ): Promise<ActionResult> {
    const updateResult = this.queue.updateReport(
      report.id,
      {
        status: "resolved",
        resolution: context.notes || "Report resolved",
      },
      context.moderatorId,
    );

    if (!updateResult.success) {
      return {
        success: false,
        reportId: report.id,
        action: "resolve",
        newStatus: report.status,
        error: updateResult.error,
      };
    }

    return {
      success: true,
      reportId: report.id,
      action: "resolve",
      newStatus: "resolved",
      message: "Report resolved",
    };
  }

  /**
   * Checks if a report should be auto-escalated
   */
  private async checkEscalation(report: Report): Promise<void> {
    const rule = this.config.escalationRules.find(
      (r) => r.categoryId === report.categoryId,
    );

    if (!rule || !rule.autoEscalate) {
      return;
    }

    // Update priority
    this.queue.updateReport(
      report.id,
      {
        status: "escalated",
        priority: rule.escalateToPriority,
      },
      "system",
    );

    // Add escalation note
    this.queue.addNote(
      report.id,
      "system",
      `Auto-escalated to ${rule.escalateToPriority} priority based on category`,
      true,
      "System",
    );

    // Notify designated roles
    for (const role of rule.notifyRoles) {
      this.queueNotification({
        type: "in-app",
        recipient: role,
        subject: `Urgent Report: ${report.categoryName}`,
        body: `A ${report.targetType} has been reported for ${report.categoryName}. This report has been auto-escalated to ${rule.escalateToPriority} priority.`,
        priority: "high",
      });
    }
  }

  /**
   * Auto-moderates a report based on AI/rules
   */
  private async autoModerate(report: Report): Promise<void> {
    // This would integrate with AI moderation systems
    // For now, just a placeholder
  }

  /**
   * Sends notifications when a report is created
   */
  private async sendReportNotifications(
    report: Report,
    event: "created" | "updated" | "resolved",
  ): Promise<void> {
    // Notify moderators
    this.queueNotification({
      type: "in-app",
      recipient: "moderators",
      subject: `New Report: ${report.categoryName}`,
      body: `A ${report.targetType} has been reported. Priority: ${report.priority}`,
      priority: report.priority === "urgent" ? "high" : "normal",
    });

    // Notify reporter
    if (report.reporterId && event === "created") {
      this.queueNotification({
        type: "in-app",
        recipient: report.reporterId,
        subject: "Report Received",
        body: "Thank you for your report. Our moderation team will review it shortly.",
        priority: "normal",
      });
    }
  }

  /**
   * Sends notifications after an action
   */
  private async sendActionNotifications(
    context: ReportActionContext,
    report: Report,
    result: ActionResult,
  ): Promise<void> {
    // Notify reporter of resolution
    if (
      report.reporterId &&
      (result.newStatus === "resolved" || result.newStatus === "dismissed")
    ) {
      this.queueNotification({
        type: "in-app",
        recipient: report.reporterId,
        subject: "Report Update",
        body: `Your report has been ${result.newStatus}. ${result.message || ""}`,
        priority: "normal",
      });
    }
  }

  /**
   * Queues a notification for sending
   */
  private queueNotification(notification: Notification): void {
    if (this.config.notificationChannels.includes(notification.type)) {
      this.notificationQueue.push(notification);
    }
  }

  /**
   * Logs a moderation action
   */
  private logAction(action: ModerationAction): void {
    this.actionLog.push(action);
  }

  /**
   * Gets the report queue
   */
  getQueue(): ReportQueue {
    return this.queue;
  }

  /**
   * Gets action log
   */
  getActionLog(): ModerationAction[] {
    return [...this.actionLog];
  }

  /**
   * Gets pending notifications
   */
  getPendingNotifications(): Notification[] {
    return [...this.notificationQueue];
  }

  /**
   * Clears notification queue
   */
  clearNotifications(): void {
    this.notificationQueue = [];
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<ReportHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current configuration
   */
  getConfig(): ReportHandlerConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a report handler with default configuration
 */
export function createReportHandler(
  config?: Partial<ReportHandlerConfig>,
): ReportHandler {
  return new ReportHandler(config);
}

/**
 * Creates a report action context
 */
export function createActionContext(
  reportId: string,
  moderatorId: string,
  action: ReportAction,
  options?: {
    moderatorName?: string;
    notes?: string;
  },
): ReportActionContext {
  return {
    reportId,
    moderatorId,
    moderatorName: options?.moderatorName,
    action,
    notes: options?.notes,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Export Default Instance
// ============================================================================

export const defaultReportHandler = createReportHandler();
