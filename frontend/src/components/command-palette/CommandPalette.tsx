"use client";

/**
 * CommandPalette
 *
 * Main command palette component that integrates with cmdk.
 * Provides a Slack/VS Code-like command palette experience.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useUIStore } from "@/stores/ui-store";
import { useHotkey } from "@/hooks/use-hotkey";

import { CommandInput } from "./CommandInput";
import { CommandList } from "./CommandList";
import { CommandEmpty } from "./CommandEmpty";
import { CommandLoading } from "./CommandLoading";
import { RecentCommands } from "./RecentCommands";
import { CommandGroup, CommandSeparator } from "./CommandGroup";

import type {
  Command,
  CommandExecutionContext,
} from "@/lib/command-palette/command-types";

import {
  getCommandRegistry,
  searchCommands,
  getCommandExecutor,
} from "@/lib/command-palette";

// ============================================================================
// Types
// ============================================================================

export interface CommandPaletteProps {
  /** Additional CSS classes */
  className?: string;
  /** Custom context data for command execution */
  contextData?: Record<string, unknown>;
  /** Callback when palette opens */
  onOpen?: () => void;
  /** Callback when palette closes */
  onClose?: () => void;
  /** Callback when command is executed */
  onCommandExecute?: (command: Command) => void;
}

// ============================================================================
// Footer Component
// ============================================================================

function CommandPaletteFooter() {
  return (
    <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
            {"\u2191"}
          </kbd>
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
            {"\u2193"}
          </kbd>
          <span>navigate</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
            {"\u21B5"}
          </kbd>
          <span>select</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
            esc
          </kbd>
          <span>close</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1">
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
            #
          </kbd>
          <span>channels</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
            @
          </kbd>
          <span>users</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
            &gt;
          </kbd>
          <span>actions</span>
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function CommandPalette({
  className,
  contextData,
  onOpen,
  onClose,
  onCommandExecute,
}: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Store state
  const {
    isOpen,
    query,
    mode,
    selectedIndex,
    filteredCommands,
    recentCommands,
    isLoading,
    showRecent,
    open,
    close,
    setQuery,
    setMode,
    selectNext,
    selectPrevious,
    executeSelected,
    clearHistory,
  } = useCommandPaletteStore();

  // UI store for closing other overlays
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  // Sync UI store with command palette store
  React.useEffect(() => {
    setCommandPaletteOpen(isOpen);
  }, [isOpen, setCommandPaletteOpen]);

  // Create execution context
  const createExecutionContext =
    React.useCallback((): CommandExecutionContext => {
      return {
        closeCommandPalette: close,
        navigate: (path: string) => router.push(path),
        data: contextData,
      };
    }, [close, router, contextData]);

  // Handle command selection
  const handleSelect = React.useCallback(
    (command: Command) => {
      const context = createExecutionContext();
      const executor = getCommandExecutor({
        navigate: context.navigate,
        closeCommandPalette: context.closeCommandPalette,
      });

      executor.execute(command, context).then((result) => {
        if (result.success) {
          onCommandExecute?.(command);
        }
      });
    },
    [createExecutionContext, onCommandExecute],
  );

  // Handle keyboard navigation within the dialog
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          selectPrevious();
          break;
        case "Enter":
          e.preventDefault();
          executeSelected(createExecutionContext());
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
        case "Tab":
          // Tab can be used for autocomplete in the future
          e.preventDefault();
          break;
      }
    },
    [
      selectNext,
      selectPrevious,
      executeSelected,
      createExecutionContext,
      close,
    ],
  );

  // Register global keyboard shortcut
  useHotkey(
    "mod+k",
    () => {
      if (isOpen) {
        close();
      } else {
        open();
        onOpen?.();
      }
    },
    {
      preventDefault: true,
      enableOnInputs: false,
    },
  );

  // Also register mod+p as alternative
  useHotkey(
    "mod+p",
    () => {
      if (isOpen) {
        close();
      } else {
        open();
        onOpen?.();
      }
    },
    {
      preventDefault: true,
      enableOnInputs: false,
    },
  );

  // Focus input when opening
  React.useEffect(() => {
    if (isOpen) {
      // Small delay to ensure dialog is mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle close callback
  React.useEffect(() => {
    if (!isOpen) {
      onClose?.();
    }
  }, [isOpen, onClose]);

  // Clear mode handler
  const handleClearMode = React.useCallback(() => {
    setMode("all");
    setQuery("");
  }, [setMode, setQuery]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Command Palette Dialog */}
      <div
        className={cn(
          "fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
          className,
        )}
      >
        <CommandPrimitive
          className={cn(
            "overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg",
            "ring-1 ring-border",
          )}
          onKeyDown={handleKeyDown}
          shouldFilter={false}
        >
          {/* Search Input */}
          <CommandInput
            value={query}
            onChange={setQuery}
            mode={mode}
            onClearMode={handleClearMode}
            inputRef={inputRef}
          />

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <CommandLoading showSkeletons />
            ) : filteredCommands.length === 0 ? (
              <CommandEmpty query={query} />
            ) : (
              <>
                {/* Show recent commands when no query */}
                {showRecent && recentCommands.length > 0 && (
                  <>
                    <RecentCommands
                      commands={recentCommands}
                      onSelect={handleSelect}
                      onClearHistory={clearHistory}
                      selectedIndex={selectedIndex}
                    />
                    {filteredCommands.length > recentCommands.length && (
                      <CommandSeparator className="my-1" />
                    )}
                  </>
                )}

                {/* Command List */}
                <CommandList
                  commands={
                    showRecent
                      ? filteredCommands.filter((c) => !c.isRecent)
                      : filteredCommands
                  }
                  selectedIndex={
                    showRecent
                      ? selectedIndex - recentCommands.length
                      : selectedIndex
                  }
                  onSelect={handleSelect}
                  query={query}
                  groupByCategory={!query}
                />
              </>
            )}
          </div>

          {/* Footer */}
          <CommandPaletteFooter />
        </CommandPrimitive>
      </div>
    </>
  );
}

export default CommandPalette;
