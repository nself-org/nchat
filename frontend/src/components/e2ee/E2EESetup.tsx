/**
 * E2EE Setup Component
 * Guides users through E2EE initialization
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, Key, AlertTriangle, Copy, Check } from "lucide-react";
import { useE2EE } from "@/hooks/use-e2ee";

import { logger } from "@/lib/logger";

export interface E2EESetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function E2EESetup({ onComplete, onCancel }: E2EESetupProps) {
  const { initialize, isLoading, error } = useE2EE();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInitialize = async () => {
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }

    try {
      await initialize(password);

      // Get recovery code
      const response = await fetch("/api/e2ee/initialize", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.recoveryCode) {
          setRecoveryCode(data.recoveryCode);
          setShowRecoveryCode(true);
        } else {
          onComplete?.();
        }
      }
    } catch (err) {
      logger.error("E2EE setup error:", err);
    }
  };

  const handleCopyRecoveryCode = () => {
    if (recoveryCode) {
      navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinish = () => {
    onComplete?.();
  };

  if (showRecoveryCode && recoveryCode) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <CardTitle>Recovery Code</CardTitle>
          </div>
          <CardDescription>
            Save this recovery code in a secure location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              This is the ONLY way to recover your encryption keys if you forget
              your password. Store it somewhere safe.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Recovery Code</Label>
            <div className="flex gap-2">
              <Input
                value={recoveryCode}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyRecoveryCode}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Write this code down or save it in a password manager. You&apos;ll
              need it if you lose access to your device.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            I&apos;ll Do This Later
          </Button>
          <Button onClick={handleFinish}>I&apos;ve Saved It</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          <CardTitle>Enable End-to-End Encryption</CardTitle>
        </div>
        <CardDescription>
          Protect your messages with Signal-level security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>What is E2EE?</AlertTitle>
          <AlertDescription>
            End-to-end encryption ensures that only you and your conversation
            partners can read your messages. Not even the server can decrypt
            them.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="password">Encryption Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-sm text-muted-foreground">
            This password encrypts your private keys. Make it strong!
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <Alert>
          <AlertDescription>
            You&apos;ll receive a recovery code after setup. Keep it safe -
            it&apos;s the only way to recover your keys if you forget your
            password.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleInitialize} disabled={isLoading}>
          {isLoading ? "Setting Up..." : "Enable E2EE"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default E2EESetup;
