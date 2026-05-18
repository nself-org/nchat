/**
 * 2FA Backup Code Verification Page
 *
 * Allows users to use backup codes when they can't access their authenticator app.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, Key, AlertCircle, ArrowLeft } from "lucide-react";

export default function TwoFactorBackupPage() {
  const router = useRouter();

  const [backupCode, setBackupCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Get MFA ticket from session storage
    const ticket =
      typeof window !== "undefined"
        ? sessionStorage.getItem("nchat-mfa-ticket")
        : null;

    if (!ticket) {
      setError("Session expired. Please sign in again.");
      router.push("/login");
      return;
    }

    try {
      const response = await fetch("/api/auth/2fa/verify-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket,
          backupCode: backupCode.replace(/\s+/g, ""), // Remove spaces
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Clear MFA ticket
        sessionStorage.removeItem("nchat-mfa-ticket");

        // Redirect to chat
        router.push("/chat");
      } else {
        setError(
          data.error?.message || "Invalid backup code. Please try again.",
        );
        setBackupCode("");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Key className="h-12 w-12 text-indigo-600" />
          </div>
          <CardTitle>Use Backup Code</CardTitle>
          <CardDescription>
            Enter one of your backup codes to sign in without your authenticator
            app
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="backupCode">Backup Code</Label>
              <Input
                id="backupCode"
                type="text"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                required
                disabled={isLoading}
                /* eslint-disable-next-line jsx-a11y/no-autofocus */
                autoFocus
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Each backup code can only be used once
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !backupCode}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Verify Backup Code
                </>
              )}
            </Button>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => router.push("/auth/2fa-verify")}
                type="button"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to 2FA Code
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
