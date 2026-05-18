"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SettingsResetProps {
  label?: string;
  description?: string;
  onReset: () => void;
  confirmTitle?: string;
  confirmDescription?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  className?: string;
  disabled?: boolean;
}

/**
 * SettingsReset - Reset settings to defaults with confirmation
 */
export function SettingsReset({
  label = "Reset to Defaults",
  description = "This will reset all settings in this section to their default values.",
  onReset,
  confirmTitle = "Reset Settings",
  confirmDescription = "Are you sure you want to reset these settings? This action cannot be undone.",
  confirmLabel = "Reset",
  variant = "default",
  className,
  disabled = false,
}: SettingsResetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReset = () => {
    onReset();
    setIsOpen(false);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border p-4",
        variant === "destructive" && "border-destructive/50 bg-destructive/5",
        className,
      )}
    >
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          {variant === "destructive" && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              variant === "destructive" && "text-destructive",
            )}
          >
            {label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant={variant === "destructive" ? "destructive" : "outline"}
            size="sm"
            disabled={disabled}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {variant === "destructive" && (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              {confirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className={cn(
                variant === "destructive" &&
                  "hover:bg-destructive/90 bg-destructive text-destructive-foreground",
              )}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
