"use client";

/**
 * SettingsCommand
 *
 * Specialized command item for settings pages.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import {
  Settings,
  ChevronRight,
  User,
  Bell,
  Palette,
  Lock,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SettingsCommandData } from "@/lib/command-palette/command-types";
import { CommandShortcut } from "./CommandShortcut";

// ============================================================================
// Types
// ============================================================================

export interface SettingsCommandProps {
  /** Settings command data */
  command: SettingsCommandData;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Click handler */
  onSelect?: (command: SettingsCommandData) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Settings Section Icons
// ============================================================================

const sectionIcons: Record<string, React.ElementType> = {
  profile: User,
  notifications: Bell,
  appearance: Palette,
  privacy: Lock,
  language: Globe,
  general: Settings,
};

// ============================================================================
// Component
// ============================================================================

export function SettingsCommand({
  command,
  isSelected = false,
  onSelect,
  className,
}: SettingsCommandProps) {
  const section = command.settingsSection || "general";
  const Icon = sectionIcons[section] || Settings;

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
      {/* Settings icon */}
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Settings info */}
      <div className="flex-1 overflow-hidden">
        <span className="truncate font-medium">{command.name}</span>
        {command.description && (
          <p className="truncate text-xs text-muted-foreground">
            {command.description}
          </p>
        )}
      </div>

      {/* Shortcut or chevron */}
      {command.shortcut ? (
        <CommandShortcut keys={command.shortcut.keys} size="sm" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </CommandPrimitive.Item>
  );
}

export default SettingsCommand;
