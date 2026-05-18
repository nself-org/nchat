/**
 * Keyboard Navigation Unit Tests
 *
 * Comprehensive tests for keyboard navigation utilities including
 * arrow key navigation, tab order management, and roving tabindex patterns.
 */

import {
  Keys,
  getNextIndex,
  getNextGridIndex,
  handleKeyboardNavigation,
  disableTabOrder,
  restoreTabOrder,
  setLinearTabOrder,
  getRovingItems,
  updateRovingTabIndex,
  focusRovingItem,
  createRovingKeyHandler,
  handleTypeAhead,
  clearTypeAhead,
  getTypeAheadBuffer,
  matchesShortcut,
  hasModifier,
  isPlatformModifier,
} from "../keyboard-navigation";

// ============================================================================
// Test Helpers
// ============================================================================

function createTestContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = `
    <button id="item-0">Apple</button>
    <button id="item-1">Banana</button>
    <button id="item-2">Cherry</button>
    <button id="item-3">Date</button>
    <button id="item-4">Elderberry</button>
  `;
  document.body.appendChild(container);
  return container;
}

function createGridContainer(rows: number, cols: number): HTMLDivElement {
  const container = document.createElement("div");
  let html = "";
  for (let i = 0; i < rows * cols; i++) {
    html += `<button id="cell-${i}">Cell ${i}</button>`;
  }
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

function createKeyboardEvent(
  key: string,
  options: Partial<KeyboardEvent> = {},
): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...options,
  });
}

function cleanup(): void {
  document.body.innerHTML = "";
  clearTypeAhead();
}

// ============================================================================
// Tests
// ============================================================================

