"use client";

/**
 * GlobalSearch Component
 *
 * A command palette style search component (Cmd+K) that provides fast,
 * full-text search across messages, files, users, and channels using MeiliSearch.
 *
 * Features:
 * - Keyboard shortcut activation (Cmd/Ctrl+K)
 * - Real-time search suggestions
 * - Faceted search with type filtering
 * - Highlighted search results
 * - Recent searches
 * - Keyboard navigation
 *
 * @module components/search/global-search
 */

import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Command } from "cmdk";
import {
  Search,
  X,
  MessageSquare,
  FileText,
  User,
  Hash,
  Clock,
  ArrowRight,
  Loader2,
  Filter,
  Lock,
  Paperclip,
  Link,
  Image,
  Pin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useSearchSuggestions,
  saveRecentSearch,
  type SearchSuggestion,
} from "@/hooks/use-search-suggestions";

// ============================================================================
// Types
// ============================================================================

export interface GlobalSearchProps {
  /** Whether the search is open */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Callback when a result is selected */
  onSelect?: (result: SearchResultItem) => void;
  /** Callback when navigating to a message */
  onNavigateToMessage?: (messageId: string, channelId: string) => void;
  /** Callback when navigating to a channel */
  onNavigateToChannel?: (channelId: string) => void;
  /** Callback when navigating to a user */
  onNavigateToUser?: (userId: string) => void;
  /** Callback when navigating to a file */
  onNavigateToFile?: (fileId: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class names */
  className?: string;
}

export interface SearchResultItem {
  id: string;
  type: "message" | "file" | "user" | "channel";
  title: string;
  subtitle?: string;
  content?: string;
  highlight?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
  channelId?: string;
  channelName?: string;
  userId?: string;
  userName?: string;
  avatarUrl?: string;
}

type SearchType = "all" | "messages" | "files" | "users" | "channels";

interface SearchState {
  query: string;
  type: SearchType;
  results: SearchResultItem[];
  isLoading: boolean;
  error: string | null;
  facets: {
    messages: number;
    files: number;
    users: number;
    channels: number;
  };
}

// ============================================================================
// Constants
// ============================================================================

const SEARCH_TYPES: {
  value: SearchType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "all", label: "All", icon: <Search className="h-4 w-4" /> },
  {
    value: "messages",
    label: "Messages",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  { value: "files", label: "Files", icon: <FileText className="h-4 w-4" /> },
  { value: "users", label: "People", icon: <User className="h-4 w-4" /> },
  { value: "channels", label: "Channels", icon: <Hash className="h-4 w-4" /> },
];

const OPERATOR_HINTS = [
  { text: "from:username", description: "Filter by sender" },
  { text: "in:channel", description: "Filter by channel" },
  { text: "has:link", description: "With links" },
  { text: "has:file", description: "With files" },
  { text: "has:image", description: "With images" },
  { text: "is:pinned", description: "Pinned only" },
  { text: "before:YYYY-MM-DD", description: "Before date" },
  { text: "after:YYYY-MM-DD", description: "After date" },
];

// ============================================================================
// Helper Components
// ============================================================================

function TypeIcon({ type }: { type: SearchResultItem["type"] }) {
  switch (type) {
    case "message":
      return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    case "file":
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    case "user":
      return <User className="h-4 w-4 text-muted-foreground" />;
    case "channel":
      return <Hash className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Search className="h-4 w-4 text-muted-foreground" />;
  }
}

function HighlightedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  // Parse HTML highlight tags
  const parts = text.split(/(<mark>.*?<\/mark>)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("<mark>") && part.endsWith("</mark>")) {
          const content = part.slice(6, -7);
          return (
            <mark
              key={i}
              className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-900/50"
            >
              {content}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function ResultItem({
  result,
  isSelected,
  onSelect,
}: {
  result: SearchResultItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={result.id}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-start gap-3 px-4 py-3",
        "data-[selected=true]:bg-accent",
        "hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent",
      )}
    >
      {result.type === "user" && result.avatarUrl ? (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={result.avatarUrl} alt={result.title} />
          <AvatarFallback>
            {result.title.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <TypeIcon type={result.type} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{result.title}</span>
          {result.type === "channel" &&
            result.metadata &&
            typeof result.metadata === "object" &&
            "isPrivate" in result.metadata &&
            (result.metadata as unknown as { isPrivate?: boolean })
              .isPrivate && (
              <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
        </div>

        {result.subtitle && (
          <div className="truncate text-xs text-muted-foreground">
            {result.subtitle}
          </div>
        )}

        {result.highlight && (
          <HighlightedText
            text={result.highlight}
            className="mt-1 line-clamp-2 text-sm text-muted-foreground"
          />
        )}

        {result.channelName && result.type === "message" && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Hash className="h-3 w-3" />
            <span>{result.channelName}</span>
            {result.timestamp && (
              <>
                <span className="mx-1">·</span>
                <span>{result.timestamp}</span>
              </>
            )}
          </div>
        )}
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100" />
    </Command.Item>
  );
}

function EmptyState({ query, type }: { query: string; type: SearchType }) {
  return (
    <div className="py-12 text-center">
      <Search className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
      <p className="text-sm text-muted-foreground">
        {query ? (
          <>No results found for &quot;{query}&quot;</>
        ) : (
          <>Start typing to search</>
        )}
      </p>
      {!query && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {OPERATOR_HINTS.slice(0, 4).map((hint) => (
            <Badge key={hint.text} variant="secondary" className="text-xs">
              {hint.text}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentSearches({ onSelect }: { onSelect: (query: string) => void }) {
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("nchat_recent_searches");
      if (stored) {
        const recent = JSON.parse(stored) as Array<{ query: string }>;
        setRecentSearches(recent.slice(0, 5).map((r) => r.query));
      }
    } catch {
      // Ignore
    }
  }, []);

  if (recentSearches.length === 0) return null;

  return (
    <Command.Group heading="Recent Searches">
      {recentSearches.map((query, index) => (
        <Command.Item
          key={`recent-${index}`}
          value={`recent-${query}`}
          onSelect={() => onSelect(query)}
          className="flex cursor-pointer items-center gap-2 px-4 py-2 data-[selected=true]:bg-accent"
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{query}</span>
        </Command.Item>
      ))}
    </Command.Group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GlobalSearch({
  open: controlledOpen,
  onOpenChange,
  onSelect,
  onNavigateToMessage,
  onNavigateToChannel,
  onNavigateToUser,
  onNavigateToFile,
  placeholder = "Search messages, files, people, channels...",
  className,
}: GlobalSearchProps) {
  const [isOpen, setIsOpen] = React.useState(controlledOpen ?? false);
  const [state, setState] = React.useState<SearchState>({
    query: "",
    type: "all",
    results: [],
    isLoading: false,
    error: null,
    facets: { messages: 0, files: 0, users: 0, channels: 0 },
  });

  const inputRef = React.useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(state.query, 200);

  // Sync controlled state
  React.useEffect(() => {
    if (controlledOpen !== undefined) {
      setIsOpen(controlledOpen);
    }
  }, [controlledOpen]);

  // Keyboard shortcut
  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      const newOpen = !isOpen;
      setIsOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    { enableOnFormTags: true },
  );

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setState((s) => ({ ...s, query: "", results: [], error: null }));
    }
  }, [isOpen]);

  // Search effect
  React.useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setState((s) => ({ ...s, results: [], isLoading: false, error: null }));
      return;
    }

    const search = async () => {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      try {
        const types = state.type === "all" ? undefined : [state.type];
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: debouncedQuery,
            types,
            limit: 20,
          }),
        });

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();

        if (data.success && data.results) {
          const results: SearchResultItem[] = data.results.map((item: any) => ({
            id: item.id,
            type:
              item.type === "messages"
                ? "message"
                : item.type === "files"
                  ? "file"
                  : item.type === "users"
                    ? "user"
                    : "channel",
            title: item.title,
            subtitle:
              item.type === "users"
                ? `@${item.metadata?.username}`
                : item.type === "channels"
                  ? item.content
                  : undefined,
            content: item.content,
            highlight: item.highlight || item.snippet,
            metadata: item.metadata,
            timestamp: item.createdAt
              ? new Date(item.createdAt).toLocaleDateString()
              : undefined,
            channelId: item.channelId,
            channelName: item.channelName,
            userId: item.userId,
            userName: item.userName,
            avatarUrl: item.avatarUrl,
          }));

          setState((s) => ({
            ...s,
            results,
            isLoading: false,
            facets: data.totals || {
              messages: 0,
              files: 0,
              users: 0,
              channels: 0,
            },
          }));
        } else {
          throw new Error(data.error || "Search failed");
        }
      } catch (error) {
        setState((s) => ({
          ...s,
          results: [],
          isLoading: false,
          error: error instanceof Error ? error.message : "Search failed",
        }));
      }
    };

    search();
  }, [debouncedQuery, state.type]);

  // Handle result selection
  const handleSelect = (result: SearchResultItem) => {
    saveRecentSearch(state.query);

    onSelect?.(result);

    switch (result.type) {
      case "message":
        if (result.id && result.channelId) {
          onNavigateToMessage?.(result.id, result.channelId);
        }
        break;
      case "channel":
        onNavigateToChannel?.(result.id);
        break;
      case "user":
        onNavigateToUser?.(result.id);
        break;
      case "file":
        onNavigateToFile?.(result.id);
        break;
    }

    setIsOpen(false);
    onOpenChange?.(false);
  };

  // Handle dialog open change
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "max-w-2xl gap-0 overflow-hidden p-0",
          "[&>button]:hidden", // Hide the default close button
          className,
        )}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>

        <Command className="rounded-lg border-0" shouldFilter={false} loop>
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              ref={inputRef}
              value={state.query}
              onValueChange={(value) =>
                setState((s) => ({ ...s, query: value }))
              }
              placeholder={placeholder}
              className="flex h-12 w-full rounded-md bg-transparent px-2 py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            {state.isLoading && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            )}
            {state.query && !state.isLoading && (
              <button
                onClick={() =>
                  setState((s) => ({ ...s, query: "", results: [] }))
                }
                className="rounded p-1 hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Type Filters */}
          <div className="bg-muted/50 flex items-center gap-1 border-b px-3 py-2">
            {SEARCH_TYPES.map((searchType) => (
              <button
                key={searchType.value}
                onClick={() =>
                  setState((s) => ({ ...s, type: searchType.value }))
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  state.type === searchType.value
                    ? "text-primary-foreground bg-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {searchType.icon}
                <span>{searchType.label}</span>
                {state.query &&
                  searchType.value !== "all" &&
                  state.facets[searchType.value as keyof typeof state.facets] >
                    0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {
                        state.facets[
                          searchType.value as keyof typeof state.facets
                        ]
                      }
                    </Badge>
                  )}
              </button>
            ))}
          </div>

          {/* Results */}
          <Command.List className="max-h-[400px] overflow-y-auto">
            {state.error && (
              <div className="py-6 text-center text-sm text-destructive">
                {state.error}
              </div>
            )}

            {!state.query && !state.isLoading && (
              <RecentSearches
                onSelect={(query) => setState((s) => ({ ...s, query }))}
              />
            )}

            {state.query &&
              state.results.length === 0 &&
              !state.isLoading &&
              !state.error && (
                <EmptyState query={state.query} type={state.type} />
              )}

            {state.results.length > 0 && (
              <Command.Group>
                {state.results.map((result) => (
                  <ResultItem
                    key={result.id}
                    result={result}
                    isSelected={false}
                    onSelect={() => handleSelect(result)}
                  />
                ))}
              </Command.Group>
            )}

            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {state.isLoading ? "Searching..." : "No results found."}
            </Command.Empty>
          </Command.List>

          {/* Footer */}
          <div className="bg-muted/50 flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  {typeof navigator !== "undefined" &&
                  /Mac/.test(navigator.platform)
                    ? "⌘"
                    : "Ctrl"}
                </kbd>
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  K
                </kbd>
                <span className="ml-1">to search</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  ↑↓
                </kbd>
                <span className="ml-1">navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  ↵
                </kbd>
                <span className="ml-1">select</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                Esc
              </kbd>
              <span className="ml-1">close</span>
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Hook for using GlobalSearch
// ============================================================================

export function useGlobalSearch() {
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

export default GlobalSearch;
