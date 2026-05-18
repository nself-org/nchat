/**
 * Keyboard navigation helpers for accessibility
 *
 * Provides utilities for arrow key navigation, tab order management,
 * and roving tabindex patterns.
 */

import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

// ============================================================================
// Constants
// ============================================================================

export const Keys = {
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Enter: "Enter",
  Space: " ",
  Escape: "Escape",
  Tab: "Tab",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  Backspace: "Backspace",
  Delete: "Delete",
} as const;

export type KeyCode = (typeof Keys)[keyof typeof Keys];

export type NavigationOrientation = "horizontal" | "vertical" | "both" | "grid";

// ============================================================================
// Types
// ============================================================================

export interface NavigationOptions {
  /** Direction of navigation */
  orientation?: NavigationOrientation;
  /** Whether to wrap around at edges */
  wrap?: boolean;
  /** Enable Home/End key support */
  homeEndKeys?: boolean;
  /** Number of columns for grid navigation */
  columns?: number;
  /** Callback when item is selected */
  onSelect?: (index: number) => void;
  /** Callback when item is activated (Enter/Space) */
  onActivate?: (index: number) => void;
  /** Callback when escape is pressed */
  onEscape?: () => void;
  /** Items to skip (disabled indices) */
  skipIndices?: number[];
}

export interface NavigationState {
  currentIndex: number;
  totalItems: number;
}

export interface NavigationResult {
  /** The new index after navigation */
  newIndex: number;
  /** Whether the event was handled */
  handled: boolean;
  /** The action that was performed */
  action:
    | "next"
    | "previous"
    | "first"
    | "last"
    | "activate"
    | "escape"
    | "none";
}

// ============================================================================
// Navigation Handlers
// ============================================================================

/**
 * Calculates the next index based on navigation direction
 */
export function getNextIndex(
  currentIndex: number,
  totalItems: number,
  direction: "next" | "previous" | "first" | "last",
  options: Pick<NavigationOptions, "wrap" | "skipIndices"> = {},
): number {
  const { wrap = true, skipIndices = [] } = options;

  if (totalItems === 0) return -1;

  let newIndex: number;

  switch (direction) {
    case "next":
      newIndex = currentIndex + 1;
      if (newIndex >= totalItems) {
        newIndex = wrap ? 0 : totalItems - 1;
      }
      break;
    case "previous":
      newIndex = currentIndex - 1;
      if (newIndex < 0) {
        newIndex = wrap ? totalItems - 1 : 0;
      }
      break;
    case "first":
      newIndex = 0;
      break;
    case "last":
      newIndex = totalItems - 1;
      break;
    default:
      newIndex = currentIndex;
  }

  // Skip disabled indices
  if (skipIndices.length > 0) {
    const visited = new Set<number>();
    while (skipIndices.includes(newIndex) && !visited.has(newIndex)) {
      visited.add(newIndex);
      if (direction === "next" || direction === "first") {
        newIndex = (newIndex + 1) % totalItems;
      } else {
        newIndex = (newIndex - 1 + totalItems) % totalItems;
      }
      if (!wrap && (newIndex === 0 || newIndex === totalItems - 1)) break;
    }
  }

  return newIndex;
}

/**
 * Calculates the next index for grid navigation
 */
