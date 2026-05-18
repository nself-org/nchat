/**
 * Retention Policy Inheritance Logic
 *
 * Implements the policy inheritance and override rules for retention policies.
 * Policies are resolved from most general (global) to most specific (user),
 * with more specific policies able to override inherited rules.
 *
 * Inheritance Chain: Global -> Workspace -> Channel -> User
 *
 * @module lib/retention/policy-inheritance
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import {
  type RetentionPolicy,
  type RetentionRule,
  type RetentionScope,
  type RetentionContentType,
  type RetentionResolutionContext,
  type ResolvedRetentionPolicy,
  type LegalHold,
  SCOPE_PRIORITY,
  ALL_CONTENT_TYPES,
  isItemCoveredByLegalHold,
} from "./retention-types";

const log = createLogger("PolicyInheritance");

// ============================================================================
// TYPES
// ============================================================================

/**
 * Internal representation of a policy during resolution
 */
interface PolicyNode {
  policy: RetentionPolicy;
  scope: RetentionScope;
  priority: number;
  rules: Map<RetentionContentType, RetentionRule>;
}

/**
 * Result of merging policies
 */
interface MergeResult {
  rules: Map<RetentionContentType, RetentionRule>;
  sources: string[];
}

// ============================================================================
// POLICY RESOLUTION
// ============================================================================

/**
 * Resolve the effective retention policy for a given context
 *
 * This function takes all applicable policies and resolves them
 * according to the inheritance chain, returning the effective rules
 * that should be applied.
 *
 * @param policies - All potentially applicable policies
 * @param legalHolds - All active legal holds
 * @param context - Resolution context (user, channel, workspace IDs)
 * @returns Resolved policy with effective rules
 */
export function resolveRetentionPolicy(
  policies: RetentionPolicy[],
  legalHolds: LegalHold[],
  context: RetentionResolutionContext,
): ResolvedRetentionPolicy {
  log.debug("Resolving retention policy", {
    policyCount: policies.length,
    legalHoldCount: legalHolds.length,
    context,
  });

  // Filter and sort applicable policies
  const applicablePolicies = filterApplicablePolicies(policies, context);
  const sortedPolicies = sortPoliciesByPrecedence(applicablePolicies);

  // Build the inheritance chain
  const chain = buildInheritanceChain(sortedPolicies);

  // Merge policies from general to specific
  const mergeResult = mergePolicies(chain);

  // Check for active legal holds
  const activeLegalHolds = findApplicableLegalHolds(legalHolds, context);
  const deletionBlocked = activeLegalHolds.length > 0;

  // Determine effective scope
  const effectiveScope = determineEffectiveScope(chain);

  const result: ResolvedRetentionPolicy = {
    effectiveRules: mergeResult.rules,
    sourcePolicies: mergeResult.sources,
    activeLegalHolds: activeLegalHolds.map((h) => h.id),
    deletionBlocked,
    effectiveScope,
  };

  log.debug("Policy resolution complete", {
    ruleCount: result.effectiveRules.size,
    sourcePolicyCount: result.sourcePolicies.length,
    deletionBlocked: result.deletionBlocked,
    effectiveScope: result.effectiveScope,
  });

  return result;
}

/**
 * Filter policies to only those applicable to the context
 */
export function filterApplicablePolicies(
  policies: RetentionPolicy[],
  context: RetentionResolutionContext,
): RetentionPolicy[] {
  return policies.filter((policy) => {
    // Policy must be active
    if (policy.status !== "active") return false;

    // Check scope applicability
    switch (policy.scope) {
      case "global":
        // Global policies always apply
        return true;

      case "workspace":
        // Workspace policies apply if the workspace matches
        return policy.targetId === context.workspaceId;

      case "channel":
        // Channel policies apply if the channel matches
        return policy.targetId === context.channelId;

      case "user":
        // User policies apply if the user matches
        return policy.targetId === context.userId;

      default:
        return false;
    }
  });
}

/**
 * Sort policies by precedence (scope priority, then custom priority)
 * Lower precedence policies come first (so they can be overridden)
 */
export function sortPoliciesByPrecedence(
  policies: RetentionPolicy[],
): RetentionPolicy[] {
  return [...policies].sort((a, b) => {
    // First sort by scope priority
    const scopeDiff = SCOPE_PRIORITY[a.scope] - SCOPE_PRIORITY[b.scope];
    if (scopeDiff !== 0) return scopeDiff;

    // Then by custom priority (lower number = higher priority, comes later)
    return a.priority - b.priority;
  });
}

/**
 * Build the inheritance chain from sorted policies
 */
