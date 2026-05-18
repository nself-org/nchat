/**
 * Screen reader announcer utilities
 *
 * Provides ARIA live region management for dynamic content announcements
 * to assistive technologies.
 */

// ============================================================================
// Types
// ============================================================================

export type AnnouncementPriority = "polite" | "assertive";

export interface AnnouncementOptions {
  /** Priority level - polite waits for user to finish, assertive interrupts */
  priority?: AnnouncementPriority;
  /** Clear the announcement after a delay (ms) */
  clearAfter?: number;
  /** Whether to clear previous announcement first */
  clearPrevious?: boolean;
}

export interface QueuedAnnouncement {
  id: string;
  message: string;
  priority: AnnouncementPriority;
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const POLITE_REGION_ID = "nchat-live-region-polite";
const ASSERTIVE_REGION_ID = "nchat-live-region-assertive";
const DEFAULT_CLEAR_DELAY = 5000;
const ANNOUNCEMENT_DELAY = 100;

// ============================================================================
// State
// ============================================================================

let politeRegion: HTMLDivElement | null = null;
let assertiveRegion: HTMLDivElement | null = null;
let announcementQueue: QueuedAnnouncement[] = [];
let isProcessingQueue = false;
let announcementIdCounter = 0;

// ============================================================================
// Live Region Creation
// ============================================================================

/**
 * Creates visually hidden styles for live regions
 */
function getVisuallyHiddenStyles(): Partial<CSSStyleDeclaration> {
  return {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: "0",
  };
}

/**
 * Creates a live region element
 */
export function createLiveRegion(
  id: string,
  priority: AnnouncementPriority,
): HTMLDivElement {
  const region = document.createElement("div");
  region.id = id;
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", priority);
  region.setAttribute("aria-atomic", "true");
  region.setAttribute("aria-relevant", "additions text");

  Object.assign(region.style, getVisuallyHiddenStyles());

  return region;
}

/**
 * Initializes live regions in the document
 */
export function initializeLiveRegions(): void {
  if (typeof document === "undefined") return;

  // Check if regions already exist
  politeRegion = document.getElementById(POLITE_REGION_ID) as HTMLDivElement;
  assertiveRegion = document.getElementById(
    ASSERTIVE_REGION_ID,
  ) as HTMLDivElement;

  if (!politeRegion) {
    politeRegion = createLiveRegion(POLITE_REGION_ID, "polite");
    document.body.appendChild(politeRegion);
  }

  if (!assertiveRegion) {
    assertiveRegion = createLiveRegion(ASSERTIVE_REGION_ID, "assertive");
    document.body.appendChild(assertiveRegion);
  }
}

/**
 * Destroys live regions from the document
 */
export function destroyLiveRegions(): void {
  politeRegion?.remove();
  assertiveRegion?.remove();
  politeRegion = null;
  assertiveRegion = null;
  announcementQueue = [];
  isProcessingQueue = false;
}

/**
 * Gets the live region for a given priority
 */
export function getLiveRegion(
  priority: AnnouncementPriority,
): HTMLDivElement | null {
  if (!politeRegion || !assertiveRegion) {
    initializeLiveRegions();
  }
  return priority === "assertive" ? assertiveRegion : politeRegion;
}

// ============================================================================
// Announcement Functions
// ============================================================================

/**
 * Generates a unique announcement ID
 */
function generateAnnouncementId(): string {
  announcementIdCounter += 1;
  return `announcement-${announcementIdCounter}-${Date.now()}`;
}

/**
 * Announces a message to screen readers
 */
export function announce(
  message: string,
  options: AnnouncementOptions = {},
): string {
  const {
    priority = "polite",
    clearAfter = DEFAULT_CLEAR_DELAY,
    clearPrevious = true,
  } = options;

  const region = getLiveRegion(priority);
  if (!region) return "";

  const announcementId = generateAnnouncementId();

  if (clearPrevious) {
    // Clear the region first to ensure screen reader detects change
    region.textContent = "";
  }

  // Use RAF to ensure the clear is processed before setting new content
  requestAnimationFrame(() => {
    region.textContent = message;

    // Clear after delay to prevent stale announcements
    if (clearAfter > 0) {
      setTimeout(() => {
        if (region.textContent === message) {
          region.textContent = "";
        }
      }, clearAfter);
    }
  });

  return announcementId;
}

/**
 * Announces a polite message (waits for user to finish)
 */
export function announcePolite(message: string, clearAfter?: number): string {
  return announce(message, { priority: "polite", clearAfter });
}

/**
 * Announces an assertive message (interrupts immediately)
 */
export function announceAssertive(
  message: string,
  clearAfter?: number,
): string {
  return announce(message, { priority: "assertive", clearAfter });
}

/**
 * Clears all announcements
 */
export function clearAnnouncements(): void {
  const polite = getLiveRegion("polite");
  const assertive = getLiveRegion("assertive");

  if (polite) polite.textContent = "";
  if (assertive) assertive.textContent = "";
}

// ============================================================================
// Queue-based Announcements
// ============================================================================

/**
 * Processes the announcement queue
 */
function processQueue(): void {
  if (isProcessingQueue || announcementQueue.length === 0) return;

  isProcessingQueue = true;
  const announcement = announcementQueue.shift();

  if (!announcement) {
    isProcessingQueue = false;
    return;
  }

  const region = getLiveRegion(announcement.priority);
  if (!region) {
    isProcessingQueue = false;
    processQueue();
    return;
  }

  // Clear first
  region.textContent = "";

  setTimeout(() => {
    region.textContent = announcement.message;

    // Wait for screen reader to process
    setTimeout(() => {
      region.textContent = "";
      isProcessingQueue = false;
      processQueue();
    }, 1000);
  }, ANNOUNCEMENT_DELAY);
}

/**
 * Queues an announcement to be processed in order
 */
export function queueAnnouncement(
  message: string,
  priority: AnnouncementPriority = "polite",
): QueuedAnnouncement {
  const announcement: QueuedAnnouncement = {
    id: generateAnnouncementId(),
    message,
    priority,
    timestamp: Date.now(),
  };

  announcementQueue.push(announcement);
  processQueue();

  return announcement;
}

/**
 * Clears the announcement queue
 */
export function clearQueue(): void {
  announcementQueue = [];
  clearAnnouncements();
}

/**
 * Gets the current queue length
 */
export function getQueueLength(): number {
  return announcementQueue.length;
}

// ============================================================================
// Pre-built Announcement Messages
// ============================================================================

export const announcements = {
  // Navigation
  pageLoaded: (pageName: string) => `${pageName} page loaded`,
  pageLoading: (pageName: string) => `Loading ${pageName}`,
  navigatedTo: (destination: string) => `Navigated to ${destination}`,
  menuOpened: (menuName: string) => `${menuName} menu opened`,
  menuClosed: (menuName: string) => `${menuName} menu closed`,
  sidebarOpened: "Sidebar opened",
  sidebarClosed: "Sidebar closed",

  // Messages
  messageSent: "Message sent",
  messageSending: "Sending message",
  messageReceived: (sender: string) => `New message from ${sender}`,
  messageDeleted: "Message deleted",
  messageEdited: "Message edited",
  messagesCounted: (count: number) =>
    count === 1 ? "1 message" : `${count} messages`,

  // Channels
  channelJoined: (channelName: string) => `Joined channel ${channelName}`,
  channelLeft: (channelName: string) => `Left channel ${channelName}`,
  channelCreated: (channelName: string) => `Created channel ${channelName}`,
  channelDeleted: (channelName: string) => `Deleted channel ${channelName}`,
  channelSelected: (channelName: string) => `Selected channel ${channelName}`,

  // Users
  userJoined: (userName: string) => `${userName} joined`,
  userLeft: (userName: string) => `${userName} left`,
  userTyping: (userName: string) => `${userName} is typing`,
  usersTyping: (count: number) =>
    count === 1 ? "1 person is typing" : `${count} people are typing`,
  userOnline: (userName: string) => `${userName} is now online`,
  userOffline: (userName: string) => `${userName} is now offline`,

  // Status and loading
  loading: "Loading",
  loaded: "Loaded",
  loadingComplete: "Loading complete",
  error: (message: string) => `Error: ${message}`,
  success: (message: string) => `Success: ${message}`,
  warning: (message: string) => `Warning: ${message}`,
  info: (message: string) => message,

  // Forms
  formSubmitting: "Submitting form",
  formSubmitted: "Form submitted successfully",
  formError: (errorCount: number) =>
    errorCount === 1 ? "Form has 1 error" : `Form has ${errorCount} errors`,
  fieldError: (fieldName: string, error: string) => `${fieldName}: ${error}`,
  fieldValid: (fieldName: string) => `${fieldName} is valid`,
  requiredField: (fieldName: string) => `${fieldName} is required`,

  // Dialogs and modals
  dialogOpened: (title: string) => `${title} dialog opened`,
  dialogClosed: "Dialog closed",
  modalOpened: (title: string) => `${title} modal opened`,
  modalClosed: "Modal closed",
  confirmationRequired: "Confirmation required",

  // Notifications
  notificationReceived: (title: string) => `New notification: ${title}`,
  notificationCount: (count: number) =>
    count === 0
      ? "No new notifications"
      : count === 1
        ? "1 new notification"
        : `${count} new notifications`,
  notificationCleared: "Notification cleared",

  // Lists and items
  itemSelected: (itemName: string) => `Selected ${itemName}`,
  itemDeselected: (itemName: string) => `Deselected ${itemName}`,
  itemAdded: (itemName: string) => `Added ${itemName}`,
  itemRemoved: (itemName: string) => `Removed ${itemName}`,
  listEmpty: "List is empty",
  listUpdated: (count: number) =>
    count === 1 ? "1 item in list" : `${count} items in list`,

  // Search
  searchResults: (count: number) =>
    count === 0
      ? "No results found"
      : count === 1
        ? "1 result found"
        : `${count} results found`,
  searchCleared: "Search cleared",
  searching: "Searching",

  // Actions
  copied: "Copied to clipboard",
  saved: "Saved",
  deleted: "Deleted",
  undone: "Undone",
  redone: "Redone",
  refreshed: "Refreshed",
  uploaded: (fileName: string) => `Uploaded ${fileName}`,
  downloading: (fileName: string) => `Downloading ${fileName}`,
  downloaded: (fileName: string) => `Downloaded ${fileName}`,

  // Accessibility-specific
  skipLinkActivated: "Skipped to main content",
  focusTrapActivated: "Focus is trapped in dialog",
  focusTrapDeactivated: "Focus trap released",
  keyboardNavigationHint: (key: string, action: string) =>
    `Press ${key} to ${action}`,
} as const;

// ============================================================================
// Announcement Utilities
// ============================================================================

/**
 * Creates a debounced announcer that prevents rapid-fire announcements
 */
export function createDebouncedAnnouncer(
  delay: number = 250,
): (message: string, options?: AnnouncementOptions) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastMessage = "";

