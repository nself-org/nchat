// ============================================================================
// WORKFLOW LIBRARY
// Public exports for the nself-chat workflow system
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export type {
  // Base types
  WorkflowStatus,
  WorkflowRunStatus,
  StepStatus,
  Position,
  Dimensions,

  // Step types
  StepType,
  BaseStep,
  StepMetadata,

  // Trigger
  TriggerType,
  TriggerConfig,
  TriggerFilter,
  ScheduleConfig,
  TriggerStep,

  // Message
  MessageTarget,
  MessageConfig,
  MessageAttachment,
  MessageButton,
  MessageEmbed,
  MessageStep,

  // Form
  FormFieldType,
  FormField,
  FormFieldValidation,
  FormConfig,
  FormStep,

  // Condition
  ConditionOperator,
  ConditionLogic,
  Condition,
  ConditionGroup,
  ConditionConfig,
  ConditionStep,

  // Delay
  DelayType,
  DelayConfig,
  DelayStep,

  // Webhook
  HttpMethod,
  WebhookHeader,
  WebhookConfig,
  WebhookStep,

  // Approval
  ApprovalType,
  ApprovalConfig,
  ApprovalStep,

  // Action
  ActionType,
  ActionConfig,
  ActionStep,

  // Loop
  LoopType,
  LoopConfig,
  LoopStep,

  // Parallel
  ParallelBranch,
  ParallelConfig,
  ParallelStep,

  // End
  EndConfig,
  EndStep,

  // Union types
  WorkflowStep,

  // Edge
  EdgeType,
  WorkflowEdge,

  // Workflow
  Workflow,
  WorkflowVariable,
  WorkflowSettings,
  WorkflowMetadata,

  // Run
  WorkflowRun,
  StepRun,
  WorkflowError,
  WorkflowLogEntry,

  // Builder
  DragItem,
  DropResult,
  CanvasState,
  StepTemplate,

  // Context
  WorkflowContext,

  // Validation
  ValidationError,
  ValidationResult,
} from "./workflow-types";

// ============================================================================
// Triggers
// ============================================================================

export {
  triggerTemplates,
  createTriggerStep,
  validateTriggerConfig,
  validateScheduleConfig,
  validateCronExpression,
  matchTriggerFilters,
  shouldTriggerFire,
  describeCronExpression,
  getNextCronRun,
  createMessageTriggerEvent,
  createMemberJoinEvent,
  createScheduledTriggerEvent,
  createWebhookTriggerEvent,
  createManualTriggerEvent,
} from "./workflow-triggers";

export type { TriggerEvent } from "./workflow-triggers";

// ============================================================================
// Actions
// ============================================================================

export {
  actionTemplates,
  createActionStep,
  validateActionConfig,
  executeAction,
  actionCategories,
  getActionsByCategory,
  getActionTemplatesByCategory,
} from "./workflow-actions";

export type { ActionResult } from "./workflow-actions";

// ============================================================================
// Conditions
// ============================================================================

export {
  conditionOperators,
  evaluateConditionConfig,
  evaluateConditionGroup,
  evaluateCondition,
  compareValues,
  getFieldValue,
  isConditionGroup,
  createCondition,
  createConditionGroup,
  createConditionStep,
  validateConditionConfig,
  conditionPresets,
  describeCondition,
  describeConditionConfig,
} from "./workflow-conditions";

// ============================================================================
// Steps
// ============================================================================

export {
  stepTemplates,
  stepCategories,
  generateStepId,
  createStep,
  createMessageStep,
  createFormStep,
  createDelayStep,
  createWebhookStep,
  createApprovalStep,
  createLoopStep,
  createParallelStep,
  createEndStep,
  cloneStep,
  validateStep,
  getStepTemplate,
  getStepsByCategory,
  getStepTemplatesByCategory,
  canHaveMultipleOutputs,
  canBeEntryPoint,
  canBeExitPoint,
  getOutputHandles,
  getInputHandles,
} from "./workflow-steps";

// ============================================================================
// Engine
// ============================================================================

export {
  generateWorkflowId,
  generateRunId,
  createWorkflow,
  createDefaultSettings,
  validateWorkflow,
  addStep,
  updateStep,
  removeStep,
  addEdge,
  removeEdge,
  addVariable,
  updateVariable,
  removeVariable,
  updateSettings,
  updateStatus,
  publishWorkflow,
  createWorkflowRun,
  updateRunStatus,
  findMatchingWorkflows,
  getNextSteps,
  getTriggerSteps,
  getStep,
  buildExecutionOrder,
  buildWorkflowContext,
  serializeWorkflow,
  deserializeWorkflow,
  cloneWorkflow,
} from "./workflow-engine";

// ============================================================================
// Executor
// ============================================================================

export {
  WorkflowExecutor,
  getExecutor,
  createExecutor,
} from "./workflow-executor";

export type {
  ExecutorConfig,
  StepResult,
  StepHandler,
} from "./workflow-executor";
