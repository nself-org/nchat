"use client";

import { useState, useMemo } from "react";
import { Search, Loader2, Smile, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useStickerPacks } from "@/hooks/use-stickers";
import type { Sticker, StickerPack } from "@/hooks/use-stickers";

interface StickerPickerProps {
  onSelect: (sticker: Sticker) => void;
  onClose?: () => void;
  className?: string;
}

/**
 * Sticker Picker Component
 * Browse and select custom stickers from packs
 */
export function StickerPicker({
  onSelect,
  onClose,
  className,
}: StickerPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { packs, isLoading, error } = useStickerPacks();

  // Filter stickers by search query
  const filteredPacks = useMemo(() => {
    if (!searchQuery) return packs;

    return packs
      .map((pack) => ({
        ...pack,
        stickers: pack.stickers.filter(
          (sticker) =>
            sticker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sticker.keywords.some((keyword) =>
              keyword.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
        ),
      }))
      .filter((pack) => pack.stickers.length > 0);
  }, [packs, searchQuery]);

  // Get all filtered stickers (for search results view)
  const allFilteredStickers = useMemo(() => {
    return filteredPacks.flatMap((pack) =>
      pack.stickers.map((sticker) => ({ ...sticker, pack })),
    );
  }, [filteredPacks]);

  const handleSelect = (sticker: Sticker) => {
    onSelect(sticker);
    onClose?.();
  };

  if (isLoading) {
    return (
      <div
        className={cn("flex h-[400px] items-center justify-center", className)}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex h-[400px] flex-col items-center justify-center p-8",
          className,
        )}
      >
        <Smile className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Failed to load stickers</p>
      </div>
    );
  }

  if (packs.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[400px] flex-col items-center justify-center p-8",
          className,
        )}
      >
        <Smile className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="mb-1 text-sm font-medium">No sticker packs available</p>
        <p className="text-xs text-muted-foreground">
          Ask an admin to create sticker packs
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex h-[450px] flex-col bg-background", className)}>
      {/* Search */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search stickers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {searchQuery ? (
        // Search results view
        <ScrollArea className="flex-1">
          {allFilteredStickers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Smile className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No stickers found</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 p-4">
              {allFilteredStickers.map((sticker) => (
                <StickerItem
                  key={sticker.id}
                  sticker={sticker}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      ) : (
        // Tabs view (by pack)
        <Tabs defaultValue={packs[0]?.id} className="flex flex-1 flex-col">
          <TabsList className="w-full justify-start overflow-x-auto border-b px-2">
            {packs.map((pack) => (
              <TabsTrigger
                key={pack.id}
                value={pack.id}
                className="flex items-center gap-1.5"
              >
                {pack.icon_url && (
                  <img src={pack.icon_url} alt="" className="h-4 w-4" />
                )}
                <span className="text-xs">{pack.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {packs.map((pack) => (
            <TabsContent
              key={pack.id}
              value={pack.id}
              className="flex-1 data-[state=active]:flex data-[state=active]:flex-col"
            >
              <ScrollArea className="flex-1">
                {pack.stickers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Smile className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      This pack is empty
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 p-4">
                    {pack.stickers.map((sticker) => (
                      <StickerItem
                        key={sticker.id}
                        sticker={sticker}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

/**
 * Individual sticker item
 */
function StickerItem({
  sticker,
  onSelect,
}: {
  sticker: Sticker;
  onSelect: (sticker: Sticker) => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const imageUrl = sticker.thumbnail_url || sticker.file_url;

  return (
    <button
      onClick={() => onSelect(sticker)}
      className={cn(
        "bg-muted/30 group relative aspect-square overflow-hidden rounded-lg border transition-all hover:border-primary hover:shadow-md",
        "flex items-center justify-center p-2",
      )}
      title={sticker.name}
    >
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {hasError && (
        <div className="flex items-center justify-center text-muted-foreground">
          <Smile className="h-6 w-6" />
        </div>
      )}

      <img
        src={imageUrl}
        alt={sticker.name}
        className={cn(
          "max-h-full max-w-full object-contain transition-opacity",
          isLoaded ? "opacity-100" : "opacity-0",
        )}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
    </button>
  );
}
