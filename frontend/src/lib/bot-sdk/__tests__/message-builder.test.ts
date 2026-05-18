/**
 * Message Builder Tests
 * Comprehensive tests for rich message building with blocks
 */

import {
  MessageBuilder,
  TextBlockBuilder,
  ImageBlockBuilder,
  ButtonBlockBuilder,
  ActionsBlockBuilder,
  ContextBlockBuilder,
  message,
  textMessage,
  textBlock,
  createTextBlock,
  imageBlock,
  createImageBlock,
  button,
  createButton,
  actions,
  context,
  divider,
  bold,
  italic,
  strikethrough,
  inlineCode,
  codeBlock,
  blockquote,
  mentionUser,
  mentionChannel,
  link,
  unorderedList,
  orderedList,
  lines,
  successMessage,
  errorMessage,
  warningMessage,
  infoMessage,
  confirmPrompt,
  loadingMessage,
} from "../message-builder";
import type {
  TextBlock,
  ImageBlock,
  ButtonBlock,
  ActionsBlock,
} from "../types";

// ============================================================================
// TEXT BLOCK BUILDER TESTS
// ============================================================================

describe("TextBlockBuilder", () => {
  describe("text", () => {
    it("should set text content", () => {
      const block = new TextBlockBuilder().text("Hello").build();
      expect(block.text).toBe("Hello");
      expect(block.type).toBe("text");
    });
  });

  describe("markdown", () => {
    it("should enable markdown", () => {
      const block = new TextBlockBuilder().text("**bold**").markdown().build();
      expect(block.markdown).toBe(true);
    });

    it("should disable markdown when passed false", () => {
      const block = new TextBlockBuilder().markdown(false).build();
      expect(block.markdown).toBe(false);
    });
  });

  describe("append", () => {
    it("should append to existing text", () => {
      const block = new TextBlockBuilder()
        .text("Hello")
        .append(" World")
        .build();
      expect(block.text).toBe("Hello World");
    });
  });

  describe("newLine", () => {
    it("should add newline", () => {
      const block = new TextBlockBuilder()
        .text("Line 1")
        .newLine()
        .append("Line 2")
        .build();
      expect(block.text).toBe("Line 1\nLine 2");
    });
  });

  describe("build", () => {
    it("should return immutable copy", () => {
      const builder = new TextBlockBuilder().text("Test");
      const block1 = builder.build();
      const block2 = builder.build();
      expect(block1).not.toBe(block2);
    });
  });
});

// ============================================================================
// IMAGE BLOCK BUILDER TESTS
// ============================================================================

describe("ImageBlockBuilder", () => {
  describe("url", () => {
    it("should set image URL", () => {
      const block = new ImageBlockBuilder()
        .url("https://example.com/image.png")
        .build();
      expect(block.url).toBe("https://example.com/image.png");
      expect(block.type).toBe("image");
    });
  });

  describe("alt", () => {
    it("should set alt text", () => {
      const block = new ImageBlockBuilder()
        .url("https://example.com/image.png")
        .alt("An example image")
        .build();
      expect(block.alt).toBe("An example image");
    });
  });

  describe("title", () => {
    it("should set title", () => {
      const block = new ImageBlockBuilder()
        .url("https://example.com/image.png")
        .title("Image Title")
        .build();
      expect(block.title).toBe("Image Title");
    });
  });

  describe("chaining", () => {
    it("should support method chaining", () => {
      const block = new ImageBlockBuilder()
        .url("https://example.com/image.png")
        .alt("Alt text")
        .title("Title")
        .build();

      expect(block.url).toBe("https://example.com/image.png");
      expect(block.alt).toBe("Alt text");
      expect(block.title).toBe("Title");
    });
  });
});

// ============================================================================
// BUTTON BLOCK BUILDER TESTS
// ============================================================================

