/**
 * Privacy Consent API Routes
 *
 * GET /api/privacy/consent - Get consent status
 * POST /api/privacy/consent - Grant consent
 * DELETE /api/privacy/consent - Revoke consent
 *
 * @module app/api/privacy/consent
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import {
  getPrivacySettingsService,
  type DataCollectionCategory,
} from "@/lib/privacy";

const log = createLogger("PrivacyConsentAPI");

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const consentCategorySchema = z.enum([
  "essential",
  "analytics",
  "personalization",
  "marketing",
  "third_party",
]);

const grantConsentSchema = z.object({
  category: consentCategorySchema,
  granted: z.boolean(),
  reason: z.string().optional(),
});

const batchConsentSchema = z.object({
  consents: z.array(grantConsentSchema),
  acceptAll: z.boolean().optional(),
  rejectAll: z.boolean().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract user ID from request
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return request.headers.get("x-user-id");
  }
  return null;
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "0.0.0.0"
  );
}

/**
 * Get user agent
 */
function getUserAgent(request: NextRequest): string {
  return request.headers.get("user-agent") ?? "unknown";
}

// ============================================================================
// GET /api/privacy/consent
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

    const consentStatus = {
      analytics: {
        granted: settings.analyticsConsent,
        grantedAt: settings.analyticsConsentDate,
        mode: settings.analyticsMode,
      },
      dataCollection: settings.dataCollection.map((dc) => ({
        category: dc.category,
        enabled: dc.enabled,
        anonymize: dc.anonymize,
        description: dc.description,
      })),
      thirdParty: {
        integrations: settings.thirdPartySettings.allowIntegrations,
        analyticsSharing: settings.thirdPartySettings.allowAnalyticsSharing,
        aiProcessing: settings.thirdPartySettings.allowAIProcessing,
      },
    };

    log.info("Consent status retrieved", { userId });

    return NextResponse.json({
      success: true,
      data: consentStatus,
    });
  } catch (error) {
    log.error("Failed to get consent status", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to retrieve consent status",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/privacy/consent
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

    const body = await request.json();
    const validation = batchConsentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Invalid consent data",
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

    const { consents, acceptAll, rejectAll } = validation.data;
    let updatedSettings = service.getOrCreateSettings(userId);

    // Handle accept all / reject all
    if (acceptAll) {
      updatedSettings = service.grantAnalyticsConsent(userId, context);
      updatedSettings = service.updateSettings(
        userId,
        {
          dataCollection: [
            { category: "analytics", enabled: true },
            { category: "personalization", enabled: true },
            { category: "marketing", enabled: true },
            { category: "third_party", enabled: true },
          ],
          thirdPartySettings: {
            allowIntegrations: true,
            allowAnalyticsSharing: true,
            allowAIProcessing: true,
          },
        },
        context,
      );

      log.info("All consents accepted", { userId });

      return NextResponse.json({
        success: true,
        data: updatedSettings,
        message: "All consents granted",
      });
    }

    if (rejectAll) {
      updatedSettings = service.revokeAnalyticsConsent(userId, context);
      updatedSettings = service.updateSettings(
        userId,
        {
          dataCollection: [
            { category: "analytics", enabled: false },
            { category: "personalization", enabled: false },
            { category: "marketing", enabled: false },
            { category: "third_party", enabled: false },
          ],
          thirdPartySettings: {
            allowIntegrations: false,
            allowAnalyticsSharing: false,
            allowAIProcessing: false,
          },
        },
        context,
      );

      log.info("All non-essential consents rejected", { userId });

      return NextResponse.json({
        success: true,
        data: updatedSettings,
        message: "All non-essential consents revoked",
      });
    }

    // Handle individual consents
    const dataCollectionUpdates: Array<{
      category: DataCollectionCategory;
      enabled: boolean;
    }> = [];

    for (const consent of consents) {
      if (consent.category === "analytics") {
        if (consent.granted) {
          updatedSettings = service.grantAnalyticsConsent(userId, context);
        } else {
          updatedSettings = service.revokeAnalyticsConsent(userId, context);
        }
      } else {
        dataCollectionUpdates.push({
          category: consent.category as DataCollectionCategory,
          enabled: consent.granted,
        });
      }
    }

    if (dataCollectionUpdates.length > 0) {
      updatedSettings = service.updateSettings(
        userId,
        {
          dataCollection: dataCollectionUpdates,
        },
        context,
      );
    }

    log.info("Consents updated", { userId, count: consents.length });

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: `${consents.length} consent(s) updated`,
    });
  } catch (error) {
    log.error("Failed to update consents", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update consents" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/privacy/consent
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "User authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const service = getPrivacySettingsService();
    const context = {
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    };

    let updatedSettings = service.getOrCreateSettings(userId);

    if (!category || category === "all") {
      // Revoke all non-essential consents
      updatedSettings = service.revokeAnalyticsConsent(userId, context);
      updatedSettings = service.updateSettings(
        userId,
        {
          dataCollection: [
            { category: "analytics", enabled: false },
            { category: "personalization", enabled: false },
            { category: "marketing", enabled: false },
            { category: "third_party", enabled: false },
          ],
        },
        context,
      );

      log.info("All consents revoked", { userId });

      return NextResponse.json({
        success: true,
        data: updatedSettings,
        message: "All non-essential consents revoked",
      });
    }

    // Revoke specific category
    const categoryValidation = consentCategorySchema.safeParse(category);
    if (!categoryValidation.success) {
      return NextResponse.json(
        { error: "Validation Error", message: "Invalid consent category" },
        { status: 400 },
      );
    }

    if (categoryValidation.data === "essential") {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Essential consent cannot be revoked",
        },
        { status: 400 },
      );
    }

    if (categoryValidation.data === "analytics") {
      updatedSettings = service.revokeAnalyticsConsent(userId, context);
    } else {
      updatedSettings = service.updateSettings(
        userId,
        {
          dataCollection: [
            { category: categoryValidation.data, enabled: false },
          ],
        },
        context,
      );
    }

    log.info("Consent revoked", { userId, category: categoryValidation.data });

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: `${category} consent revoked`,
    });
  } catch (error) {
    log.error("Failed to revoke consent", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to revoke consent" },
      { status: 500 },
    );
  }
}
