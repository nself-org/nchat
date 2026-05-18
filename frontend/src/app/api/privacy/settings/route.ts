/**
 * Privacy Settings API Routes
 *
 * GET /api/privacy/settings - Get current user's privacy settings
 * PUT /api/privacy/settings - Update privacy settings
 * POST /api/privacy/settings/reset - Reset to default settings
 *
 * @module app/api/privacy/settings
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import {
  getPrivacySettingsService,
  type PrivacyLevel,
  type AnalyticsMode,
  type UpdatePrivacySettingsInput,
} from "@/lib/privacy";

const log = createLogger("PrivacySettingsAPI");

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const privacyLevelSchema = z.enum([
  "minimal",
  "balanced",
  "strict",
  "maximum",
  "custom",
]);
const analyticsModeSchema = z.enum([
  "full",
  "anonymous",
  "aggregated",
  "disabled",
]);
const anonymizationStrategySchema = z.enum([
  "truncate",
  "hash",
  "geohash",
  "country_only",
  "remove",
  "none",
]);
const locationPrecisionSchema = z.enum([
  "exact",
  "city",
  "country",
  "disabled",
]);

const updateSettingsSchema = z.object({
  privacyLevel: privacyLevelSchema.optional(),
  analyticsMode: analyticsModeSchema.optional(),
  analyticsConsent: z.boolean().optional(),
  ipAnonymization: z
    .object({
      enabled: z.boolean().optional(),
      strategy: anonymizationStrategySchema.optional(),
    })
    .optional(),
  locationTracking: z
    .object({
      enabled: z.boolean().optional(),
      precision: locationPrecisionSchema.optional(),
    })
    .optional(),
  activityTracking: z
    .object({
      enabled: z.boolean().optional(),
      includeTimestamps: z.boolean().optional(),
      includeDuration: z.boolean().optional(),
      includeDeviceInfo: z.boolean().optional(),
    })
    .optional(),
  messageMetadata: z
    .object({
      storeReadReceipts: z.boolean().optional(),
      storeTypingIndicators: z.boolean().optional(),
      storeDeliveryStatus: z.boolean().optional(),
      retainEditHistory: z.boolean().optional(),
      retainDeletedMessages: z.boolean().optional(),
      retentionDays: z.number().min(1).max(730).optional(),
    })
    .optional(),
  sessionSettings: z
    .object({
      storeSessionHistory: z.boolean().optional(),
      storeDeviceInfo: z.boolean().optional(),
      storeLoginLocations: z.boolean().optional(),
      retentionDays: z.number().min(1).max(730).optional(),
    })
    .optional(),
  dataPortability: z
    .object({
      allowExport: z.boolean().optional(),
      exportFormat: z.enum(["json", "csv", "both"]).optional(),
      includeAttachments: z.boolean().optional(),
      includeMetadata: z.boolean().optional(),
    })
    .optional(),
  deletionSettings: z
    .object({
      autoDeleteMessages: z.boolean().optional(),
      autoDeleteAfterDays: z.number().min(1).max(730).optional(),
      deleteOnAccountClose: z.boolean().optional(),
      anonymizeOnDelete: z.boolean().optional(),
    })
    .optional(),
  thirdPartySettings: z
    .object({
      allowIntegrations: z.boolean().optional(),
      allowAnalyticsSharing: z.boolean().optional(),
      allowAIProcessing: z.boolean().optional(),
    })
    .optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract user ID from request (from auth context)
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  // In a real implementation, this would extract from JWT/session
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    // For development, allow X-User-Id header
    return request.headers.get("x-user-id");
  }

  // Parse JWT and extract user ID (simplified)
  // In production, use proper JWT validation
  return null;
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "0.0.0.0"
  );
}

/**
 * Get user agent from request
 */
function getUserAgent(request: NextRequest): string {
  return request.headers.get("user-agent") ?? "unknown";
}

// ============================================================================
// GET /api/privacy/settings
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "User authentication required" },
        { status: 401 },
      );
    }

    const service = getPrivacySettingsService();
    const settings = service.getOrCreateSettings(userId);

    log.info("Privacy settings retrieved", { userId });

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    log.error("Failed to get privacy settings", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to retrieve privacy settings",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT /api/privacy/settings
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "User authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validation = updateSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Invalid settings data",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const service = getPrivacySettingsService();
    const context = {
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    };

    const settings = service.updateSettings(
      userId,
      validation.data as UpdatePrivacySettingsInput,
      context,
    );

    log.info("Privacy settings updated", { userId });

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    log.error("Failed to update privacy settings", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to update privacy settings",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/privacy/settings (Reset)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "User authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action !== "reset") {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: 'Invalid action. Use action: "reset"',
        },
        { status: 400 },
      );
    }

    const privacyLevel = privacyLevelSchema.safeParse(body?.privacyLevel);
    const level: PrivacyLevel = privacyLevel.success
      ? privacyLevel.data
      : "balanced";

    const service = getPrivacySettingsService();
    const context = {
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    };

    // Delete existing settings
    service.deleteSettings(userId);

    // Create new settings with specified level
    const settings = service.getOrCreateSettings(userId);
    const updatedSettings = service.setPrivacyLevel(userId, level, context);

    log.info("Privacy settings reset", { userId, level });

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: `Privacy settings reset to ${level} level`,
    });
  } catch (error) {
    log.error("Failed to reset privacy settings", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to reset privacy settings",
      },
      { status: 500 },
    );
  }
}
