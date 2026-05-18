"use client";

/**
 * AuditLogRetention - Retention policy settings component
 */

import { useState } from "react";
import {
  Archive,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Clock,
  Shield,
  Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  AuditRetentionPolicy,
  AuditSettings,
  AuditCategory,
  AuditSeverity,
} from "@/lib/audit/audit-types";
import {
  createRetentionPolicy,
  formatRetentionPeriod,
  presetPolicies,
  getSuggestedRetentionForCompliance,
} from "@/lib/audit/audit-retention";
import {
  categoryDisplayNames,
  severityDisplayNames,
} from "@/lib/audit/audit-types";

// ============================================================================
// Types
// ============================================================================

interface AuditLogRetentionProps {
  settings: AuditSettings;
  onSettingsChange: (settings: Partial<AuditSettings>) => void;
  onPolicyAdd: (policy: AuditRetentionPolicy) => void;
  onPolicyUpdate: (id: string, updates: Partial<AuditRetentionPolicy>) => void;
  onPolicyDelete: (id: string) => void;
  saving?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function AuditLogRetention({
  settings,
  onSettingsChange,
  onPolicyAdd,
  onPolicyUpdate,
  onPolicyDelete,
  saving = false,
}: AuditLogRetentionProps) {
  const [isAddingPolicy, setIsAddingPolicy] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [newPolicy, setNewPolicy] = useState({
    name: "",
    retentionDays: 90,
    categories: [] as AuditCategory[],
    severities: [] as AuditSeverity[],
    archiveEnabled: false,
  });

  const categories: AuditCategory[] = [
    "user",
    "message",
    "channel",
    "file",
    "admin",
    "security",
    "integration",
  ];

  const severities: AuditSeverity[] = ["info", "warning", "error", "critical"];

  const handleAddPolicy = () => {
    if (!newPolicy.name || newPolicy.retentionDays <= 0) return;

    const policy = createRetentionPolicy(
      newPolicy.name,
      newPolicy.retentionDays,
      {
        categories:
          newPolicy.categories.length > 0 ? newPolicy.categories : undefined,
        severities:
          newPolicy.severities.length > 0 ? newPolicy.severities : undefined,
        archiveEnabled: newPolicy.archiveEnabled,
      },
    );

    onPolicyAdd(policy);
    setNewPolicy({
      name: "",
      retentionDays: 90,
      categories: [],
      severities: [],
      archiveEnabled: false,
    });
    setIsAddingPolicy(false);
  };

  const handlePresetSelect = (presetName: string) => {
    const preset = presetPolicies[presetName];
    if (!preset) return;

    const policy = createRetentionPolicy(
      preset.name || presetName,
      preset.retentionDays || settings.defaultRetentionDays,
      preset,
    );
    onPolicyAdd(policy);
  };

  const togglePolicyCategory = (policyId: string, category: AuditCategory) => {
    const policy = settings.policies.find((p) => p.id === policyId);
    if (!policy) return;

    const currentCategories = policy.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter((c) => c !== category)
      : [...currentCategories, category];

    onPolicyUpdate(policyId, {
      categories: newCategories.length > 0 ? newCategories : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Global Retention Settings
          </CardTitle>
          <CardDescription>
            Configure default retention periods for all audit logs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="default-retention">
                Default Retention (days)
              </Label>
              <Input
                id="default-retention"
                type="number"
                min={settings.minRetentionDays}
                max={settings.maxRetentionDays}
                value={settings.defaultRetentionDays}
                onChange={(e) =>
                  onSettingsChange({
                    defaultRetentionDays: parseInt(e.target.value) || 90,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                {formatRetentionPeriod(settings.defaultRetentionDays)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-retention">Minimum (days)</Label>
              <Input
                id="min-retention"
                type="number"
                min={1}
                value={settings.minRetentionDays}
                onChange={(e) =>
                  onSettingsChange({
                    minRetentionDays: parseInt(e.target.value) || 7,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-retention">Maximum (days)</Label>
              <Input
                id="max-retention"
                type="number"
                min={settings.minRetentionDays}
                value={settings.maxRetentionDays}
                onChange={(e) =>
                  onSettingsChange({
                    maxRetentionDays: parseInt(e.target.value) || 365,
                  })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <Label htmlFor="archive-enabled" className="cursor-pointer">
                Enable Archival
              </Label>
              <p className="text-xs text-muted-foreground">
                Archive expired logs instead of deleting them
              </p>
            </div>
            <Switch
              id="archive-enabled"
              checked={settings.archiveEnabled}
              onCheckedChange={(checked) =>
                onSettingsChange({ archiveEnabled: checked })
              }
            />
          </div>

          {settings.archiveEnabled && (
            <div className="space-y-2">
              <Label htmlFor="archive-location">Archive Location</Label>
              <Input
                id="archive-location"
                placeholder="s3://bucket/audit-archives/"
                value={settings.archiveLocation || ""}
                onChange={(e) =>
                  onSettingsChange({ archiveLocation: e.target.value })
                }
              />
            </div>
          )}

          {/* Compliance Suggestions */}
          <div className="border-t pt-4">
            <Label className="mb-2 block text-sm">Compliance Presets</Label>
            <div className="flex flex-wrap gap-2">
              {(["gdpr", "hipaa", "sox", "pci"] as const).map((compliance) => (
                <Button
                  key={compliance}
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onSettingsChange({
                      defaultRetentionDays:
                        getSuggestedRetentionForCompliance(compliance),
                    })
                  }
                  className="text-xs uppercase"
                >
                  {compliance} (
                  {formatRetentionPeriod(
                    getSuggestedRetentionForCompliance(compliance),
                  )}
                  )
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retention Policies */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Retention Policies
            </CardTitle>
            <CardDescription>
              Create custom retention policies for specific event types
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddingPolicy(true)} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Add Policy
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Add Presets */}
          <div className="flex flex-wrap gap-2 border-b pb-4">
            <span className="mr-2 text-sm text-muted-foreground">
              Quick add:
            </span>
            {Object.keys(presetPolicies).map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => handlePresetSelect(preset)}
                className="text-xs"
              >
                {presetPolicies[preset].name}
              </Button>
            ))}
          </div>

          {/* Add New Policy Form */}
          {isAddingPolicy && (
            <Card className="border-dashed">
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Policy Name</Label>
                    <Input
                      placeholder="e.g., Security Events"
                      value={newPolicy.name}
                      onChange={(e) =>
                        setNewPolicy({ ...newPolicy, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Retention Period (days)</Label>
                    <Input
                      type="number"
                      min={settings.minRetentionDays}
                      max={settings.maxRetentionDays}
                      value={newPolicy.retentionDays}
                      onChange={(e) =>
                        setNewPolicy({
                          ...newPolicy,
                          retentionDays: parseInt(e.target.value) || 90,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Categories (optional)</Label>
                  <div className="flex flex-wrap gap-1">
                    {categories.map((cat) => (
                      <Badge
                        key={cat}
                        variant={
                          newPolicy.categories.includes(cat)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => {
                          const cats = newPolicy.categories.includes(cat)
                            ? newPolicy.categories.filter((c) => c !== cat)
                            : [...newPolicy.categories, cat];
                          setNewPolicy({ ...newPolicy, categories: cats });
                        }}
                      >
                        {categoryDisplayNames[cat]}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Severities (optional)</Label>
                  <div className="flex flex-wrap gap-1">
                    {severities.map((sev) => (
                      <Badge
                        key={sev}
                        variant={
                          newPolicy.severities.includes(sev)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => {
                          const sevs = newPolicy.severities.includes(sev)
                            ? newPolicy.severities.filter((s) => s !== sev)
                            : [...newPolicy.severities, sev];
                          setNewPolicy({ ...newPolicy, severities: sevs });
                        }}
                      >
                        {severityDisplayNames[sev]}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">
                    Archive before deletion
                  </Label>
                  <Switch
                    checked={newPolicy.archiveEnabled}
                    onCheckedChange={(checked) =>
                      setNewPolicy({ ...newPolicy, archiveEnabled: checked })
                    }
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingPolicy(false)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleAddPolicy}>
                    <Check className="mr-1 h-4 w-4" />
                    Add Policy
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Policies */}
          {settings.policies.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Archive className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No custom retention policies</p>
              <p className="text-sm">
                Default retention of{" "}
                {formatRetentionPeriod(settings.defaultRetentionDays)} applies
                to all events
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {settings.policies.map((policy) => (
                <div
                  key={policy.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    policy.enabled ? "bg-card" : "bg-muted/50 opacity-70",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={policy.enabled}
                      onCheckedChange={(checked) =>
                        onPolicyUpdate(policy.id, { enabled: checked })
                      }
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{policy.name}</span>
                        <Badge variant="secondary">
                          {formatRetentionPeriod(policy.retentionDays)}
                        </Badge>
                        {policy.archiveEnabled && (
                          <Badge variant="outline">
                            <Archive className="mr-1 h-3 w-3" />
                            Archive
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {policy.categories?.map((cat) => (
                          <Badge
                            key={cat}
                            variant="outline"
                            className="text-xs"
                          >
                            {categoryDisplayNames[cat]}
                          </Badge>
                        ))}
                        {policy.severities?.map((sev) => (
                          <Badge
                            key={sev}
                            variant="outline"
                            className="text-xs"
                          >
                            {severityDisplayNames[sev]}
                          </Badge>
                        ))}
                        {!policy.categories?.length &&
                          !policy.severities?.length && (
                            <span className="text-xs text-muted-foreground">
                              All events
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPolicyDelete(policy.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
