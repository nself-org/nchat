/**
 * Authentication Configuration for nself-chat
 *
 * Controls authentication behavior, providers, and security settings.
 * In production, dev auth is strictly disabled regardless of env vars.
 */

// ============================================================================
// Environment Detection (with security checks)
// ============================================================================

const isDevelopment = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";
const isProduction = process.env.NODE_ENV === "production";

// SECURITY: Dev auth can ONLY be enabled in development/test environments
// This prevents accidental enabling in production even if env var is set
const devAuthRequested = process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true";
const canUseDevAuth = (isDevelopment || isTest) && devAuthRequested;

// Production security checks
if (isProduction && devAuthRequested) {
  console.error(
    "[SECURITY] CRITICAL: NEXT_PUBLIC_USE_DEV_AUTH was set to true in production. " +
      "This is ignored and dev auth is DISABLED. Remove this environment variable.",
  );
}

// ============================================================================
// OAuth Provider Configuration
// ============================================================================

export interface OAuthProviderConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  scopes: string[];
  authUrl?: string;
}

export interface AuthProvidersConfig {
  emailPassword: boolean;
  magicLink: boolean;
  google: OAuthProviderConfig;
  github: OAuthProviderConfig;
  microsoft: OAuthProviderConfig;
  apple: OAuthProviderConfig;
}

// ============================================================================
// 2FA Configuration
// ============================================================================

export interface TwoFactorConfig {
  enabled: boolean;
  totpIssuer: string;
  backupCodesCount: number;
  enforceForRoles: Array<"owner" | "admin" | "moderator" | "member">;
  gracePeriodDays: number;
}

// ============================================================================
// Session Configuration
// ============================================================================

export interface SessionConfig {
  cookieName: string;
  maxAge: number;
  refreshThreshold: number;
  secureOnly: boolean;
  sameSite: "strict" | "lax" | "none";
}

// ============================================================================
// Security Configuration
// ============================================================================

export interface SecurityConfig {
  requireEmailVerification: boolean;
  allowedDomains: string[];
  blockedDomains: string[];
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSpecial: boolean;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  jwtExpiresInMinutes: number;
  refreshTokenExpiresInDays: number;
}

// ============================================================================
// Development Auth Users
// ============================================================================

export interface DevAuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: "owner" | "admin" | "moderator" | "member" | "guest";
  avatarUrl: string;
}

export interface DevAuthConfig {
  autoLogin: boolean;
  defaultUser: DevAuthUser & { createdAt: string };
  availableUsers: DevAuthUser[];
}

// ============================================================================
// Main Auth Configuration Type
// ============================================================================

export interface AuthConfig {
  // Environment flags
  isDevelopment: boolean;
  isProduction: boolean;
  useDevAuth: boolean;

  // Backend URLs
  authUrl: string;
  graphqlUrl: string;
  storageUrl: string;

  // OAuth providers
  providers: AuthProvidersConfig;

  // 2FA settings
  twoFactor: TwoFactorConfig;

  // Session settings
  session: SessionConfig;

  // Security settings
  security: SecurityConfig;

  // Dev mode settings
  devAuth: DevAuthConfig;
}

// ============================================================================
// Configuration Values
// ============================================================================

