/* eslint-disable react-hooks/rules-of-hooks */

"use client";

import * as React from "react";
import { forwardRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "./visually-hidden";

export interface AccessibleIconProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The icon element to render */
  icon: React.ReactNode;
  /** Accessible label for the icon (required) */
  label: string;
  /** Show tooltip on hover/focus */
  showTooltip?: boolean;
  /** Tooltip position */
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  /** Whether this is decorative only (no button behavior) */
  decorative?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Visual variant */
  variant?: "default" | "ghost" | "outline";
}

/**
 * Accessible icon button with proper ARIA labels and optional tooltip
 */
export const AccessibleIcon = forwardRef<
  HTMLButtonElement,
  AccessibleIconProps
>(function AccessibleIcon(
  {
    icon,
    label,
    showTooltip = true,
    tooltipPosition = "top",
    decorative = false,
    size = "md",
    variant = "ghost",
    className,
    disabled,
    ...props
  },
  ref,
) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const showTooltipHandler = useCallback(() => {
    if (showTooltip && !disabled) {
      setIsTooltipVisible(true);
    }
  }, [showTooltip, disabled]);

  const hideTooltipHandler = useCallback(() => {
    setIsTooltipVisible(false);
  }, []);

  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
  };

  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    outline:
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  };

  const tooltipPositionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  // If decorative, render as a span
  if (decorative) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center",
          sizeClasses[size],
          className,
        )}
        aria-hidden="true"
        role="presentation"
      >
        {icon}
      </span>
    );
  }

  const tooltipId = `tooltip-${React.useId()}`;

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "relative inline-flex items-center justify-center rounded-md",
        "transition-colors focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      aria-label={label}
      aria-describedby={showTooltip ? tooltipId : undefined}
      disabled={disabled}
      onMouseEnter={showTooltipHandler}
      onMouseLeave={hideTooltipHandler}
      onFocus={showTooltipHandler}
      onBlur={hideTooltipHandler}
      {...props}
    >
      {/* Icon - hidden from screen readers since button has label */}
      <span aria-hidden="true">{icon}</span>

      {/* Screen reader label */}
      <VisuallyHidden>{label}</VisuallyHidden>

      {/* Tooltip for mouse users */}
      {showTooltip && (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            "absolute z-50 whitespace-nowrap rounded-md bg-popover px-2 py-1",
            "text-xs text-popover-foreground shadow-md",
            "pointer-events-none transition-opacity duration-200",
            tooltipPositionClasses[tooltipPosition],
            isTooltipVisible ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={!isTooltipVisible}
        >
          {label}
          {/* Tooltip arrow */}
          <span
            className={cn(
              "absolute h-2 w-2 rotate-45 bg-popover",
              tooltipPosition === "top" &&
                "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
              tooltipPosition === "bottom" &&
                "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
              tooltipPosition === "left" &&
                "right-0 top-1/2 -translate-y-1/2 translate-x-1/2",
              tooltipPosition === "right" &&
                "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
            )}
          />
        </span>
      )}
    </button>
  );
});

/**
 * Icon wrapper that marks icons as decorative
 * Use when the icon is accompanied by text
 */
export interface DecorativeIconProps {
  icon: React.ReactNode;
  className?: string;
}

export function DecorativeIcon({ icon, className }: DecorativeIconProps) {
  return (
    <span aria-hidden="true" role="presentation" className={className}>
      {icon}
    </span>
  );
}

/**
 * Icon with visible label
 * For buttons where the label should be shown
 */
export interface IconWithLabelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  iconPosition?: "left" | "right";
  size?: "sm" | "md" | "lg";
  variant?: "default" | "ghost" | "outline";
}

export const IconWithLabel = forwardRef<HTMLButtonElement, IconWithLabelProps>(
  function IconWithLabel(
    {
      icon,
      label,
      iconPosition = "left",
      size = "md",
      variant = "default",
      className,
      ...props
    },
    ref,
  ) {
    const sizeClasses = {
      sm: "h-8 px-3 text-sm gap-1.5",
      md: "h-10 px-4 text-base gap-2",
      lg: "h-12 px-5 text-lg gap-2.5",
    };

    const variantClasses = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      outline:
        "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center justify-center rounded-md",
          "transition-colors focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {iconPosition === "left" && <DecorativeIcon icon={icon} />}
        <span>{label}</span>
        {iconPosition === "right" && <DecorativeIcon icon={icon} />}
      </button>
    );
  },
);

export default AccessibleIcon;
