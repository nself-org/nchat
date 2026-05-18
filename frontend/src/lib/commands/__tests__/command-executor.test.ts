/**
 * Tests for Command Executor
 *
 * Tests for slash command execution, handlers, and effects.
 */

import {
  executeCommand,
  registerCommandHandler,
  unregisterCommandHandler,
  hasCommandHandler,
  type CommandContext,
  type CommandResult,
} from "../command-executor";
import type { ParsedCommand } from "../command-parser";

// Helper to create a valid parsed command
function createParsedCommand(
  commandName: string,
  args: Record<string, any> = {},
  overrides: Partial<ParsedCommand> = {},
): ParsedCommand {
  return {
    valid: true,
    commandName,
    commandString: `/${commandName}`,
    command: {
      name: commandName,
      description: `Test ${commandName} command`,
      usage: `/${commandName}`,
      category: "utility",
      args: [],
    },
    rawArgs: "",
    args: [],
    namedArgs: args,
    errors: [],
    isComplete: true,
    suggestions: [],
    ...overrides,
  };
}

// Helper to create a command context
function createContext(
  overrides: Partial<CommandContext> = {},
): CommandContext {
  return {
    userId: "user-123",
    userName: "testuser",
    userRole: "member",
    ...overrides,
  };
}

describe("executeCommand", () => {
  describe("validation", () => {
    it("should return error for invalid command", async () => {
      const parsed = createParsedCommand(
        "test",
        {},
        {
          valid: false,
          errors: [{ type: "unknown_command", message: "Unknown command" }],
        },
      );

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(false);
      expect(result.type).toBe("error");
      expect(result.error).toContain("Unknown command");
    });

    it("should return error for command without handler", async () => {
      const parsed = createParsedCommand("nonexistent");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(false);
      expect(result.type).toBe("error");
      expect(result.error).toContain("not implemented");
    });
  });

  describe("fun commands", () => {
    it("should execute /shrug command", async () => {
      const parsed = createParsedCommand("shrug", {
        text: {
          name: "text",
          rawValue: "dunno",
          value: "dunno",
          type: "text",
          position: 0,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.type).toBe("message");
      expect(result.data?.messageContent).toContain("dunno");
      expect(result.data?.messageContent).toContain(
        "\u00AF\\_(\u30C4)_/\u00AF",
      );
    });

    it("should execute /shrug without text", async () => {
      const parsed = createParsedCommand("shrug");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.data?.messageContent).toContain(
        "\u00AF\\_(\u30C4)_/\u00AF",
      );
    });

    it("should execute /tableflip command", async () => {
      const parsed = createParsedCommand("tableflip");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.data?.messageContent).toContain("\u253B");
    });

    it("should execute /unflip command", async () => {
      const parsed = createParsedCommand("unflip");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.data?.messageContent).toContain("\u252C");
    });

    it("should execute /me command", async () => {
      const parsed = createParsedCommand("me", {
        action: {
          name: "action",
          rawValue: "waves hello",
          value: "waves hello",
          type: "text",
          position: 0,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.type).toBe("message");
      expect(result.data?.messageContent).toBe("waves hello");
      expect(result.data?.messageType).toBe("action");
    });

    it("should return error for /me without action", async () => {
      const parsed = createParsedCommand("me");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain("provide an action");
    });
  });

  describe("status commands", () => {
    it("should execute /status command with emoji and text", async () => {
      const parsed = createParsedCommand("status", {
        emoji: {
          name: "emoji",
          rawValue: ":coffee:",
          value: ":coffee:",
          type: "emoji",
          position: 0,
          valid: true,
        },
        text: {
          name: "text",
          rawValue: "Having coffee",
          value: "Having coffee",
          type: "text",
          position: 1,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.type).toBe("action");
      expect(result.data?.status?.emoji).toBe(":coffee:");
      expect(result.data?.status?.text).toBe("Having coffee");
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: "update_status" }),
      );
    });

    it("should clear status when no args provided", async () => {
      const parsed = createParsedCommand("status");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.message).toContain("cleared");
    });

    it("should execute /away command", async () => {
      const parsed = createParsedCommand("away");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({
          type: "update_presence",
          payload: { status: "away" },
        }),
      );
    });

    it("should execute /active command", async () => {
      const parsed = createParsedCommand("active");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({
          type: "update_presence",
          payload: { status: "online" },
        }),
      );
    });

    it("should execute /dnd command with duration", async () => {
      const parsed = createParsedCommand("dnd", {
        duration: {
          name: "duration",
          rawValue: "30m",
          value: "30 minutes",
          type: "duration",
          position: 0,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.message).toContain("30 minutes");
      expect(result.effects).toContainEqual(
        expect.objectContaining({
          type: "set_dnd",
          payload: expect.objectContaining({ enabled: true }),
        }),
      );
    });
  });

  describe("channel commands", () => {
    it("should execute /mute command", async () => {
      const parsed = createParsedCommand("mute");
      const context = createContext({ channelId: "channel-123" });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({
          type: "mute_channel",
          payload: expect.objectContaining({ channelId: "channel-123" }),
        }),
      );
    });

    it("should fail /mute without channel context", async () => {
      const parsed = createParsedCommand("mute");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain("must be used in a channel");
    });

    it("should execute /unmute command", async () => {
      const parsed = createParsedCommand("unmute");
      const context = createContext({ channelId: "channel-123" });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: "unmute_channel" }),
      );
    });

    it("should execute /star command", async () => {
      const parsed = createParsedCommand("star");
      const context = createContext({ channelId: "channel-123" });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: "star_channel" }),
      );
    });

    it("should execute /unstar command", async () => {
      const parsed = createParsedCommand("unstar");
      const context = createContext({ channelId: "channel-123" });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: "unstar_channel" }),
      );
    });

    it("should execute /leave command with preview", async () => {
      const parsed = createParsedCommand("leave");
      const context = createContext({
        channelId: "channel-123",
        channelName: "general",
      });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.type).toBe("preview");
      expect(result.data?.preview?.title).toContain("Leave");
    });

    it("should execute /topic command", async () => {
      const parsed = createParsedCommand("topic", {
        topic: {
          name: "topic",
          rawValue: "New topic",
          value: "New topic",
          type: "text",
          position: 0,
          valid: true,
        },
      });
      const context = createContext({ channelId: "channel-123" });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({
          type: "set_topic",
          payload: expect.objectContaining({ topic: "New topic" }),
        }),
      );
    });

    it("should fail /topic without topic text", async () => {
      const parsed = createParsedCommand("topic");
      const context = createContext({ channelId: "channel-123" });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain("provide a topic");
    });

    it("should execute /rename command", async () => {
      const parsed = createParsedCommand("rename", {
        name: {
          name: "name",
          rawValue: "new-name",
          value: "new-name",
          type: "text",
          position: 0,
          valid: true,
        },
      });
      const context = createContext({ channelId: "channel-123" });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.message).toContain("new-name");
    });

    it("should execute /invite command", async () => {
      const parsed = createParsedCommand("invite", {
        users: {
          name: "users",
          rawValue: "@john",
          value: "john",
          type: "user",
          position: 0,
          valid: true,
        },
      });
      const context = createContext({ channelId: "channel-123" });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({
          type: "invite_user",
          payload: expect.objectContaining({ username: "john" }),
        }),
      );
    });

    it("should execute /who command", async () => {
      const parsed = createParsedCommand("who");
      const context = createContext({ channelId: "channel-123" });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.type).toBe("modal");
      expect(result.data?.modal?.type).toBe("channel-members");
    });
  });

  describe("moderation commands", () => {
    it("should execute /kick command with preview", async () => {
      const parsed = createParsedCommand("kick", {
        user: {
          name: "user",
          rawValue: "@john",
          value: "john",
          type: "user",
          position: 0,
          valid: true,
        },
      });
      const context = createContext({
        channelId: "channel-123",
        channelName: "general",
      });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.type).toBe("preview");
      expect(result.data?.preview?.title).toContain("Kick");
    });

    it("should execute /ban command with preview", async () => {
      const parsed = createParsedCommand("ban", {
        user: {
          name: "user",
          rawValue: "@john",
          value: "john",
          type: "user",
          position: 0,
          valid: true,
        },
        reason: {
          name: "reason",
          rawValue: "Spamming",
          value: "Spamming",
          type: "text",
          position: 1,
          valid: true,
        },
      });
      const context = createContext({ channelId: "channel-123" });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.type).toBe("preview");
      expect(result.data?.preview?.content).toContain("Spamming");
    });

    it("should execute /unban command", async () => {
      const parsed = createParsedCommand("unban", {
        user: {
          name: "user",
          rawValue: "@john",
          value: "john",
          type: "user",
          position: 0,
          valid: true,
        },
      });
      const context = createContext({ channelId: "channel-123" });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: "unban_user" }),
      );
    });

    it("should execute /warn command", async () => {
      const parsed = createParsedCommand("warn", {
        user: {
          name: "user",
          rawValue: "@john",
          value: "john",
          type: "user",
          position: 0,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: "warn_user" }),
      );
    });

    it("should execute /slowmode command", async () => {
      const parsed = createParsedCommand("slowmode", {
        interval: {
          name: "interval",
          rawValue: "30s",
          value: "30 seconds",
          type: "duration",
          position: 0,
          valid: true,
        },
      });
      const context = createContext({ channelId: "channel-123" });

      const result = await executeCommand(parsed, context);

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: "set_slowmode" }),
      );
    });
  });

  describe("utility commands", () => {
    it("should execute /remind command", async () => {
      const parsed = createParsedCommand("remind", {
        time: {
          name: "time",
          rawValue: "30m",
          value: "30 minutes",
          type: "duration",
          position: 0,
          valid: true,
        },
        message: {
          name: "message",
          rawValue: "Check emails",
          value: "Check emails",
          type: "text",
          position: 1,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.data?.reminder).toBeDefined();
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: "set_reminder" }),
      );
    });

    it("should fail /remind without time", async () => {
      const parsed = createParsedCommand("remind", {
        message: {
          name: "message",
          rawValue: "Test",
          value: "Test",
          type: "text",
          position: 1,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain("when");
    });

    it("should execute /search command", async () => {
      const parsed = createParsedCommand("search", {
        query: {
          name: "query",
          rawValue: "test search",
          value: "test search",
          type: "text",
          position: 0,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.type).toBe("navigation");
      expect(result.effects).toContainEqual(
        expect.objectContaining({
          type: "open_modal",
          payload: expect.objectContaining({ query: "test search" }),
        }),
      );
    });

    it("should execute /shortcuts command", async () => {
      const parsed = createParsedCommand("shortcuts");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.type).toBe("modal");
      expect(result.data?.modal?.type).toBe("keyboard-shortcuts");
    });

    it("should execute /help command", async () => {
      const parsed = createParsedCommand("help");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.type).toBe("modal");
      expect(result.data?.modal?.type).toBe("command-help");
    });

    it("should execute /collapse command", async () => {
      const parsed = createParsedCommand("collapse");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: "collapse_media" }),
      );
    });

    it("should execute /expand command", async () => {
      const parsed = createParsedCommand("expand");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: "expand_media" }),
      );
    });
  });

  describe("navigation commands", () => {
    it("should execute /open command", async () => {
      const parsed = createParsedCommand("open", {
        channel: {
          name: "channel",
          rawValue: "#general",
          value: "general",
          type: "channel",
          position: 0,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.type).toBe("navigation");
      expect(result.data?.navigateTo).toContain("general");
    });

    it("should execute /dm command", async () => {
      const parsed = createParsedCommand("dm", {
        user: {
          name: "user",
          rawValue: "@john",
          value: "john",
          type: "user",
          position: 0,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.type).toBe("navigation");
      expect(result.data?.navigateTo).toContain("john");
    });

    it("should execute /settings command", async () => {
      const parsed = createParsedCommand("settings");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.type).toBe("navigation");
      expect(result.data?.navigateTo).toBe("/settings");
    });
  });

  describe("media commands", () => {
    it("should execute /giphy command with preview", async () => {
      const parsed = createParsedCommand("giphy", {
        query: {
          name: "query",
          rawValue: "cats",
          value: "cats",
          type: "text",
          position: 0,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.type).toBe("preview");
      expect(result.data?.searchQuery).toBe("cats");
    });

    it("should execute /poll command with preview", async () => {
      const parsed = createParsedCommand("poll", {
        question: {
          name: "question",
          rawValue: "Favorite color?",
          value: "Favorite color?",
          type: "text",
          position: 0,
          valid: true,
        },
        options: {
          name: "options",
          rawValue: '"Red" "Blue"',
          value: ["Red", "Blue"],
          type: "options",
          position: 1,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(true);
      expect(result.type).toBe("preview");
      expect(result.data?.poll?.question).toBe("Favorite color?");
      expect(result.data?.poll?.options).toEqual(["Red", "Blue"]);
    });

    it("should fail /poll without enough options", async () => {
      const parsed = createParsedCommand("poll", {
        question: {
          name: "question",
          rawValue: "Question?",
          value: "Question?",
          type: "text",
          position: 0,
          valid: true,
        },
        options: {
          name: "options",
          rawValue: '"Only one"',
          value: ["Only one"],
          type: "options",
          position: 1,
          valid: true,
        },
      });

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least 2");
    });
  });

  describe("error handling", () => {
    it("should catch and handle errors in command handlers", async () => {
      // Register a handler that throws
      registerCommandHandler("throws", () => {
        throw new Error("Handler error");
      });

      const parsed = createParsedCommand("throws");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain("Handler error");

      unregisterCommandHandler("throws");
    });

    it("should handle async handler errors", async () => {
      registerCommandHandler("asyncthrows", async () => {
        throw new Error("Async error");
      });

      const parsed = createParsedCommand("asyncthrows");

      const result = await executeCommand(parsed, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain("Async error");

      unregisterCommandHandler("asyncthrows");
    });
  });
});

describe("registerCommandHandler", () => {
  afterEach(() => {
    unregisterCommandHandler("custom");
  });

  it("should register a custom handler", () => {
    const handler = jest.fn(() => ({
      success: true,
      type: "action" as const,
      message: "Custom command executed",
    }));

    registerCommandHandler("custom", handler);

    expect(hasCommandHandler("custom")).toBe(true);
  });

  it("should allow executing registered handler", async () => {
    registerCommandHandler("custom", () => ({
      success: true,
      type: "message" as const,
      data: { messageContent: "Custom!" },
    }));

    const parsed = createParsedCommand("custom");
    const result = await executeCommand(parsed, createContext());

    expect(result.success).toBe(true);
    expect(result.data?.messageContent).toBe("Custom!");
  });
});

describe("unregisterCommandHandler", () => {
  it("should remove a registered handler", () => {
    registerCommandHandler("temp", () => ({
      success: true,
      type: "silent" as const,
    }));
    expect(hasCommandHandler("temp")).toBe(true);

    unregisterCommandHandler("temp");

    expect(hasCommandHandler("temp")).toBe(false);
  });
});

describe("hasCommandHandler", () => {
  it("should return true for built-in commands", () => {
    expect(hasCommandHandler("shrug")).toBe(true);
    expect(hasCommandHandler("status")).toBe(true);
    expect(hasCommandHandler("mute")).toBe(true);
  });

  it("should return false for unregistered commands", () => {
    expect(hasCommandHandler("nonexistent")).toBe(false);
    expect(hasCommandHandler("")).toBe(false);
  });
});
