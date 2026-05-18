"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Plus, Minus, Check, Package, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StickerPack, Sticker } from "@/graphql/stickers";

// ============================================================================
// TYPES
// ============================================================================

export interface StickerPackProps {
  pack: StickerPack;
  isInstalled?: boolean;
  onClick?: (pack: StickerPack) => void;
  onAdd?: (pack: StickerPack) => Promise<void>;
  onRemove?: (pack: StickerPack) => Promise<void>;
  variant?: "default" | "compact" | "detailed";
  showActions?: boolean;
  className?: string;
}

export interface StickerPackPreviewProps {
  pack: StickerPack;
  stickers: Sticker[];
  isInstalled?: boolean;
  onAdd?: (pack: StickerPack) => Promise<void>;
  onRemove?: (pack: StickerPack) => Promise<void>;
  onStickerClick?: (sticker: Sticker) => void;
  loading?: boolean;
  className?: string;
}

export interface StickerPackTabProps {
  pack: StickerPack;
  isActive?: boolean;
  onClick?: (pack: StickerPack) => void;
  showCount?: boolean;
  className?: string;
}

// ============================================================================
// STICKER PACK COMPONENT
// ============================================================================

export function StickerPackItem({
  pack,
  isInstalled = false,
  onClick,
  onAdd,
  onRemove,
  variant = "default",
  showActions = true,
  className,
}: StickerPackProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAction = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLoading) return;

      setIsLoading(true);
      try {
        if (isInstalled && onRemove) {
          await onRemove(pack);
        } else if (!isInstalled && onAdd) {
          await onAdd(pack);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isInstalled, isLoading, onAdd, onRemove, pack],
  );

  const handleClick = useCallback(() => {
    onClick?.(pack);
  }, [onClick, pack]);

  // Compact variant (for tabs/list)
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg p-2",
          "transition-colors hover:bg-accent",
          className,
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-md bg-muted">
          {imageError ? (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-4 w-4 text-muted-foreground" />
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
        </div>
        <span className="truncate text-sm font-medium">{pack.name}</span>
        {pack.is_official && (
          <Sparkles className="h-3 w-3 flex-shrink-0 text-primary" />
        )}
      </div>
    );
  }

  // Detailed variant (for pack preview)
  if (variant === "detailed") {
    return (
      <div
        className={cn(
          "flex items-start gap-4 rounded-xl border bg-card p-4",
          onClick && "hover:bg-accent/50 cursor-pointer transition-colors",
          className,
        )}
        onClick={onClick ? handleClick : undefined}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClick();
                }
              }
            : undefined
        }
      >
        {/* Thumbnail */}
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {imageError ? (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground" />
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
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">
              {pack.name}
            </h3>
            {pack.is_official && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="mr-1 h-3 w-3" />
                Official
              </Badge>
            )}
            {pack.is_animated && (
              <Badge variant="outline" className="text-xs">
                Animated
              </Badge>
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
          </div>
        </div>

        {/* Action Button */}
        {showActions && (onAdd || onRemove) && (
          <Button
            variant={isInstalled ? "outline" : "default"}
            size="sm"
            onClick={handleAction}
            disabled={isLoading}
            className="flex-shrink-0"
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
        )}
      </div>
    );
  }

  // Default variant (card style)
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card",
        onClick && "cursor-pointer transition-shadow hover:shadow-md",
        className,
      )}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      {/* Thumbnail */}
      <div className="relative aspect-square w-full bg-muted">
        {imageError ? (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
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
          {pack.is_animated && (
            <Badge
              variant="outline"
              className="bg-background/80 text-xs backdrop-blur-sm"
            >
              Animated
            </Badge>
          )}
        </div>
        {/* Installed check */}
        {isInstalled && (
          <div className="text-primary-foreground absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="truncate text-sm font-medium">{pack.name}</h3>
        <p className="text-xs text-muted-foreground">
          {pack.sticker_count} stickers
        </p>
      </div>

      {/* Action Button */}
      {showActions && (onAdd || onRemove) && (
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
                <Minus className="mr-1 h-4 w-4" />
                Remove
              </>
            ) : (
              <>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STICKER PACK TAB
// ============================================================================

export function StickerPackTab({
  pack,
  isActive = false,
  onClick,
  showCount = false,
  className,
}: StickerPackTabProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onClick?.(pack)}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 rounded-lg p-2 transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive && "bg-accent",
        className,
      )}
      title={pack.name}
    >
      <div className="relative h-8 w-8 overflow-hidden rounded-md bg-muted">
        {imageError ? (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-4 w-4 text-muted-foreground" />
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
      </div>
      {showCount && (
        <span className="text-[10px] text-muted-foreground">
          {pack.sticker_count}
        </span>
      )}
      {isActive && (
        <div className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary" />
      )}
    </button>
  );
}

// ============================================================================
// STICKER PACK PREVIEW (full pack with stickers)
// ============================================================================

export function StickerPackPreview({
  pack,
  stickers,
  isInstalled = false,
  onAdd,
  onRemove,
  onStickerClick,
  loading = false,
  className,
}: StickerPackPreviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAction = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isInstalled && onRemove) {
        await onRemove(pack);
      } else if (!isInstalled && onAdd) {
        await onAdd(pack);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isInstalled, isLoading, onAdd, onRemove, pack]);

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center gap-4 border-b p-4">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {imageError ? (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground" />
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
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{pack.name}</h3>
            {pack.is_official && (
              <Sparkles className="h-4 w-4 flex-shrink-0 text-primary" />
            )}
          </div>
          {pack.description && (
            <p className="mb-1 line-clamp-1 text-sm text-muted-foreground">
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
        {(onAdd || onRemove) && (
          <Button
            variant={isInstalled ? "outline" : "default"}
            onClick={handleAction}
            disabled={isLoading || loading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isInstalled ? (
              <>
                <Minus className="mr-2 h-4 w-4" />
                Remove
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Pack
              </>
            )}
          </Button>
        )}
      </div>

      {/* Stickers Preview */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : stickers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No stickers in this pack
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {stickers.slice(0, 15).map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                onClick={() => onStickerClick?.(sticker)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg bg-muted",
                  "transition-colors hover:bg-accent",
                  onStickerClick && "cursor-pointer",
                )}
              >
                <Image
                  src={sticker.thumbnail_url || sticker.url}
                  alt={sticker.name || "Sticker"}
                  fill
                  className="object-contain p-1"
                />
              </button>
            ))}
            {stickers.length > 15 && (
              <div className="flex aspect-square items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                +{stickers.length - 15}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STICKER PACK SKELETON
// ============================================================================

export function StickerPackSkeleton({
  variant = "default",
}: {
  variant?: "default" | "compact" | "detailed";
}) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 p-2">
        <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div className="flex items-start gap-4 rounded-xl border bg-card p-4">
        <div className="h-20 w-20 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export default StickerPackItem;
