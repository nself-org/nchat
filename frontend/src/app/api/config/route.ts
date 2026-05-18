/**
 * App Configuration API Route
 *
 * Manages application configuration for white-label customization.
 * GET is public (cached), POST requires admin authentication.
 *
 * @endpoint GET /api/config - Get current app configuration
 * @endpoint POST /api/config - Update app configuration (admin only)
 * @endpoint PATCH /api/config - Partial update (admin only)
 *
 * @example
 * ```typescript
 * // Get configuration
 * const response = await fetch('/api/config')
 * const { data } = await response.json()
 * // { config: AppConfig }
 *
 * // Update configuration (admin only)
 * const response = await fetch('/api/config', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': 'Bearer <token>'
 *   },
 *   body: JSON.stringify({ branding: { appName: 'My Chat' } })
 * })
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { defaultAppConfig, type AppConfig } from "@/config/app-config";
import {
  successResponse,
  badRequestResponse,
  forbiddenResponse,
  internalErrorResponse,
  cachedResponse,
} from "@/lib/api/response";
import {
  withErrorHandler,
  withAuth,
  withAdmin,
  compose,
  getAuthenticatedUser,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import { withCsrfProtection } from "@/lib/security/csrf";
import { getApolloClient } from "@/lib/apollo-server";
import {
  GET_APP_CONFIG,
  UPDATE_APP_CONFIG,
  GET_APP_CONFIG_HISTORY,
  type GetAppConfigResponse,
  type GetAppConfigHistoryResponse,
  type AppConfigurationRow,
} from "@/graphql/app-config";
import { INSERT_AUDIT_LOG } from "@/graphql/audit/audit-mutations";

import { logger } from "@/lib/logger";

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Cache TTL for public config (5 minutes)
  CACHE_TTL: 5 * 60,

  // Config version for cache busting
  CONFIG_VERSION: "1.0.0",
};

// ============================================================================
// Config Section Mapping
// ============================================================================

/**
 * Maps AppConfig top-level keys to their database category.
 * Each section of the config is stored as a separate key-value row.
 */
const CONFIG_SECTIONS: (keyof AppConfig)[] = [
  "setup",
  "owner",
  "branding",
  "landingTheme",
  "homepage",
  "authProviders",
  "authPermissions",
  "features",
  "integrations",
  "moderation",
  "encryption",
  "theme",
  "seo",
  "legal",
  "social",
  "enterprise",
];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Deep merge two objects
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target } as T;

  for (const key of Object.keys(source as object)) {
    const typedKey = key as keyof T;
    const sourceValue = (source as T)[typedKey];
    const targetValue = target[typedKey];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[typedKey] = deepMerge(
        targetValue as object,
        sourceValue as object,
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[typedKey] = sourceValue;
    }
  }

  return result;
}

/**
 * Validate configuration update
 */
