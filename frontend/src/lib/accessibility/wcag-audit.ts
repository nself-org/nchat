/**
 * WCAG 2.1 AA Compliance Audit
 *
 * Utilities for checking WCAG 2.1 Level AA compliance.
 */

/**
 * WCAG Success Criteria Categories
 */
export enum WCAGCriteria {
  // Perceivable
  TextAlternatives = "1.1.1",
  CaptionsPrerecorded = "1.2.2",
  AudioDescriptionOrMediaAlternative = "1.2.3",
  CaptionsLive = "1.2.4",
  AudioDescription = "1.2.5",
  InfoAndRelationships = "1.3.1",
  MeaningfulSequence = "1.3.2",
  SensoryCharacteristics = "1.3.3",
  Orientation = "1.3.4",
  IdentifyInputPurpose = "1.3.5",
  UseOfColor = "1.4.1",
  AudioControl = "1.4.2",
  ContrastMinimum = "1.4.3",
  ResizeText = "1.4.4",
  ImagesOfText = "1.4.5",
  Reflow = "1.4.10",
  NonTextContrast = "1.4.11",
  TextSpacing = "1.4.12",
  ContentOnHoverOrFocus = "1.4.13",

  // Operable
  Keyboard = "2.1.1",
  NoKeyboardTrap = "2.1.2",
  KeyboardNoException = "2.1.3",
  CharacterKeyShortcuts = "2.1.4",
  TimingAdjustable = "2.2.1",
  PauseStopHide = "2.2.2",
  ThreeFlashesOrBelowThreshold = "2.3.1",
  BypassBlocks = "2.4.1",
  PageTitled = "2.4.2",
  FocusOrder = "2.4.3",
  LinkPurposeInContext = "2.4.4",
  MultipleWays = "2.4.5",
  HeadingsAndLabels = "2.4.6",
  FocusVisible = "2.4.7",
  PointerGestures = "2.5.1",
  PointerCancellation = "2.5.2",
  LabelInName = "2.5.3",
  MotionActuation = "2.5.4",

  // Understandable
  LanguageOfPage = "3.1.1",
  LanguageOfParts = "3.1.2",
  OnFocus = "3.2.1",
  OnInput = "3.2.2",
  ConsistentNavigation = "3.2.3",
  ConsistentIdentification = "3.2.4",
  ErrorIdentification = "3.3.1",
  LabelsOrInstructions = "3.3.2",
  ErrorSuggestion = "3.3.3",
  ErrorPreventionLegal = "3.3.4",

  // Robust
  Parsing = "4.1.1",
  NameRoleValue = "4.1.2",
  StatusMessages = "4.1.3",
}

/**
 * WCAG Conformance Level
 */
export enum ConformanceLevel {
  A = "A",
  AA = "AA",
  AAA = "AAA",
}

/**
 * Audit Result
 */
export interface AuditResult {
  criteria: WCAGCriteria;
  level: ConformanceLevel;
  passed: boolean;
  message: string;
  element?: Element;
  suggestions?: string[];
}

/**
 * Color contrast checker (WCAG 1.4.3)
 */
export function checkColorContrast(
  foreground: string,
  background: string,
  fontSize: number = 16,
  isBold: boolean = false,
): {
  ratio: number;
  passes: boolean;
  level: ConformanceLevel | null;
} {
  // Parse RGB values
  const parseColor = (color: string): [number, number, number] => {
    // Handle hex colors
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }

    // Handle rgb/rgba colors
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }

    return [0, 0, 0];
  };

  // Calculate relative luminance
  const getLuminance = (rgb: [number, number, number]): number => {
    const [r, g, b] = rgb.map((val) => {
      const sRGB = val / 255;
      return sRGB <= 0.03928
        ? sRGB / 12.92
        : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const fg = parseColor(foreground);
  const bg = parseColor(background);

  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);

  // Determine if it's large text
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && isBold);

  // Check conformance
  const minRatioAA = isLargeText ? 3 : 4.5;
  const minRatioAAA = isLargeText ? 4.5 : 7;

  let level: ConformanceLevel | null = null;
  if (ratio >= minRatioAAA) {
    level = ConformanceLevel.AAA;
  } else if (ratio >= minRatioAA) {
    level = ConformanceLevel.AA;
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    passes: ratio >= minRatioAA,
    level,
  };
}

