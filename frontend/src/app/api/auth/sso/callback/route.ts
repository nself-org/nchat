/**
 * SSO SAML Callback API Route
 *
 * Handles SAML assertion callback from Identity Provider.
 *
 * POST /api/auth/sso/callback - Process SAML response
 */

import { NextRequest, NextResponse } from "next/server";
import { getSAMLService } from "@/lib/auth/saml";
import { withErrorHandler, compose } from "@/lib/api/middleware";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/sso/callback - Process SAML response
 *
 * This endpoint receives the SAML response from the Identity Provider.
 * The response is typically sent via HTTP POST binding.
 */
async function handleSAMLCallback(request: NextRequest): Promise<NextResponse> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  try {
    // Parse form data (SAML responses come as form-urlencoded)
    const formData = await request.formData();
    const samlResponse = formData.get("SAMLResponse") as string;
    const relayState = formData.get("RelayState") as string;

    if (!samlResponse) {
      logger.error("[SSO] No SAMLResponse in callback");
      const errorUrl = new URL("/login", baseUrl);
      errorUrl.searchParams.set("error", "Invalid SAML response");
      return NextResponse.redirect(errorUrl);
    }

    // Parse relay state to get connection ID and return URL
    let connectionId: string | undefined;
    let returnUrl = "/chat";

    if (relayState) {
      try {
        // RelayState might be a URL or JSON-encoded data
        if (relayState.startsWith("/") || relayState.startsWith("http")) {
          returnUrl = relayState;
        } else {
          // Try to parse as JSON
          const relayData = JSON.parse(
            Buffer.from(relayState, "base64").toString(),
          );
          connectionId = relayData.connectionId;
          returnUrl = relayData.returnUrl || "/chat";
        }
      } catch {
        // If parsing fails, use relay state as return URL
        returnUrl = relayState;
      }
    }

    // Get connection ID from query params if not in relay state
    const { searchParams } = new URL(request.url);
    connectionId =
      connectionId || searchParams.get("connectionId") || undefined;

    if (!connectionId) {
      logger.error("[SSO] No connection ID in callback");
      const errorUrl = new URL("/login", baseUrl);
      errorUrl.searchParams.set("error", "Missing SSO connection information");
      return NextResponse.redirect(errorUrl);
    }

    const service = getSAMLService();

    // Process the SAML assertion
    const result = await service.processAssertion(connectionId, samlResponse);

    if (!result.success) {
      logger.error(`[SSO] SAML assertion failed: ${result.error}`);
      const errorUrl = new URL("/login", baseUrl);
      errorUrl.searchParams.set(
        "error",
        result.error || "SSO authentication failed",
      );
      if (result.errorCode) {
        errorUrl.searchParams.set("errorCode", result.errorCode);
      }
      return NextResponse.redirect(errorUrl);
    }

    // Successfully authenticated
    const user = result.user!;

    logger.info(
      `[SSO] SSO login successful for user: ${user.email} (${user.isNewUser ? "new" : "existing"})`,
    );

    // Create session and redirect
    // In a real implementation, this would:
    // 1. Create/update user session in the database
    // 2. Set session cookie
    // 3. Redirect to the application

    // For now, redirect with success parameters
    // The frontend should handle session creation via Nhost
    const successUrl = new URL(returnUrl, baseUrl);
    successUrl.searchParams.set("sso_success", "true");
    successUrl.searchParams.set("user_id", user.id);
    successUrl.searchParams.set("is_new_user", String(user.isNewUser));

    // Set a temporary SSO token that can be exchanged for a session
    // This should be handled by the frontend auth context
    const response = NextResponse.redirect(successUrl);

    // Set SSO authentication cookie (temporary, should be exchanged for proper session)
    response.cookies.set(
      "sso_auth_pending",
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
        timestamp: Date.now(),
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 300, // 5 minutes to complete auth
        path: "/",
      },
    );

    return response;
  } catch (error) {
    logger.error("[SSO] SAML callback error:", error);

    const errorUrl = new URL("/login", baseUrl);
    errorUrl.searchParams.set("error", "SSO authentication failed");
    return NextResponse.redirect(errorUrl);
  }
}

export const POST = compose(withErrorHandler)(handleSAMLCallback);

// Also support GET for some IdPs that use HTTP-Redirect binding
export const GET = compose(withErrorHandler)(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const samlResponse = searchParams.get("SAMLResponse");

  if (!samlResponse) {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const errorUrl = new URL("/login", baseUrl);
    errorUrl.searchParams.set("error", "Invalid SAML response");
    return NextResponse.redirect(errorUrl);
  }

  // Convert GET params to form data for unified processing
  const formData = new FormData();
  formData.set("SAMLResponse", samlResponse);
  if (searchParams.has("RelayState")) {
    formData.set("RelayState", searchParams.get("RelayState")!);
  }

  // Create a new request with the form data
  const newRequest = new NextRequest(request.url, {
    method: "POST",
    body: formData,
  });

  return handleSAMLCallback(newRequest);
});