  return (message: string, options?: AnnouncementOptions) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Don't announce the same message twice in a row
    if (message === lastMessage) return;

    timeoutId = setTimeout(() => {
      announce(message, options);
      lastMessage = message;
      timeoutId = null;
    }, delay);
  };
}

/**
 * Creates a throttled announcer that limits announcement frequency
 */
export function createThrottledAnnouncer(
  interval: number = 1000,
): (message: string, options?: AnnouncementOptions) => void {
  let lastAnnouncementTime = 0;
  let pendingMessage: string | null = null;
  let pendingOptions: AnnouncementOptions | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (message: string, options?: AnnouncementOptions) => {
    const now = Date.now();
    const timeSinceLast = now - lastAnnouncementTime;

    if (timeSinceLast >= interval) {
      announce(message, options);
      lastAnnouncementTime = now;
      pendingMessage = null;
    } else {
      pendingMessage = message;
      pendingOptions = options;

      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          if (pendingMessage) {
            announce(pendingMessage, pendingOptions);
            lastAnnouncementTime = Date.now();
            pendingMessage = null;
          }
          timeoutId = null;
        }, interval - timeSinceLast);
      }
    }
  };
}

/**
 * Announces a list of items
 */
export function announceList(
  items: string[],
  options: AnnouncementOptions & { separator?: string } = {},
): string {
  const { separator = ", ", ...announceOptions } = options;
  const message = items.join(separator);
  return announce(message, announceOptions);
}

/**
 * Announces a progress update
 */
export function announceProgress(
  current: number,
  total: number,
  options: AnnouncementOptions & { label?: string } = {},
): string {
  const { label = "Progress", ...announceOptions } = options;
  const percentage = Math.round((current / total) * 100);
  const message = `${label}: ${percentage}% complete`;
  return announce(message, announceOptions);
}
