/**
 * Tests for mobile-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { MobileState } from "../mobile-store";
import {
  selectSidebarOpen,
  selectActiveView,
  selectCanGoBack,
  selectKeyboardVisible,
  selectKeyboardHeight,
  selectDrawer,
  selectActionSheet,
  selectIsRefreshing,
  selectBottomNavVisible,
  selectUnreadCounts,
  selectTotalUnread,
} from "../mobile-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<Record<string, unknown>>): MobileState {
  const defaultState: MobileState = {
    sidebarOpen: false,
    activeView: "channels",
    previousView: null,
    viewStack: ["channels"],
    keyboardVisible: false,
    keyboardHeight: 0,
    drawer: {
      isOpen: false,
      position: "left",
      content: null,
    },
    actionSheet: {
      isOpen: false,
      options: [],
      onSelect: null,
    },
    isRefreshing: false,
    bottomNavVisible: true,
    unreadCounts: {
      channels: 0,
      messages: 0,
      notifications: 0,
    },
  };
  return { ...defaultState, ...overrides } as unknown as MobileState;
}

// ---------------------------------------------------------------------------
// selectSidebarOpen
// ---------------------------------------------------------------------------

describe("selectSidebarOpen", () => {
  it("returns false by default", () => {
    expect(selectSidebarOpen(makeState())).toBe(false);
  });

  it("returns true when sidebar is open", () => {
    expect(selectSidebarOpen(makeState({ sidebarOpen: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectActiveView
// ---------------------------------------------------------------------------

describe("selectActiveView", () => {
  it("returns channels by default", () => {
    expect(selectActiveView(makeState())).toBe("channels");
  });

  it("returns the active view when set", () => {
    expect(selectActiveView(makeState({ activeView: "dms" }))).toBe("dms");
  });
});

// ---------------------------------------------------------------------------
// selectCanGoBack
// ---------------------------------------------------------------------------

describe("selectCanGoBack", () => {
  it("returns false when viewStack has only one entry", () => {
    expect(selectCanGoBack(makeState({ viewStack: ["channels"] }))).toBe(false);
  });

  it("returns true when viewStack has more than one entry", () => {
    expect(
      selectCanGoBack(makeState({ viewStack: ["channels", "dms"] })),
    ).toBe(true);
  });

  it("returns false when viewStack is empty", () => {
    expect(selectCanGoBack(makeState({ viewStack: [] }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectKeyboardVisible
// ---------------------------------------------------------------------------

describe("selectKeyboardVisible", () => {
  it("returns false by default", () => {
    expect(selectKeyboardVisible(makeState())).toBe(false);
  });

  it("returns true when keyboard is visible", () => {
    expect(selectKeyboardVisible(makeState({ keyboardVisible: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectKeyboardHeight
// ---------------------------------------------------------------------------

describe("selectKeyboardHeight", () => {
  it("returns 0 by default", () => {
    expect(selectKeyboardHeight(makeState())).toBe(0);
  });

  it("returns the keyboard height when set", () => {
    expect(selectKeyboardHeight(makeState({ keyboardHeight: 300 }))).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// selectDrawer
// ---------------------------------------------------------------------------

describe("selectDrawer", () => {
  it("returns closed drawer by default", () => {
    const result = selectDrawer(makeState());
    expect(result.isOpen).toBe(false);
    expect(result.position).toBe("left");
    expect(result.content).toBeNull();
  });

  it("returns the drawer state when set", () => {
    const drawer = { isOpen: true, position: "right" as const, content: null };
    expect(selectDrawer(makeState({ drawer })).isOpen).toBe(true);
    expect(selectDrawer(makeState({ drawer })).position).toBe("right");
  });
});

// ---------------------------------------------------------------------------
// selectActionSheet
// ---------------------------------------------------------------------------

describe("selectActionSheet", () => {
  it("returns closed action sheet by default", () => {
    const result = selectActionSheet(makeState());
    expect(result.isOpen).toBe(false);
    expect(result.options).toEqual([]);
    expect(result.onSelect).toBeNull();
  });

  it("returns open action sheet when set", () => {
    const onSelect = (_i: number) => undefined;
    const actionSheet = {
      isOpen: true,
      options: [{ label: "Delete" }],
      onSelect,
    };
    const result = selectActionSheet(makeState({ actionSheet }));
    expect(result.isOpen).toBe(true);
    expect(result.options).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// selectIsRefreshing
// ---------------------------------------------------------------------------

describe("selectIsRefreshing", () => {
  it("returns false by default", () => {
    expect(selectIsRefreshing(makeState())).toBe(false);
  });

  it("returns true when refreshing", () => {
    expect(selectIsRefreshing(makeState({ isRefreshing: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectBottomNavVisible
// ---------------------------------------------------------------------------

describe("selectBottomNavVisible", () => {
  it("returns true by default", () => {
    expect(selectBottomNavVisible(makeState())).toBe(true);
  });

  it("returns false when bottom nav is hidden", () => {
    expect(selectBottomNavVisible(makeState({ bottomNavVisible: false }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectUnreadCounts
// ---------------------------------------------------------------------------

describe("selectUnreadCounts", () => {
  it("returns zeroed counts by default", () => {
    const result = selectUnreadCounts(makeState());
    expect(result.channels).toBe(0);
    expect(result.messages).toBe(0);
    expect(result.notifications).toBe(0);
  });

  it("returns the unread counts when set", () => {
    const unreadCounts = { channels: 3, messages: 7, notifications: 1 };
    const result = selectUnreadCounts(makeState({ unreadCounts }));
    expect(result.channels).toBe(3);
    expect(result.messages).toBe(7);
    expect(result.notifications).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// selectTotalUnread (derived)
// ---------------------------------------------------------------------------

describe("selectTotalUnread", () => {
  it("returns 0 by default", () => {
    expect(selectTotalUnread(makeState())).toBe(0);
  });

  it("returns sum of all unread counts", () => {
    const unreadCounts = { channels: 3, messages: 7, notifications: 2 };
    expect(selectTotalUnread(makeState({ unreadCounts }))).toBe(12);
  });

  it("handles partial counts correctly", () => {
    const unreadCounts = { channels: 5, messages: 0, notifications: 0 };
    expect(selectTotalUnread(makeState({ unreadCounts }))).toBe(5);
  });
});
