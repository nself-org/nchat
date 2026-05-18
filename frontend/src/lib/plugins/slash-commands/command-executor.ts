/**
 * Plugin Command Executor
 *
 * Orchestrates the full command execution pipeline:
 * 1. Parse input
 * 2. Resolve command from registry
 * 3. Check permissions (role, scopes, channel)
 * 4. Validate arguments
 * 5. Rate-limit check
 * 6. Execute handler in sandboxed context
 * 7. Enforce timeout
 *
 * Security constraints:
 * - App commands can only use scopes they have been granted
 * - Command handlers receive a restricted execution context
 * - Execution is wrapped in a timeout
 * - Rate limiting is enforced per-user and per-app
 */

import type {
  PluginCommand,
  CommandExecutionContext,
  CommandHandlerResult,
  ExecutionResult,
  PermissionCheckResult,
  UserRole,
  ChannelType,
} from "./types";
import type { AppScope } from "../app-contract";
import { hasAllScopes, expandScopes } from "../app-contract";
import { meetsRoleRequirement } from "./types";
import { CommandRegistry } from "./command-registry";
import { parseInput } from "./command-parser";

// ============================================================================
// RATE LIMITER (simple per-key sliding window)
// ============================================================================

interface RateBucket {
  timestamps: number[];
}

export class CommandRateLimiter {
  private buckets: Map<string, RateBucket> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs = 60_000, maxRequests = 30) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check + consume one request. Returns true if allowed.
   */
  check(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.buckets.set(key, bucket);
    }

    // Prune old entries
    bucket.timestamps = bucket.timestamps.filter(
      (ts) => ts > now - this.windowMs,
    );

    if (bucket.timestamps.length >= this.maxRequests) {
      return false;
    }

    bucket.timestamps.push(now);
    return true;
  }

  /**
   * Get remaining requests for a key.
   */
  remaining(key: string): number {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket) return this.maxRequests;

    const active = bucket.timestamps.filter((ts) => ts > now - this.windowMs);
    return Math.max(0, this.maxRequests - active.length);
  }

  /**
   * Reset a key.
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.buckets.clear();
  }

  /**
   * Update config.
   */
  configure(windowMs: number, maxRequests: number): void {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }
}

// ============================================================================
// EXECUTOR CONFIGURATION
// ============================================================================

export interface ExecutorConfig {
  /** Command execution timeout in ms (default: 5000) */
  executionTimeoutMs: number;
  /** Per-user rate limit: max commands per minute (default: 30) */
  userRateLimitPerMinute: number;
  /** Per-app rate limit: max commands per minute (default: 60) */
  appRateLimitPerMinute: number;
}

const DEFAULT_EXECUTOR_CONFIG: ExecutorConfig = {
  executionTimeoutMs: 5000,
  userRateLimitPerMinute: 30,
  appRateLimitPerMinute: 60,
};

// ============================================================================
// COMMAND EXECUTOR
// ============================================================================

export class CommandExecutor {
  private config: ExecutorConfig;
  private userRateLimiter: CommandRateLimiter;
  private appRateLimiter: CommandRateLimiter;

  constructor(
    private registry: CommandRegistry,
    config?: Partial<ExecutorConfig>,
  ) {
    this.config = { ...DEFAULT_EXECUTOR_CONFIG, ...config };
    this.userRateLimiter = new CommandRateLimiter(
      60_000,
      this.config.userRateLimitPerMinute,
    );
    this.appRateLimiter = new CommandRateLimiter(
      60_000,
      this.config.appRateLimitPerMinute,
    );
  }

  // ==========================================================================
  // EXECUTE
  // ==========================================================================

