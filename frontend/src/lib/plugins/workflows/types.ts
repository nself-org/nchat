/**
 * Workflow Automation Types
 *
 * Comprehensive type definitions for the workflow automation system.
 * Supports trigger -> step -> action flow with approvals, scheduling,
 * branching, retry logic, and audit logging.
 *
 * Reference platforms: Slack Workflow Builder, Discord AutoMod, Zapier.
 */

import type { AppScope, AppEventType } from "../app-contract";

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

/**
 * A workflow definition: the blueprint for an automated process.
 */
export interface WorkflowDefinition {
  /** Unique workflow ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this workflow does */
  description: string;
  /** Workflow version (semver) */
  version: string;
  /** Whether the workflow is enabled */
  enabled: boolean;
  /** The trigger that starts this workflow */
  trigger: WorkflowTrigger;
  /** Ordered list of steps to execute */
  steps: WorkflowStep[];
  /** Input variables defined for this workflow */
  inputSchema: WorkflowVariable[];
  /** Global workflow settings */
  settings: WorkflowSettings;
  /** Required scopes for this workflow */
  requiredScopes: AppScope[];
  /** Tags for organization */
  tags: string[];
  /** Who created this workflow */
  createdBy: string;
  /** When created */
  createdAt: string;
  /** When last updated */
  updatedAt: string;
}

/**
 * Workflow-level settings.
 */
export interface WorkflowSettings {
  /** Maximum execution time in ms (default: 300000 = 5 min) */
  maxExecutionTimeMs: number;
  /** Maximum retry attempts per step (default: 3) */
  maxRetryAttempts: number;
  /** Whether to continue on step failure (default: false) */
  continueOnFailure: boolean;
  /** Timezone for schedule triggers (default: 'UTC') */
  timezone: string;
  /** Whether to log step inputs/outputs (default: true) */
  auditInputsOutputs: boolean;
  /** Concurrency limit: max parallel executions (default: 1) */
  maxConcurrentExecutions: number;
  /** Whether this workflow requires approval to execute (default: false) */
  requiresApproval: boolean;
}

/**
 * Default workflow settings.
 */
export const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettings = {
  maxExecutionTimeMs: 300000,
  maxRetryAttempts: 3,
  continueOnFailure: false,
  timezone: "UTC",
  auditInputsOutputs: true,
  maxConcurrentExecutions: 1,
  requiresApproval: false,
};

/**
 * Variable definition for workflow inputs.
 */
export interface WorkflowVariable {
  /** Variable name */
  name: string;
  /** Variable type */
  type: "string" | "number" | "boolean" | "object" | "array";
  /** Whether the variable is required */
  required: boolean;
  /** Default value */
  defaultValue?: unknown;
  /** Human-readable description */
  description?: string;
}

// ============================================================================
// TRIGGERS
// ============================================================================

/**
 * A workflow trigger defines when and how a workflow starts.
 */
export type WorkflowTrigger =
  | EventTrigger
  | ScheduleTrigger
  | WebhookTrigger
  | ManualTrigger;

/**
 * Base trigger interface.
 */
export interface BaseTrigger {
  /** Trigger type discriminator */
  type: TriggerType;
  /** Optional filter conditions */
  conditions?: TriggerCondition[];
}

/**
 * Trigger type discriminator.
 */
export type TriggerType = "event" | "schedule" | "webhook" | "manual";

/**
 * Event-based trigger: fires when a platform event occurs.
 */
export interface EventTrigger extends BaseTrigger {
  type: "event";
  /** The event type to listen for */
  eventType: AppEventType;
  /** Optional channel filter */
  channelIds?: string[];
  /** Optional user filter */
  userIds?: string[];
}

/**
 * Schedule-based trigger: fires on a cron schedule.
 */
export interface ScheduleTrigger extends BaseTrigger {
  type: "schedule";
  /** Cron expression (5 or 6 fields) */
  cronExpression: string;
  /** Timezone (IANA timezone name) */
  timezone: string;
  /** Start date (ISO 8601) - schedule is not active before this */
  startDate?: string;
  /** End date (ISO 8601) - schedule is not active after this */
  endDate?: string;
}

