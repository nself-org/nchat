/**
 * Realtime Authentication Middleware Service
 *
 * Provides authentication validation for Socket.io connections and
 * subscription requests. Ensures that only authenticated users can
 * join rooms and receive realtime events.
 *
 * @module services/realtime/auth-middleware.service
 * @version 1.0.0
 */

import { realtimeClient, RealtimeConnectionState } from "./realtime-client";
import { getRoomManager } from "./room-manager.service";
import {
  parseRoomName,
  getUserRoom,
  type RealtimeRoomType,
} from "./events.types";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Authentication state
 */
export type AuthState =
  | "unauthenticated"
  | "authenticating"
  | "authenticated"
  | "expired"
  | "error";

/**
 * User session information
 */
export interface UserSession {
  /** User ID */
  userId: string;
  /** Session ID */
  sessionId: string;
  /** User roles */
  roles: string[];
  /** Authentication token */
  token: string;
  /** Token expiration timestamp */
  expiresAt: number;
  /** User display name */
  displayName?: string;
  /** User email */
  email?: string;
}

/**
 * Room permission check result
 */
export interface RoomPermissionResult {
  /** Whether access is allowed */
  allowed: boolean;
  /** Reason if denied */
  reason?: string;
  /** Required role for access */
  requiredRole?: string;
}

/**
 * Permission check callback
 */
export type PermissionCheckCallback = (
  userId: string,
  roomName: string,
  roomType: RealtimeRoomType,
  resourceId: string,
) => Promise<RoomPermissionResult>;

/**
 * Auth middleware configuration
 */
export interface AuthMiddlewareConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Token refresh threshold (seconds before expiry) */
  tokenRefreshThreshold?: number;
  /** Enable automatic token refresh */
  autoRefresh?: boolean;
  /** Permission check callback */
  permissionCheck?: PermissionCheckCallback;
  /** Get auth token callback */
  getAuthToken?: () => Promise<string | null>;
  /** Refresh token callback */
  refreshToken?: () => Promise<string | null>;
}

/**
 * Auth state change listener
 */
export type AuthStateListener = (
  state: AuthState,
  session?: UserSession,
) => void;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<
  Omit<
    AuthMiddlewareConfig,
    "permissionCheck" | "getAuthToken" | "refreshToken"
  >
> = {
  debug: false,
  tokenRefreshThreshold: 60,
  autoRefresh: true,
};

// ============================================================================
// Auth Middleware Class
// ============================================================================

/**
 * AuthMiddlewareService - Handles authentication for realtime connections
 */
class AuthMiddlewareService {
  private config: Required<
    Omit<
      AuthMiddlewareConfig,
      "permissionCheck" | "getAuthToken" | "refreshToken"
    >
  >;
  private permissionCheck?: PermissionCheckCallback;
  private getAuthToken?: () => Promise<string | null>;
  private refreshToken?: () => Promise<string | null>;
  private authState: AuthState = "unauthenticated";
  private session: UserSession | null = null;
  private authListeners = new Set<AuthStateListener>();
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribers: Array<() => void> = [];
  private isInitialized = false;
  private roomPermissionCache = new Map<
    string,
    { result: RoomPermissionResult; cachedAt: number }
  >();
  private permissionCacheTTL = 60000; // 1 minute

  constructor(config: AuthMiddlewareConfig = {}) {
    this.config = {
      debug: config.debug ?? DEFAULT_CONFIG.debug,
      tokenRefreshThreshold:
        config.tokenRefreshThreshold ?? DEFAULT_CONFIG.tokenRefreshThreshold,
      autoRefresh: config.autoRefresh ?? DEFAULT_CONFIG.autoRefresh,
    };

    this.permissionCheck = config.permissionCheck;
    this.getAuthToken = config.getAuthToken;
    this.refreshToken = config.refreshToken;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the auth middleware
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupConnectionListener();

    this.isInitialized = true;
    this.log("Auth middleware initialized");
  }

  /**
   * Configure callbacks
   */
  configure(config: Partial<AuthMiddlewareConfig>): void {
    if (config.permissionCheck) {
      this.permissionCheck = config.permissionCheck;
    }
    if (config.getAuthToken) {
      this.getAuthToken = config.getAuthToken;
    }
    if (config.refreshToken) {
      this.refreshToken = config.refreshToken;
    }
  }

