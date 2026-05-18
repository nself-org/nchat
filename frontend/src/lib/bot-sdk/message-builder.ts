/**
 * Rich Message Builder
 * Fluent API for building bot messages with blocks
 */

import type {
  Block,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  DividerBlock,
  ActionsBlock,
  ContextBlock,
  RichMessage,
} from "./types";

// ============================================================================
// BLOCK BUILDERS
// ============================================================================

/**
 * Builder for text blocks
 */
export class TextBlockBuilder {
  private block: TextBlock = {
    type: "text",
    text: "",
  };

  /**
   * Set the text content
   */
  text(text: string): this {
    this.block.text = text;
    return this;
  }

  /**
   * Enable markdown parsing
   */
  markdown(enabled = true): this {
    this.block.markdown = enabled;
    return this;
  }

  /**
   * Append text to existing content
   */
  append(text: string): this {
    this.block.text += text;
    return this;
  }

  /**
   * Add a new line
   */
  newLine(): this {
    this.block.text += "\n";
    return this;
  }

  /**
   * Build the text block
   */
  build(): TextBlock {
    return { ...this.block };
  }
}

/**
 * Builder for image blocks
 */
export class ImageBlockBuilder {
  private block: ImageBlock = {
    type: "image",
    url: "",
  };

  /**
   * Set the image URL
   */
  url(url: string): this {
    this.block.url = url;
    return this;
  }

  /**
   * Set alt text
   */
  alt(alt: string): this {
    this.block.alt = alt;
    return this;
  }

  /**
   * Set title
   */
  title(title: string): this {
    this.block.title = title;
    return this;
  }

  /**
   * Build the image block
   */
  build(): ImageBlock {
    return { ...this.block };
  }
}

/**
 * Builder for button blocks
 */
export class ButtonBlockBuilder {
  private block: ButtonBlock;

  constructor(actionId: string) {
    this.block = {
      type: "button",
      text: "",
      actionId,
    };
  }

  /**
   * Set button text
   */
  text(text: string): this {
    this.block.text = text;
    return this;
  }

  /**
   * Set button style to primary
   */
  primary(): this {
    this.block.style = "primary";
    return this;
  }

  /**
   * Set button style to danger
   */
  danger(): this {
    this.block.style = "danger";
    return this;
  }

  /**
   * Set button style to default
   */
  default(): this {
    this.block.style = "default";
    return this;
  }

  /**
   * Set button style
   */
  style(style: "primary" | "danger" | "default"): this {
    this.block.style = style;
    return this;
  }

  /**
   * Set URL (makes it a link button)
   */
  url(url: string): this {
    this.block.url = url;
    return this;
  }

  /**
   * Set value (passed to action handler)
   */
  value(value: string): this {
    this.block.value = value;
    return this;
  }

  /**
   * Disable the button
   */
  disabled(disabled = true): this {
    this.block.disabled = disabled;
    return this;
  }

  /**
   * Build the button block
   */
  build(): ButtonBlock {
    return { ...this.block };
  }
}

/**
 * Builder for actions blocks (group of buttons)
 */
export class ActionsBlockBuilder {
  private block: ActionsBlock = {
    type: "actions",
    elements: [],
  };

  /**
   * Add a button
   */
  button(button: ButtonBlock | ButtonBlockBuilder): this {
    const built =
      button instanceof ButtonBlockBuilder ? button.build() : button;
    this.block.elements.push(built);
    return this;
  }

  /**
   * Add multiple buttons
   */
  buttons(...buttons: (ButtonBlock | ButtonBlockBuilder)[]): this {
    for (const button of buttons) {
      this.button(button);
    }
    return this;
  }

  /**
   * Set block ID
   */
  blockId(id: string): this {
    this.block.blockId = id;
    return this;
  }

  /**
   * Build the actions block
   */
  build(): ActionsBlock {
    return {
      ...this.block,
      elements: [...this.block.elements],
    };
  }
}

