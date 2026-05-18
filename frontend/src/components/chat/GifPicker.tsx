"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, TrendingUp, Loader2, ImageOff, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useGifSearch } from "@/hooks/use-gif-search";
import type { TenorGif } from "@/lib/tenor-client";

interface GifPickerProps {
  onSelect: (gif: TenorGif) => void;
  onClose?: () => void;
  className?: string;
}

/**
 * GIF Picker Component
 * Powered by Tenor API - search and select GIFs
 */
export function GifPicker({ onSelect, onClose, className }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Debounce search query to avoid too many API calls
  const debouncedQuery = useDebounce(searchQuery, 500);

  // Use GIF search hook
  const {
    gifs,
    isLoading,
    error,
    hasMore,
    trendingTerms,
    loadMore,
    isConfigured,
  } = useGifSearch(debouncedQuery || selectedCategory || undefined);

  // Handle GIF selection
  const handleSelect = useCallback(
    (gif: TenorGif) => {
      onSelect(gif);
      onClose?.();
    },
    [onSelect, onClose],
  );

  // Handle category selection
  const handleCategoryClick = useCallback((term: string) => {
    setSelectedCategory(term);
    setSearchQuery(""); // Clear search when selecting category
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory(null);
  }, []);

  // Scroll to top when query changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [debouncedQuery, selectedCategory]);

  // Show error if API is not configured
  if (!isConfigured) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8",
          className,
        )}
      >
        <ImageOff className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">GIF Search Unavailable</h3>
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Tenor API key is not configured. Add NEXT_PUBLIC_TENOR_API_KEY to your
          environment variables.
        </p>
        <p className="text-xs text-muted-foreground">
          Get a free API key at{" "}
          <a
            href="https://developers.google.com/tenor/guides/quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            developers.google.com/tenor
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex h-[500px] flex-col bg-background", className)}>
      {/* Header with search */}
      <div className="border-b p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for GIFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          {(searchQuery || selectedCategory) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Trending terms (shown when no search query) */}
        {!searchQuery && !selectedCategory && trendingTerms.length > 0 && (
          <div className="mt-3">
            <div className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Trending</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingTerms.slice(0, 8).map((term) => (
                <Button
                  key={term}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCategoryClick(term)}
                  className="h-7 text-xs"
                >
                  {term}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* GIF Grid */}
      <ScrollArea ref={scrollRef} className="flex-1">
        {error && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <ImageOff className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {isLoading && gifs.length === 0 && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && gifs.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <ImageOff className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || selectedCategory
                ? "No GIFs found"
                : "Search for GIFs above"}
            </p>
          </div>
        )}

        {gifs.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2 p-4">
              {gifs.map((gif) => (
                <GifItem key={gif.id} gif={gif} onSelect={handleSelect} />
              ))}
            </div>

            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center p-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t px-4 py-2">
        <p className="text-center text-xs text-muted-foreground">
          Powered by{" "}
          <a
            href="https://tenor.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Tenor
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Individual GIF item
 */
function GifItem({
  gif,
  onSelect,
}: {
  gif: TenorGif;
  onSelect: (gif: TenorGif) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Get preview URL (thumbnail for initial display)
  const previewUrl =
    gif.media_formats.nanogif?.url || gif.media_formats.tinygif?.url || "";

  // Get full URL (shown on hover)
  const fullUrl =
    gif.media_formats.tinymp4?.url ||
    gif.media_formats.tinygif?.url ||
    gif.media_formats.gif?.url ||
    "";

  const displayUrl = isHovered ? fullUrl : previewUrl;

  return (
    <button
      onClick={() => onSelect(gif)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "bg-muted/30 group relative overflow-hidden rounded-lg border transition-all hover:border-primary hover:shadow-md",
        "aspect-square",
      )}
    >
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageOff className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      {displayUrl && (
        <img
          src={displayUrl}
          alt={gif.content_description || gif.title}
          className={cn(
            "h-full w-full object-cover transition-opacity",
            isLoaded ? "opacity-100" : "opacity-0",
          )}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
    </button>
  );
}
