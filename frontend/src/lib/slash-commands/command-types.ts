/**
 * Slash Commands Type Definitions
 *
 * Comprehensive type system for custom and built-in slash commands
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Command execution context provided to all commands
 */
export interface CommandContext {
  /** ID of the user executing the command */
  userId: string;
  /** Username of the user */
  username: string;
  /** Display name of the user */
  displayName: string;
  /** User's role */
  userRole: "owner" | "admin" | "moderator" | "member" | "guest";
  /** ID of the channel where command was executed */
  channelId: string;
  /** Name of the channel */
  channelName: string;
  /** Type of channel */
  channelType: "public" | "private" | "direct" | "group";
  /** Raw input string (everything after command trigger) */
  rawInput: string;
  /** Parsed arguments */
  args: CommandArgValue[];
  /** Named arguments (flags) */
  flags: Record<string, CommandArgValue>;
  /** Original message ID if applicable */
  messageId?: string;
  /** Thread ID if in a thread */
  threadId?: string;
  /** Timestamp of command execution */
  timestamp: Date;
}

/**
 * Possible argument value types
 */
export type CommandArgValue = string | number | boolean | string[] | undefined;

/**
 * Result of command execution
 */
export interface CommandResult {
  /** Whether command executed successfully */
  success: boolean;
  /** Response to show to user */
  response?: CommandResponse;
  /** Error message if failed */
  error?: string;
  /** Additional data from command execution */
  data?: Record<string, unknown>;
  /** Side effects to trigger */
  sideEffects?: CommandSideEffect[];
}

/**
 * Command response configuration
 */
export interface CommandResponse {
  /** Response type determines visibility */
  type: CommandResponseType;
  /** Message content (supports markdown) */
  content: string;
  /** Optional attachments */
  attachments?: CommandAttachment[];
  /** Whether to show as a system message */
  isSystem?: boolean;
  /** Custom emoji to show */
  emoji?: string;
  /** Show as ephemeral (only visible to user) */
  ephemeral?: boolean;
}

/**
 * Response visibility types
 */
export type CommandResponseType =
  | "message" // Send as regular message
  | "ephemeral" // Only visible to command user
  | "notification" // Show as notification toast
  | "modal" // Open a modal dialog
  | "redirect" // Redirect to another page
  | "none"; // No visible response

/**
 * Attachment in command response
 */
export interface CommandAttachment {
  type: "image" | "file" | "link" | "embed";
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
}

/**
 * Side effects that can be triggered by commands
 */
export interface CommandSideEffect {
  type:
    | "webhook" // Call external webhook
    | "workflow" // Trigger internal workflow
    | "notification" // Send notification
    | "update_status" // Update user status
    | "navigate" // Navigate to URL/page
    | "open_modal" // Open a modal
    | "refresh"; // Refresh data
  payload: Record<string, unknown>;
}

// ============================================================================
// Argument Definition Types
// ============================================================================

/**
 * Argument type definitions
 */
export type CommandArgType =
  | "string" // Plain text
  | "number" // Numeric value
  | "boolean" // True/false
  | "user" // @username mention
  | "channel" // #channel mention
  | "date" // Date value
  | "time" // Time value
  | "datetime" // Date and time
  | "duration" // Time duration (1h, 30m, etc.)
  | "choice" // Predefined choices
  | "rest"; // Captures remaining text

/**
 * Definition of a command argument
 */
export interface CommandArgument {
  /** Unique identifier for the argument */
  id: string;
  /** Display name */
  name: string;
  /** Argument type */
  type: CommandArgType;
  /** Description shown in help */
  description: string;
  /** Whether this argument is required */
  required: boolean;
  /** Default value if not provided */
  defaultValue?: CommandArgValue;
  /** Position in argument list (for positional args) */
  position?: number;
  /** Flag name (for named args like --flag) */
  flag?: string;
  /** Short flag (-f) */
  shortFlag?: string;
  /** Choices for 'choice' type */
  choices?: CommandChoice[];
  /** Validation rules */
  validation?: ArgumentValidation;
  /** Autocomplete configuration */
  autocomplete?: AutocompleteConfig;
}

/**
 * Choice option for choice-type arguments
 */
export interface CommandChoice {
  value: string;
  label: string;
  description?: string;
}

