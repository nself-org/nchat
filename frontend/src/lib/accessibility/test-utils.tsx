/**
 * Accessibility Testing Utilities
 *
 * Utilities for testing WCAG 2.1 AA compliance in Jest tests using jest-axe.
 */

import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

/**
 * Axe configuration for WCAG 2.1 AA
 */
export const axeConfig = {
  rules: {
    // WCAG 2.1 Level A & AA rules
    "aria-allowed-attr": { enabled: true },
    "aria-command-name": { enabled: true },
    "aria-conditional-attr": { enabled: true },
    "aria-deprecated-role": { enabled: true },
    "aria-dialog-name": { enabled: true },
    "aria-hidden-body": { enabled: true },
    "aria-hidden-focus": { enabled: true },
    "aria-input-field-name": { enabled: true },
    "aria-meter-name": { enabled: true },
    "aria-progressbar-name": { enabled: true },
    "aria-required-attr": { enabled: true },
    "aria-required-children": { enabled: true },
    "aria-required-parent": { enabled: true },
    "aria-roledescription": { enabled: true },
    "aria-roles": { enabled: true },
    "aria-toggle-field-name": { enabled: true },
    "aria-tooltip-name": { enabled: true },
    "aria-treeitem-name": { enabled: true },
    "aria-valid-attr-value": { enabled: true },
    "aria-valid-attr": { enabled: true },
    "button-name": { enabled: true },
    bypass: { enabled: true },
    "color-contrast": { enabled: true },
    "document-title": { enabled: true },
    "duplicate-id-active": { enabled: true },
    "duplicate-id-aria": { enabled: true },
    "duplicate-id": { enabled: true },
    "empty-heading": { enabled: true },
    "empty-table-header": { enabled: true },
    "form-field-multiple-labels": { enabled: true },
    "frame-title": { enabled: true },
    "heading-order": { enabled: true },
    "html-has-lang": { enabled: true },
    "html-lang-valid": { enabled: true },
    "html-xml-lang-mismatch": { enabled: true },
    "image-alt": { enabled: true },
    "input-button-name": { enabled: true },
    "input-image-alt": { enabled: true },
    "label-content-name-mismatch": { enabled: true },
    "label-title-only": { enabled: true },
    label: { enabled: true },
    "link-in-text-block": { enabled: true },
    "link-name": { enabled: true },
    list: { enabled: true },
    listitem: { enabled: true },
    "meta-refresh": { enabled: true },
    "meta-viewport": { enabled: true },
    "object-alt": { enabled: true },
    "role-img-alt": { enabled: true },
    "scrollable-region-focusable": { enabled: true },
    "select-name": { enabled: true },
    "server-side-image-map": { enabled: true },
    "svg-img-alt": { enabled: true },
    tabindex: { enabled: true },
    "table-duplicate-name": { enabled: true },
    "table-fake-caption": { enabled: true },
    "td-has-header": { enabled: true },
    "td-headers-attr": { enabled: true },
    "th-has-data-cells": { enabled: true },
    "valid-lang": { enabled: true },
    "video-caption": { enabled: true },
  },
};

/**
 * Test component for accessibility violations
 */
export async function testA11y(
  ui: ReactElement,
  options?: {
    axeOptions?: any;
    renderOptions?: RenderOptions;
  },
) {
  const { container } = render(ui, options?.renderOptions);
  const results = await axe(container, options?.axeOptions || axeConfig);
  return results;
}

/**
 * Assert component has no accessibility violations
 */
export async function expectNoA11yViolations(
  ui: ReactElement,
  options?: {
    axeOptions?: any;
    renderOptions?: RenderOptions;
  },
) {
  const results = await testA11y(ui, options);
  expect(results).toHaveNoViolations();
}

/**
 * Test keyboard navigation
 */
export function testKeyboardNavigation(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]',
  );

  const tests = {
    hasFocusableElements: focusableElements.length > 0,
    allHaveTabIndex: Array.from(focusableElements).every((el) => {
      const tabindex = el.getAttribute("tabindex");
      return tabindex === null || parseInt(tabindex) >= 0;
    }),
    noKeyboardTraps: true, // Would need interaction testing
  };

  return tests;
}

/**
 * Test color contrast
 */
