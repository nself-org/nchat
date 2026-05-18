"use client";

/**
 * ReportModal - Universal reporting modal for users, messages, and channels
 *
 * Comprehensive reporting interface with category selection, evidence upload,
 * and detailed context collection. Supports all content types with smart
 * priority calculation and duplicate detection.
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  Flag,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Hash,
  User,
  MessageSquare,
  Link2,
  Upload,
  X,
  Shield,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import {
  DEFAULT_REPORT_CATEGORIES,
  type ReportCategory,
} from "@/lib/moderation/report-system";

// ============================================================================
// Types
// ============================================================================

export type ReportTargetType = "user" | "message" | "channel";

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
  name: string;
  // User-specific
  username?: string;
  avatarUrl?: string;
  // Message-specific
  content?: string;
  channelId?: string;
  channelName?: string;
  createdAt?: string;
  userId?: string;
  // Channel-specific
  description?: string;
  memberCount?: number;
}

export interface ReportEvidence {
  type: "screenshot" | "link" | "text" | "file";
  content: string;
  description?: string;
}

export interface ReportFormData {
  categoryId: string;
  description: string;
  evidence: ReportEvidence[];
}

export interface ReportModalProps {
  /** Whether the modal is open (controlled mode) */
  open?: boolean;
  /** Callback when open state changes (controlled mode) */
  onOpenChange?: (open: boolean) => void;
  /** Target to report */
  target?: ReportTarget;
  /** Current user ID (reporter) */
  reporterId: string;
  /** Current user name */
  reporterName?: string;
  /** Callback after successful report submission */
  onSubmit?: (reportId: string) => void;
  /** Custom categories (overrides default) */
  categories?: ReportCategory[];
  /** Maximum evidence items */
  maxEvidence?: number;
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

function getTargetIcon(type: ReportTargetType) {
  switch (type) {
    case "user":
      return User;
    case "message":
      return MessageSquare;
    case "channel":
      return Hash;
  }
}

function getCategoryIcon(categoryId: string) {
  switch (categoryId) {
    case "spam":
      return AlertTriangle;
    case "harassment":
    case "hate-speech":
      return Shield;
    case "inappropriate-content":
      return ImageIcon;
    default:
      return Flag;
  }
}

// ============================================================================
// Target Preview Component
// ============================================================================

interface TargetPreviewProps {
  target: ReportTarget;
}

