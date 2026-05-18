"use client";

/**
 * Appeal Dialog Component
 * Allows users to appeal moderation actions
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
import { Input } from "@/components/ui/input";
import { Scale, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface AppealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId: string;
  penaltyId?: string;
  userId: string;
  userName?: string;
  actionType: string;
  onAppealSubmitted?: () => void;
}

interface Evidence {
  type: "text" | "link" | "screenshot";
  content: string;
  description: string;
}

export function AppealDialog({
  open,
  onOpenChange,
  actionId,
  penaltyId,
  userId,
  userName,
  actionType,
  onAppealSubmitted,
}: AppealDialogProps) {
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [newEvidenceLink, setNewEvidenceLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddEvidence = () => {
    if (!newEvidenceLink.trim()) return;

    setEvidence([
      ...evidence,
      {
        type: "link",
        content: newEvidenceLink.trim(),
        description: "Supporting evidence",
      },
    ]);
    setNewEvidenceLink("");
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your appeal");
      return;
    }

    if (reason.trim().length < 50) {
      toast.error("Please provide more detail (at least 50 characters)");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/moderation/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userName,
          actionId,
          penaltyId,
          reason: reason.trim(),
          evidence: evidence.length > 0 ? evidence : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Appeal submitted successfully");
        setReason("");
        setEvidence([]);
        onOpenChange(false);
        onAppealSubmitted?.();
      } else {
        toast.error(data.error || "Failed to submit appeal");
      }
    } catch (error) {
      toast.error("Failed to submit appeal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Appeal Moderation Action
          </DialogTitle>
          <DialogDescription>
            Submit an appeal for the {actionType} action. A moderator will
            review your appeal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm font-medium">Before you appeal:</p>
            <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
              <li>Review the community guidelines</li>
              <li>Be honest and respectful in your explanation</li>
              <li>Provide any evidence that supports your case</li>
              <li>Appeals are reviewed within 24-48 hours</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why are you appealing?</Label>
            <Textarea
              id="reason"
              placeholder="Explain why you believe this action was incorrect or too severe. Be specific and include any relevant context..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/5000 characters (minimum 50)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Supporting Evidence (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a link to evidence..."
                value={newEvidenceLink}
                onChange={(e) => setNewEvidenceLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddEvidence()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddEvidence}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {evidence.length > 0 && (
              <div className="mt-2 space-y-2">
                {evidence.map((e, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
                  >
                    <span className="truncate text-sm">{e.content}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveEvidence(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
            disabled={isSubmitting || reason.trim().length < 50}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Appeal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
