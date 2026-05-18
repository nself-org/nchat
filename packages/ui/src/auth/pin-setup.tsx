/**
 * PinSetup — multi-step PIN creation wizard.
 *
 * Injectable: all security operations come via PinSetupAdapter — no lib deps.
 * Steps: pin entry → lock options → optional biometric.
 * Replaces Radix UI components with Tailwind-styled native HTML.
 *
 * @module auth/pin-setup
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Lock,
  Clock,
  Smartphone,
  Fingerprint,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PinSettings {
  lockOnClose: boolean;
  lockOnBackground: boolean;
  lockTimeoutMinutes: 0 | 5 | 15 | 30 | 60;
  biometricEnabled: boolean;
}

export interface PinStrength {
  strength: 'weak' | 'medium' | 'strong';
  message: string;
}

export interface PinSetupAdapter {
  setupPin: (
    pin: string,
    confirmPin: string,
    settings: PinSettings
  ) => Promise<{ success: boolean; error?: string; settings?: PinSettings }>;
  getPinStrength: (pin: string) => PinStrength;
  isValidPinFormat: (pin: string) => boolean;
  isBiometricAvailable: () => Promise<boolean>;
  getBiometricType: () => Promise<string>;
  registerBiometric: (
    userId: string,
    userName: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export interface PinSetupProps {
  adapter: PinSetupAdapter;
  userId: string;
  userName: string;
  onComplete?: (settings: PinSettings) => void;
  onCancel?: () => void;
}

type SetupStep = 'pin' | 'options' | 'biometric';
type LockTimeout = 0 | 5 | 15 | 30 | 60;

// ============================================================================
// PinSetup
// ============================================================================

/**
 * Three-step PIN setup wizard: (1) enter + confirm PIN, (2) lock options,
 * (3) optional biometric enrollment. All security calls go through adapter.
 */