/**
 * Webhook-based trigger: fires when an external HTTP request is received.
 */
export interface WebhookTrigger extends BaseTrigger {
  type: "webhook";
  /** Expected HMAC secret for validation (optional) */
  secret?: string;
  /** HTTP methods to accept */
  methods: ("GET" | "POST" | "PUT")[];
  /** Expected content type */
  contentType?: string;
}

/**
 * Manual trigger: fired by a user via UI or API.
 */
export interface ManualTrigger extends BaseTrigger {
  type: "manual";
  /** Users allowed to trigger this workflow */
  allowedUserIds?: string[];
  /** Roles allowed to trigger this workflow */
  allowedRoles?: string[];
}

/**
 * A condition applied to a trigger or step.
 */
export interface TriggerCondition {
  /** Field to evaluate (dot-separated path into trigger data) */
  field: string;
  /** Comparison operator */
  operator: ConditionOperator;
  /** Value to compare against */
  value: unknown;
}

/**
 * Supported comparison operators.
 */
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "in"
  | "not_in"
  | "matches_regex"
  | "exists"
  | "not_exists";

// ============================================================================
// STEPS
// ============================================================================

/**
 * A workflow step: an individual unit of execution.
 */
export interface WorkflowStep {
  /** Unique step ID within the workflow */
  id: string;
  /** Human-readable name */
  name: string;
  /** Step type */
  type: StepType;
  /** The action to perform */
  action: WorkflowAction;
  /** Step-specific settings */
  settings: StepSettings;
  /** Conditions that must be true for this step to execute */
  conditions?: TriggerCondition[];
  /** Input mapping: map workflow/step variables to action inputs */
  inputMapping?: Record<string, string>;
  /** Output key: where to store this step's output in the execution context */
  outputKey?: string;
  /** Steps that must complete before this step (dependency graph) */
  dependsOn?: string[];
}

/**
 * Step type.
 */
export type StepType =
  | "action"
  | "condition"
  | "approval"
  | "delay"
  | "parallel"
  | "loop";

/**
 * Per-step settings.
 */
export interface StepSettings {
  /** Maximum retry attempts for this step */
  retryAttempts: number;
  /** Retry backoff strategy */
  retryBackoff: "fixed" | "linear" | "exponential";
  /** Initial retry delay in ms */
  retryDelayMs: number;
  /** Maximum retry delay in ms */
  maxRetryDelayMs: number;
  /** Step timeout in ms */
  timeoutMs: number;
  /** Whether to skip this step on failure (vs failing the workflow) */
  skipOnFailure: boolean;
  /** Whether this step is idempotent (safe to retry) */
  idempotent: boolean;
  /** Idempotency key expression (for dedup) */
  idempotencyKey?: string;
}

/**
 * Default step settings.
 */
export const DEFAULT_STEP_SETTINGS: StepSettings = {
  retryAttempts: 3,
  retryBackoff: "exponential",
  retryDelayMs: 1000,
  maxRetryDelayMs: 60000,
  timeoutMs: 30000,
  skipOnFailure: false,
  idempotent: true,
};

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * A workflow action: the concrete operation performed by a step.
 */
export type WorkflowAction =
  | SendMessageAction
  | HttpRequestAction
  | TransformDataAction
  | ConditionalBranchAction
  | ApprovalAction
  | DelayAction
  | SetVariableAction
  | ParallelAction
  | LoopAction
  | ChannelAction
  | UserAction;

/**
 * Base action interface.
 */
export interface BaseAction {
  type: ActionType;
}

/**
 * All action types.
 */
export type ActionType =
  | "send_message"
  | "http_request"
  | "transform_data"
  | "conditional_branch"
  | "approval"
  | "delay"
  | "set_variable"
  | "parallel"
  | "loop"
  | "channel_action"
  | "user_action";

