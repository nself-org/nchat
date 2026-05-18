/**
 * Entitlement Gates
 *
 * Custom gate functions for advanced entitlement restrictions.
 * Gates evaluate complex conditions that can't be expressed as simple boolean/numeric values.
 *
 * @module @/lib/entitlements/gates
 * @version 1.0.0
 */

import type { PlanTier } from "@/types/subscription.types";
import {
  GateFn,
  GateResult,
  GateRegistration,
  EntitlementContext,
  CustomEntitlementDefinition,
  EntitlementError,
  EntitlementErrorCode,
  PLAN_TIER_HIERARCHY,
} from "./entitlement-types";

// ============================================================================
// Gate Registry
// ============================================================================

/**
 * Registry for custom gate functions.
 */
export class GateRegistry {
  private gates: Map<string, GateRegistration> = new Map();

  /**
   * Register a gate function.
   */
  register(registration: GateRegistration): void {
    if (this.gates.has(registration.name)) {
      throw new EntitlementError(
        EntitlementErrorCode.INVALID_VALUE,
        `Gate already registered: ${registration.name}`,
      );
    }
    this.gates.set(registration.name, registration);
  }

  /**
   * Unregister a gate function.
   */
  unregister(name: string): boolean {
    return this.gates.delete(name);
  }

  /**
   * Get a gate registration.
   */
  get(name: string): GateRegistration | undefined {
    return this.gates.get(name);
  }

  /**
   * Check if a gate is registered.
   */
  has(name: string): boolean {
    return this.gates.has(name);
  }

  /**
   * Get all registered gates.
   */
  getAll(): GateRegistration[] {
    return Array.from(this.gates.values());
  }

