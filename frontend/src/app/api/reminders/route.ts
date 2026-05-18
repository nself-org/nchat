/**
 * Reminders API Route
 *
 * REST API endpoints for managing reminders.
 * Provides CRUD operations and additional actions like snooze, complete, and dismiss.
 *
 * @endpoint GET /api/reminders - Get user's reminders with filtering
 * @endpoint POST /api/reminders - Create a new reminder
 * @endpoint PUT /api/reminders - Update a reminder
 * @endpoint DELETE /api/reminders - Delete a reminder
 *
 * @example
 * ```typescript
 * // Get all reminders
 * const response = await fetch('/api/reminders')
 * const { data } = await response.json()
 * // { reminders: Reminder[] }
 *
 * // Create a reminder
 * const response = await fetch('/api/reminders', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     messageId: '123',
 *     content: 'Follow up on this',
 *     remindAt: new Date(Date.now() + 3600000).toISOString(),
 *     timezone: 'America/New_York'
 *   })
 * })
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import {
  withErrorHandler,
  withAuth,
  getAuthenticatedUser,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import { withCsrfProtection } from "@/lib/security/csrf";
import { logger } from "@/lib/logger";

/**
 * Wraps an AuthenticatedRequest handler for use with withCsrfProtection.
 * CSRF middleware runs before withAuth adds the `user` property, so the handler
 * receives a plain NextRequest at that stage. The withAuth wrapper later
 * augments it with `user` before the actual handler executes.
 */
function csrfWrapped(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
): (request: NextRequest, context: unknown) => Promise<NextResponse> {
  return (request, context) => handler(request as AuthenticatedRequest);
}

// ============================================================================
// GraphQL Queries & Mutations
// ============================================================================

const GET_REMINDERS_QUERY = `
  query GetReminders(
    $userId: uuid!
    $status: String
    $channelId: uuid
    $type: String
    $limit: Int!
    $offset: Int!
  ) {
    nchat_reminders(
      where: {
        user_id: { _eq: $userId }
        status: { _eq: $status }
        channel_id: { _eq: $channelId }
        type: { _eq: $type }
      }
      order_by: { remind_at: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      user_id
      message_id
      channel_id
      channel {
        id
        name
      }
      content
      note
      remind_at
      timezone
      status
      type
      is_recurring
      recurrence_rule
      snooze_count
      snoozed_until
      completed_at
      created_at
      updated_at
    }
    nchat_reminders_aggregate(
      where: {
        user_id: { _eq: $userId }
        status: { _eq: $status }
        channel_id: { _eq: $channelId }
        type: { _eq: $type }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const CREATE_REMINDER_MUTATION = `
  mutation CreateReminder($reminder: nchat_reminders_insert_input!) {
    insert_nchat_reminders_one(object: $reminder) {
      id
      user_id
      message_id
      channel_id
      content
      note
      remind_at
      timezone
      status
      type
      is_recurring
      recurrence_rule
      snooze_count
      created_at
      updated_at
    }
  }
`;

const UPDATE_REMINDER_MUTATION = `
  mutation UpdateReminder(
    $id: uuid!
    $userId: uuid!
    $updates: nchat_reminders_set_input!
  ) {
    update_nchat_reminders(
      where: { id: { _eq: $id }, user_id: { _eq: $userId } }
      _set: $updates
    ) {
      affected_rows
      returning {
        id
        user_id
        message_id
        channel_id
        content
        note
        remind_at
        timezone
        status
        type
        is_recurring
        recurrence_rule
        snooze_count
        snoozed_until
        completed_at
        updated_at
      }
    }
  }
