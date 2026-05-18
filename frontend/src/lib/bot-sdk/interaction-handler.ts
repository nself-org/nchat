/**
 * Interaction Handler
 * Handle button clicks, form submissions, and callback routing
 */

import type {
  Interaction,
  InteractionType,
  InteractionHandler,
  InteractionResponse,
  ButtonClickInteraction,
  FormSubmitInteraction,
  SelectChangeInteraction,
  MessageActionInteraction,
  RichMessage,
  UserId,
  ChannelId,
  MessageId,
  BotId,
} from "./types";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface HandlerRegistration<T extends Interaction = Interaction> {
  pattern: string | RegExp;
  handler: InteractionHandler<T>;
  type?: InteractionType;
}

export interface MiddlewareContext {
  interaction: Interaction;
  response?: InteractionResponse;
  metadata: Record<string, unknown>;
  aborted: boolean;
}

export type InteractionMiddleware = (
  ctx: MiddlewareContext,
  next: () => Promise<void>,
) => Promise<void>;

export interface InteractionRouterConfig {
  defaultResponse?: InteractionResponse;
  errorHandler?: (
    error: Error,
    interaction: Interaction,
  ) => Promise<InteractionResponse | void>;
  timeout?: number;
}

// ============================================================================
// INTERACTION ROUTER
// ============================================================================

/**
 * Router for handling bot interactions
 */
export class InteractionRouter {
  private handlers: Map<string, HandlerRegistration[]> = new Map();
  private patternHandlers: HandlerRegistration[] = [];
  private middleware: InteractionMiddleware[] = [];
  private config: InteractionRouterConfig;

