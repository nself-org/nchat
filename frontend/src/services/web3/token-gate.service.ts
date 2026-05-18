/**
 * Token Gate Enforcement Service
 *
 * Manages token-gated access control for channels, features, and roles.
 * Handles verification, caching, grace periods, and access revocation.
 *
 * @module @/services/web3/token-gate.service
 * @version 1.0.0
 */

import {
  type ChainId,
  type TokenGateConfig,
  type TokenGateStatus,
  type TokenRequirementCondition,
  type TokenGateVerificationResult,
  type AccessCheckRequest,
  type AccessCheckResult,
  type VerificationCacheEntry,
  type CacheInvalidationEvent,
  type TokenGateEvent,
  type TokenGateEventType,
  type TokenGateStats,
  TokenGateError,
  TokenGateErrorCode,
  isValidAddress,
  normalizeAddress,
  generateVerificationCacheKey,
  calculateGracePeriodEnd,
  isInGracePeriod,
} from "@/lib/web3/token-gate-types";

import {
  verifyRequirements,
  clearVerificationCache,
  clearWalletCache,
  clearContractCache,
} from "@/lib/web3/token-gate-verifier";

import { logger } from "@/lib/logger";

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CACHE_TTL_SECONDS = 300; // 5 minutes
const DEFAULT_GRACE_PERIOD_SECONDS = 3600; // 1 hour
const DEFAULT_REVOCATION_CHECK_INTERVAL_SECONDS = 60; // 1 minute
const MAX_VERIFICATION_CACHE_SIZE = 10000;
const STATS_RETENTION_DAYS = 30;

// =============================================================================
// IN-MEMORY STORES
// =============================================================================

// Token gate configurations
const gateConfigs = new Map<string, TokenGateConfig>();

// Resource to gate mappings
const resourceGateMappings = new Map<string, string>(); // resourceKey -> gateId

// Verification results cache
const verificationCache = new Map<string, VerificationCacheEntry>();

// Grace period tracking
const gracePeriods = new Map<
  string,
  {
    userId: string;
    gateId: string;
    walletAddress: string;
    startedAt: Date;
    endsAt: Date;
    previousStatus: TokenGateStatus;
  }
>();

// Event log
const eventLog: TokenGateEvent[] = [];
const maxEventLogSize = 10000;

// Statistics tracking
const statsMap = new Map<
  string,
  {
    gateId: string;
    checks: number;
    successes: number;
    failures: number;
    users: Set<string>;
    totalTimeMs: number;
    cacheHits: number;
  }
>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate resource key for gate mapping
 */
function getResourceKey(
  resourceType: "channel" | "feature" | "role" | "workspace",
  resourceId: string,
): string {
  return `${resourceType}:${resourceId}`;
}

/**
 * Generate user-gate cache key
 */
function getUserGateCacheKey(
  gateId: string,
  userId: string,
  walletAddress: string,
): string {
  return `${gateId}:${userId}:${normalizeAddress(walletAddress)}`;
}

/**
 * Log token gate event
 */
function logEvent(
  event: Omit<TokenGateEvent, "id" | "timestamp">,
): TokenGateEvent {
  const fullEvent: TokenGateEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    timestamp: new Date(),
  };

  eventLog.unshift(fullEvent);

  // Trim event log to max size
  if (eventLog.length > maxEventLogSize) {
    eventLog.pop();
  }

  return fullEvent;
}

/**
 * Update statistics for a gate
 */
function updateStats(
  gateId: string,
  userId: string,
  success: boolean,
  durationMs: number,
  cacheHit: boolean,
): void {
  let stats = statsMap.get(gateId);
  if (!stats) {
    stats = {
      gateId,
      checks: 0,
      successes: 0,
      failures: 0,
      users: new Set(),
      totalTimeMs: 0,
      cacheHits: 0,
    };
    statsMap.set(gateId, stats);
  }

  stats.checks++;
  if (success) stats.successes++;
  else stats.failures++;
  stats.users.add(userId);
  stats.totalTimeMs += durationMs;
  if (cacheHit) stats.cacheHits++;
}

// =============================================================================
// GATE CONFIGURATION MANAGEMENT
// =============================================================================

/**
 * Create a new token gate configuration
 */
