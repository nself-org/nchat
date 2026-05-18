// ============================================================================
// WORKFLOW STEPS
// Step definitions, templates, and utilities for all workflow step types
// ============================================================================

import type {
  StepType,
  WorkflowStep,
  TriggerStep,
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
  StepTemplate,
  Position,
  MessageConfig,
  FormConfig,
  DelayConfig,
  WebhookConfig,
  ApprovalConfig,
  LoopConfig,
  ParallelConfig,
  EndConfig,
  ValidationError,
} from "./workflow-types";

import { triggerTemplates } from "./workflow-triggers";
import { validateConditionConfig } from "./workflow-conditions";
import { validateActionConfig } from "./workflow-actions";

// ============================================================================
// Step Templates
// ============================================================================

export const stepTemplates: Record<StepType, StepTemplate> = {
  trigger: {
    type: "trigger",
    name: "Trigger",
    description: "Start the workflow",
    icon: "Zap",
    color: "#10B981",
    category: "Triggers",
    defaultConfig: {},
  },
  message: {
    type: "message",
    name: "Send Message",
    description: "Send a message to a channel or user",
    icon: "MessageSquare",
    color: "#3B82F6",
    category: "Communication",
    defaultConfig: {
      target: "channel",
      content: "",
      parseVariables: true,
    } as MessageConfig,
  },
  form: {
    type: "form",
    name: "Form",
    description: "Collect information with a form",
    icon: "ClipboardList",
    color: "#8B5CF6",
    category: "Data Collection",
    defaultConfig: {
      title: "Form",
      fields: [],
      target: "trigger_source",
      timeoutSeconds: 300,
    } as FormConfig,
  },
  condition: {
    type: "condition",
    name: "Condition",
    description: "Branch based on conditions",
    icon: "GitBranch",
    color: "#F59E0B",
    category: "Logic",
    defaultConfig: {
      logic: "and",
      conditions: [],
    },
  },
  delay: {
    type: "delay",
    name: "Delay",
    description: "Wait before continuing",
    icon: "Clock",
    color: "#6366F1",
    category: "Timing",
    defaultConfig: {
      delayType: "fixed",
      duration: 60000,
      durationUnit: "seconds",
    } as DelayConfig,
  },
  webhook: {
    type: "webhook",
    name: "Webhook",
    description: "Call an external API",
    icon: "Globe",
    color: "#EC4899",
    category: "Integration",
    defaultConfig: {
      url: "",
      method: "POST",
      bodyType: "json",
      timeoutSeconds: 30,
      retryCount: 3,
    } as WebhookConfig,
  },
  approval: {
    type: "approval",
    name: "Approval",
    description: "Request approval from users",
    icon: "CheckCircle",
    color: "#14B8A6",
    category: "Approval",
    defaultConfig: {
      approvalType: "single",
      approvers: [],
      message: "Please review and approve.",
      timeoutMinutes: 1440, // 24 hours
    } as ApprovalConfig,
  },
  action: {
    type: "action",
    name: "Action",
    description: "Perform an action",
    icon: "Play",
    color: "#F97316",
    category: "Actions",
    defaultConfig: {
      actionType: "set_variable",
    },
  },
  loop: {
    type: "loop",
    name: "Loop",
    description: "Repeat steps",
    icon: "Repeat",
    color: "#0EA5E9",
    category: "Logic",
    defaultConfig: {
      loopType: "for_each",
      maxIterations: 100,
    } as LoopConfig,
  },
  parallel: {
    type: "parallel",
    name: "Parallel",
    description: "Execute branches in parallel",
    icon: "GitFork",
    color: "#84CC16",
    category: "Logic",
    defaultConfig: {
      branches: [],
      waitForAll: true,
    } as ParallelConfig,
  },
  end: {
    type: "end",
    name: "End",
    description: "End the workflow",
    icon: "Square",
    color: "#6B7280",
    category: "Control",
    defaultConfig: {
      status: "success",
    } as EndConfig,
  },
};

// ============================================================================
// Step Categories
// ============================================================================

