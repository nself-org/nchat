"use client";

/**
 * ReportMessageModal - Modal for reporting a specific message
 *
 * Shows a preview of the message and allows users to select a reason
 * for reporting it (spam, harassment, etc.).
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useReportStore,
  REPORT_REASONS,
  type ReportReason,
  type MessageInfo,
} from "@/lib/moderation/report-store";
import { useMutation } from "@apollo/client";
import { REPORT_MESSAGE } from "@/graphql/moderation";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  Flag,
  Loader2,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  Clock,
  Hash,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ReportMessageModalProps {
  /** Whether the modal is open (controlled mode) */
  open?: boolean;
  /** Callback when open state changes (controlled mode) */
  onOpenChange?: (open: boolean) => void;
  /** Message to report (optional, uses store state if not provided) */
  message?: MessageInfo;
  /** Callback after successful report submission */
  onReported?: () => void;
  /** Additional class name */
  className?: string;
}

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

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncateContent(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + "...";
}

// ============================================================================
// Message Preview Component
// ============================================================================

interface MessagePreviewProps {
  message: MessageInfo;
}

function MessagePreview({ message }: MessagePreviewProps) {
  return (
    <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
      {/* Channel info */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Hash className="h-3 w-3" />
        <span>{message.channelName}</span>
        <span className="mx-1">-</span>
        <Clock className="h-3 w-3" />
        <span>{formatTimestamp(message.createdAt)}</span>
      </div>

      {/* Message content */}
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage
            src={message.user.avatarUrl}
            alt={message.user.displayName}
          />
          <AvatarFallback className="text-xs">
            {getInitials(message.user.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {message.user.displayName}
            </span>
            <span className="text-xs text-muted-foreground">
              @{message.user.username}
            </span>
          </div>
          <p className="text-foreground/90 mt-1 whitespace-pre-wrap break-words text-sm">
            {truncateContent(message.content)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function ReportMessageModal({
  open,
  onOpenChange,
  message: propMessage,
  onReported,
  className,
}: ReportMessageModalProps) {
  const { user: currentUser } = useAuth();
  const {
    reportMessageModalOpen,
    reportMessageTarget,
    closeReportMessageModal,
    isSubmitting,
    submitError,
    submitSuccess,
    setSubmitting,
    setSubmitError,
    setSubmitSuccess,
    resetFormState,
  } = useReportStore();

  // Form state
  const [selectedReason, setSelectedReason] =
    React.useState<ReportReason | null>(null);
  const [details, setDetails] = React.useState("");

  // GraphQL mutation
  const [reportMessageMutation] = useMutation(REPORT_MESSAGE);

  // Determine target message and open state
  const targetMessage = propMessage || reportMessageTarget;
  const isOpen = open ?? reportMessageModalOpen;

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedReason(null);
      setDetails("");
      resetFormState();
    }
  }, [isOpen, resetFormState]);

  // Handle close
  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        if (onOpenChange) {
          onOpenChange(false);
        } else {
          closeReportMessageModal();
        }
      }
    },
    [onOpenChange, closeReportMessageModal],
  );

  // Handle form submission
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!targetMessage || !currentUser?.id || !selectedReason) {
        setSubmitError("Please select a reason for the report");
        return;
      }

      setSubmitting(true);
      setSubmitError(null);

      try {
        await reportMessageMutation({
          variables: {
            reporterId: currentUser.id,
            messageId: targetMessage.id,
            reason: selectedReason,
            details: details.trim() || null,
          },
        });

        setSubmitSuccess(true);
        onReported?.();

        // Close modal after a short delay to show success state
        setTimeout(() => {
          handleOpenChange(false);
        }, 2000);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to submit report";
        setSubmitError(errorMessage);
      } finally {
        setSubmitting(false);
      }
    },
    [
      targetMessage,
      currentUser?.id,
      selectedReason,
      details,
      reportMessageMutation,
      setSubmitting,
      setSubmitError,
      setSubmitSuccess,
      onReported,
      handleOpenChange,
    ],
  );

  if (!targetMessage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={cn("sm:max-w-lg", className)}>
        {submitSuccess ? (
          // Success state
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Report Submitted</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              Thank you for reporting this message. Our moderation team will
              review it and take appropriate action.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-full">
                  <MessageSquare className="h-5 w-5 text-destructive" />
                </div>
                <DialogTitle>Report Message</DialogTitle>
              </div>
              <DialogDescription>
                Help us understand why you are reporting this message.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Message preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Message</Label>
                <MessagePreview message={targetMessage} />
              </div>

              {/* Reason selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Why are you reporting this message?{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <ScrollArea className="h-[180px] pr-4">
                  <RadioGroup
                    value={selectedReason || ""}
                    onValueChange={(value) =>
                      setSelectedReason(value as ReportReason)
                    }
                  >
                    {REPORT_REASONS.map((reason) => (
                      <div
                        key={reason.value}
                        className={cn(
                          "flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors",
                          selectedReason === reason.value
                            ? "bg-primary/5 border-primary"
                            : "hover:bg-muted/50 border-transparent",
                        )}
                      >
                        <RadioGroupItem
                          value={reason.value}
                          id={`msg-${reason.value}`}
                          className="mt-0.5"
                        />
                        <Label
                          htmlFor={`msg-${reason.value}`}
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-medium">{reason.label}</span>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {reason.description}
                          </p>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </ScrollArea>
              </div>

              {/* Additional details */}
              <div className="space-y-2">
                <Label htmlFor="msg-details" className="text-sm font-medium">
                  Additional details (optional)
                </Label>
                <Textarea
                  id="msg-details"
                  placeholder="Provide any additional context..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-right text-xs text-muted-foreground">
                  {details.length}/500
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
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting || !selectedReason}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="mr-2 h-4 w-4" />
                    Submit Report
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

export default ReportMessageModal;
