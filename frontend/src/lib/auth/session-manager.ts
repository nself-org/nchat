/**
 * Session Manager - Complete session management with security features
 *
 * Features:
 * - Session creation with device fingerprinting
 * - Session timeout and idle detection
 * - Max concurrent sessions enforcement
 * - Suspicious activity detection
 * - Session notifications
 * - Geographic anomaly detection
 * - Device verification
 */

import { parseUserAgent } from "@/lib/security/session-store";
import type { Session, SessionLocation } from "@/lib/security/session-store";

// ============================================================================
// Types
// ============================================================================

export interface SessionConfig {
  // Timeouts
  sessionTimeout: number; // minutes until forced logout
  idleTimeout: number; // minutes of inactivity until logout
  rememberMeDuration: number; // days to keep session alive

  // Limits
  maxConcurrentSessions: number;
  maxSessionsPerDevice: number;

  // Security
  requireDeviceVerification: boolean;
  detectSuspiciousActivity: boolean;
  detectGeoAnomaly: boolean;
  notifyNewLogin: boolean;
  notifyNewDevice: boolean;
  notifySuspiciousActivity: boolean;

  // Thresholds
  suspiciousActivityThreshold: number; // score 0-100
  geoAnomalyDistanceKm: number; // distance to trigger anomaly alert
}

export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cpuCores: number;
  deviceMemory?: number;
  touchSupport: boolean;
  webGLRenderer?: string;
  hash: string;
}

export interface SessionCreateOptions {
  userId: string;
  rememberMe?: boolean;
  deviceFingerprint?: DeviceFingerprint;
  location?: SessionLocation;
  ipAddress: string;
}

export interface SessionValidationResult {
  valid: boolean;
  reason?: "expired" | "timeout" | "idle" | "revoked" | "suspicious";
  requiresAction?: "verify-device" | "verify-location" | "change-password";
}

export interface SuspiciousActivityResult {
  suspicious: boolean;
  score: number; // 0-100
  reasons: string[];
  severity: "low" | "medium" | "high" | "critical";
}

export interface SessionNotification {
  id: string;
  type:
    | "new-login"
    | "new-device"
    | "suspicious-activity"
    | "session-revoked"
    | "geo-anomaly";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  session: Partial<Session>;
  timestamp: string;
  read: boolean;
  actionRequired?: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  // Timeouts
  sessionTimeout: 480, // 8 hours
  idleTimeout: 30, // 30 minutes
  rememberMeDuration: 30, // 30 days

  // Limits
  maxConcurrentSessions: 10,
  maxSessionsPerDevice: 3,

  // Security
  requireDeviceVerification: false,
  detectSuspiciousActivity: true,
  detectGeoAnomaly: true,
  notifyNewLogin: true,
  notifyNewDevice: true,
  notifySuspiciousActivity: true,

  // Thresholds
  suspiciousActivityThreshold: 70,
  geoAnomalyDistanceKm: 500, // 500km
};

// ============================================================================
// Session Manager Class
// ============================================================================

