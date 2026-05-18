"use client";

import * as React from "react";
import {
  Folder,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SavedCollection } from "@/lib/saved";

export interface CollectionListProps {
  /** List of collections */
  collections: SavedCollection[];
  /** Currently selected collection ID */
  selectedId?: string | null;
  /** Callback when collection is selected */
  onSelect: (collectionId: string | null) => void;
  /** Callback to create new collection */
  onCreate?: () => void;
  /** Callback to edit collection */
  onEdit?: (collection: SavedCollection) => void;
  /** Callback to delete collection */
  onDelete?: (collection: SavedCollection) => void;
  /** Callback to share collection */
  onShare?: (collection: SavedCollection) => void;
  /** Show uncategorized option */
  showUncategorized?: boolean;
  /** Uncategorized count */
  uncategorizedCount?: number;
  /** Compact mode */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * List of saved message collections.
 */
export function CollectionList({
  collections,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onShare,
  showUncategorized = true,
  uncategorizedCount = 0,
  compact = false,
  className,
}: CollectionListProps) {
  const sortedCollections = React.useMemo(() => {
    return [...collections].sort((a, b) => a.position - b.position);
  }, [collections]);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-medium">Collections</span>
        {onCreate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCreate}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Create collection</span>
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className={cn("space-y-1", compact ? "p-1" : "p-2")}>
          {/* All saved */}
          <CollectionItem
            name="All Saved"
            icon="bookmark"
            count={
              collections.reduce((sum, c) => sum + c.itemCount, 0) +
              uncategorizedCount
            }
            isSelected={selectedId === undefined}
            onClick={() => onSelect(null)}
            compact={compact}
          />

          {/* Uncategorized */}
          {showUncategorized && (
            <CollectionItem
              name="Uncategorized"
              icon="inbox"
              count={uncategorizedCount}
              isSelected={selectedId === null}
              onClick={() => onSelect(null)}
              compact={compact}
            />
          )}

          {/* Collections */}
          {sortedCollections.map((collection) => (
            <CollectionItem
              key={collection.id}
              name={collection.name}
              icon={collection.icon}
              color={collection.color}
              count={collection.itemCount}
              isSelected={selectedId === collection.id}
              isShared={collection.isShared}
              onClick={() => onSelect(collection.id)}
              onEdit={onEdit ? () => onEdit(collection) : undefined}
              onDelete={onDelete ? () => onDelete(collection) : undefined}
              onShare={onShare ? () => onShare(collection) : undefined}
              compact={compact}
            />
          ))}

          {/* Empty state */}
          {collections.length === 0 && (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No collections yet
              </p>
              {onCreate && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs"
                  onClick={onCreate}
                >
                  Create your first collection
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Collection Item Component
// ============================================================================

interface CollectionItemProps {
  name: string;
  icon?: string;
  color?: string;
  count: number;
  isSelected: boolean;
  isShared?: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  compact?: boolean;
}

function CollectionItem({
  name,
  icon,
  color,
  count,
  isSelected,
  isShared,
  onClick,
  onEdit,
  onDelete,
  onShare,
  compact = false,
}: CollectionItemProps) {
  const hasMenu = onEdit || onDelete || onShare;

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-md transition-colors",
        compact ? "px-2 py-1" : "px-3 py-2",
        isSelected ? "text-accent-foreground bg-accent" : "hover:bg-muted/50",
      )}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded",
          compact ? "h-5 w-5" : "h-6 w-6",
        )}
        style={color ? { backgroundColor: color + "20", color } : undefined}
      >
        <Folder className={compact ? "h-3 w-3" : "h-4 w-4"} />
      </div>

      <span className={cn("flex-1 truncate", compact ? "text-xs" : "text-sm")}>
        {name}
      </span>

      <div className="flex items-center gap-1">
        {isShared && <Share2 className="h-3 w-3 text-muted-foreground" />}
        <Badge
          variant="secondary"
          className={cn(
            "text-xs",
            compact ? "h-4 min-w-[1rem] px-1" : "h-5 min-w-[1.25rem] px-1.5",
          )}
        >
          {count}
        </Badge>

        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "opacity-0 transition-opacity group-hover:opacity-100",
                  compact ? "h-5 w-5" : "h-6 w-6",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className={compact ? "h-3 w-3" : "h-4 w-4"} />
                <span className="sr-only">Collection options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit collection
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share collection
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete collection
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
