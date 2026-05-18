/**
 * Entitlement Graph
 *
 * Manages entitlement inheritance through organization hierarchy.
 * Handles resolution of entitlements from parent to child scopes.
 *
 * @module @/lib/entitlements/entitlement-graph
 * @version 1.0.0
 */

import type { PlanTier } from "@/types/subscription.types";
import {
  EntitlementScope,
  EntitlementSource,
  EntitlementValueType,
  InheritanceRule,
  InheritanceCombineStrategy,
  InheritanceChain,
  EntitlementResolutionStep,
  EntitlementContext,
  EntitlementDefinition,
  BooleanEntitlementDefinition,
  NumericEntitlementDefinition,
  TierEntitlementDefinition,
  EntitlementGrant,
  SCOPE_HIERARCHY,
  PLAN_TIER_HIERARCHY,
  DEFAULT_INHERITANCE_RULES,
  EntitlementError,
  EntitlementErrorCode,
} from "./entitlement-types";

// ============================================================================
// Types
// ============================================================================

/**
 * Node in the entitlement graph.
 */
export interface EntitlementGraphNode {
  scope: EntitlementScope;
  entityId: string;
  planTier?: PlanTier;
  grants: Map<string, EntitlementGrant>;
  parentId?: string;
  children: Set<string>;
}

/**
 * Graph resolution options.
 */
export interface GraphResolutionOptions {
  /** Whether to include resolution chain */
  includeChain?: boolean;
  /** Stop at first resolution */
  earlyExit?: boolean;
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** Custom inheritance rules */
  inheritanceRules?: InheritanceRule[];
}

/**
 * Resolved value from graph traversal.
 */
export interface GraphResolvedValue {
  value: boolean | number | PlanTier | unknown;
  granted: boolean;
  source: EntitlementSource;
  scope: EntitlementScope;
  entityId: string;
  inheritedFrom?: string;
  resolutionChain?: EntitlementResolutionStep[];
}

// ============================================================================
// Entitlement Graph Class
// ============================================================================

export class EntitlementGraph {
  private nodes: Map<string, EntitlementGraphNode> = new Map();
  private inheritanceRules: InheritanceRule[];

  constructor(rules?: InheritanceRule[]) {
    this.inheritanceRules = rules ?? [...DEFAULT_INHERITANCE_RULES];
  }

  // ==========================================================================
  // Node Management
  // ==========================================================================

  /**
   * Create a unique node key from scope and entity ID.
   */
  private makeNodeKey(scope: EntitlementScope, entityId: string): string {
    return `${scope}:${entityId}`;
  }

  /**
   * Parse node key into scope and entity ID.
   */
  private parseNodeKey(key: string): {
    scope: EntitlementScope;
    entityId: string;
  } {
    const [scope, entityId] = key.split(":");
    return { scope: scope as EntitlementScope, entityId };
  }

  /**
   * Add a node to the graph.
   */
  addNode(
    scope: EntitlementScope,
    entityId: string,
    options?: { planTier?: PlanTier; parentId?: string },
  ): EntitlementGraphNode {
    const key = this.makeNodeKey(scope, entityId);

    if (this.nodes.has(key)) {
      const existing = this.nodes.get(key)!;
      if (options?.planTier) {
        existing.planTier = options.planTier;
      }
      return existing;
    }

    const node: EntitlementGraphNode = {
      scope,
      entityId,
      planTier: options?.planTier,
      grants: new Map(),
      parentId: options?.parentId,
      children: new Set(),
    };

    this.nodes.set(key, node);

    // Link to parent
    if (options?.parentId) {
      const parentScope = this.getParentScope(scope);
      if (parentScope) {
        const parentKey = this.makeNodeKey(parentScope, options.parentId);
        const parentNode = this.nodes.get(parentKey);
        if (parentNode) {
          parentNode.children.add(key);
        }
      }
    }

    return node;
  }

  /**
   * Get a node from the graph.
   */
  getNode(
    scope: EntitlementScope,
    entityId: string,
  ): EntitlementGraphNode | undefined {
    return this.nodes.get(this.makeNodeKey(scope, entityId));
  }

