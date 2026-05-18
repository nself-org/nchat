/**
 * Command Builder
 *
 * Fluent API for building custom slash commands
 */

import type {
  SlashCommand,
  CommandArgument,
  CommandArgType,
  CommandCategory,
  CommandPermissions,
  CommandChannelConfig,
  CommandResponseConfig,
  CommandResponseType,
  CommandWebhook,
  CommandWorkflow,
  CommandAction,
  CommandActionType,
  CommandChoice,
  ArgumentValidation,
  AutocompleteConfig,
  CommandDraft,
} from "./command-types";

// ============================================================================
// Command Builder Class
// ============================================================================

export class CommandBuilder {
  private command: CommandDraft;

  constructor(trigger: string) {
    this.command = {
      trigger: trigger.toLowerCase().replace(/^\//, ""),
      arguments: [],
      permissions: {
        minRole: "member",
        allowGuests: false,
      },
      channels: {
        allowedTypes: ["public", "private", "direct", "group"],
        allowInThreads: true,
      },
      responseConfig: {
        type: "ephemeral",
        ephemeral: true,
        showTyping: false,
      },
      actionType: "message",
      action: {
        type: "message",
      },
      isEnabled: true,
      isBuiltIn: false,
    };
  }

  // --------------------------------
  // Basic Information
  // --------------------------------

  /**
   * Set command ID (optional - will be generated if not provided)
   */
  id(id: string): this {
    this.command.id = id;
    return this;
  }

  /**
   * Set command name
   */
  name(name: string): this {
    this.command.name = name;
    return this;
  }

  /**
   * Set command description
   */
  description(description: string): this {
    this.command.description = description;
    return this;
  }

  /**
   * Set detailed help text
   */
  helpText(helpText: string): this {
    this.command.helpText = helpText;
    return this;
  }

  /**
   * Set usage example
   */
  usage(usage: string): this {
    this.command.usage = usage;
    return this;
  }

  /**
   * Add command aliases
   */
  aliases(...aliases: string[]): this {
    this.command.aliases = aliases.map((a) =>
      a.toLowerCase().replace(/^\//, ""),
    );
    return this;
  }

  /**
   * Set command category
   */
  category(category: CommandCategory): this {
    this.command.category = category;
    return this;
  }

  /**
   * Set command icon
   */
  icon(icon: string): this {
    this.command.icon = icon;
    return this;
  }

  /**
   * Set display order
   */
  order(order: number): this {
    this.command.order = order;
    return this;
  }

  /**
   * Set cooldown in seconds
   */
  cooldown(seconds: number): this {
    this.command.cooldown = seconds;
    return this;
  }

  /**
   * Enable/disable command
   */
  enabled(enabled: boolean): this {
    this.command.isEnabled = enabled;
    return this;
  }

  // --------------------------------
  // Arguments
  // --------------------------------

  /**
   * Add a positional argument
   */
  addArgument(config: {
    name: string;
    type: CommandArgType;
    description: string;
    required?: boolean;
    defaultValue?: string | number | boolean;
    choices?: CommandChoice[];
    validation?: ArgumentValidation;
    autocomplete?: AutocompleteConfig;
  }): this {
    const position =
      this.command.arguments?.filter((a) => a.position !== undefined).length ??
      0;

    const arg: CommandArgument = {
      id: config.name.toLowerCase().replace(/\s+/g, "_"),
      name: config.name,
      type: config.type,
      description: config.description,
      required: config.required ?? false,
      position,
      defaultValue: config.defaultValue,
      choices: config.choices,
      validation: config.validation,
      autocomplete: config.autocomplete,
    };

    this.command.arguments = [...(this.command.arguments || []), arg];
    return this;
  }

  /**
   * Add a string argument
   */
  addStringArg(
    name: string,
    description: string,
    options?: {
      required?: boolean;
      default?: string;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    },
  ): this {
    return this.addArgument({
      name,
      type: "string",
      description,
      required: options?.required,
      defaultValue: options?.default,
      validation: {
        minLength: options?.minLength,
        maxLength: options?.maxLength,
        pattern: options?.pattern,
      },
    });
  }

  /**
   * Add a number argument
   */
  addNumberArg(
    name: string,
    description: string,
    options?: {
      required?: boolean;
      default?: number;
      min?: number;
      max?: number;
    },
  ): this {
    return this.addArgument({
      name,
      type: "number",
      description,
      required: options?.required,
      defaultValue: options?.default,
      validation: {
        min: options?.min,
        max: options?.max,
      },
    });
  }

  /**
   * Add a user mention argument
   */
  addUserArg(name: string, description: string, required = true): this {
    return this.addArgument({
      name,
      type: "user",
      description,
      required,
      autocomplete: {
        source: "users",
        minChars: 1,
      },
    });
  }

  /**
   * Add a channel mention argument
   */
  addChannelArg(name: string, description: string, required = true): this {
    return this.addArgument({
      name,
      type: "channel",
      description,
      required,
      autocomplete: {
        source: "channels",
        minChars: 1,
      },
    });
  }

  /**
   * Add a choice argument
   */
  addChoiceArg(
    name: string,
    description: string,
    choices: (
      | string
      | { value: string; label: string; description?: string }
    )[],
    options?: {
      required?: boolean;
      default?: string;
    },
  ): this {
    const normalizedChoices: CommandChoice[] = choices.map((c) =>
      typeof c === "string" ? { value: c, label: c } : c,
    );

    return this.addArgument({
      name,
      type: "choice",
      description,
      required: options?.required,
      defaultValue: options?.default,
      choices: normalizedChoices,
    });
  }

  /**
   * Add a duration argument
   */
  addDurationArg(name: string, description: string, required = false): this {
    return this.addArgument({
      name,
      type: "duration",
      description,
      required,
    });
  }

  /**
   * Add a "rest" argument that captures remaining text
   */
  addRestArg(name: string, description: string, required = false): this {
    return this.addArgument({
      name,
      type: "rest",
      description,
      required,
    });
  }

  /**
   * Add a flag argument (--flag value)
   */
  addFlag(config: {
    name: string;
    flag: string;
    shortFlag?: string;
    type: CommandArgType;
    description: string;
    required?: boolean;
    defaultValue?: string | number | boolean;
  }): this {
    const arg: CommandArgument = {
      id: config.flag,
      name: config.name,
      type: config.type,
      description: config.description,
      required: config.required ?? false,
      flag: config.flag,
      shortFlag: config.shortFlag,
      defaultValue: config.defaultValue,
    };

    this.command.arguments = [...(this.command.arguments || []), arg];
    return this;
  }

  // --------------------------------
  // Permissions
  // --------------------------------

  /**
   * Set minimum required role
   */
  minRole(role: "owner" | "admin" | "moderator" | "member" | "guest"): this {
    this.command.permissions = {
      ...this.command.permissions!,
      minRole: role,
    };
    return this;
  }

  /**
   * Allow specific roles
   */
  allowRoles(...roles: string[]): this {
    this.command.permissions = {
      ...this.command.permissions!,
      allowedRoles: roles,
    };
    return this;
  }

  /**
   * Allow specific users
   */
  allowUsers(...userIds: string[]): this {
    this.command.permissions = {
      ...this.command.permissions!,
      allowedUsers: userIds,
    };
    return this;
  }

  /**
   * Deny specific users
   */
  denyUsers(...userIds: string[]): this {
    this.command.permissions = {
      ...this.command.permissions!,
      deniedUsers: userIds,
    };
    return this;
  }

  /**
   * Allow guests to use command
   */
  allowGuests(allow = true): this {
    this.command.permissions = {
      ...this.command.permissions!,
      allowGuests: allow,
    };
    return this;
  }

  /**
   * Set full permissions config
   */
  permissions(permissions: Partial<CommandPermissions>): this {
    this.command.permissions = {
      ...this.command.permissions!,
      ...permissions,
    };
    return this;
  }

  // --------------------------------
  // Channel Configuration
  // --------------------------------

  /**
   * Allow in specific channel types
   */
  allowInChannelTypes(
    ...types: ("public" | "private" | "direct" | "group")[]
  ): this {
    this.command.channels = {
      ...this.command.channels!,
      allowedTypes: types,
    };
    return this;
  }

  /**
   * Allow in specific channels only
   */
  allowInChannels(...channelIds: string[]): this {
    this.command.channels = {
      ...this.command.channels!,
      allowedChannels: channelIds,
    };
    return this;
  }

  /**
   * Block in specific channels
   */
  blockInChannels(...channelIds: string[]): this {
    this.command.channels = {
      ...this.command.channels!,
      blockedChannels: channelIds,
    };
    return this;
  }

  /**
   * Allow/disallow in threads
   */
  allowInThreads(allow = true): this {
    this.command.channels = {
      ...this.command.channels!,
      allowInThreads: allow,
    };
    return this;
  }

  /**
   * Set full channel config
   */
  channels(config: Partial<CommandChannelConfig>): this {
    this.command.channels = {
      ...this.command.channels!,
      ...config,
    };
    return this;
  }

  // --------------------------------
  // Response Configuration
  // --------------------------------

  /**
   * Set response type
   */
  responseType(type: CommandResponseType): this {
    this.command.responseConfig = {
      ...this.command.responseConfig!,
      type,
    };
    return this;
  }

  /**
   * Set response template
   */
  responseTemplate(template: string): this {
    this.command.responseConfig = {
      ...this.command.responseConfig!,
      template,
    };
    return this;
  }

  /**
   * Make response ephemeral (only visible to user)
   */
  ephemeral(isEphemeral = true): this {
    this.command.responseConfig = {
      ...this.command.responseConfig!,
      ephemeral: isEphemeral,
    };
    return this;
  }

  /**
   * Show typing indicator while processing
   */
  showTyping(show = true): this {
    this.command.responseConfig = {
      ...this.command.responseConfig!,
      showTyping: show,
    };
    return this;
  }

  /**
   * Set response delay
   */
  responseDelay(ms: number): this {
    this.command.responseConfig = {
      ...this.command.responseConfig!,
      delay: ms,
    };
    return this;
  }

  /**
   * Set full response config
   */
  response(config: Partial<CommandResponseConfig>): this {
    this.command.responseConfig = {
      ...this.command.responseConfig!,
      ...config,
    };
    return this;
  }

  // --------------------------------
  // Actions
  // --------------------------------

  /**
   * Set action to send a message
   */
  sendMessage(message: string): this {
    this.command.actionType = "message";
    this.command.action = {
      type: "message",
      message,
    };
    this.command.responseConfig = {
      ...this.command.responseConfig!,
      type: "message",
      ephemeral: false,
    };
    return this;
  }

  /**
   * Set action to update user status
   */
  updateStatus(status: {
    text: string;
    emoji?: string;
    expiry?: string;
  }): this {
    this.command.actionType = "status";
    this.command.action = {
      type: "status",
      status,
    };
    return this;
  }

  /**
   * Set action to navigate
   */
  navigate(url: string, newTab = false): this {
    this.command.actionType = "navigate";
    this.command.action = {
      type: "navigate",
      navigate: { url, newTab },
    };
    return this;
  }

  /**
   * Set action to open a modal
   */
  openModal(component: string, props?: Record<string, unknown>): this {
    this.command.actionType = "modal";
    this.command.action = {
      type: "modal",
      modal: { component, props },
    };
    return this;
  }

  /**
   * Set action to call an API
   */
  callApi(
    endpoint: string,
    method = "POST",
    body?: Record<string, unknown>,
  ): this {
    this.command.actionType = "api";
    this.command.action = {
      type: "api",
      api: { endpoint, method, body },
    };
    return this;
  }

  /**
   * Set action to call a webhook
   */
  callWebhook(config: CommandWebhook): this {
    this.command.actionType = "webhook";
    this.command.webhook = config;
    this.command.action = {
      type: "webhook",
    };
    return this;
  }

  /**
   * Set action to trigger a workflow
   */
  triggerWorkflow(config: CommandWorkflow): this {
    this.command.actionType = "workflow";
    this.command.workflow = config;
    this.command.action = {
      type: "workflow",
    };
    return this;
  }

  /**
   * Set full action config
   */
  action(type: CommandActionType, action: CommandAction): this {
    this.command.actionType = type;
    this.command.action = action;
    return this;
  }

  // --------------------------------
  // Build
  // --------------------------------

  /**
   * Get the command draft (for validation before building)
   */
  getDraft(): CommandDraft {
    return { ...this.command };
  }

  /**
   * Build the final command
   */
  build(createdBy: string): SlashCommand {
    const now = new Date().toISOString();

    // Generate ID if not provided
    const id =
      this.command.id || `custom-${this.command.trigger}-${Date.now()}`;

    // Generate usage if not provided
    const usage = this.command.usage || generateUsage(this.command);

    return {
      ...this.command,
      id,
      trigger: this.command.trigger,
      name: this.command.name || this.command.trigger,
      description: this.command.description || "",
      category: this.command.category || "custom",
      arguments: this.command.arguments || [],
      permissions: this.command.permissions!,
      channels: this.command.channels!,
      responseConfig: this.command.responseConfig!,
      actionType: this.command.actionType!,
      action: this.command.action!,
      isEnabled: this.command.isEnabled ?? true,
      isBuiltIn: false,
      usage,
      createdAt: now,
      updatedAt: now,
      createdBy,
    } as SlashCommand;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate usage string from command arguments
 */
function generateUsage(command: CommandDraft): string {
  let usage = `/${command.trigger}`;

  const positionalArgs = command.arguments
    ?.filter((a) => a.position !== undefined)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  if (positionalArgs) {
    for (const arg of positionalArgs) {
      if (arg.required) {
        usage += ` <${arg.name}>`;
      } else {
        usage += ` [${arg.name}]`;
      }
    }
  }

  const flags = command.arguments?.filter((a) => a.flag);
  if (flags && flags.length > 0) {
    for (const flag of flags) {
      if (flag.required) {
        usage += ` --${flag.flag} <${flag.name}>`;
      } else {
        usage += ` [--${flag.flag} ${flag.name}]`;
      }
    }
  }

  return usage;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new command builder
 */
export function createCommand(trigger: string): CommandBuilder {
  return new CommandBuilder(trigger);
}

// ============================================================================
// Presets
// ============================================================================

/**
 * Create a simple message command
 */
export function createMessageCommand(
  trigger: string,
  message: string,
  description: string,
): CommandBuilder {
  return createCommand(trigger)
    .description(description)
    .sendMessage(message)
    .category("custom");
}

/**
 * Create a webhook command
 */
export function createWebhookCommand(
  trigger: string,
  webhookUrl: string,
  description: string,
): CommandBuilder {
  return createCommand(trigger)
    .description(description)
    .callWebhook({
      url: webhookUrl,
      method: "POST",
    })
    .category("integration");
}

/**
 * Create a navigation command
 */
export function createNavigationCommand(
  trigger: string,
  url: string,
  description: string,
): CommandBuilder {
  return createCommand(trigger)
    .description(description)
    .navigate(url)
    .category("utility");
}
