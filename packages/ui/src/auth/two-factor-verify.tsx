/**
 * TwoFactorVerify — 2FA verification modal shown during login.
 *
 * Decoupled from Next.js: uses injectable verify/cancel callbacks.
 * No @/ alias imports.
 *
 * @module auth/two-factor-verify
 */

import { useState, useCallback, useEffect } from 'react';
import { Shield, AlertCircle, Loader2, Key, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TwoFactorVerifyProps {
  open: boolean;
  /** Called when 2FA is verified. Passes whether device should be remembered. */
  onVerified: (rememberDevice: boolean) => void;
  onCancel: () => void;
  userId: string;
  /**
   * Injectable verify function. Default hits /api/auth/2fa/verify.
   */
  onVerifyCode?: (opts: {
    userId: string;
    code: string;
    rememberDevice: boolean;
  }) => Promise<{ usedBackupCode?: boolean }>;
  /** Countdown timer value in seconds (default: calculates from 30s TOTP window) */
  remainingSeconds?: number;
  className?: string;
}

// ============================================================================
// TwoFactorVerify
// ============================================================================

/**
 * 2FA verification modal — supports TOTP codes, backup codes, remember-device.
 *
 * @example
 * ```tsx
 * <TwoFactorVerify
 *   open={show2FA}
 *   onVerified={(remember) => handleVerified(remember)}
 *   onCancel={() => setShow2FA(false)}
 *   userId={user.id}
 * />
 * ```
 */
export function TwoFactorVerify({
  open,
  onVerified,
  onCancel,
  userId,
  onVerifyCode,
  remainingSeconds: externalRemainingSeconds,
  className,
}: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalRemaining, setInternalRemaining] = useState(30);

  const remainingSeconds = externalRemainingSeconds ?? internalRemaining;

  // Internal TOTP countdown when no external value provided
  useEffect(() => {
    if (externalRemainingSeconds !== undefined) return;
    if (!open || useBackupCode) return;

    const tick = () => {
      const seconds = Math.floor(Date.now() / 1000);
      setInternalRemaining(30 - (seconds % 30));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [open, useBackupCode, externalRemainingSeconds]);

  const defaultVerify = useCallback(
    async ({
      userId: uid,
      code: c,
      rememberDevice: remember,
    }: {
      userId: string;
      code: string;
      rememberDevice: boolean;
    }) => {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, code: c, rememberDevice: remember }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Verification failed');
      return data as { usedBackupCode?: boolean };
    },
    []
  );

  const handleVerify = useCallback(async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const verify = onVerifyCode ?? defaultVerify;
      const result = await verify({ userId, code: code.trim(), rememberDevice });
      if (result.usedBackupCode) {
        // Non-blocking notice — consumers handle toast/alert at app level
        console.warn('Backup code used — consider regenerating backup codes.');
      }
      onVerified(rememberDevice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, [code, userId, rememberDevice, onVerified, onVerifyCode, defaultVerify]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.trim() && !loading) handleVerify();
  };

  const handleCancel = () => {
    setCode('');
    setError(null);
    setRememberDevice(false);
    setUseBackupCode(false);
    onCancel();
  };

  const toggleBackupCode = () => {
    setCode('');
    setError(null);
    setUseBackupCode(!useBackupCode);
  };

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Two-Factor Authentication"
    >
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            {useBackupCode ? (
              <Key className="h-6 w-6 text-primary" />
            ) : (
              <Shield className="h-6 w-6 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h2>
            <p className="text-sm text-muted-foreground">
              {useBackupCode
                ? 'Enter one of your backup codes'
                : 'Enter the code from your authenticator app'}
            </p>
          </div>
        </div>

        <div className="space-y-4 py-2">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Code input */}
          <div className="space-y-2">
            <label htmlFor="2fa-code" className="text-sm font-medium text-foreground">
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </label>
            <input
              id="2fa-code"
              type="text"
              value={code}
              onChange={(e) => {
                const val = e.target.value;
                if (useBackupCode) {
                  setCode(val.toUpperCase());
                } else {
                  setCode(val.replace(/\D/g, '').slice(0, 6));
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-center font-mono text-lg tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              autoComplete="one-time-code"
              // eslint-disable-next-line jsx-a11y/no-autofocus -- autoFocus is intentional for 2FA verification UX
              autoFocus
              disabled={loading}
              maxLength={useBackupCode ? 9 : 6}
              aria-label={useBackupCode ? 'Backup code' : 'TOTP verification code'}
            />
            {!useBackupCode && (
              <p className="text-center text-xs text-muted-foreground">
                Code refreshes in {remainingSeconds}s
              </p>
            )}
          </div>

          {/* Remember device */}
          <div className="flex items-center space-x-2 rounded-lg border p-3">
            <input
              id="remember-device"
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <label
              htmlFor="remember-device"
              className="cursor-pointer text-sm font-normal leading-tight"
            >
              Trust this device for 30 days
              <span className="block text-xs text-muted-foreground">
                You won&apos;t be asked for 2FA on this device
              </span>
            </label>
          </div>

          {/* Toggle backup code */}
          <button
            type="button"
            onClick={toggleBackupCode}
            className="flex w-full items-center justify-center gap-2 text-sm text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            {useBackupCode ? (
              <>
                <Smartphone className="h-4 w-4" />
                Use authenticator code instead
              </>
            ) : (
              <>
                <Key className="h-4 w-4" />
                Use backup code instead
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleVerify}
            disabled={loading || !code.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TwoFactorVerify;