  /**
   * Remove a node from the graph.
   */
  removeNode(scope: EntitlementScope, entityId: string): boolean {
    const key = this.makeNodeKey(scope, entityId);
    const node = this.nodes.get(key);

    if (!node) {
      return false;
    }

    // Unlink from parent
    if (node.parentId) {
      const parentScope = this.getParentScope(scope);
      if (parentScope) {
        const parentKey = this.makeNodeKey(parentScope, node.parentId);
        const parentNode = this.nodes.get(parentKey);
        if (parentNode) {
          parentNode.children.delete(key);
        }
      }
    }

    // Remove children references
    for (const childKey of node.children) {
      const childNode = this.nodes.get(childKey);
      if (childNode) {
        childNode.parentId = undefined;
      }
    }

    return this.nodes.delete(key);
  }

  // ==========================================================================
  // Grant Management
  // ==========================================================================

  /**
   * Add a grant to a node.
   */
  addGrant(
    scope: EntitlementScope,
    entityId: string,
    grant: EntitlementGrant,
  ): void {
    const node = this.getNode(scope, entityId) ?? this.addNode(scope, entityId);
    node.grants.set(grant.entitlementKey, grant);
  }

  /**
   * Remove a grant from a node.
   */
  removeGrant(
    scope: EntitlementScope,
    entityId: string,
    entitlementKey: string,
  ): boolean {
    const node = this.getNode(scope, entityId);
    if (!node) {
      return false;
    }
    return node.grants.delete(entitlementKey);
  }

  /**
   * Get a grant from a node.
   */
  getGrant(
    scope: EntitlementScope,
    entityId: string,
    entitlementKey: string,
  ): EntitlementGrant | undefined {
    const node = this.getNode(scope, entityId);
    return node?.grants.get(entitlementKey);
  }

  /**
   * Get all grants for a node.
   */
  getGrants(scope: EntitlementScope, entityId: string): EntitlementGrant[] {
    const node = this.getNode(scope, entityId);
    return node ? Array.from(node.grants.values()) : [];
  }

  // ==========================================================================
  // Inheritance Chain
  // ==========================================================================

  /**
   * Get parent scope in hierarchy.
   */
  getParentScope(scope: EntitlementScope): EntitlementScope | undefined {
    const index = SCOPE_HIERARCHY.indexOf(scope);
    if (index <= 0) {
      return undefined;
    }
    return SCOPE_HIERARCHY[index - 1];
  }

  /**
   * Get child scope in hierarchy.
   */
  getChildScope(scope: EntitlementScope): EntitlementScope | undefined {
    const index = SCOPE_HIERARCHY.indexOf(scope);
    if (index < 0 || index >= SCOPE_HIERARCHY.length - 1) {
      return undefined;
    }
    return SCOPE_HIERARCHY[index + 1];
  }

  /**
   * Build inheritance chain for an entity.
   */
  buildInheritanceChain(context: EntitlementContext): InheritanceChain {
    const chain: InheritanceChain["chain"] = [];

    // Start from organization level
    if (context.organizationId) {
      const orgNode = this.getNode("organization", context.organizationId);
      chain.push({
        scope: "organization",
        entityId: context.organizationId,
        planTier: orgNode?.planTier ?? context.planTier,
      });
    }

    // Add workspace level
    if (context.workspaceId) {
      const wsNode = this.getNode("workspace", context.workspaceId);
      chain.push({
        scope: "workspace",
        entityId: context.workspaceId,
        planTier: wsNode?.planTier,
      });
    }

    // Add channel level
    if (context.channelId) {
      const channelNode = this.getNode("channel", context.channelId);
      chain.push({
        scope: "channel",
        entityId: context.channelId,
        planTier: channelNode?.planTier,
      });
    }

    // Add user level
    chain.push({
      scope: "user",
      entityId: context.userId,
    });

    // Determine final scope based on what context we have
    let scope: EntitlementScope = "user";
    let entityId = context.userId;

    if (context.channelId) {
      scope = "channel";
      entityId = context.channelId;
    } else if (context.workspaceId) {
      scope = "workspace";
      entityId = context.workspaceId;
    } else if (context.organizationId) {
      scope = "organization";
      entityId = context.organizationId;
    }

    return {
      scope,
      entityId,
      chain,
    };
  }

  // ==========================================================================
  // Resolution
  // ==========================================================================

