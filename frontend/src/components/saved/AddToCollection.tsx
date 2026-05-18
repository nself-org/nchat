"use client";

import * as React from "react";
import { Check, Plus, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SavedCollection } from "@/lib/saved";

export interface AddToCollectionProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;
  /** Available collections */
  collections: SavedCollection[];
  /** Currently selected collection IDs */
  selectedIds: string[];
  /** Callback when selection changes */
  onSelectionChange: (ids: string[]) => void;
  /** Callback when save is clicked */
  onSave: () => void;
  /** Callback to create new collection */
  onCreateCollection?: () => void;
  /** Whether save is in progress */
  isLoading?: boolean;
}

/**
 * Dialog for adding a saved message to collections.
 */
export function AddToCollection({
  open,
  onOpenChange,
  collections,
  selectedIds,
  onSelectionChange,
  onSave,
  onCreateCollection,
  isLoading = false,
}: AddToCollectionProps) {
  const toggleCollection = (collectionId: string) => {
    if (selectedIds.includes(collectionId)) {
      onSelectionChange(selectedIds.filter((id) => id !== collectionId));
    } else {
      onSelectionChange([...selectedIds, collectionId]);
    }
  };

  const sortedCollections = React.useMemo(() => {
    return [...collections].sort((a, b) => a.position - b.position);
  }, [collections]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
          <DialogDescription>
            Select collections to add this message to.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {collections.length === 0 ? (
            <div className="py-8 text-center">
              <Folder className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-sm text-muted-foreground">
                No collections yet. Create one to get started.
              </p>
              {onCreateCollection && (
                <Button onClick={onCreateCollection}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Collection
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1">
                {sortedCollections.map((collection) => {
                  const isSelected = selectedIds.includes(collection.id);

                  return (
                    <button
                      key={collection.id}
                      onClick={() => toggleCollection(collection.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted",
                      )}
                      disabled={isLoading}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded"
                        style={
                          collection.color
                            ? {
                                backgroundColor: collection.color + "20",
                                color: collection.color,
                              }
                            : undefined
                        }
                      >
                        <Folder className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {collection.name}
                        </p>
                        {collection.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {collection.description}
                          </p>
                        )}
                      </div>
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border",
                          isSelected
                            ? "text-primary-foreground border-primary bg-primary"
                            : "border-muted-foreground/30",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {collections.length > 0 && onCreateCollection && (
            <Button
              variant="ghost"
              className="mt-3 w-full"
              onClick={onCreateCollection}
              disabled={isLoading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create new collection
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
