"use client";

/**
 * DraftList - List all drafts
 *
 * Displays a filterable, sortable list of all drafts
 */

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { Search, Filter, SortDesc, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DraftCard } from "./DraftCard";
import { DraftEmpty, DraftSearchEmpty } from "./DraftEmpty";
import type {
  Draft,
  DraftContextType,
  DraftSortOptions,
} from "@/lib/drafts/draft-types";
import { useDrafts } from "@/hooks/useDrafts";

// ============================================================================
// Types
// ============================================================================

export interface DraftListProps {
  /** Context name resolver */
  contextNameResolver?: (type: DraftContextType, id: string) => string;
  /** Show search */
  showSearch?: boolean;
  /** Show filters */
  showFilters?: boolean;
  /** Show sort */
  showSort?: boolean;
  /** Show clear all button */
  showClearAll?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Max items to show (0 = all) */
  maxItems?: number;
  /** Called when draft is selected/clicked */
  onSelect?: (draft: Draft) => void;
  /** Called when draft is restored */
  onRestore?: (draft: Draft) => void;
  /** Called when draft is sent */
  onSend?: (draft: Draft) => void;
  /** Called when draft is deleted */
  onDelete?: (draft: Draft) => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Filter Types
// ============================================================================

type FilterContextType = "all" | DraftContextType;
type SortField = DraftSortOptions["field"];
type SortDirection = DraftSortOptions["direction"];

// ============================================================================
// Component
// ============================================================================

export function DraftList({
  contextNameResolver,
  showSearch = true,
  showFilters = true,
  showSort = true,
  showClearAll = true,
  compact = false,
  maxItems = 0,
  onSelect,
  onRestore,
  onSend,
  onDelete,
  className,
}: DraftListProps) {
  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterContextType>("all");
  const [filterHasAttachments, setFilterHasAttachments] = useState<
    boolean | undefined
  >(undefined);
  const [filterIsReply, setFilterIsReply] = useState<boolean | undefined>(
    undefined,
  );
  const [sortField, setSortField] = useState<SortField>("lastModified");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  // Get drafts from store
  const {
    drafts: allDrafts,
    channelDrafts,
    threadDrafts,
    dmDrafts,
    isLoading,
    deleteDraft,
    clearAll,
    hasDrafts,
  } = useDrafts();

  // Filter and sort drafts
  const filteredDrafts = useMemo(() => {
    let result = [...allDrafts];

    // Filter by context type
    if (filterType !== "all") {
      result = result.filter((d) => d.contextType === filterType);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((d) => d.content.toLowerCase().includes(term));
    }

    // Filter by attachments
    if (filterHasAttachments !== undefined) {
      result = result.filter((d) => {
        const hasAttachments =
          d.attachmentIds.length > 0 || (d.attachments?.length ?? 0) > 0;
        return filterHasAttachments ? hasAttachments : !hasAttachments;
      });
    }

    // Filter by reply
    if (filterIsReply !== undefined) {
      result = result.filter((d) =>
        filterIsReply
          ? d.replyToMessageId !== null
          : d.replyToMessageId === null,
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "lastModified":
          comparison = a.lastModified - b.lastModified;
          break;
        case "createdAt":
          comparison = a.createdAt - b.createdAt;
          break;
        case "contextName":
          comparison = a.contextKey.localeCompare(b.contextKey);
          break;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });

    // Limit
    if (maxItems > 0) {
      result = result.slice(0, maxItems);
    }

    return result;
  }, [
    allDrafts,
    filterType,
    searchTerm,
    filterHasAttachments,
    filterIsReply,
    sortField,
    sortDirection,
    maxItems,
  ]);

  // Handlers
  const handleSearchClear = useCallback(() => {
    setSearchTerm("");
  }, []);

  const handleDelete = useCallback(
    async (draft: Draft) => {
      await deleteDraft(draft.contextKey);
      onDelete?.(draft);
    },
    [deleteDraft, onDelete],
  );

  const handleClearAll = useCallback(async () => {
    await clearAll();
    setShowClearAllDialog(false);
  }, [clearAll]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setFilterType("all");
    setFilterHasAttachments(undefined);
    setFilterIsReply(undefined);
  }, []);

