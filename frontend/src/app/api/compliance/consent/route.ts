/**
 * Consent Management API
 *
 * Manages user consent for data processing, cookies, and privacy.
 */

import { NextRequest, NextResponse } from "next/server";
import type {
  UserConsent,
  ConsentType,
  ConsentStatus,
  CookiePreferences,
} from "@/lib/compliance/compliance-types";
import { logger } from "@/lib/logger";

// Simulated database (replace with real database calls)
const userConsents: UserConsent[] = [];
const cookiePreferences: Map<string, CookiePreferences> = new Map();

/**
 * GET /api/compliance/consent
 * Get user's consent records
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";

    const consents = userConsents.filter((c) => c.userId === userId);
    const cookies = cookiePreferences.get(userId);

    return NextResponse.json({
      success: true,
      consents,
      cookiePreferences: cookies || {
        essential: true,
        functional: false,
        analytics: false,
        advertising: false,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error("Error fetching consents:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch consents",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/compliance/consent
 * Grant or revoke consent
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const body = await request.json();
    const { consentType, status, version, source, metadata } = body;

    // Validate inputs
    if (!consentType || !status) {
      return NextResponse.json(
        { success: false, error: "Consent type and status are required" },
        { status: 400 },
      );
    }

    // Find existing consent
    const existingIndex = userConsents.findIndex(
      (c) => c.userId === userId && c.consentType === consentType,
    );

    const now = new Date();
    const consent: UserConsent = {
      id:
        existingIndex >= 0
          ? userConsents[existingIndex].id
          : crypto.randomUUID(),
      userId,
      consentType: consentType as ConsentType,
      status: status as ConsentStatus,
      version: version || "1.0",
      grantedAt: status === "granted" ? now : undefined,
      revokedAt: status === "denied" ? now : undefined,
      ipAddress,
      userAgent,
      source: source || "settings",
      metadata,
    };

    if (existingIndex >= 0) {
      userConsents[existingIndex] = consent;
    } else {
      userConsents.push(consent);
    }

    // await logComplianceEvent('consent_' + status, { userId, consentType });

    return NextResponse.json({
      success: true,
      consent,
      message: `Consent ${status === "granted" ? "granted" : "revoked"} successfully`,
    });
  } catch (error) {
    logger.error("Error updating consent:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update consent",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/compliance/consent/cookies
 * Update cookie preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";

    const body = await request.json();
    const { functional, analytics, advertising } = body;

    const preferences: CookiePreferences = {
      essential: true, // Always enabled
      functional: functional ?? false,
      analytics: analytics ?? false,
      advertising: advertising ?? false,
      updatedAt: new Date(),
    };

    cookiePreferences.set(userId, preferences);

    // Also create consent records for cookies
    const cookieConsents: Array<{ type: ConsentType; granted: boolean }> = [
      { type: "cookies_essential", granted: true },
      { type: "cookies_functional", granted: functional ?? false },
      { type: "cookies_analytics", granted: analytics ?? false },
      { type: "cookies_advertising", granted: advertising ?? false },
    ];

    for (const { type, granted } of cookieConsents) {
      const existingIndex = userConsents.findIndex(
        (c) => c.userId === userId && c.consentType === type,
      );

      const consent: UserConsent = {
        id:
          existingIndex >= 0
            ? userConsents[existingIndex].id
            : crypto.randomUUID(),
        userId,
        consentType: type,
        status: granted ? "granted" : "denied",
        version: "1.0",
        grantedAt: granted ? new Date() : undefined,
        revokedAt: !granted ? new Date() : undefined,
        source: "banner",
      };

      if (existingIndex >= 0) {
        userConsents[existingIndex] = consent;
      } else {
        userConsents.push(consent);
      }
    }

    // await logComplianceEvent('cookies_updated', { userId, preferences });

    return NextResponse.json({
      success: true,
      preferences,
      message: "Cookie preferences updated successfully",
    });
  } catch (error) {
    logger.error("Error updating cookie preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update cookie preferences",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
