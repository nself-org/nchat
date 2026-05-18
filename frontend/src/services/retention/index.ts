/**
 * Retention Services Index
 *
 * Central export for retention policy management and execution services.
 *
 * @module services/retention
 * @version 1.0.0
 */

// Retention Policy Service
export {
  RetentionPolicyService,
  getRetentionPolicyService,
  createRetentionPolicyService,
  initializeRetentionPolicyService,
  resetRetentionPolicyService,
  type ListPoliciesOptions,
  type ListLegalHoldsOptions,
  type PolicyOperationResult,
} from "./retention-policy.service";

// Retention Executor Service
export {
  RetentionExecutorService,
  getRetentionExecutorService,
  createRetentionExecutorService,
  initializeRetentionExecutorService,
  resetRetentionExecutorService,
  InMemoryContentProvider,
  type ContentProvider,
  type ContentItem,
} from "./retention-executor.service";

// Re-export types from lib
export * from "@/lib/retention";
