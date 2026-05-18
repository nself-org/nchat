"use client";

import { useCallback, useRef, useEffect } from "react";

export type AnnouncementPriority = "polite" | "assertive";

export interface Announcement {
  message: string;
  priority: AnnouncementPriority;
  timestamp: number;
}

/**
 * Hook for making screen reader announcements
 * Creates and manages ARIA live regions for dynamic content
 */
export function useAnnouncer() {
  const politeRegionRef = useRef<HTMLDivElement | null>(null);
  const assertiveRegionRef = useRef<HTMLDivElement | null>(null);
  const queueRef = useRef<Announcement[]>([]);
  const processingRef = useRef(false);

  // Create live regions on mount
  useEffect(() => {
    // Check if regions already exist (from another instance)
    let politeRegion = document.getElementById(
      "a11y-announcer-polite",
    ) as HTMLDivElement;
    let assertiveRegion = document.getElementById(
      "a11y-announcer-assertive",
    ) as HTMLDivElement;

    if (!politeRegion) {
      politeRegion = createLiveRegion("polite");
      document.body.appendChild(politeRegion);
    }

    if (!assertiveRegion) {
      assertiveRegion = createLiveRegion("assertive");
      document.body.appendChild(assertiveRegion);
    }

    politeRegionRef.current = politeRegion;
    assertiveRegionRef.current = assertiveRegion;

    return () => {
      // Don't remove regions on unmount - they might be used by other instances
      // They'll be cleaned up when the app unmounts
    };
  }, []);

  /**
   * Process the announcement queue
   */
  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) return;

    processingRef.current = true;
    const announcement = queueRef.current.shift();

    if (announcement) {
      const region =
        announcement.priority === "assertive"
          ? assertiveRegionRef.current
          : politeRegionRef.current;

      if (region) {
        // Clear first to ensure screen readers detect the change
        region.textContent = "";

        // Use RAF to ensure the clear is processed
        requestAnimationFrame(() => {
          region.textContent = announcement.message;

          // Clear after announcement is read (approximate time)
          setTimeout(() => {
            region.textContent = "";
            processingRef.current = false;
            processQueue(); // Process next in queue
          }, 1000);
        });
      } else {
        processingRef.current = false;
      }
    } else {
      processingRef.current = false;
    }
  }, []);

  /**
   * Announce a message to screen readers
   */
  const announce = useCallback(
    (message: string, priority: AnnouncementPriority = "polite") => {
      queueRef.current.push({
        message,
        priority,
        timestamp: Date.now(),
      });
      processQueue();
    },
    [processQueue],
  );

  /**
   * Announce a message immediately (skips queue)
   */
  const announceImmediate = useCallback(
    (message: string, priority: AnnouncementPriority = "assertive") => {
      const region =
        priority === "assertive"
          ? assertiveRegionRef.current
          : politeRegionRef.current;

      if (region) {
        region.textContent = "";
        requestAnimationFrame(() => {
          region.textContent = message;
        });
      }
    },
    [],
  );

  /**
   * Clear all pending announcements
   */
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    if (politeRegionRef.current) politeRegionRef.current.textContent = "";
    if (assertiveRegionRef.current) assertiveRegionRef.current.textContent = "";
  }, []);

  /**
   * Announce a polite message
   */
  const announcePolite = useCallback(
    (message: string) => announce(message, "polite"),
    [announce],
  );

  /**
   * Announce an assertive message
   */
  const announceAssertive = useCallback(
    (message: string) => announce(message, "assertive"),
    [announce],
  );

  return {
    announce,
    announceImmediate,
    announcePolite,
    announceAssertive,
    clearQueue,
  };
}

/**
 * Create a visually hidden live region
 */
function createLiveRegion(priority: AnnouncementPriority): HTMLDivElement {
  const region = document.createElement("div");
  region.id = `a11y-announcer-${priority}`;
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", priority);
  region.setAttribute("aria-atomic", "true");

  // Visually hidden styles
  Object.assign(region.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: "0",
  });

  return region;
}

/**
 * Pre-built announcement messages for common actions
 */
export const announcements = {
  // Navigation
  pageLoaded: (pageName: string) => `${pageName} page loaded`,
  navigationOpen: "Navigation menu opened",
  navigationClose: "Navigation menu closed",

  // Messages
  messageSent: "Message sent",
  messageReceived: (sender: string) => `New message from ${sender}`,
  messageDeleted: "Message deleted",
  messageEdited: "Message edited",

  // Channels
  channelJoined: (channelName: string) => `Joined ${channelName}`,
  channelLeft: (channelName: string) => `Left ${channelName}`,
  channelCreated: (channelName: string) => `Channel ${channelName} created`,

  // Users
  userJoined: (userName: string) => `${userName} joined`,
  userLeft: (userName: string) => `${userName} left`,
  userTyping: (userName: string) => `${userName} is typing`,

  // Status
  loading: "Loading",
  loaded: "Content loaded",
  error: (message: string) => `Error: ${message}`,
  success: (message: string) => message,

  // Forms
  formSubmitted: "Form submitted",
  formError: (fieldCount: number) =>
    `Form has ${fieldCount} error${fieldCount === 1 ? "" : "s"}`,
  fieldError: (fieldName: string, error: string) => `${fieldName}: ${error}`,

  // Dialogs
  dialogOpened: (title: string) => `${title} dialog opened`,
  dialogClosed: "Dialog closed",

  // Notifications
  notificationCount: (count: number) =>
    count === 0
      ? "No new notifications"
      : `${count} new notification${count === 1 ? "" : "s"}`,
} as const;

export default useAnnouncer;
