/**
 * GDPR Compliance Helpers
 *
 * Utilities for General Data Protection Regulation (EU) compliance.
 */

import type {
  DataExportRequest,
  DataDeletionRequest,
  UserConsent,
  PrivacySettings,
  ComplianceAuditEntry,
} from "./compliance-types";

// ============================================================================
// GDPR RIGHTS
// ============================================================================

export const GDPR_RIGHTS = {
  ACCESS: {
    article: "Article 15",
    name: "Right of Access",
    description:
      "The right to obtain confirmation of whether personal data is being processed and access to that data.",
    timeLimit: 30, // days
  },
  RECTIFICATION: {
    article: "Article 16",
    name: "Right to Rectification",
    description: "The right to have inaccurate personal data corrected.",
    timeLimit: 30,
  },
  ERASURE: {
    article: "Article 17",
    name: "Right to Erasure (Right to be Forgotten)",
    description:
      "The right to have personal data erased under certain circumstances.",
    timeLimit: 30,
  },
  RESTRICTION: {
    article: "Article 18",
    name: "Right to Restriction of Processing",
    description: "The right to restrict processing of personal data.",
    timeLimit: 30,
  },
  PORTABILITY: {
    article: "Article 20",
    name: "Right to Data Portability",
    description:
      "The right to receive personal data in a structured, commonly used format.",
    timeLimit: 30,
  },
  OBJECTION: {
    article: "Article 21",
    name: "Right to Object",
    description:
      "The right to object to processing based on legitimate interests.",
    timeLimit: 30,
  },
  AUTOMATED_DECISIONS: {
    article: "Article 22",
    name: "Rights Related to Automated Decision Making",
    description:
      "The right not to be subject to automated decision-making including profiling.",
    timeLimit: 30,
  },
} as const;

export type GDPRRight = keyof typeof GDPR_RIGHTS;

// ============================================================================
// LAWFUL BASIS FOR PROCESSING
// ============================================================================

export const LAWFUL_BASIS = {
  CONSENT: {
    article: "Article 6(1)(a)",
    name: "Consent",
    description: "The data subject has given consent to the processing.",
    requiresDocumentation: true,
    canBeWithdrawn: true,
  },
  CONTRACT: {
    article: "Article 6(1)(b)",
    name: "Contract",
    description: "Processing is necessary for the performance of a contract.",
    requiresDocumentation: true,
    canBeWithdrawn: false,
  },
  LEGAL_OBLIGATION: {
    article: "Article 6(1)(c)",
    name: "Legal Obligation",
    description:
      "Processing is necessary for compliance with a legal obligation.",
    requiresDocumentation: true,
    canBeWithdrawn: false,
  },
  VITAL_INTERESTS: {
    article: "Article 6(1)(d)",
    name: "Vital Interests",
    description: "Processing is necessary to protect vital interests.",
    requiresDocumentation: true,
    canBeWithdrawn: false,
  },
  PUBLIC_TASK: {
    article: "Article 6(1)(e)",
    name: "Public Task",
    description: "Processing is necessary for a task in the public interest.",
    requiresDocumentation: true,
    canBeWithdrawn: false,
  },
  LEGITIMATE_INTERESTS: {
    article: "Article 6(1)(f)",
    name: "Legitimate Interests",
    description: "Processing is necessary for legitimate interests.",
    requiresDocumentation: true,
    canBeWithdrawn: true,
  },
} as const;

export type LawfulBasis = keyof typeof LAWFUL_BASIS;

// ============================================================================
// GDPR COMPLIANCE CHECKS
// ============================================================================

export interface GDPRComplianceCheck {
  id: string;
  name: string;
  description: string;
  category: "consent" | "rights" | "security" | "documentation" | "breach";
  check: (data: GDPRComplianceData) => GDPRCheckResult;
}

export interface GDPRComplianceData {
  consents: UserConsent[];
  exportRequests: DataExportRequest[];
  deletionRequests: DataDeletionRequest[];
  privacySettings: PrivacySettings | null;
  auditLogs: ComplianceAuditEntry[];
  hasPrivacyPolicy: boolean;
  hasDPO: boolean;
  hasBreachProcedure: boolean;
  hasDataProcessingRecords: boolean;
}

export interface GDPRCheckResult {
  passed: boolean;
  status: "pass" | "fail" | "warning" | "not_applicable";
  message: string;
  recommendations?: string[];
  evidence?: string[];
}

