/**
 * Privacy Data Export API Route
 *
 * POST /api/privacy/export - Request data export
 * GET /api/privacy/export - Get export status
 *
 * @module app/api/privacy/export
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { getPrivacySettingsService } from "@/lib/privacy";

const log = createLogger("PrivacyExportAPI");

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const exportRequestSchema = z.object({
  format: z.enum(["json", "csv", "both"]).optional().default("json"),
  includeAttachments: z.boolean().optional().default(false),
  includeMetadata: z.boolean().optional().default(true),
  categories: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

interface ExportRequest {
  id: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed" | "expired";
  format: "json" | "csv" | "both";
  includeAttachments: boolean;
  includeMetadata: boolean;
  categories?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  downloadUrl?: string;
  fileSize?: number;
  errorMessage?: string;
}

// In-memory store for demo (would be database in production)
const exportRequests = new Map<string, ExportRequest>();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract user ID from request
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return request.headers.get("x-user-id");
  }
  return null;
}

/**
 * Generate unique export ID
 */
function generateExportId(): string {
  return `export_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

// ============================================================================
// POST /api/privacy/export
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "User authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = exportRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Invalid export request",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    // Check user's privacy settings for export permissions
    const privacyService = getPrivacySettingsService();
    const settings = privacyService.getOrCreateSettings(userId);

    if (!settings.dataPortability.allowExport) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Data export is not enabled in your privacy settings",
        },
        { status: 403 },
      );
    }

    // Check for existing pending exports
    const pendingExport = Array.from(exportRequests.values()).find(
      (e) =>
        e.userId === userId &&
        (e.status === "pending" || e.status === "processing"),
    );

    if (pendingExport) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "An export request is already in progress",
          existingRequestId: pendingExport.id,
        },
        { status: 409 },
      );
    }

    const {
      format,
      includeAttachments,
      includeMetadata,
      categories,
      dateFrom,
      dateTo,
    } = validation.data;

    const exportRequest: ExportRequest = {
      id: generateExportId(),
      userId,
      status: "pending",
      format,
      includeAttachments:
        includeAttachments && settings.dataPortability.includeAttachments,
      includeMetadata:
        includeMetadata && settings.dataPortability.includeMetadata,
      categories,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      createdAt: new Date(),
    };

    exportRequests.set(exportRequest.id, exportRequest);

    // In production, this would trigger an async job
    // For demo, we'll simulate processing
    setTimeout(() => {
      const req = exportRequests.get(exportRequest.id);
      if (req) {
        req.status = "processing";
        // Simulate completion after a delay
        setTimeout(() => {
          if (req) {
            req.status = "completed";
            req.completedAt = new Date();
            req.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            req.downloadUrl = `/api/privacy/export/${req.id}/download`;
            req.fileSize = Math.floor(Math.random() * 10000000) + 1000; // Random size for demo
          }
        }, 2000);
      }
    }, 1000);

    log.info("Export request created", { userId, exportId: exportRequest.id });

    return NextResponse.json({
      success: true,
      data: {
        id: exportRequest.id,
        status: exportRequest.status,
        createdAt: exportRequest.createdAt,
        estimatedCompletionTime: "5-10 minutes",
        message:
          "Your data export request has been submitted. You will be notified when it is ready.",
      },
    });
  } catch (error) {
    log.error("Failed to create export request", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to create export request",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET /api/privacy/export
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "User authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const exportId = searchParams.get("id");

    // Get specific export request
    if (exportId) {
      const exportRequest = exportRequests.get(exportId);

      if (!exportRequest) {
        return NextResponse.json(
          { error: "Not Found", message: "Export request not found" },
          { status: 404 },
        );
      }

      if (exportRequest.userId !== userId) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message: "Access denied to this export request",
          },
          { status: 403 },
        );
      }

      return NextResponse.json({
        success: true,
        data: exportRequest,
      });
    }

    // List all export requests for user
    const userExports = Array.from(exportRequests.values())
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    log.info("Export requests listed", { userId, count: userExports.length });

    return NextResponse.json({
      success: true,
      data: userExports,
      total: userExports.length,
    });
  } catch (error) {
    log.error("Failed to get export requests", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to get export requests",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/privacy/export (Cancel pending export)
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "User authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const exportId = searchParams.get("id");

    if (!exportId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Export ID is required" },
        { status: 400 },
      );
    }

    const exportRequest = exportRequests.get(exportId);

    if (!exportRequest) {
      return NextResponse.json(
        { error: "Not Found", message: "Export request not found" },
        { status: 404 },
      );
    }

    if (exportRequest.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden", message: "Access denied to this export request" },
        { status: 403 },
      );
    }

    if (
      exportRequest.status !== "pending" &&
      exportRequest.status !== "processing"
    ) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Only pending or processing exports can be cancelled",
        },
        { status: 400 },
      );
    }

    exportRequests.delete(exportId);

    log.info("Export request cancelled", { userId, exportId });

    return NextResponse.json({
      success: true,
      message: "Export request cancelled",
    });
  } catch (error) {
    log.error("Failed to cancel export request", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to cancel export request",
      },
      { status: 500 },
    );
  }
}
