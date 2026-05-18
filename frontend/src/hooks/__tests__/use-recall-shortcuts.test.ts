/**
 * useRecallShortcuts Hook Tests
 *
 * Tests for keyboard shortcuts for quick recall features.
 */

import { renderHook, act } from "@testing-library/react";
import { useRecallShortcuts, formatShortcut } from "../use-recall-shortcuts";
import { useStarStore } from "@/stores/star-store";
import { useSavedStore } from "@/stores/saved-store";
import { usePinnedStore } from "@/stores/pinned-store";
import { useBookmarkStore } from "@/lib/bookmarks/bookmark-store";

// Mock stores
jest.mock("@/stores/star-store", () => ({
  useStarStore: jest.fn(),
}));

jest.mock("@/stores/saved-store", () => ({
  useSavedStore: jest.fn(),
}));

jest.mock("@/stores/pinned-store", () => ({
  usePinnedStore: jest.fn(),
}));

jest.mock("@/lib/bookmarks/bookmark-store", () => ({
  useBookmarkStore: jest.fn(),
}));

// ============================================================================
// Test Setup
// ============================================================================

const mockStarStore = {
  togglePanel: jest.fn(),
};

const mockSavedStore = {
  togglePanel: jest.fn(),
};

const mockPinnedStore = {
  togglePanel: jest.fn(),
  getPinnedMessages: jest.fn().mockReturnValue([]),
};

const mockBookmarkStore = {
  togglePanel: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (useStarStore as jest.Mock).mockReturnValue(mockStarStore);
  (useSavedStore as jest.Mock).mockReturnValue(mockSavedStore);
  (usePinnedStore as jest.Mock).mockReturnValue(mockPinnedStore);
  (useBookmarkStore as jest.Mock).mockReturnValue(mockBookmarkStore);
});

// Helper to create keyboard events
function createKeyboardEvent(
  key: string,
  modifiers: Partial<KeyboardEvent> = {},
): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    ...modifiers,
  });
}

// ============================================================================
// Hook Tests
// ============================================================================

describe("useRecallShortcuts", () => {
  it("should return shortcuts array", () => {
    const { result } = renderHook(() => useRecallShortcuts());

    expect(result.current.shortcuts).toBeDefined();
    expect(Array.isArray(result.current.shortcuts)).toBe(true);
    expect(result.current.shortcuts.length).toBeGreaterThan(0);
  });

  it("should register event listener when enabled", () => {
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");

    renderHook(() => useRecallShortcuts({ enabled: true }));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
  });

  it("should not register event listener when disabled", () => {
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");

    renderHook(() => useRecallShortcuts({ enabled: false }));

    // Should not have been called with keydown
    const keydownCalls = addEventListenerSpy.mock.calls.filter(
      (call) => call[0] === "keydown",
    );
    expect(keydownCalls).toHaveLength(0);

    addEventListenerSpy.mockRestore();
  });

  it("should cleanup event listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useRecallShortcuts({ enabled: true }));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
  });

  describe("keyboard shortcuts", () => {
    it("should toggle star panel on Ctrl+G", () => {
      renderHook(() => useRecallShortcuts({ enabled: true }));

      act(() => {
        window.dispatchEvent(createKeyboardEvent("g", { ctrlKey: true }));
      });

      expect(mockStarStore.togglePanel).toHaveBeenCalled();
    });

    it("should toggle saved panel on Ctrl+Shift+G", () => {
      renderHook(() => useRecallShortcuts({ enabled: true }));

      act(() => {
        window.dispatchEvent(
          createKeyboardEvent("g", { ctrlKey: true, shiftKey: true }),
        );
      });

      expect(mockSavedStore.togglePanel).toHaveBeenCalled();
    });

    it("should toggle pinned panel on Alt+P", () => {
      renderHook(() =>
        useRecallShortcuts({ enabled: true, channelId: "channel-1" }),
      );

      act(() => {
        window.dispatchEvent(createKeyboardEvent("p", { altKey: true }));
      });

      expect(mockPinnedStore.togglePanel).toHaveBeenCalled();
    });

    it("should toggle bookmarks panel on Alt+B", () => {
      renderHook(() => useRecallShortcuts({ enabled: true }));

      act(() => {
        window.dispatchEvent(createKeyboardEvent("b", { altKey: true }));
      });

      expect(mockBookmarkStore.togglePanel).toHaveBeenCalled();
    });

    it("should call onStarMessage when Ctrl+Shift+S is pressed", () => {
      const onStarMessage = jest.fn();

      renderHook(() =>
        useRecallShortcuts({
          enabled: true,
          selectedMessageId: "msg-1",
          onStarMessage,
        }),
      );

      act(() => {
        window.dispatchEvent(
          createKeyboardEvent("s", { ctrlKey: true, shiftKey: true }),
        );
      });

      expect(onStarMessage).toHaveBeenCalledWith("msg-1");
    });

    it("should call onBookmarkMessage when Ctrl+Shift+B is pressed", () => {
      const onBookmarkMessage = jest.fn();

      renderHook(() =>
        useRecallShortcuts({
          enabled: true,
          selectedMessageId: "msg-1",
          onBookmarkMessage,
        }),
      );

      act(() => {
        window.dispatchEvent(
          createKeyboardEvent("b", { ctrlKey: true, shiftKey: true }),
        );
      });

      expect(onBookmarkMessage).toHaveBeenCalledWith("msg-1");
    });

    it("should call onSaveMessage when Alt+S is pressed", () => {
      const onSaveMessage = jest.fn();

      renderHook(() =>
        useRecallShortcuts({
          enabled: true,
          selectedMessageId: "msg-1",
          onSaveMessage,
        }),
      );

      act(() => {
        window.dispatchEvent(createKeyboardEvent("s", { altKey: true }));
      });

      expect(onSaveMessage).toHaveBeenCalledWith("msg-1");
    });

    it("should call onPinMessage when Ctrl+Shift+P is pressed", () => {
      const onPinMessage = jest.fn();

      renderHook(() =>
        useRecallShortcuts({
          enabled: true,
          selectedMessageId: "msg-1",
          channelId: "channel-1",
          onPinMessage,
        }),
      );

      act(() => {
        window.dispatchEvent(
          createKeyboardEvent("p", { ctrlKey: true, shiftKey: true }),
        );
      });

      expect(onPinMessage).toHaveBeenCalledWith("msg-1");
    });

    it("should not trigger shortcut without selected message", () => {
      const onStarMessage = jest.fn();

      renderHook(() =>
        useRecallShortcuts({
          enabled: true,
          selectedMessageId: undefined, // No message selected
          onStarMessage,
        }),
      );

      act(() => {
        window.dispatchEvent(
          createKeyboardEvent("s", { ctrlKey: true, shiftKey: true }),
        );
      });

      expect(onStarMessage).not.toHaveBeenCalled();
    });
  });

  describe("input field handling", () => {
    it("should not trigger shortcuts when typing in input", () => {
      const onStarMessage = jest.fn();

      renderHook(() =>
        useRecallShortcuts({
          enabled: true,
          selectedMessageId: "msg-1",
          onStarMessage,
        }),
      );

      // Create an input element
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      // Create event with input as target
      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      Object.defineProperty(event, "target", { value: input });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(onStarMessage).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it("should not trigger shortcuts when typing in textarea", () => {
      const onStarMessage = jest.fn();

      renderHook(() =>
        useRecallShortcuts({
          enabled: true,
          selectedMessageId: "msg-1",
          onStarMessage,
        }),
      );

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);
      textarea.focus();

      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      Object.defineProperty(event, "target", { value: textarea });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(onStarMessage).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it("should not trigger shortcuts in contenteditable", () => {
      const onStarMessage = jest.fn();

      renderHook(() =>
        useRecallShortcuts({
          enabled: true,
          selectedMessageId: "msg-1",
          onStarMessage,
        }),
      );

      const div = document.createElement("div");
      div.contentEditable = "true";
      document.body.appendChild(div);
      div.focus();

      // For contenteditable, we need to check the isContentEditable property
      // The hook checks target.isContentEditable, which is set when contentEditable='true'
      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });

      // Create a mock target that properly simulates contenteditable
      const mockTarget = {
        tagName: "DIV",
        isContentEditable: true,
      };
      Object.defineProperty(event, "target", { value: mockTarget });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(onStarMessage).not.toHaveBeenCalled();

      document.body.removeChild(div);
    });
  });
});

