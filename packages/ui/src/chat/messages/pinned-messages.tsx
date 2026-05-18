/**
 * PinnedMessages — panel for viewing and managing pinned messages.
 *
 * No store deps — all state via PinnedMessagesAdapter (injectable).
 * Replaces usePinnedStore() with explicit prop injection.
 *
 * @module chat/messages/pinned-messages
 */

import * as React from 'react';
import { X, Pin, Settings, Search, SortAsc, SortDesc, Loader2, AlertCircle } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '../../lib/utils';
import type { PinnedMessage, PinFilters, PinSortBy, SortOrder, ChannelPinStats } from './types';

// ============================================================================
// Adapter
// ============================================================================

export interface PinnedMessagesAdapter {
  /** Whether the panel is open */
  isPanelOpen: boolean;
  /** Close the panel */
  closePanel: () => void;
  /** Pinned messages (already filtered/sorted by the adapter) */
  pins: PinnedMessage[];
  /** Stats for the current channel */
  stats: ChannelPinStats;
  /** Whether pins are loading */
  isLoading: boolean;
  /** Current filter values */
  filters: PinFilters;
  sortBy: PinSortBy;
  sortOrder: SortOrder;
  /** Setters */
  setFilters: (filters: Partial<PinFilters>) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: PinSortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  /** Unpin flow */
  openUnpinConfirm: (pin: PinnedMessage) => void;
  closeUnpinConfirm: () => void;
  isConfirmUnpinOpen: boolean;
  pinToUnpin: PinnedMessage | null;
  confirmUnpin: (pin: PinnedMessage) => Promise<void>;
  isUnpinning: boolean;
}

// ============================================================================
// Props
// ============================================================================

