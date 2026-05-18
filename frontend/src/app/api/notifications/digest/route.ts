/**
 * Notification Digest API Route
 *
 * GET - Get digest settings for a user
 * POST - Send a digest immediately
 * PUT - Update digest settings
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  UserNotificationPreferences,
  defaultUserPreferences,
} from "@/types/notifications";

import { logger } from "@/lib/logger";

// ============================================================================
// Types & Validation
// ============================================================================

const DigestSettingsSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["daily", "weekly"]),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().optional(),
  includeRead: z.boolean().optional().default(false),
  maxNotifications: z.number().min(1).max(100).optional().default(50),
});

const SendDigestSchema = z.object({
  userId: z.string().uuid(),
  force: z.boolean().optional().default(false),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
});

// ============================================================================
// GraphQL Queries & Mutations
// ============================================================================

const GET_DIGEST_SETTINGS = `
  query GetDigestSettings($userId: uuid!) {
    nchat_notification_preferences(
      where: { user_id: { _eq: $userId } }
      limit: 1
    ) {
      metadata
    }
  }
`;

const GET_USER_EMAIL = `
  query GetUserEmail($userId: uuid!) {
    users_by_pk(id: $userId) {
      id
      email
      display_name
    }
  }
`;

const UPDATE_DIGEST_SETTINGS = `
  mutation UpdateDigestSettings($userId: uuid!, $settings: jsonb!) {
    update_nchat_notification_preferences(
      where: { user_id: { _eq: $userId } }
      _set: { metadata: $settings }
    ) {
      affected_rows
    }
  }
`;

const GET_NOTIFICATIONS_FOR_DIGEST = `
  query GetNotificationsForDigest(
    $userId: uuid!
    $startDate: timestamptz!
    $endDate: timestamptz!
    $includeRead: Boolean
  ) {
    nchat_notifications(
      where: {
        user_id: { _eq: $userId }
        created_at: { _gte: $startDate, _lte: $endDate }
        is_read: { _eq: $includeRead }
        is_archived: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: 100
    ) {
      id
      type
      priority
      title
      body
      actor {
        id
        display_name
        avatar_url
      }
      channel {
        id
        name
      }
      created_at
      is_read
      action_url
    }
  }
`;

// ============================================================================
// Helper Functions
// ============================================================================

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
 * Calculate digest period based on frequency
 */
function getDigestPeriod(frequency: "daily" | "weekly"): {
  start: Date;
  end: Date;
} {
  const end = new Date();
  const start = new Date();

  if (frequency === "daily") {
    start.setDate(start.getDate() - 1);
  } else if (frequency === "weekly") {
    start.setDate(start.getDate() - 7);
  }

  return { start, end };
}

/**
 * Format digest as HTML email
 */
