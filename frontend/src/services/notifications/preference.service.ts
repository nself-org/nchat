/**
 * Notification Preference Service - Manage user notification preferences
 *
 * Handles getting and updating user notification preferences via the plugin API.
 */

import { logger } from "@/lib/logger";
import {
  NotificationChannel,
  NotificationCategory,
  NotificationPreference,
  UserNotificationPreferences,
  QuietHours,
  defaultUserPreferences,
  NotificationPluginConfig,
  defaultNotificationConfig,
  FrequencyType,
} from "@/types/notifications";

// =============================================================================
// Types
// =============================================================================

export interface PreferenceServiceOptions {
  config?: Partial<NotificationPluginConfig>;
  getAuthToken?: () => Promise<string | null>;
}

export interface UpdateChannelPreferenceOptions {
  userId: string;
  channel: NotificationChannel;
  enabled?: boolean;
  frequency?: FrequencyType;
  categories?: Partial<Record<NotificationCategory, boolean>>;
}

export interface UpdateQuietHoursOptions {
  userId: string;
  quietHours: QuietHours | null;
}

// =============================================================================
// Preference Service
// =============================================================================

export class PreferenceService {
  private config: NotificationPluginConfig;
  private getAuthToken?: () => Promise<string | null>;
  private cache: Map<
    string,
    { preferences: UserNotificationPreferences; expiresAt: number }
  > = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(options: PreferenceServiceOptions = {}) {
    this.config = { ...defaultNotificationConfig, ...options.config };
    this.getAuthToken = options.getAuthToken;
  }

