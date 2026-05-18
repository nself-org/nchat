/**
 * Bot Response Builders
 * Fluent API for building rich bot responses
 */

import type {
  BotResponse,
  MessageEmbed,
  MessageActionRow,
  MessageButton,
  MessageSelect,
  ResponseOptions,
  AttachmentData,
} from "./bot-types";

// ============================================================================
// RESPONSE BUILDER
// ============================================================================

/**
 * Fluent builder for bot responses
 */
export class ResponseBuilder {
  private response: BotResponse = {};

  /**
   * Set plain text content
   */
  text(content: string): this {
    this.response.content = content;
    return this;
  }

  /**
   * Append to existing content
   */
  append(content: string): this {
    this.response.content = (this.response.content || "") + content;
    return this;
  }

  /**
   * Add a line to content
   */
  line(content: string = ""): this {
    this.response.content = (this.response.content || "") + content + "\n";
    return this;
  }

  /**
   * Add an embed
   */
  embed(embed: MessageEmbed | EmbedBuilder): this {
    if (!this.response.embeds) {
      this.response.embeds = [];
    }
    this.response.embeds.push(
      embed instanceof EmbedBuilder ? embed.build() : embed,
    );
    return this;
  }

  /**
   * Add buttons
   */
  buttons(...buttons: (MessageButton | ButtonBuilder)[]): this {
    if (!this.response.actions) {
      this.response.actions = [];
    }
    this.response.actions.push({
      type: "buttons",
      components: buttons.map((b) =>
        b instanceof ButtonBuilder ? b.build() : b,
      ),
    });
    return this;
  }

  /**
   * Add a select menu
   */
  select(select: MessageSelect | SelectBuilder): this {
    if (!this.response.actions) {
      this.response.actions = [];
    }
    this.response.actions.push({
      type: "select",
      components: select instanceof SelectBuilder ? select.build() : select,
    });
    return this;
  }

  /**
   * Add an attachment
   */
  attachment(attachment: AttachmentData): this {
    if (!this.response.attachments) {
      this.response.attachments = [];
    }
    this.response.attachments.push(attachment);
    return this;
  }

  /**
   * Make the response ephemeral (only visible to the user)
   */
  ephemeral(): this {
    if (!this.response.options) {
      this.response.options = {};
    }
    this.response.options.ephemeral = true;
    return this;
  }

  /**
   * Reply to the triggering message
   */
  reply(): this {
    if (!this.response.options) {
      this.response.options = {};
    }
    this.response.options.reply = true;
    return this;
  }

  /**
   * Reply in a thread
   */
  thread(): this {
    if (!this.response.options) {
      this.response.options = {};
    }
    this.response.options.thread = true;
    return this;
  }

  /**
   * Mention the user
   */
  mention(): this {
    if (!this.response.options) {
      this.response.options = {};
    }
    this.response.options.mentionUser = true;
    return this;
  }

  /**
   * Send without notification
   */
  silent(): this {
    if (!this.response.options) {
      this.response.options = {};
    }
    this.response.options.silent = true;
    return this;
  }

  /**
   * Set response options
   */
  options(opts: ResponseOptions): this {
    this.response.options = { ...this.response.options, ...opts };
    return this;
  }

  /**
   * Build the response
   */
  build(): BotResponse {
    return { ...this.response };
  }
}

// ============================================================================
// EMBED BUILDER
// ============================================================================

/**
 * Fluent builder for message embeds
 */
export class EmbedBuilder {
  private embed: MessageEmbed = {};

  /**
   * Set the title
   */
  title(title: string): this {
    this.embed.title = title;
    return this;
  }

  /**
   * Set the description
   */
  description(description: string): this {
    this.embed.description = description;
    return this;
  }

  /**
   * Set the URL
   */
  url(url: string): this {
    this.embed.url = url;
    return this;
  }

  /**
   * Set the color (hex string)
   */
  color(color: string): this {
    this.embed.color = color;
    return this;
  }

  /**
   * Set the timestamp
   */
  timestamp(date: Date = new Date()): this {
    this.embed.timestamp = date;
    return this;
  }

