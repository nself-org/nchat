/**
 * Unit tests for command-registry.
 */
import {
  initializeRegistry,
  resetRegistry,
  registerCommand,
  unregisterCommand,
  registerCustomCommands,
  clearCustomCommands,
  getCommandById,
  getCommandByTrigger,
  getAllCommands,
  getBuiltInCommands,
  getCustomCommands,
  getCommandsByCategory,
  getCategoriesWithCommands,
  searchCommands,
  getCommandSuggestions,
  canUserUseCommand,
  canUseCommandInChannel,
} from "../command-registry";

import type { SlashCommand } from "../command-types";

function makeCmd(overrides: Partial<SlashCommand> = {}): SlashCommand {
  return {
    id: "c-custom",
    trigger: "custom",
    name: "Custom",
    description: "Custom command",
    category: "custom",
    arguments: [],
    permissions: { minRole: "member", allowGuests: false },
    channels: {
      allowedTypes: ["public", "private", "direct", "group"],
      allowInThreads: true,
    },
    responseConfig: { type: "ephemeral", ephemeral: true, showTyping: false },
    actionType: "message",
    action: { type: "message" },
    isEnabled: true,
    isBuiltIn: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "test",
    ...overrides,
  } as SlashCommand;
}

describe("Registry — init + reset", () => {
  beforeEach(() => resetRegistry());

  it("initializeRegistry loads built-ins", () => {
    initializeRegistry();
    const help = getCommandByTrigger("help");
    expect(help).toBeDefined();
    expect(help?.isBuiltIn).toBe(true);
  });

  it("getCommandByTrigger is case-insensitive", () => {
    expect(getCommandByTrigger("HELP")).toBeDefined();
    expect(getCommandByTrigger("Help")).toBeDefined();
  });

  it("resetRegistry clears state", () => {
    initializeRegistry();
    resetRegistry();
    expect(getCommandById("builtin-help")).toBeUndefined();
  });

  it("resolves built-in aliases", () => {
    expect(getCommandByTrigger("?")?.id).toBe("builtin-help");
    expect(getCommandByTrigger("commands")?.id).toBe("builtin-help");
  });
});

describe("Registry — registration", () => {
  beforeEach(() => resetRegistry());

  it("registerCommand adds by id + trigger", () => {
    const cmd = makeCmd({ id: "c1", trigger: "t1" });
    expect(registerCommand(cmd)).toBe(true);
    expect(getCommandById("c1")).toBe(cmd);
    expect(getCommandByTrigger("t1")).toBe(cmd);
  });

  it("registerCommand rejects duplicate non-builtin trigger", () => {
    registerCommand(makeCmd({ id: "a", trigger: "dup" }));
    const res = registerCommand(makeCmd({ id: "b", trigger: "dup" }));
    expect(res).toBe(false);
  });

  it("custom command can override built-in trigger", () => {
    initializeRegistry();
    const custom = makeCmd({
      id: "my-help",
      trigger: "help",
      description: "Override",
    });
    expect(registerCommand(custom, true)).toBe(true);
    expect(getCommandByTrigger("help")?.id).toBe("my-help");
  });

  it("registers aliases into trigger map", () => {
    const cmd = makeCmd({ id: "c2", trigger: "tr", aliases: ["al1", "al2"] });
    registerCommand(cmd);
    expect(getCommandByTrigger("al1")).toBe(cmd);
    expect(getCommandByTrigger("al2")).toBe(cmd);
  });

  it("unregisterCommand removes custom command and its aliases", () => {
    const cmd = makeCmd({ id: "c3", trigger: "ttt", aliases: ["a3"] });
    registerCommand(cmd);
    expect(unregisterCommand("c3")).toBe(true);
    expect(getCommandById("c3")).toBeUndefined();
    expect(getCommandByTrigger("a3")).toBeUndefined();
  });

  it("unregisterCommand rejects built-ins", () => {
    initializeRegistry();
    expect(unregisterCommand("builtin-help")).toBe(false);
  });

  it("registerCustomCommands batches in", () => {
    registerCustomCommands([
      makeCmd({ id: "b1", trigger: "b1" }),
      makeCmd({ id: "b2", trigger: "b2" }),
    ]);
    expect(getCustomCommands().length).toBeGreaterThanOrEqual(2);
  });

  it("clearCustomCommands removes all custom but keeps built-ins", () => {
    initializeRegistry();
    registerCommand(makeCmd({ id: "keep-me", trigger: "keepme" }), true);
    clearCustomCommands();
    expect(getCommandById("keep-me")).toBeUndefined();
    expect(getCommandById("builtin-help")).toBeDefined();
  });
});

describe("Registry — retrieval", () => {
  beforeEach(() => resetRegistry());

  it("getAllCommands filters disabled", () => {
    initializeRegistry();
    registerCommand(
      makeCmd({ id: "disabled", trigger: "dis", isEnabled: false }),
    );
    const all = getAllCommands();
    expect(all.find((c) => c.id === "disabled")).toBeUndefined();
  });

  it("getBuiltInCommands only returns built-ins", () => {
    initializeRegistry();
    const bi = getBuiltInCommands();
    expect(bi.every((c) => c.isBuiltIn)).toBe(true);
    expect(bi.length).toBeGreaterThan(0);
  });

  it("getCommandsByCategory returns only matching category", () => {
    initializeRegistry();
    const fun = getCommandsByCategory("fun");
    expect(fun.every((c) => c.category === "fun")).toBe(true);
    expect(fun.length).toBeGreaterThan(0);
  });

  it("getCategoriesWithCommands lists only non-empty categories in fixed order", () => {
    initializeRegistry();
    const result = getCategoriesWithCommands();
    expect(result.length).toBeGreaterThan(0);
    result.forEach((g) => expect(g.commands.length).toBeGreaterThan(0));
  });
});

