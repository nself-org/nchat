/**
 * Security Scan API
 *
 * Provides endpoints for running security scans and getting results.
 *
 * GET  /api/security/scan - Get scan status and policy
 * POST /api/security/scan - Trigger a scan (with provided content)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSASTScanner,
  type SASTScanResult,
} from "@/lib/security/sast-scanner";
import {
  createDependencyScanner,
  type DependencyScanResult,
} from "@/lib/security/dependency-scanner";
import {
  createVulnerabilityTracker,
  DEFAULT_REMEDIATION_POLICY,
} from "@/lib/security/vulnerability-tracker";

// ============================================================================
// Request Schemas
// ============================================================================

const scanRequestSchema = z.object({
  type: z.enum(["sast", "sca", "all"]).default("all"),
  files: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
  packageJson: z.string().optional(),
  packageLock: z.string().optional(),
  importFindings: z.boolean().default(false),
});

// ============================================================================
// GET /api/security/scan
// ============================================================================

export async function GET() {
  try {
    const tracker = createVulnerabilityTracker();
    const stats = tracker.getStats();
    const blockStatus = tracker.shouldBlockDeployment();

    return NextResponse.json({
      status: "ready",
      policy: {
        ...DEFAULT_REMEDIATION_POLICY,
        current: {
          deploymentBlocked: blockStatus.blocked,
          blockReasons: blockStatus.reasons,
        },
      },
      stats: {
        totalVulnerabilities: stats.total,
        bySeverity: stats.bySeverity,
        byStatus: stats.byStatus,
        overdueCount: stats.overdueCount,
      },
      scanners: {
        sast: {
          enabled: true,
          rulesCount: createSASTScanner().getRules().length,
        },
        sca: {
          enabled: true,
          description: "Software Composition Analysis for dependencies",
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/security/scan
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const data = scanRequestSchema.parse(body);

    const results: {
      sast?: SASTScanResult;
      sca?: DependencyScanResult;
      summary: {
        passed: boolean;
        critical: number;
        high: number;
        medium: number;
        low: number;
        deploymentBlocked: boolean;
        blockReasons: string[];
      };
    } = {
      summary: {
        passed: true,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        deploymentBlocked: false,
        blockReasons: [],
      },
    };

    // Run SAST scan if requested
    if (
      (data.type === "sast" || data.type === "all") &&
      data.files &&
      data.files.length > 0
    ) {
      const sastScanner = createSASTScanner();
      const sastResult = sastScanner.scanFiles(data.files);

      results.sast = sastResult;
      results.summary.critical += sastResult.summary.critical;
      results.summary.high += sastResult.summary.high;
      results.summary.medium += sastResult.summary.medium;
      results.summary.low += sastResult.summary.low;

      if (!sastResult.passed) {
        results.summary.passed = false;
      }
    }

    // Run SCA scan if requested
    if ((data.type === "sca" || data.type === "all") && data.packageJson) {
      const scaScanner = createDependencyScanner();
      const scaResult = scaScanner.scanFromPackageJson(
        data.packageJson,
        data.packageLock,
      );

      results.sca = scaResult;
      results.summary.critical += scaResult.summary.vulnerabilities.critical;
      results.summary.high += scaResult.summary.vulnerabilities.high;
      results.summary.medium += scaResult.summary.vulnerabilities.moderate;
      results.summary.low += scaResult.summary.vulnerabilities.low;

      if (!scaResult.passed) {
        results.summary.passed = false;
      }
    }

    // Check if deployment should be blocked
    if (results.summary.critical > 0) {
      results.summary.deploymentBlocked = true;
      results.summary.blockReasons.push(
        `Found ${results.summary.critical} critical vulnerabilities`,
      );
    }

    if (results.summary.high > 0) {
      results.summary.deploymentBlocked = true;
      results.summary.blockReasons.push(
        `Found ${results.summary.high} high severity vulnerabilities`,
      );
    }

    // Import findings to tracker if requested
    if (data.importFindings) {
      const tracker = createVulnerabilityTracker();

      if (results.sast) {
        for (const finding of results.sast.findings) {
          tracker.importSASTFinding(finding);
        }
      }

      if (results.sca) {
        for (const vuln of results.sca.vulnerabilities) {
          tracker.importDependencyVulnerability(vuln);
        }
      }
    }

    return NextResponse.json({
      message: "Scan completed",
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
