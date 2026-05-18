/**
 * KeyboardShortcutTip — inline keyboard shortcut toast/badge.
 *
 * No store deps — pure props. Parses shortcut strings into key symbols.
 *
 * @module auth/keyboard-shortcut-tip
 */

import { useState, useCallback, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcutTipProps {
  shortcut: string;
  description: string;
  context?: string;
  onDismiss?: () => void;
  /** Auto-hide after this many milliseconds */
  autoHide?: number;
  className?: string;
}

// ============================================================================
// Key symbol mapping
// ============================================================================

interface ParsedKey {
  display: string;
  label: string;
}

function parseKey(key: string): ParsedKey {
  switch (key.toLowerCase()) {
    case 'cmd':
    case 'command':
      return { display: '⌘', label: 'Command' };
    case 'ctrl':
    case 'control':
      return { display: 'Ctrl', label: 'Control' };
    case 'alt':
    case 'option':
      return { display: '⌥', label: 'Option' };
    case 'shift':
      return { display: '⇧', label: 'Shift' };
    case 'enter':
    case 'return':
      return { display: '↵', label: 'Enter' };
    case 'backspace':
      return { display: '⌫', label: 'Backspace' };
    case 'escape':
    case 'esc':
      return { display: 'Esc', label: 'Escape' };
    case 'up':
      return { display: '↑', label: 'Up' };
    case 'down':
      return { display: '↓', label: 'Down' };
    case 'left':
      return { display: '←', label: 'Left' };
    case 'right':
      return { display: '→', label: 'Right' };
    default:
      return { display: key.toUpperCase(), label: key };
  }
}

// ============================================================================
// KeyboardShortcutTip
// ============================================================================

/**
 * Compact keyboard shortcut indicator. Renders shortcut keys as styled
 * `<kbd>` elements with OS-aware symbols (⌘, ⌥, ⇧, ↵, etc.).
 *
 * Supports optional auto-hide timer and dismiss button.
 */
export function KeyboardShortcutTip({
  shortcut,
  description,
  context,
  onDismiss,
  autoHide,
  className,
}: KeyboardShortcutTipProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 200);
  }, [onDismiss]);

  useEffect(() => {
    if (!autoHide) return;
    const timer = setTimeout(() => {
      handleDismiss();
    }, autoHide);
    return () => clearTimeout(timer);
  }, [autoHide, handleDismiss]);

  if (!isVisible) return null;

  const keys = shortcut.split(/[+\s]+/).map(parseKey);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 rounded-lg px-3 py-2',
        'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
        'shadow-lg transition-all duration-200',
        className
      )}
    >
      <Keyboard className="h-4 w-4 opacity-60" />

      {/* Keyboard shortcut keys */}
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index}>
            <kbd
              className={cn(
                'inline-flex h-6 min-w-[24px] items-center justify-center px-1.5',
                'rounded border border-zinc-700 dark:border-zinc-300',
                'bg-zinc-800 font-mono text-xs font-medium dark:bg-zinc-200'
              )}
              title={key.label}
            >
              {key.display}
            </kbd>
            {index < keys.length - 1 && <span className="mx-0.5 text-zinc-500">+</span>}
          </span>
        ))}
      </div>

      {/* Description */}
      <span className="text-sm">
        {description}
        {context && <span className="ml-1 text-zinc-400 dark:text-zinc-500">({context})</span>}
      </span>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          className="ml-1 rounded p-1 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default KeyboardShortcutTip;