export const authConfig: AuthConfig = {
  // Environment flags
  isDevelopment,
  isProduction,
  useDevAuth: canUseDevAuth,

  // Backend URLs
  authUrl: process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:4000/v1",
  graphqlUrl:
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql",
  storageUrl: process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/v1",

  // OAuth providers configuration
  providers: {
    emailPassword: true,
    magicLink: true,
    google: {
      enabled: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scopes: ["openid", "email", "profile"],
    },
    github: {
      enabled: !!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
      clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
      scopes: ["read:user", "user:email"],
    },
    microsoft: {
      enabled: !!process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
      clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
      scopes: ["openid", "profile", "email", "User.Read"],
    },
    apple: {
      enabled: !!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
      clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
      scopes: ["name", "email"],
    },
  },

  // 2FA configuration
  twoFactor: {
    enabled: true,
    totpIssuer: process.env.NEXT_PUBLIC_APP_NAME || "nchat",
    backupCodesCount: 10,
    enforceForRoles: ["owner", "admin"],
    gracePeriodDays: 7,
  },

  // Session configuration
  session: {
    cookieName: "nchat-session",
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    refreshThreshold: 5 * 60, // Refresh if less than 5 minutes remaining
    secureOnly: isProduction,
    sameSite: isProduction ? "strict" : "lax",
  },

  // Security configuration
  security: {
    requireEmailVerification: isProduction,
    allowedDomains:
      process.env.NEXT_PUBLIC_ALLOWED_DOMAINS?.split(",").filter(Boolean) || [],
    blockedDomains: [],
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: false,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    jwtExpiresInMinutes: 15,
    refreshTokenExpiresInDays: 30,
  },

  // Dev mode settings (only accessible in development)
  devAuth: {
    autoLogin: canUseDevAuth,
    defaultUser: {
      id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      email: "owner@nself.org",
      username: "owner",
      displayName: "System Owner",
      role: "owner" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=owner",
      createdAt: new Date().toISOString(),
    },
    availableUsers: [
      {
        id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        email: "owner@nself.org",
        username: "owner",
        displayName: "System Owner",
        role: "owner" as const,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=owner",
      },
      {
        id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        email: "admin@nself.org",
        username: "admin",
        displayName: "Admin User",
        role: "admin" as const,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
      },
      {
        id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
        email: "moderator@nself.org",
        username: "moderator",
        displayName: "Moderator User",
        role: "moderator" as const,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=moderator",
      },
      {
        id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14",
        email: "member@nself.org",
        username: "member",
        displayName: "Member User",
        role: "member" as const,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=member",
      },
      {
        id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15",
        email: "guest@nself.org",
        username: "guest",
        displayName: "Guest User",
        role: "guest" as const,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=guest",
      },
      {
        id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16",
        email: "alice@nself.org",
        username: "alice",
        displayName: "Alice Anderson",
        role: "member" as const,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
      },
      {
        id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17",
        email: "bob@nself.org",
        username: "bob",
        displayName: "Bob Builder",
        role: "member" as const,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
      },
      {
        id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18",
        email: "charlie@nself.org",
        username: "charlie",
        displayName: "Charlie Chen",
        role: "member" as const,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie",
      },
    ],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a specific OAuth provider is enabled
 */
export function isProviderEnabled(
  provider: keyof AuthProvidersConfig,
): boolean {
  const config = authConfig.providers[provider];
  if (typeof config === "boolean") {
    return config;
  }
  return config.enabled;
}

/**
 * Get all enabled OAuth providers
 */
export function getEnabledProviders(): string[] {
  const enabled: string[] = [];

  if (authConfig.providers.emailPassword) enabled.push("email-password");
  if (authConfig.providers.magicLink) enabled.push("magic-link");
  if (authConfig.providers.google.enabled) enabled.push("google");
  if (authConfig.providers.github.enabled) enabled.push("github");
  if (authConfig.providers.microsoft.enabled) enabled.push("microsoft");
  if (authConfig.providers.apple.enabled) enabled.push("apple");

  return enabled;
}

/**
 * Validate password against security requirements
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const { security } = authConfig;

  if (password.length < security.passwordMinLength) {
    errors.push(
      `Password must be at least ${security.passwordMinLength} characters`,
    );
  }

  if (security.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (security.passwordRequireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (security.passwordRequireNumber && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (
    security.passwordRequireSpecial &&
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  ) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if an email domain is allowed
 */
export function isEmailDomainAllowed(email: string): boolean {
  const { security } = authConfig;
  const domain = email.split("@")[1]?.toLowerCase();

  if (!domain) return false;

  // Check blocked domains
  if (security.blockedDomains.includes(domain)) {
    return false;
  }

  // If allowed domains is empty, all domains are allowed
  if (security.allowedDomains.length === 0) {
    return true;
  }

  // Check allowed domains
  return security.allowedDomains.some((allowed) => {
    if (allowed.startsWith("*.")) {
      // Wildcard domain (e.g., *.example.com)
      return domain.endsWith(allowed.slice(1));
    }
    return domain === allowed.toLowerCase();
  });
}

/**
 * Check if 2FA is required for a user role
 */
export function isTwoFactorRequired(
  role: "owner" | "admin" | "moderator" | "member" | "guest",
): boolean {
  // Guest role is never in enforceForRoles, so we need to check if the role is included
  if (role === "guest") return false;
  return (
    authConfig.twoFactor.enabled &&
    authConfig.twoFactor.enforceForRoles.includes(role)
  );
}

/**
 * SECURITY: Verify that dev auth is not being used in production
 * This should be called at application startup
 */
export function verifySecurityConfiguration(): void {
  if (isProduction) {
    if (authConfig.useDevAuth) {
      throw new Error(
        "[SECURITY] FATAL: Dev auth is enabled in production. This should never happen. Check auth.config.ts.",
      );
    }

    // Additional production checks
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      console.error(
        "[SECURITY] WARNING: JWT_SECRET is not set or is too short. Authentication may not work correctly.",
      );
    }

    if (!process.env.NEXT_PUBLIC_AUTH_URL) {
      console.error(
        "[SECURITY] WARNING: NEXT_PUBLIC_AUTH_URL is not set. Authentication endpoints may not work.",
      );
    }
  }
}

export default authConfig;
