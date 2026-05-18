"use client";

/**
 * GIF Categories Component
 *
 * Category browser with icons and click-to-browse functionality.
 *
 * @example
 * ```tsx
 * <GifCategories
 *   categories={categories}
 *   onSelect={handleCategorySelect}
 *   loading={loading}
 * />
 * ```
 */

import { memo, useCallback } from "react";
import {
  Smile,
  Film,
  Trophy,
  Sticker,
  Cat,
  Laugh,
  Gamepad2,
  Heart,
  Zap,
  Tv2,
  Sparkles,
  Star,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { GifCategory, GifCategoriesProps } from "@/types/gif";

// ============================================================================
// Category Icons Mapping
// ============================================================================

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  reactions: Smile,
  entertainment: Film,
  sports: Trophy,
  stickers: Sticker,
  animals: Cat,
  memes: Laugh,
  gaming: Gamepad2,
  emotions: Heart,
  actions: Zap,
  anime: Tv2,
  cartoons: Sparkles,
  celebrities: Star,
  // Fallback
  default: Sparkles,
};

/**
 * Get icon component for a category
 */
function getCategoryIcon(
  categoryId: string,
): React.ComponentType<{ className?: string }> {
  const normalizedId = categoryId.toLowerCase().replace(/[^a-z]/g, "");
  return CATEGORY_ICONS[normalizedId] || CATEGORY_ICONS.default;
}

// ============================================================================
// Category Card Component
// ============================================================================

interface CategoryCardProps {
  category: GifCategory;
  onClick: (category: GifCategory) => void;
}

const CategoryCard = memo(function CategoryCard({
  category,
  onClick,
}: CategoryCardProps) {
  const Icon = getCategoryIcon(category.id);

  const handleClick = useCallback(() => {
    onClick(category);
  }, [category, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(category);
      }
    },
    [category, onClick],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex flex-col items-center justify-center",
        "rounded-xl p-3",
        "bg-muted/30 hover:bg-muted/50",
        "border border-transparent hover:border-border",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        "transition-all duration-200",
        "group cursor-pointer",
        "min-h-[80px]",
      )}
    >
      {/* Preview GIF (if available) */}
      {category.previewGif && (
        <div
          className={cn(
            "absolute inset-0 overflow-hidden rounded-xl",
            "opacity-0 group-hover:opacity-30",
            "transition-opacity duration-300",
          )}
        >
          <img
            src={category.previewGif.previewUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Icon */}
      <div
        className={cn(
          "relative z-10",
          "rounded-full p-2",
          "bg-primary/10 group-hover:bg-primary/20",
          "transition-colors duration-200",
        )}
      >
        <Icon className="h-5 w-5 text-primary" />
      </div>

      {/* Label */}
      <span
        className={cn(
          "relative z-10 mt-2",
          "text-xs font-medium text-foreground",
          "max-w-full truncate px-1",
        )}
      >
        {category.name}
      </span>
    </button>
  );
});

// ============================================================================
// GIF Categories Grid
// ============================================================================

export const GifCategories = memo(function GifCategories({
  categories,
  onSelect,
  loading = false,
  className,
}: GifCategoriesProps) {
  const handleSelect = useCallback(
    (category: GifCategory) => {
      onSelect(category);
    },
    [onSelect],
  );

  // Loading state
  if (loading) {
    return (
      <div className={cn("grid grid-cols-3 gap-2", className)}>
        {Array.from({ length: 9 }).map((_, i) => (
          <CategoryCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (categories.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-center",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">No categories available</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          onClick={handleSelect}
        />
      ))}
    </div>
  );
});

// ============================================================================
// Category Card Skeleton
// ============================================================================

function CategoryCardSkeleton() {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        "rounded-xl p-3",
        "bg-muted/30",
        "min-h-[80px]",
      )}
    >
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="mt-2 h-3 w-16 rounded" />
    </div>
  );
}

// ============================================================================
// Inline Category Pills
// ============================================================================

export interface GifCategoryPillsProps {
  categories: GifCategory[];
  selectedCategory?: string | null;
  onSelect: (category: GifCategory) => void;
  className?: string;
}

export const GifCategoryPills = memo(function GifCategoryPills({
  categories,
  selectedCategory,
  onSelect,
  className,
}: GifCategoryPillsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto",
        "-mx-1 px-1 py-1",
        "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
        className,
      )}
    >
      {categories.slice(0, 10).map((category) => {
        const isSelected = selectedCategory === category.id;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category)}
            className={cn(
              "flex-shrink-0 rounded-full px-3 py-1.5",
              "whitespace-nowrap text-xs font-medium",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              isSelected
                ? "text-primary-foreground bg-primary"
                : "bg-muted/50 text-foreground hover:bg-muted",
            )}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
});

// ============================================================================
// Popular Categories (Static list for quick access)
// ============================================================================

export interface PopularCategoriesProps {
  onSelect: (query: string) => void;
  className?: string;
}

const POPULAR_SEARCHES = [
  { emoji: "👋", label: "Hello", query: "hello wave" },
  { emoji: "😂", label: "Funny", query: "funny laugh" },
  { emoji: "👍", label: "Thumbs Up", query: "thumbs up" },
  { emoji: "🎉", label: "Celebrate", query: "celebrate party" },
  { emoji: "😭", label: "Crying", query: "crying sad" },
  { emoji: "🔥", label: "Fire", query: "fire hot" },
  { emoji: "😍", label: "Love", query: "love heart" },
  { emoji: "👏", label: "Clap", query: "clapping applause" },
  { emoji: "🤔", label: "Thinking", query: "thinking hmm" },
  { emoji: "🙄", label: "Eye Roll", query: "eye roll annoyed" },
  { emoji: "💪", label: "Strong", query: "strong muscles" },
  { emoji: "🤦", label: "Facepalm", query: "facepalm" },
];

export function PopularCategories({
  onSelect,
  className,
}: PopularCategoriesProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <span className="px-1 text-xs font-medium text-muted-foreground">
        Popular Searches
      </span>
      <div className="grid grid-cols-4 gap-1.5">
        {POPULAR_SEARCHES.map((item) => (
          <button
            key={item.query}
            type="button"
            onClick={() => onSelect(item.query)}
            className={cn(
              "flex flex-col items-center justify-center",
              "rounded-lg p-2",
              "bg-muted/30 hover:bg-muted/50",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
          >
            <span className="text-lg">{item.emoji}</span>
            <span className="mt-0.5 max-w-full truncate text-[10px] text-muted-foreground">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default GifCategories;
