"use client";

import { useState } from "react";
import { MapPinOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface StopSharingButtonProps {
  /** Callback when stop is confirmed */
  onStop: () => void | Promise<void>;
  /** Whether to show confirmation dialog */
  confirmStop?: boolean;
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "destructive";
  /** Button size */
  size?: "sm" | "default" | "lg";
  /** Button text */
  children?: React.ReactNode;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Stop Sharing Button Component
// ============================================================================

/**
 * Stop Sharing Button
 *
 * Button to stop sharing live location, with optional confirmation dialog.
 */
export function StopSharingButton({
  onStop,
  confirmStop = true,
  variant = "destructive",
  size = "default",
  children,
  disabled = false,
  className,
}: StopSharingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await onStop();
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const buttonContent = (
    <>
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <MapPinOff className="mr-2 h-4 w-4" />
      )}
      {children || "Stop Sharing"}
    </>
  );

  if (!confirmStop) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled={disabled || isLoading}
        onClick={handleStop}
        className={className}
      >
        {buttonContent}
      </Button>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isLoading}
          className={className}
        >
          {buttonContent}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Stop Sharing Location?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will stop sharing your live location with everyone who can see
            it. You can start sharing again at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleStop}
            disabled={isLoading}
            className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Stopping...
              </>
            ) : (
              "Stop Sharing"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// Inline Stop Button
// ============================================================================

interface InlineStopButtonProps {
  /** Callback when stop is clicked */
  onStop: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Small inline stop button.
 */
export function InlineStopButton({ onStop, className }: InlineStopButtonProps) {
  return (
    <button
      onClick={onStop}
      className={cn(
        "bg-destructive/10 hover:bg-destructive/20 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-destructive transition-colors",
        className,
      )}
    >
      <MapPinOff className="h-3 w-3" />
      Stop
    </button>
  );
}

// ============================================================================
// Icon Only Stop Button
// ============================================================================

interface IconStopButtonProps {
  /** Callback when stop is clicked */
  onStop: () => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
}

/**
 * Icon-only stop button.
 */
export function IconStopButton({
  onStop,
  size = "md",
  className,
}: IconStopButtonProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <button
      onClick={onStop}
      className={cn(
        "flex items-center justify-center rounded-full bg-destructive text-white transition-transform hover:scale-105 active:scale-95",
        sizeClasses[size],
        className,
      )}
      title="Stop sharing location"
    >
      <MapPinOff className={iconSizes[size]} />
    </button>
  );
}

export default StopSharingButton;
