"use client";

/**
 * CommandGroup
 *
 * Groups related commands together with a heading.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Command,
  CommandGroup as CommandGroupType,
} from "@/lib/command-palette/command-types";

// ============================================================================
// Types
// ============================================================================

export interface CommandGroupProps {
  /** Group heading */
  heading: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Child content */
  children: React.ReactNode;
  /** Whether the group is collapsible */
  collapsible?: boolean;
  /** Whether the group is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Additional heading CSS classes */
  headingClassName?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CommandGroup({
  heading,
  icon: Icon,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className,
  headingClassName,
}: CommandGroupProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const toggleCollapse = React.useCallback(() => {
    if (collapsible) {
      setIsCollapsed((prev) => !prev);
    }
  }, [collapsible]);

  const ChevronIcon = isCollapsed ? ChevronRight : ChevronDown;

  return (
    <CommandPrimitive.Group
      className={cn("overflow-hidden py-1", className)}
      heading={
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground",
            collapsible && "cursor-pointer hover:text-foreground",
            headingClassName,
          )}
          onClick={toggleCollapse}
          role={collapsible ? "button" : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={
            collapsible
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse();
                  }
                }
              : undefined
          }
        >
          {collapsible && <ChevronIcon className="h-3 w-3" />}
          {Icon && <Icon className="h-3.5 w-3.5" />}
          <span>{heading}</span>
        </div>
      }
    >
      {!isCollapsed && children}
    </CommandPrimitive.Group>
  );
}

// ============================================================================
// Separator Component
// ============================================================================

export function CommandSeparator({ className }: { className?: string }) {
  return (
    <CommandPrimitive.Separator
      className={cn("-mx-1 h-px bg-border", className)}
    />
  );
}

export default CommandGroup;
