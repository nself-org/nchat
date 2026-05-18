"use client";

import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  MessageSquare,
  FileIcon,
  Users,
  Hash,
  Filter,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/stores/ui-store";
import {
  useSearchStore,
  type SearchTab,
  type MessageSearchResult,
  type FileSearchResult,
  type UserSearchResult,
  type ChannelSearchResult,
  selectHasActiveFilters,
  selectActiveFilterCount,
} from "@/stores/search-store";
import { SearchInput } from "./search-input";
import { SearchFilters } from "./search-filters";
import { SearchResults, GroupedSearchResults } from "./search-results";
import { SearchSuggestions, type QuickAction } from "./search-suggestions";
import { CompactAdvancedSearch } from "./advanced-search";

// ============================================================================
// Types
// ============================================================================

export interface SearchModalProps {
  /** Whether the modal is open (controlled) */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Callback to perform search */
  onSearch?: (query: string) => void;
  /** Callback when a message result is clicked */
  onMessageClick?: (result: MessageSearchResult) => void;
  /** Callback when jump to message is clicked */
  onJumpToMessage?: (result: MessageSearchResult) => void;
  /** Callback when a file result is clicked */
  onFileClick?: (result: FileSearchResult) => void;
  /** Callback when file download is clicked */
  onFileDownload?: (result: FileSearchResult) => void;
  /** Callback when a user result is clicked */
  onUserClick?: (result: UserSearchResult) => void;
  /** Callback when message user is clicked */
  onMessageUser?: (result: UserSearchResult) => void;
  /** Callback when a channel result is clicked */
  onChannelClick?: (result: ChannelSearchResult) => void;
  /** Callback when join channel is clicked */
  onJoinChannel?: (result: ChannelSearchResult) => void;
  /** Callback when open channel is clicked */
  onOpenChannel?: (result: ChannelSearchResult) => void;
  /** Callback to load more results */
  onLoadMore?: () => void;
  /** User lookup function */
  getUserName?: (userId: string) => string;
  /** Channel lookup function */
  getChannelName?: (channelId: string) => string;
  /** Callback to open user picker */
  onSelectUser?: () => void;
  /** Callback to open channel picker */
  onSelectChannel?: () => void;
  /** Callback to open date picker */
  onSelectDateRange?: () => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Tab Configuration
// ============================================================================

const tabs: { value: SearchTab; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Search },
  { value: "messages", label: "Messages", icon: MessageSquare },
  { value: "files", label: "Files", icon: FileIcon },
  { value: "people", label: "People", icon: Users },
  { value: "channels", label: "Channels", icon: Hash },
];

// ============================================================================
// Main Component
// ============================================================================

