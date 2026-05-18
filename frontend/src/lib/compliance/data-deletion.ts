/**
 * Data Deletion Service
 *
 * Handles GDPR Right to be Forgotten (Article 17) requests.
 */

import type {
  DataDeletionRequest,
  DeletionRequestStatus,
  DeletionScope,
  DataCategory,
  DeletionConfirmation,
  LegalHold,
} from "./compliance-types";

// ============================================================================
// CONSTANTS
// ============================================================================

export const DELETION_SCOPES: {
  scope: DeletionScope;
  label: string;
  description: string;
  categories: DataCategory[];
}[] = [
  {
    scope: "full_account",
    label: "Delete Everything",
    description: "Complete account deletion including all data",
    categories: [
      "messages",
      "files",
      "reactions",
      "threads",
      "user_profiles",
      "activity_logs",
    ],
  },
  {
    scope: "messages_only",
    label: "Messages Only",
    description: "Delete all your messages but keep your account",
    categories: ["messages", "threads"],
  },
  {
    scope: "files_only",
    label: "Files Only",
    description: "Delete all uploaded files",
    categories: ["files"],
  },
  {
    scope: "activity_only",
    label: "Activity Data Only",
    description: "Delete activity logs and analytics data",
    categories: ["activity_logs", "analytics"],
  },
  {
    scope: "partial",
    label: "Custom Selection",
    description: "Choose specific data categories to delete",
    categories: [],
  },
];

export const VERIFICATION_REQUIRED = true;
export const COOLING_OFF_PERIOD_DAYS = 14;
export const DELETION_PROCESSING_TIME_DAYS = 30;

// ============================================================================
// REQUEST CREATION
// ============================================================================

/**
 * Create a new data deletion request
 */
export function createDeletionRequest(
  userId: string,
  userEmail: string,
  options: {
    scope?: DeletionScope;
    specificCategories?: DataCategory[];
    reason?: string;
    ipAddress?: string;
  } = {},
): DataDeletionRequest {
  const now = new Date();
  const retentionPeriodEnds = new Date(now);
  retentionPeriodEnds.setDate(
    retentionPeriodEnds.getDate() + COOLING_OFF_PERIOD_DAYS,
  );

  return {
    id: crypto.randomUUID(),
    userId,
    userEmail,
    status: VERIFICATION_REQUIRED ? "pending_verification" : "pending",
    scope: options.scope || "full_account",
    specificCategories: options.specificCategories,
    reason: options.reason,
    requestedAt: now,
    retentionPeriodEnds,
    legalHoldBlocked: false,
    ipAddress: options.ipAddress,
    confirmationSent: false,
    confirmationAcknowledged: false,
  };
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

export interface DeletionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  blockers: {
    type: "legal_hold" | "retention_policy" | "pending_request";
    message: string;
    details?: unknown;
  }[];
}

/**
 * Validate a deletion request
 */
export function validateDeletionRequest(
  request: Partial<DataDeletionRequest>,
  existingRequests: DataDeletionRequest[],
  legalHolds: LegalHold[],
): DeletionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const blockers: DeletionValidationResult["blockers"] = [];

  // Basic validation
  if (!request.userId) {
    errors.push("User ID is required");
  }

  if (!request.userEmail) {
    errors.push("User email is required");
  }

  if (!request.scope) {
    errors.push("Deletion scope is required");
  }

  if (
    request.scope === "partial" &&
    (!request.specificCategories || request.specificCategories.length === 0)
  ) {
    errors.push(
      "At least one data category must be selected for partial deletion",
    );
  }

  // Check for pending requests
  const pendingRequests = existingRequests.filter(
    (r) =>
      r.userId === request.userId &&
      ["pending", "pending_verification", "approved", "processing"].includes(
        r.status,
      ),
  );

  if (pendingRequests.length > 0) {
    blockers.push({
      type: "pending_request",
      message: "You already have a pending deletion request",
      details: { requestId: pendingRequests[0].id },
    });
  }

  // Check for active legal holds
  const activeHolds = legalHolds.filter(
    (h) => h.status === "active" && h.custodians.includes(request.userId || ""),
  );

  if (activeHolds.length > 0) {
    blockers.push({
      type: "legal_hold",
      message:
        "Your data is subject to a legal hold and cannot be deleted at this time",
      details: { holdCount: activeHolds.length },
    });
  }

  // Warnings
  if (request.scope === "full_account") {
    warnings.push("Full account deletion is permanent and cannot be undone");
    warnings.push("You will lose access to all channels and conversations");
  }

  return {
    valid: errors.length === 0 && blockers.length === 0,
    errors,
    warnings,
    blockers,
  };
}

