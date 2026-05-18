"use client";

/**
 * Shortcuts Modal Component
 *
 * Displays a searchable, categorized list of keyboard shortcuts.
 * Can be opened with ? or Cmd+/ keys.
 */

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useShortcutStore,
  selectShortcutsByCategory,
  selectShortcutsEnabled,
} from "@/lib/keyboard/shortcut-store";
import { ShortcutCategory, getCategories } from "@/lib/keyboard/shortcuts";
import { formatShortcut, isMacOS } from "@/lib/keyboard/shortcut-utils";
import { Search, Keyboard, Zap, Info, Command } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shortcuts Modal - Display all keyboard shortcuts
 */
export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ShortcutCategory | "All"
  >("All");

  const isMac = useMemo(() => isMacOS(), []);

  // Store selectors
  const shortcutsByCategory = useShortcutStore(selectShortcutsByCategory);
  const shortcutsEnabled = useShortcutStore(selectShortcutsEnabled);

  // Get all shortcuts as flat array
  const allShortcuts = useMemo(() => {
    return Object.values(shortcutsByCategory).flat();
  }, [shortcutsByCategory]);

  // Filter shortcuts based on search
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery) return allShortcuts;

    const query = searchQuery.toLowerCase();
    return allShortcuts.filter(
      (s) =>
        s.label.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.effectiveKey.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query),
    );
  }, [allShortcuts, searchQuery]);

  // Group filtered shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const grouped: Record<ShortcutCategory, typeof filteredShortcuts> = {
      Navigation: [],
      Messages: [],
      Formatting: [],
      UI: [],
      Actions: [],
    };

    for (const shortcut of filteredShortcuts) {
      if (shortcut.isEnabled) {
        grouped[shortcut.category].push(shortcut);
      }
    }

    return grouped;
  }, [filteredShortcuts]);

  // Categories with enabled shortcuts
  const categories = useMemo(() => {
    return getCategories().filter((cat) => groupedShortcuts[cat].length > 0);
  }, [groupedShortcuts]);

  // Get shortcuts for selected category
  const displayShortcuts = useMemo(() => {
    if (selectedCategory === "All") {
      return filteredShortcuts.filter((s) => s.isEnabled);
    }
    return groupedShortcuts[selectedCategory] || [];
  }, [selectedCategory, filteredShortcuts, groupedShortcuts]);

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedCategory("All");
    }
  }, [open]);

  // Auto-open with keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with ? or Cmd+/
      if (
        (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === "/")
      ) {
        // Don't trigger if typing in an input
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        e.preventDefault();
        onOpenChange(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-muted-foreground" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate faster with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        {!shortcutsEnabled && (
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg border border-border p-3">
            <Info className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Keyboard shortcuts are currently disabled. Enable them in
              Settings.
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            // eslint-disable-next-line jsx-a11y/no-autofocus -- Intentional UX for modal focus
            autoFocus
          />
        </div>

        {/* Tabs for categories */}
        <Tabs
          value={selectedCategory}
          onValueChange={(v) =>
            setSelectedCategory(v as ShortcutCategory | "All")
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="All">All</TabsTrigger>
            {getCategories().map((category) => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent
            value={selectedCategory}
            className="mt-4 flex-1 overflow-hidden"
          >
            <ScrollArea className="h-[400px]">
              {displayShortcuts.length === 0 ? (
                <div className="py-8 text-center">
                  <Keyboard className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? `No shortcuts found matching "${searchQuery}"`
                      : "No shortcuts available in this category"}
                  </p>
                </div>
              ) : selectedCategory === "All" ? (
                // Grouped display for "All"
                <div className="space-y-6 pb-4">
                  {categories.map((category) => {
                    const categoryShortcuts = groupedShortcuts[category];
                    if (categoryShortcuts.length === 0) return null;

                    return (
                      <div key={category}>
                        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                          {category}
                        </h3>
                        <div className="space-y-1">
                          {categoryShortcuts.map((shortcut) => (
                            <ShortcutRow
                              key={shortcut.id}
                              shortcut={shortcut}
                              isMac={isMac}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Single category display
                <div className="space-y-1 pb-4">
                  {displayShortcuts.map((shortcut) => (
                    <ShortcutRow
                      key={shortcut.id}
                      shortcut={shortcut}
                      isMac={isMac}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Command className="h-3 w-3" />
            <span>
              Press{" "}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
                ?
              </kbd>{" "}
              or{" "}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
                {isMac ? "⌘" : "Ctrl"}+/
              </kbd>{" "}
              to open
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            <span>{displayShortcuts.length} shortcuts</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Shortcut Row Component
 */
interface ShortcutRowProps {
  shortcut: {
    id: string;
    label: string;
    description?: string;
    effectiveKey: string;
    isCustomized: boolean;
  };
  isMac: boolean;
}

function ShortcutRow({ shortcut, isMac }: ShortcutRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg px-3 py-2.5",
        "hover:bg-muted/50 transition-colors",
      )}
    >
      <div className="mr-4 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{shortcut.label}</p>
          {shortcut.isCustomized && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                    Custom
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This shortcut has been customized</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {shortcut.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {shortcut.description}
          </p>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        {formatShortcut(shortcut.effectiveKey, { useMacSymbols: isMac })
          .split(" ")
          .map((key, index, arr) => (
            <span key={index} className="flex items-center gap-1">
              <kbd
                className={cn(
                  "inline-flex items-center justify-center px-2 py-0.5 font-mono text-xs",
                  "rounded border border-border bg-muted shadow-sm",
                  "h-6 min-w-[1.5rem]",
                )}
              >
                {key}
              </kbd>
              {index < arr.length - 1 && (
                <span className="text-xs text-muted-foreground">+</span>
              )}
            </span>
          ))}
      </div>
    </div>
  );
}

export default ShortcutsModal;
