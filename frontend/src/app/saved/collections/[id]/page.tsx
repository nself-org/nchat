"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Folder,
  Share2,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSavedStore } from "@/stores/saved-store";
import { SavedMessageList } from "@/components/saved/SavedMessageList";
import { SavedEmpty } from "@/components/saved/SavedEmpty";
import type { SavedMessage } from "@/lib/saved";

/**
 * Single collection page - shows messages in a specific collection.
 */
export default function CollectionPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = params.id as string;

  const {
    getCollection,
    getCollectionMessages,
    isLoading,
    removeSavedMessage,
    toggleStar,
    removeFromCollection,
  } = useSavedStore();

  const collection = getCollection(collectionId);
  const messages = getCollectionMessages(collectionId);

  const handleJumpToMessage = (messageId: string, channelId: string) => {
    router.push(`/chat/channel/${channelId}?message=${messageId}`);
  };

  const handleUnsave = (saved: SavedMessage) => {
    removeSavedMessage(saved.id);
  };

  const handleToggleStar = (saved: SavedMessage) => {
    toggleStar(saved.id);
  };

  const handleRemoveFromCollection = (saved: SavedMessage) => {
    removeFromCollection(saved.id, collectionId);
  };

  const handleEditCollection = () => {
    // Would open edit modal
  };

  const handleShareCollection = () => {
    // Would open share modal
  };

  const handleDeleteCollection = () => {
    // Would delete and redirect
  };

  if (!collection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-medium">Collection not found</h1>
          <p className="mb-4 text-muted-foreground">
            This collection may have been deleted or does not exist.
          </p>
          <Button onClick={() => router.push("/saved/collections")}>
            View all collections
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => router.push("/saved/collections")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collections
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg"
                style={
                  collection.color
                    ? {
                        backgroundColor: collection.color + "20",
                        color: collection.color,
                      }
                    : undefined
                }
              >
                <Folder className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{collection.name}</h1>
                  {collection.isShared && (
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {collection.description && (
                  <p className="text-muted-foreground">
                    {collection.description}
                  </p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  {messages.length} message{messages.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditCollection}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit collection
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareCollection}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share collection
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteCollection}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete collection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-5xl px-4 py-8">
        {messages.length === 0 ? (
          <SavedEmpty type="collection" collectionName={collection.name} />
        ) : (
          <SavedMessageList
            savedMessages={messages}
            onJumpToMessage={handleJumpToMessage}
            onUnsave={handleRemoveFromCollection}
            onToggleStar={handleToggleStar}
            isLoading={isLoading}
            showEmpty={false}
          />
        )}
      </main>
    </div>
  );
}
