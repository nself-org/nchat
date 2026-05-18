"use client";

/**
 * CreateCommand
 *
 * Specialized command item for creating new items.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Plus, Hash, MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandShortcut } from "./CommandShortcut";
import type { CreateCommandData } from "@/lib/command-palette/command-types";

// ============================================================================
// Types
// ============================================================================

export interface CreateCommandProps {
  /** Create command data */
  command: CreateCommandData;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Click handler */
  onSelect?: (command: CreateCommandData) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Create Type Configuration
// ============================================================================

const createTypeConfig: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  channel: {
    icon: Hash,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  dm: {
    icon: MessageSquare,
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  group: {
    icon: Users,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
};

// ============================================================================
// Component
// ============================================================================

export function CreateCommand({
  command,
  isSelected = false,
  onSelect,
  className,
}: CreateCommandProps) {
  const config = createTypeConfig[command.createType] || {
    icon: Plus,
    color: "bg-muted text-muted-foreground",
  };
  const TypeIcon = config.icon;

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
        className,
      )}
      data-selected={isSelected}
    >
      {/* Create icon with type indicator */}
      <div className="relative">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md",
            config.color.split(" ")[0],
          )}
        >
          <TypeIcon
            className={cn(
              "h-4 w-4",
              config.color.split(" ").slice(1).join(" "),
            )}
          />
        </div>

        {/* Plus badge */}
        <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary">
          <Plus className="text-primary-foreground h-2.5 w-2.5" />
        </div>
      </div>

      {/* Create info */}
      <div className="flex-1 overflow-hidden">
        <span className="truncate font-medium">{command.name}</span>
        {command.description && (
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

export default CreateCommand;
