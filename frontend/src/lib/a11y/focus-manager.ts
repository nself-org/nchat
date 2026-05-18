/**
 * Focus management utilities for accessibility
 *
 * Provides focus trapping, restoration, skip links, and focus visibility handling
 * for modals, dialogs, and other interactive components.
 */

// ============================================================================
// Constants
// ============================================================================

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable]",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const SKIP_LINK_ID = "nchat-skip-link-target";

// ============================================================================
// Types
// ============================================================================

export interface FocusTrapOptions {
  /** Initial element to focus when trap activates */
  initialFocus?: HTMLElement | string | null;
  /** Element to return focus to when trap deactivates */
  returnFocus?: HTMLElement | null;
  /** Whether to allow Escape key to deactivate trap */
  escapeDeactivates?: boolean;
  /** Callback when escape is pressed */
  onEscape?: () => void;
  /** Whether clicking outside deactivates trap */
  clickOutsideDeactivates?: boolean;
  /** Callback when clicked outside */
  onClickOutside?: () => void;
}

export interface FocusTrap {
  activate: () => void;
  deactivate: () => void;
  isActive: () => boolean;
  pause: () => void;
  unpause: () => void;
}

// ============================================================================
// Focus Trap Implementation
// ============================================================================

/**
 * Creates a focus trap within a container element
 * Traps keyboard focus within the container for modal dialogs
 */
