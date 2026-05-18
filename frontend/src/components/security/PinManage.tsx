/**
 * PIN Management Component
 *
 * Manage PIN settings, view attempts, and configure lock options
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  loadPinSettings,
  changePin,
  updatePinSettings,
  disablePin,
  getRecentFailedAttempts,
  clearAttemptHistory,
  hasPinConfigured,
} from "@/lib/security/pin";
import {
  lockSession,
  getFormattedTimeSinceActivity,
} from "@/lib/security/session";
import {
  getStoredCredentials,
  removeCredential,
  clearAllCredentials,
  getCredentialIcon,
  getCredentialTypeDescription,
  formatLastUsed,
  registerBiometric,
  type BiometricCredential,
} from "@/lib/security/biometric";
import {
  Shield,
  Lock,
  Clock,
  Fingerprint,
  AlertCircle,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { PinSetup } from "./PinSetup";

// ============================================================================
// Types
// ============================================================================

interface PinManageProps {
  userId: string;
  userName: string;
}

// ============================================================================
// Component
// ============================================================================

export function PinManage({ userId, userName }: PinManageProps) {
  // PIN state
  const [hasPinSetup, setHasPinSetup] = useState(false);
  const [pinSettings, setPinSettings] = useState(loadPinSettings());

  // Biometric credentials
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);

  // UI state
  const [showChangePinDialog, setShowChangePinDialog] = useState(false);
  const [showDisablePinDialog, setShowDisablePinDialog] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showAttemptsDialog, setShowAttemptsDialog] = useState(false);

  // Load PIN status
  useEffect(() => {
    const hasPin = hasPinConfigured();
    setHasPinSetup(hasPin);

    if (hasPin) {
      const settings = loadPinSettings();
      setPinSettings(settings);
    }
  }, []);

  // Load credentials
  useEffect(() => {
    setCredentials(getStoredCredentials());
  }, []);

  // Refresh credentials
  const refreshCredentials = () => {
    setCredentials(getStoredCredentials());
  };

  // Handle settings change
  const handleSettingsChange = (
    updates: Partial<Exclude<typeof pinSettings, null>>,
  ) => {
    if (!updates) return;
    const success = updatePinSettings(updates);
    if (success) {
      const updated = loadPinSettings();
      setPinSettings(updated);
    }
  };

  // Handle lock now
  const handleLockNow = () => {
    lockSession("manual");
    window.location.reload(); // Force reload to trigger lock screen
  };

  // Render PIN setup
  if (!hasPinSetup) {
    return (
      <div className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            PIN lock is not configured. Setup a PIN to secure your account.
          </AlertDescription>
        </Alert>

        <Button onClick={() => setShowSetupDialog(true)}>
          <Shield className="mr-2 h-4 w-4" />
          Setup PIN Lock
        </Button>

        <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
          <DialogContent className="max-w-2xl">
            <PinSetup
              userId={userId}
              userName={userName}
              onComplete={() => {
                setShowSetupDialog(false);
                setHasPinSetup(true);
                setPinSettings(loadPinSettings());
                refreshCredentials();
              }}
              onCancel={() => setShowSetupDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            PIN Lock Status
          </CardTitle>
          <CardDescription>Your PIN lock is active</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Last activity</p>
              <p className="text-sm text-muted-foreground">
                {getFormattedTimeSinceActivity()}
              </p>
            </div>
            <Badge variant="default">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Active
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleLockNow}>
              <Lock className="mr-2 h-4 w-4" />
              Lock Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangePinDialog(true)}
            >
              Change PIN
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisablePinDialog(true)}
            >
              Disable PIN
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lock Options */}
      {pinSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Lock Options
            </CardTitle>
            <CardDescription>Configure when your app locks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lock on close */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="lock-close">Lock on app close</Label>
                <p className="text-sm text-muted-foreground">
                  Require PIN when you close and reopen the app
                </p>
              </div>
              <Switch
                id="lock-close"
                checked={pinSettings.lockOnClose}
                onCheckedChange={(checked) =>
                  handleSettingsChange({ lockOnClose: checked })
                }
              />
            </div>

            {/* Lock on background */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="lock-background">Lock on background</Label>
                <p className="text-sm text-muted-foreground">
                  Require PIN when switching to another app
                </p>
              </div>
              <Switch
                id="lock-background"
                checked={pinSettings.lockOnBackground}
                onCheckedChange={(checked) =>
                  handleSettingsChange({ lockOnBackground: checked })
                }
              />
            </div>

            {/* Auto-lock timeout */}
            <div className="space-y-2">
              <Label htmlFor="timeout" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Auto-lock timeout
              </Label>
              <Select
                value={pinSettings.lockTimeoutMinutes.toString()}
                onValueChange={(value) =>
                  handleSettingsChange({
                    lockTimeoutMinutes: parseInt(value) as 0 | 5 | 15 | 30 | 60,
                  })
                }
              >
                <SelectTrigger id="timeout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Never</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Biometric Credentials */}
      {pinSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Biometric Authentication
            </CardTitle>
            <CardDescription>
              Manage biometric credentials for quick unlock
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {credentials.length === 0 ? (
              <div className="py-4 text-center">
                <p className="mb-4 text-sm text-muted-foreground">
                  No biometric credentials registered
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const result = await registerBiometric(userId, userName);
                    if (result.success) {
                      refreshCredentials();
                      handleSettingsChange({ biometricEnabled: true });
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Biometric
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Fingerprint className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {cred.deviceName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getCredentialTypeDescription(cred.credentialType)}{" "}
                            • {formatLastUsed(cred.lastUsedAt)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          removeCredential(cred.credentialId);
                          refreshCredentials();

                          // Disable biometric if no credentials left
                          if (credentials.length === 1) {
                            handleSettingsChange({ biometricEnabled: false });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const result = await registerBiometric(userId, userName);
                    if (result.success) {
                      refreshCredentials();
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Device
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Security History
          </CardTitle>
          <CardDescription>Recent PIN unlock attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAttemptsDialog(true)}
          >
            View Recent Attempts
          </Button>
        </CardContent>
      </Card>

      {/* Change PIN Dialog */}
      <ChangePinDialog
        open={showChangePinDialog}
        onOpenChange={setShowChangePinDialog}
        onComplete={() => {
          setShowChangePinDialog(false);
          setPinSettings(loadPinSettings());
        }}
      />

      {/* Disable PIN Dialog */}
      <DisablePinDialog
        open={showDisablePinDialog}
        onOpenChange={setShowDisablePinDialog}
        onComplete={() => {
          setShowDisablePinDialog(false);
          setHasPinSetup(false);
          setPinSettings(null);
          setCredentials([]);
        }}
      />

      {/* Attempts Dialog */}
      <AttemptsDialog
        open={showAttemptsDialog}
        onOpenChange={setShowAttemptsDialog}
      />
    </div>
  );
}

// ============================================================================
// Change PIN Dialog
// ============================================================================

function ChangePinDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPins, setShowPins] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await changePin(currentPin, newPin, confirmPin);

      if (!result.success) {
        setError(result.error || "Failed to change PIN");
        return;
      }

      onComplete();
    } catch {
      setError("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change PIN</DialogTitle>
          <DialogDescription>
            Enter your current PIN and choose a new one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="current-pin">Current PIN</Label>
            <Input
              id="current-pin"
              type={showPins ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-pin">New PIN</Label>
            <Input
              id="new-pin"
              type={showPins ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-pin">Confirm New PIN</Label>
            <Input
              id="confirm-new-pin"
              type={showPins ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPins(!showPins)}
          >
            {showPins ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            {showPins ? "Hide" : "Show"} PINs
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleChange} disabled={isLoading}>
            Change PIN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Disable PIN Dialog
// ============================================================================

function DisablePinDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDisable = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const success = await disablePin(pin);

      if (!success) {
        setError("Incorrect PIN");
        return;
      }

      // Clear all credentials
      clearAllCredentials();

      // Clear attempt history
      clearAttemptHistory();

      onComplete();
    } catch {
      setError("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable PIN Lock</DialogTitle>
          <DialogDescription>
            Enter your PIN to disable PIN lock. This will remove all security
            settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Warning: This will disable PIN lock and remove all biometric
              credentials.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="disable-pin">Enter PIN to confirm</Label>
            <Input
              id="disable-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={isLoading}
          >
            Disable PIN Lock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Attempts Dialog
// ============================================================================

function AttemptsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const attempts = getRecentFailedAttempts(60);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recent Failed Attempts</DialogTitle>
          <DialogDescription>
            Failed PIN unlock attempts in the last hour
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {attempts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No failed attempts in the last hour
            </p>
          ) : (
            attempts.map((attempt, i) => (
              <div key={i} className="rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {new Date(attempt.timestamp).toLocaleString()}
                </p>
                {attempt.failureReason && (
                  <p className="text-xs text-muted-foreground">
                    Reason: {attempt.failureReason}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
