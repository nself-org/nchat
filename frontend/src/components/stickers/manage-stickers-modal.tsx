"use client";

import { useState, useCallback, useMemo } from "react";
import {
  GripVertical,
  Trash2,
  Search,
  Plus,
  Clock,
  Heart,
  Loader2,
  Package,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStickers } from "@/lib/stickers/use-stickers";
import type {
  StickerPack,
  UserStickerPack,
  FavoriteSticker,
} from "@/graphql/stickers";

// ============================================================================
// TYPES
// ============================================================================

export interface ManageStickersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPackClick?: () => void;
  className?: string;
}

type ManageTab = "packs" | "favorites" | "recent";

// ============================================================================
// DRAGGABLE PACK ITEM
// ============================================================================

interface DraggablePackItemProps {
  pack: UserStickerPack;
  onRemove: (packId: string) => Promise<void>;
  onDragStart: (packId: string) => void;
  onDragOver: (packId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}

function DraggablePackItem({
  pack,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: DraggablePackItemProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleRemove = useCallback(async () => {
    setIsRemoving(true);
    try {
      await onRemove(pack.pack_id);
    } finally {
      setIsRemoving(false);
    }
  }, [onRemove, pack.pack_id]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3 transition-all",
        isDragging && "scale-95 opacity-50",
        isDragOver && "bg-primary/5 border-primary",
      )}
      draggable
      onDragStart={() => onDragStart(pack.pack_id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(pack.pack_id);
      }}
      onDragEnd={onDragEnd}
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Pack Thumbnail */}
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
        {imageError ? (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        ) : (
          <Image
            src={pack.pack.thumbnail_url}
            alt={pack.pack.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Pack Info */}
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium">{pack.pack.name}</h4>
        <p className="text-xs text-muted-foreground">
          {pack.pack.sticker_count} stickers
          {pack.pack.is_animated && " - Animated"}
        </p>
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRemove}
        disabled={isRemoving}
        className="text-muted-foreground hover:text-destructive"
      >
        {isRemoving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// ============================================================================
// FAVORITE STICKER ITEM
// ============================================================================

interface FavoriteStickerItemProps {
  favorite: FavoriteSticker;
  onRemove: (stickerId: string) => Promise<void>;
}

function FavoriteStickerItem({ favorite, onRemove }: FavoriteStickerItemProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleRemove = useCallback(async () => {
    setIsRemoving(true);
    try {
      await onRemove(favorite.sticker_id);
    } finally {
      setIsRemoving(false);
    }
  }, [onRemove, favorite.sticker_id]);

  return (
    <div className="group relative">
      <div className="h-16 w-16 overflow-hidden rounded-lg bg-muted">
        {imageError ? (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-xs text-muted-foreground">Error</span>
          </div>
        ) : (
          <Image
            src={favorite.sticker.thumbnail_url || favorite.sticker.url}
            alt={favorite.sticker.name || "Sticker"}
            fill
            className="object-contain p-1"
            onError={() => setImageError(true)}
          />
        )}
      </div>
      <button
        type="button"
        onClick={handleRemove}
        disabled={isRemoving}
        className={cn(
          "absolute -right-1 -top-1 rounded-full p-1",
          "bg-destructive text-destructive-foreground",
          "opacity-0 transition-opacity group-hover:opacity-100",
          "disabled:opacity-50",
        )}
      >
        {isRemoving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

// ============================================================================
// MANAGE STICKERS MODAL
// ============================================================================

export function ManageStickersModal({
  open,
  onOpenChange,
  onAddPackClick,
  className,
}: ManageStickersModalProps) {
  const {
    installedPacks,
    favoriteStickers,
    recentStickers,
    removePack,
    reorderPacks,
    removeFromFavorites,
    clearRecentStickers,
    isLoadingPacks,
  } = useStickers();

  const [activeTab, setActiveTab] = useState<ManageTab>("packs");
  const [draggedPackId, setDraggedPackId] = useState<string | null>(null);
  const [dragOverPackId, setDragOverPackId] = useState<string | null>(null);
  const [isClearingRecent, setIsClearingRecent] = useState(false);

  // Handle pack removal
  const handleRemovePack = useCallback(
    async (packId: string) => {
      await removePack(packId);
    },
    [removePack],
  );

  // Handle drag and drop reordering
  const handleDragStart = useCallback((packId: string) => {
    setDraggedPackId(packId);
  }, []);

  const handleDragOver = useCallback(
    (packId: string) => {
      if (packId !== draggedPackId) {
        setDragOverPackId(packId);
      }
    },
    [draggedPackId],
  );

  const handleDragEnd = useCallback(() => {
    if (draggedPackId && dragOverPackId && draggedPackId !== dragOverPackId) {
      const packIds = installedPacks.map((p) => p.pack_id);
      const draggedIndex = packIds.indexOf(draggedPackId);
      const dropIndex = packIds.indexOf(dragOverPackId);

      if (draggedIndex !== -1 && dropIndex !== -1) {
        // Reorder the array
        packIds.splice(draggedIndex, 1);
        packIds.splice(dropIndex, 0, draggedPackId);
        reorderPacks(packIds);
      }
    }

    setDraggedPackId(null);
    setDragOverPackId(null);
  }, [draggedPackId, dragOverPackId, installedPacks, reorderPacks]);

  // Handle favorite removal
  const handleRemoveFavorite = useCallback(
    async (stickerId: string) => {
      await removeFromFavorites(stickerId);
    },
    [removeFromFavorites],
  );

  // Handle clear recent
  const handleClearRecent = useCallback(async () => {
    setIsClearingRecent(true);
    try {
      await clearRecentStickers();
    } finally {
      setIsClearingRecent(false);
    }
  }, [clearRecentStickers]);

  // Stats
  const stats = useMemo(
    () => ({
      packs: installedPacks.length,
      favorites: favoriteStickers.length,
      recent: recentStickers.length,
    }),
    [installedPacks.length, favoriteStickers.length, recentStickers.length],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[500px]", className)}>
        <DialogHeader>
          <DialogTitle>Manage Stickers</DialogTitle>
          <DialogDescription>
            Organize your sticker packs, favorites, and recent stickers.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ManageTab)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="packs" className="flex-1">
              <Package className="mr-2 h-4 w-4" />
              Packs ({stats.packs})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              <Heart className="mr-2 h-4 w-4" />
              Favorites ({stats.favorites})
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex-1">
              <Clock className="mr-2 h-4 w-4" />
              Recent ({stats.recent})
            </TabsTrigger>
          </TabsList>

          {/* Packs Tab */}
          <TabsContent value="packs" className="mt-4">
            {isLoadingPacks ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : installedPacks.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-1 font-medium">No sticker packs</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Add some sticker packs to get started
                </p>
                {onAddPackClick && (
                  <Button onClick={onAddPackClick}>
                    <Plus className="mr-2 h-4 w-4" />
                    Browse Packs
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Drag to reorder your sticker packs
                  </p>
                  {onAddPackClick && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAddPackClick}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Pack
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {installedPacks.map((pack) => (
                      <DraggablePackItem
                        key={pack.pack_id}
                        pack={pack}
                        onRemove={handleRemovePack}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedPackId === pack.pack_id}
                        isDragOver={dragOverPackId === pack.pack_id}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="mt-4">
            {favoriteStickers.length === 0 ? (
              <div className="py-12 text-center">
                <Heart className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-1 font-medium">No favorites</h3>
                <p className="text-sm text-muted-foreground">
                  Long-press on a sticker to add it to favorites
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-5 gap-2 p-1">
                  {favoriteStickers.map((favorite) => (
                    <FavoriteStickerItem
                      key={favorite.id}
                      favorite={favorite}
                      onRemove={handleRemoveFavorite}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Recent Tab */}
          <TabsContent value="recent" className="mt-4">
            {recentStickers.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-1 font-medium">No recent stickers</h3>
                <p className="text-sm text-muted-foreground">
                  Stickers you send will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {recentStickers.length} recent stickers
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearRecent}
                    disabled={isClearingRecent}
                  >
                    {isClearingRecent ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Clear All
                  </Button>
                </div>
                <ScrollArea className="h-[260px]">
                  <div className="grid grid-cols-5 gap-2 p-1">
                    {recentStickers.map((recent) => (
                      <div
                        key={recent.id}
                        className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted"
                      >
                        <Image
                          src={
                            recent.sticker.thumbnail_url || recent.sticker.url
                          }
                          alt={recent.sticker.name || "Sticker"}
                          fill
                          className="object-contain p-1"
                        />
                        {recent.use_count > 1 && (
                          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[10px] text-white">
                            {recent.use_count}x
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default ManageStickersModal;
