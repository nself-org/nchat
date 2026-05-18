// ============================================================================
// WORKFLOW EXECUTOR
// Executes workflow steps and manages run state
// ============================================================================

import type {
  Workflow,
  WorkflowStep,
  WorkflowRun,
  StepRun,
  WorkflowContext,
  WorkflowError,
  WorkflowLogEntry,
  StepStatus,
  WorkflowRunStatus,
  MessageStep,
  FormStep,
  ConditionStep,
  DelayStep,
  WebhookStep,
  ApprovalStep,
  ActionStep,
  LoopStep,
  ParallelStep,
  EndStep,
} from "./workflow-types";

import { getNextSteps, getStep, updateRunStatus } from "./workflow-engine";
import { executeAction } from "./workflow-actions";
import { evaluateConditionConfig } from "./workflow-conditions";

// ============================================================================
// Types
// ============================================================================

export interface ExecutorConfig {
  maxConcurrentSteps: number;
  stepTimeout: number; // milliseconds
  onStepStart?: (stepRun: StepRun) => void;
  onStepComplete?: (stepRun: StepRun) => void;
  onStepError?: (stepRun: StepRun, error: WorkflowError) => void;
  onLog?: (entry: WorkflowLogEntry) => void;
  onRunComplete?: (run: WorkflowRun) => void;
}

export interface StepResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: WorkflowError;
  nextHandle?: string; // Which output handle to follow
}

export type StepHandler<T extends WorkflowStep = WorkflowStep> = (
  step: T,
  context: WorkflowContext,
  run: WorkflowRun,
) => Promise<StepResult>;

// ============================================================================
// Executor Class
// ============================================================================

export class WorkflowExecutor {
  private config: ExecutorConfig;
  private stepHandlers: Map<string, StepHandler>;
  private activeRuns: Map<string, WorkflowRun>;
  private runTimeouts: Map<string, NodeJS.Timeout>;

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = {
      maxConcurrentSteps: 10,
      stepTimeout: 30000, // 30 seconds
      ...config,
    };
    this.stepHandlers = new Map();
    this.activeRuns = new Map();
    this.runTimeouts = new Map();

