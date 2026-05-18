/**
 * Keyboard Navigation Utilities
 *
 * Utilities for implementing accessible keyboard navigation:
 * - Focus management
 * - Roving tabindex
 * - Keyboard shortcuts
 * - Navigation patterns
 */

// ============================================================================
// Types
// ============================================================================

export interface FocusableElement extends HTMLElement {
  disabled?: boolean;
}

export interface NavigationOptions {
  orientation?: "horizontal" | "vertical" | "both";
  loop?: boolean;
  rtl?: boolean;
  skipDisabled?: boolean;
}

export interface RovingTabIndexOptions extends NavigationOptions {
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
}

// ============================================================================
// Focusable Element Detection
// ============================================================================

/**
 * Check if an element is focusable
 */
export function isFocusable(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;

  // Disabled elements are not focusable
  if (element.hasAttribute("disabled")) return false;
  if (element.getAttribute("aria-disabled") === "true") return false;

  // Hidden elements are not focusable
  if (element.hasAttribute("hidden")) return false;
  if (element.getAttribute("aria-hidden") === "true") return false;
  if (getComputedStyle(element).display === "none") return false;
  if (getComputedStyle(element).visibility === "hidden") return false;

  // Check tabindex
  const tabindex = element.getAttribute("tabindex");
  if (tabindex === "-1") return false;

  // Check if naturally focusable
  const tagName = element.tagName.toLowerCase();
  const focusableTags = [
    "a",
    "button",
    "input",
    "textarea",
    "select",
    "details",
    "iframe",
  ];

  if (focusableTags.includes(tagName)) {
    // Links must have href
    if (tagName === "a" && !element.hasAttribute("href")) return false;
    return true;
  }

  // Has tabindex >= 0
  if (tabindex && parseInt(tabindex) >= 0) return true;

  // Has contenteditable
  if (element.isContentEditable) return true;

  return false;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(
  container: Element,
  options?: { includeDisabled?: boolean },
): HTMLElement[] {
  const { includeDisabled = false } = options || {};

  const selector = [
    "a[href]",
    "button",
    "input",
    "textarea",
    "select",
    "details",
    "[tabindex]",
    '[contenteditable="true"]',
  ].join(", ");

  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(selector),
  );

  return elements.filter((element) => {
    if (!includeDisabled && !isFocusable(element)) return false;
    return true;
  });
}

/**
 * Get first focusable element in container
 */
export function getFirstFocusableElement(
  container: Element,
): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[0] || null;
}

/**
 * Get last focusable element in container
 */
export function getLastFocusableElement(
  container: Element,
): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[elements.length - 1] || null;
}

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Move focus to element and scroll into view if needed
 */
export function focusElement(
  element: HTMLElement,
  options?: ScrollIntoViewOptions,
) {
  element.focus();

  if (options !== undefined) {
    element.scrollIntoView(options);
  } else {
    // Default scroll behavior
    element.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }
}

/**
 * Focus first element in container
 */
export function focusFirst(
  container: Element,
  scrollOptions?: ScrollIntoViewOptions,
): boolean {
  const first = getFirstFocusableElement(container);
  if (first) {
    focusElement(first, scrollOptions);
    return true;
  }
  return false;
}

/**
 * Focus last element in container
 */
export function focusLast(
  container: Element,
  scrollOptions?: ScrollIntoViewOptions,
): boolean {
  const last = getLastFocusableElement(container);
  if (last) {
    focusElement(last, scrollOptions);
    return true;
  }
  return false;
}

/**
 * Get next focusable element
 */
export function getNextFocusable(
  container: Element,
  current: Element,
  options?: NavigationOptions,
): HTMLElement | null {
  const { loop = false, skipDisabled = true } = options || {};
  const elements = getFocusableElements(container, {
    includeDisabled: !skipDisabled,
  });

  const currentIndex = elements.indexOf(current as HTMLElement);
  if (currentIndex === -1) return null;

  let nextIndex = currentIndex + 1;

  if (nextIndex >= elements.length) {
    if (loop) {
      nextIndex = 0;
    } else {
      return null;
    }
  }

  return elements[nextIndex] || null;
}

/**
 * Get previous focusable element
 */
export function getPreviousFocusable(
  container: Element,
  current: Element,
  options?: NavigationOptions,
): HTMLElement | null {
  const { loop = false, skipDisabled = true } = options || {};
  const elements = getFocusableElements(container, {
    includeDisabled: !skipDisabled,
  });

  const currentIndex = elements.indexOf(current as HTMLElement);
  if (currentIndex === -1) return null;

  let prevIndex = currentIndex - 1;

  if (prevIndex < 0) {
    if (loop) {
      prevIndex = elements.length - 1;
    } else {
      return null;
    }
  }

  return elements[prevIndex] || null;
}

