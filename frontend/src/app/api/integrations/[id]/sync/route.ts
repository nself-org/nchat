/**
 * Integration Sync API
 *
 * POST /api/integrations/:id/sync - Trigger sync for an integration
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIntegrationService } from "@/services/integrations/integration.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { fullResync, entityType } = body as {
      fullResync?: boolean;
      entityType?: string;
    };

    const service = getIntegrationService();

    const installation = service.getInstallation(id);
    if (!installation) {
      return NextResponse.json(
        { success: false, error: `Installation "${id}" not found` },
        { status: 404 },
      );
    }

    if (!installation.enabled) {
      return NextResponse.json(
        { success: false, error: `Installation "${id}" is not enabled` },
        { status: 400 },
      );
    }

    const results = await service.triggerSync(id, { fullResync, entityType });

    return NextResponse.json({
      success: true,
      data: {
        results,
        syncStatus: service.getSyncStatus(id, entityType || "default"),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Failed to trigger sync";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