/**
 * Check if element has accessible name (WCAG 4.1.2)
 */
export function hasAccessibleName(element: Element): boolean {
  // Check for aria-label
  if (element.hasAttribute("aria-label")) {
    return element.getAttribute("aria-label")!.trim().length > 0;
  }

  // Check for aria-labelledby
  if (element.hasAttribute("aria-labelledby")) {
    const id = element.getAttribute("aria-labelledby");
    const labelElement = document.getElementById(id!);
    return labelElement?.textContent?.trim().length ? true : false;
  }

  // Check for label element (for form controls)
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      return label?.textContent?.trim().length ? true : false;
    }
  }

  // Check for title attribute
  if (element.hasAttribute("title")) {
    return element.getAttribute("title")!.trim().length > 0;
  }

  // Check for alt attribute (images)
  if (element instanceof HTMLImageElement) {
    return element.hasAttribute("alt");
  }

  // Check for text content
  return element.textContent?.trim().length ? true : false;
}

/**
 * Check if element is keyboard accessible (WCAG 2.1.1)
 */
export function isKeyboardAccessible(element: Element): boolean {
  // Check if element is focusable
  if (element instanceof HTMLElement) {
    // Native focusable elements
    const focusableElements = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];
    if (focusableElements.includes(element.tagName)) {
      return element.tabIndex >= 0;
    }

    // Elements with tabindex
    if (element.hasAttribute("tabindex")) {
      return element.tabIndex >= 0;
    }

    // Elements with role button, link, etc.
    const role = element.getAttribute("role");
    if (
      role &&
      ["button", "link", "menuitem", "tab", "option"].includes(role)
    ) {
      return element.tabIndex >= 0;
    }
  }

  return false;
}

/**
 * Check if interactive element has appropriate role (WCAG 4.1.2)
 */
export function hasAppropriateRole(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();

  // Native semantic elements don't need explicit roles
  const semanticElements = [
    "button",
    "a",
    "input",
    "select",
    "textarea",
    "nav",
    "main",
    "header",
    "footer",
    "article",
    "section",
  ];
  if (semanticElements.includes(tagName)) {
    return true;
  }

  // Check for ARIA role
  return element.hasAttribute("role");
}

/**
 * Check if page has proper language attribute (WCAG 3.1.1)
 */
export function hasLanguageAttribute(): boolean {
  return (
    document.documentElement.hasAttribute("lang") &&
    document.documentElement.lang.trim().length > 0
  );
}

/**
 * Check if page has a proper title (WCAG 2.4.2)
 */
export function hasPageTitle(): boolean {
  return document.title.trim().length > 0;
}

/**
 * Check for skip links (WCAG 2.4.1)
 */
