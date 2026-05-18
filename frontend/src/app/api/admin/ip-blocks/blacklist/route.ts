/**
 * IP Blacklist Management API
 *
 * Admin endpoint for managing IP blacklist.
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
 * POST /api/admin/ip-blocks/blacklist
 *
 * Add IP to blacklist (permanent block)
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

  await ipBlocker.addToBlacklist(body.ip);

  return successResponse({
    message: "IP added to blacklist successfully",
    ip: body.ip,
    note: "This IP is now permanently blocked",
  });
});

/**
 * DELETE /api/admin/ip-blocks/blacklist
 *
 * Remove IP from blacklist
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

  await ipBlocker.removeFromBlacklist(ip);

  return successResponse({
    message: "IP removed from blacklist successfully",
    ip,
  });
});