  /**
   * Set the footer
   */
  footer(text: string, iconUrl?: string): this {
    this.embed.footer = { text, iconUrl };
    return this;
  }

  /**
   * Set the author
   */
  author(name: string, url?: string, iconUrl?: string): this {
    this.embed.author = { name, url, iconUrl };
    return this;
  }

  /**
   * Set the thumbnail
   */
  thumbnail(url: string): this {
    this.embed.thumbnail = { url };
    return this;
  }

  /**
   * Set the image
   */
  image(url: string): this {
    this.embed.image = { url };
    return this;
  }

  /**
   * Add a field
   */
  field(name: string, value: string, inline = false): this {
    if (!this.embed.fields) {
      this.embed.fields = [];
    }
    this.embed.fields.push({ name, value, inline });
    return this;
  }

  /**
   * Add multiple inline fields
   */
  inlineFields(...fields: { name: string; value: string }[]): this {
    for (const field of fields) {
      this.field(field.name, field.value, true);
    }
    return this;
  }

  /**
   * Add a blank field (spacer)
   */
  blank(inline = false): this {
    return this.field("\u200B", "\u200B", inline);
  }

  /**
   * Build the embed
   */
  build(): MessageEmbed {
    return { ...this.embed };
  }
}

// ============================================================================
// BUTTON BUILDER
// ============================================================================

/**
 * Fluent builder for message buttons
 */
export class ButtonBuilder {
  private button: MessageButton;

  constructor(id: string) {
    this.button = { id, label: "" };
  }

  /**
   * Set the label
   */
  label(label: string): this {
    this.button.label = label;
    return this;
  }

  /**
   * Set the style
   */
  style(style: "primary" | "secondary" | "success" | "danger"): this {
    this.button.style = style;
    return this;
  }

  /**
   * Primary style (default)
   */
  primary(): this {
    return this.style("primary");
  }

  /**
   * Secondary style
   */
  secondary(): this {
    return this.style("secondary");
  }

  /**
   * Success style (green)
   */
  success(): this {
    return this.style("success");
  }

  /**
   * Danger style (red)
   */
  danger(): this {
    return this.style("danger");
  }

  /**
   * Set an emoji
   */
  emoji(emoji: string): this {
    this.button.emoji = emoji;
    return this;
  }

  /**
   * Set a URL (makes it a link button)
   */
  url(url: string): this {
    this.button.url = url;
    return this;
  }

  /**
   * Disable the button
   */
  disabled(disabled = true): this {
    this.button.disabled = disabled;
    return this;
  }

  /**
   * Build the button
   */
  build(): MessageButton {
    return { ...this.button };
  }
}

// ============================================================================
// SELECT BUILDER
// ============================================================================

/**
 * Fluent builder for select menus
 */
export class SelectBuilder {
  private select: MessageSelect;

  constructor(id: string) {
    this.select = { id, options: [] };
  }

  /**
   * Set the placeholder text
   */
  placeholder(text: string): this {
    this.select.placeholder = text;
    return this;
  }

  /**
   * Add an option
   */
  option(
    label: string,
    value: string,
    description?: string,
    emoji?: string,
  ): this {
    this.select.options.push({ label, value, description, emoji });
    return this;
  }

  /**
   * Add multiple options
   */
  options(
    ...options: {
      label: string;
      value: string;
      description?: string;
      emoji?: string;
    }[]
  ): this {
    this.select.options.push(...options);
    return this;
  }

  /**
   * Set min values (for multi-select)
   */
  min(count: number): this {
    this.select.minValues = count;
    return this;
  }

  /**
   * Set max values (for multi-select)
   */
  max(count: number): this {
    this.select.maxValues = count;
    return this;
  }

