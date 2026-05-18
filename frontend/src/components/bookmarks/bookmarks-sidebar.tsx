"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useBookmarkCount,
  useRecentBookmarks,
  useBookmarkPanel,
} from "@/lib/bookmarks/use-bookmarks";
import { useBookmarkStore } from "@/lib/bookmarks/bookmark-store";
import { BookmarkItem } from "./bookmark-item";

// ============================================================================
// Types
// ============================================================================

export interface BookmarksSidebarProps {
  collapsed?: boolean;
  onOpenPanel?: () => void;
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function BookmarkIcon({
  className,
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  if (filled) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn("h-5 w-5", className)}
      >
        <path
          fillRule="evenodd"
          d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-5 w-5", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
      />
    </svg>
  );
}

// ============================================================================
// Collapsed Sidebar Button
// ============================================================================

interface CollapsedButtonProps {
  count: number;
  onClick: () => void;
}

function CollapsedButton({ count, onClick }: CollapsedButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10"
            onClick={onClick}
          >
            <BookmarkIcon className="h-5 w-5" />
            {count > 0 && (
              <Badge
                variant="secondary"
                className="absolute -right-1 -top-1 h-5 min-w-[20px] px-1 text-xs"
              >
                {count > 99 ? "99+" : count}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Saved Items ({count})</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Bookmarks Sidebar Component
// ============================================================================

export function BookmarksSidebar({
  collapsed = false,
  onOpenPanel,
  className,
}: BookmarksSidebarProps) {
  const { count, loading: countLoading } = useBookmarkCount();
  const { recentBookmarks, loading: recentLoading } = useRecentBookmarks(5);
  const { open: openPanel } = useBookmarkPanel();

  const [isExpanded, setIsExpanded] = React.useState(true);

  const handleOpenPanel = () => {
    if (onOpenPanel) {
      onOpenPanel();
    } else {
      openPanel();
    }
  };

  // Collapsed view - just show icon with badge
  if (collapsed) {
    return (
      <div className={cn("py-2", className)}>
        <CollapsedButton count={count} onClick={handleOpenPanel} />
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDownIcon
                className={cn(
                  "h-4 w-4 transition-transform",
                  !isExpanded && "-rotate-90",
                )}
              />
              <BookmarkIcon className="h-4 w-4" />
              <span>Saved Items</span>
              {!countLoading && count > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              )}
            </button>
          </CollapsibleTrigger>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleOpenPanel}
                >
                  <ArrowRightIcon className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>View all saved items</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-2 py-1">
            {recentLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : recentBookmarks.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                <BookmarkIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No saved items yet</p>
                <p className="mt-1 text-xs">
                  Click the bookmark icon on any message to save it
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1">
                  {recentBookmarks.map((bookmark) => (
                    <BookmarkItem
                      key={bookmark.id}
                      bookmark={bookmark}
                      compact
                      showChannel
                    />
                  ))}
                </div>
                {count > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full text-xs text-muted-foreground"
                    onClick={handleOpenPanel}
                  >
                    View all {count} saved items
                  </Button>
                )}
              </ScrollArea>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ============================================================================
// Sidebar Section Link (Alternative minimal version)
// ============================================================================

export interface BookmarksSidebarLinkProps {
  collapsed?: boolean;
  onClick?: () => void;
  className?: string;
}

export function BookmarksSidebarLink({
  collapsed = false,
  onClick,
  className,
}: BookmarksSidebarLinkProps) {
  const { count, loading } = useBookmarkCount();
  const { open: openPanel } = useBookmarkPanel();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      openPanel();
    }
  };

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("relative h-10 w-10", className)}
              onClick={handleClick}
            >
              <BookmarkIcon className="h-5 w-5" />
              {!loading && count > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -right-1 -top-1 h-5 min-w-[20px] px-1 text-xs"
                >
                  {count > 99 ? "99+" : count}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Saved Items ({count})</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors",
        "text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <BookmarkIcon className="h-4 w-4" />
        <span className="text-sm">Saved Items</span>
      </div>
      {!loading && count > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {count}
        </Badge>
      )}
    </button>
  );
}

export default BookmarksSidebar;
