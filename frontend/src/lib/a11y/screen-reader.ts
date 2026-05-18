/**
 * Screen Reader Utilities
 *
 * Utilities for improving screen reader accessibility:
 * - ARIA live regions
 * - Screen reader announcements
 * - ARIA labels and descriptions
 * - Semantic markup helpers
 */

// ============================================================================
// Live Region Manager
// ============================================================================

class LiveRegionManager {
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;
  private statusRegion: HTMLElement | null = null;
  private initialized = false;

  /**
   * Initialize live regions
   */
  private initialize() {
    if (this.initialized || typeof document === "undefined") return;

    // Polite region for general announcements
    this.politeRegion = this.createLiveRegion("polite", "aria-live-polite");

    // Assertive region for urgent announcements
    this.assertiveRegion = this.createLiveRegion(
      "assertive",
      "aria-live-assertive",
    );

    // Status region for status updates
    this.statusRegion = this.createLiveRegion("polite", "aria-live-status");
    this.statusRegion.setAttribute("role", "status");

    this.initialized = true;
  }

  /**
   * Create a live region element
   */
  private createLiveRegion(
    politeness: "polite" | "assertive",
    id: string,
  ): HTMLElement {
    const region = document.createElement("div");
    region.id = id;
    region.setAttribute("aria-live", politeness);
    region.setAttribute("aria-atomic", "true");
    region.className = "sr-only";

    // Add to body
    document.body.appendChild(region);

    return region;
  }

  /**
   * Announce a message to screen readers
   */
  announce(message: string, priority: "polite" | "assertive" = "polite") {
    this.initialize();

    const region =
      priority === "assertive" ? this.assertiveRegion : this.politeRegion;

    if (!region) return;

    // Clear previous message
    region.textContent = "";

    // Set new message after a brief delay to ensure it's announced
    setTimeout(() => {
      region.textContent = message;
    }, 100);
  }

  /**
   * Announce a status update
   */
  announceStatus(message: string) {
    this.initialize();

    if (!this.statusRegion) return;

    // Clear and set message
    this.statusRegion.textContent = "";
    setTimeout(() => {
      this.statusRegion!.textContent = message;
    }, 100);
  }

  /**
   * Clear all announcements
   */
  clear() {
    if (this.politeRegion) this.politeRegion.textContent = "";
    if (this.assertiveRegion) this.assertiveRegion.textContent = "";
    if (this.statusRegion) this.statusRegion.textContent = "";
  }

  /**
   * Cleanup live regions
   */
  cleanup() {
    if (this.politeRegion) this.politeRegion.remove();
    if (this.assertiveRegion) this.assertiveRegion.remove();
    if (this.statusRegion) this.statusRegion.remove();

    this.politeRegion = null;
    this.assertiveRegion = null;
    this.statusRegion = null;
    this.initialized = false;
  }
}

// Singleton instance
const liveRegionManager = new LiveRegionManager();

// ============================================================================
// Public API
// ============================================================================

/**
 * Announce a message to screen readers
 *
 * @example
 * announce('Message sent successfully');
 * announce('Error: Failed to send message', 'assertive');
 */
export function announce(
  message: string,
  priority: "polite" | "assertive" = "polite",
) {
  liveRegionManager.announce(message, priority);
}

/**
 * Announce a status update
 *
 * @example
 * announceStatus('5 new messages');
 */
export function announceStatus(message: string) {
  liveRegionManager.announceStatus(message);
}

/**
 * Clear all screen reader announcements
 */
export function clearAnnouncements() {
  liveRegionManager.clear();
}

// ============================================================================
// ARIA Label Helpers
// ============================================================================

/**
 * Generate ARIA label for icon buttons
 *
 * @example
 * getIconButtonLabel('Send', 'message');
 * // Returns: 'Send message'
 */
export function getIconButtonLabel(action: string, subject?: string): string {
  if (subject) {
    return `${action} ${subject}`;
  }
  return action;
}

/**
 * Generate ARIA label for status indicators
 *
 * @example
 * getStatusLabel('online', 'John Doe');
 * // Returns: 'John Doe is online'
 */
export function getStatusLabel(status: string, name?: string): string {
  if (name) {
    return `${name} is ${status}`;
  }
  return status;
}

/**
 * Generate ARIA label for counts
 *
 * @example
 * getCountLabel(5, 'message', 'messages');
 * // Returns: '5 messages'
 *
 * getCountLabel(1, 'message', 'messages');
 * // Returns: '1 message'
 */
export function getCountLabel(
  count: number,
  singular: string,
  plural?: string,
): string {
  const word = count === 1 ? singular : plural || `${singular}s`;
  return `${count} ${word}`;
}