/**
 * Validation rules for arguments
 */
export interface ArgumentValidation {
  /** Minimum length for strings */
  minLength?: number;
  /** Maximum length for strings */
  maxLength?: number;
  /** Minimum value for numbers */
  min?: number;
  /** Maximum value for numbers */
  max?: number;
  /** Regex pattern to match */
  pattern?: string;
  /** Custom validation function name */
  custom?: string;
}

/**
 * Autocomplete configuration
 */
export interface AutocompleteConfig {
  /** Source of autocomplete data */
  source: "users" | "channels" | "static" | "api";
  /** Static options */
  options?: string[];
  /** API endpoint for dynamic options */
  endpoint?: string;
  /** Minimum characters before showing suggestions */
  minChars?: number;
}

// ============================================================================
// Command Definition Types
// ============================================================================

/**
 * Full command definition
 */
export interface SlashCommand {
  /** Unique identifier */
  id: string;
  /** Trigger word (without slash) */
  trigger: string;
  /** Alternative triggers (aliases) */
  aliases?: string[];
  /** Display name */
  name: string;
  /** Short description for command list */
  description: string;
  /** Detailed help text */
  helpText?: string;
  /** Usage example */
  usage?: string;
  /** Command category for grouping */
  category: CommandCategory;
  /** Command arguments */
  arguments: CommandArgument[];
  /** Permission requirements */
  permissions: CommandPermissions;
  /** Channel restrictions */
  channels: CommandChannelConfig;
  /** Response configuration */
  responseConfig: CommandResponseConfig;
  /** Webhook configuration (if applicable) */
  webhook?: CommandWebhook;
  /** Workflow trigger (if applicable) */
  workflow?: CommandWorkflow;
  /** Action type */
  actionType: CommandActionType;
  /** Action configuration */
  action: CommandAction;
  /** Whether command is enabled */
  isEnabled: boolean;
  /** Whether this is a built-in command */
  isBuiltIn: boolean;
  /** Icon for the command */
  icon?: string;
  /** Order in command list */
  order?: number;
  /** Cooldown in seconds */
  cooldown?: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Creator user ID */
  createdBy: string;
}

/**
 * Command categories for grouping
 */
export type CommandCategory =
  | "general" // General utility commands
  | "channel" // Channel management
  | "user" // User-related commands
  | "message" // Message operations
  | "moderation" // Moderation tools
  | "fun" // Fun/entertainment
  | "utility" // Utilities
  | "integration" // External integrations
  | "custom"; // Custom user commands

/**
 * Permission configuration for commands
 */
export interface CommandPermissions {
  /** Minimum role required */
  minRole: "owner" | "admin" | "moderator" | "member" | "guest";
  /** Specific roles allowed (overrides minRole) */
  allowedRoles?: string[];
  /** Specific users allowed */
  allowedUsers?: string[];
  /** Users explicitly denied */
  deniedUsers?: string[];
  /** Whether guests can use */
  allowGuests: boolean;
}

/**
 * Channel restrictions for commands
 */
export interface CommandChannelConfig {
  /** Channel types where command works */
  allowedTypes: ("public" | "private" | "direct" | "group")[];
  /** Specific channels where command is allowed */
  allowedChannels?: string[];
  /** Channels where command is blocked */
  blockedChannels?: string[];
  /** Whether to allow in threads */
  allowInThreads: boolean;
}

/**
 * Response configuration
 */
export interface CommandResponseConfig {
  /** Default response type */
  type: CommandResponseType;
  /** Response template (supports variables) */
  template?: string;
  /** Whether response is ephemeral by default */
  ephemeral: boolean;
  /** Show typing indicator while processing */
  showTyping: boolean;
  /** Delay before response (ms) */
  delay?: number;
}

/**
 * Webhook configuration
 */
export interface CommandWebhook {
  /** Webhook URL */
  url: string;
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body template */
  bodyTemplate?: string;
  /** Response mapping */
  responseMapping?: {
    successPath?: string;
    errorPath?: string;
    messagePath?: string;
  };
  /** Timeout in ms */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    attempts: number;
    delay: number;
  };
}

/**
 * Workflow trigger configuration
 */
