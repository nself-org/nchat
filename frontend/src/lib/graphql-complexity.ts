/**
 * GraphQL Query Complexity Analysis and Limits
 *
 * Prevents expensive queries from overwhelming the server by analyzing
 * and limiting query complexity based on depth, breadth, and field costs.
 */

import { DocumentNode, FieldNode, OperationDefinitionNode } from "graphql";
import { visit } from "graphql/language/visitor";

import { logger } from "@/lib/logger";

// ============================================================================
// Configuration
// ============================================================================

export interface ComplexityConfig {
  maxComplexity: number;
  maxDepth: number;
  defaultFieldCost: number;
  listMultiplier: number;
  customFieldCosts: Record<string, number>;
}

export const DEFAULT_COMPLEXITY_CONFIG: ComplexityConfig = {
  maxComplexity: 1000, // Maximum allowed complexity score
  maxDepth: 7, // Maximum query depth
  defaultFieldCost: 1, // Default cost per field
  listMultiplier: 10, // Multiplier for list fields
  customFieldCosts: {
    // High-cost operations
    nchat_messages: 5,
    nchat_messages_aggregate: 3,
    nchat_channels: 3,
    nchat_users: 3,
    search_messages: 10,
    search_channels: 8,
    nchat_audit_logs: 5,

    // Medium-cost operations
    nchat_reactions: 2,
    nchat_attachments: 2,
    nchat_notifications: 2,
    nchat_channel_members: 2,

    // Low-cost operations
    nchat_user_presence: 1,
    nchat_typing_indicators: 1,
    nchat_read_receipts: 1,

    // Expensive aggregates
    messages_aggregate: 5,
    channels_aggregate: 3,
    users_aggregate: 3,

    // Analytics/Reports (very expensive)
    channel_analytics: 20,
    user_activity_report: 15,
    message_engagement_stats: 10,
  },
};

// ============================================================================
// Complexity Analysis
// ============================================================================

export interface ComplexityResult {
  complexity: number;
  depth: number;
  fieldCount: number;
  listCount: number;
  isValid: boolean;
  errors: string[];
}

export class QueryComplexityAnalyzer {
  private config: ComplexityConfig;

  constructor(config: Partial<ComplexityConfig> = {}) {
    this.config = { ...DEFAULT_COMPLEXITY_CONFIG, ...config };
  }

