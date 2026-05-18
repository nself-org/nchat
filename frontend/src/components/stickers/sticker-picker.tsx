"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Search,
  Clock,
  Heart,
  Plus,
  Settings2,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StickerGrid, StickerGridSection } from "./sticker-grid";
import { StickerPackTab } from "./sticker-pack";
import { useStickers } from "@/lib/stickers/use-stickers";
import type { Sticker, StickerPack } from "@/graphql/stickers";

// ============================================================================
// TYPES
// ============================================================================

export interface StickerPickerProps {
  onStickerSelect: (sticker: Sticker) => void;
  onClose?: () => void;
  onManageClick?: () => void;
  onAddPackClick?: () => void;
  className?: string;
}

type PickerTab = "recent" | "favorites" | "search" | "packs";

// ============================================================================
// SEARCH INPUT COMPONENT
// ============================================================================

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  loading?: boolean;
  className?: string;
}

function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search stickers...",
  loading = false,
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-9 w-full rounded-lg border border-input bg-background pl-9 pr-9",
          "text-sm placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      />
      {loading ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : (
        value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )
      )}
    </div>
  );
}

// ============================================================================
// PACK TABS COMPONENT
// ============================================================================

interface PackTabsProps {
  packs: { pack_id: string; pack: StickerPack }[];
  activePackId: string | null;
  onPackSelect: (packId: string) => void;
  onRecentClick: () => void;
  onFavoritesClick: () => void;
  showRecent?: boolean;
  showFavorites?: boolean;
  className?: string;
}

