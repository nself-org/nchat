/**
 * TwoFactorSetup — 2FA setup wizard with QR code, manual entry, verification, backup codes.
 *
 * Decoupled from Next.js and @/ aliases. All setup operations injected via callbacks.
 * Works in Next.js, Tauri desktop, and Capacitor mobile.
 *
 * @module auth/two-factor-setup
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Shield,
  AlertCircle,
  Loader2,
  Check,
  Copy,
  Download,
  QrCode,
  Key,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TwoFactorSetupData {
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
  backupCodes: string[];
  manualEntryCode: string;
}

export interface TwoFactorSetupAdapter {
  /** Initialize 2FA — returns secret, QR code, backup codes */
  initSetup(userId: string, email: string): Promise<TwoFactorSetupData>;
  /** Verify TOTP code and enable 2FA */
  verifyAndEnable(userId: string, code: string, secret: string): Promise<void>;
  /** Format backup codes for download as text */
  formatForDownload?(codes: string[]): string;
}

export interface TwoFactorSetupProps {
  open: boolean;
  onComplete: () => void;
  onCancel: () => void;
  userId: string;
  email: string;
  /** Injectable adapter — defaults to /api/auth/2fa/* fetch calls */
  adapter?: TwoFactorSetupAdapter;
  className?: string;
}

type SetupStep = 'intro' | 'scan' | 'verify' | 'backup' | 'complete';

// ============================================================================
// Default adapter (Next.js fetch-based)
// ============================================================================

const defaultAdapter: TwoFactorSetupAdapter = {
  async initSetup(userId, email) {
    const response = await fetch('/api/auth/2fa/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Failed to initialize 2FA setup');
    return result.data as TwoFactorSetupData;
  },
  async verifyAndEnable(userId, code, _secret) {
    const response = await fetch('/api/auth/2fa/verify-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Failed to verify code');
  },
  formatForDownload(codes) {
    return `Two-Factor Authentication Backup Codes\n\n${codes.join('\n')}\n\nKeep these codes safe. Each can only be used once.`;
  },
};

// ============================================================================
// TwoFactorSetup
// ============================================================================

/**
 * 2FA setup wizard — 5 steps: intro → scan → verify → backup → complete.
 *
 * @example
 * ```tsx
 * <TwoFactorSetup
 *   open={show2FASetup}
 *   onComplete={() => setShow2FASetup(false)}
 *   onCancel={() => setShow2FASetup(false)}
 *   userId={user.id}
 *   email={user.email}
 * />
 * ```
 */