  /**
   * Execute a gate.
   */
  async execute(
    name: string,
    context: EntitlementContext,
    definition: CustomEntitlementDefinition,
    currentValue: unknown,
  ): Promise<GateResult> {
    const registration = this.get(name);
    if (!registration) {
      throw new EntitlementError(
        EntitlementErrorCode.GATE_ERROR,
        `Gate not found: ${name}`,
      );
    }

    // Validate required parameters
    if (registration.requiredParams) {
      for (const param of registration.requiredParams) {
        if (
          definition.gateParams === undefined ||
          definition.gateParams[param] === undefined
        ) {
          throw new EntitlementError(
            EntitlementErrorCode.GATE_ERROR,
            `Missing required gate parameter: ${param}`,
            definition.key,
          );
        }
      }
    }

    try {
      return await registration.fn(context, definition, currentValue);
    } catch (error) {
      if (error instanceof EntitlementError) {
        throw error;
      }
      throw new EntitlementError(
        EntitlementErrorCode.GATE_ERROR,
        `Gate execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        definition.key,
      );
    }
  }
}

// ============================================================================
// Built-in Gates
// ============================================================================

/**
 * Time-based gate - allows access only during specific hours.
 */
export const timeBasedGate: GateFn = async (context, definition) => {
  const params = definition.gateParams as {
    allowedHours?: { start: number; end: number };
    timezone?: string;
  };

  if (!params?.allowedHours) {
    return { allowed: true, reason: "No time restrictions" };
  }

  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    hour12: false,
    timeZone: params.timezone ?? "UTC",
  };
  const currentHour = parseInt(
    new Intl.DateTimeFormat("en-US", options).format(now),
  );

  const { start, end } = params.allowedHours;
  let isWithinHours: boolean;

  if (start <= end) {
    isWithinHours = currentHour >= start && currentHour < end;
  } else {
    // Handles overnight ranges (e.g., 22:00 - 06:00)
    isWithinHours = currentHour >= start || currentHour < end;
  }

  return {
    allowed: isWithinHours,
    reason: isWithinHours
      ? "Within allowed hours"
      : `Access only allowed between ${start}:00 and ${end}:00`,
    metadata: { currentHour, allowedHours: params.allowedHours },
  };
};

/**
 * Role-based gate - requires specific user role.
 */
export const roleBasedGate: GateFn = async (context, definition) => {
  const params = definition.gateParams as {
    allowedRoles?: string[];
    deniedRoles?: string[];
  };

  if (!context.userRole) {
    return {
      allowed: false,
      reason: "User role not specified",
    };
  }

  if (params?.deniedRoles?.includes(context.userRole)) {
    return {
      allowed: false,
      reason: `Role "${context.userRole}" is not allowed`,
    };
  }

  if (params?.allowedRoles && !params.allowedRoles.includes(context.userRole)) {
    return {
      allowed: false,
      reason: `Role "${context.userRole}" not in allowed roles`,
    };
  }

  return {
    allowed: true,
    reason: "Role check passed",
  };
};

/**
 * Tier comparison gate - compares plan tiers.
 */
export const tierComparisonGate: GateFn = async (context, definition) => {
  const params = definition.gateParams as {
    minimumTier?: PlanTier;
    exactTier?: PlanTier;
    excludeTiers?: PlanTier[];
  };

  const currentTierIndex = PLAN_TIER_HIERARCHY.indexOf(context.planTier);

  // Check exact tier
  if (params?.exactTier) {
    const exactMatch = context.planTier === params.exactTier;
    return {
      allowed: exactMatch,
      reason: exactMatch
        ? "Tier matches"
        : `Requires exact tier: ${params.exactTier}`,
    };
  }

  // Check excluded tiers
  if (params?.excludeTiers?.includes(context.planTier)) {
    return {
      allowed: false,
      reason: `Tier "${context.planTier}" is excluded`,
    };
  }

  // Check minimum tier
  if (params?.minimumTier) {
    const minimumTierIndex = PLAN_TIER_HIERARCHY.indexOf(params.minimumTier);
    const meetsMinimum = currentTierIndex >= minimumTierIndex;

    return {
      allowed: meetsMinimum,
      reason: meetsMinimum
        ? "Tier meets minimum requirement"
        : `Requires ${params.minimumTier} tier or higher`,
      metadata: {
        currentTier: context.planTier,
        requiredTier: params.minimumTier,
      },
    };
  }

  return { allowed: true };
};

/**
 * Feature flag gate - checks external feature flags.
 */
export const featureFlagGate: GateFn = async (context, definition) => {
  const params = definition.gateParams as {
    flagName?: string;
    defaultValue?: boolean;
  };

  if (!params?.flagName) {
    return {
      allowed: params?.defaultValue ?? false,
      reason: "No flag name specified",
    };
  }

  // In a real implementation, this would check an external feature flag service
  // For now, we use environment variables as flags
  const flagValue =
    process.env[`FEATURE_FLAG_${params.flagName.toUpperCase()}`];

  if (flagValue === undefined) {
    return {
      allowed: params.defaultValue ?? false,
      reason: `Flag "${params.flagName}" not found, using default`,
    };
  }

  const isEnabled = flagValue === "true" || flagValue === "1";

  return {
    allowed: isEnabled,
    reason: isEnabled
      ? `Feature flag "${params.flagName}" is enabled`
      : `Feature flag "${params.flagName}" is disabled`,
    metadata: { flagName: params.flagName, flagValue },
  };
};

/**
 * Beta access gate - allows access for beta users.
 */
export const betaAccessGate: GateFn = async (context, definition) => {
  const params = definition.gateParams as {
    betaGroup?: string;
    rolloutPercentage?: number;
  };

  // Check if user is in beta group via metadata
  const isBetaUser = context.metadata?.betaAccess === true;
  const betaGroups = (context.metadata?.betaGroups as string[]) ?? [];

  if (params?.betaGroup) {
    const inGroup = betaGroups.includes(params.betaGroup);
    return {
      allowed: inGroup,
      reason: inGroup
        ? `User in beta group: ${params.betaGroup}`
        : `User not in beta group: ${params.betaGroup}`,
    };
  }

  // Percentage-based rollout
  if (params?.rolloutPercentage !== undefined) {
    // Use consistent hash of userId for deterministic rollout
    const hash = hashString(context.userId);
    const inRollout = hash % 100 < params.rolloutPercentage;

    return {
      allowed: inRollout,
      reason: inRollout
        ? `User included in ${params.rolloutPercentage}% rollout`
        : `User not in ${params.rolloutPercentage}% rollout`,
      metadata: { hash, rolloutPercentage: params.rolloutPercentage },
    };
  }

  return {
    allowed: isBetaUser,
    reason: isBetaUser
      ? "User has beta access"
      : "User does not have beta access",
  };
};

/**
 * Simple hash function for consistent rollout.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Composite gate - combines multiple gates with AND/OR logic.
 */
export const compositeGate: GateFn = async (context, definition) => {
  const params = definition.gateParams as {
    gates?: Array<{ name: string; params?: Record<string, unknown> }>;
    operator?: "and" | "or";
  };

  if (!params?.gates || params.gates.length === 0) {
    return { allowed: true, reason: "No sub-gates specified" };
  }

  const operator = params.operator ?? "and";
  const results: Array<{ name: string; result: GateResult }> = [];
  const registry = getGateRegistry();

  for (const gate of params.gates) {
    const registration = registry.get(gate.name);
    if (!registration) {
      results.push({
        name: gate.name,
        result: { allowed: false, reason: `Gate not found: ${gate.name}` },
      });
      continue;
    }

    const subDefinition: CustomEntitlementDefinition = {
      ...definition,
      gateParams: gate.params,
    };

    const result = await registration.fn(context, subDefinition, undefined);
    results.push({ name: gate.name, result });
  }

  let allowed: boolean;
  if (operator === "and") {
    allowed = results.every((r) => r.result.allowed);
  } else {
    allowed = results.some((r) => r.result.allowed);
  }

  return {
    allowed,
    reason: `Composite gate (${operator}): ${allowed ? "passed" : "failed"}`,
    metadata: { results, operator },
  };
};

/**
 * Rate limit gate - limits access frequency.
 */
export const rateLimitGate: GateFn = async (context, definition) => {
  const params = definition.gateParams as {
    maxRequests?: number;
    windowSeconds?: number;
  };

  if (!params?.maxRequests || !params?.windowSeconds) {
    return { allowed: true, reason: "Rate limit not configured" };
  }

  // In a real implementation, this would check a rate limiter service
  // For now, we just return allowed
  // The actual rate limiting would be handled by the rate limit service

  return {
    allowed: true,
    reason: "Rate limit check passed",
    metadata: {
      maxRequests: params.maxRequests,
      windowSeconds: params.windowSeconds,
    },
  };
};

/**
 * Geographic gate - restricts access by region.
 */
export const geographicGate: GateFn = async (context, definition) => {
  const params = definition.gateParams as {
    allowedCountries?: string[];
    blockedCountries?: string[];
    allowedRegions?: string[];
  };

  const userCountry = context.metadata?.country as string | undefined;
  const userRegion = context.metadata?.region as string | undefined;

  if (!userCountry) {
    return {
      allowed: true,
      reason: "User location not available",
    };
  }

  // Check blocked countries
  if (params?.blockedCountries?.includes(userCountry)) {
    return {
      allowed: false,
      reason: `Access blocked in ${userCountry}`,
    };
  }

  // Check allowed countries
  if (
    params?.allowedCountries &&
    !params.allowedCountries.includes(userCountry)
  ) {
    return {
      allowed: false,
      reason: `Access only allowed in: ${params.allowedCountries.join(", ")}`,
    };
  }

  // Check allowed regions
  if (
    params?.allowedRegions &&
    userRegion &&
    !params.allowedRegions.includes(userRegion)
  ) {
    return {
      allowed: false,
      reason: `Access only allowed in regions: ${params.allowedRegions.join(", ")}`,
    };
  }

  return {
    allowed: true,
    reason: "Geographic check passed",
  };
};

/**
 * Workspace size gate - limits based on workspace size.
 */
export const workspaceSizeGate: GateFn = async (context, definition) => {
  const params = definition.gateParams as {
    minMembers?: number;
    maxMembers?: number;
  };

  const memberCount = context.metadata?.workspaceMemberCount as
    | number
    | undefined;

  if (memberCount === undefined) {
    return {
      allowed: true,
      reason: "Workspace member count not available",
    };
  }

  if (params?.minMembers !== undefined && memberCount < params.minMembers) {
    return {
      allowed: false,
      reason: `Workspace needs at least ${params.minMembers} members (current: ${memberCount})`,
    };
  }

  if (params?.maxMembers !== undefined && memberCount > params.maxMembers) {
    return {
      allowed: false,
      reason: `Workspace exceeds ${params.maxMembers} member limit (current: ${memberCount})`,
    };
  }

  return {
    allowed: true,
    reason: "Workspace size check passed",
  };
};

/**
 * Trial gate - handles trial period access.
 */
export const trialGate: GateFn = async (context, definition) => {
  const params = definition.gateParams as {
    trialDays?: number;
    allowedFeatures?: string[];
  };

  const trialStartDate = context.metadata?.trialStartDate as string | undefined;
  const isInTrial = context.metadata?.isInTrial as boolean | undefined;

  if (!isInTrial) {
    return {
      allowed: true,
      reason: "Not in trial period",
    };
  }

  // Check trial expiration
  if (trialStartDate && params?.trialDays) {
    const startDate = new Date(trialStartDate);
    const expirationDate = new Date(
      startDate.getTime() + params.trialDays * 24 * 60 * 60 * 1000,
    );

    if (new Date() > expirationDate) {
      return {
        allowed: false,
        reason: "Trial period has expired",
        metadata: {
          trialStartDate,
          trialDays: params.trialDays,
          expirationDate,
        },
      };
    }
  }

  // Check if feature is allowed in trial
  if (
    params?.allowedFeatures &&
    !params.allowedFeatures.includes(definition.key)
  ) {
    return {
      allowed: false,
      reason: "This feature is not available during trial",
    };
  }

  return {
    allowed: true,
    reason: "Trial access granted",
    metadata: { isInTrial: true },
  };
};

/**
 * Channel type gate - restricts based on channel type.
 */
export const channelTypeGate: GateFn = async (context, definition) => {
  const params = definition.gateParams as {
    allowedTypes?: string[];
    deniedTypes?: string[];
  };

  const channelType = context.metadata?.channelType as string | undefined;

  if (!channelType) {
    return {
      allowed: true,
      reason: "Channel type not specified",
    };
  }

  if (params?.deniedTypes?.includes(channelType)) {
    return {
      allowed: false,
      reason: `Not allowed in ${channelType} channels`,
    };
  }

  if (params?.allowedTypes && !params.allowedTypes.includes(channelType)) {
    return {
      allowed: false,
      reason: `Only allowed in: ${params.allowedTypes.join(", ")}`,
    };
  }

  return {
    allowed: true,
    reason: "Channel type check passed",
  };
};

// ============================================================================
// Gate Registration
// ============================================================================

/**
 * Built-in gate registrations.
 */
export const BUILT_IN_GATES: GateRegistration[] = [
  {
    name: "time_based",
    fn: timeBasedGate,
    description: "Restricts access to specific hours",
    requiredParams: ["allowedHours"],
  },
  {
    name: "role_based",
    fn: roleBasedGate,
    description: "Restricts access based on user role",
  },
  {
    name: "tier_comparison",
    fn: tierComparisonGate,
    description: "Compares plan tiers for access",
  },
  {
    name: "feature_flag",
    fn: featureFlagGate,
    description: "Checks external feature flags",
    requiredParams: ["flagName"],
  },
  {
    name: "beta_access",
    fn: betaAccessGate,
    description: "Controls beta feature access",
  },
  {
    name: "composite",
    fn: compositeGate,
    description: "Combines multiple gates with AND/OR logic",
    requiredParams: ["gates"],
  },
  {
    name: "rate_limit",
    fn: rateLimitGate,
    description: "Rate limits access frequency",
  },
  {
    name: "geographic",
    fn: geographicGate,
    description: "Restricts access by geographic region",
  },
  {
    name: "workspace_size",
    fn: workspaceSizeGate,
    description: "Restricts based on workspace member count",
  },
  {
    name: "trial",
    fn: trialGate,
    description: "Handles trial period restrictions",
  },
  {
    name: "channel_type",
    fn: channelTypeGate,
    description: "Restricts based on channel type",
  },
];

// ============================================================================
// Singleton Instance
// ============================================================================

let gateRegistryInstance: GateRegistry | null = null;

/**
 * Get the singleton gate registry with built-in gates.
 */
export function getGateRegistry(): GateRegistry {
  if (!gateRegistryInstance) {
    gateRegistryInstance = new GateRegistry();

    // Register all built-in gates
    for (const gate of BUILT_IN_GATES) {
      gateRegistryInstance.register(gate);
    }
  }

  return gateRegistryInstance;
}

/**
 * Create a new gate registry.
 */
export function createGateRegistry(
  includeBuiltIn: boolean = true,
): GateRegistry {
  const registry = new GateRegistry();

  if (includeBuiltIn) {
    for (const gate of BUILT_IN_GATES) {
      registry.register(gate);
    }
  }

  return registry;
}

/**
 * Reset the singleton instance (for testing).
 */
export function resetGateRegistry(): void {
  gateRegistryInstance = null;
}
