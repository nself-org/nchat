/**
 * User Settings API Route
 *
 * Handles CRUD operations for user settings.
 *
 * Endpoints:
 * - GET /api/settings - Get user's settings
 * - POST /api/settings - Update user's settings (full replacement)
 * - PATCH /api/settings - Partial update with merge logic
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import {
  withAuth,
  withRateLimit,
  withErrorHandler,
  compose,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/lib/api/response";
import {
  GET_USER_SETTINGS,
  UPDATE_USER_SETTINGS,
  UPSERT_USER_SETTINGS,
  MERGE_USER_SETTINGS,
  DEFAULT_USER_SETTINGS,
  type GetUserSettingsResponse,
  type UpdateUserSettingsResponse,
  type UpsertUserSettingsResponse,
  type MergeUserSettingsResponse,
  type UserSettings,
} from "@/graphql/settings";
import { INSERT_AUDIT_LOG } from "@/graphql/audit/audit-mutations";

import { logger } from "@/lib/logger";

// ============================================================================
// Validation Schemas
// ============================================================================

const themeSettingsSchema = z.object({
  mode: z.enum(["dark", "light", "system"]),
  preset: z.string().optional(),
  accentColor: z.string().optional(),
});

const notificationSettingsSchema = z.object({
  sound: z.boolean(),
  soundVolume: z.number().min(0).max(1),
  desktop: z.boolean(),
  desktopPreview: z.boolean(),
  email: z.boolean(),
  emailDigest: z.enum(["instant", "daily", "weekly", "never"]),
  mentions: z.boolean(),
  directMessages: z.boolean(),
  channelMessages: z.boolean(),
  threads: z.boolean(),
  reactions: z.boolean(),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
  quietHoursTimezone: z.string(),
});

const privacySettingsSchema = z.object({
  onlineStatusVisible: z.boolean(),
  lastSeenVisible: z.boolean(),
  readReceipts: z.boolean(),
  typingIndicators: z.boolean(),
  profileVisible: z.enum(["everyone", "contacts", "nobody"]),
  activityStatus: z.boolean(),
});

const accessibilitySettingsSchema = z.object({
  fontSize: z.enum(["small", "medium", "large", "extra-large"]),
  reducedMotion: z.boolean(),
  highContrast: z.boolean(),
  screenReaderOptimized: z.boolean(),
  keyboardNavigation: z.boolean(),
  focusIndicators: z.boolean(),
  colorBlindMode: z.enum(["none", "protanopia", "deuteranopia", "tritanopia"]),
});

const localeSettingsSchema = z.object({
  language: z.string().min(2).max(10),
  timezone: z.string(),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
  timeFormat: z.enum(["12h", "24h"]),
  firstDayOfWeek: z.union([z.literal(0), z.literal(1), z.literal(6)]),
  numberFormat: z.string(),
});

const keyboardShortcutSettingsSchema = z.object({
  enabled: z.boolean(),
  customShortcuts: z.record(z.string()),
  sendMessage: z.string(),
  newLine: z.string(),
  search: z.string(),
  quickSwitcher: z.string(),
  markAsRead: z.string(),
  toggleSidebar: z.string(),
  nextChannel: z.string(),
  prevChannel: z.string(),
  toggleMute: z.string(),
  uploadFile: z.string(),
});

const userSettingsSchema = z.object({
  theme: themeSettingsSchema,
  notifications: notificationSettingsSchema,
  privacy: privacySettingsSchema,
  accessibility: accessibilitySettingsSchema,
  locale: localeSettingsSchema,
  keyboardShortcuts: keyboardShortcutSettingsSchema,
  _meta: z
    .object({
      lastSyncedAt: z.string().optional(),
      lastSyncedDevice: z.string().optional(),
      schemaVersion: z.number().optional(),
    })
    .optional(),
});

// Partial schema for PATCH requests
const partialUserSettingsSchema = z.object({
  theme: themeSettingsSchema.partial().optional(),
  notifications: notificationSettingsSchema.partial().optional(),
  privacy: privacySettingsSchema.partial().optional(),
  accessibility: accessibilitySettingsSchema.partial().optional(),
  locale: localeSettingsSchema.partial().optional(),
  keyboardShortcuts: keyboardShortcutSettingsSchema.partial().optional(),
  _meta: z
    .object({
      lastSyncedAt: z.string().optional(),
      lastSyncedDevice: z.string().optional(),
      schemaVersion: z.number().optional(),
    })
    .optional(),
});

// ============================================================================
// Audit Logging Helper
// ============================================================================

async function logSettingsChange(
  userId: string,
  action: string,
  previousSettings: UserSettings | null,
  newSettings: UserSettings | Partial<UserSettings>,
  ipAddress?: string,
): Promise<void> {
  try {
    await apolloClient.mutate({
      mutation: INSERT_AUDIT_LOG,
      variables: {
        object: {
          category: "settings",
          action,
          severity: "info",
          actor_id: userId,
          actor_type: "user",
          resource_type: "user_settings",
          resource_id: userId,
          resource_previous_value: previousSettings,
          resource_new_value: newSettings,
          description: `User settings ${action}`,
          success: true,
          ip_address: ipAddress,
        },
      },
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    logger.error("[Settings API] Failed to log audit entry:", error);
  }
}

// ============================================================================
// GET /api/settings - Get user's settings
// ============================================================================

async function getSettingsHandler(request: AuthenticatedRequest) {
  const { user } = request;

  try {
    const { data } = await apolloClient.query<GetUserSettingsResponse>({
      query: GET_USER_SETTINGS,
      variables: { userId: user.id },
      fetchPolicy: "network-only",
    });

    const settings = data?.nchat_user_settings_by_pk;

    if (!settings) {
      // Return default settings if none exist
      return successResponse({
        settings: DEFAULT_USER_SETTINGS,
        version: 0,
        isDefault: true,
      });
    }

    return successResponse({
      settings: settings.settings,
      version: settings.version,
      updatedAt: settings.updated_at,
      isDefault: false,
    });
  } catch (error) {
    logger.error("[Settings API] Error fetching settings:", error);
    return errorResponse(
      "Failed to fetch settings",
      "SETTINGS_FETCH_ERROR",
      500,
    );
  }
}

// ============================================================================
// POST /api/settings - Update user's settings (full replacement)
// ============================================================================

async function postSettingsHandler(request: AuthenticatedRequest) {
  const { user } = request;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body");
  }

  const validationResult = userSettingsSchema.safeParse(body);
  if (!validationResult.success) {
    const errors: Record<string, string[]> = {};
    for (const error of validationResult.error.errors) {
      const path = error.path.join(".");
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(error instanceof Error ? error.message : String(error));
    }
    return validationErrorResponse(errors);
  }

  const newSettings = validationResult.data as UserSettings;

  try {
    // Get current settings for audit log
    const { data: currentData } =
      await apolloClient.query<GetUserSettingsResponse>({
        query: GET_USER_SETTINGS,
        variables: { userId: user.id },
        fetchPolicy: "network-only",
      });

    const previousSettings =
      currentData?.nchat_user_settings_by_pk?.settings || null;
    const currentVersion = currentData?.nchat_user_settings_by_pk?.version || 0;

    // Upsert settings
    const { data } = await apolloClient.mutate<UpsertUserSettingsResponse>({
      mutation: UPSERT_USER_SETTINGS,
      variables: {
        userId: user.id,
        settings: newSettings,
        version: currentVersion + 1,
      },
    });

    const result = data?.insert_nchat_user_settings_one;

    if (!result) {
      return errorResponse(
        "Failed to save settings",
        "SETTINGS_SAVE_ERROR",
        500,
      );
    }

    // Log to audit trail
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      undefined;
    await logSettingsChange(
      user.id,
      "update",
      previousSettings,
      newSettings,
      clientIp,
    );

    return successResponse({
      settings: result.settings,
      version: result.version,
      updatedAt: result.updated_at,
    });
  } catch (error) {
    logger.error("[Settings API] Error saving settings:", error);
    return errorResponse("Failed to save settings", "SETTINGS_SAVE_ERROR", 500);
  }
}

// ============================================================================
// PATCH /api/settings - Partial update with merge logic
// ============================================================================

async function patchSettingsHandler(request: AuthenticatedRequest) {
  const { user } = request;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body");
  }

  const validationResult = partialUserSettingsSchema.safeParse(body);
  if (!validationResult.success) {
    const errors: Record<string, string[]> = {};
    for (const error of validationResult.error.errors) {
      const path = error.path.join(".");
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(error instanceof Error ? error.message : String(error));
    }
    return validationErrorResponse(errors);
  }

  const partialSettings = validationResult.data as Partial<UserSettings>;

  // Check if there's anything to update
  if (Object.keys(partialSettings).length === 0) {
    return badRequestResponse("No settings provided");
  }

  try {
    // Get current settings
    const { data: currentData } =
      await apolloClient.query<GetUserSettingsResponse>({
        query: GET_USER_SETTINGS,
        variables: { userId: user.id },
        fetchPolicy: "network-only",
      });

    const currentSettings =
      currentData?.nchat_user_settings_by_pk?.settings || DEFAULT_USER_SETTINGS;
    const currentVersion = currentData?.nchat_user_settings_by_pk?.version || 0;

    // Deep merge settings
    const mergedSettings = deepMergeSettings(currentSettings, partialSettings);

    // Update settings
    const { data } = await apolloClient.mutate<UpdateUserSettingsResponse>({
      mutation: UPDATE_USER_SETTINGS,
      variables: {
        userId: user.id,
        settings: mergedSettings,
      },
    });

    let result = data?.update_nchat_user_settings_by_pk;

    // If no existing record, create one
    if (!result && !currentData?.nchat_user_settings_by_pk) {
      const { data: upsertData } =
        await apolloClient.mutate<UpsertUserSettingsResponse>({
          mutation: UPSERT_USER_SETTINGS,
          variables: {
            userId: user.id,
            settings: mergedSettings,
            version: 1,
          },
        });
      result = upsertData?.insert_nchat_user_settings_one || null;
    }

    if (!result) {
      return errorResponse(
        "Failed to update settings",
        "SETTINGS_UPDATE_ERROR",
        500,
      );
    }

    // Log to audit trail
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      undefined;
    await logSettingsChange(
      user.id,
      "partial_update",
      currentSettings,
      partialSettings,
      clientIp,
    );

    return successResponse({
      settings: result.settings,
      version: result.version,
      updatedAt: result.updated_at,
    });
  } catch (error) {
    logger.error("[Settings API] Error updating settings:", error);
    return errorResponse(
      "Failed to update settings",
      "SETTINGS_UPDATE_ERROR",
      500,
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Deep merge settings objects
 */
