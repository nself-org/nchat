/**
 * Unified Session Service
 *
 * Provides a unified session management interface across web, mobile, and desktop platforms.
 * Implements comprehensive session lifecycle management with anti-session-fixation measures.
 *
 * Features:
 * - Cross-platform session consistency
 * - Session creation with device fingerprinting
 * - Token refresh with session ID rotation (anti-session-fixation)
 * - Session revocation and device listing
 * - Suspicious activity detection
 * - Platform-specific optimizations
 *
 * @module lib/auth/unified-session.service
 */

import {
  sessionManager,
  type SessionConfig,
  type DeviceFingerprint,
} from "./session-manager";
import {
  parseUserAgent,
  type Session,
  type SessionLocation,
} from "@/lib/security/session-store";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type PlatformType = "web" | "ios" | "android" | "electron" | "tauri";

export interface UnifiedSessionConfig extends Partial<SessionConfig> {
  platform: PlatformType;
  enableAntiSessionFixation: boolean;
  enableDeviceVerification: boolean;
  sessionIdRotationInterval: number; // minutes
  persistAcrossRestarts: boolean;
}

export interface SessionCreationResult {
  session: Session;
  accessToken: string;
  refreshToken: string;
  requiresVerification: boolean;
  suspiciousActivity: {
    detected: boolean;
    score: number;
    reasons: string[];
  } | null;
}

export interface SessionRefreshResult {
  success: boolean;
  newSessionId?: string;
  accessToken?: string;
  refreshToken?: string;
  rotated: boolean;
  error?: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: "mobile" | "tablet" | "desktop";
  platform: PlatformType;
  browser?: string;
  os: string;
  lastActive: string;
  isCurrent: boolean;
  ipAddress?: string;
  location?: SessionLocation;
  trusted: boolean;
}

export interface SessionRevocationResult {
  success: boolean;
  revokedCount: number;
  error?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_UNIFIED_CONFIG: UnifiedSessionConfig = {
  platform: "web",
  enableAntiSessionFixation: true,
  enableDeviceVerification: true,
  sessionIdRotationInterval: 60, // Rotate session ID every 60 minutes
  persistAcrossRestarts: true,
  sessionTimeout: 480, // 8 hours
  idleTimeout: 30, // 30 minutes
  rememberMeDuration: 30, // 30 days
  maxConcurrentSessions: 10,
  maxSessionsPerDevice: 3,
  detectSuspiciousActivity: true,
  detectGeoAnomaly: true,
  notifyNewLogin: true,
  notifyNewDevice: true,
};

// ============================================================================
// Unified Session Service Class
// ============================================================================

export class UnifiedSessionService {
  private config: UnifiedSessionConfig;
  private currentSessionId: string | null = null;
  private lastSessionIdRotation: number = Date.now();
  private sessionRotationTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<UnifiedSessionConfig> = {}) {
    this.config = { ...DEFAULT_UNIFIED_CONFIG, ...config };
    sessionManager.updateConfig(this.config);

    // Set up automatic session ID rotation for anti-session-fixation
    if (
      this.config.enableAntiSessionFixation &&
      typeof window !== "undefined"
    ) {
      this.setupSessionRotation();
    }
  }

  // ============================================================================
  // Session Creation
  // ============================================================================