export const stepCategories = [
  {
    id: "triggers",
    name: "Triggers",
    description: "Start workflows",
    icon: "Zap",
    steps: ["trigger"],
  },
  {
    id: "communication",
    name: "Communication",
    description: "Send messages and notifications",
    icon: "MessageSquare",
    steps: ["message"],
  },
  {
    id: "data_collection",
    name: "Data Collection",
    description: "Collect information from users",
    icon: "ClipboardList",
    steps: ["form"],
  },
  {
    id: "logic",
    name: "Logic",
    description: "Control flow and branching",
    icon: "GitBranch",
    steps: ["condition", "loop", "parallel"],
  },
  {
    id: "timing",
    name: "Timing",
    description: "Delays and scheduling",
    icon: "Clock",
    steps: ["delay"],
  },
  {
    id: "integration",
    name: "Integration",
    description: "Connect with external services",
    icon: "Globe",
    steps: ["webhook"],
  },
  {
    id: "approval",
    name: "Approval",
    description: "Request approvals",
    icon: "CheckCircle",
    steps: ["approval"],
  },
  {
    id: "actions",
    name: "Actions",
    description: "Perform operations",
    icon: "Play",
    steps: ["action"],
  },
  {
    id: "control",
    name: "Control",
    description: "Workflow control",
    icon: "Settings",
    steps: ["end"],
  },
];

// ============================================================================
// Step Factory
// ============================================================================

let stepIdCounter = 0;

/**
 * Generate a unique step ID
 */
