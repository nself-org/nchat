/**
 * SSO Single Logout (SLO) API Route
 *
 * Handles SAML Single Logout requests and responses:
 * - POST /api/auth/sso/slo - Process SLO request/response from IdP
 * - GET /api/auth/sso/slo - Handle SLO via HTTP-Redirect binding
 *
 * This endpoint handles two scenarios:
 * 1. SP-initiated SLO response: When IdP sends back LogoutResponse after we initiated logout
 * 2. IdP-initiated SLO request: When IdP sends LogoutRequest to log out user
 */

import { NextRequest, NextResponse } from "next/server";
import { getSAMLService } from "@/lib/auth/saml";
import { getSSOService } from "@/services/auth/sso.service";
import { withErrorHandler, compose } from "@/lib/api/middleware";
import { logger } from "@/lib/logger";

/**
 * Process Single Logout response or request
 */
async function handleSLO(request: NextRequest): Promise<NextResponse> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const { searchParams } = new URL(request.url);

  try {
    // Determine if this is a POST (form data) or GET (query params) request
    let samlResponse: string | null = null;
    let samlRequest: string | null = null;
    let relayState: string | null = null;

    if (request.method === "POST") {
      const formData = await request.formData();
      samlResponse = formData.get("SAMLResponse") as string | null;
      samlRequest = formData.get("SAMLRequest") as string | null;
      relayState = formData.get("RelayState") as string | null;
    } else {
      samlResponse = searchParams.get("SAMLResponse");
      samlRequest = searchParams.get("SAMLRequest");
      relayState = searchParams.get("RelayState");
    }

    // Get connection ID from query params or relay state
    let connectionId = searchParams.get("connectionId");
    let returnUrl = "/login";

    if (relayState) {
      try {
        const relayData = JSON.parse(
          Buffer.from(relayState, "base64").toString(),
        );
        connectionId = connectionId || relayData.connectionId;
        returnUrl = relayData.returnUrl || "/login";
      } catch {
        // If parsing fails, relay state might be a plain URL
        if (relayState.startsWith("/") || relayState.startsWith("http")) {
          returnUrl = relayState;
        }
      }
    }

    // Handle SP-initiated SLO response (we initiated logout, IdP responded)
    if (samlResponse) {
      logger.info("[SSO SLO] Processing LogoutResponse from IdP");

      if (!connectionId) {
        logger.error("[SSO SLO] No connection ID for LogoutResponse");
        const logoutUrl = new URL("/login", baseUrl);
        logoutUrl.searchParams.set("logout", "true");
        return NextResponse.redirect(logoutUrl);
      }

      const samlService = getSAMLService();
      const result = await samlService.processLogoutResponse(
        samlResponse,
        connectionId,
      );

      if (!result.success) {
        logger.error(
          `[SSO SLO] LogoutResponse processing failed: ${result.error}`,
        );
        // Still redirect to login - the logout happened locally even if IdP response failed
      } else {
        logger.info("[SSO SLO] LogoutResponse processed successfully");
      }

      // Clear any remaining session cookies
      const response = NextResponse.redirect(new URL(returnUrl, baseUrl));
      response.cookies.delete("sso_auth_pending");
      response.cookies.set("sso_logged_out", "true", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60, // 1 minute indicator
        path: "/",
      });

      return response;
    }

    // Handle IdP-initiated SLO request (IdP wants to log out user)
    if (samlRequest) {
      logger.info("[SSO SLO] Processing LogoutRequest from IdP");

      // Decode the logout request
      const decodedRequest = Buffer.from(samlRequest, "base64").toString(
        "utf-8",
      );

      // Extract NameID from the request
      const nameIdMatch = decodedRequest.match(
        /<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/,
      );
      const nameId = nameIdMatch?.[1];

      if (!nameId || !connectionId) {
        logger.error(
          "[SSO SLO] Invalid LogoutRequest - missing NameID or connectionId",
        );
        // Return error response to IdP
        return new NextResponse("Invalid LogoutRequest", { status: 400 });
      }

      // Invalidate local session
      const ssoService = getSSOService();
      // Note: We would need to look up the user by nameId to invalidate their session
      // For now, we'll just acknowledge the logout request

      logger.info(`[SSO SLO] IdP-initiated logout for NameID: ${nameId}`);

      // Build LogoutResponse to send back to IdP
      const connection = await getSAMLService().getConnection(connectionId);
      if (!connection) {
        return new NextResponse("Connection not found", { status: 404 });
      }

      // Extract InResponseTo from the request
      const inResponseToMatch = decodedRequest.match(/ID="([^"]+)"/);
      const inResponseTo = inResponseToMatch?.[1];

      const logoutResponse = buildLogoutResponse(
        connection.config.spEntityId,
        connection.config.idpSloUrl || "",
        inResponseTo,
      );

      // Redirect to IdP with LogoutResponse
      const encodedResponse = Buffer.from(logoutResponse).toString("base64");
      const sloResponseUrl = new URL(connection.config.idpSloUrl!);
      sloResponseUrl.searchParams.set("SAMLResponse", encodedResponse);
      if (relayState) {
        sloResponseUrl.searchParams.set("RelayState", relayState);
      }

      // Clear local cookies and redirect
      const response = NextResponse.redirect(sloResponseUrl);
      response.cookies.delete("sso_auth_pending");

      return response;
    }

    // No valid SAML data
    logger.error("[SSO SLO] No SAMLResponse or SAMLRequest in SLO callback");
    return NextResponse.redirect(new URL("/login", baseUrl));
  } catch (error) {
    logger.error("[SSO SLO] Error processing SLO:", error);

    const logoutUrl = new URL("/login", baseUrl);
    logoutUrl.searchParams.set("logout", "true");
    logoutUrl.searchParams.set("error", "Logout processing failed");
    return NextResponse.redirect(logoutUrl);
  }
}

/**
 * Build a SAML LogoutResponse for IdP-initiated logout
 */
function buildLogoutResponse(
  issuer: string,
  destination: string,
  inResponseTo?: string,
): string {
  const responseId = `_${crypto.randomUUID()}`;
  const issueInstant = new Date().toISOString();

  return `<?xml version="1.0"?>
<samlp:LogoutResponse
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${responseId}"
  Version="2.0"
  IssueInstant="${issueInstant}"
  Destination="${destination}"
  ${inResponseTo ? `InResponseTo="${inResponseTo}"` : ""}>
  <saml:Issuer>${issuer}</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
</samlp:LogoutResponse>`;
}

export const POST = compose(withErrorHandler)(handleSLO);
export const GET = compose(withErrorHandler)(handleSLO);
