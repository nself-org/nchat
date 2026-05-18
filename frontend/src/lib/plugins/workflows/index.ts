/**
 * Workflow Automation - Public API
 *
 * Re-exports all workflow automation types and managers.
 * Provides the complete trigger -> step -> action flow builder
 * with approvals, scheduling, retry logic, and audit logging.
 */

// Types
export type {
  WorkflowDefinition,
  WorkflowSettings,
  WorkflowVariable,
  WorkflowTrigger,
  BaseTrigger,
  TriggerType,
  EventTrigger,
  ScheduleTrigger,
  WebhookTrigger,
  ManualTrigger,
  TriggerCondition,
  ConditionOperator,
  WorkflowStep,
  StepType,
  StepSettings,
  WorkflowAction,
  BaseAction,
  ActionType,
  SendMessageAction,
  HttpRequestAction,
  TransformDataAction,
  ConditionalBranchAction,
  ConditionalBranch,
  ApprovalAction,
  DelayAction,
  SetVariableAction,
  ParallelAction,
  LoopAction,
  ChannelAction,
  UserAction,
  WorkflowRun,
  WorkflowRunStatus,
  RunTriggerInfo,
  WorkflowExecutionContext,
  StepExecutionRecord,
  StepExecutionStatus,
  WorkflowError,
  ApprovalRequest,
  ApprovalResponse,
  ApprovalStatus,
  ScheduledExecution,
  WorkflowAuditEventType,
  WorkflowAuditEntry,
  WorkflowValidationResult,
  WorkflowValidationError,
} from "./types";

export {
  DEFAULT_WORKFLOW_SETTINGS,
  DEFAULT_STEP_SETTINGS,
  MAX_WORKFLOW_STEPS,
  MAX_WORKFLOW_NAME_LENGTH,
  MAX_WORKFLOW_DESCRIPTION_LENGTH,
  MAX_WORKFLOW_TAGS,
  MAX_CONDITIONAL_BRANCHES,
  MAX_PARALLEL_BRANCHES,
  MAX_LOOP_ITERATIONS,
  MAX_APPROVAL_TIMEOUT_MS,
  MAX_DELAY_DURATION_MS,
  MAX_CONCURRENT_EXECUTIONS,
  WORKFLOW_NAME_REGEX,
  CRON_REGEX,
} from "./types";

// Builder
export {
  WorkflowBuilder,
  WorkflowBuilderError,
  validateWorkflowDefinition,
  detectCircularDependencies,
  evaluateCondition,
  evaluateConditions,
  getNestedValue,
  interpolateTemplate,
} from "./workflow-builder";

// Trigger Engine
export {
  TriggerEngine,
  parseCronExpression,
  parseCronField,
  matchesCron,
  getNextCronTime,
} from "./trigger-engine";
export type { TriggerMatch, CronFields } from "./trigger-engine";

// Execution Engine
export {
  WorkflowExecutionEngine,
  ExecutionError,
  ApprovalRequiredError,
  createActionHandlerRegistry,
  createDefaultHandlers,
} from "./execution-engine";
export type {
  ActionHandler,
  ActionHandlerRegistry,
  ExecutionEngineConfig,
} from "./execution-engine";

// Approval Gate
export {
  ApprovalGateManager,
  ApprovalStore,
  ApprovalError,
} from "./approval-gate";

// Scheduler
export { WorkflowScheduler, ScheduleStore, SchedulerError } from "./scheduler";
