/**
 * Tour Manager - Product tour management utilities
 *
 * Handles tour stops, navigation, and state management
 */

import type {
  TourStop,
  TourStopId,
  TourState,
  TourProgress,
  TourStatus,
  TourConfig,
} from "./onboarding-types";

// ============================================================================
// Tour Stop Definitions
// ============================================================================

export const tourStops: TourStop[] = [
  {
    id: "sidebar-navigation",
    title: "Sidebar Navigation",
    description:
      "The sidebar is your command center. Access channels, direct messages, and settings from here. You can collapse it with the toggle button to get more screen space.",
    targetSelector: '[data-tour="sidebar"]',
    placement: "right",
    spotlightPadding: 8,
    order: 0,
    action: {
      label: "Toggle Sidebar",
      handler: "toggleSidebar",
    },
  },
  {
    id: "channel-list",
    title: "Channel List",
    description:
      "Channels are where your team conversations happen. Public channels are marked with # and anyone can join. Private channels are marked with a lock icon.",
    targetSelector: '[data-tour="channel-list"]',
    placement: "right",
    spotlightPadding: 8,
    order: 1,
    action: {
      label: "Create Channel",
      handler: "openCreateChannel",
    },
  },
  {
    id: "message-composer",
    title: "Message Composer",
    description:
      "Type your messages here. You can use Markdown for formatting, @mention teammates, and attach files. Press Enter to send or Shift+Enter for a new line.",
    targetSelector: '[data-tour="message-composer"]',
    placement: "top",
    spotlightPadding: 4,
    order: 2,
    media: {
      type: "gif",
      url: "/images/tour/composer-demo.gif",
      alt: "Message composer demonstration",
    },
  },
  {
    id: "reactions-threads",
    title: "Reactions & Threads",
    description:
      "Hover over any message to add reactions or start a thread. Threads keep conversations organized without cluttering the main channel.",
    targetSelector: '[data-tour="message-actions"]',
    placement: "left",
    spotlightPadding: 4,
    order: 3,
  },
  {
    id: "search",
    title: "Search",
    description:
      'Find messages, files, and channels instantly. Use filters like "from:@user" or "in:#channel" to narrow down results. Press Cmd/Ctrl+K to open search quickly.',
    targetSelector: '[data-tour="search"]',
    placement: "bottom",
    spotlightPadding: 4,
    order: 4,
    action: {
      label: "Open Search",
      handler: "openSearch",
    },
  },
  {
    id: "settings",
    title: "Settings",
    description:
      "Customize your experience in Settings. Change your profile, notification preferences, theme, and more.",
    targetSelector: '[data-tour="settings"]',
    placement: "left",
    spotlightPadding: 4,
    order: 5,
    action: {
      label: "Open Settings",
      handler: "openSettings",
    },
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    description:
      "Power users love keyboard shortcuts! Press ? to see all available shortcuts, or Cmd/Ctrl+K for quick switching between channels.",
    targetSelector: '[data-tour="keyboard-shortcuts"]',
    placement: "center",
    order: 6,
    action: {
      label: "View Shortcuts",
      handler: "openShortcuts",
    },
  },
  {
    id: "mentions-notifications",
    title: "Mentions & Notifications",
    description:
      "When someone @mentions you, you'll see a notification here. Click the bell to view all your notifications and activity.",
    targetSelector: '[data-tour="notifications"]',
    placement: "bottom",
    spotlightPadding: 4,
    order: 7,
    action: {
      label: "View Notifications",
      handler: "openNotifications",
    },
  },
];

// ============================================================================
// Tour Helpers
// ============================================================================

/**
 * Get a tour stop by ID
 */
export function getTourStopById(stopId: TourStopId): TourStop | undefined {
  return tourStops.find((stop) => stop.id === stopId);
}

/**
 * Get the next tour stop
 */
export function getNextTourStop(
  currentStopId: TourStopId,
): TourStop | undefined {
  const currentStop = getTourStopById(currentStopId);
  if (!currentStop) return undefined;
  return tourStops.find((stop) => stop.order === currentStop.order + 1);
}

/**
 * Get the previous tour stop
 */
export function getPreviousTourStop(
  currentStopId: TourStopId,
): TourStop | undefined {
  const currentStop = getTourStopById(currentStopId);
  if (!currentStop) return undefined;
  return tourStops.find((stop) => stop.order === currentStop.order - 1);
}

/**
 * Get tour stop index
 */
export function getTourStopIndex(stopId: TourStopId): number {
  return tourStops.findIndex((stop) => stop.id === stopId);
}

/**
 * Get total number of tour stops
 */
export function getTotalTourStops(): number {
  return tourStops.length;
}

/**
 * Get all tour stop IDs
 */
export function getTourStopIds(): TourStopId[] {
  return tourStops.map((stop) => stop.id);
}

/**
 * Get tour stop by index
 */
export function getTourStopByIndex(index: number): TourStop | undefined {
  return tourStops[index];
}

// ============================================================================
// Tour Progress
// ============================================================================

/**
 * Calculate tour progress
 */
