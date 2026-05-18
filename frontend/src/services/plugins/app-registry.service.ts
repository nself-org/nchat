/**
 * App Registry Service
 *
 * Service layer that composes the lifecycle, auth, events, and rate limiting
 * modules into a unified API for app management. This is the main entry point
 * used by API routes.
 */

import type {
  AppManifest,
  AppScope,
  AppStatus,
  AppInstallationStatus,
  RegisteredApp,
  AppInstallation,
  AppToken,
  AppEventType,
  TokenRequest,
  TokenResponse,
  EventDeliveryRecord,
  ManifestValidationResult,
  AppRateLimitConfig as ManifestRateLimitConfig,
} from "@/lib/plugins/app-contract";
import { AppLifecycleManager, AppStore } from "@/lib/plugins/app-lifecycle";
import { AppAuthManager, AppTokenStore } from "@/lib/plugins/app-auth";
import {
  AppEventManager,
  EventSubscriptionStore,
  type EventSubscription,
  type FetchFunction,
} from "@/lib/plugins/app-events";
import {
  AppRateLimiter,
  DEFAULT_APP_RATE_LIMIT,
  type AppRateLimitConfig,
  type AppRateLimitResult,
} from "@/lib/plugins/app-rate-limiter";

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

export interface AppRegistryConfig {
  /** Access token TTL in seconds */
  accessTokenTTL?: number;
  /** Refresh token TTL in seconds */
  refreshTokenTTL?: number;
  /** Event delivery config */
  eventDelivery?: {
    maxRetries?: number;
    initialRetryDelayMs?: number;
    maxRetryDelayMs?: number;
    backoffMultiplier?: number;
    deliveryTimeoutMs?: number;
  };
  /** Custom fetch function for event delivery (primarily for testing) */
  fetchFn?: FetchFunction;
}

// ============================================================================
// APP REGISTRY SERVICE
// ============================================================================

export class AppRegistryService {
  private lifecycleManager: AppLifecycleManager;
  private authManager: AppAuthManager;
  private eventManager: AppEventManager;
  private rateLimiter: AppRateLimiter;
  private appStore: AppStore;
  private tokenStore: AppTokenStore;
  private subscriptionStore: EventSubscriptionStore;

  constructor(config?: AppRegistryConfig) {
    this.appStore = new AppStore();
    this.tokenStore = new AppTokenStore();
    this.subscriptionStore = new EventSubscriptionStore();

    this.lifecycleManager = new AppLifecycleManager(this.appStore);
    this.authManager = new AppAuthManager(this.tokenStore, {
      accessTokenTTL: config?.accessTokenTTL,
      refreshTokenTTL: config?.refreshTokenTTL,
    });
    this.eventManager = new AppEventManager(
      this.subscriptionStore,
      config?.eventDelivery,
      config?.fetchFn,
    );
    this.rateLimiter = new AppRateLimiter();
  }

  // ==========================================================================
  // APP REGISTRATION & LIFECYCLE
  // ==========================================================================

  /**
   * Register a new app with its manifest.
   */
  registerApp(manifest: AppManifest, registeredBy: string): RegisteredApp {
    return this.lifecycleManager.registerApp(manifest, registeredBy);
  }

  /**
   * Validate a manifest without registering.
   */
  validateManifest(manifest: unknown): ManifestValidationResult {
    return this.lifecycleManager.validateAppManifest(manifest);
  }

  /**
   * Approve a pending app.
   */
  approveApp(appId: string): RegisteredApp {
    return this.lifecycleManager.approveApp(appId);
  }

  /**
   * Reject a pending app.
   */
  rejectApp(appId: string, reason: string): RegisteredApp {
    return this.lifecycleManager.rejectApp(appId, reason);
  }

  /**
   * Suspend an approved app.
   */
  suspendApp(appId: string, reason: string): RegisteredApp {
    // Revoke all tokens when suspending
    this.authManager.revokeAllTokens(appId);
    return this.lifecycleManager.suspendApp(appId, reason);
  }

