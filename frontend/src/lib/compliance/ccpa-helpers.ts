/**
 * CCPA Compliance Helpers
 *
 * Utilities for California Consumer Privacy Act compliance.
 */

import type {
  DataExportRequest,
  DataDeletionRequest,
  UserConsent,
} from "./compliance-types";

// ============================================================================
// CCPA RIGHTS
// ============================================================================

export const CCPA_RIGHTS = {
  KNOW: {
    section: "1798.100",
    name: "Right to Know",
    description:
      "Right to know what personal information is collected and how it is used.",
    timeLimit: 45, // days
    extensionAllowed: 45, // additional days if needed
  },
  DELETE: {
    section: "1798.105",
    name: "Right to Delete",
    description: "Right to request deletion of personal information.",
    timeLimit: 45,
    extensionAllowed: 45,
  },
  OPT_OUT: {
    section: "1798.120",
    name: "Right to Opt-Out",
    description: "Right to opt-out of the sale of personal information.",
    timeLimit: 15, // Must comply within 15 days
    extensionAllowed: 0,
  },
  NON_DISCRIMINATION: {
    section: "1798.125",
    name: "Right to Non-Discrimination",
    description:
      "Right not to be discriminated against for exercising CCPA rights.",
    timeLimit: 0, // Ongoing obligation
    extensionAllowed: 0,
  },
  CORRECT: {
    section: "1798.106",
    name: "Right to Correct",
    description:
      "Right to correct inaccurate personal information (CPRA amendment).",
    timeLimit: 45,
    extensionAllowed: 45,
  },
  LIMIT_USE: {
    section: "1798.121",
    name: "Right to Limit Use",
    description:
      "Right to limit use and disclosure of sensitive personal information (CPRA).",
    timeLimit: 15,
    extensionAllowed: 0,
  },
} as const;

export type CCPARight = keyof typeof CCPA_RIGHTS;

// ============================================================================
// PERSONAL INFORMATION CATEGORIES
// ============================================================================

export const CCPA_DATA_CATEGORIES = {
  IDENTIFIERS: {
    name: "Identifiers",
    examples: [
      "Name",
      "Email",
      "IP address",
      "Account name",
      "Social security number",
    ],
    sensitive: false,
  },
  CUSTOMER_RECORDS: {
    name: "Customer Records",
    examples: [
      "Contact information",
      "Financial information",
      "Employment information",
    ],
    sensitive: false,
  },
  PROTECTED_CHARACTERISTICS: {
    name: "Protected Classification Characteristics",
    examples: ["Age", "Race", "Gender", "Religion", "Sexual orientation"],
    sensitive: true,
  },
  COMMERCIAL_INFO: {
    name: "Commercial Information",
    examples: ["Purchase history", "Products viewed", "Services purchased"],
    sensitive: false,
  },
  BIOMETRIC: {
    name: "Biometric Information",
    examples: ["Fingerprints", "Face recognition", "Voice recordings"],
    sensitive: true,
  },
  INTERNET_ACTIVITY: {
    name: "Internet Activity",
    examples: [
      "Browsing history",
      "Search history",
      "Interaction with website",
    ],
    sensitive: false,
  },
  GEOLOCATION: {
    name: "Geolocation Data",
    examples: ["GPS coordinates", "IP-based location"],
    sensitive: true,
  },
  SENSORY_DATA: {
    name: "Sensory Data",
    examples: ["Audio recordings", "Video recordings", "Thermal data"],
    sensitive: false,
  },
  PROFESSIONAL_INFO: {
    name: "Professional Information",
    examples: ["Employment history", "Performance evaluations"],
    sensitive: false,
  },
  EDUCATION_INFO: {
    name: "Education Information",
    examples: ["Student records", "Grades", "Disciplinary records"],
    sensitive: false,
  },
  INFERENCES: {
    name: "Inferences",
    examples: ["Consumer profiles", "Preferences", "Behavior predictions"],
    sensitive: false,
  },
  SENSITIVE_PI: {
    name: "Sensitive Personal Information",
    examples: [
      "SSN",
      "Driver's license",
      "Financial account",
      "Precise geolocation",
      "Racial/ethnic origin",
      "Religious beliefs",
      "Biometric data",
      "Health data",
      "Sex life/orientation",
    ],
    sensitive: true,
  },
} as const;

export type CCPADataCategory = keyof typeof CCPA_DATA_CATEGORIES;

// ============================================================================
// CCPA COMPLIANCE CHECKS
// ============================================================================

