/**
 * QR Code API Routes
 *
 * Handles QR code generation for profile sharing.
 *
 * GET /api/users/me/qrcode - Generate QR code for profile sharing
 *
 * @module app/api/users/me/qrcode
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/api/response";
import {
  withAuth,
  withErrorHandler,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
  type RouteContext,
} from "@/lib/api/middleware";
import { logger } from "@/lib/logger";
import { profileService } from "@/services/profile";

// ============================================================================
// Validation Schemas
// ============================================================================

const QRStyleSchema = z.enum(["default", "minimal", "branded"]);

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/users/me/qrcode
 *
 * Generate QR code for profile sharing
 * Query params:
 * - style: 'default' | 'minimal' | 'branded' (optional)
 */
async function getHandler(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = request.user.id;
  const searchParams = request.nextUrl.searchParams;
  const styleParam = searchParams.get("style") || "default";

  // Validate style
  const styleValidation = QRStyleSchema.safeParse(styleParam);
  const style = styleValidation.success ? styleValidation.data : "default";

  try {
    const qrCode = await profileService.generateQRCode(userId, style);

    if (!qrCode) {
      return errorResponse(
        "Failed to generate QR code",
        "GENERATION_FAILED",
        500,
      );
    }

    return successResponse({ qrCode });
  } catch (error) {
    logger.error("[QRCode] Error generating QR code:", error);
    return errorResponse("Failed to generate QR code", "INTERNAL_ERROR", 500);
  }
}

// ============================================================================
// Exports
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 20, window: 60 }),
  withAuth,
)(getHandler);
