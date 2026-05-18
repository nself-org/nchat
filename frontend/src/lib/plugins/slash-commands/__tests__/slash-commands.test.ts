/**
 * Plugin Slash Command Engine - Comprehensive Tests
 *
 * Tests covering: registration, parsing, permission gating, argument validation,
 * execution, built-in commands, discovery, and security.
 */

import {
  CommandRegistry,
  CommandRegistryError,
  CommandExecutor,
  CommandRateLimiter,
  registerBuiltInCommands,
  getBuiltInDefinitions,
  getBuiltInCommandNames,
  createSlashCommandEngine,
  tokenize,
  extractCommandInfo,
  parseArgs,
  parseAndValidateArg,
  parseInput,
  meetsRoleRequirement,
  ROLE_HIERARCHY,
} from "../index";
import type {
  PluginCommand,
  PluginArgSchema,
  CommandHandler,
  CommandExecutionContext,
  UserRole,
  ChannelType,
} from "../types";
import type { AppScope } from "../../app-contract";

// ============================================================================
// HELPERS
// ============================================================================

/** Create a simple handler that succeeds with a message. */
function successHandler(msg: string): CommandHandler {
  return async () => ({
    success: true,
    message: msg,
    visibility: "ephemeral" as const,
  });
}

/** Create a handler that fails. */
function failHandler(msg: string): CommandHandler {
  return async () => ({ success: false, error: msg });
}

/** Create a handler that throws. */
function throwHandler(msg: string): CommandHandler {
  return async () => {
    throw new Error(msg);
  };
}

/** Create a handler that takes a long time. */
function slowHandler(ms: number): CommandHandler {
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return { success: true, message: "done" };
  };
}

/** Create a handler that records its context. */
function spyHandler(): {
  handler: CommandHandler;
  calls: CommandExecutionContext[];
} {
  const calls: CommandExecutionContext[] = [];
  const handler: CommandHandler = async (ctx) => {
    calls.push(ctx);
    return { success: true, message: "ok" };
  };
  return { handler, calls };
}

/** Create a minimal app command definition (without id/qualifiedName). */
function makeAppCommand(
  name: string,
  appId: string,
  handler: CommandHandler,
  overrides: Partial<Omit<PluginCommand, "id" | "qualifiedName">> = {},
): Omit<PluginCommand, "id" | "qualifiedName"> {
  return {
    appId,
    name,
    description: `${name} command`,
    args: [],
    requiredRole: "member" as UserRole,
    requiredScopes: [],
    allowedChannelTypes: [
      "public",
      "private",
      "direct",
      "group",
    ] as ChannelType[],
    isBuiltIn: false,
    enabled: true,
    handler,
    ...overrides,
  };
}

const defaultExecContext = {
  userId: "user-1",
  username: "testuser",
  userRole: "admin" as UserRole,
  channelId: "ch-1",
  channelType: "public" as ChannelType,
};

// ============================================================================
// 1. REGISTRATION TESTS
// ============================================================================

describe("CommandRegistry - Registration", () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  test("registers a built-in command", () => {
    const cmd = registry.register({
      appId: "",
      name: "ping",
      description: "Ping!",
      args: [],
      requiredRole: "member",
      requiredScopes: [],
      allowedChannelTypes: ["public"],
      isBuiltIn: true,
      enabled: true,
      handler: successHandler("pong"),
    });

    expect(cmd.id).toBeTruthy();
    expect(cmd.qualifiedName).toBe("ping");
    expect(cmd.isBuiltIn).toBe(true);
  });

  test("registers an app command with namespace", () => {
    const cmd = registry.register(
      makeAppCommand("deploy", "mybot", successHandler("deployed")),
    );

    expect(cmd.qualifiedName).toBe("mybot:deploy");
    expect(cmd.appId).toBe("mybot");
  });

  test("rejects duplicate built-in commands", () => {
    registry.register({
      appId: "",
      name: "help",
      description: "Help",
      args: [],
      requiredRole: "guest",
      requiredScopes: [],
      allowedChannelTypes: ["public"],
      isBuiltIn: true,
      enabled: true,
      handler: successHandler("help"),
    });

    expect(() =>
      registry.register({
        appId: "",
        name: "help",
        description: "Another help",
        args: [],
        requiredRole: "guest",
        requiredScopes: [],
        allowedChannelTypes: ["public"],
        isBuiltIn: true,
        enabled: true,
        handler: successHandler("help2"),
      }),
    ).toThrow(CommandRegistryError);
  });

  test("rejects duplicate app command with same namespace", () => {
    registry.register(makeAppCommand("deploy", "mybot", successHandler("v1")));

    expect(() =>
      registry.register(
        makeAppCommand("deploy", "mybot", successHandler("v2")),
      ),
    ).toThrow("already registered");
  });

  test("allows same command name in different app namespaces", () => {
    const cmd1 = registry.register(
      makeAppCommand("deploy", "app-a", successHandler("a")),
    );
    const cmd2 = registry.register(
      makeAppCommand("deploy", "app-b", successHandler("b")),
    );

    expect(cmd1.qualifiedName).toBe("app-a:deploy");
    expect(cmd2.qualifiedName).toBe("app-b:deploy");
    expect(registry.size).toBe(2);
  });

  test("rejects invalid command names", () => {
    expect(() =>
      registry.register(makeAppCommand("", "mybot", successHandler("x"))),
    ).toThrow("Invalid command name");

    expect(() =>
      registry.register(
        makeAppCommand("123invalid", "mybot", successHandler("x")),
      ),
    ).toThrow("Invalid command name");

    expect(() =>
      registry.register(
        makeAppCommand("has space", "mybot", successHandler("x")),
      ),
    ).toThrow("Invalid command name");
  });

  test("accepts valid command names with hyphens and underscores", () => {
    const cmd1 = registry.register(
      makeAppCommand("my-cmd", "app", successHandler("x")),
    );
    const cmd2 = registry.register(
      makeAppCommand("my_cmd", "app", successHandler("x")),
    );

    expect(cmd1.name).toBe("my-cmd");
    expect(cmd2.name).toBe("my_cmd");
  });

  test("command names are case-insensitive", () => {
    registry.register(makeAppCommand("Deploy", "mybot", successHandler("x")));

    expect(registry.lookup("mybot:deploy")).toBeTruthy();
    expect(registry.lookup("mybot:DEPLOY")).toBeTruthy();
  });

  test("unregisters an app command", () => {
    const cmd = registry.register(
      makeAppCommand("temp", "mybot", successHandler("x")),
    );
    expect(registry.size).toBe(1);

    const result = registry.unregister(cmd.id);
    expect(result).toBe(true);
    expect(registry.size).toBe(0);
    expect(registry.lookup("mybot:temp")).toBeUndefined();
  });

  test("cannot unregister a built-in command", () => {
    const cmd = registry.register({
      appId: "",
      name: "help",
      description: "Help",
      args: [],
      requiredRole: "guest",
      requiredScopes: [],
      allowedChannelTypes: ["public"],
      isBuiltIn: true,
      enabled: true,
      handler: successHandler("help"),
    });

    expect(() => registry.unregister(cmd.id)).toThrow(
      "Cannot unregister built-in",
    );
  });

  test("unregisters all commands from an app", () => {
    registry.register(makeAppCommand("cmd1", "mybot", successHandler("1")));
    registry.register(makeAppCommand("cmd2", "mybot", successHandler("2")));
    registry.register(makeAppCommand("cmd3", "other", successHandler("3")));

    const count = registry.unregisterApp("mybot");
    expect(count).toBe(2);
    expect(registry.size).toBe(1);
  });

  test("returns false when unregistering non-existent command", () => {
    expect(registry.unregister("nonexistent")).toBe(false);
  });

  test("built-in command takes priority for bare name lookup", () => {
    // Register built-in "help"
    registry.register({
      appId: "",
      name: "help",
      description: "Built-in help",
      args: [],
      requiredRole: "guest",
      requiredScopes: [],
      allowedChannelTypes: ["public"],
      isBuiltIn: true,
      enabled: true,
      handler: successHandler("builtin-help"),
    });

    // Register app command also named "help"
    registry.register(
      makeAppCommand("help", "myapp", successHandler("app-help")),
    );

    // Bare name should resolve to built-in
    const result = registry.lookup("help");
    expect(result?.isBuiltIn).toBe(true);

    // Qualified name should resolve to app
    const appResult = registry.lookup("myapp:help");
    expect(appResult?.appId).toBe("myapp");
  });
});