/**
 * Builder for context blocks
 */
export class ContextBlockBuilder {
  private block: ContextBlock = {
    type: "context",
    elements: [],
  };

  /**
   * Add a text element
   */
  text(text: string, markdown = false): this {
    this.block.elements.push({
      type: "text",
      text,
      markdown,
    });
    return this;
  }

  /**
   * Add an image element
   */
  image(url: string, alt?: string): this {
    this.block.elements.push({
      type: "image",
      url,
      alt,
    });
    return this;
  }

  /**
   * Build the context block
   */
  build(): ContextBlock {
    return {
      ...this.block,
      elements: [...this.block.elements],
    };
  }
}

// ============================================================================
// MESSAGE BUILDER
// ============================================================================

/**
 * Fluent builder for rich messages
 */
export class MessageBuilder {
  private message: RichMessage = {};

  /**
   * Set plain text content
   */
  text(text: string): this {
    this.message.text = text;
    return this;
  }

  /**
   * Add a text block
   */
  textBlock(text: string, markdown = false): this {
    return this.addBlock({
      type: "text",
      text,
      markdown,
    });
  }

  /**
   * Add an image block
   */
  imageBlock(url: string, alt?: string, title?: string): this {
    return this.addBlock({
      type: "image",
      url,
      alt,
      title,
    });
  }

  /**
   * Add a button block
   */
  buttonBlock(
    actionId: string,
    text: string,
    style?: "primary" | "danger" | "default",
  ): this {
    return this.addBlock({
      type: "button",
      actionId,
      text,
      style,
    });
  }

  /**
   * Add a divider
   */
  divider(): this {
    return this.addBlock({ type: "divider" });
  }

  /**
   * Add an actions block with buttons
   */
  actions(...buttons: (ButtonBlock | ButtonBlockBuilder)[]): this {
    const elements = buttons.map((b) =>
      b instanceof ButtonBlockBuilder ? b.build() : b,
    );
    return this.addBlock({
      type: "actions",
      elements,
    });
  }

  /**
   * Add a context block
   */
  context(builder: ContextBlockBuilder | ContextBlock): this {
    const block =
      builder instanceof ContextBlockBuilder ? builder.build() : builder;
    return this.addBlock(block);
  }

  /**
   * Add a custom block
   */
  addBlock(block: Block): this {
    if (!this.message.blocks) {
      this.message.blocks = [];
    }
    this.message.blocks.push(block);
    return this;
  }

  /**
   * Add multiple blocks
   */
  addBlocks(...blocks: Block[]): this {
    for (const block of blocks) {
      this.addBlock(block);
    }
    return this;
  }

  /**
   * Set thread timestamp (for replying in thread)
   */
  threadTs(ts: string): this {
    this.message.threadTs = ts;
    return this;
  }

  /**
   * Also send to channel when replying in thread
   */
  replyBroadcast(broadcast = true): this {
    this.message.replyBroadcast = broadcast;
    return this;
  }

  /**
   * Enable/disable URL unfurling
   */
  unfurlLinks(unfurl = true): this {
    this.message.unfurlLinks = unfurl;
    return this;
  }

  /**
   * Enable/disable media unfurling
   */
  unfurlMedia(unfurl = true): this {
    this.message.unfurlMedia = unfurl;
    return this;
  }

  /**
   * Set metadata
   */
  metadata(data: Record<string, unknown>): this {
    this.message.metadata = data;
    return this;
  }

