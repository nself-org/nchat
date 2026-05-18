"use client";

import * as React from "react";
import { X, Bookmark, Download, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useSavedStore, selectAllCollections } from "@/stores/saved-store";
import type { SavedMessage, SavedCollection } from "@/lib/saved";
import { SavedMessageList } from "./SavedMessageList";
import { SavedFilters } from "./SavedFilters";
import { CollectionList } from "./CollectionList";
import { CreateCollection } from "./CreateCollection";
import { AddToCollection } from "./AddToCollection";

export interface SavedMessagesProps {
  /** Callback to navigate to message */
  onJumpToMessage?: (messageId: string, channelId: string) => void;
  /** Callback when export is clicked */
  onExport?: () => void;
  /** Callback when settings is clicked */
  onOpenSettings?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Panel for viewing and managing saved messages.
 */
export function SavedMessages({
  onJumpToMessage,
  onExport,
  onOpenSettings,
  className,
}: SavedMessagesProps) {
  const {
    isPanelOpen,
    closePanel,
    getFilteredSavedMessages,
    getSavedStats,
    getAllTags,
    isLoading,
    filters,
    sortBy,
    sortOrder,
    searchQuery,
    selectedTagFilter,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,
    setSearchQuery,
    setSelectedTagFilter,
    selectedCollectionId,
    setSelectedCollection,
    collections,
    removeSavedMessage,
    toggleStar,
    openAddToCollection,
    closeAddToCollection,
    isAddToCollectionOpen,
    selectedSavedId,
    getSavedMessage,
    addToCollection,
    removeFromCollection,
    openCreateCollection,
    closeCreateCollection,
    isCreateCollectionOpen,
    addCollection,
  } = useSavedStore();

  const allCollections = useSavedStore(selectAllCollections);
  const savedMessages = getFilteredSavedMessages();
  const stats = getSavedStats();
  const availableTags = getAllTags();

  const selectedSaved = selectedSavedId
    ? getSavedMessage(selectedSavedId)
    : undefined;

  const handleUnsave = (saved: SavedMessage) => {
    removeSavedMessage(saved.id);
  };

  const handleToggleStar = (saved: SavedMessage) => {
    toggleStar(saved.id);
  };

  const handleAddToCollection = (saved: SavedMessage) => {
    openAddToCollection(saved.id);
  };

  const handleSortChange = (
    newSortBy: typeof sortBy,
    newSortOrder: typeof sortOrder,
  ) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleCollectionSave = () => {
    // Handled by the store
    closeAddToCollection();
  };

  const handleCreateCollection = (data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }) => {
    const newCollection: SavedCollection = {
      id: crypto.randomUUID(),
      userId: "", // Would come from auth
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      itemCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      position: allCollections.length,
      isShared: false,
    };
    addCollection(newCollection);
    closeCreateCollection();
  };

  return (
    <>
      <Sheet open={isPanelOpen} onOpenChange={(open) => !open && closePanel()}>
        <SheetContent
          side="right"
          className={cn("w-full p-0 sm:w-[500px] sm:max-w-lg", className)}
        >
          <SheetHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-blue-500" />
                <SheetTitle className="text-base">Saved Messages</SheetTitle>
              </div>
              <div className="flex items-center gap-1">
                {onExport && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onExport}
                  >
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Export</span>
                  </Button>
                )}
                {onOpenSettings && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onOpenSettings}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Settings</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={closePanel}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </div>
            <SheetDescription className="text-xs">
              {stats.totalSaved} saved
              {stats.totalStarred > 0 && ` (${stats.totalStarred} starred)`}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="messages" className="h-[calc(100vh-80px)]">
            <div className="border-b px-4 pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="messages" className="flex-1">
                  Messages
                </TabsTrigger>
                <TabsTrigger value="collections" className="flex-1">
                  Collections
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="messages" className="m-0 h-full">
              <div className="flex h-full">
                {/* Sidebar with collections */}
                <div className="hidden w-48 border-r sm:block">
                  <CollectionList
                    collections={allCollections}
                    selectedId={selectedCollectionId}
                    onSelect={setSelectedCollection}
                    onCreate={openCreateCollection}
                    compact
                    uncategorizedCount={
                      savedMessages.filter((m) => m.collectionIds.length === 0)
                        .length
                    }
                  />
                </div>

                {/* Main content */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="border-b px-4 py-3">
                    <SavedFilters
                      filters={filters}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      searchQuery={searchQuery}
                      availableTags={availableTags}
                      selectedTags={selectedTagFilter}
                      onFiltersChange={setFilters}
                      onSortChange={handleSortChange}
                      onSearchChange={setSearchQuery}
                      onTagsChange={setSelectedTagFilter}
                      onClearFilters={clearFilters}
                    />
                  </div>

                  <ScrollArea className="flex-1">
                    <SavedMessageList
                      savedMessages={savedMessages}
                      onJumpToMessage={(messageId, channelId) => {
                        onJumpToMessage?.(messageId, channelId);
                        closePanel();
                      }}
                      onUnsave={handleUnsave}
                      onToggleStar={handleToggleStar}
                      onAddToCollection={handleAddToCollection}
                      isLoading={isLoading}
                    />
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="collections" className="m-0 p-4">
              <CollectionList
                collections={allCollections}
                selectedId={selectedCollectionId}
                onSelect={setSelectedCollection}
                onCreate={openCreateCollection}
                showUncategorized={false}
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Create Collection Modal */}
      <CreateCollection
        open={isCreateCollectionOpen}
        onOpenChange={(open) => !open && closeCreateCollection()}
        onCreate={handleCreateCollection}
      />

      {/* Add to Collection Modal */}
      <AddToCollection
        open={isAddToCollectionOpen}
        onOpenChange={(open) => !open && closeAddToCollection()}
        collections={allCollections}
        selectedIds={selectedSaved?.collectionIds ?? []}
        onSelectionChange={(ids) => {
          if (!selectedSavedId) return;
          // Update collection membership
          const current = selectedSaved?.collectionIds ?? [];
          const toAdd = ids.filter((id) => !current.includes(id));
          const toRemove = current.filter((id) => !ids.includes(id));

          toAdd.forEach((cid) => addToCollection(selectedSavedId, cid));
          toRemove.forEach((cid) => removeFromCollection(selectedSavedId, cid));
        }}
        onSave={handleCollectionSave}
        onCreateCollection={openCreateCollection}
      />
    </>
  );
}
