/**
 * CompletionStep — onboarding completion / celebration step.
 *
 * Decoupled from app internals: all state via props.
 * canvas-confetti is triggered on mount when available.
 *
 * @module auth/completion-step
 */

import { useEffect, useRef } from 'react';
import { CheckCircle, Zap, MessageSquare, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import type { OnboardingStepProps } from './onboarding-types';

// ============================================================================
// Types
// ============================================================================

export interface CompletionStepProps extends OnboardingStepProps {
  /** User display name for personalised greeting */
  userName?: string;
  /** Show an upsell for the pro bundle */
  showBundleUpsell?: boolean;
  /** URL to the bundle upgrade page */
  bundleUpsellUrl?: string;
  /** List of missing plugin names driving the upsell */
  missingPluginNames?: string[];
  className?: string;
}

// ============================================================================
// Quick tips
// ============================================================================

const QUICK_TIPS = [
  {
    icon: MessageSquare,
    tip: 'Press Ctrl+K (⌘K on Mac) to jump to any channel or DM instantly.',
  },
  {
    icon: Users,
    tip: "Type @ in the composer to mention a teammate — they'll get notified.",
  },
  {
    icon: Zap,
    tip: 'Use /slash commands to send GIFs, create polls, set reminders, and more.',
  },
];

// ============================================================================
// CompletionStep
// ============================================================================

/**
 * Completion step — celebration with confetti, quick tips, and optional bundle upsell.
 *
 * @example
 * ```tsx
 * <CompletionStep
 *   onNext={handleFinish}
 *   onPrev={handlePrev}
 *   isFirst={false}
 *   isLast
 *   canSkip={false}
 *   userName="Alice"
 *   showBundleUpsell
 *   bundleUpsellUrl="https://nself.org/pricing"
 *   missingPluginNames={['livekit', 'recording']}
 * />
 * ```
 */
export function CompletionStep({
  onNext,
  onPrev,
  isFirst,
  isLast,
  userName,
  showBundleUpsell,
  bundleUpsellUrl,
  missingPluginNames,
  className,
}: CompletionStepProps) {
  const confettiFired = useRef(false);

  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;

    // Dynamic import so this is tree-shaken when not used server-side
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — canvas-confetti is an optional peer dep; types may not be installed
    import('canvas-confetti')
      .then((mod) => {
        const confetti = mod.default;
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'],
        });
      })
      .catch(() => {
        // canvas-confetti is optional — silently skip if unavailable
      });
  }, []);

  return (
    <div className={cn('w-full max-w-lg', className)}>
      {/* Hero */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
          {userName ? `You're all set, ${userName}!` : "You're all set!"}
        </h2>
        <p className="max-w-sm text-muted-foreground">
          Your account is ready. Jump in and start chatting with your team.
        </p>
      </div>

      {/* Quick tips */}
      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick tips
        </h3>
        <div className="space-y-3">
          {QUICK_TIPS.map(({ icon: Icon, tip }, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-foreground">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bundle upsell (optional) */}
      {showBundleUpsell && (
        <div className="mb-8 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <h3 className="mb-1 font-semibold text-foreground">Unlock the full experience</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Voice &amp; video calls, E2E encryption, AI assistant, advanced moderation, and more
            are available with the ɳChat bundle.
          </p>
          {missingPluginNames && missingPluginNames.length > 0 && (
            <p className="mb-3 text-xs text-muted-foreground">
              Requires: {missingPluginNames.join(', ')}
            </p>
          )}
          <a
            href={bundleUpsellUrl ?? 'https://nself.org/pricing'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            View plans →
          </a>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
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

        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {isLast ? 'Start chatting' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

export default CompletionStep;
