/**
 * Evidence Export Detail API Routes
 *
 * GET /api/trust-safety/evidence/export/[id] - Get export by ID
 * GET /api/trust-safety/evidence/export/[id]/download - Download export package
 * POST /api/trust-safety/evidence/export/[id]/verify - Verify export package
 * POST /api/trust-safety/evidence/export/[id]/certificate - Generate verification certificate
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getEvidenceExportService,
  getEvidenceCollector,
} from "@/services/trust-safety";

const collector = getEvidenceCollector();
const exportService = getEvidenceExportService(undefined, collector);

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get export request by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);

    const exportRequest = exportService.getExportRequest(id);

    if (!exportRequest) {
      return NextResponse.json(
        { success: false, error: "Export request not found" },
        { status: 404 },
      );
    }

    // Check if client wants to download the package
    const download = searchParams.get("download") === "true";

    if (download && exportRequest.status === "completed") {
      const exportResult = exportService.getExportResult(id);

      if (!exportResult) {
        return NextResponse.json(
          { success: false, error: "Export result expired or not available" },
          { status: 404 },
        );
      }

      // Return full package as downloadable JSON
      const packageJson = JSON.stringify(exportResult, null, 2);

      return new NextResponse(packageJson, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="evidence-export-${id}.json"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      export: {
        id: exportRequest.id,
        requestedBy: exportRequest.requestedBy,
        requestedAt: exportRequest.requestedAt,
        format: exportRequest.format,
        status: exportRequest.status,
        progress: exportRequest.progress,
        evidenceIds: exportRequest.evidenceIds,
        includeCustodyChain: exportRequest.includeCustodyChain,
        includeVerification: exportRequest.includeVerification,
        redactSensitive: exportRequest.redactSensitive,
        resultHash: exportRequest.resultHash?.value,
        resultSizeBytes: exportRequest.resultSizeBytes,
        resultExpiresAt: exportRequest.resultExpiresAt,
        startedAt: exportRequest.startedAt,
        completedAt: exportRequest.completedAt,
        error: exportRequest.error,
      },
    });
  } catch (error) {
    console.error("Export retrieval error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve export" },
      { status: 500 },
    );
  }
}

/**
 * POST - Additional operations on export
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action } = body;

    const actorId =
      body.actorId || request.headers.get("x-user-id") || "system";
    const actorRole =
      body.actorRole || request.headers.get("x-user-role") || "system";

    switch (action) {
      case "verify": {
        const exportResult = exportService.getExportResult(id);

        if (!exportResult) {
          return NextResponse.json(
            { success: false, error: "Export result not found or expired" },
            { status: 404 },
          );
        }

        const verification = await exportService.verifyPackage(exportResult);

        return NextResponse.json({
          success: true,
          verification: {
            isValid: verification.isValid,
            checks: verification.checks,
            verifiedAt: new Date().toISOString(),
          },
        });
      }

      case "certificate": {
        const result = await exportService.generateVerificationCertificate(
          id,
          actorId,
          actorRole,
        );

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 },
          );
        }

        return NextResponse.json({
          success: true,
          certificate: JSON.parse(result.certificate),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Export operation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process export operation" },
      { status: 500 },
    );
  }
}