// ============================================================================
// STATUS MANAGEMENT
// ============================================================================

/**
 * Get human-readable status information
 */
export function getDeletionStatusInfo(status: DeletionRequestStatus): {
  label: string;
  description: string;
  color: string;
  icon: string;
  nextSteps?: string;
} {
  const statusMap: Record<
    DeletionRequestStatus,
    {
      label: string;
      description: string;
      color: string;
      icon: string;
      nextSteps?: string;
    }
  > = {
    pending: {
      label: "Pending",
      description: "Your request is awaiting review",
      color: "yellow",
      icon: "clock",
      nextSteps: "An administrator will review your request",
    },
    pending_verification: {
      label: "Verification Required",
      description: "Please verify your identity to proceed",
      color: "orange",
      icon: "shield",
      nextSteps: "Check your email for verification instructions",
    },
    approved: {
      label: "Approved",
      description: "Your request has been approved",
      color: "blue",
      icon: "check",
      nextSteps: `Deletion will begin after the ${COOLING_OFF_PERIOD_DAYS}-day waiting period`,
    },
    processing: {
      label: "Processing",
      description: "Your data is being deleted",
      color: "blue",
      icon: "loader",
      nextSteps: "This may take up to 30 days to complete",
    },
    completed: {
      label: "Completed",
      description: "Your data has been deleted",
      color: "green",
      icon: "check",
    },
    rejected: {
      label: "Rejected",
      description: "Your request was rejected",
      color: "red",
      icon: "x",
      nextSteps: "Contact support for more information",
    },
    cancelled: {
      label: "Cancelled",
      description: "Your request was cancelled",
      color: "gray",
      icon: "x",
    },
  };

  return statusMap[status];
}

/**
 * Check if deletion can be cancelled
 */
export function canCancelDeletion(request: DataDeletionRequest): {
  canCancel: boolean;
  reason?: string;
} {
  const cancellableStatuses: DeletionRequestStatus[] = [
    "pending",
    "pending_verification",
    "approved",
  ];

  if (!cancellableStatuses.includes(request.status)) {
    return {
      canCancel: false,
      reason: `Cannot cancel a request with status: ${request.status}`,
    };
  }

  return { canCancel: true };
}

/**
 * Check if deletion is in cooling off period
 */
export function isInCoolingOffPeriod(request: DataDeletionRequest): boolean {
  if (request.status !== "approved" || !request.retentionPeriodEnds) {
    return false;
  }

  return new Date() < new Date(request.retentionPeriodEnds);
}

/**
 * Get remaining cooling off days
 */
