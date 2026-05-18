/**
 * WelcomeStep — onboarding welcome screen.
 *
 * Decoupled from app internals: all state via OnboardingStepProps + props.
 *
 * @module auth/welcome-step
 */

import { MessageSquare, Users, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import type { OnboardingStepProps } from './onboarding-types';

// ============================================================================
// Types
// ============================================================================

export interface WelcomeStepProps extends OnboardingStepProps {
  appName?: string;
  userName?: string;
  className?: string;
}

// ============================================================================
// WelcomeStep
// ============================================================================

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Real-time messaging',
    description: 'Send messages, share files, and collaborate with your team instantly.',
  },
  {
    icon: Users,
    title: 'Channels & DMs',
    description: 'Organize conversations into channels or send direct messages to teammates.',
  },
  {
    icon: Zap,
    title: 'Powerful integrations',
    description: 'Connect with the tools you use every day to supercharge your workflow.',
  },
] as const;

/**
 * Welcome step shown at the beginning of the onboarding flow.
 *
 * @example
 * ```tsx
 * <WelcomeStep
 *   onNext={handleNext}
 *   onPrev={handlePrev}
 *   isFirst
 *   isLast={false}
 *   canSkip={false}
 *   appName="ɳChat"
 *   userName="Alice"
 * />
 * ```
 */
export function WelcomeStep({
  onNext,
  appName = 'ɳChat',
  userName,
  className,
}: WelcomeStepProps) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      {/* Greeting */}
      <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
        Welcome{userName ? `, ${userName}` : ''}!
      </h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        Let&apos;s get you set up with {appName} so you can start communicating with your team.
        This will only take a few minutes.
      </p>

      {/* Feature grid */}
      <div className="mb-10 grid w-full max-w-lg gap-4 text-left sm:grid-cols-1">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onNext}
        className="rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Get Started
      </button>
    </div>
  );
}

export default WelcomeStep;