`;

const DELETE_REMINDER_MUTATION = `
  mutation DeleteReminder($id: uuid!, $userId: uuid!) {
    delete_nchat_reminders(where: { id: { _eq: $id }, user_id: { _eq: $userId } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// GraphQL Helper
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

function getAuthToken(request: AuthenticatedRequest): string | undefined {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return undefined;
}

// ============================================================================
// Types
// ============================================================================

interface CreateReminderInput {
  messageId?: string;
  channelId?: string;
  content: string;
  note?: string;
  remindAt: string; // ISO 8601 date string
  timezone: string;
  type?: "message" | "custom" | "followup";
  isRecurring?: boolean;
  recurrenceRule?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: string;
    count?: number;
  };
}

interface UpdateReminderInput {
  id: string;
  content?: string;
  note?: string;
  remindAt?: string;
  timezone?: string;
  isRecurring?: boolean;
  recurrenceRule?: CreateReminderInput["recurrenceRule"];
}

interface ReminderQueryParams {
  status?: "pending" | "completed" | "dismissed" | "snoozed";
  channelId?: string;
  type?: "message" | "custom" | "followup";
  limit?: number;
  offset?: number;
}

interface ReminderAction {
  action: "complete" | "dismiss" | "snooze" | "unsnooze";
  id: string;
  snoozeDuration?: number; // milliseconds
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate reminder creation input
 */
function validateCreateInput(input: unknown): {
  valid: boolean;
  data?: CreateReminderInput;
  error?: string;
} {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Invalid input" };
  }

  const data = input as CreateReminderInput;

  // Required fields
  if (
    !data.content ||
    typeof data.content !== "string" ||
    data.content.trim().length === 0
  ) {
    return { valid: false, error: "Content is required" };
  }

  if (!data.remindAt || typeof data.remindAt !== "string") {
    return {
      valid: false,
      error: "remindAt is required and must be a valid ISO date string",
    };
  }

  // Validate date
  const remindAtDate = new Date(data.remindAt);
  if (isNaN(remindAtDate.getTime())) {
    return { valid: false, error: "remindAt must be a valid ISO date string" };
  }

  // Check if date is in the future
  if (remindAtDate <= new Date()) {
    return { valid: false, error: "remindAt must be in the future" };
  }

  if (!data.timezone || typeof data.timezone !== "string") {
    return { valid: false, error: "timezone is required" };
  }

  // Validate type
  if (data.type && !["message", "custom", "followup"].includes(data.type)) {
    return { valid: false, error: "type must be message, custom, or followup" };
  }

  // Validate recurrence
  if (data.isRecurring) {
    if (!data.recurrenceRule) {
      return {
        valid: false,
        error: "recurrenceRule is required when isRecurring is true",
      };
    }

    const { frequency, interval } = data.recurrenceRule;
    if (
      !frequency ||
      !["daily", "weekly", "monthly", "yearly"].includes(frequency)
    ) {
      return { valid: false, error: "Invalid recurrence frequency" };
    }

    if (!interval || interval < 1 || interval > 99) {
      return {
        valid: false,
        error: "Recurrence interval must be between 1 and 99",
      };
    }
  }

  return { valid: true, data };
}

/**
 * Validate reminder update input
 */
function validateUpdateInput(input: unknown): {
  valid: boolean;
  data?: UpdateReminderInput;
  error?: string;
} {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Invalid input" };
  }

  const data = input as UpdateReminderInput;

  if (!data.id || typeof data.id !== "string") {
    return { valid: false, error: "Reminder ID is required" };
  }

  // Validate remindAt if provided
  if (data.remindAt) {
    const remindAtDate = new Date(data.remindAt);
    if (isNaN(remindAtDate.getTime())) {
      return {
        valid: false,
        error: "remindAt must be a valid ISO date string",
      };
    }

    if (remindAtDate <= new Date()) {
      return { valid: false, error: "remindAt must be in the future" };
    }
  }

  return { valid: true, data };
}

/**
 * Parse query parameters
 */
function parseQueryParams(searchParams: URLSearchParams): ReminderQueryParams {
  const params: ReminderQueryParams = {};

  const status = searchParams.get("status");
  if (
    status &&
    ["pending", "completed", "dismissed", "snoozed"].includes(status)
  ) {
    params.status = status as ReminderQueryParams["status"];
  }

  const channelId = searchParams.get("channelId");
  if (channelId) {
    params.channelId = channelId;
  }

  const type = searchParams.get("type");
  if (type && ["message", "custom", "followup"].includes(type)) {
    params.type = type as ReminderQueryParams["type"];
  }

  const limit = searchParams.get("limit");
  if (limit) {
    const parsed = parseInt(limit, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      params.limit = parsed;
    }
  }

  const offset = searchParams.get("offset");
  if (offset) {
    const parsed = parseInt(offset, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      params.offset = parsed;
    }
  }

  return params;
}

// ============================================================================
// GET Handler - Fetch Reminders
// ============================================================================

/**
 * GET /api/reminders
 *
 * Fetch reminders for the authenticated user with optional filtering.
 *
 * Query Parameters:
 * - status: Filter by status (pending, completed, dismissed, snoozed)
 * - channelId: Filter by channel
 * - type: Filter by type (message, custom, followup)
 * - limit: Maximum number of results (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
async function handleGetReminders(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse("Authentication required");
  }

  const authToken = getAuthToken(request);
  const { searchParams } = new URL(request.url);
  const params = parseQueryParams(searchParams);

  try {
    const result = await executeGraphQL<{
      nchat_reminders: Array<{
        id: string;
        user_id: string;
        message_id: string | null;
        channel_id: string | null;
        channel: { id: string; name: string } | null;
        content: string;
        note: string | null;
        remind_at: string;
        timezone: string;
        status: string;
        type: string;
        is_recurring: boolean;
        recurrence_rule: Record<string, unknown> | null;
        snooze_count: number;
        snoozed_until: string | null;
        completed_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      nchat_reminders_aggregate: { aggregate: { count: number } };
    }>(
      GET_REMINDERS_QUERY,
      {
        userId: user.id,
        status: params.status || null,
        channelId: params.channelId || null,
        type: params.type || null,
        limit: params.limit || 50,
        offset: params.offset || 0,
      },
      authToken,
    );

    if (result.errors) {
      logger.error("Failed to fetch reminders:", result.errors);
      return internalErrorResponse("Failed to fetch reminders");
    }

    const reminders = result.data?.nchat_reminders || [];
    const total = result.data?.nchat_reminders_aggregate?.aggregate?.count || 0;

    return successResponse({
      reminders,
      total,
      limit: params.limit || 50,
      offset: params.offset || 0,
      filters: params,
    });
  } catch (error) {
    logger.error("GET /api/reminders error:", error);
    return internalErrorResponse("Failed to fetch reminders");
  }
}

// ============================================================================
// POST Handler - Create or Action on Reminder
// ============================================================================

/**
 * POST /api/reminders
 *
 * Create a new reminder or perform an action on an existing reminder.
 *
 * Body for creation:
 * {
 *   messageId?: string,
 *   channelId?: string,
 *   content: string,
 *   note?: string,
 *   remindAt: string (ISO date),
 *   timezone: string,
 *   type?: 'message' | 'custom' | 'followup',
 *   isRecurring?: boolean,
 *   recurrenceRule?: { ... }
 * }
 *
 * Body for action:
 * {
 *   action: 'complete' | 'dismiss' | 'snooze' | 'unsnooze',
 *   id: string,
 *   snoozeDuration?: number (milliseconds, required for snooze)
 * }
 */
async function handlePostReminders(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse("Authentication required");
  }

  const authToken = getAuthToken(request);
  const body = await request.json();

  // Check if this is an action request
  if (body.action) {
    return handleReminderAction(user.id, body as ReminderAction, authToken);
  }

  // Otherwise, treat as create request
  const validation = validateCreateInput(body);
  if (!validation.valid) {
    return badRequestResponse(validation.error || "Invalid input");
  }

  const input = validation.data!;

  try {
    const result = await executeGraphQL<{
      insert_nchat_reminders_one: {
        id: string;
        user_id: string;
        message_id: string | null;
        channel_id: string | null;
        content: string;
        note: string | null;
        remind_at: string;
        timezone: string;
        status: string;
        type: string;
        is_recurring: boolean;
        recurrence_rule: Record<string, unknown> | null;
        snooze_count: number;
        created_at: string;
        updated_at: string;
      };
    }>(
      CREATE_REMINDER_MUTATION,
      {
        reminder: {
          user_id: user.id,
          message_id: input.messageId || null,
          channel_id: input.channelId || null,
          content: input.content,
          note: input.note || null,
          remind_at: input.remindAt,
          timezone: input.timezone,
          status: "pending",
          type: input.type || "custom",
          is_recurring: input.isRecurring || false,
          recurrence_rule: input.recurrenceRule || null,
          snooze_count: 0,
        },
      },
      authToken,
    );

    if (result.errors) {
      logger.error("Failed to create reminder:", result.errors);
      return internalErrorResponse("Failed to create reminder");
    }

    return successResponse({
      reminder: result.data?.insert_nchat_reminders_one,
      message: "Reminder created successfully",
    });
  } catch (error) {
    logger.error("POST /api/reminders error:", error);
    return internalErrorResponse("Failed to create reminder");
  }
}