/**
 * Generate ARIA label for time
 *
 * @example
 * getTimeLabel(new Date());
 * // Returns: 'Today at 3:45 PM'
 */
export function getTimeLabel(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "just now";
  } else if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else if (days < 7) {
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  }
}

/**
 * Generate ARIA label for message
 *
 * @example
 * getMessageLabel('Hello', 'John Doe', new Date());
 * // Returns: 'Message from John Doe, just now: Hello'
 */
export function getMessageLabel(
  content: string,
  authorName: string,
  timestamp: Date,
  options?: {
    isEdited?: boolean;
    hasAttachments?: boolean;
    attachmentCount?: number;
  },
): string {
  const timeLabel = getTimeLabel(timestamp);
  let label = `Message from ${authorName}, ${timeLabel}`;

  if (options?.isEdited) {
    label += ", edited";
  }

  if (options?.hasAttachments) {
    const count = options.attachmentCount || 1;
    label += `, ${getCountLabel(count, "attachment")}`;
  }

  label += `: ${content}`;

  return label;
}

/**
 * Generate ARIA label for channel
 *
 * @example
 * getChannelLabel('general', { unreadCount: 5, isPrivate: false });
 * // Returns: 'general channel, 5 unread messages'
 */
export function getChannelLabel(
  name: string,
  options?: {
    unreadCount?: number;
    isPrivate?: boolean;
    isMuted?: boolean;
  },
): string {
  let label = name;

  if (options?.isPrivate) {
    label += " private channel";
  } else {
    label += " channel";
  }

  if (options?.unreadCount && options.unreadCount > 0) {
    label += `, ${getCountLabel(options.unreadCount, "unread message", "unread messages")}`;
  }

  if (options?.isMuted) {
    label += ", muted";
  }

  return label;
}

// ============================================================================
// ARIA Description Helpers
// ============================================================================

/**
 * Generate description ID for ARIA describedby
 */
export function generateDescriptionId(baseId: string): string {
  return `${baseId}-description`;
}

/**
 * Create description element
 */
export function createDescription(id: string, text: string): HTMLElement {
  const description = document.createElement("span");
  description.id = id;
  description.className = "sr-only";
  description.textContent = text;
  return description;
}

// ============================================================================
// Role Helpers
// ============================================================================

/**
 * Get appropriate ARIA role for message list
 */
export function getMessageListRole(): "log" | "feed" {
  // Use 'log' for chat messages (automatic updates)
  // Use 'feed' for activity feeds (user-controlled)
  return "log";
}

/**
 * Get appropriate ARIA role for navigation
 */
export function getNavigationRole(
  type: "main" | "secondary" | "footer",
): string {
  switch (type) {
    case "main":
      return "navigation";
    case "secondary":
      return "navigation";
    case "footer":
      return "contentinfo";
    default:
      return "navigation";
  }
}

// ============================================================================
// Semantic Markup Helpers
// ============================================================================

/**
 * Generate heading level based on hierarchy
 */
export function getHeadingLevel(
  level: number,
): "h1" | "h2" | "h3" | "h4" | "h5" | "h6" {
  const clampedLevel = Math.max(1, Math.min(6, level)) as 1 | 2 | 3 | 4 | 5 | 6;
  return `h${clampedLevel}`;
}

/**
 * Generate landmark role
 */
export function getLandmarkRole(
  type:
    | "banner"
    | "main"
    | "complementary"
    | "contentinfo"
    | "navigation"
    | "search",
): string {
  return type;
}

// ============================================================================
// Interactive Element Helpers
// ============================================================================

/**
 * Get keyboard interaction description
 */
export function getKeyboardDescription(
  elementType: "menu" | "dialog" | "listbox" | "combobox" | "tree",
): string {
  switch (elementType) {
    case "menu":
      return "Use arrow keys to navigate, Enter to select, Escape to close";
    case "dialog":
      return "Press Escape to close";
    case "listbox":
      return "Use arrow keys to navigate, Enter to select";
    case "combobox":
      return "Type to filter, use arrow keys to navigate, Enter to select";
    case "tree":
      return "Use arrow keys to navigate, Right to expand, Left to collapse, Enter to select";
    default:
      return "";
  }
}

/**
 * Get loading message
 */
export function getLoadingMessage(resource?: string): string {
  if (resource) {
    return `Loading ${resource}`;
  }
  return "Loading";
}

/**
 * Get error message
 */
export function getErrorMessage(error: string, context?: string): string {
  if (context) {
    return `Error in ${context}: ${error}`;
  }
  return `Error: ${error}`;
}

/**
 * Get success message
 */
export function getSuccessMessage(action: string): string {
  return `${action} successful`;
}

// ============================================================================
// Export Manager
// ============================================================================

export { liveRegionManager };
