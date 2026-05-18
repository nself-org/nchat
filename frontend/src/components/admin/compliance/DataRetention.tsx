"use client";

/**
 * Data Retention Management Component
 *
 * Comprehensive data retention policy management:
 * - Create and manage retention policies
 * - Auto-delete configuration
 * - Channel exclusions
 * - User exclusions
 * - Legal hold prevention
 * - Dry-run testing
 */

import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Archive,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import types and utilities
import type {
  RetentionPolicy,
  RetentionPeriod,
  DataCategory,
  MessageType,
  AutoDeleteConfig,
  RetentionJobStatus,
  ChannelRetentionOverride,
} from "@/lib/compliance/compliance-types";
import {
  DEFAULT_RETENTION_PERIODS,
  DATA_CATEGORIES,
  MESSAGE_TYPES,
  validateRetentionPolicy,
  createDefaultPolicy,
  createDefaultAutoDeleteConfig,
  calculateNextRunTime,
  generatePolicySummary,
} from "@/lib/compliance/retention-policy";

// ============================================================================
// Main Component
// ============================================================================

export function DataRetention() {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [autoDeleteConfig, setAutoDeleteConfig] =
    useState<AutoDeleteConfig | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<RetentionPolicy | null>(
    null,
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRetentionData();
  }, []);

  const loadRetentionData = async () => {
    try {
      setLoading(true);
      // Mock data for now
      setPolicies([
        createDefaultPolicy("messages", {
          id: "1",
          name: "Messages - 1 Year",
          period: "1_year",
          enabled: true,
        }),
        createDefaultPolicy("files", {
          id: "2",
          name: "Files - 2 Years",
          period: "2_years",
          enabled: true,
        }),
        createDefaultPolicy("audit_logs", {
          id: "3",
          name: "Audit Logs - 7 Years",
          period: "7_years",
          enabled: true,
        }),
      ]);

      setAutoDeleteConfig(createDefaultAutoDeleteConfig());
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to load retention policies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = (policy: RetentionPolicy) => {
    const validation = validateRetentionPolicy(policy);

    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setPolicies([...policies, policy]);
    setShowCreateDialog(false);

    toast({
      title: "Policy Created",
      description: `Retention policy "${policy.name}" has been created.`,
    });

    if (validation.warnings.length > 0) {
      toast({
        title: "Warnings",
        description: validation.warnings.join(", "),
      });
    }
  };

  const handleUpdatePolicy = (policy: RetentionPolicy) => {
    const validation = validateRetentionPolicy(policy);

    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setPolicies(policies.map((p) => (p.id === policy.id ? policy : p)));
    setShowEditDialog(false);
    setSelectedPolicy(null);

    toast({
      title: "Policy Updated",
      description: `Retention policy "${policy.name}" has been updated.`,
    });
  };

  const handleDeletePolicy = () => {
    if (!selectedPolicy) return;

    setPolicies(policies.filter((p) => p.id !== selectedPolicy.id));
    setShowDeleteDialog(false);
    setSelectedPolicy(null);

    toast({
      title: "Policy Deleted",
      description: `Retention policy "${selectedPolicy.name}" has been deleted.`,
    });
  };

  const handleTogglePolicy = (policyId: string) => {
    setPolicies(
      policies.map((p) =>
        p.id === policyId ? { ...p, enabled: !p.enabled } : p,
      ),
    );

    const policy = policies.find((p) => p.id === policyId);
    toast({
      title: policy?.enabled ? "Policy Disabled" : "Policy Enabled",
      description: `Retention policy "${policy?.name}" has been ${policy?.enabled ? "disabled" : "enabled"}.`,
    });
  };

  const handleRunNow = async () => {
    toast({
      title: "Retention Job Started",
      description: "Data retention job is now running...",
    });
  };

  const summary = generatePolicySummary(policies);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading retention policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Retention Policies</h2>
          <p className="mt-1 text-muted-foreground">
            Automatically delete data after specified periods
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Auto-Delete Settings
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Policy
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Policies
            </CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalPolicies}</div>
            <p className="text-xs text-muted-foreground">
              {summary.enabledPolicies} enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Shortest Retention
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.shortestRetention?.days || "N/A"}
              {summary.shortestRetention && " days"}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.shortestRetention?.category || "No policies"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Longest Retention
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.longestRetention?.days || "N/A"}
              {summary.longestRetention && " days"}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.longestRetention?.category || "No policies"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Channel Overrides
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.channelOverridesCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Custom retention periods
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Delete Status */}
      {autoDeleteConfig && (
        <Card
          className={cn(
            "border-2",
            autoDeleteConfig.enabled ? "border-green-500" : "border-gray-300",
          )}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {autoDeleteConfig.enabled ? (
                <Play className="h-5 w-5 text-green-500" />
              ) : (
                <Pause className="h-5 w-5 text-gray-500" />
              )}
              Automatic Deletion{" "}
              {autoDeleteConfig.enabled ? "Enabled" : "Disabled"}
            </CardTitle>
            <CardDescription>
              {autoDeleteConfig.enabled
                ? `Scheduled daily at ${autoDeleteConfig.scheduleTime} ${autoDeleteConfig.timezone}`
                : "Automatic deletion is currently disabled"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-xs text-muted-foreground">Mode</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant={
                      autoDeleteConfig.dryRunMode ? "secondary" : "default"
                    }
                  >
                    {autoDeleteConfig.dryRunMode ? "Dry Run" : "Live"}
                  </Badge>
                  {autoDeleteConfig.dryRunMode && (
                    <span className="text-xs text-muted-foreground">
                      (No actual deletions)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Next Run
                </Label>
                <div className="mt-1">
                  {autoDeleteConfig.enabled && autoDeleteConfig.nextRunAt
                    ? new Date(autoDeleteConfig.nextRunAt).toLocaleString()
                    : "Not scheduled"}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Last Run
                </Label>
                <div className="mt-1">
                  {autoDeleteConfig.lastRunAt
                    ? new Date(autoDeleteConfig.lastRunAt).toLocaleString()
                    : "Never"}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              {autoDeleteConfig.excludeWeekends && "Excludes weekends"}
              {autoDeleteConfig.notifyAdmins && " • Admins notified"}
            </div>
            <Button variant="outline" size="sm" onClick={handleRunNow}>
              <Play className="mr-2 h-4 w-4" />
              Run Now
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Policies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Policies</CardTitle>
          <CardDescription>
            Manage data retention rules for different data categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Exclusions</TableHead>
                <TableHead>Overrides</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell>
                    <Switch
                      checked={policy.enabled}
                      onCheckedChange={() => handleTogglePolicy(policy.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{policy.name}</div>
                      {policy.description && (
                        <div className="text-sm text-muted-foreground">
                          {policy.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {
                        DATA_CATEGORIES.find(
                          (c) => c.category === policy.dataCategory,
                        )?.label
                      }
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {
                      DEFAULT_RETENTION_PERIODS.find(
                        (p) => p.period === policy.period,
                      )?.label
                    }
                    {policy.period === "custom" &&
                      policy.customDays &&
                      ` (${policy.customDays} days)`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {policy.excludePinnedMessages && (
                        <Badge variant="secondary" className="text-xs">
                          Pinned
                        </Badge>
                      )}
                      {policy.excludeStarredMessages && (
                        <Badge variant="secondary" className="text-xs">
                          Starred
                        </Badge>
                      )}
                      {policy.excludeMessageTypes &&
                        policy.excludeMessageTypes.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            +{policy.excludeMessageTypes.length} types
                          </Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {policy.channelOverrides &&
                    policy.channelOverrides.length > 0 ? (
                      <Badge variant="outline">
                        {policy.channelOverrides.length} channels
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        None
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPolicy(policy);
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPolicy(policy);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {policies.length === 0 && (
            <div className="py-12 text-center">
              <Archive className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">
                No retention policies
              </h3>
              <p className="mb-4 text-muted-foreground">
                Create your first retention policy to automatically manage data
                lifecycle
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Policy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Policy Dialog */}
      <PolicyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSave={handleCreatePolicy}
        title="Create Retention Policy"
      />

      {/* Edit Policy Dialog */}
      {selectedPolicy && (
        <PolicyDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSave={handleUpdatePolicy}
          policy={selectedPolicy}
          title="Edit Retention Policy"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Retention Policy?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the policy &quot;
              {selectedPolicy?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePolicy}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-Delete Settings Dialog */}
      {autoDeleteConfig && (
        <AutoDeleteSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          config={autoDeleteConfig}
          onSave={(config) => {
            setAutoDeleteConfig(config);
            setShowSettingsDialog(false);
            toast({
              title: "Settings Updated",
              description: "Auto-delete configuration has been saved.",
            });
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Policy Dialog Component
// ============================================================================

interface PolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (policy: RetentionPolicy) => void;
  policy?: RetentionPolicy;
  title: string;
}

function PolicyDialog({
  open,
  onOpenChange,
  onSave,
  policy,
  title,
}: PolicyDialogProps) {
  const [formData, setFormData] = useState<Partial<RetentionPolicy>>(
    policy || {
      name: "",
      description: "",
      enabled: true,
      isDefault: false,
      period: "1_year",
      dataCategory: "messages",
      excludePinnedMessages: true,
      excludeStarredMessages: true,
      excludeMessageTypes: [],
      channelOverrides: [],
    },
  );

  const handleSubmit = () => {
    const newPolicy: RetentionPolicy = {
      id: policy?.id || crypto.randomUUID(),
      name: formData.name || "",
      description: formData.description,
      enabled: formData.enabled ?? true,
      isDefault: formData.isDefault ?? false,
      period: formData.period || "1_year",
      customDays: formData.customDays,
      dataCategory: formData.dataCategory || "messages",
      excludeMessageTypes: formData.excludeMessageTypes || [],
      excludePinnedMessages: formData.excludePinnedMessages ?? true,
      excludeStarredMessages: formData.excludeStarredMessages ?? true,
      channelOverrides: formData.channelOverrides || [],
      createdAt: policy?.createdAt || new Date(),
      updatedAt: new Date(),
      createdBy: formData.createdBy,
    };

    onSave(newPolicy);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Configure data retention settings for automatic deletion
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="name">Policy Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Messages - 1 Year"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional description"
              rows={2}
            />
          </div>

          {/* Data Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Data Category *</Label>
            <Select
              value={formData.dataCategory}
              onValueChange={(value: DataCategory) =>
                setFormData({ ...formData, dataCategory: value })
              }
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.label} - {cat.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Retention Period */}
          <div className="space-y-2">
            <Label htmlFor="period">Retention Period *</Label>
            <Select
              value={formData.period}
              onValueChange={(value: RetentionPeriod) =>
                setFormData({ ...formData, period: value })
              }
            >
              <SelectTrigger id="period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_RETENTION_PERIODS.map((period) => (
                  <SelectItem key={period.period} value={period.period}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Days (if custom period) */}
          {formData.period === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customDays">Custom Days *</Label>
              <Input
                id="customDays"
                type="number"
                min="1"
                value={formData.customDays || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customDays: parseInt(e.target.value),
                  })
                }
                placeholder="Number of days"
              />
            </div>
          )}

          {/* Exclusions */}
          <div className="space-y-3">
            <Label>Exclusions</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="excludePinned" className="font-normal">
                Exclude pinned messages
              </Label>
              <Switch
                id="excludePinned"
                checked={formData.excludePinnedMessages}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, excludePinnedMessages: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="excludeStarred" className="font-normal">
                Exclude starred messages
              </Label>
              <Switch
                id="excludeStarred"
                checked={formData.excludeStarredMessages}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, excludeStarredMessages: checked })
                }
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled" className="font-normal">
              Enable this policy
            </Label>
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enabled: checked })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {policy ? "Update" : "Create"} Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Auto-Delete Settings Dialog
// ============================================================================

interface AutoDeleteSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AutoDeleteConfig;
  onSave: (config: AutoDeleteConfig) => void;
}

function AutoDeleteSettingsDialog({
  open,
  onOpenChange,
  config,
  onSave,
}: AutoDeleteSettingsDialogProps) {
  const [formData, setFormData] = useState<AutoDeleteConfig>(config);

  const handleSubmit = () => {
    const nextRun = formData.enabled
      ? calculateNextRunTime(formData)
      : undefined;

    onSave({
      ...formData,
      nextRunAt: nextRun,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Auto-Delete Configuration</DialogTitle>
          <DialogDescription>
            Configure automatic data deletion schedule and behavior
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between rounded-lg bg-muted p-4">
            <div>
              <Label className="font-semibold">Enable Automatic Deletion</Label>
              <p className="text-sm text-muted-foreground">
                Automatically run retention jobs on schedule
              </p>
            </div>
            <Switch
              checked={formData.enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enabled: checked })
              }
            />
          </div>

          {/* Schedule Time */}
          <div className="space-y-2">
            <Label htmlFor="scheduleTime">Schedule Time (24-hour format)</Label>
            <Input
              id="scheduleTime"
              type="time"
              value={formData.scheduleTime}
              onChange={(e) =>
                setFormData({ ...formData, scheduleTime: e.target.value })
              }
            />
          </div>

          {/* Dry Run Mode */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-normal">Dry Run Mode</Label>
              <p className="text-sm text-muted-foreground">
                Test without actually deleting data
              </p>
            </div>
            <Switch
              checked={formData.dryRunMode}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, dryRunMode: checked })
              }
            />
          </div>

          {/* Notifications */}
          <div className="space-y-3">
            <Label>Notifications</Label>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Notify admins</Label>
              <Switch
                checked={formData.notifyAdmins}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, notifyAdmins: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Notify affected users</Label>
              <Switch
                checked={formData.notifyUsers}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, notifyUsers: checked })
                }
              />
            </div>
          </div>

          {/* Exclusions */}
          <div className="space-y-3">
            <Label>Schedule Exclusions</Label>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Exclude weekends</Label>
              <Switch
                checked={formData.excludeWeekends}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, excludeWeekends: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Exclude holidays</Label>
              <Switch
                checked={formData.excludeHolidays}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, excludeHolidays: checked })
                }
              />
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-2">
            <Label htmlFor="batchSize">Batch Size</Label>
            <Input
              id="batchSize"
              type="number"
              min="100"
              max="10000"
              value={formData.batchSize}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  batchSize: parseInt(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Number of items to process in each batch
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxDeletions">Maximum Deletions Per Run</Label>
            <Input
              id="maxDeletions"
              type="number"
              min="1000"
              max="1000000"
              value={formData.maxDeletionsPerRun}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxDeletionsPerRun: parseInt(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Safety limit to prevent accidental mass deletion
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DataRetention;