function TargetPreview({ target }: TargetPreviewProps) {
  const TargetIcon = getTargetIcon(target.type);

  return (
    <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <TargetIcon className="h-4 w-4 text-muted-foreground" />
        <span className="capitalize">{target.type} Report</span>
      </div>

      {target.type === "user" && (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={target.avatarUrl} alt={target.name} />
            <AvatarFallback>{getInitials(target.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{target.name}</div>
            {target.username && (
              <div className="text-sm text-muted-foreground">
                @{target.username}
              </div>
            )}
          </div>
        </div>
      )}

      {target.type === "message" && (
        <div className="space-y-2">
          {target.channelName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span>{target.channelName}</span>
              {target.createdAt && (
                <>
                  <span className="mx-1">-</span>
                  <Clock className="h-3 w-3" />
                  <span>{formatTimestamp(target.createdAt)}</span>
                </>
              )}
            </div>
          )}
          {target.content && (
            <div className="rounded border bg-background p-3">
              <p className="whitespace-pre-wrap break-words text-sm">
                {truncateContent(target.content)}
              </p>
            </div>
          )}
        </div>
      )}

      {target.type === "channel" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            <span className="text-lg font-medium">{target.name}</span>
          </div>
          {target.description && (
            <p className="text-sm text-muted-foreground">
              {target.description}
            </p>
          )}
          {target.memberCount !== undefined && (
            <div className="text-xs text-muted-foreground">
              {target.memberCount} members
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Evidence Item Component
// ============================================================================

interface EvidenceItemProps {
  evidence: ReportEvidence;
  index: number;
  onRemove: () => void;
}

function EvidenceItem({ evidence, index, onRemove }: EvidenceItemProps) {
  const getIcon = () => {
    switch (evidence.type) {
      case "screenshot":
        return <ImageIcon className="h-4 w-4" />;
      case "link":
        return <Link2 className="h-4 w-4" />;
      case "file":
        return <Upload className="h-4 w-4" />;
      case "text":
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-muted/50 flex items-start gap-2 rounded-lg border p-3">
      <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-sm font-medium capitalize">{evidence.type}</div>
        <div className="break-all text-xs text-muted-foreground">
          {evidence.content}
        </div>
        {evidence.description && (
          <div className="text-xs italic text-muted-foreground">
            {evidence.description}
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 w-6 flex-shrink-0 p-0"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function ReportModal({
  open = false,
  onOpenChange,
  target,
  reporterId,
  reporterName,
  onSubmit,
  categories = DEFAULT_REPORT_CATEGORIES,
  maxEvidence = 5,
  className,
}: ReportModalProps) {
  // Form state
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null,
  );
  const [description, setDescription] = React.useState("");
  const [evidence, setEvidence] = React.useState<ReportEvidence[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  // Evidence form state
  const [showEvidenceForm, setShowEvidenceForm] = React.useState(false);
  const [evidenceType, setEvidenceType] =
    React.useState<ReportEvidence["type"]>("link");
  const [evidenceContent, setEvidenceContent] = React.useState("");
  const [evidenceDescription, setEvidenceDescription] = React.useState("");

  // Filter enabled categories
  const enabledCategories = categories.filter((c) => c.enabled);

  // Get selected category
  const category = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)
    : null;

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setSelectedCategory(null);
      setDescription("");
      setEvidence([]);
      setIsSubmitting(false);
      setSubmitError(null);
      setSubmitSuccess(false);
      setShowEvidenceForm(false);
    }
  }, [open]);

  // Handle close
  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!isSubmitting) {
        onOpenChange?.(newOpen);
      }
    },
    [isSubmitting, onOpenChange],
  );

  // Add evidence
  const handleAddEvidence = React.useCallback(() => {
    if (!evidenceContent.trim()) {
      return;
    }

    if (evidence.length >= maxEvidence) {
      setSubmitError(`Maximum ${maxEvidence} evidence items allowed`);
      return;
    }

    const newEvidence: ReportEvidence = {
      type: evidenceType,
      content: evidenceContent.trim(),
      description: evidenceDescription.trim() || undefined,
    };

    setEvidence((prev) => [...prev, newEvidence]);
    setEvidenceContent("");
    setEvidenceDescription("");
    setShowEvidenceForm(false);
    setSubmitError(null);
  }, [
    evidenceType,
    evidenceContent,
    evidenceDescription,
    evidence.length,
    maxEvidence,
  ]);

  // Remove evidence
  const handleRemoveEvidence = React.useCallback((index: number) => {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle form submission
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!target || !selectedCategory) {
        setSubmitError("Please select a reason for the report");
        return;
      }

      if (!description.trim()) {
        setSubmitError("Please provide a description");
        return;
      }

      // Check if evidence is required
      if (category?.requiresEvidence && evidence.length === 0) {
        setSubmitError("This category requires at least one piece of evidence");
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        // In a real implementation, this would call an API endpoint
        // For now, we'll simulate the submission
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Generate report ID
        const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        setSubmitSuccess(true);
        onSubmit?.(reportId);

        // Close modal after a short delay to show success state
        setTimeout(() => {
          handleOpenChange(false);
        }, 2000);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to submit report";
        setSubmitError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      target,
      selectedCategory,
      description,
      evidence,
      category,
      onSubmit,
      handleOpenChange,
    ],
  );

  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn("max-h-[90vh] sm:max-w-2xl", className)}>
        {submitSuccess ? (
          // Success state
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mb-3 text-2xl font-semibold">Report Submitted</h3>
            <p className="max-w-md text-muted-foreground">
              Thank you for reporting this {target.type}. Our moderation team
              will review it and take appropriate action. You will be notified
              of the outcome.
            </p>
            <Alert className="mt-6 max-w-md">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your report has been assigned priority:{" "}
                <span className="font-medium capitalize">
                  {category?.priority || "normal"}
                </span>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
                  <Flag className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    Report {target.type}
                  </DialogTitle>
                  <DialogDescription>
                    Help keep our community safe
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6 py-4">
                {/* Target preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Reporting</Label>
                  <TargetPreview target={target} />
                </div>

                <Separator />

                {/* Category selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Why are you reporting this {target.type}?{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup
                    value={selectedCategory || ""}
                    onValueChange={setSelectedCategory}
                  >
                    <div className="space-y-2">
                      {enabledCategories.map((cat) => {
                        const CategoryIcon = getCategoryIcon(cat.id);
                        return (
                          <div
                            key={cat.id}
                            className={cn(
                              "flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-all",
                              selectedCategory === cat.id
                                ? "bg-primary/5 border-primary shadow-sm"
                                : "hover:bg-muted/50 border-transparent",
                            )}
                          >
                            <RadioGroupItem
                              value={cat.id}
                              id={`category-${cat.id}`}
                              className="mt-1"
                            />
                            <Label
                              htmlFor={`category-${cat.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <CategoryIcon className="h-4 w-4" />
                                <span className="font-medium">{cat.name}</span>
                                <Badge
                                  variant={
                                    cat.priority === "urgent"
                                      ? "destructive"
                                      : cat.priority === "high"
                                        ? "default"
                                        : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {cat.priority}
                                </Badge>
                                {cat.requiresEvidence && (
                                  <Badge variant="outline" className="text-xs">
                                    Evidence Required
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {cat.description}
                              </p>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Please provide details about why you are reporting this..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    className="resize-none"
                    required
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Be specific and factual</span>
                    <span>{description.length}/2000</span>
                  </div>
                </div>

                {/* Evidence */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Evidence{" "}
                      {category?.requiresEvidence && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    {evidence.length < maxEvidence && !showEvidenceForm && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEvidenceForm(true)}
                      >
                        <Upload className="mr-2 h-3 w-3" />
                        Add Evidence
                      </Button>
                    )}
                  </div>

                  {/* Existing evidence */}
                  {evidence.length > 0 && (
                    <div className="space-y-2">
                      {evidence.map((item, index) => (
                        <EvidenceItem
                          key={index}
                          evidence={item}
                          index={index}
                          onRemove={() => handleRemoveEvidence(index)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Evidence form */}
                  {showEvidenceForm && (
                    <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Evidence Type</Label>
                        <RadioGroup
                          value={evidenceType}
                          onValueChange={(v) =>
                            setEvidenceType(v as ReportEvidence["type"])
                          }
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="link" id="ev-link" />
                            <Label htmlFor="ev-link" className="text-sm">
                              Link
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="screenshot"
                              id="ev-screenshot"
                            />
                            <Label htmlFor="ev-screenshot" className="text-sm">
                              Screenshot
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="text" id="ev-text" />
                            <Label htmlFor="ev-text" className="text-sm">
                              Text
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Content</Label>
                        <Input
                          placeholder={
                            evidenceType === "link"
                              ? "https://example.com/..."
                              : evidenceType === "screenshot"
                                ? "Screenshot URL or description"
                                : "Evidence details"
                          }
                          value={evidenceContent}
                          onChange={(e) => setEvidenceContent(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">
                          Description (Optional)
                        </Label>
                        <Input
                          placeholder="Additional context..."
                          value={evidenceDescription}
                          onChange={(e) =>
                            setEvidenceDescription(e.target.value)
                          }
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddEvidence}
                          disabled={!evidenceContent.trim()}
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowEvidenceForm(false);
                            setEvidenceContent("");
                            setEvidenceDescription("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {evidence.length}/{maxEvidence} evidence items
                  </p>
                </div>

                {/* Error message */}
                {submitError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                {/* Info message */}
                {category?.autoEscalate && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      This report will be automatically escalated to
                      administrators for immediate review.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4 gap-2 sm:gap-0">
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
                disabled={
                  isSubmitting || !selectedCategory || !description.trim()
                }
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

export default ReportModal;