describe("ButtonBlockBuilder", () => {
  describe("constructor", () => {
    it("should set action ID", () => {
      const block = new ButtonBlockBuilder("click_me").text("Click").build();
      expect(block.actionId).toBe("click_me");
      expect(block.type).toBe("button");
    });
  });

  describe("text", () => {
    it("should set button text", () => {
      const block = new ButtonBlockBuilder("action").text("Click Me").build();
      expect(block.text).toBe("Click Me");
    });
  });

  describe("style methods", () => {
    it("should set primary style", () => {
      const block = new ButtonBlockBuilder("action").primary().build();
      expect(block.style).toBe("primary");
    });

    it("should set danger style", () => {
      const block = new ButtonBlockBuilder("action").danger().build();
      expect(block.style).toBe("danger");
    });

    it("should set default style", () => {
      const block = new ButtonBlockBuilder("action").default().build();
      expect(block.style).toBe("default");
    });

    it("should set style via method", () => {
      const block = new ButtonBlockBuilder("action").style("primary").build();
      expect(block.style).toBe("primary");
    });
  });

  describe("url", () => {
    it("should set URL for link button", () => {
      const block = new ButtonBlockBuilder("action")
        .text("Visit")
        .url("https://example.com")
        .build();
      expect(block.url).toBe("https://example.com");
    });
  });

  describe("value", () => {
    it("should set value", () => {
      const block = new ButtonBlockBuilder("action").value("item_123").build();
      expect(block.value).toBe("item_123");
    });
  });

  describe("disabled", () => {
    it("should disable button", () => {
      const block = new ButtonBlockBuilder("action").disabled().build();
      expect(block.disabled).toBe(true);
    });

    it("should enable button when passed false", () => {
      const block = new ButtonBlockBuilder("action").disabled(false).build();
      expect(block.disabled).toBe(false);
    });
  });
});

// ============================================================================
// ACTIONS BLOCK BUILDER TESTS
// ============================================================================

describe("ActionsBlockBuilder", () => {
  describe("button", () => {
    it("should add button block", () => {
      const btn: ButtonBlock = {
        type: "button",
        text: "Click",
        actionId: "action",
      };
      const block = new ActionsBlockBuilder().button(btn).build();

      expect(block.type).toBe("actions");
      expect(block.elements).toHaveLength(1);
      expect(block.elements[0].text).toBe("Click");
    });

    it("should add button from builder", () => {
      const block = new ActionsBlockBuilder()
        .button(new ButtonBlockBuilder("action").text("Click"))
        .build();

      expect(block.elements).toHaveLength(1);
    });
  });

  describe("buttons", () => {
    it("should add multiple buttons", () => {
      const block = new ActionsBlockBuilder()
        .buttons(
          { type: "button", text: "One", actionId: "one" },
          { type: "button", text: "Two", actionId: "two" },
          new ButtonBlockBuilder("three").text("Three"),
        )
        .build();

      expect(block.elements).toHaveLength(3);
    });
  });

  describe("blockId", () => {
    it("should set block ID", () => {
      const block = new ActionsBlockBuilder().blockId("actions_1").build();
      expect(block.blockId).toBe("actions_1");
    });
  });

  describe("build", () => {
    it("should return immutable elements array", () => {
      const builder = new ActionsBlockBuilder().button({
        type: "button",
        text: "A",
        actionId: "a",
      });
      const block1 = builder.build();
      const block2 = builder.build();

      expect(block1.elements).not.toBe(block2.elements);
    });
  });
});

// ============================================================================
// CONTEXT BLOCK BUILDER TESTS
// ============================================================================

describe("ContextBlockBuilder", () => {
  describe("text", () => {
    it("should add text element", () => {
      const block = new ContextBlockBuilder().text("Context text").build();

      expect(block.type).toBe("context");
      expect(block.elements).toHaveLength(1);
      expect(block.elements[0].type).toBe("text");
      expect((block.elements[0] as TextBlock).text).toBe("Context text");
    });

    it("should support markdown", () => {
      const block = new ContextBlockBuilder().text("**Bold**", true).build();
      expect((block.elements[0] as TextBlock).markdown).toBe(true);
    });
  });

  describe("image", () => {
    it("should add image element", () => {
      const block = new ContextBlockBuilder()
        .image("https://example.com/icon.png", "Icon")
        .build();

      expect(block.elements).toHaveLength(1);
      expect(block.elements[0].type).toBe("image");
      expect((block.elements[0] as ImageBlock).url).toBe(
        "https://example.com/icon.png",
      );
      expect((block.elements[0] as ImageBlock).alt).toBe("Icon");
    });
  });

  describe("mixed elements", () => {
    it("should support mixed text and images", () => {
      const block = new ContextBlockBuilder()
        .image("https://example.com/avatar.png")
        .text("John Doe")
        .text(" - ", false)
        .text("Online")
        .build();

      expect(block.elements).toHaveLength(4);
      expect(block.elements[0].type).toBe("image");
      expect(block.elements[1].type).toBe("text");
    });
  });
});

