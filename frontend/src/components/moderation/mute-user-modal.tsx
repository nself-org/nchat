"use client";

/**
 * MuteUserModal - Modal for moderators to mute a user
 *
 * Allows setting mute duration and scope (specific channel or global).
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@apollo/client";
import { MUTE_USER } from "@/graphql/moderation";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  VolumeX,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  Hash,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type MuteDuration =
  | "15m"
  | "1h"
  | "4h"
  | "24h"
  | "7d"
  | "30d"
  | "permanent";

export interface MuteDurationOption {
  value: MuteDuration;
  label: string;
  description: string;
}

export interface MuteUserModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** User to mute */
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  /** Current channel (optional, for channel-specific mutes) */
  channel?: {
    id: string;
    name: string;
  };
  /** Available channels for channel-specific mutes */
  channels?: Array<{
    id: string;
    name: string;
  }>;
  /** Callback after successful mute */
  onMuted?: () => void;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MUTE_DURATIONS: MuteDurationOption[] = [
  {
    value: "15m",
    label: "15 minutes",
    description: "Short cooldown period",
  },
  {
    value: "1h",
    label: "1 hour",
    description: "One hour timeout",
  },
  {
    value: "4h",
    label: "4 hours",
    description: "Half-day timeout",
  },
  {
    value: "24h",
    label: "24 hours",
    description: "Full day timeout",
  },
  {
    value: "7d",
    label: "7 days",
    description: "Week-long mute",
  },
  {
    value: "30d",
    label: "30 days",
    description: "Month-long mute",
  },
  {
    value: "permanent",
    label: "Permanent",
    description: "Until manually unmuted",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function calculateMuteUntil(duration: MuteDuration): Date | null {
  const now = new Date();
  switch (duration) {
    case "15m":
      return new Date(now.getTime() + 15 * 60 * 1000);
    case "1h":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "4h":
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    case "24h":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case "permanent":
      return null; // No end date for permanent mutes
  }
}

// ============================================================================
// Component
// ============================================================================

export function MuteUserModal({
  open,
  onOpenChange,
  user,
  channel,
  channels = [],
  onMuted,
  className,
}: MuteUserModalProps) {
  const { user: currentUser } = useAuth();

  // Form state
  const [selectedDuration, setSelectedDuration] =
    React.useState<MuteDuration>("1h");
  const [isGlobal, setIsGlobal] = React.useState(false);
  const [selectedChannelId, setSelectedChannelId] = React.useState<string>(
    channel?.id || "",
  );
  const [reason, setReason] = React.useState("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  // GraphQL mutation
  const [muteUserMutation] = useMutation(MUTE_USER);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedDuration("1h");
      setIsGlobal(false);
      setSelectedChannelId(channel?.id || "");
      setReason("");
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  }, [open, channel?.id]);

  // Handle form submission
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!currentUser?.id) {
        setSubmitError("You must be logged in to mute users");
        return;
      }

      if (!isGlobal && !selectedChannelId) {
        setSubmitError("Please select a channel or enable global mute");
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const mutedUntil = calculateMuteUntil(selectedDuration);

        await muteUserMutation({
          variables: {
            userId: user.id,
            mutedById: currentUser.id,
            channelId: isGlobal ? null : selectedChannelId,
            reason: reason.trim() || null,
            mutedUntil: mutedUntil?.toISOString() || null,
            isGlobal,
          },
        });

        setSubmitSuccess(true);
        onMuted?.();

        // Close modal after a short delay to show success state
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to mute user";
        setSubmitError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      currentUser?.id,
      user.id,
      isGlobal,
      selectedChannelId,
      selectedDuration,
      reason,
      muteUserMutation,
      onMuted,
      onOpenChange,
    ],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-lg", className)}>
        {submitSuccess ? (
          // Success state
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <CheckCircle2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">User Muted</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              {user.displayName} has been muted{" "}
              {isGlobal
                ? "globally"
                : `in #${channels.find((c) => c.id === selectedChannelId)?.name || channel?.name}`}
              {selectedDuration !== "permanent"
                ? ` for ${MUTE_DURATIONS.find((d) => d.value === selectedDuration)?.label}`
                : " permanently"}
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <VolumeX className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                </div>
                <DialogTitle>Mute User</DialogTitle>
              </div>
              <DialogDescription>
                Prevent this user from sending messages temporarily.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* User being muted */}
              <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                  <AvatarFallback>
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{user.displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    @{user.username}
                  </p>
                </div>
              </div>

              {/* Mute scope */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Mute Scope</Label>
                <div className="space-y-3">
                  {/* Global toggle */}
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 transition-colors",
                      isGlobal
                        ? "bg-primary/5 border-primary"
                        : "bg-muted/50 border-transparent",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Global Mute</p>
                        <p className="text-xs text-muted-foreground">
                          Mute in all channels
                        </p>
                      </div>
                    </div>
                    <Switch checked={isGlobal} onCheckedChange={setIsGlobal} />
                  </div>

                  {/* Channel selector (when not global) */}
                  {!isGlobal && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="channel-select"
                        className="flex items-center gap-1 text-xs text-muted-foreground"
                      >
                        <Hash className="h-3 w-3" />
                        Or select a specific channel
                      </Label>
                      <Select
                        value={selectedChannelId}
                        onValueChange={setSelectedChannelId}
                      >
                        <SelectTrigger id="channel-select">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channel && (
                            <SelectItem value={channel.id}>
                              # {channel.name} (current)
                            </SelectItem>
                          )}
                          {channels
                            .filter((c) => c.id !== channel?.id)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                # {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Duration selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  Duration
                </Label>
                <RadioGroup
                  value={selectedDuration}
                  onValueChange={(value) =>
                    setSelectedDuration(value as MuteDuration)
                  }
                  className="grid grid-cols-2 gap-2"
                >
                  {MUTE_DURATIONS.map((duration) => (
                    <div
                      key={duration.value}
                      className={cn(
                        "flex cursor-pointer items-center space-x-2 rounded-lg border p-3 transition-colors",
                        selectedDuration === duration.value
                          ? "bg-primary/5 border-primary"
                          : "hover:bg-muted/50 border-transparent",
                      )}
                    >
                      <RadioGroupItem
                        value={duration.value}
                        id={`duration-${duration.value}`}
                      />
                      <Label
                        htmlFor={`duration-${duration.value}`}
                        className="flex-1 cursor-pointer"
                      >
                        <span className="text-sm font-medium">
                          {duration.label}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Reason (optional) */}
              <div className="space-y-2">
                <Label htmlFor="mute-reason" className="text-sm font-medium">
                  Reason (optional)
                </Label>
                <Textarea
                  id="mute-reason"
                  placeholder="Enter reason for muting this user..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={200}
                  className="resize-none"
                />
                <p className="text-right text-xs text-muted-foreground">
                  {reason.length}/200
                </p>
              </div>

              {/* Error message */}
              {submitError && (
                <div className="bg-destructive/10 flex items-center gap-2 rounded-lg p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {submitError}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                className="bg-amber-600 hover:bg-amber-700"
                disabled={isSubmitting || (!isGlobal && !selectedChannelId)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Muting...
                  </>
                ) : (
                  <>
                    <VolumeX className="mr-2 h-4 w-4" />
                    Mute User
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default MuteUserModal;
