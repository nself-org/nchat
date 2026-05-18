"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Search,
  X,
  Sparkles,
  TrendingUp,
  Plus,
  Check,
  Loader2,
  ChevronLeft,
  ArrowLeft,
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
import { Badge } from "@/components/ui/badge";
import { StickerPackItem, StickerPackPreview } from "./sticker-pack";
import {
  useStickers,
  usePackStickers,
  useTrendingPacks,
} from "@/lib/stickers/use-stickers";
import type { StickerPack, Sticker } from "@/graphql/stickers";

// ============================================================================
// TYPES
// ============================================================================

export interface AddStickerPackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewPackId?: string | null;
  onPreviewPackChange?: (packId: string | null) => void;
  className?: string;
}

type ModalView = "browse" | "preview" | "search";

// ============================================================================
// SEARCH INPUT
// ============================================================================

interface PackSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
}

function PackSearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search sticker packs...",
  className,
}: PackSearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-10 w-full rounded-lg border border-input bg-background pl-10 pr-10",
          "text-sm placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// PACK CARD (for grid display)
// ============================================================================

interface PackCardProps {
  pack: StickerPack;
  isInstalled: boolean;
  onPreview: (pack: StickerPack) => void;
  onAdd: (pack: StickerPack) => Promise<void>;
  onRemove: (pack: StickerPack) => Promise<void>;
}

