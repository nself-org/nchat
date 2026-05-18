/**
 * Bot Identity Management
 *
 * Handles bot account creation, profile management, avatar handling,
 * and username validation. Each bot has a distinct identity separate
 * from regular user accounts.
 */

import { generateId } from "../app-lifecycle";
import type {
  BotAccount,
  BotAccountStatus,
  BotProfileUpdate,
  BotType,
  BotAuditEntry,
  BotAuditEventType,
} from "./types";
import {
  BOT_ACCOUNT_TRANSITIONS,
  BOT_USERNAME_REGEX,
  MAX_BOT_DESCRIPTION_LENGTH,
  isValidBotUsername,
} from "./types";

// ============================================================================
// ERRORS
// ============================================================================

export class BotIdentityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "BotIdentityError";
  }
}

// ============================================================================
// BOT ACCOUNT STORE
// ============================================================================

export class BotAccountStore {
  private accounts: Map<string, BotAccount> = new Map();
  private usernameIndex: Map<string, string> = new Map(); // username -> bot ID
  private auditLog: BotAuditEntry[] = [];

  getAccount(id: string): BotAccount | undefined {
    return this.accounts.get(id);
  }

  getAccountByUsername(username: string): BotAccount | undefined {
    const id = this.usernameIndex.get(username.toLowerCase());
    return id ? this.accounts.get(id) : undefined;
  }

  listAccounts(filter?: {
    appId?: string;
    status?: BotAccountStatus;
    botType?: BotType;
  }): BotAccount[] {
    let accounts = Array.from(this.accounts.values());
    if (filter?.appId) {
      accounts = accounts.filter((a) => a.appId === filter.appId);
    }
    if (filter?.status) {
      accounts = accounts.filter((a) => a.status === filter.status);
    }
    if (filter?.botType) {
      accounts = accounts.filter((a) => a.botType === filter.botType);
    }
    return accounts;
  }

  saveAccount(account: BotAccount): void {
    // Remove old username index if username changed
    const existing = this.accounts.get(account.id);
    if (existing && existing.username !== account.username) {
      this.usernameIndex.delete(existing.username.toLowerCase());
    }

    this.accounts.set(account.id, account);
    this.usernameIndex.set(account.username.toLowerCase(), account.id);
  }

  deleteAccount(id: string): boolean {
    const account = this.accounts.get(id);
    if (account) {
      this.usernameIndex.delete(account.username.toLowerCase());
    }
    return this.accounts.delete(id);
  }

  // --- Audit Log ---

  addAuditEntry(entry: BotAuditEntry): void {
    this.auditLog.push(entry);
  }

  getAuditLog(filter?: {
    botId?: string;
    eventType?: BotAuditEventType;
    limit?: number;
  }): BotAuditEntry[] {
    let entries = [...this.auditLog];
    if (filter?.botId) {
      entries = entries.filter((e) => e.botId === filter.botId);
    }
    if (filter?.eventType) {
      entries = entries.filter((e) => e.eventType === filter.eventType);
    }
    // Return newest first
    entries.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    if (filter?.limit) {
      entries = entries.slice(0, filter.limit);
    }
    return entries;
  }

  clear(): void {
    this.accounts.clear();
    this.usernameIndex.clear();
    this.auditLog = [];
  }
}

// ============================================================================
// BOT IDENTITY MANAGER
// ============================================================================

export class BotIdentityManager {
  constructor(private store: BotAccountStore) {}

  // ==========================================================================
  // ACCOUNT CREATION
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
    // Validate username
    if (!isValidBotUsername(params.username)) {
      throw new BotIdentityError(
        `Invalid bot username "${params.username}". Must be 3-32 lowercase alphanumeric chars with hyphens, starting with a letter.`,
        "INVALID_USERNAME",
      );
    }

    // Check for duplicate username
    const existing = this.store.getAccountByUsername(params.username);
    if (existing && existing.status !== "deleted") {
      throw new BotIdentityError(
        `Bot username "${params.username}" is already taken`,
        "USERNAME_TAKEN",
        409,
      );
    }

