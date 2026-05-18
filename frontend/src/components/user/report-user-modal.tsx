"use client";

/**
 * ReportUserModal - Modal for reporting a user
 *
 * Allows users to select a reason, provide additional details,
 * and attach evidence/screenshots for their report.
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
} from "@/lib/moderation/report-store";
import { useMutation } from "@apollo/client";
import { REPORT_USER } from "@/graphql/moderation";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  Flag,
  Loader2,
  CheckCircle2,
  Upload,
  X,
  ImageIcon,
  AlertTriangle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ReportUserModalProps {
  /** Whether the modal is open (controlled mode) */
  open?: boolean;
  /** Callback when open state changes (controlled mode) */
  onOpenChange?: (open: boolean) => void;
  /** User to report (optional, uses store state if not provided) */
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
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

// ============================================================================
// Component
// ============================================================================

export function ReportUserModal({
  open,
  onOpenChange,
  user: propUser,
  onReported,
  className,
}: ReportUserModalProps) {
  const { user: currentUser } = useAuth();
  const {
    reportUserModalOpen,
    reportUserTarget,
    closeReportUserModal,
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
  const [evidenceUrls, setEvidenceUrls] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);

  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // GraphQL mutation
  const [reportUserMutation] = useMutation(REPORT_USER);

  // Determine target user and open state
  const targetUser = propUser || reportUserTarget;
  const isOpen = open ?? reportUserModalOpen;

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedReason(null);
      setDetails("");
      setEvidenceUrls([]);
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
          closeReportUserModal();
        }
      }
    },
    [onOpenChange, closeReportUserModal],
  );

  // Handle file upload (simulated - would connect to storage service in production)
  const handleFileSelect = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      setIsUploading(true);
      try {
        // In production, upload files to storage and get URLs
        // For now, we'll use object URLs as placeholders
        const newUrls: string[] = [];
        for (const file of Array.from(files)) {
          // Validate file type
          if (!file.type.startsWith("image/")) {
            setSubmitError("Only image files are allowed");
            continue;
          }
          // Validate file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            setSubmitError("File size must be less than 5MB");
            continue;
          }
          // Create object URL (in production, upload to storage)
          newUrls.push(URL.createObjectURL(file));
        }
        setEvidenceUrls((prev) => [...prev, ...newUrls].slice(0, 5)); // Max 5 images
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [setSubmitError],
  );

  // Remove evidence image
  const handleRemoveEvidence = React.useCallback((index: number) => {
    setEvidenceUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle form submission
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!targetUser || !currentUser?.id || !selectedReason) {
        setSubmitError("Please select a reason for the report");
        return;
      }

      setSubmitting(true);
      setSubmitError(null);

      try {
        await reportUserMutation({
          variables: {
            reporterId: currentUser.id,
            reportedUserId: targetUser.id,
            reason: selectedReason,
            details: details.trim() || null,
            evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : null,
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
      targetUser,
      currentUser?.id,
      selectedReason,
      details,
      evidenceUrls,
      reportUserMutation,
      setSubmitting,
      setSubmitError,
      setSubmitSuccess,
      onReported,
      handleOpenChange,
    ],
  );

  if (!targetUser) return null;

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
              Thank you for helping keep our community safe. We will review your
              report and take appropriate action.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-full">
                  <Flag className="h-5 w-5 text-destructive" />
                </div>
                <DialogTitle>Report User</DialogTitle>
              </div>
              <DialogDescription>
                Help us understand what is wrong with this user&apos;s behavior.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* User being reported */}
              <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={targetUser.avatarUrl}
                    alt={targetUser.displayName}
                  />
                  <AvatarFallback>
                    {getInitials(targetUser.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {targetUser.displayName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    @{targetUser.username}
                  </p>
                </div>
              </div>

              {/* Reason selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Why are you reporting this user?{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <ScrollArea className="h-[200px] pr-4">
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
                          id={reason.value}
                          className="mt-0.5"
                        />
                        <Label
                          htmlFor={reason.value}
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
                <Label htmlFor="details" className="text-sm font-medium">
                  Additional details (optional)
                </Label>
                <Textarea
                  id="details"
                  placeholder="Provide any additional context that might help us understand the issue..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="resize-none"
                />
                <p className="text-right text-xs text-muted-foreground">
                  {details.length}/1000
                </p>
              </div>

              {/* Evidence upload */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Evidence / Screenshots (optional)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {evidenceUrls.map((url, index) => (
                    <div
                      key={index}
                      className="group relative h-16 w-16 overflow-hidden rounded-lg border"
                    >
                      <img
                        src={url}
                        alt={`Evidence ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveEvidence(index)}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                  {evidenceUrls.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="hover:bg-muted/50 flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:border-primary"
                    >
                      {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="mt-1 text-[10px] text-muted-foreground">
                            Add
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  Up to 5 images, max 5MB each
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

export default ReportUserModal;
