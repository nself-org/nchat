"use client";

import { useCallback, useRef, useState, useEffect, KeyboardEvent } from "react";

export interface RovingTabIndexOptions {
  /** ID of the list/grid for ARIA attributes */
  id?: string;
  /** Initial focused index */
  initialIndex?: number;
  /** Whether to wrap around at edges */
  wrap?: boolean;
  /** Orientation for arrow key navigation */
  orientation?: "horizontal" | "vertical" | "both";
  /** Enable Home/End key support */
  homeEndKeys?: boolean;
  /** Enable type-ahead search */
  typeAhead?: boolean;
  /** Callback when focused index changes */
  onFocusChange?: (index: number) => void;
  /** Whether the roving tabindex is active */
  disabled?: boolean;
}

export interface RovingTabIndexResult<T extends HTMLElement> {
  /** Current focused index */
  focusedIndex: number;
  /** Set the focused index */
  setFocusedIndex: (index: number) => void;
  /** Ref for the container element */
  containerRef: React.RefObject<T | null>;
  /** Get props for each item */
  getItemProps: (index: number) => ItemProps;
  /** Handle keyboard navigation on the container */
  handleKeyDown: (event: KeyboardEvent<T>) => void;
  /** Focus a specific item */
  focusItem: (index: number) => void;
  /** Focus first item */
  focusFirst: () => void;
  /** Focus last item */
  focusLast: () => void;
  /** Total number of items */
  itemCount: number;
  /** Set total number of items */
  setItemCount: (count: number) => void;
}

interface ItemProps {
  tabIndex: number;
  "aria-selected"?: boolean;
  onFocus: () => void;
  ref: (element: HTMLElement | null) => void;
}

/**
 * Hook for roving tabindex pattern in lists, menus, and grids
 * Allows arrow key navigation with only one tab stop
 */