export function PinSetup({
  adapter,
  userId,
  userName,
  onComplete,
  onCancel,
}: PinSetupProps) {
  // PIN input state
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Lock options
  const [lockOnClose, setLockOnClose] = useState(false);
  const [lockOnBackground, setLockOnBackground] = useState(false);
  const [lockTimeout, setLockTimeout] = useState<LockTimeout>(15);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Biometric support
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<SetupStep>('pin');

  // Check biometric availability
  useEffect(() => {
    (async () => {
      const available = await adapter.isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const type = await adapter.getBiometricType();
        setBiometricType(type);
      }
    })();
  }, [adapter]);

  const currentSettings = (): PinSettings => ({
    lockOnClose,
    lockOnBackground,
    lockTimeoutMinutes: lockTimeout,
    biometricEnabled: false,
  });

  // PIN strength
  const pinStrength = pin.length >= 4 ? adapter.getPinStrength(pin) : null;

  // Validation
  const isPinValid = adapter.isValidPinFormat(pin);
  const isPinConfirmed = confirmPin.length > 0 && pin === confirmPin;
  const canProceedFromPin = isPinValid && isPinConfirmed;

  const handleSetupPin = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await adapter.setupPin(pin, confirmPin, {
        ...currentSettings(),
        biometricEnabled: false,
      });

      if (!result.success) {
        setError(result.error ?? 'Failed to setup PIN');
        return;
      }

      if (biometricEnabled && biometricAvailable) {
        setStep('biometric');
      } else if (result.settings && onComplete) {
        onComplete(result.settings);
      }
    } catch {
      console.error('PIN setup error');
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [adapter, pin, confirmPin, lockOnClose, lockOnBackground, lockTimeout, biometricEnabled, biometricAvailable, onComplete]);

  const handleBiometricSetup = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const biResult = await adapter.registerBiometric(userId, userName);

      if (!biResult.success) {
        setError(biResult.error ?? 'Failed to setup biometric authentication');
        return;
      }

      const pinResult = await adapter.setupPin(pin, confirmPin, {
        ...currentSettings(),
        biometricEnabled: true,
      });

      if (pinResult.settings && onComplete) {
        onComplete(pinResult.settings);
      }
    } catch {
      console.error('Biometric setup error');
      setError('Failed to setup biometric authentication');
    } finally {
      setIsLoading(false);
    }
  }, [adapter, userId, userName, pin, confirmPin, lockOnClose, lockOnBackground, lockTimeout, onComplete]);

  const handleSkipBiometric = useCallback(async () => {
    const result = await adapter.setupPin(pin, confirmPin, {
      ...currentSettings(),
      biometricEnabled: false,
    });
    if (result.settings && onComplete) {
      onComplete(result.settings);
    }
  }, [adapter, pin, confirmPin, lockOnClose, lockOnBackground, lockTimeout, onComplete]);

  // ============================================================================
  // Render steps
  // ============================================================================

  const renderPinStep = () => (
    <>
      {/* Card header */}
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Shield className="h-5 w-5" />
          Setup PIN Lock
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Create a 4-6 digit PIN to secure your account</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN input */}
        <div className="space-y-2">
          <label htmlFor="pin" className="block text-sm font-medium text-foreground">
            PIN (4-6 digits)
          </label>
          <div className="relative">
            <input
              id="pin"
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                setError(null);
              }}
              placeholder="Enter PIN"
              className={cn(
                'w-full rounded-lg border border-input bg-background px-3 py-2 pr-20 text-sm text-foreground',
                'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {showPin ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* PIN strength */}
          {pinStrength && (
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-2 w-full rounded-full',
                pinStrength.strength === 'weak' && 'bg-red-200',
                pinStrength.strength === 'medium' && 'bg-yellow-200',
                pinStrength.strength === 'strong' && 'bg-green-200'
              )}>
                <div className={cn(
                  'h-full rounded-full transition-all',
                  pinStrength.strength === 'weak' && 'w-1/3 bg-red-500',
                  pinStrength.strength === 'medium' && 'w-2/3 bg-yellow-500',
                  pinStrength.strength === 'strong' && 'w-full bg-green-500'
                )} />
              </div>
              <span className={cn(
                'text-xs font-medium whitespace-nowrap',
                pinStrength.strength === 'weak' && 'text-red-600',
                pinStrength.strength === 'medium' && 'text-yellow-600',
                pinStrength.strength === 'strong' && 'text-green-600'
              )}>
                {pinStrength.message}
              </span>
            </div>
          )}
        </div>

        {/* Confirm PIN */}
        <div className="space-y-2">
          <label htmlFor="confirm-pin" className="block text-sm font-medium text-foreground">
            Confirm PIN
          </label>
          <input
            id="confirm-pin"
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => {
              setConfirmPin(e.target.value.replace(/\D/g, ''));
              setError(null);
            }}
            placeholder="Confirm PIN"
            className={cn(
              'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground',
              'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
          />
          {confirmPin.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              {isPinConfirmed ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">PINs match</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">PINs do not match</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() => setStep('options')}
          disabled={!canProceedFromPin || isLoading}
          className={cn(
            'ml-auto rounded-lg px-4 py-2 text-sm font-medium',
            'bg-primary text-primary-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-opacity hover:opacity-90'
          )}
        >
          Next: Lock Options
        </button>
      </div>
    </>
  );

  const renderOptionsStep = () => (
    <>
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Lock className="h-5 w-5" />
          Lock Options
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Configure when your app should lock</p>
      </div>

      <div className="space-y-6">
        {/* Lock on close */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <label htmlFor="lock-close" className="text-sm font-medium text-foreground">
              Lock on app close
            </label>
            <p className="text-xs text-muted-foreground">Require PIN when you close and reopen the app</p>
          </div>
          <button
            id="lock-close"
            type="button"
            role="switch"
            aria-checked={lockOnClose}
            onClick={() => setLockOnClose(!lockOnClose)}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              lockOnClose ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
              lockOnClose ? 'translate-x-5' : 'translate-x-0.5'
            )} />
          </button>
        </div>

        {/* Lock on background */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <label htmlFor="lock-background" className="text-sm font-medium text-foreground">
              Lock when app goes to background
            </label>
            <p className="text-xs text-muted-foreground">Require PIN when switching to another app</p>
          </div>
          <button
            id="lock-background"
            type="button"
            role="switch"
            aria-checked={lockOnBackground}
            onClick={() => setLockOnBackground(!lockOnBackground)}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              lockOnBackground ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
              lockOnBackground ? 'translate-x-5' : 'translate-x-0.5'
            )} />
          </button>
        </div>

        {/* Auto-lock timeout */}
        <div className="space-y-2">
          <label htmlFor="lock-timeout" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4" />
            Auto-lock timeout
          </label>
          <select
            id="lock-timeout"
            value={lockTimeout}
            onChange={(e) => setLockTimeout(parseInt(e.target.value) as LockTimeout)}
            className={cn(
              'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
          >
            <option value="0">Never</option>
            <option value="5">5 minutes</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
          </select>
          <p className="text-xs text-muted-foreground">Lock after this period of inactivity</p>
        </div>

        {/* Biometric option */}
        {biometricAvailable && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <label htmlFor="biometric-toggle" className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Fingerprint className="h-4 w-4" />
                Enable {biometricType}
              </label>
              <p className="text-xs text-muted-foreground">Unlock with biometric authentication</p>
            </div>
            <button
              id="biometric-toggle"
              type="button"
              role="switch"
              aria-checked={biometricEnabled}
              onClick={() => setBiometricEnabled(!biometricEnabled)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                biometricEnabled ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                biometricEnabled ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep('pin')}
          className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSetupPin}
          disabled={isLoading}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium',
            'bg-primary text-primary-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-opacity hover:opacity-90'
          )}
        >
          {biometricEnabled && biometricAvailable ? 'Next: Biometric Setup' : 'Complete Setup'}
        </button>
      </div>
    </>
  );

  const renderBiometricStep = () => (
    <>
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Fingerprint className="h-5 w-5" />
          Setup {biometricType}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Register your biometric authentication</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Smartphone className="mb-4 h-16 w-16 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">Ready to setup {biometricType}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Click the button below to register your biometric authentication. You will be prompted
            to use your device's biometric sensor.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleSkipBiometric}
          disabled={isLoading}
          className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={handleBiometricSetup}
          disabled={isLoading}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium',
            'bg-primary text-primary-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-opacity hover:opacity-90'
          )}
        >
          Setup {biometricType}
        </button>
      </div>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      {step === 'pin' && renderPinStep()}
      {step === 'options' && renderOptionsStep()}
      {step === 'biometric' && renderBiometricStep()}
    </div>
  );
}

export default PinSetup;