  /**
   * Resubmit a rejected/suspended app with updated manifest.
   */
  resubmitApp(appId: string, manifest: AppManifest): RegisteredApp {
    return this.lifecycleManager.resubmitApp(appId, manifest);
  }

  /**
   * Update an approved app's version.
   */
  updateAppVersion(appId: string, manifest: AppManifest): RegisteredApp {
    return this.lifecycleManager.updateAppVersion(appId, manifest);
  }

  /**
   * Get a registered app by ID.
   */
  getApp(appId: string): RegisteredApp | undefined {
    return this.lifecycleManager.getApp(appId);
  }

  /**
   * List registered apps.
   */
  listApps(filter?: { status?: AppStatus }): RegisteredApp[] {
    return this.lifecycleManager.listApps(filter);
  }

  // ==========================================================================
  // INSTALLATION
  // ==========================================================================

  /**
   * Install an app into a workspace.
   */
  installApp(
    appId: string,
    workspaceId: string,
    installedBy: string,
    grantedScopes?: AppScope[],
  ): AppInstallation {
    const installation = this.lifecycleManager.installApp(
      appId,
      workspaceId,
      installedBy,
      grantedScopes,
    );

    // Set up event subscriptions if the app has events in its manifest
    const app = this.lifecycleManager.getApp(appId);
    if (
      app &&
      app.manifest.events &&
      app.manifest.events.length > 0 &&
      app.manifest.webhookUrl
    ) {
      this.eventManager.subscribe(
        app,
        installation,
        app.manifest.events,
        app.manifest.webhookUrl,
      );
    }

    return installation;
  }

  /**
   * Uninstall an app from a workspace.
   */
  uninstallApp(installationId: string): AppInstallation {
    const installation = this.lifecycleManager.uninstallApp(installationId);

    // Revoke tokens and unsubscribe events
    this.authManager.revokeAllTokens(installation.appId, installation.id);

    const subs = this.eventManager.getSubscriptions(installation.appId);
    for (const sub of subs) {
      if (sub.installationId === installation.id) {
        this.eventManager.unsubscribe(sub.id);
      }
    }

    return installation;
  }

  /**
   * Enable a disabled installation.
   */
  enableInstallation(installationId: string): AppInstallation {
    return this.lifecycleManager.enableInstallation(installationId);
  }

  /**
   * Disable an installation.
   */
  disableInstallation(installationId: string): AppInstallation {
    return this.lifecycleManager.disableInstallation(installationId);
  }

  /**
   * Get an installation by ID.
   */
  getInstallation(installationId: string): AppInstallation | undefined {
    return this.lifecycleManager.getInstallation(installationId);
  }

  /**
   * List installations.
   */
  listInstallations(filter?: {
    appId?: string;
    workspaceId?: string;
    status?: AppInstallationStatus;
  }): AppInstallation[] {
    return this.lifecycleManager.listInstallations(filter);
  }

  // ==========================================================================
  // TOKEN MANAGEMENT
  // ==========================================================================

  /**
   * Issue tokens for an app installation.
   */
  issueTokens(request: TokenRequest): TokenResponse {
    const app = this.lifecycleManager.getApp(request.appId);
    if (!app) {
      throw new Error(`App not found: ${request.appId}`);
    }

    const installation = this.lifecycleManager.getInstallation(
      request.installationId,
    );
    if (!installation) {
      throw new Error(`Installation not found: ${request.installationId}`);
    }

    return this.authManager.issueTokens(request, app, installation);
  }

  /**
   * Refresh an access token.
   */
  refreshToken(refreshTokenValue: string): TokenResponse {
    return this.authManager.refreshAccessToken(refreshTokenValue);
  }

  /**
   * Validate a token.
   */
  validateToken(tokenValue: string): AppToken {
    return this.authManager.validateToken(tokenValue);
  }

  /**
   * Validate a token has specific scopes.
   */
  validateTokenScopes(
    tokenValue: string,
    requiredScopes: AppScope[],
  ): AppToken {
    return this.authManager.validateTokenScopes(tokenValue, requiredScopes);
  }

