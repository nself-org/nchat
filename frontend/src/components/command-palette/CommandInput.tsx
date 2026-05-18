"use client";

/**
 * CommandInput
 *
 * Search input for the command palette with mode indicators.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search, X, Hash, AtSign, Command, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommandCategory } from "@/lib/command-palette/command-types";
import { getSearchPlaceholder } from "@/lib/command-palette/command-search";

// ============================================================================
// Types
// ============================================================================

export interface CommandInputProps {
  /** Current search value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Current mode/filter */
  mode?: "all" | "channels" | "dms" | "users" | "search" | "actions";
  /** Handler to clear mode */
  onClearMode?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Ref to the input element */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

// ============================================================================
// Mode Badge Component
// ============================================================================

interface ModeBadgeProps {
  mode: "channels" | "dms" | "users" | "search" | "actions";
  onClear: () => void;
}

function ModeBadge({ mode, onClear }: ModeBadgeProps) {
  const config = {
    channels: {
      icon: Hash,
      label: "Channels",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    dms: {
      icon: AtSign,
      label: "Messages",
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
    users: {
      icon: AtSign,
      label: "Users",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
    search: {
      icon: Search,
      label: "Search",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    actions: {
      icon: Command,
      label: "Actions",
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
  };

  const { icon: Icon, label, color } = config[mode];

  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        color,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        className="ml-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
      >
        <X className="h-3 w-3" />
        <span className="sr-only">Clear filter</span>
      </button>
    </span>
  );
}

// ============================================================================
// Component
// ============================================================================

export function CommandInput({
  value,
  onChange,
  mode = "all",
  onClearMode,
  placeholder,
  autoFocus = true,
  className,
  inputRef,
}: CommandInputProps) {
  // Map component modes to CommandCategory (actions -> action, etc.)
  const modeToCategory = (m: typeof mode): CommandCategory | "all" => {
    if (m === "all") return "all";
    if (m === "actions") return "action";
    if (m === "channels") return "channel";
    if (m === "dms") return "dm";
    if (m === "users") return "user";
    return m as CommandCategory;
  };
  const displayPlaceholder =
    placeholder || getSearchPlaceholder(modeToCategory(mode));

  return (
    <div className={cn("flex items-center gap-2 border-b px-3", className)}>
      {/* Search icon */}
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />

      {/* Mode badge */}
      {mode !== "all" && onClearMode && (
        <>
          <ModeBadge mode={mode} onClear={onClearMode} />
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </>
      )}

      {/* Input - autoFocus is intentional for command palette UX */}
      <CommandPrimitive.Input
        ref={inputRef}
        value={value}
        onValueChange={onChange}
        placeholder={displayPlaceholder}
        autoFocus={autoFocus} // eslint-disable-line jsx-a11y/no-autofocus
        className={cn(
          "flex h-11 w-full bg-transparent py-3 text-sm outline-none",
          "placeholder:text-muted-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </button>
      )}
    </div>
  );
}

export default CommandInput;
