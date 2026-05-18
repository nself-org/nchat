"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Download,
  Trash2,
  Crown,
  Loader2,
  Database,
  Files,
  Users as UsersIcon,
  Settings,
  CheckCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { useTeamStore } from "@/stores/team-store";
import { teamManager } from "@/lib/team/team-manager";
import type { TeamMember } from "@/lib/team/team-types";

import { logger } from "@/lib/logger";

interface TeamDangerZoneProps {
  teamId: string;
}

export function TeamDangerZone({ teamId }: TeamDangerZoneProps) {
  const { team, members } = useTeamStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Danger Zone</h1>
        <p className="text-muted-foreground">
          Irreversible and destructive actions for your workspace
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Actions in this section are permanent and cannot be undone. Please
          proceed with caution.
        </AlertDescription>
      </Alert>

      {/* Export Data */}
      <ExportDataSection teamId={teamId} teamName={team?.name || "Team"} />

      <Separator />

      {/* Transfer Ownership */}
      <TransferOwnershipSection
        teamId={teamId}
        members={members}
        currentOwner={team?.owner}
      />

      <Separator />

      {/* Delete Team */}
      <DeleteTeamSection teamId={teamId} teamName={team?.name || "Team"} />
    </div>
  );
}

// Export Data Section
function ExportDataSection({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | "zip">(
    "json",
  );
  const [includeMessages, setIncludeMessages] = useState(true);
  const [includeFiles, setIncludeFiles] = useState(true);
  const [includeUsers, setIncludeUsers] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const result = await teamManager.requestDataExport(teamId, {
        teamId,
        includeMessages,
        includeFiles,
        includeUsers,
        includeSettings,
        format: exportFormat,
      });

      if (result.success) {
        setExportSuccess(true);
        setTimeout(() => {
          setExportDialogOpen(false);
          setExportSuccess(false);
        }, 2000);
      }
    } catch (error) {
      logger.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
          <Download className="h-5 w-5" />
          Export Team Data
        </CardTitle>
        <CardDescription className="text-yellow-700 dark:text-yellow-300">
          Download a complete backup of all your team's data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export {teamName} Data</DialogTitle>
              <DialogDescription>
                Select what data you want to export and the format
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {exportSuccess && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Export started! You'll receive a download link via email
                    when complete.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select
                  value={exportFormat}
                  onValueChange={(v: any) => setExportFormat(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="zip">ZIP Archive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Include in Export</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="messages"
                      checked={includeMessages}
                      onCheckedChange={(checked) =>
                        setIncludeMessages(checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="messages"
                      className="flex items-center gap-2 font-normal"
                    >
                      <Database className="h-4 w-4" />
                      Messages and Channels
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="files"
                      checked={includeFiles}
                      onCheckedChange={(checked) =>
                        setIncludeFiles(checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="files"
                      className="flex items-center gap-2 font-normal"
                    >
                      <Files className="h-4 w-4" />
                      Uploaded Files
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="users"
                      checked={includeUsers}
                      onCheckedChange={(checked) =>
                        setIncludeUsers(checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="users"
                      className="flex items-center gap-2 font-normal"
                    >
                      <UsersIcon className="h-4 w-4" />
                      Team Members
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="settings"
                      checked={includeSettings}
                      onCheckedChange={(checked) =>
                        setIncludeSettings(checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="settings"
                      className="flex items-center gap-2 font-normal"
                    >
                      <Settings className="h-4 w-4" />
                      Team Settings
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExportDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Start Export
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Transfer Ownership Section
function TransferOwnershipSection({
  teamId,
  members,
  currentOwner,
}: {
  teamId: string;
  members: TeamMember[];
  currentOwner?: { displayName: string; email: string };
}) {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const eligibleMembers = members.filter(
    (m) => m.role === "admin" || m.role === "member",
  );

  const handleTransfer = async () => {
    if (!selectedMember || confirmationCode !== "TRANSFER") return;

    setIsTransferring(true);
    try {
      const result = await teamManager.transferOwnership(teamId, {
        newOwnerId: selectedMember,
        confirmationCode,
        notifyTeam: true,
      });

      if (result.success) {
        setTransferDialogOpen(false);
        // Redirect or show success message
      }
    } catch (error) {
      logger.error("Transfer failed:", error);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
          <Crown className="h-5 w-5" />
          Transfer Ownership
        </CardTitle>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          Transfer ownership of this team to another member
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentOwner && (
          <div className="rounded-lg border border-orange-200 bg-white p-3 dark:bg-orange-950">
            <p className="text-sm text-muted-foreground">Current Owner</p>
            <p className="font-medium">{currentOwner.displayName}</p>
            <p className="text-sm text-muted-foreground">
              {currentOwner.email}
            </p>
          </div>
        )}

        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Crown className="mr-2 h-4 w-4" />
              Transfer Ownership
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Team Ownership</DialogTitle>
              <DialogDescription>
                Transfer ownership to another team member. You will become an
                admin after the transfer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This action is irreversible. The new owner will have full
                  control of the team.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Select New Owner</Label>
                <Select
                  value={selectedMember}
                  onValueChange={setSelectedMember}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleMembers.map((member) => (
                      <SelectItem key={member.id} value={member.userId}>
                        {member.user.displayName} ({member.user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type TRANSFER to confirm</Label>
                <Input
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="TRANSFER"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTransferDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={
                  !selectedMember ||
                  confirmationCode !== "TRANSFER" ||
                  isTransferring
                }
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  "Transfer Ownership"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Delete Team Section
function DeleteTeamSection({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const [confirmationText, setConfirmationText] = useState("");
  const [exportBeforeDelete, setExportBeforeDelete] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmationText !== teamName) return;

    setIsDeleting(true);
    try {
      const result = await teamManager.deleteTeam(teamId, {
        teamId,
        reason: "User requested deletion",
        confirmationCode: teamName,
        exportData: exportBeforeDelete,
        deleteImmediately: true,
      });

      if (result.success) {
        // Redirect to a goodbye page or home
        window.location.href = "/";
      }
    } catch (error) {
      logger.error("Deletion failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="bg-destructive/5 border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Delete Team
        </CardTitle>
        <CardDescription>
          Permanently delete this team and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Team
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {teamName}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                team and remove all data including:
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="ml-4 list-disc space-y-1 text-sm">
                    <li>All messages and channels</li>
                    <li>All uploaded files and media</li>
                    <li>All team members and their data</li>
                    <li>All integrations and settings</li>
                    <li>Billing and subscription information</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="export"
                  checked={exportBeforeDelete}
                  onCheckedChange={(checked) =>
                    setExportBeforeDelete(checked as boolean)
                  }
                />
                <Label htmlFor="export" className="font-normal">
                  Export data before deletion (recommended)
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Type "{teamName}" to confirm</Label>
                <Input
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={teamName}
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmationText("")}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={confirmationText !== teamName || isDeleting}
                className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Team Permanently"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default TeamDangerZone;
