"use client";

import * as React from "react";
import {
  useEffect,
  useState,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import { VisuallyHidden } from "./visually-hidden";

export type LiveRegionPoliteness = "polite" | "assertive" | "off";

export interface LiveRegionProps {
  /** Message to announce */
  message?: string;
  /** Politeness level for announcements */
  politeness?: LiveRegionPoliteness;
  /** Whether the region is atomic (announce whole region on changes) */
  atomic?: boolean;
  /** Relevant changes to announce */
  relevant?: "additions" | "removals" | "text" | "all" | "additions text";
  /** Clear message after announcing */
  clearOnAnnounce?: boolean;
  /** Delay before announcing (ms) */
  delay?: number;
  /** Additional ARIA role */
  role?: "status" | "alert" | "log" | "timer";
  /** Children to render (optional, for custom content) */
  children?: React.ReactNode;
  /** CSS class name */
  className?: string;
}

/**
 * ARIA live region for announcing dynamic content to screen readers
 */
export function LiveRegion({
  message,
  politeness = "polite",
  atomic = true,
  relevant = "additions text",
  clearOnAnnounce = false,
  delay = 100,
  role,
  children,
  className,
}: LiveRegionProps) {
  const [announcement, setAnnouncement] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (message) {
      // Clear any pending announcement
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Delay announcement slightly to ensure screen reader picks it up
      timeoutRef.current = setTimeout(() => {
        setAnnouncement(message);

        if (clearOnAnnounce) {
          // Clear after screen reader has had time to announce
          setTimeout(() => setAnnouncement(""), 1000);
        }
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearOnAnnounce, delay]);

  return (
    <VisuallyHidden
      as="div"
      role={role}
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={className}
    >
      {children || announcement}
    </VisuallyHidden>
  );
}

/**
 * Context for global announcements
 */
interface AnnouncerContextValue {
  announce: (message: string, politeness?: LiveRegionPoliteness) => void;
  clear: () => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

export interface AnnouncerProviderProps {
  children: React.ReactNode;
}

/**
 * Provider for global screen reader announcements
 */
export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
  const [politeMessage, setPoliteMessage] = useState<string>("");
  const [assertiveMessage, setAssertiveMessage] = useState<string>("");

  const announce = useCallback(
    (message: string, politeness: LiveRegionPoliteness = "polite") => {
      if (politeness === "assertive") {
        setAssertiveMessage("");
        // Force re-render to ensure announcement
        requestAnimationFrame(() => setAssertiveMessage(message));
      } else {
        setPoliteMessage("");
        requestAnimationFrame(() => setPoliteMessage(message));
      }
    },
    [],
  );

  const clear = useCallback(() => {
    setPoliteMessage("");
    setAssertiveMessage("");
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce, clear }}>
      {children}
      <LiveRegion message={politeMessage} politeness="polite" clearOnAnnounce />
      <LiveRegion
        message={assertiveMessage}
        politeness="assertive"
        clearOnAnnounce
      />
    </AnnouncerContext.Provider>
  );
}

/**
 * Hook to access the announcer
 */
export function useAnnouncer() {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error("useAnnouncer must be used within an AnnouncerProvider");
  }
  return context;
}

/**
 * Alert component for important announcements
 * Uses role="alert" for immediate attention
 */
export interface AlertProps {
  children: React.ReactNode;
  className?: string;
}

export function Alert({ children, className }: AlertProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * Status component for polite updates
 */
export interface StatusProps {
  children: React.ReactNode;
  className?: string;
}

export function Status({ children, className }: StatusProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * Log component for sequential updates (chat, activity feeds)
 */
export interface LogProps {
  children: React.ReactNode;
  className?: string;
}

export function Log({ children, className }: LogProps) {
  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className={className}
    >
      {children}
    </div>
  );
}

export default LiveRegion;
