/**
 * Readiness Check Endpoint
 *
 * Used by Kubernetes/orchestrators to determine if the app is ready to receive traffic.
 * Returns 200 OK if ready, 503 Service Unavailable if not ready.
 */

import { NextResponse } from "next/server";

export async function GET() {
  // Check if application is ready
  // This should be fast (<1s) and check only critical dependencies

  const checks: Record<string, { status: "ok" | "error"; message?: string }> =
    {};
  let allReady = true;

  try {
    // Check GraphQL endpoint (Hasura)
    try {
      const graphqlResponse = await fetch(
        `${process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "{ __typename }" }),
          signal: AbortSignal.timeout(2000), // 2 second timeout
        },
      );

      if (graphqlResponse.ok) {
        checks.graphql = { status: "ok" };
      } else {
        checks.graphql = {
          status: "error",
          message: `HTTP ${graphqlResponse.status}`,
        };
        allReady = false;
      }
    } catch (error) {
      checks.graphql = {
        status: "error",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to connect",
      };
      allReady = false;
    }

    // Check Auth service (Nhost Auth)
    try {
      const authResponse = await fetch(
        `${process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:4000/v1/auth"}/healthz`,
        {
          method: "GET",
          signal: AbortSignal.timeout(2000),
        },
      );

      if (authResponse.ok) {
        checks.auth = { status: "ok" };
      } else {
        checks.auth = {
          status: "error",
          message: `HTTP ${authResponse.status}`,
        };
        allReady = false;
      }
    } catch (error) {
      checks.auth = {
        status: "error",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to connect",
      };
      allReady = false;
    }

    // Check if in dev mode - skip service checks
    if (process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true") {
      allReady = true; // Allow ready state in dev mode even if services are down
      checks.devMode = { status: "ok", message: "Development mode enabled" };
    }

    return NextResponse.json(
      {
        ready: allReady,
        timestamp: new Date().toISOString(),
        checks,
      },
      { status: allReady ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ready: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
        timestamp: new Date().toISOString(),
        checks,
      },
      { status: 503 },
    );
  }
}
