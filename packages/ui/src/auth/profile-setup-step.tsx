/**
 * ProfileSetupStep — onboarding profile form.
 *
 * Decoupled from app internals: all state via props.
 *
 * @module auth/profile-setup-step
 */

import { useState } from 'react';
import { cn } from '../lib/utils';
import type { OnboardingStepProps, UserProfile } from './onboarding-types';

// ============================================================================
// Types
// ============================================================================

export interface ProfileSetupStepProps extends OnboardingStepProps {
  initialData?: Partial<UserProfile>;
  onDataChange?: (data: Partial<UserProfile>) => void;
  className?: string;
}

// ============================================================================
// ProfileSetupStep
// ============================================================================

/**
 * Profile setup step — collects display name, full name, title, department, bio.
 *
 * @example
 * ```tsx
 * <ProfileSetupStep
 *   onNext={handleNext}
 *   onPrev={handlePrev}
 *   isFirst={false}
 *   isLast={false}
 *   canSkip={false}
 *   initialData={{ displayName: 'Alice' }}
 *   onDataChange={(data) => store.updateProfile(data)}
 * />
 * ```
 */
export function ProfileSetupStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  canSkip,
  initialData = {},
  onDataChange,
  className,
}: ProfileSetupStepProps) {
  const [displayName, setDisplayName] = useState(initialData.displayName ?? '');
  const [fullName, setFullName] = useState(initialData.fullName ?? '');
  const [title, setTitle] = useState(initialData.title ?? '');
  const [department, setDepartment] = useState(initialData.department ?? '');
  const [bio, setBio] = useState(initialData.bio ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    // Validate
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }
    if (displayName.trim().length > 50) {
      setError('Display name must be at most 50 characters.');
      return;
    }

    setError(null);
    const data: Partial<UserProfile> = {
      displayName: displayName.trim(),
      fullName: fullName.trim() || undefined,
      title: title.trim() || undefined,
      department: department.trim() || undefined,
      bio: bio.trim() || undefined,
    };
    onDataChange?.(data);
    onNext();
  };

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50';

  const labelClass = 'mb-1 block text-sm font-medium text-foreground';

  return (
    <div className={cn('w-full max-w-lg', className)}>
      <h2 className="mb-1 text-2xl font-bold text-foreground">Set Up Your Profile</h2>
      <p className="mb-6 text-muted-foreground">Tell your team a bit about yourself.</p>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Display name (required) */}
        <div>
          <label htmlFor="profile-display-name" className={labelClass}>
            Display Name <span className="text-destructive">*</span>
          </label>
          <input
            id="profile-display-name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Alice"
            maxLength={50}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            This is how you&apos;ll appear to others.
          </p>
        </div>

        {/* Full name */}
        <div>
          <label htmlFor="profile-full-name" className={labelClass}>
            Full Name
          </label>
          <input
            id="profile-full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Alice Johnson"
            className={inputClass}
          />
        </div>

        {/* Title */}
        <div>
          <label htmlFor="profile-title" className={labelClass}>
            Job Title
          </label>
          <input
            id="profile-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Software Engineer"
            className={inputClass}
          />
        </div>

        {/* Department */}
        <div>
          <label htmlFor="profile-department" className={labelClass}>
            Department
          </label>
          <input
            id="profile-department"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. Engineering"
            className={inputClass}
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="profile-bio" className={labelClass}>
            Bio
          </label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A little about yourself…"
            rows={3}
            maxLength={200}
            className={cn(inputClass, 'resize-none')}
          />
          <p className="mt-1 text-xs text-muted-foreground">{bio.length}/200</p>
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
            onClick={handleNext}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isLast ? 'Finish' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileSetupStep;
