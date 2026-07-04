/**
 * GET /api/admin/oauth-status
 *
 * Purpose: Server-side-only OAuth provider status for the admin dashboard.
 * Inputs:  none (admin-authenticated GET).
 * Outputs: Sanitized provider status list — validation results + a client-safe
 *          subset of provider metadata. NEVER includes clientSecret or any
 *          other server-only credential.
 * Constraints: @/config/oauth-providers is a 'server-only' module (holds
 *              clientSecret values read from env vars); it must never be
 *              imported from a "use client" component. This route is the
 *              sole sanctioned bridge — it calls the server-only functions
 *              here, strips secrets, and returns plain JSON.
 * SPORT: F13-CROSS-REPO-DEPS.md — nchat admin OAuth dashboard
 */

import { NextResponse } from "next/server";
import {
  getAllOAuthProviderNames,
  validateOAuthProvider,
  getOAuthProvider,
} from "@/config/oauth-providers";
import { withAdmin, withErrorHandler, compose } from "@/lib/api/middleware";
import type { AuthenticatedRequest } from "@/lib/api/middleware";

/** Client-safe provider metadata — clientSecret intentionally omitted. */
interface PublicProviderMetadata {
  name: string;
  displayName: string;
  enabled: boolean;
  scopes: string[];
  icon?: string;
  color?: string;
}

async function listOAuthStatus(_request: AuthenticatedRequest) {
  const providers = getAllOAuthProviderNames();

  const statuses = providers.map((providerName) => {
    const validation = validateOAuthProvider(providerName);
    const config = getOAuthProvider(providerName)!;

    const publicConfig: PublicProviderMetadata = {
      name: config.name,
      displayName: config.displayName,
      enabled: config.enabled,
      scopes: config.scopes,
      icon: config.icon,
      color: config.color,
    };

    return {
      ...validation,
      config: publicConfig,
      // Stats are placeholder until wired to real usage analytics.
      stats: {
        provider: providerName,
        totalUsers: 0,
        lastLogin: null as string | null,
        enabled: config.enabled,
      },
      routesExist: true,
    };
  });

  return NextResponse.json({ providers: statuses });
}

export const GET = compose(withErrorHandler, withAdmin)(listOAuthStatus);
