"use client";

/**
 * SavedSearches Component
 *
 * Displays and manages saved searches
 */

import React, { useEffect, useState } from "react";
import { Star, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

import { logger } from "@/lib/logger";

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  createdAt: string;
  lastUsedAt?: string;
  useCount: number;
}

export interface SavedSearchesProps {
  onLoadSearch?: (query: string, filters: Record<string, unknown>) => void;
  onSelect?: (search: SavedSearch) => void;
  onExport?: (searches: SavedSearch[]) => void;
  onImport?: (searches: SavedSearch[]) => void;
}

export function SavedSearches({
  onLoadSearch,
  onSelect,
  onExport,
  onImport,
}: SavedSearchesProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = () => {
    // In production, fetch from API
    // For now, use localStorage
    try {
      const saved = localStorage.getItem("saved_searches");
      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
    } catch (error) {
      logger.error("Error loading saved searches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSearch = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem("saved_searches", JSON.stringify(updated));
  };

  const handleLoadSearch = (search: SavedSearch) => {
    // Update last used
    const updated = savedSearches.map((s) =>
      s.id === search.id
        ? {
            ...s,
            lastUsedAt: new Date().toISOString(),
            useCount: s.useCount + 1,
          }
        : s,
    );
    setSavedSearches(updated);
    localStorage.setItem("saved_searches", JSON.stringify(updated));

    onLoadSearch?.(search.query, search.filters);
    onSelect?.(search);
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading saved searches...
      </div>
    );
  }

  if (savedSearches.length === 0) {
    return (
      <div className="py-8 text-center">
        <Star className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">No saved searches yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Press{" "}
          <kbd className="rounded bg-secondary px-1 py-0.5 text-xs">Cmd+S</kbd>{" "}
          to save a search
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Saved Searches</h3>

      <div className="max-h-[300px] space-y-2 overflow-y-auto">
        {savedSearches.map((search) => (
          <div
            key={search.id}
            className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
          >
            <Star className="h-4 w-4 flex-shrink-0 text-yellow-500" />

            <button
              onClick={() => handleLoadSearch(search)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="truncate text-sm font-medium">{search.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {search.query}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {search.lastUsedAt ? (
                  <span>
                    Used{" "}
                    {formatDistanceToNow(new Date(search.lastUsedAt), {
                      addSuffix: true,
                    })}
                  </span>
                ) : (
                  <span>
                    Created{" "}
                    {formatDistanceToNow(new Date(search.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
                <span>•</span>
                <span>{search.useCount} uses</span>
              </div>
            </button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSearch(search.id);
              }}
              className="h-auto p-2"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SavedSearches;
