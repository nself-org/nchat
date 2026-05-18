/**
 * Authentication Interface for nself-chat
 *
 * Defines the contract for all authentication services.
 */

// ============================================================================
// User Types
// ============================================================================

export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  role: UserRole;
  emailVerified?: boolean;
  phoneNumber?: string;
  phoneVerified?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Response Types
// ============================================================================

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  requiresEmailVerification?: boolean;
  requires2FA?: boolean;
  mfaTicket?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  error?: AuthError;
  requiresEmailVerification?: boolean;
  requires2FA?: boolean;
  mfaTicket?: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Session Types
// ============================================================================

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

// ============================================================================
// 2FA Types
// ============================================================================

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  method: "totp" | null;
  hasBackupCodes: boolean;
  backupCodesRemaining?: number;
}

// ============================================================================
// OAuth Types
// ============================================================================

export type OAuthProvider =
  | "google"
  | "github"
  | "microsoft"
  | "apple"
  | "facebook"
  | "twitter";

export interface OAuthConfig {
  provider: OAuthProvider;
  redirectTo?: string;
  scopes?: string[];
}

export interface OAuthState {
  state: string;
  codeVerifier?: string;
  nonce?: string;
  redirectUri: string;
  timestamp: number;
}

// ============================================================================
// Main Auth Service Interface
// ============================================================================

export interface AuthService {
  // Core authentication
  signIn(email: string, password: string): Promise<AuthResponse>;
  signUp(
    email: string,
    password: string,
    username: string,
  ): Promise<AuthResponse>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  refreshToken(): Promise<string | null>;
  updateProfile(data: Partial<AuthUser>): Promise<AuthResponse>;

  // Session management
  getAccessToken?(): string | null;
  isAuthenticated?(): boolean;
  getSessionExpiresAt?(): number | null;
}

// ============================================================================
// Extended Auth Service Interface (for production services)
// ============================================================================

export interface ExtendedAuthService extends AuthService {
  // OAuth
  signInWithOAuth?(options: OAuthConfig): Promise<void>;
  handleOAuthCallback?(params: URLSearchParams): Promise<AuthResponse>;

  // Magic Links
  sendMagicLink?(
    email: string,
    options?: { redirectTo?: string },
  ): Promise<{ success: boolean }>;
  verifyMagicLink?(token: string): Promise<AuthResponse>;

  // Password Reset
  requestPasswordReset?(
    email: string,
    options?: { redirectTo?: string },
  ): Promise<{ success: boolean }>;
  resetPassword?(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean }>;
  changePassword?(
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }>;

  // Email Verification
  sendEmailVerification?(email: string): Promise<{ success: boolean }>;
  verifyEmail?(token: string): Promise<{ success: boolean }>;

  // 2FA
  getTwoFactorStatus?(): Promise<TwoFactorStatus>;
  generateTOTPSecret?(): Promise<{
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
  }>;
  enableTOTP?(
    code: string,
  ): Promise<{ success: boolean; backupCodes?: string[] }>;
  disableTOTP?(code: string): Promise<{ success: boolean }>;
  verifyTOTP?(ticket: string, code: string): Promise<AuthResponse>;
  generateBackupCodes?(): Promise<string[]>;
  verifyBackupCode?(code: string): Promise<AuthResponse>;
}

// ============================================================================
// Auth Event Types
// ============================================================================

export type AuthEventType =
  | "signIn"
  | "signUp"
  | "signOut"
  | "tokenRefresh"
  | "sessionExpired"
  | "passwordChanged"
  | "emailVerified"
  | "twoFactorEnabled"
  | "twoFactorDisabled"
  | "error";

export interface AuthEvent {
  type: AuthEventType;
  user?: AuthUser;
  error?: AuthError;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export type AuthEventListener = (event: AuthEvent) => void;

// ============================================================================
// Auth Provider Types (for OAuth providers)
// ============================================================================

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

export interface AuthProviderConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
  customOptions?: Record<string, unknown>;
}
