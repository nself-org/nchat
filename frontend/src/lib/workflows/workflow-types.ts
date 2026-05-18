// ============================================================================
// WORKFLOW TYPES
// Core type definitions for the nself-chat workflow system
// ============================================================================

// ============================================================================
// Base Types
// ============================================================================

export type WorkflowStatus = "draft" | "active" | "paused" | "archived";
export type WorkflowRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";
export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "waiting";

/**
 * Position on the canvas
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Dimensions for canvas elements
 */
export interface Dimensions {
  width: number;
  height: number;
}

// ============================================================================
// Step Types
// ============================================================================

export type StepType =
  | "trigger"
  | "message"
  | "form"
  | "condition"
  | "delay"
  | "webhook"
  | "approval"
  | "action"
  | "loop"
  | "parallel"
  | "end";

/**
 * Base config interface with index signature
 */
export interface BaseConfig {
  [key: string]: unknown;
}

/**
 * Base step interface all steps extend
 */
export interface BaseStep {
  id: string;
  type: StepType;
  name: string;
  description?: string;
  position: Position;
  config: BaseConfig;
  metadata?: StepMetadata;
}

/**
 * Step metadata for tracking and display
 */
export interface StepMetadata {
  icon?: string;
  color?: string;
  category?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Trigger Step
// ============================================================================

export type TriggerType =
  | "message_received"
  | "reaction_added"
  | "member_joined"
  | "member_left"
  | "channel_created"
  | "scheduled"
  | "webhook"
  | "manual"
  | "keyword"
  | "mention"
  | "slash_command";

export interface TriggerConfig extends BaseConfig {
  triggerType: TriggerType;
  channelId?: string | null; // null means any channel
  userId?: string | null; // null means any user
  keyword?: string;
  mentionType?: "user" | "channel" | "everyone" | "here";
  schedule?: ScheduleConfig;
  webhookSecret?: string;
  slashCommand?: string;
  filters?: TriggerFilter[];
}

export interface ScheduleConfig {
  type: "once" | "recurring";
  datetime?: string; // ISO datetime for 'once'
  cron?: string; // Cron expression for 'recurring'
  timezone?: string;
  startDate?: string;
  endDate?: string;
}

export interface TriggerFilter {
  field: string;
  operator:
    | "equals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "matches"
    | "not_equals";
  value: string;
}

export interface TriggerStep extends BaseStep {
  type: "trigger";
  config: TriggerConfig;
}

// ============================================================================
// Message Step
// ============================================================================

export type MessageTarget = "channel" | "user" | "thread" | "trigger_source";

export interface MessageConfig extends BaseConfig {
  target: MessageTarget;
  channelId?: string;
  userId?: string;
  threadId?: string;
  content: string;
  isEphemeral?: boolean;
  parseVariables?: boolean;
  attachments?: MessageAttachment[];
  buttons?: MessageButton[];
  embeds?: MessageEmbed[];
}

export interface MessageAttachment {
  type: "file" | "image" | "link";
  url: string;
  name?: string;
  description?: string;
}

export interface MessageButton {
  id: string;
  label: string;
  style: "primary" | "secondary" | "danger";
  action: "url" | "workflow" | "callback";
  value: string;
}

export interface MessageEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; icon?: string };
  timestamp?: boolean;
}

export interface MessageStep extends BaseStep {
  type: "message";
  config: MessageConfig;
}

// ============================================================================
// Form Step
// ============================================================================

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "date"
  | "datetime"
  | "time"
  | "user_select"
  | "channel_select"
  | "file";

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  defaultValue?: unknown;
  required?: boolean;
  options?: { label: string; value: string }[];
  validation?: FormFieldValidation;
  helpText?: string;
}

export interface FormFieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customMessage?: string;
}

export interface FormConfig extends BaseConfig {
  title: string;
  description?: string;
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
  target: MessageTarget;
  channelId?: string;
  userId?: string;
  timeoutSeconds?: number;
  allowMultipleSubmissions?: boolean;
}

export interface FormStep extends BaseStep {
  type: "form";
  config: FormConfig;
}

// ============================================================================
// Condition Step
// ============================================================================

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_equal"
  | "less_equal"
  | "is_empty"
  | "is_not_empty"
  | "matches_regex"
  | "in_list"
  | "not_in_list";

