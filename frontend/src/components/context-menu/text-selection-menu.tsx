"use client";

import * as React from "react";
import {
  Copy,
  Quote,
  Search,
  BookOpen,
  MessageSquareQuote,
  Languages,
} from "lucide-react";
import {
  useContextMenuStore,
  type TextSelectionTarget,
} from "@/lib/context-menu/context-menu-store";
import { PositionedContextMenu } from "./base-context-menu";
import { MenuItem } from "./menu-item";
import { MenuSeparator } from "./menu-separator";
import {
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuSubmenuContent,
} from "./menu-submenu";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface TextSelectionMenuProps {
  /**
   * Called when an action is performed
   */
  onAction?: (action: string, data: TextSelectionActionData) => void;
}

export interface TextSelectionActionData {
  selectedText: string;
  action: TextSelectionAction;
  searchEngine?: SearchEngine;
}

export type TextSelectionAction =
  | "copy"
  | "quote"
  | "reply-quote"
  | "search"
  | "define"
  | "translate";

export type SearchEngine = "google" | "duckduckgo" | "bing";

// Search engine options
const SEARCH_ENGINES: {
  value: SearchEngine;
  label: string;
  urlTemplate: string;
}[] = [
  {
    value: "google",
    label: "Google",
    urlTemplate: "https://www.google.com/search?q=",
  },
  {
    value: "duckduckgo",
    label: "DuckDuckGo",
    urlTemplate: "https://duckduckgo.com/?q=",
  },
  {
    value: "bing",
    label: "Bing",
    urlTemplate: "https://www.bing.com/search?q=",
  },
];

// ============================================================================
// Component
// ============================================================================

export function TextSelectionMenu({ onAction }: TextSelectionMenuProps) {
  const target = useContextMenuStore((state) => state.target);
  const closeMenu = useContextMenuStore((state) => state.closeMenu);

  // Type guard for text selection target
  const textTarget =
    target?.type === "text-selection" ? (target as TextSelectionTarget) : null;

  if (!textTarget) return null;

  const { selectedText } = textTarget;

  // Truncate for display if too long
  const displayText =
    selectedText.length > 30 ? `${selectedText.slice(0, 30)}...` : selectedText;

  const handleAction = (
    action: TextSelectionAction,
    searchEngine?: SearchEngine,
  ) => {
    onAction?.(action, {
      selectedText,
      action,
      searchEngine,
    });
    closeMenu();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      handleAction("copy");
    } catch (error) {
      logger.error("Failed to copy text:", error);
    }
  };

  const handleSearch = (engine: SearchEngine) => {
    const searchConfig = SEARCH_ENGINES.find((e) => e.value === engine);
    if (searchConfig) {
      const searchUrl = `${searchConfig.urlTemplate}${encodeURIComponent(selectedText)}`;
      window.open(searchUrl, "_blank", "noopener,noreferrer");
      handleAction("search", engine);
    }
  };

  const handleDefine = () => {
    // Open Google Dictionary/Define
    const defineUrl = `https://www.google.com/search?q=define+${encodeURIComponent(selectedText)}`;
    window.open(defineUrl, "_blank", "noopener,noreferrer");
    handleAction("define");
  };

  const handleTranslate = () => {
    // Open Google Translate
    const translateUrl = `https://translate.google.com/?text=${encodeURIComponent(selectedText)}`;
    window.open(translateUrl, "_blank", "noopener,noreferrer");
    handleAction("translate");
  };

  return (
    <PositionedContextMenu>
      {/* Selected text preview */}
      <div className="px-2 py-1.5 text-xs text-muted-foreground">
        Selected: &quot;{displayText}&quot;
      </div>

      <MenuSeparator />

      {/* Copy */}
      <MenuItem icon={Copy} shortcut="Ctrl+C" onSelect={handleCopy}>
        Copy
      </MenuItem>

      {/* Quote in reply */}
      <MenuItem
        icon={MessageSquareQuote}
        onSelect={() => handleAction("reply-quote")}
      >
        Quote in reply
      </MenuItem>

      {/* Quote as message */}
      <MenuItem icon={Quote} onSelect={() => handleAction("quote")}>
        Quote as message
      </MenuItem>

      <MenuSeparator />

      {/* Search submenu */}
      <MenuSubmenu>
        <MenuSubmenuTrigger icon={Search}>Search</MenuSubmenuTrigger>
        <MenuSubmenuContent>
          {SEARCH_ENGINES.map(({ value, label }) => (
            <MenuItem key={value} onSelect={() => handleSearch(value)}>
              Search with {label}
            </MenuItem>
          ))}
        </MenuSubmenuContent>
      </MenuSubmenu>

      {/* Define (single word or short phrase) */}
      {selectedText.split(" ").length <= 3 && (
        <MenuItem icon={BookOpen} onSelect={handleDefine}>
          Define &quot;{displayText}&quot;
        </MenuItem>
      )}

      {/* Translate */}
      <MenuItem icon={Languages} onSelect={handleTranslate}>
        Translate
      </MenuItem>
    </PositionedContextMenu>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { SEARCH_ENGINES };