describe("Registry — search", () => {
  beforeEach(() => resetRegistry());

  it("exact trigger match scores highest", () => {
    initializeRegistry();
    const results = searchCommands("help");
    expect(results[0].command.trigger).toBe("help");
    expect(results[0].score).toBeGreaterThanOrEqual(100);
  });

  it("prefix match scores above contains match", () => {
    initializeRegistry();
    const results = searchCommands("hel", { limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].command.trigger.startsWith("hel")).toBe(true);
  });

  it("respects category filter", () => {
    initializeRegistry();
    const results = searchCommands("s", { category: "moderation" });
    results.forEach((r) => expect(r.command.category).toBe("moderation"));
  });

  it("respects limit option", () => {
    initializeRegistry();
    expect(searchCommands("", { limit: 3 }).length).toBeLessThanOrEqual(3);
  });
});

describe("Registry — suggestions", () => {
  beforeEach(() => resetRegistry());

  it("leading slash is stripped", () => {
    initializeRegistry();
    const a = getCommandSuggestions("/help");
    const b = getCommandSuggestions("help");
    expect(a[0].command.id).toBe(b[0].command.id);
  });

  it("filters by channelType", () => {
    initializeRegistry();
    const results = getCommandSuggestions("", { channelType: "direct" });
    results.forEach((r) =>
      expect(r.command.channels.allowedTypes).toContain("direct"),
    );
  });

  it("filters by userRole hierarchy", () => {
    initializeRegistry();
    const guestResults = getCommandSuggestions("", {
      userRole: "guest",
      limit: 100,
    });
    guestResults.forEach((r) =>
      expect(["guest"]).toContain(r.command.permissions.minRole),
    );
  });

  it("ranks exact trigger match above prefix match", () => {
    initializeRegistry();
    const results = getCommandSuggestions("help");
    expect(results[0].command.trigger).toBe("help");
  });
});

describe("canUserUseCommand", () => {
  const baseCmd = makeCmd({
    permissions: { minRole: "moderator", allowGuests: false },
  });

  it("allows user meeting min role", () => {
    expect(canUserUseCommand(baseCmd, "moderator", "u1").allowed).toBe(true);
    expect(canUserUseCommand(baseCmd, "admin", "u1").allowed).toBe(true);
  });

  it("denies user below min role", () => {
    const r = canUserUseCommand(baseCmd, "member", "u1");
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/moderator/);
  });

  it("denied users always blocked", () => {
    const cmd = makeCmd({
      permissions: {
        minRole: "guest",
        allowGuests: true,
        deniedUsers: ["blocked"],
      },
    });
    expect(canUserUseCommand(cmd, "admin", "blocked").allowed).toBe(false);
  });

  it("allowed users bypass role check", () => {
    const cmd = makeCmd({
      permissions: {
        minRole: "admin",
        allowGuests: false,
        allowedUsers: ["special"],
      },
    });
    expect(canUserUseCommand(cmd, "member", "special").allowed).toBe(true);
  });

  it("blocks guest when allowGuests false", () => {
    const cmd = makeCmd({
      permissions: { minRole: "guest", allowGuests: false },
    });
    expect(canUserUseCommand(cmd, "guest", "u").allowed).toBe(false);
  });

  it("allows guest when allowGuests true", () => {
    const cmd = makeCmd({
      permissions: { minRole: "guest", allowGuests: true },
    });
    expect(canUserUseCommand(cmd, "guest", "u").allowed).toBe(true);
  });
});

describe("canUseCommandInChannel", () => {
  const cmd = makeCmd({
    channels: { allowedTypes: ["public", "private"], allowInThreads: false },
  });

  it("allows supported channel type", () => {
    expect(canUseCommandInChannel(cmd, "c1", "public", false).allowed).toBe(
      true,
    );
  });

  it("blocks unsupported channel type", () => {
    const r = canUseCommandInChannel(cmd, "c1", "direct", false);
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain("direct");
  });

  it("rejects thread use when disabled", () => {
    const r = canUseCommandInChannel(cmd, "c1", "public", true);
    expect(r.allowed).toBe(false);
  });

  it("allowedChannels whitelist blocks non-members", () => {
    const cmd2 = makeCmd({
      channels: {
        allowedTypes: ["public"],
        allowInThreads: true,
        allowedChannels: ["alpha"],
      },
    });
    expect(canUseCommandInChannel(cmd2, "beta", "public", false).allowed).toBe(
      false,
    );
    expect(canUseCommandInChannel(cmd2, "alpha", "public", false).allowed).toBe(
      true,
    );
  });

  it("blockedChannels blocks specific IDs", () => {
    const cmd3 = makeCmd({
      channels: {
        allowedTypes: ["public"],
        allowInThreads: true,
        blockedChannels: ["bad"],
      },
    });
    expect(canUseCommandInChannel(cmd3, "bad", "public", false).allowed).toBe(
      false,
    );
    expect(canUseCommandInChannel(cmd3, "good", "public", false).allowed).toBe(
      true,
    );
  });
});
