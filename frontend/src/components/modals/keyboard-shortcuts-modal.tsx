"use client";

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
import { Search, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface Shortcut {
  id: string;
  keys: string[];
  description: string;
  category: string;
}

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts?: Shortcut[];
}

// Default shortcuts for chat application
const DEFAULT_SHORTCUTS: Shortcut[] = [
  // Navigation
  {
    id: "nav-1",
    keys: ["Ctrl", "K"],
    description: "Open quick switcher",
    category: "Navigation",
  },
  {
    id: "nav-2",
    keys: ["Ctrl", "Shift", "K"],
    description: "Open direct message",
    category: "Navigation",
  },
  {
    id: "nav-3",
    keys: ["Alt", "↑"],
    description: "Go to previous channel",
    category: "Navigation",
  },
  {
    id: "nav-4",
    keys: ["Alt", "↓"],
    description: "Go to next channel",
    category: "Navigation",
  },
  {
    id: "nav-5",
    keys: ["Alt", "Shift", "↑"],
    description: "Go to previous unread",
    category: "Navigation",
  },
  {
    id: "nav-6",
    keys: ["Alt", "Shift", "↓"],
    description: "Go to next unread",
    category: "Navigation",
  },
  {
    id: "nav-7",
    keys: ["Ctrl", "Shift", "T"],
    description: "Open threads view",
    category: "Navigation",
  },
  {
    id: "nav-8",
    keys: ["Ctrl", "Shift", "A"],
    description: "Open activity",
    category: "Navigation",
  },
  {
    id: "nav-9",
    keys: ["Ctrl", "Shift", "M"],
    description: "Open mentions",
    category: "Navigation",
  },

  // Messages
  {
    id: "msg-1",
    keys: ["Enter"],
    description: "Send message",
    category: "Messages",
  },
  {
    id: "msg-2",
    keys: ["Shift", "Enter"],
    description: "New line in message",
    category: "Messages",
  },
  {
    id: "msg-3",
    keys: ["↑"],
    description: "Edit last message",
    category: "Messages",
  },
  {
    id: "msg-4",
    keys: ["Ctrl", "U"],
    description: "Upload file",
    category: "Messages",
  },
  {
    id: "msg-5",
    keys: ["Ctrl", "B"],
    description: "Bold text",
    category: "Messages",
  },
  {
    id: "msg-6",
    keys: ["Ctrl", "I"],
    description: "Italic text",
    category: "Messages",
  },
  {
    id: "msg-7",
    keys: ["Ctrl", "Shift", "X"],
    description: "Strikethrough",
    category: "Messages",
  },
  {
    id: "msg-8",
    keys: ["Ctrl", "Shift", "C"],
    description: "Code block",
    category: "Messages",
  },
  {
    id: "msg-9",
    keys: ["Ctrl", "Shift", ">"],
    description: "Quote text",
    category: "Messages",
  },

  // Actions
  {
    id: "act-1",
    keys: ["Ctrl", "/"],
    description: "Show shortcuts",
    category: "Actions",
  },
  {
    id: "act-2",
    keys: ["?"],
    description: "Show shortcuts (alternative)",
    category: "Actions",
  },
  {
    id: "act-3",
    keys: ["Ctrl", "F"],
    description: "Search in channel",
    category: "Actions",
  },
  {
    id: "act-4",
    keys: ["Ctrl", "Shift", "F"],
    description: "Search everywhere",
    category: "Actions",
  },
  {
    id: "act-5",
    keys: ["Ctrl", "E"],
    description: "Toggle emoji picker",
    category: "Actions",
  },
  {
    id: "act-6",
    keys: ["Ctrl", ","],
    description: "Open preferences",
    category: "Actions",
  },
  {
    id: "act-7",
    keys: ["Escape"],
    description: "Close modal / Cancel",
    category: "Actions",
  },

  // Channel
  {
    id: "ch-1",
    keys: ["Ctrl", "Shift", "N"],
    description: "Create new channel",
    category: "Channels",
  },
  {
    id: "ch-2",
    keys: ["Ctrl", "Shift", "I"],
    description: "Channel info",
    category: "Channels",
  },
  {
    id: "ch-3",
    keys: ["Ctrl", "Shift", "P"],
    description: "Toggle pinned messages",
    category: "Channels",
  },
  {
    id: "ch-4",
    keys: ["Ctrl", "Shift", "B"],
    description: "Toggle bookmarks",
    category: "Channels",
  },

  // Call & Media
  {
    id: "call-1",
    keys: ["Ctrl", "Shift", "H"],
    description: "Start huddle",
    category: "Calls",
  },
  {
    id: "call-2",
    keys: ["M"],
    description: "Toggle mute (in call)",
    category: "Calls",
  },
  {
    id: "call-3",
    keys: ["V"],
    description: "Toggle video (in call)",
    category: "Calls",
  },
  {
    id: "call-4",
    keys: ["Ctrl", "Shift", "E"],
    description: "End call",
    category: "Calls",
  },
];

// Detect OS for keyboard symbols
const isMac =
  typeof window !== "undefined" &&
  navigator.platform.toUpperCase().indexOf("MAC") >= 0;

const KEY_DISPLAY: Record<string, string> = {
  Ctrl: isMac ? "⌘" : "Ctrl",
  Alt: isMac ? "⌥" : "Alt",
  Shift: isMac ? "⇧" : "Shift",
  Enter: "↵",
  Escape: "Esc",
  Backspace: "⌫",
  Delete: "⌦",
  Tab: "⇥",
  Space: "␣",
};

function KeyBadge({ keyName }: { keyName: string }) {
  const displayKey = KEY_DISPLAY[keyName] || keyName;

  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 font-mono text-xs",
        "rounded border border-border bg-muted shadow-sm",
        "h-6 min-w-[1.5rem]",
      )}
    >
      {displayKey}
    </kbd>
  );
}

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
  shortcuts = DEFAULT_SHORTCUTS,
}: KeyboardShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  // Open with ? key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for ? key or Ctrl+/
      if (
        (e.key === "?" && !e.ctrlKey && !e.metaKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === "/")
      ) {
        // Don't trigger if typing in an input
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
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

  const filteredShortcuts = useMemo(() => {
    if (!searchQuery) return shortcuts;
    const query = searchQuery.toLowerCase();
    return shortcuts.filter(
      (shortcut) =>
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.category.toLowerCase().includes(query) ||
        shortcut.keys.some((key) => key.toLowerCase().includes(query)),
    );
  }, [shortcuts, searchQuery]);

  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, Shortcut[]> = {};
    filteredShortcuts.forEach((shortcut) => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    });
    return groups;
  }, [filteredShortcuts]);

  const categories = Object.keys(groupedShortcuts);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-muted-foreground" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate faster with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Shortcuts list */}
        <ScrollArea className="-mx-6 flex-1 px-6">
          {categories.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No shortcuts found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {categories.map((category) => (
                <div key={category}>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {groupedShortcuts[category].map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className="hover:bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2 transition-colors"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, index) => (
                            <span
                              key={index}
                              className="flex items-center gap-1"
                            >
                              <KeyBadge keyName={key} />
                              {index < shortcut.keys.length - 1 && (
                                <span className="text-xs text-muted-foreground">
                                  +
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
          <span>
            Press <KeyBadge keyName="?" /> or <KeyBadge keyName="Ctrl" /> +{" "}
            <KeyBadge keyName="/" /> to open
          </span>
          <span>
            Press <KeyBadge keyName="Escape" /> to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
