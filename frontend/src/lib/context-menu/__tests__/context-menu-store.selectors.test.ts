/**
 * Tests for context-menu-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { ContextMenuStore } from "../context-menu-store";
import {
  selectIsMenuOpen,
  selectMenuType,
  selectMenuPosition,
  selectMenuTarget,
  selectMessageTarget,
  selectChannelTarget,
  selectUserTarget,
  selectFileTarget,
  selectTextSelectionTarget,
  selectActiveSubmenu,
} from "../context-menu-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<Record<string, unknown>>): ContextMenuStore {
  const defaultState = {
    isOpen: false,
    menuType: null,
    position: null,
    target: null,
    activeSubmenu: null,
    isAnimating: false,
  };
  return { ...defaultState, ...overrides } as unknown as ContextMenuStore;
}

// ---------------------------------------------------------------------------
// selectIsMenuOpen
// ---------------------------------------------------------------------------

describe("selectIsMenuOpen", () => {
  it("returns false by default", () => {
    expect(selectIsMenuOpen(makeState())).toBe(false);
  });

  it("returns true when menu is open", () => {
    expect(selectIsMenuOpen(makeState({ isOpen: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectMenuType
// ---------------------------------------------------------------------------

describe("selectMenuType", () => {
  it("returns null by default", () => {
    expect(selectMenuType(makeState())).toBeNull();
  });

  it("returns the message menu type", () => {
    expect(selectMenuType(makeState({ menuType: "message" }))).toBe("message");
  });

  it("returns the channel menu type", () => {
    expect(selectMenuType(makeState({ menuType: "channel" }))).toBe("channel");
  });

  it("returns the user menu type", () => {
    expect(selectMenuType(makeState({ menuType: "user" }))).toBe("user");
  });
});

// ---------------------------------------------------------------------------
// selectMenuPosition
// ---------------------------------------------------------------------------

describe("selectMenuPosition", () => {
  it("returns null by default", () => {
    expect(selectMenuPosition(makeState())).toBeNull();
  });

  it("returns the menu position when set", () => {
    const position = { x: 100, y: 200 };
    expect(selectMenuPosition(makeState({ position }))).toEqual(position);
  });
});

// ---------------------------------------------------------------------------
// selectMenuTarget
// ---------------------------------------------------------------------------

describe("selectMenuTarget", () => {
  it("returns null by default", () => {
    expect(selectMenuTarget(makeState())).toBeNull();
  });

  it("returns the target when set", () => {
    const target = {
      type: "message",
      messageId: "m1",
      channelId: "c1",
    } as never;
    expect(selectMenuTarget(makeState({ target }))).toBe(target);
  });
});

// ---------------------------------------------------------------------------
// selectMessageTarget
// ---------------------------------------------------------------------------

describe("selectMessageTarget", () => {
  it("returns null when target is null", () => {
    expect(selectMessageTarget(makeState())).toBeNull();
  });

  it("returns the message target when type is message", () => {
    const target = { type: "message", messageId: "m1", channelId: "c1" } as never;
    const result = selectMessageTarget(makeState({ target }));
    expect(result).toBe(target);
  });

  it("returns null when target is a different type", () => {
    const target = { type: "channel", channelId: "c1" } as never;
    expect(selectMessageTarget(makeState({ target }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectChannelTarget
// ---------------------------------------------------------------------------

describe("selectChannelTarget", () => {
  it("returns null when target is null", () => {
    expect(selectChannelTarget(makeState())).toBeNull();
  });

  it("returns the channel target when type is channel", () => {
    const target = { type: "channel", channelId: "c1", name: "general" } as never;
    expect(selectChannelTarget(makeState({ target }))).toBe(target);
  });

  it("returns null when target is a different type", () => {
    const target = { type: "user", userId: "u1" } as never;
    expect(selectChannelTarget(makeState({ target }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectUserTarget
// ---------------------------------------------------------------------------

describe("selectUserTarget", () => {
  it("returns null when target is null", () => {
    expect(selectUserTarget(makeState())).toBeNull();
  });

  it("returns the user target when type is user", () => {
    const target = { type: "user", userId: "u1", username: "alice" } as never;
    expect(selectUserTarget(makeState({ target }))).toBe(target);
  });

  it("returns null when target is a different type", () => {
    const target = { type: "file", fileId: "f1" } as never;
    expect(selectUserTarget(makeState({ target }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectFileTarget
// ---------------------------------------------------------------------------

describe("selectFileTarget", () => {
  it("returns null when target is null", () => {
    expect(selectFileTarget(makeState())).toBeNull();
  });

  it("returns the file target when type is file", () => {
    const target = { type: "file", fileId: "f1", fileName: "doc.pdf" } as never;
    expect(selectFileTarget(makeState({ target }))).toBe(target);
  });

  it("returns null when target is a different type", () => {
    const target = { type: "message", messageId: "m1" } as never;
    expect(selectFileTarget(makeState({ target }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectTextSelectionTarget
// ---------------------------------------------------------------------------

describe("selectTextSelectionTarget", () => {
  it("returns null when target is null", () => {
    expect(selectTextSelectionTarget(makeState())).toBeNull();
  });

  it("returns the text-selection target when type matches", () => {
    const target = { type: "text-selection", text: "hello world" } as never;
    expect(selectTextSelectionTarget(makeState({ target }))).toBe(target);
  });

  it("returns null when target is a different type", () => {
    const target = { type: "channel", channelId: "c1" } as never;
    expect(selectTextSelectionTarget(makeState({ target }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectActiveSubmenu
// ---------------------------------------------------------------------------

describe("selectActiveSubmenu", () => {
  it("returns null by default", () => {
    expect(selectActiveSubmenu(makeState())).toBeNull();
  });

  it("returns the active submenu id when set", () => {
    expect(
      selectActiveSubmenu(makeState({ activeSubmenu: "reactions" })),
    ).toBe("reactions");
  });
});