function PackCard({
  pack,
  isInstalled,
  onPreview,
  onAdd,
  onRemove,
}: PackCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAction = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLoading) return;

      setIsLoading(true);
      try {
        if (isInstalled) {
          await onRemove(pack);
        } else {
          await onAdd(pack);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isInstalled, isLoading, onAdd, onRemove, pack],
  );

  return (
    <div
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-xl border bg-card",
        "group transition-shadow hover:shadow-md",
      )}
      onClick={() => onPreview(pack)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPreview(pack);
        }
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-muted">
        {imageError ? (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <span className="text-4xl">:-)</span>
          </div>
        ) : (
          <Image
            src={pack.thumbnail_url}
            alt={pack.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        )}

        {/* Badges */}
        <div className="absolute left-2 top-2 flex gap-1">
          {pack.is_official && (
            <Badge
              variant="secondary"
              className="bg-background/80 text-xs backdrop-blur-sm"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Official
            </Badge>
          )}
        </div>

        {/* Installed Indicator */}
        {isInstalled && (
          <div className="text-primary-foreground absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
            <Check className="h-4 w-4" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="truncate text-sm font-medium">{pack.name}</h4>
        <p className="text-xs text-muted-foreground">
          {pack.sticker_count} stickers
          {pack.is_animated && " - Animated"}
        </p>
      </div>

      {/* Quick Add Button */}
      <div className="px-3 pb-3">
        <Button
          variant={isInstalled ? "outline" : "default"}
          size="sm"
          onClick={handleAction}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isInstalled ? (
            <>
              <Check className="mr-1 h-4 w-4" />
              Added
            </>
          ) : (
            <>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// PACK PREVIEW VIEW
// ============================================================================

interface PackPreviewViewProps {
  packId: string;
  onBack: () => void;
  onAdd: (pack: StickerPack) => Promise<void>;
  onRemove: (pack: StickerPack) => Promise<void>;
  isInstalled: (packId: string) => boolean;
  onStickerClick?: (sticker: Sticker) => void;
}

function PackPreviewView({
  packId,
  onBack,
  onAdd,
  onRemove,
  isInstalled,
  onStickerClick,
}: PackPreviewViewProps) {
  const { pack, stickers, loading, error } = usePackStickers(packId);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const installed = pack ? isInstalled(pack.id) : false;

  const handleAction = useCallback(async () => {
    if (!pack || isActionLoading) return;

    setIsActionLoading(true);
    try {
      if (installed) {
        await onRemove(pack);
      } else {
        await onAdd(pack);
      }
    } finally {
      setIsActionLoading(false);
    }
  }, [pack, installed, isActionLoading, onAdd, onRemove]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading pack...</p>
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-destructive">Failed to load pack</p>
        <Button variant="outline" size="sm" onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Browse
      </button>

      {/* Pack Header */}
      <div className="flex items-start gap-4 rounded-xl border bg-card p-4">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image
            src={pack.thumbnail_url}
            alt={pack.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{pack.name}</h3>
            {pack.is_official && (
              <Sparkles className="h-4 w-4 flex-shrink-0 text-primary" />
            )}
          </div>
          {pack.description && (
            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
              {pack.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {pack.author && <span>by {pack.author}</span>}
            <span>{pack.sticker_count} stickers</span>
            {pack.is_animated && (
              <Badge variant="outline" className="text-xs">
                Animated
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant={installed ? "outline" : "default"}
          onClick={handleAction}
          disabled={isActionLoading}
          className="flex-shrink-0"
        >
          {isActionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : installed ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Added
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Pack
            </>
          )}
        </Button>
      </div>

      {/* Stickers Grid */}
      <div className="rounded-xl border bg-card p-4">
        <h4 className="mb-3 text-sm font-medium">Stickers Preview</h4>
        <div className="grid grid-cols-5 gap-2">
          {stickers.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => onStickerClick?.(sticker)}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted transition-colors hover:bg-accent"
            >
              <Image
                src={sticker.thumbnail_url || sticker.url}
                alt={sticker.name || "Sticker"}
                fill
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADD STICKER PACK MODAL
// ============================================================================

export function AddStickerPackModal({
  open,
  onOpenChange,
  previewPackId: controlledPreviewPackId,
  onPreviewPackChange,
  className,
}: AddStickerPackModalProps) {
  const {
    availablePacks,
    loadAvailablePacks,
    addPack,
    removePack,
    isPackInstalled,
    isLoadingPacks,
  } = useStickers();

  const { packs: trendingPacks, loading: loadingTrending } = useTrendingPacks();

  const [searchQuery, setSearchQuery] = useState("");
  const [internalPreviewPackId, setInternalPreviewPackId] = useState<
    string | null
  >(null);
  const [view, setView] = useState<ModalView>("browse");

  // Support both controlled and uncontrolled preview
  const isControlled = controlledPreviewPackId !== undefined;
  const previewPackId = isControlled
    ? controlledPreviewPackId
    : internalPreviewPackId;
  const setPreviewPackId = isControlled
    ? (id: string | null) => onPreviewPackChange?.(id)
    : setInternalPreviewPackId;

  // Load available packs when modal opens
  useEffect(() => {
    if (open) {
      loadAvailablePacks();
    }
  }, [open, loadAvailablePacks]);

  // Filter packs based on search
  const filteredPacks = useMemo(() => {
    if (!searchQuery) return availablePacks;
    const query = searchQuery.toLowerCase();
    return availablePacks.filter(
      (pack) =>
        pack.name.toLowerCase().includes(query) ||
        pack.description?.toLowerCase().includes(query),
    );
  }, [availablePacks, searchQuery]);

  // Split into official and community packs
  const { officialPacks, communityPacks } = useMemo(() => {
    const official = filteredPacks.filter((p) => p.is_official);
    const community = filteredPacks.filter((p) => !p.is_official);
    return { officialPacks: official, communityPacks: community };
  }, [filteredPacks]);

  // Handle pack preview
  const handlePreview = useCallback(
    (pack: StickerPack) => {
      setPreviewPackId(pack.id);
      setView("preview");
    },
    [setPreviewPackId],
  );

  // Handle back from preview
  const handleBack = useCallback(() => {
    setPreviewPackId(null);
    setView(searchQuery ? "search" : "browse");
  }, [searchQuery, setPreviewPackId]);

  // Handle add pack
  const handleAddPack = useCallback(
    async (pack: StickerPack) => {
      await addPack(pack.id);
    },
    [addPack],
  );

  // Handle remove pack
  const handleRemovePack = useCallback(
    async (pack: StickerPack) => {
      await removePack(pack.id);
    },
    [removePack],
  );

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (value) {
      setView("search");
    } else {
      setView("browse");
    }
  }, []);

  // Handle search clear
  const handleSearchClear = useCallback(() => {
    setSearchQuery("");
    setView("browse");
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setView("browse");
      if (!isControlled) {
        setInternalPreviewPackId(null);
      }
    }
  }, [open, isControlled]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[80vh] sm:max-w-[600px]", className)}>
        <DialogHeader>
          <DialogTitle>Add Sticker Packs</DialogTitle>
          <DialogDescription>
            Browse and add sticker packs to your collection.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        {view !== "preview" && (
          <PackSearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            onClear={handleSearchClear}
          />
        )}

        <ScrollArea className="h-[400px] pr-4">
          {/* Preview View */}
          {view === "preview" && previewPackId && (
            <PackPreviewView
              packId={previewPackId}
              onBack={handleBack}
              onAdd={handleAddPack}
              onRemove={handleRemovePack}
              isInstalled={isPackInstalled}
            />
          )}

          {/* Browse View */}
          {view === "browse" && (
            <div className="space-y-6">
              {/* Trending Section */}
              {!loadingTrending && trendingPacks.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">Trending</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {trendingPacks.slice(0, 3).map((pack: StickerPack) => (
                      <PackCard
                        key={pack.id}
                        pack={pack}
                        isInstalled={isPackInstalled(pack.id)}
                        onPreview={handlePreview}
                        onAdd={handleAddPack}
                        onRemove={handleRemovePack}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Official Packs */}
              {officialPacks.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">Official Packs</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {officialPacks.map((pack) => (
                      <PackCard
                        key={pack.id}
                        pack={pack}
                        isInstalled={isPackInstalled(pack.id)}
                        onPreview={handlePreview}
                        onAdd={handleAddPack}
                        onRemove={handleRemovePack}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Community Packs */}
              {communityPacks.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-medium">Community Packs</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {communityPacks.map((pack) => (
                      <PackCard
                        key={pack.id}
                        pack={pack}
                        isInstalled={isPackInstalled(pack.id)}
                        onPreview={handlePreview}
                        onAdd={handleAddPack}
                        onRemove={handleRemovePack}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoadingPacks && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Empty State */}
              {!isLoadingPacks && availablePacks.length === 0 && (
                <div className="py-12 text-center">
                  <div className="mb-3 text-4xl">:-/</div>
                  <p className="text-sm text-muted-foreground">
                    No sticker packs available
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Search View */}
          {view === "search" && (
            <div className="space-y-4">
              {filteredPacks.length === 0 ? (
                <div className="py-12 text-center">
                  <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No packs found for &quot;{searchQuery}&quot;
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredPacks.map((pack) => (
                    <PackCard
                      key={pack.id}
                      pack={pack}
                      isInstalled={isPackInstalled(pack.id)}
                      onPreview={handlePreview}
                      onAdd={handleAddPack}
                      onRemove={handleRemovePack}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default AddStickerPackModal;
