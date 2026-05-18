/**
 * Plan Gate Middleware
 *
 * Server-side middleware for enforcing plan-based feature access
 * and resource limits across all API routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPlanEnforcementService } from "@/lib/billing/plan-enforcement.service";
import { getTenantService } from "@/lib/tenants/tenant-service";
import { getTenantId } from "@/lib/tenants/tenant-middleware";
import { PLAN_FEATURES, PLAN_LIMITS } from "@/lib/billing/plan-config";
import type { PlanTier, PlanFeatures } from "@/types/subscription.types";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface PlanGateConfig {
  feature?: keyof PlanFeatures;
  limit?: keyof typeof PLAN_LIMITS.free;
  limitCheck?: (
    tenant: TenantContext,
  ) => Promise<{ current: number; adding: number }>;
  skipForRoles?: string[];
  customCheck?: (
    tenant: TenantContext,
    request: NextRequest,
  ) => Promise<{ allowed: boolean; reason?: string }>;
}

export interface TenantContext {
  id: string;
  plan: PlanTier;
  usage: {
    members: number;
    channels: number;
    storageBytes: number;
    apiCalls: number;
  };
  role?: string;
}

export interface PlanGateResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: PlanTier;
  currentPlan: PlanTier;
  limit?: number;
  currentUsage?: number;
}

// ============================================================================
// Feature to Route Mapping
// ============================================================================

/**
 * Maps API route patterns to required features/limits
 */
export const ROUTE_FEATURE_MAP: Record<string, PlanGateConfig> = {
  // Video calls require starter or higher
  "/api/calls": {
    feature: "videoCalls",
  },
  "/api/calls/*/join": {
    feature: "videoCalls",
    limit: "maxCallParticipants",
  },

  // Screen sharing requires professional or higher
  "/api/calls/*/screen-share": {
    feature: "screenSharing",
  },

  // Webhooks require starter or higher
  "/api/webhooks": {
    feature: "webhooks",
  },

  // API access requires professional or higher
  "/api/external": {
    feature: "apiAccess",
  },

  // SSO/SAML requires enterprise
  "/api/auth/sso": {
    feature: "sso",
  },
  "/api/auth/saml": {
    feature: "sso",
  },

  // Audit logs require professional or higher
  "/api/audit": {
    feature: "auditLogs",
  },

  // Custom branding requires enterprise
  "/api/tenants/*/branding": {
    feature: "customBranding",
  },

  // Data export requires professional or higher
  "/api/export": {
    feature: "dataExport",
  },

  // Integrations require starter or higher
  "/api/integrations": {
    feature: "integrations",
  },

  // Voice messages require starter or higher
  "/api/messages/voice": {
    feature: "voiceMessages",
  },

  // Custom emoji require starter or higher
  "/api/emoji/custom": {
    feature: "customEmoji",
  },

  // Channel creation has limits
  "/api/channels": {
    limit: "maxChannels",
  },

  // Member invites have limits
  "/api/workspaces/*/members": {
    limit: "maxMembers",
  },

  // File uploads have size and storage limits
  "/api/attachments": {
    limit: "maxFileSizeBytes",
  },
  "/api/files/upload": {
    limit: "maxStorageBytes",
  },

  // Streaming has duration limits
  "/api/streams": {
    limit: "maxStreamDurationMinutes",
  },
};

// ============================================================================
// Main Gate Function
// ============================================================================

/**
 * Check if a request is allowed based on plan restrictions
 */
