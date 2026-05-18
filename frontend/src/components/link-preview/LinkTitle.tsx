"use client";

/**
 * LinkTitle - Displays title for link previews
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LinkTitleProps {
  /** Title text */
  title: string;
  /** Maximum lines to show */
  maxLines?: 1 | 2 | 3;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional class name */
  className?: string;
}

const sizeClasses = {
  sm: "text-sm font-medium",
  md: "text-base font-semibold",
  lg: "text-lg font-semibold",
};

const lineClampClasses = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
};

export function LinkTitle({
  title,
  maxLines = 2,
  size = "md",
  className,
}: LinkTitleProps) {
  return (
    <h3
      className={cn(
        "leading-tight text-foreground",
        sizeClasses[size],
        lineClampClasses[maxLines],
        className,
      )}
      title={title}
    >
      {title}
    </h3>
  );
}

export default LinkTitle;
