/**
 * App Installer - Installation and uninstallation logic for nchat apps
 *
 * Handles app installation, permission granting, and lifecycle management
 */

import type {
  App,
  AppInstallation,
  InstallationConfig,
  InstallationStatus,
  PermissionScope,
  AppSettingDefinition,
} from "./app-types";
import { getAppById } from "./app-registry";
import { validatePermissions, getRequiredPermissions } from "./app-permissions";

// ============================================================================
// Installation Storage (In-memory for demo, would use database in production)
// ============================================================================

const installationsStore: Map<string, AppInstallation> = new Map();

// ============================================================================
// Installation Functions
// ============================================================================

/**
 * Check if an app can be installed
 */
export function canInstallApp(
  appId: string,
  currentInstallations: string[] = [],
): { canInstall: boolean; reason?: string } {
  const app = getAppById(appId);

  if (!app) {
    return { canInstall: false, reason: "App not found" };
  }

  if (app.status !== "active") {
    return { canInstall: false, reason: "App is not currently available" };
  }

  if (app.visibility !== "public") {
    return { canInstall: false, reason: "App is not publicly available" };
  }

  // Check for incompatible apps
  if (app.requirements.incompatibleWith) {
    const conflicting = app.requirements.incompatibleWith.filter(
      (incompatibleId) => currentInstallations.includes(incompatibleId),
    );
    if (conflicting.length > 0) {
      return {
        canInstall: false,
        reason: `Conflicts with installed app(s): ${conflicting.join(", ")}`,
      };
    }
  }

  return { canInstall: true };
}

/**
 * Validate installation configuration
 */
