/**
 * Data Deletion API (GDPR Article 17 - Right to be Forgotten)
 *
 * Allows users to request deletion of their personal data.
 */

import { NextRequest, NextResponse } from "next/server";
import { DataDeletionService } from "@/lib/compliance/data-deletion";
import type {
  DataDeletionRequest,
  DeletionScope,
  DataCategory,
  LegalHold,
} from "@/lib/compliance/compliance-types";
import { logger } from "@/lib/logger";

// Simulated database (replace with real database calls)
const deletionRequests: DataDeletionRequest[] = [];
const legalHolds: LegalHold[] = [];

/**
 * GET /api/compliance/deletion
 * List deletion requests for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";

    const userRequests = deletionRequests.filter((r) => r.userId === userId);

    return NextResponse.json({
      success: true,
      requests: userRequests,
      count: userRequests.length,
    });
  } catch (error) {
    logger.error("Error fetching deletion requests:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch deletion requests",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/compliance/deletion
 * Create a new data deletion request
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";
    const userEmail = request.headers.get("x-user-email") || "demo@example.com";
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;

    const body = await request.json();
    const { scope, specificCategories, reason } = body;

    // Create deletion request
    const deletionRequest = DataDeletionService.createDeletionRequest(
      userId,
      userEmail,
      {
        scope: scope as DeletionScope,
        specificCategories: specificCategories as DataCategory[],
        reason,
        ipAddress,
      },
    );

    // Validate request
    const validation = DataDeletionService.validateDeletionRequest(
      deletionRequest,
      deletionRequests,
      legalHolds,
    );

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid deletion request",
          errors: validation.errors,
          warnings: validation.warnings,
          blockers: validation.blockers,
        },
        { status: 400 },
      );
    }

    // Check legal holds
    const activeHolds = legalHolds.filter(
      (h) => h.status === "active" && h.custodians.includes(userId),
    );

    if (activeHolds.length > 0) {
      deletionRequest.legalHoldBlocked = true;
      deletionRequest.legalHoldIds = activeHolds.map((h) => h.id);
    }

    // Save to database
    deletionRequests.push(deletionRequest);

    // if (DataDeletionService.VERIFICATION_REQUIRED) {
    //   const verificationLink = generateVerificationLink(deletionRequest.id);
    //   const email = DataDeletionService.generateVerificationEmail(deletionRequest, verificationLink);
    //   await sendEmail(userEmail, email.subject, email.body);
    // }

    // await logComplianceEvent('deletion_requested', { userId, requestId: deletionRequest.id });

    return NextResponse.json({
      success: true,
      request: deletionRequest,
      message:
        validation.blockers.length > 0
          ? "Your deletion request cannot be processed due to legal holds."
          : `Your deletion request has been created. You have ${DataDeletionService.COOLING_OFF_PERIOD_DAYS} days to cancel.`,
      warnings: validation.warnings,
      requiresVerification: DataDeletionService.VERIFICATION_REQUIRED,
    });
  } catch (error) {
    logger.error("Error creating deletion request:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create deletion request",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/compliance/deletion?id=<requestId>
 * Update deletion request status (verify, approve, cancel)
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";
    const requestId = request.nextUrl.searchParams.get("id");
    const body = await request.json();
    const { action } = body; // 'verify', 'approve', 'reject', 'cancel'

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "Request ID is required" },
        { status: 400 },
      );
    }

    const deletionRequest = deletionRequests.find((r) => r.id === requestId);

    if (!deletionRequest) {
      return NextResponse.json(
        { success: false, error: "Deletion request not found" },
        { status: 404 },
      );
    }

    // Verify user owns the request (or is admin for approve/reject)
    if (
      deletionRequest.userId !== userId &&
      !["approve", "reject"].includes(action)
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    // Handle different actions
    switch (action) {
      case "verify":
        if (deletionRequest.status !== "pending_verification") {
          return NextResponse.json(
            { success: false, error: "Request is not pending verification" },
            { status: 400 },
          );
        }
        deletionRequest.status = "approved";
        deletionRequest.verifiedAt = new Date();
        deletionRequest.approvedAt = new Date();
        break;

      case "approve":
        deletionRequest.status = "approved";
        deletionRequest.approvedAt = new Date();
        deletionRequest.approvedBy = userId;
        break;

      case "reject":
        deletionRequest.status = "rejected";
        deletionRequest.rejectedAt = new Date();
        deletionRequest.rejectedBy = userId;
        deletionRequest.rejectionReason = body.reason;
        break;

      case "cancel":
        const canCancel =
          DataDeletionService.canCancelDeletion(deletionRequest);
        if (!canCancel.canCancel) {
          return NextResponse.json(
            { success: false, error: canCancel.reason },
            { status: 400 },
          );
        }
        deletionRequest.status = "cancelled";
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 },
        );
    }

    // await logComplianceEvent(`deletion_${action}`, { userId, requestId });

    return NextResponse.json({
      success: true,
      request: deletionRequest,
      message: `Deletion request ${action}d successfully`,
    });
  } catch (error) {
    logger.error("Error updating deletion request:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update deletion request",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