    // Validate display name
    if (!params.displayName || params.displayName.trim().length === 0) {
      throw new BotIdentityError(
        "Display name is required",
        "INVALID_DISPLAY_NAME",
      );
    }
    if (params.displayName.length > 64) {
      throw new BotIdentityError(
        "Display name must be 64 characters or less",
        "INVALID_DISPLAY_NAME",
      );
    }

    // Validate description
    if (!params.description || params.description.trim().length === 0) {
      throw new BotIdentityError(
        "Description is required",
        "INVALID_DESCRIPTION",
      );
    }
    if (params.description.length > MAX_BOT_DESCRIPTION_LENGTH) {
      throw new BotIdentityError(
        `Description must be ${MAX_BOT_DESCRIPTION_LENGTH} characters or less`,
        "INVALID_DESCRIPTION",
      );
    }

    // Validate avatar URL if provided
    if (params.avatarUrl) {
      this.validateUrl(params.avatarUrl, "avatarUrl");
    }

    // Validate homepage URL if provided
    if (params.homepageUrl) {
      this.validateUrl(params.homepageUrl, "homepageUrl");
    }

    const now = new Date().toISOString();
    const bot: BotAccount = {
      id: generateId("bot"),
      appId: params.appId,
      username: params.username.toLowerCase(),
      displayName: params.displayName.trim(),
      description: params.description.trim(),
      avatarUrl: params.avatarUrl,
      homepageUrl: params.homepageUrl,
      verified: false,
      status: "active",
      botType: params.botType ?? "custom",
      version: params.version ?? "1.0.0",
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.store.saveAccount(bot);

    this.audit(bot.id, "bot.created", params.createdBy, "Bot account created", {
      username: bot.username,
      appId: bot.appId,
    });

    return bot;
  }

  // ==========================================================================
  // PROFILE MANAGEMENT
  // ==========================================================================

  /**
   * Update a bot's profile.
   */
  updateProfile(
    botId: string,
    update: BotProfileUpdate,
    updatedBy: string,
  ): BotAccount {
    const bot = this.getAccountOrThrow(botId);

    if (bot.status === "deleted") {
      throw new BotIdentityError("Cannot update a deleted bot", "BOT_DELETED");
    }

    if (update.displayName !== undefined) {
      if (update.displayName.trim().length === 0) {
        throw new BotIdentityError(
          "Display name cannot be empty",
          "INVALID_DISPLAY_NAME",
        );
      }
      if (update.displayName.length > 64) {
        throw new BotIdentityError(
          "Display name must be 64 characters or less",
          "INVALID_DISPLAY_NAME",
        );
      }
      bot.displayName = update.displayName.trim();
    }

    if (update.description !== undefined) {
      if (update.description.trim().length === 0) {
        throw new BotIdentityError(
          "Description cannot be empty",
          "INVALID_DESCRIPTION",
        );
      }
      if (update.description.length > MAX_BOT_DESCRIPTION_LENGTH) {
        throw new BotIdentityError(
          `Description must be ${MAX_BOT_DESCRIPTION_LENGTH} characters or less`,
          "INVALID_DESCRIPTION",
        );
      }
      bot.description = update.description.trim();
    }

    if (update.avatarUrl !== undefined) {
      if (update.avatarUrl) {
        this.validateUrl(update.avatarUrl, "avatarUrl");
      }
      bot.avatarUrl = update.avatarUrl || undefined;
    }

    if (update.homepageUrl !== undefined) {
      if (update.homepageUrl) {
        this.validateUrl(update.homepageUrl, "homepageUrl");
      }
      bot.homepageUrl = update.homepageUrl || undefined;
    }

    if (update.botType !== undefined) {
      bot.botType = update.botType;
    }

    bot.updatedAt = new Date().toISOString();
    this.store.saveAccount(bot);

    this.audit(botId, "bot.updated", updatedBy, "Bot profile updated", {
      fields: Object.keys(update),
    });

    return bot;
  }

  /**
   * Update a bot's version.
   */
  updateVersion(
    botId: string,
    newVersion: string,
    updatedBy: string,
  ): BotAccount {
    const bot = this.getAccountOrThrow(botId);

    if (bot.status === "deleted") {
      throw new BotIdentityError("Cannot update a deleted bot", "BOT_DELETED");
    }

    if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(newVersion)) {
      throw new BotIdentityError(
        "Version must be a valid semver string",
        "INVALID_VERSION",
      );
    }

