/**
 * IP Whitelist Management API
 *
 * Admin endpoint for managing IP whitelist.
 */

import {
  compose,
  withErrorHandler,
  withAuth,
  withAdmin,
  AuthenticatedRequest,
  RouteContext,
  ApiError,
} from "@/lib/api/middleware";
import { successResponse } from "@/lib/api/response";
import { ipBlocker } from "@/lib/security/ip-blocker";

/**
 * POST /api/admin/ip-blocks/whitelist
 *
 * Add IP to whitelist
 */
export const POST = compose(
  withErrorHandler,
  withAuth,
  withAdmin,
)(async (request: AuthenticatedRequest, context: RouteContext) => {
  const body = await request.json();

  if (!body.ip) {
    throw new ApiError("IP address is required", "MISSING_IP", 400);
  }

  // Validate IP format
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(body.ip)) {
    throw new ApiError("Invalid IP address format", "INVALID_IP", 400);
  }

  await ipBlocker.addToWhitelist(body.ip);

  return successResponse({
    message: "IP added to whitelist successfully",
    ip: body.ip,
  });
});

/**
 * DELETE /api/admin/ip-blocks/whitelist
 *
 * Remove IP from whitelist
 */
export const DELETE = compose(
  withErrorHandler,
  withAuth,
  withAdmin,
)(async (request: AuthenticatedRequest, context: RouteContext) => {
  const { searchParams } = new URL(request.url);
  const ip = searchParams.get("ip");

  if (!ip) {
    throw new ApiError("IP address is required", "MISSING_IP", 400);
  }

  await ipBlocker.removeFromWhitelist(ip);

  return successResponse({
    message: "IP removed from whitelist successfully",
    ip,
  });
});
