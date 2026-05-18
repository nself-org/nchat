/**
 * POST /api/analytics/track
 *
 * Tracks analytics events from the client and stores them in the database
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

import { logger } from "@/lib/logger";

// Event schema validation
interface AnalyticsEvent {
  event_type: string;
  event_category:
    | "page_view"
    | "user_action"
    | "feature_usage"
    | "error"
    | "performance"
    | "custom";
  event_data?: Record<string, unknown>;
  timestamp?: string;
  session_id?: string;
}

// Validate event structure
function validateEvent(event: unknown): event is AnalyticsEvent {
  if (!event || typeof event !== "object") return false;
  const e = event as Record<string, unknown>;
  return (
    typeof e.event_type === "string" &&
    e.event_type.length > 0 &&
    (!e.event_category ||
      [
        "page_view",
        "user_action",
        "feature_usage",
        "error",
        "performance",
        "custom",
      ].includes(e.event_category as string))
  );
}

// Store events in database via GraphQL mutation
async function storeEvents(
  events: AnalyticsEvent[],
  userId: string | null,
  metadata: {
    ip: string | null;
    userAgent: string | null;
    sessionId: string | null;
  },
): Promise<{ inserted: number; failed: number }> {
  const graphqlUrl =
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql";
  const adminSecret = process.env.HASURA_ADMIN_SECRET;

  if (!adminSecret) {
    logger.warn("HASURA_ADMIN_SECRET not set, events will not be persisted");
    return { inserted: 0, failed: events.length };
  }

  const insertEvents = events.map((event) => ({
    event_type: event.event_type,
    event_category: event.event_category || "custom",
    event_data: event.event_data || {},
    user_id: userId,
    session_id: event.session_id || metadata.sessionId,
    ip_address: metadata.ip,
    user_agent: metadata.userAgent,
    created_at: event.timestamp || new Date().toISOString(),
  }));

  const mutation = `
    mutation InsertAnalyticsEvents($events: [nchat_analytics_events_insert_input!]!) {
      insert_nchat_analytics_events(objects: $events) {
        affected_rows
      }
    }
  `;

  try {
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": adminSecret,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { events: insertEvents },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      logger.error("GraphQL error storing analytics events:", result.errors);
      return { inserted: 0, failed: events.length };
    }

    return {
      inserted: result.data?.insert_nchat_analytics_events?.affected_rows || 0,
      failed:
        events.length -
        (result.data?.insert_nchat_analytics_events?.affected_rows || 0),
    };
  } catch (error) {
    logger.error("Failed to store analytics events:", error);
    return { inserted: 0, failed: events.length };
  }
}

// Extract user ID from session token via auth service
async function getUserIdFromSession(
  sessionToken: string,
): Promise<string | null> {
  const authUrl =
    process.env.NEXT_PUBLIC_AUTH_URL || "http://auth.localhost/v1";

  try {
    const response = await fetch(`${authUrl}/user`, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.id || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events = Array.isArray(body) ? body : [body];

    if (events.length === 0) {
      return NextResponse.json(
        { error: "No events provided" },
        { status: 400 },
      );
    }

    // Validate events
    const validEvents: AnalyticsEvent[] = [];
    const invalidIndices: number[] = [];

    events.forEach((event, index) => {
      if (validateEvent(event)) {
        validEvents.push(event);
      } else {
        invalidIndices.push(index);
      }
    });

    if (validEvents.length === 0) {
      return NextResponse.json(
        { error: "No valid events provided", invalidIndices },
        { status: 400 },
      );
    }

    // Get user session (if authenticated)
    const cookieStore = await cookies();
    const headersList = await headers();
    const sessionToken = cookieStore.get("session")?.value;

    // Extract metadata
    const userId = sessionToken
      ? await getUserIdFromSession(sessionToken)
      : null;
    const metadata = {
      ip: headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: headersList.get("user-agent"),
      sessionId: cookieStore.get("analytics_session")?.value || null,
    };

    // Store events in database
    const result = await storeEvents(validEvents, userId, metadata);

    return NextResponse.json({
      success: true,
      tracked: result.inserted,
      failed: result.failed,
      invalidIndices: invalidIndices.length > 0 ? invalidIndices : undefined,
      message: `Successfully tracked ${result.inserted} event(s)`,
    });
  } catch (error) {
    logger.error("Analytics tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track events" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
