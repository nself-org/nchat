/**
 * GET /api/plugins/apps/[id] - Get app details
 * PATCH /api/plugins/apps/[id] - Update app (approve, reject, suspend, update version)
 * DELETE /api/plugins/apps/[id] - Delete app registration
 *
 * Single app management endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAppRegistryService } from "@/services/plugins/app-registry.service";

const registryService = createAppRegistryService();

/**
 * GET /api/plugins/apps/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const app = registryService.getApp(id);

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: app.id,
      manifest: app.manifest,
      status: app.status,
      registeredBy: app.registeredBy,
      registeredAt: app.registeredAt,
      updatedAt: app.updatedAt,
      rejectionReason: app.rejectionReason,
    });
  } catch (error) {
    logger.error("Failed to get app:", error);
    return NextResponse.json({ error: "Failed to get app" }, { status: 500 });
  }
}

/**
 * PATCH /api/plugins/apps/[id]
 * Actions: approve, reject, suspend, resubmit, update_version
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, reason, manifest } = body;

    if (!action) {
      return NextResponse.json(
        {
          error:
            "action is required (approve, reject, suspend, resubmit, update_version)",
        },
        { status: 400 },
      );
    }

    let app;
    switch (action) {
      case "approve":
        app = registryService.approveApp(id);
        break;
      case "reject":
        if (!reason) {
          return NextResponse.json(
            { error: "reason is required for rejection" },
            { status: 400 },
          );
        }
        app = registryService.rejectApp(id, reason);
        break;
      case "suspend":
        if (!reason) {
          return NextResponse.json(
            { error: "reason is required for suspension" },
            { status: 400 },
          );
        }
        app = registryService.suspendApp(id, reason);
        break;
      case "resubmit":
        if (!manifest) {
          return NextResponse.json(
            { error: "manifest is required for resubmission" },
            { status: 400 },
          );
        }
        app = registryService.resubmitApp(id, manifest);
        break;
      case "update_version":
        if (!manifest) {
          return NextResponse.json(
            { error: "manifest is required for version update" },
            { status: 400 },
          );
        }
        app = registryService.updateAppVersion(id, manifest);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({
      id: app.id,
      status: app.status,
      updatedAt: app.updatedAt,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "not found",
        )
      ) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 404 },
        );
      }
      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "Cannot",
        ) ||
        (error instanceof Error ? error.message : String(error)).includes(
          "Invalid",
        )
      ) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 400 },
        );
      }
    }
    logger.error("Failed to update app:", error);
    return NextResponse.json(
      { error: "Failed to update app" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
