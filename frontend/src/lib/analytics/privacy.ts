/**
 * Analytics Privacy Controls
 *
 * GDPR-compliant privacy controls for analytics and tracking
 */

import type { ConsentStatus, PrivacySettings } from "./types";
import { firebaseAnalytics } from "./firebase";
import { sentryMobile } from "./sentry-mobile";

import { logger } from "@/lib/logger";

const STORAGE_KEY = "analytics-consent";
const PRIVACY_SETTINGS_KEY = "analytics-privacy-settings";

class AnalyticsPrivacy {
  /**
   * Get current consent status
   */
  getConsent(): ConsentStatus {
    if (typeof window === "undefined") {
      return this.getDefaultConsent();
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return this.getDefaultConsent();
      }

      const consent = JSON.parse(stored) as ConsentStatus;
      return consent;
    } catch (error) {
      logger.error("Failed to get consent:", error);
      return this.getDefaultConsent();
    }
  }

  /**
   * Get default consent (all denied for GDPR compliance)
   */
  private getDefaultConsent(): ConsentStatus {
    return {
      analytics: false,
      performance: false,
      errorTracking: false,
      crashReporting: false,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Set consent status
   */
  async setConsent(consent: Partial<ConsentStatus>): Promise<void> {
    if (typeof window === "undefined") return;

    const current = this.getConsent();
    const updated: ConsentStatus = {
      ...current,
      ...consent,
      updatedAt: new Date().toISOString(),
    };

    try {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Update Firebase Analytics
      await firebaseAnalytics.setConsent({
        analytics: updated.analytics,
        performance: updated.performance,
      });

      // Update Sentry
      if (!updated.errorTracking && !updated.crashReporting) {
        await sentryMobile.close();
      }

      // REMOVED: console.log('Consent updated:', updated)
    } catch (error) {
      logger.error("Failed to set consent:", error);
      throw error;
    }
  }

  /**
   * Accept all analytics
   */
  async acceptAll(): Promise<void> {
    await this.setConsent({
      analytics: true,
      performance: true,
      errorTracking: true,
      crashReporting: true,
    });
  }

  /**
   * Reject all analytics
   */
  async rejectAll(): Promise<void> {
    await this.setConsent({
      analytics: false,
      performance: false,
      errorTracking: false,
      crashReporting: false,
    });
  }

  /**
   * Check if user has provided consent choice
   */
  hasProvidedConsent(): boolean {
    if (typeof window === "undefined") return false;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get privacy settings
   */
  getPrivacySettings(): PrivacySettings {
    if (typeof window === "undefined") {
      return this.getDefaultPrivacySettings();
    }

    try {
      const stored = localStorage.getItem(PRIVACY_SETTINGS_KEY);
      if (!stored) {
        return this.getDefaultPrivacySettings();
      }

      return JSON.parse(stored) as PrivacySettings;
    } catch (error) {
      logger.error("Failed to get privacy settings:", error);
      return this.getDefaultPrivacySettings();
    }
  }

  /**
   * Get default privacy settings
   */
  private getDefaultPrivacySettings(): PrivacySettings {
    return {
      optOutAnalytics: true,
      optOutPerformance: true,
      optOutErrorTracking: true,
      optOutCrashReporting: true,
      anonymizeIp: true,
      anonymizeUserId: false,
    };
  }

  /**
   * Update privacy settings
   */
  async setPrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
    if (typeof window === "undefined") return;

    const current = this.getPrivacySettings();
    const updated: PrivacySettings = {
      ...current,
      ...settings,
    };

    try {
      localStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(updated));

      // Update consent based on opt-out settings
      await this.setConsent({
        analytics: !updated.optOutAnalytics,
        performance: !updated.optOutPerformance,
        errorTracking: !updated.optOutErrorTracking,
        crashReporting: !updated.optOutCrashReporting,
      });

      // REMOVED: console.log('Privacy settings updated:', updated)
    } catch (error) {
      logger.error("Failed to update privacy settings:", error);
      throw error;
    }
  }

  /**
   * Clear all analytics data
   */
  async clearAllData(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PRIVACY_SETTINGS_KEY);

      // Reset Firebase Analytics
      await firebaseAnalytics.reset();

      // Clear Sentry
      await sentryMobile.setUser(null);

      // REMOVED: console.log('All analytics data cleared')
    } catch (error) {
      logger.error("Failed to clear analytics data:", error);
      throw error;
    }
  }

  /**
   * Export user data (GDPR right to data portability)
   */
  async exportUserData(): Promise<any> {
    const consent = this.getConsent();
    const settings = this.getPrivacySettings();

    return {
      consent,
      settings,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if analytics should be enabled
   */
  shouldEnableAnalytics(): boolean {
    const consent = this.getConsent();
    return consent.analytics;
  }

  /**
   * Check if performance monitoring should be enabled
   */
  shouldEnablePerformance(): boolean {
    const consent = this.getConsent();
    return consent.performance;
  }

  /**
   * Check if error tracking should be enabled
   */
  shouldEnableErrorTracking(): boolean {
    const consent = this.getConsent();
    return consent.errorTracking;
  }

  /**
   * Check if crash reporting should be enabled
   */
  shouldEnableCrashReporting(): boolean {
    const consent = this.getConsent();
    return consent.crashReporting;
  }

  /**
   * Anonymize user ID for privacy
   */
  anonymizeUserId(userId: string): string {
    const settings = this.getPrivacySettings();

    if (!settings.anonymizeUserId) {
      return userId;
    }

    // Create a hash of the user ID
    return this.hashString(userId);
  }

  /**
   * Simple hash function for anonymization
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `anon_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get consent banner message (GDPR compliant)
   */
  getConsentBannerMessage(): string {
    return `We use analytics to improve your experience. We collect:

• Usage data (features you use, screens you visit)
• Performance data (app speed, errors)
• Device information (platform, OS version)
• Crash reports (to fix bugs)

We do NOT collect:
• Your messages or personal content
• Passwords or authentication tokens
• Your files or attachments
• Any personally identifiable information without consent

You can change these settings at any time in Privacy Settings.`;
  }

  /**
   * Get privacy policy summary
   */
  getPrivacyPolicySummary(): {
    whatWeCollect: string[];
    whatWeDontCollect: string[];
    howWeUseIt: string[];
    yourRights: string[];
  } {
    return {
      whatWeCollect: [
        "App usage patterns (features used, screens visited)",
        "Performance metrics (load times, API response times)",
        "Error and crash reports",
        "Device information (platform, OS version, model)",
        "Session duration and frequency",
      ],
      whatWeDontCollect: [
        "Message content",
        "File attachments",
        "Passwords or authentication tokens",
        "Personal messages or private conversations",
        "Contact lists or address books",
      ],
      howWeUseIt: [
        "Improve app performance and stability",
        "Identify and fix bugs",
        "Understand feature usage",
        "Optimize user experience",
        "Prioritize development efforts",
      ],
      yourRights: [
        "Opt out of analytics at any time",
        "Request data export (GDPR)",
        "Request data deletion",
        "Modify consent preferences",
        "Disable specific tracking types",
      ],
    };
  }
}

// Singleton instance
export const analyticsPrivacy = new AnalyticsPrivacy();

// Export convenience functions
export const getConsent = () => analyticsPrivacy.getConsent();
export const setConsent = (consent: Partial<ConsentStatus>) =>
  analyticsPrivacy.setConsent(consent);
export const acceptAllAnalytics = () => analyticsPrivacy.acceptAll();
export const rejectAllAnalytics = () => analyticsPrivacy.rejectAll();
export const hasProvidedConsent = () => analyticsPrivacy.hasProvidedConsent();
export const clearAllAnalyticsData = () => analyticsPrivacy.clearAllData();
export const shouldEnableAnalytics = () =>
  analyticsPrivacy.shouldEnableAnalytics();
