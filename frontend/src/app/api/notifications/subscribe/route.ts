/**
 * Push Notification Subscribe API Route
 *
 * POST - Subscribe to push notifications
 * DELETE - Unsubscribe from push notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";

// =============================================================================
// Validation Schemas
// =============================================================================

const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const SubscribeRequestSchema = z.object({
  userId: z.string(),
  subscription: PushSubscriptionSchema,
  deviceId: z.string().optional(),
  platform: z.enum(["web", "pwa", "ios", "android"]).optional().default("web"),
  userAgent: z.string().optional(),
});

const UnsubscribeRequestSchema = z.object({
  endpoint: z.string().url(),
});

// =============================================================================
// GraphQL Mutations
// =============================================================================

const UPSERT_PUSH_SUBSCRIPTION = `
  mutation UpsertPushSubscription(
    $userId: uuid!
    $endpoint: String!
    $expirationTime: timestamptz
    $p256dh: String!
    $auth: String!
    $deviceId: String
    $platform: String!
    $userAgent: String
  ) {
    insert_nchat_push_subscriptions_one(
      object: {
        user_id: $userId
        endpoint: $endpoint
        expiration_time: $expirationTime
        p256dh_key: $p256dh
        auth_key: $auth
        device_id: $deviceId
        platform: $platform
        user_agent: $userAgent
        active: true
      }
      on_conflict: {
        constraint: push_subscriptions_endpoint_key
        update_columns: [p256dh_key, auth_key, expiration_time, device_id, platform, user_agent, active, updated_at]
      }
    ) {
      id
      user_id
      endpoint
      device_id
      platform
      active
      created_at
      updated_at
    }
  }
`;

const DEACTIVATE_PUSH_SUBSCRIPTION = `
  mutation DeactivatePushSubscription($endpoint: String!) {
    update_nchat_push_subscriptions(
      where: { endpoint: { _eq: $endpoint } }
      _set: { active: false }
    ) {
      affected_rows
    }
  }
`;

const DELETE_PUSH_SUBSCRIPTION = `
  mutation DeletePushSubscription($endpoint: String!) {
    delete_nchat_push_subscriptions(where: { endpoint: { _eq: $endpoint } }) {
      affected_rows
    }
  }
`;

const GET_USER_SUBSCRIPTIONS = `
  query GetUserPushSubscriptions($userId: uuid!) {
    nchat_push_subscriptions(
      where: { user_id: { _eq: $userId }, active: { _eq: true } }
      order_by: { created_at: desc }
    ) {
      id
      endpoint
      device_id
      platform
      created_at
      updated_at
    }
  }
`;

// =============================================================================
// Helper Functions
// =============================================================================

async function executeGraphQL<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  authToken?: string,
): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
  const hasuraUrl =
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql";
  const hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (hasuraAdminSecret) {
    headers["x-hasura-admin-secret"] = hasuraAdminSecret;
  } else if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(hasuraUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  return response.json();
}

function getAuthToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return undefined;
}

/**
 * Forward subscription to the notifications plugin API
 */
async function syncWithPlugin(
  userId: string,
  subscription: z.infer<typeof PushSubscriptionSchema>,
  deviceId?: string,
  platform?: string,
): Promise<void> {
  const pluginApiUrl = process.env.NOTIFICATIONS_API_URL;
  if (!pluginApiUrl) return;

  try {
    await fetch(`${pluginApiUrl}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        subscription,
        device_id: deviceId,
        platform,
      }),
    });
  } catch (error) {
    logger.warn("Failed to sync subscription with plugin:", { context: error });
    // Non-critical, continue anyway
  }
}

// =============================================================================
// POST - Subscribe to push notifications
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authToken = getAuthToken(request);
    const body = await request.json();

    const parsed = SubscribeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid subscription data",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }

    const { userId, subscription, deviceId, platform, userAgent } = parsed.data;

    // Store in database
    const result = await executeGraphQL<{
      insert_nchat_push_subscriptions_one: {
        id: string;
        user_id: string;
        endpoint: string;
        device_id: string | null;
        platform: string;
        active: boolean;
        created_at: string;
        updated_at: string;
      };
    }>(
      UPSERT_PUSH_SUBSCRIPTION,
      {
        userId,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime
          ? new Date(subscription.expirationTime).toISOString()
          : null,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        deviceId,
        platform,
        userAgent,
      },
      authToken,
    );

    if (result.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save subscription",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    // Sync with notifications plugin
    await syncWithPlugin(userId, subscription, deviceId, platform);

    const savedSubscription = result.data?.insert_nchat_push_subscriptions_one;

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: savedSubscription?.id,
        endpoint: savedSubscription?.endpoint,
        active: savedSubscription?.active,
      },
    });
  } catch (error) {
    logger.error("POST /api/notifications/subscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// =============================================================================
// GET - List user's push subscriptions
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authToken = getAuthToken(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "user_id is required" },
        { status: 400 },
      );
    }

    const result = await executeGraphQL<{
      nchat_push_subscriptions: Array<{
        id: string;
        endpoint: string;
        device_id: string | null;
        platform: string;
        created_at: string;
        updated_at: string;
      }>;
    }>(GET_USER_SUBSCRIPTIONS, { userId }, authToken);

    if (result.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch subscriptions",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        subscriptions: result.data?.nchat_push_subscriptions || [],
      },
    });
  } catch (error) {
    logger.error("GET /api/notifications/subscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// =============================================================================
// DELETE - Unsubscribe from push notifications
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const authToken = getAuthToken(request);
    const body = await request.json();

    const parsed = UnsubscribeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid unsubscribe data",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }

    const { endpoint } = parsed.data;

    // Deactivate (soft delete) the subscription
    const result = await executeGraphQL<{
      update_nchat_push_subscriptions: { affected_rows: number };
    }>(DEACTIVATE_PUSH_SUBSCRIPTION, { endpoint }, authToken);

    if (result.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to unsubscribe",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    // Also notify the plugin API
    const pluginApiUrl = process.env.NOTIFICATIONS_API_URL;
    if (pluginApiUrl) {
      try {
        await fetch(`${pluginApiUrl}/api/push/unsubscribe`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        affectedRows:
          result.data?.update_nchat_push_subscriptions?.affected_rows || 0,
      },
    });
  } catch (error) {
    logger.error("DELETE /api/notifications/subscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
