/**
 * Integration Catalog API
 *
 * GET /api/integrations/catalog - List available integrations
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIntegrationService } from "@/services/integrations/integration.service";
import type { IntegrationCatalogCategory } from "@/lib/integrations/catalog/types";

export async function GET(request: NextRequest) {
  try {
    const service = getIntegrationService();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get(
      "category",
    ) as IntegrationCatalogCategory | null;
    const query = searchParams.get("q");

    let catalog;
    if (query) {
      catalog = service.searchCatalog(query);
    } else if (category) {
      catalog = service.filterByCategory(category);
    } else {
      catalog = service.getCatalog();
    }

    return NextResponse.json({
      success: true,
      data: catalog,
      total: catalog.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Failed to fetch catalog";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
