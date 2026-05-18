"use client";

import * as React from "react";
import {
  Folder,
  Plus,
  Pencil,
  Trash2,
  Share2,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SavedCollection } from "@/lib/saved";

export interface SavedCollectionsProps {
  /** List of collections */
  collections: SavedCollection[];
  /** Callback when collection is clicked */
  onSelect: (collection: SavedCollection) => void;
  /** Callback to create new collection */
  onCreate?: () => void;
  /** Callback to edit collection */
  onEdit?: (collection: SavedCollection) => void;
  /** Callback to delete collection */
  onDelete?: (collection: SavedCollection) => void;
  /** Callback to share collection */
  onShare?: (collection: SavedCollection) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Grid view of saved message collections.
 */
export function SavedCollections({
  collections,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onShare,
  isLoading = false,
  className,
}: SavedCollectionsProps) {
  const sortedCollections = React.useMemo(() => {
    return [...collections].sort((a, b) => a.position - b.position);
  }, [collections]);

  if (isLoading) {
    return (
      <div
        className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-3 w-full rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Collections</h2>
          <p className="text-sm text-muted-foreground">
            {collections.length} collection{collections.length !== 1 ? "s" : ""}
          </p>
        </div>
        {onCreate && (
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Collection
          </Button>
        )}
      </div>

      {/* Grid */}
      {collections.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <Folder className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 font-medium">No collections yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create collections to organize your saved messages.
            </p>
            {onCreate && (
              <Button onClick={onCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first collection
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedCollections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onSelect={() => onSelect(collection)}
              onEdit={onEdit ? () => onEdit(collection) : undefined}
              onDelete={onDelete ? () => onDelete(collection) : undefined}
              onShare={onShare ? () => onShare(collection) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Collection Card Component
// ============================================================================

interface CollectionCardProps {
  collection: SavedCollection;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
}

function CollectionCard({
  collection,
  onSelect,
  onEdit,
  onDelete,
  onShare,
}: CollectionCardProps) {
  const hasMenu = onEdit || onDelete || onShare;

  return (
    <Card
      className="hover:bg-muted/30 group cursor-pointer transition-colors"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={
                collection.color
                  ? {
                      backgroundColor: collection.color + "20",
                      color: collection.color,
                    }
                  : undefined
              }
            >
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                {collection.name}
                {collection.isShared && (
                  <Share2 className="h-3 w-3 text-muted-foreground" />
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {collection.itemCount} item
                {collection.itemCount !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>

          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onShare && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare();
                    }}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      {collection.description && (
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {collection.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
