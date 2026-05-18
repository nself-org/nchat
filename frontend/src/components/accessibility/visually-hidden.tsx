"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Content to hide visually but keep accessible to screen readers */
  children: React.ReactNode;
  /** HTML element to render */
  as?: React.ElementType;
  /** Whether to show content when focused (for skip links) */
  showOnFocus?: boolean;
}

/**
 * Visually hidden component for screen reader only content
 * Uses CSS to hide content visually while keeping it accessible
 */
export function VisuallyHidden({
  children,
  as: Component = "span",
  showOnFocus = false,
  className,
  ...props
}: VisuallyHiddenProps) {
  const baseStyles = cn(
    // Standard visually hidden styles
    "absolute",
    "h-px w-px",
    "overflow-hidden",
    "whitespace-nowrap",
    "border-0",
    "p-0",
    "m-[-1px]",
    "[clip:rect(0,0,0,0)]",
    className,
  );

  const focusableStyles = cn(
    baseStyles,
    // Show on focus for skip links
    showOnFocus && [
      "focus:static",
      "focus:h-auto focus:w-auto",
      "focus:overflow-visible",
      "focus:whitespace-normal",
      "focus:m-0",
      "focus:[clip:auto]",
    ],
  );

  return (
    <Component
      className={showOnFocus ? focusableStyles : baseStyles}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Style object for inline use when component is not suitable
 */
export const visuallyHiddenStyles: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * CSS class string for use with className prop
 */
export const visuallyHiddenClassName = "sr-only";

/**
 * Hook for conditionally hiding content
 */
export function useVisuallyHidden(hidden: boolean = true) {
  return {
    style: hidden ? visuallyHiddenStyles : undefined,
    className: hidden ? visuallyHiddenClassName : undefined,
  };
}

/**
 * VisuallyHiddenInput for accessible form inputs
 * Useful for custom checkboxes, radios, file inputs
 */
export interface VisuallyHiddenInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label for the input (required for accessibility) */
  "aria-label"?: string;
  /** ID of the labelling element */
  "aria-labelledby"?: string;
}

export function VisuallyHiddenInput({
  className,
  ...props
}: VisuallyHiddenInputProps) {
  return (
    <input
      className={cn(
        "absolute",
        "h-px w-px",
        "overflow-hidden",
        "whitespace-nowrap",
        "border-0",
        "p-0",
        "m-[-1px]",
        "[clip:rect(0,0,0,0)]",
        // Keep focus styles for keyboard navigation
        "focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export default VisuallyHidden;
