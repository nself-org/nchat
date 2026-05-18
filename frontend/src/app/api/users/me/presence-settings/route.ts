/**
 * Presence Settings API Routes
 *
 * Handles GET and PATCH requests for user presence privacy settings.
 *
 * @module app/api/users/me/presence-settings
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import {
  successResponse,
  errorResponse,
  badRequestResponse,
} from "@/lib/api/response";
import {
  withAuth,
  withErrorHandler,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
  type RouteContext,
} from "@/lib/api/middleware";
import { logger } from "@/lib/logger";
import {
  type PresenceSettings,
  type PresenceSettingsInput,
  type PresenceVisibility,
  DEFAULT_PRESENCE_SETTINGS,
} from "@/graphql/presence-settings";

// ============================================================================
// Types
// ============================================================================

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface GetPresenceSettingsResponse {
  nchat_presence_settings_by_pk: {
    id: string;
    user_id: string;
    visibility: string;
    show_last_seen: boolean;
    show_online_status: boolean;
    allow_read_receipts: boolean;
    invisible_mode: boolean;
    created_at: string;
    updated_at: string;
  } | null;
}

interface UpsertPresenceSettingsResponse {
  insert_nchat_presence_settings_one: {
    id: string;
    user_id: string;
    visibility: string;
    show_last_seen: boolean;
    show_online_status: boolean;
    allow_read_receipts: boolean;
    invisible_mode: boolean;
    created_at: string;
    updated_at: string;
  } | null;
}

// ============================================================================
// GraphQL Operations
// ============================================================================

const GET_PRESENCE_SETTINGS_QUERY = `
  query GetPresenceSettings($userId: uuid!) {
    nchat_presence_settings_by_pk(user_id: $userId) {
      id
      user_id
      visibility
      show_last_seen
      show_online_status
      allow_read_receipts
      invisible_mode
      created_at
      updated_at
    }
  }
`;

const UPSERT_PRESENCE_SETTINGS_MUTATION = `
  mutation UpsertPresenceSettings(
    $userId: uuid!
    $visibility: String!
    $showLastSeen: Boolean!
    $showOnlineStatus: Boolean!
    $allowReadReceipts: Boolean!
    $invisibleMode: Boolean!
  ) {
    insert_nchat_presence_settings_one(
      object: {
        user_id: $userId
        visibility: $visibility
        show_last_seen: $showLastSeen
        show_online_status: $showOnlineStatus
        allow_read_receipts: $allowReadReceipts
        invisible_mode: $invisibleMode
      }
      on_conflict: {
        constraint: nchat_presence_settings_pkey
        update_columns: [
          visibility
          show_last_seen
          show_online_status
          allow_read_receipts
          invisible_mode
          updated_at
        ]
      }
    ) {
      id
      user_id
      visibility
      show_last_seen
      show_online_status
      allow_read_receipts
      invisible_mode
      created_at
      updated_at
    }
  }
`;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Execute GraphQL request to Hasura
 */
