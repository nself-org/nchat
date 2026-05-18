/**
 * Report System - User reporting functionality
 *
 * Provides report creation, categorization, queue management, and status tracking
 */

// ============================================================================
// Types
// ============================================================================

export type ReportStatus =
  | "pending"
  | "in_review"
  | "resolved"
  | "dismissed"
  | "escalated";
export type ReportPriority = "low" | "medium" | "high" | "urgent";
export type ReportTargetType = "user" | "message" | "channel" | "other";

export interface ReportCategory {
  id: string;
  name: string;
  description: string;
  priority: ReportPriority;
  requiresEvidence: boolean;
  autoEscalate: boolean;
  enabled: boolean;
}

export interface ReportEvidence {
  id: string;
  type: "screenshot" | "link" | "text" | "file";
  content: string;
  description?: string;
  addedAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName?: string;
  targetType: ReportTargetType;
  targetId: string;
  targetName?: string;
  categoryId: string;
  categoryName?: string;
  description: string;
  evidence: ReportEvidence[];
  status: ReportStatus;
  priority: ReportPriority;
  assignedTo?: string;
  assignedToName?: string;
  notes: ReportNote[];
  resolution?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ReportNote {
  id: string;
  authorId: string;
  authorName?: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface ReportFilter {
  status?: ReportStatus | ReportStatus[];
  priority?: ReportPriority | ReportPriority[];
  categoryId?: string;
  targetType?: ReportTargetType;
  reporterId?: string;
  targetId?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReportStats {
  total: number;
  byStatus: Record<ReportStatus, number>;
  byPriority: Record<ReportPriority, number>;
  byCategory: Record<string, number>;
  averageResolutionTimeMs: number;
  resolvedToday: number;
  pendingCount: number;
}

export interface CreateReportInput {
  reporterId: string;
  reporterName?: string;
  targetType: ReportTargetType;
  targetId: string;
  targetName?: string;
  categoryId: string;
  description: string;
  evidence?: Omit<ReportEvidence, "id" | "addedAt">[];
  metadata?: Record<string, unknown>;
}

export interface UpdateReportInput {
  status?: ReportStatus;
  priority?: ReportPriority;
  assignedTo?: string;
  assignedToName?: string;
  resolution?: string;
}

export interface ReportSystemConfig {
  maxEvidencePerReport: number;
  maxDescriptionLength: number;
  allowAnonymousReports: boolean;
  autoAssignEnabled: boolean;
  autoAssignRoles: string[];
  duplicateCheckEnabled: boolean;
  duplicateWindowMs: number;
  categories: ReportCategory[];
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: "spam",
    name: "Spam",
    description: "Unsolicited advertising or repeated messages",
    priority: "low",
    requiresEvidence: false,
    autoEscalate: false,
    enabled: true,
  },
  {
    id: "harassment",
    name: "Harassment",
    description: "Targeted harassment or bullying",
    priority: "high",
    requiresEvidence: true,
    autoEscalate: true,
    enabled: true,
  },
  {
    id: "hate-speech",
    name: "Hate Speech",
    description: "Content promoting hatred against protected groups",
    priority: "urgent",
    requiresEvidence: true,
    autoEscalate: true,
    enabled: true,
  },
  {
    id: "inappropriate-content",
    name: "Inappropriate Content",
    description: "NSFW or inappropriate material",
    priority: "medium",
    requiresEvidence: true,
    autoEscalate: false,
    enabled: true,
  },
  {
    id: "impersonation",
    name: "Impersonation",
    description: "Pretending to be another user or entity",
    priority: "high",
    requiresEvidence: true,
    autoEscalate: true,
    enabled: true,
  },
  {
    id: "scam",
    name: "Scam/Fraud",
    description: "Fraudulent activity or scam attempts",
    priority: "urgent",
    requiresEvidence: true,
    autoEscalate: true,
    enabled: true,
  },
  {
    id: "other",
    name: "Other",
    description: "Issues not covered by other categories",
    priority: "low",
    requiresEvidence: false,
    autoEscalate: false,
    enabled: true,
  },
];

export const DEFAULT_REPORT_CONFIG: ReportSystemConfig = {
  maxEvidencePerReport: 5,
  maxDescriptionLength: 2000,
  allowAnonymousReports: false,
  autoAssignEnabled: false,
  autoAssignRoles: ["moderator", "admin"],
  duplicateCheckEnabled: true,
  duplicateWindowMs: 3600000, // 1 hour
  categories: DEFAULT_REPORT_CATEGORIES,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a unique ID
 */
export function generateReportId(): string {
  return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique evidence ID
 */
export function generateEvidenceId(): string {
  return `evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique note ID
 */
export function generateNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates report input
 */
export function validateReportInput(
  input: CreateReportInput,
  config: ReportSystemConfig,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.reporterId && !config.allowAnonymousReports) {
    errors.push("Reporter ID is required");
  }

  if (!input.targetId) {
    errors.push("Target ID is required");
  }

  if (!input.categoryId) {
    errors.push("Category is required");
  } else {
    const category = config.categories.find((c) => c.id === input.categoryId);
    if (!category) {
      errors.push("Invalid category");
    } else if (!category.enabled) {
      errors.push("Category is disabled");
    } else if (
      category.requiresEvidence &&
      (!input.evidence || input.evidence.length === 0)
    ) {
      errors.push("Evidence is required for this category");
    }
  }

  if (!input.description || input.description.trim().length === 0) {
    errors.push("Description is required");
  } else if (input.description.length > config.maxDescriptionLength) {
    errors.push(
      `Description exceeds maximum length of ${config.maxDescriptionLength}`,
    );
  }

  if (input.evidence && input.evidence.length > config.maxEvidencePerReport) {
    errors.push(
      `Maximum ${config.maxEvidencePerReport} evidence items allowed`,
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculates priority based on category and other factors
 */
export function calculatePriority(
  category: ReportCategory,
  targetType: ReportTargetType,
  evidenceCount: number,
): ReportPriority {
  let priority = category.priority;

  // Boost priority for urgent target types
  if (targetType === "channel" && priority !== "urgent") {
    const priorityOrder: ReportPriority[] = ["low", "medium", "high", "urgent"];
    const currentIndex = priorityOrder.indexOf(priority);
    if (currentIndex < priorityOrder.length - 1) {
      priority = priorityOrder[currentIndex + 1];
    }
  }

  // Boost priority if multiple evidence items
  if (evidenceCount >= 3 && priority !== "urgent") {
    const priorityOrder: ReportPriority[] = ["low", "medium", "high", "urgent"];
    const currentIndex = priorityOrder.indexOf(priority);
    if (currentIndex < priorityOrder.length - 1) {
      priority = priorityOrder[currentIndex + 1];
    }
  }

  return priority;
}

/**
 * Checks if two reports are potential duplicates
 */
export function isDuplicateReport(
  existing: Report,
  newReport: CreateReportInput,
  windowMs: number,
): boolean {
  const existingTime = new Date(existing.createdAt).getTime();
  const now = Date.now();

  if (now - existingTime > windowMs) {
    return false;
  }

  return (
    existing.reporterId === newReport.reporterId &&
    existing.targetId === newReport.targetId &&
    existing.categoryId === newReport.categoryId
  );
}

// ============================================================================
// Report Queue Class
// ============================================================================

export class ReportQueue {
  private reports: Map<string, Report>;
  private config: ReportSystemConfig;
  private moderatorAssignments: Map<string, string[]>; // moderatorId -> reportIds

  constructor(config: Partial<ReportSystemConfig> = {}) {
    this.reports = new Map();
    this.config = { ...DEFAULT_REPORT_CONFIG, ...config };
    this.moderatorAssignments = new Map();
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<ReportSystemConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current configuration
   */
  getConfig(): ReportSystemConfig {
    return { ...this.config };
  }

  /**
   * Gets a category by ID
   */
  getCategory(categoryId: string): ReportCategory | undefined {
    return this.config.categories.find((c) => c.id === categoryId);
  }

  /**
   * Gets all enabled categories
   */
  getCategories(): ReportCategory[] {
    return this.config.categories.filter((c) => c.enabled);
  }

  /**
   * Adds a new category
   */
  addCategory(category: ReportCategory): void {
    const existingIndex = this.config.categories.findIndex(
      (c) => c.id === category.id,
    );
    if (existingIndex >= 0) {
      this.config.categories[existingIndex] = category;
    } else {
      this.config.categories.push(category);
    }
  }

  /**
   * Removes a category
   */
  removeCategory(categoryId: string): boolean {
    const index = this.config.categories.findIndex((c) => c.id === categoryId);
    if (index >= 0) {
      this.config.categories.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Creates a new report
   */
  createReport(input: CreateReportInput): {
    success: boolean;
    report?: Report;
    errors?: string[];
  } {
    // Validate input
    const validation = validateReportInput(input, this.config);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Check for duplicates
    if (this.config.duplicateCheckEnabled) {
      const existingReports = Array.from(this.reports.values());
      const duplicate = existingReports.find((r) =>
        isDuplicateReport(r, input, this.config.duplicateWindowMs),
      );
      if (duplicate) {
        return { success: false, errors: ["Duplicate report detected"] };
      }
    }

    // Get category
    const category = this.getCategory(input.categoryId)!;

    // Create evidence with IDs
    const evidence: ReportEvidence[] = (input.evidence || []).map((e) => ({
      ...e,
      id: generateEvidenceId(),
      addedAt: new Date().toISOString(),
    }));

    // Calculate priority
    const priority = calculatePriority(
      category,
      input.targetType,
      evidence.length,
    );

    // Create report
    const now = new Date().toISOString();
    const report: Report = {
      id: generateReportId(),
      reporterId: input.reporterId,
      reporterName: input.reporterName,
      targetType: input.targetType,
      targetId: input.targetId,
      targetName: input.targetName,
      categoryId: input.categoryId,
      categoryName: category.name,
      description: input.description.trim(),
      evidence,
      status: category.autoEscalate ? "escalated" : "pending",
      priority,
      notes: [],
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    };

    this.reports.set(report.id, report);

    // Auto-assign if enabled
    if (this.config.autoAssignEnabled && !category.autoEscalate) {
      this.autoAssignReport(report.id);
    }

    return { success: true, report };
  }

  /**
   * Gets a report by ID
   */
  getReport(reportId: string): Report | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Updates a report
   */
  updateReport(
    reportId: string,
    updates: UpdateReportInput,
    updatedBy: string,
  ): { success: boolean; report?: Report; error?: string } {
    const report = this.reports.get(reportId);
    if (!report) {
      return { success: false, error: "Report not found" };
    }

    // Apply updates
    if (updates.status !== undefined) {
      report.status = updates.status;
      if (updates.status === "resolved" || updates.status === "dismissed") {
        report.resolvedBy = updatedBy;
        report.resolvedAt = new Date().toISOString();
      }
    }
    if (updates.priority !== undefined) {
      report.priority = updates.priority;
    }
    if (updates.assignedTo !== undefined) {
      // Update moderator assignments
      if (report.assignedTo) {
        this.removeModeratorAssignment(report.assignedTo, reportId);
      }
      report.assignedTo = updates.assignedTo;
      report.assignedToName = updates.assignedToName;
      if (updates.assignedTo) {
        this.addModeratorAssignment(updates.assignedTo, reportId);
      }
    }
    if (updates.resolution !== undefined) {
      report.resolution = updates.resolution;
    }

    report.updatedAt = new Date().toISOString();

    return { success: true, report };
  }

  /**
   * Adds a note to a report
   */
  addNote(
    reportId: string,
    authorId: string,
    content: string,
    isInternal: boolean = false,
    authorName?: string,
  ): { success: boolean; note?: ReportNote; error?: string } {
    const report = this.reports.get(reportId);
    if (!report) {
      return { success: false, error: "Report not found" };
    }

    const note: ReportNote = {
      id: generateNoteId(),
      authorId,
      authorName,
      content: content.trim(),
      isInternal,
      createdAt: new Date().toISOString(),
    };

    report.notes.push(note);
    report.updatedAt = new Date().toISOString();

    return { success: true, note };
  }

  /**
   * Adds evidence to a report
   */
  addEvidence(
    reportId: string,
    evidence: Omit<ReportEvidence, "id" | "addedAt">,
  ): { success: boolean; evidence?: ReportEvidence; error?: string } {
    const report = this.reports.get(reportId);
    if (!report) {
      return { success: false, error: "Report not found" };
    }

    if (report.evidence.length >= this.config.maxEvidencePerReport) {
      return { success: false, error: "Maximum evidence limit reached" };
    }

    const newEvidence: ReportEvidence = {
      ...evidence,
      id: generateEvidenceId(),
      addedAt: new Date().toISOString(),
    };

    report.evidence.push(newEvidence);
    report.updatedAt = new Date().toISOString();

    return { success: true, evidence: newEvidence };
  }

  /**
   * Removes evidence from a report
   */
  removeEvidence(reportId: string, evidenceId: string): boolean {
    const report = this.reports.get(reportId);
    if (!report) return false;

    const index = report.evidence.findIndex((e) => e.id === evidenceId);
    if (index >= 0) {
      report.evidence.splice(index, 1);
      report.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Gets reports matching a filter
   */
  getReports(filter: ReportFilter = {}): Report[] {
    let reports = Array.from(this.reports.values());

    if (filter.status) {
      const statuses = Array.isArray(filter.status)
        ? filter.status
        : [filter.status];
      reports = reports.filter((r) => statuses.includes(r.status));
    }

    if (filter.priority) {
      const priorities = Array.isArray(filter.priority)
        ? filter.priority
        : [filter.priority];
      reports = reports.filter((r) => priorities.includes(r.priority));
    }

    if (filter.categoryId) {
      reports = reports.filter((r) => r.categoryId === filter.categoryId);
    }

    if (filter.targetType) {
      reports = reports.filter((r) => r.targetType === filter.targetType);
    }

    if (filter.reporterId) {
      reports = reports.filter((r) => r.reporterId === filter.reporterId);
    }

    if (filter.targetId) {
      reports = reports.filter((r) => r.targetId === filter.targetId);
    }

    if (filter.assignedTo) {
      reports = reports.filter((r) => r.assignedTo === filter.assignedTo);
    }

    if (filter.startDate) {
      const start = new Date(filter.startDate).getTime();
      reports = reports.filter((r) => new Date(r.createdAt).getTime() >= start);
    }

    if (filter.endDate) {
      const end = new Date(filter.endDate).getTime();
      reports = reports.filter((r) => new Date(r.createdAt).getTime() <= end);
    }

    // Sort by priority (urgent first) then by date (newest first)
    const priorityOrder: Record<ReportPriority, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    reports.sort((a, b) => {
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return reports;
  }

  /**
   * Gets pending reports (queue)
   */
  getPendingReports(): Report[] {
    return this.getReports({ status: ["pending", "in_review", "escalated"] });
  }

  /**
   * Gets reports assigned to a moderator
   */
  getModeratorReports(moderatorId: string): Report[] {
    return this.getReports({ assignedTo: moderatorId });
  }

  /**
   * Gets reports about a specific target
   */
  getTargetReports(targetId: string, targetType?: ReportTargetType): Report[] {
    return this.getReports({ targetId, targetType });
  }

  /**
   * Calculates statistics
   */
  getStats(): ReportStats {
    const reports = Array.from(this.reports.values());
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);

    const stats: ReportStats = {
      total: reports.length,
      byStatus: {
        pending: 0,
        in_review: 0,
        resolved: 0,
        dismissed: 0,
        escalated: 0,
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
      byCategory: {},
      averageResolutionTimeMs: 0,
      resolvedToday: 0,
      pendingCount: 0,
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const report of reports) {
      stats.byStatus[report.status]++;
      stats.byPriority[report.priority]++;
      stats.byCategory[report.categoryId] =
        (stats.byCategory[report.categoryId] || 0) + 1;

      if (["pending", "in_review", "escalated"].includes(report.status)) {
        stats.pendingCount++;
      }

      if (report.resolvedAt) {
        const resolutionTime =
          new Date(report.resolvedAt).getTime() -
          new Date(report.createdAt).getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;

        if (new Date(report.resolvedAt).getTime() >= todayStart) {
          stats.resolvedToday++;
        }
      }
    }

    if (resolvedCount > 0) {
      stats.averageResolutionTimeMs = totalResolutionTime / resolvedCount;
    }

    return stats;
  }

  /**
   * Auto-assigns a report to a moderator
   */
  private autoAssignReport(reportId: string): void {
    // Simple round-robin assignment (in real implementation, would consider workload)
    // This is a placeholder - actual implementation would need moderator list
  }

  /**
   * Adds a report to a moderator's assignment list
   */
  private addModeratorAssignment(moderatorId: string, reportId: string): void {
    const assignments = this.moderatorAssignments.get(moderatorId) || [];
    if (!assignments.includes(reportId)) {
      assignments.push(reportId);
      this.moderatorAssignments.set(moderatorId, assignments);
    }
  }

  /**
   * Removes a report from a moderator's assignment list
   */
  private removeModeratorAssignment(
    moderatorId: string,
    reportId: string,
  ): void {
    const assignments = this.moderatorAssignments.get(moderatorId);
    if (assignments) {
      const index = assignments.indexOf(reportId);
      if (index >= 0) {
        assignments.splice(index, 1);
      }
    }
  }

  /**
   * Deletes a report
   */
  deleteReport(reportId: string): boolean {
    const report = this.reports.get(reportId);
    if (report) {
      if (report.assignedTo) {
        this.removeModeratorAssignment(report.assignedTo, reportId);
      }
      return this.reports.delete(reportId);
    }
    return false;
  }

  /**
   * Clears all reports
   */
  clearAll(): void {
    this.reports.clear();
    this.moderatorAssignments.clear();
  }

  /**
   * Gets total report count
   */
  getCount(): number {
    return this.reports.size;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a report queue with default configuration
 */
export function createReportQueue(
  config?: Partial<ReportSystemConfig>,
): ReportQueue {
  return new ReportQueue(config);
}

/**
 * Creates a report input helper
 */
export function createReportInput(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  categoryId: string,
  description: string,
  options?: {
    reporterName?: string;
    targetName?: string;
    evidence?: Omit<ReportEvidence, "id" | "addedAt">[];
    metadata?: Record<string, unknown>;
  },
): CreateReportInput {
  return {
    reporterId,
    targetType,
    targetId,
    categoryId,
    description,
    ...options,
  };
}

// ============================================================================
// Export Default Instance
// ============================================================================

export const defaultReportQueue = createReportQueue();