export function getNextGridIndex(
  currentIndex: number,
  totalItems: number,
  columns: number,
  direction:
    | "up"
    | "down"
    | "left"
    | "right"
    | "first"
    | "last"
    | "row-start"
    | "row-end",
  options: Pick<NavigationOptions, "wrap"> = {},
): number {
  const { wrap = true } = options;

  if (totalItems === 0 || columns === 0) return -1;

  const currentRow = Math.floor(currentIndex / columns);
  const currentCol = currentIndex % columns;
  const totalRows = Math.ceil(totalItems / columns);

  let newIndex: number;

  switch (direction) {
    case "right":
      newIndex = currentIndex + 1;
      if (currentCol === columns - 1 || newIndex >= totalItems) {
        newIndex = wrap ? currentRow * columns : currentIndex;
      }
      break;
    case "left":
      newIndex = currentIndex - 1;
      if (currentCol === 0) {
        const rowEnd = Math.min(
          currentRow * columns + columns - 1,
          totalItems - 1,
        );
        newIndex = wrap ? rowEnd : currentIndex;
      }
      break;
    case "down":
      newIndex = currentIndex + columns;
      if (newIndex >= totalItems) {
        newIndex = wrap ? currentCol : currentIndex;
      }
      break;
    case "up":
      newIndex = currentIndex - columns;
      if (newIndex < 0) {
        const lastRowStartCol = (totalRows - 1) * columns + currentCol;
        newIndex = wrap
          ? Math.min(lastRowStartCol, totalItems - 1)
          : currentIndex;
      }
      break;
    case "first":
      newIndex = 0;
      break;
    case "last":
      newIndex = totalItems - 1;
      break;
    case "row-start":
      newIndex = currentRow * columns;
      break;
    case "row-end":
      newIndex = Math.min(currentRow * columns + columns - 1, totalItems - 1);
      break;
    default:
      newIndex = currentIndex;
  }

  return Math.max(0, Math.min(newIndex, totalItems - 1));
}

/**
 * Handles keyboard navigation and returns the navigation result
 */
export function handleKeyboardNavigation(
  event: KeyboardEvent | ReactKeyboardEvent,
  state: NavigationState,
  options: NavigationOptions = {},
): NavigationResult {
  const {
    orientation = "vertical",
    wrap = true,
    homeEndKeys = true,
    columns = 1,
    skipIndices = [],
  } = options;

  const { currentIndex, totalItems } = state;
  const { key, ctrlKey } = event;

  let newIndex = currentIndex;
  let handled = false;
  let action: NavigationResult["action"] = "none";

  // Handle activation keys
  if (key === Keys.Enter || key === Keys.Space) {
    handled = true;
    action = "activate";
    return { newIndex: currentIndex, handled, action };
  }

  // Handle escape
  if (key === Keys.Escape) {
    handled = true;
    action = "escape";
    return { newIndex: currentIndex, handled, action };
  }

  // Handle arrow navigation based on orientation
  if (orientation === "grid" && columns > 1) {
    // Grid navigation
    switch (key) {
      case Keys.ArrowRight:
        newIndex = getNextGridIndex(
          currentIndex,
          totalItems,
          columns,
          "right",
          { wrap },
        );
        handled = true;
        action = "next";
        break;
      case Keys.ArrowLeft:
        newIndex = getNextGridIndex(currentIndex, totalItems, columns, "left", {
          wrap,
        });
        handled = true;
        action = "previous";
        break;
      case Keys.ArrowDown:
        newIndex = getNextGridIndex(currentIndex, totalItems, columns, "down", {
          wrap,
        });
        handled = true;
        action = "next";
        break;
      case Keys.ArrowUp:
        newIndex = getNextGridIndex(currentIndex, totalItems, columns, "up", {
          wrap,
        });
        handled = true;
        action = "previous";
        break;
      case Keys.Home:
        if (homeEndKeys) {
          newIndex = ctrlKey
            ? getNextGridIndex(currentIndex, totalItems, columns, "first", {
                wrap,
              })
            : getNextGridIndex(currentIndex, totalItems, columns, "row-start", {
                wrap,
              });
          handled = true;
          action = "first";
        }
        break;
      case Keys.End:
        if (homeEndKeys) {
          newIndex = ctrlKey
            ? getNextGridIndex(currentIndex, totalItems, columns, "last", {
                wrap,
              })
            : getNextGridIndex(currentIndex, totalItems, columns, "row-end", {
                wrap,
              });
          handled = true;
          action = "last";
        }
        break;
    }
  } else {
    // Linear navigation (vertical, horizontal, or both)
    const goNext =
      (orientation === "vertical" && key === Keys.ArrowDown) ||
      (orientation === "horizontal" && key === Keys.ArrowRight) ||
      (orientation === "both" &&
        (key === Keys.ArrowDown || key === Keys.ArrowRight));

    const goPrevious =
      (orientation === "vertical" && key === Keys.ArrowUp) ||
      (orientation === "horizontal" && key === Keys.ArrowLeft) ||
      (orientation === "both" &&
        (key === Keys.ArrowUp || key === Keys.ArrowLeft));

    if (goNext) {
      newIndex = getNextIndex(currentIndex, totalItems, "next", {
        wrap,
        skipIndices,
      });
      handled = true;
      action = "next";
    } else if (goPrevious) {
      newIndex = getNextIndex(currentIndex, totalItems, "previous", {
        wrap,
        skipIndices,
      });
      handled = true;
      action = "previous";
    } else if (homeEndKeys && key === Keys.Home) {
      newIndex = getNextIndex(currentIndex, totalItems, "first", {
        wrap,
        skipIndices,
      });
      handled = true;
      action = "first";
    } else if (homeEndKeys && key === Keys.End) {
      newIndex = getNextIndex(currentIndex, totalItems, "last", {
        wrap,
        skipIndices,
      });
      handled = true;
      action = "last";
    }
  }

  return { newIndex, handled, action };
}

