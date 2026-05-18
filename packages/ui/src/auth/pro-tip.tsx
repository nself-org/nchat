/**
 * ProTip — contextual pro tip card with category theming.
 *
 * No store deps — pure props. Inlines ProTip type and getRandomProTip utility.
 *
 * @module auth/pro-tip
 */

import { useState, useCallback, useEffect } from 'react';
import { X, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// Types (inlined from feature-discovery — not available in packages/ui scope)
// ============================================================================

export interface ProTip {
  id: string;
  title: string;
  description: string;
  category: 'productivity' | 'communication' | 'organization' | 'advanced';
}

// ============================================================================
// Data (inlined)
// ============================================================================

const proTips: ProTip[] = [
  {
    id: 'markdown-formatting',
    title: 'Use Markdown for Rich Text',
    description:
      'Format your messages with *bold*, _italic_, `code`, and more. Start a line with > for a quote.',
    category: 'communication',
  },
  {
    id: 'slash-commands',
    title: 'Try Slash Commands',
    description:
      'Type / in the message input to see available commands like /giphy, /poll, or /remind.',
    category: 'productivity',
  },
  {
    id: 'channel-organization',
    title: 'Organize with Channel Sections',
    description:
      'Drag channels into custom sections in the sidebar to keep your workspace organized.',
    category: 'organization',
  },
  {
    id: 'message-history',
    title: 'Navigate Message History',
    description: 'Press Up arrow in an empty message input to edit your last message.',
    category: 'advanced',
  },
  {
    id: 'quick-emoji',
    title: 'Quick Emoji Shortcut',
    description:
      'Type : followed by an emoji name (like :smile:) to quickly insert emojis without opening the picker.',
    category: 'productivity',
  },
  {
    id: 'code-blocks',
    title: 'Share Code Snippets',
    description:
      'Wrap code in triple backticks (```) for syntax-highlighted code blocks. Add the language name for proper highlighting.',
    category: 'communication',
  },
  {
    id: 'link-previews',
    title: 'Rich Link Previews',
    description:
      'Share links and nchat will automatically show previews for websites, GitHub repos, and more.',
    category: 'communication',
  },
  {
    id: 'drag-drop-files',
    title: 'Drag and Drop',
    description: 'Drag files directly from your computer into any chat to share them instantly.',
    category: 'productivity',
  },
];

function getRandomProTip(excludeIds: string[] = []): ProTip | null {
  const available = proTips.filter((tip) => !excludeIds.includes(tip.id));
  if (available.length === 0) return null;
  const index = Math.floor(Math.random() * available.length);
  return available[index] ?? null;
}

// ============================================================================
// Types
// ============================================================================

export interface ProTipProps {
  tip?: ProTip;
  onDismiss?: () => void;
  onRefresh?: () => void;
  showRefresh?: boolean;
  seenTipIds?: string[];
  className?: string;
}

// ============================================================================
// Category styling
// ============================================================================

const CATEGORY_COLORS: Record<ProTip['category'], string> = {
  productivity: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
  communication: 'from-green-500/10 to-green-600/5 border-green-500/20',
  organization: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
  advanced: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
};

// ============================================================================
// ProTip
// ============================================================================

/**
 * Contextual pro tip card. Shows a random tip (excluding seenTipIds) unless
 * an explicit `tip` prop is provided. Supports refresh-to-next-tip.
 */
export function ProTip({
  tip: externalTip,
  onDismiss,
  onRefresh,
  showRefresh = true,
  seenTipIds = [],
  className,
}: ProTipProps) {
  const [tip, setTip] = useState<ProTip | null>(externalTip ?? getRandomProTip(seenTipIds));
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (externalTip) {
      setTip(externalTip);
    }
  }, [externalTip]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 200);
  }, [onDismiss]);

  const handleRefresh = useCallback(() => {
    const newTip = getRandomProTip([...seenTipIds, tip?.id ?? '']);
    if (newTip) {
      setTip(newTip);
      onRefresh?.();
    }
  }, [seenTipIds, tip?.id, onRefresh]);

  if (!isVisible || !tip) return null;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all duration-200',
        'bg-gradient-to-r',
        CATEGORY_COLORS[tip.category],
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/50 dark:bg-black/20">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Pro Tip
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  'bg-white/50 text-zinc-600 dark:bg-black/20 dark:text-zinc-400'
                )}
              >
                {tip.category}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {showRefresh && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  title="Show another tip"
                  className="rounded p-1 transition-colors hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
                >
                  <RefreshCw className="h-4 w-4 text-zinc-500" />
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded p-1 transition-colors hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4 text-zinc-500" />
                </button>
              )}
            </div>
          </div>

          <h4 className="mt-2 font-semibold text-zinc-900 dark:text-white">{tip.title}</h4>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{tip.description}</p>
        </div>
      </div>
    </div>
  );
}

export default ProTip;
