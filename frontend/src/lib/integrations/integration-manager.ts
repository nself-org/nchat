/**
 * Integration Manager
 *
 * Centralized management for external integrations.
 * Handles registration, OAuth flows, token refresh, and lifecycle management.
 */

import type {
  Integration,
  IntegrationProvider,
  IntegrationCredentials,
  IntegrationStatus,
  IntegrationId,
  OAuthConfig,
  OAuthCallbackParams,
  OAuthTokenResponse,
} from "./types";
import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY_PREFIX = "nchat_integration_";
const STATE_STORAGE_KEY = "nchat_oauth_state";
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a cryptographically secure random state for OAuth
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for non-browser environments
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Build OAuth authorization URL with query parameters
 */
export function buildAuthUrl(
  baseUrl: string,
  params: Record<string, string>,
): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

/**
 * Parse OAuth callback URL to extract parameters
 */
export function parseOAuthCallback(url: string): OAuthCallbackParams {
  const urlObj = new URL(url);
  const params = new URLSearchParams(urlObj.search);
  const hashParams = new URLSearchParams(urlObj.hash.slice(1));

  // Check both query params and hash params (some providers use hash)
  return {
    code: params.get("code") || hashParams.get("code") || "",
    state: params.get("state") || hashParams.get("state") || "",
    error: params.get("error") || hashParams.get("error") || undefined,
    errorDescription:
      params.get("error_description") ||
      hashParams.get("error_description") ||
      undefined,
  };
}

/**
 * Verify OAuth state matches stored state
 */
export function verifyOAuthState(
  receivedState: string,
  storedState: string | null,
): boolean {
  if (!receivedState || !storedState) {
    return false;
  }
  return receivedState === storedState;
}

/**
 * Store OAuth state in sessionStorage
 */
export function storeOAuthState(state: string, integrationId: string): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(
      STATE_STORAGE_KEY,
      JSON.stringify({ state, integrationId }),
    );
  }
}

/**
 * Get stored OAuth state from sessionStorage
 */
export function getStoredOAuthState(): {
  state: string;
  integrationId: string;
} | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  const stored = sessionStorage.getItem(STATE_STORAGE_KEY);
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Clear stored OAuth state
 */
export function clearOAuthState(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(STATE_STORAGE_KEY);
  }
}

/**
 * Check if token needs refresh
 */
export function tokenNeedsRefresh(
  credentials: IntegrationCredentials,
): boolean {
  if (!credentials.expiresAt) {
    return false;
  }
  const expiresAt = new Date(credentials.expiresAt).getTime();
  const now = Date.now();
  return expiresAt - now <= TOKEN_REFRESH_THRESHOLD_MS;
}

/**
 * Calculate token expiry date from expires_in
 */
export function calculateTokenExpiry(expiresIn: number): string {
  const expiryDate = new Date(Date.now() + expiresIn * 1000);
  return expiryDate.toISOString();
}

/**
 * Convert OAuth token response to credentials
 */
export function tokenResponseToCredentials(
  response: OAuthTokenResponse,
): IntegrationCredentials {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: response.expires_in
      ? calculateTokenExpiry(response.expires_in)
      : undefined,
    tokenType: response.token_type,
    scope: response.scope,
  };
}

// ============================================================================
// Integration Manager Class
// ============================================================================

/**
 * Integration Manager handles the lifecycle of external integrations
 */
