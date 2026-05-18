"use client";

import * as React from "react";
import { Search, X, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getSearchHistory,
  addToSearchHistory,
  clearSearchHistory,
} from "@/lib/saved";

export interface SavedSearchProps {
  /** Current search query */
  value: string;
  /** Callback when search changes */
  onChange: (value: string) => void;
  /** Callback when search is submitted */
  onSearch?: (query: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional className */
  className?: string;
}

/**
 * Search input with history for saved messages.
 */
export function SavedSearch({
  value,
  onChange,
  onSearch,
  placeholder = "Search saved messages...",
  className,
}: SavedSearchProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  const handleSubmit = (query: string) => {
    if (query.trim()) {
      addToSearchHistory(query);
      setHistory(getSearchHistory());
      onSearch?.(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(value);
      setIsFocused(false);
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleHistoryClick = (query: string) => {
    onChange(query);
    handleSubmit(query);
    setIsFocused(false);
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  const showHistory = isFocused && history.length > 0 && !value;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear</span>
          </Button>
        )}
      </div>

      {/* Search history dropdown */}
      {showHistory && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover shadow-md">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Recent searches
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleClearHistory}
            >
              Clear
            </Button>
          </div>
          <ScrollArea className="max-h-48">
            <div className="py-1">
              {history.map((query, index) => (
                <button
                  key={index}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => handleHistoryClick(query)}
                >
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="flex-1 truncate text-left">{query}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