    // Register default handlers
    this.registerDefaultHandlers();
  }

  // ============================================================================
  // Handler Registration
  // ============================================================================

  /**
   * Register a step handler
   */
  registerHandler<T extends WorkflowStep>(
    type: string,
    handler: StepHandler<T>,
  ): void {
    this.stepHandlers.set(type, handler as StepHandler);
  }

  /**
   * Register default handlers for all step types
   */
  private registerDefaultHandlers(): void {
    this.registerHandler("trigger", this.handleTriggerStep.bind(this));
    this.registerHandler("message", this.handleMessageStep.bind(this));
    this.registerHandler("form", this.handleFormStep.bind(this));
    this.registerHandler("condition", this.handleConditionStep.bind(this));
    this.registerHandler("delay", this.handleDelayStep.bind(this));
    this.registerHandler("webhook", this.handleWebhookStep.bind(this));
    this.registerHandler("approval", this.handleApprovalStep.bind(this));
    this.registerHandler("action", this.handleActionStep.bind(this));
    this.registerHandler("loop", this.handleLoopStep.bind(this));
    this.registerHandler("parallel", this.handleParallelStep.bind(this));
    this.registerHandler("end", this.handleEndStep.bind(this));
  }

  // ============================================================================
  // Execution
  // ============================================================================

  /**
   * Execute a workflow
   */
  async execute(
    workflow: Workflow,
    run: WorkflowRun,
    context: WorkflowContext,
  ): Promise<WorkflowRun> {
    // Update run status to running
    run = updateRunStatus(run, "running");
    this.activeRuns.set(run.id, run);

    // Set up timeout
    if (workflow.settings.maxDuration) {
      const timeout = setTimeout(() => {
        this.handleRunTimeout(run.id);
      }, workflow.settings.maxDuration);
      this.runTimeouts.set(run.id, timeout);
    }

    try {
      // Find trigger step
      const triggerStep = workflow.steps.find((s) => s.type === "trigger");
      if (!triggerStep) {
        throw new Error("No trigger step found");
      }

      // Execute starting from trigger
      await this.executeStep(workflow, run, triggerStep, context);

      // Check final status
      run = this.activeRuns.get(run.id) || run;
      if (run.status === "running") {
        run = updateRunStatus(run, "completed");
      }
    } catch (error) {
      const workflowError: WorkflowError = {
        code: "EXECUTION_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        details: { error },
      };
      run = updateRunStatus(run, "failed", workflowError);
      this.log(run, "error", "Workflow execution failed", {
        error: workflowError,
      });
    } finally {
      // Clean up
      this.cleanup(run.id);
    }

    this.config.onRunComplete?.(run);
    return run;
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    workflow: Workflow,
    run: WorkflowRun,
    step: WorkflowStep,
    context: WorkflowContext,
  ): Promise<void> {
    // Create step run
    const stepRun: StepRun = {
      id: `step_run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      stepId: step.id,
      stepType: step.type,
      status: "running",
      input: { ...context.variables },
      startedAt: new Date().toISOString(),
      retryCount: 0,
    };

    run.stepRuns.push(stepRun);
    run.currentStepId = step.id;
    this.activeRuns.set(run.id, run);

    this.config.onStepStart?.(stepRun);
    this.log(run, "info", `Executing step: ${step.name}`, { stepId: step.id });

    try {
      // Get handler
      const handler = this.stepHandlers.get(step.type);
      if (!handler) {
        throw new Error(`No handler registered for step type: ${step.type}`);
      }

      // Execute with timeout
      const result = await Promise.race([
        handler(step, context, run),
        this.createTimeout(step.id),
      ]);

      if (!result.success) {
        throw new Error(result.error?.message || "Step execution failed");
      }

      // Update step run
      stepRun.status = "completed";
      stepRun.output = result.output;
      stepRun.completedAt = new Date().toISOString();
      stepRun.duration =
        new Date(stepRun.completedAt).getTime() -
        new Date(stepRun.startedAt).getTime();

      // Update context with output
      if (result.output) {
        Object.assign(context.variables, result.output);
      }

      this.config.onStepComplete?.(stepRun);
      this.log(run, "info", `Completed step: ${step.name}`, {
        stepId: step.id,
        duration: stepRun.duration,
      });

      // Get next steps
      const nextSteps = getNextSteps(workflow, step.id, result.nextHandle);

      // Execute next steps
      for (const nextStep of nextSteps) {
        // Check if run was cancelled
        const currentRun = this.activeRuns.get(run.id);
        if (!currentRun || currentRun.status === "cancelled") {
          break;
        }
        await this.executeStep(workflow, run, nextStep, context);
      }
    } catch (error) {
      const workflowError: WorkflowError = {
        code: "STEP_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        stepId: step.id,
        details: { error },
      };

      stepRun.status = "failed";
      stepRun.error = workflowError;
      stepRun.completedAt = new Date().toISOString();

      this.config.onStepError?.(stepRun, workflowError);
      this.log(run, "error", `Step failed: ${step.name}`, {
        stepId: step.id,
        error: workflowError,
      });

      // Check retry
      const currentRetryCount = stepRun.retryCount ?? 0;
      if (
        workflow.settings.retryOnFailure &&
        currentRetryCount < (workflow.settings.maxRetries || 3)
      ) {
        stepRun.retryCount = currentRetryCount + 1;
        this.log(run, "info", `Retrying step: ${step.name}`, {
          attempt: stepRun.retryCount,
        });
        await this.executeStep(workflow, run, step, context);
      } else {
        // Fail the entire run
        throw error;
      }
    }
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(stepId: string): Promise<StepResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Step ${stepId} timed out`));
      }, this.config.stepTimeout);
    });
  }

  /**
   * Handle run timeout
   */
  private handleRunTimeout(runId: string): void {
    const run = this.activeRuns.get(runId);
    if (run && run.status === "running") {
      const updatedRun = updateRunStatus(run, "failed", {
        code: "TIMEOUT",
        message: "Workflow execution timed out",
      });
      this.activeRuns.set(runId, updatedRun);
      this.log(updatedRun, "error", "Workflow timed out");
    }
  }

  /**
   * Cancel a running workflow
   */
  cancel(runId: string): void {
    const run = this.activeRuns.get(runId);
    if (run && run.status === "running") {
      const updatedRun = updateRunStatus(run, "cancelled");
      this.activeRuns.set(runId, updatedRun);
      this.log(updatedRun, "info", "Workflow cancelled");
    }
  }

  /**
   * Clean up resources for a run
   */
  private cleanup(runId: string): void {
    const timeout = this.runTimeouts.get(runId);
    if (timeout) {
      clearTimeout(timeout);
      this.runTimeouts.delete(runId);
    }
    this.activeRuns.delete(runId);
  }

  /**
   * Log an entry
   */
  private log(
    run: WorkflowRun,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: Record<string, unknown>,
  ): void {
    const entry: WorkflowLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      stepId: run.currentStepId,
      message,
      data,
    };

    run.logs.push(entry);
    this.config.onLog?.(entry);
  }

  // ============================================================================
  // Step Handlers
  // ============================================================================

  private async handleTriggerStep(
    _step: WorkflowStep,
    _context: WorkflowContext,
    _run: WorkflowRun,
  ): Promise<StepResult> {
    // Trigger step just passes through
    return { success: true, output: {} };
  }

  private async handleMessageStep(
    step: MessageStep,
    context: WorkflowContext,
    _run: WorkflowRun,
  ): Promise<StepResult> {
    const config = step.config;

    // Process message content with variables
    let content = config.content;
    if (config.parseVariables) {
      content = this.interpolateVariables(content, context);
    }

    // In a real implementation, this would send the message

    return {
      success: true,
      output: {
        messageSent: true,
        content,
        target: config.target,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async handleFormStep(
    step: FormStep,
    _context: WorkflowContext,
    _run: WorkflowRun,
  ): Promise<StepResult> {
    const config = step.config;

    // In a real implementation, this would show a form and wait for response
    // For now, we simulate an immediate response

    const mockResponse: Record<string, unknown> = {};
    for (const field of config.fields) {
      mockResponse[field.name] = field.defaultValue || "";
    }

    return {
      success: true,
      output: {
        formResponse: mockResponse,
        submittedAt: new Date().toISOString(),
      },
    };
  }

  private async handleConditionStep(
    step: ConditionStep,
    context: WorkflowContext,
    _run: WorkflowRun,
  ): Promise<StepResult> {
    const result = evaluateConditionConfig(step.config, context);

    return {
      success: true,
      output: {
        conditionResult: result,
      },
      nextHandle: result ? "true" : "false",
    };
  }

  private async handleDelayStep(
    step: DelayStep,
    _context: WorkflowContext,
    _run: WorkflowRun,
  ): Promise<StepResult> {
    const config = step.config;

    let delayMs = 0;

    switch (config.delayType) {
      case "fixed": {
        const multipliers: Record<string, number> = {
          seconds: 1000,
          minutes: 60000,
          hours: 3600000,
          days: 86400000,
        };
        delayMs =
          (config.duration || 0) *
          (multipliers[config.durationUnit || "seconds"] || 1000);
        break;
      }
      case "until_time": {
        if (config.untilTime) {
          const targetTime = new Date(config.untilTime).getTime();
          delayMs = Math.max(0, targetTime - Date.now());
        }
        break;
      }
      // until_condition would need to poll
    }

    // Apply max wait duration
    if (config.maxWaitDuration && delayMs > config.maxWaitDuration) {
      delayMs = config.maxWaitDuration;
    }

    // Cap at reasonable max (1 hour for demo)
    delayMs = Math.min(delayMs, 3600000);

    // Simulate delay (in real implementation, might use a scheduler)
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(delayMs, 5000)),
    );

    return {
      success: true,
      output: {
        delayedFor: delayMs,
        resumedAt: new Date().toISOString(),
      },
    };
  }

  private async handleWebhookStep(
    step: WebhookStep,
    context: WorkflowContext,
    _run: WorkflowRun,
  ): Promise<StepResult> {
    const config = step.config;

    // Interpolate URL and body
    const url = this.interpolateVariables(config.url, context);
    const body = config.body
      ? this.interpolateVariables(config.body, context)
      : undefined;

    // Build headers
    const headers: Record<string, string> = {};
    for (const header of config.headers || []) {
      headers[header.key] = this.interpolateVariables(header.value, context);
    }

    try {
      // Make HTTP request
      const response = await fetch(url, {
        method: config.method,
        headers: {
          "Content-Type":
            config.bodyType === "json" ? "application/json" : "text/plain",
          ...headers,
        },
        body: config.method !== "GET" ? body : undefined,
      });

      const responseBody = config.parseResponse
        ? await response.json()
        : await response.text();

      // Check expected status codes
      if (
        config.expectedStatusCodes &&
        !config.expectedStatusCodes.includes(response.status)
      ) {
        throw new Error(
          `Unexpected status code: ${response.status}. Expected: ${config.expectedStatusCodes.join(", ")}`,
        );
      }

      const output: Record<string, unknown> = {
        statusCode: response.status,
        responseBody,
      };

      if (config.responseVariableName) {
        output[config.responseVariableName] = responseBody;
      }

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "WEBHOOK_ERROR",
          message: error instanceof Error ? error.message : "Webhook failed",
          stepId: step.id,
        },
      };
    }
  }

  private async handleApprovalStep(
    step: ApprovalStep,
    context: WorkflowContext,
    _run: WorkflowRun,
  ): Promise<StepResult> {
    const config = step.config;

    // Process message with variables
    const message = this.interpolateVariables(config.message, context);

    // In a real implementation, this would:
    // 1. Send approval requests to approvers
    // 2. Wait for responses
    // 3. Handle timeout

    // For demo, simulate immediate approval
    const approved = true;

    return {
      success: true,
      output: {
        approved,
        approvedBy: config.approvers[0] || "system",
        approvedAt: new Date().toISOString(),
        message,
      },
      nextHandle: approved ? "approved" : "rejected",
    };
  }

  private async handleActionStep(
    step: ActionStep,
    context: WorkflowContext,
    _run: WorkflowRun,
  ): Promise<StepResult> {
    const result = await executeAction(step, context);

    return {
      success: result.success,
      output: result.output,
      error: result.error
        ? {
            code: "ACTION_ERROR",
            message: result.error,
            stepId: step.id,
          }
        : undefined,
    };
  }

  private async handleLoopStep(
    step: LoopStep,
    context: WorkflowContext,
    _run: WorkflowRun,
  ): Promise<StepResult> {
    const config = step.config;
    const output: Record<string, unknown> = {
      iterations: 0,
    };

    switch (config.loopType) {
      case "for_each": {
        const collection = context.variables[config.collection || ""];
        if (!Array.isArray(collection)) {
          return {
            success: false,
            error: {
              code: "LOOP_ERROR",
              message: `Collection "${config.collection}" is not an array`,
              stepId: step.id,
            },
          };
        }

        const maxIterations = config.maxIterations || 100;
        const iterations = Math.min(collection.length, maxIterations);

        for (let i = 0; i < iterations; i++) {
          if (config.itemVariableName) {
            context.variables[config.itemVariableName] = collection[i];
          }
          if (config.indexVariableName) {
            context.variables[config.indexVariableName] = i;
          }
          // Inner steps would be executed here
        }

        output.iterations = iterations;
        break;
      }

      case "count": {
        const count = Math.min(config.count || 0, config.maxIterations || 100);

        for (let i = 0; i < count; i++) {
          if (config.indexVariableName) {
            context.variables[config.indexVariableName] = i;
          }
          // Inner steps would be executed here
        }

        output.iterations = count;
        break;
      }

      case "while": {
        // While loops need careful handling to avoid infinite loops
        let iterations = 0;
        const maxIterations = config.maxIterations || 100;

        while (iterations < maxIterations) {
          if (config.condition) {
            const shouldContinue = evaluateConditionConfig(
              config.condition,
              context,
            );
            if (!shouldContinue) break;
          }
          // Inner steps would be executed here
          iterations++;
        }

        output.iterations = iterations;
        break;
      }
    }

    return {
      success: true,
      output,
      nextHandle: "complete",
    };
  }

  private async handleParallelStep(
    step: ParallelStep,
    _context: WorkflowContext,
    _run: WorkflowRun,
  ): Promise<StepResult> {
    const config = step.config;

    // In a real implementation, this would execute branches in parallel
    // For now, we just track that parallel execution was requested

    return {
      success: true,
      output: {
        branchCount: config.branches.length,
        waitedForAll: config.waitForAll,
        completedAt: new Date().toISOString(),
      },
    };
  }

  private async handleEndStep(
    step: EndStep,
    context: WorkflowContext,
    _run: WorkflowRun,
  ): Promise<StepResult> {
    const config = step.config;

    // Collect output variables
    const output: Record<string, unknown> = {
      status: config.status || "success",
      message: config.message,
    };

    if (config.outputVariables) {
      for (const varName of config.outputVariables) {
        output[varName] = context.variables[varName];
      }
    }

    return {
      success: true,
      output,
    };
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Interpolate variables in a string
   */
  private interpolateVariables(text: string, context: WorkflowContext): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (_, varPath) => {
      const path = varPath.trim().split(".");
      let value: unknown = context;

      for (const key of path) {
        if (value === null || value === undefined) {
          return "";
        }
        value = (value as Record<string, unknown>)[key];
      }

      return value !== undefined ? String(value) : "";
    });
  }

  /**
   * Get a running workflow
   */
  getActiveRun(runId: string): WorkflowRun | undefined {
    return this.activeRuns.get(runId);
  }

  /**
   * Get all active runs
   */
  getActiveRuns(): WorkflowRun[] {
    return Array.from(this.activeRuns.values());
  }
}

// ============================================================================
// Default Executor Instance
// ============================================================================

let defaultExecutor: WorkflowExecutor | null = null;

/**
 * Get the default executor instance
 */
export function getExecutor(): WorkflowExecutor {
  if (!defaultExecutor) {
    defaultExecutor = new WorkflowExecutor();
  }
  return defaultExecutor;
}

/**
 * Create a new executor with custom config
 */
export function createExecutor(
  config: Partial<ExecutorConfig>,
): WorkflowExecutor {
  return new WorkflowExecutor(config);
}
