/**
 * App Lock Settings API Route
 *
 * Handles CRUD operations for app lock settings.
 *
 * Endpoints:
 * - GET /api/app-lock/settings - Get user's lock settings
 * - PUT /api/app-lock/settings - Update lock settings
 * - POST /api/app-lock/settings/pin - Set or change PIN
 * - DELETE /api/app-lock/settings/pin - Remove PIN
 *
 * @security These endpoints are client-side only - the actual PIN hashes
 * are stored in secure local storage (Keychain/Keystore), not on the server.
 * This API only manages the settings/policy configuration.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
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
  validationErrorResponse,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

// ============================================================================
// GraphQL Queries and Mutations
// ============================================================================

const GET_APP_LOCK_SETTINGS = gql`
  query GetAppLockSettings($userId: uuid!) {
    nchat_app_lock_settings(where: { user_id: { _eq: $userId } }) {
      id
      user_id
      mode
      idle_timeout_enabled
      idle_timeout_minutes
      idle_timeout_warning_seconds
      lock_on_launch_enabled
      lock_on_launch_threshold_seconds
      max_pin_attempts
      lockout_minutes
      pin_length
      daily_biometric_reset_hour
      created_at
      updated_at
    }
  }
`;

const UPSERT_APP_LOCK_SETTINGS = gql`
  mutation UpsertAppLockSettings(
    $userId: uuid!
    $mode: String!
    $idleTimeoutEnabled: Boolean!
    $idleTimeoutMinutes: Int!
    $idleTimeoutWarningSeconds: Int!
    $lockOnLaunchEnabled: Boolean!
    $lockOnLaunchThresholdSeconds: Int!
    $maxPinAttempts: Int!
    $lockoutMinutes: Int!
    $pinLength: Int!
    $dailyBiometricResetHour: Int!
  ) {
    insert_nchat_app_lock_settings_one(
      object: {
        user_id: $userId
        mode: $mode
        idle_timeout_enabled: $idleTimeoutEnabled
        idle_timeout_minutes: $idleTimeoutMinutes
        idle_timeout_warning_seconds: $idleTimeoutWarningSeconds
        lock_on_launch_enabled: $lockOnLaunchEnabled
        lock_on_launch_threshold_seconds: $lockOnLaunchThresholdSeconds
        max_pin_attempts: $maxPinAttempts
        lockout_minutes: $lockoutMinutes
        pin_length: $pinLength
        daily_biometric_reset_hour: $dailyBiometricResetHour
      }
      on_conflict: {
        constraint: nchat_app_lock_settings_user_id_key
        update_columns: [
          mode
          idle_timeout_enabled
          idle_timeout_minutes
          idle_timeout_warning_seconds
          lock_on_launch_enabled
          lock_on_launch_threshold_seconds
          max_pin_attempts
          lockout_minutes
          pin_length
          daily_biometric_reset_hour
          updated_at
        ]
      }
    ) {
      id
      user_id
      mode
      idle_timeout_enabled
      idle_timeout_minutes
      idle_timeout_warning_seconds
      lock_on_launch_enabled
      lock_on_launch_threshold_seconds
      max_pin_attempts
      lockout_minutes
      pin_length
      daily_biometric_reset_hour
      created_at
      updated_at
    }
  }
`;

const DELETE_APP_LOCK_SETTINGS = gql`
  mutation DeleteAppLockSettings($userId: uuid!) {
    delete_nchat_app_lock_settings(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// Types
// ============================================================================

interface DbAppLockSettings {
  id: string;
  user_id: string;
  mode: string;
  idle_timeout_enabled: boolean;
  idle_timeout_minutes: number;
  idle_timeout_warning_seconds: number;
  lock_on_launch_enabled: boolean;
  lock_on_launch_threshold_seconds: number;
  max_pin_attempts: number;
  lockout_minutes: number;
  pin_length: number;
  daily_biometric_reset_hour: number;
  created_at: string;
  updated_at: string;
}

interface ApiLockSettings {
  mode: "none" | "pin" | "biometric" | "pin_or_biometric" | "pin_and_biometric";
  idleTimeout: {
    enabled: boolean;
    timeoutMinutes: number;
    warningSeconds: number;
  };
  lockOnLaunch: {
    enabled: boolean;
    backgroundThresholdSeconds: number;
  };
  maxPinAttempts: number;
  lockoutMinutes: number;
  pinLength: number;
  dailyBiometricResetHour: number;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const lockModeSchema = z.enum([
  "none",
  "pin",
  "biometric",
  "pin_or_biometric",
  "pin_and_biometric",
]);

const idleTimeoutSchema = z.object({
  enabled: z.boolean(),
  timeoutMinutes: z.number().int().min(1).max(60),
  warningSeconds: z.number().int().min(0).max(120),
});

const lockOnLaunchSchema = z.object({
  enabled: z.boolean(),
  backgroundThresholdSeconds: z.number().int().min(0).max(3600),
});

const updateSettingsSchema = z.object({
  mode: lockModeSchema.optional(),
  idleTimeout: idleTimeoutSchema.optional(),
  lockOnLaunch: lockOnLaunchSchema.optional(),
  maxPinAttempts: z.number().int().min(3).max(10).optional(),
  lockoutMinutes: z.number().int().min(1).max(60).optional(),
  pinLength: z.number().int().min(4).max(8).optional(),
  dailyBiometricResetHour: z.number().int().min(0).max(23).optional(),
});

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: ApiLockSettings = {
  mode: "none",
  idleTimeout: {
    enabled: false,
    timeoutMinutes: 5,
    warningSeconds: 30,
  },
  lockOnLaunch: {
    enabled: true,
    backgroundThresholdSeconds: 60,
  },
  maxPinAttempts: 5,
  lockoutMinutes: 15,
  pinLength: 6,
  dailyBiometricResetHour: 4,
};

// ============================================================================
// Helpers
// ============================================================================

function dbToApiSettings(db: DbAppLockSettings): ApiLockSettings {
  return {
    mode: db.mode as ApiLockSettings["mode"],
    idleTimeout: {
      enabled: db.idle_timeout_enabled,
      timeoutMinutes: db.idle_timeout_minutes,
      warningSeconds: db.idle_timeout_warning_seconds,
    },
    lockOnLaunch: {
      enabled: db.lock_on_launch_enabled,
      backgroundThresholdSeconds: db.lock_on_launch_threshold_seconds,
    },
    maxPinAttempts: db.max_pin_attempts,
    lockoutMinutes: db.lockout_minutes,
    pinLength: db.pin_length,
    dailyBiometricResetHour: db.daily_biometric_reset_hour,
  };
}

// ============================================================================
// GET Handler
// ============================================================================

async function handleGet(request: AuthenticatedRequest): Promise<NextResponse> {
  const userId = request.user.id;

  try {
    const { data } = await apolloClient.query<{
      nchat_app_lock_settings: DbAppLockSettings[];
    }>({
      query: GET_APP_LOCK_SETTINGS,
      variables: { userId },
      fetchPolicy: "network-only",
    });

    const settings = data.nchat_app_lock_settings[0];

    if (!settings) {
      return successResponse({
        settings: DEFAULT_SETTINGS,
        hasStoredSettings: false,
      });
    }

    return successResponse({
      settings: dbToApiSettings(settings),
      hasStoredSettings: true,
      updatedAt: settings.updated_at,
    });
  } catch (error) {
    logger.error(
      "[AppLockSettings] Failed to get settings",
      error instanceof Error ? error : new Error(String(error)),
    );
    return errorResponse(
      "Failed to retrieve app lock settings",
      "SETTINGS_FETCH_FAILED",
      500,
    );
  }
}

// ============================================================================
// PUT Handler
// ============================================================================

async function handlePut(request: AuthenticatedRequest): Promise<NextResponse> {
  const userId = request.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body");
  }

  const validation = updateSettingsSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    for (const error of validation.error.errors) {
      const path = error.path.join(".");
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(error instanceof Error ? error.message : String(error));
    }
    return validationErrorResponse(errors);
  }

  const updates = validation.data;

  try {
    // Get current settings first
    const { data: currentData } = await apolloClient.query<{
      nchat_app_lock_settings: DbAppLockSettings[];
    }>({
      query: GET_APP_LOCK_SETTINGS,
      variables: { userId },
      fetchPolicy: "network-only",
    });

    const current = currentData.nchat_app_lock_settings[0];
    const base = current ? dbToApiSettings(current) : DEFAULT_SETTINGS;

    // Merge updates
    const merged: ApiLockSettings = {
      mode: updates.mode ?? base.mode,
      idleTimeout: {
        ...base.idleTimeout,
        ...updates.idleTimeout,
      },
      lockOnLaunch: {
        ...base.lockOnLaunch,
        ...updates.lockOnLaunch,
      },
      maxPinAttempts: updates.maxPinAttempts ?? base.maxPinAttempts,
      lockoutMinutes: updates.lockoutMinutes ?? base.lockoutMinutes,
      pinLength: updates.pinLength ?? base.pinLength,
      dailyBiometricResetHour:
        updates.dailyBiometricResetHour ?? base.dailyBiometricResetHour,
    };

    // Upsert settings
    const { data: upsertData } = await apolloClient.mutate<{
      insert_nchat_app_lock_settings_one: DbAppLockSettings;
    }>({
      mutation: UPSERT_APP_LOCK_SETTINGS,
      variables: {
        userId,
        mode: merged.mode,
        idleTimeoutEnabled: merged.idleTimeout.enabled,
        idleTimeoutMinutes: merged.idleTimeout.timeoutMinutes,
        idleTimeoutWarningSeconds: merged.idleTimeout.warningSeconds,
        lockOnLaunchEnabled: merged.lockOnLaunch.enabled,
        lockOnLaunchThresholdSeconds:
          merged.lockOnLaunch.backgroundThresholdSeconds,
        maxPinAttempts: merged.maxPinAttempts,
        lockoutMinutes: merged.lockoutMinutes,
        pinLength: merged.pinLength,
        dailyBiometricResetHour: merged.dailyBiometricResetHour,
      },
    });

    if (!upsertData?.insert_nchat_app_lock_settings_one) {
      return errorResponse(
        "Failed to save settings",
        "SETTINGS_SAVE_FAILED",
        500,
      );
    }

    logger.info("[AppLockSettings] Settings updated", {
      userId,
      mode: merged.mode,
    });

    return successResponse({
      settings: dbToApiSettings(upsertData.insert_nchat_app_lock_settings_one),
      updatedAt: upsertData.insert_nchat_app_lock_settings_one.updated_at,
    });
  } catch (error) {
    logger.error(
      "[AppLockSettings] Failed to update settings",
      error instanceof Error ? error : new Error(String(error)),
    );
    return errorResponse(
      "Failed to save app lock settings",
      "SETTINGS_SAVE_FAILED",
      500,
    );
  }
}

// ============================================================================
// DELETE Handler
// ============================================================================

async function handleDelete(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  const userId = request.user.id;

  try {
    await apolloClient.mutate({
      mutation: DELETE_APP_LOCK_SETTINGS,
      variables: { userId },
    });

    logger.info("[AppLockSettings] Settings deleted", { userId });

    return successResponse({
      message: "App lock settings deleted",
      settings: DEFAULT_SETTINGS,
    });
  } catch (error) {
    logger.error(
      "[AppLockSettings] Failed to delete settings",
      error instanceof Error ? error : new Error(String(error)),
    );
    return errorResponse(
      "Failed to delete app lock settings",
      "SETTINGS_DELETE_FAILED",
      500,
    );
  }
}

// ============================================================================
// Exports
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }),
  withAuth,
)(handleGet);

export const PUT = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(handlePut);

export const DELETE = compose(
  withErrorHandler,
  withRateLimit({ limit: 10, window: 60 }),
  withAuth,
)(handleDelete);