export function TwoFactorSetup({
  open,
  onComplete,
  onCancel,
  userId,
  email,
  adapter = defaultAdapter,
  className,
}: TwoFactorSetupProps) {
  const [step, setStep] = useState<SetupStep>('intro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const [downloadedBackupCodes, setDownloadedBackupCodes] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('intro');
      setSetupData(null);
      setVerificationCode('');
      setError(null);
      setCopiedSecret(false);
      setCopiedBackupCodes(false);
      setDownloadedBackupCodes(false);
      setActiveTab('qr');
    }
  }, [open]);

  // TOTP countdown
  useEffect(() => {
    if (step !== 'verify' || !open) return;
    const tick = () => {
      const seconds = Math.floor(Date.now() / 1000);
      setRemainingSeconds(30 - (seconds % 30));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [step, open]);

  const handleStartSetup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adapter.initSetup(userId, email);
      setSetupData(data);
      setStep('scan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup initialization failed');
    } finally {
      setLoading(false);
    }
  }, [adapter, userId, email]);

  const handleVerifyCode = useCallback(async () => {
    if (!verificationCode.trim() || !setupData) return;
    setLoading(true);
    setError(null);
    try {
      await adapter.verifyAndEnable(userId, verificationCode.trim(), setupData.secret);
      setStep('backup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, [adapter, userId, verificationCode, setupData]);

  const handleCopySecret = async () => {
    if (!setupData) return;
    await navigator.clipboard.writeText(setupData.manualEntryCode);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyBackupCodes = async () => {
    if (!setupData) return;
    await navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
    setCopiedBackupCodes(true);
    setTimeout(() => setCopiedBackupCodes(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    if (!setupData) return;
    const text = adapter.formatForDownload
      ? adapter.formatForDownload(setupData.backupCodes)
      : setupData.backupCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nchat-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    setDownloadedBackupCodes(true);
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
      aria-label="Set Up Two-Factor Authentication"
    >
      <div className="w-full max-w-lg overflow-y-auto rounded-xl border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h2>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Step: Intro ── */}
        {step === 'intro' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication adds an additional layer of security. You&apos;ll need a
              one-time code from your authenticator app to sign in.
            </p>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="mb-2 font-medium text-foreground">Compatible apps:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Google Authenticator</li>
                <li>• Authy</li>
                <li>• Microsoft Authenticator</li>
                <li>• 1Password, Bitwarden, etc.</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartSetup}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Get Started
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Scan ── */}
        {step === 'scan' && setupData && (
          <div className="space-y-4">
            {/* Tab bar */}
            <div className="flex rounded-lg border p-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === 'qr'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <QrCode className="h-4 w-4" />
                Scan QR Code
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === 'manual'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Key className="h-4 w-4" />
                Manual Entry
              </button>
            </div>

            {activeTab === 'qr' ? (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl border bg-white p-4 shadow-inner">
                  {setupData.qrCodeDataUrl ? (
                    <img
                      src={setupData.qrCodeDataUrl}
                      alt="Scan with your authenticator app"
                      width={200}
                      height={200}
                    />
                  ) : (
                    <div className="flex h-[200px] w-[200px] items-center justify-center bg-muted text-muted-foreground">
                      <QrCode className="h-16 w-16 opacity-30" />
                    </div>
                  )}
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Scan this QR code with your authenticator app
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    If you can&apos;t scan the QR code, enter this key manually in your authenticator app.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-muted p-3 font-mono text-sm">
                  <span className="flex-1 break-all">{setupData.manualEntryCode}</span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Copy secret key"
                  >
                    {copiedSecret ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep('intro')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('verify')}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Verify ── */}
        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app to confirm it&apos;s working.
            </p>
            <div className="space-y-2">
              <label htmlFor="totp-code" className="text-sm font-medium text-foreground">
                Verification Code
              </label>
              <input
                id="totp-code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => { if (e.key === 'Enter' && verificationCode.length === 6) handleVerifyCode(); }}
                placeholder="000000"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-center font-mono text-xl tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional for wizard flow
                autoFocus
                disabled={loading}
                maxLength={6}
                autoComplete="one-time-code"
              />
              <p className="text-center text-xs text-muted-foreground">
                Code refreshes in {remainingSeconds}s
              </p>
            </div>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep('scan')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length < 6}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Verify & Enable
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Backup Codes ── */}
        {step === 'backup' && setupData && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm">
                Save these backup codes in a safe place. Each code can only be used once to access
                your account if you lose your authenticator.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted p-4">
              {setupData.backupCodes.map((code, i) => (
                <code key={i} className="font-mono text-sm text-foreground">
                  {code}
                </code>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyBackupCodes}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {copiedBackupCodes ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy
              </button>
              <button
                type="button"
                onClick={handleDownloadBackupCodes}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {downloadedBackupCodes ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep('complete')}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                I&apos;ve saved my codes
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Complete ── */}
        {step === 'complete' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Two-Factor Authentication Enabled!
            </h3>
            <p className="text-sm text-muted-foreground">
              Your account is now protected with 2FA. You&apos;ll be asked for a code from your
              authenticator app the next time you sign in.
            </p>
            <button
              type="button"
              onClick={onComplete}
              className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Check className="h-4 w-4" />
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TwoFactorSetup;
