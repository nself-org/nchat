/**
 * JoinChannelsStep — onboarding channel discovery step.
 *
 * Decoupled from app internals: all state via props.
 *
 * @module auth/join-channels-step
 */

import { useState, useMemo } from 'react';
import { Search, Hash, Users, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import type { OnboardingStepProps, SuggestedChannel } from './onboarding-types';

// ============================================================================
// Default channels (demo data)
// ============================================================================

const DEFAULT_SUGGESTED_CHANNELS: SuggestedChannel[] = [
  {
    id: '1',
    name: 'general',
    slug: 'general',
    description: 'Company-wide announcements and water-cooler conversation',
    memberCount: 120,
    category: 'Company',
    isDefault: true,
    isRecommended: true,
  },
  {
    id: '2',
    name: 'random',
    slug: 'random',
    description: 'Non-work banter and fun stuff',
    memberCount: 98,
    category: 'Company',
    isDefault: true,
    isRecommended: false,
  },
  {
    id: '3',
    name: 'engineering',
    slug: 'engineering',
    description: 'All things engineering',
    memberCount: 42,
    category: 'Team',
    isDefault: false,
    isRecommended: true,
  },
  {
    id: '4',
    name: 'design',
    slug: 'design',
    description: 'UI/UX discussions and design system updates',
    memberCount: 18,
    category: 'Team',
    isDefault: false,
    isRecommended: false,
  },
  {
    id: '5',
    name: 'marketing',
    slug: 'marketing',
    description: 'Campaigns, launches, and brand updates',
    memberCount: 27,
    category: 'Team',
    isDefault: false,
    isRecommended: false,
  },
  {
    id: '6',
    name: 'introductions',
    slug: 'introductions',
    description: 'Say hello! New members introduce themselves here',
    memberCount: 87,
    category: 'Community',
    isDefault: false,
    isRecommended: true,
  },
];

// ============================================================================
// Types
// ============================================================================

export interface JoinChannelsStepProps extends OnboardingStepProps {
  /** Available channels to join. Defaults to demo set when not provided. */
  suggestedChannels?: SuggestedChannel[];
  /** Initially selected channel IDs */
  initialSelectedIds?: string[];
  onDataChange?: (selectedChannelIds: string[]) => void;
  className?: string;
}

// ============================================================================
// JoinChannelsStep
// ============================================================================

/**
 * Channel discovery step — search, filter by category, select/deselect channels.
 *
 * @example
 * ```tsx
 * <JoinChannelsStep
 *   onNext={handleNext}
 *   onPrev={handlePrev}
 *   isFirst={false}
 *   isLast={false}
 *   canSkip
 *   onSkip={handleSkip}
 *   suggestedChannels={channels}
 *   onDataChange={(ids) => store.setSelectedChannels(ids)}
 * />
 * ```
 */
export function JoinChannelsStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  canSkip,
  suggestedChannels = DEFAULT_SUGGESTED_CHANNELS,
  initialSelectedIds,
  onDataChange,
  className,
}: JoinChannelsStepProps) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const defaults = suggestedChannels
      .filter((c) => c.isDefault)
      .map((c) => c.id);
    return new Set(initialSelectedIds ?? defaults);
  });

  const categories = useMemo(() => {
    const cats = new Set(suggestedChannels.map((c) => c.category ?? 'Other'));
    return Array.from(cats);
  }, [suggestedChannels]);

  const filtered = useMemo(() => {
    if (!query.trim()) return suggestedChannels;
    const lower = query.toLowerCase();
    return suggestedChannels.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        (c.description ?? '').toLowerCase().includes(lower)
    );
  }, [suggestedChannels, query]);

  const grouped = useMemo(() => {
    return categories.reduce<Record<string, SuggestedChannel[]>>((acc, cat) => {
      acc[cat] = filtered.filter((c) => (c.category ?? 'Other') === cat);
      return acc;
    }, {});
  }, [filtered, categories]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onDataChange?.(Array.from(next));
      return next;
    });
  }

  return (
    <div className={cn('w-full max-w-lg', className)}>
      <h2 className="mb-1 text-2xl font-bold text-foreground">Join Channels</h2>
      <p className="mb-6 text-muted-foreground">
        Find channels that interest you. You can join or leave at any time.
      </p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search channels…"
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        />
      </div>

      {/* Channel list */}
      <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
        {categories.map((cat) => {
          const channels = grouped[cat];
          if (!channels || channels.length === 0) return null;
          return (
            <div key={cat}>
              <div className="sticky top-0 bg-muted/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                {cat}
              </div>
              {channels.map((channel) => {
                const selected = selectedIds.has(channel.id);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => toggle(channel.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                      selected && 'bg-primary/5'
                    )}
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Hash className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          #{channel.name}
                        </span>
                        {channel.isRecommended && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                            Recommended
                          </span>
                        )}
                      </div>
                      {channel.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {channel.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {channel.memberCount}
                      </span>
                      <div
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background'
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No channels found for &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {selectedIds.size} channel{selectedIds.size !== 1 ? 's' : ''} selected
      </p>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          {!isFirst && (
            <button
              type="button"
              onClick={onPrev}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canSkip && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onDataChange?.(Array.from(selectedIds));
              onNext();
            }}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isLast ? 'Finish' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default JoinChannelsStep;