function PackTabs({
  packs,
  activePackId,
  onPackSelect,
  onRecentClick,
  onFavoritesClick,
  showRecent = true,
  showFavorites = true,
  className,
}: PackTabsProps) {
  return (
    <ScrollArea className={cn("w-full", className)}>
      <div className="flex gap-1 p-1">
        {/* Recent Tab */}
        {showRecent && (
          <button
            type="button"
            onClick={onRecentClick}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg p-2 transition-colors",
              "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activePackId === "recent" && "bg-accent",
            )}
            title="Recent"
          >
            <Clock className="h-5 w-5 text-muted-foreground" />
          </button>
        )}

        {/* Favorites Tab */}
        {showFavorites && (
          <button
            type="button"
            onClick={onFavoritesClick}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg p-2 transition-colors",
              "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activePackId === "favorites" && "bg-accent",
            )}
            title="Favorites"
          >
            <Heart className="h-5 w-5 text-muted-foreground" />
          </button>
        )}

        {/* Divider */}
        {(showRecent || showFavorites) && packs.length > 0 && (
          <div className="mx-1 h-8 w-px self-center bg-border" />
        )}

        {/* Pack Tabs */}
        {packs.map(({ pack_id, pack }) => (
          <StickerPackTab
            key={pack_id}
            pack={pack}
            isActive={activePackId === pack_id}
            onClick={() => onPackSelect(pack_id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// STICKER PICKER COMPONENT
// ============================================================================

export function StickerPicker({
  onStickerSelect,
  onClose,
  onManageClick,
  onAddPackClick,
  className,
}: StickerPickerProps) {
  const {
    installedPacks,
    recentStickers,
    favoriteStickers,
    activePackStickers,
    searchResults,
    activePackId,
    searchQuery,
    isLoadingStickers,
    isSearching,
    loadPackStickers,
    searchStickers,
    sendSticker,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    setActivePackId,
  } = useStickers();

  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<PickerTab>("recent");

  // Favorite IDs for quick lookup
  const favoriteIds = useMemo(() => {
    return new Set(favoriteStickers.map((f) => f.sticker_id));
  }, [favoriteStickers]);

  // Handle search input change
  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearchQuery(value);
      if (value.length >= 2) {
        setActiveTab("search");
        searchStickers(value);
      } else if (value.length === 0) {
        setActiveTab("recent");
      }
    },
    [searchStickers],
  );

  // Handle search clear
  const handleSearchClear = useCallback(() => {
    setLocalSearchQuery("");
    setActiveTab("recent");
  }, []);

  // Handle sticker click
  const handleStickerClick = useCallback(
    (sticker: Sticker) => {
      sendSticker(sticker);
      onStickerSelect(sticker);
    },
    [sendSticker, onStickerSelect],
  );

  // Handle sticker long press (toggle favorite)
  const handleStickerLongPress = useCallback(
    (sticker: Sticker) => {
      if (isFavorite(sticker.id)) {
        removeFromFavorites(sticker.id);
      } else {
        addToFavorites(sticker);
      }
    },
    [isFavorite, addToFavorites, removeFromFavorites],
  );

  // Handle favorite toggle
  const handleFavorite = useCallback(
    (sticker: Sticker) => {
      if (isFavorite(sticker.id)) {
        removeFromFavorites(sticker.id);
      } else {
        addToFavorites(sticker);
      }
    },
    [isFavorite, addToFavorites, removeFromFavorites],
  );

  // Handle pack tab click
  const handlePackSelect = useCallback(
    (packId: string) => {
      setActiveTab("packs");
      setActivePackId(packId);
      loadPackStickers(packId);
    },
    [setActivePackId, loadPackStickers],
  );

  // Handle recent tab click
  const handleRecentClick = useCallback(() => {
    setActiveTab("recent");
    setActivePackId(null);
  }, [setActivePackId]);

  // Handle favorites tab click
  const handleFavoritesClick = useCallback(() => {
    setActiveTab("favorites");
    setActivePackId(null);
  }, [setActivePackId]);

  // Load first pack if no recent stickers
  useEffect(() => {
    if (
      recentStickers.length === 0 &&
      installedPacks.length > 0 &&
      !activePackId
    ) {
      handlePackSelect(installedPacks[0].pack_id);
    }
  }, [recentStickers.length, installedPacks, activePackId, handlePackSelect]);

  // Extract recent stickers data
  const recentStickerItems = useMemo(() => {
    return recentStickers.map((r) => r.sticker);
  }, [recentStickers]);

  // Extract favorite stickers data
  const favoriteStickerItems = useMemo(() => {
    return favoriteStickers.map((f) => f.sticker);
  }, [favoriteStickers]);

  return (
    <div
      className={cn(
        "flex h-[400px] w-[360px] flex-col overflow-hidden rounded-xl border bg-background shadow-lg",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-medium">Stickers</h3>
        <div className="flex items-center gap-1">
          {onAddPackClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onAddPackClick}
              className="h-7 w-7"
              title="Add sticker pack"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {onManageClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onManageClick}
              className="h-7 w-7"
              title="Manage stickers"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="border-b px-3 py-2">
        <SearchInput
          value={localSearchQuery}
          onChange={handleSearchChange}
          onClear={handleSearchClear}
          loading={isSearching}
        />
      </div>

      {/* Pack Tabs */}
      <div className="border-b">
        <PackTabs
          packs={installedPacks}
          activePackId={
            activeTab === "recent"
              ? "recent"
              : activeTab === "favorites"
                ? "favorites"
                : activePackId
          }
          onPackSelect={handlePackSelect}
          onRecentClick={handleRecentClick}
          onFavoritesClick={handleFavoritesClick}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Search Results */}
        {activeTab === "search" && (
          <StickerGrid
            stickers={searchResults}
            onStickerClick={handleStickerClick}
            onStickerLongPress={handleStickerLongPress}
            onFavorite={handleFavorite}
            favoriteIds={favoriteIds}
            loading={isSearching}
            emptyMessage={
              localSearchQuery.length < 2
                ? "Type to search..."
                : "No stickers found"
            }
            maxHeight="100%"
          />
        )}

        {/* Recent Stickers */}
        {activeTab === "recent" && (
          <StickerGrid
            stickers={recentStickerItems}
            onStickerClick={handleStickerClick}
            onStickerLongPress={handleStickerLongPress}
            onFavorite={handleFavorite}
            favoriteIds={favoriteIds}
            emptyMessage="No recent stickers"
            maxHeight="100%"
          />
        )}

        {/* Favorite Stickers */}
        {activeTab === "favorites" && (
          <StickerGrid
            stickers={favoriteStickerItems}
            onStickerClick={handleStickerClick}
            onStickerLongPress={handleStickerLongPress}
            onFavorite={handleFavorite}
            favoriteIds={favoriteIds}
            emptyMessage="No favorite stickers"
            maxHeight="100%"
          />
        )}

        {/* Pack Stickers */}
        {activeTab === "packs" && (
          <StickerGrid
            stickers={activePackStickers}
            onStickerClick={handleStickerClick}
            onStickerLongPress={handleStickerLongPress}
            onFavorite={handleFavorite}
            favoriteIds={favoriteIds}
            loading={isLoadingStickers}
            emptyMessage="No stickers in this pack"
            maxHeight="100%"
          />
        )}
      </div>

      {/* No Packs Message */}
      {installedPacks.length === 0 && activeTab !== "search" && (
        <div className="bg-background/95 absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="mb-3 text-4xl">:-)</div>
          <h3 className="mb-1 font-medium">No sticker packs</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Add some sticker packs to start using stickers
          </p>
          {onAddPackClick && (
            <Button onClick={onAddPackClick}>
              <Plus className="mr-2 h-4 w-4" />
              Browse Packs
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT STICKER PICKER (for mobile/smaller spaces)
// ============================================================================

export interface CompactStickerPickerProps {
  onStickerSelect: (sticker: Sticker) => void;
  className?: string;
}

export function CompactStickerPicker({
  onStickerSelect,
  className,
}: CompactStickerPickerProps) {
  const {
    installedPacks,
    recentStickers,
    activePackStickers,
    activePackId,
    isLoadingStickers,
    loadPackStickers,
    sendSticker,
    setActivePackId,
  } = useStickers();

  const [activeTab, setActiveTab] = useState<"recent" | "packs">("recent");

  const handleStickerClick = useCallback(
    (sticker: Sticker) => {
      sendSticker(sticker);
      onStickerSelect(sticker);
    },
    [sendSticker, onStickerSelect],
  );

  const handlePackSelect = useCallback(
    (packId: string) => {
      setActiveTab("packs");
      setActivePackId(packId);
      loadPackStickers(packId);
    },
    [setActivePackId, loadPackStickers],
  );

  const recentStickerItems = useMemo(() => {
    return recentStickers.map((r) => r.sticker);
  }, [recentStickers]);

  return (
    <div className={cn("flex w-full flex-col", className)}>
      {/* Pack Tabs */}
      <ScrollArea className="w-full border-b">
        <div className="flex gap-1 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("recent");
              setActivePackId(null);
            }}
            className={cn(
              "flex items-center justify-center rounded-lg p-2 transition-colors",
              "hover:bg-accent",
              activeTab === "recent" && "bg-accent",
            )}
          >
            <Clock className="h-5 w-5 text-muted-foreground" />
          </button>
          {installedPacks.map(({ pack_id, pack }) => (
            <StickerPackTab
              key={pack_id}
              pack={pack}
              isActive={activePackId === pack_id}
              onClick={() => handlePackSelect(pack_id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Content */}
      <StickerGrid
        stickers={
          activeTab === "recent" ? recentStickerItems : activePackStickers
        }
        onStickerClick={handleStickerClick}
        columns={6}
        stickerSize="sm"
        loading={isLoadingStickers}
        emptyMessage={
          activeTab === "recent" ? "No recent stickers" : "No stickers"
        }
        maxHeight="200px"
        showHoverActions={false}
      />
    </div>
  );
}

export default StickerPicker;