/**
 * Move focus to next element
 */
export function focusNext(
  container: Element,
  current: Element,
  options?: NavigationOptions,
): boolean {
  const next = getNextFocusable(container, current, options);
  if (next) {
    focusElement(next);
    return true;
  }
  return false;
}

/**
 * Move focus to previous element
 */
export function focusPrevious(
  container: Element,
  current: Element,
  options?: NavigationOptions,
): boolean {
  const prev = getPreviousFocusable(container, current, options);
  if (prev) {
    focusElement(prev);
    return true;
  }
  return false;
}

// ============================================================================
// Roving Tabindex
// ============================================================================

/**
 * Implement roving tabindex pattern
 *
 * Only one item in a list is tabbable at a time, but arrow keys
 * allow navigating to all items.
 */
export class RovingTabIndex {
  private container: HTMLElement;
  private items: HTMLElement[];
  private activeIndex: number;
  private options: RovingTabIndexOptions;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, options?: RovingTabIndexOptions) {
    this.container = container;
    this.options = {
      orientation: "vertical",
      loop: true,
      skipDisabled: true,
      activeIndex: 0,
      ...options,
    };

    this.items = [];
    this.activeIndex = this.options.activeIndex || 0;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);

    this.initialize();
  }

  /**
   * Initialize roving tabindex
   */
  private initialize() {
    this.updateItems();
    this.updateTabIndices();
    this.container.addEventListener("keydown", this.boundHandleKeyDown);
  }

  /**
   * Update list of items
   */
  updateItems() {
    this.items = getFocusableElements(this.container, {
      includeDisabled: !this.options.skipDisabled,
    });
  }

  /**
   * Update tabindex attributes
   */
  private updateTabIndices() {
    this.items.forEach((item, index) => {
      if (index === this.activeIndex) {
        item.setAttribute("tabindex", "0");
      } else {
        item.setAttribute("tabindex", "-1");
      }
    });
  }

  /**
   * Set active index
   */
  setActiveIndex(index: number) {
    if (index < 0 || index >= this.items.length) return;

    this.activeIndex = index;
    this.updateTabIndices();
    this.options.onActiveIndexChange?.(index);
  }

  /**
   * Focus active item
   */
  focusActive() {
    const activeItem = this.items[this.activeIndex];
    if (activeItem) {
      focusElement(activeItem);
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown(event: KeyboardEvent) {
    const { orientation, loop } = this.options;
    const target = event.target as HTMLElement;

    // Only handle if target is one of our items
    if (!this.items.includes(target)) return;

    const currentIndex = this.items.indexOf(target);
    let nextIndex = currentIndex;

    // Arrow key navigation
    const isVertical = orientation === "vertical" || orientation === "both";
    const isHorizontal = orientation === "horizontal" || orientation === "both";

    if (isVertical && event.key === "ArrowDown") {
      event.preventDefault();
      nextIndex = currentIndex + 1;
    } else if (isVertical && event.key === "ArrowUp") {
      event.preventDefault();
      nextIndex = currentIndex - 1;
    } else if (isHorizontal && event.key === "ArrowRight") {
      event.preventDefault();
      nextIndex = currentIndex + 1;
    } else if (isHorizontal && event.key === "ArrowLeft") {
      event.preventDefault();
      nextIndex = currentIndex - 1;
    } else if (event.key === "Home") {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      nextIndex = this.items.length - 1;
    } else {
      return; // Key not handled
    }

    // Handle looping
    if (loop) {
      if (nextIndex >= this.items.length) {
        nextIndex = 0;
      } else if (nextIndex < 0) {
        nextIndex = this.items.length - 1;
      }
    } else {
      nextIndex = Math.max(0, Math.min(nextIndex, this.items.length - 1));
    }

    // Move focus
    if (nextIndex !== currentIndex) {
      this.setActiveIndex(nextIndex);
      this.focusActive();
    }
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    this.container.removeEventListener("keydown", this.boundHandleKeyDown);
  }
}

// ============================================================================
// Focus Trap
// ============================================================================

/**
 * Trap focus within a container (for modals, dialogs)
 */
export class FocusTrap {
  private container: HTMLElement;
  private previouslyFocused: HTMLElement | null;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private onEscape?: () => void;

  constructor(container: HTMLElement, options?: { onEscape?: () => void }) {
    this.container = container;
    this.onEscape = options?.onEscape;
    this.previouslyFocused = document.activeElement as HTMLElement;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);

    this.activate();
  }

  /**
   * Activate focus trap
   */
  activate() {
    // Store current focus
    this.previouslyFocused = document.activeElement as HTMLElement;

    // Focus first element in container
    focusFirst(this.container);

    // Add event listener
    this.container.addEventListener("keydown", this.boundHandleKeyDown);
  }

  /**
   * Handle Tab key to trap focus
   */
  private handleKeyDown(event: KeyboardEvent) {
    // Handle Escape key
    if (event.key === "Escape" && this.onEscape) {
      event.preventDefault();
      this.onEscape();
      return;
    }

    // Handle Tab key
    if (event.key !== "Tab") return;

    const elements = getFocusableElements(this.container);
    if (elements.length === 0) return;

    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];
    const activeElement = document.activeElement;

    // Shift+Tab on first element
    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      focusElement(lastElement);
    }
    // Tab on last element
    else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      focusElement(firstElement);
    }
  }

  /**
   * Deactivate focus trap and restore focus
   */
  deactivate() {
    this.container.removeEventListener("keydown", this.boundHandleKeyDown);

    // Restore focus to previously focused element
    if (this.previouslyFocused && this.previouslyFocused.focus) {
      this.previouslyFocused.focus();
    }
  }
}

