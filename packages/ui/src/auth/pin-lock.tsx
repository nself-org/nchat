/**
 * PinLock — fullscreen PIN unlock overlay component.
 *
 * Decoupled from @/lib/security/*: all security operations injected as props.
 * Works in Next.js, Tauri desktop, and Capacitor mobile.
 *
 * @module auth/pin-lock
 */

import { useState, useEffect, useRef } from 'react';
import { Lock, Fingerprint, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// Types — injectable security operations
// ============================================================================

export interface LockoutInfo {
  isLocked: boolean;
  remainingMinutes: number;
  failedAttempts: number;
}

export interface PinLockAdapter {
  /**
   * Verify the submitted PIN. Returns true if correct.
   * Implementations handle hashing/salting internally.
   */
  verifyPin(pin: string): Promise<boolean>;
  /**
   * Record a PIN attempt (success or failure).
   */
  recordAttempt(success: boolean, reason?: string): void;
  /** Returns current lockout state */
  checkLockout(): LockoutInfo;
  /** Called on successful unlock to clear the session lock */
  unlockSession(): void;
  /** Returns the reason the app was locked, if any */
  getLockReason(): string | null;
  /** Whether biometric auth is available */
  isBiometricAvailable(): boolean;
  /** Attempt biometric authentication */
  verifyBiometric(): Promise<{ success: boolean; error?: string }>;
  /** Human-readable biometric type (e.g. "Face ID", "Fingerprint") */
  getBiometricType(): string;
}

export interface PinLockProps {
  /** Injectable security adapter */
  adapter: PinLockAdapter;
  /** Called when unlock succeeds */
  onUnlock?: () => void;
  /** Called when user requests PIN reset (forgot PIN) */
  onForgotPin?: () => void;
  /** Whether to attempt biometric unlock (default: true) */
  showBiometric?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getLockReasonMessage(reason: string | null): string | null {
  if (!reason) return null;
  switch (reason) {
    case 'timeout': return 'App locked due to inactivity';
    case 'manual': return 'App locked manually';
    case 'close': return 'App locked on close';
    case 'background': return 'App locked when sent to background';
    case 'failed_attempts': return 'App locked due to too many failed attempts';
    default: return 'App is locked';
  }
}

// ============================================================================
// PinLock
// ============================================================================

/**
 * Fullscreen PIN lock overlay with biometric support.
 *
 * @example
 * ```tsx
 * <PinLock
 *   adapter={pinLockAdapter}
 *   onUnlock={() => setShowLock(false)}
 *   onForgotPin={handleForgotPin}
 * />
 * ```
 */
export function PinLock({
  adapter,
  onUnlock,
  onForgotPin,
  showBiometric = true,
  className,
}: PinLockProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [isBiometricVerifying, setIsBiometricVerifying] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState<LockoutInfo>({
    isLocked: false,
    remainingMinutes: 0,
    failedAttempts: 0,
  });
  const [lockReason, setLockReason] = useState<string | null>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Check lockout periodically
  useEffect(() => {
    function check() {
      const info = adapter.checkLockout();
      setLockoutInfo(info);
      if (!info.isLocked && error?.includes('locked')) {
        setError(null);
      }
    }
    check();
    const interval = setInterval(check, 10_000);
    return () => clearInterval(interval);
  }, [adapter, error]);

  // Check biometric availability
  useEffect(() => {
    if (!showBiometric || !adapter.isBiometricAvailable()) {
      setBiometricAvailable(false);
      return;
    }
    setBiometricAvailable(true);
    setBiometricType(adapter.getBiometricType());
  }, [adapter, showBiometric]);

  // Get lock reason
  useEffect(() => {
    setLockReason(getLockReasonMessage(adapter.getLockReason()));
  }, [adapter]);

  // Focus input on mount
  useEffect(() => {
    if (pinInputRef.current && !lockoutInfo.isLocked) {
      pinInputRef.current.focus();
    }
  }, [lockoutInfo.isLocked]);

  // Handle PIN submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (lockoutInfo.isLocked) {
      setError(
        `Too many failed attempts. Try again in ${lockoutInfo.remainingMinutes} minute${lockoutInfo.remainingMinutes !== 1 ? 's' : ''}.`
      );
      return;
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      const isValid = await adapter.verifyPin(pin);

      if (isValid) {
        adapter.recordAttempt(true);
        adapter.unlockSession();
        onUnlock?.();
      } else {
        adapter.recordAttempt(false, 'incorrect_pin');
        const lockout = adapter.checkLockout();
        setLockoutInfo(lockout);

        if (lockout.isLocked) {
          setError(
            `Too many failed attempts. Try again in ${lockout.remainingMinutes} minute${lockout.remainingMinutes !== 1 ? 's' : ''}.`
          );
        } else {
          const remaining = 5 - lockout.failedAttempts;
          setError(
            `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before lockout.`
          );
        }
        setPin('');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle biometric unlock
  const handleBiometricUnlock = async () => {
    try {
      setIsBiometricVerifying(true);
      setError(null);

      const result = await adapter.verifyBiometric();

      if (result.success) {
        adapter.recordAttempt(true);
        adapter.unlockSession();
        onUnlock?.();
      } else {
        setError(result.error ?? 'Biometric verification failed');
      }
    } catch {
      setError('Biometric verification failed');
    } finally {
      setIsBiometricVerifying(false);
    }
  };

  const handleDigitInput = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      if (newPin.length === 6) {
        setTimeout(() => handleSubmit(), 100);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(null);
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm',
        className
      )}
    >
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">App Locked</h1>
          {lockReason && (
            <p className="mt-1 text-sm text-muted-foreground">{lockReason}</p>
          )}
        </div>

        {/* PIN dots */}
        <div className="mb-6 flex justify-center gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-3 w-3 rounded-full border-2 transition-colors',
                i < pin.length
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground bg-transparent'
              )}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Number pad */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigitInput(digit)}
              disabled={lockoutInfo.isLocked || isVerifying}
              className="flex h-14 w-full items-center justify-center rounded-xl border border-border bg-card text-lg font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          {/* Biometric or spacer */}
          {biometricAvailable ? (
            <button
              onClick={handleBiometricUnlock}
              disabled={lockoutInfo.isLocked || isVerifying || isBiometricVerifying}
              className="flex h-14 w-full items-center justify-center rounded-xl border border-border bg-card transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Unlock with ${biometricType}`}
            >
              {isBiometricVerifying ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Fingerprint className="h-5 w-5 text-primary" />
              )}
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={() => handleDigitInput('0')}
            disabled={lockoutInfo.isLocked || isVerifying}
            className="flex h-14 w-full items-center justify-center rounded-xl border border-border bg-card text-lg font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={isVerifying || pin.length === 0}
            className="flex h-14 w-full items-center justify-center rounded-xl border border-border bg-card transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Delete last digit"
          >
            <KeyRound className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Hidden text input for keyboard entry */}
        <form onSubmit={handleSubmit}>
          <input
            ref={pinInputRef}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setPin(val);
              setError(null);
            }}
            className="sr-only"
            aria-label="PIN input"
            disabled={lockoutInfo.isLocked || isVerifying}
          />
          <button
            type="submit"
            disabled={pin.length < 4 || isVerifying || lockoutInfo.isLocked}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isVerifying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </span>
            ) : (
              'Unlock'
            )}
          </button>
        </form>

        {/* Forgot PIN */}
        {onForgotPin && (
          <button
            onClick={onForgotPin}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Forgot PIN?
          </button>
        )}
      </div>
    </div>
  );
}

export default PinLock;