// ============================================================================
// MESSAGE BUILDER TESTS
// ============================================================================

describe("MessageBuilder", () => {
  describe("text", () => {
    it("should set plain text", () => {
      const msg = new MessageBuilder().text("Hello World").build();
      expect(msg.text).toBe("Hello World");
    });
  });

  describe("textBlock", () => {
    it("should add text block", () => {
      const msg = new MessageBuilder().textBlock("Block text").build();

      expect(msg.blocks).toHaveLength(1);
      expect(msg.blocks![0].type).toBe("text");
      expect((msg.blocks![0] as TextBlock).text).toBe("Block text");
    });

    it("should add text block with markdown", () => {
      const msg = new MessageBuilder().textBlock("**Bold**", true).build();
      expect((msg.blocks![0] as TextBlock).markdown).toBe(true);
    });
  });

  describe("imageBlock", () => {
    it("should add image block", () => {
      const msg = new MessageBuilder()
        .imageBlock("https://example.com/img.png", "Alt", "Title")
        .build();

      expect(msg.blocks).toHaveLength(1);
      expect(msg.blocks![0].type).toBe("image");
    });
  });

  describe("buttonBlock", () => {
    it("should add button block", () => {
      const msg = new MessageBuilder()
        .buttonBlock("action_1", "Click Me", "primary")
        .build();

      expect(msg.blocks).toHaveLength(1);
      expect((msg.blocks![0] as ButtonBlock).actionId).toBe("action_1");
      expect((msg.blocks![0] as ButtonBlock).style).toBe("primary");
    });
  });

  describe("divider", () => {
    it("should add divider block", () => {
      const msg = new MessageBuilder().divider().build();

      expect(msg.blocks).toHaveLength(1);
      expect(msg.blocks![0].type).toBe("divider");
    });
  });

  describe("actions", () => {
    it("should add actions block with buttons", () => {
      const msg = new MessageBuilder()
        .actions(
          { type: "button", text: "Yes", actionId: "yes" },
          button("no").text("No"),
        )
        .build();

      expect(msg.blocks).toHaveLength(1);
      expect(msg.blocks![0].type).toBe("actions");
      expect((msg.blocks![0] as ActionsBlock).elements).toHaveLength(2);
    });
  });

  describe("context", () => {
    it("should add context block from builder", () => {
      const ctx = new ContextBlockBuilder().text("Footer");
      const msg = new MessageBuilder().context(ctx).build();

      expect(msg.blocks).toHaveLength(1);
      expect(msg.blocks![0].type).toBe("context");
    });

    it("should add context block directly", () => {
      const msg = new MessageBuilder()
        .context({
          type: "context",
          elements: [{ type: "text", text: "Footer" }],
        })
        .build();

      expect(msg.blocks![0].type).toBe("context");
    });
  });

  describe("addBlock", () => {
    it("should add custom block", () => {
      const msg = new MessageBuilder().addBlock({ type: "divider" }).build();

      expect(msg.blocks).toHaveLength(1);
    });
  });

  describe("addBlocks", () => {
    it("should add multiple blocks", () => {
      const msg = new MessageBuilder()
        .addBlocks(
          { type: "text", text: "One" },
          { type: "divider" },
          { type: "text", text: "Two" },
        )
        .build();

      expect(msg.blocks).toHaveLength(3);
    });
  });

  describe("threadTs", () => {
    it("should set thread timestamp", () => {
      const msg = new MessageBuilder().threadTs("1234567890.123456").build();
      expect(msg.threadTs).toBe("1234567890.123456");
    });
  });

  describe("replyBroadcast", () => {
    it("should enable reply broadcast", () => {
      const msg = new MessageBuilder().replyBroadcast().build();
      expect(msg.replyBroadcast).toBe(true);
    });

    it("should disable reply broadcast", () => {
      const msg = new MessageBuilder().replyBroadcast(false).build();
      expect(msg.replyBroadcast).toBe(false);
    });
  });

  describe("unfurlLinks", () => {
    it("should set unfurl links", () => {
      const msg = new MessageBuilder().unfurlLinks(true).build();
      expect(msg.unfurlLinks).toBe(true);
    });
  });

  describe("unfurlMedia", () => {
    it("should set unfurl media", () => {
      const msg = new MessageBuilder().unfurlMedia(true).build();
      expect(msg.unfurlMedia).toBe(true);
    });
  });

  describe("metadata", () => {
    it("should set metadata", () => {
      const msg = new MessageBuilder().metadata({ key: "value" }).build();
      expect(msg.metadata).toEqual({ key: "value" });
    });
  });

  describe("build", () => {
    it("should return immutable message", () => {
      const builder = new MessageBuilder()
        .text("Test")
        .textBlock("Block")
        .metadata({ key: "value" });

      const msg1 = builder.build();
      const msg2 = builder.build();

      expect(msg1).not.toBe(msg2);
      expect(msg1.blocks).not.toBe(msg2.blocks);
      expect(msg1.metadata).not.toBe(msg2.metadata);
    });

    it("should handle empty message", () => {
      const msg = new MessageBuilder().build();
      expect(msg.blocks).toBeUndefined();
      expect(msg.metadata).toBeUndefined();
    });
  });

  describe("complex message building", () => {
    it("should build complex message", () => {
      const msg = new MessageBuilder()
        .text("Notification")
        .textBlock("**New Task Created**", true)
        .divider()
        .textBlock("A new task has been assigned to you.")
        .actions(
          button("accept").text("Accept").primary(),
          button("decline").text("Decline").danger(),
        )
        .context(context().text("Created by @john"))
        .threadTs("123456")
        .metadata({ taskId: "456" })
        .build();

      expect(msg.text).toBe("Notification");
      expect(msg.blocks).toHaveLength(5);
      expect(msg.threadTs).toBe("123456");
      expect(msg.metadata).toEqual({ taskId: "456" });
    });
  });
});

