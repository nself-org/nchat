/**
 * App Lifecycle Management
 *
 * Manages the lifecycle of third-party apps: registration, review,
 * installation, enabling/disabling, uninstallation, and version management.
 */

import type {
  AppManifest,
  RegisteredApp,
  AppInstallation,
  AppStatus,
  AppInstallationStatus,
  AppScope,
  ManifestValidationResult,
} from "./app-contract";
import { validateManifest, hasAllScopes } from "./app-contract";

// ============================================================================
// ID GENERATION
// ============================================================================

let idCounter = 0;

/**
 * Generate a unique ID. Uses crypto.randomUUID when available, falls back
 * to a counter-based approach for environments without it.
 */
export function generateId(prefix: string = ""): string {
  try {
    const uuid = crypto.randomUUID();
    return prefix ? `${prefix}_${uuid}` : uuid;
  } catch {
    idCounter++;
    const ts = Date.now().toString(36);
    const count = idCounter.toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    const id = `${ts}-${count}-${rand}`;
    return prefix ? `${prefix}_${id}` : id;
  }
}

// ============================================================================
// IN-MEMORY STORE (production would use database)
// ============================================================================

/**
 * In-memory store for apps and installations.
 * In production, this would be backed by PostgreSQL via Hasura.
 */
export class AppStore {
  private apps: Map<string, RegisteredApp> = new Map();
  private installations: Map<string, AppInstallation> = new Map();

  // --- App CRUD ---

  getApp(id: string): RegisteredApp | undefined {
    return this.apps.get(id);
  }

  getAppByAppId(appId: string): RegisteredApp | undefined {
    for (const app of this.apps.values()) {
      if (app.manifest.appId === appId) {
        return app;
      }
    }
    return undefined;
  }

  listApps(filter?: { status?: AppStatus }): RegisteredApp[] {
    let apps = Array.from(this.apps.values());
    if (filter?.status) {
      apps = apps.filter((a) => a.status === filter.status);
    }
    return apps;
  }

  saveApp(app: RegisteredApp): void {
    this.apps.set(app.id, app);
  }

  deleteApp(id: string): boolean {
    return this.apps.delete(id);
  }

  // --- Installation CRUD ---

  getInstallation(id: string): AppInstallation | undefined {
    return this.installations.get(id);
  }

  getInstallationByAppAndWorkspace(
    appId: string,
    workspaceId: string,
  ): AppInstallation | undefined {
    for (const inst of this.installations.values()) {
      if (inst.appId === appId && inst.workspaceId === workspaceId) {
        return inst;
      }
    }
    return undefined;
  }

  listInstallations(filter?: {
    appId?: string;
    workspaceId?: string;
    status?: AppInstallationStatus;
  }): AppInstallation[] {
    let installations = Array.from(this.installations.values());
    if (filter?.appId) {
      installations = installations.filter((i) => i.appId === filter.appId);
    }
    if (filter?.workspaceId) {
      installations = installations.filter(
        (i) => i.workspaceId === filter.workspaceId,
      );
    }
    if (filter?.status) {
      installations = installations.filter((i) => i.status === filter.status);
    }
    return installations;
  }

  saveInstallation(installation: AppInstallation): void {
    this.installations.set(installation.id, installation);
  }

  deleteInstallation(id: string): boolean {
    return this.installations.delete(id);
  }

  // --- Clearing ---

  clear(): void {
    this.apps.clear();
    this.installations.clear();
  }
}

// ============================================================================
// LIFECYCLE ERRORS
// ============================================================================

export class AppLifecycleError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "AppLifecycleError";
  }
}

// ============================================================================
// APP LIFECYCLE MANAGER
// ============================================================================

export class AppLifecycleManager {
  constructor(private store: AppStore) {}

  // ==========================================================================
  // REGISTRATION
  // ==========================================================================

  /**
   * Register a new app by validating its manifest and creating a registry entry.
   */
  registerApp(manifest: AppManifest, registeredBy: string): RegisteredApp {
    // Validate manifest
    const validation = this.validateAppManifest(manifest);
    if (!validation.valid) {
      throw new AppLifecycleError(
        `Invalid manifest: ${validation.errors.map((e) => e.message).join("; ")}`,
        "INVALID_MANIFEST",
      );
    }

    // Check for duplicate appId
    const existing = this.store.getAppByAppId(manifest.appId);
    if (existing) {
      throw new AppLifecycleError(
        `App with appId "${manifest.appId}" is already registered`,
        "DUPLICATE_APP_ID",
        409,
      );
    }

    const now = new Date().toISOString();
    const app: RegisteredApp = {
      id: generateId("app"),
      manifest,
      status: "pending_review",
      clientSecret: generateId("secret"),
      registeredBy,
      registeredAt: now,
      updatedAt: now,
    };

    this.store.saveApp(app);
    return app;
  }

