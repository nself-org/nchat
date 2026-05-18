"use client";

/**
 * SearchModal Component
 *
 * Main search modal with Cmd+K / Ctrl+K shortcut
 * Provides unified search interface for messages, files, users, and channels
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SearchFilters } from "./SearchFilters";
import { SearchResults } from "./SearchResults";
import { SavedSearches } from "./SavedSearches";
import { useSearch } from "@/hooks/use-search";
import { cn } from "@/lib/utils";

export interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "messages" | "files" | "users" | "channels"
  >("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    search,
    results,
    isLoading,
    error,
    filters,
    setFilters,
    saveSearch,
    loadSavedSearch,
  } = useSearch();

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Reset on close
      setQuery("");
      setShowFilters(false);
      setShowSaved(false);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) return;

    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeTab, filters]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    await search(query, {
      type: activeTab === "all" ? undefined : activeTab,
      ...filters,
    });
  }, [query, activeTab, filters, search]);

  const handleSaveSearch = async () => {
    const name = prompt("Enter a name for this search:");
    if (!name) return;

    await saveSearch(name, query, filters);
  };

  const handleLoadSavedSearch = (
    savedQuery: string,
    savedFilters: Record<string, unknown>,
  ) => {
    setQuery(savedQuery);
    setFilters(savedFilters);
    setShowSaved(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd+S / Ctrl+S to save search
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSaveSearch();
    }

    // Cmd+F / Ctrl+F to toggle filters
    if ((e.metaKey || e.ctrlKey) && e.key === "f") {
      e.preventDefault();
      setShowFilters(!showFilters);
    }

    // Escape to close modal
    if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-w-4xl flex-col p-0">
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Search</DialogTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSaved(!showSaved)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  showSaved
                    ? "text-primary-foreground bg-primary"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                Saved
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  showFilters
                    ? "text-primary-foreground bg-primary"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                Filters
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pt-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search messages, files, users, channels... (use from:, in:, has:, is:)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-10"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Tips */}
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium">Tips:</span> Use{" "}
            <code className="rounded bg-secondary px-1 py-0.5">
              from:username
            </code>{" "}
            <code className="rounded bg-secondary px-1 py-0.5">in:channel</code>{" "}
            <code className="rounded bg-secondary px-1 py-0.5">has:file</code>{" "}
            <code className="rounded bg-secondary px-1 py-0.5">is:pinned</code>{" "}
            |{" "}
            <kbd className="rounded bg-secondary px-1 py-0.5 text-xs">
              Cmd+S
            </kbd>{" "}
            to save |{" "}
            <kbd className="rounded bg-secondary px-1 py-0.5 text-xs">
              Cmd+F
            </kbd>{" "}
            for filters
          </div>
        </div>

        {/* Saved Searches */}
        {showSaved && (
          <div className="bg-secondary/50 border-b px-6 py-4">
            <SavedSearches onLoadSearch={handleLoadSavedSearch} />
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="bg-secondary/50 border-b px-6 py-4">
            <SearchFilters filters={filters} onChange={setFilters} />
          </div>
        )}

        {/* Search Type Tabs */}
        <div className="px-6 pt-4">
          <Tabs
            value={activeTab}
            onValueChange={(v: string) => setActiveTab(v as typeof activeTab)}
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All {results && `(${results.totals.total})`}
              </TabsTrigger>
              <TabsTrigger value="messages">
                Messages {results && `(${results.totals.messages})`}
              </TabsTrigger>
              <TabsTrigger value="files">
                Files {results && `(${results.totals.files})`}
              </TabsTrigger>
              <TabsTrigger value="users">
                Users {results && `(${results.totals.users})`}
              </TabsTrigger>
              <TabsTrigger value="channels">
                Channels {results && `(${results.totals.channels})`}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {error && (
            <div className="bg-destructive/10 mt-4 rounded-md p-4 text-sm text-destructive">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!query.trim() && !showSaved && (
            <div className="mt-8 text-center text-muted-foreground">
              <Search className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-lg font-medium">Search across everything</p>
              <p className="mt-2 text-sm">
                Find messages, files, users, and channels instantly
              </p>
            </div>
          )}

          {query.trim() && !isLoading && results && (
            <SearchResults
              results={results}
              query={query}
              type={activeTab}
              onClose={() => onOpenChange(false)}
            />
          )}

          {isLoading && query.trim() && (
            <div className="mt-8 text-center">
              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SearchModal;
