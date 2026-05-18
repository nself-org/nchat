"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Role, EffectivePermissions } from "@/lib/admin/roles/role-types";
import {
  canManageRole,
  sortRolesByPosition,
} from "@/lib/admin/roles/role-hierarchy";
import { RoleBadge, RoleBadgeGroup } from "./RoleBadge";
import { MemberSelector } from "./RoleMembers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { getInitials } from "@/stores/user-store";
import {
  Users,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface BulkRoleAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  allRoles: Role[];
  editorPermissions?: EffectivePermissions | null;
  onBulkAssign: (
    userIds: string[],
    roleIds: string[],
    action: "add" | "remove" | "set",
  ) => Promise<{
    success: boolean;
    errors: Array<{ userId: string; error: string }>;
  }>;
}

/**
 * BulkRoleAssignment - Modal for bulk assigning roles to multiple users
 */
export function BulkRoleAssignment({
  open,
  onOpenChange,
  users,
  allRoles,
  editorPermissions,
  onBulkAssign,
}: BulkRoleAssignmentProps) {
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = React.useState<string[]>([]);
  const [action, setAction] = React.useState<"add" | "remove" | "set">("add");
  const [userSearchQuery, setUserSearchQuery] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<{
    success: number;
    failed: Array<{ userId: string; error: string }>;
  } | null>(null);

  // Roles the editor can manage
  const manageableRoles = React.useMemo(() => {
    if (!editorPermissions) return [];
    return sortRolesByPosition(
      allRoles.filter((role) =>
        canManageRole(editorPermissions.highestRole, role),
      ),
    );
  }, [allRoles, editorPermissions]);

  // Toggle user selection
  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  // Toggle role selection
  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  // Select all users
  const selectAllUsers = () => {
    const filteredUsers = users.filter(
      (u) =>
        !userSearchQuery ||
        u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()),
    );
    setSelectedUserIds(filteredUsers.map((u) => u.id));
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedUserIds([]);
    setSelectedRoleIds([]);
  };

  // Execute bulk operation
  const executeBulk = async () => {
    if (selectedUserIds.length === 0 || selectedRoleIds.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await onBulkAssign(
        selectedUserIds,
        selectedRoleIds,
        action,
      );

      clearInterval(progressInterval);
      setProgress(100);

      setResult({
        success: selectedUserIds.length - response.errors.length,
        failed: response.errors,
      });
    } catch (error) {
      setResult({
        success: 0,
        failed: selectedUserIds.map((id) => ({
          userId: id,
          error: "Unexpected error",
        })),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setSelectedUserIds([]);
      setSelectedRoleIds([]);
      setAction("add");
      setUserSearchQuery("");
      setIsProcessing(false);
      setProgress(0);
      setResult(null);
    }
  }, [open]);

  // Get user by id
  const getUserById = (id: string) => users.find((u) => u.id === id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={20} />
            Bulk Role Assignment
          </DialogTitle>
          <DialogDescription>
            Assign or remove roles for multiple users at once
          </DialogDescription>
        </DialogHeader>

        {/* Result view */}
        {result ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-4 rounded-lg border p-6">
              {result.failed.length === 0 ? (
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              ) : result.success === 0 ? (
                <XCircle className="h-12 w-12 text-red-500" />
              ) : (
                <AlertCircle className="h-12 w-12 text-amber-500" />
              )}
              <div>
                <h3 className="text-lg font-medium">
                  {result.failed.length === 0
                    ? "All operations completed successfully"
                    : result.success === 0
                      ? "All operations failed"
                      : "Operation completed with some errors"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {result.success} succeeded, {result.failed.length} failed
                </p>
              </div>
            </div>

            {/* Error details */}
            {result.failed.length > 0 && (
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {result.failed.map((failure) => {
                    const user = getUserById(failure.userId);
                    return (
                      <div
                        key={failure.userId}
                        className="border-destructive/30 bg-destructive/10 flex items-center gap-3 rounded border p-2"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.avatarUrl} />
                          <AvatarFallback>
                            {getInitials(user?.displayName || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {user?.displayName || failure.userId}
                          </div>
                          <div className="text-xs text-destructive">
                            {failure.error}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col space-y-4 overflow-hidden">
            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {!isProcessing && (
              <>
                {/* Action selector */}
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={action}
                    onValueChange={(v) => setAction(v as typeof action)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add roles to users</SelectItem>
                      <SelectItem value="remove">
                        Remove roles from users
                      </SelectItem>
                      <SelectItem value="set">
                        Set exact roles (replace all)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid flex-1 grid-cols-2 gap-4 overflow-hidden">
                  {/* User selection */}
                  <div className="flex flex-col space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <Label>
                        Select Users ({selectedUserIds.length}/{users.length})
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllUsers}
                      >
                        Select All
                      </Button>
                    </div>
                    <MemberSelector
                      availableUsers={users}
                      selectedUserIds={selectedUserIds}
                      onSelect={toggleUser}
                      onDeselect={toggleUser}
                      searchQuery={userSearchQuery}
                      onSearchChange={setUserSearchQuery}
                      className="flex-1 overflow-hidden"
                    />
                  </div>

                  {/* Role selection */}
                  <div className="flex flex-col space-y-2 overflow-hidden">
                    <Label>
                      Select Roles ({selectedRoleIds.length}/
                      {manageableRoles.length})
                    </Label>
                    <ScrollArea className="flex-1 rounded-md border p-2">
                      <div className="space-y-1">
                        {manageableRoles.map((role) => {
                          const isSelected = selectedRoleIds.includes(role.id);
                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => toggleRole(role.id)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors",
                                isSelected
                                  ? "bg-primary/10"
                                  : "hover:bg-accent",
                              )}
                            >
                              <Checkbox checked={isSelected} />
                              <RoleBadge
                                name={role.name}
                                color={role.color}
                                size="sm"
                                showIcon={false}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg border p-3 text-sm">
                  <strong>
                    {action === "add"
                      ? "Add"
                      : action === "remove"
                        ? "Remove"
                        : "Set"}{" "}
                  </strong>
                  {selectedRoleIds.length} role
                  {selectedRoleIds.length !== 1 ? "s" : ""}{" "}
                  {action === "add"
                    ? "to"
                    : action === "remove"
                      ? "from"
                      : "for"}{" "}
                  <strong>{selectedUserIds.length}</strong> user
                  {selectedUserIds.length !== 1 ? "s" : ""}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={executeBulk}
                disabled={
                  isProcessing ||
                  selectedUserIds.length === 0 ||
                  selectedRoleIds.length === 0
                }
              >
                {isProcessing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isProcessing ? "Processing..." : "Apply Changes"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkRoleAssignment;
