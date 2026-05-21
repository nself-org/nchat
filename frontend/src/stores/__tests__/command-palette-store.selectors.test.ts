/**
 * Tests for command-palette-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { CommandPaletteStore } from "../command-palette-store";
import type { CommandPaletteState } from "@/lib/command-palette/command-types";
import {
  selectIsOpen,
  selectQuery,
  selectMode,
  selectSelectedIndex,
  selectSelectedCommand,
  selectFilteredCommands,
  selectRecentCommands,
  selectIsLoading,
  selectError,
  selectShowRecent,
  selectHasResults,
} from "../command-palette-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(
  overrides?: Partial<CommandPaletteState>,
): CommandPaletteStore {
  const defaultState: CommandPaletteState = {
    isOpen: false,
    query: "",
    mode: "all",
    selectedIndex: 0,
    isLoading: false,
    error: null,
    filteredCommands: [],
    recentCommands: [],
    showRecent: true,
  };
  return { ...defaultState, ...overrides } as unknown as CommandPaletteStore;
}

// ---------------------------------------------------------------------------
// selectIsOpen
// ---------------------------------------------------------------------------

describe("selectIsOpen", () => {
  it("returns false by default", () => {
    expect(selectIsOpen(makeState())).toBe(false);
  });

  it("returns true when palette is open", () => {
    expect(selectIsOpen(makeState({ isOpen: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectQuery
// ---------------------------------------------------------------------------

describe("selectQuery", () => {
  it("returns empty string by default", () => {
    expect(selectQuery(makeState())).toBe("");
  });

  it("returns the query string", () => {
    expect(selectQuery(makeState({ query: "#general" }))).toBe("#general");
  });
});

// ---------------------------------------------------------------------------
// selectMode
// ---------------------------------------------------------------------------

describe("selectMode", () => {
  it("returns all by default", () => {
    expect(selectMode(makeState())).toBe("all");
  });

  it("returns the current mode", () => {
    expect(selectMode(makeState({ mode: "channels" }))).toBe("channels");
  });
});

// ---------------------------------------------------------------------------
// selectSelectedIndex
// ---------------------------------------------------------------------------

describe("selectSelectedIndex", () => {
  it("returns 0 by default", () => {
    expect(selectSelectedIndex(makeState())).toBe(0);
  });

  it("returns the current selected index", () => {
    expect(selectSelectedIndex(makeState({ selectedIndex: 3 }))).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// selectSelectedCommand
// ---------------------------------------------------------------------------

describe("selectSelectedCommand", () => {
  it("returns null when filteredCommands is empty", () => {
    expect(selectSelectedCommand(makeState())).toBeNull();
  });

  it("returns the command at selectedIndex", () => {
    const cmd0 = { id: "c0", name: "First" } as never;
    const cmd1 = { id: "c1", name: "Second" } as never;
    const result = selectSelectedCommand(
      makeState({
        filteredCommands: [cmd0, cmd1],
        selectedIndex: 1,
      }),
    );
    expect(result).toBe(cmd1);
  });

  it("returns null when selectedIndex is out of bounds", () => {
    const cmd0 = { id: "c0", name: "Only" } as never;
    const result = selectSelectedCommand(
      makeState({
        filteredCommands: [cmd0],
        selectedIndex: 5,
      }),
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectFilteredCommands
// ---------------------------------------------------------------------------

describe("selectFilteredCommands", () => {
  it("returns empty array by default", () => {
    expect(selectFilteredCommands(makeState())).toEqual([]);
  });

  it("returns the filteredCommands array", () => {
    const filteredCommands = [{ id: "c1", name: "Go to channel" } as never];
    expect(selectFilteredCommands(makeState({ filteredCommands }))).toBe(
      filteredCommands,
    );
  });
});

// ---------------------------------------------------------------------------
// selectRecentCommands
// ---------------------------------------------------------------------------

describe("selectRecentCommands", () => {
  it("returns empty array by default", () => {
    expect(selectRecentCommands(makeState())).toEqual([]);
  });

  it("returns the recentCommands array", () => {
    const recentCommands = [{ id: "r1", name: "Recent action" } as never];
    expect(selectRecentCommands(makeState({ recentCommands }))).toBe(
      recentCommands,
    );
  });
});

// ---------------------------------------------------------------------------
// selectIsLoading
// ---------------------------------------------------------------------------

describe("selectIsLoading", () => {
  it("returns false by default", () => {
    expect(selectIsLoading(makeState())).toBe(false);
  });

  it("returns true when loading", () => {
    expect(selectIsLoading(makeState({ isLoading: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectError
// ---------------------------------------------------------------------------

describe("selectError", () => {
  it("returns null by default", () => {
    expect(selectError(makeState())).toBeNull();
  });

  it("returns the error string when set", () => {
    expect(selectError(makeState({ error: "Search failed" }))).toBe(
      "Search failed",
    );
  });
});

// ---------------------------------------------------------------------------
// selectShowRecent
// ---------------------------------------------------------------------------

describe("selectShowRecent", () => {
  it("returns true by default", () => {
    expect(selectShowRecent(makeState())).toBe(true);
  });

  it("returns false when showRecent is disabled", () => {
    expect(selectShowRecent(makeState({ showRecent: false }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectHasResults
// ---------------------------------------------------------------------------

describe("selectHasResults", () => {
  it("returns false when filteredCommands is empty", () => {
    expect(selectHasResults(makeState())).toBe(false);
  });

  it("returns true when there are filtered commands", () => {
    const filteredCommands = [{ id: "c1" } as never, { id: "c2" } as never];
    expect(selectHasResults(makeState({ filteredCommands }))).toBe(true);
  });
});