export const GDPR_COMPLIANCE_CHECKS: GDPRComplianceCheck[] = [
  {
    id: "consent_documented",
    name: "Consent Documentation",
    description: "All consents must be documented with timestamp and scope",
    category: "consent",
    check: (data) => {
      const documentedConsents = data.consents.filter(
        (c) => c.grantedAt || c.revokedAt,
      );
      const passed = documentedConsents.length === data.consents.length;
      return {
        passed,
        status: passed ? "pass" : "fail",
        message: passed
          ? "All consents are properly documented"
          : "Some consents lack proper documentation",
        recommendations: passed
          ? undefined
          : ["Ensure all consent records include timestamps"],
      };
    },
  },
  {
    id: "consent_withdrawable",
    name: "Consent Withdrawal",
    description: "Users must be able to withdraw consent easily",
    category: "consent",
    check: (data) => {
      // Check if there are any revoked consents (proves mechanism exists)
      const hasWithdrawalMechanism = data.consents.some((c) => c.revokedAt);
      return {
        passed: true, // Mechanism exists if app is using consent manager
        status: hasWithdrawalMechanism ? "pass" : "warning",
        message: hasWithdrawalMechanism
          ? "Consent withdrawal mechanism is functional"
          : "No consent withdrawals recorded",
        recommendations: hasWithdrawalMechanism
          ? undefined
          : ["Verify consent withdrawal mechanism is accessible to users"],
      };
    },
  },
  {
    id: "data_access_requests",
    name: "Data Access Requests",
    description: "Data access requests must be fulfilled within 30 days",
    category: "rights",
    check: (data) => {
      const overdueRequests = data.exportRequests.filter((r) => {
        if (r.status === "completed") return false;
        const daysSinceRequest = Math.floor(
          (Date.now() - new Date(r.requestedAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return daysSinceRequest > 30;
      });

      const passed = overdueRequests.length === 0;
      return {
        passed,
        status: passed ? "pass" : "fail",
        message: passed
          ? "All data access requests are within time limits"
          : `${overdueRequests.length} request(s) exceed 30-day limit`,
        recommendations: passed
          ? undefined
          : ["Process overdue export requests immediately"],
        evidence: overdueRequests.map(
          (r) => `Request ${r.id} from ${r.userEmail}`,
        ),
      };
    },
  },
  {
    id: "deletion_requests",
    name: "Erasure Requests",
    description: "Deletion requests must be processed within 30 days",
    category: "rights",
    check: (data) => {
      const overdueRequests = data.deletionRequests.filter((r) => {
        if (["completed", "rejected", "cancelled"].includes(r.status))
          return false;
        const daysSinceRequest = Math.floor(
          (Date.now() - new Date(r.requestedAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return daysSinceRequest > 30;
      });

      const passed = overdueRequests.length === 0;
      return {
        passed,
        status: passed ? "pass" : "fail",
        message: passed
          ? "All erasure requests are within time limits"
          : `${overdueRequests.length} request(s) exceed 30-day limit`,
        recommendations: passed
          ? undefined
          : ["Process overdue deletion requests immediately"],
      };
    },
  },
  {
    id: "privacy_policy",
    name: "Privacy Policy",
    description: "A comprehensive privacy policy must be available",
    category: "documentation",
    check: (data) => ({
      passed: data.hasPrivacyPolicy,
      status: data.hasPrivacyPolicy ? "pass" : "fail",
      message: data.hasPrivacyPolicy
        ? "Privacy policy is available"
        : "Privacy policy is missing",
      recommendations: data.hasPrivacyPolicy
        ? undefined
        : ["Create and publish a comprehensive privacy policy"],
    }),
  },
  {
    id: "processing_records",
    name: "Records of Processing Activities",
    description: "Maintain records of all processing activities (Article 30)",
    category: "documentation",
    check: (data) => ({
      passed: data.hasDataProcessingRecords,
      status: data.hasDataProcessingRecords ? "pass" : "warning",
      message: data.hasDataProcessingRecords
        ? "Processing records are maintained"
        : "Processing records may be incomplete",
      recommendations: data.hasDataProcessingRecords
        ? undefined
        : ["Document all data processing activities as required by Article 30"],
    }),
  },
  {
    id: "breach_procedure",
    name: "Breach Notification Procedure",
    description: "Have procedures for data breach notification (72 hours)",
    category: "breach",
    check: (data) => ({
      passed: data.hasBreachProcedure,
      status: data.hasBreachProcedure ? "pass" : "fail",
      message: data.hasBreachProcedure
        ? "Breach notification procedures are in place"
        : "Breach notification procedures are missing",
      recommendations: data.hasBreachProcedure
        ? undefined
        : [
            "Establish data breach notification procedures",
            "Train staff on breach response",
          ],
    }),
  },
  {
    id: "audit_trail",
    name: "Audit Trail",
    description: "Maintain audit trails for compliance verification",
    category: "security",
    check: (data) => {
      const hasRecentLogs = data.auditLogs.length > 0;
      return {
        passed: hasRecentLogs,
        status: hasRecentLogs ? "pass" : "warning",
        message: hasRecentLogs
          ? `${data.auditLogs.length} audit entries recorded`
          : "No audit trail found",
        recommendations: hasRecentLogs
          ? undefined
          : ["Enable comprehensive audit logging"],
      };
    },
  },
];

// ============================================================================
// GDPR ASSESSMENT
// ============================================================================

export interface GDPRAssessment {
  overallScore: number;
  status: "compliant" | "at_risk" | "non_compliant";
  checkResults: Array<{
    check: GDPRComplianceCheck;
    result: GDPRCheckResult;
  }>;
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    notApplicable: number;
  };
  criticalIssues: string[];
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Run GDPR compliance assessment
 */
export function runGDPRAssessment(data: GDPRComplianceData): GDPRAssessment {
  const checkResults = GDPR_COMPLIANCE_CHECKS.map((check) => ({
    check,
    result: check.check(data),
  }));

  const summary = {
    passed: checkResults.filter((r) => r.result.status === "pass").length,
    failed: checkResults.filter((r) => r.result.status === "fail").length,
    warnings: checkResults.filter((r) => r.result.status === "warning").length,
    notApplicable: checkResults.filter(
      (r) => r.result.status === "not_applicable",
    ).length,
  };

  const totalApplicable = summary.passed + summary.failed + summary.warnings;
  const overallScore =
    totalApplicable > 0
      ? Math.round((summary.passed / totalApplicable) * 100)
      : 100;

  const criticalIssues = checkResults
    .filter((r) => r.result.status === "fail")
    .map((r) => r.result.message);

  const recommendations = checkResults
    .filter((r) => r.result.recommendations)
    .flatMap((r) => r.result.recommendations || []);

  let status: GDPRAssessment["status"];
  if (summary.failed === 0) {
    status = "compliant";
  } else if (summary.failed <= 2) {
    status = "at_risk";
  } else {
    status = "non_compliant";
  }

  return {
    overallScore,
    status,
    checkResults,
    summary,
    criticalIssues,
    recommendations: [...new Set(recommendations)], // Remove duplicates
    generatedAt: new Date(),
  };
}

// ============================================================================
// DATA SUBJECT REQUEST HELPERS
// ============================================================================

/**
 * Calculate deadline for GDPR request
 */
export function calculateGDPRDeadline(
  requestDate: Date,
  extensionDays: number = 0,
): Date {
  const deadline = new Date(requestDate);
  deadline.setDate(deadline.getDate() + 30 + extensionDays);
  return deadline;
}

/**
 * Check if GDPR request is overdue
 */
export function isGDPRRequestOverdue(
  requestDate: Date,
  extensionDays: number = 0,
): boolean {
  const deadline = calculateGDPRDeadline(requestDate, extensionDays);
  return new Date() > deadline;
}

/**
 * Get remaining days for GDPR request
 */
export function getRemainingDays(
  requestDate: Date,
  extensionDays: number = 0,
): number {
  const deadline = calculateGDPRDeadline(requestDate, extensionDays);
  const remaining = Math.ceil(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(0, remaining);
}

// ============================================================================
// GDPR DOCUMENTATION
// ============================================================================

/**
 * Generate GDPR compliance report
 */
export function generateGDPRReport(assessment: GDPRAssessment): {
  title: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
} {
  return {
    title: "GDPR Compliance Assessment Report",
    sections: [
      {
        title: "Executive Summary",
        content: `
Overall Compliance Score: ${assessment.overallScore}%
Status: ${assessment.status.toUpperCase()}

Checks Passed: ${assessment.summary.passed}
Checks Failed: ${assessment.summary.failed}
Warnings: ${assessment.summary.warnings}

Assessment Date: ${assessment.generatedAt.toISOString()}
        `.trim(),
      },
      {
        title: "Critical Issues",
        content:
          assessment.criticalIssues.length > 0
            ? assessment.criticalIssues
                .map((issue, i) => `${i + 1}. ${issue}`)
                .join("\n")
            : "No critical issues identified.",
      },
      {
        title: "Recommendations",
        content:
          assessment.recommendations.length > 0
            ? assessment.recommendations
                .map((rec, i) => `${i + 1}. ${rec}`)
                .join("\n")
            : "No additional recommendations.",
      },
      {
        title: "Detailed Check Results",
        content: assessment.checkResults
          .map((r) =>
            `
[${r.result.status.toUpperCase()}] ${r.check.name}
Category: ${r.check.category}
${r.result.message}
          `.trim(),
          )
          .join("\n\n"),
      },
    ],
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const GDPRHelpers = {
  GDPR_RIGHTS,
  LAWFUL_BASIS,
  GDPR_COMPLIANCE_CHECKS,
  runGDPRAssessment,
  calculateGDPRDeadline,
  isGDPRRequestOverdue,
  getRemainingDays,
  generateGDPRReport,
};
