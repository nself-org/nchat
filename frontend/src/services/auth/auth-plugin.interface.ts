/**
 * Auth Plugin Interface for nself-chat
 *
 * All authentication providers must implement this interface to be compatible
 * with the nchat authentication system.
 */

import { logger } from "@/lib/logger";

// User information returned from authentication
export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "moderator" | "member" | "guest";
  emailVerified?: boolean;
  phoneNumber?: string;
  phoneVerified?: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  lastLoginAt?: string;
}

// Authentication result
export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: AuthError;
}

// Authentication error
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Provider-specific configuration
export interface AuthProviderConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
  customOptions?: Record<string, unknown>;
}

// OAuth state for social providers
export interface OAuthState {
  state: string;
  codeVerifier?: string;
  nonce?: string;
  redirectUri: string;
  timestamp: number;
}

// Provider metadata
export interface AuthProviderMetadata {
  id: string;
  name: string;
  type:
    | "email"
    | "social"
    | "phone"
    | "enterprise"
    | "passwordless"
    | "verification";
  icon?: string;
  description: string;
  requiresBackend: boolean;
  supportedFeatures: {
    signIn: boolean;
    signUp: boolean;
    signOut: boolean;
    tokenRefresh: boolean;
    passwordReset: boolean;
    emailVerification: boolean;
    phoneVerification: boolean;
    mfa: boolean;
    linkAccount: boolean;
  };
}

// Credentials for different auth methods
export interface EmailPasswordCredentials {
  email: string;
  password: string;
}

export interface MagicLinkCredentials {
  email: string;
}

export interface PhoneCredentials {
  phoneNumber: string;
  countryCode: string;
  verificationCode?: string;
}

export interface OAuthCredentials {
  code: string;
  state: string;
  codeVerifier?: string;
}

export interface VerificationCredentials {
  provider: string;
  verificationToken: string;
  userData?: Record<string, unknown>;
}

export type AuthCredentials =
  | EmailPasswordCredentials
  | MagicLinkCredentials
  | PhoneCredentials
  | OAuthCredentials
  | VerificationCredentials;

// Events emitted by providers
export type AuthEventType =
  | "signIn"
  | "signUp"
  | "signOut"
  | "tokenRefresh"
  | "sessionExpired"
  | "passwordReset"
  | "emailVerified"
  | "phoneVerified"
  | "accountLinked"
  | "error";

export interface AuthEvent {
  type: AuthEventType;
  user?: AuthUser;
  error?: AuthError;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export type AuthEventListener = (event: AuthEvent) => void;

/**
 * Main Auth Provider Interface
 *
 * All authentication providers must implement this interface.
 * Each provider is responsible for handling its specific authentication flow.
 */
export interface AuthProvider {
  // Provider metadata
  readonly metadata: AuthProviderMetadata;

  /**
   * Initialize the provider with configuration
   * Called once when the provider is registered
   */
  initialize(config: AuthProviderConfig): Promise<void>;

  /**
   * Check if the provider is currently enabled
   */
  isEnabled(): boolean;

  /**
   * Enable or disable the provider
   */
  setEnabled(enabled: boolean): void;

  /**
   * Sign in with provider-specific credentials
   */
  signIn(credentials: AuthCredentials): Promise<AuthResult>;

  /**
   * Sign up a new user (if supported)
   */
  signUp?(
    credentials: AuthCredentials,
    metadata?: Record<string, unknown>,
  ): Promise<AuthResult>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<void>;

  /**
   * Refresh the authentication token
   */
  refreshToken?(refreshToken: string): Promise<AuthResult>;

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * Check if a user is currently authenticated
   */
  isAuthenticated(): boolean;

  /**
   * For OAuth providers: Get the authorization URL
   */
  getAuthorizationUrl?(): Promise<{ url: string; state: OAuthState }>;

  /**
   * For OAuth providers: Handle the callback
   */
  handleCallback?(params: URLSearchParams): Promise<AuthResult>;

