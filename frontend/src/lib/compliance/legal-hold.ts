/**
 * Legal Hold Management
 *
 * Handles legal holds for eDiscovery and litigation purposes.
 */

import type { LegalHold, LegalHoldNotification } from "./compliance-types";

// ============================================================================
// CONSTANTS
// ============================================================================

export const LEGAL_HOLD_REMINDER_INTERVAL_DAYS = 30;
export const LEGAL_HOLD_ACKNOWLEDGMENT_DEADLINE_DAYS = 7;

// ============================================================================
// LEGAL HOLD CREATION
// ============================================================================

/**
 * Create a new legal hold
 */
export function createLegalHold(
  createdBy: string,
  options: {
    name: string;
    matterName: string;
    matterNumber?: string;
    description?: string;
    custodians: string[];
    channels?: string[];
    startDate?: Date;
    endDate?: Date;
    preserveMessages?: boolean;
    preserveFiles?: boolean;
    preserveAuditLogs?: boolean;
    notifyCustodians?: boolean;
    notes?: string;
  },
): LegalHold {
  return {
    id: crypto.randomUUID(),
    name: options.name,
    description: options.description,
    matterName: options.matterName,
    matterNumber: options.matterNumber,
    custodians: options.custodians,
    channels: options.channels,
    startDate: options.startDate || new Date(),
    endDate: options.endDate,
    status: "active",
    preserveMessages: options.preserveMessages ?? true,
    preserveFiles: options.preserveFiles ?? true,
    preserveAuditLogs: options.preserveAuditLogs ?? true,
    notifyCustodians: options.notifyCustodians ?? true,
    createdAt: new Date(),
    createdBy,
    notes: options.notes,
  };
}

// ============================================================================
// LEGAL HOLD VALIDATION
// ============================================================================

export interface LegalHoldValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a legal hold configuration
 */
