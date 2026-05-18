/**
 * SSO Connections API Route
 *
 * Manages SAML/SSO connections for enterprise single sign-on.
 *
 * GET /api/auth/sso - List all SSO connections
 * POST /api/auth/sso - Create a new SSO connection
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSAMLService,
  createSSOConnectionFromPreset,
  type SSOProvider,
} from "@/lib/auth/saml";
import { withErrorHandler, compose, withAdmin } from "@/lib/api/middleware";
import {
  successResponse,
  badRequestResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/sso - List all SSO connections
 */
async function handleGetConnections(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const service = getSAMLService();
    const connections = await service.getAllConnections();

    // Return connections without sensitive config data
    const sanitizedConnections = connections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      provider: conn.provider,
      enabled: conn.enabled,
      domains: conn.domains,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
      // Include non-sensitive config info
      jitProvisioning: conn.config.jitProvisioning,
      defaultRole: conn.config.defaultRole,
    }));

    return successResponse({
      connections: sanitizedConnections,
      total: connections.length,
    });
  } catch (error) {
    logger.error("Get SSO connections error:", error);
    return internalErrorResponse("Failed to fetch SSO connections");
  }
}

/**
 * POST /api/auth/sso - Create a new SSO connection
 */
async function handleCreateConnection(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const body = await request.json();

    const { name, provider, domains, config, enabled } = body;

    // Validate required fields
    if (!name || !provider) {
      return badRequestResponse("Name and provider are required");
    }

    // Validate provider
    const validProviders: SSOProvider[] = [
      "okta",
      "azure-ad",
      "google-workspace",
      "onelogin",
      "auth0",
      "ping-identity",
      "jumpcloud",
      "generic-saml",
    ];

    if (!validProviders.includes(provider)) {
      return badRequestResponse(
        `Invalid provider. Valid options: ${validProviders.join(", ")}`,
      );
    }

    // Validate config
    if (!config?.idpEntityId || !config?.idpSsoUrl || !config?.idpCertificate) {
      return badRequestResponse(
        "IdP configuration is incomplete. Required: idpEntityId, idpSsoUrl, idpCertificate",
      );
    }

    // Create connection from preset with overrides
    const baseConnection = createSSOConnectionFromPreset(provider, config);

    const connection = {
      ...baseConnection,
      id: crypto.randomUUID(),
      name,
      enabled: enabled ?? false,
      domains: domains || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add connection using the SAML service
    const service = getSAMLService();
    await service.addConnection(connection as any);

    logger.info(`[SSO] Created new SSO connection: ${name} (${provider})`);

    return successResponse({
      id: connection.id,
      name: connection.name,
      provider: connection.provider,
      enabled: connection.enabled,
      domains: connection.domains,
      createdAt: connection.createdAt,
    });
  } catch (error) {
    logger.error("Create SSO connection error:", error);
    return internalErrorResponse("Failed to create SSO connection");
  }
}

export const GET = compose(withErrorHandler, withAdmin)(handleGetConnections);
export const POST = compose(
  withErrorHandler,
  withAdmin,
)(handleCreateConnection);
