"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSecurity } from "@/lib/security/use-security";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  Smartphone,
  Shield,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  QrCode,
  Key,
  Download,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";

type SetupStep = "initial" | "qr" | "verify" | "backup" | "complete";

export function TwoFactorSetup() {
  const { isDevMode } = useAuth();
  const {
    twoFactorEnabled,
    twoFactorSetupData,
    backupCodesRemaining,
    isSettingUp2FA,
    isVerifying2FA,
    isDisabling2FA,
    twoFactorError,
    setup2FA,
    verify2FA,
    disable2FA,
    cancel2FASetup,
    regenerateBackupCodes,
  } = useSecurity();

  // UI state
  const [setupStep, setSetupStep] = useState<SetupStep>("initial");
  const [verificationCode, setVerificationCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Start 2FA setup
  const handleStartSetup = useCallback(async () => {
    const result = await setup2FA();
    if (result.success) {
      setSetupStep("qr");
    }
  }, [setup2FA]);

  // Verify code and complete setup
  const handleVerify = useCallback(async () => {
    if (verificationCode.length !== 6) return;

    const result = await verify2FA(verificationCode);
    if (result.success) {
      setSetupStep("backup");
    }
  }, [verificationCode, verify2FA]);

  // Complete setup
  const handleComplete = useCallback(() => {
    setSetupStep("complete");
    setVerificationCode("");

    // Reset to initial after showing success
    setTimeout(() => {
      setSetupStep("initial");
    }, 3000);
  }, []);

  // Cancel setup
  const handleCancel = useCallback(() => {
    cancel2FASetup();
    setSetupStep("initial");
    setVerificationCode("");
  }, [cancel2FASetup]);

  // Disable 2FA
  const handleDisable = useCallback(async () => {
    const result = await disable2FA(disablePassword);
    if (result.success) {
      setShowDisableDialog(false);
      setDisablePassword("");
    }
  }, [disablePassword, disable2FA]);

  // Copy secret to clipboard
  const handleCopySecret = useCallback(async () => {
    if (!twoFactorSetupData?.secret) return;
    await navigator.clipboard.writeText(twoFactorSetupData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  }, [twoFactorSetupData?.secret]);

  // Copy backup codes to clipboard
  const handleCopyBackupCodes = useCallback(async () => {
    const codes = newBackupCodes || twoFactorSetupData?.backupCodes;
    if (!codes) return;

    const text = codes.join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  }, [newBackupCodes, twoFactorSetupData?.backupCodes]);

  // Download backup codes
  const handleDownloadBackupCodes = useCallback(() => {
    const codes = newBackupCodes || twoFactorSetupData?.backupCodes;
    if (!codes) return;

    const text = `nchat Backup Codes\n${"=".repeat(20)}\n\nThese codes can be used to sign in if you lose access to your authenticator app.\nEach code can only be used once.\n\n${codes.map((code, i) => `${i + 1}. ${code}`).join("\n")}\n\nGenerated: ${new Date().toISOString()}\n`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nchat-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [newBackupCodes, twoFactorSetupData?.backupCodes]);

  // Regenerate backup codes
  const handleRegenerateBackupCodes = useCallback(async () => {
    setIsRegenerating(true);
    const codes = await regenerateBackupCodes();
    if (codes) {
      setNewBackupCodes(codes);
      setShowBackupCodesDialog(true);
    }
    setIsRegenerating(false);
  }, [regenerateBackupCodes]);

  // If 2FA is already enabled, show management UI
  if (twoFactorEnabled && setupStep === "initial") {
    return (
      <div className="space-y-6">
        {/* Status Card */}
        <div className="flex items-start gap-4 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
          <div className="rounded-full bg-green-500/20 p-2">
            <Shield className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-green-600">
              Two-Factor Authentication Enabled
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account is protected with an additional layer of security.
            </p>
          </div>
        </div>

        {/* Backup Codes Status */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Backup Codes</p>
              <p className="text-sm text-muted-foreground">
                {backupCodesRemaining} codes remaining
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateBackupCodes}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate
          </Button>
        </div>

        {/* Disable Button */}
        <div className="flex justify-end">
          <Button
            data-testid="toggle-two-factor"
            variant="destructive"
            onClick={() => setShowDisableDialog(true)}
          >
            Disable Two-Factor Authentication
          </Button>
        </div>

        {/* Disable Dialog */}
        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                This will remove the extra layer of security from your account.
                Enter your password to confirm.
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Disabling 2FA will make your account less secure. Make sure you
                have a strong password.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="disable-password">Password</Label>
              <div className="relative">
                <Input
                  id="disable-password"
                  type={showPassword ? "text" : "password"}
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {twoFactorError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{twoFactorError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDisableDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={!disablePassword || isDisabling2FA}
              >
                {isDisabling2FA ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Disable 2FA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Backup Codes Dialog */}
        <Dialog
          open={showBackupCodesDialog}
          onOpenChange={setShowBackupCodesDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Backup Codes Generated</DialogTitle>
              <DialogDescription>
                Your old backup codes have been invalidated. Save these new
                codes in a secure location.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-4 font-mono text-sm">
              {newBackupCodes?.map((code, index) => (
                <div key={index} className="py-1">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCopyBackupCodes}
              >
                {copiedCodes ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copiedCodes ? "Copied!" : "Copy"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownloadBackupCodes}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={() => setShowBackupCodesDialog(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Setup flow
  return (
    <div className="space-y-6">
      {/* Dev Mode Notice */}
      {isDevMode && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            In development mode, 2FA setup is simulated and will not persist.
          </AlertDescription>
        </Alert>
      )}

      {/* Initial State - Not enabled */}
      {setupStep === "initial" && (
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
            <div className="rounded-full bg-yellow-500/20 p-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-yellow-600">
                Two-Factor Authentication Not Enabled
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add an extra layer of security to your account by requiring a
                verification code in addition to your password.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">How it works:</h4>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Download an authenticator app like Google Authenticator or Authy
              </li>
              <li>Scan the QR code with your authenticator app</li>
              <li>Enter the 6-digit code to verify setup</li>
              <li>Save your backup codes in a secure location</li>
            </ol>
          </div>

          <Button
            data-testid="toggle-two-factor"
            onClick={handleStartSetup}
            disabled={isSettingUp2FA}
          >
            {isSettingUp2FA ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Smartphone className="mr-2 h-4 w-4" />
            )}
            Enable Two-Factor Authentication
          </Button>
        </div>
      )}

      {/* QR Code Step */}
      {setupStep === "qr" && twoFactorSetupData && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="mb-2 font-medium">Scan QR Code</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Use your authenticator app to scan this QR code
            </p>

            {/* QR Code - Generated using qrcode library */}
            <div className="inline-flex items-center justify-center rounded-lg border bg-white p-4">
              {twoFactorSetupData.qrCodeDataUrl ? (
                <Image
                  src={twoFactorSetupData.qrCodeDataUrl}
                  alt="2FA QR Code - Scan with your authenticator app"
                  width={192}
                  height={192}
                  className="h-48 w-48"
                  unoptimized
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Manual Entry */}
          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">
              Or enter this code manually:
            </p>
            <div className="flex items-center justify-center gap-2">
              <code className="rounded bg-muted px-3 py-2 font-mono text-sm">
                {twoFactorSetupData.secret}
              </code>
              <Button variant="ghost" size="sm" onClick={handleCopySecret}>
                {copiedSecret ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={() => setSetupStep("verify")}>Continue</Button>
          </div>
        </div>
      )}

      {/* Verify Step */}
      {setupStep === "verify" && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="mb-2 font-medium">Verify Setup</h3>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="mx-auto max-w-xs">
            <Label htmlFor="verification-code" className="sr-only">
              Verification Code
            </Label>
            <Input
              id="verification-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(e.target.value.replace(/\D/g, ""))
              }
              placeholder="000000"
              className="text-center font-mono text-2xl tracking-widest"
              autoFocus // eslint-disable-line jsx-a11y/no-autofocus
            />
          </div>

          {twoFactorError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{twoFactorError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setSetupStep("qr")}>
              Back
            </Button>
            <Button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || isVerifying2FA}
            >
              {isVerifying2FA ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Verify
            </Button>
          </div>
        </div>
      )}

      {/* Backup Codes Step */}
      {setupStep === "backup" && twoFactorSetupData && (
        <div className="space-y-6">
          <Alert className="border-amber-500/20 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-600">
              Save these backup codes in a secure location. You will need them
              if you lose access to your authenticator app.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-4 font-mono text-sm">
            {twoFactorSetupData.backupCodes.map((code, index) => (
              <div key={index} className="py-1">
                {code}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyBackupCodes}
            >
              {copiedCodes ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copiedCodes ? "Copied!" : "Copy Codes"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownloadBackupCodes}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleComplete}>I've Saved My Backup Codes</Button>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {setupStep === "complete" && (
        <div className="space-y-4 py-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-green-600">
              Two-Factor Authentication Enabled
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account is now more secure
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
