/**
 * Command Registry Tests
 * Comprehensive tests for slash command registration, parsing, validation, and help
 */

import {
  CommandRegistry,
  createCommandRegistry,
  defineCommand,
  param,
} from "../command-registry";
import type { SlashCommand, CommandParameter, ParsedCommand } from "../types";

// ============================================================================
// TEST DATA
// ============================================================================

const createMockHandler = () => jest.fn().mockResolvedValue(undefined);

const createMockCommand = (
  overrides: Partial<SlashCommand> = {},
): SlashCommand => ({
  name: "test",
  description: "A test command",
  usage: "/test [message]",
  parameters: [],
  handler: createMockHandler(),
  ...overrides,
});

// ============================================================================
// COMMAND REGISTRY TESTS
// ============================================================================

describe("CommandRegistry", () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  // ==========================================================================
  // REGISTRATION TESTS
  // ==========================================================================

  describe("register", () => {
    it("should register a command", () => {
      const command = createMockCommand({ name: "greet" });
      registry.register(command);

      expect(registry.has("greet")).toBe(true);
    });

    it("should throw when registering duplicate command", () => {
      const command = createMockCommand({ name: "greet" });
      registry.register(command);

      expect(() => registry.register(command)).toThrow("already registered");
    });

    it("should register command with aliases", () => {
      const command = createMockCommand({
        name: "hello",
        aliases: ["hi", "hey"],
      });
      registry.register(command);

      expect(registry.has("hello")).toBe(true);
      expect(registry.has("hi")).toBe(true);
      expect(registry.has("hey")).toBe(true);
    });

    it("should throw when alias conflicts with existing command", () => {
      registry.register(createMockCommand({ name: "hello" }));

      expect(() =>
        registry.register(
          createMockCommand({ name: "greet", aliases: ["hello"] }),
        ),
      ).toThrow("conflicts");
    });

    it("should throw when alias conflicts with existing alias", () => {
      registry.register(createMockCommand({ name: "hello", aliases: ["hi"] }));

      expect(() =>
        registry.register(
          createMockCommand({ name: "greet", aliases: ["hi"] }),
        ),
      ).toThrow("conflicts");
    });

    it("should apply default cooldown", () => {
      const reg = new CommandRegistry({ defaultCooldown: 5 });
      const command = createMockCommand({ name: "test" });
      reg.register(command);

      const retrieved = reg.get("test");
      expect(retrieved?.cooldown).toBe(5);
    });
  });

  describe("unregister", () => {
    it("should unregister a command", () => {
      registry.register(createMockCommand({ name: "test" }));
      const result = registry.unregister("test");

      expect(result).toBe(true);
      expect(registry.has("test")).toBe(false);
    });

    it("should return false for non-existent command", () => {
      const result = registry.unregister("nonexistent");
      expect(result).toBe(false);
    });

    it("should remove aliases when unregistering", () => {
      registry.register(
        createMockCommand({ name: "test", aliases: ["t", "tst"] }),
      );
      registry.unregister("test");

      expect(registry.has("t")).toBe(false);
      expect(registry.has("tst")).toBe(false);
    });
  });

  describe("has", () => {
    it("should return true for registered command", () => {
      registry.register(createMockCommand({ name: "test" }));
      expect(registry.has("test")).toBe(true);
    });

    it("should return false for unregistered command", () => {
      expect(registry.has("nonexistent")).toBe(false);
    });

    it("should return true for alias", () => {
      registry.register(createMockCommand({ name: "test", aliases: ["t"] }));
      expect(registry.has("t")).toBe(true);
    });

    it("should be case insensitive by default", () => {
      registry.register(createMockCommand({ name: "Test" }));
      expect(registry.has("test")).toBe(true);
      expect(registry.has("TEST")).toBe(true);
    });

    it("should be case sensitive when configured", () => {
      const reg = new CommandRegistry({ caseSensitive: true });
      reg.register(createMockCommand({ name: "Test" }));

      expect(reg.has("Test")).toBe(true);
      expect(reg.has("test")).toBe(false);
    });
  });

  describe("get", () => {
    it("should get command by name", () => {
      const command = createMockCommand({
        name: "test",
        description: "Test desc",
      });
      registry.register(command);

      const retrieved = registry.get("test");
      expect(retrieved?.name).toBe("test");
      expect(retrieved?.description).toBe("Test desc");
    });

    it("should get command by alias", () => {
      registry.register(createMockCommand({ name: "test", aliases: ["t"] }));

      const retrieved = registry.get("t");
      expect(retrieved?.name).toBe("test");
    });

    it("should return undefined for non-existent command", () => {
      expect(registry.get("nonexistent")).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("should return all registered commands", () => {
      registry.register(createMockCommand({ name: "cmd1" }));
      registry.register(createMockCommand({ name: "cmd2" }));
      registry.register(createMockCommand({ name: "cmd3" }));

      const all = registry.getAll();
      expect(all).toHaveLength(3);
    });

    it("should return empty array when no commands", () => {
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe("getVisible", () => {
    it("should exclude hidden commands", () => {
      registry.register(createMockCommand({ name: "visible" }));
      registry.register(createMockCommand({ name: "hidden", hidden: true }));

      const visible = registry.getVisible();
      expect(visible).toHaveLength(1);
      expect(visible[0].name).toBe("visible");
    });
  });

  describe("getByPermission", () => {
    it("should filter commands by permission", () => {
      registry.register(
        createMockCommand({
          name: "admin",
          permissions: ["admin"],
        }),
      );
      registry.register(
        createMockCommand({
          name: "read",
          permissions: ["read_messages"],
        }),
      );
      registry.register(createMockCommand({ name: "noPerms" }));

      const adminCmds = registry.getByPermission("admin");
      expect(adminCmds).toHaveLength(1);
      expect(adminCmds[0].name).toBe("admin");
    });
  });

  // ==========================================================================
  // PARSING TESTS
  // ==========================================================================

  describe("parse", () => {
    beforeEach(() => {
      registry.register(
        createMockCommand({
          name: "greet",
          parameters: [
            {
              name: "name",
              type: "string",
              required: true,
              description: "Name to greet",
            },
          ],
        }),
      );
    });

    it("should parse simple command", () => {
      const result = registry.parse("/greet John");

      expect(result).not.toBeNull();
      expect(result?.name).toBe("greet");
      expect(result?.args.name).toBe("John");
      expect(result?.isValid).toBe(true);
    });

    it("should return null for non-command input", () => {
      expect(registry.parse("hello")).toBeNull();
      expect(registry.parse("not a command")).toBeNull();
    });

    it("should return null for empty command", () => {
      expect(registry.parse("/")).toBeNull();
    });

    it("should parse command without arguments", () => {
      registry.register(createMockCommand({ name: "ping" }));

      const result = registry.parse("/ping");
      expect(result?.name).toBe("ping");
      expect(result?.rawArgs).toBe("");
      expect(result?.isValid).toBe(true);
    });

    it("should handle unknown commands", () => {
      const result = registry.parse("/unknown");

      expect(result?.isValid).toBe(false);
      expect(result?.errors).toContain("Unknown command: unknown");
    });

    it("should parse named arguments", () => {
      registry.register(
        createMockCommand({
          name: "remind",
          parameters: [
            {
              name: "time",
              type: "string",
              required: true,
              description: "Time",
            },
            {
              name: "message",
              type: "string",
              required: true,
              description: "Message",
            },
          ],
        }),
      );

      const result = registry.parse('/remind --time 5m --message "Call mom"');

      expect(result?.args.time).toBe("5m");
      expect(result?.args.message).toBe("Call mom");
    });

    it("should parse quoted arguments", () => {
      const result = registry.parse('/greet "John Doe"');

      expect(result?.args.name).toBe("John Doe");
    });

    it("should handle single quotes", () => {
      const result = registry.parse("/greet 'Jane Doe'");

      expect(result?.args.name).toBe("Jane Doe");
    });

    it("should preserve raw args", () => {
      const result = registry.parse("/greet John Doe Extra");

      expect(result?.rawArgs).toBe("John Doe Extra");
    });

    it("should use custom prefix", () => {
      const reg = new CommandRegistry({ prefix: "!" });
      reg.register(createMockCommand({ name: "test" }));

      expect(reg.parse("!test")).not.toBeNull();
      expect(reg.parse("/test")).toBeNull();
    });
  });

  describe("validateAndParseArgs", () => {
    it("should validate required parameters", () => {
      const params: CommandParameter[] = [
        {
          name: "required",
          type: "string",
          required: true,
          description: "Required param",
        },
      ];

      const result = registry.validateAndParseArgs("", params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing required parameter: required");
    });

    it("should apply default values", () => {
      const params: CommandParameter[] = [
        {
          name: "optional",
          type: "string",
          required: false,
          description: "Optional",
          default: "default",
        },
      ];

      const result = registry.validateAndParseArgs("", params);

      expect(result.isValid).toBe(true);
      expect(result.args.optional).toBe("default");
    });

    it("should coerce number type", () => {
      const params: CommandParameter[] = [
        { name: "count", type: "number", required: true, description: "Count" },
      ];

      const result = registry.validateAndParseArgs("42", params);

      expect(result.isValid).toBe(true);
      expect(result.args.count).toBe(42);
    });

    it("should reject invalid number", () => {
      const params: CommandParameter[] = [
        { name: "count", type: "number", required: true, description: "Count" },
      ];

      const result = registry.validateAndParseArgs("notanumber", params);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("must be a number");
    });

    it("should coerce boolean type", () => {
      const params: CommandParameter[] = [
        { name: "flag", type: "boolean", required: true, description: "Flag" },
      ];

      expect(registry.validateAndParseArgs("true", params).args.flag).toBe(
        true,
      );
      expect(registry.validateAndParseArgs("false", params).args.flag).toBe(
        false,
      );
      expect(registry.validateAndParseArgs("yes", params).args.flag).toBe(true);
      expect(registry.validateAndParseArgs("no", params).args.flag).toBe(false);
      expect(registry.validateAndParseArgs("1", params).args.flag).toBe(true);
      expect(registry.validateAndParseArgs("0", params).args.flag).toBe(false);
    });

    it("should reject invalid boolean", () => {
      const params: CommandParameter[] = [
        { name: "flag", type: "boolean", required: true, description: "Flag" },
      ];

      const result = registry.validateAndParseArgs("maybe", params);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("must be true or false");
    });

    it("should parse user mentions", () => {
      const params: CommandParameter[] = [
        { name: "user", type: "user", required: true, description: "User" },
      ];

      const result = registry.validateAndParseArgs("<@user123>", params);

      expect(result.args.user).toBe("user123");
    });

    it("should accept raw user ID", () => {
      const params: CommandParameter[] = [
        { name: "user", type: "user", required: true, description: "User" },
      ];

      const result = registry.validateAndParseArgs("user123", params);

      expect(result.args.user).toBe("user123");
    });

    it("should parse channel mentions", () => {
      const params: CommandParameter[] = [
        {
          name: "channel",
          type: "channel",
          required: true,
          description: "Channel",
        },
      ];

      const result = registry.validateAndParseArgs("<#channel123>", params);

      expect(result.args.channel).toBe("channel123");
    });

    it("should validate choices", () => {
      const params: CommandParameter[] = [
        {
          name: "color",
          type: "string",
          required: true,
          description: "Color",
          choices: [
            { label: "Red", value: "red" },
            { label: "Blue", value: "blue" },
          ],
        },
      ];

      const validResult = registry.validateAndParseArgs("red", params);
      expect(validResult.isValid).toBe(true);

      const invalidResult = registry.validateAndParseArgs("green", params);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0]).toContain("must be one of");
    });
  });

  // ==========================================================================
  // EXECUTION TESTS
  // ==========================================================================

  describe("execute", () => {
    let mockRespond: jest.Mock;

    beforeEach(() => {
      mockRespond = jest.fn().mockResolvedValue(undefined);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should execute command handler", async () => {
      const handler = createMockHandler();
      registry.register(createMockCommand({ name: "test", handler }));

      const parsed = registry.parse("/test")!;
      await registry.execute(parsed, {
        userId: "user1",
        channelId: "ch1",
        botId: "bot1",
        respond: mockRespond,
      });

      expect(handler).toHaveBeenCalled();
    });

    it("should pass correct context to handler", async () => {
      const handler = createMockHandler();
      registry.register(
        createMockCommand({
          name: "test",
          handler,
          parameters: [
            {
              name: "arg",
              type: "string",
              required: false,
              description: "Arg",
            },
          ],
        }),
      );

      const parsed = registry.parse("/test hello")!;
      await registry.execute(parsed, {
        userId: "user1",
        channelId: "ch1",
        botId: "bot1",
        messageId: "msg1",
        threadTs: "thread1",
        respond: mockRespond,
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          commandName: "test",
          args: { arg: "hello" },
          userId: "user1",
          channelId: "ch1",
          botId: "bot1",
          messageId: "msg1",
          threadTs: "thread1",
        }),
      );
    });

    it("should handle unknown command", async () => {
      const parsed: ParsedCommand = {
        name: "unknown",
        args: {},
        rawArgs: "",
        isValid: false,
        errors: ["Unknown command: unknown"],
      };

      await registry.execute(parsed, {
        userId: "user1",
        channelId: "ch1",
        botId: "bot1",
        respond: mockRespond,
      });

      expect(mockRespond).toHaveBeenCalledWith(
        expect.stringContaining("Unknown command"),
      );
    });

    it("should handle validation errors", async () => {
      registry.register(
        createMockCommand({
          name: "test",
          parameters: [
            {
              name: "required",
              type: "string",
              required: true,
              description: "Required",
            },
          ],
        }),
      );

      const parsed = registry.parse("/test")!; // Missing required arg

      await registry.execute(parsed, {
        userId: "user1",
        channelId: "ch1",
        botId: "bot1",
        respond: mockRespond,
      });

      expect(mockRespond).toHaveBeenCalledWith(
        expect.stringContaining("validation failed"),
      );
    });

    it("should enforce cooldown", async () => {
      const handler = createMockHandler();
      registry.register(
        createMockCommand({ name: "test", handler, cooldown: 5 }),
      );

      const parsed = registry.parse("/test")!;

      // First call should succeed
      await registry.execute(parsed, {
        userId: "user1",
        channelId: "ch1",
        botId: "bot1",
        respond: mockRespond,
      });

      // Second call should fail due to cooldown
      await registry.execute(parsed, {
        userId: "user1",
        channelId: "ch1",
        botId: "bot1",
        respond: mockRespond,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(mockRespond).toHaveBeenCalledWith(
        expect.stringContaining("Please wait"),
      );
    });

    it("should allow different users to bypass each others cooldown", async () => {
      const handler = createMockHandler();
      registry.register(
        createMockCommand({ name: "test", handler, cooldown: 5 }),
      );

      const parsed = registry.parse("/test")!;

      await registry.execute(parsed, {
        userId: "user1",
        channelId: "ch1",
        botId: "bot1",
        respond: mockRespond,
      });

      await registry.execute(parsed, {
        userId: "user2",
        channelId: "ch1",
        botId: "bot1",
        respond: mockRespond,
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("should handle handler errors", async () => {
      const handler = jest.fn().mockRejectedValue(new Error("Handler error"));
      registry.register(createMockCommand({ name: "test", handler }));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const parsed = registry.parse("/test")!;
      await registry.execute(parsed, {
        userId: "user1",
        channelId: "ch1",
        botId: "bot1",
        respond: mockRespond,
      });
      consoleSpy.mockRestore();

      expect(mockRespond).toHaveBeenCalledWith(
        expect.stringContaining("error occurred"),
      );
    });
  });

  // ==========================================================================
  // HELP GENERATION TESTS
  // ==========================================================================

  describe("getHelp", () => {
    it("should generate help for command", () => {
      registry.register(
        createMockCommand({
          name: "remind",
          description: "Set a reminder",
          usage: "/remind [time] [message]",
          parameters: [
            {
              name: "time",
              type: "string",
              required: true,
              description: "When to remind",
            },
            {
              name: "message",
              type: "string",
              required: false,
              description: "Reminder message",
              default: "No message",
            },
          ],
          aliases: ["r", "rem"],
          cooldown: 10,
        }),
      );

      const help = registry.getHelp("remind");

      expect(help).toContain("/remind");
      expect(help).toContain("Set a reminder");
      expect(help).toContain("time");
      expect(help).toContain("required");
      expect(help).toContain("message");
      expect(help).toContain("default: No message");
      expect(help).toContain("/r");
      expect(help).toContain("/rem");
      expect(help).toContain("10 seconds");
    });

    it("should return null for non-existent command", () => {
      expect(registry.getHelp("nonexistent")).toBeNull();
    });

    it("should include choices in help", () => {
      registry.register(
        createMockCommand({
          name: "color",
          parameters: [
            {
              name: "color",
              type: "string",
              required: true,
              description: "Color",
              choices: [
                { label: "Red", value: "red" },
                { label: "Blue", value: "blue" },
              ],
            },
          ],
        }),
      );

      const help = registry.getHelp("color");
      expect(help).toContain("choices:");
      expect(help).toContain("red");
      expect(help).toContain("blue");
    });
  });

  describe("getAllHelp", () => {
    it("should list all visible commands", () => {
      registry.register(
        createMockCommand({ name: "cmd1", description: "First command" }),
      );
      registry.register(
        createMockCommand({ name: "cmd2", description: "Second command" }),
      );
      registry.register(createMockCommand({ name: "hidden", hidden: true }));

      const help = registry.getAllHelp();

      expect(help).toContain("/cmd1");
      expect(help).toContain("First command");
      expect(help).toContain("/cmd2");
      expect(help).toContain("Second command");
      expect(help).not.toContain("/hidden");
    });

    it("should return message when no commands", () => {
      const help = registry.getAllHelp();
      expect(help).toContain("No commands available");
    });

    it("should sort commands alphabetically", () => {
      registry.register(createMockCommand({ name: "zeta" }));
      registry.register(createMockCommand({ name: "alpha" }));
      registry.register(createMockCommand({ name: "beta" }));

      const help = registry.getAllHelp();
      const alphaIndex = help.indexOf("/alpha");
      const betaIndex = help.indexOf("/beta");
      const zetaIndex = help.indexOf("/zeta");

      expect(alphaIndex).toBeLessThan(betaIndex);
      expect(betaIndex).toBeLessThan(zetaIndex);
    });
  });

  describe("getUsage", () => {
    it("should return usage string", () => {
      registry.register(
        createMockCommand({
          name: "test",
          usage: "/test <arg1> [arg2]",
        }),
      );

      expect(registry.getUsage("test")).toBe("/test <arg1> [arg2]");
    });

    it("should return null for non-existent command", () => {
      expect(registry.getUsage("nonexistent")).toBeNull();
    });
  });

  // ==========================================================================
  // UTILITY METHODS TESTS
  // ==========================================================================

  describe("getPrefix", () => {
    it("should return default prefix", () => {
      expect(registry.getPrefix()).toBe("/");
    });

    it("should return custom prefix", () => {
      const reg = new CommandRegistry({ prefix: "!" });
      expect(reg.getPrefix()).toBe("!");
    });
  });

  describe("setPrefix", () => {
    it("should change prefix", () => {
      registry.setPrefix("!");
      expect(registry.getPrefix()).toBe("!");
    });
  });

  describe("count", () => {
    it("should return number of commands", () => {
      expect(registry.count()).toBe(0);

      registry.register(createMockCommand({ name: "cmd1" }));
      expect(registry.count()).toBe(1);

      registry.register(createMockCommand({ name: "cmd2" }));
      expect(registry.count()).toBe(2);
    });
  });

  describe("clear", () => {
    it("should remove all commands", () => {
      registry.register(createMockCommand({ name: "cmd1", aliases: ["c1"] }));
      registry.register(createMockCommand({ name: "cmd2" }));

      registry.clear();

      expect(registry.count()).toBe(0);
      expect(registry.has("cmd1")).toBe(false);
      expect(registry.has("c1")).toBe(false);
    });
  });

  describe("getMatches", () => {
    beforeEach(() => {
      registry.register(createMockCommand({ name: "hello" }));
      registry.register(createMockCommand({ name: "help", aliases: ["h"] }));
      registry.register(createMockCommand({ name: "hidden", hidden: true }));
      registry.register(createMockCommand({ name: "goodbye" }));
    });

    it("should return matching commands", () => {
      const matches = registry.getMatches("hel");

      expect(matches).toHaveLength(2);
      expect(matches.map((m) => m.name)).toContain("hello");
      expect(matches.map((m) => m.name)).toContain("help");
    });

    it("should exclude hidden commands", () => {
      const matches = registry.getMatches("hid");

      expect(matches).toHaveLength(0);
    });

    it("should match aliases", () => {
      const matches = registry.getMatches("h");

      expect(matches.length).toBeGreaterThan(0);
    });

    it("should respect limit", () => {
      const matches = registry.getMatches("", 2);

      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it("should handle prefix in input", () => {
      const matches = registry.getMatches("/hel");

      expect(matches.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// FACTORY FUNCTION TESTS
// ============================================================================

describe("createCommandRegistry", () => {
  it("should create registry with default config", () => {
    const registry = createCommandRegistry();
    expect(registry.getPrefix()).toBe("/");
  });

  it("should create registry with custom config", () => {
    const registry = createCommandRegistry({
      prefix: "!",
      caseSensitive: true,
    });
    expect(registry.getPrefix()).toBe("!");
  });
});

describe("defineCommand", () => {
  it("should create command definition", () => {
    const handler = jest.fn();
    const command = defineCommand("test", "Test description", handler);

    expect(command.name).toBe("test");
    expect(command.description).toBe("Test description");
    expect(command.handler).toBe(handler);
    expect(command.parameters).toEqual([]);
    expect(command.usage).toBe("/test");
  });
});

describe("param helpers", () => {
  describe("param.string", () => {
    it("should create string parameter", () => {
      const p = param.string("name", "Name description", true);

      expect(p.name).toBe("name");
      expect(p.type).toBe("string");
      expect(p.description).toBe("Name description");
      expect(p.required).toBe(true);
    });

    it("should default required to false", () => {
      const p = param.string("name", "Description");
      expect(p.required).toBe(false);
    });
  });

  describe("param.number", () => {
    it("should create number parameter", () => {
      const p = param.number("count", "Count description", true);

      expect(p.type).toBe("number");
      expect(p.required).toBe(true);
    });
  });

  describe("param.boolean", () => {
    it("should create boolean parameter", () => {
      const p = param.boolean("flag", "Flag description");

      expect(p.type).toBe("boolean");
    });
  });

  describe("param.user", () => {
    it("should create user parameter", () => {
      const p = param.user("target", "Target user", true);

      expect(p.type).toBe("user");
    });
  });

  describe("param.channel", () => {
    it("should create channel parameter", () => {
      const p = param.channel("dest", "Destination channel");

      expect(p.type).toBe("channel");
    });
  });

  describe("param.choice", () => {
    it("should create choice parameter", () => {
      const choices = [
        { label: "Option A", value: "a" },
        { label: "Option B", value: "b" },
      ];
      const p = param.choice("option", "Pick an option", choices, true);

      expect(p.type).toBe("string");
      expect(p.choices).toEqual(choices);
      expect(p.required).toBe(true);
    });
  });
});
