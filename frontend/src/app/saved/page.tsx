"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Plus, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSavedStore, selectAllCollections } from "@/stores/saved-store";
import { SavedMessageList } from "@/components/saved/SavedMessageList";
import { SavedFilters } from "@/components/saved/SavedFilters";
import { CollectionList } from "@/components/saved/CollectionList";
import { CreateCollection } from "@/components/saved/CreateCollection";
import { AddToCollection } from "@/components/saved/AddToCollection";
import { exportSavedMessages, downloadExport } from "@/lib/saved";
import type { SavedMessage, SavedCollection } from "@/lib/saved";

/**
 * Saved messages page - shows all saved/starred messages for the current user.
 */
export default function SavedMessagesPage() {
  const router = useRouter();

  const {
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

  const handleJumpToMessage = (messageId: string, channelId: string) => {
    router.push(`/chat/channel/${channelId}?message=${messageId}`);
  };

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
      userId: "",
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

  const handleExport = () => {
    const result = exportSavedMessages(savedMessages, allCollections, {
      format: "json",
      includeContent: true,
      includeAttachments: true,
      includeNotes: true,
      includeTags: true,
    });
    if (result.success) {
      downloadExport(result);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r">
        <div className="border-b p-4">
          <Button
            variant="ghost"
            size="sm"
            className="mb-2"
            onClick={() => router.push("/chat")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Chat
          </Button>
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-blue-500" />
            <h1 className="text-lg font-semibold">Saved Messages</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.totalSaved} saved
            {stats.totalStarred > 0 && ` (${stats.totalStarred} starred)`}
          </p>
        </div>

        <CollectionList
          collections={allCollections}
          selectedId={selectedCollectionId}
          onSelect={setSelectedCollection}
          onCreate={openCreateCollection}
          showUncategorized
          uncategorizedCount={
            savedMessages.filter((m) => m.collectionIds.length === 0).length
          }
          className="flex-1"
        />
      </div>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">
                {selectedCollectionId
                  ? allCollections.find((c) => c.id === selectedCollectionId)
                      ?.name
                  : "All Saved"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {savedMessages.length} message
                {savedMessages.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button size="sm" onClick={openCreateCollection}>
                <Plus className="mr-2 h-4 w-4" />
                New Collection
              </Button>
            </div>
          </div>

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

        {/* Message List */}
        <div className="flex-1 overflow-auto">
          <SavedMessageList
            savedMessages={savedMessages}
            onJumpToMessage={handleJumpToMessage}
            onUnsave={handleUnsave}
            onToggleStar={handleToggleStar}
            onAddToCollection={handleAddToCollection}
            isLoading={isLoading}
          />
        </div>
      </div>

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
          const current = selectedSaved?.collectionIds ?? [];
          const toAdd = ids.filter((id) => !current.includes(id));
          const toRemove = current.filter((id) => !ids.includes(id));

          toAdd.forEach((cid) => addToCollection(selectedSavedId, cid));
          toRemove.forEach((cid) => removeFromCollection(selectedSavedId, cid));
        }}
        onSave={handleCollectionSave}
        onCreateCollection={openCreateCollection}
      />
    </div>
  );
}
