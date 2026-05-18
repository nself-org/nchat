/**
 * TwoFactorVerify Component
 *
 * 2FA verification modal that appears during login.
 * Supports TOTP codes, backup codes, and "remember this device".
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, AlertCircle, Loader2, Key, Smartphone } from "lucide-react";
import { getRemainingSeconds } from "@/lib/2fa/totp";

interface TwoFactorVerifyProps {
  open: boolean;
  onVerified: (rememberDevice: boolean) => void;
  onCancel: () => void;
  userId: string;
}

export function TwoFactorVerify({
  open,
  onVerified,
  onCancel,
  userId,
}: TwoFactorVerifyProps) {
  const [code, setCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(30);

  // Update countdown timer
  useEffect(() => {
    if (!open || useBackupCode) return;

    const interval = setInterval(() => {
      setRemainingSeconds(getRemainingSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [open, useBackupCode]);

  const handleVerify = useCallback(async () => {
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          code: code.trim(),
          rememberDevice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      if (data.usedBackupCode) {
        // Show warning if backup code was used
        alert(
          "You used a backup code. Consider regenerating your backup codes.",
        );
      }

      onVerified(rememberDevice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }, [code, userId, rememberDevice, onVerified]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && code.trim() && !loading) {
      handleVerify();
    }
  };

  const handleCancel = () => {
    setCode("");
    setError(null);
    setRememberDevice(false);
    setUseBackupCode(false);
    onCancel();
  };

  const toggleBackupCode = () => {
    setCode("");
    setError(null);
    setUseBackupCode(!useBackupCode);
  };

  return (
    <Dialog open={open} onOpenChange={() => !loading && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              {useBackupCode ? (
                <Key className="h-6 w-6 text-primary" />
              ) : (
                <Shield className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle>Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                {useBackupCode
                  ? "Enter one of your backup codes"
                  : "Enter the code from your authenticator app"}
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
            <Label htmlFor="2fa-code">
              {useBackupCode ? "Backup Code" : "Verification Code"}
            </Label>
            <Input
              id="2fa-code"
              type="text"
              value={code}
              onChange={(e) => {
                const value = e.target.value;
                if (useBackupCode) {
                  // Backup codes: allow alphanumeric and dash
                  setCode(value.toUpperCase());
                } else {
                  // TOTP: only digits, max 6
                  setCode(value.replace(/\D/g, "").slice(0, 6));
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
              className="text-center font-mono text-lg tracking-widest"
              autoComplete="one-time-code"
              // eslint-disable-next-line jsx-a11y/no-autofocus -- autoFocus is intentional for 2FA verification code input UX
              autoFocus
              disabled={loading}
              maxLength={useBackupCode ? 9 : 6}
            />
            {!useBackupCode && (
              <p className="text-center text-xs text-muted-foreground">
                Code refreshes in {remainingSeconds}s
              </p>
            )}
          </div>

          {/* Remember Device */}
          <div className="flex items-center space-x-2 rounded-lg border p-3">
            <Checkbox
              id="remember-device"
              checked={rememberDevice}
              onCheckedChange={(checked) => setRememberDevice(checked === true)}
              disabled={loading}
            />
            <Label
              htmlFor="remember-device"
              className="cursor-pointer text-sm font-normal leading-tight"
            >
              Trust this device for 30 days
              <span className="block text-xs text-muted-foreground">
                You won&apos;t be asked for 2FA on this device
              </span>
            </Label>
          </div>

          {/* Toggle backup code */}
          <Button
            variant="link"
            onClick={toggleBackupCode}
            className="w-full text-sm"
            type="button"
            disabled={loading}
          >
            {useBackupCode ? (
              <>
                <Smartphone className="mr-2 h-4 w-4" />
                Use authenticator code instead
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Use backup code instead
              </>
            )}
          </Button>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={loading || !code.trim()}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
