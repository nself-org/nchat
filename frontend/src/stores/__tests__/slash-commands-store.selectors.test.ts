/**
 * Tests for slash-commands-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  SlashCommandsStore,
  SlashCommandsState,
} from "../slash-commands-store";
import {
  selectAllCommands,
  selectEnabledCommands,
  selectBuiltInCommands,
  selectCustomCommands,
  selectCommandById,
  selectCommandByTrigger,
  selectFilteredCommands,
  selectIsEditing,
  selectEditingCommand,
  selectRecentExecutions,
} from "../slash-commands-store";

import type { SlashCommand } from "@/lib/slash-commands/command-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCommand(
  overrides?: Partial<SlashCommand>,
): SlashCommand {
  return {
    id: "cmd1",
    trigger: "/hello",
    name: "Hello",
    description: "Say hello",
    category: "general" as never,
    isEnabled: true,
    isBuiltIn: true,
    handler: async () => ({ success: true }),
    ...overrides,
  } as SlashCommand;
}

function makeState(overrides?: Partial<SlashCommandsState>): SlashCommandsStore {
  const defaultState: SlashCommandsState = {
    commands: new Map(),
    commandsByTrigger: new Map(),
    builtInCommands: [],
    customCommands: [],
    editingCommand: null,
    isLoading: false,
    error: null,
    executionHistory: [],
    searchQuery: "",
    selectedCategory: "all",
  };
  return { ...defaultState, ...overrides } as unknown as SlashCommandsStore;
}

// ---------------------------------------------------------------------------
// selectAllCommands
// ---------------------------------------------------------------------------

describe("selectAllCommands", () => {
  it("returns empty array when commands map is empty", () => {
    expect(selectAllCommands(makeState())).toEqual([]);
  });

  it("returns all commands as an array", () => {
    const cmd1 = makeCommand({ id: "cmd1" });
    const cmd2 = makeCommand({ id: "cmd2", trigger: "/bye", name: "Bye" });
    const commands = new Map([
      ["cmd1", cmd1],
      ["cmd2", cmd2],
    ]);
    const result = selectAllCommands(makeState({ commands }));
    expect(result).toHaveLength(2);
    expect(result).toContain(cmd1);
    expect(result).toContain(cmd2);
  });
});

// ---------------------------------------------------------------------------
// selectEnabledCommands
// ---------------------------------------------------------------------------

describe("selectEnabledCommands", () => {
  it("returns empty array when commands map is empty", () => {
    expect(selectEnabledCommands(makeState())).toEqual([]);
  });

  it("returns only enabled commands", () => {
    const enabled = makeCommand({ id: "enabled", isEnabled: true });
    const disabled = makeCommand({ id: "disabled", trigger: "/off", isEnabled: false });
    const commands = new Map([
      ["enabled", enabled],
      ["disabled", disabled],
    ]);
    const result = selectEnabledCommands(makeState({ commands }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(enabled);
  });

  it("returns all commands when all are enabled", () => {
    const cmd1 = makeCommand({ id: "cmd1", isEnabled: true });
    const cmd2 = makeCommand({ id: "cmd2", trigger: "/b", isEnabled: true });
    const commands = new Map([["cmd1", cmd1], ["cmd2", cmd2]]);
    expect(selectEnabledCommands(makeState({ commands }))).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// selectBuiltInCommands
// ---------------------------------------------------------------------------

describe("selectBuiltInCommands", () => {
  it("returns empty array by default", () => {
    expect(selectBuiltInCommands(makeState())).toEqual([]);
  });

  it("returns the builtInCommands array", () => {
    const builtInCommands = [makeCommand({ id: "b1" }), makeCommand({ id: "b2", trigger: "/b2" })];
    expect(selectBuiltInCommands(makeState({ builtInCommands }))).toBe(builtInCommands);
  });
});

// ---------------------------------------------------------------------------
// selectCustomCommands
// ---------------------------------------------------------------------------

describe("selectCustomCommands", () => {
  it("returns empty array by default", () => {
    expect(selectCustomCommands(makeState())).toEqual([]);
  });

  it("returns the customCommands array", () => {
    const customCommands = [makeCommand({ id: "c1", isBuiltIn: false })];
    expect(selectCustomCommands(makeState({ customCommands }))).toBe(customCommands);
  });
});

// ---------------------------------------------------------------------------
// selectCommandById (factory)
// ---------------------------------------------------------------------------

describe("selectCommandById", () => {
  it("returns undefined when commands map is empty", () => {
    expect(selectCommandById("cmd1")(makeState())).toBeUndefined();
  });

  it("returns the command when found", () => {
    const cmd = makeCommand({ id: "cmd1" });
    const commands = new Map([["cmd1", cmd]]);
    expect(selectCommandById("cmd1")(makeState({ commands }))).toBe(cmd);
  });

  it("returns undefined for a non-existent id", () => {
    const cmd = makeCommand({ id: "cmd1" });
    const commands = new Map([["cmd1", cmd]]);
    expect(selectCommandById("missing")(makeState({ commands }))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// selectCommandByTrigger (factory)
// ---------------------------------------------------------------------------

describe("selectCommandByTrigger", () => {
  it("returns undefined when commandsByTrigger map is empty", () => {
    expect(selectCommandByTrigger("/hello")(makeState())).toBeUndefined();
  });

  it("returns the command when trigger matches (lowercase)", () => {
    const cmd = makeCommand({ id: "cmd1", trigger: "/hello" });
    const commandsByTrigger = new Map([["/hello", cmd]]);
    expect(selectCommandByTrigger("/hello")(makeState({ commandsByTrigger }))).toBe(cmd);
  });

  it("lowercases the trigger before lookup", () => {
    const cmd = makeCommand({ id: "cmd1", trigger: "/hello" });
    const commandsByTrigger = new Map([["/hello", cmd]]);
    expect(selectCommandByTrigger("/HELLO")(makeState({ commandsByTrigger }))).toBe(cmd);
  });

  it("returns undefined for non-matching trigger", () => {
    const cmd = makeCommand({ id: "cmd1", trigger: "/hello" });
    const commandsByTrigger = new Map([["/hello", cmd]]);
    expect(selectCommandByTrigger("/bye")(makeState({ commandsByTrigger }))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// selectFilteredCommands
// ---------------------------------------------------------------------------

describe("selectFilteredCommands", () => {
  it("returns empty array when commands map is empty", () => {
    expect(selectFilteredCommands(makeState())).toEqual([]);
  });

  it("returns all commands when selectedCategory is all and no searchQuery", () => {
    const cmd1 = makeCommand({ id: "cmd1", name: "Apple" });
    const cmd2 = makeCommand({ id: "cmd2", trigger: "/b", name: "Banana" });
    const commands = new Map([["cmd1", cmd1], ["cmd2", cmd2]]);
    const result = selectFilteredCommands(makeState({ commands }));
    expect(result).toHaveLength(2);
  });

  it("filters by category when selectedCategory is not all", () => {
    const general = makeCommand({ id: "g", category: "general" as never });
    const media = makeCommand({ id: "m", trigger: "/m", category: "media" as never });
    const commands = new Map([["g", general], ["m", media]]);
    const result = selectFilteredCommands(
      makeState({ commands, selectedCategory: "general" as never }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(general);
  });

  it("filters by searchQuery against trigger", () => {
    const cmd1 = makeCommand({ id: "c1", trigger: "/giphy", name: "Giphy" });
    const cmd2 = makeCommand({ id: "c2", trigger: "/bold", name: "Bold" });
    const commands = new Map([["c1", cmd1], ["c2", cmd2]]);
    const result = selectFilteredCommands(
      makeState({ commands, searchQuery: "giphy" }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(cmd1);
  });

  it("filters by searchQuery against name", () => {
    const cmd1 = makeCommand({ id: "c1", trigger: "/x", name: "Upload File", description: "d" });
    const cmd2 = makeCommand({ id: "c2", trigger: "/y", name: "Bold Text", description: "d" });
    const commands = new Map([["c1", cmd1], ["c2", cmd2]]);
    const result = selectFilteredCommands(
      makeState({ commands, searchQuery: "upload" }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(cmd1);
  });

  it("sorts by order ascending then by name", () => {
    const cmd1 = makeCommand({ id: "c1", name: "B", order: 2 } as never);
    const cmd2 = makeCommand({ id: "c2", trigger: "/c2", name: "A", order: 1 } as never);
    const cmd3 = makeCommand({ id: "c3", trigger: "/c3", name: "C" });
    const commands = new Map([["c1", cmd1], ["c2", cmd2], ["c3", cmd3]]);
    const result = selectFilteredCommands(makeState({ commands }));
    // cmd3 has no order — goes last after ordered commands
    expect(result[0]).toBe(cmd2); // order=1
    expect(result[1]).toBe(cmd1); // order=2
  });
});

// ---------------------------------------------------------------------------
// selectIsEditing
// ---------------------------------------------------------------------------

describe("selectIsEditing", () => {
  it("returns false when editingCommand is null", () => {
    expect(selectIsEditing(makeState({ editingCommand: null }))).toBe(false);
  });

  it("returns true when editingCommand is set", () => {
    expect(
      selectIsEditing(makeState({ editingCommand: { trigger: "/test" } as never })),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectEditingCommand
// ---------------------------------------------------------------------------

describe("selectEditingCommand", () => {
  it("returns null by default", () => {
    expect(selectEditingCommand(makeState())).toBeNull();
  });

  it("returns the editingCommand when set", () => {
    const editingCommand = { trigger: "/test", name: "Test" } as never;
    expect(selectEditingCommand(makeState({ editingCommand }))).toBe(editingCommand);
  });
});

// ---------------------------------------------------------------------------
// selectRecentExecutions (factory)
// ---------------------------------------------------------------------------

describe("selectRecentExecutions", () => {
  it("returns empty array when executionHistory is empty", () => {
    expect(selectRecentExecutions()(makeState())).toEqual([]);
  });

  it("returns up to 10 items by default", () => {
    const history = Array.from({ length: 15 }, (_, i) => ({ id: `e${i}` } as never));
    const result = selectRecentExecutions()(makeState({ executionHistory: history }));
    expect(result).toHaveLength(10);
  });

  it("returns up to the specified count", () => {
    const history = Array.from({ length: 15 }, (_, i) => ({ id: `e${i}` } as never));
    const result = selectRecentExecutions(5)(makeState({ executionHistory: history }));
    expect(result).toHaveLength(5);
  });

  it("returns the first N items in order", () => {
    const history = [
      { id: "e0" } as never,
      { id: "e1" } as never,
      { id: "e2" } as never,
    ];
    const result = selectRecentExecutions(2)(makeState({ executionHistory: history }));
    expect(result).toEqual([{ id: "e0" }, { id: "e1" }]);
  });
});
