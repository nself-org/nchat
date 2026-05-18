/**
 * DOM utilities for nself-chat
 * @module utils/dom
 */

import { logger } from "@/lib/logger";

/**
 * Check if we're running in a browser environment
 */
export const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when copied
 * @throws Error if clipboard API is not available
 * @example
 * await copyToClipboard('Hello, World!');
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!isBrowser) {
    throw new Error("Clipboard API is not available in this environment");
  }

  // Try the modern Clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      // Fall through to fallback
      logger.warn("Clipboard API failed, trying fallback:", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Fallback for older browsers
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  textArea.setAttribute("readonly", "");
  document.body.appendChild(textArea);

  try {
    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    if (!successful) {
      throw new Error("execCommand copy failed");
    }
  } finally {
    document.body.removeChild(textArea);
  }
}

/**
 * Read text from clipboard
 * @returns Promise that resolves with clipboard text
 */
export async function readFromClipboard(): Promise<string> {
  if (!isBrowser) {
    throw new Error("Clipboard API is not available in this environment");
  }

  if (navigator.clipboard && navigator.clipboard.readText) {
    return navigator.clipboard.readText();
  }

  throw new Error("Clipboard read is not supported in this browser");
}

/**
 * Download options
 */
export interface DownloadOptions {
  /** File name */
  filename: string;
  /** MIME type (default: determined from filename or 'application/octet-stream') */
  mimeType?: string;
}

/**
 * Download a file from content
 * @param content - File content (string, Blob, or ArrayBuffer)
 * @param options - Download options
 * @example
 * downloadFile('Hello, World!', { filename: 'hello.txt' });
 * downloadFile(new Blob([data]), { filename: 'data.json', mimeType: 'application/json' });
 */
export function downloadFile(
  content: string | Blob | ArrayBuffer,
  options: DownloadOptions,
): void {
  if (!isBrowser) {
    throw new Error("Download is not available in this environment");
  }

  const { filename } = options;
  let { mimeType } = options;

  // Determine MIME type from filename if not provided
  if (!mimeType) {
    const ext = filename.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      txt: "text/plain",
      json: "application/json",
      csv: "text/csv",
      html: "text/html",
      xml: "application/xml",
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      svg: "image/svg+xml",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
      zip: "application/zip",
    };
    mimeType = (ext && mimeTypes[ext]) || "application/octet-stream";
  }

  // Create Blob from content
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else if (content instanceof ArrayBuffer) {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = new Blob([content], { type: mimeType });
  }

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    // Clean up
    document.body.removeChild(link);
    // Delay URL revocation to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

/**
 * Download a file from a URL
 * @param url - URL to download from
 * @param filename - Optional filename (extracted from URL if not provided)
 */
export async function downloadFromUrl(
  url: string,
  filename?: string,
): Promise<void> {
  if (!isBrowser) {
    throw new Error("Download is not available in this environment");
  }

  // If same-origin, we can use a simple link click
  try {
    const urlObj = new URL(url, window.location.href);
    const isSameOrigin = urlObj.origin === window.location.origin;

    if (isSameOrigin) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || url.split("/").pop() || "download";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
  } catch {
    // Invalid URL, fall through to fetch
  }

  // For cross-origin, fetch and download
  const response = await fetch(url);
  const blob = await response.blob();

  downloadFile(blob, {
    filename: filename || url.split("/").pop() || "download",
  });
}

/**
 * Scroll behavior options
 */
export type ScrollBehavior = "auto" | "smooth" | "instant";

/**
 * Scroll alignment
 */
export type ScrollAlignment = "start" | "center" | "end" | "nearest";

/**
 * Scroll to element options
 */
export interface ScrollToElementOptions {
  /** Scroll behavior */
  behavior?: ScrollBehavior;
  /** Block alignment (vertical) */
  block?: ScrollAlignment;
  /** Inline alignment (horizontal) */
  inline?: ScrollAlignment;
  /** Offset from target (pixels) */
  offset?: number;
}

/**
 * Scroll to an element
 * @param element - Element or selector to scroll to
 * @param options - Scroll options
 * @example
 * scrollToElement('#section-1');
 * scrollToElement(myElement, { behavior: 'smooth', block: 'center' });
 */
