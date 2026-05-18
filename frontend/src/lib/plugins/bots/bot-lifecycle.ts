/**
 * Bot Lifecycle Management
 *
 * Full lifecycle management for bot accounts: create, install, update,
 * disable, uninstall, delete. Orchestrates identity, scopes, rate limiting,
 * and moderation into a unified bot management system.
 */

import type { AppScope } from "../app-contract";
import { generateId } from "../app-lifecycle";
import type {
  BotAccount,
  BotAccountStatus,
  BotInstallation,
  BotInstallationStatus,
  BotScopeGrant,
  BotCapabilityPreset,
  BotType,
  BotProfileUpdate,
  BotRateLimitConfig,
  BotAuditEntry,
  BotAuditEventType,
} from "./types";
import { BOT_INSTALLATION_TRANSITIONS, MAX_ACTIVE_CHANNELS } from "./types";
import {
  BotIdentityManager,
  BotAccountStore,
  BotIdentityError,
} from "./bot-identity";
import {
  BotScopeManager,
  BotScopeValidator,
  BotScopeError,
} from "./bot-scopes";
import { BotRateLimiter } from "./bot-rate-limiter";
import { BotModerationManager, BotModerationStore } from "./bot-moderation";

// ============================================================================
// ERRORS
// ============================================================================

export class BotLifecycleError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "BotLifecycleError";
  }
}

// ============================================================================
// INSTALLATION STORE
// ============================================================================

export class BotInstallationStore {
  private installations: Map<string, BotInstallation> = new Map();

  getInstallation(id: string): BotInstallation | undefined {
    return this.installations.get(id);
  }

  getInstallationByBotAndWorkspace(
    botId: string,
    workspaceId: string,
  ): BotInstallation | undefined {
    for (const inst of Array.from(this.installations.values())) {
      if (inst.botId === botId && inst.workspaceId === workspaceId) {
        return inst;
      }
    }
    return undefined;
  }