async function executeGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
  authToken?: string,
): Promise<GraphQLResponse<T>> {
  const graphqlUrl =
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  // Use admin secret for server-side operations
  const adminSecret = process.env.HASURA_ADMIN_SECRET;
  if (adminSecret) {
    headers["x-hasura-admin-secret"] = adminSecret;
  }

  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(
      `GraphQL request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Transform database record to API response format
 */
function transformToApiFormat(dbRecord: {
  id: string;
  user_id: string;
  visibility: string;
  show_last_seen: boolean;
  show_online_status: boolean;
  allow_read_receipts: boolean;
  invisible_mode: boolean;
  created_at: string;
  updated_at: string;
}): PresenceSettings {
  return {
    id: dbRecord.id,
    userId: dbRecord.user_id,
    visibility: dbRecord.visibility as PresenceVisibility,
    showLastSeen: dbRecord.show_last_seen,
    showOnlineStatus: dbRecord.show_online_status,
    allowReadReceipts: dbRecord.allow_read_receipts,
    invisibleMode: dbRecord.invisible_mode,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
  };
}

/**
 * Validate visibility value
 */
function isValidVisibility(value: unknown): value is PresenceVisibility {
  return value === "everyone" || value === "contacts" || value === "nobody";
}

/**
 * Validate presence settings input
 */
function validatePresenceSettingsInput(
  input: unknown,
):
  | { valid: true; data: PresenceSettingsInput }
  | { valid: false; error: string } {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const data = input as Record<string, unknown>;
  const result: PresenceSettingsInput = {};

  // Validate visibility
  if (data.visibility !== undefined) {
    if (!isValidVisibility(data.visibility)) {
      return {
        valid: false,
        error: "visibility must be one of: everyone, contacts, nobody",
      };
    }
    result.visibility = data.visibility;
  }

  // Validate boolean fields
  if (data.showLastSeen !== undefined) {
    if (typeof data.showLastSeen !== "boolean") {
      return { valid: false, error: "showLastSeen must be a boolean" };
    }
    result.showLastSeen = data.showLastSeen;
  }

  if (data.showOnlineStatus !== undefined) {
    if (typeof data.showOnlineStatus !== "boolean") {
      return { valid: false, error: "showOnlineStatus must be a boolean" };
    }
    result.showOnlineStatus = data.showOnlineStatus;
  }

  if (data.allowReadReceipts !== undefined) {
    if (typeof data.allowReadReceipts !== "boolean") {
      return { valid: false, error: "allowReadReceipts must be a boolean" };
    }
    result.allowReadReceipts = data.allowReadReceipts;
  }

  if (data.invisibleMode !== undefined) {
    if (typeof data.invisibleMode !== "boolean") {
      return { valid: false, error: "invisibleMode must be a boolean" };
    }
    result.invisibleMode = data.invisibleMode;
  }

  // At least one field must be provided
  if (Object.keys(result).length === 0) {
    return { valid: false, error: "At least one setting must be provided" };
  }

  return { valid: true, data: result };
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/users/me/presence-settings
 *
 * Get current user's presence privacy settings
 */
async function getHandler(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = request.user.id;

  try {
    const result = await executeGraphQL<GetPresenceSettingsResponse>(
      GET_PRESENCE_SETTINGS_QUERY,
      {
        userId,
      },
    );

    if (result.errors?.length) {
      logger.error("[PresenceSettings] GraphQL errors:", result.errors);
      return errorResponse(
        "Failed to fetch presence settings",
        "GRAPHQL_ERROR",
        500,
      );
    }

    const dbSettings = result.data?.nchat_presence_settings_by_pk;

    // If no settings exist, return defaults
    if (!dbSettings) {
      return successResponse<PresenceSettings>({
        userId,
        ...DEFAULT_PRESENCE_SETTINGS,
      });
    }

    return successResponse(transformToApiFormat(dbSettings));
  } catch (error) {
    logger.error("[PresenceSettings] Error fetching settings:", error);
    return errorResponse(
      "Failed to fetch presence settings",
      "INTERNAL_ERROR",
      500,
    );
  }
}

/**
 * PATCH /api/users/me/presence-settings
 *
 * Update current user's presence privacy settings
 */
async function patchHandler(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = request.user.id;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body");
  }

  const validation = validatePresenceSettingsInput(body);
  if (!validation.valid) {
    return badRequestResponse(validation.error, "VALIDATION_ERROR");
  }

  const input = validation.data;

  try {
    // First, get current settings to merge with
    const currentResult = await executeGraphQL<GetPresenceSettingsResponse>(
      GET_PRESENCE_SETTINGS_QUERY,
      { userId },
    );

    const currentSettings = currentResult.data?.nchat_presence_settings_by_pk;

    // Merge current settings with update (or use defaults)
    const mergedSettings = {
      visibility:
        input.visibility ??
        currentSettings?.visibility ??
        DEFAULT_PRESENCE_SETTINGS.visibility,
      showLastSeen:
        input.showLastSeen ??
        currentSettings?.show_last_seen ??
        DEFAULT_PRESENCE_SETTINGS.showLastSeen,
      showOnlineStatus:
        input.showOnlineStatus ??
        currentSettings?.show_online_status ??
        DEFAULT_PRESENCE_SETTINGS.showOnlineStatus,
      allowReadReceipts:
        input.allowReadReceipts ??
        currentSettings?.allow_read_receipts ??
        DEFAULT_PRESENCE_SETTINGS.allowReadReceipts,
      invisibleMode:
        input.invisibleMode ??
        currentSettings?.invisible_mode ??
        DEFAULT_PRESENCE_SETTINGS.invisibleMode,
    };

    // Upsert the settings
    const result = await executeGraphQL<UpsertPresenceSettingsResponse>(
      UPSERT_PRESENCE_SETTINGS_MUTATION,
      {
        userId,
        ...mergedSettings,
      },
    );

    if (result.errors?.length) {
      logger.error("[PresenceSettings] GraphQL errors:", result.errors);
      return errorResponse(
        "Failed to update presence settings",
        "GRAPHQL_ERROR",
        500,
      );
    }

    const updatedSettings = result.data?.insert_nchat_presence_settings_one;

    if (!updatedSettings) {
      return errorResponse(
        "Failed to update presence settings",
        "UPDATE_FAILED",
        500,
      );
    }

    return successResponse(transformToApiFormat(updatedSettings));
  } catch (error) {
    logger.error("[PresenceSettings] Error updating settings:", error);
    return errorResponse(
      "Failed to update presence settings",
      "INTERNAL_ERROR",
      500,
    );
  }
}

// ============================================================================
// Exports
// ============================================================================

// Compose middleware
export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }),
  withAuth,
)(getHandler);

export const PATCH = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(patchHandler);