  /**
   * Resolve an entitlement value through the inheritance graph.
   */
  resolve(
    entitlementKey: string,
    definition: EntitlementDefinition,
    context: EntitlementContext,
    options: GraphResolutionOptions = {},
  ): GraphResolvedValue {
    const {
      includeChain = false,
      maxDepth = 10,
      inheritanceRules = this.inheritanceRules,
    } = options;

    const resolutionChain: EntitlementResolutionStep[] = [];
    const inheritanceChain = this.buildInheritanceChain(context);

    let resolvedValue: unknown;
    let resolvedSource: EntitlementSource = "default";
    let resolvedScope: EntitlementScope = inheritanceChain.scope;
    let resolvedEntityId = inheritanceChain.entityId;
    let inheritedFrom: string | undefined;

    // Start with default value based on definition type
    resolvedValue = this.getDefaultValue(definition);

    // Process each level in the inheritance chain
    for (let i = 0; i < inheritanceChain.chain.length && i < maxDepth; i++) {
      const chainItem = inheritanceChain.chain[i];
      const node = this.getNode(chainItem.scope, chainItem.entityId);

      // Check for direct grant
      const grant = node?.grants.get(entitlementKey);
      if (
        grant &&
        grant.active &&
        (!grant.expiresAt || grant.expiresAt > new Date())
      ) {
        const newValue = this.combineValues(
          resolvedValue,
          grant.value,
          definition,
          this.getInheritanceRule(
            resolvedScope,
            chainItem.scope,
            inheritanceRules,
          ),
        );

        if (includeChain) {
          resolutionChain.push({
            scope: chainItem.scope,
            entityId: chainItem.entityId,
            source: grant.source,
            value: grant.value,
            applied: true,
            reason: `Grant from ${grant.source}`,
          });
        }

        resolvedValue = newValue;
        resolvedSource = grant.source;
        resolvedScope = chainItem.scope;
        resolvedEntityId = chainItem.entityId;

        if (i > 0) {
          inheritedFrom = inheritanceChain.chain[i - 1].entityId;
        }
      } else if (includeChain && node) {
        resolutionChain.push({
          scope: chainItem.scope,
          entityId: chainItem.entityId,
          source: "inherited",
          value: resolvedValue,
          applied: false,
          reason: "No grant found, using inherited value",
        });
      }

      // Apply plan-based value
      const planTier = chainItem.planTier ?? context.planTier;
      const planValue = this.getPlanValue(entitlementKey, definition, planTier);
      if (planValue !== undefined) {
        const combinedValue = this.combineValues(
          resolvedValue,
          planValue,
          definition,
          this.getInheritanceRule(
            resolvedScope,
            chainItem.scope,
            inheritanceRules,
          ),
        );

        // For tier entitlements, always use plan value
        if (definition.valueType === "tier") {
          resolvedValue = combinedValue;
          resolvedSource = "plan";
          resolvedScope = chainItem.scope;
          resolvedEntityId = chainItem.entityId;
        } else if (resolvedSource === "default") {
          // Only use plan value if no explicit grant
          resolvedValue = combinedValue;
          resolvedSource = "plan";
        }
      }
    }

    // Determine if granted based on value type
    const granted = this.evaluateGranted(
      resolvedValue,
      definition,
      context.planTier,
    );

    return {
      value: resolvedValue,
      granted,
      source: resolvedSource,
      scope: resolvedScope,
      entityId: resolvedEntityId,
      inheritedFrom,
      resolutionChain: includeChain ? resolutionChain : undefined,
    };
  }

  /**
   * Get default value from definition.
   */
  private getDefaultValue(definition: EntitlementDefinition): unknown {
    switch (definition.valueType) {
      case "boolean":
        return (definition as BooleanEntitlementDefinition).defaultValue;
      case "numeric":
        return (definition as NumericEntitlementDefinition).defaultValue;
      case "tier":
        return (definition as TierEntitlementDefinition).minimumTier;
      case "custom":
        return false;
      default:
        return false;
    }
  }

  /**
   * Get plan-based value for an entitlement.
   */
  private getPlanValue(
    _entitlementKey: string,
    definition: EntitlementDefinition,
    planTier: PlanTier,
  ): unknown {
    if (definition.valueType === "tier") {
      return planTier;
    }
    // Plan values are typically resolved by the entitlement service
    // using PLAN_FEATURES and PLAN_LIMITS
    return undefined;
  }

  /**
   * Get inheritance rule for scope transition.
   */
  private getInheritanceRule(
    fromScope: EntitlementScope,
    toScope: EntitlementScope,
    rules: InheritanceRule[],
  ): InheritanceRule | undefined {
    return rules.find((r) => r.from === fromScope && r.to === toScope);
  }