/**
 * Handle reminder actions (complete, dismiss, snooze, unsnooze)
 */
async function handleReminderAction(
  userId: string,
  action: ReminderAction,
  authToken?: string,
): Promise<NextResponse> {
  const { action: actionType, id, snoozeDuration } = action;

  if (!id) {
    return badRequestResponse("Reminder ID is required");
  }

  let updates: Record<string, unknown> = {};
  let message = "";

  switch (actionType) {
    case "complete":
      updates = {
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      message = "Reminder marked as completed";
      break;

    case "dismiss":
      updates = {
        status: "dismissed",
        updated_at: new Date().toISOString(),
      };
      message = "Reminder dismissed";
      break;

    case "snooze":
      if (!snoozeDuration || snoozeDuration <= 0) {
        return badRequestResponse(
          "Valid snoozeDuration is required for snooze action",
        );
      }

      const snoozedUntil = new Date(Date.now() + snoozeDuration).toISOString();
      updates = {
        status: "snoozed",
        snoozed_until: snoozedUntil,
        remind_at: snoozedUntil,
        snooze_count: { _inc: 1 }, // Increment snooze count
        updated_at: new Date().toISOString(),
      };
      message = "Reminder snoozed";
      break;

    case "unsnooze":
      updates = {
        status: "pending",
        snoozed_until: null,
        updated_at: new Date().toISOString(),
      };
      message = "Reminder resumed";
      break;

    default:
      return badRequestResponse("Invalid action");
  }

  try {
    const result = await executeGraphQL<{
      update_nchat_reminders: {
        affected_rows: number;
        returning: Array<{
          id: string;
          status: string;
          snoozed_until: string | null;
          completed_at: string | null;
          updated_at: string;
        }>;
      };
    }>(
      UPDATE_REMINDER_MUTATION,
      {
        id,
        userId,
        updates,
      },
      authToken,
    );

    if (result.errors) {
      logger.error("Failed to update reminder:", result.errors);
      return internalErrorResponse("Failed to update reminder");
    }

    if (!result.data?.update_nchat_reminders?.affected_rows) {
      return notFoundResponse("Reminder not found or not owned by user");
    }

    return successResponse({
      reminder: result.data.update_nchat_reminders.returning[0],
      message,
    });
  } catch (error) {
    logger.error("Reminder action error:", error);
    return internalErrorResponse("Failed to perform action");
  }
}

// ============================================================================
// PUT Handler - Update Reminder
// ============================================================================

/**
 * PUT /api/reminders
 *
 * Update an existing reminder.
 *
 * Body:
 * {
 *   id: string,
 *   content?: string,
 *   note?: string,
 *   remindAt?: string,
 *   timezone?: string,
 *   isRecurring?: boolean,
 *   recurrenceRule?: { ... }
 * }
 */
async function handlePutReminders(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse("Authentication required");
  }

  const authToken = getAuthToken(request);
  const body = await request.json();
  const validation = validateUpdateInput(body);

  if (!validation.valid) {
    return badRequestResponse(validation.error || "Invalid input");
  }

  const input = validation.data!;

  // Build update object
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.content !== undefined) updates.content = input.content;
  if (input.note !== undefined) updates.note = input.note;
  if (input.remindAt !== undefined) updates.remind_at = input.remindAt;
  if (input.timezone !== undefined) updates.timezone = input.timezone;
  if (input.isRecurring !== undefined) updates.is_recurring = input.isRecurring;
  if (input.recurrenceRule !== undefined)
    updates.recurrence_rule = input.recurrenceRule;

  try {
    const result = await executeGraphQL<{
      update_nchat_reminders: {
        affected_rows: number;
        returning: Array<{
          id: string;
          user_id: string;
          content: string;
          note: string | null;
          remind_at: string;
          timezone: string;
          status: string;
          type: string;
          is_recurring: boolean;
          recurrence_rule: Record<string, unknown> | null;
          updated_at: string;
        }>;
      };
    }>(
      UPDATE_REMINDER_MUTATION,
      {
        id: input.id,
        userId: user.id,
        updates,
      },
      authToken,
    );

    if (result.errors) {
      logger.error("Failed to update reminder:", result.errors);
      return internalErrorResponse("Failed to update reminder");
    }

    if (!result.data?.update_nchat_reminders?.affected_rows) {
      return notFoundResponse("Reminder not found or not owned by user");
    }

    return successResponse({
      reminder: result.data.update_nchat_reminders.returning[0],
      message: "Reminder updated successfully",
    });
  } catch (error) {
    logger.error("PUT /api/reminders error:", error);
    return internalErrorResponse("Failed to update reminder");
  }
}

