"use client";

/**
 * ActionCommand
 *
 * Specialized command item for actions.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Play, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandIcon } from "./CommandIcon";
import { CommandShortcut } from "./CommandShortcut";
import type { ActionCommandData } from "@/lib/command-palette/command-types";

// ============================================================================
// Types
// ============================================================================

export interface ActionCommandProps {
  /** Action command data */
  command: ActionCommandData;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Click handler */
  onSelect?: (command: ActionCommandData) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ActionCommand({
  command,
  isSelected = false,
  onSelect,
  className,
}: ActionCommandProps) {
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
        command.isDestructive && "text-destructive hover:text-destructive",
        className,
      )}
      data-selected={isSelected}
    >
      {/* Action icon */}
      <CommandIcon
        icon={command.icon}
        size="md"
        className={cn(command.isDestructive && "bg-destructive/10")}
        color={command.isDestructive ? "hsl(var(--destructive))" : undefined}
      />

      {/* Action info */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{command.name}</span>

          {/* Destructive warning */}
          {command.isDestructive && (
            <AlertTriangle className="h-3 w-3 text-destructive" />
          )}

          {/* Confirmation required badge */}
          {command.requiresConfirmation && !command.isDestructive && (
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              Confirm
            </span>
          )}
        </div>

        {/* Description */}
        {command.description && (
          <p
            className={cn(
              "truncate text-xs",
              command.isDestructive
                ? "text-destructive/70"
                : "text-muted-foreground",
            )}
          >
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

export default ActionCommand;
