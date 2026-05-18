"use client";

/**
 * LinkDescription - Displays description for link previews
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LinkDescriptionProps {
  /** Description text */
  description: string;
  /** Maximum lines to show */
  maxLines?: 1 | 2 | 3 | 4;
  /** Size variant */
  size?: "sm" | "md";
  /** Additional class name */
  className?: string;
}

const sizeClasses = {
  sm: "text-xs",
  md: "text-sm",
};

const lineClampClasses = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
};

export function LinkDescription({
  description,
  maxLines = 2,
  size = "sm",
  className,
}: LinkDescriptionProps) {
  return (
    <p
      className={cn(
        "leading-relaxed text-muted-foreground",
        sizeClasses[size],
        lineClampClasses[maxLines],
        className,
      )}
      title={description}
    >
      {description}
    </p>
  );
}

export default LinkDescription;
