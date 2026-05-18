"use client";

/**
 * Admin Audit Settings Page - Retention and configuration settings
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Settings, ArrowLeft, Save, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useAuditStore } from "@/stores/audit-store";
import type {
  AuditRetentionPolicy,
  AuditSettings,
} from "@/lib/audit/audit-types";
import { defaultAuditSettings } from "@/lib/audit/audit-retention";

import { AuditLogRetention } from "@/components/audit";

import { logger } from "@/lib/logger";

// ============================================================================
// Component
// ============================================================================

export default function AuditSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    settings,
    isSavingSettings,
    setSettings,
    addRetentionPolicy,
    updateRetentionPolicy,
    removeRetentionPolicy,
    setSavingSettings,
  } = useAuditStore();

  const [localSettings, setLocalSettings] = useState<AuditSettings>(
    settings || defaultAuditSettings,
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || !["owner", "admin"].includes(user.role))) {
      router.push("/chat");
    }
  }, [user, authLoading, router]);

  // Sync with store
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSettingsChange = useCallback(
    (updates: Partial<AuditSettings>) => {
      setLocalSettings((prev) => ({ ...prev, ...updates }));
      setHasChanges(true);
    },
    [],
  );

  const handlePolicyAdd = useCallback((policy: AuditRetentionPolicy) => {
    setLocalSettings((prev) => ({
      ...prev,
      policies: [...prev.policies, policy],
    }));
    setHasChanges(true);
  }, []);

  const handlePolicyUpdate = useCallback(
    (id: string, updates: Partial<AuditRetentionPolicy>) => {
      setLocalSettings((prev) => ({
        ...prev,
        policies: prev.policies.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p,
        ),
      }));
      setHasChanges(true);
    },
    [],
  );

  const handlePolicyDelete = useCallback((id: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      policies: prev.policies.filter((p) => p.id !== id),
    }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    setSavingSettings(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update store
      setSettings(localSettings);

      // Update policies in store
      localSettings.policies.forEach((policy) => {
        const existingPolicy = settings.policies.find(
          (p) => p.id === policy.id,
        );
        if (existingPolicy) {
          updateRetentionPolicy(policy.id, policy);
        } else {
          addRetentionPolicy(policy);
        }
      });

      // Remove deleted policies
      settings.policies.forEach((policy) => {
        if (!localSettings.policies.find((p) => p.id === policy.id)) {
          removeRetentionPolicy(policy.id);
        }
      });

      setHasChanges(false);
    } catch (error) {
      logger.error("Failed to save settings:", error);
    } finally {
      setSavingSettings(false);
    }
  };

  if (authLoading || !user || !["owner", "admin"].includes(user.role)) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2"
              onClick={() => router.push("/admin/audit")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Audit Logs
            </Button>
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <Settings className="h-8 w-8" />
              Audit Settings
            </h1>
            <p className="mt-1 text-muted-foreground">
              Configure audit logging, retention policies, and export settings
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSavingSettings}
          >
            {isSavingSettings ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure basic audit logging behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="audit-enabled" className="cursor-pointer">
                  Enable Audit Logging
                </Label>
                <p className="text-xs text-muted-foreground">
                  Record all system events for security and compliance
                </p>
              </div>
              <Switch
                id="audit-enabled"
                checked={localSettings.enabled}
                onCheckedChange={(checked) =>
                  handleSettingsChange({ enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="realtime-enabled" className="cursor-pointer">
                  Real-time Updates
                </Label>
                <p className="text-xs text-muted-foreground">
                  Stream audit events in real-time to viewers
                </p>
              </div>
              <Switch
                id="realtime-enabled"
                checked={localSettings.realTimeEnabled}
                onCheckedChange={(checked) =>
                  handleSettingsChange({ realTimeEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sensitive-masking" className="cursor-pointer">
                  Sensitive Field Masking
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically mask sensitive data in logs (passwords, tokens)
                </p>
              </div>
              <Switch
                id="sensitive-masking"
                checked={localSettings.sensitiveFieldMasking}
                onCheckedChange={(checked) =>
                  handleSettingsChange({ sensitiveFieldMasking: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="ip-logging" className="cursor-pointer">
                  IP Address Logging
                </Label>
                <p className="text-xs text-muted-foreground">
                  Record IP addresses for audit events
                </p>
              </div>
              <Switch
                id="ip-logging"
                checked={localSettings.ipLoggingEnabled}
                onCheckedChange={(checked) =>
                  handleSettingsChange({ ipLoggingEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="geo-location" className="cursor-pointer">
                  Geo-location Tracking
                </Label>
                <p className="text-xs text-muted-foreground">
                  Resolve IP addresses to geographic locations
                </p>
              </div>
              <Switch
                id="geo-location"
                checked={localSettings.geoLocationEnabled}
                onCheckedChange={(checked) =>
                  handleSettingsChange({ geoLocationEnabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Retention Settings */}
        <AuditLogRetention
          settings={localSettings}
          onSettingsChange={handleSettingsChange}
          onPolicyAdd={handlePolicyAdd}
          onPolicyUpdate={handlePolicyUpdate}
          onPolicyDelete={handlePolicyDelete}
          saving={isSavingSettings}
        />

        {/* Export Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Export Settings</CardTitle>
            <CardDescription>
              Configure scheduled exports and default export options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-center text-muted-foreground">
              <p className="text-sm">
                Scheduled exports and advanced export configuration coming soon.
              </p>
              <p className="mt-1 text-xs">
                For now, use the Export button in the Audit Logs page.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button (bottom) */}
        {hasChanges && (
          <div className="sticky bottom-4 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSavingSettings}
              size="lg"
              className="shadow-lg"
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
