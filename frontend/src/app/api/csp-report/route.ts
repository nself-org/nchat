/**
 * CSP Violation Reporting Endpoint
 *
 * Handles Content Security Policy violation reports sent by browsers
 * when CSP rules are violated. This helps identify security issues
 * and potential attacks.
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

interface CSPViolation {
  "document-uri": string;
  "violated-directive": string;
  "effective-directive": string;
  "original-policy": string;
  "blocked-uri": string;
  "status-code": number;
  "source-file"?: string;
  "line-number"?: number;
  "column-number"?: number;
}

interface CSPReport {
  "csp-report": CSPViolation;
}

/**
 * POST /api/csp-report
 *
 * Receives CSP violation reports from the browser
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type");

    // CSP reports are sent as application/csp-report or application/json
    if (
      !contentType?.includes("application/csp-report") &&
      !contentType?.includes("application/json")
    ) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 },
      );
    }

    const report: CSPReport = await request.json();
    const violation = report["csp-report"];

    if (!violation) {
      return NextResponse.json(
        { error: "Invalid CSP report format" },
        { status: 400 },
      );
    }

    // Log the violation
    // In production, you might want to send this to a monitoring service
    // like Sentry, DataDog, or CloudWatch
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: "csp-violation",
      documentUri: violation["document-uri"],
      violatedDirective: violation["violated-directive"],
      effectiveDirective: violation["effective-directive"],
      blockedUri: violation["blocked-uri"],
      sourceFile: violation["source-file"],
      lineNumber: violation["line-number"],
      columnNumber: violation["column-number"],
      statusCode: violation["status-code"],
    };

    // Log to console (in production, send to monitoring service)
    if (process.env.NODE_ENV === "production") {
      // Only log in production to avoid noise during development
      logger.warn("[CSP VIOLATION]", {
        context: JSON.stringify(logEntry, null, 2),
      });

      // await sendToMonitoring(logEntry)
    } else {
      // In development, log with more context
    }

    // Return 204 No Content (standard for CSP reporting)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Log error but still return 204 to avoid browser retries
    logger.error("[CSP Report Error]", error);
    return new NextResponse(null, { status: 204 });
  }
}

/**
 * Handle OPTIONS for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * Helper function to send violations to monitoring service
 * Implement based on your monitoring provider
 */
// async function sendToMonitoring(violation: any): Promise<void> {
//   // Example: Send to Sentry
//   // Sentry.captureMessage('CSP Violation', {
//   //   level: 'warning',
//   //   extra: violation,
//   // })
//
//   // Example: Send to DataDog
//   // await fetch('https://http-intake.logs.datadoghq.com/v1/input', {
//   //   method: 'POST',
//   //   headers: {
//   //     'DD-API-KEY': process.env.DATADOG_API_KEY,
//   //     'Content-Type': 'application/json',
//   //   },
//   //   body: JSON.stringify({
//   //     ddsource: 'browser',
//   //     ddtags: 'env:production,service:nchat',
//   //     message: 'CSP Violation',
//   //     ...violation,
//   //   }),
//   // })
//
//   // Example: Send to CloudWatch Logs
//   // const cloudwatch = new CloudWatchLogs()
//   // await cloudwatch.putLogEvents({
//   //   logGroupName: '/nchat/csp-violations',
//   //   logStreamName: 'violations',
//   //   logEvents: [{
//   //     message: JSON.stringify(violation),
//   //     timestamp: Date.now(),
//   //   }],
//   // })
// }