// ============================================================================
// Tab Order Management
// ============================================================================

export interface TabOrderItem {
  element: HTMLElement;
  originalTabIndex: number;
}

/**
 * Saves and disables tab order for elements
 */
export function disableTabOrder(container: HTMLElement): TabOrderItem[] {
  const tabbableSelector = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "[tabindex]",
  ].join(", ");

  const elements = container.querySelectorAll<HTMLElement>(tabbableSelector);
  const savedOrder: TabOrderItem[] = [];

  elements.forEach((element) => {
    savedOrder.push({
      element,
      originalTabIndex: element.tabIndex,
    });
    element.tabIndex = -1;
  });

  return savedOrder;
}

/**
 * Restores tab order for elements
 */
export function restoreTabOrder(savedOrder: TabOrderItem[]): void {
  savedOrder.forEach(({ element, originalTabIndex }) => {
    element.tabIndex = originalTabIndex;
  });
}

/**
 * Sets up linear tab order for a set of elements
 */
export function setLinearTabOrder(
  elements: HTMLElement[],
  activeIndex: number = 0,
): void {
  elements.forEach((element, index) => {
    element.tabIndex = index === activeIndex ? 0 : -1;
  });
}

// ============================================================================
// Roving Tabindex Utilities
// ============================================================================

export interface RovingTabIndexConfig {
  /** The container element */
  containerRef: RefObject<HTMLElement>;
  /** Selector for items within the container */
  itemSelector: string;
  /** Current active index */
  activeIndex: number;
  /** Callback when active index changes */
  onIndexChange: (index: number) => void;
  /** Navigation orientation */
  orientation?: NavigationOrientation;
  /** Whether to wrap at edges */
  wrap?: boolean;
  /** Columns for grid layout */
  columns?: number;
}

/**
 * Gets all items in a roving tabindex container
 */
export function getRovingItems(
  container: HTMLElement | null,
  itemSelector: string,
): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
}

/**
 * Updates roving tabindex for all items
 */
export function updateRovingTabIndex(
  container: HTMLElement | null,
  itemSelector: string,
  activeIndex: number,
): void {
  const items = getRovingItems(container, itemSelector);
  items.forEach((item, index) => {
    item.tabIndex = index === activeIndex ? 0 : -1;
    item.setAttribute("aria-selected", String(index === activeIndex));
  });
}

/**
 * Focuses the item at the given index
 */
export function focusRovingItem(
  container: HTMLElement | null,
  itemSelector: string,
  index: number,
): boolean {
  const items = getRovingItems(container, itemSelector);
  if (index >= 0 && index < items.length) {
    items[index].focus();
    return true;
  }
  return false;
}

/**
 * Creates a keyboard handler for roving tabindex
 */