export function scrollToElement(
  element: HTMLElement | string,
  options: ScrollToElementOptions = {},
): void {
  if (!isBrowser) return;

  const {
    behavior = "smooth",
    block = "start",
    inline = "nearest",
    offset = 0,
  } = options;

  let el: HTMLElement | null;

  if (typeof element === "string") {
    el = document.querySelector(element);
  } else {
    el = element;
  }

  if (!el) {
    logger.warn("scrollToElement: Element not found");
    return;
  }

  // If there's an offset, we need to handle it manually
  if (offset !== 0) {
    const elementRect = el.getBoundingClientRect();
    const absoluteTop = elementRect.top + window.scrollY;
    const absoluteLeft = elementRect.left + window.scrollX;

    window.scrollTo({
      top: absoluteTop - offset,
      left: absoluteLeft,
      behavior: behavior === "instant" ? "auto" : behavior,
    });
    return;
  }

  el.scrollIntoView({
    behavior: behavior === "instant" ? "auto" : behavior,
    block,
    inline,
  });
}

/**
 * Scroll to top of page
 * @param behavior - Scroll behavior
 */
export function scrollToTop(behavior: ScrollBehavior = "smooth"): void {
  if (!isBrowser) return;

  window.scrollTo({
    top: 0,
    behavior: behavior === "instant" ? "auto" : behavior,
  });
}

/**
 * Scroll to bottom of page
 * @param behavior - Scroll behavior
 */
export function scrollToBottom(behavior: ScrollBehavior = "smooth"): void {
  if (!isBrowser) return;

  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: behavior === "instant" ? "auto" : behavior,
  });
}

/**
 * Check if an element is in the viewport
 * @param element - Element to check
 * @param options - Options for checking visibility
 * @returns Whether the element is in view
 * @example
 * if (isElementInView(myElement)) {
 *   // console.log('Element is visible!');
 * }
 */
export function isElementInView(
  element: HTMLElement,
  options: {
    /** Require full visibility (default: false, any part visible counts) */
    fully?: boolean;
    /** Threshold for partial visibility (0-1, default: 0) */
    threshold?: number;
    /** Container element (default: viewport) */
    container?: HTMLElement;
  } = {},
): boolean {
  if (!isBrowser) return false;

  const { fully = false, threshold = 0, container } = options;

  const rect = element.getBoundingClientRect();

  let containerRect: DOMRect;
  if (container) {
    containerRect = container.getBoundingClientRect();
  } else {
    containerRect = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
  }

  if (fully) {
    return (
      rect.top >= containerRect.top &&
      rect.left >= containerRect.left &&
      rect.bottom <= containerRect.bottom &&
      rect.right <= containerRect.right
    );
  }

  if (threshold > 0) {
    const visibleHeight =
      Math.min(rect.bottom, containerRect.bottom) -
      Math.max(rect.top, containerRect.top);
    const visibleWidth =
      Math.min(rect.right, containerRect.right) -
      Math.max(rect.left, containerRect.left);

    const visibleArea = Math.max(0, visibleHeight) * Math.max(0, visibleWidth);
    const totalArea = rect.width * rect.height;

    return totalArea > 0 && visibleArea / totalArea >= threshold;
  }

  return (
    rect.bottom > containerRect.top &&
    rect.top < containerRect.bottom &&
    rect.right > containerRect.left &&
    rect.left < containerRect.right
  );
}

/**
 * Get the scrollable parent of an element
 * @param element - Element to find scroll parent for
 * @returns Scrollable parent element or document
 */
export function getScrollParent(element: HTMLElement): HTMLElement | Document {
  if (!isBrowser) {
    return document;
  }

  let parent: HTMLElement | null = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflow = style.overflow + style.overflowY + style.overflowX;

    if (/(auto|scroll|overlay)/.test(overflow)) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return document;
}

/**
 * Get scroll position of an element or window
 * @param element - Element to get scroll position from (default: window)
 * @returns Scroll position { x, y }
 */
export function getScrollPosition(element?: HTMLElement): {
  x: number;
  y: number;
} {
  if (!isBrowser) {
    return { x: 0, y: 0 };
  }

  if (element) {
    return {
      x: element.scrollLeft,
      y: element.scrollTop,
    };
  }

  return {
    x:
      window.scrollX ||
      window.pageXOffset ||
      document.documentElement.scrollLeft,
    y:
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop,
  };
}

/**
 * Get element dimensions including margin
 * @param element - Element to measure
 * @returns Dimensions object
 */
