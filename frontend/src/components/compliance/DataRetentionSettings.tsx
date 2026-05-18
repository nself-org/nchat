"use client";

import { useState } from "react";
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
} from "@/components/ui/dialog";
import { useComplianceStore } from "@/stores/compliance-store";
import type {
  RetentionPolicy,
  RetentionPeriod,
  DataCategory,
} from "@/lib/compliance/compliance-types";
import { formatRetentionPeriod } from "@/lib/compliance/compliance-types";
import {
  DEFAULT_RETENTION_PERIODS,
  DATA_CATEGORIES,
  MESSAGE_TYPES,
  createDefaultPolicy,
  validateRetentionPolicy,
} from "@/lib/compliance/retention-policy";

interface PolicyFormData {
  name: string;
  description: string;
  enabled: boolean;
  period: RetentionPeriod;
  customDays: number;
  dataCategory: DataCategory;
  excludePinnedMessages: boolean;
  excludeStarredMessages: boolean;
}

const initialFormData: PolicyFormData = {
  name: "",
  description: "",
  enabled: true,
  period: "1_year",
  customDays: 365,
  dataCategory: "messages",
  excludePinnedMessages: true,
  excludeStarredMessages: true,
};

interface PolicyCardProps {
  policy: RetentionPolicy;
  onEdit: (policy: RetentionPolicy) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

function PolicyCard({ policy, onEdit, onDelete, onToggle }: PolicyCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={!policy.enabled ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2 ${
                policy.enabled
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">{policy.name}</CardTitle>
              <CardDescription className="text-sm">
                {DATA_CATEGORIES.find((c) => c.category === policy.dataCategory)
                  ?.label || policy.dataCategory}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={policy.enabled ? "default" : "secondary"}>
              {formatRetentionPeriod(policy.period, policy.customDays)}
            </Badge>
            <Switch
              checked={policy.enabled}
              onCheckedChange={(checked) => onToggle(policy.id, checked)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {policy.description && (
            <p className="text-sm text-muted-foreground">
              {policy.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm">
            {policy.excludePinnedMessages && (
              <span className="text-muted-foreground">Excludes pinned</span>
            )}
            {policy.excludeStarredMessages && (
              <span className="text-muted-foreground">Excludes starred</span>
            )}
            {policy.channelOverrides && policy.channelOverrides.length > 0 && (
              <span className="text-muted-foreground">
                {policy.channelOverrides.length} channel override(s)
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Show Details
              </>
            )}
          </Button>

          {expanded && (
            <div className="space-y-3 border-t pt-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(policy.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p>{new Date(policy.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(policy)}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => onDelete(policy.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DataRetentionSettings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(
    null,
  );
  const [formData, setFormData] = useState<PolicyFormData>(initialFormData);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const {
    retentionPolicies,
    addRetentionPolicy,
    updateRetentionPolicy,
    deleteRetentionPolicy,
  } = useComplianceStore();

  const handleOpenDialog = (policy?: RetentionPolicy) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        name: policy.name,
        description: policy.description || "",
        enabled: policy.enabled,
        period: policy.period,
        customDays: policy.customDays || 365,
        dataCategory: policy.dataCategory,
        excludePinnedMessages: policy.excludePinnedMessages,
        excludeStarredMessages: policy.excludeStarredMessages,
      });
    } else {
      setEditingPolicy(null);
      setFormData(initialFormData);
    }
    setValidationErrors([]);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPolicy(null);
    setFormData(initialFormData);
    setValidationErrors([]);
  };

  const handleSave = () => {
    const validation = validateRetentionPolicy({
      ...formData,
      customDays:
        formData.period === "custom" ? formData.customDays : undefined,
    });

    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    if (editingPolicy) {
      updateRetentionPolicy(editingPolicy.id, {
        name: formData.name,
        description: formData.description || undefined,
        enabled: formData.enabled,
        period: formData.period,
        customDays:
          formData.period === "custom" ? formData.customDays : undefined,
        dataCategory: formData.dataCategory,
        excludePinnedMessages: formData.excludePinnedMessages,
        excludeStarredMessages: formData.excludeStarredMessages,
      });
    } else {
      const newPolicy = createDefaultPolicy(formData.dataCategory, {
        name: formData.name,
        description: formData.description || undefined,
        enabled: formData.enabled,
        period: formData.period,
        customDays:
          formData.period === "custom" ? formData.customDays : undefined,
        excludePinnedMessages: formData.excludePinnedMessages,
        excludeStarredMessages: formData.excludeStarredMessages,
        isDefault: false,
      });
      addRetentionPolicy(newPolicy);
    }

    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this retention policy?")) {
      deleteRetentionPolicy(id);
    }
  };

  const handleToggle = (id: string, enabled: boolean) => {
    updateRetentionPolicy(id, { enabled });
  };

  // Group policies by category
  const policiesByCategory = DATA_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.category] = retentionPolicies.filter(
        (p) => p.dataCategory === cat.category,
      );
      return acc;
    },
    {} as Record<DataCategory, RetentionPolicy[]>,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Clock className="h-6 w-6" />
            Data Retention Policies
          </h2>
          <p className="text-muted-foreground">
            Configure how long different types of data are retained
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Policy
        </Button>
      </div>

      {/* Policies Grid */}
      {retentionPolicies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No Retention Policies</h3>
            <p className="mt-1 text-muted-foreground">
              Create your first retention policy to manage data lifecycle
            </p>
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {DATA_CATEGORIES.map((cat) => {
            const policies = policiesByCategory[cat.category] || [];
            if (policies.length === 0) return null;

            return (
              <div key={cat.category}>
                <h3 className="mb-3 text-lg font-medium">{cat.label}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {policies.map((policy) => (
                    <PolicyCard
                      key={policy.id}
                      policy={policy}
                      onEdit={handleOpenDialog}
                      onDelete={handleDelete}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Policy Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy
                ? "Edit Retention Policy"
                : "Create Retention Policy"}
            </DialogTitle>
            <DialogDescription>
              Configure data retention settings for this policy
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {validationErrors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="mb-1 flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Validation Errors</span>
                </div>
                <ul className="list-inside list-disc text-sm text-red-600">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Policy Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Messages - 1 Year Retention"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the purpose of this policy"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Data Category</Label>
              <Select
                value={formData.dataCategory}
                onValueChange={(value: DataCategory) =>
                  setFormData({ ...formData, dataCategory: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Retention Period</Label>
              <Select
                value={formData.period}
                onValueChange={(value: RetentionPeriod) =>
                  setFormData({ ...formData, period: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_RETENTION_PERIODS.map((p) => (
                    <SelectItem key={p.period} value={p.period}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.period === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customDays">Custom Days</Label>
                <Input
                  id="customDays"
                  type="number"
                  min={1}
                  max={36500}
                  value={formData.customDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customDays: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="excludePinned">Exclude Pinned Messages</Label>
                  <p className="text-xs text-muted-foreground">
                    Pinned messages will not be deleted
                  </p>
                </div>
                <Switch
                  id="excludePinned"
                  checked={formData.excludePinnedMessages}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, excludePinnedMessages: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="excludeStarred">
                    Exclude Starred Messages
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Starred messages will not be deleted
                  </p>
                </div>
                <Switch
                  id="excludeStarred"
                  checked={formData.excludeStarredMessages}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      excludeStarredMessages: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Policy Enabled</Label>
                  <p className="text-xs text-muted-foreground">
                    Disabled policies will not delete data
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enabled: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              {editingPolicy ? "Update Policy" : "Create Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
