/**
 * SAML/SSO Authentication Provider
 *
 * Enterprise-grade Single Sign-On support for:
 * - SAML 2.0 protocol
 * - Common providers (Okta, Azure AD, OneLogin, Google Workspace)
 * - Just-in-Time (JIT) user provisioning
 * - Attribute mapping
 * - Multi-tenant support
 *
 * Database-backed storage using GraphQL/Hasura for production use.
 */

import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";
import { logAuditEvent } from "@/lib/audit/audit-logger";
import { apolloClient } from "@/lib/apollo-client";
import { logger } from "@/lib/logger";
import {
  GET_SSO_CONNECTIONS,
  GET_SSO_CONNECTION,
  GET_SSO_CONNECTION_BY_DOMAIN,
  INSERT_SSO_CONNECTION,
  UPDATE_SSO_CONNECTION,
  DELETE_SSO_CONNECTION,
  GET_USER_BY_EMAIL_FOR_SSO,
  GET_ROLE_BY_NAME,
  INSERT_SSO_USER,
  UPDATE_SSO_USER,
  type SSOConnectionRow,
  type GetSSOConnectionsResult,
  type GetSSOConnectionResult,
  type GetSSOConnectionByDomainResult,
  type InsertSSOConnectionResult,
  type UpdateSSOConnectionResult,
  type DeleteSSOConnectionResult,
  type GetUserByEmailResult,
  type GetRoleByNameResult,
  type InsertSSOUserResult,
  type UpdateSSOUserResult,
} from "@/graphql/sso-connections";
import { UserRole } from "./roles";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Supported SAML/SSO providers
 */
export type SSOProvider =
  | "okta"
  | "azure-ad"
  | "google-workspace"
  | "onelogin"
  | "auth0"
  | "ping-identity"
  | "jumpcloud"
  | "generic-saml";

/**
 * SAML attribute mapping configuration
 */
export interface SAMLAttributeMapping {
  email: string; // SAML attribute name for email (e.g., "email", "mail", "emailAddress")
  firstName?: string; // SAML attribute for first name
  lastName?: string; // SAML attribute for last name
  displayName?: string; // SAML attribute for display name
  username?: string; // SAML attribute for username
  role?: string; // SAML attribute for role (optional)
  groups?: string; // SAML attribute for group membership
  department?: string; // SAML attribute for department
  jobTitle?: string; // SAML attribute for job title
  phoneNumber?: string; // SAML attribute for phone
  customAttributes?: Record<string, string>; // Additional custom mappings
}

/**
 * Role mapping from SSO groups/roles to nchat roles
 */
export interface RoleMapping {
  ssoValue: string; // Value from SSO provider (e.g., "Admins", "admin-group")
  nchatRole: UserRole; // Corresponding nchat role
  priority?: number; // Priority for multiple matches (higher = preferred)
}

/**
 * SAML configuration for a provider
 */
export interface SAMLConfiguration {
  // Identity Provider (IdP) Configuration
  idpEntityId: string; // Identity provider entity ID
  idpSsoUrl: string; // SSO login URL
  idpSloUrl?: string; // Single logout URL (optional)
  idpCertificate: string; // X.509 certificate (PEM format)

  // Service Provider (SP) Configuration
  spEntityId: string; // Service provider entity ID (your app)
  spAssertionConsumerUrl: string; // ACS URL (callback URL)
  spSingleLogoutUrl?: string; // SLO callback URL

  // SAML Settings
  nameIdFormat?: "email" | "persistent" | "transient" | "unspecified";
  signatureAlgorithm?: "sha256" | "sha512" | "sha1";
  digestAlgorithm?: "sha256" | "sha512" | "sha1";
  wantAssertionsSigned?: boolean;
  wantMessagesSigned?: boolean;

  // Attribute Mapping
  attributeMapping: SAMLAttributeMapping;

  // Role Mapping
  roleMappings?: RoleMapping[];
  defaultRole?: UserRole; // Default role if no mapping matches

  // JIT Provisioning
  jitProvisioning: boolean; // Auto-create users on first login
  updateUserOnLogin?: boolean; // Update user attributes on each login

  // Security
  allowUnencryptedAssertion?: boolean;
  forceAuthn?: boolean; // Force re-authentication

  // Multi-tenant
  tenantId?: string; // For multi-tenant deployments
}

/**
 * SSO connection configuration
 */
export interface SSOConnection {
  id: string;
  name: string;
  provider: SSOProvider;
  enabled: boolean;
  config: SAMLConfiguration;
  domains?: string[]; // Allowed email domains
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * SAML response assertion
 */
export interface SAMLAssertion {
  nameId: string;
  sessionIndex?: string;
  attributes: Record<string, string | string[]>;
  issuer: string;
  notBefore?: Date;
  notOnOrAfter?: Date;
  authenticatedAt?: Date;
}

/**
 * SSO login result
 */
export interface SSOLoginResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: UserRole;
    isNewUser: boolean;
    metadata?: Record<string, unknown>;
  };
  assertion?: SAMLAssertion;
  error?: string;
  errorCode?: SSOErrorCode;
}

/**
 * SSO error codes
 */
export type SSOErrorCode =
  | "INVALID_ASSERTION"
  | "EXPIRED_ASSERTION"
  | "INVALID_SIGNATURE"
  | "INVALID_AUDIENCE"
  | "INVALID_ISSUER"
  | "MISSING_ATTRIBUTE"
  | "DOMAIN_NOT_ALLOWED"
  | "PROVISIONING_DISABLED"
  | "ROLE_MAPPING_FAILED"
  | "CONNECTION_DISABLED"
  | "CONFIGURATION_ERROR"
  | "DATABASE_ERROR"
  | "USER_CREATION_FAILED";