function buildInheritanceChain(
  sortedPolicies: RetentionPolicy[],
): PolicyNode[] {
  const chain: PolicyNode[] = [];

  for (const policy of sortedPolicies) {
    const node: PolicyNode = {
      policy,
      scope: policy.scope,
      priority: SCOPE_PRIORITY[policy.scope] * 1000 + policy.priority,
      rules: new Map(policy.rules.map((r) => [r.contentType, r])),
    };
    chain.push(node);
  }

  return chain;
}

/**
 * Merge policies following inheritance rules
 */
function mergePolicies(chain: PolicyNode[]): MergeResult {
  const effectiveRules = new Map<RetentionContentType, RetentionRule>();
  const sources: string[] = [];
  const ruleSource = new Map<RetentionContentType, string>();

  for (const node of chain) {
    const { policy, rules } = node;

    // Skip if policy doesn't allow inheritance and it's not the most specific
    if (!policy.inheritable && chain.indexOf(node) < chain.length - 1) {
      log.debug("Skipping non-inheritable policy", { policyId: policy.id });
      continue;
    }

    for (const [contentType, rule] of rules) {
      // Check if we should apply this rule
      const existingSource = ruleSource.get(contentType);

      if (existingSource) {
        // Check if the existing rule's policy allows overrides
        const existingPolicy = chain.find(
          (n) => n.policy.id === existingSource,
        )?.policy;
        if (existingPolicy && !existingPolicy.allowOverride) {
          log.debug("Rule override blocked", {
            contentType,
            existingPolicyId: existingSource,
            newPolicyId: policy.id,
          });
          continue;
        }
      }

      // Apply the rule if enabled
      if (rule.enabled) {
        effectiveRules.set(contentType, rule);
        ruleSource.set(contentType, policy.id);

        if (!sources.includes(policy.id)) {
          sources.push(policy.id);
        }
      }
    }
  }

  return { rules: effectiveRules, sources };
}

/**
 * Find legal holds that apply to the given context
 */
export function findApplicableLegalHolds(
  legalHolds: LegalHold[],
  context: RetentionResolutionContext,
): LegalHold[] {
  return legalHolds.filter((hold) => {
    if (hold.status !== "active") return false;

    // Check if hold scope matches context
    // Empty scope arrays mean "all"
    const scopeMatches =
      // Workspace scope
      (hold.scope.workspaceIds.length === 0 ||
        (context.workspaceId &&
          hold.scope.workspaceIds.includes(context.workspaceId))) &&
      // Channel scope
      (hold.scope.channelIds.length === 0 ||
        (context.channelId &&
          hold.scope.channelIds.includes(context.channelId))) &&
      // User scope
      (hold.scope.userIds.length === 0 ||
        (context.userId && hold.scope.userIds.includes(context.userId))) &&
      // Content type scope
      (hold.scope.contentTypes.length === 0 ||
        (context.contentType &&
          hold.scope.contentTypes.includes(context.contentType)));

    return scopeMatches;
  });
}

/**
 * Determine the effective scope from the chain
 */
function determineEffectiveScope(chain: PolicyNode[]): RetentionScope {
  if (chain.length === 0) return "global";
  return chain[chain.length - 1].scope;
}

// ============================================================================
// RULE RESOLUTION
// ============================================================================

/**
 * Get the effective rule for a specific content type
 */
export function getEffectiveRule(
  resolved: ResolvedRetentionPolicy,
  contentType: RetentionContentType,
): RetentionRule | null {
  return resolved.effectiveRules.get(contentType) || null;
}

/**
 * Check if deletion is allowed for a specific item
 */
export function isDeletionAllowed(
  resolved: ResolvedRetentionPolicy,
  contentType: RetentionContentType,
): boolean {
  // Legal holds block all deletions
  if (resolved.deletionBlocked) {
    return false;
  }

  // Check if there's an active rule for this content type
  const rule = resolved.effectiveRules.get(contentType);
  if (!rule || !rule.enabled) {
    return true; // No rule means no retention requirement
  }

  return true; // Deletion allowed if no legal holds
}

/**
 * Check if a specific item is covered by any legal hold
 */
export function isItemOnLegalHold(
  legalHolds: LegalHold[],
  item: {
    userId?: string;
    channelId?: string;
    workspaceId?: string;
    contentType: RetentionContentType;
    createdAt: Date;
  },
): { onHold: boolean; holds: string[] } {
  const applicableHolds = legalHolds.filter((hold) =>
    isItemCoveredByLegalHold(hold, item),
  );

  return {
    onHold: applicableHolds.length > 0,
    holds: applicableHolds.map((h) => h.id),
  };
}

// ============================================================================
// INHERITANCE UTILITIES
// ============================================================================

/**
 * Get the parent scope for a given scope
 */
export function getParentScope(scope: RetentionScope): RetentionScope | null {
  switch (scope) {
    case "user":
      return "channel";
    case "channel":
      return "workspace";
    case "workspace":
      return "global";
    case "global":
      return null;
    default:
      return null;
  }
}