export function createFocusTrap(
  container: HTMLElement,
  options: FocusTrapOptions = {},
): FocusTrap {
  const {
    initialFocus = null,
    returnFocus = null,
    escapeDeactivates = true,
    onEscape,
    clickOutsideDeactivates = false,
    onClickOutside,
  } = options;

  let active = false;
  let paused = false;
  let previouslyFocusedElement: HTMLElement | null = null;

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (paused || !active) return;

    if (event.key === "Escape" && escapeDeactivates) {
      event.preventDefault();
      event.stopPropagation();
      onEscape?.();
      return;
    }

    if (event.key === "Tab") {
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        if (
          activeElement === firstElement ||
          !container.contains(activeElement)
        ) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (
          activeElement === lastElement ||
          !container.contains(activeElement)
        ) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  const handleClickOutside = (event: MouseEvent): void => {
    if (paused || !active) return;
    if (!container.contains(event.target as Node)) {
      if (clickOutsideDeactivates) {
        onClickOutside?.();
      } else {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };

  const focusInitialElement = (): void => {
    let elementToFocus: HTMLElement | null = null;

    if (typeof initialFocus === "string") {
      elementToFocus = container.querySelector<HTMLElement>(initialFocus);
    } else if (initialFocus instanceof HTMLElement) {
      elementToFocus = initialFocus;
    }

    if (!elementToFocus) {
      const focusableElements = getFocusableElements(container);
      elementToFocus = focusableElements[0] || container;
    }

    if (elementToFocus) {
      // Make container focusable if needed
      if (!elementToFocus.hasAttribute("tabindex")) {
        elementToFocus.setAttribute("tabindex", "-1");
      }
      elementToFocus.focus();
    }
  };

  const activate = (): void => {
    if (active) return;

    previouslyFocusedElement =
      returnFocus || (document.activeElement as HTMLElement) || null;
    active = true;

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("mousedown", handleClickOutside, true);

    // Use RAF to ensure DOM is ready
    requestAnimationFrame(() => {
      focusInitialElement();
    });
  };

  const deactivate = (): void => {
    if (!active) return;

    active = false;
    document.removeEventListener("keydown", handleKeyDown, true);
    document.removeEventListener("mousedown", handleClickOutside, true);

    // Restore focus
    if (
      previouslyFocusedElement &&
      typeof previouslyFocusedElement.focus === "function"
    ) {
      requestAnimationFrame(() => {
        previouslyFocusedElement?.focus();
      });
    }
    previouslyFocusedElement = null;
  };

  const isActive = (): boolean => active;

  const pause = (): void => {
    paused = true;
  };

  const unpause = (): void => {
    paused = false;
  };

  return {
    activate,
    deactivate,
    isActive,
    pause,
    unpause,
  };
}

// ============================================================================
// Focus Utilities
// ============================================================================

/**
 * Gets all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(elements).filter((element) => {
    return isElementVisible(element) && !isElementDisabled(element);
  });
}

/**
 * Checks if an element is visible in the DOM
 */
export function isElementVisible(element: HTMLElement): boolean {
  if (
    !element.offsetParent &&
    element.offsetWidth === 0 &&
    element.offsetHeight === 0
  ) {
    // Check if it's a fixed/sticky positioned element
    const style = getComputedStyle(element);
    if (style.position !== "fixed" && style.position !== "sticky") {
      return false;
    }
  }

  const style = getComputedStyle(element);
  if (style.display === "none") return false;
  if (style.visibility === "hidden") return false;
  if (style.opacity === "0") return false;

  return true;
}

/**
 * Checks if an element is disabled
 */
export function isElementDisabled(element: HTMLElement): boolean {
  if (element.hasAttribute("disabled")) return true;
  if (element.getAttribute("aria-disabled") === "true") return true;
  return false;
}

/**
 * Saves the currently focused element for later restoration
 */
export function saveFocus(): HTMLElement | null {
  return document.activeElement as HTMLElement | null;
}

/**
 * Restores focus to a previously saved element
 */
export function restoreFocus(element: HTMLElement | null): boolean {
  if (element && typeof element.focus === "function") {
    try {
      element.focus();
      return document.activeElement === element;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Focuses the first focusable element in a container
 */
export function focusFirst(container: HTMLElement): boolean {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
    return true;
  }
  return false;
}

/**
 * Focuses the last focusable element in a container
 */
export function focusLast(container: HTMLElement): boolean {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[focusableElements.length - 1].focus();
    return true;
  }
  return false;
}

/**
 * Focuses the next focusable element
 */
export function focusNext(container: HTMLElement): boolean {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return false;

  const currentIndex = focusableElements.indexOf(
    document.activeElement as HTMLElement,
  );
  const nextIndex =
    currentIndex === -1 ? 0 : (currentIndex + 1) % focusableElements.length;
  focusableElements[nextIndex].focus();
  return true;
}

/**
 * Focuses the previous focusable element
 */
export function focusPrevious(container: HTMLElement): boolean {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return false;

  const currentIndex = focusableElements.indexOf(
    document.activeElement as HTMLElement,
  );
  const prevIndex =
    currentIndex === -1
      ? focusableElements.length - 1
      : (currentIndex - 1 + focusableElements.length) %
        focusableElements.length;
  focusableElements[prevIndex].focus();
  return true;
}

// ============================================================================
// Skip Link Utilities
// ============================================================================

/**
 * Creates a skip link element for keyboard navigation
 */
export function createSkipLink(
  targetId: string = SKIP_LINK_ID,
  text: string = "Skip to main content",
): HTMLAnchorElement {
  const skipLink = document.createElement("a");
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className = "nchat-skip-link";

  // Add required styles
  Object.assign(skipLink.style, {
    position: "absolute",
    top: "-40px",
    left: "0",
    padding: "8px",
    backgroundColor: "var(--skip-link-bg, #000)",
    color: "var(--skip-link-color, #fff)",
    textDecoration: "none",
    zIndex: "9999",
    transition: "top 0.2s ease",
  });

  // Show on focus
  skipLink.addEventListener("focus", () => {
    skipLink.style.top = "0";
  });

  skipLink.addEventListener("blur", () => {
    skipLink.style.top = "-40px";
  });

  return skipLink;
}

/**
 * Creates a skip link target element
 */
export function createSkipLinkTarget(
  id: string = SKIP_LINK_ID,
): HTMLDivElement {
  const target = document.createElement("div");
  target.id = id;
  target.tabIndex = -1;
  target.setAttribute("aria-label", "Start of main content");
  return target;
}

/**
 * Installs a skip link in the document
 */
export function installSkipLink(
  targetId: string = SKIP_LINK_ID,
  text: string = "Skip to main content",
): { skipLink: HTMLAnchorElement; remove: () => void } {
  const skipLink = createSkipLink(targetId, text);
  document.body.insertBefore(skipLink, document.body.firstChild);

  return {
    skipLink,
    remove: () => {
      skipLink.remove();
    },
  };
}

// ============================================================================
// Focus Visible Utilities
// ============================================================================

let focusVisibleActive = false;
let hadKeyboardEvent = false;

/**
 * Detects if the user is using keyboard navigation
 */
export function isUsingKeyboard(): boolean {
  return hadKeyboardEvent;
}

/**
 * Enables focus-visible polyfill behavior
 */
export function enableFocusVisible(): () => void {
  if (focusVisibleActive) return () => {};

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Tab" || event.key === "Enter" || event.key === " ") {
      hadKeyboardEvent = true;
      document.documentElement.classList.add("focus-visible");
    }
  };

  const handleMouseDown = (): void => {
    hadKeyboardEvent = false;
    document.documentElement.classList.remove("focus-visible");
  };

  const handleFocus = (event: FocusEvent): void => {
    if (hadKeyboardEvent && event.target instanceof HTMLElement) {
      event.target.classList.add("focus-visible");
    }
  };

  const handleBlur = (event: FocusEvent): void => {
    if (event.target instanceof HTMLElement) {
      event.target.classList.remove("focus-visible");
    }
  };

  document.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("mousedown", handleMouseDown, true);
  document.addEventListener("focus", handleFocus, true);
  document.addEventListener("blur", handleBlur, true);

  focusVisibleActive = true;

  return () => {
    document.removeEventListener("keydown", handleKeyDown, true);
    document.removeEventListener("mousedown", handleMouseDown, true);
    document.removeEventListener("focus", handleFocus, true);
    document.removeEventListener("blur", handleBlur, true);
    focusVisibleActive = false;
    hadKeyboardEvent = false;
    document.documentElement.classList.remove("focus-visible");
  };
}

/**
 * CSS class utilities for focus styles
 */
export const focusStyles = {
  /** Standard focus ring */
  ring: "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  /** Outline focus style */
  outline:
    "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  /** No visible focus */
  none: "focus:outline-none focus-visible:outline-none",
  /** Focus within container */
  within:
    "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
  /** Inset focus ring */
  inset:
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
} as const;

export type FocusStyle = keyof typeof focusStyles;
