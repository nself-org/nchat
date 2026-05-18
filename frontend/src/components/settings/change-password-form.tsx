"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSecurity } from "@/lib/security/use-security";
import {
  calculatePasswordStrength,
  getStrengthColor,
} from "@/lib/security/two-factor";
import { useAuth } from "@/contexts/auth-context";
import {
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ChangePasswordForm() {
  const { isDevMode } = useAuth();
  const { changePassword, isChangingPassword, passwordError } = useSecurity();

  // Form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength calculation
  const passwordStrength = useMemo(
    () => calculatePasswordStrength(newPassword),
    [newPassword],
  );

  // Validation
  const passwordsMatch = newPassword === confirmPassword;
  const isCurrentPasswordValid = currentPassword.length >= 1;
  const isNewPasswordValid = passwordStrength.isAcceptable;
  const canSubmit =
    isCurrentPasswordValid &&
    isNewPasswordValid &&
    passwordsMatch &&
    confirmPassword.length > 0 &&
    !isChangingPassword;

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(false);

      if (!canSubmit) return;

      const result = await changePassword(currentPassword, newPassword);

      if (result.success) {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(result.error || "Failed to change password");
      }
    },
    [canSubmit, changePassword, currentPassword, newPassword],
  );

  // Password requirement checks
  const requirements = [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(newPassword) },
    { label: "Lowercase letter", met: /[a-z]/.test(newPassword) },
    { label: "Number", met: /\d/.test(newPassword) },
    {
      label: "Special character",
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="border-green-500/20 bg-green-500/10 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Your password has been changed successfully.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {(error || passwordError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || passwordError}</AlertDescription>
        </Alert>
      )}

      {/* Dev Mode Notice */}
      {isDevMode && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            In development mode, password changes are simulated and will not
            persist.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Password */}
      <div className="space-y-2">
        <Label htmlFor="current-password">Current Password</Label>
        <div className="relative">
          <Input
            id="current-password"
            type={showCurrentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            autoComplete="current-password"
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
          >
            {showCurrentPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* New Password */}
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter your new password"
            autoComplete="new-password"
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowNewPassword(!showNewPassword)}
          >
            {showNewPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Password Strength Indicator */}
        {newPassword.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      index <= passwordStrength.score
                        ? getStrengthColor(passwordStrength.score)
                        : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  passwordStrength.score <= 1 && "text-red-500",
                  passwordStrength.score === 2 && "text-yellow-500",
                  passwordStrength.score >= 3 && "text-green-500",
                )}
              >
                {passwordStrength.label}
              </span>
            </div>

            {/* Requirements List */}
            <div className="grid grid-cols-2 gap-1">
              {requirements.map((req) => (
                <div
                  key={req.label}
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    req.met ? "text-green-600" : "text-muted-foreground",
                  )}
                >
                  {req.met ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {req.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            autoComplete="new-password"
            className={cn(
              "pr-10",
              confirmPassword.length > 0 && !passwordsMatch && "border-red-500",
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="text-xs text-red-500">Passwords do not match</p>
        )}
        {confirmPassword.length > 0 && passwordsMatch && (
          <p className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            Passwords match
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          {isChangingPassword ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Changing Password...
            </>
          ) : (
            "Change Password"
          )}
        </Button>
      </div>
    </form>
  );
}
