/**
 * Settings Sync API Route
 *
 * Handles settings synchronization across devices with conflict resolution.
 *
 * Endpoint:
 * - POST /api/settings/sync - Sync settings across devices
 *
 * Request body:
 * - clientVersion: number - The client's current settings version
 * - settings: UserSettings - The client's current settings
 * - deviceId: string - Unique identifier for the device
 *
 * Response:
 * - settings: UserSettings - The merged settings
 * - version: number - The new server version
 * - syncStatus: 'synced' | 'merged' | 'conflict_resolved'
 * - conflictResolutions: array of resolved conflicts
 *
 * Conflict Resolution Strategy:
 * - Server wins for security/privacy settings
 * - Client wins for preferences (theme, notifications, accessibility, etc.)
 * - Newer timestamp wins for metadata
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
  validationErrorResponse,
} from "@/lib/api/response";
import {
  GET_USER_SETTINGS,
  UPSERT_USER_SETTINGS,
  DEFAULT_USER_SETTINGS,
  SERVER_WINS_CATEGORIES,
  CLIENT_WINS_CATEGORIES,
  type GetUserSettingsResponse,
  type UpsertUserSettingsResponse,
  type UserSettings,
  type ThemeSettings,
  type NotificationSettings,
  type PrivacySettings,
  type AccessibilitySettings,
  type LocaleSettings,
  type KeyboardShortcutSettings,
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

const syncRequestSchema = z.object({
  clientVersion: z.number().int().min(0),
  settings: userSettingsSchema,
  deviceId: z.string().min(1).max(255),
});

// ============================================================================
// Types
// ============================================================================

interface ConflictResolution {
  category: string;
  field?: string;
  clientValue: unknown;
  serverValue: unknown;
  resolvedValue: unknown;
  winner: "client" | "server";
  reason: string;
}

interface SyncResult {
  settings: UserSettings;
  version: number;
  updatedAt: string;
  syncStatus: "synced" | "merged" | "conflict_resolved";
  conflictResolutions: ConflictResolution[];
}

// ============================================================================
// Audit Logging Helper
// ============================================================================

async function logSettingsSync(
  userId: string,
  deviceId: string,
  syncStatus: string,
  conflictCount: number,
  clientVersion: number,
  serverVersion: number,
  ipAddress?: string,
): Promise<void> {
  try {
    await apolloClient.mutate({
      mutation: INSERT_AUDIT_LOG,
      variables: {
        object: {
          category: "settings",
          action: "sync",
          severity: conflictCount > 0 ? "warning" : "info",
          actor_id: userId,
          actor_type: "user",
          resource_type: "user_settings",
          resource_id: userId,
          description: `Settings synced from device ${deviceId}`,
          success: true,
          ip_address: ipAddress,
          metadata: {
            deviceId,
            syncStatus,
            conflictCount,
            clientVersion,
            serverVersion,
          },
        },
      },
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    logger.error("[Settings Sync API] Failed to log audit entry:", error);
  }
}

// ============================================================================
// Sync Logic
// ============================================================================

/**
 * Merge settings with conflict resolution
 *
 * Strategy:
 * - Server wins for privacy/security settings (SERVER_WINS_CATEGORIES)
 * - Client wins for preferences (CLIENT_WINS_CATEGORIES)
 */
function mergeSettingsWithConflictResolution(
  clientSettings: UserSettings,
  serverSettings: UserSettings,
  clientVersion: number,
  serverVersion: number,
): { merged: UserSettings; conflicts: ConflictResolution[] } {
  const conflicts: ConflictResolution[] = [];
  const merged = { ...DEFAULT_USER_SETTINGS } as UserSettings;

  // Process each settings category
  const categories: (keyof Omit<UserSettings, "_meta">)[] = [
    "theme",
    "notifications",
    "privacy",
    "accessibility",
    "locale",
    "keyboardShortcuts",
  ];

  for (const category of categories) {
    const clientCategory = clientSettings[category];
    const serverCategory = serverSettings[category];

    // Determine winner based on category type
    const serverWins = SERVER_WINS_CATEGORIES.includes(
      category as keyof UserSettings,
    );
    const winner = serverWins ? "server" : "client";

    // Deep compare and merge the category
    const { mergedCategory, categoryConflicts } = mergeCategoryWithConflicts(
      category,
      clientCategory as unknown as Record<string, unknown>,
      serverCategory as unknown as Record<string, unknown>,
      winner,
      serverWins
        ? "Security-sensitive settings prefer server values"
        : "User preferences prefer client values",
    );

    (merged as unknown as Record<string, unknown>)[category] = mergedCategory;
    conflicts.push(...categoryConflicts);
  }

  // Handle _meta separately - newer timestamp wins
  merged._meta = {
    lastSyncedAt: new Date().toISOString(),
    lastSyncedDevice: clientSettings._meta?.lastSyncedDevice,
    schemaVersion: Math.max(
      clientSettings._meta?.schemaVersion || 1,
      serverSettings._meta?.schemaVersion || 1,
    ),
  };

  return { merged, conflicts };
}

/**
 * Merge a single settings category with conflict detection
 */