  /**
   * Create a new session with anti-session-fixation measures
   *
   * Anti-session-fixation: Always generates a new session ID on login,
   * never reuses pre-authentication session IDs.
   */
  async createSession(
    userId: string,
    options: {
      rememberMe?: boolean;
      ipAddress: string;
      userAgent?: string;
      deviceFingerprint?: DeviceFingerprint;
      previousSessions?: Session[];
    },
  ): Promise<SessionCreationResult> {
    const {
      rememberMe,
      ipAddress,
      userAgent,
      deviceFingerprint,
      previousSessions = [],
    } = options;

    try {
      // ANTI-SESSION-FIXATION: Always invalidate any existing session first
      if (this.currentSessionId) {
        await this.invalidateSession(this.currentSessionId);
        this.currentSessionId = null;
      }

      // Get device info
      const deviceInfo = userAgent
        ? parseUserAgent(userAgent)
        : { device: "Unknown", browser: "Unknown", os: "Unknown" };

      // Get location (would be done server-side in production)
      let location: SessionLocation | undefined;
      if (typeof window !== "undefined" && ipAddress) {
        location = await this.getLocationFromIP(ipAddress);
      }

      // Create new session with fresh session ID (anti-session-fixation)
      const session = await sessionManager.createSession({
        userId,
        rememberMe,
        deviceFingerprint,
        location,
        ipAddress,
      });

      // Store the new session ID
      this.currentSessionId = session.id;
      this.lastSessionIdRotation = Date.now();

      // Check for suspicious activity
      let suspiciousActivity = null;
      if (previousSessions.length > 0) {
        const analysis = sessionManager.detectSuspiciousActivity(
          session,
          previousSessions,
        );
        if (analysis.suspicious) {
          suspiciousActivity = {
            detected: true,
            score: analysis.score,
            reasons: analysis.reasons,
          };
        }
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(session);
      const refreshToken = this.generateRefreshToken(session);

      // Persist session based on platform
      await this.persistSession(session, accessToken, refreshToken);

      // Determine if verification is required
      const requiresVerification =
        this.config.enableDeviceVerification &&
        !this.isKnownDevice(deviceInfo, previousSessions);

      return {
        session,
        accessToken,
        refreshToken,
        requiresVerification,
        suspiciousActivity,
      };
    } catch (error) {
      logger.error("Failed to create unified session:", {
        context: String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // Session Refresh with ID Rotation
  // ============================================================================

  /**
   * Refresh session with optional session ID rotation (anti-session-fixation)
   *
   * Rotates session ID periodically to prevent session fixation attacks
   * even after successful authentication.
   */
  async refreshSession(
    currentSession: Session,
    forceRotation: boolean = false,
  ): Promise<SessionRefreshResult> {
    try {
      // Check if session is valid
      const validation = sessionManager.validateSession(currentSession);
      if (!validation.valid) {
        return {
          success: false,
          rotated: false,
          error: `Session invalid: ${validation.reason}`,
        };
      }

      // Determine if we need to rotate session ID
      const shouldRotate = forceRotation || this.shouldRotateSessionId();

      if (shouldRotate && this.config.enableAntiSessionFixation) {
        // ANTI-SESSION-FIXATION: Generate new session ID
        const newSession = await this.rotateSessionId(currentSession);

        const accessToken = this.generateAccessToken(newSession);
        const refreshToken = this.generateRefreshToken(newSession);

        await this.persistSession(newSession, accessToken, refreshToken);

        return {
          success: true,
          newSessionId: newSession.id,
          accessToken,
          refreshToken,
          rotated: true,
        };
      } else {
        // Just refresh tokens without rotating session ID
        const updatedSession = sessionManager.updateActivity(currentSession);
        const accessToken = this.generateAccessToken(updatedSession);
        const refreshToken = this.generateRefreshToken(updatedSession);

        await this.persistSession(updatedSession, accessToken, refreshToken);

        return {
          success: true,
          accessToken,
          refreshToken,
          rotated: false,
        };
      }
    } catch (error) {
      logger.error("Failed to refresh session:", { context: String(error) });
      return {
        success: false,
        rotated: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Rotate session ID to prevent session fixation
   */
  private async rotateSessionId(currentSession: Session): Promise<Session> {
    // Create new session with new ID but same user data
    const newSession: Session = {
      ...currentSession,
      id: this.generateNewSessionId(),
      createdAt: currentSession.createdAt, // Preserve original creation time
      lastActiveAt: new Date().toISOString(),
    };

    // Invalidate old session ID (server-side this would be a database update)
    await this.invalidateSession(currentSession.id);

    // Update tracking
    this.currentSessionId = newSession.id;
    this.lastSessionIdRotation = Date.now();

    logger.info("Session ID rotated for anti-session-fixation", {
      oldSessionId: currentSession.id.slice(0, 8) + "...",
      newSessionId: newSession.id.slice(0, 8) + "...",
    });

    return newSession;
  }

  /**
   * Check if session ID should be rotated
   */
  private shouldRotateSessionId(): boolean {
    if (!this.config.enableAntiSessionFixation) return false;

    const minutesSinceRotation =
      (Date.now() - this.lastSessionIdRotation) / (1000 * 60);
    return minutesSinceRotation >= this.config.sessionIdRotationInterval;
  }

  // ============================================================================
  // Session Revocation
  // ============================================================================

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<SessionRevocationResult> {
    try {
      await this.invalidateSession(sessionId);

      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
        this.clearPersistedSession();
      }

      return { success: true, revokedCount: 1 };
    } catch (error) {
      logger.error("Failed to revoke session:", { context: String(error) });
      return {
        success: false,
        revokedCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Revoke all other sessions (keep current)
   */
  async revokeAllOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<SessionRevocationResult> {
    try {
      // This would be a server-side call in production
      // For now, we simulate the behavior
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          currentSessionId,
          revokeAll: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to revoke sessions");
      }

      const data = await response.json();
      return {
        success: true,
        revokedCount: data.revokedCount || 0,
      };
    } catch (error) {
      logger.error("Failed to revoke all sessions:", {
        context: String(error),
      });
      return {
        success: false,
        revokedCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Revoke all sessions (force re-authentication)
   */
  async revokeAllSessions(userId: string): Promise<SessionRevocationResult> {
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          revokeAll: true,
          includeCurrentSession: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to revoke all sessions");
      }

      const data = await response.json();

      // Clear local session
      this.currentSessionId = null;
      this.clearPersistedSession();

      return {
        success: true,
        revokedCount: data.revokedCount || 0,
      };
    } catch (error) {
      logger.error("Failed to revoke all sessions:", {
        context: String(error),
      });
      return {
        success: false,
        revokedCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ============================================================================
  // Device Listing
  // ============================================================================

  /**
   * Get all devices/sessions for a user
   */
  async getDevices(userId: string): Promise<DeviceInfo[]> {
    try {
      const response = await fetch(`/api/auth/sessions?userId=${userId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch devices");
      }

      const data = await response.json();
      const sessions: Session[] = data.sessions || [];

      return sessions.map((session) => this.sessionToDeviceInfo(session));
    } catch (error) {
      logger.error("Failed to get devices:", { context: String(error) });
      return [];
    }
  }

  /**
   * Convert session to device info
   */
  private sessionToDeviceInfo(session: Session): DeviceInfo {
    const deviceType = this.getDeviceType(session.device);

    return {
      id: session.id,
      name: this.getDeviceName(session),
      type: deviceType,
      platform: this.getPlatformFromOS(session.os),
      browser: session.browser,
      os: session.os,
      lastActive: session.lastActiveAt,
      isCurrent: session.isCurrent,
      ipAddress: session.ipAddress,
      location: session.location,
      trusted: true, // Would be determined by device trust status
    };
  }

  // ============================================================================
  // Signout
  // ============================================================================

  /**
   * Sign out and invalidate current session
   */
  async signOut(): Promise<void> {
    if (this.currentSessionId) {
      await this.invalidateSession(this.currentSessionId);
    }

    this.currentSessionId = null;
    this.clearPersistedSession();
    this.stopSessionRotation();
  }

  // ============================================================================
  // Platform-Specific Persistence
  // ============================================================================

  /**
   * Persist session based on platform
   */
  private async persistSession(
    session: Session,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const sessionData = {
      session,
      accessToken,
      refreshToken,
      platform: this.config.platform,
      persistedAt: Date.now(),
    };

    switch (this.config.platform) {
      case "web":
        this.persistWebSession(sessionData);
        break;
      case "ios":
      case "android":
        await this.persistMobileSession(sessionData);
        break;
      case "electron":
      case "tauri":
        await this.persistDesktopSession(sessionData);
        break;
      default:
        this.persistWebSession(sessionData);
    }
  }

  private persistWebSession(data: Record<string, unknown>): void {
    try {
      localStorage.setItem("nchat-unified-session", JSON.stringify(data));
    } catch (error) {
      logger.error("Failed to persist web session:", {
        context: String(error),
      });
    }
  }

  private async persistMobileSession(
    data: Record<string, unknown>,
  ): Promise<void> {
    // Mobile platforms use secure storage
    // This would integrate with Capacitor SecureStorage or similar
    try {
      if (typeof window !== "undefined" && "Capacitor" in window) {
        // Use Capacitor SecureStorage plugin if available
        // Note: @capacitor-community/secure-storage-plugin would be imported dynamically
        // when running in a Capacitor environment
        const CapacitorPlugins = (
          window as unknown as {
            Capacitor: { Plugins: Record<string, unknown> };
          }
        ).Capacitor?.Plugins;
        if (CapacitorPlugins?.SecureStoragePlugin) {
          const plugin = CapacitorPlugins.SecureStoragePlugin as {
            set: (opts: { key: string; value: string }) => Promise<void>;
          };
          await plugin.set({
            key: "nchat-unified-session",
            value: JSON.stringify(data),
          });
          return;
        }
      }
      // Fallback to localStorage
      this.persistWebSession(data);
    } catch (error) {
      logger.error("Failed to persist mobile session:", {
        context: String(error),
      });
      this.persistWebSession(data);
    }
  }

  private async persistDesktopSession(
    data: Record<string, unknown>,
  ): Promise<void> {
    // Desktop platforms can use electron-store or similar
    try {
      // Fallback to localStorage for now
      // In production, this would use electron-store or tauri-plugin-store
      this.persistWebSession(data);
    } catch (error) {
      logger.error("Failed to persist desktop session:", {
        context: String(error),
      });
    }
  }

  private clearPersistedSession(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem("nchat-unified-session");
    } catch (error) {
      logger.error("Failed to clear persisted session:", {
        context: String(error),
      });
    }
  }

  /**
   * Load persisted session
   */
  async loadPersistedSession(): Promise<Session | null> {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem("nchat-unified-session");
      if (!stored) return null;

      const data = JSON.parse(stored);

      // Validate session is still valid
      if (data.session) {
        const validation = sessionManager.validateSession(data.session);
        if (validation.valid) {
          this.currentSessionId = data.session.id;
          return data.session;
        }
      }

      // Invalid session, clear it
      this.clearPersistedSession();
      return null;
    } catch (error) {
      logger.error("Failed to load persisted session:", {
        context: String(error),
      });
      return null;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async invalidateSession(sessionId: string): Promise<void> {
    try {
      await fetch(`/api/auth/sessions?sessionId=${sessionId}`, {
        method: "DELETE",
      });
    } catch (error) {
      logger.error("Failed to invalidate session:", { context: String(error) });
    }
  }

  private generateNewSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `sess_${timestamp}_${randomPart}`;
  }

  private generateAccessToken(session: Session): string {
    // In production, this would be a proper JWT signed server-side
    return `access_${session.id}_${Date.now()}`;
  }

  private generateRefreshToken(session: Session): string {
    // In production, this would be a proper refresh token generated server-side
    return `refresh_${session.id}_${Date.now()}`;
  }

  private async getLocationFromIP(
    ipAddress: string,
  ): Promise<SessionLocation | undefined> {
    try {
      const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      if (response.ok) {
        const data = await response.json();
        return {
          city: data.city,
          country: data.country_name,
          region: data.region,
          countryCode: data.country_code,
        };
      }
    } catch (error) {
      logger.debug("Failed to get location from IP:", {
        context: String(error),
      });
    }
    return undefined;
  }

  private isKnownDevice(
    deviceInfo: { device: string; browser: string; os: string },
    previousSessions: Session[],
  ): boolean {
    const deviceSignature = `${deviceInfo.device}-${deviceInfo.browser}-${deviceInfo.os}`;
    return previousSessions.some(
      (s) => `${s.device}-${s.browser}-${s.os}` === deviceSignature,
    );
  }

  private getDeviceType(device: string): "mobile" | "tablet" | "desktop" {
    const lower = device.toLowerCase();
    if (lower.includes("mobile") || lower.includes("phone")) return "mobile";
    if (lower.includes("tablet") || lower.includes("ipad")) return "tablet";
    return "desktop";
  }

  private getDeviceName(session: Session): string {
    return `${session.browser} on ${session.os}`;
  }

  private getPlatformFromOS(os: string): PlatformType {
    const lower = os.toLowerCase();
    if (
      lower.includes("ios") ||
      lower.includes("iphone") ||
      lower.includes("ipad")
    )
      return "ios";
    if (lower.includes("android")) return "android";
    if (
      lower.includes("mac") ||
      lower.includes("windows") ||
      lower.includes("linux")
    )
      return "electron";
    return "web";
  }

  private setupSessionRotation(): void {
    if (this.sessionRotationTimer) {
      clearInterval(this.sessionRotationTimer);
    }

    // Check for session rotation every minute
    this.sessionRotationTimer = setInterval(() => {
      if (this.shouldRotateSessionId() && this.currentSessionId) {
        // Emit event or trigger rotation through refresh
        logger.info("Session ID rotation due, will rotate on next activity");
      }
    }, 60 * 1000);
  }

  private stopSessionRotation(): void {
    if (this.sessionRotationTimer) {
      clearInterval(this.sessionRotationTimer);
      this.sessionRotationTimer = null;
    }
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<UnifiedSessionConfig>): void {
    this.config = { ...this.config, ...config };
    sessionManager.updateConfig(config);
  }

  /**
   * Get current configuration
   */
  getConfig(): UnifiedSessionConfig {
    return { ...this.config };
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let unifiedSessionServiceInstance: UnifiedSessionService | null = null;

export function getUnifiedSessionService(
  config?: Partial<UnifiedSessionConfig>,
): UnifiedSessionService {
  if (!unifiedSessionServiceInstance) {
    unifiedSessionServiceInstance = new UnifiedSessionService(config);
  } else if (config) {
    unifiedSessionServiceInstance.updateConfig(config);
  }
  return unifiedSessionServiceInstance;
}

export default UnifiedSessionService;