// ============================================================================
// formatShortcut Tests
// ============================================================================

describe("formatShortcut", () => {
  // Mock navigator.platform for consistent tests
  const originalPlatform = Object.getOwnPropertyDescriptor(
    navigator,
    "platform",
  );

  afterAll(() => {
    if (originalPlatform) {
      Object.defineProperty(navigator, "platform", originalPlatform);
    }
  });

  describe("on Mac", () => {
    beforeAll(() => {
      Object.defineProperty(navigator, "platform", {
        value: "MacIntel",
        configurable: true,
      });
    });

    it("should format Ctrl as Command on Mac", () => {
      const result = formatShortcut({
        key: "s",
        ctrlKey: true,
        handler: () => {},
        description: "Test",
      });
      expect(result).toBe("\u2318S");
    });

    it("should format Alt as Option on Mac", () => {
      const result = formatShortcut({
        key: "p",
        altKey: true,
        handler: () => {},
        description: "Test",
      });
      expect(result).toBe("\u2325P");
    });

    it("should format Shift on Mac", () => {
      const result = formatShortcut({
        key: "g",
        shiftKey: true,
        handler: () => {},
        description: "Test",
      });
      expect(result).toBe("\u21E7G");
    });

    it("should format combined modifiers on Mac", () => {
      const result = formatShortcut({
        key: "s",
        ctrlKey: true,
        shiftKey: true,
        handler: () => {},
        description: "Test",
      });
      expect(result).toBe("\u2318\u21E7S");
    });
  });

  describe("on Windows/Linux", () => {
    beforeAll(() => {
      Object.defineProperty(navigator, "platform", {
        value: "Win32",
        configurable: true,
      });
    });

    it("should format Ctrl on Windows", () => {
      const result = formatShortcut({
        key: "s",
        ctrlKey: true,
        handler: () => {},
        description: "Test",
      });
      expect(result).toBe("Ctrl+S");
    });

    it("should format Alt on Windows", () => {
      const result = formatShortcut({
        key: "p",
        altKey: true,
        handler: () => {},
        description: "Test",
      });
      expect(result).toBe("Alt+P");
    });

    it("should format Shift on Windows", () => {
      const result = formatShortcut({
        key: "g",
        shiftKey: true,
        handler: () => {},
        description: "Test",
      });
      expect(result).toBe("Shift+G");
    });

    it("should format combined modifiers on Windows", () => {
      const result = formatShortcut({
        key: "s",
        ctrlKey: true,
        shiftKey: true,
        handler: () => {},
        description: "Test",
      });
      expect(result).toBe("Ctrl+Shift+S");
    });

    it("should format key without modifiers", () => {
      const result = formatShortcut({
        key: "*",
        handler: () => {},
        description: "Test",
      });
      expect(result).toBe("*");
    });
  });
});
