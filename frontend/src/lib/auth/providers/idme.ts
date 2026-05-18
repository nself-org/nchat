/**
 * ID.me Authentication Provider
 *
 * Government-grade identity verification for veterans, military,
 * first responders, government employees, teachers, and students.
 */

import {
  AuthProvider,
  AuthResult,
  AuthCredentials,
  BaseProviderConfig,
} from "./types";

export interface IDmeConfig extends BaseProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  sandbox?: boolean;
}

export interface IDmeVerification {
  verified: boolean;
  groups: IDmeGroup[];
  attributes: IDmeAttributes;
}

export interface IDmeGroup {
  id: string;
  name: string;
  type:
    | "military"
    | "veteran"
    | "first_responder"
    | "government"
    | "teacher"
    | "student"
    | "nurse";
  verified: boolean;
  verifiedAt?: string;
}

export interface IDmeAttributes {
  firstName?: string;
  lastName?: string;
  email?: string;
  birthDate?: string;
  zip?: string;
  affiliation?: string;
  branch?: string;
  serviceEra?: string;
}

const IDME_BASE_URL = "https://api.id.me";
const IDME_SANDBOX_URL = "https://api.idmelabs.com";

export class IDmeAuthProvider implements AuthProvider {
  private config: IDmeConfig;
  private baseUrl: string;
  readonly type = "idme" as const;

  constructor(config: IDmeConfig) {
    this.config = config;
    this.baseUrl = config.sandbox ? IDME_SANDBOX_URL : IDME_BASE_URL;
  }

  get name() {
    return "ID.me";
  }

  get icon() {
    return "idme";
  }

  isConfigured(): boolean {
    return !!(
      this.config.clientId &&
      this.config.clientSecret &&
      this.config.redirectUri
    );
  }

  /**
   * Get the authorization URL for ID.me OAuth flow
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: this.config.scope.join(" "),
      state,
    });

    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to exchange ID.me authorization code");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get user profile from ID.me
   */
  async getUserProfile(accessToken: string): Promise<IDmeAttributes> {
    const response = await fetch(
      `${this.baseUrl}/api/public/v3/attributes.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch ID.me user profile");
    }

    const data = await response.json();
    return {
      firstName: data.fname,
      lastName: data.lname,
      email: data.email,
      birthDate: data.birth_date,
      zip: data.zip,
    };
  }

  /**
   * Get verification status for all groups
   */
  async getVerifications(accessToken: string): Promise<IDmeVerification> {
    const response = await fetch(
      `${this.baseUrl}/api/public/v3/verified.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch ID.me verifications");
    }

    const data = await response.json();
    const groups: IDmeGroup[] = [];

    // Parse verification groups
    if (data.military) {
      groups.push({
        id: "military",
        name: "Military",
        type: "military",
        verified: true,
        verifiedAt: data.military.verified_at,
      });
    }

    if (data.veteran) {
      groups.push({
        id: "veteran",
        name: "Veteran",
        type: "veteran",
        verified: true,
        verifiedAt: data.veteran.verified_at,
      });
    }

    if (data.first_responder) {
      groups.push({
        id: "first_responder",
        name: "First Responder",
        type: "first_responder",
        verified: true,
        verifiedAt: data.first_responder.verified_at,
      });
    }

    if (data.government) {
      groups.push({
        id: "government",
        name: "Government Employee",
        type: "government",
        verified: true,
        verifiedAt: data.government.verified_at,
      });
    }

    if (data.teacher) {
      groups.push({
        id: "teacher",
        name: "Teacher",
        type: "teacher",
        verified: true,
        verifiedAt: data.teacher.verified_at,
      });
    }

    if (data.student) {
      groups.push({
        id: "student",
        name: "Student",
        type: "student",
        verified: true,
        verifiedAt: data.student.verified_at,
      });
    }

    if (data.nurse) {
      groups.push({
        id: "nurse",
        name: "Nurse",
        type: "nurse",
        verified: true,
        verifiedAt: data.nurse.verified_at,
      });
    }

    return {
      verified: groups.length > 0,
      groups,
      attributes: {
        affiliation: data.affiliation,
        branch: data.branch,
        serviceEra: data.service_era,
      },
    };
  }

  /**
   * Authenticate user with ID.me
   * This method handles the OAuth callback with the authorization code
   */
  async authenticate(credentials?: AuthCredentials): Promise<AuthResult> {
    // For ID.me, we expect OAuth credentials with a code
    if (!credentials || credentials.type !== "oauth" || !credentials.code) {
      return {
        success: false,
        error: {
          code: "invalid_credentials",
          message:
            "OAuth authorization code is required for ID.me authentication",
        },
      };
    }

    const code = credentials.code;

    // Exchange code for tokens
    const tokens = await this.exchangeCode(code);

    // Get user profile
    const profile = await this.getUserProfile(tokens.accessToken);

    // Get verifications
    const verifications = await this.getVerifications(tokens.accessToken);

    // Determine badges based on verifications
    const badges = verifications.groups.map((group) => ({
      type: group.type,
      name: group.name,
      verifiedAt: group.verifiedAt,
    }));

    return {
      success: true,
      user: {
        id: "", // Will be set by the auth system
        email: profile.email || "",
        displayName: `${profile.firstName} ${profile.lastName}`.trim(),
        provider: "idme",
        providerUserId: profile.email,
        emailVerified: verifications.verified,
        metadata: {
          idme: {
            ...profile,
            verifications: verifications.groups,
            badges,
          },
        },
      },
      session: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        user: {
          id: "", // Will be set by the auth system
          email: profile.email || "",
          displayName: `${profile.firstName} ${profile.lastName}`.trim(),
          provider: "idme",
          providerUserId: profile.email,
          emailVerified: verifications.verified,
          metadata: {
            idme: {
              ...profile,
              verifications: verifications.groups,
              badges,
            },
          },
        },
      },
    };
  }

  /**
   * Sign out (revoke tokens)
   */
  async signOut(accessToken: string): Promise<void> {
    await fetch(`${this.baseUrl}/oauth/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        token: accessToken,
      }),
    });
  }
}

// Verification group scopes
export const IDME_SCOPES = {
  military: "military",
  veteran: "veteran",
  firstResponder: "first_responder",
  government: "government",
  teacher: "teacher",
  student: "student",
  nurse: "nurse",
  openid: "openid",
  email: "email",
  profile: "profile",
} as const;

// Helper to create ID.me provider with common configuration
export function createIDmeProvider(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  options?: {
    sandbox?: boolean;
    groups?: (keyof typeof IDME_SCOPES)[];
  },
): IDmeAuthProvider {
  const scopes = [
    IDME_SCOPES.openid,
    IDME_SCOPES.email,
    IDME_SCOPES.profile,
    ...(options?.groups?.map((g) => IDME_SCOPES[g]) || []),
  ];

  return new IDmeAuthProvider({
    enabled: true,
    name: "idme",
    displayName: "ID.me",
    clientId,
    clientSecret,
    redirectUri,
    scope: scopes,
    sandbox: options?.sandbox,
  });
}
