"use client";

/**
 * Report Dialog Component
 * Allows users to report messages, users, or channels
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
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ReportCategory } from "@/services/moderation/moderation-engine.service";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "user" | "message" | "channel";
  targetId: string;
  targetName?: string;
  reporterId: string;
  reporterName?: string;
  channelId?: string;
  workspaceId?: string;
  onReportSubmitted?: () => void;
}

const REPORT_CATEGORIES: {
  value: ReportCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "spam",
    label: "Spam",
    description: "Unsolicited advertising or repeated messages",
  },
  {
    value: "harassment",
    label: "Harassment",
    description: "Targeted harassment or bullying",
  },
  {
    value: "hate_speech",
    label: "Hate Speech",
    description: "Content promoting hatred against groups",
  },
  {
    value: "violence",
    label: "Violence",
    description: "Threats or promotion of violence",
  },
  {
    value: "nudity",
    label: "Adult Content",
    description: "NSFW or inappropriate material",
  },
  {
    value: "misinformation",
    label: "Misinformation",
    description: "False or misleading information",
  },
  {
    value: "impersonation",
    label: "Impersonation",
    description: "Pretending to be another user",
  },
  {
    value: "scam",
    label: "Scam/Fraud",
    description: "Fraudulent activity or scam attempts",
  },
  {
    value: "copyright",
    label: "Copyright",
    description: "Unauthorized use of copyrighted material",
  },
  {
    value: "self_harm",
    label: "Self-Harm",
    description: "Content promoting self-harm",
  },
  {
    value: "underage",
    label: "Underage",
    description: "Content involving minors inappropriately",
  },
  {
    value: "other",
    label: "Other",
    description: "Other violations not listed above",
  },
];

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetName,
  reporterId,
  reporterName,
  channelId,
  workspaceId,
  onReportSubmitted,
}: ReportDialogProps) {
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category) {
      toast.error("Please select a report category");
      return;
    }

    if (!description.trim()) {
      toast.error("Please provide a description");
      return;
    }

    if (description.trim().length < 10) {
      toast.error("Description must be at least 10 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/moderation/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId,
          reporterName,
          targetType,
          targetId,
          targetName,
          category,
          description: description.trim(),
          channelId,
          workspaceId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Report submitted successfully");
        setCategory("");
        setDescription("");
        onOpenChange(false);
        onReportSubmitted?.();
      } else {
        toast.error(data.error || "Failed to submit report");
      }
    } catch (error) {
      toast.error("Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetTypeLabel =
    targetType === "user"
      ? "User"
      : targetType === "message"
        ? "Message"
        : "Channel";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Report {targetTypeLabel}
          </DialogTitle>
          <DialogDescription>
            {targetName
              ? `Report "${targetName}" for violating community guidelines`
              : `Report this ${targetType} for violating community guidelines`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ReportCategory)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a reason for reporting" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex flex-col">
                      <span>{cat.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {cat.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please provide details about this report..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/2000 characters
            </p>
          </div>
        </div>

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
            disabled={isSubmitting || !category || !description.trim()}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
