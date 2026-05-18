"use client";

import { useState } from "react";
import { SettingsLayout, SettingsSection } from "@/components/settings";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { TwoFactorSetup } from "@/components/settings/two-factor-setup";
import { ActiveSessions } from "@/components/settings/active-sessions";
import { LoginHistory } from "@/components/settings/login-history";
import { SecurityAlerts } from "@/components/settings/security-alerts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { useSecurity } from "@/lib/security/use-security";
import {
  Shield,
  Key,
  Smartphone,
  History,
  Bell,
  AlertTriangle,
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
          <TabsList className="grid w-full grid-cols-5 lg:inline-grid lg:w-auto">
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
        </Tabs>
      </div>
    </SettingsLayout>
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