  /**
   * For phone providers: Send verification code
   */
  sendVerificationCode?(
    phoneNumber: string,
    countryCode: string,
  ): Promise<{ success: boolean; error?: AuthError }>;

  /**
   * For passwordless: Send magic link
   */
  sendMagicLink?(
    email: string,
  ): Promise<{ success: boolean; error?: AuthError }>;

  /**
   * For email: Request password reset
   */
  requestPasswordReset?(
    email: string,
  ): Promise<{ success: boolean; error?: AuthError }>;

  /**
   * For email: Reset password with token
   */
  resetPassword?(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: AuthError }>;

  /**
   * For email: Verify email address
   */
  verifyEmail?(token: string): Promise<{ success: boolean; error?: AuthError }>;

  /**
   * Link this provider to an existing account
   */
  linkAccount?(existingUserId: string): Promise<AuthResult>;

  /**
   * Unlink this provider from an account
   */
  unlinkAccount?(
    userId: string,
  ): Promise<{ success: boolean; error?: AuthError }>;

  /**
   * Subscribe to authentication events
   */
  onAuthStateChange(listener: AuthEventListener): () => void;

  /**
   * Clean up provider resources
   */
  destroy(): void;
}

/**
 * Base class for auth providers with common functionality
 */
export abstract class BaseAuthProvider implements AuthProvider {
  abstract readonly metadata: AuthProviderMetadata;

  protected config: AuthProviderConfig = { enabled: false };
  protected currentUser: AuthUser | null = null;
  protected authenticated = false;
  protected listeners: Set<AuthEventListener> = new Set();

  async initialize(config: AuthProviderConfig): Promise<void> {
    this.config = config;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  abstract signIn(credentials: AuthCredentials): Promise<AuthResult>;

  async signOut(): Promise<void> {
    this.currentUser = null;
    this.authenticated = false;
    this.emitEvent({ type: "signOut", timestamp: Date.now() });
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  onAuthStateChange(listener: AuthEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.listeners.clear();
    this.currentUser = null;
    this.authenticated = false;
  }

  protected emitEvent(event: AuthEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("Auth event listener error:", error);
      }
    });
  }

  protected createError(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): AuthError {
    return { code, message, details };
  }

  protected createSuccessResult(
    user: AuthUser,
    accessToken: string,
    refreshToken?: string,
  ): AuthResult {
    return {
      success: true,
      user,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 3600 * 1000, // 1 hour default
    };
  }

  protected createErrorResult(error: AuthError): AuthResult {
    return {
      success: false,
      error,
    };
  }
}

/**
 * Provider registry for managing multiple auth providers
 */
export class AuthProviderRegistry {
  private providers: Map<string, AuthProvider> = new Map();
  private listeners: Set<AuthEventListener> = new Set();

  /**
   * Register a new auth provider
   */
  register(provider: AuthProvider): void {
    const id = provider.metadata.id;
    if (this.providers.has(id)) {
      logger.warn(`Auth provider ${id} is already registered, replacing...`);
    }
    this.providers.set(id, provider);

    // Forward events from provider to registry listeners
    provider.onAuthStateChange((event) => {
      this.listeners.forEach((listener) => listener(event));
    });
  }

  /**
   * Unregister an auth provider
   */
  unregister(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.destroy();
      this.providers.delete(providerId);
    }
  }

  /**
   * Get a provider by ID
   */
  get(providerId: string): AuthProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers
   */
  getAll(): AuthProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all enabled providers
   */
  getEnabled(): AuthProvider[] {
    return this.getAll().filter((p) => p.isEnabled());
  }

  /**
   * Get providers by type
   */
  getByType(type: AuthProviderMetadata["type"]): AuthProvider[] {
    return this.getAll().filter((p) => p.metadata.type === type);
  }

  /**
   * Subscribe to auth events from all providers
   */
  onAuthStateChange(listener: AuthEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Destroy all providers
   */
  destroy(): void {
    this.providers.forEach((provider) => provider.destroy());
    this.providers.clear();
    this.listeners.clear();
  }
}

// Singleton registry instance
export const authProviderRegistry = new AuthProviderRegistry();
