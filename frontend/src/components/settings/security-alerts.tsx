"use client";

/**
 * Security Alerts Component
 *
 * Manages security alert preferences and displays recent security events.
 * Part of the security settings page.
 */

import { useState } from "react";
import { Bell, AlertTriangle, Mail, Smartphone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// Types
// ============================================================================

interface AlertSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
}

interface SecurityAlertsProps {
  onSettingsChange?: (settings: AlertSetting[]) => void;
}

// ============================================================================
// Default Settings
// ============================================================================

const defaultAlertSettings: AlertSetting[] = [
  {
    id: "new-login",
    label: "New device login",
    description: "Get notified when your account is accessed from a new device",
    email: true,
    push: true,
  },
  {
    id: "password-change",
    label: "Password changes",
    description: "Get notified when your password is changed",
    email: true,
    push: true,
  },
  {
    id: "failed-attempts",
    label: "Failed login attempts",
    description: "Get notified when there are multiple failed login attempts",
    email: true,
    push: false,
  },
  {
    id: "2fa-changes",
    label: "Two-factor authentication changes",
    description: "Get notified when 2FA settings are modified",
    email: true,
    push: true,
  },
  {
    id: "suspicious-activity",
    label: "Suspicious activity",
    description: "Get notified about unusual account activity",
    email: true,
    push: true,
  },
];

// ============================================================================
// Alert Setting Row Component
// ============================================================================

function AlertSettingRow({
  setting,
  onToggleEmail,
  onTogglePush,
}: {
  setting: AlertSetting;
  onToggleEmail: (id: string) => void;
  onTogglePush: (id: string) => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
      <div className="space-y-0.5">
        <Label className="text-base font-medium">{setting.label}</Label>
        <p className="text-sm text-muted-foreground">{setting.description}</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <Switch
            id={`${setting.id}-email`}
            checked={setting.email}
            onCheckedChange={() => onToggleEmail(setting.id)}
          />
          <Label htmlFor={`${setting.id}-email`} className="sr-only">
            Email notifications for {setting.label}
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <Switch
            id={`${setting.id}-push`}
            checked={setting.push}
            onCheckedChange={() => onTogglePush(setting.id)}
          />
          <Label htmlFor={`${setting.id}-push`} className="sr-only">
            Push notifications for {setting.label}
          </Label>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SecurityAlerts({ onSettingsChange }: SecurityAlertsProps) {
  const [settings, setSettings] =
    useState<AlertSetting[]>(defaultAlertSettings);

  const handleToggleEmail = (id: string) => {
    setSettings((prev) => {
      const updated = prev.map((s) =>
        s.id === id ? { ...s, email: !s.email } : s,
      );
      onSettingsChange?.(updated);
      return updated;
    });
  };

  const handleTogglePush = (id: string) => {
    setSettings((prev) => {
      const updated = prev.map((s) =>
        s.id === id ? { ...s, push: !s.push } : s,
      );
      onSettingsChange?.(updated);
      return updated;
    });
  };

  const enableAllEmail = () => {
    setSettings((prev) => {
      const updated = prev.map((s) => ({ ...s, email: true }));
      onSettingsChange?.(updated);
      return updated;
    });
  };

  const enableAllPush = () => {
    setSettings((prev) => {
      const updated = prev.map((s) => ({ ...s, push: true }));
      onSettingsChange?.(updated);
      return updated;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle className="text-lg">Security Alerts</CardTitle>
        </div>
        <CardDescription>
          Choose how you want to be notified about security events
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Header with toggle all buttons */}
        <div className="flex items-center justify-end gap-6 border-b pb-4">
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={enableAllEmail}
          >
            <Mail className="h-4 w-4" />
            <span>Enable all</span>
          </button>
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={enableAllPush}
          >
            <Smartphone className="h-4 w-4" />
            <span>Enable all</span>
          </button>
        </div>

        {/* Alert settings list */}
        <div className="divide-y">
          {settings.map((setting) => (
            <AlertSettingRow
              key={setting.id}
              setting={setting}
              onToggleEmail={handleToggleEmail}
              onTogglePush={handleTogglePush}
            />
          ))}
        </div>

        <Separator className="my-6" />

        {/* Additional info */}
        <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div className="text-sm">
            <p className="font-medium">Important security alerts</p>
            <p className="text-muted-foreground">
              Critical security alerts (like account lockouts) will always be
              sent to your email, regardless of these settings.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
