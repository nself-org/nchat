/**
 * PinManage — PIN security management panel.
 *
 * Injectable: all security operations come via PinManageAdapter — no direct
 * imports from @/lib/security/*. Uses native HTML dialogs instead of Radix Dialog.
 * Native toggles/selects instead of Radix Switch/Select.
 *
 * @module auth/pin-manage
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Lock,
  Clock,
  Fingerprint,
  AlertCircle,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { PinSetup } from './pin-setup';
import type { PinSetupAdapter } from './pin-setup';

// ============================================================================
// Types (inlined — not available in packages/ui scope)
// ============================================================================

export interface BiometricCredential {
  id: string;
  credentialId: string;
  deviceName: string;
  credentialType: string;
  lastUsedAt: string | null;
}

export interface PinSettings {
  lockOnClose: boolean;
  lockOnBackground: boolean;
  lockTimeoutMinutes: 0 | 5 | 15 | 30 | 60;
  biometricEnabled: boolean;
}

export interface FailedAttempt {
  timestamp: string;
  failureReason?: string;
}

export interface PinManageAdapter {
  /** Returns whether a PIN has been configured for the user */
  hasPinConfigured: () => boolean;
  /** Returns current PIN settings, or null if not configured */
  loadPinSettings: () => PinSettings | null;
  /** Change the PIN; resolves to { success, error? } */
  changePin: (currentPin: string, newPin: string, confirmPin: string) => Promise<{ success: boolean; error?: string }>;
  /** Update individual PIN settings fields; returns true on success */
  updatePinSettings: (updates: Partial<PinSettings>) => boolean;
  /** Disable PIN using current PIN to confirm; returns true on success */
  disablePin: (pin: string) => Promise<boolean>;
  /** Returns recent failed unlock attempts within the last N minutes */
  getRecentFailedAttempts: (minutes: number) => FailedAttempt[];
  /** Clears stored attempt history */
  clearAttemptHistory: () => void;
  /** Lock the session immediately */
  lockSession: (reason: string) => void;
  /** Returns human-readable time since last activity */
  getFormattedTimeSinceActivity: () => string;
  /** Returns all stored biometric credentials */
  getStoredCredentials: () => BiometricCredential[];
  /** Removes a specific credential by its credentialId */
  removeCredential: (credentialId: string) => void;
  /** Removes all biometric credentials */
  clearAllCredentials: () => void;
  /** Registers a new biometric credential; returns { success, credentialId? } */
  registerBiometric: (userId: string, userName: string) => Promise<{ success: boolean; credentialId?: string }>;
  /** Returns display label for a credential type */
  getCredentialTypeDescription: (credentialType: string) => string;
  /** Returns formatted last-used string for a credential */
  formatLastUsed: (lastUsedAt: string | null) => string;
  /** PinSetupAdapter for inline setup flow when no PIN exists */
  pinSetupAdapter: PinSetupAdapter;
}

export interface PinManageProps {
  adapter: PinManageAdapter;
  userId: string;
  userName: string;
}

// ============================================================================
// Toggle switch (raw button — no Radix)
// ============================================================================

function Toggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full',
        'border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        checked ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

// ============================================================================
// ChangePinDialog (native HTML)
// ============================================================================