// ============================================================================
// Skip Links
// ============================================================================

/**
 * Create skip link element
 */
export function createSkipLink(
  targetId: string,
  label: string = "Skip to main content",
): HTMLAnchorElement {
  const skipLink = document.createElement("a");
  skipLink.href = `#${targetId}`;
  skipLink.className = "skip-link";
  skipLink.textContent = label;

  skipLink.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute("tabindex", "-1");
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });

      // Remove tabindex after focus
      target.addEventListener(
        "blur",
        () => {
          target.removeAttribute("tabindex");
        },
        { once: true },
      );
    }
  });

  return skipLink;
}

/**
 * Add skip links to page
 */
export function addSkipLinks(
  links: Array<{ id: string; label: string }>,
): () => void {
  const container = document.createElement("div");
  container.className = "skip-links";
  container.setAttribute("role", "navigation");
  container.setAttribute("aria-label", "Skip links");

  links.forEach(({ id, label }) => {
    const skipLink = createSkipLink(id, label);
    container.appendChild(skipLink);
  });

  document.body.insertBefore(container, document.body.firstChild);

  // Return cleanup function
  return () => {
    container.remove();
  };
}

// ============================================================================
// Typeahead/Search Navigation
// ============================================================================

/**
 * Handle typeahead search in lists
 */
export class TypeaheadSearch {
  private container: HTMLElement;
  private items: HTMLElement[];
  private searchString: string;
  private clearTimeout: number | null;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.items = [];
    this.searchString = "";
    this.clearTimeout = null;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);

    this.initialize();
  }

  private initialize() {
    this.updateItems();
    this.container.addEventListener("keydown", this.boundHandleKeyDown);
  }

  updateItems() {
    this.items = getFocusableElements(this.container);
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Only handle printable characters
    if (
      event.key.length !== 1 ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey
    ) {
      return;
    }

    // Add to search string
    this.searchString += event.key.toLowerCase();

    // Clear timeout
    if (this.clearTimeout) {
      clearTimeout(this.clearTimeout);
    }

    // Set new timeout to clear search string
    this.clearTimeout = window.setTimeout(() => {
      this.searchString = "";
    }, 500);

    // Find matching item
    const match = this.items.find((item) => {
      const text = item.textContent?.toLowerCase() || "";
      return text.startsWith(this.searchString);
    });

    if (match) {
      focusElement(match);
    }
  }

  destroy() {
    if (this.clearTimeout) {
      clearTimeout(this.clearTimeout);
    }
    this.container.removeEventListener("keydown", this.boundHandleKeyDown);
  }
}

// ============================================================================
// Export Helpers
// ============================================================================

/**
 * Check if element is currently focused
 */
export function isFocused(element: Element): boolean {
  return document.activeElement === element;
}

/**
 * Check if element contains focus
 */
export function containsFocus(element: Element): boolean {
  return element.contains(document.activeElement);
}

/**
 * Get currently focused element
 */
export function getFocusedElement(): Element | null {
  return document.activeElement;
}