  /**
   * Destroy the auth middleware
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    this.authListeners.clear();
    this.roomPermissionCache.clear();
    this.session = null;
    this.authState = "unauthenticated";

    this.isInitialized = false;
    this.log("Auth middleware destroyed");
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  /**
   * Authenticate with the realtime server
   */
  async authenticate(token: string): Promise<UserSession> {
    this.setAuthState("authenticating");

    try {
      // Connect if not connected
      if (!realtimeClient.isConnected) {
        await realtimeClient.connect(token);
      } else {
        // Update token on existing connection
        realtimeClient.updateToken(token);
      }

      // Wait for authentication response
      const authData = await this.waitForAuth();

      // Parse token to get expiration
      const tokenPayload = this.parseToken(token);

      const session: UserSession = {
        userId: authData.userId,
        sessionId: authData.sessionId,
        roles: authData.roles || [],
        token,
        expiresAt: tokenPayload?.exp
          ? tokenPayload.exp * 1000
          : Date.now() + 3600000,
        displayName: authData.displayName,
        email: authData.email,
      };

      this.session = session;
      this.setAuthState("authenticated");

      // Set up room manager with user ID
      const roomManager = getRoomManager();
      roomManager.setCurrentUserId(session.userId);

      // Schedule token refresh if auto-refresh is enabled
      if (this.config.autoRefresh) {
        this.scheduleTokenRefresh();
      }

      this.log("Authenticated as:", session.userId);

      return session;
    } catch (error) {
      this.setAuthState("error");
      throw error;
    }
  }

  /**
   * Logout and disconnect
   */
  logout(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear room manager user
    const roomManager = getRoomManager();
    roomManager.setCurrentUserId(null);

    // Disconnect
    realtimeClient.disconnect();

    // Clear session
    this.session = null;
    this.roomPermissionCache.clear();
    this.setAuthState("unauthenticated");

    this.log("Logged out");
  }