  /**
   * Execute a slash command from raw user input.
   */
  async execute(
    input: string,
    context: {
      userId: string;
      username: string;
      userRole: UserRole;
      channelId: string;
      channelType: ChannelType;
      grantedScopes?: AppScope[];
    },
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // 1. Quick parse to extract command name
      const quickParse = parseInput(input);
      if (
        !quickParse.success &&
        quickParse.errors.some((e) => e.type === "parse_error")
      ) {
        return {
          success: false,
          error: "Invalid command format",
          code: "PARSE_ERROR",
          durationMs: Date.now() - startTime,
        };
      }

      // 2. Resolve command from registry
      const command = this.registry.lookup(quickParse.commandName);
      if (!command) {
        return {
          success: false,
          error: `Unknown command: /${quickParse.commandName}`,
          code: "COMMAND_NOT_FOUND",
          durationMs: Date.now() - startTime,
        };
      }

      // 3. Check if command is enabled
      if (!command.enabled) {
        return {
          success: false,
          error: `Command /${command.qualifiedName} is currently disabled`,
          code: "COMMAND_DISABLED",
          durationMs: Date.now() - startTime,
        };
      }

      // 4. Permission checks
      const permCheck = this.checkPermissions(command, {
        userRole: context.userRole,
        channelType: context.channelType,
        grantedScopes: context.grantedScopes,
      });
      if (!permCheck.allowed) {
        return {
          success: false,
          error: permCheck.reason || "Permission denied",
          code: permCheck.code || "PERMISSION_DENIED",
          durationMs: Date.now() - startTime,
        };
      }

      // 5. Rate limit check (per user)
      const userRateKey = `user:${context.userId}`;
      if (!this.userRateLimiter.check(userRateKey)) {
        return {
          success: false,
          error:
            "Rate limit exceeded. Please wait before running more commands.",
          code: "RATE_LIMITED",
          durationMs: Date.now() - startTime,
        };
      }

      // Rate limit check (per app, if applicable)
      if (command.appId) {
        const appRateKey = `app:${command.appId}`;
        if (!this.appRateLimiter.check(appRateKey)) {
          return {
            success: false,
            error: `Rate limit exceeded for app "${command.appId}"`,
            code: "APP_RATE_LIMITED",
            durationMs: Date.now() - startTime,
          };
        }
      }

      // 6. Parse arguments against command schema
      const parsed = parseInput(input, command);
      if (!parsed.success) {
        const errorMessages = parsed.errors.map((e) => e.message).join("; ");
        return {
          success: false,
          error: `Invalid arguments: ${errorMessages}`,
          code: "VALIDATION_ERROR",
          durationMs: Date.now() - startTime,
        };
      }

      // 7. Build execution context (sandboxed)
      const execContext: CommandExecutionContext = {
        userId: context.userId,
        username: context.username,
        userRole: context.userRole,
        channelId: context.channelId,
        channelType: context.channelType,
        appId: command.appId || undefined,
        grantedScopes: context.grantedScopes
          ? expandScopes(context.grantedScopes)
          : [],
        args: parsed.args,
        rawInput: parsed.rawInput,
        timestamp: new Date(),
      };

      // 8. Execute with timeout
      const handlerResult = await this.executeWithTimeout(
        command.handler,
        execContext,
        this.config.executionTimeoutMs,
      );

      return {
        success: handlerResult.success,
        handlerResult,
        error: handlerResult.error,
        code: handlerResult.success ? undefined : "HANDLER_ERROR",
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unexpected execution error",
        code: "EXECUTION_ERROR",
        durationMs: Date.now() - startTime,
      };
    }
  }

  // ==========================================================================
  // PERMISSION CHECKING
  // ==========================================================================

  /**
   * Check all permissions for a command invocation.
   */
  checkPermissions(
    command: PluginCommand,
    context: {
      userRole: UserRole;
      channelType: ChannelType;
      grantedScopes?: AppScope[];
    },
  ): PermissionCheckResult {
    // Check role
    if (!meetsRoleRequirement(context.userRole, command.requiredRole)) {
      return {
        allowed: false,
        reason: `This command requires ${command.requiredRole} role or higher`,
        code: "ROLE_INSUFFICIENT",
      };
    }

    // Check channel type
    if (!command.allowedChannelTypes.includes(context.channelType)) {
      return {
        allowed: false,
        reason: `This command cannot be used in ${context.channelType} channels`,
        code: "CHANNEL_DENIED",
      };
    }

    // Check app scopes (for app commands)
    if (command.appId && command.requiredScopes.length > 0) {
      const granted = context.grantedScopes
        ? expandScopes(context.grantedScopes)
        : [];
      if (!hasAllScopes(granted, command.requiredScopes)) {
        return {
          allowed: false,
          reason: `Insufficient app scopes. Required: ${command.requiredScopes.join(", ")}`,
          code: "SCOPE_INSUFFICIENT",
        };
      }
    }

    return { allowed: true };
  }

  // ==========================================================================
  // TIMEOUT WRAPPER
  // ==========================================================================

  private async executeWithTimeout(
    handler: (ctx: CommandExecutionContext) => Promise<CommandHandlerResult>,
    ctx: CommandExecutionContext,
    timeoutMs: number,
  ): Promise<CommandHandlerResult> {
    return new Promise<CommandHandlerResult>((resolve) => {
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        resolve({
          success: false,
          error: `Command execution timed out after ${timeoutMs}ms`,
        });
      }, timeoutMs);

      handler(ctx)
        .then((result) => {
          if (!timedOut) {
            clearTimeout(timer);
            resolve(result);
          }
        })
        .catch((error) => {
          if (!timedOut) {
            clearTimeout(timer);
            resolve({
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Handler execution failed",
            });
          }
        });
    });
  }

  // ==========================================================================
  // RATE LIMITER ACCESS
  // ==========================================================================

  /**
   * Get remaining rate limit for a user.
   */
  getUserRateRemaining(userId: string): number {
    return this.userRateLimiter.remaining(`user:${userId}`);
  }

  /**
   * Get remaining rate limit for an app.
   */
  getAppRateRemaining(appId: string): number {
    return this.appRateLimiter.remaining(`app:${appId}`);
  }

  /**
   * Reset rate limit for a user.
   */
  resetUserRate(userId: string): void {
    this.userRateLimiter.reset(`user:${userId}`);
  }

  /**
   * Reset rate limit for an app.
   */
  resetAppRate(appId: string): void {
    this.appRateLimiter.reset(`app:${appId}`);
  }

  /**
   * Clear all rate limits.
   */
  clearRateLimits(): void {
    this.userRateLimiter.clear();
    this.appRateLimiter.clear();
  }
}
