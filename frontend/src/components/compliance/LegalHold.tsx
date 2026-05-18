"use client";

import { useState } from "react";
import {
  Lock,
  Unlock,
  Plus,
  Users,
  Hash,
  Calendar,
  AlertTriangle,
  FileText,
  Bell,
  Edit2,
  Trash2,
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useComplianceStore } from "@/stores/compliance-store";
import type { LegalHold as LegalHoldType } from "@/lib/compliance/compliance-types";
import {
  createLegalHold,
  validateLegalHold,
  getHoldStatusInfo,
  calculateLegalHoldStatistics,
} from "@/lib/compliance/legal-hold";

interface HoldFormData {
  name: string;
  matterName: string;
  matterNumber: string;
  description: string;
  custodians: string;
  channels: string;
  preserveMessages: boolean;
  preserveFiles: boolean;
  preserveAuditLogs: boolean;
  notifyCustodians: boolean;
  notes: string;
}

const initialFormData: HoldFormData = {
  name: "",
  matterName: "",
  matterNumber: "",
  description: "",
  custodians: "",
  channels: "",
  preserveMessages: true,
  preserveFiles: true,
  preserveAuditLogs: true,
  notifyCustodians: true,
  notes: "",
};

interface HoldCardProps {
  hold: LegalHoldType;
  onRelease: (id: string) => void;
  onEdit: (hold: LegalHoldType) => void;
}