  /**
   * Build the select
   */
  build(): MessageSelect {
    return { ...this.select };
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new response builder
 */
export function response(): ResponseBuilder {
  return new ResponseBuilder();
}

/**
 * Create a simple text response
 */
export function text(content: string): BotResponse {
  return { content };
}

/**
 * Create an embed builder
 */
export function embed(): EmbedBuilder {
  return new EmbedBuilder();
}

/**
 * Create a button builder
 */
export function button(id: string): ButtonBuilder {
  return new ButtonBuilder(id);
}

/**
 * Create a select builder
 */
export function select(id: string): SelectBuilder {
  return new SelectBuilder(id);
}

// ============================================================================
// QUICK RESPONSES
// ============================================================================

/**
 * Create an error response
 */
export function error(message: string, details?: string): BotResponse {
  return response()
    .embed(
      embed()
        .color("#EF4444")
        .title("Error")
        .description(message)
        .field("Details", details || "No additional details", false),
    )
    .ephemeral()
    .build();
}

/**
 * Create a success response
 */
export function success(message: string, details?: string): BotResponse {
  return response()
    .embed(
      embed()
        .color("#10B981")
        .title("Success")
        .description(message)
        .field("Details", details || "", false),
    )
    .build();
}

/**
 * Create an info response
 */
export function info(title: string, description: string): BotResponse {
  return response()
    .embed(embed().color("#3B82F6").title(title).description(description))
    .build();
}

/**
 * Create a warning response
 */
export function warning(message: string): BotResponse {
  return response()
    .embed(embed().color("#F59E0B").title("Warning").description(message))
    .build();
}

/**
 * Create a confirmation prompt with buttons
 */
export function confirm(
  message: string,
  confirmId: string,
  cancelId: string,
): BotResponse {
  return response()
    .text(message)
    .buttons(
      button(confirmId).label("Confirm").success(),
      button(cancelId).label("Cancel").secondary(),
    )
    .build();
}

/**
 * Create a list response
 */
export function list(title: string, items: string[]): BotResponse {
  const description = items.map((item, i) => `${i + 1}. ${item}`).join("\n");
  return response()
    .embed(embed().title(title).description(description))
    .build();
}

/**
 * Create a code block response
 */
export function code(content: string, language = ""): BotResponse {
  return response().text(`\`\`\`${language}\n${content}\n\`\`\``).build();
}

/**
 * Create a quote response
 */
export function quote(content: string, author?: string): BotResponse {
  let text = `> ${content.split("\n").join("\n> ")}`;
  if (author) {
    text += `\n> \n> -- *${author}*`;
  }
  return response().text(text).build();
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format text as bold
 */
export function bold(text: string): string {
  return `**${text}**`;
}

/**
 * Format text as italic
 */
export function italic(text: string): string {
  return `*${text}*`;
}

/**
 * Format text as strikethrough
 */
export function strikethrough(text: string): string {
  return `~~${text}~~`;
}

/**
 * Format text as inline code
 */
export function inlineCode(text: string): string {
  return `\`${text}\``;
}

/**
 * Format text as a code block
 */
export function codeBlock(text: string, language = ""): string {
  return `\`\`\`${language}\n${text}\n\`\`\``;
}

/**
 * Format text as a quote block
 */
export function blockQuote(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

/**
 * Format a user mention
 */
export function mentionUser(userId: string): string {
  return `<@${userId}>`;
}

/**
 * Format a channel mention
 */
export function mentionChannel(channelId: string): string {
  return `<#${channelId}>`;
}

/**
 * Format a role mention
 */
export function mentionRole(roleId: string): string {
  return `<@&${roleId}>`;
}

/**
 * Format a timestamp
 */
export function timestamp(
  date: Date,
  format: "short" | "long" | "relative" = "short",
): string {
  const unix = Math.floor(date.getTime() / 1000);
  const formatCodes: Record<string, string> = {
    short: "f",
    long: "F",
    relative: "R",
  };
  return `<t:${unix}:${formatCodes[format]}>`;
}

/**
 * Format a link
 */
export function link(text: string, url: string): string {
  return `[${text}](${url})`;
}

/**
 * Create a spoiler
 */
export function spoiler(text: string): string {
  return `||${text}||`;
}

/**
 * Create a horizontal rule / separator
 */
export function separator(): string {
  return "\n---\n";
}