  constructor(config: InteractionRouterConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 30000,
      ...config,
    };
  }

  // ==========================================================================
  // HANDLER REGISTRATION
  // ==========================================================================

  /**
   * Register a handler for an action ID
   */
  on(actionId: string, handler: InteractionHandler): this {
    if (!this.handlers.has(actionId)) {
      this.handlers.set(actionId, []);
    }
    this.handlers.get(actionId)!.push({ pattern: actionId, handler });
    return this;
  }

  /**
   * Register a handler for button clicks
   */
  onButton(
    actionId: string | RegExp,
    handler: InteractionHandler<ButtonClickInteraction>,
  ): this {
    return this.registerTypedHandler("button_click", actionId, handler);
  }

  /**
   * Register a handler for form submissions
   */
  onFormSubmit(
    formId: string | RegExp,
    handler: InteractionHandler<FormSubmitInteraction>,
  ): this {
    return this.registerTypedHandler("form_submit", formId, handler);
  }

  /**
   * Register a handler for select changes
   */
  onSelectChange(
    actionId: string | RegExp,
    handler: InteractionHandler<SelectChangeInteraction>,
  ): this {
    return this.registerTypedHandler("select_change", actionId, handler);
  }

  /**
   * Register a handler for message actions
   */
  onMessageAction(
    actionId: string | RegExp,
    handler: InteractionHandler<MessageActionInteraction>,
  ): this {
    return this.registerTypedHandler("message_action", actionId, handler);
  }

  /**
   * Register a pattern-based handler
   */
  onPattern(
    pattern: RegExp,
    handler: InteractionHandler,
    type?: InteractionType,
  ): this {
    this.patternHandlers.push({ pattern, handler, type });
    return this;
  }

  /**
   * Register middleware
   */
  use(middleware: InteractionMiddleware): this {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Remove a handler
   */
  off(actionId: string): boolean {
    return this.handlers.delete(actionId);
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.patternHandlers = [];
  }

  // ==========================================================================
  // ROUTING
  // ==========================================================================

  /**
   * Route an interaction to the appropriate handler
   */
  async route(interaction: Interaction): Promise<InteractionResponse | void> {
    // Create middleware context
    const ctx: MiddlewareContext = {
      interaction,
      metadata: {},
      aborted: false,
    };

    // Run middleware chain
    try {
      await this.runMiddleware(ctx);

      if (ctx.aborted) {
        return ctx.response;
      }

      // Get action ID based on interaction type
      const actionId = this.getActionId(interaction);

      // Find matching handlers
      const handlers = this.findHandlers(actionId, interaction.type);

      if (handlers.length === 0) {
        return this.config.defaultResponse;
      }

      // Execute handlers
      for (const registration of handlers) {
        const result = await this.executeWithTimeout(
          registration.handler(interaction),
          this.config.timeout!,
        );

        if (result) {
          return result;
        }
      }

      return ctx.response ?? this.config.defaultResponse;
    } catch (error) {
      logger.error("[InteractionRouter] Error handling interaction:", error);

      if (this.config.errorHandler) {
        return this.config.errorHandler(error as Error, interaction);
      }

      return {
        type: "ephemeral",
        message: { text: "An error occurred while processing your action." },
      };
    }
  }

  /**
   * Check if a handler exists for an action
   */
  hasHandler(actionId: string, type?: InteractionType): boolean {
    return this.findHandlers(actionId, type).length > 0;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private registerTypedHandler<T extends Interaction>(
    type: InteractionType,
    actionIdOrPattern: string | RegExp,
    handler: InteractionHandler<T>,
  ): this {
    if (typeof actionIdOrPattern === "string") {
      if (!this.handlers.has(actionIdOrPattern)) {
        this.handlers.set(actionIdOrPattern, []);
      }
      this.handlers.get(actionIdOrPattern)!.push({
        pattern: actionIdOrPattern,
        handler: handler as InteractionHandler,
        type,
      });
    } else {
      this.patternHandlers.push({
        pattern: actionIdOrPattern,
        handler: handler as InteractionHandler,
        type,
      });
    }
    return this;
  }

  private getActionId(interaction: Interaction): string {
    switch (interaction.type) {
      case "button_click":
        return (interaction as ButtonClickInteraction).actionId;
      case "form_submit":
        return (interaction as FormSubmitInteraction).formId;
      case "select_change":
        return (interaction as SelectChangeInteraction).actionId;
      case "message_action":
        return (interaction as MessageActionInteraction).actionId;
      default:
        return "";
    }
  }

  private findHandlers(
    actionId: string,
    type?: InteractionType,
  ): HandlerRegistration[] {
    const result: HandlerRegistration[] = [];

    // Check exact matches
    const exactHandlers = this.handlers.get(actionId) ?? [];
    for (const handler of exactHandlers) {
      if (!handler.type || handler.type === type) {
        result.push(handler);
      }
    }

    // Check pattern matches
    for (const registration of this.patternHandlers) {
      if (registration.type && registration.type !== type) {
        continue;
      }

      if (registration.pattern instanceof RegExp) {
        if (registration.pattern.test(actionId)) {
          result.push(registration);
        }
      }
    }

    return result;
  }

  private async runMiddleware(ctx: MiddlewareContext): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (ctx.aborted || index >= this.middleware.length) {
        return;
      }

      const currentMiddleware = this.middleware[index++];
      await currentMiddleware(ctx, next);
    };

    await next();
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number,
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Interaction handler timed out after ${timeout}ms`));
      }, timeout);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }
}

// ============================================================================
// INTERACTION BUILDER
// ============================================================================

/**
 * Builder for creating test interactions
 */
export class InteractionBuilder {
  private base: Partial<Interaction> = {
    id: `interaction_${Date.now()}`,
    timestamp: new Date(),
  };

  userId(id: UserId): this {
    this.base.userId = id;
    return this;
  }

  channelId(id: ChannelId): this {
    this.base.channelId = id;
    return this;
  }

  messageId(id: MessageId): this {
    this.base.messageId = id;
    return this;
  }

  botId(id: BotId): this {
    this.base.botId = id;
    return this;
  }

  buttonClick(
    actionId: string,
    value?: string,
    blockId?: string,
  ): ButtonClickInteraction {
    return {
      ...this.base,
      type: "button_click",
      actionId,
      value,
      blockId,
    } as ButtonClickInteraction;
  }

  formSubmit(
    formId: string,
    fields: FormSubmitInteraction["fields"],
  ): FormSubmitInteraction {
    return {
      ...this.base,
      type: "form_submit",
      formId,
      fields,
    } as FormSubmitInteraction;
  }

  selectChange(
    actionId: string,
    selectedOptions: SelectChangeInteraction["selectedOptions"],
    blockId?: string,
  ): SelectChangeInteraction {
    return {
      ...this.base,
      type: "select_change",
      actionId,
      selectedOptions,
      blockId,
    } as SelectChangeInteraction;
  }

  messageAction(
    actionId: string,
    messageText?: string,
    messageTs?: string,
  ): MessageActionInteraction {
    return {
      ...this.base,
      type: "message_action",
      actionId,
      messageText,
      messageTs,
    } as MessageActionInteraction;
  }
}

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

/**
 * Create an update response (update the original message)
 */
export function updateResponse(message: RichMessage): InteractionResponse {
  return { type: "update", message };
}

/**
 * Create a replace response (replace the original message)
 */
export function replaceResponse(message: RichMessage): InteractionResponse {
  return { type: "replace", message };
}

/**
 * Create an ephemeral response (only visible to the user)
 */
export function ephemeralResponse(
  message: RichMessage | string,
): InteractionResponse {
  return {
    type: "ephemeral",
    message: typeof message === "string" ? { text: message } : message,
  };
}

/**
 * Create a modal response
 */
export function modalResponse(message: RichMessage): InteractionResponse {
  return { type: "modal", message };
}

/**
 * Create a delete response (delete the original message)
 */
export function deleteResponse(): InteractionResponse {
  return { type: "update", deleteOriginal: true };
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new interaction router
 */
export function createInteractionRouter(
  config?: InteractionRouterConfig,
): InteractionRouter {
  return new InteractionRouter(config);
}

/**
 * Create an interaction builder
 */
export function interaction(): InteractionBuilder {
  return new InteractionBuilder();
}

// ============================================================================
// MIDDLEWARE FACTORIES
// ============================================================================

/**
 * Logging middleware
 */
export function loggingMiddleware(
  logger: (message: string, data?: unknown) => void = console.log,
): InteractionMiddleware {
  return async (ctx, next) => {
    const start = Date.now();
    logger(`[Interaction] Received: ${ctx.interaction.type}`, {
      id: ctx.interaction.id,
      userId: ctx.interaction.userId,
    });

    await next();

    const duration = Date.now() - start;
    logger(`[Interaction] Completed in ${duration}ms`, {
      id: ctx.interaction.id,
      hasResponse: !!ctx.response,
    });
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(
  maxRequests: number,
  windowMs: number,
): InteractionMiddleware {
  const requests = new Map<string, number[]>();

  return async (ctx, next) => {
    const userId = ctx.interaction.userId;
    const now = Date.now();

    // Get user's request times
    let userRequests = requests.get(userId) ?? [];

    // Clean old requests
    userRequests = userRequests.filter((time) => now - time < windowMs);

    if (userRequests.length >= maxRequests) {
      ctx.response = {
        type: "ephemeral",
        message: { text: "Too many requests. Please try again later." },
      };
      ctx.aborted = true;
      return;
    }

    userRequests.push(now);
    requests.set(userId, userRequests);

    await next();
  };
}

/**
 * Authorization middleware
 */
export function authMiddleware(
  isAuthorized: (
    userId: UserId,
    actionId: string,
  ) => boolean | Promise<boolean>,
): InteractionMiddleware {
  return async (ctx, next) => {
    const actionId =
      ctx.interaction.type === "button_click"
        ? (ctx.interaction as ButtonClickInteraction).actionId
        : ctx.interaction.type === "form_submit"
          ? (ctx.interaction as FormSubmitInteraction).formId
          : ctx.interaction.type === "select_change"
            ? (ctx.interaction as SelectChangeInteraction).actionId
            : (ctx.interaction as MessageActionInteraction).actionId;

    const authorized = await isAuthorized(ctx.interaction.userId, actionId);

    if (!authorized) {
      ctx.response = {
        type: "ephemeral",
        message: { text: "You are not authorized to perform this action." },
      };
      ctx.aborted = true;
      return;
    }

    await next();
  };
}

/**
 * Validation middleware
 */
export function validationMiddleware(
  validate: (
    interaction: Interaction,
  ) => string | null | Promise<string | null>,
): InteractionMiddleware {
  return async (ctx, next) => {
    const error = await validate(ctx.interaction);

    if (error) {
      ctx.response = {
        type: "ephemeral",
        message: { text: error },
      };
      ctx.aborted = true;
      return;
    }

    await next();
  };
}
