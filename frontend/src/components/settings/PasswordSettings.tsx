"use client";

import { useState } from "react";
import { SettingsSection } from "./settings-section";
import { SettingsRow } from "./settings-row";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PasswordSettingsProps {
  className?: string;
}

/**
 * PasswordSettings - Change password
 */
export function PasswordSettings({ className }: PasswordSettingsProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = calculatePasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validation
      if (!currentPassword) {
        throw new Error("Please enter your current password");
      }

      if (newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (passwordStrength.score < 2) {
        throw new Error("Please choose a stronger password");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update password",
      );
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    newPassword === confirmPassword &&
    newPassword.length >= 8;

  return (
    <SettingsSection
      title="Password"
      description="Change your password to keep your account secure"
      className={className}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
            <Check className="h-4 w-4" />
            <AlertDescription>Password updated successfully!</AlertDescription>
          </Alert>
        )}

        <SettingsRow
          label="Current password"
          htmlFor="current-password"
          vertical
        >
          <div className="relative">
            <Input
              id="current-password"
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              disabled={loading}
              autoComplete="current-password"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </SettingsRow>

        <SettingsRow
          label="New password"
          description="Must be at least 8 characters"
          htmlFor="new-password"
          vertical
        >
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={loading}
                autoComplete="new-password"
                className="pr-10"
                minLength={8}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {newPassword && (
              <div className="space-y-1">
                <Progress
                  value={(passwordStrength.score / 4) * 100}
                  className={cn(
                    "h-1",
                    passwordStrength.score === 0 && "[&>div]:bg-destructive",
                    passwordStrength.score === 1 && "[&>div]:bg-orange-500",
                    passwordStrength.score === 2 && "[&>div]:bg-yellow-500",
                    passwordStrength.score === 3 && "[&>div]:bg-lime-500",
                    passwordStrength.score === 4 && "[&>div]:bg-green-500",
                  )}
                />
                <p
                  className={cn(
                    "text-xs",
                    passwordStrength.score <= 1 && "text-destructive",
                    passwordStrength.score === 2 &&
                      "text-yellow-600 dark:text-yellow-400",
                    passwordStrength.score >= 3 &&
                      "text-green-600 dark:text-green-400",
                  )}
                >
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>
        </SettingsRow>

        <SettingsRow
          label="Confirm new password"
          htmlFor="confirm-password"
          vertical
        >
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            disabled={loading}
            autoComplete="new-password"
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1 text-xs text-destructive">
              Passwords do not match
            </p>
          )}
        </SettingsRow>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={loading || !canSubmit}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

/**
 * Calculate password strength
 */
function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
} {
  if (!password) {
    return { score: 0, label: "" };
  }

  let score = 0;

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Cap at 4
  score = Math.min(score, 4);

  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];

  return {
    score,
    label: labels[score],
  };
}