/**
 * Send a message to a channel or user.
 */
export interface SendMessageAction extends BaseAction {
  type: "send_message";
  /** Target channel ID (can reference variable) */
  channelId: string;
  /** Message content (supports template interpolation) */
  content: string;
  /** Optional thread ID to reply to */
  threadId?: string;
}

/**
 * Make an HTTP request to an external service.
 */
export interface HttpRequestAction extends BaseAction {
  type: "http_request";
  /** URL (supports template interpolation) */
  url: string;
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (for POST/PUT/PATCH) */
  body?: unknown;
  /** Expected response format */
  responseFormat?: "json" | "text";
}

/**
 * Transform data using a mapping expression.
 */
export interface TransformDataAction extends BaseAction {
  type: "transform_data";
  /** Input expression (dot-path or template) */
  input: string;
  /** Transform expression (JavaScript-like) */
  transform: string;
}

/**
 * Branch based on conditions.
 */
export interface ConditionalBranchAction extends BaseAction {
  type: "conditional_branch";
  /** Branches to evaluate (first matching branch is taken) */
  branches: ConditionalBranch[];
  /** Default steps if no branch matches */
  defaultSteps?: string[];
}

/**
 * A conditional branch.
 */
export interface ConditionalBranch {
  /** Branch name for logging */
  name: string;
  /** Conditions to evaluate */
  conditions: TriggerCondition[];
  /** Step IDs to jump to if conditions match */
  targetSteps: string[];
}

/**
 * Request human approval.
 */
export interface ApprovalAction extends BaseAction {
  type: "approval";
  /** Users who can approve */
  approverIds: string[];
  /** Approval message */
  message: string;
  /** Timeout in ms before auto-rejection */
  timeoutMs: number;
  /** Minimum approvals required (default: 1) */
  minApprovals: number;
  /** Channel to post approval request to */
  notificationChannelId?: string;
  /** Escalation user IDs if timeout */
  escalationUserIds?: string[];
}

/**
 * Delay execution for a specified duration.
 */
export interface DelayAction extends BaseAction {
  type: "delay";
  /** Delay in ms */
  durationMs: number;
}

/**
 * Set a workflow variable.
 */
export interface SetVariableAction extends BaseAction {
  type: "set_variable";
  /** Variable name */
  variableName: string;
  /** Value (supports template interpolation) */
  value: unknown;
}

/**
 * Execute multiple step groups in parallel.
 */
export interface ParallelAction extends BaseAction {
  type: "parallel";
  /** Arrays of step IDs to execute in parallel */
  branches: string[][];
  /** Whether to wait for all branches (true) or first to complete (false) */
  waitForAll: boolean;
}

/**
 * Loop over a collection.
 */
export interface LoopAction extends BaseAction {
  type: "loop";
  /** Expression resolving to an array to iterate over */
  collection: string;
  /** Variable name for the current item */
  itemVariable: string;
  /** Variable name for the current index */
  indexVariable: string;
  /** Step IDs to execute for each item */
  bodySteps: string[];
  /** Maximum iterations (safety guard) */
  maxIterations: number;
}

/**
 * Channel-related action.
 */
export interface ChannelAction extends BaseAction {
  type: "channel_action";
  /** Sub-action */
  subAction:
    | "create"
    | "archive"
    | "add_member"
    | "remove_member"
    | "update_topic";
  /** Target channel ID (for non-create actions) */
  channelId?: string;
  /** Channel name (for create) */
  channelName?: string;
  /** User ID (for member actions) */
  userId?: string;
  /** Topic (for update_topic) */
  topic?: string;
}

/**
 * User-related action.
 */
export interface UserAction extends BaseAction {
  type: "user_action";
  /** Sub-action */
  subAction: "assign_role" | "send_dm" | "notify";
  /** Target user ID */
  userId: string;
  /** Role (for assign_role) */
  role?: string;
  /** Message (for send_dm/notify) */
  message?: string;
}

