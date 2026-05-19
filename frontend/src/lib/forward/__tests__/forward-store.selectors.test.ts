/**
 * Tests for forward-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { ForwardStore } from "../forward-store";
import {
  selectIsOpen,
  selectMessageToForward,
  selectSelectedDestinations,
  selectSelectedCount,
  selectIsDestinationSelected,
  selectComment,
  selectRecentDestinations,
  selectIsForwarding,
  selectForwardResults,
  selectHasSuccessfulForwards,
  selectHasFailedForwards,
  selectSearchQuery,
  selectCanForward,
} from "../forward-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<Record<string, unknown>>): ForwardStore {
  const defaultState = {
    isOpen: false,
    messageToForward: null,
    selectedDestinations: [],
    comment: "",
    recentDestinations: [],
    isForwarding: false,
    forwardResults: [],
    searchQuery: "",
  };
  return { ...defaultState, ...overrides } as unknown as ForwardStore;
}

// ---------------------------------------------------------------------------
// selectIsOpen
// ---------------------------------------------------------------------------

describe("selectIsOpen", () => {
  it("returns false by default", () => {
    expect(selectIsOpen(makeState())).toBe(false);
  });

  it("returns true when open", () => {
    expect(selectIsOpen(makeState({ isOpen: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectMessageToForward
// ---------------------------------------------------------------------------

describe("selectMessageToForward", () => {
  it("returns null by default", () => {
    expect(selectMessageToForward(makeState())).toBeNull();
  });

  it("returns the message when set", () => {
    const message = { id: "m1", content: "Hello" } as never;
    expect(
      selectMessageToForward(makeState({ messageToForward: message })),
    ).toBe(message);
  });
});

// ---------------------------------------------------------------------------
// selectSelectedDestinations
// ---------------------------------------------------------------------------

describe("selectSelectedDestinations", () => {
  it("returns empty array by default", () => {
    expect(selectSelectedDestinations(makeState())).toEqual([]);
  });

  it("returns the selected destinations array", () => {
    const selectedDestinations = [{ id: "d1", name: "Channel A" } as never];
    expect(
      selectSelectedDestinations(makeState({ selectedDestinations })),
    ).toBe(selectedDestinations);
  });
});

// ---------------------------------------------------------------------------
// selectSelectedCount
// ---------------------------------------------------------------------------

describe("selectSelectedCount", () => {
  it("returns 0 by default", () => {
    expect(selectSelectedCount(makeState())).toBe(0);
  });

  it("returns the count of selected destinations", () => {
    const selectedDestinations = [{ id: "d1" } as never, { id: "d2" } as never];
    expect(selectSelectedCount(makeState({ selectedDestinations }))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectIsDestinationSelected (factory)
// ---------------------------------------------------------------------------

describe("selectIsDestinationSelected", () => {
  it("returns false when no destinations selected", () => {
    expect(selectIsDestinationSelected("d1")(makeState())).toBe(false);
  });

  it("returns true when destination is selected", () => {
    const selectedDestinations = [{ id: "d1", name: "Channel A" } as never];
    expect(
      selectIsDestinationSelected("d1")(makeState({ selectedDestinations })),
    ).toBe(true);
  });

  it("returns false when a different destination is selected", () => {
    const selectedDestinations = [{ id: "d2", name: "Channel B" } as never];
    expect(
      selectIsDestinationSelected("d1")(makeState({ selectedDestinations })),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectComment
// ---------------------------------------------------------------------------

describe("selectComment", () => {
  it("returns empty string by default", () => {
    expect(selectComment(makeState())).toBe("");
  });

  it("returns the comment when set", () => {
    expect(selectComment(makeState({ comment: "Check this out!" }))).toBe(
      "Check this out!",
    );
  });
});

// ---------------------------------------------------------------------------
// selectRecentDestinations
// ---------------------------------------------------------------------------

describe("selectRecentDestinations", () => {
  it("returns empty array by default", () => {
    expect(selectRecentDestinations(makeState())).toEqual([]);
  });

  it("returns the recent destinations array", () => {
    const recentDestinations = [{ id: "d1", name: "Channel A" } as never];
    expect(selectRecentDestinations(makeState({ recentDestinations }))).toBe(
      recentDestinations,
    );
  });
});

// ---------------------------------------------------------------------------
// selectIsForwarding
// ---------------------------------------------------------------------------

describe("selectIsForwarding", () => {
  it("returns false by default", () => {
    expect(selectIsForwarding(makeState())).toBe(false);
  });

  it("returns true when forwarding is in progress", () => {
    expect(selectIsForwarding(makeState({ isForwarding: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectForwardResults
// ---------------------------------------------------------------------------

describe("selectForwardResults", () => {
  it("returns empty array by default", () => {
    expect(selectForwardResults(makeState())).toEqual([]);
  });

  it("returns the forward results array", () => {
    const forwardResults = [{ destinationId: "d1", success: true } as never];
    expect(selectForwardResults(makeState({ forwardResults }))).toBe(
      forwardResults,
    );
  });
});

// ---------------------------------------------------------------------------
// selectHasSuccessfulForwards
// ---------------------------------------------------------------------------

describe("selectHasSuccessfulForwards", () => {
  it("returns false when results are empty", () => {
    expect(selectHasSuccessfulForwards(makeState())).toBe(false);
  });

  it("returns true when at least one forward succeeded", () => {
    const forwardResults = [
      { destinationId: "d1", success: true } as never,
      { destinationId: "d2", success: false } as never,
    ];
    expect(selectHasSuccessfulForwards(makeState({ forwardResults }))).toBe(
      true,
    );
  });

  it("returns false when all forwards failed", () => {
    const forwardResults = [{ destinationId: "d1", success: false } as never];
    expect(selectHasSuccessfulForwards(makeState({ forwardResults }))).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// selectHasFailedForwards
// ---------------------------------------------------------------------------

describe("selectHasFailedForwards", () => {
  it("returns false when results are empty", () => {
    expect(selectHasFailedForwards(makeState())).toBe(false);
  });

  it("returns true when at least one forward failed", () => {
    const forwardResults = [{ destinationId: "d1", success: false } as never];
    expect(selectHasFailedForwards(makeState({ forwardResults }))).toBe(true);
  });

  it("returns false when all forwards succeeded", () => {
    const forwardResults = [{ destinationId: "d1", success: true } as never];
    expect(selectHasFailedForwards(makeState({ forwardResults }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectSearchQuery
// ---------------------------------------------------------------------------

describe("selectSearchQuery", () => {
  it("returns empty string by default", () => {
    expect(selectSearchQuery(makeState())).toBe("");
  });

  it("returns the current search query", () => {
    expect(selectSearchQuery(makeState({ searchQuery: "general" }))).toBe(
      "general",
    );
  });
});

// ---------------------------------------------------------------------------
// selectCanForward
// ---------------------------------------------------------------------------

describe("selectCanForward", () => {
  it("returns false when no destinations selected", () => {
    const message = { id: "m1" } as never;
    expect(
      selectCanForward(
        makeState({ messageToForward: message, selectedDestinations: [] }),
      ),
    ).toBe(false);
  });

  it("returns false when message is null", () => {
    const selectedDestinations = [{ id: "d1" } as never];
    expect(
      selectCanForward(
        makeState({ messageToForward: null, selectedDestinations }),
      ),
    ).toBe(false);
  });

  it("returns false when forwarding is in progress", () => {
    const selectedDestinations = [{ id: "d1" } as never];
    const message = { id: "m1" } as never;
    expect(
      selectCanForward(
        makeState({
          messageToForward: message,
          selectedDestinations,
          isForwarding: true,
        }),
      ),
    ).toBe(false);
  });

  it("returns true when destinations selected, message set, and not forwarding", () => {
    const selectedDestinations = [{ id: "d1" } as never];
    const message = { id: "m1" } as never;
    expect(
      selectCanForward(
        makeState({
          messageToForward: message,
          selectedDestinations,
          isForwarding: false,
        }),
      ),
    ).toBe(true);
  });
});
