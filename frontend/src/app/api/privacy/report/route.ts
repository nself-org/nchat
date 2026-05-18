/**
 * Privacy Report API Route
 *
 * GET /api/privacy/report - Generate privacy report for current user
 *
 * @module app/api/privacy/report
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { getPrivacySettingsService } from "@/lib/privacy";

const log = createLogger("PrivacyReportAPI");

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

// ============================================================================
// GET /api/privacy/report
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
    const report = service.generatePrivacyReport(userId);

    // Generate a human-readable summary
    const summary = {
      privacyLevel: report.settings.privacyLevel,
      analyticsEnabled: report.settings.analyticsConsent,
      ipAnonymization: report.settings.ipAnonymization.enabled
        ? report.settings.ipAnonymization.strategy
        : "disabled",
      locationTracking: report.settings.locationTracking.enabled
        ? report.settings.locationTracking.precision
        : "disabled",
      messageRetentionDays: report.settings.messageMetadata.retentionDays,
      autoDeleteEnabled: report.settings.deletionSettings.autoDeleteMessages,
      thirdPartyIntegrations:
        report.settings.thirdPartySettings.allowIntegrations,
    };

    // Privacy score (0-100, higher = more privacy)
    let privacyScore = 50; // Base score

    if (report.settings.privacyLevel === "maximum") privacyScore += 30;
    else if (report.settings.privacyLevel === "strict") privacyScore += 20;
    else if (report.settings.privacyLevel === "balanced") privacyScore += 10;
    else if (report.settings.privacyLevel === "minimal") privacyScore -= 10;

    if (!report.settings.analyticsConsent) privacyScore += 10;
    if (report.settings.ipAnonymization.enabled) privacyScore += 5;
    if (!report.settings.locationTracking.enabled) privacyScore += 5;
    if (!report.settings.thirdPartySettings.allowAnalyticsSharing)
      privacyScore += 5;
    if (!report.settings.thirdPartySettings.allowAIProcessing)
      privacyScore += 5;
    if (report.settings.messageMetadata.retentionDays <= 30) privacyScore += 5;

    // Clamp score
    privacyScore = Math.min(100, Math.max(0, privacyScore));

    log.info("Privacy report generated", { userId });

    return NextResponse.json({
      success: true,
      data: {
        ...report,
        summary,
        privacyScore,
        recommendations: generateRecommendations(report.settings),
      },
    });
  } catch (error) {
    log.error("Failed to generate privacy report", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to generate privacy report",
      },
      { status: 500 },
    );
  }
}

/**
 * Generate privacy improvement recommendations
 */
function generateRecommendations(settings: {
  privacyLevel: string;
  analyticsConsent: boolean;
  ipAnonymization: { enabled: boolean; strategy: string };
  locationTracking: { enabled: boolean };
  thirdPartySettings: {
    allowIntegrations: boolean;
    allowAnalyticsSharing: boolean;
    allowAIProcessing: boolean;
  };
  messageMetadata: { retentionDays: number };
}): string[] {
  const recommendations: string[] = [];

  if (settings.analyticsConsent) {
    recommendations.push(
      "Consider disabling analytics consent for maximum privacy",
    );
  }

  if (!settings.ipAnonymization.enabled) {
    recommendations.push(
      "Enable IP anonymization to protect your network identity",
    );
  } else if (settings.ipAnonymization.strategy === "truncate") {
    recommendations.push(
      "Consider using hash or remove strategy for stronger IP protection",
    );
  }

  if (settings.locationTracking.enabled) {
    recommendations.push(
      "Disable location tracking to prevent geographic profiling",
    );
  }

  if (settings.thirdPartySettings.allowAnalyticsSharing) {
    recommendations.push(
      "Disable third-party analytics sharing to limit data exposure",
    );
  }

  if (settings.thirdPartySettings.allowAIProcessing) {
    recommendations.push(
      "Disable AI processing if you prefer your data not to be used for AI training",
    );
  }

  if (settings.messageMetadata.retentionDays > 90) {
    recommendations.push(
      "Reduce message metadata retention period for better privacy",
    );
  }

  if (settings.privacyLevel === "minimal") {
    recommendations.push(
      'Consider upgrading to "balanced" or "strict" privacy level',
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Your privacy settings are well configured!");
  }

  return recommendations;
}