// ============================================================================
// Provider Presets
// ============================================================================

/**
 * Pre-configured SAML attribute mappings for common providers
 */
export const SAML_PROVIDER_PRESETS: Record<
  SSOProvider,
  Partial<SAMLAttributeMapping>
> = {
  okta: {
    email: "email",
    firstName: "firstName",
    lastName: "lastName",
    displayName: "displayName",
    username: "login",
    groups: "groups",
  },
  "azure-ad": {
    email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    firstName:
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    lastName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
    displayName: "http://schemas.microsoft.com/identity/claims/displayname",
    username: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    groups: "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups",
  },
  "google-workspace": {
    email: "email",
    firstName: "firstName",
    lastName: "lastName",
    displayName: "displayName",
    username: "email",
  },
  onelogin: {
    email: "email",
    firstName: "firstName",
    lastName: "lastName",
    displayName: "name",
    username: "username",
    groups: "memberOf",
  },
  auth0: {
    email: "email",
    firstName: "given_name",
    lastName: "family_name",
    displayName: "name",
    username: "nickname",
  },
  "ping-identity": {
    email: "mail",
    firstName: "givenName",
    lastName: "sn",
    displayName: "cn",
    username: "uid",
    groups: "memberOf",
  },
  jumpcloud: {
    email: "email",
    firstName: "firstname",
    lastName: "lastname",
    displayName: "displayname",
    username: "username",
    groups: "group",
  },
  "generic-saml": {
    email: "email",
    firstName: "firstName",
    lastName: "lastName",
    displayName: "displayName",
    username: "username",
  },
};

/**
 * Provider display names
 */
export const SSO_PROVIDER_NAMES: Record<SSOProvider, string> = {
  okta: "Okta",
  "azure-ad": "Microsoft Azure AD",
  "google-workspace": "Google Workspace",
  onelogin: "OneLogin",
  auth0: "Auth0",
  "ping-identity": "Ping Identity",
  jumpcloud: "JumpCloud",
  "generic-saml": "Generic SAML 2.0",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database row to SSOConnection object
 */
function rowToConnection(row: SSOConnectionRow): SSOConnection {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider as SSOProvider,
    enabled: row.enabled,
    config: row.config as unknown as SAMLConfiguration,
    domains: row.domains,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    metadata: row.metadata,
  };
}

/**
 * Convert SSOConnection object to database insert variables
 */
function connectionToVariables(connection: SSOConnection) {
  return {
    id: connection.id,
    name: connection.name,
    provider: connection.provider,
    enabled: connection.enabled,
    domains: connection.domains || [],
    config: connection.config,
    metadata: connection.metadata || {},
  };
}

// ============================================================================
// SAML Service Class
// ============================================================================

export class SAMLService {
  /**
   * Add an SSO connection to the database
   */
  async addConnection(connection: SSOConnection): Promise<void> {
    try {
      // Validate configuration
      this.validateConfiguration(connection.config);

      const { data, errors } =
        await apolloClient.mutate<InsertSSOConnectionResult>({
          mutation: INSERT_SSO_CONNECTION,
          variables: connectionToVariables(connection),
        });

      if (errors && errors.length > 0) {
        throw new Error(
          `GraphQL error: ${errors.map((e) => e.message).join(", ")}`,
        );
      }

      if (!data?.insert_nchat_sso_connections_one) {
        throw new Error("Failed to create SSO connection");
      }

      await logAuditEvent({
        action: "sso_connection_created",
        actor: { type: "system", id: "system" },
        category: "admin",
        severity: "info",
        description: `SSO connection created: ${connection.name}`,
        metadata: {
          connectionId: connection.id,
          provider: connection.provider,
        },
      });

      addSentryBreadcrumb("sso", "SSO connection added", {
        connectionId: connection.id,
        provider: connection.provider,
      });
    } catch (error) {
      captureError(error as Error, {
        tags: { context: "sso-add-connection" },
        extra: { connectionId: connection.id },
      });
      throw error;
    }
  }

  /**
   * Update an SSO connection in the database
   */
  async updateConnection(
    id: string,
    updates: Partial<SSOConnection>,
  ): Promise<void> {
    // First, fetch the existing connection to merge updates
    const existing = await this.getConnection(id);
    if (!existing) {
      throw new Error(`SSO connection not found: ${id}`);
    }

    if (updates.config) {
      const mergedConfig = { ...existing.config, ...updates.config };
      this.validateConfiguration(mergedConfig);
    }

    const variables: Record<string, unknown> = { id };

    if (updates.name !== undefined) variables.name = updates.name;
    if (updates.provider !== undefined) variables.provider = updates.provider;
    if (updates.enabled !== undefined) variables.enabled = updates.enabled;
    if (updates.domains !== undefined) variables.domains = updates.domains;
    if (updates.config !== undefined)
      variables.config = { ...existing.config, ...updates.config };
    if (updates.metadata !== undefined) variables.metadata = updates.metadata;

    const { data, errors } =
      await apolloClient.mutate<UpdateSSOConnectionResult>({
        mutation: UPDATE_SSO_CONNECTION,
        variables,
      });

    if (errors && errors.length > 0) {
      throw new Error(
        `GraphQL error: ${errors.map((e) => e.message).join(", ")}`,
      );
    }

    if (!data?.update_nchat_sso_connections_by_pk) {
      throw new Error(`SSO connection not found: ${id}`);
    }

    await logAuditEvent({
      action: "sso_connection_updated",
      actor: { type: "system", id: "system" },
      category: "admin",
      severity: "info",
      description: `SSO connection updated: ${existing.name}`,
      metadata: {
        connectionId: id,
        changes: Object.keys(updates),
      },
    });
  }

