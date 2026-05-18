"use client";

/**
 * CommandEmpty
 *
 * Empty state component shown when no commands match the search query.
 */

import * as React from "react";
import { Search, Frown } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface CommandEmptyProps {
  /** The search query that returned no results */
  query?: string;
  /** Custom message to display */
  message?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show suggestions */
  showSuggestions?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function CommandEmpty({
  query,
  message,
  className,
  showSuggestions = true,
}: CommandEmptyProps) {
  const displayMessage =
    message ||
    (query ? `No results found for "${query}"` : "No commands available");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {query ? (
          <Frown className="h-6 w-6 text-muted-foreground" />
        ) : (
          <Search className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      <p className="mb-2 text-sm font-medium text-foreground">
        {displayMessage}
      </p>

      {showSuggestions && query && (
        <div className="text-xs text-muted-foreground">
          <p className="mb-2">Try:</p>
          <ul className="space-y-1">
            <li>Using fewer or different keywords</li>
            <li>Checking for typos</li>
            <li>
              Using prefixes:{" "}
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                #
              </kbd>{" "}
              for channels,{" "}
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                @
              </kbd>{" "}
              for users
            </li>
          </ul>
        </div>
      )}

      {!query && (
        <p className="text-xs text-muted-foreground">
          Start typing to search commands
        </p>
      )}
    </div>
  );
}

export default CommandEmpty;