  /**
   * Wait for authentication response from server
   */
  private waitForAuth(): Promise<{
    userId: string;
    sessionId: string;
    roles?: string[];
    displayName?: string;
    email?: string;
  }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Authentication timeout"));
      }, 10000);

      const handleAuthSuccess = (data: {
        userId: string;
        sessionId: string;
        rooms: string[];
      }) => {
        clearTimeout(timeout);
        cleanup();
        resolve({
          userId: data.userId,
          sessionId: data.sessionId,
          roles: [],
        });
      };

      const handleAuthError = (error: { code: string; message: string }) => {
        clearTimeout(timeout);
        cleanup();
        reject(new Error(error.message || "Authentication failed"));
      };

      const unsubSuccess = realtimeClient.on(
        "authenticated",
        handleAuthSuccess,
      );
      const unsubError = realtimeClient.on("auth:error", handleAuthError);

      const cleanup = () => {
        unsubSuccess();
        unsubError();
      };

      // If already authenticated, resolve immediately
      if (realtimeClient.auth) {
        clearTimeout(timeout);
        cleanup();
        resolve({
          userId: realtimeClient.auth.userId,
          sessionId: realtimeClient.auth.sessionId,
          roles: [],
        });
      }
    });
  }

  /**
   * Parse JWT token
   */
  private parseToken(token: string): { exp?: number; sub?: string } | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Token Refresh
  // ============================================================================

  /**
   * Schedule token refresh before expiration
   */
  private scheduleTokenRefresh(): void {
    if (!this.session || !this.refreshToken) {
      return;
    }

    const now = Date.now();
    const expiresAt = this.session.expiresAt;
    const refreshTime = expiresAt - this.config.tokenRefreshThreshold * 1000;

    if (refreshTime <= now) {
      // Token is already expired or about to expire
      this.performTokenRefresh();
    } else {
      const delay = refreshTime - now;
      this.log(
        "Scheduling token refresh in",
        Math.round(delay / 1000),
        "seconds",
      );

      this.refreshTimer = setTimeout(() => {
        this.performTokenRefresh();
      }, delay);
    }
  }

  /**
   * Perform token refresh
   */
  private async performTokenRefresh(): Promise<void> {
    if (!this.refreshToken) {
      this.log("No refresh token callback configured");
      this.setAuthState("expired");
      return;
    }

    try {
      this.log("Refreshing authentication token");

      const newToken = await this.refreshToken();

      if (newToken) {
        // Update token on connection
        realtimeClient.updateToken(newToken);

        // Update session
        if (this.session) {
          this.session.token = newToken;

          const tokenPayload = this.parseToken(newToken);
          if (tokenPayload?.exp) {
            this.session.expiresAt = tokenPayload.exp * 1000;
          }
        }

        // Schedule next refresh
        this.scheduleTokenRefresh();

        this.log("Token refreshed successfully");
      } else {
        this.log("Token refresh returned null");
        this.setAuthState("expired");
      }
    } catch (error) {
      this.log("Token refresh failed:", error);
      this.setAuthState("expired");
    }
  }

  // ============================================================================
  // Permission Checking
  // ============================================================================

  /**
   * Check if user can join a room
   */
  async canJoinRoom(roomName: string): Promise<RoomPermissionResult> {
    if (!this.session) {
      return { allowed: false, reason: "Not authenticated" };
    }

    // Parse room name
    const parsed = parseRoomName(roomName);
    if (!parsed) {
      return { allowed: false, reason: "Invalid room name" };
    }

    // User can always join their own room
    if (parsed.type === "user" && parsed.id === this.session.userId) {
      return { allowed: true };
    }

    // Check cache first
    const cached = this.roomPermissionCache.get(roomName);
    if (cached && Date.now() - cached.cachedAt < this.permissionCacheTTL) {
      return cached.result;
    }

    // Use custom permission check if available
    if (this.permissionCheck) {
      try {
        const result = await this.permissionCheck(
          this.session.userId,
          roomName,
          parsed.type,
          parsed.id,
        );

        // Cache result
        this.roomPermissionCache.set(roomName, {
          result,
          cachedAt: Date.now(),
        });

        return result;
      } catch (error) {
        this.log("Permission check error:", error);
        return { allowed: false, reason: "Permission check failed" };
      }
    }

    // Default: allow all for authenticated users
    return { allowed: true };
  }

  /**
   * Clear permission cache for a room
   */
  clearPermissionCache(roomName?: string): void {
    if (roomName) {
      this.roomPermissionCache.delete(roomName);
    } else {
      this.roomPermissionCache.clear();
    }
  }

  /**
   * Validate a room join request
   */
  async validateRoomJoin(roomName: string): Promise<void> {
    const permission = await this.canJoinRoom(roomName);

    if (!permission.allowed) {
      throw new Error(permission.reason || "Access denied");
    }
  }

  // ============================================================================
  // Connection Listener
  // ============================================================================

  /**
   * Set up connection state listener
   */
  private setupConnectionListener(): void {
    const unsub = realtimeClient.onConnectionStateChange(
      (state: RealtimeConnectionState) => {
        if (state === "disconnected" || state === "error") {
          // Keep session but mark as needing re-auth
          if (this.authState === "authenticated") {
            this.log("Connection lost, will re-authenticate on reconnect");
          }
        } else if (
          state === "connected" &&
          this.session &&
          this.authState === "authenticated"
        ) {
          // Re-authenticate on reconnect
          this.log("Reconnected, re-authenticating");
          realtimeClient.updateToken(this.session.token);
        }
      },
    );

    this.unsubscribers.push(unsub);
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Set authentication state and notify listeners
   */
  private setAuthState(state: AuthState): void {
    if (this.authState !== state) {
      this.authState = state;

      this.authListeners.forEach((listener) => {
        try {
          listener(state, this.session || undefined);
        } catch (error) {
          logger.error("[AuthMiddleware] State listener error:", error);
        }
      });
    }
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(listener: AuthStateListener): () => void {
    this.authListeners.add(listener);
    // Immediately notify of current state
    listener(this.authState, this.session || undefined);
    return () => this.authListeners.delete(listener);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Get current auth state
   */
  get state(): AuthState {
    return this.authState;
  }

  /**
   * Get current session
   */
  get currentSession(): UserSession | null {
    return this.session;
  }

  /**
   * Check if authenticated
   */
  get isAuthenticated(): boolean {
    return this.authState === "authenticated" && this.session !== null;
  }

  /**
   * Get current user ID
   */
  get userId(): string | null {
    return this.session?.userId ?? null;
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Log message if debug enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[AuthMiddleware]', ...args)
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let authMiddlewareInstance: AuthMiddlewareService | null = null;

/**
 * Get the auth middleware instance
 */
export function getAuthMiddleware(
  config?: AuthMiddlewareConfig,
): AuthMiddlewareService {
  if (!authMiddlewareInstance) {
    authMiddlewareInstance = new AuthMiddlewareService(config);
  }
  return authMiddlewareInstance;
}

/**
 * Initialize the auth middleware
 */
export function initializeAuthMiddleware(
  config?: AuthMiddlewareConfig,
): AuthMiddlewareService {
  const middleware = getAuthMiddleware(config);
  middleware.initialize();
  return middleware;
}

/**
 * Reset the auth middleware
 */
export function resetAuthMiddleware(): void {
  if (authMiddlewareInstance) {
    authMiddlewareInstance.destroy();
    authMiddlewareInstance = null;
  }
}

export { AuthMiddlewareService };
export default AuthMiddlewareService;