export async function checkPlanGate(
  request: NextRequest,
  config?: PlanGateConfig,
): Promise<PlanGateResult> {
  try {
    const tenantId = getTenantId(request);

    if (!tenantId) {
      // No tenant context - allow the request (handled elsewhere)
      return {
        allowed: true,
        currentPlan: "free",
      };
    }

    const tenantService = getTenantService();
    const tenant = await tenantService.getTenantById(tenantId);

    if (!tenant) {
      return {
        allowed: true,
        currentPlan: "free",
      };
    }

    const currentPlan = tenant.billing.plan as PlanTier;
    const usage = tenant.billing.usageTracking;

    const tenantContext: TenantContext = {
      id: tenant.id,
      plan: currentPlan,
      usage: {
        members: usage.users,
        channels: 0, // Would need to fetch from DB
        storageBytes: usage.storageBytes,
        apiCalls: usage.apiCallsThisMonth,
      },
    };

    // If no config provided, try to match route pattern
    if (!config) {
      config = matchRouteToConfig(request.nextUrl.pathname);
    }

    if (!config) {
      // No restrictions for this route
      return {
        allowed: true,
        currentPlan,
      };
    }

    const enforcementService = getPlanEnforcementService();

    // Check feature access
    if (config.feature) {
      const featureCheck = await enforcementService.checkFeatureAccess(
        currentPlan,
        config.feature,
      );

      if (!featureCheck.allowed) {
        return {
          allowed: false,
          reason: featureCheck.reason,
          upgradeRequired: featureCheck.upgradeRequired,
          currentPlan,
        };
      }
    }

    // Check limit
    if (config.limit) {
      let currentUsage = 0;
      let adding = 1;

      if (config.limitCheck) {
        const limitInfo = await config.limitCheck(tenantContext);
        currentUsage = limitInfo.current;
        adding = limitInfo.adding;
      } else {
        // Default usage based on limit type
        switch (config.limit) {
          case "maxMembers":
            currentUsage = tenantContext.usage.members;
            break;
          case "maxChannels":
            currentUsage = tenantContext.usage.channels;
            break;
          case "maxStorageBytes":
            currentUsage = tenantContext.usage.storageBytes;
            // For storage, get the file size from request if possible
            const contentLength = request.headers.get("content-length");
            if (contentLength) {
              adding = parseInt(contentLength);
            }
            break;
          case "maxApiCallsPerMonth":
            currentUsage = tenantContext.usage.apiCalls;
            break;
          default:
            break;
        }
      }

      const limitCheck = await enforcementService.checkLimit(
        currentPlan,
        config.limit,
        currentUsage,
        adding,
      );

      if (!limitCheck.withinLimit) {
        return {
          allowed: false,
          reason: `${config.limit} limit exceeded`,
          currentPlan,
          limit: limitCheck.limit ?? undefined,
          currentUsage: limitCheck.currentUsage,
        };
      }
    }

    // Run custom check if provided
    if (config.customCheck) {
      const customResult = await config.customCheck(tenantContext, request);
      if (!customResult.allowed) {
        return {
          allowed: false,
          reason: customResult.reason,
          currentPlan,
        };
      }
    }

    return {
      allowed: true,
      currentPlan,
    };
  } catch (error) {
    logger.error("Error in plan gate check:", error);
    // On error, allow the request (fail open for availability)
    return {
      allowed: true,
      currentPlan: "free",
    };
  }
}

/**
 * Match a route path to its feature configuration
 */
function matchRouteToConfig(pathname: string): PlanGateConfig | undefined {
  // Exact match first
  if (ROUTE_FEATURE_MAP[pathname]) {
    return ROUTE_FEATURE_MAP[pathname];
  }

  // Pattern match with wildcards
  for (const [pattern, config] of Object.entries(ROUTE_FEATURE_MAP)) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, "[^/]+") + "$");
    if (regex.test(pathname)) {
      return config;
    }
  }

  return undefined;
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create a plan gate middleware for a specific feature
 */
export function createPlanGateMiddleware(config: PlanGateConfig) {
  return async function planGateMiddleware(request: NextRequest) {
    const result = await checkPlanGate(request, config);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "Plan restriction",
          reason: result.reason,
          currentPlan: result.currentPlan,
          upgradeRequired: result.upgradeRequired,
          limit: result.limit,
          currentUsage: result.currentUsage,
        },
        { status: 403 },
      );
    }

    return null; // Allow the request to proceed
  };
}

/**
 * Higher-order function to wrap API handlers with plan gating
 */
export function withPlanGate(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  config: PlanGateConfig,
) {
  return async function gatedHandler(request: NextRequest, context?: any) {
    const gateResult = await checkPlanGate(request, config);

    if (!gateResult.allowed) {
      return NextResponse.json(
        {
          error: "Upgrade required",
          reason: gateResult.reason,
          currentPlan: gateResult.currentPlan,
          upgradeRequired: gateResult.upgradeRequired,
        },
        { status: 403 },
      );
    }

    return handler(request, context);
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a tenant has access to a specific feature
 */
export async function hasFeatureAccess(
  tenantId: string,
  feature: keyof PlanFeatures,
): Promise<boolean> {
  try {
    const tenantService = getTenantService();
    const tenant = await tenantService.getTenantById(tenantId);

    if (!tenant) {
      return false;
    }

    const plan = tenant.billing.plan as PlanTier;
    return PLAN_FEATURES[plan][feature] as boolean;
  } catch (error) {
    logger.error("Error checking feature access:", error);
    return false;
  }
}

/**
 * Get remaining quota for a resource
 */
export async function getRemainingQuota(
  tenantId: string,
  resource: keyof typeof PLAN_LIMITS.free,
): Promise<number | null> {
  try {
    const tenantService = getTenantService();
    const tenant = await tenantService.getTenantById(tenantId);

    if (!tenant) {
      return null;
    }

    const plan = tenant.billing.plan as PlanTier;
    const limit = PLAN_LIMITS[plan][resource];

    if (limit === null) {
      return null; // Unlimited
    }

    const usage = tenant.billing.usageTracking;

    switch (resource) {
      case "maxMembers":
        return Math.max(0, limit - usage.users);
      case "maxStorageBytes":
        return Math.max(0, limit - usage.storageBytes);
      case "maxApiCallsPerMonth":
        return Math.max(0, limit - usage.apiCallsThisMonth);
      default:
        return limit;
    }
  } catch (error) {
    logger.error("Error getting remaining quota:", error);
    return null;
  }
}