export function generateStepId(type: StepType): string {
  stepIdCounter++;
  return `${type}_${Date.now()}_${stepIdCounter}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Create a new step of the specified type
 */
export function createStep(
  type: StepType,
  position: Position = { x: 100, y: 100 },
  overrides?: Partial<WorkflowStep>,
): WorkflowStep {
  const template = stepTemplates[type];
  const id = generateStepId(type);

  const baseStep = {
    id,
    type,
    name: template.name,
    description: template.description,
    position,
    config: { ...template.defaultConfig },
    metadata: {
      icon: template.icon,
      color: template.color,
      category: template.category,
      createdAt: new Date().toISOString(),
    },
  };

  return { ...baseStep, ...overrides } as WorkflowStep;
}

/**
 * Create a trigger step with specific trigger type
 */
export function createTriggerStep(
  triggerType: keyof typeof triggerTemplates,
  position: Position = { x: 100, y: 100 },
): TriggerStep {
  const template = triggerTemplates[triggerType];
  const id = generateStepId("trigger");

  return {
    id,
    type: "trigger",
    name: template.name,
    description: template.description,
    position,
    config: {
      triggerType,
      ...template.defaultConfig,
    },
    metadata: {
      icon: template.icon,
      color: template.color,
      category: template.category,
      createdAt: new Date().toISOString(),
    },
  } as TriggerStep;
}

/**
 * Create a message step
 */
export function createMessageStep(
  position: Position = { x: 100, y: 100 },
  overrides?: Partial<MessageConfig>,
): MessageStep {
  const step = createStep("message", position) as MessageStep;
  step.config = { ...step.config, ...overrides };
  return step;
}

/**
 * Create a form step
 */
export function createFormStep(
  position: Position = { x: 100, y: 100 },
  overrides?: Partial<FormConfig>,
): FormStep {
  const step = createStep("form", position) as FormStep;
  step.config = { ...step.config, ...overrides };
  return step;
}

/**
 * Create a condition step
 */
export function createConditionStep(
  position: Position = { x: 100, y: 100 },
): ConditionStep {
  return createStep("condition", position) as ConditionStep;
}

/**
 * Create a delay step
 */
export function createDelayStep(
  position: Position = { x: 100, y: 100 },
  overrides?: Partial<DelayConfig>,
): DelayStep {
  const step = createStep("delay", position) as DelayStep;
  step.config = { ...step.config, ...overrides };
  return step;
}

/**
 * Create a webhook step
 */
export function createWebhookStep(
  position: Position = { x: 100, y: 100 },
  overrides?: Partial<WebhookConfig>,
): WebhookStep {
  const step = createStep("webhook", position) as WebhookStep;
  step.config = { ...step.config, ...overrides };
  return step;
}

/**
 * Create an approval step
 */
export function createApprovalStep(
  position: Position = { x: 100, y: 100 },
  overrides?: Partial<ApprovalConfig>,
): ApprovalStep {
  const step = createStep("approval", position) as ApprovalStep;
  step.config = { ...step.config, ...overrides };
  return step;
}

/**
 * Create a loop step
 */
export function createLoopStep(
  position: Position = { x: 100, y: 100 },
  overrides?: Partial<LoopConfig>,
): LoopStep {
  const step = createStep("loop", position) as LoopStep;
  step.config = { ...step.config, ...overrides };
  return step;
}

/**
 * Create a parallel step
 */
export function createParallelStep(
  position: Position = { x: 100, y: 100 },
  overrides?: Partial<ParallelConfig>,
): ParallelStep {
  const step = createStep("parallel", position) as ParallelStep;
  step.config = { ...step.config, ...overrides };
  return step;
}

/**
 * Create an end step
 */
export function createEndStep(
  position: Position = { x: 100, y: 100 },
  overrides?: Partial<EndConfig>,
): EndStep {
  const step = createStep("end", position) as EndStep;
  step.config = { ...step.config, ...overrides };
  return step;
}

// ============================================================================
// Step Cloning
// ============================================================================

/**
 * Clone a step with a new ID
 */
export function cloneStep(
  step: WorkflowStep,
  offset: Position = { x: 50, y: 50 },
): WorkflowStep {
  return {
    ...step,
    id: generateStepId(step.type),
    position: {
      x: step.position.x + offset.x,
      y: step.position.y + offset.y,
    },
    config: JSON.parse(JSON.stringify(step.config)),
    metadata: {
      ...step.metadata,
      createdAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Step Validation
// ============================================================================

/**
 * Validate a workflow step
 */
export function validateStep(step: WorkflowStep): ValidationError[] {
  const errors: ValidationError[] = [];

  // Basic validation
  if (!step.name || step.name.trim() === "") {
    errors.push({
      stepId: step.id,
      field: "name",
      message: "Step name is required",
      severity: "error",
    });
  }

  // Type-specific validation
  switch (step.type) {
    case "trigger":
      errors.push(...validateTriggerStepConfig(step as TriggerStep));
      break;
    case "message":
      errors.push(...validateMessageStepConfig(step as MessageStep));
      break;
    case "form":
      errors.push(...validateFormStepConfig(step as FormStep));
      break;
    case "condition":
      errors.push(...validateConditionStepConfig(step as ConditionStep));
      break;
    case "delay":
      errors.push(...validateDelayStepConfig(step as DelayStep));
      break;
    case "webhook":
      errors.push(...validateWebhookStepConfig(step as WebhookStep));
      break;
    case "approval":
      errors.push(...validateApprovalStepConfig(step as ApprovalStep));
      break;
    case "action":
      errors.push(...validateActionStepConfig(step as ActionStep));
      break;
    case "loop":
      errors.push(...validateLoopStepConfig(step as LoopStep));
      break;
    case "parallel":
      errors.push(...validateParallelStepConfig(step as ParallelStep));
      break;
  }

  return errors;
}

function validateTriggerStepConfig(step: TriggerStep): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = step.config;

  if (!config.triggerType) {
    errors.push({
      stepId: step.id,
      field: "triggerType",
      message: "Trigger type is required",
      severity: "error",
    });
  }

  if (config.triggerType === "keyword" && !config.keyword) {
    errors.push({
      stepId: step.id,
      field: "keyword",
      message: "Keyword is required for keyword triggers",
      severity: "error",
    });
  }

  if (config.triggerType === "scheduled" && !config.schedule) {
    errors.push({
      stepId: step.id,
      field: "schedule",
      message: "Schedule is required for scheduled triggers",
      severity: "error",
    });
  }

  return errors;
}

function validateMessageStepConfig(step: MessageStep): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = step.config;

  if (!config.content || config.content.trim() === "") {
    errors.push({
      stepId: step.id,
      field: "content",
      message: "Message content is required",
      severity: "error",
    });
  }

  if (config.target === "channel" && !config.channelId) {
    errors.push({
      stepId: step.id,
      field: "channelId",
      message: "Channel is required when target is channel",
      severity: "warning",
    });
  }

  if (config.target === "user" && !config.userId) {
    errors.push({
      stepId: step.id,
      field: "userId",
      message: "User is required when target is user",
      severity: "warning",
    });
  }

  return errors;
}

function validateFormStepConfig(step: FormStep): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = step.config;

  if (!config.title || config.title.trim() === "") {
    errors.push({
      stepId: step.id,
      field: "title",
      message: "Form title is required",
      severity: "error",
    });
  }

  if (!config.fields || config.fields.length === 0) {
    errors.push({
      stepId: step.id,
      field: "fields",
      message: "Form must have at least one field",
      severity: "error",
    });
  }

  config.fields?.forEach((field, index) => {
    if (!field.name || field.name.trim() === "") {
      errors.push({
        stepId: step.id,
        field: `fields[${index}].name`,
        message: `Field ${index + 1} name is required`,
        severity: "error",
      });
    }
    if (!field.label || field.label.trim() === "") {
      errors.push({
        stepId: step.id,
        field: `fields[${index}].label`,
        message: `Field ${index + 1} label is required`,
        severity: "error",
      });
    }
  });

  return errors;
}

function validateConditionStepConfig(step: ConditionStep): ValidationError[] {
  const configErrors = validateConditionConfig(step.config);
  return configErrors.map((message) => ({
    stepId: step.id,
    message,
    severity: "error" as const,
  }));
}

function validateDelayStepConfig(step: DelayStep): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = step.config;

  if (config.delayType === "fixed") {
    if (!config.duration || config.duration <= 0) {
      errors.push({
        stepId: step.id,
        field: "duration",
        message: "Duration must be greater than 0",
        severity: "error",
      });
    }
  }

  if (config.delayType === "until_time" && !config.untilTime) {
    errors.push({
      stepId: step.id,
      field: "untilTime",
      message: "Target time is required",
      severity: "error",
    });
  }

  return errors;
}

function validateWebhookStepConfig(step: WebhookStep): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = step.config;

  if (!config.url || config.url.trim() === "") {
    errors.push({
      stepId: step.id,
      field: "url",
      message: "Webhook URL is required",
      severity: "error",
    });
  } else {
    try {
      new URL(config.url);
    } catch {
      errors.push({
        stepId: step.id,
        field: "url",
        message: "Invalid URL format",
        severity: "error",
      });
    }
  }

  return errors;
}

function validateApprovalStepConfig(step: ApprovalStep): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = step.config;

  if (
    (!config.approvers || config.approvers.length === 0) &&
    (!config.approverRoles || config.approverRoles.length === 0)
  ) {
    errors.push({
      stepId: step.id,
      field: "approvers",
      message: "At least one approver or approver role is required",
      severity: "error",
    });
  }

  if (!config.message || config.message.trim() === "") {
    errors.push({
      stepId: step.id,
      field: "message",
      message: "Approval message is required",
      severity: "error",
    });
  }

  return errors;
}

function validateActionStepConfig(step: ActionStep): ValidationError[] {
  const configErrors = validateActionConfig(step.config);
  return configErrors.map((message) => ({
    stepId: step.id,
    message,
    severity: "error" as const,
  }));
}

function validateLoopStepConfig(step: LoopStep): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = step.config;

  if (config.loopType === "for_each" && !config.collection) {
    errors.push({
      stepId: step.id,
      field: "collection",
      message: "Collection variable is required for for-each loops",
      severity: "error",
    });
  }

  if (config.loopType === "count" && (!config.count || config.count <= 0)) {
    errors.push({
      stepId: step.id,
      field: "count",
      message: "Count must be greater than 0",
      severity: "error",
    });
  }

  if (config.maxIterations && config.maxIterations < 1) {
    errors.push({
      stepId: step.id,
      field: "maxIterations",
      message: "Maximum iterations must be at least 1",
      severity: "error",
    });
  }

  return errors;
}

function validateParallelStepConfig(step: ParallelStep): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = step.config;

  if (!config.branches || config.branches.length < 2) {
    errors.push({
      stepId: step.id,
      field: "branches",
      message: "Parallel step requires at least 2 branches",
      severity: "error",
    });
  }

  return errors;
}

// ============================================================================
// Step Utilities
// ============================================================================

/**
 * Get the template for a step type
 */
export function getStepTemplate(type: StepType): StepTemplate {
  return stepTemplates[type];
}

/**
 * Get all step types for a category
 */
export function getStepsByCategory(categoryId: string): StepType[] {
  const category = stepCategories.find((c) => c.id === categoryId);
  return (category?.steps || []) as StepType[];
}

/**
 * Get all step templates grouped by category
 */
export function getStepTemplatesByCategory(): Record<string, StepTemplate[]> {
  const result: Record<string, StepTemplate[]> = {};

  for (const category of stepCategories) {
    result[category.name] = category.steps.map(
      (type) => stepTemplates[type as StepType],
    );
  }

  return result;
}

/**
 * Check if a step type can have multiple outputs (branches)
 */
export function canHaveMultipleOutputs(type: StepType): boolean {
  return type === "condition" || type === "parallel" || type === "loop";
}

/**
 * Check if a step type can be an entry point
 */
export function canBeEntryPoint(type: StepType): boolean {
  return type === "trigger";
}

/**
 * Check if a step type can be an exit point
 */
export function canBeExitPoint(type: StepType): boolean {
  return type === "end";
}

/**
 * Get the default output handles for a step type
 */
export function getOutputHandles(type: StepType): string[] {
  switch (type) {
    case "condition":
      return ["true", "false"];
    case "approval":
      return ["approved", "rejected", "timeout"];
    case "loop":
      return ["iteration", "complete"];
    case "parallel":
      return ["complete"];
    case "end":
      return [];
    default:
      return ["default"];
  }
}

/**
 * Get the input handles for a step type
 */
export function getInputHandles(type: StepType): string[] {
  if (type === "trigger") {
    return [];
  }
  return ["default"];
}
