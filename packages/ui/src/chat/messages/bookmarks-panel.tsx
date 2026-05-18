/**
 * BookmarksPanel — slide-over and inline panels for saved/bookmarked messages.
 *
 * No store deps — all state via BookmarksAdapter (injectable).
 * Replaces useBookmarks / useBookmarkFilters / useBookmarkPanel / useBookmarkStore.
 *
 * @module chat/messages/bookmarks-panel
 */

import * as React from 'react';
import { X, Search, SortAsc, SortDesc, FolderOpen, Loader2, Hash } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Bookmark, BookmarkFolder, BookmarkSortBy, SortOrder } from './types';

// ============================================================================
// Adapter
// ============================================================================

export interface BookmarksAdapter {
  /** Bookmarks to display (already filtered/sorted) */
  bookmarks: Bookmark[];
  /** All bookmark folders */
  folders: BookmarkFolder[];
  /** Available channels for filtering */
  channels: Array<{ id: string; name: string }>;
  /** Whether bookmarks are loading */
  loading: boolean;
  /** Whether more bookmarks can be loaded */
  hasMore: boolean;
  /** Load the next page */
  loadMore: () => void;
  /** Current filter state */
  searchQuery: string;
  sortBy: BookmarkSortBy;
  sortOrder: SortOrder;
  selectedChannelFilter: string | null;
  selectedFolderFilter: string | null;
  /** Filter setters */
  setSearchQuery: (q: string) => void;
  setSortBy: (by: BookmarkSortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setChannelFilter: (channelId: string | null) => void;
  setFolderFilter: (folderId: string | null) => void;
  clearFilters: () => void;
}

// ============================================================================
// Props
// ============================================================================

export interface BookmarksPanelProps {
  /** Whether the slide-over is open */
  open?: boolean;
  /** Called when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Callback to jump to a message in the chat */
  onJumpToMessage?: (messageId: string, channelId: string) => void;
  /** Injectable adapter */
  adapter: BookmarksAdapter;
  className?: string;
}

export interface InlineBookmarksPanelProps {
  /** Callback to jump to a message in the chat */
  onJumpToMessage?: (messageId: string, channelId: string) => void;
  /** Injectable adapter */
  adapter: BookmarksAdapter;
  className?: string;
}

// ============================================================================
// SVG icons (inlined — not available in lucide-react)
// ============================================================================

function BookmarkIconFilled({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-5 w-5', className)}
    >
      <path
        fillRule="evenodd"
        d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function BookmarkIconOutline({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn('h-5 w-5', className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
      />
    </svg>
  );
}

// ============================================================================
// Empty state
// ============================================================================

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <BookmarkIconOutline className="mb-4 h-12 w-12 text-muted-foreground/50" />
      {hasFilters ? (
        <>
          <h3 className="mb-2 text-lg font-medium">No matching saved items</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or search query.
          </p>
        </>
      ) : (
        <>
          <h3 className="mb-2 text-lg font-medium">No saved items yet</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Save messages by clicking the bookmark icon on any message.
          </p>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Loading state
// ============================================================================

function LoadingState() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Bookmark item card
// ============================================================================

interface BookmarkCardProps {
  bookmark: Bookmark;
  onJumpToMessage?: (messageId: string, channelId: string) => void;
}

function BookmarkCard({ bookmark, onJumpToMessage }: BookmarkCardProps) {
  return (
    <div className="group rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50">
      <div className="flex items-start gap-3">
        {bookmark.message.authorAvatarUrl ? (
          <img
            src={bookmark.message.authorAvatarUrl}
            alt={bookmark.message.authorName}
            className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
            {bookmark.message.authorName.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{bookmark.message.authorName}</span>
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              {bookmark.message.channel.name}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-3 text-sm">{bookmark.message.content}</p>
          {bookmark.note && (
            <p className="mt-1 text-xs italic text-muted-foreground">{bookmark.note}</p>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Saved {new Date(bookmark.savedAt).toLocaleDateString()}</span>
            {bookmark.folder && (
              <span className="flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />
                {bookmark.folder.name}
              </span>
            )}
          </div>
        </div>
        {onJumpToMessage && (
          <button
            type="button"
            onClick={() => onJumpToMessage(bookmark.messageId, bookmark.message.channel.id)}
            className="flex-shrink-0 rounded px-2 py-1 text-xs text-primary opacity-0 transition-all hover:bg-primary/10 group-hover:opacity-100"
          >
            Jump
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Folders sidebar
// ============================================================================

interface FoldersSidebarProps {
  folders: BookmarkFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
}

function FoldersSidebar({ folders, selectedFolderId, onSelectFolder }: FoldersSidebarProps) {
  return (
    <div className="w-48 flex-shrink-0 overflow-y-auto border-r p-2">
      <button
        type="button"
        onClick={() => onSelectFolder(null)}
        className={cn(
          'w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
          selectedFolderId === null && 'bg-muted font-medium'
        )}
      >
        All saved items
      </button>
      {folders.length > 0 && (
        <>
          <div className="my-1 h-px bg-border" />
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                selectedFolderId === folder.id && 'bg-muted font-medium'
              )}
            >
              <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="flex-1 truncate">{folder.name}</span>
              {folder.bookmarkCount !== undefined && (
                <span className="text-xs text-muted-foreground">{folder.bookmarkCount}</span>
              )}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

// ============================================================================
// Sort select (minimal, no Radix Select to avoid dep issues)
// ============================================================================

interface SortSelectProps {
  value: string;
  onChange: (value: string) => void;
}

function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="date-desc">Newest first</option>
      <option value="date-asc">Oldest first</option>
      <option value="channel">By channel</option>
      <option value="folder">By folder</option>
    </select>
  );
}

// ============================================================================
// Channel filter select
// ============================================================================

interface ChannelFilterSelectProps {
  channels: Array<{ id: string; name: string }>;
  value: string | null;
  onChange: (id: string | null) => void;
}

function ChannelFilterSelect({ channels, value, onChange }: ChannelFilterSelectProps) {
  return (
    <select
      value={value ?? 'all'}
      onChange={(e) => onChange(e.target.value === 'all' ? null : e.target.value)}
      className="h-8 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="all">All channels</option>
      {channels.map((ch) => (
        <option key={ch.id} value={ch.id}>
          # {ch.name}
        </option>
      ))}
    </select>
  );
}

// ============================================================================
// Panel content (shared between slide-over and inline)
// ============================================================================

function BookmarksPanelContent({
  adapter,
  onJumpToMessage,
}: {
  adapter: BookmarksAdapter;
  onJumpToMessage?: (messageId: string, channelId: string) => void;
}) {
  const {
    bookmarks,
    folders,
    channels,
    loading,
    hasMore,
    loadMore,
    searchQuery,
    sortBy,
    sortOrder,
    selectedChannelFilter,
    selectedFolderFilter,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setChannelFilter,
    setFolderFilter,
    clearFilters,
  } = adapter;

  const [showFilters, setShowFilters] = React.useState(false);
  const hasFilters = !!(searchQuery || selectedChannelFilter || selectedFolderFilter);

  const getSortValue = (): string => {
    if (sortBy === 'date' && sortOrder === 'desc') return 'date-desc';
    if (sortBy === 'date' && sortOrder === 'asc') return 'date-asc';
    if (sortBy === 'channel') return 'channel';
    if (sortBy === 'folder') return 'folder';
    return 'date-desc';
  };

  const handleSortChange = (value: string) => {
    if (value === 'date-desc') { setSortBy('date'); setSortOrder('desc'); }
    else if (value === 'date-asc') { setSortBy('date'); setSortOrder('asc'); }
    else if (value === 'channel') { setSortBy('channel'); setSortOrder('asc'); }
    else if (value === 'folder') { setSortBy('folder'); setSortOrder('asc'); }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search and Filters */}
      <div className="space-y-3 border-b p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search saved items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-1.5 pl-9 pr-9 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors hover:bg-muted',
              showFilters && 'bg-accent'
            )}
          >
            <Search className="h-3.5 w-3.5" />
            Filters
            {hasFilters && (
              <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {[searchQuery, selectedChannelFilter, selectedFolderFilter].filter(Boolean).length}
              </span>
            )}
          </button>
          <SortSelect value={getSortValue()} onChange={handleSortChange} />
        </div>

        {showFilters && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <ChannelFilterSelect
                channels={channels}
                value={selectedChannelFilter}
                onChange={setChannelFilter}
              />
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Folders sidebar */}
        <FoldersSidebar
          folders={folders}
          selectedFolderId={selectedFolderFilter}
          onSelectFolder={setFolderFilter}
        />

        {/* Bookmarks list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <LoadingState />
          ) : bookmarks.length === 0 ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            <div className="space-y-3 p-4">
              <p className="text-sm text-muted-foreground">
                {bookmarks.length} saved item{bookmarks.length !== 1 ? 's' : ''}
                {hasFilters && ' (filtered)'}
              </p>
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onJumpToMessage={onJumpToMessage}
                />
              ))}
              {hasMore && (
                <div className="py-4 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    className="rounded-lg border border-input px-4 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    Load more
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BookmarksPanel (slide-over)
// ============================================================================

/**
 * Slide-over panel for saved/bookmarked messages.
 *
 * @example
 * ```tsx
 * <BookmarksPanel
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   adapter={bookmarksAdapter}
 *   onJumpToMessage={(msgId, chId) => navigate(chId, msgId)}
 * />
 * ```
 */
export function BookmarksPanel({
  open,
  onOpenChange,
  onJumpToMessage,
  adapter,
  className,
}: BookmarksPanelProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col bg-background shadow-lg duration-300',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            'sm:max-w-2xl',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <BookmarkIconFilled className="h-5 w-5 text-yellow-500" />
              <DialogPrimitive.Title className="text-lg font-semibold">
                Saved Items
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="h-[calc(100vh-57px)]">
            <BookmarksPanelContent adapter={adapter} onJumpToMessage={onJumpToMessage} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ============================================================================
// InlineBookmarksPanel
// ============================================================================

/**
 * Inline bookmarks panel for embedding directly in a page layout.
 *
 * @example
 * ```tsx
 * <InlineBookmarksPanel
 *   adapter={bookmarksAdapter}
 *   onJumpToMessage={(msgId, chId) => navigate(chId, msgId)}
 * />
 * ```
 */
export function InlineBookmarksPanel({ onJumpToMessage, adapter, className }: InlineBookmarksPanelProps) {
  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      <div className="border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookmarkIconFilled className="h-5 w-5 text-yellow-500" />
          Saved Items
        </h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <BookmarksPanelContent adapter={adapter} onJumpToMessage={onJumpToMessage} />
      </div>
    </div>
  );
}

export default BookmarksPanel;
