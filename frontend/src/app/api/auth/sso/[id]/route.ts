/**
 * SSO Connection By ID API Route
 *
 * Manages individual SAML/SSO connections.
 *
 * GET /api/auth/sso/[id] - Get connection details
 * PATCH /api/auth/sso/[id] - Update connection
 * DELETE /api/auth/sso/[id] - Delete connection
 */

import { NextRequest, NextResponse } from "next/server";
import { getSAMLService } from "@/lib/auth/saml";
import {
  successResponse,
  notFoundResponse,
  badRequestResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/auth/sso/[id] - Get connection details
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const service = getSAMLService();
    const connection = await service.getConnection(id);

    if (!connection) {
      return notFoundResponse("SSO connection not found");
    }

    // Return connection with sanitized config (hide secrets)
    return successResponse({
      id: connection.id,
      name: connection.name,
      provider: connection.provider,
      enabled: connection.enabled,
      domains: connection.domains,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      config: {
        idpEntityId: connection.config.idpEntityId,
        idpSsoUrl: connection.config.idpSsoUrl,
        idpSloUrl: connection.config.idpSloUrl,
        spEntityId: connection.config.spEntityId,
        spAssertionConsumerUrl: connection.config.spAssertionConsumerUrl,
        nameIdFormat: connection.config.nameIdFormat,
        jitProvisioning: connection.config.jitProvisioning,
        updateUserOnLogin: connection.config.updateUserOnLogin,
        defaultRole: connection.config.defaultRole,
        attributeMapping: connection.config.attributeMapping,
        roleMappings: connection.config.roleMappings,
        // Don't expose the certificate in full (just show it exists)
        hasCertificate: !!connection.config.idpCertificate,
      },
      metadata: connection.metadata,
    });
  } catch (error) {
    logger.error("Get SSO connection error:", error);
    return internalErrorResponse("Failed to fetch SSO connection");
  }
}

/**
 * PATCH /api/auth/sso/[id] - Update connection
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const service = getSAMLService();
    const connection = await service.getConnection(id);

    if (!connection) {
      return notFoundResponse("SSO connection not found");
    }

    // Extract allowed updates
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.domains !== undefined) updates.domains = body.domains;
    if (body.config !== undefined) updates.config = body.config;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    if (Object.keys(updates).length === 0) {
      return badRequestResponse("No valid fields to update");
    }

    await service.updateConnection(id, updates as any);

    logger.info(`[SSO] Updated SSO connection: ${connection.name}`);

    return successResponse({
      id,
      message: "SSO connection updated successfully",
    });
  } catch (error) {
    logger.error("Update SSO connection error:", error);
    return internalErrorResponse("Failed to update SSO connection");
  }
}

/**
 * DELETE /api/auth/sso/[id] - Delete connection
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const service = getSAMLService();
    const connection = await service.getConnection(id);

    if (!connection) {
      return notFoundResponse("SSO connection not found");
    }

    await service.removeConnection(id);

    logger.info(`[SSO] Deleted SSO connection: ${connection.name}`);

    return successResponse({
      id,
      message: "SSO connection deleted successfully",
    });
  } catch (error) {
    logger.error("Delete SSO connection error:", error);
    return internalErrorResponse("Failed to delete SSO connection");
  }
}
