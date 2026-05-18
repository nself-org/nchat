/**
 * Social Media Polling API
 * Triggers polling of social accounts for new posts
 */

import { NextRequest, NextResponse } from "next/server";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { pollAllAccounts, manualImport } from "@/lib/social/poller";

import { logger } from "@/lib/logger";

const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
    headers: {
      "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET || "",
    },
  }),
  cache: new InMemoryCache(),
});

/**
 * POST /api/social/poll
 * Trigger polling of all active social accounts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const accountId = body.accountId;

    let result;

    if (accountId) {
      // Manual import for specific account
      result = await manualImport(apolloClient, accountId);
    } else {
      // Poll all active accounts
      result = await pollAllAccounts(apolloClient);
    }

    return NextResponse.json({
      success: true,
      result: {
        fetched: result.fetched,
        imported: result.imported,
        filtered: result.filtered,
        posted: result.posted,
        errors: result.errors,
      },
    });
  } catch (error) {
    logger.error("Social poll error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to poll social accounts",
        message: String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/social/poll
 * Check polling status (for monitoring/health checks)
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      status: "ready",
      message: "Social media polling service is running",
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: String(error) },
      { status: 500 },
    );
  }
}
