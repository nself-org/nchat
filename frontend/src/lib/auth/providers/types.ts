/**
 * Auth Provider Types - Core interfaces for all authentication providers
 *
 * This module defines the shared types used across all auth providers
 * to ensure consistency and interoperability.
 */

// ============================================================================
// Base Types
// ============================================================================

export type AuthProviderType =
  | "email"
  | "magic-link"
  | "google"
  | "github"
  | "apple"
  | "microsoft"
  | "facebook"
  | "twitter"
  | "phone"
  | "whatsapp"
  | "telegram"
  | "idme";

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  provider: AuthProviderType;
  providerUserId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  user: AuthUser;
}

export interface AuthResult {
  success: boolean;
  session?: AuthSession;
  user?: AuthUser;
  error?: AuthError;
  requiresVerification?: boolean;
  requiresMFA?: boolean;
  mfaToken?: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Provider Configuration Types
// ============================================================================

export interface BaseProviderConfig {
  enabled: boolean;
  name: string;
  displayName: string;
  icon?: string;
  order?: number;
}

export interface OAuthProviderConfig extends BaseProviderConfig {
  clientId: string;
  clientSecret?: string;
  scopes?: string[];
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  callbackUrl?: string;
}

export interface EmailProviderConfig extends BaseProviderConfig {
  requireVerification: boolean;
  allowSignup: boolean;
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export interface PhoneProviderConfig extends BaseProviderConfig {
  provider: "twilio" | "vonage" | "messagebird" | "sinch";
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  otpLength: number;
  otpExpiry: number; // in seconds
}

export interface IdMeProviderConfig extends BaseProviderConfig {
  clientId: string;
  clientSecret?: string;
  environment: "sandbox" | "production";
  scopes: IdMeScope[];
  affiliations: IdMeAffiliation[];
}

// ============================================================================
// ID.me Specific Types
// ============================================================================

export type IdMeScope =
  | "military"
  | "veteran"
  | "first_responder"
  | "government"
  | "student"
  | "teacher"
  | "nurse"
  | "medical"
  | "hospital";

export type IdMeAffiliation =
  | "military"
  | "veteran"
  | "military_family"
  | "first_responder"
  | "law_enforcement"
  | "firefighter"
  | "emt"
  | "government"
  | "federal_government"
  | "state_government"
  | "local_government"
  | "student"
  | "teacher"
  | "nurse";

export interface IdMeVerification {
  verified: boolean;
  affiliations: IdMeAffiliation[];
  verifiedAt?: Date;
  attributes?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    zip?: string;
    birthDate?: string;
  };
}

// ============================================================================
// Provider Interface
// ============================================================================

export interface AuthProvider {
  /**
   * Provider type identifier
   */
  type: AuthProviderType;

  /**
   * Human-readable provider name
   */
  name: string;

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean;

  /**
   * Initiate the authentication flow
   * For OAuth providers, this returns a redirect URL
   * For credential providers, this processes the credentials
   */
  authenticate(credentials?: AuthCredentials): Promise<AuthResult>;

  /**
   * Handle OAuth callback (for OAuth providers)
   */
  handleCallback?(code: string, state?: string): Promise<AuthResult>;

  /**
   * Verify a code (for OTP-based providers)
   */
  verifyCode?(userId: string, code: string): Promise<AuthResult>;

  /**
   * Resend verification code
   */
  resendCode?(userId: string): Promise<{ success: boolean; error?: AuthError }>;

  /**
   * Link this provider to an existing account
   */
  linkAccount?(
    userId: string,
    credentials?: AuthCredentials,
  ): Promise<AuthResult>;

  /**
   * Unlink this provider from an account
   */
  unlinkAccount?(
    userId: string,
  ): Promise<{ success: boolean; error?: AuthError }>;

  /**
   * Get the OAuth authorization URL (for OAuth providers)
   */
  getAuthorizationUrl?(state?: string): string;
}

// ============================================================================
// Credential Types
// ============================================================================

export interface EmailPasswordCredentials {
  type: "email";
  email: string;
  password: string;
}

export interface MagicLinkCredentials {
  type: "magic-link";
  email: string;
}

export interface PhoneCredentials {
  type: "phone";
  phone: string;
  countryCode: string;
}

export interface OAuthCredentials {
  type: "oauth";
  code: string;
  state?: string;
  redirectUri?: string;
}

export interface TelegramCredentials {
  type: "telegram";
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  authDate: number;
  hash: string;
}

export type AuthCredentials =
  | EmailPasswordCredentials
  | MagicLinkCredentials
  | PhoneCredentials
  | OAuthCredentials
  | TelegramCredentials;

// ============================================================================
// MFA Types
// ============================================================================

export type MFAMethod = "totp" | "sms" | "email" | "backup_codes";

export interface MFASetup {
  method: MFAMethod;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  phone?: string;
  email?: string;
}

export interface MFAChallenge {
  challengeId: string;
  method: MFAMethod;
  expiresAt: Date;
}

export interface MFAVerification {
  challengeId: string;
  code: string;
}

// ============================================================================
// Event Types
// ============================================================================

export type AuthEventType =
  | "sign_in"
  | "sign_up"
  | "sign_out"
  | "token_refresh"
  | "password_change"
  | "email_verified"
  | "phone_verified"
  | "mfa_enabled"
  | "mfa_disabled"
  | "provider_linked"
  | "provider_unlinked"
  | "session_expired";

export interface AuthEvent {
  type: AuthEventType;
  userId?: string;
  provider?: AuthProviderType;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type AuthEventListener = (event: AuthEvent) => void;

// ============================================================================
// Constants
// ============================================================================

export const PROVIDER_DISPLAY_NAMES: Record<AuthProviderType, string> = {
  email: "Email & Password",
  "magic-link": "Magic Link",
  google: "Google",
  github: "GitHub",
  apple: "Apple",
  microsoft: "Microsoft",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  phone: "Phone Number",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  idme: "ID.me",
};

export const PROVIDER_ICONS: Record<AuthProviderType, string> = {
  email: "mail",
  "magic-link": "wand",
  google: "google",
  github: "github",
  apple: "apple",
  microsoft: "microsoft",
  facebook: "facebook",
  twitter: "twitter",
  phone: "phone",
  whatsapp: "whatsapp",
  telegram: "telegram",
  idme: "shield-check",
};