export class IntegrationManager {
  private providers: Map<string, IntegrationProvider> = new Map();
  private integrations: Map<string, Integration> = new Map();
  private credentials: Map<string, IntegrationCredentials> = new Map();
  private listeners: Set<(integrations: Integration[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  // ==========================================================================
  // Provider Registration
  // ==========================================================================

  /**
   * Register an integration provider
   */
  registerProvider(provider: IntegrationProvider): void {
    if (this.providers.has(provider.id)) {
      logger.warn(
        `Provider ${provider.id} is already registered. Overwriting.`,
      );
    }
    this.providers.set(provider.id, provider);

    // Initialize integration state if not exists
    if (!this.integrations.has(provider.id)) {
      this.integrations.set(provider.id, {
        id: provider.id,
        name: provider.name,
        icon: provider.icon,
        description: provider.description,
        category: provider.category,
        status: "disconnected",
        scopes: provider.scopes,
        config: {},
      });
    }
  }

  /**
   * Unregister an integration provider
   */
  unregisterProvider(providerId: string): void {
    this.providers.delete(providerId);
    this.integrations.delete(providerId);
    this.credentials.delete(providerId);
    this.removeFromStorage(providerId);
    this.notifyListeners();
  }

  /**
   * Get a registered provider
   */
  getProvider(providerId: string): IntegrationProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IntegrationProvider[] {
    return Array.from(this.providers.values());
  }

  // ==========================================================================
  // Integration State Management
  // ==========================================================================

  /**
   * Get all integrations
   */
  getIntegrations(): Integration[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Get a specific integration
   */
  getIntegration(integrationId: string): Integration | undefined {
    return this.integrations.get(integrationId);
  }

  /**
   * Get integrations by status
   */
  getIntegrationsByStatus(status: IntegrationStatus): Integration[] {
    return this.getIntegrations().filter((i) => i.status === status);
  }

  /**
   * Get integrations by category
   */
  getIntegrationsByCategory(category: string): Integration[] {
    return this.getIntegrations().filter((i) => i.category === category);
  }

  /**
   * Update integration state
   */
  updateIntegration(
    integrationId: string,
    updates: Partial<Integration>,
  ): void {
    const integration = this.integrations.get(integrationId);
    if (integration) {
      const updated = { ...integration, ...updates };
      this.integrations.set(integrationId, updated);
      this.saveToStorage(integrationId);
      this.notifyListeners();
    }
  }

  /**
   * Check if an integration is connected
   */
  isConnected(integrationId: string): boolean {
    const integration = this.integrations.get(integrationId);
    return integration?.status === "connected";
  }

  // ==========================================================================
  // OAuth Flow
  // ==========================================================================

  /**
   * Start OAuth authorization flow
   */
  async authorize(
    integrationId: string,
    config?: Partial<OAuthConfig>,
  ): Promise<void> {
    const provider = this.providers.get(integrationId);
    if (!provider) {
      throw new Error(`Provider ${integrationId} not found`);
    }

    // Generate and store state
    const state = generateOAuthState();
    storeOAuthState(state, integrationId);

    // Update status to pending
    this.updateIntegration(integrationId, { status: "pending" });

    // Get auth URL and redirect
    const authUrl = provider.getAuthUrl({ ...config, state });

    if (typeof window !== "undefined") {
      window.location.href = authUrl;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(callbackUrl: string): Promise<Integration> {
    const params = parseOAuthCallback(callbackUrl);
    const storedState = getStoredOAuthState();

    // Verify state
    if (!verifyOAuthState(params.state, storedState?.state ?? null)) {
      clearOAuthState();
      throw new Error("Invalid OAuth state. Possible CSRF attack.");
    }

    const integrationId = storedState?.integrationId;
    if (!integrationId) {
      clearOAuthState();
      throw new Error("Missing integration ID in stored state");
    }

    // Check for OAuth error
    if (params.error) {
      clearOAuthState();
      this.updateIntegration(integrationId, {
        status: "error",
        error: params.errorDescription || params.error,
      });
      throw new Error(params.errorDescription || params.error);
    }

    const provider = this.providers.get(integrationId);
    if (!provider) {
      clearOAuthState();
      throw new Error(`Provider ${integrationId} not found`);
    }

    try {
      // Exchange code for tokens
      const credentials = await provider.handleCallback(params);
      this.credentials.set(integrationId, credentials);

      // Update integration status
      const integration = this.integrations.get(integrationId)!;
      this.updateIntegration(integrationId, {
        status: "connected",
        connectedAt: new Date().toISOString(),
        error: undefined,
      });

      clearOAuthState();
      this.saveToStorage(integrationId);

      return this.integrations.get(integrationId)!;
    } catch (error) {
      clearOAuthState();
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error during OAuth";
      this.updateIntegration(integrationId, {
        status: "error",
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Disconnect an integration
   */
  async disconnect(integrationId: string): Promise<void> {
    const provider = this.providers.get(integrationId);
    if (provider) {
      await provider.disconnect();
    }

    this.credentials.delete(integrationId);
    this.updateIntegration(integrationId, {
      status: "disconnected",
      connectedAt: undefined,
      lastSyncAt: undefined,
      error: undefined,
    });
    this.removeFromStorage(integrationId);
  }

  // ==========================================================================
  // Token Management
  // ==========================================================================

  /**
   * Get credentials for an integration
   */
  getCredentials(integrationId: string): IntegrationCredentials | undefined {
    return this.credentials.get(integrationId);
  }

  /**
   * Refresh token if needed
   */
  async refreshTokenIfNeeded(
    integrationId: string,
  ): Promise<IntegrationCredentials | undefined> {
    const credentials = this.credentials.get(integrationId);
    if (!credentials) {
      return undefined;
    }

    if (!tokenNeedsRefresh(credentials)) {
      return credentials;
    }

    const provider = this.providers.get(integrationId);
    if (!provider) {
      throw new Error(`Provider ${integrationId} not found`);
    }

    if (!credentials.refreshToken) {
      // No refresh token, need to re-authorize
      this.updateIntegration(integrationId, {
        status: "error",
        error: "Token expired and no refresh token available",
      });
      throw new Error("Token expired and no refresh token available");
    }

    try {
      const newCredentials = await provider.refreshToken(credentials);
      this.credentials.set(integrationId, newCredentials);
      this.saveToStorage(integrationId);
      return newCredentials;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Token refresh failed";
      this.updateIntegration(integrationId, {
        status: "error",
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Get valid access token (refreshing if needed)
   */
  async getAccessToken(integrationId: string): Promise<string> {
    const credentials = await this.refreshTokenIfNeeded(integrationId);
    if (!credentials) {
      throw new Error(`No credentials found for ${integrationId}`);
    }
    return credentials.accessToken;
  }

  // ==========================================================================
  // Storage
  // ==========================================================================

  /**
   * Load integrations from storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      // Load integration states
      const integrationsJson = localStorage.getItem(
        `${STORAGE_KEY_PREFIX}integrations`,
      );
      if (integrationsJson) {
        const integrations: Integration[] = JSON.parse(integrationsJson);
        integrations.forEach((integration) => {
          this.integrations.set(integration.id, integration);
        });
      }

      // Load credentials
      const credentialsJson = localStorage.getItem(
        `${STORAGE_KEY_PREFIX}credentials`,
      );
      if (credentialsJson) {
        const credentials: Record<string, IntegrationCredentials> =
          JSON.parse(credentialsJson);
        Object.entries(credentials).forEach(([id, creds]) => {
          this.credentials.set(id, creds);
        });
      }
    } catch (error) {
      logger.error("Error loading integrations from storage:", error);
    }
  }

  /**
   * Save integration to storage
   */
  private saveToStorage(integrationId: string): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      // Save all integrations
      const integrations = Array.from(this.integrations.values());
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}integrations`,
        JSON.stringify(integrations),
      );

      // Save all credentials
      const credentials: Record<string, IntegrationCredentials> = {};
      this.credentials.forEach((creds, id) => {
        credentials[id] = creds;
      });
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}credentials`,
        JSON.stringify(credentials),
      );
    } catch (error) {
      logger.error("Error saving integration to storage:", error);
    }
  }

  /**
   * Remove integration from storage
   */
  private removeFromStorage(integrationId: string): void {
    this.saveToStorage(integrationId);
  }

  /**
   * Clear all stored data
   */
  clearStorage(): void {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}integrations`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}credentials`);
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  /**
   * Subscribe to integration changes
   */
  subscribe(listener: (integrations: Integration[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    const integrations = this.getIntegrations();
    this.listeners.forEach((listener) => listener(integrations));
  }

  // ==========================================================================
  // Utility
  // ==========================================================================

  /**
   * Reset the manager state
   */
  reset(): void {
    this.providers.clear();
    this.integrations.clear();
    this.credentials.clear();
    this.clearStorage();
    this.notifyListeners();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: IntegrationManager | null = null;

/**
 * Get the singleton integration manager instance
 */
export function getIntegrationManager(): IntegrationManager {
  if (!managerInstance) {
    managerInstance = new IntegrationManager();
  }
  return managerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetIntegrationManager(): void {
  if (managerInstance) {
    managerInstance.reset();
  }
  managerInstance = null;
}
