"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  SettingsLayout,
  SettingsSection,
  SettingsRow,
} from "@/components/settings";
import { logger } from "@/lib/logger";
import {
  Settings,
  Mail,
  Key,
  Shield,
  Smartphone,
  Link2,
  Trash2,
  Github,
  Chrome,
  Apple,
  Check,
  AlertTriangle,
} from "lucide-react";

interface ConnectedAccount {
  id: string;
  provider: "google" | "github" | "apple";
  email: string;
  connectedAt: string;
}

const connectedAccounts: ConnectedAccount[] = [
  {
    id: "1",
    provider: "google",
    email: "user@gmail.com",
    connectedAt: "2024-01-15",
  },
];

const providerIcons = {
  google: Chrome,
  github: Github,
  apple: Apple,
};

const providerNames = {
  google: "Google",
  github: "GitHub",
  apple: "Apple",
};

export default function AccountSettingsPage() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Email change state
  const [email, setEmail] = useState(user?.email || "");
  const [emailPassword, setEmailPassword] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Delete account state
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("email");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSaved("email");
      setTimeout(() => setSaved(null), 3000);
    } catch (error) {
      logger.error("Failed to change email:", error);
    } finally {
      setLoading(null);
      setEmailPassword("");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setLoading("password");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSaved("password");
      setTimeout(() => setSaved(null), 3000);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      logger.error("Failed to change password:", error);
      setPasswordError("Failed to change password");
    } finally {
      setLoading(null);
    }
  };

  const handleConnect = async (provider: string) => {
    setLoading(`connect-${provider}`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error(`Failed to connect ${provider}:`, error);
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    setLoading(`disconnect-${accountId}`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error("Failed to disconnect account:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleToggle2FA = async () => {
    setLoading("2fa");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setTwoFactorEnabled(!twoFactorEnabled);
    } catch (error) {
      logger.error("Failed to toggle 2FA:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return;

    setLoading("delete");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await signOut();
    } catch (error) {
      logger.error("Failed to delete account:", error);
    } finally {
      setLoading(null);
    }
  };

  if (!user) {
    return (
      <SettingsLayout>
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Account</h1>
            <p className="text-sm text-muted-foreground">
              Manage your account settings and security
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Email Change */}
          <SettingsSection
            title="Email Address"
            description="Change the email associated with your account"
          >
            <form onSubmit={handleEmailChange} className="space-y-4">
              <SettingsRow
                label="New email address"
                htmlFor="new-email"
                vertical
              >
                <Input
                  id="new-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter new email"
                  disabled={loading === "email"}
                />
              </SettingsRow>

              <SettingsRow
                label="Current password"
                description="Enter your password to confirm the change"
                htmlFor="email-password"
                vertical
              >
                <Input
                  id="email-password"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={loading === "email"}
                />
              </SettingsRow>

              <div className="flex items-center gap-4">
                <Button
                  type="submit"
                  disabled={loading === "email" || !email || !emailPassword}
                >
                  {loading === "email" ? "Updating..." : "Update Email"}
                </Button>
                {saved === "email" && (
                  <p className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    Email updated successfully
                  </p>
                )}
              </div>
            </form>
          </SettingsSection>

          {/* Password Change */}
          <SettingsSection
            title="Password"
            description="Change your password to keep your account secure"
          >
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <SettingsRow
                label="Current password"
                htmlFor="current-password"
                vertical
              >
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={loading === "password"}
                />
              </SettingsRow>

              <SettingsRow label="New password" htmlFor="new-password" vertical>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={loading === "password"}
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
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
                  disabled={loading === "password"}
                />
              </SettingsRow>

              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}

              <div className="flex items-center gap-4">
                <Button
                  type="submit"
                  disabled={
                    loading === "password" ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                >
                  {loading === "password" ? "Updating..." : "Update Password"}
                </Button>
                {saved === "password" && (
                  <p className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    Password updated successfully
                  </p>
                )}
              </div>
            </form>
          </SettingsSection>

          {/* Connected Accounts */}
          <SettingsSection
            title="Connected Accounts"
            description="Manage your connected social accounts for sign-in"
          >
            <div className="space-y-3">
              {/* Connected accounts */}
              {connectedAccounts.map((account) => {
                const Icon = providerIcons[account.provider];
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {providerNames[account.provider]}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {account.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(account.id)}
                      disabled={loading === `disconnect-${account.id}`}
                    >
                      {loading === `disconnect-${account.id}`
                        ? "Disconnecting..."
                        : "Disconnect"}
                    </Button>
                  </div>
                );
              })}

              {/* Available connections */}
              {(["google", "github", "apple"] as const).map((provider) => {
                const isConnected = connectedAccounts.some(
                  (a) => a.provider === provider,
                );
                if (isConnected) return null;

                const Icon = providerIcons[provider];
                return (
                  <div
                    key={provider}
                    className="flex items-center justify-between rounded-lg border border-dashed p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{providerNames[provider]}</p>
                        <p className="text-sm text-muted-foreground">
                          Not connected
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(provider)}
                      disabled={loading === `connect-${provider}`}
                    >
                      {loading === `connect-${provider}`
                        ? "Connecting..."
                        : "Connect"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </SettingsSection>

          {/* Two-Factor Authentication */}
          <SettingsSection
            title="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
          >
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Authenticator App</p>
                  <p className="text-sm text-muted-foreground">
                    {twoFactorEnabled
                      ? "Two-factor authentication is enabled"
                      : "Use an authenticator app to generate codes"}
                  </p>
                </div>
              </div>
              <Button
                variant={twoFactorEnabled ? "outline" : "default"}
                onClick={handleToggle2FA}
                disabled={loading === "2fa"}
              >
                {loading === "2fa"
                  ? "Processing..."
                  : twoFactorEnabled
                    ? "Disable"
                    : "Enable"}
              </Button>
            </div>

            {twoFactorEnabled && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Two-factor authentication is active
                  </p>
                </div>
                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                  Your account is protected with an additional security layer.
                </p>
              </div>
            )}
          </SettingsSection>

          {/* Sessions - placeholder */}
          <SettingsSection
            title="Active Sessions"
            description="Manage your active login sessions"
          >
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">Current Session</p>
                    <p className="text-sm text-muted-foreground">
                      This device - Active now
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                  Active
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Sign out of all other sessions
            </Button>
          </SettingsSection>

          <Separator />

          {/* Danger Zone */}
          <SettingsSection
            title="Danger Zone"
            description="Irreversible and destructive actions"
          >
            <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Permanently delete your account and all associated data.
                    This action cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="mt-4">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete your account and remove all your data from our
                          servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-2 py-4">
                        <Label htmlFor="delete-confirm">
                          Type <strong>DELETE</strong> to confirm
                        </Label>
                        <Input
                          id="delete-confirm"
                          value={deleteConfirmation}
                          onChange={(e) =>
                            setDeleteConfirmation(e.target.value)
                          }
                          placeholder="DELETE"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          onClick={() => setDeleteConfirmation("")}
                        >
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          disabled={
                            deleteConfirmation !== "DELETE" ||
                            loading === "delete"
                          }
                          className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
                        >
                          {loading === "delete"
                            ? "Deleting..."
                            : "Delete Account"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>
    </SettingsLayout>
  );
}
