/**
 * Secret Scan API
 *
 * Scans the codebase for hardcoded secrets.
 * Returns findings with severity levels and remediation advice.
 *
 * @route POST /api/admin/secrets/scan
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import {
  createSecretScanner,
  ScanResult,
  toSarif,
} from "@/lib/secrets/secret-scanner";

// ============================================================================
// Types
// ============================================================================

interface ScanRequest {
  /** Path to scan (relative to project root) */
  path?: string;
  /** Output format */
  format?: "json" | "sarif";
  /** Minimum severity to report */
  minSeverity?: "critical" | "high" | "medium" | "low" | "info";
  /** Include possible false positives */
  includeFalsePositives?: boolean;
}

// ============================================================================
// Authorization Check
// ============================================================================

/**
 * Check if the request is authorized
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  // Always require authentication for code scanning
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return false;

  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    // In development, allow with any bearer token
    if (process.env.NODE_ENV === "development") {
      return authHeader.startsWith("Bearer ");
    }
    logger.warn("[SecretScan] ADMIN_API_KEY not configured");
    return false;
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  return token === adminKey;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format scan result for API response
 */
function formatResult(result: ScanResult): object {
  return {
    timestamp: result.timestamp.toISOString(),
    durationMs: result.durationMs,
    filesScanned: result.filesScanned,
    filesWithFindings: result.filesWithFindings,
    shouldBlockDeployment: result.shouldBlockDeployment,
    summary: result.summary,
    byType: Object.fromEntries(result.byType),
    findings: result.findings.map((f) => ({
      id: f.id,
      file: f.relativeFile,
      line: f.line,
      column: f.column,
      severity: f.severity,
      type: f.type,
      pattern: f.pattern,
      description: f.description,
      remediation: f.remediation,
      context: f.context,
      possibleFalsePositive: f.possibleFalsePositive,
    })),
  };
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authorization check
    if (!(await isAuthorized(request))) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Parse request body (optional)
    let body: ScanRequest = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is OK
    }

    // Validate path (prevent directory traversal)
    if (body.path) {
      if (body.path.includes("..") || body.path.startsWith("/")) {
        return NextResponse.json(
          { success: false, error: "Invalid path" },
          { status: 400 },
        );
      }
    }

    // Create scanner
    const scanner = createSecretScanner({
      rootDir: process.cwd(),
      minSeverity: body.minSeverity ?? "low",
      includeFalsePositives: body.includeFalsePositives ?? false,
    });

    // Run scan
    const scanPath = body.path ? `${process.cwd()}/${body.path}` : undefined;
    const result = scanner.scan(scanPath);

    // Log scan results
    logger.info(
      `[SecretScan] Scan completed: ${result.findings.length} findings in ${result.durationMs}ms`,
    );

    // Return in requested format
    if (body.format === "sarif") {
      return NextResponse.json({
        success: true,
        shouldBlockDeployment: result.shouldBlockDeployment,
        sarif: toSarif(result),
      });
    }

    return NextResponse.json({
      success: true,
      ...formatResult(result),
    });
  } catch (error) {
    logger.error("[SecretScan] Error scanning for secrets:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to scan for secrets",
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
// GET Handler - Quick check
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

    // Create scanner with defaults
    const scanner = createSecretScanner({
      rootDir: process.cwd(),
      minSeverity: "high", // Only report high/critical for quick check
      includeFalsePositives: false,
    });

    // Run scan
    const result = scanner.scan();

    // Return summary only
    return NextResponse.json({
      success: true,
      timestamp: result.timestamp.toISOString(),
      durationMs: result.durationMs,
      shouldBlockDeployment: result.shouldBlockDeployment,
      summary: result.summary,
      criticalFindings: result.findings.filter((f) => f.severity === "critical")
        .length,
      highFindings: result.findings.filter((f) => f.severity === "high").length,
    });
  } catch (error) {
    logger.error("[SecretScan] Error during quick scan:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to scan for secrets",
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
