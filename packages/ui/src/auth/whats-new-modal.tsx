/**
 * WhatsNewModal — modal listing new features/improvements/fixes.
 *
 * Injectable: all store ops come via WhatsNewAdapter — no store deps.
 * Uses native HTML dialog pattern (role="dialog") instead of Radix Dialog.
 *
 * @module auth/whats-new-modal
 */

import { useCallback } from 'react';
import { X, ExternalLink, Sparkles, Zap, Bug, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// Types (inlined — not available in packages/ui scope)
// ============================================================================

export interface WhatsNewItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
  learnMoreUrl?: string;
  releaseDate: Date;
  category: 'feature' | 'improvement' | 'fix';
}

export interface WhatsNewAdapter {
  open: boolean;
  items: WhatsNewItem[];
  onSeeItem: (itemId: string) => void;
  onSeeAll: () => void;
  onDismiss: (days?: number) => void;
  onClose: () => void;
}

export interface WhatsNewModalProps {
  adapter: WhatsNewAdapter;
}

// ============================================================================
// Helpers
// ============================================================================

function getCategoryIcon(category: WhatsNewItem['category']) {
  switch (category) {
    case 'feature':
      return <Sparkles className="h-4 w-4" />;
    case 'improvement':
      return <Zap className="h-4 w-4" />;
    case 'fix':
      return <Bug className="h-4 w-4" />;
  }
}

function getCategoryColor(category: WhatsNewItem['category']): string {
  switch (category) {
    case 'feature':
      return 'bg-green-500/10 text-green-600 dark:text-green-400';
    case 'improvement':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'fix':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

// ============================================================================
// WhatsNewModal
// ============================================================================

/**
 * Modal that surfaces new feature announcements. Consumes a WhatsNewAdapter
 * interface — no store coupling. Native HTML overlay (no Radix Dialog).
 */
export function WhatsNewModal({ adapter }: WhatsNewModalProps) {
  const { open, items, onSeeItem, onSeeAll, onDismiss, onClose } = adapter;

  const handleGotIt = useCallback(() => {
    onSeeAll();
    onClose();
  }, [onSeeAll, onClose]);

  const handleItemClick = useCallback(
    (item: WhatsNewItem) => {
      onSeeItem(item.id);
      if (item.learnMoreUrl) {
        window.open(item.learnMoreUrl, '_blank', 'noopener,noreferrer');
      }
    },
    [onSeeItem]
  );

  if (!open || items.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="What's New"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">What's New</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 transition-colors hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Items list */}
        <div className="max-h-[400px] space-y-4 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'rounded-lg border border-zinc-200 p-4 dark:border-zinc-700',
                'transition-colors hover:border-primary/50',
                item.learnMoreUrl && 'cursor-pointer'
              )}
              onClick={() => handleItemClick(item)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && item.learnMoreUrl) {
                  e.preventDefault();
                  handleItemClick(item);
                }
              }}
              role={item.learnMoreUrl ? 'button' : undefined}
              tabIndex={item.learnMoreUrl ? 0 : undefined}
            >
              {/* Item header */}
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* Category badge */}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      getCategoryColor(item.category)
                    )}
                  >
                    {getCategoryIcon(item.category)}
                    {item.category}
                  </span>
                  <span className="text-xs text-zinc-500">{formatDate(item.releaseDate)}</span>
                </div>

                {item.learnMoreUrl && <ExternalLink className="h-4 w-4 text-zinc-400" />}
              </div>

              {/* Item title */}
              <h3 className="mb-1 font-semibold text-zinc-900 dark:text-white">{item.title}</h3>

              {/* Item description */}
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.description}</p>

              {item.learnMoreUrl && (
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Learn more
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => onDismiss(7)}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Remind me later
          </button>

          <button
            type="button"
            onClick={handleGotIt}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium',
              'bg-primary text-primary-foreground',
              'transition-opacity hover:opacity-90'
            )}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export default WhatsNewModal;
