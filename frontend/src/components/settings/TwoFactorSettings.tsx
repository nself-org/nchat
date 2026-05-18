"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { SettingsSection } from "./settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Smartphone,
  Key,
  Check,
  AlertCircle,
  Copy,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSecurity } from "@/lib/security/use-security";

interface TwoFactorSettingsProps {
  className?: string;
}

/**
 * TwoFactorSettings - 2FA setup and management
 * Uses real QR code generation via the qrcode library
 */
export function TwoFactorSettings({ className }: TwoFactorSettingsProps) {
  const {
    twoFactorEnabled,
    twoFactorSetupData,
    isSettingUp2FA,
    isVerifying2FA,
    isDisabling2FA,
    twoFactorError,
    setup2FA,
    verify2FA,
    disable2FA,
    cancel2FASetup,
  } = useSecurity();

  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [step, setStep] = useState<"qr" | "verify" | "backup">("qr");
  const [verifyCode, setVerifyCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Combined error state
  const error = localError || twoFactorError;

  // Reset state when dialog closes
  useEffect(() => {
    if (!setupOpen) {
      setStep("qr");
      setVerifyCode("");
      setLocalError(null);
      setBackupCodes([]);
    }
  }, [setupOpen]);

  const handleEnable = async () => {
    setSetupOpen(true);
    setStep("qr");
    setVerifyCode("");
    setLocalError(null);

    // Start 2FA setup to generate QR code
    const result = await setup2FA();
    if (!result.success) {
      setLocalError(result.error || "Failed to start 2FA setup");
    }
  };

  const handleVerify = async () => {
    setLocalError(null);

    // Validate code format
    if (!/^\d{6}$/.test(verifyCode)) {
      setLocalError("Please enter a valid 6-digit code");
      return;
    }

    const result = await verify2FA(verifyCode);
    if (result.success) {
      // Store backup codes from setup data
      if (twoFactorSetupData?.backupCodes) {
        setBackupCodes(twoFactorSetupData.backupCodes);
      }
      setStep("backup");
    } else {
      setLocalError(result.error || "Verification failed");
    }
  };

  const handleComplete = () => {
    setSetupOpen(false);
  };

  const handleDisable = async () => {
    setLocalError(null);

    if (!disablePassword) {
      setLocalError("Please enter your password");
      return;
    }

    const result = await disable2FA(disablePassword);
    if (result.success) {
      setDisableOpen(false);
      setDisablePassword("");
    } else {
      setLocalError(result.error || "Failed to disable 2FA");
    }
  };

  const handleCancelSetup = () => {
    cancel2FASetup();
    setSetupOpen(false);
  };

  const copyBackupCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SettingsSection
      title="Two-Factor Authentication"
      description="Add an extra layer of security to your account"
      className={className}
    >
      <div className="space-y-4">
        {/* Status Card */}
        <div
          className={cn(
            "flex items-center justify-between rounded-lg border p-4",
            twoFactorEnabled &&
              "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                twoFactorEnabled
                  ? "bg-green-100 dark:bg-green-900"
                  : "bg-muted",
              )}
            >
              {twoFactorEnabled ? (
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {twoFactorEnabled
                  ? "Two-factor authentication is enabled"
                  : "Authenticator App"}
              </p>
              <p className="text-sm text-muted-foreground">
                {twoFactorEnabled
                  ? "Your account is protected with 2FA"
                  : "Use an authenticator app to generate verification codes"}
              </p>
            </div>
          </div>
          <Button
            variant={twoFactorEnabled ? "outline" : "default"}
            onClick={
              twoFactorEnabled ? () => setDisableOpen(true) : handleEnable
            }
            disabled={isSettingUp2FA}
          >
            {isSettingUp2FA ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : twoFactorEnabled ? (
              "Disable"
            ) : (
              "Enable"
            )}
          </Button>
        </div>

        {/* Info about 2FA */}
        {!twoFactorEnabled && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Why use 2FA?</strong> Two-factor authentication adds an
              extra layer of security by requiring a verification code from your
              phone in addition to your password.
            </p>
          </div>
        )}
      </div>

      {/* Setup Dialog */}
      <Dialog
        open={setupOpen}
        onOpenChange={(open) => !open && handleCancelSetup()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === "qr" && "Set Up Authenticator App"}
              {step === "verify" && "Verify Code"}
              {step === "backup" && "Save Backup Codes"}
            </DialogTitle>
            <DialogDescription>
              {step === "qr" &&
                "Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)"}
              {step === "verify" &&
                "Enter the 6-digit code from your authenticator app"}
              {step === "backup" &&
                "Save these backup codes in a safe place. You can use them to access your account if you lose your phone."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "qr" && (
            <div className="space-y-4 py-4">
              {/* QR Code - Generated using qrcode library */}
              <div className="mx-auto h-48 w-48 rounded-lg border bg-white p-4">
                {isSettingUp2FA ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : twoFactorSetupData?.qrCodeDataUrl ? (
                  <Image
                    src={twoFactorSetupData.qrCodeDataUrl}
                    alt="2FA QR Code - Scan with your authenticator app"
                    width={160}
                    height={160}
                    className="h-full w-full"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-center text-sm text-muted-foreground">
                      Failed to generate QR code
                    </p>
                  </div>
                )}
              </div>

              {/* Manual entry */}
              {twoFactorSetupData?.secret && (
                <div className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    Can&apos;t scan? Enter this code manually:
                  </p>
                  <code className="rounded bg-muted px-3 py-1.5 font-mono text-sm">
                    {twoFactorSetupData.secret}
                  </code>
                </div>
              )}
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="verify-code">Verification Code</Label>
                <Input
                  id="verify-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) =>
                    setVerifyCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  className="text-center font-mono text-lg tracking-widest"
                  autoComplete="one-time-code"
                />
              </div>
            </div>
          )}

          {step === "backup" && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <code
                      key={index}
                      className="rounded bg-background px-2 py-1 text-center font-mono text-sm"
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={copyBackupCodes}
                className="w-full gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Backup Codes
                  </>
                )}
              </Button>
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  Each backup code can only be used once. Store them securely.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            {step === "qr" && (
              <>
                <Button variant="outline" onClick={handleCancelSetup}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep("verify")}
                  disabled={!twoFactorSetupData?.qrCodeDataUrl}
                >
                  Continue
                </Button>
              </>
            )}
            {step === "verify" && (
              <>
                <Button variant="outline" onClick={() => setStep("qr")}>
                  Back
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={isVerifying2FA || verifyCode.length !== 6}
                >
                  {isVerifying2FA ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </>
            )}
            {step === "backup" && (
              <Button onClick={handleComplete}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable 2FA? Your account will be less
              secure without it.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Confirm Password</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDisableOpen(false);
                setDisablePassword("");
                setLocalError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={isDisabling2FA || !disablePassword}
            >
              {isDisabling2FA ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable 2FA"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