export function hasSkipLinks(): boolean {
  const skipLinks = document.querySelectorAll('a[href^="#"]');
  for (const link of Array.from(skipLinks)) {
    const href = link.getAttribute("href");
    if (href && href.startsWith("#") && href.length > 1) {
      const target = document.querySelector(href);
      if (target) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if headings are in correct order (WCAG 1.3.1)
 */
export function checkHeadingHierarchy(): {
  valid: boolean;
  issues: string[];
} {
  const headings = Array.from(
    document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  );
  const issues: string[] = [];
  let lastLevel = 0;

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1));

    // First heading should be h1
    if (index === 0 && level !== 1) {
      issues.push("First heading should be h1");
    }

    // Headings should not skip levels
    if (level > lastLevel + 1) {
      issues.push(`Heading level ${level} skips level ${lastLevel + 1}`);
    }

    lastLevel = level;
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Run full WCAG AA audit
 */
export function runWCAGAudit(): AuditResult[] {
  const results: AuditResult[] = [];

  // Check language attribute
  results.push({
    criteria: WCAGCriteria.LanguageOfPage,
    level: ConformanceLevel.A,
    passed: hasLanguageAttribute(),
    message: hasLanguageAttribute()
      ? "Page has valid language attribute"
      : "Page is missing language attribute on <html> element",
    suggestions: hasLanguageAttribute()
      ? undefined
      : ["Add lang attribute to <html> element"],
  });

  // Check page title
  results.push({
    criteria: WCAGCriteria.PageTitled,
    level: ConformanceLevel.A,
    passed: hasPageTitle(),
    message: hasPageTitle()
      ? "Page has a descriptive title"
      : "Page is missing a title",
    suggestions: hasPageTitle()
      ? undefined
      : ["Add descriptive <title> element"],
  });

  // Check skip links
  results.push({
    criteria: WCAGCriteria.BypassBlocks,
    level: ConformanceLevel.A,
    passed: hasSkipLinks(),
    message: hasSkipLinks()
      ? "Page has skip links"
      : "Page is missing skip links",
    suggestions: hasSkipLinks() ? undefined : ["Add skip navigation links"],
  });

  // Check heading hierarchy
  const headingCheck = checkHeadingHierarchy();
  results.push({
    criteria: WCAGCriteria.InfoAndRelationships,
    level: ConformanceLevel.A,
    passed: headingCheck.valid,
    message: headingCheck.valid
      ? "Heading hierarchy is correct"
      : `Heading hierarchy has issues: ${headingCheck.issues.join(", ")}`,
    suggestions: headingCheck.valid ? undefined : headingCheck.issues,
  });

  // Check interactive elements for keyboard accessibility
  const interactiveElements = document.querySelectorAll(
    'button, a, [role="button"], [role="link"], [onclick]',
  );
  let keyboardInaccessible = 0;

  interactiveElements.forEach((element) => {
    if (!isKeyboardAccessible(element)) {
      keyboardInaccessible++;
    }
  });

  results.push({
    criteria: WCAGCriteria.Keyboard,
    level: ConformanceLevel.A,
    passed: keyboardInaccessible === 0,
    message:
      keyboardInaccessible === 0
        ? "All interactive elements are keyboard accessible"
        : `${keyboardInaccessible} interactive elements are not keyboard accessible`,
    suggestions:
      keyboardInaccessible === 0
        ? undefined
        : [
            'Add tabindex="0" to interactive elements',
            "Use semantic HTML elements (button, a) instead of div/span with onclick",
          ],
  });

  // Check images for alt text
  const images = document.querySelectorAll("img");
  let missingAlt = 0;

  images.forEach((img) => {
    if (!img.hasAttribute("alt")) {
      missingAlt++;
    }
  });

  results.push({
    criteria: WCAGCriteria.TextAlternatives,
    level: ConformanceLevel.A,
    passed: missingAlt === 0,
    message:
      missingAlt === 0
        ? "All images have alt text"
        : `${missingAlt} images are missing alt text`,
    suggestions:
      missingAlt === 0
        ? undefined
        : [
            "Add alt attribute to all images",
            'Use alt="" for decorative images',
          ],
  });

  return results;
}

/**
 * Generate WCAG compliance report
 */
export function generateWCAGReport(): {
  passed: number;
  failed: number;
  total: number;
  conformanceLevel: ConformanceLevel | null;
  results: AuditResult[];
} {
  const results = runWCAGAudit();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  // Determine conformance level
  let conformanceLevel: ConformanceLevel | null = null;
  const levelAFailed = results.filter(
    (r) => r.level === ConformanceLevel.A && !r.passed,
  ).length;
  const levelAAFailed = results.filter(
    (r) => r.level === ConformanceLevel.AA && !r.passed,
  ).length;

  if (levelAFailed === 0 && levelAAFailed === 0) {
    conformanceLevel = ConformanceLevel.AA;
  } else if (levelAFailed === 0) {
    conformanceLevel = ConformanceLevel.A;
  }

  return {
    passed,
    failed,
    total,
    conformanceLevel,
    results,
  };
}
