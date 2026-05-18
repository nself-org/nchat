/**
 * PIN Setup Component
 *
 * Allows users to setup a new PIN with lock options
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  setupPin,
  getPinStrength,
  isValidPinFormat,
  type PinSettings,
} from "@/lib/security/pin";
import {
  isBiometricAvailable,
  getBiometricType,
  registerBiometric,
} from "@/lib/security/biometric";
import {
  Shield,
  Lock,
  Clock,
  Smartphone,
  Fingerprint,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface PinSetupProps {
  userId: string;
  userName: string;
  onComplete?: (settings: PinSettings) => void;
  onCancel?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function PinSetup({
  userId,
  userName,
  onComplete,
  onCancel,
}: PinSetupProps) {
  // PIN input state
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Lock options
  const [lockOnClose, setLockOnClose] = useState(false);
  const [lockOnBackground, setLockOnBackground] = useState(false);
  const [lockTimeout, setLockTimeout] = useState<0 | 5 | 15 | 30 | 60>(15);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Biometric support
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState("Biometric");

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"pin" | "options" | "biometric">("pin");

  // Check biometric availability
  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);

      if (available) {
        const type = await getBiometricType();
        setBiometricType(type);
      }
    }

    checkBiometric();
  }, []);

  // PIN strength
  const pinStrength = pin.length >= 4 ? getPinStrength(pin) : null;

  // Validation
  const isPinValid = isValidPinFormat(pin);
  const isPinConfirmed = confirmPin.length > 0 && pin === confirmPin;
  const canProceed =
    step === "pin"
      ? isPinValid && isPinConfirmed
      : step === "options"
        ? true
        : true;

  // Handle PIN setup
  const handleSetupPin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Setup PIN
      const result = await setupPin(pin, confirmPin, {
        lockOnClose,
        lockOnBackground,
        lockTimeoutMinutes: lockTimeout,
        biometricEnabled: false, // Will enable after biometric setup
      });

      if (!result.success) {
        setError(result.error || "Failed to setup PIN");
        return;
      }

      // If biometric enabled, proceed to biometric setup
      if (biometricEnabled && biometricAvailable) {
        setStep("biometric");
      } else {
        // Complete setup
        if (result.settings && onComplete) {
          onComplete(result.settings);
        }
      }
    } catch (err) {
      logger.error("PIN setup error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle biometric setup
  const handleBiometricSetup = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await registerBiometric(userId, userName);

      if (!result.success) {
        setError(result.error || "Failed to setup biometric authentication");
        return;
      }

      // Update PIN settings to enable biometric
      const pinSettings = await setupPin(pin, confirmPin, {
        lockOnClose,
        lockOnBackground,
        lockTimeoutMinutes: lockTimeout,
        biometricEnabled: true,
      });

      if (pinSettings.settings && onComplete) {
        onComplete(pinSettings.settings);
      }
    } catch (err) {
      logger.error("Biometric setup error:", err);
      setError("Failed to setup biometric authentication");
    } finally {
      setIsLoading(false);
    }
  };

  // Skip biometric setup
  const handleSkipBiometric = async () => {
    const result = await setupPin(pin, confirmPin, {
      lockOnClose,
      lockOnBackground,
      lockTimeoutMinutes: lockTimeout,
      biometricEnabled: false,
    });

    if (result.settings && onComplete) {
      onComplete(result.settings);
    }
  };

  // Render PIN input step
  const renderPinStep = () => (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Setup PIN Lock
        </CardTitle>
        <CardDescription>
          Create a 4-6 digit PIN to secure your account
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* PIN Input */}
        <div className="space-y-2">
          <Label htmlFor="pin">PIN (4-6 digits)</Label>
          <div className="relative">
            <Input
              id="pin"
              type={showPin ? "text" : "password"}
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
              className="pr-20"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => setShowPin(!showPin)}
            >
              {showPin ? "Hide" : "Show"}
            </Button>
          </div>

          {/* PIN Strength */}
          {pinStrength && (
            <div className="flex items-center gap-2 text-sm">
              <div
                className={cn(
                  "h-2 w-full rounded-full",
                  pinStrength.strength === "weak" && "bg-red-200",
                  pinStrength.strength === "medium" && "bg-yellow-200",
                  pinStrength.strength === "strong" && "bg-green-200",
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    pinStrength.strength === "weak" && "w-1/3 bg-red-500",
                    pinStrength.strength === "medium" && "w-2/3 bg-yellow-500",
                    pinStrength.strength === "strong" && "w-full bg-green-500",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  pinStrength.strength === "weak" && "text-red-600",
                  pinStrength.strength === "medium" && "text-yellow-600",
                  pinStrength.strength === "strong" && "text-green-600",
                )}
              >
                {pinStrength.message}
              </span>
            </div>
          )}
        </div>

        {/* Confirm PIN */}
        <div className="space-y-2">
          <Label htmlFor="confirm-pin">Confirm PIN</Label>
          <Input
            id="confirm-pin"
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setConfirmPin(value);
              setError(null);
            }}
            placeholder="Confirm PIN"
          />

          {/* Confirmation status */}
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
      </CardContent>

      <CardFooter className="flex justify-between">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          onClick={() => setStep("options")}
          disabled={!canProceed || isLoading}
        >
          Next: Lock Options
        </Button>
      </CardFooter>
    </>
  );

  // Render lock options step
  const renderOptionsStep = () => (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Lock Options
        </CardTitle>
        <CardDescription>Configure when your app should lock</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Lock on close */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex-1">
            <Label htmlFor="lock-close" className="text-base">
              Lock on app close
            </Label>
            <p className="text-sm text-muted-foreground">
              Require PIN when you close and reopen the app
            </p>
          </div>
          <Switch
            id="lock-close"
            checked={lockOnClose}
            onCheckedChange={setLockOnClose}
          />
        </div>

        {/* Lock on background */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex-1">
            <Label htmlFor="lock-background" className="text-base">
              Lock when app goes to background
            </Label>
            <p className="text-sm text-muted-foreground">
              Require PIN when switching to another app
            </p>
          </div>
          <Switch
            id="lock-background"
            checked={lockOnBackground}
            onCheckedChange={setLockOnBackground}
          />
        </div>

        {/* Auto-lock timeout */}
        <div className="space-y-2">
          <Label htmlFor="lock-timeout" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Auto-lock timeout
          </Label>
          <Select
            value={lockTimeout.toString()}
            onValueChange={(value) =>
              setLockTimeout(parseInt(value) as 0 | 5 | 15 | 30 | 60)
            }
          >
            <SelectTrigger id="lock-timeout">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Never</SelectItem>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Lock after this period of inactivity
          </p>
        </div>

        {/* Biometric option */}
        {biometricAvailable && (
          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1">
              <Label
                htmlFor="biometric"
                className="flex items-center gap-2 text-base"
              >
                <Fingerprint className="h-4 w-4" />
                Enable {biometricType}
              </Label>
              <p className="text-sm text-muted-foreground">
                Unlock with biometric authentication
              </p>
            </div>
            <Switch
              id="biometric"
              checked={biometricEnabled}
              onCheckedChange={setBiometricEnabled}
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => setStep("pin")}>
          Back
        </Button>
        <Button onClick={handleSetupPin} disabled={isLoading}>
          {biometricEnabled && biometricAvailable
            ? "Next: Biometric Setup"
            : "Complete Setup"}
        </Button>
      </CardFooter>
    </>
  );

  // Render biometric setup step
  const renderBiometricStep = () => (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Setup {biometricType}
        </CardTitle>
        <CardDescription>
          Register your biometric authentication
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Smartphone className="mb-4 h-16 w-16 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">
            Ready to setup {biometricType}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Click the button below to register your biometric authentication.
            You will be prompted to use your device&apos;s biometric sensor.
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleSkipBiometric}
          disabled={isLoading}
        >
          Skip for now
        </Button>
        <Button onClick={handleBiometricSetup} disabled={isLoading}>
          Setup {biometricType}
        </Button>
      </CardFooter>
    </>
  );

  return (
    <Card className="mx-auto w-full max-w-md">
      {step === "pin" && renderPinStep()}
      {step === "options" && renderOptionsStep()}
      {step === "biometric" && renderBiometricStep()}
    </Card>
  );
}