describe("Keyboard Navigation", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // ==========================================================================
  // Keys Constants Tests
  // ==========================================================================

  describe("Keys", () => {
    it("should have all navigation keys", () => {
      expect(Keys.ArrowUp).toBe("ArrowUp");
      expect(Keys.ArrowDown).toBe("ArrowDown");
      expect(Keys.ArrowLeft).toBe("ArrowLeft");
      expect(Keys.ArrowRight).toBe("ArrowRight");
    });

    it("should have action keys", () => {
      expect(Keys.Enter).toBe("Enter");
      expect(Keys.Space).toBe(" ");
      expect(Keys.Escape).toBe("Escape");
      expect(Keys.Tab).toBe("Tab");
    });

    it("should have position keys", () => {
      expect(Keys.Home).toBe("Home");
      expect(Keys.End).toBe("End");
      expect(Keys.PageUp).toBe("PageUp");
      expect(Keys.PageDown).toBe("PageDown");
    });

    it("should have editing keys", () => {
      expect(Keys.Backspace).toBe("Backspace");
      expect(Keys.Delete).toBe("Delete");
    });
  });

  // ==========================================================================
  // getNextIndex Tests
  // ==========================================================================

  describe("getNextIndex", () => {
    it("should return next index", () => {
      const result = getNextIndex(0, 5, "next");
      expect(result).toBe(1);
    });

    it("should return previous index", () => {
      const result = getNextIndex(2, 5, "previous");
      expect(result).toBe(1);
    });

    it("should return first index", () => {
      const result = getNextIndex(3, 5, "first");
      expect(result).toBe(0);
    });

    it("should return last index", () => {
      const result = getNextIndex(1, 5, "last");
      expect(result).toBe(4);
    });

    it("should wrap from last to first", () => {
      const result = getNextIndex(4, 5, "next", { wrap: true });
      expect(result).toBe(0);
    });

    it("should wrap from first to last", () => {
      const result = getNextIndex(0, 5, "previous", { wrap: true });
      expect(result).toBe(4);
    });

    it("should not wrap when wrap is false", () => {
      const result = getNextIndex(4, 5, "next", { wrap: false });
      expect(result).toBe(4);
    });

    it("should not wrap backwards when wrap is false", () => {
      const result = getNextIndex(0, 5, "previous", { wrap: false });
      expect(result).toBe(0);
    });

    it("should skip disabled indices", () => {
      const result = getNextIndex(0, 5, "next", { skipIndices: [1, 2] });
      expect(result).toBe(3);
    });

    it("should skip disabled indices when going backwards", () => {
      const result = getNextIndex(4, 5, "previous", { skipIndices: [2, 3] });
      expect(result).toBe(1);
    });

    it("should return -1 for empty list", () => {
      const result = getNextIndex(0, 0, "next");
      expect(result).toBe(-1);
    });

    it("should handle single item", () => {
      const result = getNextIndex(0, 1, "next");
      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // getNextGridIndex Tests
  // ==========================================================================

  describe("getNextGridIndex", () => {
    // 3x3 grid = 9 items
    const totalItems = 9;
    const columns = 3;

    it("should move right", () => {
      const result = getNextGridIndex(0, totalItems, columns, "right");
      expect(result).toBe(1);
    });

    it("should move left", () => {
      const result = getNextGridIndex(1, totalItems, columns, "left");
      expect(result).toBe(0);
    });

    it("should move down", () => {
      const result = getNextGridIndex(0, totalItems, columns, "down");
      expect(result).toBe(3);
    });

    it("should move up", () => {
      const result = getNextGridIndex(3, totalItems, columns, "up");
      expect(result).toBe(0);
    });

    it("should wrap right to row start", () => {
      const result = getNextGridIndex(2, totalItems, columns, "right", {
        wrap: true,
      });
      expect(result).toBe(0);
    });

    it("should wrap left to row end", () => {
      const result = getNextGridIndex(3, totalItems, columns, "left", {
        wrap: true,
      });
      expect(result).toBe(5);
    });

    it("should wrap down to first row", () => {
      const result = getNextGridIndex(6, totalItems, columns, "down", {
        wrap: true,
      });
      expect(result).toBe(0);
    });

    it("should wrap up to last row", () => {
      const result = getNextGridIndex(0, totalItems, columns, "up", {
        wrap: true,
      });
      expect(result).toBe(6);
    });

    it("should not wrap when wrap is false", () => {
      const result = getNextGridIndex(2, totalItems, columns, "right", {
        wrap: false,
      });
      expect(result).toBe(2);
    });

    it("should go to first", () => {
      const result = getNextGridIndex(5, totalItems, columns, "first");
      expect(result).toBe(0);
    });

    it("should go to last", () => {
      const result = getNextGridIndex(2, totalItems, columns, "last");
      expect(result).toBe(8);
    });

    it("should go to row start", () => {
      const result = getNextGridIndex(4, totalItems, columns, "row-start");
      expect(result).toBe(3);
    });

    it("should go to row end", () => {
      const result = getNextGridIndex(3, totalItems, columns, "row-end");
      expect(result).toBe(5);
    });

    it("should return -1 for empty grid", () => {
      const result = getNextGridIndex(0, 0, 3, "right");
      expect(result).toBe(-1);
    });

    it("should return -1 for zero columns", () => {
      const result = getNextGridIndex(0, 9, 0, "right");
      expect(result).toBe(-1);
    });

    it("should handle incomplete last row", () => {
      // 3x3 grid with only 7 items
      const result = getNextGridIndex(6, 7, 3, "row-end");
      expect(result).toBe(6);
    });
  });

  // ==========================================================================
  // handleKeyboardNavigation Tests
  // ==========================================================================

  describe("handleKeyboardNavigation", () => {
    const state = { currentIndex: 2, totalItems: 5 };

    it("should handle ArrowDown in vertical orientation", () => {
      const event = createKeyboardEvent("ArrowDown");
      const result = handleKeyboardNavigation(event, state, {
        orientation: "vertical",
      });

      expect(result.handled).toBe(true);
      expect(result.newIndex).toBe(3);
      expect(result.action).toBe("next");
    });

    it("should handle ArrowUp in vertical orientation", () => {
      const event = createKeyboardEvent("ArrowUp");
      const result = handleKeyboardNavigation(event, state, {
        orientation: "vertical",
      });

      expect(result.handled).toBe(true);
      expect(result.newIndex).toBe(1);
      expect(result.action).toBe("previous");
    });

    it("should handle ArrowRight in horizontal orientation", () => {
      const event = createKeyboardEvent("ArrowRight");
      const result = handleKeyboardNavigation(event, state, {
        orientation: "horizontal",
      });

      expect(result.handled).toBe(true);
      expect(result.newIndex).toBe(3);
      expect(result.action).toBe("next");
    });

    it("should handle ArrowLeft in horizontal orientation", () => {
      const event = createKeyboardEvent("ArrowLeft");
      const result = handleKeyboardNavigation(event, state, {
        orientation: "horizontal",
      });

      expect(result.handled).toBe(true);
      expect(result.newIndex).toBe(1);
      expect(result.action).toBe("previous");
    });

    it("should handle both arrow keys in both orientation", () => {
      const downEvent = createKeyboardEvent("ArrowDown");
      const rightEvent = createKeyboardEvent("ArrowRight");

      const downResult = handleKeyboardNavigation(downEvent, state, {
        orientation: "both",
      });
      const rightResult = handleKeyboardNavigation(rightEvent, state, {
        orientation: "both",
      });

      expect(downResult.handled).toBe(true);
      expect(rightResult.handled).toBe(true);
    });

    it("should handle Home key", () => {
      const event = createKeyboardEvent("Home");
      const result = handleKeyboardNavigation(event, state, {
        homeEndKeys: true,
      });

      expect(result.handled).toBe(true);
      expect(result.newIndex).toBe(0);
      expect(result.action).toBe("first");
    });

    it("should handle End key", () => {
      const event = createKeyboardEvent("End");
      const result = handleKeyboardNavigation(event, state, {
        homeEndKeys: true,
      });

      expect(result.handled).toBe(true);
      expect(result.newIndex).toBe(4);
      expect(result.action).toBe("last");
    });

    it("should not handle Home/End when disabled", () => {
      const event = createKeyboardEvent("Home");
      const result = handleKeyboardNavigation(event, state, {
        homeEndKeys: false,
      });

      expect(result.handled).toBe(false);
    });

    it("should handle Enter as activation", () => {
      const event = createKeyboardEvent("Enter");
      const result = handleKeyboardNavigation(event, state);

      expect(result.handled).toBe(true);
      expect(result.action).toBe("activate");
      expect(result.newIndex).toBe(2);
    });

    it("should handle Space as activation", () => {
      const event = createKeyboardEvent(" ");
      const result = handleKeyboardNavigation(event, state);

      expect(result.handled).toBe(true);
      expect(result.action).toBe("activate");
    });

    it("should handle Escape", () => {
      const event = createKeyboardEvent("Escape");
      const result = handleKeyboardNavigation(event, state);

      expect(result.handled).toBe(true);
      expect(result.action).toBe("escape");
    });

    it("should not handle unrelated keys", () => {
      const event = createKeyboardEvent("a");
      const result = handleKeyboardNavigation(event, state);

      expect(result.handled).toBe(false);
      expect(result.action).toBe("none");
    });

    it("should handle grid navigation", () => {
      const gridState = { currentIndex: 4, totalItems: 9 };
      const downEvent = createKeyboardEvent("ArrowDown");

      const result = handleKeyboardNavigation(downEvent, gridState, {
        orientation: "grid",
        columns: 3,
      });

      expect(result.handled).toBe(true);
      expect(result.newIndex).toBe(7);
    });

    it("should handle Ctrl+Home in grid for first item", () => {
      const gridState = { currentIndex: 4, totalItems: 9 };
      const event = createKeyboardEvent("Home", { ctrlKey: true });

      const result = handleKeyboardNavigation(event, gridState, {
        orientation: "grid",
        columns: 3,
        homeEndKeys: true,
      });

      expect(result.newIndex).toBe(0);
    });

    it("should handle Ctrl+End in grid for last item", () => {
      const gridState = { currentIndex: 4, totalItems: 9 };
      const event = createKeyboardEvent("End", { ctrlKey: true });

      const result = handleKeyboardNavigation(event, gridState, {
        orientation: "grid",
        columns: 3,
        homeEndKeys: true,
      });

      expect(result.newIndex).toBe(8);
    });

    it("should skip disabled indices", () => {
      const event = createKeyboardEvent("ArrowDown");
      const result = handleKeyboardNavigation(event, state, {
        orientation: "vertical",
        skipIndices: [3],
      });

      expect(result.newIndex).toBe(4);
    });
  });

  // ==========================================================================
  // Tab Order Management Tests
  // ==========================================================================

  describe("disableTabOrder", () => {
    it("should disable tab order for all tabbable elements", () => {
      const container = createTestContainer();
      const savedOrder = disableTabOrder(container);

      const buttons = container.querySelectorAll("button");
      buttons.forEach((button) => {
        expect(button.tabIndex).toBe(-1);
      });

      expect(savedOrder.length).toBe(5);
    });

    it("should save original tab indices", () => {
      const container = createTestContainer();
      const button = container.querySelector("#item-0") as HTMLElement;
      button.tabIndex = 2;

      const savedOrder = disableTabOrder(container);
      const savedButton = savedOrder.find((item) => item.element === button);

      expect(savedButton?.originalTabIndex).toBe(2);
    });

    it("should handle empty container", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);

      const savedOrder = disableTabOrder(container);
      expect(savedOrder).toEqual([]);
    });
  });

  describe("restoreTabOrder", () => {
    it("should restore original tab indices", () => {
      const container = createTestContainer();
      const button = container.querySelector("#item-0") as HTMLElement;
      button.tabIndex = 5;

      const savedOrder = disableTabOrder(container);
      restoreTabOrder(savedOrder);

      expect(button.tabIndex).toBe(5);
    });

    it("should handle empty saved order", () => {
      expect(() => restoreTabOrder([])).not.toThrow();
    });
  });

  describe("setLinearTabOrder", () => {
    it("should set active element to tabIndex 0", () => {
      const container = createTestContainer();
      const buttons = Array.from(container.querySelectorAll("button"));

      setLinearTabOrder(buttons, 2);

      expect(buttons[2].tabIndex).toBe(0);
    });

    it("should set inactive elements to tabIndex -1", () => {
      const container = createTestContainer();
      const buttons = Array.from(container.querySelectorAll("button"));

      setLinearTabOrder(buttons, 2);

      buttons.forEach((button, index) => {
        if (index !== 2) {
          expect(button.tabIndex).toBe(-1);
        }
      });
    });

    it("should default to first element", () => {
      const container = createTestContainer();
      const buttons = Array.from(container.querySelectorAll("button"));

      setLinearTabOrder(buttons);

      expect(buttons[0].tabIndex).toBe(0);
    });
  });

  // ==========================================================================
  // Roving Tabindex Tests
  // ==========================================================================

  describe("getRovingItems", () => {
    it("should get all matching items", () => {
      const container = createTestContainer();
      const items = getRovingItems(container, "button");

      expect(items.length).toBe(5);
    });

    it("should return empty array for null container", () => {
      const items = getRovingItems(null, "button");
      expect(items).toEqual([]);
    });

    it("should return empty array for no matches", () => {
      const container = createTestContainer();
      const items = getRovingItems(container, "input");

      expect(items).toEqual([]);
    });
  });

  describe("updateRovingTabIndex", () => {
    it("should set tabIndex and aria-selected", () => {
      const container = createTestContainer();
      updateRovingTabIndex(container, "button", 2);

      const buttons = container.querySelectorAll("button");
      buttons.forEach((button, index) => {
        expect(button.tabIndex).toBe(index === 2 ? 0 : -1);
        expect(button.getAttribute("aria-selected")).toBe(String(index === 2));
      });
    });

    it("should handle null container", () => {
      expect(() => updateRovingTabIndex(null, "button", 0)).not.toThrow();
    });
  });

  describe("focusRovingItem", () => {
    it("should focus the item at the given index", () => {
      const container = createTestContainer();
      const result = focusRovingItem(container, "button", 2);

      expect(result).toBe(true);
      expect(document.activeElement?.id).toBe("item-2");
    });

    it("should return false for invalid index", () => {
      const container = createTestContainer();
      const result = focusRovingItem(container, "button", 10);

      expect(result).toBe(false);
    });

    it("should return false for negative index", () => {
      const container = createTestContainer();
      const result = focusRovingItem(container, "button", -1);

      expect(result).toBe(false);
    });

    it("should return false for null container", () => {
      const result = focusRovingItem(null, "button", 0);
      expect(result).toBe(false);
    });
  });

  describe("createRovingKeyHandler", () => {
    it("should create a keyboard handler function", () => {
      const containerRef = { current: document.createElement("div") };
      const onIndexChange = jest.fn();

      const handler = createRovingKeyHandler({
        containerRef,
        itemSelector: "button",
        activeIndex: 0,
        onIndexChange,
      });

      expect(typeof handler).toBe("function");
    });

    it("should call onIndexChange on navigation", () => {
      const container = createTestContainer();
      const containerRef = { current: container };
      const onIndexChange = jest.fn();

      const handler = createRovingKeyHandler({
        containerRef,
        itemSelector: "button",
        activeIndex: 0,
        onIndexChange,
      });

      const event = createKeyboardEvent("ArrowDown");
      Object.defineProperty(event, "preventDefault", { value: jest.fn() });
      handler(event);

      expect(onIndexChange).toHaveBeenCalledWith(1);
    });

    it("should handle activation", () => {
      const container = createTestContainer();
      const containerRef = { current: container };
      const button = container.querySelector("#item-2") as HTMLButtonElement;
      const clickHandler = jest.fn();
      button.addEventListener("click", clickHandler);

      const handler = createRovingKeyHandler({
        containerRef,
        itemSelector: "button",
        activeIndex: 2,
        onIndexChange: jest.fn(),
      });

      const event = createKeyboardEvent("Enter");
      Object.defineProperty(event, "preventDefault", { value: jest.fn() });
      handler(event);

      expect(clickHandler).toHaveBeenCalled();
    });

    it("should handle empty container", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const containerRef = { current: container };

      const handler = createRovingKeyHandler({
        containerRef,
        itemSelector: "button",
        activeIndex: 0,
        onIndexChange: jest.fn(),
      });

      const event = createKeyboardEvent("ArrowDown");
      expect(() => handler(event)).not.toThrow();
    });

    it("should handle null container ref", () => {
      const containerRef = { current: null };

      const handler = createRovingKeyHandler({
        containerRef,
        itemSelector: "button",
        activeIndex: 0,
        onIndexChange: jest.fn(),
      });

      const event = createKeyboardEvent("ArrowDown");
      expect(() => handler(event)).not.toThrow();
    });
  });

  // ==========================================================================
  // Type-ahead Tests
  // ==========================================================================

  describe("handleTypeAhead", () => {
    it("should find matching item", () => {
      const container = createTestContainer();
      const elements = Array.from(container.querySelectorAll("button"));
      const onMatch = jest.fn();

      const result = handleTypeAhead("c", {
        elements,
        currentIndex: 0,
        onMatch,
      });

      expect(result).toBe(2); // Cherry
      expect(onMatch).toHaveBeenCalledWith(2);
    });

    it("should build up search buffer", () => {
      jest.useFakeTimers();
      const container = createTestContainer();
      const elements = Array.from(container.querySelectorAll("button"));
      const onMatch = jest.fn();

      handleTypeAhead("d", { elements, currentIndex: 0, onMatch });
      handleTypeAhead("a", { elements, currentIndex: 0, onMatch });

      expect(getTypeAheadBuffer()).toBe("da");
    });

    it("should clear buffer after timeout", () => {
      jest.useFakeTimers();
      const container = createTestContainer();
      const elements = Array.from(container.querySelectorAll("button"));

      handleTypeAhead("a", { elements, currentIndex: 0, onMatch: jest.fn() });

      jest.advanceTimersByTime(500);

      expect(getTypeAheadBuffer()).toBe("");
    });

    it("should wrap around to find matches", () => {
      const container = createTestContainer();
      const elements = Array.from(container.querySelectorAll("button"));
      const onMatch = jest.fn();

      const result = handleTypeAhead("a", {
        elements,
        currentIndex: 3,
        onMatch,
      });

      expect(result).toBe(0); // Apple
    });

    it("should return current index if no match", () => {
      const container = createTestContainer();
      const elements = Array.from(container.querySelectorAll("button"));
      const onMatch = jest.fn();

      const result = handleTypeAhead("z", {
        elements,
        currentIndex: 2,
        onMatch,
      });

      expect(result).toBe(2);
      expect(onMatch).not.toHaveBeenCalled();
    });

    it("should ignore non-single characters", () => {
      const container = createTestContainer();
      const elements = Array.from(container.querySelectorAll("button"));
      const onMatch = jest.fn();

      const result = handleTypeAhead("ab", {
        elements,
        currentIndex: 0,
        onMatch,
      });

      expect(result).toBe(0);
    });

    it("should use custom timeout", () => {
      jest.useFakeTimers();
      const container = createTestContainer();
      const elements = Array.from(container.querySelectorAll("button"));

      handleTypeAhead("a", {
        elements,
        currentIndex: 0,
        onMatch: jest.fn(),
        timeout: 1000,
      });

      jest.advanceTimersByTime(500);
      expect(getTypeAheadBuffer()).toBe("a");

      jest.advanceTimersByTime(500);
      expect(getTypeAheadBuffer()).toBe("");
    });
  });

  describe("clearTypeAhead", () => {
    it("should clear the buffer", () => {
      const container = createTestContainer();
      const elements = Array.from(container.querySelectorAll("button"));

      handleTypeAhead("a", { elements, currentIndex: 0, onMatch: jest.fn() });
      clearTypeAhead();

      expect(getTypeAheadBuffer()).toBe("");
    });
  });

  describe("getTypeAheadBuffer", () => {
    it("should return empty string initially", () => {
      clearTypeAhead();
      expect(getTypeAheadBuffer()).toBe("");
    });
  });

  // ==========================================================================
  // Shortcut Detection Tests
  // ==========================================================================

  describe("matchesShortcut", () => {
    it("should match simple key", () => {
      const event = createKeyboardEvent("a");
      expect(matchesShortcut(event, "a")).toBe(true);
    });

    it("should not match different key", () => {
      const event = createKeyboardEvent("a");
      expect(matchesShortcut(event, "b")).toBe(false);
    });

    it("should match with Ctrl modifier", () => {
      const event = createKeyboardEvent("s", { ctrlKey: true });
      expect(matchesShortcut(event, "s", { ctrlKey: true })).toBe(true);
    });

    it("should not match without expected modifier", () => {
      const event = createKeyboardEvent("s");
      expect(matchesShortcut(event, "s", { ctrlKey: true })).toBe(false);
    });

    it("should match with multiple modifiers", () => {
      const event = createKeyboardEvent("z", { ctrlKey: true, shiftKey: true });
      expect(
        matchesShortcut(event, "z", { ctrlKey: true, shiftKey: true }),
      ).toBe(true);
    });

    it("should not match with extra modifier", () => {
      const event = createKeyboardEvent("s", { ctrlKey: true, shiftKey: true });
      expect(matchesShortcut(event, "s", { ctrlKey: true })).toBe(false);
    });

    it("should match with Alt modifier", () => {
      const event = createKeyboardEvent("f", { altKey: true });
      expect(matchesShortcut(event, "f", { altKey: true })).toBe(true);
    });

    it("should match with Meta modifier", () => {
      const event = createKeyboardEvent("c", { metaKey: true });
      expect(matchesShortcut(event, "c", { metaKey: true })).toBe(true);
    });
  });

  describe("hasModifier", () => {
    it("should return false for no modifiers", () => {
      const event = createKeyboardEvent("a");
      expect(hasModifier(event)).toBe(false);
    });

    it("should return true for Ctrl", () => {
      const event = createKeyboardEvent("a", { ctrlKey: true });
      expect(hasModifier(event)).toBe(true);
    });

    it("should return true for Alt", () => {
      const event = createKeyboardEvent("a", { altKey: true });
      expect(hasModifier(event)).toBe(true);
    });

    it("should return true for Shift", () => {
      const event = createKeyboardEvent("a", { shiftKey: true });
      expect(hasModifier(event)).toBe(true);
    });

    it("should return true for Meta", () => {
      const event = createKeyboardEvent("a", { metaKey: true });
      expect(hasModifier(event)).toBe(true);
    });
  });

  describe("isPlatformModifier", () => {
    it("should check correct modifier based on platform", () => {
      const event = createKeyboardEvent("c", { ctrlKey: true });
      // In test environment, navigator.platform is usually not Mac
      expect(typeof isPlatformModifier(event)).toBe("boolean");
    });

    it("should handle meta key", () => {
      const event = createKeyboardEvent("c", { metaKey: true });
      expect(typeof isPlatformModifier(event)).toBe("boolean");
    });
  });
});