function deepMergeSettings(
  current: UserSettings,
  partial: Partial<UserSettings>,
): UserSettings {
  const result = { ...current };

  for (const key of Object.keys(partial) as (keyof UserSettings)[]) {
    if (key === "_meta") {
      result._meta = { ...current._meta, ...partial._meta };
    } else if (partial[key] !== undefined) {
      const resultAny = result as unknown as Record<string, unknown>;
      const currentAny = current as unknown as Record<string, unknown>;
      const partialAny = partial as unknown as Record<string, unknown>;
      resultAny[key] = {
        ...(currentAny[key] as object),
        ...(partialAny[key] as object),
      };
    }
  }

  return result;
}

// ============================================================================
// Route Handlers
// ============================================================================

// Rate limit: 60 requests per minute for regular settings operations
const rateLimitOptions = {
  limit: 60,
  window: 60,
};

export const GET = compose(
  withErrorHandler,
  withRateLimit(rateLimitOptions),
  withAuth,
)(getSettingsHandler);

export const POST = compose(
  withErrorHandler,
  withRateLimit(rateLimitOptions),
  withAuth,
)(postSettingsHandler);

export const PATCH = compose(
  withErrorHandler,
  withRateLimit(rateLimitOptions),
  withAuth,
)(patchSettingsHandler);