function HoldCard({ hold, onRelease, onEdit }: HoldCardProps) {
  const statusInfo = getHoldStatusInfo(hold.status);

  return (
    <Card className={hold.status !== "active" ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2 ${
                hold.status === "active"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {hold.status === "active" ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">{hold.name}</CardTitle>
              <CardDescription>{hold.matterName}</CardDescription>
            </div>
          </div>
          <Badge variant={hold.status === "active" ? "default" : "secondary"}>
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hold.description && (
          <p className="text-sm text-muted-foreground">{hold.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{hold.custodians.length} custodian(s)</span>
          </div>
          {hold.channels && hold.channels.length > 0 && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span>{hold.channels.length} channel(s)</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(hold.startDate).toLocaleDateString()}</span>
          </div>
          {hold.matterNumber && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>#{hold.matterNumber}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {hold.preserveMessages && (
            <Badge variant="outline" className="text-xs">
              Messages
            </Badge>
          )}
          {hold.preserveFiles && (
            <Badge variant="outline" className="text-xs">
              Files
            </Badge>
          )}
          {hold.preserveAuditLogs && (
            <Badge variant="outline" className="text-xs">
              Audit Logs
            </Badge>
          )}
        </div>

        {hold.status === "active" && (
          <div className="flex gap-2 border-t pt-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(hold)}>
              <Edit2 className="mr-1 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-orange-600 hover:text-orange-700"
              onClick={() => onRelease(hold.id)}
            >
              <Unlock className="mr-1 h-4 w-4" />
              Release
            </Button>
          </div>
        )}

        {hold.status === "released" && hold.releasedAt && (
          <p className="border-t pt-2 text-xs text-muted-foreground">
            Released on {new Date(hold.releasedAt).toLocaleString()}
            {hold.releasedBy && ` by ${hold.releasedBy}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function LegalHold() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);
  const [selectedHoldId, setSelectedHoldId] = useState<string | null>(null);
  const [editingHold, setEditingHold] = useState<LegalHoldType | null>(null);
  const [formData, setFormData] = useState<HoldFormData>(initialFormData);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("active");

  const { legalHolds, addLegalHold, updateLegalHold, releaseLegalHold } =
    useComplianceStore();

  const stats = calculateLegalHoldStatistics(legalHolds);
  const activeHolds = legalHolds.filter((h) => h.status === "active");
  const releasedHolds = legalHolds.filter((h) => h.status === "released");

  const handleOpenDialog = (hold?: LegalHoldType) => {
    if (hold) {
      setEditingHold(hold);
      setFormData({
        name: hold.name,
        matterName: hold.matterName,
        matterNumber: hold.matterNumber || "",
        description: hold.description || "",
        custodians: hold.custodians.join(", "),
        channels: hold.channels?.join(", ") || "",
        preserveMessages: hold.preserveMessages,
        preserveFiles: hold.preserveFiles,
        preserveAuditLogs: hold.preserveAuditLogs,
        notifyCustodians: hold.notifyCustodians,
        notes: hold.notes || "",
      });
    } else {
      setEditingHold(null);
      setFormData(initialFormData);
    }
    setValidationErrors([]);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingHold(null);
    setFormData(initialFormData);
    setValidationErrors([]);
  };

  const handleSave = () => {
    const custodians = formData.custodians
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const channels = formData.channels
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const holdData = {
      name: formData.name,
      matterName: formData.matterName,
      matterNumber: formData.matterNumber || undefined,
      description: formData.description || undefined,
      custodians,
      channels: channels.length > 0 ? channels : undefined,
      preserveMessages: formData.preserveMessages,
      preserveFiles: formData.preserveFiles,
      preserveAuditLogs: formData.preserveAuditLogs,
      notifyCustodians: formData.notifyCustodians,
      notes: formData.notes || undefined,
    };

    const validation = validateLegalHold(holdData);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    if (editingHold) {
      updateLegalHold(editingHold.id, holdData);
    } else {
      const newHold = createLegalHold("admin-user", holdData);
      addLegalHold(newHold);
    }

    handleCloseDialog();
  };

  const handleReleaseClick = (id: string) => {
    setSelectedHoldId(id);
    setIsReleaseDialogOpen(true);
  };

  const handleReleaseConfirm = () => {
    if (selectedHoldId) {
      releaseLegalHold(selectedHoldId, "admin-user");
    }
    setIsReleaseDialogOpen(false);
    setSelectedHoldId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Lock className="h-6 w-6" />
            Legal Holds
          </h2>
          <p className="text-muted-foreground">
            Manage data preservation for litigation and eDiscovery
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Legal Hold
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.activeHolds}</div>
            <p className="text-sm text-muted-foreground">Active Holds</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.uniqueCustodians}</div>
            <p className="text-sm text-muted-foreground">Custodians</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalChannels}</div>
            <p className="text-sm text-muted-foreground">Channels</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.averageDuration}</div>
            <p className="text-sm text-muted-foreground">Avg Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeHolds.length})
          </TabsTrigger>
          <TabsTrigger value="released">
            Released ({releasedHolds.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeHolds.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Lock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No Active Legal Holds</h3>
                <p className="mt-1 text-muted-foreground">
                  Create a legal hold to preserve data for litigation
                </p>
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Legal Hold
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeHolds.map((hold) => (
                <HoldCard
                  key={hold.id}
                  hold={hold}
                  onRelease={handleReleaseClick}
                  onEdit={handleOpenDialog}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="released" className="space-y-4">
          {releasedHolds.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Unlock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No Released Holds</h3>
                <p className="mt-1 text-muted-foreground">
                  Released legal holds will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {releasedHolds.map((hold) => (
                <HoldCard
                  key={hold.id}
                  hold={hold}
                  onRelease={handleReleaseClick}
                  onEdit={handleOpenDialog}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingHold ? "Edit Legal Hold" : "Create Legal Hold"}
            </DialogTitle>
            <DialogDescription>
              Configure data preservation for litigation or investigation
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Hold Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Q4 2024 Investigation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matterNumber">Matter Number</Label>
                <Input
                  id="matterNumber"
                  value={formData.matterNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, matterNumber: e.target.value })
                  }
                  placeholder="e.g., 2024-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="matterName">Matter Name *</Label>
              <Input
                id="matterName"
                value={formData.matterName}
                onChange={(e) =>
                  setFormData({ ...formData, matterName: e.target.value })
                }
                placeholder="e.g., Smith v. Company"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the legal matter..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custodians">Custodians (User IDs) *</Label>
              <Input
                id="custodians"
                value={formData.custodians}
                onChange={(e) =>
                  setFormData({ ...formData, custodians: e.target.value })
                }
                placeholder="user-1, user-2, user-3"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of user IDs
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channels">Channels (Optional)</Label>
              <Input
                id="channels"
                value={formData.channels}
                onChange={(e) =>
                  setFormData({ ...formData, channels: e.target.value })
                }
                placeholder="channel-1, channel-2"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to apply to all channels
              </p>
            </div>

            <div className="space-y-3 border-t pt-2">
              <Label className="text-base">Preserve Data</Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="preserveMessages" className="font-normal">
                  Messages
                </Label>
                <Switch
                  id="preserveMessages"
                  checked={formData.preserveMessages}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, preserveMessages: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="preserveFiles" className="font-normal">
                  Files & Attachments
                </Label>
                <Switch
                  id="preserveFiles"
                  checked={formData.preserveFiles}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, preserveFiles: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="preserveAuditLogs" className="font-normal">
                  Audit Logs
                </Label>
                <Switch
                  id="preserveAuditLogs"
                  checked={formData.preserveAuditLogs}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, preserveAuditLogs: checked })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-2">
              <div>
                <Label htmlFor="notifyCustodians">Notify Custodians</Label>
                <p className="text-xs text-muted-foreground">
                  Send email notification to all custodians
                </p>
              </div>
              <Switch
                id="notifyCustodians"
                checked={formData.notifyCustodians}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, notifyCustodians: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Internal notes about this hold..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingHold ? "Update Hold" : "Create Hold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Confirmation Dialog */}
      <AlertDialog
        open={isReleaseDialogOpen}
        onOpenChange={setIsReleaseDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              Release Legal Hold
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to release this legal hold? Data will no
              longer be protected from deletion by retention policies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReleaseConfirm}>
              Release Hold
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