    bot.version = newVersion;
    bot.updatedAt = new Date().toISOString();
    this.store.saveAccount(bot);

    this.audit(
      botId,
      "bot.version_updated",
      updatedBy,
      `Bot version updated to ${newVersion}`,
    );

    return bot;
  }

  /**
   * Verify a bot (admin action).
   */
  verifyBot(botId: string, verifiedBy: string): BotAccount {
    const bot = this.getAccountOrThrow(botId);
    bot.verified = true;
    bot.updatedAt = new Date().toISOString();
    this.store.saveAccount(bot);

    this.audit(botId, "bot.updated", verifiedBy, "Bot verified");

    return bot;
  }

  // ==========================================================================
  // STATUS MANAGEMENT
  // ==========================================================================

  /**
   * Transition bot account status.
   */
  transitionStatus(
    botId: string,
    newStatus: BotAccountStatus,
    actorId: string,
    reason?: string,
  ): BotAccount {
    const bot = this.getAccountOrThrow(botId);
    const allowedTransitions = BOT_ACCOUNT_TRANSITIONS[bot.status];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BotIdentityError(
        `Cannot transition bot from "${bot.status}" to "${newStatus}"`,
        "INVALID_STATUS_TRANSITION",
      );
    }

    const oldStatus = bot.status;
    bot.status = newStatus;
    bot.updatedAt = new Date().toISOString();
    this.store.saveAccount(bot);

    const eventType = this.getAuditEventType(newStatus);
    this.audit(
      botId,
      eventType,
      actorId,
      `Bot status changed from ${oldStatus} to ${newStatus}`,
      {
        oldStatus,
        newStatus,
        reason,
      },
    );

    return bot;
  }

  // ==========================================================================
  // DELETION
  // ==========================================================================

  /**
   * Soft-delete a bot account (marks as deleted, preserves for audit).
   */
  deleteBot(botId: string, deletedBy: string): BotAccount {
    return this.transitionStatus(botId, "deleted", deletedBy, "Bot deleted");
  }

  /**
   * Hard-delete a bot account (removes all data).
   */
  purgeBot(botId: string): boolean {
    this.audit(botId, "bot.deleted", "system", "Bot purged from system");
    return this.store.deleteAccount(botId);
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  getAccount(botId: string): BotAccount | undefined {
    return this.store.getAccount(botId);
  }

  getAccountByUsername(username: string): BotAccount | undefined {
    return this.store.getAccountByUsername(username);
  }

  listAccounts(filter?: {
    appId?: string;
    status?: BotAccountStatus;
    botType?: BotType;
  }): BotAccount[] {
    return this.store.listAccounts(filter);
  }

  getAuditLog(filter?: {
    botId?: string;
    eventType?: BotAuditEventType;
    limit?: number;
  }): BotAuditEntry[] {
    return this.store.getAuditLog(filter);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getAccountOrThrow(botId: string): BotAccount {
    const account = this.store.getAccount(botId);
    if (!account) {
      throw new BotIdentityError(
        `Bot not found: ${botId}`,
        "BOT_NOT_FOUND",
        404,
      );
    }
    return account;
  }

  private validateUrl(url: string, fieldName: string): void {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new BotIdentityError(
          `${fieldName} must use http or https protocol`,
          "INVALID_URL",
        );
      }
    } catch (err) {
      if (err instanceof BotIdentityError) throw err;
      throw new BotIdentityError(
        `${fieldName} must be a valid URL`,
        "INVALID_URL",
      );
    }
  }

  private getAuditEventType(status: BotAccountStatus): BotAuditEventType {
    switch (status) {
      case "active":
        return "bot.updated";
      case "suspended":
        return "bot.suspended";
      case "disabled":
        return "bot.disabled";
      case "deleted":
        return "bot.deleted";
      case "pending_review":
        return "bot.updated";
    }
  }

  private audit(
    botId: string,
    eventType: BotAuditEventType,
    actorId: string,
    description: string,
    data?: Record<string, unknown>,
  ): void {
    this.store.addAuditEntry({
      id: generateId("audit"),
      eventType,
      botId,
      actorId,
      timestamp: new Date().toISOString(),
      description,
      data,
    });
  }
}
