/**
 * POST /api/plugins/apps/[id]/install - Install app into workspace
 * DELETE /api/plugins/apps/[id]/install - Uninstall app
 * PATCH /api/plugins/apps/[id]/install - Enable/disable installation
 *
 * App installation management endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAppRegistryService } from "@/services/plugins/app-registry.service";

const registryService = createAppRegistryService();

/**
 * POST /api/plugins/apps/[id]/install
 * Install app into a workspace.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { workspaceId, installedBy, grantedScopes } = body;

    if (!workspaceId || !installedBy) {
      return NextResponse.json(
        { error: "workspaceId and installedBy are required" },
        { status: 400 },
      );
    }

    const installation = registryService.installApp(
      id,
      workspaceId,
      installedBy,
      grantedScopes,
    );

    return NextResponse.json(installation, { status: 201 });
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
          "already installed",
        )
      ) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 409 },
        );
      }
      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "not approved",
        ) ||
        (error instanceof Error ? error.message : String(error)).includes(
          "not requested",
        )
      ) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 400 },
        );
      }
    }
    logger.error("Failed to install app:", error);
    return NextResponse.json(
      { error: "Failed to install app" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/plugins/apps/[id]/install
 * Uninstall app from a workspace.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await params; // Consume params
    const { searchParams } = new URL(request.url);
    const installationId = searchParams.get("installationId");

    if (!installationId) {
      return NextResponse.json(
        { error: "installationId query parameter is required" },
        { status: 400 },
      );
    }

    const installation = registryService.uninstallApp(installationId);
    return NextResponse.json(installation);
  } catch (error) {
    if (
      error instanceof Error &&
      (error instanceof Error ? error.message : String(error)).includes(
        "not found",
      )
    ) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 },
      );
    }
    logger.error("Failed to uninstall app:", error);
    return NextResponse.json(
      { error: "Failed to uninstall app" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/plugins/apps/[id]/install
 * Enable or disable an installation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await params;
    const body = await request.json();
    const { installationId, action } = body;

    if (!installationId || !action) {
      return NextResponse.json(
        { error: "installationId and action (enable/disable) are required" },
        { status: 400 },
      );
    }

    let installation;
    if (action === "enable") {
      installation = registryService.enableInstallation(installationId);
    } else if (action === "disable") {
      installation = registryService.disableInstallation(installationId);
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 },
      );
    }

    return NextResponse.json(installation);
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
        )
      ) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 400 },
        );
      }
    }
    logger.error("Failed to update installation:", error);
    return NextResponse.json(
      { error: "Failed to update installation" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
