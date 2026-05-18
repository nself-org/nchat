/**
 * ID.me Verification Service
 *
 * Comprehensive service for ID.me identity verification workflow.
 * Supports military, veteran, first responder, government, teacher, student, and nurse verification.
 *
 * @module services/idme
 */

import { Pool } from "pg";
import { authConfig } from "@/config/auth.config";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type IdMeGroup =
  | "military"
  | "veteran"
  | "first_responder"
  | "government"
  | "teacher"
  | "student"
  | "nurse"
  | "hospital"
  | "military_family";

export const VALID_GROUPS: IdMeGroup[] = [
  "military",
  "veteran",
  "first_responder",
  "government",
  "teacher",
  "student",
  "nurse",
  "hospital",
  "military_family",
];

export const GROUP_SCOPES: Record<IdMeGroup, string> = {
  military: "military",
  veteran: "veteran",
  first_responder: "first_responder",
  government: "government",
  teacher: "teacher",
  student: "student",
  nurse: "nurse",
  hospital: "hospital",
  military_family: "military_family",
};

export const GROUP_LABELS: Record<IdMeGroup, string> = {
  military: "Active Duty Military",
  veteran: "Veteran",
  first_responder: "First Responder",
  government: "Government Employee",
  teacher: "Teacher",
  student: "Student",
  nurse: "Nurse",
  hospital: "Healthcare Worker",
  military_family: "Military Family",
};

export interface IdMeUserAttributes {
  uuid?: string;
  email?: string;
  fname?: string;
  lname?: string;
  birth_date?: string;
  zip?: string;
  affiliation?: string;
  branch?: string;
  service_era?: string;
  status?: string;
  verified?: boolean;
  group?: string;
}

export interface IdMeVerificationRecord {
  id: string;
  userId: string;
  verified: boolean;
  verificationType: string;
  verificationGroup: string;
  attributes: IdMeUserAttributes;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokeReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IdMeVerificationStatus {
  verified: boolean;
  verificationType?: string;
  verificationGroup?: string;
  verifiedAt?: Date;
  expiresAt?: Date;
  groups?: IdMeGroup[];
  attributes?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    affiliation?: string;
    branch?: string;
  };
}

export interface InitiateVerificationResult {
  success: boolean;
  authUrl: string;
  state: string;
  group: IdMeGroup | null;
  expiresAt?: number;
  message?: string;
}

export interface VerificationCallbackResult {
  success: boolean;
  verified: boolean;
  verificationType?: string;
  verificationGroup?: string;
  userId?: string;
  error?: string;
  attributes?: IdMeUserAttributes;
}

export interface RevokeVerificationResult {
  success: boolean;
  revoked: boolean;
  previousType?: string;
  message?: string;
  error?: string;
}

// ============================================================================
// ID.me Verification Service
// ============================================================================

export class IdMeVerificationService {
  private pool: Pool | null = null;
  private readonly idmeBaseUrl: string;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly redirectUri: string;