// ============================================================================
// EXECUTION STATE
// ============================================================================

/**
 * A workflow execution run: tracks the state of a single workflow invocation.
 */
export interface WorkflowRun {
  /** Unique run ID */
  id: string;
  /** Workflow definition ID */
  workflowId: string;
  /** Workflow version at execution time */
  workflowVersion: string;
  /** Current run status */
  status: WorkflowRunStatus;
  /** What triggered this run */
  triggeredBy: RunTriggerInfo;
  /** Execution context (variables, step outputs) */
  context: WorkflowExecutionContext;
  /** Step execution records */
  stepResults: StepExecutionRecord[];
  /** When execution started */
  startedAt: string;
  /** When execution completed/failed */
  completedAt?: string;
  /** Error information (if failed) */
  error?: WorkflowError;
  /** Retry count for the overall run */
  retryCount: number;
  /** Maximum retries for the overall run */
  maxRetries: number;
}

/**
 * Run status.
 */
export type WorkflowRunStatus =
  | "pending"
  | "running"
  | "paused"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "retrying";

/**
 * Information about what triggered a run.
 */
export interface RunTriggerInfo {
  type: TriggerType;
  /** User who triggered (for manual triggers) */
  userId?: string;
  /** Event data (for event triggers) */
  eventData?: Record<string, unknown>;
  /** Schedule info (for schedule triggers) */
  scheduledTime?: string;
  /** Webhook request data */
  webhookData?: Record<string, unknown>;
}

/**
 * Execution context: mutable state during workflow execution.
 */
export interface WorkflowExecutionContext {
  /** Workflow input variables */
  inputs: Record<string, unknown>;
  /** Step outputs (keyed by step outputKey) */
  stepOutputs: Record<string, unknown>;
  /** Workflow-level variables (mutable during execution) */
  variables: Record<string, unknown>;
  /** Trigger data */
  triggerData: Record<string, unknown>;
}

/**
 * Record of a single step's execution.
 */
export interface StepExecutionRecord {
  /** Step ID */
  stepId: string;
  /** Step name */
  stepName: string;
  /** Step status */
  status: StepExecutionStatus;
  /** When step started */
  startedAt: string;
  /** When step completed */
  completedAt?: string;
  /** Duration in ms */
  durationMs?: number;
  /** Step input (if audit enabled) */
  input?: Record<string, unknown>;
  /** Step output */
  output?: unknown;
  /** Error information */
  error?: WorkflowError;
  /** Retry count for this step */
  retryCount: number;
  /** Whether the step was skipped */
  skipped: boolean;
  /** Skip reason */
  skipReason?: string;
}

/**
 * Step execution status.
 */
export type StepExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "retrying"
  | "waiting_approval"
  | "timed_out"
  | "cancelled";

/**
 * Workflow error details.
 */
export interface WorkflowError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Step where the error occurred */
  stepId?: string;
  /** Stack trace (if available) */
  stack?: string;
  /** Whether the error is retryable */
  retryable: boolean;
}

// ============================================================================
// APPROVAL
// ============================================================================

/**
 * An approval request for a workflow step.
 */
export interface ApprovalRequest {
  /** Unique approval request ID */
  id: string;
  /** Workflow run ID */
  runId: string;
  /** Step ID that requires approval */
  stepId: string;
  /** Approval message */
  message: string;
  /** Users who can approve */
  approverIds: string[];
  /** Minimum approvals required */
  minApprovals: number;
  /** Current approval count */
  currentApprovals: number;
  /** Current rejection count */
  currentRejections: number;
  /** Individual responses */
  responses: ApprovalResponse[];
  /** Status */
  status: ApprovalStatus;
  /** When created */
  createdAt: string;
  /** When the request expires */
  expiresAt: string;
  /** Escalation user IDs */
  escalationUserIds: string[];
  /** Whether escalation has been triggered */
  escalated: boolean;
}

/**
 * A single approval/rejection response.
 */