export function SearchModal({
  open: controlledOpen,
  onOpenChange,
  onSearch,
  onMessageClick,
  onJumpToMessage,
  onFileClick,
  onFileDownload,
  onUserClick,
  onMessageUser,
  onChannelClick,
  onJoinChannel,
  onOpenChannel,
  onLoadMore,
  getUserName,
  getChannelName,
  onSelectUser,
  onSelectChannel,
  onSelectDateRange,
  className,
}: SearchModalProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Use controlled or UI store state
  const searchOpen = useUIStore((state) => state.searchOpen);
  const setSearchOpen = useUIStore((state) => state.setSearchOpen);

  const isOpen = controlledOpen ?? searchOpen;
  const setIsOpen = onOpenChange ?? setSearchOpen;

  // Search store state
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);
  const debouncedQuery = useSearchStore((state) => state.debouncedQuery);
  const setDebouncedQuery = useSearchStore((state) => state.setDebouncedQuery);
  const activeTab = useSearchStore((state) => state.activeTab);
  const setActiveTab = useSearchStore((state) => state.setActiveTab);
  const isSearching = useSearchStore((state) => state.isSearching);
  const results = useSearchStore((state) => state.results);
  const showFilters = useSearchStore((state) => state.showFilters);
  const toggleFilters = useSearchStore((state) => state.toggleFilters);
  const showAdvanced = useSearchStore((state) => state.showAdvanced);
  const toggleAdvanced = useSearchStore((state) => state.toggleAdvanced);
  const hasActiveFilters = useSearchStore(selectHasActiveFilters);
  const activeFilterCount = useSearchStore(selectActiveFilterCount);
  const addRecentSearch = useSearchStore((state) => state.addRecentSearch);
  const filters = useSearchStore((state) => state.filters);

  // Debounce query
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (query !== debouncedQuery) {
        setDebouncedQuery(query);
        if (query.trim()) {
          onSearch?.(query);
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debouncedQuery, onSearch, setDebouncedQuery]);

  // Keyboard shortcuts
  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      setIsOpen(!isOpen);
    },
    { enableOnFormTags: true },
  );

  useHotkeys(
    "mod+shift+k",
    (e) => {
      e.preventDefault();
      setIsOpen(true);
      setTimeout(() => toggleFilters(), 100);
    },
    { enableOnFormTags: true },
  );

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Handle close
  const handleClose = () => {
    setIsOpen(false);
  };

  // Handle search submit
  const handleSearchSubmit = () => {
    if (query.trim()) {
      addRecentSearch(query, filters);
      onSearch?.(query);
    }
  };

  // Handle suggestion select
  const handleSuggestionSelect = (
    selectedQuery: string,
    selectedFilters?: Partial<
      ReturnType<typeof useSearchStore.getState>["filters"]
    >,
  ) => {
    setQuery(selectedQuery);
    if (selectedFilters) {
      // Apply filters would be handled by the parent
    }
    if (selectedQuery) {
      onSearch?.(selectedQuery);
    }
  };

  // Handle quick action
  const handleQuickAction = (action: QuickAction) => {
    switch (action) {
      case "search-messages":
        setActiveTab("messages");
        break;
      case "search-files":
        setActiveTab("files");
        break;
      case "search-people":
        setActiveTab("people");
        break;
      case "search-channels":
        setActiveTab("channels");
        break;
    }
  };

  if (!isOpen) return null;

  const hasResults = results.length > 0;
  const showSuggestions = !query && !hasResults;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-background/80 absolute inset-0 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "absolute left-1/2 top-[10%] w-full max-w-2xl -translate-x-1/2",
            "flex max-h-[80vh] flex-col",
            "rounded-xl border bg-popover shadow-2xl",
            className,
          )}
        >
          {/* Header */}
          <div className="flex flex-col border-b">
            {/* Search input row */}
            <div className="flex items-center gap-2 p-3">
              <SearchInput
                ref={inputRef}
                value={query}
                onChange={setQuery}
                onSubmit={handleSearchSubmit}
                isLoading={isSearching}
                placeholder="Search messages, files, people, channels..."
                shortcutHint="ESC to close"
                size="lg"
                autoFocus // eslint-disable-line jsx-a11y/no-autofocus
                className="flex-1"
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-10 w-10 shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between px-3 pb-2">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as SearchTab)}
              >
                <TabsList className="h-8">
                  {tabs.map(({ value, label, icon: Icon }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="h-7 gap-1.5 px-2 text-xs"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <Button
                variant={hasActiveFilters ? "secondary" : "ghost"}
                size="sm"
                onClick={toggleFilters}
                className={cn(
                  "h-8 gap-1.5 px-2",
                  hasActiveFilters && "border-primary/50",
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="text-primary-foreground rounded-full bg-primary px-1.5 text-xs">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Filters panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden border-t"
                >
                  <div className="p-3">
                    <SearchFilters
                      onSelectUser={onSelectUser}
                      onSelectChannel={onSelectChannel}
                      onSelectDateRange={onSelectDateRange}
                      getUserName={getUserName}
                      getChannelName={getChannelName}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Advanced search toggle */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden border-t"
                >
                  <CompactAdvancedSearch
                    expanded={true}
                    onSearch={handleSearchSubmit}
                    getUserName={getUserName}
                    getChannelName={getChannelName}
                    onSelectUser={onSelectUser}
                    onSelectChannel={onSelectChannel}
                    onSelectDateRange={onSelectDateRange}
                    className="p-3"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {showSuggestions ? (
              <SearchSuggestions
                onSelect={handleSuggestionSelect}
                onQuickAction={handleQuickAction}
                maxHeight="calc(80vh - 200px)"
              />
            ) : activeTab === "all" ? (
              <GroupedSearchResults
                onMessageClick={onMessageClick}
                onJumpToMessage={onJumpToMessage}
                onFileClick={onFileClick}
                onFileDownload={onFileDownload}
                onUserClick={onUserClick}
                onMessageUser={onMessageUser}
                onChannelClick={onChannelClick}
                onJoinChannel={onJoinChannel}
                onOpenChannel={onOpenChannel}
                className="p-4"
              />
            ) : (
              <SearchResults
                onMessageClick={onMessageClick}
                onJumpToMessage={onJumpToMessage}
                onFileClick={onFileClick}
                onFileDownload={onFileDownload}
                onUserClick={onUserClick}
                onMessageUser={onMessageUser}
                onChannelClick={onChannelClick}
                onJoinChannel={onJoinChannel}
                onOpenChannel={onOpenChannel}
                onLoadMore={onLoadMore}
                maxHeight="calc(80vh - 200px)"
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1">&#8593;</kbd>
                <kbd className="rounded border bg-muted px-1">&#8595;</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1">&#8629;</kbd>
                to select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1.5">tab</kbd>
                to switch tabs
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAdvanced}
              className="h-6 px-2 text-xs"
            >
              {showAdvanced ? "Hide" : "Show"} advanced
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ============================================================================
// Search Trigger Button
// ============================================================================

export interface SearchTriggerProps {
  onClick?: () => void;
  className?: string;
  variant?: "default" | "compact" | "icon";
}

export function SearchTrigger({
  onClick,
  className,
  variant = "default",
}: SearchTriggerProps) {
  const setSearchOpen = useUIStore((state) => state.setSearchOpen);

  const handleClick = () => {
    setSearchOpen(true);
    onClick?.();
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className={cn("h-9 w-9", className)}
        title="Search (Cmd+K)"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={cn("h-8 gap-2 px-2", className)}
      >
        <Search className="h-4 w-4" />
        Search
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "bg-muted/50 flex h-9 w-full items-center gap-2 rounded-lg border px-3",
        "text-sm text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className="hidden rounded border bg-background px-1.5 font-mono text-xs sm:inline">
        &#8984;K
      </kbd>
    </button>
  );
}

// ============================================================================
// Hook for Search Modal
// ============================================================================

export function useSearchModal() {
  const isOpen = useUIStore((state) => state.searchOpen);
  const setOpen = useUIStore((state) => state.setSearchOpen);
  const toggle = useUIStore((state) => state.toggleSearch);

  return {
    isOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle,
  };
}

export default SearchModal;
