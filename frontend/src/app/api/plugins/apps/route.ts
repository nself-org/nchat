/**
 * GET /api/plugins/apps - List registered apps
 * POST /api/plugins/apps - Register a new app
 *
 * CRUD endpoint for app registration and listing.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAppRegistryService } from "@/services/plugins/app-registry.service";

// Singleton service instance for the module
const registryService = createAppRegistryService();

/**
 * GET /api/plugins/apps
 * List registered apps, optionally filtered by status.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as
      | "pending_review"
      | "approved"
      | "rejected"
      | "suspended"
      | null;

    const apps = registryService.listApps(status ? { status } : undefined);

    // Sanitize: never expose client secrets in list responses
    const sanitized = apps.map((app) => ({
      id: app.id,
      manifest: app.manifest,
      status: app.status,
      registeredBy: app.registeredBy,
      registeredAt: app.registeredAt,
      updatedAt: app.updatedAt,
      rejectionReason: app.rejectionReason,
    }));

    return NextResponse.json({ apps: sanitized, total: sanitized.length });
  } catch (error) {
    logger.error("Failed to list apps:", error);
    return NextResponse.json({ error: "Failed to list apps" }, { status: 500 });
  }
}

/**
 * POST /api/plugins/apps
 * Register a new app with its manifest.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { manifest, registeredBy } = body;

    if (!manifest) {
      return NextResponse.json(
        { error: "manifest is required" },
        { status: 400 },
      );
    }

    if (!registeredBy) {
      return NextResponse.json(
        { error: "registeredBy is required" },
        { status: 400 },
      );
    }

    // Validate manifest first
    const validation = registryService.validateManifest(manifest);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid manifest", details: validation.errors },
        { status: 400 },
      );
    }

    const app = registryService.registerApp(manifest, registeredBy);

    return NextResponse.json(
      {
        id: app.id,
        manifest: app.manifest,
        status: app.status,
        clientSecret: app.clientSecret, // Only returned at registration
        registeredAt: app.registeredAt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error instanceof Error ? error.message : String(error)).includes(
        "already registered",
      )
    ) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 409 },
      );
    }
    logger.error("Failed to register app:", error);
    return NextResponse.json(
      { error: "Failed to register app" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
