// ============================================================================
// WORKFLOW ENGINE
// Core engine for managing workflow lifecycle and execution
// ============================================================================

import type {
  Workflow,
  WorkflowStep,
  WorkflowEdge,
  WorkflowRun,
  WorkflowStatus,
  WorkflowRunStatus,
  WorkflowVariable,
  WorkflowSettings,
  WorkflowContext,
  WorkflowError,
  ValidationResult,
  ValidationError,
  TriggerStep,
} from "./workflow-types";

import {
  validateStep,
  canBeEntryPoint,
  canBeExitPoint,
} from "./workflow-steps";
import { TriggerEvent, shouldTriggerFire } from "./workflow-triggers";

// ============================================================================
// Workflow Factory
// ============================================================================

let workflowIdCounter = 0;

/**
 * Generate a unique workflow ID
 */
export function generateWorkflowId(): string {
  workflowIdCounter++;
  return `workflow_${Date.now()}_${workflowIdCounter}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Generate a unique run ID
 */
export function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new empty workflow
 */
export function createWorkflow(
  name: string,
  createdBy: string,
  overrides?: Partial<Workflow>,
): Workflow {
  const now = new Date().toISOString();

  return {
    id: generateWorkflowId(),
    name,
    description: "",
    status: "draft",
    version: 1,
    steps: [],
    edges: [],
    variables: [],
    settings: createDefaultSettings(),
    createdBy,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create default workflow settings
 */
export function createDefaultSettings(): WorkflowSettings {
  return {
    maxDuration: 3600000, // 1 hour
    retryOnFailure: false,
    maxRetries: 3,
    logLevel: "all",
    notifyOnComplete: false,
    notifyOnError: true,
    notifyUsers: [],
    timeoutAction: "cancel",
    concurrencyLimit: 1,
    tags: [],
  };
}

// ============================================================================
// Workflow Validation
// ============================================================================

/**
 * Validate a workflow
 */
export function validateWorkflow(workflow: Workflow): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate basic properties
  if (!workflow.name || workflow.name.trim() === "") {
    errors.push({
      message: "Workflow name is required",
      severity: "error",
    });
  }

  // Validate that there's at least one trigger
  const triggers = workflow.steps.filter((s) => canBeEntryPoint(s.type));
  if (triggers.length === 0) {
    errors.push({
      message: "Workflow must have at least one trigger",
      severity: "error",
    });
  }

  // Validate individual steps
  for (const step of workflow.steps) {
    const stepErrors = validateStep(step);
    errors.push(...stepErrors.filter((e) => e.severity === "error"));
    warnings.push(...stepErrors.filter((e) => e.severity === "warning"));
  }

  // Validate edges
  const stepIds = new Set(workflow.steps.map((s) => s.id));

  for (const edge of workflow.edges) {
    if (!stepIds.has(edge.sourceId)) {
      errors.push({
        message: `Edge "${edge.id}" references non-existent source step "${edge.sourceId}"`,
        severity: "error",
      });
    }
    if (!stepIds.has(edge.targetId)) {
      errors.push({
        message: `Edge "${edge.id}" references non-existent target step "${edge.targetId}"`,
        severity: "error",
      });
    }
  }

  // Validate connectivity
  const connectivityErrors = validateConnectivity(workflow);
  errors.push(...connectivityErrors.filter((e) => e.severity === "error"));
  warnings.push(...connectivityErrors.filter((e) => e.severity === "warning"));

  // Validate for cycles (unless loops are intentional)
  const cycleErrors = validateNoCycles(workflow);
  warnings.push(...cycleErrors);

  // Validate variables
  const variableErrors = validateVariables(workflow);
  errors.push(...variableErrors.filter((e) => e.severity === "error"));
  warnings.push(...variableErrors.filter((e) => e.severity === "warning"));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate workflow connectivity
 */
function validateConnectivity(workflow: Workflow): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build adjacency list
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const step of workflow.steps) {
    outgoing.set(step.id, []);
    incoming.set(step.id, []);
  }

  for (const edge of workflow.edges) {
    outgoing.get(edge.sourceId)?.push(edge.targetId);
    incoming.get(edge.targetId)?.push(edge.sourceId);
  }

  // Check for disconnected steps (excluding triggers and ends)
  for (const step of workflow.steps) {
    const hasIncoming = (incoming.get(step.id)?.length || 0) > 0;
    const hasOutgoing = (outgoing.get(step.id)?.length || 0) > 0;

    if (canBeEntryPoint(step.type)) {
      // Triggers should have outgoing but no incoming
      if (hasIncoming) {
        errors.push({
          stepId: step.id,
          message: `Trigger "${step.name}" should not have incoming connections`,
          severity: "warning",
        });
      }
      if (!hasOutgoing) {
        errors.push({
          stepId: step.id,
          message: `Trigger "${step.name}" has no outgoing connections`,
          severity: "warning",
        });
      }
    } else if (canBeExitPoint(step.type)) {
      // End steps should have incoming but no outgoing
      if (!hasIncoming) {
        errors.push({
          stepId: step.id,
          message: `End step "${step.name}" has no incoming connections`,
          severity: "warning",
        });
      }
      if (hasOutgoing) {
        errors.push({
          stepId: step.id,
          message: `End step "${step.name}" should not have outgoing connections`,
          severity: "warning",
        });
      }
    } else {
      // Other steps should have both
      if (!hasIncoming && !hasOutgoing) {
        errors.push({
          stepId: step.id,
          message: `Step "${step.name}" is disconnected from the workflow`,
          severity: "warning",
        });
      } else if (!hasIncoming) {
        errors.push({
          stepId: step.id,
          message: `Step "${step.name}" has no incoming connections`,
          severity: "warning",
        });
      } else if (!hasOutgoing) {
        errors.push({
          stepId: step.id,
          message: `Step "${step.name}" has no outgoing connections`,
          severity: "warning",
        });
      }
    }
  }

  return errors;
}

/**
 * Validate no unintentional cycles in workflow
 */
function validateNoCycles(workflow: Workflow): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const step of workflow.steps) {
    adjacency.set(step.id, []);
  }
  for (const edge of workflow.edges) {
    // Skip loop edges
    if (edge.type === "loop") continue;
    adjacency.get(edge.sourceId)?.push(edge.targetId);
  }

  // DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycleSteps: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          cycleSteps.push(nodeId);
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        cycleSteps.push(nodeId);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const step of workflow.steps) {
    if (!visited.has(step.id)) {
      if (dfs(step.id)) {
        const step = workflow.steps.find((s) => s.id === cycleSteps[0]);
        errors.push({
          stepId: cycleSteps[0],
          message: `Potential cycle detected involving step "${step?.name || cycleSteps[0]}"`,
          severity: "warning",
        });
      }
    }
  }

  return errors;
}

/**
 * Validate workflow variables
 */
function validateVariables(workflow: Workflow): ValidationError[] {
  const errors: ValidationError[] = [];
  const variableNames = new Set<string>();

  for (const variable of workflow.variables) {
    if (!variable.name || variable.name.trim() === "") {
      errors.push({
        message: "Variable name is required",
        severity: "error",
      });
      continue;
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(variable.name)) {
      errors.push({
        message: `Variable name "${variable.name}" must start with a letter and contain only letters, numbers, and underscores`,
        severity: "error",
      });
    }

    if (variableNames.has(variable.name)) {
      errors.push({
        message: `Duplicate variable name "${variable.name}"`,
        severity: "error",
      });
    }

    variableNames.add(variable.name);
  }

  return errors;
}

// ============================================================================
// Workflow Operations
// ============================================================================

/**
 * Add a step to a workflow
 */
export function addStep(workflow: Workflow, step: WorkflowStep): Workflow {
  return {
    ...workflow,
    steps: [...workflow.steps, step],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update a step in a workflow
 */
export function updateStep(
  workflow: Workflow,
  stepId: string,
  updates: Partial<WorkflowStep>,
): Workflow {
  return {
    ...workflow,
    steps: workflow.steps.map((s) =>
      s.id === stepId ? ({ ...s, ...updates } as WorkflowStep) : s,
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Remove a step from a workflow
 */
export function removeStep(workflow: Workflow, stepId: string): Workflow {
  return {
    ...workflow,
    steps: workflow.steps.filter((s) => s.id !== stepId),
    edges: workflow.edges.filter(
      (e) => e.sourceId !== stepId && e.targetId !== stepId,
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add an edge to a workflow
 */
export function addEdge(workflow: Workflow, edge: WorkflowEdge): Workflow {
  // Check for duplicate
  const exists = workflow.edges.some(
    (e) =>
      e.sourceId === edge.sourceId &&
      e.targetId === edge.targetId &&
      e.sourceHandle === edge.sourceHandle,
  );

  if (exists) {
    return workflow;
  }

  return {
    ...workflow,
    edges: [...workflow.edges, edge],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Remove an edge from a workflow
 */
export function removeEdge(workflow: Workflow, edgeId: string): Workflow {
  return {
    ...workflow,
    edges: workflow.edges.filter((e) => e.id !== edgeId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add a variable to a workflow
 */
export function addVariable(
  workflow: Workflow,
  variable: WorkflowVariable,
): Workflow {
  return {
    ...workflow,
    variables: [...workflow.variables, variable],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update a variable in a workflow
 */
export function updateVariable(
  workflow: Workflow,
  variableId: string,
  updates: Partial<WorkflowVariable>,
): Workflow {
  return {
    ...workflow,
    variables: workflow.variables.map((v) =>
      v.id === variableId ? { ...v, ...updates } : v,
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Remove a variable from a workflow
 */
export function removeVariable(
  workflow: Workflow,
  variableId: string,
): Workflow {
  return {
    ...workflow,
    variables: workflow.variables.filter((v) => v.id !== variableId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update workflow settings
 */
export function updateSettings(
  workflow: Workflow,
  settings: Partial<WorkflowSettings>,
): Workflow {
  return {
    ...workflow,
    settings: { ...workflow.settings, ...settings },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update workflow status
 */
export function updateStatus(
  workflow: Workflow,
  status: WorkflowStatus,
): Workflow {
  const updates: Partial<Workflow> = {
    status,
    updatedAt: new Date().toISOString(),
  };

  if (status === "active" && !workflow.publishedAt) {
    updates.publishedAt = new Date().toISOString();
  }

  return { ...workflow, ...updates };
}

/**
 * Publish a workflow (activate it)
 */
export function publishWorkflow(workflow: Workflow): Workflow {
  const validation = validateWorkflow(workflow);

  if (!validation.isValid) {
    throw new Error(
      `Cannot publish workflow: ${validation.errors[0]?.message}`,
    );
  }

  return {
    ...workflow,
    status: "active",
    version: workflow.version + 1,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Workflow Run Management
// ============================================================================

/**
 * Create a new workflow run
 */
export function createWorkflowRun(
  workflow: Workflow,
  triggerData: Record<string, unknown>,
  createdBy?: string,
): WorkflowRun {
  // Initialize variables with defaults
  const variables: Record<string, unknown> = {};
  for (const variable of workflow.variables) {
    variables[variable.name] = variable.defaultValue;
  }

  return {
    id: generateRunId(),
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    status: "pending",
    triggerData,
    variables,
    stepRuns: [],
    startedAt: new Date().toISOString(),
    logs: [],
    createdBy,
  };
}

/**
 * Update workflow run status
 */
export function updateRunStatus(
  run: WorkflowRun,
  status: WorkflowRunStatus,
  error?: WorkflowError,
): WorkflowRun {
  return {
    ...run,
    status,
    error: error || run.error,
    completedAt:
      status === "completed" || status === "failed" || status === "cancelled"
        ? new Date().toISOString()
        : undefined,
  };
}

// ============================================================================
// Trigger Matching
// ============================================================================

/**
 * Find workflows that match a trigger event
 */
export function findMatchingWorkflows(
  workflows: Workflow[],
  event: TriggerEvent,
): Workflow[] {
  return workflows.filter((workflow) => {
    // Only active workflows
    if (workflow.status !== "active") return false;

    // Find triggers that match
    const triggers = workflow.steps.filter(
      (s): s is TriggerStep => s.type === "trigger",
    );

    return triggers.some((trigger) => shouldTriggerFire(trigger, event));
  });
}

// ============================================================================
// Graph Traversal
// ============================================================================

/**
 * Get the next steps to execute after a given step
 */
export function getNextSteps(
  workflow: Workflow,
  stepId: string,
  outputHandle?: string,
): WorkflowStep[] {
  const edges = workflow.edges.filter(
    (e) =>
      e.sourceId === stepId &&
      (outputHandle === undefined || e.sourceHandle === outputHandle),
  );

  const stepIds = edges.map((e) => e.targetId);
  return workflow.steps.filter((s) => stepIds.includes(s.id));
}

/**
 * Get the trigger step for a workflow
 */
export function getTriggerSteps(workflow: Workflow): TriggerStep[] {
  return workflow.steps.filter((s): s is TriggerStep => s.type === "trigger");
}

/**
 * Get a step by ID
 */
export function getStep(
  workflow: Workflow,
  stepId: string,
): WorkflowStep | undefined {
  return workflow.steps.find((s) => s.id === stepId);
}

/**
 * Build the execution order for a workflow (topological sort)
 */
export function buildExecutionOrder(workflow: Workflow): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  for (const step of workflow.steps) {
    inDegree.set(step.id, 0);
    adjacency.set(step.id, []);
  }

  // Build graph
  for (const edge of workflow.edges) {
    adjacency.get(edge.sourceId)?.push(edge.targetId);
    inDegree.set(edge.targetId, (inDegree.get(edge.targetId) || 0) + 1);
  }

  // Find starting nodes (triggers with in-degree 0)
  const queue: string[] = [];
  for (const step of workflow.steps) {
    if (inDegree.get(step.id) === 0) {
      queue.push(step.id);
    }
  }

  // Process
  const order: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    order.push(nodeId);

    for (const neighbor of adjacency.get(nodeId) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return order;
}

// ============================================================================
// Context Builder
// ============================================================================

/**
 * Build initial workflow context from trigger event
 */
export function buildWorkflowContext(
  workflow: Workflow,
  run: WorkflowRun,
  event: TriggerEvent,
): WorkflowContext {
  return {
    workflowId: workflow.id,
    runId: run.id,
    trigger: {
      type: event.type,
      data: event.data || {},
    },
    variables: { ...run.variables },
    channel: event.channelId
      ? {
          id: event.channelId,
          name: "", // Would be populated from channel store
          type: "",
        }
      : undefined,
    message: event.messageId
      ? {
          id: event.messageId,
          content: (event.data?.content as string) || "",
          authorId: event.userId || "",
        }
      : undefined,
  };
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize a workflow to JSON
 */
export function serializeWorkflow(workflow: Workflow): string {
  return JSON.stringify(workflow, null, 2);
}

/**
 * Deserialize a workflow from JSON
 */
export function deserializeWorkflow(json: string): Workflow {
  const workflow = JSON.parse(json) as Workflow;

  // Validate basic structure
  if (!workflow.id || !workflow.name || !Array.isArray(workflow.steps)) {
    throw new Error("Invalid workflow format");
  }

  return workflow;
}

/**
 * Clone a workflow with a new ID
 */
export function cloneWorkflow(
  workflow: Workflow,
  newName: string,
  createdBy: string,
): Workflow {
  const now = new Date().toISOString();

  // Create new IDs for all steps
  const stepIdMap = new Map<string, string>();
  for (const step of workflow.steps) {
    stepIdMap.set(
      step.id,
      `${step.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    );
  }

  // Clone steps with new IDs
  const newSteps = workflow.steps.map((step) => ({
    ...step,
    id: stepIdMap.get(step.id) || step.id,
    config: JSON.parse(JSON.stringify(step.config)),
    metadata: {
      ...step.metadata,
      createdAt: now,
    },
  }));

  // Clone edges with updated step references
  const newEdges = workflow.edges.map((edge) => ({
    ...edge,
    id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sourceId: stepIdMap.get(edge.sourceId) || edge.sourceId,
    targetId: stepIdMap.get(edge.targetId) || edge.targetId,
  }));

  // Clone variables
  const newVariables = workflow.variables.map((v) => ({
    ...v,
    id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  }));

  return {
    ...workflow,
    id: generateWorkflowId(),
    name: newName,
    status: "draft",
    version: 1,
    steps: newSteps,
    edges: newEdges,
    variables: newVariables,
    createdBy,
    createdAt: now,
    updatedAt: now,
    publishedAt: undefined,
  };
}
