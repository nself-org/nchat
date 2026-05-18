/**
 * Ban Manager - User ban management system
 *
 * Provides ban creation, expiration handling, ban history, and IP ban support
 */

// ============================================================================
// Types
// ============================================================================

export type BanType = "temporary" | "permanent";
export type BanScope = "server" | "channel";

export interface Ban {
  id: string;
  userId: string;
  userName?: string;
  channelId: string | null; // null = server-wide
  channelName?: string;
  moderatorId: string;
  moderatorName?: string;
  reason: string;
  type: BanType;
  expiresAt: string | null; // null = permanent
  createdAt: string;
  updatedAt: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface BanHistoryEntry {
  id: string;
  banId: string;
  action: "created" | "extended" | "reduced" | "lifted" | "expired";
  performedBy: string;
  performedByName?: string;
  previousExpiresAt?: string | null;
  newExpiresAt?: string | null;
  reason?: string;
  timestamp: string;
}

export interface IpBan {
  id: string;
  ipAddress: string;
  reason: string;
  moderatorId: string;
  moderatorName?: string;
  expiresAt: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface BanFilter {
  userId?: string;
  channelId?: string | null;
  moderatorId?: string;
  type?: BanType;
  scope?: BanScope;
  active?: boolean;
  includeExpired?: boolean;
}

export interface BanStats {
  totalBans: number;
  activeBans: number;
  permanentBans: number;
  temporaryBans: number;
  expiredBans: number;
  serverWideBans: number;
  channelBans: number;
  ipBans: number;
  bansToday: number;
  unbansToday: number;
}

export interface CreateBanInput {
  userId: string;
  userName?: string;
  channelId?: string | null;
  channelName?: string;
  moderatorId: string;
  moderatorName?: string;
  reason: string;
  durationMs?: number; // undefined = permanent
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateBanInput {
  reason?: string;
  durationMs?: number | null; // null = make permanent
  moderatorId: string;
  moderatorName?: string;
}

export interface BanManagerConfig {
  maxBanDurationMs: number;
  defaultBanDurationMs: number;
  allowPermanentBans: boolean;
  ipBansEnabled: boolean;
  requireBanReason: boolean;
  minReasonLength: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_BAN_CONFIG: BanManagerConfig = {
  maxBanDurationMs: 365 * 24 * 60 * 60 * 1000, // 1 year
  defaultBanDurationMs: 7 * 24 * 60 * 60 * 1000, // 1 week
  allowPermanentBans: true,
  ipBansEnabled: true,
  requireBanReason: true,
  minReasonLength: 3,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a unique ban ID
 */
export function generateBanId(): string {
  return `ban-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique history entry ID
 */
export function generateHistoryId(): string {
  return `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique IP ban ID
 */
export function generateIpBanId(): string {
  return `ipban-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Checks if a ban is expired
 */
export function isBanExpired(ban: Ban | IpBan): boolean {
  if (!ban.expiresAt) return false;
  return new Date(ban.expiresAt).getTime() < Date.now();
}

/**
 * Checks if a ban is active (not expired)
 */
export function isBanActive(ban: Ban | IpBan): boolean {
  return !isBanExpired(ban);
}

/**
 * Calculates expiration date from duration
 */
export function calculateExpiresAt(durationMs?: number): string | null {
  if (durationMs === undefined) return null;
  return new Date(Date.now() + durationMs).toISOString();
}

/**
 * Gets remaining time for a ban in milliseconds
 */
export function getRemainingTime(ban: Ban | IpBan): number | null {
  if (!ban.expiresAt) return null; // Permanent ban
  const remaining = new Date(ban.expiresAt).getTime() - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Formats duration in human-readable form
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}

/**
 * Validates IP address format (basic validation)
 */
export function isValidIpAddress(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".").map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }

  // IPv6 (simplified check)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
}

/**
 * Validates ban input
 */
export function validateBanInput(
  input: CreateBanInput,
  config: BanManagerConfig,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.userId) {
    errors.push("User ID is required");
  }

  if (!input.moderatorId) {
    errors.push("Moderator ID is required");
  }

  if (config.requireBanReason) {
    if (!input.reason || input.reason.trim().length < config.minReasonLength) {
      errors.push(
        `Reason must be at least ${config.minReasonLength} characters`,
      );
    }
  }

  if (input.durationMs !== undefined) {
    if (input.durationMs <= 0) {
      errors.push("Duration must be positive");
    }
    if (input.durationMs > config.maxBanDurationMs) {
      errors.push(
        `Duration exceeds maximum of ${formatDuration(config.maxBanDurationMs)}`,
      );
    }
  } else if (!config.allowPermanentBans) {
    errors.push("Permanent bans are not allowed");
  }

  if (input.ipAddress && !isValidIpAddress(input.ipAddress)) {
    errors.push("Invalid IP address format");
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Ban Manager Class
// ============================================================================

export class BanManager {
  private bans: Map<string, Ban>;
  private banHistory: Map<string, BanHistoryEntry[]>;
  private ipBans: Map<string, IpBan>;
  private userBanIndex: Map<string, Set<string>>; // userId -> banIds
  private channelBanIndex: Map<string, Set<string>>; // channelId -> banIds
  private config: BanManagerConfig;

  constructor(config: Partial<BanManagerConfig> = {}) {
    this.bans = new Map();
    this.banHistory = new Map();
    this.ipBans = new Map();
    this.userBanIndex = new Map();
    this.channelBanIndex = new Map();
    this.config = { ...DEFAULT_BAN_CONFIG, ...config };
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<BanManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current configuration
   */
  getConfig(): BanManagerConfig {
    return { ...this.config };
  }

  /**
   * Creates a new ban
   */
  banUser(input: CreateBanInput): {
    success: boolean;
    ban?: Ban;
    errors?: string[];
  } {
    const validation = validateBanInput(input, this.config);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Check if user is already banned in this scope
    const existingBan = this.getActiveBan(input.userId, input.channelId);
    if (existingBan) {
      return {
        success: false,
        errors: ["User is already banned in this scope"],
      };
    }

    const now = new Date().toISOString();
    const ban: Ban = {
      id: generateBanId(),
      userId: input.userId,
      userName: input.userName,
      channelId: input.channelId ?? null,
      channelName: input.channelName,
      moderatorId: input.moderatorId,
      moderatorName: input.moderatorName,
      reason: input.reason.trim(),
      type: input.durationMs === undefined ? "permanent" : "temporary",
      expiresAt: calculateExpiresAt(input.durationMs),
      createdAt: now,
      updatedAt: now,
      ipAddress: input.ipAddress,
      metadata: input.metadata,
    };

    this.bans.set(ban.id, ban);
    this.indexBan(ban);
    this.recordHistory(
      ban.id,
      "created",
      input.moderatorId,
      input.moderatorName,
      null,
      ban.expiresAt,
      input.reason,
    );

    // Also create IP ban if specified
    if (input.ipAddress && this.config.ipBansEnabled) {
      this.banIp(
        input.ipAddress,
        input.reason,
        input.moderatorId,
        input.moderatorName,
        input.durationMs,
      );
    }

    return { success: true, ban };
  }

  /**
   * Unbans a user
   */
  unbanUser(
    banId: string,
    moderatorId: string,
    reason?: string,
    moderatorName?: string,
  ): { success: boolean; error?: string } {
    const ban = this.bans.get(banId);
    if (!ban) {
      return { success: false, error: "Ban not found" };
    }

    this.recordHistory(
      banId,
      "lifted",
      moderatorId,
      moderatorName,
      ban.expiresAt,
      null,
      reason,
    );
    this.unindexBan(ban);
    this.bans.delete(banId);

    return { success: true };
  }

  /**
   * Unbans a user by user ID (for all scopes or specific channel)
   */
  unbanUserById(
    userId: string,
    moderatorId: string,
    channelId?: string | null,
    reason?: string,
    moderatorName?: string,
  ): { success: boolean; unbannedCount: number } {
    const userBans = this.getUserBans(userId, true);
    let unbannedCount = 0;

    for (const ban of userBans) {
      // If channelId specified, only unban that specific ban
      if (channelId !== undefined && ban.channelId !== channelId) {
        continue;
      }

      const result = this.unbanUser(ban.id, moderatorId, reason, moderatorName);
      if (result.success) {
        unbannedCount++;
      }
    }

    return { success: unbannedCount > 0, unbannedCount };
  }

  /**
   * Updates an existing ban
   */
  updateBan(
    banId: string,
    updates: UpdateBanInput,
  ): { success: boolean; ban?: Ban; error?: string } {
    const ban = this.bans.get(banId);
    if (!ban) {
      return { success: false, error: "Ban not found" };
    }

    const previousExpiresAt = ban.expiresAt;

    if (updates.reason !== undefined) {
      ban.reason = updates.reason.trim();
    }

    if (updates.durationMs !== undefined) {
      if (updates.durationMs === null) {
        // Make permanent
        if (!this.config.allowPermanentBans) {
          return { success: false, error: "Permanent bans are not allowed" };
        }
        ban.expiresAt = null;
        ban.type = "permanent";
      } else {
        if (updates.durationMs > this.config.maxBanDurationMs) {
          return {
            success: false,
            error: `Duration exceeds maximum of ${formatDuration(this.config.maxBanDurationMs)}`,
          };
        }
        ban.expiresAt = calculateExpiresAt(updates.durationMs);
        ban.type = "temporary";
      }
    }

    ban.updatedAt = new Date().toISOString();

    // Determine action type
    let action: BanHistoryEntry["action"] = "extended";
    if (ban.expiresAt !== previousExpiresAt) {
      if (
        ban.expiresAt === null ||
        (previousExpiresAt && ban.expiresAt > previousExpiresAt)
      ) {
        action = "extended";
      } else {
        action = "reduced";
      }
    }

    this.recordHistory(
      banId,
      action,
      updates.moderatorId,
      updates.moderatorName,
      previousExpiresAt,
      ban.expiresAt,
    );

    return { success: true, ban };
  }

  /**
   * Gets a ban by ID
   */
  getBan(banId: string): Ban | undefined {
    return this.bans.get(banId);
  }

  /**
   * Gets active ban for a user in a specific scope
   */
  getActiveBan(userId: string, channelId?: string | null): Ban | undefined {
    // Check server-wide ban first
    const userBanIds = this.userBanIndex.get(userId);
    if (!userBanIds) return undefined;

    for (const banId of userBanIds) {
      const ban = this.bans.get(banId);
      if (!ban || !isBanActive(ban)) continue;

      // Server-wide ban applies everywhere
      if (ban.channelId === null) return ban;

      // Channel-specific ban
      if (channelId !== undefined && ban.channelId === channelId) return ban;
    }

    return undefined;
  }

  /**
   * Checks if a user is banned
   */
  isUserBanned(userId: string, channelId?: string | null): boolean {
    return this.getActiveBan(userId, channelId) !== undefined;
  }

  /**
   * Gets all bans for a user
   */
  getUserBans(userId: string, activeOnly: boolean = false): Ban[] {
    const userBanIds = this.userBanIndex.get(userId);
    if (!userBanIds) return [];

    const bans: Ban[] = [];
    for (const banId of userBanIds) {
      const ban = this.bans.get(banId);
      if (ban) {
        if (activeOnly && !isBanActive(ban)) continue;
        bans.push(ban);
      }
    }

    return bans.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Gets all bans for a channel
   */
  getChannelBans(channelId: string, activeOnly: boolean = false): Ban[] {
    const channelBanIds = this.channelBanIndex.get(channelId);
    if (!channelBanIds) return [];

    const bans: Ban[] = [];
    for (const banId of channelBanIds) {
      const ban = this.bans.get(banId);
      if (ban) {
        if (activeOnly && !isBanActive(ban)) continue;
        bans.push(ban);
      }
    }

    return bans.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Gets bans matching a filter
   */
  getBans(filter: BanFilter = {}): Ban[] {
    let bans = Array.from(this.bans.values());

    if (filter.userId) {
      bans = bans.filter((b) => b.userId === filter.userId);
    }

    if (filter.channelId !== undefined) {
      bans = bans.filter((b) => b.channelId === filter.channelId);
    }

    if (filter.moderatorId) {
      bans = bans.filter((b) => b.moderatorId === filter.moderatorId);
    }

    if (filter.type) {
      bans = bans.filter((b) => b.type === filter.type);
    }

    if (filter.scope) {
      if (filter.scope === "server") {
        bans = bans.filter((b) => b.channelId === null);
      } else {
        bans = bans.filter((b) => b.channelId !== null);
      }
    }

    if (filter.active !== undefined) {
      bans = bans.filter((b) => isBanActive(b) === filter.active);
    }

    if (!filter.includeExpired) {
      bans = bans.filter((b) => isBanActive(b));
    }

    return bans.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Gets ban history for a ban
   */
  getBanHistory(banId: string): BanHistoryEntry[] {
    return this.banHistory.get(banId) || [];
  }

  /**
   * Expires old bans (cleanup)
   */
  cleanupExpiredBans(): number {
    let expiredCount = 0;
    const now = Date.now();

    for (const [banId, ban] of this.bans) {
      if (ban.expiresAt && new Date(ban.expiresAt).getTime() < now) {
        this.recordHistory(
          banId,
          "expired",
          "system",
          "System",
          ban.expiresAt,
          null,
        );
        this.unindexBan(ban);
        this.bans.delete(banId);
        expiredCount++;
      }
    }

    // Also clean up IP bans
    for (const [ipBanId, ipBan] of this.ipBans) {
      if (ipBan.expiresAt && new Date(ipBan.expiresAt).getTime() < now) {
        this.ipBans.delete(ipBanId);
        expiredCount++;
      }
    }

    return expiredCount;
  }

  // ==========================================================================
  // IP Ban Methods
  // ==========================================================================

  /**
   * Bans an IP address
   */
  banIp(
    ipAddress: string,
    reason: string,
    moderatorId: string,
    moderatorName?: string,
    durationMs?: number,
  ): { success: boolean; ipBan?: IpBan; error?: string } {
    if (!this.config.ipBansEnabled) {
      return { success: false, error: "IP bans are disabled" };
    }

    if (!isValidIpAddress(ipAddress)) {
      return { success: false, error: "Invalid IP address format" };
    }

    // Check if IP is already banned
    if (this.isIpBanned(ipAddress)) {
      return { success: false, error: "IP address is already banned" };
    }

    const ipBan: IpBan = {
      id: generateIpBanId(),
      ipAddress,
      reason: reason.trim(),
      moderatorId,
      moderatorName,
      expiresAt: calculateExpiresAt(durationMs),
      createdAt: new Date().toISOString(),
    };

    this.ipBans.set(ipBan.id, ipBan);

    return { success: true, ipBan };
  }

  /**
   * Unbans an IP address
   */
  unbanIp(ipBanId: string): { success: boolean; error?: string } {
    if (!this.ipBans.has(ipBanId)) {
      return { success: false, error: "IP ban not found" };
    }

    this.ipBans.delete(ipBanId);
    return { success: true };
  }

  /**
   * Unbans an IP address by IP
   */
  unbanIpByAddress(ipAddress: string): { success: boolean; error?: string } {
    const ipBan = this.getIpBan(ipAddress);
    if (!ipBan) {
      return { success: false, error: "IP ban not found" };
    }

    return this.unbanIp(ipBan.id);
  }

  /**
   * Checks if an IP is banned
   */
  isIpBanned(ipAddress: string): boolean {
    for (const ipBan of this.ipBans.values()) {
      if (ipBan.ipAddress === ipAddress && isBanActive(ipBan)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gets IP ban by address
   */
  getIpBan(ipAddress: string): IpBan | undefined {
    for (const ipBan of this.ipBans.values()) {
      if (ipBan.ipAddress === ipAddress && isBanActive(ipBan)) {
        return ipBan;
      }
    }
    return undefined;
  }

  /**
   * Gets all IP bans
   */
  getIpBans(activeOnly: boolean = true): IpBan[] {
    const bans = Array.from(this.ipBans.values());
    if (activeOnly) {
      return bans.filter(isBanActive);
    }
    return bans;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Gets ban statistics
   */
  getStats(): BanStats {
    const bans = Array.from(this.bans.values());
    const todayStart = new Date().setHours(0, 0, 0, 0);

    const stats: BanStats = {
      totalBans: bans.length,
      activeBans: 0,
      permanentBans: 0,
      temporaryBans: 0,
      expiredBans: 0,
      serverWideBans: 0,
      channelBans: 0,
      ipBans: this.ipBans.size,
      bansToday: 0,
      unbansToday: 0,
    };

    for (const ban of bans) {
      if (isBanActive(ban)) {
        stats.activeBans++;
      } else {
        stats.expiredBans++;
      }

      if (ban.type === "permanent") {
        stats.permanentBans++;
      } else {
        stats.temporaryBans++;
      }

      if (ban.channelId === null) {
        stats.serverWideBans++;
      } else {
        stats.channelBans++;
      }

      if (new Date(ban.createdAt).getTime() >= todayStart) {
        stats.bansToday++;
      }
    }

    // Count unbans today from history
    for (const history of this.banHistory.values()) {
      for (const entry of history) {
        if (
          entry.action === "lifted" &&
          new Date(entry.timestamp).getTime() >= todayStart
        ) {
          stats.unbansToday++;
        }
      }
    }

    return stats;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Indexes a ban for quick lookup
   */
  private indexBan(ban: Ban): void {
    // User index
    if (!this.userBanIndex.has(ban.userId)) {
      this.userBanIndex.set(ban.userId, new Set());
    }
    this.userBanIndex.get(ban.userId)!.add(ban.id);

    // Channel index
    if (ban.channelId) {
      if (!this.channelBanIndex.has(ban.channelId)) {
        this.channelBanIndex.set(ban.channelId, new Set());
      }
      this.channelBanIndex.get(ban.channelId)!.add(ban.id);
    }
  }

  /**
   * Removes ban from indexes
   */
  private unindexBan(ban: Ban): void {
    // User index
    const userBans = this.userBanIndex.get(ban.userId);
    if (userBans) {
      userBans.delete(ban.id);
      if (userBans.size === 0) {
        this.userBanIndex.delete(ban.userId);
      }
    }

    // Channel index
    if (ban.channelId) {
      const channelBans = this.channelBanIndex.get(ban.channelId);
      if (channelBans) {
        channelBans.delete(ban.id);
        if (channelBans.size === 0) {
          this.channelBanIndex.delete(ban.channelId);
        }
      }
    }
  }

  /**
   * Records a history entry
   */
  private recordHistory(
    banId: string,
    action: BanHistoryEntry["action"],
    performedBy: string,
    performedByName?: string,
    previousExpiresAt?: string | null,
    newExpiresAt?: string | null,
    reason?: string,
  ): void {
    if (!this.banHistory.has(banId)) {
      this.banHistory.set(banId, []);
    }

    const entry: BanHistoryEntry = {
      id: generateHistoryId(),
      banId,
      action,
      performedBy,
      performedByName,
      previousExpiresAt,
      newExpiresAt,
      reason,
      timestamp: new Date().toISOString(),
    };

    this.banHistory.get(banId)!.push(entry);
  }

  /**
   * Clears all bans
   */
  clearAll(): void {
    this.bans.clear();
    this.banHistory.clear();
    this.ipBans.clear();
    this.userBanIndex.clear();
    this.channelBanIndex.clear();
  }

  /**
   * Gets total ban count
   */
  getCount(): number {
    return this.bans.size;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a ban manager with default configuration
 */
export function createBanManager(
  config?: Partial<BanManagerConfig>,
): BanManager {
  return new BanManager(config);
}

/**
 * Creates ban input helper
 */
export function createBanInput(
  userId: string,
  moderatorId: string,
  reason: string,
  options?: {
    userName?: string;
    channelId?: string | null;
    channelName?: string;
    moderatorName?: string;
    durationMs?: number;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  },
): CreateBanInput {
  return {
    userId,
    moderatorId,
    reason,
    ...options,
  };
}

// ============================================================================
// Common Ban Durations
// ============================================================================

export const BAN_DURATIONS = {
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  SIX_HOURS: 6 * 60 * 60 * 1000,
  TWELVE_HOURS: 12 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  THREE_DAYS: 3 * 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  TWO_WEEKS: 14 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
  THREE_MONTHS: 90 * 24 * 60 * 60 * 1000,
  SIX_MONTHS: 180 * 24 * 60 * 60 * 1000,
  ONE_YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// Export Default Instance
// ============================================================================

export const defaultBanManager = createBanManager();
