"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBookmarkFolders } from "@/lib/bookmarks/use-bookmarks";
import {
  useBookmarkStore,
  type BookmarkFolder,
} from "@/lib/bookmarks/bookmark-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface AddToFolderModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onMoved?: (folderId: string | null) => void;
}

// ============================================================================
// Icons
// ============================================================================

function FolderIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
      style={style}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
      />
    </svg>
  );
}

function FolderPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 12.75 6 6 9-13.5"
      />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18 18 6M6 6l12 12"
      />
    </svg>
  );
}

// ============================================================================
// Folder Option Component
// ============================================================================

interface FolderOptionProps {
  folder: BookmarkFolder;
  isSelected: boolean;
  onSelect: () => void;
}

function FolderOption({ folder, isSelected, onSelect }: FolderOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left transition-colors",
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <FolderIcon
          className="h-4 w-4 flex-shrink-0"
          style={folder.color ? { color: folder.color } : undefined}
        />
        <span className="truncate text-sm">{folder.name}</span>
        <span className="text-xs text-muted-foreground">
          ({folder.bookmark_count})
        </span>
      </div>
      {isSelected && (
        <CheckIcon className="h-4 w-4 flex-shrink-0 text-primary" />
      )}
    </button>
  );
}

// ============================================================================
// Add to Folder Modal Component
// ============================================================================

export function AddToFolderModal({
  open,
  onOpenChange,
  onMoved,
}: AddToFolderModalProps) {
  const {
    isAddToFolderModalOpen,
    selectedBookmarkForFolder,
    closeAddToFolderModal,
    getBookmarkById,
  } = useBookmarkStore();
  const { folders, createFolder, moveBookmarkToFolder } = useBookmarkFolders();

  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(
    null,
  );
  const [isCreatingFolder, setIsCreatingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [isMoving, setIsMoving] = React.useState(false);

  // Use either controlled or internal state
  const isOpen = open !== undefined ? open : isAddToFolderModalOpen;
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else if (!newOpen) {
      closeAddToFolderModal();
    }
  };

  // Get the current bookmark's folder
  const bookmark = selectedBookmarkForFolder
    ? getBookmarkById(selectedBookmarkForFolder)
    : null;

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedFolderId(bookmark?.folder_id ?? null);
      setIsCreatingFolder(false);
      setNewFolderName("");
    }
  }, [isOpen, bookmark?.folder_id]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const folder = await createFolder(newFolderName.trim());
      if (folder) {
        setSelectedFolderId(folder.id);
      }
      setIsCreatingFolder(false);
      setNewFolderName("");
    } catch (error) {
      logger.error("Failed to create folder:", error);
    }
  };

  const handleMove = async () => {
    if (!selectedBookmarkForFolder) return;

    try {
      setIsMoving(true);
      await moveBookmarkToFolder(selectedBookmarkForFolder, selectedFolderId);
      onMoved?.(selectedFolderId);
      handleOpenChange(false);
    } catch (error) {
      logger.error("Failed to move bookmark:", error);
    } finally {
      setIsMoving(false);
    }
  };

  const handleRemoveFromFolder = async () => {
    if (!selectedBookmarkForFolder) return;

    try {
      setIsMoving(true);
      await moveBookmarkToFolder(selectedBookmarkForFolder, null);
      onMoved?.(null);
      handleOpenChange(false);
    } catch (error) {
      logger.error("Failed to remove from folder:", error);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
          <DialogDescription>
            Choose a folder to organize this saved item.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isCreatingFolder ? (
            <div className="space-y-3">
              <Label htmlFor="new-folder-name">New Folder Name</Label>
              <div className="flex gap-2">
                <Input
                  id="new-folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateFolder();
                    } else if (e.key === "Escape") {
                      setIsCreatingFolder(false);
                      setNewFolderName("");
                    }
                  }}
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- Intentional focus when user initiates folder creation
                  autoFocus
                />
                <Button
                  size="icon"
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName("");
                  }}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1 pr-4">
                {/* No Folder Option */}
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left transition-colors",
                    selectedFolderId === null
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FolderIcon className="h-4 w-4" />
                    <span className="text-sm">No folder (uncategorized)</span>
                  </div>
                  {selectedFolderId === null && (
                    <CheckIcon className="h-4 w-4 flex-shrink-0 text-primary" />
                  )}
                </button>

                {/* Existing Folders */}
                {folders.map((folder) => (
                  <FolderOption
                    key={folder.id}
                    folder={folder}
                    isSelected={selectedFolderId === folder.id}
                    onSelect={() => setSelectedFolderId(folder.id)}
                  />
                ))}

                {/* Create New Folder Button */}
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <FolderPlusIcon className="h-4 w-4" />
                  <span className="text-sm">Create new folder</span>
                </button>
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {bookmark?.folder_id && (
            <Button
              variant="outline"
              onClick={handleRemoveFromFolder}
              disabled={isMoving || isCreatingFolder}
              className="mr-auto"
            >
              Remove from folder
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={
              isMoving ||
              isCreatingFolder ||
              selectedFolderId === bookmark?.folder_id
            }
          >
            {isMoving ? "Moving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddToFolderModal;
