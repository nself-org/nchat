/**
 * SSO Connection Test API Route
 *
 * Tests an SSO connection configuration.
 *
 * POST /api/auth/sso/[id]/test - Test connection configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { testSSOConnection, getSAMLService } from "@/lib/auth/saml";
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/auth/sso/[id]/test - Test connection configuration
 */
export async function POST(
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

    // Run connection test
    const result = await testSSOConnection(id);

    logger.info(
      `[SSO] Tested SSO connection: ${connection.name} - ${result.success ? "success" : "failed"}`,
    );

    return successResponse({
      connectionId: id,
      connectionName: connection.name,
      ...result,
    });
  } catch (error) {
    logger.error("Test SSO connection error:", error);
    return internalErrorResponse("Failed to test SSO connection");
  }
}
