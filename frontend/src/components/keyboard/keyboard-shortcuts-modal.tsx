"use client";

/**
 * KeyboardShortcutsModal Component
 *
 * A comprehensive modal dialog displaying all keyboard shortcuts.
 * Features search, categorization, and optional customization.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ShortcutCategory,
  ShortcutCategoryList,
  ShortcutData,
} from "./shortcut-category";
import { ShortcutKey } from "./shortcut-key";
import {
  SHORTCUTS,
  ShortcutKey as ShortcutKeyType,
  ShortcutCategory as ShortcutCategoryEnum,
  getShortcutsGrouped,
} from "@/lib/keyboard/shortcuts";
import { useShortcutStore } from "@/lib/keyboard/shortcut-store";
import { useAllShortcuts } from "@/lib/keyboard/use-keyboard-shortcuts";
import { formatShortcut, isMacOS } from "@/lib/keyboard/shortcut-utils";
import { Search, Keyboard, Settings2, RotateCcw, X } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcutsModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Allow customization of shortcuts */
  allowCustomize?: boolean;
  /** Initial tab to show */
  initialTab?: "all" | "customize";
  /** Additional class name */
  className?: string;
}

// ============================================================================
// KeyboardShortcutsModal Component
// ============================================================================

/**
 * Modal dialog displaying all keyboard shortcuts
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * // Show modal with ? key
 * useHotkey('?', () => setOpen(true));
 *
 * <KeyboardShortcutsModal open={open} onOpenChange={setOpen} />
 * ```
 */