  /**
   * Validate a manifest (public method for external use).
   */
  validateAppManifest(manifest: unknown): ManifestValidationResult {
    return validateManifest(manifest);
  }

  // ==========================================================================
  // REVIEW
  // ==========================================================================

  /**
   * Approve a pending app.
   */
  approveApp(appId: string): RegisteredApp {
    const app = this.getAppOrThrow(appId);

    if (app.status !== "pending_review") {
      throw new AppLifecycleError(
        `Cannot approve app in "${app.status}" status`,
        "INVALID_STATUS_TRANSITION",
      );
    }

    app.status = "approved";
    app.updatedAt = new Date().toISOString();
    this.store.saveApp(app);
    return app;
  }

  /**
   * Reject a pending app with a reason.
   */
  rejectApp(appId: string, reason: string): RegisteredApp {
    const app = this.getAppOrThrow(appId);

    if (app.status !== "pending_review") {
      throw new AppLifecycleError(
        `Cannot reject app in "${app.status}" status`,
        "INVALID_STATUS_TRANSITION",
      );
    }

    app.status = "rejected";
    app.rejectionReason = reason;
    app.updatedAt = new Date().toISOString();
    this.store.saveApp(app);
    return app;
  }

  /**
   * Suspend an approved app (e.g., for policy violations).
   */
  suspendApp(appId: string, reason: string): RegisteredApp {
    const app = this.getAppOrThrow(appId);

    if (app.status !== "approved") {
      throw new AppLifecycleError(
        `Cannot suspend app in "${app.status}" status`,
        "INVALID_STATUS_TRANSITION",
      );
    }

    app.status = "suspended";
    app.rejectionReason = reason;
    app.updatedAt = new Date().toISOString();
    this.store.saveApp(app);
    return app;
  }

  /**
   * Re-submit a rejected app for review (after manifest changes).
   */
  resubmitApp(appId: string, updatedManifest: AppManifest): RegisteredApp {
    const app = this.getAppOrThrow(appId);

    if (app.status !== "rejected" && app.status !== "suspended") {
      throw new AppLifecycleError(
        `Cannot resubmit app in "${app.status}" status`,
        "INVALID_STATUS_TRANSITION",
      );
    }

    const validation = this.validateAppManifest(updatedManifest);
    if (!validation.valid) {
      throw new AppLifecycleError(
        `Invalid manifest: ${validation.errors.map((e) => e.message).join("; ")}`,
        "INVALID_MANIFEST",
      );
    }

    // Ensure appId hasn't changed
    if (updatedManifest.appId !== app.manifest.appId) {
      throw new AppLifecycleError(
        "Cannot change appId when resubmitting",
        "IMMUTABLE_APP_ID",
      );
    }

    app.manifest = updatedManifest;
    app.status = "pending_review";
    app.rejectionReason = undefined;
    app.updatedAt = new Date().toISOString();
    this.store.saveApp(app);
    return app;
  }

  // ==========================================================================
  // INSTALLATION
  // ==========================================================================

  /**
   * Install an app into a workspace with specific scope grants.
   */
  installApp(
    appId: string,
    workspaceId: string,
    installedBy: string,
    grantedScopes?: AppScope[],
  ): AppInstallation {
    const app = this.getAppOrThrow(appId);

    if (app.status !== "approved") {
      throw new AppLifecycleError(
        "Only approved apps can be installed",
        "APP_NOT_APPROVED",
      );
    }

    // Check for existing installation
    const existing = this.store.getInstallationByAppAndWorkspace(
      appId,
      workspaceId,
    );
    if (existing && existing.status === "installed") {
      throw new AppLifecycleError(
        "App is already installed in this workspace",
        "ALREADY_INSTALLED",
        409,
      );
    }

    // Validate granted scopes are a subset of requested scopes
    const scopesToGrant = grantedScopes ?? app.manifest.scopes;
    const requestedScopes = app.manifest.scopes;
    for (const scope of scopesToGrant) {
      if (!hasAllScopes(requestedScopes, [scope])) {
        throw new AppLifecycleError(
          `Scope "${scope}" was not requested by the app`,
          "SCOPE_NOT_REQUESTED",
        );
      }
    }

    const now = new Date().toISOString();

    // If there is an uninstalled record, re-use it
    if (existing && existing.status === "uninstalled") {
      existing.status = "installed";
      existing.grantedScopes = scopesToGrant;
      existing.installedBy = installedBy;
      existing.updatedAt = now;
      this.store.saveInstallation(existing);
      return existing;
    }

    const installation: AppInstallation = {
      id: generateId("inst"),
      appId,
      workspaceId,
      grantedScopes: scopesToGrant,
      status: "installed",
      installedBy,
      installedAt: now,
      updatedAt: now,
    };

    this.store.saveInstallation(installation);
    return installation;
  }

