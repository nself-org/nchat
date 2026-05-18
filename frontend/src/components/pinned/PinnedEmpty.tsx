"use client";

import * as React from "react";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PinnedEmptyProps {
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Additional className */
  className?: string;
}

/**
 * Empty state for when there are no pinned messages.
 */
export function PinnedEmpty({
  title = "No pinned messages",
  description = "Pin important messages to keep them easily accessible. Pinned messages are visible to everyone in this channel.",
  className,
}: PinnedEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        <Pin className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-medium">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
