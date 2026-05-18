/**
 * InviteTeamStep — onboarding team invitation step.
 *
 * Decoupled from app internals: all state via props.
 *
 * @module auth/invite-team-step
 */

import { useState, useCallback } from 'react';
import { UserPlus, X, Mail, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { OnboardingStepProps, TeamInvitation, InvitationResult } from './onboarding-types';

// ============================================================================
// Types
// ============================================================================

export interface InviteTeamStepProps extends OnboardingStepProps {
  initialEmails?: string[];
  /** Async send handler — returns per-email results */
  onSendInvitations?: (invitations: TeamInvitation[]) => Promise<InvitationResult[]>;
  onDataChange?: (emails: string[]) => void;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\s,;\n]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

// ============================================================================
// InviteTeamStep
// ============================================================================

/**
 * Team invite step — add emails one-by-one or paste a bulk list.
 *
 * @example
 * ```tsx
 * <InviteTeamStep
 *   onNext={handleNext}
 *   onPrev={handlePrev}
 *   isFirst={false}
 *   isLast={false}
 *   canSkip
 *   onSkip={handleSkip}
 *   onSendInvitations={async (invites) => await api.sendInvites(invites)}
 *   onDataChange={(emails) => store.setInviteEmails(emails)}
 * />
 * ```
 */
export function InviteTeamStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  canSkip,
  initialEmails = [],
  onSendInvitations,
  onDataChange,
  className,
}: InviteTeamStepProps) {
  const [emails, setEmails] = useState<string[]>(initialEmails);
  const [inputValue, setInputValue] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<InvitationResult[] | null>(null);

  const updateEmails = useCallback(
    (next: string[]) => {
      setEmails(next);
      onDataChange?.(next);
    },
    [onDataChange]
  );

  function addEmail() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      setInputError('Please enter a valid email address.');
      return;
    }
    if (emails.includes(trimmed)) {
      setInputError('This email is already in the list.');
      return;
    }
    setInputError(null);
    updateEmails([...emails, trimmed]);
    setInputValue('');
  }

  function removeEmail(email: string) {
    updateEmails(emails.filter((e) => e !== email));
  }

  function applyBulk() {
    const parsed = parseEmails(bulkText);
    const valid = parsed.filter(isValidEmail);
    const merged = Array.from(new Set([...emails, ...valid]));
    updateEmails(merged);
    setBulkText('');
    setBulkMode(false);
  }

  async function handleSend() {
    if (emails.length === 0) {
      onNext();
      return;
    }
    if (!onSendInvitations) {
      onNext();
      return;
    }
    setSending(true);
    try {
      const res = await onSendInvitations(emails.map((email) => ({ email })));
      setResults(res);
    } catch {
      setResults(emails.map((email) => ({ email, success: false, error: 'Failed to send.' })));
    } finally {
      setSending(false);
    }
  }

  const allSent = results !== null;
  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results?.filter((r) => !r.success).length ?? 0;

  return (
    <div className={cn('w-full max-w-lg', className)}>
      <h2 className="mb-1 text-2xl font-bold text-foreground">Invite Your Team</h2>
      <p className="mb-6 text-muted-foreground">
        Bring teammates on board. You can always invite more later.
      </p>

      {!allSent && (
        <>
          {/* Single email input */}
          {!bulkMode && (
            <div className="mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      if (inputError) setInputError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEmail();
                      }
                    }}
                    placeholder="colleague@example.com"
                    className={cn(
                      'w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                      inputError ? 'border-destructive' : 'border-input'
                    )}
                  />
                </div>
                <button
                  type="button"
                  onClick={addEmail}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  <UserPlus className="h-4 w-4" />
                  Add
                </button>
              </div>
              {inputError && (
                <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {inputError}
                </p>
              )}
              <button
                type="button"
                onClick={() => setBulkMode(true)}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Users className="mr-1 inline-block h-3 w-3" />
                Paste a list of emails instead
              </button>
            </div>
          )}

          {/* Bulk paste mode */}
          {bulkMode && (
            <div className="mb-4">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="alice@co.com, bob@co.com&#10;carol@co.com"
                rows={4}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Separate with commas, spaces, or newlines.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={applyBulk}
                  className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Add All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkMode(false);
                    setBulkText('');
                  }}
                  className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Email list */}
          {emails.length > 0 && (
            <div className="mb-4 max-h-52 overflow-y-auto rounded-xl border border-border">
              {emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50"
                >
                  <span className="text-sm text-foreground">{email}</span>
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    aria-label={`Remove ${email}`}
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Results */}
      {allSent && (
        <div className="mb-6 space-y-2">
          {successCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              {successCount} invitation{successCount !== 1 ? 's' : ''} sent.
            </div>
          )}
          {failCount > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p className="font-medium">
                {failCount} invitation{failCount !== 1 ? 's' : ''} failed:
              </p>
              <ul className="mt-1 list-inside list-disc">
                {results!
                  .filter((r) => !r.success)
                  .map((r) => (
                    <li key={r.email}>
                      {r.email} — {r.error}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          {!isFirst && !allSent && (
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
          {canSkip && onSkip && !allSent && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip
            </button>
          )}
          {!allSent ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {sending
                ? 'Sending…'
                : emails.length > 0
                  ? `Send ${emails.length} Invite${emails.length !== 1 ? 's' : ''}`
                  : isLast
                    ? 'Finish'
                    : 'Continue'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {isLast ? 'Finish' : 'Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InviteTeamStep;
