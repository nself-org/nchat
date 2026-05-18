/**
 * SSO Service
 *
 * High-level service layer for SAML/OIDC Single Sign-On functionality.
 * This service wraps the SAMLService and provides additional business logic
 * for SSO operations including:
 * - Connection management
 * - Session tracking
 * - Audit logging
 * - Domain-based provider discovery
 *
 * @module services/auth/sso.service
 */

import {
  getSAMLService,
  type SSOConnection,
  type SSOProvider,
  type SAMLConfiguration,
  type SSOLoginResult,
} from "@/lib/auth/saml";
import { apolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { logger } from "@/lib/logger";
import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";
import type { UserRole } from "@/lib/auth/roles";

// ============================================================================
// GraphQL Operations for SSO Service
// ============================================================================

const LOG_SSO_EVENT = gql`
  mutation LogSSOEvent(
    $connectionId: uuid
    $userId: uuid
    $eventType: String!
    $email: String
    $ipAddress: String
    $userAgent: String
    $success: Boolean!
    $errorCode: String
    $errorMessage: String
    $metadata: jsonb
  ) {
    insert_nchat_sso_audit_log_one(
      object: {
        connection_id: $connectionId
        user_id: $userId
        event_type: $eventType
        email: $email
        ip_address: $ipAddress
        user_agent: $userAgent
        success: $success
        error_code: $errorCode
        error_message: $errorMessage
        metadata: $metadata
      }
    ) {
      id
      created_at
    }
  }
`;

const CREATE_SSO_SESSION = gql`
  mutation CreateSSOSession(
    $userId: uuid!
    $connectionId: uuid!
    $nameId: String
    $sessionIndex: String
    $expiresAt: timestamptz
  ) {
    insert_nchat_sso_sessions_one(
      object: {
        user_id: $userId
        connection_id: $connectionId
        name_id: $nameId
        session_index: $sessionIndex
        expires_at: $expiresAt
        is_active: true
      }
    ) {
      id
      authenticated_at
    }
  }
`;

const INVALIDATE_SSO_SESSION = gql`
  mutation InvalidateSSOSession($userId: uuid!, $connectionId: uuid!) {
    update_nchat_sso_sessions(
      where: {
        user_id: { _eq: $userId }
        connection_id: { _eq: $connectionId }
        is_active: { _eq: true }
      }
      _set: { is_active: false, logged_out_at: "now()" }
    ) {
      affected_rows
    }
  }
`;

const GET_SSO_CONNECTION_BY_DOMAIN_MAPPING = gql`
  query GetSSOConnectionByDomainMapping($domain: String!) {
    nchat_sso_domain_mappings(
      where: { domain: { _eq: $domain }, is_active: { _eq: true } }
      order_by: { priority: desc }
      limit: 1
    ) {
      id
      domain
      connection {
        id
        name
        provider
        enabled
        domains
        config
        metadata
        created_at
        updated_at
      }
    }
  }
`;

const GET_USER_SSO_SESSIONS = gql`
  query GetUserSSOSessions($userId: uuid!) {
    nchat_sso_sessions(
      where: { user_id: { _eq: $userId }, is_active: { _eq: true } }
      order_by: { authenticated_at: desc }
    ) {
      id
      connection_id
      name_id
      session_index
      authenticated_at
      last_activity_at
      expires_at
      connection {
        id
        name
        provider
        config
      }
    }
  }
`;

const GET_SSO_SESSION_FOR_LOGOUT = gql`
  query GetSSOSessionForLogout($userId: uuid!, $connectionId: uuid!) {
    nchat_sso_sessions(
      where: {
        user_id: { _eq: $userId }
        connection_id: { _eq: $connectionId }
        is_active: { _eq: true }
      }
      limit: 1
    ) {
      id
      name_id
      session_index
      connection {
        id
        name
        provider
        config
      }
    }
  }
`;

const GET_SSO_AUDIT_LOGS = gql`
  query GetSSOAuditLogs(
    $connectionId: uuid
    $userId: uuid
    $eventType: String
    $limit: Int = 100
    $offset: Int = 0
  ) {
    nchat_sso_audit_log(
      where: {
        connection_id: { _eq: $connectionId }
        user_id: { _eq: $userId }
        event_type: { _eq: $eventType }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      connection_id
      user_id
      event_type
      email
      ip_address
      success
      error_code
      error_message
      metadata
      created_at
    }
  }
`;

// ============================================================================
// Types
// ============================================================================

export interface SSOEventType {
  LOGIN_INITIATED: "login_initiated";
  LOGIN_SUCCESS: "login_success";
  LOGIN_FAILED: "login_failed";
  LOGOUT: "logout";
  USER_PROVISIONED: "user_provisioned";
  CONNECTION_CREATED: "connection_created";
  CONNECTION_UPDATED: "connection_updated";
  CONNECTION_DELETED: "connection_deleted";
}

export const SSO_EVENTS: SSOEventType = {
  LOGIN_INITIATED: "login_initiated",
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
  LOGOUT: "logout",
  USER_PROVISIONED: "user_provisioned",
  CONNECTION_CREATED: "connection_created",
  CONNECTION_UPDATED: "connection_updated",
  CONNECTION_DELETED: "connection_deleted",
};

export interface SSOSession {
  id: string;
  connectionId: string;
  connectionName: string;
  provider: SSOProvider;
  nameId?: string;
  sessionIndex?: string;
  authenticatedAt: Date;
  lastActivityAt: Date;
  expiresAt?: Date;
}

export interface SSOAuditLogEntry {
  id: string;
  connectionId?: string;
  userId?: string;
  eventType: string;
  email?: string;
  ipAddress?: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SSOLoginOptions {
  email?: string;
  connectionId?: string;
  returnUrl?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SSOCallbackOptions {
  samlResponse: string;
  relayState?: string;
  connectionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// SSO Service Class
// ============================================================================

export class SSOService {
  private samlService = getSAMLService();

  // --------------------------------------------------------------------------
  // Connection Management
  // --------------------------------------------------------------------------

  /**
   * Get all SSO connections
   */
  async getConnections(): Promise<SSOConnection[]> {
    return this.samlService.getAllConnections();
  }

  /**
   * Get SSO connection by ID
   */
  async getConnection(id: string): Promise<SSOConnection | undefined> {
    return this.samlService.getConnection(id);
  }

  /**
   * Get SSO connection by email domain
   * First checks domain mappings table, then falls back to connection domains array
   */
  async getConnectionByEmail(
    email: string,
  ): Promise<SSOConnection | undefined> {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return undefined;

    try {
      // First, try domain mappings table for explicit mappings
      const { data } = await apolloClient.query({
        query: GET_SSO_CONNECTION_BY_DOMAIN_MAPPING,
        variables: { domain },
        fetchPolicy: "network-only",
      });

      if (data?.nchat_sso_domain_mappings?.[0]?.connection) {
        const conn = data.nchat_sso_domain_mappings[0].connection;
        if (conn.enabled) {
          return {
            id: conn.id,
            name: conn.name,
            provider: conn.provider as SSOProvider,
            enabled: conn.enabled,
            config: conn.config as SAMLConfiguration,
            domains: conn.domains,
            createdAt: new Date(conn.created_at),
            updatedAt: new Date(conn.updated_at),
            metadata: conn.metadata,
          };
        }
      }
    } catch (error) {
      logger.debug(
        "Domain mapping lookup failed, falling back to connection domains",
        { error },
      );
    }

    // Fall back to searching connection domains
    return this.samlService.getConnectionByDomain(email);
  }

  /**
   * Create a new SSO connection
   */
  async createConnection(
    name: string,
    provider: SSOProvider,
    config: SAMLConfiguration,
    options?: {
      enabled?: boolean;
      domains?: string[];
      metadata?: Record<string, unknown>;
    },
  ): Promise<SSOConnection> {
    const connection: SSOConnection = {
      id: crypto.randomUUID(),
      name,
      provider,
      enabled: options?.enabled ?? false,
      config,
      domains: options?.domains || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: options?.metadata,
    };

    await this.samlService.addConnection(connection);

    await this.logEvent({
      connectionId: connection.id,
      eventType: SSO_EVENTS.CONNECTION_CREATED,
      success: true,
      metadata: { provider, name },
    });

    return connection;
  }

  /**
   * Update an SSO connection
   */
  async updateConnection(
    id: string,
    updates: Partial<SSOConnection>,
  ): Promise<void> {
    await this.samlService.updateConnection(id, updates);

    await this.logEvent({
      connectionId: id,
      eventType: SSO_EVENTS.CONNECTION_UPDATED,
      success: true,
      metadata: { updatedFields: Object.keys(updates) },
    });
  }

  /**
   * Delete an SSO connection
   */
  async deleteConnection(id: string): Promise<void> {
    const connection = await this.getConnection(id);
    if (!connection) {
      throw new Error("Connection not found");
    }

    await this.samlService.removeConnection(id);

    await this.logEvent({
      connectionId: id,
      eventType: SSO_EVENTS.CONNECTION_DELETED,
      success: true,
      metadata: { provider: connection.provider, name: connection.name },
    });
  }

  // --------------------------------------------------------------------------
  // Login Flow
  // --------------------------------------------------------------------------

  /**
   * Initiate SSO login
   * Returns the IdP redirect URL
   */
  async initiateLogin(options: SSOLoginOptions): Promise<{
    loginUrl: string;
    connectionId: string;
    connectionName: string;
    provider: SSOProvider;
  }> {
    let connection: SSOConnection | undefined;

    if (options.connectionId) {
      connection = await this.getConnection(options.connectionId);
    } else if (options.email) {
      connection = await this.getConnectionByEmail(options.email);
    }

    if (!connection) {
      throw new Error("No SSO connection found");
    }

    if (!connection.enabled) {
      throw new Error("SSO connection is disabled");
    }

    // Build relay state with return URL and connection ID
    const relayState = Buffer.from(
      JSON.stringify({
        connectionId: connection.id,
        returnUrl: options.returnUrl || "/chat",
        timestamp: Date.now(),
      }),
    ).toString("base64");

    const loginUrl = await this.samlService.initiateLogin(
      connection.id,
      relayState,
    );

    await this.logEvent({
      connectionId: connection.id,
      eventType: SSO_EVENTS.LOGIN_INITIATED,
      email: options.email,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      success: true,
    });

    addSentryBreadcrumb("sso", "SSO login initiated", {
      connectionId: connection.id,
      provider: connection.provider,
    });

    return {
      loginUrl,
      connectionId: connection.id,
      connectionName: connection.name,
      provider: connection.provider,
    };
  }

  /**
   * Process SSO callback (SAML assertion)
   */
  async processCallback(
    options: SSOCallbackOptions,
  ): Promise<SSOLoginResult & { session?: SSOSession }> {
    let connectionId = options.connectionId;

    // Extract connection ID from relay state if not provided
    if (!connectionId && options.relayState) {
      try {
        const relayData = JSON.parse(
          Buffer.from(options.relayState, "base64").toString(),
        );
        connectionId = relayData.connectionId;
      } catch {
        // Relay state parsing failed
      }
    }

    if (!connectionId) {
      const result: SSOLoginResult = {
        success: false,
        error: "Missing connection ID",
        errorCode: "CONFIGURATION_ERROR",
      };

      await this.logEvent({
        eventType: SSO_EVENTS.LOGIN_FAILED,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        success: false,
        errorCode: "CONFIGURATION_ERROR",
        errorMessage: "Missing connection ID",
      });

      return result;
    }

    // Process the SAML assertion
    const result = await this.samlService.processAssertion(
      connectionId,
      options.samlResponse,
    );

    if (!result.success) {
      await this.logEvent({
        connectionId,
        eventType: SSO_EVENTS.LOGIN_FAILED,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        success: false,
        errorCode: result.errorCode,
        errorMessage: result.error,
      });

      return result;
    }

    // Create SSO session
    let session: SSOSession | undefined;

    if (result.user) {
      try {
        const { data } = await apolloClient.mutate({
          mutation: CREATE_SSO_SESSION,
          variables: {
            userId: result.user.id,
            connectionId,
            nameId: result.assertion?.nameId,
            sessionIndex: result.assertion?.sessionIndex,
            expiresAt: result.assertion?.notOnOrAfter?.toISOString(),
          },
        });

        const connection = await this.getConnection(connectionId);

        if (data?.insert_nchat_sso_sessions_one) {
          session = {
            id: data.insert_nchat_sso_sessions_one.id,
            connectionId,
            connectionName: connection?.name || "Unknown",
            provider: connection?.provider || "generic-saml",
            nameId: result.assertion?.nameId,
            authenticatedAt: new Date(
              data.insert_nchat_sso_sessions_one.authenticated_at,
            ),
            lastActivityAt: new Date(),
            expiresAt: result.assertion?.notOnOrAfter,
          };
        }
      } catch (error) {
        logger.error("Failed to create SSO session", error);
      }

      // Log success and potential provisioning
      await this.logEvent({
        connectionId,
        userId: result.user.id,
        eventType: SSO_EVENTS.LOGIN_SUCCESS,
        email: result.user.email,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        success: true,
        metadata: { isNewUser: result.user.isNewUser },
      });

      if (result.user.isNewUser) {
        await this.logEvent({
          connectionId,
          userId: result.user.id,
          eventType: SSO_EVENTS.USER_PROVISIONED,
          email: result.user.email,
          success: true,
          metadata: { role: result.user.role },
        });
      }
    }

    return { ...result, session };
  }

  // --------------------------------------------------------------------------
  // Logout
  // --------------------------------------------------------------------------

  /**
   * Log out user from SSO session
   * Returns SLO URL if supported by the IdP for redirect-based SLO
   */
  async logout(
    userId: string,
    connectionId: string,
    options?: { ipAddress?: string; userAgent?: string; returnUrl?: string },
  ): Promise<{ sloUrl?: string; sloSupported: boolean }> {
    // Fetch session details needed for SLO (nameId and sessionIndex)
    let sessionData: {
      nameId?: string;
      sessionIndex?: string;
      connection?: {
        config?: SAMLConfiguration;
      };
    } | null = null;

    try {
      const { data } = await apolloClient.query({
        query: GET_SSO_SESSION_FOR_LOGOUT,
        variables: { userId, connectionId },
        fetchPolicy: "network-only",
      });

      if (data?.nchat_sso_sessions?.[0]) {
        const session = data.nchat_sso_sessions[0];
        sessionData = {
          nameId: session.name_id,
          sessionIndex: session.session_index,
          connection: session.connection,
        };
      }
    } catch (error) {
      logger.error("Failed to fetch SSO session for logout", error);
    }

    // Invalidate the SSO session locally
    try {
      await apolloClient.mutate({
        mutation: INVALIDATE_SSO_SESSION,
        variables: { userId, connectionId },
      });
    } catch (error) {
      logger.error("Failed to invalidate SSO session", error);
    }

    await this.logEvent({
      connectionId,
      userId,
      eventType: SSO_EVENTS.LOGOUT,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      success: true,
    });

    // Generate SAML Single Logout (SLO) URL if IdP supports it
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      return { sloSupported: false };
    }

    const { config } = connection;

    // Check if SLO is supported by the IdP
    if (!config.idpSloUrl) {
      addSentryBreadcrumb(
        "sso",
        "SLO not supported by IdP - no idpSloUrl configured",
        {
          connectionId,
          provider: connection.provider,
        },
      );
      return { sloSupported: false };
    }

    // Build the SAML LogoutRequest
    try {
      const sloUrl = await this.samlService.buildLogoutRequest(
        connection,
        sessionData?.nameId,
        sessionData?.sessionIndex,
        options?.returnUrl,
      );

      addSentryBreadcrumb("sso", "SAML SLO URL generated", {
        connectionId,
        provider: connection.provider,
        hasNameId: !!sessionData?.nameId,
        hasSessionIndex: !!sessionData?.sessionIndex,
      });

      return { sloUrl, sloSupported: true };
    } catch (error) {
      logger.error("Failed to generate SAML SLO URL", error);
      captureError(error as Error, {
        tags: { context: "sso-logout-slo" },
        extra: { connectionId, userId },
      });
      return { sloSupported: true }; // SLO is supported but request generation failed
    }
  }

  // --------------------------------------------------------------------------
  // Session Management
  // --------------------------------------------------------------------------

  /**
   * Get active SSO sessions for a user
   */
  async getUserSessions(userId: string): Promise<SSOSession[]> {
    const { data } = await apolloClient.query({
      query: GET_USER_SSO_SESSIONS,
      variables: { userId },
      fetchPolicy: "network-only",
    });

    if (!data?.nchat_sso_sessions) {
      return [];
    }

    return data.nchat_sso_sessions.map((session: Record<string, unknown>) => ({
      id: session.id as string,
      connectionId: session.connection_id as string,
      connectionName:
        ((session.connection as Record<string, unknown>)?.name as string) ||
        "Unknown",
      provider: ((session.connection as Record<string, unknown>)?.provider ||
        "generic-saml") as SSOProvider,
      nameId: session.name_id as string | undefined,
      sessionIndex: session.session_index as string | undefined,
      authenticatedAt: new Date(session.authenticated_at as string),
      lastActivityAt: new Date(session.last_activity_at as string),
      expiresAt: session.expires_at
        ? new Date(session.expires_at as string)
        : undefined,
    }));
  }

  // --------------------------------------------------------------------------
  // Audit Logging
  // --------------------------------------------------------------------------

  /**
   * Get SSO audit logs
   */
  async getAuditLogs(options?: {
    connectionId?: string;
    userId?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  }): Promise<SSOAuditLogEntry[]> {
    const { data } = await apolloClient.query({
      query: GET_SSO_AUDIT_LOGS,
      variables: {
        connectionId: options?.connectionId,
        userId: options?.userId,
        eventType: options?.eventType,
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
      },
      fetchPolicy: "network-only",
    });

    if (!data?.nchat_sso_audit_log) {
      return [];
    }

    return data.nchat_sso_audit_log.map((entry: Record<string, unknown>) => ({
      id: entry.id as string,
      connectionId: entry.connection_id as string | undefined,
      userId: entry.user_id as string | undefined,
      eventType: entry.event_type as string,
      email: entry.email as string | undefined,
      ipAddress: entry.ip_address as string | undefined,
      success: entry.success as boolean,
      errorCode: entry.error_code as string | undefined,
      errorMessage: entry.error_message as string | undefined,
      metadata: entry.metadata as Record<string, unknown> | undefined,
      createdAt: new Date(entry.created_at as string),
    }));
  }

  /**
   * Log an SSO event to the audit log
   */
  private async logEvent(event: {
    connectionId?: string;
    userId?: string;
    eventType: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: LOG_SSO_EVENT,
        variables: {
          connectionId: event.connectionId,
          userId: event.userId,
          eventType: event.eventType,
          email: event.email,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          success: event.success,
          errorCode: event.errorCode,
          errorMessage: event.errorMessage,
          metadata: event.metadata || {},
        },
      });
    } catch (error) {
      // Don't throw on audit log failures
      logger.error("Failed to log SSO event", error);
      captureError(error as Error, {
        tags: { context: "sso-audit-log" },
        extra: { event },
      });
    }
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  /**
   * Generate SP metadata XML for a connection
   */
  async getSPMetadata(connectionId: string): Promise<string> {
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }

    return this.samlService.generateSPMetadata(connection);
  }

  /**
   * Test an SSO connection configuration
   */
  async testConnection(connectionId: string): Promise<{
    success: boolean;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const { testSSOConnection } = await import("@/lib/auth/saml");
    return testSSOConnection(connectionId);
  }

  /**
   * Validate SAML configuration
   */
  validateConfiguration(config: SAMLConfiguration): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.idpEntityId) errors.push("IdP Entity ID is required");
    if (!config.idpSsoUrl) errors.push("IdP SSO URL is required");
    if (!config.idpCertificate) errors.push("IdP Certificate is required");
    if (!config.spEntityId) errors.push("SP Entity ID is required");
    if (!config.spAssertionConsumerUrl) errors.push("SP ACS URL is required");
    if (!config.attributeMapping?.email)
      errors.push("Email attribute mapping is required");

    // Validate URL formats
    if (config.idpSsoUrl && !this.isValidUrl(config.idpSsoUrl)) {
      errors.push("IdP SSO URL is not a valid URL");
    }
    if (
      config.spAssertionConsumerUrl &&
      !this.isValidUrl(config.spAssertionConsumerUrl)
    ) {
      errors.push("SP ACS URL is not a valid URL");
    }

    // Validate certificate format
    if (
      config.idpCertificate &&
      !this.isValidCertificate(config.idpCertificate)
    ) {
      errors.push("IdP Certificate is not in valid PEM format");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidCertificate(cert: string): boolean {
    // Check for PEM format (base64 between BEGIN/END markers)
    const pemRegex =
      /-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/;
    return pemRegex.test(cert) || cert.match(/^[A-Za-z0-9+/=\s]+$/) !== null;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let ssoServiceInstance: SSOService | null = null;

export function getSSOService(): SSOService {
  if (!ssoServiceInstance) {
    ssoServiceInstance = new SSOService();
  }
  return ssoServiceInstance;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if SSO is available for an email domain
 */
export async function isSSOAvailable(email: string): Promise<boolean> {
  const service = getSSOService();
  const connection = await service.getConnectionByEmail(email);
  return !!connection?.enabled;
}

/**
 * Get SSO connection info for display
 */
export async function getSSOConnectionInfo(email: string): Promise<{
  available: boolean;
  connectionName?: string;
  provider?: SSOProvider;
} | null> {
  const service = getSSOService();
  const connection = await service.getConnectionByEmail(email);

  if (!connection?.enabled) {
    return { available: false };
  }

  return {
    available: true,
    connectionName: connection.name,
    provider: connection.provider,
  };
}
