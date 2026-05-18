/**
 * Readiness Check API Route
 *
 * Indicates whether the application is ready to accept traffic.
 * Used by Kubernetes readiness probes and load balancers.
 *
 * Unlike the health check, the readiness check verifies that:
 * - The application can connect to required services
 * - All startup tasks are complete
 * - The application is ready to serve requests
 *
 * @endpoint GET /api/ready - Check if application is ready
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/ready')
 * if (response.ok) {
 *   // Application is ready to accept traffic
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Service URLs
  GRAPHQL_URL:
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://hasura.localhost/v1/graphql",
  AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL || "http://auth.localhost",

  // Readiness check timeout (3 seconds - shorter than health check)
  CHECK_TIMEOUT: 3000,
};

// ============================================================================
// Types
// ============================================================================

interface ReadinessStatus {
  ready: boolean;
  timestamp: string;
  checks: {
    name: string;
    ready: boolean;
    message?: string;
  }[];
}

// ============================================================================
// Readiness Check Functions
// ============================================================================

/**
 * Check if GraphQL endpoint is reachable
 */
async function checkGraphQL(): Promise<{ ready: boolean; message?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CONFIG.CHECK_TIMEOUT,
    );

    const response = await fetch(CONFIG.GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ __typename }" }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { ready: true };
    }

    return { ready: false, message: `HTTP ${response.status}` };
  } catch (error) {
    return {
      ready: false,
      message:
        error instanceof Error
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Connection failed",
    };
  }
}

/**
 * Check if Auth service is reachable
 */
async function checkAuth(): Promise<{ ready: boolean; message?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CONFIG.CHECK_TIMEOUT,
    );

    const response = await fetch(`${CONFIG.AUTH_URL}/healthz`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { ready: true };
    }

    // Auth being unavailable doesn't mean we're not ready
    // (dev mode can work without auth)
    return { ready: true, message: `Auth returned ${response.status}` };
  } catch {
    // Auth being unavailable is acceptable in some configurations
    return { ready: true, message: "Auth not available" };
  }
}

/**
 * Check if the application configuration is loaded
 */
function checkConfig(): { ready: boolean; message?: string } {
  // Check for required environment variables
  const requiredInProd = ["NEXT_PUBLIC_GRAPHQL_URL"];

  if (process.env.NODE_ENV === "production") {
    for (const envVar of requiredInProd) {
      if (!process.env[envVar]) {
        return { ready: false, message: `Missing ${envVar}` };
      }
    }
  }

  return { ready: true };
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const timestamp = new Date().toISOString();

  // Run all checks in parallel
  const [graphqlCheck, authCheck] = await Promise.all([
    checkGraphQL(),
    checkAuth(),
  ]);

  const configCheck = checkConfig();

  const checks = [
    { name: "graphql", ...graphqlCheck },
    { name: "auth", ...authCheck },
    { name: "config", ...configCheck },
  ];

  // Application is ready if critical checks pass
  // GraphQL is critical, config is critical, auth is optional
  const isReady = graphqlCheck.ready && configCheck.ready;

  const status: ReadinessStatus = {
    ready: isReady,
    timestamp,
    checks,
  };

  // Return 503 if not ready
  if (!isReady) {
    return NextResponse.json(status, { status: 503 });
  }

  return NextResponse.json(status, { status: 200 });
}

// ============================================================================
// HEAD Handler (for simple probes)
// ============================================================================

export async function HEAD(): Promise<NextResponse> {
  // Quick check - just verify the app is running
  // For full readiness, use GET
  return new NextResponse(null, { status: 200 });
}

// ============================================================================
// Route Configuration
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