function mergeCategoryWithConflicts<T extends Record<string, unknown>>(
  categoryName: string,
  clientCategory: T,
  serverCategory: T,
  defaultWinner: "client" | "server",
  defaultReason: string,
): { mergedCategory: T; categoryConflicts: ConflictResolution[] } {
  const categoryConflicts: ConflictResolution[] = [];
  const mergedCategory = { ...serverCategory } as T;

  // Compare each field in the category
  const allKeys = new Set([
    ...Object.keys(clientCategory || {}),
    ...Object.keys(serverCategory || {}),
  ]);

  for (const key of allKeys) {
    const clientValue = clientCategory?.[key as keyof T];
    const serverValue = serverCategory?.[key as keyof T];

    // Skip if values are equal
    if (deepEqual(clientValue, serverValue)) {
      continue;
    }

    // Record conflict
    const resolvedValue =
      defaultWinner === "client" ? clientValue : serverValue;
    categoryConflicts.push({
      category: categoryName,
      field: key,
      clientValue,
      serverValue,
      resolvedValue,
      winner: defaultWinner,
      reason: defaultReason,
    });

    // Apply resolved value
    if (defaultWinner === "client" && clientValue !== undefined) {
      (mergedCategory as Record<string, unknown>)[key] = clientValue;
    }
    // Server value is already in mergedCategory by default
  }

  return { mergedCategory, categoryConflicts };
}

/**
 * Deep equality check for comparing settings values
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
  }

  return false;
}

// ============================================================================
// POST /api/settings/sync - Sync settings across devices
// ============================================================================

async function syncSettingsHandler(request: AuthenticatedRequest) {
  const { user } = request;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body");
  }

  const validationResult = syncRequestSchema.safeParse(body);
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

  const {
    clientVersion,
    settings: clientSettings,
    deviceId,
  } = validationResult.data;

  try {
    // Get current server settings
    const { data: serverData } =
      await apolloClient.query<GetUserSettingsResponse>({
        query: GET_USER_SETTINGS,
        variables: { userId: user.id },
        fetchPolicy: "network-only",
      });

    const serverRecord = serverData?.nchat_user_settings_by_pk;
    const serverSettings = serverRecord?.settings || DEFAULT_USER_SETTINGS;
    const serverVersion = serverRecord?.version || 0;

    let result: SyncResult;

    // Case 1: No server settings exist - use client settings
    if (!serverRecord) {
      const newSettings: UserSettings = {
        ...clientSettings,
        _meta: {
          lastSyncedAt: new Date().toISOString(),
          lastSyncedDevice: deviceId,
          schemaVersion: clientSettings._meta?.schemaVersion || 1,
        },
      };

      const { data } = await apolloClient.mutate<UpsertUserSettingsResponse>({
        mutation: UPSERT_USER_SETTINGS,
        variables: {
          userId: user.id,
          settings: newSettings,
          version: 1,
        },
      });

      const upsertResult = data?.insert_nchat_user_settings_one;

      if (!upsertResult) {
        return errorResponse(
          "Failed to create settings",
          "SYNC_CREATE_ERROR",
          500,
        );
      }

      result = {
        settings: upsertResult.settings,
        version: upsertResult.version,
        updatedAt: upsertResult.updated_at,
        syncStatus: "synced",
        conflictResolutions: [],
      };
    }
    // Case 2: Client is up to date - no changes needed
    else if (
      clientVersion >= serverVersion &&
      deepEqual(clientSettings, serverSettings)
    ) {
      result = {
        settings: serverSettings,
        version: serverVersion,
        updatedAt: serverRecord.updated_at,
        syncStatus: "synced",
        conflictResolutions: [],
      };
    }
    // Case 3: Server is newer - client needs to update
    else if (
      clientVersion < serverVersion &&
      deepEqual(clientSettings, serverSettings)
    ) {
      result = {
        settings: serverSettings,
        version: serverVersion,
        updatedAt: serverRecord.updated_at,
        syncStatus: "synced",
        conflictResolutions: [],
      };
    }
    // Case 4: Both have changes - merge with conflict resolution
    else {
      const { merged, conflicts } = mergeSettingsWithConflictResolution(
        clientSettings,
        serverSettings,
        clientVersion,
        serverVersion,
      );

      // Update merged settings with sync metadata
      merged._meta = {
        ...merged._meta,
        lastSyncedAt: new Date().toISOString(),
        lastSyncedDevice: deviceId,
      };

      // Save merged settings
      const newVersion = serverVersion + 1;
      const { data } = await apolloClient.mutate<UpsertUserSettingsResponse>({
        mutation: UPSERT_USER_SETTINGS,
        variables: {
          userId: user.id,
          settings: merged,
          version: newVersion,
        },
      });

      const upsertResult = data?.insert_nchat_user_settings_one;

      if (!upsertResult) {
        return errorResponse(
          "Failed to save merged settings",
          "SYNC_MERGE_ERROR",
          500,
        );
      }

      result = {
        settings: upsertResult.settings,
        version: upsertResult.version,
        updatedAt: upsertResult.updated_at,
        syncStatus: conflicts.length > 0 ? "conflict_resolved" : "merged",
        conflictResolutions: conflicts,
      };
    }

    // Log to audit trail
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      undefined;
    await logSettingsSync(
      user.id,
      deviceId,
      result.syncStatus,
      result.conflictResolutions.length,
      clientVersion,
      result.version,
      clientIp,
    );

    return successResponse(result);
  } catch (error) {
    logger.error("[Settings Sync API] Error syncing settings:", error);
    return errorResponse("Failed to sync settings", "SYNC_ERROR", 500);
  }
}

// ============================================================================
// Route Handler
// ============================================================================

// Rate limit: 20 requests per minute for sync (more expensive operation)
const rateLimitOptions = {
  limit: 20,
  window: 60,
};

export const POST = compose(
  withErrorHandler,
  withRateLimit(rateLimitOptions),
  withAuth,
)(syncSettingsHandler);
