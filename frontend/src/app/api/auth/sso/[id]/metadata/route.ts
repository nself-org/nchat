/**
 * SSO SP Metadata API Route
 *
 * Generates Service Provider (SP) metadata XML for SAML configuration.
 *
 * GET /api/auth/sso/[id]/metadata - Get SP metadata XML
 */

import { NextRequest, NextResponse } from "next/server";
import { getSAMLService } from "@/lib/auth/saml";
import { notFoundResponse, internalErrorResponse } from "@/lib/api/response";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/auth/sso/[id]/metadata - Get SP metadata XML
 *
 * This endpoint returns the Service Provider metadata XML that can be
 * imported into Identity Providers (like Okta, Azure AD, etc.)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const service = getSAMLService();
    const connection = await service.getConnection(id);

    if (!connection) {
      return notFoundResponse("SSO connection not found");
    }

    // Generate SP metadata XML
    const metadataXml = service.generateSPMetadata(connection);

    // Return as XML
    return new NextResponse(metadataXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="sp-metadata-${connection.name.toLowerCase().replace(/\s+/g, "-")}.xml"`,
      },
    });
  } catch (error) {
    logger.error("Get SP metadata error:", error);
    return internalErrorResponse("Failed to generate SP metadata");
  }
}
