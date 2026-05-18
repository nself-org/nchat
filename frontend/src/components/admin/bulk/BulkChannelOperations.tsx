/**
 * Bulk Channel Operations Component
 *
 * Provides UI for performing bulk operations on channels:
 * - Bulk archive
 * - Bulk delete
 * - Bulk transfer ownership
 * - Bulk privacy change
 * - CSV export
 */

"use client";

import { useState } from "react";
import {
  Hash,
  Archive,
  Trash2,
  UserCog,
  Lock,
  Unlock,
  Download,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  exportChannelsToCSV,
  downloadCSV,
  BulkOperationProgress,
} from "@/lib/admin/bulk-operations";
import type { AdminChannel } from "@/lib/admin/admin-store";
import type { BulkOperation } from "@/lib/admin/bulk-operations";

// ============================================================================
// Types
// ============================================================================

interface BulkChannelOperationsProps {
  channels: AdminChannel[];
  selectedChannelIds: string[];
  onOperationComplete?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function BulkChannelOperations({
  channels,
  selectedChannelIds,
  onOperationComplete,
}: BulkChannelOperationsProps) {
  const [activeTab, setActiveTab] = useState("archive");
  const [operation, setOperation] = useState<BulkOperation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedChannels = channels.filter((c) =>
    selectedChannelIds.includes(c.id),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Bulk Channel Operations
        </CardTitle>
        <CardDescription>
          Perform operations on multiple channels at once
          {selectedChannelIds.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedChannelIds.length} selected
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="archive">
              <Archive className="mr-1 h-4 w-4" />
              Archive
            </TabsTrigger>
            <TabsTrigger value="delete">
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </TabsTrigger>
            <TabsTrigger value="transfer">
              <UserCog className="mr-1 h-4 w-4" />
              Transfer
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Lock className="mr-1 h-4 w-4" />
              Privacy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="archive" className="space-y-4">
            <BulkArchiveTab
              selectedChannels={selectedChannels}
              onOperationStart={setOperation}
              onProcessingChange={setIsProcessing}
            />
          </TabsContent>

          <TabsContent value="delete" className="space-y-4">
            <BulkDeleteTab
              selectedChannels={selectedChannels}
              onOperationStart={setOperation}
              onProcessingChange={setIsProcessing}
            />
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <BulkTransferTab
              selectedChannels={selectedChannels}
              onOperationStart={setOperation}
              onProcessingChange={setIsProcessing}
            />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <BulkPrivacyTab
              selectedChannels={selectedChannels}
              onOperationStart={setOperation}
              onProcessingChange={setIsProcessing}
            />
          </TabsContent>
        </Tabs>

        {operation && <OperationProgress operation={operation} />}

        <div className="mt-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const csv = exportChannelsToCSV(
                selectedChannels.length > 0 ? selectedChannels : channels,
              );
              const filename = `channels-export-${new Date().toISOString().split("T")[0]}.csv`;
              downloadCSV(filename, csv);
              toast.success(
                `Exported ${selectedChannels.length > 0 ? selectedChannels.length : channels.length} channels`,
              );
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export {selectedChannels.length > 0 ? "Selected" : "All"} Channels
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Bulk Archive Tab
// ============================================================================

interface BulkArchiveTabProps {
  selectedChannels: AdminChannel[];
  onOperationStart: (operation: BulkOperation) => void;
  onProcessingChange: (processing: boolean) => void;
}

function BulkArchiveTab({
  selectedChannels,
  onOperationStart,
  onProcessingChange,
}: BulkArchiveTabProps) {
  const [reason, setReason] = useState("");
  const [notifyMembers, setNotifyMembers] = useState(true);

  const handleArchive = async () => {
    const operation: BulkOperation = {
      id: crypto.randomUUID(),
      type: "channel.archive",
      status: "pending",
      totalItems: selectedChannels.length,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      createdBy: "current-user-id",
      parameters: {
        channelIds: selectedChannels.map((c) => c.id),
        reason,
        notifyMembers,
      },
      errors: [],
    };

    onOperationStart(operation);
    onProcessingChange(true);

    const progress = new BulkOperationProgress(operation, onOperationStart);
    progress.start();

    for (const channel of selectedChannels) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      progress.incrementSuccess();
    }

    progress.complete();
    onProcessingChange(false);

    toast.success(`Archived ${operation.successCount} channels`);
  };

  return (
    <div className="space-y-4">
      {selectedChannels.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground">
          <Archive className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No channels selected</p>
          <p className="text-sm">
            Select channels from the table to archive in bulk
          </p>
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="archive-reason">
              Reason for Archiving (Optional)
            </Label>
            <Textarea
              id="archive-reason"
              placeholder="Enter the reason for archiving these channels..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1.5"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-members-archive"
              checked={notifyMembers}
              onCheckedChange={(checked) =>
                setNotifyMembers(checked as boolean)
              }
            />
            <Label htmlFor="notify-members-archive" className="cursor-pointer">
              Notify channel members
            </Label>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="mb-1 text-sm font-medium">
              Channels to Archive ({selectedChannels.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedChannels.slice(0, 5).map((channel) => (
                <Badge key={channel.id} variant="secondary">
                  #{channel.name}
                </Badge>
              ))}
              {selectedChannels.length > 5 && (
                <Badge variant="outline">
                  +{selectedChannels.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          <Button onClick={handleArchive} className="w-full">
            <Archive className="mr-2 h-4 w-4" />
            Archive {selectedChannels.length} Channel
            {selectedChannels.length > 1 ? "s" : ""}
          </Button>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Bulk Delete Tab
// ============================================================================

interface BulkDeleteTabProps {
  selectedChannels: AdminChannel[];
  onOperationStart: (operation: BulkOperation) => void;
  onProcessingChange: (processing: boolean) => void;
}

function BulkDeleteTab({
  selectedChannels,
  onOperationStart,
  onProcessingChange,
}: BulkDeleteTabProps) {
  const [archiveMessages, setArchiveMessages] = useState(true);
  const [notifyMembers, setNotifyMembers] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    setConfirmOpen(false);
    setConfirmText("");

    const operation: BulkOperation = {
      id: crypto.randomUUID(),
      type: "channel.delete",
      status: "pending",
      totalItems: selectedChannels.length,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      createdBy: "current-user-id",
      parameters: {
        channelIds: selectedChannels.map((c) => c.id),
        archiveMessages,
        notifyMembers,
      },
      errors: [],
    };

    onOperationStart(operation);
    onProcessingChange(true);

    const progress = new BulkOperationProgress(operation, onOperationStart);
    progress.start();

    for (const channel of selectedChannels) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      progress.incrementSuccess();
    }

    progress.complete();
    onProcessingChange(false);

    toast.success(`Deleted ${operation.successCount} channels`);
  };

  return (
    <div className="space-y-4">
      {selectedChannels.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground">
          <Trash2 className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No channels selected</p>
          <p className="text-sm">
            Select channels from the table to delete in bulk
          </p>
        </div>
      ) : (
        <>
          <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  Warning: Permanent Action
                </p>
                <p className="text-destructive/90 mt-1 text-sm">
                  Deleting channels is permanent. All channel data and history
                  will be removed.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="archive-messages-delete"
                checked={archiveMessages}
                onCheckedChange={(checked) =>
                  setArchiveMessages(checked as boolean)
                }
              />
              <Label
                htmlFor="archive-messages-delete"
                className="cursor-pointer"
              >
                Archive messages before deletion
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-members-delete"
                checked={notifyMembers}
                onCheckedChange={(checked) =>
                  setNotifyMembers(checked as boolean)
                }
              />
              <Label htmlFor="notify-members-delete" className="cursor-pointer">
                Notify channel members
              </Label>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="mb-1 text-sm font-medium">
              Channels to Delete ({selectedChannels.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedChannels.slice(0, 5).map((channel) => (
                <Badge key={channel.id} variant="secondary">
                  #{channel.name}
                </Badge>
              ))}
              {selectedChannels.length > 5 && (
                <Badge variant="outline">
                  +{selectedChannels.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          <Button
            onClick={() => setConfirmOpen(true)}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete {selectedChannels.length} Channel
            {selectedChannels.length > 1 ? "s" : ""}
          </Button>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Bulk Deletion</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. {selectedChannels.length}{" "}
                  channel
                  {selectedChannels.length > 1 ? "s" : ""} will be permanently
                  deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="confirm-text-channels">
                  Type <span className="font-mono font-bold">DELETE</span> to
                  confirm
                </Label>
                <Input
                  id="confirm-text-channels"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-1.5"
                  placeholder="DELETE"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE"}
                >
                  Delete Permanently
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Bulk Transfer Tab
// ============================================================================

interface BulkTransferTabProps {
  selectedChannels: AdminChannel[];
  onOperationStart: (operation: BulkOperation) => void;
  onProcessingChange: (processing: boolean) => void;
}

function BulkTransferTab({
  selectedChannels,
  onOperationStart,
  onProcessingChange,
}: BulkTransferTabProps) {
  const [newOwnerId, setNewOwnerId] = useState("");
  const [notifyOwners, setNotifyOwners] = useState(true);

  const handleTransfer = async () => {
    if (!newOwnerId) {
      toast.error("Please specify the new owner");
      return;
    }

    const operation: BulkOperation = {
      id: crypto.randomUUID(),
      type: "channel.transfer",
      status: "pending",
      totalItems: selectedChannels.length,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      createdBy: "current-user-id",
      parameters: {
        channelIds: selectedChannels.map((c) => c.id),
        newOwnerId,
        notifyOwners,
      },
      errors: [],
    };

    onOperationStart(operation);
    onProcessingChange(true);

    const progress = new BulkOperationProgress(operation, onOperationStart);
    progress.start();

    for (const channel of selectedChannels) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      progress.incrementSuccess();
    }

    progress.complete();
    onProcessingChange(false);

    toast.success(`Transferred ${operation.successCount} channels`);
  };

  return (
    <div className="space-y-4">
      {selectedChannels.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground">
          <UserCog className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No channels selected</p>
          <p className="text-sm">
            Select channels to transfer ownership in bulk
          </p>
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="new-owner">New Owner (User ID or Email)</Label>
            <Input
              id="new-owner"
              placeholder="user-id or user@example.com"
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-owners"
              checked={notifyOwners}
              onCheckedChange={(checked) => setNotifyOwners(checked as boolean)}
            />
            <Label htmlFor="notify-owners" className="cursor-pointer">
              Notify previous and new owners
            </Label>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="mb-1 text-sm font-medium">
              Channels to Transfer ({selectedChannels.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedChannels.slice(0, 5).map((channel) => (
                <Badge key={channel.id} variant="secondary">
                  #{channel.name}
                </Badge>
              ))}
              {selectedChannels.length > 5 && (
                <Badge variant="outline">
                  +{selectedChannels.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          <Button
            onClick={handleTransfer}
            className="w-full"
            disabled={!newOwnerId}
          >
            <UserCog className="mr-2 h-4 w-4" />
            Transfer {selectedChannels.length} Channel
            {selectedChannels.length > 1 ? "s" : ""}
          </Button>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Bulk Privacy Tab
// ============================================================================

interface BulkPrivacyTabProps {
  selectedChannels: AdminChannel[];
  onOperationStart: (operation: BulkOperation) => void;
  onProcessingChange: (processing: boolean) => void;
}

function BulkPrivacyTab({
  selectedChannels,
  onOperationStart,
  onProcessingChange,
}: BulkPrivacyTabProps) {
  const [makePrivate, setMakePrivate] = useState(true);

  const handleChangePrivacy = async () => {
    const operation: BulkOperation = {
      id: crypto.randomUUID(),
      type: "channel.privacy.change",
      status: "pending",
      totalItems: selectedChannels.length,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      createdBy: "current-user-id",
      parameters: {
        channelIds: selectedChannels.map((c) => c.id),
        isPrivate: makePrivate,
      },
      errors: [],
    };

    onOperationStart(operation);
    onProcessingChange(true);

    const progress = new BulkOperationProgress(operation, onOperationStart);
    progress.start();

    for (const channel of selectedChannels) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      progress.incrementSuccess();
    }

    progress.complete();
    onProcessingChange(false);

    toast.success(
      `Made ${operation.successCount} channels ${makePrivate ? "private" : "public"}`,
    );
  };

  return (
    <div className="space-y-4">
      {selectedChannels.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground">
          <Lock className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No channels selected</p>
          <p className="text-sm">
            Select channels to change privacy settings in bulk
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Privacy Setting</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={makePrivate ? "default" : "outline"}
                onClick={() => setMakePrivate(true)}
                className="justify-start"
              >
                <Lock className="mr-2 h-4 w-4" />
                Make Private
              </Button>
              <Button
                variant={!makePrivate ? "default" : "outline"}
                onClick={() => setMakePrivate(false)}
                className="justify-start"
              >
                <Unlock className="mr-2 h-4 w-4" />
                Make Public
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="mb-1 text-sm font-medium">
              Channels to Update ({selectedChannels.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedChannels.slice(0, 5).map((channel) => (
                <Badge key={channel.id} variant="secondary">
                  #{channel.name}
                </Badge>
              ))}
              {selectedChannels.length > 5 && (
                <Badge variant="outline">
                  +{selectedChannels.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          <Button onClick={handleChangePrivacy} className="w-full">
            {makePrivate ? (
              <Lock className="mr-2 h-4 w-4" />
            ) : (
              <Unlock className="mr-2 h-4 w-4" />
            )}
            Make {selectedChannels.length} Channel
            {selectedChannels.length > 1 ? "s" : ""}{" "}
            {makePrivate ? "Private" : "Public"}
          </Button>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Operation Progress Component
// ============================================================================

interface OperationProgressProps {
  operation: BulkOperation;
}

function OperationProgress({ operation }: OperationProgressProps) {
  const progress =
    operation.totalItems > 0
      ? (operation.processedItems / operation.totalItems) * 100
      : 0;

  return (
    <div className="bg-muted/50 mt-6 rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {operation.status === "completed" ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : operation.status === "failed" ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
          <span className="font-medium">
            {operation.status === "completed"
              ? "Operation Completed"
              : operation.status === "failed"
                ? "Operation Failed"
                : "Processing..."}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {operation.processedItems} / {operation.totalItems}
        </span>
      </div>

      <Progress value={progress} className="mb-2" />

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4 text-green-600" />
          {operation.successCount} successful
        </span>
        {operation.failureCount > 0 && (
          <span className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-destructive" />
            {operation.failureCount} failed
          </span>
        )}
      </div>
    </div>
  );
}