function formatDigestEmail(
  notifications: any[],
  period: { start: Date; end: Date },
): string {
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const mentionCount = notifications.filter((n) => n.type === "mention").length;
  const dmCount = notifications.filter(
    (n) => n.type === "direct_message",
  ).length;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification Digest</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .header p { margin: 10px 0 0; opacity: 0.9; font-size: 14px; }
    .summary { background: #f9fafb; padding: 20px; display: flex; gap: 15px; justify-content: center; }
    .summary-item { background: white; padding: 20px; border-radius: 8px; text-align: center; flex: 1; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .summary-value { font-size: 32px; font-weight: bold; color: #6366f1; margin-bottom: 5px; }
    .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .notifications { background: white; padding: 20px; }
    .notification { padding: 15px; border-left: 3px solid #e5e7eb; margin-bottom: 15px; background: #fafafa; border-radius: 4px; }
    .notification.unread { border-left-color: #ef4444; background: #fef2f2; }
    .notification.mention { border-left-color: #f59e0b; }
    .notification-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .notification-avatar { width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb; }
    .notification-title { font-weight: 600; color: #111827; font-size: 14px; }
    .notification-body { color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 8px; }
    .notification-meta { display: flex; gap: 10px; font-size: 12px; color: #9ca3af; }
    .notification-action { display: inline-block; margin-top: 10px; padding: 8px 16px; background: #6366f1; color: white; text-decoration: none; border-radius: 4px; font-size: 13px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Notification Digest</h1>
      <p>${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}</p>
    </div>

    <div class="summary">
      <div class="summary-item">
        <div class="summary-value">${notifications.length}</div>
        <div class="summary-label">Total</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${unreadCount}</div>
        <div class="summary-label">Unread</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${mentionCount}</div>
        <div class="summary-label">Mentions</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${dmCount}</div>
        <div class="summary-label">Messages</div>
      </div>
    </div>

    <div class="notifications">
      ${notifications
        .slice(0, 10)
        .map(
          (n) => `
        <div class="notification ${!n.is_read ? "unread" : ""} ${n.type === "mention" ? "mention" : ""}">
          <div class="notification-header">
            ${n.actor?.avatar_url ? `<img src="${n.actor.avatar_url}" alt="" class="notification-avatar">` : '<div class="notification-avatar"></div>'}
            <div class="notification-title">${n.title}</div>
          </div>
          <div class="notification-body">${n.body}</div>
          <div class="notification-meta">
            <span>${new Date(n.created_at).toLocaleString()}</span>
            ${n.channel?.name ? `<span>#${n.channel.name}</span>` : ""}
          </div>
          ${n.action_url ? `<a href="${n.action_url}" class="notification-action">View</a>` : ""}
        </div>
      `,
        )
        .join("")}
    </div>

    <div class="footer">
      <p>You received this digest because you have notification digest enabled.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications">Manage notification settings</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// GET - Get digest settings
// ============================================================================

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
      nchat_notification_preferences: Array<{ metadata: any }>;
    }>(GET_DIGEST_SETTINGS, { userId }, authToken);

    if (result.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch digest settings",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    const prefs = result.data?.nchat_notification_preferences?.[0];
    const digestSettings =
      prefs?.metadata?.digest || defaultUserPreferences.digest;

    return NextResponse.json({
      success: true,
      data: { settings: digestSettings },
    });
  } catch (error) {
    logger.error("GET /api/notifications/digest error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Send digest immediately
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authToken = getAuthToken(request);
    const body = await request.json();

    const parsed = SendDigestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }

    const { userId, force, periodStart, periodEnd } = parsed.data;

    // Get digest settings
    const settingsResult = await executeGraphQL<{
      nchat_notification_preferences: Array<{ metadata: any }>;
    }>(GET_DIGEST_SETTINGS, { userId }, authToken);

    const prefs = settingsResult.data?.nchat_notification_preferences?.[0];
    const digestSettings =
      prefs?.metadata?.digest || defaultUserPreferences.digest;

    if (!digestSettings.enabled && !force) {
      return NextResponse.json(
        { success: false, error: "Digest is not enabled for this user" },
        { status: 400 },
      );
    }

    // Calculate period
    const period =
      periodStart && periodEnd
        ? { start: new Date(periodStart), end: new Date(periodEnd) }
        : getDigestPeriod(digestSettings.frequency);

    // Fetch notifications for period
    const notificationsResult = await executeGraphQL<{
      nchat_notifications: any[];
    }>(
      GET_NOTIFICATIONS_FOR_DIGEST,
      {
        userId,
        startDate: period.start.toISOString(),
        endDate: period.end.toISOString(),
        includeRead: false,
      },
      authToken,
    );

    if (notificationsResult.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch notifications",
          details: notificationsResult.errors,
        },
        { status: 500 },
      );
    }

    const notifications = notificationsResult.data?.nchat_notifications || [];

    if (notifications.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          sent: false,
          message: "No notifications to include in digest",
          period,
        },
      });
    }

    // Get user email
    const userResult = await executeGraphQL<{
      users_by_pk: { id: string; email: string; display_name: string } | null;
    }>(GET_USER_EMAIL, { userId }, authToken);

    const userEmail = userResult.data?.users_by_pk?.email;
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "User email not found" },
        { status: 404 },
      );
    }

    // Format digest
    const htmlContent = formatDigestEmail(notifications, period);

    // Send via notifications API if configured
    const notificationsApiUrl = process.env.NOTIFICATIONS_API_URL;
    let emailSent = false;

    if (notificationsApiUrl) {
      try {
        const sendResponse = await fetch(`${notificationsApiUrl}/api/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            channel: "email",
            category: "system",
            to: { email: userEmail },
            content: {
              subject: `Notification Digest - ${period.start.toLocaleDateString()}`,
              html: htmlContent,
            },
            metadata: {
              digest: true,
              period: { start: period.start, end: period.end },
              count: notifications.length,
            },
          }),
        });
        emailSent = sendResponse.ok;
      } catch (emailError) {
        logger.warn("Failed to send digest email via notifications API:", {
          context: emailError,
        });
      }
    }

    // Fallback: use Resend if configured and notifications API failed
    if (!emailSent && process.env.RESEND_API_KEY) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || "noreply@nchat.app",
            to: userEmail,
            subject: `Notification Digest - ${period.start.toLocaleDateString()}`,
            html: htmlContent,
          }),
        });
        emailSent = resendResponse.ok;
      } catch (resendError) {
        logger.warn("Failed to send digest email via Resend:", {
          context: resendError,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sent: emailSent,
        notificationCount: notifications.length,
        period,
        email: userEmail,
        preview: emailSent ? undefined : htmlContent,
      },
    });
  } catch (error) {
    logger.error("POST /api/notifications/digest error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT - Update digest settings
// ============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const authToken = getAuthToken(request);
    const body = await request.json();
    const { userId, settings } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 },
      );
    }

    const parsed = DigestSettingsSchema.safeParse(settings);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid settings data",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }

    const result = await executeGraphQL(
      UPDATE_DIGEST_SETTINGS,
      {
        userId,
        settings: { digest: parsed.data },
      },
      authToken,
    );

    if (result.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update settings",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { settings: parsed.data },
    });
  } catch (error) {
    logger.error("PUT /api/notifications/digest error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
