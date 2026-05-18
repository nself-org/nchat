/**
 * Bulk User Operations Component
 *
 * Provides UI for performing bulk operations on users:
 * - Bulk invite
 * - Bulk suspend
 * - Bulk delete
 * - Bulk role assignment
 * - CSV import/export
 */

"use client";

import { useState } from "react";
import {
  Users,
  Upload,
  Download,
  UserPlus,
  UserX,
  Trash2,
  Shield,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
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
import { toast } from "sonner";
import {
  parseEmailList,
  validateEmails,
  exportUsersToCSV,
  downloadCSV,
  parseCSV,
  BulkOperationProgress,
} from "@/lib/admin/bulk-operations";
import type { AdminUser } from "@/lib/admin/admin-store";
import type { BulkOperation } from "@/lib/admin/bulk-operations";

// ============================================================================
// Types
// ============================================================================

interface BulkUserOperationsProps {
  users: AdminUser[];
  selectedUserIds: string[];
  onOperationComplete?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function BulkUserOperations({
  users,
  selectedUserIds,
  onOperationComplete,
}: BulkUserOperationsProps) {
  const [activeTab, setActiveTab] = useState("invite");
  const [operation, setOperation] = useState<BulkOperation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Bulk User Operations
        </CardTitle>
        <CardDescription>
          Perform operations on multiple users at once
          {selectedUserIds.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedUserIds.length} selected
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="invite">
              <UserPlus className="mr-1 h-4 w-4" />
              Invite
            </TabsTrigger>
            <TabsTrigger value="suspend">
              <UserX className="mr-1 h-4 w-4" />
              Suspend
            </TabsTrigger>
            <TabsTrigger value="delete">
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Shield className="mr-1 h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="import-export">
              <FileText className="mr-1 h-4 w-4" />
              Import/Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4">
            <BulkInviteTab
              onOperationStart={setOperation}
              onProcessingChange={setIsProcessing}
            />
          </TabsContent>

          <TabsContent value="suspend" className="space-y-4">
            <BulkSuspendTab
              selectedUsers={selectedUsers}
              onOperationStart={setOperation}
              onProcessingChange={setIsProcessing}
            />
          </TabsContent>

          <TabsContent value="delete" className="space-y-4">
            <BulkDeleteTab
              selectedUsers={selectedUsers}
              onOperationStart={setOperation}
              onProcessingChange={setIsProcessing}
            />
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <BulkRoleAssignTab
              selectedUsers={selectedUsers}
              onOperationStart={setOperation}
              onProcessingChange={setIsProcessing}
            />
          </TabsContent>

          <TabsContent value="import-export" className="space-y-4">
            <ImportExportTab users={users} selectedUsers={selectedUsers} />
          </TabsContent>
        </Tabs>

        {operation && <OperationProgress operation={operation} />}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Bulk Invite Tab
// ============================================================================

interface BulkInviteTabProps {
  onOperationStart: (operation: BulkOperation) => void;
  onProcessingChange: (processing: boolean) => void;
}

function BulkInviteTab({
  onOperationStart,
  onProcessingChange,
}: BulkInviteTabProps) {
  const [emailList, setEmailList] = useState("");
  const [roleId, setRoleId] = useState("member");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [customMessage, setCustomMessage] = useState("");

  const handleInvite = async () => {
    const emails = parseEmailList(emailList);
    const { valid, invalid } = validateEmails(emails);

    if (invalid.length > 0) {
      toast.error(`${invalid.length} invalid email(s) found`, {
        description:
          invalid.slice(0, 3).join(", ") + (invalid.length > 3 ? "..." : ""),
      });
      return;
    }

    if (valid.length === 0) {
      toast.error("No valid emails provided");
      return;
    }

    const operation: BulkOperation = {
      id: crypto.randomUUID(),
      type: "user.invite",
      status: "pending",
      totalItems: valid.length,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      createdBy: "current-user-id",
      parameters: { emails: valid, roleId, sendWelcomeEmail, customMessage },
      errors: [],
    };

    onOperationStart(operation);
    onProcessingChange(true);

    // Simulate bulk invite operation
    const progress = new BulkOperationProgress(operation, onOperationStart);
    progress.start();

    for (const email of valid) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Simulate success/failure
      if (Math.random() > 0.1) {
        progress.incrementSuccess();
      } else {
        progress.incrementFailure(
          email,
          email,
          "Failed to send invitation email",
        );
      }
    }

    progress.complete();
    onProcessingChange(false);

    toast.success(`Invited ${operation.successCount} users`, {
      description:
        operation.failureCount > 0
          ? `${operation.failureCount} failed`
          : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email-list">Email Addresses</Label>
        <Textarea
          id="email-list"
          placeholder="Enter email addresses (one per line, or comma-separated)"
          value={emailList}
          onChange={(e) => setEmailList(e.target.value)}
          rows={6}
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Separate emails with newlines, commas, or semicolons
        </p>
      </div>

      <div>
        <Label htmlFor="role">Default Role</Label>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger id="role" className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="welcome-email"
          checked={sendWelcomeEmail}
          onCheckedChange={(checked) => setSendWelcomeEmail(checked as boolean)}
        />
        <Label htmlFor="welcome-email" className="cursor-pointer">
          Send welcome email
        </Label>
      </div>

      {sendWelcomeEmail && (
        <div>
          <Label htmlFor="custom-message">
            Custom Welcome Message (Optional)
          </Label>
          <Textarea
            id="custom-message"
            placeholder="Add a personal message to the welcome email..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={3}
            className="mt-1.5"
          />
        </div>
      )}

      <Button onClick={handleInvite} className="w-full">
        <UserPlus className="mr-2 h-4 w-4" />
        Send Invitations
      </Button>
    </div>
  );
}

// ============================================================================
// Bulk Suspend Tab
// ============================================================================

interface BulkSuspendTabProps {
  selectedUsers: AdminUser[];
  onOperationStart: (operation: BulkOperation) => void;
  onProcessingChange: (processing: boolean) => void;
}

function BulkSuspendTab({
  selectedUsers,
  onOperationStart,
  onProcessingChange,
}: BulkSuspendTabProps) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<"7" | "30" | "90" | "permanent">(
    "30",
  );
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSuspend = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for suspension");
      return;
    }

    setConfirmOpen(false);

    const operation: BulkOperation = {
      id: crypto.randomUUID(),
      type: "user.suspend",
      status: "pending",
      totalItems: selectedUsers.length,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      createdBy: "current-user-id",
      parameters: {
        userIds: selectedUsers.map((u) => u.id),
        reason,
        duration: duration === "permanent" ? undefined : parseInt(duration),
        notifyUsers,
      },
      errors: [],
    };

    onOperationStart(operation);
    onProcessingChange(true);

    // Simulate suspension
    const progress = new BulkOperationProgress(operation, onOperationStart);
    progress.start();

    for (const user of selectedUsers) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      progress.incrementSuccess();
    }

    progress.complete();
    onProcessingChange(false);

    toast.success(`Suspended ${operation.successCount} users`);
  };

  return (
    <div className="space-y-4">
      {selectedUsers.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground">
          <UserX className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No users selected</p>
          <p className="text-sm">
            Select users from the table to perform bulk suspension
          </p>
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="suspend-reason">Reason for Suspension</Label>
            <Textarea
              id="suspend-reason"
              placeholder="Enter the reason for suspending these accounts..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="duration">Suspension Duration</Label>
            <Select
              value={duration}
              onValueChange={(v) => setDuration(v as typeof duration)}
            >
              <SelectTrigger id="duration" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-suspended"
              checked={notifyUsers}
              onCheckedChange={(checked) => setNotifyUsers(checked as boolean)}
            />
            <Label htmlFor="notify-suspended" className="cursor-pointer">
              Notify users about suspension
            </Label>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="mb-1 text-sm font-medium">
              Selected Users ({selectedUsers.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedUsers.slice(0, 5).map((user) => (
                <Badge key={user.id} variant="secondary">
                  {user.displayName}
                </Badge>
              ))}
              {selectedUsers.length > 5 && (
                <Badge variant="outline">
                  +{selectedUsers.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          <Button
            onClick={() => setConfirmOpen(true)}
            variant="destructive"
            className="w-full"
          >
            <UserX className="mr-2 h-4 w-4" />
            Suspend {selectedUsers.length} User
            {selectedUsers.length > 1 ? "s" : ""}
          </Button>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Bulk Suspension</DialogTitle>
                <DialogDescription>
                  Are you sure you want to suspend {selectedUsers.length} user
                  {selectedUsers.length > 1 ? "s" : ""}?
                  {duration === "permanent"
                    ? " This will be a permanent suspension."
                    : ` They will be suspended for ${duration} days.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleSuspend}>
                  Confirm Suspension
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
// Bulk Delete Tab
// ============================================================================

interface BulkDeleteTabProps {
  selectedUsers: AdminUser[];
  onOperationStart: (operation: BulkOperation) => void;
  onProcessingChange: (processing: boolean) => void;
}

function BulkDeleteTab({
  selectedUsers,
  onOperationStart,
  onProcessingChange,
}: BulkDeleteTabProps) {
  const [deleteMessages, setDeleteMessages] = useState(false);
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
      type: "user.delete",
      status: "pending",
      totalItems: selectedUsers.length,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      createdBy: "current-user-id",
      parameters: {
        userIds: selectedUsers.map((u) => u.id),
        deleteMessages,
      },
      errors: [],
    };

    onOperationStart(operation);
    onProcessingChange(true);

    // Simulate deletion
    const progress = new BulkOperationProgress(operation, onOperationStart);
    progress.start();

    for (const user of selectedUsers) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      progress.incrementSuccess();
    }

    progress.complete();
    onProcessingChange(false);

    toast.success(`Deleted ${operation.successCount} users`);
  };

  return (
    <div className="space-y-4">
      {selectedUsers.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground">
          <Trash2 className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No users selected</p>
          <p className="text-sm">
            Select users from the table to perform bulk deletion
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
                  Deleting users is permanent and cannot be undone. User
                  accounts, profiles, and associated data will be permanently
                  removed.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-messages"
              checked={deleteMessages}
              onCheckedChange={(checked) =>
                setDeleteMessages(checked as boolean)
              }
            />
            <Label htmlFor="delete-messages" className="cursor-pointer">
              Also delete all messages from these users
            </Label>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="mb-1 text-sm font-medium">
              Users to Delete ({selectedUsers.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedUsers.slice(0, 5).map((user) => (
                <Badge key={user.id} variant="secondary">
                  {user.displayName}
                </Badge>
              ))}
              {selectedUsers.length > 5 && (
                <Badge variant="outline">
                  +{selectedUsers.length - 5} more
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
            Delete {selectedUsers.length} User
            {selectedUsers.length > 1 ? "s" : ""}
          </Button>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Bulk Deletion</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. {selectedUsers.length} user
                  account
                  {selectedUsers.length > 1 ? "s" : ""} will be permanently
                  deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="confirm-text">
                  Type <span className="font-mono font-bold">DELETE</span> to
                  confirm
                </Label>
                <Input
                  id="confirm-text"
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
// Bulk Role Assignment Tab
// ============================================================================

interface BulkRoleAssignTabProps {
  selectedUsers: AdminUser[];
  onOperationStart: (operation: BulkOperation) => void;
  onProcessingChange: (processing: boolean) => void;
}

function BulkRoleAssignTab({
  selectedUsers,
  onOperationStart,
  onProcessingChange,
}: BulkRoleAssignTabProps) {
  const [roleId, setRoleId] = useState("member");
  const [notify, setNotify] = useState(true);

  const handleAssignRole = async () => {
    const operation: BulkOperation = {
      id: crypto.randomUUID(),
      type: "user.role.assign",
      status: "pending",
      totalItems: selectedUsers.length,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      createdBy: "current-user-id",
      parameters: {
        userIds: selectedUsers.map((u) => u.id),
        roleId,
        notify,
      },
      errors: [],
    };

    onOperationStart(operation);
    onProcessingChange(true);

    // Simulate role assignment
    const progress = new BulkOperationProgress(operation, onOperationStart);
    progress.start();

    for (const user of selectedUsers) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      progress.incrementSuccess();
    }

    progress.complete();
    onProcessingChange(false);

    toast.success(`Updated roles for ${operation.successCount} users`);
  };

  return (
    <div className="space-y-4">
      {selectedUsers.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground">
          <Shield className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No users selected</p>
          <p className="text-sm">
            Select users from the table to assign roles in bulk
          </p>
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="bulk-role">Assign Role</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="bulk-role" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-role-change"
              checked={notify}
              onCheckedChange={(checked) => setNotify(checked as boolean)}
            />
            <Label htmlFor="notify-role-change" className="cursor-pointer">
              Notify users about role change
            </Label>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="mb-1 text-sm font-medium">
              Selected Users ({selectedUsers.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedUsers.slice(0, 5).map((user) => (
                <Badge key={user.id} variant="secondary">
                  {user.displayName}
                </Badge>
              ))}
              {selectedUsers.length > 5 && (
                <Badge variant="outline">
                  +{selectedUsers.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          <Button onClick={handleAssignRole} className="w-full">
            <Shield className="mr-2 h-4 w-4" />
            Assign Role to {selectedUsers.length} User
            {selectedUsers.length > 1 ? "s" : ""}
          </Button>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Import/Export Tab
// ============================================================================

interface ImportExportTabProps {
  users: AdminUser[];
  selectedUsers: AdminUser[];
}

function ImportExportTab({ users, selectedUsers }: ImportExportTabProps) {
  const handleExportSelected = () => {
    const usersToExport = selectedUsers.length > 0 ? selectedUsers : users;
    const csv = exportUsersToCSV(usersToExport);
    const filename = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(filename, csv);
    toast.success(`Exported ${usersToExport.length} users to CSV`);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const data = parseCSV(text);

    // Validate and process import
    toast.success(`Ready to import ${data.length} users`);
    // In production, this would trigger the actual import process
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" />
              Export Users
            </CardTitle>
            <CardDescription>Download user data as CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportSelected} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export{" "}
              {selectedUsers.length > 0
                ? `${selectedUsers.length} Selected`
                : "All"}{" "}
              Users
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              Import Users
            </CardTitle>
            <CardDescription>Upload CSV file to import users</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
            />
          </CardContent>
        </Card>
      </div>
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
