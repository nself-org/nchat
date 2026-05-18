"use client";

import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Search, X, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useSearchStore,
  selectInChannelSearchState,
} from "@/stores/search-store";

// ============================================================================
// Types
// ============================================================================

export interface SearchInChannelProps {
  /** The channel ID to search in */
  channelId: string;
  /** The channel name for display */
  channelName?: string;
  /** Callback when search is performed */
  onSearch?: (query: string, channelId: string) => void;
  /** Callback when a result is navigated to */
  onNavigateToResult?: (messageId: string, index: number) => void;
  /** Callback when search is closed */
  onClose?: () => void;
  /** Whether search is loading */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function SearchInChannel({
  channelId,
  channelName,
  onSearch,
  onNavigateToResult,
  onClose,
  isLoading = false,
  className,
}: SearchInChannelProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Get search state from store
  const searchState = useSearchStore(selectInChannelSearchState);
  const startInChannelSearch = useSearchStore(
    (state) => state.startInChannelSearch,
  );
  const endInChannelSearch = useSearchStore(
    (state) => state.endInChannelSearch,
  );
  const setInChannelQuery = useSearchStore((state) => state.setInChannelQuery);
  const navigateInChannelResult = useSearchStore(
    (state) => state.navigateInChannelResult,
  );

  const { active, query, results, currentIndex, total } = searchState;

  // Keyboard shortcuts
  useHotkeys(
    "mod+f",
    (e) => {
      e.preventDefault();
      if (!active) {
        startInChannelSearch();
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    },
    { enableOnFormTags: true },
  );

  useHotkeys(
    "escape",
    () => {
      if (active) {
        handleClose();
      }
    },
    { enabled: active, enableOnFormTags: true },
  );

  useHotkeys(
    "enter",
    (e) => {
      if (active && results.length > 0) {
        e.preventDefault();
        const result = results[currentIndex];
        if (result) {
          onNavigateToResult?.(result.id, currentIndex);
        }
      }
    },
    { enabled: active, enableOnFormTags: true },
  );

  useHotkeys(
    ["mod+g", "f3"],
    (e) => {
      if (active && results.length > 0) {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrevious();
        } else {
          handleNext();
        }
      }
    },
    { enabled: active, enableOnFormTags: true },
  );

  // Handle query change with debounce
  const [localQuery, setLocalQuery] = React.useState(query);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (localQuery !== query) {
        setInChannelQuery(localQuery);
        if (localQuery.trim()) {
          onSearch?.(localQuery, channelId);
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localQuery, query, channelId, onSearch, setInChannelQuery]);

  // Sync local query with store query
  React.useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const handleClose = () => {
    endInChannelSearch();
    onClose?.();
  };

  const handleNext = () => {
    navigateInChannelResult("next");
    const nextIndex = (currentIndex + 1) % results.length;
    const result = results[nextIndex];
    if (result) {
      onNavigateToResult?.(result.id, nextIndex);
    }
  };

  const handlePrevious = () => {
    navigateInChannelResult("prev");
    const prevIndex =
      currentIndex === 0 ? results.length - 1 : currentIndex - 1;
    const result = results[prevIndex];
    if (result) {
      onNavigateToResult?.(result.id, prevIndex);
    }
  };

  if (!active) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b bg-background px-3 py-2",
        className,
      )}
    >
      {/* Search icon */}
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />

      {/* Input */}
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder={
            channelName
              ? `Search in #${channelName}...`
              : "Search in this channel..."
          }
          className="h-8 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          autoFocus // eslint-disable-line jsx-a11y/no-autofocus
        />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      )}

      {/* Result count */}
      {!isLoading && localQuery && (
        <span className="shrink-0 text-sm text-muted-foreground">
          {total === 0 ? (
            "No results"
          ) : (
            <>
              {currentIndex + 1} of {total}
            </>
          )}
        </span>
      )}

      {/* Navigation buttons */}
      {total > 0 && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            disabled={total === 0}
            className="h-7 w-7"
            title="Previous result (Shift+Enter)"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={total === 0}
            className="h-7 w-7"
            title="Next result (Enter)"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="h-7 w-7 shrink-0"
        title="Close (Esc)"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// Compact Trigger Button
// ============================================================================

export interface SearchInChannelTriggerProps {
  onClick?: () => void;
  className?: string;
}

export function SearchInChannelTrigger({
  onClick,
  className,
}: SearchInChannelTriggerProps) {
  const startInChannelSearch = useSearchStore(
    (state) => state.startInChannelSearch,
  );

  const handleClick = () => {
    startInChannelSearch();
    onClick?.();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn("h-8 gap-1.5 px-2", className)}
      title="Search in channel (Cmd+F)"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="ml-1 hidden rounded border bg-muted px-1 text-[10px] font-medium text-muted-foreground sm:inline">
        &#8984;F
      </kbd>
    </Button>
  );
}

// ============================================================================
// Hook for Search in Channel
// ============================================================================

export function useSearchInChannel() {
  const searchState = useSearchStore(selectInChannelSearchState);
  const startInChannelSearch = useSearchStore(
    (state) => state.startInChannelSearch,
  );
  const endInChannelSearch = useSearchStore(
    (state) => state.endInChannelSearch,
  );
  const setInChannelQuery = useSearchStore((state) => state.setInChannelQuery);
  const setInChannelResults = useSearchStore(
    (state) => state.setInChannelResults,
  );
  const navigateInChannelResult = useSearchStore(
    (state) => state.navigateInChannelResult,
  );
  const jumpToInChannelResult = useSearchStore(
    (state) => state.jumpToInChannelResult,
  );

  return {
    ...searchState,
    start: startInChannelSearch,
    end: endInChannelSearch,
    setQuery: setInChannelQuery,
    setResults: setInChannelResults,
    navigate: navigateInChannelResult,
    jumpTo: jumpToInChannelResult,
  };
}

// ============================================================================
// Highlight Matches in View
// ============================================================================

export interface HighlightMatchesProps {
  /** The content to highlight */
  content: string;
  /** The search query */
  query: string;
  /** Whether this message is currently focused */
  isFocused?: boolean;
  /** Additional class names */
  className?: string;
}

export function HighlightMatches({
  content,
  query,
  isFocused = false,
  className,
}: HighlightMatchesProps) {
  if (!query.trim()) {
    return <span className={className}>{content}</span>;
  }

  // Escape regex special characters
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = content.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className={cn(
              "rounded-sm px-0.5",
              isFocused
                ? "bg-orange-400 text-orange-950 dark:bg-orange-500 dark:text-orange-50"
                : "bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100",
            )}
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        ),
      )}
    </span>
  );
}

export default SearchInChannel;
