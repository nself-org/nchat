"use client";

/**
 * Moderation Action Dialog
 * Dialog for moderators to take actions on users (warn, mute, kick, ban, timeout)
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Ban,
  Clock,
  Loader2,
  LogOut,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

interface ModerationActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUserName?: string;
  moderatorId: string;
  moderatorName?: string;
  workspaceId: string;
  channelId?: string;
  onActionComplete?: () => void;
}

type ActionType = "warn" | "mute" | "kick" | "ban" | "timeout";

const DURATION_OPTIONS = [
  { value: "5m", label: "5 minutes" },
  { value: "10m", label: "10 minutes" },
  { value: "30m", label: "30 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "4h", label: "4 hours" },
  { value: "8h", label: "8 hours" },
  { value: "24h", label: "24 hours" },
  { value: "3d", label: "3 days" },
  { value: "7d", label: "7 days" },
  { value: "14d", label: "14 days" },
  { value: "30d", label: "30 days" },
  { value: "permanent", label: "Permanent" },
];

const TIMEOUT_DURATIONS = DURATION_OPTIONS.filter(
  (d) => d.value !== "permanent",
);

export function ModerationActionDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
  moderatorId,
  moderatorName,
  workspaceId,
  channelId,
  onActionComplete,
}: ModerationActionDialogProps) {
  const [action, setAction] = useState<ActionType>("warn");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("1h");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/moderation/penalties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          targetUserId,
          moderatorId,
          moderatorName,
          reason: reason.trim(),
          workspaceId,
          channelId,
          duration:
            ["mute", "ban", "timeout"].includes(action) &&
            duration !== "permanent"
              ? duration
              : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
        toast.success(`${actionLabel} action applied successfully`);

        if (data.escalated) {
          toast.info("User was auto-escalated due to repeated violations");
        }

        setReason("");
        setDuration("1h");
        onOpenChange(false);
        onActionComplete?.();
      } else {
        toast.error(data.error || "Failed to apply action");
      }
    } catch (error) {
      toast.error("Failed to apply moderation action");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionIcon = (actionType: ActionType) => {
    switch (actionType) {
      case "warn":
        return <AlertTriangle className="h-4 w-4" />;
      case "mute":
        return <VolumeX className="h-4 w-4" />;
      case "kick":
        return <LogOut className="h-4 w-4" />;
      case "ban":
        return <Ban className="h-4 w-4" />;
      case "timeout":
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionDescription = (actionType: ActionType) => {
    switch (actionType) {
      case "warn":
        return "Issue a warning to the user. Multiple warnings may result in automatic mute.";
      case "mute":
        return "Prevent the user from sending messages. Can be temporary or permanent.";
      case "kick":
        return "Remove the user from the channel. They can rejoin unless banned.";
      case "ban":
        return "Ban the user from the workspace or channel. Can be temporary or permanent.";
      case "timeout":
        return "Temporarily restrict the user from interacting for a set duration.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Moderation Action</DialogTitle>
          <DialogDescription>
            Take action against{" "}
            {targetUserName || `User ${targetUserId.slice(0, 8)}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={action}
          onValueChange={(v) => setAction(v as ActionType)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="warn" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Warn
            </TabsTrigger>
            <TabsTrigger value="mute" className="flex items-center gap-1">
              <VolumeX className="h-3 w-3" />
              Mute
            </TabsTrigger>
            <TabsTrigger value="timeout" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Timeout
            </TabsTrigger>
            <TabsTrigger value="kick" className="flex items-center gap-1">
              <LogOut className="h-3 w-3" />
              Kick
            </TabsTrigger>
            <TabsTrigger value="ban" className="flex items-center gap-1">
              <Ban className="h-3 w-3" />
              Ban
            </TabsTrigger>
          </TabsList>

          {["warn", "mute", "kick", "ban", "timeout"].map((actionType) => (
            <TabsContent
              key={actionType}
              value={actionType}
              className="mt-4 space-y-4"
            >
              <div className="rounded-md bg-muted p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {getActionIcon(actionType as ActionType)}
                  {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getActionDescription(actionType as ActionType)}
                </p>
              </div>

              {["mute", "ban", "timeout"].includes(actionType) && (
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger id="duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {(actionType === "timeout"
                        ? TIMEOUT_DURATIONS
                        : DURATION_OPTIONS
                      ).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Provide a reason for this action..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  This will be visible to the user and logged.
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            variant={action === "ban" ? "destructive" : "default"}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getActionIcon(action)}
            <span className="ml-2">
              {action.charAt(0).toUpperCase() + action.slice(1)} User
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