export interface ApprovalResponse {
  /** User who responded */
  userId: string;
  /** Whether approved or rejected */
  decision: "approved" | "rejected";
  /** Optional comment */
  comment?: string;
  /** When responded */
  respondedAt: string;
}

/**
 * Approval request status.
 */
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "escalated";

// ============================================================================
// SCHEDULING
// ============================================================================

/**
 * A scheduled workflow execution.
 */
export interface ScheduledExecution {
  /** Schedule ID */
  id: string;
  /** Workflow ID */
  workflowId: string;
  /** Cron expression */
  cronExpression: string;
  /** Timezone */
  timezone: string;
  /** When the next execution is planned */
  nextRunAt: string;
  /** When the last execution occurred */
  lastRunAt?: string;
  /** Last run result */
  lastRunStatus?: WorkflowRunStatus;
  /** Whether this schedule is active */
  active: boolean;
  /** When created */
  createdAt: string;
  /** Start date constraint */
  startDate?: string;
  /** End date constraint */
  endDate?: string;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * Audit event types for workflow automation.
 */
export type WorkflowAuditEventType =
  | "workflow.created"
  | "workflow.updated"
  | "workflow.deleted"
  | "workflow.enabled"
  | "workflow.disabled"
  | "workflow.run_started"
  | "workflow.run_completed"
  | "workflow.run_failed"
  | "workflow.run_cancelled"
  | "workflow.run_retried"
  | "workflow.step_started"
  | "workflow.step_completed"
  | "workflow.step_failed"
  | "workflow.step_skipped"
  | "workflow.step_retried"
  | "workflow.approval_requested"
  | "workflow.approval_granted"
  | "workflow.approval_rejected"
  | "workflow.approval_expired"
  | "workflow.approval_escalated"
  | "workflow.schedule_created"
  | "workflow.schedule_updated"
  | "workflow.schedule_deleted"
  | "workflow.schedule_fired";

/**
 * Audit log entry for workflow events.
 */
export interface WorkflowAuditEntry {
  /** Entry ID */
  id: string;
  /** Event type */
  eventType: WorkflowAuditEventType;
  /** Workflow ID */
  workflowId: string;
  /** Run ID (if applicable) */
  runId?: string;
  /** Step ID (if applicable) */
  stepId?: string;
  /** Who triggered the event */
  actorId: string;
  /** Timestamp */
  timestamp: string;
  /** Human-readable description */
  description: string;
  /** Event-specific data */
  data?: Record<string, unknown>;
  /** Duration (for completed events) */
  durationMs?: number;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validation result for a workflow definition.
 */
export interface WorkflowValidationResult {
  valid: boolean;
  errors: WorkflowValidationError[];
}

/**
 * A single validation error.
 */
export interface WorkflowValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum steps per workflow */
export const MAX_WORKFLOW_STEPS = 50;

/** Maximum workflow name length */
export const MAX_WORKFLOW_NAME_LENGTH = 128;

/** Maximum workflow description length */
export const MAX_WORKFLOW_DESCRIPTION_LENGTH = 2000;

/** Maximum tags per workflow */
export const MAX_WORKFLOW_TAGS = 20;

/** Maximum branches in a conditional */
export const MAX_CONDITIONAL_BRANCHES = 10;

/** Maximum parallel branches */
export const MAX_PARALLEL_BRANCHES = 10;

/** Maximum loop iterations */
export const MAX_LOOP_ITERATIONS = 1000;

/** Maximum approval timeout (24 hours) */
export const MAX_APPROVAL_TIMEOUT_MS = 86400000;

/** Maximum delay action duration (1 hour) */
export const MAX_DELAY_DURATION_MS = 3600000;

/** Maximum concurrent executions per workflow */
export const MAX_CONCURRENT_EXECUTIONS = 10;

/** Workflow name regex */
export const WORKFLOW_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9 _-]{0,127}$/;

/** Cron expression regex (5 fields: min hour dom month dow) */
export const CRON_REGEX = /^(\S+\s+){4}\S+$/;