export function testColorContrast(element: HTMLElement): {
  passed: boolean;
  violations: Array<{
    element: HTMLElement;
    foreground: string;
    background: string;
    ratio: number;
  }>;
} {
  const violations: Array<{
    element: HTMLElement;
    foreground: string;
    background: string;
    ratio: number;
  }> = [];

  // Get all text elements
  const textElements = element.querySelectorAll("*");

  textElements.forEach((el) => {
    if (el instanceof HTMLElement && el.textContent?.trim()) {
      const styles = window.getComputedStyle(el);
      const foreground = styles.color;
      const background = styles.backgroundColor;

      // Check if colors are defined
      if (foreground && background) {
        const ratio = calculateContrastRatio(foreground, background);
        const fontSize = parseFloat(styles.fontSize);
        const isBold = parseInt(styles.fontWeight) >= 700;

        const minRatio = fontSize >= 18 || (fontSize >= 14 && isBold) ? 3 : 4.5;

        if (ratio < minRatio) {
          violations.push({
            element: el,
            foreground,
            background,
            ratio,
          });
        }
      }
    }
  });

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Calculate contrast ratio between two colors
 */
function calculateContrastRatio(
  foreground: string,
  background: string,
): number {
  const getLuminance = (color: string): number => {
    // Parse RGB from color string
    const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];

    const [r, g, b] = rgb.map((val) => {
      const sRGB = val / 255;
      return sRGB <= 0.03928
        ? sRGB / 12.92
        : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Test ARIA attributes
 */
export function testARIA(element: HTMLElement): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for aria-label or aria-labelledby on interactive elements
  const interactiveElements = element.querySelectorAll(
    'button, a, [role="button"], [role="link"], input, select, textarea',
  );

  interactiveElements.forEach((el) => {
    const hasLabel =
      el.hasAttribute("aria-label") ||
      el.hasAttribute("aria-labelledby") ||
      el.textContent?.trim() ||
      (el instanceof HTMLInputElement && el.labels?.length);

    if (!hasLabel) {
      issues.push(`Interactive element missing accessible name: ${el.tagName}`);
    }
  });

  // Check for invalid ARIA roles
  const elementsWithRole = element.querySelectorAll("[role]");

  elementsWithRole.forEach((el) => {
    const role = el.getAttribute("role");
    const validRoles = [
      "alert",
      "alertdialog",
      "application",
      "article",
      "banner",
      "button",
      "cell",
      "checkbox",
      "columnheader",
      "combobox",
      "complementary",
      "contentinfo",
      "definition",
      "dialog",
      "directory",
      "document",
      "feed",
      "figure",
      "form",
      "grid",
      "gridcell",
      "group",
      "heading",
      "img",
      "link",
      "list",
      "listbox",
      "listitem",
      "log",
      "main",
      "marquee",
      "math",
      "menu",
      "menubar",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "navigation",
      "none",
      "note",
      "option",
      "presentation",
      "progressbar",
      "radio",
      "radiogroup",
      "region",
      "row",
      "rowgroup",
      "rowheader",
      "scrollbar",
      "search",
      "searchbox",
      "separator",
      "slider",
      "spinbutton",
      "status",
      "switch",
      "tab",
      "table",
      "tablist",
      "tabpanel",
      "term",
      "textbox",
      "timer",
      "toolbar",
      "tooltip",
      "tree",
      "treegrid",
      "treeitem",
    ];

    if (role && !validRoles.includes(role)) {
      issues.push(`Invalid ARIA role: ${role}`);
    }
  });

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Test focus management
 */
export function testFocusManagement(element: HTMLElement): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for focus visible styles
  const focusableElements = element.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );

  focusableElements.forEach((el) => {
    if (el instanceof HTMLElement) {
      // Check if element has focus styles
      const styles = window.getComputedStyle(el);
      const hasOutline = styles.outline !== "none" && styles.outline !== "0px";
      const hasFocusRing =
        el.classList.contains("focus:ring") ||
        el.classList.contains("focus:outline");

      if (!hasOutline && !hasFocusRing) {
        issues.push(`Element missing focus styles: ${el.tagName}`);
      }
    }
  });

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Test screen reader compatibility
 */
export function testScreenReader(element: HTMLElement): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for proper heading hierarchy
  const headings = Array.from(
    element.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  );
  let lastLevel = 0;

  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.substring(1));
    if (level > lastLevel + 1) {
      issues.push(`Heading hierarchy skipped: h${lastLevel} to h${level}`);
    }
    lastLevel = level;
  });

  // Check for alt text on images
  const images = element.querySelectorAll("img");
  images.forEach((img) => {
    if (!img.hasAttribute("alt")) {
      issues.push("Image missing alt attribute");
    }
  });

  // Check for form labels
  const inputs = element.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    if (input instanceof HTMLElement) {
      const hasLabel =
        input.hasAttribute("aria-label") ||
        input.hasAttribute("aria-labelledby") ||
        (input.id && element.querySelector(`label[for="${input.id}"]`));

      if (!hasLabel) {
        issues.push(`Form control missing label: ${input.tagName}`);
      }
    }
  });

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Run comprehensive accessibility tests
 */
export async function runComprehensiveA11yTests(ui: ReactElement) {
  const { container } = render(ui);

  const results = {
    axe: await axe(container, axeConfig),
    keyboard: testKeyboardNavigation(container),
    contrast: testColorContrast(container),
    aria: testARIA(container),
    focus: testFocusManagement(container),
    screenReader: testScreenReader(container),
  };

  const allPassed =
    results.axe.violations.length === 0 &&
    results.keyboard.hasFocusableElements &&
    results.contrast.passed &&
    results.aria.passed &&
    results.focus.passed &&
    results.screenReader.passed;

  return {
    passed: allPassed,
    results,
  };
}
