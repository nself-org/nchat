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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminUser } from "@/lib/admin/admin-store";

interface BanUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onBan: (
    userId: string,
    reason: string,
    duration?: string,
    notifyUser?: boolean,
  ) => Promise<void>;
  isLoading?: boolean;
}

type BanDuration = "permanent" | "1h" | "24h" | "7d" | "30d" | "custom";

const durationOptions: { value: BanDuration; label: string }[] = [
  { value: "permanent", label: "Permanent" },
  { value: "1h", label: "1 Hour" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "custom", label: "Custom" },
];

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

function calculateBanExpiry(
  duration: BanDuration,
  customDays?: number,
): string | undefined {
  if (duration === "permanent") return undefined;

  const now = new Date();
  let expiryDate: Date;

  switch (duration) {
    case "1h":
      expiryDate = new Date(now.getTime() + 60 * 60 * 1000);
      break;
    case "24h":
      expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
    case "7d":
      expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      break;
    case "custom":
      expiryDate = new Date(
        now.getTime() + (customDays ?? 1) * 24 * 60 * 60 * 1000,
      );
      break;
    default:
      return undefined;
  }

  return expiryDate.toISOString();
}

export function BanUserModal({
  isOpen,
  onClose,
  user,
  onBan,
  isLoading = false,
}: BanUserModalProps) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<BanDuration>("permanent");
  const [customDays, setCustomDays] = useState<number>(1);
  const [notifyUser, setNotifyUser] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) return;

    if (!reason.trim()) {
      setError("Please provide a reason for the ban");
      return;
    }

    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters");
      return;
    }

    try {
      const expiryDate = calculateBanExpiry(duration, customDays);
      await onBan(user.id, reason.trim(), expiryDate, notifyUser);
      handleClose();
    } catch (err) {
      setError("Failed to ban user. Please try again.");
    }
  };

  const handleClose = () => {
    setReason("");
    setDuration("permanent");
    setCustomDays(1);
    setNotifyUser(true);
    setError(null);
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="h-5 w-5" />
            Ban User
          </DialogTitle>
          <DialogDescription>
            This will prevent the user from accessing the platform.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* User Info */}
          <div className="bg-muted/50 mb-6 flex items-center gap-3 rounded-lg border p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
              <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user.displayName}</div>
              <div className="text-sm text-muted-foreground">
                @{user.username}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Explain why this user is being banned..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                This reason will be logged and may be shown to the user.
              </p>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Ban Duration</Label>
              <Select
                value={duration}
                onValueChange={(v) => setDuration(v as BanDuration)}
              >
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Duration */}
            {duration === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customDays">Number of Days</Label>
                <Input
                  id="customDays"
                  type="number"
                  min={1}
                  max={365}
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                />
              </div>
            )}

            {/* Notify User */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifyUser">Notify User</Label>
                <p className="text-xs text-muted-foreground">
                  Send an email notification about the ban
                </p>
              </div>
              <Switch
                id="notifyUser"
                checked={notifyUser}
                onCheckedChange={setNotifyUser}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="border-destructive/50 bg-destructive/10 flex items-center gap-2 rounded-lg border p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 rounded-lg border border-orange-500/50 bg-orange-500/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
              <div>
                <p className="font-medium text-orange-600 dark:text-orange-400">
                  Warning
                </p>
                <p className="text-muted-foreground">
                  Banning this user will immediately log them out and prevent
                  future access.
                  {duration !== "permanent" &&
                    " The ban will expire automatically."}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isLoading}>
              {isLoading ? "Banning..." : "Ban User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default BanUserModal;