// ============================================================================
// 2. PARSER TESTS
// ============================================================================

describe("Command Parser", () => {
  describe("tokenize", () => {
    test("splits simple tokens by space", () => {
      expect(tokenize("hello world")).toEqual(["hello", "world"]);
    });

    test("handles quoted strings", () => {
      expect(tokenize('"hello world" foo')).toEqual(["hello world", "foo"]);
    });

    test("handles single-quoted strings", () => {
      expect(tokenize("'hello world' foo")).toEqual(["hello world", "foo"]);
    });

    test("handles empty input", () => {
      expect(tokenize("")).toEqual([]);
    });

    test("handles multiple spaces", () => {
      expect(tokenize("a   b   c")).toEqual(["a", "b", "c"]);
    });

    test("handles escaped characters", () => {
      expect(tokenize("hello\\ world")).toEqual(["hello world"]);
    });

    test("handles mixed quotes", () => {
      expect(tokenize("\"hello\" 'world'")).toEqual(["hello", "world"]);
    });

    test("handles trailing content", () => {
      expect(tokenize("foo bar")).toEqual(["foo", "bar"]);
    });

    test("handles empty quoted strings", () => {
      expect(tokenize('""')).toEqual([""]);
    });
  });

  describe("extractCommandInfo", () => {
    test("extracts simple command", () => {
      const info = extractCommandInfo("/help");
      expect(info).toBeTruthy();
      expect(info!.bareName).toBe("help");
      expect(info!.namespace).toBe("");
      expect(info!.isNamespaced).toBe(false);
    });

    test("extracts namespaced command", () => {
      const info = extractCommandInfo("/mybot:deploy");
      expect(info).toBeTruthy();
      expect(info!.bareName).toBe("deploy");
      expect(info!.namespace).toBe("mybot");
      expect(info!.isNamespaced).toBe(true);
      expect(info!.fullTrigger).toBe("mybot:deploy");
    });

    test("extracts command with arguments", () => {
      const info = extractCommandInfo("/kick @user reason here");
      expect(info).toBeTruthy();
      expect(info!.bareName).toBe("kick");
      expect(info!.rest).toBe("@user reason here");
    });

    test("returns null for non-command input", () => {
      expect(extractCommandInfo("not a command")).toBeNull();
      expect(extractCommandInfo("")).toBeNull();
    });

    test("is case-insensitive", () => {
      const info = extractCommandInfo("/HELP");
      expect(info!.bareName).toBe("help");
    });

    test("handles dot-separated namespace", () => {
      const info = extractCommandInfo("/com.example.bot:cmd");
      expect(info).toBeTruthy();
      expect(info!.namespace).toBe("com.example.bot");
      expect(info!.bareName).toBe("cmd");
    });
  });

  describe("parseAndValidateArg", () => {
    test("parses string argument", () => {
      const schema: PluginArgSchema = {
        name: "text",
        description: "",
        type: "string",
        required: true,
      };
      const result = parseAndValidateArg("hello", schema);
      expect(result.value).toBe("hello");
      expect(result.error).toBeUndefined();
    });

    test("parses number argument", () => {
      const schema: PluginArgSchema = {
        name: "count",
        description: "",
        type: "number",
        required: true,
      };
      const result = parseAndValidateArg("42", schema);
      expect(result.value).toBe(42);
    });

    test("rejects invalid number", () => {
      const schema: PluginArgSchema = {
        name: "count",
        description: "",
        type: "number",
        required: true,
      };
      const result = parseAndValidateArg("abc", schema);
      expect(result.error).toBeTruthy();
      expect(result.error!.type).toBe("invalid_type");
    });

    test("parses boolean argument (true)", () => {
      const schema: PluginArgSchema = {
        name: "flag",
        description: "",
        type: "boolean",
        required: true,
      };
      expect(parseAndValidateArg("true", schema).value).toBe(true);
      expect(parseAndValidateArg("yes", schema).value).toBe(true);
      expect(parseAndValidateArg("1", schema).value).toBe(true);
      expect(parseAndValidateArg("on", schema).value).toBe(true);
    });

    test("parses boolean argument (false)", () => {
      const schema: PluginArgSchema = {
        name: "flag",
        description: "",
        type: "boolean",
        required: true,
      };
      expect(parseAndValidateArg("false", schema).value).toBe(false);
      expect(parseAndValidateArg("no", schema).value).toBe(false);
      expect(parseAndValidateArg("0", schema).value).toBe(false);
      expect(parseAndValidateArg("off", schema).value).toBe(false);
    });

    test("rejects invalid boolean", () => {
      const schema: PluginArgSchema = {
        name: "flag",
        description: "",
        type: "boolean",
        required: true,
      };
      const result = parseAndValidateArg("maybe", schema);
      expect(result.error).toBeTruthy();
    });

    test("parses user mention", () => {
      const schema: PluginArgSchema = {
        name: "user",
        description: "",
        type: "user",
        required: true,
      };
      expect(parseAndValidateArg("@alice", schema).value).toBe("alice");
      expect(parseAndValidateArg("bob", schema).value).toBe("bob");
    });

    test("parses channel reference", () => {
      const schema: PluginArgSchema = {
        name: "channel",
        description: "",
        type: "channel",
        required: true,
      };
      expect(parseAndValidateArg("#general", schema).value).toBe("general");
      expect(parseAndValidateArg("random", schema).value).toBe("random");
    });

    test("validates number min", () => {
      const schema: PluginArgSchema = {
        name: "n",
        description: "",
        type: "number",
        required: true,
        min: 5,
      };
      const result = parseAndValidateArg("3", schema);
      expect(result.error).toBeTruthy();
      expect(result.error!.type).toBe("validation_failed");
    });

    test("validates number max", () => {
      const schema: PluginArgSchema = {
        name: "n",
        description: "",
        type: "number",
        required: true,
        max: 10,
      };
      const result = parseAndValidateArg("15", schema);
      expect(result.error).toBeTruthy();
    });

    test("validates string minLength", () => {
      const schema: PluginArgSchema = {
        name: "s",
        description: "",
        type: "string",
        required: true,
        minLength: 5,
      };
      const result = parseAndValidateArg("hi", schema);
      expect(result.error).toBeTruthy();
    });

    test("validates string maxLength", () => {
      const schema: PluginArgSchema = {
        name: "s",
        description: "",
        type: "string",
        required: true,
        maxLength: 3,
      };
      const result = parseAndValidateArg("toolong", schema);
      expect(result.error).toBeTruthy();
    });

    test("validates string pattern", () => {
      const schema: PluginArgSchema = {
        name: "s",
        description: "",
        type: "string",
        required: true,
        pattern: "^[a-z]+$",
      };
      expect(parseAndValidateArg("abc", schema).error).toBeUndefined();
      expect(parseAndValidateArg("ABC", schema).error).toBeTruthy();
    });

    test("validates choices", () => {
      const schema: PluginArgSchema = {
        name: "c",
        description: "",
        type: "string",
        required: true,
        choices: ["red", "green", "blue"],
      };
      expect(parseAndValidateArg("red", schema).error).toBeUndefined();
      expect(parseAndValidateArg("yellow", schema).error).toBeTruthy();
    });

    test("handles missing required argument", () => {
      const schema: PluginArgSchema = {
        name: "s",
        description: "",
        type: "string",
        required: true,
      };
      const result = parseAndValidateArg("", schema);
      expect(result.error).toBeTruthy();
      expect(result.error!.type).toBe("missing_required");
    });

    test("returns default for optional missing argument", () => {
      const schema: PluginArgSchema = {
        name: "s",
        description: "",
        type: "string",
        required: false,
        default: "hello",
      };
      const result = parseAndValidateArg("", schema);
      expect(result.value).toBe("hello");
      expect(result.error).toBeUndefined();
    });
  });

  describe("parseArgs", () => {
    test("parses positional arguments", () => {
      const schema: PluginArgSchema[] = [
        { name: "name", description: "", type: "string", required: true },
        { name: "count", description: "", type: "number", required: true },
      ];
      const { args, errors } = parseArgs("hello 42", schema);
      expect(errors).toHaveLength(0);
      expect(args.name).toBe("hello");
      expect(args.count).toBe(42);
    });

    test("reports missing required arguments", () => {
      const schema: PluginArgSchema[] = [
        { name: "a", description: "", type: "string", required: true },
        { name: "b", description: "", type: "string", required: true },
      ];
      const { errors } = parseArgs("only-one", schema);
      expect(errors).toHaveLength(1);
      expect(errors[0].argument).toBe("b");
    });

    test("uses defaults for optional arguments", () => {
      const schema: PluginArgSchema[] = [
        { name: "a", description: "", type: "string", required: true },
        {
          name: "b",
          description: "",
          type: "number",
          required: false,
          default: 10,
        },
      ];
      const { args, errors } = parseArgs("hello", schema);
      expect(errors).toHaveLength(0);
      expect(args.b).toBe(10);
    });

    test("handles quoted strings with spaces", () => {
      const schema: PluginArgSchema[] = [
        { name: "name", description: "", type: "string", required: true },
      ];
      const { args } = parseArgs('"hello world"', schema);
      expect(args.name).toBe("hello world");
    });
  });

  describe("parseInput", () => {
    test("parses a full command string", () => {
      const result = parseInput("/help");
      expect(result.commandName).toBe("help");
      expect(result.isNamespaced).toBe(false);
    });

    test("parses namespaced command", () => {
      const result = parseInput("/mybot:deploy");
      expect(result.commandName).toBe("mybot:deploy");
      expect(result.isNamespaced).toBe(true);
      expect(result.namespace).toBe("mybot");
      expect(result.bareName).toBe("deploy");
    });

    test("validates args against command schema", () => {
      const command: PluginCommand = {
        id: "test",
        appId: "",
        name: "test",
        qualifiedName: "test",
        description: "Test",
        args: [
          {
            name: "count",
            description: "",
            type: "number",
            required: true,
            min: 1,
          },
        ],
        requiredRole: "member",
        requiredScopes: [],
        allowedChannelTypes: ["public"],
        isBuiltIn: false,
        enabled: true,
        handler: successHandler("ok"),
      };

      const good = parseInput("/test 5", command);
      expect(good.success).toBe(true);
      expect(good.args.count).toBe(5);

      const bad = parseInput("/test 0", command);
      expect(bad.success).toBe(false);
    });

    test("returns error for non-command input", () => {
      const result = parseInput("not a command");
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// 3. PERMISSION GATING TESTS
// ============================================================================

describe("Permission Gating", () => {
  let registry: CommandRegistry;
  let executor: CommandExecutor;

  beforeEach(() => {
    registry = new CommandRegistry();
    executor = new CommandExecutor(registry);
  });

  test("allows user with sufficient role", () => {
    const cmd = registry.register(
      makeAppCommand("test", "", successHandler("ok"), {
        requiredRole: "member",
        isBuiltIn: true,
      }),
    );

    const result = executor.checkPermissions(cmd, {
      userRole: "admin",
      channelType: "public",
    });
    expect(result.allowed).toBe(true);
  });

  test("denies user with insufficient role", () => {
    const cmd = registry.register(
      makeAppCommand("test", "", successHandler("ok"), {
        requiredRole: "admin",
        isBuiltIn: true,
      }),
    );

    const result = executor.checkPermissions(cmd, {
      userRole: "member",
      channelType: "public",
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("ROLE_INSUFFICIENT");
  });

  test("denies guest for member-only command", () => {
    const cmd = registry.register(
      makeAppCommand("test", "", successHandler("ok"), {
        requiredRole: "member",
        isBuiltIn: true,
      }),
    );

    const result = executor.checkPermissions(cmd, {
      userRole: "guest",
      channelType: "public",
    });
    expect(result.allowed).toBe(false);
  });

  test("allows owner for any command", () => {
    const cmd = registry.register(
      makeAppCommand("test", "", successHandler("ok"), {
        requiredRole: "admin",
        isBuiltIn: true,
      }),
    );

    const result = executor.checkPermissions(cmd, {
      userRole: "owner",
      channelType: "public",
    });
    expect(result.allowed).toBe(true);
  });

  test("denies command in wrong channel type", () => {
    const cmd = registry.register(
      makeAppCommand("test", "", successHandler("ok"), {
        allowedChannelTypes: ["public", "private"],
        isBuiltIn: true,
      }),
    );

    const result = executor.checkPermissions(cmd, {
      userRole: "admin",
      channelType: "direct",
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("CHANNEL_DENIED");
  });

  test("denies app command without required scopes", () => {
    const cmd = registry.register(
      makeAppCommand("deploy", "mybot", successHandler("ok"), {
        requiredScopes: ["write:messages", "read:channels"] as AppScope[],
      }),
    );

    const result = executor.checkPermissions(cmd, {
      userRole: "admin",
      channelType: "public",
      grantedScopes: ["read:messages"] as AppScope[],
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("SCOPE_INSUFFICIENT");
  });

  test("allows app command with required scopes", () => {
    const cmd = registry.register(
      makeAppCommand("deploy", "mybot", successHandler("ok"), {
        requiredScopes: ["write:messages"] as AppScope[],
      }),
    );

    const result = executor.checkPermissions(cmd, {
      userRole: "admin",
      channelType: "public",
      grantedScopes: ["write:messages", "read:channels"] as AppScope[],
    });
    expect(result.allowed).toBe(true);
  });

  test("allows app command with wildcard scope", () => {
    const cmd = registry.register(
      makeAppCommand("deploy", "mybot", successHandler("ok"), {
        requiredScopes: ["write:messages"] as AppScope[],
      }),
    );

    const result = executor.checkPermissions(cmd, {
      userRole: "admin",
      channelType: "public",
      grantedScopes: ["write:*"] as AppScope[],
    });
    expect(result.allowed).toBe(true);
  });
});

describe("Role Hierarchy", () => {
  test("role hierarchy is correctly ordered", () => {
    expect(ROLE_HIERARCHY.guest).toBeLessThan(ROLE_HIERARCHY.member);
    expect(ROLE_HIERARCHY.member).toBeLessThan(ROLE_HIERARCHY.moderator);
    expect(ROLE_HIERARCHY.moderator).toBeLessThan(ROLE_HIERARCHY.admin);
    expect(ROLE_HIERARCHY.admin).toBeLessThan(ROLE_HIERARCHY.owner);
  });

  test("meetsRoleRequirement works correctly", () => {
    expect(meetsRoleRequirement("owner", "guest")).toBe(true);
    expect(meetsRoleRequirement("admin", "admin")).toBe(true);
    expect(meetsRoleRequirement("member", "admin")).toBe(false);
    expect(meetsRoleRequirement("guest", "member")).toBe(false);
  });
});

// ============================================================================
// 4. ARGUMENT VALIDATION TESTS
// ============================================================================

describe("Argument Validation", () => {
  let registry: CommandRegistry;
  let executor: CommandExecutor;

  beforeEach(() => {
    registry = new CommandRegistry();
    executor = new CommandExecutor(registry);
  });

  test("validates correct argument types pass through", async () => {
    const { handler, calls } = spyHandler();
    registry.register(
      makeAppCommand("test", "", handler, {
        isBuiltIn: true,
        args: [
          { name: "name", description: "Name", type: "string", required: true },
          {
            name: "count",
            description: "Count",
            type: "number",
            required: true,
          },
        ],
      }),
    );

    const result = await executor.execute("/test hello 42", defaultExecContext);
    expect(result.success).toBe(true);
    expect(calls[0].args.name).toBe("hello");
    expect(calls[0].args.count).toBe(42);
  });

  test("rejects missing required arguments", async () => {
    registry.register(
      makeAppCommand("test", "", successHandler("ok"), {
        isBuiltIn: true,
        args: [
          { name: "name", description: "Name", type: "string", required: true },
          {
            name: "count",
            description: "Count",
            type: "number",
            required: true,
          },
        ],
      }),
    );

    const result = await executor.execute("/test hello", defaultExecContext);
    expect(result.success).toBe(false);
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  test("accepts optional arguments when missing", async () => {
    const { handler, calls } = spyHandler();
    registry.register(
      makeAppCommand("test", "", handler, {
        isBuiltIn: true,
        args: [
          { name: "name", description: "Name", type: "string", required: true },
          {
            name: "extra",
            description: "Extra",
            type: "string",
            required: false,
            default: "default-value",
          },
        ],
      }),
    );

    const result = await executor.execute("/test hello", defaultExecContext);
    expect(result.success).toBe(true);
    expect(calls[0].args.extra).toBe("default-value");
  });

  test("rejects wrong type (string for number)", async () => {
    registry.register(
      makeAppCommand("test", "", successHandler("ok"), {
        isBuiltIn: true,
        args: [
          {
            name: "count",
            description: "Count",
            type: "number",
            required: true,
          },
        ],
      }),
    );

    const result = await executor.execute("/test abc", defaultExecContext);
    expect(result.success).toBe(false);
    expect(result.error).toContain("number");
  });

  test('coerces boolean from "yes"', async () => {
    const { handler, calls } = spyHandler();
    registry.register(
      makeAppCommand("test", "", handler, {
        isBuiltIn: true,
        args: [
          {
            name: "flag",
            description: "Flag",
            type: "boolean",
            required: true,
          },
        ],
      }),
    );

    await executor.execute("/test yes", defaultExecContext);
    expect(calls[0].args.flag).toBe(true);
  });

  test("validates number range", async () => {
    registry.register(
      makeAppCommand("test", "", successHandler("ok"), {
        isBuiltIn: true,
        args: [
          {
            name: "n",
            description: "Number",
            type: "number",
            required: true,
            min: 1,
            max: 100,
          },
        ],
      }),
    );

    const below = await executor.execute("/test 0", defaultExecContext);
    expect(below.success).toBe(false);

    const above = await executor.execute("/test 101", defaultExecContext);
    expect(above.success).toBe(false);

    const ok = await executor.execute("/test 50", defaultExecContext);
    expect(ok.success).toBe(true);
  });

  test("validates string choices", async () => {
    registry.register(
      makeAppCommand("test", "", successHandler("ok"), {
        isBuiltIn: true,
        args: [
          {
            name: "color",
            description: "Color",
            type: "string",
            required: true,
            choices: ["red", "green", "blue"],
          },
        ],
      }),
    );

    const good = await executor.execute("/test red", defaultExecContext);
    expect(good.success).toBe(true);

    const bad = await executor.execute("/test yellow", defaultExecContext);
    expect(bad.success).toBe(false);
  });

  test("handles extra arguments gracefully", async () => {
    const { handler, calls } = spyHandler();
    registry.register(
      makeAppCommand("test", "", handler, {
        isBuiltIn: true,
        args: [
          { name: "name", description: "Name", type: "string", required: true },
        ],
      }),
    );

    // Extra args are ignored (not an error)
    const result = await executor.execute(
      "/test hello extra stuff",
      defaultExecContext,
    );
    expect(result.success).toBe(true);
  });

  test("strips @ from user mentions", async () => {
    const { handler, calls } = spyHandler();
    registry.register(
      makeAppCommand("test", "", handler, {
        isBuiltIn: true,
        args: [
          { name: "user", description: "User", type: "user", required: true },
        ],
      }),
    );

    await executor.execute("/test @alice", defaultExecContext);
    expect(calls[0].args.user).toBe("alice");
  });

  test("strips # from channel references", async () => {
    const { handler, calls } = spyHandler();
    registry.register(
      makeAppCommand("test", "", handler, {
        isBuiltIn: true,
        args: [
          {
            name: "ch",
            description: "Channel",
            type: "channel",
            required: true,
          },
        ],
      }),
    );

    await executor.execute("/test #general", defaultExecContext);
    expect(calls[0].args.ch).toBe("general");
  });
});

// ============================================================================
// 5. EXECUTION TESTS
// ============================================================================

describe("Command Execution", () => {
  let registry: CommandRegistry;
  let executor: CommandExecutor;

  beforeEach(() => {
    registry = new CommandRegistry();
    executor = new CommandExecutor(registry, {
      executionTimeoutMs: 500,
      userRateLimitPerMinute: 30,
      appRateLimitPerMinute: 60,
    });
  });

  test("executes a simple command successfully", async () => {
    registry.register(
      makeAppCommand("ping", "", successHandler("pong"), { isBuiltIn: true }),
    );

    const result = await executor.execute("/ping", defaultExecContext);
    expect(result.success).toBe(true);
    expect(result.handlerResult?.message).toBe("pong");
  });

  test("returns error for unknown command", async () => {
    const result = await executor.execute("/unknown", defaultExecContext);
    expect(result.success).toBe(false);
    expect(result.code).toBe("COMMAND_NOT_FOUND");
  });

  test("returns error for disabled command", async () => {
    registry.register(
      makeAppCommand("disabled", "", successHandler("ok"), {
        isBuiltIn: true,
        enabled: false,
      }),
    );

    const result = await executor.execute("/disabled", defaultExecContext);
    expect(result.success).toBe(false);
    expect(result.code).toBe("COMMAND_DISABLED");
  });

  test("handler errors are caught and reported", async () => {
    registry.register(
      makeAppCommand("boom", "", throwHandler("kaboom"), { isBuiltIn: true }),
    );

    const result = await executor.execute("/boom", defaultExecContext);
    expect(result.success).toBe(false);
    expect(result.handlerResult?.error).toContain("kaboom");
  });

  test("handler failure is reported", async () => {
    registry.register(
      makeAppCommand("fail", "", failHandler("nope"), { isBuiltIn: true }),
    );

    const result = await executor.execute("/fail", defaultExecContext);
    expect(result.success).toBe(false);
    expect(result.handlerResult?.error).toBe("nope");
  });

  test("execution timeout is enforced", async () => {
    registry.register(
      makeAppCommand("slow", "", slowHandler(2000), { isBuiltIn: true }),
    );

    const result = await executor.execute("/slow", defaultExecContext);
    expect(result.success).toBe(false);
    expect(result.handlerResult?.error).toContain("timed out");
  }, 10000);

  test("execution context has correct fields", async () => {
    const { handler, calls } = spyHandler();
    registry.register(makeAppCommand("ctx", "", handler, { isBuiltIn: true }));

    await executor.execute("/ctx", {
      ...defaultExecContext,
      userId: "user-123",
      username: "alice",
      userRole: "moderator",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].userId).toBe("user-123");
    expect(calls[0].username).toBe("alice");
    expect(calls[0].userRole).toBe("moderator");
    expect(calls[0].channelId).toBe("ch-1");
    expect(calls[0].channelType).toBe("public");
    expect(calls[0].timestamp).toBeInstanceOf(Date);
  });

  test("app command context has app-specific fields", async () => {
    const { handler, calls } = spyHandler();
    registry.register(
      makeAppCommand("cmd", "mybot", handler, {
        requiredScopes: ["read:messages"] as AppScope[],
      }),
    );

    await executor.execute("/mybot:cmd", {
      ...defaultExecContext,
      grantedScopes: ["read:messages", "write:messages"] as AppScope[],
    });

    expect(calls[0].appId).toBe("mybot");
    expect(calls[0].grantedScopes).toContain("read:messages");
    expect(calls[0].grantedScopes).toContain("write:messages");
  });

  test("records duration", async () => {
    registry.register(
      makeAppCommand("test", "", successHandler("ok"), { isBuiltIn: true }),
    );

    const result = await executor.execute("/test", defaultExecContext);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("invalid input returns parse error", async () => {
    const result = await executor.execute("not a command", defaultExecContext);
    expect(result.success).toBe(false);
    expect(result.code).toBe("PARSE_ERROR");
  });

  test("executes namespaced app command", async () => {
    registry.register(
      makeAppCommand("deploy", "mybot", successHandler("deployed")),
    );

    const result = await executor.execute("/mybot:deploy", defaultExecContext);
    expect(result.success).toBe(true);
    expect(result.handlerResult?.message).toBe("deployed");
  });
});

// ============================================================================
// 6. RATE LIMITING TESTS
// ============================================================================

describe("Rate Limiting", () => {
  test("allows requests within limit", () => {
    const limiter = new CommandRateLimiter(60_000, 5);
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("key")).toBe(true);
    }
  });

  test("blocks requests exceeding limit", () => {
    const limiter = new CommandRateLimiter(60_000, 3);
    expect(limiter.check("key")).toBe(true);
    expect(limiter.check("key")).toBe(true);
    expect(limiter.check("key")).toBe(true);
    expect(limiter.check("key")).toBe(false);
  });

  test("different keys have separate limits", () => {
    const limiter = new CommandRateLimiter(60_000, 1);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("b")).toBe(true);
    expect(limiter.check("a")).toBe(false);
    expect(limiter.check("b")).toBe(false);
  });

  test("remaining returns correct count", () => {
    const limiter = new CommandRateLimiter(60_000, 5);
    expect(limiter.remaining("key")).toBe(5);
    limiter.check("key");
    expect(limiter.remaining("key")).toBe(4);
  });

  test("reset clears a specific key", () => {
    const limiter = new CommandRateLimiter(60_000, 1);
    limiter.check("key");
    expect(limiter.check("key")).toBe(false);
    limiter.reset("key");
    expect(limiter.check("key")).toBe(true);
  });

  test("clear removes all state", () => {
    const limiter = new CommandRateLimiter(60_000, 1);
    limiter.check("a");
    limiter.check("b");
    limiter.clear();
    expect(limiter.remaining("a")).toBe(1);
    expect(limiter.remaining("b")).toBe(1);
  });

  test("executor rate limits per user", async () => {
    const registry = new CommandRegistry();
    const executor = new CommandExecutor(registry, {
      userRateLimitPerMinute: 2,
      appRateLimitPerMinute: 100,
      executionTimeoutMs: 5000,
    });

    registry.register(
      makeAppCommand("test", "", successHandler("ok"), { isBuiltIn: true }),
    );

    const r1 = await executor.execute("/test", defaultExecContext);
    expect(r1.success).toBe(true);

    const r2 = await executor.execute("/test", defaultExecContext);
    expect(r2.success).toBe(true);

    const r3 = await executor.execute("/test", defaultExecContext);
    expect(r3.success).toBe(false);
    expect(r3.code).toBe("RATE_LIMITED");
  });

  test("executor rate limits per app", async () => {
    const registry = new CommandRegistry();
    const executor = new CommandExecutor(registry, {
      userRateLimitPerMinute: 100,
      appRateLimitPerMinute: 2,
      executionTimeoutMs: 5000,
    });

    registry.register(makeAppCommand("cmd", "mybot", successHandler("ok")));

    const r1 = await executor.execute("/mybot:cmd", defaultExecContext);
    expect(r1.success).toBe(true);

    const r2 = await executor.execute("/mybot:cmd", defaultExecContext);
    expect(r2.success).toBe(true);

    const r3 = await executor.execute("/mybot:cmd", defaultExecContext);
    expect(r3.success).toBe(false);
    expect(r3.code).toBe("APP_RATE_LIMITED");
  });

  test("executor rate limit can be reset", async () => {
    const registry = new CommandRegistry();
    const executor = new CommandExecutor(registry, {
      userRateLimitPerMinute: 1,
      appRateLimitPerMinute: 100,
      executionTimeoutMs: 5000,
    });

    registry.register(
      makeAppCommand("test", "", successHandler("ok"), { isBuiltIn: true }),
    );

    await executor.execute("/test", defaultExecContext);
    const blocked = await executor.execute("/test", defaultExecContext);
    expect(blocked.success).toBe(false);

    executor.resetUserRate(defaultExecContext.userId);
    const unblocked = await executor.execute("/test", defaultExecContext);
    expect(unblocked.success).toBe(true);
  });
});

// ============================================================================
// 7. BUILT-IN COMMANDS TESTS
// ============================================================================

describe("Built-in Commands", () => {
  let registry: CommandRegistry;
  let executor: CommandExecutor;

  beforeEach(() => {
    registry = new CommandRegistry();
    registerBuiltInCommands(registry);
    executor = new CommandExecutor(registry);
  });

  test("all built-in commands are registered", () => {
    const names = getBuiltInCommandNames();
    expect(names.length).toBeGreaterThan(10);

    for (const name of names) {
      const cmd = registry.lookup(name);
      expect(cmd).toBeTruthy();
      expect(cmd!.isBuiltIn).toBe(true);
    }
  });

  test("/help executes successfully", async () => {
    const result = await executor.execute("/help", {
      ...defaultExecContext,
      userRole: "guest",
    });
    expect(result.success).toBe(true);
    expect(result.handlerResult?.message).toContain("commands");
  });

  test("/help with specific command", async () => {
    const result = await executor.execute("/help kick", {
      ...defaultExecContext,
      userRole: "guest",
    });
    expect(result.success).toBe(true);
  });

  test("/kick executes with proper args", async () => {
    const result = await executor.execute("/kick @troublemaker Bad behavior", {
      ...defaultExecContext,
      userRole: "moderator",
    });
    expect(result.success).toBe(true);
    expect(result.handlerResult?.data?.user).toBe("troublemaker");
  });

  test("/kick denied for member role", async () => {
    const result = await executor.execute("/kick @user", {
      ...defaultExecContext,
      userRole: "member",
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe("ROLE_INSUFFICIENT");
  });

  test("/ban executes for admin", async () => {
    const result = await executor.execute(
      "/ban @spammer spam reasons",
      defaultExecContext,
    );
    expect(result.success).toBe(true);
    expect(result.handlerResult?.data?.action).toBe("ban");
  });

  test("/ban denied for moderator", async () => {
    const result = await executor.execute("/ban @user", {
      ...defaultExecContext,
      userRole: "moderator",
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe("ROLE_INSUFFICIENT");
  });

  test("/topic sets channel topic", async () => {
    const result = await executor.execute('/topic "Welcome to the team!"', {
      ...defaultExecContext,
      userRole: "moderator",
    });
    expect(result.success).toBe(true);
    expect(result.handlerResult?.data?.topic).toBe("Welcome to the team!");
  });

  test("/clear validates count range", async () => {
    const overMax = await executor.execute("/clear 200", defaultExecContext);
    expect(overMax.success).toBe(false);

    const good = await executor.execute("/clear 50", defaultExecContext);
    expect(good.success).toBe(true);
  });

  test("/slow enables and disables slow mode", async () => {
    const enable = await executor.execute("/slow 30", {
      ...defaultExecContext,
      userRole: "moderator",
    });
    expect(enable.success).toBe(true);
    expect(enable.handlerResult?.data?.seconds).toBe(30);

    const disable = await executor.execute("/slow 0", {
      ...defaultExecContext,
      userRole: "moderator",
    });
    expect(disable.success).toBe(true);
    expect(disable.handlerResult?.message).toContain("disabled");
  });

  test("/me sends action message", async () => {
    const result = await executor.execute("/me waves hello", {
      ...defaultExecContext,
      username: "alice",
      userRole: "guest",
    });
    expect(result.success).toBe(true);
    expect(result.handlerResult?.message).toContain("alice");
    expect(result.handlerResult?.message).toContain("waves");
  });

  test("/shrug sends shrug emoji", async () => {
    const result = await executor.execute("/shrug", {
      ...defaultExecContext,
      userRole: "guest",
    });
    expect(result.success).toBe(true);
    expect(result.handlerResult?.message).toContain("\u00AF");
  });

  test("/invite works in allowed channel types", async () => {
    const result = await executor.execute("/invite @newuser", {
      ...defaultExecContext,
      channelType: "public",
    });
    expect(result.success).toBe(true);
  });

  test("/invite denied in direct messages", async () => {
    const result = await executor.execute("/invite @newuser", {
      ...defaultExecContext,
      channelType: "direct",
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe("CHANNEL_DENIED");
  });

  test("/leave executes", async () => {
    const result = await executor.execute("/leave", defaultExecContext);
    expect(result.success).toBe(true);
  });

  test("/pin requires message id", async () => {
    const good = await executor.execute("/pin msg-123", {
      ...defaultExecContext,
      userRole: "moderator",
    });
    expect(good.success).toBe(true);

    const bad = await executor.execute("/pin", {
      ...defaultExecContext,
      userRole: "moderator",
    });
    expect(bad.success).toBe(false);
  });

  test("/unban requires user", async () => {
    const good = await executor.execute("/unban @user", defaultExecContext);
    expect(good.success).toBe(true);

    const bad = await executor.execute("/unban", defaultExecContext);
    expect(bad.success).toBe(false);
  });
});

// ============================================================================
// 8. DISCOVERY / AUTOCOMPLETE TESTS
// ============================================================================

describe("Discovery & Autocomplete", () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
    registerBuiltInCommands(registry);
    registry.register(makeAppCommand("deploy", "mybot", successHandler("ok")));
    registry.register(makeAppCommand("status", "mybot", successHandler("ok")));
    registry.register(makeAppCommand("deploy", "other", successHandler("ok")));
  });

  test("returns all suggestions for empty query", () => {
    const suggestions = registry.getSuggestions("");
    expect(suggestions.length).toBeGreaterThan(0);
  });

  test("filters suggestions by query prefix", () => {
    const suggestions = registry.getSuggestions("hel");
    expect(suggestions.some((s) => s.command.name === "help")).toBe(true);
  });

  test("filters suggestions by user role", () => {
    const memberSuggestions = registry.getSuggestions("", {
      userRole: "member",
    });
    const guestSuggestions = registry.getSuggestions("", { userRole: "guest" });

    // Members should see more commands than guests
    expect(memberSuggestions.length).toBeGreaterThanOrEqual(
      guestSuggestions.length,
    );
  });

  test("filters suggestions by channel type", () => {
    const publicSuggestions = registry.getSuggestions("", {
      channelType: "public",
    });
    const directSuggestions = registry.getSuggestions("", {
      channelType: "direct",
    });

    // Public channels should have at least as many commands as DMs
    expect(publicSuggestions.length).toBeGreaterThanOrEqual(
      directSuggestions.length,
    );
  });

  test("limits number of suggestions", () => {
    const limited = registry.getSuggestions("", { limit: 3 });
    expect(limited.length).toBeLessThanOrEqual(3);
  });

  test("sorts suggestions by relevance score", () => {
    const suggestions = registry.getSuggestions("dep");
    const scores = suggestions.map((s) => s.score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  test("includes app commands in suggestions", () => {
    const suggestions = registry.getSuggestions("deploy");
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    expect(suggestions.some((s) => s.command.appId === "mybot")).toBe(true);
  });

  test("getHelp returns help text for existing command", () => {
    const help = registry.getHelp("help");
    expect(help).toBeTruthy();
    expect(help).toContain("/help");
  });

  test("getHelp returns help for app command", () => {
    const help = registry.getHelp("mybot:deploy");
    expect(help).toBeTruthy();
    expect(help).toContain("deploy");
  });

  test("getHelp returns undefined for non-existent command", () => {
    expect(registry.getHelp("nonexistent")).toBeUndefined();
  });

  test("disabled commands are excluded from suggestions", () => {
    registry.register(
      makeAppCommand("hidden", "", successHandler("ok"), {
        isBuiltIn: true,
        enabled: false,
      }),
    );

    const suggestions = registry.getSuggestions("hidden");
    expect(suggestions.length).toBe(0);
  });
});

// ============================================================================
// 9. SECURITY TESTS
// ============================================================================

describe("Security", () => {
  let registry: CommandRegistry;
  let executor: CommandExecutor;

  beforeEach(() => {
    registry = new CommandRegistry();
    executor = new CommandExecutor(registry);
  });

  test("cannot override built-in commands via app registration", () => {
    // Register built-in
    registry.register({
      appId: "",
      name: "help",
      description: "Built-in help",
      args: [],
      requiredRole: "guest",
      requiredScopes: [],
      allowedChannelTypes: ["public", "private", "direct", "group"],
      isBuiltIn: true,
      enabled: true,
      handler: successHandler("builtin"),
    });

    // App tries to register same bare name
    registry.register(
      makeAppCommand("help", "evil-app", successHandler("hacked")),
    );

    // Bare name still resolves to built-in
    const cmd = registry.lookup("help");
    expect(cmd!.isBuiltIn).toBe(true);
    expect(cmd!.appId).toBe("");
  });

  test("scope escalation is blocked", async () => {
    // App command requires write:messages
    registry.register(
      makeAppCommand("write-cmd", "mybot", successHandler("wrote"), {
        requiredScopes: ["write:messages"] as AppScope[],
      }),
    );

    // User only has read:messages
    const result = await executor.execute("/mybot:write-cmd", {
      ...defaultExecContext,
      grantedScopes: ["read:messages"] as AppScope[],
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("SCOPE_INSUFFICIENT");
  });

  test("handler cannot access scopes beyond granted", async () => {
    const { handler, calls } = spyHandler();
    registry.register(
      makeAppCommand("cmd", "mybot", handler, {
        requiredScopes: ["read:messages"] as AppScope[],
      }),
    );

    await executor.execute("/mybot:cmd", {
      ...defaultExecContext,
      grantedScopes: ["read:messages"] as AppScope[],
    });

    // The context only has the scopes that were granted
    expect(calls[0].grantedScopes).toContain("read:messages");
    // It should NOT contain admin scopes
    expect(calls[0].grantedScopes).not.toContain("admin:users");
  });

  test("SQL injection in command name is rejected", () => {
    expect(() =>
      registry.register(
        makeAppCommand("'; DROP TABLE users; --", "evil", successHandler("x")),
      ),
    ).toThrow("Invalid command name");
  });

  test("script injection in arguments is treated as plain text", async () => {
    const { handler, calls } = spyHandler();
    registry.register(
      makeAppCommand("test", "", handler, {
        isBuiltIn: true,
        args: [
          { name: "text", description: "Text", type: "string", required: true },
        ],
      }),
    );

    await executor.execute(
      "/test <script>alert(1)</script>",
      defaultExecContext,
    );
    expect(calls[0].args.text).toBe("<script>alert(1)</script>");
  });

  test("very long command name is rejected", () => {
    const longName = "a".repeat(33);
    expect(() =>
      registry.register(makeAppCommand(longName, "app", successHandler("x"))),
    ).toThrow("Invalid command name");
  });

  test("command with special characters is rejected", () => {
    expect(() =>
      registry.register(makeAppCommand("cmd!@#", "app", successHandler("x"))),
    ).toThrow("Invalid command name");
  });

  test("null byte in input does not crash", async () => {
    registry.register(
      makeAppCommand("test", "", successHandler("ok"), { isBuiltIn: true }),
    );
    const result = await executor.execute("/test \x00evil", defaultExecContext);
    // Should not throw
    expect(result).toBeTruthy();
  });

  test("prototype pollution attempt in args", async () => {
    const { handler, calls } = spyHandler();
    registry.register(
      makeAppCommand("test", "", handler, {
        isBuiltIn: true,
        args: [
          {
            name: "__proto__",
            description: "Test",
            type: "string",
            required: false,
          },
        ],
      }),
    );

    await executor.execute("/test polluted", defaultExecContext);
    // Should execute normally without throwing
    expect(calls.length).toBe(1);
    // CRITICAL: Object.prototype must NOT be polluted
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
    // The args object should still be usable (not corrupted)
    expect(typeof calls[0].args).toBe("object");
  });

  test("disabled command cannot be executed even with correct permissions", async () => {
    registry.register(
      makeAppCommand("locked", "", successHandler("secret"), {
        isBuiltIn: true,
        enabled: false,
      }),
    );

    const result = await executor.execute("/locked", {
      ...defaultExecContext,
      userRole: "owner",
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe("COMMAND_DISABLED");
  });
});

// ============================================================================
// 10. CREATE ENGINE CONVENIENCE FUNCTION
// ============================================================================

describe("createSlashCommandEngine", () => {
  test("creates engine with built-in commands", () => {
    const { registry, executor } = createSlashCommandEngine();
    const builtIns = registry.getBuiltIn();
    expect(builtIns.length).toBeGreaterThan(10);
    expect(executor).toBeTruthy();
  });

  test("engine can execute built-in commands", async () => {
    const { executor } = createSlashCommandEngine();
    const result = await executor.execute("/help", {
      ...defaultExecContext,
      userRole: "guest",
    });
    expect(result.success).toBe(true);
  });

  test("engine accepts custom config", () => {
    const { executor } = createSlashCommandEngine({
      executionTimeoutMs: 1000,
      userRateLimitPerMinute: 5,
    });
    expect(executor).toBeTruthy();
  });
});

// ============================================================================
// 11. EDGE CASES AND INTEGRATION
// ============================================================================

describe("Edge Cases", () => {
  let registry: CommandRegistry;
  let executor: CommandExecutor;

  beforeEach(() => {
    registry = new CommandRegistry();
    executor = new CommandExecutor(registry);
  });

  test("empty input", async () => {
    const result = await executor.execute("", defaultExecContext);
    expect(result.success).toBe(false);
  });

  test("just a slash", async () => {
    const result = await executor.execute("/", defaultExecContext);
    expect(result.success).toBe(false);
  });

  test("command with no space before args", async () => {
    const { handler, calls } = spyHandler();
    registry.register(
      makeAppCommand("test", "", handler, {
        isBuiltIn: true,
        args: [],
      }),
    );

    // "/test" with no args should work
    const result = await executor.execute("/test", defaultExecContext);
    expect(result.success).toBe(true);
  });

  test("command with multiple spaces between args", async () => {
    const { handler, calls } = spyHandler();
    registry.register(
      makeAppCommand("test", "", handler, {
        isBuiltIn: true,
        args: [
          { name: "a", description: "", type: "string", required: true },
          { name: "b", description: "", type: "string", required: true },
        ],
      }),
    );

    await executor.execute("/test   hello   world", defaultExecContext);
    expect(calls[0].args.a).toBe("hello");
    expect(calls[0].args.b).toBe("world");
  });

  test("registry clear removes all commands", () => {
    registry.register(
      makeAppCommand("a", "", successHandler("a"), { isBuiltIn: true }),
    );
    registry.register(makeAppCommand("b", "app", successHandler("b")));
    expect(registry.size).toBe(2);

    registry.clear();
    expect(registry.size).toBe(0);
  });

  test("getAll returns all commands", () => {
    registry.register(
      makeAppCommand("a", "", successHandler("a"), { isBuiltIn: true }),
    );
    registry.register(makeAppCommand("b", "app", successHandler("b")));
    expect(registry.getAll()).toHaveLength(2);
  });

  test("getAllEnabled excludes disabled", () => {
    registry.register(
      makeAppCommand("a", "", successHandler("a"), {
        isBuiltIn: true,
        enabled: true,
      }),
    );
    registry.register(
      makeAppCommand("b", "", successHandler("b"), {
        isBuiltIn: true,
        enabled: false,
      }),
    );
    expect(registry.getAllEnabled()).toHaveLength(1);
  });

  test("getCommandsByApp returns only that apps commands", () => {
    registry.register(makeAppCommand("a", "app1", successHandler("a")));
    registry.register(makeAppCommand("b", "app2", successHandler("b")));
    registry.register(makeAppCommand("c", "app1", successHandler("c")));

    expect(registry.getCommandsByApp("app1")).toHaveLength(2);
    expect(registry.getCommandsByApp("app2")).toHaveLength(1);
  });

  test("getById returns command by internal id", () => {
    const cmd = registry.register(
      makeAppCommand("test", "", successHandler("ok"), { isBuiltIn: true }),
    );
    expect(registry.getById(cmd.id)).toBe(cmd);
    expect(registry.getById("nonexistent")).toBeUndefined();
  });

  test("concurrent executions do not interfere", async () => {
    let callCount = 0;
    const handler: CommandHandler = async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { success: true, message: `call-${callCount}` };
    };

    registry.register(makeAppCommand("test", "", handler, { isBuiltIn: true }));

    const results = await Promise.all([
      executor.execute("/test", { ...defaultExecContext, userId: "u1" }),
      executor.execute("/test", { ...defaultExecContext, userId: "u2" }),
      executor.execute("/test", { ...defaultExecContext, userId: "u3" }),
    ]);

    expect(results.every((r) => r.success)).toBe(true);
    expect(callCount).toBe(3);
  });

  test("built-in definitions count matches registered count", () => {
    const defs = getBuiltInDefinitions();
    const names = getBuiltInCommandNames();
    expect(defs.length).toBe(names.length);
  });
});
