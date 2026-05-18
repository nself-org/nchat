/**
 * IP Blocks Management API
 *
 * Admin endpoint for managing IP blocks, whitelist, and blacklist.
 *
 * Requires admin role.
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
import type { BlockedIP } from "@/lib/security/ip-blocker";

/**
 * GET /api/admin/ip-blocks
 *
 * Get all blocked IPs, whitelist, and blacklist
 */
export const GET = compose(
  withErrorHandler,
  withAuth,
  withAdmin,
)(async (request: AuthenticatedRequest, context: RouteContext) => {
  const [blocked, whitelist, blacklist] = await Promise.all([
    ipBlocker.getAllBlockedIPs(),
    ipBlocker.getWhitelist(),
    ipBlocker.getBlacklist(),
  ]);

  // Format blocked IPs for response
  const formattedBlocked = blocked.map((block: BlockedIP) => ({
    ip: block.ip,
    reason: block.reason,
    blockedAt: new Date(block.blockedAt).toISOString(),
    expiresAt: block.expiresAt ? new Date(block.expiresAt).toISOString() : null,
    blockType: block.blockType,
    timeRemaining: block.expiresAt
      ? Math.max(0, Math.ceil((block.expiresAt - Date.now()) / 1000))
      : null,
    metadata: block.metadata,
  }));

  // Calculate stats
  const now = Date.now();
  const stats = {
    totalBlocked: blocked.length,
    temporaryBlocks: blocked.filter((b) => b.blockType === "temporary").length,
    permanentBlocks: blocked.filter((b) => b.blockType === "permanent").length,
    expiringWithin1Hour: blocked.filter(
      (b) => b.expiresAt && b.expiresAt - now < 3600000,
    ).length,
    totalWhitelisted: whitelist.length,
    totalBlacklisted: blacklist.length,
  };

  return successResponse({
    blocked: formattedBlocked,
    whitelist,
    blacklist,
    stats,
  });
});

/**
 * POST /api/admin/ip-blocks
 *
 * Block an IP address
 *
 * Body:
 * {
 *   "ip": "192.168.1.1",
 *   "reason": "Abuse detected",
 *   "duration": 3600,  // seconds (0 = permanent)
 *   "metadata": {}
 * }
 */
export const POST = compose(
  withErrorHandler,
  withAuth,
  withAdmin,
)(async (request: AuthenticatedRequest, context: RouteContext) => {
  const body = await request.json();

  // Validate request
  if (!body.ip) {
    throw new ApiError("IP address is required", "MISSING_IP", 400);
  }

  if (!body.reason) {
    throw new ApiError("Reason is required", "MISSING_REASON", 400);
  }

  // Validate IP format
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(body.ip)) {
    throw new ApiError("Invalid IP address format", "INVALID_IP", 400);
  }

  const duration = body.duration || 0; // 0 = permanent
  const metadata = {
    ...body.metadata,
    blockedBy: {
      id: request.user.id,
      email: request.user.email,
      role: request.user.role,
    },
    blockedVia: "admin_api",
  };

  await ipBlocker.blockIP(body.ip, body.reason, duration, metadata);

  return successResponse(
    {
      message: "IP blocked successfully",
      ip: body.ip,
      reason: body.reason,
      duration,
      blockType: duration === 0 ? "permanent" : "temporary",
      expiresAt:
        duration > 0
          ? new Date(Date.now() + duration * 1000).toISOString()
          : null,
    },
    { status: 201 },
  );
});

/**
 * DELETE /api/admin/ip-blocks
 *
 * Unblock an IP address
 *
 * Query params:
 * - ip: IP address to unblock
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

  await ipBlocker.unblockIP(ip);

  return successResponse({
    message: "IP unblocked successfully",
    ip,
  });
});