  /**
   * Analyze query complexity
   */
  analyze(query: DocumentNode): ComplexityResult {
    const result: ComplexityResult = {
      complexity: 0,
      depth: 0,
      fieldCount: 0,
      listCount: 0,
      isValid: true,
      errors: [],
    };

    try {
      // Visit all fields in the query
      visit(query, {
        OperationDefinition: {
          enter: (node: OperationDefinitionNode) => {
            const depth = this.calculateDepth(node);
            result.depth = Math.max(result.depth, depth);

            if (depth > this.config.maxDepth) {
              result.isValid = false;
              result.errors.push(
                `Query depth ${depth} exceeds maximum allowed depth ${this.config.maxDepth}`,
              );
            }
          },
        },
        Field: {
          enter: (node: FieldNode) => {
            result.fieldCount++;

            const fieldName = node.name.value;
            const fieldCost = this.getFieldCost(fieldName);
            const isList = this.isListField(node);

            if (isList) {
              result.listCount++;
              result.complexity += fieldCost * this.config.listMultiplier;
            } else {
              result.complexity += fieldCost;
            }

            // Check for pagination arguments
            const hasLimit = node.arguments?.some(
              (arg) => arg.name.value === "limit",
            );
            if (isList && !hasLimit) {
              result.errors.push(
                `List field '${fieldName}' should include a 'limit' argument`,
              );
            }
          },
        },
      });

      // Check total complexity
      if (result.complexity > this.config.maxComplexity) {
        result.isValid = false;
        result.errors.push(
          `Query complexity ${result.complexity} exceeds maximum allowed complexity ${this.config.maxComplexity}`,
        );
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Error analyzing query: ${error}`);
    }

    return result;
  }

  /**
   * Calculate query depth
   */
  private calculateDepth(node: any, currentDepth: number = 0): number {
    if (!node) return currentDepth;

    let maxDepth = currentDepth;

    if (node.selectionSet) {
      for (const selection of node.selectionSet.selections) {
        const depth = this.calculateDepth(selection, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }

  /**
   * Get cost for a specific field
   */
  private getFieldCost(fieldName: string): number {
    return (
      this.config.customFieldCosts[fieldName] || this.config.defaultFieldCost
    );
  }

  /**
   * Check if field returns a list
   */
  private isListField(node: FieldNode): boolean {
    const fieldName = node.name.value;

    // Common list field patterns
    const listPatterns = [
      /_aggregate$/,
      /^nchat_/,
      /^search_/,
      /^get_.*_list$/,
      /_by_ids$/,
    ];

    return listPatterns.some((pattern) => pattern.test(fieldName));
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ComplexityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ComplexityConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Middleware for Query Validation
// ============================================================================

export function validateQueryComplexity(
  query: DocumentNode,
  config?: Partial<ComplexityConfig>,
): ComplexityResult {
  const analyzer = new QueryComplexityAnalyzer(config);
  return analyzer.analyze(query);
}

/**
 * Middleware to validate query complexity before execution
 */
export function createComplexityMiddleware(config?: Partial<ComplexityConfig>) {
  const analyzer = new QueryComplexityAnalyzer(config);

  return (query: DocumentNode) => {
    const result = analyzer.analyze(query);

    if (!result.isValid) {
      throw new Error(
        `Query validation failed:\n${result.errors.join("\n")}\n\nComplexity: ${result.complexity}/${analyzer.getConfig().maxComplexity}\nDepth: ${result.depth}/${analyzer.getConfig().maxDepth}`,
      );
    }

    return result;
  };
}

// ============================================================================
// Rate Limiting by Complexity
// ============================================================================

export interface ComplexityQuota {
  maxComplexityPerMinute: number;
  maxComplexityPerHour: number;
  currentMinute: number;
  currentHour: number;
  lastReset: Date;
}

export class ComplexityRateLimiter {
  private quotas: Map<string, ComplexityQuota> = new Map();
  private config: {
    maxComplexityPerMinute: number;
    maxComplexityPerHour: number;
  };

  constructor(config?: {
    maxComplexityPerMinute?: number;
    maxComplexityPerHour?: number;
  }) {
    this.config = {
      maxComplexityPerMinute: config?.maxComplexityPerMinute || 10000,
      maxComplexityPerHour: config?.maxComplexityPerHour || 100000,
    };
  }

  /**
   * Check if user has quota for query complexity
   */
  checkQuota(userId: string, complexity: number): boolean {
    const now = new Date();
    let quota = this.quotas.get(userId);

    if (!quota) {
      quota = {
        maxComplexityPerMinute: this.config.maxComplexityPerMinute,
        maxComplexityPerHour: this.config.maxComplexityPerHour,
        currentMinute: 0,
        currentHour: 0,
        lastReset: now,
      };
      this.quotas.set(userId, quota);
    }

    // Reset quotas if needed
    const timeSinceReset = now.getTime() - quota.lastReset.getTime();
    if (timeSinceReset >= 60000) {
      // 1 minute
      quota.currentMinute = 0;
      quota.lastReset = now;
    }
    if (timeSinceReset >= 3600000) {
      // 1 hour
      quota.currentHour = 0;
    }

    // Check limits
    if (
      quota.currentMinute + complexity > quota.maxComplexityPerMinute ||
      quota.currentHour + complexity > quota.maxComplexityPerHour
    ) {
      return false;
    }

    // Update quotas
    quota.currentMinute += complexity;
    quota.currentHour += complexity;

    return true;
  }

  /**
   * Get remaining quota for user
   */
  getRemainingQuota(userId: string): {
    remainingMinute: number;
    remainingHour: number;
  } {
    const quota = this.quotas.get(userId);

    if (!quota) {
      return {
        remainingMinute: this.config.maxComplexityPerMinute,
        remainingHour: this.config.maxComplexityPerHour,
      };
    }

    return {
      remainingMinute: quota.maxComplexityPerMinute - quota.currentMinute,
      remainingHour: quota.maxComplexityPerHour - quota.currentHour,
    };
  }

  /**
   * Reset quota for user
   */
  resetQuota(userId: string): void {
    this.quotas.delete(userId);
  }

  /**
   * Clear all quotas
   */
  clearAll(): void {
    this.quotas.clear();
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

let complexityAnalyzer: QueryComplexityAnalyzer | null = null;
let complexityRateLimiter: ComplexityRateLimiter | null = null;

export function getComplexityAnalyzer(): QueryComplexityAnalyzer {
  if (!complexityAnalyzer) {
    complexityAnalyzer = new QueryComplexityAnalyzer();
  }
  return complexityAnalyzer;
}

export function getComplexityRateLimiter(): ComplexityRateLimiter {
  if (!complexityRateLimiter) {
    complexityRateLimiter = new ComplexityRateLimiter();
  }
  return complexityRateLimiter;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get complexity score for a query string
 */
export function getQueryComplexity(queryString: string): number {
  try {
    const { parse } = require("graphql");
    const query = parse(queryString);
    const result = validateQueryComplexity(query);
    return result.complexity;
  } catch (error) {
    logger.error("Error parsing query:", error);
    return 0;
  }
}

/**
 * Check if query is allowed based on complexity and rate limiting
 */
export function isQueryAllowed(
  userId: string,
  query: DocumentNode,
): { allowed: boolean; reason?: string; complexity?: number } {
  try {
    const analyzer = getComplexityAnalyzer();
    const rateLimiter = getComplexityRateLimiter();

    const result = analyzer.analyze(query);

    if (!result.isValid) {
      return {
        allowed: false,
        reason: result.errors.join("; "),
        complexity: result.complexity,
      };
    }

    const hasQuota = rateLimiter.checkQuota(userId, result.complexity);
    if (!hasQuota) {
      const remaining = rateLimiter.getRemainingQuota(userId);
      return {
        allowed: false,
        reason: `Rate limit exceeded. Remaining quota: ${remaining.remainingMinute} per minute, ${remaining.remainingHour} per hour`,
        complexity: result.complexity,
      };
    }

    return { allowed: true, complexity: result.complexity };
  } catch (error) {
    return {
      allowed: false,
      reason: `Error validating query: ${error}`,
    };
  }
}
