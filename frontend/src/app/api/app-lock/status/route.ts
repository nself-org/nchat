/**
 * App Lock Status API Route
 *
 * Provides lock status information and capability checks.
 *
 * Endpoints:
 * - GET /api/app-lock/status - Get platform capabilities and lock status hints
 *
 * Note: The actual lock state is managed client-side. This endpoint
 * provides server-side hints and capability information.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withAuth,
  withRateLimit,
  withErrorHandler,
  compose,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface PlatformCapabilities {
  supportsPin: boolean;
  supportsBiometric: boolean;
  supportsSecureStorage: boolean;
  supportsIdleDetection: boolean;
  supportsBackgroundDetection: boolean;
}

interface LockStatusResponse {
  capabilities: PlatformCapabilities;
  hints: {
    recommendBiometric: boolean;
    recommendPin: boolean;
    suggestIdleTimeout: boolean;
  };
  serverTime: string;
}

// ============================================================================
// Capability Detection
// ============================================================================

function detectCapabilitiesFromHeaders(
  request: NextRequest,
): PlatformCapabilities {
  const userAgent = request.headers.get("user-agent") || "";
  const platform =
    request.headers.get("sec-ch-ua-platform")?.replace(/"/g, "") || "";

  // Detect platform from user agent
  const isIOS = /iPhone|iPad|iPod/.test(userAgent) || platform === "iOS";
  const isAndroid = /Android/.test(userAgent) || platform === "Android";
  const isMacOS = /Macintosh|Mac OS X/.test(userAgent) || platform === "macOS";
  const isWindows = /Windows/.test(userAgent) || platform === "Windows";
  const isLinux =
    (/Linux/.test(userAgent) && !isAndroid) || platform === "Linux";

  // Check for Electron
  const isElectron = /Electron/.test(userAgent);

  // Check for Capacitor (mobile apps)
  const isCapacitor = request.headers.get("x-capacitor-app") === "true";

  // Determine capabilities
  const supportsBiometric =
    isIOS || isAndroid || (isMacOS && isElectron) || isWindows;
  const supportsSecureStorage =
    isIOS || isAndroid || isMacOS || isWindows || isElectron;

  return {
    supportsPin: true, // PIN is always supported
    supportsBiometric,
    supportsSecureStorage,
    supportsIdleDetection: true, // All platforms with JS support idle detection
    supportsBackgroundDetection: true,
  };
}

// ============================================================================
// GET Handler
// ============================================================================

async function handleGet(request: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const capabilities = detectCapabilitiesFromHeaders(request);

    // Generate hints based on capabilities
    const hints = {
      recommendBiometric: capabilities.supportsBiometric,
      recommendPin: true, // Always recommend PIN as fallback
      suggestIdleTimeout: true, // Always suggest for security
    };

    const response: LockStatusResponse = {
      capabilities,
      hints,
      serverTime: new Date().toISOString(),
    };

    return successResponse(response);
  } catch (error) {
    logger.error(
      "[AppLockStatus] Failed to get status",
      error instanceof Error ? error : new Error(String(error)),
    );
    return errorResponse(
      "Failed to get lock status",
      "STATUS_FETCH_FAILED",
      500,
    );
  }
}

// ============================================================================
// Exports
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 120, window: 60 }),
  withAuth,
)(handleGet);