export type ConditionLogic = "and" | "or";

export interface Condition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface ConditionGroup {
  id: string;
  logic: ConditionLogic;
  conditions: (Condition | ConditionGroup)[];
}

export interface ConditionConfig extends BaseConfig {
  logic: ConditionLogic;
  conditions: (Condition | ConditionGroup)[];
  trueBranchId?: string;
  falseBranchId?: string;
}

export interface ConditionStep extends BaseStep {
  type: "condition";
  config: ConditionConfig;
}

// ============================================================================
// Delay Step
// ============================================================================

export type DelayType = "fixed" | "until_time" | "until_condition";

export interface DelayConfig extends BaseConfig {
  delayType: DelayType;
  duration?: number; // milliseconds for 'fixed'
  durationUnit?: "seconds" | "minutes" | "hours" | "days";
  untilTime?: string; // ISO datetime for 'until_time'
  untilCondition?: ConditionConfig; // for 'until_condition'
  maxWaitDuration?: number; // maximum wait time in milliseconds
}

export interface DelayStep extends BaseStep {
  type: "delay";
  config: DelayConfig;
}

// ============================================================================
// Webhook Step
// ============================================================================

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface WebhookHeader {
  key: string;
  value: string;
  isSecret?: boolean;
}

export interface WebhookConfig extends BaseConfig {
  url: string;
  method: HttpMethod;
  headers?: WebhookHeader[];
  body?: string;
  bodyType?: "json" | "form" | "raw";
  parseResponse?: boolean;
  responseVariableName?: string;
  timeoutSeconds?: number;
  retryCount?: number;
  retryDelaySeconds?: number;
  expectedStatusCodes?: number[];
}

export interface WebhookStep extends BaseStep {
  type: "webhook";
  config: WebhookConfig;
}

// ============================================================================
// Approval Step
// ============================================================================

export type ApprovalType = "single" | "all" | "any" | "majority";

export interface ApprovalConfig extends BaseConfig {
  approvalType: ApprovalType;
  approvers: string[]; // user IDs
  approverRoles?: string[]; // role names
  message: string;
  timeoutMinutes?: number;
  timeoutAction?: "approve" | "reject" | "escalate";
  escalateTo?: string[]; // user IDs
  requireComment?: boolean;
  allowDelegate?: boolean;
  reminderIntervalMinutes?: number;
}

export interface ApprovalStep extends BaseStep {
  type: "approval";
  config: ApprovalConfig;
}

// ============================================================================
// Action Step (Generic)
// ============================================================================

export type ActionType =
  | "set_variable"
  | "update_user"
  | "update_channel"
  | "add_reaction"
  | "remove_reaction"
  | "pin_message"
  | "unpin_message"
  | "archive_channel"
  | "invite_user"
  | "remove_user"
  | "set_topic"
  | "create_channel"
  | "log"
  | "notify"
  | "custom";

export interface ActionConfig extends BaseConfig {
  actionType: ActionType;
  variableName?: string;
  variableValue?: unknown;
  targetUserId?: string;
  targetChannelId?: string;
  targetMessageId?: string;
  reactionEmoji?: string;
  topic?: string;
  channelName?: string;
  channelType?: "public" | "private";
  inviteUserIds?: string[];
  logLevel?: "debug" | "info" | "warn" | "error";
  logMessage?: string;
  notificationTitle?: string;
  notificationBody?: string;
  customAction?: string;
  customPayload?: Record<string, unknown>;
}

export interface ActionStep extends BaseStep {
  type: "action";
  config: ActionConfig;
}

// ============================================================================
// Loop Step
// ============================================================================

export type LoopType = "for_each" | "while" | "count";

export interface LoopConfig extends BaseConfig {
  loopType: LoopType;
  collection?: string; // variable name containing array for 'for_each'
  itemVariableName?: string; // variable name for current item
  indexVariableName?: string; // variable name for current index
  condition?: ConditionConfig; // for 'while'
  count?: number; // for 'count'
  maxIterations?: number; // safety limit
  innerStepIds?: string[]; // steps to execute in loop
}

export interface LoopStep extends BaseStep {
  type: "loop";
  config: LoopConfig;
}