export function getRemainingCoolingOffDays(
  request: DataDeletionRequest,
): number {
  if (!request.retentionPeriodEnds) return 0;

  const now = new Date();
  const endDate = new Date(request.retentionPeriodEnds);
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

// ============================================================================
// SCOPE HELPERS
// ============================================================================

/**
 * Get categories for a deletion scope
 */
export function getCategoriesForScope(
  scope: DeletionScope,
  specificCategories?: DataCategory[],
): DataCategory[] {
  if (scope === "partial" && specificCategories) {
    return specificCategories;
  }

  const scopeConfig = DELETION_SCOPES.find((s) => s.scope === scope);
  return scopeConfig?.categories || [];
}

/**
 * Get deletion scope label
 */
export function getScopeLabel(scope: DeletionScope): string {
  const scopeConfig = DELETION_SCOPES.find((s) => s.scope === scope);
  return scopeConfig?.label || scope;
}

// ============================================================================
// DELETION CONFIRMATION
// ============================================================================

/**
 * Create deletion confirmation record
 */
export function createDeletionConfirmation(
  request: DataDeletionRequest,
  deletedCounts: Record<DataCategory, number>,
): DeletionConfirmation {
  const categories = getCategoriesForScope(
    request.scope,
    request.specificCategories,
  );

  return {
    requestId: request.id,
    userId: request.userId,
    deletedCategories: categories,
    itemsDeleted: deletedCounts,
    completedAt: new Date(),
    retainedDueToLegalHold: request.legalHoldIds,
  };
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Generate verification email content
 */
export function generateVerificationEmail(
  request: DataDeletionRequest,
  verificationLink: string,
): {
  subject: string;
  body: string;
} {
  return {
    subject: "Verify Your Data Deletion Request",
    body: `
Hello,

We received a request to delete your account data. To proceed, please verify this request by clicking the link below:

${verificationLink}

Request Details:
- Request ID: ${request.id}
- Scope: ${getScopeLabel(request.scope)}
- Requested at: ${new Date(request.requestedAt).toLocaleString()}

If you did not make this request, please ignore this email and contact support immediately.

Important Notes:
- You have ${COOLING_OFF_PERIOD_DAYS} days to cancel this request after verification
- This action cannot be undone once processing begins
- Some data may be retained for legal or compliance reasons

This is an automated message. Please do not reply to this email.
    `.trim(),
  };
}

/**
 * Generate deletion complete email
 */
export function generateDeletionCompleteEmail(
  confirmation: DeletionConfirmation,
): {
  subject: string;
  body: string;
} {
  const categoryList = confirmation.deletedCategories
    .map((cat) => `  - ${cat}: ${confirmation.itemsDeleted[cat] || 0} items`)
    .join("\n");

  return {
    subject: "Your Data Deletion is Complete",
    body: `
Hello,

Your data deletion request has been completed.

Summary:
${categoryList}

Request ID: ${confirmation.requestId}
Completed at: ${confirmation.completedAt.toLocaleString()}

${
  confirmation.retainedDueToLegalHold?.length
    ? `Note: Some data was retained due to legal hold requirements.`
    : ""
}

If you have any questions, please contact our support team.

This is an automated message. Please do not reply to this email.
    `.trim(),
  };
}

// ============================================================================
// GDPR COMPLIANCE
// ============================================================================

/**
 * Check GDPR compliance for deletion
 */
export function checkGDPRCompliance(request: DataDeletionRequest): {
  compliant: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Must complete within 30 days (GDPR requirement)
  if (request.status === "processing") {
    const daysSinceApproval = request.approvedAt
      ? Math.floor(
          (new Date().getTime() - new Date(request.approvedAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    if (daysSinceApproval > 30) {
      issues.push("GDPR requires deletion within 30 days of approval");
    } else if (daysSinceApproval > 20) {
      recommendations.push(
        `${30 - daysSinceApproval} days remaining to complete deletion`,
      );
    }
  }

  // Verification requirement
  if (!request.verifiedAt && request.status !== "pending_verification") {
    recommendations.push(
      "Consider requiring identity verification for deletion requests",
    );
  }

  // Confirmation to user
  if (request.status === "completed" && !request.confirmationSent) {
    issues.push("User should be notified when deletion is complete");
  }

  return {
    compliant: issues.length === 0,
    issues,
    recommendations,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const DataDeletionService = {
  DELETION_SCOPES,
  VERIFICATION_REQUIRED,
  COOLING_OFF_PERIOD_DAYS,
  DELETION_PROCESSING_TIME_DAYS,
  createDeletionRequest,
  validateDeletionRequest,
  getDeletionStatusInfo,
  canCancelDeletion,
  isInCoolingOffPeriod,
  getRemainingCoolingOffDays,
  getCategoriesForScope,
  getScopeLabel,
  createDeletionConfirmation,
  generateVerificationEmail,
  generateDeletionCompleteEmail,
  checkGDPRCompliance,
};
