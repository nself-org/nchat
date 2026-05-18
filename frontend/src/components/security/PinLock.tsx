/**
 * PIN Lock Overlay Component
 *
 * Fullscreen PIN unlock interface with biometric support
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  loadPinSettings,
  verifyPin,
  recordLocalPinAttempt,
  checkLocalLockout,
} from "@/lib/security/pin";
import { unlockSession, getLockState } from "@/lib/security/session";
import {
  verifyBiometric,
  hasRegisteredCredentials,
  getBiometricType,
} from "@/lib/security/biometric";
import {
  Lock,
  Fingerprint,
  AlertCircle,
  Loader2,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface PinLockProps {
  onUnlock?: () => void;
  onForgotPin?: () => void;
  showBiometric?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function PinLock({
  onUnlock,
  onForgotPin,
  showBiometric = true,
}: PinLockProps) {
  // PIN input
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState("Biometric");
  const [isBiometricVerifying, setIsBiometricVerifying] = useState(false);

  // Lockout state
  const [lockoutInfo, setLockoutInfo] = useState<{
    isLocked: boolean;
    remainingMinutes: number;
    failedAttempts: number;
  }>({ isLocked: false, remainingMinutes: 0, failedAttempts: 0 });

  // Lock reason
  const [lockReason, setLockReason] = useState<string | null>(null);

  // Refs
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Check lockout status on mount and periodically
  useEffect(() => {
    function checkLockout() {
      const lockout = checkLocalLockout();
      setLockoutInfo(lockout);

      if (!lockout.isLocked) {
        // Clear error when lockout expires
        if (error?.includes("locked")) {
          setError(null);
        }
      }
    }

    checkLockout();
    const interval = setInterval(checkLockout, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [error]);

  // Check biometric availability
  useEffect(() => {
    async function checkBiometric() {
      const pinSettings = loadPinSettings();
      if (!pinSettings?.biometricEnabled || !showBiometric) {
        setBiometricAvailable(false);
        return;
      }

      const hasCredentials = hasRegisteredCredentials();
      setBiometricAvailable(hasCredentials);

      if (hasCredentials) {
        const type = await getBiometricType();
        setBiometricType(type);
      }
    }

    checkBiometric();
  }, [showBiometric]);

  // Get lock reason on mount
  useEffect(() => {
    const lockState = getLockState();
    if (lockState.lockReason) {
      setLockReason(getLockReasonMessage(lockState.lockReason));
    }
  }, []);

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
        `Too many failed attempts. Try again in ${lockoutInfo.remainingMinutes} minute${lockoutInfo.remainingMinutes !== 1 ? "s" : ""}.`,
      );
      return;
    }

    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      // Load PIN settings
      const settings = loadPinSettings();
      if (!settings) {
        setError("PIN not configured");
        return;
      }

      // Verify PIN
      const isValid = await verifyPin(pin, settings.pinHash, settings.pinSalt);

      if (isValid) {
        // Record successful attempt
        recordLocalPinAttempt(true);

        // Unlock session
        unlockSession();

        // Notify parent
        if (onUnlock) {
          onUnlock();
        }
      } else {
        // Record failed attempt
        recordLocalPinAttempt(false, "incorrect_pin");

        // Check if now locked out
        const lockout = checkLocalLockout();
        setLockoutInfo(lockout);

        if (lockout.isLocked) {
          setError(
            `Too many failed attempts. Try again in ${lockout.remainingMinutes} minute${lockout.remainingMinutes !== 1 ? "s" : ""}.`,
          );
        } else {
          const remaining = 5 - lockout.failedAttempts;
          setError(
            `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before lockout.`,
          );
        }

        // Clear PIN input
        setPin("");
      }
    } catch (err) {
      logger.error("PIN verification error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle biometric unlock
  const handleBiometricUnlock = async () => {
    try {
      setIsBiometricVerifying(true);
      setError(null);

      const result = await verifyBiometric();

      if (result.success) {
        // Record successful attempt
        recordLocalPinAttempt(true);

        // Unlock session
        unlockSession();

        // Notify parent
        if (onUnlock) {
          onUnlock();
        }
      } else {
        setError(result.error || "Biometric verification failed");
      }
    } catch (err) {
      logger.error("Biometric verification error:", err);
      setError("Biometric verification failed");
    } finally {
      setIsBiometricVerifying(false);
    }
  };

  // Handle PIN digit input (for better UX with number buttons)
  const handleDigitInput = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);

      // Auto-submit when 6 digits entered
      if (newPin.length === 6) {
        setTimeout(() => handleSubmit(), 100);
      }
    }
  };

  // Handle backspace
  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(null);
  };

  // Format lock reason
  function getLockReasonMessage(reason: string): string {
    switch (reason) {
      case "timeout":
        return "App locked due to inactivity";
      case "manual":
        return "App locked manually";
      case "close":
        return "App locked on close";
      case "background":
        return "App locked when sent to background";
      case "failed_attempts":
        return "App locked due to too many failed attempts";
      default:
        return "App is locked";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="bg-primary/10 rounded-full p-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">App Locked</h1>
          {lockReason && (
            <p className="text-sm text-muted-foreground">{lockReason}</p>
          )}
        </div>

        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Lockout message */}
        {lockoutInfo.isLocked && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your account is temporarily locked due to too many failed
              attempts. Please wait {lockoutInfo.remainingMinutes} minute
              {lockoutInfo.remainingMinutes !== 1 ? "s" : ""} before trying
              again.
            </AlertDescription>
          </Alert>
        )}

        {/* PIN Input Form */}
        {!lockoutInfo.isLocked && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* PIN Display */}
            <div className="space-y-2">
              <label htmlFor="pin" className="sr-only">
                Enter PIN
              </label>
              <Input
                ref={pinInputRef}
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setPin(value);
                  setError(null);
                }}
                placeholder="Enter PIN"
                className="text-center text-2xl tracking-widest"
                disabled={isVerifying || lockoutInfo.isLocked}
                autoComplete="off"
              />

              {/* PIN dots visualization */}
              <div className="flex justify-center gap-2 py-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-3 w-3 rounded-full border-2 transition-colors",
                      i < pin.length
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/20",
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isVerifying || pin.length < 4 || lockoutInfo.isLocked}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Unlock
                </>
              )}
            </Button>
          </form>
        )}

        {/* Biometric Unlock */}
        {biometricAvailable && !lockoutInfo.isLocked && (
          <div className="space-y-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or unlock with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleBiometricUnlock}
              disabled={isBiometricVerifying || lockoutInfo.isLocked}
            >
              {isBiometricVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  {biometricType}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Forgot PIN */}
        {onForgotPin && !lockoutInfo.isLocked && (
          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={onForgotPin}
              disabled={isVerifying || isBiometricVerifying}
            >
              Forgot PIN?
            </Button>
          </div>
        )}

        {/* Failed attempts counter */}
        {!lockoutInfo.isLocked && lockoutInfo.failedAttempts > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            {lockoutInfo.failedAttempts} failed attempt
            {lockoutInfo.failedAttempts !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
