"use client";

/**
 * SlashCommandMenu Component
 *
 * Command palette that appears when the user types "/" in the message input.
 * Provides filtering, keyboard navigation, and command selection.
 *
 * @example
 * ```tsx
 * <SlashCommandMenu
 *   isOpen={showMenu}
 *   filter={filter}
 *   onSelect={handleSelectCommand}
 *   onClose={handleCloseMenu}
 *   position={{ top: 100, left: 50 }}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { CommandItem, CommandCategoryHeader } from "./command-item";
import { useCommands } from "@/lib/commands";
import type { SlashCommand, CommandCategory } from "@/lib/commands";
import { COMMAND_CATEGORIES } from "@/lib/commands";

// ============================================================================
// Types
// ============================================================================

export interface SlashCommandMenuProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Initial filter value */
  initialFilter?: string;
  /** Callback when a command is selected */
  onSelect: (command: SlashCommand) => void;
  /** Callback when menu is closed */
  onClose: () => void;
  /** Position of the menu (relative to viewport or container) */
  position?: { top: number; left: number } | null;
  /** Anchor element for positioning */
  anchorRef?: React.RefObject<HTMLElement>;
  /** Whether to show the search input */
  showSearch?: boolean;
  /** Maximum height of the menu */
  maxHeight?: number;
  /** Additional class names */
  className?: string;
  /** Current user context for filtering */
  context?: {
    channelId?: string;
    userRole?: "owner" | "admin" | "moderator" | "member" | "guest";
    enabledFeatures?: string[];
  };
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({ query }: { query: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <svg
          className="h-6 w-6 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <p className="text-sm font-medium">No commands found</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {query ? `No commands match "${query}"` : "No commands available"}
      </p>
    </div>
  );
}

// ============================================================================
// Footer Component
// ============================================================================

