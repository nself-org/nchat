/**
 * Compliance Report Generator
 *
 * Utilities for generating compliance reports and audit documentation.
 */

import type {
  ComplianceReport,
  ComplianceReportType,
  ReportSchedule,
  RetentionPolicy,
  DataExportRequest,
  DataDeletionRequest,
  LegalHold,
  UserConsent,
  ComplianceAuditEntry,
} from "./compliance-types";

// ============================================================================
// REPORT TYPE CONFIGURATIONS
// ============================================================================

export const REPORT_TYPE_CONFIGS: {
  type: ComplianceReportType;
  name: string;
  description: string;
  category: "retention" | "privacy" | "audit" | "compliance";
  availableFormats: ("pdf" | "csv" | "json" | "html")[];
}[] = [
  {
    type: "retention_summary",
    name: "Retention Summary",
    description: "Overview of data retention policies and enforcement",
    category: "retention",
    availableFormats: ["pdf", "csv", "json"],
  },
  {
    type: "deletion_audit",
    name: "Deletion Audit",
    description: "Audit trail of data deletion requests and actions",
    category: "audit",
    availableFormats: ["pdf", "csv", "json"],
  },
  {
    type: "export_audit",
    name: "Export Audit",
    description: "Audit trail of data export requests",
    category: "audit",
    availableFormats: ["pdf", "csv", "json"],
  },
  {
    type: "consent_status",
    name: "Consent Status",
    description: "Current consent status across all users",
    category: "privacy",
    availableFormats: ["pdf", "csv", "json"],
  },
  {
    type: "access_audit",
    name: "Access Audit",
    description: "Audit trail of data access events",
    category: "audit",
    availableFormats: ["pdf", "csv", "json"],
  },
  {
    type: "legal_hold_summary",
    name: "Legal Hold Summary",
    description: "Overview of active and historical legal holds",
    category: "compliance",
    availableFormats: ["pdf", "csv", "json"],
  },
  {
    type: "data_inventory",
    name: "Data Inventory",
    description: "Inventory of all data categories and their locations",
    category: "compliance",
    availableFormats: ["pdf", "csv", "json"],
  },
  {
    type: "breach_report",
    name: "Breach Report",
    description: "Data breach incident documentation",
    category: "compliance",
    availableFormats: ["pdf", "json"],
  },
  {
    type: "compliance_overview",
    name: "Compliance Overview",
    description: "High-level compliance status dashboard",
    category: "compliance",
    availableFormats: ["pdf", "html"],
  },
  {
    type: "gdpr_compliance",
    name: "GDPR Compliance",
    description: "GDPR-specific compliance assessment",
    category: "compliance",
    availableFormats: ["pdf", "json"],
  },
  {
    type: "ccpa_compliance",
    name: "CCPA Compliance",
    description: "CCPA-specific compliance assessment",
    category: "compliance",
    availableFormats: ["pdf", "json"],
  },
  {
    type: "hipaa_compliance",
    name: "HIPAA Compliance",
    description: "HIPAA-specific compliance assessment",
    category: "compliance",
    availableFormats: ["pdf", "json"],
  },
];

// ============================================================================
// REPORT CREATION
// ============================================================================

/**
 * Create a new compliance report
 */
export function createReport(
  type: ComplianceReportType,
  generatedBy: string,
  options: {
    name?: string;
    description?: string;
    dateRangeStart?: Date;
    dateRangeEnd?: Date;
    format?: ComplianceReport["format"];
    parameters?: Record<string, unknown>;
  } = {},
): ComplianceReport {
  const config = REPORT_TYPE_CONFIGS.find((c) => c.type === type);
  const now = new Date();

  // Default date range is last 30 days
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 30);

  return {
    id: crypto.randomUUID(),
    type,
    name: options.name || config?.name || type,
    description: options.description || config?.description,
    generatedAt: now,
    generatedBy,
    dateRangeStart: options.dateRangeStart || defaultStart,
    dateRangeEnd: options.dateRangeEnd || now,
    format: options.format || "pdf",
    parameters: options.parameters,
    status: "pending",
  };
}

// ============================================================================
// REPORT SCHEDULING
// ============================================================================

/**
 * Create a report schedule
 */