  /**
   * Combine values using inheritance strategy.
   */
  private combineValues(
    currentValue: unknown,
    newValue: unknown,
    definition: EntitlementDefinition,
    rule?: InheritanceRule,
  ): unknown {
    const strategy = rule?.combineStrategy ?? "replace";

    switch (strategy) {
      case "replace":
        return newValue;

      case "most_permissive":
        return this.compareMostPermissive(currentValue, newValue, definition);

      case "least_permissive":
        return this.compareLeastPermissive(currentValue, newValue, definition);

      case "sum":
        if (definition.valueType === "numeric") {
          return (currentValue as number) + (newValue as number);
        }
        return newValue;

      case "min":
        if (definition.valueType === "numeric") {
          const current = currentValue as number | null;
          const next = newValue as number | null;
          if (current === null) return next;
          if (next === null) return current;
          return Math.min(current, next);
        }
        return newValue;

      case "max":
        if (definition.valueType === "numeric") {
          const current = currentValue as number | null;
          const next = newValue as number | null;
          if (current === null) return current; // null = unlimited
          if (next === null) return next;
          return Math.max(current, next);
        }
        return newValue;

      case "merge":
        if (typeof currentValue === "object" && typeof newValue === "object") {
          return { ...(currentValue as object), ...(newValue as object) };
        }
        return newValue;

      default:
        return newValue;
    }
  }

  /**
   * Compare values and return most permissive.
   */
  private compareMostPermissive(
    a: unknown,
    b: unknown,
    definition: EntitlementDefinition,
  ): unknown {
    switch (definition.valueType) {
      case "boolean":
        return (a as boolean) || (b as boolean);

      case "numeric": {
        const numA = a as number | null;
        const numB = b as number | null;
        // null = unlimited = most permissive
        if (numA === null || numB === null) return null;
        return Math.max(numA, numB);
      }

      case "tier": {
        const tierA = a as PlanTier;
        const tierB = b as PlanTier;
        const indexA = PLAN_TIER_HIERARCHY.indexOf(tierA);
        const indexB = PLAN_TIER_HIERARCHY.indexOf(tierB);
        return indexA > indexB ? tierA : tierB;
      }

      default:
        return b;
    }
  }

  /**
   * Compare values and return least permissive.
   */
  private compareLeastPermissive(
    a: unknown,
    b: unknown,
    definition: EntitlementDefinition,
  ): unknown {
    switch (definition.valueType) {
      case "boolean":
        return (a as boolean) && (b as boolean);

      case "numeric": {
        const numA = a as number | null;
        const numB = b as number | null;
        // null = unlimited, so take the other value if one is null
        if (numA === null) return numB;
        if (numB === null) return numA;
        return Math.min(numA, numB);
      }

      case "tier": {
        const tierA = a as PlanTier;
        const tierB = b as PlanTier;
        const indexA = PLAN_TIER_HIERARCHY.indexOf(tierA);
        const indexB = PLAN_TIER_HIERARCHY.indexOf(tierB);
        return indexA < indexB ? tierA : tierB;
      }

      default:
        return b;
    }
  }