export interface PinnedMessagesProps {
  /** Channel ID */
  channelId: string;
  /** Channel name for display */
  channelName?: string;
  /** Injectable adapter — replaces Zustand store */
  adapter: PinnedMessagesAdapter;
  /** Callback to navigate to message */
  onJumpToMessage?: (messageId: string, channelId: string) => void;
  /** Whether user can manage pins */
  canManagePins?: boolean;
  /** Callback when settings is clicked */
  onOpenSettings?: () => void;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Pin message card
// ============================================================================

interface PinnedCardProps {
  pin: PinnedMessage;
  onJumpToMessage?: (messageId: string, channelId: string) => void;
  canUnpin: boolean;
  onUnpin: (pin: PinnedMessage) => void;
}

function PinnedCard({ pin, onJumpToMessage, canUnpin, onUnpin }: PinnedCardProps) {
  return (
    <div className="group rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {pin.message.authorAvatarUrl ? (
            <img
              src={pin.message.authorAvatarUrl}
              alt={pin.message.authorName}
              className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
              {pin.message.authorName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{pin.message.authorName}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(pin.message.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-3 text-sm text-foreground">{pin.message.content}</p>
            {pin.pinnedBy && (
              <p className="mt-1 text-xs text-muted-foreground">
                Pinned by {pin.pinnedBy.displayName} — {new Date(pin.pinnedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onJumpToMessage && (
            <button
              type="button"
              onClick={() => onJumpToMessage(pin.messageId, pin.channelId)}
              className="rounded px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
            >
              Jump
            </button>
          )}
          {canUnpin && (
            <button
              type="button"
              onClick={() => onUnpin(pin)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Unpin message"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Filters bar
// ============================================================================

interface PinnedFiltersBarProps {
  filters: PinFilters;
  sortBy: PinSortBy;
  sortOrder: SortOrder;
  onFiltersChange: (filters: Partial<PinFilters>) => void;
  onSortChange: (sortBy: PinSortBy, sortOrder: SortOrder) => void;
  onClearFilters: () => void;
}

function PinnedFiltersBar({
  filters,
  sortBy,
  sortOrder,
  onFiltersChange,
  onSortChange,
  onClearFilters,
}: PinnedFiltersBarProps) {
  const hasFilters = !!(filters.searchQuery || filters.messageType || filters.pinnedBy);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search pinned messages..."
          value={filters.searchQuery ?? ''}
          onChange={(e) => onFiltersChange({ searchQuery: e.target.value || undefined })}
          className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {sortOrder === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />}
          {sortBy === 'date' ? 'Date' : sortBy === 'author' ? 'Author' : 'Type'}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Unpin confirm dialog
// ============================================================================

interface UnpinConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pin: PinnedMessage | null;
  onConfirm: (pin: PinnedMessage) => Promise<void>;
  isLoading: boolean;
}

function UnpinConfirm({ open, onOpenChange, pin, onConfirm, isLoading }: UnpinConfirmProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-xl bg-background p-6 shadow-lg">
          <DialogPrimitive.Title className="text-base font-semibold">
            Unpin this message?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            This message will be removed from the pinned messages list in this channel.
          </DialogPrimitive.Description>
          {pin && (
            <div className="mt-3 rounded-md border bg-muted/30 p-3">
              <p className="line-clamp-3 text-sm">{pin.message.content}</p>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="rounded-lg border border-input px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                Cancel
              </button>
            </DialogPrimitive.Close>
            <button
              type="button"
              onClick={() => pin && onConfirm(pin)}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Unpin message
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ============================================================================
// PinnedMessages
// ============================================================================

/**
 * Slide-over panel for viewing and managing pinned messages in a channel.
 *
 * @example
 * ```tsx
 * <PinnedMessages
 *   channelId={currentChannelId}
 *   channelName="general"
 *   adapter={pinnedAdapter}
 *   onJumpToMessage={(msgId, chId) => navigate(chId, msgId)}
 *   canManagePins={isModerator}
 * />
 * ```
 */
export function PinnedMessages({
  channelId,
  channelName = 'Channel',
  adapter,
  onJumpToMessage,
  canManagePins = true,
  onOpenSettings,
  className,
}: PinnedMessagesProps) {
  const {
    isPanelOpen,
    closePanel,
    pins,
    stats,
    isLoading,
    filters,
    sortBy,
    sortOrder,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,
    openUnpinConfirm,
    closeUnpinConfirm,
    isConfirmUnpinOpen,
    pinToUnpin,
    confirmUnpin,
    isUnpinning,
  } = adapter;

  const handleJumpToMessage = (messageId: string, channelIdArg: string) => {
    onJumpToMessage?.(messageId, channelIdArg);
    closePanel();
  };

  return (
    <>
      {/* Slide-over */}
      <DialogPrimitive.Root open={isPanelOpen} onOpenChange={(open) => !open && closePanel()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className={cn(
              'fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-background shadow-lg duration-300',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
              'sm:max-w-[440px]',
              className
            )}
          >
            {/* Header */}
            <div className="border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pin className="h-5 w-5 text-amber-500" />
                  <DialogPrimitive.Title className="text-base font-semibold">
                    Pinned Messages
                  </DialogPrimitive.Title>
                </div>
                <div className="flex items-center gap-1">
                  {canManagePins && onOpenSettings && (
                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-muted"
                    >
                      <Settings className="h-4 w-4" />
                      <span className="sr-only">Pin settings</span>
                    </button>
                  )}
                  <DialogPrimitive.Close asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </button>
                  </DialogPrimitive.Close>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats.totalPins} pinned in #{channelName}
                {stats.remainingSlots > 0 && (
                  <span> ({stats.remainingSlots} slots remaining)</span>
                )}
              </p>
            </div>

            {/* Filters */}
            <div className="border-b px-4 py-3">
              <PinnedFiltersBar
                filters={filters}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onFiltersChange={setFilters}
                onSortChange={(sb, so) => { setSortBy(sb); setSortOrder(so); }}
                onClearFilters={clearFilters}
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Pin className="h-10 w-10 text-muted-foreground/50" />
                  <h3 className="mt-4 text-sm font-medium">No pinned messages</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {filters.searchQuery
                      ? 'No messages match your search.'
                      : 'Pin important messages in this channel.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {pins.map((pin) => (
                    <PinnedCard
                      key={pin.id}
                      pin={pin}
                      onJumpToMessage={onJumpToMessage ? handleJumpToMessage : undefined}
                      canUnpin={canManagePins}
                      onUnpin={openUnpinConfirm}
                    />
                  ))}
                </div>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Unpin confirmation */}
      <UnpinConfirm
        open={isConfirmUnpinOpen}
        onOpenChange={(open) => !open && closeUnpinConfirm()}
        pin={pinToUnpin}
        onConfirm={confirmUnpin}
        isLoading={isUnpinning}
      />
    </>
  );
}

export default PinnedMessages;
