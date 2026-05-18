/**
 * Workflow Builder
 *
 * Fluent API for constructing workflow definitions with validation.
 * Provides a type-safe, chainable interface for defining triggers,
 * steps, actions, and conditions.
 */

import { generateId } from "../app-lifecycle";
import type { AppScope, AppEventType } from "../app-contract";
import type {
  WorkflowDefinition,
  WorkflowTrigger,
  WorkflowStep,
  WorkflowAction,
  WorkflowVariable,
  WorkflowSettings,
  StepSettings,
  TriggerCondition,
  ConditionOperator,
  ConditionalBranch,
  WorkflowValidationResult,
  WorkflowValidationError,
} from "./types";
import {
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
  WORKFLOW_NAME_REGEX,
  CRON_REGEX,
} from "./types";

// ============================================================================
// WORKFLOW BUILDER
// ============================================================================

/**
 * Fluent workflow builder. Construct a workflow definition step-by-step.
 *
 * Usage:
 * ```ts
 * const workflow = new WorkflowBuilder('my-workflow', 'My Workflow')
 *   .description('Does something useful')
 *   .trigger({ type: 'event', eventType: 'message.created' })
 *   .addStep('step-1', 'Send greeting', {
 *     type: 'send_message',
 *     channelId: '{{trigger.channelId}}',
 *     content: 'Hello!'
 *   })
 *   .build()
 * ```
 */
export class WorkflowBuilder {
  private definition: Partial<WorkflowDefinition>;
  private steps: WorkflowStep[] = [];

