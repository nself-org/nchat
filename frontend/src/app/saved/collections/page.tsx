"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSavedStore, selectAllCollections } from "@/stores/saved-store";
import { SavedCollections } from "@/components/saved/SavedCollections";
import { CreateCollection } from "@/components/saved/CreateCollection";
import type { SavedCollection } from "@/lib/saved";

/**
 * Collections page - shows all saved message collections.
 */
export default function CollectionsPage() {
  const router = useRouter();

  const {
    isLoading,
    openCreateCollection,
    closeCreateCollection,
    isCreateCollectionOpen,
    addCollection,
    updateCollection,
    removeCollection,
  } = useSavedStore();

  const allCollections = useSavedStore(selectAllCollections);

  const handleSelectCollection = (collection: SavedCollection) => {
    router.push(`/saved/collections/${collection.id}`);
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

  const handleEditCollection = (collection: SavedCollection) => {
    // Would open an edit modal - for now just log
  };

  const handleDeleteCollection = (collection: SavedCollection) => {
    if (
      confirm(
        `Are you sure you want to delete "${collection.name}"? Messages will not be deleted.`,
      )
    ) {
      removeCollection(collection.id);
    }
  };

  const handleShareCollection = (collection: SavedCollection) => {
    // Would open a share modal
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => router.push("/saved")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Saved
          </Button>

          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Folder className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Collections</h1>
              <p className="text-muted-foreground">
                Organize your saved messages into collections
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <SavedCollections
          collections={allCollections}
          onSelect={handleSelectCollection}
          onCreate={openCreateCollection}
          onEdit={handleEditCollection}
          onDelete={handleDeleteCollection}
          onShare={handleShareCollection}
          isLoading={isLoading}
        />
      </main>

      {/* Create Collection Modal */}
      <CreateCollection
        open={isCreateCollectionOpen}
        onOpenChange={(open) => !open && closeCreateCollection()}
        onCreate={handleCreateCollection}
      />
    </div>
  );
}