  // Check if any filters are active
  const hasActiveFilters =
    filterType !== "all" ||
    filterHasAttachments !== undefined ||
    filterIsReply !== undefined;

  // Get context name
  const getContextName = useCallback(
    (draft: Draft) => {
      if (contextNameResolver) {
        return contextNameResolver(draft.contextType, draft.contextId);
      }
      return draft.contextId;
    },
    [contextNameResolver],
  );

  // Counts for filter display
  const counts = {
    all: allDrafts.length,
    channel: channelDrafts.length,
    thread: threadDrafts.length,
    dm: dmDrafts.length,
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Empty state
  if (!hasDrafts) {
    return (
      <div className={className}>
        <DraftEmpty />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        {showSearch && (
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search drafts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSearchClear}
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="h-4 w-4" />
                Filter
                {hasActiveFilters && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Context type</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filterType === "all"}
                onCheckedChange={() => setFilterType("all")}
              >
                All ({counts.all})
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterType === "channel"}
                onCheckedChange={() => setFilterType("channel")}
              >
                Channels ({counts.channel})
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterType === "thread"}
                onCheckedChange={() => setFilterType("thread")}
              >
                Threads ({counts.thread})
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterType === "dm"}
                onCheckedChange={() => setFilterType("dm")}
              >
                Direct messages ({counts.dm})
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Options</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filterHasAttachments === true}
                onCheckedChange={(checked) =>
                  setFilterHasAttachments(checked ? true : undefined)
                }
              >
                Has attachments
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterIsReply === true}
                onCheckedChange={(checked) =>
                  setFilterIsReply(checked ? true : undefined)
                }
              >
                Is a reply
              </DropdownMenuCheckboxItem>

              {hasActiveFilters && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="w-full justify-start"
                  >
                    Reset filters
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Sort */}
        {showSort && (
          <Select
            value={`${sortField}:${sortDirection}`}
            onValueChange={(value) => {
              const [field, direction] = value.split(":") as [
                SortField,
                SortDirection,
              ];
              setSortField(field);
              setSortDirection(direction);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SortDesc className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastModified:desc">Newest first</SelectItem>
              <SelectItem value="lastModified:asc">Oldest first</SelectItem>
              <SelectItem value="createdAt:desc">Created (newest)</SelectItem>
              <SelectItem value="createdAt:asc">Created (oldest)</SelectItem>
              <SelectItem value="contextName:asc">Name (A-Z)</SelectItem>
              <SelectItem value="contextName:desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Clear all */}
        {showClearAll && hasDrafts && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClearAllDialog(true)}
            className="ml-auto text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Clear all
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {searchTerm || hasActiveFilters
          ? `${filteredDrafts.length} of ${allDrafts.length} drafts`
          : `${allDrafts.length} draft${allDrafts.length !== 1 ? "s" : ""}`}
      </div>

      {/* Draft list */}
      {filteredDrafts.length === 0 ? (
        searchTerm ? (
          <DraftSearchEmpty
            searchTerm={searchTerm}
            onClear={handleSearchClear}
          />
        ) : (
          <DraftEmpty
            title="No matching drafts"
            description="Try adjusting your filters"
            showTips={false}
            action={{
              label: "Reset filters",
              onClick: handleResetFilters,
            }}
          />
        )
      ) : (
        <div className={cn("space-y-3", compact && "space-y-2")}>
          {filteredDrafts.map((draft) => (
            <DraftCard
              key={draft.contextKey}
              draft={draft}
              contextName={getContextName(draft)}
              compact={compact}
              onClick={onSelect}
              onRestore={onRestore}
              onSend={onSend}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Clear all confirmation */}
      <AlertDialog
        open={showClearAllDialog}
        onOpenChange={setShowClearAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all drafts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {allDrafts.length} drafts. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DraftList;
