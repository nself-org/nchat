/**
 * Installed Integrations API
 *
 * GET /api/integrations/installed - List installed integrations
 * POST /api/integrations/installed - Install a new integration
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIntegrationService } from "@/services/integrations/integration.service";
import type {
  ConnectorConfig,
  ConnectorCredentials,
} from "@/lib/integrations/catalog/types";

export async function GET() {
  try {
    const service = getIntegrationService();
    const installed = service.getInstalled();

    return NextResponse.json({
      success: true,
      data: installed,
      total: installed.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Failed to fetch installed integrations";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { catalogId, config, credentials } = body as {
      catalogId: string;
      config: ConnectorConfig;
      credentials: ConnectorCredentials;
    };

    if (!catalogId || !config || !credentials) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: catalogId, config, credentials",
        },
        { status: 400 },
      );
    }

    const service = getIntegrationService();
    const installation = await service.install(catalogId, config, credentials);

    return NextResponse.json(
      { success: true, data: installation },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Failed to install integration";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
