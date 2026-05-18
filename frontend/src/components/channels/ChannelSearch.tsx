"use client";

import * as React from "react";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Search,
  X,
  Hash,
  Lock,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  searchChannels,
  getSearchSuggestions,
  getSearchHistory,
  addToSearchHistory,
  highlightText,
  QUICK_FILTERS,
  type SearchResult,
  type SearchSuggestion,
} from "@/lib/channels/channel-search";
import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelSearchProps {
  channels: Channel[];
  placeholder?: string;
  showSuggestions?: boolean;
  showHistory?: boolean;
  showQuickFilters?: boolean;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
  onResultSelect?: (channel: Channel) => void;
  onFilterChange?: (filterId: string | null) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelSearch({
  channels,
  placeholder = "Search channels...",
  showSuggestions = true,
  showHistory = true,
  showQuickFilters = true,
  autoFocus = false,
  onSearch,
  onResultSelect,
  onFilterChange,
  className,
}: ChannelSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchChannels(channels, {
      query: query.trim(),
      limit: 10,
    });
  }, [channels, query]);

  // Get suggestions
  const suggestions = useMemo(() => {
    if (!showSuggestions) return [];
    const history = showHistory ? getSearchHistory() : [];
    return getSearchSuggestions(channels, query, history);
  }, [channels, query, showSuggestions, showHistory]);

  // Handle input change
  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (!isOpen && value) {
        setIsOpen(true);
      }
    },
    [isOpen],
  );

  // Handle search submit
  const handleSearch = useCallback(() => {
    if (query.trim()) {
      addToSearchHistory(query.trim());
      onSearch?.(query.trim());
    }
    setIsOpen(false);
  }, [query, onSearch]);

  // Handle result selection
  const handleResultSelect = useCallback(
    (channel: Channel) => {
      addToSearchHistory(query.trim());
      onResultSelect?.(channel);
      setQuery("");
      setIsOpen(false);
    },
    [query, onResultSelect],
  );

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion: SearchSuggestion) => {
      if (suggestion.type === "channel" && suggestion.channelId) {
        const channel = channels.find((c) => c.id === suggestion.channelId);
        if (channel) {
          handleResultSelect(channel);
        }
      } else {
        setQuery(suggestion.value);
        onSearch?.(suggestion.value);
      }
    },
    [channels, handleResultSelect, onSearch],
  );

  // Handle quick filter
  const handleFilterClick = useCallback(
    (filterId: string) => {
      const newFilter = activeFilter === filterId ? null : filterId;
      setActiveFilter(newFilter);
      onFilterChange?.(newFilter);
    },
    [activeFilter, onFilterChange],
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setQuery("");
    setActiveFilter(null);
    onFilterChange?.(null);
    inputRef.current?.focus();
  }, [onFilterChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [handleSearch],
  );

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className={cn("w-full", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              className="pl-9 pr-9"
            />
            {(query || activeFilter) && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {/* Quick Filters */}
              {showQuickFilters && (
                <>
                  <CommandGroup heading="Quick Filters">
                    <div className="flex flex-wrap gap-1.5 p-2">
                      {QUICK_FILTERS.map((filter) => (
                        <Badge
                          key={filter.id}
                          variant={
                            activeFilter === filter.id ? "default" : "outline"
                          }
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => handleFilterClick(filter.id)}
                        >
                          {filter.label}
                        </Badge>
                      ))}
                    </div>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Search Results */}
              {query && searchResults.length > 0 && (
                <CommandGroup heading="Channels">
                  {searchResults.map((result) => (
                    <CommandItem
                      key={result.channel.id}
                      onSelect={() => handleResultSelect(result.channel)}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      {result.channel.type === "private" ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {renderHighlightedText(
                            result.channel.name,
                            result.highlights.find((h) => h.field === "name")
                              ?.matches || [],
                          )}
                        </div>
                        {result.channel.description && (
                          <div className="truncate text-sm text-muted-foreground">
                            {renderHighlightedText(
                              result.channel.description,
                              result.highlights.find(
                                (h) => h.field === "description",
                              )?.matches || [],
                            )}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Suggestions */}
              {!query && suggestions.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {suggestions.map((suggestion, index) => (
                    <CommandItem
                      key={`${suggestion.type}-${suggestion.value}-${index}`}
                      onSelect={() => handleSuggestionSelect(suggestion)}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      {suggestion.type === "channel" ? (
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{suggestion.display}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Empty state */}
              {query && searchResults.length === 0 && (
                <CommandEmpty>
                  No channels found for &quot;{query}&quot;
                </CommandEmpty>
              )}

              {/* Search action */}
              {query && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleSearch}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Search className="h-4 w-4" />
                      <span>Search for &quot;{query}&quot;</span>
                      <ArrowRight className="ml-auto h-4 w-4" />
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Helper function to render highlighted text
function renderHighlightedText(
  text: string,
  matches: Array<{ start: number; end: number; text: string }>,
) {
  if (matches.length === 0) {
    return <span>{text}</span>;
  }

  const segments = highlightText(text, matches);

  return (
    <span>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark
            key={index}
            className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </span>
  );
}

ChannelSearch.displayName = "ChannelSearch";
