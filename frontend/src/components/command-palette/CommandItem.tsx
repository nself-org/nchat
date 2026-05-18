"use client";

/**
 * CommandItem
 *
 * Individual command item in the command list.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import { CommandIcon } from "./CommandIcon";
import { CommandShortcut } from "./CommandShortcut";
import type {
  Command,
  CommandMatch,
} from "@/lib/command-palette/command-types";
import { getHighlightedSegments } from "@/lib/command-palette/command-search";

// ============================================================================
// Types
// ============================================================================

export interface CommandItemProps {
  /** The command data */
  command: Command;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Click handler */
  onSelect?: (command: Command) => void;
  /** Matches for highlighting */
  matches?: CommandMatch[];
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the description */
  showDescription?: boolean;
}

// ============================================================================
// Highlighted Text Component
// ============================================================================

interface HighlightedTextProps {
  text: string;
  matches?: Array<{ start: number; end: number }>;
  className?: string;
}

function HighlightedText({ text, matches, className }: HighlightedTextProps) {
  if (!matches || matches.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const segments = getHighlightedSegments(text, matches);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark
            key={index}
            className="bg-primary/20 rounded-sm px-0.5 text-foreground"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </span>
  );
}

// ============================================================================
// Component
// ============================================================================

export function CommandItem({
  command,
  isSelected = false,
  onSelect,
  matches = [],
  className,
  showDescription = true,
}: CommandItemProps) {
  // Get matches for name field
  const nameMatches = matches.filter((m) => m.field === "name");

  return (
    <CommandPrimitive.Item
      value={command.id}
      onSelect={() => onSelect?.(command)}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2 text-sm outline-none",
        "aria-selected:text-accent-foreground aria-selected:bg-accent",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "hover:text-accent-foreground hover:bg-accent",
        isSelected && "text-accent-foreground bg-accent",
        command.status === "disabled" && "pointer-events-none opacity-50",
        className,
      )}
      data-selected={isSelected}
    >
      {/* Icon */}
      <CommandIcon
        icon={command.icon}
        size="md"
        className={cn(isSelected && "bg-accent-foreground/10")}
      />

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <HighlightedText
            text={command.name}
            matches={nameMatches}
            className="truncate font-medium"
          />

          {/* Recent badge */}
          {command.isRecent && (
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Recent
            </span>
          )}
        </div>

        {/* Description */}
        {showDescription && command.description && (
          <p className="truncate text-xs text-muted-foreground">
            {command.description}
          </p>
        )}
      </div>

      {/* Shortcut */}
      {command.shortcut && (
        <CommandShortcut keys={command.shortcut.keys} size="sm" />
      )}
    </CommandPrimitive.Item>
  );
}

export default CommandItem;