export function createReportSchedule(
  reportType: ComplianceReportType,
  options: {
    name?: string;
    frequency: ReportSchedule["frequency"];
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
    timezone?: string;
    recipients: string[];
    format?: ComplianceReport["format"];
  },
): ReportSchedule {
  const config = REPORT_TYPE_CONFIGS.find((c) => c.type === reportType);

  return {
    id: crypto.randomUUID(),
    reportType,
    name: options.name || `Scheduled ${config?.name || reportType}`,
    frequency: options.frequency,
    dayOfWeek: options.dayOfWeek,
    dayOfMonth: options.dayOfMonth,
    time: options.time || "09:00",
    timezone:
      options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    enabled: true,
    recipients: options.recipients,
    format: options.format || "pdf",
    nextRunAt: calculateNextScheduledRun(options),
  };
}

/**
 * Calculate next scheduled run time
 */
export function calculateNextScheduledRun(schedule: {
  frequency: ReportSchedule["frequency"];
  dayOfWeek?: number;
  dayOfMonth?: number;
  time?: string;
}): Date {
  const now = new Date();
  const [hours, minutes] = (schedule.time || "09:00").split(":").map(Number);

  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  switch (schedule.frequency) {
    case "daily":
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case "weekly":
      const targetDay = schedule.dayOfWeek || 1; // Default Monday
      const currentDay = next.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0 || (daysUntil === 0 && next <= now)) {
        daysUntil += 7;
      }
      next.setDate(next.getDate() + daysUntil);
      break;

    case "monthly":
      const targetDate = schedule.dayOfMonth || 1;
      next.setDate(targetDate);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;

    case "quarterly":
      const currentMonth = now.getMonth();
      const nextQuarterMonth = Math.ceil((currentMonth + 1) / 3) * 3;
      next.setMonth(nextQuarterMonth);
      next.setDate(schedule.dayOfMonth || 1);
      if (next <= now) {
        next.setMonth(next.getMonth() + 3);
      }
      break;

    case "annually":
      next.setMonth(0); // January
      next.setDate(schedule.dayOfMonth || 1);
      if (next <= now) {
        next.setFullYear(next.getFullYear() + 1);
      }
      break;
  }

  return next;
}

// ============================================================================
// REPORT DATA GENERATORS
// ============================================================================

export interface RetentionSummaryData {
  totalPolicies: number;
  activePolicies: number;
  policiesByCategory: Record<string, number>;
  dataDeletedLast30Days: {
    messages: number;
    files: number;
    reactions: number;
    total: number;
  };
  upcomingDeletions: {
    next7Days: number;
    next30Days: number;
    next90Days: number;
  };
}

/**
 * Generate retention summary data
 */
export function generateRetentionSummaryData(
  policies: RetentionPolicy[],
  deletionStats: {
    messages: number;
    files: number;
    reactions: number;
  },
): RetentionSummaryData {
  const policiesByCategory: Record<string, number> = {};

  for (const policy of policies) {
    const cat = policy.dataCategory;
    policiesByCategory[cat] = (policiesByCategory[cat] || 0) + 1;
  }

  return {
    totalPolicies: policies.length,
    activePolicies: policies.filter((p) => p.enabled).length,
    policiesByCategory,
    dataDeletedLast30Days: {
      ...deletionStats,
      total:
        deletionStats.messages + deletionStats.files + deletionStats.reactions,
    },
    upcomingDeletions: {
      next7Days: 0, // Would be calculated from actual data
      next30Days: 0,
      next90Days: 0,
    },
  };
}

export interface ConsentStatusData {
  totalUsers: number;
  consentsByType: Record<
    string,
    {
      granted: number;
      denied: number;
      pending: number;
      percentage: number;
    }
  >;
  recentChanges: {
    last7Days: number;
    last30Days: number;
  };
  complianceRate: number;
}

/**
 * Generate consent status data
 */
export function generateConsentStatusData(
  consents: UserConsent[],
  totalUsers: number,
): ConsentStatusData {
  const consentsByType: ConsentStatusData["consentsByType"] = {};

  for (const consent of consents) {
    if (!consentsByType[consent.consentType]) {
      consentsByType[consent.consentType] = {
        granted: 0,
        denied: 0,
        pending: 0,
        percentage: 0,
      };
    }

    const typeData = consentsByType[consent.consentType];
    switch (consent.status) {
      case "granted":
        typeData.granted++;
        break;
      case "denied":
        typeData.denied++;
        break;
      case "pending":
        typeData.pending++;
        break;
    }

    typeData.percentage =
      totalUsers > 0 ? Math.round((typeData.granted / totalUsers) * 100) : 0;
  }

  // Calculate overall compliance rate
  const totalGranted = Object.values(consentsByType).reduce(
    (sum, t) => sum + t.granted,
    0,
  );
  const totalRecords = consents.length;
  const complianceRate =
    totalRecords > 0 ? Math.round((totalGranted / totalRecords) * 100) : 0;

  return {
    totalUsers,
    consentsByType,
    recentChanges: {
      last7Days: 0, // Would be calculated from actual data
      last30Days: 0,
    },
    complianceRate,
  };
}