// ============================================================================
// FACTORY FUNCTION TESTS
// ============================================================================

describe("Factory Functions", () => {
  describe("message", () => {
    it("should create MessageBuilder", () => {
      expect(message()).toBeInstanceOf(MessageBuilder);
    });
  });

  describe("textMessage", () => {
    it("should create simple text message", () => {
      const msg = textMessage("Hello");
      expect(msg.text).toBe("Hello");
    });
  });

  describe("textBlock", () => {
    it("should create TextBlockBuilder", () => {
      expect(textBlock()).toBeInstanceOf(TextBlockBuilder);
    });
  });

  describe("createTextBlock", () => {
    it("should create text block directly", () => {
      const block = createTextBlock("Hello", true);
      expect(block.type).toBe("text");
      expect(block.text).toBe("Hello");
      expect(block.markdown).toBe(true);
    });
  });

  describe("imageBlock", () => {
    it("should create ImageBlockBuilder", () => {
      expect(imageBlock()).toBeInstanceOf(ImageBlockBuilder);
    });
  });

  describe("createImageBlock", () => {
    it("should create image block directly", () => {
      const block = createImageBlock(
        "https://example.com/img.png",
        "Alt",
        "Title",
      );
      expect(block.type).toBe("image");
      expect(block.url).toBe("https://example.com/img.png");
      expect(block.alt).toBe("Alt");
      expect(block.title).toBe("Title");
    });
  });

  describe("button", () => {
    it("should create ButtonBlockBuilder", () => {
      expect(button("action")).toBeInstanceOf(ButtonBlockBuilder);
    });
  });

  describe("createButton", () => {
    it("should create button block directly", () => {
      const btn = createButton("action", "Click", "primary");
      expect(btn.type).toBe("button");
      expect(btn.actionId).toBe("action");
      expect(btn.text).toBe("Click");
      expect(btn.style).toBe("primary");
    });

    it("should use default style", () => {
      const btn = createButton("action", "Click");
      expect(btn.style).toBe("default");
    });
  });

  describe("actions", () => {
    it("should create ActionsBlockBuilder", () => {
      expect(actions()).toBeInstanceOf(ActionsBlockBuilder);
    });
  });

  describe("context", () => {
    it("should create ContextBlockBuilder", () => {
      expect(context()).toBeInstanceOf(ContextBlockBuilder);
    });
  });

  describe("divider", () => {
    it("should create divider block", () => {
      const div = divider();
      expect(div.type).toBe("divider");
    });
  });
});

// ============================================================================
// FORMATTING HELPER TESTS
// ============================================================================

