/**
 * Slow Mode - Channel rate limiting system
 *
 * Provides slow mode functionality for channels with cooldown tracking,
 * moderator bypass, and configurable limits.
 */

// ============================================================================
// Types
// ============================================================================

export interface SlowModeConfig {
  channelId: string;
  cooldownMs: number;
  enabled: boolean;
  bypassRoles: string[];
  bypassUsers: string[];
  maxMessagesPerCooldown: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface UserCooldown {
  userId: string;
  channelId: string;
  lastMessageAt: number;
  messageCount: number;
  cooldownEndsAt: number;
}

export interface SlowModeResult {
  allowed: boolean;
  remainingCooldownMs: number;
  messagesRemaining: number;
  cooldownEndsAt: number | null;
  bypassReason?: "role" | "user" | "disabled";
}

export interface SlowModeStats {
  totalChannels: number;
  enabledChannels: number;
  totalCooldowns: number;
  activeCooldowns: number;
  messagesBlockedToday: number;
}

export interface SlowModeManagerConfig {
  defaultCooldownMs: number;
  minCooldownMs: number;
  maxCooldownMs: number;
  defaultBypassRoles: string[];
  cleanupIntervalMs: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SLOWMODE_CONFIG: SlowModeManagerConfig = {
  defaultCooldownMs: 5000, // 5 seconds
  minCooldownMs: 1000, // 1 second
  maxCooldownMs: 21600000, // 6 hours
  defaultBypassRoles: ["owner", "admin", "moderator"],
  cleanupIntervalMs: 60000, // 1 minute
};

// ============================================================================
// Common Cooldown Presets
// ============================================================================

export const SLOWMODE_PRESETS = {
  OFF: 0,
  FIVE_SECONDS: 5000,
  TEN_SECONDS: 10000,
  FIFTEEN_SECONDS: 15000,
  THIRTY_SECONDS: 30000,
  ONE_MINUTE: 60000,
  TWO_MINUTES: 120000,
  FIVE_MINUTES: 300000,
  TEN_MINUTES: 600000,
  FIFTEEN_MINUTES: 900000,
  THIRTY_MINUTES: 1800000,
  ONE_HOUR: 3600000,
  TWO_HOURS: 7200000,
  SIX_HOURS: 21600000,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats cooldown duration for display
 */
export function formatCooldown(ms: number): string {
  if (ms === 0) return "Off";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    if (remainingSeconds > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }

  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}

/**
 * Parses a cooldown string to milliseconds
 */
export function parseCooldown(value: string): number {
  const match = value.match(
    /^(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours)?$/i,
  );
  if (!match) return 0;

  const num = parseInt(match[1], 10);
  const unit = (match[2] || "s").toLowerCase();

  switch (unit[0]) {
    case "h":
      return num * 3600000;
    case "m":
      return num * 60000;
    case "s":
    default:
      return num * 1000;
  }
}

/**
 * Validates cooldown value
 */
export function validateCooldown(
  cooldownMs: number,
  config: SlowModeManagerConfig,
): { valid: boolean; error?: string } {
  if (cooldownMs < 0) {
    return { valid: false, error: "Cooldown cannot be negative" };
  }

  if (cooldownMs > 0 && cooldownMs < config.minCooldownMs) {
    return {
      valid: false,
      error: `Minimum cooldown is ${formatCooldown(config.minCooldownMs)}`,
    };
  }

  if (cooldownMs > config.maxCooldownMs) {
    return {
      valid: false,
      error: `Maximum cooldown is ${formatCooldown(config.maxCooldownMs)}`,
    };
  }

  return { valid: true };
}

/**
 * Creates a channel cooldown key
 */
export function createCooldownKey(userId: string, channelId: string): string {
  return `${channelId}:${userId}`;
}

// ============================================================================
// Slow Mode Manager Class
// ============================================================================

export class SlowModeManager {
  private channelConfigs: Map<string, SlowModeConfig>;
  private userCooldowns: Map<string, UserCooldown>;
  private config: SlowModeManagerConfig;
  private messagesBlockedToday: number;
  private lastCleanup: number;

  constructor(config: Partial<SlowModeManagerConfig> = {}) {
    this.channelConfigs = new Map();
    this.userCooldowns = new Map();
    this.config = { ...DEFAULT_SLOWMODE_CONFIG, ...config };
    this.messagesBlockedToday = 0;
    this.lastCleanup = Date.now();
  }

  /**
   * Updates manager configuration
   */
  updateConfig(config: Partial<SlowModeManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets manager configuration
   */
  getConfig(): SlowModeManagerConfig {
    return { ...this.config };
  }

  /**
   * Sets slow mode for a channel
   */
  setSlowMode(
    channelId: string,
    cooldownMs: number,
    options?: {
      bypassRoles?: string[];
      bypassUsers?: string[];
      maxMessagesPerCooldown?: number;
      createdBy?: string;
    },
  ): { success: boolean; config?: SlowModeConfig; error?: string } {
    // Validate cooldown
    if (cooldownMs > 0) {
      const validation = validateCooldown(cooldownMs, this.config);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
    }

    const now = new Date().toISOString();
    const existingConfig = this.channelConfigs.get(channelId);

    const slowModeConfig: SlowModeConfig = {
      channelId,
      cooldownMs,
      enabled: cooldownMs > 0,
      bypassRoles: options?.bypassRoles ||
        existingConfig?.bypassRoles || [...this.config.defaultBypassRoles],
      bypassUsers: options?.bypassUsers || existingConfig?.bypassUsers || [],
      maxMessagesPerCooldown:
        options?.maxMessagesPerCooldown ||
        existingConfig?.maxMessagesPerCooldown ||
        1,
      createdAt: existingConfig?.createdAt || now,
      updatedAt: now,
      createdBy: options?.createdBy || existingConfig?.createdBy,
    };

    this.channelConfigs.set(channelId, slowModeConfig);

    // Clear existing cooldowns for this channel if slow mode is disabled
    if (!slowModeConfig.enabled) {
      this.clearChannelCooldowns(channelId);
    }

    return { success: true, config: slowModeConfig };
  }

  /**
   * Disables slow mode for a channel
   */
  disableSlowMode(channelId: string): boolean {
    const config = this.channelConfigs.get(channelId);
    if (config) {
      config.enabled = false;
      config.cooldownMs = 0;
      config.updatedAt = new Date().toISOString();
      this.clearChannelCooldowns(channelId);
      return true;
    }
    return false;
  }

  /**
   * Removes slow mode configuration for a channel
   */
  removeSlowMode(channelId: string): boolean {
    const deleted = this.channelConfigs.delete(channelId);
    if (deleted) {
      this.clearChannelCooldowns(channelId);
    }
    return deleted;
  }

  /**
   * Gets slow mode configuration for a channel
   */
  getSlowModeConfig(channelId: string): SlowModeConfig | undefined {
    return this.channelConfigs.get(channelId);
  }

  /**
   * Checks if slow mode is enabled for a channel
   */
  isSlowModeEnabled(channelId: string): boolean {
    const config = this.channelConfigs.get(channelId);
    return config?.enabled === true && config.cooldownMs > 0;
  }

  /**
   * Gets the cooldown duration for a channel
   */
  getCooldownDuration(channelId: string): number {
    const config = this.channelConfigs.get(channelId);
    return config?.enabled ? config.cooldownMs : 0;
  }

  /**
   * Adds a user to the bypass list for a channel
   */
  addBypassUser(channelId: string, userId: string): boolean {
    const config = this.channelConfigs.get(channelId);
    if (!config) return false;

    if (!config.bypassUsers.includes(userId)) {
      config.bypassUsers.push(userId);
      config.updatedAt = new Date().toISOString();
    }
    return true;
  }

  /**
   * Removes a user from the bypass list
   */
  removeBypassUser(channelId: string, userId: string): boolean {
    const config = this.channelConfigs.get(channelId);
    if (!config) return false;

    const index = config.bypassUsers.indexOf(userId);
    if (index >= 0) {
      config.bypassUsers.splice(index, 1);
      config.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Adds a role to the bypass list
   */
  addBypassRole(channelId: string, role: string): boolean {
    const config = this.channelConfigs.get(channelId);
    if (!config) return false;

    if (!config.bypassRoles.includes(role)) {
      config.bypassRoles.push(role);
      config.updatedAt = new Date().toISOString();
    }
    return true;
  }

  /**
   * Removes a role from the bypass list
   */
  removeBypassRole(channelId: string, role: string): boolean {
    const config = this.channelConfigs.get(channelId);
    if (!config) return false;

    const index = config.bypassRoles.indexOf(role);
    if (index >= 0) {
      config.bypassRoles.splice(index, 1);
      config.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Checks if a user can send a message (main rate limiting function)
   */
  canSendMessage(
    userId: string,
    channelId: string,
    userRole?: string,
  ): SlowModeResult {
    const config = this.channelConfigs.get(channelId);

    // No slow mode configured
    if (!config || !config.enabled || config.cooldownMs === 0) {
      return {
        allowed: true,
        remainingCooldownMs: 0,
        messagesRemaining: Infinity,
        cooldownEndsAt: null,
        bypassReason: "disabled",
      };
    }

    // Check bypass roles
    if (userRole && config.bypassRoles.includes(userRole)) {
      return {
        allowed: true,
        remainingCooldownMs: 0,
        messagesRemaining: Infinity,
        cooldownEndsAt: null,
        bypassReason: "role",
      };
    }

    // Check bypass users
    if (config.bypassUsers.includes(userId)) {
      return {
        allowed: true,
        remainingCooldownMs: 0,
        messagesRemaining: Infinity,
        cooldownEndsAt: null,
        bypassReason: "user",
      };
    }

    const now = Date.now();
    const cooldownKey = createCooldownKey(userId, channelId);
    const userCooldown = this.userCooldowns.get(cooldownKey);

    // No existing cooldown
    if (!userCooldown || userCooldown.cooldownEndsAt <= now) {
      return {
        allowed: true,
        remainingCooldownMs: 0,
        messagesRemaining: config.maxMessagesPerCooldown,
        cooldownEndsAt: null,
      };
    }

    // Check if user has messages remaining in current cooldown
    if (userCooldown.messageCount < config.maxMessagesPerCooldown) {
      return {
        allowed: true,
        remainingCooldownMs: userCooldown.cooldownEndsAt - now,
        messagesRemaining:
          config.maxMessagesPerCooldown - userCooldown.messageCount,
        cooldownEndsAt: userCooldown.cooldownEndsAt,
      };
    }

    // User is rate limited
    return {
      allowed: false,
      remainingCooldownMs: userCooldown.cooldownEndsAt - now,
      messagesRemaining: 0,
      cooldownEndsAt: userCooldown.cooldownEndsAt,
    };
  }

  /**
   * Records a message sent by a user (updates cooldown)
   */
  recordMessage(
    userId: string,
    channelId: string,
    userRole?: string,
  ): SlowModeResult {
    // First check if allowed
    const checkResult = this.canSendMessage(userId, channelId, userRole);

    // If bypassed, don't record
    if (checkResult.bypassReason) {
      return checkResult;
    }

    // If not allowed, increment blocked counter
    if (!checkResult.allowed) {
      this.messagesBlockedToday++;
      return checkResult;
    }

    const config = this.channelConfigs.get(channelId);
    if (!config || !config.enabled) {
      return checkResult;
    }

    const now = Date.now();
    const cooldownKey = createCooldownKey(userId, channelId);
    let userCooldown = this.userCooldowns.get(cooldownKey);

    // Create or reset cooldown
    if (!userCooldown || userCooldown.cooldownEndsAt <= now) {
      userCooldown = {
        userId,
        channelId,
        lastMessageAt: now,
        messageCount: 1,
        cooldownEndsAt: now + config.cooldownMs,
      };
    } else {
      // Increment message count
      userCooldown.lastMessageAt = now;
      userCooldown.messageCount++;
    }

    this.userCooldowns.set(cooldownKey, userCooldown);

    // Run cleanup periodically
    this.maybeCleanup();

    return {
      allowed: true,
      remainingCooldownMs: userCooldown.cooldownEndsAt - now,
      messagesRemaining:
        config.maxMessagesPerCooldown - userCooldown.messageCount,
      cooldownEndsAt: userCooldown.cooldownEndsAt,
    };
  }

  /**
   * Gets the remaining cooldown for a user
   */
  getRemainingCooldown(userId: string, channelId: string): number {
    const cooldownKey = createCooldownKey(userId, channelId);
    const userCooldown = this.userCooldowns.get(cooldownKey);

    if (!userCooldown) return 0;

    const remaining = userCooldown.cooldownEndsAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Clears cooldown for a specific user in a channel
   */
  clearUserCooldown(userId: string, channelId: string): boolean {
    const cooldownKey = createCooldownKey(userId, channelId);
    return this.userCooldowns.delete(cooldownKey);
  }

  /**
   * Clears all cooldowns for a channel
   */
  clearChannelCooldowns(channelId: string): number {
    let cleared = 0;
    for (const [key, cooldown] of this.userCooldowns) {
      if (cooldown.channelId === channelId) {
        this.userCooldowns.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * Clears all cooldowns for a user (across all channels)
   */
  clearAllUserCooldowns(userId: string): number {
    let cleared = 0;
    for (const [key, cooldown] of this.userCooldowns) {
      if (cooldown.userId === userId) {
        this.userCooldowns.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * Gets all active cooldowns for a user
   */
  getUserCooldowns(userId: string): UserCooldown[] {
    const cooldowns: UserCooldown[] = [];
    const now = Date.now();

    for (const cooldown of this.userCooldowns.values()) {
      if (cooldown.userId === userId && cooldown.cooldownEndsAt > now) {
        cooldowns.push({ ...cooldown });
      }
    }

    return cooldowns;
  }

  /**
   * Gets all channels with slow mode enabled
   */
  getSlowModeChannels(): SlowModeConfig[] {
    return Array.from(this.channelConfigs.values()).filter((c) => c.enabled);
  }

  /**
   * Gets statistics
   */
  getStats(): SlowModeStats {
    const now = Date.now();
    const configs = Array.from(this.channelConfigs.values());

    return {
      totalChannels: configs.length,
      enabledChannels: configs.filter((c) => c.enabled).length,
      totalCooldowns: this.userCooldowns.size,
      activeCooldowns: Array.from(this.userCooldowns.values()).filter(
        (c) => c.cooldownEndsAt > now,
      ).length,
      messagesBlockedToday: this.messagesBlockedToday,
    };
  }

  /**
   * Resets daily counters (call at midnight)
   */
  resetDailyCounters(): void {
    this.messagesBlockedToday = 0;
  }

  /**
   * Runs cleanup of expired cooldowns if needed
   */
  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.config.cleanupIntervalMs) {
      return;
    }

    this.cleanup();
  }

  /**
   * Cleans up expired cooldowns
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cooldown] of this.userCooldowns) {
      if (cooldown.cooldownEndsAt <= now) {
        this.userCooldowns.delete(key);
        cleaned++;
      }
    }

    this.lastCleanup = now;
    return cleaned;
  }

  /**
   * Clears all data
   */
  clearAll(): void {
    this.channelConfigs.clear();
    this.userCooldowns.clear();
    this.messagesBlockedToday = 0;
  }

  /**
   * Gets count of configured channels
   */
  getChannelCount(): number {
    return this.channelConfigs.size;
  }

  /**
   * Gets count of active cooldowns
   */
  getCooldownCount(): number {
    return this.userCooldowns.size;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a slow mode manager with default configuration
 */
export function createSlowModeManager(
  config?: Partial<SlowModeManagerConfig>,
): SlowModeManager {
  return new SlowModeManager(config);
}

/**
 * Creates a channel slow mode configuration
 */
export function createSlowModeConfig(
  channelId: string,
  cooldownMs: number,
  options?: Partial<Omit<SlowModeConfig, "channelId" | "cooldownMs">>,
): SlowModeConfig {
  const now = new Date().toISOString();
  return {
    channelId,
    cooldownMs,
    enabled: cooldownMs > 0,
    bypassRoles:
      options?.bypassRoles || DEFAULT_SLOWMODE_CONFIG.defaultBypassRoles,
    bypassUsers: options?.bypassUsers || [],
    maxMessagesPerCooldown: options?.maxMessagesPerCooldown || 1,
    createdAt: options?.createdAt || now,
    updatedAt: options?.updatedAt || now,
    createdBy: options?.createdBy,
  };
}

// ============================================================================
// Export Default Instance
// ============================================================================

export const defaultSlowModeManager = createSlowModeManager();