  listInstallations(filter?: {
    botId?: string;
    workspaceId?: string;
    status?: BotInstallationStatus;
  }): BotInstallation[] {
    let installations = Array.from(this.installations.values());
    if (filter?.botId) {
      installations = installations.filter((i) => i.botId === filter.botId);
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

  saveInstallation(installation: BotInstallation): void {
    this.installations.set(installation.id, installation);
  }

  deleteInstallation(id: string): boolean {
    return this.installations.delete(id);
  }

  clear(): void {
    this.installations.clear();
  }
}

// ============================================================================
// BOT LIFECYCLE MANAGER
// ============================================================================

export class BotLifecycleManager {
  private identityManager: BotIdentityManager;
  private scopeManager: BotScopeManager;
  private rateLimiter: BotRateLimiter;
  private moderationManager: BotModerationManager;

  private accountStore: BotAccountStore;
  private installationStore: BotInstallationStore;
  private moderationStore: BotModerationStore;

  constructor() {
    this.accountStore = new BotAccountStore();
    this.installationStore = new BotInstallationStore();
    this.moderationStore = new BotModerationStore();

    this.identityManager = new BotIdentityManager(this.accountStore);
    this.scopeManager = new BotScopeManager();
    this.rateLimiter = new BotRateLimiter();
    this.moderationManager = new BotModerationManager(this.moderationStore);
  }

  // ==========================================================================
  // BOT CREATION
  // ==========================================================================

  /**
   * Create a new bot account.
   */
  createBot(params: {
    appId: string;
    username: string;
    displayName: string;
    description: string;
    avatarUrl?: string;
    homepageUrl?: string;
    botType?: BotType;
    version?: string;
    createdBy: string;
  }): BotAccount {
    return this.identityManager.createBot(params);
  }

  // ==========================================================================
  // BOT INSTALLATION
  // ==========================================================================

  /**
   * Install a bot into a workspace with specific scope grants.
   */
  installBot(params: {
    botId: string;
    workspaceId: string;
    installedBy: string;
    scopes?: AppScope[];
    capabilityPreset?: BotCapabilityPreset;
    channelIds?: string[];
    manifestScopes?: AppScope[];
    config?: Record<string, unknown>;
  }): BotInstallation {
    const bot = this.identityManager.getAccount(params.botId);
    if (!bot) {
      throw new BotLifecycleError(
        `Bot not found: ${params.botId}`,
        "BOT_NOT_FOUND",
        404,
      );
    }

    if (bot.status !== "active") {
      throw new BotLifecycleError(
        `Bot "${bot.username}" is not active (status: ${bot.status})`,
        "BOT_NOT_ACTIVE",
      );
    }

    // Check moderation
    const canAct = this.moderationManager.canAct(params.botId);
    if (!canAct.allowed) {
      throw new BotLifecycleError(
        `Bot cannot be installed: ${canAct.reason}`,
        "BOT_MODERATED",
      );
    }

    // Check for existing installation
    const existing = this.installationStore.getInstallationByBotAndWorkspace(
      params.botId,
      params.workspaceId,
    );

    if (existing && existing.status === "active") {
      throw new BotLifecycleError(
        "Bot is already installed in this workspace",
        "ALREADY_INSTALLED",
        409,
      );
    }

    // Build scope grants
    let scopeGrants: BotScopeGrant[];
    if (params.capabilityPreset) {
      scopeGrants = this.scopeManager.createGrantsFromPreset(
        params.capabilityPreset,
        params.installedBy,
        params.channelIds,
      );
    } else if (params.scopes) {
      // Validate against manifest if provided
      if (params.manifestScopes) {
        const validation = this.scopeManager
          .getValidator()
          .validateAgainstManifest(params.scopes, params.manifestScopes);
        if (!validation.valid) {
          throw new BotLifecycleError(
            `Scopes exceed manifest: ${validation.violations.join(", ")}`,
            "SCOPE_EXCEEDS_MANIFEST",
          );
        }
      }
      scopeGrants = params.scopes.map((scope) =>
        this.scopeManager.createGrant(
          scope,
          params.installedBy,
          params.channelIds,
        ),
      );
    } else {
      scopeGrants = [];
    }

    // Validate channel count
    if (params.channelIds && params.channelIds.length > MAX_ACTIVE_CHANNELS) {
      throw new BotLifecycleError(
        `Cannot exceed ${MAX_ACTIVE_CHANNELS} active channels`,
        "CHANNEL_LIMIT_EXCEEDED",
      );
    }

    const now = new Date().toISOString();

    // Re-activate uninstalled installation if exists
    if (existing && existing.status === "uninstalled") {
      existing.status = "active";
      existing.scopeGrants = scopeGrants;
      existing.activeChannels = params.channelIds ?? [];
      existing.config = params.config ?? {};
      existing.installedBy = params.installedBy;
      existing.updatedAt = now;
      this.installationStore.saveInstallation(existing);

      this.auditInstallation(
        existing,
        "bot.installed",
        params.installedBy,
        "Bot reinstalled",
      );
      return existing;
    }

    const installation: BotInstallation = {
      id: generateId("inst"),
      botId: params.botId,
      workspaceId: params.workspaceId,
      scopeGrants,
      activeChannels: params.channelIds ?? [],
      status: "active",
      config: params.config ?? {},
      installedBy: params.installedBy,
      installedAt: now,
      updatedAt: now,
    };

    this.installationStore.saveInstallation(installation);
    this.auditInstallation(
      installation,
      "bot.installed",
      params.installedBy,
      "Bot installed",
    );

    return installation;
  }

  // ==========================================================================
  // INSTALLATION STATUS MANAGEMENT
  // ==========================================================================

  /**
   * Disable a bot installation.
   */
  disableInstallation(
    installationId: string,
    disabledBy: string,
  ): BotInstallation {
    return this.transitionInstallation(installationId, "disabled", disabledBy);
  }

  /**
   * Enable a disabled bot installation.
   */
  enableInstallation(
    installationId: string,
    enabledBy: string,
  ): BotInstallation {
    const installation = this.getInstallationOrThrow(installationId);

    // Check moderation before enabling
    const canAct = this.moderationManager.canAct(
      installation.botId,
      installation.workspaceId,
    );
    if (!canAct.allowed) {
      throw new BotLifecycleError(
        `Cannot enable bot: ${canAct.reason}`,
        "BOT_MODERATED",
      );
    }

    return this.transitionInstallation(installationId, "active", enabledBy);
  }

  /**
   * Suspend a bot installation (moderation action).
   */
  suspendInstallation(
    installationId: string,
    suspendedBy: string,
    reason: string,
  ): BotInstallation {
    const installation = this.transitionInstallation(
      installationId,
      "suspended",
      suspendedBy,
    );

    this.moderationManager.suspend(
      installation.botId,
      reason,
      suspendedBy,
      undefined,
      installation.workspaceId,
    );

    return installation;
  }

  /**
   * Unsuspend a bot installation.
   */
  unsuspendInstallation(
    installationId: string,
    unsuspendedBy: string,
  ): BotInstallation {
    return this.transitionInstallation(installationId, "active", unsuspendedBy);
  }

  /**
   * Uninstall a bot from a workspace.
   */
  uninstallBot(installationId: string, uninstalledBy: string): BotInstallation {
    const installation = this.transitionInstallation(
      installationId,
      "uninstalled",
      uninstalledBy,
    );

    // Clear scope grants on uninstall
    installation.scopeGrants = [];
    installation.activeChannels = [];
    installation.updatedAt = new Date().toISOString();
    this.installationStore.saveInstallation(installation);

    // Reset rate limits
    this.rateLimiter.resetBot(installation.botId);

    return installation;
  }

  // ==========================================================================
  // SCOPE MANAGEMENT (DELEGATED)
  // ==========================================================================

  /**
   * Grant additional scopes to a bot installation.
   */
  grantScopes(
    installationId: string,
    scopes: AppScope[],
    manifestScopes: AppScope[],
    grantedBy: string,
    channelIds?: string[],
  ): BotInstallation {
    const installation = this.getInstallationOrThrow(installationId);

    if (installation.status !== "active") {
      throw new BotLifecycleError(
        "Can only modify scopes on active installations",
        "INSTALLATION_NOT_ACTIVE",
      );
    }

    this.scopeManager.grantScopes(
      installation,
      scopes,
      manifestScopes,
      grantedBy,
      channelIds,
    );
    installation.updatedAt = new Date().toISOString();
    this.installationStore.saveInstallation(installation);

    this.auditInstallation(
      installation,
      "bot.scope_granted",
      grantedBy,
      `Scopes granted: ${scopes.join(", ")}`,
    );

    return installation;
  }

  /**
   * Revoke scopes from a bot installation.
   */
  revokeScopes(
    installationId: string,
    scopes: AppScope[],
    revokedBy: string,
  ): BotInstallation {
    const installation = this.getInstallationOrThrow(installationId);

    const revoked = this.scopeManager.revokeScopes(installation, scopes);
    installation.updatedAt = new Date().toISOString();
    this.installationStore.saveInstallation(installation);

    if (revoked.length > 0) {
      this.auditInstallation(
        installation,
        "bot.scope_revoked",
        revokedBy,
        `Scopes revoked: ${revoked.join(", ")}`,
      );
    }

    return installation;
  }

  /**
   * Restrict a bot to specific channels.
   */
  restrictToChannels(
    installationId: string,
    channelIds: string[],
    restrictedBy: string,
  ): BotInstallation {
    const installation = this.getInstallationOrThrow(installationId);

    if (channelIds.length > MAX_ACTIVE_CHANNELS) {
      throw new BotLifecycleError(
        `Cannot exceed ${MAX_ACTIVE_CHANNELS} active channels`,
        "CHANNEL_LIMIT_EXCEEDED",
      );
    }

    this.scopeManager.restrictToChannels(installation, channelIds);
    installation.activeChannels = channelIds;
    installation.updatedAt = new Date().toISOString();
    this.installationStore.saveInstallation(installation);

    return installation;
  }

  /**
   * Enforce a scope check for a bot action.
   * Throws BotScopeError if the bot lacks the required scope.
   * Also checks moderation status and bot/installation state.
   */
  enforceScope(
    installationId: string,
    requiredScope: AppScope,
    channelId?: string,
  ): BotInstallation {
    const installation = this.getInstallationOrThrow(installationId);

    // Check bot account status
    const bot = this.identityManager.getAccount(installation.botId);
    if (bot && bot.status !== "active") {
      throw new BotLifecycleError(
        `Bot action blocked: bot account is ${bot.status}`,
        "BOT_NOT_ACTIVE",
      );
    }

    // Check installation status
    if (installation.status !== "active") {
      throw new BotLifecycleError(
        `Bot action blocked: installation is ${installation.status}`,
        "INSTALLATION_NOT_ACTIVE",
      );
    }

    // Check moderation records
    const canAct = this.moderationManager.canAct(
      installation.botId,
      installation.workspaceId,
    );
    if (!canAct.allowed) {
      throw new BotLifecycleError(
        `Bot action blocked: ${canAct.reason}`,
        "BOT_MODERATED",
      );
    }

    // Check scope
    this.scopeManager.enforceScope(installation, requiredScope, channelId);

    return installation;
  }

  // ==========================================================================
  // RATE LIMITING
  // ==========================================================================

  /**
   * Check rate limit for a bot action. Returns the result
   * and records violations for abuse detection.
   */
  checkRateLimit(
    botId: string,
    endpoint?: string,
    channelId?: string,
  ): { allowed: boolean; result: import("./types").BotRateLimitResult } {
    const result = this.rateLimiter.checkAll(botId, endpoint, channelId);

    if (!result.allowed) {
      this.moderationManager.recordRateLimitViolation(botId);
    }

    return { allowed: result.allowed, result };
  }

  /**
   * Set custom rate limit config for a bot.
   */
  setRateLimitConfig(botId: string, config: BotRateLimitConfig): void {
    this.rateLimiter.setConfig(botId, config);
  }

  // ==========================================================================
  // BOT PROFILE
  // ==========================================================================

  /**
   * Update bot profile.
   */
  updateBotProfile(
    botId: string,
    update: BotProfileUpdate,
    updatedBy: string,
  ): BotAccount {
    return this.identityManager.updateProfile(botId, update, updatedBy);
  }

  /**
   * Update bot version.
   */
  updateBotVersion(
    botId: string,
    newVersion: string,
    updatedBy: string,
  ): BotAccount {
    return this.identityManager.updateVersion(botId, newVersion, updatedBy);
  }

  /**
   * Verify a bot.
   */
  verifyBot(botId: string, verifiedBy: string): BotAccount {
    return this.identityManager.verifyBot(botId, verifiedBy);
  }

  // ==========================================================================
  // BOT STATUS
  // ==========================================================================

  /**
   * Suspend a bot account (affects all installations).
   */
  suspendBot(botId: string, reason: string, suspendedBy: string): BotAccount {
    const bot = this.identityManager.transitionStatus(
      botId,
      "suspended",
      suspendedBy,
      reason,
    );

    // Suspend all active installations
    const installations = this.installationStore.listInstallations({
      botId,
      status: "active",
    });
    for (const inst of installations) {
      this.transitionInstallation(inst.id, "suspended", suspendedBy);
    }

    // Reset rate limits
    this.rateLimiter.resetBot(botId);

    return bot;
  }

  /**
   * Unsuspend a bot account.
   */
  unsuspendBot(botId: string, unsuspendedBy: string): BotAccount {
    return this.identityManager.transitionStatus(
      botId,
      "active",
      unsuspendedBy,
    );
  }

  /**
   * Delete a bot account (soft delete).
   */
  deleteBot(botId: string, deletedBy: string): BotAccount {
    // Uninstall all installations
    const installations = this.installationStore.listInstallations({ botId });
    for (const inst of installations) {
      if (inst.status !== "uninstalled") {
        this.uninstallBot(inst.id, deletedBy);
      }
    }

    // Reset rate limits
    this.rateLimiter.resetBot(botId);

    return this.identityManager.deleteBot(botId, deletedBy);
  }

  // ==========================================================================
  // MODERATION
  // ==========================================================================

  /**
   * Get moderation manager for direct moderation actions.
   */
  getModeration(): BotModerationManager {
    return this.moderationManager;
  }

  /**
   * Force uninstall a bot from a workspace (admin override).
   */
  forceUninstall(
    botId: string,
    workspaceId: string,
    reason: string,
    performedBy: string,
  ): BotInstallation | undefined {
    const installation =
      this.installationStore.getInstallationByBotAndWorkspace(
        botId,
        workspaceId,
      );
    if (!installation) return undefined;
    if (installation.status === "uninstalled") return installation;

    // Force transition regardless of current state
    installation.status = "uninstalled";
    installation.scopeGrants = [];
    installation.activeChannels = [];
    installation.updatedAt = new Date().toISOString();
    this.installationStore.saveInstallation(installation);

    this.moderationManager.forceUninstall(
      botId,
      reason,
      performedBy,
      workspaceId,
    );
    this.rateLimiter.resetBot(botId);

    return installation;
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  getBot(botId: string): BotAccount | undefined {
    return this.identityManager.getAccount(botId);
  }

  getBotByUsername(username: string): BotAccount | undefined {
    return this.identityManager.getAccountByUsername(username);
  }

  listBots(filter?: {
    appId?: string;
    status?: BotAccountStatus;
    botType?: BotType;
  }): BotAccount[] {
    return this.identityManager.listAccounts(filter);
  }

  getInstallation(installationId: string): BotInstallation | undefined {
    return this.installationStore.getInstallation(installationId);
  }

  listInstallations(filter?: {
    botId?: string;
    workspaceId?: string;
    status?: BotInstallationStatus;
  }): BotInstallation[] {
    return this.installationStore.listInstallations(filter);
  }

  getAuditLog(filter?: {
    botId?: string;
    eventType?: BotAuditEventType;
    limit?: number;
  }): BotAuditEntry[] {
    return this.identityManager.getAuditLog(filter);
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Destroy the lifecycle manager (cleanup intervals).
   */
  destroy(): void {
    this.rateLimiter.destroy();
  }

  /**
   * Clear all data (for testing).
   */
  clearAll(): void {
    this.accountStore.clear();
    this.installationStore.clear();
    this.moderationStore.clear();
    this.rateLimiter.destroy();
    this.rateLimiter = new BotRateLimiter();
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getInstallationOrThrow(installationId: string): BotInstallation {
    const installation = this.installationStore.getInstallation(installationId);
    if (!installation) {
      throw new BotLifecycleError(
        `Installation not found: ${installationId}`,
        "INSTALLATION_NOT_FOUND",
        404,
      );
    }
    return installation;
  }

  private transitionInstallation(
    installationId: string,
    newStatus: BotInstallationStatus,
    actorId: string,
  ): BotInstallation {
    const installation = this.getInstallationOrThrow(installationId);
    const allowedTransitions =
      BOT_INSTALLATION_TRANSITIONS[installation.status];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BotLifecycleError(
        `Cannot transition installation from "${installation.status}" to "${newStatus}"`,
        "INVALID_STATUS_TRANSITION",
      );
    }

    const oldStatus = installation.status;
    installation.status = newStatus;
    installation.updatedAt = new Date().toISOString();
    this.installationStore.saveInstallation(installation);

    const eventType = this.getInstallEventType(newStatus);
    this.auditInstallation(
      installation,
      eventType,
      actorId,
      `Installation status changed from ${oldStatus} to ${newStatus}`,
    );

    return installation;
  }

  private getInstallEventType(
    status: BotInstallationStatus,
  ): BotAuditEventType {
    switch (status) {
      case "active":
        return "bot.enabled";
      case "disabled":
        return "bot.disabled";
      case "suspended":
        return "bot.suspended";
      case "uninstalled":
        return "bot.uninstalled";
    }
  }

  private auditInstallation(
    installation: BotInstallation,
    eventType: BotAuditEventType,
    actorId: string,
    description: string,
  ): void {
    this.accountStore.addAuditEntry({
      id: generateId("audit"),
      eventType,
      botId: installation.botId,
      actorId,
      workspaceId: installation.workspaceId,
      timestamp: new Date().toISOString(),
      description,
      data: {
        installationId: installation.id,
        workspaceId: installation.workspaceId,
      },
    });
  }
}