describe("Formatting Helpers", () => {
  describe("bold", () => {
    it("should wrap text in bold markers", () => {
      expect(bold("text")).toBe("**text**");
    });
  });

  describe("italic", () => {
    it("should wrap text in italic markers", () => {
      expect(italic("text")).toBe("*text*");
    });
  });

  describe("strikethrough", () => {
    it("should wrap text in strikethrough markers", () => {
      expect(strikethrough("text")).toBe("~~text~~");
    });
  });

  describe("inlineCode", () => {
    it("should wrap text in backticks", () => {
      expect(inlineCode("code")).toBe("`code`");
    });
  });

  describe("codeBlock", () => {
    it("should create code block without language", () => {
      expect(codeBlock("const x = 1")).toBe("```\nconst x = 1\n```");
    });

    it("should create code block with language", () => {
      expect(codeBlock("const x = 1", "javascript")).toBe(
        "```javascript\nconst x = 1\n```",
      );
    });
  });

  describe("blockquote", () => {
    it("should format single line as quote", () => {
      expect(blockquote("Quote text")).toBe("> Quote text");
    });

    it("should format multiple lines as quote", () => {
      expect(blockquote("Line 1\nLine 2")).toBe("> Line 1\n> Line 2");
    });
  });

  describe("mentionUser", () => {
    it("should create user mention", () => {
      expect(mentionUser("U123")).toBe("<@U123>");
    });
  });

  describe("mentionChannel", () => {
    it("should create channel mention", () => {
      expect(mentionChannel("C123")).toBe("<#C123>");
    });
  });

  describe("link", () => {
    it("should create markdown link", () => {
      expect(link("Click here", "https://example.com")).toBe(
        "[Click here](https://example.com)",
      );
    });
  });

  describe("unorderedList", () => {
    it("should create unordered list", () => {
      expect(unorderedList(["Item 1", "Item 2", "Item 3"])).toBe(
        "- Item 1\n- Item 2\n- Item 3",
      );
    });

    it("should handle empty list", () => {
      expect(unorderedList([])).toBe("");
    });
  });

  describe("orderedList", () => {
    it("should create ordered list", () => {
      expect(orderedList(["First", "Second", "Third"])).toBe(
        "1. First\n2. Second\n3. Third",
      );
    });
  });

  describe("lines", () => {
    it("should join strings with newlines", () => {
      expect(lines("Line 1", "Line 2", "Line 3")).toBe(
        "Line 1\nLine 2\nLine 3",
      );
    });
  });
});

// ============================================================================
// TEMPLATE MESSAGE TESTS
// ============================================================================

describe("Template Messages", () => {
  describe("successMessage", () => {
    it("should create success message", () => {
      const msg = successMessage("Operation Complete", "All items processed");

      expect(msg.blocks).toHaveLength(2);
      expect((msg.blocks![0] as TextBlock).text).toContain(
        "Operation Complete",
      );
    });

    it("should handle missing description", () => {
      const msg = successMessage("Done");

      expect(msg.blocks).toHaveLength(2);
    });
  });

  describe("errorMessage", () => {
    it("should create error message", () => {
      const msg = errorMessage("Failed to save", "Database connection lost");

      expect(msg.blocks).toHaveLength(2);
      expect((msg.blocks![0] as TextBlock).text).toContain("Error");
      expect((msg.blocks![0] as TextBlock).text).toContain("Failed to save");
    });
  });

  describe("warningMessage", () => {
    it("should create warning message", () => {
      const msg = warningMessage("Low Storage", "Only 10% remaining");

      expect((msg.blocks![0] as TextBlock).text).toContain("Warning");
    });
  });

  describe("infoMessage", () => {
    it("should create info message", () => {
      const msg = infoMessage("Update Available", "Version 2.0 is ready");

      expect(msg.blocks).toHaveLength(2);
    });
  });

  describe("confirmPrompt", () => {
    it("should create confirmation prompt", () => {
      const msg = confirmPrompt("Are you sure?", "confirm_yes", "confirm_no");

      expect(msg.blocks).toHaveLength(2);
      expect(msg.blocks![0].type).toBe("text");
      expect(msg.blocks![1].type).toBe("actions");

      const actionsBlock = msg.blocks![1] as ActionsBlock;
      expect(actionsBlock.elements).toHaveLength(2);
      expect(actionsBlock.elements[0].actionId).toBe("confirm_yes");
      expect(actionsBlock.elements[1].actionId).toBe("confirm_no");
    });
  });

  describe("loadingMessage", () => {
    it("should create default loading message", () => {
      const msg = loadingMessage();
      expect((msg.blocks![0] as TextBlock).text).toBe("Loading...");
    });

    it("should create custom loading message", () => {
      const msg = loadingMessage("Processing...");
      expect((msg.blocks![0] as TextBlock).text).toBe("Processing...");
    });
  });
});
