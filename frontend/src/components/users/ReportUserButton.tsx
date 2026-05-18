"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Flag, Loader2, AlertTriangle } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type ReportReason =
  | "harassment"
  | "spam"
  | "inappropriate_content"
  | "impersonation"
  | "threats"
  | "other";

export interface ReportData {
  userId: string;
  reason: ReportReason;
  details: string;
}

export interface ReportUserButtonProps extends Omit<ButtonProps, "onClick"> {
  userId: string;
  userName: string;
  onReport: (data: ReportData) => Promise<void> | void;
  showText?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const REPORT_REASONS: {
  value: ReportReason;
  label: string;
  description: string;
}[] = [
  {
    value: "harassment",
    label: "Harassment or bullying",
    description: "Intimidation, threats, or offensive behavior",
  },
  {
    value: "spam",
    label: "Spam",
    description: "Unwanted messages or promotional content",
  },
  {
    value: "inappropriate_content",
    label: "Inappropriate content",
    description: "Content that violates community guidelines",
  },
  {
    value: "impersonation",
    label: "Impersonation",
    description: "Pretending to be someone else",
  },
  {
    value: "threats",
    label: "Threats or violence",
    description: "Threats of harm or violent behavior",
  },
  {
    value: "other",
    label: "Other",
    description: "Another issue not listed above",
  },
];

// ============================================================================
// Component
// ============================================================================

const ReportUserButton = React.forwardRef<
  HTMLButtonElement,
  ReportUserButtonProps
>(
  (
    {
      className,
      userId,
      userName,
      onReport,
      showText = true,
      variant = "ghost",
      size = "default",
      disabled,
      ...props
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [reason, setReason] = React.useState<ReportReason | "">("");
    const [details, setDetails] = React.useState("");

    const handleSubmit = async () => {
      if (!reason) return;

      setIsLoading(true);
      try {
        await onReport({
          userId,
          reason,
          details,
        });
        setIsOpen(false);
        // Reset form
        setReason("");
        setDetails("");
      } finally {
        setIsLoading(false);
      }
    };

    const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if (!open) {
        // Reset form on close
        setReason("");
        setDetails("");
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            ref={ref}
            variant={variant}
            size={size}
            className={cn(
              "hover:bg-destructive/10 text-destructive hover:text-destructive",
              className,
            )}
            disabled={disabled}
            {...props}
          >
            <Flag className={cn("h-4 w-4", showText && "mr-2")} />
            {showText && "Report"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Report {userName}
            </DialogTitle>
            <DialogDescription>
              Please select a reason for reporting this user. Our team will
              review your report and take appropriate action.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Reason selection */}
            <div className="space-y-3">
              <Label>Reason for report</Label>
              <RadioGroup
                value={reason}
                onValueChange={(value) => setReason(value as ReportReason)}
              >
                {REPORT_REASONS.map((item) => (
                  <div
                    key={item.value}
                    className="flex items-start space-x-3 space-y-0"
                  >
                    <RadioGroupItem
                      value={item.value}
                      id={`reason-${item.value}`}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`reason-${item.value}`}
                      className="cursor-pointer font-normal"
                    >
                      <span className="font-medium">{item.label}</span>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Additional details */}
            <div className="space-y-2">
              <Label htmlFor="details">Additional details (optional)</Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Please provide any additional context that might help us review this report..."
                rows={3}
                maxLength={500}
              />
              <p className="text-right text-xs text-muted-foreground">
                {details.length}/500
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!reason || isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);
ReportUserButton.displayName = "ReportUserButton";

export { ReportUserButton };