export interface CommandWorkflow {
  /** Workflow ID to trigger */
  workflowId: string;
  /** Input mapping from command args */
  inputMapping?: Record<string, string>;
  /** Whether to wait for workflow completion */
  waitForCompletion: boolean;
  /** Maximum wait time */
  timeout?: number;
}

/**
 * Action types
 */
export type CommandActionType =
  | "message" // Send a message
  | "status" // Update user status
  | "navigate" // Navigate to page
  | "modal" // Open modal
  | "api" // Call internal API
  | "webhook" // Call external webhook
  | "workflow" // Trigger workflow
  | "builtin" // Built-in action handler
  | "custom"; // Custom JavaScript

/**
 * Action configuration
 */
export interface CommandAction {
  /** Action type */
  type: CommandActionType;
  /** Built-in handler name */
  handler?: string;
  /** Message template */
  message?: string;
  /** Status to set */
  status?: {
    text: string;
    emoji?: string;
    expiry?: string;
  };
  /** Navigation target */
  navigate?: {
    url: string;
    newTab?: boolean;
  };
  /** Modal configuration */
  modal?: {
    component: string;
    props?: Record<string, unknown>;
  };
  /** API call configuration */
  api?: {
    endpoint: string;
    method: string;
    body?: Record<string, unknown>;
  };
}

// ============================================================================
// Parsed Command Types
// ============================================================================

/**
 * Result of parsing user input
 */
export interface ParsedCommand {
  /** The command definition */
  command: SlashCommand;
  /** Parsed positional arguments */
  args: ParsedArgument[];
  /** Parsed flags */
  flags: Record<string, ParsedArgument>;
  /** Remaining unparsed text */
  remainder: string;
  /** Parsing errors */
  errors: ParseError[];
  /** Whether parsing was successful */
  isValid: boolean;
}

/**
 * A parsed argument with its value
 */
export interface ParsedArgument {
  /** Argument definition */
  definition: CommandArgument;
  /** Raw input value */
  rawValue: string;
  /** Parsed/converted value */
  value: CommandArgValue;
  /** Whether parsing was successful */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Parsing error
 */
export interface ParseError {
  /** Type of error */
  type:
    | "missing_required"
    | "invalid_type"
    | "validation_failed"
    | "unknown_flag";
  /** Argument that caused error */
  argument?: string;
  /** Error message */
  message: string;
}

// ============================================================================
// Command Suggestion Types
// ============================================================================

/**
 * Command suggestion for autocomplete
 */
export interface CommandSuggestion {
  /** Command definition */
  command: SlashCommand;
  /** Relevance score */
  score: number;
  /** Highlighted match positions */
  matchPositions?: number[];
}

/**
 * Argument suggestion for autocomplete
 */
export interface ArgumentSuggestion {
  /** Suggestion value */
  value: string;
  /** Display label */
  label: string;
  /** Description */
  description?: string;
  /** Icon */
  icon?: string;
  /** Relevance score */
  score: number;
}

// ============================================================================
// Command Builder Types
// ============================================================================

/**
 * Partial command for builder (work in progress)
 */
export type CommandDraft = Partial<SlashCommand> & {
  trigger: string;
};

/**
 * Validation result for command draft
 */
export interface CommandValidation {
  isValid: boolean;
  errors: CommandValidationError[];
  warnings: CommandValidationWarning[];
}

/**
 * Validation error
 */
export interface CommandValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation warning
 */
export interface CommandValidationWarning {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// Store Types
// ============================================================================

/**
 * State for slash commands store
 */
export interface SlashCommandsState {
  /** All registered commands */
  commands: Map<string, SlashCommand>;
  /** Commands indexed by trigger */
  commandsByTrigger: Map<string, SlashCommand>;
  /** Built-in commands */
  builtInCommands: SlashCommand[];
  /** Custom commands */
  customCommands: SlashCommand[];
  /** Currently editing command */
  editingCommand: CommandDraft | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Command execution history */
  executionHistory: CommandExecution[];
  /** Search query */
  searchQuery: string;
  /** Selected category filter */
  selectedCategory: CommandCategory | "all";
}

/**
 * Record of command execution
 */
export interface CommandExecution {
  id: string;
  commandId: string;
  trigger: string;
  userId: string;
  channelId: string;
  input: string;
  result: CommandResult;
  executedAt: string;
  duration: number;
}
