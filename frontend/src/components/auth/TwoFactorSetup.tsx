/**
 * TwoFactorSetup Component
 *
 * Complete 2FA setup wizard with QR code, manual entry, verification, and backup codes.
 * Supports Google Authenticator, Authy, Microsoft Authenticator, and other TOTP apps.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertCircle,
  Loader2,
  Check,
  Copy,
  Download,
  Printer,
  QrCode,
  Smartphone,
  Key,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
} from "lucide-react";
import { getRemainingSeconds } from "@/lib/2fa/totp";
import {
  formatBackupCodesForDownload,
  formatBackupCodesForPrint,
} from "@/lib/2fa/backup-codes";
import { useToast } from "@/hooks/use-toast";

interface TwoFactorSetupProps {
  open: boolean;
  onComplete: () => void;
  onCancel: () => void;
  userId: string;
  email: string;
}

type SetupStep = "intro" | "scan" | "verify" | "backup" | "complete";

interface SetupData {
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
  backupCodes: string[];
  manualEntryCode: string;
}

export function TwoFactorSetup({
  open,
  onComplete,
  onCancel,
  userId,
  email,
}: TwoFactorSetupProps) {
  const { toast } = useToast();

  const [step, setStep] = useState<SetupStep>("intro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const [downloadedBackupCodes, setDownloadedBackupCodes] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("intro");
      setSetupData(null);
      setVerificationCode("");
      setError(null);
      setCopiedSecret(false);
      setCopiedBackupCodes(false);
      setDownloadedBackupCodes(false);
    }
  }, [open]);

  // Update countdown timer
  useEffect(() => {
    if (step !== "verify" || !open) return;

    const interval = setInterval(() => {
      setRemainingSeconds(getRemainingSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [step, open]);

  // Step 1: Initialize setup (generate secret and QR code)
  const handleStartSetup = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to initialize 2FA setup");
      }

      setSetupData(result.data);
      setStep("scan");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Setup initialization failed",
      );
    } finally {
      setLoading(false);
    }
  }, [userId, email]);

  // Step 2: Verify TOTP code and enable 2FA
  const handleVerifyCode = useCallback(async () => {
    if (!verificationCode.trim() || !setupData) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          secret: setupData.secret,
          code: verificationCode.trim(),
          backupCodes: setupData.backupCodes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Verification failed");
      }

      toast({
        title: "Success",
        description: "2FA has been enabled successfully",
      });

      setStep("backup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setVerificationCode("");
    } finally {
      setLoading(false);
    }
  }, [verificationCode, setupData, userId, toast]);

  // Copy secret to clipboard
  const handleCopySecret = useCallback(() => {
    if (!setupData) return;

    navigator.clipboard.writeText(setupData.manualEntryCode.replace(/\s/g, ""));
    setCopiedSecret(true);

    toast({
      title: "Copied",
      description: "Secret key copied to clipboard",
    });

    setTimeout(() => setCopiedSecret(false), 2000);
  }, [setupData, toast]);

  // Copy backup codes to clipboard
  const handleCopyBackupCodes = useCallback(() => {
    if (!setupData) return;

    const text = formatBackupCodesForDownload(setupData.backupCodes, email);
    navigator.clipboard.writeText(text);
    setCopiedBackupCodes(true);

    toast({
      title: "Copied",
      description: "Backup codes copied to clipboard",
    });

    setTimeout(() => setCopiedBackupCodes(false), 2000);
  }, [setupData, email, toast]);

  // Download backup codes as text file
  const handleDownloadBackupCodes = useCallback(() => {
    if (!setupData) return;

    const text = formatBackupCodesForDownload(setupData.backupCodes, email);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nchat-backup-codes-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedBackupCodes(true);

    toast({
      title: "Downloaded",
      description: "Backup codes saved to file",
    });
  }, [setupData, email, toast]);

  // Print backup codes
  const handlePrintBackupCodes = useCallback(() => {
    if (!setupData) return;

    const html = formatBackupCodesForPrint(setupData.backupCodes, email);
    const printWindow = window.open("", "_blank");

    if (printWindow) {
      // sast-ignore: DOCUMENT_WRITE -- writing to a new blank window for print dialog; html is generated by formatBackupCodesForPrint, not user input
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }

    toast({
      title: "Print",
      description: "Opening print dialog...",
    });
  }, [setupData, email, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      step === "verify" &&
      verificationCode.trim() &&
      !loading
    ) {
      handleVerifyCode();
    }
  };

  const handleClose = () => {
    if (step === "complete") {
      onComplete();
    } else {
      onCancel();
    }
  };

  const canProceedToComplete = downloadedBackupCodes || copiedBackupCodes;

  return (
    <Dialog open={open} onOpenChange={() => !loading && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {/* INTRO STEP */}
        {step === "intro" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                  <DialogDescription>
                    Add an extra layer of security to your account
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication (2FA) helps protect your account by
                  requiring a verification code in addition to your password
                  when signing in.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">How it works:</h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-semibold text-foreground">1.</span>
                    <span>
                      Download an authenticator app (Google Authenticator,
                      Authy, Microsoft Authenticator, etc.)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-foreground">2.</span>
                    <span>
                      Scan the QR code or enter the secret key manually
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-foreground">3.</span>
                    <span>Enter the 6-digit code from your app to verify</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-foreground">4.</span>
                    <span>Save your backup codes in a secure location</span>
                  </li>
                </ol>
              </div>

              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Recommended Authenticator Apps
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span>Google Authenticator (iOS, Android)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span>Authy (iOS, Android, Desktop)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span>Microsoft Authenticator (iOS, Android)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span>
                      1Password, Bitwarden, or other password managers
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleStartSetup} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* SCAN QR CODE STEP */}
        {step === "scan" && setupData && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle>Scan QR Code</DialogTitle>
                  <DialogDescription>
                    Use your authenticator app to scan this code
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="qr" className="py-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qr">
                  <QrCode className="mr-2 h-4 w-4" />
                  QR Code
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Key className="mr-2 h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="space-y-4">
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                  {/* QR Code */}
                  <div className="border-primary/20 rounded-lg border-4 bg-white p-4">
                    <img
                      src={setupData.qrCodeDataUrl}
                      alt="2FA QR Code"
                      className="h-64 w-64"
                    />
                  </div>

                  <div className="space-y-2 text-center">
                    <p className="text-sm text-muted-foreground">
                      Open your authenticator app and scan this QR code
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Can&apos;t scan? Switch to <strong>Manual Entry</strong>{" "}
                      tab
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    If you can&apos;t scan the QR code, you can manually enter
                    this secret key into your authenticator app.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    value={`nchat (${email})`}
                    readOnly
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value={setupData.manualEntryCode}
                      readOnly
                      className="font-mono tracking-wider"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopySecret}
                      title="Copy secret key"
                    >
                      {copiedSecret ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Key type: Time-based (TOTP) • Time step: 30 seconds • Code
                    length: 6 digits
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep("intro")}
                disabled={loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep("verify")}>
                Next: Verify Code
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* VERIFY CODE STEP */}
        {step === "verify" && setupData && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle>Verify Setup</DialogTitle>
                  <DialogDescription>
                    Enter the 6-digit code from your authenticator app
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="verify-code">Verification Code</Label>
                <Input
                  id="verify-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setVerificationCode(value);
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="000000"
                  className="text-center font-mono text-2xl tracking-widest"
                  autoComplete="one-time-code"
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- autoFocus is intentional for verification code input UX
                  autoFocus
                  disabled={loading}
                  maxLength={6}
                />
                <p className="text-center text-xs text-muted-foreground">
                  Code refreshes in {remainingSeconds}s
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Make sure your device&apos;s time is accurate. TOTP codes are
                  time-based and may not work if your clock is off.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep("scan")}
                disabled={loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Enable 2FA"
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* BACKUP CODES STEP */}
        {step === "backup" && setupData && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
                  <Key className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle>Save Backup Codes</DialogTitle>
                  <DialogDescription>
                    Keep these codes safe - you&apos;ll need them if you lose
                    your device
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Store these backup codes in a
                  secure location. Each code can only be used once. If you lose
                  access to your authenticator app, you&apos;ll need these codes
                  to sign in.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Your Backup Codes</CardTitle>
                  <CardDescription>
                    {setupData.backupCodes.length} recovery codes • Use if you
                    lose your authenticator
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {setupData.backupCodes.map((code, index) => (
                      <div
                        key={index}
                        className="rounded bg-muted px-3 py-2 text-center tracking-wider"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyBackupCodes}
                  className="flex-1"
                >
                  {copiedBackupCodes ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy All
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadBackupCodes}
                  className="flex-1"
                >
                  {downloadedBackupCodes ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      Downloaded
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintBackupCodes}
                  className="flex-1"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>

              {!canProceedToComplete && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Please save your backup codes by downloading or copying them
                    before continuing.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={() => setStep("complete")}
                disabled={!canProceedToComplete}
                className="w-full sm:w-auto"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* COMPLETE STEP */}
        {step === "complete" && (
          <>
            <DialogHeader>
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
                </div>
                <div className="text-center">
                  <DialogTitle className="text-2xl">
                    2FA Enabled Successfully!
                  </DialogTitle>
                  <DialogDescription className="mt-2">
                    Your account is now protected with two-factor authentication
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-500" />
                    <div>
                      <p className="font-medium">2FA is now active</p>
                      <p className="text-sm text-muted-foreground">
                        You&apos;ll need to enter a code from your authenticator
                        app when signing in
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-500" />
                    <div>
                      <p className="font-medium">Backup codes saved</p>
                      <p className="text-sm text-muted-foreground">
                        Keep your backup codes in a safe place in case you lose
                        your device
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-500" />
                    <div>
                      <p className="font-medium">Account more secure</p>
                      <p className="text-sm text-muted-foreground">
                        Your account is now protected against unauthorized
                        access
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You can manage your 2FA settings, view trusted devices, and
                  regenerate backup codes in your account security settings.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button onClick={onComplete} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