  constructor(name: string, createdBy: string) {
    this.definition = {
      id: generateId("wf"),
      name,
      description: "",
      version: "1.0.0",
      enabled: true,
      inputSchema: [],
      settings: { ...DEFAULT_WORKFLOW_SETTINGS },
      requiredScopes: [],
      tags: [],
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Set a custom workflow ID.
   */
  id(id: string): this {
    this.definition.id = id;
    return this;
  }

  /**
   * Set the description.
   */
  description(desc: string): this {
    this.definition.description = desc;
    return this;
  }

  /**
   * Set the version.
   */
  version(v: string): this {
    this.definition.version = v;
    return this;
  }

  /**
   * Set enabled state.
   */
  enabled(e: boolean): this {
    this.definition.enabled = e;
    return this;
  }

  /**
   * Set the trigger.
   */
  trigger(trigger: WorkflowTrigger): this {
    this.definition.trigger = trigger;
    return this;
  }

  /**
   * Set an event trigger.
   */
  onEvent(
    eventType: AppEventType,
    options?: {
      channelIds?: string[];
      userIds?: string[];
      conditions?: TriggerCondition[];
    },
  ): this {
    this.definition.trigger = {
      type: "event",
      eventType,
      channelIds: options?.channelIds,
      userIds: options?.userIds,
      conditions: options?.conditions,
    };
    return this;
  }

  /**
   * Set a schedule trigger.
   */
  onSchedule(
    cronExpression: string,
    options?: { timezone?: string; startDate?: string; endDate?: string },
  ): this {
    this.definition.trigger = {
      type: "schedule",
      cronExpression,
      timezone: options?.timezone ?? "UTC",
      startDate: options?.startDate,
      endDate: options?.endDate,
    };
    return this;
  }

  /**
   * Set a webhook trigger.
   */
  onWebhook(
    methods: ("GET" | "POST" | "PUT")[],
    options?: { secret?: string; contentType?: string },
  ): this {
    this.definition.trigger = {
      type: "webhook",
      methods,
      secret: options?.secret,
      contentType: options?.contentType,
    };
    return this;
  }

  /**
   * Set a manual trigger.
   */
  onManual(options?: {
    allowedUserIds?: string[];
    allowedRoles?: string[];
  }): this {
    this.definition.trigger = {
      type: "manual",
      allowedUserIds: options?.allowedUserIds,
      allowedRoles: options?.allowedRoles,
    };
    return this;
  }

  /**
   * Add a step to the workflow.
   */
  addStep(
    id: string,
    name: string,
    action: WorkflowAction,
    options?: Partial<{
      settings: Partial<StepSettings>;
      conditions: TriggerCondition[];
      inputMapping: Record<string, string>;
      outputKey: string;
      dependsOn: string[];
    }>,
  ): this {
    const stepType = this.inferStepType(action);
    const step: WorkflowStep = {
      id,
      name,
      type: stepType,
      action,
      settings: { ...DEFAULT_STEP_SETTINGS, ...options?.settings },
      conditions: options?.conditions,
      inputMapping: options?.inputMapping,
      outputKey: options?.outputKey,
      dependsOn: options?.dependsOn,
    };
    this.steps.push(step);
    return this;
  }

  /**
   * Add an input variable to the workflow schema.
   */
  addInput(variable: WorkflowVariable): this {
    this.definition.inputSchema = this.definition.inputSchema ?? [];
    this.definition.inputSchema.push(variable);
    return this;
  }

  /**
   * Set workflow settings.
   */
  settings(settings: Partial<WorkflowSettings>): this {
    this.definition.settings = {
      ...this.definition.settings,
      ...settings,
    } as WorkflowSettings;
    return this;
  }

  /**
   * Set required scopes.
   */
  scopes(scopes: AppScope[]): this {
    this.definition.requiredScopes = scopes;
    return this;
  }

  /**
   * Add tags.
   */
  tags(tags: string[]): this {
    this.definition.tags = tags;
    return this;
  }

  /**
   * Build and validate the workflow definition.
   * Throws if validation fails.
   */
  build(): WorkflowDefinition {
    this.definition.steps = this.steps;
    this.definition.updatedAt = new Date().toISOString();

    const result = validateWorkflowDefinition(
      this.definition as WorkflowDefinition,
    );
    if (!result.valid) {
      const errorMessages = result.errors
        .filter((e) => e.severity === "error")
        .map((e) => `${e.field}: ${e.message}`)
        .join("; ");
      throw new WorkflowBuilderError(
        `Invalid workflow: ${errorMessages}`,
        result.errors,
      );
    }

    return this.definition as WorkflowDefinition;
  }

  /**
   * Build without validation (for testing).
   */
  buildUnsafe(): WorkflowDefinition {
    this.definition.steps = this.steps;
    this.definition.updatedAt = new Date().toISOString();
    return this.definition as WorkflowDefinition;
  }

  /**
   * Infer the step type from the action type.
   */
  private inferStepType(action: WorkflowAction): WorkflowStep["type"] {
    switch (action.type) {
      case "conditional_branch":
        return "condition";
      case "approval":
        return "approval";
      case "delay":
        return "delay";
      case "parallel":
        return "parallel";
      case "loop":
        return "loop";
      default:
        return "action";
    }
  }
}

// ============================================================================
// BUILDER ERROR
// ============================================================================

export class WorkflowBuilderError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: WorkflowValidationError[],
  ) {
    super(message);
    this.name = "WorkflowBuilderError";
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a workflow definition.
 */
export function validateWorkflowDefinition(
  definition: WorkflowDefinition,
): WorkflowValidationResult {
  const errors: WorkflowValidationError[] = [];

  // --- Name ---
  if (!definition.name || !WORKFLOW_NAME_REGEX.test(definition.name)) {
    errors.push({
      field: "name",
      message: `Workflow name must match ${WORKFLOW_NAME_REGEX} (1-${MAX_WORKFLOW_NAME_LENGTH} chars, starting with a letter)`,
      severity: "error",
    });
  }

  // --- Description ---
  if (
    definition.description &&
    definition.description.length > MAX_WORKFLOW_DESCRIPTION_LENGTH
  ) {
    errors.push({
      field: "description",
      message: `Description must be at most ${MAX_WORKFLOW_DESCRIPTION_LENGTH} characters`,
      severity: "error",
    });
  }

  // --- Trigger ---
  if (!definition.trigger) {
    errors.push({
      field: "trigger",
      message: "Workflow must have a trigger",
      severity: "error",
    });
  } else {
    validateTrigger(definition.trigger, errors);
  }

  // --- Steps ---
  if (!definition.steps || definition.steps.length === 0) {
    errors.push({
      field: "steps",
      message: "Workflow must have at least one step",
      severity: "error",
    });
  } else if (definition.steps.length > MAX_WORKFLOW_STEPS) {
    errors.push({
      field: "steps",
      message: `Workflow cannot have more than ${MAX_WORKFLOW_STEPS} steps`,
      severity: "error",
    });
  } else {
    validateSteps(definition.steps, errors);
  }

  // --- Tags ---
  if (definition.tags && definition.tags.length > MAX_WORKFLOW_TAGS) {
    errors.push({
      field: "tags",
      message: `Cannot have more than ${MAX_WORKFLOW_TAGS} tags`,
      severity: "warning",
    });
  }

  // --- Settings ---
  if (definition.settings) {
    validateSettings(definition.settings, errors);
  }

  return {
    valid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
  };
}

function validateTrigger(
  trigger: WorkflowTrigger,
  errors: WorkflowValidationError[],
): void {
  if (!["event", "schedule", "webhook", "manual"].includes(trigger.type)) {
    errors.push({
      field: "trigger.type",
      message: `Invalid trigger type: ${trigger.type}`,
      severity: "error",
    });
    return;
  }

  if (trigger.type === "schedule") {
    if (!trigger.cronExpression || !CRON_REGEX.test(trigger.cronExpression)) {
      errors.push({
        field: "trigger.cronExpression",
        message:
          "Invalid cron expression: must have 5 fields (min hour dom month dow)",
        severity: "error",
      });
    }
  }

  if (trigger.type === "event") {
    if (!trigger.eventType) {
      errors.push({
        field: "trigger.eventType",
        message: "Event trigger must specify an eventType",
        severity: "error",
      });
    }
  }

  if (trigger.type === "webhook") {
    if (!trigger.methods || trigger.methods.length === 0) {
      errors.push({
        field: "trigger.methods",
        message: "Webhook trigger must specify at least one HTTP method",
        severity: "error",
      });
    }
  }
}

function validateSteps(
  steps: WorkflowStep[],
  errors: WorkflowValidationError[],
): void {
  const stepIds = new Set<string>();

  for (const step of steps) {
    // Unique step IDs
    if (stepIds.has(step.id)) {
      errors.push({
        field: `steps.${step.id}`,
        message: `Duplicate step ID: "${step.id}"`,
        severity: "error",
      });
    }
    stepIds.add(step.id);

    // Step name required
    if (!step.name || step.name.length === 0) {
      errors.push({
        field: `steps.${step.id}.name`,
        message: "Step must have a name",
        severity: "error",
      });
    }

    // Action required
    if (!step.action) {
      errors.push({
        field: `steps.${step.id}.action`,
        message: "Step must have an action",
        severity: "error",
      });
    } else {
      validateAction(step.id, step.action, errors);
    }
  }

  // Validate dependencies reference valid step IDs
  for (const step of steps) {
    if (step.dependsOn) {
      for (const depId of step.dependsOn) {
        if (!stepIds.has(depId)) {
          errors.push({
            field: `steps.${step.id}.dependsOn`,
            message: `Step "${step.id}" depends on unknown step "${depId}"`,
            severity: "error",
          });
        }
      }
    }
  }

  // Check for circular dependencies
  const circularDep = detectCircularDependencies(steps);
  if (circularDep) {
    errors.push({
      field: "steps",
      message: `Circular dependency detected: ${circularDep}`,
      severity: "error",
    });
  }
}

function validateAction(
  stepId: string,
  action: WorkflowAction,
  errors: WorkflowValidationError[],
): void {
  switch (action.type) {
    case "send_message":
      if (!action.channelId) {
        errors.push({
          field: `steps.${stepId}.action.channelId`,
          message: "send_message action requires a channelId",
          severity: "error",
        });
      }
      if (!action.content) {
        errors.push({
          field: `steps.${stepId}.action.content`,
          message: "send_message action requires content",
          severity: "error",
        });
      }
      break;

    case "http_request":
      if (!action.url) {
        errors.push({
          field: `steps.${stepId}.action.url`,
          message: "http_request action requires a url",
          severity: "error",
        });
      }
      if (!action.method) {
        errors.push({
          field: `steps.${stepId}.action.method`,
          message: "http_request action requires a method",
          severity: "error",
        });
      }
      break;

    case "conditional_branch":
      if (!action.branches || action.branches.length === 0) {
        errors.push({
          field: `steps.${stepId}.action.branches`,
          message: "conditional_branch must have at least one branch",
          severity: "error",
        });
      }
      if (
        action.branches &&
        action.branches.length > MAX_CONDITIONAL_BRANCHES
      ) {
        errors.push({
          field: `steps.${stepId}.action.branches`,
          message: `Cannot have more than ${MAX_CONDITIONAL_BRANCHES} branches`,
          severity: "error",
        });
      }
      break;

    case "approval":
      if (!action.approverIds || action.approverIds.length === 0) {
        errors.push({
          field: `steps.${stepId}.action.approverIds`,
          message: "approval action requires at least one approver",
          severity: "error",
        });
      }
      if (action.timeoutMs > MAX_APPROVAL_TIMEOUT_MS) {
        errors.push({
          field: `steps.${stepId}.action.timeoutMs`,
          message: `Approval timeout cannot exceed ${MAX_APPROVAL_TIMEOUT_MS}ms (24 hours)`,
          severity: "error",
        });
      }
      break;

    case "delay":
      if (action.durationMs <= 0) {
        errors.push({
          field: `steps.${stepId}.action.durationMs`,
          message: "Delay duration must be positive",
          severity: "error",
        });
      }
      if (action.durationMs > MAX_DELAY_DURATION_MS) {
        errors.push({
          field: `steps.${stepId}.action.durationMs`,
          message: `Delay cannot exceed ${MAX_DELAY_DURATION_MS}ms (1 hour)`,
          severity: "error",
        });
      }
      break;

    case "parallel":
      if (!action.branches || action.branches.length === 0) {
        errors.push({
          field: `steps.${stepId}.action.branches`,
          message: "parallel action must have at least one branch",
          severity: "error",
        });
      }
      if (action.branches && action.branches.length > MAX_PARALLEL_BRANCHES) {
        errors.push({
          field: `steps.${stepId}.action.branches`,
          message: `Cannot have more than ${MAX_PARALLEL_BRANCHES} parallel branches`,
          severity: "error",
        });
      }
      break;

    case "loop":
      if (!action.collection) {
        errors.push({
          field: `steps.${stepId}.action.collection`,
          message: "loop action requires a collection expression",
          severity: "error",
        });
      }
      if (action.maxIterations > MAX_LOOP_ITERATIONS) {
        errors.push({
          field: `steps.${stepId}.action.maxIterations`,
          message: `Loop cannot exceed ${MAX_LOOP_ITERATIONS} iterations`,
          severity: "error",
        });
      }
      break;
  }
}

function validateSettings(
  settings: WorkflowSettings,
  errors: WorkflowValidationError[],
): void {
  if (settings.maxExecutionTimeMs <= 0) {
    errors.push({
      field: "settings.maxExecutionTimeMs",
      message: "maxExecutionTimeMs must be positive",
      severity: "error",
    });
  }

  if (settings.maxRetryAttempts < 0) {
    errors.push({
      field: "settings.maxRetryAttempts",
      message: "maxRetryAttempts cannot be negative",
      severity: "error",
    });
  }

  if (
    settings.maxConcurrentExecutions <= 0 ||
    settings.maxConcurrentExecutions > 10
  ) {
    errors.push({
      field: "settings.maxConcurrentExecutions",
      message: "maxConcurrentExecutions must be between 1 and 10",
      severity: "error",
    });
  }
}

/**
 * Detect circular dependencies among workflow steps.
 * Returns a description of the cycle if found, null otherwise.
 */
export function detectCircularDependencies(
  steps: WorkflowStep[],
): string | null {
  const graph = new Map<string, string[]>();
  for (const step of steps) {
    graph.set(step.id, step.dependsOn ?? []);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): string | null {
    if (inStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      const cycle = path.slice(cycleStart).concat(nodeId);
      return cycle.join(" -> ");
    }
    if (visited.has(nodeId)) {
      return null;
    }

    visited.add(nodeId);
    inStack.add(nodeId);

    const deps = graph.get(nodeId) ?? [];
    for (const dep of deps) {
      const result = dfs(dep, [...path, nodeId]);
      if (result) {
        return result;
      }
    }

    inStack.delete(nodeId);
    return null;
  }

  for (const step of steps) {
    const result = dfs(step.id, []);
    if (result) {
      return result;
    }
  }

  return null;
}

// ============================================================================
// CONDITION EVALUATOR
// ============================================================================

/**
 * Evaluate a trigger/step condition against a data context.
 */
export function evaluateCondition(
  condition: TriggerCondition,
  context: Record<string, unknown>,
): boolean {
  const fieldValue = getNestedValue(context, condition.field);

  switch (condition.operator) {
    case "equals":
      return fieldValue === condition.value;
    case "not_equals":
      return fieldValue !== condition.value;
    case "contains":
      if (
        typeof fieldValue === "string" &&
        typeof condition.value === "string"
      ) {
        return fieldValue.includes(condition.value);
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value);
      }
      return false;
    case "not_contains":
      if (
        typeof fieldValue === "string" &&
        typeof condition.value === "string"
      ) {
        return !fieldValue.includes(condition.value);
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(condition.value);
      }
      return true;
    case "greater_than":
      return typeof fieldValue === "number" &&
        typeof condition.value === "number"
        ? fieldValue > condition.value
        : false;
    case "less_than":
      return typeof fieldValue === "number" &&
        typeof condition.value === "number"
        ? fieldValue < condition.value
        : false;
    case "greater_than_or_equal":
      return typeof fieldValue === "number" &&
        typeof condition.value === "number"
        ? fieldValue >= condition.value
        : false;
    case "less_than_or_equal":
      return typeof fieldValue === "number" &&
        typeof condition.value === "number"
        ? fieldValue <= condition.value
        : false;
    case "in":
      return Array.isArray(condition.value)
        ? condition.value.includes(fieldValue)
        : false;
    case "not_in":
      return Array.isArray(condition.value)
        ? !condition.value.includes(fieldValue)
        : true;
    case "matches_regex":
      if (
        typeof fieldValue === "string" &&
        typeof condition.value === "string"
      ) {
        try {
          return new RegExp(condition.value).test(fieldValue);
        } catch {
          return false;
        }
      }
      return false;
    case "exists":
      return fieldValue !== undefined && fieldValue !== null;
    case "not_exists":
      return fieldValue === undefined || fieldValue === null;
    default:
      return false;
  }
}

/**
 * Evaluate multiple conditions (AND logic).
 */
export function evaluateConditions(
  conditions: TriggerCondition[],
  context: Record<string, unknown>,
): boolean {
  return conditions.every((c) => evaluateCondition(c, context));
}

/**
 * Get a nested value from an object using dot-separated path.
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Interpolate template strings using workflow context.
 * Supports `{{variable.path}}` syntax.
 */
export function interpolateTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
    const value = getNestedValue(context, path.trim());
    if (value === undefined || value === null) {
      return "";
    }
    return String(value);
  });
}