export function useRovingTabIndex<T extends HTMLElement = HTMLDivElement>(
  options: RovingTabIndexOptions = {},
): RovingTabIndexResult<T> {
  const {
    initialIndex = 0,
    wrap = true,
    orientation = "vertical",
    homeEndKeys = true,
    typeAhead = false,
    onFocusChange,
    disabled = false,
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const [itemCount, setItemCount] = useState(0);
  const containerRef = useRef<T>(null);
  const itemsRef = useRef<Map<number, HTMLElement>>(new Map());
  const typeAheadRef = useRef<string>("");
  const typeAheadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear type-ahead buffer after delay
  useEffect(() => {
    return () => {
      if (typeAheadTimeoutRef.current) {
        clearTimeout(typeAheadTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Focus a specific item by index
   */
  const focusItem = useCallback(
    (index: number) => {
      if (disabled) return;

      const normalizedIndex = wrap
        ? ((index % itemCount) + itemCount) % itemCount
        : Math.max(0, Math.min(index, itemCount - 1));

      setFocusedIndex(normalizedIndex);
      onFocusChange?.(normalizedIndex);

      const element = itemsRef.current.get(normalizedIndex);
      if (element) {
        element.focus();
      }
    },
    [disabled, wrap, itemCount, onFocusChange],
  );

  /**
   * Focus first item
   */
  const focusFirst = useCallback(() => {
    focusItem(0);
  }, [focusItem]);

  /**
   * Focus last item
   */
  const focusLast = useCallback(() => {
    focusItem(itemCount - 1);
  }, [focusItem, itemCount]);

  /**
   * Handle type-ahead search
   */
  const handleTypeAhead = useCallback(
    (char: string) => {
      if (!typeAhead) return;

      typeAheadRef.current += char.toLowerCase();

      // Clear buffer after 500ms of inactivity
      if (typeAheadTimeoutRef.current) {
        clearTimeout(typeAheadTimeoutRef.current);
      }
      typeAheadTimeoutRef.current = setTimeout(() => {
        typeAheadRef.current = "";
      }, 500);

      // Find matching item
      const items = Array.from(itemsRef.current.entries());
      for (let i = focusedIndex + 1; i < items.length; i++) {
        const [index, element] = items[i];
        if (
          element.textContent?.toLowerCase().startsWith(typeAheadRef.current)
        ) {
          focusItem(index);
          return;
        }
      }
      // Wrap around to beginning
      for (let i = 0; i <= focusedIndex; i++) {
        const [index, element] = items[i];
        if (
          element.textContent?.toLowerCase().startsWith(typeAheadRef.current)
        ) {
          focusItem(index);
          return;
        }
      }
    },
    [typeAhead, focusedIndex, focusItem],
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<T>) => {
      if (disabled || itemCount === 0) return;

      const { key } = event;

      // Arrow keys
      const goNext =
        (orientation === "vertical" && key === "ArrowDown") ||
        (orientation === "horizontal" && key === "ArrowRight") ||
        (orientation === "both" &&
          (key === "ArrowDown" || key === "ArrowRight"));

      const goPrev =
        (orientation === "vertical" && key === "ArrowUp") ||
        (orientation === "horizontal" && key === "ArrowLeft") ||
        (orientation === "both" && (key === "ArrowUp" || key === "ArrowLeft"));

      if (goNext) {
        event.preventDefault();
        focusItem(focusedIndex + 1);
        return;
      }

      if (goPrev) {
        event.preventDefault();
        focusItem(focusedIndex - 1);
        return;
      }

      // Home/End keys
      if (homeEndKeys) {
        if (key === "Home") {
          event.preventDefault();
          focusFirst();
          return;
        }
        if (key === "End") {
          event.preventDefault();
          focusLast();
          return;
        }
      }

      // Type-ahead (single printable character)
      if (
        typeAhead &&
        key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        handleTypeAhead(key);
      }
    },
    [
      disabled,
      itemCount,
      orientation,
      homeEndKeys,
      typeAhead,
      focusedIndex,
      focusItem,
      focusFirst,
      focusLast,
      handleTypeAhead,
    ],
  );

  /**
   * Get props for each item
   */
  const getItemProps = useCallback(
    (index: number): ItemProps => ({
      tabIndex: index === focusedIndex ? 0 : -1,
      "aria-selected": index === focusedIndex,
      onFocus: () => {
        setFocusedIndex(index);
        onFocusChange?.(index);
      },
      ref: (element: HTMLElement | null) => {
        if (element) {
          itemsRef.current.set(index, element);
        } else {
          itemsRef.current.delete(index);
        }
      },
    }),
    [focusedIndex, onFocusChange],
  );

  return {
    focusedIndex,
    setFocusedIndex,
    containerRef,
    getItemProps,
    handleKeyDown,
    focusItem,
    focusFirst,
    focusLast,
    itemCount,
    setItemCount,
  };
}

/**
 * Simplified hook for menu navigation
 */
export function useMenuNavigation(
  itemCount: number,
  options: Omit<RovingTabIndexOptions, "orientation"> = {},
) {
  return useRovingTabIndex({
    ...options,
    orientation: "vertical",
    homeEndKeys: true,
    typeAhead: true,
  });
}

/**
 * Simplified hook for toolbar navigation
 */
export function useToolbarNavigation(
  itemCount: number,
  options: Omit<RovingTabIndexOptions, "orientation"> = {},
) {
  const result = useRovingTabIndex({
    ...options,
    orientation: "horizontal",
    homeEndKeys: true,
  });

  useEffect(() => {
    result.setItemCount(itemCount);
  }, [itemCount, result]);

  return result;
}

/**
 * Simplified hook for grid navigation
 */
export function useGridNavigation(
  columns: number,
  itemCount: number,
  options: Omit<RovingTabIndexOptions, "orientation"> = {},
) {
  const result = useRovingTabIndex({
    ...options,
    orientation: "both",
    homeEndKeys: true,
  });

  // Override handleKeyDown for grid-specific navigation
  const handleGridKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const { key } = event;
      const { focusedIndex, focusItem, focusFirst, focusLast } = result;

      const row = Math.floor(focusedIndex / columns);
      const col = focusedIndex % columns;

      switch (key) {
        case "ArrowRight":
          event.preventDefault();
          focusItem(focusedIndex + 1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          focusItem(focusedIndex - 1);
          break;
        case "ArrowDown":
          event.preventDefault();
          focusItem(focusedIndex + columns);
          break;
        case "ArrowUp":
          event.preventDefault();
          focusItem(focusedIndex - columns);
          break;
        case "Home":
          event.preventDefault();
          if (event.ctrlKey) {
            focusFirst();
          } else {
            focusItem(row * columns);
          }
          break;
        case "End":
          event.preventDefault();
          if (event.ctrlKey) {
            focusLast();
          } else {
            focusItem(Math.min(row * columns + columns - 1, itemCount - 1));
          }
          break;
      }
    },
    [result, columns, itemCount],
  );

  useEffect(() => {
    result.setItemCount(itemCount);
  }, [itemCount, result]);

  return {
    ...result,
    handleKeyDown: handleGridKeyDown,
    columns,
  };
}

export default useRovingTabIndex;
