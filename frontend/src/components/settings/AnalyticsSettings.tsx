/**
 * Analytics Settings Component
 *
 * User-facing privacy controls for analytics and tracking
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Shield,
  Download,
  Trash2,
  Activity,
  Eye,
  EyeOff,
} from "lucide-react";
import { analyticsPrivacy } from "@/lib/analytics/privacy";
import type { ConsentStatus, PrivacySettings } from "@/lib/analytics/types";
import { analytics } from "@/lib/analytics/events";

import { logger } from "@/lib/logger";

export function AnalyticsSettings() {
  const [consent, setConsent] = useState<ConsentStatus>(
    analyticsPrivacy.getConsent(),
  );
  const [settings, setSettings] = useState<PrivacySettings>(
    analyticsPrivacy.getPrivacySettings(),
  );
  const [hasConsented, setHasConsented] = useState(
    analyticsPrivacy.hasProvidedConsent(),
  );
  const [saving, setSaving] = useState(false);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  useEffect(() => {
    // Load current settings
    setConsent(analyticsPrivacy.getConsent());
    setSettings(analyticsPrivacy.getPrivacySettings());
    setHasConsented(analyticsPrivacy.hasProvidedConsent());
  }, []);

  const handleConsentChange = async (
    field: keyof ConsentStatus,
    value: boolean,
  ) => {
    const updated = { ...consent, [field]: value };
    setConsent(updated);

    try {
      setSaving(true);
      await analyticsPrivacy.setConsent({ [field]: value });
      setHasConsented(true);
    } catch (error) {
      logger.error("Failed to update consent:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsChange = async (
    field: keyof PrivacySettings,
    value: boolean,
  ) => {
    const updated = { ...settings, [field]: value };
    setSettings(updated);

    try {
      setSaving(true);
      await analyticsPrivacy.setPrivacySettings({ [field]: value });
    } catch (error) {
      logger.error("Failed to update settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptAll = async () => {
    try {
      setSaving(true);
      await analyticsPrivacy.acceptAll();
      setConsent(analyticsPrivacy.getConsent());
      setHasConsented(true);
    } catch (error) {
      logger.error("Failed to accept all:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleRejectAll = async () => {
    try {
      setSaving(true);
      await analyticsPrivacy.rejectAll();
      setConsent(analyticsPrivacy.getConsent());
      setHasConsented(true);
    } catch (error) {
      logger.error("Failed to reject all:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await analyticsPrivacy.exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-data-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Failed to export data:", error);
    }
  };

  const handleClearData = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all analytics data? This cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      await analyticsPrivacy.clearAllData();
      setConsent(analyticsPrivacy.getConsent());
      setHasConsented(false);
    } catch (error) {
      logger.error("Failed to clear data:", error);
    } finally {
      setSaving(false);
    }
  };

  const privacyInfo = analyticsPrivacy.getPrivacyPolicySummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Analytics & Privacy
        </h2>
        <p className="text-muted-foreground">
          Control what data we collect and how we use it
        </p>
      </div>

      {/* Consent Banner */}
      {!hasConsented && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-4">
              <p className="font-medium">We respect your privacy</p>
              <p className="text-sm">
                {analyticsPrivacy.getConsentBannerMessage()}
              </p>
              <div className="flex gap-2">
                <Button onClick={handleAcceptAll} size="sm">
                  Accept All
                </Button>
                <Button onClick={handleRejectAll} variant="outline" size="sm">
                  Reject All
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Consent Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Collection Preferences</CardTitle>
              <CardDescription>
                Choose what data we can collect to improve your experience
              </CardDescription>
            </div>
            {analytics.isEnabled() ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Disabled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Analytics */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="analytics" className="text-base font-medium">
                Usage Analytics
              </Label>
              <p className="text-sm text-muted-foreground">
                Track feature usage, screen views, and user interactions
              </p>
            </div>
            <Switch
              id="analytics"
              checked={consent.analytics}
              onCheckedChange={(checked) =>
                handleConsentChange("analytics", checked)
              }
              disabled={saving}
            />
          </div>

          <Separator />

          {/* Performance */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="performance" className="text-base font-medium">
                Performance Monitoring
              </Label>
              <p className="text-sm text-muted-foreground">
                Monitor app speed, load times, and performance metrics
              </p>
            </div>
            <Switch
              id="performance"
              checked={consent.performance}
              onCheckedChange={(checked) =>
                handleConsentChange("performance", checked)
              }
              disabled={saving}
            />
          </div>

          <Separator />

          {/* Error Tracking */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="errorTracking" className="text-base font-medium">
                Error Tracking
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically report errors to help us fix bugs
              </p>
            </div>
            <Switch
              id="errorTracking"
              checked={consent.errorTracking}
              onCheckedChange={(checked) =>
                handleConsentChange("errorTracking", checked)
              }
              disabled={saving}
            />
          </div>

          <Separator />

          {/* Crash Reporting */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="crashReporting" className="text-base font-medium">
                Crash Reporting
              </Label>
              <p className="text-sm text-muted-foreground">
                Send crash reports to improve app stability
              </p>
            </div>
            <Switch
              id="crashReporting"
              checked={consent.crashReporting}
              onCheckedChange={(checked) =>
                handleConsentChange("crashReporting", checked)
              }
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Additional privacy options for enhanced protection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Anonymize IP */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="anonymizeIp" className="text-base font-medium">
                Anonymize IP Address
              </Label>
              <p className="text-sm text-muted-foreground">
                Hide your IP address in analytics data
              </p>
            </div>
            <Switch
              id="anonymizeIp"
              checked={settings.anonymizeIp}
              onCheckedChange={(checked) =>
                handleSettingsChange("anonymizeIp", checked)
              }
              disabled={saving}
            />
          </div>

          <Separator />

          {/* Anonymize User ID */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="anonymizeUserId"
                className="text-base font-medium"
              >
                Anonymize User ID
              </Label>
              <p className="text-sm text-muted-foreground">
                Use a hashed ID instead of your actual user ID
              </p>
            </div>
            <Switch
              id="anonymizeUserId"
              checked={settings.anonymizeUserId}
              onCheckedChange={(checked) =>
                handleSettingsChange("anonymizeUserId", checked)
              }
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* What We Collect */}
      <Card>
        <CardHeader>
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
          >
            <span className="flex items-center gap-2">
              {showPrivacyInfo ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              What Data We Collect
            </span>
            <Badge variant="secondary">
              {showPrivacyInfo ? "Hide" : "Show"}
            </Badge>
          </Button>
        </CardHeader>

        {showPrivacyInfo && (
          <CardContent className="space-y-6">
            {/* What We Collect */}
            <div>
              <h4 className="mb-2 font-medium text-green-600 dark:text-green-400">
                ✓ What We Collect
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {privacyInfo.whatWeCollect.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* What We Don't Collect */}
            <div>
              <h4 className="mb-2 font-medium text-red-600 dark:text-red-400">
                ✗ What We Don't Collect
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {privacyInfo.whatWeDontCollect.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* How We Use It */}
            <div>
              <h4 className="mb-2 font-medium">How We Use Your Data</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {privacyInfo.howWeUseIt.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* Your Rights */}
            <div>
              <h4 className="mb-2 font-medium">Your Rights (GDPR)</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {privacyInfo.yourRights.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export or delete your analytics data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={handleExportData}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export My Data
            </Button>
            <Button
              onClick={handleClearData}
              variant="destructive"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export includes your consent preferences and privacy settings.
            Clearing data will reset all analytics and require you to provide
            consent again.
          </p>
        </CardContent>
      </Card>

      {/* Session Info */}
      {analytics.getSessionData() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Screen Views</p>
                <p className="font-medium">
                  {analytics.getSessionData()?.screenViews || 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Events</p>
                <p className="font-medium">
                  {analytics.getSessionData()?.events || 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Errors</p>
                <p className="font-medium">
                  {analytics.getSessionData()?.errors || 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Platform</p>
                <p className="font-medium capitalize">
                  {analytics.getPlatform()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button onClick={handleAcceptAll} disabled={saving}>
          Accept All
        </Button>
        <Button onClick={handleRejectAll} variant="outline" disabled={saving}>
          Reject All
        </Button>
      </div>
    </div>
  );
}
