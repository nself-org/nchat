/**
 * CSRF Token API Route
 *
 * Provides CSRF tokens to clients for protecting state-changing requests.
 *
 * @endpoint GET /api/csrf - Get CSRF token
 */

import { NextRequest, NextResponse } from "next/server";
import { getCsrfTokenForClient, setCsrfToken } from "@/lib/security/csrf";
import { successResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/csrf
 *
 * Get a CSRF token for use in state-changing requests.
 * The token is also set in a secure HTTP-only cookie.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { token, headerName, cookieName } = getCsrfTokenForClient(request);

  const response = successResponse({
    csrfToken: token,
    headerName,
    cookieName,
    instructions: {
      usage: `Include the token in the ${headerName} header for POST, PUT, DELETE, and PATCH requests`,
      example: {
        headers: {
          [headerName]: token,
          "Content-Type": "application/json",
        },
      },
    },
  });

  // Set token in secure cookie
  setCsrfToken(response, token);

  return response;
}
