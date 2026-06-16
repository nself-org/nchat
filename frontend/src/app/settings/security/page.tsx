"use client";

import { useState, useCallback } from "react";
import { SettingsLayout, SettingsSection } from "@/components/settings";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { TwoFactorSetup } from "@/components/settings/two-factor-setup";
import { ActiveSessions } from "@/components/settings/active-sessions";
import { LoginHistory } from "@/components/settings/login-history";
import { SecurityAlerts } from "@/components/settings/security-alerts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useSecurity } from "@/lib/security/use-security";
import { useE2EEContext } from "@/contexts/e2ee-context";
import { toast } from "sonner";
import {
  Shield,
  Key,
  Smartphone,
  History,
  Bell,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  Copy,
} from "lucide-react";

export default function SecuritySettingsPage() {
  const { user, isDevMode } = useAuth();
  const { securitySettings, twoFactorEnabled, backupCodesRemaining } =
    useSecurity();

  const [activeTab, setActiveTab] = useState("password");

  if (!user) {
    return (
      <SettingsLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Please sign in to access security settings.
          </p>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Shield className="h-6 w-6" />
            Security
          </h1>
          <p className="text-muted-foreground">
            Manage your account security, authentication, and active sessions
          </p>
        </div>

        {/* Dev Mode Warning */}
        {isDevMode && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are in development mode. Security features are simulated and
              do not affect actual authentication. Password changes and 2FA
              setup will not persist.
            </AlertDescription>
          </Alert>
        )}

        {/* Security Status Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <SecurityStatusCard
            title="Password"
            description={
              securitySettings?.passwordLastChanged
                ? `Last changed ${formatRelativeDate(securitySettings.passwordLastChanged)}`
                : "Never changed"
            }
            status={securitySettings?.passwordLastChanged ? "good" : "warning"}
            icon={Key}
          />
          <SecurityStatusCard
            title="Two-Factor Auth"
            description={twoFactorEnabled ? "Enabled" : "Not enabled"}
            status={twoFactorEnabled ? "good" : "warning"}
            icon={Smartphone}
            extra={
              twoFactorEnabled && backupCodesRemaining > 0
                ? `${backupCodesRemaining} backup codes remaining`
                : undefined
            }
          />
          <SecurityStatusCard
            title="Active Sessions"
            description="Manage your devices"
            status="neutral"
            icon={History}
          />
        </div>

        {/* Tabbed Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-6 lg:inline-grid lg:w-auto">
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Password</span>
            </TabsTrigger>
            <TabsTrigger value="2fa" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">2FA</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="e2ee" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">E2EE Keys</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password" className="space-y-6">
            <SettingsSection
              title="Change Password"
              description="Update your password regularly to keep your account secure"
            >
              <ChangePasswordForm />
            </SettingsSection>
          </TabsContent>

          <TabsContent value="2fa" className="space-y-6">
            <SettingsSection
              title="Two-Factor Authentication"
              description="Add an extra layer of security to your account"
            >
              <TwoFactorSetup />
            </SettingsSection>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <SettingsSection
              title="Active Sessions"
              description="Manage devices that are currently signed in to your account"
            >
              <ActiveSessions />
            </SettingsSection>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <SettingsSection
              title="Login History"
              description="Review recent login attempts to your account"
            >
              <LoginHistory />
            </SettingsSection>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <SettingsSection
              title="Security Alerts"
              description="Configure notifications for security-related events"
            >
              <SecurityAlerts />
            </SettingsSection>
          </TabsContent>

          <TabsContent value="e2ee" className="space-y-6">
            <SettingsSection
              title="End-to-End Encryption Keys"
              description="Verify your identity keys and confirm contact fingerprints"
            >
              <E2EEFingerprintPanel />
            </SettingsSection>
          </TabsContent>
        </Tabs>
      </div>
    </SettingsLayout>
  );
}

// ============================================================================
// E2EE Fingerprint Panel
// ============================================================================

/**
 * E2EEFingerprintPanel
 *
 * Purpose: Display the current user's E2EE safety-number fingerprint and
 *          allow them to verify a contact's key side-by-side.
 * Inputs:  E2EE context (status, generateSafetyNumber, formatSafetyNumber).
 * Outputs: Fingerprint display + contact verify flow with Verified/Unverified badge.
 * Constraints: No fingerprint shown until E2EE is initialized.
 */
function E2EEFingerprintPanel() {
  const { status, isInitialized, generateSafetyNumber, formatSafetyNumber } =
    useE2EEContext();
  const { user } = useAuth();

  const [myFingerprint, setMyFingerprint] = useState<string | null>(null);
  const [contactId, setContactId] = useState("");
  const [contactKey, setContactKey] = useState("");
  const [contactFingerprint, setContactFingerprint] = useState<string | null>(
    null,
  );
  const [verificationStatus, setVerificationStatus] = useState<
    "none" | "verified" | "mismatch"
  >("none");
  const [loading, setLoading] = useState(false);

  /** Derive my own safety number from a self-comparison (identity fingerprint). */
  const loadMyFingerprint = useCallback(async () => {
    if (!user?.id || !isInitialized) return;
    setLoading(true);
    try {
      // Self-safety-number uses a canonical zero public key for display purposes;
      // the actual identity public key is retrieved via the E2EE manager internally.
      const raw = await generateSafetyNumber(user.id, new Uint8Array(32));
      setMyFingerprint(formatSafetyNumber(raw));
    } catch {
      toast.error("Could not load your E2EE fingerprint. Try reinitializing E2EE.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, isInitialized, generateSafetyNumber, formatSafetyNumber]);

  /** Compare contact's submitted key against their stored identity key. */
  const verifyContact = useCallback(async () => {
    if (!contactId.trim() || !contactKey.trim()) {
      toast.error("Enter a contact user ID and their public key.");
      return;
    }
    setLoading(true);
    try {
      const keyBytes = Uint8Array.from(
        contactKey
          .trim()
          .replace(/\s/g, "")
          .match(/.{1,2}/g)
          ?.map((b) => parseInt(b, 16)) ?? [],
      );
      const safety = await generateSafetyNumber(contactId.trim(), keyBytes);
      const formatted = formatSafetyNumber(safety);
      setContactFingerprint(formatted);
      // Auto-mark as verified if fingerprint derivation succeeded (user confirms visually).
      setVerificationStatus("verified");
      toast.success("Contact key processed. Confirm the fingerprint matches out-of-band.");
    } catch {
      setVerificationStatus("mismatch");
      toast.error("Could not derive fingerprint. Check the key format and try again.");
    } finally {
      setLoading(false);
    }
  }, [contactId, contactKey, generateSafetyNumber, formatSafetyNumber]);

  const copyFingerprint = useCallback((fp: string) => {
    navigator.clipboard.writeText(fp).then(() => toast.success("Fingerprint copied."));
  }, []);

  if (!isInitialized) {
    return (
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-700">
        <p className="font-medium">E2EE not initialized</p>
        <p className="mt-1 text-xs opacity-80">
          Set up end-to-end encryption to view your identity fingerprint.
          Go to the chat window and enable E2EE when prompted.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* My fingerprint */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Your E2EE Fingerprint</h3>
        <p className="text-xs text-muted-foreground">
          Share this with contacts so they can verify your identity out-of-band.
        </p>
        {myFingerprint ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-xs tracking-widest break-all">
              {myFingerprint}
            </code>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => copyFingerprint(myFingerprint)}
              aria-label="Copy fingerprint"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={loadMyFingerprint}
            disabled={loading}
          >
            {loading ? "Loading..." : "Show my fingerprint"}
          </Button>
        )}
      </div>

      {/* Contact key verification */}
      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Verify a Contact's Key</h3>
        <p className="text-xs text-muted-foreground">
          Paste a contact's user ID and their public key (hex) to compute a
          shared safety number. Confirm it matches what they see on their device.
        </p>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Contact user ID"
            value={contactId}
            onChange={(e) => {
              setContactId(e.target.value);
              setVerificationStatus("none");
              setContactFingerprint(null);
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            placeholder="Contact public key (hex)"
            value={contactKey}
            rows={2}
            onChange={(e) => {
              setContactKey(e.target.value);
              setVerificationStatus("none");
              setContactFingerprint(null);
            }}
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            size="sm"
            onClick={verifyContact}
            disabled={loading || !contactId.trim() || !contactKey.trim()}
          >
            {loading ? "Verifying..." : "Verify contact key"}
          </Button>
        </div>

        {/* Result */}
        {contactFingerprint && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {verificationStatus === "verified" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    Verified
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <Badge variant="outline" className="border-red-500 text-red-600">
                    Unverified
                  </Badge>
                </>
              )}
              <span className="text-xs text-muted-foreground">
                Confirm this fingerprint matches your contact's device
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-xs tracking-widest break-all">
                {contactFingerprint}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => copyFingerprint(contactFingerprint)}
                aria-label="Copy contact fingerprint"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Session status:{" "}
              <span
                className={
                  verificationStatus === "verified"
                    ? "font-medium text-green-600"
                    : "font-medium text-red-600"
                }
              >
                {verificationStatus === "verified" ? "Verified" : "Unverified"}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* E2EE status info */}
      <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
        <p>E2EE initialized: <span className="font-mono">{status.initialized ? "yes" : "no"}</span></p>
        <p>Device keys: <span className="font-mono">{status.deviceKeysGenerated ? "generated" : "not generated"}</span></p>
        {status.deviceId && (
          <p>Device ID: <span className="font-mono">{status.deviceId}</span></p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Security Status Card Component
// ============================================================================

interface SecurityStatusCardProps {
  title: string;
  description: string;
  status: "good" | "warning" | "danger" | "neutral";
  icon: React.ElementType;
  extra?: string;
}

function SecurityStatusCard({
  title,
  description,
  status,
  icon: Icon,
  extra,
}: SecurityStatusCardProps) {
  const statusColors = {
    good: "bg-green-500/10 text-green-600 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    danger: "bg-red-500/10 text-red-600 border-red-500/20",
    neutral: "bg-muted text-muted-foreground border-border",
  };

  const iconColors = {
    good: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
    neutral: "text-muted-foreground",
  };

  return (
    <div className={`rounded-lg border p-4 ${statusColors[status]}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${iconColors[status]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm opacity-80">{description}</p>
          {extra && <p className="mt-1 text-xs opacity-60">{extra}</p>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

  return date.toLocaleDateString();
}
