/**
 * POST /api/plugins/apps/[id]/tokens - Issue new tokens
 * DELETE /api/plugins/apps/[id]/tokens - Revoke tokens
 * GET /api/plugins/apps/[id]/tokens - List tokens
 *
 * Token management endpoint for app authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAppRegistryService } from "@/services/plugins/app-registry.service";

const registryService = createAppRegistryService();

/**
 * POST /api/plugins/apps/[id]/tokens
 * Issue access and refresh tokens.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { clientSecret, installationId, scopes } = body;

    if (!clientSecret || !installationId) {
      return NextResponse.json(
        { error: "clientSecret and installationId are required" },
        { status: 400 },
      );
    }

    const response = registryService.issueTokens({
      appId: id,
      clientSecret,
      installationId,
      scopes,
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "Invalid client secret",
        )
      ) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 401 },
        );
      }
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
          "exceeds",
        ) ||
        (error instanceof Error ? error.message : String(error)).includes(
          "not active",
        )
      ) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 403 },
        );
      }
    }
    logger.error("Failed to issue tokens:", error);
    return NextResponse.json(
      { error: "Failed to issue tokens" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/plugins/apps/[id]/tokens
 * List tokens for an app.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tokens = registryService.listTokens({ appId: id });

    // Sanitize: never expose full token values in list responses
    const sanitized = tokens.map((t) => ({
      id: t.id,
      type: t.type,
      appId: t.appId,
      installationId: t.installationId,
      scopes: t.scopes,
      expiresAt: t.expiresAt,
      issuedAt: t.issuedAt,
      revoked: t.revoked,
      revokedAt: t.revokedAt,
      tokenPrefix: t.token.substring(0, 12) + "...",
    }));

    return NextResponse.json({ tokens: sanitized, total: sanitized.length });
  } catch (error) {
    logger.error("Failed to list tokens:", error);
    return NextResponse.json(
      { error: "Failed to list tokens" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/plugins/apps/[id]/tokens
 * Revoke a specific token or all tokens.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const tokenValue = searchParams.get("token");
    const revokeAll = searchParams.get("all") === "true";

    if (revokeAll) {
      const count = registryService.revokeAllTokens(id);
      return NextResponse.json({ revoked: count });
    }

    if (!tokenValue) {
      return NextResponse.json(
        { error: "token query parameter is required (or use all=true)" },
        { status: 400 },
      );
    }

    registryService.revokeToken(tokenValue);
    return NextResponse.json({ revoked: true });
  } catch (error) {
    if (
      error instanceof Error &&
      (error instanceof Error ? error.message : String(error)).includes(
        "Invalid token",
      )
    ) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 },
      );
    }
    logger.error("Failed to revoke token:", error);
    return NextResponse.json(
      { error: "Failed to revoke token" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
