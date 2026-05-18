"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

export type ConfirmationVariant =
  | "default"
  | "destructive"
  | "warning"
  | "success";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const VARIANT_CONFIG: Record<
  ConfirmationVariant,
  {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    buttonVariant: "default" | "destructive" | "secondary" | "outline";
  }
> = {
  default: {
    icon: <Info className="h-5 w-5" />,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    buttonVariant: "default",
  },
  destructive: {
    icon: <AlertTriangle className="h-5 w-5" />,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    buttonVariant: "destructive",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-600 dark:text-yellow-500",
    buttonVariant: "default",
  },
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    iconBg: "bg-green-500/10",
    iconColor: "text-green-600 dark:text-green-500",
    buttonVariant: "default",
  },
};

export function ConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  icon,
  children,
}: ConfirmationModalProps) {
  const [loading, setLoading] = useState(false);

  // Reset loading state when modal closes
  useEffect(() => {
    if (!open) {
      setLoading(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      logger.error("Confirmation action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const config = VARIANT_CONFIG[variant];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                config.iconBg,
                config.iconColor,
              )}
            >
              {icon || config.icon}
            </div>
            <div className="space-y-1.5 pt-0.5">
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {children && <div className="mt-2">{children}</div>}

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Convenience components for common confirmation scenarios
export function DeleteConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  itemName = "this item",
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  itemName?: string;
  title?: string;
  description?: string;
}) {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={title || `Delete ${itemName}?`}
      description={
        description ||
        `Are you sure you want to delete ${itemName}? This action cannot be undone.`
      }
      confirmText="Delete"
      variant="destructive"
    />
  );
}

export function UnsavedChangesModal({
  open,
  onOpenChange,
  onConfirm,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  onDiscard?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <DialogTitle>Unsaved changes</DialogTitle>
              <DialogDescription>
                You have unsaved changes. Do you want to save them before
                leaving?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row sm:gap-0">
          {onDiscard && (
            <Button
              variant="ghost"
              onClick={() => {
                onDiscard();
                onOpenChange(false);
              }}
              className="text-muted-foreground"
            >
              Discard
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await onConfirm();
                onOpenChange(false);
              }}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
