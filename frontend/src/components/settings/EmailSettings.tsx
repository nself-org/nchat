"use client";

import { useState } from "react";
import { SettingsSection } from "./settings-section";
import { SettingsRow } from "./settings-row";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Mail, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailSettingsProps {
  className?: string;
}

/**
 * EmailSettings - Change email address
 */
export function EmailSettings({ className }: EmailSettingsProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      // Check password is provided
      if (!currentPassword) {
        throw new Error("Please enter your current password");
      }

      // In development mode, just update locally
      if (process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSuccess(true);
        setCurrentPassword("");
        setTimeout(() => setSuccess(false), 5000);
      } else {
        // Production: Use Nhost to update email
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_AUTH_URL}/user/email/change`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              newEmail: email,
            }),
            credentials: "include",
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to update email");
        }

        setSuccess(true);
        setCurrentPassword("");
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = email !== (user?.email || "");

  return (
    <SettingsSection
      title="Email Address"
      description="Change the email address associated with your account"
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
            <AlertDescription>
              A verification email has been sent to your new address. Please
              check your inbox.
            </AlertDescription>
          </Alert>
        )}

        <SettingsRow
          label="Current email"
          description={user?.email || "No email set"}
          vertical
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{user?.email || "No email set"}</span>
            {user?.email && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                Verified
              </span>
            )}
          </div>
        </SettingsRow>

        <SettingsRow label="New email address" htmlFor="new-email" vertical>
          <Input
            id="new-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter new email address"
            disabled={loading}
            autoComplete="email"
          />
        </SettingsRow>

        <SettingsRow
          label="Current password"
          description="Required to confirm the change"
          htmlFor="email-password"
          vertical
        >
          <Input
            id="email-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            disabled={loading}
            autoComplete="current-password"
          />
        </SettingsRow>

        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={loading || !hasChanges || !currentPassword}
          >
            {loading ? "Updating..." : "Update Email"}
          </Button>
          {hasChanges && !loading && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEmail(user?.email || "")}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </SettingsSection>
  );
}