export interface CCPAComplianceCheck {
  id: string;
  name: string;
  description: string;
  requirement: string;
  check: (data: CCPAComplianceData) => CCPACheckResult;
}

export interface CCPAComplianceData {
  annualRevenue?: number;
  californiansServed?: number;
  sellsPersonalInfo: boolean;
  hasDoNotSellLink: boolean;
  hasPrivacyPolicy: boolean;
  privacyPolicyLastUpdated?: Date;
  acceptsOptOutRequests: boolean;
  verificationProcedure: boolean;
  recordKeeping: boolean;
  employeeTraining: boolean;
  consents: UserConsent[];
  exportRequests: DataExportRequest[];
  deletionRequests: DataDeletionRequest[];
}

export interface CCPACheckResult {
  passed: boolean;
  status: "pass" | "fail" | "warning" | "not_applicable";
  message: string;
  recommendations?: string[];
}

export const CCPA_COMPLIANCE_CHECKS: CCPAComplianceCheck[] = [
  {
    id: "threshold_check",
    name: "CCPA Applicability",
    description: "Determine if CCPA applies to your business",
    requirement:
      "Annual revenue > $25M, or 50K+ consumers, or 50%+ revenue from selling PI",
    check: (data) => {
      const meetsRevenue = (data.annualRevenue || 0) >= 25000000;
      const meetsConsumers = (data.californiansServed || 0) >= 50000;
      const sellsData = data.sellsPersonalInfo;

      const applies = meetsRevenue || meetsConsumers || sellsData;

      return {
        passed: true,
        status: applies ? "pass" : "not_applicable",
        message: applies
          ? "CCPA requirements apply to your business"
          : "CCPA may not apply to your business based on thresholds",
      };
    },
  },
  {
    id: "privacy_policy",
    name: "Privacy Policy",
    description: "Privacy policy must disclose CCPA rights",
    requirement: "Update privacy policy annually with CCPA disclosures",
    check: (data) => {
      if (!data.hasPrivacyPolicy) {
        return {
          passed: false,
          status: "fail",
          message: "Privacy policy is required",
          recommendations: [
            "Create comprehensive privacy policy with CCPA disclosures",
          ],
        };
      }

      if (data.privacyPolicyLastUpdated) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        if (new Date(data.privacyPolicyLastUpdated) < oneYearAgo) {
          return {
            passed: false,
            status: "warning",
            message: "Privacy policy needs annual update",
            recommendations: [
              "Update privacy policy within 12 months of last update",
            ],
          };
        }
      }

      return {
        passed: true,
        status: "pass",
        message: "Privacy policy is in place and current",
      };
    },
  },
  {
    id: "do_not_sell",
    name: "Do Not Sell My Personal Information",
    description: "Link must be visible on homepage if selling data",
    requirement: 'Clear "Do Not Sell" link on website homepage',
    check: (data) => {
      if (!data.sellsPersonalInfo) {
        return {
          passed: true,
          status: "not_applicable",
          message:
            "Not applicable - business does not sell personal information",
        };
      }

      return {
        passed: data.hasDoNotSellLink,
        status: data.hasDoNotSellLink ? "pass" : "fail",
        message: data.hasDoNotSellLink
          ? '"Do Not Sell" link is in place'
          : '"Do Not Sell" link is required on homepage',
        recommendations: data.hasDoNotSellLink
          ? undefined
          : ['Add "Do Not Sell My Personal Information" link to homepage'],
      };
    },
  },
  {
    id: "request_processing",
    name: "Request Processing Time",
    description: "Respond to consumer requests within 45 days",
    requirement: "Process requests within 45 days (90 with extension)",
    check: (data) => {
      const allRequests = [...data.exportRequests, ...data.deletionRequests];
      const overdueRequests = allRequests.filter((r) => {
        if (["completed", "rejected", "cancelled"].includes(r.status))
          return false;

        const daysSinceRequest = Math.floor(
          (Date.now() - new Date(r.requestedAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        return daysSinceRequest > 45;
      });

      return {
        passed: overdueRequests.length === 0,
        status: overdueRequests.length === 0 ? "pass" : "fail",
        message:
          overdueRequests.length === 0
            ? "All requests are being processed within time limits"
            : `${overdueRequests.length} request(s) exceed 45-day limit`,
        recommendations:
          overdueRequests.length === 0
            ? undefined
            : [
                "Process overdue requests immediately",
                "Consider requesting 45-day extension if needed",
              ],
      };
    },
  },
  {
    id: "verification",
    name: "Consumer Verification",
    description: "Verify consumer identity before processing requests",
    requirement: "Implement reasonable verification procedures",
    check: (data) => ({
      passed: data.verificationProcedure,
      status: data.verificationProcedure ? "pass" : "fail",
      message: data.verificationProcedure
        ? "Consumer verification procedures are in place"
        : "Consumer verification procedures are required",
      recommendations: data.verificationProcedure
        ? undefined
        : ["Implement identity verification for CCPA requests"],
    }),
  },
  {
    id: "record_keeping",
    name: "Record Keeping",
    description: "Maintain records of CCPA requests for 24 months",
    requirement: "Keep records of all consumer requests for 24 months",
    check: (data) => ({
      passed: data.recordKeeping,
      status: data.recordKeeping ? "pass" : "warning",
      message: data.recordKeeping
        ? "CCPA request records are being maintained"
        : "Ensure CCPA request records are kept for 24 months",
      recommendations: data.recordKeeping
        ? undefined
        : ["Implement 24-month record retention for CCPA requests"],
    }),
  },
  {
    id: "employee_training",
    name: "Employee Training",
    description: "Train employees handling consumer inquiries",
    requirement: "Train employees on CCPA requirements",
    check: (data) => ({
      passed: data.employeeTraining,
      status: data.employeeTraining ? "pass" : "warning",
      message: data.employeeTraining
        ? "Employee training program is in place"
        : "Employee CCPA training is recommended",
      recommendations: data.employeeTraining
        ? undefined
        : ["Implement CCPA training for customer-facing employees"],
    }),
  },
];

// ============================================================================
// CCPA ASSESSMENT
// ============================================================================

export interface CCPAAssessment {
  overallScore: number;
  applies: boolean;
  status: "compliant" | "at_risk" | "non_compliant";
  checkResults: Array<{
    check: CCPAComplianceCheck;
    result: CCPACheckResult;
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
 * Run CCPA compliance assessment
 */
export function runCCPAAssessment(data: CCPAComplianceData): CCPAAssessment {
  const checkResults = CCPA_COMPLIANCE_CHECKS.map((check) => ({
    check,
    result: check.check(data),
  }));

  // Check if CCPA applies
  const thresholdCheck = checkResults.find(
    (r) => r.check.id === "threshold_check",
  );
  const applies = thresholdCheck?.result.status !== "not_applicable";

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

  let status: CCPAAssessment["status"];
  if (summary.failed === 0) {
    status = "compliant";
  } else if (summary.failed <= 2) {
    status = "at_risk";
  } else {
    status = "non_compliant";
  }

  return {
    overallScore,
    applies,
    status,
    checkResults,
    summary,
    criticalIssues,
    recommendations: [...new Set(recommendations)],
    generatedAt: new Date(),
  };
}

// ============================================================================
// CCPA REQUEST HELPERS
// ============================================================================

/**
 * Calculate deadline for CCPA request
 */
export function calculateCCPADeadline(
  requestDate: Date,
  withExtension: boolean = false,
): Date {
  const deadline = new Date(requestDate);
  deadline.setDate(deadline.getDate() + (withExtension ? 90 : 45));
  return deadline;
}

/**
 * Check if CCPA request is overdue
 */
export function isCCPARequestOverdue(
  requestDate: Date,
  withExtension: boolean = false,
): boolean {
  const deadline = calculateCCPADeadline(requestDate, withExtension);
  return new Date() > deadline;
}

/**
 * Get remaining days for CCPA request
 */
export function getRemainingDays(
  requestDate: Date,
  withExtension: boolean = false,
): number {
  const deadline = calculateCCPADeadline(requestDate, withExtension);
  const remaining = Math.ceil(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(0, remaining);
}

// ============================================================================
// OPT-OUT HELPERS
// ============================================================================

export interface OptOutRecord {
  consumerId: string;
  optedOutAt: Date;
  categories: CCPADataCategory[];
  source: "website" | "email" | "phone" | "gpc";
  verified: boolean;
}

/**
 * Check if Global Privacy Control (GPC) signal should be honored
 */
export function shouldHonorGPC(): boolean {
  // California law requires honoring GPC signals as opt-out requests
  // This would typically check the browser's GPC setting
  return true; // Always honor GPC signals
}

// ============================================================================
// EXPORT
// ============================================================================

export const CCPAHelpers = {
  CCPA_RIGHTS,
  CCPA_DATA_CATEGORIES,
  CCPA_COMPLIANCE_CHECKS,
  runCCPAAssessment,
  calculateCCPADeadline,
  isCCPARequestOverdue,
  getRemainingDays,
  shouldHonorGPC,
};
