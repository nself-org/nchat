/**
 * Analytics Events Tracker
 *
 * High-level API for tracking events across Firebase, Sentry, and custom analytics
 */

import { firebaseAnalytics } from "./firebase";
import { sentryMobile } from "./sentry-mobile";
import { StandardEvents } from "./types";
import type {
  AnalyticsConfig,
  CallEvent,
  ChannelEvent,
  ErrorEvent,
  EventParams,
  FileEvent,
  MessageSentEvent,
  PerformanceEvent,
  SearchEvent,
  SessionData,
  UserProperties,
} from "./types";
import { logger } from "@/lib/logger";

class AnalyticsEvents {
  private config: AnalyticsConfig | null = null;
  private sessionData: SessionData | null = null;
  private sessionStartTime = 0;

  /**
   * Initialize analytics
   */
  async initialize(config: AnalyticsConfig): Promise<void> {
    this.config = config;

    if (!config.enabled) {
      // REMOVED: console.log('Analytics disabled')
      return;
    }

    try {
      // Initialize providers
      const providers = config.providers || [];

      if (providers.includes("firebase") && config.firebase) {
        await firebaseAnalytics.initialize(config);
      }

      if (providers.includes("sentry") && config.sentry) {
        await sentryMobile.initialize(config);
      }

      // Start session tracking
      this.startSession();

      // REMOVED: console.log('Analytics initialized with providers:', providers)
    } catch (error) {
      logger.error(
        "Failed to initialize analytics",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Track app lifecycle events
   */
  async trackAppOpen(): Promise<void> {
    await this.logEvent(StandardEvents.APP_OPEN);
    await firebaseAnalytics.logEvent(StandardEvents.SESSION_START);
  }

  async trackAppBackground(): Promise<void> {
    await this.logEvent(StandardEvents.APP_BACKGROUND);
    this.pauseSession();
  }

  async trackAppForeground(): Promise<void> {
    await this.logEvent(StandardEvents.APP_FOREGROUND);
    this.resumeSession();
  }

  /**
   * Track authentication events
   */
  async trackLogin(method: string, userId: string): Promise<void> {
    await this.logEvent(StandardEvents.LOGIN, {
      method,
      userId,
    });
    await this.setUserId(userId);
  }

  async trackLogout(): Promise<void> {
    await this.logEvent(StandardEvents.LOGOUT);
    await this.setUserId(null);
    this.endSession();
  }

  async trackSignup(method: string, userId: string): Promise<void> {
    await this.logEvent(StandardEvents.SIGN_UP, {
      method,
      userId,
    });
    await this.setUserId(userId);
  }

  async trackLoginFailed(reason: string): Promise<void> {
    await this.logEvent(StandardEvents.LOGIN_FAILED, { reason });
  }

  /**
   * Track messaging events
   */
  async trackMessageSent(event: MessageSentEvent): Promise<void> {
    await this.logEvent(StandardEvents.MESSAGE_SENT, {
      channel_id: event.channel_id,
      channel_type: event.channel_type,
      message_length: event.message_length,
      has_attachment: event.has_attachment,
      has_mention: event.has_mention,
      has_emoji: event.has_emoji,
      is_thread: event.is_thread,
    });
    this.incrementSessionEvents();
  }

  async trackMessageEdited(channelId: string): Promise<void> {
    await this.logEvent(StandardEvents.MESSAGE_EDITED, {
      channel_id: channelId,
    });
  }

  async trackMessageDeleted(channelId: string): Promise<void> {
    await this.logEvent(StandardEvents.MESSAGE_DELETED, {
      channel_id: channelId,
    });
  }

  async trackReactionAdded(emoji: string, messageId: string): Promise<void> {
    await this.logEvent(StandardEvents.REACTION_ADDED, {
      emoji,
      message_id: messageId,
    });
  }

  async trackThreadCreated(
    channelId: string,
    messageId: string,
  ): Promise<void> {
    await this.logEvent(StandardEvents.THREAD_CREATED, {
      channel_id: channelId,
      message_id: messageId,
    });
  }

  async trackThreadReplied(channelId: string, threadId: string): Promise<void> {
    await this.logEvent(StandardEvents.THREAD_REPLIED, {
      channel_id: channelId,
      thread_id: threadId,
    });
  }

  /**
   * Track channel events
   */
  async trackChannelCreated(event: ChannelEvent): Promise<void> {
    await this.logEvent(StandardEvents.CHANNEL_CREATED, {
      channel_id: event.channel_id,
      channel_type: event.channel_type,
      is_default: event.is_default,
    });
  }

  async trackChannelJoined(event: ChannelEvent): Promise<void> {
    await this.logEvent(StandardEvents.CHANNEL_JOINED, {
      channel_id: event.channel_id,
      channel_type: event.channel_type,
      member_count: event.member_count,
    });
  }

  async trackChannelLeft(channelId: string): Promise<void> {
    await this.logEvent(StandardEvents.CHANNEL_LEFT, { channel_id: channelId });
  }

  async trackChannelArchived(channelId: string): Promise<void> {
    await this.logEvent(StandardEvents.CHANNEL_ARCHIVED, {
      channel_id: channelId,
    });
  }

  /**
   * Track file events
   */
  async trackFileUploaded(event: FileEvent): Promise<void> {
    await this.logEvent(StandardEvents.FILE_UPLOADED, {
      file_type: event.file_type,
      file_size: event.file_size,
      upload_duration_ms: event.upload_duration_ms,
      channel_id: event.channel_id,
    });
  }

  async trackFileDownloaded(fileType: string, fileSize: number): Promise<void> {
    await this.logEvent(StandardEvents.FILE_DOWNLOADED, {
      file_type: fileType,
      file_size: fileSize,
    });
  }

  async trackFileShared(fileType: string): Promise<void> {
    await this.logEvent(StandardEvents.FILE_SHARED, { file_type: fileType });
  }

  /**
   * Track call events
   */
  async trackCallStarted(event: CallEvent): Promise<void> {
    await this.logEvent(StandardEvents.CALL_STARTED, {
      call_type: event.call_type,
      participant_count: event.participant_count,
    });
  }

  async trackCallJoined(callType: string): Promise<void> {
    await this.logEvent(StandardEvents.CALL_JOINED, { call_type: callType });
  }

  async trackCallEnded(event: CallEvent): Promise<void> {
    await this.logEvent(StandardEvents.CALL_ENDED, {
      call_type: event.call_type,
      duration_seconds: event.duration_seconds,
      ended_reason: event.ended_reason,
    });
  }

  async trackCallFailed(callType: string, reason: string): Promise<void> {
    await this.logEvent(StandardEvents.CALL_FAILED, {
      call_type: callType,
      reason,
    });
  }

  /**
   * Track search events
   */
  async trackSearch(event: SearchEvent): Promise<void> {
    await this.logEvent(StandardEvents.SEARCH_PERFORMED, {
      search_term: event.search_term,
      search_type: event.search_type,
      results_count: event.results_count,
      filter_count: event.filter_count,
      time_taken_ms: event.time_taken_ms,
    });
  }

  async trackSearchResultClicked(
    resultId: string,
    position: number,
  ): Promise<void> {
    await this.logEvent(StandardEvents.SEARCH_RESULT_CLICKED, {
      result_id: resultId,
      position,
    });
  }

  async trackAdvancedSearchUsed(filterCount: number): Promise<void> {
    await this.logEvent(StandardEvents.ADVANCED_SEARCH_USED, {
      filter_count: filterCount,
    });
  }

  /**
   * Track settings events
   */
  async trackSettingsChanged(setting: string, value: string): Promise<void> {
    await this.logEvent(StandardEvents.SETTINGS_CHANGED, {
      setting,
      value,
    });
  }

  async trackThemeChanged(theme: string, mode: string): Promise<void> {
    await this.logEvent(StandardEvents.THEME_CHANGED, {
      theme,
      mode,
    });
  }

  async trackNotificationSettingsChanged(enabled: boolean): Promise<void> {
    await this.logEvent(StandardEvents.NOTIFICATION_SETTINGS_CHANGED, {
      enabled,
    });
  }

  /**
   * Track performance events
   */
  async trackScreenLoadTime(
    screenName: string,
    durationMs: number,
  ): Promise<void> {
    await this.logEvent(StandardEvents.SCREEN_LOAD_TIME, {
      screen_name: screenName,
      duration_ms: durationMs,
    });

    // Also track in Sentry for performance monitoring
    if (sentryMobile.isInitialized()) {
      await sentryMobile.addBreadcrumb(
        "performance",
        `Screen loaded: ${screenName}`,
        {
          duration_ms: durationMs,
        },
      );
    }
  }

  async trackApiCall(
    endpoint: string,
    method: string,
    durationMs: number,
    status: number,
  ): Promise<void> {
    await this.logEvent(StandardEvents.API_CALL, {
      endpoint,
      method,
      duration_ms: durationMs,
      status,
    });
  }

  async trackApiError(endpoint: string, error: string): Promise<void> {
    await this.logEvent(StandardEvents.API_ERROR, {
      endpoint,
      error,
    });
  }

  async trackPerformance(event: PerformanceEvent): Promise<void> {
    await this.logEvent("performance_metric", {
      metric_name: event.metric_name,
      duration_ms: event.duration_ms,
      success: event.success,
      error_message: event.error_message,
    });
  }

  /**
   * Track errors
   */
  async trackError(event: ErrorEvent): Promise<void> {
    await this.logEvent(StandardEvents.ERROR_OCCURRED, {
      error_type: event.error_type,
      error_message: event.error_message,
      fatal: event.fatal,
      context: event.context,
    });

    // Also send to Sentry
    if (sentryMobile.isInitialized()) {
      const error = new Error(event.error_message);
      error.name = event.error_type;
      if (event.error_stack) {
        error.stack = event.error_stack;
      }

      await sentryMobile.captureError(error, {
        level: event.fatal ? "fatal" : "error",
        tags: {
          error_type: event.error_type,
          context: event.context || "",
        },
      });
    }

    this.incrementSessionErrors();
  }

  /**
   * Track screen views
   */
  async trackScreenView(
    screenName: string,
    screenClass?: string,
  ): Promise<void> {
    await firebaseAnalytics.logScreenView(screenName, screenClass);
    this.incrementSessionScreenViews();

    // Add breadcrumb to Sentry
    if (sentryMobile.isInitialized()) {
      await sentryMobile.addBreadcrumb(
        "navigation",
        `Screen viewed: ${screenName}`,
        {
          screen_class: screenClass,
        },
      );
    }
  }

  /**
   * Set user properties
   */
  async setUserProperties(properties: Partial<UserProperties>): Promise<void> {
    await firebaseAnalytics.setUserProperties(properties);
    await sentryMobile.setUser(properties as any);
  }

  /**
   * Set user ID
   */
  async setUserId(userId: string | null): Promise<void> {
    await firebaseAnalytics.setUserId(userId);

    if (userId) {
      await sentryMobile.setUser({ userId } as any);
    } else {
      await sentryMobile.setUser(null);
    }
  }

  /**
   * Generic event logging
   */
  private async logEvent(
    eventName: StandardEvents | string,
    params?: EventParams,
  ): Promise<void> {
    if (!this.config?.enabled) return;

    try {
      // Log to Firebase
      if (firebaseAnalytics.isInitialized()) {
        await firebaseAnalytics.logEvent(eventName as any, params);
      }

      // Add breadcrumb to Sentry
      if (sentryMobile.isInitialized()) {
        await sentryMobile.addBreadcrumb("event", eventName, params as any);
      }

      if (this.config?.debugMode) {
        // REMOVED: console.log('[Analytics] Event logged:', eventName, params)
      }
    } catch (error) {
      logger.error(
        "Failed to log event",
        error instanceof Error ? error : new Error(String(error)),
        { eventName },
      );
    }
  }

  /**
   * Session tracking
   */
  private startSession(): void {
    this.sessionStartTime = Date.now();
    this.sessionData = {
      sessionId: this.generateSessionId(),
      startTime: this.sessionStartTime,
      lastActivityTime: this.sessionStartTime,
      screenViews: 0,
      events: 0,
      errors: 0,
    };

    if (this.config?.debugMode) {
      // REMOVED: console.log('[Analytics] Session started:', this.sessionData.sessionId)
    }
  }

  private pauseSession(): void {
    if (this.sessionData) {
      this.sessionData.lastActivityTime = Date.now();
    }
  }

  private resumeSession(): void {
    if (this.sessionData) {
      this.sessionData.lastActivityTime = Date.now();
    }
  }

  private endSession(): void {
    if (!this.sessionData) return;

    const duration = Date.now() - this.sessionData.startTime;

    this.logEvent(StandardEvents.SESSION_END, {
      duration_seconds: Math.floor(duration / 1000),
      screen_views: this.sessionData.screenViews,
      events: this.sessionData.events,
      errors: this.sessionData.errors,
    });

    this.sessionData = null;
  }

  private incrementSessionScreenViews(): void {
    if (this.sessionData) {
      this.sessionData.screenViews++;
      this.sessionData.lastActivityTime = Date.now();
    }
  }

  private incrementSessionEvents(): void {
    if (this.sessionData) {
      this.sessionData.events++;
      this.sessionData.lastActivityTime = Date.now();
    }
  }

  private incrementSessionErrors(): void {
    if (this.sessionData) {
      this.sessionData.errors++;
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current session data
   */
  getSessionData(): SessionData | null {
    return this.sessionData;
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.config?.enabled ?? false;
  }

  /**
   * Get platform
   */
  getPlatform(): string {
    return firebaseAnalytics.getPlatform();
  }
}

// Singleton instance
export const analytics = new AnalyticsEvents();

// Export convenience functions
export const trackAppOpen = () => analytics.trackAppOpen();
export const trackAppBackground = () => analytics.trackAppBackground();
export const trackAppForeground = () => analytics.trackAppForeground();
export const trackLogin = (method: string, userId: string) =>
  analytics.trackLogin(method, userId);
export const trackLogout = () => analytics.trackLogout();
export const trackSignup = (method: string, userId: string) =>
  analytics.trackSignup(method, userId);
export const trackMessageSent = (event: MessageSentEvent) =>
  analytics.trackMessageSent(event);
export const trackChannelCreated = (event: ChannelEvent) =>
  analytics.trackChannelCreated(event);
export const trackSearch = (event: SearchEvent) => analytics.trackSearch(event);
export const trackScreenView = (screenName: string, screenClass?: string) =>
  analytics.trackScreenView(screenName, screenClass);
export const trackError = (event: ErrorEvent) => analytics.trackError(event);
export const setUserProperties = (properties: Partial<UserProperties>) =>
  analytics.setUserProperties(properties);
