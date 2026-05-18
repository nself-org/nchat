/**
 * Workflow Execution Engine
 *
 * Step-by-step execution engine with state machine, branching,
 * error handling, retry logic, and idempotency guarantees.
 * Each execution step is logged immutably for full auditability.
 */

import { generateId } from "../app-lifecycle";
import type {
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunStatus,
  WorkflowExecutionContext,
  WorkflowStep,
  WorkflowAction,
  StepExecutionRecord,
  StepExecutionStatus,
  WorkflowError,
  WorkflowAuditEntry,
  WorkflowAuditEventType,
  RunTriggerInfo,
  ConditionalBranchAction,
  ApprovalAction,
  DelayAction,
  LoopAction,
  ParallelAction,
  SendMessageAction,
  HttpRequestAction,
  SetVariableAction,
  TransformDataAction,
} from "./types";
import {
  evaluateConditions,
  interpolateTemplate,
  getNestedValue,
} from "./workflow-builder";

// ============================================================================
// ACTION HANDLERS
// ============================================================================

/**
 * Handler function for executing a workflow action.
 * Returns the action result (output) or throws on failure.
 */
export type ActionHandler = (
  action: WorkflowAction,
  context: WorkflowExecutionContext,
  step: WorkflowStep,
) => Promise<unknown>;

/**
 * Default action handlers for built-in action types.
 */
export interface ActionHandlerRegistry {
  handlers: Map<string, ActionHandler>;
  register(actionType: string, handler: ActionHandler): void;
  get(actionType: string): ActionHandler | undefined;
}

export function createActionHandlerRegistry(): ActionHandlerRegistry {
  const handlers = new Map<string, ActionHandler>();

  return {
    handlers,
    register(actionType: string, handler: ActionHandler) {
      handlers.set(actionType, handler);
    },
    get(actionType: string): ActionHandler | undefined {
      return handlers.get(actionType);
    },
  };
}

// ============================================================================
// EXECUTION ENGINE
// ============================================================================

/**
 * Configuration for the execution engine.
 */
export interface ExecutionEngineConfig {
  /** Custom action handler registry */
  actionHandlers?: ActionHandlerRegistry;
  /** Custom sleep function (for testing) */
  sleepFn?: (ms: number) => Promise<void>;
  /** Custom time function (for testing) */
  nowFn?: () => Date;
  /** Maximum run history to keep in memory */
  maxRunHistory: number;
  /** Whether to enable audit logging */
  enableAudit: boolean;
}

const DEFAULT_ENGINE_CONFIG: ExecutionEngineConfig = {
  maxRunHistory: 1000,
  enableAudit: true,
};

/**
 * Workflow execution engine. Manages the lifecycle of workflow runs,
 * step-by-step execution, retries, and audit logging.
 */
export class WorkflowExecutionEngine {
  private runs: Map<string, WorkflowRun> = new Map();
  private auditLog: WorkflowAuditEntry[] = [];
  private config: ExecutionEngineConfig;
  private actionHandlers: ActionHandlerRegistry;
  private activeRunsByWorkflow: Map<string, Set<string>> = new Map();
  private processedIdempotencyKeys: Set<string> = new Set();

  /** Callback for approval requests */
  onApprovalRequest?: (
    runId: string,
    stepId: string,
    action: ApprovalAction,
  ) => void;

  /** Callback for completed runs */
  onRunCompleted?: (run: WorkflowRun) => void;

