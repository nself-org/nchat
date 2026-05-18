/**
 * EditHistory — message edit history modal and inline panel.
 *
 * No store deps — pure props. Adapter-pattern injectable callbacks.
 *
 * @module chat/messages/edit-history
 */

import { useState, useCallback } from 'react';
import { History, X, Maximize2, Minimize2, Clock, User } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';
import type { MessageEditHistory, MessageVersion } from './types';

// ============================================================================
// Types
// ============================================================================

export interface EditHistoryProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** The edit history to display */
  history: MessageEditHistory | null;
  /** Whether loading */
  isLoading?: boolean;
  /** Whether user can restore versions */
  canRestore?: boolean;
  /** Whether user can clear history */
  canClear?: boolean;
  /** Callback to restore a version */
  onRestore?: (version: MessageVersion, reason?: string) => Promise<void>;
  /** Callback to clear history */
  onClear?: (keepOriginal: boolean, reason?: string) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

export interface EditHistoryPanelProps {
  /** The edit history to display */
  history: MessageEditHistory | null;
  /** Whether loading */
  isLoading?: boolean;
  /** Maximum height */
  maxHeight?: string | number;
  /** Callback when close is requested */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Loading skeleton
// ============================================================================

function EditHistoryLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-4 gap-4 rounded-md border p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-8 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Version list item
// ============================================================================

interface VersionItemProps {
  version: MessageVersion;
  isSelected: boolean;
  onSelect: (v: MessageVersion) => void;
  canRestore: boolean;
  onRestore: (v: MessageVersion) => void;
  index: number;
  total: number;
}

function VersionItem({ version, isSelected, onSelect, canRestore, onRestore, index, total }: VersionItemProps) {
  const isLatest = index === total - 1;
  const isOriginal = index === 0;

  return (
    <div
      className={cn(
        'cursor-pointer rounded-lg border p-3 transition-colors',
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
      )}
      onClick={() => onSelect(version)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {index + 1}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {version.editedBy && (
                <span className="truncate text-sm font-medium">{version.editedBy.displayName}</span>
              )}
              {isLatest && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  Latest
                </span>
              )}
              {isOriginal && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Original
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{new Date(version.editedAt).toLocaleString()}</span>
            </div>
            {version.reason && (
              <p className="mt-1 text-xs italic text-muted-foreground">{version.reason}</p>
            )}
          </div>
        </div>
        {canRestore && !isLatest && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRestore(version);
            }}
            className="flex-shrink-0 rounded px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
          >
            Restore
          </button>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-foreground">{version.content}</p>
    </div>
  );
}

// ============================================================================
// History stats bar
// ============================================================================

function HistoryStats({ history }: { history: MessageEditHistory }) {
  return (
    <div className="grid grid-cols-3 gap-4 rounded-md border p-4">
      <div>
        <p className="text-xs text-muted-foreground">Total Edits</p>
        <p className="text-2xl font-bold">{history.editCount}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">First Edit</p>
        <p className="text-sm font-medium">{new Date(history.firstEditedAt).toLocaleDateString()}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Last Edit</p>
        <p className="text-sm font-medium">{new Date(history.lastEditedAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Version Comparison tab content
// ============================================================================

function VersionComparison({ history }: { history: MessageEditHistory }) {
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(history.versions.length - 1);

  const left = history.versions[leftIdx];
  const right = history.versions[rightIdx];

  if (!left || !right) return null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
          value={leftIdx}
          onChange={(e) => setLeftIdx(Number(e.target.value))}
        >
          {history.versions.map((v, i) => (
            <option key={v.id} value={i}>Version {i + 1} — {new Date(v.editedAt).toLocaleString()}</option>
          ))}
        </select>
        <span className="flex items-center text-muted-foreground">vs</span>
        <select
          className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
          value={rightIdx}
          onChange={(e) => setRightIdx(Number(e.target.value))}
        >
          {history.versions.map((v, i) => (
            <option key={v.id} value={i}>Version {i + 1} — {new Date(v.editedAt).toLocaleString()}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Version {leftIdx + 1}</p>
          <p className="whitespace-pre-wrap text-sm">{left.content}</p>
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Version {rightIdx + 1}</p>
          <p className="whitespace-pre-wrap text-sm">{right.content}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Original vs Current tab content
// ============================================================================

function OriginalVsCurrent({ history }: { history: MessageEditHistory }) {
  const original = history.versions[0];
  if (!original) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Original — {new Date(original.editedAt).toLocaleString()}
        </p>
        <p className="whitespace-pre-wrap text-sm">{original.content}</p>
      </div>
      <div className="rounded-md border bg-primary/5 p-3">
        <p className="mb-2 text-xs font-medium text-primary">Current version</p>
        <p className="whitespace-pre-wrap text-sm">{history.currentContent}</p>
      </div>
    </div>
  );
}

// ============================================================================
// EditHistory (modal)
// ============================================================================

/**
 * Modal edit history dialog. Tabs: History, Compare, Original.
 *
 * @example
 * ```tsx
 * <EditHistory
 *   isOpen={open}
 *   onClose={() => setOpen(false)}
 *   history={editHistory}
 *   canRestore
 *   onRestore={(v) => restore(v)}
 * />
 * ```
 */
export function EditHistory({
  isOpen,
  onClose,
  history,
  isLoading = false,
  canRestore = false,
  canClear = false,
  onRestore,
  onClear,
  className,
}: EditHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<MessageVersion | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRestore = useCallback(
    async (version: MessageVersion, reason?: string) => {
      if (!onRestore) return;
      setIsRestoring(true);
      try {
        await onRestore(version, reason);
      } finally {
        setIsRestoring(false);
      }
    },
    [onRestore]
  );

  const handleClear = useCallback(
    async (keepOriginal: boolean, reason?: string) => {
      if (!onClear) return;
      setIsDeleting(true);
      try {
        await onClear(keepOriginal, reason);
      } finally {
        setIsDeleting(false);
      }
    },
    [onClear]
  );

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 flex translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden bg-background shadow-xl duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            isFullscreen
              ? 'max-w-screen h-screen max-h-screen w-screen rounded-none'
              : 'max-h-[85vh] w-full max-w-4xl rounded-xl',
            className
          )}
        >
          {/* Header */}
          <div className="flex flex-row items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5" />
              <DialogPrimitive.Title className="text-lg font-semibold">
                Edit History
              </DialogPrimitive.Title>
              {history && (
                <span className="text-sm text-muted-foreground">
                  {history.editCount} edit{history.editCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-muted"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <EditHistoryLoading />
          ) : !history ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12">
              <History className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No Edit History</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This message has not been edited yet.
              </p>
            </div>
          ) : (
            <TabsPrimitive.Root defaultValue="history" className="flex flex-1 flex-col overflow-hidden">
              <TabsPrimitive.List className="mx-6 mt-4 flex w-fit gap-1 rounded-lg bg-muted p-1">
                {(['history', 'compare', 'original'] as const).map((tab) => (
                  <TabsPrimitive.Trigger
                    key={tab}
                    value={tab}
                    className="rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    {tab === 'history' ? 'History' : tab === 'compare' ? 'Compare' : 'Original'}
                  </TabsPrimitive.Trigger>
                ))}
              </TabsPrimitive.List>

              {/* History Tab */}
              <TabsPrimitive.Content
                value="history"
                className="flex-1 overflow-auto px-6 py-4"
              >
                <div className="space-y-6">
                  <HistoryStats history={history} />
                  <div className="space-y-3">
                    {history.versions.map((version, i) => (
                      <VersionItem
                        key={version.id}
                        version={version}
                        index={i}
                        total={history.versions.length}
                        isSelected={selectedVersion?.id === version.id}
                        onSelect={setSelectedVersion}
                        canRestore={canRestore}
                        onRestore={(v) => handleRestore(v)}
                      />
                    ))}
                  </div>
                </div>
              </TabsPrimitive.Content>

              {/* Compare Tab */}
              <TabsPrimitive.Content
                value="compare"
                className="flex-1 overflow-auto px-6 py-4"
              >
                <VersionComparison history={history} />
              </TabsPrimitive.Content>

              {/* Original Tab */}
              <TabsPrimitive.Content
                value="original"
                className="flex-1 overflow-auto px-6 py-4"
              >
                <OriginalVsCurrent history={history} />
              </TabsPrimitive.Content>
            </TabsPrimitive.Root>
          )}

          {/* Footer with admin actions */}
          {history && (canRestore || canClear) && (
            <div className="flex items-center justify-between border-t px-6 py-4">
              <div>
                {selectedVersion && canRestore && onRestore && (
                  <button
                    type="button"
                    onClick={() => handleRestore(selectedVersion)}
                    disabled={isRestoring}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isRestoring ? 'Restoring...' : `Restore version ${history.versions.indexOf(selectedVersion) + 1}`}
                  </button>
                )}
              </div>
              <div>
                {canClear && onClear && (
                  <button
                    type="button"
                    onClick={() => handleClear(false)}
                    disabled={isDeleting}
                    className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                  >
                    {isDeleting ? 'Clearing...' : 'Clear history'}
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ============================================================================
// EditHistoryPanel (inline)
// ============================================================================

/**
 * Compact inline edit history panel for embedding in message view.
 */
export function EditHistoryPanel({
  history,
  isLoading = false,
  maxHeight = 300,
  onClose,
  className,
}: EditHistoryPanelProps) {
  if (isLoading) {
    return (
      <div className={cn('rounded-md border bg-card p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-16 w-full animate-pulse rounded bg-muted" />
          <div className="h-16 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!history || history.versions.length === 0) {
    return (
      <div className={cn('rounded-md border bg-card p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <History className="h-4 w-4" />
            <span className="text-sm">No edit history</span>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border bg-card', className)}>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Edit History ({history.editCount} edit{history.editCount !== 1 ? 's' : ''})
          </span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div
        className="overflow-y-auto p-2"
        style={{ maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}
      >
        <div className="space-y-2">
          {history.versions.map((version, i) => (
            <div key={version.id} className="rounded border bg-muted/30 p-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">v{i + 1}</span>
                {version.editedBy && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {version.editedBy.displayName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(version.editedAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm">{version.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EditHistory;