export function createRovingKeyHandler(
  config: RovingTabIndexConfig,
): (event: KeyboardEvent | ReactKeyboardEvent) => void {
  const {
    containerRef,
    itemSelector,
    activeIndex,
    onIndexChange,
    orientation = "vertical",
    wrap = true,
    columns,
  } = config;

  return (event: KeyboardEvent | ReactKeyboardEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const items = getRovingItems(container, itemSelector);
    const totalItems = items.length;

    if (totalItems === 0) return;

    const result = handleKeyboardNavigation(
      event,
      { currentIndex: activeIndex, totalItems },
      {
        orientation,
        wrap,
        columns,
        homeEndKeys: true,
      },
    );

    if (result.handled) {
      event.preventDefault();

      if (result.action === "activate") {
        // Trigger click on current item
        const currentItem = items[activeIndex];
        currentItem?.click();
      } else if (result.newIndex !== activeIndex) {
        onIndexChange(result.newIndex);
        focusRovingItem(container, itemSelector, result.newIndex);
      }
    }
  };
}

// ============================================================================
// Type-ahead Search
// ============================================================================

export interface TypeAheadConfig {
  /** Elements to search through */
  elements: HTMLElement[];
  /** Current focused index */
  currentIndex: number;
  /** Callback when a match is found */
  onMatch: (index: number) => void;
  /** Timeout before clearing search buffer (ms) */
  timeout?: number;
}

let typeAheadBuffer = "";
let typeAheadTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Handles type-ahead search for keyboard navigation
 */
export function handleTypeAhead(char: string, config: TypeAheadConfig): number {
  const { elements, currentIndex, onMatch, timeout = 500 } = config;

  if (char.length !== 1) return currentIndex;

  // Clear previous timeout
  if (typeAheadTimeout) {
    clearTimeout(typeAheadTimeout);
  }

  // Add to buffer
  typeAheadBuffer += char.toLowerCase();

  // Set new timeout to clear buffer
  typeAheadTimeout = setTimeout(() => {
    typeAheadBuffer = "";
    typeAheadTimeout = null;
  }, timeout);

  // Search from current position
  for (let i = currentIndex + 1; i < elements.length; i++) {
    const text = elements[i].textContent?.toLowerCase() ?? "";
    if (text.startsWith(typeAheadBuffer)) {
      onMatch(i);
      return i;
    }
  }

  // Wrap around to beginning
  for (let i = 0; i <= currentIndex; i++) {
    const text = elements[i].textContent?.toLowerCase() ?? "";
    if (text.startsWith(typeAheadBuffer)) {
      onMatch(i);
      return i;
    }
  }

  return currentIndex;
}

/**
 * Clears the type-ahead buffer
 */
export function clearTypeAhead(): void {
  typeAheadBuffer = "";
  if (typeAheadTimeout) {
    clearTimeout(typeAheadTimeout);
    typeAheadTimeout = null;
  }
}

/**
 * Gets the current type-ahead buffer
 */
export function getTypeAheadBuffer(): string {
  return typeAheadBuffer;
}

// ============================================================================
// Keyboard Shortcut Detection
// ============================================================================

export interface ShortcutModifiers {
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

/**
 * Checks if a keyboard event matches a shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent | ReactKeyboardEvent,
  key: string,
  modifiers: ShortcutModifiers = {},
): boolean {
  const {
    ctrlKey = false,
    altKey = false,
    shiftKey = false,
    metaKey = false,
  } = modifiers;

  return (
    event.key === key &&
    event.ctrlKey === ctrlKey &&
    event.altKey === altKey &&
    event.shiftKey === shiftKey &&
    event.metaKey === metaKey
  );
}

/**
 * Checks if a keyboard event has any modifier keys
 */
export function hasModifier(
  event: KeyboardEvent | ReactKeyboardEvent,
): boolean {
  return event.ctrlKey || event.altKey || event.shiftKey || event.metaKey;
}

/**
 * Normalizes platform-specific modifier keys (Cmd on Mac, Ctrl on others)
 */
export function isPlatformModifier(
  event: KeyboardEvent | ReactKeyboardEvent,
): boolean {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  return isMac ? event.metaKey : event.ctrlKey;
}
