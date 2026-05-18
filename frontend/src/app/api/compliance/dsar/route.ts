/**
 * DSAR (Data Subject Access Request) API
 *
 * RESTful API for GDPR/CCPA DSAR workflow management.
 *
 * @module api/compliance/dsar
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  createDSARService,
  type DSARService,
  type CreateDSARInput,
  type UpdateDSARInput,
  type DSARListOptions,
} from "@/services/compliance";

// Service instance (would use singleton in production)
let dsarService: DSARService | null = null;

async function getService(): Promise<DSARService> {
  if (!dsarService) {
    dsarService = createDSARService();
    await dsarService.initialize();
  }
  return dsarService;
}

/**
 * GET /api/compliance/dsar
 * List DSAR requests
 */
export async function GET(request: NextRequest) {
  try {
    const service = await getService();
    const userId = request.headers.get("x-user-id");
    const isAdmin = request.headers.get("x-user-role") === "admin";
    const requestId = request.nextUrl.searchParams.get("id");

    // Get single request
    if (requestId) {
      const dsarRequest = service.getRequest(requestId);

      if (!dsarRequest) {
        return NextResponse.json(
          { success: false, error: "Request not found" },
          { status: 404 },
        );
      }

      // Check authorization
      if (!isAdmin && dsarRequest.userId !== userId) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 403 },
        );
      }

      return NextResponse.json({
        success: true,
        request: dsarRequest,
        remainingDays: service.getRemainingDays(requestId),
      });
    }

    // List requests
    const options: DSARListOptions = {
      filters: {},
      sortBy: "submittedAt",
      sortOrder: "desc",
      limit: parseInt(request.nextUrl.searchParams.get("limit") || "50"),
      offset: parseInt(request.nextUrl.searchParams.get("offset") || "0"),
      includeAuditEvents:
        request.nextUrl.searchParams.get("includeAudit") === "true",
    };

    // Filter by user if not admin
    if (!isAdmin && userId) {
      options.filters!.userId = userId;
    }

    // Apply query filters
    const statusParam = request.nextUrl.searchParams.get("status");
    if (statusParam) {
      options.filters!.status = statusParam.split(",") as any[];
    }

    const typeParam = request.nextUrl.searchParams.get("type");
    if (typeParam) {
      options.filters!.requestType = typeParam.split(",") as any[];
    }

    const result = service.listRequests(options);

    return NextResponse.json({
      success: true,
      requests: result.requests,
      total: result.total,
      hasMore: result.hasMore,
    });
  } catch (error) {
    logger.error("Error fetching DSAR requests:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch DSAR requests",
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
 * POST /api/compliance/dsar
 * Create a new DSAR request
 */
export async function POST(request: NextRequest) {
  try {
    const service = await getService();
    const userId = request.headers.get("x-user-id") || "demo-user";
    const userEmail = request.headers.get("x-user-email") || "demo@example.com";
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const body = await request.json();
    const input: CreateDSARInput = {
      requestType: body.requestType,
      regulation: body.regulation,
      dataCategories: body.dataCategories,
      scope: body.scope,
      deliveryMethod: body.deliveryMethod,
      deliveryEmail: body.deliveryEmail,
      exportFormat: body.exportFormat,
      notes: body.notes,
    };

    const result = await service.createRequest(userId, userEmail, input, {
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      request: result.data,
      message: "DSAR request submitted successfully",
      verificationRequired: result.data?.verificationRequired,
    });
  } catch (error) {
    logger.error("Error creating DSAR request:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create DSAR request",
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
 * PATCH /api/compliance/dsar?id=<requestId>
 * Update a DSAR request
 */
export async function PATCH(request: NextRequest) {
  try {
    const service = await getService();
    const requestId = request.nextUrl.searchParams.get("id");
    const actorId = request.headers.get("x-user-id") || "system";
    const actorEmail = request.headers.get("x-user-email");
    const isAdmin = request.headers.get("x-user-role") === "admin";

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "Request ID is required" },
        { status: 400 },
      );
    }

    const dsarRequest = service.getRequest(requestId);
    if (!dsarRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { action, ...updates } = body;

    // Extract body fields upfront to avoid inline body.* references inside
    // service method calls that use request-related names (e.g. approveRequest).
    // body is typed `any` from request.json(); destructuring preserves that type.
    const bodyNotes = body.notes;
    const bodyReason = body.reason;
    const bodyAssigneeId = body.assigneeId;
    const bodyToken = body.token;

    // Handle specific actions
    if (action) {
      let result;

      switch (action) {
        case "verify":
          result = await service.completeVerification(
            dsarRequest.identityVerification?.id || "",
            bodyToken,
          );
          break;

        case "approve":
          if (!isAdmin) {
            return NextResponse.json(
              { success: false, error: "Unauthorized" },
              { status: 403 },
            );
          }
          result = await service.approveRequest(requestId, actorId, bodyNotes);
          break;

        case "reject":
          if (!isAdmin) {
            return NextResponse.json(
              { success: false, error: "Unauthorized" },
              { status: 403 },
            );
          }
          result = await service.rejectRequest(requestId, bodyReason, actorId);
          break;

        case "cancel":
          if (dsarRequest.userId !== actorId && !isAdmin) {
            return NextResponse.json(
              { success: false, error: "Unauthorized" },
              { status: 403 },
            );
          }
          result = await service.cancelRequest(
            requestId,
            bodyReason || "User cancelled",
            actorId,
          );
          break;

        case "extend":
          if (!isAdmin) {
            return NextResponse.json(
              { success: false, error: "Unauthorized" },
              { status: 403 },
            );
          }
          result = await service.requestExtension(
            requestId,
            bodyReason,
            actorId,
          );
          break;

        case "assign":
          if (!isAdmin) {
            return NextResponse.json(
              { success: false, error: "Unauthorized" },
              { status: 403 },
            );
          }
          result = await service.assignRequest(
            requestId,
            bodyAssigneeId,
            actorId,
          );
          break;

        case "close":
          if (!isAdmin) {
            return NextResponse.json(
              { success: false, error: "Unauthorized" },
              { status: 403 },
            );
          }
          result = await service.closeRequest(requestId, actorId);
          break;

        case "deliver":
          if (!isAdmin) {
            return NextResponse.json(
              { success: false, error: "Unauthorized" },
              { status: 403 },
            );
          }
          result = await service.markDelivered(
            requestId,
            body.downloadUrl,
            actorId,
          );
          break;

        case "download":
          result = await service.recordDownload(requestId, {
            ipAddress: request.headers.get("x-forwarded-for") || undefined,
            userAgent: request.headers.get("user-agent") || undefined,
          });
          break;

        case "resend_verification":
          result = await service.resendVerification(requestId);
          break;

        default:
          return NextResponse.json(
            { success: false, error: `Unknown action: ${action}` },
            { status: 400 },
          );
      }

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: true,
        request: result.data,
        message: `Action '${action}' completed successfully`,
      });
    }

    // Handle general updates
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const updateInput: UpdateDSARInput = {
      status: updates.status,
      priority: updates.priority,
      assignedTo: updates.assignedTo,
      reviewNotes: updates.reviewNotes,
      notes: updates.notes,
      tags: updates.tags,
    };

    const result = await service.updateRequest(
      requestId,
      updateInput,
      actorId,
      actorEmail || undefined,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      request: result.data,
      message: "Request updated successfully",
    });
  } catch (error) {
    logger.error("Error updating DSAR request:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update DSAR request",
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
 * DELETE /api/compliance/dsar?id=<requestId>
 * Cancel a DSAR request (alias for PATCH with action=cancel)
 */
export async function DELETE(request: NextRequest) {
  try {
    const service = await getService();
    const requestId = request.nextUrl.searchParams.get("id");
    const actorId = request.headers.get("x-user-id") || "system";
    const isAdmin = request.headers.get("x-user-role") === "admin";

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "Request ID is required" },
        { status: 400 },
      );
    }

    const dsarRequest = service.getRequest(requestId);
    if (!dsarRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 },
      );
    }

    // Check authorization
    if (dsarRequest.userId !== actorId && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const result = await service.cancelRequest(
      requestId,
      "User requested cancellation",
      actorId,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "DSAR request cancelled successfully",
    });
  } catch (error) {
    logger.error("Error cancelling DSAR request:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cancel DSAR request",
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