export async function createTokenGate(
  config: Omit<TokenGateConfig, "id" | "createdAt" | "updatedAt">,
): Promise<TokenGateConfig> {
  // Validate requirements
  for (const req of config.requirements) {
    if (!isValidAddress(req.contractAddress)) {
      throw new TokenGateError(
        TokenGateErrorCode.INVALID_CONTRACT_ADDRESS,
        `Invalid contract address: ${req.contractAddress}`,
      );
    }
  }

  const gate: TokenGateConfig = {
    ...config,
    id: `gate_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store configuration
  gateConfigs.set(gate.id, gate);

  // Create resource mapping
  const resourceKey = getResourceKey(config.resourceType, config.resourceId);
  resourceGateMappings.set(resourceKey, gate.id);

  // Log event
  logEvent({
    type: "gate_created",
    gateId: gate.id,
    resourceType: config.resourceType,
    resourceId: config.resourceId,
    details: { config: gate },
    source: "system",
  });

  logger.info(`Token gate created: ${gate.id} for ${resourceKey}`);

  return gate;
}

/**
 * Update an existing token gate configuration
 */
export async function updateTokenGate(
  gateId: string,
  updates: Partial<Omit<TokenGateConfig, "id" | "createdAt" | "updatedAt">>,
): Promise<TokenGateConfig | null> {
  const existing = gateConfigs.get(gateId);
  if (!existing) {
    return null;
  }

  // Validate new requirements if provided
  if (updates.requirements) {
    for (const req of updates.requirements) {
      if (!isValidAddress(req.contractAddress)) {
        throw new TokenGateError(
          TokenGateErrorCode.INVALID_CONTRACT_ADDRESS,
          `Invalid contract address: ${req.contractAddress}`,
        );
      }
    }
  }

  const updated: TokenGateConfig = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  };

  gateConfigs.set(gateId, updated);

  // Invalidate cache for this gate
  invalidateGateCache(gateId);

  // Log event
  logEvent({
    type: "gate_config_updated",
    gateId,
    resourceType: updated.resourceType,
    resourceId: updated.resourceId,
    details: { updates },
    source: "system",
  });

  logger.info(`Token gate updated: ${gateId}`);

  return updated;
}

/**
 * Delete a token gate configuration
 */
export async function deleteTokenGate(gateId: string): Promise<boolean> {
  const existing = gateConfigs.get(gateId);
  if (!existing) {
    return false;
  }

  // Remove gate config
  gateConfigs.delete(gateId);

  // Remove resource mapping
  const resourceKey = getResourceKey(
    existing.resourceType,
    existing.resourceId,
  );
  resourceGateMappings.delete(resourceKey);

  // Invalidate cache
  invalidateGateCache(gateId);

  // Log event
  logEvent({
    type: "gate_deleted",
    gateId,
    resourceType: existing.resourceType,
    resourceId: existing.resourceId,
    details: {},
    source: "system",
  });

  logger.info(`Token gate deleted: ${gateId}`);

  return true;
}

/**
 * Get token gate by ID
 */
export function getTokenGate(gateId: string): TokenGateConfig | undefined {
  return gateConfigs.get(gateId);
}

/**
 * Get token gate for a resource
 */
export function getTokenGateForResource(
  resourceType: "channel" | "feature" | "role" | "workspace",
  resourceId: string,
): TokenGateConfig | undefined {
  const resourceKey = getResourceKey(resourceType, resourceId);
  const gateId = resourceGateMappings.get(resourceKey);
  if (!gateId) return undefined;
  return gateConfigs.get(gateId);
}

/**
 * List all token gates
 */
export function listTokenGates(filter?: {
  resourceType?: "channel" | "feature" | "role" | "workspace";
  isActive?: boolean;
}): TokenGateConfig[] {
  let gates = Array.from(gateConfigs.values());

  if (filter?.resourceType) {
    gates = gates.filter((g) => g.resourceType === filter.resourceType);
  }

  if (filter?.isActive !== undefined) {
    gates = gates.filter((g) => g.isActive === filter.isActive);
  }

  return gates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// =============================================================================
// ACCESS VERIFICATION
// =============================================================================

/**
 * Check access to a token-gated resource
 */
export async function checkAccess(
  request: AccessCheckRequest,
): Promise<AccessCheckResult> {
  const startTime = Date.now();
  const {
    userId,
    resourceType,
    resourceId,
    walletAddress,
    userRoles = [],
    forceRefresh,
  } = request;

  // Find gate for resource
  const gate = getTokenGateForResource(resourceType, resourceId);

  // No gate configured - allow access
  if (!gate) {
    return {
      hasAccess: true,
      status: "granted",
      requiresVerification: false,
      bypassedByRole: false,
      inGracePeriod: false,
    };
  }

  // Gate is inactive - allow access
  if (!gate.isActive) {
    return {
      hasAccess: true,
      status: "granted",
      gateId: gate.id,
      requiresVerification: false,
      bypassedByRole: false,
      inGracePeriod: false,
    };
  }

  // Check role bypass
  const bypassRole = gate.bypassRoles.find((role) => userRoles.includes(role));
  if (bypassRole) {
    updateStats(gate.id, userId, true, Date.now() - startTime, false);
    return {
      hasAccess: true,
      status: "granted",
      gateId: gate.id,
      requiresVerification: false,
      bypassedByRole: true,
      bypassRole,
      inGracePeriod: false,
    };
  }

  // Wallet address required
  if (!walletAddress) {
    updateStats(gate.id, userId, false, Date.now() - startTime, false);
    return {
      hasAccess: false,
      status: "denied",
      reason: "Wallet connection required to verify token ownership",
      gateId: gate.id,
      requiresVerification: true,
      bypassedByRole: false,
      inGracePeriod: false,
    };
  }

  // Validate wallet address
  if (!isValidAddress(walletAddress)) {
    updateStats(gate.id, userId, false, Date.now() - startTime, false);
    return {
      hasAccess: false,
      status: "denied",
      reason: "Invalid wallet address",
      gateId: gate.id,
      requiresVerification: true,
      bypassedByRole: false,
      inGracePeriod: false,
    };
  }

  // Check cache (unless force refresh)
  const cacheKey = getUserGateCacheKey(gate.id, userId, walletAddress);
  if (!forceRefresh) {
    const cached = verificationCache.get(cacheKey);
    if (cached && !cached.invalidatedAt && new Date() < cached.expiresAt) {
      updateStats(
        gate.id,
        userId,
        cached.result.hasAccess,
        Date.now() - startTime,
        true,
      );
      return {
        hasAccess: cached.result.hasAccess,
        status: cached.result.status,
        gateId: gate.id,
        requiresVerification: false,
        verificationResult: cached.result,
        bypassedByRole: false,
        inGracePeriod: cached.result.inGracePeriod,
        gracePeriodEndsAt: cached.result.gracePeriodEndsAt,
        cacheExpiresAt: cached.expiresAt,
      };
    }
  }

  // Perform verification
  const verification = await verifyTokenGate(gate, userId, walletAddress);

  // Cache the result
  const cacheEntry: VerificationCacheEntry = {
    key: cacheKey,
    result: verification,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + gate.cacheTTLSeconds * 1000),
  };
  verificationCache.set(cacheKey, cacheEntry);

  // Enforce max cache size
  if (verificationCache.size > MAX_VERIFICATION_CACHE_SIZE) {
    const oldestKey = verificationCache.keys().next().value;
    if (oldestKey) verificationCache.delete(oldestKey);
  }

  updateStats(
    gate.id,
    userId,
    verification.hasAccess,
    Date.now() - startTime,
    false,
  );

  return {
    hasAccess: verification.hasAccess,
    status: verification.status,
    reason: verification.accessDeniedReason,
    gateId: gate.id,
    requiresVerification: false,
    verificationResult: verification,
    bypassedByRole: false,
    inGracePeriod: verification.inGracePeriod,
    gracePeriodEndsAt: verification.gracePeriodEndsAt,
    cacheExpiresAt: cacheEntry.expiresAt,
  };
}

/**
 * Verify token gate requirements
 */
async function verifyTokenGate(
  gate: TokenGateConfig,
  userId: string,
  walletAddress: string,
): Promise<TokenGateVerificationResult> {
  const normalizedWallet = normalizeAddress(walletAddress);
  const gracePeriodKey = `${gate.id}:${userId}:${normalizedWallet}`;

  try {
    // Verify requirements
    const { verified, results } = await verifyRequirements(
      gate.requirements,
      normalizedWallet,
      gate.operator,
      gate.cacheTTLSeconds * 1000,
    );

    if (verified) {
      // Clear any grace period
      const existingGracePeriod = gracePeriods.get(gracePeriodKey);
      if (existingGracePeriod) {
        gracePeriods.delete(gracePeriodKey);
      }

      // Log access granted event
      logEvent({
        type: "access_granted",
        gateId: gate.id,
        userId,
        walletAddress: normalizedWallet,
        resourceType: gate.resourceType,
        resourceId: gate.resourceId,
        details: { requirementResults: results },
        previousState: existingGracePeriod?.previousStatus,
        newState: "granted",
        source: "system",
      });

      return {
        gateId: gate.id,
        userId,
        walletAddress: normalizedWallet,
        status: "granted",
        hasAccess: true,
        requirementResults: results,
        accessGranted: true,
        bypassedByRole: false,
        inGracePeriod: false,
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + gate.cacheTTLSeconds * 1000),
        verificationMethod: "on_chain",
        fromCache: false,
      };
    }

    // Check for existing grace period
    const existingGracePeriod = gracePeriods.get(gracePeriodKey);
    if (existingGracePeriod && isInGracePeriod(existingGracePeriod.endsAt)) {
      return {
        gateId: gate.id,
        userId,
        walletAddress: normalizedWallet,
        status: "grace_period",
        hasAccess: true, // Still allowed during grace period
        requirementResults: results,
        accessGranted: true,
        bypassedByRole: false,
        inGracePeriod: true,
        gracePeriodEndsAt: existingGracePeriod.endsAt,
        verifiedAt: new Date(),
        expiresAt: existingGracePeriod.endsAt,
        verificationMethod: "on_chain",
        fromCache: false,
      };
    }

    // Start grace period if configured and this is a revocation
    if (gate.gracePeriodSeconds > 0 && !existingGracePeriod) {
      // Check if user previously had access (would need to check historical data)
      // For now, we'll start grace period on first failure
      const gracePeriodEndsAt = calculateGracePeriodEnd(
        gate.gracePeriodSeconds,
      );

      gracePeriods.set(gracePeriodKey, {
        userId,
        gateId: gate.id,
        walletAddress: normalizedWallet,
        startedAt: new Date(),
        endsAt: gracePeriodEndsAt,
        previousStatus: "granted",
      });

      // Log grace period started
      logEvent({
        type: "grace_period_started",
        gateId: gate.id,
        userId,
        walletAddress: normalizedWallet,
        resourceType: gate.resourceType,
        resourceId: gate.resourceId,
        details: { gracePeriodEndsAt, requirementResults: results },
        previousState: "granted",
        newState: "grace_period",
        source: "system",
      });

      return {
        gateId: gate.id,
        userId,
        walletAddress: normalizedWallet,
        status: "grace_period",
        hasAccess: true,
        requirementResults: results,
        accessGranted: true,
        bypassedByRole: false,
        inGracePeriod: true,
        gracePeriodEndsAt,
        verifiedAt: new Date(),
        expiresAt: gracePeriodEndsAt,
        verificationMethod: "on_chain",
        fromCache: false,
      };
    }

    // Access denied - find the reason
    const failedRequirements = results.filter((r) => !r.verified);
    const deniedReason = failedRequirements
      .map((r) => r.error || "Requirement not met")
      .join("; ");

    // Log access denied
    logEvent({
      type: "access_denied",
      gateId: gate.id,
      userId,
      walletAddress: normalizedWallet,
      resourceType: gate.resourceType,
      resourceId: gate.resourceId,
      details: { reason: deniedReason, requirementResults: results },
      newState: "denied",
      source: "system",
    });

    return {
      gateId: gate.id,
      userId,
      walletAddress: normalizedWallet,
      status: "denied",
      hasAccess: false,
      requirementResults: results,
      accessGranted: false,
      accessDeniedReason: deniedReason,
      bypassedByRole: false,
      inGracePeriod: false,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + gate.cacheTTLSeconds * 1000),
      verificationMethod: "on_chain",
      fromCache: false,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Verification failed";

    // Log verification failure
    logEvent({
      type: "verification_failed",
      gateId: gate.id,
      userId,
      walletAddress: normalizedWallet,
      resourceType: gate.resourceType,
      resourceId: gate.resourceId,
      details: { error: errorMessage },
      source: "system",
    });

    return {
      gateId: gate.id,
      userId,
      walletAddress: normalizedWallet,
      status: "denied",
      hasAccess: false,
      requirementResults: [],
      accessGranted: false,
      accessDeniedReason: errorMessage,
      bypassedByRole: false,
      inGracePeriod: false,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 1000), // Short expiry on error
      verificationMethod: "on_chain",
      fromCache: false,
    };
  }
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Invalidate cache for a specific gate
 */
export function invalidateGateCache(gateId: string, reason?: string): void {
  const now = new Date();
  let invalidatedCount = 0;

  for (const [key, entry] of verificationCache.entries()) {
    if (entry.result.gateId === gateId) {
      entry.invalidatedAt = now;
      entry.invalidationReason = reason || "Gate configuration changed";
      invalidatedCount++;
    }
  }

  logger.info(
    `Invalidated ${invalidatedCount} cache entries for gate ${gateId}`,
  );
}

/**
 * Invalidate cache for a wallet address
 */
export function invalidateWalletCache(
  walletAddress: string,
  reason?: string,
): void {
  const normalizedAddress = normalizeAddress(walletAddress);
  const now = new Date();
  let invalidatedCount = 0;

  for (const [key, entry] of verificationCache.entries()) {
    if (key.includes(normalizedAddress)) {
      entry.invalidatedAt = now;
      entry.invalidationReason = reason || "Wallet cache invalidated";
      invalidatedCount++;
    }
  }

  // Also clear the verification cache in the verifier
  clearWalletCache(walletAddress);

  logger.info(
    `Invalidated ${invalidatedCount} cache entries for wallet ${walletAddress}`,
  );
}

/**
 * Invalidate cache for a contract (e.g., on token transfer)
 */
export function invalidateContractCache(
  contractAddress: string,
  chainId?: ChainId,
  reason?: string,
): void {
  // Clear contract cache in verifier
  clearContractCache(contractAddress, chainId);

  logger.info(
    `Invalidated contract cache for ${contractAddress}${chainId ? ` on ${chainId}` : ""}`,
  );
}

/**
 * Handle cache invalidation event (e.g., from webhook)
 */
export function handleCacheInvalidation(event: CacheInvalidationEvent): void {
  logger.info(`Processing cache invalidation: ${event.type}`, { event });

  switch (event.type) {
    case "transfer":
      if (event.walletAddress) {
        invalidateWalletCache(event.walletAddress, event.reason);
      }
      if (event.contractAddress) {
        invalidateContractCache(
          event.contractAddress,
          event.chainId,
          event.reason,
        );
      }
      break;

    case "config_change":
      if (event.gateId) {
        invalidateGateCache(event.gateId, event.reason);
      }
      break;

    case "manual":
      if (event.gateId) {
        invalidateGateCache(event.gateId, event.reason);
      }
      if (event.walletAddress) {
        invalidateWalletCache(event.walletAddress, event.reason);
      }
      break;

    case "expiry":
      // Cleanup expired entries
      cleanupExpiredCache();
      break;
  }
}

/**
 * Clean up expired cache entries
 */
export function cleanupExpiredCache(): void {
  const now = new Date();
  let removedCount = 0;

  for (const [key, entry] of verificationCache.entries()) {
    if (now > entry.expiresAt || entry.invalidatedAt) {
      verificationCache.delete(key);
      removedCount++;
    }
  }

  // Clean up expired grace periods
  for (const [key, gracePeriod] of gracePeriods.entries()) {
    if (!isInGracePeriod(gracePeriod.endsAt)) {
      gracePeriods.delete(key);

      // Log grace period ended
      logEvent({
        type: "grace_period_ended",
        gateId: gracePeriod.gateId,
        userId: gracePeriod.userId,
        walletAddress: gracePeriod.walletAddress,
        resourceType: "channel", // Would need to look up from gate config
        resourceId: "",
        details: { endedAt: gracePeriod.endsAt },
        previousState: "grace_period",
        newState: "expired",
        source: "system",
      });
    }
  }

  if (removedCount > 0) {
    logger.info(`Cleaned up ${removedCount} expired cache entries`);
  }
}

// =============================================================================
// REVOCATION CHECKING
// =============================================================================

/**
 * Check for access revocation (called periodically or on demand)
 */
export async function checkRevocations(gateId?: string): Promise<void> {
  const gatesToCheck = gateId
    ? [gateConfigs.get(gateId)].filter(
        (g): g is TokenGateConfig => !!g && g.autoRevokeOnFailure,
      )
    : Array.from(gateConfigs.values()).filter(
        (g) => g.isActive && g.autoRevokeOnFailure,
      );

  for (const gate of gatesToCheck) {
    // Get all cached entries for this gate
    const cacheEntries = Array.from(verificationCache.entries()).filter(
      ([_, entry]) => entry.result.gateId === gate.id && entry.result.hasAccess,
    );

    for (const [cacheKey, entry] of cacheEntries) {
      // Re-verify access
      const accessResult = await checkAccess({
        userId: entry.result.userId,
        resourceType: gate.resourceType,
        resourceId: gate.resourceId,
        walletAddress: entry.result.walletAddress,
        forceRefresh: true,
      });

      // If access revoked and not in grace period, log the event
      if (!accessResult.hasAccess && !accessResult.inGracePeriod) {
        logEvent({
          type: "access_revoked",
          gateId: gate.id,
          userId: entry.result.userId,
          walletAddress: entry.result.walletAddress,
          resourceType: gate.resourceType,
          resourceId: gate.resourceId,
          details: { reason: accessResult.reason },
          previousState: "granted",
          newState: "denied",
          source: "system",
        });
      }
    }
  }
}

// =============================================================================
// STATISTICS & EVENTS
// =============================================================================

/**
 * Get statistics for a token gate
 */
export function getGateStats(gateId: string): TokenGateStats | null {
  const stats = statsMap.get(gateId);
  if (!stats) return null;

  return {
    gateId,
    totalChecks: stats.checks,
    successfulChecks: stats.successes,
    failedChecks: stats.failures,
    uniqueUsers: stats.users.size,
    averageVerificationTimeMs:
      stats.checks > 0 ? stats.totalTimeMs / stats.checks : 0,
    cacheHitRate: stats.checks > 0 ? stats.cacheHits / stats.checks : 0,
    lastCheckAt: undefined, // Would need to track this
  };
}

/**
 * Get recent events for a gate
 */
export function getGateEvents(
  gateId?: string,
  options?: {
    types?: TokenGateEventType[];
    limit?: number;
    since?: Date;
  },
): TokenGateEvent[] {
  let events = gateId
    ? eventLog.filter((e) => e.gateId === gateId)
    : [...eventLog];

  if (options?.types && options.types.length > 0) {
    events = events.filter((e) => options.types!.includes(e.type));
  }

  if (options?.since) {
    events = events.filter((e) => e.timestamp >= options.since!);
  }

  if (options?.limit) {
    events = events.slice(0, options.limit);
  }

  return events;
}

/**
 * Get users currently in grace period for a gate
 */
export function getGracePeriodUsers(gateId: string): Array<{
  userId: string;
  walletAddress: string;
  startedAt: Date;
  endsAt: Date;
}> {
  return Array.from(gracePeriods.values())
    .filter((gp) => gp.gateId === gateId && isInGracePeriod(gp.endsAt))
    .map((gp) => ({
      userId: gp.userId,
      walletAddress: gp.walletAddress,
      startedAt: gp.startedAt,
      endsAt: gp.endsAt,
    }));
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Check access for multiple users/resources
 */
export async function batchCheckAccess(
  requests: AccessCheckRequest[],
): Promise<Map<string, AccessCheckResult>> {
  const results = new Map<string, AccessCheckResult>();

  // Process in parallel
  await Promise.all(
    requests.map(async (request) => {
      const key = `${request.resourceType}:${request.resourceId}:${request.userId}`;
      const result = await checkAccess(request);
      results.set(key, result);
    }),
  );

  return results;
}

/**
 * Get access status for all gates a user has access to
 */
export async function getUserAccessStatus(
  userId: string,
  walletAddress: string,
  userRoles: string[] = [],
): Promise<Map<string, AccessCheckResult>> {
  const results = new Map<string, AccessCheckResult>();

  for (const gate of gateConfigs.values()) {
    if (!gate.isActive) continue;

    const result = await checkAccess({
      userId,
      resourceType: gate.resourceType,
      resourceId: gate.resourceId,
      walletAddress,
      userRoles,
    });

    results.set(gate.id, result);
  }

  return results;
}

// =============================================================================
// INITIALIZATION & CLEANUP
// =============================================================================

// Periodic cleanup interval
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize the token gate service
 */
export function initializeTokenGateService(): void {
  // Start periodic cleanup
  if (!cleanupInterval) {
    cleanupInterval = setInterval(
      () => {
        cleanupExpiredCache();
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  logger.info("Token gate service initialized");
}

/**
 * Shutdown the token gate service
 */
export function shutdownTokenGateService(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }

  logger.info("Token gate service shutdown");
}

/**
 * Reset service state (for testing)
 */
export function resetTokenGateService(): void {
  gateConfigs.clear();
  resourceGateMappings.clear();
  verificationCache.clear();
  gracePeriods.clear();
  eventLog.length = 0;
  statsMap.clear();
  clearVerificationCache();
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Cache utilities re-exported
  clearVerificationCache,
  clearWalletCache,
  clearContractCache,
};