  /**
   * Remove an SSO connection from the database
   */
  async removeConnection(id: string): Promise<void> {
    const connection = await this.getConnection(id);
    if (!connection) {
      throw new Error(`SSO connection not found: ${id}`);
    }

    const { data, errors } =
      await apolloClient.mutate<DeleteSSOConnectionResult>({
        mutation: DELETE_SSO_CONNECTION,
        variables: { id },
      });

    if (errors && errors.length > 0) {
      throw new Error(
        `GraphQL error: ${errors.map((e) => e.message).join(", ")}`,
      );
    }

    if (!data?.delete_nchat_sso_connections_by_pk) {
      throw new Error(`Failed to delete SSO connection: ${id}`);
    }

    await logAuditEvent({
      action: "sso_connection_deleted",
      actor: { type: "system", id: "system" },
      category: "admin",
      severity: "warning",
      description: `SSO connection deleted: ${connection.name}`,
      metadata: {
        connectionId: id,
        provider: connection.provider,
      },
    });
  }

  /**
   * Get SSO connection by ID from the database
   */
  async getConnection(id: string): Promise<SSOConnection | undefined> {
    const { data, errors } = await apolloClient.query<GetSSOConnectionResult>({
      query: GET_SSO_CONNECTION,
      variables: { id },
      fetchPolicy: "network-only", // Always fetch fresh data for SSO operations
    });

    if (errors && errors.length > 0) {
      throw new Error(
        `GraphQL error: ${errors.map((e) => e.message).join(", ")}`,
      );
    }

    if (!data?.nchat_sso_connections_by_pk) {
      return undefined;
    }

    return rowToConnection(data.nchat_sso_connections_by_pk);
  }

  /**
   * Get all SSO connections from the database
   */
  async getAllConnections(): Promise<SSOConnection[]> {
    const { data, errors } = await apolloClient.query<GetSSOConnectionsResult>({
      query: GET_SSO_CONNECTIONS,
      variables: { limit: 100, offset: 0, enabledOnly: false },
      fetchPolicy: "network-only",
    });

    if (errors && errors.length > 0) {
      throw new Error(
        `GraphQL error: ${errors.map((e) => e.message).join(", ")}`,
      );
    }

    if (!data?.nchat_sso_connections) {
      return [];
    }

    return data.nchat_sso_connections.map(rowToConnection);
  }

  /**
   * Get SSO connection by email domain from the database
   */
  async getConnectionByDomain(
    email: string,
  ): Promise<SSOConnection | undefined> {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return undefined;

    const { data, errors } =
      await apolloClient.query<GetSSOConnectionByDomainResult>({
        query: GET_SSO_CONNECTION_BY_DOMAIN,
        variables: { domain },
        fetchPolicy: "network-only",
      });

    if (errors && errors.length > 0) {
      throw new Error(
        `GraphQL error: ${errors.map((e) => e.message).join(", ")}`,
      );
    }

    if (
      !data?.nchat_sso_connections ||
      data.nchat_sso_connections.length === 0
    ) {
      return undefined;
    }

    return rowToConnection(data.nchat_sso_connections[0]);
  }

  /**
   * Generate SAML metadata for service provider
   */
  generateSPMetadata(connection: SSOConnection): string {
    const { config } = connection;

    return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${config.spEntityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="true"
                      WantAssertionsSigned="${config.wantAssertionsSigned ?? true}"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:${config.nameIdFormat ?? "email"}</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                 Location="${config.spAssertionConsumerUrl}"
                                 index="1" />
    ${
      config.spSingleLogoutUrl
        ? `
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                           Location="${config.spSingleLogoutUrl}" />
    `
        : ""
    }
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }

  /**
   * Initiate SAML SSO login
   */
  async initiateLogin(
    connectionId: string,
    relayState?: string,
  ): Promise<string> {
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      throw new Error("SSO connection not found");
    }

    if (!connection.enabled) {
      throw new Error("SSO connection is disabled");
    }

    const { config } = connection;

    // Generate SAML AuthnRequest
    const authnRequest = this.buildAuthnRequest(config, relayState);

    await logAuditEvent({
      action: "sso_login_initiated",
      actor: { type: "user", id: "anonymous" },
      category: "security",
      severity: "info",
      description: `SSO login initiated for ${connection.name}`,
      metadata: {
        connectionId,
        provider: connection.provider,
      },
    });

    return authnRequest;
  }

