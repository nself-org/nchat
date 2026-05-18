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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  useBookmarkFolders,
  useBookmarkFilters,
} from "@/lib/bookmarks/use-bookmarks";
import {
  useBookmarkStore,
  type BookmarkFolder,
} from "@/lib/bookmarks/bookmark-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface BookmarkFoldersProps {
  onFolderSelect?: (folderId: string | null) => void;
  className?: string;
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

function FolderOpenIcon({ className }: { className?: string }) {
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
        d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
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
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

function MoreVerticalIcon({ className }: { className?: string }) {
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
        d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
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
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
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
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
      />
    </svg>
  );
}

// ============================================================================
// Folder Colors
// ============================================================================

const FOLDER_COLORS = [
  { name: "Default", value: undefined },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
];

// ============================================================================
// Create/Edit Folder Dialog
// ============================================================================

interface FolderDialogProps {
  folder?: BookmarkFolder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, color?: string) => Promise<void>;
}

function FolderDialog({
  folder,
  open,
  onOpenChange,
  onSave,
}: FolderDialogProps) {
  const [name, setName] = React.useState(folder?.name ?? "");
  const [color, setColor] = React.useState<string | undefined>(folder?.color);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(folder?.name ?? "");
      setColor(folder?.color);
    }
  }, [open, folder]);

  const handleSave = async () => {
    if (!name.trim() || isSaving) return;

    try {
      setIsSaving(true);
      await onSave(name.trim(), color);
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to save folder:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{folder ? "Edit Folder" : "Create Folder"}</DialogTitle>
          <DialogDescription>
            {folder
              ? "Update the folder name and color."
              : "Create a new folder to organize your saved items."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all",
                    color === c.value
                      ? "ring-2 ring-primary ring-offset-2"
                      : "hover:scale-110",
                    !c.value && "border-border bg-muted",
                  )}
                  style={
                    c.value
                      ? { backgroundColor: c.value, borderColor: c.value }
                      : undefined
                  }
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? "Saving..." : folder ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Folder Item Component
// ============================================================================

interface FolderItemProps {
  folder: BookmarkFolder;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function FolderItem({
  folder,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: FolderItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors",
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent",
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <FolderIcon
          className={cn(
            "h-4 w-4 flex-shrink-0",
            folder.color && "text-current",
          )}
          style={folder.color ? { color: folder.color } : undefined}
        />
        <span className="truncate text-sm">{folder.name}</span>
        <span className="text-xs text-muted-foreground">
          ({folder.bookmark_count})
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVerticalIcon className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit folder
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-destructive focus:text-destructive"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Bookmark Folders Component
// ============================================================================

export function BookmarkFolders({
  onFolderSelect,
  className,
}: BookmarkFoldersProps) {
  const { folders, createFolder, updateFolder, deleteFolder } =
    useBookmarkFolders();
  const { selectedFolderId, setFolderFilter } = useBookmarkFilters();
  const { totalCount } = useBookmarkStore();
  const uncategorizedCount = useBookmarkStore(
    (state) =>
      Array.from(state.bookmarks.values()).filter((b) => !b.folder_id).length,
  );

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [editingFolder, setEditingFolder] =
    React.useState<BookmarkFolder | null>(null);
  const [deletingFolder, setDeletingFolder] =
    React.useState<BookmarkFolder | null>(null);

  const handleSelectFolder = (folderId: string | null) => {
    setFolderFilter(folderId);
    onFolderSelect?.(folderId);
  };

  const handleCreateFolder = async (name: string, color?: string) => {
    await createFolder(name, color);
  };

  const handleUpdateFolder = async (name: string, color?: string) => {
    if (!editingFolder) return;
    await updateFolder(editingFolder.id, { name, color });
    setEditingFolder(null);
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;
    await deleteFolder(deletingFolder.id);
    setDeletingFolder(null);
    // If the deleted folder was selected, clear the selection
    if (selectedFolderId === deletingFolder.id) {
      handleSelectFolder(null);
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      {/* All Bookmarks */}
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors",
          selectedFolderId === null
            ? "bg-primary/10 text-primary"
            : "hover:bg-accent",
        )}
        onClick={() => handleSelectFolder(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelectFolder(null);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <BookmarkIcon className="h-4 w-4" />
          <span className="text-sm font-medium">All Saved Items</span>
        </div>
        <span className="text-xs text-muted-foreground">({totalCount})</span>
      </div>

      {/* Uncategorized */}
      {uncategorizedCount > 0 && uncategorizedCount !== totalCount && (
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors",
            selectedFolderId === "uncategorized"
              ? "bg-primary/10 text-primary"
              : "hover:bg-accent",
          )}
          onClick={() => handleSelectFolder("uncategorized")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSelectFolder("uncategorized");
            }
          }}
        >
          <div className="flex items-center gap-2">
            <FolderOpenIcon className="h-4 w-4" />
            <span className="text-sm">Uncategorized</span>
          </div>
          <span className="text-xs text-muted-foreground">
            ({uncategorizedCount})
          </span>
        </div>
      )}

      {/* Folders */}
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          isSelected={selectedFolderId === folder.id}
          onSelect={() => handleSelectFolder(folder.id)}
          onEdit={() => setEditingFolder(folder)}
          onDelete={() => setDeletingFolder(folder)}
        />
      ))}

      {/* Create Folder Button */}
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full justify-start gap-2"
        onClick={() => setIsCreateDialogOpen(true)}
      >
        <PlusIcon className="h-4 w-4" />
        <span>New Folder</span>
      </Button>

      {/* Create Dialog */}
      <FolderDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={handleCreateFolder}
      />

      {/* Edit Dialog */}
      <FolderDialog
        folder={editingFolder ?? undefined}
        open={!!editingFolder}
        onOpenChange={(open) => !open && setEditingFolder(null)}
        onSave={handleUpdateFolder}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingFolder}
        onOpenChange={(open) => !open && setDeletingFolder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFolder?.name}"? The
              bookmarks in this folder will be moved to uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default BookmarkFolders;