export function getElementDimensions(element: HTMLElement): {
  width: number;
  height: number;
  outerWidth: number;
  outerHeight: number;
  offsetTop: number;
  offsetLeft: number;
} {
  if (!isBrowser) {
    return {
      width: 0,
      height: 0,
      outerWidth: 0,
      outerHeight: 0,
      offsetTop: 0,
      offsetLeft: 0,
    };
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  const marginTop = parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;
  const marginLeft = parseFloat(style.marginLeft) || 0;
  const marginRight = parseFloat(style.marginRight) || 0;

  return {
    width: rect.width,
    height: rect.height,
    outerWidth: rect.width + marginLeft + marginRight,
    outerHeight: rect.height + marginTop + marginBottom,
    offsetTop: element.offsetTop,
    offsetLeft: element.offsetLeft,
  };
}

/**
 * Focus an element with optional scroll
 * @param element - Element or selector to focus
 * @param options - Focus options
 */
export function focusElement(
  element: HTMLElement | string,
  options: { preventScroll?: boolean; scrollIntoView?: boolean } = {},
): void {
  if (!isBrowser) return;

  const { preventScroll = false, scrollIntoView = false } = options;

  let el: HTMLElement | null;

  if (typeof element === "string") {
    el = document.querySelector(element);
  } else {
    el = element;
  }

  if (!el || typeof el.focus !== "function") {
    return;
  }

  el.focus({ preventScroll });

  if (scrollIntoView && !preventScroll) {
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

/**
 * Create and dispatch a custom event
 * @param element - Element to dispatch event on
 * @param eventName - Event name
 * @param detail - Event detail data
 * @returns Whether the event was not cancelled
 */
export function dispatchCustomEvent<T = unknown>(
  element: HTMLElement | Document | Window,
  eventName: string,
  detail?: T,
): boolean {
  if (!isBrowser) return false;

  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    cancelable: true,
  });

  return element.dispatchEvent(event);
}

/**
 * Add event listener with automatic cleanup
 * @param element - Element to add listener to
 * @param event - Event name
 * @param handler - Event handler
 * @param options - Event listener options
 * @returns Cleanup function
 */
export function addEventListenerWithCleanup<
  K extends keyof HTMLElementEventMap,
>(
  element: HTMLElement | Document | Window,
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void {
  element.addEventListener(event, handler as EventListener, options);

  return () => {
    element.removeEventListener(event, handler as EventListener, options);
  };
}

/**
 * Wait for an element to appear in the DOM
 * @param selector - CSS selector
 * @param options - Options
 * @returns Promise that resolves with the element
 */
export function waitForElement(
  selector: string,
  options: {
    timeout?: number;
    parent?: HTMLElement | Document;
  } = {},
): Promise<HTMLElement> {
  if (!isBrowser) {
    return Promise.reject(new Error("Not in browser environment"));
  }

  const { timeout = 5000, parent = document } = options;

  return new Promise((resolve, reject) => {
    // Check if element already exists
    const existing = parent.querySelector<HTMLElement>(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new MutationObserver((mutations, obs) => {
      const element = parent.querySelector<HTMLElement>(selector);
      if (element) {
        obs.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    observer.observe(parent, {
      childList: true,
      subtree: true,
    });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Lock body scroll (prevent background scrolling for modals)
 * @returns Unlock function
 */
export function lockScroll(): () => void {
  if (!isBrowser) {
    return () => {};
  }

  const scrollY = window.scrollY;
  const body = document.body;

  const originalStyles = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
  };

  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.width = "100%";

  return () => {
    body.style.overflow = originalStyles.overflow;
    body.style.position = originalStyles.position;
    body.style.top = originalStyles.top;
    body.style.width = originalStyles.width;
    window.scrollTo(0, scrollY);
  };
}

/**
 * Get the active element (handles shadow DOM)
 * @returns Active element
 */
export function getActiveElement(): Element | null {
  if (!isBrowser) return null;

  let active = document.activeElement;

  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }

  return active;
}

/**
 * Check if an element contains another element
 * @param parent - Parent element
 * @param child - Child element
 * @returns Whether parent contains child
 */
export function containsElement(
  parent: HTMLElement,
  child: HTMLElement | null,
): boolean {
  if (!child) return false;
  return parent.contains(child);
}
