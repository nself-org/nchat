"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Switch } from "@/components/ui/switch";
import { useUserManagementStore } from "@/stores/user-management-store";
import { getUserInitials } from "@/lib/admin/users/user-manager";
import {
  BAN_DURATION_OPTIONS,
  BAN_REASON_PRESETS,
} from "@/lib/admin/users/user-ban";
import type { AdminUser, BanType } from "@/lib/admin/users/user-types";

interface BanUserModalProps {
  open: boolean;
  user: AdminUser | null;
  onClose: () => void;
  onBanned?: () => void;
}

export function BanUserModal({
  open,
  user,
  onClose,
  onBanned,
}: BanUserModalProps) {
  const [banType, setBanType] = useState<BanType>("temporary");
  const [duration, setDuration] = useState("7d");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");
  const [notifyUser, setNotifyUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { updateUserInList } = useUserManagementStore();

  const isBanned = user?.isBanned;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newErrors: Record<string, string> = {};
    const finalReason = reason === "Other" ? customReason : reason;

    if (!isBanned && !finalReason) {
      newErrors.reason = "Please select or provide a reason";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // In production, call the API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (isBanned) {
        // Unbanning
        updateUserInList(user.id, {
          isBanned: false,
          bannedAt: undefined,
          bannedUntil: undefined,
          banReason: undefined,
        });
      } else {
        // Banning
        const bannedUntil =
          banType === "permanent" || duration === "permanent"
            ? undefined
            : new Date(Date.now() + parseDuration(duration)).toISOString();

        updateUserInList(user.id, {
          isBanned: true,
          bannedAt: new Date().toISOString(),
          bannedUntil,
          banReason: finalReason,
        });
      }

      onBanned?.();
      handleClose();
    } catch (error) {
      setErrors({ submit: "Failed to process ban action. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setBanType("temporary");
    setDuration("7d");
    setReason("");
    setCustomReason("");
    setNotes("");
    setNotifyUser(true);
    setErrors({});
    onClose();
  };

  const parseDuration = (d: string): number => {
    const match = d.match(/^(\d+)(h|d)$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    const value = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === "h") return value * 60 * 60 * 1000;
    return value * 24 * 60 * 60 * 1000;
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isBanned ? "Unban User" : "Ban User"}</DialogTitle>
          <DialogDescription>
            {isBanned
              ? "Remove the ban from this user account"
              : "Temporarily or permanently ban this user from the workspace"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* User Info */}
          <div className="flex items-center gap-3 py-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
              <AvatarFallback>
                {getUserInitials(user.displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.displayName}</p>
              <p className="text-sm text-muted-foreground">
                @{user.username} &middot; {user.email}
              </p>
            </div>
          </div>

          {isBanned ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <p className="text-sm">
                  <strong>Currently banned</strong>
                </p>
                {user.banReason && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reason: {user.banReason}
                  </p>
                )}
                {user.bannedUntil && (
                  <p className="text-sm text-muted-foreground">
                    Until: {new Date(user.bannedUntil).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="notify-unban"
                  checked={notifyUser}
                  onCheckedChange={setNotifyUser}
                />
                <Label htmlFor="notify-unban">Notify user of unban</Label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Ban Type */}
              <div className="space-y-2">
                <Label>Ban Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="banType"
                      value="temporary"
                      checked={banType === "temporary"}
                      onChange={(e) => setBanType(e.target.value as BanType)}
                      className="h-4 w-4"
                    />
                    Temporary
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="banType"
                      value="permanent"
                      checked={banType === "permanent"}
                      onChange={(e) => setBanType(e.target.value as BanType)}
                      className="h-4 w-4"
                    />
                    Permanent
                  </label>
                </div>
              </div>

              {/* Duration (for temporary bans) */}
              {banType === "temporary" && (
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger id="duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {BAN_DURATION_OPTIONS.filter(
                        (d) => d.value !== "permanent",
                      ).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger
                    id="reason"
                    className={errors.reason ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {BAN_REASON_PRESETS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.reason && (
                  <p className="text-sm text-red-500">{errors.reason}</p>
                )}
              </div>

              {/* Custom Reason */}
              {reason === "Other" && (
                <div className="space-y-2">
                  <Label htmlFor="custom-reason">Custom Reason</Label>
                  <Input
                    id="custom-reason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter custom reason..."
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes about this ban..."
                  rows={2}
                />
              </div>

              {/* Notify User */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="notify-ban"
                  checked={notifyUser}
                  onCheckedChange={setNotifyUser}
                />
                <Label htmlFor="notify-ban">Notify user by email</Label>
              </div>
            </div>
          )}

          {errors.submit && (
            <p className="mt-4 text-sm text-red-500">{errors.submit}</p>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant={isBanned ? "default" : "destructive"}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isBanned ? "Unban User" : "Ban User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default BanUserModal;