function validateConfigUpdate(
  updates: Partial<AppConfig>,
): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  // Validate branding
  if (updates.branding) {
    if (updates.branding.appName !== undefined) {
      if (typeof updates.branding.appName !== "string") {
        errors.push("branding.appName must be a string");
      } else if (
        updates.branding.appName.length < 1 ||
        updates.branding.appName.length > 50
      ) {
        errors.push("branding.appName must be 1-50 characters");
      }
    }

    if (updates.branding.logoScale !== undefined) {
      if (typeof updates.branding.logoScale !== "number") {
        errors.push("branding.logoScale must be a number");
      } else if (
        updates.branding.logoScale < 0.5 ||
        updates.branding.logoScale > 2.0
      ) {
        errors.push("branding.logoScale must be between 0.5 and 2.0");
      }
    }
  }

  // Validate theme colors
  if (updates.theme) {
    const colorFields = [
      "primaryColor",
      "secondaryColor",
      "accentColor",
      "backgroundColor",
      "surfaceColor",
      "textColor",
      "mutedColor",
      "borderColor",
      "buttonPrimaryBg",
      "buttonPrimaryText",
      "buttonSecondaryBg",
      "buttonSecondaryText",
      "successColor",
      "warningColor",
      "errorColor",
      "infoColor",
    ] as const;

    for (const field of colorFields) {
      const value = updates.theme[field];
      if (value !== undefined) {
        if (typeof value !== "string") {
          errors.push(`theme.${field} must be a string`);
        } else if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
          errors.push(
            `theme.${field} must be a valid hex color (e.g., #FF0000)`,
          );
        }
      }
    }

    if (updates.theme.colorScheme !== undefined) {
      if (!["light", "dark", "system"].includes(updates.theme.colorScheme)) {
        errors.push('theme.colorScheme must be "light", "dark", or "system"');
      }
    }
  }

  // Validate owner
  if (updates.owner) {
    if (updates.owner.email !== undefined) {
      if (typeof updates.owner.email !== "string") {
        errors.push("owner.email must be a string");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.owner.email)) {
        errors.push("owner.email must be a valid email address");
      }
    }
  }

  // Validate auth permissions
  if (updates.authPermissions) {
    if (updates.authPermissions.mode !== undefined) {
      const validModes = [
        "allow-all",
        "verified-only",
        "idme-roles",
        "domain-restricted",
        "admin-only",
      ];
      if (!validModes.includes(updates.authPermissions.mode)) {
        errors.push(
          `authPermissions.mode must be one of: ${validModes.join(", ")}`,
        );
      }
    }

    if (updates.authPermissions.allowedDomains !== undefined) {
      if (!Array.isArray(updates.authPermissions.allowedDomains)) {
        errors.push("authPermissions.allowedDomains must be an array");
      }
    }
  }

  // Validate landing theme
  if (updates.landingTheme !== undefined) {
    const validThemes = [
      "login-only",
      "simple-landing",
      "full-homepage",
      "corporate",
      "community",
    ];
    if (!validThemes.includes(updates.landingTheme)) {
      errors.push(`landingTheme must be one of: ${validThemes.join(", ")}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Convert database rows to AppConfig object.
 * Each row has a key (section name) and value (JSON string).
 */
function rowsToConfig(rows: AppConfigurationRow[]): AppConfig {
  const config = { ...defaultAppConfig };

  for (const row of rows) {
    const key = row.key as keyof AppConfig;
    if (CONFIG_SECTIONS.includes(key)) {
      try {
        const parsed = JSON.parse(row.value);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config as Record<string, unknown>)[key] = parsed;
      } catch (e) {
        logger.error(
          `Failed to parse config value for key "${String(key)}":`,
          e,
        );
      }
    }
  }

  return config;
}

/**
 * Convert AppConfig object to database rows for upsert.
 */
function configToRows(
  config: AppConfig,
): Array<{ key: string; value: string; category: string }> {
  const rows: Array<{ key: string; value: string; category: string }> = [];

  for (const section of CONFIG_SECTIONS) {
    const value = config[section];
    if (value !== undefined) {
      rows.push({
        key: String(section),
        value: JSON.stringify(value),
        category: getCategoryForSection(section),
      });
    }
  }

  return rows;
}

/**
 * Get the category for a config section (for organization purposes).
 */
function getCategoryForSection(section: keyof AppConfig): string {
  const categoryMap: Record<string, string> = {
    setup: "system",
    owner: "identity",
    branding: "identity",
    landingTheme: "appearance",
    homepage: "appearance",
    theme: "appearance",
    authProviders: "authentication",
    authPermissions: "authentication",
    features: "features",
    integrations: "features",
    moderation: "security",
    encryption: "security",
    enterprise: "security",
    seo: "metadata",
    legal: "metadata",
    social: "metadata",
  };
  return categoryMap[String(section)] || "general";
}

/**
 * Get configuration from database via GraphQL.
 * Falls back to default config if database is unavailable.
 */
async function getConfigFromDatabase(): Promise<AppConfig> {
  try {
    const client = getApolloClient();
    const { data } = await client.query<GetAppConfigResponse>({
      query: GET_APP_CONFIG,
      fetchPolicy: "network-only",
    });

    if (!data?.app_configuration || data.app_configuration.length === 0) {
      // No config in database yet, return defaults
      return { ...defaultAppConfig };
    }

    return rowsToConfig(data.app_configuration);
  } catch (error) {
    logger.error("Failed to fetch config from database:", error);
    // Return default config on database error (graceful degradation for reads)
    return { ...defaultAppConfig };
  }
}

/**
 * Get configuration history from audit logs.
 */
async function getConfigHistory(limit: number = 10): Promise<
  Array<{
    timestamp: string;
    updatedBy: string;
    changes: Record<string, unknown>;
  }>
> {
  try {
    const client = getApolloClient();
    const { data } = await client.query<GetAppConfigHistoryResponse>({
      query: GET_APP_CONFIG_HISTORY,
      variables: { limit },
      fetchPolicy: "network-only",
    });

    if (!data?.nchat_audit_logs) {
      return [];
    }

    return data.nchat_audit_logs.map((entry) => ({
      timestamp: entry.timestamp,
      updatedBy: entry.actor_email || "unknown",
      changes: entry.resource_new_value || {},
    }));
  } catch (error) {
    logger.error("Failed to fetch config history:", error);
    return [];
  }
}

/**
 * Save configuration to database via GraphQL.
 * Also records an audit log entry for the change.
 * Throws on database error (writes should fail explicitly).
 */
async function saveConfigToDatabase(
  config: AppConfig,
  updatedBy: string,
): Promise<void> {
  const client = getApolloClient();

  // Convert config to rows for upsert
  const rows = configToRows(config);

  try {
    // Save config to database
    await client.mutate({
      mutation: UPDATE_APP_CONFIG,
      variables: { objects: rows },
    });

    // Record audit log entry
    await client.mutate({
      mutation: INSERT_AUDIT_LOG,
      variables: {
        object: {
          category: "admin",
          action: "config.update",
          severity: "info",
          actor_id: null, // Will be populated if we have user context
          actor_type: "user",
          actor_email: updatedBy,
          resource_type: "app_configuration",
          resource_id: "global",
          resource_name: "App Configuration",
          resource_new_value: config,
          description: `App configuration updated by ${updatedBy}`,
          success: true,
          metadata: {
            sections_updated: Object.keys(config),
            config_version: CONFIG.CONFIG_VERSION,
          },
        },
      },
    });
  } catch (error) {
    logger.error("Failed to save config to database:", error);
    throw new Error("Failed to save configuration to database");
  }
}

// ============================================================================
// GET Handler - Public
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const config = await getConfigFromDatabase();

    // Check if detailed info is requested (requires auth)
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get("history") === "true";

    if (includeHistory) {
      // Verify admin access for history
      const user = await getAuthenticatedUser(request);
      if (!user || !["owner", "admin"].includes(user.role)) {
        return forbiddenResponse("Admin access required for history");
      }

      // Fetch history from audit logs
      const history = await getConfigHistory(10);

      return successResponse({
        config,
        history,
        version: CONFIG.CONFIG_VERSION,
      });
    }

    // Return cached public config
    return cachedResponse(
      {
        config,
        version: CONFIG.CONFIG_VERSION,
      },
      {
        maxAge: CONFIG.CACHE_TTL,
        sMaxAge: CONFIG.CACHE_TTL,
        staleWhileRevalidate: CONFIG.CACHE_TTL * 2,
      },
    );
  } catch (error) {
    logger.error("Error in GET /api/config:", error);
    return internalErrorResponse("Failed to get configuration");
  }
}

// ============================================================================
// POST Handler - Full Update (Admin Only)
// ============================================================================

async function handlePost(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { user } = request;

    // Validate the update
    const validation = validateConfigUpdate(body);
    if (!validation.valid) {
      return badRequestResponse(
        `Validation failed: ${(validation as { valid: false; errors: string[] }).errors.join(", ")}`,
        "VALIDATION_ERROR",
      );
    }

    // Get current config and merge with updates
    const currentDbConfig = await getConfigFromDatabase();
    const updatedConfig = deepMerge<AppConfig>(
      currentDbConfig,
      body as Partial<AppConfig>,
    );

    // Update setup state if completing steps
    if (body.setup?.currentStep !== undefined) {
      updatedConfig.setup.visitedSteps = [
        ...new Set([
          ...updatedConfig.setup.visitedSteps,
          body.setup.currentStep,
        ]),
      ];
    }

    // Save to database
    await saveConfigToDatabase(updatedConfig, user.email);

    return successResponse({
      config: updatedConfig,
      message: "Configuration updated successfully",
    });
  } catch (error) {
    logger.error("Error in POST /api/config:", error);
    return internalErrorResponse("Failed to update configuration");
  }
}

// Apply admin middleware with CSRF protection
export const POST = compose(
  withErrorHandler,
  withCsrfProtection,
  withAuth,
  withAdmin,
)(handlePost);

// ============================================================================
// PATCH Handler - Partial Update (Admin Only)
// ============================================================================

async function handlePatch(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { user } = request;

    // PATCH is essentially the same as POST for our merge logic
    const validation = validateConfigUpdate(body);
    if (!validation.valid) {
      return badRequestResponse(
        `Validation failed: ${(validation as { valid: false; errors: string[] }).errors.join(", ")}`,
        "VALIDATION_ERROR",
      );
    }

    const currentDbConfig = await getConfigFromDatabase();
    const updatedConfig = deepMerge<AppConfig>(
      currentDbConfig,
      body as Partial<AppConfig>,
    );

    await saveConfigToDatabase(updatedConfig, user.email);

    return successResponse({
      config: updatedConfig,
      message: "Configuration updated successfully",
    });
  } catch (error) {
    logger.error("Error in PATCH /api/config:", error);
    return internalErrorResponse("Failed to update configuration");
  }
}

export const PATCH = compose(
  withErrorHandler,
  withCsrfProtection,
  withAuth,
  withAdmin,
)(handlePatch);

// ============================================================================
// Route Configuration
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