  constructor(config?: Partial<ExecutionEngineConfig>) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.actionHandlers = this.config.actionHandlers ?? createDefaultHandlers();
  }

  // ==========================================================================
  // RUN MANAGEMENT
  // ==========================================================================

  /**
   * Create and start a new workflow run.
   */
  async startRun(
    workflow: WorkflowDefinition,
    triggerInfo: RunTriggerInfo,
    inputs: Record<string, unknown> = {},
  ): Promise<WorkflowRun> {
    // Check concurrency limits
    const activeRuns = this.activeRunsByWorkflow.get(workflow.id);
    if (
      activeRuns &&
      activeRuns.size >= workflow.settings.maxConcurrentExecutions
    ) {
      throw new ExecutionError(
        `Workflow "${workflow.name}" has reached its concurrency limit (${workflow.settings.maxConcurrentExecutions})`,
        "CONCURRENCY_LIMIT_EXCEEDED",
        false,
      );
    }

    // Validate required inputs
    for (const input of workflow.inputSchema) {
      if (input.required && inputs[input.name] === undefined) {
        if (input.defaultValue !== undefined) {
          inputs[input.name] = input.defaultValue;
        } else {
          throw new ExecutionError(
            `Required input "${input.name}" is missing`,
            "MISSING_INPUT",
            false,
          );
        }
      }
    }

    const now = this.now();
    const run: WorkflowRun = {
      id: generateId("run"),
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: "running",
      triggeredBy: triggerInfo,
      context: {
        inputs,
        stepOutputs: {},
        variables: {},
        triggerData: triggerInfo.eventData ?? triggerInfo.webhookData ?? {},
      },
      stepResults: [],
      startedAt: now.toISOString(),
      retryCount: 0,
      maxRetries: workflow.settings.maxRetryAttempts,
    };

    this.runs.set(run.id, run);
    this.trackActiveRun(workflow.id, run.id);

    this.audit(
      "workflow.run_started",
      workflow.id,
      run.id,
      undefined,
      "system",
      {
        triggerType: triggerInfo.type,
        inputs,
      },
    );

    // Execute steps
    try {
      await this.executeSteps(workflow, run);

      if (run.status === "running") {
        run.status = "completed";
        run.completedAt = this.now().toISOString();
        this.audit(
          "workflow.run_completed",
          workflow.id,
          run.id,
          undefined,
          "system",
          {
            durationMs:
              new Date(run.completedAt).getTime() -
              new Date(run.startedAt).getTime(),
          },
        );
      }
    } catch (error) {
      if (run.status !== "waiting_approval" && run.status !== "paused") {
        run.status = "failed";
        run.completedAt = this.now().toISOString();
        run.error = {
          code:
            error instanceof ExecutionError ? error.code : "EXECUTION_FAILED",
          message: error instanceof Error ? error.message : String(error),
          retryable: error instanceof ExecutionError ? error.retryable : false,
        };
        this.audit(
          "workflow.run_failed",
          workflow.id,
          run.id,
          undefined,
          "system",
          {
            error: run.error,
          },
        );
      }
    } finally {
      if (run.status !== "waiting_approval" && run.status !== "paused") {
        this.untrackActiveRun(workflow.id, run.id);
      }
    }

    if (
      this.onRunCompleted &&
      (run.status === "completed" || run.status === "failed")
    ) {
      this.onRunCompleted(run);
    }

    return run;
  }

  /**
   * Cancel a running workflow.
   */
  cancelRun(runId: string): WorkflowRun {
    const run = this.runs.get(runId);
    if (!run) {
      throw new ExecutionError(
        `Run not found: ${runId}`,
        "RUN_NOT_FOUND",
        false,
      );
    }

    if (
      run.status !== "running" &&
      run.status !== "paused" &&
      run.status !== "waiting_approval"
    ) {
      throw new ExecutionError(
        `Cannot cancel run in "${run.status}" status`,
        "INVALID_STATUS",
        false,
      );
    }

    run.status = "cancelled";
    run.completedAt = this.now().toISOString();
    this.untrackActiveRun(run.workflowId, run.id);

    this.audit(
      "workflow.run_cancelled",
      run.workflowId,
      run.id,
      undefined,
      "system",
    );

    return run;
  }

  /**
   * Retry a failed workflow run.
   */
  async retryRun(
    runId: string,
    workflow: WorkflowDefinition,
  ): Promise<WorkflowRun> {
    const originalRun = this.runs.get(runId);
    if (!originalRun) {
      throw new ExecutionError(
        `Run not found: ${runId}`,
        "RUN_NOT_FOUND",
        false,
      );
    }

    if (originalRun.status !== "failed") {
      throw new ExecutionError(
        `Cannot retry run in "${originalRun.status}" status`,
        "INVALID_STATUS",
        false,
      );
    }

    if (originalRun.retryCount >= originalRun.maxRetries) {
      throw new ExecutionError(
        "Maximum retry attempts reached",
        "MAX_RETRIES_EXCEEDED",
        false,
      );
    }

    this.audit(
      "workflow.run_retried",
      workflow.id,
      runId,
      undefined,
      "system",
      {
        retryCount: originalRun.retryCount + 1,
      },
    );

    // Create a new run based on the original
    const newRun = await this.startRun(
      workflow,
      originalRun.triggeredBy,
      originalRun.context.inputs,
    );
    newRun.retryCount = originalRun.retryCount + 1;

    return newRun;
  }

  // ==========================================================================
  // STEP EXECUTION
  // ==========================================================================

  /**
   * Execute all steps in a workflow sequentially, respecting
   * dependencies, conditions, and branching.
   */
  private async executeSteps(
    workflow: WorkflowDefinition,
    run: WorkflowRun,
  ): Promise<void> {
    const steps = workflow.steps;
    const executed = new Set<string>();

    // Build dependency graph for execution order
    const executionOrder = this.resolveExecutionOrder(steps);

    for (const stepId of executionOrder) {
      // Check if run was cancelled
      if (run.status === "cancelled" || run.status === "waiting_approval") {
        break;
      }

      const step = steps.find((s) => s.id === stepId);
      if (!step) continue;

      // Check if dependencies are satisfied
      if (step.dependsOn) {
        const allDepsCompleted = step.dependsOn.every((depId) =>
          executed.has(depId),
        );
        if (!allDepsCompleted) {
          const record: StepExecutionRecord = {
            stepId: step.id,
            stepName: step.name,
            status: "skipped",
            startedAt: this.now().toISOString(),
            retryCount: 0,
            skipped: true,
            skipReason: "Dependencies not satisfied",
          };
          run.stepResults.push(record);
          continue;
        }
      }

      // Evaluate step conditions
      if (step.conditions && step.conditions.length > 0) {
        const conditionsMet = evaluateConditions(step.conditions, {
          ...run.context.triggerData,
          ...run.context.variables,
          ...run.context.stepOutputs,
          inputs: run.context.inputs,
        });

        if (!conditionsMet) {
          const record: StepExecutionRecord = {
            stepId: step.id,
            stepName: step.name,
            status: "skipped",
            startedAt: this.now().toISOString(),
            retryCount: 0,
            skipped: true,
            skipReason: "Conditions not met",
          };
          run.stepResults.push(record);
          this.audit(
            "workflow.step_skipped",
            workflow.id,
            run.id,
            step.id,
            "system",
            {
              reason: "Conditions not met",
            },
          );
          executed.add(stepId);
          continue;
        }
      }

      // Check idempotency
      if (step.settings.idempotencyKey) {
        const key = interpolateTemplate(step.settings.idempotencyKey, {
          ...run.context.triggerData,
          ...run.context.variables,
          runId: run.id,
        });
        if (this.processedIdempotencyKeys.has(key)) {
          const record: StepExecutionRecord = {
            stepId: step.id,
            stepName: step.name,
            status: "skipped",
            startedAt: this.now().toISOString(),
            retryCount: 0,
            skipped: true,
            skipReason: `Idempotency key already processed: ${key}`,
          };
          run.stepResults.push(record);
          executed.add(stepId);
          continue;
        }
        this.processedIdempotencyKeys.add(key);
      }

      // Execute the step
      await this.executeStep(workflow, run, step);
      executed.add(stepId);

      // If the step paused the workflow (approval, etc.), stop
      // Status may be mutated by executeStep, so use string comparison
      const currentStatus: string = run.status;
      if (currentStatus === "waiting_approval" || currentStatus === "paused") {
        break;
      }

      // Check execution time limit
      const elapsed = this.now().getTime() - new Date(run.startedAt).getTime();
      if (elapsed > workflow.settings.maxExecutionTimeMs) {
        run.status = "timed_out";
        run.completedAt = this.now().toISOString();
        run.error = {
          code: "EXECUTION_TIMEOUT",
          message: `Workflow exceeded maximum execution time of ${workflow.settings.maxExecutionTimeMs}ms`,
          retryable: true,
        };
        break;
      }
    }
  }

  /**
   * Execute a single step with retry logic.
   */
  private async executeStep(
    workflow: WorkflowDefinition,
    run: WorkflowRun,
    step: WorkflowStep,
  ): Promise<void> {
    const record: StepExecutionRecord = {
      stepId: step.id,
      stepName: step.name,
      status: "running",
      startedAt: this.now().toISOString(),
      retryCount: 0,
      skipped: false,
    };

    // Record input if audit enabled
    if (workflow.settings.auditInputsOutputs && step.inputMapping) {
      record.input = this.resolveInputMapping(step.inputMapping, run.context);
    }

    run.stepResults.push(record);

    this.audit("workflow.step_started", workflow.id, run.id, step.id, "system");

    // Retry loop
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= step.settings.retryAttempts; attempt++) {
      if (attempt > 0) {
        record.retryCount = attempt;
        record.status = "retrying";

        const delay = this.calculateRetryDelay(step.settings, attempt);
        this.audit(
          "workflow.step_retried",
          workflow.id,
          run.id,
          step.id,
          "system",
          {
            attempt,
            delayMs: delay,
          },
        );
        await this.sleep(delay);
      }

      try {
        const result = await this.executeAction(step.action, run.context, step);

        // Store output
        if (step.outputKey) {
          run.context.stepOutputs[step.outputKey] = result;
        }

        record.status = "completed";
        record.completedAt = this.now().toISOString();
        record.durationMs =
          new Date(record.completedAt).getTime() -
          new Date(record.startedAt).getTime();
        record.output = result as Record<string, unknown>;

        this.audit(
          "workflow.step_completed",
          workflow.id,
          run.id,
          step.id,
          "system",
          {
            durationMs: record.durationMs,
          },
        );

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if the step has been paused (approval)
        if (error instanceof ApprovalRequiredError) {
          record.status = "waiting_approval";
          run.status = "waiting_approval";
          return;
        }
      }
    }

    // All retries exhausted
    record.status = "failed";
    record.completedAt = this.now().toISOString();
    record.durationMs =
      new Date(record.completedAt).getTime() -
      new Date(record.startedAt).getTime();
    record.error = {
      code: "STEP_FAILED",
      message: lastError?.message ?? "Unknown error",
      stepId: step.id,
      retryable: false,
    };

    this.audit("workflow.step_failed", workflow.id, run.id, step.id, "system", {
      error: record.error,
      attempts: step.settings.retryAttempts + 1,
    });

    if (step.settings.skipOnFailure || workflow.settings.continueOnFailure) {
      record.status = "skipped";
      record.skipReason = `Step failed after ${step.settings.retryAttempts + 1} attempts, skipped due to skipOnFailure`;
    } else {
      throw new ExecutionError(
        `Step "${step.name}" failed after ${step.settings.retryAttempts + 1} attempts: ${lastError?.message}`,
        "STEP_EXECUTION_FAILED",
        false,
        step.id,
      );
    }
  }

  /**
   * Execute a single action.
   */
  private async executeAction(
    action: WorkflowAction,
    context: WorkflowExecutionContext,
    step: WorkflowStep,
  ): Promise<unknown> {
    // Handle built-in action types first
    switch (action.type) {
      case "delay":
        return this.executeDelay(action as DelayAction);

      case "set_variable":
        return this.executeSetVariable(action as SetVariableAction, context);

      case "conditional_branch":
        return this.executeConditionalBranch(
          action as ConditionalBranchAction,
          context,
        );

      case "approval":
        return this.executeApproval(action as ApprovalAction, step);

      default: {
        // Check custom handler registry
        const handler = this.actionHandlers.get(action.type);
        if (handler) {
          return handler(action, context, step);
        }

        throw new ExecutionError(
          `No handler registered for action type: ${action.type}`,
          "UNKNOWN_ACTION_TYPE",
          false,
        );
      }
    }
  }

  // ==========================================================================
  // BUILT-IN ACTION EXECUTORS
  // ==========================================================================

  private async executeDelay(
    action: DelayAction,
  ): Promise<{ delayed: number }> {
    await this.sleep(action.durationMs);
    return { delayed: action.durationMs };
  }

  private executeSetVariable(
    action: SetVariableAction,
    context: WorkflowExecutionContext,
  ): { variableName: string; value: unknown } {
    let resolvedValue = action.value;
    if (typeof action.value === "string") {
      resolvedValue = interpolateTemplate(action.value as string, {
        ...context.triggerData,
        ...context.variables,
        ...context.stepOutputs,
        inputs: context.inputs,
      });
    }
    context.variables[action.variableName] = resolvedValue;
    return { variableName: action.variableName, value: resolvedValue };
  }

  private executeConditionalBranch(
    action: ConditionalBranchAction,
    context: WorkflowExecutionContext,
  ): { branch: string; matched: boolean } {
    const evalContext = {
      ...context.triggerData,
      ...context.variables,
      ...context.stepOutputs,
      inputs: context.inputs,
    };

    for (const branch of action.branches) {
      if (evaluateConditions(branch.conditions, evalContext)) {
        return { branch: branch.name, matched: true };
      }
    }

    return { branch: "default", matched: false };
  }

  private executeApproval(action: ApprovalAction, step: WorkflowStep): never {
    // Trigger approval callback and pause execution
    if (this.onApprovalRequest) {
      this.onApprovalRequest(step.id, step.id, action);
    }
    throw new ApprovalRequiredError(step.id, action);
  }

  // ==========================================================================
  // EXECUTION ORDER
  // ==========================================================================

  /**
   * Resolve step execution order using topological sort.
   */
  resolveExecutionOrder(steps: WorkflowStep[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    for (const step of steps) {
      graph.set(step.id, []);
      inDegree.set(step.id, 0);
    }

    // Build adjacency
    for (const step of steps) {
      if (step.dependsOn) {
        for (const depId of step.dependsOn) {
          if (graph.has(depId)) {
            graph.get(depId)!.push(step.id);
            inDegree.set(step.id, (inDegree.get(step.id) ?? 0) + 1);
          }
        }
      }
    }

    // Kahn's algorithm
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);

      for (const neighbor of graph.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // If we couldn't process all steps, there's a circular dependency
    // Fall back to original order for steps not in the resolved order
    if (order.length < steps.length) {
      for (const step of steps) {
        if (!order.includes(step.id)) {
          order.push(step.id);
        }
      }
    }

    return order;
  }

  // ==========================================================================
  // RETRY LOGIC
  // ==========================================================================

  /**
   * Calculate the retry delay for a given attempt number.
   */
  calculateRetryDelay(
    settings: WorkflowStep["settings"],
    attempt: number,
  ): number {
    let delay: number;

    switch (settings.retryBackoff) {
      case "fixed":
        delay = settings.retryDelayMs;
        break;
      case "linear":
        delay = settings.retryDelayMs * attempt;
        break;
      case "exponential":
        delay = settings.retryDelayMs * Math.pow(2, attempt - 1);
        break;
      default:
        delay = settings.retryDelayMs;
    }

    return Math.min(delay, settings.maxRetryDelayMs);
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * Get a workflow run by ID.
   */
  getRun(runId: string): WorkflowRun | undefined {
    return this.runs.get(runId);
  }

  /**
   * List runs, optionally filtered.
   */
  listRuns(filter?: {
    workflowId?: string;
    status?: WorkflowRunStatus;
  }): WorkflowRun[] {
    let runs = Array.from(this.runs.values());
    if (filter?.workflowId) {
      runs = runs.filter((r) => r.workflowId === filter.workflowId);
    }
    if (filter?.status) {
      runs = runs.filter((r) => r.status === filter.status);
    }
    return runs;
  }

  /**
   * Get the audit log.
   */
  getAuditLog(filter?: {
    workflowId?: string;
    runId?: string;
    eventType?: WorkflowAuditEventType;
  }): WorkflowAuditEntry[] {
    let entries = [...this.auditLog];
    if (filter?.workflowId) {
      entries = entries.filter((e) => e.workflowId === filter.workflowId);
    }
    if (filter?.runId) {
      entries = entries.filter((e) => e.runId === filter.runId);
    }
    if (filter?.eventType) {
      entries = entries.filter((e) => e.eventType === filter.eventType);
    }
    return entries;
  }

  /**
   * Get active run count for a workflow.
   */
  getActiveRunCount(workflowId: string): number {
    return this.activeRunsByWorkflow.get(workflowId)?.size ?? 0;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private resolveInputMapping(
    mapping: Record<string, string>,
    context: WorkflowExecutionContext,
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    const fullContext = {
      ...context.triggerData,
      ...context.variables,
      ...context.stepOutputs,
      inputs: context.inputs,
    };

    for (const [key, path] of Object.entries(mapping)) {
      resolved[key] = getNestedValue(fullContext, path);
    }
    return resolved;
  }

  private trackActiveRun(workflowId: string, runId: string): void {
    if (!this.activeRunsByWorkflow.has(workflowId)) {
      this.activeRunsByWorkflow.set(workflowId, new Set());
    }
    this.activeRunsByWorkflow.get(workflowId)!.add(runId);
  }

  private untrackActiveRun(workflowId: string, runId: string): void {
    this.activeRunsByWorkflow.get(workflowId)?.delete(runId);
  }

  private audit(
    eventType: WorkflowAuditEventType,
    workflowId: string,
    runId?: string,
    stepId?: string,
    actorId: string = "system",
    data?: Record<string, unknown>,
  ): void {
    if (!this.config.enableAudit) return;

    const entry: WorkflowAuditEntry = {
      id: generateId("audit"),
      eventType,
      workflowId,
      runId,
      stepId,
      actorId,
      timestamp: this.now().toISOString(),
      description: `${eventType}${stepId ? ` (step: ${stepId})` : ""}`,
      data,
    };

    this.auditLog.push(entry);
  }

  private sleep(ms: number): Promise<void> {
    if (this.config.sleepFn) {
      return this.config.sleepFn(ms);
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private now(): Date {
    if (this.config.nowFn) {
      return this.config.nowFn();
    }
    return new Date();
  }

  /**
   * Clear all state (for testing).
   */
  clear(): void {
    this.runs.clear();
    this.auditLog = [];
    this.activeRunsByWorkflow.clear();
    this.processedIdempotencyKeys.clear();
  }
}

// ============================================================================
// ERRORS
// ============================================================================

export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean,
    public readonly stepId?: string,
  ) {
    super(message);
    this.name = "ExecutionError";
  }
}

export class ApprovalRequiredError extends Error {
  constructor(
    public readonly stepId: string,
    public readonly action: ApprovalAction,
  ) {
    super(`Approval required for step: ${stepId}`);
    this.name = "ApprovalRequiredError";
  }
}

// ============================================================================
// DEFAULT HANDLERS
// ============================================================================

/**
 * Create default action handlers for built-in action types.
 * In production, these would connect to actual services.
 * Here they provide a simulation layer for testing and development.
 */
export function createDefaultHandlers(): ActionHandlerRegistry {
  const registry = createActionHandlerRegistry();

  // Send message handler (simulation)
  registry.register("send_message", async (action, context) => {
    const msgAction = action as SendMessageAction;
    const channelId = interpolateTemplate(msgAction.channelId, {
      ...context.triggerData,
      ...context.variables,
      inputs: context.inputs,
    });
    const content = interpolateTemplate(msgAction.content, {
      ...context.triggerData,
      ...context.variables,
      ...context.stepOutputs,
      inputs: context.inputs,
    });

    return {
      messageId: generateId("msg"),
      channelId,
      content,
      sentAt: new Date().toISOString(),
    };
  });

  // HTTP request handler (simulation)
  registry.register("http_request", async (action, context) => {
    const httpAction = action as HttpRequestAction;
    const url = interpolateTemplate(httpAction.url, {
      ...context.triggerData,
      ...context.variables,
      inputs: context.inputs,
    });

    // In production this would make a real HTTP request
    return {
      url,
      method: httpAction.method,
      status: 200,
      body: { success: true },
    };
  });

  // Transform data handler
  registry.register("transform_data", async (action, context) => {
    const transformAction = action as TransformDataAction;
    const inputValue = getNestedValue(
      {
        ...context.triggerData,
        ...context.variables,
        ...context.stepOutputs,
        inputs: context.inputs,
      },
      transformAction.input,
    );

    // Simple transform: just pass through the value
    // In production, this would use a safe expression evaluator
    return { input: inputValue, transformed: inputValue };
  });

  // Channel action handler (simulation)
  registry.register("channel_action", async (action) => {
    return { action: action.type, success: true };
  });

  // User action handler (simulation)
  registry.register("user_action", async (action) => {
    return { action: action.type, success: true };
  });

  // Loop handler (simulation)
  registry.register("loop", async (action, context) => {
    const loopAction = action as LoopAction;
    const collection = getNestedValue(
      {
        ...context.triggerData,
        ...context.variables,
        ...context.stepOutputs,
        inputs: context.inputs,
      },
      loopAction.collection,
    );

    if (!Array.isArray(collection)) {
      return { iterations: 0, results: [] };
    }

    const results: unknown[] = [];
    const max = Math.min(collection.length, loopAction.maxIterations);
    for (let i = 0; i < max; i++) {
      context.variables[loopAction.itemVariable] = collection[i];
      context.variables[loopAction.indexVariable] = i;
      results.push(collection[i]);
    }

    return { iterations: max, results };
  });

  // Parallel handler (simulation)
  registry.register("parallel", async (action) => {
    const parallelAction = action as ParallelAction;
    return {
      branches: parallelAction.branches.length,
      waitForAll: parallelAction.waitForAll,
      completed: true,
    };
  });

  return registry;
}