  constructor() {
    this.idmeBaseUrl =
      process.env.NODE_ENV === "production"
        ? "https://api.id.me"
        : "https://api.idmelabs.com";

    this.clientId = process.env.NEXT_PUBLIC_IDME_CLIENT_ID;
    this.clientSecret = process.env.IDME_CLIENT_SECRET;
    this.redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/idme/callback`;
  }

  /**
   * Initialize database connection
   */
  private initializeDatabase(): Pool | null {
    if (this.pool) return this.pool;

    if (authConfig.useDevAuth || process.env.SKIP_ENV_VALIDATION === "true") {
      return null;
    }

    if (
      !process.env.DATABASE_HOST ||
      !process.env.DATABASE_NAME ||
      !process.env.DATABASE_USER ||
      !process.env.DATABASE_PASSWORD
    ) {
      logger.warn("[IdMeService] Database configuration incomplete");
      return null;
    }

    this.pool = new Pool({
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || "5432"),
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      max: 5,
      idleTimeoutMillis: 30000,
    });

    return this.pool;
  }

  /**
   * Check if ID.me verification is configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret) || authConfig.useDevAuth;
  }

  /**
   * Validate a group name
   */
  isValidGroup(group: string): group is IdMeGroup {
    return VALID_GROUPS.includes(group as IdMeGroup);
  }

  /**
   * Generate state parameter for OAuth flow
   */
  generateState(userId: string, group?: IdMeGroup | null): string {
    const stateData = {
      userId,
      group: group || null,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2, 15),
    };
    return Buffer.from(JSON.stringify(stateData)).toString("base64");
  }

  /**
   * Parse state parameter from OAuth callback
   */
  parseState(
    state: string,
  ): { userId: string; group: IdMeGroup | null; timestamp: number } | null {
    try {
      const decoded = Buffer.from(state, "base64").toString();
      const parsed = JSON.parse(decoded);

      // Validate state hasn't expired (10 minutes)
      if (Date.now() - parsed.timestamp > 10 * 60 * 1000) {
        logger.warn("[IdMeService] State expired");
        return null;
      }

      return {
        userId: parsed.userId,
        group: parsed.group,
        timestamp: parsed.timestamp,
      };
    } catch (error) {
      logger.error("[IdMeService] Failed to parse state:", error);
      return null;
    }
  }

  /**
   * Initiate ID.me verification for a user
   */
  async initiateVerification(
    userId: string,
    group?: IdMeGroup | null,
  ): Promise<InitiateVerificationResult> {
    // Validate group if provided
    if (group && !this.isValidGroup(group)) {
      throw new Error(
        `Invalid group: ${group}. Valid options: ${VALID_GROUPS.join(", ")}`,
      );
    }

    // Check configuration
    if (!this.isConfigured()) {
      throw new Error("ID.me is not configured. Missing client ID or secret.");
    }

    // Build scopes
    const scopes = ["openid", "email", "profile"];
    if (group) {
      scopes.push(GROUP_SCOPES[group]);
    }

    // Generate state
    const state = this.generateState(userId, group);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: this.clientId || "dev-client-id",
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state,
    });

    const authUrl = `${this.idmeBaseUrl}/oauth/authorize?${params.toString()}`;

    // In dev mode, return mock callback URL
    if (authConfig.useDevAuth) {
      logger.info(
        `[IdMeService] Verification initiated (dev mode) for user: ${userId}, group: ${group || "any"}`,
      );

      const mockCallbackUrl = new URL(
        "/api/auth/idme/callback",
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      );
      mockCallbackUrl.searchParams.set("code", "mock-code");
      mockCallbackUrl.searchParams.set("state", state);

      return {
        success: true,
        authUrl: mockCallbackUrl.toString(),
        state,
        group: group || null,
        message: "Development mode: ID.me verification will be mocked",
      };
    }

    logger.info(
      `[IdMeService] Verification initiated for user: ${userId}, group: ${group || "any"}`,
    );

    return {
      success: true,
      authUrl,
      state,
      group: group || null,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }> {
    if (authConfig.useDevAuth) {
      return {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresIn: 3600,
      };
    }

    const response = await fetch(`${this.idmeBaseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("[IdMeService] Token exchange failed:", error);
      throw new Error("Failed to exchange authorization code for token");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Fetch user attributes from ID.me
   */
  async fetchUserAttributes(accessToken: string): Promise<IdMeUserAttributes> {
    if (authConfig.useDevAuth) {
      return {
        uuid: "mock-uuid",
        email: "verified@idme.test",
        fname: "Test",
        lname: "User",
        verified: true,
        group: "military",
        affiliation: "US Army",
        branch: "Army",
        status: "Active",
      };
    }

    const response = await fetch(
      `${this.idmeBaseUrl}/api/public/v3/attributes.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user attributes from ID.me");
    }

    return response.json();
  }

  /**
   * Fetch verification status from ID.me
   */
  async fetchVerificationStatus(
    accessToken: string,
  ): Promise<Record<string, unknown>> {
    if (authConfig.useDevAuth) {
      return {
        military: { verified: true, verified_at: new Date().toISOString() },
      };
    }

    const response = await fetch(
      `${this.idmeBaseUrl}/api/public/v3/verified.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch verification status from ID.me");
    }

    return response.json();
  }

  /**
   * Determine verification type from attributes
   */
  determineVerificationType(attributes: IdMeUserAttributes): string {
    if (
      attributes.group?.includes("military") ||
      attributes.affiliation?.toLowerCase().includes("military")
    ) {
      return "military";
    }
    if (attributes.group?.includes("veteran")) {
      return "veteran";
    }
    if (
      attributes.group?.includes("responder") ||
      attributes.group?.includes("police") ||
      attributes.group?.includes("fire")
    ) {
      return "first_responder";
    }
    if (attributes.group?.includes("student")) {
      return "student";
    }
    if (attributes.group?.includes("teacher")) {
      return "teacher";
    }
    if (attributes.group?.includes("government")) {
      return "government";
    }
    if (
      attributes.group?.includes("nurse") ||
      attributes.group?.includes("hospital")
    ) {
      return "healthcare";
    }
    return "verified";
  }

  /**
   * Handle OAuth callback and verify identity
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<VerificationCallbackResult> {
    try {
      // Parse state
      const stateData = this.parseState(state);
      if (!stateData) {
        return {
          success: false,
          verified: false,
          error: "Invalid or expired state parameter",
        };
      }

      const { userId, group } = stateData;

      // Exchange code for token
      const { accessToken } = await this.exchangeCodeForToken(code);

      // Fetch user attributes
      const attributes = await this.fetchUserAttributes(accessToken);

      // Determine verification type
      const verificationType = this.determineVerificationType(attributes);
      const verificationGroup = attributes.group || group || "unknown";

      // Store verification in database
      const dbPool = this.initializeDatabase();
      if (dbPool) {
        await this.storeVerification(
          userId,
          verificationType,
          verificationGroup,
          attributes,
        );
      }

      logger.info(
        `[IdMeService] Verification completed for user: ${userId}, type: ${verificationType}`,
      );

      return {
        success: true,
        verified: true,
        verificationType,
        verificationGroup,
        userId,
        attributes,
      };
    } catch (error) {
      logger.error("[IdMeService] Callback error:", error);
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  /**
   * Store verification record in database
   */
  async storeVerification(
    userId: string,
    verificationType: string,
    verificationGroup: string,
    attributes: IdMeUserAttributes,
  ): Promise<void> {
    const dbPool = this.initializeDatabase();
    if (!dbPool) {
      logger.warn("[IdMeService] Database not available, skipping storage");
      return;
    }

    try {
      // Upsert verification record
      await dbPool.query(
        `INSERT INTO nchat.nchat_idme_verifications (
          user_id, verified, verification_type, verification_group,
          attributes, verified_at, created_at, updated_at
        ) VALUES ($1, TRUE, $2, $3, $4, NOW(), NOW(), NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          verified = TRUE,
          verification_type = $2,
          verification_group = $3,
          attributes = $4,
          verified_at = NOW(),
          revoked_at = NULL,
          revoke_reason = NULL,
          updated_at = NOW()`,
        [
          userId,
          verificationType,
          verificationGroup,
          JSON.stringify(attributes),
        ],
      );

      // Update user metadata
      await dbPool.query(
        `UPDATE nchat.nchat_users
         SET metadata = jsonb_set(
           jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{idme_verified}',
             'true'::jsonb
           ),
           '{idme_groups}',
           $2::jsonb
         )
         WHERE id = $1`,
        [userId, JSON.stringify([verificationGroup])],
      );
    } catch (error) {
      logger.error("[IdMeService] Failed to store verification:", error);
      throw error;
    }
  }

  /**
   * Get verification status for a user
   */
  async getVerificationStatus(userId: string): Promise<IdMeVerificationStatus> {
    // In dev mode, return mock status
    if (authConfig.useDevAuth) {
      return {
        verified: false,
      };
    }

    const dbPool = this.initializeDatabase();
    if (!dbPool) {
      return { verified: false };
    }

    try {
      const result = await dbPool.query(
        `SELECT verified, verification_type, verification_group, verified_at, expires_at, attributes
         FROM nchat.nchat_idme_verifications
         WHERE user_id = $1 AND (revoked_at IS NULL OR revoked_at > NOW())`,
        [userId],
      );

      if (result.rows.length === 0) {
        return { verified: false };
      }

      const record = result.rows[0];
      const attributes =
        typeof record.attributes === "string"
          ? JSON.parse(record.attributes)
          : record.attributes;

      return {
        verified: record.verified,
        verificationType: record.verification_type,
        verificationGroup: record.verification_group,
        verifiedAt: record.verified_at,
        expiresAt: record.expires_at,
        groups: [record.verification_group as IdMeGroup],
        attributes: {
          firstName: attributes?.fname,
          lastName: attributes?.lname,
          email: attributes?.email,
          affiliation: attributes?.affiliation,
          branch: attributes?.branch,
        },
      };
    } catch (error) {
      logger.error("[IdMeService] Failed to get verification status:", error);
      return { verified: false };
    }
  }

  /**
   * Revoke verification for a user
   */
  async revokeVerification(
    userId: string,
    reason?: string,
  ): Promise<RevokeVerificationResult> {
    // In dev mode, return success
    if (authConfig.useDevAuth) {
      logger.info(
        `[IdMeService] Verification revoked (dev mode) for user: ${userId}`,
      );
      return {
        success: true,
        revoked: true,
        message: "ID.me verification revoked successfully",
      };
    }

    const dbPool = this.initializeDatabase();
    if (!dbPool) {
      return {
        success: false,
        revoked: false,
        error: "Database not available",
      };
    }

    try {
      // Check if user has a verification
      const checkResult = await dbPool.query(
        `SELECT id, verified, verification_type FROM nchat.nchat_idme_verifications WHERE user_id = $1`,
        [userId],
      );

      if (checkResult.rows.length === 0) {
        return {
          success: false,
          revoked: false,
          error: "No ID.me verification found for this user",
        };
      }

      const verification = checkResult.rows[0];

      // Update verification record to mark as revoked
      await dbPool.query(
        `UPDATE nchat.nchat_idme_verifications
         SET verified = FALSE,
             revoked_at = NOW(),
             revoke_reason = $2,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId, reason || "User requested revocation"],
      );

      // Update user metadata
      await dbPool.query(
        `UPDATE nchat.nchat_users
         SET metadata = jsonb_set(
           jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{idme_verified}',
             'false'::jsonb
           ),
           '{idme_groups}',
           '[]'::jsonb
         )
         WHERE id = $1`,
        [userId],
      );

      logger.info(
        `[IdMeService] Verification revoked for user: ${userId} (type: ${verification.verification_type})`,
      );

      return {
        success: true,
        revoked: true,
        previousType: verification.verification_type,
        message: "ID.me verification revoked successfully",
      };
    } catch (error) {
      logger.error("[IdMeService] Revoke verification error:", error);
      return {
        success: false,
        revoked: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to revoke verification",
      };
    }
  }

  /**
   * Get all supported verification groups
   */
  getSupportedGroups(): { id: IdMeGroup; name: string; scope: string }[] {
    return VALID_GROUPS.map((group) => ({
      id: group,
      name: GROUP_LABELS[group],
      scope: GROUP_SCOPES[group],
    }));
  }

  /**
   * Check if a user has a specific verification
   */
  async hasVerification(userId: string, group?: IdMeGroup): Promise<boolean> {
    const status = await this.getVerificationStatus(userId);

    if (!status.verified) {
      return false;
    }

    if (group) {
      return status.groups?.includes(group) ?? false;
    }

    return true;
  }

  /**
   * Revoke ID.me access token (for complete unlinking)
   */
  async revokeAccessToken(accessToken: string): Promise<void> {
    if (authConfig.useDevAuth) {
      return;
    }

    try {
      await fetch(`${this.idmeBaseUrl}/oauth/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.clientId!,
          client_secret: this.clientSecret!,
          token: accessToken,
        }),
      });
    } catch (error) {
      logger.error("[IdMeService] Failed to revoke access token:", error);
      // Don't throw - token revocation is best-effort
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let idMeServiceInstance: IdMeVerificationService | null = null;

export function getIdMeVerificationService(): IdMeVerificationService {
  if (!idMeServiceInstance) {
    idMeServiceInstance = new IdMeVerificationService();
  }
  return idMeServiceInstance;
}

export default IdMeVerificationService;
