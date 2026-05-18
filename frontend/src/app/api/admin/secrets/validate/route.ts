/**
 * Secret Validation API
 *
 * Validates all configured secrets against defined rules.
 * Returns detailed validation results and recommendations.
 *
 * @route GET /api/admin/secrets/validate
 * @route POST /api/admin/secrets/validate (validate specific secrets)
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import {
  createSecretValidator,
  SecretValidationReport,
} from "@/lib/secrets/secret-validator";

// ============================================================================
// Authorization Check
// ============================================================================

/**
 * Check if the request is authorized
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  // In production, require admin authentication
  if (process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return false;

    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) {
      logger.warn(
        "[SecretValidate] ADMIN_API_KEY not configured in production",
      );
      return false;
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    return token === adminKey;
  }

  // In development, allow access
  return true;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format validation report for API response
 */
function formatReport(report: SecretValidationReport): object {
  return {
    valid: report.valid,
    timestamp: report.timestamp.toISOString(),
    environment: report.environment,
    summary: {
      totalChecked: report.totalChecked,
      validCount: report.validCount,
      invalidCount: report.invalidCount,
      missingRequired: report.missingRequired,
    },
    criticalErrors: report.criticalErrors,
    warnings: report.warnings,
    details: report.results.map((result) => ({
      key: result.key,
      valid: result.valid,
      exists: result.exists,
      required: result.required,
      category: result.category,
      errors: result.errors,
      warnings: result.warnings,
    })),
  };
}

// ============================================================================
// GET Handler - Validate all secrets
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authorization check
    if (!(await isAuthorized(request))) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const forProduction = searchParams.get("production") === "true";
    const category = searchParams.get("category");

    // Create validator with appropriate configuration
    const environment = forProduction
      ? "production"
      : ((process.env.NODE_ENV as
          | "development"
          | "staging"
          | "production"
          | "test") ?? "development");

    const validator = createSecretValidator({
      environment,
      checkRotation: true,
      enforceMinLength: true,
      validatePatterns: true,
    });

    // Run validation
    const report = forProduction
      ? await validator.validateForProduction()
      : await validator.validateAll();

    // Filter by category if specified
    let filteredReport = report;
    if (category) {
      filteredReport = {
        ...report,
        results: report.results.filter((r) => r.category === category),
      };
      // Recalculate counts
      filteredReport.totalChecked = filteredReport.results.length;
      filteredReport.validCount = filteredReport.results.filter(
        (r) => r.valid,
      ).length;
      filteredReport.invalidCount = filteredReport.results.filter(
        (r) => !r.valid,
      ).length;
      filteredReport.missingRequired = filteredReport.results.filter(
        (r) => r.required && !r.exists,
      ).length;
    }

    return NextResponse.json({
      success: true,
      ...formatReport(filteredReport),
    });
  } catch (error) {
    logger.error("[SecretValidate] Error validating secrets:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate secrets",
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

// ============================================================================
// POST Handler - Validate specific secrets
// ============================================================================

interface ValidateRequest {
  secrets: string[];
  forProduction?: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authorization check
    if (!(await isAuthorized(request))) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Parse request body
    let body: ValidateRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    // Validate request
    if (
      !body.secrets ||
      !Array.isArray(body.secrets) ||
      body.secrets.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "secrets array is required" },
        { status: 400 },
      );
    }

    // Create validator
    const environment = body.forProduction
      ? "production"
      : ((process.env.NODE_ENV as
          | "development"
          | "staging"
          | "production"
          | "test") ?? "development");

    const validator = createSecretValidator({
      environment,
      checkRotation: true,
      enforceMinLength: true,
      validatePatterns: true,
    });

    // Validate each requested secret
    const results = await Promise.all(
      body.secrets.map((key) =>
        validator.validateSecret(key, process.env[key]),
      ),
    );

    // Build summary
    const validCount = results.filter((r) => r.valid).length;
    const invalidCount = results.filter((r) => !r.valid).length;
    const missingRequired = results.filter(
      (r) => r.required && !r.exists,
    ).length;

    const criticalErrors = results
      .filter((r) => !r.valid && r.required)
      .flatMap((r) => r.errors);

    const warnings = results.flatMap((r) => r.warnings);

    return NextResponse.json({
      success: true,
      valid: criticalErrors.length === 0,
      timestamp: new Date().toISOString(),
      environment,
      summary: {
        totalChecked: results.length,
        validCount,
        invalidCount,
        missingRequired,
      },
      criticalErrors,
      warnings,
      details: results.map((result) => ({
        key: result.key,
        valid: result.valid,
        exists: result.exists,
        required: result.required,
        category: result.category,
        errors: result.errors,
        warnings: result.warnings,
      })),
    });
  } catch (error) {
    logger.error("[SecretValidate] Error validating secrets:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate secrets",
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