// ============================================================================
// Parallel Step
// ============================================================================

export interface ParallelBranch {
  id: string;
  name: string;
  stepIds: string[];
}

export interface ParallelConfig extends BaseConfig {
  branches: ParallelBranch[];
  waitForAll?: boolean; // wait for all branches or continue on first completion
}

export interface ParallelStep extends BaseStep {
  type: "parallel";
  config: ParallelConfig;
}

// ============================================================================
// End Step
// ============================================================================

export interface EndConfig extends BaseConfig {
  status?: "success" | "failure" | "cancelled";
  message?: string;
  outputVariables?: string[];
}

export interface EndStep extends BaseStep {
  type: "end";
  config: EndConfig;
}

// ============================================================================
// Union Step Type
// ============================================================================

export type WorkflowStep =
  | TriggerStep
  | MessageStep
  | FormStep
  | ConditionStep
  | DelayStep
  | WebhookStep
  | ApprovalStep
  | ActionStep
  | LoopStep
  | ParallelStep
  | EndStep;

// ============================================================================
// Edge (Connection)
// ============================================================================

export type EdgeType =
  | "default"
  | "true"
  | "false"
  | "error"
  | "timeout"
  | "loop";

export interface WorkflowEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: EdgeType;
  label?: string;
  condition?: string; // for conditional edges
}

// ============================================================================
// Workflow
// ============================================================================

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  version: number;
  steps: WorkflowStep[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  settings: WorkflowSettings;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  metadata?: WorkflowMetadata;
}

export interface WorkflowVariable {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object" | "date" | "any";
  defaultValue?: unknown;
  description?: string;
  isInput?: boolean; // exposed as workflow input
  isOutput?: boolean; // exposed as workflow output
}

export interface WorkflowSettings {
  maxDuration?: number; // maximum workflow duration in milliseconds
  retryOnFailure?: boolean;
  maxRetries?: number;
  logLevel?: "none" | "errors" | "all";
  notifyOnComplete?: boolean;
  notifyOnError?: boolean;
  notifyUsers?: string[];
  timeoutAction?: "cancel" | "notify" | "escalate";
  concurrencyLimit?: number;
  tags?: string[];
  category?: string;
}

export interface WorkflowMetadata {
  icon?: string;
  color?: string;
  category?: string;
  tags?: string[];
  usageCount?: number;
  lastRunAt?: string;
  successRate?: number;
}

// ============================================================================
// Workflow Run
// ============================================================================

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: WorkflowRunStatus;
  triggerData: Record<string, unknown>;
  variables: Record<string, unknown>;
  currentStepId?: string;
  stepRuns: StepRun[];
  startedAt: string;
  completedAt?: string;
  error?: WorkflowError;
  logs: WorkflowLogEntry[];
  createdBy?: string;
}

export interface StepRun {
  id: string;
  stepId: string;
  stepType: StepType;
  status: StepStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  error?: WorkflowError;
  retryCount?: number;
}

export interface WorkflowError {
  code: string;
  message: string;
  stepId?: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface WorkflowLogEntry {
  id: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  stepId?: string;
  message: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Builder Types
// ============================================================================

export interface DragItem {
  type: StepType;
  id?: string; // existing step id when moving
}

export interface DropResult {
  position: Position;
  targetStepId?: string; // when dropping onto a step
  insertAfter?: string; // when inserting between steps
}

export interface CanvasState {
  zoom: number;
  pan: Position;
  selectedStepIds: string[];
  selectedEdgeId?: string;
  isDragging: boolean;
  isConnecting: boolean;
  connectionSource?: { stepId: string; handleId?: string };
}

export interface StepTemplate {
  type: StepType;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  defaultConfig: Record<string, unknown>;
}

// ============================================================================
// Context Types
// ============================================================================

export interface WorkflowContext {
  workflowId: string;
  runId: string;
  trigger: {
    type: TriggerType;
    data: Record<string, unknown>;
  };
  variables: Record<string, unknown>;
  user?: {
    id: string;
    name: string;
    email: string;
    roles: string[];
  };
  channel?: {
    id: string;
    name: string;
    type: string;
  };
  message?: {
    id: string;
    content: string;
    authorId: string;
  };
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationError {
  stepId?: string;
  field?: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