export interface LegalHoldSummaryData {
  totalHolds: number;
  activeHolds: number;
  releasedHolds: number;
  holdsByStatus: Record<string, number>;
  totalCustodians: number;
  averageHoldDuration: number; // in days
}

/**
 * Generate legal hold summary data
 */
export function generateLegalHoldSummaryData(
  holds: LegalHold[],
): LegalHoldSummaryData {
  const holdsByStatus: Record<string, number> = {};
  let totalCustodians = 0;
  let totalDuration = 0;
  let completedHolds = 0;

  for (const hold of holds) {
    holdsByStatus[hold.status] = (holdsByStatus[hold.status] || 0) + 1;
    totalCustodians += hold.custodians.length;

    if (hold.status === "released" && hold.releasedAt) {
      const duration = Math.floor(
        (new Date(hold.releasedAt).getTime() -
          new Date(hold.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      totalDuration += duration;
      completedHolds++;
    }
  }

  return {
    totalHolds: holds.length,
    activeHolds: holdsByStatus["active"] || 0,
    releasedHolds: holdsByStatus["released"] || 0,
    holdsByStatus,
    totalCustodians,
    averageHoldDuration:
      completedHolds > 0 ? Math.round(totalDuration / completedHolds) : 0,
  };
}

// ============================================================================
// AUDIT LOG HELPERS
// ============================================================================

/**
 * Filter audit entries by date range
 */
export function filterAuditEntries(
  entries: ComplianceAuditEntry[],
  startDate: Date,
  endDate: Date,
): ComplianceAuditEntry[] {
  return entries.filter((entry) => {
    const timestamp = new Date(entry.timestamp);
    return timestamp >= startDate && timestamp <= endDate;
  });
}

/**
 * Group audit entries by action
 */
export function groupAuditEntriesByAction(
  entries: ComplianceAuditEntry[],
): Record<string, ComplianceAuditEntry[]> {
  const grouped: Record<string, ComplianceAuditEntry[]> = {};

  for (const entry of entries) {
    if (!grouped[entry.action]) {
      grouped[entry.action] = [];
    }
    grouped[entry.action].push(entry);
  }

  return grouped;
}

/**
 * Calculate audit statistics
 */
export function calculateAuditStatistics(entries: ComplianceAuditEntry[]): {
  totalEntries: number;
  successRate: number;
  entriesByDay: Record<string, number>;
  topActions: { action: string; count: number }[];
} {
  const entriesByDay: Record<string, number> = {};
  const actionCounts: Record<string, number> = {};
  let successCount = 0;

  for (const entry of entries) {
    // Count by day
    const day = new Date(entry.timestamp).toISOString().split("T")[0];
    entriesByDay[day] = (entriesByDay[day] || 0) + 1;

    // Count by action
    actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;

    // Count successes
    if (entry.success) successCount++;
  }

  // Get top actions
  const topActions = Object.entries(actionCounts)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalEntries: entries.length,
    successRate:
      entries.length > 0
        ? Math.round((successCount / entries.length) * 100)
        : 100,
    entriesByDay,
    topActions,
  };
}

// ============================================================================
// REPORT FORMATTING
// ============================================================================

/**
 * Format report for display
 */
export function formatReportStatus(status: ComplianceReport["status"]): {
  label: string;
  color: string;
  icon: string;
} {
  const statusMap: Record<
    ComplianceReport["status"],
    { label: string; color: string; icon: string }
  > = {
    pending: { label: "Pending", color: "yellow", icon: "clock" },
    generating: { label: "Generating", color: "blue", icon: "loader" },
    completed: { label: "Completed", color: "green", icon: "check" },
    failed: { label: "Failed", color: "red", icon: "x" },
  };

  return statusMap[status];
}

/**
 * Get report type configuration
 */
export function getReportTypeConfig(type: ComplianceReportType) {
  return REPORT_TYPE_CONFIGS.find((c) => c.type === type);
}

// ============================================================================
// EXPORT
// ============================================================================

export const ComplianceReportService = {
  REPORT_TYPE_CONFIGS,
  createReport,
  createReportSchedule,
  calculateNextScheduledRun,
  generateRetentionSummaryData,
  generateConsentStatusData,
  generateLegalHoldSummaryData,
  filterAuditEntries,
  groupAuditEntriesByAction,
  calculateAuditStatistics,
  formatReportStatus,
  getReportTypeConfig,
};