export function validateLegalHold(
  hold: Partial<LegalHold>,
): LegalHoldValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!hold.name?.trim()) {
    errors.push("Legal hold name is required");
  }

  if (!hold.matterName?.trim()) {
    errors.push("Matter name is required");
  }

  if (!hold.custodians || hold.custodians.length === 0) {
    errors.push("At least one custodian is required");
  }

  // Date validation
  if (hold.startDate && hold.endDate) {
    if (new Date(hold.endDate) <= new Date(hold.startDate)) {
      errors.push("End date must be after start date");
    }
  }

  // Warnings
  if (hold.custodians && hold.custodians.length > 100) {
    warnings.push("Large number of custodians may impact performance");
  }

  if (
    !hold.preserveMessages &&
    !hold.preserveFiles &&
    !hold.preserveAuditLogs
  ) {
    warnings.push("No data preservation options selected");
  }

  if (!hold.notifyCustodians) {
    warnings.push("Custodians will not be notified of the legal hold");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// LEGAL HOLD STATUS MANAGEMENT
// ============================================================================

/**
 * Release a legal hold
 */
export function releaseLegalHold(
  hold: LegalHold,
  releasedBy: string,
): LegalHold {
  return {
    ...hold,
    status: "released",
    releasedAt: new Date(),
    releasedBy,
  };
}

/**
 * Check if hold has expired
 */
export function isHoldExpired(hold: LegalHold): boolean {
  if (hold.status !== "active") return false;
  if (!hold.endDate) return false;

  return new Date() > new Date(hold.endDate);
}

/**
 * Get hold status display info
 */
export function getHoldStatusInfo(status: LegalHold["status"]): {
  label: string;
  description: string;
  color: string;
  icon: string;
} {
  const statusMap: Record<
    LegalHold["status"],
    { label: string; description: string; color: string; icon: string }
  > = {
    active: {
      label: "Active",
      description: "Legal hold is in effect",
      color: "blue",
      icon: "lock",
    },
    released: {
      label: "Released",
      description: "Legal hold has been released",
      color: "green",
      icon: "unlock",
    },
    expired: {
      label: "Expired",
      description: "Legal hold has expired",
      color: "gray",
      icon: "clock",
    },
  };

  return statusMap[status];
}

// ============================================================================
// CUSTODIAN MANAGEMENT
// ============================================================================

/**
 * Add custodians to a legal hold
 */
export function addCustodians(
  hold: LegalHold,
  newCustodians: string[],
): LegalHold {
  const uniqueCustodians = [...new Set([...hold.custodians, ...newCustodians])];

  return {
    ...hold,
    custodians: uniqueCustodians,
  };
}

/**
 * Remove custodians from a legal hold
 */
export function removeCustodians(
  hold: LegalHold,
  custodiansToRemove: string[],
): LegalHold {
  return {
    ...hold,
    custodians: hold.custodians.filter((c) => !custodiansToRemove.includes(c)),
  };
}

/**
 * Check if user is under legal hold
 */
export function isUserUnderLegalHold(
  userId: string,
  holds: LegalHold[],
): { underHold: boolean; holds: LegalHold[] } {
  const activeHolds = holds.filter(
    (h) => h.status === "active" && h.custodians.includes(userId),
  );

  return {
    underHold: activeHolds.length > 0,
    holds: activeHolds,
  };
}

/**
 * Check if channel is under legal hold
 */
export function isChannelUnderLegalHold(
  channelId: string,
  holds: LegalHold[],
): { underHold: boolean; holds: LegalHold[] } {
  const activeHolds = holds.filter(
    (h) => h.status === "active" && h.channels?.includes(channelId),
  );

  return {
    underHold: activeHolds.length > 0,
    holds: activeHolds,
  };
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Create a legal hold notification
 */
export function createLegalHoldNotification(
  holdId: string,
  userId: string,
  type: LegalHoldNotification["type"],
): LegalHoldNotification {
  return {
    id: crypto.randomUUID(),
    holdId,
    userId,
    type,
    sentAt: new Date(),
    acknowledged: false,
  };
}

/**
 * Acknowledge a legal hold notification
 */
export function acknowledgeNotification(
  notification: LegalHoldNotification,
): LegalHoldNotification {
  return {
    ...notification,
    acknowledged: true,
    acknowledgedAt: new Date(),
  };
}

/**
 * Check if reminder is due
 */
export function isReminderDue(
  hold: LegalHold,
  lastNotification?: Date,
): boolean {
  if (hold.status !== "active") return false;

  const daysSinceNotification = lastNotification
    ? Math.floor(
        (new Date().getTime() - new Date(lastNotification).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : LEGAL_HOLD_REMINDER_INTERVAL_DAYS + 1; // Force reminder if never sent

  return daysSinceNotification >= LEGAL_HOLD_REMINDER_INTERVAL_DAYS;
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Generate legal hold notice email
 */
export function generateLegalHoldNoticeEmail(
  hold: LegalHold,
  recipientName: string,
): {
  subject: string;
  body: string;
} {
  return {
    subject: `LEGAL HOLD NOTICE: ${hold.matterName}`,
    body: `
LEGAL HOLD NOTICE

Dear ${recipientName},

You have been identified as a custodian in a legal matter. This notice requires you to preserve all potentially relevant information related to:

Matter Name: ${hold.matterName}
${hold.matterNumber ? `Matter Number: ${hold.matterNumber}` : ""}
Hold Name: ${hold.name}
Start Date: ${new Date(hold.startDate).toLocaleDateString()}
${hold.endDate ? `End Date: ${new Date(hold.endDate).toLocaleDateString()}` : "Duration: Until further notice"}

IMPORTANT INSTRUCTIONS:
1. Do NOT delete, modify, or destroy any potentially relevant documents, messages, or files
2. This includes electronic communications, files, and any other data that may be relevant
3. This hold supersedes any document retention policies that might otherwise apply
4. Failure to preserve this information may result in legal consequences

Please acknowledge receipt of this notice within ${LEGAL_HOLD_ACKNOWLEDGMENT_DEADLINE_DAYS} days.

If you have any questions about this legal hold, please contact your legal department immediately.

This is an automated legal notice. Do not reply to this email.
    `.trim(),
  };
}

/**
 * Generate legal hold release email
 */
export function generateLegalHoldReleaseEmail(
  hold: LegalHold,
  recipientName: string,
): {
  subject: string;
  body: string;
} {
  return {
    subject: `LEGAL HOLD RELEASED: ${hold.matterName}`,
    body: `
LEGAL HOLD RELEASE NOTICE

Dear ${recipientName},

The legal hold for the following matter has been released:

Matter Name: ${hold.matterName}
${hold.matterNumber ? `Matter Number: ${hold.matterNumber}` : ""}
Hold Name: ${hold.name}
Original Start Date: ${new Date(hold.startDate).toLocaleDateString()}
Release Date: ${new Date().toLocaleDateString()}

You may now resume normal document retention practices for this matter. Standard retention policies will apply going forward.

If you have any questions, please contact your legal department.

This is an automated legal notice. Do not reply to this email.
    `.trim(),
  };
}

/**
 * Generate legal hold reminder email
 */
export function generateLegalHoldReminderEmail(
  hold: LegalHold,
  recipientName: string,
): {
  subject: string;
  body: string;
} {
  return {
    subject: `LEGAL HOLD REMINDER: ${hold.matterName}`,
    body: `
LEGAL HOLD REMINDER

Dear ${recipientName},

This is a reminder that you are subject to an active legal hold:

Matter Name: ${hold.matterName}
${hold.matterNumber ? `Matter Number: ${hold.matterNumber}` : ""}
Hold Name: ${hold.name}
Start Date: ${new Date(hold.startDate).toLocaleDateString()}

You must continue to preserve all potentially relevant information. Do NOT delete, modify, or destroy any documents, messages, or files that may be relevant to this matter.

If you have any questions or concerns, please contact your legal department.

This is an automated legal notice. Do not reply to this email.
    `.trim(),
  };
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface LegalHoldStatistics {
  totalHolds: number;
  activeHolds: number;
  releasedHolds: number;
  expiredHolds: number;
  totalCustodians: number;
  uniqueCustodians: number;
  totalChannels: number;
  averageDuration: number; // days
  oldestActiveHold?: { name: string; startDate: Date };
}

/**
 * Calculate legal hold statistics
 */
export function calculateLegalHoldStatistics(
  holds: LegalHold[],
): LegalHoldStatistics {
  const allCustodians: string[] = [];
  const allChannels: string[] = [];
  let totalDuration = 0;
  let completedCount = 0;
  let oldestActive: { name: string; startDate: Date } | undefined;

  for (const hold of holds) {
    allCustodians.push(...hold.custodians);
    if (hold.channels) {
      allChannels.push(...hold.channels);
    }

    if (hold.status === "released" && hold.releasedAt) {
      const duration = Math.floor(
        (new Date(hold.releasedAt).getTime() -
          new Date(hold.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      totalDuration += duration;
      completedCount++;
    }

    if (hold.status === "active") {
      if (!oldestActive || new Date(hold.startDate) < oldestActive.startDate) {
        oldestActive = { name: hold.name, startDate: new Date(hold.startDate) };
      }
    }
  }

  return {
    totalHolds: holds.length,
    activeHolds: holds.filter((h) => h.status === "active").length,
    releasedHolds: holds.filter((h) => h.status === "released").length,
    expiredHolds: holds.filter((h) => h.status === "expired").length,
    totalCustodians: allCustodians.length,
    uniqueCustodians: new Set(allCustodians).size,
    totalChannels: new Set(allChannels).size,
    averageDuration:
      completedCount > 0 ? Math.round(totalDuration / completedCount) : 0,
    oldestActiveHold: oldestActive,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const LegalHoldService = {
  LEGAL_HOLD_REMINDER_INTERVAL_DAYS,
  LEGAL_HOLD_ACKNOWLEDGMENT_DEADLINE_DAYS,
  createLegalHold,
  validateLegalHold,
  releaseLegalHold,
  isHoldExpired,
  getHoldStatusInfo,
  addCustodians,
  removeCustodians,
  isUserUnderLegalHold,
  isChannelUnderLegalHold,
  createLegalHoldNotification,
  acknowledgeNotification,
  isReminderDue,
  generateLegalHoldNoticeEmail,
  generateLegalHoldReleaseEmail,
  generateLegalHoldReminderEmail,
  calculateLegalHoldStatistics,
};