// ============================================================================
// DELETE Handler - Delete Reminder
// ============================================================================

/**
 * DELETE /api/reminders?id=xxx
 *
 * Delete a reminder by ID.
 */
async function handleDeleteReminders(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse("Authentication required");
  }

  const authToken = getAuthToken(request);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return badRequestResponse("Reminder ID is required");
  }

  try {
    const result = await executeGraphQL<{
      delete_nchat_reminders: { affected_rows: number };
    }>(
      DELETE_REMINDER_MUTATION,
      {
        id,
        userId: user.id,
      },
      authToken,
    );

    if (result.errors) {
      logger.error("Failed to delete reminder:", result.errors);
      return internalErrorResponse("Failed to delete reminder");
    }

    if (!result.data?.delete_nchat_reminders?.affected_rows) {
      return notFoundResponse("Reminder not found or not owned by user");
    }

    return successResponse({
      id,
      message: "Reminder deleted successfully",
    });
  } catch (error) {
    logger.error("DELETE /api/reminders error:", error);
    return internalErrorResponse("Failed to delete reminder");
  }
}

// ============================================================================
// Route Exports
// ============================================================================

/**
 * GET /api/reminders
 */
export const GET = withErrorHandler(withAuth(handleGetReminders));

/**
 * POST /api/reminders
 */
export const POST = withErrorHandler(
  withAuth(withCsrfProtection(csrfWrapped(handlePostReminders))),
);

/**
 * PUT /api/reminders
 */
export const PUT = withErrorHandler(
  withAuth(withCsrfProtection(csrfWrapped(handlePutReminders))),
);

/**
 * DELETE /api/reminders
 */
export const DELETE = withErrorHandler(
  withAuth(withCsrfProtection(csrfWrapped(handleDeleteReminders))),
);
