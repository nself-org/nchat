/**
 * Notification Preferences API Route
 *
 * GET - Get user notification preferences
 * PUT - Update user notification preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  UserNotificationPreferences,
  defaultUserPreferences,
  FrequencyType,
  NotificationCategory,
  NotificationChannel,
} from "@/types/notifications";

// =============================================================================
// Validation Schemas
// =============================================================================

const QuietHoursSchema = z
  .object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string(),
  })
  .nullable()
  .optional();

const ChannelPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  frequency: z
    .enum(["immediate", "hourly", "daily", "weekly", "disabled"])
    .optional(),
  categories: z
    .object({
      transactional: z.boolean().optional(),
      marketing: z.boolean().optional(),
      system: z.boolean().optional(),
      alert: z.boolean().optional(),
    })
    .optional(),
});

const UpdatePreferencesSchema = z.object({
  email: ChannelPreferencesSchema.optional(),
  push: ChannelPreferencesSchema.optional(),
  sms: ChannelPreferencesSchema.optional(),
  quietHours: QuietHoursSchema,
  digest: z
    .object({
      enabled: z.boolean().optional(),
      frequency: z.enum(["daily", "weekly"]).optional(),
      time: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
    })
    .optional(),
});

// =============================================================================
// GraphQL Queries & Mutations
// =============================================================================

const GET_PREFERENCES_QUERY = `
  query GetNotificationPreferences($userId: uuid!) {
    nchat_notification_preferences(where: { user_id: { _eq: $userId } }) {
      id
      user_id
      channel
      category
      enabled
      frequency
      quiet_hours
      metadata
      created_at
      updated_at
    }
  }
`;

const UPSERT_PREFERENCE_MUTATION = `
  mutation UpsertNotificationPreference(
    $userId: uuid!
    $channel: String!
    $category: String!
    $enabled: Boolean!
    $frequency: String!
    $quietHours: jsonb
    $metadata: jsonb
  ) {
    insert_nchat_notification_preferences_one(
      object: {
        user_id: $userId
        channel: $channel
        category: $category
        enabled: $enabled
        frequency: $frequency
        quiet_hours: $quietHours
        metadata: $metadata
      }
      on_conflict: {
        constraint: notification_preferences_user_channel_category_key
        update_columns: [enabled, frequency, quiet_hours, metadata, updated_at]
      }
    ) {
      id
      user_id
      channel
      category
      enabled
      frequency
      quiet_hours
      metadata
      updated_at
    }
  }
`;

const DELETE_PREFERENCES_MUTATION = `
  mutation DeleteNotificationPreferences($userId: uuid!) {
    delete_nchat_notification_preferences(where: { user_id: { _eq: $userId } }) {
      affected_rows
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

interface DbPreference {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  enabled: boolean;
  frequency: FrequencyType;
  quiet_hours: { start: string; end: string; timezone: string } | null;
  metadata: Record<string, unknown>;
}

/**
 * Convert database preferences to UserNotificationPreferences format
 */
function convertToUserPreferences(
  dbPrefs: DbPreference[],
): UserNotificationPreferences {
  const result: UserNotificationPreferences = JSON.parse(
    JSON.stringify(defaultUserPreferences),
  );

  for (const pref of dbPrefs) {
    const channel = pref.channel as "email" | "push" | "sms";
    const category = pref.category as NotificationCategory;

    if (result[channel]) {
      result[channel].enabled = result[channel].enabled || pref.enabled;
      result[channel].frequency = pref.frequency;
      result[channel].categories[category] = pref.enabled;
    }

    // Handle quiet hours (take first found)
    if (pref.quiet_hours && !result.quietHours) {
      result.quietHours = pref.quiet_hours;
    }
  }

  return result;
}

// =============================================================================
// GET - Get user notification preferences
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
      nchat_notification_preferences: DbPreference[];
    }>(GET_PREFERENCES_QUERY, { userId }, authToken);

    if (result.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch preferences",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    const dbPrefs = result.data?.nchat_notification_preferences || [];
    const preferences = convertToUserPreferences(dbPrefs);

    return NextResponse.json({
      success: true,
      data: { preferences },
    });
  } catch (error) {
    logger.error("GET /api/notifications/preferences error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// =============================================================================
// PUT - Update user notification preferences
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const authToken = getAuthToken(request);
    const body = await request.json();
    const { userId, preferences } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 },
      );
    }

    const parsed = UpdatePreferencesSchema.safeParse(preferences);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid preferences data",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }

    const updates = parsed.data;
    const upsertPromises: Promise<unknown>[] = [];

    // Process each channel
    for (const channel of ["email", "push", "sms"] as const) {
      const channelUpdate = updates[channel];
      if (!channelUpdate) continue;

      // Process each category
      for (const category of [
        "transactional",
        "marketing",
        "system",
        "alert",
      ] as const) {
        const categoryEnabled = channelUpdate.categories?.[category];
        if (
          categoryEnabled === undefined &&
          !channelUpdate.enabled &&
          !channelUpdate.frequency
        ) {
          continue;
        }

        const enabled = categoryEnabled ?? channelUpdate.enabled ?? true;
        const frequency = channelUpdate.frequency ?? "immediate";

        upsertPromises.push(
          executeGraphQL(
            UPSERT_PREFERENCE_MUTATION,
            {
              userId,
              channel,
              category,
              enabled,
              frequency,
              quietHours: updates.quietHours || null,
              metadata: {},
            },
            authToken,
          ),
        );
      }
    }

    // Execute all upserts
    await Promise.all(upsertPromises);

    // Fetch updated preferences
    const result = await executeGraphQL<{
      nchat_notification_preferences: DbPreference[];
    }>(GET_PREFERENCES_QUERY, { userId }, authToken);

    const dbPrefs = result.data?.nchat_notification_preferences || [];
    const updatedPreferences = convertToUserPreferences(dbPrefs);

    return NextResponse.json({
      success: true,
      data: { preferences: updatedPreferences },
    });
  } catch (error) {
    logger.error("PUT /api/notifications/preferences error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// =============================================================================
// DELETE - Reset user notification preferences to defaults
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
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

    await executeGraphQL(DELETE_PREFERENCES_MUTATION, { userId }, authToken);

    return NextResponse.json({
      success: true,
      data: { preferences: defaultUserPreferences },
    });
  } catch (error) {
    logger.error("DELETE /api/notifications/preferences error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