function MenuFooter() {
  return (
    <div className="bg-muted/30 flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
            <span className="text-[10px]">^</span>
          </kbd>
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
            <span className="text-[10px]">v</span>
          </kbd>
          <span>to navigate</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
            Enter
          </kbd>
          <span>to select</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Esc</kbd>
          <span>to close</span>
        </span>
      </div>
      <a
        href="/help/commands"
        className="transition-colors hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        View all commands
      </a>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SlashCommandMenu({
  isOpen,
  initialFilter = "",
  onSelect,
  onClose,
  position,
  // anchorRef reserved for future use with floating positioning
  showSearch = true,
  maxHeight = 400,
  className,
  context,
}: SlashCommandMenuProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [filter, setFilter] = React.useState(initialFilter);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Get commands from hook
  const {
    filteredCommands,
    favoriteCommands,
    recentCommands,
    toggleFavorite,
    isFavorite,
  } = useCommands({
    channelId: context?.channelId,
    userRole: context?.userRole,
    enabledFeatures: context?.enabledFeatures,
  });

  // Filter commands based on search
  const displayedCommands = React.useMemo(() => {
    if (!filter) return filteredCommands;

    const normalizedFilter = filter.toLowerCase();
    return filteredCommands.filter((cmd) => {
      return (
        cmd.name.includes(normalizedFilter) ||
        cmd.description.toLowerCase().includes(normalizedFilter) ||
        cmd.aliases?.some((alias) => alias.includes(normalizedFilter))
      );
    });
  }, [filteredCommands, filter]);

  // Build categorized list for rendering
  const categorizedCommands = React.useMemo(() => {
    if (!filter) {
      // Show favorites and recent first when not filtering
      const sections: Array<{ title: string; commands: SlashCommand[] }> = [];

      // Favorites section
      const favs = displayedCommands.filter((cmd) =>
        favoriteCommands.includes(cmd.name),
      );
      if (favs.length > 0) {
        sections.push({ title: "Favorites", commands: favs });
      }

      // Recent section
      const recent = displayedCommands.filter(
        (cmd) =>
          recentCommands.includes(cmd.name) &&
          !favoriteCommands.includes(cmd.name),
      );
      if (recent.length > 0) {
        sections.push({ title: "Recent", commands: recent.slice(0, 5) });
      }

      // Group remaining by category
      const remainingCommands = displayedCommands.filter(
        (cmd) =>
          !favoriteCommands.includes(cmd.name) &&
          !recentCommands.includes(cmd.name),
      );

      const byCategory = new Map<CommandCategory, SlashCommand[]>();
      for (const cmd of remainingCommands) {
        const category = cmd.category;
        if (!byCategory.has(category)) {
          byCategory.set(category, []);
        }
        byCategory.get(category)!.push(cmd);
      }

      // Add category sections in order
      const categoryOrder: CommandCategory[] = [
        "navigation",
        "channel",
        "status",
        "media",
        "utility",
        "moderation",
        "fun",
      ];

      for (const category of categoryOrder) {
        const commands = byCategory.get(category);
        if (commands && commands.length > 0) {
          sections.push({
            title: COMMAND_CATEGORIES[category],
            commands,
          });
        }
      }

      return sections;
    }

    // When filtering, show all matches in a single list
    return [{ title: "Results", commands: displayedCommands }];
  }, [displayedCommands, filter, favoriteCommands, recentCommands]);

  // Build flat list for keyboard navigation
  const flatCommandsList = React.useMemo(() => {
    return categorizedCommands.flatMap((section) => section.commands);
  }, [categorizedCommands]);

  // Reset selected index when commands change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [filter, flatCommandsList.length]);

  // Auto focus search when opened
  React.useEffect(() => {
    if (isOpen && showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, showSearch]);

  // Handle click outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, flatCommandsList.length - 1),
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatCommandsList[selectedIndex]) {
            onSelect(flatCommandsList[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Tab":
          e.preventDefault();
          // Tab cycles through options
          if (e.shiftKey) {
            setSelectedIndex((prev) =>
              prev === 0 ? flatCommandsList.length - 1 : prev - 1,
            );
          } else {
            setSelectedIndex((prev) =>
              prev === flatCommandsList.length - 1 ? 0 : prev + 1,
            );
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, flatCommandsList, onSelect, onClose]);

  // Scroll selected item into view
  React.useEffect(() => {
    if (!listRef.current) return;

    const selectedElement = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove leading slash if present
    setFilter(value.startsWith("/") ? value.slice(1) : value);
  };

  // Calculate position styles
  const positionStyles: React.CSSProperties = React.useMemo(() => {
    if (position) {
      return {
        position: "absolute" as const,
        top: position.top,
        left: position.left,
      };
    }
    return {};
  }, [position]);

  if (!isOpen) return null;

  // Track global index for flat list
  let globalIndex = 0;

  return (
    <div
      ref={containerRef}
      style={positionStyles}
      className={cn(
        "w-80 overflow-hidden rounded-lg border bg-popover shadow-lg",
        "z-50",
        className,
      )}
    >
      {/* Search Input */}
      {showSearch && (
        <div className="border-b p-2">
          <Input
            ref={searchRef}
            value={filter}
            onChange={handleSearchChange}
            placeholder="Search commands..."
            className="h-9"
          />
        </div>
      )}

      {/* Commands List */}
      <ScrollArea style={{ maxHeight }} className="overflow-y-auto">
        <div ref={listRef} role="listbox" aria-label="Commands">
          {flatCommandsList.length === 0 ? (
            <EmptyState query={filter} />
          ) : (
            categorizedCommands.map((section) => {
              if (section.commands.length === 0) return null;

              return (
                <div key={section.title} className="py-1">
                  {!filter && (
                    <CommandCategoryHeader
                      category={section.title}
                      count={section.commands.length}
                    />
                  )}
                  {section.commands.map((command) => {
                    const itemIndex = globalIndex++;
                    return (
                      <div
                        key={command.name}
                        data-index={itemIndex}
                        className="group"
                      >
                        <CommandItem
                          command={command}
                          isSelected={selectedIndex === itemIndex}
                          isFavorite={isFavorite(command.name)}
                          onClick={() => onSelect(command)}
                          onFavoriteToggle={() => toggleFavorite(command.name)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <MenuFooter />
    </div>
  );
}

// ============================================================================
// Floating Menu Wrapper (with Portal)
// ============================================================================

export interface FloatingCommandMenuProps extends Omit<
  SlashCommandMenuProps,
  "position"
> {
  /** Reference to the trigger element for positioning */
  triggerRef: React.RefObject<HTMLElement>;
  /** Offset from trigger element */
  offset?: { x: number; y: number };
}

export function FloatingCommandMenu({
  triggerRef,
  offset = { x: 0, y: 8 },
  ...props
}: FloatingCommandMenuProps) {
  const [position, setPosition] = React.useState<{
    top: number;
    left: number;
  } | null>(null);

  // Calculate position based on trigger element
  React.useEffect(() => {
    if (!props.isOpen || !triggerRef.current) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuWidth = 320; // Approximate menu width
      const menuHeight = 400; // Approximate max height

      // Position above the trigger, aligned to left
      let top = rect.top - menuHeight - offset.y;
      let left = rect.left + offset.x;

      // If menu would go above viewport, position below
      if (top < 8) {
        top = rect.bottom + offset.y;
      }

      // If menu would go off right edge, align to right
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }

      // If menu would go off left edge
      if (left < 8) {
        left = 8;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [props.isOpen, triggerRef, offset.x, offset.y]);

  return <SlashCommandMenu {...props} position={position} />;
}

// ============================================================================
// Inline Command Menu (for use within message input container)
// ============================================================================

export interface InlineCommandMenuProps {
  /** Whether the menu is visible */
  isVisible: boolean;
  /** Filter text (partial command name) */
  filter: string;
  /** Callback when command is selected */
  onSelect: (command: SlashCommand) => void;
  /** Callback when menu is dismissed */
  onDismiss: () => void;
  /** Context for filtering commands */
  context?: {
    channelId?: string;
    userRole?: "owner" | "admin" | "moderator" | "member" | "guest";
    enabledFeatures?: string[];
  };
  /** Additional class names */
  className?: string;
}

export function InlineCommandMenu({
  isVisible,
  filter,
  onSelect,
  onDismiss,
  context,
  className,
}: InlineCommandMenuProps) {
  if (!isVisible) return null;

  return (
    <SlashCommandMenu
      isOpen={isVisible}
      initialFilter={filter}
      onSelect={onSelect}
      onClose={onDismiss}
      showSearch={false}
      maxHeight={300}
      context={context}
      className={cn("absolute bottom-full left-0 mb-2", className)}
    />
  );
}

export default SlashCommandMenu;
