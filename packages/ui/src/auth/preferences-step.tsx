/**
 * PreferencesStep — onboarding preferences form.
 *
 * Decoupled from app internals: all state via props.
 *
 * @module auth/preferences-step
 */

import { useState } from 'react';
import { cn } from '../lib/utils';
import type { OnboardingStepProps, OnboardingPreferences } from './onboarding-types';
import { defaultOnboardingPreferences } from './onboarding-steps';

// ============================================================================
// Types
// ============================================================================

export interface PreferencesStepProps extends OnboardingStepProps {
  initialData?: Partial<OnboardingPreferences>;
  onDataChange?: (data: Partial<OnboardingPreferences>) => void;
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 flex-col items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
}

function Switch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-input'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

// ============================================================================
// PreferencesStep
// ============================================================================

/**
 * Preferences step — theme, message density, sounds, online status, email digest.
 *
 * @example
 * ```tsx
 * <PreferencesStep
 *   onNext={handleNext}
 *   onPrev={handlePrev}
 *   isFirst={false}
 *   isLast={false}
 *   canSkip
 *   onSkip={handleSkip}
 *   initialData={{ theme: 'dark', messageDensity: 'compact' }}
 *   onDataChange={(data) => store.updatePreferences(data)}
 * />
 * ```
 */
export function PreferencesStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  canSkip,
  initialData = {},
  onDataChange,
  className,
}: PreferencesStepProps) {
  const merged = { ...defaultOnboardingPreferences, ...initialData };

  const [theme, setTheme] = useState<OnboardingPreferences['theme']>(merged.theme);
  const [messageDensity, setMessageDensity] = useState<OnboardingPreferences['messageDensity']>(
    merged.messageDensity
  );
  const [soundsEnabled, setSoundsEnabled] = useState(merged.soundsEnabled);
  const [showOnlineStatus, setShowOnlineStatus] = useState(merged.showOnlineStatus);
  const [emailDigest, setEmailDigest] = useState<OnboardingPreferences['emailDigest']>(
    merged.emailDigest
  );

  function notify(patch: Partial<OnboardingPreferences>) {
    onDataChange?.({
      theme,
      messageDensity,
      soundsEnabled,
      showOnlineStatus,
      emailDigest,
      ...patch,
    });
  }

  function handleTheme(v: OnboardingPreferences['theme']) {
    setTheme(v);
    notify({ theme: v });
  }

  function handleDensity(v: OnboardingPreferences['messageDensity']) {
    setMessageDensity(v);
    notify({ messageDensity: v });
  }

  function handleSounds(v: boolean) {
    setSoundsEnabled(v);
    notify({ soundsEnabled: v });
  }

  function handleOnlineStatus(v: boolean) {
    setShowOnlineStatus(v);
    notify({ showOnlineStatus: v });
  }

  function handleEmailDigest(v: OnboardingPreferences['emailDigest']) {
    setEmailDigest(v);
    notify({ emailDigest: v });
  }

  return (
    <div className={cn('w-full max-w-lg', className)}>
      <h2 className="mb-1 text-2xl font-bold text-foreground">Preferences</h2>
      <p className="mb-6 text-muted-foreground">Customize your chat experience.</p>

      <div className="space-y-6">
        {/* Theme */}
        <div>
          <SectionTitle>Appearance</SectionTitle>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <OptionButton key={t} active={theme === t} onClick={() => handleTheme(t)}>
                <span className="capitalize">{t}</span>
              </OptionButton>
            ))}
          </div>
        </div>

        {/* Message density */}
        <div>
          <SectionTitle>Message Density</SectionTitle>
          <div className="flex gap-2">
            {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
              <OptionButton key={d} active={messageDensity === d} onClick={() => handleDensity(d)}>
                <span className="capitalize">{d}</span>
              </OptionButton>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <SectionTitle>Other Settings</SectionTitle>

          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <label htmlFor="pref-sounds" className="text-sm font-medium text-foreground">
              Sound effects
            </label>
            <Switch id="pref-sounds" checked={soundsEnabled} onChange={handleSounds} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <label htmlFor="pref-online" className="text-sm font-medium text-foreground">
              Show online status
            </label>
            <Switch id="pref-online" checked={showOnlineStatus} onChange={handleOnlineStatus} />
          </div>
        </div>

        {/* Email digest */}
        <div>
          <SectionTitle>Email Digest</SectionTitle>
          <div className="flex gap-2">
            {(['none', 'daily', 'weekly'] as const).map((d) => (
              <OptionButton
                key={d}
                active={emailDigest === d}
                onClick={() => handleEmailDigest(d)}
              >
                <span className="capitalize">{d}</span>
              </OptionButton>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Receive a summary of missed messages in your inbox.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between gap-3">
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
              onDataChange?.({ theme, messageDensity, soundsEnabled, showOnlineStatus, emailDigest });
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

export default PreferencesStep;
