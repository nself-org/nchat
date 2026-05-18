/**
 * SSO Login Initiation API Route
 *
 * Initiates SAML SSO login flow.
 *
 * GET /api/auth/sso/login - Start SSO login
 * POST /api/auth/sso/login - Start SSO login with email detection
 */

import { NextRequest, NextResponse } from "next/server";
import { getSAMLService } from "@/lib/auth/saml";
import { withErrorHandler, compose } from "@/lib/api/middleware";
import {
  badRequestResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/sso/login - Start SSO login with connection ID
 *
 * Query params:
 * - connectionId: UUID of the SSO connection
 * - returnUrl: Optional URL to redirect after login
 */
async function handleGetLogin(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("connectionId");
    const returnUrl = searchParams.get("returnUrl") || "/chat";

    if (!connectionId) {
      return badRequestResponse("Connection ID is required");
    }

    const service = getSAMLService();

    // Generate SAML login URL
    const loginUrl = await service.initiateLogin(connectionId, returnUrl);

    logger.info(`[SSO] Initiating SSO login for connection: ${connectionId}`);

    // Redirect to IdP
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    logger.error("SSO login error:", error);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const errorUrl = new URL("/login", baseUrl);
    errorUrl.searchParams.set("error", "SSO login failed");

    return NextResponse.redirect(errorUrl);
  }
}

/**
 * POST /api/auth/sso/login - Start SSO login with email detection
 *
 * Body:
 * - email: User's email address (used to detect SSO connection by domain)
 * - returnUrl: Optional URL to redirect after login
 */
async function handlePostLogin(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, returnUrl = "/chat" } = body;

    if (!email) {
      return badRequestResponse("Email is required");
    }

    const service = getSAMLService();

    // Find SSO connection by email domain
    const connection = await service.getConnectionByDomain(email);

    if (!connection) {
      return notFoundResponse("No SSO connection found for this email domain");
    }

    if (!connection.enabled) {
      return badRequestResponse("SSO connection is disabled");
    }

    // Generate SAML login URL
    const loginUrl = await service.initiateLogin(connection.id, returnUrl);

    logger.info(
      `[SSO] Initiating SSO login via email domain: ${email.split("@")[1]}`,
    );

    // Return the login URL (client will redirect)
    return NextResponse.json({
      success: true,
      loginUrl,
      connectionId: connection.id,
      connectionName: connection.name,
      provider: connection.provider,
    });
  } catch (error) {
    logger.error("SSO login error:", error);
    return internalErrorResponse("Failed to initiate SSO login");
  }
}

export const GET = compose(withErrorHandler)(handleGetLogin);
export const POST = compose(withErrorHandler)(handlePostLogin);
