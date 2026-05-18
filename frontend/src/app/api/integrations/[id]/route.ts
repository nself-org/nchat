/**
 * Integration Instance API
 *
 * GET /api/integrations/:id - Get integration details
 * PATCH /api/integrations/:id - Configure integration
 * DELETE /api/integrations/:id - Uninstall integration
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIntegrationService } from "@/services/integrations/integration.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const service = getIntegrationService();
    const installation = service.getInstallation(id);

    if (!installation) {
      return NextResponse.json(
        { success: false, error: `Installation "${id}" not found` },
        { status: 404 },
      );
    }

    const health = service.getHealth(id);
    const metrics = service.getMetrics(id);

    return NextResponse.json({
      success: true,
      data: {
        ...installation,
        health,
        metrics,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Failed to fetch integration";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, config } = body as {
      action?: string;
      config?: Record<string, unknown>;
    };

    const service = getIntegrationService();

    let installation;
    switch (action) {
      case "enable":
        installation = await service.enable(id);
        break;
      case "disable":
        installation = await service.disable(id);
        break;
      default:
        if (config) {
          installation = await service.configure(id, config);
        } else {
          return NextResponse.json(
            { success: false, error: "Missing action or config" },
            { status: 400 },
          );
        }
    }

    return NextResponse.json({ success: true, data: installation });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Failed to update integration";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const service = getIntegrationService();
    await service.uninstall(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Failed to uninstall integration";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
