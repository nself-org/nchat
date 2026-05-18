"use client";

/**
 * RTLWrapper Component
 *
 * Wraps content with RTL-specific styling and direction attributes.
 */

import * as React from "react";
import { type ReactNode, useMemo } from "react";

import { cn } from "@/lib/utils";
import { useLocaleStore, selectIsRTL } from "@/stores/locale-store";
import { getRTLCSSVariables } from "@/lib/i18n/rtl";

// ============================================================================
// RTLWrapper Component
// ============================================================================

interface RTLWrapperProps {
  children: ReactNode;
  /** Additional class name */
  className?: string;
  /** HTML element to render */
  as?: keyof React.JSX.IntrinsicElements;
  /** Force direction regardless of locale */
  forceDirection?: "ltr" | "rtl";
}

export function RTLWrapper({
  children,
  className,
  as = "div",
  forceDirection,
}: RTLWrapperProps) {
  const isRTL = useLocaleStore(selectIsRTL);
  const effectiveRTL = forceDirection ? forceDirection === "rtl" : isRTL;

  const cssVariables = useMemo(
    () => getRTLCSSVariables(effectiveRTL),
    [effectiveRTL],
  );

  const Component = as as React.ElementType;

  return (
    <Component
      dir={effectiveRTL ? "rtl" : "ltr"}
      className={cn(className)}
      style={cssVariables as React.CSSProperties}
    >
      {children}
    </Component>
  );
}

// ============================================================================
// DirectionalText Component
// ============================================================================

interface DirectionalTextProps {
  children: ReactNode;
  /** Text direction */
  direction?: "ltr" | "rtl" | "auto";
  /** Additional class name */
  className?: string;
  /** HTML element to render */
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Wraps text with explicit direction for bidirectional text handling
 */
export function DirectionalText({
  children,
  direction = "auto",
  className,
  as = "span",
}: DirectionalTextProps) {
  const Component = as as React.ElementType;

  return (
    <Component
      dir={direction}
      className={cn("unicode-bidi-isolate", className)}
    >
      {children}
    </Component>
  );
}

// ============================================================================
// FlipOnRTL Component
// ============================================================================

interface FlipOnRTLProps {
  children: ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * Flips content horizontally in RTL mode
 * Useful for directional icons like arrows
 */
export function FlipOnRTL({ children, className }: FlipOnRTLProps) {
  const isRTL = useLocaleStore(selectIsRTL);

  return (
    <span
      className={cn(className)}
      style={{
        display: "inline-block",
        transform: isRTL ? "scaleX(-1)" : "none",
      }}
    >
      {children}
    </span>
  );
}

// ============================================================================
// RTLConditional Component
// ============================================================================

interface RTLConditionalProps {
  /** Content to show in LTR mode */
  ltr: ReactNode;
  /** Content to show in RTL mode */
  rtl: ReactNode;
}

/**
 * Renders different content based on text direction
 */
export function RTLConditional({ ltr, rtl }: RTLConditionalProps) {
  const isRTL = useLocaleStore(selectIsRTL);
  return <>{isRTL ? rtl : ltr}</>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to get RTL-aware values
 */
export function useRTLValue<T>(ltrValue: T, rtlValue: T): T {
  const isRTL = useLocaleStore(selectIsRTL);
  return isRTL ? rtlValue : ltrValue;
}

/**
 * Hook to get RTL-aware class names
 */
export function useRTLClass(ltrClass: string, rtlClass: string): string {
  const isRTL = useLocaleStore(selectIsRTL);
  return isRTL ? rtlClass : ltrClass;
}

/**
 * Hook to get RTL-aware styles
 */
export function useRTLStyles(
  ltrStyles: React.CSSProperties,
  rtlStyles: React.CSSProperties,
): React.CSSProperties {
  const isRTL = useLocaleStore(selectIsRTL);
  return isRTL ? rtlStyles : ltrStyles;
}

export default RTLWrapper;
