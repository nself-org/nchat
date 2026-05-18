"use client";

/**
 * SmartSearch component
 * AI-powered semantic search with natural language queries
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Sparkles,
  X,
  Calendar,
  User,
  Hash,
  Filter,
  Loader2,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getSmartSearch,
  isSemanticSearchAvailable,
  type SearchableMessage,
  type SearchResult,
  type SearchOptions,
} from "@/lib/ai/smart-search";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

export interface SmartSearchProps {
  messages: SearchableMessage[];
  onMessageClick?: (message: SearchableMessage) => void;
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
  autoFocus?: boolean;
}

export function SmartSearch({
  messages,
  onMessageClick,
  placeholder = "Search messages with AI...",
  className,
  showFilters = true,
  autoFocus = false,
}: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSemanticAvailable, setIsSemanticAvailable] = useState(false);
  const [selectedResult, setSelectedResult] = useState<number>(-1);
  const [showResults, setShowResults] = useState(false);

  // Filters - use NonNullable to ensure filters is never undefined
  type FilterType = NonNullable<SearchOptions["filters"]>;
  const [filters, setFilters] = useState<FilterType>({});
  const [rankBy, setRankBy] = useState<SearchOptions["rankBy"]>("relevance");
  const [limit, setLimit] = useState(20);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsSemanticAvailable(isSemanticSearchAvailable());
  }, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters, rankBy, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    if (query.length < 2) return;

    setLoading(true);
    try {
      const search = getSmartSearch();
      const searchResults = await search.search(query, messages, {
        filters,
        rankBy,
        limit,
        includeContext: true,
        contextSize: 1,
      });

      setResults(searchResults);
      setShowResults(true);
      setSelectedResult(-1);
    } catch (error) {
      logger.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    setSelectedResult(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleResultClick = (message: SearchableMessage) => {
    setShowResults(false);
    if (onMessageClick) {
      onMessageClick(message);
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showResults || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedResult((prev) =>
            prev < results.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedResult((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedResult >= 0 && selectedResult < results.length) {
            handleResultClick(results[selectedResult].message);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowResults(false);
          break;
      }
    },
    [showResults, results, selectedResult], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Scroll selected result into view
  useEffect(() => {
    if (selectedResult >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.querySelector(
        `[data-result-index="${selectedResult}"]`,
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedResult]);

  const clearFilter = (key: keyof FilterType) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className={cn("relative w-full", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-10 pr-24"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {isSemanticAvailable && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="mr-1 h-3 w-3" />
                AI
              </Badge>
            )}
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="mt-2 flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="mr-2 h-3 w-3" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-2 flex h-5 w-5 items-center justify-center p-0 text-xs"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="smart-search-channel"
                      className="text-sm font-medium"
                    >
                      Channel
                    </label>
                    <Input
                      id="smart-search-channel"
                      placeholder="Channel ID"
                      value={filters.channelId || ""}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          channelId: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="smart-search-user"
                      className="text-sm font-medium"
                    >
                      User
                    </label>
                    <Input
                      id="smart-search-user"
                      placeholder="User ID"
                      value={filters.userId || ""}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          userId: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="smart-search-thread"
                      className="text-sm font-medium"
                    >
                      Has Thread
                    </label>
                    <Select
                      value={
                        filters.hasThread === undefined
                          ? "any"
                          : filters.hasThread
                            ? "yes"
                            : "no"
                      }
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          hasThread:
                            value === "any" ? undefined : value === "yes",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {activeFilterCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setFilters({})}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Select
              value={rankBy}
              onValueChange={(value: any) => setRankBy(value)}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="date">Most Recent</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        )}

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {filters.channelId && (
              <Badge variant="secondary" className="gap-1">
                <Hash className="h-3 w-3" />
                {filters.channelId}
                <button
                  onClick={() => clearFilter("channelId")}
                  className="ml-1 rounded-sm hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.userId && (
              <Badge variant="secondary" className="gap-1">
                <User className="h-3 w-3" />
                {filters.userId}
                <button
                  onClick={() => clearFilter("userId")}
                  className="ml-1 rounded-sm hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.hasThread !== undefined && (
              <Badge variant="secondary" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                Has Thread: {filters.hasThread ? "Yes" : "No"}
                <button
                  onClick={() => clearFilter("hasThread")}
                  className="ml-1 rounded-sm hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <Badge variant="secondary" className="gap-1">
                <Calendar className="h-3 w-3" />
                Date Filter
                <button
                  onClick={() => {
                    clearFilter("dateFrom");
                    clearFilter("dateTo");
                  }}
                  className="ml-1 rounded-sm hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <Card className="absolute top-full z-50 mt-2 w-full shadow-lg">
          <CardContent className="p-0">
            <ScrollArea className="max-h-96" ref={resultsRef}>
              {results.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p>Searching...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8" />
                      <p>No results found</p>
                      <p className="text-sm">
                        Try different keywords or adjust filters
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {results.map((result, index) => (
                    <SearchResultItem
                      key={result.message.id}
                      result={result}
                      selected={selectedResult === index}
                      onClick={() => handleResultClick(result.message)}
                      data-result-index={index}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {results.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between p-2 text-xs text-muted-foreground">
                  <span>
                    {results.length} result{results.length > 1 ? "s" : ""} found
                  </span>
                  <span>
                    {isSemanticAvailable ? "Semantic search" : "Keyword search"}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  selected: boolean;
  onClick: () => void;
  "data-result-index": number;
}

function SearchResultItem({
  result,
  selected,
  onClick,
  "data-result-index": dataResultIndex,
}: SearchResultItemProps) {
  const { message, score, matchType, highlights, context } = result;

  return (
    <button
      className={cn(
        "hover:bg-muted/50 w-full p-4 text-left transition-colors",
        selected && "bg-muted",
      )}
      onClick={onClick}
      data-result-index={dataResultIndex}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium">
              {message.userName || "Unknown User"}
            </span>
            {message.channelName && (
              <>
                <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                <span className="truncate text-xs text-muted-foreground">
                  #{message.channelName}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Badge
              variant={matchType === "semantic" ? "default" : "secondary"}
              className="text-xs"
            >
              {matchType === "semantic" && (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              {Math.round(score * 100)}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(new Date(message.createdAt))}
            </span>
          </div>
        </div>

        {/* Context Before */}
        {context?.before && context.before.length > 0 && (
          <div className="text-muted-foreground/60 border-l-2 border-muted pl-2 text-xs italic">
            {context.before[context.before.length - 1].content.slice(0, 80)}
            {context.before[context.before.length - 1].content.length > 80 &&
              "..."}
          </div>
        )}

        {/* Main Content */}
        <div className="text-sm">
          {highlights && highlights.length > 0 ? (
            <div className="space-y-1">
              {highlights.map((highlight, index) => (
                <p key={index} className="line-clamp-2">
                  {highlight}
                </p>
              ))}
            </div>
          ) : (
            <p className="line-clamp-3">{message.content}</p>
          )}
        </div>

        {/* Context After */}
        {context?.after && context.after.length > 0 && (
          <div className="text-muted-foreground/60 border-l-2 border-muted pl-2 text-xs italic">
            {context.after[0].content.slice(0, 80)}
            {context.after[0].content.length > 80 && "..."}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {message.threadId && (
            <Badge variant="outline" className="h-5 text-xs">
              <MessageSquare className="mr-1 h-3 w-3" />
              Thread
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    }
    return `${hours}h ago`;
  }

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}
