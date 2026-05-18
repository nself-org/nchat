"use client";

import * as React from "react";
import {
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
} from "react";
import {
  useA11yStore,
  applyA11ySettings,
  type A11ySettings,
} from "@/lib/accessibility";
import { useReducedMotion } from "@/lib/accessibility/use-reduced-motion";
import { AnnouncerProvider } from "./live-region";
import { SkipLinks, type SkipLink } from "./skip-links";

interface A11yProviderContextValue {
  /** Current accessibility settings */
  settings: A11ySettings;
  /** Whether accessibility features are initialized */
  initialized: boolean;
  /** System prefers reduced motion */
  systemReducedMotion: boolean;
  /** Announce a message to screen readers */
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const A11yProviderContext = createContext<A11yProviderContextValue | null>(
  null,
);

export interface A11yProviderProps {
  children: React.ReactNode;
  /** Custom skip links to use */
  skipLinks?: SkipLink[];
  /** Whether to show skip links */
  showSkipLinks?: boolean;
  /** Whether to auto-apply settings to document */
  autoApplySettings?: boolean;
}

/**
 * Accessibility provider component
 * Wraps the application to enable accessibility features
 */
export function A11yProvider({
  children,
  skipLinks,
  showSkipLinks = true,
  autoApplySettings = true,
}: A11yProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const systemReducedMotion = useReducedMotion();

  // Get settings from store
  const settings = useA11yStore((state) => ({
    reduceMotion: state.reduceMotion,
    highContrast: state.highContrast,
    contrastMode: state.contrastMode,
    fontSize: state.fontSize,
    screenReaderMode: state.screenReaderMode,
    alwaysShowFocus: state.alwaysShowFocus,
    reduceTransparency: state.reduceTransparency,
    dyslexiaFont: state.dyslexiaFont,
    largerTargets: state.largerTargets,
    showKeyboardHints: state.showKeyboardHints,
    preferCaptions: state.preferCaptions,
    announceMessages: state.announceMessages,
  }));

  // Apply settings to document on change
  useEffect(() => {
    if (autoApplySettings && typeof window !== "undefined") {
      applyA11ySettings(settings);
      setInitialized(true);
    }
  }, [settings, autoApplySettings]);

  // Set up keyboard detection for focus-visible
  useEffect(() => {
    if (typeof window === "undefined") return;

    let hadKeyboardEvent = false;
    let isHandlingKeyboardThrottle = false;

    const onPointerDown = () => {
      hadKeyboardEvent = false;
      document.documentElement.classList.remove("keyboard-user");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Escape") {
        hadKeyboardEvent = true;
        if (!isHandlingKeyboardThrottle) {
          isHandlingKeyboardThrottle = true;
          document.documentElement.classList.add("keyboard-user");
          setTimeout(() => {
            isHandlingKeyboardThrottle = false;
          }, 100);
        }
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Placeholder announce function - will be replaced by AnnouncerProvider
  const announce = useCallback(
    (message: string, priority?: "polite" | "assertive") => {
      // This will be handled by AnnouncerProvider
    },
    [],
  );

  const contextValue: A11yProviderContextValue = {
    settings,
    initialized,
    systemReducedMotion,
    announce,
  };

  return (
    <A11yProviderContext.Provider value={contextValue}>
      <AnnouncerProvider>
        {showSkipLinks && <SkipLinks links={skipLinks} />}
        {children}
      </AnnouncerProvider>
    </A11yProviderContext.Provider>
  );
}

/**
 * Hook to access accessibility context
 */
export function useA11y() {
  const context = useContext(A11yProviderContext);
  if (!context) {
    throw new Error("useA11y must be used within an A11yProvider");
  }
  return context;
}

/**
 * Hook to check if specific accessibility features are enabled
 */
export function useA11yFeature(feature: keyof A11ySettings): boolean {
  const { settings } = useA11y();
  return Boolean(settings[feature]);
}

/**
 * Higher-order component to inject accessibility props
 */
export function withA11y<P extends object>(
  Component: React.ComponentType<P & { a11y: A11yProviderContextValue }>,
) {
  return function WithA11yComponent(props: P) {
    const a11y = useA11y();
    return <Component {...props} a11y={a11y} />;
  };
}

export default A11yProvider;