export function KeyboardShortcutsModal({
  open,
  onOpenChange,
  allowCustomize = true,
  initialTab = "all",
  className,
}: KeyboardShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const isMac = React.useMemo(() => isMacOS(), []);

  const { shortcuts, shortcutsByCategory, categories } = useAllShortcuts();
  const store = useShortcutStore();

  // Focus search input when modal opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery("");
    }
  }, [open]);

  // Filter shortcuts by search query
  const filteredShortcuts = React.useMemo(() => {
    if (!searchQuery.trim()) return shortcuts;

    const query = searchQuery.toLowerCase();
    return shortcuts.filter(
      (shortcut) =>
        shortcut.label.toLowerCase().includes(query) ||
        shortcut.description?.toLowerCase().includes(query) ||
        shortcut.displayKey.toLowerCase().includes(query) ||
        shortcut.category.toLowerCase().includes(query),
    );
  }, [shortcuts, searchQuery]);

  // Group filtered shortcuts by category
  const filteredByCategory = React.useMemo(() => {
    const grouped: Record<ShortcutCategoryEnum, ShortcutData[]> = {
      Navigation: [],
      Messages: [],
      Formatting: [],
      UI: [],
      Actions: [],
    };

    for (const shortcut of filteredShortcuts) {
      grouped[shortcut.category].push({
        id: shortcut.id,
        label: shortcut.label,
        keys: shortcut.effectiveKey,
        description: shortcut.description,
        isCustomized: shortcut.isCustomized,
        isEnabled: shortcut.isEnabled,
      });
    }

    return grouped;
  }, [filteredShortcuts]);

  // Handle shortcut customization
  const handleEditShortcut = React.useCallback(
    (id: ShortcutKeyType) => {
      store.startRecording(id);
    },
    [store],
  );

  const handleResetShortcut = React.useCallback(
    (id: ShortcutKeyType) => {
      store.resetToDefault(id);
    },
    [store],
  );

  const handleToggleShortcut = React.useCallback(
    (id: ShortcutKeyType, enabled: boolean) => {
      if (enabled) {
        store.enableShortcut(id);
      } else {
        store.disableShortcut(id);
      }
    },
    [store],
  );

  const handleResetAll = React.useCallback(() => {
    store.resetAllToDefaults();
  }, [store]);

  // Count stats
  const totalShortcuts = shortcuts.length;
  const enabledShortcuts = shortcuts.filter((s) => s.isEnabled).length;
  const customizedShortcuts = shortcuts.filter((s) => s.isCustomized).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0",
          className,
        )}
      >
        {/* Header */}
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2 text-primary">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Keyboard Shortcuts
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {enabledShortcuts} of {totalShortcuts} shortcuts enabled
                  {customizedShortcuts > 0 && (
                    <span className="ml-2 text-primary">
                      ({customizedShortcuts} customized)
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShortcutKey keys="?" size="xs" variant="subtle" />
              <span className="text-xs text-muted-foreground">to toggle</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Content */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "all" | "customize")}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              All Shortcuts
            </TabsTrigger>
            {allowCustomize && (
              <TabsTrigger
                value="customize"
                className="flex items-center gap-2"
              >
                <Settings2 className="h-4 w-4" />
                Customize
              </TabsTrigger>
            )}
          </TabsList>

          {/* All Shortcuts Tab */}
          <TabsContent value="all" className="mt-0 flex-1">
            <ScrollArea className="h-[400px] px-6 py-4">
              {searchQuery && filteredShortcuts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="text-muted-foreground/50 mb-4 h-12 w-12" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No shortcuts found
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different search term
                  </p>
                </div>
              ) : (
                <ShortcutCategoryList
                  categories={filteredByCategory}
                  categoryOrder={categories}
                  compact={false}
                  allowCustomize={false}
                />
              )}
            </ScrollArea>
          </TabsContent>

          {/* Customize Tab */}
          {allowCustomize && (
            <TabsContent value="customize" className="mt-0 flex-1">
              <ScrollArea className="h-[400px] px-6 py-4">
                {/* Customize Header */}
                <div className="mb-4 flex items-center justify-between border-b pb-4">
                  <div>
                    <h4 className="text-sm font-medium">Customize Shortcuts</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Click Edit to record a new key combination
                    </p>
                  </div>
                  {customizedShortcuts > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetAll}
                      className="h-8 text-xs"
                    >
                      <RotateCcw className="mr-1.5 h-3 w-3" />
                      Reset All
                    </Button>
                  )}
                </div>

                {/* Recording indicator */}
                {store.recordingShortcut && (
                  <div className="bg-primary/10 border-primary/20 mb-4 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                        <span className="text-sm font-medium">
                          Recording shortcut for:{" "}
                          <span className="text-primary">
                            {SHORTCUTS[store.recordingShortcut]?.label}
                          </span>
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => store.stopRecording()}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Press any key combination to set the new shortcut, or
                      Escape to cancel
                    </p>
                  </div>
                )}

                {/* Conflicts warning */}
                {store.conflicts.length > 0 && (
                  <div className="bg-destructive/10 border-destructive/20 mb-4 rounded-lg border p-3">
                    <p className="text-sm font-medium text-destructive">
                      Shortcut Conflicts Detected
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {store.conflicts.length} shortcuts share the same key
                      combination
                    </p>
                  </div>
                )}

                <ShortcutCategoryList
                  categories={filteredByCategory}
                  categoryOrder={categories}
                  compact={false}
                  collapsible
                  allowCustomize
                  onEditShortcut={handleEditShortcut}
                  onResetShortcut={handleResetShortcut}
                  onToggleShortcut={handleToggleShortcut}
                />
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>

        {/* Footer */}
        <div className="bg-muted/30 border-t px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShortcutKey
                  keys={isMac ? "mod" : "ctrl"}
                  size="xs"
                  variant="subtle"
                />
                <span>= {isMac ? "Command" : "Ctrl"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ShortcutKey keys="alt" size="xs" variant="subtle" />
                <span>= {isMac ? "Option" : "Alt"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ShortcutKey keys="shift" size="xs" variant="subtle" />
                <span>= Shift</span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// useKeyboardShortcutsModal Hook
// ============================================================================

/**
 * Hook to manage the keyboard shortcuts modal state
 *
 * @example
 * ```tsx
 * const { isOpen, open, close, toggle } = useKeyboardShortcutsModal();
 *
 * // Open with ? key
 * useHotkey('?', toggle);
 *
 * <KeyboardShortcutsModal open={isOpen} onOpenChange={setIsOpen} />
 * ```
 */
export function useKeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    setIsOpen,
    open,
    close,
    toggle,
  };
}

// ============================================================================
// Dialog Components (inline for standalone use)
// ============================================================================

// Using Radix UI Dialog - these should already be available from ui/dialog
// If not, import from @radix-ui/react-dialog

// ============================================================================
// Exports
// ============================================================================

export default KeyboardShortcutsModal;