export function calculateTourProgress(state: TourState): TourProgress {
  const completedCount = state.completedStops.length;
  const totalStops = tourStops.length;
  const percentComplete =
    totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;

  const currentStop = state.currentStopId
    ? getTourStopById(state.currentStopId)
    : null;

  const nextStop = state.currentStopId
    ? getNextTourStop(state.currentStopId)
    : tourStops[0];

  const prevStop = state.currentStopId
    ? getPreviousTourStop(state.currentStopId)
    : null;

  return {
    totalStops,
    completedStops: completedCount,
    percentComplete,
    currentStop: currentStop ?? null,
    nextStop: nextStop ?? null,
    prevStop: prevStop ?? null,
  };
}

// ============================================================================
// Tour State Helpers
// ============================================================================

/**
 * Create initial tour state
 */
export function createInitialTourState(userId: string): TourState {
  return {
    userId,
    status: "not_started",
    currentStopId: null,
    completedStops: [],
    startedAt: undefined,
    completedAt: undefined,
    dismissedAt: undefined,
  };
}

/**
 * Check if tour is completed
 */
export function isTourCompleted(state: TourState): boolean {
  return (
    state.status === "completed" ||
    state.completedStops.length === tourStops.length
  );
}

/**
 * Check if tour is in progress
 */
export function isTourInProgress(state: TourState): boolean {
  return state.status === "in_progress";
}

/**
 * Check if a stop is completed
 */
export function isStopCompleted(state: TourState, stopId: TourStopId): boolean {
  return state.completedStops.includes(stopId);
}

// ============================================================================
// Tour Element Positioning
// ============================================================================

export interface ElementPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: "top" | "bottom" | "left" | "right";
}

/**
 * Get element position by selector
 */
export function getElementPosition(selector: string): ElementPosition | null {
  if (typeof document === "undefined") return null;

  const element = document.querySelector(selector);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Calculate tooltip position based on target element and placement
 */
export function calculateTooltipPosition(
  targetPosition: ElementPosition,
  placement: TourStop["placement"],
  tooltipWidth: number = 320,
  tooltipHeight: number = 200,
  offset: number = 16,
): TooltipPosition {
  let top: number;
  let left: number;
  let arrowPosition: TooltipPosition["arrowPosition"];

  switch (placement) {
    case "top":
      top = targetPosition.top - tooltipHeight - offset;
      left = targetPosition.left + (targetPosition.width - tooltipWidth) / 2;
      arrowPosition = "bottom";
      break;

    case "bottom":
      top = targetPosition.top + targetPosition.height + offset;
      left = targetPosition.left + (targetPosition.width - tooltipWidth) / 2;
      arrowPosition = "top";
      break;

    case "left":
      top = targetPosition.top + (targetPosition.height - tooltipHeight) / 2;
      left = targetPosition.left - tooltipWidth - offset;
      arrowPosition = "right";
      break;

    case "right":
      top = targetPosition.top + (targetPosition.height - tooltipHeight) / 2;
      left = targetPosition.left + targetPosition.width + offset;
      arrowPosition = "left";
      break;

    case "center":
    default:
      // Center in viewport
      top = (window.innerHeight - tooltipHeight) / 2;
      left = (window.innerWidth - tooltipWidth) / 2;
      arrowPosition = "top";
      break;
  }

  // Ensure tooltip stays within viewport bounds
  const viewportPadding = 16;

  if (left < viewportPadding) {
    left = viewportPadding;
  } else if (left + tooltipWidth > window.innerWidth - viewportPadding) {
    left = window.innerWidth - tooltipWidth - viewportPadding;
  }

  if (top < viewportPadding) {
    top = viewportPadding;
  } else if (top + tooltipHeight > window.innerHeight - viewportPadding) {
    top = window.innerHeight - tooltipHeight - viewportPadding;
  }

  return { top, left, arrowPosition };
}

/**
 * Scroll element into view
 */
export function scrollToElement(
  selector: string,
  behavior: ScrollBehavior = "smooth",
): void {
  if (typeof document === "undefined") return;

  const element = document.querySelector(selector);
  if (!element) return;

  element.scrollIntoView({
    behavior,
    block: "center",
    inline: "center",
  });
}

// ============================================================================
// Tour Action Handlers
// ============================================================================

export type TourActionHandler = () => void | Promise<void>;

/**
 * Register tour action handlers
 */
export const tourActionHandlers: Record<string, TourActionHandler> = {
  toggleSidebar: () => {
    // Dispatched via store
  },
  openCreateChannel: () => {
    // Dispatched via store
  },
  openSearch: () => {
    // Dispatched via store
  },
  openSettings: () => {
    // Navigate to settings
  },
  openShortcuts: () => {
    // Open keyboard shortcuts modal
  },
  openNotifications: () => {
    // Open notifications panel
  },
};

/**
 * Execute tour action
 */
export function executeTourAction(handlerName: string): void {
  const handler = tourActionHandlers[handlerName];
  if (handler) {
    handler();
  }
}

// ============================================================================
// Default Tour Configuration
// ============================================================================

export const defaultTourConfig: TourConfig = {
  enabled: true,
  autoStartAfterOnboarding: true,
  allowDismiss: true,
  stops: getTourStopIds(),
};