  /**
   * Revoke a token.
   */
  revokeToken(tokenValue: string): void {
    this.authManager.revokeToken(tokenValue);
  }

  /**
   * Revoke all tokens for an app.
   */
  revokeAllTokens(appId: string, installationId?: string): number {
    return this.authManager.revokeAllTokens(appId, installationId);
  }

  /**
   * List tokens.
   */
  listTokens(filter?: { appId?: string; installationId?: string }): AppToken[] {
    return this.authManager.listTokens(filter);
  }

  // ==========================================================================
  // EVENT MANAGEMENT
  // ==========================================================================

  /**
   * Subscribe to events.
   */
  subscribeToEvents(
    appId: string,
    installationId: string,
    events: AppEventType[],
    webhookUrl: string,
  ): EventSubscription {
    const app = this.lifecycleManager.getApp(appId);
    if (!app) {
      throw new Error(`App not found: ${appId}`);
    }

    const installation = this.lifecycleManager.getInstallation(installationId);
    if (!installation) {
      throw new Error(`Installation not found: ${installationId}`);
    }

    return this.eventManager.subscribe(app, installation, events, webhookUrl);
  }

  /**
   * Dispatch an event to all subscribers.
   */
  async dispatchEvent(
    eventType: AppEventType,
    data: Record<string, unknown>,
  ): Promise<EventDeliveryRecord[]> {
    // Build app secrets map from registered apps
    const secrets = new Map<string, string>();
    const apps = this.lifecycleManager.listApps({ status: "approved" });
    for (const app of apps) {
      secrets.set(app.id, app.clientSecret);
    }

    return this.eventManager.dispatchEvent(eventType, data, secrets);
  }

  /**
   * Get event delivery status.
   */
  getDeliveryStatus(deliveryId: string): EventDeliveryRecord | undefined {
    return this.eventManager.getDeliveryStatus(deliveryId);
  }

  /**
   * List event subscriptions for an app.
   */
  getSubscriptions(appId: string): EventSubscription[] {
    return this.eventManager.getSubscriptions(appId);
  }

  // ==========================================================================
  // RATE LIMITING
  // ==========================================================================

  /**
   * Check rate limit for an app request.
   */
  checkRateLimit(appId: string, scope?: AppScope): AppRateLimitResult {
    const app = this.lifecycleManager.getApp(appId);
    const config = this.getAppRateLimitConfig(app);
    return this.rateLimiter.check(appId, config, scope);
  }

  /**
   * Get rate limit status (non-consuming).
   */
  getRateLimitStatus(appId: string, scope?: AppScope): AppRateLimitResult {
    const app = this.lifecycleManager.getApp(appId);
    const config = this.getAppRateLimitConfig(app);
    return this.rateLimiter.status(appId, config, scope);
  }

  /**
   * Reset rate limit for an app.
   */
  resetRateLimit(appId: string): void {
    this.rateLimiter.resetAll(appId);
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Destroy the service (cleanup intervals, etc.)
   */
  destroy(): void {
    this.rateLimiter.destroy();
  }

  /**
   * Clear all data (for testing).
   */
  clearAll(): void {
    this.appStore.clear();
    this.tokenStore.clear();
    this.subscriptionStore.clear();
    this.rateLimiter.destroy();
    this.rateLimiter = new AppRateLimiter();
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getAppRateLimitConfig(app?: RegisteredApp): AppRateLimitConfig {
    if (!app?.manifest.rateLimit) {
      return DEFAULT_APP_RATE_LIMIT;
    }

    return {
      requestsPerMinute: app.manifest.rateLimit.requestsPerMinute,
      burstAllowance: app.manifest.rateLimit.burstAllowance,
    };
  }
}

/**
 * Create a new AppRegistryService instance.
 */
export function createAppRegistryService(
  config?: AppRegistryConfig,
): AppRegistryService {
  return new AppRegistryService(config);
}
