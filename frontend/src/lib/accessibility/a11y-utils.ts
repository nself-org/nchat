/**
 * Accessibility utility functions
 */

let idCounter = 0;

/**
 * Generate a unique ID for ARIA relationships
 */
export function generateId(prefix: string = "a11y"): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now().toString(36)}`;
}

/**
 * Generate IDs for common ARIA patterns
 */
export function generateAriaIds(prefix: string) {
  const baseId = generateId(prefix);
  return {
    root: baseId,
    label: `${baseId}-label`,
    description: `${baseId}-description`,
    error: `${baseId}-error`,
    listbox: `${baseId}-listbox`,
    trigger: `${baseId}-trigger`,
    content: `${baseId}-content`,
    title: `${baseId}-title`,
    item: (index: number) => `${baseId}-item-${index}`,
  };
}

/**
 * Merge ARIA props from multiple sources
 */
export function mergeAriaProps<T extends Record<string, unknown>>(
  ...propsList: (Partial<T> | undefined)[]
): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const props of propsList) {
    if (!props) continue;

    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null) continue;

      // Handle aria-describedby and aria-labelledby specially (concatenate)
      if (key === "aria-describedby" || key === "aria-labelledby") {
        const existing = result[key] as string | undefined;
        result[key] = existing ? `${existing} ${value}` : value;
      }
      // Handle className specially (concatenate)
      else if (key === "className") {
        const existing = result[key] as string | undefined;
        result[key] = existing ? `${existing} ${value}` : value;
      }
      // For other props, later values override earlier ones
      else {
        result[key] = value;
      }
    }
  }

  return result as Partial<T>;
}

/**
 * Build aria-describedby from multiple sources
 */
export function buildDescribedBy(
  ...ids: (string | undefined | null | false)[]
): string | undefined {
  const validIds = ids.filter(Boolean) as string[];
  return validIds.length > 0 ? validIds.join(" ") : undefined;
}

/**
 * Build aria-labelledby from multiple sources
 */
export function buildLabelledBy(
  ...ids: (string | undefined | null | false)[]
): string | undefined {
  const validIds = ids.filter(Boolean) as string[];
  return validIds.length > 0 ? validIds.join(" ") : undefined;
}

/**
 * Get the currently focused element
 */
export function getActiveElement(): HTMLElement | null {
  let active = document.activeElement as HTMLElement | null;

  // Handle shadow DOM
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement as HTMLElement;
  }

  return active;
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute("disabled")) return false;
  if (element.getAttribute("aria-disabled") === "true") return false;

  const tagName = element.tagName.toLowerCase();
  const focusableTags = ["a", "button", "input", "select", "textarea"];

  if (focusableTags.includes(tagName)) {
    if (tagName === "a" && !element.hasAttribute("href")) return false;
    if (tagName === "input" && element.getAttribute("type") === "hidden")
      return false;
    return true;
  }

  if (element.hasAttribute("contenteditable")) return true;
  if (element.tabIndex >= 0) return true;

  return false;
}

/**
 * Check if an element is visible
 */
export function isVisible(element: HTMLElement): boolean {
  if (
    !element.offsetParent &&
    element.offsetWidth === 0 &&
    element.offsetHeight === 0
  ) {
    return false;
  }

  const style = getComputedStyle(element);
  if (style.display === "none") return false;
  if (style.visibility === "hidden") return false;
  if (style.opacity === "0") return false;

  return true;
}

/**
 * Check if an element is both focusable and visible
 */
export function isTabbable(element: HTMLElement): boolean {
  return isFocusable(element) && isVisible(element);
}

/**
 * Get all tabbable elements within a container
 */
export function getTabbableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
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
    "[tabindex]",
  ].join(", ");

  const elements = container.querySelectorAll<HTMLElement>(selector);
  return Array.from(elements)
    .filter(isTabbable)
    .sort((a, b) => {
      const aIndex = a.tabIndex || 0;
      const bIndex = b.tabIndex || 0;
      if (aIndex === bIndex) return 0;
      if (aIndex === 0) return 1;
      if (bIndex === 0) return -1;
      return aIndex - bIndex;
    });
}

/**
 * Focus an element with proper handling
 */
export function focusElement(
  element: HTMLElement | null | undefined,
  options: FocusOptions = {},
): boolean {
  if (!element) return false;

  try {
    // Make element focusable if needed
    if (!element.hasAttribute("tabindex") && !isFocusable(element)) {
      element.setAttribute("tabindex", "-1");
    }

    element.focus(options);
    return document.activeElement === element;
  } catch {
    return false;
  }
}

/**
 * Scroll an element into view accessibly
 */
export function scrollIntoViewIfNeeded(
  element: HTMLElement,
  options: ScrollIntoViewOptions = { behavior: "smooth", block: "nearest" },
): void {
  const rect = element.getBoundingClientRect();
  const isInViewport =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth;

  if (!isInViewport) {
    element.scrollIntoView(options);
  }
}

/**
 * Get human-readable text from an element for announcements
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check aria-label
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  // Check aria-labelledby
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labels = labelledBy
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent)
      .filter(Boolean);
    if (labels.length > 0) return labels.join(" ");
  }

  // Check associated label (for form elements)
  if (element.id) {
    const label = document.querySelector<HTMLLabelElement>(
      `label[for="${element.id}"]`,
    );
    if (label?.textContent) return label.textContent;
  }

  // Check title attribute
  const title = element.getAttribute("title");
  if (title) return title;

  // Check alt attribute (for images)
  if (element instanceof HTMLImageElement && element.alt) {
    return element.alt;
  }

  // Fall back to text content
  return element.textContent?.trim() || "";
}

/**
 * Check color contrast ratio
 * Returns the contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(hexToRgb(color1));
  const lum2 = getRelativeLuminance(hexToRgb(color2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function getRelativeLuminance({
  r,
  g,
  b,
}: {
  r: number;
  g: number;
  b: number;
}): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Check if contrast meets WCAG requirements
 */
export function meetsContrastRequirement(
  color1: string,
  color2: string,
  level: "AA" | "AAA" = "AA",
  isLargeText: boolean = false,
): boolean {
  const ratio = getContrastRatio(color1, color2);
  if (level === "AAA") {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * ARIA role mappings for semantic elements
 */
export const semanticRoles: Record<string, string> = {
  article: "article",
  aside: "complementary",
  footer: "contentinfo",
  header: "banner",
  main: "main",
  nav: "navigation",
  section: "region",
  form: "form",
};

/**
 * Common keyboard codes for accessibility
 */
export const Keys = {
  Enter: "Enter",
  Space: " ",
  Escape: "Escape",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",
} as const;

export type KeyCode = (typeof Keys)[keyof typeof Keys];