export function validateInstallationConfig(
  app: App,
  config: InstallationConfig,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required permissions
  const requiredPermissions = getRequiredPermissions(app.permissions);
  const { valid, missing } = validatePermissions(
    requiredPermissions,
    config.permissions,
  );

  if (!valid) {
    errors.push(`Missing required permissions: ${missing.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Install an app
 */
export async function installApp(
  appId: string,
  userId: string,
  config: InstallationConfig,
  workspaceId?: string,
): Promise<{
  success: boolean;
  installation?: AppInstallation;
  error?: string;
}> {
  const app = getAppById(appId);

  if (!app) {
    return { success: false, error: "App not found" };
  }

  // Check if already installed
  const existingKey = `${userId}-${appId}`;
  if (installationsStore.has(existingKey)) {
    return { success: false, error: "App is already installed" };
  }

  // Validate config
  const validation = validateInstallationConfig(app, config);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join("; ") };
  }

  // Create installation
  const now = new Date().toISOString();
  const installation: AppInstallation = {
    id: `install-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    appId,
    app,
    userId,
    workspaceId,
    installedVersion: app.currentVersion,
    status: "active",
    grantedPermissions: config.permissions,
    settings: config.settings || getDefaultSettings(app),
    installedAt: now,
    updatedAt: now,
  };

  // Store installation
  installationsStore.set(existingKey, installation);

  // Simulate async installation process
  await new Promise((resolve) => setTimeout(resolve, 500));

  return { success: true, installation };
}

/**
 * Uninstall an app
 */
export async function uninstallApp(
  appId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const key = `${userId}-${appId}`;
  const installation = installationsStore.get(key);

  if (!installation) {
    return { success: false, error: "App is not installed" };
  }

  // Update status to uninstalled
  installation.status = "uninstalled";
  installation.updatedAt = new Date().toISOString();

  // Remove from store
  installationsStore.delete(key);

  // Simulate async uninstallation process
  await new Promise((resolve) => setTimeout(resolve, 300));

  return { success: true };
}

/**
 * Get an installation by app ID and user ID
 */
export function getInstallation(
  appId: string,
  userId: string,
): AppInstallation | undefined {
  return installationsStore.get(`${userId}-${appId}`);
}

/**
 * Get all installations for a user
 */
export function getUserInstallations(userId: string): AppInstallation[] {
  const installations: AppInstallation[] = [];
  installationsStore.forEach((installation) => {
    if (installation.userId === userId && installation.status === "active") {
      installations.push(installation);
    }
  });
  return installations;
}

/**
 * Check if an app is installed for a user
 */
export function isAppInstalled(appId: string, userId: string): boolean {
  const installation = installationsStore.get(`${userId}-${appId}`);
  return installation?.status === "active";
}

// ============================================================================
// Installation Management
// ============================================================================

/**
 * Update installation settings
 */
export function updateInstallationSettings(
  appId: string,
  userId: string,
  settings: Record<string, unknown>,
): { success: boolean; error?: string } {
  const key = `${userId}-${appId}`;
  const installation = installationsStore.get(key);

  if (!installation) {
    return { success: false, error: "App is not installed" };
  }

  installation.settings = { ...installation.settings, ...settings };
  installation.updatedAt = new Date().toISOString();

  return { success: true };
}

/**
 * Update installation status
 */
export function updateInstallationStatus(
  appId: string,
  userId: string,
  status: InstallationStatus,
): { success: boolean; error?: string } {
  const key = `${userId}-${appId}`;
  const installation = installationsStore.get(key);

  if (!installation) {
    return { success: false, error: "App is not installed" };
  }

  installation.status = status;
  installation.updatedAt = new Date().toISOString();

  return { success: true };
}

/**
 * Pause an app (disable temporarily)
 */
export function pauseApp(
  appId: string,
  userId: string,
): { success: boolean; error?: string } {
  return updateInstallationStatus(appId, userId, "paused");
}

/**
 * Resume a paused app
 */
export function resumeApp(
  appId: string,
  userId: string,
): { success: boolean; error?: string } {
  return updateInstallationStatus(appId, userId, "active");
}

/**
 * Update granted permissions for an installation
 */
export function updatePermissions(
  appId: string,
  userId: string,
  permissions: PermissionScope[],
): { success: boolean; error?: string } {
  const key = `${userId}-${appId}`;
  const installation = installationsStore.get(key);

  if (!installation) {
    return { success: false, error: "App is not installed" };
  }

  const app = getAppById(appId);
  if (!app) {
    return { success: false, error: "App not found" };
  }

  // Validate that required permissions are still included
  const requiredPermissions = getRequiredPermissions(app.permissions);
  const { valid, missing } = validatePermissions(
    requiredPermissions,
    permissions,
  );

  if (!valid) {
    return {
      success: false,
      error: `Cannot remove required permissions: ${missing.join(", ")}`,
    };
  }

  installation.grantedPermissions = permissions;
  installation.updatedAt = new Date().toISOString();

  return { success: true };
}

// ============================================================================
// Version Management
// ============================================================================

/**
 * Check if an app has an update available
 */
export function hasUpdateAvailable(appId: string, userId: string): boolean {
  const installation = getInstallation(appId, userId);
  if (!installation) return false;

  const app = getAppById(appId);
  if (!app) return false;

  return installation.installedVersion !== app.currentVersion;
}

/**
 * Update an installed app to the latest version
 */
export async function updateApp(
  appId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const key = `${userId}-${appId}`;
  const installation = installationsStore.get(key);

  if (!installation) {
    return { success: false, error: "App is not installed" };
  }

  const app = getAppById(appId);
  if (!app) {
    return { success: false, error: "App not found" };
  }

  if (installation.installedVersion === app.currentVersion) {
    return { success: false, error: "App is already up to date" };
  }

  // Simulate update process
  await new Promise((resolve) => setTimeout(resolve, 500));

  installation.installedVersion = app.currentVersion;
  installation.updatedAt = new Date().toISOString();
  installation.app = app;

  return { success: true };
}

/**
 * Get apps with available updates
 */
export function getAppsWithUpdates(userId: string): AppInstallation[] {
  const installations = getUserInstallations(userId);
  return installations.filter((installation) =>
    hasUpdateAvailable(installation.appId, userId),
  );
}

// ============================================================================
// Settings Helpers
// ============================================================================

/**
 * Get default settings for an app based on its manifest
 */
export function getDefaultSettings(app: App): Record<string, unknown> {
  // In a real implementation, this would come from the app's manifest
  // For now, return empty settings
  return {};
}

/**
 * Validate setting value against definition
 */
export function validateSettingValue(
  definition: AppSettingDefinition,
  value: unknown,
): { valid: boolean; error?: string } {
  if (
    definition.required &&
    (value === undefined || value === null || value === "")
  ) {
    return { valid: false, error: `${definition.label} is required` };
  }

  if (value === undefined || value === null) {
    return { valid: true };
  }

  switch (definition.type) {
    case "text":
      if (typeof value !== "string") {
        return { valid: false, error: `${definition.label} must be a string` };
      }
      if (definition.validation?.pattern) {
        const regex = new RegExp(definition.validation.pattern);
        if (!regex.test(value)) {
          return {
            valid: false,
            error: definition.validation.message || "Invalid format",
          };
        }
      }
      break;

    case "number":
      if (typeof value !== "number") {
        return { valid: false, error: `${definition.label} must be a number` };
      }
      if (
        definition.validation?.min !== undefined &&
        value < definition.validation.min
      ) {
        return {
          valid: false,
          error: `${definition.label} must be at least ${definition.validation.min}`,
        };
      }
      if (
        definition.validation?.max !== undefined &&
        value > definition.validation.max
      ) {
        return {
          valid: false,
          error: `${definition.label} must be at most ${definition.validation.max}`,
        };
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        return { valid: false, error: `${definition.label} must be a boolean` };
      }
      break;

    case "select":
      if (!definition.options?.some((opt) => opt.value === value)) {
        return {
          valid: false,
          error: `Invalid option for ${definition.label}`,
        };
      }
      break;

    case "multiselect":
      if (!Array.isArray(value)) {
        return { valid: false, error: `${definition.label} must be an array` };
      }
      break;
  }

  return { valid: true };
}

// ============================================================================
// Analytics Helpers
// ============================================================================

/**
 * Record app usage (would send to analytics in production)
 */
export function recordAppUsage(appId: string, userId: string): void {
  const key = `${userId}-${appId}`;
  const installation = installationsStore.get(key);

  if (installation) {
    installation.lastUsedAt = new Date().toISOString();
  }
}

/**
 * Get installation statistics
 */
export function getInstallationStats(): {
  totalInstallations: number;
  activeInstallations: number;
  appCounts: Map<string, number>;
} {
  let total = 0;
  let active = 0;
  const appCounts = new Map<string, number>();

  installationsStore.forEach((installation) => {
    total++;
    if (installation.status === "active") {
      active++;
      const count = appCounts.get(installation.appId) || 0;
      appCounts.set(installation.appId, count + 1);
    }
  });

  return { totalInstallations: total, activeInstallations: active, appCounts };
}