function ChangePinDialog({
  open,
  onClose,
  adapter,
}: {
  open: boolean;
  onClose: () => void;
  adapter: PinManageAdapter;
}) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reset = useCallback(() => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setShowPins(false);
    setError(null);
    setIsLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleChange = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await adapter.changePin(currentPin, newPin, confirmPin);
      if (!result.success) {
        setError(result.error ?? 'Failed to change PIN');
        return;
      }
      reset();
      onClose();
    } catch {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [adapter, currentPin, newPin, confirmPin, reset, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-pin-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        onKeyDown={(e) => { if (e.key === 'Escape') handleClose(); }}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 id="change-pin-title" className="mb-1 text-lg font-semibold text-foreground">
          Change PIN
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Enter your current PIN and choose a new one
        </p>

        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="change-current-pin" className="text-sm font-medium text-foreground">
              Current PIN
            </label>
            <input
              id="change-current-pin"
              type={showPins ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              className={cn(
                'block w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
              )}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="change-new-pin" className="text-sm font-medium text-foreground">
              New PIN
            </label>
            <input
              id="change-new-pin"
              type={showPins ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              className={cn(
                'block w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
              )}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="change-confirm-pin" className="text-sm font-medium text-foreground">
              Confirm New PIN
            </label>
            <input
              id="change-confirm-pin"
              type={showPins ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className={cn(
                'block w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
              )}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPins((v) => !v)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {showPins ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPins ? 'Hide' : 'Show'} PINs
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              'rounded-md border border-input px-4 py-2 text-sm font-medium',
              'text-foreground hover:bg-muted transition-colors'
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleChange}
            disabled={isLoading || !currentPin || !newPin || !confirmPin}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium',
              'bg-primary text-primary-foreground',
              'transition-opacity hover:opacity-90',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {isLoading ? 'Changing…' : 'Change PIN'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DisablePinDialog (native HTML)
// ============================================================================

function DisablePinDialog({
  open,
  onClose,
  adapter,
  onDisabled,
}: {
  open: boolean;
  onClose: () => void;
  adapter: PinManageAdapter;
  onDisabled: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = useCallback(() => {
    setPin('');
    setError(null);
    setIsLoading(false);
    onClose();
  }, [onClose]);

  const handleDisable = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const success = await adapter.disablePin(pin);
      if (!success) {
        setError('Incorrect PIN');
        return;
      }
      adapter.clearAllCredentials();
      adapter.clearAttemptHistory();
      handleClose();
      onDisabled();
    } catch {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [adapter, pin, handleClose, onDisabled]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disable-pin-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        onKeyDown={(e) => { if (e.key === 'Escape') handleClose(); }}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 id="disable-pin-title" className="mb-1 text-lg font-semibold text-foreground">
          Disable PIN Lock
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Enter your PIN to disable PIN lock. This will remove all security settings.
        </p>

        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Warning: This will disable PIN lock and remove all biometric credentials.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="disable-pin-input" className="text-sm font-medium text-foreground">
              Enter PIN to confirm
            </label>
            <input
              id="disable-pin-input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className={cn(
                'block w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
              )}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              'rounded-md border border-input px-4 py-2 text-sm font-medium',
              'text-foreground hover:bg-muted transition-colors'
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDisable}
            disabled={isLoading || !pin}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium',
              'bg-destructive text-destructive-foreground',
              'transition-opacity hover:opacity-90',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {isLoading ? 'Disabling…' : 'Disable PIN Lock'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AttemptsDialog (native HTML)
// ============================================================================

function AttemptsDialog({
  open,
  onClose,
  adapter,
}: {
  open: boolean;
  onClose: () => void;
  adapter: PinManageAdapter;
}) {
  const attempts = adapter.getRecentFailedAttempts(60);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attempts-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 id="attempts-title" className="mb-1 text-lg font-semibold text-foreground">
          Recent Failed Attempts
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Failed PIN unlock attempts in the last hour
        </p>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {attempts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No failed attempts in the last hour
            </p>
          ) : (
            attempts.map((attempt, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">
                  {new Date(attempt.timestamp).toLocaleString()}
                </p>
                {attempt.failureReason && (
                  <p className="text-xs text-muted-foreground">Reason: {attempt.failureReason}</p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'rounded-md border border-input px-4 py-2 text-sm font-medium',
              'text-foreground hover:bg-muted transition-colors'
            )}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PinManage
// ============================================================================

/**
 * PIN management panel. Consumes a PinManageAdapter — no security lib coupling.
 * Includes inline setup flow, lock options, biometric management, and dialogs.
 */
export function PinManage({ adapter, userId, userName }: PinManageProps) {
  const [hasPinSetup, setHasPinSetup] = useState(false);
  const [pinSettings, setPinSettings] = useState<PinSettings | null>(null);
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);

  const [showChangePinDialog, setShowChangePinDialog] = useState(false);
  const [showDisablePinDialog, setShowDisablePinDialog] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showAttemptsDialog, setShowAttemptsDialog] = useState(false);

  // Load PIN status on mount
  useEffect(() => {
    const hasPin = adapter.hasPinConfigured();
    setHasPinSetup(hasPin);
    if (hasPin) {
      setPinSettings(adapter.loadPinSettings());
    }
  }, [adapter]);

  // Load biometric credentials on mount
  useEffect(() => {
    setCredentials(adapter.getStoredCredentials());
  }, [adapter]);

  const refreshCredentials = useCallback(() => {
    setCredentials(adapter.getStoredCredentials());
  }, [adapter]);

  const handleSettingsChange = useCallback(
    (updates: Partial<PinSettings>) => {
      const success = adapter.updatePinSettings(updates);
      if (success) {
        setPinSettings(adapter.loadPinSettings());
      }
    },
    [adapter]
  );

  const handleLockNow = useCallback(() => {
    adapter.lockSession('manual');
    window.location.reload();
  }, [adapter]);

  // No PIN configured — show setup prompt
  if (!hasPinSetup) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-4">
          <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            PIN lock is not configured. Setup a PIN to secure your account.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSetupDialog(true)}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
            'bg-primary text-primary-foreground transition-opacity hover:opacity-90'
          )}
        >
          <Shield className="h-4 w-4" />
          Setup PIN Lock
        </button>

        {/* Setup inline dialog */}
        {showSetupDialog && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Setup PIN"
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowSetupDialog(false)}
              onKeyDown={(e) => { if (e.key === 'Escape') setShowSetupDialog(false); }}
              role="button"
              tabIndex={0}
              aria-label="Close"
            />
            <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl">
              <PinSetup
                adapter={adapter.pinSetupAdapter}
                userId={userId}
                userName={userName}
                onComplete={() => {
                  setShowSetupDialog(false);
                  setHasPinSetup(true);
                  setPinSettings(adapter.loadPinSettings());
                  refreshCredentials();
                }}
                onCancel={() => setShowSetupDialog(false)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-foreground" />
          <h3 className="font-semibold text-foreground">PIN Lock Status</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">Your PIN lock is active</p>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Last activity</p>
            <p className="text-sm text-muted-foreground">{adapter.getFormattedTimeSinceActivity()}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleLockNow}
            className={cn(
              'inline-flex items-center gap-2 rounded-md border border-input px-3 py-1.5',
              'text-sm font-medium text-foreground hover:bg-muted transition-colors'
            )}
          >
            <Lock className="h-4 w-4" />
            Lock Now
          </button>
          <button
            type="button"
            onClick={() => setShowChangePinDialog(true)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md border border-input px-3 py-1.5',
              'text-sm font-medium text-foreground hover:bg-muted transition-colors'
            )}
          >
            Change PIN
          </button>
          <button
            type="button"
            onClick={() => setShowDisablePinDialog(true)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md border border-input px-3 py-1.5',
              'text-sm font-medium text-foreground hover:bg-muted transition-colors'
            )}
          >
            Disable PIN
          </button>
        </div>
      </div>

      {/* Lock Options */}
      {pinSettings && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-foreground" />
            <h3 className="font-semibold text-foreground">Lock Options</h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">Configure when your app locks</p>

          <div className="space-y-4">
            {/* Lock on close */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="toggle-lock-close" className="text-sm font-medium text-foreground">
                  Lock on app close
                </label>
                <p className="text-sm text-muted-foreground">
                  Require PIN when you close and reopen the app
                </p>
              </div>
              <Toggle
                id="toggle-lock-close"
                checked={pinSettings.lockOnClose}
                onChange={(checked) => handleSettingsChange({ lockOnClose: checked })}
              />
            </div>

            {/* Lock on background */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="toggle-lock-bg" className="text-sm font-medium text-foreground">
                  Lock on background
                </label>
                <p className="text-sm text-muted-foreground">
                  Require PIN when switching to another app
                </p>
              </div>
              <Toggle
                id="toggle-lock-bg"
                checked={pinSettings.lockOnBackground}
                onChange={(checked) => handleSettingsChange({ lockOnBackground: checked })}
              />
            </div>

            {/* Auto-lock timeout */}
            <div className="space-y-2">
              <label
                htmlFor="select-timeout"
                className="flex items-center gap-2 text-sm font-medium text-foreground"
              >
                <Clock className="h-4 w-4" />
                Auto-lock timeout
              </label>
              <select
                id="select-timeout"
                value={pinSettings.lockTimeoutMinutes.toString()}
                onChange={(e) =>
                  handleSettingsChange({
                    lockTimeoutMinutes: parseInt(e.target.value, 10) as 0 | 5 | 15 | 30 | 60,
                  })
                }
                className={cn(
                  'block w-full rounded-md border border-input bg-background px-3 py-2',
                  'text-sm text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
                )}
              >
                <option value="0">Never</option>
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Credentials */}
      {pinSettings && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-foreground" />
            <h3 className="font-semibold text-foreground">Biometric Authentication</h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Manage biometric credentials for quick unlock
          </p>

          {credentials.length === 0 ? (
            <div className="py-4 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                No biometric credentials registered
              </p>
              <button
                type="button"
                onClick={async () => {
                  const result = await adapter.registerBiometric(userId, userName);
                  if (result.success) {
                    refreshCredentials();
                    handleSettingsChange({ biometricEnabled: true });
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border border-input px-3 py-1.5',
                  'text-sm font-medium text-foreground hover:bg-muted transition-colors'
                )}
              >
                <Plus className="h-4 w-4" />
                Add Biometric
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Fingerprint className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{cred.deviceName}</p>
                      <p className="text-xs text-muted-foreground">
                        {adapter.getCredentialTypeDescription(cred.credentialType)} •{' '}
                        {adapter.formatLastUsed(cred.lastUsedAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Remove credential"
                    onClick={() => {
                      adapter.removeCredential(cred.credentialId);
                      const updated = adapter.getStoredCredentials();
                      setCredentials(updated);
                      if (updated.length === 0) {
                        handleSettingsChange({ biometricEnabled: false });
                      }
                    }}
                    className={cn(
                      'rounded-md p-1.5 text-muted-foreground',
                      'hover:bg-muted hover:text-foreground transition-colors'
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={async () => {
                  const result = await adapter.registerBiometric(userId, userName);
                  if (result.success) {
                    refreshCredentials();
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border border-input px-3 py-1.5',
                  'text-sm font-medium text-foreground hover:bg-muted transition-colors'
                )}
              >
                <Plus className="h-4 w-4" />
                Add Another Device
              </button>
            </div>
          )}
        </div>
      )}

      {/* Security History */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-foreground" />
          <h3 className="font-semibold text-foreground">Security History</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">Recent PIN unlock attempts</p>
        <button
          type="button"
          onClick={() => setShowAttemptsDialog(true)}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border border-input px-3 py-1.5',
            'text-sm font-medium text-foreground hover:bg-muted transition-colors'
          )}
        >
          View Recent Attempts
        </button>
      </div>

      {/* Dialogs */}
      <ChangePinDialog
        open={showChangePinDialog}
        onClose={() => setShowChangePinDialog(false)}
        adapter={adapter}
      />

      <DisablePinDialog
        open={showDisablePinDialog}
        onClose={() => setShowDisablePinDialog(false)}
        adapter={adapter}
        onDisabled={() => {
          setHasPinSetup(false);
          setPinSettings(null);
          setCredentials([]);
        }}
      />

      <AttemptsDialog
        open={showAttemptsDialog}
        onClose={() => setShowAttemptsDialog(false)}
        adapter={adapter}
      />
    </div>
  );
}

export default PinManage;