  /**
   * Build the message
   */
  build(): RichMessage {
    return {
      ...this.message,
      blocks: this.message.blocks ? [...this.message.blocks] : undefined,
      metadata: this.message.metadata
        ? { ...this.message.metadata }
        : undefined,
    };
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new message builder
 */
export function message(): MessageBuilder {
  return new MessageBuilder();
}

/**
 * Create a simple text message
 */
export function textMessage(text: string): RichMessage {
  return { text };
}

/**
 * Create a text block builder
 */
export function textBlock(): TextBlockBuilder {
  return new TextBlockBuilder();
}

/**
 * Create a text block directly
 */
export function createTextBlock(text: string, markdown = false): TextBlock {
  return { type: "text", text, markdown };
}

/**
 * Create an image block builder
 */
export function imageBlock(): ImageBlockBuilder {
  return new ImageBlockBuilder();
}

/**
 * Create an image block directly
 */
export function createImageBlock(
  url: string,
  alt?: string,
  title?: string,
): ImageBlock {
  return { type: "image", url, alt, title };
}

/**
 * Create a button block builder
 */
export function button(actionId: string): ButtonBlockBuilder {
  return new ButtonBlockBuilder(actionId);
}

/**
 * Create a button block directly
 */
export function createButton(
  actionId: string,
  text: string,
  style: "primary" | "danger" | "default" = "default",
): ButtonBlock {
  return { type: "button", actionId, text, style };
}

/**
 * Create an actions block builder
 */
export function actions(): ActionsBlockBuilder {
  return new ActionsBlockBuilder();
}

/**
 * Create a context block builder
 */
export function context(): ContextBlockBuilder {
  return new ContextBlockBuilder();
}

/**
 * Create a divider block
 */
export function divider(): DividerBlock {
  return { type: "divider" };
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format text as bold (markdown)
 */
export function bold(text: string): string {
  return `**${text}**`;
}

/**
 * Format text as italic (markdown)
 */
export function italic(text: string): string {
  return `*${text}*`;
}

/**
 * Format text as strikethrough (markdown)
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
 * Format text as code block
 */
export function codeBlock(code: string, language = ""): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

/**
 * Format text as blockquote
 */
export function blockquote(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

/**
 * Create a user mention
 */
export function mentionUser(userId: string): string {
  return `<@${userId}>`;
}

/**
 * Create a channel mention
 */
export function mentionChannel(channelId: string): string {
  return `<#${channelId}>`;
}

/**
 * Create a link
 */
export function link(text: string, url: string): string {
  return `[${text}](${url})`;
}

/**
 * Create an unordered list
 */
export function unorderedList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

/**
 * Create an ordered list
 */
export function orderedList(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
}

/**
 * Join lines with newlines
 */
export function lines(...parts: string[]): string {
  return parts.join("\n");
}

// ============================================================================
// TEMPLATE MESSAGES
// ============================================================================

/**
 * Create a success message
 */
export function successMessage(
  title: string,
  description?: string,
): RichMessage {
  return message()
    .textBlock(`**${title}**`, true)
    .textBlock(description ?? "", true)
    .build();
}

/**
 * Create an error message
 */
export function errorMessage(title: string, details?: string): RichMessage {
  return message()
    .textBlock(`**Error: ${title}**`, true)
    .textBlock(details ?? "", true)
    .build();
}

/**
 * Create a warning message
 */
export function warningMessage(
  title: string,
  description?: string,
): RichMessage {
  return message()
    .textBlock(`**Warning: ${title}**`, true)
    .textBlock(description ?? "", true)
    .build();
}

/**
 * Create an info message
 */
export function infoMessage(title: string, description?: string): RichMessage {
  return message()
    .textBlock(`**${title}**`, true)
    .textBlock(description ?? "", true)
    .build();
}

/**
 * Create a confirmation prompt
 */
export function confirmPrompt(
  question: string,
  confirmActionId: string,
  cancelActionId: string,
): RichMessage {
  return message()
    .textBlock(question)
    .actions(
      button(confirmActionId).text("Confirm").primary(),
      button(cancelActionId).text("Cancel").default(),
    )
    .build();
}

/**
 * Create a loading message
 */
export function loadingMessage(text = "Loading..."): RichMessage {
  return message().textBlock(text).build();
}
