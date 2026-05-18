/**
 * Command Executor
 *
 * Handles the execution of commands from the command palette.
 * Supports async execution, error handling, and execution hooks.
 */

import type {
  Command,
  ExecutableCommand,
  ChannelCommandData,
  DMCommandData,
  UserCommandData,
  SettingsCommandData,
  CommandExecutionContext,
} from "./command-types";

// ============================================================================
// Types
// ============================================================================

export interface ExecutionResult {
  success: boolean;
  commandId: string;
  error?: string;
  duration?: number;
}

export interface ExecutorOptions {
  /** Called before command execution */
  onBeforeExecute?: (
    command: Command,
    context: CommandExecutionContext,
  ) => boolean | Promise<boolean>;
  /** Called after successful execution */
  onAfterExecute?: (command: Command, result: ExecutionResult) => void;
  /** Called on execution error */
  onError?: (command: Command, error: Error) => void;
  /** Confirmation handler for commands that require it */
  onConfirmation?: (command: Command) => boolean | Promise<boolean>;
  /** Default navigation handler */
  navigate?: (path: string) => void;
  /** Default close palette handler */
  closeCommandPalette?: () => void;
}

// ============================================================================
// Command Executor Class
// ============================================================================

export class CommandExecutor {
  private options: ExecutorOptions;

  constructor(options: ExecutorOptions = {}) {
    this.options = options;
  }

  /**
   * Execute a command
   */
  async execute(
    command: Command,
    context: Partial<CommandExecutionContext> = {},
  ): Promise<ExecutionResult> {
    const startTime = performance.now();
    const commandId = command.id;

    // Build full execution context
    const fullContext: CommandExecutionContext = {
      closeCommandPalette: this.options.closeCommandPalette || (() => {}),
      navigate: this.options.navigate || (() => {}),
      ...context,
    };

    try {
      // Check if command requires confirmation
      if (command.requiresConfirmation && this.options.onConfirmation) {
        const confirmed = await this.options.onConfirmation(command);
        if (!confirmed) {
          return {
            success: false,
            commandId,
            error: "User cancelled",
          };
        }
      }

      // Check if command can execute
      if (this.isExecutableCommand(command) && command.canExecute) {
        if (!command.canExecute(fullContext)) {
          return {
            success: false,
            commandId,
            error: "Command cannot execute in current context",
          };
        }
      }

      // Call before execute hook
      if (this.options.onBeforeExecute) {
        const shouldContinue = await this.options.onBeforeExecute(
          command,
          fullContext,
        );
        if (!shouldContinue) {
          return {
            success: false,
            commandId,
            error: "Execution cancelled by hook",
          };
        }
      }

      // Execute based on command type
      await this.executeByType(command, fullContext);

      const duration = performance.now() - startTime;
      const result: ExecutionResult = {
        success: true,
        commandId,
        duration,
      };

      // Call after execute hook
      if (this.options.onAfterExecute) {
        this.options.onAfterExecute(command, result);
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Call error hook
      if (this.options.onError) {
        this.options.onError(
          command,
          error instanceof Error ? error : new Error(errorMessage),
        );
      }

      return {
        success: false,
        commandId,
        error: errorMessage,
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Execute command based on its type
   */
  private async executeByType(
    command: Command,
    context: CommandExecutionContext,
  ): Promise<void> {
    // Handle executable commands with custom execute function
    if (this.isExecutableCommand(command)) {
      await command.execute(context);
      return;
    }

    // Handle channel commands
    if (this.isChannelCommand(command)) {
      context.navigate(`/chat/channel/${command.channelId}`);
      context.closeCommandPalette();
      return;
    }

    // Handle DM commands
    if (this.isDMCommand(command)) {
      context.navigate(`/chat/dm/${command.userId}`);
      context.closeCommandPalette();
      return;
    }

    // Handle user commands
    if (this.isUserCommand(command)) {
      // Open user profile modal or navigate to profile
      if (context.data?.openUserProfile) {
        (context.data.openUserProfile as (userId: string) => void)(
          command.userId,
        );
      } else {
        context.navigate(`/user/${command.userId}`);
      }
      context.closeCommandPalette();
      return;
    }

    // Handle settings commands
    if (this.isSettingsCommand(command)) {
      context.navigate(command.settingsPath);
      context.closeCommandPalette();
      return;
    }

    // Default: close palette
    context.closeCommandPalette();
  }

  // ============================================================================
  // Type Guards
  // ============================================================================

  private isExecutableCommand(command: Command): command is ExecutableCommand {
    return "execute" in command && typeof command.execute === "function";
  }

  private isChannelCommand(command: Command): command is ChannelCommandData {
    return command.category === "channel" && "channelId" in command;
  }

  private isDMCommand(command: Command): command is DMCommandData {
    return command.category === "dm" && "userId" in command;
  }

  private isUserCommand(command: Command): command is UserCommandData {
    return command.category === "user" && "userId" in command;
  }

  private isSettingsCommand(command: Command): command is SettingsCommandData {
    return command.category === "settings" && "settingsPath" in command;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Update executor options
   */
  setOptions(options: Partial<ExecutorOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Set navigation handler
   */
  setNavigate(navigate: (path: string) => void): void {
    this.options.navigate = navigate;
  }

  /**
   * Set close palette handler
   */
  setCloseCommandPalette(close: () => void): void {
    this.options.closeCommandPalette = close;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let executorInstance: CommandExecutor | null = null;

/**
 * Get the global command executor instance
 */
export function getCommandExecutor(options?: ExecutorOptions): CommandExecutor {
  if (!executorInstance) {
    executorInstance = new CommandExecutor(options);
  } else if (options) {
    executorInstance.setOptions(options);
  }
  return executorInstance;
}

/**
 * Reset the global executor instance
 */
export function resetCommandExecutor(): void {
  executorInstance = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Execute a command directly
 */
export async function executeCommand(
  command: Command,
  context: Partial<CommandExecutionContext> = {},
  options?: ExecutorOptions,
): Promise<ExecutionResult> {
  const executor = getCommandExecutor(options);
  return executor.execute(command, context);
}

/**
 * Create a pre-configured executor for a specific context
 */
export function createContextualExecutor(
  baseContext: Partial<CommandExecutionContext>,
  options?: ExecutorOptions,
): (command: Command) => Promise<ExecutionResult> {
  const executor = new CommandExecutor(options);
  return (command: Command) => executor.execute(command, baseContext);
}

export default CommandExecutor;
