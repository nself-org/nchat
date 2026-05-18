"use client";

import { useState } from "react";
import { Ban, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface BanDialogUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  status: "active" | "inactive" | "banned";
}

interface BanDialogProps {
  user: BanDialogUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    userId: string;
    reason: string;
    duration: string;
    notifyUser: boolean;
  }) => void;
}

export function BanDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
}: BanDialogProps) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("permanent");
  const [customDuration, setCustomDuration] = useState("");
  const [notifyUser, setNotifyUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBanned = user?.status === "banned";

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        userId: user.id,
        reason,
        duration: duration === "custom" ? customDuration : duration,
        notifyUser,
      });
      onOpenChange(false);
      // Reset form
      setReason("");
      setDuration("permanent");
      setCustomDuration("");
      setNotifyUser(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setReason("");
      setDuration("permanent");
      setCustomDuration("");
      setNotifyUser(true);
    }
    onOpenChange(newOpen);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isBanned ? (
              <>
                <Ban className="h-5 w-5 text-green-600" />
                Unban User
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Ban User
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isBanned
              ? "This will remove the ban and restore access to this user."
              : "This will prevent the user from accessing the workspace."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User info */}
          <div className="bg-muted/30 flex items-center space-x-4 rounded-lg border p-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback>
                {user.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.displayName}</p>
              <p className="text-sm text-muted-foreground">
                @{user.username} - {user.email}
              </p>
            </div>
          </div>

          {!isBanned && (
            <>
              {/* Ban Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Ban Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hour</SelectItem>
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {duration === "custom" && (
                  <Input
                    placeholder="e.g., 3d, 2w, 6m"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter the reason for this ban..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Notify User */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notify"
                  checked={notifyUser}
                  onChange={(e) => setNotifyUser(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="notify" className="text-sm font-normal">
                  Send notification email to user
                </Label>
              </div>
            </>
          )}

          {isBanned && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <p>
                This user is currently banned. Unbanning will restore their
                access to the workspace with their previous role and
                permissions.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={isBanned ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={isSubmitting || (!isBanned && !reason.trim())}
          >
            {isSubmitting
              ? "Processing..."
              : isBanned
                ? "Unban User"
                : "Ban User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