  /**
   * Get request headers with optional auth token
   */
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Make API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const headers = await this.getHeaders();

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(
    userId: string,
    forceRefresh = false,
  ): Promise<UserNotificationPreferences> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.cache.get(userId);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.preferences;
      }
    }

    try {
      const response = await this.request<{
        preferences: NotificationPreference[];
      }>("GET", `/api/preferences/${userId}`);

      // Convert array of preferences to UserNotificationPreferences object
      const preferences = this.convertToUserPreferences(response.preferences);

      // Cache the result
      this.cache.set(userId, {
        preferences,
        expiresAt: Date.now() + this.cacheTimeout,
      });

      return preferences;
    } catch (error) {
      // Return default preferences on error
      logger.warn("Failed to fetch preferences, using defaults:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { ...defaultUserPreferences };
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<UserNotificationPreferences>,
  ): Promise<UserNotificationPreferences> {
    // Convert to individual preference updates
    const preferenceUpdates: Array<{
      channel: NotificationChannel;
      category: NotificationCategory;
      enabled: boolean;
      frequency: FrequencyType;
    }> = [];

    // Process channel updates
    for (const channel of ["email", "push", "sms"] as NotificationChannel[]) {
      const channelUpdate = updates[channel];
      if (!channelUpdate) continue;

      // Process category updates for this channel
      if (channelUpdate.categories) {
        for (const category of Object.keys(
          channelUpdate.categories,
        ) as NotificationCategory[]) {
          const categoryEnabled = channelUpdate.categories[category];
          if (categoryEnabled !== undefined) {
            preferenceUpdates.push({
              channel,
              category,
              enabled: categoryEnabled && (channelUpdate.enabled ?? true),
              frequency: channelUpdate.frequency ?? "immediate",
            });
          }
        }
      }
    }

    // Send updates to API
    if (preferenceUpdates.length > 0) {
      await this.request("POST", `/api/preferences`, {
        user_id: userId,
        preferences: preferenceUpdates,
        quiet_hours: updates.quietHours,
      });
    }

    // Invalidate cache
    this.cache.delete(userId);

    // Return updated preferences
    return this.getPreferences(userId, true);
  }

  /**
   * Update channel-specific preferences
   */
  async updateChannelPreference(
    options: UpdateChannelPreferenceOptions,
  ): Promise<UserNotificationPreferences> {
    const { userId, channel, enabled, frequency, categories } = options;

    const updates: Partial<UserNotificationPreferences> = {};

    if (channel === "email") {
      updates.email = {
        enabled: enabled ?? true,
        frequency: frequency ?? "immediate",
        categories: categories
          ? {
              transactional: categories.transactional ?? true,
              marketing: categories.marketing ?? false,
              system: categories.system ?? true,
              alert: categories.alert ?? true,
            }
          : defaultUserPreferences.email.categories,
      };
    } else if (channel === "push") {
      updates.push = {
        enabled: enabled ?? true,
        frequency: frequency ?? "immediate",
        categories: categories
          ? {
              transactional: categories.transactional ?? true,
              marketing: categories.marketing ?? false,
              system: categories.system ?? true,
              alert: categories.alert ?? true,
            }
          : defaultUserPreferences.push.categories,
      };
    } else if (channel === "sms") {
      updates.sms = {
        enabled: enabled ?? false,
        frequency: frequency ?? "immediate",
        categories: categories
          ? {
              transactional: categories.transactional ?? true,
              marketing: categories.marketing ?? false,
              system: categories.system ?? false,
              alert: categories.alert ?? true,
            }
          : defaultUserPreferences.sms.categories,
      };
    }

    return this.updatePreferences(userId, updates);
  }

  /**
   * Update quiet hours
   */
  async updateQuietHours(
    options: UpdateQuietHoursOptions,
  ): Promise<UserNotificationPreferences> {
    const { userId, quietHours } = options;

    return this.updatePreferences(userId, {
      quietHours: quietHours || undefined,
    });
  }

  /**
   * Enable all notifications for a channel
   */
  async enableChannel(
    userId: string,
    channel: NotificationChannel,
  ): Promise<void> {
    await this.updateChannelPreference({
      userId,
      channel,
      enabled: true,
    });
  }

  /**
   * Disable all notifications for a channel
   */
  async disableChannel(
    userId: string,
    channel: NotificationChannel,
  ): Promise<void> {
    await this.updateChannelPreference({
      userId,
      channel,
      enabled: false,
    });
  }

  /**
   * Check if user can receive notification
   */
  async canReceive(
    userId: string,
    channel: NotificationChannel,
    category: NotificationCategory,
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    const channelPrefs = preferences[channel];

    if (!channelPrefs.enabled) {
      return false;
    }

    if (!channelPrefs.categories[category]) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHours) {
      const now = new Date();
      const { start, end, timezone } = preferences.quietHours;

      // Convert to user's timezone and check if in quiet hours
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const currentTime = formatter.format(now);

      // Handle overnight quiet hours
      if (start > end) {
        if (currentTime >= start || currentTime < end) {
          return false;
        }
      } else {
        if (currentTime >= start && currentTime < end) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Convert array of preferences to UserNotificationPreferences object
   */
  private convertToUserPreferences(
    preferences: NotificationPreference[],
  ): UserNotificationPreferences {
    const result: UserNotificationPreferences = { ...defaultUserPreferences };

    // Group preferences by channel
    for (const pref of preferences) {
      const channelKey = pref.channel as keyof UserNotificationPreferences;

      if (
        channelKey === "email" ||
        channelKey === "push" ||
        channelKey === "sms"
      ) {
        result[channelKey] = {
          ...result[channelKey],
          enabled: result[channelKey].enabled || pref.enabled,
          frequency: pref.frequency,
          categories: {
            ...result[channelKey].categories,
            [pref.category]: pref.enabled,
          },
        };

        // Handle quiet hours (take the first one found)
        if (pref.quiet_hours && !result.quietHours) {
          result.quietHours = pref.quiet_hours;
        }
      }
    }

    return result;
  }

  /**
   * Clear preference cache
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let preferenceServiceInstance: PreferenceService | null = null;

export function getPreferenceService(
  options?: PreferenceServiceOptions,
): PreferenceService {
  if (!preferenceServiceInstance) {
    preferenceServiceInstance = new PreferenceService(options);
  }
  return preferenceServiceInstance;
}

export function resetPreferenceService(): void {
  preferenceServiceInstance = null;
}
