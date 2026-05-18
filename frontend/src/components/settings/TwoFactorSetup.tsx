/**
 * Two-Factor Authentication Setup Component
 *
 * Allows users to enable TOTP-based 2FA with QR code and backup codes.
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Key,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export function TwoFactorSetup() {
  const { getTwoFactorStatus, generateTOTPSecret, enableTOTP, disableTOTP } =
    useAuth();
  const { toast } = useToast();

  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  // Setup state
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupStep, setSetupStep] = useState<"qr" | "verify" | "backup">("qr");

  // Disable state
  const [disableCode, setDisableCode] = useState("");

  // UI state
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await getTwoFactorStatus();
      setIsEnabled(status.enabled);
    } catch (error) {
      console.error("Failed to check 2FA status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSetup = async () => {
    setIsLoading(true);
    try {
      const result = await generateTOTPSecret();
      setQrCodeUrl(result.qrCodeDataUrl);
      setSecret(result.secret);
      setManualCode(result.otpauthUrl);
      setSetupStep("qr");
      setShowSetupDialog(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate 2FA secret. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code from your authenticator app.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await enableTOTP(verificationCode);

      if (result.success) {
        setBackupCodes(result.backupCodes || []);
        setSetupStep("backup");
        setIsEnabled(true);
        toast({
          title: "Success",
          description: "Two-factor authentication has been enabled!",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code from your authenticator app.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await disableTOTP(disableCode);

      if (result.success) {
        setIsEnabled(false);
        setShowDisableDialog(false);
        setDisableCode("");
        toast({
          title: "Success",
          description: "Two-factor authentication has been disabled.",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const downloadBackupCodes = () => {
    const text = `nself-chat Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join("\n")}\n\nIMPORTANT: Keep these codes safe. Each code can only be used once.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nself-chat-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Backup codes have been downloaded",
    });
  };

  const handleCloseSetup = () => {
    setShowSetupDialog(false);
    setSetupStep("qr");
    setVerificationCode("");
    setBackupCodes([]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Two-Factor Authentication</CardTitle>
            </div>
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Enabled
                </>
              ) : (
                "Disabled"
              )}
            </Badge>
          </div>
          <CardDescription>
            Add an extra layer of security by requiring a code from your phone
            in addition to your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEnabled ? (
            <>
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Two-factor authentication is active and protecting your
                  account
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => setShowDisableDialog(true)}
                variant="destructive"
              >
                Disable 2FA
              </Button>
            </>
          ) : (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication is not enabled. Your account is less
                  secure without it.
                </AlertDescription>
              </Alert>
              <Button onClick={handleStartSetup} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Enable 2FA
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={handleCloseSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              {setupStep === "qr" &&
                "Scan the QR code with your authenticator app"}
              {setupStep === "verify" && "Verify your authenticator app setup"}
              {setupStep === "backup" && "Save your backup codes"}
            </DialogDescription>
          </DialogHeader>

          {setupStep === "qr" && (
            <div className="space-y-4">
              <div className="flex justify-center rounded-lg border bg-white p-4">
                {qrCodeUrl ? (
                  <Image
                    src={qrCodeUrl}
                    alt="2FA QR Code"
                    width={200}
                    height={200}
                  />
                ) : (
                  <div className="flex h-[200px] w-[200px] items-center justify-center bg-muted">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Manual Setup Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={secret}
                    readOnly
                    type={showSecret ? "text" : "password"}
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(secret, "Secret code")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this code if you can't scan the QR code
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Install an authenticator app like Google Authenticator, Authy,
                  or 1Password before continuing
                </AlertDescription>
              </Alert>
            </div>
          )}

          {setupStep === "verify" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="text-center text-2xl font-semibold tracking-widest"
                  autoFocus // eslint-disable-line jsx-a11y/no-autofocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            </div>
          )}

          {setupStep === "backup" && (
            <div className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50">
                <Key className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Save these backup codes in a secure location. Each code can
                  only be used once.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-4 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="text-center">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={downloadBackupCodes}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  onClick={() =>
                    copyToClipboard(backupCodes.join("\n"), "Backup codes")
                  }
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy All
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {setupStep === "qr" && (
              <Button onClick={() => setSetupStep("verify")} className="w-full">
                Continue
              </Button>
            )}

            {setupStep === "verify" && (
              <>
                <Button onClick={() => setSetupStep("qr")} variant="outline">
                  Back
                </Button>
                <Button
                  onClick={handleVerifyAndEnable}
                  disabled={verificationCode.length !== 6 || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Enable"
                  )}
                </Button>
              </>
            )}

            {setupStep === "backup" && (
              <Button onClick={handleCloseSetup} className="w-full">
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your current 2FA code to disable two-factor authentication
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Disabling 2FA will make your account less secure. Only disable
                it if you no longer have access to your authenticator app.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="disableCode">Verification Code</Label>
              <Input
                id="disableCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(e) =>
                  setDisableCode(e.target.value.replace(/[^0-9]/g, ""))
                }
                className="text-center text-2xl font-semibold tracking-widest"
                autoFocus // eslint-disable-line jsx-a11y/no-autofocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowDisableDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisable2FA}
              variant="destructive"
              disabled={disableCode.length !== 6 || isSubmitting}
            >
              {isSubmitting ? (
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
    </>
  );
}