  /**
   * Uninstall an app from a workspace.
   */
  uninstallApp(installationId: string): AppInstallation {
    const installation = this.getInstallationOrThrow(installationId);

    if (installation.status === "uninstalled") {
      throw new AppLifecycleError(
        "App is already uninstalled",
        "ALREADY_UNINSTALLED",
      );
    }

    installation.status = "uninstalled";
    installation.updatedAt = new Date().toISOString();
    this.store.saveInstallation(installation);
    return installation;
  }

  /**
   * Enable a disabled installation.
   */
  enableInstallation(installationId: string): AppInstallation {
    const installation = this.getInstallationOrThrow(installationId);

    if (installation.status !== "disabled") {
      throw new AppLifecycleError(
        `Cannot enable installation in "${installation.status}" status`,
        "INVALID_STATUS_TRANSITION",
      );
    }

    installation.status = "installed";
    installation.updatedAt = new Date().toISOString();
    this.store.saveInstallation(installation);
    return installation;
  }

  /**
   * Disable an active installation (without uninstalling).
   */
  disableInstallation(installationId: string): AppInstallation {
    const installation = this.getInstallationOrThrow(installationId);

    if (installation.status !== "installed") {
      throw new AppLifecycleError(
        `Cannot disable installation in "${installation.status}" status`,
        "INVALID_STATUS_TRANSITION",
      );
    }

    installation.status = "disabled";
    installation.updatedAt = new Date().toISOString();
    this.store.saveInstallation(installation);
    return installation;
  }

  /**
   * Update the granted scopes for an installation.
   */
  updateInstallationScopes(
    installationId: string,
    newScopes: AppScope[],
  ): AppInstallation {
    const installation = this.getInstallationOrThrow(installationId);
    const app = this.getAppOrThrow(installation.appId);

    // Validate scopes are subset of manifest scopes
    for (const scope of newScopes) {
      if (!hasAllScopes(app.manifest.scopes, [scope])) {
        throw new AppLifecycleError(
          `Scope "${scope}" was not requested by the app`,
          "SCOPE_NOT_REQUESTED",
        );
      }
    }

    installation.grantedScopes = newScopes;
    installation.updatedAt = new Date().toISOString();
    this.store.saveInstallation(installation);
    return installation;
  }

  // ==========================================================================
  // VERSION MANAGEMENT
  // ==========================================================================

  /**
   * Update an app's manifest (version bump). Requires re-approval if scopes change.
   */
  updateAppVersion(appId: string, newManifest: AppManifest): RegisteredApp {
    const app = this.getAppOrThrow(appId);

    if (app.status !== "approved") {
      throw new AppLifecycleError(
        "Only approved apps can be updated",
        "APP_NOT_APPROVED",
      );
    }

    const validation = this.validateAppManifest(newManifest);
    if (!validation.valid) {
      throw new AppLifecycleError(
        `Invalid manifest: ${validation.errors.map((e) => e.message).join("; ")}`,
        "INVALID_MANIFEST",
      );
    }

    // Ensure appId hasn't changed
    if (newManifest.appId !== app.manifest.appId) {
      throw new AppLifecycleError(
        "Cannot change appId during version update",
        "IMMUTABLE_APP_ID",
      );
    }

    // Check if scopes expanded (requires re-approval)
    const oldScopes = new Set(app.manifest.scopes);
    const newScopesExpanded = newManifest.scopes.some((s) => !oldScopes.has(s));

    if (newScopesExpanded) {
      app.status = "pending_review";
    }

    app.manifest = newManifest;
    app.updatedAt = new Date().toISOString();
    this.store.saveApp(app);
    return app;
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  getApp(appId: string): RegisteredApp | undefined {
    return this.store.getApp(appId);
  }

  getInstallation(installationId: string): AppInstallation | undefined {
    return this.store.getInstallation(installationId);
  }

  listApps(filter?: { status?: AppStatus }): RegisteredApp[] {
    return this.store.listApps(filter);
  }

  listInstallations(filter?: {
    appId?: string;
    workspaceId?: string;
    status?: AppInstallationStatus;
  }): AppInstallation[] {
    return this.store.listInstallations(filter);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getAppOrThrow(appId: string): RegisteredApp {
    const app = this.store.getApp(appId);
    if (!app) {
      throw new AppLifecycleError(
        `App not found: ${appId}`,
        "APP_NOT_FOUND",
        404,
      );
    }
    return app;
  }

  private getInstallationOrThrow(installationId: string): AppInstallation {
    const installation = this.store.getInstallation(installationId);
    if (!installation) {
      throw new AppLifecycleError(
        `Installation not found: ${installationId}`,
        "INSTALLATION_NOT_FOUND",
        404,
      );
    }
    return installation;
  }
}