export class SessionManager {
  private config: SessionConfig;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };
  }

  // ============================================================================
  // Session Creation
  // ============================================================================

  /**
   * Create a new session
   */
  async createSession(options: SessionCreateOptions): Promise<Session> {
    const { userId, rememberMe, deviceFingerprint, location, ipAddress } =
      options;

    // Parse user agent
    const deviceInfo = deviceFingerprint
      ? parseUserAgent(deviceFingerprint.userAgent)
      : { device: "Unknown", browser: "Unknown", os: "Unknown" };

    // Calculate expiration
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() +
        (rememberMe
          ? this.config.rememberMeDuration * 24 * 60 * 60 * 1000
          : this.config.sessionTimeout * 60 * 1000),
    );

    const session: Session = {
      id: this.generateSessionId(),
      userId,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ipAddress,
      location,
      isCurrent: true,
      createdAt: now.toISOString(),
      lastActiveAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    return session;
  }

  /**
   * Generate device fingerprint on client
   */
  async generateDeviceFingerprint(): Promise<DeviceFingerprint> {
    if (typeof window === "undefined") {
      throw new Error("Device fingerprinting only available in browser");
    }

    const nav = window.navigator;
    const screen = window.screen;

    // Get WebGL renderer
    let webGLRenderer: string | undefined;
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl && "getParameter" in gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension(
          "WEBGL_debug_renderer_info",
        );
        if (debugInfo) {
          webGLRenderer = (gl as WebGLRenderingContext).getParameter(
            debugInfo.UNMASKED_RENDERER_WEBGL,
          );
        }
      }
    } catch {
      // Silently fail
    }

    const fingerprint: DeviceFingerprint = {
      userAgent: nav.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: nav.language,
      platform: nav.platform,
      cpuCores: nav.hardwareConcurrency || 0,
      deviceMemory: (nav as any).deviceMemory,
      touchSupport: "ontouchstart" in window || nav.maxTouchPoints > 0,
      webGLRenderer,
      hash: "",
    };

    // Generate hash
    fingerprint.hash = await this.hashFingerprint(fingerprint);

    return fingerprint;
  }

  /**
   * Hash fingerprint data
   */
  private async hashFingerprint(
    fingerprint: Omit<DeviceFingerprint, "hash">,
  ): Promise<string> {
    const data = JSON.stringify({
      ua: fingerprint.userAgent,
      sr: fingerprint.screenResolution,
      tz: fingerprint.timezone,
      lang: fingerprint.language,
      platform: fingerprint.platform,
      cpu: fingerprint.cpuCores,
      mem: fingerprint.deviceMemory,
      touch: fingerprint.touchSupport,
      webgl: fingerprint.webGLRenderer,
    });

    if (typeof crypto !== "undefined" && crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    // Fallback simple hash for non-crypto environments
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // ============================================================================
  // Session Validation
  // ============================================================================

  /**
   * Validate session is still active and secure
   */
  validateSession(session: Session): SessionValidationResult {
    const now = new Date();

    // Check if expired
    const expiresAt = new Date(session.expiresAt);
    if (now > expiresAt) {
      return { valid: false, reason: "expired" };
    }

    // Check if idle timeout exceeded
    const lastActive = new Date(session.lastActiveAt);
    const idleMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60);
    if (idleMinutes > this.config.idleTimeout) {
      return { valid: false, reason: "idle" };
    }

    // Check session timeout
    const createdAt = new Date(session.createdAt);
    const sessionMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    if (sessionMinutes > this.config.sessionTimeout) {
      return { valid: false, reason: "timeout" };
    }

    return { valid: true };
  }

  /**
   * Check if session needs refresh
   */
  shouldRefreshSession(session: Session): boolean {
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const fiveMinutes = 5 * 60 * 1000;

    return timeUntilExpiry < fiveMinutes;
  }

  /**
   * Update session activity timestamp
   */
  updateActivity(session: Session): Session {
    return {
      ...session,
      lastActiveAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // Suspicious Activity Detection
  // ============================================================================

  /**
   * Detect suspicious activity based on session patterns
   */
  detectSuspiciousActivity(
    session: Session,
    previousSessions: Session[],
  ): SuspiciousActivityResult {
    if (!this.config.detectSuspiciousActivity) {
      return { suspicious: false, score: 0, reasons: [], severity: "low" };
    }

    const reasons: string[] = [];
    let score = 0;

    // Check for rapid location changes
    const recentSessions = previousSessions
      .filter((s) => {
        const age = Date.now() - new Date(s.createdAt).getTime();
        return age < 24 * 60 * 60 * 1000; // last 24 hours
      })
      .slice(0, 5);

    if (recentSessions.length > 0 && session.location) {
      const lastLocation = recentSessions[0]?.location;
      if (lastLocation && lastLocation.country !== session.location.country) {
        const timeDiff =
          new Date(session.createdAt).getTime() -
          new Date(recentSessions[0].createdAt).getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // Suspicious if country changed in less than 6 hours
        if (hoursDiff < 6) {
          reasons.push("Rapid location change detected");
          score += 40;
        }
      }
    }

    // Check for unusual device
    const knownDevices = new Set(
      previousSessions.map((s) => `${s.device}-${s.browser}-${s.os}`),
    );
    const currentDevice = `${session.device}-${session.browser}-${session.os}`;
    if (!knownDevices.has(currentDevice)) {
      reasons.push("New device detected");
      score += 20;
    }

    // Check for unusual time (3am - 6am)
    const hour = new Date(session.createdAt).getHours();
    if (hour >= 3 && hour < 6) {
      const usualHours = previousSessions.map((s) =>
        new Date(s.createdAt).getHours(),
      );
      const nightLogins = usualHours.filter((h) => h >= 3 && h < 6).length;
      if (nightLogins < previousSessions.length * 0.1) {
        // Less than 10% of previous logins at this time
        reasons.push("Unusual login time");
        score += 15;
      }
    }

    // Check for unusual browser/OS combination
    const browserOsCombos = new Set(
      previousSessions.map((s) => `${s.browser}-${s.os}`),
    );
    const currentCombo = `${session.browser}-${session.os}`;
    if (previousSessions.length > 3 && !browserOsCombos.has(currentCombo)) {
      reasons.push("Unusual browser/OS combination");
      score += 15;
    }

    // Check for multiple rapid login attempts
    const recentLogins = previousSessions.filter((s) => {
      const age = Date.now() - new Date(s.createdAt).getTime();
      return age < 60 * 60 * 1000; // last hour
    });
    if (recentLogins.length > 3) {
      reasons.push("Multiple login attempts detected");
      score += 30;
    }

    // Determine severity
    let severity: "low" | "medium" | "high" | "critical";
    if (score >= 80) severity = "critical";
    else if (score >= 60) severity = "high";
    else if (score >= 40) severity = "medium";
    else severity = "low";

    const suspicious = score >= this.config.suspiciousActivityThreshold;

    return {
      suspicious,
      score,
      reasons,
      severity,
    };
  }

  /**
   * Detect geographic anomalies
   */
  detectGeoAnomaly(session: Session, previousSessions: Session[]): boolean {
    if (!this.config.detectGeoAnomaly || !session.location) {
      return false;
    }

    const recentSession = previousSessions[0];
    if (!recentSession?.location) return false;

    // Check if countries are different
    if (session.location.country !== recentSession.location.country) {
      const timeDiff =
        new Date(session.createdAt).getTime() -
        new Date(recentSession.createdAt).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Anomaly if countries changed in less than 12 hours
      return hoursDiff < 12;
    }

    return false;
  }

  // ============================================================================
  // Session Notifications
  // ============================================================================

  /**
   * Create notification for new login
   */
  createNewLoginNotification(session: Session): SessionNotification {
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      read: false,
      type: "new-login",
      severity: "info",
      title: "New Login Detected",
      message: `New login from ${session.browser} on ${session.os} in ${
        session.location?.city || "Unknown location"
      }`,
      session,
      timestamp: new Date().toISOString(),
      actionRequired: false,
    };
  }

  /**
   * Create notification for new device
   */
  createNewDeviceNotification(session: Session): SessionNotification {
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      read: false,
      type: "new-device",
      severity: "warning",
      title: "New Device Detected",
      message: `Login from unrecognized device: ${session.device} (${session.browser} on ${session.os})`,
      session,
      timestamp: new Date().toISOString(),
      actionRequired: this.config.requireDeviceVerification,
    };
  }

  /**
   * Create notification for suspicious activity
   */
  createSuspiciousActivityNotification(
    session: Session,
    analysis: SuspiciousActivityResult,
  ): SessionNotification {
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      read: false,
      type: "suspicious-activity",
      severity:
        analysis.severity === "critical" || analysis.severity === "high"
          ? "critical"
          : "warning",
      title: "Suspicious Activity Detected",
      message: `Suspicious login detected: ${analysis.reasons.join(", ")}`,
      session,
      timestamp: new Date().toISOString(),
      actionRequired: analysis.severity === "critical",
    };
  }

  /**
   * Create notification for geo anomaly
   */
  createGeoAnomalyNotification(
    session: Session,
    previousLocation: string,
  ): SessionNotification {
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      read: false,
      type: "geo-anomaly",
      severity: "warning",
      title: "Unusual Location Detected",
      message: `Login from ${session.location?.country || "unknown location"} detected. Previous location was ${previousLocation}.`,
      session,
      timestamp: new Date().toISOString(),
      actionRequired: true,
    };
  }

  // ============================================================================
  // Session Enforcement
  // ============================================================================

  /**
   * Check if user has exceeded max concurrent sessions
   */
  hasExceededMaxSessions(sessions: Session[]): boolean {
    const activeSessions = sessions.filter(
      (s) => this.validateSession(s).valid,
    );
    return activeSessions.length >= this.config.maxConcurrentSessions;
  }

  /**
   * Get oldest session to revoke
   */
  getOldestSession(sessions: Session[]): Session | null {
    if (sessions.length === 0) return null;

    return sessions.reduce((oldest, session) => {
      return new Date(session.createdAt) < new Date(oldest.createdAt)
        ? session
        : oldest;
    });
  }

  /**
   * Get sessions that should be automatically revoked
   */
  getSessionsToAutoRevoke(sessions: Session[]): Session[] {
    return sessions.filter((session) => {
      const validation = this.validateSession(session);
      return !validation.valid;
    });
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `sess_${timestamp}_${randomPart}`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SessionConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const sessionManager = new SessionManager();