/**
 * Get the child scopes for a given scope
 */
export function getChildScopes(scope: RetentionScope): RetentionScope[] {
  switch (scope) {
    case "global":
      return ["workspace", "channel", "user"];
    case "workspace":
      return ["channel", "user"];
    case "channel":
      return ["user"];
    case "user":
      return [];
    default:
      return [];
  }
}

/**
 * Build the full scope hierarchy for a context
 */
export function buildScopeHierarchy(
  context: RetentionResolutionContext,
): Array<{ scope: RetentionScope; targetId: string | null }> {
  const hierarchy: Array<{ scope: RetentionScope; targetId: string | null }> =
    [];

  // Global is always first
  hierarchy.push({ scope: "global", targetId: null });

  // Add workspace if present
  if (context.workspaceId) {
    hierarchy.push({ scope: "workspace", targetId: context.workspaceId });
  }

  // Add channel if present
  if (context.channelId) {
    hierarchy.push({ scope: "channel", targetId: context.channelId });
  }

  // Add user if present
  if (context.userId) {
    hierarchy.push({ scope: "user", targetId: context.userId });
  }

  return hierarchy;
}

/**
 * Check if a policy at one scope can override a policy at another scope
 */
export function canOverride(
  overriderScope: RetentionScope,
  targetScope: RetentionScope,
): boolean {
  return SCOPE_PRIORITY[overriderScope] > SCOPE_PRIORITY[targetScope];
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a retention policy configuration
 */
export function validatePolicy(policy: RetentionPolicy): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!policy.id) errors.push("Policy ID is required");
  if (!policy.name) errors.push("Policy name is required");
  if (!policy.scope) errors.push("Policy scope is required");

  // Validate scope and targetId
  if (policy.scope !== "global" && !policy.targetId) {
    errors.push(`Target ID is required for ${policy.scope} scope`);
  }
  if (policy.scope === "global" && policy.targetId) {
    errors.push("Global scope should not have a target ID");
  }

  // Validate rules
  if (!policy.rules || policy.rules.length === 0) {
    errors.push("At least one retention rule is required");
  } else {
    for (const rule of policy.rules) {
      const ruleErrors = validateRule(rule);
      errors.push(...ruleErrors.map((e) => `Rule ${rule.contentType}: ${e}`));
    }
  }

  // Validate priority
  if (policy.priority < 0) {
    errors.push("Priority must be non-negative");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single retention rule
 */
export function validateRule(rule: RetentionRule): string[] {
  const errors: string[] = [];

  // Check content type
  if (!ALL_CONTENT_TYPES.includes(rule.contentType)) {
    errors.push(`Invalid content type: ${rule.contentType}`);
  }

  // Check retention period
  if (rule.period.value <= 0) {
    errors.push("Retention period value must be positive");
  }

  // Check action
  if (!["delete", "archive", "archive_then_delete"].includes(rule.action)) {
    errors.push(`Invalid action: ${rule.action}`);
  }

  // Validate grace period if present
  if (rule.gracePeriod?.enabled) {
    if (rule.gracePeriod.duration.value <= 0) {
      errors.push("Grace period duration must be positive");
    }
  }

  // Check archive destination if action includes archival
  if (
    (rule.action === "archive" || rule.action === "archive_then_delete") &&
    !rule.archiveDestination
  ) {
    // This is a warning, not an error - destination can be configured globally
  }

  return errors;
}

/**
 * Validate a legal hold configuration
 */
export function validateLegalHold(hold: LegalHold): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!hold.id) errors.push("Legal hold ID is required");
  if (!hold.name) errors.push("Legal hold name is required");
  if (!hold.matterReference) errors.push("Matter reference is required");

  // Validate scope
  if (!hold.scope) {
    errors.push("Legal hold scope is required");
  } else {
    // Validate content types if specified
    if (hold.scope.contentTypes.length > 0) {
      for (const ct of hold.scope.contentTypes) {
        if (!ALL_CONTENT_TYPES.includes(ct)) {
          errors.push(`Invalid content type in scope: ${ct}`);
        }
      }
    }

    // Validate date range
    if (hold.scope.startDate && hold.scope.endDate) {
      if (hold.scope.startDate > hold.scope.endDate) {
        errors.push("Start date must be before end date");
      }
    }
  }

  // Validate expiration
  if (hold.expiresAt && hold.expiresAt < new Date()) {
    errors.push("Expiration date must be in the future");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Detect conflicts between policies
 */
export function detectPolicyConflicts(policies: RetentionPolicy[]): Array<{
  policy1: string;
  policy2: string;
  contentType: RetentionContentType;
  conflictType: "same_scope" | "override_blocked";
  description: string;
}> {
  const conflicts: Array<{
    policy1: string;
    policy2: string;
    contentType: RetentionContentType;
    conflictType: "same_scope" | "override_blocked";
    description: string;
  }> = [];

  for (let i = 0; i < policies.length; i++) {
    for (let j = i + 1; j < policies.length; j++) {
      const p1 = policies[i];
      const p2 = policies[j];

      // Check for same-scope conflicts
      if (
        p1.scope === p2.scope &&
        p1.targetId === p2.targetId &&
        p1.priority === p2.priority
      ) {
        // Find overlapping content types
        const p1Types = new Set(p1.rules.map((r) => r.contentType));
        const p2Types = new Set(p2.rules.map((r) => r.contentType));

        for (const ct of p1Types) {
          if (p2Types.has(ct)) {
            conflicts.push({
              policy1: p1.id,
              policy2: p2.id,
              contentType: ct,
              conflictType: "same_scope",
              description: `Both policies have the same scope, target, and priority for ${ct}`,
            });
          }
        }
      }

      // Check for override-blocked conflicts
      if (
        !p1.allowOverride &&
        SCOPE_PRIORITY[p2.scope] > SCOPE_PRIORITY[p1.scope]
      ) {
        const p1Types = new Set(p1.rules.map((r) => r.contentType));
        const p2Types = new Set(p2.rules.map((r) => r.contentType));

        for (const ct of p1Types) {
          if (p2Types.has(ct)) {
            conflicts.push({
              policy1: p1.id,
              policy2: p2.id,
              contentType: ct,
              conflictType: "override_blocked",
              description: `Policy ${p1.id} blocks override from ${p2.id} for ${ct}`,
            });
          }
        }
      }
    }
  }

  return conflicts;
}

// ============================================================================
// DEBUGGING UTILITIES
// ============================================================================

/**
 * Create a human-readable representation of the policy resolution
 */
export function explainResolution(
  policies: RetentionPolicy[],
  legalHolds: LegalHold[],
  context: RetentionResolutionContext,
): string[] {
  const explanation: string[] = [];
  const resolved = resolveRetentionPolicy(policies, legalHolds, context);

  explanation.push("=== Policy Resolution Explanation ===");
  explanation.push(`Context: ${JSON.stringify(context)}`);
  explanation.push(`Effective Scope: ${resolved.effectiveScope}`);
  explanation.push(
    `Source Policies: ${resolved.sourcePolicies.join(", ") || "none"}`,
  );
  explanation.push(`Deletion Blocked: ${resolved.deletionBlocked}`);

  if (resolved.activeLegalHolds.length > 0) {
    explanation.push(
      `Active Legal Holds: ${resolved.activeLegalHolds.join(", ")}`,
    );
  }

  explanation.push("");
  explanation.push("Effective Rules:");

  for (const [contentType, rule] of resolved.effectiveRules) {
    explanation.push(
      `  ${contentType}: ${rule.period.value} ${rule.period.unit} -> ${rule.action}`,
    );
  }

  return explanation;
}

/**
 * Trace the resolution path for debugging
 */
export function traceResolution(
  policies: RetentionPolicy[],
  context: RetentionResolutionContext,
  contentType: RetentionContentType,
): Array<{
  policyId: string;
  scope: RetentionScope;
  action: "applied" | "skipped" | "overridden";
  reason: string;
}> {
  const trace: Array<{
    policyId: string;
    scope: RetentionScope;
    action: "applied" | "skipped" | "overridden";
    reason: string;
  }> = [];

  const applicable = filterApplicablePolicies(policies, context);
  const sorted = sortPoliciesByPrecedence(applicable);

  let appliedPolicyId: string | null = null;

  for (const policy of sorted) {
    const rule = policy.rules.find((r) => r.contentType === contentType);

    if (!rule) {
      trace.push({
        policyId: policy.id,
        scope: policy.scope,
        action: "skipped",
        reason: `No rule for ${contentType}`,
      });
      continue;
    }

    if (!rule.enabled) {
      trace.push({
        policyId: policy.id,
        scope: policy.scope,
        action: "skipped",
        reason: "Rule is disabled",
      });
      continue;
    }

    if (appliedPolicyId) {
      const appliedPolicy = policies.find((p) => p.id === appliedPolicyId);
      if (appliedPolicy && !appliedPolicy.allowOverride) {
        trace.push({
          policyId: policy.id,
          scope: policy.scope,
          action: "skipped",
          reason: `Override blocked by ${appliedPolicyId}`,
        });
        continue;
      }

      trace.push({
        policyId: appliedPolicyId,
        scope:
          policies.find((p) => p.id === appliedPolicyId)?.scope || "global",
        action: "overridden",
        reason: `Overridden by ${policy.id}`,
      });
    }

    trace.push({
      policyId: policy.id,
      scope: policy.scope,
      action: "applied",
      reason: "Rule applied successfully",
    });

    appliedPolicyId = policy.id;
  }

  return trace;
}
