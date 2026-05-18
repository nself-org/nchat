"use client";

/**
 * RemovePreviewButton - Button to remove a link preview
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface RemovePreviewButtonProps {
  /** Click handler */
  onClick: () => void;
  /** Button label */
  label?: string;
  /** Size variant */
  size?: "sm" | "md";
  /** Additional class name */
  className?: string;
}

export function RemovePreviewButton({
  onClick,
  label = "Remove preview",
  size = "sm",
  className,
}: RemovePreviewButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  const sizeClasses = size === "sm" ? "w-6 h-6" : "w-8 h-8";

  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex items-center justify-center rounded-full",
        "bg-background/80 border shadow-sm backdrop-blur-sm",
        "hover:border-destructive hover:bg-destructive hover:text-destructive-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "transition-colors duration-150",
        sizeClasses,
        className,
      )}
      aria-label={label}
      title={label}
    >
      <svg
        className={iconSize}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}

export default RemovePreviewButton;