  /**
   * Evaluate if access is granted based on resolved value.
   */
  private evaluateGranted(
    value: unknown,
    definition: EntitlementDefinition,
    currentTier: PlanTier,
  ): boolean {
    switch (definition.valueType) {
      case "boolean":
        return value === true;

      case "numeric": {
        const numValue = value as number | null;
        // null = unlimited = granted
        if (numValue === null) return true;
        // Any positive value grants access
        return numValue > 0;
      }

      case "tier": {
        // For tier entitlements, we need to compare the user's current tier
        // against the minimum required tier from the definition
        const tierDef = definition as TierEntitlementDefinition;
        const minimumRequired = tierDef.minimumTier;
        const currentIndex = PLAN_TIER_HIERARCHY.indexOf(currentTier);
        const requiredIndex = PLAN_TIER_HIERARCHY.indexOf(minimumRequired);
        return currentIndex >= requiredIndex;
      }

      case "custom":
        // Custom gates return their own granted status
        return value === true;

      default:
        return false;
    }
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Resolve multiple entitlements at once.
   */
  resolveMany(
    entitlements: Array<{ key: string; definition: EntitlementDefinition }>,
    context: EntitlementContext,
    options: GraphResolutionOptions = {},
  ): Map<string, GraphResolvedValue> {
    const results = new Map<string, GraphResolvedValue>();

    for (const { key, definition } of entitlements) {
      try {
        const result = this.resolve(key, definition, context, options);
        results.set(key, result);
      } catch (error) {
        // Log error but continue with other entitlements
        console.error(`Error resolving entitlement ${key}:`, error);
        results.set(key, {
          value: this.getDefaultValue(definition),
          granted: false,
          source: "default",
          scope: "user",
          entityId: context.userId,
        });
      }
    }

    return results;
  }

  /**
   * Get all effective entitlements for a context.
   */
  getAllEffective(context: EntitlementContext): Map<string, EntitlementGrant> {
    const effective = new Map<string, EntitlementGrant>();
    const inheritanceChain = this.buildInheritanceChain(context);

    // Collect all grants from the inheritance chain, later entries override earlier
    for (const chainItem of inheritanceChain.chain) {
      const node = this.getNode(chainItem.scope, chainItem.entityId);
      if (node) {
        for (const [key, grant] of node.grants) {
          if (
            grant.active &&
            (!grant.expiresAt || grant.expiresAt > new Date())
          ) {
            effective.set(key, grant);
          }
        }
      }
    }

    return effective;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Clear all nodes and grants.
   */
  clear(): void {
    this.nodes.clear();
  }

  /**
   * Get total number of nodes.
   */
  get size(): number {
    return this.nodes.size;
  }

  /**
   * Check if graph has a node.
   */
  hasNode(scope: EntitlementScope, entityId: string): boolean {
    return this.nodes.has(this.makeNodeKey(scope, entityId));
  }

  /**
   * Get all nodes at a scope.
   */
  getNodesAtScope(scope: EntitlementScope): EntitlementGraphNode[] {
    const nodes: EntitlementGraphNode[] = [];
    for (const [key, node] of this.nodes) {
      if (key.startsWith(`${scope}:`)) {
        nodes.push(node);
      }
    }
    return nodes;
  }

  /**
   * Export graph state for debugging.
   */
  export(): Record<string, unknown> {
    const nodes: Record<string, unknown> = {};

    for (const [key, node] of this.nodes) {
      nodes[key] = {
        scope: node.scope,
        entityId: node.entityId,
        planTier: node.planTier,
        grants: Object.fromEntries(node.grants),
        parentId: node.parentId,
        children: Array.from(node.children),
      };
    }

    return {
      nodes,
      inheritanceRules: this.inheritanceRules,
    };
  }

  /**
   * Import graph state.
   */
  import(state: Record<string, unknown>): void {
    this.clear();

    const nodes = state.nodes as Record<string, Record<string, unknown>>;
    const rules = state.inheritanceRules as InheritanceRule[] | undefined;

    if (rules) {
      this.inheritanceRules = rules;
    }

    // First pass: create all nodes
    for (const [key, nodeData] of Object.entries(nodes)) {
      const { scope, entityId } = this.parseNodeKey(key);
      this.addNode(scope, entityId, {
        planTier: nodeData.planTier as PlanTier | undefined,
        parentId: nodeData.parentId as string | undefined,
      });
    }

    // Second pass: add grants
    for (const [key, nodeData] of Object.entries(nodes)) {
      const { scope, entityId } = this.parseNodeKey(key);
      const grants = nodeData.grants as
        | Record<string, EntitlementGrant>
        | undefined;
      if (grants) {
        for (const grant of Object.values(grants)) {
          this.addGrant(scope, entityId, grant);
        }
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let entitlementGraphInstance: EntitlementGraph | null = null;

/**
 * Get the singleton entitlement graph instance.
 */
export function getEntitlementGraph(
  rules?: InheritanceRule[],
): EntitlementGraph {
  if (!entitlementGraphInstance) {
    entitlementGraphInstance = new EntitlementGraph(rules);
  }
  return entitlementGraphInstance;
}

/**
 * Create a new entitlement graph instance.
 */
export function createEntitlementGraph(
  rules?: InheritanceRule[],
): EntitlementGraph {
  return new EntitlementGraph(rules);
}

/**
 * Reset the singleton instance (for testing).
 */
export function resetEntitlementGraph(): void {
  entitlementGraphInstance = null;
}