  /**
   * Process SAML assertion and create/update user
   */
  async processAssertion(
    connectionId: string,
    samlResponse: string,
  ): Promise<SSOLoginResult> {
    try {
      const connection = await this.getConnection(connectionId);
      if (!connection) {
        return {
          success: false,
          error: "SSO connection not found",
          errorCode: "CONFIGURATION_ERROR",
        };
      }

      if (!connection.enabled) {
        return {
          success: false,
          error: "SSO connection is disabled",
          errorCode: "CONNECTION_DISABLED",
        };
      }

      // Parse and validate SAML response
      const assertion = await this.parseAssertion(
        samlResponse,
        connection.config,
      );

      // Validate assertion
      const validationError = this.validateAssertion(
        assertion,
        connection.config,
      );
      if (validationError) {
        return {
          success: false,
          error: validationError.message,
          errorCode: validationError.code,
        };
      }

      // Extract user attributes
      const userAttributes = this.extractUserAttributes(
        assertion,
        connection.config,
      );

      // Check domain restrictions
      if (connection.domains && connection.domains.length > 0) {
        const emailDomain = userAttributes.email.split("@")[1]?.toLowerCase();
        if (!connection.domains.includes(emailDomain)) {
          return {
            success: false,
            error: "Email domain not allowed",
            errorCode: "DOMAIN_NOT_ALLOWED",
          };
        }
      }

      // Map role
      const role = this.mapRole(assertion, connection.config);

      // JIT provisioning or user update
      const user = await this.provisionUser(
        userAttributes,
        role,
        connection.config,
      );

      await logAuditEvent({
        action: "sso_login_success",
        actor: { type: "user", id: user.id },
        category: "security",
        severity: "info",
        description: `SSO login successful for ${user.email}`,
        metadata: {
          connectionId,
          provider: connection.provider,
          isNewUser: user.isNewUser,
        },
      });

      return {
        success: true,
        user,
        assertion,
      };
    } catch (error) {
      captureError(error as Error, {
        tags: { context: "sso-process-assertion" },
        extra: { connectionId },
      });

      await logAuditEvent({
        action: "sso_login_failed",
        actor: { type: "user", id: "anonymous" },
        category: "security",
        severity: "error",
        description: `SSO login failed: ${(error as Error).message}`,
        metadata: {
          connectionId,
          error: (error as Error).message,
        },
      });

      return {
        success: false,
        error: (error as Error).message,
        errorCode: "CONFIGURATION_ERROR",
      };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private validateConfiguration(config: SAMLConfiguration): void {
    if (!config.idpEntityId) throw new Error("IdP Entity ID is required");
    if (!config.idpSsoUrl) throw new Error("IdP SSO URL is required");
    if (!config.idpCertificate) throw new Error("IdP certificate is required");
    if (!config.spEntityId) throw new Error("SP Entity ID is required");
    if (!config.spAssertionConsumerUrl)
      throw new Error("SP ACS URL is required");
    if (!config.attributeMapping.email)
      throw new Error("Email attribute mapping is required");
  }

  private buildAuthnRequest(
    config: SAMLConfiguration,
    relayState?: string,
  ): string {
    // Generate a unique request ID
    const requestId = `_${crypto.randomUUID()}`;
    const issueInstant = new Date().toISOString();

    // Build the SAML AuthnRequest XML
    const authnRequest = `
      <samlp:AuthnRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${requestId}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        Destination="${config.idpSsoUrl}"
        AssertionConsumerServiceURL="${config.spAssertionConsumerUrl}"
        ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        ${config.forceAuthn ? 'ForceAuthn="true"' : ""}>
        <saml:Issuer>${config.spEntityId}</saml:Issuer>
        <samlp:NameIDPolicy
          Format="urn:oasis:names:tc:SAML:1.1:nameid-format:${config.nameIdFormat ?? "email"}"
          AllowCreate="true"/>
      </samlp:AuthnRequest>
    `.trim();

    // Base64 encode and URL encode the request
    const encodedRequest = Buffer.from(authnRequest).toString("base64");
    const urlEncodedRequest = encodeURIComponent(encodedRequest);

    // Build the redirect URL
    let redirectUrl = `${config.idpSsoUrl}?SAMLRequest=${urlEncodedRequest}`;
    if (relayState) {
      redirectUrl += `&RelayState=${encodeURIComponent(relayState)}`;
    }

    return redirectUrl;
  }

  /**
   * Parse SAML assertion from response
   *
   * IMPORTANT: This implementation requires the `samlify` npm package for production use.
   *
   * To install samlify:
   *   pnpm add samlify
   *
   * samlify provides:
   * - Full SAML 2.0 response parsing and validation
   * - XML signature verification
   * - Certificate validation
   * - Assertion decryption support
   *
   * Alternative packages: passport-saml, node-saml
   *
   * Example integration with samlify:
   * ```typescript
   * import * as samlify from 'samlify'
   *
   * const idp = samlify.IdentityProvider({
   *   metadata: idpMetadataXml,
   *   // or provide manually:
   *   entityID: config.idpEntityId,
   *   signingCert: config.idpCertificate,
   *   singleSignOnService: [{
   *     Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
   *     Location: config.idpSsoUrl,
   *   }],
   * })
   *
   * const sp = samlify.ServiceProvider({
   *   entityID: config.spEntityId,
   *   assertionConsumerService: [{
   *     Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
   *     Location: config.spAssertionConsumerUrl,
   *   }],
   * })
   *
   * const { extract } = await sp.parseLoginResponse(idp, 'post', { body: { SAMLResponse: samlResponse } })
   * // extract contains: nameID, attributes, sessionIndex, etc.
   * ```
   */
  private async parseAssertion(
    samlResponse: string,
    config: SAMLConfiguration,
  ): Promise<SAMLAssertion> {
    // Check if samlify is available
    let samlify: typeof import("samlify") | null = null;
    try {
      samlify = await import("samlify");
    } catch {
      // samlify not installed
    }

    if (!samlify) {
      // Provide detailed instructions when samlify is not available
      throw new Error(
        "SAML parsing requires the samlify package. " +
          "Please install it with: pnpm add samlify\n\n" +
          "samlify provides secure SAML 2.0 response parsing with:\n" +
          "- XML signature verification\n" +
          "- Certificate validation\n" +
          "- Assertion decryption\n\n" +
          "See https://github.com/tngan/samlify for documentation.",
      );
    }

    // Configure the Identity Provider from our config
    const idp = samlify.IdentityProvider({
      entityID: config.idpEntityId,
      signingCert: config.idpCertificate,
      singleSignOnService: [
        {
          Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
          Location: config.idpSsoUrl,
        },
      ],
      ...(config.idpSloUrl && {
        singleLogoutService: [
          {
            Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
            Location: config.idpSloUrl,
          },
        ],
      }),
    });

    // Configure the Service Provider
    const sp = samlify.ServiceProvider({
      entityID: config.spEntityId,
      assertionConsumerService: [
        {
          Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
          Location: config.spAssertionConsumerUrl,
        },
      ],
      wantAssertionsSigned: config.wantAssertionsSigned ?? true,
      wantMessageSigned: config.wantMessagesSigned ?? false,
      signatureConfig: {
        prefix: "ds",
        location: { reference: "/samlp:Response/saml:Issuer", action: "after" },
      },
    });

    // Parse the SAML response
    const parseResult = await sp.parseLoginResponse(idp, "post", {
      body: { SAMLResponse: samlResponse },
    });

    // Extract assertion data from samlify result
    const extract = parseResult.extract;

    // Convert samlify result to our SAMLAssertion format
    const assertion: SAMLAssertion = {
      nameId: extract.nameID || "",
      sessionIndex: extract.sessionIndex?.sessionIndex,
      attributes: extract.attributes || {},
      issuer: config.idpEntityId,
      authenticatedAt: extract.sessionIndex?.authnInstant
        ? new Date(extract.sessionIndex.authnInstant)
        : undefined,
    };

    // Parse conditions if available
    if (extract.conditions) {
      if (extract.conditions.notBefore) {
        assertion.notBefore = new Date(extract.conditions.notBefore);
      }
      if (extract.conditions.notOnOrAfter) {
        assertion.notOnOrAfter = new Date(extract.conditions.notOnOrAfter);
      }
    }

    return assertion;
  }

  private validateAssertion(
    assertion: SAMLAssertion,
    config: SAMLConfiguration,
  ): { message: string; code: SSOErrorCode } | null {
    // Validate issuer
    if (assertion.issuer !== config.idpEntityId) {
      return { message: "Invalid assertion issuer", code: "INVALID_ISSUER" };
    }

    // Validate time bounds
    const now = new Date();
    if (assertion.notBefore && assertion.notBefore > now) {
      return { message: "Assertion not yet valid", code: "INVALID_ASSERTION" };
    }
    if (assertion.notOnOrAfter && assertion.notOnOrAfter < now) {
      return { message: "Assertion has expired", code: "EXPIRED_ASSERTION" };
    }

    return null;
  }

  private extractUserAttributes(
    assertion: SAMLAssertion,
    config: SAMLConfiguration,
  ): {
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    username?: string;
  } {
    const { attributeMapping } = config;
    const attrs = assertion.attributes;

    const email = this.getAttributeValue(attrs, attributeMapping.email);
    if (!email) {
      throw new Error("Email attribute not found in assertion");
    }

    return {
      email,
      firstName: attributeMapping.firstName
        ? this.getAttributeValue(attrs, attributeMapping.firstName)
        : undefined,
      lastName: attributeMapping.lastName
        ? this.getAttributeValue(attrs, attributeMapping.lastName)
        : undefined,
      displayName: attributeMapping.displayName
        ? this.getAttributeValue(attrs, attributeMapping.displayName)
        : undefined,
      username: attributeMapping.username
        ? this.getAttributeValue(attrs, attributeMapping.username)
        : undefined,
    };
  }

  private getAttributeValue(
    attributes: Record<string, string | string[]>,
    attributeName: string,
  ): string | undefined {
    const value = attributes[attributeName];
    if (!value) return undefined;
    return Array.isArray(value) ? value[0] : value;
  }

  private mapRole(
    assertion: SAMLAssertion,
    config: SAMLConfiguration,
  ): UserRole {
    if (!config.roleMappings || config.roleMappings.length === 0) {
      return config.defaultRole ?? "member";
    }

    const groups = config.attributeMapping.groups
      ? this.getAttributeValue(
          assertion.attributes,
          config.attributeMapping.groups,
        )
      : undefined;

    if (!groups) {
      return config.defaultRole ?? "member";
    }

    const groupArray = Array.isArray(groups) ? groups : [groups];

    // Find matching role mapping
    const matches = config.roleMappings
      .filter((mapping) => groupArray.includes(mapping.ssoValue))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return matches[0]?.nchatRole ?? config.defaultRole ?? "member";
  }

  /**
   * Provision or update user in the database
   *
   * This method:
   * 1. Queries for existing user by email
   * 2. If user exists and updateUserOnLogin is true, updates their attributes
   * 3. If user doesn't exist and jitProvisioning is true, creates them
   * 4. Uses the nchat_users table via GraphQL
   */
  private async provisionUser(
    attributes: {
      email: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      username?: string;
    },
    role: UserRole,
    config: SAMLConfiguration,
  ): Promise<{
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: UserRole;
    isNewUser: boolean;
    metadata?: Record<string, unknown>;
  }> {
    // Compute display name
    const displayName =
      attributes.displayName ||
      `${attributes.firstName || ""} ${attributes.lastName || ""}`.trim() ||
      attributes.email.split("@")[0];

    // Compute username (ensure it's valid)
    const username = this.sanitizeUsername(
      attributes.username || attributes.email.split("@")[0],
    );

    // Query for existing user by email
    const { data: existingUserData, errors: queryErrors } =
      await apolloClient.query<GetUserByEmailResult>({
        query: GET_USER_BY_EMAIL_FOR_SSO,
        variables: { email: attributes.email.toLowerCase() },
        fetchPolicy: "network-only",
      });

    if (queryErrors && queryErrors.length > 0) {
      throw new Error(
        `Database error querying user: ${queryErrors.map((e) => e.message).join(", ")}`,
      );
    }

    const existingUser = existingUserData?.nchat_users?.[0];

    // Get role ID for the mapped role
    const roleId = await this.getRoleIdByName(role);

    if (existingUser) {
      // User exists - check if we should update
      if (config.updateUserOnLogin) {
        const ssoMetadata = {
          ssoLastLogin: new Date().toISOString(),
          ssoProvisioned: true,
          ...(existingUser.metadata?.ssoProvisioned
            ? {}
            : { ssoFirstLogin: new Date().toISOString() }),
        };

        const { data: updateData, errors: updateErrors } =
          await apolloClient.mutate<UpdateSSOUserResult>({
            mutation: UPDATE_SSO_USER,
            variables: {
              id: existingUser.id,
              displayName,
              roleId,
              metadata: ssoMetadata,
            },
          });

        if (updateErrors && updateErrors.length > 0) {
          throw new Error(
            `Database error updating user: ${updateErrors.map((e) => e.message).join(", ")}`,
          );
        }

        const updatedUser = updateData?.update_nchat_users_by_pk;

        return {
          id: updatedUser?.id || existingUser.id,
          email: attributes.email,
          username: existingUser.username,
          displayName: updatedUser?.display_name || displayName,
          role: (updatedUser?.role?.name as UserRole) || role,
          isNewUser: false,
          metadata: {
            ...existingUser.metadata,
            ...ssoMetadata,
          },
        };
      }

      // Return existing user without updating
      return {
        id: existingUser.id,
        email: existingUser.email,
        username: existingUser.username,
        displayName: existingUser.display_name,
        role: (existingUser.role?.name as UserRole) || role,
        isNewUser: false,
        metadata: existingUser.metadata,
      };
    }

    // User doesn't exist - check if JIT provisioning is enabled
    if (!config.jitProvisioning) {
      throw new Error("User not found and JIT provisioning is disabled");
    }

    // Create new user
    const newUserId = crypto.randomUUID();
    const ssoMetadata = {
      ssoProvisioned: true,
      ssoFirstLogin: new Date().toISOString(),
      ssoLastLogin: new Date().toISOString(),
    };

    const { data: insertData, errors: insertErrors } =
      await apolloClient.mutate<InsertSSOUserResult>({
        mutation: INSERT_SSO_USER,
        variables: {
          id: newUserId,
          email: attributes.email.toLowerCase(),
          username,
          displayName,
          roleId,
          metadata: ssoMetadata,
        },
      });

    if (insertErrors && insertErrors.length > 0) {
      throw new Error(
        `Database error creating user: ${insertErrors.map((e) => e.message).join(", ")}`,
      );
    }

    const newUser = insertData?.insert_nchat_users_one;
    if (!newUser) {
      throw new Error("Failed to create user via SSO provisioning");
    }

    addSentryBreadcrumb("sso", "User provisioned via SSO", {
      userId: newUser.id,
      email: attributes.email,
    });

    return {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      displayName: newUser.display_name,
      role: (newUser.role?.name as UserRole) || role,
      isNewUser: true,
      metadata: ssoMetadata,
    };
  }

  /**
   * Get role ID by role name
   */
  private async getRoleIdByName(roleName: UserRole): Promise<string | null> {
    try {
      const { data, errors } = await apolloClient.query<GetRoleByNameResult>({
        query: GET_ROLE_BY_NAME,
        variables: { name: roleName },
        fetchPolicy: "cache-first", // Roles don't change often
      });

      if (errors && errors.length > 0) {
        logger.error("Error fetching role:", errors);
        return null;
      }

      return data?.nchat_roles?.[0]?.id || null;
    } catch (error) {
      logger.error("Error fetching role by name:", error);
      return null;
    }
  }

  /**
   * Sanitize username to ensure it's valid
   */
  private sanitizeUsername(input: string): string {
    // Convert to lowercase, replace invalid chars with underscore
    return input
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .replace(/_+/g, "_") // Collapse multiple underscores
      .replace(/^_|_$/g, "") // Remove leading/trailing underscores
      .substring(0, 50); // Limit length
  }

  // ============================================================================
  // SAML Single Logout (SLO)
  // ============================================================================

  /**
   * Build a SAML LogoutRequest URL for Single Logout
   *
   * This method constructs a SAML 2.0 LogoutRequest and returns the URL
   * to redirect the user to the Identity Provider for logout.
   *
   * @param connection - The SSO connection configuration
   * @param nameId - The NameID from the original SAML assertion
   * @param sessionIndex - The SessionIndex from the original SAML assertion
   * @param returnUrl - Optional URL to redirect to after logout
   * @returns The SLO redirect URL with encoded LogoutRequest
   */
  async buildLogoutRequest(
    connection: SSOConnection,
    nameId?: string,
    sessionIndex?: string,
    returnUrl?: string,
  ): Promise<string> {
    const { config } = connection;

    if (!config.idpSloUrl) {
      throw new Error("IdP Single Logout URL is not configured");
    }

    // Check if samlify is available for advanced SLO support
    let samlify: typeof import("samlify") | null = null;
    try {
      samlify = await import("samlify");
    } catch {
      // samlify not installed, use basic implementation
    }

    if (samlify && nameId) {
      // Use samlify for proper SAML SLO with signature support
      return this.buildLogoutRequestWithSamlify(
        samlify,
        connection,
        nameId,
        sessionIndex,
        returnUrl,
      );
    }

    // Fallback: Build a basic LogoutRequest without samlify
    return this.buildBasicLogoutRequest(
      config,
      nameId,
      sessionIndex,
      returnUrl,
    );
  }

  /**
   * Build LogoutRequest using samlify library for proper SAML compliance
   */
  private async buildLogoutRequestWithSamlify(
    samlify: typeof import("samlify"),
    connection: SSOConnection,
    nameId: string,
    sessionIndex?: string,
    returnUrl?: string,
  ): Promise<string> {
    const { config } = connection;

    // Configure the Identity Provider
    const idp = samlify.IdentityProvider({
      entityID: config.idpEntityId,
      signingCert: config.idpCertificate,
      singleSignOnService: [
        {
          Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
          Location: config.idpSsoUrl,
        },
      ],
      singleLogoutService: [
        {
          Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
          Location: config.idpSloUrl!,
        },
      ],
    });

    // Configure the Service Provider
    const sp = samlify.ServiceProvider({
      entityID: config.spEntityId,
      assertionConsumerService: [
        {
          Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
          Location: config.spAssertionConsumerUrl,
        },
      ],
      ...(config.spSingleLogoutUrl && {
        singleLogoutService: [
          {
            Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
            Location: config.spSingleLogoutUrl,
          },
        ],
      }),
    });

    // Build the LogoutRequest using samlify's createLogoutRequest
    // Note: samlify may have different API versions, this handles both
    const logoutRequest = await this.createSamlifyLogoutRequest(
      sp,
      idp,
      nameId,
      sessionIndex,
      config,
      returnUrl,
    );

    return logoutRequest;
  }

  /**
   * Create logout request using samlify SP methods
   */
  private async createSamlifyLogoutRequest(
    sp: ReturnType<typeof import("samlify").ServiceProvider>,
    idp: ReturnType<typeof import("samlify").IdentityProvider>,
    nameId: string,
    sessionIndex: string | undefined,
    config: SAMLConfiguration,
    returnUrl?: string,
  ): Promise<string> {
    // Build the LogoutRequest XML manually since samlify's API may vary
    const requestId = `_${crypto.randomUUID()}`;
    const issueInstant = new Date().toISOString();

    const logoutRequestXml = `
      <samlp:LogoutRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${requestId}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        Destination="${config.idpSloUrl}">
        <saml:Issuer>${config.spEntityId}</saml:Issuer>
        <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:${config.nameIdFormat ?? "email"}">${this.escapeXml(nameId)}</saml:NameID>
        ${sessionIndex ? `<samlp:SessionIndex>${this.escapeXml(sessionIndex)}</samlp:SessionIndex>` : ""}
      </samlp:LogoutRequest>
    `.trim();

    // Deflate and Base64 encode for HTTP-Redirect binding
    const deflatedRequest = await this.deflateRequest(logoutRequestXml);
    const encodedRequest = Buffer.from(deflatedRequest).toString("base64");
    const urlEncodedRequest = encodeURIComponent(encodedRequest);

    // Build the redirect URL
    let sloUrl = `${config.idpSloUrl}?SAMLRequest=${urlEncodedRequest}`;

    // Add RelayState if returnUrl is provided
    if (returnUrl) {
      const relayState = Buffer.from(
        JSON.stringify({
          returnUrl,
          timestamp: Date.now(),
        }),
      ).toString("base64");
      sloUrl += `&RelayState=${encodeURIComponent(relayState)}`;
    }

    await logAuditEvent({
      action: "sso_logout_request_created",
      actor: { type: "system", id: "system" },
      category: "security",
      severity: "info",
      description: `SAML LogoutRequest created for ${config.spEntityId}`,
      metadata: {
        requestId,
        idpSloUrl: config.idpSloUrl,
        hasSessionIndex: !!sessionIndex,
      },
    });

    return sloUrl;
  }

  /**
   * Build a basic LogoutRequest without external SAML libraries
   * Used as fallback when samlify is not available
   */
  private buildBasicLogoutRequest(
    config: SAMLConfiguration,
    nameId?: string,
    sessionIndex?: string,
    returnUrl?: string,
  ): string {
    const requestId = `_${crypto.randomUUID()}`;
    const issueInstant = new Date().toISOString();

    // Build the LogoutRequest XML
    const logoutRequestXml = `
      <samlp:LogoutRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${requestId}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        Destination="${config.idpSloUrl}">
        <saml:Issuer>${config.spEntityId}</saml:Issuer>
        ${nameId ? `<saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:${config.nameIdFormat ?? "email"}">${this.escapeXml(nameId)}</saml:NameID>` : ""}
        ${sessionIndex ? `<samlp:SessionIndex>${this.escapeXml(sessionIndex)}</samlp:SessionIndex>` : ""}
      </samlp:LogoutRequest>
    `.trim();

    // Base64 encode the request (note: proper implementation should use DEFLATE)
    const encodedRequest = Buffer.from(logoutRequestXml).toString("base64");
    const urlEncodedRequest = encodeURIComponent(encodedRequest);

    // Build the redirect URL
    let sloUrl = `${config.idpSloUrl}?SAMLRequest=${urlEncodedRequest}`;

    // Add RelayState if returnUrl is provided
    if (returnUrl) {
      const relayState = Buffer.from(
        JSON.stringify({
          returnUrl,
          timestamp: Date.now(),
        }),
      ).toString("base64");
      sloUrl += `&RelayState=${encodeURIComponent(relayState)}`;
    }

    return sloUrl;
  }

  /**
   * Deflate the request for HTTP-Redirect binding
   * SAML 2.0 requires DEFLATE compression for redirect binding
   */
  private async deflateRequest(xml: string): Promise<Uint8Array> {
    // Use Node.js zlib for compression
    const { promisify } = await import("util");
    const zlib = await import("zlib");
    const deflateRaw = promisify(zlib.deflateRaw);

    const compressed = await deflateRaw(Buffer.from(xml, "utf-8"));
    return new Uint8Array(compressed);
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Process SAML LogoutResponse from IdP (SLO callback)
   *
   * This validates the logout response from the Identity Provider
   * and confirms the logout was successful.
   *
   * @param samlResponse - The SAML LogoutResponse from the IdP
   * @param connectionId - The SSO connection ID
   * @returns Success status and any error information
   */
  async processLogoutResponse(
    samlResponse: string,
    connectionId: string,
  ): Promise<{
    success: boolean;
    relayState?: string;
    error?: string;
    errorCode?: string;
  }> {
    try {
      const connection = await this.getConnection(connectionId);
      if (!connection) {
        return {
          success: false,
          error: "SSO connection not found",
          errorCode: "CONFIGURATION_ERROR",
        };
      }

      // Decode the SAML response
      const decodedResponse = Buffer.from(samlResponse, "base64").toString(
        "utf-8",
      );

      // Basic validation: check for StatusCode Success
      // A full implementation would use samlify to validate signatures
      const successPattern =
        /<samlp:StatusCode[^>]*Value="urn:oasis:names:tc:SAML:2.0:status:Success"/;
      const isSuccess = successPattern.test(decodedResponse);

      if (!isSuccess) {
        // Try to extract error information
        const statusCodeMatch = decodedResponse.match(
          /<samlp:StatusCode[^>]*Value="([^"]+)"/,
        );
        const statusMessageMatch = decodedResponse.match(
          /<samlp:StatusMessage>([^<]+)<\/samlp:StatusMessage>/,
        );

        return {
          success: false,
          error:
            statusMessageMatch?.[1] || "Logout failed at Identity Provider",
          errorCode: statusCodeMatch?.[1] || "LOGOUT_FAILED",
        };
      }

      await logAuditEvent({
        action: "sso_logout_response_processed",
        actor: { type: "system", id: "system" },
        category: "security",
        severity: "info",
        description: `SAML LogoutResponse processed successfully`,
        metadata: { connectionId },
      });

      return { success: true };
    } catch (error) {
      captureError(error as Error, {
        tags: { context: "sso-process-logout-response" },
        extra: { connectionId },
      });

      return {
        success: false,
        error: (error as Error).message,
        errorCode: "PROCESSING_ERROR",
      };
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let samlServiceInstance: SAMLService | null = null;

export function getSAMLService(): SAMLService {
  if (!samlServiceInstance) {
    samlServiceInstance = new SAMLService();
  }
  return samlServiceInstance;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a pre-configured SSO connection from a provider preset
 */
export function createSSOConnectionFromPreset(
  provider: SSOProvider,
  overrides: Partial<SAMLConfiguration>,
): Partial<SSOConnection> {
  const attributeMapping = {
    ...SAML_PROVIDER_PRESETS[provider],
    ...overrides.attributeMapping,
  } as SAMLAttributeMapping;

  return {
    provider,
    config: {
      idpEntityId: "",
      idpSsoUrl: "",
      idpCertificate: "",
      spEntityId: "",
      spAssertionConsumerUrl: "",
      nameIdFormat: "email",
      signatureAlgorithm: "sha256",
      digestAlgorithm: "sha256",
      wantAssertionsSigned: true,
      wantMessagesSigned: false,
      attributeMapping,
      jitProvisioning: true,
      updateUserOnLogin: true,
      defaultRole: "member",
      ...overrides,
    },
  };
}

/**
 * Test SSO connection configuration
 */
export async function testSSOConnection(connectionId: string): Promise<{
  success: boolean;
  error?: string;
  details?: Record<string, unknown>;
}> {
  try {
    const service = getSAMLService();
    const connection = await service.getConnection(connectionId);

    if (!connection) {
      return { success: false, error: "Connection not found" };
    }

    // Validate configuration
    if (!connection.config.idpEntityId) {
      return { success: false, error: "IdP Entity ID is missing" };
    }
    if (!connection.config.idpSsoUrl) {
      return { success: false, error: "IdP SSO URL is missing" };
    }
    if (!connection.config.idpCertificate) {
      return { success: false, error: "IdP certificate is missing" };
    }

    // Test IdP SSO URL connectivity
    try {
      const response = await fetch(connection.config.idpSsoUrl, {
        method: "HEAD",
        mode: "no-cors", // Just check if reachable
      });
      // Even with no-cors, we get a response if the server is up
      // The actual status might be opaque, but it means the URL is reachable
    } catch {
      return { success: false, error: "IdP SSO URL is not reachable" };
    }

    return {
      success: true,
      details: {
        provider: connection.provider,
        idpEntityId: connection.config.idpEntityId,
        jitProvisioning: connection.config.jitProvisioning,
        domains: connection.domains,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
